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
            'track', 'releases', 'status', 'priority', 'contributor', 'gantt', 'workflow', 'dashboard'
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
            'my-tasks', 'kanban', 'track', 'dependency', 'sprint', 'workflow'
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
            'dashboard', 'epics', 'okr', 'analytics', 'roadmap', 'releases'
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
    'status': { label: 'By Status', category: 'more' },
    'priority': { label: 'By Priority', category: 'more' },
    'contributor': { label: 'By Contributor', category: 'more' },
    'dependency': { label: '🕸️ Dependencies', category: 'more' },
    'gantt': { label: 'Gantt Chart', category: 'more' },
    'workflow': { label: '🛠️ Engineering Playbook', category: 'special', style: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-bold ml-2 shadow-sm whitespace-nowrap' }
};

// Current mode state
let currentMode = 'pm';
let currentUser = null; // For dev mode filtering

// Initialize mode system
function initModeSystem() {
    // Load mode from localStorage or use default from metadata
    const savedMode = localStorage.getItem('khyaal_mode');
    const defaultMode = UPDATE_DATA?.metadata?.modes?.default || 'pm';
    currentMode = savedMode || defaultMode;

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

    // Render dynamic navigation based on mode
    renderDynamicNavigation(mode);

    // Update workflow navigation
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

// Render mode switcher in header
function renderModeSwitcher() {
    const container = document.getElementById('header-mode-switcher');
    if (!container) return;

    const config = MODE_CONFIG[currentMode];
    const colorClass = currentMode === 'dev' ? 'text-emerald-800 bg-emerald-50/50 border-emerald-100' : 
                      currentMode === 'exec' ? 'text-purple-800 bg-purple-50/50 border-purple-100' : 
                      'text-indigo-800 bg-indigo-50/50 border-indigo-100';

    const dotColor = currentMode === 'dev' ? 'bg-emerald-500' : 
                     currentMode === 'exec' ? 'bg-purple-500' : 
                     'bg-indigo-500';

    container.innerHTML = `
        <button onclick="if(typeof toggleStrategyMenu === 'function') toggleStrategyMenu()" 
                class="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border ${colorClass} transition-all hover:bg-white hover:shadow-sm active:scale-95 group relative">
            
            <div class="flex items-center gap-2">
                <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-20"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 ${dotColor}"></span>
                </span>
                <span class="text-[10px] font-black uppercase tracking-widest opacity-40">Perspective:</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="text-xs font-black uppercase tracking-widest">${config.name}</span>
                <span class="text-[8px] opacity-20 group-hover:opacity-100 transition-opacity translate-y-[0.5px]">▼</span>
            </div>
        </button>
    `;
}

// Update active state of mode buttons
function updateModeSwitcherState() {
    // Handled by re-rendering for simplicity in the compact pill design
    renderModeSwitcher();
}

// Render dynamic navigation based on current mode
function renderDynamicNavigation(mode) {
    const container = document.getElementById('dynamic-nav-container');
    if (!container) return; // Silent return as container is removed

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

// Filter which view buttons are shown based on mode (Legacy - replaced by renderDynamicNavigation)
function filterViewsByMode(mode) {
    // This function is now deprecated in favor of renderDynamicNavigation
    // Kept for backwards compatibility
    const config = MODE_CONFIG[mode];
    const allViewButtons = document.querySelectorAll('.filter-btn');

    allViewButtons.forEach(btn => {
        const viewId = btn.id.replace('btn-', '');

        if (config.availableViews.includes(viewId)) {
            btn.style.display = '';
        } else {
            btn.style.display = 'none';
        }
    });

    // Special handling for "More Views" dropdown
    const moreViewsBtn = document.querySelector('.relative.group');
    if (moreViewsBtn) {
        const dropdownItems = moreViewsBtn.querySelectorAll('.filter-btn');
        const hasVisibleItems = Array.from(dropdownItems).some(btn => btn.style.display !== 'none');
        moreViewsBtn.style.display = hasVisibleItems ? '' : 'none';
    }
}

// Prompt user to select their name (for dev mode)
function promptUserSelection() {
    const contributors = new Set();

    // Extract all unique contributors from data
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.contributors && Array.isArray(item.contributors)) {
                    item.contributors.forEach(c => contributors.add(c));
                }
            });
        });
    });

    const contributorList = Array.from(contributors).sort();

    if (contributorList.length === 0) {
        alert('No contributors found in the system.');
        return;
    }

    const selected = prompt(
        'Select your name for Developer Mode:\n\n' +
        contributorList.map((c, i) => `${i + 1}. ${c}`).join('\n') +
        '\n\nEnter the number or name:'
    );

    if (!selected) return;

    // Check if number was entered
    const index = parseInt(selected) - 1;
    let userName;

    if (!isNaN(index) && contributorList[index]) {
        userName = contributorList[index];
    } else if (contributorList.includes(selected)) {
        userName = selected;
    } else {
        alert('Invalid selection');
        return;
    }

    currentUser = userName;
    localStorage.setItem('khyaal_current_user', userName);

    // Reload current view to apply filtering
    if (typeof filterData === 'function') {
        filterData();
    }
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
                   item.status === 'ongoing' ||
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

// Export functions for global use
window.initModeSystem = initModeSystem;
window.switchMode = switchMode;
window.getCurrentMode = getCurrentMode;
window.getCurrentUser = getCurrentUser;
window.isViewAvailable = isViewAvailable;
window.getModeFilter = getModeFilter;
window.promptUserSelection = promptUserSelection;
