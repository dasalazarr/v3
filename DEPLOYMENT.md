# Running Coach - Deployment Guide

## 🚀 Complete Architecture Transformation

This guide walks through deploying the transformed Running Coach system from a simple Google Sheets-based chatbot to a sophisticated AI-powered coaching platform with memory, adaptive training plans, and scientific methodology.

## 📋 Prerequisites

### Required Services
- **Railway** (primary deployment platform)
- **Neon/PostgreSQL** (primary database)
- **Redis Cloud** (chat buffer and caching)
- **Qdrant Cloud** (vector memory)
- **DeepSeek API** (AI processing)
- **Meta WhatsApp Business API** (messaging)

### Development Tools
- Node.js 20+ with pnpm
- Docker (for local development)
- Git with GitHub Actions access

## 🗄️ Database Setup

### 1. PostgreSQL (Neon)
```bash
# Create Neon database
# Get connection string from Neon dashboard
export DATABASE_URL="postgresql://user:pass@hostname/dbname?sslmode=require"

# Run migrations
pnpm --filter database migrate
```

### 2. Redis Setup
```bash
# Redis Cloud or local Redis
export REDIS_HOST="your-redis-host"
export REDIS_PORT="6379"
export REDIS_PASSWORD="your-password"
```

### 3. Qdrant Vector Database
```bash
# Qdrant Cloud setup
export QDRANT_URL="https://your-cluster.qdrant.io"
export QDRANT_API_KEY="your-api-key"
export QDRANT_COLLECTION="running_coach_memories"
```
When the application starts, it ensures a payload index on the `userId` field
is created for this collection. If the index already exists, initialization
continues without error.

## 🤖 AI Services Configuration

### DeepSeek API
```bash
export DEEPSEEK_API_KEY="your-deepseek-key"
export DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"
export DEEPSEEK_MODEL="deepseek-chat"
```

### WhatsApp Business API
```bash
export JWT_TOKEN="your-whatsapp-jwt"
export NUMBER_ID="your-phone-number-id"
export VERIFY_TOKEN="your-verification-token"
```

## 📦 Migration from Google Sheets

### 1. Export Existing Data
```bash
# Set up Google Sheets credentials
export SPREADSHEET_ID="your-main-spreadsheet-id"
export TRAINING_SPREADSHEET_ID="your-training-log-id"
export CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
export PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Run migration script
pnpm --filter database tsx src/migrate-from-sheets.ts
```

### 2. Verify Migration
```bash
# Check data integrity
pnpm --filter database verify
```

## 🚀 Railway Deployment

### 1. Project Setup
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link [project-id]
```

### 2. Environment Variables
```bash
# Set production environment variables
railway variables set DATABASE_URL="your-neon-url"
railway variables set REDIS_HOST="your-redis-host"
railway variables set REDIS_PASSWORD="your-redis-password"
railway variables set QDRANT_URL="your-qdrant-url"
railway variables set QDRANT_API_KEY="your-qdrant-key"
railway variables set DEEPSEEK_API_KEY="your-deepseek-key"
railway variables set JWT_TOKEN="your-whatsapp-jwt"
railway variables set NUMBER_ID="your-phone-number-id"
railway variables set VERIFY_TOKEN="your-verify-token"
railway variables set NODE_ENV="production"
```

### 3. Deploy
```bash
# Deploy to Railway
railway up
```

## 🏗️ Local Development

### 1. Setup Development Environment
```bash
# Clone and install
git clone <repository>
cd running-coach
pnpm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your development credentials
```

### 2. Start Services with Docker
```bash
# Start local PostgreSQL, Redis, and Qdrant
docker-compose up -d

# Run database migrations
pnpm --filter database migrate

# Start development server
pnpm dev
```

### 3. Testing
```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @running-coach/plan-generator test

# Run with coverage
pnpm test --coverage
```

## 📊 Monitoring & Health Checks

### Health Endpoints
- `GET /health` - Overall system health
- `GET /metrics` - Prometheus metrics

### Key Metrics to Monitor
- Database connection health
- Redis connection status
- Vector memory availability
- AI service response times
- WhatsApp message processing rates

## 🔄 CI/CD Pipeline

The GitHub Actions pipeline automatically:

1. **Testing Phase**
   - Runs unit tests with coverage
   - Type checking
   - Linting
   - Security scanning

2. **Build Phase**
   - Builds all packages
   - Creates optimized production bundles

3. **Deploy Phase**
   - Deploys to Railway
   - Runs health checks
   - Performs load testing

4. **Monitoring Phase**
   - Sends deployment notifications
   - Monitors post-deployment metrics

## 🧪 Performance Testing

### Load Testing with k6
```bash
# Install k6
brew install k6  # macOS
# or follow k6 installation guide for other platforms

# Run load tests
k6 run test/load/basic-load-test.js
```

### Expected Performance
- **Response Time**: < 500ms (95th percentile)
- **Error Rate**: < 5%
- **Concurrent Users**: 50+ supported
- **Memory Usage**: Stable under load

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify DATABASE_URL format
   - Check firewall/VPN settings
   - Ensure SSL requirements are met

2. **Redis Connection Issues**
   - Verify Redis host and port
   - Check password authentication
   - Test connection with Redis CLI

3. **Vector Memory Problems**
   - Verify Qdrant URL and API key
   - Check collection creation
   - Monitor vector dimension consistency

4. **AI Service Failures**
   - Verify DeepSeek API key
   - Check rate limits
   - Monitor response timeouts

### Log Analysis
```bash
# View Railway logs
railway logs

# Filter by severity
railway logs --filter error

# Follow live logs
railway logs --follow
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Database: Use read replicas for analytics
- Redis: Implement Redis Cluster for high availability
- Vector Memory: Scale Qdrant cluster based on memory usage

### Performance Optimization
- Enable Redis caching for frequent queries
- Implement connection pooling
- Use CDN for static assets
- Optimize database queries with indexes

## 🔒 Security Best Practices

1. **Environment Variables**
   - Never commit secrets to git
   - Use Railway's secret management
   - Rotate API keys regularly

2. **Database Security**
   - Enable SSL connections
   - Use least-privilege access
   - Regular security updates

3. **API Security**
   - Validate all WhatsApp webhooks
   - Implement rate limiting
   - Monitor for suspicious patterns

## 📚 Architecture Benefits

### Before vs After Transformation

**Before:**
- Simple Google Sheets storage
- No conversation memory
- Generic responses
- Manual data analysis

**After:**
- PostgreSQL with ACID compliance
- Multi-layered memory system
- Personalized AI responses with tool calling
- Automated analytics and progress tracking
- Scientific VDOT-based training plans
- Real-time progress summaries

### Key Improvements
- **Memory**: Conversations persist with semantic search
- **Personalization**: Every response uses user's history
- **Science**: VDOT methodology for training plans
- **Analytics**: Automated weekly progress summaries
- **Scalability**: Can handle thousands of concurrent users
- **Reliability**: Comprehensive testing and monitoring

This transformation elevates the system from a simple chatbot to an intelligent running companion that truly learns and adapts to each user's journey.