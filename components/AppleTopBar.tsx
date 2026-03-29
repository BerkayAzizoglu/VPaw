import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppleTopBarProps = {
  title: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  blurIntensity?: number;
  backgroundColor?: string;
};

export function TopBarCircleButton({
  onPress,
  children,
}: {
  onPress?: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}>
      {children}
    </Pressable>
  );
}

export default function AppleTopBar({
  title,
  onBack,
  rightSlot,
  blurIntensity = 26,
  backgroundColor = 'rgba(246, 244, 240, 0.72)',
}: AppleTopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <BlurView intensity={blurIntensity} tint="light" style={[styles.blur, { paddingTop: insets.top + 2, backgroundColor }]}>
        <View style={styles.row}>
          <View style={styles.side}>
            {onBack ? (
              <TopBarCircleButton onPress={onBack}>
                <ChevronLeft size={19} color="#4d635f" strokeWidth={2.2} />
              </TopBarCircleButton>
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>

          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>

          <View style={[styles.side, styles.sideRight]}>
            {rightSlot ?? <View style={styles.placeholder} />}
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  blur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(138, 149, 145, 0.16)',
  },
  row: {
    height: 54,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 42,
    height: 42,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(103, 119, 114, 0.10)',
    shadowColor: '#60736d',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  circleButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: '#224641',
    letterSpacing: -0.28,
    paddingHorizontal: 10,
  },
});
