# Comprehensive Testing Methodology for WhatsApp AI Coach System

## Overview
This document provides a systematic testing approach for validating all critical system flows using a single phone number by strategically deleting and recreating user data to simulate different scenarios.

## Prerequisites
- Access to Railway backend logs
- Access to Neon database
- WhatsApp access with test phone number: `593984074389`
- Gumroad test account access
- Terminal access to run database scripts

---

## 1. User Creation and Deletion Flows

### 1.1 Complete System Reset
**Purpose**: Clean slate for comprehensive testing

```bash
# Step 1: Force delete existing user data
npx tsx packages/database/src/scripts/force-delete-user.ts

# Step 2: Verify complete system cleanup
npx tsx packages/database/src/scripts/verify-clean-system.ts

# Step 3: Check Redis counters are reset
npx tsx packages/database/src/scripts/check-redis-counter.ts
```

**Verification Checklist**:
- [ ] User record deleted from PostgreSQL
- [ ] Redis message counters reset
- [ ] No orphaned data in related tables
- [ ] System logs show clean state

### 1.2 New User Creation Testing
**Purpose**: Verify user persistence on first WhatsApp interaction

**Test Steps**:
1. Send initial WhatsApp message: `"Hola, quiero empezar a entrenar"`
2. Monitor Railway logs for user creation
3. Verify database persistence

**Expected Logs**:
```
🔥 [DATABASE] User not found, creating new user for phone: 593984074389
🔥 [DATABASE] New user created with VALID status
```

**Database Verification**:
```bash
npx tsx packages/database/src/scripts/find-user.ts
```

**Success Criteria**:
- [ ] User created with `subscriptionStatus: 'free'`
- [ ] `preferredLanguage` detected correctly
- [ ] `onboardingCompleted: false`
- [ ] `weeklyMessageCount: 0`
- [ ] Valid timestamps for `createdAt` and `updatedAt`

---

## 2. Language Testing (Spanish and English)

### 2.1 Spanish Language Flow Testing

**Test Scenario 1: Free Training Flow (Spanish)**
```bash
# Reset system
npx tsx packages/database/src/scripts/complete-system-reset.ts
```

**WhatsApp Messages to Send**:
1. `"Hola, quiero empezar a entrenar"` (Initial contact)
2. `"Tengo 30 años"` (Age input)
3. `"Soy hombre"` (Gender)
4. `"Quiero correr mi primera carrera"` (Goal)

**Verification Points**:
- [ ] Language detected as `'es'`
- [ ] All responses in Spanish
- [ ] No language switching during flow
- [ ] Onboarding questions in Spanish

### 2.2 English Language Flow Testing

**Test Scenario 2: Free Training Flow (English)**
```bash
# Reset system
npx tsx packages/database/src/scripts/complete-system-reset.ts
```

**WhatsApp Messages to Send**:
1. `"Hi, I want to start training"` (Initial contact)
2. `"I am 30 years old"` (Age input)
3. `"I am male"` (Gender)
4. `"I want to run my first race"` (Goal)

**Verification Points**:
- [ ] Language detected as `'en'`
- [ ] All responses in English
- [ ] No language switching during flow
- [ ] Onboarding questions in English

### 2.3 Language Consistency Validation

**Critical Test**: Verify system doesn't incorrectly switch languages mid-conversation

**Test Steps**:
1. Start conversation in English
2. Send mixed-language message: `"I want premium access por favor"`
3. Continue with English messages
4. Verify all responses remain in English

---

## 3. Premium License Purchase Flow

### 3.1 Premium Intent Detection Testing

**Test Scenario 3: Premium Intent (Spanish)**
```bash
# Reset system
npx tsx packages/database/src/scripts/complete-system-reset.ts
```

**WhatsApp Message**: `"Quiero acceso premium"`

**Expected System Behavior**:
1. User creation with `subscriptionStatus: 'free'`
2. Premium intent detection
3. Status update to `'pending_payment'`
4. Gumroad link generation
5. Payment link sent via WhatsApp

**Railway Logs to Monitor**:
```
🔥 [PREMIUM] Processing premium upgrade for user 593984074389
🔥 [PREMIUM] Generated Gumroad URL: https://gumroad.com/l/andeslatam?custom_fields[phone_number]=593984074389
```

**Database Verification**:
```bash
npx tsx packages/database/src/scripts/check-user-status.ts
```

### 3.2 Gumroad Payment Link Generation

**Verification Steps**:
1. Check generated URL format
2. Verify phone number encoding
3. Confirm correct product ID (ES: `andeslatam`, EN: `andes`)

**Expected URL Format**:
- Spanish: `https://gumroad.com/l/andeslatam?custom_fields[phone_number]=593984074389`
- English: `https://gumroad.com/l/andes?custom_fields[phone_number]=593984074389`

### 3.3 Webhook Processing Testing

**Test Scenario 4: Gumroad Webhook Simulation**

**Preparation**:
1. Ensure user exists with `subscriptionStatus: 'pending_payment'`
2. Use webhook testing script

**Webhook Test Payload**:
```json
{
  "sale_id": "test_12345",
  "product_id": "test_product",
  "product_name": "Andes Premium",
  "email": "test@example.com",
  "custom_fields": "{\"phone_number\":\"593984074389\"}",
  "url_params": {
    "custom_fields%5Bphone_number%5D": "593984074389"
  },
  "price": "9.99",
  "recurrence": "monthly"
}
```

**Testing Command**:
```bash
# Test webhook processing
curl -X POST https://your-railway-app.railway.app/webhook/gumroad \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sale_id=test_12345&product_name=Andes Premium&custom_fields={\"phone_number\":\"593984074389\"}&price=9.99"
```

**Expected Webhook Processing**:
1. Phone number extraction successful
2. User lookup by phone number
3. Status update to `'premium'`
4. `premiumActivatedAt` timestamp set
5. WhatsApp confirmation message sent

**Railway Logs to Monitor**:
```
🔥 [GUMROAD] Webhook received at: [timestamp]
🔥 [GUMROAD] Extracted phone number: 593984074389
🎉 [GUMROAD] Successfully upgraded user to premium!
✅ WhatsApp confirmation sent successfully
```

### 3.4 End-to-End Premium Feature Access

**Test Scenario 5: Premium Feature Validation**

**After successful webhook processing**:
1. Send WhatsApp message: `"Quiero mi plan de entrenamiento"`
2. Verify premium features are accessible
3. Confirm no message limits apply
4. Test advanced AI coaching features

**Success Criteria**:
- [ ] No freemium restrictions
- [ ] Access to personalized training plans
- [ ] Advanced AI responses
- [ ] No payment prompts

---

## 4. Critical System Integrations

### 4.1 WhatsApp Bot Response Consistency

**Test Matrix**:
| Scenario | Language | Status | Expected Response |
|----------|----------|--------|-------------------|
| New User | ES | free | Spanish onboarding |
| New User | EN | free | English onboarding |
| Premium Intent | ES | pending_payment | Spanish payment link |
| Premium Intent | EN | pending_payment | English payment link |
| Premium User | ES | premium | Spanish coaching |
| Premium User | EN | premium | English coaching |

### 4.2 Database Persistence Verification

**Continuous Monitoring Script**:
```bash
# Monitor user state changes
watch -n 5 'npx tsx packages/database/src/scripts/check-user-status.ts'
```

### 4.3 Payment Webhook Reliability

**Webhook Health Check**:
```bash
# Test webhook endpoint availability
curl -X GET https://your-railway-app.railway.app/debug/gumroad
```

---

## 5. Edge Cases and Error Scenarios

### 5.1 Network Failures During Payment Processing

**Test Scenario 6: Webhook Timeout Simulation**

**Setup**:
1. User in `pending_payment` status
2. Simulate webhook delay/failure
3. Test system recovery

**Recovery Verification**:
- [ ] User remains in `pending_payment` status
- [ ] No duplicate processing on retry
- [ ] Manual activation script works

**Manual Recovery**:
```bash
npx tsx packages/database/src/scripts/activate-premium-manual.ts
```

### 5.2 Duplicate User Creation Attempts

**Test Scenario 7: Concurrent User Creation**

**Test Steps**:
1. Send multiple WhatsApp messages rapidly
2. Monitor for duplicate user creation
3. Verify database constraints prevent duplicates

**Expected Behavior**:
- [ ] Only one user record created
- [ ] Subsequent messages use existing user
- [ ] No database constraint violations

### 5.3 Invalid Phone Number Handling

**Test Scenario 8: Malformed Phone Numbers**

**Webhook Test with Invalid Phone**:
```json
{
  "custom_fields": "{\"phone_number\":\"invalid_phone\"}",
  "product_name": "Andes Premium"
}
```

**Expected Behavior**:
- [ ] Webhook returns 404 error
- [ ] No user status changes
- [ ] Error logged appropriately

### 5.4 Payment Failures and Rollback

**Test Scenario 9: Failed Payment Processing**

**Setup**:
1. User in `pending_payment` status
2. Send webhook with invalid product
3. Verify no status change

**Rollback Verification**:
- [ ] User remains in `pending_payment`
- [ ] No premium access granted
- [ ] System logs error appropriately

---

## 6. Testing Execution Workflow

### Phase 1: System Preparation
1. **Complete System Reset**
   ```bash
   npx tsx packages/database/src/scripts/complete-system-reset.ts
   npx tsx packages/database/src/scripts/verify-clean-system.ts
   ```

2. **Environment Verification**
   ```bash
   npx tsx packages/database/src/scripts/check-env-vars.ts
   npx tsx packages/database/src/scripts/verify-database-connection.ts
   ```

### Phase 2: Core Flow Testing
1. **User Creation Flow** (Test Scenarios 1-2)
2. **Language Detection** (Spanish & English flows)
3. **Premium Intent Detection** (Test Scenario 3)

### Phase 3: Payment Integration Testing
1. **Gumroad Link Generation** (Test Scenario 4)
2. **Webhook Processing** (Simulate payment completion)
3. **Premium Feature Access** (Test Scenario 5)

### Phase 4: Edge Case Validation
1. **Network Failure Scenarios** (Test Scenario 6)
2. **Duplicate Prevention** (Test Scenario 7)
3. **Error Handling** (Test Scenarios 8-9)

### Phase 5: Production Readiness
1. **End-to-End Integration Test**
2. **Performance Validation**
3. **Security Verification**

---

## 7. Success Criteria Checklist

### Core Functionality
- [ ] User creation on first WhatsApp interaction
- [ ] Accurate language detection and consistency
- [ ] Premium intent detection and processing
- [ ] Gumroad payment link generation
- [ ] Webhook processing and user upgrade
- [ ] Premium feature access validation

### System Reliability
- [ ] No duplicate user creation
- [ ] Proper error handling for edge cases
- [ ] Database consistency maintained
- [ ] WhatsApp response reliability
- [ ] Payment processing accuracy

### Revenue Protection
- [ ] Premium users correctly identified
- [ ] Payment webhooks process successfully
- [ ] No revenue loss from processing errors
- [ ] Manual recovery procedures work

---

## 8. Rollback Procedures

### If Critical Issues Discovered

**Immediate Actions**:
1. **Stop Payment Processing**
   ```bash
   # Disable webhook endpoint temporarily
   # Update Railway environment variable
   WEBHOOK_DISABLED=true
   ```

2. **User Data Recovery**
   ```bash
   # Restore user to previous state
   npx tsx packages/database/src/scripts/reset-user-subscription.ts
   ```

3. **System Health Check**
   ```bash
   npx tsx packages/database/src/scripts/final-system-check.ts
   ```

### Communication Plan
- Notify users of temporary service interruption
- Provide manual support for premium activations
- Document issues for post-deployment fixes

---

## 9. Monitoring and Alerts

### Key Metrics to Track
- User creation success rate
- Language detection accuracy
- Premium conversion rate
- Webhook processing success rate
- Payment completion rate

### Alert Thresholds
- User creation failures > 5%
- Language detection errors > 10%
- Webhook processing failures > 2%
- Premium activation delays > 5 minutes

This comprehensive testing methodology ensures all critical system flows are validated before production deployment, protecting revenue streams and maintaining user experience quality.

---

## 10. Quick Reference Testing Commands

### Automated Testing Suite
```bash
# Run full test suite
node scripts/comprehensive-testing-suite.js full-suite

# Individual test scenarios
node scripts/comprehensive-testing-suite.js reset
node scripts/comprehensive-testing-suite.js user-creation
node scripts/comprehensive-testing-suite.js language-spanish
node scripts/comprehensive-testing-suite.js language-english
node scripts/comprehensive-testing-suite.js premium-intent
node scripts/comprehensive-testing-suite.js webhook-test
node scripts/comprehensive-testing-suite.js edge-cases
```

### Manual Database Operations
```bash
# System reset and verification
npx tsx packages/database/src/scripts/complete-system-reset.ts
npx tsx packages/database/src/scripts/verify-clean-system.ts

# User management
npx tsx packages/database/src/scripts/find-user.ts
npx tsx packages/database/src/scripts/check-user-status.ts
npx tsx packages/database/src/scripts/check-premium-status.ts

# Manual premium activation (emergency)
npx tsx packages/database/src/scripts/activate-premium-manual.ts

# System health checks
npx tsx packages/database/src/scripts/final-system-check.ts
npx tsx packages/database/src/scripts/verify-database-connection.ts
```

### Webhook Testing
```bash
# Test valid webhook
curl -X POST https://your-railway-app.railway.app/webhook/gumroad \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sale_id=test_12345&product_name=Andes Premium&custom_fields={\"phone_number\":\"593984074389\"}&price=9.99"

# Test debug endpoint
curl -X POST https://your-railway-app.railway.app/debug/gumroad \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

---

## 11. Testing Checklist Template

### Pre-Testing Setup
- [ ] Railway backend accessible
- [ ] Database connection verified
- [ ] WhatsApp test number ready: `593984074389`
- [ ] Gumroad test account configured
- [ ] Environment variables validated

### Core Flow Validation
- [ ] **User Creation**: First WhatsApp interaction creates user
- [ ] **Spanish Flow**: Language detection and consistency
- [ ] **English Flow**: Language detection and consistency
- [ ] **Premium Intent**: Detection and payment link generation
- [ ] **Webhook Processing**: Payment completion and user upgrade
- [ ] **Premium Access**: Feature availability after upgrade

### System Integration Checks
- [ ] **Database Persistence**: User data correctly stored
- [ ] **Language Consistency**: No mid-conversation switching
- [ ] **Payment Links**: Correct product IDs and phone encoding
- [ ] **Webhook Reliability**: Successful processing and confirmation
- [ ] **Error Handling**: Graceful failure management

### Revenue Protection Validation
- [ ] **Premium Detection**: Correct intent classification
- [ ] **Payment Processing**: Webhook handles all formats
- [ ] **User Upgrade**: Status correctly updated to premium
- [ ] **Feature Access**: Premium features immediately available
- [ ] **Manual Recovery**: Emergency activation procedures work

### Edge Case Testing
- [ ] **Duplicate Prevention**: Multiple messages don't create duplicates
- [ ] **Invalid Data**: System handles malformed inputs
- [ ] **Network Failures**: Graceful degradation and recovery
- [ ] **Concurrent Access**: System handles simultaneous requests

### Production Readiness
- [ ] **All Tests Pass**: No critical failures detected
- [ ] **Performance Acceptable**: Response times within limits
- [ ] **Monitoring Active**: Logs and alerts configured
- [ ] **Rollback Ready**: Recovery procedures documented
- [ ] **Team Notified**: Stakeholders informed of deployment status

---

## 12. Emergency Procedures

### If Critical Issues Found During Testing

**Immediate Actions**:
1. **Stop Testing**: Document current state
2. **Preserve Evidence**: Save logs and database state
3. **Assess Impact**: Determine severity and scope
4. **Notify Team**: Alert relevant stakeholders

**Recovery Steps**:
```bash
# Emergency system reset
npx tsx packages/database/src/scripts/complete-system-reset.ts

# Manual user recovery (if needed)
npx tsx packages/database/src/scripts/activate-premium-manual.ts

# System health verification
npx tsx packages/database/src/scripts/final-system-check.ts
```

**Communication Template**:
```
TESTING ALERT: Critical issue discovered in [component]
- Issue: [description]
- Impact: [user/revenue impact]
- Status: [investigating/fixing/resolved]
- ETA: [estimated resolution time]
- Actions: [immediate steps taken]
```

This comprehensive testing framework ensures robust validation of all system components before production deployment, minimizing risk and protecting revenue streams.
