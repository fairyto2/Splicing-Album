import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.splicyalbum.app',
  appName: 'Splicing Album',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
