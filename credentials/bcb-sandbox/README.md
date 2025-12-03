# BCB Group Sandbox Credentials

## 📁 Положите сюда файлы:

1. **gpg-private-key.asc** - Ваш приватный GPG ключ
2. **credentials.json** - OAuth credentials

### Формат credentials.json:

```json
{
  "environment": "sandbox",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "counterparty_id": "12345",
  "cid": "CID-XYZ789",
  "gpg_passphrase": "your_passphrase_if_any"
}
```

## ⚠️ Безопасность

Эта папка добавлена в `.gitignore` - ваши ключи НЕ попадут в git!

## 🧪 Тестирование

После добавления credentials запустите:
```bash
npm run test:bcb-auth
```

Или через TypeScript:
```bash
npx ts-node scripts/test-bcb-auth.ts
```





