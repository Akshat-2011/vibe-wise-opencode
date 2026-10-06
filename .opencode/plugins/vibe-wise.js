import { fileURLToPath } from "node:url"
import path from "node:path"
import { tool } from "@opencode-ai/plugin"
import { vibeWiseHooks } from "./vibe-wise/hooks.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const guidePath = path.join(here, "..", "skills", "vibe-wise-learn", "SKILL.md")

export default async function VibeWisePlugin(input) {
  return vibeWiseHooks({ directory: input.directory, guidePath }, { tool })
}
