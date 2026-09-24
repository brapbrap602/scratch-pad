# Tower Defense curriculum plan

Status: approved and implemented. Real-editor gameplay, Chapters 1-6 visible-UI construction, saved-file replay, and release screenshots are verified; see [the verification record](TOWER-DEFENSE-VERIFICATION.md). Learner pacing has not been measured in a preteen study.

## Goal and audience

Create a third Scratch course for advanced-beginner preteens. Teach a complete first level, demonstrate a small second level using the same scripts, then invite students to design another level themselves.

## The game

- Three straight lanes, with two fixed build spots beside each lane.
- One indestructible tower type and one enemy type. Enemies pass towers toward the base.
- Click an empty spot to spend coins on a tower, before or during combat. No upgrades.
- Each tower has at most one shot in flight. Defeated enemies earn coins; escaped enemies reduce base health.
- Click Start Wave for every wave. Between waves, retain towers, coins, and remaining health.
- After completing Level 1, click Next Level for an empty battlefield and fresh starting resources.
- Completing the supplied Level 2 wins. The green flag restarts the game.

## Teaching sequence

1. Move one enemy and damage the base.
2. Buy one tower.
3. Launch, move, miss, and reuse one shot; introduce two small lists and damage gradually.
4. Reuse that behavior across six tower spots using clones and useful My Blocks.
5. Complete Level 1 with manually started waves and endings.
6. Make a small Level 2 by changing settings, then undertake an independent level-design challenge.

The Stage's `Load level settings` and `Load wave settings` blocks make level design approachable. Students reuse building, movement, and shooting rather than copying the whole game's code. Each change to an earlier script explicitly says what to keep, replace, or delete.

## Provisional balance

| Setting | Level 1 | Level 2 |
| --- | --- | --- |
| Enemies in successive waves | 3, 3, 6 | 6, 6 |
| Starting coins | 90 | 90 |
| Base health | 5 | 5 |
| Tower cost | 30 | 30 |
| Reward per defeated enemy | 10 | 10 |
| Hits to defeat an enemy | 2 | 2 |

These values passed scripted real-editor playthroughs of both the generated reference and the UI-authored release. Difficulty for actual learners remains provisional. Level 2 also slightly reduces the delay between enemies.

## Independent challenge

Students predict the effect of a settings change, add a level, playtest, explain what happened, and revise it. They receive ideas and a checklist rather than a complete prescribed solution.

## Verification and scope

Verify both the course website and the real Scratch project. Prove collision handling and fresh-level resets before writing the full walkthrough. Build each chapter from the preceding saved checkpoint, save/reopen it, and play through the finished game using production settings.

Reuse the existing website. Free placement, upgrades, extra tower types, new app UI, and generated narration are outside this first delivery.

See [the developer plan](TOWER-DEFENSE-DEVELOPER-PLAN.md) for contracts, implementation slices, and verification gates.
