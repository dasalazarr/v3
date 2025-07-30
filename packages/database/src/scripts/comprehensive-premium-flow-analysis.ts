#!/usr/bin/env tsx

import { config } from 'dotenv';
import postgres from 'postgres';
import { ChatBuffer } from '@running-coach/vector-memory';

// Load environment variables
config();

async function comprehensivePremiumFlowAnalysis() {
  console.log('🔍 COMPREHENSIVE PREMIUM FLOW ANALYSIS FOR 593984074389\n');
  console.log('=' .repeat(60));

  const targetPhone = '593984074389';
  const analysis = {
    userStatus: { exists: false, status: 'unknown', premiumAt: null, userId: null },
    systemState: { database: 'unknown', redis: 'unknown', config: 'unknown' },
    flowAnalysis: { landingPage: 'unknown', whatsapp: 'unknown', premium: 'unknown', gumroad: 'unknown' },
    recommendations: [] as string[]
  };

  // 1. DATABASE ANALYSIS
  console.log('🗄️ 1. DATABASE USER STATUS ANALYSIS');
  console.log('-' .repeat(40));
  
  try {
    const databaseUrl = process.env.DATABASE_URL!;
    const sql = postgres(databaseUrl);

    // Check for target user
    const targetUser = await sql`
      SELECT * FROM users 
      WHERE phone_number = ${targetPhone} 
      OR phone_number LIKE '%984074389%'
      ORDER BY created_at DESC
    `;

    if (targetUser.length === 0) {
      console.log(`❌ User ${targetPhone} NOT FOUND in database`);
      console.log('   Status: User has never been created or was deleted');
      analysis.userStatus.exists = false;
      analysis.recommendations.push('User needs to interact with WhatsApp bot to be created');
    } else {
      const user = targetUser[0];
      analysis.userStatus.exists = true;
      analysis.userStatus.status = user.subscription_status;
      analysis.userStatus.premiumAt = user.premium_activated_at;
      analysis.userStatus.userId = user.id;

      console.log(`✅ User ${targetPhone} FOUND in database:`);
      console.log(`   📊 Status: ${user.subscription_status}`);
      console.log(`   ⭐ Premium At: ${user.premium_activated_at || 'Not activated'}`);
      console.log(`   📅 Created: ${user.created_at}`);
      console.log(`   🔄 Updated: ${user.updated_at}`);
      console.log(`   🆔 User ID: ${user.id}`);
      console.log(`   🌐 Language: ${user.preferred_language}`);
      console.log(`   📝 Onboarding: ${user.onboarding_completed ? 'Completed' : 'Pending'}`);
    }

    // Check total users and premium users
    const stats = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_status = 'premium' THEN 1 END) as premium_users,
        COUNT(CASE WHEN subscription_status = 'pending_payment' THEN 1 END) as pending_users
      FROM users
    `;

    const stat = stats[0];
    console.log(`\n📊 Database Statistics:`);
    console.log(`   Total users: ${stat.total_users}`);
    console.log(`   Premium users: ${stat.premium_users}`);
    console.log(`   Pending payment: ${stat.pending_users}`);

    analysis.systemState.database = parseInt(stat.total_users) === 0 ? 'empty' : 'populated';

    await sql.end();

  } catch (error) {
    console.error('❌ Database analysis error:', error);
    analysis.systemState.database = 'error';
  }

  // 2. REDIS/CACHE ANALYSIS
  console.log('\n💾 2. REDIS CACHE ANALYSIS');
  console.log('-' .repeat(40));

  try {
    const chatBuffer = ChatBuffer.getInstance({
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    const redis = (chatBuffer as any).redis;
    const allKeys = await redis.keys('*');
    const userKeys = allKeys.filter((key: string) => 
      key.includes(targetPhone) || key.includes('984074389')
    );

    console.log(`📊 Total Redis keys: ${allKeys.length}`);
    console.log(`🔍 User-related keys: ${userKeys.length}`);

    if (userKeys.length > 0) {
      console.log('📋 User-related keys found:');
      userKeys.forEach((key: string) => console.log(`   - ${key}`));
      analysis.systemState.redis = 'has_user_data';
    } else {
      console.log('✅ No user-related data in Redis cache');
      analysis.systemState.redis = 'clean';
    }

  } catch (error) {
    console.error('❌ Redis analysis error:', error);
    analysis.systemState.redis = 'error';
  }

  // 3. CONFIGURATION ANALYSIS
  console.log('\n⚙️ 3. SYSTEM CONFIGURATION ANALYSIS');
  console.log('-' .repeat(40));

  const requiredVars = [
    'DATABASE_URL', 'REDIS_HOST', 'JWT_TOKEN', 'NUMBER_ID', 'VERIFY_TOKEN',
    'GUMROAD_PRODUCT_ID_EN', 'GUMROAD_PRODUCT_ID_ES'
  ];

  let configComplete = true;
  requiredVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: Configured`);
    } else {
      console.log(`❌ ${envVar}: NOT configured`);
      configComplete = false;
    }
  });

  analysis.systemState.config = configComplete ? 'complete' : 'incomplete';

  // 4. PREMIUM FLOW ANALYSIS
  console.log('\n🎯 4. PREMIUM FLOW ANALYSIS');
  console.log('-' .repeat(40));

  console.log('📱 WhatsApp Webhook Activity Analysis:');
  console.log('   Based on Railway logs showing webhook activity for 593984074389:');
  
  if (!analysis.userStatus.exists) {
    console.log('   ❌ FLOW BROKEN: User received WhatsApp messages but was never created in database');
    console.log('   🔍 This indicates:');
    console.log('      - WhatsApp webhook received messages');
    console.log('      - Bot sent responses (delivery confirmations in logs)');
    console.log('      - BUT user creation logic failed or was bypassed');
    console.log('      - Premium flow cannot work without user in database');
    
    analysis.flowAnalysis.whatsapp = 'broken_user_creation';
    analysis.recommendations.push('Fix user creation logic in WhatsApp webhook handler');
    analysis.recommendations.push('Ensure database transactions are properly committed');
  } else {
    console.log('   ✅ User exists in database - creation logic worked');
    analysis.flowAnalysis.whatsapp = 'working';
    
    if (analysis.userStatus.status === 'premium') {
      console.log('   ✅ User is PREMIUM - full flow completed successfully');
      analysis.flowAnalysis.premium = 'completed';
      analysis.flowAnalysis.gumroad = 'completed';
    } else if (analysis.userStatus.status === 'pending_payment') {
      console.log('   ⏳ User is PENDING PAYMENT - premium intent detected, awaiting payment');
      analysis.flowAnalysis.premium = 'pending_payment';
      analysis.flowAnalysis.gumroad = 'pending';
    } else {
      console.log('   ⚠️ User is FREE - premium intent may not have been detected');
      analysis.flowAnalysis.premium = 'not_detected';
      analysis.flowAnalysis.gumroad = 'not_started';
    }
  }

  // 5. WEBHOOK PROCESSING ANALYSIS
  console.log('\n🔗 5. WEBHOOK PROCESSING ANALYSIS');
  console.log('-' .repeat(40));

  console.log('🎯 Gumroad Webhook Status:');
  if (analysis.userStatus.exists && analysis.userStatus.status === 'premium') {
    console.log('   ✅ Webhook processing SUCCESSFUL');
    console.log('   ✅ Phone number extraction worked');
    console.log('   ✅ User lookup successful');
    console.log('   ✅ Premium activation completed');
    console.log(`   ✅ Premium activated at: ${analysis.userStatus.premiumAt}`);
  } else if (analysis.userStatus.exists && analysis.userStatus.status === 'pending_payment') {
    console.log('   ⏳ Webhook processing PENDING');
    console.log('   ✅ User created and set to pending_payment');
    console.log('   ⏳ Awaiting Gumroad webhook for premium activation');
  } else {
    console.log('   ❌ Webhook processing NOT STARTED or FAILED');
    console.log('   🔍 User either not created or premium intent not detected');
  }

  // 6. CURRENT USER EXPERIENCE ANALYSIS
  console.log('\n👤 6. CURRENT USER EXPERIENCE ANALYSIS');
  console.log('-' .repeat(40));

  if (analysis.userStatus.exists) {
    if (analysis.userStatus.status === 'premium') {
      console.log('🎉 USER EXPERIENCE: PREMIUM');
      console.log('   ✅ Should receive GPT-4o Mini responses');
      console.log('   ✅ No message limits');
      console.log('   ✅ Advanced coaching features');
      console.log('   ❌ Should NOT see premium upgrade prompts');
    } else if (analysis.userStatus.status === 'pending_payment') {
      console.log('⏳ USER EXPERIENCE: PENDING PAYMENT');
      console.log('   ⚠️ Should receive basic responses');
      console.log('   ⚠️ Should see payment completion prompts');
      console.log('   ⚠️ Limited message functionality');
    } else {
      console.log('🆓 USER EXPERIENCE: FREE');
      console.log('   ⚠️ Should receive basic responses');
      console.log('   ⚠️ Should see premium upgrade prompts');
      console.log('   ⚠️ Message limits apply');
    }
  } else {
    console.log('❌ USER EXPERIENCE: BROKEN');
    console.log('   ❌ User receives messages but has no database record');
    console.log('   ❌ System cannot track subscription status');
    console.log('   ❌ Premium flow completely broken');
  }

  // 7. FINAL ASSESSMENT AND RECOMMENDATIONS
  console.log('\n📋 7. FINAL ASSESSMENT AND RECOMMENDATIONS');
  console.log('=' .repeat(60));

  const overallStatus = analysis.userStatus.exists && analysis.userStatus.status === 'premium' ? 
    'WORKING' : 'BROKEN';

  console.log(`🎯 OVERALL PREMIUM FLOW STATUS: ${overallStatus}`);
  console.log('');

  if (overallStatus === 'WORKING') {
    console.log('🎉 SUCCESS: Premium flow is working correctly!');
    console.log('✅ User creation: Working');
    console.log('✅ Premium detection: Working');
    console.log('✅ Gumroad integration: Working');
    console.log('✅ Webhook processing: Working');
    console.log('✅ Premium activation: Working');
  } else {
    console.log('❌ ISSUES DETECTED: Premium flow needs attention');
    console.log('');
    console.log('🔧 IMMEDIATE ACTIONS REQUIRED:');
    analysis.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  console.log('\n🧪 TESTING RECOMMENDATIONS:');
  console.log('1. Send fresh message from landing page to WhatsApp');
  console.log('2. Verify user creation: npx tsx check-premium-status.ts');
  console.log('3. Test premium intent detection');
  console.log('4. Verify Gumroad link generation');
  console.log('5. Test webhook processing with validation script');

  return analysis;
}

// Run comprehensive analysis
comprehensivePremiumFlowAnalysis().catch(console.error);
