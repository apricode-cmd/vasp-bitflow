# Version Management System

## 📋 Overview

Automated version management system for tracking releases, builds, and changes.

## 🔢 Version Format

**Semantic Versioning**: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes, significant new features
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, small improvements

**Build Number**: Auto-incremented with each version bump

## 📦 Files

### `version.json`
Central version file containing:
- Current version
- Build number
- Build date
- Release notes for all versions

### `package.json`
Synchronized with `version.json` for npm compatibility

## 🚀 Usage

### Bump Version

```bash
# Patch version (1.0.0 → 1.0.1)
npm run version:patch

# Minor version (1.0.0 → 1.1.0)
npm run version:minor

# Major version (1.0.0 → 2.0.0)
npm run version:major

# Manual bump with type
npm run version:bump [major|minor|patch]
```

### Update Release Notes

1. Bump version first
2. Update `version.json` manually with release notes:

```json
{
  "releaseNotes": {
    "1.1.0": {
      "date": "2025-11-15",
      "type": "minor",
      "features": [
        "New order management system",
        "Auto-sync PayIn/PayOut statuses"
      ],
      "improvements": [
        "Better UI/UX for order transitions",
        "Optimized database queries"
      ],
      "fixes": [
        "Fixed PayOut foreign key constraint",
        "Fixed PayIn creation on PAYMENT_RECEIVED"
      ]
    }
  }
}
```

3. Get template:
```bash
npm run version:notes
```

### Complete Release Process

```bash
# 1. Bump version
npm run version:minor

# 2. Update release notes in version.json
# (manually edit the file)

# 3. Commit changes
git add version.json package.json
git commit -m "chore: bump version to v1.1.0"

# 4. Create git tag
git tag -a v1.1.0 -m "Release v1.1.0"

# 5. Push to repository
git push && git push --tags
```

## 🔍 Access Version Info

### In Code (Server-side)

```typescript
import versionData from '@/../version.json';

console.log(versionData.version);      // "1.0.0"
console.log(versionData.buildNumber);  // 1
console.log(versionData.buildDate);    // "2025-11-15T..."
```

### Via API

```bash
GET /api/version
```

Response:
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "buildNumber": 1,
    "buildDate": "2025-11-15T00:00:00.000Z",
    "releaseNotes": {
      "date": "2025-11-15",
      "type": "major",
      "features": ["..."],
      "improvements": ["..."],
      "fixes": ["..."]
    }
  }
}
```

### In UI (Footer)

Version automatically displayed in:
- `AdminFooter` component
- `ClientFooter` component

Uses `NEXT_PUBLIC_APP_VERSION` env var or fallback to `version.json`

## 📝 Release Types

### Major (x.0.0)
- Breaking changes
- Complete redesigns
- New major features
- Database schema changes requiring migration

### Minor (1.x.0)
- New features
- Significant improvements
- Backward compatible changes
- New API endpoints

### Patch (1.0.x)
- Bug fixes
- Performance improvements
- Security patches
- Documentation updates
- UI/UX tweaks

## 🔐 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_APP_VERSION=1.0.0  # Optional, uses version.json by default
```

## 📊 Version History

All versions tracked in `version.json` with complete release notes, making it easy to:
- Generate changelogs
- Track feature additions
- Document bug fixes
- Maintain compliance records

## 🛠️ Automation

Version system integrates with:
- ✅ Git tags
- ✅ npm version
- ✅ Build metadata
- ✅ API endpoints
- ✅ UI components
- ✅ Documentation

## 📖 Best Practices

1. **Always bump version before release**
2. **Update release notes immediately**
3. **Tag git commits with version**
4. **Keep version.json in sync with package.json**
5. **Document breaking changes clearly**
6. **Test after version bump**
7. **Push tags to remote repository**

## 🎯 Examples

### Example 1: Bug Fix Release
```bash
npm run version:patch
# Edit version.json with fix details
git add version.json package.json
git commit -m "chore: bump version to v1.0.1"
git tag -a v1.0.1 -m "Bug fixes"
git push && git push --tags
```

### Example 2: Feature Release
```bash
npm run version:minor
# Edit version.json with new features
git add version.json package.json
git commit -m "chore: bump version to v1.1.0"
git tag -a v1.1.0 -m "New features"
git push && git push --tags
```

### Example 3: Major Release
```bash
npm run version:major
# Edit version.json with breaking changes
git add version.json package.json
git commit -m "chore: bump version to v2.0.0"
git tag -a v2.0.0 -m "Major release with breaking changes"
git push && git push --tags
```

---

**System Version**: Automated and centralized version management
**Maintained by**: Apricode Development Team

