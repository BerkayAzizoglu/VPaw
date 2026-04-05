const appJson = require('./app.json');

const baseExpoConfig = appJson.expo ?? {};
const iosBaseConfig = baseExpoConfig.ios ?? {};
const androidBaseConfig = baseExpoConfig.android ?? {};

const iosBundleIdentifier = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || 'com.virnelo.vpaw';
const androidPackage = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'com.virnelo.vpaw';
const sharedGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const iosGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS || sharedGoogleMapsApiKey;
const androidGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID || sharedGoogleMapsApiKey;

module.exports = () => ({
  expo: {
    ...baseExpoConfig,
    ios: {
      ...iosBaseConfig,
      bundleIdentifier: iosBundleIdentifier,
      config: {
        ...(iosBaseConfig.config ?? {}),
        ...(iosGoogleMapsApiKey ? { googleMapsApiKey: iosGoogleMapsApiKey } : {}),
      },
    },
    android: {
      ...androidBaseConfig,
      package: androidPackage,
      config: {
        ...(androidBaseConfig.config ?? {}),
        googleMaps: {
          ...((androidBaseConfig.config ?? {}).googleMaps ?? {}),
          ...(androidGoogleMapsApiKey ? { apiKey: androidGoogleMapsApiKey } : {}),
        },
      },
    },
  },
});
