import * as React from 'react';
import Sidebar from './Sidebar';
import MainContentView from './MainContentView';
import DetailPane from './DetailPane';
import { List, Task, Note, ActiveSelection, SavedFilter, StickyNote, TaskFilter, ChatSession, Goal, Comment, CustomFieldDefinition, UserStats, ChecklistItem, Habit, HabitLog, CustomReminder } from '../types';
import StickyNotesView from './StickyNotesView';
import AIChatView from './AIChatView';
import DashboardView from './DashboardView';
import GoalsView from './goals/GoalsView';
import SettingsView from './SettingsView';
import GlobalSearchModal from './GlobalSearchModal';
import AITaskParserView from './AITaskParserView';
import { ChevronRightIcon } from './icons';
import HabitsView from './HabitsView';
import RemindersView from './RemindersView';

interface AppLayoutProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  lists: List[];
  tasks: Task[];
  notes: Note[];
  savedFilters: SavedFilter[];
  stickyNotes: StickyNote[];
  chatSessions: ChatSession[];
  activeChatSessionId: number | null;
  onSendMessage: (message: string) => Promise<void>;
  onNewChat: () => void;
  onSelectChatSession: (sessionId: number) => void;
  activeSelection: ActiveSelection;
  onActiveSelectionChange: (selection: ActiveSelection) => void;
  detailItem: Task | Note | null;
  onDetailItemChange: (item: Task | Note | null) => void;
  addingItemInfo: { type: 'task' | 'note', listId: number } | null;
  onOpenAddItemPane: (listId: number, type: 'task' | 'note') => void;
  onCloseDetailPane: () => void;
  onAddList: (list: Omit<List, 'id' | 'statuses'>) => Promise<List>;
  onUpdateList: (list: List) => void;
  onDeleteList: (listId: number) => void;
  onAddItem: (item: Partial<Task & Note>, listId: number, type: 'task' | 'note') => Promise<Task | Note>;
  onUpdateItem: (item: Task | Note) => void;
  onDeleteItem: (itemId: number, type: 'task' | 'note') => void;
  onAddComment: (taskId: number, content: string) => void;
  onAddSavedFilter: (name: string, filter: TaskFilter) => void;
  onDeleteSavedFilter: (filterId: number) => void;
  onAddStickyNote: () => void;
  onUpdateStickyNote: (note: StickyNote) => void;
  onDeleteStickyNote: (id: number) => void;
  goals: Goal[];
  onUpsertGoal: (goal: Omit<Goal, 'id'> & { id?: number }) => void;
  onDeleteGoal: (goalId: number) => void;
  onSelectGoal: (goalId: number) => void;
  habits: Habit[];
  habitLogs: HabitLog[];
  onUpsertHabit: (habit: Omit<Habit, 'id'> & { id?: number }) => void;
  onDeleteHabit: (habitId: number) => void;
  onAddHabitLog: (habitId: number, date: string) => void;
  customReminders: CustomReminder[];
  onUpsertCustomReminder: (reminder: Omit<CustomReminder, 'id'> & { id?: number }) => void;
  onDeleteCustomReminder: (reminderId: number) => void;
  userStats: UserStats | null;
  userName: string;
  apiKey: string | null;
  onUpdateUser: (name: string) => void;
  onUpdateApiKey: (key: string) => void;
  customFieldDefinitions: CustomFieldDefinition[];
  setCustomFieldDefinitions: (definitions: CustomFieldDefinition[]) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  onStartFocus: (task: Task) => void;
  onStartSubtaskFocus: (task: Task, subtask: ChecklistItem) => void;
  isAiLoading: boolean;
  onQuickAddTask: (text: string) => Promise<void>;
}

const AppLayout = (props: AppLayoutProps) => {
  const { detailItem, onDetailItemChange, addingItemInfo, onOpenAddItemPane, onCloseDetailPane, onAddItem, activeSelection, userName, apiKey, onUpdateUser, onUpdateApiKey, customFieldDefinitions, setCustomFieldDefinitions, isSearchOpen, setIsSearchOpen, onStartFocus, onStartSubtaskFocus, isSidebarCollapsed, onToggleSidebar, userStats, isAiLoading, onQuickAddTask } = props;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  const renderContent = () => {
    switch (activeSelection.type) {
      case 'dashboard':
        return <DashboardView
            tasks={props.tasks}
            notes={props.notes}
            lists={props.lists}
            goals={props.goals}
            habits={props.habits}
            habitLogs={props.habitLogs}
            onSelectItem={onDetailItemChange}
            onActiveSelectionChange={props.onActiveSelectionChange}
            onSelectGoal={props.onSelectGoal}
            onUpdateItem={props.onUpdateItem as (task: Task) => void}
            onAddHabitLog={props.onAddHabitLog}
          />;
      case 'ai-chat':
        const activeSession = props.activeChatSessionId
            ? props.chatSessions.find(s => s.id === props.activeChatSessionId)
            : null;
        return <AIChatView 
                  activeSession={activeSession || null}
                  sessions={props.chatSessions}
                  onSendMessage={props.onSendMessage}
                  onNewChat={props.onNewChat}
                  onSelectChatSession={props.onSelectChatSession}
                  onAddItem={props.onAddItem}
                  onDetailItemChange={onDetailItemChange}
                  onActiveSelectionChange={props.onActiveSelectionChange}
                  activeSelection={activeSelection}
                  isLoading={isAiLoading}
                />;
      case 'sticky-notes':
        return <StickyNotesView
           notes={props.stickyNotes}
           onAddNote={props.onAddStickyNote}
           onUpdateNote={props.onUpdateStickyNote}
           onDeleteNote={props.onDeleteStickyNote}
        />;
      case 'goals':
        return <GoalsView
            goals={props.goals}
            tasks={props.tasks}
            lists={props.lists}
            onUpsertGoal={props.onUpsertGoal}
            onDeleteGoal={props.onDeleteGoal}
            onAddItem={props.onAddItem}
            onAddList={props.onAddList}
            onSelectItem={onDetailItemChange}
          />;
      case 'habits':
        return <HabitsView
            habits={props.habits}
            habitLogs={props.habitLogs}
            onUpsertHabit={props.onUpsertHabit}
            onDeleteHabit={props.onDeleteHabit}
            onAddHabitLog={props.onAddHabitLog}
        />;
      case 'reminders':
        return <RemindersView
            reminders={props.customReminders}
            onUpsertReminder={props.onUpsertCustomReminder}
            onDeleteReminder={props.onDeleteCustomReminder}
        />;
      case 'ai-task-parser':
        return <AITaskParserView 
            onAddItem={props.onAddItem}
            lists={props.lists}
        />;
      case 'settings':
        return <SettingsView 
            userName={userName}
            apiKey={apiKey}
            onUpdateUser={onUpdateUser}
            onUpdateApiKey={onUpdateApiKey}
            customFieldDefinitions={customFieldDefinitions}
            setCustomFieldDefinitions={setCustomFieldDefinitions}
            lists={props.lists}
          />;
      default:
         return <MainContentView 
              activeSelection={activeSelection}
              lists={props.lists}
              tasks={props.tasks}
              notes={props.notes}
              savedFilters={props.savedFilters}
              onSelectItem={onDetailItemChange}
              onUpdateItem={props.onUpdateItem}
              onAddSavedFilter={props.onAddSavedFilter}
              onAddItem={props.onAddItem}
              onUpdateList={props.onUpdateList}
              onStartFocus={onStartFocus}
              onOpenAddItemPane={onOpenAddItemPane}
              customFieldDefinitions={props.customFieldDefinitions}
              onActiveSelectionChange={props.onActiveSelectionChange}
          />;
    }
  };

  const handleSelectSearchItem = (item: Task | Note) => {
    onDetailItemChange(item);
    setIsSearchOpen(false);
  };

  const isDetailPaneOpen = !!detailItem || !!addingItemInfo;

  const currentListForDetailItem = React.useMemo(() => {
    const listId = detailItem?.listId || addingItemInfo?.listId;
    if (!listId) return undefined;
    return props.lists.find(l => l.id === listId);
  }, [detailItem, addingItemInfo, props.lists]);

  return (
    <div className="h-full w-full flex">
      {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            aria-hidden="true"
          />
      )}
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggle={onToggleSidebar}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        lists={props.lists}
        tasks={props.tasks}
        notes={props.notes}
        savedFilters={props.savedFilters}
        activeSelection={props.activeSelection}
        onActiveSelectionChange={props.onActiveSelectionChange}
        onAddList={props.onAddList}
        onUpdateList={props.onUpdateList}
        onDeleteList={props.onDeleteList}
        onDeleteSavedFilter={props.onDeleteSavedFilter}
        onDetailItemChange={props.onDetailItemChange}
        userName={userName}
        userStats={userStats}
        onOpenSearch={() => setIsSearchOpen(true)}
        onQuickAddTask={onQuickAddTask}
        isAiLoading={isAiLoading}
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-page dark:bg-page-dark">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden fixed top-1/2 -translate-y-1/2 left-0 z-30 p-2 pl-1 pr-0 text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-black/80 rounded-r-full backdrop-blur-sm border-t border-b border-r border-gray-200 dark:border-gray-700 shadow-lg"
          aria-label="Open menu"
        >
          <ChevronRightIcon className="w-6 h-6"/>
        </button>
        {renderContent()}
      </main>
      
      {isSearchOpen && (
          <GlobalSearchModal
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              tasks={props.tasks}
              notes={props.notes}
              onSelectItem={handleSelectSearchItem}
           />
      )}

      {isDetailPaneOpen && (
        <>
          <div
            onClick={onCloseDetailPane}
            className="fixed inset-0 bg-black/20 z-30 animate-fade-in-overlay"
            aria-hidden="true"
          />
          <DetailPane
              item={detailItem}
              list={currentListForDetailItem}
              itemTypeToAdd={addingItemInfo?.type}
              listIdToAdd={addingItemInfo?.listId}
              onClose={onCloseDetailPane}
              onUpdate={props.onUpdateItem}
              onAddItem={onAddItem}
              onDelete={props.onDeleteItem}
              onAddComment={props.onAddComment}
              onStartFocus={onStartFocus}
              onStartSubtaskFocus={onStartSubtaskFocus}
              customFieldDefinitions={props.customFieldDefinitions}
              key={detailItem?.id || 'add-pane'}
              isSidebarCollapsed={isSidebarCollapsed}
              allNotes={props.notes}
              onDetailItemChange={onDetailItemChange}
          />
        </>
      )}
    </div>
  );
};

export default AppLayout;