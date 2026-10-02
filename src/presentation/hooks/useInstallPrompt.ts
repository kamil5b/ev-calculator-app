import { useCallback, useEffect, useState } from 'preact/hooks';

/**
 * Chromium's `beforeinstallprompt` event. Not part of the DOM lib typings
 * because it is non-standard, so the slice we use is declared here.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** What {@link useInstallPrompt} hands back to its caller. */
export interface UseInstallPrompt {
  /** `true` while the browser has an install prompt ready to show. */
  readonly canInstall: boolean;
  install: () => Promise<void>;
}

/**
 * Exposes the browser's PWA install prompt so the app can offer its own
 * "Install" button instead of relying on Chrome's mini-infobar, which Chrome
 * suppresses for months after a dismissal or uninstall.
 *
 * `canInstall` stays `false` on browsers without the event (Safari, Firefox)
 * and once the app is installed, so the button simply never appears there.
 */
export function useInstallPrompt(): UseInstallPrompt {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Keep Chrome's own infobar from showing; the button replaces it.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferred === null) return;
    await deferred.prompt();
    await deferred.userChoice;
    // A prompt can only be shown once; the browser fires a fresh
    // `beforeinstallprompt` if the app becomes installable again.
    setDeferred(null);
  }, [deferred]);

  return { canInstall: deferred !== null, install };
}
