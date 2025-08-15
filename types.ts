// --- New Theme & Personalization Types ---

export type ThemeMode = 'light' | 'dark' | 'system';

export interface CustomTheme {
  id: string; // Stays string as it's not in the main DB
  name: string;
  colors: {
    primary: string;      // Accent
    brandLight: string;   // Page background (Light)
    sidebarLight: string; // Sidebar background (Light)
    cardLight: string;    // Card background (Light)
    brandDark: string;    // Page background (Dark)
    sidebarDark: string;  // Sidebar background (Dark)
    cardDark: string;     // Card background (Dark)
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
  defaultView?: 'list' | 'board' | 'calendar';
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
}

// --- New Goal & Habit Tracking Types ---
export interface Goal {
    id: number;
    title: string;
    vision: string; // The "why"
    targetDate: string; // ISO string
    linkedProjectId: number | null; // Link to a project for automatic progress
    imageUrl?: string; // For a vision board feel
}

export type HabitFrequency = 'daily' | ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];

export interface Habit {
    id: number;
    name: string;
    frequency: HabitFrequency;
    linkedGoalId: number | null;
}

export interface HabitLog {
    id: number;
    habitId: number;
    date: string; // 'YYYY-MM-DD'
    completed: boolean;
}


export type ActiveSelection = 
  | { type: 'dashboard' }
  | { type: 'smart-list', id: 'today' | 'next-7-days' }
  | { type: 'list'; id: number }
  | { type: 'tag'; id: string }
  | { type: 'sticky-notes' }
  | { type: 'saved-filter', id: number }
  | { type: 'calendar' }
  | { type: 'ai-chat' }
  | { type: 'momentum' }
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

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  userName: string;
  avatarUrl?: string;
}

export type ActivityType = 'created' | 'status' | 'priority' | 'comment';

export interface ActivityLog {
  id: number;
  type: ActivityType;
  content: {
      from?: string; // e.g., 'To Do'
      to?: string; // e.g., 'In Progress'
      commentContent?: string;
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
  tags: string[];
  createdAt: string;
  attachments: Attachment[];
  checklist: ChecklistItem[];
  comments: Comment[];
  activityLog: ActivityLog[];
  customFields: { [fieldId: number]: any }; // For string, number, date string, optionId, or boolean
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
  hours: number;
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