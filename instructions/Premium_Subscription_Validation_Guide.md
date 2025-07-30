# Premium Subscription Validation Guide

## 🎯 **Overview**

This guide provides comprehensive procedures for validating premium subscription activation, troubleshooting webhook issues, and managing user subscription states based on production debugging experience.

---

## **1. Subscription Status Validation**

### **Database Status Check**
```bash
# Check user's current subscription status
npx tsx packages/database/src/scripts/check-premium-status.ts
```

**Expected Output for Premium User**:
```
📊 Subscription Status: premium
⭐ Premium Activated At: [timestamp]
🤖 Bot should use GPT-4o Mini for all interactions
🚫 No premium upgrade prompts should appear
```

**Expected Output for Free User**:
```
📊 Subscription Status: free
⭐ Premium Activated At: Not activated
🔍 NEXT STEPS: Check if Gumroad webhook was received
```

### **WhatsApp Bot Behavior Validation**
Premium users should experience:
- ✅ GPT-4o Mini for ALL interactions (not just specific intents)
- ✅ No premium upgrade prompts
- ✅ Access to all premium features
- ✅ More sophisticated and empathetic responses

---

## **2. Gumroad Webhook Processing**

### **Webhook Endpoint Validation**
```bash
# Test webhook endpoint availability
node check-railway-vars.cjs
```

**Expected Response**:
```
✅ Webhook endpoint is configured
🔗 URL: https://v3-production-2670.up.railway.app/webhook
🔑 Token Configurations: All configured
```

### **Product ID Configuration**
Verify environment variables in Railway:
```
GUMROAD_PRODUCT_ID_EN=andes
GUMROAD_PRODUCT_ID_ES=andeslatam
```

**Test Product ID Validation**:
```bash
# Test which product IDs are configured
node test-product-ids.cjs
```

**Expected Output**:
```
✅ VALID PRODUCT IDs:
   - "andes"
   - "andeslatam"
```

### **Webhook Processing Flow**
```
1. Gumroad Purchase Completed
   ↓
2. Webhook POST to /webhook/gumroad
   ↓
3. Product ID Validation (andes/andeslatam)
   ↓
4. User Lookup by Phone Number
   ↓
5. Subscription Status Update to 'premium'
   ↓
6. Premium Activated Timestamp Set
   ↓
7. WhatsApp Confirmation Message Sent
```

### **Railway Logs Monitoring**
Key webhook processing logs:
```
🔥 [GUMROAD] Webhook received at: [timestamp]
🔥 [GUMROAD] Expected product IDs: EN=andes, ES=andeslatam
🔥 [GUMROAD] Extracted phone number: [phone]
🎉 [GUMROAD] Successfully upgraded user to premium!
✅ WhatsApp confirmation sent successfully
```

---

## **3. Manual Activation Procedures**

### **When to Use Manual Activation**
- Gumroad webhook failed to process
- Product creator purchases (may not trigger webhooks)
- Testing premium features
- Emergency user support

### **Manual Activation Script**
```bash
# Activate premium for specific user
npx tsx packages/database/src/scripts/activate-premium-manual.ts
```

**Script Process**:
1. Finds user by phone number (593984074389)
2. Checks current subscription status
3. Updates to premium if not already active
4. Sets premiumActivatedAt timestamp
5. Provides confirmation and next steps

### **Validation After Manual Activation**
```bash
# Verify activation was successful
npx tsx packages/database/src/scripts/check-premium-status.ts
```

---

## **4. Webhook Testing Procedures**

### **Test Webhook with Valid Product ID**
```bash
# Simulate successful Gumroad webhook
node test-webhook-with-valid-id.cjs
```

**Test Payload**:
```json
{
  "sale_id": "test_sale_12345",
  "product_id": "andes",
  "email": "user@example.com",
  "custom_fields": "{\"phone_number\":\"593984074389\"}"
}
```

**Expected Responses**:
- **200 OK**: `{"success":true}` - Webhook processed successfully
- **400 Bad Request**: `{"error":"Product ID does not match"}` - Invalid product ID
- **400 Bad Request**: `{"success":true,"message":"User already premium"}` - User already premium

### **Comprehensive Product ID Testing**
```bash
# Test all possible product ID configurations
node test-product-ids.cjs
```

This script tests common product ID patterns and reports which ones are configured in Railway.

---

## **5. Troubleshooting Common Issues**

### **Issue: Webhook Not Received**
**Symptoms**: User completed purchase but status remains 'free'

**Debugging Steps**:
1. Check Railway logs for webhook POST requests
2. Verify Gumroad webhook URL configuration
3. Test webhook endpoint manually
4. Check product ID configuration

**Solution**: Usually requires manual activation while investigating webhook issue.

### **Issue: Product ID Mismatch**
**Symptoms**: Webhook returns "Product ID does not match" error

**Debugging Steps**:
1. Check actual product ID from Gumroad dashboard
2. Verify Railway environment variables
3. Test with correct product ID

**Solution**: Update environment variables with correct product IDs.

### **Issue: User Not Found**
**Symptoms**: Webhook returns "User not found" error

**Debugging Steps**:
1. Verify phone number in custom_fields
2. Check user exists in database
3. Verify phone number format consistency

**Solution**: Ensure phone number in Gumroad matches database format.

### **Issue: Creator vs Customer Purchases**
**Question**: Do webhooks fire for product creator purchases?

**Answer**: Yes, webhooks fire normally for creator purchases. The system treats them as regular customer purchases with no special handling required.

---

## **6. Database State Management**

### **Reset User for Testing**
```bash
# Reset subscription to test webhook flow
npx tsx packages/database/src/scripts/reset-for-webhook-test.ts
```

**Use Cases**:
- Testing webhook processing end-to-end
- Validating subscription activation flow
- Debugging webhook issues

### **Reset Onboarding Only**
```bash
# Reset onboarding while keeping premium status
npx tsx packages/database/src/scripts/reset-onboarding-only.ts
```

**Use Cases**:
- Testing onboarding completion fixes
- Maintaining premium access during testing
- Debugging onboarding-specific issues

---

## **7. Monitoring & Maintenance**

### **Regular Health Checks**
1. **Weekly**: Test webhook endpoint availability
2. **Monthly**: Verify product ID configurations
3. **After Deployments**: Test complete subscription flow
4. **User Reports**: Immediate validation of subscription status

### **Key Metrics to Monitor**
- Webhook processing success rate
- Premium activation completion rate
- Time between purchase and activation
- User support tickets related to subscriptions

### **Alert Conditions**
- Webhook endpoint returning errors
- Product ID mismatches increasing
- Manual activations exceeding threshold
- User complaints about premium access

---

## **8. Emergency Procedures**

### **Immediate User Support**
If user reports premium access issues:
1. Run status check script immediately
2. If not premium, run manual activation script
3. Verify bot behavior change
4. Investigate webhook logs for root cause

### **System-Wide Issues**
If multiple users report issues:
1. Check Railway service status
2. Verify environment variables
3. Test webhook endpoint
4. Check Gumroad service status
5. Review recent deployments

### **Rollback Procedures**
If subscription system fails:
1. Identify last working deployment
2. Rollback to previous version
3. Manually activate affected users
4. Investigate and fix issues
5. Redeploy with fixes
