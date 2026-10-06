#!/bin/sh
set -eu

REPO_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MODE=install
TARGET=${XDG_CONFIG_HOME:-$HOME/.config}/opencode

FILES="
plugins/vibe-wise.js
plugins/vibe-wise/package.json
plugins/vibe-wise/state.js
plugins/vibe-wise/restore.js
plugins/vibe-wise/reset.js
plugins/vibe-wise/hooks.js
skills/vibe-wise-learn/SKILL.md
skills/vibe-wise-learn/behavior.md
skills/vibe-wise-learn/onboarding.md
skills/vibe-wise-learn/state-templates.md
skills/vibe-wise-reset/SKILL.md
"

usage() {
  cat <<EOF
Usage: ./install.sh [--target DIR | --project DIR] [--uninstall]

Installs VibeWise for opencode. Default target: $TARGET
  --target DIR   install into DIR
  --project DIR  install into DIR/.opencode
  --uninstall    remove previously installed files
EOF
}

while [ $# -gt 0 ]; do
  case $1 in
    --target)
      [ $# -ge 2 ] || { echo "install.sh: --target needs a directory" >&2; exit 2; }
      TARGET=$2; shift 2 ;;
    --project)
      [ $# -ge 2 ] || { echo "install.sh: --project needs a directory" >&2; exit 2; }
      TARGET=$2/.opencode; shift 2 ;;
    --uninstall)
      MODE=uninstall; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "install.sh: unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ ! -d "$REPO_DIR/.opencode" ]; then
  echo "install.sh: run from a checkout of vibe-wise-opencode" >&2
  exit 1
fi

if [ "$MODE" = uninstall ]; then
  for rel in $FILES; do
    rm -f "$TARGET/$rel"
  done
  rmdir "$TARGET/plugins/vibe-wise" "$TARGET/skills/vibe-wise-learn" \
    "$TARGET/skills/vibe-wise-reset" "$TARGET/plugins" "$TARGET/skills" 2>/dev/null || true
  echo "Removed VibeWise for opencode from $TARGET"
  exit 0
fi

for rel in $FILES; do
  mkdir -p "$TARGET/$(dirname "$rel")"
  cp "$REPO_DIR/.opencode/$rel" "$TARGET/$rel"
done

echo "Installed VibeWise for opencode into $TARGET"
echo
echo "Next steps:"
echo "  1. Restart opencode so the plugin and skills load."
echo "  2. Run /vibe-wise-learn in the project you want to work on."
echo
echo "Recommended: stop the model from invoking the skills on its own by adding"
echo "this to opencode.json:"
echo '  "permission": { "skill": { "vibe-wise-learn": "deny", "vibe-wise-reset": "deny" } }'
echo
echo "Learning notes live in .vibe-wise/ in each project; consider adding it to .gitignore."
