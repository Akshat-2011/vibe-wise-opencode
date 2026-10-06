import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { defaultDeps, reset } from "../.opencode/plugins/vibe-wise/reset.js"
import { assertOriginals, tempProject, writeResetNotes } from "./helpers.js"

test("preview leaves notes untouched", () => {
  const { project } = tempProject()
  const { state, originals } = writeResetNotes(project)
  const preview = reset(project)
  assert.equal(preview.status, "preview")
  assert.equal(preview.state, state)
  assert.equal(preview.project, project)
  assert.deepEqual(preview.files.slice().sort(), ["profile.md", "progress.md", "project-map.md"])
  assert.equal(preview.backup_parent, path.join(state, "backups"))
  assert.ok(preview.confirmation.length > 0)
  assertOriginals(state, originals)
  assert.deepEqual(fs.readdirSync(state).sort(), Object.keys(originals).sort())
  assert.equal(fs.existsSync(path.join(state, "backups")), false)
})

test("no state and empty state do not create files", () => {
  const { project } = tempProject()
  assert.equal(reset(project).status, "no_notes")
  assert.deepEqual(fs.readdirSync(project), [".git"])
  const state = path.join(project, ".vibe-wise")
  fs.mkdirSync(state)
  assert.equal(reset(project).status, "no_notes")
  assert.deepEqual(fs.readdirSync(state), [])
})

test("relative or missing directories are rejected", () => {
  const { root } = tempProject()
  assert.throws(() => reset("relative/path"), /absolute project working directory/)
  assert.throws(() => reset(path.join(root, "missing")), /absolute project working directory/)
})

test("non-regular notes are rejected", () => {
  const { project } = tempProject()
  const { state } = writeResetNotes(project)
  const profile = path.join(state, "profile.md")
  fs.unlinkSync(profile)
  fs.symlinkSync(path.join(state, "progress.md"), profile)
  assert.throws(() => reset(project), /non-regular/)
  fs.unlinkSync(profile)
  fs.mkdirSync(profile)
  assert.throws(() => reset(project), /non-regular/)
  assert.equal(fs.existsSync(path.join(state, "backups")), false)
})

test("symlinked state is not followed", () => {
  const { root, project } = tempProject()
  const outside = path.join(root, "outside")
  fs.mkdirSync(outside)
  const target = writeResetNotes(outside)
  fs.symlinkSync(target.state, path.join(project, ".vibe-wise"), "dir")
  assert.equal(reset(project).status, "no_notes")
  assertOriginals(target.state, target.originals)
})

test("nested directory and legacy notes target the nearest state", () => {
  const { project } = tempProject()
  const legacy = writeResetNotes(project, { legacy: true })
  const nested = path.join(project, "src")
  fs.mkdirSync(nested)
  const preview = reset(nested)
  assert.equal(preview.state, legacy.state)
  assert.equal(fs.existsSync(path.join(project, ".vibe-wise")), false)
})

test("preferred state wins over legacy", () => {
  const { project } = tempProject()
  const current = writeResetNotes(project)
  const legacy = writeResetNotes(project, { legacy: true })
  assert.equal(reset(project).state, current.state)
  assertOriginals(legacy.state, legacy.originals)
})

test("worktree and nested repository boundaries report no notes", () => {
  const { project } = tempProject()
  const parent = writeResetNotes(project)
  for (const [name, isWorktree] of [["nested-repo", false], ["worktree", true]]) {
    const dir = path.join(project, name)
    fs.mkdirSync(dir)
    if (isWorktree) {
      fs.writeFileSync(path.join(dir, ".git"), "gitdir: /another/repo/.git/worktrees/test")
    } else {
      fs.mkdirSync(path.join(dir, ".git"))
    }
    assert.equal(reset(dir).status, "no_notes")
  }
  assertOriginals(parent.state, parent.originals)
})
