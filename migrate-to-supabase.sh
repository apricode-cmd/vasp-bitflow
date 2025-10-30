#!/bin/bash

# Скрипт для миграции Prisma в Supabase
# Использование: ./migrate-to-supabase.sh

echo "🚀 Миграция Prisma в Supabase"
echo ""

# Проверка что DATABASE_URL установлен
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Ошибка: DATABASE_URL не установлен"
    echo ""
    echo "Установи DATABASE_URL:"
    echo "export DATABASE_URL='postgresql://postgres.xxx:password@...'"
    exit 1
fi

echo "📊 DATABASE_URL установлен"
echo ""

# 1. Применить миграции
echo "1️⃣ Применение Prisma миграций..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при применении миграций"
    exit 1
fi

echo "✅ Миграции применены успешно"
echo ""

# 2. Генерация Prisma Client
echo "2️⃣ Генерация Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при генерации Prisma Client"
    exit 1
fi

echo "✅ Prisma Client сгенерирован"
echo ""

# 3. Seed (опционально)
read -p "3️⃣ Заполнить базу начальными данными (seed)? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Запуск seed..."
    npx prisma db seed
    
    if [ $? -ne 0 ]; then
        echo "⚠️ Ошибка при seed (может быть нормально если данные уже есть)"
    else
        echo "✅ Seed выполнен успешно"
    fi
fi

echo ""
echo "🎉 Миграция завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Добавь DATABASE_URL в Vercel Environment Variables"
echo "2. Redeploy проект на Vercel"

