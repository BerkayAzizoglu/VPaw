import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

type PrimaryGradientButtonProps = {
  label: string;
  disabled?: boolean;
  onPress: () => void;
};

export default function PrimaryGradientButton({ label, disabled = false, onPress }: PrimaryGradientButtonProps) {
  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.shell,
        disabled && styles.shellDisabled,
        pressed && !disabled && styles.shellPressed,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
          <Defs>
            <SvgLinearGradient id="btnGradPets2025" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#05386B" />
              <Stop offset="100%" stopColor="#5CDB95" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="1" height="1" fill="url(#btnGradPets2025)" />
        </Svg>
      </View>
      <View pointerEvents="none" style={styles.topEdge} />
      {disabled ? <View pointerEvents="none" style={styles.disabledVeil} /> : null}
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    overflow: 'hidden',
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A7AA8',
    shadowOpacity: 0.48,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  shellDisabled: {
    shadowOpacity: 0.18,
  },
  shellPressed: {
    transform: [{ scale: 1.014 }, { translateY: -2 }],
    opacity: 1,
  },
  label: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  labelDisabled: {
    color: 'rgba(255,255,255,0.86)',
  },
  topEdge: {
    position: 'absolute',
    top: 1,
    left: 22,
    right: 22,
    height: 1.2,
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  disabledVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
});
