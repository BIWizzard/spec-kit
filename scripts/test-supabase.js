#!/usr/bin/env node

/**
 * Supabase Connection Test Script
 * Tests the connection to Supabase and verifies API keys are working
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
    console.log('🔍 Testing Supabase Connection...\n');

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        console.error('❌ Missing required environment variables:');
        console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
        console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
        console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
        process.exit(1);
    }

    console.log('✅ Environment variables loaded');
    console.log(`📍 Supabase URL: ${supabaseUrl}`);
    console.log(`🔑 Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
    console.log(`🔐 Service Key: ${supabaseServiceKey.substring(0, 20)}...\n`);

    // Test with anon client (public access)
    console.log('🌐 Testing Anonymous Client Connection...');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    try {
        // Test basic connection with a simple query
        const { data, error } = await anonClient
            .from('families')  // This table should exist from your Prisma schema
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.log('⚠️  Anonymous client query resulted in error (expected if RLS is enabled):');
            console.log('   Error:', error.message);
            console.log('   This is normal - RLS should block anonymous access to data');
        } else {
            console.log('✅ Anonymous client connected successfully');
            console.log(`   Table accessible: ${data ? 'Yes' : 'No'}`);
        }
    } catch (err) {
        console.log('⚠️  Connection test resulted in error:', err.message);
    }

    // Test with service role client (admin access)
    console.log('\n🔧 Testing Service Role Client Connection...');
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Test connection with service role (should work even with RLS)
        const { data, error } = await serviceClient
            .from('families')
            .select('count', { count: 'exact', head: true });

        if (error) {
            if (error.code === '42P01') {
                console.log('⚠️  Table "families" does not exist yet');
                console.log('   This is expected if you haven\'t run migrations');
                console.log('   Next step: Run Prisma migrations to create tables');
            } else {
                console.log('❌ Service role connection error:', error.message);
            }
        } else {
            console.log('✅ Service role client connected successfully');
            console.log('✅ Database tables accessible');
        }
    } catch (err) {
        console.log('❌ Service role connection failed:', err.message);
    }

    // Test authentication endpoints
    console.log('\n🔐 Testing Authentication Endpoints...');
    try {
        const { data, error } = await anonClient.auth.getSession();

        if (error) {
            console.log('⚠️  Auth endpoint error:', error.message);
        } else {
            console.log('✅ Authentication endpoints accessible');
            console.log(`   Current session: ${data.session ? 'Active' : 'None'}`);
        }
    } catch (err) {
        console.log('❌ Auth endpoint test failed:', err.message);
    }

    console.log('\n====================================');
    console.log('🎯 Next Steps:');
    console.log('1. Run Prisma migrations: npx prisma db push');
    console.log('2. Set up Row Level Security policies in Supabase');
    console.log('3. Configure auth redirect URLs in Supabase dashboard');
    console.log('4. Test user registration and login');
    console.log('====================================\n');
}

// Run the test
testSupabaseConnection().catch(console.error);