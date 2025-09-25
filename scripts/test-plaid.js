#!/usr/bin/env node

/**
 * Plaid API Connection Test Script
 * Tests the connection to Plaid and verifies sandbox credentials are working
 */

const { Configuration, PlaidApi, PlaidEnvironments, CountryCode, Products } = require('plaid');
require('dotenv').config({ path: '.env.local' });

async function testPlaidConnection() {
    console.log('🏦 Testing Plaid API Connection...\n');

    // Check environment variables
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    const env = process.env.PLAID_ENV;

    if (!clientId || !secret || !env) {
        console.error('❌ Missing required Plaid environment variables:');
        console.log('   PLAID_CLIENT_ID:', clientId ? '✅' : '❌');
        console.log('   PLAID_SECRET:', secret ? '✅' : '❌');
        console.log('   PLAID_ENV:', env ? '✅' : '❌');
        process.exit(1);
    }

    console.log('✅ Environment variables loaded');
    console.log(`📍 Plaid Environment: ${env}`);
    console.log(`🔑 Client ID: ${clientId}`);
    console.log(`🔐 Secret: ${secret.substring(0, 8)}...`);

    // Map environment string to Plaid enum
    let plaidEnv;
    switch (env.toLowerCase()) {
        case 'sandbox':
            plaidEnv = PlaidEnvironments.sandbox;
            break;
        case 'development':
            plaidEnv = PlaidEnvironments.development;
            break;
        case 'production':
            plaidEnv = PlaidEnvironments.production;
            break;
        default:
            console.error(`❌ Invalid PLAID_ENV: ${env}`);
            process.exit(1);
    }

    // Configure Plaid client
    const configuration = new Configuration({
        basePath: plaidEnv,
        baseOptions: {
            headers: {
                'PLAID-CLIENT-ID': clientId,
                'PLAID-SECRET': secret,
            },
        },
    });

    const client = new PlaidApi(configuration);
    console.log('\n🔧 Plaid client configured successfully\n');

    // Test 1: Create Link Token
    console.log('1️⃣ Testing Link Token Creation...');
    try {
        const configs = {
            user: {
                client_user_id: 'test-user-' + Date.now(),
            },
            client_name: 'KGiQ Family Finance',
            products: ['transactions', 'auth'],
            country_codes: ['US'],
            language: 'en',
            redirect_uri: 'http://localhost:3000/bank-accounts/connect',
        };

        const createTokenRequest = {
            ...configs,
        };

        const createTokenResponse = await client.linkTokenCreate(createTokenRequest);
        const linkToken = createTokenResponse.data.link_token;

        console.log('✅ Link token created successfully!');
        console.log(`   Token: ${linkToken.substring(0, 20)}...`);
        console.log(`   Expiration: ${createTokenResponse.data.expiration}`);

    } catch (error) {
        console.log('❌ Link token creation failed:');
        console.log('   Error:', error.message);
        if (error.response?.data) {
            console.log('   Details:', error.response.data);
        }
        return false;
    }

    // Test 2: Get Institutions (basic API test)
    console.log('\n2️⃣ Testing Institutions API...');
    try {
        const request = {
            count: 5,
            offset: 0,
            country_codes: ['US'],
        };

        const response = await client.institutionsGet(request);
        const institutions = response.data.institutions;

        console.log('✅ Institutions API working!');
        console.log(`   Retrieved ${institutions.length} institutions`);
        console.log(`   Sample: ${institutions[0]?.name || 'N/A'}`);

    } catch (error) {
        console.log('❌ Institutions API failed:');
        console.log('   Error:', error.message);
        return false;
    }

    // Test 3: Test Sandbox Credentials
    if (env === 'sandbox') {
        console.log('\n3️⃣ Testing Sandbox Test Credentials...');
        console.log('📋 Available test credentials for sandbox:');
        console.log('   Username: user_good');
        console.log('   Password: pass_good');
        console.log('   MFA: 1234 (if prompted)');
        console.log('');
        console.log('   For testing various scenarios:');
        console.log('   • user_good/pass_good - Normal flow');
        console.log('   • user_bad/pass_bad - Authentication error');
        console.log('   • user_mfa/pass_good - MFA required');
        console.log('   • user_transactions/pass_good - Rich transaction history');
    }

    console.log('\n====================================');
    console.log('🎉 PLAID CONNECTION TEST SUCCESSFUL!');
    console.log('====================================');
    console.log('🎯 Next Steps:');
    console.log('1. Configure redirect URLs in Plaid dashboard');
    console.log('2. Test bank connection flow in your app');
    console.log('3. Use test credentials to connect sandbox accounts');
    console.log('4. Verify transaction sync is working');
    console.log('====================================\n');

    return true;
}

// Run the test
testPlaidConnection()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });