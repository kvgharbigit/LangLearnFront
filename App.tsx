import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import LanguageLanding from './src/screens/LanguageLanding';
import SpanishTutor from './src/screens/SpanishTutor';

// Define types for the navigation stack
type RootStackParamList = {
  LanguageLanding: undefined;
  SpanishTutor: {
    nativeLanguage: string;
    targetLanguage: string;
    difficulty: string;
    learningObjective: string;
  };
};

// Create navigator with typed params
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
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
            name="SpanishTutor"
            component={SpanishTutor}
            options={{
              gestureEnabled: false, // Prevent going back with swipe
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}