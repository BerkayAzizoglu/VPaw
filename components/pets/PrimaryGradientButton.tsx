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
              <Stop offset="0%" stopColor="#6F8FB8" />
              <Stop offset="100%" stopColor="#82DDB8" />
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
    minHeight: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#21466B',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  shellDisabled: {
    shadowOpacity: 0.18,
  },
  shellPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.97,
  },
  label: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: '#F7FAFC',
    letterSpacing: -0.1,
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
