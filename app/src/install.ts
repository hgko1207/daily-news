export type InstallPlatform = 'standalone' | 'ios-safari' | 'ios-other' | 'android' | 'samsung' | 'desktop';

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
  // 삼성 인터넷은 메뉴가 아래쪽(≡)이라 Chrome 안내(오른쪽 위 ⋮)와 따로 안내한다.
  if (/Android/i.test(ua)) return /SamsungBrowser/i.test(ua) ? 'samsung' : 'android';
  return 'desktop';
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __installPrompt?: BeforeInstallPromptEvent | null;
  }
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/**
 * Android Chrome의 설치 이벤트를 [앱 설치] 버튼에서 쓴다.
 * 이벤트는 앱 JS가 뜨기 전에 올 수 있어 index.html의 인라인 스크립트가 먼저 잡아 window.__installPrompt에 둔다.
 */
export function captureInstallPrompt() {
  deferredPrompt = window.__installPrompt ?? null;
  window.addEventListener('installprompt-ready', () => {
    deferredPrompt = window.__installPrompt ?? null;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.__installPrompt = null;
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
  window.__installPrompt = null;
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
