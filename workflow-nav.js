// ========================================
// WORKFLOW NAVIGATION SYSTEM
// ========================================
// Provides staged navigation through the product management lifecycle
// Guides users through: Strategic → Planning → Execution → Reporting

const WORKFLOW_STAGES = {
    discovery: {
        name: 'Discover',
        icon: '🔍',
        label: 'Validation',
        description: 'Spikes & Ideation: Capturing ideas and validating feasibility',
        cadence: 'Ongoing',
        views: ['workflow', 'ideation', 'spikes'],
        pinnedViews: { pm: ['ideation'], dev: ['spikes'], exec: [] },
        color: '#6366f1',
        order: 1
    },
    vision: {
        name: 'Vision',
        icon: '🌟',
        label: 'Strategic',
        description: 'Strategic Alignment: Setting OKRs and defining strategic Epics',
        cadence: 'Quarterly',
        views: ['okr', 'epics'],
        pinnedViews: { pm: ['okr', 'epics'], dev: [], exec: ['okr', 'epics'] },
        color: '#8b5cf6',
        order: 2
    },
    plan: {
        name: 'Plan',
        icon: '📐',
        label: 'Planning',
        description: 'Sprint Planning: Grooming backlog, planning sprints, mapping roadmap horizons',
        cadence: 'Weekly',
        views: ['roadmap', 'backlog', 'sprint', 'gantt', 'capacity'],
        pinnedViews: { pm: ['sprint', 'roadmap', 'backlog'], dev: ['sprint'], exec: ['roadmap'] },
        color: '#3b82f6',
        order: 3
    },
    build: {
        name: 'Build',
        icon: '⚡',
        label: 'Execution',
        description: 'High-Velocity Execution: Moving tasks to done and unblocking the team',
        cadence: 'Daily',
        views: ['kanban', 'track', 'dependency', 'status', 'priority', 'contributor'],
        pinnedViews: { pm: ['kanban', 'track'], dev: ['kanban', 'track', 'dependency'], exec: [] },
        color: '#10b981',
        order: 4
    },
    review: {
        name: 'Ship',
        icon: '🏁',
        label: 'Ship & Review',
        description: 'Ship & Retro: Publish releases, review analytics, update OKR progress',
        cadence: 'Per Sprint',
        views: ['releases', 'analytics', 'dashboard', 'activity'],
        pinnedViews: { pm: ['releases', 'analytics'], dev: ['releases'], exec: ['dashboard', 'analytics'] },
        color: '#f59e0b',
        order: 5
    }
};

// Current workflow state
let currentWorkflowStage = 'discovery';
let isWorkflowNavExpanded = true;

// Initialize workflow navigation
function initWorkflowNav() {
    // Load expanded state from localStorage
    const savedExpanded = localStorage.getItem('khyaal_workflow_nav_expanded');
    isWorkflowNavExpanded = savedExpanded === null ? true : savedExpanded === 'true';

    // Always derive stage from the active view — localStorage is only a hint
    // for the stage switcher popover, not for the breadcrumb display
    const activeView = window.currentActiveView
    if (activeView) {
        for (const [key, stage] of Object.entries(WORKFLOW_STAGES)) {
            if (stage.views.includes(activeView)) {
                currentWorkflowStage = key
                localStorage.setItem('khyaal_workflow_stage', key)
                break
            }
        }
    } else {
        const savedStage = localStorage.getItem('khyaal_workflow_stage')
        if (savedStage && WORKFLOW_STAGES[savedStage]) {
            currentWorkflowStage = savedStage
        } else {
            detectStageFromView()
        }
    }

    // Render workflow navigation
    renderWorkflowNav();

    // Synergistic Sync: Ensure top ribbon matches initial state
    updateCommandStripNav();

    console.log('✅ Workflow navigation initialized');
}

// Detect workflow stage based on current active view
function detectStageFromView() {
    if (window.isActionLockActive) return;
    try {
        // Prefer window.currentActiveView — always set authoritatively by switchView()
        // before any DOM manipulation, so it's never stale.
        // Fall back to DOM query only when window.currentActiveView is absent.
        let activeView = window.currentActiveView;
        if (!activeView) {
            const sections = document.querySelectorAll('.view-section.active');
            if (sections.length === 0) return;
            const activeSection = sections[sections.length - 1];
            activeView = activeSection.id.replace('-view', '');
        }

        if (!activeView) return;

        // Find which stage contains this view
        for (const [stageKey, stage] of Object.entries(WORKFLOW_STAGES)) {
            if (stage.views.includes(activeView)) {
                const stageChanged = currentWorkflowStage !== stageKey;
                currentWorkflowStage = stageKey;
                window.khyaal_current_stage = stageKey;
                localStorage.setItem('khyaal_workflow_stage', stageKey);

                console.log(`🧬 Stage Detected: ${stageKey} (from ${activeView})`);

                if (stageChanged && typeof updateWorkflowStageUI === 'function') {
                    updateWorkflowStageUI();
                }
                return;
            }
        }
    } catch (e) {
        console.error('❌ detectStageFromView Error:', e);
    }
}
function switchWorkflowStage(stageKey) {
    if (!WORKFLOW_STAGES[stageKey]) {
        console.error(`Invalid workflow stage: ${stageKey}`);
        return;
    }

    currentWorkflowStage = stageKey;
    localStorage.setItem('khyaal_workflow_stage', stageKey);

    // Switch to default view for this stage
    const stage = WORKFLOW_STAGES[stageKey];
    const defaultView = stage.views[0];

    // Set global view state BEFORE rendering breadcrumb so updateCommandStripNav
    // reads the correct view name — not the stale previous view
    window.currentActiveView = defaultView;

    // Close the strategy panel immediately — user has made their selection
    const navContainer = document.getElementById('workflow-nav-container');
    const navBackdrop = document.getElementById('strategy-backdrop');
    if (navContainer) navContainer.classList.add('hidden', 'pointer-events-none');
    if (navBackdrop) navBackdrop.classList.add('hidden', 'pointer-events-none');

    // Update UI
    updateCommandStripNav();

    // Switch view only if not staying in modal (preserves the popover)
    if (typeof switchView === 'function' && defaultView) {
        switchView(defaultView);
    }

    // Dynamic Sync: Update the "outside" chips (view sub-tabs)
    if (typeof renderViewSubtabs === 'function') {
        renderViewSubtabs(defaultView);
    }

    console.log(`Switched to ${stage.name} workflow stage`);
}

/**
 * Update the compact header navigation (Command Strip)
 */
function updateCommandStripNav() {
    const miniPipeline = document.getElementById('mini-pipeline');
    const breadcrumb = document.getElementById('breadcrumb-nav');

    if (!miniPipeline || !breadcrumb) {
        console.warn('⚠️ Navigation placeholders (mini-pipeline or breadcrumb-nav) missing from DOM. Skipping ribbon render.');
        return;
    }

    const availableStages = Object.entries(WORKFLOW_STAGES)
        .filter(([key]) => isStageAvailableInCurrentMode(key));

    const currentIdx = availableStages.findIndex(([key]) => key === currentWorkflowStage);

    // 1. Render Mini Icons
    miniPipeline.innerHTML = availableStages
        .map(([key, stage], index) => {
            const isActive = currentWorkflowStage === key;
            const isPast = index < currentIdx;

            return `
                <button onclick="switchWorkflowStage('${key}')" 
                    class="mini-pipeline-btn ${isActive ? 'active shadow-sm' : 'bg-transparent text-slate-400 hover:bg-slate-200/40'}"
                    title="${stage.name}"
                    style="${isActive ? `background-color: ${stage.color}; color: white;` : ''}"
                >
                    <span class="text-xs">${stage.icon}</span>
                </button>
            `;
        }).join('');

    // 2. Render Breadcrumb
    const activeStage = WORKFLOW_STAGES[currentWorkflowStage];
    // Use window.currentActiveView only — DOM query returns stale active section
    // since the DOM hasn't updated yet when called from switchWorkflowStage
    const activeViewId = window.currentActiveView || 'okr';
    const viewName = formatViewName(activeViewId);

    breadcrumb.innerHTML = `
        <div class="flex items-center cursor-pointer group hover:bg-slate-50/50 px-2 py-1 rounded-lg transition-all" onclick="toggleStrategyMenu()">
            <span class="font-black text-[13px] group-hover:text-indigo-600 transition-colors" 
                  style="color: ${activeStage?.color || '#6366f1'}">
                ${activeStage ? activeStage.name : 'Unknown'}
            </span>
            <span class="mx-1 text-slate-300 group-hover:text-slate-400">/</span>
            <span class="text-slate-600 font-bold text-[12px] group-hover:text-black">${viewName}</span>
            <span class="ml-1.5 text-[8px] text-slate-400 group-hover:text-indigo-400 transition-colors">▼</span>
        </div>
    `;
}

/**
 * Format view device IDs into readable nav labels
 */
function formatViewName(viewId) {
    if (!viewId) return 'Home';

    // Labels must match what's shown in the Row 2 chips (modes.js viewLabels)
    const overrides = {
        'okr':        'OKRs',
        'epics':      'Epics',
        'roadmap':    'Roadmap',
        'backlog':    'Backlog',
        'sprint':     'Sprints',
        'releases':   'Releases',
        'my-tasks':   'My Tasks',
        'kanban':     'Kanban',
        'track':      'Tracks',
        'dependency': 'Links',
        'workflow':   'Playbook',
        'dashboard':  'Pulse',
        'analytics':  'Data',
        'capacity':   'Capacity',
        'status':     'State',
        'priority':   'Risk',
        'contributor':'Team',
        'gantt':      'Gantt',
        'ideation':   'Ideas',
        'spikes':     'Spikes'
    };

    if (overrides[viewId]) return overrides[viewId];

    return viewId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function toggleStrategyMenu() {
    const container = document.getElementById('workflow-nav-container');
    const backdrop = document.getElementById('strategy-backdrop');
    if (!container || !backdrop) return;

    const isHidden = container.classList.contains('hidden');
    if (isHidden) {
        renderWorkflowNav(); // Fresh render
        container.classList.remove('hidden', 'pointer-events-none');
        backdrop.classList.remove('hidden', 'pointer-events-none');
        container.classList.add('animate-in', 'fade-in', 'slide-in-from-top-2');

        // Auto-focus on active/priority stage
        setTimeout(scrollToActiveStage, 300);

        // Close on click outside
        const closeHandler = (e) => {
            if (e.target === backdrop) {
                toggleStrategyMenu();
                backdrop.removeEventListener('click', closeHandler);
            }
        };
        backdrop.addEventListener('click', closeHandler);

        console.log('📖 Strategic Navigation opened');
    } else {
        container.classList.add('hidden', 'pointer-events-none');
        backdrop.classList.add('hidden', 'pointer-events-none');
    }
}

let isPipelineExpanded = true;

// Toggle workflow navigation expansion
function toggleWorkflowNav() {
    isWorkflowNavExpanded = !isWorkflowNavExpanded;
    localStorage.setItem('khyaal_workflow_nav_expanded', isWorkflowNavExpanded.toString());

    const container = document.getElementById('workflow-nav-container');
    if (!container) return;

    if (isWorkflowNavExpanded) {
        container.classList.remove('collapsed');
        container.classList.add('expanded');
    } else {
        container.classList.remove('expanded');
        container.classList.add('collapsed');
    }
}

function scrollToActiveStage() {
    const pipeline = document.querySelector('.workflow-pipeline-container');
    const activeStage = document.querySelector('.pipeline-stage.active');

    if (pipeline && activeStage) {
        pipeline.scrollTo({
            left: activeStage.offsetLeft - pipeline.offsetLeft - 60,
            behavior: 'smooth'
        });
    }
}

// Render workflow navigation UI
function renderWorkflowNav() {
    const container = document.getElementById('workflow-nav-container');
    if (!container) {
        console.warn('Workflow nav container not found');
        return;
    }

    const availableStages = Object.entries(WORKFLOW_STAGES)
        .sort((a, b) => a[1].order - b[1].order)
        .filter(([key]) => isStageAvailableInCurrentMode(key));

    const activeMode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';

    const navHtml = `
        <div class="workflow-popover max-w-[1400px] w-full bg-white/95 backdrop-blur-md p-6 rounded-3xl border-2 border-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in-95 duration-200">
            <!-- Header section with Global Actions (Densified/Popover Ready) -->
            <div class="flex items-center justify-between mb-6 px-2">
                <div class="flex items-center gap-3">
                     <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-100">
                        <span class="text-white text-sm font-black italic tracking-tighter">KP</span>
                     </div>
                     <div>
                        <div class="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Strategy Discovery</div>
                        <div class="text-base font-black text-slate-800">Vision-First Lifecycle</div>
                     </div>
                </div>

                ${(window.PROJECT_REGISTRY && window.PROJECT_REGISTRY.length > 1) ? `
                <div class="flex items-center gap-2">
                    <select
                        onchange="switchProject(this.value)"
                        aria-label="Switch project"
                        class="text-xs font-bold bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-slate-700 cursor-pointer hover:border-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >${(window.PROJECT_REGISTRY || []).map(p => `
                        <option value="${p.id}" ${p.id === window.ACTIVE_PROJECT_ID ? 'selected' : ''}>${p.name}</option>
                    `).join('')}</select>
                </div>` : ''}

                <div class="flex flex-col items-center gap-1">
                    <div class="persona-segmented-control">
                        <div class="persona-slider" style="transform: translateX(${activeMode === 'pm' ? '0' : activeMode === 'dev' ? '100.5%' : '201%'});"></div>
                        ${['pm', 'dev', 'exec'].map(mode => {
        const config = (typeof MODE_CONFIG !== 'undefined') ? MODE_CONFIG[mode] : null;
        if (!config) return '';
        const isActive = mode === activeMode;
        const activeClass = isActive ? `active active-${mode}` : '';
        return `
                                <button
                                    onclick="event.stopPropagation(); switchMode('${mode}', true); renderWorkflowNav(); setTimeout(scrollToActiveStage, 100);"
                                    class="persona-tab ${activeClass}"
                                >
                                    <span class="text-xs sm:text-sm">${config.icon}</span>
                                    <span class="hidden sm:inline">${config.name.split(' ')[0]}</span>
                                </button>
                            `;
    }).join('')}
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <button onclick="if(typeof switchView === 'function') switchView('workflow'); if(typeof updateCommandStripNav === 'function') updateCommandStripNav('workflow'); document.getElementById('workflow-nav-container').classList.add('hidden'); document.getElementById('strategy-backdrop').classList.add('hidden');" 
                            class="px-5 py-2.5 bg-indigo-50 border-2 border-indigo-100 text-indigo-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 rounded-2xl text-xs font-black transition-all shadow-sm flex items-center gap-2 group">
                        <span class="group-hover:scale-125 transition-transform">🛠️</span>
                        <span>Engineering Playbook</span>
                    </button>
                    <button onclick="document.getElementById('workflow-nav-container').classList.add('hidden'); document.getElementById('strategy-backdrop').classList.add('hidden');" class="text-slate-400 hover:text-slate-900 p-2 text-xl font-black transition-colors">✕</button>
                </div>
            </div>

            <!-- Horizontal Pipeline Container (Strategy Pop-over Style) -->
            <div class="workflow-pipeline-container flex items-stretch gap-4 pb-2">
                ${availableStages.map(([key, stage], idx) => {
        const isActive = currentWorkflowStage === key;
        const isLast = idx === availableStages.length - 1;
        if (isActive) {
            document.documentElement.style.setProperty('--stage-color', stage.color);
        }

        // Adaptive Hero/Compact Logic: Ensure focus stages match WORKFLOW_STAGES keys
        const activeMode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';
        let displayState = 'hero'; // Default for PM

        if (isActive) {
            displayState = 'hero'; // Selected stage is always prominent
        } else if (activeMode === 'dev') {
            // Developer focus: Planning (plan) & Execution (build)
            displayState = (key === 'plan' || key === 'build') ? 'hero' : 'compact';
        } else if (activeMode === 'exec') {
            // Executive focus: Strategic (discovery, vision) & Analytics (review)
            displayState = (key === 'discovery' || key === 'vision' || key === 'review') ? 'hero' : 'compact';
        }

        return `
                        <div id="stage-card-${key}" class="pipeline-stage ${displayState} flex flex-col gap-3 ${isActive ? 'active' : 'hover:opacity-100'} transition-all duration-500 ease-in-out" style="--stage-color: ${stage.color};">
                            <!-- Stage Header (Clickable) -->
                            <div 
                                class="stage-body cursor-pointer p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${isActive ? 'shadow-md' : 'bg-slate-100 border-slate-200 hover:bg-white text-slate-700'}" 
                                onclick="switchWorkflowStage('${key}')"
                                style="${isActive ? `background-color: var(--stage-color); color: white; border-color: var(--stage-color);` : ''}"
                            >
                                <div class="stage-icon-box text-lg ${isActive ? 'bg-white/20 p-1.5 rounded-md' : ''}">${stage.icon}</div>
                                <div class="stage-info">
                                    <div class="text-[7px] font-black uppercase tracking-widest ${isActive ? 'text-white/70' : 'opacity-60'}">${stage.label}</div>
                                    <div class="text-[13px] font-black tracking-tight">${stage.name}</div>
                                </div>
                                ${isActive ? '<div class="ml-auto text-xs animate-bounce-horizontal">➔</div>' : ''}
                            </div>
                            
                            <!-- Sub-views for THIS stage (Now Wrapping) -->
                            <div class="flex flex-wrap gap-2 px-1 py-1 transition-all duration-500 mt-auto min-h-[44px]">
                                ${stage.views
                .filter(view => isViewAvailableInCurrentMode(view))
                .map(view => {
                    const viewLabels = {
                        'okr': '🎯 OKRs', 'epics': '🚀 Epics', 'roadmap': '🗺️ Roadmap', 'backlog': '📚 Backlog',
                        'sprint': '🏃 Sprints', 'releases': '📦 Releases', 'my-tasks': '✅ Active',
                        'kanban': '📋 Kanban', 'track': '🏗️ Tracks', 'dependency': '🔗 Links',
                        'workflow': '🛠️ Playbook', 'dashboard': '📊 Pulse', 'analytics': '📈 Data',
                        'capacity': '⚖️ Capacity', 'status': '📍 State', 'priority': '🔥 Risk',
                        'contributor': '👥 Team', 'gantt': '📅 Gantt', 'ideation': '💡 Ideas', 'spikes': '🧪 Spikes'
                    };
                    const activeView = document.querySelector('.view-section.active')?.id.replace('-view', '');
                    const isViewActive = activeView === view;

                    return `
                                            <button 
                                                onclick="window.currentActiveView='${view}'; switchView('${view}'); if(typeof renderViewSubtabs==='function') renderViewSubtabs('${view}'); document.getElementById('workflow-nav-container').classList.add('hidden'); document.getElementById('strategy-backdrop').classList.add('hidden');"
                                                class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isViewActive ? 'bg-[var(--stage-color)] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-[var(--stage-color)]/10 hover:text-[var(--stage-color)]'}"
                                                title="Open ${viewLabels[view] || view}"
                                            >
                                                ${viewLabels[view]?.split(' ')[1] || view}
                                            </button>
                                        `;
                }).join('')}
                            </div>
                        </div>

                        ${!isLast ? `
                            <div class="pipeline-connector self-center h-[2px] flex-1 bg-slate-200 relative min-w-[20px] -mt-12">
                                <div class="absolute inset-0 bg-gradient-to-r from-[var(--stage-color)] to-slate-200 opacity-40 shadow-sm" style="width: ${isActive ? '100%' : '0%'}; transition: width 0.5s ease;"></div>
                            </div>
                        ` : ''}
                    `;
    }).join('')}
            </div>
        </div>
    `;

    container.innerHTML = navHtml;

    // Ensure Command Strip is also up to date
    updateCommandStripNav();
}

// Render a single workflow stage
function renderWorkflowStage(key, stage) {
    const isActive = currentWorkflowStage === key;
    const isAvailable = isStageAvailableInCurrentMode(key);

    if (!isAvailable) {
        return ''; // Hide stages not available in current mode
    }

    return `
        <div class="workflow-stage ${isActive ? 'active' : ''}" style="--stage-color: ${stage.color};">
            <div class="workflow-stage-header" onclick="toggleWorkflowStageViews('${key}')">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${stage.icon}</span>
                    <div>
                        <div class="workflow-stage-name">${stage.name}</div>
                        <div class="workflow-stage-cadence">${stage.cadence}</div>
                    </div>
                </div>
                <button
                    class="workflow-stage-toggle ${isActive ? 'expanded' : ''}"
                    title="${isActive ? 'Collapse' : 'Expand'}"
                >
                    ${isActive ? '▼' : '▶'}
                </button>
            </div>

            ${isActive ? `
                <div class="workflow-stage-views">
                    ${stage.views
                .filter(view => isViewAvailableInCurrentMode(view))
                .map(view => renderWorkflowNavPill(view))
                .join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Render a single view within a workflow stage
function renderWorkflowNavPill(viewKey) {
    const viewLabels = {
        'okr': '🎯 OKRs',
        'epics': '📚 Epics',
        'roadmap': '🗺️ Roadmap',
        'backlog': '📝 Backlog',
        'sprint': '🏃 Sprint',
        'releases': '🚀 Releases',
        'my-tasks': '✅ My Tasks',
        'kanban': '📋 Kanban',
        'track': '🛤️ Track',
        'dependency': '🔗 Dependencies',
        'workflow': '⚙️ Workflow',
        'dashboard': '📊 Dashboard',
        'analytics': '📈 Analytics',
        'capacity': '⚖️ Capacity',
        'status': '📍 Status',
        'priority': '🔥 Priority',
        'contributor': '👥 Contributors',
        'gantt': '📅 Gantt',
        'ideation': '💡 Ideation',
        'spikes': '🧪 Spikes'
    };

    const activeView = document.querySelector('.view-section.active')?.id.replace('-view', '');
    const isActive = activeView === viewKey;

    return `
        <button
            onclick="switchView('${viewKey}')"
            class="workflow-view-btn ${isActive ? 'active' : ''}"
            id="workflow-btn-${viewKey}"
        >
            ${viewLabels[viewKey] || viewKey}
        </button>
    `;
}

// Toggle workflow stage views (expand/collapse)
function toggleWorkflowStageViews(stageKey) {
    if (currentWorkflowStage === stageKey) {
        // Already expanded, collapse it
        currentWorkflowStage = null;
        localStorage.removeItem('khyaal_workflow_stage');
    } else {
        // Expand this stage
        switchWorkflowStage(stageKey);
    }
    renderWorkflowNav();
}

// Update workflow stage UI (when switching views)
function updateWorkflowStageUI() {
    detectStageFromView();
    renderWorkflowNav();
}

// Check if a stage is available in current mode
function isStageAvailableInCurrentMode(stageKey) {
    const stage = WORKFLOW_STAGES[stageKey];
    if (!stage) return false;

    const currentMode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';

    // Developer mode focus: Planning & Execution
    if (currentMode === 'dev') {
        return ['plan', 'build', 'review'].includes(stageKey);
    }

    // Executive mode focus: Discovery, Vision & Review (Strategic & Reporting)
    if (currentMode === 'exec') {
        return ['discovery', 'vision', 'review'].includes(stageKey);
    }

    // PM mode: Full Lifecycle
    return true;
}

// Check if a view is available in current mode
function isViewAvailableInCurrentMode(viewKey) {
    // Use existing isViewAvailable function if it exists
    if (typeof isViewAvailable === 'function') {
        return isViewAvailable(viewKey);
    }

    // Fallback: assume all views are available
    return true;
}

// Get current workflow stage
function getCurrentWorkflowStage() {
    return currentWorkflowStage;
}

// Get recommended next action for current stage
function getRecommendedNextAction() {
    const stage = WORKFLOW_STAGES[currentWorkflowStage];
    if (!stage) return null;

    const recommendations = {
        discovery: {
            title: 'Explore Discovery',
            actions: [
                { text: 'Add new ideation item', view: 'ideation' },
                { text: 'Explore technical spikes', view: 'spikes' },
                { text: 'Analyze market horizons', view: 'ideation' }
            ]
        },
        vision: {
            title: 'Align Vision',
            actions: [
                { text: 'Create OKRs for this quarter', view: 'okr' },
                { text: 'Define Strategic Epics', view: 'epics' },
                { text: 'Review strategic alignment', view: 'roadmap' }
            ]
        },
        definition: {
            title: 'Define Requirements',
            actions: [
                { text: 'Groom and scope stories', view: 'backlog' },
                { text: 'Plan next sprint', view: 'sprint' },
                { text: 'Schedule upcoming releases', view: 'releases' }
            ]
        },
        delivery: {
            title: 'Execute Delivery',
            actions: [
                { text: 'Update task status on Kanban', view: 'kanban' },
                { text: 'Resolve blockers & dependencies', view: 'dependency' },
                { text: 'Track delivery by track', view: 'track' }
            ]
        },
        review: {
            title: 'Review Pulse',
            actions: [
                { text: 'View executive pulse', view: 'dashboard' },
                { text: 'Analyze cycle velocity', view: 'analytics' },
                { text: 'Review team performance', view: 'contributor' }
            ]
        }
    };

    return recommendations[currentWorkflowStage] || null;
}

// Show recommended next actions panel
function showRecommendedActions() {
    const recommendation = getRecommendedNextAction();
    if (!recommendation) return;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-black text-slate-800">${recommendation.title}</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600">
                    ✕
                </button>
            </div>

            <div class="space-y-2">
                ${recommendation.actions.map(action => `
                    <button
                        onclick="switchView('${action.view}'); this.closest('.fixed').remove();"
                        class="w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border-2 border-transparent transition-all"
                    >
                        <span class="font-semibold text-slate-700">${action.text}</span>
                    </button>
                `).join('')}
            </div>

            <div class="mt-6 text-xs text-slate-500 italic">
                💡 Tip: Follow the workflow stages for best results: Strategic → Planning → Execution → Reporting
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Hook into view switching to update workflow nav
const originalSwitchView = window.switchView;
if (originalSwitchView) {
    window.switchView = function (view) {
        originalSwitchView(view);
        updateWorkflowStageUI();
    };
}

// Export functions for global use
window.initWorkflowNav = initWorkflowNav;
window.switchWorkflowStage = switchWorkflowStage;
window.toggleWorkflowNav = toggleWorkflowNav;
window.updateWorkflowStageUI = updateWorkflowStageUI;
window.getCurrentWorkflowStage = getCurrentWorkflowStage;
window.getRecommendedNextAction = getRecommendedNextAction;
window.showRecommendedActions = showRecommendedActions;
window.updateCommandStripNav = updateCommandStripNav;
window.detectStageFromView = detectStageFromView;
window.toggleStrategyMenu = toggleStrategyMenu; // Global exposure for perspective buttons

// 4. Synergistic Initialization: Force accurate state sync 
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Finalizing navigation sync...');
    detectStageFromView();
    updateCommandStripNav();
});
