// screens/main/ChatStack.js
const React = require('react');
const { createStackNavigator } = require('@react-navigation/stack');
const Colors = require('../../src/theme/Colors');
const MatchesListScreen = require('../../src/screens/main/MatchesListScreen');
const ChatScreen = require('../../src/screens/main/ChatScreen');
const MemberProfileScreen = require('../../src/screens/main/MemberProfileScreen');

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
      <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />
    </Stack.Navigator>
  );
};

module.exports = ChatStack;
