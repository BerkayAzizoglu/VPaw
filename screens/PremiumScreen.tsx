import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';

const HERO_IMAGE = 'https://www.figma.com/api/mcp/asset/a2048b0f-f9f0-482d-a0fe-39eacf8fd35e';

type PremiumScreenProps = {
  onBack: () => void;
};

type FeatureIcon = 'pets' | 'shield' | 'passport' | 'ai' | 'reminder';

type CompareRow = {
  label: string;
  free: string | 'dot';
  pro: string | 'check';
  proAccent?: boolean;
};

function PremiumIcon({ name, size = 20, color = '#c48d42' }: { name: FeatureIcon | 'sparkles' | 'check' | 'back'; size?: number; color?: string }) {
  if (name === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'sparkles') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3L13.5 7.5L18 9L13.5 10.5L12 15L10.5 10.5L6 9L10.5 7.5L12 3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M18.5 3.5L19.2 5.3L21 6L19.2 6.7L18.5 8.5L17.8 6.7L16 6L17.8 5.3L18.5 3.5Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'pets') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="8" cy="8" r="2.2" stroke={color} strokeWidth={1.8} />
        <Circle cx="16" cy="8" r="2.2" stroke={color} strokeWidth={1.8} />
        <Path d="M4.8 18.2C5.9 15.8 8 14.5 12 14.5C16 14.5 18.1 15.8 19.2 18.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'shield') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3.8L18 6.1V11.3C18 15 15.5 18 12 20.2C8.5 18 6 15 6 11.3V6.1L12 3.8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'passport') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 4.8H15.5L19 8.2V19.2H7V4.8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M15.5 4.8V8.2H19" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M9.5 12H16.2M9.5 15.2H16.2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'ai') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 13.2C6.4 13.2 6.8 9.4 9.2 9.4C11.1 9.4 11.6 15.2 13.5 15.2C15.2 15.2 15.6 11.8 18 11.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="4" cy="13.2" r="1.2" fill={color} />
        <Circle cx="18" cy="11.8" r="1.2" fill={color} />
      </Svg>
    );
  }

  if (name === 'reminder') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7.4 16.8H16.6C15.8 15.9 15.2 14.8 15.2 12.6V10.8C15.2 8.9 13.7 7.4 11.8 7.4C9.9 7.4 8.4 8.9 8.4 10.8V12.6C8.4 14.8 7.8 15.9 7.4 16.8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M10.5 18.2C10.8 19 11.3 19.4 11.8 19.4C12.3 19.4 12.8 19 13.1 18.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 12L10.1 15.3L17.5 8.2" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FeatureCard({ item }: { item: { title: string; desc: string; icon: FeatureIcon; tall?: boolean } }) {
  return (
    <View style={[styles.featureCard, item.tall && styles.featureCardTall]}>
      <View style={styles.featureIconWrap}>
        <PremiumIcon name={item.icon} size={20} />
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={[styles.featureDesc, item.tall && styles.featureDescTall]}>{item.desc}</Text>
      </View>
    </View>
  );
}

function Dot() {
  return <View style={styles.dot} />;
}

function CheckPill() {
  return (
    <View style={styles.checkPill}>
      <PremiumIcon name="check" size={12} color="#c48d42" />
    </View>
  );
}

export default function PremiumScreen({ onBack }: PremiumScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).premium;

  const features: Array<{ title: string; desc: string; icon: FeatureIcon; tall?: boolean }> = [
    { title: copy.features.unlimitedPetsTitle, desc: copy.features.unlimitedPetsDesc, icon: 'pets' },
    { title: copy.features.fullHealthTitle, desc: copy.features.fullHealthDesc, icon: 'shield' },
    { title: copy.features.pdfPassportTitle, desc: copy.features.pdfPassportDesc, icon: 'passport' },
    { title: copy.features.aiTitle, desc: copy.features.aiDesc, icon: 'ai', tall: true },
    { title: copy.features.remindersTitle, desc: copy.features.remindersDesc, icon: 'reminder' },
  ];

  const swipePanResponder = useEdgeSwipeBack({ onBack, enabled: true, edgeWidth: 24, triggerDx: 70, maxDy: 30 });

  const comparisonRows: CompareRow[] = [
    { label: copy.table.petProfiles, free: copy.table.one, pro: copy.table.unlimited, proAccent: true },
    { label: copy.table.healthRecords, free: copy.table.threeMonths, pro: copy.table.lifetime, proAccent: true },
    { label: copy.table.pdfExport, free: 'dot', pro: 'check' },
    { label: copy.table.aiInsights, free: 'dot', pro: 'check' },
  ];

  return (
    <View style={styles.screen} {...swipePanResponder.panHandlers}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.heroImage} imageStyle={styles.heroImageInner}>
          <View style={styles.heroOverlay} />
        </ImageBackground>

        <View style={styles.mainContent}>
          <View style={styles.badge}>
            <PremiumIcon name="sparkles" size={12} color="#c48d42" />
            <Text style={styles.badgeText}>{copy.badge}</Text>
          </View>

          <Text style={styles.heading}>{copy.heading}</Text>
          <Text style={styles.subHeading}>{copy.subheading}</Text>

          <View style={styles.featureList}>
            {features.map((item) => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </View>

          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={styles.headerSpacer} />
              <Text style={styles.freeHeader}>{copy.table.free}</Text>
              <View style={styles.proHeaderWrap}>
                <PremiumIcon name="sparkles" size={10} color="#c48d42" />
                <Text style={styles.proHeader}>{copy.table.pro}</Text>
              </View>
            </View>

            {comparisonRows.map((row, idx) => (
              <View key={row.label} style={[styles.tableRow, idx !== comparisonRows.length - 1 && styles.tableRowBorder]}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <View style={styles.rowCellCenter}>
                  {row.free === 'dot' ? <Dot /> : <Text style={styles.freeCellText}>{row.free}</Text>}
                </View>
                <View style={styles.rowCellCenter}>
                  {row.pro === 'check' ? <CheckPill /> : <Text style={[styles.proCellText, row.proAccent && styles.proAccent]}>{row.pro}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Pressable style={styles.backButton} onPress={onBack}>
        <PremiumIcon name="back" size={22} color="#ffffff" />
      </Pressable>

      <View pointerEvents="box-none" style={styles.bottomOverlay}>
        <View style={styles.bottomGradient} />
        <Pressable style={styles.upgradeBtn}>
          <PremiumIcon name="sparkles" size={18} color="#faf8f5" />
          <Text style={styles.upgradeText}>{copy.upgrade}</Text>
        </Pressable>
        <Pressable onPress={onBack}>
          <Text style={styles.maybeLater}>{copy.maybeLater}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },
  content: {
    paddingBottom: 170,
  },
  heroImage: {
    height: 384,
    width: '100%',
  },
  heroImageInner: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31, 21, 12, 0.18)',
  },
  mainContent: {
    marginTop: -80,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  badge: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f2ebd9',
    backgroundColor: '#fcf6ee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 13,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#c48d42',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heading: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 35,
    color: '#2d2d2d',
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subHeading: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    color: '#787878',
    fontWeight: '400',
  },
  featureList: {
    marginTop: 20,
    width: '100%',
    gap: 16,
  },
  featureCard: {
    minHeight: 82,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 17,
    paddingHorizontal: 17,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  featureCardTall: {
    minHeight: 94,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f2ebd9',
    backgroundColor: '#fcf6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
    paddingTop: 4,
  },
  featureTitle: {
    fontSize: 15,
    lineHeight: 19,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  featureDesc: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#787878',
    fontWeight: '400',
  },
  featureDescTall: {
    maxWidth: 196,
  },
  tableCard: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  tableHeader: {
    height: 51,
    backgroundColor: '#faf9f8',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerSpacer: {
    flex: 1.25,
  },
  freeHeader: {
    flex: 0.9,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: '#787878',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  proHeaderWrap: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  proHeader: {
    fontSize: 12,
    lineHeight: 18,
    color: '#c48d42',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tableRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  rowLabel: {
    flex: 1.25,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(45,45,45,0.8)',
    fontWeight: '600',
  },
  rowCellCenter: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeCellText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#787878',
    fontWeight: '500',
  },
  proCellText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#787878',
    fontWeight: '500',
  },
  proAccent: {
    color: '#c48d42',
    fontWeight: '700',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  checkPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f2ebd9',
    backgroundColor: '#fcf6ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250,249,248,0.95)',
  },
  upgradeBtn: {
    width: '100%',
    height: 56,
    borderRadius: 100,
    backgroundColor: '#2d2d2d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  upgradeText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#faf8f5',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  maybeLater: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: '#787878',
    fontWeight: '600',
  },
});

