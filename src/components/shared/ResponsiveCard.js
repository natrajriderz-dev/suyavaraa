// src/components/shared/ResponsiveCard.js
const React = require('react');
const { View, Text, Image, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const Colors = require('../../theme/Colors');

/**
 * ResponsiveCard - A card component that adapts to web and mobile layouts
 */
const ResponsiveCard = ({
  children,
  title,
  subtitle,
  image,
  imageUrl,
  onPress,
  footer,
  headerRight,
  style,
  elevation = true,
}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideScreen = width >= 768;

  // Card dimensions
  const cardWidth = isWeb && isWideScreen ? Math.min(width * 0.4, 350) : '100%';
  const cardMaxWidth = isWeb ? 400 : undefined;

  const cardStyle = [
    styles.card,
    { width: cardWidth, maxWidth: cardMaxWidth },
    elevation && styles.elevation,
    isWeb && styles.webCard,
    style,
  ];

  const Content = () => (
    <>
      {/* Header with image */}
      {(image || imageUrl) && (
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            image
          )}
        </View>
      )}

      {/* Header with title and subtitle */}
      {(title || subtitle || headerRight) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Footer */}
      {footer && (
        <View style={styles.footer}>
          {footer}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        <Content />
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      <Content />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  elevation: {
    elevation: 4,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.15)',
  },
  webCard: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  headerRight: {
    marginLeft: 12,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  footer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

module.exports = { ResponsiveCard };