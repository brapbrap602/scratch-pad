import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { validateLessonDocument, validateLessonIndex } from '../js/content.js';
import {
  NARRATION_PROFILE,
  extractNarrationSections,
  validateNarrationManifest,
} from '../js/narration-content.js';

const root = path.resolve(import.meta.dirname, '..');
const curriculumDirectory = path.join(root, 'curriculum');
const audioDirectory = path.join(root, 'audio');
const manifestDirectory = path.join(audioDirectory, 'manifests');
const assetDirectory = path.join(audioDirectory, 'assets');
const workDirectory = path.join(root, '.audio-work');
const HEX_64 = /^[0-9a-f]{64}$/;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonicalRequest = (speech) => JSON.stringify({ profile: NARRATION_PROFILE, speech });
const requestHashFor = (speech) => sha256(canonicalRequest(speech));
const readJson = async (filename) => JSON.parse(await readFile(filename, 'utf8'));

const loadLessons = async () => {
  const ids = validateLessonIndex(await readJson(path.join(curriculumDirectory, 'lessons.json')));
  return Promise.all(ids.map(async (id) => {
    const lesson = validateLessonDocument(
      await readJson(path.join(curriculumDirectory, `${id}.json`)),
      id,
    );
    return { lesson, sections: extractNarrationSections(lesson) };
  }));
};

const createPlan = async () => {
  const lessons = await loadLessons();
  const jobs = new Map();
  for (const entry of lessons) {
    for (const section of entry.sections) {
      for (const sentence of section.sentences) {
        const requestHash = requestHashFor(sentence.speech);
        const existing = jobs.get(requestHash);
        if (existing && existing.speech !== sentence.speech) {
          throw new Error(`Request hash collision: ${requestHash}`);
        }
        jobs.set(requestHash, { requestHash, speech: sentence.speech, voice: NARRATION_PROFILE.voice });
      }
    }
  }
  return { lessons, jobs };
};

const assetPathFromRecord = (record) => {
  const expected = `audio/assets/${record.sha256.slice(0, 2)}/${record.sha256}.mp3`;
  if (record.src !== expected) throw new Error(`Unsafe or inconsistent audio path: ${record.src}`);
  return path.join(root, ...record.src.split('/'));
};

const verifyAsset = async (record) => {
  if (!HEX_64.test(record.sha256)) throw new Error(`Invalid audio digest: ${record.sha256}`);
  const filename = assetPathFromRecord(record);
  const info = await lstat(filename);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Audio asset is not a regular file: ${record.src}`);
  const bytes = await readFile(filename);
  if (bytes.length !== record.bytes) throw new Error(`Audio byte count mismatch: ${record.src}`);
  if (sha256(bytes) !== record.sha256) throw new Error(`Audio digest mismatch: ${record.src}`);
  return record;
};

const collectReusableAssets = async (currentJobs) => {
  const reusable = new Map();
  let files = [];
  try {
    files = (await readdir(manifestDirectory)).filter((name) => name.endsWith('.json'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (const file of files) {
    let manifest;
    try {
      manifest = await readJson(path.join(manifestDirectory, file));
    } catch {
      continue;
    }
    for (const section of manifest.sections || []) {
      for (const sentence of section.sentences || []) {
        if (!HEX_64.test(sentence.requestHash) || reusable.has(sentence.requestHash)) continue;
        const currentJob = currentJobs.get(sentence.requestHash);
        if (
          !currentJob
          || sentence.requestHash !== requestHashFor(sentence.speech)
          || currentJob.speech !== sentence.speech
        ) continue;
        try {
          await verifyAsset(sentence);
          reusable.set(sentence.requestHash, sentence);
        } catch {
          // Stale records are regenerated rather than trusted.
        }
      }
    }
  }
  return reusable;
};

const writeJsonAtomic = async (filename, value) => {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, filename);
};

const runWorker = async (jobs) => {
  await mkdir(workDirectory, { recursive: true });
  const jobsFile = path.join(workDirectory, 'jobs.json');
  const resultsFile = path.join(workDirectory, 'results.json');
  await writeJsonAtomic(jobsFile, jobs);
  await rm(resultsFile, { force: true });

  await new Promise((resolve, reject) => {
    const child = spawn(
      'uv',
      ['run', 'python', 'tools/edge_tts_worker.py', '--jobs', jobsFile, '--results', resultsFile, '--work-dir', workDirectory],
      { cwd: root, shell: false, stdio: 'inherit' },
    );
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Edge worker exited with ${code}`)));
  });
  return readJson(resultsFile);
};

const promoteWorkerResult = async (result) => {
  if (!HEX_64.test(result.sha256)) throw new Error(`Worker returned invalid digest for ${result.requestHash}`);
  const source = path.resolve(workDirectory, result.stagedPath);
  const relative = path.relative(workDirectory, source);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Worker returned an unsafe staged path');
  const bytes = await readFile(source);
  if (bytes.length !== result.bytes || sha256(bytes) !== result.sha256) {
    throw new Error(`Worker output verification failed for ${result.requestHash}`);
  }
  const destination = path.join(assetDirectory, result.sha256.slice(0, 2), `${result.sha256}.mp3`);
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    const existing = await readFile(destination);
    if (sha256(existing) === result.sha256) {
      return {
        requestHash: result.requestHash,
        src: `audio/assets/${result.sha256.slice(0, 2)}/${result.sha256}.mp3`,
        sha256: result.sha256,
        bytes: result.bytes,
        durationMs: result.durationMs,
      };
    }
    await rm(destination, { force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await copyFile(source, temporary);
    const copied = await readFile(temporary);
    if (copied.length !== result.bytes || sha256(copied) !== result.sha256) {
      throw new Error(`Copied asset verification failed for ${result.requestHash}`);
    }
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  return {
    requestHash: result.requestHash,
    src: `audio/assets/${result.sha256.slice(0, 2)}/${result.sha256}.mp3`,
    sha256: result.sha256,
    bytes: result.bytes,
    durationMs: result.durationMs,
  };
};

const buildManifest = (entry, assets) => ({
  schemaVersion: 1,
  lessonId: entry.lesson.id,
  profile: NARRATION_PROFILE,
  sections: entry.sections.map((section) => ({
    id: section.id,
    sourcePaths: section.sourcePaths,
    sentences: section.sentences.map(({ sourcePath, speech }) => {
      const requestHash = requestHashFor(speech);
      const asset = assets.get(requestHash);
      if (!asset) throw new Error(`No generated asset for ${requestHash}`);
      return { sourcePath, speech, ...asset, requestHash };
    }),
  })),
});

const plan = async () => {
  const { lessons, jobs } = await createPlan();
  const sections = lessons.reduce((total, entry) => total + entry.sections.length, 0);
  const references = lessons.reduce(
    (total, entry) => total + entry.sections.reduce((count, section) => count + section.sentences.length, 0),
    0,
  );
  console.log(`Narration plan: ${lessons.length} lessons, ${sections} sections, ${references} sentence references, ${jobs.size} unique requests.`);
};

const generate = async () => {
  const lock = path.join(workDirectory, 'generate.lock');
  await mkdir(workDirectory, { recursive: true });
  try {
    await writeFile(lock, `${process.pid}\n`, { flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') {
      const owner = Number((await readFile(lock, 'utf8')).trim());
      let active = Number.isInteger(owner) && owner > 0;
      if (active) {
        try {
          process.kill(owner, 0);
        } catch (processError) {
          if (processError.code === 'ESRCH') active = false;
          else throw processError;
        }
      }
      if (active) throw new Error(`Generation is already running under PID ${owner}`);
      await rm(lock, { force: true });
      await writeFile(lock, `${process.pid}\n`, { flag: 'wx' });
    } else {
      throw error;
    }
  }

  try {
    const { lessons, jobs } = await createPlan();
    const assets = await collectReusableAssets(jobs);
    const pending = [...jobs.values()].filter(({ requestHash }) => !assets.has(requestHash));
    console.log(`Reusing ${assets.size} request(s); generating ${pending.length}.`);
    if (pending.length > 0) {
      const results = await runWorker(pending);
      const returned = new Set();
      for (const result of results) {
        if (!jobs.has(result.requestHash) || returned.has(result.requestHash)) {
          throw new Error(`Unexpected or duplicate worker result: ${result.requestHash}`);
        }
        returned.add(result.requestHash);
        assets.set(result.requestHash, await promoteWorkerResult(result));
      }
      for (const job of pending) {
        if (!returned.has(job.requestHash)) throw new Error(`Worker omitted ${job.requestHash}`);
      }
    }

    const manifests = lessons.map((entry) => {
      const manifest = buildManifest(entry, assets);
      validateNarrationManifest(manifest, entry.lesson);
      return { entry, manifest };
    });
    for (const { entry, manifest } of manifests) {
      await writeJsonAtomic(path.join(manifestDirectory, `${entry.lesson.id}.json`), manifest);
    }
    console.log('Narration generation complete.');
  } finally {
    await rm(lock, { force: true });
  }
};

const check = async () => {
  const { lessons, jobs } = await createPlan();
  const referencedAssets = new Set();
  let totalBytes = 0;
  for (const entry of lessons) {
    const filename = path.join(manifestDirectory, `${entry.lesson.id}.json`);
    const manifest = validateNarrationManifest(await readJson(filename), entry.lesson);
    for (const section of manifest.sections) {
      for (const sentence of section.sentences) {
        const expectedRequestHash = requestHashFor(sentence.speech);
        if (sentence.requestHash !== expectedRequestHash) {
          throw new Error(`Request fingerprint mismatch for ${section.id}`);
        }
        await verifyAsset(sentence);
        referencedAssets.add(sentence.sha256);
        totalBytes += sentence.bytes;
      }
    }
  }
  console.log(`Validated ${lessons.length} narration manifests, ${jobs.size} unique requests, and ${referencedAssets.size} referenced assets (${totalBytes} referenced bytes).`);
};

const command = process.argv[2] || 'plan';
if (command === 'plan') await plan();
else if (command === 'generate') await generate();
else if (command === 'check') await check();
else throw new Error(`Unknown audio command: ${command}`);
