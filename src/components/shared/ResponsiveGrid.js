// src/components/shared/ResponsiveGrid.js
const React = require('react');
const { View, StyleSheet, Platform, useWindowDimensions } = require('react-native');
const Colors = require('../../theme/Colors');

/**
 * ResponsiveGrid - A grid component that adapts to web and mobile layouts
 * Shows 1 column on mobile, 2 on tablet, 3-4 on desktop
 */
const ResponsiveGrid = ({
  children,
  columns = 'auto', // 1, 2, 3, 4, or 'auto'
  gap = 16,
  style,
}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // Determine number of columns based on screen width
  let numColumns = 1;
  
  if (columns === 'auto') {
    if (isWeb) {
      if (width >= 1280) numColumns = 4;
      else if (width >= 1024) numColumns = 3;
      else if (width >= 768) numColumns = 2;
      else numColumns = 1;
    } else {
      // Mobile/React Native
      if (width >= 768) numColumns = 3;
      else if (width >= 480) numColumns = 2;
      else numColumns = 1;
    }
  } else {
    numColumns = typeof columns === 'number' ? columns : 1;
  }

  // Convert children to array and map
  const childArray = React.Children.toArray(children);
  const rows = [];
  
  for (let i = 0; i < childArray.length; i += numColumns) {
    rows.push(childArray.slice(i, i + numColumns));
  }

  return (
    <View style={[styles.container, style]}>
      {rows.map((row, rowIndex) => (
        <View 
          key={rowIndex} 
          style={[
            styles.row, 
            { marginBottom: rowIndex < rows.length - 1 ? gap : 0 }
          ]}
        >
          {row.map((child, colIndex) => (
            <View 
              key={colIndex} 
              style={[
                styles.cell,
                { 
                  width: `${100 / numColumns}%`,
                  paddingHorizontal: gap / 2,
                }
              ]}
            >
              {child}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    // Width is set dynamically
  },
});

module.exports = { ResponsiveGrid };