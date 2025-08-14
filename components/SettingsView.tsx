import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../types';
import { SunIcon, MoonIcon, ComputerDesktopIcon, UserCircleIcon, KeyIcon, PaletteIcon, CheckCircleIcon, GithubIcon, LinkedinIcon } from './icons';

interface SettingsViewProps {
  userName: string;
  apiKey: string | null;
  onUpdateUser: (name: string) => void;
  onUpdateApiKey: (key: string) => void;
}

const SettingsView = ({ userName, apiKey, onUpdateUser, onUpdateApiKey }: SettingsViewProps) => {
    const { theme, setTheme } = useTheme();
    const [nameInput, setNameInput] = useState(userName);
    const [keyInput, setKeyInput] = useState(apiKey || '');
    const [showSuccess, setShowSuccess] = useState('');

    useEffect(() => {
        setNameInput(userName);
    }, [userName]);
    
    useEffect(() => {
        setKeyInput(apiKey || '');
    }, [apiKey]);
    
    const handleSave = (type: 'user' | 'api') => {
        if (type === 'user' && nameInput.trim()) {
            onUpdateUser(nameInput.trim());
        }
        if (type === 'api') {
            onUpdateApiKey(keyInput.trim());
        }
        setShowSuccess(type);
        setTimeout(() => setShowSuccess(''), 2000);
    }

    const themeOptions: { value: Theme, label: string, icon: JSX.Element }[] = [
        { value: 'light', label: 'Light', icon: <SunIcon className="w-5 h-5"/> },
        { value: 'dark', label: 'Dark', icon: <MoonIcon className="w-5 h-5"/> },
        { value: 'system', label: 'System', icon: <ComputerDesktopIcon className="w-5 h-5"/> },
    ];
    
    const SettingCard = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode}) => (
        <div className="bg-white dark:bg-sidebar-dark p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
                {icon}
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
            </div>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );

    return (
        <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-brand-light dark:bg-brand-dark flex flex-col">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Settings</h1>
            </header>
            <div className="max-w-5xl mx-auto grid grid-cols-1 gap-8 flex-grow w-full">
                <SettingCard title="Profile" icon={<UserCircleIcon className="w-6 h-6 text-primary" />}>
                     <div>
                        <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
                        <div className="flex items-center gap-4">
                            <input type="text" id="userName" value={nameInput} onChange={e => setNameInput(e.target.value)} className="flex-grow px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary" />
                            <button onClick={() => handleSave('user')} className="px-5 py-2 text-sm bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                                Save
                            </button>
                        </div>
                        {showSuccess === 'user' && <p className="text-sm text-green-600 mt-2 flex items-center gap-1 animate-fade-in"><CheckCircleIcon className="w-4 h-4" /> Name updated successfully!</p>}
                    </div>
                </SettingCard>

                <SettingCard title="API Configuration" icon={<KeyIcon className="w-6 h-6 text-primary" />}>
                     <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gemini API Key</label>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your key is stored locally and securely on your machine.</p>
                        <div className="flex items-center gap-4">
                            <input type="password" id="apiKey" value={keyInput} onChange={e => setKeyInput(e.target.value)} className="flex-grow px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary" placeholder="Enter your key here"/>
                            <button onClick={() => handleSave('api')} className="px-5 py-2 text-sm bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                                Save
                            </button>
                        </div>
                         {showSuccess === 'api' && <p className="text-sm text-green-600 mt-2 flex items-center gap-1 animate-fade-in"><CheckCircleIcon className="w-4 h-4" /> API Key updated successfully!</p>}
                    </div>
                </SettingCard>
                
                 <SettingCard title="Appearance" icon={<PaletteIcon className="w-6 h-6 text-primary" />}>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                        <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                             {themeOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setTheme(option.value)}
                                    className={`w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                                        theme === option.value
                                            ? 'bg-white dark:bg-gray-900 text-primary font-semibold shadow-sm'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-900/50'
                                    }`}
                                >
                                    {option.icon}
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                 </SettingCard>
            </div>
            <footer className="mt-12 text-center text-xs text-gray-500 dark:text-gray-400">
                 <div className="flex justify-center items-center space-x-2">
                    <span>Built by <a href="https://github.com/abhi9720" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">abhi9720</a></span>
                    <a href="https://github.com/abhi9720" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors" aria-label="GitHub">
                        <GithubIcon className="w-4 h-4" />
                    </a>
                    <a href="https://www.linkedin.com/in/abhi9720/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors" aria-label="LinkedIn">
                        <LinkedinIcon className="w-4 h-4" />
                    </a>
                </div>
            </footer>
        </div>
    )
};

export default SettingsView;