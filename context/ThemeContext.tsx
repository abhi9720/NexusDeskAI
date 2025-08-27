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
                            pageBackgroundLight: colors.pageBackgroundLight || colors.brandLight || '#F9FAFB',
                            containerBackgroundLight: colors.containerBackgroundLight || colors.sidebarLight || '#F5F5F7',
                            cardBackgroundLight: colors.cardBackgroundLight || colors.cardLight || '#FFFFFF',
                            pageBackgroundDark: colors.pageBackgroundDark || colors.brandDark || '#1F2937',
                            containerBackgroundDark: colors.containerBackgroundDark || colors.sidebarDark || '#111827',
                            cardBackgroundDark: colors.cardBackgroundDark || colors.cardDark || '#1F2937'
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

        const applyMode = () => {
            const isDarkMode = themeMode === 'dark' || 
                               (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            root.classList.toggle('dark', isDarkMode);
        };
        
        applyMode();

        const activeTheme = activeThemeId === 'default' 
            ? null 
            : customThemes.find(t => t.id === activeThemeId);
        
        const vars = ['--color-primary', '--color-primary-light', '--color-primary-dark', '--color-page', '--color-container', '--color-card', '--color-page-dark', '--color-container-dark', '--color-card-dark'];
        vars.forEach(v => root.style.removeProperty(v));

        if (activeTheme) {
            const { colors } = activeTheme;
            const primaryHsl = hexToHsl(colors.primary);
            if (primaryHsl) {
                 const primaryLightHsl = adjustHslLightness(primaryHsl, 10);
                 const primaryDarkHsl = adjustHslLightness(primaryHsl, -10);
                 root.style.setProperty('--color-primary', `${primaryHsl[0]} ${primaryHsl[1]}% ${primaryHsl[2]}%`);
                 root.style.setProperty('--color-primary-light', `${primaryLightHsl[0]} ${primaryLightHsl[1]}% ${primaryLightHsl[2]}%`);
                 root.style.setProperty('--color-primary-dark', `${primaryDarkHsl[0]} ${primaryDarkHsl[1]}% ${primaryDarkHsl[2]}%`);
            }
            const colorMap = {
                '--color-page': colors.pageBackgroundLight,
                '--color-container': colors.containerBackgroundLight,
                '--color-card': colors.cardBackgroundLight,
                '--color-page-dark': colors.pageBackgroundDark,
                '--color-container-dark': colors.containerBackgroundDark,
                '--color-card-dark': colors.cardBackgroundDark,
            };

            for (const [prop, hex] of Object.entries(colorMap)) {
                const hsl = hexToHsl(hex);
                if (hsl) {
                    root.style.setProperty(prop, `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`);
                }
            }
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = () => {
            if (themeMode === 'system') {
                applyMode();
            }
        };

        mediaQuery.addEventListener('change', handleSystemThemeChange);
        
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
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