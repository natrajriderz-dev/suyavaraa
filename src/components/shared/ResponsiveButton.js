// src/components/shared/ResponsiveButton.js
const React = require('react');
const { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Platform, View } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const Colors = require('../../theme/Colors');

/**
 * ResponsiveButton - A button component that adapts to web and mobile
 */
const ResponsiveButton = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, outline, ghost
  size = 'medium', // small, medium, large
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isWeb = Platform.OS === 'web';

  // Size styles
  const sizeStyles = {
    small: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13 },
    medium: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 15 },
    large: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 17 },
  };

  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    secondary: {
      backgroundColor: Colors.secondary,
      borderColor: Colors.secondary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: Colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  // Text color based on variant
  const textColor = variant === 'primary' || variant === 'secondary' 
    ? '#FFFFFF' 
    : (variant === 'outline' ? Colors.primary : Colors.text);

  const buttonStyles = [
    styles.button,
    {
      paddingVertical: currentSize.paddingVertical,
      paddingHorizontal: currentSize.paddingHorizontal,
    },
    currentVariant,
    fullWidth && styles.fullWidth,
    isWeb && styles.webButton,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    {
      fontSize: currentSize.fontSize,
      color: disabled ? Colors.textSecondary : textColor,
    },
    textStyle,
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' || variant === 'secondary' ? '#FFFFFF' : Colors.primary} 
        />
      );
    }

    return (
      <View style={styles.content}>
        {icon && iconPosition === 'left' && (
          <Ionicons 
            name={icon} 
            size={currentSize.fontSize + 2} 
            color={disabled ? Colors.textSecondary : textColor}
            style={styles.iconLeft}
          />
        )}
        <Text style={textStyles}>{title}</Text>
        {icon && iconPosition === 'right' && (
          <Ionicons 
            name={icon} 
            size={currentSize.fontSize + 2} 
            color={disabled ? Colors.textSecondary : textColor}
            style={styles.iconRight}
          />
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  webButton: {
    cursor: 'pointer',
    transitionProperty: 'opacity',
    transitionDuration: '150ms',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

module.exports = { ResponsiveButton };