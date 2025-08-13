import React, { createContext, useState, useEffect, useContext } from 'react';

interface ThemeContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem('darkMode');
            if (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return true;
            }
            return stored === 'true';
        }
        return false;
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', String(isDarkMode));
    }, [isDarkMode]);

    const toggleDarkMode = () => setIsDarkMode(prev => !prev);
    
    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
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