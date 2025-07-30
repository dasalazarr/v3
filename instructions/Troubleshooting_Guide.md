# Troubleshooting Guide

## 🚨 Common Issues and Solutions

### **1. Message Counter Tool Not Executing**

#### **Symptoms**
- User asks "cuantos mensajes me quedan?" 
- Bot responds with generic template: "Mensajes utilizados: [Número de mensajes usados]"
- No tool execution logs in Railway
- Placeholder text instead of actual numbers

#### **Root Causes & Solutions**

**A. Intent Classification Failure**
```bash
# Check Railway logs for:
❌ Missing: [INTELLIGENT_CLASSIFIER] Intent: message_counter_check
✅ Expected: [INTELLIGENT_CLASSIFIER] Intent: message_counter_check (0.95)

# Solution: Verify intelligent classifier is deployed
git log --oneline -5  # Check recent commits
# Look for: "INTELLIGENT INTENT CLASSIFIER" commit
```

**B. Model Selection Issues**
```bash
# Check Railway logs for:
❌ Wrong: [HYBRID_AI] Using DeepSeek for cost-efficient processing
✅ Expected: [HYBRID_AI] Using GPT-4o Mini for message counter check

# Solution: Verify intent → model mapping
# File: packages/llm-orchestrator/src/hybrid-ai-agent.ts
# Ensure: message_counter_check → GPT-4o Mini
```

**C. Specialized Prompt Not Applied**
```bash
# Check Railway logs for:
❌ Missing: [HYBRID_AI] Using specialized message counter prompt
✅ Expected: [HYBRID_AI] Using specialized message counter prompt

# Solution: Verify prompt application logic
# File: packages/llm-orchestrator/src/hybrid-ai-agent.ts
# Check: getMessageCounterPrompt() method exists and is called
```

#### **Debugging Steps**
1. **Test Intent Classification**:
   ```bash
   npx tsx packages/database/src/scripts/test-intelligent-classifier.ts
   ```

2. **Check User Existence**:
   ```bash
   npx tsx packages/database/src/scripts/check-production-premium-status.ts
   ```

3. **Monitor Railway Logs**:
   - Look for `[INTELLIGENT_CLASSIFIER]` entries
   - Verify intent detection accuracy
   - Confirm model selection logic

### **2. Tool Calling Errors**

#### **Symptoms**
- Raw tool calls visible: `<｜tool▁calls▁begin｜>function<｜tool▁sep｜>generate_training_plan`
- Validation errors: "Expected boolean, received string"
- Tool execution failures

#### **Root Causes & Solutions**

**A. DeepSeek Tool Calling Issues**
```bash
# Problem: DeepSeek doesn't handle tool calling like OpenAI
# Solution: Force GPT-4o Mini for critical tools

# Check: Intent classification forces correct model
if (classification.intent === 'message_counter_check') {
  selectedAgent = this.openaiAgent; // GPT-4o Mini
}
```

**B. Parameter Type Conversion**
```bash
# Problem: AI passes "true" (string) instead of true (boolean)
# Solution: Automatic conversion in ToolRegistry

# File: packages/llm-orchestrator/src/tool-registry.ts
private convertStringBooleans(params: any): any {
  if (value === 'true') converted[key] = true;
  if (value === 'false') converted[key] = false;
}
```

**C. userId Parameter Issues**
```bash
# Problem: userId included in schema but excluded by ToolRegistry
# Solution: Manual userId handling

# File: apps/api-gateway/src/tools/training-plan-generator.ts
// Remove userId from schema, handle manually in execute()
```

### **3. User Not Found in Database**

#### **Symptoms**
- Local scripts return "User not found"
- Railway logs show user exists
- Discrepancy between local and production

#### **Root Causes & Solutions**

**A. Environment Mismatch**
```bash
# Problem: Local DATABASE_URL ≠ Production DATABASE_URL
# Solution: Verify environment variables

echo $DATABASE_URL  # Should point to Neon production DB
# Expected: postgresql://...@...neon.tech/...
```

**B. User Created in Production Only**
```bash
# Problem: User exists in Railway but not locally
# Solution: Use production database for queries

# File: packages/database/src/scripts/check-production-premium-status.ts
# Ensure: Uses production DATABASE_URL
```

### **4. Premium Status Not Updated**

#### **Symptoms**
- User reports purchasing premium
- Status still shows "pending_payment"
- Gumroad webhook not processed

#### **Root Causes & Solutions**

**A. Webhook Processing Delay**
```bash
# Check Railway logs for:
✅ Expected: [GUMROAD_WEBHOOK] Processing purchase for user
❌ Missing: Webhook processing logs

# Solution: Check Gumroad webhook configuration
# Verify: Webhook URL points to correct Railway endpoint
```

**B. Database Update Failure**
```bash
# Check user status:
npx tsx packages/database/src/scripts/check-production-premium-status.ts

# Look for:
subscriptionStatus: 'pending_payment' vs 'premium'
premiumActivatedAt: null vs timestamp
gumroadOrderId: null vs order_id
```

### **5. Build and Deployment Failures**

#### **Symptoms**
- Railway deployment fails
- TypeScript compilation errors
- Module import issues

#### **Common Build Errors & Solutions**

**A. TypeScript Compilation Errors**
```bash
# Error: 'user.weeklyMessageCount' is possibly 'null'
# Solution: Add null coalescing
const messageCount = user.weeklyMessageCount || 0;

# Error: Cannot find module '@running-coach/vector-memory'
# Solution: Exclude scripts from build
// tsconfig.json
"exclude": ["node_modules", "dist", "src/scripts/**/*"]
```

**B. Async/Await Syntax Errors**
```bash
# Error: 'await' expressions are only allowed within async functions
# Solution: Replace forEach with for loop
// Before: forEach(async (user) => { await ... })
// After: for (const user of users) { await ... }
```

## 🔍 Diagnostic Scripts

### **System Health Check**
```bash
# Complete system verification
npx tsx packages/database/src/scripts/final-system-check.ts
```

### **User Status Check**
```bash
# Check specific user status
npx tsx packages/database/src/scripts/check-production-premium-status.ts
```

### **Intent Classifier Testing**
```bash
# Test intelligent classification
npx tsx packages/database/src/scripts/test-intelligent-classifier.ts
```

### **Tool Execution Testing**
```bash
# Test message counter tool directly
npx tsx packages/database/src/scripts/test-message-counter-tool.ts
```

## 📊 Monitoring and Logging

### **Key Log Patterns to Monitor**

#### **Successful Message Counter Flow**
```
🧠 [INTELLIGENT_CLASSIFIER] Message: "cuantos mensajes me quedan?"
🧠 [INTELLIGENT_CLASSIFIER] Intent: message_counter_check (0.95)
🔧 [HYBRID_AI] Using GPT-4o Mini for message counter check
🔧 [HYBRID_AI] Using specialized message counter prompt
🔧 [TOOL_REGISTRY] Executing tool: check_message_counter
✅ [MESSAGE_COUNTER_TOOL] Checking counter for user
```

#### **Error Patterns to Alert On**
```
❌ [INTELLIGENT_CLASSIFIER] Error: Classification failed
❌ [TOOL_REGISTRY] Validation failed for tool
❌ [HYBRID_AI] Using DeepSeek for message counter (should be GPT-4o Mini)
❌ Tool execution failed: check_message_counter
```

### **Performance Metrics**
- **Intent Classification Accuracy**: >95%
- **Tool Execution Success Rate**: >98%
- **Response Time**: <2 seconds
- **Cost Optimization**: 75% DeepSeek, 25% GPT-4o Mini

## 🚀 Quick Fixes

### **Emergency Responses**

**1. Message Counter Not Working**
```bash
# Quick test
curl -X POST https://api.whatsapp.com/send \
  -d "to=593984074389" \
  -d "text=¿Cuál es mi contador de mensajes?"

# Check Railway logs immediately for classification
```

**2. Tool Calling Broken**
```bash
# Force GPT-4o Mini for all tools temporarily
# File: packages/llm-orchestrator/src/hybrid-ai-agent.ts
selectedAgent = this.openaiAgent; // Emergency override
```

**3. Database Connection Issues**
```bash
# Verify DATABASE_URL
echo $DATABASE_URL | grep neon.tech
# Should return Neon connection string
```

### **Rollback Procedures**

**1. Revert to Previous Deployment**
```bash
# In Railway dashboard:
# 1. Go to Deployments
# 2. Find last working deployment
# 3. Click "Redeploy"
```

**2. Disable Intelligent Classifier**
```bash
# Temporary fallback to keyword-based
# File: packages/llm-orchestrator/src/hybrid-ai-agent.ts
// Comment out: await this.intelligentClassifier.classify()
// Uncomment: this.intentClassifier.classify()
```

## 📞 Escalation Procedures

### **When to Escalate**
- Multiple users reporting same issue
- System-wide tool execution failures
- Database connectivity problems
- Payment processing issues

### **Information to Gather**
1. **User Details**: Phone number, user ID, subscription status
2. **Error Logs**: Railway logs with timestamps
3. **Reproduction Steps**: Exact messages that trigger issues
4. **System State**: Recent deployments, configuration changes
5. **Impact Assessment**: Number of affected users

### **Contact Information**
- **Technical Issues**: Check Railway logs and GitHub issues
- **Payment Issues**: Verify Gumroad webhook configuration
- **Database Issues**: Check Neon dashboard and connection strings

## 🎯 Prevention Strategies

### **Monitoring Setup**
1. **Railway Log Alerts**: Set up alerts for error patterns
2. **Health Checks**: Regular system health verification
3. **User Feedback**: Monitor for recurring complaints
4. **Performance Metrics**: Track response times and success rates

### **Testing Protocols**
1. **Pre-deployment Testing**: Run diagnostic scripts
2. **Canary Deployments**: Test with limited users first
3. **Rollback Plans**: Always have previous working version ready
4. **Documentation**: Keep troubleshooting guides updated

This troubleshooting guide provides comprehensive solutions for the most common issues in the WhatsApp Running Coach system, with emphasis on the recent intelligent intent classifier improvements and tool execution reliability.
