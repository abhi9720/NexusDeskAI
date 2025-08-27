

import { GoogleGenAI, Type, FunctionDeclaration, Part, Content } from "@google/genai";
import { Task, TaskAnalysis, Note, NoteAnalysis, Priority, Status, ChatMessage, List, Goal, GoalInsight, GoalStatus, ChecklistItem, MorningBriefing, EveningSummary } from '../types';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import startOfDay from 'date-fns/startOfDay';
import { isDesktop } from './storageService';


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

const levenshtein = (s1: string, s2: string): number => {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let j = 1; j <= len2; j++) {
        for (let i = 1; i <= len1; i++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[len1][len2];
};


export const runChat = async (history: ChatMessage[], message: string, tasks: Task[], lists: List[]) => {
    const gemini = getAiInstance();
    if (!gemini) return { text: "AI is not configured. Please set your API key." };

    const systemInstruction = `You are Prodify AI, a proactive and intelligent task management assistant. Your goal is to make task management effortless by understanding the user's intent from natural language.

    **Your Core Capabilities:**

    1.  **Answering Questions About Tasks:** To answer any questions about tasks (e.g., "what are my tasks for today?", "list my high priority items", "find tasks about Apollo"), you MUST use the \`searchTasks\` tool. Provide the user's full question as the query for the tool. Do not try to answer from memory or context.
        - **IMPORTANT:** Do not claim you cannot access tasks. Use the \`searchTasks\` tool.

    2.  **Managing Tasks & Notes with Other Tools:** You can create, update, and delete tasks and notes. You can also add new items to a task's checklist ('addChecklistItem') or check/uncheck existing ones ('updateChecklistItem').
        - To modify or delete a task, you MUST provide its title via the \`taskTitle\` parameter. Be as specific as possible to avoid ambiguity. Be tolerant of minor typos in task titles.
        - **Directly Create:** For creation requests, call the tool directly without asking for confirmation.
        - **Confirm Before Destructive Actions:** For any request that modifies or deletes existing data, you MUST first confirm with the user. Say "I will update the status of 'Task Name' to 'Done'. Do you want to go ahead?" and then wait for their explicit confirmation (e.g., "yes") before calling the tool.
        - **Be Context-Aware:** Use the provided list context to find list IDs when the user refers to them by name.
        - **Handle Ambiguity:** If a name is not unique (e.g., two tasks named "Call John"), ask for clarification.

    **Context for Today:**
    - Today's Date: ${format(new Date(), 'yyyy-MM-dd')}
    - Available Task Lists: ${lists.filter(l => l.type === 'task').map(l => `"${l.name}" (id: ${l.id})`).join(', ') || 'None'}
    - Available Note Lists: ${lists.filter(l => l.type === 'note').map(l => `"${l.name}" (id: ${l.id})`).join(', ')}
    `;

    const searchTasksTool: FunctionDeclaration = {
        name: "searchTasks",
        description: "Searches for tasks based on a natural language query. Use this for any questions about tasks, like 'what are my tasks for today?' or 'list my high priority items about Apollo'.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: "The user's full natural language query for searching tasks." },
            },
            required: ["query"],
        }
    };

    const tools: FunctionDeclaration[] = [
        searchTasksTool,
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
                    taskTitle: { type: Type.STRING, description: "The title of the task to update. This is mandatory." },
                    newTitle: { type: Type.STRING, description: "The new title for the task." },
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
                required: ["taskTitle"],
            }
        },
        {
            name: "deleteTask",
            description: "Deletes a task permanently. This action cannot be undone.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    taskTitle: { type: Type.STRING, description: "The title of the task to delete. This is mandatory." }
                },
                required: ["taskTitle"],
            }
        },
        {
            name: "addChecklistItem",
            description: "Adds a new checklist item to a specific task.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    taskTitle: { type: Type.STRING, description: "The title of the task to add the item to." },
                    itemText: { type: Type.STRING, description: "The text of the new checklist item." }
                },
                required: ["taskTitle", "itemText"],
            }
        },
        {
            name: "updateChecklistItem",
            description: "Checks or unchecks a specific item in a task's checklist.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    taskTitle: { type: Type.STRING, description: "The title of the task containing the checklist." },
                    checklistItemText: { type: Type.STRING, description: "The exact text of the checklist item to update." },
                    completed: { type: Type.BOOLEAN, description: "Set to true to check the item, false to uncheck it." }
                },
                required: ["taskTitle", "checklistItemText", "completed"],
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
    
    const functionCalls = result.candidates?.[0]?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);

    if (functionCalls && functionCalls.length > 0) {
        // If the only tool call is searchTasks, handle it here.
        if (functionCalls.length === 1 && functionCalls[0].name === 'searchTasks') {
            const { query } = functionCalls[0].args;
            let searchResults;

            // Unified task search logic for both web and desktop to fix context-awareness issues.
            const lowerQuery = String(query).toLowerCase();
            
            const matchingList = lists.find(l => l.type === 'task' && lowerQuery.includes(l.name.toLowerCase()));
            
            if (matchingList) {
                let listTasks = tasks.filter(t => t.listId === matchingList.id);
                if (lowerQuery.includes('pending') || lowerQuery.includes('to do') || lowerQuery.includes('in progress')) {
                    listTasks = listTasks.filter(t => t.status !== Status.Done);
                }
                if (lowerQuery.includes('overdue')) {
                    listTasks = listTasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== Status.Done);
                }
                searchResults = listTasks;
            } else if (lowerQuery.includes('today')) {
                searchResults = tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)));
            } else if (lowerQuery.includes('overdue')) {
                searchResults = tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== Status.Done);
            } else if (lowerQuery.includes('high priority')) {
                searchResults = tasks.filter(t => t.priority === Priority.High);
            } else if (lowerQuery.includes('medium priority')) {
                searchResults = tasks.filter(t => t.priority === Priority.Medium);
            } else if (lowerQuery.includes('low priority')) {
                searchResults = tasks.filter(t => t.priority === Priority.Low);
            } else if (lowerQuery.includes('pending') || lowerQuery.includes('all tasks')) {
                searchResults = tasks.filter(t => t.status !== Status.Done);
            } else {
                searchResults = tasks.filter(t => {
                    const title = t.title.toLowerCase();
                    const tolerance = Math.floor(lowerQuery.length / 5); // Allow 1 typo for every 5 chars
                    if (levenshtein(lowerQuery, title) <= tolerance) {
                        return true;
                    }
                    return title.includes(lowerQuery);
                });
            }

            const sanitizedResults = searchResults.map((t: Task) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate,
            }));

            // Send results back to the model to get a natural language response
            const responseResult = await chat.sendMessage({
              message: [
                {
                    functionResponse: {
                        name: 'searchTasks',
                        response: {
                            tasks: sanitizedResults
                        }
                    }
                }
              ]
            });
            
            return { text: responseResult.text };
        } else {
            // Handle other tool calls (create, update, etc.) by returning them to App.tsx as before.
            const toolCallsToReturn = functionCalls.map(fc => ({
                name: fc.name,
                args: fc.args
            }));
            return { toolCalls: toolCallsToReturn };
        }
    }

    // Otherwise, return the text response
    return { text: result.text };
};


// --- Analysis & Suggestion Functions ---

// 1. Task Analysis
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
        },
        required: ["title"]
      }
    }
  },
  required: ["summary", "complexity", "requiredSkills", "potentialBlockers", "subtasks"]
};

export const analyzeTaskAndSuggestSubtasks = async (task: Task): Promise<TaskAnalysis | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const prompt = `Analyze the following task and provide a summary, complexity, required skills, potential blockers, and a list of actionable subtasks.
        Task Title: ${task.title}
        Description: ${task.description}`;

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: taskAnalysisSchema,
            }
        });

        const jsonString = result.text.trim();
        const analysis = JSON.parse(jsonString);
        return analysis as TaskAnalysis;
    } catch (error) {
        console.error("Error analyzing task:", error);
        return null;
    }
};

// 2. Note Analysis
const noteAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise one-paragraph summary of the note's content."
        },
        tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 3-5 relevant keywords or tags for this note."
        }
    },
    required: ["summary", "tags"]
};

export const summarizeAndTagNote = async (note: Note): Promise<NoteAnalysis | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const contentSnippet = note.content.replace(/<[^>]*>?/gm, '').substring(0, 2000);
        const prompt = `Summarize the following note and suggest relevant tags.
        Note Title: ${note.title}
        Note Content: ${contentSnippet}`;

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: noteAnalysisSchema,
            }
        });
        
        const jsonString = result.text.trim();
        const analysis = JSON.parse(jsonString);
        return analysis as NoteAnalysis;
    } catch (error) {
        console.error("Error analyzing note:", error);
        return null;
    }
};

// 3. Writing Assistance
export const assistWriting = async (text: string): Promise<string | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const prompt = `You are a writing assistant. Improve the following text for clarity, grammar, and tone. Keep the core meaning the same. Return only the improved text, without any preamble or explanation.
        Text to improve:
        ---
        ${text}
        ---`;

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return result.text;
    } catch (error) {
        console.error("Error assisting with writing:", error);
        return null;
    }
};

// 4. Task Parsing from Text
const taskParserSchema = {
    type: Type.OBJECT,
    properties: {
        tasks: {
            type: Type.ARRAY,
            description: "A list of tasks extracted from the text.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "A concise, actionable title for the task." },
                    description: { type: Type.STRING, description: "A brief description of what needs to be done. Can be empty." },
                    checklist: {
                        type: Type.ARRAY,
                        description: "A list of sub-items if the task can be broken down further. Optional.",
                        items: { type: Type.STRING }
                    }
                },
                required: ["title", "description"]
            }
        }
    },
    required: ["tasks"]
};

export const parseTasksFromText = async (text: string): Promise<{ title: string; description: string; checklist?: string[] }[] | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const prompt = `Analyze the following text and extract any actionable tasks. For each task, create a title, a short description, and if applicable, a checklist of sub-items.
        Text to analyze:
        ---
        ${text}
        ---`;

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: taskParserSchema,
            }
        });
        
        const jsonString = result.text.trim();
        const parsed = JSON.parse(jsonString);
        return parsed.tasks || [];
    } catch (error) {
        console.error("Error parsing tasks from text:", error);
        return null;
    }
};

// 5. Quick Add Task Parsing
const quickTaskParserSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The main title of the task. Exclude all other metadata like date, priority, and list name from the title." },
      listName: { type: Type.STRING, description: "The name of the project or list for the task. Extract from a hashtag like #ProjectName. If not present, this field should be null." },
      priority: {
        type: Type.STRING,
        description: "The priority. Map p1, prio 1, or high to 'High'; p2, prio 2, or medium to 'Medium'; p3, prio 3, or low to 'Low'. Default to 'Medium' if not specified.",
        enum: Object.values(Priority)
      },
      dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format. Interpret relative dates like 'today', 'tomorrow' or 'next Friday' based on the current date. If not specified, this field should be null." }
    },
    required: ["title"]
};

export const parseQuickAddTask = async (text: string): Promise<{ title: string; listName?: string; priority?: Priority; dueDate?: string; } | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const prompt = `Parse the following text into a structured task object.
        Current date is ${format(new Date(), 'yyyy-MM-dd')}.
        Text to parse: "${text}"`;

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quickTaskParserSchema,
            }
        });
        
        const jsonString = result.text.trim();
        const parsed = JSON.parse(jsonString);
        return parsed;
    } catch (error) {
        console.error("Error parsing quick add task:", error);
        return null;
    }
};

// 6. Goal Insights
const goalInsightSchema = {
    type: Type.OBJECT,
    properties: {
        riskLevel: {
            type: Type.STRING,
            description: "The risk level for achieving the goal.",
            enum: ['Low', 'Medium', 'High']
        },
        riskReasoning: {
            type: Type.STRING,
            description: "A brief, one-sentence explanation for the assessed risk level."
        },
        nextActionSuggestion: {
            type: Type.STRING,
            description: "A suggestion for the single most impactful next task to work on."
        }
    },
    required: ["riskLevel", "riskReasoning", "nextActionSuggestion"]
};

export const getGoalInsights = async (goal: Goal, tasks: Task[]): Promise<GoalInsight | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const completedTasks = tasks.filter(t => t.status === Status.Done).length;
        const totalTasks = tasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const daysRemaining = differenceInDays(new Date(goal.targetDate), startOfDay(new Date()));

        const prompt = `Analyze the provided goal and its associated tasks to assess the risk of not completing it on time and suggest the next best action.
        
        Goal: "${goal.title}"
        Motivation: "${goal.motivation}"
        Target Date: ${goal.targetDate} (${daysRemaining} days remaining)
        Current Progress: ${progress}%
        
        Tasks:
        - Total: ${totalTasks}
        - Completed: ${completedTasks}
        - Pending: ${totalTasks - completedTasks}

        Based on this data, assess the risk level and provide a concise reason and a single, highly actionable next step.`;

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: goalInsightSchema,
            }
        });

        const jsonString = result.text.trim();
        const insight = JSON.parse(jsonString);
        return insight as GoalInsight;
    } catch (error) {
        console.error("Error getting goal insights:", error);
        return null;
    }
};

// 7. Motivational Nudge
export const getMotivationalNudge = async (tasks: Task[], goals: Goal[]): Promise<string | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const overdueCount = tasks.filter(t => t.status !== Status.Done && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length;
        const todayCount = tasks.filter(t => t.status !== Status.Done && isToday(new Date(t.dueDate))).length;
        const activeGoals = goals.filter(g => g.status !== GoalStatus.Completed);
        
        if (overdueCount === 0 && todayCount === 0 && activeGoals.length === 0) {
            return "Looks like a clear day! A perfect time to plan your next big goal.";
        }

        const prompt = `Based on the user's current state, provide a single, short, encouraging, and actionable motivational nudge (less than 25 words).
        - Overdue tasks: ${overdueCount}
        - Tasks due today: ${todayCount}
        - Active goals: ${activeGoals.length}
        
        Example responses:
        - "You have ${overdueCount} overdue tasks. Let's tackle one now to build momentum!"
        - "With ${todayCount} tasks on your plate for today, starting with the most important one can set a positive tone."
        - "Your goal '${activeGoals[0]?.title || '...a goal...'}' is waiting. What's one small step you can take towards it today?"
        `;

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        return result.text;
    } catch (error) {
        console.error("Error getting motivational nudge:", error);
        return null;
    }
};

// 8. Smart Suggestions
const smartSuggestionsSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            description: "A list of 2-3 actionable suggestions.",
            items: { type: Type.STRING }
        }
    },
    required: ["suggestions"]
};
export const getSmartSuggestions = async (tasks: Task[], goals: Goal[]): Promise<string[] | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;
    try {
        const overdueCount = tasks.filter(t => t.status !== Status.Done && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length;
        const todayCount = tasks.filter(t => t.status !== Status.Done && isToday(new Date(t.dueDate))).length;
        const highPriorityCount = tasks.filter(t => t.status !== Status.Done && t.priority === Priority.High).length;

        if (overdueCount === 0 && todayCount === 0 && highPriorityCount === 0) return null;

        const prompt = `Analyze the user's current tasks and provide 2-3 smart, actionable suggestions.
        - Overdue tasks: ${overdueCount}
        - Tasks due today: ${todayCount}
        - High priority tasks: ${highPriorityCount}
        - A recent goal: "${goals[0]?.title || 'None'}"
        
        Focus on what the user should prioritize.`;

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: smartSuggestionsSchema,
            }
        });

        const jsonString = result.text.trim();
        const parsed = JSON.parse(jsonString);
        return parsed.suggestions || [];
    } catch (error) {
        console.error("Error getting smart suggestions:", error);
        return null;
    }
};

// 9. Suggest Task Priority
const prioritySuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        priority: {
            type: Type.STRING,
            enum: Object.values(Priority)
        }
    },
    required: ["priority"]
};
export const suggestTaskPriority = async (taskInfo: { title: string; description?: string }): Promise<Priority | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const prompt = `Based on the following task details, suggest a priority level (High, Medium, or Low).
        Title: "${taskInfo.title}"
        Description: "${taskInfo.description || 'N/A'}"`;

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: prioritySuggestionSchema,
            }
        });
        
        const jsonString = result.text.trim();
        const parsed = JSON.parse(jsonString);
        return parsed.priority as Priority || null;
    } catch (error) {
        console.error("Error suggesting task priority:", error);
        return null;
    }
};

// 10. Refine and Plan Goal
export const refineAndPlanGoal = async (userInput: string, promptTemplate: string): Promise<any | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const prompt = promptTemplate
            .replace('{CURRENT_DATE}', format(new Date(), 'yyyy-MM-dd'))
            .replace('{GOAL}', userInput);

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const jsonString = result.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error refining and planning goal:", error);
        return null;
    }
};

// 11. Morning Briefing
const morningBriefingSchema = {
    type: Type.OBJECT,
    properties: {
        topPriorities: {
            type: Type.ARRAY,
            description: "A list of the top 3 most important tasks for the day, sorted by importance.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.INTEGER, description: "The ID of the task." },
                    title: { type: Type.STRING, description: "The title of the task." },
                    priority: { type: Type.STRING, enum: Object.values(Priority) },
                    isGoalRelated: { type: Type.BOOLEAN, description: "True if the task is linked to an active goal." }
                },
                required: ["id", "title", "priority", "isGoalRelated"]
            }
        },
        overdueTaskCount: {
            type: Type.INTEGER,
            description: "The total count of all overdue tasks."
        },
        motivationalNudge: {
            type: Type.STRING,
            description: "A short (1-2 sentences), encouraging, and actionable message for the user to start their day."
        }
    },
    required: ["topPriorities", "overdueTaskCount", "motivationalNudge"]
};

export const getMorningBriefing = async (tasks: Task[], goals: Goal[]): Promise<MorningBriefing | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        const activeGoals = goals.filter(g => g.status !== GoalStatus.Completed);
        const activeGoalTaskListIds = new Set(activeGoals.flatMap(g => g.linkedTaskListIds));
        
        const today = startOfDay(new Date());

        const relevantTasks = tasks
            .filter(t => t.status !== Status.Done && t.dueDate && (isPast(new Date(t.dueDate)) || isToday(new Date(t.dueDate))))
            .map(t => ({
                id: t.id,
                title: t.title,
                priority: t.priority,
                isGoalRelated: activeGoalTaskListIds.has(t.listId)
            }));
        
        const overdueTaskCount = tasks.filter(t => t.status !== Status.Done && t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length;

        const prompt = `
        Analyze the user's tasks for today, ${format(today, 'EEEE, MMMM d')}.
        - Your top priority is to identify the 3 most important tasks. Rank them by: 1st) Overdue tasks, 2nd) High priority tasks due today, 3rd) Tasks related to active goals.
        - The total count of all overdue tasks is exactly ${overdueTaskCount}. Use this number directly.
        - Craft a short, inspiring, and actionable motivational message for the user.

        Here is the list of relevant tasks:
        ${JSON.stringify(relevantTasks)}
        `;

        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: morningBriefingSchema,
            }
        });

        const jsonString = result.text.trim();
        const briefing = JSON.parse(jsonString);
        
        briefing.overdueTaskCount = overdueTaskCount;

        return briefing as MorningBriefing;

    } catch (error) {
        console.error("Error getting morning briefing:", error);
        return null;
    }
};

// 12. Evening Wind-Down
const eveningSummarySchema = {
    type: Type.OBJECT,
    properties: {
        celebratoryMessage: {
            type: Type.STRING,
            description: "A short, positive message celebrating the user's completed tasks for the day. Should mention the number of completed tasks."
        },
        reflectivePrompt: {
            type: Type.STRING,
            description: "A single, thought-provoking question to encourage reflection, like 'What was your biggest win today?' or 'What did you learn?'"
        }
    },
    required: ["celebratoryMessage", "reflectivePrompt"]
};

export const getEveningSummary = async (completedTasksTodayCount: number): Promise<EveningSummary | null> => {
    const gemini = getAiInstance();
    if (!gemini) return null;

    try {
        if (completedTasksTodayCount === 0) {
            return {
                celebratoryMessage: "It was a quiet day. A good rest prepares you for a productive tomorrow!",
                reflectivePrompt: "What's one thing you're looking forward to tomorrow?"
            };
        }

        const prompt = `
            A user has completed ${completedTasksTodayCount} tasks today.
            Generate a short, celebratory message acknowledging their accomplishment and a single, reflective question to help them wind down.
            
            Example celebratory message: "You crushed it today, completing ${completedTasksTodayCount} tasks! Great work."
            Example reflective prompt: "What was your biggest win today?"
        `;
        
        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: eveningSummarySchema,
            }
        });

        const jsonString = result.text.trim();
        const summary = JSON.parse(jsonString);
        return summary as EveningSummary;

    } catch (error) {
        console.error("Error getting evening summary:", error);
        return null;
    }
};
