import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // Varsayılan Koyu Tema (Gece Mavisi)
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Kayıtlı tema tercihini yükle
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_is_dark');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'true');
        }
      } catch (e) {
        console.error('Tema yüklenirken hata:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('@theme_is_dark', String(newTheme));
    } catch (e) {
      console.error('Tema kaydedilirken hata:', e);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  if (!isLoaded) return null; // AsyncStorage yüklenene kadar bekle (çok hızlıdır)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Kolay erişim için custom hook
export const useTheme = () => useContext(ThemeContext);
