import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const live = 'test-results/scratch-live';
const rows = [
  {
    name: 'feasibility-probe',
    sb3: join(live, 'feasibility-probe.sb3'),
    report: join(live, 'feasibility-report.json'),
    exportKey: 'sha256',
    bytesKey: 'bytes',
    required: [],
  },
  ['space-invaders-chapter-1', 'space-invaders-chapter-1-report.json', ['checks.workspaceRoots.passed', 'checks.runtime.passed', 'checks.reload.freshUnsignedContext', 'checks.reload.message1Absent', 'checks.reload.futureMessagesAbsent']],
  ['space-invaders-chapter-2', 'space-invaders-chapter-2-report.json', ['checks.alienMarch.passed', 'checks.structure.passed', 'checks.structure.marchReceivers.March Right.moveNested', 'checks.structure.marchReceivers.March Left.moveNested', 'checks.structure.marchReceivers.March Down.loseBroadcastConnected', 'checks.workspaceRoots.passed', 'checks.runtime.passed', 'checks.runtime.march.passed', 'checks.runtime.invasion.passed', 'checks.reload.messages.passed', 'checks.reload.passed']],
  ['space-invaders-chapter-3', 'space-invaders-chapter-3-report.json', ['checks.structure.passed', 'checks.structure.marchReceivers.March Down.loseBroadcastConnected', 'checks.structure.chapter3.playerLaser', 'checks.structure.chapter3.alienCollision', 'checks.workspaceRoots.passed', 'checks.runtime.passed', 'checks.runtime.march.passed', 'checks.runtime.chapter3.hit.passed', 'checks.runtime.chapter3.restart.passed', 'checks.reload.messages.passed', 'checks.reload.passed']],
  ['space-invaders-chapter-4', 'space-invaders-chapter-4-report.json', ['checks.structure.passed', 'checks.structure.detachedRoots.passed', 'checks.structure.messages.passed', 'checks.runtime.passed', 'checks.reload.passed']],
  ['space-invaders-chapter-5', 'space-invaders-chapter-5-report.json', ['checks.structure.passed', 'checks.structure.detachedRoots.passed', 'checks.structure.messages.passed', 'checks.runtime.passed', 'checks.runtime.win.restart.hiddenProjectiles.playerLaser', 'checks.runtime.win.restart.hiddenProjectiles.enemyShot', 'checks.runtime.win.restart.bunkers.passed', 'checks.runtime.playerLoss.restart.hiddenProjectiles.playerLaser', 'checks.runtime.playerLoss.restart.hiddenProjectiles.enemyShot', 'checks.runtime.playerLoss.restart.bunkers.passed', 'checks.runtime.invasionLoss.restart.hiddenProjectiles.playerLaser', 'checks.runtime.invasionLoss.restart.hiddenProjectiles.enemyShot', 'checks.runtime.invasionLoss.restart.bunkers.passed', 'checks.reload.passed']],
  ['space-invaders-final', 'space-invaders-final-report.json', ['checks.authoredStructure.passed', 'checks.reloadStructure.passed', 'checks.freshReleaseStart.passed']],
  ['space-invaders-final', 'space-invaders-final-verification-report.json', ['checks.structure.passed', 'checks.structure.detachedRoots.passed', 'checks.structure.messages.passed', 'checks.structure.marchReceivers.March Right.moveNested', 'checks.structure.marchReceivers.March Left.moveNested', 'checks.runtime.passed', 'checks.runtime.mothership.passed', 'checks.runtime.win.passed', 'checks.runtime.win.restart.passed', 'checks.runtime.win.restart.hiddenProjectiles.playerLaser', 'checks.runtime.win.restart.hiddenProjectiles.enemyShot', 'checks.runtime.win.restart.bunkers.passed', 'checks.runtime.playerLoss.passed', 'checks.runtime.playerLoss.restart.passed', 'checks.runtime.playerLoss.restart.hiddenProjectiles.playerLaser', 'checks.runtime.playerLoss.restart.hiddenProjectiles.enemyShot', 'checks.runtime.playerLoss.restart.bunkers.passed', 'checks.runtime.invasionLoss.passed', 'checks.runtime.invasionLoss.restart.passed', 'checks.runtime.invasionLoss.restart.hiddenProjectiles.playerLaser', 'checks.runtime.invasionLoss.restart.hiddenProjectiles.enemyShot', 'checks.runtime.invasionLoss.restart.bunkers.passed', 'checks.reload.passed']],
  ['space-invaders-final', 'space-invaders-final-defense-report.json', ['checks.structure.passed', 'checks.runtime.passed', 'checks.runtime.launcher.passed', 'checks.runtime.playerHit.passed', 'checks.runtime.bunkers.passed', 'checks.reload.passed', 'checks.reload.launcher.passed', 'checks.reload.bunkers.passed']],
  ['space-invaders-final', 'space-invaders-final-release-playtest-report.json', ['checks.controls.passed', 'checks.terminal.passed', 'checks.restart.passed']],
].map((r) => {
  const row = Array.isArray(r)
    ? (() => {
        const [name, report, required = ['checks.structure.passed', 'checks.runtime.passed', 'checks.reload.passed']] = r;
        return { name, sb3: join(live, `${name}.sb3`), report: join(live, report), required };
      })()
    : r;
  const expected = Object.fromEntries(row.required.map((path) => [path, true]));
  expected['policy.unsignedEditor'] = true;
  expected['policy.visibleUiOnly'] = true;
  expected['policy.prohibitedInternalsUsed'] = false;
  if (row.report.endsWith('space-invaders-final-release-playtest-report.json')) {
    expected['policy.codeOrVariableValuesChanged'] = false;
  }
  return { ...row, expected };
});

const hex = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const bytes = (file) => readFileSync(file).length;
const lower = (v) => String(v ?? '').toLowerCase();
const valueAt = (source, path) => path.split('.').reduce((value, key) => value?.[key], source);

const failures = [];
for (const row of rows) {
  const sb3 = row.sb3;
  const reportPath = row.report;
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const fileHash = hex(sb3);
  const fileBytes = bytes(sb3);
  const reportHash = lower(report.export?.sha256 ?? report.sha256);
  const reportBytes = Number(report.export?.bytes ?? report.bytes);
  const failedChecks = Object.entries(row.expected)
    .filter(([path, expected]) => valueAt(report, path) !== expected)
    .map(([path, expected]) => `${path}=${JSON.stringify(expected)}`);
  const label = `${sb3.split(/[\\/]/).pop()} <-> ${reportPath.split(/[\\/]/).pop()}`;
  const ok = report.passed === true && failedChecks.length === 0
    && fileHash === reportHash && fileBytes === reportBytes;
  console.log(
    `${label}\n  file   = ${fileHash} (${fileBytes} B)\n  report = ${reportHash} (${reportBytes} B, passed=${report.passed})\n  checks = ${failedChecks.length ? `MISSING/FAILED: ${failedChecks.join(', ')}` : 'PASS'}\n  ${ok ? 'MATCH' : 'MISMATCH'}`
  );
  if (!ok) failures.push(label);
}

if (failures.length) {
  console.error(`FAIL: hashes/sizes disagree for: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('PASS: all report hashes/bytes equal on-disk .sb3 files.');
