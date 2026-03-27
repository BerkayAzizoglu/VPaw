import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type HeroInfoCardProps = {
  title: string;
  body: string;
};

const ECG_PATH = 'M2.5 13.2H8.1L10.2 8.5L13.1 16L15.1 11.5H21.5';
const DASH_LENGTH = 32;

const AnimatedPath = Animated.createAnimatedComponent(Path);

function EcgIcon() {
  const dashOffset = useRef(new Animated.Value(DASH_LENGTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Cycle 1 & 2: draw → hold → fade → reset
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

    // Cycle 3: draw → hold → stays visible forever
    const drawAndStay = () =>
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(dashOffset, { toValue: 0, duration: 650, useNativeDriver: true }),
        // done — stays at dashOffset=0, opacity=1
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
      <Svg width={46} height={46} viewBox="0 0 24 24" fill="none">
        <AnimatedPath
          d={ECG_PATH}
          stroke="#0EB4A8"
          strokeWidth={2.0}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={DASH_LENGTH}
          strokeDashoffset={dashOffset}
        />
      </Svg>
    </Animated.View>
  );
}

export default function HeroInfoCard({ title, body }: HeroInfoCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <EcgIcon />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    shadowColor: '#7080A0',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  iconWrap: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  title: {
    maxWidth: '78%',
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '800',
    color: '#141820',
    letterSpacing: -0.6,
  },
  body: {
    marginTop: 10,
    maxWidth: '94%',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    color: 'rgba(20,24,32,0.62)',
  },
});
