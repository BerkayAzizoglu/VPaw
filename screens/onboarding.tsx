import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type OnboardingScreenProps = {
  locale: string;
  onAddPet: () => void;
};

type StepContent = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  visual: string;
};

export default function OnboardingScreen({ locale, onAddPet }: OnboardingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, stepIndex, translateY]);

  const isTr = locale === 'tr';
  const steps: StepContent[] = useMemo(() => ([
    {
      title: isTr ? 'Tum saglik tek yerde' : 'Your pet health, one place',
      subtitle: isTr ? 'Gunluk bakimdan klinik gecmise kadar her sey duzenli.' : 'From daily care to clinic history, everything stays organized.',
      ctaLabel: isTr ? 'Devam Et' : 'Continue',
      visual: '??  ??',
    },
    {
      title: isTr ? 'Takip et, unutma' : 'Track and stay ahead',
      subtitle: isTr ? 'Hatirlatici, ziyaret ve asi takibi tek akista.' : 'Reminders, visits, and vaccines in one calm timeline.',
      ctaLabel: isTr ? 'Devam Et' : 'Continue',
      visual: '???  ??',
    },
    {
      title: isTr ? 'Petini ekleyelim' : 'Let us add your pet',
      subtitle: isTr ? 'Kurulumu tamamlamak icin tek adim kaldi.' : 'One final step to personalize your health hub.',
      ctaLabel: isTr ? 'Pet Ekle' : 'Add Pet',
      visual: '?  ??',
    },
  ]), [isTr]);

  const current = steps[stepIndex];

  const handlePrimaryAction = () => {
    Animated.sequence([
      Animated.timing(ctaScale, { toValue: 0.985, duration: 85, useNativeDriver: true }),
      Animated.timing(ctaScale, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();

    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
      return;
    }
    onAddPet();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgLayer}>
        <View style={styles.bgBlobTopLeft} />
        <View style={styles.bgBlobTopRight} />
        <View style={styles.bgBlobBottomLeft} />
        <View style={styles.bgBlobBottomRight} />
      </View>

      <Animated.View style={[styles.sheet, { opacity, transform: [{ translateY }] }]}>
        <View style={styles.heroWrap}>
          <Text style={styles.heroVisual}>{current.visual}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.progressRow}>
            {[0, 1, 2].map((dot) => (
              <View key={dot} style={[styles.progressDot, dot === stepIndex ? styles.progressDotActive : null]} />
            ))}
          </View>

          <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
            <Pressable onPress={handlePrimaryAction} style={styles.primaryButtonWrap}>
              <LinearGradient
                colors={['#8fc9ac', '#5ca7b8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonLabel}>{current.ctaLabel}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ece7df',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgBlobTopLeft: {
    position: 'absolute',
    width: 280,
    height: 270,
    borderRadius: 136,
    left: -140,
    top: -72,
    backgroundColor: '#a6c2ad',
  },
  bgBlobTopRight: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    right: -104,
    top: 42,
    backgroundColor: '#dcd5ca',
  },
  bgBlobBottomLeft: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    left: -78,
    bottom: 94,
    backgroundColor: '#e7e8ef',
  },
  bgBlobBottomRight: {
    position: 'absolute',
    width: 278,
    height: 292,
    borderRadius: 150,
    right: -128,
    bottom: -60,
    backgroundColor: '#e7c9a9',
  },
  sheet: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 8,
    borderRadius: 36,
    backgroundColor: '#f8f6f2',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 26,
    justifyContent: 'space-between',
  },
  heroWrap: {
    marginTop: 16,
    alignItems: 'center',
  },
  heroVisual: {
    fontSize: 70,
    lineHeight: 82,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#1f1f1f',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#383838',
    textAlign: 'center',
    maxWidth: 300,
  },
  footer: {
    gap: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#c2c0bc',
  },
  progressDotActive: {
    width: 22,
    backgroundColor: '#85b99b',
  },
  primaryButtonWrap: {
    borderRadius: 35,
    shadowColor: '#4a7d7f',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  primaryButton: {
    minHeight: 64,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
  },
});
