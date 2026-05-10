const { supabase } = require('../../supabase');
const { uploadMedia } = require('../utils/mediaUtils');

const EMAIL_REDIRECT_URL = 'suyavaraa://login-callback';

function normalizePhoneNumber(countryCode, phoneNumber) {
  const rawCode = String(countryCode || '').trim();
  const rawNumber = String(phoneNumber || '').trim();
  const cleanCode = rawCode.startsWith('+') ? rawCode : `+${rawCode.replace(/^\+/, '')}`;
  const cleanNumber = rawNumber.replace(/[^\d]/g, '');

  if (!cleanNumber || cleanNumber.length < 6) {
    throw new Error('Please enter a valid mobile number.');
  }

  return `${cleanCode}${cleanNumber}`;
}

async function syncEmailVerificationState(user = null) {
  const authUser = user || (await supabase.auth.getUser()).data?.user;
  if (!authUser) return null;

  const emailConfirmedAt = authUser.email_confirmed_at || null;
  const updatePayload = {
    email_verification_status: emailConfirmedAt ? 'verified' : 'pending',
    email_verified_at: emailConfirmedAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', authUser.id);

  if (error) {
    console.warn('[Verification] Failed to sync email verification state:', error.message);
  }

  return {
    emailConfirmed: Boolean(emailConfirmedAt),
    emailConfirmedAt,
  };
}

async function resendSignupVerificationEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Email address is required.');

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizedEmail,
    options: {
      emailRedirectTo: EMAIL_REDIRECT_URL,
    },
  });

  if (error) throw error;
  return true;
}

async function getVerificationOverview() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const user = authData?.user;
  if (!user) return null;

  await syncEmailVerificationState(user);

  const { data, error } = await supabase
    .from('users')
    .select([
      'id',
      'email',
      'full_name',
      'profile_complete',
      'onboarding_step',
      'verification_status',
      'phone_number',
      'phone_verification_status',
      'phone_verified_at',
      'email_verification_status',
      'email_verified_at',
      'id_verification_status',
      'id_card_url',
      'is_verified',
    ].join(', '))
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return {
    authUser: user,
    profile: data,
  };
}

async function startPhoneVerification(countryCode, phoneNumber) {
  const fullPhoneNumber = normalizePhoneNumber(countryCode, phoneNumber);
  const { error } = await supabase.auth.updateUser({
    phone: fullPhoneNumber,
  });

  if (error) throw error;

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) throw new Error('Not authenticated.');

  const { error: updateError } = await supabase
    .from('users')
    .update({
      phone_number: fullPhoneNumber,
      phone_verification_status: 'pending',
      onboarding_step: 'MobileOtpVerification',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) throw updateError;

  return fullPhoneNumber;
}

async function verifyPhoneOtp(phoneNumber, otpCode) {
  const normalizedPhone = String(phoneNumber || '').trim();
  const normalizedOtp = String(otpCode || '').trim();

  if (!normalizedOtp || normalizedOtp.length < 4) {
    throw new Error('Please enter the OTP code.');
  }

  let verifyError = null;
  const attempts = ['phone_change', 'sms'];

  for (const type of attempts) {
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: normalizedOtp,
      type,
    });

    if (!error) {
      verifyError = null;
      break;
    }

    verifyError = error;
  }

  if (verifyError) throw verifyError;

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) throw new Error('Not authenticated.');

  const verifiedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('users')
    .update({
      phone_number: normalizedPhone,
      phone_verification_status: 'verified',
      phone_verified_at: verifiedAt,
      onboarding_step: 'VideoVerification',
      updated_at: verifiedAt,
    })
    .eq('id', user.id);

  if (updateError) throw updateError;

  return true;
}

async function submitVerificationRequest({ capturedMedia, idCardMedia = null }) {
  if (!capturedMedia?.uri) {
    throw new Error('Selfie or video verification media is required.');
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) throw new Error('Not authenticated.');

  const timestamp = Date.now();
  const selfieExt = capturedMedia.name ? capturedMedia.name.split('.').pop() : 'jpg';
  const selfiePath = `verifications/${user.id}/selfie_${timestamp}.${selfieExt}`;
  const selfieUrl = await uploadMedia(capturedMedia.uri, 'verification_media', selfiePath);

  let idCardUrl = null;
  if (idCardMedia?.uri) {
    const idExt = idCardMedia.name ? idCardMedia.name.split('.').pop() : 'jpg';
    const idPath = `verifications/${user.id}/id_card_${timestamp}.${idExt}`;
    idCardUrl = await uploadMedia(idCardMedia.uri, 'verification_media', idPath);
  }

  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('phone_number, phone_verification_status')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;

  const requestType = idCardUrl ? 'selfie_with_id' : 'selfie_only';
  const createdAt = new Date().toISOString();

  const { data: requestRow, error: requestError } = await supabase
    .from('verification_requests')
    .insert({
      user_id: user.id,
      media_url: selfieUrl,
      selfie_url: selfieUrl,
      id_card_url: idCardUrl,
      request_type: requestType,
      phone_number: profileData?.phone_number || null,
      status: 'pending',
      metadata: {
        phone_verification_status: profileData?.phone_verification_status || 'unverified',
        submitted_via: 'app',
      },
      created_at: createdAt,
    })
    .select('id')
    .single();

  if (requestError) throw requestError;

  const { error: updateError } = await supabase
    .from('users')
    .update({
      verification_status: 'pending',
      id_card_url: idCardUrl,
      id_verification_status: idCardUrl ? 'pending_review' : 'not_submitted',
      onboarding_step: 'ModeSelect',
      updated_at: createdAt,
    })
    .eq('id', user.id);

  if (updateError) throw updateError;

  return requestRow;
}

module.exports = {
  EMAIL_REDIRECT_URL,
  getVerificationOverview,
  normalizePhoneNumber,
  resendSignupVerificationEmail,
  startPhoneVerification,
  submitVerificationRequest,
  syncEmailVerificationState,
  verifyPhoneOtp,
};
