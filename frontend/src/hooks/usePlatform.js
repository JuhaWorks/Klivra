import { useMemo } from 'react';

/**
 * usePlatform Hook
 * Provides OS-level intelligence for shortcuts and UI behavior.
 */
export function usePlatform() {
    const platform = useMemo(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        
        const isMac = /macintosh|mac os x/.test(ua);
        const isWindows = /windows/.test(ua);
        const isIOS = /iphone|ipad|ipod/.test(ua);
        const isAndroid = /android/.test(ua);
        const isMobile = isIOS || isAndroid;

        return {
            isMac,
            isWindows,
            isMobile,
            isDesktop: !isMobile,
            // Prefix for keyboard shortcuts
            shortcutPrefix: isMac ? '⌘' : 'Ctrl',
            shortcutKey: isMac ? 'metaKey' : 'ctrlKey',
            // OS Name for specific CSS classes or analytics
            os: isMac ? 'mac' : isWindows ? 'windows' : 'other'
        };
    }, []);

    return platform;
}
