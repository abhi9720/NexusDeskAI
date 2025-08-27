import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode, CustomTheme, CustomFieldDefinition, CustomFieldType, List, CustomFieldOption } from '../types';
import { SunIcon, MoonIcon, ComputerDesktopIcon, UserCircleIcon, KeyIcon, PaletteIcon, CheckCircleIcon, GithubIcon, LinkedinIcon, PlusIcon, TrashIcon, PencilIcon, XMarkIcon, ListBulletIcon } from './icons';

const newId = () => Date.now() + Math.floor(Math.random() * 1000);

// Add/Edit Theme Modal (Inlined)
const AddThemeModal = ({ isOpen, onClose, onSave, themeToEdit }: { isOpen: boolean, onClose: () => void, onSave: (theme: CustomTheme) => void, themeToEdit: CustomTheme | null }) => {
    const [name, setName] = useState('');
    const [colors, setColors] = useState<CustomTheme['colors']>({
        primary: '#8b64fd',
        pageBackgroundLight: '#F9FAFB',
        containerBackgroundLight: '#F5F5F7',
        cardBackgroundLight: '#FFFFFF',
        pageBackgroundDark: '#1F2937',
        containerBackgroundDark: '#111827',
        cardBackgroundDark: '#1F2937',
    });

    useEffect(() => {
        if (themeToEdit) {
            setName(themeToEdit.name);
            setColors(themeToEdit.colors);
        } else {
            setName('');
            setColors({
                primary: '#8b64fd',
                pageBackgroundLight: '#F9FAFB',
                containerBackgroundLight: '#F5F5F7',
                cardBackgroundLight: '#FFFFFF',
                pageBackgroundDark: '#1F2937',
                containerBackgroundDark: '#111827',
                cardBackgroundDark: '#1F2937',
            });
        }
    }, [themeToEdit]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSave({ id: themeToEdit?.id || uuidv4(), name, colors });
        onClose();
    };

    const handleColorChange = (field: keyof CustomTheme['colors'], value: string) => {
        setColors(prev => ({ ...prev, [field]: value }));
    };

    const colorFields: (keyof CustomTheme['colors'])[] = ['primary', 'pageBackgroundLight', 'containerBackgroundLight', 'cardBackgroundLight', 'pageBackgroundDark', 'containerBackgroundDark', 'cardBackgroundDark'];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">{themeToEdit ? 'Edit' : 'Create'} Custom Theme</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Theme Name" value={name} onChange={e => setName(e.target.value)} className="w-full form-input rounded-md bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-primary" />
                    {colorFields.map((key) => (
                        <div key={key} className="flex items-center justify-between">
                            <label className="capitalize text-sm">{key.replace(/([A-Z])/g, ' $1')}</label>
                            <input type="color" value={colors[key]} onChange={e => handleColorChange(key, e.target.value)} className="w-16 h-8 p-0 border-none rounded-md" />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-600">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 text-sm rounded-md bg-primary text-white">Save</button>
                </div>
            </div>
        </div>
    );
};

// Add/Edit Custom Field Modal (Inlined)
const AddCustomFieldModal = ({ isOpen, onClose, onSave, fieldToEdit, lists }: { isOpen: boolean, onClose: () => void, onSave: (field: CustomFieldDefinition) => void, fieldToEdit: CustomFieldDefinition | null, lists: List[] }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<CustomFieldType>('text');
    const [listId, setListId] = useState<number | null>(null);
    const [options, setOptions] = useState<CustomFieldOption[]>([]);
    const [newOption, setNewOption] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            if(fieldToEdit) {
                setName(fieldToEdit.name);
                setType(fieldToEdit.type);
                setListId(fieldToEdit.listId);
                setOptions(fieldToEdit.options || []);
            } else {
                setName('');
                setType('text');
                setListId(null);
                setOptions([]);
            }
            setNewOption('');
        }
    }, [isOpen, fieldToEdit]);

    if (!isOpen) return null;
    
    const handleAddOption = () => {
        if (newOption.trim()) {
            setOptions([...options, { id: newId(), value: newOption.trim() }]);
            setNewOption('');
        }
    };
    
    const handleSave = () => {
        if (!name.trim()) return;
        const finalOptions = type === 'select' ? options.filter(o => o.value.trim() !== '') : undefined;
        onSave({ id: fieldToEdit?.id || newId(), name, type, listId, options: finalOptions });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">{fieldToEdit ? 'Edit' : 'Create'} Custom Field</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Field Name" value={name} onChange={e => setName(e.target.value)} className="w-full form-input rounded-md bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-primary" />
                    <select value={type} onChange={e => setType(e.target.value as CustomFieldType)} className="w-full form-select rounded-md bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-primary">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                    </select>
                    <select value={listId === null ? 'global' : listId} onChange={e => setListId(e.target.value === 'global' ? null : Number(e.target.value))} className="w-full form-select rounded-md bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-primary">
                        <option value="global">Global (all task lists)</option>
                        {lists.filter(l => l.type === 'task').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    {type === 'select' && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options</label>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                {options.map((option, index) => (
                                    <div key={option.id} className="flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            value={option.value} 
                                            onChange={(e) => {
                                                const newOptions = [...options];
                                                newOptions[index] = { ...newOptions[index], value: e.target.value };
                                                setOptions(newOptions);
                                            }}
                                            className="w-full form-input rounded-md bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-primary text-sm"
                                        />
                                        <button type="button" onClick={() => {
                                            setOptions(options.filter(o => o.id !== option.id));
                                        }} className="p-1 text-red-500 hover:text-red-700 flex-shrink-0">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <input 
                                    type="text" 
                                    placeholder="New option name" 
                                    value={newOption}
                                    onChange={(e) => setNewOption(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddOption();
                                        }
                                    }}
                                    className="w-full form-input rounded-md bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-primary text-sm"
                                />
                                <button type="button" onClick={handleAddOption} className="p-2 bg-primary text-white rounded-md hover:bg-primary-dark flex-shrink-0">
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-600">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm rounded-md bg-primary text-white">Save</button>
                </div>
            </div>
        </div>
    );
};

const SettingCard = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
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

interface SettingsViewProps {
  userName: string;
  apiKey: string | null;
  onUpdateUser: (name: string) => void;
  onUpdateApiKey: (key: string) => void;
  customFieldDefinitions: CustomFieldDefinition[];
  setCustomFieldDefinitions: (definitions: CustomFieldDefinition[]) => void;
  lists: List[];
}

const SettingsView = ({ userName, apiKey, onUpdateUser, onUpdateApiKey, customFieldDefinitions, setCustomFieldDefinitions, lists }: SettingsViewProps) => {
    const { themeMode, setThemeMode, activeThemeId, setActiveThemeId, customThemes, setCustomThemes } = useTheme();
    const [nameInput, setNameInput] = useState(userName);
    const [keyInput, setKeyInput] = useState(apiKey || '');
    const [showSuccess, setShowSuccess] = useState('');
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
    const [themeToEdit, setThemeToEdit] = useState<CustomTheme | null>(null);
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [fieldToEdit, setFieldToEdit] = useState<CustomFieldDefinition | null>(null);
    
    const predefinedThemes: { name: string, colors: CustomTheme['colors'] }[] = [
        { name: 'Forest', colors: { primary: '#22C55E', pageBackgroundLight: '#F0FDF4', containerBackgroundLight: '#EBF7F0', cardBackgroundLight: '#FFFFFF', pageBackgroundDark: '#14532D', containerBackgroundDark: '#052E16', cardBackgroundDark: '#1E402D' } },
        { name: 'Ocean', colors: { primary: '#06B6D4', pageBackgroundLight: '#ECFEFF', containerBackgroundLight: '#E0FCFF', cardBackgroundLight: '#FFFFFF', pageBackgroundDark: '#164E63', containerBackgroundDark: '#083344', cardBackgroundDark: '#1E495A' } },
        { name: 'Rose', colors: { primary: '#F472B6', pageBackgroundLight: '#FFF1F2', containerBackgroundLight: '#FFE4E6', cardBackgroundLight: '#FFFFFF', pageBackgroundDark: '#831843', containerBackgroundDark: '#500724', cardBackgroundDark: '#7A1C43' } },
        { name: 'Twilight', colors: { primary: '#4B49AC', pageBackgroundLight: '#F4F6FC', containerBackgroundLight: '#E8EBF5', cardBackgroundLight: '#FFFFFF', pageBackgroundDark: '#191B28', containerBackgroundDark: '#11131E', cardBackgroundDark: '#191B28' } },
    ];

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
    
    const handleSaveTheme = (themeData: CustomTheme) => {
        const exists = customThemes.some(t => t.id === themeData.id);
        if (exists) {
            setCustomThemes(customThemes.map(t => t.id === themeData.id ? themeData : t));
        } else {
            setCustomThemes([...customThemes, themeData]);
        }
    };
    
    const handleDeleteTheme = (id: string) => {
        if(window.confirm("Are you sure you want to delete this theme?")){
            if (activeThemeId === id) setActiveThemeId('default');
            setCustomThemes(customThemes.filter(t => t.id !== id));
        }
    };
    
    const handleOpenThemeModalFromTemplate = (template: { name: string, colors: CustomTheme['colors'] }) => {
        const newThemeTemplate: CustomTheme = {
            id: '', 
            name: template.name,
            colors: template.colors
        };
        setThemeToEdit(newThemeTemplate);
        setIsThemeModalOpen(true);
    };

    const handleSaveField = (fieldData: CustomFieldDefinition) => {
        const exists = customFieldDefinitions.some(f => f.id === fieldData.id);
        if (exists) {
            setCustomFieldDefinitions(customFieldDefinitions.map(f => f.id === fieldData.id ? fieldData : f));
        } else {
            setCustomFieldDefinitions([...customFieldDefinitions, fieldData]);
        }
    };
    
    const handleDeleteField = (id: number) => {
        setCustomFieldDefinitions(customFieldDefinitions.filter(f => f.id !== id));
    };

    const themeModeOptions: { value: ThemeMode, label: string, icon: JSX.Element }[] = [
        { value: 'light', label: 'Light', icon: <SunIcon className="w-5 h-5"/> },
        { value: 'dark', label: 'Dark', icon: <MoonIcon className="w-5 h-5"/> },
        { value: 'system', label: 'System', icon: <ComputerDesktopIcon className="w-5 h-5"/> },
    ];

    return (
        <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-brand-light dark:bg-brand-dark flex flex-col">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Settings</h1>
            </header>
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow w-full">
                <div className="space-y-8">
                    <SettingCard title="Profile" icon={<UserCircleIcon className="w-6 h-6 text-primary" />}>
                         <div>
                            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                <input type="text" id="userName" value={nameInput} onChange={e => setNameInput(e.target.value)} className="flex-grow px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary" />
                                <button onClick={() => handleSave('user')} className="px-5 py-2 text-sm bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors w-full sm:w-auto flex-shrink-0">
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
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                <input type="password" id="apiKey" value={keyInput} onChange={e => setKeyInput(e.target.value)} className="flex-grow px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-primary" placeholder="Enter your key here"/>
                                <button onClick={() => handleSave('api')} className="px-5 py-2 text-sm bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors w-full sm:w-auto flex-shrink-0">
                                    Save
                                </button>
                            </div>
                             {showSuccess === 'api' && <p className="text-sm text-green-600 mt-2 flex items-center gap-1 animate-fade-in"><CheckCircleIcon className="w-4 h-4" /> API Key updated successfully!</p>}
                        </div>
                    </SettingCard>
                </div>
                
                 <div className="space-y-8">
                     <SettingCard title="Appearance" icon={<PaletteIcon className="w-6 h-6 text-primary" />}>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mode</label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                                {themeModeOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => setThemeMode(option.value)}
                                        className={`flex-grow flex items-center justify-center gap-2 p-2 rounded-md text-sm transition-colors ${
                                            themeMode === option.value
                                                ? 'bg-white dark:bg-gray-900 shadow-sm font-semibold'
                                                : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    >
                                        {option.icon}
                                        <span>{option.label}</span>
                                    </button>
                                ))}
                           </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Themes</label>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setActiveThemeId('default')} className={`px-4 py-2 text-sm rounded-md border-2 ${activeThemeId === 'default' ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}>Default</button>
                                {customThemes.map(theme => (
                                    <div key={theme.id} className="group relative">
                                        <button onClick={() => setActiveThemeId(theme.id)} className={`w-full px-4 py-2 text-sm rounded-md border-2 ${activeThemeId === theme.id ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}>{theme.name}</button>
                                        <div className="absolute top-0 right-0 flex items-center -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); setThemeToEdit(theme); setIsThemeModalOpen(true); }} className="p-1 bg-gray-200 dark:bg-gray-700 rounded-full shadow-sm"><PencilIcon className="w-3 h-3"/></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTheme(theme.id); }} className="p-1 bg-gray-200 dark:bg-gray-700 rounded-full shadow-sm ml-1"><TrashIcon className="w-3 h-3"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Create New Theme</label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button onClick={() => { setThemeToEdit(null); setIsThemeModalOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
                                        <PlusIcon className="w-4 h-4" />
                                        From Scratch
                                    </button>
                                    <span className="text-sm text-gray-400 self-center">|</span>
                                    {predefinedThemes.map((pTheme, index) => (
                                        <button key={index} onClick={() => handleOpenThemeModalFromTemplate(pTheme)} className="px-4 py-2 text-sm rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-solid hover:border-primary">
                                            {pTheme.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                     </SettingCard>

                    <SettingCard title="Customization" icon={<ListBulletIcon className="w-6 h-6 text-primary" />}>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Task Fields</label>
                                <button onClick={() => { setFieldToEdit(null); setIsFieldModalOpen(true); }} className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
                                    <PlusIcon className="w-3 h-3" />
                                    Add Field
                                </button>
                            </div>
                            <div className="space-y-2">
                                {customFieldDefinitions.map(field => (
                                    <div key={field.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md flex justify-between items-center text-sm">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white">{field.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Type: {field.type} | Scope: {field.listId ? lists.find(l=>l.id===field.listId)?.name : 'Global'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => { setFieldToEdit(field); setIsFieldModalOpen(true); }}><PencilIcon className="w-4 h-4 text-gray-500 hover:text-primary"/></button>
                                            <button onClick={() => handleDeleteField(field.id)}><TrashIcon className="w-4 h-4 text-gray-500 hover:text-red-500"/></button>
                                        </div>
                                    </div>
                                ))}
                                {customFieldDefinitions.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No custom fields defined.</p>}
                            </div>
                        </div>
                    </SettingCard>
                </div>
            </div>

            <footer className="mt-auto pt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                <p>TaskFlow AI v1.0.0</p>
                <div className="flex justify-center items-center gap-4 mt-2">
                    <a href="#" className="hover:text-primary"><GithubIcon className="w-5 h-5"/></a>
                    <a href="#" className="hover:text-primary"><LinkedinIcon className="w-5 h-5"/></a>
                </div>
            </footer>
            
            <AddThemeModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} onSave={handleSaveTheme} themeToEdit={themeToEdit} />
            <AddCustomFieldModal isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)} onSave={handleSaveField} fieldToEdit={fieldToEdit} lists={lists} />
        </div>
    );
};

export default SettingsView;
