
import { storageService } from './storageService';
import { SavedFilter } from '../types';

const COLLECTION = 'SavedFilter';

export const savedFilterService = {
  getAll: (): Promise<SavedFilter[]> => storageService.getAll(COLLECTION),
  add: (data: Omit<SavedFilter, 'id'>): Promise<SavedFilter> => storageService.add(COLLECTION, data),
  delete: (id: number): Promise<void> => storageService.delete(COLLECTION, id),
};
