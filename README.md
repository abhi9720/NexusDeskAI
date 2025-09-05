
# TaskFlow AI

**Your Intelligent Desktop Workspace for Peak Productivity.**

TaskFlow AI is a sophisticated task and project management application designed to augment human productivity. It combines a unified workspace for tasks, notes, goals, and habits with a powerful, agentic AI assistant to help you plan, execute, and learn more effectively.

![TaskFlow AI Dashboard](https://i.imgur.com/bIIM28O.png)

---

## ✨ Vision

In an age of information overload, TaskFlow AI aims to solve the core problem of cognitive overhead—the mental energy wasted on planning, organizing, and prioritizing. By integrating a proactive AI assistant powered by the Google Gemini API, TaskFlow transforms unstructured thoughts into actionable plans, providing users with the clarity and momentum to achieve their most ambitious objectives.

## 🚀 Key Features

### 🤖 Prodify AI Assistant (Powered by Gemini)

-   **Natural Language Commands:** Create, update, and find tasks and notes using the AI Chat or the global Quick Add bar.
-   **AI Task Parser:** Paste meeting notes or a brain dump, and let the AI extract a structured list of actionable tasks.
-   **Task & Note Analysis:** Get AI-driven summaries, complexity estimates, suggested sub-tasks, and relevant tags for your items.
-   **Smart Suggestions:** Receive proactive suggestions, such as a task's priority based on its content or the next best action to take for your goals.
-   **Goal Refinement:** Transform vague ambitions into SMART goals with a complete, AI-generated action plan.

###  unified-workspace Unified Workspace

-   **Mission Control Dashboard:** An intelligent home screen that provides a daily briefing, highlights today's focus, tracks habits, and flags at-risk goals or overdue tasks.
-   **Advanced Task Management:** Organize tasks in lists with multiple views:
    -   **List View:** A classic, scannable format.
    -   **Board View:** A Kanban-style board with customizable, drag-and-drop columns.
    -   **Calendar View:** A weekly or monthly view of all deadlines.
    -   **Table View:** A powerful, spreadsheet-like interface for data-heavy projects.
-   **Rich Note-Taking:** A full-featured rich text editor for notes, supporting formatted text, checklists, and embedded attachments, with AI writing assistance.
-   **Goal & Habit Tracking:** Define long-term goals, link them to task lists to track progress automatically, and build consistent routines with the integrated habit tracker.

### 🎯 Focus & Productivity Tools

-   **Focus Mode:** A full-screen, distraction-free environment for deep work on a single task, integrated with a Pomodoro timer.
-   **Sticky Notes Canvas:** A virtual whiteboard for brainstorming, capturing quick thoughts, and visualizing ideas with resizable, color-coded notes.
-   **Global Search (`Cmd/Ctrl+K`):** Instantly find any task or note from anywhere in the app.

### 🎨 Personalization

-   **Custom Themes:** A powerful theme editor to customize the app's entire color palette, with several pre-built templates.
-   **Custom Fields:** Create your own data fields (text, number, select, etc.) to tailor tasks to your specific workflow.
-   **Gamification:** A subtle system of points and streaks for completing tasks and habits helps build positive momentum.

---

## 🛠️ Tech Stack

-   **Frontend:** React, TypeScript, Tailwind CSS
-   **AI Engine:** Google Gemini API (`@google/genai`)
-   **Desktop Framework:** Electron
-   **Database:** better-sqlite3
-   **Vector Search:** `sqlite-vec` for semantic search capabilities
-   **Local Embeddings:** `@xenova/transformers` for on-device AI model processing

---

## ⚙️ Getting Started

### Prerequisites

-   Node.js (v18 or later recommended)
-   `npm` or `yarn`

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/taskflow-ai.git](https://github.com/abhi9720/NexusDeskAI.git)
    cd NexusDeskAI
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your Gemini API Key:**
    -   Obtain a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    -   The application is configured to use the API key from `process.env.API_KEY`. You can manage this through your development environment or by adding it directly in the application's settings UI after launch.

### Running the Application

-   **For Web Development (Vite):**
    ```bash
    npm run dev
    ```
    This will start the application in your browser. Note that desktop-specific features like local file storage will be unavailable.

-   **For Desktop (Electron):**
    ```bash
    npm run build
    npm run electron
    ```
    This will build the React app and then launch it in an Electron window, enabling all desktop features.

---

## 📂 Project Structure

```
.
├── components/      # React components for UI elements
├── context/         # React context providers (e.g., ThemeContext)
├── services/        # Modules for interacting with storage and AI APIs
├── electron*.js     # Electron main process and helper scripts
├── main.js          # Electron main entry point
├── preload.js       # Electron preload script
├── index.html       # Main HTML file
└── index.tsx        # Main React entry point
```

---

## 🤝 Contributing

Contributions are welcome! If you'd like to help improve TaskFlow AI, please follow these steps:

1.  **Fork** the repository on GitHub.
2.  Create a new **branch** for your feature or bug fix.
3.  Make your changes and commit them with clear, descriptive messages.
4.  Push your branch to your fork.
5.  Submit a **Pull Request** to the main repository.

Please ensure your code follows the existing style and conventions.

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
