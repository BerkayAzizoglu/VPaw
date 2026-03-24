import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, AlertCircle, Clock, CalendarDays, CheckCircle2 } from 'lucide-react-native';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';

// ─── Types ─────────────────────────────────────────────────────────────────────
type NotifItem = {
  id: string;
  title: string;
  date: string;
  petName?: string;
  subtype?: string;
};

type NotificationCenterScreenProps = {
  onBack: () => void;
  overdue: NotifItem[];
  today: NotifItem[];
  upcoming: NotifItem[];
  completed?: NotifItem[];
  locale?: 'en' | 'tr';
  onMarkDone?: (id: string) => void;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function subtypeLabel(subtype: string | undefined, isTr: boolean): string {
  if (subtype === 'vaccine') return isTr ? 'Aşı' : 'Vaccine';
  if (subtype === 'vet_visit') return isTr ? 'Veteriner' : 'Vet Visit';
  if (subtype === 'medication') return isTr ? 'İlaç' : 'Medication';
  if (subtype === 'food') return isTr ? 'Mama' : 'Food';
  if (subtype === 'litter') return isTr ? 'Kum' : 'Litter';
  if (subtype === 'walk') return isTr ? 'Yürüyüş' : 'Walk';
  return isTr ? 'Özel' : 'Custom';
}

function subtypeColors(subtype: string | undefined): { bg: string; fg: string } {
  if (subtype === 'vaccine') return { bg: '#cbebc8', fg: '#3a6a3a' };
  if (subtype === 'vet_visit') return { bg: '#edffe3', fg: '#3a6e45' };
  if (subtype === 'medication') return { bg: '#ede8f5', fg: '#5a4a7a' };
  if (subtype === 'food') return { bg: '#f7f0e4', fg: '#9a8050' };
  if (subtype === 'walk') return { bg: '#e3eef8', fg: '#3a4e7a' };
  return { bg: '#eeeee8', fg: '#5d605a' };
}

function formatDate(iso: string, isTr: boolean): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(isTr ? 'tr-TR' : 'en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Notification row ──────────────────────────────────────────────────────────
function NotifRow({
  item,
  kind,
  isTr,
  onMarkDone,
}: {
  item: NotifItem;
  kind: 'overdue' | 'today' | 'upcoming' | 'done';
  isTr: boolean;
  onMarkDone?: (id: string) => void;
}) {
  const colors = subtypeColors(item.subtype);
  const accentColor = kind === 'overdue' ? '#c05050' : kind === 'today' ? '#c4a470' : kind === 'done' ? '#72b08a' : '#47664a';

  return (
    <View style={[styles.notifRow, kind === 'overdue' && styles.notifRowOverdue]}>
      <View style={[styles.notifAccent, { backgroundColor: accentColor }]} />
      <View style={[styles.notifIconBox, { backgroundColor: colors.bg }]}>
        {kind === 'overdue'
          ? <AlertCircle size={18} color="#c05050" strokeWidth={2.2} />
          : kind === 'today'
          ? <Clock size={18} color="#c4a470" strokeWidth={2.2} />
          : kind === 'done'
          ? <CheckCircle2 size={18} color="#72b08a" strokeWidth={2.2} />
          : <CalendarDays size={18} color={colors.fg} strokeWidth={2.2} />}
      </View>
      <View style={styles.notifBody}>
        <Text style={styles.notifTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.notifMeta}>
          <Text style={[styles.notifDate, kind === 'overdue' && styles.notifDateOverdue]}>
            {formatDate(item.date, isTr)}
          </Text>
          {item.petName ? (
            <Text style={styles.notifPet}> · {item.petName}</Text>
          ) : null}
        </View>
        <View style={[styles.notifTypePill, { backgroundColor: colors.bg }]}>
          <Text style={[styles.notifTypePillText, { color: colors.fg }]}>
            {subtypeLabel(item.subtype, isTr)}
          </Text>
        </View>
      </View>
      {onMarkDone && kind !== 'done' ? (
        <Pressable style={styles.doneBtn} onPress={() => onMarkDone(item.id)} hitSlop={8}>
          <CheckCircle2 size={20} color="#b1b3ab" strokeWidth={1.8} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────────
function Section({
  label,
  labelColor,
  items,
  kind,
  isTr,
  onMarkDone,
}: {
  label: string;
  labelColor: string;
  items: NotifItem[];
  kind: 'overdue' | 'today' | 'upcoming' | 'done';
  isTr: boolean;
  onMarkDone?: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: labelColor }]}>{label}</Text>
        <View style={[styles.sectionBadge, { backgroundColor: labelColor + '18' }]}>
          <Text style={[styles.sectionBadgeText, { color: labelColor }]}>{items.length}</Text>
        </View>
      </View>
      <View style={styles.sectionCard}>
        {items.map((item, i) => (
          <View key={item.id}>
            {i > 0 && <View style={styles.divider} />}
            <NotifRow item={item} kind={kind} isTr={isTr} onMarkDone={onMarkDone} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function NotificationCenterScreen({
  onBack,
  overdue,
  today,
  upcoming,
  completed = [],
  locale = 'en',
  onMarkDone,
}: NotificationCenterScreenProps) {
  const isTr = locale === 'tr';
  const swipePan = useEdgeSwipeBack({ onBack, enabled: true, edgeWidth: 24, triggerDx: 70, maxDy: 30 });
  const total = overdue.length + today.length + upcoming.length;

  return (
    <View style={styles.screen} {...swipePan.panHandlers}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
            <ChevronLeft size={20} color="#5d605a" strokeWidth={2.4} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{isTr ? 'Bildirimler' : 'Notifications'}</Text>
          </View>
          {total > 0 ? (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{total}</Text>
            </View>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {total === 0 && completed.length === 0 ? (
          /* Empty state */
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBox}>
              <CheckCircle2 size={36} color="#b1b3ab" strokeWidth={1.6} />
            </View>
            <Text style={styles.emptyTitle}>
              {isTr ? 'Hepsi tamam!' : 'All clear!'}
            </Text>
            <Text style={styles.emptyBody}>
              {isTr
                ? 'Bekleyen hatırlatmanız yok. Harika iş!'
                : 'You have no pending reminders. Great work!'}
            </Text>
          </View>
        ) : (
          <>
            <Section
              label={isTr ? 'GECİKMİŞ' : 'OVERDUE'}
              labelColor="#c05050"
              items={overdue}
              kind="overdue"
              isTr={isTr}
              onMarkDone={onMarkDone}
            />
            <Section
              label={isTr ? 'BUGÜN' : 'TODAY'}
              labelColor="#c4a470"
              items={today}
              kind="today"
              isTr={isTr}
              onMarkDone={onMarkDone}
            />
            <Section
              label={isTr ? 'YAKLAŞAN' : 'UPCOMING'}
              labelColor="#47664a"
              items={upcoming}
              kind="upcoming"
              isTr={isTr}
              onMarkDone={onMarkDone}
            />
            {completed.length > 0 ? (
              <Section
                label={isTr ? 'TAMAMLANAN' : 'COMPLETED'}
                labelColor="#72b08a"
                items={completed.slice(0, 5)}
                kind="done"
                isTr={isTr}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f4f0' },
  content: { paddingTop: 52, paddingBottom: 120 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -0.4,
  },
  headerSpacer: { width: 36 },
  totalBadge: {
    minWidth: 28,
    height: 28,
    backgroundColor: '#47664a',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e9ffe6',
  },

  section: { marginBottom: 22, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sectionBadge: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#30332e',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  notifRowOverdue: {
    backgroundColor: '#fdf5f5',
  },
  notifAccent: {
    position: 'absolute',
    left: 0, top: 10, bottom: 10,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  notifIconBox: {
    width: 38, height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifBody: { flex: 1, gap: 3 },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -0.1,
  },
  notifMeta: { flexDirection: 'row', alignItems: 'center' },
  notifDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9a9c95',
  },
  notifDateOverdue: { color: '#c05050', fontWeight: '600' },
  notifPet: {
    fontSize: 12,
    fontWeight: '500',
    color: '#b1b3ab',
  },
  notifTypePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    marginTop: 2,
  },
  notifTypePillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  doneBtn: {
    padding: 4,
    flexShrink: 0,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginLeft: 64,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconBox: {
    width: 72, height: 72,
    backgroundColor: '#eeeee8',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9a9c95',
    textAlign: 'center',
    lineHeight: 20,
  },
});
