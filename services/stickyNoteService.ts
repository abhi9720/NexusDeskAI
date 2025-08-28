
import { storageService } from './storageService';
import { StickyNote, StickyNoteBoard, StickyNoteLink } from '../types';

const NOTE_COLLECTION = 'StickyNote';
const BOARD_COLLECTION = 'StickyNoteBoard';
const LINK_COLLECTION = 'StickyNoteLink';

export const stickyNoteService = {
  // Boards
  getAllBoards: (): Promise<StickyNoteBoard[]> => storageService.getAll(BOARD_COLLECTION),
  addBoard: (data: Omit<StickyNoteBoard, 'id'>): Promise<StickyNoteBoard> => storageService.add(BOARD_COLLECTION, data),
  updateBoard: (data: StickyNoteBoard): Promise<StickyNoteBoard> => storageService.update(BOARD_COLLECTION, data.id, data),
  deleteBoard: (id: number): Promise<void> => storageService.delete(BOARD_COLLECTION, id),

  // Notes
  getAllNotes: (): Promise<StickyNote[]> => storageService.getAll(NOTE_COLLECTION),
  addNote: (data: Omit<StickyNote, 'id'>): Promise<StickyNote> => storageService.add(NOTE_COLLECTION, data),
  updateNote: (data: StickyNote): Promise<StickyNote> => storageService.update(NOTE_COLLECTION, data.id, data),
  deleteNote: (id: number): Promise<void> => storageService.delete(NOTE_COLLECTION, id),

  // Links
  getAllLinks: (): Promise<StickyNoteLink[]> => storageService.getAll(LINK_COLLECTION),
  addLink: (data: Omit<StickyNoteLink, 'id'>): Promise<StickyNoteLink> => storageService.add(LINK_COLLECTION, data),
  updateLink: (data: StickyNoteLink): Promise<StickyNoteLink> => storageService.update(LINK_COLLECTION, data.id, data),
  deleteLink: (id: number): Promise<void> => storageService.delete(LINK_COLLECTION, id),
};
