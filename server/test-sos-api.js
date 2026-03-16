#!/usr/bin/env node

/**
 * Test SOS Alert API
 * Tests sending an emergency alert through the backend API
 */

import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

console.log('\n🚨 TESTING SOS ALERT API\n');
console.log('='.repeat(60));

// Test data
const testAlert = {
  message: '🚨 TEST EMERGENCY ALERT - System is working!',
  severity: 'HIGH',
  location: {
    address: 'Test Location',
    latitude: 40.7128,
    longitude: -74.0060,
  },
};

console.log('Sending SOS alert...');
console.log('Message:', testAlert.message);
console.log('Severity:', testAlert.severity);
console.log('Location:', testAlert.location.address);
console.log('');

// Make request to test-telegram endpoint
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/sos/test-telegram',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
    console.log('');

    if (res.statusCode === 200) {
      console.log('✅ TEST ENDPOINT ACCESSIBLE');
      console.log('📱 Check your Telegram for test message');
    } else {
      console.log('⚠️  Endpoint returned status:', res.statusCode);
    }

    console.log('='.repeat(60));
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\nMake sure:');
  console.log('1. Backend is running (npm run dev on port 5000)');
  console.log('2. .env file is configured');
  console.log('3. Telegram bot token is valid');
  console.log('\n' + '='.repeat(60));
});

// Send the test request with your chat ID
const payload = { telegramId: CHAT_ID };
console.log('Payload:', JSON.stringify(payload, null, 2));
req.write(JSON.stringify(payload));
req.end();
