import React from 'react';
import Sidebar from './Sidebar';
import MainContentView from './MainContentView';
import DetailPane from './DetailPane';
import { List, Task, Note, ActiveSelection, SavedFilter, StickyNote, TaskFilter, ChatMessage, Goal, Habit, HabitLog } from '../types';
import StickyNotesView from './StickyNotesView';
import AIChatView from './AIChatView';
import { useTheme } from '../context/ThemeContext';
import DashboardView from './DashboardView';
import MomentumView from './MomentumView';

interface AppLayoutProps {
  lists: List[];
  tasks: Task[];
  notes: Note[];
  savedFilters: SavedFilter[];
  stickyNotes: StickyNote[];
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  activeSelection: ActiveSelection;
  onActiveSelectionChange: (selection: ActiveSelection) => void;
  detailItem: Task | Note | null;
  onDetailItemChange: (item: Task | Note | null) => void;
  onAddList: (list: Omit<List, 'id'>) => void;
  onUpdateList: (list: List) => void;
  onDeleteList: (listId: string) => void;
  onAddItem: (item: Partial<Task & Note>, listId: string, type: 'task' | 'note') => Task | Note;
  onUpdateItem: (item: Task | Note) => void;
  onDeleteItem: (itemId: string, type: 'task' | 'note') => void;
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
}

const AppLayout = (props: AppLayoutProps) => {
  const { detailItem, onDetailItemChange, activeSelection } = props;
  const { isDarkMode } = useTheme();

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
        return <AIChatView 
                  history={props.chatHistory} 
                  setHistory={props.setChatHistory}
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
          />;
    }
  };

  return (
    <div className={`h-screen w-screen flex text-gray-800 dark:text-gray-200 ${isDarkMode ? 'dark' : ''}`}>
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
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-brand-light dark:bg-brand-dark">
        {renderContent()}
      </main>
      {detailItem && (
        <DetailPane
            item={detailItem}
            onClose={() => onDetailItemChange(null)}
            onUpdate={props.onUpdateItem}
            onDelete={props.onDeleteItem}
            key={detailItem.id}
        />
      )}
    </div>
  );
};

export default AppLayout;