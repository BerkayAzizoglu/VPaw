import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';

type PetListCardProps = {
  name: string;
  meta: string;
  weightValue: number | null;
  updatedLabel?: string | null;
  imageUri?: string;
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
  highlighted = false,
  compact = false,
  onPress,
}: PetListCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

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
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={[styles.petImage, compact && styles.petImageCompact]} />
            ) : (
              <InitialAvatar name={name} compact={compact} />
            )}

            <View style={styles.petCardContent}>
              <Text numberOfLines={1} style={[styles.petName, compact && styles.petNameCompact]}>{name}</Text>
              <Text numberOfLines={1} style={[styles.petMeta, compact && styles.petMetaCompact]}>{meta}</Text>

              <View style={styles.petInfoRow}>
                <Text numberOfLines={1} style={[styles.petWeight, compact && styles.petWeightCompact]}>
                  {weightValue != null ? `Weight: ${weightValue.toFixed(1)} kg` : 'No weight record'}
                </Text>
              </View>

              <Text numberOfLines={1} style={[styles.petUpdated, compact && styles.petUpdatedCompact]}>
                {weightValue != null ? 'Updated recently' : (updatedLabel ?? 'No recent updates')}
              </Text>
            </View>

            <Pressable
              onPress={handlePress}
              style={({ pressed }) => [
                styles.chevronButton,
                pressed && styles.chevronButtonPressed,
              ]}
            >
              <ChevronRight size={22} color="#2C8E84" strokeWidth={2.5} />
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
    borderRadius: 30,
  },
  petCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(248,251,250,0.7)',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    shadowColor: '#173832',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  petCardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
  petCardActive: {
    borderColor: 'rgba(255,255,255,0.48)',
    shadowOpacity: 0.08,
  },
  petCardPressed: {
    transform: [{ scale: 0.985 }],
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  petImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#173B37',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  petImageCompact: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  initialAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#7090B8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#173B37',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  initialAvatarCompact: {
    width: 74,
    height: 74,
    borderRadius: 37,
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
    color: '#163936',
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
    color: 'rgba(78,96,93,0.9)',
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
    color: '#18324E',
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
    color: '#31897F',
  },
  petUpdatedCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  chevronButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.74)',
    shadowColor: '#8ca5a0',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  chevronButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(232,244,240,0.95)',
  },
});
