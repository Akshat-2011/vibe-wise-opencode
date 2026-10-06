import path from "node:path"
import { profileIsActive, stateDirectory } from "./state.js"
import { restorationContext } from "./restore.js"
import { reset } from "./reset.js"

const DENIED_SKILLS = ["vibe-wise-learn", "vibe-wise-reset"]

function sessionIdFrom(event) {
  const properties = event && typeof event === "object" ? event.properties : null
  if (!properties || typeof properties !== "object") return null
  if (typeof properties.sessionID === "string") return properties.sessionID
  if (properties.info && typeof properties.info === "object" && typeof properties.info.id === "string") {
    return properties.info.id
  }
  if (properties.session && typeof properties.session === "object" && typeof properties.session.id === "string") {
    return properties.session.id
  }
  return null
}

export function vibeWiseHooks({ directory, guidePath }, { tool }) {
  const injected = new Set()

  return {
    "experimental.chat.system.transform": async (input, output) => {
      const key = typeof input?.sessionID === "string" ? input.sessionID : "__default__"
      if (injected.has(key)) return
      const state = stateDirectory(directory)
      if (state === null) return
      if (!profileIsActive(path.join(state, "profile.md"))) return
      output.system.push(restorationContext({ guidePath, stateDir: state }))
      injected.add(key)
    },
    event: async ({ event }) => {
      if (!event || typeof event.type !== "string") return
      if (event.type === "session.compacted") {
        const id = sessionIdFrom(event)
        if (id === null) injected.clear()
        else injected.delete(id)
      } else if (event.type === "session.deleted") {
        const id = sessionIdFrom(event)
        if (id !== null) injected.delete(id)
      }
    },
    config: async (cfg) => {
      if (!cfg || typeof cfg !== "object") return
      if (cfg.permission === undefined) cfg.permission = {}
      else if (typeof cfg.permission !== "object" || cfg.permission === null || Array.isArray(cfg.permission)) return
      if (cfg.permission.skill === undefined) cfg.permission.skill = {}
      else if (typeof cfg.permission.skill !== "object" || cfg.permission.skill === null || Array.isArray(cfg.permission.skill)) return
      for (const name of DENIED_SKILLS) cfg.permission.skill[name] = "deny"
    },
    tool: {
      vibe_wise_reset: tool({
        description:
          "Preview or reset this project's VibeWise learning notes. Call without confirm for a read-only preview; call again with the preview's exact confirmation token only after the user explicitly approves a reset.",
        args: {
          cwd: tool.schema.string().optional(),
          confirm: tool.schema.string().optional(),
        },
        async execute(args, context) {
          const cwd = typeof args?.cwd === "string" && args.cwd !== "" ? args.cwd : context.directory
          try {
            return JSON.stringify(reset(cwd, typeof args?.confirm === "string" ? args.confirm : null))
          } catch (error) {
            return JSON.stringify({
              status: "error",
              message: error instanceof Error ? error.message : String(error),
            })
          }
        },
      }),
    },
  }
}
