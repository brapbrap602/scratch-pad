# Tower Defense developer plan

Status: approved, implemented, and verified through the remaining visible-UI chapter walkthroughs. Actual results, accepted file hashes, screenshots, and limitations are in [the verification record](TOWER-DEFENSE-VERIFICATION.md); approval alone is not verification evidence.

Audience and game scope: [stakeholder plan](TOWER-DEFENSE-PLAN.md).

## Repository baseline

- Existing courses: `curriculum/brick-breaker.json` and `curriculum/space-invaders.json`.
- Content contracts: `schemas/lesson.schema.json`, `js/content.js`; chapters currently require at least 90 minutes and end with a checkpoint.
- Index: `curriculum/lessons.json`. The application already discovers lessons and renders their instructions, help, checkpoints, and finished code.
- Narration extraction: `js/narration-content.js`. Inventory expectations exist in `tools/validate-content.mjs` and `tests/unit/narration-content.test.mjs`.
- Existing browser coverage stubs Scratchblocks; visual tests permit fallback text. Neither proves new custom blocks actually render as SVG.
- Existing Scratch drivers/evidence are under ignored `test-results/scratch-live/`; `SCRATCH-AUDIT-STATUS.md` describes the previous course's audit. Preserve those artifacts. Its hash verifier does not prove tower-defense behavior.

## Approved decisions

Three lanes, two fixed slots per lane, indestructible towers, one tower/enemy type, build only, manual waves, purchases in preparation/combat, one flying shot per tower, fresh levels through Next Level, guided Level 1 and tiny guided Level 2, independent later-level challenge. Two small lists and gradual My Blocks instruction are approved. Both live Scratch and course-site verification are required.

Superseded: independent Level 2 without a worked example; one-wave-per-level engineering suggestion; shipping a third implemented level. Supply two levels, and let students add the third.

## Game state and ownership

States: `resetting`, `ready`, `combat`, `cleared`, `won`, `lost`.

- Start Wave sets a request only in ready. The Stage consumes it once, loads wave settings, resets spawn counters, and enters combat.
- Next Level sets a request only in cleared. The Stage enters resetting, advances Level once, clears old clones, and builds a fresh level.
- Purchases require ready/combat, an unbuilt slot, and enough coins. Recheck and deduct coins/set Built together in a short no-wait My Block.
- Only the Stage changes game state and controls update order. Tower/Enemy/Shot messages used with broadcast-and-wait must finish.
- Enemies decrement alive count once, on defeat or escape. Only defeat awards coins. Reset deletion never awards coins or damages the base.
- Check health failure before wave completion. Completion requires all scheduled enemies spawned AND zero alive.
- Between waves clear shots, advance Wave, return to ready, and preserve defenses/resources. Never reset the level between waves.
- Final wave: cleared if another level exists, otherwise won. No terminal stop may prevent Next Level.

## Small reusable Scratch interfaces

Stage My Blocks: `Load level settings`, `Load wave settings`, `Reset level`, `Clear shots`. Cross-sprite work uses named broadcasts; My Blocks remain local to their sprite.

Tower remembers ID, Lane, Built. Enemy remembers clone marker, Lane, HP, and first shot slot. Shot display remembers ID/Lane. Hidden originals have sentinel ID/marker zero; factories prepare local values before cloning and restore their own sentinel. Do not rely on asynchronous clone-start initialization.

Two lists have exactly six entries during the complete game:

- `Shot X`: Tower n advances entry n; Stage resets it.
- `Shot Active`: Tower n launches/retires entry n; enemies consume it before damage; Stage clears it at transitions.

Shot clones only display list data. No new projectile clone is created for each shot. Each enemy checks the two numbered slots assigned to its lane. Hit check/claim runs in a bounded no-yield My Block and clears Active before changing HP. Test HP before trying the second slot so a defeated enemy does not consume another shot.

## Geometry and update contract

Proposed lanes: y=90, 0, -90. Towers sit at x=-155 and lane y plus/minus 22, with centered bodies no larger than 28x24. Both shots launch at x=-135 on the lane center. Centered enemies are 24x20, start x=220, and escape at x<=-210. Shot artwork is 6x6.

One update: spawn if countdown is zero and enemies remain; Tower Step; Enemy Step; loss/completion checks; Draw Shots; decrement positive spawn countdown; wait 0.03 seconds. The first enemy spawns immediately. Enemy motion is 2 pixels left per update; shot motion is 10 right. This is not a promised frame rate. Provisional spawn gaps are 18 updates in Level 1 and 15 in Level 2.

Tower first retires a previous shot beyond x=230, launches at -135 if inactive, and always advances the active shot by 10 before enemy checks. Enemies move left 2 before checking hits. A point-shot sweep against an enemy half-width of 12 is:

`shotX >= enemyX - 12 AND shotX - 10 <= enemyX + 14`

The visible shot's center is the collision point. Explain with positions and a diagram, not a requirement to derive continuous collision mathematics. In Scratch, compose <=/>= using not and the opposite comparison. Retirement at the following update preserves testing of the final outgoing segment. Exact boundary, muzzle, costume-center, overlap and lane cases are live verification gates. Do not offer speed tuning until the formula has been adapted and checked.

Towers fire during combat even if their lane is empty; no nearest-target registry. Multiple qualifying enemies may resolve in Scratch scheduling order; nearest-target priority is not promised.

## Reset and level settings

Reset: enter resetting; clear request flags; hide action buttons; delete marked clones and wait; load settings; set Wave=1, fresh Coins/Base Health, zero counters; rebuild lists with six zeroes; create six empty Tower clones and six Shot displays; present the level; enter ready. No old spawning thread or timed shooting thread survives because the single Stage loop owns all updates.

Final Level is 2 in the supplied game. Level settings provide starting coins90, health5, enemyHP2, and wave count (3/2). Wave settings provide enemy counts (Level1:3,3,6; Level2:6,6) and spawn gap (18/15). Fixed cost30, reward10, and damage1. Enemy lanes cycle 1,2,3 each wave.

Balance remains provisional: 90 coins buys three towers; every three kills funds another. Verify reasonable beginner placements can succeed and extra towers visibly help. No claim of empirical learner evaluation.

## Curriculum and website integration

Add `curriculum/tower-defense.json`, register it, add `tests/unit/tower-defense-curriculum.test.mjs`, and extend explicit course fixtures in content, E2E, visual, and narration tests. Recompute narration counts. Do not generate audio.

Six chapter topics follow the stakeholder plan. Keep the short Level 2 example within the final chapter. Estimate time from the walkthrough rather than fabricating durations to meet the schema.

Shooting checkpoints: inspect one list entry; launch/move/miss/reuse; two hits against one enemy; explain consumption with an overlapping-target example; later expand to six spots. Use final names/ownership where practical, but do not front-load the full controller. Every transition names the sprite and existing event script, what to keep/replace/delete, exact attachment point, obsolete test blocks, and visible expected result. Verify from the preceding saved project, not by rebuilding directly from final code.

The independent level task is predict/change/playtest/explain/revise. Students add settings branches and update Final Level, not duplicate the engine. Keep controls, game state feedback, monitors, costs, and unavailable actions understandable. Website navigation and completion controls remain distinct from Scratch Start Wave/Next Level.

## Implementation slices and gates

1. Save plans and inspect current instructions/worktree.
2. Live Scratch feasibility: author a small visible-UI shot/clone/reset probe, exercise all six shots, save/reopen. Confirm runtime assumptions before drafting the full course. First verify browser launch and Scratch connectivity; if unavailable, report the blocker without claiming live evidence.
3. Build vertical gameplay/teaching slices, starting with one lane. Save each chapter and verify its instructions against the preceding checkpoint.
4. Add waves, Level 2 reset/settings reuse, and independent challenge.
5. Integrate website fixtures and narration inventories; inspect real block SVGs.
6. Production-settings gameplay and save/reload verification, evidence tied to saved project bytes; final code review.

### Case matrix

| Case/setup | Action | Expected result | Seam |
| --- | --- | --- | --- |
| Exact/insufficient coins, empty/occupied spot | Click or double-click | One affordable purchase, no duplicate charge | Scratch UI/runtime |
| Six built towers | Start a wave | At most one shot per tower; independent reuse | Scratch runtime |
| Two enemies overlap; one shot | Resolve update | At most one hit from that slot | Scratch runtime |
| Two shots reach one low-HP enemy | Resolve update | One reward/removal; unused second shot remains available | Scratch runtime |
| Muzzle, boundary, outgoing segment, other lane | Advance shots | Intended sweep hits; no cross-lane/behind-muzzle phantom hit | Scratch runtime |
| Empty road during spawn gap | Wait | Movement continues; wave does not finish early | Scratch runtime |
| Last escape with health1 | Resolve | Loss wins over completion | Scratch runtime |
| Completed nonfinal wave | Wait/click Start repeatedly | Resources retained; next wave waits and starts once | Scratch UI/runtime |
| Cleared Level1 | Repeated Next clicks | Level2 once; 6 empty towers/6 shots, lists length6, fresh resources, no enemies | Scratch UI/runtime |
| Combat/clear/end | Green flag; save/reopen | Clean initial level; project remains functional | Scratch editor |
| Level2/learner Level3 | Change settings only | Existing gameplay code reused | Walkthrough/code inspection |
| New lesson selected | Navigate every step/help/code panel | Content, completion and progress isolation work | Site E2E |
| Phone/keyboard/no narration | Navigate lesson | No overflow; controls reachable; text works without audio | Site E2E/visual |
| My Block/list finished code | Render real dependency | Actual readable Scratchblocks SVG, not just source fallback | Site visual |

### Commands

Use `node --test tests/unit/tower-defense-curriculum.test.mjs`, `npm run validate:content`, `npm run test:unit`, `npm test`, then `npm run test:visual` as appropriate to completed slices. E2E and visual share port4173 and must run sequentially. Run `git diff --check`. Content assertions protect meaningful instructional order/contracts; they do not prove Scratch execution. Existing sibling audit hash checks do not substitute for new game verification.

## Review and remaining evidence

Independent baseline and consolidated-plan reviews completed, including a focused review of movement timing, collision assumptions, script migration, and teaching load. No unresolved product decision blocks implementation. Live feasibility, balance, actual rendering, and instruction-following gates remain open until observed. Browser installation/network availability is not assumed. No commit or publication is authorized.

### Implementation evidence so far

- `node tools/check-scratch-editor.mjs`: Chromium launched and the unsigned online editor returned HTTP 200 with its Start project control available.
- `test-results/scratch-live/tower-defense-feasibility.mjs`: visible-UI probe passed six independent list claims by twelve competing clones, repeated claim rejection, explicit clone deletion/rebuilding, and saved-project reopening in a fresh unsigned editor.
- Probe report: `test-results/scratch-live/tower-defense-feasibility-report.json`. The saved `.sb3` hash is recorded in that report. This is a primitive feasibility check, not a complete-game release test.
- The probe deliberately retains test controls and uses simple default artwork. Its screenshots are development evidence, not final-game screenshots.
- The initial probe alone did not cover moving-shot geometry, purchases, full level reset, balance, chapter walkthroughs, or the website. See the subsequent verification results below.

Subsequent results are recorded in [the verification record](TOWER-DEFENSE-VERIFICATION.md). Supplemental generated chapter/reference projects were played in the real Scratch editor. The later continuation also completed Chapters 3-6 through visible controls, beginning with the UI-authored Chapter 2 save, and verified both the guided reference and a separately revised Level 3 extension after reopening. Generated fixtures remain supplemental evidence rather than authoring inputs.

The full-game repeated-click test found overlapping Next Level and Start Wave buttons could start the next wave immediately. Next Level now appears at x 0, y 0; Start Wave remains at x 90, y -155. Their maximum costume bounds are disjoint. The corrected transition passed the live test and has a curriculum regression check.

Screenshot inspection also found the pinned Scratchblocks build rendered custom argument blocks black. A scoped CSS rule now supplies the Scratch 3 argument fill/stroke, covered by a real-render visual assertion.

### Screenshot acceptance

At the user's request, capture and inspect the final Level 1 setup, firing, wave completion, fresh Level 2, win/loss screens, and save/reopen results. Also capture desktop and mobile curriculum pages with actual rendered Scratch blocks. Record paths alongside behavioral checks; screenshots supplement rather than replace runtime assertions. Keep failed development screenshots distinguishable from accepted release evidence.

Acceptance completed: the verification record links the clean UI-authored release screenshots and retains the older generated-reference images under their explicit labels. Read-only saved-graph comparisons caught an accidentally detached reporter that the short Chapter 4 runtime check missed; the corrected checkpoint was reverified before rebuilding Chapter 5. Both final UI-authored release files passed complete fresh-editor playthroughs.
