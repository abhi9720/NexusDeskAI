
import { storageService } from './storageService';
import { List } from '../types';

const COLLECTION = 'List';

export const listService = {
  getAll: (): Promise<List[]> => storageService.getAll(COLLECTION),
  getById: (id: number): Promise<List> => storageService.getById(COLLECTION, id),
  add: (data: Omit<List, 'id'>): Promise<List> => storageService.add(COLLECTION, data),
  update: (data: List): Promise<List> => storageService.update(COLLECTION, data.id, data),
  delete: (id: number): Promise<void> => storageService.delete(COLLECTION, id),
};
