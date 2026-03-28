import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { PawPrint } from 'lucide-react-native';

type PrimaryGradientButtonProps = {
  label: string;
  disabled?: boolean;
  compact?: boolean;
  onPress: () => void;
};

export default function PrimaryGradientButton({
  label,
  disabled = false,
  compact = false,
  onPress,
}: PrimaryGradientButtonProps) {
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
        compact && styles.shellCompact,
        disabled && styles.shellDisabled,
        pressed && !disabled && styles.shellPressed,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      <View pointerEvents="none" style={styles.gradientFallback} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <SvgLinearGradient
              id="btnGradPets2025"
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#5B7C8D" />
              <Stop offset="100%" stopColor="#4FC3B3" />
            </SvgLinearGradient>
            <SvgLinearGradient
              id="btnTopHighlightPets2025"
              x1="0"
              y1="0"
              x2="0"
              y2="100"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <Stop offset="46%" stopColor="rgba(255,255,255,0.08)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#btnGradPets2025)" />
          <Rect x="0" y="0" width="100" height="100" fill="url(#btnTopHighlightPets2025)" />
        </Svg>
      </View>
      {disabled ? <View pointerEvents="none" style={styles.disabledVeil} /> : null}
      <View style={styles.labelRow}>
        <Text style={[styles.label, compact && styles.labelCompact, disabled && styles.labelDisabled]}>{label}</Text>
        <PawPrint size={13} color="rgba(248,251,252,0.8)" strokeWidth={2} style={styles.pawIcon} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 74,
    borderRadius: 999,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  gradientFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4F8A92',
  },
  shellCompact: {
    minHeight: 68,
  },
  shellDisabled: {
    shadowOpacity: 0.05,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shellPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.98,
  },
  labelRow: {
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pawIcon: {
    marginTop: 0,
  },
  label: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: '#F8FBFC',
    letterSpacing: 0.15,
  },
  labelCompact: {
    fontSize: 17,
    lineHeight: 21,
  },
  labelDisabled: {
    color: 'rgba(248,251,252,0.94)',
  },
  disabledVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
