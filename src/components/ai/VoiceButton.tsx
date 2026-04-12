import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  isDisabled?: boolean;
  className?: string;
}

export function VoiceButton({ onTranscript, isDisabled, className }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ar-EG'; // Support Arabic first, then English
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
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "outline"}
      size="icon"
      onClick={isListening ? stopListening : startListening}
      disabled={isDisabled}
      className={cn("h-12 w-12 rounded-xl flex-shrink-0 transition-all", isListening && "animate-pulse", className)}
      title={isListening ? "Stop recording" : "Voice input"}
    >
      {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </Button>
  );
}

// Text-to-speech for AI responses
export function speakText(text: string, lang: string = 'ar-EG') {
  if (!('speechSynthesis' in window)) return;
  
  window.speechSynthesis.cancel();
  
  // Clean markdown from text
  const clean = text
    .replace(/[*_#`~\[\]()]/g, '')
    .replace(/\n+/g, '. ')
    .substring(0, 500);
  
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  
  window.speechSynthesis.speak(utterance);
}
