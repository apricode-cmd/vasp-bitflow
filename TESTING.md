# Apricode Exchange - Testing Guide

Comprehensive guide for testing the Apricode Exchange MVP.

## Prerequisites

Before testing, ensure:
- PostgreSQL is running
- Database is seeded (`npm run db:seed`)
- Development server is running (`npm run dev`)
- All environment variables are configured in `.env.local`

## Test Accounts

### Admin Account
- **Email**: admin@apricode.io
- **Password**: SecureAdmin123!
- **Access**: Full platform management

### Test Client Account (KYC Approved)
- **Email**: client@test.com
- **Password**: TestClient123!
- **KYC Status**: APPROVED (can place orders)

## Testing Scenarios

### 1. User Registration & Authentication

#### Test Case 1.1: Successful Registration
1. Navigate to `/register`
2. Fill form with valid data:
   - First Name: John
   - Last Name: Doe
   - Email: john.doe@example.com
   - Phone: +48123456789
   - Country: PL
   - Password: TestUser123!
   - Confirm Password: TestUser123!
3. Click "Create Account"
4. **Expected**: Auto-login and redirect to `/dashboard`
5. **Verify**: User appears in database with CLIENT role

#### Test Case 1.2: Registration Validation
1. Try registering with:
   - Existing email → Error: "User with this email already exists"
   - Weak password → Password validation errors shown
   - Invalid email → Email format error
   - Mismatched passwords → "Passwords do not match"

#### Test Case 1.3: Login
1. Navigate to `/login`
2. Login with test client credentials
3. **Expected**: Redirect to `/dashboard`
4. **Verify**: Session created, user data available

#### Test Case 1.4: Logout
1. While logged in, click logout icon in header
2. **Expected**: Redirect to `/` (landing page)
3. **Verify**: Session destroyed, protected routes inaccessible

### 2. KYC Verification Flow

#### Test Case 2.1: KYC Not Started
1. Login as newly registered user
2. Navigate to `/kyc`
3. **Expected**: "Start Verification" button displayed
4. **Verify**: Warning shown on dashboard about KYC requirement

#### Test Case 2.2: Start KYC
1. On `/kyc` page, click "Start Verification"
2. **Expected**: 
   - KYC session created in database with PENDING status
   - Status changed to "Under Review"
3. **Verify**: Check database for `kyc_sessions` table entry

#### Test Case 2.3: KYC Required for Orders
1. As user with PENDING or no KYC, try to access `/buy`
2. Attempt to create order via API
3. **Expected**: Error "KYC verification must be approved"

#### Test Case 2.4: KYC Webhook (Manual Simulation)
To test webhook (requires KYCAID sandbox):
1. Simulate APPROVED webhook:
```bash
curl -X POST http://localhost:3000/api/kyc/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: YOUR_SIGNATURE" \
  -d '{"verification_id":"test-id","verification_status":"completed","external_applicant_id":"USER_ID"}'
```

### 3. Exchange Rates

#### Test Case 3.1: Fetch Rates
1. Make request: `GET /api/rates`
2. **Expected**: JSON with BTC, ETH, USDT, SOL rates for EUR and PLN
3. **Verify**: 
   - All rates are numbers > 0
   - `updatedAt` timestamp present
   - `feePercentage` = 0.015

#### Test Case 3.2: Rate Caching
1. Fetch rates twice within 30 seconds
2. **Verify**: Same `updatedAt` timestamp (cached)
3. Wait 30 seconds, fetch again
4. **Verify**: New `updatedAt` timestamp (refreshed)

### 4. Order Creation & Management

#### Test Case 4.1: Create Order (Success)
1. Login as `client@test.com` (KYC APPROVED)
2. Navigate to `/buy`
3. Fill order form:
   - Cryptocurrency: BTC
   - Pay With: EUR
   - Amount: 0.01
   - Wallet Address: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
4. Click "Create Order"
5. **Expected**:
   - Redirect to order detail page
   - Order created with PENDING status
   - Bank details displayed
   - Total calculated with 1.5% fee
6. **Verify**: Order in database with correct calculations

#### Test Case 4.2: Order Validation
Test various invalid inputs:
- Invalid wallet address → "Invalid wallet address format"
- Amount below min (e.g., 0.0001 BTC) → "Minimum amount is..."
- Amount above max → "Maximum amount is..."
- Empty wallet address → Validation error

#### Test Case 4.3: View Orders List
1. Navigate to `/orders`
2. **Expected**: List of user's orders with:
   - Currency and amount
   - Total fiat amount
   - Status badge
   - Creation date
   - "View Details" button

#### Test Case 4.4: View Order Details
1. Click on any order from list
2. **Expected**: Detailed page showing:
   - Order summary
   - Wallet address (with copy button)
   - Bank details (for PENDING orders)
   - Payment instructions
   - Status badge
3. **Verify**: Can only view own orders (403 for others)

### 5. Admin Panel

#### Test Case 5.1: Admin Access Control
1. Login as regular CLIENT user
2. Try to access `/admin`
3. **Expected**: Redirect to `/dashboard`
4. Try API call: `GET /api/admin/stats`
5. **Expected**: 403 Forbidden

#### Test Case 5.2: Admin Dashboard
1. Login as admin (`admin@apricode.io`)
2. Navigate to `/admin`
3. **Expected**: Dashboard with:
   - Total orders count
   - Total users count
   - Pending KYC count
   - Total volume (EUR)
   - Recent orders list
   - Quick action buttons

#### Test Case 5.3: Admin Orders Management
1. Navigate to `/admin/orders`
2. **Expected**: List all orders from all users
3. Apply status filter (e.g., PENDING)
4. **Verify**: Only filtered orders shown
5. Click "Mark Processing" on PENDING order
6. **Expected**: Status updated to PROCESSING
7. **Verify**: Database updated, user notified (if emails enabled)

#### Test Case 5.4: Admin KYC Management
1. Navigate to `/admin/kyc`
2. **Expected**: List of all KYC sessions
3. Apply status filter (PENDING)
4. **Verify**: Can view user details
5. Click "View in KYCAID" (if verificationId present)

#### Test Case 5.5: Admin Settings
1. Navigate to `/admin/settings`
2. **Expected**: Display:
   - Platform fee (1.5%)
   - Bank details for EUR and PLN
   - Supported cryptocurrencies with limits
   - Active/inactive status indicators

### 6. Security Tests

#### Test Case 6.1: Route Protection
Test access to protected routes without auth:
- `/dashboard` → Redirect to `/login`
- `/buy` → Redirect to `/login`
- `/orders` → Redirect to `/login`
- `/admin` → Redirect to `/login`

#### Test Case 6.2: API Authorization
Without auth token:
- `GET /api/orders` → 401 Unauthorized
- `POST /api/orders` → 401 Unauthorized
- `GET /api/admin/stats` → 401 Unauthorized

#### Test Case 6.3: Resource Ownership
1. Login as user A, create order
2. Note order ID
3. Login as user B
4. Try to access user A's order: `GET /orders/{A_ORDER_ID}`
5. **Expected**: Redirect or 403 Forbidden

#### Test Case 6.4: SQL Injection Prevention
Try SQL injection in forms:
- Email: `admin@test.com'; DROP TABLE users; --`
- **Expected**: Treated as string, Prisma prevents injection

#### Test Case 6.5: XSS Prevention
Try XSS in order wallet address:
- Wallet: `<script>alert('XSS')</script>`
- **Expected**: React automatically escapes, no script execution

### 7. Performance & Edge Cases

#### Test Case 7.1: Concurrent Orders
1. Create multiple orders quickly (5+ orders)
2. **Verify**: All orders created with unique IDs
3. Check rate consistency across orders

#### Test Case 7.2: Large Numbers
1. Create order with max amount (e.g., 10 BTC)
2. **Verify**: Calculations accurate (no floating point errors)
3. **Verify**: Total doesn't exceed limits

#### Test Case 7.3: Network Failure Simulation
1. Disconnect internet
2. Try to create order
3. **Expected**: Error toast shown
4. Reconnect internet
5. Retry order creation
6. **Expected**: Works normally

### 8. UI/UX Tests

#### Test Case 8.1: Responsive Design
Test on different screen sizes:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)
**Verify**: All pages readable and functional

#### Test Case 8.2: Form Validation Feedback
1. Submit forms with errors
2. **Verify**: Red error messages below fields
3. **Verify**: Field highlights in red
4. Fix errors and resubmit
5. **Verify**: Success feedback shown

#### Test Case 8.3: Loading States
1. Create order (with slow network simulation)
2. **Verify**: Loading spinner shown
3. **Verify**: Button disabled during loading
4. **Verify**: "Creating Order..." text shown

#### Test Case 8.4: Toast Notifications
Test toast messages for:
- Successful actions (green)
- Errors (red)
- Info messages (blue)
**Verify**: Toasts auto-dismiss after 3-5 seconds

## Automated Testing Checklist

### API Endpoints
- [ ] `POST /api/auth/register` - Registration
- [ ] `POST /api/auth/[...nextauth]` - Login
- [ ] `GET /api/kyc/status` - KYC status
- [ ] `POST /api/kyc/start` - Start KYC
- [ ] `POST /api/kyc/webhook` - KYCAID webhook
- [ ] `GET /api/rates` - Exchange rates
- [ ] `POST /api/orders` - Create order
- [ ] `GET /api/orders` - List orders
- [ ] `GET /api/orders/[id]` - Order details
- [ ] `GET /api/admin/stats` - Admin stats
- [ ] `GET /api/admin/orders` - Admin orders list
- [ ] `PATCH /api/admin/orders/[id]` - Update order
- [ ] `GET /api/admin/kyc` - Admin KYC list

### Database Operations
- [ ] User creation and hashing
- [ ] Profile creation
- [ ] KYC session creation
- [ ] Order creation with calculations
- [ ] Order status updates
- [ ] Currency and bank details retrieval

### Business Logic
- [ ] Fee calculation (1.5%)
- [ ] Order total calculation
- [ ] Min/max amount validation
- [ ] Wallet address format validation
- [ ] KYC approval requirement
- [ ] Role-based authorization

## Bug Report Template

When you find a bug, report it with:

```
**Title**: Short description

**Priority**: High/Medium/Low

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:


**Actual Result**:


**Screenshots**: (if applicable)

**Environment**:
- Browser: 
- OS: 
- User Role: 
```

## Test Results Summary

After testing, record results:

| Test Area | Total Tests | Passed | Failed | Blocked |
|-----------|-------------|--------|--------|---------|
| Authentication | | | | |
| KYC Flow | | | | |
| Orders | | | | |
| Admin Panel | | | | |
| Security | | | | |
| **Total** | | | | |

## Notes

- Test with multiple browsers (Chrome, Firefox, Safari)
- Test with different user roles simultaneously
- Monitor browser console for errors
- Check network tab for API responses
- Review server logs for backend errors

---

**Happy Testing! 🧪**

