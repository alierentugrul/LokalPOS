import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';

export default function AnimatedTeaLogo({ size = 44 }) {
  const stirAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(stirAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(stirAnim, { toValue: -1, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = stirAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-20deg', '15deg']
  });

  const translateX = stirAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-6, 6]
  });

  const spoonSize = size * 0.7;

  return (
    <View style={{ width: size * 1.2, height: size * 1.2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text
        style={{
          fontSize: spoonSize,
          position: 'absolute',
          top: -spoonSize * 0.1,
          right: size * 0.1,
          zIndex: 1,
          transform: [
            { translateX },
            { rotate },
            { translateY: spoonSize * 0.2 }
          ]
        }}
      >
        🥄
      </Animated.Text>
      <Text style={{ fontSize: size, zIndex: 2, marginTop: size * 0.15 }}>🍵</Text>
    </View>
  );
}
