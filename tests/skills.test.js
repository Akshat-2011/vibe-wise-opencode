import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SKILLS = path.join(ROOT, ".opencode", "skills")
const RECOGNIZED = new Set(["name", "description", "license", "compatibility", "metadata"])

function parseFrontmatter(text, file) {
  assert.ok(text.startsWith("---\n"), `${file} must start with frontmatter`)
  const end = text.indexOf("\n---", 4)
  assert.ok(end > 4, `${file} must close frontmatter`)
  const fields = {}
  for (const line of text.slice(4, end).split("\n")) {
    const match = /^([A-Za-z-]+):\s*(.+)$/.exec(line)
    if (match) fields[match[1]] = match[2].trim()
  }
  return fields
}

test("skill frontmatter is valid for opencode", () => {
  for (const name of ["vibe-wise-learn"]) {
    const file = path.join(SKILLS, name, "SKILL.md")
    const text = fs.readFileSync(file, "utf8")
    const fields = parseFrontmatter(text, file)
    assert.equal(fields.name, name)
    assert.ok(fields.description && fields.description.length <= 1024, `${file} description`)
    for (const key of Object.keys(fields)) {
      assert.ok(RECOGNIZED.has(key), `unexpected frontmatter field ${key} in ${file}`)
    }
    assert.equal("disable-model-invocation" in fields, false)
    assert.doesNotMatch(text, /\bClaude\b/)
    assert.doesNotMatch(text, /\$\{CLAUDE_PLUGIN_ROOT\}/)
  }
})

test("learn skill references its companion guides", () => {
  const dir = path.join(SKILLS, "vibe-wise-learn")
  const text = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8")
  for (const companion of ["behavior.md", "onboarding.md", "state-templates.md"]) {
    assert.ok(fs.existsSync(path.join(dir, companion)), `${companion} missing`)
    assert.ok(text.includes(companion), `SKILL.md does not reference ${companion}`)
  }
})

test("reset skill drives the reset tool and question confirmation", () => {
  const file = path.join(SKILLS, "vibe-wise-reset", "SKILL.md")
  const text = fs.readFileSync(file, "utf8")
  const fields = parseFrontmatter(text, file)
  assert.equal(fields.name, "vibe-wise-reset")
  assert.ok(fields.description && fields.description.length <= 1024)
  for (const key of Object.keys(fields)) assert.ok(RECOGNIZED.has(key))
  assert.equal("disable-model-invocation" in fields, false)
  assert.doesNotMatch(text, /\bClaude\b/)
  assert.doesNotMatch(text, /\$\{CLAUDE_PLUGIN_ROOT\}/)
  assert.ok(text.includes("vibe_wise_reset"))
  assert.ok(text.includes("question"))
  assert.ok(text.includes("confirmation"))
  assert.doesNotMatch(text, /python/i)
})
