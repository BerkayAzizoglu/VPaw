import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, AlertCircle, BellRing, CheckCircle2, Clock3, ExternalLink } from 'lucide-react-native';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import type { HealthNotification } from '../lib/notificationInbox';

type NotificationCenterScreenProps = {
  onBack: () => void;
  notifications: HealthNotification[];
  locale?: 'en' | 'tr';
  onMarkRead?: (id: string) => void;
  onDone?: (id: string) => void;
  onSnooze?: (id: string) => void;
  onOpen?: (id: string) => void;
};

function parseMs(iso: string) {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function formatDate(iso: string, locale: 'en' | 'tr') {
  const ms = parseMs(iso);
  if (ms <= 0) return iso;
  return new Date(ms).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function priorityRank(priority: HealthNotification['priority']) {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function colorsForType(type: HealthNotification['type']) {
  if (type === 'overdue') return { bg: '#fdecec', fg: '#b94747' };
  if (type === 'reminder_due') return { bg: '#fef6ea', fg: '#b37f39' };
  if (type === 'followup') return { bg: '#e9f6ef', fg: '#3d7f5a' };
  return { bg: '#e9edf7', fg: '#4e5f8a' };
}

function iconForType(type: HealthNotification['type'], color: string) {
  if (type === 'overdue') return <AlertCircle size={17} color={color} strokeWidth={2.2} />;
  if (type === 'reminder_due') return <Clock3 size={17} color={color} strokeWidth={2.2} />;
  if (type === 'followup') return <BellRing size={17} color={color} strokeWidth={2.2} />;
  return <CheckCircle2 size={17} color={color} strokeWidth={2.2} />;
}

export default function NotificationCenterScreen({
  onBack,
  notifications,
  locale = 'en',
  onMarkRead,
  onDone,
  onSnooze,
  onOpen,
}: NotificationCenterScreenProps) {
  const isTr = locale === 'tr';
  const swipePan = useEdgeSwipeBack({ onBack, fullScreenGestureEnabled: true, enterVariant: 'snappy' });
  const sorted = [...notifications].sort((a, b) => {
    const unreadCmp = Number(a.isRead) - Number(b.isRead);
    if (unreadCmp !== 0) return unreadCmp;
    const priorityCmp = priorityRank(a.priority) - priorityRank(b.priority);
    if (priorityCmp !== 0) return priorityCmp;
    return parseMs(b.createdAt) - parseMs(a.createdAt);
  });
  const unreadCount = sorted.filter((item) => !item.isRead).length;

  return (
    <View style={styles.screen} {...swipePan.panHandlers}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <ChevronLeft size={20} color="#5d605a" strokeWidth={2.4} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{isTr ? 'Bildirim Kutusu' : 'Notification Inbox'}</Text>
            <Text style={styles.headerSub}>{isTr ? 'Tetiklenen aksiyonlar' : 'Triggered actions'}</Text>
          </View>
          {unreadCount > 0 ? (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{unreadCount}</Text>
            </View>
          ) : null}
        </View>

        {sorted.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBox}>
              <CheckCircle2 size={34} color="#a6b3a5" strokeWidth={1.7} />
            </View>
            <Text style={styles.emptyTitle}>{isTr ? 'Inbox temiz' : 'Inbox is clear'}</Text>
            <Text style={styles.emptyBody}>
              {isTr ? 'Şu anda aksiyon gerektiren bildirim yok.' : 'There are no action-required notifications right now.'}
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {sorted.map((item, idx) => {
              const c = colorsForType(item.type);
              const supportsReminderActions = item.type === 'reminder_due' || item.type === 'overdue';
              const supportsOpenAction =
                item.type === 'reminder_due'
                || item.type === 'overdue'
                || item.type === 'followup'
                || item.type === 'missing_data';
              return (
                <Pressable
                  key={item.id}
                  style={[styles.itemCard, !item.isRead && styles.itemCardUnread, idx < sorted.length - 1 && styles.itemCardSpacing]}
                  onPress={() => onMarkRead?.(item.id)}
                >
                  <View style={[styles.iconBox, { backgroundColor: c.bg }]}>
                    {iconForType(item.type, c.fg)}
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemMessage}>{item.message}</Text>
                    <Text style={styles.itemDate}>{formatDate(item.createdAt, locale)}</Text>
                    <View style={styles.actionsRow}>
                      {supportsReminderActions && onDone ? (
                        <Pressable style={styles.actionBtn} onPress={() => onDone(item.id)}>
                          <Text style={styles.actionText}>{isTr ? 'Tamamlandı' : 'Done'}</Text>
                        </Pressable>
                      ) : null}
                      {supportsReminderActions && onSnooze ? (
                        <Pressable style={styles.actionBtn} onPress={() => onSnooze(item.id)}>
                          <Text style={styles.actionText}>{isTr ? 'Ertele' : 'Snooze'}</Text>
                        </Pressable>
                      ) : null}
                      {supportsOpenAction && onOpen ? (
                        <Pressable style={styles.actionBtnPrimary} onPress={() => onOpen(item.id)}>
                          <ExternalLink size={12} color="#e9ffe6" strokeWidth={2.1} />
                          <Text style={styles.actionTextPrimary}>{isTr ? 'Aç' : 'Open'}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f4f0' },
  content: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingHorizontal: 4 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#30332e', letterSpacing: -0.3 },
  headerSub: { marginTop: 1, fontSize: 12, color: '#6a7068', fontWeight: '500' },
  totalBadge: { minWidth: 28, height: 28, borderRadius: 10, backgroundColor: '#47664a', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  totalBadgeText: { color: '#e9ffe6', fontWeight: '800', fontSize: 12 },
  listWrap: { gap: 10 },
  itemCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 12,
    position: 'relative',
  },
  itemCardUnread: { borderColor: '#c7d7c7' },
  itemCardSpacing: { marginBottom: 0 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  itemBody: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#30332e' },
  itemMessage: { fontSize: 12, lineHeight: 16, color: '#5d605a' },
  itemDate: { fontSize: 11, color: '#8a8f89', fontWeight: '600' },
  actionsRow: { marginTop: 6, flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { height: 28, borderRadius: 14, backgroundColor: '#eeeee8', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 11, fontWeight: '700', color: '#556057' },
  actionBtnPrimary: { height: 28, borderRadius: 14, backgroundColor: '#47664a', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionTextPrimary: { fontSize: 11, fontWeight: '700', color: '#e9ffe6' },
  unreadDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#47664a' },
  emptyWrap: { marginTop: 48, alignItems: 'center', paddingHorizontal: 24 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#eeeee8', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#30332e' },
  emptyBody: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#6f736d', textAlign: 'center' },
});
