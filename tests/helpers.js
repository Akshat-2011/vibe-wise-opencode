import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

export function tempProject(prefix = "vibe-wise-test-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  const project = path.join(root, "project with spaces")
  fs.mkdirSync(path.join(project, ".git"), { recursive: true })
  return { root, project }
}

export function writeState(project, mode = "active", overrides = {}) {
  const state = path.join(project, ".vibe-wise")
  fs.mkdirSync(state, { recursive: true })
  fs.writeFileSync(
    path.join(state, "profile.md"),
    overrides.profile ??
      `# Learner Profile\nLearning mode: ${mode}\nOnboarding: complete\n` +
        "Checkpoint frequency: Light\nQuestion style: Open-ended\n" +
        "Implementation style: AI writes code\nStrong concepts: HTTP request flow\n",
  )
  fs.writeFileSync(
    path.join(state, "project-map.md"),
    overrides.map ?? "# Project Map\nCLI -> service.py -> SQLite\n",
  )
  fs.writeFileSync(
    path.join(state, "progress.md"),
    overrides.progress ??
      "# Learning Progress\n## Transactions\n" +
        "Demonstrated understanding: two writes must succeed together.\n" +
        "## Queues\nNeeds reinforcement: retries.\n",
  )
  return state
}

export function writeResetNotes(project, { legacy = false } = {}) {
  const state = path.join(project, legacy ? ".sensible-vibes" : ".vibe-wise")
  fs.mkdirSync(state, { recursive: true })
  const originals = {
    "profile.md": Buffer.from("Learning mode: paused\nOnboarding: complete\nAdvanced\n"),
    "progress.md": Buffer.from("## Pending decision\nAwaiting implementation approval\n"),
    "project-map.md": Buffer.from("# Project Map\nCLI -> service -> SQLite\n"),
  }
  for (const [name, data] of Object.entries(originals)) {
    fs.writeFileSync(path.join(state, name), data)
  }
  return { state, originals }
}

export function assertOriginals(state, originals) {
  for (const [name, data] of Object.entries(originals)) {
    assert.deepEqual(fs.readFileSync(path.join(state, name)), data)
  }
}
