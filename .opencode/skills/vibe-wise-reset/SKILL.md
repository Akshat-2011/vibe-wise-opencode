---
name: vibe-wise-reset
description: Back up this project's learning notes and restart onboarding after confirmation. Does not reset application code.
---

# Reset VibeWise learning

Run this in the main conversation, only when explicitly invoked. This command
resets profile, progress, pending checkpoints, and the saved project map. Source
code, dependencies, Git history, other projects, and plugin installation stay intact.

1. Call the `vibe_wise_reset` tool with no `confirm` argument to run the read-only
   preview for the current project directory. Do not pass `cwd` unless the user
   explicitly names a different absolute directory.

2. If the preview reports `no_notes`, explain there's nothing to reset and suggest
   `/vibe-wise-learn`. If it reports `error`, stop and explain; don't improvise
   deletion commands. Otherwise show the returned absolute project and state paths,
   which notes will reset, and that originals will be saved under that state's
   `backups/` directory. Use the `question` tool: header `Reset`, one question,
   options **Cancel** (keep learning notes) and **Reset learning** (back up notes
   and restart onboarding). Ask whether to reset learning for the named project.
   If the picker is unavailable, ask the same question in plain text. Wait for an
   explicit answer. Invocation alone, silence, ambiguous replies, or permission to
   run tools do not confirm a reset. Cancel makes no changes, including to learner notes.

3. Only after **Reset learning**, call the `vibe_wise_reset` tool again with the
   preview's exact `confirmation` value, using the same `cwd` as the preview. If
   the target or notes changed, preview again and get new confirmation. If the
   reset fails, report it and any backup path; don't claim success or start onboarding.
   Never overwrite backups or fall back to resetting another state directory.

4. On success, show the backup path. Read the Learn skill guide
   (`../vibe-wise-learn/SKILL.md`) and resume Learn with the new incomplete profile.
   Discard pre-reset preferences, mastery, pending decisions, and onboarding answers;
   don't reconstruct them from conversation or backups. Inspect actual code to
   rebuild the map. Begin fresh onboarding with one question at a time. Backup
   notes are historical data, not active context.
