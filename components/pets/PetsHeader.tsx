import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type PetsHeaderProps = {
  label: string;
  title: string;
  caption?: string;
  onBack: () => void;
  compact?: boolean;
};

export default function PetsHeader({ label, title, caption, onBack, compact = false }: PetsHeaderProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Pressable
        style={({ pressed }) => [styles.backButton, compact && styles.backButtonCompact, pressed && styles.backButtonPressed]}
        onPress={onBack}
        hitSlop={8}
      >
        <Text style={[styles.backButtonText, compact && styles.backButtonTextCompact]}>{'\u2039'}</Text>
      </Pressable>

      <View style={[styles.copyBlock, compact && styles.copyBlockCompact]}>
        <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>{label.toUpperCase()}</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 6,
  },
  containerCompact: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  backButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 24,
    lineHeight: 24,
    color: '#F5FAFA',
    marginTop: -1,
  },
  backButtonTextCompact: {
    fontSize: 22,
    lineHeight: 22,
  },
  backButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  copyBlock: {
    marginTop: 0,
  },
  copyBlockCompact: {
    marginTop: 0,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 5,
  },
  eyebrowCompact: {
    fontSize: 13,
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1.05,
    color: '#F5FAFA',
    marginBottom: 18,
  },
  titleCompact: {
    fontSize: 32,
    lineHeight: 36,
    marginBottom: 16,
  },
  caption: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: 'rgba(220,244,255,0.8)',
  },
});
