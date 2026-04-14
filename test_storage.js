// Test script to check Supabase storage buckets and photo upload
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mocbhyhccwwbczcqcdwb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2JoeWhjY3d3YmN6Y3FjZHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Nzc1OTgsImV4cCI6MjA4NzM1MzU5OH0.Xzo9Yv29oTdjWyqnfedQAfh4vUYxSOVKLF5cKjsYZuk';

console.log('Testing Supabase Storage Configuration...');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Set' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorageBuckets() {
  console.log('\n=== Testing Storage Buckets ===');
  
  try {
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
      return false;
    }
    
    console.log(`✅ Found ${buckets.length} bucket(s):`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    
    // Check for required buckets
    const requiredBuckets = ['avatars', 'posts', 'verification_media'];
    const missingBuckets = requiredBuckets.filter(bucket => 
      !buckets.some(b => b.name === bucket)
    );
    
    if (missingBuckets.length > 0) {
      console.error('\n❌ Missing required buckets:');
      missingBuckets.forEach(bucket => {
        console.error(`   - ${bucket}`);
      });
      console.error('\nPlease create these buckets in Supabase Dashboard > Storage');
      return false;
    } else {
      console.log('\n✅ All required buckets exist!');
    }
    
    // Test upload to avatars bucket
    console.log('\n=== Testing Upload to avatars bucket ===');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const testFileName = `test_${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testImage, {
        contentType: 'image/png',
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
      
      // Check for specific errors
      if (uploadError.message.includes('bucket') && uploadError.message.includes('not found')) {
        console.error('\n⚠️  The "avatars" bucket might not exist or you might not have permission.');
        console.error('   Please check:');
        console.error('   1. Bucket exists in Supabase Dashboard > Storage');
        console.error('   2. Bucket is set to "public"');
        console.error('   3. RLS policies allow uploads');
      }
      
      return false;
    }
    
    console.log('✅ Test upload successful!');
    console.log('   File path:', uploadData.path);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(testFileName);
    
    console.log('   Public URL:', publicUrl);
    
    // Test if URL is accessible
    console.log('\n=== Testing URL accessibility ===');
    try {
      const response = await fetch(publicUrl);
      if (response.ok) {
        console.log('✅ Public URL is accessible');
      } else {
        console.log(`⚠️  Public URL returned status: ${response.status}`);
      }
    } catch (fetchError) {
      console.error('❌ Error accessing public URL:', fetchError.message);
    }
    
    // Clean up test file
    console.log('\n=== Cleaning up test file ===');
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([testFileName]);
    
    if (deleteError) {
      console.error('⚠️  Could not delete test file:', deleteError.message);
    } else {
      console.log('✅ Test file cleaned up');
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n=== Testing Database Connection ===');
  
  try {
    // Test a simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database query failed:', error.message);
      
      // Check for common errors
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('\n⚠️  The "users" table might not exist.');
        console.error('   Please run the database migrations from COMPLETE_MIGRATION.sql');
      } else if (error.message.includes('permission denied')) {
        console.error('\n⚠️  Permission denied. Check RLS policies.');
      }
      
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
    
  } catch (error) {
    console.error('💥 Database test error:', error);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n=== Testing Authentication ===');
  
  try {
    // Test auth health endpoint
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth health check failed:', error.message);
      return false;
    }
    
    console.log('✅ Authentication service is accessible');
    console.log('   Session:', data.session ? 'Active' : 'No active session');
    return true;
    
  } catch (error) {
    console.error('💥 Auth test error:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Supabase Storage Tests...\n');
  
  const tests = [
    { name: 'Authentication', func: testAuthentication },
    { name: 'Database Connection', func: testDatabaseConnection },
    { name: 'Storage Buckets', func: testStorageBuckets }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    console.log(`\n🔍 Running: ${test.name}`);
    console.log('─'.repeat(40));
    
    const passed = await test.func();
    if (!passed) {
      allPassed = false;
    }
    
    console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Your Supabase setup is working correctly.');
    console.log('\nIf you\'re still having photo upload issues, check:');
    console.log('1. ImagePicker permissions on device');
    console.log('2. File size limits (try a smaller image)');
    console.log('3. Network connectivity');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues above.');
    console.log('\nCommon solutions:');
    console.log('1. Create missing storage buckets');
    console.log('2. Run database migrations');
    console.log('3. Check RLS policies');
    console.log('4. Verify Supabase credentials');
  }
  
  return allPassed;
}

// Run tests
runAllTests().catch(console.error);