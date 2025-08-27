import { Task } from '../types';
import { webStorage } from './webStorage';
import { desktopStorage } from './desktopStorage';

declare global {
    interface Window {
        desktopStorage: {
            getAll: (collection: string) => Promise<any[]>;
            getById: (collection: string, id: string | number) => Promise<any>;
            add: (collection: string, data: any) => Promise<any>;
            update: (collection: string, id: string | number, data: any) => Promise<any>;
            delete: (collection: string, id: string | number) => Promise<void>;
            saveAttachment: (file: { name: string, buffer: Uint8Array }) => Promise<string>;
            searchHybrid: (query: string) => Promise<Task[]>;
            sendNotification: (options: { title: string, body?: string }) => void;
        };
    }
}


export const isDesktop = !!window.desktopStorage;

// --- File Service ---
const saveAttachmentDesktop = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    // This relies on the preload script exposing 'saveAttachment' on desktopStorage
    const savedPath = await window.desktopStorage.saveAttachment({
        name: file.name,
        buffer: new Uint8Array(buffer),
    });
    return savedPath;
};

const saveAttachmentWeb = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

export const fileService = {
    saveAttachment: isDesktop ? saveAttachmentDesktop : saveAttachmentWeb,
};

// --- Storage Service ---
const storage = isDesktop ? desktopStorage : webStorage;

export const storageService = {
    ...storage,
    file: fileService,
};