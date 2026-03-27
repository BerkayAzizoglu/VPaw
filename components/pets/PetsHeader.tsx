import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

type PetsHeaderProps = {
  label: string;
  title: string;
  onBack: () => void;
};

export default function PetsHeader({ label, title, onBack }: PetsHeaderProps) {
  return (
    <View style={styles.container}>
      <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]} onPress={onBack}>
        <ChevronLeft size={18} color="#EAF4FF" strokeWidth={2.4} />
      </Pressable>

      <View style={styles.copyBlock}>
        <Svg width="152" height="20" viewBox="0 0 152 20">
          <SvgText
            x="0"
            y="15"
            fontSize="15"
            fontWeight="600"
            fill="rgba(233,243,255,0.94)"
            letterSpacing={0.3}
          >
            {label.toUpperCase()}
          </SvgText>
        </Svg>

        <View style={styles.titleRow}>
          <Svg height="52" viewBox="0 0 280 52" style={styles.titleSvg}>
            <Defs>
              <LinearGradient id="activeGrad" x1="0" y1="0" x2="1" y2="0.2">
                <Stop offset="0%" stopColor="#0C8EBE" />
                <Stop offset="45%" stopColor="#0EB4A8" />
                <Stop offset="100%" stopColor="#24D4BC" />
              </LinearGradient>
            </Defs>
            <SvgText
              x="0"
              y="42"
              fontSize="44"
              fontWeight="900"
              fill="url(#activeGrad)"
              letterSpacing={-1.5}
            >
              {title}
            </SvgText>
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 46,
    paddingBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  copyBlock: {
    marginTop: 14,
  },
  titleRow: {
    marginTop: 4,
  },
  titleSvg: {
    width: 280,
  },
});
