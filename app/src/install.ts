export type InstallPlatform = 'standalone' | 'ios-safari' | 'ios-other' | 'android' | 'desktop';

/**
 * 설치 안내를 고를 기기 판별(Design Review D7).
 * iOS는 Safari에서만 "홈 화면에 추가"가 되므로 Chrome(CriOS)·Firefox(FxiOS)·카카오톡 같은 인앱 브라우저를 구분한다.
 */
export function detectPlatform(ua: string, standalone: boolean, maxTouchPoints = 0): InstallPlatform {
  if (standalone) return 'standalone';
  // iPadOS 13+ Safari는 데스크톱 Mac UA를 쓰므로 터치 지원으로 구분한다.
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (isIOS) {
    const inApp = /CriOS|FxiOS|EdgiOS|KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(ua);
    const safari = /Safari\//.test(ua) && !inApp;
    return safari ? 'ios-safari' : 'ios-other';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/** Android Chrome의 설치 이벤트를 앱 시작 시 잡아 두었다가 설정 화면의 [앱 설치] 버튼에서 쓴다. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((l) => l());
  });
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const p = deferredPrompt;
  deferredPrompt = null;
  await p.prompt();
  const { outcome } = await p.userChoice;
  listeners.forEach((l) => l());
  return outcome === 'accepted';
}

export function onInstallPromptChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
