#!/usr/bin/env node

/**
 * Test script for the streamlined onboarding flow
 * This script tests all the new endpoints and functionality
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Load environment variables
config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const TEST_PHONE = '+1234567890'; // Test phone number

console.log('🧪 Testing Streamlined Onboarding Flow\n');

async function testHealthEndpoint() {
  console.log('1. Testing health endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/onboarding/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'healthy') {
      console.log('✅ Health endpoint working correctly');
      console.log(`   WhatsApp Number: ${data.whatsappNumber}`);
    } else {
      console.log('❌ Health endpoint failed');
      console.log('   Response:', data);
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
  }
  console.log('');
}

async function testSimplifiedOnboarding(intent, language) {
  console.log(`2. Testing simplified onboarding (${intent}, ${language})...`);
  try {
    const response = await fetch(`${API_BASE_URL}/onboarding/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent,
        language
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Simplified onboarding working correctly');
      console.log(`   WhatsApp Link: ${data.whatsappLink}`);
      console.log(`   Intent: ${data.intent}`);
      console.log(`   Language: ${data.language}`);
      
      // Verify the link contains expected parameters
      if (data.whatsappLink.includes('wa.me') && data.whatsappLink.includes('text=')) {
        console.log('✅ WhatsApp link format is correct');
      } else {
        console.log('❌ WhatsApp link format is incorrect');
      }
    } else {
      console.log('❌ Simplified onboarding failed');
      console.log('   Response:', data);
    }
  } catch (error) {
    console.log('❌ Simplified onboarding error:', error.message);
  }
  console.log('');
}

async function testLegacyEndpoints() {
  console.log('3. Testing legacy endpoints (backward compatibility)...');
  
  // Test legacy premium endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/onboarding/premium`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: TEST_PHONE,
        language: 'en'
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Legacy premium endpoint working (redirected to simplified flow)');
    } else {
      console.log('❌ Legacy premium endpoint failed');
      console.log('   Response:', data);
    }
  } catch (error) {
    console.log('❌ Legacy premium endpoint error:', error.message);
  }

  // Test legacy free endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/onboarding/free`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: TEST_PHONE,
        language: 'es'
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Legacy free endpoint working (redirected to simplified flow)');
    } else {
      console.log('❌ Legacy free endpoint failed');
      console.log('   Response:', data);
    }
  } catch (error) {
    console.log('❌ Legacy free endpoint error:', error.message);
  }
  console.log('');
}

async function testErrorHandling() {
  console.log('4. Testing error handling...');
  
  // Test invalid intent
  try {
    const response = await fetch(`${API_BASE_URL}/onboarding/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'invalid',
        language: 'en'
      })
    });

    const data = await response.json();
    
    if (response.status === 400 && data.error) {
      console.log('✅ Invalid intent properly rejected');
    } else {
      console.log('❌ Invalid intent not properly handled');
      console.log('   Response:', data);
    }
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
  }

  // Test invalid language
  try {
    const response = await fetch(`${API_BASE_URL}/onboarding/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'free',
        language: 'invalid'
      })
    });

    const data = await response.json();
    
    if (response.status === 400 && data.error) {
      console.log('✅ Invalid language properly rejected');
    } else {
      console.log('❌ Invalid language not properly handled');
      console.log('   Response:', data);
    }
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
  }
  console.log('');
}

async function testDatabaseConstraint() {
  console.log('5. Testing database constraint fix...');
  
  // This would require database access, so we'll just verify the API doesn't crash
  try {
    const response = await fetch(`${API_BASE_URL}/onboarding/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'premium',
        language: 'en'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Database constraint appears to be working (no errors)');
    } else {
      console.log('❌ Potential database constraint issue');
      console.log('   Response:', data);
    }
  } catch (error) {
    console.log('❌ Database constraint test error:', error.message);
  }
  console.log('');
}

async function runAllTests() {
  console.log(`🎯 Testing against: ${API_BASE_URL}\n`);
  
  await testHealthEndpoint();
  await testSimplifiedOnboarding('free', 'en');
  await testSimplifiedOnboarding('premium', 'es');
  await testLegacyEndpoints();
  await testErrorHandling();
  await testDatabaseConstraint();
  
  console.log('🏁 Testing complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Update your landing page to use the new /onboarding/start endpoint');
  console.log('2. Test the WhatsApp links manually');
  console.log('3. Monitor the logs for any issues');
  console.log('4. Consider removing legacy endpoints after 30 days');
}

// Run the tests
runAllTests().catch(console.error);
