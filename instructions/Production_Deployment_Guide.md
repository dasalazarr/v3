# Andes Running Coach - Production Deployment Guide

## 🚀 **Current Production Setup**

### **Frontend (Netlify)**
- **Repository**: Connected to GitHub
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Domain**: Your custom domain
- **Status**: ✅ Production Ready

### **Backend (Railway)**
- **Service**: `v3-production-2670.up.railway.app`
- **Auto-Deploy**: GitHub integration active
- **Build**: Automatic on push to main branch
- **Status**: ✅ Production Ready

### **Database (Neon)**
- **Type**: PostgreSQL
- **Connection**: SSL enabled
- **Backups**: Automatic
- **Status**: ✅ Optimized

## 🔧 **Environment Configuration**

### **Required Environment Variables**

#### **Railway (Backend)**
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# WhatsApp Business API
JWT_TOKEN=your_whatsapp_business_token
NUMBER_ID=your_whatsapp_phone_number_id
VERIFY_TOKEN=your_webhook_verify_token

# Gumroad Integration
GUMROAD_PRODUCT_ID_EN=your_english_product_id
GUMROAD_PRODUCT_ID_ES=your_spanish_product_id
GUMROAD_WEBHOOK_SECRET=your_gumroad_webhook_secret

# AI Services
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

EMBEDDINGS_API_KEY=your_openai_api_key
EMBEDDINGS_BASE_URL=https://api.openai.com/v1
EMBEDDINGS_MODEL=text-embedding-ada-002

# Infrastructure
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=running_coach_memories

# Application
PORT=3000
NODE_ENV=production
MESSAGE_LIMIT=40
```

#### **Netlify (Frontend)**
```env
# API Configuration
VITE_API_BASE_URL=https://v3-production-2670.up.railway.app
VITE_WHATSAPP_NUMBER=593987644414
```

## 🔗 **Webhook Configuration**

### **WhatsApp Business API**
- **Webhook URL**: `https://v3-production-2670.up.railway.app/webhook`
- **Verify Token**: Must match `VERIFY_TOKEN` environment variable
- **Subscribed Fields**: `messages`, `message_deliveries`, `message_reads`

### **Gumroad Webhook**
- **Webhook URL**: `https://v3-production-2670.up.railway.app/webhook/gumroad`
- **Format**: x-www-form-urlencoded
- **Events**: All purchase events

## 📊 **Monitoring & Health Checks**

### **Health Endpoints**
- **General Health**: `GET /health`
- **Onboarding Health**: `GET /onboarding/health`
- **Webhook Debug**: `GET /debug/webhook`

### **Logging**
- **Railway Logs**: Real-time monitoring
- **Webhook Processing**: Comprehensive logging with 🔥 prefixes
- **Error Tracking**: Detailed error messages and stack traces

### **Key Metrics to Monitor**
- **Conversion Rate**: Landing page to WhatsApp
- **Premium Activation**: Payment to premium status
- **Webhook Success**: Gumroad payment processing
- **Response Times**: API endpoint performance

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Webhook Not Receiving Messages**
1. Check WhatsApp Business API webhook configuration
2. Verify `VERIFY_TOKEN` matches between Meta and Railway
3. Test webhook endpoint: `GET /debug/webhook`

#### **Premium Activation Failing**
1. Check Gumroad webhook URL configuration
2. Verify `GUMROAD_WEBHOOK_SECRET` is correct
3. Monitor Railway logs for webhook processing

#### **Language Detection Issues**
1. Verify `EMBEDDINGS_API_KEY` is valid
2. Check language detection service logs
3. Ensure user messages are being processed correctly

### **Emergency Procedures**

#### **System Down**
1. Check Railway service status
2. Verify environment variables
3. Check database connectivity
4. Review recent deployments

#### **Payment Issues**
1. Verify Gumroad webhook is receiving requests
2. Check user database status
3. Manually activate premium if needed:
   ```sql
   UPDATE users 
   SET subscription_status = 'premium', 
       premium_activated_at = NOW()
   WHERE phone_number = 'user_phone';
   ```

## 🔄 **Deployment Process**

### **Automatic Deployment**
1. **Push to GitHub**: Changes automatically deploy
2. **Railway Build**: Automatic build and deployment
3. **Health Check**: Verify endpoints are responding
4. **Monitor Logs**: Check for any errors

### **Manual Deployment**
1. **Railway Dashboard**: Trigger manual deployment
2. **Environment Check**: Verify all variables are set
3. **Service Restart**: If needed for configuration changes

## 📈 **Performance Optimization**

### **Current Optimizations**
- ✅ Database connection pooling
- ✅ Redis caching for chat buffers
- ✅ Vector memory optimization
- ✅ Webhook processing efficiency
- ✅ Error handling and recovery

### **Monitoring Tools**
- **Railway Metrics**: CPU, Memory, Network usage
- **Database Performance**: Query optimization
- **API Response Times**: Endpoint monitoring
- **Webhook Success Rates**: Payment processing metrics

## 🎯 **Success Metrics**

### **Target Performance**
- **API Response Time**: < 500ms
- **Webhook Processing**: < 2 seconds
- **Premium Activation**: < 5 seconds
- **Uptime**: 99.9%

### **Business Metrics**
- **Conversion Rate**: 80%+ (target)
- **Premium Activation**: 95%+ success rate
- **User Satisfaction**: Immediate response times
- **Revenue Growth**: Tracked via Gumroad analytics
