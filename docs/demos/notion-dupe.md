# Notion-style notes app demo

A manual walkthrough adapted from the playground conversation: define the scope,
explore folder deletion, propose data relationships, and discuss sign-in. Responses
are paraphrased examples; the agent's wording and question order will vary.

## Start a fresh recording

Install VibeWise using the README instructions. Open a new, empty folder in your
terminal and start `opencode`, then enter `/vibe-wise-learn`. Choose **New project**,
describe a Notion-style notes app, choose **Beginner**, then **Use defaults**.
Stack familiarity can wait until you choose a stack. No `git init` is needed.

Use these responses when the relevant question comes up. Follow the actual
conversation rather than pasting the entire script. Ask for clarification whenever
something is unclear.

| Moment | Learner input | What to look for |
| :--- | :--- | :--- |
| Scope | “Sign in, create/read/edit/delete private notes, and organize them in folders.” | Requirements get clarified without choosing a stack. |
| Folder behavior | “A note can be in several folders. Folders can't contain folders. Deleting a folder should delete its notes.” | A concrete example reveals that a shared note could disappear from another folder too. |
| Revise the rule | “Keep it in any other folders. If none are left, leave it outside every folder.” | Your revision changes the requirements. The agent leaves the representation for you to propose. |
| Main flow | “The browser sends the note to our backend, which checks who I am and saves it in a database. Later it loads my notes.” | Feedback examines responsibilities and gaps in your proposal. |
| Privacy | “Send a session key. The backend checks it, then checks the note's owner against that user. Browser-only checks could be bypassed.” | Reasoning is evaluated before confirming the access design. |
| Data model | “Use a links table with note_id and folder_id. Deleting a folder removes link rows, not notes.” | The agent evaluates your relationship model instead of supplying it first. |
| Sign-in | “We should store a hashed password, not the password itself.” | Missing concepts are explained; additional details remain labeled as proposals. |
| Discuss an addition | Select **Discuss**: “What is a salt, and why does it help?” | The agent explains and keeps implementation paused. |
| Zoom out | “Can we trace the whole design so far?” | A system diagram distinguishes your choices from open questions. |

Choose **Confirm and continue** when the design makes sense to you; this records
it without authorizing code. Once the remaining choices for a concrete step are
resolved, choose **Implement this step**. Expect a report explaining changes,
reasoning, tests written, and checks actually run.

For another take, use another empty folder. `/vibe-wise-reset` resets learning
notes but keeps application code, so it isn't a clean-project reset.

## What to check

- The agent asks for your approach before supplying a design.
- Your reasoning changes the proposal, rather than merely confirming the agent's plan.
- Unfamiliar concepts get direct explanations; suggestions stay labeled as proposals.
- **Discuss** keeps implementation paused while you ask questions.
- Confirmed design choices and implemented code remain distinct in the notes.

## Example: discussing an unfamiliar detail

This condensed adaptation of the original sign-in discussion shows why **Discuss**
matters. It illustrates the interaction, not an exact transcript or a required
password-storage design. The folder example in the [README](../../README.md#what-it-feels-like)
shows Build, Design, and Implementation checkpoints together.

**opencode:**

---

**✦ Build checkpoint: Password storage**

What would you store so we can check someone's password when they sign in?

**You:**

```text
A hashed password, not the password itself.
```

**opencode:**

A hash lets us verify a password without storing the original. Password storage
also needs a method designed to make repeated guesses expensive, and a unique
salt so equal passwords don't produce equal stored hashes.

**✦ Design checkpoint: Password storage**

Your proposal: store a password hash. Details to discuss before confirming:

| Detail | Proposal | Why it matters |
| --- | --- | --- |
| Hashing method | Use a password-hashing library with scrypt | Makes each guess expensive |
| Salt | Let the library generate a fresh random salt per password | Prevents reuse of precomputed guesses across users |

```text
❯ 1. Confirm and continue
     This approach makes sense to me; move to the next piece.
  2. Discuss
     Ask questions or clarify anything that doesn't make sense before deciding.
```

**You:**

```text
Discuss. What is a salt?
```

**opencode:**

Extra random data mixed into the password before hashing. Two people with the
same password get different hashes because their salts differ. We store the salt
alongside the hash so we can repeat the check at sign-in; it doesn't need to be secret.

The hashing method and salt handling are still proposals. We haven't confirmed
them or started implementing.

An Implementation checkpoint comes when a specific coding step is ready. It can
confirm the design and authorize that step together; don't add a separate Design
checkpoint just to repeat the same approval.
