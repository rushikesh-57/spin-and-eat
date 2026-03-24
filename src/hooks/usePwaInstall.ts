import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
};

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (next: MediaQueryListEvent) => {
      setIsInstalled(next.matches);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const canInstall = useMemo(
    () => Boolean(installPrompt) && !isInstalled,
    [installPrompt, isInstalled]
  );

  const promptInstall = async () => {
    if (!installPrompt) {
      return false;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
      return true;
    }

    return false;
  };

  return {
    canInstall,
    isInstalled,
    promptInstall,
  };
}
