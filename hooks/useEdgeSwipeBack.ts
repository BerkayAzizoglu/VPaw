import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder } from 'react-native';

type UseEdgeSwipeBackParams = {
  onBack: () => void;
  enabled?: boolean;
  edgeWidth?: number;
  triggerDx?: number;
  maxDy?: number;
};

export function useEdgeSwipeBack({
  onBack,
  enabled = true,
  edgeWidth = 24,
  triggerDx = 70,
  maxDy = 30,
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

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gesture) => {
          if (!enabled) return false;
          const startX = evt.nativeEvent.pageX ?? gesture.moveX;
          const startsFromLeftEdge = startX <= edgeWidth;
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

          const shouldGoBack = gesture.dx >= triggerDx && Math.abs(gesture.dy) < maxDy;
          if (shouldGoBack && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            navigatingRef.current = true;
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: 150,
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
            bounciness: 0,
            speed: 22,
          }).start();
          hasTriggeredRef.current = false;
          setIsSwiping(false);
        },
        onPanResponderTerminate: () => {
          if (navigatingRef.current) return;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 22,
          }).start();
          hasTriggeredRef.current = false;
          setIsSwiping(false);
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [edgeWidth, enabled, maxDy, screenWidth, translateX, triggerDx],
  );

  const parallax = translateX.interpolate({
    inputRange: [0, screenWidth],
    outputRange: [0, 14],
    extrapolate: 'clamp',
  });

  return {
    panHandlers: responder.panHandlers,
    frontLayerStyle: {
      transform: [{ translateX }],
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: -2, height: 0 },
      elevation: 12,
      backgroundColor: '#faf8f5',
    } as const,
    backLayerStyle: {
      transform: [{ translateX: Animated.multiply(parallax, -1) }],
    } as const,
    isSwiping,
  };
}
