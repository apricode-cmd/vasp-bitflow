# KYC Resubmission Flow - Current State

## ✅ What Works:
1. Webhook correctly maps RED -> rejected
2. canResubmit flag set correctly
3. UI shows "Fix and Resubmit" button
4. Resubmit form opens and prefills data
5. POST /api/kyc/resubmit accepts data

## ❌ Problem:
After resubmit, user is redirected to SAME applicantId verification link.
SumSub blocks repeated verification for completed applicants.

## 🔧 Solution Options:

### Option 1: Reset applicant status (CURRENT ATTEMPT)
- POST /resources/applicants/{applicantId}/status/pending
- This SHOULD reopen the applicant for verification
- ISSUE: May not work if SumSub has strict policy

### Option 2: Create new applicant
- After resubmit, create NEW applicant with suffix: userId-retry1, userId-retry2
- Get fresh verification link
- Track all applicant IDs in KycSession

### Option 3: Use SumSub reset API
- DELETE /resources/applicants/{applicantId}/reset
- Completely resets applicant state
- Check if SumSub sandbox supports this

## 📝 Next Steps:
1. Test if requestReview actually reopens verification
2. Add logs to confirm SumSub API response
3. If Option 1 fails -> implement Option 2 (new applicant per retry)
