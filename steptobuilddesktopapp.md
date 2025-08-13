main.js

```
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const createWindow = () => {
    const win = new BrowserWindow({
        fullscreen: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    win.loadURL(`file://${path.join(__dirname, 'dist', 'index.html')}`);
};
app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
```

---

package.json

```
{
  "name": "taskflow-ai",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron": "electron .",
    "dist": "vite build && electron-builder"
  },
  "dependencies": {
    "@google/genai": "^1.13.0",
    "date-fns": "^3.6.0",
    "marked": "^13.0.2",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "electron": "^37.2.6",
    "electron-builder": "^26.0.12",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  },
  "build": {
    "appId": "com.ai.taskflowai",
    "mac": {
      "category": "public.app-category.productivity"
    },
    "win": {
      "target": "nsis"
    },
    "files": [
      "dist/**/*",
      "main.js",
      "preload.js",
      "package.json"
    ]
  }
}
```

---

vite.config.ts
```
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist'
      }
    };
});
```