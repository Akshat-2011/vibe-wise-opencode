import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const INSTALL = path.join(ROOT, "install.sh")

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "vibe-wise-install-"))

test("installs into a target directory and uninstalls cleanly", () => {
  const target = tempDir()
  fs.writeFileSync(path.join(target, "unrelated.txt"), "keep\n")
  execFileSync("sh", [INSTALL, "--target", target])
  assert.ok(fs.existsSync(path.join(target, "plugins", "vibe-wise.js")))
  assert.ok(fs.existsSync(path.join(target, "plugins", "vibe-wise", "state.js")))
  assert.ok(fs.existsSync(path.join(target, "skills", "vibe-wise-learn", "SKILL.md")))
  assert.ok(fs.existsSync(path.join(target, "skills", "vibe-wise-reset", "SKILL.md")))
  execFileSync("sh", [INSTALL, "--uninstall", "--target", target])
  assert.equal(fs.existsSync(path.join(target, "plugins", "vibe-wise.js")), false)
  assert.equal(fs.existsSync(path.join(target, "skills", "vibe-wise-learn")), false)
  assert.equal(fs.readFileSync(path.join(target, "unrelated.txt"), "utf8"), "keep\n")
})

test("project mode installs into .opencode", () => {
  const project = tempDir()
  execFileSync("sh", [INSTALL, "--project", project])
  assert.ok(fs.existsSync(path.join(project, ".opencode", "plugins", "vibe-wise.js")))
  assert.ok(fs.existsSync(path.join(project, ".opencode", "skills", "vibe-wise-reset", "SKILL.md")))
})

test("reinstalling overwrites previous files", () => {
  const target = tempDir()
  execFileSync("sh", [INSTALL, "--target", target])
  fs.writeFileSync(path.join(target, "plugins", "vibe-wise.js"), "stale")
  execFileSync("sh", [INSTALL, "--target", target])
  assert.notEqual(fs.readFileSync(path.join(target, "plugins", "vibe-wise.js"), "utf8"), "stale")
})
