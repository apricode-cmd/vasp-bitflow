#!/bin/bash

# =====================================================
# GPG Setup Script for Bitflow Organization
# =====================================================
# This script guides you through GPG key setup
# Run: bash scripts/setup-gpg-bitflow.sh
# =====================================================

set -e

echo "🔐 GPG Setup for Bitflow Organization"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if GPG is installed
if ! command -v gpg &> /dev/null; then
    echo -e "${RED}❌ GPG is not installed!${NC}"
    echo ""
    echo "Install GPG:"
    echo "  macOS: brew install gnupg"
    echo "  Linux: sudo apt install gnupg"
    exit 1
fi

echo -e "${GREEN}✅ GPG is installed${NC}"
echo ""

# Step 1: Generate GPG key
echo "📋 Step 1: Generate GPG Key"
echo "=========================="
echo ""
echo "You will be asked for:"
echo "  1. Key type: Press ENTER (default RSA)"
echo "  2. Key size: Enter 4096"
echo "  3. Expiration: Enter 2y (2 years)"
echo "  4. Confirm: y"
echo "  5. Real name: Bitflow Admin"
echo "  6. Email: admin@bitflow.biz"
echo "  7. Comment: Bitflow Organization"
echo "  8. Confirm: O"
echo "  9. Passphrase: Enter a STRONG password (save it!)"
echo ""
read -p "Press ENTER to start key generation..."

gpg --full-generate-key

echo ""
echo -e "${GREEN}✅ GPG key generated!${NC}"
echo ""

# Step 2: Get Key ID
echo "📋 Step 2: Get Your Key ID"
echo "=========================="
echo ""

KEY_ID=$(gpg --list-secret-keys --keyid-format=long admin@bitflow.biz 2>/dev/null | grep 'sec' | awk '{print $2}' | cut -d'/' -f2)

if [ -z "$KEY_ID" ]; then
    echo -e "${RED}❌ Could not find key for admin@bitflow.biz${NC}"
    echo ""
    echo "Your keys:"
    gpg --list-secret-keys --keyid-format=long
    echo ""
    echo "Please find your Key ID manually in the output above (after 'rsa4096/')"
    exit 1
fi

echo -e "${GREEN}✅ Found Key ID: $KEY_ID${NC}"
echo ""

# Step 3: Configure Git
echo "📋 Step 3: Configure Git"
echo "========================"
echo ""

cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp"

git config user.email "admin@bitflow.biz"
git config user.name "Bitflow Admin"
git config user.signingkey "$KEY_ID"
git config commit.gpgsign true
git config tag.gpgsign true

echo -e "${GREEN}✅ Git configured for this project${NC}"
echo ""
echo "Current Git config:"
echo "  Email: $(git config user.email)"
echo "  Name: $(git config user.name)"
echo "  Signing Key: $(git config user.signingkey)"
echo "  Auto-sign: $(git config commit.gpgsign)"
echo ""

# Step 4: Fix for macOS
echo "📋 Step 4: Configure GPG TTY"
echo "============================"
echo ""

export GPG_TTY=$(tty)

if ! grep -q "export GPG_TTY=\$(tty)" ~/.zshrc; then
    echo 'export GPG_TTY=$(tty)' >> ~/.zshrc
    echo -e "${GREEN}✅ Added GPG_TTY to ~/.zshrc${NC}"
else
    echo -e "${YELLOW}ℹ️  GPG_TTY already in ~/.zshrc${NC}"
fi

# Check if pinentry-mac is installed
if command -v pinentry-mac &> /dev/null; then
    echo -e "${GREEN}✅ pinentry-mac is installed${NC}"
    
    GPG_AGENT_CONF=~/.gnupg/gpg-agent.conf
    PINENTRY_LINE="pinentry-program $(which pinentry-mac)"
    
    if [ ! -f "$GPG_AGENT_CONF" ] || ! grep -q "pinentry-program" "$GPG_AGENT_CONF"; then
        echo "$PINENTRY_LINE" >> "$GPG_AGENT_CONF"
        gpgconf --kill gpg-agent
        echo -e "${GREEN}✅ Configured pinentry-mac${NC}"
    else
        echo -e "${YELLOW}ℹ️  pinentry already configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  pinentry-mac not installed${NC}"
    echo "   Install: brew install pinentry-mac"
    echo "   (Optional but recommended for better UX)"
fi

echo ""

# Step 5: Export Public Key
echo "📋 Step 5: Export Public Key"
echo "============================"
echo ""

PUBLIC_KEY=$(gpg --armor --export "$KEY_ID")

echo "$PUBLIC_KEY"
echo ""
echo -e "${GREEN}✅ Public key exported above${NC}"
echo ""
echo "📋 Copy the ENTIRE output (from -----BEGIN to -----END)"
echo ""

# Save to file
PUBLIC_KEY_FILE="gpg-public-key-bitflow.asc"
echo "$PUBLIC_KEY" > "$PUBLIC_KEY_FILE"
echo -e "${GREEN}✅ Public key saved to: $PUBLIC_KEY_FILE${NC}"
echo ""

# Step 6: Instructions for GitHub
echo "📋 Step 6: Add to GitHub"
echo "========================"
echo ""
echo "1. Go to: https://github.com/settings/keys"
echo "2. Click: 'New GPG key'"
echo "3. Paste the public key from above (or from file: $PUBLIC_KEY_FILE)"
echo "4. Click: 'Add GPG key'"
echo ""
echo "For organization:"
echo "  https://github.com/organizations/apricode-cmd/settings/keys"
echo ""

# Step 7: Test
echo "📋 Step 7: Test Signing"
echo "======================="
echo ""

read -p "Do you want to create a test commit? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit --allow-empty -m "test: GPG signing for Bitflow organization"
    
    echo ""
    echo "Verifying signature..."
    git log --show-signature -1
    
    echo ""
    echo -e "${GREEN}✅ Test commit created!${NC}"
    echo ""
    echo "If you see 'Good signature from \"Bitflow Admin <admin@bitflow.biz>\"', it works!"
    echo ""
    echo "⚠️  You can delete this test commit with:"
    echo "   git reset --soft HEAD~1"
fi

echo ""
echo "======================================"
echo -e "${GREEN}🎉 GPG Setup Complete!${NC}"
echo "======================================"
echo ""
echo "📝 Summary:"
echo "  ✅ GPG key generated"
echo "  ✅ Key ID: $KEY_ID"
echo "  ✅ Git configured"
echo "  ✅ Public key exported to: $PUBLIC_KEY_FILE"
echo ""
echo "🔐 Next steps:"
echo "  1. Add public key to GitHub (see instructions above)"
echo "  2. Backup your private key securely:"
echo "     gpg --export-secret-keys --armor $KEY_ID > gpg-private-backup.asc"
echo "  3. Generate revocation certificate:"
echo "     gpg --gen-revoke $KEY_ID > revocation-cert.asc"
echo ""
echo "All your commits will now be signed automatically! 🚀"
echo ""

