# Andes Premium: 4-Week Critical Implementation Plan

## 🚨 EXECUTIVE SUMMARY

**CRITICAL FINANCIAL RISK IDENTIFIED:** Current subscription system allows users to maintain premium access indefinitely after first payment, potentially costing **$999+/month in lost revenue** with 100+ premium users.

**IMMEDIATE ACTION REQUIRED:** This plan addresses critical gaps in subscription management while maintaining compatibility with the newly implemented simplified onboarding flow.

---

## 📅 WEEK 1: FOUNDATION (CRITICAL PRIORITY)

### 🎯 Objective: Fix Critical Financial Gaps
**Risk Level:** 🔴 CRITICAL - Revenue bleeding daily

### Day 1-2: Database Schema Updates

#### Task 1.1: Add Subscription Tracking Fields
```sql
-- CRITICAL: Execute immediately in production
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN last_payment_date TIMESTAMP;
ALTER TABLE users ADD COLUMN subscription_id VARCHAR(100);
ALTER TABLE users ADD COLUMN payment_failure_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN grace_period_ends_at TIMESTAMP;

-- Backfill existing premium users (30 days from activation)
UPDATE users 
SET subscription_expires_at = premium_activated_at + INTERVAL '30 days',
    last_payment_date = premium_activated_at
WHERE subscription_status = 'premium' AND premium_activated_at IS NOT NULL;
```

**Validation:**
```bash
# Verify schema changes
psql $DATABASE_URL -c "SELECT subscription_expires_at, last_payment_date FROM users WHERE subscription_status = 'premium' LIMIT 5;"
```

#### Task 1.2: Create Subscription Events Table
```sql
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

CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX idx_subscription_events_type ON subscription_events(event_type);
```

### Day 3-4: Enhanced Gumroad Webhook

#### Task 1.3: Implement Multi-Event Webhook Handler
**File:** `apps/api-gateway/src/flows/payment-flow.ts`

```typescript
// REPLACE existing handleGumroadWebhook function
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
      default:
        console.log(`Unhandled event type: ${event_type}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Gumroad webhook:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
```

#### Task 1.4: Implement Event Handlers
**Add to same file:**

```typescript
async function handleSubscriptionPayment(db: Database, user: any, subscriptionId: string, purchaseId: string) {
  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + 1);

  await db.query
    .update(users)
    .set({
      subscriptionStatus: 'premium',
      subscriptionExpiresAt: expirationDate,
      lastPaymentDate: new Date(),
      subscriptionId: subscriptionId,
      paymentFailureCount: 0,
      gracePeriodEndsAt: null,
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));

  await logSubscriptionEvent(db, user.id, 'payment_success', { purchaseId, subscriptionId });
  console.log(`✅ Subscription renewed for user ${user.id} until ${expirationDate}`);
}

async function handleSubscriptionCancellation(db: Database, user: any, subscriptionId: string) {
  await db.query
    .update(users)
    .set({
      subscriptionStatus: 'canceled',
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));

  await logSubscriptionEvent(db, user.id, 'subscription_cancelled', { subscriptionId });
  console.log(`⚠️ Subscription canceled for user ${user.id}, access until ${user.subscriptionExpiresAt}`);
}

async function logSubscriptionEvent(db: Database, userId: string, eventType: string, metadata: any) {
  await db.query
    .insert(subscriptionEvents)
    .values({
      userId,
      eventType,
      metadata,
      createdAt: new Date()
    });
}
```

### Day 5: Basic SubscriptionService

#### Task 1.5: Create SubscriptionService Class
**File:** `apps/api-gateway/src/services/subscription-service.ts`

```typescript
import { Database } from '@running-coach/database';
import { users, subscriptionEvents } from '@running-coach/database';
import { eq, and, lt, gt } from 'drizzle-orm';

export class SubscriptionService {
  constructor(private database: Database) {}

  async validateUserSubscription(userId: string): Promise<{ valid: boolean; reason?: string }> {
    const [user] = await this.database.query
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return { valid: false, reason: 'user_not_found' };
    if (user.subscriptionStatus !== 'premium') return { valid: false, reason: 'not_premium' };
    
    // Check expiration
    if (user.subscriptionExpiresAt && new Date() > user.subscriptionExpiresAt) {
      await this.expireSubscription(userId);
      return { valid: false, reason: 'expired' };
    }

    return { valid: true };
  }

  private async expireSubscription(userId: string) {
    await this.database.query
      .update(users)
      .set({
        subscriptionStatus: 'free',
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    await this.logEvent(userId, 'subscription_expired', {});
  }

  private async logEvent(userId: string, eventType: string, metadata: any) {
    await this.database.query
      .insert(subscriptionEvents)
      .values({
        userId,
        eventType,
        metadata,
        createdAt: new Date()
      });
  }
}
```

### Week 1 Deliverables Checklist
- [ ] Database schema updated with subscription tracking
- [ ] Subscription events table created
- [ ] Enhanced Gumroad webhook deployed
- [ ] Basic SubscriptionService implemented
- [ ] All existing premium users have expiration dates
- [ ] Webhook tested with test user

**⚠️ CRITICAL:** Week 1 must be completed before proceeding. This fixes the revenue leak.

---

## 📅 WEEK 2: AUTOMATION (HIGH PRIORITY)

### 🎯 Objective: Implement Automated Subscription Management
**Risk Level:** 🟡 HIGH - Prevent future revenue loss

### Day 1-2: Daily Cron Jobs Implementation

#### Task 2.1: Extend SubscriptionService with Cron Jobs
**Add to:** `apps/api-gateway/src/services/subscription-service.ts`

```typescript
import cron from 'node-cron';

export class SubscriptionService {
  // ... existing code

  setupCronJobs() {
    // CRITICAL: Daily subscription validation at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🔍 Running daily subscription validation...');
      try {
        await this.validateExpiredSubscriptions();
        await this.processGracePeriodExpired();
        await this.sendExpirationWarnings();
        console.log('✅ Daily subscription validation completed');
      } catch (error) {
        console.error('❌ Daily subscription validation failed:', error);
        await this.sendCriticalAlert('Daily subscription validation failed', error);
      }
    });

    console.log('✅ Subscription cron jobs configured');
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

    console.log(`Found ${expiredUsers.length} expired subscriptions`);

    for (const user of expiredUsers) {
      await this.database.query
        .update(users)
        .set({
          subscriptionStatus: 'free',
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      await this.logEvent(user.id, 'subscription_expired', {
        expiredAt: user.subscriptionExpiresAt,
        lastPayment: user.lastPaymentDate
      });

      console.log(`⏰ Revoked premium access for expired user ${user.id}`);
    }

    return expiredUsers.length;
  }

  async sendExpirationWarnings() {
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
      const daysLeft = Math.ceil(
        (user.subscriptionExpiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      const message = user.preferredLanguage === 'es'
        ? `⚠️ Tu suscripción Andes Premium expira en ${daysLeft} días. Renueva para mantener tu acceso completo.`
        : `⚠️ Your Andes Premium subscription expires in ${daysLeft} days. Renew to maintain full access.`;

      // Send WhatsApp notification (implement sendWhatsAppMessage)
      await this.sendWhatsAppMessage(user.phoneNumber, message);
    }

    return expiringUsers.length;
  }
}
```

#### Task 2.2: Integrate Cron Jobs in App
**Update:** `apps/api-gateway/src/app.ts`

```typescript
// In setupScheduledTasks function, add:
function setupScheduledTasks(services: any) {
  console.log('⏰ Setting up scheduled tasks...');

  // CRITICAL: Initialize subscription service cron jobs
  const subscriptionService = new SubscriptionService(services.database);
  subscriptionService.setupCronJobs();

  // ... existing cron jobs
}
```

### Day 3-4: Payment Failure Handling

#### Task 2.3: Implement Payment Failure Logic
**Add to SubscriptionService:**

```typescript
async function handlePaymentFailure(db: Database, user: any, subscriptionId: string) {
  const failureCount = (user.paymentFailureCount || 0) + 1;
  const gracePeriodDays = 7;
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

  await sendPaymentFailureNotification(user, failureCount);
  console.log(`❌ Payment failed for user ${user.id}, attempt ${failureCount}`);
}
```

### Day 5: Landing Page Integration

#### Task 2.4: Update Landing Page with New Flow
**Create:** `public/js/onboarding.js`

```javascript
document.addEventListener('DOMContentLoaded', function() {
  const buttons = document.querySelectorAll('[data-intent]');
  
  buttons.forEach(button => {
    button.addEventListener('click', async function(e) {
      e.preventDefault();
      
      const intent = this.dataset.intent;
      const language = this.dataset.language || 'es';
      
      this.disabled = true;
      this.innerHTML = 'Conectando con WhatsApp...';
      
      try {
        const response = await fetch('/onboarding/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent, language })
        });
        
        const data = await response.json();
        
        if (data.success) {
          window.location.href = data.whatsappLink;
        } else {
          throw new Error(data.message || 'Error al conectar');
        }
      } catch (error) {
        console.error('Onboarding error:', error);
        this.innerHTML = 'Error - Intenta de nuevo';
        this.disabled = false;
      }
    });
  });
});
```

### Week 2 Deliverables Checklist
- [ ] Daily cron jobs implemented and running
- [ ] Expired subscription detection working
- [ ] Payment failure handling implemented
- [ ] Landing page integrated with new flow
- [ ] Expiration warnings system active
- [ ] All systems tested with test user

---

## 📅 WEEK 3: USER EXPERIENCE (MEDIUM PRIORITY)

### 🎯 Objective: Enhance User Communication and Recovery
**Risk Level:** 🟢 MEDIUM - Improve retention and recovery

### Day 1-2: WhatsApp Notification System

#### Task 3.1: Implement WhatsApp Notifications
**Create:** `apps/api-gateway/src/services/notification-service.ts`

```typescript
export class NotificationService {
  async sendPaymentFailureNotification(user: any, failureCount: number) {
    const messages = {
      es: {
        1: `⚠️ Problema con tu pago de Andes Premium. Tu suscripción sigue activa por 7 días más. Actualiza tu método de pago para continuar.`,
        2: `🚨 Segundo intento de pago fallido. Tu acceso premium expira pronto. Actualiza tu pago urgentemente.`,
        3: `❌ Último aviso: Tu suscripción premium será cancelada en 24 horas. Actualiza tu pago ahora.`
      },
      en: {
        1: `⚠️ Payment issue with your Andes Premium. Your subscription remains active for 7 more days. Please update your payment method.`,
        2: `🚨 Second payment attempt failed. Your premium access expires soon. Please update your payment urgently.`,
        3: `❌ Final notice: Your premium subscription will be cancelled in 24 hours. Update your payment now.`
      }
    };

    const message = messages[user.preferredLanguage][Math.min(failureCount, 3)];
    await this.sendWhatsAppMessage(user.phoneNumber, message);
  }

  async sendSubscriptionExpiredNotification(user: any) {
    const message = user.preferredLanguage === 'es'
      ? `😔 Tu suscripción Andes Premium ha expirado. Renueva para recuperar tu acceso completo a entrenamientos personalizados.`
      : `😔 Your Andes Premium subscription has expired. Renew to regain full access to personalized training.`;

    await this.sendWhatsAppMessage(user.phoneNumber, message);
  }
}
```

### Day 3-4: Grace Period and Recovery Flow

#### Task 3.2: Implement Grace Period Handling
**Add to SubscriptionService:**

```typescript
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

    await this.logEvent(user.id, 'grace_period_expired', {});
    await this.notificationService.sendGracePeriodExpiredNotification(user);
  }

  return gracePeriodExpired.length;
}
```

### Day 5: Enhanced Bot Integration

#### Task 3.3: Update Bot to Handle Subscription Status
**Update:** `apps/api-gateway/src/services/freemium-service.ts`

```typescript
public async checkMessageAllowance(user: User): Promise<{ allowed: boolean; link?: string; reason?: string }> {
  // First validate subscription if user claims to be premium
  if (user.subscriptionStatus === 'premium') {
    const validation = await this.subscriptionService.validateUserSubscription(user.id);
    if (!validation.valid) {
      return { 
        allowed: false, 
        link: this.generatePaymentLink(user),
        reason: validation.reason 
      };
    }
    return { allowed: true };
  }

  // Handle past_due users (in grace period)
  if (user.subscriptionStatus === 'past_due') {
    if (user.gracePeriodEndsAt && new Date() < user.gracePeriodEndsAt) {
      return { allowed: true }; // Still in grace period
    } else {
      return { 
        allowed: false, 
        link: this.generatePaymentLink(user),
        reason: 'grace_period_expired' 
      };
    }
  }

  // Regular free user logic
  const { key, ttl } = this.getMonthKey(user.id);
  const count = await this.chatBuffer.incrementKey(key, ttl);
  if (count > this.messageLimit) {
    const link = this.generatePaymentLink(user);
    return { allowed: false, link, reason: 'message_limit_exceeded' };
  }
  
  return { allowed: true };
}
```

### Week 3 Deliverables Checklist
- [ ] WhatsApp notification system implemented
- [ ] Grace period handling working
- [ ] Payment failure recovery flow active
- [ ] Enhanced bot subscription validation
- [ ] User communication templates created
- [ ] End-to-end testing completed

---

## 📅 WEEK 4: MONITORING & OPTIMIZATION (LOW PRIORITY)

### 🎯 Objective: Create Monitoring and Analytics Dashboard
**Risk Level:** 🔵 LOW - Operational excellence

### Day 1-3: Basic Subscription Dashboard

#### Task 4.1: Create Subscription Analytics Endpoint
**Create:** `apps/api-gateway/src/routes/admin.ts`

```typescript
export const getSubscriptionMetrics = async (req: Request, res: Response) => {
  try {
    const db = container.resolve<Database>('Database');
    
    // Get subscription counts by status
    const statusCounts = await db.query.execute(`
      SELECT subscription_status, COUNT(*) as count
      FROM users 
      GROUP BY subscription_status
    `);

    // Get revenue metrics
    const revenueMetrics = await db.query.execute(`
      SELECT 
        COUNT(*) FILTER (WHERE subscription_status = 'premium') * 9.99 as monthly_revenue,
        COUNT(*) FILTER (WHERE subscription_status = 'past_due') as at_risk_revenue,
        COUNT(*) FILTER (WHERE subscription_expires_at < NOW() + INTERVAL '7 days') as expiring_soon
      FROM users
    `);

    // Get recent events
    const recentEvents = await db.query
      .select()
      .from(subscriptionEvents)
      .orderBy(desc(subscriptionEvents.createdAt))
      .limit(50);

    res.json({
      statusCounts,
      revenueMetrics: revenueMetrics[0],
      recentEvents
    });
  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
```

### Day 4-5: Monitoring and Alerts

#### Task 4.2: Implement Critical Alerts
**Add to SubscriptionService:**

```typescript
async sendCriticalAlert(message: string, error: any) {
  console.error(`🚨 CRITICAL ALERT: ${message}`, error);
  
  // TODO: Integrate with monitoring service (Slack, email, etc.)
  // For now, log to console and database
  await this.logEvent('system', 'critical_alert', {
    message,
    error: error.message,
    stack: error.stack
  });
}

async generateHealthReport() {
  const report = {
    timestamp: new Date().toISOString(),
    totalPremiumUsers: 0,
    expiredSubscriptions: 0,
    failedPayments: 0,
    gracePeriodUsers: 0,
    monthlyRevenue: 0
  };

  // Calculate metrics
  const users = await this.database.query.select().from(users);
  
  report.totalPremiumUsers = users.filter(u => u.subscriptionStatus === 'premium').length;
  report.expiredSubscriptions = users.filter(u => 
    u.subscriptionStatus === 'premium' && 
    u.subscriptionExpiresAt && 
    new Date() > u.subscriptionExpiresAt
  ).length;
  report.failedPayments = users.filter(u => u.subscriptionStatus === 'past_due').length;
  report.monthlyRevenue = report.totalPremiumUsers * 9.99;

  return report;
}
```

### Week 4 Deliverables Checklist
- [ ] Basic subscription dashboard created
- [ ] Revenue and user metrics tracking
- [ ] Critical alert system implemented
- [ ] Health monitoring reports
- [ ] Documentation updated
- [ ] System fully operational

---

## 🎯 SUCCESS CRITERIA & VALIDATION

### Critical Success Metrics
- **Revenue Protection:** 0% premium users with expired access
- **Automation:** 100% of expired subscriptions detected within 24 hours
- **User Experience:** <2% support tickets related to subscription issues
- **System Reliability:** 99.9% uptime for subscription validation

### Validation Tests
1. **Create test user** → **Pay for premium** → **Cancel subscription** → **Verify access expires**
2. **Simulate payment failure** → **Verify grace period** → **Verify eventual expiration**
3. **Test cron jobs** → **Verify expired users lose access** → **Verify notifications sent**

### Rollback Plan
If critical issues occur:
1. **Disable cron jobs** immediately
2. **Revert webhook changes** to previous version
3. **Manually review** all subscription statuses
4. **Fix issues** and redeploy with additional testing

---

## 🚨 CRITICAL REMINDERS

1. **Week 1 is CRITICAL** - Revenue is bleeding daily until implemented
2. **Test everything** with the existing test user (ID: 46a4ceb1-be91-487e-8bfe-a9b95389351d)
3. **Monitor closely** after each deployment
4. **Have rollback plan** ready for each change
5. **Document everything** for future maintenance

This plan addresses the critical subscription management gaps while maintaining compatibility with the existing simplified onboarding flow. Execute Week 1 immediately to stop revenue loss.
