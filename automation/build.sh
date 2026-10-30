#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

header_version="$(sed -n 's|^// @version[[:space:]]*||p' keepers.user.js | head -n 1 | tr -d '[:space:]')"
const_version="$(sed -n 's/^[[:space:]]*const VERSION = "\([^"]*\)".*/\1/p' keepers.user.js | head -n 1)"
if [[ -z "$header_version" || -z "$const_version" || "$header_version" != "$const_version" ]]; then
  echo "Version mismatch in keepers.user.js: // @version '${header_version}' vs VERSION '${const_version}'" >&2
  exit 1
fi

files=(
    "keepers.user.js"
    "battle/battle.user.js"
    "quests/quests.user.js"
    "arena/arena.user.js"
    "dungeon/dungeon.user.js"
    "tournament-champions/champions.user.js"
    "tournament-frena/frena.user.js"
)

for file in "${files[@]}"; do
    cat "$file"
    echo ""
done > keepers.all.user.js

echo "Built: keepers.all.user.js"
