import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { profileIsActive, stateDirectory } from "../.opencode/plugins/vibe-wise/state.js"
import { tempProject, writeState } from "./helpers.js"

test("fresh project has no state directory", () => {
  const { project } = tempProject()
  assert.equal(stateDirectory(project), null)
})

test("finds state from a nested working directory", () => {
  const { project } = tempProject()
  const state = writeState(project)
  const nested = path.join(project, "src", "services")
  fs.mkdirSync(nested, { recursive: true })
  assert.equal(stateDirectory(nested), state)
})

test("works without a git directory", () => {
  const { project } = tempProject()
  fs.rmSync(path.join(project, ".git"), { recursive: true })
  const state = writeState(project)
  assert.equal(stateDirectory(project), state)
})

test("legacy notes are found in place", () => {
  const { project } = tempProject()
  const legacy = path.join(project, ".sensible-vibes")
  fs.renameSync(writeState(project), legacy)
  assert.equal(stateDirectory(project), legacy)
})

test("vibe-wise wins over legacy at the same level", () => {
  const { project } = tempProject()
  const current = writeState(project)
  fs.mkdirSync(path.join(project, ".sensible-vibes"))
  assert.equal(stateDirectory(project), current)
})

test("nearest state wins even when paused", () => {
  const { project } = tempProject()
  writeState(project, "active")
  const child = path.join(project, "package")
  fs.mkdirSync(child)
  const childState = path.join(child, ".sensible-vibes")
  fs.mkdirSync(childState)
  fs.writeFileSync(path.join(childState, "profile.md"), "Learning mode: paused\n")
  assert.equal(stateDirectory(child), childState)
})

test("a nested repository stops the walk", () => {
  const { project } = tempProject()
  writeState(project)
  const child = path.join(project, "nested-repo")
  fs.mkdirSync(path.join(child, ".git"), { recursive: true })
  assert.equal(stateDirectory(child), null)
})

test("a worktree .git file stops the walk", () => {
  const { project } = tempProject()
  writeState(project)
  const child = path.join(project, "worktree")
  fs.mkdirSync(child)
  fs.writeFileSync(path.join(child, ".git"), "gitdir: /another/repo/.git/worktrees/test")
  assert.equal(stateDirectory(child), null)
})

test("a symlinked state directory does not fall back to legacy", () => {
  const { project, root } = tempProject()
  fs.renameSync(writeState(project), path.join(project, ".sensible-vibes"))
  fs.symlinkSync(path.join(root, "missing"), path.join(project, ".vibe-wise"), "dir")
  assert.equal(stateDirectory(project), null)
})

test("profile activation honors paused mode anywhere in the file", () => {
  const { project } = tempProject()
  const profile = path.join(writeState(project), "profile.md")

  fs.writeFileSync(profile, "# Learner Profile\nLearning mode: active\nOnboarding: complete\n")
  assert.equal(profileIsActive(profile), true)

  fs.writeFileSync(profile, "# Learner Profile\nLearning mode: paused\n")
  assert.equal(profileIsActive(profile), false)

  fs.writeFileSync(profile, "# Profile\n" + "Older preference.\n".repeat(1000) + "Learning mode: paused\n")
  assert.equal(profileIsActive(profile), false)

  fs.writeFileSync(profile, "# Learner Profile\nExperience: Beginner\n")
  assert.equal(profileIsActive(profile), true)

  for (const bytes of [Buffer.alloc(0), Buffer.from(" \n\t"), Buffer.from([0xff, 0xfe])]) {
    fs.writeFileSync(profile, bytes)
    assert.equal(profileIsActive(profile), false)
  }
})

test("missing and symlinked profiles are inactive", () => {
  const { project, root } = tempProject()
  const profile = path.join(writeState(project), "profile.md")
  const outside = path.join(root, "outside.md")
  fs.writeFileSync(outside, "Learning mode: active\nPRIVATE")
  fs.unlinkSync(profile)
  assert.equal(profileIsActive(profile), false)
  fs.symlinkSync(outside, profile)
  assert.equal(profileIsActive(profile), false)
})
