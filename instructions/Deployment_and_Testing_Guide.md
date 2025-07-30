# Deployment and Testing Guide

## 🚀 **Overview**

This guide provides comprehensive procedures for building, deploying, and testing the Andes AI Running Coach system, based on production debugging experience and critical fixes implemented.

---

## **1. Build and Deployment Procedures**

### **Pre-Deployment Checklist**
- [ ] All TypeScript errors resolved
- [ ] Database schema constraints respected
- [ ] Environment variables configured
- [ ] Test scripts validated
- [ ] Critical fixes verified locally

### **Build Process**
```bash
# Clean build of all packages
pnpm build
```

**Expected Output**:
```
Scope: 6 of 7 workspace projects
packages/shared build$ tsc ✅
packages/database build$ tsc ✅
packages/plan-generator build$ tsc ✅
packages/vector-memory build$ tsc ✅
packages/llm-orchestrator build$ tsc ✅
apps/api-gateway build$ tsc ✅
```

### **Common Build Errors & Solutions**

#### **TypeScript Property Errors**
```
error TS2339: Property 'email' does not exist on type 'User'
```
**Solution**: Use type assertion `(user as any).email`

#### **String Template Errors**
```
error TS1434: Unexpected keyword or identifier
```
**Solution**: Remove special characters (✅❌) from template strings

#### **Module Resolution Errors**
```
Cannot find package '@neondatabase/serverless'
```
**Solution**: Use correct database driver (postgres-js, not neon)

### **Deployment Commands**
```bash
# Commit changes
git add .
git commit -m "🔧 [DESCRIPTION]: [CHANGES]"

# Push to Railway (auto-deploys)
git push origin feature/project-status-validation
```

### **Deployment Verification**
1. Check Railway deployment status
2. Monitor build logs for errors
3. Verify service startup
4. Test critical endpoints

---

## **2. User State Reset Scripts**

### **Complete Status Check**
```bash
# Comprehensive user status verification
npx tsx packages/database/src/scripts/check-premium-status.ts
```

**Use Cases**:
- Initial user state assessment
- Post-deployment verification
- Troubleshooting user issues
- Premium status validation

### **Onboarding Reset (Preserve Premium)**
```bash
# Reset onboarding while keeping premium status
npx tsx packages/database/src/scripts/reset-onboarding-only.ts
```

**When to Use**:
- Testing onboarding completion fixes
- Debugging tool selection issues
- Validating confirmation detection
- Maintaining premium access during testing

**Expected Output**:
```
✅ ONBOARDING RESET SUCCESSFUL!
📝 Onboarding Completed: false
💎 Premium Status: premium (unchanged)
⭐ Premium Activated: [timestamp] (unchanged)
```

### **Premium Activation**
```bash
# Manually activate premium subscription
npx tsx packages/database/src/scripts/activate-premium-manual.ts
```

**When to Use**:
- Gumroad webhook failures
- Emergency user support
- Testing premium features
- Creator purchase issues

### **Subscription Reset for Testing**
```bash
# Reset to test complete webhook flow
npx tsx packages/database/src/scripts/reset-for-webhook-test.ts
```

**When to Use**:
- End-to-end webhook testing
- Validating subscription flow
- Debugging webhook processing
- Testing product ID validation

---

## **3. Railway Logs Monitoring**

### **Critical Log Patterns**

#### **Onboarding Completion Success**
```
🎯 [ONBOARDING_CONFIRMATION] Exact match detected: "Esta correcto"
🔧 [TOOL_REGISTRY] Executing tool: complete_onboarding
✅ [ONBOARDING_COMPLETER] Goal mapped: marathon → { onboardingGoal: 'improve_time', goalRace: 'marathon' }
✅ Executed tool: complete_onboarding
```

#### **Tool Selection Error (Fixed)**
```
❌ OLD: 🔧 [TOOL_REGISTRY] Executing tool: log_run
✅ NEW: 🔧 [TOOL_REGISTRY] Executing tool: complete_onboarding
```

#### **Database Constraint Success**
```
✅ [ONBOARDING_COMPLETER] User onboarding completed successfully
✅ [DATABASE] User updated with proper field mapping
```

#### **Premium Activation**
```
🎉 [GUMROAD] Successfully upgraded user to premium!
🎉 [GUMROAD] Premium activated at: [timestamp]
✅ WhatsApp confirmation sent successfully
```

### **Error Patterns to Watch**
```
❌ PostgresError: violates check constraint "users_onboarding_goal_check"
❌ I need more information to log your run. Please provide: userId
❌ Product ID does not match
❌ User not found for phone [number]
```

### **Log Filtering Commands**
```bash
# Filter for onboarding issues
grep "ONBOARDING" railway-logs.txt

# Filter for tool execution
grep "TOOL_REGISTRY" railway-logs.txt

# Filter for database errors
grep "PostgresError" railway-logs.txt

# Filter for webhook processing
grep "GUMROAD" railway-logs.txt
```

---

## **4. WhatsApp Bot Behavior Validation**

### **Onboarding Flow Testing**

#### **Step 1: Initiate Onboarding**
```
User: "iniciar"
Expected: Welcome message + first question (name)
```

#### **Step 2: Complete Information Gathering**
```
Bot: "¿Cómo te llamas?"
User: "Diego"
Bot: "¿Cuántos años tienes?"
User: "29"
[Continue through all questions...]
```

#### **Step 3: Confirmation Summary**
```
Bot: Shows complete summary of user data
Bot: "¿Todo está correcto o hay algo que quieras ajustar?"
```

#### **Step 4: Critical Confirmation Test**
```
User: "Esta correcto"
Expected: ✅ Uses complete_onboarding tool
Expected: ✅ Generates training plan
Expected: ❌ NO "I need more information to log your run" error
```

### **Premium User Behavior**
Premium users should experience:
- **Sophisticated Responses**: GPT-4o Mini for all interactions
- **No Upgrade Prompts**: No premium subscription messages
- **Enhanced Features**: Access to all premium functionality
- **Better Empathy**: More nuanced and supportive responses

### **Free User Behavior**
Free users should experience:
- **Basic Responses**: Standard model for most interactions
- **Upgrade Prompts**: After message limit reached
- **Limited Features**: Basic functionality only
- **Gumroad Links**: Clear path to premium upgrade

---

## **5. Webhook Testing Procedures**

### **Environment Validation**
```bash
# Check Railway environment variables
node check-railway-vars.cjs
```

**Required Variables**:
```
GUMROAD_PRODUCT_ID_EN=andes
GUMROAD_PRODUCT_ID_ES=andeslatam
GUMROAD_WEBHOOK_SECRET=[secret]
```

### **Product ID Testing**
```bash
# Test all configured product IDs
node test-product-ids.cjs
```

**Expected Results**:
```
✅ VALID PRODUCT IDs:
   - "andes"
   - "andeslatam"
❌ INVALID PRODUCT IDs:
   - "andes-premium"
   - "running-coach"
```

### **Webhook Simulation**
```bash
# Test webhook with valid product ID
node test-webhook-with-valid-id.cjs
```

**Test Scenarios**:
1. **New User Purchase**: Should activate premium
2. **Existing Premium User**: Should return "User already premium"
3. **Invalid Product ID**: Should return "Product ID does not match"
4. **User Not Found**: Should return "User not found"

---

## **6. End-to-End Testing Protocol**

### **Complete System Test**
1. **Reset User State**: Use reset scripts to clean state
2. **Test Onboarding**: Complete full onboarding flow
3. **Validate Database**: Check data persistence
4. **Test Premium Features**: Verify premium behavior
5. **Test Webhook**: Simulate Gumroad purchase
6. **Monitor Logs**: Verify all processes working

### **Regression Testing**
After any deployment:
1. **Tool Selection**: Confirm correct tool usage
2. **Database Constraints**: Verify no constraint violations
3. **Multilingual Support**: Test Spanish and English
4. **Premium Activation**: Test webhook processing
5. **Error Handling**: Verify graceful error recovery

### **Performance Testing**
1. **Response Times**: Monitor bot response latency
2. **Database Queries**: Check query performance
3. **Memory Usage**: Monitor Railway resource usage
4. **Concurrent Users**: Test multiple simultaneous users

---

## **7. Troubleshooting Quick Reference**

### **Onboarding Issues**
```bash
# Check user status
npx tsx packages/database/src/scripts/check-premium-status.ts

# Reset onboarding if needed
npx tsx packages/database/src/scripts/reset-onboarding-only.ts

# Test bot with "iniciar"
```

### **Premium Issues**
```bash
# Check subscription status
npx tsx packages/database/src/scripts/check-premium-status.ts

# Manually activate if needed
npx tsx packages/database/src/scripts/activate-premium-manual.ts

# Test webhook processing
node test-webhook-with-valid-id.cjs
```

### **Database Issues**
```bash
# Check for constraint violations in logs
grep "constraint" railway-logs.txt

# Verify schema compliance
\d users  # In PostgreSQL console

# Test field mapping
# Check mapGoalToDatabase function
```

### **Deployment Issues**
```bash
# Check build errors
pnpm build

# Verify TypeScript compilation
tsc --noEmit

# Check Railway deployment status
# Monitor Railway dashboard
```

---

## **8. Emergency Response Procedures**

### **System Down**
1. Check Railway service status
2. Review recent deployments
3. Check error logs
4. Rollback if necessary
5. Notify users if extended outage

### **Onboarding Broken**
1. Identify affected users
2. Reset user states if needed
3. Deploy hotfix
4. Manually complete onboarding if urgent
5. Monitor for resolution

### **Premium Issues**
1. Manually activate affected users
2. Investigate webhook issues
3. Fix root cause
4. Validate resolution
5. Update monitoring

### **Data Corruption**
1. Stop writes immediately
2. Assess damage scope
3. Restore from backup if needed
4. Fix data integrity issues
5. Resume operations carefully
