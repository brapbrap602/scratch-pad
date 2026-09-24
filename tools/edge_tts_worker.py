import argparse
import asyncio
import hashlib
import json
import os
import re
import time
from pathlib import Path

import edge_tts
from mutagen.mp3 import MP3

CONCURRENCY = 2
RETRY_ATTEMPTS = 5
RETRY_BASE_DELAY = 1.0


def write_json_atomic(path: Path, value: object) -> None:
    temporary = path.with_suffix(f"{path.suffix}.{os.getpid()}.tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def validate_job(job: object) -> dict[str, str]:
    if not isinstance(job, dict) or set(job) != {"requestHash", "speech", "voice"}:
        raise ValueError("Each job must contain only requestHash, speech, and voice")
    request_hash = job["requestHash"]
    speech = job["speech"]
    voice = job["voice"]
    if not isinstance(request_hash, str) or not re.fullmatch(r"[0-9a-f]{64}", request_hash):
        raise ValueError("Invalid requestHash")
    if not isinstance(speech, str) or not speech.strip() or len(speech) > 2_000:
        raise ValueError(f"Invalid speech for {request_hash}")
    if voice != "en-US-BrianNeural":
        raise ValueError(f"Unsupported voice for {request_hash}")
    return job


def inspect_mp3(path: Path) -> tuple[str, int, int]:
    audio = MP3(path)
    duration_ms = round(audio.info.length * 1000)
    data = path.read_bytes()
    if duration_ms <= 0 or not data:
        raise ValueError(f"Invalid MP3 output: {path}")
    return hashlib.sha256(data).hexdigest(), len(data), duration_ms


async def synthesize(job: dict[str, str], work_dir: Path, semaphore: asyncio.Semaphore, progress) -> dict:
    request_hash = job["requestHash"]
    staged_dir = work_dir / "staged"
    receipt_dir = work_dir / "receipts"
    staged_dir.mkdir(parents=True, exist_ok=True)
    receipt_dir.mkdir(parents=True, exist_ok=True)
    staged = staged_dir / f"{request_hash}.mp3"
    receipt = receipt_dir / f"{request_hash}.json"

    if staged.exists():
        try:
            digest, size, duration_ms = inspect_mp3(staged)
            result = {
                "requestHash": request_hash,
                "sha256": digest,
                "bytes": size,
                "durationMs": duration_ms,
                "stagedPath": staged.relative_to(work_dir).as_posix(),
            }
            write_json_atomic(receipt, result)
            progress("reused")
            return result
        except Exception:
            staged.unlink(missing_ok=True)
            receipt.unlink(missing_ok=True)

    for attempt in range(1, RETRY_ATTEMPTS + 1):
        temporary = staged.with_suffix(f".mp3.{os.getpid()}.{attempt}.tmp")
        try:
            async with semaphore:
                await edge_tts.Communicate(job["speech"], job["voice"]).save(str(temporary))
            digest, size, duration_ms = inspect_mp3(temporary)
            os.replace(temporary, staged)
            result = {
                "requestHash": request_hash,
                "sha256": digest,
                "bytes": size,
                "durationMs": duration_ms,
                "stagedPath": staged.relative_to(work_dir).as_posix(),
            }
            write_json_atomic(receipt, result)
            progress("generated")
            return result
        except asyncio.CancelledError:
            temporary.unlink(missing_ok=True)
            raise
        except Exception as error:
            temporary.unlink(missing_ok=True)
            if attempt == RETRY_ATTEMPTS:
                raise
            print(
                f"Retry {attempt + 1}/{RETRY_ATTEMPTS} for {request_hash[:12]}: "
                f"{type(error).__name__}: {error}",
                flush=True,
            )
            await asyncio.sleep(RETRY_BASE_DELAY * (2 ** (attempt - 1)))

    raise RuntimeError(f"Unable to synthesize {request_hash}")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--jobs", required=True, type=Path)
    parser.add_argument("--results", required=True, type=Path)
    parser.add_argument("--work-dir", required=True, type=Path)
    args = parser.parse_args()

    jobs = json.loads(args.jobs.read_text(encoding="utf-8"))
    if not isinstance(jobs, list):
        raise ValueError("Jobs file must contain an array")
    validated = [validate_job(job) for job in jobs]
    if len({job["requestHash"] for job in validated}) != len(validated):
        raise ValueError("Jobs contain duplicate requestHash values")

    semaphore = asyncio.Semaphore(CONCURRENCY)
    started = time.monotonic()
    last_completion = started
    counts = {"generated": 0, "reused": 0}

    def elapsed() -> str:
        minutes, seconds = divmod(int(time.monotonic() - started), 60)
        return f"{minutes}m {seconds:02d}s"

    def progress(kind: str) -> None:
        nonlocal last_completion
        counts[kind] += 1
        last_completion = time.monotonic()
        label = "Generated" if kind == "generated" else "Reused staged clip"
        print(f"[{sum(counts.values())}/{len(validated)}] {label} | elapsed {elapsed()}", flush=True)

    async def heartbeat() -> None:
        while True:
            await asyncio.sleep(15)
            if time.monotonic() - last_completion >= 15:
                print(
                    f"[{sum(counts.values())}/{len(validated)}] Still working; "
                    f"waiting for audio service | elapsed {elapsed()}",
                    flush=True,
                )

    heartbeat_task = asyncio.create_task(heartbeat())
    tasks = [asyncio.create_task(synthesize(job, args.work_dir, semaphore, progress)) for job in validated]
    try:
        results = await asyncio.gather(*tasks)
    except BaseException:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    finally:
        heartbeat_task.cancel()
        await asyncio.gather(heartbeat_task, return_exceptions=True)
    write_json_atomic(args.results, results)
    print(
        f"Audio synthesis complete: {counts['generated']} generated, "
        f"{counts['reused']} reused staged clips | elapsed {elapsed()}",
        flush=True,
    )


if __name__ == "__main__":
    asyncio.run(main())
