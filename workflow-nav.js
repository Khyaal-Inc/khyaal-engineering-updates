// ========================================
// WORKFLOW NAVIGATION SYSTEM
// ========================================
// Provides staged navigation through the product management lifecycle
// Guides users through: Strategic → Planning → Execution → Reporting

const WORKFLOW_STAGES = {
    strategic: {
        name: 'Strategic',
        icon: '🍒',
        label: 'Discovery',
        description: 'Quarterly planning: Vision, objectives and key results',
        cadence: 'Quarterly',
        views: ['okr', 'epics'],
        color: '#8b5cf6', // purple
        order: 1
    },
    planning: {
        name: 'Planning',
        icon: '📂',
        label: 'Definition',
        description: 'Monthly/Weekly: Roadmap, backlog grooming, sprint planning',
        cadence: 'Monthly/Weekly',
        views: ['roadmap', 'backlog', 'sprint', 'releases'],
        color: '#3b82f6', // blue
        order: 2
    },
    execution: {
        name: 'Execution',
        icon: '⚡',
        label: 'Delivery',
        description: 'Daily work: Track tasks, resolve blockers, update status',
        cadence: 'Daily',
        views: ['my-tasks', 'kanban', 'track', 'dependency', 'workflow'],
        color: '#10b981', // green
        order: 3
    },
    reporting: {
        name: 'Reporting',
        icon: '📊',
        label: 'Analytics',
        description: 'Weekly/Monthly: Review progress, analytics, capacity',
        cadence: 'Weekly/Monthly',
        views: ['dashboard', 'analytics', 'capacity', 'status', 'priority', 'contributor', 'gantt'],
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

    // Update UI
    updateWorkflowStageUI();

    // Switch to default view for this stage
    const stage = WORKFLOW_STAGES[stageKey];
    const defaultView = stage.views[0];

    if (typeof switchView === 'function' && defaultView) {
        switchView(defaultView);
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
        <div class="workflow-nav-v2">
            <!-- Header/Title -->
            <div class="flex items-center justify-between mb-4 px-2">
                <div class="flex items-center gap-3">
                    <div class="bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter">Product Workflow</div>
                    <div class="text-xs font-bold text-slate-400">Strategic Pipeline & Execution Funnel</div>
                </div>
                <div class="flex items-center gap-2">
                    <button 
                        onclick="if (typeof showWizard === 'function') showWizard();"
                        class="text-[10px] px-3 py-1 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg font-bold transition-all flex items-center gap-1 shadow-sm"
                    >
                        <span>🧙 Set-up</span>
                    </button>
                </div>
            </div>

            <!-- Horizontal Pipeline -->
            <div class="workflow-pipeline-container">
                ${availableStages.map(([key, stage], idx) => {
                    const isActive = currentWorkflowStage === key;
                    const isLast = idx === availableStages.length - 1;
                    
                    return `
                        <div class="pipeline-stage ${isActive ? 'active' : ''}" style="--stage-color: ${stage.color};">
                            <div class="stage-body" onclick="switchWorkflowStage('${key}')">
                                <div class="stage-icon-box">
                                    <span class="stage-icon">${stage.icon}</span>
                                    <div class="stage-pulse"></div>
                                </div>
                                <div class="stage-info">
                                    <div class="stage-label">${stage.label}</div>
                                    <div class="stage-name">${stage.name}</div>
                                </div>
                            </div>
                            
                            <!-- Sub-steps for active stage -->
                            <div class="pipeline-steps">
                                ${stage.views
                                    .filter(view => isViewAvailableInCurrentMode(view))
                                    .map(view => {
                                        const viewLabels = {
                                            'okr': 'OKRs', 'epics': 'Epics', 'roadmap': 'Roadmap', 'backlog': 'Backlog',
                                            'sprint': 'Sprint', 'releases': 'Releases', 'my-tasks': 'Active', 
                                            'kanban': 'Kanban', 'track': 'Track', 'dependency': 'Links', 
                                            'workflow': 'Flow', 'dashboard': 'Pulse', 'analytics': 'Data', 
                                            'capacity': 'Load', 'status': 'State', 'priority': 'Risk', 
                                            'contributor': 'Team', 'gantt': 'Timeline'
                                        };
                                        const activeView = document.querySelector('.view-section.active')?.id.replace('-view', '');
                                        const isViewActive = activeView === view;
                                        
                                        return `
                                            <button 
                                                onclick="switchView('${view}')" 
                                                class="pipeline-step ${isViewActive ? 'active' : ''}"
                                                title="View ${viewLabels[view] || view}"
                                            >
                                                ${viewLabels[view] || view}
                                            </button>
                                        `;
                                    }).join('')}
                            </div>

                            ${!isLast ? '<div class="pipeline-connector"></div>' : ''}
                        </div>
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
