/**
 * haptics.ts — thin wrapper around expo-haptics.
 *
 * All calls are fire-and-forget. On devices/platforms that don't support
 * haptics the SDK silently no-ops, so no try/catch needed.
 *
 * Usage:
 *   import { hap } from '../lib/haptics';
 *   hap.light();    // tap, selection change
 *   hap.medium();   // confirm, save, complete
 *   hap.heavy();    // destructive action (delete)
 *   hap.success();  // positive notification
 *   hap.warning();  // caution notification
 *   hap.error();    // failure notification
 *   hap.select();   // picker / list selection tick
 */

import * as Haptics from 'expo-haptics';

const { ImpactFeedbackStyle, NotificationFeedbackType } = Haptics;

export const hap = {
  /** Subtle — nav tap, toggle, chip select */
  light:   () => void Haptics.impactAsync(ImpactFeedbackStyle.Light),

  /** Moderate — save, add record, complete reminder */
  medium:  () => void Haptics.impactAsync(ImpactFeedbackStyle.Medium),

  /** Strong — destructive confirm */
  heavy:   () => void Haptics.impactAsync(ImpactFeedbackStyle.Heavy),

  /** Success checkmark feel */
  success: () => void Haptics.notificationAsync(NotificationFeedbackType.Success),

  /** Warning / attention */
  warning: () => void Haptics.notificationAsync(NotificationFeedbackType.Warning),

  /** Error / failure */
  error:   () => void Haptics.notificationAsync(NotificationFeedbackType.Error),

  /** Discrete tick — each step in a drag/scroll picker */
  select:  () => void Haptics.selectionAsync(),
} as const;
