#!/usr/bin/env bash
set -euo pipefail

name=$(git config user.name || true)
email=$(git config user.email || true)

if [ -z "${name}" ] || [ -z "${email}" ]; then
  echo "⚠️  Git user.name/user.email не налаштовано. Виконай:"
  echo "   git config --global user.name  \"Bohdan Kononenko\""
  echo "   git config --global user.email \"apricode.studio@gmail.com\""
  exit 1
fi

echo "✅ Git author OK: ${name} <${email}>"

