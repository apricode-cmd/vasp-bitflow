# 🎬 Promo Video - Filming Cheat Sheet

**Print this and keep next to you during recording!**

---

## 🔑 Login Credentials

### Client Account
```
URL: https://app.bitflow.biz/login
Email: demo.user@apricode.demo
Password: DemoSecure2024!
```

### Admin Account
```
URL: https://app.bitflow.biz/admin/login
Email: hello@apricode.agency
Password: (your admin password)
```

---

## 📋 Pre-Recording Checklist

- [ ] Run: `npx tsx scripts/prepare-promo-demo-data.ts`
- [ ] Start server or verify production is live
- [ ] Open Chrome (clean profile, no extensions)
- [ ] Window size: 1920x1080
- [ ] Enable "Do Not Disturb"
- [ ] Close all other apps
- [ ] Copy test data to clipboard:
  - BTC: `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`
  - ETH: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

---

## 🎯 Scene Quick Reference

| # | Scene | Time | URL | Key Action |
|---|-------|------|-----|------------|
| 1 | Opening | 0:00-0:08 | - | Logo animation |
| 2 | Problem | 0:08-0:15 | - | Competitor issues |
| 3 | Solution | 0:15-0:25 | `/` | Feature list |
| 4 | Register | 0:25-0:32 | `/register` | Sign up form |
| 5 | KYC | 0:32-0:45 | `/kyc` | Verification |
| 6 | IBAN | 0:45-0:58 | `/virtual-iban` | Premium card |
| 7 | Buy | 0:58-1:12 | `/buy` | Order widget |
| 8 | Payment | 1:12-1:22 | `/payment-details` | Instructions |
| 9 | Dashboard | 1:22-1:32 | `/dashboard` | Stats & orders |
| 10 | Admin | 1:32-1:42 | `/admin` | CRM features |
| 11 | Security | 1:42-1:50 | `/profile` | 2FA setup |
| 12 | CTA | 1:50-2:00 | - | Call to action |

---

## 📸 Scene-by-Scene Instructions

### Scene 4: Registration (7s)
1. Go to `/register`
2. Fill form:
   - Email: `john.doe@apricode.demo`
   - Password: `DemoSecure2024!`
   - First: `John`
   - Last: `Doe`
   - Phone: `+48 123 456 789`
3. Check terms
4. Click "Create Account"
5. Wait for success toast
6. Auto-redirect to dashboard

### Scene 5: KYC (13s) - OPTION A (Faster)
1. Go to `/dashboard`
2. Show green "Verified" badge
3. Briefly show KYC status card
4. Done!

### Scene 6: Virtual IBAN (8s)
1. Go to `/virtual-iban`
2. Show premium card
3. Hover IBAN copy button
4. Click copy → toast appears
5. Scroll to transactions
6. Done!

### Scene 7: Buy Crypto (14s)
1. Go to `/buy`
2. Select: **BTC** from dropdown
3. Enter: **0.1** BTC
4. Watch calculation update
5. Select payment: **SEPA**
6. Paste wallet: `bc1qxy...`
7. Wait for validation ✓
8. Click "Create Order"
9. Wait for success toast
10. Redirect to payment page

### Scene 9: Dashboard (10s)
1. Go to `/dashboard`
2. Show stats cards (2s)
3. Scroll to quick actions (1s)
4. Scroll to recent orders (3s)
5. Hover over order card
6. Hover "Buy Crypto" button
7. Done!

### Scene 10: Admin CRM (10s)
1. **Logout** from client
2. Go to `/admin/login`
3. Login with admin credentials
4. Show admin dashboard stats (3s)
5. Go to `/admin/orders`
6. Show Kanban board (3s)
7. Click on an order
8. Show order details (4s)
9. Done!

---

## 🎨 Visual Effects to Capture

### Hover Effects:
- Button hover-glow (primary buttons)
- Card hover-lift (dashboard cards)
- Scale effect (quick actions)

### Animations:
- Page transitions (animate-in)
- Toast notifications (sonner)
- Loading spinners
- Progress bars

### Glassmorphism:
- Cards (backdrop-blur-md)
- Headers
- Modals

---

## 🔧 Recording Settings

**Screen Recording:**
- Resolution: **1920x1080**
- FPS: **60**
- Format: **MP4 (H.264)**
- Quality: **High** (10Mbps)

**Camera Movement:**
- Default: **Static**
- Zoom only on key moments
- Smooth transitions

---

## ⚡ Quick Fixes

### Problem: Login fails
**Fix:** Check credentials, verify user in DB

### Problem: Virtual IBAN not showing
**Fix:** Check account exists, re-run demo script

### Problem: Orders not appearing
**Fix:** Re-run: `npx tsx scripts/prepare-promo-demo-data.ts`

### Problem: Real-time rates not updating
**Fix:** Check API keys, restart server

### Problem: Animations stuttering
**Fix:** Close other apps, reduce Chrome tabs

---

## 📝 Clipboard Copy-Paste Data

**Wallet Addresses:**
```
BTC:  bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
ETH:  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
USDT: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
SOL:  DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK
```

**User Data:**
```
Email: demo.user@apricode.demo
Password: DemoSecure2024!
First Name: John
Last Name: Doe
Phone: +48 123 456 789
Country: Poland
DOB: 1990-01-15
Address: ul. Marszałkowska 1
City: Warsaw
Postal: 00-001
```

---

## ✅ Post-Recording Checklist

- [ ] All 12 scenes recorded
- [ ] No visible errors or bugs
- [ ] All animations smooth
- [ ] Audio levels good (if recording VO)
- [ ] Backup copy saved
- [ ] Review footage before cleanup
- [ ] Delete demo data (optional)

---

## 📞 Emergency Contact

**Technical Issues:**
- Bohdan Kononenko
- Email: apricode.studio@gmail.com

---

**Good luck! 🎬 Make an amazing video! ✨**

