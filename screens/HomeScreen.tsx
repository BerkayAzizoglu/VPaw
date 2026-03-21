import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';

const logoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;

const HERO_IMAGE = 'https://www.figma.com/api/mcp/asset/6f25c37a-f633-4891-ba3b-0fab066dac17';
const AVATAR_IMAGE = 'https://www.figma.com/api/mcp/asset/c1377527-400c-4e5e-8c97-bd4806f77781';

type HomeScreenProps = {
  onOpenProfile: () => void;
};

export default function HomeScreen({ onOpenProfile }: HomeScreenProps) {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.brandWrap}>
            <SvgUri uri={logoUri} width={24} height={24} />
            <View>
              <Text style={styles.brandTitle}>V-Paw</Text>
              <Text style={styles.brandSub}>BY VIRNELO</Text>
            </View>
          </View>

          <Pressable onPress={onOpenProfile} style={styles.avatarBtn}>
            <Image source={{ uri: AVATAR_IMAGE }} style={styles.avatar} />
          </Pressable>
        </View>

        <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.heroCard} imageStyle={styles.heroImage}>
          <View style={styles.heroBottom}>
            <Text style={styles.heroName}>Luna</Text>
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroBreedPill}>Golden Retriever</Text>
              <Text style={styles.heroMeta}>3 years old</Text>
            </View>
          </View>
        </ImageBackground>

        <Text style={styles.sectionTitle}>Health Overview</Text>

        <View style={styles.weightCard}>
          <View style={styles.weightHeader}>
            <View style={styles.circleIcon}><Text style={styles.circleIconText}>^</Text></View>
            <Text style={styles.weightHeaderText}>WEIGHT PROFILE</Text>
            <Text style={styles.weightArrow}>›</Text>
          </View>
          <Text style={styles.weightValue}>28.5 kg <Text style={styles.weightPill}>? +0.3 kg</Text></Text>
          <Text style={styles.weightSub}>Ideal weight maintained</Text>
          <Text style={styles.weightSub2}>Last updated today</Text>
        </View>

        <View style={styles.gridRow}>
          <MiniCard icon="?" title="VACCINES" value="Up to date" sub="Next: Rabies" />
          <MiniCard icon="?" title="VET VISITS" value="2 visits" sub="March 5" />
        </View>

        <View style={styles.gridRow}>
          <MiniCard icon="?" title="PASSPORT" value="Export" sub="PDF Document" />
          <MiniCard icon="¦" title="RECORDS" value="4 types" sub="Log health" />
        </View>

        <View style={styles.upcomingHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        <View style={styles.upcomingCard}>
          <EventRow title="Annual checkup" date="March 28, 2026 · 10:30 AM" />
          <EventRow title="Flea & tick prevention" date="April 1, 2026" />
          <EventRow title="Grooming appointment" date="April 15, 2026 · 2:00 PM" />
        </View>
      </ScrollView>
    </View>
  );
}

function MiniCard({ icon, title, value, sub }: { icon: string; title: string; value: string; sub: string }) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniTopRow}>
        <View style={styles.miniIconWrap}><Text style={styles.miniIcon}>{icon}</Text></View>
        <Text style={styles.miniArrow}>›</Text>
      </View>
      <Text style={styles.miniTitle}>{title}</Text>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniSub}>{sub}</Text>
    </View>
  );
}

function EventRow({ title, date }: { title: string; date: string }) {
  return (
    <View style={styles.eventRow}>
      <View style={styles.eventDotWrap}><View style={styles.eventDot} /></View>
      <View style={styles.eventTextWrap}>
        <Text style={styles.eventTitle}>{title}</Text>
        <Text style={styles.eventDate}>{date}</Text>
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
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    lineHeight: 18,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  brandSub: {
    fontSize: 9,
    lineHeight: 12,
    color: '#8d8d8d',
    letterSpacing: 1.6,
    fontWeight: '600',
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  heroCard: {
    height: 360,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImage: {
    borderRadius: 24,
  },
  heroBottom: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
  },
  heroName: {
    fontSize: 38,
    lineHeight: 40,
    fontWeight: '700',
    color: '#fff',
  },
  heroMetaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBreedPill: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(220,220,220,0.55)',
    backgroundColor: 'rgba(80,80,80,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.86)',
  },
  sectionTitle: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '700',
    color: '#2d2d2d',
    marginTop: 2,
  },
  weightCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
    padding: 22,
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  circleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f1ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  circleIconText: {
    fontSize: 16,
    lineHeight: 18,
    color: '#757575',
    fontWeight: '600',
  },
  weightHeaderText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#a1a1a1',
    letterSpacing: 0.8,
  },
  weightArrow: {
    fontSize: 20,
    lineHeight: 20,
    color: '#c7c7c7',
    fontWeight: '600',
  },
  weightValue: {
    fontSize: 46,
    lineHeight: 50,
    fontWeight: '700',
    color: '#2d2d2d',
  },
  weightPill: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4a8b56',
    backgroundColor: '#e6f3e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  weightSub: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    color: '#4e4e4e',
  },
  weightSub2: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: '#9b9b9b',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  miniTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  miniIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f0f1ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniIcon: {
    fontSize: 12,
    lineHeight: 14,
    color: '#777',
    fontWeight: '600',
  },
  miniArrow: {
    fontSize: 16,
    lineHeight: 16,
    color: '#c5c5c5',
    fontWeight: '600',
  },
  miniTitle: {
    fontSize: 11,
    lineHeight: 14,
    color: '#9c9c9c',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  miniValue: {
    marginTop: 6,
    fontSize: 36,
    lineHeight: 40,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  miniSub: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: '#8d8d8d',
  },
  upcomingHeader: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAll: {
    fontSize: 15,
    lineHeight: 20,
    color: '#6f6f6f',
    fontWeight: '500',
  },
  upcomingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 10,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  eventDotWrap: {
    width: 30,
    alignItems: 'center',
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#656565',
  },
  eventTextWrap: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#2d2d2d',
    fontWeight: '600',
  },
  eventDate: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    color: '#8c8c8c',
  },
});

