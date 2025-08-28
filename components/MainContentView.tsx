import React, { useState, useMemo, useEffect, useRef } from 'react';
import { List, Task, Note, ActiveSelection, SavedFilter, TaskFilter, Priority, Status, CustomFieldDefinition } from '../types';
import TaskListView from './TaskListView';
import TaskBoardView from './TaskBoardView';
import NoteListView from './NoteListView';
import TaskFilterBar from './TaskFilterBar';
import SaveFilterModal from './SaveFilterModal';
import ListOverview from './ProjectOverview';
import TaskCalendarView from './TaskCalendarView';
import TaskTableView from './TaskTableView';
import { QueueListIcon, ViewColumnsIcon, PlusIcon, DashboardIcon, FilterIcon, GroupByIcon, SortIcon, CalendarDaysIcon, CheckIcon, Bars3Icon, ExportIcon, XMarkIcon, TableCellsIcon, PencilIcon, TrashIcon, EllipsisHorizontalIcon, FolderPlusIcon } from './icons';
// FIX: Import 'startOfDay' from its submodule 'date-fns/startOfDay'.
import { isWithinInterval, addDays, isToday as isTodayFns, format, isPast } from 'date-fns';
import startOfDay from 'date-fns/startOfDay';
import * as XLSX from 'xlsx';

const DropdownMenuItem = ({ label, current, value, set, setOpen }: { label:string, current: string, value: string, set: (s:any)=>void, setOpen: (b:boolean)=>void }) => {
    const isActive = current === value;
    return (
        <button
            onClick={() => { set(value); setOpen(false); }}
            className={`w-full text-left px-4 py-2 text-sm flex justify-between items-center ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
            <span>{label}</span>
            {isActive && <CheckIcon className="w-4 h-4" />}
        </button>
    )
};

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selectedColumns: string[]) => void;
  customFieldDefinitions: CustomFieldDefinition[];
  listId: number | undefined;
}

const defaultColumns = [
    'Title', 'Description', 'Status', 'Priority', 'Due Date', 'Created At', 'Tags', 'Checklist'
];

const allPossibleColumns = [
    'ID', 'Title', 'Description', 'Status', 'Priority', 'Due Date', 'Created At', 'Tags', 'Checklist', 'Comments Count', 'Attachments Count'
];

const ExportOptionsModal = ({ isOpen, onClose, onExport, customFieldDefinitions, listId }: ExportOptionsModalProps) => {
    const applicableCustomFields = React.useMemo(() => 
        customFieldDefinitions.filter(field => field.listId === null || field.listId === listId),
        [customFieldDefinitions, listId]
    );

    const allColumns = React.useMemo(() => [
        ...allPossibleColumns,
        ...applicableCustomFields.map(cf => `CF: ${cf.name}`)
    ], [applicableCustomFields]);
    
    const [selectedColumns, setSelectedColumns] = React.useState<Set<string>>(() => {
        const defaultSet = new Set(defaultColumns);
        applicableCustomFields.forEach(cf => defaultSet.add(`CF: ${cf.name}`));
        return defaultSet;
    });

    React.useEffect(() => {
        if (isOpen) {
            const defaultAndCustom = [...defaultColumns, ...applicableCustomFields.map(cf => `CF: ${cf.name}`)];
            setSelectedColumns(new Set(defaultAndCustom));
        }
    }, [isOpen, applicableCustomFields]);

    if (!isOpen) return null;

    const handleToggleColumn = (column: string) => {
        const newSelection = new Set(selectedColumns);
        if (newSelection.has(column)) {
            newSelection.delete(column);
        } else {
            newSelection.add(column);
        }
        setSelectedColumns(newSelection);
    };

    const handleExportClick = () => {
        onExport(Array.from(selectedColumns));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-md" onClick={onClose}>
            <div className="bg-page dark:bg-page-dark rounded-2xl shadow-2xl w-full max-w-md m-4 flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Export Options</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <div className="p-6 overflow-y-auto">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select the columns to include in the Tasks sheet.</p>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
                        {allColumns.map(column => (
                            <label key={column} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedColumns.has(column)}
                                    onChange={() => handleToggleColumn(column)}
                                    className="h-4 w-4 rounded form-checkbox text-primary"
                                />
                                <span className="text-sm">{column}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={handleExportClick}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark"
                    >
                        <ExportIcon className="w-5 h-5" />
                        Export {selectedColumns.size} Columns
                    </button>
                </footer>
            </div>
        </div>
    );
};


const ViewButton = ({ title, isActive, onClick, children }: { title: string; isActive: boolean; onClick: () => void; children: React.ReactNode }) => {
    const activeClasses = 'bg-gray-300 dark:bg-gray-900/70 shadow-inner text-gray-800 dark:text-white';
    const inactiveClasses = 'text-gray-500 dark:text-gray-400 hover:bg-gray-500/10 hover:text-gray-800 dark:hover:text-white';

    return (
        <button
            onClick={onClick}
            className={`p-1.5 rounded-md transition-colors ${isActive ? activeClasses : inactiveClasses}`}
            title={title}
        >
            {children}
        </button>
    );
};

interface MainContentViewProps {
  activeSelection: ActiveSelection;
  lists: List[];
  tasks: Task[];
  notes: Note[];
  savedFilters: SavedFilter[];
  onSelectItem: (item: Task | Note) => void;
  onUpdateItem: (item: Task | Note) => void;
  onAddSavedFilter: (name: string, filter: TaskFilter) => void;
  onAddItem: (item: Partial<Task & Note>, listId: number, type: 'task' | 'note') => void;
  onUpdateList: (list: List) => void;
  onStartFocus: (task: Task) => void;
  onOpenAddItemPane: (listId: number, type: 'task' | 'note') => void;
  customFieldDefinitions: CustomFieldDefinition[];
  onActiveSelectionChange: (selection: ActiveSelection) => void;
  onDeleteList: (listId: number) => void;
  onOpenListModal: (options: {
    listToEdit?: List | null;
    defaultType?: 'task' | 'note';
    defaultParentId?: number | null;
  }) => void;
}

const MainContentView = (props: MainContentViewProps) => {
  const { activeSelection, lists, tasks, notes, savedFilters, onSelectItem, onUpdateItem, onAddSavedFilter, onAddItem, onUpdateList, onStartFocus, onOpenAddItemPane, customFieldDefinitions, onActiveSelectionChange, onDeleteList, onOpenListModal } = props;
  const [viewType, setViewType] = useState<'overview' | 'board' | 'list' | 'calendar' | 'table'>('board');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({ keyword: '', status: 'all', priority: 'all' });
  const [isSaveFilterModalOpen, setIsSaveFilterModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [sortType, setSortType] = useState<'default' | 'priority' | 'dueDate'>('default');
  const [groupBy, setGroupBy] = useState<'default' | 'priority' | 'status' | 'tag'>('default');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
              setIsSortMenuOpen(false);
          }
           if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
              setIsGroupMenuOpen(false);
          }
           if (listMenuRef.current && !listMenuRef.current.contains(event.target as Node)) {
              setIsListMenuOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortMenuRef, groupMenuRef, listMenuRef]);

  const { title, items, isTaskView, currentList, isTagView, taggedTasks, taggedNotes, subfolders } = useMemo(() => {
    const result = {
        title: 'Tasks',
        items: [] as Array<Task | Note>,
        isTaskView: true,
        currentList: undefined as List | undefined,
        isTagView: false,
        taggedTasks: [] as Task[],
        taggedNotes: [] as Note[],
        subfolders: [] as (List & { itemCount: number })[],
    };

    switch(activeSelection.type) {
        case 'smart-list':
            if (activeSelection.id === 'today') {
                result.title = 'Today';
                result.items = tasks.filter(t => isTodayFns(new Date(t.dueDate)));
            }
            break;
        case 'list':
            const list = lists.find(l => l.id === activeSelection.id);
            if (list) {
                result.title = list.name;
                result.currentList = list;
                if (list.type === 'task') {
                    result.items = tasks.filter(t => t && t.listId === list.id);
                    result.isTaskView = true;
                } else {
                    result.items = notes.filter(n => n && n.listId === list.id);
                    result.isTaskView = false;
                    const childLists = lists.filter(l => l.parentId === activeSelection.id);
                    result.subfolders = childLists.map(childList => {
                        const itemCount = childList.type === 'task'
                            ? tasks.filter(t => t.listId === childList.id).length
                            : notes.filter(n => n.listId === childList.id).length + lists.filter(l => l.parentId === childList.id).length;
                        return { ...childList, itemCount };
                    });
                }
            }
            break;
        case 'tag':
            result.title = `#${activeSelection.id}`;
            result.taggedTasks = tasks.filter(t => t.tags.includes(activeSelection.id));
            result.taggedNotes = notes.filter(n => n.tags.includes(activeSelection.id));
            result.isTagView = true;
            result.isTaskView = false; // Bypass normal task/note view rendering
            break;
        case 'calendar':
             result.title = 'Calendar';
             result.items = tasks;
             result.isTaskView = true;
             break;
        case 'saved-filter':
            const savedFilter = savedFilters.find(f => f.id === activeSelection.id);
            if (savedFilter) {
                result.title = savedFilter.name;
                setTaskFilter(savedFilter.filter);
            }
            result.items = tasks; // The filtering is applied below
            result.isTaskView = true;
            break;
        default:
             result.title = "Today";
             result.items = tasks.filter(t => isTodayFns(new Date(t.dueDate)));
             result.isTaskView = true;
    }
    
    return result;
  }, [activeSelection, lists, tasks, notes, savedFilters]);

  const breadcrumb = useMemo(() => {
    if (!currentList || !currentList.parentId) return [];
    const trail: List[] = [];
    let current = currentList;
    while (current.parentId) {
        const parent = lists.find(l => l.id === current.parentId);
        if (parent) {
            trail.unshift(parent);
            current = parent;
        } else {
            break;
        }
    }
    return trail;
}, [currentList, lists]);

  const filteredTasks = useMemo(() => {
    if (!isTaskView) return [];
    return (items as Task[]).filter(task => {
        const keywordMatch = taskFilter.keyword
            ? task.title.toLowerCase().includes(taskFilter.keyword.toLowerCase())
            : true;
        const priorityMatch = taskFilter.priority === 'all' || task.priority === task.priority;
        const statusMatch = taskFilter.status === 'all' || task.status === task.status;
        return keywordMatch && priorityMatch && statusMatch;
      });
  }, [items, isTaskView, taskFilter]);

  const sortedTasks = useMemo(() => {
      if (!isTaskView) return [];
      const tasksToSort = [...filteredTasks];

      switch (sortType) {
          case 'priority':
              const priorityOrder = { [Priority.High]: 0, [Priority.Medium]: 1, [Priority.Low]: 2 };
              tasksToSort.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
              break;
          case 'dueDate':
              tasksToSort.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
              break;
          default:
              tasksToSort.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              break;
      }
      return tasksToSort;
  }, [filteredTasks, isTaskView, sortType]);


  useEffect(() => {
    let newViewType: 'overview' | 'board' | 'list' | 'calendar' | 'table' = 'board';

    if (activeSelection.type === 'calendar') {
        newViewType = 'calendar';
    } else if (activeSelection.type === 'list') {
        const list = lists.find(l => l.id === activeSelection.id);
        if (list?.type === 'task') {
            const dv = list.defaultView;
            if (dv === 'board' || dv === 'list' || dv === 'calendar' || dv === 'table') {
                newViewType = dv;
            }
        }
    } else if (activeSelection.type === 'smart-list' && activeSelection.id === 'today') {
        if (viewType === 'calendar') {
            setViewType('board');
        }
    }
    
    setViewType(newViewType);
    
    if (activeSelection.type !== 'saved-filter') {
        setTaskFilter({ keyword: '', status: 'all', priority: 'all' });
    }
    setIsFilterVisible(false);
    setGroupBy('default');
  }, [activeSelection]);

  const handleSaveFilter = (name: string) => {
    onAddSavedFilter(name, taskFilter);
    setIsSaveFilterModalOpen(false);
  }
  
  const handleCloseFilter = () => {
    setIsFilterVisible(false);
    setTaskFilter({ keyword: '', status: 'all', priority: 'all' });
  };

    const handleExport = (selectedColumns: string[]) => {
        if (!currentList || !isTaskView) return;
        const listTasks = sortedTasks;

        const safeParseDate = (dateString: string | null | undefined): Date | null => {
            if (!dateString) return null;
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date;
        };
    
        const wb = XLSX.utils.book_new();

        // --- STYLES ---
        const thinBorder = { style: 'thin', color: { rgb: "D1D5DB" } };
        const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
        
        const STYLES = {
            title: { 
                font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } }, 
                fill: { fgColor: { rgb: "8B64FD" } }, 
                alignment: { horizontal: 'center', vertical: 'center' } 
            },
            subheader: { 
                font: { bold: true, sz: 12, color: { rgb: "111827" } }, 
                fill: { fgColor: { rgb: "E5E7EB" } }, 
                border: { bottom: { style: 'medium', color: { rgb: "D1D5DB" } } },
                alignment: { vertical: 'center' }
            },
            metricName: { 
                font: { bold: true, color: { rgb: "4B5563" } }, 
                border: allBorders,
                alignment: { vertical: 'center' }
            },
            metricValue: { 
                border: allBorders, 
                alignment: { horizontal: 'right', vertical: 'center' } 
            },
            priorityText: {
                [Priority.High]: { font: { bold: true, color: { rgb: "DC2626" } } },
                [Priority.Medium]: { font: { bold: true, color: { rgb: "D97706" } } },
                [Priority.Low]: { font: { bold: true, color: { rgb: "059669" } } }
            },
            taskHeader: { 
                font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, 
                fill: { fgColor: { rgb: "8B64FD" } }, 
                border: allBorders,
                alignment: { vertical: 'center' }
            },
            taskCell: { 
                border: allBorders,
                alignment: { vertical: 'center', wrapText: true }
            },
            priorityCell: {
                [Priority.High]: { fill: { fgColor: { rgb: "FECACA" } }, font: { color: { rgb: "991B1B" } }, border: allBorders, alignment: { vertical: 'center', wrapText: true } },
                [Priority.Medium]: { fill: { fgColor: { rgb: "FDE68A" } }, font: { color: { rgb: "92400E" } }, border: allBorders, alignment: { vertical: 'center', wrapText: true } },
                [Priority.Low]: { fill: { fgColor: { rgb: "D1FAE5" } }, font: { color: { rgb: "065F46" } }, border: allBorders, alignment: { vertical: 'center', wrapText: true } }
            },
            done: { 
                font: { color: { rgb: "9CA3AF" }, strike: true }, 
                fill: { fgColor: { rgb: "F3F4F6" } },
                border: allBorders,
                alignment: { vertical: 'center', wrapText: true }
            },
            overdue: { 
                font: { color: { rgb: "DC2626" }, bold: true },
            },
            percentage: (p: number) => ({
                numFmt: "0%",
                fill: { fgColor: { rgb: p < 0.3 ? "FECACA" : p < 0.7 ? "FDE68A" : "A7F3D0" } },
                border: allBorders,
                alignment: { horizontal: 'right', vertical: 'center' }
            }),
        };

        // --- 1. Overview Sheet ---
        const totalTasks = listTasks.length;
        const completedTasks = listTasks.filter(t => t.status === Status.Done).length;
        const inProgressTasks = listTasks.filter(t => t.status === Status.InProgress).length;
        const today = startOfDay(new Date());
        const overdueTasks = listTasks.filter(t => {
            const dueDate = safeParseDate(t.dueDate);
            return dueDate && dueDate < today && t.status !== Status.Done;
        }).length;
        const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
        const priorities = {
            High: listTasks.filter(t => t.priority === Priority.High).length,
            Medium: listTasks.filter(t => t.priority === Priority.Medium).length,
            Low: listTasks.filter(t => t.priority === Priority.Low).length,
        };
        
        const overviewData = [
            [`${currentList.name} - Project Health Overview`, null, null, null],
            [],
            ["Overall Progress", null, "Priority Breakdown", null],
            ["Completion", completionPercentage, "High", priorities.High],
            ["Total Tasks", totalTasks, "Medium", priorities.Medium],
            ["Completed", completedTasks, "Low", priorities.Low],
            ["In Progress", inProgressTasks],
            ["Overdue", overdueTasks],
        ];
        
        const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
        
        // --- Apply styles for Overview Sheet ---
        wsOverview['A1'].s = STYLES.title;
        wsOverview['A3'].s = STYLES.subheader;
        wsOverview['C3'].s = STYLES.subheader;
        
        // Overall Progress section
        wsOverview['A4'].s = STYLES.metricName;
        if (wsOverview['B4']) {
            wsOverview['B4'].t = 'n';
            wsOverview['B4'].s = STYLES.percentage(completionPercentage);
        }
        for (let r = 5; r <= 8; r++) {
            if (wsOverview[`A${r}`]) wsOverview[`A${r}`].s = STYLES.metricName;
            if (wsOverview[`B${r}`]) {
                wsOverview[`B${r}`].t = 'n';
                wsOverview[`B${r}`].s = STYLES.metricValue;
            }
        }
        
        // Priority Breakdown section
        for (let r = 4; r <= 6; r++) {
            if (wsOverview[`C${r}`]) {
                const priorityKey = wsOverview[`C${r}`].v as Priority;
                const style = {
                    ...STYLES.metricName,
                    font: {
                        ...STYLES.metricName.font,
                        ...(STYLES.priorityText[priorityKey]?.font || {})
                    }
                };
                wsOverview[`C${r}`].s = style;
            }
            if (wsOverview[`D${r}`]) {
                wsOverview[`D${r}`].t = 'n';
                wsOverview[`D${r}`].s = STYLES.metricValue;
            }
        }

        wsOverview['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
            { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },
        ];
        wsOverview['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
        wsOverview['!rows'] = [{ hpt: 30 }, null, { hpt: 20 }];

        XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");


        // --- 2. Tasks Sheet ---
        const applicableCustomFields = customFieldDefinitions.filter(f => f.listId === null || f.listId === currentList.id);
        const taskData = listTasks.map(task => {
            const baseTaskData: Record<string, any> = {
                'ID': task.id, 'Title': task.title, 'Description': task.description.replace(/<[^>]*>?/gm, ''),
                'Status': task.status, 'Priority': task.priority, 'Due Date': safeParseDate(task.dueDate), 'Created At': safeParseDate(task.createdAt),
                'Tags': (task.tags || []).join(', '), 'Checklist': (task.checklist || []).map(item => `[${item.completed ? 'x' : ' '}] ${item.text}`).join('; '),
                'Comments Count': (task.comments || []).length, 'Attachments Count': (task.attachments || []).length,
            };
            applicableCustomFields.forEach(field => {
                const value = task.customFields?.[field.id];
                baseTaskData[`CF: ${field.name}`] = (value !== undefined && value !== null) ? String(value) : '';
            });
            const filteredRow: Record<string, any> = {};
            selectedColumns.forEach(colName => {
                if(Object.prototype.hasOwnProperty.call(baseTaskData, colName)) filteredRow[colName] = baseTaskData[colName];
            });
            return filteredRow;
        });

        if (taskData.length > 0) {
            const wsTasks = XLSX.utils.json_to_sheet(taskData, { cellDates: true });
            const range = XLSX.utils.decode_range(wsTasks['!ref']!);

            wsTasks['!cols'] = selectedColumns.map(c => ({ wch: c === 'Description' ? 40 : c === 'Title' ? 30 : 18 }));
            wsTasks['!views'] = [{ state: 'frozen', ySplit: 1 }];
            wsTasks['!autofilter'] = { ref: wsTasks['!ref'] };

            for (let R = 1; R <= range.e.r; ++R) {
                const task = listTasks[R - 1];
                const isDone = task.status === Status.Done;
                const dueDate = safeParseDate(task.dueDate);
                const isOverdue = dueDate && dueDate < today && !isDone;

                for (let C = 0; C <= range.e.c; ++C) {
                    const cell_address = { c: C, r: R };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    if (!wsTasks[cell_ref]) continue;

                    let cellStyle: any = isDone ? { ...STYLES.done } : { ...STYLES.taskCell };
                    const header = wsTasks[XLSX.utils.encode_cell({ c: C, r: 0 })].v;

                    if (header === 'Priority') {
                        cellStyle = isDone ? { ...STYLES.done } : { ...STYLES.priorityCell[task.priority] };
                    }
                    if (header === 'Due Date' && isOverdue) {
                        cellStyle.font = { ...cellStyle.font, ...STYLES.overdue.font };
                    }
                    wsTasks[cell_ref].s = cellStyle;
                }
            }

            // Style headers
            for (let C = 0; C <= range.e.c; ++C) {
                const cell_ref = XLSX.utils.encode_cell({ c: C, r: 0 });
                if (wsTasks[cell_ref]) {
                    wsTasks[cell_ref].s = STYLES.taskHeader;
                }
            }

            XLSX.utils.book_append_sheet(wb, wsTasks, "Tasks");
        }

        const fileName = `${currentList.name.replace(/ /g,"_")}_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

  const renderContent = () => {
    if (isTagView) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
                {taggedTasks.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Tasks ({taggedTasks.length})</h3>
                        <TaskListView tasks={taggedTasks} allTasks={tasks} onSelectTask={onSelectItem as (task: Task) => void} groupBy="status" onStartFocus={onStartFocus} />
                    </div>
                )}
                {taggedNotes.length > 0 && (
                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Notes ({taggedNotes.length})</h3>
                        <NoteListView notes={taggedNotes} subfolders={[]} onSelectNote={onSelectItem as (note: Note) => void} onSelectFolder={() => {}} onEditFolder={() => {}} onDeleteFolder={() => {}}/>
                    </div>
                )}
            </div>
        )
    }
    
    if (!isTaskView && currentList?.type === 'note') {
        return <NoteListView notes={items as Note[]} subfolders={subfolders} onSelectNote={onSelectItem as (note: Note) => void} onSelectFolder={(id) => onActiveSelectionChange({type: 'list', id})} onEditFolder={(list) => onOpenListModal({ listToEdit: list })} onDeleteFolder={onDeleteList} />;
    }

    if (!isTaskView) return null; // Should not happen

    switch (viewType) {
        case 'overview':
            return <ListOverview tasks={items as Task[]} list={currentList} />;
        case 'board':
            return <TaskBoardView tasks={sortedTasks} allTasks={tasks} list={currentList} onSelectTask={onSelectItem as (task: Task) => void} onUpdateTask={onUpdateItem as (task: Task) => void} onUpdateList={onUpdateList} onStartFocus={onStartFocus} />;
        case 'list':
            return <TaskListView tasks={sortedTasks} allTasks={tasks} onSelectTask={onSelectItem as (task: Task) => void} groupBy={groupBy} onStartFocus={onStartFocus} />;
        case 'calendar':
            return <TaskCalendarView tasks={tasks} onSelectTask={onSelectItem as (task: Task) => void} />;
        case 'table':
            return <TaskTableView tasks={sortedTasks} onSelectTask={onSelectItem as (task: Task) => void} />;
        default:
            return null;
    }
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700/80 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    {breadcrumb.length > 0 && (
                        <>
                            {breadcrumb.flatMap(l => [
                                <button key={l.id} onClick={() => onActiveSelectionChange({ type: 'list', id: l.id })} className="hover:underline">{l.name}</button>,
                                <span key={`${l.id}-slash`}>/</span>
                            ])}
                        </>
                    )}
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white truncate" title={title}>
                        {title}
                    </h2>
                    {currentList && (
                        <div className="relative" ref={listMenuRef}>
                            <button onClick={() => setIsListMenuOpen(p => !p)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                <EllipsisHorizontalIcon className="w-5 h-5"/>
                            </button>
                            {isListMenuOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-card-light dark:bg-card-dark rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700 py-1">
                                    <button onClick={() => { onOpenListModal({ listToEdit: currentList }); setIsListMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"><PencilIcon className="w-4 h-4" /> Edit List</button>
                                    {currentList.type === 'note' && (
                                        <button onClick={() => { onOpenListModal({ defaultType: 'note', defaultParentId: currentList.id }); setIsListMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"><FolderPlusIcon className="w-4 h-4" /> Add Subfolder</button>
                                    )}
                                    <button onClick={() => { if(window.confirm(`Delete "${currentList.name}"?`)) onDeleteList(currentList.id); setIsListMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><TrashIcon className="w-4 h-4" /> Delete List</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isTaskView && (
                        <div className="flex items-center bg-gray-200 dark:bg-gray-700/60 p-1 rounded-lg">
                            {currentList && (
                                <ViewButton title="Overview" isActive={viewType === 'overview'} onClick={() => setViewType('overview')}>
                                    <DashboardIcon className="w-5 h-5"/>
                                </ViewButton>
                            )}
                            <ViewButton title="Board View" isActive={viewType === 'board'} onClick={() => setViewType('board')}>
                                <ViewColumnsIcon className="w-5 h-5"/>
                            </ViewButton>
                            <ViewButton title="List View" isActive={viewType === 'list'} onClick={() => setViewType('list')}>
                                <QueueListIcon className="w-5 h-5"/>
                            </ViewButton>
                            <ViewButton title="Calendar View" isActive={viewType === 'calendar'} onClick={() => setViewType('calendar')}>
                                <CalendarDaysIcon className="w-5 h-5"/>
                            </ViewButton>
                            <ViewButton title="Table View" isActive={viewType === 'table'} onClick={() => setViewType('table')}>
                                <TableCellsIcon className="w-5 h-5"/>
                            </ViewButton>
                        </div>
                    )}
                    {isTaskView && viewType !== 'overview' && viewType !== 'calendar' && (
                         <div className="flex items-center gap-1">
                            <button onClick={() => setIsFilterVisible(p => !p)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/60" title="Filter"><FilterIcon className="w-5 h-5"/></button>
                            <div className="relative" ref={sortMenuRef}>
                                <button onClick={() => setIsSortMenuOpen(p => !p)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/60" title="Sort"><SortIcon className="w-5 h-5"/></button>
                                {isSortMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-card-light dark:bg-card-dark rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700 py-1">
                                        <DropdownMenuItem label="Default" current={sortType} value="default" set={setSortType} setOpen={setIsSortMenuOpen} />
                                        <DropdownMenuItem label="By Priority" current={sortType} value="priority" set={setSortType} setOpen={setIsSortMenuOpen} />
                                        <DropdownMenuItem label="By Due Date" current={sortType} value="dueDate" set={setSortType} setOpen={setIsSortMenuOpen} />
                                    </div>
                                )}
                            </div>
                            {viewType === 'list' && (
                                <div className="relative" ref={groupMenuRef}>
                                <button onClick={() => setIsGroupMenuOpen(p => !p)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/60" title="Group By"><GroupByIcon className="w-5 h-5"/></button>
                                {isGroupMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-card-light dark:bg-card-dark rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700 py-1">
                                        <DropdownMenuItem label="Default (by date)" current={groupBy} value="default" set={setGroupBy} setOpen={setIsGroupMenuOpen} />
                                        <DropdownMenuItem label="By Status" current={groupBy} value="status" set={setGroupBy} setOpen={setIsGroupMenuOpen} />
                                        <DropdownMenuItem label="By Priority" current={groupBy} value="priority" set={setGroupBy} setOpen={setIsGroupMenuOpen} />
                                        <DropdownMenuItem label="By Tag" current={groupBy} value="tag" set={setGroupBy} setOpen={setIsGroupMenuOpen} />
                                    </div>
                                )}
                                </div>
                            )}
                            {currentList && <button onClick={() => setIsExportModalOpen(true)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/60" title="Export"><ExportIcon className="w-5 h-5"/></button>}
                         </div>
                    )}
                    {currentList && <button onClick={() => onOpenAddItemPane(currentList.id, currentList.type)} className="flex items-center space-x-2 px-3 py-2 bg-primary text-white font-semibold text-sm rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 shadow-md"><PlusIcon className="w-5 h-5" /><span>Add New</span></button>}
                </div>
            </div>
            {isFilterVisible && isTaskView && <TaskFilterBar filter={taskFilter} onFilterChange={setTaskFilter} onSaveFilter={() => setIsSaveFilterModalOpen(true)} onClose={handleCloseFilter} />}
        </header>
        <div className="flex-grow overflow-y-auto">
            {renderContent()}
        </div>
        <SaveFilterModal isOpen={isSaveFilterModalOpen} onClose={() => setIsSaveFilterModalOpen(false)} onSave={handleSaveFilter} />
        <ExportOptionsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onExport={handleExport} customFieldDefinitions={customFieldDefinitions} listId={currentList?.id} />
    </div>
  );
};

export default MainContentView;