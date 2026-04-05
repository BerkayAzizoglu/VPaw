import React from 'react';
import { Animated, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

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
  centerLogoSource?: ImageSourcePropType;
  centerLogoWidth?: number;
  centerLogoHeight?: number;
  centerLogoOffsetY?: number;
  titleVariant?: 'default' | 'hub';
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
  centerLogoSource,
  centerLogoWidth = 102,
  centerLogoHeight = 102,
  centerLogoOffsetY = 0,
  titleVariant = 'default',
}: StickyBlurTopBarProps) {
  const shouldRevealCenterLogo = Boolean(centerLogoSource);
  const topBarHeight = topInset + (shouldRevealCenterLogo ? 56 : STICKY_HEADER_CONTENT_HEIGHT);
  const topChromeHeight = topInset + (shouldRevealCenterLogo ? 58 : STICKY_HEADER_BUTTON_SIZE + 12);
  const topChromeOpacity = scrollY.interpolate({
    inputRange: [0, 8, 72],
    outputRange: [0, 0.52, 1],
    extrapolate: 'clamp',
  });
  const titleOpacity = shouldRevealCenterLogo
    ? scrollY.interpolate({
      inputRange: [0, 8, 36, 84],
      outputRange: [1, 0.88, 0.3, 0],
      extrapolate: 'clamp',
    })
    : 1;
  const titleTranslateX = shouldRevealCenterLogo
    ? scrollY.interpolate({
      inputRange: [0, 46, 120],
      outputRange: [0, -3, -9],
      extrapolate: 'clamp',
    })
    : 0;
  const centerLogoOpacity = shouldRevealCenterLogo
    ? scrollY.interpolate({
      inputRange: [0, 2, 10, 32],
      outputRange: [0, 0.45, 0.86, 1],
      extrapolate: 'clamp',
    })
    : 0;
  const centerLogoScale = shouldRevealCenterLogo
    ? scrollY.interpolate({
      inputRange: [0, 30, 100],
      outputRange: [0.95, 0.985, 1],
      extrapolate: 'clamp',
    })
    : 1;
  const centerLogoTranslateY = shouldRevealCenterLogo
    ? scrollY.interpolate({
      inputRange: [0, 12, 42],
      outputRange: [-4, -1, 0],
      extrapolate: 'clamp',
    })
    : 0;

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

      <View style={[styles.topBarRow, { height: topBarHeight + 2, paddingTop: topInset + (shouldRevealCenterLogo ? 2 : 3) }]}>
        <View style={styles.topBarSide}>{leftSlot}</View>
        <View style={[styles.topBarTitleWrap, (shouldRevealCenterLogo || titleVariant === 'hub') ? styles.topBarTitleWrapReveal : null]}>
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.topBarTitle,
              (shouldRevealCenterLogo || titleVariant === 'hub') ? styles.topBarTitleReveal : null,
              { color: titleColor, opacity: titleOpacity, transform: [{ translateX: titleTranslateX }] },
            ]}
          >
            {title}
          </Animated.Text>
        </View>
        <View style={[styles.topBarSide, styles.topBarSideRight]}>
          {rightSlot ?? <View style={styles.iconGhost} />}
        </View>
      </View>

      {shouldRevealCenterLogo ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.centerLogoWrap,
            {
              top: topInset + 2,
              height: 56,
              opacity: centerLogoOpacity,
              transform: [{ translateY: centerLogoTranslateY }, { scale: centerLogoScale }],
            },
          ]}
        >
          <Animated.Image
            source={centerLogoSource}
            resizeMode="contain"
            style={[
              styles.centerLogo,
              {
                width: centerLogoWidth,
                height: centerLogoHeight,
                marginTop: centerLogoOffsetY,
              },
            ]}
          />
        </Animated.View>
      ) : null}
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
    zIndex: 1,
  },
  topBarTitleWrapReveal: {
    alignItems: 'flex-start',
  },
  topBarTitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 1.35,
    maxWidth: '100%',
  },
  topBarTitleReveal: {
    textAlign: 'left',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  centerLogo: {
    opacity: 0.98,
    shadowColor: '#0f2019',
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 9,
  },
  centerLogoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  iconGhost: {
    width: STICKY_HEADER_BUTTON_SIZE,
    height: STICKY_HEADER_BUTTON_SIZE,
  },
});
