import React from 'react';
import Sidebar from './Sidebar';
import MainContentView from './MainContentView';
import DetailPane from './DetailPane';
import { List, Task, Note, ActiveSelection, SavedFilter, StickyNote, TaskFilter, ChatSession, Goal, Habit, HabitLog, Comment } from '../types';
import StickyNotesView from './StickyNotesView';
import AIChatView from './AIChatView';
import DashboardView from './DashboardView';
import MomentumView from './MomentumView';
import SettingsView from './SettingsView';
import GlobalSearchModal from './GlobalSearchModal';
import AITaskParserModal from './AITaskParserModal';

interface AppLayoutProps {
  lists: List[];
  tasks: Task[];
  notes: Note[];
  savedFilters: SavedFilter[];
  stickyNotes: StickyNote[];
  chatSessions: ChatSession[];
  activeChatSessionId: string | null;
  onSendMessage: (message: string) => Promise<void>;
  onNewChat: () => void;
  onSelectChatSession: (sessionId: string) => void;
  activeSelection: ActiveSelection;
  onActiveSelectionChange: (selection: ActiveSelection) => void;
  detailItem: Task | Note | null;
  onDetailItemChange: (item: Task | Note | null) => void;
  onAddList: (list: Omit<List, 'id' | 'statuses'>) => void;
  onUpdateList: (list: List) => void;
  onDeleteList: (listId: string) => void;
  onAddItem: (item: Partial<Task & Note>, listId: string, type: 'task' | 'note') => Task | Note;
  onUpdateItem: (item: Task | Note) => void;
  onDeleteItem: (itemId: string, type: 'task' | 'note') => void;
  onAddComment: (taskId: string, content: string) => void;
  onAddSavedFilter: (name: string, filter: TaskFilter) => void;
  onDeleteSavedFilter: (filterId: string) => void;
  onAddStickyNote: () => void;
  onUpdateStickyNote: (note: StickyNote) => void;
  onDeleteStickyNote: (id: string) => void;
  goals: Goal[];
  habits: Habit[];
  habitLogs: HabitLog[];
  onUpsertGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onUpsertHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onToggleHabitLog: (habitId: string, date: Date) => void;
  userName: string;
  apiKey: string | null;
  onUpdateUser: (name: string) => void;
  onUpdateApiKey: (key: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  isTaskParserOpen: boolean;
  setIsTaskParserOpen: (isOpen: boolean) => void;
}

const AppLayout = (props: AppLayoutProps) => {
  const { detailItem, onDetailItemChange, activeSelection, userName, apiKey, onUpdateUser, onUpdateApiKey, isSearchOpen, setIsSearchOpen, isTaskParserOpen, setIsTaskParserOpen } = props;

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
      case 'settings':
        return <SettingsView 
            userName={userName}
            apiKey={apiKey}
            onUpdateUser={onUpdateUser}
            onUpdateApiKey={onUpdateApiKey}
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
          />;
    }
  };

  const handleSelectSearchItem = (item: Task | Note) => {
    onDetailItemChange(item);
    setIsSearchOpen(false);
  };

  return (
    <div className="h-screen w-screen flex">
      <Sidebar 
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
        onOpenTaskParser={() => setIsTaskParserOpen(true)}
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-brand-light dark:bg-brand-dark">
        {renderContent()}
      </main>
      
      <AITaskParserModal
        isOpen={isTaskParserOpen}
        onClose={() => setIsTaskParserOpen(false)}
        onAddItem={props.onAddItem}
        lists={props.lists}
      />
      
      {isSearchOpen && (
          <GlobalSearchModal
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              tasks={props.tasks}
              notes={props.notes}
              onSelectItem={handleSelectSearchItem}
           />
      )}

      {detailItem && (
        <>
          <div
            onClick={() => onDetailItemChange(null)}
            className="fixed inset-0 bg-black/20 z-30 animate-fade-in-overlay"
            aria-hidden="true"
          />
          <DetailPane
              item={detailItem}
              onClose={() => onDetailItemChange(null)}
              onUpdate={props.onUpdateItem}
              onDelete={props.onDeleteItem}
              onAddComment={props.onAddComment}
              key={detailItem.id}
          />
        </>
      )}
    </div>
  );
};

export default AppLayout;