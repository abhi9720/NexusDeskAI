import React, { createContext, useState, useEffect, useContext } from 'react';
import { Theme } from '../types';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<Theme>('system');

    useEffect(() => {
        const fetchTheme = async () => {
            const savedTheme = await window.electronStore.get('theme') as Theme | null;
            if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
                setTheme(savedTheme);
            }
        };
        fetchTheme();
    }, []);

    useEffect(() => {
        window.electronStore.set('theme', theme);
        const root = window.document.documentElement;
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleSystemThemeChange = (e: MediaQueryListEvent) => {
            if (theme === 'system') {
                if (e.matches) {
                    root.classList.add('dark');
                } else {
                    root.classList.remove('dark');
                }
            }
        };

        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else { // 'system'
            if (mediaQuery.matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
            mediaQuery.addEventListener('change', handleSystemThemeChange);
        }
        
        return () => {
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};