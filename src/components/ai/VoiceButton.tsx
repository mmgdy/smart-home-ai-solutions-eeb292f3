import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/config';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  isDisabled?: boolean;
  className?: string;
  lang?: string;
}

export type SpeakingStatus = 'idle' | 'loading' | 'playing';
export interface SpeakingState {
  status: SpeakingStatus;
  id: string | null;
}

type SpeakingListener = (state: SpeakingState) => void;

const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/tts-speak`;
const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let sharedAudio: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;
let activeController: AbortController | null = null;
let activeRequestId = 0;
let speakingState: SpeakingState = { status: 'idle', id: null };
const listeners = new Set<SpeakingListener>();

function setSpeakingState(next: SpeakingState) {
  speakingState = next;
  listeners.forEach((fn) => {
    try {
      fn(next);
    } catch {
      // Ignore subscriber callback errors
    }
  });
}

export function subscribeSpeakingState(listener: SpeakingListener): () => void {
  listeners.add(listener);
  listener(speakingState);
  return () => {
    listeners.delete(listener);
  };
}

function revokeBlobUrl() {
  if (currentBlobUrl) {
    try {
      URL.revokeObjectURL(currentBlobUrl);
    } catch {
      // Ignore revoke errors
    }
    currentBlobUrl = null;
  }
}

function ensureSharedAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = 'auto';
  }
  return sharedAudio;
}

export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  const audio = ensureSharedAudio();
  if (!audio) return;
  const reqIdSnapshot = activeRequestId;
  try {
    audio.muted = true;
    audio.src = SILENT_WAV;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          if (activeRequestId === reqIdSnapshot && speakingState.status === 'idle') {
            audio.pause();
            audio.muted = false;
          }
        })
        .catch(() => {
          if (activeRequestId === reqIdSnapshot) {
            audio.muted = false;
          }
        });
    } else {
      audio.muted = false;
    }
  } catch {
    audio.muted = false;
  }
}

export function stopSpeaking() {
  activeRequestId += 1;

  if (activeController) {
    try {
      activeController.abort();
    } catch {
      // Ignore abort errors
    }
    activeController = null;
  }

  if (sharedAudio) {
    try {
      sharedAudio.onplay = null;
      sharedAudio.onended = null;
      sharedAudio.onerror = null;
      sharedAudio.pause();
      sharedAudio.currentTime = 0;
      sharedAudio.removeAttribute('src');
      sharedAudio.load();
      sharedAudio.muted = false;
    } catch {
      // Ignore audio reset errors
    }
  }

  revokeBlobUrl();

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore speechSynthesis cancel errors
    }
  }

  setSpeakingState({ status: 'idle', id: null });
}

export function VoiceButton({ onTranscript, isDisabled, className, lang = 'ar-EG' }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const { isRTL } = useLanguage();

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore cleanup errors
      }
      recognitionRef.current = null;
    };
  }, []);

  const showMicError = useCallback(
    (code: string) => {
      let title = isRTL ? 'تعذر استخدام الميكروفون' : 'Microphone Unavailable';
      let description = isRTL
        ? 'حدث خطأ أثناء الإدخال الصوتي. حاول مرة أخرى.'
        : 'Voice input failed. Please try again.';

      if (code === 'unsupported') {
        title = isRTL ? 'المتصفح لا يدعم الإدخال الصوتي' : 'Voice Input Unsupported';
        description = isRTL
          ? 'يرجى استخدام متصفح Chrome أو Edge أو Safari لاستخدام الميكروفون.'
          : 'Please use Chrome, Edge, or Safari to use voice input.';
      } else if (code === 'not-allowed' || code === 'service-not-allowed') {
        title = isRTL ? 'صلاحية الميكروفون مرفوضة' : 'Microphone Permission Blocked';
        description = isRTL
          ? 'اسمح بالوصول إلى الميكروفون من إعدادات المتصفح ثم حاول مرة أخرى.'
          : 'Please allow microphone access in your browser settings and try again.';
      } else if (code === 'audio-capture') {
        title = isRTL ? 'لا يوجد ميكروفون متصل' : 'No Microphone Detected';
        description = isRTL
          ? 'تأكد من توصيل الميكروفون وتشغيله على جهازك.'
          : 'No working microphone was detected on this device.';
      } else if (code === 'no-speech') {
        title = isRTL ? 'لم يتم سماع صوت' : 'No Speech Detected';
        description = isRTL
          ? 'اضغط على زر الميكروفون وتحدث بوضوح.'
          : 'Tap the mic button and speak clearly.';
      } else if (code === 'network') {
        title = isRTL ? 'مشكلة في الاتصال بالصوت' : 'Voice Network Error';
        description = isRTL
          ? 'تعذر الاتصال بخدمة التعرف الصوتي. تحقق من الإنترنت.'
          : 'Could not reach speech recognition service. Check your connection.';
      }

      toast({ variant: 'destructive', title, description });
    },
    [isRTL, toast],
  );

  const startListening = useCallback(() => {
    stopSpeaking();

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      showMicError('unsupported');
      return;
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignore prior instance cleanup
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    let latestTranscript = '';
    let delivered = false;
    let aborted = false;

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0]?.transcript || '';
      }
      latestTranscript = fullTranscript.trim();

      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal && latestTranscript && !delivered) {
        delivered = true;
        onTranscript(latestTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      const code = event?.error || 'unknown';
      setIsListening(false);
      if (code === 'aborted') {
        aborted = true;
        return;
      }
      showMicError(code);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!delivered && !aborted && latestTranscript) {
        delivered = true;
        onTranscript(latestTranscript);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      showMicError('not-allowed');
    }
  }, [onTranscript, lang, showMicError]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
    setIsListening(false);
  }, []);

  const label = isListening
    ? (isRTL ? 'إيقاف التسجيل' : 'Stop recording')
    : (isRTL ? 'إدخال صوتي' : 'Voice input');

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="icon"
      onClick={isListening ? stopListening : startListening}
      disabled={isDisabled}
      className={cn(
        'h-12 w-12 rounded-xl flex-shrink-0 transition-all',
        isListening && 'animate-pulse shadow-[0_0_20px_hsl(var(--destructive))]',
        className
      )}
      title={label}
      aria-label={label}
    >
      {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </Button>
  );
}

// --- Reliable Text-to-Speech (Supabase Edge TTS + Browser Synthesis fallback) ---

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoicesSync(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) cachedVoices = v;
  return v.length ? v : cachedVoices;
}

function pickMatchingVoice(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const langPrefix = lang.split('-')[0].toLowerCase();
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (!matching.length) return undefined;

  const ranked = [...matching].sort((a, b) => score(b) - score(a));
  return ranked[0];

  function score(v: SpeechSynthesisVoice): number {
    const n = v.name.toLowerCase();
    let s = 0;
    if (n.includes('natural')) s += 100;
    if (n.includes('neural')) s += 100;
    if (n.includes('enhanced') || n.includes('premium')) s += 80;
    if (n.includes('siri')) s += 70;
    if (n.includes('google')) s += 60;
    if (n.includes('microsoft')) s += 40;
    if (n.includes('apple')) s += 30;
    if (v.lang.toLowerCase() === lang.toLowerCase()) s += 20;
    if (v.localService) s += 5;
    return s;
  }
}

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/gm, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*_#`~|]/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800);
}

function speakWithBrowserSynthesis(
  clean: string,
  fullLang: string,
  targetId: string,
  reqId: number,
  onError?: (msg: string) => void,
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (reqId === activeRequestId) {
      setSpeakingState({ status: 'idle', id: null });
      onError?.(fullLang.startsWith('ar') ? 'الصوت غير مدعوم في هذا المتصفح.' : 'Audio playback is not supported in this browser.');
    }
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = fullLang;
    const voices = loadVoicesSync();
    const voice = pickMatchingVoice(fullLang, voices);
    if (voice) utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.02;
    utterance.volume = 1;

    utterance.onstart = () => {
      if (reqId === activeRequestId) {
        setSpeakingState({ status: 'playing', id: targetId });
      }
    };
    utterance.onend = () => {
      if (reqId === activeRequestId) {
        setSpeakingState({ status: 'idle', id: null });
      }
    };
    utterance.onerror = (ev) => {
      if (reqId !== activeRequestId) return;
      setSpeakingState({ status: 'idle', id: null });
      const errCode = (ev as any)?.error;
      if (errCode !== 'interrupted' && errCode !== 'canceled') {
        onError?.(fullLang.startsWith('ar') ? 'تعذر تشغيل الصوت. تحقق من إعدادات الصوت.' : 'Could not play audio. Check device sound settings.');
      }
    };

    window.speechSynthesis.speak(utterance);

    if (reqId === activeRequestId && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      setSpeakingState({ status: 'playing', id: targetId });
    }

    // Watchdog so button cannot stay stuck if browser speechSynthesis silently drops the utterance
    window.setTimeout(() => {
      if (
        reqId === activeRequestId &&
        speakingState.status !== 'idle' &&
        !window.speechSynthesis.speaking &&
        !window.speechSynthesis.pending
      ) {
        setSpeakingState({ status: 'idle', id: null });
      }
    }, 1500);
  } catch {
    if (reqId === activeRequestId) {
      setSpeakingState({ status: 'idle', id: null });
      onError?.(fullLang.startsWith('ar') ? 'تعذر تشغيل الصوت.' : 'Could not play audio.');
    }
  }
}

export async function speakText(
  text: string,
  lang: string = 'ar-EG',
  options?: { id?: string; onError?: (msg: string) => void },
): Promise<void> {
  if (typeof window === 'undefined') return;

  const clean = cleanTextForSpeech(text);
  if (!clean) return;

  stopSpeaking();
  const reqId = ++activeRequestId;
  const targetId = options?.id ?? 'default';
  const hasArabic = /[\u0600-\u06FF]/.test(clean);
  const shortLang = hasArabic ? 'ar' : (lang.toLowerCase().startsWith('ar') ? 'ar' : 'en');
  const fullLang = shortLang === 'ar' ? 'ar-EG' : 'en-US';

  setSpeakingState({ status: 'loading', id: targetId });

  const controller = new AbortController();
  activeController = controller;
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: clean, lang: shortLang }),
    });

    window.clearTimeout(timeoutId);
    if (reqId !== activeRequestId) return;
    if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);

    const data = await res.json();
    if (reqId !== activeRequestId) return;
    if (!data?.audio) throw new Error('Missing audio payload');

    const binary = atob(data.audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);
    if (reqId !== activeRequestId) {
      URL.revokeObjectURL(blobUrl);
      return;
    }

    const audio = ensureSharedAudio();
    if (!audio) {
      URL.revokeObjectURL(blobUrl);
      throw new Error('Audio element unavailable');
    }

    revokeBlobUrl();
    currentBlobUrl = blobUrl;
    audio.muted = false;
    audio.src = blobUrl;

    audio.onplay = () => {
      if (reqId === activeRequestId) {
        setSpeakingState({ status: 'playing', id: targetId });
      }
    };
    audio.onended = () => {
      if (reqId !== activeRequestId) return;
      revokeBlobUrl();
      setSpeakingState({ status: 'idle', id: null });
    };
    audio.onerror = () => {
      if (reqId !== activeRequestId) return;
      revokeBlobUrl();
      speakWithBrowserSynthesis(clean, fullLang, targetId, reqId, options?.onError);
    };

    await audio.play();
    if (reqId === activeRequestId && speakingState.status === 'loading') {
      setSpeakingState({ status: 'playing', id: targetId });
    }
  } catch {
    window.clearTimeout(timeoutId);
    if (reqId !== activeRequestId) return;
    speakWithBrowserSynthesis(clean, fullLang, targetId, reqId, options?.onError);
  } finally {
    if (activeController === controller) {
      activeController = null;
    }
  }
}

export function useVoicesReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const v = window.speechSynthesis.getVoices();
    if (v.length) {
      cachedVoices = v;
      setReady(true);
    }
    const prev = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = (ev) => {
      cachedVoices = window.speechSynthesis.getVoices();
      setReady(true);
      if (typeof prev === 'function') prev.call(window.speechSynthesis, ev);
    };
  }, []);
  return ready;
}
