#!/bin/bash

# =============================================================================
# 🔑 СОЗДАНИЕ ТЕСТОВОГО GPG КЛЮЧА БЕЗ ПАРОЛЯ
# =============================================================================

clear
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║          🔑 ТЕСТОВОЕ СОЗДАНИЕ GPG КЛЮЧА БЕЗ ПАРОЛЯ                           ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Создаём новый GPG ключ для BCB Group"
echo ""
echo "⚠️  ВАЖНО: Когда попросит passphrase - просто нажимайте ENTER (пустой пароль)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Нажмите ENTER чтобы начать..."
echo ""

# Создаём ключ с параметрами
cat << 'EOF' | gpg --batch --generate-key
%no-protection
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: BCB Bitflow Test
Name-Email: admin@bitflow.biz
Expire-Date: 0
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ КЛЮЧ СОЗДАН!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Получаем Key ID
    KEY_ID=$(gpg --list-secret-keys --keyid-format=long "admin@bitflow.biz" 2>/dev/null | grep "BCB Bitflow Test" -A 1 | grep sec | awk '{print $2}' | cut -d'/' -f2)
    
    if [ -n "$KEY_ID" ]; then
        echo "🔑 Key ID: $KEY_ID"
        echo ""
        
        # Экспортируем публичный ключ
        OUTPUT_DIR="/Users/bogdankononenko/Работа/Development/Project/crm vasp/credentials/bcb-sandbox/test-gpg"
        gpg --armor --export "$KEY_ID" > "$OUTPUT_DIR/test-public-key.asc"
        
        echo "✅ Публичный ключ экспортирован в:"
        echo "   $OUTPUT_DIR/test-public-key.asc"
        echo ""
        
        # Тестируем шифрование/расшифровку БЕЗ пароля
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🧪 ТЕСТ: Шифрование и расшифровка БЕЗ пароля..."
        echo ""
        
        # Создаём тестовое сообщение
        TEST_MSG="Test credentials from BCB Group: client_id=test123, client_secret=secret456"
        
        # Шифруем
        ENCRYPTED=$(echo "$TEST_MSG" | gpg --encrypt --armor --recipient "$KEY_ID" 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            echo "✅ Шифрование работает"
            
            # Расшифровываем БЕЗ пароля
            DECRYPTED=$(echo "$ENCRYPTED" | gpg --decrypt --batch --yes --quiet 2>/dev/null)
            
            if [ $? -eq 0 ]; then
                echo "✅ Расшифровка БЕЗ пароля работает!"
                echo ""
                echo "📋 Расшифрованное сообщение:"
                echo "$DECRYPTED"
                echo ""
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "🎉 УСПЕХ! Ключ БЕЗ пароля работает отлично!"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""
                echo "📧 ТЕПЕРЬ МОЖНО:"
                echo ""
                echo "1️⃣  Отправить BCB новый публичный ключ:"
                echo "   cat $OUTPUT_DIR/test-public-key.asc"
                echo ""
                echo "2️⃣  Попросить BCB пере-зашифровать credentials новым ключом"
                echo ""
                echo "3️⃣  Расшифровать БЕЗ ПАРОЛЯ когда получите!"
                echo ""
            else
                echo "❌ Расшифровка не удалась"
            fi
        else
            echo "❌ Шифрование не удалось"
        fi
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📋 ИНФОРМАЦИЯ О КЛЮЧЕ:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        gpg --list-keys "BCB Bitflow Test"
        echo ""
        
    else
        echo "❌ Не удалось найти созданный ключ"
    fi
else
    echo ""
    echo "❌ Ошибка создания ключа"
fi

echo ""


