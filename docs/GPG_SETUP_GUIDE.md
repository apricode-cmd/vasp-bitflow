# GPG Setup Guide for Git Commit Signing

**Date:** 2025-11-22  
**Purpose:** Настройка GPG для подписи коммитов и интеграций

---

## 🔐 Step 1: Generate GPG Key

### Запустите команду:
```bash
gpg --full-generate-key
```

### Ответьте на вопросы:

1. **Please select what kind of key you want:**
   ```
   > 1 (RSA and RSA) - по умолчанию
   ```

2. **What keysize do you want?**
   ```
   > 4096 (максимальный размер для безопасности)
   ```

3. **Key is valid for?**
   ```
   > 0 (key does not expire) - или 2y (2 года)
   Рекомендую: 2y
   ```

4. **Is this correct?**
   ```
   > y
   ```

5. **Real name:**
   ```
   > Bogdan Kononenko (или ваше имя)
   ```

6. **Email address:**
   ```
   > ваш email (тот же, что в git config)
   ```
   
   **Важно:** Используйте email, который привязан к GitHub/GitLab!

7. **Comment:**
   ```
   > Apricode Exchange Development (опционально)
   ```

8. **Change (N)ame, (C)omment, (E)mail or (O)kay/(Q)uit?**
   ```
   > O (okay)
   ```

9. **Введите passphrase** (сильный пароль)
   - Сохраните его в безопасном месте!

---

## 🔍 Step 2: Get Your GPG Key ID

```bash
gpg --list-secret-keys --keyid-format=long
```

**Output:**
```
/Users/username/.gnupg/pubring.kbx
----------------------------------
sec   rsa4096/3AA5C34371567BD2 2025-11-22 [SC] [expires: 2027-11-22]
      1234567890ABCDEF1234567890ABCDEF12345678
uid                 [ultimate] Bogdan Kononenko <email@example.com>
ssb   rsa4096/4BB6D45482678CE3 2025-11-22 [E] [expires: 2027-11-22]
```

**Your GPG Key ID:** `3AA5C34371567BD2` (после `rsa4096/`)

---

## ⚙️ Step 3: Configure Git to Use GPG

### 1. Set GPG key for signing:
```bash
git config --global user.signingkey 3AA5C34371567BD2
```

### 2. Enable commit signing by default:
```bash
git config --global commit.gpgsign true
```

### 3. Enable tag signing:
```bash
git config --global tag.gpgsign true
```

### 4. Set GPG program (if needed):
```bash
git config --global gpg.program gpg
```

### 5. Verify settings:
```bash
git config --global --get user.signingkey
git config --global --get commit.gpgsign
```

---

## 📤 Step 4: Export Public Key

### For GitHub:
```bash
gpg --armor --export 3AA5C34371567BD2
```

**Output:**
```
-----BEGIN PGP PUBLIC KEY BLOCK-----

mQINBGZxxx...
...много строк...
...закончится на:
=xxxx
-----END PGP PUBLIC KEY BLOCK-----
```

**Скопируйте весь output (включая BEGIN и END строки).**

---

## 🌐 Step 5: Add to GitHub/GitLab

### GitHub:
1. Go to: https://github.com/settings/keys
2. Click: **New GPG key**
3. Paste your public key
4. Click: **Add GPG key**

### GitLab:
1. Go to: https://gitlab.com/-/profile/gpg_keys
2. Click: **Add new key**
3. Paste your public key
4. Click: **Add key**

---

## ✅ Step 6: Test Signing

```bash
cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp"

# Create a test commit
echo "test" > test.txt
git add test.txt
git commit -m "test: GPG signing"

# Verify signature
git log --show-signature -1
```

**Expected output:**
```
gpg: Signature made ... using RSA key 3AA5C34371567BD2
gpg: Good signature from "Bogdan Kononenko <email@example.com>" [ultimate]
```

**На GitHub увидите:** ✅ **Verified** badge на коммите

---

## 🔧 Troubleshooting

### Problem: `gpg: signing failed: Inappropriate ioctl for device`

**Solution:**
```bash
export GPG_TTY=$(tty)
echo 'export GPG_TTY=$(tty)' >> ~/.zshrc
```

### Problem: `gpg: signing failed: No secret key`

**Solution:**
```bash
# Check key exists
gpg --list-secret-keys

# Set correct key ID
git config --global user.signingkey YOUR_KEY_ID
```

### Problem: Passphrase prompt not showing

**Solution:**
```bash
# Install pinentry for Mac
brew install pinentry-mac

# Configure GPG to use it
echo "pinentry-program /opt/homebrew/bin/pinentry-mac" >> ~/.gnupg/gpg-agent.conf

# Restart gpg-agent
gpgconf --kill gpg-agent
```

### Problem: Key expired

**Solution:**
```bash
# Edit key
gpg --edit-key 3AA5C34371567BD2

# In GPG prompt:
gpg> expire
# Choose new expiration
gpg> save

# Update public key on GitHub/GitLab
```

---

## 🔐 Security Best Practices

1. **Backup your key:**
   ```bash
   # Export private key (KEEP SECURE!)
   gpg --export-secret-keys --armor 3AA5C34371567BD2 > gpg-private-key-backup.asc
   
   # Store in password manager or secure location
   ```

2. **Backup revocation certificate:**
   ```bash
   gpg --gen-revoke 3AA5C34371567BD2 > revocation-certificate.asc
   ```

3. **Use strong passphrase:**
   - Minimum 20 characters
   - Mix of letters, numbers, symbols
   - Store in password manager

4. **Revoke if compromised:**
   ```bash
   gpg --import revocation-certificate.asc
   gpg --keyserver keys.openpgp.org --send-keys 3AA5C34371567BD2
   ```

---

## 📋 Quick Reference

### List all keys:
```bash
gpg --list-keys
```

### Delete key:
```bash
gpg --delete-secret-key 3AA5C34371567BD2
gpg --delete-key 3AA5C34371567BD2
```

### Import key from backup:
```bash
gpg --import gpg-private-key-backup.asc
```

### Change passphrase:
```bash
gpg --edit-key 3AA5C34371567BD2
gpg> passwd
gpg> save
```

### Sign a file:
```bash
gpg --sign file.txt
```

### Verify signature:
```bash
gpg --verify file.txt.gpg
```

---

## 🎯 For Next Integration

После настройки GPG, все ваши коммиты будут автоматически подписаны:

```bash
git commit -m "feat: add new integration"
# Automatically signed with GPG!
```

GitHub/GitLab будут показывать **Verified** badge ✅ для всех подписанных коммитов.

---

## ✅ Checklist

- [ ] GPG key generated (`gpg --full-generate-key`)
- [ ] Key ID obtained (`gpg --list-secret-keys`)
- [ ] Git configured (`git config --global user.signingkey`)
- [ ] Commit signing enabled (`git config --global commit.gpgsign true`)
- [ ] Public key exported (`gpg --armor --export`)
- [ ] Public key added to GitHub/GitLab
- [ ] Test commit created and verified
- [ ] Private key backed up securely
- [ ] Revocation certificate generated
- [ ] `GPG_TTY` added to shell config

---

**Ready to sign commits!** 🚀

