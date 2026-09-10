import json
import re
import shutil
import sqlite3
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATABASE = Path.home() / ".local" / "share" / "opencode" / "opencode.db"
PREFIX = "test-results/scratch-live/"
TARGETS = {
    f"{PREFIX}{name}"
    for name in [
        "feasibility.mjs",
        "chapter1-driver.mjs",
        "chapter2-ui.mjs",
        "chapter2-driver.mjs",
        "chapter2-cleanup.mjs",
        "chapter3-driver.mjs",
        "chapter4-slice1.mjs",
        "chapter4-ui.mjs",
        "chapter4-slice2.mjs",
        "chapter4-slice3.mjs",
        "chapter4-slice4.mjs",
        "chapter4-driver.mjs",
        "chapter5-slice1.mjs",
        "chapter5-slice2.mjs",
        "chapter5-driver.mjs",
        "chapter6-sound-probe.mjs",
        "chapter6-driver.mjs",
        "chapter6-release-playtest.mjs",
    ]
}


def relative_path(value):
    if not value:
        return None
    candidate = Path(value)
    if not candidate.is_absolute():
        candidate = ROOT / candidate
    try:
        return candidate.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return None


def parse_patch(text):
    lines = text.splitlines()
    index = 1 if lines and lines[0] == "*** Begin Patch" else 0
    operations = []
    while index < len(lines):
        line = lines[index]
        if line == "*** End Patch":
            break
        match = re.match(r"^\*\*\* (Add|Update|Delete) File: (.+)$", line)
        if not match:
            index += 1
            continue
        action, path = match.groups()
        index += 1
        body = []
        while index < len(lines) and not lines[index].startswith("*** "):
            body.append(lines[index])
            index += 1
        operations.append((action, relative_path(path), body))
    return operations


def apply_update(path, body):
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    trailing_newline = text.endswith("\n")
    hunks = []
    current = []
    for line in body:
        if line.startswith("@@"):
            if current:
                hunks.append(current)
            current = []
        elif line.startswith("*** Move to:"):
            continue
        else:
            current.append(line)
    if current:
        hunks.append(current)

    cursor = 0
    for hunk in hunks:
        old = []
        new = []
        for line in hunk:
            if line.startswith("+"):
                new.append(line[1:])
            elif line.startswith("-"):
                old.append(line[1:])
            elif line.startswith(" "):
                old.append(line[1:])
                new.append(line[1:])
            else:
                old.append(line)
                new.append(line)

        found = None
        stop = len(lines) - len(old) + 1
        for start in range(cursor, max(cursor, stop)):
            if lines[start : start + len(old)] == old:
                found = start
                break
        if found is None:
            for start in range(0, max(0, stop)):
                if lines[start : start + len(old)] == old:
                    found = start
                    break
        if found is None:
            raise RuntimeError(
                f"Could not replay hunk in {path.relative_to(ROOT)}: {old[:4]}"
            )
        lines[found : found + len(old)] = new
        cursor = found + len(new)

    path.write_text(
        "\n".join(lines) + ("\n" if trailing_newline else ""), encoding="utf-8"
    )


def main():
    destination = ROOT / PREFIX
    existing = sorted(relative for relative in TARGETS if (ROOT / relative).exists())
    if existing:
        raise RuntimeError(f"Refusing to overwrite existing files: {existing}")
    if not DATABASE.is_file():
        raise RuntimeError(f"OpenCode database does not exist: {DATABASE}")
    connection = sqlite3.connect(f"file:{DATABASE.as_posix()}?mode=ro", uri=True)
    rows = connection.execute(
        """
        select p.time_created, p.id, p.data
        from part p
        join session s on s.id = p.session_id
        where lower(replace(s.directory, char(92), '/')) = lower(?)
        order by p.time_created, p.id
        """,
        (ROOT.as_posix(),),
    ).fetchall()
    with tempfile.TemporaryDirectory(prefix="scratch-live-recovery-", dir=ROOT) as temporary:
        staging = Path(temporary)
        touched = set()

        for _, part_id, raw in rows:
            data = json.loads(raw)
            if data.get("type") != "tool":
                continue
            state = data.get("state", {})
            if state.get("status") != "completed":
                continue
            tool = data.get("tool")
            inputs = state.get("input", {})

            if tool == "write":
                relative = relative_path(inputs.get("filePath", ""))
                if relative not in TARGETS:
                    continue
                path = staging / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(inputs["content"], encoding="utf-8")
                touched.add(relative)
                continue

            if tool == "edit":
                relative = relative_path(inputs.get("filePath", ""))
                if relative not in TARGETS:
                    continue
                path = staging / relative
                text = path.read_text(encoding="utf-8")
                old = inputs["oldString"]
                if old not in text:
                    raise RuntimeError(f"Could not replay edit {part_id} in {relative}")
                path.write_text(text.replace(old, inputs["newString"], 1), encoding="utf-8")
                touched.add(relative)
                continue

            if tool != "apply_patch":
                continue
            for action, relative, body in parse_patch(inputs.get("patchText", "")):
                if relative not in TARGETS:
                    continue
                path = staging / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                if action == "Add":
                    path.write_text("\n".join(line[1:] for line in body) + "\n", encoding="utf-8")
                elif action == "Delete":
                    path.unlink(missing_ok=True)
                else:
                    apply_update(path, body)
                touched.add(relative)

        missing = sorted(relative for relative in TARGETS if not (staging / relative).is_file())
        if missing:
            raise RuntimeError(f"Recovery did not restore: {missing}")
        for relative in sorted(TARGETS):
            subprocess.run(["node", "--check", staging / relative], check=True)

        destination.mkdir(parents=True, exist_ok=True)
        for relative in sorted(TARGETS):
            source = staging / relative
            target = ROOT / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            print(relative)


if __name__ == "__main__":
    main()
