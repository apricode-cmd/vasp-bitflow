#!/bin/bash

# Docker Cleanup Script для Apricode CMS
# Безопасная очистка неиспользуемых ресурсов Docker

set -e

echo "🧹 Docker Cleanup Script"
echo "========================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода размера до и после
show_space() {
    echo -e "${YELLOW}Текущее использование:${NC}"
    docker system df
    echo ""
}

# Показываем текущее состояние
show_space

echo -e "${YELLOW}Что будет удалено:${NC}"
echo "1. Неиспользуемые образы (dangling images)"
echo "2. Остановленные контейнеры"
echo "3. Build cache старше 24 часов"
echo "4. Неиспользуемые networks"
echo ""
echo -e "${RED}ВАЖНО: Активные контейнеры и volumes НЕ будут удалены!${NC}"
echo ""

read -p "Продолжить? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Отменено."
    exit 1
fi

echo ""
echo "🗑️  Удаление остановленных контейнеров..."
docker container prune -f

echo ""
echo "🗑️  Удаление неиспользуемых образов..."
docker image prune -f

echo ""
echo "🗑️  Удаление неиспользуемых networks..."
docker network prune -f

echo ""
echo "🗑️  Удаление build cache (старше 24 часов)..."
docker builder prune -f --filter "until=24h"

echo ""
echo -e "${GREEN}✅ Очистка завершена!${NC}"
echo ""
show_space

echo ""
echo -e "${YELLOW}📝 Дополнительные команды:${NC}"
echo ""
echo "Агрессивная очистка (удалит ВСЕ неиспользуемые данные):"
echo "  docker system prune -a --volumes"
echo ""
echo "Удалить только build cache полностью:"
echo "  docker builder prune -a -f"
echo ""
echo "Удалить конкретный образ:"
echo "  docker rmi <IMAGE_ID>"



