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

/**
 * Picks an image from camera or library
 */
const pickMedia = async (source = 'library', allowsEditing = true) => {
  try {
    // For web, use file input
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve({
                uri: event.target.result,
                width: null,
                height: null,
                type: file.type,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing,
      aspect: [1, 1],
      quality: 1,
    };

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
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

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
      // For native: Use fetch to get the file as blob
      console.log('📱 Native platform detected');
      try {
        // Method 1: Try using fetch for the file URI
        const response = await fetch(uploadUri);
        fileData = await response.blob();
        console.log('✅ File loaded via fetch');
      } catch (fetchError) {
        console.log('⚠️ Fetch failed, trying FileSystem:', fetchError.message);
        // Method 2: Use FileSystem as fallback
        const FileSystem = require('expo-file-system').default;
        const fileInfo = await FileSystem.getInfoAsync(uploadUri);
        
        if (!fileInfo.exists) {
          throw new Error(`File not found: ${uploadUri}`);
        }
        
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uploadUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileData = bytes.buffer;
        console.log('✅ File loaded via FileSystem');
      }
    }

    console.log(`📤 Uploading ${fileData.size} bytes to ${bucket}...`);
    
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
    throw error;
  }
};

module.exports = {
  pickMedia,
  compressImage,
  uploadMedia,
};
