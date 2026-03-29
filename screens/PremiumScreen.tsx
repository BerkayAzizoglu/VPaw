import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';

type PremiumScreenProps = {
  onBack: () => void;
  onUpgrade: () => void;
};

type FeatureIcon = 'pets' | 'shield' | 'passport' | 'ai' | 'reminder';

type CompareRow = {
  label: string;
  free: string | 'dot';
  pro: string | 'check';
  proAccent?: boolean;
};

function PremiumIcon({ name, size = 20, color = '#c48d42' }: { name: FeatureIcon | 'sparkles' | 'check' | 'back'; size?: number; color?: string }) {
  if (name === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'sparkles') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3L13.5 7.5L18 9L13.5 10.5L12 15L10.5 10.5L6 9L10.5 7.5L12 3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M18.5 3.5L19.2 5.3L21 6L19.2 6.7L18.5 8.5L17.8 6.7L16 6L17.8 5.3L18.5 3.5Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'pets') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="8" cy="8" r="2.2" stroke={color} strokeWidth={1.8} />
        <Circle cx="16" cy="8" r="2.2" stroke={color} strokeWidth={1.8} />
        <Path d="M4.8 18.2C5.9 15.8 8 14.5 12 14.5C16 14.5 18.1 15.8 19.2 18.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'shield') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3.8L18 6.1V11.3C18 15 15.5 18 12 20.2C8.5 18 6 15 6 11.3V6.1L12 3.8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'passport') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 4.8H15.5L19 8.2V19.2H7V4.8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M15.5 4.8V8.2H19" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M9.5 12H16.2M9.5 15.2H16.2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'ai') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 13.2C6.4 13.2 6.8 9.4 9.2 9.4C11.1 9.4 11.6 15.2 13.5 15.2C15.2 15.2 15.6 11.8 18 11.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="4" cy="13.2" r="1.2" fill={color} />
        <Circle cx="18" cy="11.8" r="1.2" fill={color} />
      </Svg>
    );
  }

  if (name === 'reminder') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7.4 16.8H16.6C15.8 15.9 15.2 14.8 15.2 12.6V10.8C15.2 8.9 13.7 7.4 11.8 7.4C9.9 7.4 8.4 8.9 8.4 10.8V12.6C8.4 14.8 7.8 15.9 7.4 16.8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M10.5 18.2C10.8 19 11.3 19.4 11.8 19.4C12.3 19.4 12.8 19 13.1 18.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 12L10.1 15.3L17.5 8.2" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FeatureCard({ item }: { item: { title: string; desc: string; icon: FeatureIcon; tall?: boolean } }) {
  return (
    <View style={[styles.featureCard, item.tall && styles.featureCardTall]}>
      <View style={styles.featureIconWrap}>
        <PremiumIcon name={item.icon} size={20} />
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={[styles.featureDesc, item.tall && styles.featureDescTall]}>{item.desc}</Text>
      </View>
    </View>
  );
}

function Dot() {
  return <View style={styles.dot} />;
}

function CheckPill() {
  return (
    <View style={styles.checkPill}>
      <PremiumIcon name="check" size={12} color="#c48d42" />
    </View>
  );
}

function SceneTree({
  x,
  baseY,
  scale = 1,
  sway,
  delay = 0,
  depth = 'front',
}: {
  x: number;
  baseY: number;
  scale?: number;
  sway: Animated.Value;
  delay?: number;
  depth?: 'front' | 'back';
}) {
  const translateX = sway.interpolate({
    inputRange: [0, 1],
    outputRange: [depth === 'front' ? -3 - delay * 0.2 : -1.5, depth === 'front' ? 3 + delay * 0.2 : 1.5],
  });
  const rotate = sway.interpolate({
    inputRange: [0, 1],
    outputRange: [depth === 'front' ? '-1.6deg' : '-0.9deg', depth === 'front' ? '1.6deg' : '0.9deg'],
  });

  return (
    <Animated.View
      style={[
        styles.sceneTreeWrap,
        {
          left: x,
          bottom: baseY,
          transform: [{ translateX }, { rotate }, { scale }],
          opacity: depth === 'front' ? 1 : 0.72,
        },
      ]}
    >
      <View style={[styles.sceneTreeTrunk, depth === 'back' && styles.sceneTreeTrunkBack]} />
      <View style={[styles.sceneTreeCanopyLarge, depth === 'back' && styles.sceneTreeCanopyLargeBack]} />
      <View style={[styles.sceneTreeCanopyMid, depth === 'back' && styles.sceneTreeCanopyMidBack]} />
      <View style={[styles.sceneTreeCanopySmall, depth === 'back' && styles.sceneTreeCanopySmallBack]} />
    </Animated.View>
  );
}

function ScenePets({ drift }: { drift: Animated.Value }) {
  const petShift = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-1.5, 1.5],
  });
  const petLift = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1.8],
  });
  const dogTail = drift.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '7deg'],
  });

  return (
    <Animated.View style={[styles.scenePetsWrap, { transform: [{ translateX: petShift }, { translateY: petLift }] }]}>
      <Svg width={138} height={92} viewBox="0 0 138 92" fill="none">
        <Path d="M14 82C18 61 30 48 45 47C60 46 69 59 69 78V82H14Z" fill="#3d3227" />
        <Circle cx="50" cy="34" r="13" fill="#3d3227" />
        <Path d="M40 26L46 14L52 26" fill="#3d3227" />
        <Path d="M48 25L56 16L58 28" fill="#3d3227" />
        <Path d="M29 74C30 84 38 88 45 88C52 88 60 84 61 74" stroke="#6b5a48" strokeWidth={3} strokeLinecap="round" />

        <Path d="M77 82C79 55 92 42 109 42C123 42 132 53 131 82H77Z" fill="#47392c" />
        <Circle cx="108" cy="29" r="12" fill="#47392c" />
        <Path d="M98 23L102 9L110 22" fill="#47392c" />
        <Path d="M114 22L121 11L120 25" fill="#47392c" />
        <Path d="M88 74C89 84 97 88 104 88C112 88 120 84 121 74" stroke="#74614d" strokeWidth={3} strokeLinecap="round" />
      </Svg>
      <Animated.View style={[styles.sceneDogTail, { transform: [{ rotate: dogTail }] }]} />
    </Animated.View>
  );
}

function PremiumHeroScene() {
  const sway = React.useRef(new Animated.Value(0)).current;
  const drift = React.useRef(new Animated.Value(0)).current;
  const glow = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 2900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 2900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    swayLoop.start();
    driftLoop.start();
    glowLoop.start();
    return () => {
      swayLoop.stop();
      driftLoop.stop();
      glowLoop.stop();
    };
  }, [drift, glow, sway]);

  const sunScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const sunOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.52, 0.8],
  });
  const beamOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.34],
  });

  return (
    <View style={styles.heroImage}>
      <ExpoLinearGradient
        colors={['#6a8d52', '#6ea04f', '#87aa5d', '#d2a25d']}
        locations={[0, 0.34, 0.7, 1]}
        start={{ x: 0.05, y: 0.15 }}
        end={{ x: 0.95, y: 0.85 }}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.sceneSunGlow, { opacity: sunOpacity, transform: [{ scale: sunScale }] }]} />
      <Animated.View style={[styles.sceneSunBeamWide, { opacity: beamOpacity }]} />
      <Animated.View style={[styles.sceneSunBeamNarrow, { opacity: beamOpacity }]} />

      <View style={styles.sceneHillBack} />
      <View style={styles.sceneHillMid} />
      <View style={styles.sceneMeadow} />

      <SceneTree x={-6} baseY={126} scale={1.28} sway={sway} depth="front" />
      <SceneTree x={28} baseY={150} scale={0.94} sway={sway} delay={2} depth="back" />
      <SceneTree x={250} baseY={130} scale={1.22} sway={sway} delay={1} depth="front" />
      <SceneTree x={286} baseY={150} scale={0.9} sway={sway} delay={3} depth="back" />

      <View style={styles.sceneRoadWrap}>
        <View style={styles.sceneRoad} />
        <View style={styles.sceneRoadLine} />
      </View>

      <ScenePets drift={drift} />

      <View style={styles.sceneVignetteTop} />
      <View style={styles.sceneVignetteBottom} />
    </View>
  );
}

export default function PremiumScreen({ onBack, onUpgrade }: PremiumScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).premium;
  const features: Array<{ title: string; desc: string; icon: FeatureIcon; tall?: boolean }> = [
    { title: copy.features.unlimitedPetsTitle, desc: copy.features.unlimitedPetsDesc, icon: 'pets' },
    { title: copy.features.fullHealthTitle, desc: copy.features.fullHealthDesc, icon: 'shield' },
    { title: copy.features.pdfPassportTitle, desc: copy.features.pdfPassportDesc, icon: 'passport' },
    { title: copy.features.aiTitle, desc: copy.features.aiDesc, icon: 'ai', tall: true },
    { title: copy.features.remindersTitle, desc: copy.features.remindersDesc, icon: 'reminder' },
  ];

  const swipePanResponder = useEdgeSwipeBack({ onBack, fullScreenGestureEnabled: false });

  const comparisonRows: CompareRow[] = [
    { label: copy.table.petProfiles, free: copy.table.one, pro: copy.table.unlimited, proAccent: true },
    { label: copy.table.healthRecords, free: copy.table.threeMonths, pro: copy.table.lifetime, proAccent: true },
    { label: copy.table.pdfExport, free: 'dot', pro: 'check' },
    { label: copy.table.aiInsights, free: 'dot', pro: 'check' },
  ];

  return (
    <View style={styles.screen} {...swipePanResponder.panHandlers}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <PremiumHeroScene />

        <View style={styles.mainContent}>
          <View style={styles.badge}>
            <PremiumIcon name="sparkles" size={12} color="#c48d42" />
            <Text style={styles.badgeText}>{copy.badge}</Text>
          </View>

          <Text style={styles.heading}>{copy.heading}</Text>
          <Text style={styles.subHeading}>{copy.subheading}</Text>

          <View style={styles.featureList}>
            {features.map((item) => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </View>

          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={styles.headerSpacer} />
              <Text style={styles.freeHeader}>{copy.table.free}</Text>
              <View style={styles.proHeaderWrap}>
                <PremiumIcon name="sparkles" size={10} color="#c48d42" />
                <Text style={styles.proHeader}>{copy.table.pro}</Text>
              </View>
            </View>

            {comparisonRows.map((row, idx) => (
              <View key={row.label} style={[styles.tableRow, idx !== comparisonRows.length - 1 && styles.tableRowBorder]}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <View style={styles.rowCellCenter}>
                  {row.free === 'dot' ? <Dot /> : <Text style={styles.freeCellText}>{row.free}</Text>}
                </View>
                <View style={styles.rowCellCenter}>
                  {row.pro === 'check' ? <CheckPill /> : <Text style={[styles.proCellText, row.proAccent && styles.proAccent]}>{row.pro}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Pressable style={styles.backButton} onPress={onBack}>
        <PremiumIcon name="back" size={22} color="#ffffff" />
      </Pressable>

      <View pointerEvents="box-none" style={styles.bottomOverlay}>
        <View style={styles.bottomGradient} />
        <Pressable style={styles.upgradeBtn} onPress={onUpgrade}>
          <PremiumIcon name="sparkles" size={18} color="#faf8f5" />
          <Text style={styles.upgradeText}>{copy.upgrade}</Text>
        </Pressable>
        <Pressable onPress={onBack}>
          <Text style={styles.maybeLater}>{copy.maybeLater}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },
  content: {
    paddingBottom: 170,
  },
  heroImage: {
    height: 384,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#7aa05e',
  },
  sceneSunGlow: {
    position: 'absolute',
    top: 58,
    right: 56,
    width: 208,
    height: 208,
    borderRadius: 104,
    backgroundColor: 'rgba(255, 191, 101, 0.58)',
    shadowColor: '#ffcb7d',
    shadowOpacity: 0.42,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 0 },
  },
  sceneSunBeamWide: {
    position: 'absolute',
    top: -24,
    right: 56,
    width: 188,
    height: 430,
    backgroundColor: 'rgba(255, 230, 164, 0.18)',
    transform: [{ rotate: '16deg' }],
  },
  sceneSunBeamNarrow: {
    position: 'absolute',
    top: -10,
    right: 118,
    width: 90,
    height: 420,
    backgroundColor: 'rgba(255, 245, 214, 0.18)',
    transform: [{ rotate: '11deg' }],
  },
  sceneHillBack: {
    position: 'absolute',
    left: -24,
    right: -24,
    bottom: 118,
    height: 120,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 140,
    backgroundColor: 'rgba(87, 122, 57, 0.52)',
  },
  sceneHillMid: {
    position: 'absolute',
    left: -12,
    right: -12,
    bottom: 90,
    height: 118,
    borderTopLeftRadius: 110,
    borderTopRightRadius: 132,
    backgroundColor: 'rgba(96, 137, 63, 0.76)',
  },
  sceneMeadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: '#5f8c49',
  },
  sceneTreeWrap: {
    position: 'absolute',
    width: 84,
    height: 170,
    alignItems: 'center',
  },
  sceneTreeTrunk: {
    position: 'absolute',
    bottom: 0,
    width: 14,
    height: 62,
    borderRadius: 8,
    backgroundColor: '#675138',
  },
  sceneTreeTrunkBack: {
    backgroundColor: '#70583c',
  },
  sceneTreeCanopyLarge: {
    position: 'absolute',
    bottom: 38,
    width: 82,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#3f7035',
  },
  sceneTreeCanopyLargeBack: {
    backgroundColor: '#5b8a48',
  },
  sceneTreeCanopyMid: {
    position: 'absolute',
    bottom: 72,
    left: 10,
    width: 62,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#467938',
  },
  sceneTreeCanopyMidBack: {
    backgroundColor: '#689c54',
  },
  sceneTreeCanopySmall: {
    position: 'absolute',
    bottom: 96,
    left: 24,
    width: 36,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6ca54d',
  },
  sceneTreeCanopySmallBack: {
    backgroundColor: '#8aba66',
  },
  sceneRoadWrap: {
    position: 'absolute',
    left: '50%',
    bottom: -2,
    marginLeft: -90,
    width: 180,
    height: 150,
    alignItems: 'center',
  },
  sceneRoad: {
    width: 180,
    height: 150,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: '#826347',
    transform: [{ perspective: 400 }, { rotateX: '66deg' }],
  },
  sceneRoadLine: {
    position: 'absolute',
    top: 44,
    width: 8,
    height: 76,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 231, 176, 0.34)',
  },
  scenePetsWrap: {
    position: 'absolute',
    left: '50%',
    bottom: 62,
    marginLeft: -69,
    width: 138,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneDogTail: {
    position: 'absolute',
    right: 0,
    top: 40,
    width: 26,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#47392c',
    transformOrigin: 'left center',
  },
  sceneVignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 92,
    backgroundColor: 'rgba(24, 32, 15, 0.10)',
  },
  sceneVignetteBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 94,
    backgroundColor: 'rgba(32, 40, 21, 0.10)',
  },
  mainContent: {
    marginTop: -80,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  badge: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f2ebd9',
    backgroundColor: '#fcf6ee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 13,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#c48d42',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heading: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 35,
    color: '#2d2d2d',
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subHeading: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    color: '#787878',
    fontWeight: '400',
  },
  featureList: {
    marginTop: 20,
    width: '100%',
    gap: 16,
  },
  featureCard: {
    minHeight: 82,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 17,
    paddingHorizontal: 17,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  featureCardTall: {
    minHeight: 94,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f2ebd9',
    backgroundColor: '#fcf6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
    paddingTop: 4,
  },
  featureTitle: {
    fontSize: 15,
    lineHeight: 19,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  featureDesc: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#787878',
    fontWeight: '400',
  },
  featureDescTall: {
    maxWidth: 196,
  },
  tableCard: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  tableHeader: {
    height: 51,
    backgroundColor: '#faf9f8',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerSpacer: {
    flex: 1.25,
  },
  freeHeader: {
    flex: 0.9,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: '#787878',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  proHeaderWrap: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  proHeader: {
    fontSize: 12,
    lineHeight: 18,
    color: '#c48d42',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tableRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  rowLabel: {
    flex: 1.25,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(45,45,45,0.8)',
    fontWeight: '600',
  },
  rowCellCenter: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeCellText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#787878',
    fontWeight: '500',
  },
  proCellText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#787878',
    fontWeight: '500',
  },
  proAccent: {
    color: '#c48d42',
    fontWeight: '700',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  checkPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f2ebd9',
    backgroundColor: '#fcf6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250,249,248,0.95)',
  },
  upgradeBtn: {
    width: '100%',
    height: 56,
    borderRadius: 100,
    backgroundColor: '#2d2d2d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  upgradeText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#faf8f5',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  maybeLater: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: '#787878',
    fontWeight: '600',
  },
});

