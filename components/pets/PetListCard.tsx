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
  onPress: () => void;
};

function InitialAvatar({ name }: { name: string }) {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  return (
    <View style={styles.initialAvatar}>
      <Text style={styles.initialText}>{initial}</Text>
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
        styles.petCard,
        highlighted ? styles.petCardActive : styles.petCardDefault,
        pressed && styles.petCardPressed,
      ]}
    >
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.petAvatar} /> : <InitialAvatar name={name} />}

      <View style={styles.petCardBody}>
        <Text style={styles.petName}>{name}</Text>
        <Text style={styles.petMeta}>{meta}</Text>
        <Text style={styles.petWeightLine}>
          {weightValue != null ? `Weight: ${weightValue.toFixed(1)} kg` : 'No weight record'}
        </Text>
        <Text style={styles.petUpdatedLine}>{updatedLabel ?? 'No recent updates'}</Text>
      </View>

      <View style={styles.chevronWrap}>
        <Text style={styles.chevron}>{'›'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#16324F',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  petCardDefault: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petCardActive: {
    borderColor: 'rgba(220,236,243,0.92)',
  },
  petCardPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.95,
  },
  petAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    marginRight: 14,
    borderWidth: 1.4,
    borderColor: 'rgba(210,235,240,0.95)',
  },
  initialAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#7090B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 3,
    borderColor: 'rgba(210,235,240,0.95)',
  },
  initialText: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  petCardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  petName: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    color: '#10243E',
    marginBottom: 4,
  },
  petMeta: {
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(23,49,77,0.66)',
    marginBottom: 8,
  },
  petWeightLine: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    color: '#17314D',
    marginBottom: 2,
  },
  petUpdatedLine: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1C8596',
  },
  chevronWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(240,246,248,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(208,220,228,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  chevron: {
    fontSize: 30,
    lineHeight: 32,
    color: '#177D90',
    fontWeight: '500',
    marginTop: -2,
  },
});
