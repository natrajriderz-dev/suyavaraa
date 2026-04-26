// src/components/shared/ResponsiveLayout.js
const React = require('react');
const { View, StyleSheet, Platform } = require('react-native');

/**
 * ResponsiveLayout - A wrapper component that provides
 * different layouts for web vs mobile platforms
 */
const ResponsiveLayout = ({
  children,
  webWidth = 500,
  centerOnWeb = true,
  style,
  webStyle,
  mobileStyle,
}) => {
  const isWeb = Platform.OS === 'web';

  const containerStyle = [
    styles.container,
    isWeb && centerOnWeb && styles.webContainer,
    style,
    isWeb ? webStyle : mobileStyle,
  ];

  const contentStyle = [
    isWeb && centerOnWeb && { maxWidth: webWidth },
  ];

  return (
    <View style={containerStyle}>
      <View style={contentStyle}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webContainer: {
    alignItems: 'center',
  },
});

module.exports = { ResponsiveLayout };