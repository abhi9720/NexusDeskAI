// --- New Types for Organization ---
export type Theme = 'light' | 'dark' | 'system';

export interface ListStatusMapping {
  status: Status;
  name: string;
}

export interface List {
  id: string;
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
  id: string;
  name: string;
  filter: TaskFilter;
}

export interface StickyNote {
    id: string;
    title: string;
    content: string;
    color: string;
    position: { x: number; y: number };
}

// --- New Goal & Habit Tracking Types ---
export interface Goal {
    id: string;
    title: string;
    vision: string; // The "why"
    targetDate: string; // ISO string
    linkedProjectId: string | null; // Link to a project for automatic progress
    imageUrl?: string; // For a vision board feel
}

export type HabitFrequency = 'daily' | ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];

export interface Habit {
    id: string;
    name: string;
    frequency: HabitFrequency;
    linkedGoalId: string | null;
}

export interface HabitLog {
    id: string;
    habitId: string;
    date: string; // 'YYYY-MM-DD'
    completed: boolean;
}


export type ActiveSelection = 
  | { type: 'dashboard' }
  | { type: 'smart-list', id: 'today' | 'next-7-days' }
  | { type: 'list'; id: string }
  | { type: 'tag'; id: string }
  | { type: 'sticky-notes' }
  | { type: 'saved-filter', id: string }
  | { type: 'calendar' }
  | { type: 'ai-chat' }
  | { type: 'momentum' };

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
  id: string;
  name: string;
  type: string; // MIME type
  url: string; // Data URL
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userName: string;
  avatarUrl?: string;
}

export interface Task {
  id:string;
  listId: string;
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
}

export interface Note {
  id:string;
  listId: string;
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
  id: string;
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
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}