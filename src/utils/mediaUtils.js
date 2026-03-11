// src/utils/mediaUtils.js
const { supabase } = require('../../supabase');
const ImagePicker = require('expo-image-picker');
const ImageManipulator = require('expo-image-manipulator');
const { Alert } = require('react-native');

/**
 * Picks an image from camera or library
 */
const pickMedia = async (source = 'library', allowsEditing = true) => {
  try {
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

/**
 * Uploads media to Supabase Storage
 */
const uploadMedia = async (uri, bucket, path) => {
  try {
    const formData = new FormData();
    const fileName = path.split('/').pop();
    const ext = fileName.split('.').pop();

    formData.append('file', {
      uri: uri,
      name: fileName,
      type: `image/${ext}`
    });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, formData, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  } catch (error) {
    console.error('Upload Error:', error);
    return null;
  }
};

module.exports = {
  pickMedia,
  compressImage,
  uploadMedia,
};
