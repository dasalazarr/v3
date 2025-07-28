# Andes Running Coach - System Optimization Plan

## 🎯 **Optimization Overview**

This document outlines the systematic cleanup and optimization of the Andes Running Coach system to remove unnecessary files, consolidate functionality, and improve maintainability.

## 📁 **File System Cleanup**

### **Files to Remove (Safe to Delete)**

#### **Outdated Documentation**
```bash
# Remove these files - replaced by consolidated docs
rm instructions/Landing_Page_Migration_Plan.md
rm instructions/4_Week_Implementation_Plan.md
rm instructions/Technical_Debt_Resolution.md
rm instructions/Troubleshooting_Guide.md
rm instructions/API_Documentation.md
```

#### **Legacy Code Files**
```bash
# Remove old template system
rm -rf src/templates/
rm src/provider/index.ts
rm src/config/index.ts

# Remove test files that are no longer relevant
rm test-premium-flow.js
rm verify-webhook-config.js
rm fix-user-subscription-status.js
rm fix-current-user.sql
rm investigate-constraint.sql
```

#### **Unused Package Files**
```bash
# Remove if not being used
rm packages/database/src/scripts/fix-subscription-status.ts
rm packages/database/src/scripts/fix-specific-user.ts
```

### **Files to Keep (Critical)**

#### **Core Application**
- `apps/api-gateway/src/app.ts` - Main application
- `apps/api-gateway/src/flows/` - All flow handlers
- `apps/api-gateway/src/services/` - All services
- `packages/` - All package directories

#### **Essential Documentation**
- `instructions/System_Architecture_Overview.md` - NEW
- `instructions/Production_Deployment_Guide.md` - NEW
- `instructions/Gumroad_Integration.md` - Keep (payment reference)
- `instructions/Subscription_Management_Guide.md` - Keep (business logic)

## 🔧 **Code Optimization**

### **1. Remove Unused Imports**

#### **apps/api-gateway/src/app.ts**
```typescript
// Remove these unused imports if present:
// import { mainFlow } from './templates/mainflow.js';
// import { faqFlow } from './templates/faqFlow.js';
// import { OnboardingFlow } from './flows/onboarding-flow.js';
```

### **2. Consolidate Environment Variables**

#### **Remove Unused Variables**
```env
# Remove if not used:
# ASSISTANT_ID
# GOOGLE_CALENDAR_ID
# TRAINING_SPREADSHEET_ID
# spreadsheetId
# clientEmail
# privateKey
```

### **3. Database Schema Cleanup**

#### **Remove Unused Tables/Columns**
```sql
-- Review and remove if not used:
-- ALTER TABLE users DROP COLUMN IF EXISTS assistant_id;
-- DROP TABLE IF EXISTS old_training_logs;
-- DROP TABLE IF EXISTS deprecated_plans;
```

## 📦 **Package Dependencies Cleanup**

### **Review package.json Dependencies**

#### **Potentially Unused Dependencies**
```bash
# Review these packages - remove if not used:
npm uninstall @google-cloud/storage
npm uninstall googleapis
npm uninstall stripe  # If using only Gumroad
npm uninstall @builderbot/bot  # If not using BuilderBot flows
```

#### **Keep Essential Dependencies**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "drizzle-orm": "^0.44.2",
    "postgres": "^3.4.7",
    "redis": "^4.6.7",
    "tsyringe": "^4.8.0",
    "dotenv": "^16.3.1"
  }
}
```

## 🏗️ **Architecture Simplification**

### **1. Consolidate Flow Handlers**

#### **Current Structure (Optimized)**
```
apps/api-gateway/src/flows/
├── simplified-onboarding-flow.ts  ✅ Keep - Landing page integration
├── payment-flow.ts               ✅ Keep - Gumroad webhook
├── enhanced-main-flow.ts          ✅ Keep - WhatsApp processing
└── web-onboarding-flow.ts         ❌ Remove - Legacy, not used
```

### **2. Service Layer Optimization**

#### **Keep Essential Services**
```
apps/api-gateway/src/services/
├── freemium-service.ts           ✅ Keep - Payment links
├── logger-service.ts             ✅ Keep - Logging
└── stripe-service.ts             ❌ Remove if using only Gumroad
```

### **3. Database Connection Optimization**

#### **Single Connection Pattern**
```typescript
// Ensure single database instance across the app
const database = Database.getInstance(config);
```

## 🧹 **Cleanup Script**

### **Automated Cleanup Script**
```bash
#!/bin/bash
# cleanup-system.sh

echo "🧹 Starting Andes System Cleanup..."

# Remove outdated documentation
echo "📄 Removing outdated documentation..."
rm -f instructions/Landing_Page_Migration_Plan.md
rm -f instructions/4_Week_Implementation_Plan.md
rm -f instructions/Technical_Debt_Resolution.md
rm -f instructions/Troubleshooting_Guide.md
rm -f instructions/API_Documentation.md

# Remove legacy code
echo "🗂️ Removing legacy code files..."
rm -rf src/templates/
rm -f src/provider/index.ts
rm -f src/config/index.ts

# Remove test/debug files
echo "🧪 Removing test and debug files..."
rm -f test-premium-flow.js
rm -f verify-webhook-config.js
rm -f fix-user-subscription-status.js
rm -f fix-current-user.sql
rm -f investigate-constraint.sql

# Remove unused scripts
echo "📜 Removing unused database scripts..."
rm -f packages/database/src/scripts/fix-subscription-status.ts
rm -f packages/database/src/scripts/fix-specific-user.ts

# Clean up node_modules and rebuild
echo "📦 Cleaning dependencies..."
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf apps/*/node_modules

echo "🔄 Reinstalling clean dependencies..."
pnpm install

echo "🏗️ Building optimized system..."
pnpm build

echo "✅ System cleanup complete!"
echo "📊 Run 'du -sh .' to see size reduction"
```

## 📊 **Expected Improvements**

### **Performance Gains**
- **Build Time**: 30-50% faster
- **Bundle Size**: 20-40% smaller
- **Memory Usage**: 15-25% reduction
- **Startup Time**: 20-30% faster

### **Maintainability Improvements**
- **Reduced Complexity**: Fewer files to maintain
- **Clear Architecture**: Simplified structure
- **Better Documentation**: Consolidated and current
- **Easier Debugging**: Less noise in logs

## 🚨 **Safety Precautions**

### **Before Running Cleanup**
1. **Create Backup**: Full system backup
2. **Test Current System**: Ensure everything works
3. **Document Changes**: Track what's being removed
4. **Staged Approach**: Remove files gradually

### **Testing After Cleanup**
1. **Build Test**: `pnpm build` succeeds
2. **Functionality Test**: All endpoints work
3. **Integration Test**: WhatsApp and Gumroad webhooks
4. **Performance Test**: Response times maintained

## 🎯 **Implementation Timeline**

### **Phase 1: Documentation Cleanup (Day 1)**
- Remove outdated documentation
- Create consolidated guides
- Update README files

### **Phase 2: Code Cleanup (Day 2)**
- Remove legacy code files
- Clean up unused imports
- Optimize dependencies

### **Phase 3: Testing & Validation (Day 3)**
- Comprehensive testing
- Performance benchmarking
- Production deployment

### **Phase 4: Monitoring (Ongoing)**
- Monitor system performance
- Track error rates
- Validate improvements

## ✅ **Success Criteria**

- [ ] Build time reduced by 30%+
- [ ] All tests pass
- [ ] No functionality regression
- [ ] Documentation is current and accurate
- [ ] System is easier to maintain
- [ ] Performance metrics improved
