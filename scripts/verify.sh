#!/bin/sh
#
# Everything that must pass before code is pushed or merged.
#
# Each step prints its own heading so a failure is obvious at a glance rather
# than buried in output. `set -e` stops at the first failure.
#
# Usage:  npm run verify
set -e

step() {
  echo ""
  echo "── $1 ──"
}

step "Build"
npm run build --silent

step "Lint"
npm run lint --silent

step "Formatting"
npm run format:check --silent

step "Tests"
npm test --silent

step "Secrets"
node scripts/check-secrets.js

step "Dependency vulnerabilities"
# Fails on high and critical only. Moderate and low are reported by
# `npm audit` but do not block a push — they are rarely reachable from a
# static site and blocking on them trains people to use --no-verify.
npm audit --audit-level=high
