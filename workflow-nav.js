// ========================================
// WORKFLOW NAVIGATION SYSTEM
// ========================================
// Provides staged navigation through the product management lifecycle
// Guides users through: Strategic → Planning → Execution → Reporting

const WORKFLOW_STAGES = {
    strategic: {
        name: 'Strategic',
        icon: '🎯',
        label: 'Discovery',
        description: 'Quarterly planning: Vision, objectives, epics and roadmap',
        cadence: 'Quarterly',
        views: ['okr', 'epics', 'roadmap'],
        color: '#8b5cf6', // purple
        order: 1
    },
    planning: {
        name: 'Planning',
        icon: '📂',
        label: 'Definition',
        description: 'Monthly/Weekly: Backlog grooming, sprint planning, gantt timeline',
        cadence: 'Monthly',
        views: ['backlog', 'sprint', 'gantt', 'releases'],
        color: '#3b82f6', // blue
        order: 2
    },
    execution: {
        name: 'Execution',
        icon: '⚡',
        label: 'Delivery',
        description: 'Daily work: Kanban, track tasks, dependencies, workflow',
        cadence: 'Daily',
        views: ['kanban', 'track', 'dependency'],
        color: '#10b981', // green
        order: 3
    },
    reporting: {
        name: 'Reporting',
        icon: '📊',
        label: 'Analytics',
        description: 'Weekly/Monthly: Dashboard, analytics, capacity, status',
        cadence: 'On-Demand',
        views: ['dashboard', 'analytics', 'capacity', 'status', 'priority', 'contributor'],
        color: '#f59e0b', // amber
        order: 4
    }
};

// Current workflow state
let currentWorkflowStage = 'strategic';
let isWorkflowNavExpanded = true;

// Initialize workflow navigation
function initWorkflowNav() {
    // Load expanded state from localStorage
    const savedExpanded = localStorage.getItem('khyaal_workflow_nav_expanded');
    isWorkflowNavExpanded = savedExpanded === null ? true : savedExpanded === 'true';

    // Load current stage from localStorage or detect from current view
    const savedStage = localStorage.getItem('khyaal_workflow_stage');
    if (savedStage && WORKFLOW_STAGES[savedStage]) {
        currentWorkflowStage = savedStage;
    } else {
        // Detect stage from active view
        detectStageFromView();
    }

    // Render workflow navigation
    renderWorkflowNav();

    console.log('Workflow navigation initialized');
}

// Detect workflow stage based on current active view
function detectStageFromView() {
    const activeView = document.querySelector('.view-section.active')?.id.replace('-view', '');
    if (!activeView) return;

    // Find which stage contains this view
    for (const [stageKey, stage] of Object.entries(WORKFLOW_STAGES)) {
        if (stage.views.includes(activeView)) {
            currentWorkflowStage = stageKey;
            localStorage.setItem('khyaal_workflow_stage', stageKey);
            return;
        }
    }
}

// Switch workflow stage
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

    if (typeof switchView === 'function' && defaultView) {
        // switchView already triggers updateWorkflowStageUI() via the hook
        switchView(defaultView);
    } else {
        updateWorkflowStageUI();
    }

    console.log(`Switched to ${stage.name} workflow stage`);
}

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

    const navHtml = `
        <div class="workflow-nav-v2 mb-10 transition-all duration-500">
            <!-- Header section with Global Actions -->
            <div class="flex items-center justify-between mb-5 px-3">
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                         <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <span class="text-white text-xs font-black italic tracking-tighter">KP</span>
                         </div>
                         <div>
                            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Engineering Pulse</div>
                            <div class="text-xs font-bold text-slate-800">Vision-First Lifecycle</div>
                         </div>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <!-- Global Engineering Playbook (Special Link) -->
                    <button 
                        onclick="switchView('workflow')"
                        class="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-2"
                    >
                        <span>🛠️</span>
                        <span>Engineering Playbook</span>
                    </button>
                    
                    <button 
                        onclick="if (typeof showWizard === 'function') showWizard();"
                        class="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
                    >
                        <span>🧙 Set-up Wizard</span>
                    </button>
                </div>
            </div>

            <!-- Horizontal Pipeline Container -->
            <div class="workflow-pipeline-container bg-white p-2 rounded-2xl border border-slate-200 shadow-xl flex items-stretch gap-4">
                ${availableStages.map(([key, stage], idx) => {
                    const isActive = currentWorkflowStage === key;
                    const isLast = idx === availableStages.length - 1;
                    
                    return `
                        <div class="pipeline-stage flex-1 flex flex-col gap-3 ${isActive ? 'active' : 'hover:opacity-100'} transition-all duration-300" style="--stage-color: ${stage.color};">
                            <!-- Stage Header (Clickable) -->
                            <div 
                                class="stage-body cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${isActive ? 'shadow-lg' : 'bg-slate-100 border-slate-200 hover:bg-white text-slate-700'}" 
                                onclick="switchWorkflowStage('${key}')"
                                style="${isActive ? `background-color: var(--stage-color); color: white; border-color: var(--stage-color);` : ''}"
                            >
                                <div class="stage-icon-box text-2xl ${isActive ? 'bg-white/20 p-2 rounded-lg' : ''}">${stage.icon}</div>
                                <div class="stage-info">
                                    <div class="text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-white/70' : 'opacity-60'}">${stage.label}</div>
                                    <div class="text-sm font-black tracking-tight">${stage.name}</div>
                                </div>
                                ${isActive ? '<div class="ml-auto animate-bounce-horizontal">➔</div>' : ''}
                            </div>
                            
                            <!-- Sub-views for THIS stage (Always visible) -->
                            <div class="flex flex-nowrap gap-2 px-1 py-1 transition-all duration-500 mt-auto min-h-[44px]">
                                ${stage.views
                                    .filter(view => isViewAvailableInCurrentMode(view))
                                    .map(view => {
                                        const viewLabels = {
                                            'okr': '🎯 OKRs', 'epics': '🚀 Epics', 'roadmap': '🗺️ Roadmap', 'backlog': '📚 Backlog',
                                            'sprint': '🏃 Sprints', 'releases': '📦 Releases', 'my-tasks': '✅ Active', 
                                            'kanban': '📋 Kanban', 'track': '🏗️ Tracks', 'dependency': '🔗 Links', 
                                            'workflow': '🛠️ Playbook', 'dashboard': '📊 Pulse', 'analytics': '📈 Data', 
                                            'capacity': '⚖️ Capacity', 'status': '📍 State', 'priority': '🔥 Risk', 
                                            'contributor': '👥 Team', 'gantt': '📅 Gantt'
                                        };
                                        const activeView = document.querySelector('.view-section.active')?.id.replace('-view', '');
                                        const isViewActive = activeView === view;
                                        
                                        return `
                                            <button 
                                                onclick="switchView('${view}')" 
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
                        .map(view => renderWorkflowView(view))
                        .join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Render a single view within a workflow stage
function renderWorkflowView(viewKey) {
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
        'gantt': '📅 Gantt'
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

    // Get current mode
    const currentMode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';

    // Developer mode: Only show Execution and Reporting stages
    if (currentMode === 'dev') {
        return ['execution', 'reporting'].includes(stageKey);
    }

    // Executive mode: Only show Strategic and Reporting stages
    if (currentMode === 'exec') {
        return ['strategic', 'reporting'].includes(stageKey);
    }

    // PM mode: Show all stages
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
        strategic: {
            title: 'Define Your Strategy',
            actions: [
                { text: 'Create OKRs for this quarter', view: 'okr' },
                { text: 'Define Epics aligned with OKRs', view: 'epics' },
                { text: 'Review strategic alignment', view: 'roadmap' }
            ]
        },
        planning: {
            title: 'Plan Your Work',
            actions: [
                { text: 'Groom and prioritize backlog', view: 'backlog' },
                { text: 'Plan next sprint', view: 'sprint' },
                { text: 'Set planning horizons on roadmap', view: 'roadmap' },
                { text: 'Schedule upcoming releases', view: 'releases' }
            ]
        },
        execution: {
            title: 'Execute Tasks',
            actions: [
                { text: 'Review your assigned tasks', view: 'my-tasks' },
                { text: 'Update task status on Kanban', view: 'kanban' },
                { text: 'Resolve blockers and dependencies', view: 'dependency' },
                { text: 'Track progress by track', view: 'track' }
            ]
        },
        reporting: {
            title: 'Review Progress',
            actions: [
                { text: 'View executive dashboard', view: 'dashboard' },
                { text: 'Analyze velocity and trends', view: 'analytics' },
                { text: 'Review team capacity', view: 'capacity' },
                { text: 'Check status across all work', view: 'status' }
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
    window.switchView = function(view) {
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
