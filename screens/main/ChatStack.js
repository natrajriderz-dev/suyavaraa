// screens/main/ChatStack.js
const React = require('react');
const { createStackNavigator } = require('@react-navigation/stack');
const Colors = require('../../src/theme/Colors');
const MatchesListScreen = require('../../src/screens/main/MatchesListScreen');
const ChatScreen = require('../../src/screens/main/ChatScreen');

const Stack = createStackNavigator();

const ChatStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="MatchesList"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="MatchesList" component={MatchesListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
};

module.exports = ChatStack;