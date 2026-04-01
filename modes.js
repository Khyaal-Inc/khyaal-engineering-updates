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
        defaultView: 'epics',
        availableViews: [
            'epics', 'roadmap', 'backlog', 'sprint', 'kanban',
            'dependency', 'okr', 'capacity', 'analytics',
            'track', 'releases', 'status', 'priority', 'contributor', 'gantt', 'workflow'
        ],
        description: 'Strategic planning, backlog grooming, sprint management'
    },
    dev: {
        name: 'Developer',
        icon: '👩‍💻',
        color: 'green',
        defaultView: 'my-tasks',
        availableViews: [
            'my-tasks', 'kanban', 'track', 'dependency', 'sprint', 'workflow'
        ],
        description: 'Task execution, blocker resolution, sprint focus'
    },
    exec: {
        name: 'Executive',
        icon: '👔',
        color: 'purple',
        defaultView: 'dashboard',
        availableViews: [
            'dashboard', 'epics', 'okr', 'analytics', 'roadmap', 'releases'
        ],
        description: 'High-level health, strategic alignment, reporting'
    }
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
function switchMode(mode) {
    if (!MODE_CONFIG[mode]) {
        console.error(`Invalid mode: ${mode}`);
        return;
    }

    currentMode = mode;
    localStorage.setItem('khyaal_mode', mode);

    // Apply mode styling and view restrictions
    applyMode(mode);

    // Switch to default view for this mode
    const config = MODE_CONFIG[mode];
    const viewToShow = config.defaultView;

    // If switching to dev mode for the first time, prompt for user
    if (mode === 'dev' && !currentUser) {
        promptUserSelection();
    }

    // Switch view
    if (typeof switchView === 'function') {
        switchView(viewToShow);
    }

    console.log(`Switched to ${config.name} mode`);
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

    // Hide/show views based on mode
    filterViewsByMode(mode);

    // Update title suffix
    const titleEl = document.getElementById('page-title');
    if (titleEl && UPDATE_DATA?.metadata?.title) {
        titleEl.textContent = UPDATE_DATA.metadata.title + ` (${config.name} View)`;
    }
}

// Render mode switcher in header
function renderModeSwitcher() {
    const container = document.getElementById('mode-switcher-container');
    if (!container) {
        console.warn('Mode switcher container not found');
        return;
    }

    // Check if already rendered
    if (document.querySelector('.mode-switcher')) {
        updateModeSwitcherState();
        return;
    }

    const switcherHtml = `
        <div class="mode-switcher" style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Mode:</span>
            ${Object.keys(MODE_CONFIG).map(mode => {
                const config = MODE_CONFIG[mode];
                return `
                    <button
                        onclick="switchMode('${mode}')"
                        class="mode-btn mode-btn-${mode} px-3 py-1.5 rounded-lg text-sm font-bold transition-all border-2"
                        title="${config.description}"
                    >
                        ${config.icon} ${config.name}
                    </button>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = switcherHtml;
    updateModeSwitcherState();
}

// Update active state of mode buttons
function updateModeSwitcherState() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        const mode = btn.classList[1].replace('mode-btn-', '');
        if (mode === currentMode) {
            btn.classList.add('active');
            btn.style.cssText = 'background: var(--mode-color); color: white; border-color: var(--mode-color);';
        } else {
            btn.classList.remove('active');
            btn.style.cssText = 'background: white; color: #64748b; border-color: #e2e8f0;';
        }
    });
}

// Filter which view buttons are shown based on mode
function filterViewsByMode(mode) {
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
