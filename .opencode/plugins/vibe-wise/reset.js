import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { stateDirectory } from "./state.js"

const NOTE_NAMES = ["profile.md", "progress.md", "project-map.md"]

const FRESH = {
  "profile.md":
    "# Learner Profile\n\nLearning mode: active\nOnboarding: incomplete\n" +
    "Onboarding reset: pending\n\n" +
    "Remaining onboarding: Project situation, experience, stack familiarity, " +
    "goals, and preferences.\n",
  "progress.md": "# Learning Progress\n\nNo learning events recorded yet.\n",
  "project-map.md": "# Project Map\n\nNot mapped yet. Inspect the current project.\n",
}

export function defaultDeps() {
  return {
    fs: {
      lstat: (target) => fs.lstatSync(target),
      readFile: (target) => fs.readFileSync(target),
      writeFile: (target, data) => fs.writeFileSync(target, data),
      writeText: (target, text) => fs.writeFileSync(target, text, "utf8"),
      mkdir: (target) => fs.mkdirSync(target, { recursive: true, mode: 0o700 }),
      mkdtemp: (prefix) => fs.mkdtempSync(prefix),
      rename: (from, to) => fs.renameSync(from, to),
    },
    createHash: () => crypto.createHash("sha256"),
    now: () => new Date(),
  }
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0")
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

function snapshot(cwd, deps) {
  const state = stateDirectory(cwd)
  if (state === null) return { state: null, notes: {}, fingerprint: null }
  const notes = {}
  for (const name of NOTE_NAMES) {
    const target = path.join(state, name)
    let stats
    try {
      stats = deps.fs.lstat(target)
    } catch (error) {
      if (error.code === "ENOENT") continue
      throw error
    }
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error("Refusing to reset non-regular note: " + target)
    }
    notes[name] = deps.fs.readFile(target)
  }
  const digest = deps.createHash()
  digest.update(String(state))
  for (const name of NOTE_NAMES) {
    const data = notes[name]
    digest.update(JSON.stringify([name, data === undefined ? null : data.toString("hex")]))
  }
  return { state, notes, fingerprint: digest.digest("hex") }
}

export function reset(cwd, confirmation = null, deps = defaultDeps()) {
  if (typeof cwd !== "string" || !path.isAbsolute(cwd)) {
    throw new Error("Use an existing absolute project working directory.")
  }
  const directory = path.resolve(cwd)
  let stats
  try {
    stats = deps.fs.lstat(directory)
  } catch {
    throw new Error("Use an existing absolute project working directory.")
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error("Use an existing absolute project working directory.")
  }

  const { state, notes, fingerprint } = snapshot(directory, deps)
  const files = Object.keys(notes)
  if (confirmation !== null && (files.length === 0 || confirmation !== fingerprint)) {
    throw new Error("Target or notes changed. Preview and confirm again; nothing reset.")
  }
  if (files.length === 0) return { status: "no_notes", cwd: directory }

  const backupParent = path.join(state, "backups")
  const preview = {
    status: "preview",
    project: path.dirname(state),
    state,
    files,
    backup_parent: backupParent,
    confirmation: fingerprint,
  }
  if (confirmation === null) return preview

  throw new Error("Target or notes changed. Preview and confirm again; nothing reset.")
}
