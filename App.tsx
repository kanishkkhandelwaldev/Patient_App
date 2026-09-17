import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './state/AppContext';
import { GameId } from './data/games';
import ReminderOverlay from './components/ReminderOverlay';
import { colors } from './theme/theme';

import AuthScreen from './app/AuthScreen';
import PatientSetupScreen from './app/PatientSetupScreen';
import HomeScreen from './app/HomeScreen';
import GamePlayScreen from './app/GamePlayScreen';
import MoreGamesScreen from './app/MoreGamesScreen';
import ProgressScreen from './app/ProgressScreen';
import CommunityScreen from './app/CommunityScreen';
import MemoryChestScreen from './app/MemoryChestScreen';
import SOSScreen from './app/SOSScreen';
import SettingsScreen from './app/SettingsScreen';
import AlertsScreen from './app/AlertsScreen';
import CognitiveReportScreen from './app/CognitiveReportScreen';

export type RootStackParamList = {
  Auth: undefined;
  PatientSetup: undefined;
  Home: undefined;
  GamePlay: { gameId: GameId };
  MoreGames: undefined;
  Progress: undefined;
  Community: undefined;
  MemoryChest: undefined;
  SOS: undefined;
  Settings: undefined;
  Alerts: undefined;
  CognitiveReport: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Root() {
  const { state } = useApp();

  if (!state.hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const initialRoute = state.onboardingComplete && state.authenticated ? 'Home' : 'Auth';

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="PatientSetup" component={PatientSetupScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="GamePlay" component={GamePlayScreen} />
          <Stack.Screen name="MoreGames" component={MoreGamesScreen} />
          <Stack.Screen name="Progress" component={ProgressScreen} />
          <Stack.Screen name="Community" component={CommunityScreen} />
          <Stack.Screen name="MemoryChest" component={MemoryChestScreen} />
          <Stack.Screen name="SOS" component={SOSScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Alerts" component={AlertsScreen} />
          <Stack.Screen name="CognitiveReport" component={CognitiveReportScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      {/* Reminder delivery sits above every screen (spec §18) */}
      <ReminderOverlay />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
