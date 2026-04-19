import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ── Sunucu IP'nizi buraya yazın ──────────────────────────────────────────
// Bilgisayarınızın yerel ağ IP adresi (ipconfig ile bulabilirsiniz)
const SERVER_IP = '192.168.1.187';
// ─────────────────────────────────────────────────────────────────────────

const getBaseUrl = () => {
  if (__DEV__) {
    // Expo Go ile fiziksel cihazda çalışıyorsa debuggerHost'tan IP al
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      return `http://${ip}:8080`;
    }
    // Fallback: emülatör/simülatör
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8080';
    }
    return 'http://localhost:8080';
  }

  // Release (APK) build — fiziksel cihazda localhost erişilemez,
  // sunucunun LAN IP'sini kullan
  return `http://${SERVER_IP}:8080`;
};

export const API_BASE_URL = getBaseUrl();
export const API_TIMEOUT = 30000;
