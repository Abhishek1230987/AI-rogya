#!/usr/bin/env node

/**
 * Validate JWT token and check user
 * Run this to debug authentication issues
 */

import jwt from 'jsonwebtoken';
import pool from './src/config/database.js';

console.log('\n🔐 JWT TOKEN VALIDATOR\n');
console.log('='.repeat(70));

// This is just a test - you'd get your real token from localStorage
// For now, let's verify the JWT_SECRET and User.findById works

try {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  console.log('JWT_SECRET configured:', !!process.env.JWT_SECRET);
  console.log('JWT_SECRET (first 20 chars):', JWT_SECRET.substring(0, 20) + '...');
  
  // Create a test token for user 2 (demo1@gmail.com)
  const testToken = jwt.sign(
    { id: 2 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  console.log('\n✅ Test JWT Token created:');
  console.log('Token (first 50 chars):', testToken.substring(0, 50));
  
  // Now verify it
  const decoded = jwt.verify(testToken, JWT_SECRET);
  console.log('\n✅ Token verification successful!');
  console.log('Decoded payload:', decoded);
  
  // Now check if user exists
  console.log('\n✅ Checking if user 2 exists...');
  const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [decoded.id]);
  
  if (userResult.rows.length === 0) {
    console.log('❌ User not found!');
  } else {
    const user = userResult.rows[0];
    console.log(`✅ User found: ${user.email} (ID: ${user.id})`);
    
    // Now check emergency contacts
    const medicalResult = await pool.query(
      'SELECT emergency_contact FROM medical_history WHERE user_id = $1',
      [user.id]
    );
    
    if (medicalResult.rows.length === 0) {
      console.log('⚠️  No medical history for this user');
    } else {
      const contact = medicalResult.rows[0].emergency_contact;
      console.log('✅ Emergency contacts:', JSON.stringify(contact, null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📋 CONCLUSION:');
  console.log('If all checks pass ✅, then:');
  console.log('1. Your token should work on the SOS endpoint');
  console.log('2. If SOS still fails, check the server logs for errors');
  console.log('3. Try clearing localStorage and logging out/in again');
  
  console.log('\n' + '='.repeat(70));
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
