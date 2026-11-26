import { useEffect, useState } from 'react';

interface MotionPreferences {
  reducedMotion: boolean;
  isTouchDevice: boolean;
  shouldAutoPlay: boolean;
}

function readMatch(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(query).matches;
}

export function useMotionPreferences(): MotionPreferences {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    readMatch('(prefers-reduced-motion: reduce)'),
  );
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() =>
    readMatch('(hover: none), (pointer: coarse)'),
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerMq = window.matchMedia('(hover: none), (pointer: coarse)');

    const syncMotion = () => setReducedMotion(motionMq.matches);
    const syncPointer = () => setIsTouchDevice(pointerMq.matches);

    syncMotion();
    syncPointer();

    motionMq.addEventListener('change', syncMotion);
    pointerMq.addEventListener('change', syncPointer);

    return () => {
      motionMq.removeEventListener('change', syncMotion);
      pointerMq.removeEventListener('change', syncPointer);
    };
  }, []);

  return {
    reducedMotion,
    isTouchDevice,
    shouldAutoPlay: !reducedMotion && isTouchDevice,
  };
}
