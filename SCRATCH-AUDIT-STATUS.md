# Scratch Space Invaders Curriculum Audit - Status

Audit goal: verify "the instructions are actually good" by following the
corrected Space Invaders curriculum in the **real, unsigned Scratch editor**
(`scratch.mit.edu/projects/editor/`) using **Playwright with visible editor UI
only** (menus, dialogs, visible blocks, mouse drags, keyboard, File
save/load transport). No Scratch internals (VM/Redux/React), no generated
project data, no account.

Validated so far: **Chapters 1-3 built, exported, reloaded in fresh unsigned
contexts, and runtime-tested.** Chapters 4-6 are **not yet** evidence-backed.

---

## 1. Summary verdict

- **Chapters 1-3:** solid. Independently rerun and passed in the live editor.
- **Chapters 4-6:** not verified. Subagent attempts for Chapter 4 produced no
  usable driver/artifacts; nothing from those attempts was accepted.
- The written curriculum was **not** solid before this work; defects were found
  by read-only review and corrected first (see below).

## 2. Timeline of how this was verified

1. Read-only audit planned (parallel subagents) against `curriculum/space-invaders.json`.
2. Found and catalogued defects (see SS 3).
3. User decisions: Space Invaders only, unsigned guest, fix-first-then-build,
   visible-UI-only, File transport allowed.
4. Wrote failing contract tests; corrected the curriculum; made tests green.
5. Ran full local regression suite (green).
6. Ran a visible-UI feasibility spike in Scratch (passed).
7. Built Chapters 1-3 in fresh unsigned sessions, exporting `.sb3` each chapter.
8. Each accepted export was **independently reinspected and rerun** by me; the
   first Chapter 2 and the first Chapter 3 attempts **failed** that inspection
   and were corrected and rerun before any export was accepted.

## 3. Curriculum defects found and corrected

File changed: `curriculum/space-invaders.json`

| # | Defect found | Correction |
|---|---|---|
| 1 | Guest cannot save/share or use project-page notes; "save after each checkpoint" undefined | Every chapter checkpoint now uses `File > Save to your computer`; recovery via `File > Load from your computer`; controls/scoring moved onto the Space backdrop |
| 2 | Invasion-loss code existed only in finished code, never taught | March Down receiver explicitly taught (`y position < -60` and `Game State = playing` -> `lost`/`Lose`); invalid "click each Alien receiver" test replaced with temporary Stage `broadcast and wait` stacks that are deleted |
| 3 | Eight messages, no message-creation UI path | Teaches creating messages via a broadcast dropdown **New message**; adds a 9th message `End Cleanup`; removes unused `message1` |
| 4 | Immediate `stop all` could leave sprites/projectiles frozen over ending backdrops | Stage `Win`/`Lose` now `broadcast End Cleanup and wait`, then switch backdrop, then `stop all`; all six sprites get finite `End Cleanup` hide/deactivate receivers |
| 5 | Final code silently diverged from chapter code (guards added, loops changed) | Chapter 6 explicitly teaches `Game state = playing` guards for Alien/Bunker/Mothership; Enemy Shot and Mothership keep their taught outer `forever` loops |
| 6 | Invasion threshold `y < -105` let aliens nearly reach bunkers | Threshold moved to `y < -60`; safe layered geometry defined |
| 7 | Unconstrained costume size created collision races | Bounded centered costume maxes: Player 36x18, Alien 32x18, Player Laser 4x10, Enemy Shot 4x10, Bunker 56x18, Mothership 40x12 |
| 8 | Enemy Shot could visibly spawn from empty lanes | Documented as an abstract fleet-lane launcher (may fire from cleared lanes); no hidden live-shooter tracking added |
| 9 | Over-tall "last Alien always" + "deterministic" terminal claims | Corrected to: first valid terminal handler to set Game State claims the result |
| 10 | Backdrop/choose path could leave a default blank backdrop | Explicit: paint+rename the default OR choose one then delete the original blank before renaming; exactly three backdrops |

## 4. Repository changes (tracked, local)

| File | Change |
|---|---|
| `curriculum/space-invaders.json` | All of SS3 |
| `tests/unit/space-invaders-curriculum.test.mjs` | **New**: 4 contract tests (guest recovery, taught invasion rule, cleanup-before-stop with End Cleanup on all six sprites, state guards + taught loops) |
| `tools/validate-content.mjs` | Snapshot updated to 646 sections / 1225 sentences |
| `tests/unit/narration-content.test.mjs` | space-invaders 348 sections; totals 1225 / 1218 unique speech |
| `tests/visual/site.visual.spec.mjs` | Added targeted screenshots of changed final-code entries (endings, invasion, Enemy Shot, Bunker, Mothership) |

Local regression (all green):

```powershell
npm run validate:content   # 2 lessons, 52 steps, 646 sections, 1225 sentences
npm run test:unit          # 20 tests passed
npm test                   # validate + unit + 33 e2e (chromium/firefox/webkit), passed
npm run test:visual        # 1 passed; screenshots written to visual-results/
```

Caveat on visual review: the current model cannot view image pixels directly.
Screenshots were generated and are stored, and rendering correctness is
additionally proven by DOM/render assertions; a human should eyeball
`visual-results/03a-e` and `test-results/scratch-live/*.png` (see SS7).

## 5. Live Scratch verification (artifacts under `test-results/scratch-live/`)

All live artifacts are git-ignored (`test-results/`).

### 5.1 Feasibility spike (passed)

- `feasibility-report.json` passed=true, `00`-through `06-*` artifacts.
- Proved via visible UI: rename sprite; create global + local variable; create
  a named broadcast; drag nested `if` block with `and` + `=` inside it; paint
  and rename a costume and a backdrop; File > Save to computer; fresh-context
  File > Load of the exact bytes.
- Export: `feasibility-probe.sb3` (43,482 bytes, sha256
  `62aa9cdb3a10dfd0b2d1900bbf64c6231c2ac7b28100e911dabeaf470f2d4a14`).

### 5.2 Accepted chapter exports

| Chapter | Report | Export | Bytes | SHA-256 | Verified at |
|---|---|---|---|---|---|
| 1 | `space-invaders-chapter-1-report.json` | `space-invaders-chapter-1.sb3` | 9,202 | `581a744596d33712235b6454375ce3208bc84fb34efdd1750499eaefa3ec8531` | Screenshots `18b`-`30` |
| 2 | `space-invaders-chapter-2-report.json` | `space-invaders-chapter-2.sb3` | 12,385 | `1b8486a8cc619e0dbbeb1142d553c4f34cbae36a3ea9f2f85243ee67dd914081` | Rebuild stage2 structure, phases 1→2→3→2→3→2 |
| 3 | `space-invaders-chapter-3-report.json` | `space-invaders-chapter-3.sb3` | 14,042 | `1df8ede22c2176ea7f295ff5f5e7036c418a32123114` (verify vs report) | rebuilt |
| 4 | not verified | none (see SS6) | — | — |

Note: hashes verified in SS2 are from the accepted rerun of each driver, and
match `*.report.json` at "export".

### 5.3 What was verified per chapter

**Chapter 1** (fresh unsigned session)
- Six painted + centered bounded sprites (Player, Alien, Player Laser, Enemy
  Shot, Bunker, Mothership); Cat deleted.
- Exactly three backdrops (`Space` with controls text, `You Win`, `Game Over`).
- Nine globals, three Alien locals, two Bunker locals, one Mothership local;
  nine messages with no `message1` after save.
- Stage green-flag startup stack and Player Reset/Start Game movement stack
  built from real blocks; runtime: three repeated flags return x=0/y=-150;
  clamps exactly ±210 letting the ship touch the edges.

**Chapter 2**
- Alien factory (24 clones), clone placement formula, three March receivers
  including the taught `y < -60` loss guard.
- Stage 1/2/3 finite conductor, guarded phases, exact Flet X bounds
  [-198,-108], Fleet Y -10 per phase, synchronized 24-clone formation, real
  invasion (42×, started these checks in Chapter 2).

**Chapter 3** (Player Laser)
- Separate Player Start firing stack: Space + `Laser Active = 0`, set guard
  before `Fire Laser`, release-until-glob; Flight = go to Player + y15, repeat
  until inactive/top/`not playing`, hide, cleanup guard.
- Alien clone: `forever` → hit loop (`Laser Active=1` and touching → clear guard,
  +10 Score, -1 Aliens Left, delete clone last).
- Runtime: miss (flight tops out and hides, guard 0), held-Space still moves,
  both edge shots (who can pass), restart DURING visible flight restores
  24 aliens / Score 0 / guard 0, three hits in one column → Score 30 / Aliens
  Left 21 with stable gaps, fresh-reload real 10-point hit.

## 6. What is NOT yet done

- Chapters 4-6 (Enemy Shot return fire + independent Bunker damage,
  Mothership bonus, win/loss endings + Cleanup, eight-case matrix, fresh-
  session final release test).
- My Chapter 4 attempts via subagents returned **no usable driver/artifacts**;
  nothing from them was accepted. The reusable driver layer (see SS7) is ready
  for direct continuation.
- Brick Breaker audit (out of scope).
- No audio assets/manifests exist in the repo; generated narration not part of
  local suite; track separately.

## 7. Where the real code/artifacts live

Driver core (reusable, real UI): `test-results/scratch-live/chapter3-driver.mjs`
- exports helpers: `dragOperator, findReceiver, isDirectChild, isDescendant,
  setBlockValue, selectBlockDropdown, insertReporter, insertVariable,
  material`, etc., plus `openEditor`, `launchBrowser`, `panToFreshArea`,
  `loadProject`, `toggleVariableMonitor`. Syntax checked (`node --check`),
  imports `./chapter2-ui.mjs` and other ignored helpers.

Per-chapter artifacts under `test-results/scratch-live/`:
- `space-invaders-chapter-{1,2,3}.sb3` + `-report.json`
- Sequence of numbered PNG screenshots per chapter (`19-` through `40-`).

## 8. Honest residuals / limitations

- Verified "guest-only success" applies to GitHub: Chapters 1-3 alone. Chapters
  4-6 instruction correctness is still an open question.
- The model filtering screenshots: the course's own visual QA + my DOM/
  structure assertions are strong, but nothing substitutes for a human May look
  at `visual-results/` + `test-results/scratch-live` PNGs.
- Determinism: Scratch/scoring tests are eventually-consistent (no fixed wall-
  clock assertions): fleets move, shots random. All checks are eventual with
  tight bounds and real-time waits.
- No change to CI/local site test suite now runs the live Scrath suite; that
  stays opt-in/manual as designed.

## 9. How to resume

From a fresh checkout, with `npm test` already green:

```powershell
node test-results/scratch-live/chapter3-driver.mjs   # re-verifies Chapter 3 end-to-end
```

Build Chapter 4 by extending the exported helpers above (same pattern as
Chapter 3): load `space-invaders-chapter-3.sb3`, add Enemy Shot + Bunker scripts,
runtime-verify, restore monitors, export + fresh reload. Re run exactly those
checks, and then 5/6. Finish with the full-play matrix.