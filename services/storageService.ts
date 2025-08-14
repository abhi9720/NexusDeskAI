export const isDesktop = !!window.electronStore;

// --- File Service ---
const saveAttachmentDesktop = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    // This relies on the preload script exposing 'saveAttachment' on electronStore
    const savedPath = await window.electronStore.saveAttachment({
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
const getDesktop = (key: string): Promise<any> => {
    return window.electronStore.get(key);
};

const setDesktop = (key: string, value: any): void => {
    window.electronStore.set(key, value);
};

const getWeb = async (key: string): Promise<any> => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error(`Error getting item ${key} from localStorage`, error);
        return null;
    }
};

const setWeb = (key: string, value: any): void => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error setting item ${key} in localStorage`, error);
    }
};

export const storageService = {
    get: isDesktop ? getDesktop : getWeb,
    set: isDesktop ? setDesktop : setWeb,
};