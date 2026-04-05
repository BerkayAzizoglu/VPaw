import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import {
  ActivityIndicator,
  Animated,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  UIManager,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';
import ScreenStateCard, { type ScreenStateMode } from '../components/ScreenStateCard';
import type { VetVisitReasonCategory } from '../lib/healthMvpModel';
import StickyBlurTopBar, { getStickyHeaderContentTop } from '../components/StickyBlurTopBar';
import PullRefreshIndicator from '../components/PullRefreshIndicator';
const vetVisitsHeaderLogo = require('../assets/illustrations/vetvisits-logo.png');

export type VisitActionType = 'vaccine' | 'diagnosis' | 'procedure' | 'test' | 'prescription';
type ReminderPreset = 'same_day' | 'one_day_before' | 'custom';

export type CreateVetVisitPayload = {
  date: string;
  clinic?: string;
  reason: VetVisitReasonCategory;
  status?: 'planned' | 'completed' | 'canceled';
  amount?: number;
  currency?: string;
  note?: string;
  attachments?: string[];
  reminderEnabled: boolean;
  reminderDate?: string;
  actions: Array<{
    type: VisitActionType;
    title: string;
    note?: string;
  }>;
};

type VetVisitsScreenProps = {
  onBack: () => void;
  backPreview?: ReactNode;
  isPremiumPlan?: boolean;
  onAddVisit?: () => void;
  onEditVisit?: (id: string, payload: CreateVetVisitPayload) => void;
  onOpenDocuments?: () => void;
  onRefresh?: () => Promise<void> | void;
  status?: 'ready' | ScreenStateMode;
  onRetry?: () => void;
  visits?: VisitItem[];
  /** Raw visit id prefix used to strip 'mvp-vet-' from VisitItem.id before calling onEditVisit */
  visitIdPrefix?: string;
};

export type VisitItem = {
  id: string;
  icon: 'stethoscope' | 'pulse';
  date: string;
  /** ISO date string (YYYY-MM-DD) for form editing */
  rawDate?: string;
  title: string;
  clinic: string;
  doctor: string;
  note?: string;
  amount?: number;
  currency?: string;
  paymentText?: string;
  attachments: string[];
  attachPlaceholder?: boolean;
  status?: 'planned' | 'completed' | 'canceled';
  followUpContext?: string;
  note?: string;
};

type VisitAttachmentPreview = {
  name: string;
  type: 'pdf' | 'file';
};

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

function toYmdLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseFlexibleDateToYmd(value: string) {
  const raw = value.trim();
  if (!raw) return null;

  const ymd = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return toYmdLocal(date);
    }
    return null;
  }

  const dmy = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return toYmdLocal(date);
    }
    return null;
  }

  const fallback = new Date(raw);
  if (!Number.isFinite(fallback.getTime())) return null;
  return toYmdLocal(fallback);
}

function getVisitYmd(item: VisitItem) {
  const source = (item.rawDate && item.rawDate.trim().length > 0 ? item.rawDate : item.date).trim();
  if (!source) return null;
  return parseFlexibleDateToYmd(source) ?? source.slice(0, 10);
}

let NativeMapView: React.ComponentType<any> | null = null;
let NativeMarker: React.ComponentType<any> | null = null;
let NativeMapInitError: string | null = null;
const IS_EXPO_GO_RUNTIME = Constants.appOwnership === 'expo';

try {
  const ReactNativeMaps = require('react-native-maps');
  NativeMapView = ReactNativeMaps.default;
  NativeMarker = ReactNativeMaps.Marker;
} catch (error) {
  NativeMapView = null;
  NativeMarker = null;
  NativeMapInitError = error instanceof Error ? error.message : 'unknown-map-init-error';
}

type ClinicSuggestion = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
};

const CLINIC_PICKER_DEFAULT_REGION: Region = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};
const GOOGLE_MAPS_WEB_API_KEY = (
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID
  || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
  || ''
).trim();

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatClinicDistance(distanceMeters?: number, isTr?: boolean) {
  if (distanceMeters == null) return '';
  if (distanceMeters < 1000) {
    const rounded = Math.round(distanceMeters / 10) * 10;
    return isTr ? `${rounded} m yakininda` : `${rounded} m away`;
  }
  const km = (distanceMeters / 1000).toFixed(1);
  return isTr ? `${km} km yakininda` : `${km} km away`;
}

function buildClinicAddress(parts: Array<string | undefined>) {
  return parts.map((part) => (part ?? '').trim()).filter(Boolean).join(', ');
}

function dedupeClinicSuggestions(items: ClinicSuggestion[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name.toLowerCase()}|${item.address.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getStaticMapZoom(region: Region) {
  const maxDelta = Math.max(region.latitudeDelta, region.longitudeDelta);
  if (maxDelta <= 0.008) return 15;
  if (maxDelta <= 0.02) return 14;
  if (maxDelta <= 0.05) return 13;
  return 12;
}

function buildStaticClinicMapUrl({
  region,
  clinics,
  selectedClinic,
  userCoords,
}: {
  region: Region;
  clinics: ClinicSuggestion[];
  selectedClinic: ClinicSuggestion | null;
  userCoords: { latitude: number; longitude: number } | null;
}) {
  if (!GOOGLE_MAPS_WEB_API_KEY) return null;

  const params = new URLSearchParams({
    center: `${region.latitude},${region.longitude}`,
    zoom: String(getStaticMapZoom(region)),
    size: '1000x500',
    scale: '2',
    maptype: 'roadmap',
    key: GOOGLE_MAPS_WEB_API_KEY,
  });

  params.append('style', 'feature:poi|visibility:off');
  params.append('style', 'feature:transit|visibility:off');

  clinics.slice(0, 12).forEach((clinic) => {
    const selected = selectedClinic?.id === clinic.id;
    const marker = selected
      ? `size:mid|color:0x47664a|${clinic.latitude},${clinic.longitude}`
      : `size:small|color:0x7f9a70|${clinic.latitude},${clinic.longitude}`;
    params.append('markers', marker);
  });

  if (userCoords) {
    params.append('markers', `size:mid|color:0x1f6fff|${userCoords.latitude},${userCoords.longitude}`);
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

async function fetchNearbyClinicSuggestions(latitude: number, longitude: number, locale: 'en' | 'tr') {
  if (!GOOGLE_MAPS_WEB_API_KEY) {
    throw new Error('missing-google-maps-key');
  }
  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    radius: '4500',
    keyword: 'veterinary clinic',
    language: locale === 'tr' ? 'tr' : 'en',
    key: GOOGLE_MAPS_WEB_API_KEY,
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`);
  if (!response.ok) throw new Error(`google-nearby-${response.status}`);
  const data = await response.json() as {
    status?: string;
    error_message?: string;
    results?: Array<{
      place_id?: string;
      name?: string;
      vicinity?: string;
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`google-nearby-${data.status}-${data.error_message ?? ''}`.trim());
  }

  const items: Array<ClinicSuggestion | null> = (data.results ?? []).map((entry, index) => {
    const lat = entry.geometry?.location?.lat;
    const lng = entry.geometry?.location?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      id: `nearby-${entry.place_id ?? index}`,
      name: entry.name?.trim() || (locale === 'tr' ? 'Veteriner Klinigi' : 'Veterinary Clinic'),
      address: (entry.vicinity ?? entry.formatted_address ?? '').trim(),
      latitude: lat as number,
      longitude: lng as number,
      distanceMeters: haversineMeters(latitude, longitude, lat as number, lng as number),
    };
  });

  return dedupeClinicSuggestions(items.filter((item): item is ClinicSuggestion => item != null))
    .sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER));
}

async function fetchSearchClinicSuggestions(query: string, locale: 'en' | 'tr', fallbackRegion?: { latitude: number; longitude: number }) {
  if (!GOOGLE_MAPS_WEB_API_KEY) {
    throw new Error('missing-google-maps-key');
  }
  const scopedQuery = `${query} veterinary clinic`;
  const params = new URLSearchParams({
    query: scopedQuery,
    language: locale === 'tr' ? 'tr' : 'en',
    key: GOOGLE_MAPS_WEB_API_KEY,
  });
  if (fallbackRegion) {
    params.set('location', `${fallbackRegion.latitude},${fallbackRegion.longitude}`);
    params.set('radius', '12000');
  }

  const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`);
  if (!response.ok) throw new Error(`google-text-${response.status}`);
  const data = await response.json() as {
    status?: string;
    error_message?: string;
    results?: Array<{
      place_id?: string;
      name?: string;
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`google-text-${data.status}-${data.error_message ?? ''}`.trim());
  }

  const items: Array<ClinicSuggestion | null> = (data.results ?? []).map((entry, index) => {
    const latitude = entry.geometry?.location?.lat;
    const longitude = entry.geometry?.location?.lng;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      id: `search-${entry.place_id ?? index}`,
      name: entry.name?.trim() || (locale === 'tr' ? 'Veteriner Klinigi' : 'Veterinary Clinic'),
      address: (entry.formatted_address ?? '').trim(),
      latitude: latitude as number,
      longitude: longitude as number,
      distanceMeters: fallbackRegion
        ? haversineMeters(fallbackRegion.latitude, fallbackRegion.longitude, latitude as number, longitude as number)
        : undefined,
    };
  });

  return dedupeClinicSuggestions(items.filter((item): item is ClinicSuggestion => item != null));
}

function Icon({ kind, size = 18, color = '#7a7a7a' }: { kind: 'back' | 'stethoscope' | 'wallet' | 'clinic' | 'file' | 'plus' | 'pulse' | 'edit' | 'check' | 'camera' | 'map' | 'calendar'; size?: number; color?: string }) {
  if (kind === 'edit') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.4 18.5 6.5L17.5 5.5C16.7 4.7 15.3 4.7 14.5 5.5L4 16V20Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M13.5 6.5L17.5 10.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }
  if (kind === 'check') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5.5 12.5L9.5 16.5L18.5 7.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'stethoscope') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 4V8.2C7 10.8 8.8 12.8 11.1 13.3V15.1C11.1 17.2 12.8 19 14.9 19C17 19 18.7 17.3 18.7 15.2V14.3" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M14.8 4V8.2C14.8 10.9 13 13 10.5 13.3" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="18.9" cy="12.8" r="2.2" stroke={color} strokeWidth={1.9} />
      </Svg>
    );
  }

  if (kind === 'pulse') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3.8 12H8.3L10.2 8.5L13 16L15.1 11.5H20.2" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'wallet') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5.5 7.5H17.5C18.6 7.5 19.5 8.4 19.5 9.5V15.5C19.5 16.6 18.6 17.5 17.5 17.5H6.5C5.4 17.5 4.5 16.6 4.5 15.5V8.5C4.5 7.9 4.9 7.5 5.5 7.5Z" stroke={color} strokeWidth={1.8} />
        <Path d="M16 12H19.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'clinic') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6.5 18.5V9.2L10.5 6.8L14.5 9.2V18.5" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
        <Path d="M3.8 18.5H20.2" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
        <Path d="M9 12.2H12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        <Path d="M10.5 10.7V13.7" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'file') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7.2 4.8H15.4L18.8 8.2V19.2H7.2V4.8Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
        <Path d="M15.2 4.8V8.2H18.8" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
        <Line x1="9.6" y1="12" x2="16" y2="12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
    );
  }
  if (kind === 'map') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" />
        <Circle cx="12" cy="10" r="2.6" />
      </Svg>
    );
  }

  if (kind === 'camera') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4.5 8.5H7.3L8.8 6.5H15.2L16.7 8.5H19.5C20.3 8.5 21 9.2 21 10V18C21 18.8 20.3 19.5 19.5 19.5H4.5C3.7 19.5 3 18.8 3 18V10C3 9.2 3.7 8.5 4.5 8.5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Circle cx="12" cy="14" r="3.2" stroke={color} strokeWidth={1.8} />
      </Svg>
    );
  }

  if (kind === 'calendar') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7.2 5.8V8M16.8 5.8V8M5.8 9H18.2M7 19H17C18.1 19 19 18.1 19 17V8C19 6.9 18.1 6 17 6H7C5.9 6 5 6.9 5 8V17C5 18.1 5.9 19 7 19Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6V18M6 12H18" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}


const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTHS_TR = ['OCA','ŞUB','MAR','NİS','MAY','HAZ','TEM','AĞU','EYL','EKİ','KAS','ARA'];

function VisitCard({
  item,
  isTr,
  tone,
  onPress,
  onEdit,
  onOpenDocuments,
}: {
  item: VisitItem;
  isTr: boolean;
  tone: 'upcoming' | 'completed' | 'canceled' | 'overdue';
  onPress?: () => void;
  onEdit?: () => void;
  onOpenDocuments?: () => void;
}) {
  const isoDate = item.rawDate ?? '';
  const parts = isoDate.split('-');
  const monthIdx = parseInt(parts[1] ?? '1', 10) - 1;
  const day = parts[2] ?? '—';
  const mon = (isTr ? MONTHS_TR : MONTHS_EN)[monthIdx] ?? '—';
  const year = parts[0]?.slice(2) ?? '—';
  const isUpcoming = tone === 'upcoming';
  const isCanceled = tone === 'canceled';
  const isOverdue = tone === 'overdue';
  const hasAmount = item.amount != null;
  const dateTone = isOverdue
    ? styles.visitCardDateColOverdue
    : isUpcoming
      ? styles.visitCardDateColUpcoming
      : isCanceled
        ? styles.visitCardDateColCanceled
        : styles.visitCardDateColCompleted;
  const monTone = isOverdue
    ? styles.visitCardMonOverdue
    : isUpcoming
      ? styles.visitCardMonUpcoming
      : isCanceled
        ? styles.visitCardMonCanceled
        : styles.visitCardMonCompleted;
  const dayTone = isOverdue
    ? styles.visitCardDayOverdue
    : isUpcoming
      ? styles.visitCardDayUpcoming
      : isCanceled
        ? styles.visitCardDayCanceled
        : styles.visitCardDayCompleted;
  const editBtnTone = isOverdue
    ? styles.visitCardEditBtnOverdue
    : isUpcoming
      ? styles.visitCardEditBtnUpcoming
      : isCanceled
        ? styles.visitCardEditBtnCanceled
        : styles.visitCardEditBtnCompleted;
  const editIconColor = isOverdue ? '#9a7220' : isUpcoming ? '#4b6d4d' : isCanceled ? '#7d604e' : '#55635a';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.visitCardNew,
        isOverdue ? styles.visitCardOverdue : isUpcoming ? styles.visitCardUpcoming : isCanceled ? styles.visitCardCanceled : styles.visitCardCompleted,
        pressed ? styles.visitCardPressed : null,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.visitCardSideAccent, isOverdue ? styles.visitCardSideAccentOverdue : isUpcoming ? styles.visitCardSideAccentUpcoming : isCanceled ? styles.visitCardSideAccentCanceled : styles.visitCardSideAccentCompleted]} />
      {/* Date column */}
      <View style={[styles.visitCardDateCol, dateTone]}>
        <Text style={[styles.visitCardMon, monTone]}>{mon}</Text>
        <Text style={[styles.visitCardDay, dayTone]}>{day}</Text>
        {!isUpcoming ? <Text style={styles.visitCardYear}>{`'${year}`}</Text> : null}
      </View>

      {/* Divider */}
      <View style={styles.visitCardDivider} />

      {/* Body */}
      <View style={styles.visitCardBody}>
        <Text style={styles.visitCardClinic} numberOfLines={1}>
          {item.clinic || (isTr ? 'Veteriner Kliniği' : 'Vet Clinic')}
        </Text>
        <View style={styles.visitCardTitleRow}>
          {item.title ? (
            <Text style={styles.visitCardTitle} numberOfLines={1}>{item.title}</Text>
          ) : (
            <Text style={styles.visitCardTitleMuted} numberOfLines={1}>{isTr ? 'Detay eklenmedi' : 'No detail added'}</Text>
          )}
          {!isUpcoming && !hasAmount ? (
            <View style={styles.visitCardMissingCostDotWrap}>
              <View style={[styles.visitCardMissingCostDot, isCanceled ? styles.visitCardMissingCostDotCanceled : null]} />
            </View>
          ) : null}
        </View>
        {item.followUpContext ? (
          <Text style={styles.visitCardFollowUpCtx} numberOfLines={1}>
            {`↩ ${item.followUpContext}`}
          </Text>
        ) : null}
        <View style={styles.visitCardMeta}>
          {isUpcoming ? (
            <View style={[styles.visitCardPlannedBadge, styles.visitCardPlannedBadgeUpcoming]}>
              <Text style={[styles.visitCardPlannedText, styles.visitCardPlannedTextUpcoming]}>{isTr ? 'Planlandı' : 'Planned'}</Text>
            </View>
          ) : (
            <>
              {isCanceled ? (
                <View style={styles.visitCardCanceledBadge}>
                  <Text style={styles.visitCardCanceledText}>{isTr ? 'Iptal' : 'Canceled'}</Text>
                </View>
              ) : null}
              {hasAmount ? (
                <View style={[styles.visitCardAmountPill, isCanceled ? styles.visitCardAmountPillCanceled : styles.visitCardAmountPillCompleted]}>
                  <Text style={[styles.visitCardAmountText, isCanceled ? styles.visitCardAmountTextCanceled : styles.visitCardAmountTextCompleted]}>
                    {item.amount.toLocaleString('tr-TR')} {item.currency ?? 'TL'}
                  </Text>
                </View>
              ) : (
                <View style={styles.visitCardNoAmountPill}>
                  <Text style={styles.visitCardNoAmountText}>{isTr ? 'Tutar yok' : 'No amount'}</Text>
                </View>
              )}
              {item.attachments.length > 0 ? (
                <View style={styles.visitCardDocPill}>
                  <Icon kind="file" size={11} color="#5d605a" />
                  <Text style={styles.visitCardDocText}>
                    {item.attachments.length} {isTr ? 'belge hazir' : 'doc ready'}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>

      {/* Edit shortcut button */}
      {onEdit ? (
        <Pressable style={[styles.visitCardEditBtn, editBtnTone]} onPress={onEdit} hitSlop={12}>
          <Icon kind="edit" size={14} color={editIconColor} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function StaticClinicMapPreview({
  clinics,
  isTr,
  isExpoGo,
  initError,
  region,
  selectedClinic,
  userCoords,
}: {
  clinics: ClinicSuggestion[];
  isTr: boolean;
  isExpoGo: boolean;
  initError?: string | null;
  region: Region;
  selectedClinic: ClinicSuggestion | null;
  userCoords: { latitude: number; longitude: number } | null;
}) {
  const [staticMapFailed, setStaticMapFailed] = useState(false);
  const staticMapUrl = useMemo(
    () => buildStaticClinicMapUrl({ region, clinics, selectedClinic, userCoords }),
    [region, clinics, selectedClinic, userCoords],
  );

  const latMin = region.latitude - region.latitudeDelta / 2;
  const latMax = region.latitude + region.latitudeDelta / 2;
  const lngMin = region.longitude - region.longitudeDelta / 2;
  const lngMax = region.longitude + region.longitudeDelta / 2;

  const mapPoints = clinics.slice(0, 20).map((clinic) => {
    const latRange = Math.max(latMax - latMin, 0.0001);
    const lngRange = Math.max(lngMax - lngMin, 0.0001);
    const xRaw = ((clinic.longitude - lngMin) / lngRange) * 100;
    const yRaw = (1 - (clinic.latitude - latMin) / latRange) * 100;
    return {
      id: clinic.id,
      selected: selectedClinic?.id === clinic.id,
      x: Math.max(7, Math.min(93, xRaw)),
      y: Math.max(8, Math.min(92, yRaw)),
    };
  });

  const userDot = userCoords
    ? {
        x: Math.max(7, Math.min(93, ((userCoords.longitude - lngMin) / Math.max(lngMax - lngMin, 0.0001)) * 100)),
        y: Math.max(8, Math.min(92, (1 - (userCoords.latitude - latMin) / Math.max(latMax - latMin, 0.0001)) * 100)),
      }
    : null;

  const helperText = isExpoGo
    ? (isTr ? 'Expo Go fallback map preview' : 'Expo Go fallback map preview')
    : (isTr ? 'Native map fallback preview' : 'Native map fallback preview');

  return (
    <View style={styles.clinicMapFallback}>
      <View style={styles.staticClinicMap}>
        {staticMapUrl && !staticMapFailed ? (
          <View style={styles.staticClinicMapSurface}>
            <Image
              source={{ uri: staticMapUrl }}
              style={styles.staticClinicMapImage}
              resizeMode="cover"
              onError={() => setStaticMapFailed(true)}
            />
            <View pointerEvents="none" style={styles.staticClinicMapFade} />
            <View style={styles.staticClinicPreviewBadge}>
              <Text style={styles.staticClinicPreviewBadgeText}>{helperText}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.staticClinicMapSurface}>
            <View style={[styles.staticClinicMapTile, { top: -50, left: -12, backgroundColor: 'rgba(126,154,136,0.08)' }]} />
            <View style={[styles.staticClinicMapTile, { top: 36, left: 128, backgroundColor: 'rgba(126,154,136,0.06)' }]} />
            <View style={[styles.staticClinicMapTile, { top: 132, left: 24, backgroundColor: 'rgba(126,154,136,0.05)' }]} />
            {mapPoints.map((point) => (
              <View
                key={point.id}
                style={[
                  styles.staticClinicMarkerAnchor,
                  { left: `${point.x}%`, top: `${point.y}%` },
                ]}
              >
                <View style={[styles.staticClinicMarker, point.selected ? styles.staticClinicMarkerSelected : null]} />
              </View>
            ))}
            {userDot ? (
              <View style={[styles.staticClinicUserDot, { left: `${userDot.x}%`, top: `${userDot.y}%`, marginLeft: -5, marginTop: -5 }]} />
            ) : null}
            <View pointerEvents="none" style={styles.staticClinicMapFade} />
            <View style={styles.staticClinicPreviewBadge}>
              <Text style={styles.staticClinicPreviewBadgeText}>{helperText}</Text>
            </View>
          </View>
        )}
      </View>
      <Text style={styles.clinicMapFallbackTitle}>
        {isTr ? `${clinics.length} klinik onizlemede listelendi` : `${clinics.length} clinics shown in preview`}
      </Text>
      {initError ? (
        <Text style={styles.clinicMapFallbackHint}>
          {isTr ? 'Native modul yuklenmedigi icin statik onizleme gosteriliyor.' : 'Native module is unavailable, so static preview is shown.'}
        </Text>
      ) : null}
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
  tone = 'neutral',
}: {
  title: string;
  subtitle?: string;
  count: number;
  tone?: 'neutral' | 'success' | 'muted' | 'warn';
}) {
  return (
    <View style={styles.sectionHeaderBlock}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderTextWrap}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        <View
          style={[
            styles.sectionCountPill,
            tone === 'success' ? styles.sectionCountPillSuccess : null,
            tone === 'muted' ? styles.sectionCountPillMuted : null,
            tone === 'warn' ? styles.sectionCountPillWarn : null,
          ]}
        >
          <Text
            style={[
              styles.sectionCountText,
              tone === 'success' ? styles.sectionCountTextSuccess : null,
              tone === 'muted' ? styles.sectionCountTextMuted : null,
              tone === 'warn' ? styles.sectionCountTextWarn : null,
            ]}
          >
            {count}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function VetVisitsScreen({
  onBack,
  backPreview,
  isPremiumPlan = false,
  onAddVisit,
  onEditVisit,
  onOpenDocuments,
  onRefresh,
  status = 'ready',
  onRetry,
  visits,
}: VetVisitsScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).vetVisits;
  const isTr = locale === 'tr';
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const topInset = Math.max(insets.top, 14);

  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<VisitItem | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<VisitAttachmentPreview | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const [visitDate, setVisitDate] = useState(today);
  const [showVisitDatePicker, setShowVisitDatePicker] = useState(false);
  const [visitClinic, setVisitClinic] = useState('');
  const [visitReason, setVisitReason] = useState<VetVisitReasonCategory>('checkup');
  const [visitStatus, setVisitStatus] = useState<'planned' | 'completed' | 'canceled'>('completed');
  const [visitNote, setVisitNote] = useState('');
  const [visitAmount, setVisitAmount] = useState('');
  const [visitCurrency, setVisitCurrency] = useState('TL');
  const [visitAttachments, setVisitAttachments] = useState<string[]>([]);
  const [attachmentInput, setAttachmentInput] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [scanModeEnabled, setScanModeEnabled] = useState(false);
  const [reminderPreset, setReminderPreset] = useState<ReminderPreset>('same_day');
  const [reminderDate, setReminderDate] = useState(today);
  const [selectedActions, setSelectedActions] = useState<Record<VisitActionType, boolean>>({
    vaccine: false,
    diagnosis: false,
    procedure: false,
    test: false,
    prescription: false,
  });
  const [selectedActionOptions, setSelectedActionOptions] = useState<Record<VisitActionType, string>>({
    vaccine: '',
    diagnosis: '',
    procedure: '',
    test: '',
    prescription: '',
  });
  const [customActionTitles, setCustomActionTitles] = useState<Record<VisitActionType, string>>({
    vaccine: '',
    diagnosis: '',
    procedure: '',
    test: '',
    prescription: '',
  });
  const [actionNotes, setActionNotes] = useState<Record<VisitActionType, string>>({
    vaccine: '',
    diagnosis: '',
    procedure: '',
    test: '',
    prescription: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [clinicPickerVisible, setClinicPickerVisible] = useState(false);
  const [clinicPickerBusy, setClinicPickerBusy] = useState(false);
  const [clinicSearchBusy, setClinicSearchBusy] = useState(false);
  const [clinicPickerError, setClinicPickerError] = useState<string | null>(null);
  const [clinicSearchQuery, setClinicSearchQuery] = useState('');
  const [clinicNearbyResults, setClinicNearbyResults] = useState<ClinicSuggestion[]>([]);
  const [clinicSearchResults, setClinicSearchResults] = useState<ClinicSuggestion[]>([]);
  const [clinicUserCoords, setClinicUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [clinicRegion, setClinicRegion] = useState<Region>(CLINIC_PICKER_DEFAULT_REGION);
  const [selectedClinic, setSelectedClinic] = useState<ClinicSuggestion | null>(null);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllCanceled, setShowAllCanceled] = useState(false);
  const savePressScale = useRef(new Animated.Value(1)).current;
  const detailSheetTranslateY = useRef(new Animated.Value(28)).current;
  const detailBackdropOpacity = useRef(new Animated.Value(0)).current;
  const detailSheetHeightRef = useRef(420);
  const detailDismissLock = useRef(false);
  const clinicSheetTranslateY = useRef(new Animated.Value(28)).current;
  const clinicBackdropOpacity = useRef(new Animated.Value(0)).current;
  const clinicSheetHeightRef = useRef(560);
  const clinicDismissLock = useRef(false);
  const visitClinicInputRef = useRef<TextInput | null>(null);
  const visitAmountInputRef = useRef<TextInput | null>(null);
  const visitNoteInputRef = useRef<TextInput | null>(null);

  const actionOrder: VisitActionType[] = ['vaccine', 'diagnosis', 'procedure', 'test', 'prescription'];
  const actionLabels: Record<VisitActionType, string> = isTr
    ? {
      vaccine: 'Aşı',
      diagnosis: 'Tanı',
      procedure: 'Prosedür',
      test: 'Test',
      prescription: 'Reçete',
    }
    : {
      vaccine: 'Vaccine',
      diagnosis: 'Diagnosis',
      procedure: 'Procedure',
      test: 'Test',
      prescription: 'Prescription',
    };

  const actionOptions: Record<VisitActionType, Array<{ value: string; label: string }>> = isTr
    ? {
      vaccine: [
        { value: 'rabies', label: 'Kuduz' },
        { value: 'dhpp', label: 'DHPP' },
        { value: 'bordetella', label: 'Bordetella' },
        { value: 'leptospirosis', label: 'Leptospirosis' },
        { value: 'other', label: 'Diğer' },
      ],
      diagnosis: [
        { value: 'allergy', label: 'Alerji' },
        { value: 'infection', label: 'Enfeksiyon' },
        { value: 'gastro', label: 'Gastrointestinal' },
        { value: 'dermatology', label: 'Dermatoloji' },
        { value: 'other', label: 'Diğer' },
      ],
      procedure: [
        { value: 'neutering', label: 'Kısırlaştırma' },
        { value: 'dental_cleaning', label: 'Diş Temizliği' },
        { value: 'minor_surgery', label: 'Minor Cerrahi' },
        { value: 'wound_care', label: 'Yara Bakımı' },
        { value: 'other', label: 'Diğer' },
      ],
      test: [
        { value: 'blood_test', label: 'Kan Testi' },
        { value: 'fecal_test', label: 'Dışkı Testi' },
        { value: 'xray', label: 'Röntgen' },
        { value: 'ultrasound', label: 'Ultrason' },
        { value: 'other', label: 'Diğer' },
      ],
      prescription: [
        { value: 'antibiotic', label: 'Antibiyotik' },
        { value: 'anti_inflammatory', label: 'Anti-inflamatuar' },
        { value: 'antiparasitic', label: 'Antiparaziter' },
        { value: 'supplement', label: 'Takviye' },
        { value: 'other', label: 'Diğer' },
      ],
    }
    : {
      vaccine: [
        { value: 'rabies', label: 'Rabies' },
        { value: 'dhpp', label: 'DHPP' },
        { value: 'bordetella', label: 'Bordetella' },
        { value: 'leptospirosis', label: 'Leptospirosis' },
        { value: 'other', label: 'Other' },
      ],
      diagnosis: [
        { value: 'allergy', label: 'Allergy' },
        { value: 'infection', label: 'Infection' },
        { value: 'gastro', label: 'Gastrointestinal' },
        { value: 'dermatology', label: 'Dermatology' },
        { value: 'other', label: 'Other' },
      ],
      procedure: [
        { value: 'neutering', label: 'Neutering' },
        { value: 'dental_cleaning', label: 'Dental Cleaning' },
        { value: 'minor_surgery', label: 'Minor Surgery' },
        { value: 'wound_care', label: 'Wound Care' },
        { value: 'other', label: 'Other' },
      ],
      test: [
        { value: 'blood_test', label: 'Blood Test' },
        { value: 'fecal_test', label: 'Fecal Test' },
        { value: 'xray', label: 'X-ray' },
        { value: 'ultrasound', label: 'Ultrasound' },
        { value: 'other', label: 'Other' },
      ],
      prescription: [
        { value: 'antibiotic', label: 'Antibiotic' },
        { value: 'anti_inflammatory', label: 'Anti-inflammatory' },
        { value: 'antiparasitic', label: 'Antiparasitic' },
        { value: 'supplement', label: 'Supplement' },
        { value: 'other', label: 'Other' },
      ],
    };

  const reasonOptions: Array<{ value: VetVisitReasonCategory; label: string }> = isTr
    ? [
      { value: 'checkup', label: 'Kontrol' },
      { value: 'vaccine', label: 'Aşı' },
      { value: 'illness', label: 'Hastalık' },
      { value: 'injury', label: 'Yaralanma' },
      { value: 'follow_up', label: 'Takip' },
      { value: 'other', label: 'Diğer' },
    ]
    : [
      { value: 'checkup', label: 'Checkup' },
      { value: 'vaccine', label: 'Vaccine' },
      { value: 'illness', label: 'Illness' },
      { value: 'injury', label: 'Injury' },
      { value: 'follow_up', label: 'Follow-up' },
      { value: 'other', label: 'Other' },
    ];

  const toggleAction = (type: VisitActionType) => {
    setSelectedActions((prev) => {
      const nextEnabled = !prev[type];
      if (!nextEnabled) {
        setSelectedActionOptions((optPrev) => ({ ...optPrev, [type]: '' }));
        setCustomActionTitles((titlePrev) => ({ ...titlePrev, [type]: '' }));
        setActionNotes((notePrev) => ({ ...notePrev, [type]: '' }));
      }
      return { ...prev, [type]: nextEnabled };
    });
  };

  const visibleClinicResults = clinicSearchQuery.trim().length >= 2 ? clinicSearchResults : clinicNearbyResults;

  const handleClinicInputChange = (value: string) => {
    setVisitClinic(value);
    if (selectedClinic && value.trim() !== selectedClinic.name) {
      setSelectedClinic(null);
    }
  };

  const closeClinicPickerSheet = (afterClose?: () => void) => {
    if (clinicDismissLock.current) return;
    clinicDismissLock.current = true;
    Animated.parallel([
      Animated.spring(clinicSheetTranslateY, {
        toValue: clinicSheetHeightRef.current,
        damping: 28,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.timing(clinicBackdropOpacity, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start(() => {
      clinicDismissLock.current = false;
      setClinicPickerVisible(false);
      requestAnimationFrame(() => {
        clinicSheetTranslateY.setValue(clinicSheetHeightRef.current);
        afterClose?.();
      });
    });
  };

  const restoreClinicPickerSheet = () => {
    Animated.parallel([
      Animated.spring(clinicSheetTranslateY, {
        toValue: 0,
        damping: 30,
        stiffness: 320,
        mass: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(clinicBackdropOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const selectClinicSuggestion = (clinic: ClinicSuggestion) => {
    setSelectedClinic(clinic);
    setVisitClinic(clinic.name);
    setClinicRegion({
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    });
    closeClinicPickerSheet();
  };

  const loadNearbyClinicSuggestions = async () => {
    setClinicPickerBusy(true);
    setClinicPickerError(null);
    try {
      let coords = clinicUserCoords;
      if (!coords) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          setClinicNearbyResults([]);
          setClinicPickerError(isTr ? 'Konum izni verilmedi. Yine de arama ile klinik bulabilirsiniz.' : 'Location permission was not granted. You can still search clinics manually.');
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setClinicUserCoords(coords);
      }

      setClinicRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      });
      const results = await fetchNearbyClinicSuggestions(coords.latitude, coords.longitude, locale);
      setClinicNearbyResults(results);
      if (results.length === 0) {
        setClinicPickerError(isTr ? 'Yakinda klinik bulunamadi. Arama ile devam edebilirsiniz.' : 'No nearby clinics were found. You can continue with search.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('missing-google-maps-key')) {
        setClinicPickerError(
          isTr
            ? 'Harita/klinik onerisi icin Google Maps API key gerekli. Simdilik klinik adini manuel yazabilirsiniz.'
            : 'Google Maps API key is required for clinic suggestions. You can type clinic name manually for now.',
        );
      } else {
        setClinicPickerError(isTr ? 'Klinik onerileri yuklenemedi. Arama ile deneyin.' : 'Clinic suggestions could not load. Please try search.');
      }
    } finally {
      setClinicPickerBusy(false);
    }
  };

  const openClinicPicker = async () => {
    setClinicPickerVisible(true);
    setClinicSearchQuery('');
    setClinicSearchResults([]);
    if (clinicNearbyResults.length === 0 && !clinicPickerBusy) {
      await loadNearbyClinicSuggestions();
    }
  };

  const clinicSheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => (
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
        gestureState.dy > 2
      ),
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => (
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
        gestureState.dy > 2
      ),
      onPanResponderMove: (_evt, gestureState) => {
        const rawDy = gestureState.dy;
        const translateY = rawDy <= 0
          ? rawDy * 0.14
          : rawDy < 120
            ? rawDy * 0.92
            : 110 + (rawDy - 120) * 0.36;
        clinicSheetTranslateY.setValue(translateY);
        clinicBackdropOpacity.setValue(Math.max(0, 1 - translateY / Math.max(clinicSheetHeightRef.current * 0.72, 1)));
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const shouldDismiss = gestureState.dy > 92 || gestureState.vy > 1.15;
        if (shouldDismiss) {
          closeClinicPickerSheet();
          return;
        }
        restoreClinicPickerSheet();
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminate: restoreClinicPickerSheet,
    }),
  ).current;

  const normalizeAttachmentName = React.useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    return trimmed.replace(/\s+/g, ' ');
  }, []);

  const addAttachmentName = React.useCallback((raw: string) => {
    const normalized = normalizeAttachmentName(raw);
    if (!normalized) return;
    setVisitAttachments((prev) => {
      if (prev.some((item) => item.toLowerCase() === normalized.toLowerCase())) return prev;
      return [...prev, normalized];
    });
  }, [normalizeAttachmentName]);

  const handlePickAttachmentFromLibrary = React.useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          isTr ? 'Izin gerekli' : 'Permission required',
          isTr ? 'Dosya secmek icin galeri izni verin.' : 'Please allow media library access to select a file.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const fileName = asset.fileName?.trim()
        || asset.uri.split('/').pop()?.trim()
        || (isTr ? 'Ek dosya.jpg' : 'Attachment.jpg');
      addAttachmentName(fileName);
    } catch {
      Alert.alert(
        isTr ? 'Dosya secilemedi' : 'Could not attach file',
        isTr ? 'Lutfen tekrar deneyin.' : 'Please try again.',
      );
    }
  }, [addAttachmentName, isTr]);

  const handleQuickCameraAttachment = React.useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          isTr ? 'Kamera izni gerekli' : 'Camera permission required',
          isTr ? 'Hizli fotograf eklemek icin kamera izni verin.' : 'Please allow camera access to capture attachment photos.',
        );
        return;
      }

      const isScanCapture = isPremiumPlan && scanModeEnabled;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: isScanCapture,
        quality: isScanCapture ? 0.95 : 0.85,
        aspect: isScanCapture ? [3, 4] : undefined,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
      const baseName = asset.fileName?.trim() || asset.uri.split('/').pop()?.trim() || `${isScanCapture ? 'scan' : 'photo'}_${timestamp}.jpg`;
      const fileName = isScanCapture ? `scan_${timestamp}_${baseName}` : `photo_${timestamp}_${baseName}`;
      addAttachmentName(fileName);
    } catch {
      Alert.alert(
        isTr ? 'Kamera acilamadi' : 'Camera could not open',
        isTr ? 'Lutfen tekrar deneyin.' : 'Please try again.',
      );
    }
  }, [addAttachmentName, isPremiumPlan, isTr, scanModeEnabled]);

  const resetCreateForm = () => {
    setVisitDate(today);
    setShowVisitDatePicker(false);
    setVisitClinic('');
    setVisitReason('checkup');
    setVisitStatus('completed');
    setVisitNote('');
    setVisitAmount('');
    setVisitCurrency('TL');
    setScanModeEnabled(false);
    setVisitAttachments([]);
    setAttachmentInput('');
    setReminderEnabled(false);
    setReminderPreset('same_day');
    setReminderDate(today);
    setSelectedActions({
      vaccine: false,
      diagnosis: false,
      procedure: false,
      test: false,
      prescription: false,
    });
    setSelectedActionOptions({
      vaccine: '',
      diagnosis: '',
      procedure: '',
      test: '',
      prescription: '',
    });
    setCustomActionTitles({
      vaccine: '',
      diagnosis: '',
      procedure: '',
      test: '',
      prescription: '',
    });
    setActionNotes({
      vaccine: '',
      diagnosis: '',
      procedure: '',
      test: '',
      prescription: '',
    });
    setSelectedClinic(null);
    setClinicSearchQuery('');
    setClinicSearchResults([]);
    setShowAllCompleted(false);
    setShowAllCanceled(false);
  };

  const openEditModal = (item: VisitItem) => {
    resetCreateForm();
    setEditingVisitId(item.id);
    setVisitDate(item.rawDate ?? item.date);
    setVisitClinic(item.clinic ?? '');
    setSelectedClinic(null);
    if (item.status) setVisitStatus(item.status);
    if (item.amount != null) setVisitAmount(String(item.amount));
    if (item.currency) setVisitCurrency(item.currency);
    setVisitNote(item.note ?? (item.doctor && item.doctor !== 'Veterinarian' ? item.doctor : ''));
    setVisitAttachments(item.attachments ?? []);
    setAttachmentInput('');
    setIsCreateVisible(true);
  };

  const openAttachmentPreview = React.useCallback((name: string) => {
    const lowerName = name.toLowerCase();
    setAttachmentPreview({
      name,
      type: lowerName.endsWith('.pdf') ? 'pdf' : 'file',
    });
  }, []);

  const closeDetailSheet = (afterClose?: () => void) => {
    if (detailDismissLock.current) return;
    detailDismissLock.current = true;
    Animated.parallel([
      Animated.spring(detailSheetTranslateY, {
        toValue: detailSheetHeightRef.current,
        damping: 28,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.timing(detailBackdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      detailDismissLock.current = false;
      setDetailItem(null);
      requestAnimationFrame(() => {
        detailSheetTranslateY.setValue(detailSheetHeightRef.current);
        afterClose?.();
      });
    });
  };

  const detailSheetPanResponder = useRef(
    PanResponder.create({
      // Let taps on header/body controls (Edit, Close, attachments) work normally.
      // We only claim responder when user is clearly dragging downward.
      onStartShouldSetPanResponderCapture: () => false,
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => (
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
        gestureState.dy > 2
      ),
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => (
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
        gestureState.dy > 2
      ),
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dy > 0) {
          detailSheetTranslateY.setValue(gestureState.dy);
          detailBackdropOpacity.setValue(Math.max(0, 1 - gestureState.dy / Math.max(detailSheetHeightRef.current, 1)));
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 56 || gestureState.vy > 0.55) {
          closeDetailSheet();
          return;
        }
        Animated.parallel([
          Animated.spring(detailSheetTranslateY, {
            toValue: 0,
            damping: 26,
            stiffness: 380,
            mass: 0.85,
            useNativeDriver: true,
          }),
          Animated.timing(detailBackdropOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(detailSheetTranslateY, {
            toValue: 0,
            damping: 26,
            stiffness: 380,
            mass: 0.85,
            useNativeDriver: true,
          }),
          Animated.timing(detailBackdropOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      },
    }),
  ).current;

  const reminderPresetOptions: Array<{ value: ReminderPreset; label: string }> = isTr
    ? [
      { value: 'one_day_before', label: '1 gün önce' },
      { value: 'same_day', label: 'Aynı gün' },
      { value: 'custom', label: 'Özel tarih' },
    ]
    : [
      { value: 'one_day_before', label: '1 day before' },
      { value: 'same_day', label: 'Same day' },
      { value: 'custom', label: 'Custom' },
    ];

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const getReminderDateByPreset = (baseIso: string, preset: ReminderPreset) => {
    const base = new Date(baseIso);
    if (!Number.isFinite(base.getTime())) return baseIso;
    if (preset === 'same_day') return base.toISOString();
    if (preset === 'one_day_before') {
      const next = new Date(base.getTime() - 24 * 60 * 60 * 1000);
      return next.toISOString();
    }
    return reminderDate;
  };

  useEffect(() => {
    if (!reminderEnabled) return;
    if (reminderPreset === 'custom') return;
    const visitIso = parseInputDate(visitDate);
    if (!visitIso) return;
    const autoReminder = getReminderDateByPreset(visitIso, reminderPreset);
    const dateOnly = autoReminder.slice(0, 10);
    setReminderDate(dateOnly);
  }, [reminderEnabled, reminderPreset, visitDate]);

  useEffect(() => {
    if (!detailItem) {
      detailSheetTranslateY.setValue(detailSheetHeightRef.current);
      detailBackdropOpacity.setValue(0);
      return;
    }
    detailDismissLock.current = false;
    detailSheetTranslateY.setValue(detailSheetHeightRef.current);
    detailBackdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(detailSheetTranslateY, {
        toValue: 0,
        damping: 26,
        stiffness: 380,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.timing(detailBackdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [detailBackdropOpacity, detailItem, detailSheetTranslateY]);

  useEffect(() => {
    if (!clinicPickerVisible) {
      clinicSheetTranslateY.setValue(clinicSheetHeightRef.current);
      clinicBackdropOpacity.setValue(0);
      return;
    }
    clinicDismissLock.current = false;
    clinicSheetTranslateY.setValue(clinicSheetHeightRef.current);
    clinicBackdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(clinicSheetTranslateY, {
        toValue: 0,
        damping: 26,
        stiffness: 360,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(clinicBackdropOpacity, {
        toValue: 1,
        duration: 190,
        useNativeDriver: true,
      }),
    ]).start();
  }, [clinicBackdropOpacity, clinicPickerVisible, clinicSheetTranslateY]);

  useEffect(() => {
    if (!clinicPickerVisible) return;
    const query = clinicSearchQuery.trim();
    if (query.length < 2) {
      setClinicSearchResults([]);
      setClinicSearchBusy(false);
      return;
    }
    let cancelled = false;
    setClinicSearchBusy(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await fetchSearchClinicSuggestions(query, locale, clinicUserCoords ?? undefined);
        if (!cancelled) {
          setClinicSearchResults(results);
          if (results[0]) {
            setClinicRegion({
              latitude: results[0].latitude,
              longitude: results[0].longitude,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (!cancelled) {
          if (message.includes('missing-google-maps-key')) {
            setClinicPickerError(
              isTr
                ? 'Arama servisi icin Google Maps API key gerekli. Klinigi manuel yazabilirsiniz.'
                : 'Google Maps API key is required for search. You can type clinic manually.',
            );
          } else {
            setClinicPickerError(isTr ? 'Arama sonucu alinamadi. Biraz sonra tekrar deneyin.' : 'Search results could not be loaded. Please try again.');
          }
        }
      } finally {
        if (!cancelled) setClinicSearchBusy(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [clinicPickerVisible, clinicSearchQuery, clinicUserCoords, isTr, locale]);

  const visitDatePickerValue = useMemo(() => {
    const ymd = parseFlexibleDateToYmd(visitDate) ?? today;
    const parsed = new Date(`${ymd}T12:00:00`);
    return Number.isFinite(parsed.getTime()) ? parsed : new Date(`${today}T12:00:00`);
  }, [today, visitDate]);

  const handleVisitDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowVisitDatePicker(false);
    if (!selectedDate || !Number.isFinite(selectedDate.getTime())) return;
    setVisitDate(toYmdLocal(selectedDate));
  };

  const parseInputDate = (value: string) => {
    const normalized = parseFlexibleDateToYmd(value);
    if (!normalized) return null;
    const parsed = new Date(`${normalized}T12:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed.toISOString();
  };

  const parseVisitDateMs = React.useCallback((item: VisitItem) => {
    const source = (item.rawDate && item.rawDate.trim().length > 0 ? item.rawDate : item.date).trim();
    if (!source) return null;
    const normalized = source.length <= 10 && source.includes('-') ? `${source}T12:00:00.000Z` : source;
    const parsedMs = new Date(normalized).getTime();
    return Number.isFinite(parsedMs) ? parsedMs : null;
  }, []);

  const handleRefresh = React.useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh?.());
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  const animateInlineList = React.useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  }, []);

  const isCreateFormValid = useMemo(() => {
    const visitDateIso = parseInputDate(visitDate);
    if (!visitDateIso) return false;

    const hasInvalidStructuredSelection = actionOrder.some((type) => {
      if (!selectedActions[type]) return false;
      const selectedValue = selectedActionOptions[type];
      if (!selectedValue) return true;
      if (selectedValue === 'other' && !customActionTitles[type].trim()) return true;
      return false;
    });
    if (hasInvalidStructuredSelection) return false;

    if (!reminderEnabled) return true;
    if (reminderPreset !== 'custom') return true;
    return !!parseInputDate(reminderDate);
  }, [
    actionOrder,
    customActionTitles,
    parseInputDate,
    reminderDate,
    reminderEnabled,
    reminderPreset,
    selectedActionOptions,
    selectedActions,
    visitDate,
  ]);

  const handleSubmitCreate = () => {
    const visitDateIso = parseInputDate(visitDate);
    if (!visitDateIso) {
      Alert.alert(
        isTr ? 'Geçersiz tarih' : 'Invalid date',
        isTr ? 'Tarihi gecerli formatta girin (ornek: 2026-03-22 veya 22.03.2026).' : 'Enter a valid date (e.g. 2026-03-22 or 22/03/2026).',
      );
      return;
    }

    const actions = actionOrder
      .filter((type) => selectedActions[type])
      .map((type) => {
        const selectedValue = selectedActionOptions[type];
        const selectedLabel = actionOptions[type].find((item) => item.value === selectedValue)?.label;
        const title =
          selectedValue === 'other'
            ? (customActionTitles[type].trim() || actionLabels[type])
            : (selectedLabel || actionLabels[type]);

        return {
          type,
          title,
          note: actionNotes[type].trim() || undefined,
        };
      });

    const hasInvalidStructuredSelection = actionOrder.some((type) => {
      if (!selectedActions[type]) return false;
      const selectedValue = selectedActionOptions[type];
      if (!selectedValue) return true;
      if (selectedValue === 'other' && !customActionTitles[type].trim()) return true;
      return false;
    });
    if (hasInvalidStructuredSelection) {
      Alert.alert(
        isTr ? 'Eksik seçim' : 'Missing selection',
        isTr ? 'Seçili işlemler için kategori seçin. Diğer seçtiyseniz kısa bir başlık yazın.' : 'Select a category for each chosen action. If you picked Other, add a short title.',
      );
      return;
    }

    const reminderDateIso = reminderEnabled
      ? (reminderPreset === 'custom'
          ? parseInputDate(reminderDate)
          : getReminderDateByPreset(visitDateIso, reminderPreset))
      : null;
    if (reminderEnabled && !reminderDateIso) {
      Alert.alert(
        isTr ? 'Gecersiz hatirlatma tarihi' : 'Invalid reminder date',
        isTr ? 'Hatirlatma tarihi YYYY-AA-GG formatinda olmali.' : 'Reminder date must be in YYYY-MM-DD format.',
      );
      return;
    }

    const parsedAmount = Number(visitAmount.replace(',', '.').replace(/[^0-9.]/g, ''));
    const payload: CreateVetVisitPayload = {
      date: visitDateIso,
      clinic: visitClinic.trim() || undefined,
      reason: visitReason,
      status: visitStatus,
      note: visitNote.trim() || undefined,
      attachments: visitAttachments,
      amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined,
      currency: visitAmount.trim() ? visitCurrency : undefined,
      reminderEnabled,
      reminderDate: reminderDateIso ?? undefined,
      actions,
    };

    if (editingVisitId && onEditVisit) {
      onEditVisit(editingVisitId, payload);
      setIsCreateVisible(false);
      setEditingVisitId(null);
      resetCreateForm();
    }
  };

  const visitsData = Array.isArray(visits) ? visits : [];
  const canceledVisits = useMemo(() => visitsData.filter((v) => v.status === 'canceled'), [visitsData]);
  const completedVisits = useMemo(
    () => visitsData.filter((v) => (v.status === 'completed' || !v.status) && (v.rawDate ?? v.date) <= today),
    [visitsData, today],
  );
  const plannedVisits = useMemo(() => visitsData.filter((v) => v.status === 'planned' && (v.rawDate ?? v.date) > today), [visitsData, today]);
  const overdueVisits = useMemo(
    () => visitsData.filter((v) => v.status === 'planned' && (v.rawDate ?? v.date) <= today),
    [visitsData, today],
  );
  const visibleCompletedVisits = useMemo(
    () => showAllCompleted ? completedVisits : completedVisits.slice(0, 3),
    [completedVisits, showAllCompleted],
  );
  const visibleCanceledVisits = useMemo(
    () => showAllCanceled ? canceledVisits : canceledVisits.slice(0, 3),
    [canceledVisits, showAllCanceled],
  );

  const totalCurrency = visitsData.find((v) => v.currency)?.currency ?? 'TL';
  const visitsCountText = isTr ? `${visitsData.length} Ziyaret` : `${visitsData.length} Visits`;

  const now = new Date();
  const currentYearStartYmd = `${now.getFullYear()}-01-01`;
  const prevYearStartYmd = `${now.getFullYear() - 1}-01-01`;
  const prevYearSamePointYmd = toYmdLocal(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999));
  const isCompletedVisit = (item: VisitItem) => item.status === 'completed' || !item.status;
  const isSpendEligible = (item: VisitItem) => isCompletedVisit(item) && (item.amount ?? 0) > 0;
  const annualEntries = visitsData.filter((item) => {
    if (!isSpendEligible(item)) return false;
    const dateYmd = getVisitYmd(item);
    if (!dateYmd) return false;
    return dateYmd >= currentYearStartYmd && dateYmd <= today;
  });
  const prevYearEntries = visitsData.filter((item) => {
    if (!isSpendEligible(item)) return false;
    const dateYmd = getVisitYmd(item);
    if (!dateYmd) return false;
    return dateYmd >= prevYearStartYmd && dateYmd <= prevYearSamePointYmd;
  });
  const annualAmount = annualEntries.reduce((sum, v) => sum + (v.amount ?? 0), 0);
  const prevYearAmount = prevYearEntries.reduce((sum, v) => sum + (v.amount ?? 0), 0);
  const annualCurrency = annualEntries.find((item) => item.currency)?.currency ?? totalCurrency;

  const yearChangeLabel = (() => {
    if (prevYearAmount <= 0 && annualAmount <= 0) return isTr ? 'BU YIL' : 'THIS YEAR';
    if (prevYearAmount <= 0) return isTr ? 'BU YIL' : 'THIS YEAR';
    const pct = Math.round(((annualAmount - prevYearAmount) / prevYearAmount) * 100);
    const arrow = pct >= 0 ? '↑' : '↓';
    return isTr
      ? `${arrow} %${Math.abs(pct)} GECEN YILA GORE`
      : `${arrow} ${Math.abs(pct)}% VS LAST YEAR`;
  })();

  const totalCostText = annualAmount > 0
    ? `${annualAmount.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')} ${annualCurrency}`
    : copy.totalCost;

  const screenState = status;
  const showMainContent = screenState === 'ready';
  const showAddButton = screenState !== 'loading' && screenState !== 'error';
  const stateTitle = screenState === 'loading'
    ? (isTr ? 'Ziyaretler yükleniyor' : 'Loading vet visits')
    : screenState === 'empty'
      ? (isTr ? 'Henüz ziyaret kaydı yok' : 'No vet visits yet')
      : (isTr ? 'Ziyaret kayıtları alınamadı' : 'Could not load vet visits');
  const stateBody = screenState === 'loading'
    ? (isTr ? 'Geçmiş kayıtlar hazırlanıyor, lütfen bekleyin.' : 'Preparing your medical history, please wait.')
    : screenState === 'empty'
      ? (isTr ? 'İlk veteriner ziyaretinizi eklediğinizde bu alan otomatik olarak dolacaktır.' : 'This area will fill automatically once your first visit is added.')
      : (isTr ? 'Bağlantıyı kontrol edip tekrar deneyin.' : 'Please check your connection and try again.');

  const swipePanResponder = useEdgeSwipeBack({
    onBack,
    enabled: !isCreateVisible,
    fullScreenGestureEnabled: false,
    enterVariant: 'soft',
  });

  return (
    <View style={styles.screen}>
      {backPreview ? (
        <Animated.View pointerEvents="none" style={[styles.backLayer, swipePanResponder.backLayerStyle]}>
          {backPreview}
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.frontLayer, swipePanResponder.frontLayerStyle]} {...swipePanResponder.panHandlers}>
      <StatusBar style="dark" />
      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: getStickyHeaderContentTop(topInset),
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={24}
        directionalLockEnabled
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressViewOffset={topInset + 56}
          />
        )}
      >
        {refreshing ? <PullRefreshIndicator size={38} /> : null}

        {showMainContent ? (
          <>
            {/* �� Overdue / needs-update visits �� */}
            {overdueVisits.length > 0 ? (
              <>
                <SectionHeader
                  title={isTr ? 'Sonu� bekleniyor' : 'Needs update'}
                  subtitle={isTr ? 'Planl� ama sonu�lanmam�� ziyaretler' : 'Planned visits that passed without a result'}
                  count={overdueVisits.length}
                  tone="warn"
                />
                {overdueVisits.map((item) => (
                  <VisitCard
                    key={item.id}
                    item={item}
                    isTr={isTr}
                    tone="overdue"
                    onPress={() => setDetailItem(item)}
                    onEdit={() => openEditModal(item)}
                  />
                ))}
              </>
            ) : null}

            {/* ── Upcoming visits ── */}
            {plannedVisits.length > 0 ? (
              <>
                <View style={overdueVisits.length > 0 ? styles.sectionGap : null}>
                  <SectionHeader
                    title={isTr ? 'Yaklasan ziyaretler' : 'Upcoming visits'}
                    subtitle={isTr ? 'Planli veteriner randevulari' : 'Scheduled clinic appointments'}
                    count={plannedVisits.length}
                    tone="success"
                  />
                </View>
                {plannedVisits.map((item) => (
                  <VisitCard
                    key={item.id}
                    item={item}
                    isTr={isTr}
                    tone="upcoming"
                    onPress={() => setDetailItem(item)}
                    onEdit={() => openEditModal(item)}
                  />
                ))}
              </>
            ) : null}

            {/* ── Completed visits ── */}
            {completedVisits.length > 0 ? (
              <>
                <View style={(plannedVisits.length > 0 || overdueVisits.length > 0) ? styles.sectionGap : null}>
                  <SectionHeader
                    title={isTr ? 'Tamamlanan ziyaretler' : 'Completed visits'}
                    subtitle={isTr ? 'Son islemler' : 'Latest care'}
                    count={completedVisits.length}
                    tone="neutral"
                  />
                </View>
                <View style={styles.completedList}>
                  {visibleCompletedVisits.map((item) => (
                    <VisitCard
                      key={item.id}
                      item={item}
                      isTr={isTr}
                      tone="completed"
                      onPress={() => setDetailItem(item)}
                      onOpenDocuments={onOpenDocuments}
                      onEdit={onEditVisit ? () => openEditModal(item) : undefined}
                    />
                  ))}
                </View>
                {completedVisits.length > 3 ? (
                  <Pressable
                    style={styles.viewAllHistoryBtn}
                    onPress={() => {
                      animateInlineList();
                      setShowAllCompleted((prev) => !prev);
                    }}
                  >
                    <Text style={styles.viewAllHistoryText}>
                      {showAllCompleted
                        ? (isTr ? 'Daha az goster' : 'Show less')
                        : (isTr ? `Tumunu goster (${completedVisits.length})` : `Show all (${completedVisits.length})`)}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {/* ── Canceled visits ── */}
            {canceledVisits.length > 0 ? (
              <>
                <View style={styles.sectionGap}>
                  <SectionHeader
                    title={isTr ? 'Iptal edilen ziyaretler' : 'Canceled visits'}
                    subtitle={isTr ? 'Iptal veya ertelenen kayitlar' : 'Canceled or postponed'}
                    count={canceledVisits.length}
                    tone="muted"
                  />
                </View>
                <View style={styles.completedList}>
                  {visibleCanceledVisits.map((item) => (
                    <VisitCard
                      key={item.id}
                      item={item}
                      isTr={isTr}
                      tone="canceled"
                      onPress={() => setDetailItem(item)}
                      onOpenDocuments={onOpenDocuments}
                      onEdit={onEditVisit ? () => openEditModal(item) : undefined}
                    />
                  ))}
                </View>
                {canceledVisits.length > 3 ? (
                  <Pressable
                    style={styles.viewAllHistoryBtn}
                    onPress={() => {
                      animateInlineList();
                      setShowAllCanceled((prev) => !prev);
                    }}
                  >
                    <Text style={styles.viewAllHistoryText}>
                      {showAllCanceled
                        ? (isTr ? 'Daha az goster' : 'Show less')
                        : (isTr ? `Tumunu goster (${canceledVisits.length})` : `Show all (${canceledVisits.length})`)}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {/* ── Stats grid ── */}
            {visitsData.length > 0 ? (
              <View style={styles.statsGrid}>
                <View style={styles.statGridCard}>
                  <Text style={styles.statGridLabel}>{isTr ? 'YILLIK HARCAMA' : 'ANNUAL SPEND'}</Text>
                  <Text style={styles.statGridValue}>{totalCostText}</Text>
                  <Text style={[styles.statGridSub, annualAmount !== prevYearAmount && prevYearAmount > 0 ? styles.statGridSubGreen : null]}>{yearChangeLabel}</Text>
                </View>
                <View style={styles.statGridCard}>
                  <Text style={styles.statGridLabel}>{isTr ? 'TOPLAM ZİYARET' : 'TOTAL VISITS'}</Text>
                  <Text style={styles.statGridValue}>{String(visitsData.length)}</Text>
                  <Text style={styles.statGridSub}>{isTr ? 'KATILIMDAN BERİ' : 'SINCE JOINING'}</Text>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <ScreenStateCard
            mode={screenState as ScreenStateMode}
            title={stateTitle}
            body={stateBody}
            actionLabel={screenState === 'error' ? (isTr ? 'Tekrar Dene' : 'Retry') : screenState === 'empty' ? (isTr ? 'Ziyaret Ekle' : 'Add Visit') : undefined}
            onAction={screenState === 'error' ? (onRetry ?? (() => Alert.alert(isTr ? 'Tekrar Dene' : 'Retry', isTr ? 'Lütfen kısa bir süre sonra tekrar deneyin.' : 'Please try again in a moment.'))) : screenState === 'empty' ? (onAddVisit ?? (() => Alert.alert(isTr ? 'Yeni Ziyaret' : 'New Visit', isTr ? 'Ilk ziyareti ekleyerek bu alani doldurun.' : 'Add your first visit to populate this area.'))) : undefined}
          />
        )}
      </Animated.ScrollView>

      <StickyBlurTopBar
        title={isTr ? 'VETERINER ZIYARETLERI' : 'VET VISITS'}
        topInset={topInset}
        scrollY={scrollY}
        titleVariant="hub"
        titleColor="#2f352f"
        overlayColors={['rgba(63,93,71,0.56)', 'rgba(63,93,71,0.38)', 'rgba(63,93,71,0.18)', 'rgba(63,93,71,0)']}
        borderColor="rgba(49,73,56,0.24)"
        centerLogoSource={vetVisitsHeaderLogo}
        centerLogoWidth={102}
        centerLogoHeight={102}
        centerLogoOffsetY={-8}
        leftSlot={(
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Icon kind="back" size={22} color="#5d605a" />
          </Pressable>
        )}
        rightSlot={showAddButton ? (
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              if (onAddVisit) {
                onAddVisit();
                return;
              }
              setEditingVisitId(null);
              setIsCreateVisible(true);
            }}
          >
            <Icon kind="plus" size={18} color="#5d605a" />
          </Pressable>
        ) : undefined}
      />

      {/* ── Visit Detail Sheet ── */}
      <Modal
        visible={detailItem !== null}
        transparent
        animationType="none"
        onRequestClose={() => closeDetailSheet()}
      >
        <View style={styles.detailBackdrop}>
          <Animated.View pointerEvents="none" style={[styles.detailBackdropTint, { opacity: detailBackdropOpacity }]} />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => closeDetailSheet()} />
          <Animated.View
            style={[
              styles.detailSheet,
              { transform: [{ translateY: detailSheetTranslateY }] },
            ]}
            {...detailSheetPanResponder.panHandlers}
            onLayout={(e) => { detailSheetHeightRef.current = e.nativeEvent.layout.height; }}
          >
            <View style={styles.detailHandleWrap}>
              <View style={styles.detailHandle} />
            </View>
            <View style={styles.detailHeader}>
              <Pressable onPress={() => closeDetailSheet()} hitSlop={12} style={styles.detailSideBtn}>
                <Text style={styles.detailCloseTxt}>{isTr ? 'Kapat' : 'Close'}</Text>
              </Pressable>
              <Text style={styles.detailHeaderTitle}>{isTr ? 'Ziyaret Detayı' : 'Visit Detail'}</Text>
              {detailItem && onEditVisit ? (
                <Pressable
                  hitSlop={12}
                  style={[styles.detailSideBtn, styles.detailSideBtnRight]}
                  onPress={() => {
                    const item = detailItem;
                    closeDetailSheet(() => {
                      requestAnimationFrame(() => openEditModal(item));
                    });
                  }}
                >
                  <Text style={styles.detailEditTxt}>{isTr ? 'Düzenle' : 'Edit'}</Text>
                </Pressable>
              ) : (
                <View style={styles.detailSideBtn} />
              )}
            </View>

            <View style={styles.detailBody}>
              {detailItem ? (() => {
                const d = detailItem;
                const isoDate = d.rawDate ?? '';
                const parts = isoDate.split('-');
                const monthIdx = parseInt(parts[1] ?? '1', 10) - 1;
                const day = parts[2] ?? '—';
                const mon = (isTr ? MONTHS_TR : MONTHS_EN)[monthIdx] ?? '—';
                const year = parts[0] ?? '—';
                const statusLabel = d.status === 'planned'
                  ? (isTr ? 'Planlandı' : 'Planned')
                  : d.status === 'canceled'
                    ? (isTr ? 'İptal' : 'Canceled')
                    : (isTr ? 'Tamamlandı' : 'Completed');
                const statusColor = d.status === 'canceled' ? '#a73b21' : d.status === 'planned' ? '#9b6400' : '#416d49';
                const statusBg = d.status === 'canceled' ? '#fde8e3' : d.status === 'planned' ? '#fdf2dd' : '#eaf4ec';
                return (
                  <>
                    <View style={styles.detailDateRow}>
                      <Text style={styles.detailDateBig}>{`${day} ${mon} ${year}`}</Text>
                      <View style={[styles.detailStatusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.detailStatusText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>

                    <View style={styles.detailInfoCard}>
                      <View style={styles.detailInfoRow}>
                        <Icon kind="clinic" size={15} color="#7a7c78" />
                        <Text style={styles.detailInfoLabel}>{isTr ? 'Klinik' : 'Clinic'}</Text>
                        <Text style={styles.detailInfoValue}>{d.clinic || (isTr ? 'Veteriner Kliniği' : 'Vet Clinic')}</Text>
                      </View>
                      <View style={[styles.detailInfoRow, styles.detailInfoRowBorder]}>
                        <Icon kind="check" size={15} color="#7a7c78" />
                        <Text style={styles.detailInfoLabel}>{isTr ? 'Ziyaret sebebi' : 'Visit reason'}</Text>
                        <Text style={styles.detailInfoValue}>{d.title || (isTr ? 'Belirtilmedi' : 'Not specified')}</Text>
                      </View>
                      <View style={[styles.detailInfoRow, styles.detailInfoRowBorder]}>
                        <Icon kind="wallet" size={15} color="#7a7c78" />
                        <Text style={styles.detailInfoLabel}>{isTr ? 'Tutar' : 'Amount'}</Text>
                        <Text style={styles.detailInfoValue}>
                          {d.amount != null
                            ? `${d.amount.toLocaleString('tr-TR')} ${d.currency ?? 'TL'}`
                            : (isTr ? 'Eklenmedi' : 'Not added')}
                        </Text>
                      </View>
                      {d.followUpContext ? (
                        <View style={[styles.detailInfoRow, styles.detailInfoRowBorder]}>
                          <Icon kind="stethoscope" size={15} color="#7a7c78" />
                          <Text style={styles.detailInfoLabel}>{isTr ? 'Follow up' : 'Follow up'}</Text>
                          <Text style={styles.detailInfoValue}>{d.followUpContext}</Text>
                        </View>
                      ) : null}
                      {d.attachments.length > 0 ? (
                        <View style={[styles.detailInfoRow, styles.detailInfoRowBorder]}>
                          <Icon kind="file" size={15} color="#7a7c78" />
                          <Text style={styles.detailInfoLabel}>{isTr ? 'Ek dosya' : 'Attachment'}</Text>
                          <Text style={styles.detailInfoValue}>
                            {`${d.attachments.length} ${isTr ? 'belge hazir' : 'document ready'}`}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {(d.note || (d.doctor && d.doctor !== 'Veterinarian')) ? (
                      <View style={styles.detailNoteCard}>
                        <Text style={styles.detailNoteLabel}>{isTr ? 'Not' : 'Note'}</Text>
                        <Text style={styles.detailNoteText}>{d.note ?? d.doctor}</Text>
                      </View>
                    ) : null}

                    {d.attachments.length > 0 ? (
                      <View style={styles.detailDocsCard}>
                        <Text style={styles.detailDocsTitle}>{isTr ? 'Ek dosyalar' : 'Attachments'}</Text>
                        <View style={styles.detailDocsList}>
                          {d.attachments.map((attachment, index) => (
                            <Pressable
                              key={`${attachment}-${index}`}
                              style={({ pressed }) => [
                                styles.detailDocRow,
                                pressed ? styles.detailDocRowPressed : null,
                              ]}
                              onPress={() => openAttachmentPreview(attachment)}
                            >
                              <View style={styles.detailDocIconWrap}>
                                <Icon kind="file" size={14} color="#5f675f" />
                              </View>
                              <View style={styles.detailDocBody}>
                                <Text numberOfLines={1} style={styles.detailDocName}>{attachment}</Text>
                                <Text style={styles.detailDocMeta}>
                                  {attachment.toLowerCase().endsWith('.pdf')
                                    ? (isTr ? 'PDF onizleme' : 'PDF preview')
                                    : (isTr ? 'Belge onizleme' : 'Document preview')}
                                </Text>
                              </View>
                              <Text style={styles.detailDocAction}>{isTr ? 'Ac' : 'Open'}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </>
                );
              })() : null}
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={isCreateVisible}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={false}
        onRequestClose={() => {
          if (clinicPickerVisible) {
            closeClinicPickerSheet();
            return;
          }
          setIsCreateVisible(false);
          setEditingVisitId(null);
          resetCreateForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboardWrap}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editingVisitId ? (isTr ? 'Ziyareti Düzenle' : 'Edit Visit') : (isTr ? 'Veteriner Ziyareti Ekle' : 'Create Vet Visit')}</Text>
              <ScrollView style={styles.modalMainScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{isTr ? 'Ziyaret Bilgisi' : 'Visit info'}</Text>
                  <Text style={styles.modalHelperText}>
                    {isTr ? 'Veteriner görüşmesinin tarihini ve ana nedenini seçin.' : 'Set the encounter date and the primary reason for this visit.'}
                  </Text>

                  <Text style={styles.modalLabel}>{isTr ? 'Tarih (serbest giri� + takvim)' : 'Date (free write + calendar)'}</Text>
                  <View style={[styles.inputWithIconRow, focusedField === 'visitDate' ? styles.modalInputFocused : null]}>
                    <View style={styles.inputLeadIconWrap}>
                      <Icon kind="calendar" size={14} color="#6f7771" />
                    </View>
                    <TextInput
                      style={styles.inputWithIconField}
                      value={visitDate}
                      onChangeText={setVisitDate}
                      placeholder="2026-03-22"
                      placeholderTextColor="#a4a4a4"
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => visitClinicInputRef.current?.focus()}
                      onFocus={() => {
                        setFocusedField('visitDate');
                        setShowVisitDatePicker(true);
                      }}
                      onBlur={() => {
                        const normalized = parseFlexibleDateToYmd(visitDate);
                        if (normalized) setVisitDate(normalized);
                        setFocusedField(null);
                      }}
                    />
                    <Pressable style={styles.inputTrailBtn} onPress={() => setShowVisitDatePicker((prev) => !prev)}>
                      <Icon kind="calendar" size={16} color="#47664a" />
                    </Pressable>
                  </View>
                  {showVisitDatePicker ? (
                    <View style={styles.inlineDatePickerCard}>
                      <DateTimePicker
                        value={visitDatePickerValue}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        onChange={handleVisitDatePickerChange}
                      />
                      {Platform.OS === 'ios' ? (
                        <Pressable style={styles.inlineDatePickerDoneBtn} onPress={() => setShowVisitDatePicker(false)}>
                          <Text style={styles.inlineDatePickerDoneText}>{isTr ? 'Tamam' : 'Done'}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  <Text style={styles.modalLabel}>{isTr ? 'Klinik (Maps)' : 'Clinic (Maps)'}</Text>
                  <View style={[styles.inputWithIconRow, focusedField === 'visitClinic' ? styles.modalInputFocused : null]}>
                    <View style={styles.inputLeadIconWrap}>
                      <Icon kind="map" size={14} color={selectedClinic ? '#47664a' : '#6f7771'} />
                    </View>
                    <TextInput
                      ref={visitClinicInputRef}
                      style={styles.inputWithIconField}
                      value={visitClinic}
                      onChangeText={handleClinicInputChange}
                      placeholder={isTr ? 'Haritadan secilen klinik burada gorunur' : 'Clinic selected from map appears here'}
                      placeholderTextColor="#a4a4a4"
                      returnKeyType="next"
                      onSubmitEditing={() => visitAmountInputRef.current?.focus()}
                      onFocus={() => setFocusedField('visitClinic')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Pressable style={styles.inputTrailBtn} onPress={openClinicPicker}>
                      <Icon kind="map" size={16} color="#47664a" />
                    </Pressable>
                  </View>
                  <View style={styles.mapIndicatorRow}>
                    <View style={[styles.mapIndicatorDot, selectedClinic ? styles.mapIndicatorDotActive : null]} />
                    <Text style={styles.mapIndicatorText}>
                      {selectedClinic
                        ? (isTr ? 'Haritadan secildi' : 'Selected from map')
                        : (isTr ? 'Haritadan klinik secmeniz onerilir' : 'Selecting clinic from map is recommended')}
                    </Text>
                  </View>
                  <View style={styles.clinicToolsRow}>
                    <Pressable style={styles.clinicPickerBtn} onPress={openClinicPicker}>
                      <Icon kind="map" size={14} color="#47664a" />
                      <Text style={styles.clinicPickerBtnText}>{isTr ? 'Klinigi haritadan sec' : 'Choose clinic from map'}</Text>
                    </Pressable>
                    {selectedClinic ? (
                      <Pressable
                        style={styles.clinicClearBtn}
                        onPress={() => {
                          setSelectedClinic(null);
                          setVisitClinic('');
                        }}
                      >
                        <Text style={styles.clinicClearBtnText}>{isTr ? 'Temizle' : 'Clear'}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {selectedClinic ? (
                    <View style={styles.selectedClinicCard}>
                      <Text style={styles.selectedClinicName} numberOfLines={1}>{selectedClinic.name}</Text>
                      <Text style={styles.selectedClinicMeta} numberOfLines={2}>{selectedClinic.address}</Text>
                      <Text style={styles.selectedClinicDistance}>{formatClinicDistance(selectedClinic.distanceMeters, isTr)}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.modalLabel}>{isTr ? 'Ücret (opsiyonel)' : 'Cost (optional)'}</Text>
                  <View style={styles.amountRow}>
                    <TextInput
                      ref={visitAmountInputRef}
                      style={[styles.modalInput, styles.amountInput, focusedField === 'visitAmount' ? styles.modalInputFocused : null]}
                      value={visitAmount}
                      onChangeText={setVisitAmount}
                      keyboardType="decimal-pad"
                      placeholder={isTr ? 'Örn: 1200' : 'e.g. 1200'}
                      placeholderTextColor="#a4a4a4"
                      returnKeyType="next"
                      onSubmitEditing={() => visitNoteInputRef.current?.focus()}
                      onFocus={() => setFocusedField('visitAmount')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Pressable
                      style={styles.currencyToggle}
                      onPress={() => setVisitCurrency((c) => c === 'TL' ? 'USD' : c === 'USD' ? 'EUR' : 'TL')}
                    >
                      <Text style={styles.currencyToggleText}>{visitCurrency}</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.modalLabel}>{isTr ? 'Ziyaret Durumu' : 'Visit status'}</Text>
                  <View style={styles.chipsRow}>
                    {(['completed', 'planned', 'canceled'] as const).map((s) => {
                      const label = s === 'completed'
                        ? (isTr ? 'Tamamlandı' : 'Completed')
                        : s === 'planned'
                          ? (isTr ? 'Planlandı' : 'Planned')
                          : (isTr ? 'İptal Edildi' : 'Canceled');
                      return (
                        <Pressable
                          key={s}
                          style={({ pressed }) => [
                            styles.chipBtn,
                            visitStatus !== s ? styles.chipBtnInactive : null,
                            visitStatus === s ? styles.chipBtnActive : null,
                            pressed ? styles.chipBtnPressed : null,
                          ]}
                          onPress={() => setVisitStatus(s)}
                        >
                          <Text style={[styles.chipBtnText, visitStatus === s ? styles.chipBtnTextActive : null]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.modalLabel}>{isTr ? 'Ziyaret Nedeni' : 'Visit reason'}</Text>
                  <Text style={styles.modalLabelHint}>
                    {isTr ? 'Ornek: rutin kontrol, asi takibi, hastalik' : 'Example: routine checkup, vaccine follow-up, illness'}
                  </Text>
                  <View style={styles.chipsRow}>
                    {reasonOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        style={({ pressed }) => [
                          styles.chipBtn,
                          visitReason !== option.value ? styles.chipBtnInactive : null,
                          visitReason === option.value ? styles.chipBtnActive : null,
                          pressed ? styles.chipBtnPressed : null,
                        ]}
                        onPress={() => setVisitReason(option.value)}
                      >
                        <Text style={[styles.chipBtnText, visitReason === option.value ? styles.chipBtnTextActive : null]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.modalLabel}>{isTr ? 'Not (opsiyonel)' : 'Note (optional)'}</Text>
                  <TextInput
                    ref={visitNoteInputRef}
                    style={[styles.modalInput, styles.modalInputTall, focusedField === 'visitNote' ? styles.modalInputFocused : null]}
                    value={visitNote}
                    onChangeText={setVisitNote}
                    placeholder={isTr ? 'Muayene notu, oneriler, takip bilgisi...' : 'Clinical notes, recommendations, follow-up details...'}
                    placeholderTextColor="#a4a4a4"
                    multiline
                    returnKeyType="next"
                    onSubmitEditing={() => setFocusedField(null)}
                    onFocus={() => setFocusedField('visitNote')}
                    onBlur={() => setFocusedField(null)}
                  />

                  <Text style={styles.modalLabel}>{isTr ? 'Ek dosyalar (opsiyonel)' : 'Attachments (optional)'}</Text>
                  <View style={styles.attachmentComposerRow}>
                    <TextInput
                      style={[styles.modalInput, styles.attachmentInput, focusedField === 'attachmentInput' ? styles.modalInputFocused : null]}
                      value={attachmentInput}
                      onChangeText={setAttachmentInput}
                      placeholder={isTr ? 'orn: fatura.pdf veya recete.jpg' : 'e.g. invoice.pdf or prescription.jpg'}
                      placeholderTextColor="#a4a4a4"
                      onFocus={() => setFocusedField('attachmentInput')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Pressable
                      style={styles.attachmentAddBtn}
                      onPress={() => {
                        addAttachmentName(attachmentInput);
                        setAttachmentInput('');
                      }}
                    >
                      <Text style={styles.attachmentAddBtnText}>{isTr ? 'Ekle' : 'Add'}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.attachmentToolsRow}>
                    <Pressable style={styles.attachmentCameraBtn} onPress={handleQuickCameraAttachment}>
                      <Icon kind="camera" size={13} color="#ffffff" />
                      <Text style={styles.attachmentCameraBtnText}>{isTr ? 'Hizli foto' : 'Quick photo'}</Text>
                    </Pressable>
                    <Pressable style={styles.attachmentLibraryBtn} onPress={handlePickAttachmentFromLibrary}>
                      <Icon kind="file" size={13} color="#47664a" />
                      <Text style={styles.attachmentLibraryBtnText}>{isTr ? 'Galeriden sec' : 'Choose photo'}</Text>
                    </Pressable>
                  </View>
                  {isPremiumPlan ? (
                    <View style={styles.scanModeRow}>
                      <View style={styles.scanModeTextWrap}>
                        <Text style={styles.scanModeTitle}>{isTr ? 'Scan Mode (Premium)' : 'Scan Mode (Premium)'}</Text>
                        <Text style={styles.scanModeHint}>
                          {isTr
                            ? 'Kamera ile cekerken hizli crop/duzeltme acilir.'
                            : 'Enables quick crop/edit flow while capturing.'}
                        </Text>
                      </View>
                      <Switch
                        value={scanModeEnabled}
                        onValueChange={setScanModeEnabled}
                        thumbColor="#ffffff"
                        trackColor={{ false: '#d6d8d4', true: '#7f9a70' }}
                      />
                    </View>
                  ) : null}
                  {visitAttachments.length > 0 ? (
                    <View style={styles.attachmentList}>
                      {visitAttachments.map((name, idx) => (
                        <View key={`${name}-${idx}`} style={styles.attachmentRow}>
                          <Text numberOfLines={1} style={styles.attachmentRowText}>{name}</Text>
                          <Pressable
                            hitSlop={8}
                            onPress={() =>
                              setVisitAttachments((prev) => prev.filter((item, itemIdx) => !(itemIdx === idx && item === name)))
                            }
                          >
                            <Text style={styles.attachmentRemoveText}>{isTr ? 'Sil' : 'Remove'}</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                {visitStatus === 'completed' ? (
                  <>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>{isTr ? 'Ziyaret Sonuclari' : 'Visit outcomes'}</Text>
                      <Text style={styles.modalHelperText}>
                        {isTr
                          ? 'Sebepten farkli olarak burada, muayene sonrasi yapilan islemleri secin.'
                          : 'Unlike visit reason, select what was actually done after the examination.'}
                      </Text>
                      <Text style={styles.modalLabel}>{isTr ? 'Bu ziyarette ne yapildi?' : 'What was done in this visit?'}</Text>
                      <View style={styles.chipsRow}>
                        {actionOrder.map((type) => (
                          <Pressable
                            key={type}
                            style={({ pressed }) => [
                              styles.chipBtn,
                              !selectedActions[type] ? styles.chipBtnInactive : null,
                              selectedActions[type] ? styles.chipBtnActive : null,
                              pressed ? styles.chipBtnPressed : null,
                            ]}
                            onPress={() => toggleAction(type)}
                          >
                            <Text style={[styles.chipBtnText, selectedActions[type] ? styles.chipBtnTextActive : null]}>{actionLabels[type]}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>{isTr ? 'Sonuc detaylari' : 'Outcome details'}</Text>
                      <Text style={styles.modalHelperText}>
                        {isTr ? 'Secilen islemler icin kategori ve opsiyonel not ekleyin.' : 'Set category and optional notes for selected outcomes.'}
                      </Text>

                      <ScrollView style={styles.inlineFieldsWrap} showsVerticalScrollIndicator={false}>
                        {actionOrder.map((type) => (
                          selectedActions[type] ? (
                            <View key={type} style={styles.inlineFieldBlock}>
                              <Text style={styles.inlineFieldTitle}>{actionLabels[type]}</Text>
                              <View style={styles.chipsRow}>
                                {actionOptions[type].map((option) => (
                                  <Pressable
                                    key={`${type}-${option.value}`}
                                    style={({ pressed }) => [
                                      styles.chipBtn,
                                      selectedActionOptions[type] !== option.value ? styles.chipBtnInactive : null,
                                      selectedActionOptions[type] === option.value ? styles.chipBtnActive : null,
                                      pressed ? styles.chipBtnPressed : null,
                                    ]}
                                    onPress={() => setSelectedActionOptions((prev) => ({ ...prev, [type]: option.value }))}
                                  >
                                    <Text style={[styles.chipBtnText, selectedActionOptions[type] === option.value ? styles.chipBtnTextActive : null]}>{option.label}</Text>
                                  </Pressable>
                                ))}
                              </View>

                              {selectedActionOptions[type] === 'other' ? (
                                <TextInput
                                  style={[styles.modalInput, focusedField === `${type}-title` ? styles.modalInputFocused : null]}
                                  value={customActionTitles[type]}
                                  onChangeText={(value) => setCustomActionTitles((prev) => ({ ...prev, [type]: value }))}
                                  placeholder={isTr ? 'Kisa baslik yazin' : 'Write a short title'}
                                  placeholderTextColor="#a4a4a4"
                                  onFocus={() => setFocusedField(`${type}-title`)}
                                  onBlur={() => setFocusedField(null)}
                                />
                              ) : null}

                              <TextInput
                                style={[styles.modalInput, styles.modalInputTall, focusedField === `${type}-note` ? styles.modalInputFocused : null]}
                                value={actionNotes[type]}
                                onChangeText={(value) => setActionNotes((prev) => ({ ...prev, [type]: value }))}
                                placeholder={isTr ? 'Opsiyonel not' : 'Optional note'}
                                placeholderTextColor="#a4a4a4"
                                multiline
                                onFocus={() => setFocusedField(`${type}-note`)}
                                onBlur={() => setFocusedField(null)}
                              />
                            </View>
                          ) : null
                        ))}
                      </ScrollView>
                    </View>
                  </>
                ) : (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>{isTr ? 'Ziyaret Sonuclari' : 'Visit outcomes'}</Text>
                    <Text style={styles.modalHelperText}>
                      {isTr
                        ? 'Planli veya iptal ziyaretlerde sonuc alani gizlenir. Ziyaret tamamlandiginda acilir.'
                        : 'Outcome fields are hidden for planned/canceled visits and shown once the visit is completed.'}
                    </Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{isTr ? 'Hatirlatma' : 'Reminder'}</Text>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{isTr ? 'Hatirlatma olustur' : 'Create reminder'}</Text>
                    <Switch
                      value={reminderEnabled}
                      onValueChange={setReminderEnabled}
                      thumbColor="#ffffff"
                      trackColor={{ false: '#d8d8d8', true: '#7f9a70' }}
                    />
                  </View>

                  {reminderEnabled ? (
                    <>
                      <Text style={styles.modalLabel}>{isTr ? 'Hatirlatma zamani' : 'Reminder timing'}</Text>
                      <View style={styles.chipsRow}>
                        {reminderPresetOptions.map((option) => (
                          <Pressable
                            key={option.value}
                            style={({ pressed }) => [
                              styles.chipBtn,
                              reminderPreset !== option.value ? styles.chipBtnInactive : null,
                              reminderPreset === option.value ? styles.chipBtnActive : null,
                              pressed ? styles.chipBtnPressed : null,
                            ]}
                            onPress={() => setReminderPreset(option.value)}
                          >
                            <Text style={[styles.chipBtnText, reminderPreset === option.value ? styles.chipBtnTextActive : null]}>{option.label}</Text>
                          </Pressable>
                        ))}
                      </View>

                      {reminderPreset === 'custom' ? (
                        <>
                          <Text style={styles.modalLabel}>{isTr ? 'Ozel tarih (YYYY-AA-GG)' : 'Custom date (YYYY-MM-DD)'}</Text>
                          <TextInput
                            style={[styles.modalInput, focusedField === 'reminderDate' ? styles.modalInputFocused : null]}
                            value={reminderDate}
                            onChangeText={setReminderDate}
                            placeholder="2026-03-29"
                            placeholderTextColor="#a4a4a4"
                            autoCapitalize="none"
                            onFocus={() => setFocusedField('reminderDate')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </>
                      ) : null}
                    </>
                  ) : null}
                </View>

              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalSecondaryBtn}
                  onPress={() => {
                    setClinicPickerVisible(false);
                    setIsCreateVisible(false);
                    setEditingVisitId(null);
                    resetCreateForm();
                  }}
                >
                  <Text style={styles.modalSecondaryText}>{isTr ? 'Vazgec' : 'Cancel'}</Text>
                </Pressable>
                <Animated.View style={{ transform: [{ scale: savePressScale }] }}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalPrimaryBtn,
                      !isCreateFormValid ? styles.modalPrimaryBtnDisabled : null,
                      pressed && isCreateFormValid ? styles.modalPrimaryBtnPressed : null,
                    ]}
                    disabled={!isCreateFormValid}
                    onPress={handleSubmitCreate}
                    onPressIn={() => Animated.spring(savePressScale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 6 }).start()}
                    onPressOut={() => Animated.spring(savePressScale, { toValue: 1, useNativeDriver: true, speed: 36, bounciness: 5 }).start()}
                  >
                    <Text style={styles.modalPrimaryText}>{isTr ? 'Kaydet' : 'Save'}</Text>
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          </KeyboardAvoidingView>
          {clinicPickerVisible ? (
            <View style={styles.clinicPickerInlineWrap}>
              <Animated.View pointerEvents="none" style={[styles.clinicPickerBackdrop, { opacity: clinicBackdropOpacity }]} />
              <Pressable style={StyleSheet.absoluteFillObject} onPress={() => closeClinicPickerSheet()} />
                  <View style={styles.clinicPickerOverlay} {...clinicSheetPanResponder.panHandlers}>
                    <Animated.View
                      style={[
                        styles.clinicPickerSheet,
                        { transform: [{ translateY: clinicSheetTranslateY }] },
                      ]}
                  onLayout={(e) => { clinicSheetHeightRef.current = e.nativeEvent.layout.height; }}
                >
                  <View style={styles.clinicPickerHandleWrap}>
                    <View style={styles.clinicPickerHandle} />
                  </View>
                  <View style={styles.clinicPickerHeader}>
                    <View style={styles.clinicPickerHeaderText}>
                      <Text style={styles.clinicPickerTitle}>{isTr ? 'Klinik Sec' : 'Select clinic'}</Text>
                      <Text style={styles.clinicPickerSub}>
                        {isTr ? 'Yakin klinikleri gorun ya da isimle arayin.' : 'See nearby clinics or search by name.'}
                      </Text>
                    </View>
                    <Pressable style={styles.clinicPickerCloseBtn} onPress={() => closeClinicPickerSheet()}>
                      <Text style={styles.clinicPickerCloseText}>{isTr ? 'Kapat' : 'Close'}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.clinicSearchRow}>
                    <TextInput
                      style={styles.clinicSearchInput}
                      value={clinicSearchQuery}
                      onChangeText={setClinicSearchQuery}
                      placeholder={isTr ? 'Klinik ya da semt ara' : 'Search clinic or district'}
                      placeholderTextColor="#98a09a"
                    />
                    <Pressable style={styles.clinicNearbyBtn} onPress={loadNearbyClinicSuggestions}>
                      <Text style={styles.clinicNearbyBtnText}>{isTr ? 'Yakini bul' : 'Nearby'}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.clinicMapCard}>
                    {NativeMapView && NativeMarker ? (
                      <NativeMapView
                        style={styles.clinicMap}
                        region={clinicRegion}
                        onRegionChangeComplete={setClinicRegion}
                        showsUserLocation={clinicUserCoords != null}
                        rotateEnabled={false}
                        pitchEnabled={false}
                      >
                        {visibleClinicResults.map((clinic) => (
                          <NativeMarker
                            key={clinic.id}
                            coordinate={{ latitude: clinic.latitude, longitude: clinic.longitude }}
                            title={clinic.name}
                            description={clinic.address}
                            onPress={() => setSelectedClinic(clinic)}
                            pinColor={selectedClinic?.id === clinic.id ? '#47664a' : '#7f9a70'}
                          />
                        ))}
                      </NativeMapView>
                    ) : (
                      <StaticClinicMapPreview
                        clinics={visibleClinicResults}
                        isTr={isTr}
                        isExpoGo={IS_EXPO_GO_RUNTIME}
                        initError={NativeMapInitError}
                        region={clinicRegion}
                        selectedClinic={selectedClinic}
                        userCoords={clinicUserCoords}
                      />
                    )}
                    {(clinicPickerBusy || clinicSearchBusy) ? (
                      <View style={styles.clinicMapLoading}>
                        <ActivityIndicator size="small" color="#47664a" />
                        <Text style={styles.clinicMapLoadingText}>{isTr ? 'Klinikler yukleniyor' : 'Loading clinics'}</Text>
                      </View>
                    ) : null}
                    <View pointerEvents="none" style={styles.clinicMapAttribution}>
                      <Text style={styles.clinicMapAttributionText}>
                        {NativeMapView && NativeMarker
                          ? (isTr ? 'Yerel harita onizlemesi' : 'Native map preview')
                          : (isTr ? 'Statik harita onizlemesi' : 'Static map preview')}
                      </Text>
                    </View>
                  </View>

                  {clinicPickerError ? (
                    <View style={styles.clinicPickerHint}>
                      <Text style={styles.clinicPickerHintText}>{clinicPickerError}</Text>
                    </View>
                  ) : null}

                  <ScrollView style={styles.clinicResultsList} showsVerticalScrollIndicator={false}>
                    {visibleClinicResults.map((clinic) => {
                      const active = selectedClinic?.id === clinic.id;
                      return (
                        <Pressable
                          key={clinic.id}
                          style={[styles.clinicResultRow, active ? styles.clinicResultRowActive : null]}
                          onPress={() => selectClinicSuggestion(clinic)}
                        >
                          <View style={styles.clinicResultTextWrap}>
                            <Text style={styles.clinicResultName} numberOfLines={1}>{clinic.name}</Text>
                            <Text style={styles.clinicResultAddress} numberOfLines={2}>{clinic.address}</Text>
                          </View>
                          <Text style={styles.clinicResultDistance}>{formatClinicDistance(clinic.distanceMeters, isTr)}</Text>
                        </Pressable>
                      );
                    })}
                    {!clinicPickerBusy && !clinicSearchBusy && visibleClinicResults.length === 0 ? (
                      <View style={styles.clinicEmptyState}>
                        <Text style={styles.clinicEmptyTitle}>{isTr ? 'Klinik bulunamadi' : 'No clinics found'}</Text>
                        <Text style={styles.clinicEmptyText}>
                          {isTr ? 'Konumla tekrar deneyin ya da klinik adini aratin.' : 'Try nearby again or search by clinic name.'}
                        </Text>
                      </View>
                    ) : null}
                  </ScrollView>
                </Animated.View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={attachmentPreview !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachmentPreview(null)}
      >
        <View style={styles.docPreviewBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setAttachmentPreview(null)} />
          <View style={styles.docPreviewSheet}>
            <View style={styles.docPreviewHeader}>
              <Text style={styles.docPreviewTitle}>
                {attachmentPreview?.type === 'pdf'
                  ? (isTr ? 'PDF Onizleme' : 'PDF Preview')
                  : (isTr ? 'Belge Onizleme' : 'Document Preview')}
              </Text>
              <Pressable onPress={() => setAttachmentPreview(null)} hitSlop={12}>
                <Text style={styles.docPreviewClose}>{isTr ? 'Kapat' : 'Close'}</Text>
              </Pressable>
            </View>

            <View style={styles.docPreviewCanvas}>
              <View style={styles.docPreviewPaper}>
                <View style={styles.docPreviewPaperTop}>
                  <View style={styles.docPreviewPdfBadge}>
                    <Text style={styles.docPreviewPdfBadgeText}>
                      {attachmentPreview?.type === 'pdf' ? 'PDF' : 'FILE'}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.docPreviewName}>{attachmentPreview?.name ?? ''}</Text>
                </View>

                <View style={styles.docPreviewBody}>
                  <View style={styles.docPreviewLineLong} />
                  <View style={styles.docPreviewLineShort} />
                  <View style={styles.docPreviewLineLong} />
                  <View style={styles.docPreviewLineMid} />
                  <View style={styles.docPreviewStamp}>
                    <Text style={styles.docPreviewStampText}>
                      {attachmentPreview?.type === 'pdf'
                        ? (isTr ? 'Onizleme hazir' : 'Preview ready')
                        : (isTr ? 'Belge hazir' : 'Document ready')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.docPreviewHint}>
              {isTr
                ? 'Bu kayitta su an dosya adi saklaniyor. Gercek PDF/URI baglandiginda ayni alanda belge onizlemesi gosterilecek.'
                : 'This record currently stores the document name. When a real PDF/URI is available, the same area will render the actual file preview.'}
            </Text>
          </View>
        </View>
      </Modal>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── shell ──────────────────────────────────────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: '#f6f4f0',
  },
  backLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  frontLayer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#f6f4f0',
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 60,
    gap: 10,
  },

  // ── header ─────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#30332e',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -0.3,
  },
  headerPlaceholder: {
    width: 80,
  },
  addPill: {
    height: 38,
    borderRadius: 19,
    backgroundColor: '#47664a',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b5a3f',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e9ffe6',
  },

  // ── section headers ────────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionGap: {
    marginTop: 2,
  },
  sectionHeaderBlock: {
    width: '100%',
    marginBottom: 6,
  },
  sectionHeaderTextWrap: {
    flex: 1,
    gap: 2,
    paddingRight: 12,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: '#253129',
    letterSpacing: -0.35,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#727b74',
  },
  sectionCountPill: {
    minWidth: 30,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf1ec',
    borderWidth: 1,
    borderColor: 'rgba(47,58,50,0.08)',
  },
  sectionCountPillSuccess: {
    backgroundColor: '#e8efe6',
    borderColor: 'rgba(73,97,77,0.14)',
  },
  sectionCountPillMuted: {
    backgroundColor: '#f1ebe7',
    borderColor: 'rgba(122,99,85,0.14)',
  },
  sectionCountPillWarn: {
    backgroundColor: '#fdf3dc',
    borderColor: 'rgba(180,140,50,0.18)',
  },
  sectionCountText: {
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '800',
    color: '#4f5a52',
  },
  sectionCountTextSuccess: {
    color: '#4d6a4f',
  },
  sectionCountTextMuted: {
    color: '#7b6659',
  },
  sectionCountTextWarn: {
    color: '#8a6415',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#5d605a',
    textTransform: 'uppercase',
  },

  // ── completed visits list wrapper ────────────────────────────────────────
  completedList: {
    gap: 8,
  },

  // ── unified visit card ────────────────────────────────────────────────────
  visitCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbfcfb',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34,42,36,0.05)',
    shadowColor: '#1d231f',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    minHeight: 92,
  },
  visitCardSideAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#6f8876',
  },
  visitCardSideAccentUpcoming: {
    backgroundColor: '#5f8664',
  },
  visitCardSideAccentCompleted: {
    backgroundColor: '#6e7d74',
  },
  visitCardSideAccentCanceled: {
    backgroundColor: '#ad836f',
  },
  visitCardSideAccentOverdue: {
    backgroundColor: '#c49a30',
  },
  visitCardUpcoming: {
    backgroundColor: '#fbfdfb',
    borderColor: 'rgba(88,121,91,0.10)',
  },
  visitCardCompleted: {
    backgroundColor: '#fcfdfc',
    borderColor: 'rgba(44,61,50,0.06)',
  },
  visitCardCanceled: {
    backgroundColor: '#fdfaf8',
    borderColor: 'rgba(133,105,87,0.10)',
  },
  visitCardOverdue: {
    backgroundColor: '#fdfbf3',
    borderColor: 'rgba(180,140,50,0.13)',
  },
  visitCardPressed: {
    transform: [{ scale: 0.992 }],
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  visitCardDateCol: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: 10,
    backgroundColor: '#f7f8f5',
    flexShrink: 0,
  },
  visitCardDateColUpcoming: {
    backgroundColor: '#f4f8f2',
  },
  visitCardDateColCompleted: {
    backgroundColor: '#f5f7f4',
  },
  visitCardDateColCanceled: {
    backgroundColor: '#f8f4f1',
  },
  visitCardDateColOverdue: {
    backgroundColor: '#fdf7e6',
  },
  visitCardMon: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6a786f',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  visitCardMonUpcoming: {
    color: '#628468',
  },
  visitCardMonCompleted: {
    color: '#6d7871',
  },
  visitCardMonCanceled: {
    color: '#8a715f',
  },
  visitCardMonOverdue: {
    color: '#9a7820',
  },
  visitCardDay: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2922',
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  visitCardDayUpcoming: {
    color: '#2f4734',
  },
  visitCardDayCompleted: {
    color: '#34413a',
  },
  visitCardDayCanceled: {
    color: '#4b3a30',
  },
  visitCardDayOverdue: {
    color: '#5c3f0a',
  },
  visitCardYear: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca39b',
    letterSpacing: 0.2,
  },
  visitCardDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#ecefe9',
    flexShrink: 0,
  },
  visitCardBody: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 1,
  },
  visitCardClinic: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222923',
    letterSpacing: -0.3,
  },
  visitCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitCardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#5f665f',
  },
  visitCardTitleMuted: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#8d938d',
  },
  visitCardFollowUpCtx: {
    fontSize: 11,
    color: '#7d847e',
    fontStyle: 'italic',
    marginTop: 1,
  },
  visitCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  visitCardPlannedBadge: {
    backgroundColor: '#e7efe6',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  visitCardPlannedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3a6040',
    letterSpacing: 0.2,
  },
  visitCardPlannedBadgeUpcoming: {
    backgroundColor: '#e7f0e4',
  },
  visitCardPlannedTextUpcoming: {
    color: '#3f6144',
  },
  visitCardCanceledBadge: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f2e7df',
  },
  visitCardCanceledText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#886452',
  },
  visitCardAmountPill: {
    backgroundColor: '#eef4ef',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  visitCardAmountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#47664a',
  },
  visitCardAmountPillCompleted: {
    backgroundColor: '#e9eeea',
  },
  visitCardAmountTextCompleted: {
    color: '#4f6056',
  },
  visitCardAmountPillCanceled: {
    backgroundColor: '#efe6df',
  },
  visitCardAmountTextCanceled: {
    color: '#7b5f51',
  },
  visitCardNoAmountPill: {
    backgroundColor: '#f3f4f1',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  visitCardNoAmountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7a8079',
  },
  visitCardDocPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f3f1',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  visitCardDocText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5d605a',
  },
  visitCardMissingCostDotWrap: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitCardMissingCostDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c7b17a',
  },
  visitCardMissingCostDotCanceled: {
    backgroundColor: '#c5987f',
  },
  visitCardEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f4f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(34,42,36,0.05)',
  },
  visitCardEditBtnUpcoming: {
    backgroundColor: '#edf4ec',
    borderColor: 'rgba(76,104,80,0.12)',
  },
  visitCardEditBtnCompleted: {
    backgroundColor: '#edf1ee',
    borderColor: 'rgba(79,97,87,0.10)',
  },
  visitCardEditBtnCanceled: {
    backgroundColor: '#f3ece8',
    borderColor: 'rgba(120,92,73,0.12)',
  },
  visitCardEditBtnOverdue: {
    backgroundColor: '#fdf4d8',
    borderColor: 'rgba(180,140,50,0.16)',
  },

  // �� visit detail sheet ����������������������������������������������������
  detailBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.44)',
  },
  detailSheet: {
    backgroundColor: '#f7f5f1',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '82%',
    overflow: 'hidden',
  },
  detailHandleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 2,
  },
  detailHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  detailHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2922',
    letterSpacing: -0.2,
  },
  detailSideBtn: {
    minWidth: 56,
  },
  detailSideBtnRight: {
    alignItems: 'flex-end',
  },
  detailCloseTxt: {
    fontSize: 15,
    color: '#5d605a',
  },
  detailEditTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: '#47664a',
  },
  detailBody: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  detailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailDateBig: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2922',
    letterSpacing: -0.5,
  },
  detailStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  detailInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  detailInfoRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  detailInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#2d3530',
    fontWeight: '500',
  },
  detailFollowUpCard: {
    backgroundColor: 'rgba(71,102,74,0.07)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.14)',
    marginBottom: 14,
  },
  detailFollowUpLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#47664a',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  detailFollowUpText: {
    fontSize: 14,
    color: '#2d3a30',
    lineHeight: 20,
  },
  detailNoteCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
    marginBottom: 14,
  },
  detailNoteLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7a7c78',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  detailNoteText: {
    fontSize: 14,
    color: '#2d3530',
    lineHeight: 20,
  },

  viewDocumentsBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#edf5ea',
  },
  viewDocumentsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b5a3f',
  },

  // ── view all history button ────────────────────────────────────────────────
  viewAllHistoryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#edf2ed',
    borderWidth: 1,
    borderColor: 'rgba(52,68,56,0.08)',
  },
  viewAllHistoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#47664a',
  },

  // ── stats bento grid ───────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statGridCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#eeeee8',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 4,
  },
  statGridLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#5d605a',
    textTransform: 'uppercase',
  },
  statGridValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  statGridSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#797c75',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statGridSubGreen: {
    color: '#47664a',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#faf9f8',
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 16,
  },
  modalKeyboardWrap: {
    flex: 1,
    width: '100%',
  },
  modalCard: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#2d2d2d',
    marginBottom: 12,
  },
  modalMainScroll: {
    maxHeight: 560,
  },
  modalSection: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  modalSectionTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#2d2d2d',
    marginBottom: 4,
  },
  modalHelperText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7f7f7f',
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#7a7a7a',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
  modalLabelHint: {
    marginTop: -2,
    marginBottom: 6,
    fontSize: 11,
    lineHeight: 16,
    color: '#8b8b8b',
  },
  modalInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#2d2d2d',
  },
  modalInputFocused: {
    borderColor: '#9ab395',
    shadowColor: '#8ca486',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modalInputTall: {
    minHeight: 56,
  },
  inputWithIconRow: {
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputLeadIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f3f6f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWithIconField: {
    flex: 1,
    minHeight: 42,
    fontSize: 14,
    lineHeight: 20,
    color: '#2d2d2d',
    paddingHorizontal: 2,
  },
  inputTrailBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf4ed',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.12)',
  },
  inlineDatePickerCard: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.14)',
    backgroundColor: '#f8fbf7',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  inlineDatePickerDoneBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
    height: 30,
    borderRadius: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf4ed',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.14)',
  },
  inlineDatePickerDoneText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#47664a',
  },
  mapIndicatorRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  mapIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#b4bab3',
  },
  mapIndicatorDotActive: {
    backgroundColor: '#4f8054',
  },
  mapIndicatorText: {
    fontSize: 11,
    lineHeight: 15,
    color: '#6f756f',
    fontWeight: '600',
  },
  attachmentComposerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentInput: {
    flex: 1,
  },
  attachmentAddBtn: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.18)',
    backgroundColor: '#f1f5ef',
  },
  attachmentAddBtnText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: '#47664a',
  },
  attachmentToolsRow: {
    marginTop: 8,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentCameraBtn: {
    height: 34,
    borderRadius: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.30)',
    backgroundColor: '#47664a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentCameraBtnText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: '#f4fff2',
  },
  attachmentLibraryBtn: {
    height: 34,
    borderRadius: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.14)',
    backgroundColor: '#f8fbf6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentLibraryBtnText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: '#47664a',
  },
  scanModeRow: {
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.12)',
    backgroundColor: '#f7fbf6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  scanModeTextWrap: {
    flex: 1,
    gap: 1,
  },
  scanModeTitle: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: '#466247',
  },
  scanModeHint: {
    fontSize: 11,
    lineHeight: 14,
    color: '#6f7a70',
  },
  attachmentList: {
    gap: 6,
  },
  attachmentRow: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  attachmentRowText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#4f5550',
    fontWeight: '600',
  },
  attachmentRemoveText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8b6452',
    fontWeight: '700',
  },
  clinicToolsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  clinicPickerBtn: {
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.18)',
    backgroundColor: '#f1f5ef',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clinicPickerBtnText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#47664a',
    fontWeight: '700',
  },
  clinicClearBtn: {
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f5f1',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  clinicClearBtnText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6a6d67',
    fontWeight: '700',
  },
  selectedClinicCard: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.14)',
    backgroundColor: '#fbfcfa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  selectedClinicName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#30332e',
  },
  selectedClinicMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6d746e',
  },
  selectedClinicDistance: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: '#47664a',
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    flex: 1,
  },
  currencyToggle: {
    height: 42,
    minWidth: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#f6f4f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  currencyToggleText: {
    fontSize: 13,
    lineHeight: 16,
    color: '#47664a',
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chipBtn: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBtnActive: {
    borderColor: '#7f9a70',
    backgroundColor: '#eef5ea',
  },
  chipBtnInactive: {
    opacity: 0.82,
  },
  chipBtnPressed: {
    transform: [{ scale: 0.98 }],
  },
  chipBtnText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5f5f5f',
    fontWeight: '600',
  },
  chipBtnTextActive: {
    color: '#4f6b43',
  },
  inlineFieldsWrap: {
    marginTop: 6,
    maxHeight: 240,
  },
  inlineFieldBlock: {
    marginBottom: 10,
    gap: 6,
  },
  inlineFieldTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#4d4d4d',
  },
  switchRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#4a4a4a',
  },
  attachmentHint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#8d8d8d',
  },
  modalActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalSecondaryBtn: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  modalSecondaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5c5c5c',
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d2d2d',
  },
  modalPrimaryBtnDisabled: {
    opacity: 0.55,
  },
  modalPrimaryBtnPressed: {
    opacity: 0.92,
  },
  modalPrimaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#faf8f5',
    fontWeight: '700',
  },
  detailBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailBackdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,28,25,0.30)',
  },
  detailSheet: {
    minHeight: 360,
    maxHeight: '78%',
    backgroundColor: '#f6f4f0',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
  },
  detailHandleWrap: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  detailHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(93,96,90,0.24)',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  detailSideBtn: {
    minWidth: 52,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  detailSideBtnRight: {
    alignItems: 'flex-end',
  },
  detailCloseTxt: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6d746e',
    fontWeight: '700',
  },
  detailEditTxt: {
    fontSize: 13,
    lineHeight: 18,
    color: '#47664a',
    fontWeight: '700',
  },
  detailHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#2d2d2d',
  },
  detailBody: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  detailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  detailDateBig: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#2d2d2d',
    letterSpacing: -0.4,
  },
  detailStatusBadge: {
    minHeight: 28,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailStatusText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detailInfoCard: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailInfoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  detailInfoLabel: {
    width: 88,
    fontSize: 12,
    lineHeight: 18,
    color: '#727972',
    fontWeight: '700',
  },
  detailInfoValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#313632',
    fontWeight: '600',
  },
  detailNoteCard: {
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fbfbf8',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  detailNoteLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: '#6d746e',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  detailNoteText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#444a44',
    fontWeight: '600',
  },
  detailDocsCard: {
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  detailDocsTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#2f352f',
  },
  detailDocsList: {
    marginTop: 8,
    gap: 8,
  },
  detailDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#f8f8f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailDocRowPressed: {
    backgroundColor: '#f1f4ef',
  },
  detailDocIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ec',
  },
  detailDocBody: {
    flex: 1,
    gap: 2,
  },
  detailDocName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#313632',
  },
  detailDocMeta: {
    fontSize: 11,
    lineHeight: 15,
    color: '#7b817b',
  },
  detailDocAction: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#47664a',
  },
  docPreviewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(24,28,25,0.34)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  docPreviewSheet: {
    borderRadius: 18,
    backgroundColor: '#f6f4f0',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  docPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  docPreviewTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#2e342f',
  },
  docPreviewClose: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#6c736d',
  },
  docPreviewCanvas: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#ecefe9',
    padding: 14,
  },
  docPreviewPaper: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    minHeight: 280,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  docPreviewPaperTop: {
    gap: 10,
  },
  docPreviewPdfBadge: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#eef2ec',
  },
  docPreviewPdfBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#4a5b4d',
  },
  docPreviewName: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#29302a',
  },
  docPreviewBody: {
    marginTop: 18,
    gap: 12,
  },
  docPreviewLineLong: {
    height: 9,
    borderRadius: 4,
    backgroundColor: '#e9ede8',
    width: '100%',
  },
  docPreviewLineShort: {
    height: 9,
    borderRadius: 4,
    backgroundColor: '#edf0ec',
    width: '62%',
  },
  docPreviewLineMid: {
    height: 9,
    borderRadius: 4,
    backgroundColor: '#edf0ec',
    width: '78%',
  },
  docPreviewStamp: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f0f5ef',
  },
  docPreviewStampText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#4f6552',
  },
  docPreviewHint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: '#737a74',
  },
  clinicPickerInlineWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    justifyContent: 'flex-end',
  },
  clinicPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22,28,23,0.26)',
  },
  clinicPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  clinicPickerSheet: {
    backgroundColor: '#f6f4f0',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    minHeight: '78%',
    maxHeight: '86%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 18,
  },
  clinicPickerHandleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  clinicPickerHandle: {
    width: 44,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(65,73,68,0.22)',
  },
  clinicPickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  clinicPickerHeaderText: {
    flex: 1,
    gap: 3,
  },
  clinicPickerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#2d2d2d',
  },
  clinicPickerSub: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6d746e',
  },
  clinicPickerCloseBtn: {
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#ffffff',
  },
  clinicPickerCloseText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#5d605a',
  },
  clinicSearchRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clinicSearchInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#2d2d2d',
  },
  clinicNearbyBtn: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#47664a',
  },
  clinicNearbyBtnText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#ffffff',
    fontWeight: '700',
  },
  clinicMapCard: {
    marginTop: 12,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#dde5de',
  },
  clinicMap: {
    flex: 1,
  },
  staticClinicMap: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  staticClinicMapImage: {
    width: '100%',
    height: '100%',
  },
  staticClinicMapSurface: {
    flex: 1,
    backgroundColor: '#dfe7df',
    overflow: 'hidden',
  },
  staticClinicMapTile: {
    position: 'absolute',
    width: 256,
    height: 256,
  },
  staticClinicMapFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(246,244,240,0.04)',
  },
  staticClinicMarker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6e8f73',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#243126',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  staticClinicMarkerAnchor: {
    position: 'absolute',
    marginLeft: -6,
    marginTop: -6,
  },
  staticClinicMarkerSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#47664a',
  },
  staticClinicUserDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1f6fff',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  staticClinicPreviewBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  staticClinicPreviewBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: '#465048',
  },
  clinicMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#e7ece7',
  },
  clinicMapFallbackTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#38413a',
    textAlign: 'center',
  },
  clinicMapFallbackText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: '#667068',
    textAlign: 'center',
  },
  clinicMapFallbackHint: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 16,
    color: '#4b544d',
    textAlign: 'center',
  },
  clinicMapLoading: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  clinicMapLoadingText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4c524d',
    fontWeight: '600',
  },
  clinicMapAttribution: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  clinicMapAttributionText: {
    fontSize: 10,
    lineHeight: 12,
    color: '#5b625c',
    fontWeight: '600',
  },
  clinicPickerHint: {
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff8ea',
    borderWidth: 1,
    borderColor: '#ead9b4',
  },
  clinicPickerHintText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#735d2f',
  },
  clinicResultsList: {
    marginTop: 12,
    maxHeight: 260,
  },
  clinicResultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  clinicResultRowActive: {
    borderColor: 'rgba(71,102,74,0.22)',
    backgroundColor: '#f5f8f4',
  },
  clinicResultTextWrap: {
    flex: 1,
    gap: 2,
  },
  clinicResultName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#30332e',
  },
  clinicResultAddress: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6f746e',
  },
  clinicResultDistance: {
    fontSize: 11,
    lineHeight: 15,
    color: '#47664a',
    fontWeight: '700',
    paddingTop: 2,
  },
  clinicEmptyState: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicEmptyTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: '#40443f',
  },
  clinicEmptyText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#747a74',
    textAlign: 'center',
  },
});

