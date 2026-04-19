import { useState, useCallback, useRef, useEffect } from 'react';

// expo-speech-recognition requires a native build (dev client / APK).
// In Expo Go the native module doesn't exist, so we guard the import
// to prevent a fatal crash. Voice features will simply be unavailable.
//
// CRITICAL: we do NOT use the library's `useSpeechRecognitionEvent` hook at
// component top-level, because if its internal NativeEventEmitter fails at
// render time it will crash the whole screen (observed on release APK when
// navigating to screens that import this hook). Instead, we subscribe in a
// useEffect wrapped in try/catch, so any runtime failure gracefully degrades
// to "voice disabled" rather than taking down the screen.
let ExpoSpeechRecognitionModule = null;
let moduleLoadOk = false;

try {
  const mod = require('expo-speech-recognition');
  if (mod && mod.ExpoSpeechRecognitionModule) {
    ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
    moduleLoadOk = true;
  }
} catch {
  // Native module not available (Expo Go) — voice features disabled
}

/**
 * Safely add a listener on the native module. Returns a cleanup function
 * (or a no-op cleanup on failure).
 */
function safeAddListener(eventName, handler) {
  if (!moduleLoadOk || !ExpoSpeechRecognitionModule) return () => {};
  try {
    const sub = ExpoSpeechRecognitionModule.addListener?.(eventName, handler);
    if (sub && typeof sub.remove === 'function') {
      return () => { try { sub.remove(); } catch {} };
    }
    return () => {};
  } catch {
    return () => {};
  }
}

/**
 * React Native hook for voice-to-text using expo-speech-recognition.
 * Uses the device's native speech recognition engine.
 * Gracefully degrades when the native module isn't reachable
 * (isAvailable = false, no crash).
 *
 * @param {Object} options
 * @param {string} options.lang - Dil kodu (varsayılan: 'tr-TR')
 * @param {function} options.onResult - Her tanınan metin parçası için callback
 * @param {function} options.onError - Hata callback'i
 */
export default function useVoiceInput({ lang = 'tr-TR', onResult, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Cihazda speech recognition var mı kontrol et
  useEffect(() => {
    if (!moduleLoadOk || !ExpoSpeechRecognitionModule) return;
    let cancelled = false;
    try {
      const p = ExpoSpeechRecognitionModule.isRecognitionAvailable?.();
      if (p && typeof p.then === 'function') {
        p.then((available) => { if (!cancelled) setIsAvailable(!!available); })
         .catch(() => { if (!cancelled) setIsAvailable(false); });
      } else {
        setIsAvailable(!!p);
      }
    } catch {
      if (!cancelled) setIsAvailable(false);
    }
    return () => { cancelled = true; };
  }, []);

  // Subscribe to native events — wrapped in try/catch so a broken native
  // module can never crash the screen during mount.
  useEffect(() => {
    if (!moduleLoadOk) return;

    const unsubResult = safeAddListener('result', (event) => {
      try {
        if (event?.isFinal && event?.results?.length > 0) {
          const transcript = event.results[0]?.transcript;
          if (transcript && onResultRef.current) {
            onResultRef.current(transcript);
          }
        }
      } catch {}
    });

    const unsubStart = safeAddListener('start', () => {
      try { setIsListening(true); } catch {}
    });

    const unsubEnd = safeAddListener('end', () => {
      try { setIsListening(false); } catch {}
    });

    const unsubError = safeAddListener('error', (event) => {
      try {
        setIsListening(false);
        if (onErrorRef.current) {
          const messages = {
            'not-allowed': 'Mikrofon izni reddedildi. Ayarlardan izin verin.',
            'no-speech': 'Konuşma algılanamadı. Tekrar deneyin.',
            'network': 'Ağ hatası. İnternet bağlantınızı kontrol edin.',
          };
          const code = event?.error;
          onErrorRef.current(messages[code] || `Ses tanıma hatası: ${code ?? 'bilinmiyor'}`);
        }
      } catch {}
    });

    return () => {
      unsubResult();
      unsubStart();
      unsubEnd();
      unsubError();
    };
  }, []);

  // Unmount olursa mikrofonu kesin durdur — aksi halde ekrandan çıkılsa
  // bile native recognizer açık kalabilir (pil + privacy sorunu).
  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule?.stop?.();
      } catch {
        // zaten kapalıysa sessizce geç
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!isAvailable || !ExpoSpeechRecognitionModule) return;

    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result?.granted) {
        onErrorRef.current?.('Mikrofon izni reddedildi. Ayarlardan izin verin.');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: false,
        continuous: false, // Her cümle sonrası durur — daha stabil
      });
    } catch (err) {
      onErrorRef.current?.(
        `Ses tanıma başlatılamadı: ${err?.message || err}`
      );
    }
  }, [isAvailable, lang]);

  const stopListening = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule?.stop?.();
    } catch {
      // zaten kapalıysa sessizce geç
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { isListening, isAvailable, startListening, stopListening, toggleListening };
}
