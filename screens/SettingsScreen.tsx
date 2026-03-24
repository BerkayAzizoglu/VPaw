import React, { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { useAppSettings } from '../hooks/useAppSettings';
import type { DateFormat, WeightUnit } from '../hooks/useAppSettings';
import { t } from '../lib/i18n';

type SettingsScreenProps = {
  onBack: () => void;
};

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { locale, setLocale } = useLocale();
  const { settings, setSettings } = useAppSettings();

  const [draftLocale, setDraftLocale] = useState(locale);
  const [draftWeightUnit, setDraftWeightUnit] = useState<WeightUnit>(settings.weightUnit);
  const [draftDateFormat, setDraftDateFormat] = useState<DateFormat>(settings.dateFormat);
  const [draftNotifications, setDraftNotifications] = useState<boolean>(settings.notificationsEnabled);
  const [saving, setSaving] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const swipePanResponder = useEdgeSwipeBack({ onBack, enabled: !confirmVisible });

  const languageValue = draftLocale === 'tr' ? t(locale, 'turkish') : t(locale, 'english');
  const weightUnitValue = draftWeightUnit === 'kg' ? t(locale, 'kilograms') : t(locale, 'pounds');
  const dateFormatValue = draftDateFormat === 'dmy' ? t(locale, 'dateFormatDmy') : t(locale, 'dateFormatMdy');

  const hasChanges = useMemo(() => {
    return (
      draftLocale !== locale ||
      draftWeightUnit !== settings.weightUnit ||
      draftDateFormat !== settings.dateFormat ||
      draftNotifications !== settings.notificationsEnabled
    );
  }, [draftDateFormat, draftLocale, draftNotifications, draftWeightUnit, locale, settings.dateFormat, settings.notificationsEnabled, settings.weightUnit]);

  const openLanguagePicker = () => {
    Alert.alert(
      t(locale, 'chooseLanguage'),
      t(locale, 'chooseLanguageDesc'),
      [
        { text: t(locale, 'cancel'), style: 'cancel' },
        { text: t(locale, 'english'), onPress: () => { setDraftLocale('en'); void setLocale('en'); } },
        { text: t(locale, 'turkish'), onPress: () => { setDraftLocale('tr'); void setLocale('tr'); } },
      ],
    );
  };

  const openWeightUnitPicker = () => {
    Alert.alert(
      t(locale, 'weightUnit'),
      t(locale, 'weightUnitDesc'),
      [
        { text: t(locale, 'cancel'), style: 'cancel' },
        { text: t(locale, 'kilograms'), onPress: () => setDraftWeightUnit('kg') },
        { text: t(locale, 'pounds'), onPress: () => setDraftWeightUnit('lb') },
      ],
    );
  };

  const openDateFormatPicker = () => {
    Alert.alert(
      t(locale, 'dateFormat'),
      t(locale, 'dateFormatDesc'),
      [
        { text: t(locale, 'cancel'), style: 'cancel' },
        { text: t(locale, 'dateFormatDmy'), onPress: () => setDraftDateFormat('dmy') },
        { text: t(locale, 'dateFormatMdy'), onPress: () => setDraftDateFormat('mdy') },
      ],
    );
  };

  const openReminderControls = () => {
    Alert.alert(
      locale === 'tr' ? 'Hatırlatıcı Kontrolleri' : 'Reminder Controls',
      locale === 'tr' ? 'Bu alandan hangi hatırlatıcı türlerinin bildirim üreteceğini yöneteceksiniz. (Yakında)' : 'You will manage reminder trigger categories from here. (Coming soon)',
    );
  };

  const openDataPrivacy = () => {
    Alert.alert(
      locale === 'tr' ? 'Veri ve Gizlilik' : 'Data & Privacy',
      locale === 'tr' ? 'Gizlilik, izinler ve veri kullanım detayları yakında bu ekranda olacak.' : 'Privacy, permissions, and data usage details will be available here soon.',
    );
  };

  const openDataDownload = () => {
    Alert.alert(
      locale === 'tr' ? 'Veri Dışa Aktarma' : 'Export / Data Download',
      locale === 'tr' ? 'Hesap verisi dışa aktarma akışı yakında eklenecek.' : 'Account data export flow will be available soon.',
    );
  };

  const performSaveAndExit = async () => {
    setSaving(true);
    await setSettings({
      weightUnit: draftWeightUnit,
      dateFormat: draftDateFormat,
      notificationsEnabled: draftNotifications,
    });
    await setLocale(draftLocale);
    setSaving(false);
    onBack();
  };

  const saveAndExit = async () => {
    if (!hasChanges) {
      onBack();
      return;
    }
    setConfirmVisible(true);
  };

  return (
    <View style={styles.screen} {...swipePanResponder.panHandlers}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <ChevronLeft size={20} color="#5b5b5b" strokeWidth={2.4} />
          </Pressable>

          <Text style={styles.title}>{t(locale, 'settings')}</Text>

          <Pressable style={[styles.saveBtn, hasChanges && !saving && styles.saveBtnActive, (!hasChanges || saving) && styles.saveBtnDisabled]} onPress={saveAndExit} disabled={!hasChanges || saving}>
            <Text style={[styles.saveBtnText, hasChanges && !saving && styles.saveBtnTextActive]}>
              {saving ? (locale === 'tr' ? 'Kaydediliyor…' : 'Saving…') : (locale === 'tr' ? 'Kaydet' : 'Save')}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>{locale === 'tr' ? 'BİLDİRİMLER' : 'NOTIFICATIONS'}</Text>
        <Text style={styles.sectionDescription}>{locale === 'tr' ? 'Hatırlatma ve alarm davranışını buradan yönet.' : 'Control reminders and alert behavior.'}</Text>
        <View style={styles.card}>
          <Row
            label={locale === 'tr' ? 'Bildirimler' : 'Notifications'}
            value={draftNotifications ? t(locale, 'on') : (locale === 'tr' ? 'Kapalı' : 'Off')}
            onPress={() => setDraftNotifications((prev) => !prev)}
          />
          <Row
            label={locale === 'tr' ? 'Hatırlatıcı kontrolleri' : 'Reminder controls'}
            value={locale === 'tr' ? 'Yönet' : 'Manage'}
            noBorder
            onPress={openReminderControls}
          />
        </View>

        <Text style={styles.sectionTitle}>{locale === 'tr' ? 'BİRİMLER VE BÖLGE' : 'UNITS & REGION'}</Text>
        <Text style={styles.sectionDescription}>{locale === 'tr' ? 'Görüntüleme birimleri ve tarih tercihi.' : 'Display units and date formatting.'}</Text>
        <View style={styles.card}>
          <Row label={t(locale, 'language')} value={languageValue} onPress={openLanguagePicker} />
          <Row label={t(locale, 'weightUnit')} value={weightUnitValue} onPress={openWeightUnitPicker} />
          <Row label={t(locale, 'dateFormat')} value={dateFormatValue} noBorder onPress={openDateFormatPicker} />
        </View>

        <Text style={styles.sectionTitle}>{locale === 'tr' ? 'VERİ VE GİZLİLİK' : 'DATA & PRIVACY'}</Text>
        <Text style={styles.sectionDescription}>{locale === 'tr' ? 'Hesap verisi, dışa aktarma ve gizlilik kontrolleri.' : 'Account data, export, and privacy controls.'}</Text>
        <View style={styles.card}>
          <Row label={locale === 'tr' ? 'Veri ve gizlilik' : 'Data & privacy'} value={locale === 'tr' ? 'İncele' : 'Review'} onPress={openDataPrivacy} />
          <Row label={locale === 'tr' ? 'Dışa aktar / veri indir' : 'Export / data download'} value={locale === 'tr' ? 'Aç' : 'Open'} noBorder onPress={openDataDownload} />
        </View>

        <Text style={styles.sectionTitle}>{t(locale, 'dataIntegrity')}</Text>
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>{t(locale, 'dataIntegrityDesc')}</Text>
        </View>
      </ScrollView>

      <Modal transparent visible={confirmVisible} animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{locale === 'tr' ? 'Değişiklikleri onaylıyor musunuz?' : 'Confirm changes?'}</Text>
            <Text style={styles.confirmBody}>{locale === 'tr' ? 'Ayarlar kaydedilecek ve bu ekrandan çıkılacak.' : 'Your preferences will be saved and you will exit this screen.'}</Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmSecondaryBtn} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.confirmSecondaryText}>{t(locale, 'cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmPrimaryBtn, saving && styles.confirmPrimaryBtnDisabled]}
                disabled={saving}
                onPress={async () => {
                  setConfirmVisible(false);
                  await performSaveAndExit();
                }}
              >
                <Text style={styles.confirmPrimaryText}>{saving ? t(locale, 'saving') : (locale === 'tr' ? 'Kaydet ve Çık' : 'Save & Exit')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value, noBorder, onPress }: { label: string; value: string; noBorder?: boolean; onPress?: () => void }) {
  return (
    <Pressable style={[styles.row, noBorder && styles.noBorder]} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={styles.value}>{value}</Text>
        <ChevronRight size={16} color="#b4b4b4" strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf9f8' },
  content: {
    paddingHorizontal: 22,
    paddingTop: 58,
    paddingBottom: 28,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  saveBtn: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeeee8',
  },
  saveBtnActive: {
    backgroundColor: '#47664a',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9a9c95',
  },
  saveBtnTextActive: {
    color: '#fff',
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16,16,16,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  confirmTitle: {
    fontSize: 17,
    lineHeight: 22,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  confirmBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#6f6f6f',
    fontWeight: '500',
  },
  confirmActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmSecondaryBtn: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f3f1',
  },
  confirmSecondaryText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4b4b4b',
    fontWeight: '700',
  },
  confirmPrimaryBtn: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d2d2d',
  },
  confirmPrimaryBtnDisabled: {
    opacity: 0.65,
  },
  confirmPrimaryText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#fff',
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.6,
    color: '#787878',
    fontWeight: '800',
  },
  sectionDescription: {
    marginTop: -8,
    marginLeft: 4,
    marginBottom: 2,
    fontSize: 12,
    lineHeight: 17,
    color: '#8a8a8a',
    fontWeight: '500',
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
  },
  row: {
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  noBorder: { borderBottomWidth: 0 },
  label: {
    fontSize: 15,
    lineHeight: 20,
    color: '#2d2d2d',
    fontWeight: '600',
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 14,
    lineHeight: 19,
    color: '#7a7a7a',
    fontWeight: '600',
  },
  noticeCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6f6f6f',
    fontWeight: '500',
  },
});
