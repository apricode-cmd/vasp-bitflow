#!/bin/bash

# Update Release Notes Script
# Usage: npm run version:notes

set -e

VERSION_FILE="version.json"

# Read current version
CURRENT_VERSION=$(node -p "require('./version.json').version")

echo "📝 Update Release Notes for v$CURRENT_VERSION"
echo ""
echo "Add release notes to version.json manually or use this template:"
echo ""

cat << EOF
{
  "version": "$CURRENT_VERSION",
  "buildNumber": $(node -p "require('./version.json').buildNumber"),
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "releaseNotes": {
    "$CURRENT_VERSION": {
      "date": "$(date +"%Y-%m-%d")",
      "type": "major|minor|patch",
      "features": [
        "New feature 1",
        "New feature 2"
      ],
      "improvements": [
        "Improvement 1",
        "Improvement 2"
      ],
      "fixes": [
        "Bug fix 1",
        "Bug fix 2"
      ]
    }
  }
}
EOF

echo ""
echo ""
echo "After updating version.json, commit and push:"
echo "  git add version.json"
echo "  git commit -m \"docs: update release notes for v$CURRENT_VERSION\""
echo "  git push"

