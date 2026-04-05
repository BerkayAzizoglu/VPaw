import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type PetListCardProps = {
  name: string;
  meta: string;
  weightValue: number | null;
  updatedLabel?: string | null;
  imageUri?: string;
  completionPercent?: number;
  highlighted?: boolean;
  compact?: boolean;
  onPress: () => void;
};

function InitialAvatar({ name, compact = false }: { name: string; compact?: boolean }) {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  return (
    <View style={[styles.initialAvatar, compact && styles.initialAvatarCompact]}>
      <Text style={[styles.initialText, compact && styles.initialTextCompact]}>{initial}</Text>
    </View>
  );
}

export default function PetListCard({
  name,
  meta,
  weightValue,
  updatedLabel,
  imageUri,
  completionPercent = 0,
  highlighted = false,
  compact = false,
  onPress,
}: PetListCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  const avatarSize = compact ? 74 : 88;
  const ringSize = avatarSize + 10;
  const ringStrokeWidth = 3;
  const ringRectSize = ringSize - ringStrokeWidth;
  const avatarRadius = compact ? 24 : 28;
  const ringCornerRadius = avatarRadius + 4;
  const perimeter = (4 * (ringRectSize - 2 * ringCornerRadius)) + (2 * Math.PI * ringCornerRadius);
  const safePercent = Math.max(0, Math.min(100, completionPercent));
  const progress = perimeter - (safePercent / 100) * perimeter;
  const gradientIdRef = React.useRef(`pet-completion-${Math.random().toString(36).slice(2, 10)}`);
  const gradientId = gradientIdRef.current;
  const progressColors = React.useMemo(() => {
    if (safePercent < 40) {
      return { start: '#8e6d5a', end: '#b08c76', badgeBg: '#f7efe8', badgeText: '#735645' };
    }
    if (safePercent < 75) {
      return { start: '#7d7c57', end: '#a5a270', badgeBg: '#f7f5e8', badgeText: '#68653d' };
    }
    return { start: '#5b8b5f', end: '#8caf73', badgeBg: '#eef7ed', badgeText: '#416747' };
  }, [safePercent]);

  return (
    <Pressable
      onPress={handlePress}
      style={styles.petCardWrap}
    >
      {({ pressed }) => (
        <BlurView
          intensity={18}
          tint="light"
          style={[
            styles.petCard,
            compact && styles.petCardCompactInner,
            highlighted && styles.petCardActive,
            pressed && styles.petCardPressed,
          ]}
        >
          <View pointerEvents="none" style={styles.petCardHighlight} />
          <View style={styles.petCardRow}>
            <View style={[styles.avatarRingWrap, { width: ringSize, height: ringSize }]}>
              <Svg width={ringSize} height={ringSize} style={styles.avatarRingSvg}>
                <Defs>
                  <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={progressColors.start} />
                    <Stop offset="1" stopColor={progressColors.end} />
                  </LinearGradient>
                </Defs>
                <Rect
                  x={ringStrokeWidth / 2}
                  y={ringStrokeWidth / 2}
                  width={ringRectSize}
                  height={ringRectSize}
                  rx={ringCornerRadius}
                  ry={ringCornerRadius}
                  stroke="rgba(104,120,114,0.16)"
                  strokeWidth={ringStrokeWidth}
                  fill="none"
                />
                <Rect
                  x={ringStrokeWidth / 2}
                  y={ringStrokeWidth / 2}
                  width={ringRectSize}
                  height={ringRectSize}
                  rx={ringCornerRadius}
                  ry={ringCornerRadius}
                  stroke={`url(#${gradientId})`}
                  strokeWidth={ringStrokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={perimeter}
                  strokeDashoffset={progress}
                />
              </Svg>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={[styles.petImage, compact && styles.petImageCompact]} />
              ) : (
                <InitialAvatar name={name} compact={compact} />
              )}
              <View style={[styles.completionBadge, { backgroundColor: progressColors.badgeBg }]}>
                <Text style={[styles.completionBadgeText, { color: progressColors.badgeText }]}>{safePercent}%</Text>
              </View>
            </View>

            <View style={styles.petCardContent}>
              <Text numberOfLines={1} style={[styles.petName, compact && styles.petNameCompact]}>{name}</Text>
              <Text numberOfLines={1} style={[styles.petMeta, compact && styles.petMetaCompact]}>{meta}</Text>

              <View style={styles.petInfoRow}>
                <Text numberOfLines={1} style={[styles.petWeight, compact && styles.petWeightCompact]}>
                  {weightValue != null ? `Weight: ${weightValue.toFixed(1)} kg` : 'No weight record'}
                </Text>
              </View>

              <Text numberOfLines={1} style={[styles.petUpdated, compact && styles.petUpdatedCompact]}>
                {weightValue != null ? (updatedLabel ?? 'Updated recently') : (updatedLabel ?? 'No recent updates')}
              </Text>
            </View>

            <Pressable
              onPress={handlePress}
              style={({ pressed }) => [
                styles.chevronButton,
                pressed && styles.chevronButtonPressed,
              ]}
            >
              <ChevronRight size={22} color="#6c746f" strokeWidth={2.5} />
            </Pressable>
          </View>
        </BlurView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  petCardWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
  petCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.10)',
  },
  petCardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  petCardCompact: {
    borderRadius: 24,
  },
  petCardCompactInner: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  petCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  avatarRingSvg: {
    position: 'absolute',
  },
  petCardActive: {
    borderColor: 'rgba(71,102,74,0.18)',
    backgroundColor: '#f7faf8',
  },
  petCardPressed: {
    transform: [{ scale: 0.985 }],
    shadowOpacity: 0.02,
    shadowRadius: 6,
  },
  petImage: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#7c8d88',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  petImageCompact: {
    width: 74,
    height: 74,
    borderRadius: 24,
  },
  initialAvatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#8f9b91',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#7c8d88',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  initialAvatarCompact: {
    width: 74,
    height: 74,
    borderRadius: 24,
  },
  initialText: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  initialTextCompact: {
    fontSize: 19,
    lineHeight: 22,
  },
  completionBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    minWidth: 30,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbfaf7',
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.16)',
  },
  completionBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    color: '#5d605a',
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  petCardContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    marginLeft: 16,
    paddingRight: 10,
  },
  petName: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: '#26312f',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  petNameCompact: {
    fontSize: 19,
    lineHeight: 23,
    marginBottom: 3,
  },
  petMeta: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '500',
    color: '#646c68',
    marginBottom: 4,
  },
  petMetaCompact: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 6,
  },
  petInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  petWeight: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '700',
    color: '#47664a',
  },
  petWeightCompact: {
    fontSize: 15,
    lineHeight: 19,
  },
  petUpdated: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#7a827d',
  },
  petUpdatedCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  chevronButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,248,239,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(171,143,116,0.16)',
    shadowColor: '#7c8d88',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  chevronButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(247,238,228,0.95)',
  },
});
