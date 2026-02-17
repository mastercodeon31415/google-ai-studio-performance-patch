// ==UserScript==
// @name         Google AI Studio Performance Fix v5.9 (Clean Start)
// @namespace    http://tampermonkey.net/
// @version      5.9
// @description  Fixes lag, kills background animations, adds Turn Counter, forces Sidebar Badge, auto-sets Media Resolution to High, and removes start screen bloat.
// @author       You
// @match        https://aistudio.google.com/*
// @include      https://aistudio.google.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const PATCH_VERSION = "v5.9";
    const PATCH_ID = 'ai-studio-perf-patch-style';
    const COUNTER_ID = 'tm-turn-counter';
    const BADGE_ID = 'tm-sidebar-badge';

    console.log(`🚀 Tampermonkey: AI Studio Patch ${PATCH_VERSION} starting...`);

    // --- 1. CSS DEFINITION ---
    const css = `
        /*
           FIX: Do NOT optimize the wrapper (ms-chat-turn).
           Allow it to overflow so buttons (top: -32px) are visible.
        */
        ms-chat-turn {
            content-visibility: visible !important;
            contain: none !important;
            overflow: visible !important;
        }

        /*
           OPTIMIZATION: Apply the heavy lifting to the internal content wrapper.
           This skips rendering the heavy text/code when off-screen,
           but doesn't clip the floating buttons in the parent.
        */
        .turn-content {
            content-visibility: auto !important;
            contain-intrinsic-size: 1px 300px;
        }

        /* Extra safety for code blocks */
        ms-code-block {
            contain: layout style !important;
        }

        /* KILL THE EASTER EGG */
        ms-easter-egg, canvas.easter-egg {
            display: none !important;
            visibility: hidden !important;
            animation: none !important;
            width: 0 !important;
            height: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }

        .hljs, code, pre {
            animation: none !important;
            transition: none !important;
        }

        ms-autoscroll-container {
            will-change: scroll-position;
            transform: translateZ(0);
        }

        /* REMOVE START SCREEN BLOAT (Welcome Tiles) */
        ms-model-category-grid {
            display: none !important;
        }

        /* Top Toolbar Turn Counter */
        #${COUNTER_ID} {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 12px;
            height: 24px;
            border-radius: 32px;
            font-family: 'Google Sans Text', Inter, sans-serif;
            font-size: 12px;
            font-weight: 500;
            line-height: 18px;
            margin-left: 8px;
            cursor: help;
            transition: all 0.3s ease;
            box-sizing: border-box;
        }

        /* Permanent Sidebar Badge - Styled to match Sidebar Buttons */
        #${BADGE_ID} {
            flex: 0 0 auto;
            margin: 4px 12px 8px 12px;
            padding: 8px 12px;

            /* Visual Style */
            background: rgba(15, 157, 88, 0.15);
            border: 1px solid rgba(15, 157, 88, 0.3);
            color: #81c995;
            border-radius: 8px;

            /* Typography Matching "Get API Key" / "Settings" */
            font-family: "Inter", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            line-height: 20px;

            /* Layout */
            display: flex;
            align-items: center;
            gap: 10px;

            /* Animation: Fade In + Slide Up */
            opacity: 0;
            transform: translateY(5px);
            animation: tmFadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;

            pointer-events: auto;
            white-space: nowrap;
            overflow: hidden;
            z-index: 10;
            min-height: 32px;
        }

        @keyframes tmFadeIn {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;

    // --- 2. PERSISTENCE & INJECTION ---
    function ensureCSS() {
        if (!document.getElementById(PATCH_ID)) {
            const style = document.createElement('style');
            style.id = PATCH_ID;
            style.textContent = css;
            (document.head || document.body).appendChild(style);
        }
    }

    // --- 3. CLEANUP LOOP ---
    function killCanvas() {
        const eggs = document.querySelectorAll('ms-easter-egg');
        eggs.forEach(egg => {
            if (egg.style.display !== 'none') {
                egg.style.display = 'none';
                const canvas = egg.querySelector('canvas');
                if (canvas) { canvas.width = 0; canvas.height = 0; }
            }
        });
    }

    // --- 4. TOP TOOLBAR TURN COUNTER ---
    function updateTurnCounter() {
        const turnCount = document.querySelectorAll('ms-chat-turn').length;
        const tokenComponent = document.querySelector('ms-token-count');
        const titleContainer = document.querySelector('.title-tokencount-container');

        if (!titleContainer) return;

        let counter = document.getElementById(COUNTER_ID);

        if (!counter) {
            counter = document.createElement('span');
            counter.id = COUNTER_ID;
            counter.title = "Number of chat turns in memory";
            titleContainer.insertBefore(counter, tokenComponent ? tokenComponent.nextSibling : null);
        }

        counter.innerText = `${turnCount} turns`;

        if (turnCount > 50) {
            counter.style.backgroundColor = 'rgba(255, 80, 80, 0.2)';
            counter.style.color = '#ffb4ab';
            counter.style.border = '1px solid rgba(255, 80, 80, 0.3)';
        } else if (turnCount > 30) {
            counter.style.backgroundColor = 'rgba(255, 152, 0, 0.15)';
            counter.style.color = '#ffcc80';
            counter.style.border = '1px solid rgba(255, 152, 0, 0.3)';
        } else {
            counter.style.backgroundColor = 'rgba(15, 157, 88, 0.15)';
            counter.style.color = '#81c995';
            counter.style.border = '1px solid rgba(15, 157, 88, 0.3)';
        }
    }

    // --- 5. SIDEBAR STATUS BADGE (Trusted Types + Style Match) ---
    function injectSidebarBadge() {
        if (document.getElementById(BADGE_ID)) return;

        const bottomActions = document.querySelector('nav .bottom-actions');
        if (!bottomActions) return;

        // Create Badge
        const badge = document.createElement('div');
        badge.id = BADGE_ID;

        const iconSpan = document.createElement('span');
        iconSpan.textContent = "⚡ Patch Active";

        const versionSpan = document.createElement('span');
        versionSpan.textContent = PATCH_VERSION;
        versionSpan.style.opacity = "0.7";
        versionSpan.style.fontWeight = "400";
        versionSpan.style.fontSize = "12px";

        badge.appendChild(iconSpan);
        badge.appendChild(document.createTextNode(" "));
        badge.appendChild(versionSpan);

        // Find anchor
        let anchor = bottomActions.querySelector('ms-api-key-button');
        if (!anchor) {
            anchor = bottomActions.querySelector('ms-settings-menu');
        }

        if (anchor) {
            bottomActions.insertBefore(badge, anchor);
        } else {
            bottomActions.prepend(badge);
        }
    }

    // --- 6. AUTO-HIGH RESOLUTION SETTER ---
    function enforceHighResolution() {
        // Target the container by the stable data-test-id
        const container = document.querySelector('[data-test-id="mediaResolution"]');
        if (!container) return;

        const select = container.querySelector('mat-select');
        const valueText = container.querySelector('.mat-mdc-select-value-text');
        
        if (!select || !valueText) return;

        // Check if currently set to Default (or anything not High)
        // We only override "Default" to avoid fighting user choice if they specifically want something else later.
        if (valueText.textContent.trim() === "Default") {
            const trigger = select.querySelector('.mat-mdc-select-trigger');
            
            // Check if the dropdown menu is already open
            const isExpanded = select.getAttribute('aria-expanded') === 'true';

            if (!isExpanded && trigger) {
                // Open the dropdown
                trigger.click();
            } else if (isExpanded) {
                // Dropdown is open, find "High" option in the CDK overlay
                const options = document.querySelectorAll('mat-option');
                for (const option of options) {
                    if (option.textContent.trim().includes("High")) {
                        console.log("⚡ Patch: Auto-setting Media Resolution to High");
                        option.click();
                        break;
                    }
                }
            }
        }
    }

    // --- MAIN LOOP ---
    setInterval(() => {
        ensureCSS();
        killCanvas();
        updateTurnCounter();
        injectSidebarBadge();
        enforceHighResolution();
    }, 1000);

    console.log(`✅ AI Studio: ${PATCH_VERSION} Loaded`);

})();