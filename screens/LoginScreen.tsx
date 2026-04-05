import React, { useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path, SvgUri } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FloatingDecor from '../components/FloatingDecor';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../hooks/useLocale';
import { hap } from '../lib/haptics';
import { monoType as mt } from '../lib/typography';

const loginIllustrationAsset = require('../assets/illustrations/login-cat-dog.png');
const loginFigmaLogoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;

function AppleMiniLogo({ size = 22, color = '#2D2D2D' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.56 12.37c.02 2.2 1.93 2.93 1.95 2.94-.02.05-.3 1.02-.99 2.02-.6.87-1.23 1.74-2.21 1.76-.96.02-1.27-.57-2.37-.57-1.1 0-1.45.55-2.35.59-.95.04-1.68-.95-2.29-1.81-1.25-1.81-2.21-5.11-.92-7.35.64-1.11 1.79-1.81 3.03-1.83.95-.02 1.84.63 2.37.63.53 0 1.54-.78 2.6-.67.44.02 1.67.18 2.45 1.32-.06.04-1.46.85-1.45 2.55ZM14.86 5.56c.5-.6.84-1.43.75-2.26-.72.03-1.58.48-2.1 1.07-.46.52-.87 1.37-.76 2.18.8.06 1.62-.41 2.11-.99Z"
        fill={color}
      />
    </Svg>
  );
}

function GoogleMiniLogo({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21.81 12.23c0-.64-.06-1.25-.16-1.84H12v3.48h5.52c-.24 1.29-.97 2.39-2.06 3.13v2.6h3.33c1.95-1.8 3.02-4.44 3.02-7.37Z" fill="#4285F4" />
      <Path d="M12 22c2.76 0 5.08-.92 6.77-2.4l-3.33-2.6c-.92.62-2.1 1-3.44 1-2.64 0-4.88-1.78-5.68-4.18H2.89v2.66A9.99 9.99 0 0 0 12 22Z" fill="#34A853" />
      <Path d="M6.32 13.82a6 6 0 0 1 0-3.64V7.52H2.89a10 10 0 0 0 0 8.96l3.43-2.66Z" fill="#FBBC05" />
      <Path d="M12 6.05c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.07 2.99 14.75 2 12 2 8.11 2 4.75 4.23 2.89 7.52l3.43 2.66c.8-2.4 3.04-4.13 5.68-4.13Z" fill="#EA4335" />
    </Svg>
  );
}

type LoginScreenProps = {
  onSignedIn?: () => void;
  onTestOnboarding?: () => void;
};

export default function LoginScreen({ onSignedIn, onTestOnboarding }: LoginScreenProps) {
  const { signIn, signUp } = useAuth();
  const { locale } = useLocale();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const isTr = locale === 'tr';
  const passwordInputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // ─── Proportional sizes based on screen height ───────────────────────────
  // Small screen: iPhone SE (667), Medium: iPhone 14 (844), Large: Pro Max (932)
  const isSmall = screenHeight <= 700;
  const isMedium = screenHeight <= 844;

  const illustrationH = isSmall ? 130 : isMedium ? 158 : 182;
  const illustrationW = Math.round(illustrationH * (230 / 196));
  const logoSize     = isSmall ? 40 : 46;
  const brandTitleSz = isSmall ? 24 : 27;
  const headlineSz   = isSmall ? 24 : isMedium ? 27 : 30;
  const headlineLH   = headlineSz + 6;
  const btnHeight    = isSmall ? 50 : 56;
  const socialH      = isSmall ? 42 : 48;

  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenScale   = useRef(new Animated.Value(1)).current;

  const focusPasswordField = React.useCallback(() => {
    setTimeout(() => {
      passwordInputRef.current?.focus();
      setKeyboardOpen(true);
    }, 60);
  }, []);

  React.useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const onContinue = async () => {
    hap.medium();
    setError(null);
    if (!email.trim() || !password) {
      setError(isTr ? 'Lütfen e-posta ve şifre girin.' : 'Please enter email and password.');
      return;
    }
    setLoading(true);
    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);
    if (authError) {
      setError(authError);
    } else {
      Animated.parallel([
        Animated.timing(screenOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(screenScale, { toValue: 0.985, duration: 260, useNativeDriver: true }),
      ]).start(() => {
        onSignedIn?.();
        screenOpacity.setValue(1);
        screenScale.setValue(1);
      });
    }
  };

  const onSignUp = async () => {
    hap.light();
    setError(null);
    if (!email.trim() || !password) {
      setError(isTr ? 'Hesap oluşturmak için e-posta ve şifre girin.' : 'Enter email and password to create an account.');
      return;
    }
    setLoading(true);
    const { error: authError } = await signUp(email.trim(), password);
    setLoading(false);
    if (authError) {
      setError(authError);
    } else {
      setError(isTr ? 'Kayıt başarılı. Gerekirse e-postanı doğrula, sonra Giriş Yap\'a dokun.' : 'Sign up successful. If required, verify email then tap Sign In.');
    }
  };

  return (
    <Animated.View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top + 8, 28),
          paddingBottom: Math.max(insets.bottom + 10, 20),
          opacity: screenOpacity,
          transform: [{ scale: screenScale }],
        },
      ]}
    >
      <StatusBar style="dark" />
      <FloatingDecor hideBottomPaw hiddenIds={['d3', 'd4', 'd5']} flowDirection="down" />

      <KeyboardAvoidingView
        style={styles.kavWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 10}
      >
        <View style={styles.inner}>

          {/* ── Hero (brand + illustration + copy) ── */}
          {!keyboardOpen ? (
            <View style={styles.hero}>
              {/* Brand */}
              <View style={styles.brandRow}>
                <SvgUri uri={loginFigmaLogoUri} width={logoSize} height={logoSize} />
                <Text style={[styles.brandTitle, { fontSize: brandTitleSz, lineHeight: brandTitleSz + 4 }]}>VPaw</Text>
                <Text style={styles.brandSub}>BY VIRNELO</Text>
              </View>

              {/* Illustration */}
              <View style={styles.illustrationWrap}>
                <Image
                  source={loginIllustrationAsset}
                  style={{ width: illustrationW, height: illustrationH }}
                  resizeMode="contain"
                />
              </View>

              {/* Copy */}
              <View style={styles.copyWrap}>
                <Text style={[styles.headline, { fontSize: headlineSz, lineHeight: headlineLH }]}>
                  {isTr ? 'Bakımı akıllı şekilde\nyönet.' : 'Care, intelligently\nsimplified.'}
                </Text>
                <Text style={styles.subheadline}>
                  {isTr ? 'Hayvanın için gereken her şey, tek yerde.' : 'Everything your pet needs, in one place.'}
                </Text>
              </View>
            </View>
          ) : (
            // Keyboard open — show only compact brand
            <View style={styles.compactBrand}>
              <SvgUri uri={loginFigmaLogoUri} width={36} height={36} />
              <Text style={styles.compactBrandTitle}>VPaw</Text>
            </View>
          )}

          {/* ── Form ── */}
          <View style={styles.form}>
            {/* Inputs */}
            <View style={styles.inputsCard}>
              <Text style={styles.inputLabel}>{isTr ? 'E-posta' : 'Email'}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                blurOnSubmit={false}
                submitBehavior="submit"
                onSubmitEditing={() => { hap.light(); focusPasswordField(); }}
                onKeyPress={(e) => { if (e.nativeEvent.key === 'Enter') focusPasswordField(); }}
                onEndEditing={(e) => { if (e.nativeEvent.text?.trim()?.length) focusPasswordField(); }}
                autoCorrect={false}
                placeholder={isTr ? 'sen@alanadi.com' : 'you@domain.com'}
                placeholderTextColor="#a7a7a7"
                style={styles.input}
              />
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>{isTr ? 'Şifre' : 'Password'}</Text>
              <TextInput
                ref={passwordInputRef}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={onContinue}
                onFocus={() => setKeyboardOpen(true)}
                placeholder={isTr ? 'Şifre gir' : 'Enter password'}
                placeholderTextColor="#a7a7a7"
                style={styles.input}
              />
            </View>

            {/* CTAs */}
            <View style={styles.ctas}>
              <Pressable
                style={[styles.primaryBtn, { height: btnHeight }, loading && { opacity: 0.75 }]}
                disabled={loading}
                onPress={onContinue}
                onPressIn={() => hap.light()}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? (isTr ? 'Lütfen bekle...' : 'Please wait...') : (isTr ? 'Giriş Yap' : 'Sign In')}
                </Text>
              </Pressable>

              <View style={styles.socialRow}>
                <Pressable style={[styles.socialBtn, { height: socialH }]} disabled>
                  <View style={styles.socialIconWrap}><AppleMiniLogo size={22} /></View>
                  <Text style={styles.socialText}>Apple</Text>
                </Pressable>
                <Pressable style={[styles.socialBtn, { height: socialH }]} disabled>
                  <View style={styles.socialIconWrap}><GoogleMiniLogo size={21} /></View>
                  <Text style={styles.socialText}>Google</Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.signUpBtn, { height: socialH }]}
                disabled={loading}
                onPress={onSignUp}
                onPressIn={() => hap.light()}
              >
                <Text style={styles.signUpBtnText}>{isTr ? 'E-posta ile Kayıt Ol' : 'Sign up with Email'}</Text>
              </Pressable>

              {error ? <Text style={styles.feedbackText}>{error}</Text> : null}

              <Text style={styles.legalText}>
                {isTr
                  ? 'Devam ederek Koşullar ve Gizlilik Politikası\'nı kabul edersin.'
                  : 'By continuing, you agree to our Terms and Privacy Policy.'}
              </Text>
            </View>
          </View>

        </View>
      </KeyboardAvoidingView>

      {__DEV__ && onTestOnboarding ? (
        <View pointerEvents="box-none" style={styles.devWrap}>
          <Pressable style={styles.devBtn} onPress={() => { hap.light(); onTestOnboarding(); }}>
            <Text style={styles.devBtnText}>Test Onboarding</Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ececec',
    paddingHorizontal: 24,
  },
  kavWrap: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // ─── Hero ───────────────────────────────────────────────────────────────────
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    paddingVertical: 4,
  },
  brandRow: {
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  brandTitle: {
    ...mt.metric,
    color: '#2d2d2d',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  brandSub: {
    ...mt.metricSm,
    fontSize: 10,
    lineHeight: 13,
    color: '#787878',
    letterSpacing: 2,
    textAlign: 'center',
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  copyWrap: {
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 8,
  },
  headline: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -0.7,
  },
  subheadline: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#787878',
    letterSpacing: 0.1,
  },

  // Keyboard-open compact brand
  compactBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  compactBrandTitle: {
    ...mt.metric,
    fontSize: 22,
    lineHeight: 26,
    color: '#2d2d2d',
    letterSpacing: -0.5,
  },

  // ─── Form ───────────────────────────────────────────────────────────────────
  form: {
    flexShrink: 0,
    gap: 8,
  },
  inputsCard: {
    backgroundColor: 'transparent',
    paddingBottom: 2,
  },
  inputLabel: {
    marginLeft: 8,
    marginBottom: 6,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#8b8b8b',
    letterSpacing: 0.3,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.16)',
    backgroundColor: '#ececec',
    paddingHorizontal: 14,
    fontSize: 15,
    lineHeight: 20,
    color: '#2d2d2d',
  },
  ctas: {
    gap: 8,
  },
  primaryBtn: {
    borderRadius: 20,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: '#faf8f5',
    letterSpacing: 0.3,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(255,255,255,0.58)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  socialIconWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#2d2d2d',
  },
  signUpBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.16)',
    backgroundColor: 'rgba(255,255,255,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpBtnText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#2d2d2d',
  },
  feedbackText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#b55858',
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  legalText: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
    color: '#787878',
    letterSpacing: 0.1,
    paddingHorizontal: 8,
    alignSelf: 'center',
    maxWidth: 300,
  },

  // ─── Dev ────────────────────────────────────────────────────────────────────
  devWrap: {
    position: 'absolute',
    top: 56,
    right: 14,
    zIndex: 6,
  },
  devBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  devBtnText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#8f8f8f',
    letterSpacing: 0.2,
  },
});
