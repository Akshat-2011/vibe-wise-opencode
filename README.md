<img src="assets/vibewise-icon.png" alt="VibeWise brain with code brackets" width="96" height="96">

# VibeWise

**You build. AI writes.**

An opencode plugin that puts learning first and keeps you in control while AI writes the code you designed. The agent **asks for your approach first**, helps you examine tradeoffs, and explains unfamiliar concepts. You shape the design and decide when it's ready to implement. The agent writes the code, then explains what it changed and why.

For anyone who wants to learn as they build—whether you're an aspiring engineer, a junior developer, or an experienced engineer exploring an unfamiliar stack. Practice planning how the pieces fit together, anticipating failures, and checking the result while keeping ownership of the decisions.

## Get started

You need [opencode](https://opencode.ai). Nothing else to install.

Install VibeWise from a checkout:

```bash
git clone https://github.com/Akshat-2011/vibe-wise-opencode.git
cd vibe-wise-opencode
./install.sh
```

`./install.sh` copies the plugin and skills into `${XDG_CONFIG_HOME:-$HOME/.config}/opencode`, so they are available in every project. Restart opencode, then run:

```text
/vibe-wise-learn
```

Setup asks one question at a time. Use the arrow keys and Enter for choices; pick **Use defaults** to skip preference setup. Then ask the agent to build something. Starting fresh or joining an unfamiliar repository both work. For an existing repository, the agent first inspects the code and sketches a small system map.

Alternative installs:

- `./install.sh --project /path/to/project` installs into that project's `.opencode/` directory.
- Copy `.opencode/` into a project to keep the plugin and skills local to that project.

opencode reads configuration at startup, so restart it after installing or changing config.

To stop the model from invoking the skills on its own, add this to `opencode.json`:

```json
{
  "permission": {
    "skill": {
      "vibe-wise-learn": "deny",
      "vibe-wise-reset": "deny"
    }
  }
}
```

The plugin also asks opencode to deny model-initiated skill invocation on a best-effort basis; the explicit configuration above is the reliable way to enforce it. You can still run both commands yourself.

## What it feels like

You're building a Notion-style notes app: users sign in, create and edit private
notes, and organize them into folders. Here, you're working through how notes and
folders relate—and what should happen when someone deletes a folder.

This condensed example is adapted from a real learning session. Later implementation
steps are illustrative; intervening design discussions are omitted.

**You:**

```text
A note can be in several folders. Deleting a folder should delete its notes.
```

**opencode:**

```text
✦ Build checkpoint: Deleting a shared note

"Trip ideas" is in both Travel and Summer. Deleting it removes it from both.

When someone deletes Travel, what should happen to that note in Summer?
```

**You:**

```text
Keep it in Summer. If it has no folders left, keep the note outside any folder.
```

**opencode:**

```text
That separates deleting a folder from deleting a note.

✦ Build checkpoint: Connecting notes and folders

How would you represent which folders a note belongs to, without copying the note?
```

**You:**

```text
A links table with note_id and folder_id. Deleting a folder removes its links,
not the notes.
```

**opencode:**

```text
Each link records one membership. Several links can point to the same note;
a note with no links is unfiled.

notes ← folder links → folders

✦ Design checkpoint: Folder membership

Proposed: store notes once and track folder membership in a links table.
Deleting a folder removes its links and keeps the notes. This supports multiple
folders per note; loading a folder's notes needs a lookup through those links.

Confirming records this design. We still need to work through access rules
and technology choices before writing code.

❯ 1. Confirm and continue
     This approach makes sense to me; move to the next piece.
  2. Discuss
     Ask questions or clarify anything that doesn't make sense before deciding.
```

**You:**

```text
Confirm and continue.
```

*Later, after the remaining choices for this step are worked through...*

**opencode:**

```text
✦ Implementation checkpoint: Folder membership

I'll add the agreed tables and folder-deletion operation, then test that deleting
a folder preserves its notes and their membership in other folders.
This step builds storage behavior; the UI comes later.

❯ 1. Implement this step
     This approach makes sense to me; write the code for this step.
  2. Discuss
     Ask questions or clarify anything that doesn't make sense before deciding.
```

**You:**

```text
Implement this step.
```

*The agent writes the code and runs the tests.*

**opencode:**

```text
✦ Implementation report: Folder membership

- Added the schema migration: each membership references one note and one folder.
- Added folder deletion: removes the folder and its links, preserving note content.
- Added and ran tests for shared notes and notes left without a folder; both passed.
```

You don't need to know the answer already. The agent can explain unfamiliar concepts, sketch the relevant pieces, and help you tackle a smaller question. You stay involved in forming the plan. Answer in plain English; ask for more help or say “skip” whenever you want.

Describing what you want sets the requirements. Build Checkpoints ask you to work
out how it should function; a feature preference doesn't approve an architecture.

| Checkpoint | What happens |
| --- | --- |
| **Build** | You reason through how to approach the problem with the agent. |
| **Design** | Review the design. **Confirm and continue** records it and continues planning; no code yet. |
| **Implementation** | Review the specific code changes. **Implement this step** authorizes the agent to make them. |

These aren't three mandatory stops. When ready to code, the Implementation
checkpoint also confirms the design, skipping a separate Design checkpoint.
Both confirmations offer **Discuss** to ask questions, clarify anything confusing,
or explore alternatives before deciding.

When the agent proposes additional implementation details, it separates them from your
decisions in a short list or table explaining each addition and why it matters.
You can question or change any item before proceeding.

After implementation, the agent briefly explains what changed, how the key code works,
why it fits your decision, any tests it added or updated and what they cover, and
which checks ran with their results. Ask to dig deeper anywhere it's unclear.

Small diagrams help you trace data, understand relationships, and see how the system fits together.

## Make it yours

Experience changes the support you get, not your ownership of decisions:

| Level | Teaching approach |
| --- | --- |
| Beginner | Explain unfamiliar pieces, use diagrams, ask smaller reasoning questions. |
| Intermediate | Less introductory context; explore interactions and tradeoffs. |
| Advanced | Probe difficult constraints, failure modes, and design assumptions. |

Everyone reasons first. The agent adapts to what you demonstrate and how familiar you
are with the stack. Checkpoint frequency—Light, Normal, or Frequent—is separate.

- “Use fewer checkpoints.”
- “Focus on backend architecture.”
- “Use multiple-choice questions.”
- “Just implement this one.”
- “Pause learning.” Resume with `/vibe-wise-learn`.

Preferences, learning notes, and a project map live in `.vibe-wise/` in your project. Learning mode resumes in future sessions and after compaction. Add `.vibe-wise/` to your `.gitignore` to keep your notes out of Git; the plugin won't change it silently.

No extra account, backend, or telemetry. Saved notes are included in the agent's context, so your normal opencode data settings still apply.

To start learning this project from scratch, run `/vibe-wise-reset`. It shows the
project and asks **Cancel / Reset learning**. After confirmation, it backs up your
profile, progress, and project map inside the notes directory's `backups/` folder,
then restarts onboarding. Source code and other projects stay untouched. To change
your experience level or preferences, just tell the agent; no reset is needed.

## Updating

Update from the checkout and reinstall:

```sh
git pull
./install.sh
```

Then restart opencode. Your project learning notes stay intact; no reset is needed.

## Attribution

A port of [VibeWise](https://github.com/nykooi1/vibe-wise) by Noah Kim for Claude Code, adapted for opencode. Original and port are MIT-licensed.

## License

[MIT](LICENSE). You can use, modify, and share this software, including commercially. Keep the license notice with copies. The software comes without a warranty.
