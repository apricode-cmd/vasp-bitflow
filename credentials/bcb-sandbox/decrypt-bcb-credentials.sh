#!/bin/bash

# BCB Group Credentials Decryptor
# Расшифровывает файл Sandbox_credentials.api (4).gpg

cd "$(dirname "$0")/../credentials/bcb-sandbox"

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     🔓 РАСШИФРОВКА BCB GROUP SANDBOX CREDENTIALS                 ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Проверка наличия файла
if [ ! -f "Sandbox_credentials.api (4).gpg" ]; then
    echo "❌ Файл Sandbox_credentials.api (4).gpg не найден!"
    exit 1
fi

echo "📋 Файл найден: Sandbox_credentials.api (4).gpg"
echo "🔑 Ключ для расшифровки: admin@bitflow.biz"
echo ""
echo "⚠️  ВНИМАНИЕ: Сейчас откроется prompt для ввода passphrase"
echo "   Если вы не знаете passphrase - попробуйте пустой (просто Enter)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Расшифровка
gpg --decrypt "Sandbox_credentials.api (4).gpg" > credentials-decrypted.txt 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Расшифровка успешна!"
    echo ""
    echo "📄 Содержимое credentials:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat credentials-decrypted.txt
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💾 Файл сохранен: credentials-decrypted.txt"
    echo ""
    echo "📋 Скопируйте эти данные в админ-панель:"
    echo "   → http://localhost:3000/admin/integrations"
    echo "   → Configure 'BCB Group Virtual IBAN'"
    echo ""
else
    echo ""
    echo "❌ Расшифровка не удалась"
    echo ""
    echo "💡 Возможные причины:"
    echo "   • Неправильный passphrase"
    echo "   • Приватный ключ не импортирован"
    echo "   • Файл поврежден"
    echo ""
    echo "🔧 Попробуйте:"
    echo "   1. Проверьте есть ли приватный ключ:"
    echo "      gpg --list-secret-keys admin@bitflow.biz"
    echo ""
    echo "   2. Если нет - импортируйте:"
    echo "      gpg --import gpg-private-key-bitflow.asc"
    echo ""
    echo "   3. Попробуйте снова:"
    echo "      ./decrypt-bcb-credentials.sh"
    echo ""
fi





