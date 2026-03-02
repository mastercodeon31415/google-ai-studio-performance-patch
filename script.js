// ==UserScript==
// @name         Google AI Studio Performance Fix & Automations v6.1
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  Fixes lag, kills background animations, auto-sets Resolution, System Prompts, Temp, Top-P, Model, and neatly closes panels.
// @author       You
// @match        https://aistudio.google.com/*
// @include      https://aistudio.google.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const PATCH_VERSION = "v6.1";
    const PATCH_ID = 'ai-studio-perf-patch-style';
    const COUNTER_ID = 'tm-turn-counter';
    const BADGE_ID = 'tm-sidebar-badge';

    // State Variables
    let isAutomatingUI = false; // Prevents multiple UI panels from opening simultaneously
    let lastProcessedUrl = "";  // Tracks so we only inject Temp/Top-P/Instructions once per New Chat

    const SYS_INSTRUCT = `You are an expert, highly literal software engineer. When asked to modify code, you must ALWAYS output the complete, fully functioning, and ready-to-run source code file. NEVER omit code for clarity. NEVER use placeholders like '// rest of code here', '// previous code', or '...'. NEVER provide step-by-step instructions on how to implement the changes; simply output the final, complete code file in its entirety so it can be directly copy-pasted. Do not truncate anything, no matter how long the file is.\nOnly show full source code files that are being changed from the previous version of them. If the change is very small, such as a line or 2, just give instructions for doing the changes in that code file. Also be sure to put each code file in its own code box using the code box markdown tags.`;
    const TARGET_MODEL = "Gemini 3.1 Pro Preview";

    console.log(`🚀 Tampermonkey: AI Studio Patch ${PATCH_VERSION} starting...`);

    // --- 1. CSS DEFINITION ---
    const css = `
        /* FIX: Do NOT optimize the wrapper (ms-chat-turn). Allow overflow. */
        ms-chat-turn {
            content-visibility: visible !important;
            contain: none !important;
            overflow: visible !important;
        }

        /* OPTIMIZATION: Apply heavy lifting to the internal content wrapper. */
        .turn-content {
            content-visibility: auto !important;
            contain-intrinsic-size: 1px 300px;
        }

        ms-code-block { contain: layout style !important; }

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

        .hljs, code, pre { animation: none !important; transition: none !important; }

        ms-autoscroll-container {
            will-change: scroll-position;
            transform: translateZ(0);
        }

        /* REMOVE START SCREEN BLOAT */
        ms-model-category-grid { display: none !important; }

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

        /* Permanent Sidebar Badge */
        #${BADGE_ID} {
            flex: 0 0 auto;
            margin: 4px 12px 8px 12px;
            padding: 8px 12px;
            background: rgba(15, 157, 88, 0.15);
            border: 1px solid rgba(15, 157, 88, 0.3);
            color: #81c995;
            border-radius: 8px;
            font-family: "Inter", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            line-height: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
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
            to { opacity: 1; transform: translateY(0); }
        }
    `;

    // --- 2. CORE UTILITIES ---
    function ensureCSS() {
        if (!document.getElementById(PATCH_ID)) {
            const style = document.createElement('style');
            style.id = PATCH_ID;
            style.textContent = css;
            (document.head || document.body).appendChild(style);
        }
    }

    // Deeply sets native input value bypassing Angular/React wrappers
    function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    }

    // --- 3. CLEANUP & VISUAL FIXES ---
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
            counter.style.backgroundColor = 'rgba(255, 80, 80, 0.2)'; counter.style.color = '#ffb4ab'; counter.style.border = '1px solid rgba(255, 80, 80, 0.3)';
        } else if (turnCount > 30) {
            counter.style.backgroundColor = 'rgba(255, 152, 0, 0.15)'; counter.style.color = '#ffcc80'; counter.style.border = '1px solid rgba(255, 152, 0, 0.3)';
        } else {
            counter.style.backgroundColor = 'rgba(15, 157, 88, 0.15)'; counter.style.color = '#81c995'; counter.style.border = '1px solid rgba(15, 157, 88, 0.3)';
        }
    }

    function injectSidebarBadge() {
        if (document.getElementById(BADGE_ID)) return;
        const bottomActions = document.querySelector('nav .bottom-actions');
        if (!bottomActions) return;

        const badge = document.createElement('div');
        badge.id = BADGE_ID;

        const iconSpan = document.createElement('span');
        iconSpan.textContent = "⚡ Patch Active";

        const versionSpan = document.createElement('span');
        versionSpan.textContent = PATCH_VERSION;
        versionSpan.style.opacity = "0.7"; versionSpan.style.fontWeight = "400"; versionSpan.style.fontSize = "12px";

        badge.appendChild(iconSpan); badge.appendChild(document.createTextNode(" ")); badge.appendChild(versionSpan);

        let anchor = bottomActions.querySelector('ms-api-key-button') || bottomActions.querySelector('ms-settings-menu');
        anchor ? bottomActions.insertBefore(badge, anchor) : bottomActions.prepend(badge);
    }

    // --- 4. NEW CHAT DEFAULTS (Temp, Top-P, Sys-Inst) ---
    function applyNewChatSettings() {
        // Reset tracking logic if we navigate away from the new chat route
        if (!location.href.includes('/prompts/new_chat')) {
            lastProcessedUrl = "";
            return;
        }

        // Only run once per new chat session
        if (lastProcessedUrl === location.href) return;

        const tempContainer = document.querySelector('[data-test-id="temperatureSliderContainer"]');
        const sysInstCard = document.querySelector('[data-test-system-instructions-card]');

        if (!tempContainer || !sysInstCard) return;

        // 1. SET TEMP & TOP-P (Instantly manipulated via inputs)
        const tempInput = tempContainer.querySelector('input.slider-number-input');
        if (tempInput && tempInput.value !== "0.2") setNativeValue(tempInput, "0.2");

        const allSettings = document.querySelectorAll('.settings-item-column');
        let topPContainer = null;
        allSettings.forEach(el => {
            const title = el.querySelector('.item-description-title');
            if (title && title.textContent.trim() === 'Top P') topPContainer = el;
        });

        if (topPContainer) {
            const topPInput = topPContainer.querySelector('input.slider-number-input');
            if (topPInput && topPInput.value !== "0.1") setNativeValue(topPInput, "0.1");
        }

        // 2. SET SYSTEM INSTRUCTIONS (Requires opening a panel)
        const subtitle = sysInstCard.querySelector('.subtitle');
        if (subtitle && !subtitle.textContent.includes("highly literal software engineer")) {
            if (isAutomatingUI) return;
            isAutomatingUI = true;

            console.log("⚡ Patch: Injecting Default System Instructions...");
            sysInstCard.click();

            setTimeout(() => {
                const panel = document.querySelector('ms-system-instructions');
                if (panel) {
                    const ta = panel.querySelector('textarea');
                    if (ta) setNativeValue(ta, SYS_INSTRUCT);
                }

                // Find close/back button and close (Wait slightly longer for React/Angular to digest input)
                setTimeout(() => {
                    // Aggressive catch-all for AI Studio sliding panel close buttons
                    const closeSelectors = [
                        'ms-sliding-right-panel button[iconname="close"]',
                        'ms-sliding-right-panel button[aria-label*="Close"]',
                        'ms-sliding-right-panel button[iconname="arrow_back"]',
                        'ms-sliding-right-panel button.back-button',
                        '.panel-header button[iconname="close"]'
                    ];

                    let closed = false;
                    for (let selector of closeSelectors) {
                        const btn = document.querySelector(selector);
                        if (btn) {
                            btn.click();
                            closed = true;
                            break;
                        }
                    }

                    // Ultimate fallback: search by material icon text content if selectors fail
                    if (!closed) {
                        const allPanelBtns = document.querySelectorAll('ms-sliding-right-panel button, .panel-header button');
                        for (let btn of allPanelBtns) {
                            if (btn.textContent.includes('close') || btn.textContent.includes('arrow_back')) {
                                btn.click();
                                break;
                            }
                        }
                    }

                    lastProcessedUrl = location.href; // Flag successfully done!
                    isAutomatingUI = false;
                }, 300);
            }, 600);
        } else {
            // Already contains instructions, skip to prevent loop.
            lastProcessedUrl = location.href;
        }
    }

    // --- 5. ENFORCE MODEL CONFIGURATION ---
    function enforceModel() {
        const currentModelTitle = document.querySelector('.model-selector-card .title');

        if (currentModelTitle && currentModelTitle.textContent.trim() !== TARGET_MODEL) {
            if (isAutomatingUI) return;
            isAutomatingUI = true;

            console.log(`⚡ Patch: Model is ${currentModelTitle.textContent.trim()}, Auto-selecting ${TARGET_MODEL}...`);
            currentModelTitle.closest('.model-selector-card').click();

            // Wait for list slide-in
            setTimeout(() => {
                const modelOptions = document.querySelectorAll('.model-title-text');
                let clicked = false;
                for (const opt of modelOptions) {
                    if (opt.textContent.trim() === TARGET_MODEL) {
                        const wrapper = opt.closest('[_nghost-ng-c945209010]');
                        const btn = wrapper ? wrapper.querySelector('.content-button') : opt;
                        if (btn) {
                            btn.click();
                            clicked = true;
                        }
                        break;
                    }
                }

                // If somehow missing from the list, close the panel safely to avoid a freeze
                if (!clicked) {
                    const backBtn = document.querySelector('.panel-header .back-button');
                    if (backBtn) backBtn.click();
                }

                setTimeout(() => { isAutomatingUI = false; }, 300);
            }, 800);
        }
    }

    // --- 6. ENFORCE HIGH RESOLUTION ---
    function enforceHighResolution() {
        const container = document.querySelector('[data-test-id="mediaResolution"]');
        if (!container) return;

        const select = container.querySelector('mat-select');
        const valueText = container.querySelector('.mat-mdc-select-value-text');

        if (!select || !valueText) return;

        if (valueText.textContent.trim() === "Default") {
            const trigger = select.querySelector('.mat-mdc-select-trigger');
            const isExpanded = select.getAttribute('aria-expanded') === 'true';

            if (!isExpanded && trigger) {
                if (isAutomatingUI) return;
                isAutomatingUI = true;
                trigger.click();
            } else if (isExpanded) {
                const options = document.querySelectorAll('mat-option');
                for (const option of options) {
                    if (option.textContent.trim().includes("High")) {
                        console.log("⚡ Patch: Auto-setting Media Resolution to High");
                        option.click();
                        isAutomatingUI = false; // Release lock instantly
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

        applyNewChatSettings();
        enforceModel();
        enforceHighResolution();
    }, 1000);

    console.log(`✅ AI Studio: ${PATCH_VERSION} Loaded`);

})();