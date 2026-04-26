// src/utils/useResponsive.js
const { useState, useEffect } = require('react');
const { Platform, Dimensions } = require('react-native');

const { useMediaQuery } = require('react-native-web');

/**
 * Custom hook to detect platform and screen size
 * for responsive design across web and mobile
 */
const useResponsive = () => {
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription.remove();
  }, []);

  const isWeb = Platform.OS === 'web';
  const isMobile = !isWeb || dimensions.width < 768;
  const isTablet = !isWeb && dimensions.width >= 768;
  const isDesktop = isWeb && dimensions.width >= 1024;

  // Breakpoints
  const isSmallMobile = dimensions.width < 375;
  const isLargeMobile = dimensions.width >= 414;
  const isNarrow = dimensions.width < 400;

  return {
    Platform: Platform.OS,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    isLargeMobile,
    isNarrow,
    width: dimensions.width,
    height: dimensions.height,
    // Breakpoints
    breakpoint: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  };
};

module.exports = { useResponsive };