# Onboarding System Troubleshooting Guide

## 🚨 **Critical Issues & Solutions**

This guide documents the major onboarding issues identified and resolved during production debugging sessions, providing actionable solutions for future troubleshooting.

---

## **Issue #1: Tool Selection Logic Error**

### **Problem Description**
```
User: "Esta correcto" (confirming onboarding data)
Bot: "I need more information to log your run. Please provide the following: userId"
```

**Root Cause**: AI incorrectly used `log_run` tool instead of `complete_onboarding` when user confirmed their onboarding summary.

### **Technical Analysis**
- **Symptom**: User receives run logging error during onboarding confirmation
- **Cause**: Ambiguous prompts led AI to misinterpret confirmation as run data
- **Impact**: 0% onboarding completion rate, complete system failure

### **Solution Implemented**
1. **Few-Shot Examples Added**:
   ```typescript
   // Spanish Confirmation Example:
   User: "Está correcto, todo perfecto"
   Context: User confirming onboarding summary
   Action: USE complete_onboarding TOOL ✅
   Never: log_run ❌
   ```

2. **Automatic Detection System**:
   ```typescript
   isOnboardingConfirmation(message, userProfile) {
     // 30+ multilingual confirmation patterns
     // Only active when onboardingCompleted = false
     // Detailed logging for debugging
   }
   ```

3. **Critical Context Injection**:
   ```
   ## 🚨 CRITICAL ONBOARDING CONFIRMATION DETECTED 🚨
   USER IS CONFIRMING THEIR ONBOARDING DATA RIGHT NOW!
   - YOU MUST USE complete_onboarding TOOL IMMEDIATELY
   - DO NOT use log_run tool - this is not run data
   ```

### **Validation Steps**
1. Send "iniciar" to WhatsApp bot
2. Complete onboarding flow normally
3. When confirming with "Esta correcto" → Should use `complete_onboarding`
4. Check Railway logs for: `🎯 [ONBOARDING_CONFIRMATION] Exact match detected`

---

## **Issue #2: Database Constraint Violation**

### **Problem Description**
```
PostgresError: new row for relation "users" violates check constraint "users_onboarding_goal_check"
```

**Root Cause**: System attempted to save `'marathon'` in `onboardingGoal` field, which only allows `['first_race', 'improve_time', 'stay_fit']`.

### **Technical Analysis**
- **Symptom**: Database constraint error during onboarding completion
- **Cause**: Incorrect field mapping - `'marathon'` belongs in `goalRace`, not `onboardingGoal`
- **Impact**: Onboarding fails at final step despite correct tool selection

### **Database Schema Understanding**
```sql
-- Two separate fields with different purposes:
onboardingGoal: ['first_race', 'improve_time', 'stay_fit']  -- Type of objective
goalRace: ['5k', '10k', 'half_marathon', 'marathon', 'ultra']  -- Specific race
```

### **Solution Implemented**
1. **Intelligent Goal Mapping Function**:
   ```typescript
   mapGoalToDatabase('quiero correr una maratón') → {
     onboardingGoal: 'improve_time',  // Correct field
     goalRace: 'marathon'             // Correct field
   }
   ```

2. **Comprehensive Mapping Coverage**:
   - Race-specific goals → `goalRace` field
   - General fitness goals → `onboardingGoal` only
   - Bilingual support (Spanish/English)
   - Default handling for unknown goals

### **Validation Steps**
1. Check database schema: `\d users` in PostgreSQL
2. Test goal mapping: Various goal inputs should map correctly
3. Verify database insertion: No constraint violations
4. Check Railway logs for: `✅ [ONBOARDING_COMPLETER] Goal mapped: marathon → { onboardingGoal: 'improve_time', goalRace: 'marathon' }`

---

## **Issue #3: Premium Subscription Activation**

### **Problem Description**
User completed Gumroad purchase but system didn't activate premium status automatically.

### **Technical Analysis**
- **Symptom**: User remains on free plan despite successful purchase
- **Cause**: Missing environment variables for Gumroad product ID validation
- **Impact**: Manual intervention required for each purchase

### **Gumroad Webhook Flow**
```
1. User completes purchase on Gumroad
2. Gumroad sends webhook to /webhook/gumroad
3. System validates product_id against configured values
4. Updates user subscriptionStatus to 'premium'
5. Sets premiumActivatedAt timestamp
```

### **Solution Implemented**
1. **Product ID Configuration**:
   ```
   GUMROAD_PRODUCT_ID_EN=andes
   GUMROAD_PRODUCT_ID_ES=andeslatam
   ```

2. **Manual Activation Script**:
   ```bash
   npx tsx packages/database/src/scripts/activate-premium-manual.ts
   ```

3. **Webhook Testing Tools**:
   ```bash
   node test-webhook-with-valid-id.cjs
   ```

### **Validation Steps**
1. Check Railway environment variables are set
2. Test webhook endpoint responds correctly
3. Verify user status updates in database
4. Monitor Railway logs for webhook processing

---

## **Debugging Tools & Scripts**

### **User Status Verification**
```bash
# Check current user status
npx tsx packages/database/src/scripts/check-premium-status.ts

# Reset onboarding for testing (keeps premium)
npx tsx packages/database/src/scripts/reset-onboarding-only.ts

# Manually activate premium
npx tsx packages/database/src/scripts/activate-premium-manual.ts
```

### **Webhook Testing**
```bash
# Test webhook with valid product ID
node test-webhook-with-valid-id.cjs

# Test different product IDs
node test-product-ids.cjs

# Check Railway environment variables
node check-railway-vars.cjs
```

### **Railway Logs Monitoring**
Key log patterns to watch for:
```
🎯 [ONBOARDING_CONFIRMATION] Exact match detected: "Esta correcto"
🔧 [TOOL_REGISTRY] Executing tool: complete_onboarding
✅ [ONBOARDING_COMPLETER] Goal mapped: marathon → { onboardingGoal: 'improve_time', goalRace: 'marathon' }
🎉 [GUMROAD] Successfully upgraded user to premium!
```

---

## **Prevention Strategies**

### **Code Review Checklist**
- [ ] Tool selection logic includes few-shot examples
- [ ] Database field mapping respects schema constraints
- [ ] Environment variables configured for all environments
- [ ] Comprehensive logging for debugging
- [ ] Test scripts available for validation

### **Testing Protocol**
1. **End-to-End Onboarding Test**: Complete flow from "iniciar" to plan generation
2. **Multilingual Confirmation Test**: Test Spanish and English confirmations
3. **Database Constraint Test**: Verify all goal types map correctly
4. **Premium Activation Test**: Validate webhook processing
5. **Error Recovery Test**: Ensure graceful handling of edge cases

### **Monitoring & Alerts**
- Railway logs for error patterns
- Database constraint violations
- Webhook processing failures
- User completion rates
- Premium activation success rates
