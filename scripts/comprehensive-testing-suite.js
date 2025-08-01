#!/usr/bin/env node

/**
 * Comprehensive Testing Suite for WhatsApp AI Coach System
 * 
 * This script automates the testing methodology outlined in:
 * instructions/Comprehensive_Testing_Methodology.md
 * 
 * Usage:
 *   node scripts/comprehensive-testing-suite.js [test-scenario]
 * 
 * Test Scenarios:
 *   - reset: Complete system reset
 *   - user-creation: Test user creation flows
 *   - language-spanish: Test Spanish language flow
 *   - language-english: Test English language flow
 *   - premium-intent: Test premium intent detection
 *   - webhook-test: Test Gumroad webhook processing
 *   - edge-cases: Test error scenarios
 *   - full-suite: Run all tests sequentially
 */

import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const TEST_PHONE = '593984074389';
const RAILWAY_APP_URL = process.env.RAILWAY_APP_URL || 'https://your-railway-app.railway.app';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(message.toUpperCase(), 'bright');
  log('='.repeat(60), 'cyan');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function runCommand(command, description) {
  try {
    log(`\n🔄 ${description}...`, 'blue');
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    success(`${description} completed`);
    return output;
  } catch (err) {
    error(`${description} failed: ${err.message}`);
    throw err;
  }
}

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question}${colors.reset} `, resolve);
  });
}

async function waitForUserConfirmation(message) {
  const answer = await askQuestion(`${message} (Press Enter to continue, 'q' to quit): `);
  if (answer.toLowerCase() === 'q') {
    log('Testing aborted by user', 'yellow');
    process.exit(0);
  }
}

// Test Scenarios

async function completeSystemReset() {
  header('Complete System Reset');
  
  warning('This will delete ALL user data and reset the system to a clean state.');
  await waitForUserConfirmation('Are you sure you want to proceed?');
  
  try {
    // Force delete user
    await runCommand(
      'npx tsx packages/database/src/scripts/force-delete-user.ts',
      'Deleting existing user data'
    );
    
    // Verify clean system
    await runCommand(
      'npx tsx packages/database/src/scripts/verify-clean-system.ts',
      'Verifying system cleanup'
    );
    
    // Check Redis counters
    await runCommand(
      'npx tsx packages/database/src/scripts/check-redis-counter.ts',
      'Checking Redis counter reset'
    );
    
    success('System reset completed successfully');
    
    info('Next steps:');
    info('1. Send WhatsApp message to create new user');
    info('2. Monitor Railway logs for user creation');
    info(`3. Test phone number: ${TEST_PHONE}`);
    
  } catch (err) {
    error('System reset failed');
    throw err;
  }
}

async function testUserCreation() {
  header('User Creation Flow Testing');
  
  info('This test verifies user persistence on first WhatsApp interaction');
  info(`Test phone number: ${TEST_PHONE}`);
  
  // Check current user status
  try {
    await runCommand(
      'npx tsx packages/database/src/scripts/find-user.ts',
      'Checking current user status'
    );
  } catch (err) {
    info('No existing user found (expected for new user test)');
  }
  
  info('Manual Steps Required:');
  info('1. Send WhatsApp message: "Hola, quiero empezar a entrenar"');
  info('2. Monitor Railway logs for user creation');
  info('3. Expected logs:');
  info('   🔥 [DATABASE] User not found, creating new user for phone: 593984074389');
  info('   🔥 [DATABASE] New user created with VALID status');
  
  await waitForUserConfirmation('Complete the WhatsApp interaction, then continue');
  
  // Verify user creation
  await runCommand(
    'npx tsx packages/database/src/scripts/find-user.ts',
    'Verifying user creation'
  );
  
  success('User creation test completed');
}

async function testSpanishLanguageFlow() {
  header('Spanish Language Flow Testing');
  
  info('Testing Spanish language detection and consistency');
  
  // Reset system first
  await completeSystemReset();
  
  info('Manual WhatsApp Testing Steps:');
  info('1. Send: "Hola, quiero empezar a entrenar" (Initial contact)');
  info('2. Send: "Tengo 30 años" (Age input)');
  info('3. Send: "Soy hombre" (Gender)');
  info('4. Send: "Quiero correr mi primera carrera" (Goal)');
  
  info('Verification Points:');
  info('- Language detected as "es"');
  info('- All responses in Spanish');
  info('- No language switching during flow');
  info('- Onboarding questions in Spanish');
  
  await waitForUserConfirmation('Complete the Spanish flow testing, then continue');
  
  // Check user language preference
  await runCommand(
    'npx tsx packages/database/src/scripts/check-user-status.ts',
    'Checking user language preference'
  );
  
  success('Spanish language flow test completed');
}

async function testEnglishLanguageFlow() {
  header('English Language Flow Testing');
  
  info('Testing English language detection and consistency');
  
  // Reset system first
  await completeSystemReset();
  
  info('Manual WhatsApp Testing Steps:');
  info('1. Send: "Hi, I want to start training" (Initial contact)');
  info('2. Send: "I am 30 years old" (Age input)');
  info('3. Send: "I am male" (Gender)');
  info('4. Send: "I want to run my first race" (Goal)');
  
  info('Verification Points:');
  info('- Language detected as "en"');
  info('- All responses in English');
  info('- No language switching during flow');
  info('- Onboarding questions in English');
  
  await waitForUserConfirmation('Complete the English flow testing, then continue');
  
  // Check user language preference
  await runCommand(
    'npx tsx packages/database/src/scripts/check-user-status.ts',
    'Checking user language preference'
  );
  
  success('English language flow test completed');
}

async function testPremiumIntent() {
  header('Premium Intent Detection Testing');
  
  info('Testing premium intent detection and payment link generation');
  
  // Reset system first
  await completeSystemReset();
  
  info('Manual WhatsApp Testing Steps:');
  info('1. Send: "Quiero acceso premium" (Premium intent in Spanish)');
  info('   OR');
  info('1. Send: "I want premium access" (Premium intent in English)');
  
  info('Expected System Behavior:');
  info('1. User creation with subscriptionStatus: "free"');
  info('2. Premium intent detection');
  info('3. Status update to "pending_payment"');
  info('4. Gumroad link generation');
  info('5. Payment link sent via WhatsApp');
  
  info('Railway Logs to Monitor:');
  info('🔥 [PREMIUM] Processing premium upgrade for user 593984074389');
  info('🔥 [PREMIUM] Generated Gumroad URL: https://gumroad.com/l/...');
  
  await waitForUserConfirmation('Complete the premium intent testing, then continue');
  
  // Check user status
  await runCommand(
    'npx tsx packages/database/src/scripts/check-user-status.ts',
    'Checking user premium status'
  );
  
  success('Premium intent detection test completed');
}

async function testGumroadWebhook() {
  header('Gumroad Webhook Processing Testing');
  
  info('Testing webhook processing for premium activation');
  
  // Ensure user exists in pending_payment status
  info('Prerequisites:');
  info('- User must exist with subscriptionStatus: "pending_payment"');
  info('- Run premium intent test first if needed');
  
  const webhookPayload = {
    sale_id: 'test_12345',
    product_id: 'test_product',
    product_name: 'Andes Premium',
    email: 'test@example.com',
    custom_fields: JSON.stringify({ phone_number: TEST_PHONE }),
    price: '9.99',
    recurrence: 'monthly'
  };
  
  info('Webhook Test Payload:');
  console.log(JSON.stringify(webhookPayload, null, 2));
  
  const curlCommand = `curl -X POST ${RAILWAY_APP_URL}/webhook/gumroad \\
    -H "Content-Type: application/x-www-form-urlencoded" \\
    -d "sale_id=test_12345&product_name=Andes Premium&custom_fields={\\"phone_number\\":\\"${TEST_PHONE}\\"}&price=9.99"`;
  
  info('Webhook Test Command:');
  console.log(curlCommand);
  
  await waitForUserConfirmation('Execute the webhook test command, then continue');
  
  info('Expected Railway Logs:');
  info('🔥 [GUMROAD] Webhook received at: [timestamp]');
  info(`🔥 [GUMROAD] Extracted phone number: ${TEST_PHONE}`);
  info('🎉 [GUMROAD] Successfully upgraded user to premium!');
  info('✅ WhatsApp confirmation sent successfully');
  
  // Verify premium activation
  await runCommand(
    'npx tsx packages/database/src/scripts/check-premium-status.ts',
    'Verifying premium activation'
  );
  
  success('Gumroad webhook test completed');
}

async function testEdgeCases() {
  header('Edge Cases and Error Scenarios Testing');
  
  info('Testing system resilience and error handling');
  
  // Test 1: Invalid phone number in webhook
  info('Test 1: Invalid Phone Number Handling');
  const invalidWebhookCommand = `curl -X POST ${RAILWAY_APP_URL}/webhook/gumroad \\
    -H "Content-Type: application/x-www-form-urlencoded" \\
    -d "sale_id=test_invalid&product_name=Andes Premium&custom_fields={\\"phone_number\\":\\"invalid_phone\\"}&price=9.99"`;
  
  info('Invalid webhook command:');
  console.log(invalidWebhookCommand);
  info('Expected: 404 error, no user status changes');
  
  await waitForUserConfirmation('Execute invalid webhook test, then continue');
  
  // Test 2: Duplicate user creation prevention
  info('Test 2: Duplicate User Creation Prevention');
  info('Send multiple rapid WhatsApp messages and verify only one user is created');
  
  await waitForUserConfirmation('Test duplicate prevention, then continue');
  
  // Verify system integrity
  await runCommand(
    'npx tsx packages/database/src/scripts/final-system-check.ts',
    'Running final system integrity check'
  );
  
  success('Edge cases testing completed');
}

async function runFullTestSuite() {
  header('Full Test Suite Execution');
  
  warning('This will run all test scenarios sequentially');
  warning('Estimated time: 30-45 minutes');
  await waitForUserConfirmation('Are you ready to start the full test suite?');
  
  try {
    // Phase 1: System Preparation
    log('\n📋 PHASE 1: SYSTEM PREPARATION', 'magenta');
    await completeSystemReset();
    
    // Phase 2: Core Flow Testing
    log('\n📋 PHASE 2: CORE FLOW TESTING', 'magenta');
    await testUserCreation();
    await testSpanishLanguageFlow();
    await testEnglishLanguageFlow();
    
    // Phase 3: Premium Integration Testing
    log('\n📋 PHASE 3: PREMIUM INTEGRATION TESTING', 'magenta');
    await testPremiumIntent();
    await testGumroadWebhook();
    
    // Phase 4: Edge Case Validation
    log('\n📋 PHASE 4: EDGE CASE VALIDATION', 'magenta');
    await testEdgeCases();
    
    // Final Summary
    header('Test Suite Completed Successfully');
    success('All test scenarios completed');
    success('System is ready for production deployment');
    
    info('Next Steps:');
    info('1. Review Railway logs for any warnings');
    info('2. Perform final manual validation');
    info('3. Update monitoring and alerts');
    info('4. Proceed with production deployment');
    
  } catch (err) {
    error('Test suite failed');
    error(`Error: ${err.message}`);
    
    warning('Recommended Actions:');
    warning('1. Review error logs');
    warning('2. Fix identified issues');
    warning('3. Re-run specific test scenarios');
    warning('4. Do not proceed to production until all tests pass');
  }
}

// Main execution
async function main() {
  const scenario = process.argv[2];
  
  log('🧪 Comprehensive Testing Suite for WhatsApp AI Coach System', 'bright');
  log(`📱 Test Phone Number: ${TEST_PHONE}`, 'cyan');
  log(`🚀 Railway App URL: ${RAILWAY_APP_URL}`, 'cyan');
  
  try {
    switch (scenario) {
      case 'reset':
        await completeSystemReset();
        break;
      case 'user-creation':
        await testUserCreation();
        break;
      case 'language-spanish':
        await testSpanishLanguageFlow();
        break;
      case 'language-english':
        await testEnglishLanguageFlow();
        break;
      case 'premium-intent':
        await testPremiumIntent();
        break;
      case 'webhook-test':
        await testGumroadWebhook();
        break;
      case 'edge-cases':
        await testEdgeCases();
        break;
      case 'full-suite':
        await runFullTestSuite();
        break;
      default:
        log('\nAvailable test scenarios:', 'yellow');
        log('  reset           - Complete system reset');
        log('  user-creation   - Test user creation flows');
        log('  language-spanish - Test Spanish language flow');
        log('  language-english - Test English language flow');
        log('  premium-intent  - Test premium intent detection');
        log('  webhook-test    - Test Gumroad webhook processing');
        log('  edge-cases      - Test error scenarios');
        log('  full-suite      - Run all tests sequentially');
        log('\nUsage: node scripts/comprehensive-testing-suite.js [scenario]');
        break;
    }
  } catch (err) {
    error(`Testing failed: ${err.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\nTesting interrupted by user', 'yellow');
  rl.close();
  process.exit(0);
});

// Run main function if this is the entry point
main();
