import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/theme/ThemeContext';
import { ToastProvider } from './src/components/ToastProvider';
// colors is still imported for the initial ActivityIndicator fallback background (can use a generic black/white)
import { colors } from './src/theme/colors';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold_Italic,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#C89040" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AppNavigator />
      </ToastProvider>
    </ThemeProvider>
  );
}
