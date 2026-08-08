#!/bin/sh
#
# Verifies what CI and Netlify actually build: a clean clone of HEAD, not the
# working directory.
#
# `npm run verify` can pass locally while a deploy fails, because the working
# directory holds files that were never committed — generated output, or
# something gitignored by accident. This starts from nothing but the commit.
#
# Usage:  npm run verify:ci
set -e

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

step() {
  echo ""
  echo "── $1 ──"
}

# This runs `npm ci`, and .npmrc sets engine-strict, so a different Node here
# fails deep inside a temp clone with an EBADENGINE that reads like a broken
# dependency. Say what is actually wrong, before doing any work.
WANT=$(tr -d ' \t\n\r' < .nvmrc)
HAVE=$(node -p 'process.versions.node.split(".")[0]')
if [ "$WANT" != "$HAVE" ]; then
  echo ""
  echo "This check builds the way CI does, which means Node $WANT — you are on $(node -v)."
  echo ""
  echo "npm 10 and npm 11 resolve optional peer dependencies differently, so the"
  echo "lockfile they produce is not interchangeable. Switch first:"
  echo ""
  echo "  nvm use $WANT"
  echo ""
  exit 1
fi

step "Clone HEAD into a clean directory"
git clone -q --no-hardlinks . "$WORK/repo"
cd "$WORK/repo"
echo "cloned $(git rev-parse --short HEAD)"

step "npm ci (as CI and Netlify run it)"
npm ci --silent

step "npm run build (the Netlify build command)"
npm run build --silent

step "The build produced a deployable site"
for f in public/index.html public/styles.css; do
  test -s "$f" || { echo "MISSING: $f"; exit 1; }
  echo "  $f — $(wc -c < "$f" | tr -d ' ') bytes"
done

step "Every asset the page references was committed"
missing=0
for path in $(grep -oE '(href|src)="/[^"]+"' public/index.html | sed 's/.*"\(.*\)"/\1/' | sort -u); do
  if [ -f "public$path" ]; then
    echo "  ok   $path"
  else
    echo "  MISS $path"
    missing=1
  fi
done
test "$missing" -eq 0 || { echo "Referenced files are not in the repository."; exit 1; }

step "Every function bundles (esbuild, as Netlify does)"
for f in netlify/functions/*.js; do
  npx --yes --quiet esbuild "$f" --bundle --platform=node --format=esm --outfile=/dev/null 2>&1 \
    || { echo "  FAIL $f"; exit 1; }
  echo "  ok   $f"
done

step "The full check suite, on the clean clone"
npm run verify --silent

echo ""
echo "  Clean-clone verification passed — this commit is deployable."
echo ""
