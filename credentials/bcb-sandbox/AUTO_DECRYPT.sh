#!/bin/bash

# =============================================================================
# 🔓 АВТОМАТИЧЕСКИЙ ПЕРЕБОР ПАРОЛЕЙ ДЛЯ РАСШИФРОВКИ BCB CREDENTIALS
# =============================================================================

set +e  # Не прерывать на ошибках

clear
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║          🔓 АВТОМАТИЧЕСКИЙ ПЕРЕБОР ПАРОЛЕЙ                                   ║"
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

echo "✅ Файл: $GPG_FILE"
echo "📂 Путь: $(pwd)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔐 Пробую различные варианты паролей..."
echo ""

# Массив возможных паролей
PASSWORDS=(
    ""
    "Apricode14789230)"
    "Apricode210521)"
    "apricode14789230)"
    "apricode210521)"
    "APRICODE14789230)"
    "APRICODE210521)"
    "admin@bitflow.biz"
    "Admin@bitflow.biz"
    "Bitflow2024"
    "Bitflow2025"
    "bitflow2024"
    "bitflow2025"
    "Bitflow@2024"
    "Bitflow@2025"
    "Apricode2024"
    "Apricode2025"
    "apricode2024"
    "apricode2025"
    "Apricode@2024"
    "Apricode@2025"
    "210521"
    "14789230"
    "210521)"
    "14789230)"
    "Bitflow"
    "bitflow"
    "Apricode"
    "apricode"
    "Bitflow123"
    "Apricode123"
    "Admin123"
    "admin123"
    "password"
    "Password"
    "PASSWORD"
    "12345678"
    "qwerty"
    "Qwerty123"
)

COUNTER=1
TOTAL=${#PASSWORDS[@]}

for PASS in "${PASSWORDS[@]}"; do
    if [ -z "$PASS" ]; then
        DISPLAY_PASS="<пустой пароль>"
    else
        DISPLAY_PASS="$PASS"
    fi
    
    printf "[$COUNTER/$TOTAL] 🔑 %-30s ... " "$DISPLAY_PASS"
    
    # Пробуем расшифровать
    RESULT=$(echo "$PASS" | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 0 --decrypt "$GPG_FILE" 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ SUCCESS!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎉 НАЙДЕН ПРАВИЛЬНЫЙ ПАРОЛЬ!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "🔐 Пароль: $DISPLAY_PASS"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📋 CREDENTIALS:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "$RESULT"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        # Сохраняем в файл
        SAVE_DIR="/Users/bogdankononenko/Работа/Development/Project/crm vasp/credentials/bcb-sandbox"
        echo "$RESULT" > "$SAVE_DIR/credentials.txt"
        echo "🔐 Пароль GPG: $DISPLAY_PASS" > "$SAVE_DIR/gpg-password.txt"
        
        echo "✅ Credentials сохранены:"
        echo "   • $SAVE_DIR/credentials.txt"
        echo "   • $SAVE_DIR/gpg-password.txt"
        echo ""
        echo "🚀 Теперь можно настроить BCB интеграцию в админ-панели!"
        echo ""
        
        exit 0
    else
        echo "❌"
    fi
    
    ((COUNTER++))
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ НИ ОДИН ПАРОЛЬ НЕ ПОДОШЁЛ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 ЧТО ДЕЛАТЬ:"
echo ""
echo "1️⃣  Попробуйте вспомнить пароль который вводили 24 ноября 2025"
echo ""
echo "2️⃣  Запустите интерактивный скрипт и введите пароль вручную:"
echo "   bash TRY_DECRYPT.sh"
echo ""
echo "3️⃣  Напишите BCB Support чтобы выслали credentials БЕЗ шифрования:"
echo "   cat EMAIL_TO_BCB_SUPPORT.txt"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 1


