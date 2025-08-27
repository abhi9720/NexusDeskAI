
import * as React from 'react';
import { useTheme } from '../context/ThemeContext';
import { List, Task, Note, ActiveSelection, SavedFilter, TaskFilter, ThemeMode, UserStats } from '../types';
import { SunIcon, MoonIcon, CalendarDaysIcon, PlusIcon, CogIcon, BellIcon, QuestionMarkCircleIcon, TasksIcon, NotesIcon, DocumentTextIcon, TagIcon, ListBulletIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon, StickyNoteIcon, SparklesIcon, DashboardIcon, TrendingUpIcon, ComputerDesktopIcon, UserCircleIcon, GithubIcon, LinkedinIcon, FlaskIcon, XMarkIcon, TrophyIcon, FireIcon, FlagIcon, ChevronRightIcon, ChevronLeftIcon, ChevronDoubleRightIcon, CheckBadgeIcon } from './icons';
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
  onDeleteList: (listId: number) => void;
  onDeleteSavedFilter: (filterId: number) => void;
  onDetailItemChange: (item: Task | Note | null) => void;
  userName: string;
  userStats: UserStats | null;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  onOpenSearch: () => void;
  onQuickAddTask: (text: string) => Promise<void>;
  isAiLoading: boolean;
}

const GamificationWidget = ({ stats, isCollapsed }: { stats: UserStats | null; isCollapsed: boolean }) => {
    if (!stats) return null;
    const items = [
        { label: "Points", value: stats.points, icon: <SparklesIcon className="w-5 h-5 text-yellow-500"/>, color: "text-yellow-500" },
        { label: "Streak", value: stats.currentStreak, icon: <FireIcon className="w-5 h-5 text-red-500"/>, color: "text-red-500" }
    ];

    return (
        <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${isCollapsed ? 'flex flex-col items-center gap-2' : 'grid grid-cols-2 gap-2'}`}>
            {items.map(item => (
                <div key={item.label} className="flex items-center gap-2" title={`${item.value} ${item.label}`}>
                    {item.icon}
                    {!isCollapsed && (
                        <div>
                             <p className="font-bold text-lg leading-tight text-gray-800 dark:text-white">{item.value}</p>
                             <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const Sidebar = (props: SidebarProps) => {
    const { isCollapsed, onToggle, lists, tasks, notes, savedFilters, activeSelection, onActiveSelectionChange, onAddList, onUpdateList, onDeleteList, onDeleteSavedFilter, onDetailItemChange, userName, userStats, isMobileOpen, onMobileClose, onOpenSearch, onQuickAddTask, isAiLoading } = props;
    const [isListModalOpen, setIsListModalOpen] = React.useState(false);
    const [listToEdit, setListToEdit] = React.useState<List | null>(null);
    const [listTypeToAdd, setListTypeToAdd] = React.useState<'task' | 'note'>('task');
    const [listParentId, setListParentId] = React.useState<number | null>(null);

    const handleOpenAddModal = (type: 'task' | 'note', parentId: number | null = null) => {
        setListToEdit(null);
        setListTypeToAdd(type);
        setListParentId(parentId);
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
        if (onMobileClose) onMobileClose();
    };

    const taskLists = React.useMemo(() => lists.filter(l => l && l.type === 'task'), [lists]);
    const noteLists = React.useMemo(() => lists.filter(l => l && l.type === 'note' && l.parentId === null), [lists]);
    const tags = React.useMemo(() => {
        const allTags = new Set([...tasks.flatMap(t => t.tags || []), ...notes.flatMap(n => n.tags || [])]);
        return Array.from(allTags);
    }, [tasks, notes]);

    const tasksTodayCount = React.useMemo(() => tasks.filter(t => t && t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length, [tasks]);
    
    const NavItem = ({ icon, label, count, isActive, onClick, onEdit, onDelete }: { icon: React.ReactNode, label: string, count?: number, isActive: boolean, onClick: () => void, onEdit?: (e: React.MouseEvent) => void, onDelete?: (e: React.MouseEvent) => void }) => (
        <div className="group flex items-center w-full relative" title={isCollapsed ? label : undefined}>
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary rounded-r-full"></div>}
            <button
                onClick={onClick}
                className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-lg transition-colors duration-150 ${!isCollapsed && (onEdit || onDelete) ? 'pr-12' : ''} ${
                    isCollapsed ? 'justify-center' : ''
                } ${
                    isActive
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
                <div className={`flex items-center flex-1 min-w-0 ${isCollapsed ? '' : 'space-x-3'}`}>
                    {icon}
                    {!isCollapsed && <span className="truncate">{label}</span>}
                </div>
                {!isCollapsed && count !== undefined && <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 ml-auto flex-shrink-0">{count}</span>}
            </button>
            {!isCollapsed && (onEdit || onDelete) && <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && <button onClick={onEdit} className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-primary/10"><PencilIcon className="w-4 h-4" /></button>}
                {onDelete && <button onClick={onDelete} className="p-1 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-500/10"><TrashIcon className="w-4 h-4" /></button>}
            </div>}
        </div>
    );
    
    const renderLists = (listItems: List[], type: 'task' | 'note') => {
        return listItems.map(list => {
            const count = type === 'task' 
                ? tasks.filter(t => t.listId === list.id).length
                : notes.filter(n => n.listId === list.id).length;
            
            return (
                <div key={list.id}>
                    <NavItem 
                        icon={<span className="w-5 h-5 flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: list.color}}></span></span>} 
                        label={list.name} 
                        count={isCollapsed ? undefined : count} 
                        isActive={activeSelection.type === 'list' && activeSelection.id === list.id} 
                        onClick={() => handleSelection({ type: 'list', id: list.id })} 
                        onEdit={(e) => { e.stopPropagation(); handleOpenEditModal(list); }} 
                        onDelete={(e) => { e.stopPropagation(); handleDeleteList(list); }}
                    />
                </div>
            );
        });
    };

    return (
        <>
            <aside className={`bg-container dark:bg-container-dark flex flex-col p-3 border-r border-gray-200 dark:border-gray-800/80 transition-transform duration-300 ease-in-out md:relative md:transform-none md:transition-all ${isCollapsed ? 'md:w-20' : 'md:w-72'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-72`}>
                 <button
                    onClick={onToggle}
                    className="absolute top-1/2 -translate-y-1/2 -right-4 z-10 p-1.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full border border-gray-300/50 dark:border-gray-600/50 text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 shadow-lg hidden md:block transition-all hover:scale-110"
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
                </button>

                <div className={`flex items-center justify-between p-2 mb-4`}>
                    <div className={`flex items-center space-x-2 ${isCollapsed ? 'w-full justify-center' : ''}`}>
                         <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                        {!isCollapsed && <h1 className="text-xl font-bold text-gray-900 dark:text-white">TaskFlow</h1>}
                    </div>
                     <button onClick={onMobileClose} className="md:hidden p-2 -mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <XMarkIcon className="w-6 h-6" />
                     </button>
                </div>

                {!isCollapsed && 
                    <div className="mb-4 px-1">
                        <button 
                            onClick={onOpenSearch}
                            className="w-full flex items-center justify-between text-left pl-3 pr-2 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors"
                        >
                            <div className="flex items-center">
                                <MagnifyingGlassIcon className="w-5 h-5 mr-3 text-gray-400" />
                                <span>Search...</span>
                            </div>
                            <kbd className="px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs text-gray-400 dark:text-gray-500">⌘K</kbd>
                        </button>
                    </div>
                }

                <nav className="flex-1 space-y-2 overflow-y-auto pr-1 -mr-2">
                    <div className="space-y-1">
                         <button 
                          onClick={() => handleSelection({ type: 'ai-chat' })}
                          title={isCollapsed ? 'Prodify AI Chat' : undefined}
                          className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors duration-150 mb-2 font-semibold ${isCollapsed ? 'justify-center' : ''} bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-dark`}
                         >
                          <div className="relative flex items-center gap-3">
                              <SparklesIcon className="w-5 h-5" />
                              {!isCollapsed && <span>Prodify AI Chat</span>}
                          </div>
                        </button>
                        <NavItem icon={<DashboardIcon className="w-5 h-5"/>} label="Home" isActive={activeSelection.type === 'dashboard'} onClick={() => handleSelection({type: 'dashboard'})}/>
                        <NavItem icon={<FlaskIcon className="w-5 h-5" />} label="Parse from Text" isActive={activeSelection.type === 'ai-task-parser'} onClick={() => handleSelection({type: 'ai-task-parser'})} />
                        <NavItem icon={<TasksIcon className="w-5 h-5"/>} label="Today" count={isCollapsed ? undefined : tasksTodayCount} isActive={activeSelection.type === 'smart-list' && activeSelection.id === 'today'} onClick={() => handleSelection({type: 'smart-list', id: 'today'})}/>
                        <NavItem icon={<BellIcon className="w-5 h-5" />} label="Reminders" isActive={activeSelection.type === 'reminders'} onClick={() => handleSelection({type: 'reminders'})}/>
                        <NavItem icon={<FlagIcon className="w-5 h-5" />} label="Goals" isActive={activeSelection.type === 'goals'} onClick={() => handleSelection({type: 'goals'})} />
                        <NavItem icon={<CheckBadgeIcon className="w-5 h-5" />} label="Habits" isActive={activeSelection.type === 'habits'} onClick={() => handleSelection({type: 'habits'})} />
                        <NavItem icon={<StickyNoteIcon className="w-5 h-5"/>} label="Sticky Notes" isActive={activeSelection.type === 'sticky-notes'} onClick={() => handleSelection({type: 'sticky-notes'})}/>
                        <NavItem icon={<CalendarDaysIcon className="w-5 h-5"/>} label="Calendar" isActive={activeSelection.type === 'calendar'} onClick={() => handleSelection({type: 'calendar'})}/>
                    </div>

                    <div className="pt-4 space-y-1">
                        {!isCollapsed && <div className="flex items-center justify-between px-3 pb-1"><h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task Lists</h3><button onClick={() => handleOpenAddModal('task')} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Add Task List"><PlusIcon className="w-5 h-5" /></button></div>}
                        {renderLists(taskLists, 'task')}
                    </div>
                     <div className="pt-4 space-y-1">
                        {!isCollapsed && <div className="flex items-center justify-between px-3 pb-1"><h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Note Lists</h3><button onClick={() => handleOpenAddModal('note')} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Add Note List"><PlusIcon className="w-5 h-5" /></button></div>}
                        {renderLists(noteLists, 'note')}
                    </div>
                    {!isCollapsed && savedFilters.length > 0 && <div className="pt-4 space-y-1"><h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 pb-1">Saved Filters</h3>{savedFilters.map(filter => <NavItem key={filter.id} icon={<ListBulletIcon className="w-5 h-5" />} label={filter.name} isActive={activeSelection.type === 'saved-filter' && activeSelection.id === filter.id} onClick={() => handleSelection({ type: 'saved-filter', id: filter.id })} onDelete={(e) => { e.stopPropagation(); onDeleteSavedFilter(filter.id); }}/>)}</div>}
                    {!isCollapsed && tags.length > 0 && <div className="pt-4 space-y-1"><h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 pb-1">Tags</h3>{tags.map(tag => <NavItem key={tag} icon={<TagIcon className="w-5 h-5" />} label={`#${tag}`} isActive={activeSelection.type === 'tag' && activeSelection.id === tag} onClick={() => handleSelection({ type: 'tag', id: tag })}/>)}</div>}
                </nav>
                
                <div className="flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700/50 space-y-3">
                    {!isCollapsed && <GamificationWidget stats={userStats} isCollapsed={isCollapsed} />}
                    <button 
                        onClick={() => handleSelection({ type: 'settings' })}
                        className={`flex items-center w-full p-2 rounded-lg text-left ${isCollapsed ? 'justify-center' : ''} hover:bg-gray-200/50 dark:hover:bg-gray-700/50`}
                        title={isCollapsed ? 'Settings' : ''}
                    >
                        <UserCircleIcon className="w-8 h-8 text-gray-500 flex-shrink-0" />
                        {!isCollapsed && <div className="ml-3"><p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{userName}</p></div>}
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
                defaultParentId={listParentId}
                lists={lists}
            />
        </>
    );
};

export default Sidebar;
