# Andes Troubleshooting Guide

## Quick Diagnostics

### **Health Check Commands**
```bash
# Check overall system health
curl -X GET http://localhost:8080/health

# Check onboarding service health
curl -X GET http://localhost:8080/onboarding/health

# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

---

## Common Issues & Solutions

### **1. PostgreSQL Constraint Violations**

#### **Symptom**
```
PostgresError: new row for relation "users" violates check constraint "users_subscription_status_check"
```

#### **Cause**
Database constraint doesn't allow the subscription status being inserted.

#### **Solution**
```sql
-- Check current constraint
SELECT conname, consrc FROM pg_constraint WHERE conname = 'users_subscription_status_check';

-- Fix constraint if needed
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_status_check;
ALTER TABLE users ADD CONSTRAINT users_subscription_status_check 
CHECK (subscription_status IN ('free', 'pending_payment', 'premium', 'past_due', 'canceled'));
```

#### **Prevention**
- Always test database schema changes in development
- Use migrations for schema updates
- Validate constraint values before deployment

---

### **2. WhatsApp API Errors**

#### **Symptom**
```
❌ Failed to send WhatsApp message: 401 - Unauthorized
```

#### **Causes & Solutions**

**Invalid JWT Token:**
```bash
# Check token validity
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "https://graph.facebook.com/v17.0/me"

# Update token in environment variables
```

**Incorrect Number ID:**
```bash
# Verify WhatsApp Business Account
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "https://graph.facebook.com/v17.0/$NUMBER_ID"
```

**Rate Limiting:**
- Implement exponential backoff
- Monitor API usage limits
- Use message queuing for high volume

---

### **3. Database Connection Issues**

#### **Symptom**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

#### **Solutions**

**Check Database URL:**
```bash
# Verify connection string format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/db?sslmode=require
```

**Test Connection:**
```bash
# Direct connection test
psql $DATABASE_URL -c "\dt"

# Check if database exists
psql $DATABASE_URL -c "SELECT current_database();"
```

**Connection Pool Issues:**
```javascript
// Increase connection pool size
const client = postgres(databaseUrl, { 
  max: 20,  // Increase from default
  idle_timeout: 20,
  connect_timeout: 10
});
```

---

### **4. Redis Connection Problems**

#### **Symptom**
```
Error: Redis connection failed: ECONNREFUSED
```

#### **Solutions**

**Check Redis Configuration:**
```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# Check Redis info
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD info
```

**Connection String Issues:**
```javascript
// Verify Redis URL format
const redisUrl = `redis://:${password}@${host}:${port}`;
```

---

### **5. Gumroad Webhook Failures**

#### **Symptom**
```
Error processing Gumroad webhook: Invalid signature
```

#### **Solutions**

**Signature Verification:**
```javascript
// Debug signature calculation
const computedSignature = crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

console.log('Computed:', computedSignature);
console.log('Received:', sentSignature);
```

**Raw Body Issues:**
```javascript
// Ensure raw body is available
app.use('/webhook/gumroad', express.raw({type: 'application/json'}));
```

**Missing Custom Fields:**
```javascript
// Validate webhook payload
if (!custom_fields?.phone_number) {
  console.error('Missing phone_number in custom_fields');
  return res.status(400).json({ error: 'Missing phone_number' });
}
```

---

### **6. User Onboarding Issues**

#### **Symptom**
Users not being created or updated properly.

#### **Debugging Steps**

**Check User Creation:**
```sql
-- Find user by phone
SELECT * FROM users WHERE phone_number = '+1234567890';

-- Check recent users
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

**Validate Input Data:**
```javascript
// Add comprehensive logging
console.log('Creating user with data:', {
  phoneNumber,
  preferredLanguage,
  subscriptionStatus
});
```

**Transaction Issues:**
```javascript
// Use explicit transactions for complex operations
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values(userData).returning();
  // Additional operations...
  return user;
});
```

---

### **7. Intent Detection Problems**

#### **Symptom**
WhatsApp bot not detecting user intent correctly.

#### **Solutions**

**Debug Message Content:**
```javascript
console.log('Received message:', ctx.body);
console.log('Detected intent:', { isPremiumIntent, isFreeIntent });
```

**Improve Intent Detection:**
```javascript
// Enhanced intent detection
const message = ctx.body.toLowerCase();
const premiumKeywords = ['premium', 'upgrade', 'paid', 'pro', 'subscription'];
const freeKeywords = ['free', 'trial', 'gratis', 'start'];

const isPremiumIntent = premiumKeywords.some(keyword => 
  message.includes(keyword)
);
```

---

## Performance Issues

### **Slow API Responses**

#### **Diagnosis**
```bash
# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/onboarding/start

# Check database query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE phone_number = '+1234567890';
```

#### **Solutions**
- Add database indexes
- Implement connection pooling
- Use Redis for caching
- Optimize database queries

### **High Memory Usage**

#### **Diagnosis**
```bash
# Monitor Node.js memory usage
node --inspect app.js
# Then use Chrome DevTools

# Check for memory leaks
ps aux | grep node
```

#### **Solutions**
- Implement proper connection cleanup
- Use streaming for large datasets
- Monitor garbage collection
- Optimize object creation

---

## Monitoring & Alerts

### **Key Metrics to Monitor**

**Application Metrics:**
- Response time percentiles (p50, p95, p99)
- Error rates by endpoint
- Request volume
- Memory and CPU usage

**Business Metrics:**
- Conversion rates
- User journey completion
- Payment success rates
- Support ticket volume

### **Alert Configuration**

**Critical Alerts:**
- Error rate > 10%
- Response time > 2 seconds
- Database connection failures
- Payment webhook failures

**Warning Alerts:**
- Error rate > 5%
- Response time > 1 second
- High memory usage
- Unusual traffic patterns

---

## Emergency Procedures

### **System Down**

1. **Check health endpoints**
2. **Verify database connectivity**
3. **Check external service status** (WhatsApp, Gumroad)
4. **Review recent deployments**
5. **Check error logs**
6. **Implement rollback if necessary**

### **Data Corruption**

1. **Stop write operations**
2. **Assess corruption scope**
3. **Restore from backup**
4. **Verify data integrity**
5. **Resume operations**
6. **Post-incident review**

---

## Getting Help

### **Internal Resources**
- Check application logs: `/var/log/andes/`
- Review monitoring dashboards
- Consult team documentation
- Check recent code changes

### **External Resources**
- PostgreSQL documentation
- WhatsApp Business API docs
- Gumroad webhook documentation
- Node.js performance guides

### **Escalation Path**
1. **Level 1**: Check common issues (this guide)
2. **Level 2**: Review logs and metrics
3. **Level 3**: Contact development team
4. **Level 4**: Emergency response team

---

## Prevention Best Practices

### **Development**
- Comprehensive testing before deployment
- Database migration testing
- Error handling implementation
- Performance testing

### **Operations**
- Regular health checks
- Proactive monitoring
- Backup verification
- Incident response planning

### **Maintenance**
- Regular dependency updates
- Security patch management
- Performance optimization
- Documentation updates
