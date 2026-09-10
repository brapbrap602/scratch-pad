# Scratch Space Invaders Curriculum Audit - Status

Audit goal: verify "the instructions are actually good" by following the
corrected Space Invaders curriculum in the **real, unsigned Scratch editor**
(`scratch.mit.edu/projects/editor/`) using **Playwright with visible editor UI
only** (menus, dialogs, visible blocks, mouse drags, keyboard, File
save/load transport). No Scratch internals (VM/Redux/React), no generated
project data, no account.

Validated: **Chapters 1-6 built, exported, reloaded in fresh unsigned contexts,
and runtime-tested.** The final release also passed independent offense, ending,
cleanup, projectile, and defense verification against its exact saved bytes.

---

## 1. Summary verdict

- **Chapters 1-6:** solid. Independently rerun and passed in the live editor.
- **Final release:** passed the cumulative functional playtest matrix across
  fresh guest contexts, including all Chapter 6 collision guards and clean
  green-flag recovery after each terminal branch. A separate unchanged
  production-value run covered three clean starts, both edges, a real hit,
  natural Game Over, and same-context restart.
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
9. Chapter 4 was built in four direct incremental slices. A separate cumulative
   driver then found and rejected a decimal Shot Lane regression, after which
   Slice 4 and the canonical Chapter 4 export were rebuilt and rerun.
10. The default Playwright output cleanup erased the ignored live artifacts
    during a later `npm test`. Driver source was recovered from OpenCode's local
    SQLite session history, all Chapter 1-4 exports were rebuilt through Scratch,
    and `playwright.config.mjs` was isolated to `test-results/playwright`.
11. Chapter 5 was built in two direct slices and one independent cumulative run.
    The first full-fleet test exposed collision tunneling caused by a suggested
    temporary laser speed; the curriculum kept the production rise at 10 and
    now isolates win tests with temporary 99-second Stage/attacker waits.
12. Chapter 6 added three distinct sounds and the four missing playing-state
    collision guards through visible UI, exported the final project, and passed
    a fresh release start. Two focused verification reruns exercised bonus, win,
    both losses, cleanup, lane-shot, and Bunker behavior; a separate unchanged
    production-value run used player controls only through Game Over and restart.
13. A review then exposed the same cleanup risk in the visual Playwright config:
    running it erased `scratch-live`. The ignored drivers were recovered from
    local session history, recovery was hardened to stage and validate a complete
    set without overwriting existing files, every export/report was rebuilt, and
    `playwright.visual.config.mjs` was isolated to `test-results/playwright-visual`.
    The visual suite and hash verifier then passed without changing live evidence.
14. Final spec review found that the accepted Chapter 2-derived exports had
    malformed March Right/Left connections: token checks passed even though a
    `go to x:y` had missed its `Is Clone = 1` cavity. A visible-DOM parentage
    assertion reproduced the failure twice. The builder now creates each move
    directly inside its guard and verifies parentage; Chapters 2-6 and all final
    reports were rebuilt. The same review tightened the exact Chapter 4 Bunker
    checkpoint order and Chapter 5's same-game Alien-plus-Mothership scoring test.
15. A final evidence review found temporary message-declaration/test blocks in
    accepted workspaces and inferred, rather than direct, Bunker reset evidence.
    Message names are now created only when their first permanent script needs
    them. Chapter 1 was rebuilt with only Reset Game and Start Game; the accepted
    Chapter 2 and 3 checkpoints were visibly arranged, stripped of every non-hat
    top-level block, re-exported, and checked in fresh contexts. Chapters 4-6
    were rebuilt from that clean lineage. Final verification now rejects any
    non-hat top-level root and proves three Health-3 Bunkers after win, direct
    loss, and invasion loss by requiring three absorbed shots and a passing
    fourth shot in each of the three lanes. Feasibility evidence now carries the
    same structured policy assertions as every other bound report.
16. Independent standards/spec review then tightened the retained proof again:
    the cleanup driver now refuses to delete anything except approved detached
    broadcast scaffolding, requires an exact message inventory, and directly
    reruns Chapter 2 march/invasion plus Chapter 3 hit/restart behavior. Chapter
    4 now binds clean roots and its exact seven-message inventory to the existing
    export. Chapter 5/final bind all nine exact messages and hidden/inactive
    projectiles to every terminal restart. Recovery now includes the cleanup
    driver itself.

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
| 11 | Chapter 4 compressed several tall Blockly trees into vague one-line instructions | Added exact UI, reporter-hole, sibling-vs-nested, block-order, miss/hit, and independent-health instructions proven during live construction |
| 12 | Eraser size 40 removed the Bunker's center and let later shots pass through | Teaches Eraser size 10, upper-edge notches, and preserving solid center/lower pixels; live projectile tests cover all three costumes |
| 13 | `delete this clone` could look aligned without being connected | Health 0 now visibly hides first and snaps the cap block directly underneath; structure and three-hit runtime deletion are verified |
| 14 | A Chapter 5 win-test hint changed Player Laser movement from 10 to 20, allowing shots to tunnel through Alien costumes | Production laser movement remains 10; temporary 99-second Stage, Enemy Shot, and Mothership waits isolate the real 24-Alien win without changing collision steps |
| 15 | The final Bunker blueprint omitted `hide` before `delete this clone` in both Health 0 branches, diverging from the taught Chapter 4 code | Added `hide` to both final branches and strengthened the unit contract to require safe deletion in Chapter 4 and the final blueprint |
| 16 | Creating all future messages in Chapter 1 required saved declaration blocks because Scratch discards unreferenced names | Chapter 1 creates only `Reset Game` and `Start Game`; Chapters 2, 3, and 5 create each remaining name from the first permanent receiver/broadcast that uses it |

Live-build/tooling defect found after the curriculum corrections: the Chapter 2
driver's unverified detached-block drop could leave horizontal march moves outside
their clone guards while token-based checks still passed. The driver now performs
a verified nested construction, and final verification independently checks the
loaded March Right/Left parentage before runtime tests.

## 4. Repository changes (tracked, local)

| File | Change |
|---|---|
| `curriculum/space-invaders.json` | All of SS3, including just-in-time message creation |
| `tests/unit/space-invaders-curriculum.test.mjs` | 10 contract tests, including just-in-time messages, both safe Bunker deletion branches, exact Chapter 4 paths, and collision-safe Player Laser blueprints/win testing |
| `tools/validate-content.mjs` | Snapshot updated to 692 sections / 1,340 sentences |
| `tests/unit/narration-content.test.mjs` | Space Invaders 394 sections; totals 1,340 / 1,333 unique speech |
| `tools/verify-scratch-audit-hashes.mjs` | Verifies feasibility, accepted Chapters 1-5, and the final export against all four final reports, including policy fields, clean roots, nested march parentage, terminal Bunker resets, and required subcase passes |
| `tools/recover-scratch-live.py` | Recovers the complete ignored driver set only from sessions rooted at this workspace, resolves candidate paths against the repo, validates in staging, and refuses to overwrite live files |
| `playwright.config.mjs` | Uses `test-results/playwright` so normal site tests cannot erase sibling `scratch-live` evidence |
| `playwright.visual.config.mjs` | Uses `test-results/playwright-visual` so visual tests also preserve `scratch-live` evidence |
| `tests/e2e/app.spec.mjs` | Polls narration cleanup and gives the intentionally exhaustive all-curriculum render test an explicit 60-second timeout |
| `tests/visual/site.visual.spec.mjs` | Added targeted screenshots of changed final-code entries (endings, invasion, Enemy Shot, Bunker, Mothership) |

Latest local regression (all green):

```powershell
npm run validate:content   # 2 lessons, 52 steps, 692 sections, 1,340 sentences
npm run test:unit          # 26 tests passed
npm test                   # validate + unit + 33 e2e (chromium/firefox/webkit), passed
npm run test:visual        # 1 visual test passed; scratch-live remained intact
node tools/verify-scratch-audit-hashes.mjs  # 10 report/export bindings and required checks pass
npx playwright test tests/e2e/app.spec.mjs --project=webkit --grep "plays, pauses, advances, and resets a sentence narration queue" --repeat-each=8  # 8 passed
```

Screenshots were generated and representative live-editor evidence was inspected
alongside DOM/render assertions. A human release review can additionally eyeball
`visual-results/03a-e` and `test-results/scratch-live/*.png` (see SS7).

## 5. Live Scratch verification (artifacts under `test-results/scratch-live/`)

All live artifacts are git-ignored (`test-results/`).

### 5.1 Feasibility spike (passed)

- `feasibility-report.json` passed=true, `00`-through `06-*` artifacts.
- Proved via visible UI: rename sprite; create global + local variable; create
  a named broadcast; drag nested `if` block with `and` + `=` inside it; paint
  and rename a costume and a backdrop; File > Save to computer; fresh-context
  File > Load of the exact bytes.
- Export: `feasibility-probe.sb3` (43,483 bytes, sha256
  `3cd3e68654b62c63c78ad1b6b30086d70d73658b7e038a83843d611b78fa1f28`).

### 5.2 Accepted chapter exports

| Chapter | Report | Export | Bytes | SHA-256 | Verified at |
|---|---|---|---|---|---|
| 1 | `space-invaders-chapter-1-report.json` | `space-invaders-chapter-1.sb3` | 8,747 | `1936af17bd60eeec18003d00f64b60f3f7cad52eb4be7136b4b20697b6c935c7` | Clean roots; exactly two current messages; screenshots `08`-`18`; fresh reload |
| 2 | `space-invaders-chapter-2-report.json` | `space-invaders-chapter-2.sb3` | 12,019 | `bea0e1a369d07fa10d832ca936dc778dd2e5688849590c1c4e3b3d0ae9378f9a` | Visible root cleanup; exact six current messages; nested march parentage; 24-Alien fresh reload |
| 3 | `space-invaders-chapter-3-report.json` | `space-invaders-chapter-3.sb3` | 13,746 | `ee2eadbaac349c8451462cca2bdc675d329f4265db8470cf08f3c96e1d2abe4d` | Visible root cleanup; exact seven current messages; laser/collision structure; 24-Alien fresh reload |
| 4 | `space-invaders-chapter-4-report.json` | `space-invaders-chapter-4.sb3` | 18,053 | `8ff918528a2c1f0f2a10c0ecb50c1fd3b479911b2615f774b3571204c19c56ad` | Screenshots `54`-`58`; exact Bunker costume checkpoint, eight launches, Player hit, deletion, fresh reload |
| 5 | `space-invaders-chapter-5-report.json` | `space-invaders-chapter-5.sb3` | 20,205 | `40fc7a47f72757a34ab2f4c86f32382268a81654ac47dea9a89912315c1ae718` | Clean roots; exact nine messages; same-game 10+50 scoring, real 24-Alien win, both losses, hidden projectiles and direct three-Full-Bunker proof after each restart |
| 6 / Final | Four `space-invaders-final*-report.json` reports | `space-invaders-final.sb3` | 29,189 | `d767a26ba38ec9a25d4a558c922549ef7e260610c02b2b569cd3a2f929a45d69` | Screenshots `75`-`89`; clean roots, nested march structure, focused matrix, direct Bunker resets, defense, and unchanged production play/restart |

Note: hashes above are from the accepted rerun of each driver and
match every associated report's `export` record. Final verification reports read
and hash the existing export without re-exporting it. The focused matrix runs use
temporary in-session timing/position changes that are never saved; the separate
production release playtest changes no code or variable values.

### 5.3 What was verified per chapter

**Chapter 1** (fresh unsigned session)
- Six painted + centered bounded sprites (Player, Alien, Player Laser, Enemy
  Shot, Bunker, Mothership); Cat deleted.
- Exactly three backdrops (`Space` with controls text, `You Win`, `Game Over`).
- Nine globals, three Alien locals, two Bunker locals, one Mothership local;
  exactly `Reset Game` and `Start Game` at this checkpoint, with no `message1`
  or unused future message after save.
- Stage green-flag startup stack and Player Reset/Start Game movement stack
  built from real blocks; runtime: three repeated flags return x=0/y=-150;
  clamps exactly ±210 letting the ship touch the edges.

**Chapter 2**
- Creates `March Right`, `March Left`, `March Down`, and `Lose` from their first
  permanent scripts; fresh reload retains exactly the six messages used so far.
- Alien factory (24 clones), clone placement formula, three March receivers
  with each coordinate move visibly nested in its `Is Clone = 1` guard,
  including the taught `y < -60` loss guard.
- Stage 1/2/3 finite conductor, guarded phases, exact Fleet X bounds
  [-198,-108], Fleet Y -10 per phase, synchronized 24-clone formation, real
  invasion when the bottom row reached y -70, below the taught -60 threshold.

**Chapter 3** (Player Laser)
- Creates `Fire Laser` from the first permanent Player broadcast; fresh reload
  retains exactly the seven messages used so far.
- Separate Player Start firing stack: Space + `Laser Active = 0`, set guard
  before `Fire Laser`, release-until-glob; Flight = go to Player + y15, repeat
  until inactive/top/`not playing`, hide, cleanup guard.
- Alien clone: `forever` → hit loop (`Laser Active=1` and touching → clear guard,
  +10 Score, -1 Aliens Left, delete clone last).
- Runtime: fleet movement was observed, one real Alien hit produced Score 10 /
  Aliens Left 23, and a green flag during a visibly active laser restored 24
  Aliens / Score 0 / guard 0 with Player Laser hidden.

**Chapter 4** (Enemy Shot and Bunkers)
- Enemy Shot is a singleton with one Start Game loop, integer Shot Lane 0-7,
  fleet-relative x/y launch formulas, inactive/below-stage/not-playing flight
  exits, clear-first Player collision, and no clone or go-to-Alien code.
- Eight independent launches had valid lane/formula geometry and hid after a
  Bunker hit or miss; a direct Player hit set lost and cleared/hid the shot
  while Fleet Y was still 120.
- Full, Damaged, and Critical persist at 55x17 with center/lower collision
  pixels. Exactly three Bunker clones initialize at -130/0/130 with local
  Health 3 and separate guarded damage paths for both projectile types.
- Runtime: three left hits ended at y -115 and deleted only that clone; a
  fourth reached y 183 while middle/right still absorbed at y -115. Fresh
  reload repeated a valid launch and the full independent-health proof.
- The prescribed two-left/one-right checkpoint visibly showed Critical / Full /
  Damaged before the later deletion and sibling-survival checks.

**Chapter 5** (Mothership, endings, and cleanup)
- Mothership is a reusable singleton with one guarded 50-point award per pass,
  exact reset/cleanup state, and no clone code.
- Stage owns one guarded win monitor plus finite Win/Lose handlers that broadcast
  `End Cleanup and wait` before changing backdrop and stopping all scripts.
- All six sprites have finite cleanup receivers. Four fresh guest contexts proved
  a 10-point Alien hit followed by one 50-point bonus in the same game, a real
  24-Alien/240-point win, direct-shot loss before invasion, natural invasion
  loss, and complete hidden/inactive cleanup. Each terminal branch then restarted
  to Space / Score 0 / 24 Aliens and directly proved all three Bunkers reset at
  Health 3: three shots per lane were absorbed and the fourth passed.
- Every terminal restart also directly records Player Laser and Enemy Shot as
  hidden with both Active guards at 0 before the Bunker probes begin.

**Chapter 6** (polish, architecture, and final release)
- Added distinct `alien hit`, `bonus`, and `laser` assets from Scratch's visible
  sound library and placed non-blocking `start sound` blocks at the taught points.
- Added `Game State = playing` to Alien, both Bunker collisions, and Mothership
  while preserving the existing active/touching reporters and outer loops.
- Fresh final reload preserved all authored structure and initialized Score 0 /
  Aliens Left 24. Independent final runs repeated bonus, 24-hit win, both losses,
  cleanup, eight lane launches, guarded Player loss, and Bunker independence;
  win, direct loss, and invasion each returned cleanly to Space / Score 0 / 24
  Aliens through the green flag before that fresh context closed.
- A separate production-value run used only arrows, Space, and the green flag:
  three clean starts, both movement edges, a real 10-point hit, natural Game
  Over, and same-context restart to Space / Score 0 / 24 Aliens all passed
  with both projectiles hidden at every checked reset and without code or
  variable-value mutations.

The eight Chapter 6 matrix cases are traceable rather than inferred:

| Matrix case | Passing evidence |
|---|---|
| Start | Final release report `checks.controls.starts`: three production-value starts with Space / Score 0 / 24 Aliens / hidden projectiles; final verification directly proves three Health-3 Bunkers after each terminal restart; final defense independently verifies the Full/Damaged/Critical contract |
| Player | Final release report `checks.controls`: exact edges and real firing/hit; Chapter 3 `checks.runtime.chapter3` independently covers one real hit and restart during flight |
| Fleet | Chapter 2 report `checks.runtime` observes production marching and bottom-row invasion; final structure preserves the same shared-coordinate march and final verification clears all 24 |
| Defense | Final defense report `checks.runtime`: eight lane launches, miss/hit behavior, direct Player loss, local Bunker damage and sibling survival |
| Bonus | Final verification report `checks.runtime.mothership`: Alien Score 10 then stable Score 60 in the same game, a 50-point bonus delta |
| Win | Final verification report `checks.runtime.win`: 24 real hits, You Win, stopped/cleaned play |
| Invasion | Final verification report `checks.runtime.invasionLoss`: live fleet reaches the threshold, Game Over, stopped/cleaned play |
| Restart | Final verification report records clean green-flag recovery plus direct three-Full-Bunker proof after win and both loss branches; final release report repeats reset state at unchanged production values |

## 6. Out of scope / not done

- Brick Breaker audit (out of scope).
- No audio assets/manifests exist in the repo; generated narration not part of
  local suite; track separately.

## 7. Where the real code/artifacts live

Driver core (reusable, real UI): `test-results/scratch-live/chapter3-driver.mjs`
- exports helpers: `addBroadcast, addChangeVariable, addEquality, addNotPlaying,
  addSensingBoolean, addSetVariable, attachExistingAfter, attachOperator,
  booleanDestination, dragOperator, findReceiver, insertMotionReporter,
  insertVariable, isDescendantOf, isDirectChild, monitorValue, movePlayerTo,
  panToFreshArea, pressShot, restoreReleaseMonitors, setOperatorValue,
  setupMonitors, standaloneReceiver, targetCoordinates, targetVisibility,
  visualInput, waitForMonitor, waitForShotEnd, waitForStartup`, etc.
- `openEditor`/`launchBrowser`/block primitives (`findBlock`, `setBlockValue`,
  `selectBlockDropdown`, `insertReporter`, `toggleVariableMonitor`, ...) are
  imported from `./chapter2-ui.mjs`. `loadProject` is NOT exported and must be
  re-implemented locally per driver; Chapter 4 drivers re-implement the
  arithmetic/random operator pipeline (see `chapter2-driver.mjs`) because
  `dragOperator` here covers only `=, >, and, or, not`.
- Syntax checked (`node --check`), imports `./chapter2-ui.mjs` and helpers.

Per-chapter artifacts under `test-results/scratch-live/`:
- `space-invaders-chapter-{1,2,3,4,5}.sb3` + `-report.json`
- Chapter 4 incremental drivers/artifacts (`chapter4-slice1` through
  `chapter4-slice4`) plus independent cumulative `chapter4-driver.mjs`.
- Chapter 5 slice/cumulative drivers and Chapter 6 authoring/sound-probe drivers.
- `space-invaders-final.sb3` plus authoring, offense/endings, and defense reports.
- Sequence of numbered PNG screenshots per chapter (`19-` through `89-`).

## 8. Honest residuals / limitations

- Verified guest-only success applies to all six chapters and the final release.
- Representative screenshots plus DOM/structure assertions were reviewed, but a
  human visual pass remains useful for subjective polish.
- Visible structure and runtime events prove three different sound assets and
  non-blocking `start sound` placement. Whether they are perceptually distinct
  and audible is inherently a human listening check, not claimed by automation.
- Focused bonus, win, both-loss, and defense contexts use temporary unsaved
  timing/position tuning as disclosed in SS5.2. The unchanged production run is
  separate and intentionally makes no claim that every long-duration matrix
  branch was replayed at natural timing in one context.
- The final structure check rejects any non-hat top-level workspace root across
  the Stage and all six sprites. This excludes temporary declaration/test blocks
  from the accepted final bytes.
- Determinism: Scratch/scoring tests are eventually-consistent (no fixed wall-
  clock assertions): fleets move, shots random. All checks are eventual with
  tight bounds and real-time waits.
- No change to CI/local site test suite now runs the live Scratch suite; that
  stays opt-in/manual as designed.

## 9. How to resume

To recheck the retained local evidence:

```powershell
node tools/verify-scratch-audit-hashes.mjs
$env:SCRATCH_VERIFY_PROJECT='test-results/scratch-live/space-invaders-final.sb3'; node test-results/scratch-live/chapter5-driver.mjs
$env:SCRATCH_VERIFY_PROJECT='test-results/scratch-live/space-invaders-final.sb3'; node test-results/scratch-live/chapter4-driver.mjs
node test-results/scratch-live/chapter6-release-playtest.mjs
npm run test:visual
npm test
```

The Scratch drivers and binary evidence are intentionally under ignored
`test-results/scratch-live/`; preserve that directory if the local audit trail
must be retained.
