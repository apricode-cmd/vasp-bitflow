#!/bin/bash

# Script to try common passwords for GPG key decryption
# Usage: bash try-passwords.sh

cd "$(dirname "$0")"

GPG_FILE="Sandbox_credentials.api (4).gpg"

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     🔓 TESTING COMMON PASSWORDS FOR GPG DECRYPTION               ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Common passwords to try
PASSWORDS=(
    ""
    "test"
    "admin"
    "bitflow"
    "123456"
    "password"
    "admin123"
    "test123"
    "bitflow123"
    "qwerty"
    "12345678"
    "111111"
)

echo "📋 Testing ${#PASSWORDS[@]} common passwords..."
echo ""

for PASS in "${PASSWORDS[@]}"; do
    if [ -z "$PASS" ]; then
        DISPLAY_PASS="[empty]"
    else
        DISPLAY_PASS="$PASS"
    fi
    
    echo -n "🔑 Trying: $DISPLAY_PASS ... "
    
    RESULT=$(echo "$PASS" | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 0 --decrypt "$GPG_FILE" 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ SUCCESS!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎉 DECRYPTED SUCCESSFULLY!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Passphrase was: $DISPLAY_PASS"
        echo ""
        echo "📄 DECRYPTED CONTENT:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "$RESULT"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "💾 Saving to credentials.txt..."
        echo "$RESULT" > credentials.txt
        echo "✅ Saved to: credentials.txt"
        echo ""
        exit 0
    else
        echo "❌"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ None of the common passwords worked"
echo ""
echo "💡 Next steps:"
echo ""
echo "1. Try to remember what password you used:"
echo "   • Your usual password?"
echo "   • Something related to bitflow/apricode?"
echo "   • Date-based? (20251124, november24, etc)"
echo ""
echo "2. Manually try with:"
echo "   gpg --decrypt \"$GPG_FILE\""
echo ""
echo "3. Reset passphrase (requires old passphrase):"
echo "   gpg --edit-key admin@bitflow.biz"
echo "   gpg> passwd"
echo "   gpg> save"
echo ""
echo "4. Contact BCB Support:"
echo "   Ask for credentials without encryption"
echo ""



