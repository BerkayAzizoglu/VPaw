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
import BackgroundBlobs from '../components/pets/BackgroundBlobs';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';

type PetDetailScreenProps = {
  pet: PetProfile;
  weightEntries?: WeightPoint[];
  weightGoal?: number;
  /** Override vaccine count with the total from the health hub (medicalEvents), which may differ from pet.vaccinations[] */
  vaccineCountOverride?: number;
  locale?: 'en' | 'tr';
  onBack: () => void;
  onEdit?: () => void;
  onOpenWeightTracking?: () => void;
  onOpenHealthRecords?: () => void;
  onOpenVetVisits?: () => void;
  onOpenVaccinations?: () => void;
};

function formatAge(birthDate: string, isTr: boolean): string {
  const now = new Date();
  const [ry, rm, rd] = birthDate.split('-').map(Number);
  const y = Number.isFinite(ry) ? ry : now.getFullYear();
  const m = Number.isFinite(rm) ? rm : 1;
  const d = Number.isFinite(rd) ? rd : 1;
  let years = now.getFullYear() - y;
  let months = now.getMonth() + 1 - m;
  if (now.getDate() < d) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  years = Math.max(0, years);
  months = Math.max(0, months);
  return isTr ? `${years} yil ${months} ay` : `${years}y ${months}m`;
}

function fmtDate(value: string, isTr: boolean): string {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return value || '-';
  const d = new Date(ms);
  const monthsTr = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${isTr ? monthsTr[d.getMonth()] : monthsEn[d.getMonth()]} ${d.getFullYear()}`;
}

function nextRoutineDue(record: RoutineCareRecord, isTr: boolean): string {
  if (!record.enabled || !record.lastDate) return isTr ? 'Kayıt yok' : 'No record';
  const ms = new Date(record.lastDate).getTime();
  if (!Number.isFinite(ms)) return isTr ? 'Kayıt yok' : 'No record';
  const dueMs = ms + record.intervalDays * 86400000;
  const diffDays = Math.round((dueMs - Date.now()) / 86400000);
  if (diffDays < 0) return isTr ? `${Math.abs(diffDays)} gun gecikti` : `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return isTr ? 'Bugün' : 'Today';
  if (diffDays === 1) return isTr ? 'Yarın' : 'Tomorrow';
  return isTr ? `${diffDays} gün sonra` : `In ${diffDays} days`;
}

function routineDueColor(record: RoutineCareRecord): string {
  if (!record.enabled || !record.lastDate) return '#8a948f';
  const ms = new Date(record.lastDate).getTime();
  if (!Number.isFinite(ms)) return '#8a948f';
  const dueMs = ms + record.intervalDays * 86400000;
  const diffDays = Math.round((dueMs - Date.now()) / 86400000);
  if (diffDays < 0) return '#c56767';
  if (diffDays <= 7) return '#b98045';
  return '#4c8a66';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>{title}</Text>
        <View style={styles.sectionHeaderLine} />
      </View>
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
      <ChevronRight size={16} color="#6f817d" strokeWidth={2.2} />
    </Pressable>
  );
}

export default function PetDetailScreen({
  pet,
  weightEntries = [],
  weightGoal,
  vaccineCountOverride,
  locale = 'en',
  onBack,
  onEdit,
  onOpenWeightTracking,
  onOpenHealthRecords,
  onOpenVetVisits,
  onOpenVaccinations,
}: PetDetailScreenProps) {
  const isTr = locale === 'tr';
  const profileTitle = isTr
    ? `${pet.name} Profili`
    : `${pet.name}${pet.name.trim().toLowerCase().endsWith('s') ? "'" : "'s"} Profile`;
  const swipePanResponder = useEdgeSwipeBack({
    onBack,
    fullScreenGestureEnabled: false,
    enterVariant: 'soft',
  });

  const latestWeight = weightEntries[weightEntries.length - 1];
  const currentKg = latestWeight?.value ?? null;
  const goalRatio = weightGoal && weightGoal > 0 && currentKg != null
    ? Math.min(1, Math.max(0, currentKg / weightGoal))
    : null;
  // Uncapped percentage for display (shows >100% when goal is exceeded)
  const goalDisplayPct = weightGoal && weightGoal > 0 && currentKg != null
    ? Math.round((currentKg / weightGoal) * 100)
    : null;
  const onTarget = goalRatio != null && currentKg != null && weightGoal != null && currentKg <= weightGoal;

  const vaccineCount = vaccineCountOverride ?? (pet.vaccinations ?? []).length;
  const lastVaccine = [...(pet.vaccinations ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const hasAllergies = pet.chronicConditions?.allergies || (pet.allergiesLog ?? []).length > 0;
  const hasDiabetes = pet.chronicConditions?.diabetes || (pet.diabetesLog ?? []).length > 0;
  const surgeryCount = (pet.surgeriesLog ?? []).length;

  return (
    <View style={styles.root}>
      <BackgroundBlobs />
      <View style={styles.screen} {...swipePanResponder.panHandlers}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!swipePanResponder.isSwiping}
        >
          <View style={styles.headerBlock}>
            <View style={styles.topRow}>
              <Pressable style={styles.iconBtn} onPress={onBack}>
                <ChevronLeft size={20} color="#305855" strokeWidth={2.4} />
              </Pressable>
              {onEdit ? (
                <Pressable style={styles.iconBtn} onPress={onEdit}>
                  <Edit2 size={17} color="#305855" strokeWidth={2.2} />
                </Pressable>
              ) : (
                <View style={styles.iconGhost} />
              )}
            </View>
            <Text style={styles.headerEyebrow}>{isTr ? 'PET PROFILI' : 'PET PROFILE'}</Text>
            <Text style={styles.screenTitle}>{profileTitle}</Text>
          </View>

          <View style={styles.heroCard}>
            <Image source={{ uri: pet.image }} style={styles.heroImage} />
            <View style={styles.heroBody}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroName}>{pet.name}</Text>
                <View style={styles.genderPill}>
                  {pet.gender === 'male' ? (
                    <Mars size={12} color="#5f7874" strokeWidth={2.2} />
                  ) : (
                    <Venus size={12} color="#5f7874" strokeWidth={2.2} />
                  )}
                  <Text style={styles.genderText}>{pet.gender === 'male' ? (isTr ? 'Erkek' : 'Male') : (isTr ? 'Disi' : 'Female')}</Text>
                </View>
              </View>
              <Text style={styles.heroBreed}>{pet.breed}</Text>
              <Text style={styles.heroMeta}>{formatAge(pet.birthDate, isTr)}</Text>
              {pet.microchip ? (
                <View style={styles.chipPill}>
                  <Text style={styles.chipText}>Chip {pet.microchip}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{isTr ? 'KILO' : 'WEIGHT'}</Text>
            <Pressable
              onPress={onOpenWeightTracking}
              style={({ pressed }) => [styles.sectionCard, styles.weightCardPressable, pressed && styles.weightCardPressed]}
            >
              <View style={styles.weightRow}>
                <View style={styles.weightLeft}>
                  <Text style={styles.weightValue}>
                    {currentKg != null ? `${currentKg.toFixed(1)} kg` : '-'}
                  </Text>
                  {goalRatio != null ? (
                    <Text style={[styles.goalLabel, { color: onTarget ? '#4c8a66' : '#c56767' }]}>
                      {isTr ? `Hedef: ${weightGoal!.toFixed(1)} kg` : `Goal: ${weightGoal!.toFixed(1)} kg`}
                    </Text>
                  ) : (
                    <Text style={styles.goalLabel}>{isTr ? 'Hedef belirlenmemis' : 'No goal set'}</Text>
                  )}
                </View>
                {goalRatio != null ? (
                  <View style={styles.goalProgress}>
                    <View style={styles.goalBadge}>
                      <Text style={styles.goalBadgeText}>
                        {onTarget ? (isTr ? 'Dengede' : 'On track') : (isTr ? 'Izleniyor' : 'Tracking')}
                      </Text>
                    </View>
                    <View style={styles.goalTrack}>
                      <View
                        style={[
                          styles.goalFill,
                          {
                            width: `${Math.round(goalRatio * 100)}%`,
                            backgroundColor: onTarget ? '#66a07c' : '#c96a6a',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.goalPercent}>{goalDisplayPct}%</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>

          <Section title={isTr ? 'ASILAR' : 'VACCINATIONS'}>
            <InfoRow
              label={isTr ? 'Kayıtlı aşı' : 'Recorded vaccines'}
              value={vaccineCount > 0 ? String(vaccineCount) : (isTr ? 'Kayıt yok' : 'None')}
            />
            {lastVaccine ? (
              <InfoRow
                label={isTr ? 'Son asi' : 'Latest vaccine'}
                value={`${lastVaccine.name} - ${fmtDate(lastVaccine.date, isTr)}`}
              />
            ) : null}
          </Section>

          {(hasAllergies || hasDiabetes || surgeryCount > 0) ? (
            <Section title={isTr ? 'SAGLIK DURUMU' : 'HEALTH CONDITIONS'}>
              {hasAllergies ? (
                <View style={styles.conditionRow}>
                  <View style={[styles.conditionDot, { backgroundColor: '#c97b3a' }]} />
                  <Text style={styles.conditionText}>{isTr ? 'Alerji kaydi mevcut' : 'Allergy records present'}</Text>
                </View>
              ) : null}
              {hasDiabetes ? (
                <View style={styles.conditionRow}>
                  <View style={[styles.conditionDot, { backgroundColor: '#3a7ac9' }]} />
                  <Text style={styles.conditionText}>{isTr ? 'Diyabet kaydi mevcut' : 'Diabetes records present'}</Text>
                </View>
              ) : null}
              {surgeryCount > 0 ? (
                <InfoRow label={isTr ? 'Ameliyat kaydi' : 'Surgeries'} value={String(surgeryCount)} />
              ) : null}
              <NavRow label={isTr ? 'Sağlık kayıtlarına git' : 'View health records'} onPress={onOpenHealthRecords} />
            </Section>
          ) : null}

          <Section title={isTr ? 'RUTIN BAKIM' : 'ROUTINE CARE'}>
            <View style={styles.routineRow}>
              <View style={styles.routineLeft}>
                <Text style={styles.routineTitle}>{isTr ? 'Ic Parazit' : 'Internal Parasite'}</Text>
                {pet.routineCare.internalParasite.lastDate ? (
                  <Text style={styles.routineSub}>{isTr ? 'Son: ' : 'Last: '}{fmtDate(pet.routineCare.internalParasite.lastDate, isTr)}</Text>
                ) : null}
              </View>
              <View style={styles.routineRight}>
                <Text style={[styles.routineDue, { color: routineDueColor(pet.routineCare.internalParasite) }]}>
                  {nextRoutineDue(pet.routineCare.internalParasite, isTr)}
                </Text>
                {pet.routineCare.internalParasite.enabled ? (
                  <Text style={styles.routineInterval}>
                    {isTr ? `Her ${pet.routineCare.internalParasite.intervalDays} gun` : `Every ${pet.routineCare.internalParasite.intervalDays}d`}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.routineDivider} />

            <View style={styles.routineRow}>
              <View style={styles.routineLeft}>
                <Text style={styles.routineTitle}>{isTr ? 'Dis Parazit' : 'External Parasite'}</Text>
                {pet.routineCare.externalParasite.lastDate ? (
                  <Text style={styles.routineSub}>{isTr ? 'Son: ' : 'Last: '}{fmtDate(pet.routineCare.externalParasite.lastDate, isTr)}</Text>
                ) : null}
              </View>
              <View style={styles.routineRight}>
                <Text style={[styles.routineDue, { color: routineDueColor(pet.routineCare.externalParasite) }]}>
                  {nextRoutineDue(pet.routineCare.externalParasite, isTr)}
                </Text>
                {pet.routineCare.externalParasite.enabled ? (
                  <Text style={styles.routineInterval}>
                    {isTr ? `Her ${pet.routineCare.externalParasite.intervalDays} gun` : `Every ${pet.routineCare.externalParasite.intervalDays}d`}
                  </Text>
                ) : null}
              </View>
            </View>
          </Section>

          <Section title={isTr ? 'HIZLI ERISIM' : 'QUICK ACCESS'}>
            <NavRow label={isTr ? 'Veteriner Ziyaretleri' : 'Vet Visits'} onPress={onOpenVetVisits} />
            <View style={styles.navDivider} />
            <NavRow label={isTr ? 'Sağlık Kayıtları' : 'Health Records'} onPress={onOpenHealthRecords} />
            <View style={styles.navDivider} />
            <NavRow label={isTr ? 'Kilo Takibi' : 'Weight Tracking'} onPress={onOpenWeightTracking} />
          </Section>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#cdefe7',
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 332,
    gap: 16,
  },
  headerBlock: {
    marginBottom: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(74,108,103,0.14)',
    shadowColor: '#6f8f89',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  iconGhost: {
    width: 42,
    height: 42,
  },
  headerEyebrow: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(39,86,81,0.82)',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  screenTitle: {
    fontSize: 33,
    lineHeight: 37,
    fontWeight: '700',
    color: '#163c39',
    letterSpacing: -0.7,
  },
  heroCard: {
    backgroundColor: 'rgba(248,251,250,0.76)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    padding: 18,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#163a36',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroImage: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#ececec',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  heroBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#163c39',
    letterSpacing: -0.7,
  },
  genderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(132,161,154,0.18)',
  },
  genderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5f7874',
  },
  heroBreed: {
    fontSize: 15,
    color: '#5d716e',
    fontWeight: '500',
  },
  heroMeta: {
    fontSize: 13,
    color: '#7c8e8b',
    fontWeight: '500',
  },
  chipPill: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(132,161,154,0.14)',
  },
  chipText: {
    fontSize: 11,
    color: '#60716d',
    fontWeight: '600',
  },
  section: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 4,
    marginTop: 2,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(108,145,138,0.18)',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: '#80908b',
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: 'rgba(251,253,252,0.86)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    overflow: 'hidden',
    shadowColor: '#173b37',
    shadowOpacity: 0.055,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  weightCardPressable: {
    overflow: 'hidden',
  },
  weightCardPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.97,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 14,
  },
  weightLeft: {
    gap: 4,
  },
  weightValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#20393a',
    letterSpacing: -1,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7b8783',
  },
  goalProgress: {
    flex: 1,
    maxWidth: 122,
    gap: 8,
    alignItems: 'flex-end',
  },
  goalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(126,154,147,0.16)',
  },
  goalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#55736c',
  },
  goalTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(34,57,55,0.09)',
    overflow: 'hidden',
  },
  goalFill: {
    height: 8,
    borderRadius: 999,
  },
  goalPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#70827d',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,50,48,0.04)',
  },
  infoLabel: {
    fontSize: 14,
    color: '#657572',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f3534',
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  navRowText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#20393a',
  },
  navDivider: {
    height: 1,
    backgroundColor: 'rgba(30,50,48,0.04)',
    marginHorizontal: 18,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,50,48,0.04)',
  },
  conditionDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#405250',
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  routineLeft: {
    flex: 1,
    gap: 3,
  },
  routineRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  routineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#20393a',
  },
  routineSub: {
    fontSize: 12,
    color: '#7f8c88',
    fontWeight: '500',
  },
  routineDue: {
    fontSize: 14,
    fontWeight: '700',
  },
  routineInterval: {
    fontSize: 11,
    color: '#86948f',
    fontWeight: '500',
  },
  routineDivider: {
    height: 1,
    backgroundColor: 'rgba(30,50,48,0.05)',
    marginHorizontal: 18,
  },
});
