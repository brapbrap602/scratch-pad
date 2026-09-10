---
name: scratch-curriculum-editor
description: Reviews and rewrites curriculum/*.json Scratch game lessons for preteen learners. Use when asked whether a curriculum reads well, makes sense, suits an age or experience level, needs simpler language, or should be adapted for another Scratch game.
---

# Scratch Curriculum Editor

Review both the teaching and the game. A lesson can read smoothly while teaching broken Scratch logic, or work correctly while overwhelming its learners.

Default to reviewing first and then editing. If the user explicitly asks only for feedback, findings, or a review, do not edit.

## Establish The Audience

Before judging difficulty, identify:

- Learner age range.
- Scratch experience.
- Whether the lesson is guided, classroom-led, or self-guided.
- Whether exact project names may change.

Use information already provided. Ask short questions only for decisions that materially change the rewrite. Never rename sprites, variables, messages, costumes, backdrops, or IDs without approval.

For preteens with about one year of Scratch, prefer **advanced beginner** unless the project is genuinely introductory. Simplify abstraction, not the challenge. Do not use childish language.

## Phase 1: Build Context

Read the complete target curriculum before editing. Also inspect:

- `schemas/lesson.schema.json` and `js/content.js` for the content contract.
- `js/narration-content.js` for narration splitting and inventory behavior.
- `curriculum/lessons.json` when adding or adapting a lesson into a new game.
- The closest sibling lesson under `curriculum/` for established structure.
- Lesson-specific tests under `tests/unit/`.
- Relevant E2E and visual tests if they select chapter or step titles.
- Audit documents and Scratch artifact verification tools when they cover the target game.

Check the worktree. Do not overwrite or revert unrelated changes. Before editing, capture the target curriculum's current working-copy IDs, exact project names, and `finishedCode` values in memory or a temporary artifact. Use this working-copy snapshot, not `HEAD`, as the preservation baseline because the user may already have uncommitted edits.

## Phase 2: Audit Before Editing

Review along both axes below. Report important findings before a substantial rewrite, unless the user asked for immediate editing.

### Scratch Logic

Trace the finished game from green flag to win or loss. Check:

- Reset order and repeated green-flag starts.
- Clone creation, clone-only scripts, and `For this sprite only` values.
- `broadcast` versus `broadcast and wait`.
- Loops that must finish versus loops that intentionally run forever.
- Shared variable ownership and movement formulas.
- Costume dimensions, coordinate ranges, movement steps, and collision geometry.
- Active variables or equivalent flags, scoring, damage, and ordering that prevents duplicate hits.
- Win/loss races and whether state changes before ending broadcasts.
- Cleanup before `stop all`.
- Whether checkpoint claims match behavior available in that chapter.

Do the arithmetic. For geometry, compare sprite centers, half-sizes, spacing, and movement steps rather than trusting phrases such as “below,” “safe,” or “cannot skip.”

Do not guess about Scratch scheduling or clone behavior. Use existing tests, audit artifacts, Scratch documentation, or a focused live test when correctness depends on it.

### Learner Language

Look for:

- Software-engineering jargon introduced before a concrete example.
- Blockly implementation terms instead of visible Scratch language.
- Metaphors that hide the actual block behavior.
- Long instructions containing several separate actions.
- Formal verbs where a common word is equally precise.
- Pronouns with unclear referents.
- Terms used inconsistently.
- Checkpoints that say “inspect” or “verify” without an observable result.
- Vocabulary that is defined but not useful to completing the project.
- Audience or difficulty claims that do not match the project.

Prioritize correctness problems, then confusing instructions, then tone and polish.

## Language Standard

Keep Scratch-native language:

- Sprite, Stage, clone, costume, backdrop.
- Variable, broadcast, message, script.
- Coordinates, x position, y position.
- Condition, loop, `and`, `or`, `not`.
- Exact block text and visible category or menu names.

Prefer Scratch's exact variable choices, `For all sprites` and `For this sprite only`. A plain term such as “shared variable” or “sprite-only variable” may be introduced after showing the exact Scratch label.

When these concepts appear in the target lesson, teach them concretely:

- **Game state:** name the actual values and what scripts check before acting.
- **Active variable:** explain what 0 and 1 mean for that sprite.
- **Collision:** connect it to the visible `touching [sprite]?` block.
- **Grouped conditions:** explain why another `or` or `and` goes inside the first one.
- **Ordering:** say which variable changes first and what another script will see.

Use these replacement patterns:

| Avoid | Prefer |
| --- | --- |
| singleton | one reusable sprite with no clones |
| guard | name the exact check and what repeat it prevents |
| finite script | a script that finishes; a script with no `forever` loop |
| terminal case | ending; way to win or lose |
| owner or ownership | name the sprite and its job |
| conductor or conducts | name the sprite that controls or moves the group |
| single source of truth | only this script changes these variables |
| factory | name the original sprite and say that it creates the clones |
| clone identity or address | name the values each clone remembers |
| claim the result | mark the game as ended before another ending starts |
| deactivate | name the actual flag and set it to its inactive value |
| architecture audit | code organization check |
| playtest matrix | playtest checklist |
| cumulative reference | complete code so far |
| reporter | name the exact `+`, `=`, `or`, or other operator block |
| Boolean tree | connected group of `and`, `or`, and `not` blocks |
| hat or cap block | use the exact event or control block name |
| sibling checks | separate `if` blocks at the same level |
| workspace | Code area |
| dropdown | menu |
| ceases | stops |
| increment | change by 1 |
| recomputes | works out again |
| permits | allows |
| inspect or verify | check, followed by the visible expected result |

Reserve **monitor** for a visible variable display on the Stage. Call code that repeatedly checks a value a “checking script.” Apply replacement examples only when the target lesson uses the concept; never introduce an Active variable, fleet, row-column model, or other Space Invaders pattern into a different game.

When a numeric variable is named `Stage`, distinguish it consistently:

- “the Stage” means Scratch's Stage.
- “the `Stage` variable” means the number stored in the variable.
- Use “phase 1,” “phase 2,” and “phase 3,” not “Stage 1,” “Stage 2,” and “Stage 3.”

## Rewrite Rules

- Put the action first and the reason second.
- Prefer one main action per instruction. Split entries when learners must stop and manipulate a different block or sprite.
- Keep explanations short and concrete. Use multiple sentences rather than one sentence with several clauses.
- State what the learner should see after a test.
- Use exact names and backticks consistently.
- During a prose-only rewrite, keep exact counts, coordinates, formulas, dimensions, ordering, and score values.
- Keep grouped conditions explicit when grouping changes behavior.
- Explain concurrency through visible effects: “Set this variable first so another script sees that the hit was handled.”
- When clones need separate values, explain why the variable uses `For this sprite only`; do not merely call the value local or private.
- When a lesson uses an Active variable, do not describe it as a visibility flag. `show`/`hide` and Active have separate jobs.
- Do not blur `broadcast` and `broadcast and wait` into the same instruction.
- Do not say broadcasts make scripts run literally simultaneously.
- Do not replace collision-safe geometry with vague advice to make costumes small.
- Do not remove changes that must occur before `delete this clone`.

For a prose-only rewrite, preserve every `finishedCode[].code` string byte-for-byte against the working-copy snapshot captured before editing. Preserve chapter and step IDs because stored learner progress may depend on them. Treat `finishedCode[].target` labels as potential test or UI lookup keys; search before changing them.

If the user approves a logic correction, change only the values or code required for that correction. Update the explanation, instructions, checkpoints, finished code, and tests together so they continue to describe one game. Do not let prose-preservation rules block an approved correctness fix.

## Update Contracts

After splitting or renaming learner-facing content, update only affected contracts:

- Narration section, sentence, and unique-speech inventory snapshots.
- Lesson-specific prose contracts.
- E2E and visual selectors that use changed titles.
- Checked-in audit documentation that records old inventory totals.
- `curriculum/lessons.json` when a new game should appear in the application.

Tests must protect behavior without forcing jargon or overloaded sentences back into the lesson.

For multi-step instructions, assert ordered per-entry patterns. Do not use one greedy regular expression across the entire joined instruction list merely to make a split rewrite pass. A useful test helper finds each expected instruction after the previous matching instruction.

## Verification

Use the narrowest checks first, then the full checks available in the repository:

1. Parse the edited JSON and run `git diff --check`.
2. Compare all `finishedCode[].code` strings with the pre-edit working-copy snapshot when the task is prose-only.
3. Run the target lesson's unit test.
4. Run `npm run validate:content`.
5. Run `npm run test:unit`.
6. Run `npm test` for validation, unit, and browser coverage.
7. Run `npm run test:visual` when titles, instruction structure, or rendered content changed.
8. Run `node tools/verify-scratch-audit-hashes.mjs` when audit artifacts exist for the game.
9. Review the final diff once for Scratch correctness and once against the audience requirement.

The normal and visual Playwright configurations both use port `4173`. Never run `npm test` or `npm run test:e2e` concurrently with `npm run test:visual`; one web server can interrupt the other and produce misleading connection-refused failures.

If narration audio manifests exist, report that changed prose makes existing narration stale and run the repository's audio check. Do not regenerate audio unless requested.

Do not commit unless the user explicitly asks.

## Completion Report

State:

- Which curriculum was reviewed or rewritten.
- The audience used for the decisions.
- The main language and logic improvements.
- Whether IDs, names, and `finishedCode` were preserved.
- Which validation, unit, browser, visual, and artifact checks passed.
- Any remaining technical terms and why they were retained.
