import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw } from 'lucide-react-native';

export const STICKY_HEADER_BUTTON_SIZE = 42;
export const STICKY_HEADER_CONTENT_HEIGHT = 64;

export function getStickyHeaderContentTop(topInset: number) {
  return topInset + STICKY_HEADER_CONTENT_HEIGHT + 12;
}

type StickyBlurTopBarProps = {
  title: string;
  topInset: number;
  scrollY: Animated.Value;
  leftSlot: React.ReactNode;
  rightSlot?: React.ReactNode;
  titleColor?: string;
  overlayColors?: [string, string, string, string];
  borderColor?: string;
};

export default function StickyBlurTopBar({
  title,
  topInset,
  scrollY,
  leftSlot,
  rightSlot,
  titleColor = '#1f3f3b',
  overlayColors = ['rgba(246,244,240,0.95)', 'rgba(246,244,240,0.76)', 'rgba(246,244,240,0.3)', 'rgba(246,244,240,0)'],
  borderColor = 'rgba(115,139,134,0.2)',
}: StickyBlurTopBarProps) {
  const topBarHeight = topInset + STICKY_HEADER_CONTENT_HEIGHT;
  const topChromeHeight = topInset + STICKY_HEADER_BUTTON_SIZE + 12;
  const topChromeOpacity = scrollY.interpolate({
    inputRange: [0, 8, 72],
    outputRange: [0, 0.52, 1],
    extrapolate: 'clamp',
  });

  return (
    <View pointerEvents="box-none" style={styles.topChrome}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.topChromeSurface,
          {
            height: topChromeHeight,
            opacity: topChromeOpacity,
            borderBottomColor: borderColor,
          },
        ]}
      >
        <BlurView intensity={44} tint="light" style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={overlayColors}
          locations={[0, 0.48, 0.78, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <View style={[styles.topBarRow, { height: topBarHeight + 2, paddingTop: topInset + 3 }]}>
        <View style={styles.topBarSide}>{leftSlot}</View>
        <View style={styles.topBarTitleWrap}>
          <Text numberOfLines={1} style={[styles.topBarTitle, { color: titleColor }]}>
            {title}
          </Text>
          <View style={styles.titleAccent}>
            <RefreshCw size={10} color={titleColor} strokeWidth={2.2} />
          </View>
        </View>
        <View style={[styles.topBarSide, styles.topBarSideRight]}>
          {rightSlot ?? <View style={styles.iconGhost} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  topChromeSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarSide: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  topBarSideRight: {
    alignItems: 'flex-end',
  },
  topBarTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  topBarTitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 1.35,
    maxWidth: '100%',
  },
  titleAccent: {
    minWidth: 24,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(115,139,134,0.16)',
  },
  iconGhost: {
    width: STICKY_HEADER_BUTTON_SIZE,
    height: STICKY_HEADER_BUTTON_SIZE,
  },
});
