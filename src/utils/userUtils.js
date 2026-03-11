// src/utils/userUtils.js
const { supabase } = require('../../supabase');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const createTestUserProfile = async (user) => {
  try {
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        full_name: 'Test User',
        date_of_birth: '1990-01-01',
        gender: 'Other',
        city: 'Test City',
        profile_complete: true,
        trust_level: 'verified',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phone: user.phone,
        email: user.email,
      }, {
        onConflict: 'id'
      });

    if (userError) console.error('Error creating user record:', userError);

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        primary_photo_url: 'https://via.placeholder.com/400x400/FF9900/FFFFFF?text=Test+User',
        bio: 'This is a test user account for testing purposes.',
        occupation: 'Software Developer',
        height_cm: 175,
        education: 'Bachelor\'s Degree',
        income_range: '$50,000 - $100,000',
        looking_for: 'Serious Relationship',
        marriage_timeline: 'Within 1 year',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (profileError) console.error('Error creating user profile:', profileError);

    await AsyncStorage.setItem('userMode', 'dating');
    await AsyncStorage.setItem('isPremium', 'true');
    await AsyncStorage.setItem('trustLevel', 'verified');
    
    console.log('Test user profile created successfully');
  } catch (error) {
    console.error('Error in createTestUserProfile:', error);
  }
};

const ensureTestUserProfile = async (user) => {
  try {
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError || !existingUser) {
      await createTestUserProfile(user);
    } else {
      await AsyncStorage.setItem('userMode', 'dating');
      await AsyncStorage.setItem('isPremium', 'true');
      await AsyncStorage.setItem('trustLevel', existingUser.trust_level || 'verified');
    }
  } catch (error) {
    console.error('Error in ensureTestUserProfile:', error);
  }
};

module.exports = { createTestUserProfile, ensureTestUserProfile };
