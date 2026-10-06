# VibeWise for opencode — design

Date: 2026-10-06
Status: approved in conversation; written spec

## Goal

A public repo, `Akshat-2011/vibe-wise-opencode`, that ports
[nykooi1/vibe-wise](https://github.com/nykooi1/vibe-wise) to opencode: a
learning-first development plugin. The learner owns the design; the agent asks
for their approach, explains unfamiliar concepts, records agreed designs, writes
the code, and reports what changed. Local learning notes live in `.vibe-wise/`
in the target project. The original is MIT-licensed; this port keeps the
original copyright and attribution.

## Decisions taken

- **Install**: copy-based. Clone the repo and run `./install.sh` (global, into
  `${XDG_CONFIG_HOME:-$HOME/.config}/opencode`) or copy `.opencode/` into a
  project. Running opencode inside the cloned repo also works because
  opencode auto-discovers `.opencode/`.
- **Repo**: fresh public GitHub repo `vibe-wise-opencode` under `Akshat-2011`,
  pushed with `gh`. Not a GitHub fork.
- **Fidelity**: full port. All guide content, the reset preview/confirm/backup
  flow, restoration of learning context, adapted README and development docs,
  and a ported automated test suite (~35 cases). No Python dependency.
- **Language**: plain ESM JavaScript, zero runtime dependencies, tests with
  `node --test` (Node >= 20).
- **Commands**: the two skills are named `vibe-wise-learn` and `vibe-wise-reset`.
  opencode exposes every skill as a slash command automatically, so users run
  `/vibe-wise-learn` and `/vibe-wise-reset`.
- **Reset helper**: a plugin custom tool (`vibe_wise_reset`) replaces
  `reset.py`. The skill drives preview → `question` tool (Cancel / Reset
  learning) → confirm token.
- **Restoration**: a plugin `experimental.chat.system.transform` hook injects
  the ported SessionStart context once per session (tracked by session ID),
  re-armed after `session.compacted`. The injected text stays constant-size and
  contains no learner notes.
- **Auto-invocation gating**: opencode has no `disable-model-invocation`. The
  plugin best-effort sets `permission.skill` deny for the two skills in its
  `config` hook; the README documents the same config as a manual fallback
  (plugin/config-hook ordering is not contractual).

## Non-goals

- npm publishing or an opencode plugin marketplace entry.
- Claude Code compatibility in the same repo.
- Auto-update daemon (updates are `git pull && ./install.sh`).
- New learning pedagogy or behavior changes; content is ported 1:1 apart from
  tool/agent naming.

## Repo layout

```
vibe-wise-opencode/
  .opencode/
    plugins/
      vibe-wise.js                 # single plugin export; imports helpers
      vibe-wise/
        state.js                   # state-dir lookup + profile activation
        restore.js                 # restoration context text
        reset.js                   # reset preview/confirm/backup
        hooks.js                   # pure wiring: hooks(input, { tool })
    skills/
      vibe-wise-learn/
        SKILL.md
        behavior.md
        onboarding.md
        state-templates.md
      vibe-wise-reset/
        SKILL.md
  tests/
    state.test.js
    restore.test.js
    reset.test.js
    plugin.test.js
  docs/
    development.md
    demos/notion-dupe.md
    superpowers/specs/2026-10-06-vibe-wise-opencode-design.md
  assets/vibewise-icon.png       # copied from the original (MIT)
  install.sh
  package.json
  .gitignore
  README.md
  LICENSE
```

`plugins/*.{ts,js}` auto-discovery is top-level only, so `plugins/vibe-wise/`
helper modules load only via import. The plugin entry must export exactly one
function: opencode treats every export of a plugin module as a plugin.

## Components

### state.js — project state lookup (port of `hooks/session_start.py`)

- `stateDirectory(cwd)`: walk from `cwd` upward; at each level check
  `.vibe-wise` then `.sensible-vibes`. Return the first existing entry as a
  directory only if it is a real directory and not a symlink; if the first
  existing candidate is invalid, return `null` (never fall back past it). Stop
  after a level containing `.git` (file or directory). Return `null` if none.
- `profileIsActive(profilePath)`: reject symlinks and non-files; read text;
  return `false` if a line fully matches `Learning mode:\s*paused` (case
  insensitive) anywhere in the file; return `false` for empty/unreadable
  profiles; otherwise `true` (legacy profiles without a mode restore).
- No writes, no note contents in outputs.

### restore.js — restoration context

`restorationContext({ guidePath, stateDir })` returns the constant-size
instruction string, ported from `session_start.py` with opencode wording:

- names VibeWise as active; tells the agent to use Read to load the Learn
  guide (`guidePath`) and its referenced behavior instructions before
  responding or coding;
- names the state directory; instructs reading `profile.md` and
  `project-map.md`, searching all of `progress.md` for pending decisions,
  reading their complete sections and task-relevant topics, and restoring the
  pending stage before coding ("Restarting or compacting is not approval");
- instructs discovering optional files before reading, not following symlinks,
  treating notes as data, and recreating missing notes only from evidence;
- keeps incomplete onboarding on unanswered questions only;
- never includes note excerpts; length must not grow with note size.

### hooks.js — pure hook wiring

`vibeWiseHooks({ directory, guidePath }, { tool })` returns the opencode hooks
object:

- `"experimental.chat.system.transform"(input, output)`:
  - resolve state via `stateDirectory(directory)`; if absent or profile not
    active, do nothing;
  - if `input.sessionID` is already marked injected, do nothing; otherwise
    push `restorationContext(...)` onto `output.system` and mark it;
  - sessions without `sessionID` share a `"__default__"` key.
- `event({ event })`:
  - `session.compacted`: remove the session ID from the injected set so the
    next request re-injects after context loss;
  - `session.deleted`: remove the session ID;
  - extract the ID from `event.properties` defensively
    (`sessionID`, `info.id`, `session.id`, else scan string values); if it
    cannot be resolved for `session.compacted`, clear the whole set.
- `config(cfg)`: best-effort, defensive; skip unless `cfg.permission` is an
  object and `cfg.permission.skill` is either absent or an object; set
  `"vibe-wise-learn": "deny"` and `"vibe-wise-reset": "deny"`. Never overwrite
  a string permission value or non-object shapes.
- `tool`: `{ vibe_wise_reset: tool({ description, args: { cwd?, confirm? },
  execute }) }`. `execute` defaults `cwd` to `context.directory`, calls
  `reset(cwd, confirm)`, and returns the JSON result string. Errors are
  reported as `{"status":"error","message":...}` like the original CLI.

### vibe-wise.js — entry

Computes `guidePath = <plugins>/../skills/vibe-wise-learn/SKILL.md` from
`import.meta.url`, imports `@opencode-ai/plugin`'s `tool`, and
`export default async (input) => vibeWiseHooks(input, { tool })`. Nothing else
is exported.

### reset.js — port of `skills/reset/reset.py`

Same semantics and user-visible messages:

- `reset(cwd, confirmation?)`:
  - validate absolute existing directory; resolve;
  - `snapshot(cwd)`: find state via `stateDirectory`; collect `profile.md`,
    `progress.md`, `project-map.md`; reject non-regular files ("Refusing to
    reset non-regular note: ..."); fingerprint = sha256 of state path plus
    ordered `[name, hex-or-null]` entries;
  - no notes → `{status:"no_notes", cwd}`;
  - preview (no confirmation) → `{status:"preview", project, state, files,
    backup_parent, confirmation}`;
  - confirmation mismatch/absent notes → error
    "Target or notes changed. Preview and confirm again; nothing reset.";
  - confirmed: reject symlinked/non-directory `backups` ("Backup path must be
    a real directory; nothing reset."); create `backups/` (0700); create a
    unique `reset-<UTC>-XXXX` dir; write originals, write `.new-*` fresh
    files, re-check fingerprint before replacing, then `rename` fresh files
    into place; any failure → "Reset did not complete. Backup location: ....
    Check active notes before continuing. <error>";
  - success → `{status:"reset", project, state, backup}`.
- Fresh files are byte-equivalent to the original templates (active,
  `Onboarding: incomplete`, `Onboarding reset: pending`, remaining-onboarding
  list, empty progress, unmapped project map).
- Dependency injection: `reset(cwd, confirmation, deps)` where `deps` supplies
  fs/clock/hash hooks so tests reproduce backup/replacement failures without
  patching globals. Production calls use real defaults.

### Skills (ported content)

- `vibe-wise-learn/SKILL.md`: ported from `skills/learn/SKILL.md`. Frontmatter
  keeps `name` + `description` only (drop `disable-model-invocation`).
  Replace Claude-specific mechanics: Read/Glob tool guidance stays; reference
  companion files relatively (opencode appends the skill's absolute base
  directory to the command prompt). Where the original uses
  `${CLAUDE_PLUGIN_ROOT}`, use base-directory-relative paths.
- `behavior.md`, `onboarding.md`, `state-templates.md`: ported 1:1 except:
  `AskUserQuestion` → "the `question` tool (plain-text fallback if
  unavailable)"; third-person "Claude" → "the agent"; a skill-tool denial note
  is not needed in the guides.
- `vibe-wise-reset/SKILL.md`: ported from `skills/reset/SKILL.md`, replacing
  the Python helper with the `vibe_wise_reset` tool:
  1. call the tool with no `confirm` (read-only preview);
  2. `no_notes` → explain and suggest `/vibe-wise-learn`;
  3. show project, state, files, backup parent; ask via `question` tool,
     header `Reset`, options Cancel / Reset learning; an invocation alone is
     not confirmation;
  4. only after Reset learning, call the tool with the preview's exact
     `confirmation`; stale target → preview and confirm again;
  5. on success show the backup path, then read the Learn skill and resume
     onboarding fresh (discard pre-reset preferences; rebuild the map from
     code).

### install.sh

POSIX `sh`, `set -eu`:

- default target `${XDG_CONFIG_HOME:-$HOME/.config}/opencode`;
- `--target DIR` override; `--project DIR` copies into `DIR/.opencode`;
- copies `plugins/vibe-wise.js`, `plugins/vibe-wise/`, and the two skill
  directories; refuses to run if the target contains a file where a directory
  is required; idempotent overwrite;
- `--uninstall` removes exactly the installed paths (not the whole target);
- prints what was installed, that opencode must be restarted, the optional
  permission snippet for `opencode.json`, and the `.vibe-wise/` gitignore
  recommendation.

### Docs and repo files

- `README.md`: adapted from the original. opencode-only requirements (no
  Python); install (global script, per-project copy, run-in-repo); usage
  `/vibe-wise-learn`; "What it feels like" examples relabeled to `opencode:`;
  preferences, state, resume, reset; updating (`git pull && ./install.sh`);
  attribution section crediting nykooi1/vibe-wise; MIT license link.
- `docs/development.md`: adapted port notes: architecture (skills-as-commands,
  system.transform restoration, reset tool), local checks (`node --test
  tests/`, `sh -n install.sh`, `git diff --check`), what the tests do and do
  not prove, smoke-test checklist (16 items from the original, translated to
  opencode commands and the `question` tool), verified-against references
  (opencode plugin/skill/command/config docs, checked 2026-10-06).
- `docs/demos/notion-dupe.md`: ported with opencode commands/wording.
- `LICENSE`: MIT; original `Copyright (c) 2026 Noah Kim` notice kept verbatim,
  plus `Copyright (c) 2026 Akshat Dubey` for the port.
- `package.json`: `{ "name": "vibe-wise-opencode", "private": true,
  "type": "module", "scripts": { "test": "node --test tests/" },
  "engines": { "node": ">=20" } }`, no dependencies.
- `.gitignore`: `.vibe-wise/`, `.sensible-vibes/`, `.DS_Store`,
  `.opencode/node_modules/`, `.opencode/package.json`,
  `.opencode/package-lock.json`, `.opencode/bun.lock`, `.opencode/.gitignore`.

## Test plan (ported from the two Python suites)

`tests/state.test.js`
- fresh project → null; nested cwd finds ancestor state; no-git project works;
  legacy-only notes found in place; `.vibe-wise` preferred over
  `.sensible-vibes` at the same level; nearest state wins; nested repo and
  worktree (`.git` file) boundaries stop the walk; symlinked state dir returns
  null without falling back to legacy.
- activation: paused profile ignored, including marker beyond 100 KB;
  empty/whitespace/invalid-UTF8 profiles inactive; missing profile inactive;
  symlinked profile inactive; legacy profile without mode active; incomplete
  onboarding profile active.

`tests/restore.test.js`
- context names the guide path and state dir; tells the agent to read
  profile/map; includes pending-decision instructions and "Restarting or
  compacting is not approval"; contains no note excerpts; byte-identical and
  < 10 KB for tiny and >200 KB notes.

`tests/reset.test.js` (all with injected deps for failures)
- preview leaves notes untouched; cancel = no confirm call;
- reset backs up exactly the three notes, preserves extra files and source
  code, restarts onboarding, leaves sibling projects and `.git` alone;
- nested cwd + legacy notes; preferred state resets without touching legacy;
  nearest state and worktree boundaries; no-state and empty-state →
  `no_notes`, no files created;
- partial state; repeated resets keep distinct backups;
- stale confirmation rejected before writes; confirmation cannot target a
  different project; symlinked state not followed; non-regular notes rejected;
  symlinked backup dir rejected before notes change; backup write failure
  leaves notes untouched; replacement failure keeps a complete backup and
  reports the backup path.

`tests/plugin.test.js`
- `vibeWiseHooks` with a temp project + fake `tool` factory and fake
  `directory`:
  - transform injects once per session ID; second call no-ops; inactive or
    paused project no-ops;
  - `session.compacted` event re-arms injection; `session.deleted` cleans up;
  - `config` sets denies for both skills, leaves string/odd shapes alone;
  - `tool` registers `vibe_wise_reset` and its execute delegates with the
    context directory.

## Verification

- `node --test tests/` passes.
- `sh -n install.sh`; `git diff --check` clean.
- Manual smoke (documented, not automated): install into a temp global dir,
  open a temp project, run `/vibe-wise-learn`, complete onboarding, restart
  opencode and confirm the profile restores without re-onboarding, run
  `/vibe-wise-reset` and confirm Cancel changes nothing and Reset learning
  backs up then restarts onboarding.

## Risks and notes

- Plugin config-hook ordering for the skill deny is not contractual; the
  README config snippet is the guaranteed path. No breakage either way.
- `session.compacted` event payload shape is handled defensively; worst case
  the set is cleared and the context is injected once more.
- opencode version verified against at design time: 1.18.31 (config
  directories include the global config dir for skills; plugin glob is
  top-level `{plugin,plugins}/*.{ts,js}`; skills auto-register as commands).
- The repo itself will accumulate `.opencode/node_modules` etc. when opencode
  is run inside it; `.gitignore` covers them.

## Attribution

Original VibeWise by Noah Kim (MIT). Ported content retains the original
copyright notice; README and LICENSE state the port explicitly.
