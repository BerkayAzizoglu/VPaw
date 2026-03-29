import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder } from 'react-native';

type UseEdgeSwipeBackParams = {
  onBack: () => void;
  enabled?: boolean;
  edgeWidth?: number;
  triggerDx?: number;
  maxDy?: number;
  fullScreenGestureEnabled?: boolean;
  enterVariant?: 'soft' | 'snappy' | 'drift';
};

export function useEdgeSwipeBack({
  onBack,
  enabled = true,
  edgeWidth = 40,
  triggerDx = 28,
  maxDy = 72,
  fullScreenGestureEnabled = false,
  enterVariant = 'soft',
}: UseEdgeSwipeBackParams) {
  const hasTriggeredRef = useRef(false);
  const navigatingRef = useRef(false);
  const onBackRef = useRef(onBack);
  const translateX = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    // Reset translateX on mount/remount so the screen is never stuck off-screen.
    // Keep entry transition flat to avoid flash/jump between route mounts.
    translateX.setValue(0);
  }, [translateX, enterVariant]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gesture) => {
          if (!enabled) return false;
          const startX = gesture.x0 ?? evt.nativeEvent.pageX ?? gesture.moveX;
          const startsFromLeftEdge = fullScreenGestureEnabled ? true : startX <= edgeWidth;
          const enoughHorizontalIntent = gesture.dx > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25;
          const lowVerticalNoise = Math.abs(gesture.dy) < maxDy;
          return startsFromLeftEdge && enoughHorizontalIntent && lowVerticalNoise;
        },
        onPanResponderGrant: () => {
          if (navigatingRef.current) return;
          hasTriggeredRef.current = false;
          translateX.setValue(0);
          setIsSwiping(true);
        },
        onPanResponderMove: (_evt, gesture) => {
          if (!enabled || navigatingRef.current) return;
          const clamped = Math.max(0, gesture.dx);
          translateX.setValue(clamped);
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (navigatingRef.current) return;
          if (!enabled) {
            translateX.setValue(0);
            return;
          }

          const hasVelocityIntent = gesture.vx >= 0.28 && gesture.dx >= 8;
          const shouldGoBack = (gesture.dx >= triggerDx || hasVelocityIntent) && Math.abs(gesture.dy) < maxDy * 1.25;
          if (shouldGoBack && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            navigatingRef.current = true;
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: 175,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) onBackRef.current();
              // Do NOT reset translateX here — resetting before the route change
              // causes a one-frame flash where the screen briefly re-appears at
              // position 0. The enter useEffect resets translateX on remount.
              hasTriggeredRef.current = false;
              navigatingRef.current = false;
              setIsSwiping(false);
            });
            return;
          }

          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            stiffness: 240,
            damping: 28,
            mass: 0.9,
          }).start();
          hasTriggeredRef.current = false;
          setIsSwiping(false);
        },
        onPanResponderTerminate: () => {
          if (navigatingRef.current) return;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            stiffness: 240,
            damping: 28,
            mass: 0.9,
          }).start();
          hasTriggeredRef.current = false;
          setIsSwiping(false);
        },
        onPanResponderTerminationRequest: () => true,
        onShouldBlockNativeResponder: () => false,
      }),
    [edgeWidth, enabled, fullScreenGestureEnabled, maxDy, screenWidth, translateX, triggerDx],
  );

  // Back layer slides from ~16% behind its final position as the front reveals it,
  // matching the iOS native parallax feel.
  const backReveal = translateX.interpolate({
    inputRange: [0, screenWidth],
    outputRange: [-Math.round(screenWidth * 0.16), 0],
    extrapolate: 'clamp',
  });

  return {
    panHandlers: responder.panHandlers,
    frontLayerStyle: {
      transform: [{ translateX }],
      opacity: 1,
    } as const,
    backLayerStyle: {
      transform: [{ translateX: backReveal }],
    } as const,
    isSwiping,
  };
}
