// --- New Theme & Personalization Types ---

export type ThemeMode = 'light' | 'dark' | 'system';

export interface CustomTheme {
  id: string; 
  name: string;
  colors: {
    primary: string;            // Accent color for buttons, links, etc.
    pageBackgroundLight: string;   
    containerBackgroundLight: string; 
    cardBackgroundLight: string;    
    pageBackgroundDark: string;    
    containerBackgroundDark: string;  
    cardBackgroundDark: string;     
  };
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

export interface CustomFieldOption {
  id: number;
  value: string;
  color?: string;
}

export interface CustomFieldDefinition {
  id: number;
  name: string;
  type: CustomFieldType;
  options?: CustomFieldOption[]; // for 'select' type
  listId: number | null; // null for global, or a specific task list ID
}


// --- New Types for Organization ---
export interface ListStatusMapping {
  status: Status;
  name: string;
}

export interface List {
  id: number;
  name: string;
  color: string;
  type: 'task' | 'note';
  parentId: number | null; // For nesting lists/folders
  defaultView?: 'list' | 'board' | 'calendar' | 'table';
  statuses?: ListStatusMapping[];
}

export interface TaskFilter {
  status: Status | 'all';
  priority: Priority | 'all';
  keyword: string;
  overdue?: boolean;
}

export interface SavedFilter {
  id: number;
  name: string;
  filter: TaskFilter;
}

export interface StickyNote {
    id: number;
    title: string;
    content: string;
    color: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
}

// --- New Goal Tracking Types ---
export enum GoalStatus {
  OnTrack = 'On Track',
  AtRisk = 'At Risk',
  OffTrack = 'Off Track',
  Completed = 'Completed'
}

export interface JournalEntry {
  id: number;
  date: string; // ISO string
  entry: string; // HTML content
}

export interface Goal {
  id: number;
  title: string;
  motivation: string; // The "why"
  targetDate: string; // ISO string
  createdAt: string; // ISO string
  completedAt: string | null;
  status: GoalStatus;
  progress: number; // Calculated 0-100
  linkedTaskListIds: number[]; // Can link to multiple task lists
  journal: JournalEntry[];
}

// --- New Habit Tracking Types ---
export interface Habit {
  id: number;
  name: string;
  icon: string; // Icon name from react-icons
  color: string;
  frequency: 'daily' | 'weekly';
  targetDays?: number[]; // for weekly, e.g., [1, 3, 5] for Mon, Wed, Fri (0=Sun, 6=Sat)
  reminderTime?: string | null; // e.g., "09:00"
  createdAt: string;
}

export interface HabitLog {
  id: number;
  habitId: number;
  date: string; // YYYY-MM-DD ISO date string (e.g., 2023-10-27)
}

// --- New Reminder Type ---
export interface CustomReminder {
  id: number;
  title: string;
  remindAt: string; // ISO string
  isCompleted: boolean;
  createdAt: string; // ISO string
}

// --- New Gamification Types ---
export interface UserStats {
  id: number; // Should always be 1 for the single user
  points: number;
  currentStreak: number;
  lastCompletionDate: string | null; // ISO date string
}


export type ActiveSelection = 
  | { type: 'dashboard' }
  | { type: 'smart-list', id: 'today' }
  | { type: 'list'; id: number }
  | { type: 'tag'; id: string }
  | { type: 'sticky-notes' }
  | { type: 'saved-filter', id: number }
  | { type: 'calendar' }
  | { type: 'ai-chat' }
  | { type: 'goals' }
  | { type: 'habits' }
  | { type: 'reminders' }
  | { type: 'settings' }
  | { type: 'ai-task-parser' };

// --- Core Data Models (Updated) ---
export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum Status {
  Backlog = 'Backlog',
  ToDo = 'To Do',
  InProgress = 'In Progress',
  Review = 'Review',
  Waiting = 'Waiting',
  Done = 'Done',
}

export interface Attachment {
  id: number;
  name: string;
  type: string; // MIME type
  url: string; // Data URL
}

export interface ChecklistItem {
  id: number;
  text: string;
  completed: boolean;
}

export interface FocusItem {
  task: Task;
  subtask?: ChecklistItem;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  userName: string;
  avatarUrl?: string;
}

export type ActivityType = 'created' | 'status' | 'priority' | 'comment' | 'focus';

export interface ActivityLog {
  id: number;
  type: ActivityType;
  content: {
      from?: string; // e.g., 'To Do'
      to?: string; // e.g., 'In Progress'
      commentContent?: string;
      duration?: number; // for focus sessions, in minutes
      focusedOn?: string; // description of what was focused on
  };
  taskTitle: string;
  createdAt: string;
  userName: string;
}

export interface Task {
  id: number;
  listId: number;
  title: string;
  description:string;
  status: Status;
  priority: Priority;
  dueDate: string;
  reminder?: string | null; // Specific reminder date/time
  tags: string[];
  createdAt: string;
  attachments: Attachment[];
  checklist: ChecklistItem[];
  comments: Comment[];
  activityLog: ActivityLog[];
  customFields: { [fieldId: number]: any }; // For string, number, date string, optionId, or boolean
  linkedNoteIds?: number[];
}

export interface Note {
  id: number;
  listId: number;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

// --- AI Service Types ---
export interface Subtask {
  title: string;
  // hours: number; // simplified to just title to be used in checklist
}

export interface TaskAnalysis {
  summary: string;
  complexity: string;
  requiredSkills: string[];
  potentialBlockers: string[];
  subtasks: Subtask[];
}

export interface NoteAnalysis {
  summary: string;
  tags: string[];
}

export interface GoalInsight {
    riskLevel: 'Low' | 'Medium' | 'High';
    riskReasoning: string;
    nextActionSuggestion: string;
}

// --- Briefing & Wind-Down Types ---
export interface MorningBriefingTask {
    id: number;
    title: string;
    priority: Priority;
    isGoalRelated: boolean;
}

export interface MorningBriefing {
    topPriorities: MorningBriefingTask[];
    overdueTaskCount: number;
    motivationalNudge: string;
}

export interface EveningSummary {
    celebratoryMessage: string;
    reflectivePrompt: string;
}


// --- AI Chat Types ---

export interface ToolCall {
  name: string;
  args: any;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  text: string;
  toolCalls?: ToolCall[];
  toolResult?: {
    callId: string;
    toolName: string;
    data: any; // The result of the tool call (e.g., the created task object)
    status: 'ok' | 'error';
  };
}

export interface ChatSession {
  id: number;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}