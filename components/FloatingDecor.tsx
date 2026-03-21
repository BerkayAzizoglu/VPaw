import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type DecorType = 'paw' | 'swirl' | 'earArc' | 'petMark' | 'tinyPaw' | 'bone' | 'catSilhouette';

type DecorItem = {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  yFrom: number;
  yTo: number;
  xFrom: number;
  xTo: number;
  flowDuration: number;
  driftDuration: number;
  type: DecorType;
};

type FloatingDecorProps = {
  hideBottomPaw?: boolean;
  hiddenIds?: string[];
  flowDirection?: 'oscillate' | 'down';
};

const { width, height } = Dimensions.get('window');
const TINT = '#cbbda8';

const DECORS: DecorItem[] = [
  { id: 'd1', type: 'paw',           x: width * 0.10, y: height * 0.13, size: 22, opacity: 0.14, yFrom: -14, yTo: 18, xFrom: -4, xTo: 3, flowDuration: 16000, driftDuration: 12000 },
  { id: 'd2', type: 'swirl',         x: width * 0.86, y: height * 0.23, size: 24, opacity: 0.11, yFrom: -10, yTo: 16, xFrom: 2,  xTo: -3, flowDuration: 19000, driftDuration: 15000 },
  { id: 'd3', type: 'bone',          x: width * 0.08, y: height * 0.44, size: 24, opacity: 0.13, yFrom: -16, yTo: 20, xFrom: -3, xTo: 4, flowDuration: 18000, driftDuration: 13000 },
  { id: 'd4', type: 'catSilhouette', x: width * 0.82, y: height * 0.41, size: 24, opacity: 0.12, yFrom: -12, yTo: 16, xFrom: 2,  xTo: -3, flowDuration: 17000, driftDuration: 14000 },
  { id: 'd5', type: 'petMark',       x: width * 0.20, y: height * 0.74, size: 22, opacity: 0.11, yFrom: -10, yTo: 14, xFrom: -2, xTo: 2, flowDuration: 20000, driftDuration: 16000 },
  { id: 'd6', type: 'tinyPaw',       x: width * 0.78, y: height * 0.84, size: 17, opacity: 0.14, yFrom: -10, yTo: 14, xFrom: 2,  xTo: -2, flowDuration: 21000, driftDuration: 17000 },
];

function DecorShape({ type, size }: { type: DecorType; size: number }) {
  if (type === 'paw' || type === 'tinyPaw') {
    const dot = Math.max(3, Math.round(size * 0.2));
    const padW = Math.max(9, Math.round(size * 0.52));
    const padH = Math.max(7, Math.round(size * 0.34));

    return (
      <View style={[styles.shapeBox, { width: size, height: size }]}> 
        <CircleDot w={dot} x={size * 0.22} y={0} />
        <CircleDot w={dot} x={size * 0.52} y={0} />
        <CircleDot w={dot} x={size * 0.06} y={size * 0.28} />
        <CircleDot w={dot} x={size * 0.68} y={size * 0.28} />
        <View
          style={{
            position: 'absolute',
            width: padW,
            height: padH,
            left: (size - padW) / 2,
            bottom: 0,
            borderRadius: 999,
            backgroundColor: TINT,
          }}
        />
      </View>
    );
  }

  if (type === 'bone') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6.2 8.1a2 2 0 1 0-2.8 2.8c.2.2.43.35.68.45a2.1 2.1 0 0 0 0 1.34c-.25.1-.48.25-.68.45a2 2 0 1 0 2.8 2.8c.2-.2.35-.43.45-.68.43.16.9.2 1.34 0l6.7-6.7c.44-.44.4-1.16 0-1.56-.4-.4-1.12-.44-1.56 0l-6.7 6.7a2.1 2.1 0 0 0 0 1.34c-.25.1-.48.25-.68.45a2 2 0 1 0 2.8 2.8c.2-.2.35-.43.45-.68.43.16.9.2 1.34 0l6.7-6.7c.44-.44.4-1.16 0-1.56-.4-.4-1.12-.44-1.56 0l-6.7 6.7a2.1 2.1 0 0 0 0 1.34c-.25.1-.48.25-.68.45a2 2 0 1 0 2.8 2.8"
          stroke={TINT}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (type === 'catSilhouette') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6.2 10.2 9 6.9l2.1 2.4m3.7.9 2.8-3.3 2.1 2.4m-14.1 1.4c0-2.9 2.7-5.2 6-5.2s6 2.3 6 5.2v1.2c0 3.2-2.7 5.8-6 5.8s-6-2.6-6-5.8v-1.2Zm4.6 5.2c.7.4 1.5.6 2.4.6.9 0 1.8-.2 2.5-.7"
          stroke={TINT}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (type === 'swirl') {
    return (
      <View style={[styles.shapeBox, { width: size, height: size }]}> 
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderWidth: 2,
            borderColor: TINT,
            borderRadius: size / 2,
            borderLeftColor: 'transparent',
            borderBottomColor: 'transparent',
            transform: [{ rotate: '18deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: Math.round(size * 0.34),
            height: Math.round(size * 0.34),
            borderWidth: 2,
            borderColor: TINT,
            borderRadius: 999,
            right: -1,
            top: Math.round(size * 0.32),
          }}
        />
      </View>
    );
  }

  if (type === 'earArc') {
    return (
      <View style={[styles.shapeBox, { width: size, height: size }]}> 
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderColor: TINT,
            borderTopRightRadius: size,
            transform: [{ rotate: '-8deg' }],
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.shapeBox, { width: size, height: size }]}> 
      <View style={[styles.petal, { width: Math.round(size * 0.44), height: Math.round(size * 0.44), left: 0, top: 0 }]} />
      <View style={[styles.petal, { width: Math.round(size * 0.44), height: Math.round(size * 0.44), right: 0, top: 0 }]} />
      <View style={[styles.petal, { width: Math.round(size * 0.44), height: Math.round(size * 0.44), left: 0, bottom: 0 }]} />
      <View style={[styles.petal, { width: Math.round(size * 0.44), height: Math.round(size * 0.44), right: 0, bottom: 0 }]} />
    </View>
  );
}

function CircleDot({ w, x, y }: { w: number; x: number; y: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        width: w,
        height: w,
        borderRadius: w / 2,
        backgroundColor: TINT,
        left: x,
        top: y,
      }}
    />
  );
}

export default function FloatingDecor({ hideBottomPaw = false, hiddenIds = [], flowDirection = 'oscillate' }: FloatingDecorProps) {
  const decorList = useMemo(() => {
    const base = hideBottomPaw ? DECORS.filter((item) => item.id !== 'd6') : DECORS;
    return base.filter((item) => !hiddenIds.includes(item.id));
  }, [hideBottomPaw, hiddenIds]);

  const flowValues = useRef(decorList.map(() => new Animated.Value(0))).current;
  const driftValues = useRef(decorList.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = decorList.flatMap((item, idx) => {
      const flow =
        flowDirection === 'down'
          ? Animated.loop(
              Animated.timing(flowValues[idx], {
                toValue: 1,
                duration: item.flowDuration,
                useNativeDriver: true,
              }),
            )
          : Animated.loop(
              Animated.sequence([
                Animated.timing(flowValues[idx], { toValue: 1, duration: item.flowDuration, useNativeDriver: true }),
                Animated.timing(flowValues[idx], { toValue: 0, duration: item.flowDuration, useNativeDriver: true }),
              ]),
            );

      const drift = Animated.loop(
        Animated.sequence([
          Animated.timing(driftValues[idx], { toValue: 1, duration: item.driftDuration, useNativeDriver: true }),
          Animated.timing(driftValues[idx], { toValue: 0, duration: item.driftDuration, useNativeDriver: true }),
        ]),
      );

      flow.start();
      drift.start();
      return [flow, drift];
    });

    return () => loops.forEach((anim) => anim.stop());
  }, [decorList, driftValues, flowDirection, flowValues]);

  return (
    <View pointerEvents="none" style={styles.container}>
      {decorList.map((item, idx) => {
        const translateY = flowValues[idx].interpolate({ inputRange: [0, 1], outputRange: [item.yFrom, item.yTo] });
        const translateX = driftValues[idx].interpolate({ inputRange: [0, 1], outputRange: [item.xFrom, item.xTo] });

        return (
          <Animated.View
            key={item.id}
            style={[
              styles.item,
              {
                top: item.y,
                left: item.x,
                opacity: item.opacity,
                transform: [{ translateY }, { translateX }],
              },
            ]}
          >
            <DecorShape type={item.type} size={item.size} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  item: {
    position: 'absolute',
  },
  shapeBox: {
    position: 'relative',
  },
  petal: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: TINT,
  },
});
