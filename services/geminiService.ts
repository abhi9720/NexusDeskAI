import { GoogleGenAI, Type, FunctionDeclaration, Part } from "@google/genai";
import { Task, TaskAnalysis, Note, NoteAnalysis, Priority, Status, ChatMessage } from '../types';

let ai: GoogleGenAI | null = null;
let hasWarned = false;

// Lazily initialize the AI client to prevent app crash if API_KEY is missing.
const getAiInstance = (): GoogleGenAI | null => {
    if (ai) {
        return ai;
    }
    
    // Safely check for process and API_KEY in a browser environment.
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        return ai;
    }
    
    if (!hasWarned) {
        console.warn("API_KEY environment variable not set or not accessible. AI features will be disabled.");
        hasWarned = true;
    }
    
    return null;
};

// --- Function Calling Tools ---
const tools: FunctionDeclaration[] = [
    {
        name: "createTask",
        description: "Create a new task with a title, description, and optional due date.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "The title of the task." },
                description: { type: Type.STRING, description: "A detailed description of the task." },
                dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format. If not provided, it will be set to today." },
                priority: { type: Type.STRING, description: "The priority of the task. Can be 'High', 'Medium', or 'Low'." }
            },
            required: ["title", "description"],
        }
    },
    {
        name: "createNote",
        description: "Create a new note with a title and content.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "The title of the note." },
                content: { type: Type.STRING, description: "The content of the note." },
            },
            required: ["title", "content"],
        }
    }
];

export const runChat = async (history: ChatMessage[], message: string) => {
    const gemini = getAiInstance();
    if (!gemini) return { text: "AI is not configured. Please set your API key." };

    const chat = gemini.chats.create({
        model: "gemini-2.5-flash",
        config: {
            tools: [{ functionDeclarations: tools }],
        }
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
      description: "List of potential challenges or blockers."
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
  required: ["complexity", "requiredSkills", "potentialBlockers", "subtasks"]
};

export const analyzeTaskAndSuggestSubtasks = async (task: Task): Promise<TaskAnalysis | null> => {
  const gemini = getAiInstance();
  if (!gemini) return null;

  try {
    const prompt = `Analyze the following task and provide a detailed breakdown.
    Task Title: "${task.title}"
    Task Description: "${task.description}"
    
    Based on the provided information, perform the following actions:
    1.  Estimate the complexity.
    2.  List the required skills.
    3.  Identify potential blockers.
    4.  Break the task down into actionable subtasks with estimated hours for each.
    
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