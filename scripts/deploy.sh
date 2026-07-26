#!/usr/bin/env bash
#
# Publish the production build to GitHub Pages.
#
# Pages serves a branch, not a folder, so the built site has to arrive as its
# own commit history. `dist/` is git-ignored in the main repo, so it carries a
# throwaway repo of its own whose only job is to push one commit to gh-pages.
# It is rebuilt from scratch each time — nothing here is worth keeping.
#
# Usage: npm run deploy
set -euo pipefail

cd "$(dirname "$0")/.."

REMOTE=$(git remote get-url origin)
REV=$(git rev-parse --short HEAD)

npm run build

# Without this, Pages runs the output through Jekyll, which silently drops any
# file or folder whose name begins with an underscore.
touch dist/.nojekyll

rm -rf dist/.git
git -C dist init -q -b gh-pages
git -C dist add -A
git -C dist commit -q -m "Deploy $REV"
git -C dist push -q --force "$REMOTE" gh-pages

echo "Deployed $REV → https://elixtaylor.github.io/longhand/"
