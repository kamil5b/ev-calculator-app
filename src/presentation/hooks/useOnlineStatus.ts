import { useEffect, useState } from 'preact/hooks';

/**
 * Live `navigator.onLine` flag (ACTUAL_PLACE_PLANNING §6).
 *
 * SSR-safe (assumes online when `navigator` is absent, matching the
 * server-rendered markup) and re-rendered by the window `online`/`offline`
 * events, so the "plan with actual place" toggle appears and disappears with
 * the connection.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
