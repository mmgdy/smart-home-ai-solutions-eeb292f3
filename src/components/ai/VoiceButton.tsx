import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  isDisabled?: boolean;
  className?: string;
  lang?: string;
}

export function VoiceButton({ onTranscript, isDisabled, className, lang = 'ar-EG' }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) onTranscript(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onTranscript, lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

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
      title={isListening ? 'Stop recording' : 'Voice input'}
    >
      {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </Button>
  );
}

// --- Improved text-to-speech ---------------------------------------------
// Picks the most natural available voice for the requested language.
// Browsers ship higher quality voices (e.g. "Google", "Microsoft Natural",
// "Apple Enhanced/Siri") — we prefer those over the basic default.

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) {
      cachedVoices = v;
      return resolve(v);
    }
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
  });
}

function pickBestVoice(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const langPrefix = lang.split('-')[0].toLowerCase();
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (!matching.length) return voices[0];

  // Priority: Apple "Enhanced"/Siri > Microsoft "Natural" > Google > anything matching
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

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

export function speakText(text: string, lang: string = 'ar-EG') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Strip markdown / shorten for a more natural read
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_#`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 600);

  if (!clean) return;

  if (!voicesReady) voicesReady = loadVoices();

  voicesReady.then((voices) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    const voice = pickBestVoice(lang, voices.length ? voices : cachedVoices);
    if (voice) utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Hook for components that want to know when voices are ready
export function useVoicesReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!voicesReady) voicesReady = loadVoices();
    voicesReady.then(() => setReady(true));
  }, []);
  return ready;
}
