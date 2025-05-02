import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/contexts/AuthContext';

// Import auth screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';

// Import existing screens
import LanguageLanding from './src/screens/LanguageLanding';
import LanguageTutor from './src/screens/LanguageTutor';
import AudioTestScreen from './src/screens/AudioTestScreen';

// Import types
import { RootStackParamList, AuthStackParamList } from './src/types/navigation';

// Create the navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// Auth Navigator - Screens accessible before login
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

// Main Navigator - Authenticated screens
const MainNavigator = () => {
  return (
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
        name="LanguageTutor"
        component={LanguageTutor}
      />
      <Stack.Screen
        name="AudioTest"
        component={AudioTestScreen}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
      />
    </Stack.Navigator>
  );
};

// Root Navigator with Authentication Flow
const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // You could add a splash screen here
    return null;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// Main App component
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}