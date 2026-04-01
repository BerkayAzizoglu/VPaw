import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BellRing, Stethoscope, Syringe } from 'lucide-react-native';

type OnboardingScreenProps = {
  locale: string;
  onAddPet: () => void;
};

type StepContent = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  visual: string;
  imageAsset?: number;
  tone?: 'light' | 'journey' | 'pet';
};

const onboardingHeroOne = require('../assets/illustrations/onboarding-pic-1.png');
const onboardingHeroThree = require('../assets/illustrations/onboarding-pic-3.png');

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
      title: isTr ? 'Petin icin duzenli bakim, karmasa olmadan.' : 'Care for your pet, without the chaos.',
      subtitle: isTr ? 'Gunluk bakim, klinik gecmisi ve saglik takibi tek bir sakin alanda.' : 'Daily care, clinic history, and health tracking in one calm place.',
      ctaLabel: isTr ? 'Devam Et' : 'Continue',
      visual: '',
      imageAsset: onboardingHeroOne,
    },
    {
      title: isTr ? 'Her seyin ustunde kal.' : 'Stay on top of everything.',
      subtitle: isTr ? 'Petinizin saglik yolculugunu zahmetsizce takip edin.' : "Effortlessly track your pet's health journey.",
      ctaLabel: isTr ? 'Devam Et' : 'Continue',
      visual: '',
      tone: 'journey',
    },
    {
      title: isTr ? 'Her sey petin etrafinda sekillenir.' : 'Built around your pet.',
      subtitle: isTr ? 'Baslamak icin minik aile uyeni ekleyin.' : 'Start by adding your furry family member.',
      ctaLabel: isTr ? 'Pet Ekle' : 'Add Pet',
      visual: '',
      imageAsset: onboardingHeroThree,
      tone: 'pet',
    },
  ]), [isTr]);

  const current = steps[stepIndex];
  const isIntroStep = stepIndex === 0;
  const isJourneyStep = current.tone === 'journey';
  const isPetStep = current.tone === 'pet';

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
    <SafeAreaView style={[styles.safe, isPetStep ? styles.safePet : null]}>
      <View style={styles.bgLayer}>
        {isPetStep ? (
          <LinearGradient
            colors={['#a8beaf', '#8ea694', '#748d7d']}
            start={{ x: 0.08, y: 0.04 }}
            end={{ x: 0.92, y: 0.96 }}
            style={styles.bgPetFull}
          >
            <View style={styles.petPatternA} />
            <View style={styles.petPatternB} />
            <View style={styles.petPatternC} />
            <View style={styles.petPatternD} />
          </LinearGradient>
        ) : (
          <>
            <View style={[styles.bgBlobTopLeft, isIntroStep ? styles.bgBlobTopLeftIntro : null, isPetStep ? styles.bgBlobTopLeftPet : null]} />
            <View style={[styles.bgBlobTopRight, isIntroStep ? styles.bgBlobTopRightIntro : null, isPetStep ? styles.bgBlobTopRightPet : null]} />
            <View style={[styles.bgBlobBottomLeft, isPetStep ? styles.bgBlobBottomLeftPet : null]} />
            <View style={[styles.bgBlobBottomRight, isIntroStep ? styles.bgBlobBottomRightIntro : null, isPetStep ? styles.bgBlobBottomRightPet : null]} />
            {!isJourneyStep ? <View style={[styles.bgGlowCenter, isPetStep ? styles.bgGlowCenterPet : null]} /> : null}
          </>
        )}
      </View>

      <Animated.View style={[styles.sheet, isJourneyStep ? styles.sheetJourney : null, isPetStep ? styles.sheetPet : null, { opacity, transform: [{ translateY }] }]}>
        <View style={[styles.heroWrap, isJourneyStep ? styles.heroWrapJourney : null]}>
          <View style={[styles.heroGlass, isIntroStep ? styles.heroGlassIntro : null, isJourneyStep ? styles.heroGlassJourney : null, isPetStep ? styles.heroGlassPet : null]}>
            {isIntroStep ? <View style={styles.heroToneBaseIntro} /> : null}
            {!isIntroStep && !isJourneyStep ? <View style={[styles.heroGlowMint, isPetStep ? styles.heroGlowMintPet : null]} /> : null}
            {!isIntroStep && !isJourneyStep ? <View style={[styles.heroGlowPeach, isPetStep ? styles.heroGlowPeachPet : null]} /> : null}
            {isJourneyStep ? (
              <View style={styles.journeyBlock}>
                <Text style={styles.journeyTitle}>{current.title}</Text>
                <Text style={styles.journeySubtitle}>{current.subtitle}</Text>

                <View style={styles.journeyList}>
                  <View style={styles.journeyItem}>
                    <View style={styles.journeyIconWrap}>
                      <Syringe size={24} color="#7a94cc" strokeWidth={2.2} />
                    </View>
                    <Text style={styles.journeyItemTitle}>{isTr ? 'Asilar' : 'Vaccines'}</Text>
                    <Text style={styles.journeyItemMeta}>{isTr ? 'Sonraki 15 Haz' : 'Due Jan 15'}</Text>
                  </View>

                  <View style={styles.journeyItem}>
                    <View style={styles.journeyIconWrap}>
                      <Stethoscope size={24} color="#76aa8e" strokeWidth={2.2} />
                    </View>
                    <Text style={styles.journeyItemTitle}>{isTr ? 'Vet Ziyareti' : 'Vet Visit'}</Text>
                    <Text style={styles.journeyItemMeta}>{isTr ? 'Planlandi 20 Sub' : 'Scheduled Feb 20'}</Text>
                  </View>

                  <View style={styles.journeyItem}>
                    <View style={styles.journeyIconWrap}>
                      <BellRing size={24} color="#a47cc8" strokeWidth={2.2} />
                    </View>
                    <Text style={styles.journeyItemTitle}>{isTr ? 'Hatirlaticilar' : 'Reminders'}</Text>
                    <Text style={styles.journeyItemMeta}>{isTr ? 'Gunluk ilaclar' : 'Daily medicines'}</Text>
                  </View>
                </View>
              </View>
            ) : current.imageAsset ? (
              <>
                <Image source={current.imageAsset} style={[styles.heroImage, isIntroStep ? styles.heroImageIntro : null, isPetStep ? styles.heroImagePet : null]} resizeMode="contain" />
                {isIntroStep ? <View style={styles.heroToneVeilIntro} /> : null}
              </>
            ) : (
              <Text style={styles.heroVisual}>{current.visual}</Text>
            )}
          </View>
          {!isJourneyStep ? <Text style={[styles.title, isPetStep ? styles.titlePet : null]}>{current.title}</Text> : null}
          {!isJourneyStep ? <Text style={[styles.subtitle, isPetStep ? styles.subtitlePet : null]}>{current.subtitle}</Text> : null}
        </View>

        <View style={styles.footer}>
          <View style={styles.progressRow}>
            {[0, 1, 2].map((dot) => (
              <View key={dot} style={[styles.progressDot, dot === stepIndex ? styles.progressDotActive : null]} />
            ))}
          </View>

          <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
            <Pressable onPress={handlePrimaryAction} style={styles.primaryButtonWrap}>
              {isPetStep ? (
                <LinearGradient
                  colors={['rgba(238,244,236,0.44)', 'rgba(255,255,255,0.72)', 'rgba(235,242,234,0.46)']}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.primaryButton, styles.primaryButtonPet]}
                >
                  <Text style={[styles.primaryButtonLabel, styles.primaryButtonLabelPet]}>{current.ctaLabel}</Text>
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={['#8fc9ac', '#5ca7b8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonLabel}>{current.ctaLabel}</Text>
                </LinearGradient>
              )}
            </Pressable>
          </Animated.View>
          {isPetStep ? <Text style={styles.maybeLaterText}>{isTr ? 'Belki sonra' : 'Maybe later'}</Text> : null}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f1ede5',
  },
  safePet: {
    backgroundColor: '#7f9f8f',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgPetFull: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#7f9f8f',
  },
  bgBlobTopLeft: {
    position: 'absolute',
    width: 324,
    height: 312,
    borderRadius: 999,
    left: -176,
    top: -46,
    backgroundColor: '#9adfca',
    opacity: 0.9,
  },
  bgBlobTopLeftIntro: {
    width: 352,
    height: 446,
    left: -206,
    top: -118,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 228,
    borderBottomRightRadius: 168,
    borderBottomLeftRadius: 0,
    transform: [{ rotate: '7deg' }],
    backgroundColor: '#8fe7cd',
    opacity: 0.96,
  },
  bgBlobTopRight: {
    position: 'absolute',
    width: 252,
    height: 252,
    borderRadius: 999,
    right: -132,
    top: 0,
    backgroundColor: '#efd3b5',
    opacity: 0.82,
  },
  bgBlobTopRightIntro: {
    width: 246,
    height: 354,
    right: -160,
    top: -56,
    borderTopLeftRadius: 132,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 154,
    transform: [{ rotate: '-11deg' }],
    backgroundColor: '#f2d9bd',
    opacity: 0.82,
  },
  bgBlobTopRightPet: {
    top: -8,
    right: -108,
    backgroundColor: '#d8ccb2',
    opacity: 0.54,
  },
  bgBlobBottomLeft: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 999,
    left: -116,
    bottom: 104,
    backgroundColor: '#d9eee6',
    opacity: 0.72,
  },
  bgBlobTopLeftPet: {
    backgroundColor: '#9fd3c1',
    opacity: 0.86,
  },
  bgBlobBottomLeftPet: {
    left: -124,
    bottom: 76,
    backgroundColor: '#7ea694',
    opacity: 0.18,
  },
  bgBlobBottomRight: {
    position: 'absolute',
    width: 314,
    height: 326,
    borderRadius: 999,
    right: -144,
    bottom: -96,
    backgroundColor: '#f0caa3',
    opacity: 0.86,
  },
  bgBlobBottomRightIntro: {
    width: 286,
    height: 438,
    right: -138,
    bottom: -118,
    borderTopLeftRadius: 176,
    borderTopRightRadius: 138,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 164,
    transform: [{ rotate: '15deg' }],
    backgroundColor: '#86ddc3',
    opacity: 0.92,
  },
  bgBlobBottomRightPet: {
    right: -136,
    bottom: -82,
    backgroundColor: '#adc6b7',
    opacity: 0.26,
  },
  bgGlowCenter: {
    position: 'absolute',
    width: 286,
    height: 286,
    borderRadius: 999,
    left: '50%',
    top: '53%',
    marginLeft: -143,
    marginTop: -143,
    backgroundColor: 'rgba(181, 234, 219, 0.24)',
  },
  bgGlowCenterPet: {
    top: '58%',
    backgroundColor: 'rgba(194, 222, 208, 0.18)',
  },
  petPatternA: {
    position: 'absolute',
    width: 286,
    height: 240,
    top: -26,
    left: -52,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 138,
    borderBottomRightRadius: 164,
    borderBottomLeftRadius: 78,
    backgroundColor: 'rgba(190, 207, 184, 0.34)',
    transform: [{ rotate: '-8deg' }],
  },
  petPatternB: {
    position: 'absolute',
    width: 250,
    height: 228,
    top: 104,
    right: -82,
    borderTopLeftRadius: 154,
    borderTopRightRadius: 66,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 172,
    backgroundColor: 'rgba(166, 191, 170, 0.24)',
    transform: [{ rotate: '12deg' }],
  },
  petPatternC: {
    position: 'absolute',
    width: 306,
    height: 246,
    bottom: 116,
    left: -128,
    borderTopLeftRadius: 148,
    borderTopRightRadius: 176,
    borderBottomRightRadius: 118,
    borderBottomLeftRadius: 0,
    backgroundColor: 'rgba(130, 157, 136, 0.22)',
    transform: [{ rotate: '17deg' }],
  },
  petPatternD: {
    position: 'absolute',
    width: 318,
    height: 294,
    right: -138,
    bottom: -26,
    borderTopLeftRadius: 172,
    borderTopRightRadius: 124,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 184,
    backgroundColor: 'rgba(186, 201, 177, 0.26)',
    transform: [{ rotate: '-13deg' }],
  },
  sheet: {
    flex: 1,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(252, 249, 243, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.84)',
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 22,
    justifyContent: 'space-between',
    shadowColor: '#948d80',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  sheetPet: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  sheetJourney: {
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 18,
  },
  heroWrap: {
    marginTop: 2,
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  heroWrapJourney: {
    marginTop: 28,
  },
  heroGlass: {
    width: '100%',
    minHeight: 334,
    borderRadius: 28,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 36,
    backgroundColor: 'rgba(255,255,255,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.54)',
    overflow: 'hidden',
  },
  heroGlassIntro: {
    minHeight: 304,
    paddingTop: 8,
    marginBottom: 18,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  heroToneBaseIntro: {
    position: 'absolute',
    top: 26,
    left: 38,
    right: 38,
    bottom: 18,
    borderRadius: 28,
    backgroundColor: 'rgba(244, 232, 217, 0.28)',
  },
  heroToneVeilIntro: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 239, 229, 0.05)',
  },
  heroGlassJourney: {
    minHeight: 498,
    paddingTop: 48,
    marginBottom: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    shadowColor: '#c9c2b6',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
    overflow: 'hidden',
  },
  heroGlassPet: {
    minHeight: 360,
    paddingTop: 6,
    marginBottom: 20,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  heroGlowMint: {
    position: 'absolute',
    width: 188,
    height: 188,
    borderRadius: 999,
    left: -18,
    top: 26,
    backgroundColor: 'rgba(174, 235, 220, 0.46)',
  },
  heroGlowPeach: {
    position: 'absolute',
    width: 194,
    height: 194,
    borderRadius: 999,
    right: -34,
    top: 22,
    backgroundColor: 'rgba(243, 214, 186, 0.42)',
  },
  heroGlowMintPet: {
    width: 210,
    height: 210,
    left: -28,
    top: 44,
    backgroundColor: 'rgba(182, 216, 201, 0.14)',
  },
  heroGlowPeachPet: {
    width: 188,
    height: 188,
    right: -24,
    top: 8,
    backgroundColor: 'rgba(231, 219, 196, 0.14)',
  },
  heroImage: {
    width: 246,
    height: 188,
  },
  heroImageIntro: {
    width: 368,
    height: 278,
    opacity: 1,
    shadowColor: 'rgba(90, 78, 58, 0.28)',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  heroImagePet: {
    width: 436,
    height: 342,
  },
  heroVisual: {
    fontSize: 70,
    lineHeight: 82,
    marginBottom: 10,
  },
  title: {
    fontSize: 43,
    lineHeight: 50,
    fontWeight: '800',
    color: '#151515',
    textAlign: 'center',
    letterSpacing: -1.55,
    maxWidth: 332,
    marginBottom: 18,
  },
  titlePet: {
    color: '#f7f8f6',
    fontSize: 56,
    lineHeight: 62,
    maxWidth: 340,
    marginBottom: 14,
    letterSpacing: -1.8,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 24,
    lineHeight: 31,
    color: '#474542',
    textAlign: 'center',
    maxWidth: 330,
    fontWeight: '500',
  },
  subtitlePet: {
    color: 'rgba(245, 245, 242, 0.84)',
    fontSize: 22,
    lineHeight: 28,
    maxWidth: 320,
  },
  journeyBlock: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: 18,
    zIndex: 2,
  },
  journeyTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: -1.15,
    maxWidth: 290,
  },
  journeySubtitle: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    color: '#4f4d4a',
    textAlign: 'center',
    maxWidth: 266,
  },
  journeyList: {
    width: '100%',
    marginTop: 34,
    gap: 24,
    alignItems: 'center',
  },
  journeyItem: {
    alignItems: 'center',
    gap: 8,
  },
  journeyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  journeyItemTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: '#2d2d2d',
    textAlign: 'center',
  },
  journeyItemMeta: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '500',
    color: '#6a6762',
    textAlign: 'center',
  },
  footer: {
    gap: 14,
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
    backgroundColor: 'rgba(142, 140, 136, 0.34)',
  },
  progressDotActive: {
    width: 22,
    backgroundColor: '#8ccbb0',
  },
  primaryButtonWrap: {
    borderRadius: 26,
    shadowColor: '#67a6a3',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPet: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    shadowColor: '#dce7da',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  primaryButtonLabelPet: {
    color: 'rgba(247, 249, 244, 0.96)',
  },
  maybeLaterText: {
    marginTop: 6,
    textAlign: 'center',
    color: 'rgba(244, 246, 241, 0.82)',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});
