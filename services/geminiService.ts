import { GoogleGenAI, Type, FunctionDeclaration, Part, Content } from "@google/genai";
import { Task, TaskAnalysis, Note, NoteAnalysis, Priority, Status, ChatMessage, List } from '../types';
import { format } from 'date-fns';


let aiInstance: GoogleGenAI | null = null;
let hasWarned = false;

// This function is called from the main App component when the API key is loaded or updated.
export const initializeAi = (apiKey: string | null) => {
    if (apiKey) {
        aiInstance = new GoogleGenAI({ apiKey });
        hasWarned = false; // Reset warning if a key is provided
    } else {
        aiInstance = null;
    }
};

// Internal function to get the initialized instance.
const getAiInstance = (): GoogleGenAI | null => {
    if (aiInstance) return aiInstance;

    if (!hasWarned) {
        console.warn("Gemini API key not set. AI features are disabled. Please add your key in the Settings.");
        hasWarned = true;
    }
    return null;
};


export const runChat = async (history: ChatMessage[], message: string, tasks: Task[], lists: List[]) => {
    const gemini = getAiInstance();
    if (!gemini) return { text: "AI is not configured. Please set your API key." };

    const systemInstruction = `You are Prodify AI, a proactive and intelligent task management assistant. Your goal is to make task management effortless by understanding the user's intent from natural language.

    **Your Core Capabilities:**

    1.  **Answering Questions About Tasks:** You have been provided with a complete list of the user's tasks in the "Context for Today" section. When a user asks a question like "what are my tasks for today?" or "list my high priority items", you MUST use this provided list to formulate a direct answer.
        - **IMPORTANT:** Do not claim you cannot access tasks. You have been given all the necessary data.
        - **DO NOT** use tools for answering questions. Synthesize the answer yourself.

    2.  **Managing Tasks & Notes with Tools:** You can create, update, and delete tasks and notes using the provided tools.
        - **Confirm Destructive Actions:** Before updating or deleting, always ask for confirmation.
        - **Be Context-Aware:** Use the context to find item IDs when the user refers to them by name.
        - **Handle Ambiguity:** Ask for clarification if a name is not unique.

    **Context for Today:**
    - Today's Date: ${format(new Date(), 'yyyy-MM-dd')}
    - All Tasks: ${tasks.length > 0 ? tasks
        .map(t => JSON.stringify({
            id: t.id,
            title: t.title,
            description: t.description.substring(0, 50) + (t.description.length > 50 ? '...' : ''),
            dueDate: t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : 'not set',
            priority: t.priority,
            status: t.status,
            listId: t.listId
        }))
        .join(',\n') : 'No tasks found.'}
    - Available Task Lists: ${lists.filter(l => l.type === 'task').map(l => `"${l.name}" (id: ${l.id})`).join(', ') || 'None'}
    - Available Note Lists: ${lists.filter(l => l.type === 'note').map(l => `"${l.name}" (id: ${l.id})`).join(', ')}

    **Your Process for Tool Use:**
    1.  User makes a request to create, update, or delete an item (e.g., "remind me to call John tomorrow", "mark 'Call John' as complete").
    2.  You identify the task and its ID from the context.
    3.  For updates/deletions, you CONFIRM with the user.
    4.  **Wait for their explicit confirmation** (e.g., "yes", "looks good", "do it").
    5.  ONLY after confirmation, you call the appropriate function ('createTask', 'updateTask', 'deleteTask').
    `;

    const tools: FunctionDeclaration[] = [
        {
            name: "createTask",
            description: "Create a new task with a title, description, and optional due date and priority in a specific list.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of the task." },
                    description: { type: Type.STRING, description: "A detailed description of the task." },
                    dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format. If not provided, it will be set to today." },
                    priority: { type: Type.STRING, description: "The priority of the task. Can be 'High', 'Medium', or 'Low'." },
                    listId: { type: Type.STRING, description: "The ID of the list to add the task to. This is mandatory."}
                },
                required: ["title", "listId"],
            }
        },
        {
            name: "createNote",
            description: "Create a new note with a title and content in a specific list.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of the note." },
                    content: { type: Type.STRING, description: "The content of the note." },
                    listId: { type: Type.STRING, description: "The ID of the list to add the note to. This is mandatory."}
                },
                required: ["title", "listId"],
            }
        },
        {
            name: "updateTask",
            description: "Updates an existing task. Can be used to change its title, description, status, priority, or due date.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    taskId: { type: Type.STRING, description: "The ID of the task to update. This is mandatory." },
                    title: { type: Type.STRING, description: "The new title for the task." },
                    description: { type: Type.STRING, description: "The new description for the task." },
                    status: { 
                        type: Type.STRING, 
                        description: "The new status for the task.",
                        enum: Object.values(Status)
                    },
                    priority: {
                        type: Type.STRING,
                        description: "The new priority for the task.",
                        enum: Object.values(Priority)
                    },
                    dueDate: { type: Type.STRING, description: "The new due date in YYYY-MM-DD format." }
                },
                required: ["taskId"],
            }
        },
        {
            name: "deleteTask",
            description: "Deletes a task permanently. This action cannot be undone.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    taskId: { type: Type.STRING, description: "The ID of the task to delete. This is mandatory." }
                },
                required: ["taskId"],
            }
        }
    ];

    // Convert our app's message format to the Gemini API's format.
    const chatHistory: Content[] = history.slice(0, -1).map(msg => {
        const parts: Part[] = [];
        if (msg.text) {
            parts.push({ text: msg.text });
        }
        if (msg.toolCalls) {
            msg.toolCalls.forEach(tc => parts.push({ functionCall: { name: tc.name, args: tc.args } }));
        }
        return { role: msg.role, parts };
    });

    const chat = gemini.chats.create({
        model: "gemini-2.5-flash",
        config: {
            tools: [{ functionDeclarations: tools }],
            systemInstruction,
        },
        history: chatHistory,
    });

    const result = await chat.sendMessage({ message });
    
    // Check for function calls
    if (result.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
        const toolCalls = result.candidates[0].content.parts
            .filter(part => part.functionCall)
            .map(part => ({
                name: part.functionCall.name,
                args: part.functionCall.args
            }));

        return { toolCalls };
    }

    // Otherwise, return the text response
    return { text: result.text };
};


// --- Existing Analysis Functions ---

const taskAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
        type: Type.STRING,
        description: "A concise one-paragraph summary of the task's main goal."
    },
    complexity: {
      type: Type.STRING,
      description: "Estimate complexity: Simple (< 1 hour), Medium (1-4 hours), or Complex (> 4 hours)."
    },
    requiredSkills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of skills required to complete the task."
    },
     potentialBlockers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of potential blockers or challenges for this task."
    },
    subtasks: {
      type: Type.ARRAY,
      description: "A list of smaller, actionable subtasks to complete the main task.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The title of the subtask." },
          hours: { type: Type.NUMBER, description: "Estimated hours to complete the subtask." }
        },
        required: ["title", "hours"]
      }
    }
  },
  required: ["summary", "complexity", "requiredSkills", "potentialBlockers", "subtasks"]
};

export const analyzeTaskAndSuggestSubtasks = async (task: Task): Promise<TaskAnalysis | null> => {
  const gemini = getAiInstance();
  if (!gemini) return null;

  try {
    const prompt = `Analyze the following task and provide a detailed breakdown.
    Task Title: "${task.title}"
    Task Description: "${task.description}"
    
    Based on the provided information, perform the following actions:
    1.  Provide a concise one-paragraph summary of the task.
    2.  Estimate the complexity (Simple, Medium, or Complex).
    3.  List the required skills.
    4.  Identify potential blockers.
    5.  Break the task down into actionable subtasks with estimated hours for each.
    
    Return the response in the specified JSON format.`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: taskAnalysisSchema,
      },
    });
    
    const jsonStr = response.text.trim();
    if (!jsonStr) {
      console.error("Gemini API returned empty response for task analysis.");
      return null;
    }
    const result = JSON.parse(jsonStr);
    return result as TaskAnalysis;

  } catch (error) {
    console.error("Error analyzing task with Gemini:", error);
    return null;
  }
};

const noteAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise summary of the note, highlighting key points and action items."
        },
        tags: {
            type: Type.ARRAY,
            items: {type: Type.STRING},
            description: "A list of relevant tags based on the note's content, such as topics, projects, or people."
        }
    },
    required: ["summary", "tags"]
};


export const summarizeAndTagNote = async (note: Note): Promise<NoteAnalysis | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const prompt = `Analyze the following note. Provide a concise summary and suggest relevant tags.
        Note Title: "${note.title}"
        Note Content: "${note.content}"

        Return the response in the specified JSON format.`;

        const response = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: noteAnalysisSchema,
            },
        });
        
        const jsonStr = response.text.trim();
        if (!jsonStr) {
          console.error("Gemini API returned empty response for note analysis.");
          return null;
        }
        const result = JSON.parse(jsonStr);
        return result as NoteAnalysis;

    } catch (error) {
        console.error("Error analyzing note with Gemini:", error);
        return null;
    }
};

export const suggestTaskPriority = async (task: { title: string, description: string }): Promise<Priority | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const prompt = `Analyze the following task and determine its priority based on urgency and importance implied in the text.
        Task Title: "${task.title}"
        Task Description: "${task.description}"
        
        Respond with only one word: 'High', 'Medium', or 'Low'.`;

        const response = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        const text = response.text.trim();
        if (Object.values(Priority).includes(text as Priority)) {
            return text as Priority;
        }
        console.warn(`AI suggested an invalid priority: "${text}"`);
        return null;
    } catch (error) {
        console.error("Error suggesting priority:", error);
        return null;
    }
};

export const parseTasksFromText = async (text: string): Promise<{title: string, description: string}[] | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const prompt = `Analyze the following text, which could be meeting notes or a brain dump. Extract all distinct, actionable tasks. For each task, provide a clear title and a comprehensive description based on the context in the text. Ignore any non-task related content.
        
        Text to analyze:
        ---
        ${text}
        ---
        
        Return the response in the specified JSON format.`;

        const response = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: {
                                type: Type.STRING,
                                description: "A short, clear title for the task."
                            },
                            description: {
                                type: Type.STRING,
                                description: "A detailed description of what needs to be done for the task."
                            }
                        },
                        required: ["title", "description"]
                    }
                }
            }
        });

        const jsonStr = response.text.trim();
        if (!jsonStr) return null;
        const result = JSON.parse(jsonStr);
        return result as {title: string, description: string}[];

    } catch (error) {
        console.error("Error parsing tasks from text:", error);
        return null;
    }
}