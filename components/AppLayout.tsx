import * as React from 'react';
import Sidebar from './Sidebar';
import MainContentView from './MainContentView';
import DetailPane from './DetailPane';
import { List, Task, Note, ActiveSelection, SavedFilter, StickyNote, TaskFilter, ChatSession, Goal, Habit, HabitLog, Comment, CustomFieldDefinition } from '../types';
import StickyNotesView from './StickyNotesView';
import AIChatView from './AIChatView';
import DashboardView from './DashboardView';
import MomentumView from './MomentumView';
import SettingsView from './SettingsView';
import GlobalSearchModal from './GlobalSearchModal';
import AITaskParserView from './AITaskParserView';

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
  onAddList: (list: Omit<List, 'id' | 'statuses'>) => void;
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
  habits: Habit[];
  habitLogs: HabitLog[];
  onUpsertGoal: (goal: Omit<Goal, 'id'> & { id?: number }) => void;
  onDeleteGoal: (goalId: number) => void;
  onUpsertHabit: (habit: Omit<Habit, 'id'> & { id?: number }) => void;
  onDeleteHabit: (habitId: number) => void;
  onToggleHabitLog: (habitId: number, date: Date) => void;
  userName: string;
  apiKey: string | null;
  onUpdateUser: (name: string) => void;
  onUpdateApiKey: (key: string) => void;
  customFieldDefinitions: CustomFieldDefinition[];
  setCustomFieldDefinitions: (definitions: CustomFieldDefinition[]) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  onStartFocus: (task: Task) => void;
}

const AppLayout = (props: AppLayoutProps) => {
  const { detailItem, onDetailItemChange, addingItemInfo, onOpenAddItemPane, onCloseDetailPane, onAddItem, activeSelection, userName, apiKey, onUpdateUser, onUpdateApiKey, customFieldDefinitions, setCustomFieldDefinitions, isSearchOpen, setIsSearchOpen, onStartFocus, isSidebarCollapsed, onToggleSidebar } = props;

  const renderContent = () => {
    switch (activeSelection.type) {
      case 'dashboard':
        return <DashboardView
            tasks={props.tasks}
            notes={props.notes}
            lists={props.lists}
            onSelectItem={onDetailItemChange}
            onActiveSelectionChange={props.onActiveSelectionChange}
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
                />;
      case 'sticky-notes':
        return <StickyNotesView
           notes={props.stickyNotes}
           onAddNote={props.onAddStickyNote}
           onUpdateNote={props.onUpdateStickyNote}
           onDeleteNote={props.onDeleteStickyNote}
        />;
      case 'momentum':
        return <MomentumView
            goals={props.goals}
            habits={props.habits}
            habitLogs={props.habitLogs}
            tasks={props.tasks}
            lists={props.lists}
            onUpsertGoal={props.onUpsertGoal}
            onDeleteGoal={props.onDeleteGoal}
            onUpsertHabit={props.onUpsertHabit}
            onDeleteHabit={props.onDeleteHabit}
            onToggleHabitLog={props.onToggleHabitLog}
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
              customFieldDefinitions={customFieldDefinitions}
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
    <div className="h-screen w-screen flex">
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggle={onToggleSidebar}
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
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-brand-light dark:bg-brand-dark">
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
              customFieldDefinitions={props.customFieldDefinitions}
              key={detailItem?.id || 'add-pane'}
          />
        </>
      )}
    </div>
  );
};

export default AppLayout;