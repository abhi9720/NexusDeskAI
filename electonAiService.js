// FIX: Updated to use the recommended @google/genai SDK and conform to modern API usage guidelines.
import { GoogleGenAI } from "@google/genai";
import {db, embedder} from './electronDBHelpers.js';
// FIX: Use GoogleGenAI with API key from environment variables as per guidelines, instead of hardcoding and using the deprecated GoogleGenerativeAI constructor.
const genAI = new GoogleGenAI({apiKey: process.env.API_KEY});


export async function parseQuery(query) {
    const now = new Date();
    const todayIso = now.toISOString(); // full ISO string including time
    console.log("Current ISO datetime:", todayIso);

    const prompt = `
        You are a query parsing assistant for a task management app.
        Return a JSON object in this format:
        {
        "type": "structured" | "semantic" | "hybrid",
        "filters": [
            { "field": "string", "operator": "string", "value": "string" }
        ],
        "search_terms": "string | null"
        }

        Fields MUST match the database column names:
            - Task table:  title, description, status, priority, dueDate, createdAt, tags
            - Note table:  title, content, createdAt, updatedAt, tags

        Fields MUST match the database column names: priority, dueDate, status, listId, tags.
        Operators can be any valid SQL operator, including =, >, <, >=, <=, LIKE, IN, NOT IN, etc.
        Dates MUST be in full ISO 8601 format (YYYY-MM-DDTHH:MM:SS.sssZ).
        Use the current datetime: "${todayIso}" to compute relative dates (e.g., "last 5 days").

        Example:
        Input: "show my high-priority tasks about Apollo which ended in last 5 days"
        Output:
        {
            "type": "hybrid",
            "filters": [
                { "field": "priority", "operator": "=", "value": "High" },
                { "field": "dueDate", "operator": ">=", "value": "2025-08-10T00:00:00.000Z" }
            ],
            "search_terms": "Apollo"
        };

        Now parse: "${query}"
        `;
    
    // FIX: Use `generateContent` with model name and prompt as per guidelines. Replaced deprecated `getGenerativeModel` and `generateContent` on model.
    // FIX: Updated model from prohibited 'gemini-1.5-flash' to 'gemini-2.5-flash'.
    const res = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    try {
        // FIX: Extract text from response using `.text` property directly, instead of deprecated `.response.text()`.
        return JSON.parse(res.text);
    } catch {
        return { type: "semantic", filters: [], search_terms: query };
    }
}

export async function searchHybrid(query) {
    const parsed = await parseQuery(query);


    let queryEmbedding = null;
    if (parsed.search_terms) {
        const output = await embedder(parsed.search_terms, { pooling: 'mean', normalize: true });
        queryEmbedding = Buffer.from(new Float32Array(output.data).buffer);
    }

    const whereClauses = [];
    const params = [];
    for (const f of parsed.filters || []) {
        whereClauses.push(`${f.field} ${f.operator} ?`);
        params.push(f.value);
    }

    let sql;
    if (parsed.type === "semantic") {
        sql = `
            SELECT *, 1 - vec_distance_cosine(embedding, ?) AS similarity
            FROM Task
            ORDER BY similarity DESC
            LIMIT 10
        `;
        console.log("Executing semantic search:", sql);
        return db.prepare(sql).all(queryEmbedding);
    }

    if (parsed.type === "structured") {
        sql = `
            SELECT *
            FROM Task
            WHERE ${whereClauses.join(" AND ")}
            LIMIT 50
        `;
        console.log("Executing structured search:", sql, ...params);
        return db.prepare(sql).all(...params);
    }

    // hybrid
    sql = `
        SELECT *, 1 - vec_distance_cosine(embedding, ?) AS similarity
        FROM Task
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY similarity DESC
        LIMIT 10
    `;
    console.log("Executing hybrid search:", sql, ...params);

    return db.prepare(sql).all(queryEmbedding, ...params);
}