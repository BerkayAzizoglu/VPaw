import React, { useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path, SvgUri } from 'react-native-svg';
import FloatingDecor from '../components/FloatingDecor';
import { useAuth } from '../hooks/useAuth';

const loginIllustratorUri = Image.resolveAssetSource(require('../assets/vpaw-login-illustrator.svg')).uri;
const loginFigmaLogoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;
const pczDecorUri = Image.resolveAssetSource(require('../assets/pcz-svg.svg')).uri;
const dogDecorUri = Image.resolveAssetSource(require('../assets/dog-ikon.svg')).uri;

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
};

export default function LoginScreen({ onSignedIn }: LoginScreenProps) {
  const { signIn, signUp } = useAuth();
  const passwordInputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bob = useRef(new Animated.Value(-12)).current;
  const catDecorFloat = useRef(new Animated.Value(-8)).current;
  const dogDecorFloat = useRef(new Animated.Value(10)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 12, duration: 1900, useNativeDriver: true }),
        Animated.timing(bob, { toValue: -12, duration: 1900, useNativeDriver: true }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [bob]);

  React.useEffect(() => {
    const decorLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(catDecorFloat, { toValue: 12, duration: 4200, useNativeDriver: true }),
        Animated.timing(catDecorFloat, { toValue: -8, duration: 4200, useNativeDriver: true }),
      ]),
    );

    decorLoop.start();
    return () => decorLoop.stop();
  }, [catDecorFloat]);

  React.useEffect(() => {
    const dogLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dogDecorFloat, { toValue: -6, duration: 4400, useNativeDriver: true }),
        Animated.timing(dogDecorFloat, { toValue: 10, duration: 4400, useNativeDriver: true }),
      ]),
    );

    dogLoop.start();
    return () => dogLoop.stop();
  }, [dogDecorFloat]);

  const onContinue = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);
    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);

    if (authError) {
      setError(authError);
    } else {
      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(screenScale, {
          toValue: 0.985,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onSignedIn?.();
        screenOpacity.setValue(1);
        screenScale.setValue(1);
      });
    }
  };

  const onSignUp = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter email and password to create an account.');
      return;
    }

    setLoading(true);
    const { error: authError } = await signUp(email.trim(), password);
    setLoading(false);

    if (authError) {
      setError(authError);
    } else {
      setError('Sign up successful. If required, verify email then tap Sign In.');
    }
  };

  return (
    <Animated.View style={[styles.loginScreen, { opacity: screenOpacity, transform: [{ scale: screenScale }] }]}>
      <StatusBar style="dark" />
      <FloatingDecor hideBottomPaw hiddenIds={['d3', 'd4', 'd5']} flowDirection="down" />

      <View style={styles.brandBlock}>
        <SvgUri uri={loginFigmaLogoUri} width={48} height={48} />
        <Text style={styles.brandTitle}>V-Paw</Text>
        <Text style={styles.brandSubtitle}>BY VIRNELO</Text>
      </View>

      <Animated.View style={[styles.illustrationWrap, { transform: [{ translateY: bob }] }]}>
        <SvgUri uri={loginIllustratorUri} width={168} height={168} />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.catDecor, { transform: [{ translateY: catDecorFloat }] }]}>
        <SvgUri uri={pczDecorUri} width={30} height={30} />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.dogDecor, { transform: [{ translateY: dogDecorFloat }] }]}>
        <SvgUri uri={dogDecorUri} width={30} height={30} />
      </Animated.View>

      <View style={styles.copyBlock}>
        <Text style={styles.headline}>Care, intelligently{`\n`}simplified.</Text>
        <Text style={styles.subheadline}>Everything your pet needs,{`\n`}in one place.</Text>
      </View>

      <View style={styles.authCard}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          placeholder="you@domain.com"
          placeholderTextColor="#a7a7a7"
          style={styles.input}
        />

        <Text style={[styles.inputLabel, styles.passwordLabel]}>Password</Text>
        <TextInput
          ref={passwordInputRef}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={onContinue}
          placeholder="Enter password"
          placeholderTextColor="#a7a7a7"
          style={styles.input}
        />
      </View>

      <View style={styles.ctaBlock}>
        <Pressable style={[styles.primaryButton, loading && { opacity: 0.75 }]} disabled={loading} onPress={onContinue}>
          <Text style={styles.primaryButtonText}>{loading ? 'Please wait...' : 'Sign In'}</Text>
        </Pressable>

        <View style={styles.socialRow}>
          <Pressable style={styles.socialButton} disabled>
            <View style={styles.socialIconWrap}><AppleMiniLogo size={23} /></View>
            <Text style={styles.socialText}>Apple</Text>
          </Pressable>
          <Pressable style={styles.socialButton} disabled>
            <View style={styles.socialIconWrap}><GoogleMiniLogo size={22} /></View>
            <Text style={styles.socialText}>Google</Text>
          </Pressable>
        </View>

        <Pressable style={styles.signUpButton} disabled={loading} onPress={onSignUp}>
          <Text style={styles.signUpButtonText}>Sign up with Email</Text>
        </Pressable>

        {error ? <Text style={styles.feedbackText}>{error}</Text> : null}

        <Text style={styles.authLegalText}>
          By continuing, you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loginScreen: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#ececec',
    paddingHorizontal: 24,
    paddingTop: 46,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  brandBlock: { alignItems: 'center', gap: 6, zIndex: 2, marginTop: 14, marginBottom: 6 },
  brandTitle: { fontSize: 28, lineHeight: 30, fontWeight: '700', color: '#2d2d2d', letterSpacing: -0.6, textAlign: 'center' },
  brandSubtitle: { fontSize: 10, lineHeight: 14, fontWeight: '600', color: '#787878', letterSpacing: 2, textAlign: 'center' },
  illustrationWrap: { width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 170, zIndex: 2, marginTop: 4 },
  catDecor: {
    position: 'absolute',
    right: 36,
    top: 318,
    opacity: 0.14,
    zIndex: 1,
  },
  dogDecor: {
    position: 'absolute',
    left: 36,
    top: 366,
    opacity: 0.14,
    zIndex: 1,
  },
  copyBlock: { alignItems: 'center', gap: 8, zIndex: 2, marginBottom: 8 },
  headline: { textAlign: 'center', fontSize: 30, lineHeight: 34, fontWeight: '700', color: '#2d2d2d', letterSpacing: -0.7 },
  subheadline: { textAlign: 'center', fontSize: 15, lineHeight: 22, fontWeight: '500', color: '#787878', letterSpacing: 0.2 },
  authCard: {
    zIndex: 2,
    borderRadius: 22,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  inputLabel: {
    marginLeft: 8,
    marginBottom: 6,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#8b8b8b',
    letterSpacing: 0.3,
    textAlign: 'left',
  },
  passwordLabel: {
    marginTop: 10,
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
    textAlign: 'left',
  },
  ctaBlock: { gap: 10, zIndex: 2, marginTop: 8 },
  primaryButton: {
    height: 58,
    borderRadius: 22,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  primaryButtonText: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#faf8f5', letterSpacing: 0.32, textAlign: 'center' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialButton: {
    flex: 1,
    height: 50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(255,255,255,0.58)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  socialIconWrap: { width: 24, alignItems: 'center', justifyContent: 'center' },
  socialText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#2d2d2d', textAlign: 'center' },
  signUpButton: {
    height: 50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.16)',
    backgroundColor: 'rgba(255,255,255,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpButtonText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#2d2d2d', textAlign: 'center' },
  feedbackText: { fontSize: 12, lineHeight: 16, color: '#b55858', textAlign: 'center', paddingHorizontal: 6 },
  authLegalText: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    color: '#787878',
    letterSpacing: 0.1,
    paddingHorizontal: 12,
    alignSelf: 'center',
    maxWidth: 320,
  },
});

