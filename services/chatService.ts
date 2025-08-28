
import { storageService } from './storageService';
import { ChatSession } from '../types';

const COLLECTION = 'ChatSession';

export const chatService = {
  getAll: (): Promise<ChatSession[]> => storageService.getAll(COLLECTION),
  add: (data: Omit<ChatSession, 'id'>): Promise<ChatSession> => storageService.add(COLLECTION, data),
  update: (data: ChatSession): Promise<ChatSession> => storageService.update(COLLECTION, data.id, data),
  delete: (id: number): Promise<void> => storageService.delete(COLLECTION, id),
};
