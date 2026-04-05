import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type PullRefreshIndicatorProps = {
  spinning?: boolean;
  size?: number;
};

const TICK_COUNT = 12;

export default function PullRefreshIndicator({ spinning = true, size = 30 }: PullRefreshIndicatorProps) {
  const spin = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!spinning) {
      spin.stopAnimation(() => spin.setValue(0));
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 760,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, spinning]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const shellSize = size + 8;
  const center = size / 2;
  const orbitRadius = size * 0.34;
  const dotRadius = Math.max(1.35, size * 0.055);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: shellSize,
            height: shellSize,
            borderRadius: shellSize / 2,
            transform: [{ rotate }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
          {Array.from({ length: TICK_COUNT }).map((_, idx) => {
            const angle = (Math.PI * 2 * idx) / TICK_COUNT - Math.PI / 2;
            const x = center + orbitRadius * Math.cos(angle);
            const y = center + orbitRadius * Math.sin(angle);
            const alpha = 0.2 + (idx / (TICK_COUNT - 1)) * 0.74;
            return (
              <Circle
                key={`tick-${idx}`}
                cx={x}
                cy={y}
                r={dotRadius}
                fill={`rgba(95,103,114,${alpha.toFixed(3)})`}
              />
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  spinner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});
