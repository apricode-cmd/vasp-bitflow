# 🧹 Project Cleanup Instructions

## 📋 Что будет сделано

Скрипт безопасно организует ваш проект:

### ✅ Будет перемещено:
- **169+ MD файлов** → `docs/current/` или `docs/archive/`
- **30+ test скриптов** → `scripts/tests/`
- **15 backup файлов** → `backups/database/`
- **52 SQL файла** → `prisma/manual/archive/`

### 🗑️ Будет удалено:
- Log файлы (build.log, server.log и т.д.)
- Temporary файлы
- Build artifacts

---

## 🚀 Как запустить

```bash
# 1. Сделать скрипт исполняемым
chmod +x scripts/cleanup-project.sh

# 2. Запустить
./scripts/cleanup-project.sh
```

---

## ✅ Готовы начать? 

**Запустите:** `./scripts/cleanup-project.sh` 🚀
