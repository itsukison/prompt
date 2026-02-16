# PromptOS

Welcome to **PromptOS**. This is a global AI writing assistant that lives on your desktop and helps you write better, faster, and cooler text anywhere you type.

Think of it like a superpower for your keyboard. You hit a shortcut, a sleek overlay pops up, you tell it what you need, and it writes it for you and pastes it right into your app. It's powered by Google's Gemini API.

## How to Use It

It's super simple:

1.  **Open the Overlay**: Press `Cmd+/` (on macOS) or `Ctrl+/` (on Windows/Linux).
2.  **Ask for Help**: Type what you need. "Write a polite email declining this invite," "Fix my grammar," "Turn this into a pirate joke."
3.  **Insert**: Review the result. If you like it, hit the **Insert** button (or press Enter if you're feeling lucky), and it'll paste the text right where you were typing before.

### Pro Tips
-   **Context Matters**: The app remembers what you just asked. So if it gives you a long paragraph, you can just say "Make it shorter" or "More emoji" without re-typing the whole thing.
-   **Settings**: Hit `Cmd+Shift+/` (or `Ctrl+Shift+/`) to open the settings window. You can tweak your profile, writing style, and check your usage there.

## Tech Stack

We built this using some pretty cool modern web tech wrapped up in Electron:

-   **[Electron](https://www.electronjs.org/)**: For the desktop app magic.
-   **[React](https://react.dev/) & [Vite](https://vitejs.dev/)**: For a blazing fast UI.
-   **[Tailwind CSS](https://tailwindcss.com/)**: For styling that looks good without the headache.
-   **[Google Gemini API](https://ai.google.dev/)**: The brains behind the operation (specifically `gemini-2.0-flash` because it's speedy).
-   **[Supabase](https://supabase.com/)**: For auth and keeping track of your token usage.

## Getting Started (For Developers)

Here's how to get it running locally.

### Prerequisites
-   Node.js (v18+ recommended)
-   A [Google Gemini API Key](https://aistudio.google.com/app/apikey)
-   A Supabase project (for auth)

### Setup

1.  **Clone the repo**:
    ```bash
    git clone https://github.com/your-repo/promptos.git
    cd promptos
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up environment variables**:
    Create a `.env` file in the root and add your API keys:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    SUPABASE_URL=your_supabase_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run it!**:
    ```bash
    npm start
    ```
    This will spin up both the renderer (Vite) and the Electron main process.

### Building
To package the app for your OS:
```bash
npm run build
```

## 🍎 macOS Permissions
Just a heads up for Mac users: improved focus management needs **Accessibility permissions**.
Go to **System Settings > Privacy & Security > Accessibility** and make sure PromptOS (or your terminal if running in dev) is checked. This lets the app switch focus back to your previous window and paste the text for you.

---

Enjoy writing with PromptOS! 🚀
