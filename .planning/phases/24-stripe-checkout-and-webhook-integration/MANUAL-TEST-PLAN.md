# 🧪 Phase 24 Complete Test Plan

## Overview
Comprehensive manual testing plan for the complete Stripe billing integration across all 3 phases.

---

## Pre-Test Setup ⚙️

### 1. Environment Configuration
```bash
# .env.local - Add these variables
STRIPE_SECRET_KEY=sk_test_...                    # From Stripe Dashboard
STRIPE_PRO_PRICE_ID=price_...                   # Pro plan monthly price ID
STRIPE_TEAM_PRICE_ID=price_...                  # Team plan monthly price ID
STRIPE_WEBHOOK_SECRET=whsec_...                 # From webhook endpoint setup
NEXTAUTH_URL=http://localhost:3000             # For local testing
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...      # Must match server value
NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID=price_...     # Must match server value
```

### 2. Stripe Dashboard Setup
**Products & Prices:**
1. Create "Pro Plan" recurring product → Monthly price → Copy price ID
2. Create "Team Plan" recurring product → Monthly price → Copy price ID

**Customer Portal:**
1. Go to Settings → Billing → Customer portal
2. Click "Activate test link" → Configure basic settings
3. Save configuration

**Webhook Endpoint:**
1. Go to Developers → Webhooks → Add endpoint
2. URL: `http://localhost:3000/api/stripe/webhook` (or your domain)
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### 3. Local Development Setup
```bash
# Terminal 1: Start the app
yarn dev

# Terminal 2: Forward webhooks (if testing locally)
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook secret from output to .env.local
```

---

## Test Scenarios 🎯

### Scenario 1: Free User Upgrade Flow
**Objective:** Test complete free → paid upgrade journey

**Steps:**
1. **Start with free user**
   - Sign in as user with free organization
   - Verify header shows "free" badge

2. **Trigger upgrade modal**
   - Try to create a 2nd collection (should hit limit)
   - ✅ Modal opens with "You've hit your collections limit"
   - ✅ Shows 3 tier columns (Free/Pro/Team) with current = Free
   - ✅ "View Plans" button is enabled (not disabled)

3. **Navigate to upgrade page**
   - Click "View Plans" button
   - ✅ Modal closes and browser navigates to `/upgrade`
   - ✅ Page shows 2 pricing cards (Pro/Team) side by side
   - ✅ Each card shows 5 limit rows from LIMITS config
   - ✅ Both "Choose Pro" and "Choose Team" buttons visible

4. **Select Pro plan**
   - Click "Choose Pro" button
   - ✅ Button shows "Redirecting…" state
   - ✅ Browser redirects to `checkout.stripe.com`
   - ✅ Checkout shows correct Pro plan pricing

5. **Complete payment**
   - Use test card: `4242 4242 4242 4242`, any future date, any CVC
   - ✅ Payment processes successfully
   - ✅ Redirects to `/upgrade/success?session_id=cs_test_...`

6. **Verify success page**
   - ✅ Shows "Upgrade successful!" message
   - ✅ After ~1 second: "You are now on the pro plan." appears
   - ✅ After 3 seconds: auto-redirects to `/collections`

7. **Verify plan update**
   - ✅ Header badge now shows "pro"
   - ✅ Can create multiple collections (limit increased)

### Scenario 2: Account Management Flow
**Objective:** Test account page and billing portal access

**Steps:**
1. **Access account page**
   - Navigate to `/account` (add link or direct URL)
   - ✅ Page loads with "Account" heading
   - ✅ Billing section shows current plan badge "pro"
   - ✅ Shows organization name
   - ✅ "Manage subscription" button visible (not "Upgrade" link)

2. **Access billing portal**
   - Click "Manage subscription" button
   - ✅ Button shows "Opening…" state briefly
   - ✅ Redirects to `billing.stripe.com/p/session/...`
   - ✅ Portal shows subscription details and management options

3. **Test portal functionality**
   - Update payment method
   - View invoice history
   - ✅ Click "Return to [App Name]" returns to `/account`

### Scenario 3: Plan Change Flow
**Objective:** Test subscription updates via Stripe

**Steps:**
1. **Change plan in Stripe Dashboard**
   - Go to Stripe Dashboard → Customers → Find your customer
   - Click on the subscription → Modify subscription
   - Change to Team plan price → Save

2. **Verify webhook processing**
   - Check server logs for: `Updated organization [id] to team plan`
   - ✅ Webhook received and processed

3. **Verify app updates**
   - Refresh app or navigate to `/account`
   - ✅ Plan badge shows "team"
   - ✅ Limits reflect team tier (unlimited)

### Scenario 4: Subscription Cancellation Flow
**Objective:** Test subscription deletion and free tier reset

**Steps:**
1. **Cancel subscription**
   - Via Stripe Dashboard: Cancel the subscription immediately
   - OR via Billing Portal: Cancel subscription

2. **Verify webhook processing**
   - Check server logs for: `Reset organization [id] to free plan`
   - ✅ Webhook received and processed

3. **Verify free tier reset**
   - ✅ Plan badge shows "free"
   - ✅ Collection limits enforced again
   - ✅ `/account` shows "Upgrade" link instead of "Manage subscription"

### Scenario 5: Free User Account Page
**Objective:** Test account page for free tier users

**Steps:**
1. **Access with free user**
   - Sign in as user who never upgraded OR after cancellation
   - Navigate to `/account`

2. **Verify free tier display**
   - ✅ Shows "Current plan: free" badge
   - ✅ Shows "Upgrade" link (not "Manage subscription" button)
   - ✅ Click "Upgrade" navigates to `/upgrade`

### Scenario 6: Error Handling
**Objective:** Test error conditions and edge cases

**Steps:**
1. **Test missing environment variables**
   - Remove `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` temporarily
   - Try to choose Pro plan
   - ✅ Shows error: "Pricing for pro is not configured. Contact support."

2. **Test self-hosted mode**
   - Set `SELF_HOSTED=true` in environment
   - Try checkout and portal routes
   - ✅ Returns 400 errors gracefully

3. **Test webhook errors**
   - Send invalid webhook signature
   - ✅ Returns 400 "Invalid signature"
   - Check idempotency by replaying same webhook
   - ✅ Second attempt skips processing

---

## Database Verification 🗄️

### Check Organization Updates
```bash
# Connect to your MongoDB instance
mongo "your-connection-string"

# Check organization was updated correctly
db.organizations.findOne({"name": "Your Test Org Name"})

# Expected fields after successful checkout:
{
  "_id": ObjectId("..."),
  "name": "Your Test Org Name",
  "planTier": "pro",  // or "team"
  "stripeCustomerId": "cus_...",
  "stripeSubscriptionId": "sub_...",
  "usage": { ... },
  "createdAt": ...,
  "updatedAt": ...
}
```

### Check Webhook Idempotency
```bash
# Check processed webhook events
db.processedwebhookevents.find().pretty()

# Should show entries like:
{
  "_id": ObjectId("..."),
  "stripeEventId": "evt_...",
  "processedAt": ISODate("...")
}
```

---

## Log Verification 📋

### Server Console Logs
When webhooks process successfully, you should see:
```
Updated organization [orgId] to pro plan
Updated organization [orgId] to team plan
Reset organization [orgId] to free plan
Event evt_123 already processed, skipping  // for duplicate webhooks
```

### Error Logs to Watch For
```
STRIPE_WEBHOOK_SECRET is not set
Webhook signature verification failed
Missing customer or organizationId in checkout.session.completed
Unable to map priceId to tier: [priceId]
No organization found with stripeCustomerId: [customerId]
```

---

## Success Criteria ✅

### All scenarios must pass with:
- ✅ No JavaScript console errors
- ✅ Correct page navigation and redirects
- ✅ Proper UI state updates (badges, buttons, loading states)
- ✅ Successful Stripe payment processing
- ✅ Webhook events processed and logged
- ✅ Database records updated correctly
- ✅ Plan limits enforced appropriately

### Key Integration Points:
- ✅ UpgradeModal → /upgrade → Stripe → /upgrade/success → /collections
- ✅ /account → Stripe Portal → return to /account
- ✅ Stripe webhooks → database updates → UI reflection
- ✅ Plan enforcement throughout app

---

## Troubleshooting Guide 🔧

### Common Issues:

**"Pricing not configured" error:**
- Check `NEXT_PUBLIC_STRIPE_*_PRICE_ID` environment variables
- Ensure client and server price IDs match

**Webhook signature verification fails:**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure webhook endpoint URL is accessible
- For local development, use `stripe listen`

**"No billing account found" error:**
- User hasn't completed checkout yet
- Webhook hasn't processed `checkout.session.completed` yet

**Success page shows "processing" message:**
- Webhook not configured or not processing
- Check webhook endpoint is receiving events
- Verify webhook secret and event subscriptions

Run this test plan thoroughly and report any failures or unexpected behavior!