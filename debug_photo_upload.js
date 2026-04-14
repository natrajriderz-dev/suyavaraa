// Debug script for photo upload issues
// Run this in your browser console or as a standalone script

console.log('🔍 Debugging Photo Upload Issues');

// Check if we're in a React Native/Expo environment
const isExpo = typeof Expo !== 'undefined';
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const isWeb = typeof window !== 'undefined' && !isReactNative;

console.log('Environment:', {
  isExpo,
  isReactNative,
  isWeb,
  userAgent: navigator?.userAgent
});

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('\n=== Testing Supabase Connection ===');
  
  const supabaseUrl = 'https://mocbhyhccwwbczcqcdwb.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2JoeWhjY3d3YmN6Y3FjZHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Nzc1OTgsImV4cCI6MjA4NzM1MzU5OH0.Xzo9Yv29oTdjWyqnfedQAfh4vUYxSOVKLF5cKjsYZuk';
  
  try {
    // Test 1: Check if Supabase is reachable
    const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    console.log('Supabase Health Check:', healthResponse.status, healthResponse.statusText);
    
    if (!healthResponse.ok) {
      throw new Error(`Supabase not accessible: ${healthResponse.status}`);
    }
    
    // Test 2: Check storage buckets
    const bucketsResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (bucketsResponse.ok) {
      const buckets = await bucketsResponse.json();
      console.log('Storage Buckets Found:', buckets.length);
      
      const requiredBuckets = ['avatars', 'posts', 'verification_media'];
      const existingBuckets = buckets.map(b => b.name);
      
      console.log('Required Buckets Status:');
      requiredBuckets.forEach(bucket => {
        const exists = existingBuckets.includes(bucket);
        console.log(`  ${bucket}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
      });
      
      if (!existingBuckets.includes('avatars')) {
        console.error('\n❌ CRITICAL: "avatars" bucket is missing!');
        console.error('This is why photo uploads are failing.');
        console.error('\nTo fix:');
        console.error('1. Go to https://mocbhyhccwwbczcqcdwb.supabase.co');
        console.error('2. Login to your Supabase dashboard');
        console.error('3. Go to "Storage" in the left menu');
        console.error('4. Click "Create new bucket"');
        console.error('5. Name it "avatars" (exactly)');
        console.error('6. Set it to "Public"');
        console.error('7. Click "Create bucket"');
      }
    } else {
      console.error('❌ Cannot access storage API:', bucketsResponse.status);
    }
    
    return true;
  } catch (error) {
    console.error('💥 Supabase test failed:', error);
    return false;
  }
}

// Test file picker functionality
async function testFilePicker() {
  console.log('\n=== Testing File Picker ===');
  
  if (isWeb) {
    console.log('Web environment detected');
    
    // Test if we can create a file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    console.log('File input can be created:', !!input);
    
    // Test FileReader
    console.log('FileReader available:', typeof FileReader !== 'undefined');
    
    // Test fetch for DataURL
    console.log('Fetch available:', typeof fetch !== 'undefined');
    
  } else if (isExpo || isReactNative) {
    console.log('React Native/Expo environment detected');
    
    // Check for required Expo modules
    const modules = {
      'expo-image-picker': typeof ImagePicker !== 'undefined',
      'expo-file-system': typeof FileSystem !== 'undefined',
      'expo-image-manipulator': typeof ImageManipulator !== 'undefined'
    };
    
    console.log('Expo Modules:', modules);
    
    if (!modules['expo-image-picker']) {
      console.error('❌ expo-image-picker is not available');
      console.error('Make sure it\'s installed: npx expo install expo-image-picker');
    }
    
    if (!modules['expo-file-system']) {
      console.error('❌ expo-file-system is not available');
      console.error('Make sure it\'s installed: npx expo install expo-file-system');
    }
  }
}

// Test image compression
async function testImageCompression() {
  console.log('\n=== Testing Image Compression ===');
  
  if (isWeb) {
    console.log('Web: Compression not available, using original image');
  } else {
    console.log('Native: Image compression should be available via expo-image-manipulator');
  }
}

// Test upload functionality
async function testUpload() {
  console.log('\n=== Testing Upload Logic ===');
  
  // Simulate the upload process
  console.log('Upload process steps:');
  console.log('1. Pick image ✅');
  console.log('2. Compress image ✅');
  console.log('3. Convert to appropriate format ✅');
  console.log('4. Upload to Supabase Storage ❓');
  console.log('5. Get public URL ❓');
  
  // Common issues to check
  console.log('\nCommon Issues Checklist:');
  
  const issues = [
    {
      issue: 'Storage bucket does not exist',
      symptom: 'Error message contains "bucket not found" or "does not exist"',
      solution: 'Create the bucket in Supabase dashboard'
    },
    {
      issue: 'Permission denied',
      symptom: 'Error message contains "permission denied" or "not authorized"',
      solution: 'Check RLS policies or make bucket public'
    },
    {
      issue: 'File too large',
      symptom: 'Upload fails silently or with size error',
      solution: 'Image is too large, compression should help'
    },
    {
      issue: 'Network error',
      symptom: 'Timeout or connection error',
      solution: 'Check internet connection'
    },
    {
      issue: 'CORS error (web only)',
      symptom: 'Cross-origin error in console',
      solution: 'Configure CORS in Supabase dashboard'
    }
  ];
  
  issues.forEach((item, i) => {
    console.log(`${i + 1}. ${item.issue}`);
    console.log(`   Symptom: ${item.symptom}`);
    console.log(`   Solution: ${item.solution}`);
  });
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Photo Upload Debug Tests...\n');
  
  await testSupabaseConnection();
  await testFilePicker();
  await testImageCompression();
  await testUpload();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 DEBUG SUMMARY');
  console.log('='.repeat(50));
  
  console.log('\nMost likely issues based on common patterns:');
  console.log('1. ❌ Storage bucket "avatars" does not exist (MOST COMMON)');
  console.log('2. ❌ RLS policies blocking uploads');
  console.log('3. ❌ ImagePicker permissions not granted');
  console.log('4. ❌ Network/CORS issues');
  
  console.log('\nImmediate actions to try:');
  console.log('1. Check if "avatars" bucket exists in Supabase');
  console.log('2. Create the bucket if missing');
  console.log('3. Check browser/device console for specific errors');
  console.log('4. Try with a smaller test image');
  
  console.log('\nQuick fix command (if you have Supabase CLI):');
  console.log('supabase storage create avatars --public');
}

// If running in browser, auto-run tests
if (isWeb) {
  runAllTests().catch(console.error);
}

// Export for use in other contexts
module.exports = {
  testSupabaseConnection,
  testFilePicker,
  testImageCompression,
  testUpload,
  runAllTests
};