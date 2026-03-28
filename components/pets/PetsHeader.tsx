import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

type PetsHeaderProps = {
  label: string;
  title: string;
  caption?: string;
  onBack: () => void;
};

export default function PetsHeader({ label, title, caption, onBack }: PetsHeaderProps) {
  return (
    <View style={styles.container}>
      <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]} onPress={onBack}>
        <ChevronLeft size={18} color="#EAF7FF" strokeWidth={2.4} />
      </Pressable>

      <View style={styles.copyBlock}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        <Text style={styles.title}>{title}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 46,
    paddingBottom: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  copyBlock: {
    marginTop: 14,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 8,
  },
  title: {
    fontSize: 52,
    lineHeight: 54,
    fontWeight: '900',
    color: '#F4FAFA',
    letterSpacing: -1.8,
    marginBottom: 22,
  },
  caption: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: 'rgba(220,244,255,0.8)',
  },
});
