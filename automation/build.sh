#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

files=(
    "keepers.user.js"
    "battle/battle.user.js"
)

for file in "${files[@]}"; do
    cat "$file"
    echo ""
done > keepers.all.user.js

echo "Built: keepers.all.user.js"
