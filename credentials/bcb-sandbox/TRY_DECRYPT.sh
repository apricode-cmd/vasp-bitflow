#!/bin/bash

# =============================================================================
# 🔓 ИНТЕРАКТИВНАЯ РАСШИФРОВКА BCB CREDENTIALS
# =============================================================================

clear
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║              🔓 РАСШИФРОВКА BCB CREDENTIALS (ИНТЕРАКТИВНО)                   ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""

cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp/credentials/bcb-sandbox/key" || {
    cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp/credentials/bcb-sandbox" || exit 1
}

# Найдем файл
GPG_FILE=""
if [ -f "Sandbox_credentials.api (4) (1).gpg" ]; then
    GPG_FILE="Sandbox_credentials.api (4) (1).gpg"
elif [ -f "Sandbox_credentials.api (4).gpg" ]; then
    GPG_FILE="Sandbox_credentials.api (4).gpg"
else
    echo "❌ GPG файл не найден!"
    exit 1
fi

echo "✅ Найден файл: $GPG_FILE"
echo "📂 Директория: $(pwd)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔐 Введите пароль от GPG ключа admin@bitflow.biz"
echo "   (Или нажмите ENTER чтобы попробовать БЕЗ пароля)"
echo ""
read -s -p "Пароль: " PASSWORD
echo ""
echo ""
echo "⏳ Расшифровываю..."
echo ""

# Попробуем расшифровать
RESULT=$(echo "$PASSWORD" | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 0 --decrypt "$GPG_FILE" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 УСПЕХ! CREDENTIALS РАСШИФРОВАНЫ!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "$RESULT"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Сохраним в файл
    echo "$RESULT" > credentials.txt
    echo "✅ Credentials сохранены в: $(pwd)/credentials.txt"
    echo ""
    echo "📋 Теперь можно:"
    echo "   • Скопировать содержимое в админ-панель CRM"
    echo "   • Или дать команду Cursor AI для настройки интеграции"
    echo ""
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ НЕ УДАЛОСЬ РАСШИФРОВАТЬ"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Ошибка:"
    echo "$RESULT"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 ПОПРОБУЙТЕ:"
    echo ""
    echo "1️⃣  Еще раз запустить скрипт с другим паролем:"
    echo "   bash TRY_DECRYPT.sh"
    echo ""
    echo "2️⃣  Проверить macOS Keychain:"
    echo "   ⌘+Space → 'Keychain Access' → Поиск 'gpg'"
    echo ""
    echo "3️⃣  Попробовать стандартные пароли проекта:"
    echo "   • Apricode14789230)"
    echo "   • Apricode210521)"
    echo "   • admin@bitflow.biz"
    echo "   • Bitflow2024"
    echo ""
    echo "4️⃣  Написать BCB Support для пересылки credentials:"
    echo "   cat EMAIL_TO_BCB_SUPPORT.txt"
    echo ""
fi

echo ""


