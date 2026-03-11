// screens/main/HomeScreen.js
const React = require('react');
const { View, StyleSheet, StatusBar } = require('react-native');
const { useMode } = require('../../context/ModeContext');
const DatingHome = require('../../src/components/home/DatingHome');
const MatrimonyHome = require('../../src/components/home/MatrimonyHome');
const Colors = require('../../src/theme/Colors');

const HomeScreen = ({ navigation }) => {
  const { userMode } = useMode();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      {userMode === 'dating' ? (
        <DatingHome navigation={navigation} />
      ) : (
        <MatrimonyHome navigation={navigation} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

module.exports = HomeScreen;
