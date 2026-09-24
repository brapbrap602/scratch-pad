# Tower Defense verification record

## Status

The six-chapter, 30-step curriculum and website integration are implemented. The remaining Chapters 3-6 visible-editor construction gate is now complete: each chapter was built from the preceding UI-authored checkpoint, tested, saved, and reopened in a fresh unsigned Scratch editor. The two-level reference and a separately saved, revised Level 3 extension both passed complete release-file playthroughs.

**Verification distinction:** The original generated chapter/reference/boundary fixtures remain supplemental runtime evidence. The new `tower-defense-chapter-3.sb3`, `tower-defense-chapter-4.sb3`, `tower-defense-chapter-5.sb3`, and the two `*-release.sb3` files were authored using visible palette, block, costume, mouse/keyboard, and File save/load controls. Their lineage starts at the existing UI-authored Chapter 2 save. No generated project was installed as an authoring checkpoint. Read-only saved-block-graph comparisons supplement the UI walkthroughs; they do not establish authorship by themselves.

The local audit scripts, projects, reports, and Scratch screenshots follow the repository's existing convention under ignored `test-results/scratch-live/`. Website screenshots are under `visual-results/`. Preserve those directories if retaining the local evidence.

## Curriculum prose review

After the construction walkthrough, the complete curriculum was reviewed for advanced-beginner preteens working independently. The review used the current uncommitted curriculum as its preservation baseline, not `HEAD`.

- Split instructions that changed sprites or combined several setup tasks. Chapter 5's twelve new variables are now grouped into four purpose-based instructions.
- Replaced “guarded,” “consume,” and “controller” in learner instructions with the actual checks, state changes, and Stage scripts.
- Explained HP, why clones need `For this sprite only` values, how `mod` cycles lane numbers, and why the game uses position checks rather than `touching [Shot]?`.
- Clarified the order of shot preparation, clone deletion, spawn counting, and next-level requests. The Level 2 rewrite now explicitly keeps each define block while replacing all the blocks below it; the Level 3 challenge adds separate settings checks after Level 2.
- Kept download filenames as plain text because this site's backticks render Scratch diagrams. The new inline Level 3 examples use complete Scratch `if` syntax; visual assertions check that they render as control blocks and that the reference filename is not rendered as a block.

**Preservation:** all six chapter IDs, 30 step IDs, titles, timing estimates, exact project names, 41 `finishedCode[].code` strings, and their target labels remain unchanged. Counts, coordinates, dimensions, movement formulas, and game rules are preserved. No new game-logic defect was found. The existing live evidence remains evidence for the unchanged game; the revised wording was checked with preservation, content, browser, and visual tests rather than presented as another live construction run.

The historical UI manifest retains source curriculum SHA-256 `3948f15bb1aec6c1081d213fb8141e3bd64969022d23a1c7d88f736e1a256304`. The revised prose has SHA-256 `c4d4b17d5f169d7be8630a38e685b193cf75290783056cb10918102aef22a361`. Local `tower-defense-prose-baseline.json` and `tower-defense-prose-review-report.json` bind the preservation comparison; `tower-defense-prose-artifact-check.json` checks all nine saved projects and seven reports against the historical manifest without rewriting it.

Current narration inventory: **1,149 sections, 2,288 sentence references, and 2,275 unique requests**, including 415 Tower Defense sections. These totals supersede the pre-review narration inventory below. There are no published audio manifests to invalidate, and no narration audio was generated.

Scratch-native terms such as My Blocks, conditions, clones, `broadcast and wait`, and `Run without screen refresh` remain because learners must find and use them in Scratch. HP and `mod` now have concrete explanations. Existing finished-code target labels containing “controller” are preserved as potential UI/test lookup keys.

Verification commands for this prose pass:

```powershell
node test-results/scratch-live/review-tower-defense-prose.mjs
node --test tests/unit/tower-defense-curriculum.test.mjs
npm run validate:content
npm run test:unit
npm test
npm run test:visual
npm run audio:plan
node tools/verify-scratch-audit-hashes.mjs
node test-results/scratch-live/verify-tower-defense-prose-artifacts.mjs
git diff --check
```

The repository hash verifier covers the earlier Space Invaders audit; the final command before `git diff --check` checks the Tower Defense artifacts. Both checks passed. The revised suite contains 31 unit tests, including ordered per-instruction contracts for shot preparation and the independent extension, plus 33 browser tests and two visual checks.

## Real Scratch evidence

| Evidence | Observed result |
| --- | --- |
| `tower-defense-feasibility-report.json` | Twelve clones consumed six active slots exactly once; a repeated check added no hits; explicit clone deletion/rebuild restored the correct count; save/reopen passed. |
| `tower-defense-chapter-1-report.json` | Visible-UI construction: movement, one escape/one health loss, restart during movement, fresh-editor reload. |
| `tower-defense-chapter-2-report.json` | Visible-UI construction from Chapter 1: purchase during combat, occupied spot, insufficient/exact coins, reset, save/reopen. The later persistent price-label instruction is present in the generated reference; the earlier chapter artifact uses simpler artwork. |
| `tower-defense-chapter-3-report.json` | Visible-UI construction from Chapter 2. Before connecting damage, observed a shot reach x 235 and relaunch at -125. Then observed HP 2→1→0, one reward, defended/undefended outcomes, restart during flight, and both outcomes after reload. |
| `tower-defense-chapter-4-report.json` | Visible-UI clone migration from Chapter 3. Three lane purchases cost 90 and earned 30 at health 5. Both top-lane slots fired independently; the other lanes escaped, leaving health 3 and coins 40. Repeated restarts restored six zeroes per list; fresh-editor replay passed. This report was rerun after the detached-reporter correction below. |
| `tower-defense-chapter-5-report.json` | Visible-UI construction from the corrected Chapter 4 save. All three manual waves, repeated Start clicks, preserved defenses/resources, occupied/unaffordable purchases, a sixth tower bought during combat, win/loss, and restart passed. The reopened file completed all three production-setting waves at full health. |
| `tower-defense-chapter-6-report.json` | Visible-UI settings/button/controller migration from Chapter 5. Repeated Next clicks advanced once; Level 2 began with six empty spots, six zeroes per list, 90 coins, health 5, and no automatic wave. Both levels won, the reopened reference completed all five waves, and restarting during Level 2 combat returned to Level 1. |
| `tower-defense-level-3-ui-draft-report.json` / `tower-defense-level-3-ui-revise-report.json` | Independently UI-authored settings branches, predictions, two strategies, and one revision. Natural progression through Levels 1 and 2 reached Level 3. The revision was saved separately and reopened before completing all seven waves. The two-level reference hash remained unchanged. |
| `tower-defense-ui-release-checks.json` | Both polished UI-authored release files reopened in fresh editors, completed their five/seven-wave games, reached natural loss, and restarted. Exactly four non-overlapping player monitors were asserted. Clean Stage and full-editor screenshots were captured. |
| `tower-defense-ui-manifest.json` | SHA-256 inventory of the current accepted projects and successful reports. Read-only normalized script comparisons returned zero differences for UI Chapters 3-5 against their generated counterparts, the two-level release against the published-code reference, and the polished extension against its pre-polish UI save. |
| `tower-defense-generated-chapter-checks.json` | Generated Chapter 3: HP 2 to 1 to 0, single reward, undefended escape. Generated Chapter 4: all three lanes earn the correct reward. Generated Chapter 5: all three manually started waves reach the one-level win. |
| `tower-defense-generated-playtest.json` | Generated final reference: complete Level 1 and Level 2 with full health, buying during combat, wave pauses, fresh resources and six empty spots, repeated Next Level clicks, natural loss without towers, ending stability, restart, save/reopen and another successful wave. |
| `tower-defense-boundary-checks.json` | Nine generated, instrumented live cases: both hit boundaries and adjacent misses, overlapping enemies, two shots against a one-HP enemy, an enemy behind a new shot's muzzle, the final outgoing shot segment, and loss taking priority on the last escape. A settings-only Level 3 example also passed a Level 2-to-3 transition and final win. These focused fixtures deliberately use test setups rather than production values. |

Reports bind successful runs to the SHA-256 of the relevant `.sb3`. Build reports also record the curriculum hash. Generated fixtures are explicitly labelled as such and are supplementary to the editor-built checkpoints.

The final UI manifest records curriculum SHA-256 `3948f15bb1aec6c1081d213fb8141e3bd64969022d23a1c7d88f736e1a256304`. The continuation found and corrected automation/assembly problems, but required no further curriculum or application-code changes.

### Accepted UI-authored files

All files below are under `C:\Users\HT\Documents\code\scratch-pad\test-results\scratch-live\`.

| File | SHA-256 |
| --- | --- |
| `tower-defense-chapter-2.sb3` — preserved starting checkpoint | `7d72f362bf717c19df47f4b0b85abd1b6701116a3fd6fb48d0084e172e144509` |
| `tower-defense-chapter-3.sb3` | `fa883cec4805b565def2720b05df5a8c9b468efa2a2f80a156eab86d189a7ea9` |
| `tower-defense-chapter-4.sb3` — corrected and reverified | `370c91059dc98a2750f0253913b9e3319c4e3ef1c07caad645dd582826d7dcb6` |
| `tower-defense-chapter-5.sb3` | `291e194568c7001afef68c4663c75e753426f6d51a069f69ededd10eb3971d92` |
| `tower-defense-two-levels-release.sb3` — guided reference | `2fb2d9d3b6c7cd27a7fd4a1fb2228079c964ed587b9e3e4071496d0e506d9478` |
| `tower-defense-my-levels-release.sb3` — independent extension | `b9c86c3bdfc6bab97cd127901e48ab2f6fc55ce875a2f277c8c127f97044567c` |

The pre-polish `tower-defense-two-levels.sb3`, draft extension, and revised `tower-defense-my-levels.sb3` are also retained and hashed in the manifest. The release copies add the persistent price/build-rule label, move the four player monitors into a non-overlapping top row, and hide debugging displays. Their script graphs are unchanged by polishing. Runtime release checks temporarily show Game State for assertions and hide it for screenshots; they do not resave the release files.

### Independent Level 3 experiment

- Goal/prediction: a gentler later level, using two waves of three enemies and Spawn Gap 18. One tower per lane should preserve health; buying none should still lose.
- Draft: 90 starting coins. Sensible strategy finished with health 5 and coins 60. No purchases lost during wave 2.
- Revision: change only Level 3's starting budget to 120, allowing a fourth preparation purchase. The fresh-editor seven-wave playthrough verified that purchase and finished Level 3 with health 5 and coins 60.
- Poor-strategy replays used the existing visible Stage `Reset level` definition while Level was 3. These were focused editor replays, not claims of another full run from Level 1. Natural Level 2→3 progression and the complete revised playthrough were tested separately.

No signed-in Scratch account, internal VM mutation, or production-value tuning was used for the final reference playthrough. The guest editor emitted background account/API errors while local editing and gameplay worked; the report asserts local game behavior, not cloud saving.

## Screenshots captured and inspected

### UI-authored releases

- [Starting battlefield](test-results/scratch-live/tower-defense-two-levels-release-level-1-start.png)
- [Combat](test-results/scratch-live/tower-defense-two-levels-release-level-1-combat.png)
- [Manual wave pause](test-results/scratch-live/tower-defense-two-levels-release-level-1-wave-pause.png)
- [Level 1 cleared](test-results/scratch-live/tower-defense-two-levels-release-level-1-cleared.png)
- [Fresh Level 2](test-results/scratch-live/tower-defense-two-levels-release-fresh-level-2.png)
- [Win](test-results/scratch-live/tower-defense-two-levels-release-win.png)
- [Loss](test-results/scratch-live/tower-defense-two-levels-release-loss.png)
- [Restart](test-results/scratch-live/tower-defense-two-levels-release-restart.png)
- [Fresh revised Level 3](test-results/scratch-live/tower-defense-my-levels-release-fresh-level-3.png)
- [Independent extension win](test-results/scratch-live/tower-defense-my-levels-release-win.png)

Every release image above was captured after opening the saved release file in a fresh editor. Matching `-editor.png` files show the surrounding Scratch UI. Chapter reports link the intermediate lists, shot reuse, damage, clone, and code screenshots. The simple UI-painted artwork differs from the more decorative generated fixture artwork below.

### Complete generated reference, played in Scratch

- [Initial battlefield](test-results/scratch-live/tower-defense-generated-start.png)
- [Towers firing](test-results/scratch-live/tower-defense-generated-combat.png)
- [Between waves](test-results/scratch-live/tower-defense-generated-wave-complete.png)
- [Level cleared](test-results/scratch-live/tower-defense-generated-level-clear.png)
- [Fresh Level 2](test-results/scratch-live/tower-defense-generated-fresh-level-2.png)
- [Win](test-results/scratch-live/tower-defense-generated-win.png)
- [Loss](test-results/scratch-live/tower-defense-generated-loss.png)
- [Restart](test-results/scratch-live/tower-defense-generated-restart.png)
- [Saved and reopened](test-results/scratch-live/tower-defense-generated-reopened.png)

### Curriculum website

- [Desktop course](visual-results/05-tower-defense-desktop.png)
- [Shot code, left](visual-results/06-tower-defense-shot-blocks.png)
- [Shot code, right](visual-results/06b-tower-defense-shot-blocks-right.png)
- [Level settings, top](visual-results/07-tower-defense-level-settings.png)
- [Level settings, bottom](visual-results/07b-tower-defense-level-settings-bottom.png)
- [320-pixel mobile challenge](visual-results/08-tower-defense-mobile-challenge.png)

The code panels deliberately scroll horizontally for wide blocks. The paired screenshots check both sides rather than pretending a clipped image proves the whole condition. Actual SVG rendering is asserted separately from the E2E suite's renderer stub.

## Fixes found through verification

1. During probe authoring, a deletion block landed outside its if. Structural inspection and screenshots caught it; the corrected clone-reset probe passed.
2. The completed level's Next Level button originally overlapped Start Wave. A double click started the next wave unintentionally. Moving Next Level to the center fixed the live test; a regression test checks non-overlapping button bounds.
3. My Block inputs rendered black with the pinned Scratchblocks build. A small scoped style fix restores their pink appearance; a real-browser CSS assertion protects it.
4. Review corrected reference-save instructions that could overwrite the two-level file, added the overlapping-enemy explanation and visible tower price, and aligned the missed-shot description with the actual right-edge position.
5. The continuation's automation initially matched nested costume-menu text as if it were a palette variable, dragged through overlapping blocks, and failed to account for scrolling. Palette-root selectors, explicit attachment assertions, clear work areas, and more reliable scrolling corrected these driver problems.
6. Moving an `else` head with following siblings attached pulled those siblings into the branch. This stranded Chapter 5's spawn countdown. The driver now completes branches before creating the next sibling and checks the resulting saved graph.
7. Panning over a wide Tower script detached the `Shot X` reporter from the outgoing-shot check during Chapter 4 construction. The short three-lane test still passed; the longer Chapter 5 run and a read-only graph comparison exposed the omission. The reporter was restored through visible controls, Chapter 4 was reverified, and Chapter 5 was rebuilt from that corrected save. The accepted files have no differing script graphs. Earlier assembly/failure files are development evidence, not accepted checkpoints.
8. Replacing a definition by deleting only its first statement preserved an unwanted tail. The Stage settings replacement was repeated using a visible whole-tail drag to the palette; graph comparison then matched the published definitions exactly.
9. Release screenshot inspection caught overlapping monitors and a price label over the lowest tower. Moving monitors in a non-obstructing order and lowering the label fixed both; final monitor bounds and screenshots were checked again.

## Website checks and reviews

- `npm test` passed: content validation for three lessons/82 steps, all 29 unit tests, and all 33 browser tests across Chromium, Firefox, and WebKit.
- `npm run test:visual` passed both visual checks. The new check verifies actual custom-input styling, SVG rendering, horizontal code scrolling, and a 320-pixel mobile page without horizontal overflow.
- Before the prose review, `npm run audio:plan` reported 1,106 narration sections, 2,245 sentence references, and 2,233 unique requests. The current inventory is recorded in the prose-review section above. No audio synthesis was performed.
- `git diff --check` passed.
- Chapter 2's visible-UI test was rerun with an exact zero-coin assertion for the exact-price purchase and passed.
- After completing the UI walkthroughs, `npm test` passed again with 29 unit tests and 33 browser tests; `npm run test:visual` passed both checks. E2E and visual were run sequentially. Their output directories are separate from `test-results/scratch-live/`.
- The continuation review checked the accepted saved graphs, source/checkpoint hashes, release screenshots, report claims, and preserved generated/UI evidence distinction. The new work changes verification records and ignored local audit tooling/evidence; it adds no application or curriculum edits.

### Standards review

The earlier independent follow-up found no new material teaching/standards defects after the corrections. It checked the complete final code, script replacements, button separation, and scoped rendering fix.

### Spec review

The earlier independent follow-up found no new material specification gaps in the implemented game or curriculum. It explicitly distinguished generated runtime fixtures from the visible-UI walkthroughs that were still open at that time. The continuation results above close those walkthrough gates.

## Reproduction

From the repository root, the accepted release files can be rechecked without rebuilding them:

```powershell
node test-results/scratch-live/check-tower-defense-releases-ui.mjs
node test-results/scratch-live/tower-defense-ui-manifest.mjs
npm test
npm run test:visual
git diff --check
```

Construction drivers are retained as `tower-defense-chapter3.mjs`, `tower-defense-chapter4.mjs`, `tower-defense-chapter5-art.mjs`, phased `tower-defense-chapter5.mjs` / `tower-defense-chapter6.mjs`, `tower-defense-level3-ui.mjs`, and `polish-tower-defense-ui.mjs`. Their phase reports and UI-saved intermediate files document retries and migrations. The fresh-file behavioral drivers are `check-tower-defense-chapter3-ui.mjs` through `check-tower-defense-chapter6-ui.mjs`. Some independent artwork operations were batched ahead of code assembly; this was an automated construction walkthrough, not a timed learner session.

Earlier feasibility and supplemental generated-runtime reproduction commands remain:

```powershell
node tools/check-scratch-editor.mjs
node test-results/scratch-live/tower-defense-feasibility.mjs
node test-results/scratch-live/tower-defense-chapter1.mjs
node test-results/scratch-live/tower-defense-chapter2.mjs
node test-results/scratch-live/build-tower-defense-reference.mjs 3
node test-results/scratch-live/build-tower-defense-reference.mjs 4
node test-results/scratch-live/build-tower-defense-reference.mjs 5
node test-results/scratch-live/check-tower-defense-generated-chapters.mjs
node test-results/scratch-live/build-tower-defense-reference.mjs
node test-results/scratch-live/play-tower-defense-reference.mjs
node test-results/scratch-live/check-tower-defense-boundaries.mjs
npm test
npm run test:visual
git diff --check
```

Run the website E2E and visual suites sequentially: they share port 4173. Audio inventory planning is read-only; no audio was generated.

## Completion and limitations

- The Chapters 3-6 visible-UI construction, checkpoint, save/reopen, guided-game, independent-extension, and screenshot gates are complete.
- Learner pacing estimates are editorial estimates, not timings from a preteen study.
- The nine instrumented collision/boundary/loss cases remain explicitly generated-fixture evidence; they were not relabelled as UI-authored projects.
- Audit artifacts remain ignored local files. Retain `test-results/scratch-live/` alongside this record to retain the projects, reports, and screenshots.

No narration audio was generated and no commit was made.
