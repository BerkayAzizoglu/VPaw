import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type HeroStat = {
  label: string;
  value: string;
};

type HeroInfoCardProps = {
  title: string;
  body: string;
  supporting?: string;
  stats?: HeroStat[];
};

const ECG_PATH = 'M2.5 13.2H8.1L10.2 8.5L13.1 16L15.1 11.5H21.5';
const DASH_LENGTH = 34;
const AnimatedPath = Animated.createAnimatedComponent(Path);

function EcgPulseIcon() {
  const dashOffset = useRef(new Animated.Value(DASH_LENGTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const drawAndFade = () =>
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(dashOffset, { toValue: 0, duration: 650, useNativeDriver: true }),
        Animated.delay(160),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(dashOffset, { toValue: DASH_LENGTH, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(140),
      ]);

    const drawAndStay = () =>
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(dashOffset, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]);

    Animated.sequence([
      Animated.delay(600),
      drawAndFade(),
      Animated.delay(260),
      drawAndFade(),
      Animated.delay(260),
      drawAndStay(),
    ]).start();
  }, [dashOffset, opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <AnimatedPath
          d={ECG_PATH}
          stroke="#0A8EA1"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={DASH_LENGTH}
          strokeDashoffset={dashOffset}
        />
      </Svg>
    </Animated.View>
  );
}

function StatPill({ label, value }: HeroStat) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HeroInfoCard({ title, body, supporting, stats = [] }: HeroInfoCardProps) {
  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.glassFill}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="heroGlassFill" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.78)" />
              <Stop offset="52%" stopColor="rgba(255,255,255,0.60)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0.46)" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#heroGlassFill)" />
        </Svg>
      </View>
      <View pointerEvents="none" style={styles.topSheen} />
      <View style={styles.iconWrap}>
        <EcgPulseIcon />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {supporting ? <Text style={styles.supporting}>{supporting}</Text> : null}
      {stats.length > 0 ? (
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <StatPill key={`${stat.label}-${stat.value}`} label={stat.label} value={stat.value} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.86)',
    shadowColor: '#5D7B97',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 1.4,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  iconWrap: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    maxWidth: '84%',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    color: '#0F2131',
    letterSpacing: -0.5,
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: 'rgba(15,33,49,0.76)',
  },
  supporting: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: 'rgba(15,33,49,0.6)',
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    color: '#0D6F89',
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: 'rgba(13,111,137,0.8)',
  },
});
