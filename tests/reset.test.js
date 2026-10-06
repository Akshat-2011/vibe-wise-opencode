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

test("reset backs up only notes and restarts onboarding", () => {
  const { root, project } = tempProject()
  const { state, originals } = writeResetNotes(project)
  fs.writeFileSync(path.join(project, "app.py"), "important source\n")
  fs.writeFileSync(path.join(state, "custom.md"), "keep this\n")
  const sibling = path.join(root, "another-project")
  fs.mkdirSync(sibling)
  const other = writeResetNotes(sibling)

  const preview = reset(project)
  const result = reset(project, preview.confirmation)
  assert.equal(result.status, "reset")
  assert.equal(result.state, state)
  assert.equal(result.project, project)
  assert.equal(path.dirname(result.backup), path.join(state, "backups"))
  assertOriginals(result.backup, originals)
  assert.deepEqual(fs.readdirSync(result.backup).sort(), Object.keys(originals).sort())

  const profile = fs.readFileSync(path.join(state, "profile.md"), "utf8")
  assert.ok(profile.includes("Learning mode: active"))
  assert.ok(profile.includes("Onboarding: incomplete"))
  assert.ok(profile.includes("Onboarding reset: pending"))
  assert.ok(!profile.includes("Advanced"))
  assert.ok(!fs.readFileSync(path.join(state, "progress.md"), "utf8").includes("Pending decision"))
  assert.ok(!fs.readFileSync(path.join(state, "project-map.md"), "utf8").includes("SQLite"))
  assert.equal(fs.readFileSync(path.join(project, "app.py"), "utf8"), "important source\n")
  assert.equal(fs.readFileSync(path.join(state, "custom.md"), "utf8"), "keep this\n")
  assertOriginals(other.state, other.originals)
  assert.ok(fs.statSync(path.join(project, ".git")).isDirectory())
})

test("nested directory and legacy notes reset in place", () => {
  const { project } = tempProject()
  const { state, originals } = writeResetNotes(project, { legacy: true })
  const nested = path.join(project, "src")
  fs.mkdirSync(nested)
  const preview = reset(nested)
  const result = reset(nested, preview.confirmation)
  assert.equal(result.state, state)
  assert.equal(fs.existsSync(path.join(project, ".vibe-wise")), false)
  assertOriginals(path.join(state, "backups", path.basename(result.backup)), originals)
})

test("partial state and repeated resets preserve each backup", () => {
  const { project } = tempProject()
  const { state, originals } = writeResetNotes(project)
  fs.unlinkSync(path.join(state, "progress.md"))
  fs.unlinkSync(path.join(state, "project-map.md"))
  const firstPreview = reset(project)
  const first = reset(project, firstPreview.confirmation).backup
  assert.deepEqual(fs.readdirSync(first), ["profile.md"])
  assert.deepEqual(fs.readFileSync(path.join(first, "profile.md")), originals["profile.md"])
  const secondPreview = reset(project)
  const second = reset(project, secondPreview.confirmation).backup
  assert.notEqual(first, second)
  assert.deepEqual(fs.readFileSync(path.join(first, "profile.md")), originals["profile.md"])
})

test("stale confirmation is rejected before writes", () => {
  const { project } = tempProject()
  const { state } = writeResetNotes(project)
  const token = reset(project).confirmation
  fs.writeFileSync(path.join(state, "progress.md"), "new understanding\n")
  assert.throws(() => reset(project, token), /changed/)
  assert.equal(fs.readFileSync(path.join(state, "progress.md"), "utf8"), "new understanding\n")
  assert.equal(fs.existsSync(path.join(state, "backups")), false)
})

test("confirmation cannot target a different project", () => {
  const { root, project } = tempProject()
  writeResetNotes(project)
  const other = path.join(root, "another-project")
  fs.mkdirSync(other)
  const otherNotes = writeResetNotes(other)
  const token = reset(project).confirmation
  assert.throws(() => reset(other, token), /changed/)
  assertOriginals(otherNotes.state, otherNotes.originals)
  assert.equal(fs.existsSync(path.join(otherNotes.state, "backups")), false)
})

test("symlinked backup directory is rejected before notes change", () => {
  const { root, project } = tempProject()
  const { state, originals } = writeResetNotes(project)
  const outside = path.join(root, "outside")
  fs.mkdirSync(outside)
  fs.symlinkSync(outside, path.join(state, "backups"), "dir")
  const token = reset(project).confirmation
  assert.throws(() => reset(project, token), /Backup path/)
  assertOriginals(state, originals)
  assert.deepEqual(fs.readdirSync(outside), [])
})

test("backup failure does not modify active notes", () => {
  const { project } = tempProject()
  const { state, originals } = writeResetNotes(project)
  const deps = defaultDeps()
  const realWrite = deps.fs.writeFile
  deps.fs.writeFile = (target, data) => {
    if (path.basename(target) === "progress.md") throw new Error("simulated disk failure")
    return realWrite(target, data)
  }
  const token = reset(project).confirmation
  assert.throws(() => reset(project, token, deps), /did not complete/)
  assertOriginals(state, originals)
})

test("replacement failure keeps a complete backup and reports it", () => {
  const { project } = tempProject()
  const { state, originals } = writeResetNotes(project)
  const deps = defaultDeps()
  const realRename = deps.fs.rename
  deps.fs.rename = (from, to) => {
    if (path.basename(to) === "progress.md") throw new Error("simulated write failure")
    return realRename(from, to)
  }
  const token = reset(project).confirmation
  assert.throws(() => reset(project, token, deps), /Backup location/)
  const backups = fs.readdirSync(path.join(state, "backups"))
  assert.equal(backups.length, 1)
  assertOriginals(path.join(state, "backups", backups[0]), originals)
})
