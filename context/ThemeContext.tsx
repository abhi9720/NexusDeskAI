import * as React from 'react';
import { ThemeMode, CustomTheme } from '../types';

// --- Color Utils ---
const hexToHsl = (hex: string): [number, number, number] | null => {
    if (!hex || hex.length < 4) return null;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    } else {
        return null;
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, l * 100];
};

const adjustHslLightness = (hsl: [number, number, number], amount: number): [number, number, number] => {
    const [h, s, l] = hsl;
    let newL = l + amount;
    newL = Math.max(0, Math.min(100, newL));
    return [h, s, newL];
};

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    activeThemeId: string; // 'default' or custom theme ID
    setActiveThemeId: (id: string) => void;
    customThemes: CustomTheme[];
    setCustomThemes: (themes: CustomTheme[]) => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [themeMode, rawSetThemeMode] = React.useState<ThemeMode>('system');
    const [activeThemeId, rawSetActiveThemeId] = React.useState<string>('default');
    const [customThemes, rawSetCustomThemes] = React.useState<CustomTheme[]>([]);

    React.useEffect(() => {
        const savedMode = localStorage.getItem('themeMode') as ThemeMode | null;
        const savedThemeId = localStorage.getItem('activeThemeId') as string | null;
        const savedCustomThemes = localStorage.getItem('customThemes');
        
        if (savedMode) rawSetThemeMode(savedMode);
        if (savedThemeId) rawSetActiveThemeId(savedThemeId);
        if (savedCustomThemes) {
            try {
                const parsed = JSON.parse(savedCustomThemes);
                // Migration logic for backward compatibility with older theme structure
                const migratedThemes = parsed.map((theme: any) => {
                    const colors = theme.colors || {};
                    return {
                        ...theme,
                        colors: {
                            primary: colors.primary || '#8b64fd',
                            brandLight: colors.brandLight || '#F9FAFB',
                            sidebarLight: colors.sidebarLight || '#F5F5F7',
                            cardLight: colors.cardLight || '#FFFFFF',
                            brandDark: colors.brandDark || '#1F2937',
                            sidebarDark: colors.sidebarDark || '#111827',
                            cardDark: colors.cardDark || colors.brandDark || '#1F2937' // Fallback to old brandDark for compatibility
                        }
                    };
                });
                rawSetCustomThemes(migratedThemes);
            } catch (e) {
                console.error("Failed to parse custom themes from localStorage", e);
            }
        }
    }, []);

    const setThemeMode = (newMode: ThemeMode) => {
        rawSetThemeMode(newMode);
        localStorage.setItem('themeMode', newMode);
    };

    const setActiveThemeId = (id: string) => {
        rawSetActiveThemeId(id);
        localStorage.setItem('activeThemeId', id);
    };

    const setCustomThemes = (themes: CustomTheme[]) => {
        rawSetCustomThemes(themes);
        localStorage.setItem('customThemes', JSON.stringify(themes));
    };

    React.useEffect(() => {
        const root = window.document.documentElement;

        // 1. Apply Mode (light/dark/system)
        const applyMode = () => {
            const isDarkMode = themeMode === 'dark' || 
                               (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (isDarkMode) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };
        
        applyMode();

        // 2. Apply Theme Colors
        const activeTheme = activeThemeId === 'default' 
            ? null 
            : customThemes.find(t => t.id === activeThemeId);
        
        // Clear previous custom theme vars to fall back to defaults
        const vars = ['--color-primary', '--color-primary-light', '--color-primary-dark', '--color-brand-light', '--color-sidebar-light', '--color-card-light', '--color-brand-dark', '--color-sidebar-dark', '--color-card-dark'];
        vars.forEach(v => root.style.removeProperty(v));

        if (activeTheme) {
            const primaryHsl = hexToHsl(activeTheme.colors.primary);
            const brandLightHsl = hexToHsl(activeTheme.colors.brandLight);
            const sidebarLightHsl = hexToHsl(activeTheme.colors.sidebarLight);
            const cardLightHsl = hexToHsl(activeTheme.colors.cardLight);
            const brandDarkHsl = hexToHsl(activeTheme.colors.brandDark);
            const sidebarDarkHsl = hexToHsl(activeTheme.colors.sidebarDark);
            const cardDarkHsl = hexToHsl(activeTheme.colors.cardDark);

            if (primaryHsl) {
                 const primaryLightHsl = adjustHslLightness(primaryHsl, 10);
                 const primaryDarkHsl = adjustHslLightness(primaryHsl, -10);
                 root.style.setProperty('--color-primary', `${primaryHsl[0]} ${primaryHsl[1]}% ${primaryHsl[2]}%`);
                 root.style.setProperty('--color-primary-light', `${primaryLightHsl[0]} ${primaryLightHsl[1]}% ${primaryLightHsl[2]}%`);
                 root.style.setProperty('--color-primary-dark', `${primaryDarkHsl[0]} ${primaryDarkHsl[1]}% ${primaryDarkHsl[2]}%`);
            }
            if (brandLightHsl) root.style.setProperty('--color-brand-light', `${brandLightHsl[0]} ${brandLightHsl[1]}% ${brandLightHsl[2]}%`);
            if (sidebarLightHsl) root.style.setProperty('--color-sidebar-light', `${sidebarLightHsl[0]} ${sidebarLightHsl[1]}% ${sidebarLightHsl[2]}%`);
            if (cardLightHsl) root.style.setProperty('--color-card-light', `${cardLightHsl[0]} ${cardLightHsl[1]}% ${cardLightHsl[2]}%`);
            if (brandDarkHsl) root.style.setProperty('--color-brand-dark', `${brandDarkHsl[0]} ${brandDarkHsl[1]}% ${brandDarkHsl[2]}%`);
            if (sidebarDarkHsl) root.style.setProperty('--color-sidebar-dark', `${sidebarDarkHsl[0]} ${sidebarDarkHsl[1]}% ${sidebarDarkHsl[2]}%`);
            if (cardDarkHsl) root.style.setProperty('--color-card-dark', `${cardDarkHsl[0]} ${cardDarkHsl[1]}% ${cardDarkHsl[2]}%`);
        }

        // 3. Listen for system changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = () => {
            if (themeMode === 'system') {
                applyMode();
            }
        };

        mediaQuery.addEventListener('change', handleSystemThemeChange);
        
        return () => {
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }, [themeMode, activeThemeId, customThemes]);

    return (
        <ThemeContext.Provider value={{ themeMode, setThemeMode, activeThemeId, setActiveThemeId, customThemes, setCustomThemes }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = React.useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};