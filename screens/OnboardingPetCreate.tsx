import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Check, ChevronDown } from 'lucide-react-native';
import { hap } from '../lib/haptics';
import type { PetProfile } from '../lib/petProfileTypes';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const heroPetIllustration = require('../assets/illustrations/cat-dog-playing.png');
const catSelectIllustration = require('../assets/illustrations/cat-pet-select.png');
const dogSelectIllustration = require('../assets/illustrations/dog-pet-select.png');

const CAT_BREEDS = [
  'Abyssinian', 'American Bobtail', 'American Curl', 'American Shorthair', 'Balinese', 'Bengal', 'Birman',
  'Bombay', 'British Longhair', 'British Shorthair', 'Burmese', 'Burmilla', 'Chartreux', 'Cornish Rex',
  'Devon Rex', 'Egyptian Mau', 'European Shorthair', 'Exotic Shorthair', 'Himalayan', 'Japanese Bobtail',
  'Korat', 'LaPerm', 'Maine Coon', 'Manx', 'Munchkin', 'Nebelung', 'Norwegian Forest', 'Ocicat',
  'Oriental Shorthair', 'Persian', 'Ragdoll', 'Russian Blue', 'Savannah', 'Scottish Fold', 'Selkirk Rex',
  'Siamese', 'Siberian', 'Singapura', 'Snowshoe', 'Somali', 'Sphynx', 'Tonkinese', 'Turkish Angora',
  'Turkish Van', 'Other',
];
const DOG_BREEDS = [
  'Afghan Hound', 'Airedale Terrier', 'Akbash', 'Akita', 'Alaskan Malamute', 'Anatolian Shepherd',
  'Australian Cattle Dog', 'Australian Shepherd', 'Basenji', 'Basset Hound', 'Beagle', 'Belgian Malinois',
  'Bernese Mountain Dog', 'Bichon Frise', 'Border Collie', 'Boston Terrier', 'Boxer', 'Bull Terrier',
  'Bulldog', 'Cane Corso', 'Cavalier King Charles Spaniel', 'Chihuahua', 'Chow Chow', 'Cocker Spaniel',
  'Collie', 'Dachshund', 'Dalmatian', 'Doberman Pinscher', 'English Setter', 'French Bulldog',
  'German Shepherd', 'German Shorthaired Pointer', 'Golden Retriever', 'Great Dane', 'Great Pyrenees',
  'Greyhound', 'Havanese', 'Irish Setter', 'Jack Russell Terrier', 'Kangal', 'Labrador Retriever',
  'Maltese', 'Miniature Schnauzer', 'Newfoundland', 'Pembroke Welsh Corgi', 'Pit Bull Terrier', 'Pointer',
  'Pomeranian', 'Poodle', 'Pug', 'Rottweiler', 'Saint Bernard', 'Samoyed', 'Shiba Inu', 'Shih Tzu',
  'Siberian Husky', 'Weimaraner', 'Whippet', 'Yorkshire Terrier', 'Other',
];

type OnboardingPetCreatePayload = {
  name: string;
  breed: string;
  petType: PetProfile['petType'];
  birthDate?: string;
};

type OnboardingPetCreateScreenProps = {
  locale: string;
  onBack: () => void;
  onSkip: () => void;
  onContinue: (payload: OnboardingPetCreatePayload) => void;
};

function toBirthIso(date: Date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseBirthDate(value: string) {
  const now = new Date();
  if (!value.trim()) return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const parts = value.split('-').map((v) => Number(v));
  if (parts.length !== 3 || parts.some((v) => !Number.isFinite(v))) {
    return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
  return new Date(parts[0], Math.max(0, parts[1] - 1), Math.max(1, parts[2]));
}

function toBirthLabel(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export default function OnboardingPetCreateScreen({
  locale,
  onBack,
  onSkip,
  onContinue,
}: OnboardingPetCreateScreenProps) {
  const isTr = locale === 'tr';
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [petType, setPetType] = useState<PetProfile['petType']>('Dog');
  const [birthDate, setBirthDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [birthModalOpen, setBirthModalOpen] = useState(false);
  const [breedModalOpen, setBreedModalOpen] = useState(false);
  const [birthPickerDate, setBirthPickerDate] = useState<Date>(() => parseBirthDate(''));

  const mountOpacity = useRef(new Animated.Value(0)).current;
  const mountTranslateY = useRef(new Animated.Value(18)).current;
  const dogScale = useRef(new Animated.Value(1.03)).current;
  const catScale = useRef(new Animated.Value(1)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    console.log('ONBOARDING PET CREATE OPENED');
    Animated.parallel([
      Animated.timing(mountOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(mountTranslateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [mountOpacity, mountTranslateY]);

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(dogScale, {
        toValue: petType === 'Dog' ? 1.03 : 1,
        friction: 7,
        tension: 126,
        useNativeDriver: true,
      }),
      Animated.spring(catScale, {
        toValue: petType === 'Cat' ? 1.03 : 1,
        friction: 7,
        tension: 126,
        useNativeDriver: true,
      }),
    ]).start();
  }, [catScale, dogScale, petType]);

  const breedOptions = useMemo(() => (petType === 'Cat' ? CAT_BREEDS : DOG_BREEDS), [petType]);
  const breedLabel = useMemo(() => (breed.trim().length > 0 ? breed : (isTr ? 'Irk sec' : 'Select breed')), [breed, isTr]);
  const isContinueDisabled = useMemo(
    () => name.trim().length === 0 || breed.trim().length === 0 || isLoading,
    [breed, isLoading, name],
  );
  const birthLabel = useMemo(() => {
    if (!birthDate.trim()) return isTr ? 'Tarih sec' : 'Select date';
    return toBirthLabel(parseBirthDate(birthDate));
  }, [birthDate, isTr]);

  React.useEffect(() => {
    if (breed.trim().length === 0) return;
    if (!breedOptions.includes(breed)) {
      setBreed('');
    }
  }, [breed, breedOptions]);

  const handleSelectPetType = (value: PetProfile['petType']) => {
    if (value === petType) return;
    hap.light();
    setPetType(value);
  };

  const openBirthModal = () => {
    setBirthPickerDate(parseBirthDate(birthDate));
    setBirthModalOpen(true);
  };

  const applyBirthDate = () => {
    setBirthDate(toBirthIso(birthPickerDate));
    setBirthModalOpen(false);
  };

  const handleBirthPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setBirthModalOpen(false);
      if (event.type === 'set' && selectedDate) {
        setBirthPickerDate(selectedDate);
        setBirthDate(toBirthIso(selectedDate));
      }
      return;
    }

    if (selectedDate) {
      setBirthPickerDate(selectedDate);
    }
  };

  const handleContinue = async () => {
    if (isContinueDisabled) return;
    hap.medium();
    Animated.sequence([
      Animated.timing(ctaScale, { toValue: 0.985, duration: 90, useNativeDriver: true }),
      Animated.timing(ctaScale, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();
    setIsLoading(true);
    try {
      await Promise.resolve(
        onContinue({ name: name.trim(), breed: breed.trim(), petType, birthDate: birthDate.trim() || undefined }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgLayer}>
        <View style={styles.bgBlobTopLeft} />
        <View style={styles.bgBlobTopRight} />
        <View style={styles.bgBlobRightMiddle} />
        <View style={styles.bgBlobBottomLeft} />
        <View style={styles.bgBlobBottomRight} />
      </View>

      <Animated.View style={[styles.content, { opacity: mountOpacity, transform: [{ translateY: mountTranslateY }] }]}>
        <View style={styles.contentInner}>
          <View style={styles.topSection}>
            <View style={styles.heroWrap}>
              <Image source={heroPetIllustration} style={styles.heroIllustration} resizeMode="contain" />
              <Text style={styles.heroTitle}>{isTr ? 'Petini Ekle' : 'Add Your Pet'}</Text>
              <Text style={styles.heroSubtitle}>{isTr ? 'Bir dakikada hazir.' : 'Ready in under a minute.'}</Text>
            </View>

            <View style={styles.typeGridShell}>
              <View style={styles.typeGrid}>
                <PetTypeCard
                  label={isTr ? 'Kedi' : 'Cat'}
                  helper={isTr ? 'Sakin ve zarif' : 'Calm and graceful'}
                  imageSource={catSelectIllustration}
                  selected={petType === 'Cat'}
                  scale={catScale}
                  onPress={() => handleSelectPetType('Cat')}
                />
                <PetTypeCard
                  label={isTr ? 'Kopek' : 'Dog'}
                  helper={isTr ? 'Sadik ve enerjik' : 'Loyal and energetic'}
                  imageSource={dogSelectIllustration}
                  selected={petType === 'Dog'}
                  scale={dogScale}
                  onPress={() => handleSelectPetType('Dog')}
                />
              </View>
            </View>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.fieldWrap}>
              <Text style={styles.inputLabel}>{isTr ? 'Pet adi' : "Pet's name"}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
                placeholder={isTr ? 'Orn: Milo' : 'e.g. Milo'}
                placeholderTextColor="#969696"
                style={[styles.inputBase, styles.nameInput, isNameFocused ? styles.nameInputFocused : null]}
                returnKeyType="done"
                maxLength={24}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.inputLabel}>{isTr ? 'Irk' : 'Breed'}</Text>
              <Pressable
                onPress={() => setBreedModalOpen(true)}
                style={({ pressed }) => [styles.inputBase, styles.selectField, pressed ? styles.selectPressed : null]}
              >
                <Text style={[styles.selectText, !breed.trim() ? styles.selectPlaceholder : null]}>{breedLabel}</Text>
                <ChevronDown size={20} color="#848484" strokeWidth={2.3} />
              </Pressable>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.inputLabel}>{isTr ? 'Dogum tarihi (opsiyonel)' : 'Birthdate (optional)'}</Text>
              <Pressable
                onPress={openBirthModal}
                style={({ pressed }) => [styles.inputBase, styles.selectField, pressed ? styles.selectPressed : null]}
              >
                <Text style={[styles.selectText, !birthDate.trim() ? styles.selectPlaceholder : null]}>{birthLabel}</Text>
                <ChevronDown size={20} color="#848484" strokeWidth={2.3} />
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
                <Pressable
                  onPress={handleContinue}
                  disabled={isContinueDisabled}
                  style={({ pressed }) => [
                    styles.primaryButtonWrap,
                    isContinueDisabled ? styles.primaryButtonDisabledWrap : null,
                    pressed && !isContinueDisabled ? styles.primaryButtonPressed : null,
                  ]}
                >
                  <LinearGradient
                    colors={isContinueDisabled ? ['#ccd3d0', '#c2cace'] : ['#8fc9ac', '#5ca7b8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonLabel}>{isTr ? 'Devam Et' : 'Continue'}</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              <View style={styles.secondaryRow}>
                <Pressable onPress={onBack} style={styles.secondaryButton}>
                  <Text style={styles.secondaryLabel}>{isTr ? 'Geri' : 'Back'}</Text>
                </Pressable>
                <Pressable onPress={onSkip} style={styles.secondaryButton}>
                  <Text style={styles.secondaryLabel}>{isTr ? 'Simdilik gec' : 'Skip for now'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {birthModalOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={birthPickerDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleBirthPickerChange}
        />
      ) : null}

      <Modal
        transparent
        visible={Platform.OS === 'ios' && birthModalOpen}
        animationType="fade"
        onRequestClose={() => setBirthModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setBirthModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{isTr ? 'Dogum Tarihi' : 'Birthdate'}</Text>
            <DateTimePicker
              value={birthPickerDate}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={handleBirthPickerChange}
              style={styles.nativeDatePicker}
            />

            <Pressable style={styles.applyDateBtn} onPress={applyBirthDate}>
              <Check size={16} color="#fff" strokeWidth={2.4} />
              <Text style={styles.applyDateBtnText}>{isTr ? 'Uygula' : 'Apply'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={breedModalOpen} animationType="fade" onRequestClose={() => setBreedModalOpen(false)}>
        <Pressable style={styles.breedSheetBackdrop} onPress={() => setBreedModalOpen(false)}>
          <Pressable style={styles.breedSheetCard} onPress={() => {}}>
            <View style={styles.breedSheetHeader}>
              <View style={styles.breedSheetTitleWrap}>
                <Text style={styles.breedSheetTitle}>{isTr ? 'Irk sec' : 'Select breed'}</Text>
                <Text style={styles.breedSheetSubtitle}>
                  {petType === 'Cat' ? (isTr ? 'Kedi irklari' : 'Cat breeds') : (isTr ? 'Kopek irklari' : 'Dog breeds')}
                </Text>
              </View>
              <Pressable style={styles.breedSheetClose} onPress={() => setBreedModalOpen(false)}>
                <Text style={styles.breedSheetCloseText}>{isTr ? 'Kapat' : 'Close'}</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.breedScroll} contentContainerStyle={styles.breedScrollContent} showsVerticalScrollIndicator={false}>
              {breedOptions.map((item) => {
                const selected = item === breed;
                return (
                  <Pressable
                    key={item}
                    style={[styles.breedRow, selected ? styles.breedRowSelected : null]}
                    onPress={() => {
                      setBreed(item);
                      setBreedModalOpen(false);
                    }}
                  >
                    <View style={styles.breedRowMain}>
                      <Text style={[styles.breedRowText, selected ? styles.breedRowTextSelected : null]}>{item}</Text>
                      {item === 'Other' ? (
                        <Text style={styles.breedRowMeta}>{isTr ? 'Ozel' : 'Custom'}</Text>
                      ) : null}
                    </View>
                    {selected ? <Check size={16} color="#355b47" strokeWidth={2.4} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function PetTypeCard({
  label,
  helper,
  imageSource,
  selected,
  scale,
  onPress,
}: {
  label: string;
  helper: string;
  imageSource: number;
  selected: boolean;
  scale: Animated.Value;
  onPress: () => void;
}) {
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.typeCard, selected ? styles.typeCardSelected : styles.typeCardUnselected, pressed ? styles.typeCardPressed : null]}>
        {selected ? (
          <BlurView intensity={20} tint="light" style={styles.typeCardGlass} />
        ) : null}
        <View style={styles.typeThumbWrap}>
          <Image source={imageSource} style={styles.typeThumb} resizeMode="contain" />
        </View>
        <Text style={styles.typeTitle}>{label}</Text>
        <Text style={styles.typeHelper}>{helper}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ececec',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgBlobTopLeft: {
    position: 'absolute',
    width: 260,
    height: 250,
    borderRadius: 128,
    left: -136,
    top: -78,
    backgroundColor: 'rgba(196, 214, 200, 0.36)',
  },
  bgBlobTopRight: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -94,
    top: 56,
    backgroundColor: 'rgba(224, 217, 207, 0.42)',
  },
  bgBlobRightMiddle: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    right: -36,
    top: 340,
    backgroundColor: 'rgba(231, 233, 239, 0.5)',
  },
  bgBlobBottomLeft: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    left: -70,
    bottom: 100,
    backgroundColor: 'rgba(230, 232, 238, 0.48)',
  },
  bgBlobBottomRight: {
    position: 'absolute',
    width: 260,
    height: 270,
    borderRadius: 136,
    right: -120,
    bottom: -62,
    backgroundColor: 'rgba(230, 205, 176, 0.5)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },
  contentInner: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  topSection: {
    gap: 10,
  },
  bottomSection: {
    gap: 6,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: 2,
  },
  heroIllustration: {
    width: 152,
    height: 114,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '800',
    color: '#202226',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    color: '#6d6e72',
    textAlign: 'center',
  },
  typeGridShell: {
    borderRadius: 20,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.36)',
    borderWidth: 1,
    borderColor: 'rgba(16, 24, 20, 0.08)',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    minHeight: 140,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(31, 36, 42, 0.08)',
    backgroundColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden',
    shadowColor: '#101614',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    position: 'relative',
  },
  typeCardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  typeCardUnselected: {
    opacity: 0.92,
  },
  typeCardSelected: {
    borderColor: '#8fb69a',
    backgroundColor: 'rgba(235,245,238,0.88)',
    shadowColor: '#6e947a',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  typeCardPressed: {
    opacity: 0.95,
  },
  typeThumbWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  typeThumb: {
    width: 90,
    height: 90,
  },
  typeTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    color: '#1d2124',
    marginBottom: 1,
    letterSpacing: -0.3,
  },
  typeHelper: {
    fontSize: 14,
    lineHeight: 18,
    color: '#4e5459',
    textAlign: 'center',
  },
  fieldWrap: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#70757e',
    fontWeight: '600',
    marginLeft: 4,
    marginBottom: 6,
  },
  inputBase: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(23, 30, 26, 0.16)',
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 18,
  },
  nameInput: {
    fontSize: 16,
    lineHeight: 20,
    color: '#1f1f1f',
    fontWeight: '500',
  },
  nameInputFocused: {
    borderColor: '#95b29b',
    shadowColor: '#7f9f88',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectPressed: {
    opacity: 0.85,
  },
  selectText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#1f1f1f',
    fontWeight: '500',
    flexShrink: 1,
    paddingRight: 12,
  },
  selectPlaceholder: {
    color: '#959595',
  },
  footer: {
    marginTop: 4,
    gap: 8,
  },
  primaryButtonWrap: {
    borderRadius: 30,
    shadowColor: '#3f6f72',
    shadowOpacity: 0.24,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryButtonDisabledWrap: {
    shadowOpacity: 0.08,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonGradient: {
    minHeight: 58,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: '#eef4ef',
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 0,
  },
  secondaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secondaryLabel: {
    fontSize: 14,
    lineHeight: 18,
    color: '#1f1f1f',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(37, 33, 28, 0.24)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: '#fbf8f3',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#2c2f35',
    fontWeight: '700',
    marginBottom: 8,
  },
  nativeDatePicker: {
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  dateHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dateHeaderLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    color: '#7a8089',
    fontWeight: '700',
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dateColumn: {
    flex: 1,
    maxHeight: 188,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 158, 169, 0.22)',
    backgroundColor: '#fff',
  },
  dateItem: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(145, 153, 164, 0.1)',
  },
  dateItemActive: {
    backgroundColor: '#eef4e8',
  },
  dateItemText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#414a57',
    fontWeight: '500',
  },
  dateItemTextActive: {
    color: '#2f4835',
    fontWeight: '700',
  },
  applyDateBtn: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#2c3d56',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  applyDateBtnText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#fff',
    fontWeight: '700',
  },
  breedScroll: {
    maxHeight: 400,
  },
  breedScrollContent: {
    paddingBottom: 8,
  },
  breedSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(19, 24, 22, 0.2)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  breedSheetCard: {
    backgroundColor: '#fcfcfa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(25, 31, 28, 0.08)',
    paddingTop: 8,
    paddingBottom: 6,
    overflow: 'hidden',
    shadowColor: '#101514',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  breedSheetHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(25, 31, 28, 0.08)',
  },
  breedSheetTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  breedSheetTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#17201c',
    fontWeight: '700',
  },
  breedSheetSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    color: '#66706b',
    fontWeight: '500',
  },
  breedSheetClose: {
    minHeight: 32,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breedSheetCloseText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#355b47',
    fontWeight: '600',
  },
  breedRow: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(25, 31, 28, 0.06)',
  },
  breedRowSelected: {
    backgroundColor: '#f0f5f1',
  },
  breedRowMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  breedRowText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#1e2a24',
    fontWeight: '500',
  },
  breedRowTextSelected: {
    color: '#173624',
    fontWeight: '700',
  },
  breedRowMeta: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: '#7a847f',
    fontWeight: '500',
  },
});
