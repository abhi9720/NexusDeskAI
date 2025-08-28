
import { storageService } from './storageService';
import { Note } from '../types';

const COLLECTION = 'Note';

export const noteService = {
  getAll: (): Promise<Note[]> => storageService.getAll(COLLECTION),
  getById: (id: number): Promise<Note> => storageService.getById(COLLECTION, id),
  add: (data: Omit<Note, 'id'>): Promise<Note> => storageService.add(COLLECTION, data),
  update: (data: Note): Promise<Note> => storageService.update(COLLECTION, data.id, data),
  delete: (id: number): Promise<void> => storageService.delete(COLLECTION, id),
};
