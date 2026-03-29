import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
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
import { Check, ChevronRight, PawPrint, X } from 'lucide-react-native';
import type { AllergyRecord, DiabetesRecord, PetProfile, SurgeryRecord, VaccinationRecord } from '../lib/petProfileTypes';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { useLocale } from '../hooks/useLocale';

type PetEditScreenProps = {
  pet: PetProfile;
  onBack: () => void;
  onSaved: (pet: PetProfile) => void;
  isNewPet?: boolean;
  onCreated?: (pet: PetProfile) => void;
};

type PickerField = 'name' | 'microchip' | 'petType' | 'gender' | 'breed' | 'coatPattern' | 'birthDate' | 'vaccines' | 'surgeries' | 'allergies' | 'diabetes' | 'photo' | null;

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

export default function PetEditScreen({ pet, onBack, onSaved, isNewPet = false, onCreated }: PetEditScreenProps) {
  const { locale } = useLocale();
  const isTr = locale === 'tr';
  const [draft, setDraft] = useState<PetProfile>(pet);
  const [pickerField, setPickerField] = useState<PickerField>(null);
  const [birthPicker, setBirthPicker] = useState(() => parseBirthDate(pet.birthDate));
  const [otherSurgeryText, setOtherSurgeryText] = useState('');
  const [otherDiabetesText, setOtherDiabetesText] = useState('');
  const [nameDraft, setNameDraft] = useState(pet.name);
  const [microchipDraft, setMicrochipDraft] = useState(pet.microchip || '');
  const swipePanResponder = useEdgeSwipeBack({ onBack, enabled: pickerField === null });

  useEffect(() => {
    setDraft(pet);
    setBirthPicker(parseBirthDate(pet.birthDate));
    setNameDraft(pet.name);
    setMicrochipDraft(pet.microchip || '');
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
    if (field === 'microchip') return { ...prev, microchip: value.trim() || prev.microchip };
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

    const basicInfoFields: Array<Exclude<PickerField, null>> = ['name', 'microchip', 'petType', 'gender', 'breed', 'coatPattern', 'birthDate'];
    const requiresConfirm = basicInfoFields.includes(field);
    const changed = JSON.stringify(next) !== JSON.stringify(draft);
    if (!changed) return;

    if (requiresConfirm) {
      const confirmTitle = field === 'name'
        ? (isTr ? 'Ä°smi gÃ¼ncelle?' : 'Apply name update?')
        : field === 'microchip'
          ? (isTr ? 'MikroÃ§ipi gÃ¼ncelle?' : 'Apply microchip update?')
          : field === 'birthDate'
          ? (isTr ? 'DoÄŸum tarihini gÃ¼ncelle?' : 'Apply birth date change?')
          : (isTr ? 'Temel bilgiyi gÃ¼ncelle?' : 'Apply this basic info change?');
      const confirmMessage = field === 'name'
        ? (isTr ? 'Ä°sim deÄŸiÅŸikliÄŸi geÃ§miÅŸ kayÄ±tlarla eÅŸleÅŸmeyi etkileyebilir. Devam edilsin mi?' : 'Changing the pet name can affect how past records are matched. Continue?')
        : field === 'microchip'
          ? (isTr ? 'MikroÃ§ip deÄŸiÅŸikliÄŸi resmi kayÄ±t eÅŸleÅŸmesini etkileyebilir. Devam edilsin mi?' : 'Changing the microchip can affect official record matching. Continue?')
          : field === 'birthDate'
          ? (isTr ? 'DoÄŸum tarihi deÄŸiÅŸikliÄŸi yaÅŸ hesabÄ±nÄ± ve Ã¶zetleri etkileyebilir. Devam edilsin mi?' : 'Changing birth date updates age calculations and can affect summaries/insights for this pet profile. Continue?')
          : (isTr ? 'Bu deÄŸiÅŸiklik bu profilin Ã¶zet ve iÃ§gÃ¶rÃ¼lerini etkileyebilir. Devam edilsin mi?' : 'This update can affect summaries and insights for this pet profile. Continue?');
      Alert.alert(
        confirmTitle,
        confirmMessage,
        [
          { text: isTr ? 'Ä°ptal' : 'Cancel', style: 'cancel' },
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
  const handleSave = () => {
  // PET_EDIT_REWRITE_MARKER
    const saved = {
      ...draft,
      vaccines: draft.vaccinations.length ? draft.vaccinations.map((v) => v.name).join(', ') : 'None',
      surgeries: draft.surgeriesLog.length ? draft.surgeriesLog.map((s) => s.name).join(', ') : 'None',
      chronicConditions: { allergies: draft.allergiesLog.length > 0, diabetes: draft.diabetesLog.length > 0 },
    };
    if (isNewPet && onCreated) {
      onCreated(saved);
    } else {
      onSaved(saved);
    }
  };
  const useFocusedEditLayout = true;
  if (useFocusedEditLayout) {
    return (
      <View style={styles.screen} {...swipePanResponder.panHandlers}>
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#f8f4ed', '#f1e3d3', '#deccb9']}
          locations={[0, 0.48, 1]}
          start={{ x: 0.06, y: 0.02 }}
          end={{ x: 0.96, y: 0.98 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,252,247,0.94)', 'rgba(255,255,255,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ribbonPrimary}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,248,236,0.72)', 'rgba(255,255,255,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.1 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.ribbonSecondary}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,243,224,0.68)', 'rgba(255,255,255,0)']}
          locations={[0, 0.45, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.ribbonAccent}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.editTopRow}>
            <Pressable style={styles.editCircleAction} onPress={onBack}>
              <X size={20} color="#5d4537" strokeWidth={2.4} />
            </Pressable>
            <Pressable style={[styles.editCircleAction, styles.editSaveAction]} onPress={handleSave}>
              <Check size={20} color="#5d4537" strokeWidth={2.7} />
            </Pressable>
          </View>

          <View style={styles.editHeaderBlock}>
            <Text style={styles.editHeaderEyebrow}>{isTr ? 'PROFİLİ DÜZENLE' : 'EDIT PROFILE'}</Text>
            <Text style={styles.editHeaderTitle}>{isTr ? `${draft.name} Düzenle` : `Edit ${draft.name}`}</Text>
            <Text style={styles.editHeaderSub}>
              {isTr
                ? 'Temel profil alanlarını sakin ve odaklı bir düzenleme akışında güncelle.'
                : 'Update core profile details in one calm, focused editing flow.'}
            </Text>
          </View>

          <View style={styles.editHeroCard}>
            <View style={styles.editHeroTopRow}>
              <Image source={{ uri: draft.image }} style={styles.editHeroAvatar} />
              <View style={styles.editHeroTextCol}>
                <Text style={styles.editHeroName}>{draft.name}</Text>
                <View style={styles.editHeroMetaRow}>
                  <View style={styles.editHeroChip}>
                    <Text style={styles.editHeroChipText}>{draft.petType}</Text>
                  </View>
                  <View style={styles.editHeroChip}>
                    <Text style={styles.editHeroChipText}>
                      {draft.gender === 'female' ? (isTr ? 'Dişi' : 'Female') : (isTr ? 'Erkek' : 'Male')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.editHeroBreed}>{draft.breed}</Text>
                <Text style={styles.editHeroAge}>{formatAgeLabel(draft.birthDate)}</Text>
              </View>
            </View>

            <View style={styles.editInsightCard}>
              <Text style={styles.editInsightLabel}>PROFILE NOTE</Text>
              <Text style={styles.editInsightText}>
                {isTr
                  ? 'Temel profil alanlarını doğru tutmak, özetler, ırk içgörüleri ve bakım önerileri için daha temiz veri sağlar.'
                  : 'Keeping core profile fields accurate gives cleaner data for summaries, breed insights, and care suggestions.'}
              </Text>
            </View>
          </View>

          <Text style={styles.editSectionTitle}>{isTr ? 'Temel Bilgiler' : 'Basic Info'}</Text>
          <View style={styles.editSectionCard}>
            <InfoRow label={isTr ? 'İsim' : 'Name'} value={draft.name} onPress={() => { setNameDraft(draft.name); setPickerField('name'); }} />
            <InfoRow label={isTr ? 'Hayvan Türü' : 'Pet Type'} value={draft.petType} onPress={() => setPickerField('petType')} />
            <InfoRow label={isTr ? 'Cinsiyet' : 'Gender'} value={draft.gender === 'female' ? (isTr ? 'Dişi' : 'Female') : (isTr ? 'Erkek' : 'Male')} onPress={() => setPickerField('gender')} />
            <InfoRow label={isTr ? 'Irk' : 'Breed'} value={draft.breed} onPress={() => setPickerField('breed')} />
            <InfoRow label={isTr ? 'Tüy Deseni' : 'Coat Pattern'} value={draft.coatPattern} onPress={() => setPickerField('coatPattern')} noBorder />
          </View>

          <Text style={styles.editSectionTitle}>{isTr ? 'Kimlik Detayları' : 'Identity Details'}</Text>
          <View style={styles.editSectionCard}>
            <InfoRow label={isTr ? 'Yaş' : 'Age'} value={formatAgeLabel(draft.birthDate)} onPress={() => { setBirthPicker(parseBirthDate(draft.birthDate)); setPickerField('birthDate'); }} />
            <InfoRow label={isTr ? 'Mikroçip' : 'Microchip'} value={draft.microchip || '-'} onPress={() => { setMicrochipDraft(draft.microchip || ''); setPickerField('microchip'); }} noBorder />
          </View>

          <Text style={styles.editSectionTitle}>{isTr ? 'Sağlık Seçimleri' : 'Health Selections'}</Text>
          <View style={styles.editSectionCard}>
            <InfoRow label={isTr ? 'Aşılar' : 'Vaccinations'} value={vaccineSummary} onPress={() => setPickerField('vaccines')} />
            <InfoRow label={isTr ? 'Ameliyatlar' : 'Surgeries'} value={surgerySummary} onPress={() => setPickerField('surgeries')} />
            <InfoRow label={isTr ? 'Alerjiler' : 'Allergies'} value={allergySummary} onPress={() => setPickerField('allergies')} />
            <InfoRow label={isTr ? 'Şeker' : 'Diabetes'} value={diabetesSummary} onPress={() => setPickerField('diabetes')} />

            <View style={styles.toggleRow}>
              <Text style={styles.label}>{isTr ? 'İç parazit rutini' : 'Internal parasite routine'}</Text>
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
              <Text style={styles.label}>{isTr ? 'Dış parazit rutini' : 'External parasite routine'}</Text>
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

          <View style={{ height: 8 }} />
        </ScrollView>

        <Modal transparent visible={pickerField !== null} animationType="fade" onRequestClose={() => setPickerField(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerField(null)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>
                {pickerField === 'name'
                  ? (isTr ? 'İsim Düzenle' : 'Edit Name')
                  : pickerField === 'microchip'
                    ? (isTr ? 'Mikroçip Düzenle' : 'Edit Microchip')
                    : pickerField === 'birthDate'
                      ? (isTr ? 'Doğum Tarihi' : 'Birth Date')
                      : pickerField === 'photo'
                        ? (isTr ? 'Fotoğraf' : 'Photo')
                        : pickerField === 'coatPattern'
                          ? (isTr ? 'Tüy Deseni' : 'Coat Pattern')
                          : pickerField === 'vaccines'
                            ? (isTr ? 'Aşılar' : 'Vaccinations')
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
                  <Text style={styles.nameEditorHint}>{isTr ? 'Evcil dostunun adını güncelle.' : "Update your pet's display name."}</Text>
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
                    <Text style={styles.applyDateBtnText}>{isTr ? 'İsmi Uygula' : 'Apply Name'}</Text>
                  </Pressable>
                </View>
              ) : pickerField === 'microchip' ? (
                <View style={styles.nameEditorWrap}>
                  <Text style={styles.nameEditorHint}>{isTr ? 'Mikroçip numarasını güncelle.' : 'Update the microchip number.'}</Text>
                  <TextInput
                    value={microchipDraft}
                    onChangeText={setMicrochipDraft}
                    placeholder={isTr ? 'Örn. 985 112 004 883' : 'e.g. 985 112 004 883'}
                    placeholderTextColor="rgba(45,45,45,0.35)"
                    autoFocus
                    maxLength={32}
                    keyboardType="numbers-and-punctuation"
                    returnKeyType="done"
                    onSubmitEditing={() => applySelection(microchipDraft)}
                    style={styles.nameEditorInput}
                  />
                  <Pressable style={styles.applyDateBtn} onPress={() => applySelection(microchipDraft)}>
                    <Text style={styles.applyDateBtnText}>{isTr ? 'Mikroçipi Uygula' : 'Apply Microchip'}</Text>
                  </Pressable>
                </View>
              ) : pickerField === 'birthDate' ? (
                <View>
                  <View style={styles.dateHeadRow}>
                    <Text style={styles.dateHeadLabel}>{isTr ? 'Gün' : 'Day'}</Text>
                    <Text style={styles.dateHeadLabel}>{isTr ? 'Ay' : 'Month'}</Text>
                    <Text style={styles.dateHeadLabel}>{isTr ? 'Yıl' : 'Year'}</Text>
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
                    <Text style={styles.applyDateBtnText}>{isTr ? 'Doğum Tarihini Uygula' : 'Apply Birth Date'}</Text>
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
                        {selected ? <Check size={16} color="#8b6a53" strokeWidth={2.7} /> : null}
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
}

function InfoRow({ label, value, onPress, infoMessage, noBorder }: { label: string; value: string; onPress?: () => void; infoMessage?: string; noBorder?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, noBorder && styles.noBorder, pressed && onPress && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress && !infoMessage}
    >
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
        {onPress ? (
          <View style={styles.rowChevronWrap}>
            <ChevronRight size={16} color="#8b6a53" strokeWidth={2.5} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function PawSwitch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.pawSwitchWrap}>
      {value ? (
        <View style={styles.pawMark} pointerEvents="none">
          <PawPrint size={9} color="#86634d" strokeWidth={3.1} />
        </View>
      ) : null}
      <View style={styles.pawSwitchScale}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          thumbColor={value ? '#ffffff' : '#f4f4f4'}
          trackColor={{ false: '#d8d8d8', true: '#b89572' }}
          ios_backgroundColor="#d8d8d8"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ead8c8',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 44,
  },
  ribbonPrimary: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 240,
    height: 1040,
    opacity: 0.94,
    transform: [{ rotate: '24deg' }],
  },
  ribbonSecondary: {
    position: 'absolute',
    top: 120,
    left: 156,
    width: 160,
    height: 980,
    opacity: 0.78,
    transform: [{ rotate: '36deg' }],
  },
  ribbonAccent: {
    position: 'absolute',
    top: 280,
    right: -20,
    width: 110,
    height: 680,
    opacity: 0.52,
    transform: [{ rotate: '17deg' }],
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
  brandSub: {
    fontSize: 10,
    lineHeight: 12,
    color: '#8d8d8d',
    letterSpacing: 1.7,
    fontWeight: '600',
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
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(96,67,44,0.09)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
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
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(96,67,44,0.09)',
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
    color: '#5e4638',
    fontWeight: '600',
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
    gap: 8,
    maxWidth: '72%',
  },
  value: {
    fontSize: 15,
    lineHeight: 20,
    color: '#866b5a',
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  rowChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,248,239,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(179,152,126,0.18)',
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
  editTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editCircleAction: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,250,244,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(179,152,126,0.16)',
    shadowColor: '#8d6a4f',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  editSaveAction: {
    backgroundColor: 'rgba(255,248,240,0.88)',
  },
  editHeaderBlock: {
    marginBottom: 18,
    gap: 4,
  },
  editHeaderEyebrow: {
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(111,80,60,0.82)',
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  editHeaderTitle: {
    fontSize: 36,
    lineHeight: 40,
    color: '#2a1710',
    fontWeight: '800',
    letterSpacing: -1,
  },
  editHeaderSub: {
    maxWidth: '88%',
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(103,80,64,0.74)',
    fontWeight: '500',
  },
  editHeroCard: {
    borderRadius: 34,
    backgroundColor: 'rgba(255,250,244,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.68)',
    padding: 20,
    shadowColor: '#7e5f47',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    marginBottom: 16,
  },
  editHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editHeroAvatar: {
    width: 104,
    height: 104,
    borderRadius: 28,
  },
  editHeroTextCol: {
    flex: 1,
    gap: 6,
  },
  editHeroName: {
    fontSize: 30,
    lineHeight: 34,
    color: '#2a1710',
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  editHeroMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editHeroChip: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,247,238,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(179,152,126,0.16)',
  },
  editHeroChipText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#6c5241',
    fontWeight: '700',
  },
  editHeroBreed: {
    fontSize: 17,
    lineHeight: 22,
    color: '#5f4939',
    fontWeight: '600',
  },
  editHeroAge: {
    fontSize: 15,
    lineHeight: 20,
    color: '#866e5d',
    fontWeight: '600',
  },
  editInsightCard: {
    marginTop: 14,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: 'rgba(255,246,235,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(201,166,132,0.18)',
    gap: 8,
  },
  editInsightLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8b6a53',
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  editInsightText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#6b5444',
    fontWeight: '500',
  },
  editSectionTitle: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(103,80,64,0.82)',
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  editSectionCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,250,244,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.68)',
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#8d6a4f',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(46,28,18,0.22)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    maxHeight: '72%',
    borderRadius: 24,
    backgroundColor: '#f9f2ea',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
  },
  modalTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#2a1710',
    fontWeight: '700',
    marginBottom: 8,
  },
  nameEditorWrap: {
    gap: 10,
  },
  nameEditorHint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8a7261',
    fontWeight: '600',
  },
  nameEditorInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(158,126,100,0.16)',
    backgroundColor: 'rgba(255,250,245,0.96)',
    paddingHorizontal: 14,
    color: '#2a1710',
    fontSize: 16,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: 420,
  },
  optionRow: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    color: '#3a2418',
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
    borderColor: 'rgba(158,126,100,0.14)',
    backgroundColor: 'rgba(255,250,245,0.94)',
    paddingHorizontal: 10,
    color: '#2a1710',
    fontSize: 14,
  },
  otherBtn: {
    minWidth: 62,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#8b6a53',
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
    color: '#8a7261',
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
    backgroundColor: 'rgba(255,249,243,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(158,126,100,0.12)',
  },
  dateItem: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(158,126,100,0.08)',
  },
  dateItemActive: {
    backgroundColor: 'rgba(201,166,132,0.16)',
  },
  dateItemText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#6f594a',
    fontWeight: '600',
  },
  dateItemTextActive: {
    color: '#7b5d48',
    fontWeight: '700',
  },
  birthPreview: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    color: '#7b6556',
    fontWeight: '600',
    marginBottom: 10,
  },
  applyDateBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#8b6a53',
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


















