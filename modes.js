// ========================================
// MODE MANAGEMENT SYSTEM
// ========================================
// Handles switching between PM, Developer, and Executive modes
// Each mode shows different views and features tailored to that persona

const MODE_CONFIG = {
    pm: {
        name: 'Product Manager',
        icon: '👨‍💼',
        color: 'blue',
        defaultView: 'okr',
        availableViews: [
            'epics', 'roadmap', 'backlog', 'sprint', 'kanban',
            'dependency', 'okr', 'capacity', 'analytics',
            'track', 'releases', 'status', 'priority', 'contributor', 'gantt', 'workflow', 'dashboard', 'ideation', 'spikes', 'activity'
        ],
        description: 'Strategic planning, backlog grooming, sprint management',
        primaryNavOrder: ['okr', 'roadmap', 'epics', 'releases', 'backlog', 'sprint', 'my-tasks', 'kanban', 'track', 'dashboard', 'analytics', 'capacity']
    },
    dev: {
        name: 'Developer',
        icon: '👩‍💻',
        color: 'green',
        defaultView: 'my-tasks',
        availableViews: [
            'my-tasks', 'kanban', 'track', 'dependency', 'sprint', 'workflow', 'ideation', 'spikes', 'activity'
        ],
        description: 'Task execution, blocker resolution, sprint focus',
        primaryNavOrder: ['my-tasks', 'kanban', 'track', 'sprint', 'dependency']
    },
    exec: {
        name: 'Executive',
        icon: '👔',
        color: 'purple',
        defaultView: 'dashboard',
        availableViews: [
            'dashboard', 'epics', 'okr', 'analytics', 'roadmap', 'releases', 'ideation', 'spikes', 'activity'
        ],
        description: 'High-level health, strategic alignment, reporting',
        primaryNavOrder: ['dashboard', 'okr', 'epics', 'roadmap', 'releases', 'analytics']
    }
};

// View metadata for rendering navigation
const VIEW_METADATA = {
    'okr': { label: '🎯 OKRs', category: 'primary' },
    'roadmap': { label: '🗺️ Roadmap', category: 'primary' },
    'epics': { label: '🚀 Epics', category: 'primary' },
    'releases': { label: '📦 Releases', category: 'primary' },
    'backlog': { label: '📚 Backlog', category: 'primary', badge: 'backlog-count-badge' },
    'sprint': { label: '🏃 Sprints', category: 'primary' },
    'my-tasks': { label: '✅ My Tasks', category: 'primary' },
    'kanban': { label: '📋 Kanban', category: 'primary' },
    'track': { label: '🏗️ Tracks', category: 'primary' },
    'dashboard': { label: '📊 Dashboard', category: 'primary' },
    'analytics': { label: '📈 Analytics', category: 'primary' },
    'capacity': { label: '⚖️ Capacity', category: 'primary' },
    'ideation': { label: '💡 Ideation', category: 'primary' },
    'spikes': { label: '🧪 Spikes', category: 'primary' },
    'status': { label: '🟡 By Status', category: 'primary' },
    'priority': { label: '🔴 By Priority', category: 'primary' },
    'contributor': { label: '👤 By Contributor', category: 'primary' },
    'dependency': { label: '🕸️ Dependencies', category: 'primary' },
    'gantt': { label: '📅 Gantt', category: 'primary' },
    'workflow': { label: '🛠️ Playbook', category: 'primary' },
    'activity': { label: '📋 Activity', category: 'primary' }
};

// ============================================================
// STAGE NAV SYSTEM — Maps stages to views per mode
// ============================================================
const STAGE_TO_VIEWS = {
    pm: {
        discovery: ['ideation', 'spikes'],
        vision:    ['okr', 'epics'],
        plan:      ['roadmap', 'backlog', 'sprint', 'gantt', 'capacity'],
        build:     ['kanban', 'track', 'dependency', 'status', 'priority', 'contributor'],
        review:    ['releases', 'analytics', 'dashboard', 'workflow', 'activity']
    },
    dev: {
        discovery: ['ideation', 'spikes'],
        vision:    [],
        plan:      ['sprint'],
        build:     ['my-tasks', 'kanban', 'track', 'dependency'],
        review:    ['workflow', 'activity']
    },
    exec: {
        discovery: ['ideation'],
        vision:    ['okr', 'epics'],
        plan:      ['roadmap'],
        build:     [],
        review:    ['releases', 'analytics', 'dashboard', 'activity']
    }
};

const STAGE_METADATA = {
    discovery: { icon: '🔍', label: 'Discover', color: '#7c3aed', primaryView: 'ideation' },
    vision:    { icon: '🌟', label: 'Vision',   color: '#4f46e5', primaryView: 'okr' },
    plan:      { icon: '📐', label: 'Plan',     color: '#2563eb', primaryView: 'backlog' },
    build:     { icon: '⚡', label: 'Build',    color: '#059669', primaryView: 'kanban' },
    review:    { icon: '🏁', label: 'Ship',     color: '#d97706', primaryView: 'releases' }
};

// Get which lifecycle stage a view belongs to
function getStageForView(viewId) {
    const mode = currentMode || 'pm';
    const stageMap = STAGE_TO_VIEWS[mode] || STAGE_TO_VIEWS.pm;
    for (const [stage, views] of Object.entries(stageMap)) {
        if (views.includes(viewId)) return stage;
    }
    // fallback: check pm map
    for (const [stage, views] of Object.entries(STAGE_TO_VIEWS.pm)) {
        if (views.includes(viewId)) return stage;
    }
    return 'build';
}

// Switch to stage's primary view
function switchStage(stageKey) {
    const mode = currentMode || 'pm';
    const views = (STAGE_TO_VIEWS[mode] || STAGE_TO_VIEWS.pm)[stageKey] || [];
    const primaryView = STAGE_METADATA[stageKey]?.primaryView;
    const target = views.includes(primaryView) ? primaryView : views[0];
    if (target && typeof switchView === 'function') switchView(target);
}

// Render stage tabs into #stage-tabs
function renderStageTabs(activeView) {
    const container = document.getElementById('stage-tabs');
    if (!container) return;
    
    // Unified Navigation: Hide center tabs in favor of the new Strategic Ribbon
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
    const mode = currentMode || 'pm';
    const stageMap = STAGE_TO_VIEWS[mode] || STAGE_TO_VIEWS.pm;
    const activeStage = getStageForView(activeView || window.currentActiveView || '');

    container.innerHTML = Object.entries(STAGE_METADATA)
        .filter(([key]) => (stageMap[key] || []).length > 0)
        .map(([key, meta]) => {
            const isActive = key === activeStage;
            const done = typeof checkStageCompletion === 'function' && checkStageCompletion(key);
            return `<button onclick="switchStage('${key}')"
                class="stage-tab ${isActive ? 'stage-tab-active' : ''} ${done && !isActive ? 'stage-tab-done' : ''}"
                ${isActive ? `style="--tab-color:${meta.color}"` : ''}
                title="${meta.label}">
                <span>${meta.icon}</span>
                <span class="stage-tab-label">${meta.label}</span>
                ${done && !isActive ? '<span class="stage-tab-check">✓</span>' : ''}
            </button>`;
        }).join('');
}

// Render view sub-tabs into #view-subtabs-chips
function renderViewSubtabs(activeView) {
    const container = document.getElementById('view-subtabs-chips')
    if (!container) return;

    // Source of Truth: Use the strategic stage views
    const stageKey = typeof currentWorkflowStage !== 'undefined' ? currentWorkflowStage : 'discovery';
    const stage = typeof WORKFLOW_STAGES !== 'undefined' ? WORKFLOW_STAGES[stageKey] : null;

    if (!stage) {
        console.warn('Strategic stage metadata missing. Sub-tabs may be incomplete.');
        return;
    }

    const mode = currentMode || 'pm';
    const availableModeViews = MODE_CONFIG[mode]?.availableViews || [];

    // Filter stage views by what's available for this persona
    let views = stage.views.filter(v => availableModeViews.includes(v));

    // If current stage has no views for this mode, fall back to finding the stage
    // that contains the active view — avoids blank nav during init race conditions
    if (views.length === 0) {
        const fallbackView = activeView || window.currentActiveView
        if (fallbackView) {
            for (const [key, s] of Object.entries(WORKFLOW_STAGES)) {
                if (s.views.includes(fallbackView)) {
                    views = s.views.filter(v => availableModeViews.includes(v))
                    break
                }
            }
        }
    }

    if (views.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = views.map(viewId => {
        const meta = VIEW_METADATA[viewId];
        const isActive = viewId === (activeView || window.currentActiveView);
        
        // Define labels locally to match popover logic
        const viewLabels = {
            'okr': '🎯 OKRs', 'epics': '🚀 Epics', 'roadmap': '🗺️ Roadmap', 'backlog': '📚 Backlog',
            'sprint': '🏃 Sprints', 'releases': '📦 Releases', 'my-tasks': '✅ Active', 
            'kanban': '📋 Kanban', 'track': '🏗️ Tracks', 'dependency': '🔗 Links', 
            'workflow': '🛠️ Playbook', 'dashboard': '📊 Pulse', 'analytics': '📈 Data', 
            'capacity': '⚖️ Capacity', 'status': '📍 State', 'priority': '🔥 Risk', 
            'contributor': '👥 Team', 'gantt': '📅 Gantt', 'ideation': '💡 Ideas', 'spikes': '🧪 Spikes'
        };

        const label = viewLabels[viewId] || meta?.label || viewId;
        // Strip emoji prefix — text-only chips for clean enterprise nav
        const textOnly = label.replace(/^[\p{Emoji}\p{Emoji_Presentation}\uFE0F\u20D0-\u20FF\s]+/u, '').trim() || label;

        return `
            <button onclick="window.currentActiveView='${viewId}'; switchView('${viewId}'); if(typeof updateCommandStripNav==='function') updateCommandStripNav(); if(typeof renderViewSubtabs==='function') renderViewSubtabs('${viewId}');" id="btn-${viewId}"
                class="view-subtab ${isActive ? 'view-subtab-active' : ''}"
                style="--active-color: ${stage.color}"
                aria-label="${textOnly}" title="${textOnly}"
            >
                <span>${textOnly}</span>
            </button>`;
    }).join('');
}

// Called when project (team) filter changes
function onProjectChange() {
    if (typeof renderDashboard === 'function') renderDashboard();
    renderStageTabs(window.currentActiveView);
}

// Current mode state
let currentMode = 'pm';
let currentUser = null; // For dev mode filtering

// Initialize mode system
function initModeSystem() {
    // 1. Check for query parameter (highest priority)
    const urlParams = new URLSearchParams(window.location.search);
    const queryMode = urlParams.get('mode')?.toLowerCase();
    
    // 2. Load mode from localStorage or use default from metadata
    const savedMode = localStorage.getItem('khyaal_mode');
    const defaultMode = UPDATE_DATA?.metadata?.modes?.default || 'pm';
    
    // Determine current mode
    if (queryMode && MODE_CONFIG[queryMode]) {
        currentMode = queryMode;
        localStorage.setItem('khyaal_mode', queryMode);
        console.log(`📡 Mode set by query param: ${queryMode.toUpperCase()}`);
    } else {
        currentMode = savedMode || defaultMode;
    }

    // Load user preference (for dev mode)
    currentUser = localStorage.getItem('khyaal_current_user');

    // Apply mode
    applyMode(currentMode);

    // Add mode switcher to UI
    renderModeSwitcher();

    console.log(`Mode system initialized: ${currentMode.toUpperCase()} mode`);
}

// Switch between modes
function switchMode(mode, stayInModal = false) {
    if (!MODE_CONFIG[mode]) {
        console.error(`Invalid mode: ${mode}`);
        return;
    }

    // Grant ceiling: block if user lacks permission for this mode on the active project
    if (window.CURRENT_USER && window.ACTIVE_PROJECT_ID) {
        const grant = (window.CURRENT_USER.grants || []).find(g => g.projectId === window.ACTIVE_PROJECT_ID)
        if (grant) {
            const modeOrder = { pm: 3, dev: 2, exec: 1 }
            const grantLevel = modeOrder[grant.mode] || 0
            const requestedLevel = modeOrder[mode] || 0
            if (requestedLevel > grantLevel) {
                if (typeof showToast === 'function')
                    showToast(`Access limited to ${grant.mode.toUpperCase()} mode for this project`, 'error')
                return
            }
        }
    }

    currentMode = mode;
    localStorage.setItem('khyaal_mode', mode);

    // Apply mode styling and view restrictions
    applyMode(mode);

    // Switch to default view for this mode IF NOT requested to stay in modal
    const config = MODE_CONFIG[mode];
    const viewToShow = config.defaultView;

    // If switching to dev mode for the first time, prompt for user
    if (mode === 'dev' && !currentUser) {
        promptUserSelection();
    }

    // Switch view only if not staying in modal (preserves the popover)
    if (!stayInModal && typeof switchView === 'function') {
        switchView(viewToShow);
    }

    console.log(`Switched to ${config.name} mode ${stayInModal ? '(staying in modal)' : ''}`);

    // Show brief persona-switch banner
    showPersonaSwitchBanner(config);
}

// Apply mode-specific styling and restrictions
function applyMode(mode) {
    const body = document.body;
    const config = MODE_CONFIG[mode];

    // Remove all mode classes
    body.classList.remove('mode-pm', 'mode-dev', 'mode-exec');

    // Add current mode class
    body.classList.add(`mode-${mode}`);

    // Update CSS custom properties for theme
    const colorMap = {
        blue: '#3b82f6',
        green: '#10b981',
        purple: '#8b5cf6'
    };
    document.documentElement.style.setProperty('--mode-color', colorMap[config.color]);

    // Update mode switcher active state
    updateModeSwitcherState();

    // Render stage tabs and view sub-tabs for new nav system
    const activeView = window.currentActiveView || MODE_CONFIG[mode].defaultView;
    renderStageTabs(activeView);
    renderViewSubtabs(activeView);

    // Update workflow navigation (kept for Engineering Playbook reference)
    if (typeof renderWorkflowNav === 'function') {
        renderWorkflowNav();
    }
    if (typeof updateCommandStripNav === 'function') {
        updateCommandStripNav();
    }

    // Update title suffix
    const titleEl = document.getElementById('page-title');
    if (titleEl && UPDATE_DATA?.metadata?.title) {
        titleEl.textContent = UPDATE_DATA.metadata.title + ` (${config.name} View)`;
    }
}

// Render mode switcher — 3-button segmented control
function renderModeSwitcher() {
    const container = document.getElementById('header-mode-switcher');
    if (!container) return;

    const modes = [
        { key: 'pm',   label: 'PM',   icon: '👨‍💼', title: 'Product Manager — strategic planning, backlog, sprints' },
        { key: 'dev',  label: 'Dev',  icon: '👩‍💻', title: 'Developer — my tasks, kanban, sprint board' },
        { key: 'exec', label: 'Exec', icon: '👔',  title: 'Executive — OKRs, metrics, release health' }
    ];

    const grant = (window.CURRENT_USER && window.ACTIVE_PROJECT_ID)
        ? (window.CURRENT_USER.grants || []).find(g => g.projectId === window.ACTIVE_PROJECT_ID)
        : null
    const modeOrder = { pm: 3, dev: 2, exec: 1 }
    const grantLevel = grant ? (modeOrder[grant.mode] || 3) : 3  // no restriction if no user yet

    container.innerHTML = `<div class="mode-seg-control" role="group" aria-label="Persona mode">
        ${modes.map(m => {
            const allowed = (modeOrder[m.key] || 0) <= grantLevel
            return `<button ${allowed ? `onclick="switchMode('${m.key}')"` : 'disabled'}
                class="mode-seg-btn ${currentMode === m.key ? 'mode-seg-active' : ''} ${!allowed ? 'opacity-40 cursor-not-allowed' : ''}"
                title="${allowed ? m.title : `Requires ${m.key.toUpperCase()} grant for this project`}"
                aria-pressed="${currentMode === m.key}">
                <span>${m.icon}</span><span class="mode-seg-label">${m.label}</span>
            </button>`
        }).join('')}
    </div>`;
}

// Update active state of mode buttons
function updateModeSwitcherState() {
    // Handled by re-rendering for simplicity in the compact pill design
    renderModeSwitcher();
}

// Render dynamic navigation — legacy function, container removed.
// Navigation now uses renderStageTabs() + renderViewSubtabs() in the app bar.
function renderDynamicNavigation(mode) {
    const container = document.getElementById('dynamic-nav-container');
    if (!container) return; // Container no longer exists — nav moved to stage tabs

    const config = MODE_CONFIG[mode];
    const navOrder = config.primaryNavOrder || [];
    const availableViews = config.availableViews || [];

    // Determine active view
    const activeView = document.querySelector('.view-section.active')?.id.replace('-view', '') || config.defaultView;

    // Build primary navigation buttons (in order)
    const primaryButtons = navOrder
        .filter(viewId => availableViews.includes(viewId) && VIEW_METADATA[viewId])
        .map(viewId => {
            const meta = VIEW_METADATA[viewId];
            const isActive = activeView === viewId;
            const tabCountId = meta.badge || `tab-count-${viewId}`;

            return `
                <button
                    onclick="switchView('${viewId}')"
                    id="btn-${viewId}"
                    class="filter-btn ${isActive ? 'active' : ''}"
                >
                    ${meta.label}<span id="${tabCountId}" class="${meta.badge ? meta.badge : 'tab-count'}"></span>
                </button>
            `;
        })
        .join('');

    // Build "More Views" dropdown for secondary views
    const moreViews = availableViews
        .filter(viewId => {
            const meta = VIEW_METADATA[viewId];
            return meta && meta.category === 'more';
        })
        .map(viewId => {
            const meta = VIEW_METADATA[viewId];
            const isActive = activeView === viewId;

            return `
                <button
                    onclick="switchView('${viewId}')"
                    id="btn-${viewId}"
                    class="filter-btn !justify-start w-full ${isActive ? 'active' : ''}"
                >
                    ${meta.label}<span id="tab-count-${viewId}" class="tab-count ml-auto"></span>
                </button>
            `;
        })
        .join('');

    const moreViewsDropdown = moreViews ? `
        <div class="relative group">
            <button class="filter-btn flex items-center gap-1">
                More Views
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            <div class="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col gap-1 z-50">
                ${moreViews}
            </div>
        </div>
    ` : '';

    // Build special views (like workflow playbook)
    const specialViews = availableViews
        .filter(viewId => {
            const meta = VIEW_METADATA[viewId];
            return meta && meta.category === 'special';
        })
        .map(viewId => {
            const meta = VIEW_METADATA[viewId];
            const isActive = activeView === viewId;

            return `
                <button
                    onclick="switchView('${viewId}')"
                    id="btn-${viewId}"
                    class="filter-btn ${meta.style || ''} ${isActive ? 'active' : ''}"
                >
                    ${meta.label}
                </button>
            `;
        })
        .join('');

    // Combine all navigation elements
    container.innerHTML = primaryButtons + moreViewsDropdown + specialViews;
}

// filterViewsByMode — removed (deprecated, replaced by stage tabs + view subtabs)

// Prompt user to select their name (for dev mode) — proper modal, no browser dialogs
function promptUserSelection() {
    const contributors = [...new Set(
        (window.UPDATE_DATA?.tracks || []).flatMap(t =>
            t.subtracks.flatMap(s => s.items.flatMap(i => i.contributors || []))
        )
    )].sort();

    if (!contributors.length) {
        if (typeof showHandoffToast === 'function')
            showHandoffToast('No contributors found — add contributors to items first', null, null, 4000);
        return;
    }

    const existing = document.getElementById('dev-user-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'dev-user-modal';
    el.className = 'dev-user-modal-overlay';
    el.innerHTML = `<div class="dev-user-modal-card">
        <p class="text-xs font-black text-slate-800 mb-1">Who are you?</p>
        <p class="text-[11px] text-slate-400 mb-3">Dev mode filters tasks to your name.</p>
        <div class="flex flex-wrap gap-2">
            ${contributors.map(c => `<button onclick="selectDevUser('${c.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')" class="dev-user-btn">${c}</button>`).join('')}
        </div>
        <button onclick="document.getElementById('dev-user-modal').remove()"
            class="mt-4 text-[10px] text-slate-400 hover:text-slate-600 transition-colors block">
            Skip — show all tasks
        </button>
    </div>`;
    document.body.appendChild(el);
}

function selectDevUser(name) {
    currentUser = name;
    localStorage.setItem('khyaal_current_user', name);
    document.getElementById('dev-user-modal')?.remove();
    if (typeof showHandoffToast === 'function')
        showHandoffToast(`Dev mode: showing ${name}'s tasks`, null, null, 3000);
    if (typeof renderDashboard === 'function') renderDashboard();
}

// Get current mode
function getCurrentMode() {
    return currentMode;
}

// Get current user (for dev mode)
function getCurrentUser() {
    return currentUser;
}

// Check if a view is available in current mode
function isViewAvailable(viewId) {
    const config = MODE_CONFIG[currentMode];
    return config.availableViews.includes(viewId);
}

// Get mode-specific filter for items
function getModeFilter() {
    if (currentMode === 'dev' && currentUser) {
        // Filter to show only current user's tasks
        return (item) => {
            return item.contributors && item.contributors.includes(currentUser);
        };
    }

    if (currentMode === 'exec') {
        // Filter to show only high-priority, in-progress, or blocked items
        return (item) => {
            return item.priority === 'high' ||
                   item.status === 'now' ||
                   item.blocker === true;
        };
    }

    // PM mode shows everything
    return null;
}

// Add keyboard shortcut to switch modes
document.addEventListener('keydown', (e) => {
    // Alt + 1 = PM mode
    // Alt + 2 = Dev mode
    // Alt + 3 = Exec mode
    if (e.altKey && e.key >= '1' && e.key <= '3') {
        const modes = ['pm', 'dev', 'exec'];
        switchMode(modes[parseInt(e.key) - 1]);
        e.preventDefault();
    }
});

// Show a brief auto-dismiss banner after persona switch
function showPersonaSwitchBanner(config) {
    const existing = document.getElementById('persona-switch-banner');
    if (existing) existing.remove();

    const viewCount = config.availableViews ? config.availableViews.length : 0;
    const colorMap = { blue: '#3b82f6', green: '#10b981', purple: '#8b5cf6' };
    const bgColor = colorMap[config.color] || '#3b82f6';

    const banner = document.createElement('div');
    banner.id = 'persona-switch-banner';
    banner.style.cssText = `
        position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
        background: ${bgColor}; color: white; padding: 8px 20px;
        border-radius: 20px; font-size: 0.75rem; font-weight: 700;
        z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        display: flex; align-items: center; gap: 8px;
        animation: slideDownFade 0.25s ease;
        white-space: nowrap;
    `;
    banner.innerHTML = `${config.icon} Switched to ${config.name} · ${viewCount} views available <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;opacity:0.7;cursor:pointer;font-size:1rem;line-height:1;padding:0 0 0 6px">×</button>`;
    document.body.appendChild(banner);

    setTimeout(() => { if (banner.parentElement) banner.remove(); }, 3500);
}

// Export functions for global use
window.initModeSystem = initModeSystem;
window.switchMode = switchMode;
window.getCurrentMode = getCurrentMode;
window.getCurrentUser = getCurrentUser;
window.isViewAvailable = isViewAvailable;
window.getModeFilter = getModeFilter;
window.promptUserSelection = promptUserSelection;
window.selectDevUser = selectDevUser;
window.renderStageTabs = renderStageTabs;
window.renderViewSubtabs = renderViewSubtabs;
window.switchStage = switchStage;
window.getStageForView = getStageForView;
window.onProjectChange = onProjectChange;
