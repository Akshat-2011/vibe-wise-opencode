import fs from "node:fs"
import path from "node:path"

const STATE_NAMES = [".vibe-wise", ".sensible-vibes"]
const PAUSED = /^Learning mode:\s*paused\s*$/i
const decoder = new TextDecoder("utf-8", { fatal: true })

function lstatOrNull(target) {
  try {
    return fs.lstatSync(target)
  } catch (error) {
    if (error.code === "ENOENT") return null
    return undefined
  }
}

export function stateDirectory(cwd) {
  let directory = path.resolve(cwd)
  for (;;) {
    for (const name of STATE_NAMES) {
      const candidate = path.join(directory, name)
      const stats = lstatOrNull(candidate)
      if (stats === undefined) return null
      if (stats !== null) {
        if (stats.isDirectory() && !stats.isSymbolicLink()) return candidate
        return null
      }
    }
    if (fs.existsSync(path.join(directory, ".git"))) return null
    const parent = path.dirname(directory)
    if (parent === directory) return null
    directory = parent
  }
}

export function profileIsActive(profilePath) {
  const stats = lstatOrNull(profilePath)
  if (!stats || !stats.isFile()) return false
  let text
  try {
    text = decoder.decode(fs.readFileSync(profilePath))
  } catch {
    return false
  }
  if (text.trim() === "") return false
  return !text.split(/\r\n|\n|\r/).some((line) => PAUSED.test(line))
}
