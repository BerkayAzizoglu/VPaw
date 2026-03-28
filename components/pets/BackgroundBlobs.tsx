import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export default function BackgroundBlobs() {
  return (
    <View pointerEvents="none" style={styles.fill}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 375 812"
        preserveAspectRatio="xMidYMid slice"
        style={styles.fill}
      >
        <Defs>
          <LinearGradient id="bgVerticalBase" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor="#78BFBD" stopOpacity="1" />
            <Stop offset="100%" stopColor="#F2F5CE" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="375" height="812" fill="url(#bgVerticalBase)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
