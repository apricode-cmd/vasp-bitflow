#!/bin/bash

# Автоматический перебор паролей для расшифровки

set +e

clear
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║          🔓 АВТОМАТИЧЕСКИЙ ПЕРЕБОР ПАРОЛЕЙ                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""

cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp/credentials/bcb-sandbox/key"

# Расширенный список паролей
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
    "Bitflow!"
    "Apricode!"
    "Bitflow2025!"
    "Apricode2025!"
    "bitflow@admin"
    "apricode@admin"
    "BitflowAdmin"
    "ApricodeAdmin"
    "Bitflow24"
    "Apricode24"
    "Bitflow@123"
    "Apricode@123"
    "bitflow@123"
    "apricode@123"
    "21.05.21"
    "14.78.9230"
    "Bogdan2024"
    "Bogdan2025"
    "vasp2024"
    "vasp2025"
    "crm2024"
    "crm2025"
)

COUNTER=1
TOTAL=${#PASSWORDS[@]}

echo "📦 Файл: bcb-sandbox-credentials.gpg"
echo "🔐 Пробую $TOTAL вариантов паролей..."
echo ""

for PASS in "${PASSWORDS[@]}"; do
    if [ -z "$PASS" ]; then
        DISPLAY_PASS="<пустой>"
    else
        DISPLAY_PASS="$PASS"
    fi
    
    printf "[$COUNTER/$TOTAL] 🔑 %-35s ... " "$DISPLAY_PASS"
    
    # Пробуем расшифровать
    RESULT=$(echo "$PASS" | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 0 --decrypt "bcb-sandbox-credentials.gpg" 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ] && [ -n "$RESULT" ] && ! echo "$RESULT" | grep -q "failed"; then
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
        
        # Сохраняем
        SAVE_DIR="/Users/bogdankononenko/Работа/Development/Project/crm vasp/credentials/bcb-sandbox"
        echo "$RESULT" > "$SAVE_DIR/credentials.txt"
        echo "🔐 Пароль GPG: $DISPLAY_PASS" > "$SAVE_DIR/gpg-password.txt"
        
        echo "✅ Сохранено:"
        echo "   • $SAVE_DIR/credentials.txt"
        echo "   • $SAVE_DIR/gpg-password.txt"
        echo ""
        echo "🚀 Теперь можно настроить BCB интеграцию!"
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
echo "💡 РЕКОМЕНДАЦИЯ:"
echo ""
echo "Отправьте BCB Support новый публичный ключ (БЕЗ пароля):"
echo ""
echo "   cat ../test-gpg/bitflow-new-public-key.asc"
echo ""
echo "Они пришлют credentials заново и вы расшифруете БЕЗ ПАРОЛЯ!"
echo ""

exit 1


