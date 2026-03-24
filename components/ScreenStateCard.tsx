import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import PawLottie from './PawLottie';

export type ScreenStateMode = 'loading' | 'empty' | 'error';

type ScreenStateCardProps = {
  mode: ScreenStateMode;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function ScreenStateCard({ mode, title, body, actionLabel, onAction }: ScreenStateCardProps) {
  return (
    <View style={styles.card}>
      {mode === 'loading' ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#2d2d2d" />
        </View>
      ) : null}

      {mode === 'empty' ? (
        <View style={styles.pawWrap}>
          <PawLottie size={80} />
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  pawWrap: {
    marginBottom: 8,
  },
  loadingWrap: {
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#2d2d2d',
  },
  body: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: '#787878',
    fontWeight: '500',
  },
  actionBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#faf8f5',
    fontWeight: '700',
  },
});
