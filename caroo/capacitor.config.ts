import type { CapacitorConfig } from '@capacitor/cli'

// De Android- en iPhone-app laden de echte Clanoo van clanoo.nl.
// Zo is er maar één Clanoo: wat op de website verandert, staat meteen ook in de app.
const config: CapacitorConfig = {
  appId: 'nl.noinit.clanoo',
  appName: 'Clanoo',
  webDir: 'native/www',
  server: {
    url: 'https://clanoo.nl/dashboard',
    cleartext: false,
    errorPath: 'offline.html',
  },
  // De website herkent de app hieraan (bijvoorbeeld om het betaalscherm te verbergen)
  appendUserAgent: 'ClanooApp',
  backgroundColor: '#FFFFFF',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
