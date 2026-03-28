import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

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
      style={({ pressed }) => [
        styles.petCardWrap,
        compact && styles.petCardCompact,
        highlighted ? styles.petCardActive : styles.petCardDefault,
        pressed && styles.petCardPressed,
      ]}
    >
      <View style={[styles.petCard, compact && styles.petCardCompactInner]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={[styles.petAvatar, compact && styles.petAvatarCompact]} />
        ) : (
          <InitialAvatar name={name} compact={compact} />
        )}

        <View style={styles.petCardBody}>
          <Text style={[styles.petName, compact && styles.petNameCompact]}>{name}</Text>
          <Text style={[styles.petMeta, compact && styles.petMetaCompact]}>{meta}</Text>

          <View style={styles.petInfoRow}>
            <Text style={[styles.petWeight, compact && styles.petWeightCompact]}>
              {weightValue != null ? `Weight: ${weightValue.toFixed(1)} kg` : 'No weight record'}
            </Text>
          </View>

          <Text style={[styles.petUpdated, compact && styles.petUpdatedCompact]}>
            {weightValue != null ? 'Updated recently' : (updatedLabel ?? 'No recent updates')}
          </Text>
        </View>

        <View style={styles.petChevronWrap}>
          <Text style={[styles.petChevron, compact && styles.petChevronCompact]}>{'\u203A'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  petCardWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    marginBottom: 18,
  },
  petCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#EEF3F6',
    shadowColor: '#0F2A3D',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  petCardCompact: {
    borderRadius: 24,
  },
  petCardCompactInner: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  petCardDefault: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petCardActive: {
    borderColor: 'rgba(223,242,238,0.95)',
    shadowOpacity: 0.08,
  },
  petCardPressed: {
    transform: [{ scale: 0.988 }],
    opacity: 0.98,
  },
  petAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginRight: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  petAvatarCompact: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 10,
  },
  initialAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#7090B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  initialAvatarCompact: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 10,
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
  petCardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  petName: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '800',
    color: '#17344F',
    marginBottom: 4,
  },
  petNameCompact: {
    fontSize: 19,
    lineHeight: 23,
    marginBottom: 3,
  },
  petMeta: {
    fontSize: 15,
    lineHeight: 20,
    color: 'rgba(35,67,95,0.7)',
    marginBottom: 7,
  },
  petMetaCompact: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 6,
  },
  petInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  petWeight: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: '#17344F',
  },
  petWeightCompact: {
    fontSize: 15,
    lineHeight: 19,
  },
  petUpdated: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: 'rgba(32,123,126,0.85)',
  },
  petUpdatedCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  petChevronWrap: {
    width: 30,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },
  petChevron: {
    fontSize: 30,
    lineHeight: 30,
    color: '#1A7280',
    fontWeight: '600',
  },
  petChevronCompact: {
    fontSize: 26,
    lineHeight: 26,
  },
});
