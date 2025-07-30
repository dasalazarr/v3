# Andes Premium Subscription Management Guide

## 🚨 CRITICAL GAPS IDENTIFIED

Our analysis revealed **critical gaps** in the current subscription system that pose **financial and operational risks**:

1. **No recurring payment validation** - Users maintain premium access indefinitely after first payment
2. **No subscription expiration tracking** - No way to know when subscriptions should renew
3. **No payment failure handling** - Failed payments don't trigger status updates
4. **Missing cron jobs** - No automated subscription lifecycle management

## 📊 CURRENT STATE ANALYSIS

### ✅ What Works
- Initial payment processing via Gumroad webhook
- User status updates from `free` → `premium`
- WhatsApp confirmation messages
- Webhook signature validation

### ❌ Critical Issues
- Users can cancel Gumroad subscription but keep premium access
- No expiration dates tracked in database
- No automated detection of expired subscriptions
- No handling of failed recurring payments

## 🛠️ REQUIRED DATABASE SCHEMA UPDATES

### Priority 1: Add Subscription Tracking Fields

```sql
-- Migration: Add subscription lifecycle fields
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN last_payment_date TIMESTAMP;
ALTER TABLE users ADD COLUMN subscription_id VARCHAR(100); -- Gumroad subscription ID
ALTER TABLE users ADD COLUMN payment_failure_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN grace_period_ends_at TIMESTAMP;

-- Update existing premium users with 30-day expiration from activation
UPDATE users 
SET subscription_expires_at = premium_activated_at + INTERVAL '30 days',
    last_payment_date = premium_activated_at
WHERE subscription_status = 'premium' AND premium_activated_at IS NOT NULL;
```

### Priority 2: Create Subscription Events Table

```sql
-- Track all subscription events for audit trail
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_created', 'payment_success', 'payment_failed', 
    'subscription_cancelled', 'subscription_expired', 'grace_period_started'
  )),
  gumroad_event_id VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 ENHANCED GUMROAD WEBHOOK IMPLEMENTATION

### Current Webhook Issues
The current webhook only handles initial payments and doesn't process recurring payment events.

### Required Webhook Updates

```typescript
// apps/api-gateway/src/flows/payment-flow.ts
export const handleGumroadWebhook = async (req: Request, res: Response) => {
  const { event_type, custom_fields, subscription_id, purchase_id } = req.body;
  const phoneNumber = custom_fields?.phone_number;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Missing phone_number in custom_fields' });
  }

  try {
    const db = container.resolve<Database>('Database');
    const [user] = await db.query
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Handle different Gumroad events
    switch (event_type) {
      case 'subscription_payment':
        await handleSubscriptionPayment(db, user, subscription_id, purchase_id);
        break;
      case 'subscription_cancelled':
        await handleSubscriptionCancellation(db, user, subscription_id);
        break;
      case 'payment_failed':
        await handlePaymentFailure(db, user, subscription_id);
        break;
      case 'subscription_reactivated':
        await handleSubscriptionReactivation(db, user, subscription_id);
        break;
      default:
        console.log(`Unhandled event type: ${event_type}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Gumroad webhook:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

async function handleSubscriptionPayment(db: Database, user: any, subscriptionId: string, purchaseId: string) {
  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + 1); // 30 days from now

  await db.query
    .update(users)
    .set({
      subscriptionStatus: 'premium',
      subscriptionExpiresAt: expirationDate,
      lastPaymentDate: new Date(),
      subscriptionId: subscriptionId,
      paymentFailureCount: 0, // Reset failure count on successful payment
      gracePeriodEndsAt: null, // Clear grace period
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));

  // Log event
  await logSubscriptionEvent(db, user.id, 'payment_success', { purchaseId, subscriptionId });
  
  console.log(`✅ Subscription renewed for user ${user.id} until ${expirationDate}`);
}

async function handleSubscriptionCancellation(db: Database, user: any, subscriptionId: string) {
  // Don't immediately revoke access - let them use until expiration
  await db.query
    .update(users)
    .set({
      subscriptionStatus: 'canceled', // New status for canceled but still active
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));

  await logSubscriptionEvent(db, user.id, 'subscription_cancelled', { subscriptionId });
  
  console.log(`⚠️ Subscription canceled for user ${user.id}, access until ${user.subscriptionExpiresAt}`);
}

async function handlePaymentFailure(db: Database, user: any, subscriptionId: string) {
  const failureCount = (user.paymentFailureCount || 0) + 1;
  const gracePeriodDays = 7; // 7-day grace period
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

  await db.query
    .update(users)
    .set({
      subscriptionStatus: 'past_due',
      paymentFailureCount: failureCount,
      gracePeriodEndsAt: gracePeriodEnd,
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));

  await logSubscriptionEvent(db, user.id, 'payment_failed', { 
    subscriptionId, 
    failureCount,
    gracePeriodEnd 
  });

  // Send notification to user
  await sendPaymentFailureNotification(user, failureCount);
  
  console.log(`❌ Payment failed for user ${user.id}, attempt ${failureCount}, grace period until ${gracePeriodEnd}`);
}
```

## ⏰ CRITICAL CRON JOBS IMPLEMENTATION

### Daily Subscription Validation

```typescript
// apps/api-gateway/src/services/subscription-service.ts
import cron from 'node-cron';

export class SubscriptionService {
  constructor(private database: Database) {}

  setupCronJobs() {
    // Daily subscription validation at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🔍 Running daily subscription validation...');
      await this.validateExpiredSubscriptions();
      await this.processGracePeriodExpired();
      await this.sendExpirationWarnings();
    });

    // Hourly payment retry for failed payments
    cron.schedule('0 * * * *', async () => {
      console.log('🔄 Checking for payment retries...');
      await this.processPaymentRetries();
    });
  }

  async validateExpiredSubscriptions() {
    const expiredUsers = await this.database.query
      .select()
      .from(users)
      .where(
        and(
          eq(users.subscriptionStatus, 'premium'),
          lt(users.subscriptionExpiresAt, new Date())
        )
      );

    for (const user of expiredUsers) {
      await this.database.query
        .update(users)
        .set({
          subscriptionStatus: 'free',
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      await this.logSubscriptionEvent(user.id, 'subscription_expired', {});
      await this.sendSubscriptionExpiredNotification(user);
      
      console.log(`⏰ Expired subscription for user ${user.id}`);
    }
  }

  async processGracePeriodExpired() {
    const gracePeriodExpired = await this.database.query
      .select()
      .from(users)
      .where(
        and(
          eq(users.subscriptionStatus, 'past_due'),
          lt(users.gracePeriodEndsAt, new Date())
        )
      );

    for (const user of gracePeriodExpired) {
      await this.database.query
        .update(users)
        .set({
          subscriptionStatus: 'free',
          gracePeriodEndsAt: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      await this.logSubscriptionEvent(user.id, 'grace_period_expired', {});
      await this.sendGracePeriodExpiredNotification(user);
      
      console.log(`⏰ Grace period expired for user ${user.id}`);
    }
  }

  async sendExpirationWarnings() {
    // Warn users 3 days before expiration
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 3);

    const expiringUsers = await this.database.query
      .select()
      .from(users)
      .where(
        and(
          eq(users.subscriptionStatus, 'premium'),
          lt(users.subscriptionExpiresAt, warningDate),
          gt(users.subscriptionExpiresAt, new Date())
        )
      );

    for (const user of expiringUsers) {
      await this.sendExpirationWarningNotification(user);
      console.log(`⚠️ Sent expiration warning to user ${user.id}`);
    }
  }
}
```

## 📱 WHATSAPP NOTIFICATION SYSTEM

### Payment Failure Notifications

```typescript
async function sendPaymentFailureNotification(user: any, failureCount: number) {
  const messages = {
    es: {
      1: `⚠️ Problema con tu pago de Andes Premium. Tu suscripción sigue activa por 7 días más. Actualiza tu método de pago: [LINK]`,
      2: `🚨 Segundo intento de pago fallido. Tu acceso premium expira pronto. Actualiza tu pago: [LINK]`,
      3: `❌ Último aviso: Tu suscripción premium será cancelada en 24 horas. Actualiza tu pago: [LINK]`
    }
  };

  const message = messages[user.preferredLanguage][Math.min(failureCount, 3)];
  await sendWhatsAppMessage(user.phoneNumber, message);
}
```

## 🎯 IMPLEMENTATION PRIORITY

### Week 1: Foundation (CRITICAL)
1. ✅ Database schema updates
2. ✅ Enhanced Gumroad webhook
3. ✅ Basic SubscriptionService class

### Week 2: Automation (HIGH)
1. ✅ Daily cron jobs implementation
2. ✅ Expiration detection and handling
3. ✅ Payment failure processing

### Week 3: User Experience (MEDIUM)
1. ✅ WhatsApp notifications
2. ✅ Grace period handling
3. ✅ Subscription renewal flow

### Week 4: Monitoring (LOW)
1. ✅ Subscription dashboard
2. ✅ Metrics and alerts
3. ✅ Audit trail reporting

## 🚨 IMMEDIATE ACTION REQUIRED

**This is a financial risk that needs immediate attention.** Users can currently:
1. Pay once for premium
2. Cancel their Gumroad subscription
3. Keep premium access indefinitely

**Estimated revenue impact:** With 100 premium users, this could mean $999/month in lost revenue.

## 📋 TESTING CHECKLIST

- [ ] Test subscription renewal webhook
- [ ] Test subscription cancellation webhook  
- [ ] Test payment failure webhook
- [ ] Test expiration cron job
- [ ] Test grace period handling
- [ ] Test WhatsApp notifications
- [ ] Test with real Gumroad subscription

## 📞 SUPPORT ESCALATION

If subscription issues occur:
1. Check subscription_events table for audit trail
2. Verify Gumroad webhook logs
3. Check cron job execution logs
4. Validate user subscription_expires_at dates

This system is critical for business sustainability and must be implemented immediately.

---

## 🔧 **TROUBLESHOOTING (Production Experience)**

### Critical Issues Resolved

#### **Issue 1: Product ID Validation Failure**
**Problem**: Webhook returns "Product ID does not match"
**Root Cause**: Missing or incorrect environment variables
**Solution**:
```bash
# Verify Railway environment variables
GUMROAD_PRODUCT_ID_EN=andes
GUMROAD_PRODUCT_ID_ES=andeslatam

# Test product ID validation
node test-product-ids.cjs
```

#### **Issue 2: Creator Purchase Handling**
**Problem**: Webhooks may not fire for product creator purchases
**Solution**: Creator purchases are treated as normal customer purchases. If webhook fails, use manual activation:
```bash
npx tsx packages/database/src/scripts/activate-premium-manual.ts
```

#### **Issue 3: User Identification Issues**
**Problem**: Phone number format inconsistencies
**Solution**: Ensure consistent format in Gumroad custom_fields and database

### Debugging Tools & Scripts
```bash
# Comprehensive user status check
npx tsx packages/database/src/scripts/check-premium-status.ts

# Manual premium activation
npx tsx packages/database/src/scripts/activate-premium-manual.ts

# Test webhook processing
node test-webhook-with-valid-id.cjs

# Validate product ID configuration
node test-product-ids.cjs

# Check Railway environment variables
node check-railway-vars.cjs
```

### Database Queries
```sql
-- Check user subscription status
SELECT subscription_status, premium_activated_at, phone_number
FROM users WHERE phone_number = '593984074389';

-- View recent webhook processing
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;

-- Check for constraint violations
SELECT * FROM users WHERE onboarding_goal NOT IN ('first_race', 'improve_time', 'stay_fit');
```

### Railway Logs Monitoring
```bash
# Filter webhook processing
grep "GUMROAD" railway-logs.txt

# Check for errors
grep "ERROR\|error" railway-logs.txt

# Monitor premium activations
grep "Successfully upgraded user to premium" railway-logs.txt
```
