import type { Locale } from '../hooks/useLocale';

const dict = {
  en: {
    settings: 'Settings',
    preferences: 'Preferences',
    language: 'Language',
    english: 'English',
    turkish: 'Turkish',
    notifications: 'Notifications',
    theme: 'Theme',
    system: 'System',
    on: 'On',
    dataIntegrity: 'Data Integrity',
    dataIntegrityDesc: "Pet identity fields (Pet Type, Gender, Breed, Coat Pattern, Age) are managed from each pet's Edit screen with confirmation prompts.",
    chooseLanguage: 'Choose Language',
    chooseLanguageDesc: 'Apply language for the whole app?',
    cancel: 'Cancel',
    saveAndExit: 'Save and Exit',
    saving: 'Saving...',
    weightUnit: 'Weight Unit',
    weightUnitDesc: 'Choose the unit used in all weight views.',
    kilograms: 'Kilograms (kg)',
    pounds: 'Pounds (lb)',
    dateFormat: 'Date Format',
    dateFormatDesc: 'Choose how dates are shown in the app.',
    dateFormatDmy: 'DD.MM.YYYY',
    dateFormatMdy: 'MM/DD/YYYY',
  },
  tr: {
    settings: 'Ayarlar',
    preferences: 'Tercihler',
    language: 'Dil',
    english: 'İngilizce',
    turkish: 'Türkçe',
    notifications: 'Bildirimler',
    theme: 'Tema',
    system: 'Sistem',
    on: 'Açık',
    dataIntegrity: 'Veri Bütünlüğü',
    dataIntegrityDesc: 'Hayvan kimlik alanları (Tür, Cinsiyet, Irk, Pattern, Yaş) her hayvanın Düzenle ekranından onay adımıyla yönetilir.',
    chooseLanguage: 'Dil Seçimi',
    chooseLanguageDesc: 'Seçilen dil uygulamanın geneline uygulansın mı?',
    cancel: 'İptal',
    saveAndExit: 'Kaydet ve Çık',
    saving: 'Kaydediliyor...',
    weightUnit: 'Ağırlık Birimi',
    weightUnitDesc: 'Tüm kilo ekranlarında kullanılacak birimi seçin.',
    kilograms: 'Kilogram (kg)',
    pounds: 'Pound (lb)',
    dateFormat: 'Tarih Biçimi',
    dateFormatDesc: 'Uygulamadaki tarih görünümünü seçin.',
    dateFormatDmy: 'GG.AA.YYYY',
    dateFormatMdy: 'AA/GG/YYYY',
  },
} as const;

type DictKey = keyof typeof dict.en;

export function t(locale: Locale, key: DictKey) {
  return dict[locale][key] ?? dict.en[key];
}
