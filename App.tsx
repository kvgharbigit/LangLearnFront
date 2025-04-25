import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Import screens
import LanguageLanding from './src/screens/LanguageLanding';
import LanguageTutor from './src/screens/LanguageTutor'; // Change this import
import AudioTestScreen from './src/screens/AudioTestScreen';

// Import types
import { RootStackParamList } from './src/types/navigation';

// Create the navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="LanguageLanding"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="LanguageLanding"
            component={LanguageLanding}
          />
          <Stack.Screen
            name="LanguageTutor" // Change this screen name
            component={LanguageTutor}
          />
          <Stack.Screen 
            name="AudioTest" 
            component={AudioTestScreen} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}