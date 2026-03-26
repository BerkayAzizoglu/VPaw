import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronLeft, ChevronRight, Edit2, Mars, Venus } from 'lucide-react-native';
import type { PetProfile, RoutineCareRecord } from '../lib/petProfileTypes';
import type { WeightPoint } from '../lib/healthMvpModel';

// ─── Types ────────────────────────────────────────────────────────────────────

type PetDetailScreenProps = {
  pet: PetProfile;
  weightEntries?: WeightPoint[];
  weightGoal?: number;
  locale?: 'en' | 'tr';
  onBack: () => void;
  onEdit?: () => void;
  onOpenWeightTracking?: () => void;
  onOpenHealthRecords?: () => void;
  onOpenVetVisits?: () => void;
  onOpenVaccinations?: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAge(birthDate: string, isTr: boolean): string {
  const now = new Date();
  const [ry, rm, rd] = birthDate.split('-').map(Number);
  const y = Number.isFinite(ry) ? ry : now.getFullYear();
  const m = Number.isFinite(rm) ? rm : 1;
  const d = Number.isFinite(rd) ? rd : 1;
  let years = now.getFullYear() - y;
  let months = now.getMonth() + 1 - m;
  if (now.getDate() < d) months--;
  if (months < 0) { years--; months += 12; }
  years = Math.max(0, years);
  months = Math.max(0, months);
  return isTr ? `${years} yıl ${months} ay` : `${years}y ${months}m`;
}

function fmtDate(value: string, isTr: boolean): string {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return value || '—';
  const d = new Date(ms);
  const M_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const M_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${isTr ? M_TR[d.getMonth()] : M_EN[d.getMonth()]} ${d.getFullYear()}`;
}

function nextRoutineDue(record: RoutineCareRecord, isTr: boolean): string {
  if (!record.enabled || !record.lastDate) return isTr ? 'Kayıt yok' : 'No record';
  const ms = new Date(record.lastDate).getTime();
  if (!Number.isFinite(ms)) return isTr ? 'Kayıt yok' : 'No record';
  const dueMs = ms + record.intervalDays * 86400000;
  const diffDays = Math.round((dueMs - Date.now()) / 86400000);
  if (diffDays < 0) return isTr ? `${Math.abs(diffDays)} gün gecikti` : `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return isTr ? 'Bugün' : 'Today';
  if (diffDays === 1) return isTr ? 'Yarın' : 'Tomorrow';
  return isTr ? `${diffDays} gün sonra` : `In ${diffDays} days`;
}

function routineDueColor(record: RoutineCareRecord): string {
  if (!record.enabled || !record.lastDate) return '#9a9c95';
  const ms = new Date(record.lastDate).getTime();
  if (!Number.isFinite(ms)) return '#9a9c95';
  const dueMs = ms + record.intervalDays * 86400000;
  const diffDays = Math.round((dueMs - Date.now()) / 86400000);
  if (diffDays < 0) return '#c05050';
  if (diffDays <= 7) return '#c97b3a';
  return '#4a7a54';
}

// ─── Section component ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function NavRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.navRow} onPress={onPress}>
      <Text style={styles.navRowText}>{label}</Text>
      <ChevronRight size={16} color="#9a9c95" strokeWidth={2.2} />
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PetDetailScreen({
  pet,
  weightEntries = [],
  weightGoal,
  locale = 'en',
  onBack,
  onEdit,
  onOpenWeightTracking,
  onOpenHealthRecords,
  onOpenVetVisits,
  onOpenVaccinations,
}: PetDetailScreenProps) {
  const isTr = locale === 'tr';

  const latestWeight = weightEntries[weightEntries.length - 1];
  const currentKg = latestWeight?.value ?? null;
  const goalRatio = weightGoal && weightGoal > 0 && currentKg != null
    ? Math.min(1, Math.max(0, currentKg / weightGoal))
    : null;
  const onTarget = goalRatio != null && currentKg != null && currentKg <= weightGoal!;

  const vaccineCount = (pet.vaccinations ?? []).length;
  const lastVaccine = [...(pet.vaccinations ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const hasAllergies = pet.chronicConditions?.allergies || (pet.allergiesLog ?? []).length > 0;
  const hasDiabetes = pet.chronicConditions?.diabetes || (pet.diabetesLog ?? []).length > 0;
  const surgeryCount = (pet.surgeriesLog ?? []).length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.topRow}>
          <Pressable style={styles.iconBtn} onPress={onBack}>
            <ChevronLeft size={20} color="#5b5b5b" strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.screenTitle}>{isTr ? 'Profil Detayı' : 'Pet Profile'}</Text>
          {onEdit ? (
            <Pressable style={styles.iconBtn} onPress={onEdit}>
              <Edit2 size={17} color="#5b5b5b" strokeWidth={2.2} />
            </Pressable>
          ) : (
            <View style={styles.iconGhost} />
          )}
        </View>

        {/* ── Pet Hero Card ── */}
        <View style={styles.heroCard}>
          <Image source={{ uri: pet.image }} style={styles.heroImage} />
          <View style={styles.heroBody}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{pet.name}</Text>
              <View style={styles.genderPill}>
                {pet.gender === 'male'
                  ? <Mars size={12} color="#6a6a6a" strokeWidth={2.2} />
                  : <Venus size={12} color="#6a6a6a" strokeWidth={2.2} />}
                <Text style={styles.genderText}>{pet.gender === 'male' ? (isTr ? 'Erkek' : 'Male') : (isTr ? 'Dişi' : 'Female')}</Text>
              </View>
            </View>
            <Text style={styles.heroBreed}>{pet.breed}</Text>
            <Text style={styles.heroMeta}>{formatAge(pet.birthDate, isTr)}</Text>
            {pet.microchip ? (
              <View style={styles.chipPill}>
                <Text style={styles.chipText}>🔖 {pet.microchip}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Weight ── */}
        <Section title={isTr ? 'KİLO' : 'WEIGHT'}>
          <View style={styles.weightRow}>
            <View style={styles.weightLeft}>
              <Text style={styles.weightValue}>
                {currentKg != null ? `${currentKg.toFixed(1)} kg` : '—'}
              </Text>
              {goalRatio != null ? (
                <Text style={[styles.goalLabel, { color: onTarget ? '#4a7a54' : '#c05050' }]}>
                  {isTr ? `Hedef: ${weightGoal!.toFixed(1)} kg` : `Goal: ${weightGoal!.toFixed(1)} kg`}
                </Text>
              ) : (
                <Text style={styles.goalLabel}>{isTr ? 'Hedef belirlenmemiş' : 'No goal set'}</Text>
              )}
            </View>
            {goalRatio != null && (
              <View style={styles.goalProgress}>
                <View style={styles.goalTrack}>
                  <View style={[styles.goalFill, { width: `${Math.round(goalRatio * 100)}%`, backgroundColor: onTarget ? '#6b9e6b' : '#c96a6a' }]} />
                </View>
                <Text style={styles.goalPercent}>{Math.round(goalRatio * 100)}%</Text>
              </View>
            )}
          </View>
          <Pressable style={styles.inlineLink} onPress={onOpenWeightTracking}>
            <Text style={styles.inlineLinkText}>{isTr ? 'Kilo takibine git' : 'Open weight tracking'}</Text>
            <ChevronRight size={14} color="#47664a" strokeWidth={2.2} />
          </Pressable>
        </Section>

        {/* ── Vaccinations ── */}
        <Section title={isTr ? 'AŞILAR' : 'VACCINATIONS'}>
          <InfoRow
            label={isTr ? 'Kayıtlı aşı' : 'Recorded vaccines'}
            value={vaccineCount > 0 ? String(vaccineCount) : (isTr ? 'Kayıt yok' : 'None')}
          />
          {lastVaccine ? (
            <InfoRow
              label={isTr ? 'Son aşı' : 'Latest vaccine'}
              value={`${lastVaccine.name} — ${fmtDate(lastVaccine.date, isTr)}`}
            />
          ) : null}
          <NavRow label={isTr ? 'Tüm aşıları gör' : 'View all vaccines'} onPress={onOpenVaccinations} />
        </Section>

        {/* ── Health Conditions ── */}
        {(hasAllergies || hasDiabetes || surgeryCount > 0) && (
          <Section title={isTr ? 'SAĞLIK DURUMU' : 'HEALTH CONDITIONS'}>
            {hasAllergies && (
              <View style={styles.conditionRow}>
                <View style={[styles.conditionDot, { backgroundColor: '#c97b3a' }]} />
                <Text style={styles.conditionText}>{isTr ? 'Alerji kaydı mevcut' : 'Allergy records present'}</Text>
              </View>
            )}
            {hasDiabetes && (
              <View style={styles.conditionRow}>
                <View style={[styles.conditionDot, { backgroundColor: '#3a7ac9' }]} />
                <Text style={styles.conditionText}>{isTr ? 'Diyabet kaydı mevcut' : 'Diabetes records present'}</Text>
              </View>
            )}
            {surgeryCount > 0 && (
              <InfoRow
                label={isTr ? 'Ameliyat kaydı' : 'Surgeries'}
                value={String(surgeryCount)}
              />
            )}
            <NavRow label={isTr ? 'Sağlık kayıtlarına git' : 'View health records'} onPress={onOpenHealthRecords} />
          </Section>
        )}

        {/* ── Routine Care (P2 #2) ── */}
        <Section title={isTr ? 'RUTİN BAKIM' : 'ROUTINE CARE'}>
          {/* Internal parasite */}
          <View style={styles.routineRow}>
            <View style={styles.routineLeft}>
              <Text style={styles.routineTitle}>{isTr ? 'İç Parazit' : 'Internal Parasite'}</Text>
              {pet.routineCare.internalParasite.lastDate ? (
                <Text style={styles.routineSub}>
                  {isTr ? 'Son: ' : 'Last: '}{fmtDate(pet.routineCare.internalParasite.lastDate, isTr)}
                </Text>
              ) : null}
            </View>
            <View style={styles.routineRight}>
              <Text style={[styles.routineDue, { color: routineDueColor(pet.routineCare.internalParasite) }]}>
                {nextRoutineDue(pet.routineCare.internalParasite, isTr)}
              </Text>
              {pet.routineCare.internalParasite.enabled && (
                <Text style={styles.routineInterval}>
                  {isTr ? `Her ${pet.routineCare.internalParasite.intervalDays} gün` : `Every ${pet.routineCare.internalParasite.intervalDays}d`}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.routineDivider} />

          {/* External parasite */}
          <View style={styles.routineRow}>
            <View style={styles.routineLeft}>
              <Text style={styles.routineTitle}>{isTr ? 'Dış Parazit' : 'External Parasite'}</Text>
              {pet.routineCare.externalParasite.lastDate ? (
                <Text style={styles.routineSub}>
                  {isTr ? 'Son: ' : 'Last: '}{fmtDate(pet.routineCare.externalParasite.lastDate, isTr)}
                </Text>
              ) : null}
            </View>
            <View style={styles.routineRight}>
              <Text style={[styles.routineDue, { color: routineDueColor(pet.routineCare.externalParasite) }]}>
                {nextRoutineDue(pet.routineCare.externalParasite, isTr)}
              </Text>
              {pet.routineCare.externalParasite.enabled && (
                <Text style={styles.routineInterval}>
                  {isTr ? `Her ${pet.routineCare.externalParasite.intervalDays} gün` : `Every ${pet.routineCare.externalParasite.intervalDays}d`}
                </Text>
              )}
            </View>
          </View>
        </Section>

        {/* ── Quick Links ── */}
        <Section title={isTr ? 'HIZLI ERİŞİM' : 'QUICK ACCESS'}>
          <NavRow label={isTr ? 'Veteriner Ziyaretleri' : 'Vet Visits'} onPress={onOpenVetVisits} />
          <View style={styles.navDivider} />
          <NavRow label={isTr ? 'Sağlık Kayıtları' : 'Health Records'} onPress={onOpenHealthRecords} />
          <View style={styles.navDivider} />
          <NavRow label={isTr ? 'Kilo Takibi' : 'Weight Tracking'} onPress={onOpenWeightTracking} />
        </Section>

      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
    gap: 16,
  },

  // Header
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  iconGhost: { width: 36, height: 36 },
  screenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2d2d2d',
  },

  // Hero card
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  heroImage: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: '#ececec',
  },
  heroBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2d2d2d',
    letterSpacing: -0.5,
  },
  genderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#f5f5f3',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  genderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  heroBreed: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  heroMeta: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  chipPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f0f0ea',
  },
  chipText: {
    fontSize: 11,
    color: '#5d605a',
    fontWeight: '500',
  },

  // Section
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#9a9c95',
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // Weight section
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 12,
  },
  weightLeft: {
    gap: 3,
  },
  weightValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2d2d2d',
    letterSpacing: -0.8,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9a9c95',
  },
  goalProgress: {
    flex: 1,
    maxWidth: 100,
    gap: 4,
    alignItems: 'flex-end',
  },
  goalTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.07)',
    overflow: 'hidden',
  },
  goalFill: {
    height: 6,
    borderRadius: 3,
  },
  goalPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9a9c95',
  },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inlineLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#47664a',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  infoLabel: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#2d2d2d',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },

  // Nav rows
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  navRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d2d2d',
  },
  navDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginHorizontal: 16,
  },

  // Conditions
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  conditionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  conditionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3d3d3d',
  },

  // Routine care
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
  },
  routineLeft: {
    flex: 1,
    gap: 2,
  },
  routineRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  routineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d2d2d',
  },
  routineSub: {
    fontSize: 11,
    color: '#9a9c95',
    fontWeight: '500',
  },
  routineDue: {
    fontSize: 13,
    fontWeight: '700',
  },
  routineInterval: {
    fontSize: 11,
    color: '#9a9c95',
    fontWeight: '500',
  },
  routineDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 16,
  },
});
