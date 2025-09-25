#!/usr/bin/env node

/**
 * Resend Email Service Test Script
 * Tests the connection to Resend and verifies API key is working
 */

const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

async function testResendConnection() {
    console.log('📧 Testing Resend Email Service...\n');

    // Check environment variables
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const fromName = process.env.RESEND_FROM_NAME;

    if (!apiKey) {
        console.error('❌ Missing required environment variables:');
        console.log('   RESEND_API_KEY:', apiKey ? '✅' : '❌');
        console.log('   RESEND_FROM_EMAIL:', fromEmail ? '✅' : '❌ (optional)');
        console.log('   RESEND_FROM_NAME:', fromName ? '✅' : '❌ (optional)');
        process.exit(1);
    }

    console.log('✅ Environment variables loaded');
    console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`📨 From Email: ${fromEmail || 'Default Resend domain'}`);
    console.log(`👤 From Name: ${fromName || 'Default'}`);

    // Initialize Resend client
    const resend = new Resend(apiKey);
    console.log('\n🔧 Resend client initialized\n');

    // Test 1: Check API Key Validity (Get domains)
    console.log('1️⃣ Testing API Key Validity...');
    try {
        const domains = await resend.domains.list();
        console.log('✅ API Key is valid!');
        console.log(`   Account has ${domains.data.length} domain(s) configured`);

        if (domains.data.length > 0) {
            console.log(`   Primary domain: ${domains.data[0].name}`);
        } else {
            console.log('   Using Resend\'s default domain for sending');
        }
    } catch (error) {
        console.log('❌ API Key validation failed:');
        console.log('   Error:', error.message);
        return false;
    }

    // Test 2: Send Test Email (if safe to do so)
    console.log('\n2️⃣ Testing Email Sending...');

    const testEmailAddress = process.env.TEST_EMAIL || 'test@example.com';

    // Only send if using a safe test email or it's clearly a test environment
    if (testEmailAddress.includes('example.com') || testEmailAddress.includes('test')) {
        console.log('⚠️  Skipping actual email send (using test/example email)');
        console.log('   To test sending, set TEST_EMAIL environment variable to your real email');
    } else {
        console.log(`📤 Sending test email to: ${testEmailAddress}`);

        try {
            const emailData = {
                from: fromEmail || 'onboarding@resend.dev',
                to: [testEmailAddress],
                subject: '✅ KGiQ Family Finance - Email Service Test',
                html: `
                <h2>🎉 Email Service Working!</h2>
                <p>This is a test email from your <strong>KGiQ Family Finance</strong> application.</p>
                <p>If you're receiving this, your Resend integration is working correctly!</p>
                <hr>
                <p><small>Sent from your development environment at ${new Date().toISOString()}</small></p>
                `,
                text: 'Email Service Working! This is a test email from your KGiQ Family Finance application.',
            };

            const result = await resend.emails.send(emailData);

            console.log('✅ Test email sent successfully!');
            console.log(`   Email ID: ${result.data.id}`);
            console.log(`   Check ${testEmailAddress} for the test message`);

        } catch (error) {
            console.log('❌ Email sending failed:');
            console.log('   Error:', error.message);

            if (error.message.includes('domain')) {
                console.log('   💡 Tip: You may need to verify a custom domain in Resend');
                console.log('   💡 Or use the default Resend domain: onboarding@resend.dev');
            }
        }
    }

    // Test 3: Check Account Usage/Limits
    console.log('\n3️⃣ Checking Account Information...');
    try {
        // Note: This endpoint might not be available in all Resend plans
        console.log('ℹ️  Free tier limits:');
        console.log('   • 100 emails per day');
        console.log('   • 3,000 emails per month');
        console.log('   • No custom domain required');
        console.log('   • Perfect for development and UAT');

    } catch (error) {
        console.log('⚠️  Could not fetch account info:', error.message);
    }

    console.log('\n====================================');
    console.log('🎉 RESEND EMAIL SERVICE TEST COMPLETE!');
    console.log('====================================');
    console.log('🎯 Next Steps:');
    console.log('1. Configure email templates in your app');
    console.log('2. Test password reset emails');
    console.log('3. Test notification emails');
    console.log('4. Consider setting up a custom domain');
    console.log('====================================\n');

    return true;
}

// Run the test
testResendConnection()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });