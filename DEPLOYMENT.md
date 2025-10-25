# Apricode Exchange - Deployment Guide

Step-by-step guide for deploying Apricode Exchange to production.

## Prerequisites

- Vercel account (https://vercel.com)
- Supabase account for PostgreSQL (https://supabase.com)
- Domain name (optional)
- KYCAID production API keys
- Resend production API key

## 1. Database Setup (Supabase)

### 1.1 Create Supabase Project
1. Log in to Supabase
2. Click "New Project"
3. Enter project details:
   - Name: apricode-exchange-prod
   - Database Password: (generate strong password)
   - Region: (closest to your users)
4. Wait for project to be created (~2 minutes)

### 1.2 Get Database Connection String
1. Go to Project Settings → Database
2. Copy "Connection string" (URI mode)
3. Replace `[YOUR-PASSWORD]` with your actual password
4. Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

### 1.3 Configure Database
1. In Supabase SQL Editor, run:
```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 2. Vercel Deployment

### 2.1 Prepare Repository
1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit - Apricode Exchange MVP"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2.2 Import to Vercel
1. Log in to Vercel
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 2.3 Environment Variables
Add all environment variables in Vercel dashboard:

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@[SUPABASE_HOST]:5432/postgres

# NextAuth (Generate new secret with: openssl rand -base64 32)
NEXTAUTH_SECRET=<generate-strong-secret>
NEXTAUTH_URL=https://your-domain.vercel.app

# KYCAID Production
KYCAID_API_KEY=<production-api-key>
KYCAID_FORM_ID=<production-form-id>
KYCAID_WEBHOOK_SECRET=<production-webhook-secret>
KYCAID_BASE_URL=https://api.kycaid.com

# CoinGecko
COINGECKO_API_URL=https://api.coingecko.com/api/v3

# Resend Production
RESEND_API_KEY=<production-api-key>
EMAIL_FROM=noreply@yourdomain.com

# Admin Account
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-production-password>

# Platform
PLATFORM_FEE=0.015
NODE_ENV=production
```

### 2.4 Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Note your deployment URL

## 3. Database Migration

### 3.1 Run Migrations
From your local machine:

```bash
# Set DATABASE_URL to production
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[SUPABASE_HOST]:5432/postgres"

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### 3.2 Seed Production Data
```bash
# Update seed script if needed for production
npm run db:seed
```

**Important**: Change admin password after first login!

## 4. External Services Configuration

### 4.1 KYCAID Setup
1. Log in to KYCAID dashboard
2. Create production verification form
3. Configure webhook URL: `https://your-domain.vercel.app/api/kyc/webhook`
4. Copy webhook secret
5. Test webhook with KYCAID's test tool

### 4.2 Resend Email Setup
1. Log in to Resend
2. Verify your sending domain
3. Create API key for production
4. Configure DNS records (SPF, DKIM, DMARC)
5. Test email sending

### 4.3 Domain Configuration (Optional)
1. In Vercel dashboard, go to Domains
2. Add your custom domain
3. Configure DNS records:
   - A record: points to Vercel IP
   - CNAME: www → your-project.vercel.app
4. Wait for SSL certificate provisioning

## 5. Security Checklist

### Pre-Deployment
- [ ] All secrets are in environment variables (not code)
- [ ] Strong NEXTAUTH_SECRET generated
- [ ] Strong admin password set
- [ ] `.env*` files in `.gitignore`
- [ ] Production database has backups enabled
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] CORS configured (if needed)
- [ ] Rate limiting enabled (optional)

### Post-Deployment
- [ ] Test login/registration
- [ ] Test KYC webhook
- [ ] Test order creation
- [ ] Test email notifications
- [ ] Test admin panel access
- [ ] Change default admin password
- [ ] Enable Supabase point-in-time recovery
- [ ] Set up monitoring (Vercel Analytics)
- [ ] Configure error tracking (Sentry, optional)

## 6. Post-Deployment Tasks

### 6.1 Verify Deployment
1. Visit your production URL
2. Check all pages load correctly
3. Test user registration
4. Test login with admin account
5. Create test order
6. Verify emails are sent

### 6.2 Admin Configuration
1. Login as admin
2. Navigate to Settings
3. Verify bank details are correct
4. Verify currency limits are appropriate
5. Test KYC webhook (KYCAID test mode)

### 6.3 Monitoring Setup
1. In Vercel dashboard, enable:
   - Analytics
   - Speed Insights
   - Web Vitals
2. Set up uptime monitoring (UptimeRobot, etc.)
3. Configure error alerting

## 7. Backup Strategy

### 7.1 Supabase Backups
- Daily backups: Enabled by default
- Point-in-time recovery: Enable in Supabase dashboard
- Export schema: `npx prisma db pull`

### 7.2 Application Backups
- Code: Git repository (GitHub)
- Environment variables: Store securely in password manager
- Documentation: Keep up-to-date

## 8. Maintenance

### 8.1 Regular Tasks
**Daily**:
- Monitor error logs
- Check for failed orders
- Review pending KYC verifications

**Weekly**:
- Review order statistics
- Check email delivery rates
- Update cryptocurrency limits if needed

**Monthly**:
- Review and update dependencies
- Check for security updates
- Backup database manually
- Review platform performance

### 8.2 Scaling Considerations
When traffic increases:
- Upgrade Supabase plan for more connections
- Enable Vercel Pro for better performance
- Implement caching (Redis)
- Add rate limiting
- Consider CDN for static assets

## 9. Rollback Procedure

If deployment has critical issues:

1. **Immediate Rollback**:
   - In Vercel dashboard, go to Deployments
   - Find last working deployment
   - Click "..." → "Promote to Production"

2. **Database Rollback** (if needed):
   - Use Supabase point-in-time recovery
   - Or restore from latest backup
   - Run necessary migrations

3. **Fix & Redeploy**:
   - Fix issues locally
   - Test thoroughly
   - Push to GitHub
   - Vercel auto-deploys

## 10. Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Check migrations
npx prisma migrate status
```

### Build Failures
- Check Vercel build logs
- Verify all dependencies installed
- Ensure TypeScript compiles: `npx tsc --noEmit`
- Check for missing environment variables

### Runtime Errors
- Check Vercel function logs
- Enable verbose logging temporarily
- Test API endpoints individually
- Verify database queries work

### Email Not Sending
- Check Resend dashboard for errors
- Verify API key is correct
- Check domain verification status
- Test with Resend API directly

## 11. Production Checklist

Before going live:

**Technical**:
- [ ] All tests passing
- [ ] Database migrations applied
- [ ] Seeds run successfully
- [ ] Environment variables configured
- [ ] HTTPS working
- [ ] Emails sending correctly
- [ ] KYC webhook functional
- [ ] Admin panel accessible

**Business**:
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Bank details verified
- [ ] Support email configured
- [ ] Emergency contacts defined
- [ ] Compliance requirements met

**Performance**:
- [ ] Page load times < 3s
- [ ] Lighthouse score > 90
- [ ] Mobile responsive
- [ ] Error rates < 1%

## 12. Support & Maintenance

### Getting Help
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Next.js Docs: https://nextjs.org/docs
- Prisma Docs: https://www.prisma.io/docs

### Useful Commands
```bash
# View production logs
vercel logs

# Deploy specific branch
vercel --prod

# Run migrations on production
npx prisma migrate deploy --preview-feature

# Generate Prisma Client
npx prisma generate

# Check deployment status
vercel inspect <deployment-url>
```

---

## Emergency Contacts

**Critical Issues**:
- Database: Supabase Support
- Hosting: Vercel Support
- Email: Resend Support
- KYC: KYCAID Support

**Keep these updated with your actual support contacts!**

---

**Deployment Date**: _________________
**Deployed By**: _________________
**Production URL**: _________________
**Database**: _________________

Good luck with your deployment! 🚀

