#!/bin/bash

# =============================================================================
# 🔓 РАСШИФРОВКА CREDENTIALS ОТ BCB (БЕЗ ПАРОЛЯ)
# =============================================================================

clear
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║          🔓 РАСШИФРОВКА BCB CREDENTIALS (АВТОМАТИЧЕСКАЯ)                     ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Папка для credentials
CRED_DIR="/Users/bogdankononenko/Работа/Development/Project/crm vasp/credentials/bcb-sandbox"

echo "📂 Место для нового файла от BCB:"
echo "   $CRED_DIR"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 КОГДА ПОЛУЧИТЕ ФАЙЛ ОТ BCB:"
echo ""
echo "1️⃣  Сохраните файл .gpg в эту папку"
echo "2️⃣  Переименуйте в: bcb-credentials-new.gpg"
echo ""
echo "3️⃣  Запустите этот скрипт:"
echo "   bash decrypt-new-credentials.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Проверяем есть ли новый файл
if [ -f "$CRED_DIR/bcb-credentials-new.gpg" ]; then
    echo "✅ Файл найден: bcb-credentials-new.gpg"
    echo ""
    echo "🔓 Расшифровываю БЕЗ ПАРОЛЯ..."
    echo ""
    
    # Расшифровываем
    RESULT=$(gpg --batch --yes --quiet --decrypt "$CRED_DIR/bcb-credentials-new.gpg" 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎉 УСПЕХ! CREDENTIALS РАСШИФРОВАНЫ БЕЗ ПАРОЛЯ!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📋 CREDENTIALS:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "$RESULT"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        # Сохраняем
        echo "$RESULT" > "$CRED_DIR/credentials.txt"
        
        echo "✅ Credentials сохранены в: $CRED_DIR/credentials.txt"
        echo ""
        echo "🚀 Теперь можно настроить BCB интеграцию в админ-панели!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📋 Скопируйте credentials и дайте знать AI для настройки!"
        echo ""
    else
        echo "❌ Ошибка расшифровки:"
        echo "$RESULT"
        echo ""
        echo "💡 Убедитесь что файл зашифрован для ключа: BCB Bitflow Test"
    fi
else
    echo "⏳ Файл bcb-credentials-new.gpg еще не найден"
    echo ""
    echo "📥 ИНСТРУКЦИЯ:"
    echo ""
    echo "1. Когда BCB пришлёт .gpg файл"
    echo "2. Сохраните его как: $CRED_DIR/bcb-credentials-new.gpg"
    echo "3. Запустите: bash decrypt-new-credentials.sh"
    echo ""
    echo "✅ Расшифровка будет АВТОМАТИЧЕСКОЙ БЕЗ ПАРОЛЯ!"
fi

echo ""


