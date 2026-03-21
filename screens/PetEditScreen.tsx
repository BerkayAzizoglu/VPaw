import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Check, ChevronRight, PawPrint, Pencil } from 'lucide-react-native';
import type { AllergyRecord, DiabetesRecord, PetProfile, SurgeryRecord, VaccinationRecord } from '../components/AuthGate';
import { useLocale } from '../hooks/useLocale';

type PetEditScreenProps = {
  pet: PetProfile;
  onBack: () => void;
  onSaved: (pet: PetProfile) => void;
};

type PickerField = 'name' | 'petType' | 'gender' | 'breed' | 'coatPattern' | 'birthDate' | 'vaccines' | 'surgeries' | 'allergies' | 'diabetes' | 'photo' | null;

const logoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;

const CAT_BREEDS = [
  'Abyssinian',
  'American Bobtail',
  'American Curl',
  'American Shorthair',
  'Balinese',
  'Bengal',
  'Birman',
  'Bombay',
  'British Longhair',
  'British Shorthair',
  'Burmese',
  'Burmilla',
  'Chartreux',
  'Cornish Rex',
  'Devon Rex',
  'Egyptian Mau',
  'European Shorthair',
  'Exotic Shorthair',
  'Himalayan',
  'Japanese Bobtail',
  'Korat',
  'LaPerm',
  'Maine Coon',
  'Manx',
  'Munchkin',
  'Nebelung',
  'Norwegian Forest',
  'Ocicat',
  'Oriental Shorthair',
  'Persian',
  'Ragdoll',
  'Russian Blue',
  'Savannah',
  'Scottish Fold',
  'Selkirk Rex',
  'Siamese',
  'Siberian',
  'Singapura',
  'Snowshoe',
  'Somali',
  'Sphynx',
  'Tonkinese',
  'Turkish Angora',
  'Turkish Van',
  'Other',
];

const DOG_BREEDS = [
  'Afghan Hound',
  'Airedale Terrier',
  'Akbash',
  'Akita',
  'Alaskan Malamute',
  'Anatolian Shepherd',
  'Australian Cattle Dog',
  'Australian Shepherd',
  'Basenji',
  'Basset Hound',
  'Beagle',
  'Belgian Malinois',
  'Bernese Mountain Dog',
  'Bichon Frise',
  'Border Collie',
  'Boston Terrier',
  'Boxer',
  'Bull Terrier',
  'Bulldog',
  'Cane Corso',
  'Cavalier King Charles Spaniel',
  'Chihuahua',
  'Chow Chow',
  'Cocker Spaniel',
  'Collie',
  'Dachshund',
  'Dalmatian',
  'Doberman Pinscher',
  'English Setter',
  'French Bulldog',
  'German Shepherd',
  'German Shorthaired Pointer',
  'Golden Retriever',
  'Great Dane',
  'Great Pyrenees',
  'Greyhound',
  'Havanese',
  'Irish Setter',
  'Jack Russell Terrier',
  'Kangal',
  'Labrador Retriever',
  'Maltese',
  'Miniature Schnauzer',
  'Newfoundland',
  'Pembroke Welsh Corgi',
  'Pit Bull Terrier',
  'Pointer',
  'Pomeranian',
  'Poodle',
  'Pug',
  'Rottweiler',
  'Saint Bernard',
  'Samoyed',
  'Shiba Inu',
  'Shih Tzu',
  'Siberian Husky',
  'Weimaraner',
  'Whippet',
  'Yorkshire Terrier',
  'Other',
];

const CAT_COAT_PATTERNS = [
  'Tabby',
  'Calico',
  'Bicolor',
  'Tuxedo (Smokin)',
  'Tortoiseshell',
  'Pointed',
  'Solid',
  'Other',
];

const DOG_COAT_PATTERNS = [
  'Solid',
  'Bicolor',
  'Tricolor',
  'Brindle',
  'Merle',
  'Sable',
  'Parti',
  'Spotted',
  'Other',
];

const CAT_DEFAULT_PATTERNS = ['Tabby', 'Calico', 'Bicolor', 'Tuxedo (Smokin)', 'Tortoiseshell', 'Solid', 'Other'];
const DOG_DEFAULT_PATTERNS = ['Solid', 'Bicolor', 'Tricolor', 'Brindle', 'Sable', 'Parti', 'Spotted', 'Other'];

const CAT_PATTERN_OVERRIDES: Record<string, string[]> = {
  'Balinese': ['Pointed', 'Bicolor', 'Solid', 'Other'],
  'Birman': ['Pointed', 'Bicolor', 'Solid', 'Other'],
  'Bengal': ['Tabby', 'Bicolor', 'Solid', 'Other'],
  'Bombay': ['Solid', 'Other'],
  'Chartreux': ['Solid', 'Other'],
  'Egyptian Mau': ['Tabby', 'Solid', 'Bicolor', 'Other'],
  'Himalayan': ['Pointed', 'Solid', 'Bicolor', 'Other'],
  'Korat': ['Solid', 'Other'],
  'Ocicat': ['Tabby', 'Bicolor', 'Solid', 'Other'],
  'Oriental Shorthair': ['Solid', 'Tabby', 'Bicolor', 'Pointed', 'Other'],
  'Ragdoll': ['Pointed', 'Bicolor', 'Tabby', 'Solid', 'Other'],
  'Russian Blue': ['Solid', 'Other'],
  'Savannah': ['Tabby', 'Bicolor', 'Solid', 'Other'],
  'Siamese': ['Pointed', 'Solid', 'Other'],
  'Snowshoe': ['Pointed', 'Bicolor', 'Solid', 'Other'],
  'Sphynx': ['Solid', 'Bicolor', 'Pointed', 'Other'],
  'Tonkinese': ['Pointed', 'Solid', 'Bicolor', 'Other'],
  'Turkish Van': ['Bicolor', 'Tabby', 'Solid', 'Other'],
};

const DOG_PATTERN_OVERRIDES: Record<string, string[]> = {
  'Afghan Hound': ['Solid', 'Bicolor', 'Other'],
  'Akbash': ['Solid', 'Other'],
  'Akita': ['Solid', 'Bicolor', 'Brindle', 'Other'],
  'Alaskan Malamute': ['Solid', 'Bicolor', 'Tricolor', 'Other'],
  'Anatolian Shepherd': ['Solid', 'Bicolor', 'Brindle', 'Other'],
  'Australian Cattle Dog': ['Bicolor', 'Tricolor', 'Solid', 'Other'],
  'Australian Shepherd': ['Merle', 'Tricolor', 'Bicolor', 'Solid', 'Other'],
  'Basenji': ['Bicolor', 'Tricolor', 'Solid', 'Other'],
  'Basset Hound': ['Bicolor', 'Tricolor', 'Solid', 'Other'],
  'Beagle': ['Bicolor', 'Tricolor', 'Other'],
  'Belgian Malinois': ['Solid', 'Bicolor', 'Other'],
  'Bernese Mountain Dog': ['Tricolor', 'Bicolor', 'Other'],
  'Bichon Frise': ['Solid', 'Bicolor', 'Other'],
  'Border Collie': ['Bicolor', 'Tricolor', 'Merle', 'Solid', 'Other'],
  'Boston Terrier': ['Bicolor', 'Brindle', 'Solid', 'Other'],
  'Boxer': ['Brindle', 'Bicolor', 'Solid', 'Other'],
  'Bull Terrier': ['Solid', 'Bicolor', 'Brindle', 'Other'],
  'Bulldog': ['Bicolor', 'Brindle', 'Solid', 'Other'],
  'Cane Corso': ['Solid', 'Brindle', 'Bicolor', 'Other'],
  'Cavalier King Charles Spaniel': ['Tricolor', 'Bicolor', 'Solid', 'Other'],
  'Chihuahua': ['Solid', 'Bicolor', 'Tricolor', 'Brindle', 'Merle', 'Other'],
  'Chow Chow': ['Solid', 'Bicolor', 'Other'],
  'Cocker Spaniel': ['Solid', 'Bicolor', 'Tricolor', 'Parti', 'Other'],
  'Collie': ['Sable', 'Tricolor', 'Merle', 'Bicolor', 'Other'],
  'Dachshund': ['Solid', 'Bicolor', 'Brindle', 'Other'],
  'Dalmatian': ['Spotted', 'Other'],
  'Doberman Pinscher': ['Solid', 'Bicolor', 'Other'],
  'English Setter': ['Parti', 'Bicolor', 'Tricolor', 'Other'],
  'French Bulldog': ['Solid', 'Brindle', 'Bicolor', 'Other'],
  'German Shepherd': ['Sable', 'Bicolor', 'Solid', 'Other'],
  'German Shorthaired Pointer': ['Spotted', 'Solid', 'Bicolor', 'Other'],
  'Golden Retriever': ['Solid', 'Other'],
  'Great Dane': ['Solid', 'Brindle', 'Bicolor', 'Merle', 'Other'],
  'Great Pyrenees': ['Solid', 'Other'],
  'Greyhound': ['Solid', 'Bicolor', 'Brindle', 'Other'],
  'Havanese': ['Solid', 'Bicolor', 'Parti', 'Other'],
  'Irish Setter': ['Solid', 'Other'],
  'Jack Russell Terrier': ['Bicolor', 'Tricolor', 'Solid', 'Other'],
  'Kangal': ['Solid', 'Bicolor', 'Other'],
  'Labrador Retriever': ['Solid', 'Other'],
  'Maltese': ['Solid', 'Other'],
  'Miniature Schnauzer': ['Solid', 'Bicolor', 'Other'],
  'Newfoundland': ['Solid', 'Bicolor', 'Other'],
  'Pembroke Welsh Corgi': ['Bicolor', 'Tricolor', 'Merle', 'Solid', 'Other'],
  'Pit Bull Terrier': ['Solid', 'Bicolor', 'Brindle', 'Tricolor', 'Other'],
  'Pointer': ['Solid', 'Bicolor', 'Spotted', 'Other'],
  'Pomeranian': ['Solid', 'Bicolor', 'Merle', 'Other'],
  'Poodle': ['Solid', 'Parti', 'Bicolor', 'Other'],
  'Pug': ['Solid', 'Bicolor', 'Other'],
  'Rottweiler': ['Bicolor', 'Other'],
  'Saint Bernard': ['Bicolor', 'Tricolor', 'Other'],
  'Samoyed': ['Solid', 'Other'],
  'Shiba Inu': ['Solid', 'Bicolor', 'Other'],
  'Shih Tzu': ['Solid', 'Bicolor', 'Parti', 'Other'],
  'Siberian Husky': ['Bicolor', 'Tricolor', 'Solid', 'Other'],
  'Weimaraner': ['Solid', 'Other'],
  'Whippet': ['Solid', 'Bicolor', 'Brindle', 'Other'],
  'Yorkshire Terrier': ['Solid', 'Bicolor', 'Other'],
};

function buildBreedPatternMap(allBreeds: string[], defaults: string[], overrides: Record<string, string[]>) {
  const result: Record<string, string[]> = {};
  allBreeds.filter((breed) => breed !== 'Other').forEach((breed) => {
    const raw = overrides[breed] ?? defaults;
    const unique = Array.from(new Set(raw));
    result[breed] = unique.includes('Other') ? unique : [...unique, 'Other'];
  });
  return result;
}

const CAT_BREED_PATTERN_MAP = buildBreedPatternMap(CAT_BREEDS, CAT_DEFAULT_PATTERNS, CAT_PATTERN_OVERRIDES);
const DOG_BREED_PATTERN_MAP = buildBreedPatternMap(DOG_BREEDS, DOG_DEFAULT_PATTERNS, DOG_PATTERN_OVERRIDES);

function getCoatPatternOptions(petType: 'Dog' | 'Cat', breed: string) {
  const base = petType === 'Cat' ? CAT_COAT_PATTERNS : DOG_COAT_PATTERNS;
  if (breed === 'Other') return base;
  const map = petType === 'Cat' ? CAT_BREED_PATTERN_MAP : DOG_BREED_PATTERN_MAP;
  const specific = map[breed];
  if (!specific) return ['Other'];
  const validBase = new Set(base);
  return specific.filter((pattern) => validBase.has(pattern));
}

const CAT_PHOTOS = [
  'https://images.unsplash.com/photo-1511044568932-338cba0ad803?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494256997604-768d1f608cac?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?q=80&w=800&auto=format&fit=crop',
];

const DOG_PHOTOS = [
  'https://www.figma.com/api/mcp/asset/6f25c37a-f633-4891-ba3b-0fab066dac17',
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=800&auto=format&fit=crop',
];

const DOG_VACCINES = ['Bordetella', 'Canine Influenza', 'DHPP', 'Leptospirosis', 'Lyme', 'Rabies'];
const CAT_VACCINES = ['Bordetella', 'Chlamydia felis', 'FeLV', 'FVRCP', 'Rabies'];

const SURGERY_OPTIONS = [
  'C-section',
  'Dental procedure',
  'Ear surgery',
  'Eye surgery',
  'Gastrointestinal surgery',
  'Mass removal',
  'Orthopedic surgery',
  'Spay/Neuter',
  'Other',
];

const ALLERGY_OPTIONS = ['Contact', 'Drug', 'Dust', 'Flea bite', 'Food', 'Mold', 'Other', 'Pollen'];
const DIABETES_OPTIONS = ['Type 1', 'Type 2', 'Other'];

function parseBirthDate(value: string) {
  const parts = value.split('-').map((v) => Number(v));
  return {
    year: Number.isFinite(parts[0]) ? parts[0] : 2024,
    month: Number.isFinite(parts[1]) ? parts[1] : 1,
    day: Number.isFinite(parts[2]) ? parts[2] : 1,
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function clampBirthDateParts(parts: { year: number; month: number; day: number }) {
  const maxDay = daysInMonth(parts.year, parts.month);
  return { ...parts, day: Math.min(parts.day, maxDay) };
}

function toBirthDateIso(parts: { year: number; month: number; day: number }) {
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return String(parts.year) + '-' + mm + '-' + dd;
}

function getAgePartsFromBirthDate(value: string, now = new Date()) {
  const birth = parseBirthDate(value);
  let years = now.getFullYear() - birth.year;
  let months = now.getMonth() + 1 - birth.month;
  const dayDiff = now.getDate() - birth.day;

  if (dayDiff < 0) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  years = Math.max(0, years);
  months = Math.max(0, months);
  return { years, months };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatAgeLabel(value: string) {
  const age = getAgePartsFromBirthDate(value);
  return String(age.years) + ' years ' + String(age.months) + ' months';
}

function formatBirthDateLabel(value: string) {
  const parts = parseBirthDate(value);
  const dd = String(parts.day).padStart(2, '0');
  const mm = String(parts.month).padStart(2, '0');
  return dd + '.' + mm + '.' + String(parts.year);
}

function sortAlpha(items: string[]) {
  const hasOther = items.includes('Other');
  const core = items.filter((i) => i !== 'Other').sort((a, b) => a.localeCompare(b));
  return hasOther ? [...core, 'Other'] : core;
}

export default function PetEditScreen({ pet, onBack, onSaved }: PetEditScreenProps) {
  const [fontsLoaded] = useFonts({ Nunito_600SemiBold, Montserrat_700Bold });
  const { locale } = useLocale();
  const isTr = locale === 'tr';
  const [draft, setDraft] = useState<PetProfile>(pet);
  const [pickerField, setPickerField] = useState<PickerField>(null);
  const [birthPicker, setBirthPicker] = useState(() => parseBirthDate(pet.birthDate));
  const [otherSurgeryText, setOtherSurgeryText] = useState('');
  const [otherDiabetesText, setOtherDiabetesText] = useState('');
  const [nameDraft, setNameDraft] = useState(pet.name);

  useEffect(() => {
    setDraft(pet);
    setBirthPicker(parseBirthDate(pet.birthDate));
    setNameDraft(pet.name);
  }, [pet]);

  const breedOptions = useMemo(() => sortAlpha(draft.petType === 'Cat' ? CAT_BREEDS : DOG_BREEDS), [draft.petType]);
  const coatPatternOptions = useMemo(() => sortAlpha(getCoatPatternOptions(draft.petType, draft.breed)), [draft.petType, draft.breed]);
  const photoOptions = useMemo(() => (draft.petType === 'Cat' ? CAT_PHOTOS : DOG_PHOTOS), [draft.petType]);
  const vaccineOptions = useMemo(() => sortAlpha(draft.petType === 'Cat' ? CAT_VACCINES : DOG_VACCINES), [draft.petType]);

  const pickerItems = useMemo(() => {
    if (pickerField === 'petType') return ['Cat', 'Dog'];
    if (pickerField === 'gender') return ['Male', 'Female'];
    if (pickerField === 'breed') return breedOptions;
    if (pickerField === 'coatPattern') return coatPatternOptions;
    if (pickerField === 'vaccines') return vaccineOptions;
    if (pickerField === 'surgeries') return sortAlpha(SURGERY_OPTIONS);
    if (pickerField === 'allergies') return sortAlpha(ALLERGY_OPTIONS);
    if (pickerField === 'diabetes') return sortAlpha(DIABETES_OPTIONS);
    if (pickerField === 'photo') return photoOptions;
    return [] as string[];
  }, [pickerField, breedOptions, coatPatternOptions, photoOptions, vaccineOptions]);

  const getNextDraft = (prev: PetProfile, field: Exclude<PickerField, null>, value: string): PetProfile => {
    if (field === 'name') return { ...prev, name: value.trim() || prev.name };
    if (field === 'petType') {
      const nextType = value as 'Dog' | 'Cat';
      const nextBreed = nextType === 'Dog' ? 'Golden Retriever' : 'British Shorthair';
      const nextPattern = getCoatPatternOptions(nextType, nextBreed)[0] ?? 'Other';
      return {
        ...prev,
        petType: nextType,
        breed: nextBreed,
        coatPattern: nextPattern,
      };
    }
    if (field === 'gender') return { ...prev, gender: value.toLowerCase() as 'male' | 'female' };
    if (field === 'breed') {
      const nextPatternOptions = getCoatPatternOptions(prev.petType, value);
      const nextPattern = nextPatternOptions.includes(prev.coatPattern)
        ? prev.coatPattern
        : (nextPatternOptions[0] ?? 'Other');
      return { ...prev, breed: value, coatPattern: nextPattern };
    }
    if (field === 'coatPattern') return { ...prev, coatPattern: value };
    if (field === 'birthDate') {
      const age = getAgePartsFromBirthDate(value);
      return { ...prev, birthDate: value, ageYears: age.years };
    }
    if (field === 'vaccines') {
      const exists = prev.vaccinations.some((v) => v.name === value);
      const vaccinations = exists
        ? prev.vaccinations.filter((v) => v.name !== value)
        : [...prev.vaccinations, { name: value, date: toBirthDateIso(birthPicker) } as VaccinationRecord];
      return { ...prev, vaccinations };
    }
    if (field === 'surgeries') {
      if (value === 'Other') return prev;
      const exists = prev.surgeriesLog.some((s) => s.name === value);
      const surgeriesLog = exists
        ? prev.surgeriesLog.filter((s) => s.name !== value)
        : [...prev.surgeriesLog, { name: value, date: toBirthDateIso(birthPicker) } as SurgeryRecord];
      return { ...prev, surgeriesLog };
    }
    if (field === 'allergies') {
      const exists = prev.allergiesLog.some((a) => a.category === value);
      const allergiesLog = exists
        ? prev.allergiesLog.filter((a) => a.category !== value)
        : [...prev.allergiesLog, { category: value, date: toBirthDateIso(birthPicker), severity: 'medium', status: 'active' } as AllergyRecord];
      return { ...prev, allergiesLog };
    }
    if (field === 'diabetes') {
      if (value === 'Other') return prev;
      const exists = prev.diabetesLog.some((d) => d.type === value);
      const diabetesLog = exists
        ? prev.diabetesLog.filter((d) => d.type !== value)
        : [...prev.diabetesLog, { type: value, date: toBirthDateIso(birthPicker), status: 'active' } as DiabetesRecord];
      return { ...prev, diabetesLog };
    }
    if (field === 'photo') return { ...prev, image: value };
    return prev;
  };

  const applySelection = (value: string) => {
    if (!pickerField) return;
    const field = pickerField;
    const next = getNextDraft(draft, field, value);
    const multiFields: Array<Exclude<PickerField, null>> = ['vaccines', 'surgeries', 'allergies', 'diabetes'];
    if (multiFields.includes(field)) {
      setDraft(next);
      return;
    }
    setPickerField(null);

    const basicInfoFields: Array<Exclude<PickerField, null>> = ['name', 'petType', 'gender', 'breed', 'coatPattern', 'birthDate'];
    const requiresConfirm = basicInfoFields.includes(field);
    const changed = JSON.stringify(next) !== JSON.stringify(draft);
    if (!changed) return;

    if (requiresConfirm) {
      const confirmTitle = field === 'name'
        ? (isTr ? 'Ýsmi güncelle?' : 'Apply name update?')
        : field === 'birthDate'
          ? (isTr ? 'Doðum tarihini güncelle?' : 'Apply birth date change?')
          : (isTr ? 'Temel bilgiyi güncelle?' : 'Apply this basic info change?');
      const confirmMessage = field === 'name'
        ? (isTr ? 'Ýsim deðiþikliði geçmiþ kayýtlarla eþleþmeyi etkileyebilir. Devam edilsin mi?' : 'Changing the pet name can affect how past records are matched. Continue?')
        : field === 'birthDate'
          ? (isTr ? 'Doðum tarihi deðiþikliði yaþ hesabýný ve özetleri etkileyebilir. Devam edilsin mi?' : 'Changing birth date updates age calculations and can affect summaries/insights for this pet profile. Continue?')
          : (isTr ? 'Bu deðiþiklik bu profilin özet ve içgörülerini etkileyebilir. Devam edilsin mi?' : 'This update can affect summaries and insights for this pet profile. Continue?');
      Alert.alert(
        confirmTitle,
        confirmMessage,
        [
          { text: isTr ? 'Ýptal' : 'Cancel', style: 'cancel' },
          { text: isTr ? 'Uygula' : 'Apply', style: 'destructive', onPress: () => setDraft(next) },
        ],
      );
      return;
    }
    setDraft(next);
  };
  const addOtherSurgery = () => {
    const value = otherSurgeryText.trim();
    if (!value) return;
    setDraft((prev) => {
      if (prev.surgeriesLog.some((s) => s.name.toLowerCase() === value.toLowerCase())) return prev;
      return {
        ...prev,
        surgeriesLog: [...prev.surgeriesLog, { name: value, date: toBirthDateIso(birthPicker), note: 'Custom' } as SurgeryRecord],
      };
    });
    setOtherSurgeryText('');
  };

  const addOtherDiabetes = () => {
    const value = otherDiabetesText.trim();
    if (!value) return;
    setDraft((prev) => {
      if (prev.diabetesLog.some((d) => d.type.toLowerCase() === value.toLowerCase())) return prev;
      return {
        ...prev,
        diabetesLog: [...prev.diabetesLog, { type: value, date: toBirthDateIso(birthPicker), status: 'active' } as DiabetesRecord],
      };
    });
    setOtherDiabetesText('');
  };

  const vaccineSummary = draft.vaccinations.length === 0 ? 'None selected' : String(draft.vaccinations.length) + ' selected';
  const surgerySummary = draft.surgeriesLog.length === 0 ? 'None selected' : String(draft.surgeriesLog.length) + ' selected';
  const allergySummary = draft.allergiesLog.length === 0 ? 'No active records' : String(draft.allergiesLog.length) + ' selected';
  const diabetesSummary = draft.diabetesLog.length === 0 ? 'No active records' : String(draft.diabetesLog.length) + ' selected';
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.brandWrap}>
            <SvgUri uri={logoUri} width={24} height={24} />
            <View>
              <Text style={[styles.brandTitle, fontsLoaded && styles.brandTitleNunito]}>V-Paw</Text>
              <Text style={[styles.brandSub, fontsLoaded && styles.brandSubNunito]}>BY VIRNELO</Text>
            </View>
          </View>

          <Pressable style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>{isTr ? 'Bitti' : 'Done'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.profileHeading}>{isTr ? draft.name + ' Profili' : draft.name + ' Profile'}</Text>

          <View style={styles.avatarWrap}>
            <Image source={{ uri: draft.image }} style={styles.avatar} />
            <Pressable style={styles.editAvatarBtn} onPress={() => setPickerField('photo')}>
              <Pencil size={14} color="#f8f7f4" strokeWidth={2.6} />
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>{isTr ? 'Temel Bilgiler' : 'Basic Info'}</Text>
          <View style={styles.sectionCard}>
            <InfoRow label={isTr ? 'Ýsim' : 'Name'} value={draft.name} onPress={() => { setNameDraft(draft.name); setPickerField('name'); }} />
            <InfoRow label={isTr ? 'Hayvan Türü' : 'Pet Type'} value={draft.petType} onPress={() => setPickerField('petType')} />
            <InfoRow label={isTr ? 'Cinsiyet' : 'Gender'} value={draft.gender === 'female' ? 'Female' : 'Male'} onPress={() => setPickerField('gender')} />
            <InfoRow label={isTr ? 'Irk' : 'Breed'} value={draft.breed} onPress={() => setPickerField('breed')} />
            <InfoRow label={isTr ? 'Pattern' : 'Coat Pattern'} value={draft.coatPattern} onPress={() => setPickerField('coatPattern')} />
            <InfoRow label={isTr ? 'Yaþ' : 'Age'} value={formatAgeLabel(draft.birthDate)} onPress={() => { setBirthPicker(parseBirthDate(draft.birthDate)); setPickerField('birthDate'); }} noBorder />
          </View>

          <Text style={styles.sectionTitle}>{isTr ? 'Týbbi Geçmiþ' : 'Medical History'}</Text>
          <View style={styles.sectionCard}>
            <InfoRow label={isTr ? 'Aþýlar' : 'Vaccinations'} value={vaccineSummary} onPress={() => setPickerField('vaccines')} />
            <InfoRow label={isTr ? 'Ameliyatlar' : 'Surgeries'} value={surgerySummary} onPress={() => setPickerField('surgeries')} />
            <InfoRow label={isTr ? 'Alerjiler' : 'Allergies'} value={allergySummary} onPress={() => setPickerField('allergies')} />
            <InfoRow label={isTr ? 'Þeker' : 'Diabetes'} value={diabetesSummary} onPress={() => setPickerField('diabetes')} />

            <View style={styles.toggleRow}>
              <Text style={styles.label}>{isTr ? 'Ic parazit rutini' : 'Internal parasite routine'}</Text>
              <PawSwitch
                value={draft.routineCare.internalParasite.enabled}
                onValueChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    routineCare: { ...prev.routineCare, internalParasite: { ...prev.routineCare.internalParasite, enabled: v } },
                  }))
                }
              />
            </View>

            <View style={[styles.toggleRow, styles.noBorder]}>
              <Text style={styles.label}>{isTr ? 'Dis parazit rutini' : 'External parasite routine'}</Text>
              <PawSwitch
                value={draft.routineCare.externalParasite.enabled}
                onValueChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    routineCare: { ...prev.routineCare, externalParasite: { ...prev.routineCare.externalParasite, enabled: v } },
                  }))
                }
              />
            </View>
          </View>
          <Pressable style={styles.saveBtn} onPress={() => onSaved({
            ...draft,
            vaccines: draft.vaccinations.length ? draft.vaccinations.map((v) => v.name).join(', ') : 'None',
            surgeries: draft.surgeriesLog.length ? draft.surgeriesLog.map((s) => s.name).join(', ') : 'None',
            chronicConditions: { allergies: draft.allergiesLog.length > 0, diabetes: draft.diabetesLog.length > 0 },
          })}>
            <Text style={styles.saveText}>{isTr ? 'Deðiþiklikleri Kaydet' : 'Save Changes'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal transparent visible={pickerField !== null} animationType="fade" onRequestClose={() => setPickerField(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerField(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {pickerField === 'name'
                ? (isTr ? 'Ýsim Düzenle' : 'Edit Name')
                : pickerField === 'birthDate'
                  ? (isTr ? 'Doðum Tarihi' : 'Birth Date')
                  : pickerField === 'photo'
                    ? (isTr ? 'Fotoðraf' : 'Photo')
                    : pickerField === 'coatPattern'
                      ? (isTr ? 'Tüy Deseni' : 'Coat Pattern')
                      : pickerField === 'vaccines'
                        ? (isTr ? 'Aþýlar' : 'Vaccinations')
                        : pickerField === 'surgeries'
                          ? (isTr ? 'Ameliyatlar' : 'Surgeries')
                          : pickerField === 'allergies'
                            ? (isTr ? 'Alerjiler' : 'Allergies')
                            : pickerField === 'diabetes'
                              ? (isTr ? 'Diyabet' : 'Diabetes')
                              : (isTr ? 'Seçim' : 'Option')}
            </Text>
            {pickerField === 'name' ? (
              <View style={styles.nameEditorWrap}>
                <Text style={styles.nameEditorHint}>{isTr ? 'Evcil dostunun adýný güncelle.' : "Update your pet's display name."}</Text>
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder={isTr ? 'Örn. Milo' : 'e.g. Milo'}
                  placeholderTextColor="rgba(45,45,45,0.35)"
                  autoFocus
                  maxLength={24}
                  returnKeyType="done"
                  onSubmitEditing={() => applySelection(nameDraft)}
                  style={styles.nameEditorInput}
                />
                <Pressable style={styles.applyDateBtn} onPress={() => applySelection(nameDraft)}>
                  <Text style={styles.applyDateBtnText}>{isTr ? 'Ýsmi Uygula' : 'Apply Name'}</Text>
                </Pressable>
              </View>
            ) : pickerField === 'birthDate' ? (
              <View>
                <View style={styles.dateHeadRow}>
                  <Text style={styles.dateHeadLabel}>{isTr ? 'Gün' : 'Day'}</Text>
                  <Text style={styles.dateHeadLabel}>{isTr ? 'Ay' : 'Month'}</Text>
                  <Text style={styles.dateHeadLabel}>{isTr ? 'Yýl' : 'Year'}</Text>
                </View>

                <View style={styles.datePickerRow}>
                  <ScrollView style={styles.dateCol} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: daysInMonth(birthPicker.year, birthPicker.month) }, (_, i) => i + 1).map((day) => (
                      <Pressable
                        key={String(day)}
                        style={[styles.dateItem, birthPicker.day === day && styles.dateItemActive]}
                        onPress={() => setBirthPicker((prev) => ({ ...prev, day }))}
                      >
                        <Text style={[styles.dateItemText, birthPicker.day === day && styles.dateItemTextActive]}>{day}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <ScrollView style={styles.dateCol} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <Pressable
                        key={String(month)}
                        style={[styles.dateItem, birthPicker.month === month && styles.dateItemActive]}
                        onPress={() => setBirthPicker((prev) => clampBirthDateParts({ ...prev, month }))}
                      >
                        <Text style={[styles.dateItemText, birthPicker.month === month && styles.dateItemTextActive]}>{MONTH_LABELS[month - 1]}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <ScrollView style={styles.dateCol} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 26 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <Pressable
                        key={String(year)}
                        style={[styles.dateItem, birthPicker.year === year && styles.dateItemActive]}
                        onPress={() => setBirthPicker((prev) => clampBirthDateParts({ ...prev, year }))}
                      >
                        <Text style={[styles.dateItemText, birthPicker.year === year && styles.dateItemTextActive]}>{year}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <Pressable style={styles.applyDateBtn} onPress={() => applySelection(toBirthDateIso(birthPicker))}>
                  <Text style={styles.applyDateBtnText}>{isTr ? 'Doðum Tarihini Uygula' : 'Apply Birth Date'}</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {pickerItems.map((item) => {
                const selected =
                  (pickerField === 'petType' && draft.petType === item) ||
                  (pickerField === 'gender' && draft.gender === item.toLowerCase()) ||
                  (pickerField === 'breed' && draft.breed === item) ||
                  (pickerField === 'coatPattern' && draft.coatPattern === item) ||
                  (pickerField === 'vaccines' && draft.vaccinations.some((v) => v.name === item)) ||
                  (pickerField === 'surgeries' && draft.surgeriesLog.some((s) => s.name === item)) ||
                  (pickerField === 'allergies' && draft.allergiesLog.some((a) => a.category === item)) ||
                  (pickerField === 'diabetes' && draft.diabetesLog.some((d) => d.type === item)) ||
                  (pickerField === 'photo' && draft.image === item);

                return (
                  <Pressable key={item} style={styles.optionRow} onPress={() => applySelection(item)}>
                    {pickerField === 'photo' ? <Image source={{ uri: item }} style={styles.optionThumb} /> : null}
                    <Text style={styles.optionText} numberOfLines={1}>{item}</Text>
                    {selected ? <Check size={16} color="#6e8f66" strokeWidth={2.7} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value, onPress, infoMessage, noBorder }: { label: string; value: string; onPress?: () => void; infoMessage?: string; noBorder?: boolean }) {
  return (
    <Pressable style={[styles.row, noBorder && styles.noBorder]} onPress={onPress} disabled={!onPress && !infoMessage}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {infoMessage ? (
          <Pressable
            style={styles.infoDot}
            onPress={() => Alert.alert('Managed in Settings', infoMessage)}
            hitSlop={8}
          >
            <Text style={styles.infoDotText}>i</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.valueWrap}>
        <Text style={styles.value} numberOfLines={1}>{value}</Text>
        {onPress ? <ChevronRight size={16} color="#b4b4b4" strokeWidth={2.4} /> : null}
      </View>
    </Pressable>
  );
}

function PawSwitch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.pawSwitchWrap}>
      {value ? (
        <View style={styles.pawMark} pointerEvents="none">
          <PawPrint size={9} color="#5f7f59" strokeWidth={3.1} />
        </View>
      ) : null}
      <View style={styles.pawSwitchScale}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          thumbColor={value ? '#ffffff' : '#f4f4f4'}
          trackColor={{ false: '#d8d8d8', true: '#6e8f66' }}
          ios_backgroundColor="#d8d8d8"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8f7f4',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 28,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 22,
    lineHeight: 24,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  brandTitleNunito: {
    fontFamily: 'Montserrat_700Bold',
  },
  brandSub: {
    fontSize: 10,
    lineHeight: 12,
    color: '#8d8d8d',
    letterSpacing: 1.7,
    fontWeight: '600',
  },
  brandSubNunito: {
    fontFamily: 'Nunito_600SemiBold',
  },
  backBtn: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  backBtnText: {
    fontSize: 13,
    color: '#545454',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  title: {
    textAlign: 'center',
    fontSize: 34,
    lineHeight: 38,
    color: '#1f1f1f',
    fontWeight: '700',
  },
  profileHeading: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  avatarWrap: {
    marginTop: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 126,
    height: 126,
    borderRadius: 63,
  },
  editAvatarBtn: {
    position: 'absolute',
    right: 94,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(45,45,45,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 18,
    lineHeight: 24,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 14,
    backgroundColor: '#fbfbfa',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
  },
  row: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  inlineInputRow: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inlineInput: {
    minHeight: 34,
    minWidth: 130,
    maxWidth: '72%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    color: '#2d2d2d',
    fontSize: 14,
    textAlign: 'right',
  },
  toggleRow: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pawSwitchScale: {
    width: 42,
    alignItems: 'center',
    transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }],
  },
  pawSwitchWrap: {
    position: 'relative',
    width: 42,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pawMark: {
    position: 'absolute',
    right: -1,
    top: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    opacity: 1,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    color: '#2d2d2d',
    fontWeight: '500',
  },
  infoDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  infoDotText: {
    fontSize: 10,
    lineHeight: 12,
    color: '#777',
    fontWeight: '700',
    marginTop: -1,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: '72%',
  },
  value: {
    fontSize: 15,
    lineHeight: 20,
    color: '#2d2d2d',
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
  },
  advancedHint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#8e8e8e',
    fontWeight: '500',
  },
  saveBtn: {
    marginTop: 16,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  saveText: {
    fontSize: 17,
    lineHeight: 22,
    color: '#fff',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.26)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    maxHeight: '72%',
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 12,
  },
  modalTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#2d2d2d',
    fontWeight: '700',
    marginBottom: 8,
  },
  nameEditorWrap: {
    gap: 10,
  },
  nameEditorHint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8b8b88',
    fontWeight: '600',
  },
  nameEditorInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fbfbfa',
    paddingHorizontal: 14,
    color: '#2d2d2d',
    fontSize: 16,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: 420,
  },
  optionRow: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    color: '#2d2d2d',
  },
  optionThumb: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  otherWrap: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  otherInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 10,
    color: '#2d2d2d',
    fontSize: 14,
  },
  otherBtn: {
    minWidth: 62,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherBtnText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  dateHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dateHeadLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    color: '#8a8a8a',
    fontWeight: '700',
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dateCol: {
    flex: 1,
    maxHeight: 190,
    borderRadius: 10,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  dateItem: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  dateItemActive: {
    backgroundColor: 'rgba(110,143,102,0.12)',
  },
  dateItemText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#5f5f5f',
    fontWeight: '600',
  },
  dateItemTextActive: {
    color: '#4f6d4b',
    fontWeight: '700',
  },
  birthPreview: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    color: '#6b6b6b',
    fontWeight: '600',
    marginBottom: 10,
  },
  applyDateBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyDateBtnText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});











