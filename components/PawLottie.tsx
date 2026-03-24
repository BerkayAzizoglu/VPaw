/**
 * PawLottie — animated paw print for empty states.
 *
 * Usage:
 *   <PawLottie />          // default 80×80
 *   <PawLottie size={100} />
 */

import React from 'react';
import LottieView from 'lottie-react-native';

interface Props {
  size?: number;
}

export default function PawLottie({ size = 80 }: Props) {
  return (
    <LottieView
      source={require('../assets/animations/paw-pulse.json')}
      autoPlay
      loop
      style={{ width: size, height: size }}
    />
  );
}
