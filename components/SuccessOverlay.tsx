/**
 * SuccessOverlay — brief fullscreen success flash.
 *
 * Usage (imperative ref):
 *   const overlayRef = useRef<SuccessOverlayHandle>(null);
 *   overlayRef.current?.show();
 *
 *   <SuccessOverlay ref={overlayRef} />
 */

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';

// ─── Public handle ────────────────────────────────────────────────────────────

export interface SuccessOverlayHandle {
  show(): void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SuccessOverlay = forwardRef<SuccessOverlayHandle>(function SuccessOverlay(_, ref) {
  const [visible, setVisible] = useState(false);
  const opacity   = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef<LottieView>(null);

  useImperativeHandle(ref, () => ({
    show() {
      setVisible(true);
      opacity.setValue(0);

      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();

      // Play animation
      setTimeout(() => lottieRef.current?.play(), 60);

      // Fade out and hide
      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 1300);
    },
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={styles.card}>
        <LottieView
          ref={lottieRef}
          source={require('../assets/animations/success-check.json')}
          autoPlay={false}
          loop={false}
          style={styles.lottie}
        />
      </View>
    </Animated.View>
  );
});

export default SuccessOverlay;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    width: 140,
    height: 140,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#30332e',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  lottie: {
    width: 110,
    height: 110,
  },
});
