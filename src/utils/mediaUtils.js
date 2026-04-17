// src/utils/mediaUtils.js
const { supabase } = require('../../supabase');
const { Platform } = require('react-native');
let ImagePicker, ImageManipulator;
try {
  ImagePicker = require('expo-image-picker');
  ImageManipulator = require('expo-image-manipulator');
} catch (e) {
  // Not available on web
}
const { Alert } = require('react-native');

const decodeBase64ToArrayBuffer = (base64) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const cleaned = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  let bufferLength = cleaned.length * 0.75;

  if (cleaned.endsWith('==')) {
    bufferLength -= 2;
  } else if (cleaned.endsWith('=')) {
    bufferLength -= 1;
  }

  const bytes = new Uint8Array(bufferLength);
  let byteIndex = 0;

  for (let i = 0; i < cleaned.length; i += 4) {
    const encoded1 = chars.indexOf(cleaned[i]);
    const encoded2 = chars.indexOf(cleaned[i + 1]);
    const encoded3 = chars.indexOf(cleaned[i + 2]);
    const encoded4 = chars.indexOf(cleaned[i + 3]);

    const chunk = (encoded1 << 18) | (encoded2 << 12) | ((encoded3 & 63) << 6) | (encoded4 & 63);

    bytes[byteIndex++] = (chunk >> 16) & 255;

    if (encoded3 !== 64) {
      bytes[byteIndex++] = (chunk >> 8) & 255;
    }

    if (encoded4 !== 64) {
      bytes[byteIndex++] = chunk & 255;
    }
  }

  return bytes.buffer;
};

const mimeByExt = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
};

const inferMimeType = (path, fallback = 'application/octet-stream') => {
  const cleanPath = (path || '').split('?')[0].split('#')[0];
  const ext = cleanPath.includes('.') ? cleanPath.split('.').pop().toLowerCase() : '';
  return mimeByExt[ext] || fallback;
};

/**
 * Picks an image from camera or library
 */
const pickMedia = async (source = 'library', allowsEditing = true, mediaKind = 'image') => {
  try {
    // For web, use file input
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = mediaKind === 'video' ? 'video/*' : 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve({
                uri: event.target.result,
                width: null,
                height: null,
                type: file.type || inferMimeType(file.name),
                name: file.name,
              });
            };
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    }

    // For native, use ImagePicker
    if (!ImagePicker) {
      Alert.alert('Error', 'ImagePicker not available');
      return null;
    }

    const permission = source === 'library' 
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Required', `Allow access to your ${source} to continue.`);
      return null;
    }

    const options = {
      mediaTypes: mediaKind === 'video'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      allowsEditing,
      aspect: [1, 1],
      quality: 1,
    };

    if (mediaKind === 'video') {
      options.allowsEditing = false;
      options.videoQuality = ImagePicker.VideoQuality['720p'];
      options.videoMaxDuration = 30;
    }

    const result = source === 'library'
      ? await ImagePicker.launchImageLibraryAsync(options)
      : await ImagePicker.launchCameraAsync(options);

    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Pick Media Error:', error);
    return null;
  }
};

/**
 * Compresses and resizes an image
 */
const compressImage = async (uri) => {
  try {
    // For web, return as-is (compression not available)
    if (Platform.OS === 'web') {
      return uri;
    }

    if (!ImageManipulator) {
      return uri;
    }

    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1000 } }], // Resize for profile/post
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error('Compression Error:', error);
    return uri;
  }
};

const autoCompressMedia = async (uri, mimeType) => {
  if (Platform.OS !== 'web' && mimeType.startsWith('image/')) {
    return compressImage(uri);
  }
  return uri;
};

/**
 * Uploads media to Supabase Storage
 */
const uploadMedia = async (uri, bucket, path) => {
  try {
    console.log(`📤 Starting upload to bucket: ${bucket}, path: ${path}`);
    
    const fileName = path.split('/').pop();
    const mimeType = inferMimeType(fileName);

    let fileData;
    let uploadUri = uri;

    if (mimeType.startsWith('image/')) {
      console.log('🖼️ Compressing image...');
      uploadUri = await autoCompressMedia(uri, mimeType);
    }

    if (Platform.OS === 'web') {
      // For web: uri is a DataURL (base64)
      console.log('🌐 Web platform detected');
      const response = await fetch(uploadUri);
      fileData = await response.blob();
    } else {
      // For native: read the local file directly instead of fetch(file://...),
      // which commonly fails in React Native with "Network request failed".
      console.log('📱 Native platform detected');
      const FileSystem = require('expo-file-system/legacy');
      const fileInfo = await FileSystem.getInfoAsync(uploadUri);

      if (!fileInfo.exists) {
        throw new Error(`File not found: ${uploadUri}`);
      }

      const base64 = await FileSystem.readAsStringAsync(uploadUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      fileData = decodeBase64ToArrayBuffer(base64);
      console.log('✅ File loaded via FileSystem');
    }

    console.log(`📤 Uploading file to ${bucket}...`);
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, fileData, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('❌ Upload error:', error);
      const errorText = error.message?.toLowerCase() || '';
      const bucketMissing = errorText.includes('bucket') && (errorText.includes('not found') || errorText.includes('does not exist') || errorText.includes('not exist'));
      const permissionDenied = errorText.includes('permission denied') || errorText.includes('not authorized');
      
      let message = error.message || 'Photo upload failed';
      
      if (bucketMissing) {
        message = `Supabase storage bucket "${bucket}" is missing. Create this bucket in Supabase Storage and retry.`;
      } else if (permissionDenied) {
        message = `Permission denied for bucket "${bucket}". Check RLS policies or bucket permissions.`;
      }
      
      throw new Error(message);
    }

    console.log('✅ Upload successful!');
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    console.log(`🔗 Public URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('💥 Upload Error:', error);
    const errorText = error?.message?.toLowerCase?.() || '';

    if (errorText === 'network request failed') {
      throw new Error(
        `Upload request to Supabase failed for bucket "${bucket}". ` +
        'Check device internet access, Supabase URL/key config, and storage RLS policies.'
      );
    }

    throw error;
  }
};

module.exports = {
  pickMedia,
  compressImage,
  uploadMedia,
};
