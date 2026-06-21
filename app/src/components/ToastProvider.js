import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { colors } = useTheme();
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timerRef = useRef(null);

  const showToast = useCallback(({ message, type = 'success', duration = 2200 }) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });

    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, duration);
  }, []);

  const iconMap = {
    success: { name: 'checkmark-circle', color: '#4CAF50' },
    error: { name: 'alert-circle', color: '#F44336' },
    info: { name: 'information-circle', color: '#2196F3' },
    warning: { name: 'warning', color: '#FF9800' },
  };

  const icon = iconMap[toast?.type] || iconMap.success;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: colors.card,
              borderColor: icon.color + '44',
              opacity,
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name={icon.name} size={20} color={icon.color} />
          <Text style={[styles.toastText, { color: colors.text }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 9999,
  },
  toastText: {
    fontFamily: typography.mono,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
