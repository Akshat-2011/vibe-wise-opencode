# Development

V1 uses opencode skills, Markdown instructions, and one JavaScript plugin with a
small read-only restoration hook and a confirmed learning-reset tool. There are no
packages to install. You need [opencode](https://opencode.ai) to use the plugin, and
Node 20+ only to run the tests.

The two skills auto-register as flat slash commands, `/vibe-wise-learn` and
`/vibe-wise-reset`; opencode appends each skill's base directory so the guides can
reference sibling files. Restoration is an `experimental.chat.system.transform`
injection that runs once per session and is re-armed by `session.compacted`. Reset
is the `vibe_wise_reset` custom tool: a read-only preview, then a confirmed backup
and reset. The plugin's `config` hook denies model-initiated skill invocation on a
best-effort basis; the README documents the explicit `permission.skill` configuration.

## Local checks

```sh
node --test
sh -n install.sh
node --check .opencode/plugins/vibe-wise.js
git diff --check
```

The tests execute the plugin hooks with real event objects in temporary projects.
They cover activation, restoration, partial onboarding, paused mode, subdirectories,
repository/worktree boundaries, missing/invalid files, symlinks, constant-size
restoration instructions as notes grow, and read-only behavior. They do not prove
that the agent follows the instructions or teaches well. Rename coverage verifies
that `.sensible-vibes/` notes restore without migration, `.vibe-wise/` takes
precedence at the same location, and legacy lookup preserves repository boundaries,
nearest-state selection, and symlink rejection. Reset tests cover read-only preview,
confirmed backup/reset, stale confirmation, legacy and partial notes, nested
projects, repeated backups, rejected symlinks, backup/write failures, and restoring
incomplete onboarding after reset. Installer tests cover global and project installs,
clean uninstall, and reinstall overwrites. Skill tests check frontmatter, companion
guide references, and that Reset drives the tool and question confirmation.

## Conversation smoke tests

Use an authenticated opencode session and temporary copies of projects. Run opencode
in a checkout of this repository (opencode loads `.opencode/` automatically), or
after `./install.sh` in any project.

For a manual walkthrough based on the playground notes app, see the
[Notion-style demo](demos/notion-dupe.md).

1. **Fresh project:** Run `/vibe-wise-learn`. Choose a new project, describe
   a small CLI, and accept preference defaults. Check that all three state files
   are created, the map separates proposed from implemented components, and no
   understanding is marked demonstrated without evidence. Choice questions must
   use the `question` tool with one question per screen; no questionnaire dump or
   failed shell check for a missing state directory.
2. **Existing unfamiliar repository:** Use a separate copy of a real repository.
   Choose the existing-repository flow. Confirm the agent reads actual entry points
   and configuration, gives an accurate short map before familiarity questions,
   asks whole-system versus focused scope, and doesn't invent a frontend/database.
3. **Checkpoint → implementation:** Ask for a meaningful feature, such as durable
   storage or retrying an external request. Confirm the agent asks one reasoning
   question under a title naming the decision, before suggesting its own solution
   or implementing the decision. Give a partial answer; check that
   it refines the answer, names the coding scope in an Implementation checkpoint,
   and offers Implement this step /
   Discuss. Select Discuss,
   ask for clarification or propose an alternative, and confirm it stays
   paused and updates the approach if needed. Select Implement this step;
   check it writes the code and records only evidenced learning. Restart while a
   confirmation is pending and confirm it preserves that pause.
4. **Skip and adaptation:** Say “I'm completely lost.” Confirm the agent explains
   the relevant pieces and returns one manageable reasoning step, without dumping
   a complete plan or repeatedly demanding guesses. Ask for an explanation or say “skip”; it should
   explain and proceed to a Design checkpoint without demanding another attempt. “Just
   implement it” should proceed. Make a trivial edit and confirm no checkpoint. After demonstrating
   a concept, check that later questions address new decisions rather than repeat it.
5. **Lifecycle:** Restart, resume (`/sessions`), start a new session (`/new` or
   `/clear`), and compact (`/compact`). Confirm preferences,
   the map, and mastered concepts survive without repeated onboarding. Pause
   learning, restart, and confirm it stays paused; invoke Learn to resume.
6. **Guided foundations:** With a beginner profile and a new project, check that
   essential capabilities are established and preserved when selecting a platform;
   stack, storage, and deployment must remain visible open decisions. Ask what an
   unfamiliar term means while answering a checkpoint. The agent should explain it
   and return to a manageable reasoning step, not bundle new architecture choices
   into an implementation approval. Use different projects to avoid overfitting.
   When labeling an explanation, use Concept for what something is or how it works,
   and Why this matters for its practical relevance to the project. Neither callout
   should introduce a mandatory quiz or confirmation, or require the other callout.
   A design-only Design checkpoint should offer Confirm and continue / Discuss. Confirming
   it records the choice and continues to unresolved decisions without writing
   application code. An Implementation checkpoint must name a concrete coding scope.
   When ready to code, it also confirms the design; don't require a separate
   Design checkpoint first. Several Build checkpoints may lead to one confirmation.
   Option descriptions should invite clarification and express readiness to proceed;
   choosing confirmation alone must not be recorded as demonstrated understanding.
   If the agent proposes additional implementation details, check that a concise list
   or Detail / Proposal / Why it matters table distinguishes them from learner
   decisions. Selecting Discuss should allow questions about individual items;
   unresolved consequential design choices still require learner reasoning.
7. **Preference versus reasoning:** Answer a checkpoint with a tentative preference
   and no rationale. The agent should ask one focused question about implications or
   tradeoffs, not invent the learner's reasoning, praise mastery, or immediately
   present confirmation buttons. Verify that this holds across different projects.
8. **Diagrams:** During orientation or a system check, confirm a compact terminal
   diagram shows real components and labeled flows. Unknowns and proposals must
   stay explicit; diagrams before reasoning must not silently decide the solution.
   All checkpoints use a divider, bold title, and blank lines around normal prose,
   rendered directly without cards, tables, or code fences. Questions may be detailed;
   don't force a short length or fixed width. Tables remain useful for comparisons
   and proposed additions. Every title keeps one leading `✦`
   and its full label in sentence case, followed by a colon, without emojis
   (for example, `✦ Build checkpoint: <description>`). Use the `question` tool for
   onboarding and confirmations, with no trailing paragraphs obscuring the response point.
   Reasoning questions should be open-ended in chat, not through the `question` tool.
9. **Clarification without steering:** Ask about an unfamiliar concept mid-decision.
   The agent should clarify it, correct any misleading framing, and return to one
   question about the project's requirements or constraints. It should not replace
   reasoning with a solution menu, bundle independent choices, or steer toward an
   architecture because it offers more learning opportunities.
10. **Learning first:** With default preferences, make an ordinary build request.
    Before any recommendation, solution menu, revealing diagram, dependency install,
    or application scaffold, the agent must ask for the learner's approach and wait.
    Answer, then check that refinement doesn't silently decide the next problem.
    Test unfamiliar concepts with neutral background, and familiar concepts with
    a new tradeoff: neither should remove the learner's turn to reason. Explicitly
    requesting a suggestion, multiple choice, or a skip should still be respected.

11. **Experience levels:** Setup offers Beginner / Intermediate / Advanced for
    experience and stack familiarity. Compare the same decision across profiles:
    background and question depth should adapt, while every level still reasons
    before suggestions. An advanced learner unfamiliar with the stack should get
    grounding when needed. Existing Some experience / Comfortable profiles should
    resume with intermediate guidance, without rewriting history or re-onboarding.
    Experience must not change the saved checkpoint frequency.

12. **Evaluation and concise confirmation:** Give a confident but flawed proposal;
    the agent should name the violated constraint rather than praise confidence.
    Give a sound proposal; it should explain why and combine feedback with a concise
    Design checkpoint, without redundant questions. Compare two viable approaches:
    tradeoffs should be tied to the project, not a claim of one correct answer.
    The checkpoint describes a proposal until confirmed and must not invent an
    unresolved issue. No code should be written before implementation approval.

13. **Reset:** In a temporary project with saved learning notes, invoke
    `/vibe-wise-reset`. Confirm it shows the absolute project and state paths and
    asks Cancel / Reset learning. Cancel must leave all files unchanged. Invoke
    again and confirm: original notes must exist in the reported backup, the
    active profile must be incomplete, and onboarding must ask fresh questions
    rather than reuse old preferences. Repeat with legacy notes and after restart.
    If notes change during confirmation, the agent must preview and confirm again.

14. **Requirements versus design:** Give a product requirement without proposing
    a mechanism. The agent should record the requirement, then invite a concrete
    design attempt before offering a solution or confirmation. It must not count
    the requirement as demonstrated engineering understanding. Combine a near-term
    single-user pilot with future public availability; the agent should preserve both
    rather than invent a contradiction or choose the storage layout itself. Ask
    for grounding: the response should clarify concepts and return an open design
    step, not give the complete design and quiz the learner on recalling it.
    Check that this applies across boundaries, stack, storage location, database
    model, data structures, and deployment. Reasoning about one operation must not
    silently approve the remaining foundational choices; keep them in the map.
    Ask for a model of components, entities, relationships, and flows. Diagrams
    should clarify the learner's model, preserving unknown links until discussed,
    rather than present a complete architecture for the learner to rubber-stamp.
    After clarifying desired behavior and edge cases, check the handoff to technical
    design: the agent must invite the learner's representation before supplying its
    own structure, including through an explanatory diagram.
15. **Implementation report:** After an approved step, the agent should explain the
    changed files, important code mechanics, connection to the learner's design,
    any tests added or updated and what they cover, and actual verification results.
    Distinguish tests written from checks run; unrun checks must be explicit.
    Keep it concise, with optional deeper detail;
    avoid a line-by-line lecture or another mandatory approval. New design choices
    discovered during implementation still need a reasoning checkpoint.
    Feedback should be factual and specific, with no personal praise, hype, or
    congratulatory filler. Corrections should be direct without belittling.
16. **Coherent reasoning and faithful confirmation:** Offer a rough component list
    before the overall flow is understood. The agent should invite the learner to
    connect responsibilities and flows rather than immediately start a chain of
    implementation-detail questions. When the learner is stuck, explain the missing
    concept directly and return to a meaningful decision, without hints that funnel
    them toward a predetermined answer. Confirm a narrowly worded proposal, then
    inspect the notes: unmentioned fields, lifecycle behavior, alternatives, and
    rationale must remain unresolved, not appear as agreed design or learner reasoning.

Do not commit `.vibe-wise/` or test transcripts. The plugin recommends an
ignore rule during onboarding, but changes `.gitignore` only after telling the
user and receiving their instruction to make the edit.

## Design and official references

Verified against current first-party documentation on 2026-10-06:

- [Plugins](https://opencode.ai/docs/plugins/): plugin modules under
  `.opencode/plugins/` export hooks. VibeWise uses the `config` hook to deny
  model-initiated skill invocation, `experimental.chat.system.transform` to inject
  restoration context, and a `tool` export for `vibe_wise_reset`.
- [Skills](https://opencode.ai/docs/skills/): `SKILL.md` files under
  `.opencode/skills/<name>/` auto-register as slash commands. The command is flat
  (`/vibe-wise-learn`), with no namespace, and opencode appends the skill's base
  directory to the included instructions. Explicit invocation starts onboarding;
  the transform restores behavior in later sessions only where a learner profile
  already exists.
- [Commands](https://opencode.ai/docs/commands/): custom commands live in
  `.opencode/commands/` or the config; skills register alongside them with flat
  names. Built-in `/compact` and `/new` (alias `/clear`) drive the lifecycle checks.
- [Config](https://opencode.ai/docs/config/): `permission.skill` rules and startup
  loading. The plugin returns the same deny rule from its `config` hook, but the
  explicit `opencode.json` snippet in the README is the enforcement users can rely on.

Restoration injects a small instruction message pointing to the Learn guide and
the selected state directory. It runs once per session and `session.compacted`
re-arms it, so no PreCompact equivalent is needed: save notes at meaningful events
and restore them through the transform. Unsaved reasoning can still be lost if a
session ends before the agent writes it; the plugin doesn't infer progress from
transcripts. State writes are performed by the agent using normal permissions, so
denied writes should be reported rather than called saved.

Keep V1 local and terminal-native. No backend, analytics, accounts, separate LLM
calls, scoring engine, or custom UI. Saved context is processed by opencode
under the user's existing data settings.

## Port verification

At commit e613995, all 40 automated tests pass with `node --test`; `sh -n install.sh`,
`node --check .opencode/plugins/vibe-wise.js`, and `git diff --check` are clean.
The tests execute the plugin hooks with real event objects and cover restoration,
reset, installer, skills, and state behavior. They do not prove teaching quality.
The 16 interactive smoke tests above are still pending: they have not yet been run
end to end in a live opencode session.
