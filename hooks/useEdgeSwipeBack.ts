import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder } from 'react-native';

type UseEdgeSwipeBackParams = {
  onBack: () => void;
  enabled?: boolean;
  edgeWidth?: number;
  triggerDx?: number;
  maxDy?: number;
  fullScreenGestureEnabled?: boolean;
};

export function useEdgeSwipeBack({
  onBack,
  enabled = true,
  edgeWidth = 28,
  triggerDx = 64,
  maxDy = 36,
  fullScreenGestureEnabled = true,
}: UseEdgeSwipeBackParams) {
  const hasTriggeredRef = useRef(false);
  const navigatingRef = useRef(false);
  const onBackRef = useRef(onBack);
  const translateX = useRef(new Animated.Value(0)).current;
  const enterProgress = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    enterProgress.setValue(0);
    Animated.timing(enterProgress, {
      toValue: 1,
      duration: 240,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [enterProgress]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gesture) => {
          if (!enabled) return false;
          const startX = evt.nativeEvent.pageX ?? gesture.moveX;
          const startsFromLeftEdge = fullScreenGestureEnabled ? true : startX <= edgeWidth;
          const enoughHorizontalIntent = gesture.dx > 8;
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

          const hasVelocityIntent = gesture.vx >= 0.65 && gesture.dx >= 22;
          const shouldGoBack = (gesture.dx >= triggerDx || hasVelocityIntent) && Math.abs(gesture.dy) < maxDy;
          if (shouldGoBack && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            navigatingRef.current = true;
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: 190,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) {
                onBackRef.current();
              }
              translateX.setValue(0);
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
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [edgeWidth, enabled, fullScreenGestureEnabled, maxDy, screenWidth, translateX, triggerDx],
  );

  const parallax = translateX.interpolate({
    inputRange: [0, screenWidth],
    outputRange: [0, 14],
    extrapolate: 'clamp',
  });

  const enterTranslateX = enterProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
    extrapolate: 'clamp',
  });

  const enterOpacity = enterProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
    extrapolate: 'clamp',
  });

  return {
    panHandlers: responder.panHandlers,
    frontLayerStyle: {
      transform: [{ translateX: Animated.add(translateX, enterTranslateX) }],
      opacity: enterOpacity,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: -2, height: 0 },
      elevation: 10,
      backgroundColor: '#faf8f5',
    } as const,
    backLayerStyle: {
      transform: [{ translateX: Animated.multiply(parallax, -1) }],
    } as const,
    isSwiping,
  };
}
