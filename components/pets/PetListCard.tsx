import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

type PetListCardProps = {
  name: string;
  meta: string;
  weightText: string;
  imageUri?: string;
  badge?: string;
  actionLabel: string;
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
  weightText,
  imageUri,
  badge,
  actionLabel,
  highlighted = false,
  onPress,
}: PetListCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable style={({ pressed }) => [styles.shell, pressed && styles.shellPressed]} onPress={handlePress}>
      <View style={[styles.avatarRing, highlighted && styles.avatarRingActive]}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.avatar} /> : <InitialAvatar name={name} />}
      </View>

      <View style={styles.copyBlock}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta}>{meta}</Text>
        <Text style={styles.weight}>{weightText}</Text>
      </View>

      <Text style={[styles.openText, highlighted && styles.openTextActive]}>{actionLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#8090B0',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  shellPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.90,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingActive: {
    borderColor: 'rgba(14,180,168,0.28)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  initialAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7090B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  copyBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: '#0E1118',
    letterSpacing: -0.3,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: 'rgba(14,180,168,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(14,180,168,0.18)',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    color: '#0DA89A',
    letterSpacing: 0.2,
  },
  meta: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: 'rgba(14,17,24,0.58)',
  },
  weight: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: 'rgba(14,17,24,0.58)',
  },
  openText: {
    alignSelf: 'flex-start',
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: 'rgba(40,55,75,0.40)',
  },
  openTextActive: {
    color: '#0EB4A8',
  },
});
