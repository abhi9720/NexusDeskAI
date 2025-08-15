import { webStorage } from './webStorage';
import { desktopStorage } from './desktopStorage';

export const isDesktop = !!window.desktopStorage;
console.log("Is Desktop: ", isDesktop);
console.log(window.desktopStorage);



// --- File Service ---
const saveAttachmentDesktop = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    // This relies on the preload script exposing 'saveAttachment' on electronStore
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
