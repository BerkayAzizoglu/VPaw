import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export default function BackgroundBlobs() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 375 812"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="bgVerticalBase" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor="#000046" stopOpacity="1" />
            <Stop offset="100%" stopColor="#1CB5E0" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="375" height="812" fill="url(#bgVerticalBase)" />
      </Svg>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 375 812"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Top lavender blob */}
          <RadialGradient id="bgLavender" cx="35%" cy="0%" r="65%" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#9686A8" stopOpacity="0.70" />
            <Stop offset="55%" stopColor="#9686A8" stopOpacity="0.20" />
            <Stop offset="100%" stopColor="#9686A8" stopOpacity="0" />
          </RadialGradient>
          {/* Center aqua blob */}
          <RadialGradient id="bgAqua" cx="58%" cy="42%" r="55%" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#6ED7D0" stopOpacity="0.72" />
            <Stop offset="50%" stopColor="#6ED7D0" stopOpacity="0.28" />
            <Stop offset="100%" stopColor="#6ED7D0" stopOpacity="0" />
          </RadialGradient>
          {/* Bottom-left mint blob */}
          <RadialGradient id="bgMint" cx="10%" cy="85%" r="60%" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#A3E8CF" stopOpacity="0.68" />
            <Stop offset="55%" stopColor="#A3E8CF" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#A3E8CF" stopOpacity="0" />
          </RadialGradient>
          {/* Bottom-right powder pink blob */}
          <RadialGradient id="bgPowder" cx="90%" cy="88%" r="55%" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#EACBD2" stopOpacity="0.75" />
            <Stop offset="50%" stopColor="#EACBD2" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#EACBD2" stopOpacity="0" />
          </RadialGradient>
          {/* Center bright highlight */}
          <RadialGradient id="bgHighlight" cx="50%" cy="52%" r="28%" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="375" height="812" fill="url(#bgLavender)" />
        <Rect x="0" y="0" width="375" height="812" fill="url(#bgAqua)" />
        <Rect x="0" y="0" width="375" height="812" fill="url(#bgMint)" />
        <Rect x="0" y="0" width="375" height="812" fill="url(#bgPowder)" />
        <Rect x="0" y="0" width="375" height="812" fill="url(#bgHighlight)" />
      </Svg>
    </View>
  );
}
