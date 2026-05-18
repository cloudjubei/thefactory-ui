#!/usr/bin/env bash
# Enforces the layer rules for src/ — see docs/implementation-plan.md.
# Failures here mean the package's promised four-layer split (tokens → headless →
# web/native) has been broken; consumers will hit RN imports in web bundles or
# DOM globals in headless code.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
fail=0

if [ ! -d "$SRC" ]; then
  echo "uikit-boundaries: $SRC does not exist — nothing to check" >&2
  exit 0
fi

# Helper: grep -RE under a path. Matches mean failure.
scan() {
  local label="$1" pattern="$2" path="$3"
  if [ ! -d "$path" ]; then return; fi
  local hits
  hits=$(grep -RE --include='*.ts' --include='*.tsx' "$pattern" "$path" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    echo "uikit-boundaries: $label" >&2
    echo "$hits" >&2
    fail=1
  fi
}

# 1. tokens/ is pure TS — no React, no DOM, no RN, no CSS imports.
scan "react import inside src/tokens/" \
  "from 'react'" "$SRC/tokens"
scan "react-dom import inside src/tokens/" \
  "from 'react-dom" "$SRC/tokens"
scan "react-native import inside src/tokens/" \
  "from 'react-native" "$SRC/tokens"
scan ".css import inside src/tokens/" \
  "from '.*\\.css'" "$SRC/tokens"

# 2. headless/ is React-only — no react-dom, no RN, no CSS, no DOM globals,
#    no reach-throughs into web/ or native/.
scan "react-dom import inside src/headless/" \
  "from 'react-dom" "$SRC/headless"
scan "react-native import inside src/headless/" \
  "from 'react-native" "$SRC/headless"
scan ".css import inside src/headless/" \
  "from '.*\\.css'" "$SRC/headless"
scan "../web/ import inside src/headless/" \
  "from '.*\\.\\./web" "$SRC/headless"
scan "../native/ import inside src/headless/" \
  "from '.*\\.\\./native" "$SRC/headless"

# 3. web/ may not import RN.
scan "react-native import inside src/web/" \
  "from 'react-native" "$SRC/web"

# 4. native/ (when it exists) may not import react-dom or any web/-only paths.
if [ -d "$SRC/native" ]; then
  scan "react-dom import inside src/native/" \
    "from 'react-dom" "$SRC/native"
  scan "../web/ import inside src/native/" \
    "from '.*\\.\\./web" "$SRC/native"
fi

if [ $fail -ne 0 ]; then
  echo "uikit-boundaries: FAIL — see violations above." >&2
  exit 1
fi

echo "uikit-boundaries: ok"
