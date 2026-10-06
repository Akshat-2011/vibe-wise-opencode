import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { vibeWiseHooks } from "../.opencode/plugins/vibe-wise/hooks.js"
import { tempProject, writeResetNotes, writeState } from "./helpers.js"

const fakeTool = Object.assign((definition) => definition, {
  schema: { string: () => ({ optional: () => ({ type: "string" }) }) },
})

const systemOutput = () => ({ system: [] })

test("injects restoration context once per session", async () => {
  const { project } = tempProject()
  const state = writeState(project)
  const guidePath = path.join(project, "guide", "SKILL.md")
  const hooks = vibeWiseHooks({ directory: project, guidePath }, { tool: fakeTool })

  const first = systemOutput()
  await hooks["experimental.chat.system.transform"]({ sessionID: "ses_a" }, first)
  assert.equal(first.system.length, 1)
  assert.ok(first.system[0].includes(guidePath))
  assert.ok(first.system[0].includes(state))

  const second = systemOutput()
  await hooks["experimental.chat.system.transform"]({ sessionID: "ses_a" }, second)
  assert.equal(second.system.length, 0)

  const other = systemOutput()
  await hooks["experimental.chat.system.transform"]({ sessionID: "ses_b" }, other)
  assert.equal(other.system.length, 1)
})

test("does not inject for inactive or paused learning", async () => {
  const fresh = tempProject()
  const freshHooks = vibeWiseHooks({ directory: fresh.project, guidePath: "/g/SKILL.md" }, { tool: fakeTool })
  const output = systemOutput()
  await freshHooks["experimental.chat.system.transform"]({ sessionID: "ses_a" }, output)
  assert.equal(output.system.length, 0)

  const paused = tempProject()
  writeState(paused.project, "paused")
  const pausedHooks = vibeWiseHooks({ directory: paused.project, guidePath: "/g/SKILL.md" }, { tool: fakeTool })
  const pausedOutput = systemOutput()
  await pausedHooks["experimental.chat.system.transform"]({ sessionID: "ses_a" }, pausedOutput)
  assert.equal(pausedOutput.system.length, 0)
})

test("compaction re-arms injection and deletion cleans up", async () => {
  const { project } = tempProject()
  writeState(project)
  const hooks = vibeWiseHooks({ directory: project, guidePath: "/g/SKILL.md" }, { tool: fakeTool })
  await hooks["experimental.chat.system.transform"]({ sessionID: "ses_a" }, systemOutput())
  await hooks.event({ event: { type: "session.compacted", properties: { sessionID: "ses_a" } } })
  const afterCompact = systemOutput()
  await hooks["experimental.chat.system.transform"]({ sessionID: "ses_a" }, afterCompact)
  assert.equal(afterCompact.system.length, 1)

  await hooks.event({ event: { type: "session.deleted", properties: { info: { id: "ses_a" } } } })
  const afterDelete = systemOutput()
  await hooks["experimental.chat.system.transform"]({ sessionID: "ses_a" }, afterDelete)
  assert.equal(afterDelete.system.length, 1)
})

test("injected context stays constant-size and never leaks notes", async () => {
  const { project } = tempProject()
  const state = writeState(project)
  const hooks = vibeWiseHooks({ directory: project, guidePath: "/g/SKILL.md" }, { tool: fakeTool })
  const small = systemOutput()
  await hooks["experimental.chat.system.transform"]({ sessionID: "ses_small" }, small)

  fs.writeFileSync(path.join(state, "progress.md"), "SECRET-REASONING\n".repeat(20000))
  fs.appendFileSync(path.join(state, "profile.md"), "x".repeat(200000))
  const big = systemOutput()
  await hooks["experimental.chat.system.transform"]({ sessionID: "ses_big" }, big)
  assert.equal(big.system.length, 1)
  assert.equal(big.system[0], small.system[0])
  assert.ok(big.system[0].length < 10000)
  assert.ok(!big.system[0].includes("SECRET-REASONING"))
})

test("config denies model invocation of both skills", async () => {
  const hooks = vibeWiseHooks({ directory: "/tmp/nowhere", guidePath: "/g" }, { tool: fakeTool })

  const cfg = {}
  await hooks.config(cfg)
  assert.equal(cfg.permission.skill["vibe-wise-learn"], "deny")
  assert.equal(cfg.permission.skill["vibe-wise-reset"], "deny")

  const stringPermission = { permission: "deny" }
  await hooks.config(stringPermission)
  assert.equal(stringPermission.permission, "deny")

  const stringSkill = { permission: { skill: "allow" } }
  await hooks.config(stringSkill)
  assert.equal(stringSkill.permission.skill, "allow")

  const existing = { permission: { skill: { other: "deny" } } }
  await hooks.config(existing)
  assert.equal(existing.permission.skill.other, "deny")
  assert.equal(existing.permission.skill["vibe-wise-reset"], "deny")
})

test("reset tool previews and confirms against the context directory", async () => {
  const { project } = tempProject()
  const { state } = writeResetNotes(project)
  const hooks = vibeWiseHooks({ directory: project, guidePath: "/g" }, { tool: fakeTool })
  const definition = hooks.tool.vibe_wise_reset
  assert.equal(typeof definition.execute, "function")

  const preview = JSON.parse(await definition.execute({}, { directory: project }))
  assert.equal(preview.status, "preview")
  assert.equal(preview.state, state)

  const done = JSON.parse(await definition.execute({ confirm: preview.confirmation }, { directory: project }))
  assert.equal(done.status, "reset")
  assert.equal(done.state, state)

  const error = JSON.parse(await definition.execute({ cwd: "/does/not/exist" }, { directory: project }))
  assert.equal(error.status, "error")
})
