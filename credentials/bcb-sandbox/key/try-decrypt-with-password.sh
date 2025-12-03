#!/bin/bash

# Интерактивный скрипт для попытки расшифровки с вводом пароля

clear
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║          🔓 ПОПЫТКА РАСШИФРОВКИ С ПАРОЛЕМ                                    ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""

cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp/credentials/bcb-sandbox/key"

echo "📂 Файл: bcb-sandbox-credentials.gpg"
echo ""
echo "🔐 Информация о ключе:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
gpg --list-secret-keys "admin@bitflow.biz (Bitflow)" 2>&1 | head -5
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 ПОДСКАЗКИ ДЛЯ ПАРОЛЯ (создан 24 ноября 2025):"
echo ""
echo "   • Ваш обычный пароль для проектов?"
echo "   • Комбинация с Bitflow/Apricode?"
echo "   • Пароль от GitHub/Git?"
echo "   • Что-то связанное с датами: 210521, 14789230?"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔓 Сейчас откроется окно для ввода пароля..."
echo ""
read -p "Нажмите ENTER чтобы продолжить..."
echo ""

# Запускаем расшифровку
gpg --decrypt bcb-sandbox-credentials.gpg

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 УСПЕХ! Credentials расшифрованы!"
    echo ""
    echo "Сохраняем в файл..."
    gpg --decrypt bcb-sandbox-credentials.gpg > credentials.txt 2>/dev/null
    
    echo "✅ Сохранено в: credentials.txt"
    echo ""
    echo "📋 Содержимое:"
    cat credentials.txt
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🚀 Теперь можно настроить BCB интеграцию!"
else
    echo "❌ Расшифровка не удалась (код: $EXIT_CODE)"
    echo ""
    echo "💡 РЕКОМЕНДАЦИЯ:"
    echo ""
    echo "1️⃣  Попробуйте еще раз с другим паролем"
    echo "2️⃣  Или отправьте BCB новый публичный ключ БЕЗ пароля:"
    echo ""
    echo "   cat ../test-gpg/bitflow-new-public-key.asc"
fi

echo ""


