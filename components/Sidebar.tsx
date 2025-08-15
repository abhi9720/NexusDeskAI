import * as React from 'react';
import { useTheme } from '../context/ThemeContext';
import { List, Task, Note, ActiveSelection, SavedFilter, TaskFilter, ThemeMode } from '../types';
import { SunIcon, MoonIcon, CalendarDaysIcon, PlusIcon, CogIcon, BellIcon, QuestionMarkCircleIcon, TasksIcon, NotesIcon, DocumentTextIcon, TagIcon, ListBulletIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon, ChevronDoubleRightIcon, StickyNoteIcon, SparklesIcon, DashboardIcon, TrendingUpIcon, ComputerDesktopIcon, UserCircleIcon, GithubIcon, LinkedinIcon, FlaskIcon, ChevronDoubleLeftIcon } from './icons';
import AddListModal from './AddListModal';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
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
}


const Sidebar = (props: SidebarProps) => {
    const { isCollapsed, onToggle, lists, tasks, notes, savedFilters, activeSelection, onActiveSelectionChange, onAddList, onUpdateList, onDeleteList, onDeleteSavedFilter, onDetailItemChange, userName } = props;
    const { themeMode, setThemeMode } = useTheme();
    const [isListModalOpen, setIsListModalOpen] = React.useState(false);
    const [listToEdit, setListToEdit] = React.useState<List | null>(null);
    const [listTypeToAdd, setListTypeToAdd] = React.useState<'task' | 'note'>('task');
    const [searchTerm, setSearchTerm] = React.useState('');

    const handleOpenAddModal = (type: 'task' | 'note') => {
        setListToEdit(null);
        setListTypeToAdd(type);
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

    const taskLists = React.useMemo(() => lists.filter(l => l.type === 'task' && l.name.toLowerCase().includes(searchTerm.toLowerCase())), [lists, searchTerm]);
    const noteLists = React.useMemo(() => lists.filter(l => l.type === 'note' && l.name.toLowerCase().includes(searchTerm.toLowerCase())), [lists, searchTerm]);
    const tags = React.useMemo(() => {
        const allTags = new Set([...tasks.flatMap(t => t.tags), ...notes.flatMap(n => n.tags)]);
        return Array.from(allTags).filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [tasks, notes, searchTerm]);

    const tasksTodayCount = React.useMemo(() => tasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString()).length, [tasks]);

    const NavItem = ({ icon, label, count, isActive, onClick, onEdit, onDelete }: { icon: React.ReactNode, label: string, count?: number, isActive: boolean, onClick: () => void, onEdit?: (e: React.MouseEvent) => void, onDelete?: (e: React.MouseEvent) => void }) => (
        <div className="group flex items-center w-full" title={isCollapsed ? label : undefined}>
            <button
                onClick={onClick}
                className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-lg transition-colors duration-150 ${
                    isCollapsed ? 'justify-center' : 'justify-between'
                } ${
                    isActive
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
                <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                    {icon}
                    {!isCollapsed && <span className="truncate">{label}</span>}
                </div>
                {!isCollapsed && count !== undefined && <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">{count}</span>}
            </button>
            {!isCollapsed && <div className="flex items-center pl-1">
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
            </div>}
        </div>
    );

    return (
        <>
            <aside className={`bg-sidebar-light dark:bg-sidebar-dark flex flex-col p-4 flex-shrink-0 border-r border-gray-200 dark:border-r-transparent relative transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
                 <button
                    onClick={onToggle}
                    className="absolute -right-3 top-8 z-10 p-1 bg-white dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md"
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <ChevronDoubleRightIcon className="w-4 h-4" /> : <ChevronDoubleLeftIcon className="w-4 h-4" />}
                </button>

                <div className={`flex items-center space-x-2 p-2 mb-4 ${isCollapsed ? 'justify-center' : ''}`}>
                     <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                        <SparklesIcon className="w-5 h-5 text-white" />
                    </div>
                    {!isCollapsed && <h1 className="text-xl font-bold text-gray-900 dark:text-white">TaskFlow AI</h1>}
                </div>

                {!isCollapsed && 
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
                }

                <nav className="flex-1 space-y-2 overflow-y-auto pr-1 -mr-2">
                    <div className="space-y-1">
                         <button 
                          onClick={() => handleSelection({ type: 'ai-chat' })}
                          title={isCollapsed ? 'Prodify AI Chat' : undefined}
                          className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors duration-150 mb-2 animate-pulse-subtle ${isCollapsed ? 'justify-center' : ''} ${activeSelection.type === 'ai-chat' ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold' : 'bg-primary/10 text-primary-dark dark:text-primary-light hover:bg-primary/20'}`}>
                          <SparklesIcon className="w-5 h-5" />
                          {!isCollapsed && <span>Prodify AI Chat</span>}
                        </button>
                        <NavItem icon={<DashboardIcon className="w-5 h-5"/>} label="Home" isActive={activeSelection.type === 'dashboard'} onClick={() => handleSelection({type: 'dashboard'})}/>
                        <NavItem icon={<FlaskIcon className="w-5 h-5" />} label="Parse from Text" isActive={activeSelection.type === 'ai-task-parser'} onClick={() => handleSelection({type: 'ai-task-parser'})} />
                        <NavItem icon={<TasksIcon className="w-5 h-5"/>} label="Today" count={isCollapsed ? undefined : tasksTodayCount} isActive={activeSelection.type === 'smart-list' && activeSelection.id === 'today'} onClick={() => handleSelection({type: 'smart-list', id: 'today'})}/>
                        <NavItem icon={<ChevronDoubleRightIcon className="w-5 h-5"/>} label="Next 7 Days" isActive={activeSelection.type === 'smart-list' && activeSelection.id === 'next-7-days'} onClick={() => handleSelection({type: 'smart-list', id: 'next-7-days'})}/>
                        <NavItem icon={<TrendingUpIcon className="w-5 h-5" />} label="Momentum" isActive={activeSelection.type === 'momentum'} onClick={() => handleSelection({type: 'momentum'})} />
                        <NavItem icon={<StickyNoteIcon className="w-5 h-5"/>} label="Sticky Notes" isActive={activeSelection.type === 'sticky-notes'} onClick={() => handleSelection({type: 'sticky-notes'})}/>
                        <NavItem icon={<CalendarDaysIcon className="w-5 h-5"/>} label="Calendar" isActive={activeSelection.type === 'calendar'} onClick={() => handleSelection({type: 'calendar'})}/>
                    </div>

                    <div className="pt-4">
                        {!isCollapsed && 
                            <div className="flex items-center justify-between px-3 pb-1">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task Lists</h3>
                                <button onClick={() => handleOpenAddModal('task')} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-primary-dark dark:hover:text-primary-light transition-colors" aria-label="Add Task List">
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        }
                        {taskLists.map(list => (
                            <NavItem key={list.id} icon={<span className="w-5 h-5 flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: list.color}}></span></span>} label={list.name} count={isCollapsed ? undefined : tasks.filter(t => t.listId === list.id).length} isActive={activeSelection.type === 'list' && activeSelection.id === list.id} onClick={() => handleSelection({ type: 'list', id: list.id })} onEdit={(e) => { e.stopPropagation(); handleOpenEditModal(list); }} onDelete={(e) => { e.stopPropagation(); handleDeleteList(list); }}/>
                        ))}
                    </div>
                     <div className="pt-4">
                        {!isCollapsed &&
                            <div className="flex items-center justify-between px-3 pb-1">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Note Lists</h3>
                                <button onClick={() => handleOpenAddModal('note')} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-primary-dark dark:hover:text-primary-light transition-colors" aria-label="Add Note List">
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        }
                        {noteLists.map(list => (
                            <NavItem key={list.id} icon={<span className="w-5 h-5 flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: list.color}}></span></span>} label={list.name} count={isCollapsed ? undefined : notes.filter(n => n.listId === list.id).length} isActive={activeSelection.type === 'list' && activeSelection.id === list.id} onClick={() => handleSelection({ type: 'list', id: list.id })} onEdit={(e) => { e.stopPropagation(); handleOpenEditModal(list); }} onDelete={(e) => { e.stopPropagation(); handleDeleteList(list); }}/>
                        ))}
                    </div>
                    {!isCollapsed && savedFilters.length > 0 && (
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
                    {!isCollapsed && tags.length > 0 && (
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
                    <button 
                        onClick={() => handleSelection({ type: 'settings' })}
                        className={`flex items-center w-full p-2 rounded-lg text-left ${isCollapsed ? 'justify-center' : ''} hover:bg-gray-200 dark:hover:bg-gray-700/50`}
                        title={isCollapsed ? 'Settings' : ''}
                    >
                        <UserCircleIcon className="w-8 h-8 text-gray-500 flex-shrink-0" />
                        {!isCollapsed && (
                            <div className="ml-3">
                                <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{userName}</p>
                            </div>
                        )}
                    </button>
                </div>
            </aside>
            <AddListModal
                isOpen={isListModalOpen}
                onClose={() => setIsListModalOpen(false)}
                onAddList={onAddList}
                onUpdateList={onUpdateList}
                listToEdit={listToEdit}
                defaultType={listTypeToAdd}
            />
        </>
    );
};

export default Sidebar;