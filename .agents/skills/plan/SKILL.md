---
name: plan
description: Use when the user asks to plan, scope, thoroughly QA, redesign, or create an implementation roadmap for a repository before or alongside coding. Produces evidence-based, decision-complete plans with acceptance criteria, TDD sequencing, and local verification.
---

# Plan

Create plans from repository evidence, not assumptions. A useful plan should leave implementation decisions settled, expose genuine product choices, and define how correctness will be demonstrated.

## Core Rules

1. Inspect before recommending.
2. Separate observed facts from proposed changes.
3. Trace complete behavior, not isolated files.
4. Find root causes and sequencing dependencies.
5. Ask only questions that materially change scope or architecture.
6. Prefer the smallest robust design over framework or tooling expansion.
7. Define observable acceptance criteria before implementation.
8. Include local verification appropriate to the product.
9. Respect explicit exclusions such as no CI, no migration, or no build change.
10. Do not silently turn planning into implementation unless the user asks to proceed.
11. Treat planning as an iterative conversation: QA findings, user decisions, and adversarial review should reshape the plan before code is written.

## Workflow

### 1. Establish Repository Facts

Inspect the repository broadly enough to answer:

- What does the product do?
- What are its entry points and main control flows?
- Which files own behavior, content, configuration, persistence, and deployment?
- What technologies and external services are used?
- What tests and quality gates already exist?
- What is the current Git state?
- Which constraints are architectural and which are accidental?

Use concrete file paths and line references. Do not infer a backend, build system, framework, or compatibility requirement that is not present.

### 2. Run Parallel QA When Scope Is Broad

Delegate independent review dimensions in parallel when useful:

- Runtime correctness and security
- Product behavior and data model
- Domain or content correctness
- Accessibility and responsive behavior
- Testing and tooling strategy
- Deployment and dependency risk

Give each reviewer a precise read-only scope and request:

- Severity
- Reproduction scenario
- Exact references
- Smallest robust remediation
- Release-blocking status
- Acceptance criteria
- Dependencies on other fixes

Do not duplicate delegated work. Reconcile the findings afterward.

### 3. Challenge Initial Recommendations

Treat the first recommendation list as a hypothesis. Look for:

- Incorrect priority ordering
- Hidden release blockers
- Product claims that exceed delivered behavior
- Fixes that create migrations or public contracts
- Tests that can pass while behavior remains broken
- Architecture that is technically correct but too difficult for its audience
- Scope traps and unnecessary modernization

Explicitly state when QA changes the plan.

### 4. Iterate Through QA and Decisions

Do not force a complex plan into one research pass followed by one final answer. Use an explicit feedback loop:

1. Run an initial QA pass against the repository.
2. Summarize discoveries that materially change priorities or scope.
3. Ask the user to decide genuine product or engineering tradeoffs.
4. Feed those decisions into a narrower follow-up QA pass.
5. Present concrete examples when the user needs to compare formats or behaviors.
6. Ask follow-up questions when an answer reveals a new tradeoff.
7. Repeat until the important choices are settled and internally consistent.

Examples of useful back-and-forth:

- QA discovers that "fix the extensions" could mean complete them, remove them, or reduce product claims; ask which outcome the user wants.
- The user chooses complete extensions; run another QA pass to determine whether the current architecture and lesson structure can support that choice.
- The user asks about two content formats; show representative examples and compare their concrete costs before asking for a decision.
- Visual QA reveals poor mobile navigation; discuss whether to collapse navigation, redesign it, or defer mobile support before changing the plan.

Each QA round should answer a more focused question than the previous round. Do not repeatedly ask the same reviewer to perform an undirected full-repository audit.

Maintain a compact decision record during this loop:

- Decision
- Chosen option
- Reason
- Consequences
- Explicitly rejected alternatives

Use the record to prevent later recommendations from contradicting settled choices.

### 5. Resolve Product Decisions

Ask concise, choice-based questions only when answers alter implementation. Typical examples:

- Complete behavior versus reduced product claims
- Backward compatibility versus a fresh model
- Core versus advanced scope
- Standalone versus sequential learning paths
- Build/tooling depth
- Content representation
- Browser/device targets
- Local-only testing versus CI

Recommend one option first and explain each option's consequence. Record settled choices and do not reintroduce rejected alternatives later.

### 6. Design the Smallest Correct Architecture

Prefer designs that reduce state, concurrency, duplication, and special cases.

Evaluate alternatives on:

- Correctness
- Cognitive and maintenance cost
- Runtime complexity
- Compatibility with the existing stack
- Testability
- User or learner experience
- Fidelity to product goals

When a simpler product rule eliminates fragile machinery, present that tradeoff clearly. Do not add backward-compatibility code without a concrete need.

### 7. Define Contracts Before Tasks

Specify the contracts implementation will rely on:

- Data schema and stable identifiers
- State and persistence semantics
- Loading, error, and race behavior
- Security boundaries and trusted content
- Accessibility semantics
- Mobile behavior
- External dependency behavior
- Completion or success semantics

For content-driven systems, distinguish plain text, constrained rich text, code, labels, and URLs. Define validation and rendering behavior for each.

### 8. Build Acceptance Criteria

Acceptance criteria must be observable and resistant to loopholes.

Avoid weak criteria such as:

- JSON parses
- Page loads
- Tests pass
- Finished code exists
- No console error in one happy path

Prefer criteria such as:

- One collision changes exactly one target and one counter.
- Opening a step does not mark it complete.
- The newest request always wins an out-of-order response race.
- Every real content item renders independently.
- Keyboard focus moves to the newly displayed heading.
- At 320px width, the selected content is in the viewport and the document does not overflow horizontally.
- Corrupt or unavailable storage never blocks use.

Include negative, boundary, restart, repeated-use, and failure-path cases.

### 9. Run an Adversarial Pre-Implementation Review

Before implementation begins, launch a read-only adversarial subagent to red-team the current plan. This review is mandatory for substantial plans.

The adversarial prompt should include:

- Repository path and relevant evidence
- The proposed architecture and phase order
- Every settled user decision
- Explicit non-goals and constraints
- Acceptance criteria
- Expected testing approach

Ask the adversarial reviewer to find:

- Hidden races and lifecycle failures
- Incorrect assumptions about frameworks, APIs, browsers, or domain behavior
- Security and trust-boundary gaps
- Accessibility and mobile omissions
- Migration or compatibility consequences
- Scope traps and overengineering
- Acceptance criteria that could pass while the product remains broken
- Unsafe phase ordering
- Missing rollback boundaries
- Places where the plan contradicts a settled user decision

Request findings ordered by severity, with concrete reproduction scenarios and the smallest corrective changes.

After the adversarial review:

1. Summarize its strongest objections for the user.
2. Distinguish blockers from optional improvements.
3. Explain how the objections change the proposed plan.
4. Ask the user about any newly exposed product choices.
5. Run a focused follow-up review if the user changes direction.
6. Present the revised decision-complete plan.
7. Pause for discussion or explicit approval before implementation.

Do not treat the adversarial reviewer as automatically correct. Reconcile its findings with repository evidence and the user's priorities. Do not silently incorporate product-changing recommendations without discussing them.

For small, straightforward changes, state that adversarial review would add no value and skip it. Do not launch a subagent merely to satisfy ceremony.

### 10. Sequence Work for Red-Green TDD

When implementation will follow, structure phases as red-green slices:

1. Write a failing contract test.
2. Confirm it fails for the intended reason.
3. Implement the smallest production change.
4. Run the focused test to green.
5. Refactor only after green.
6. Run broader regression tests.
7. Perform a post-implementation review and add tests for discovered gaps.

Good phase boundaries are independently reviewable and reversible. Avoid mixing content rewrites, migrations, runtime refactors, tooling, and deployment into one change when they can be separated.

### 11. Plan Local Verification

Choose verification that matches the repository and user constraints.

For browser applications, local Playwright QA should usually include:

- Real navigation and input
- All meaningful content paths
- Keyboard and focus behavior
- Accessibility scans
- Mobile and desktop viewports
- Request race simulation
- Storage corruption/failure
- External dependency stubs for deterministic tests
- A separate live-dependency smoke test when relevant
- Screenshots that are inspected, not merely generated

Keep generated reports and screenshots ignored unless the user explicitly wants golden files committed.

Do not add CI when the user asks for local-only testing. Do not equate CI with test quality.

### 12. State Deferrals and Residual Risk

End the plan with explicit deferrals, such as:

- Legacy migration
- URL routing
- Dependency self-hosting
- CSP hardening
- Licensing
- Deployment changes
- Additional browser engines
- Downloadable artifacts

For every deferral, state whether it is safe, why it is deferred, and what would trigger revisiting it.

## Plan Output Format

Use this structure when the task is substantial:

### Outcome

One paragraph describing the target end state.

### Repository Facts

Concise evidence with paths and references.

### Decisions

A table of settled choices, rationale, consequences, and rejected alternatives. Include decisions reached through QA/user discussion rather than presenting them as foregone conclusions.

### Adversarial Review

Summarize the pre-implementation red-team findings, which objections changed the plan, which were declined, and any questions still requiring user discussion.

### Architecture

Describe the data, control flow, persistence, rendering, and trust boundaries.

### Phases

For each phase include:

- Goal
- Files likely changed
- Red test
- Minimum green implementation
- Exit criteria
- Dependencies

### Acceptance Tests

List concrete functional, failure, accessibility, mobile, and domain tests.

### Local Commands

List exact development and verification commands when known.

### Deferred Work

List explicit non-goals and residual risks.

## Planning Quality Check

Before presenting the plan, verify:

- Every recommendation maps to observed evidence.
- Release blockers are distinguished from improvements.
- Product decisions are settled or clearly asked.
- The plan records how QA findings and user choices changed the direction.
- A substantial plan received an adversarial review before implementation.
- Adversarial objections were discussed rather than silently accepted.
- Data migrations are included only when needed.
- Phases follow dependency order.
- Tests can fail for the defects they claim to cover.
- Browser plans include real navigation and visual inspection when appropriate.
- Accessibility and mobile behavior have observable exit criteria.
- The plan honors local-only, no-CI, no-build, or other explicit constraints.
- Deferred work is visible rather than silently omitted.

## Anti-Patterns

Do not:

- Produce a generic checklist before inspecting the code.
- Treat planning as a one-shot handoff when unresolved decisions need discussion.
- Launch implementation immediately after adversarial review without giving the user a chance to discuss the revised plan.
- Recommend a framework rewrite for a small application without evidence.
- Treat content syntax validation as domain correctness.
- Use a sanitizer or security header as a substitute for safe DOM construction.
- Mark viewed content as completed without an explicit product decision.
- Depend on fixed delays where deterministic sequencing is available.
- Test only mocks without traversing real repository content.
- Generate screenshots without examining them.
- Add CI, deployment, migration, licensing, or compatibility work after the user excluded it.
- Hide uncertainty behind vague phrases such as "add tests" or "improve accessibility."

## Transition to Implementation

When the user approves the plan:

1. Confirm the adversarial review and resulting decisions are reflected in the final plan.
2. Obtain explicit approval to proceed when the conversation has been planning-only.
3. Convert phases into a tracked task list.
4. Start with the highest-risk contract test.
5. Preserve explicit non-goals.
6. Report meaningful discoveries, not routine tool activity.
7. Continue through implementation, local verification, visual inspection, and final results.
