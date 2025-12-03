#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     🔐 CREATING NEW GPG KEY FOR BCB (NO PASSPHRASE)             ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Generate GPG key without passphrase
cat > gpg-gen-config << GPGEOF
%echo Generating GPG key for BCB...
Key-Type: RSA
Key-Length: 4096
Name-Real: Bitflow BCB Integration
Name-Email: bcb@bitflow.biz
Expire-Date: 2y
%no-protection
%commit
%echo Done
GPGEOF

echo "📋 Generating GPG key (this may take a moment)..."
echo ""

gpg --batch --generate-key gpg-gen-config 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ GPG KEY CREATED SUCCESSFULLY!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Get key ID
    KEY_ID=$(gpg --list-secret-keys --keyid-format=long bcb@bitflow.biz 2>/dev/null | grep 'sec' | awk '{print $2}' | cut -d'/' -f2 | head -1)
    
    echo "🔑 Key ID: $KEY_ID"
    echo ""
    
    # Export public key
    echo "📤 Exporting public key..."
    gpg --armor --export bcb@bitflow.biz > bcb-public-key-NEW.asc
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 PUBLIC KEY (copy this and send to BCB Support):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    cat bcb-public-key-NEW.asc
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Public key also saved to: bcb-public-key-NEW.asc"
    echo ""
    echo "📧 NEXT STEPS:"
    echo ""
    echo "1. Copy the PUBLIC KEY above (entire block)"
    echo ""
    echo "2. Reply to BCB Support:"
    echo ""
    echo "   Subject: Re: Sandbox Credentials - New GPG Key"
    echo ""
    echo "   Hello,"
    echo ""
    echo "   I created a new GPG key for decryption. Please re-encrypt"
    echo "   the sandbox credentials using this new public key:"
    echo ""
    echo "   [PASTE PUBLIC KEY HERE]"
    echo ""
    echo "   Email: bcb@bitflow.biz"
    echo "   Key ID: $KEY_ID"
    echo ""
    echo "   Thank you!"
    echo ""
    echo "3. Wait for BCB to send re-encrypted file"
    echo ""
    echo "4. Decrypt it (will work WITHOUT passphrase this time!)"
    echo ""
else
    echo ""
    echo "❌ Failed to generate key"
fi

rm -f gpg-gen-config

