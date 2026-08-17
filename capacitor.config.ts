import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mywaves.app',
  appName: 'myWaves',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      // Silhouette blanche du logo bateau (voir scripts/generate-notification-icon.mjs) —
      // Android impose ce style pour l'icône de la barre de statut, retinté par le système.
      smallIcon: 'ic_stat_ship',
      iconColor: '#0077b6',
    },
  },
};

export default config;
