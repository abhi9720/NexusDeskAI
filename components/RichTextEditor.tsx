import React, { useRef, useLayoutEffect } from 'react';
import { ListBulletIcon } from './icons';

const RichTextEditor = ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Synchronize the div content with the value prop
    useLayoutEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        onChange(e.currentTarget.innerHTML);
    };

    const execCmd = (command: string) => {
        document.execCommand(command, false);
        if (editorRef.current) {
            editorRef.current.focus();
            onChange(editorRef.current.innerHTML);
        }
    };

    const ToolbarButton = ({ command, children, title }: { command: string; children: React.ReactNode; title: string }) => (
        <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd(command); }}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label={title}
            title={title}
        >
            {children}
        </button>
    );

    return (
        <div className="rounded-lg border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-primary bg-white dark:bg-gray-800">
            <div className="flex items-center p-1 border-b border-gray-200 dark:border-gray-700 space-x-1">
                <ToolbarButton command="bold" title="Bold">
                    <span className="font-bold w-5 h-5 flex items-center justify-center">B</span>
                </ToolbarButton>
                <ToolbarButton command="italic" title="Italic">
                     <span className="italic w-5 h-5 flex items-center justify-center">I</span>
                </ToolbarButton>
                <ToolbarButton command="underline" title="Underline">
                     <span className="underline w-5 h-5 flex items-center justify-center">U</span>
                </ToolbarButton>
                <ToolbarButton command="insertUnorderedList" title="Bulleted List">
                    <ListBulletIcon className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton command="insertOrderedList" title="Numbered List">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M2 4a1 1 0 011-1h1.5a1 1 0 011 1v.5a1 1 0 01-1 1H3a1 1 0 01-1-1v-.5zM2.5 3.5a.5.5 0 00-.5.5v.5c0 .28.22.5.5.5h1.5a.5.5 0 00.5-.5v-.5a.5.5 0 00-.5-.5H2.5zM2 9a1 1 0 011-1h1.5a1 1 0 011 1v.5a1 1 0 01-1 1H3a1 1 0 01-1-1v-.5zM2.5 8.5a.5.5 0 00-.5.5v.5c0 .28.22.5.5.5h1.5a.5.5 0 00.5-.5v-.5a.5.5 0 00-.5-.5H2.5zM2 14a1 1 0 011-1h1.5a1 1 0 011 1v.5a1 1 0 01-1 1H3a1 1 0 01-1-1v-.5zM2.5 13.5a.5.5 0 00-.5.5v.5c0 .28.22.5.5.5h1.5a.5.5 0 00.5-.5v-.5a.5.5 0 00-.5-.5H2.5z" />
                      <path d="M8 4a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zM8 9a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zM8 14a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    </svg>
                </ToolbarButton>
            </div>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="w-full min-h-[150px] p-3 focus:outline-none prose prose-sm dark:prose-invert max-w-none"
                data-placeholder={placeholder}
            />
        </div>
    );
};

export default RichTextEditor;
