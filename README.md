# ⚡ Google AI Studio Performance Patch (v5.9)

A Tampermonkey UserScript designed to eliminate UI lag in long Google AI Studio sessions, optimize resource usage, and provide useful UI metrics.

![Badge Preview](https://github.com/user-attachments/assets/7a1f58d9-091f-4974-91d8-a0740236bea6) <!-- Replace with your screenshot of the badge -->

## 🚀 The Problem: "The Refresh Illusion"

If you use Google AI Studio for long coding sessions, you know the pain.

You might notice that when the chat starts lagging, **refreshing the page seems to fix it.** Scrolling becomes smooth again—but only for a moment. As soon as you send 1 or 2 new prompts, the extreme lag returns instantly.

### Why does this happen?
When you refresh, the browser paints the chat history once and sits idle. However, the moment you type or generate a response, you trigger a **DOM Reflow (Layout Thrashing)**.

Because the chat history is one giant container, the browser attempts to recalculate the layout positions of *every single chat turn* in your history (thousands of elements) to ensure the new content fits at the bottom. This calculation blocks the Main Thread, causing your typing to lag and scrolling to stutter.

## ✨ The Solution (How This Script Fixes It)

This script stops that chain reaction using **CSS Containment**.

1.  **Smart Rendering:** It injects specific CSS rules (`content-visibility: auto`) to the *content* of chat turns.
2.  **The Firewall Effect:** This tells the browser to treat off-screen content as an empty box with `0` rendering cost.
3.  **Result:** When you type a new prompt, the browser **ignores the thousands of off-screen nodes** and only calculates the layout for what is currently on your screen. The lag disappears permanently, not just until the next message.

## 🛠️ Features

### 1. 🏎️ Performance Optimizations
*   **Zero-Lag Typing & Scrolling:** Implements `content-visibility` to prevent Layout Thrashing.
*   **Clip-Free UI:** Unlike basic optimizations that cut off floating buttons (Edit/Rerun), this script applies optimizations intelligently to the inner content (`.turn-content`), ensuring all UI controls remain visible and functional.
*   **GPU Saver:** Detects the background "Easter Egg" animations (floating shapes) and forces their canvas size to 0x0, stopping the JavaScript loop from eating your GPU cycles.

### 2. 📊 UI Enhancements
*   **Turn Counter:** Adds a dynamic counter to the top toolbar showing exactly how many turns are in the current session.
    *   <span style="color:#81c995">**Green:**</span> < 30 turns (Good)
    *   <span style="color:#ffcc80">**Orange:**</span> 30-50 turns (Getting heavy)
    *   <span style="color:#ffb4ab">**Red:**</span> > 50 turns (Expect native lag)
*   **Sidebar Status Badge:** A clean, native-looking badge in the sidebar confirming the patch is active and showing the version number. Uses Google's `Inter` font to match the UI perfectly.
*   **Auto-High Media Resolution:** Automatically detects when a new chat defaults "Media resolution" to "Default" and switches it to "High" for you. Never forget to toggle that setting again.
*   **Clean Start Screen:** Automatically hides the "Start building with Gemini" tiles and bloat on new sessions, leaving you with a clean, blank workspace to start typing immediately.

### 3. 🛡️ Robust & Secure
*   **Trusted Types Compliant:** Uses standard DOM creation methods instead of `innerHTML` to comply with Google's strict security policies.
*   **Persistence:** Automatically re-applies fixes if Google's Angular framework updates the DOM (e.g., when switching chats).

## 📦 Installation

1.  **Install Tampermonkey:** Download the **Tampermonkey** extension for your browser (Chrome, Edge, Firefox).
2.  **⚠️ CRITICAL: Enable User Scripts**
    *   Open your browser's extension settings (e.g., `chrome://extensions` in Chrome).
    *   Enable **Developer mode** (usually a toggle in the top right corner).
    *   Find the Tampermonkey card and click **Details**.
    *   Scroll down and toggle **ON** the option labeled **"Allow User Scripts"**.
    *   *Note: If this is not enabled, the extension may warn you that scripts cannot run.*
3.  **🔄 Restart Browser:**
    *   Close the extensions tab.
    *   **Close your browser completely** and reopen it. This ensures the permissions take full effect.
4.  **Create Script:** Open the Tampermonkey dashboard, create a new script.
5.  **Paste Code:** Copy the code from `script.js` in this repository and paste it in.
6.  **Save & Run:** Save the script and navigate to Google AI Studio.

## 🐛 Known Issues / Feedback
I have tested this on standard workflows, but I need **you** to stress test it!
*   If you have a chat session with 100+ turns, please try this script and report back on the performance difference.
*   If Google updates their CSS class names, the Sidebar Badge might disappear (though performance fixes should remain).

## 📜 License
MIT License. Feel free to fork and improve!