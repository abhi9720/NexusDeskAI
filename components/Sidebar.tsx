import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { List, Task, Note, ActiveSelection, SavedFilter, TaskFilter, Theme } from '../types';
import { SunIcon, MoonIcon, CalendarDaysIcon, PlusIcon, CogIcon, BellIcon, QuestionMarkCircleIcon, TasksIcon, NotesIcon, DocumentTextIcon, TagIcon, ListBulletIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon, ChevronDoubleRightIcon, StickyNoteIcon, SparklesIcon, DashboardIcon, TrendingUpIcon, ComputerDesktopIcon, UserCircleIcon, GithubIcon, LinkedinIcon, LightBulbIcon } from './icons';
import AddListModal from './AddListModal';

interface SidebarProps {
  lists: List[];
  tasks: Task[];
  notes: Note[];
  savedFilters: SavedFilter[];
  activeSelection: ActiveSelection;
  onActiveSelectionChange: (selection: ActiveSelection) => void;
  onAddList: (list: Omit<List, 'id' | 'statuses'>) => void;
  onUpdateList: (list: List) => void;
  onDeleteList: (listId: string) => void;
  onDeleteSavedFilter: (filterId: string) => void;
  onDetailItemChange: (item: Task | Note | null) => void;
  userName: string;
  onOpenTaskParser: () => void;
}


const Sidebar = (props: SidebarProps) => {
    const { lists, tasks, notes, savedFilters, activeSelection, onActiveSelectionChange, onAddList, onUpdateList, onDeleteList, onDeleteSavedFilter, onDetailItemChange, userName, onOpenTaskParser } = props;
    const { theme, setTheme } = useTheme();
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [listToEdit, setListToEdit] = useState<List | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const themeMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
                setIsThemeMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [themeMenuRef]);

    const handleOpenAddModal = () => {
        setListToEdit(null);
        setIsListModalOpen(true);
    };

    const handleOpenEditModal = (list: List) => {
        setListToEdit(list);
        setIsListModalOpen(true);
    };
    
    const handleDeleteList = (list: List) => {
        if (window.confirm(`Are you sure you want to delete the list "${list.name}"? This will also delete all associated items.`)) {
            onDeleteList(list.id);
        }
    };

    const handleSelection = (selection: ActiveSelection) => {
        onActiveSelectionChange(selection);
        onDetailItemChange(null);
        setSearchTerm('');
    };

    const taskLists = useMemo(() => lists.filter(l => l.type === 'task' && l.name.toLowerCase().includes(searchTerm.toLowerCase())), [lists, searchTerm]);
    const noteLists = useMemo(() => lists.filter(l => l.type === 'note' && l.name.toLowerCase().includes(searchTerm.toLowerCase())), [lists, searchTerm]);
    const tags = useMemo(() => {
        const allTags = new Set([...tasks.flatMap(t => t.tags), ...notes.flatMap(n => n.tags)]);
        return Array.from(allTags).filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [tasks, notes, searchTerm]);

    const tasksTodayCount = useMemo(() => tasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString()).length, [tasks]);

    const NavItem = ({ icon, label, count, isActive, onClick, onEdit, onDelete }: { icon: React.ReactNode, label: string, count?: number, isActive: boolean, onClick: () => void, onEdit?: (e: React.MouseEvent) => void, onDelete?: (e: React.MouseEvent) => void }) => (
        <div className="group flex items-center w-full">
            <button
                onClick={onClick}
                className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm rounded-lg transition-colors duration-150 ${
                    isActive
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
                <div className="flex items-center space-x-3">
                    {icon}
                    <span className="truncate">{label}</span>
                </div>
                {count !== undefined && <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">{count}</span>}
            </button>
            <div className="flex items-center pl-1">
                {onEdit && (
                    <button onClick={onEdit} className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                )}
                {onDelete && (
                    <button onClick={onDelete} className="p-1 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
    
    const themeOptions: { value: Theme, label: string, icon: JSX.Element }[] = [
        { value: 'light', label: 'Light', icon: <SunIcon className="w-5 h-5"/> },
        { value: 'dark', label: 'Dark', icon: <MoonIcon className="w-5 h-5"/> },
        { value: 'system', label: 'System', icon: <ComputerDesktopIcon className="w-5 h-5"/> },
    ];
    
    const currentThemeIcon = {
        light: <SunIcon className="w-5 h-5"/>,
        dark: <MoonIcon className="w-5 h-5"/>,
        system: <ComputerDesktopIcon className="w-5 h-5"/>,
    }[theme];

    return (
        <>
            <aside className="w-72 bg-gray-50 dark:bg-sidebar-dark flex flex-col p-4 flex-shrink-0 border-r border-gray-200 dark:border-r-transparent">
                <div className="flex items-center space-x-2 p-2 mb-4">
                     <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">TaskFlow AI</h1>
                </div>

                <div className="relative mb-4">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto pr-1 -mr-2">
                    <div className="space-y-1">
                         <button 
                          onClick={() => handleSelection({ type: 'ai-chat' })}
                          className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors duration-150 mb-2 animate-pulse-subtle ${activeSelection.type === 'ai-chat' ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold' : 'bg-primary/10 text-primary-dark dark:text-primary-light hover:bg-primary/20'}`}>
                          <SparklesIcon className="w-5 h-5" />
                          <span>Prodify AI Chat</span>
                        </button>
                         <button 
                          onClick={onOpenTaskParser}
                          className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors duration-150 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white`}>
                          <LightBulbIcon className="w-5 h-5" />
                          <span>Parse from Text</span>
                        </button>
                        <NavItem icon={<DashboardIcon className="w-5 h-5"/>} label="Home" isActive={activeSelection.type === 'dashboard'} onClick={() => handleSelection({type: 'dashboard'})}/>
                        <NavItem icon={<TasksIcon className="w-5 h-5"/>} label="Today" count={tasksTodayCount} isActive={activeSelection.type === 'smart-list' && activeSelection.id === 'today'} onClick={() => handleSelection({type: 'smart-list', id: 'today'})}/>
                        <NavItem icon={<ChevronDoubleRightIcon className="w-5 h-5"/>} label="Next 7 Days" isActive={activeSelection.type === 'smart-list' && activeSelection.id === 'next-7-days'} onClick={() => handleSelection({type: 'smart-list', id: 'next-7-days'})}/>
                        <NavItem icon={<TrendingUpIcon className="w-5 h-5" />} label="Momentum" isActive={activeSelection.type === 'momentum'} onClick={() => handleSelection({type: 'momentum'})} />
                        <NavItem icon={<StickyNoteIcon className="w-5 h-5"/>} label="Sticky Notes" isActive={activeSelection.type === 'sticky-notes'} onClick={() => handleSelection({type: 'sticky-notes'})}/>
                        <NavItem icon={<CalendarDaysIcon className="w-5 h-5"/>} label="Calendar" isActive={activeSelection.type === 'calendar'} onClick={() => handleSelection({type: 'calendar'})}/>
                    </div>

                    <div className="pt-4">
                        <div className="flex items-center justify-between px-3 pb-1">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task Lists</h3>
                             <button onClick={handleOpenAddModal} className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-primary/10">
                                 <PlusIcon className="w-4 h-4" />
                             </button>
                        </div>
                        {taskLists.map(list => (
                            <NavItem key={list.id} icon={<span className="w-5 h-5 flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: list.color}}></span></span>} label={list.name} count={tasks.filter(t => t.listId === list.id).length} isActive={activeSelection.type === 'list' && activeSelection.id === list.id} onClick={() => handleSelection({ type: 'list', id: list.id })} onEdit={(e) => { e.stopPropagation(); handleOpenEditModal(list); }} onDelete={(e) => { e.stopPropagation(); handleDeleteList(list); }}/>
                        ))}
                    </div>
                     <div className="pt-4">
                        <div className="flex items-center justify-between px-3 pb-1">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Note Lists</h3>
                        </div>
                        {noteLists.map(list => (
                            <NavItem key={list.id} icon={<span className="w-5 h-5 flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: list.color}}></span></span>} label={list.name} count={notes.filter(n => n.listId === list.id).length} isActive={activeSelection.type === 'list' && activeSelection.id === list.id} onClick={() => handleSelection({ type: 'list', id: list.id })} onEdit={(e) => { e.stopPropagation(); handleOpenEditModal(list); }} onDelete={(e) => { e.stopPropagation(); handleDeleteList(list); }}/>
                        ))}
                    </div>
                    {savedFilters.length > 0 && (
                        <div className="pt-4">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 pb-1">Saved Filters</h3>
                            {savedFilters.map(filter => (
                                <NavItem 
                                    key={filter.id}
                                    icon={<ListBulletIcon className="w-5 h-5" />}
                                    label={filter.name}
                                    isActive={activeSelection.type === 'saved-filter' && activeSelection.id === filter.id}
                                    onClick={() => handleSelection({ type: 'saved-filter', id: filter.id })}
                                    onDelete={(e) => { e.stopPropagation(); onDeleteSavedFilter(filter.id); }}
                                />
                            ))}
                        </div>
                    )}
                    {tags.length > 0 && (
                        <div className="pt-4">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 pb-1">Tags</h3>
                            {tags.map(tag => (
                                <NavItem 
                                    key={tag}
                                    icon={<TagIcon className="w-5 h-5" />}
                                    label={`#${tag}`}
                                    isActive={activeSelection.type === 'tag' && activeSelection.id === tag}
                                    onClick={() => handleSelection({ type: 'tag', id: tag })}
                                />
                            ))}
                        </div>
                    )}
                </nav>
                
                <div className="flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center space-x-3">
                            <UserCircleIcon className="w-8 h-8 text-gray-500" />
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">{userName}</p>
                            </div>
                        </div>
                         <button onClick={() => handleSelection({ type: 'settings' })} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" title="Settings" aria-label="Settings">
                            <CogIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex justify-center items-center space-x-2">
                        <span>Built by <a href="https://github.com/abhi9720" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">abhi9720</a></span>
                        <a href="https://github.com/abhi9720" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors" aria-label="GitHub">
                            <GithubIcon className="w-4 h-4" />
                        </a>
                        <a href="https://www.linkedin.com/in/abhi9720/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors" aria-label="LinkedIn">
                            <LinkedinIcon className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </aside>
             <AddListModal
                isOpen={isListModalOpen}
                onClose={() => setIsListModalOpen(false)}
                onAddList={onAddList}
                onUpdateList={onUpdateList}
                listToEdit={listToEdit}
            />
        </>
    );
};

export default Sidebar;