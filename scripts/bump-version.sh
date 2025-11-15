#!/bin/bash

# Bump Version Script
# Usage: npm run version:bump [major|minor|patch]

set -e

VERSION_FILE="version.json"
PACKAGE_FILE="package.json"

# Check if version type is provided
if [ -z "$1" ]; then
  echo "❌ Error: Version type not specified"
  echo "Usage: npm run version:bump [major|minor|patch]"
  echo ""
  echo "Examples:"
  echo "  npm run version:bump major   # 1.0.0 → 2.0.0"
  echo "  npm run version:bump minor   # 1.0.0 → 1.1.0"
  echo "  npm run version:bump patch   # 1.0.0 → 1.0.1"
  exit 1
fi

VERSION_TYPE=$1

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo "❌ Error: Invalid version type '$VERSION_TYPE'"
  echo "Valid types: major, minor, patch"
  exit 1
fi

# Read current version
CURRENT_VERSION=$(node -p "require('./version.json').version")
echo "📌 Current version: $CURRENT_VERSION"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Bump version based on type
case $VERSION_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "🚀 New version: $NEW_VERSION"

# Get current build number and increment
CURRENT_BUILD=$(node -p "require('./version.json').buildNumber")
NEW_BUILD=$((CURRENT_BUILD + 1))

# Update version.json
node -e "
const fs = require('fs');
const versionData = require('./version.json');
versionData.version = '$NEW_VERSION';
versionData.buildNumber = $NEW_BUILD;
versionData.buildDate = new Date().toISOString();
fs.writeFileSync('version.json', JSON.stringify(versionData, null, 2) + '\n');
"

# Update package.json
node -e "
const fs = require('fs');
const packageData = require('./package.json');
packageData.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(packageData, null, 2) + '\n');
"

echo "✅ Version updated successfully!"
echo ""
echo "📦 Version: $CURRENT_VERSION → $NEW_VERSION"
echo "🔢 Build: $CURRENT_BUILD → $NEW_BUILD"
echo ""
echo "Next steps:"
echo "1. Update release notes in version.json"
echo "2. Commit changes: git add version.json package.json && git commit -m \"chore: bump version to $NEW_VERSION\""
echo "3. Tag release: git tag -a v$NEW_VERSION -m \"Release v$NEW_VERSION\""
echo "4. Push: git push && git push --tags"

