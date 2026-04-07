// CMS State variables (will be initialized by auth)
let isCmsMode = false;
let editContext = null;
let _selectedContributors = [];
let _selectedTags = [];
let _selectedDeps = [];
window.isActionLockActive = false; // Management Lock to prevent UI refreshes during modals

// CMS Config
const CMS_CONFIG = {
    repoOwner: 'Khyaal-Inc',
    repoName: 'khyaal-engineering-updates',
    filePath: 'data.json'
};

// ========================================
// CMS CORE UTILITIES
// ========================================

/**
 * Standard change logging for strategic visibility
 */
function logChange(action, target) {
    if (!UPDATE_DATA.metadata.activity) UPDATE_DATA.metadata.activity = [];
    const entry = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: action,
        target: target,
        author: 'PM / Strategist'
    };
    UPDATE_DATA.metadata.activity.unshift(entry);
    if (UPDATE_DATA.metadata.activity.length > 50) UPDATE_DATA.metadata.activity.pop();
}

/**
 * Refreshes all view counts and tab markers
 */
function updateTabCounts() {
    // This usually relies on individual view renderers, 
    // but here we ensure the mini-pipeline and counters are updated
    if (typeof renderMiniPipeline === 'function') renderMiniPipeline();
}

/**
 * Global View Orchestrator
 */
function switchView(viewId) {
    if (window.isActionLockActive) return; // Ignore view switches while an action is in progress
    // 1. Close any open modals
    closeCmsModal();

    // 2. Hide all views
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));

    // 3. Show target view
    const target = document.getElementById(`${viewId}-view`);
    if (target) {
        target.classList.add('active');
        // Trigger specific renderers
        if (viewId === 'track' && typeof renderTrackView === 'function') renderTrackView();
        if (viewId === 'roadmap' && typeof renderRoadmapView === 'function') renderRoadmapView();
        if (viewId === 'epics' && typeof renderEpicsView === 'function') renderEpicsView();
        if (viewId === 'okr' && typeof renderOkrView === 'function') renderOkrView();
        if (viewId === 'sprint' && typeof renderSprintView === 'function') renderSprintView();
        if (viewId === 'releases' && typeof renderReleasesView === 'function') renderReleasesView();
        if (viewId === 'backlog' && typeof renderBacklogView === 'function') renderBacklogView();
        if (viewId === 'kanban' && typeof renderKanbanView === 'function') renderKanbanView();
        if (viewId === 'analytics' && typeof renderAnalyticsView === 'function') renderAnalyticsView();
        if (viewId === 'status' && typeof renderStatusView === 'function') renderStatusView();
        if (viewId === 'priority' && typeof renderPriorityView === 'function') renderPriorityView();
    }

    // 4. Update tab state
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('onclick')?.includes(viewId));
    });
}

function toggleCmsDrawer() {
    const drawer = document.getElementById('cms-drawer');
    if (drawer) {
        const isHidden = drawer.classList.toggle('hidden');
        if (!isHidden) {
            setTimeout(() => document.getElementById('github-token')?.focus(), 100);
        }
    }
}

// ========================================
// CONTEXT-AWARE FORM SYSTEM
// ========================================
// Determines which fields to show based on current view/workflow stage

/**
 * Get current context for form rendering
 * @returns {Object} Context object with view, mode, and workflowStage
 */
function getFormContext() {
    const activeView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    const currentMode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';
    const workflowStage = (typeof getCurrentWorkflowStage === 'function') ? getCurrentWorkflowStage() : null;

    return {
        view: activeView,
        mode: currentMode,
        workflowStage: workflowStage
    };
}

/**
 * Define field groups and when they should be shown
 */
const FIELD_GROUPS = {
    what: {
        label: 'WHAT',
        title: 'Goal & Intent',
        icon: '🎯',
        fields: ['text', 'usecase', 'epicId', 'persona', 'tags'],
        color: '#6366f1' // indigo
    },
    when: {
        label: 'WHEN',
        title: 'Timeline & Cycle',
        icon: '📅',
        fields: ['planningHorizon', 'sprintId', 'startDate', 'due', 'releasedIn', 'publishedDate'], // Added PublishedDate
        color: '#8b5cf6' // purple
    },
    where: {
        label: 'WHERE',
        title: 'Action & Routing',
        icon: '⚡',
        fields: ['status', 'contributors', 'blockerNote', 'dependencies', 'note', 'mediaUrl'],
        color: '#10b981' // green
    },
    how: {
        label: 'HOW',
        title: 'Spec & Effort',
        icon: '🛠️',
        fields: ['storyPoints', 'priority', 'acceptanceCriteria', 'impactLevel', 'effortLevel', 'successMetric', 'strategicWeight', 'riskType'], // Added Weight & Risk
        color: '#f59e0b' // amber
    }
};

/**
 * Mapping: Which fields are NATIVE to which view (Stage-specific primary exposure)
 */
const LIFECYCLE_FIELD_MAP = {
    // Vision: OKR ownership, rationale, and status are core to managing objectives
    okr: ['text', 'usecase', 'epicId', 'planningHorizon', 'impactLevel', 'successMetric', 'strategicWeight', 'riskType', 'mediaUrl', 'contributors', 'note', 'status'],
    // Vision: Epics need owners, start dates, and end dates — not just description
    epics: ['text', 'usecase', 'persona', 'planningHorizon', 'impactLevel', 'status', 'successMetric', 'strategicWeight', 'riskType', 'mediaUrl', 'contributors', 'startDate', 'due'],
    // Vision→Definition: Roadmap items need ownership, sequencing, and rationale
    roadmap: ['text', 'planningHorizon', 'startDate', 'usecase', 'epicId', 'status', 'tags', 'impactLevel', 'effortLevel', 'riskType', 'contributors', 'note', 'priority'],
    // Definition: Backlog grooming needs AC, contributors, dependencies, and due date — core grooming fields
    backlog: ['text', 'usecase', 'persona', 'sprintId', 'planningHorizon', 'status', 'epicId', 'priority', 'storyPoints', 'tags', 'impactLevel', 'effortLevel', 'contributors', 'acceptanceCriteria', 'dependencies', 'due'],
    // Delivery: Sprint needs dependencies visible so devs can see what blocks them
    sprint: ['text', 'usecase', 'persona', 'acceptanceCriteria', 'sprintId', 'startDate', 'due', 'status', 'contributors', 'storyPoints', 'priority', 'blockerNote', 'note', 'dependencies'],
    track: ['text', 'usecase', 'persona', 'acceptanceCriteria', 'due', 'sprintId', 'status', 'contributors', 'storyPoints', 'priority', 'dependencies', 'blockerNote', 'note'],
    gantt: ['text', 'epicId', 'startDate', 'due', 'status', 'planningHorizon', 'dependencies', 'blockerNote', 'note', 'storyPoints', 'contributors'],
    dependency: ['text', 'status', 'blockerNote', 'dependencies', 'due', 'sprintId', 'epicId', 'note', 'contributors'],
    // Release notes: need epic link, business rationale, and contributor credit
    releases: ['text', 'releasedIn', 'publishedDate', 'status', 'mediaUrl', 'tags', 'note', 'epicId', 'usecase', 'contributors'],
    // Kanban board: cards need due date for urgency and AC for definition-of-done
    kanban: ['text', 'sprintId', 'status', 'contributors', 'priority', 'storyPoints', 'blockerNote', 'due', 'acceptanceCriteria'],
    // Aggregation views: show full delivery context — same as track
    status: ['text', 'status', 'contributors', 'priority', 'storyPoints', 'due', 'blockerNote', 'sprintId', 'epicId', 'note'],
    priority: ['text', 'priority', 'status', 'storyPoints', 'contributors', 'due', 'epicId', 'impactLevel', 'effortLevel', 'note'],
    contributor: ['text', 'contributors', 'status', 'priority', 'storyPoints', 'due', 'sprintId', 'epicId', 'blockerNote', 'note'],
    // Analytics/Dashboard: read context, minimal edit scope
    analytics: ['text', 'status', 'storyPoints', 'priority', 'contributors', 'sprintId', 'epicId', 'note'],
    dashboard: ['text', 'status', 'priority', 'contributors', 'blockerNote', 'note', 'epicId']
};

/**
 * Determine which field groups should be shown based on context and persona
 * @param {Object} context - Form context from getFormContext()
 * @returns {Array} Array of field group keys that should be shown
 */
function getVisibleFieldGroups(context) {
    // In the new 4-pillar system, we show pillars based on Persona (Mode)
    if (context.mode === 'dev') {
        return ['where', 'how', 'what', 'when']; // Dev focus: execution first
    } else if (context.mode === 'exec') {
        return ['what', 'when', 'where']; // Exec focus: strategy first, no technical 'how'
    } else {
        return ['what', 'when', 'where', 'how']; // PM see all
    }
}

/**
 * Check if a specific field should be shown
 * @param {string} fieldName - Name of the field
 * @param {Object} context - Form context
 * @returns {boolean} Whether the field should be shown
 */
function shouldShowField(fieldName, context) {
    const visibleGroups = getVisibleFieldGroups(context);

    for (const groupKey of visibleGroups) {
        const group = FIELD_GROUPS[groupKey];
        if (group.fields.includes(fieldName)) {
            return true;
        }
    }

    return false;
}

/**
 * Get recommended field groups for current context with helpful hints
 * @param {Object} context - Form context
 * @returns {Array} Array of {groupKey, label, description, fields}
 */
function getRecommendedFieldGroups(context) {
    const visibleGroups = getVisibleFieldGroups(context);
    const recommendations = [];

    const descriptions = {
        strategic: 'Link this task to strategic goals and define long-term planning',
        planning: 'Schedule the task for a sprint and set deadlines',
        execution: 'Assign owners and track implementation progress',
        delivery: 'Associate with a release and add supporting media',
        metadata: 'Add labels for better organization and filtering'
    };

    for (const groupKey of visibleGroups) {
        const group = FIELD_GROUPS[groupKey];
        if (!group.alwaysShow) {  // Don't recommend core fields
            recommendations.push({
                groupKey,
                label: group.label,
                icon: group.icon,
                description: descriptions[groupKey] || '',
                fields: group.fields
            });
        }
    }

    return recommendations;
}

/**
 * USAGE GUIDE FOR CONTEXT-AWARE FORMS:
 *
 * The functions above implement progressive disclosure for form fields.
 * Instead of showing all 40+ fields at once, forms will only show fields
 * relevant to the current workflow stage and view.
 *
 * INTEGRATION STEPS:
 *
 * 1. In openItemEdit() and addItem() functions below:
 *    - Call getFormContext() to get current context
 *    - Call shouldShowField(fieldName, context) before rendering each field
 *    - Group fields using getRecommendedFieldGroups(context)
 *
 * 2. Example integration:
 *    ```
 *    const context = getFormContext();
 *    const visibleGroups = getRecommendedFieldGroups(context);
 *
 *    // Only render field if it should be shown
 *    if (shouldShowField('sprintId', context)) {
 *        html += renderSprintField(item);
 *    }
 *    ```
 *
 * 3. Field Group Examples by Context:
 *    - Strategic Stage (OKR/Epics): epicId, planningHorizon, usecase
 *    - Planning Stage (Backlog/Sprint): sprintId, startDate, due, priority
 *    - Execution Stage (Kanban/Track): status, contributors, blockerNote
 *    - Reporting Stage (Dashboard/Releases): releasedIn, mediaUrl, status
 *
 * 4. Benefits:
 *    - Reduces cognitive load (fewer fields to fill)
 *    - Guides users through proper workflow sequence
 *    - Shows only relevant fields for current stage
 *    - Makes forms faster and less intimidating
 *
 * NOTE: openItemEdit() and addItem() below have been refactored to use buildContextAwareForm().
 */

// ========================================
// CONTEXT-AWARE FORM BUILDER
// ========================================

/**
 * Build context-aware form HTML based on current view, mode, and workflow stage
 * @param {Object} item - The item to edit (or {} for new items)
 * @param {boolean} isNewItem - Whether this is a new item or editing existing
 * @param {Object} trackInfo - {trackIndex, subtrackIndex} for routing/move fields
 * @returns {string} HTML for the form
 */
function buildContextAwareForm(item, isNewItem, trackInfo = {}) {
    const context = getFormContext();
    const persona = context.mode; // Respect the global dashboard mode
    const showAll = window.uiState.showAllTechnical;
    const visiblePillars = getVisibleFieldGroups(context); // Persona-aware: exec=3 pillars, dev=execution-first order, pm=all 4

    let html = '';

    // Slim Perspective Strip (replaces old 52px banner)
    const dotColor = persona === 'dev' ? 'bg-emerald-500' : persona === 'exec' ? 'bg-purple-500' : 'bg-indigo-500';
    const personaLabel = persona === 'dev' ? 'Developer' : persona === 'exec' ? 'Executive' : 'Product Manager';
    const stripClass = persona === 'dev' ? 'strip-dev' : persona === 'exec' ? 'strip-exec' : 'strip-pm';

    // Calculate hidden field count for toggle hint
    const nativeFields = LIFECYCLE_FIELD_MAP[context.view] || [];
    const allPillarFields = visiblePillars.flatMap(pk => FIELD_GROUPS[pk]?.fields || []);
    const hiddenCount = allPillarFields.filter(f => !nativeFields.includes(f)).length;
    const toggleLabel = showAll
        ? `Hide optional fields (${hiddenCount} extra)`
        : hiddenCount > 0 ? `Show all fields (${hiddenCount} hidden)` : 'Show all fields';

    html += `
        <div class="cms-perspective-strip ${stripClass}">
            <div class="flex items-center gap-2">
                <span class="relative flex h-1.5 w-1.5">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-30"></span>
                    <span class="relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}"></span>
                </span>
                <span class="strip-label">${personaLabel}</span>
                ${persona === 'dev' ? '<span class="strip-badge">🔒 Shield Active</span>' : ''}
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
                <span class="strip-toggle-label">${toggleLabel}</span>
                <div class="relative inline-flex items-center">
                    <input type="checkbox" class="sr-only peer" ${showAll ? 'checked' : ''} onchange="toggleShowAllTechnical()">
                    <div class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                </div>
            </label>
        </div>
    `;

    // ---- SYSTEM C: Stage-Aware Hint Banner ----
    if (typeof getModalStageFromView === 'function' && typeof window.STAGE_REQUIRED_FIELDS !== 'undefined') {
        const modalStage = getModalStageFromView(context.view);
        const stageInfo = window.STAGE_REQUIRED_FIELDS?.[modalStage];
        if (stageInfo) {
            // Count required-but-empty fields
            const required = stageInfo.fields || [];
            const missing = required.filter(f => {
                const v = item[f];
                return !v || (Array.isArray(v) && !v.length);
            });
            const stageColors = { ideation:'#7c3aed', spikes:'#7c3aed', vision:'#4f46e5', epics:'#4f46e5',
                                  roadmap:'#2563eb', backlog:'#2563eb', sprint:'#2563eb',
                                  delivery:'#059669', review:'#d97706' };
            const color = stageColors[modalStage] || '#4f46e5';
            html += `<div class="modal-stage-hint" style="border-left:4px solid ${color}">
                <span class="msh-icon" style="color:${color}">📍</span>
                <div class="msh-body">
                    <div class="msh-hint">${stageInfo.hint}</div>
                    ${missing.length > 0 ? `<div class="msh-missing">${missing.length} field${missing.length>1?'s':''} need attention below ↓</div>` : '<div class="msh-ok">✅ All key fields filled for this stage</div>'}
                </div>
            </div>`;
        }
    }

    // Dev mode: show protected-fields notice banner
    if (persona === 'dev') {
        const protectedInView = visiblePillars.flatMap(pk => FIELD_GROUPS[pk]?.fields || [])
            .filter(f => isFieldProtected(f) && (showAll || (LIFECYCLE_FIELD_MAP[context.view] || []).includes(f)));
        if (protectedInView.length > 0) {
            html += `
                <div class="dev-protected-banner">
                    🔒 <strong>${protectedInView.length} field${protectedInView.length > 1 ? 's are' : ' is'} read-only</strong> — managed by PM. <button type="button" onclick="switchMode('pm', true)" class="underline font-bold hover:text-indigo-900">Switch to PM</button> to edit.
                </div>
            `;
        }
    }

    // Main 4-Pillar Grid — persona-aware column sizing
    const gridPersonaClass = visiblePillars.length === 4 && persona === 'dev' ? 'pillars-4-dev' : `pillars-${visiblePillars.length}`;
    html += `<div class="cms-pillars-grid ${gridPersonaClass}">`;

    visiblePillars.forEach(pillarKey => {
        html += buildPillar(pillarKey, item, { ...context, mode: persona, showAll });
    });

    html += '</div>';

    // Move/routing fields (only for existing items in PM mode)
    if (!isNewItem && persona === 'pm' && trackInfo.trackIndex !== undefined) {
        html += buildMoveFields(trackInfo.trackIndex, trackInfo.subtrackIndex);
    }

    // Always include a hidden Note field if not visible in any pillar (preserves value on save)
    const noteVisible = visiblePillars.some(p => FIELD_GROUPS[p].fields.includes('note'))
        && (window.uiState.showAllTechnical || (LIFECYCLE_FIELD_MAP[context.view] || []).includes('note'));
    if (!noteVisible) {
        html += `<input type="hidden" id="edit-note" value="${item.note || ''}">`;
    }

    // Data lists for autocomplete
    html += buildDataLists();

    return html;
}

/**
 * Build a Pillar Section (WHAT, WHEN, WHERE, HOW) with required-field highlighting
 */
function buildPillar(pillarKey, item, context) {
    const pillar = FIELD_GROUPS[pillarKey];
    if (!pillar) return '';

    // Phase 43: Lifecycle-Aware Filtering
    let fields = [...pillar.fields];
    if (!context.showAll) {
        const nativeFieldsForView = LIFECYCLE_FIELD_MAP[context.view] || [];
        fields = fields.filter(f => nativeFieldsForView.includes(f));
    }
    if (fields.length === 0) return '';

    // SYSTEM C: Get required fields for this stage
    const modalStage = typeof getModalStageFromView === 'function' ? getModalStageFromView(context.view) : null;
    const stageRequired = (modalStage && window.STAGE_REQUIRED_FIELDS?.[modalStage]?.fields) || [];

    let html = `
        <div class="cms-pillar pillar-${pillarKey}">
            <div class="cms-pillar-header">
                <div class="cms-pillar-icon" style="background: ${pillar.color}20; color: ${pillar.color};">${pillar.icon}</div>
                <div>
                    <div class="cms-pillar-label">${pillar.label}</div>
                    <div class="cms-pillar-title">${pillar.title}</div>
                </div>
            </div>
            <div class="cms-pillar-content">
    `;

    fields.forEach(fieldName => {
        const isRequired = stageRequired.includes(fieldName);
        const val = item[fieldName];
        const isEmpty = !val || (Array.isArray(val) && !val.length);
        const needsAttention = isRequired && isEmpty;
        const alreadyDone   = isRequired && !isEmpty;

        if (needsAttention) {
            html += `<div class="field-stage-required">${renderField(fieldName, item)}<span class="field-required-badge">⚠️ Needed for this stage</span></div>`;
        } else if (alreadyDone) {
            html += `<div class="field-stage-done">${renderField(fieldName, item)}<span class="field-done-check">✓</span></div>`;
        } else {
            html += renderField(fieldName, item);
        }
    });

    html += `
            </div>
        </div>
    `;
    return html;
}

/**
 * Build context banner showing current stage and inherited info
 */
function buildContextBanner(item, context) {
    const stageMap = {
        'discovery': { label: 'Discovery Phase', icon: '🔍', color: '#6366f1' },
        'vision': { label: 'Vision Phase', icon: '🎯', color: '#8b5cf6' },
        'definition': { label: 'Definition Phase', icon: '📂', color: '#3b82f6' },
        'delivery': { label: 'Delivery Phase', icon: '⚡', color: '#10b981' },
        'review': { label: 'Review Phase', icon: '📊', color: '#f59e0b' }
    };

    const stage = stageMap[context.workflowStage] || stageMap.delivery;

    return `
        <div class="context-banner shadow-sm" style="border-left: 12px solid ${stage.color}; background: white; padding: 1.25rem; margin-bottom: 1.5rem; border-radius: 4px 12px 12px 4px; border-top: 1.5px solid #f1f5f9; border-right: 1.5px solid #f1f5f9; border-bottom: 1.5px solid #f1f5f9;">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-5">
                    <span class="text-4xl filter drop-shadow-sm">${stage.icon}</span>
                    <div>
                        <div class="context-banner-stage !text-xs !font-black uppercase tracking-widest" style="color: ${stage.color}">${stage.label}</div>
                        <div class="context-banner-view !text-slate-800 !font-bold">Execution Context: ${context.view.toUpperCase()}</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <span class="context-badge !bg-slate-100 !text-slate-600 !border-slate-200">Mode: ${context.mode.toUpperCase()}</span>
                    ${item.id ? `<span class="context-badge !bg-indigo-50 !text-indigo-700 !border-indigo-100 font-mono">ID: ${item.id}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Build a field group section
 */
function buildFieldGroup(groupKey, item, fieldsToShow) {
    const group = FIELD_GROUPS[groupKey];
    if (!group) return '';

    // Check if any fields from this group should be shown
    const groupFields = group.fields.filter(f => fieldsToShow.includes(f));
    if (groupFields.length === 0) return '';

    let html = `
        <div class="field-group">
            <div class="field-group-header">
                <span class="field-group-icon">${group.icon}</span>
                <span class="field-group-label">${group.label}</span>
            </div>
            <div class="field-group-content">
    `;

    // Render each field in the group
    groupFields.forEach(fieldName => {
        html += renderField(fieldName, item);
    });

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Render an individual field based on field name
 */
function renderField(fieldName, item) {
    const val = item[fieldName] || '';
    const isProtected = isFieldProtected(fieldName);
    const attr = isProtected ? 'readonly disabled' : '';
    const persona = window.uiState.modalPersona || (typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm');

    const fieldHtml = renderFieldInner(fieldName, item, val, isProtected, attr, persona);
    if (!fieldHtml) return '';

    if (isProtected) {
        return `<div class="protected-field-wrapper relative opacity-60" title="Managed by PM — read-only in Developer mode">${fieldHtml}<span class="protected-lock-badge">🔒</span></div>`;
    }
    return fieldHtml;
}

function renderFieldInner(fieldName, item, val, isProtected, attr, persona) {
    switch (fieldName) {
        case 'text':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🎯 Task Title <span class="text-rose-400">*</span></label>
                    <input type="text" id="edit-text" value="${val}" class="cms-input shadow-sm focus:shadow-md" placeholder="What mission-critical task needs attention?" required onblur="validateRequired(this)" ${attr}>
                    <p id="edit-text-error" class="text-[10px] text-rose-500 font-bold hidden mt-0.5">Title is required</p>
                </div>
            `;

        case 'note':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">📝 Engineering Context / Description</label>
                    <textarea id="edit-note" class="cms-input shadow-sm focus:shadow-md" rows="3" placeholder="Technical implementation details or operational notes..." ${attr}>${val}</textarea>
                </div>
            `;

        case 'status':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🚦 Engineering Lifecycle State</label>
                    <select id="edit-status" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="later" ${val === 'later' ? 'selected' : ''}>Backlog (Later)</option>
                        <option value="next" ${val === 'next' || !val ? 'selected' : ''}>Planned (Next)</option>
                        <option value="now" ${val === 'now' ? 'selected' : ''}>Developing (Now)</option>
                        <option value="qa" ${val === 'qa' ? 'selected' : ''}>Testing (QA)</option>
                        <option value="review" ${val === 'review' ? 'selected' : ''}>In Review (UAT)</option>
                        <option value="blocked" ${val === 'blocked' ? 'selected' : ''}>Blocked (Urgent)</option>
                        <option value="onhold" ${val === 'onhold' ? 'selected' : ''}>On Hold (Parked)</option>
                        <option value="done" ${val === 'done' ? 'selected' : ''}>Production (Done)</option>
                    </select>
                </div>
            `;

        case 'priority':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🔥 Priority</label>
                    <select id="edit-priority" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="high" ${val === 'high' ? 'selected' : ''}>🔴 High</option>
                        <option value="medium" ${val === 'medium' || !val ? 'selected' : ''}>🟡 Medium</option>
                        <option value="low" ${val === 'low' ? 'selected' : ''}>🟢 Low</option>
                    </select>
                </div>
            `;

        case 'usecase':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">💡 Business Value / Usecase</label>
                    <input type="text" id="edit-usecase" value="${val}" class="cms-input shadow-sm focus:shadow-md" placeholder="Strategic alignment or user impact statement..." ${attr}>
                </div>
            `;

        case 'epicId':
            const epics = UPDATE_DATA.metadata.epics || [];
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🚀 Strategic Epic Link</label>
                    <select id="edit-epicId" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="">None (Tactical / BAU)</option>
                        ${epics.map(e => `<option value="${e.id}" ${val === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
                    </select>
                </div>
            `;

        case 'planningHorizon':
            const knownHorizons = ['1M','3M','6M','1Y'];
            const isLegacyHorizon = val && !knownHorizons.includes(val);
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🗺️ Roadmap Horizon</label>
                    <select id="edit-planningHorizon" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="">None</option>
                        <option value="1M" ${val === '1M' ? 'selected' : ''}>Now (1 Month)</option>
                        <option value="3M" ${val === '3M' ? 'selected' : ''}>Next (3 Months)</option>
                        <option value="6M" ${val === '6M' ? 'selected' : ''}>Later (6 Months)</option>
                        <option value="1Y" ${val === '1Y' ? 'selected' : ''}>Long-term (1 Year)</option>
                        ${isLegacyHorizon ? `<option value="${val}" selected>Legacy: ${val}</option>` : ''}
                    </select>
                    ${isLegacyHorizon ? '<p class="text-[10px] text-amber-500 mt-1 font-bold uppercase tracking-tight">⚠️ Legacy value — update to standard horizon</p>' : ''}
                </div>
            `;

        case 'sprintId':
            const sprints = UPDATE_DATA.metadata.sprints || [];
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🏃 Execution Sprint</label>
                    <select id="edit-sprintId" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="">None</option>
                        ${sprints.map(s => `<option value="${s.id}" ${val === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                </div>
            `;

        case 'startDate':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">📅 Planned Start</label>
                    <input type="date" id="edit-startDate" value="${val}" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                </div>
            `;

        case 'due':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">⌛ Target Delivery Date</label>
                    <input type="date" id="edit-due" value="${val}" class="cms-input" ${attr}>
                </div>
            `;

        case 'contributors':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">👥 Team Contributors</label>
                    <div id="contrib-tag-input-edit" class="tag-input-wrapper min-h-[44px] shadow-sm" data-placeholder="Type name, press Enter..."></div>
                </div>
            `;

        case 'blockerNote':
            const isBlocked = item.blocker === true || item.status === 'blocked';
            return `
                <div class="field-wrapper ${isBlocked ? 'blocker-field p-4 bg-rose-50 border border-rose-200 rounded-xl' : ''}">
                    <label class="cms-label ${isBlocked ? '!text-rose-600' : ''}">
                        ${isBlocked ? '🛑' : '💬'} ${isBlocked ? 'Critical Blocker Reason' : 'Blocker Note'}
                        ${!isBlocked ? '<span class="text-[9px] font-normal text-slate-400 ml-1">(fill if blocked)</span>' : ''}
                    </label>
                    <input type="text" id="edit-blockerNote" value="${val}" class="cms-input shadow-sm focus:shadow-md ${isBlocked ? '!border-rose-300' : ''}" placeholder="${isBlocked ? 'What\'s blocking this mission?' : 'Describe any blocker if applicable...'}">
                    ${isBlocked ? '<p class="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-tight">⚠️ Currently flagged as blocked</p>' : ''}
                </div>
            `;

        case 'dependencies':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🔗 Technical Dependencies</label>
                    <div id="deps-tag-input-edit" class="tag-input-wrapper min-h-[44px] shadow-sm" data-placeholder="Paste task ID or search..."></div>
                </div>
            `;

        case 'releasedIn':
            const releases = UPDATE_DATA.metadata.releases || [];
            return `
                <div class="field-wrapper">
                    <label class="cms-label">📦 Target Release</label>
                    <select id="edit-releasedIn" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="">None (Continuous / BAU)</option>
                        ${releases.map(r => `<option value="${r.id}" ${val === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                    </select>
                </div>
            `;

        case 'publishedDate':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🚀 Milestone / Publish Date</label>
                    <input type="date" id="edit-publishedDate" value="${val}" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                </div>
            `;

        case 'strategicWeight':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">⚖️ Strategic Weight (%)</label>
                    <div class="flex items-center gap-3">
                        <input type="number" id="edit-strategicWeight" value="${val || 0}" class="cms-input shadow-sm focus:shadow-md w-24" min="0" max="100" ${attr}>
                        <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-500 transition-all duration-500" style="width: ${val || 0}%"></div>
                        </div>
                    </div>
                </div>
            `;

        case 'riskType':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">⚠️ Primary Risk Profile</label>
                    <select id="edit-riskType" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="none" ${val === 'none' ? 'selected' : ''}>None / Low Risk</option>
                        <option value="technical" ${val === 'technical' ? 'selected' : ''}>🛠️ Technical (Architecture/Legacy)</option>
                        <option value="market" ${val === 'market' ? 'selected' : ''}>📈 Market (Adoption/ROI)</option>
                        <option value="operational" ${val === 'operational' ? 'selected' : ''}>⚙️ Operational (Resource/Timeline)</option>
                        <option value="security" ${val === 'security' ? 'selected' : ''}>🛡️ Security / Compliance</option>
                    </select>
                </div>
            `;

        case 'mediaUrl':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🔗 Strategic Evidence / Media URL</label>
                    <input type="text" id="edit-mediaUrl" value="${val}" class="cms-input shadow-sm focus:shadow-md" placeholder="https://external-resource-link...">
                    <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Screenshots, demos, or documentation links</p>
                </div>
            `;

        case 'storyPoints':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🔢 Complexity (Story Points)</label>
                    <select id="edit-storyPoints" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="">— Select Points —</option>
                        ${[1,2,3,5,8,13,21].map(n => `<option value="${n}" ${val == n ? 'selected' : ''}>${n} pt${n > 1 ? 's' : ''}</option>`).join('')}
                    </select>
                    <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Fibonacci scale · 1=trivial · 5=1 day · 13=1 week</p>
                </div>
            `;

        case 'effortLevel':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🛠️ Implementation Effort</label>
                    <select id="edit-effortLevel" class="cms-input shadow-sm focus:shadow-md" onchange="updateRoiPreview()" ${attr}>
                        <option value="">Select Effort...</option>
                        <option value="low" ${val === 'low' ? 'selected' : ''}>🟢 Low — Easy Win</option>
                        <option value="medium" ${val === 'medium' ? 'selected' : ''}>🟡 Medium — Standard Cycle</option>
                        <option value="high" ${val === 'high' ? 'selected' : ''}>🔴 High — Major Complexity</option>
                    </select>
                    <div id="roi-preview-container" class="mt-3"></div>
                </div>
            `;

        case 'persona':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">👤 Target Persona</label>
                    <select id="edit-persona" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="none" ${val === 'none' ? 'selected' : ''}>General / All</option>
                        <option value="frontend" ${val === 'frontend' ? 'selected' : ''}>Frontend Developer</option>
                        <option value="backend" ${val === 'backend' ? 'selected' : ''}>Backend Developer</option>
                        <option value="sre" ${val === 'sre' ? 'selected' : ''}>SRE / Ops Engineer</option>
                        <option value="product" ${val === 'product' ? 'selected' : ''}>Product Manager</option>
                        <option value="executive" ${val === 'executive' ? 'selected' : ''}>Executive Stakeholder</option>
                        <option value="external" ${val === 'external' ? 'selected' : ''}>External Customer</option>
                    </select>
                </div>
            `;

        case 'successMetric':
            return `
                <div class="field-wrapper">
                    <label class="cms-label text-indigo-500 font-bold">📊 Quantitative Success Metric</label>
                    <input type="text" id="edit-successMetric" value="${val}" class="cms-input shadow-sm focus:shadow-md border-indigo-50" placeholder="e.g. Latency < 200ms or 99.9% Uptime" ${attr}>
                </div>
            `;

        case 'impactLevel':
            const impactColors = { high: 'text-emerald-600', medium: 'text-amber-500', low: 'text-slate-400' };
            return `
                <div class="field-wrapper">
                    <label class="cms-label ${impactColors[val] || ''}">💎 Strategic Impact</label>
                    <select id="edit-impactLevel" class="cms-input shadow-sm focus:shadow-md" onchange="updateRoiPreview()" ${attr}>
                        <option value="">Select Impact...</option>
                        <option value="low" ${val === 'low' ? 'selected' : ''}>🔵 Low — Tactical / Minor</option>
                        <option value="medium" ${val === 'medium' ? 'selected' : ''}>🟡 Medium — Baseline Support</option>
                        <option value="high" ${val === 'high' ? 'selected' : ''}>🟢 High — Strategic / Major</option>
                    </select>
                </div>
            `;

        case 'acceptanceCriteria':
            const acVal = Array.isArray(val) ? val.join('\n') : (val || '');
            const lineCount = acVal ? acVal.split('\n').filter(l => l.trim()).length : 0;
            return `
                <div class="field-wrapper full-width mt-4 ${isProtected ? 'persona-protected' : ''}">
                    <label class="cms-label">${isProtected ? '🔒' : '✅'} Acceptance Criteria</label>
                    <textarea id="edit-acceptanceCriteria" class="cms-input !min-h-[100px] shadow-sm focus:shadow-md ${isProtected ? 'bg-slate-50 opacity-80 cursor-not-allowed italic' : ''}" rows="4" placeholder="One criterion per line:&#10;✓ User can log in with email&#10;✓ Session persists 7 days" oninput="updateAcCount(this)" ${isProtected ? 'readonly disabled' : ''}>${acVal}</textarea>
                    <div class="flex justify-between mt-1">
                        <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tight">${isProtected ? 'Protected — PM level only' : 'One criterion per line'}</p>
                        <span id="ac-line-count" class="text-[10px] text-slate-400 font-bold">${lineCount > 0 ? lineCount + ' criteria' : ''}</span>
                    </div>
                </div>
            `;

        case 'tags':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🏷️ Categorization Tags</label>
                    <div id="tags-tag-input-edit" class="tag-input-wrapper min-h-[44px] shadow-sm" data-placeholder="Add tag..."></div>
                </div>
            `;

        default:
            return '';
    }
}

/**
 * Build move/routing fields for existing items
 */
function buildMoveFields(trackIndex, subtrackIndex) {
    return `
        <details class="cms-move-section mt-6">
            <summary class="cms-move-trigger">↪ Move to different track / subtrack</summary>
            <div class="cms-move-body">
                <div class="grid grid-cols-2 gap-6 mt-4">
                    <div>
                        <label class="block text-[12px] font-bold mb-2 text-slate-600">Target Track</label>
                        <select id="edit-move-track" class="cms-input !mb-0 shadow-sm" onchange="updateMoveSubtrackOpts(this.value)">
                            ${UPDATE_DATA.tracks.map((t, idx) => `<option value="${idx}" ${idx === trackIndex ? 'selected' : ''}>${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[12px] font-bold mb-2 text-slate-600">Target Subtrack</label>
                        <select id="edit-move-subtrack" class="cms-input !mb-0 shadow-sm">
                            ${UPDATE_DATA.tracks[trackIndex].subtracks.map((s, idx) => `<option value="${idx}" ${idx === subtrackIndex ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </details>
    `;
}

/**
 * Build autocomplete data lists
 */
function buildDataLists() {
    return `
        <datalist id="contributor-list">
            ${ALL_CONTRIBUTORS.map(c => `<option value="${c}">`).join('')}
        </datalist>
        <datalist id="tag-list">
            ${Array.from(new Set(UPDATE_DATA.tracks.flatMap(t => t.subtracks.flatMap(s => s.items.flatMap(i => i.tags || []))))).map(t => `<option value="${t}">`).join('')}
        </datalist>
        <datalist id="item-list">
            ${UPDATE_DATA.tracks.flatMap(t => t.subtracks.flatMap(s => s.items.map(i => `<option value="${i.id}">${i.text}</option>`))).join('')}
        </datalist>
    `;
}

// Global UI State for Persistence
window.uiState = {
    openEpics: new Set(), // Track Epic IDs that are currently expanded
    modalPersona: null,   // Current persona in modal ('pm' or 'dev')
    showAllTechnical: false, // PM deep-dive toggle
    isDirty: false // Unsaved changes tracker
};

/**
 * Persona Helper: Identify if a field is protected (Read-Only) for the current persona
 */
function isFieldProtected(fieldName) {
    const persona = window.uiState.modalPersona || (typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm');
    
    // Developers are PREVENTED from editing Strategic alignment
    if (persona === 'dev') {
        const protectedStrategicFields = [
            'epicId', 'impactLevel', 'successMetric', 'acceptanceCriteria',
            'planningHorizon', 'releasedIn', 'strategicWeight', 'riskType',
            'effortLevel', 'publishedDate', 'priority', 'usecase', 'persona',
            'sprintId'
        ];
        return protectedStrategicFields.includes(fieldName);
    }
    
    return false;
}

/**
 * Persona Toggle Handler
 */
function toggleModalPersona(p) {
    window.uiState.modalPersona = p;
    // Re-render the form if open
    if (editContext) {
        const data = getValidatedItemContext(editContext.itemId || { trackIndex: editContext.trackIndex, subtrackIndex: editContext.subtrackIndex, itemIndex: editContext.itemIndex });
        if (data) {
            document.getElementById('modal-form').innerHTML = buildContextAwareForm(data.item, editContext.type === 'item-new', { trackIndex: data.ti, subtrackIndex: data.si });
            attachModalFormListeners();
        }
    }
}

/**
 * Acceptance Criteria live line count
 */
function updateAcCount(el) {
    const count = el.value.split('\n').filter(l => l.trim()).length;
    const counter = document.getElementById('ac-line-count');
    if (counter) counter.textContent = count > 0 ? count + ' criteria' : '';
}

/**
 * Required field blur validation
 */
function validateRequired(el) {
    const err = document.getElementById(el.id + '-error');
    if (err) {
        if (!el.value.trim()) {
            el.classList.add('!border-rose-300');
            err.classList.remove('hidden');
        } else {
            el.classList.remove('!border-rose-300');
            err.classList.add('hidden');
        }
    }
}

/**
 * PM Deep-Dive Toggle
 */
function attachModalFormListeners() {
    const formEl = document.getElementById('modal-form');
    if (!formEl) return;
    formEl.addEventListener('input', () => { window.uiState.isDirty = true; }, { passive: true });
    formEl.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveCms(); }
    });
}

function toggleShowAllTechnical() {
    window.uiState.showAllTechnical = !window.uiState.showAllTechnical;
    if (editContext) {
        const data = getValidatedItemContext(editContext.itemId || { trackIndex: editContext.trackIndex, subtrackIndex: editContext.subtrackIndex, itemIndex: editContext.itemIndex });
        if (data) {
            document.getElementById('modal-form').innerHTML = buildContextAwareForm(data.item, editContext.type === 'item-new', { trackIndex: data.ti, subtrackIndex: data.si });
            attachModalFormListeners();
            setTimeout(() => {
                renderTagWidget('contrib-tag-input-edit', data.item.contributors || [], 'contributor-list', 'author');
                renderTagWidget('tags-tag-input-edit', data.item.tags || [], 'tag-list', 'tag');
                renderTagWidget('deps-tag-input-edit', data.item.dependencies || [], 'item-list', 'dep');
                if (typeof updateRoiPreview === 'function') updateRoiPreview();
            }, 10);
        }
    }
}

/**
 * Universal Item Context Resolver
 * Handles both Unique ID (string) and Index-based Pointer (object) lookups.
 */
function getValidatedItemContext(arg) {
    if (!arg) return null;

    // A: Look up by Unique String ID (Modern Protocol)
    if (typeof arg === 'string') {
        const found = findItemById(arg);
        if (found) return found;
    }

    // B: Look up by Object Indices { trackIndex, subtrackIndex, itemIndex } (Kanban/Legacy)
    if (typeof arg === 'object' && arg.itemIndex !== undefined) {
        const track = UPDATE_DATA.tracks[arg.trackIndex];
        if (track && track.subtracks[arg.subtrackIndex]) {
            const item = track.subtracks[arg.subtrackIndex].items[arg.itemIndex];
            if (item) {
                return {
                    item: item,
                    ti: arg.trackIndex,
                    si: arg.subtrackIndex,
                    ii: arg.itemIndex
                };
            }
        }
    }

    // C: Modal Context Fallback (Last Resort)
    if (editContext && editContext.itemIndex !== undefined) {
        const track = UPDATE_DATA.tracks[editContext.trackIndex];
        if (track && track.subtracks[editContext.subtrackIndex]) {
            return {
                item: track.subtracks[editContext.subtrackIndex].items[editContext.itemIndex],
                ti: editContext.trackIndex,
                si: editContext.subtrackIndex,
                ii: editContext.itemIndex
            };
        }
    }
    return null;
}

function findItemById(itemId) {
    if (!UPDATE_DATA) return null;
    for (let ti = 0; ti < UPDATE_DATA.tracks.length; ti++) {
        const track = UPDATE_DATA.tracks[ti];
        for (let si = 0; si < track.subtracks.length; si++) {
            const sub = track.subtracks[si];
            const ii = sub.items.findIndex(item => item.id === itemId);
            if (ii !== -1) {
                return { item: sub.items[ii], ti, si, ii };
            }
        }
    }
    return null;
}

function initCms() {
    const params = new URLSearchParams(window.location.search);

    // Global modal behavior (works even in read-only mode if a modal is triggered)
    const modal = document.getElementById('cms-modal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) closeCmsModal();
        });
    }

    if (params.get('cms') === 'true') {
        isCmsMode = true;
        document.getElementById('cms-controls').classList.add('active');
        const token = localStorage.getItem('gh_pat') || '';
        if (token) {
            document.getElementById('github-token').value = token;
            authenticateCms();
        }
    } else {
        window.isGithubAuthenticated = false;
        const ctrls = document.getElementById('cms-controls');
        if (ctrls) ctrls.classList.remove('active');
    }
}

function authenticateCms() {
    const token = document.getElementById('github-token').value;
    if (!token) return;
    localStorage.setItem('gh_pat', token);
    window.isGithubAuthenticated = true;

    document.getElementById('cms-auth-section').classList.add('hidden');
    document.getElementById('cms-actions-section').classList.remove('hidden');

    const currentView = document.querySelector('.filter-btn.active')?.id.replace('btn-', '') || 'track';
    if (typeof switchView === 'function') switchView(currentView);
}

function logoutCms() {
    localStorage.removeItem('gh_pat');
    window.isGithubAuthenticated = false;
    location.reload();
}

// ------ MODAL OPS (FULL) ------
function openItemEdit(ti, si, ii, itemId) {
    const data = getValidatedItemContext(itemId || { trackIndex: ti, subtrackIndex: si, itemIndex: ii });
    if (!data) return;

    // Reset Modal Persona UI State
    window.uiState.modalPersona = null; // Revert to view-based default
    window.uiState.showAllTechnical = false;

    const item = data.item;
    editContext = { type: 'item', trackIndex: data.ti, subtrackIndex: data.si, itemIndex: data.ii, itemId: item.id };

    const statusLabels = { now: '🔵 Developing', next: '🟠 Planned', later: '⚪ Backlog',
        qa: '🧪 Testing', review: '🟣 In Review', blocked: '🔴 Blocked',
        onhold: '🟡 On Hold', done: '🟢 Done' };
    const effectiveStatus = (item.blocker === true && item.status !== 'blocked') ? 'blocked' : item.status;
    const stagePill = effectiveStatus ? `<span class="modal-stage-pill">${statusLabels[effectiveStatus] || effectiveStatus}</span>` : '';
    const viewTitleMap = {
        backlog: 'Edit Backlog Item', sprint: 'Edit Sprint Item', track: 'Edit Track Item',
        kanban: 'Edit Kanban Item', roadmap: 'Edit Roadmap Item', releases: 'Edit Release Item',
        epics: 'Edit Epic Item', okr: 'Edit OKR Item', 'my-tasks': 'Edit My Task',
        dependency: 'Edit Task', status: 'Edit Task', priority: 'Edit Task', contributor: 'Edit Task'
    };
    const activeViewForTitle = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    const modalTitleText = viewTitleMap[activeViewForTitle] || 'Edit Task';
    document.getElementById('modal-title').innerHTML = `${modalTitleText} ${stagePill}`;

    const context = getFormContext();
    document.getElementById('modal-banner').innerHTML = buildContextBanner(item, context);
    document.getElementById('modal-form').innerHTML = buildContextAwareForm(item, false, { trackIndex: data.ti, subtrackIndex: data.si });

    // Inject footer buttons — Delete on left, Save on right
    document.getElementById('modal-footer').innerHTML = `
        <div class="footer-left">
            <button onclick="deleteItem(undefined, undefined, undefined, '${item.id}')" class="cms-btn cms-btn-danger">🗑 Delete</button>
        </div>
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="saveCms()" class="cms-btn cms-btn-primary">Save Changes <span class="kbd-hint">⌘↵</span></button>
    `;

    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Initialize widgets first, then enable dirty tracking after they settle
    window.uiState.isDirty = false;
    setTimeout(() => {
        renderTagWidget('contrib-tag-input-edit', item.contributors || [], 'contributor-list', 'author');
        renderTagWidget('tags-tag-input-edit', item.tags || [], 'tag-list', 'tag');
        renderTagWidget('deps-tag-input-edit', item.dependencies || [], 'item-list', 'dep');
        if (typeof updateRoiPreview === 'function') updateRoiPreview();
        // Attach dirty tracking AFTER widgets are done so their init doesn't trigger isDirty
        attachModalFormListeners();
    }, 50);
}

function addItem(trackIndex, subtrackIndex, defaults = {}) {
    // Reset Modal Persona UI State
    window.uiState.modalPersona = null;
    window.uiState.showAllTechnical = false;

    editContext = { type: 'item-new', trackIndex, subtrackIndex, defaults };

    const _addViewTitleMap = {
        backlog: 'New Backlog Item', sprint: 'New Sprint Item', track: 'New Track Item',
        kanban: 'New Kanban Item', roadmap: 'New Roadmap Item', releases: 'New Release Item',
        epics: 'New Epic Item', okr: 'New OKR Item', 'my-tasks': 'New Task'
    };
    const _addActiveView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    const _addModalTitle = _addViewTitleMap[_addActiveView] || 'New Task';
    document.getElementById('modal-title').innerHTML = `${_addModalTitle} <span class="modal-stage-pill">✨ Draft</span>`;

    const context = getFormContext();
    document.getElementById('modal-banner').innerHTML = buildContextBanner(defaults, context);
    document.getElementById('modal-form').innerHTML = buildContextAwareForm(defaults, true, { trackIndex, subtrackIndex });

    // Inject footer buttons
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="saveCms()" class="cms-btn cms-btn-primary">Create Task <span class="kbd-hint">⌘↵</span></button>
    `;

    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Initialize widgets first, then enable dirty tracking after they settle
    window.uiState.isDirty = false;
    setTimeout(() => {
        renderTagWidget('contrib-tag-input-edit', defaults.contributors || [], 'contributor-list', 'author');
        renderTagWidget('tags-tag-input-edit', defaults.tags || [], 'tag-list', 'tag');
        renderTagWidget('deps-tag-input-edit', defaults.dependencies || [], 'item-list', 'dep');
        // Attach dirty tracking AFTER widgets are done so their init doesn't trigger isDirty
        attachModalFormListeners();
    }, 50);
}

/**
 * Quick-assign a sprint to a backlog item without opening the full modal.
 * Called from the inline "Assign to Sprint" select on backlog cards.
 */
function quickAssignSprint(itemId, sprintId) {
    const found = findItemById(itemId);
    if (!found) return;
    found.item.sprintId = sprintId || '';
    logChange('sprint-assign', found.item.text);
    saveToLocalStorage();
    renderBacklogView();
}
window.quickAssignSprint = quickAssignSprint;

function quickAssignRelease(itemId, releaseId) {
    const found = findItemById(itemId)
    if (!found) return
    found.item.releasedIn = releaseId || ''
    logChange('release-assign', found.item.text)
    saveToLocalStorage()
    renderDashboard()
}
window.quickAssignRelease = quickAssignRelease

function quickChangeStatus(itemId, newStatus) {
    const found = findItemById(itemId)
    if (!found) return
    found.item.status = newStatus
    logChange('status-change', found.item.text)
    saveToLocalStorage()
    renderDashboard()
}
window.quickChangeStatus = quickChangeStatus

function quickChangePriority(itemId, newPriority) {
    const found = findItemById(itemId)
    if (!found) return
    found.item.priority = newPriority
    logChange('priority-change', found.item.text)
    saveToLocalStorage()
    renderDashboard()
}
window.quickChangePriority = quickChangePriority

function resolveBlocker(itemId) {
    const found = findItemById(itemId)
    if (!found) return
    found.item.blocker = false
    found.item.blockerNote = ''
    logChange('Blocker Resolved', found.item.text)
    saveToLocalStorage()
    renderDashboard()
}
window.resolveBlocker = resolveBlocker

// ============================================================
// SYSTEM M — Release Builder (3-step batch ship wizard)
// ============================================================
function openReleaseBuilder(sprintId) {
    // Collect candidates: ALL done items in sprint (including already-shipped — user can re-ship)
    const candidates = []
    const alreadyShipped = []  // done items that already have a release (shown as info, still selectable)
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                const matchesSprint = sprintId ? item.sprintId === sprintId : true
                if (matchesSprint && item.status === 'done') {
                    if (item.releasedIn) alreadyShipped.push(item)
                    else candidates.push(item)
                }
            })
        })
    })

    // If no done items at all, fall back to showing all items in the sprint
    const allSprintItems = []
    if (candidates.length === 0 && alreadyShipped.length === 0) {
        UPDATE_DATA.tracks.forEach(track => {
            track.subtracks.forEach(subtrack => {
                subtrack.items.forEach(item => {
                    if (sprintId ? item.sprintId === sprintId : true) {
                        allSprintItems.push(item)
                    }
                })
            })
        })
    }

    const sprint = sprintId ? (UPDATE_DATA.metadata?.sprints || []).find(s => s.id === sprintId) : null
    const sprintLabel = sprint ? sprint.name : 'All Sprints'
    const releases = UPDATE_DATA.metadata?.releases || []

    // -- Wizard state — pre-select unshipped done items only --
    let step = 1
    let selectedIds = new Set(candidates.map(i => i.id))
    let targetReleaseId = releases.length > 0 ? releases[0].id : ''
    let createNewName = ''
    let shouldPublish = false

    // -- Create overlay --
    const overlay = document.createElement('div')
    overlay.id = 'release-builder-overlay'
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(6px);z-index:4000;display:flex;align-items:center;justify-content:center;'
    document.body.appendChild(overlay)

    // All selectable items = unshipped done + already shipped (can re-assign) + fallback all
    const allCandidates = [...candidates, ...alreadyShipped]

    function renderWizard() {
        const renderList = allCandidates.length > 0 ? allCandidates : allSprintItems
        const totalPts = renderList.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + (i.storyPoints || 0), 0)

        const stepIndicator = [1, 2, 3].map(n => `
            <div style="display:flex;align-items:center;gap:6px;">
                <div style="width:22px;height:22px;border-radius:50%;background:${n <= step ? '#4f46e5' : '#e2e8f0'};color:${n <= step ? 'white' : '#94a3b8'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;">${n < step ? '✓' : n}</div>
                <span style="font-size:10px;font-weight:700;color:${n === step ? '#1e293b' : '#94a3b8'};white-space:nowrap;">${['Select Items','Pick Release','Confirm'][n-1]}</span>
                ${n < 3 ? '<div style="width:24px;height:1px;background:#e2e8f0;"></div>' : ''}
            </div>`).join('')

        let bodyHTML = ''

        if (step === 1) {
            if (renderList.length === 0) {
                bodyHTML = `
                    <div style="text-align:center;padding:32px 0;color:#64748b;">
                        <div style="font-size:36px;margin-bottom:12px;">📭</div>
                        <div style="font-weight:700;margin-bottom:6px;">No items in this sprint</div>
                        <div style="font-size:12px;">There are no items attached to <strong>${sprintLabel}</strong>.</div>
                    </div>`
            } else if (allCandidates.length === 0) {
                // No done items, but other items exist
                const rows = renderList.map(item => `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;margin-bottom:6px;opacity:0.7;">
                        <span style="font-size:12px;width:14px;display:inline-block;text-align:center;">⌛</span>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:12px;font-weight:600;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:line-through;">${item.text}</div>
                            <div style="font-size:9px;color:#94a3b8;margin-top:2px;text-transform:uppercase;font-weight:800;">Status: ${item.status} — must be Done</div>
                        </div>
                    </div>
                `).join('')
                bodyHTML = `
                    <div style="text-align:center;padding:12px 0 20px;color:#64748b;">
                        <div style="font-size:32px;margin-bottom:8px;">🚧</div>
                        <div style="font-weight:700;margin-bottom:4px;color:#1e293b;">No done items yet</div>
                        <div style="font-size:11px;">Complete items in <strong>${sprintLabel}</strong> before shipping them to a release.</div>
                    </div>
                    <div style="max-height:240px;overflow-y:auto;padding-right:4px;">${rows}</div>`
            } else {
                const rows = renderList.map(item => {
                    const checked = selectedIds.has(item.id)
                    const rel = item.releasedIn ? (releases.find(r => r.id === item.releasedIn)?.name || 'a release') : null
                    const releasedBadge = rel ? `<span style="font-size:9px;padding:2px 6px;background:#fef2f2;border-radius:4px;font-weight:700;color:#991b1b;flex-shrink:0;">Shipped in ${rel}</span>` : ''
                    const pts = item.storyPoints ? `<span style="font-size:9px;padding:2px 6px;background:#f1f5f9;border-radius:4px;font-weight:700;color:#64748b;">${item.storyPoints}SP</span>` : ''
                    const epic = (UPDATE_DATA.metadata?.epics || []).find(e => e.id === item.epicId)
                    const epicTag = epic ? `<span style="font-size:9px;padding:1px 6px;background:#ede9fe;border-radius:4px;font-weight:700;color:#6d28d9;">${epic.name.substring(0,20)}</span>` : ''
                    return `
                        <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${checked ? '#c7d2fe' : '#e2e8f0'};background:${checked ? '#eef2ff' : 'white'};cursor:pointer;transition:all 0.15s;margin-bottom:6px;">
                            <input type="checkbox" data-item-id="${item.id}" ${checked ? 'checked' : ''} style="accent-color:#4f46e5;width:14px;height:14px;flex-shrink:0;" onchange="window._rbToggleItem('${item.id}', this.checked)">
                            <div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:12px;font-weight:600;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.text}</div>
                                    <div style="display:flex;gap:4px;margin-top:3px;flex-wrap:wrap;">${pts}${epicTag}</div>
                                </div>
                                ${releasedBadge}
                            </div>
                        </label>`
                }).join('')

                bodyHTML = `
                    <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-size:11px;color:#64748b;font-weight:600;">${selectedIds.size} of ${renderList.length} items selected · ${totalPts} story points</span>
                        <div style="display:flex;gap:8px;">
                            <button onclick="window._rbSelectAll(true)" style="font-size:10px;font-weight:700;color:#4f46e5;background:none;border:none;cursor:pointer;padding:2px;">Select all</button>
                            <button onclick="window._rbSelectAll(false)" style="font-size:10px;font-weight:700;color:#64748b;background:none;border:none;cursor:pointer;padding:2px;">Deselect all</button>
                        </div>
                    </div>
                    <div style="max-height:280px;overflow-y:auto;padding-right:4px;">${rows}</div>`
            }
        }

        if (step === 2) {
            const existingReleaseOpts = releases.map(r => {
                const itemCount = 0  // simplified
                return `
                    <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${targetReleaseId === r.id ? '#c7d2fe' : '#e2e8f0'};background:${targetReleaseId === r.id ? '#eef2ff' : 'white'};cursor:pointer;margin-bottom:6px;">
                        <input type="radio" name="rb-release" value="${r.id}" ${targetReleaseId === r.id ? 'checked' : ''} style="accent-color:#4f46e5;flex-shrink:0;" onchange="window._rbSetRelease('${r.id}')">
                        <div style="flex:1;">
                            <div style="font-size:12px;font-weight:700;color:#1e293b;">${r.name}</div>
                            ${r.targetDate ? `<div style="font-size:10px;color:#64748b;">Target: ${r.targetDate}</div>` : ''}
                        </div>
                    </label>`
            }).join('')

            const newReleaseSection = `
                <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${targetReleaseId === '__new__' ? '#c7d2fe' : '#e2e8f0'};background:${targetReleaseId === '__new__' ? '#eef2ff' : 'white'};cursor:pointer;margin-bottom:6px;">
                    <input type="radio" name="rb-release" value="__new__" ${targetReleaseId === '__new__' ? 'checked' : ''} style="accent-color:#4f46e5;flex-shrink:0;" onchange="window._rbSetRelease('__new__')">
                    <div style="flex:1;">
                        <div style="font-size:12px;font-weight:700;color:#4f46e5;">+ Create new release</div>
                        ${targetReleaseId === '__new__' ? `
                        <input type="text" id="rb-new-release-name" value="${createNewName}" placeholder="e.g. v2.4 — May Release" 
                            style="margin-top:6px;width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:6px;font-size:12px;font-weight:600;outline:none;"
                            oninput="window._rbSetNewReleaseName(this.value)">` : ''}
                    </div>
                </label>`

            bodyHTML = `
                <div style="margin-bottom:12px;font-size:11px;color:#64748b;font-weight:600;">Ship <strong>${selectedIds.size} items</strong> to which release?</div>
                ${existingReleaseOpts}
                ${newReleaseSection}`
        }

        if (step === 3) {
            const selectedList = allCandidates.filter(i => selectedIds.has(i.id))
            const releaseName = targetReleaseId === '__new__'
                ? (createNewName || 'New Release')
                : (releases.find(r => r.id === targetReleaseId)?.name || 'Unknown')
            const totalPts = selectedList.reduce((s, i) => s + (i.storyPoints || 0), 0)

            bodyHTML = `
                <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:16px;">
                    <div style="font-size:28px;margin-bottom:10px;">📦</div>
                    <div style="font-size:16px;font-weight:800;color:#1e293b;margin-bottom:4px;">${selectedIds.size} items → ${releaseName}</div>
                    <div style="font-size:12px;color:#64748b;">${totalPts} story points · from ${sprintLabel}</div>
                </div>
                <label style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:8px;border:1px solid ${shouldPublish ? '#bbf7d0' : '#e2e8f0'};background:${shouldPublish ? '#f0fdf4' : 'white'};cursor:pointer;margin-bottom:8px;">
                    <input type="checkbox" ${shouldPublish ? 'checked' : ''} style="accent-color:#059669;width:14px;height:14px;flex-shrink:0;" onchange="window._rbSetPublish(this.checked)">
                    <div>
                        <div style="font-size:12px;font-weight:700;color:#1e293b;">Publish release now</div>
                        <div style="font-size:10px;color:#64748b;">Sets <code>publishedAt</code> to today and marks release as shipped</div>
                    </div>
                </label>
                <div style="font-size:10px;color:#94a3b8;padding:0 2px;">After shipping, you'll be prompted to update OKR progress.</div>`
        }

        const canProceedStep1 = allCandidates.length === 0 || selectedIds.size > 0
        const canProceedStep2 = targetReleaseId && (targetReleaseId !== '__new__' || createNewName.trim().length > 0)

        overlay.innerHTML = `
            <div style="background:white;border-radius:20px;box-shadow:0 40px 80px -15px rgba(0,0,0,0.2),inset 0 0 0 1px rgba(0,0,0,0.06);width:100%;max-width:520px;margin:0 16px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
                <!-- Header -->
                <div style="padding:20px 24px 16px;border-bottom:1px solid #f1f5f9;flex-shrink:0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                        <div>
                            <div style="font-size:14px;font-weight:800;color:#1e293b;letter-spacing:-0.02em;">🚀 Release Builder</div>
                            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Ship done items from ${sprintLabel}</div>
                        </div>
                        <button onclick="window._rbClose()" style="background:#f1f5f9;border:none;border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:14px;color:#64748b;">✕</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;">${stepIndicator}</div>
                </div>
                <!-- Body -->
                <div style="padding:20px 24px;flex:1;overflow-y:auto;">${bodyHTML}</div>
                <!-- Footer -->
                <div style="padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;gap:8px;flex-shrink:0;">
                    ${step > 1 ? `<button onclick="window._rbStep(${step - 1})" style="padding:9px 16px;border-radius:8px;background:#f1f5f9;border:none;font-size:12px;font-weight:700;color:#64748b;cursor:pointer;">← Back</button>` : ''}
                    <div style="flex:1;"></div>
                    <button onclick="window._rbClose()" style="padding:9px 16px;border-radius:8px;background:white;border:1px solid #e2e8f0;font-size:12px;font-weight:700;color:#64748b;cursor:pointer;">Cancel</button>
                    ${step < 3
                        ? `<button onclick="window._rbStep(${step + 1})" ${(!canProceedStep1 && step === 1) || (!canProceedStep2 && step === 2) ? 'disabled' : ''} style="padding:9px 20px;border-radius:8px;background:#4f46e5;border:none;font-size:12px;font-weight:700;color:white;cursor:pointer;opacity:${(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2) ? 0.4 : 1};">Next →</button>`
                        : `<button onclick="window._rbConfirm()" style="padding:9px 20px;border-radius:8px;background:#059669;border:none;font-size:12px;font-weight:700;color:white;cursor:pointer;">📦 Ship ${selectedIds.size} Items</button>`
                    }
                </div>
            </div>`
    }

    // -- Event handlers --
    window._rbClose = () => { overlay.remove(); delete window._rbClose; }
    window._rbStep = (n) => { step = n; renderWizard(); }
    window._rbToggleItem = (id, checked) => { checked ? selectedIds.add(id) : selectedIds.delete(id); renderWizard(); }
    window._rbSelectAll = (v) => { v ? allCandidates.forEach(i => selectedIds.add(i.id)) : selectedIds.clear(); renderWizard(); }
    window._rbSetRelease = (id) => { targetReleaseId = id; renderWizard(); }
    window._rbSetNewReleaseName = (v) => { createNewName = v; }
    window._rbSetPublish = (v) => { shouldPublish = v; renderWizard(); }

    window._rbConfirm = () => {
        // 1. Create new release if requested
        let finalReleaseId = targetReleaseId
        if (targetReleaseId === '__new__') {
            const newRelease = {
                id: `release-${Date.now()}`,
                name: createNewName.trim() || 'New Release',
                targetDate: '',
                publishedAt: shouldPublish ? new Date().toISOString() : null,
            }
            if (!UPDATE_DATA.metadata.releases) UPDATE_DATA.metadata.releases = []
            UPDATE_DATA.metadata.releases.push(newRelease)
            finalReleaseId = newRelease.id
        } else if (shouldPublish) {
            const r = (UPDATE_DATA.metadata.releases || []).find(r => r.id === finalReleaseId)
            if (r) r.publishedAt = new Date().toISOString()
        }

        // 2. Assign selected items to release
        let count = 0
        UPDATE_DATA.tracks.forEach(track => {
            track.subtracks.forEach(subtrack => {
                subtrack.items.forEach(item => {
                    if (selectedIds.has(item.id)) {
                        item.releasedIn = finalReleaseId
                        count++
                    }
                })
            })
        })

        // 3. Save + close
        if (typeof logChange === 'function') logChange('Release Builder', `${count} items → release ${finalReleaseId}`)
        if (typeof saveToLocalStorage === 'function') saveToLocalStorage()
        if (typeof renderDashboard === 'function') renderDashboard()
        overlay.remove()

        // 4. Handoff toast
        const relName = (UPDATE_DATA.metadata.releases || []).find(r => r.id === finalReleaseId)?.name || 'release'
        if (typeof showHandoffToast === 'function') {
            showHandoffToast(
                `📦 ${count} items shipped to ${relName} ✓`,
                'Update OKRs →',
                () => switchView('okr'),
                6000
            )
        }
    }

    renderWizard()
}

// Keep backward compat — old button calls still work
function promoteSprintToRelease(sprintId) {
    openReleaseBuilder(sprintId)
}

window.openReleaseBuilder     = openReleaseBuilder
window.promoteSprintToRelease = promoteSprintToRelease


function closeCmsModal() {
    if (window.uiState.isDirty) {
        const confirmed = confirm('You have unsaved changes. Discard them?');
        if (!confirmed) return;
    }
    window.uiState.isDirty = false;
    const modal = document.getElementById('cms-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    editContext = null;
}

// ------ TAG/CHIP INPUT HELPER ------
function renderTagWidget(wrapperId, initial, datalistId, type) {
    let currentSelection = Array.isArray(initial) ? [...initial] : (initial ? [initial] : []);
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    function getOptionsForType(t) {
        if (t === 'author') {
            const set = new Set(["Subhrajit", "Vivek", "Manish", "Raj", "Nikhil", "Rushikesh", "Susmit", "Pritish", "External"]);
            UPDATE_DATA.tracks.forEach(track => track.subtracks.forEach(s => s.items.forEach(i => (i.contributors || []).forEach(c => set.add(c)))));
            return Array.from(set).map(v => ({ value: v, text: v }));
        }
        if (t === 'tag') {
            const set = new Set(["Engineering", "Project-Updates", "Bug-Fix", "Feature", "Research", "Documentation", "Design", "Refactor", "Security", "SEO", "Performance", "Testing"]);
            UPDATE_DATA.tracks.forEach(track => track.subtracks.forEach(s => s.items.forEach(i => (i.tags || []).forEach(tg => set.add(tg)))));
            return Array.from(set).map(v => ({ value: v, text: v }));
        }
        if (t === 'dep') {
            const all = [];
            UPDATE_DATA.tracks.forEach(track => track.subtracks.forEach(s => s.items.forEach(i => all.push({ value: i.id, text: i.text }))));
            return all;
        }
        return [];
    }

    function refresh() {
        if (type === 'author') _selectedContributors = currentSelection;
        if (type === 'tag') _selectedTags = currentSelection;
        if (type === 'dep') _selectedDeps = currentSelection;

        const allOptions = getOptionsForType(type);
        const availableOptions = allOptions.filter(o => !currentSelection.includes(o.value));

        const chipsArea = document.getElementById(`${wrapperId}-chips`);
        const sugBox = document.getElementById(`${wrapperId}-suggestions`);

        if (chipsArea) {
            chipsArea.innerHTML = currentSelection.map(val => {
                let label = val;
                if (type === 'dep') {
                    let found = null;
                    UPDATE_DATA.tracks.forEach(t => t.subtracks.forEach(s => s.items.forEach(i => { if (i.id === val) found = i.text; })));
                    label = found ? found : val;
                }
                return `
                    <span class="contributor-tag ${type === 'tag' ? '!bg-slate-100 !text-slate-700' : (type === 'dep' ? '!bg-amber-50 !text-amber-800 border-amber-200' : '')}">
                        ${label}
                        <span class="contributor-tag-remove" onclick="removeWidgetTag('${wrapperId}', '${val}', '${type}')">&times;</span>
                    </span>`;
            }).join('');
        }

        if (sugBox) {
            sugBox.innerHTML = availableOptions.slice(0, 10).map(o => `
                <button type="button" class="text-[10px] px-2 py-1 bg-slate-50 hover:bg-slate-200 border border-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors" 
                    onclick="selectWidgetTag('${wrapperId}', '${o.value}', '${type}')">
                    + ${o.text.length > 20 ? o.text.substring(0, 20) + '...' : o.text}
                </button>
            `).join('');
        }
    }

    wrapper.innerHTML = `
        <div id="${wrapperId}-chips" class="flex flex-wrap gap-2 mb-2"></div>
        <div class="relative">
            <input type="text" class="tag-input-field !mb-0" placeholder="Add ${type === 'author' ? 'contributor' : (type === 'tag' ? 'tag' : 'dependency')}..." id="${wrapperId}-input">
            <div id="${wrapperId}-suggestions" class="flex flex-wrap gap-1.5 mt-2 overflow-x-auto pb-1"></div>
        </div>
    `;

    const input = document.getElementById(`${wrapperId}-input`);

    // Global access for onclicks
    window[`refresh_${wrapperId}`] = refresh;
    window[`selection_${wrapperId}`] = currentSelection;
    window[`options_${wrapperId}`] = type; // Store type to get options later

    input.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            if (e.key === ',' || e.key === 'Tab') e.preventDefault();
            const val = input.value.replace(/,$/, '').trim();
            if (val && !currentSelection.includes(val)) {
                currentSelection.push(val);
                input.value = '';
                refresh();
            }
        }
    };

    input.oninput = (e) => {
        const val = input.value.trim();
        const availableOptions = getOptionsForType(type).filter(o => !currentSelection.includes(o.value));

        if (val.length > 0) {
            const filtered = availableOptions.filter(o => o.text.toLowerCase().includes(val.toLowerCase()) || o.value.toLowerCase().includes(val.toLowerCase()));
            const sugBox = document.getElementById(`${wrapperId}-suggestions`);
            if (sugBox) {
                sugBox.innerHTML = filtered.slice(0, 10).map(o => `
                    <button type="button" class="text-[10px] px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-indigo-700 font-bold" 
                        onclick="selectWidgetTag('${wrapperId}', '${o.value}', '${type}')">
                        + ${o.text.length > 20 ? o.text.substring(0, 20) + '...' : o.text}
                    </button>
                `).join('');
            }
        } else {
            refresh();
        }

        // Auto-add if exact match
        if (availableOptions.some(o => o.value === val)) {
            currentSelection.push(val);
            input.value = '';
            refresh();
        }
    };
    refresh();
}

function selectWidgetTag(wrapperId, val, type) {
    const selection = window[`selection_${wrapperId}`];
    if (selection && !selection.includes(val)) {
        selection.push(val);
        window[`refresh_${wrapperId}`]();
    }
}

function removeWidgetTag(wrapperId, val, type) {
    const selection = window[`selection_${wrapperId}`];
    if (selection) {
        const idx = selection.indexOf(val);
        if (idx > -1) {
            selection.splice(idx, 1);
            window[`refresh_${wrapperId}`]();
        }
    }
}

// Keep legacy for safety if called from other places, but we transitioned to renderTagWidget
function renderContributorTagInput(w, i) { renderTagWidget(w, i, 'contributor-list', 'author'); }

// ------ SPRINT & RELEASE OPS ------
function openSprintEdit(sprintId) {
    const sprint = sprintId ? UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId) : { name: '', startDate: '', endDate: '', goal: '', linkedOKR: '' };
    editContext = { type: 'sprint', sprintId };

    const okrs = UPDATE_DATA.metadata.okrs || [];

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🏃</span>
            <span class="font-black tracking-tight">${sprintId ? 'Edit Sprint' : 'Add New Sprint'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Execution Stage Banner -->
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Lifecycle Stage: Delivery</div>
            <div class="stage-desc">Standardize the sprint window. Defined goals prevent scope creep and ensure focus.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Sprint Descriptor</label>
                <input type="text" id="edit-sprint-name" value="${sprint.name}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Foundation Sprint 01">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Start Date</label>
                    <input type="date" id="edit-sprint-start" value="${sprint.startDate || ''}" class="cms-input shadow-sm focus:shadow-md">
                </div>
                <div>
                    <label class="cms-label">Target Completion</label>
                    <input type="date" id="edit-sprint-end" value="${sprint.endDate || ''}" class="cms-input shadow-sm focus:shadow-md">
                </div>
            </div>

            <div>
                <label class="cms-label">Objective Alignment</label>
                <select id="edit-sprint-okr" class="cms-input shadow-sm focus:shadow-md">
                    <option value="">None (Tactical / Unlinked)</option>
                    ${okrs.map(o => `<option value="${o.id}" ${sprint.linkedOKR === o.id ? 'selected' : ''}>${o.quarter}: ${o.objective}</option>`).join('')}
                </select>
            </div>

            <div>
                <label class="cms-label">Core Sprint Goal</label>
                <textarea id="edit-sprint-goal" class="cms-input shadow-sm focus:shadow-md" rows="2" placeholder="What is the primary mission of this cycle?">${sprint.goal || ''}</textarea>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${sprintId ? `
            <button onclick="deleteSprint('${sprintId}')" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete Sprint
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${sprintId ? 'Save Changes' : 'Create Sprint'}
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Lifecycle Ceremony: Sprint Close
 * Handles rollover and velocity recording
 */
function renderSprintCloseModal(sprintId) {
    const sprint = UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('sprintId', sprintId) : [];
    const doneItems = items.filter(i => i.status === 'done');
    const pendingItems = items.filter(i => i.status !== 'done');

    const plannedPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);
    const completedPoints = doneItems.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🏁</span>
            <span class="font-black tracking-tight">Close Sprint: ${sprint.name}</span>
        </div>
    `;

    let pendingHtml = '';
    if (pendingItems.length > 0) {
        pendingHtml = `
            <div class="mt-6">
                <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Rollover Decisions (${pendingItems.length} items)</h4>
                <div class="space-y-2 max-h-60 overflow-y-auto pr-2">
                    ${pendingItems.map(item => `
                        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                            <div class="flex-1 min-w-0">
                                <div class="text-[10px] font-bold text-slate-400 uppercase">#${item.id} · ${item.status}</div>
                                <div class="text-xs font-bold text-slate-700 truncate">${item.text}</div>
                            </div>
                            <select class="cms-input !w-auto !mb-0 text-[10px] font-black" data-item-id="${item.id}" id="rollover-${item.id}">
                                <option value="next">Move to Next Sprint</option>
                                <option value="backlog">Move to Backlog</option>
                                <option value="drop">Drop from Sprint</option>
                            </select>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        pendingHtml = `
            <div class="mt-6 p-10 bg-emerald-50 border border-dashed border-emerald-200 rounded-3xl text-center">
                <div class="text-3xl mb-2">🎉</div>
                <h4 class="text-emerald-900 font-bold">Perfect Closure!</h4>
                <p class="text-emerald-700 text-xs">All items in this sprint were completed.</p>
            </div>
        `;
    }

    document.getElementById('modal-form').innerHTML = `
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Ceremony: Sprint Review</div>
            <div class="stage-desc">Formalize the end of the cycle. Record performance and clear the path for the next sprint.</div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="p-4 bg-slate-900 rounded-2xl text-white">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Actual Velocity</div>
                <div class="text-2xl font-black">${completedPoints} <span class="text-xs text-slate-500 font-bold">/ ${plannedPoints} pts</span></div>
                <div class="text-[10px] font-bold text-indigo-400 mt-1">${Math.round((completedPoints / (plannedPoints || 1)) * 100)}% Commitment Met</div>
            </div>
            <div class="p-4 bg-white border border-slate-200 rounded-2xl">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sprint Status</div>
                <div class="text-lg font-black text-slate-800">Finalizing...</div>
                <div class="text-[10px] font-bold text-slate-500 mt-1 italic">Rollover logic applied on save</div>
            </div>
        </div>

        ${pendingHtml}
    `;

    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="saveSprintClose('${sprintId}')" class="cms-btn cms-btn-primary">🏁 Finish & Close Sprint</button>
    `;

    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function saveSprintClose(sprintId) {
    const sprintIndex = UPDATE_DATA.metadata.sprints.findIndex(s => s.id === sprintId);
    if (sprintIndex === -1) return;

    const sprint = UPDATE_DATA.metadata.sprints[sprintIndex];
    const nextSprint = UPDATE_DATA.metadata.sprints[sprintIndex + 1];

    // 1. Calculate final points
    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('sprintId', sprintId) : [];
    const doneItems = items.filter(i => i.status === 'done');
    const plannedPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);
    const completedPoints = doneItems.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);

    // 2. Apply rollover resolutions
    const resolutionSelects = document.querySelectorAll('[id^="rollover-"]');
    const movements = [];
    
    resolutionSelects.forEach(select => {
        const itemId = select.getAttribute('data-item-id');
        const resolution = select.value;
        const item = items.find(i => i.id === itemId);
        if (item) movements.push({ item, resolution });
    });

    // Sort descending by itemIndex so splice doesn't affect subsequent indices
    movements.sort((a, b) => b.item.itemIndex - a.item.itemIndex);

    movements.forEach(m => {
        const { item, resolution } = m;
        // Update the real item in UPDATE_DATA
        const track = UPDATE_DATA.tracks[item.trackIndex];
        const subtrack = track.subtracks[item.subtrackIndex];
        const realItem = subtrack.items[item.itemIndex];

        if (resolution === 'next') {
            if (nextSprint) {
                realItem.sprintId = nextSprint.id;
                realItem.status = 'next'; // Reset to Planned for new cycle
            } else {
                // Fallback to backlog if no next sprint exists
                realItem.sprintId = '';
                realItem.status = 'later';
                // Physically move to Backlog subtrack
                moveItemToBacklog(item);
                if (typeof showToast === 'function') showToast(`No future sprint found — #${realItem.id} moved to backlog.`, 'warn');
            }
        } else if (resolution === 'backlog') {
            realItem.sprintId = '';
            realItem.status = 'later';
            moveItemToBacklog(item);
        } else if (resolution === 'drop') {
            realItem.sprintId = '';
        }
        realItem.updatedAt = new Date().toISOString();
    });

    // 3. Record Velocity History
    if (!UPDATE_DATA.metadata.velocityHistory) UPDATE_DATA.metadata.velocityHistory = [];
    
    // Check if record already exists, if so update it, else push
    const existingHistoryIdx = UPDATE_DATA.metadata.velocityHistory.findIndex(h => h.sprintId === sprintId);
    const historyRecord = {
        sprintId: sprintId,
        planned: plannedPoints,
        completed: completedPoints,
        velocity: Math.round((completedPoints / (plannedPoints || 1)) * 100),
        dates: `${sprint.startDate} - ${sprint.endDate}`
    };

    if (existingHistoryIdx !== -1) {
        UPDATE_DATA.metadata.velocityHistory[existingHistoryIdx] = historyRecord;
    } else {
        UPDATE_DATA.metadata.velocityHistory.push(historyRecord);
    }

    // 4. Update Sprint Status
    UPDATE_DATA.metadata.sprints[sprintIndex].status = 'completed';
    UPDATE_DATA.metadata.sprints[sprintIndex].completedPoints = completedPoints;

    // 5. Notify and Save
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    
    if (typeof showToast === 'function') showToast(`Sprint ${sprint.name} closed successfully.`);
    else alert(`Sprint ${sprint.name} closed successfully.`);

    closeCmsModal();
    if (typeof renderSprintView === 'function') renderSprintView();
    if (typeof renderAnalyticsView === 'function') renderAnalyticsView();
}

/**
 * Lifecycle Ceremony: OKR Close
 * Formalizes the end of a quarterly strategic cycle
 */
function closeOKR(idx) {
    const okr = UPDATE_DATA.metadata.okrs[idx];
    if (!okr) return;

    const result = prompt(`Close OKR: "${okr.objective}"\n\nEnter Result (achieved / missed / cancelled):`, 'achieved');
    if (!result) return;

    UPDATE_DATA.metadata.okrs[idx].status = 'closed';
    UPDATE_DATA.metadata.okrs[idx].result = result.toLowerCase();
    UPDATE_DATA.metadata.okrs[idx].updatedAt = new Date().toISOString();

    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof showToast === 'function') showToast(`OKR marked as ${result}`);
    if (typeof renderOkrView === 'function') renderOkrView();
}

/**
 * Lifecycle Ceremony: Epic Close
 * Cleans up tactical debt and completes a strategic initiative
 */
function closeEpic(idx) {
    const epic = UPDATE_DATA.metadata.epics[idx];
    if (!epic) return;

    if (!confirm(`Are you sure you want to close Epic: "${epic.name}"?\n\nAny incomplete tasks will be moved to the Backlog.`)) return;

    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('epicId', epic.id) : [];
    const pendingItems = items.filter(i => i.status !== 'done');

    // 1. Group items by source subtrack to safely move them without index shifting
    // Sort descending by itemIndex so splice doesn't affect subsequent indices
    const sortedPending = [...pendingItems].sort((a, b) => b.itemIndex - a.itemIndex);

    // 2. Move pending to backlog
    sortedPending.forEach(item => {
        const track = UPDATE_DATA.tracks[item.trackIndex];
        const subtrack = track.subtracks[item.subtrackIndex];
        const realItem = subtrack.items[item.itemIndex];
        
        realItem.epicId = '';
        realItem.status = 'later';
        realItem.updatedAt = new Date().toISOString();

        moveItemToBacklog(item);
    });

    UPDATE_DATA.metadata.epics[idx].status = 'completed';
    UPDATE_DATA.metadata.epics[idx].updatedAt = new Date().toISOString();

    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof showToast === 'function') showToast(`Epic ${epic.name} closed. ${pendingItems.length} items moved to backlog.`);
    if (typeof renderEpicsView === 'function') renderEpicsView();
}

/**
 * Shared Helper: Physically move an item to the "Backlog" subtrack of its parent track
 * Used by ceremonies for physical data organization
 */
function moveItemToBacklog(itemRef) {
    const track = UPDATE_DATA.tracks[itemRef.trackIndex];
    if (!track) return;

    const sourceSubtrack = track.subtracks[itemRef.subtrackIndex];
    if (!sourceSubtrack) return;

    const backlogSubtrack = track.subtracks.find(s => s.name === 'Backlog');
    if (!backlogSubtrack) return;

    // Don't move if it's already in the backlog
    if (sourceSubtrack === backlogSubtrack) return;

    // 1. Get the real item object from the source
    const itemsToMove = sourceSubtrack.items.splice(itemRef.itemIndex, 1);
    const itemObj = itemsToMove[0];

    // 2. Add to backlog
    if (itemObj) {
        backlogSubtrack.items.push(itemObj);
    }
}

/**
 * Lifecycle Ceremony: Ship Release
 * Marks a release as completed and rolls over missed items
 */
function shipRelease(releaseId) {
    const releaseIdx = UPDATE_DATA.metadata.releases.findIndex(r => r.id === releaseId);
    if (releaseIdx === -1) return;

    const release = UPDATE_DATA.metadata.releases[releaseIdx];
    const nextRelease = UPDATE_DATA.metadata.releases.find((r, i) => i > releaseIdx && r.status !== 'completed');

    if (!confirm(`🚀 Ship Release: "${release.name}"?\n\nIncomplete items will be rolled over.`)) return;

    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('releasedIn', releaseId) : [];
    const pendingItems = items.filter(i => i.status !== 'done');

    // Move pending to next release
    pendingItems.forEach(item => {
        const track = UPDATE_DATA.tracks[item.trackIndex];
        const subtrack = track.subtracks[item.subtrackIndex];
        const realItem = subtrack.items[item.itemIndex];
        
        if (nextRelease) {
            realItem.releasedIn = nextRelease.id;
            realItem.status = 'next'; // Reset to Planned for next release
        } else {
            realItem.releasedIn = ''; // Back to unassigned if no next release
            realItem.status = 'later';
        }
        realItem.updatedAt = new Date().toISOString();
    });

    UPDATE_DATA.metadata.releases[releaseIdx].status = 'completed';
    UPDATE_DATA.metadata.releases[releaseIdx].updatedAt = new Date().toISOString();

    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof showToast === 'function') showToast(`Release ${release.name} Shipped! 📦`);
    if (typeof renderReleasesView === 'function') renderReleasesView();
}

/**
 * Lifecycle Ceremony: Advance Roadmap Horizons
 * Bulk nudge of strategic initiatives across planning horizons
 */
function advanceRoadmapHorizons() {
    if (!confirm("⚠️ Advance Roadmap Horizons?\n\nThis will shift all items:\n- Next (3M) → Now (1M)\n- Later (6M) → Next (3M)\n\nItems currently in 'Now' will remain there but should be reviewed for backlog/archive.")) return;

    let shiftCount = 0;
    
    // 1. Advance items
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.planningHorizon === '3M') {
                    item.planningHorizon = '1M';
                    shiftCount++;
                } else if (item.planningHorizon === '6M') {
                    item.planningHorizon = '3M';
                    shiftCount++;
                }
                item.updatedAt = new Date().toISOString();
            });
        });
    });

    // 2. Strategic Sync: Advance Epics
    if (UPDATE_DATA.metadata.epics) {
        UPDATE_DATA.metadata.epics.forEach(epic => {
            if (epic.planningHorizon === '3M') {
                epic.planningHorizon = '1M';
            } else if (epic.planningHorizon === '6M') {
                epic.planningHorizon = '3M';
            }
            epic.updatedAt = new Date().toISOString();
        });
    }

    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof showToast === 'function') showToast(`Roadmap advanced! ${shiftCount} items shifted horizons.`);
    if (typeof renderRoadmapView === 'function') renderRoadmapView();
}

function openReleaseEdit(releaseId) {
    const release = releaseId ? UPDATE_DATA.metadata.releases.find(r => r.id === releaseId) : { name: '', targetDate: '', goal: '', linkedOKR: '' };
    editContext = { type: 'release', releaseId };

    const okrs = UPDATE_DATA.metadata.okrs || [];

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">📦</span>
            <span class="font-black tracking-tight">${releaseId ? 'Edit Engineering Release' : 'Add New Release'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Release Stage Banner -->
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Lifecycle Stage: Release Milestone</div>
            <div class="stage-desc">Manage production shipping windows. Unified release markers provide clarity on target dates.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Strategic Release Name</label>
                <input type="text" id="edit-release-name" value="${release.name}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. v2.1 (The Spark)">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Target Launch Date</label>
                    <input type="date" id="edit-release-date" value="${release.targetDate || ''}" class="cms-input shadow-sm focus:shadow-md">
                </div>
                <div>
                    <label class="cms-label">Strategic OKR Alignment</label>
                    <select id="edit-release-okr" class="cms-input shadow-sm focus:shadow-md">
                        <option value="">None (Unlinked)</option>
                        ${okrs.map(o => `<option value="${o.id}" ${release.linkedOKR === o.id ? 'selected' : ''}>${o.quarter}: ${o.objective}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div>
                <label class="cms-label">Market Impact & Release Goal</label>
                <textarea id="edit-release-goal" class="cms-input shadow-sm focus:shadow-md" rows="2" placeholder="Primary mission or customer impact of this release...">${release.goal || ''}</textarea>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${releaseId ? `
            <button onclick="deleteRelease('${releaseId}')" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete Release
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${releaseId ? 'Save Changes' : 'Create Release'}
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openEpicEdit(epicIndex) {
    const epic = epicIndex !== undefined ? UPDATE_DATA.metadata.epics[epicIndex] : { name: '', description: '', health: 'on-track' };
    const epicId = epicIndex !== undefined ? epic.id : undefined;
    editContext = { type: 'epic', epicId };

    const okrs = UPDATE_DATA.metadata.okrs || [];
    const horizons = UPDATE_DATA.metadata.roadmap || [];

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🚀</span>
            <span class="font-black tracking-tight">${epicId ? 'Edit Strategic Epic' : 'Add Strategic Epic'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Defining Stage Banner -->
        <div class="lifecycle-banner defining">
            <div class="stage-tag">Lifecycle Stage: Definition</div>
            <div class="stage-desc">Break down strategic OKRs into actionable initiatives. Define boundaries and business value.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Strategic Epic Name</label>
                <input type="text" id="edit-epic-name" value="${epic.name}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Platform Migration V2">
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Strategic Objective</label>
                    <select id="edit-epic-okr" class="cms-input shadow-sm focus:shadow-md">
                        <option value="">None (BAU / Unlinked)</option>
                        ${okrs.map(o => `<option value="${o.id}" ${epic.linkedOKR === o.id ? 'selected' : ''}>${o.objective}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="cms-label">Planning Horizon</label>
                    <select id="edit-epic-horizon" class="cms-input shadow-sm focus:shadow-md">
                        <option value="">No Specific Horizon</option>
                        ${horizons.map(h => `<option value="${h.id}" ${epic.planningHorizon === h.id ? 'selected' : ''}>${h.label}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Lifecycle Stage (Vision-First)</label>
                    <select id="edit-epic-stage" class="cms-input shadow-sm focus:shadow-md">
                        <option value="vision" ${epic.stage === 'vision' ? 'selected' : ''}>🎯 Vision (Alignment)</option>
                        <option value="definition" ${epic.stage === 'definition' || !epic.stage ? 'selected' : ''}>📂 Definition (Planning)</option>
                        <option value="delivery" ${epic.stage === 'delivery' ? 'selected' : ''}>⚡ Delivery (Execution)</option>
                        <option value="review" ${epic.stage === 'review' ? 'selected' : ''}>📊 Review (Analytics)</option>
                    </select>
                </div>
                <div>
                    <label class="cms-label">Execution Health</label>
                    <select id="edit-epic-health" class="cms-input shadow-sm focus:shadow-md">
                        <option value="on-track" ${epic.health === 'on-track' ? 'selected' : ''}>🟢 On-Track</option>
                        <option value="at-risk" ${epic.health === 'at-risk' ? 'selected' : ''}>🟡 At-Risk</option>
                        <option value="delayed" ${epic.health === 'delayed' ? 'selected' : ''}>🔴 Delayed</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="cms-label">Business Value & Intent</label>
                <textarea id="edit-epic-desc" class="cms-input shadow-sm focus:shadow-md" rows="2" placeholder="What strategic value does this Epic provide?">${epic.description || ''}</textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Strategic Weight (%)</label>
                    <input type="number" id="edit-epic-weight" value="${epic.strategicWeight || 0}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. 25" min="0" max="100">
                    <p class="text-[9px] text-slate-400 mt-1">Contribution to parent OKR</p>
                </div>
                <div>
                    <label class="cms-label">Primary Risk Type</label>
                    <select id="edit-epic-risk" class="cms-input shadow-sm focus:shadow-md">
                        <option value="none" ${epic.riskType === 'none' ? 'selected' : ''}>None / Neutral</option>
                        <option value="technical" ${epic.riskType === 'technical' ? 'selected' : ''}>🛠️ Technical (Complexity)</option>
                        <option value="market" ${epic.riskType === 'market' ? 'selected' : ''}>📈 Market (Adoption)</option>
                        <option value="operational" ${epic.riskType === 'operational' ? 'selected' : ''}>⚙️ Operational (Internal)</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="cms-label text-indigo-600 font-black">Success Criteria (ROI Focus)</label>
                <textarea id="edit-epic-success" class="cms-input shadow-sm focus:shadow-md border-indigo-100" rows="2" placeholder="What specific outcome defines success? (e.g. 95% reduction in latency)">${epic.successCriteria || ''}</textarea>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${epicId ? `
            <button onclick="deleteEpic(${epicIndex})" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete Epic
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${epicId ? 'Save Changes' : 'Create Epic'}
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openRoadmapEdit(id) {
    if (!UPDATE_DATA.metadata.roadmap) {
        UPDATE_DATA.metadata.roadmap = [
            { id: '1M', label: 'Now (Immediate / 1 Month)', color: 'blue' },
            { id: '3M', label: 'Next (Strategic / 3 Months)', color: 'indigo' },
            { id: '6M', label: 'Later (Future / 6 Months)', color: 'slate' }
        ];
    }
    const horizon = id ? UPDATE_DATA.metadata.roadmap.find(r => r.id === id) : { id: '', label: '', color: 'blue' };
    editContext = { type: 'roadmap', roadmapId: id };

    const okrs = UPDATE_DATA.metadata.okrs || [];

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🗺️</span>
            <span class="font-black tracking-tight">${id ? 'Edit Roadmap Category' : 'Add Roadmap Category'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Planning Stage Banner -->
        <div class="lifecycle-banner strategic">
            <div class="stage-tag">Lifecycle Stage: Strategic Roadmap</div>
            <div class="stage-desc">Map initiatives to Now, Next, and Future horizons to provide predictability to stakeholders.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Category Title</label>
                <input type="text" id="edit-roadmap-label" value="${horizon.label}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Q4 Strategic Focus">
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Internal Identifier</label>
                    <input type="text" id="edit-roadmap-id" value="${horizon.id}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. 1M" ${id ? 'readonly' : ''}>
                    <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">${id ? 'Immutable Key' : 'Unique key for linkage'}</p>
                </div>
                <div>
                    <label class="cms-label">Alignment Objective</label>
                    <select id="edit-roadmap-okr" class="cms-input shadow-sm focus:shadow-md">
                        <option value="">No Specific OKR</option>
                        ${okrs.map(o => `<option value="${o.id}" ${horizon.linkedObjective === o.id ? 'selected' : ''}>${o.objective}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div>
                <label class="cms-label">Horizon Aesthetic</label>
                <select id="edit-roadmap-color" class="cms-input shadow-sm focus:shadow-md">
                    <option value="blue" ${horizon.color === 'blue' ? 'selected' : ''}>Blue</option>
                    <option value="indigo" ${horizon.color === 'indigo' ? 'selected' : ''}>Indigo</option>
                    <option value="violet" ${horizon.color === 'violet' ? 'selected' : ''}>Violet</option>
                    <option value="emerald" ${horizon.color === 'emerald' ? 'selected' : ''}>Emerald</option>
                    <option value="amber" ${horizon.color === 'amber' ? 'selected' : ''}>Amber</option>
                    <option value="rose" ${horizon.color === 'rose' ? 'selected' : ''}>Rose</option>
                    <option value="slate" ${horizon.color === 'slate' ? 'selected' : ''}>Slate</option>
                </select>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${id ? `
            <button onclick="deleteRoadmap('${id}')" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete Category
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${id ? 'Save Changes' : 'Create Category'}
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function validateCmsForm() {
    const textEl = document.getElementById('edit-text') ||
        document.getElementById('edit-sprint-name') ||
        document.getElementById('edit-release-name') ||
        document.getElementById('edit-epic-name') ||
        document.getElementById('edit-okr-objective') ||
        document.getElementById('edit-track-name') ||
        document.getElementById('edit-subtrack-name') ||
        document.getElementById('edit-roadmap-label') ||
        document.getElementById('edit-roadmap-id');
    if (textEl && !textEl.value.trim()) {
        textEl.style.borderColor = '#ef4444';
        return false;
    }
    return true;
}

function saveCmsChanges() {
    if (!validateCmsForm()) return;

    if (editContext.type === 'item' || editContext.type === 'item-new') {
        const itemData = {};

        // Harvest only visible fields to maintain context-awareness
        const fieldMap = {
            'text': 'edit-text', 'status': 'edit-status', 'priority': 'edit-priority',
            'note': 'edit-note', 'usecase': 'edit-usecase', 'mediaUrl': 'edit-mediaUrl',
            'startDate': 'edit-startDate', 'due': 'edit-due', 'sprintId': 'edit-sprintId',
            'releasedIn': 'edit-releasedIn', 'planningHorizon': 'edit-planningHorizon',
            'epicId': 'edit-epicId', 'storyPoints': 'edit-storyPoints',
            'effortLevel': 'edit-effortLevel', 'impactLevel': 'edit-impactLevel',
            'publishedDate': 'edit-publishedDate', 'blockerNote': 'edit-blockerNote',
            'persona': 'edit-persona', 'successMetric': 'edit-successMetric'
        };

        Object.entries(fieldMap).forEach(([key, id]) => {
            const el = document.getElementById(id);
            if (el) {
                let val = el.value;
                if (key === 'storyPoints') val = parseInt(val) || 0;
                else val = val.trim();
                itemData[key] = val;
            }
        });

        // Specialized fields (Tags/AC)
        const acEl = document.getElementById('edit-acceptanceCriteria');
        if (acEl) {
            itemData.acceptanceCriteria = acEl.value.split('\n').map(s => s.trim()).filter(s => s !== '');
        }

        // Widgets (always available in context if rendered)
        if (document.getElementById('contrib-tag-input-edit')) itemData.contributors = [..._selectedContributors];
        if (document.getElementById('tags-tag-input-edit')) itemData.tags = [..._selectedTags];
        if (document.getElementById('deps-tag-input-edit')) itemData.dependencies = [..._selectedDeps];

        if (itemData.blockerNote) itemData.blocker = true;
        else if (document.getElementById('edit-blockerNote')) delete itemData.blocker;

        const moveTrackEl = document.getElementById('edit-move-track');
        const moveSubEl = document.getElementById('edit-move-subtrack');
        const targetTi = moveTrackEl ? parseInt(moveTrackEl.value) : editContext.trackIndex;
        const targetSi = moveSubEl ? parseInt(moveSubEl.value) : editContext.subtrackIndex;

        if (editContext.type === 'item') {
            // Validate indices before access
            if (editContext.trackIndex === undefined || editContext.subtrackIndex === undefined ||
                !UPDATE_DATA.tracks[editContext.trackIndex] ||
                !UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex]) {
                console.error('❌ Invalid edit context for item save:', editContext);
                alert('Error: Could not find original item location. Please refresh and try again.');
                return;
            }

            const oldItem = UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].items[editContext.itemIndex];
            const finalItem = { ...oldItem, ...itemData };

            if (targetTi !== editContext.trackIndex || targetSi !== editContext.subtrackIndex) {
                UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].items.splice(editContext.itemIndex, 1);
                UPDATE_DATA.tracks[targetTi].subtracks[targetSi].items.push(finalItem);
            } else {
                UPDATE_DATA.tracks[targetTi].subtracks[targetSi].items[editContext.itemIndex] = finalItem;
            }
            logChange('Edit Item', finalItem.text);
        } else {
            const newItem = {
                id: `task-${Date.now()}`,
                ...itemData,
                publishedDate: itemData.publishedDate || new Date().toISOString().split('T')[0]
            };

            if (UPDATE_DATA.tracks[targetTi] && UPDATE_DATA.tracks[targetTi].subtracks[targetSi]) {
                UPDATE_DATA.tracks[targetTi].subtracks[targetSi].items.push(newItem);
                logChange('Add Item', newItem.text);
            } else {
                console.error('❌ Target location for new item not found:', { targetTi, targetSi });
                alert('Error: Could not save item to the specified track.');
            }
        }
    } else if (editContext.type === 'sprint') {
        const sprintData = {
            id: editContext.sprintId || `sprint-${Date.now()}`,
            name: document.getElementById('edit-sprint-name').value.trim(),
            startDate: document.getElementById('edit-sprint-start').value,
            endDate: document.getElementById('edit-sprint-end').value,
            goal: document.getElementById('edit-sprint-goal').value.trim(),
            linkedOKR: document.getElementById('edit-sprint-okr').value
        };
        if (!UPDATE_DATA.metadata.sprints) UPDATE_DATA.metadata.sprints = [];
        if (editContext.sprintId) {
            const idx = UPDATE_DATA.metadata.sprints.findIndex(s => s.id === editContext.sprintId);
            UPDATE_DATA.metadata.sprints[idx] = sprintData;
        } else {
            UPDATE_DATA.metadata.sprints.push(sprintData);
        }
        logChange(editContext.sprintId ? 'Edit Sprint' : 'Add Sprint', sprintData.name);
        renderSprintView();

    } else if (editContext.type === 'release') {
        const relData = {
            id: editContext.releaseId || `rel-${Date.now()}`,
            name: document.getElementById('edit-release-name').value.trim(),
            targetDate: document.getElementById('edit-release-date').value,
            goal: document.getElementById('edit-release-goal').value.trim(),
            linkedOKR: document.getElementById('edit-release-okr').value
        };
        if (!UPDATE_DATA.metadata.releases) UPDATE_DATA.metadata.releases = [];
        if (editContext.releaseId) {
            const idx = UPDATE_DATA.metadata.releases.findIndex(r => r.id === editContext.releaseId);
            UPDATE_DATA.metadata.releases[idx] = relData;
        } else {
            UPDATE_DATA.metadata.releases.push(relData);
        }
        logChange(editContext.releaseId ? 'Edit Release' : 'Add Release', relData.name);
        renderReleasesView();
    } else if (editContext.type === 'metadata') {
        const meta = UPDATE_DATA.metadata;
        meta.title = document.getElementById('edit-meta-title').value;
        meta.dateRange = document.getElementById('edit-meta-dateRange').value;
        meta.nextReview = document.getElementById('edit-meta-nextReview').value;
        meta.description = document.getElementById('edit-meta-description').value;
        try {
            meta.customStatuses = JSON.parse(document.getElementById('edit-meta-customStatuses').value);
        } catch (e) { alert('Invalid Status JSON structure.'); return; }
        logChange('Edit Metadata', meta.title);

    } else if (editContext.type === 'track') {
        const name = document.getElementById('edit-track-name').value.trim();
        const theme = document.getElementById('edit-track-theme').value;
        if (editContext.trackIndex !== undefined) {
            const track = UPDATE_DATA.tracks[editContext.trackIndex];
            track.name = name;
            track.theme = theme;
        } else {
            UPDATE_DATA.tracks.push({
                name,
                theme,
                subtracks: [{ name: 'General', items: [] }]
            });
        }
        logChange(editContext.trackIndex !== undefined ? 'Edit Track' : 'Add Track', name);
        renderTrackView();
        updateTabCounts();

    } else if (editContext.type === 'epic') {
        const epicData = {
            id: editContext.epicId || `epic-${Date.now()}`,
            name: document.getElementById('edit-epic-name').value.trim(),
            description: document.getElementById('edit-epic-desc').value.trim(),
            health: document.getElementById('edit-epic-health').value,
            stage: document.getElementById('edit-epic-stage').value,
            successCriteria: document.getElementById('edit-epic-success').value.trim(),
            linkedOKR: document.getElementById('edit-epic-okr').value,
            planningHorizon: document.getElementById('edit-epic-horizon').value,
            strategicWeight: parseInt(document.getElementById('edit-epic-weight').value) || 0,
            riskType: document.getElementById('edit-epic-risk').value
        };
        if (!UPDATE_DATA.metadata.epics) UPDATE_DATA.metadata.epics = [];
        if (editContext.epicId) {
            const idx = UPDATE_DATA.metadata.epics.findIndex(e => e.id === editContext.epicId);
            UPDATE_DATA.metadata.epics[idx] = epicData;
        } else {
            UPDATE_DATA.metadata.epics.push(epicData);
        }
        logChange(editContext.epicId ? 'Edit Epic' : 'Add Epic', epicData.name);

    } else if (editContext.type === 'okr') {
        // Collect key results from form fields
        const keyResults = [];
        const krFields = document.querySelectorAll('[data-kr-field]');

        // Group fields by index
        const krsByIndex = {};
        krFields.forEach(field => {
            const idx = parseInt(field.getAttribute('data-kr-idx'));
            const fieldName = field.getAttribute('data-kr-field');

            if (!krsByIndex[idx]) {
                krsByIndex[idx] = {
                    id: window._editingKeyResults[idx]?.id || `kr-${Date.now()}-${idx}`,
                    description: '',
                    target: 100,
                    current: 0,
                    unit: '%',
                    progress: 0,
                    status: 'on-track',
                    linkedEpic: ''
                };
            }

            // Get value from field
            let value = field.value;
            if (fieldName === 'target' || fieldName === 'current') {
                value = parseFloat(value) || 0;
            }

            krsByIndex[idx][fieldName] = value;
        });

        // Calculate progress for each KR
        Object.values(krsByIndex).forEach(kr => {
            if (kr.target > 0) {
                kr.progress = Math.round((kr.current / kr.target) * 100);
            }
            keyResults.push(kr);
        });

        // Calculate overall OKR progress
        let overallProgress = 0;
        if (keyResults.length > 0) {
            const totalProgress = keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0);
            overallProgress = Math.round(totalProgress / keyResults.length);
        }

        const okrData = {
            id: editContext.okrId || `okr-${Date.now()}`,
            quarter: document.getElementById('edit-okr-quarter').value.trim(),
            objective: document.getElementById('edit-okr-objective').value.trim(),
            owner: document.getElementById('edit-okr-owner').value.trim(),
            keyResults: keyResults,
            overallProgress: overallProgress
        };

        if (!UPDATE_DATA.metadata.okrs) UPDATE_DATA.metadata.okrs = [];

        if (editContext.okrId) {
            const idx = UPDATE_DATA.metadata.okrs.findIndex(o => o.id === editContext.okrId);
            if (idx !== -1) {
                UPDATE_DATA.metadata.okrs[idx] = okrData;
            } else {
                UPDATE_DATA.metadata.okrs.push(okrData);
            }
        } else {
            UPDATE_DATA.metadata.okrs.push(okrData);
        }

        logChange(editContext.okrId ? 'Edit OKR' : 'Add OKR', okrData.objective);

        // AUTO-REFRESH VIEW
        if (typeof renderOkrView === 'function') renderOkrView();
        closeCmsModal();
    } else if (window._visionEditContext && window._visionEditContext.type === 'vision') {
        const visionText = document.getElementById('edit-vision-text')?.value.trim() || '';
        UPDATE_DATA.metadata.vision = visionText;
        logChange('Edit Vision', visionText ? 'Vision updated' : 'Vision cleared');
        window._visionEditContext = null;

    } else if (editContext.type === 'roadmap') {
        const roadmapData = {
            id: document.getElementById('edit-roadmap-id').value.trim(),
            label: document.getElementById('edit-roadmap-label').value.trim(),
            color: document.getElementById('edit-roadmap-color').value,
            linkedObjective: document.getElementById('edit-roadmap-okr').value
        };
        if (!UPDATE_DATA.metadata.roadmap) {
            UPDATE_DATA.metadata.roadmap = [
                { id: '1M', label: 'Now (Immediate / 1 Month)', color: 'blue' },
                { id: '3M', label: 'Next (Strategic / 3 Months)', color: 'indigo' },
                { id: '6M', label: 'Later (Future / 6 Months)', color: 'slate' }
            ];
        }
        if (editContext.roadmapId) {
            const idx = UPDATE_DATA.metadata.roadmap.findIndex(r => r.id === editContext.roadmapId);
            UPDATE_DATA.metadata.roadmap[idx] = roadmapData;
        } else {
            UPDATE_DATA.metadata.roadmap.push(roadmapData);
        }
        logChange(editContext.roadmapId ? 'Edit Roadmap' : 'Add Roadmap', roadmapData.label);
        renderRoadmapView();

    } else if (editContext.type === 'subtrack') {
        const subName = document.getElementById('edit-subtrack-name').value.trim();
        const subNote = document.getElementById('edit-subtrack-note').value.trim();
        if (editContext.subtrackIndex !== undefined) {
            const sub = UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex];
            sub.name = subName;
            sub.note = subNote;
        } else {
            UPDATE_DATA.tracks[editContext.trackIndex].subtracks.push({
                name: subName,
                note: subNote,
                items: []
            });
        }
        logChange(editContext.subtrackIndex !== undefined ? 'Edit Subtrack' : 'Add Subtrack', subName);
        renderTrackView();
    }

    saveToLocalStorage();
    renderDashboard();

    window.uiState.isDirty = false; // Saved — bypass unsaved-changes guard
    closeCmsModal();
    const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    if (typeof switchView === 'function') switchView(currentView);
}

function updateItemGrooming(trackIndex, subtrackIndex, itemIndex, field, value, itemId) {
    // 🏆 Phase 32: Use Universal Resolver for absolute ID-first matching
    const data = getValidatedItemContext(itemId || { trackIndex, subtrackIndex, itemIndex });
    if (!data) {
        console.error('❌ updateItemGrooming: Item context not found', { trackIndex, subtrackIndex, itemIndex, itemId });
        return;
    }
    
    data.item[field] = value;
    logChange(`Groom Item (${field})`, data.item.text);
    
    saveToLocalStorage();
    renderDashboard();
    
    // Auto-refresh the current view
    const currentView = window.currentActiveView || 'backlog';
    if (typeof switchView === 'function') switchView(currentView);
}

// Consolidated Track Management
function openTrackEdit(ti) {
    const track = ti !== undefined ? UPDATE_DATA.tracks[ti] : { name: '', theme: 'blue', subtracks: [{ name: 'General', items: [] }] };
    editContext = { type: 'track', trackIndex: ti };

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🏗️</span>
            <span class="font-black tracking-tight">${ti !== undefined ? 'Edit Functional Track' : 'Add New Track'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Infrastructure Banner -->
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Lifecycle Stage: Structural Framework</div>
            <div class="stage-desc">Manage the primary silos of your engineering organization. Tracks represent long-lived functional domains.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Track Identifier</label>
                <input type="text" id="edit-track-name" value="${track.name}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Platform Team">
            </div>
            <div>
                <label class="cms-label">Strategic Theme</label>
                <select id="edit-track-theme" class="cms-input shadow-sm focus:shadow-md">
                    <option value="blue" ${track.theme === 'blue' ? 'selected' : ''}>Standard Blue</option>
                    <option value="emerald" ${track.theme === 'emerald' ? 'selected' : ''}>Emerald Green</option>
                    <option value="violet" ${track.theme === 'violet' ? 'selected' : ''}>Violet Purple</option>
                    <option value="amber" ${track.theme === 'amber' ? 'selected' : ''}>Amber Yellow</option>
                    <option value="rose" ${track.theme === 'rose' ? 'selected' : ''}>Rose Pink</option>
                    <option value="slate" ${track.theme === 'slate' ? 'selected' : ''}>Cool Slate</option>
                </select>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${ti !== undefined ? `
            <button onclick="deleteTrack(${ti})" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete Track
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${ti !== undefined ? 'Save Changes' : 'Create Track'}
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function deleteTrack(ti) {
    if (!confirm(`Delete track "${UPDATE_DATA.tracks[ti].name}" and ALL its items?`)) return;
    UPDATE_DATA.tracks.splice(ti, 1);
    closeCmsModal();
    renderTrackView();
    updateTabCounts();
}

function addSubtrack(ti) {
    const name = prompt('Subtrack Name:');
    if (!name) return;
    UPDATE_DATA.tracks[ti].subtracks.push({ name, items: [] });
    renderTrackView();
    updateTabCounts();
}

function openSubtrackEdit(ti, si) {
    const sub = UPDATE_DATA.tracks[ti].subtracks[si];
    editContext = { type: 'subtrack', trackIndex: ti, subtrackIndex: si };

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">📂</span>
            <span class="font-black tracking-tight">Edit Engineering Subtrack</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <div class="space-y-5">
            <div>
                <label class="cms-label">Subtrack Header</label>
                <input type="text" id="edit-subtrack-name" value="${sub.name}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Core Features">
            </div>
            <div>
                <label class="cms-label">Context / Internal Notes</label>
                <textarea id="edit-subtrack-note" class="cms-input shadow-sm focus:shadow-md" rows="3" placeholder="Operational context for this group...">${sub.note || ''}</textarea>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        <button onclick="deleteSubtrack(${ti}, ${si})" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
            <span>🗑️</span> Delete Subtrack
        </button>
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> Save Changes
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function deleteSubtrack(ti, si) {
    if (!confirm(`Delete subtrack "${UPDATE_DATA.tracks[ti].subtracks[si].name}"?`)) return;
    UPDATE_DATA.tracks[ti].subtracks.splice(si, 1);
    closeCmsModal();
    renderTrackView();
    updateTabCounts();
}


/**
 * Real-time ROI Calculator for the form
 */
function updateRoiPreview() {
    const impactVal = document.getElementById('edit-impactLevel')?.value;
    const effortVal = document.getElementById('edit-effortLevel')?.value;
    const previewContainer = document.getElementById('roi-preview-container');

    if (!previewContainer) return;

    if (!impactVal || !effortVal) {
        previewContainer.innerHTML = '';
        return;
    }

    const impactValues = { low: 1, medium: 2, high: 3 };
    const effortValues = { low: 3, medium: 2, high: 1 };

    const impactNum = impactValues[impactVal];
    const effortNum = effortValues[effortVal];
    const score = Math.round((impactNum * effortNum) / 9 * 100);

    let label = 'Medium ROI';
    let color = 'bg-amber-50 text-amber-700 border-amber-200';
    if (score >= 80) {
        label = 'High ROI (Quick Win)';
        color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (score < 40) {
        label = 'Low ROI (Time Sink)';
        color = 'bg-slate-50 text-slate-500 border-slate-200';
    }

    previewContainer.innerHTML = `
        <div class="flex items-center justify-between p-2 rounded-lg border ${color} transition-all animate-in fade-in zoom-in duration-300">
            <span class="text-[10px] font-black uppercase tracking-wider">Calculated Priority</span>
            <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold">${label}</span>
                <span class="text-xs font-black px-1.5 py-0.5 rounded bg-white/50 border border-current/20">${score}</span>
            </div>
        </div>
    `;
}

function openMetadataEdit() {
    const meta = UPDATE_DATA.metadata;
    editContext = { type: 'metadata' };

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">⚙️</span>
            <span class="font-black tracking-tight">Edit Project DNA & Metadata</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- System Banner -->
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Lifecycle Stage: System Configuration</div>
            <div class="stage-desc">Manage the global identifiers and metadata that drive the dashboard's filtering and alignment.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Dashboard Identifier</label>
                <input type="text" id="edit-meta-title" value="${meta.title}" class="cms-input shadow-sm focus:shadow-md">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Cycle / Quarter</label>
                    <input type="text" id="edit-meta-dateRange" value="${meta.dateRange}" class="cms-input shadow-sm focus:shadow-md">
                </div>
                <div>
                    <label class="cms-label">Review Cadence</label>
                    <input type="text" id="edit-meta-nextReview" value="${meta.nextReview || ''}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. April 15">
                </div>
            </div>
            <div>
                <label class="cms-label">Dashboard Vision Statement</label>
                <textarea id="edit-meta-description" class="cms-input shadow-sm focus:shadow-md" rows="2">${meta.description}</textarea>
            </div>
            <div>
                <label class="cms-label">Engineering Lifecycle States (JSON)</label>
                <div class="border border-slate-200 rounded-lg overflow-hidden focus-within:border-indigo-400 transition-colors">
                    <textarea id="edit-meta-customStatuses" class="cms-input font-mono text-xs p-4 !border-none !rounded-none focus:!shadow-none bg-slate-50" rows="8">${JSON.stringify(meta.customStatuses || [], null, 2)}</textarea>
                </div>
                <p class="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <span class="w-2.5 h-2.5 rounded-full bg-slate-100 flex items-center justify-center text-[8px]">!</span>
                    Format: [{"id":"status_id", "label":"Label", "class":"css_class", "bucket":"status_bucket"}]
                </p>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> Save Metadata
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}


// DELETED DUPLICATE openSubtrackEdit, deleteSubtrack, logoutAll here.
// Unique functions follow:

function updateMoveSubtrackOpts(ti) {
    const subSel = document.getElementById('edit-move-subtrack');
    if (!subSel) return;
    subSel.innerHTML = UPDATE_DATA.tracks[parseInt(ti)].subtracks.map((s, si) =>
        `<option value="${si}">${s.name}</option>`
    ).join('');
}

async function saveToGithub() {
    const btn = document.getElementById('save-to-github-btn');
    const token = localStorage.getItem('gh_pat');
    if (!token) { alert('Unauthorized'); return; }

    btn.disabled = true; btn.innerText = 'Saving...';
    try {
        const getRes = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        const fileData = await getRes.json();

        const putRes = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'CMS: Update dashboard data',
                content: btoa(unescape(encodeURIComponent(JSON.stringify(UPDATE_DATA, null, 4)))),
                sha: fileData.sha
            })
        });
        if (putRes.ok) { alert('Saved successfully!'); location.reload(); }
        else throw new Error('GitHub push failed');
    } catch (e) {
        alert('Save error: ' + e.message);
        btn.disabled = false; btn.innerText = 'Save to GitHub';
    }
}

// ------ COMMENTS ------
function toggleComments(ti, si, ii, itemId, viewPrefix = 'main') {
    const data = itemId ? findItemById(itemId) : { item: UPDATE_DATA.tracks[ti].subtracks[si].items[ii] };
    if (!data) return;
    
    const id = `${viewPrefix}-comments-${data.item.id}`;
    const el = document.getElementById(id);
    if (!el) return;
    
    const isNowVisible = el.classList.toggle('hidden') === false;
    
    // 🏆 Phase 29: Track open state to survive silent re-renders
    if (isNowVisible) {
        window.uiState.openComments.add(data.item.id);
    } else {
        window.uiState.openComments.delete(data.item.id);
    }
}

function addComment(ti, si, ii, itemId, viewPrefix = 'main') {
    // 🏆 Phase 31: Use Universal Resolver for absolute ID-first matching
    const data = getValidatedItemContext(itemId || { trackIndex: ti, subtrackIndex: si, itemIndex: ii });
    if (!data) {
        console.error('❌ addComment: Item context not found', { ti, si, ii, itemId });
        return;
    }
    
    const inputId = `${viewPrefix}-comment-input-${data.item.id}`;
    const input = document.getElementById(inputId);
    if (!input || !input.value.trim()) return;
    
    if (!data.item.comments) data.item.comments = [];
    data.item.comments.push({ 
        id: `c-${Date.now()}`, 
        text: input.value.trim(), 
        author: 'PM', 
        timestamp: new Date().toISOString() 
    });
    
    input.value = '';
    saveToLocalStorage();
    
    // Phase 29: Smart re-render (maintains open state)
    renderDashboard(); 
}

function deleteComment(ti, si, ii, cid, itemId, viewPrefix = 'main') {
    // 🏆 Phase 31: Use Universal Resolver for absolute ID-first matching
    const data = getValidatedItemContext(itemId || { trackIndex: ti, subtrackIndex: si, itemIndex: ii });
    if (!data) return;
    
    data.item.comments = (data.item.comments || []).filter(c => c.id !== cid);
    
    saveToLocalStorage();
    
    // Phase 29: Smart re-render (maintains open state)
    renderDashboard(); 
}

function deleteItem(ti_ignored, si_ignored, ii_ignored, itemId, viewPrefix) {
    const data = getValidatedItemContext(itemId);
    if (!data) return;

    // Prevent background refreshes from killing the modal
    window.isActionLockActive = true;
    window.uiState.isDirty = false; // Disarm unsaved-changes guard before any confirm dialog

    // Decouple from event loop to prevent instant closure
    setTimeout(() => {
        const confirmResult = confirm(`Delete task: "${data.item.text}"?`);
        if (!confirmResult) { window.isActionLockActive = false; return; }

        UPDATE_DATA.tracks[data.ti].subtracks[data.si].items.splice(data.ii, 1);
        logChange('Delete Item', data.item.text);

        closeCmsModal();
        saveToLocalStorage();
        
        // Final refresh
        if (viewPrefix) {
            renderDashboard();
            switchView(viewPrefix);
        } else {
            const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
            switchView(currentView);
        }
        updateTabCounts();
        
        // Release the lock
        window.isActionLockActive = false;
    }, 0);
}

function sendToBacklog(ti_ignored, si_ignored, ii_ignored, itemId, viewPrefix) {
    const data = getValidatedItemContext(itemId);
    if (!data) return;

    window.isActionLockActive = true;
    setTimeout(() => {
        const track = UPDATE_DATA.tracks[data.ti];
        let bIdx = track.subtracks.findIndex(s => s.name === 'Backlog');
        if (bIdx === -1) { track.subtracks.push({ name: 'Backlog', items: [] }); bIdx = track.subtracks.length - 1; }
        const [item] = track.subtracks[data.si].items.splice(data.ii, 1);
        track.subtracks[bIdx].items.push(item);
        logChange('Move to Backlog', item.text);
        
        saveToLocalStorage();
        
        // Force full view reflection
        renderDashboard(); 
        if (viewPrefix) {
            switchView(viewPrefix);
        } else {
            const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
            switchView(currentView);
        }
        
        updateTabCounts();
        window.isActionLockActive = false;
    }, 0);
}

function toggleBlocker(ti_ignored, si_ignored, ii_ignored, itemId, viewPrefix) {
    const data = getValidatedItemContext(itemId);
    if (!data) return;

    window.isActionLockActive = true;
    setTimeout(() => {
        if (data.item.blocker) { 
            delete data.item.blocker; 
            delete data.item.blockerNote; 
            logChange('Unblock Item', data.item.text); 
        } else { 
            const note = prompt('Blocker reason:', '') || ''; 
            if (!note) { 
                window.isActionLockActive = false; 
                return; 
            } 
            data.item.blocker = true; 
            data.item.blockerNote = note; 
            logChange('Flag Blocker', data.item.text); 
        }

        saveToLocalStorage();
        
        // Force full view reflection
        renderDashboard(); 
        if (viewPrefix) {
            switchView(viewPrefix);
        } else {
            const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
            switchView(currentView);
        }
        
        if (typeof renderBlockerStrip === 'function') renderBlockerStrip();
        
        // Ensure lock is released after all state-changing rendering is complete
        window.isActionLockActive = false;
    }, 0);
}

// ------ ARCHIVE MANAGEMENT ------
async function initArchiveFilter() {
    const dates = new Set();
    let hasLegacy = false;

    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.publishedDate) {
                    const date = new Date(item.publishedDate);
                    const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                    dates.add(monthYear);
                } else {
                    hasLegacy = true;
                }
            });
        });
    });

    const container = document.getElementById('archive-filter');
    if (!container) return;

    let html = '<div class="flex flex-wrap gap-2 items-center">';
    html += '<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filters:</span>';
    html += '<button onclick="filterByDate(\'all\')" class="archive-btn active">All Entries</button>';

    if (hasLegacy) {
        html += '<button onclick="filterByDate(\'Legacy\')" class="archive-btn">Legacy</button>';
    }

    Array.from(dates).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
        html += `<button onclick="filterByDate('${date}')" class="archive-btn">${date}</button>`;
    });
    html += '</div>';

    // Add Physical Archives Section
    try {
        const response = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/archive`);
        if (response.ok) {
            const files = await response.json();
            const archives = files.filter(f => f.name.endsWith('.json'));

            if (archives.length > 0) {
                html += '<div class="flex flex-wrap gap-2 items-center mt-4 pt-4 border-t border-slate-100 w-full">';
                html += '<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Snapshots:</span>';

                if (window.loadingArchive) {
                    html += `<button onclick="window.location.search=''" class="archive-btn bg-slate-900 text-white p-2 text-[10px] rounded">Live</button>`;
                }

                archives.sort((a, b) => b.name.localeCompare(a.name)).forEach(file => {
                    let displayName = file.name.replace('.json', '').replace(/-/g, ' ').trim();
                    const isActive = window.loadingArchive && window.loadingArchive.includes(file.name);
                    const activeClass = isActive ? 'ring-2 ring-indigo-500' : '';
                    html += `<button onclick="loadArchive('${file.name}')" class="archive-btn ${activeClass} bg-indigo-50 text-indigo-700 p-2 text-[10px] rounded uppercase font-bold">${displayName}</button>`;
                });
                html += '</div>';
            }
        }
    } catch (e) { }
    container.innerHTML = html;
}

function filterByDate(dateRange) {
    window.currentDateFilter = dateRange;
    document.querySelectorAll('.archive-btn').forEach(btn => btn.classList.toggle('active', btn.innerText === dateRange || (dateRange === 'all' && btn.innerText === 'All Entries')));
    const cv = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    if (cv === 'track') renderTrackView();
    else if (cv === 'status') renderStatusView();
    else if (cv === 'priority') renderPriorityView();
    else if (cv === 'contributor') renderContributorView();
}

async function archiveAndClear() {
    // Count in-progress items that are NOT done and NOT already in next/later
    let inProgressItems = []
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(sub => {
            sub.items.forEach(item => {
                if (['now', 'qa', 'review'].includes(item.status)) {
                    inProgressItems.push({ item, sub })
                }
            })
        })
    })

    let rollbackInProgress = false
    if (inProgressItems.length > 0) {
        const msg = `ARCHIVE & CLEAR DASHBOARD?\n\n⚠️ ${inProgressItems.length} item(s) are still in progress (now/qa/review) and will NOT be cleared.\n\nThey will remain in the data as-is. Optionally, roll them back to "next" so they show up in the next sprint.\n\nOptions:\n• OK = Archive & keep in-progress items as-is\n• Cancel = Stop and manually handle these items first\n\nPress OK to continue (or Cancel to abort).`
        if (!confirm(msg)) return
    } else {
        if (!confirm('ARCHIVE & CLEAR DASHBOARD? This will save all current data to a timestamped JSON file in /archive and clear all done items.')) return
    }

    const btn = document.getElementById('archive-btn');
    const token = localStorage.getItem('gh_pat');
    if (!token) { alert('Unauthorized'); return; }

    btn.disabled = true; btn.innerText = 'Archiving...';
    try {
        // 1. Generate archive data
        const archiveContent = JSON.stringify(UPDATE_DATA, null, 4);
        const fileName = `archive_${new Date().toISOString().split('T')[0]}.json`;

        // 2. Put to Archive folder
        await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/archive/${fileName}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Archive: ${UPDATE_DATA.metadata.dateRange}`,
                content: btoa(unescape(encodeURIComponent(archiveContent)))
            })
        });

        // 3. Clear done items; keep everything else (now/qa/review/next/later/blocked/onhold)
        UPDATE_DATA.tracks.forEach(track => {
            track.subtracks.forEach(sub => {
                sub.items = sub.items.filter(item => item.status !== 'done');
            });
        });

        // 4. Update Main Data
        const getRes = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        const fileData = await getRes.json();

        await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'CMS: post-archive data reset',
                content: btoa(unescape(encodeURIComponent(JSON.stringify(UPDATE_DATA, null, 4)))),
                sha: fileData.sha
            })
        });

        // 5. Hard-Sync Local Browser State
        saveToLocalStorage();
        
        alert('Archive successful!');
        location.reload();
    } catch (e) {
        alert('Archive error: ' + e.message);
        btn.disabled = false; btn.innerText = 'Archive & Clear';
    }
}

async function loadArchive(fileName) {
    window.location.search = `?archive=archive/${fileName}`;
}

// ------ CMS ROUTING ------
function saveCms() {
    if (!editContext) return;

    // Capture pre-save state for handoff toast
    let prevStatus = null
    let newStatus = null
    if (editContext.type === 'item') {
        const oldItem = UPDATE_DATA.tracks[editContext.trackIndex]?.subtracks[editContext.subtrackIndex]?.items[editContext.itemIndex]
        prevStatus = oldItem?.status || null
    }
    // Read new status & sprintId before modal closes
    newStatus = document.getElementById('edit-status')?.value || null
    const newSprintId = document.getElementById('edit-sprintId')?.value || null
    const isNew = editContext.type === 'item-new'
    const ctxType = editContext.type

    saveCmsChanges()

    // Handoff toasts — guide the user on what to do next
    if (typeof showHandoffToast === 'function') {
        if (ctxType === 'item' && newStatus === 'done' && prevStatus !== 'done') {
            showHandoffToast('Marked Done ✓ — ship it to a release so it counts in your metrics', 'Ship to Release →', () => switchView('releases'))
        } else if (ctxType === 'item' && newStatus === 'blocked' && prevStatus !== 'blocked') {
            showHandoffToast('Blocker flagged 🛑 — PM should resolve before next standup', 'View Track →', () => switchView('track'))
        } else if (isNew) {
            if (newSprintId) {
                showHandoffToast('Task created & added to sprint ✓', 'View Sprint →', () => switchView('sprint'))
            } else {
                showHandoffToast('Task created ✓ — groom it in the backlog before sprint planning', 'Go to Backlog →', () => switchView('backlog'))
            }
        } else if (ctxType === 'sprint') {
            showHandoffToast('Sprint saved ✓ — pull tasks from Backlog to commit the scope', 'Go to Backlog →', () => switchView('backlog'))
        } else if (ctxType === 'release') {
            showHandoffToast('Release saved ✓ — ship done tasks into it', 'View Releases →', () => switchView('releases'))
        } else if (ctxType === 'okr') {
            showHandoffToast('OKR saved ✓ — create Epics to deliver each Key Result', 'Go to Epics →', () => switchView('epics'))
        } else if (ctxType === 'epic') {
            showHandoffToast('Epic saved ✓ — break it into tasks in the Backlog', 'Go to Backlog →', () => switchView('backlog'))
        }
    }
}

function deleteEpic(idx) {
    const epic = UPDATE_DATA.metadata.epics[idx];
    if (!confirm(`Delete strategic epic "${epic.name}"? This will not delete tasks, but they will be unlinked from this epic.`)) return;

    // Clear epicId from all items that were linked to this epic
    const epicId = epic.id;
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.epicId === epicId) delete item.epicId;
            });
        });
    });

    UPDATE_DATA.metadata.epics.splice(idx, 1);
    logChange('Delete Epic', epic.name);
    switchView('epics');
    updateTabCounts();
}

// ========================================
// OKR MANAGEMENT FUNCTIONS
// ========================================

function openOKREdit(okrIndex) {
    const okr = okrIndex !== undefined ? UPDATE_DATA.metadata.okrs[okrIndex] : {
        quarter: '',
        objective: '',
        owner: '',
        keyResults: []
    };
    const okrId = okrIndex !== undefined ? okr.id : undefined;
    editContext = { type: 'okr', okrIndex, okrId };

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🎯</span>
            <span class="font-black tracking-tight">${okrId ? 'Edit Strategic OKR' : 'Create New OKR'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Strategic Stage Banner -->
        <div class="lifecycle-banner strategic">
            <div class="stage-tag">Lifecycle Stage: Strategic Vision</div>
            <div class="stage-desc">Define high-level objectives for the quarter to align technical delivery with business outcomes.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Cyclical Quarter</label>
                <input type="text" id="edit-okr-quarter" value="${okr.quarter}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Q1 2026">
            </div>

            <div>
                <label class="cms-label">Primary Strategic Objective</label>
                <textarea id="edit-okr-objective" class="cms-input shadow-sm focus:shadow-md" rows="2" placeholder="What mission-critical objective are we targeting?">${okr.objective}</textarea>
            </div>

            <div>
                <label class="cms-label">Accountable Owner / Team</label>
                <input type="text" id="edit-okr-owner" value="${okr.owner}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Architecture Team">
            </div>
        </div>

        <div class="mt-8 pt-6 border-t border-slate-200">
            <div class="flex justify-between items-center mb-4">
                <label class="cms-label !mb-0">Key Results (Execution Metrics)</label>
                <button type="button" onclick="addKeyResult()" class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 rounded-lg transition-all">
                    + Add Key Result
                </button>
            </div>
            <div id="key-results-container" class="space-y-4">
                ${(okr.keyResults || []).map((kr, idx) => renderKeyResultForm(kr, idx)).join('')}
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${okrId ? `
            <button onclick="deleteOKR(${okrIndex})" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete OKR
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${okrId ? 'Save Changes' : 'Create OKR'}
        </button>
    `;

    // Activate modal with background lock
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Store key results in global state for manipulation
    window._editingKeyResults = okr.keyResults || [];
}

function renderKeyResultForm(kr, idx) {
    const epics = UPDATE_DATA.metadata.epics || [];
    return `
        <div class="cms-card" data-kr-index="${idx}">
            <div class="flex justify-between items-start mb-4">
                <div class="flex flex-col">
                    <span class="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Execution Metric</span>
                    <span class="text-xs font-bold text-slate-800 uppercase tracking-widest">Key Result ${idx + 1}</span>
                </div>
                <button type="button" onclick="removeKeyResult(${idx})" class="text-[9px] font-black text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-rose-500 px-2.5 py-1.5 rounded-lg transition-all uppercase tracking-widest">
                    Remove
                </button>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="cms-label !text-[9px]">Success Metric Descriptor</label>
                    <input type="text" class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" placeholder="e.g. Reduce latent performance by 15%..."
                           value="${kr.description || ''}" data-kr-field="description" data-kr-idx="${idx}">
                </div>

                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label class="cms-label !text-[9px]">Target</label>
                        <input type="number" class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" placeholder="100"
                               value="${kr.target || ''}" data-kr-field="target" data-kr-idx="${idx}">
                    </div>
                    <div>
                        <label class="cms-label !text-[9px]">Current</label>
                        <input type="number" class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" placeholder="75"
                               value="${kr.current || 0}" data-kr-field="current" data-kr-idx="${idx}">
                    </div>
                    <div>
                        <label class="cms-label !text-[9px]">Unit</label>
                        <input type="text" class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" placeholder="%"
                               value="${kr.unit || ''}" data-kr-field="unit" data-kr-idx="${idx}">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="cms-label !text-[9px]">Strategic Drift</label>
                        <select class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" data-kr-field="status" data-kr-idx="${idx}">
                            <option value="on-track" ${kr.status === 'on-track' ? 'selected' : ''}>🟢 On-Track</option>
                            <option value="at-risk" ${kr.status === 'at-risk' ? 'selected' : ''}>🟡 At-Risk</option>
                            <option value="behind" ${kr.status === 'behind' ? 'selected' : ''}>🔴 Behind</option>
                            <option value="achieved" ${kr.status === 'achieved' ? 'selected' : ''}>🏆 Achieved</option>
                        </select>
                    </div>
                    <div>
                        <label class="cms-label !text-[9px]">Linked Execution Source</label>
                        <select class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" data-kr-field="linkedEpic" data-kr-idx="${idx}">
                            <option value="">None (Unlinked)</option>
                            ${epics.map(e => `<option value="${e.id}" ${kr.linkedEpic === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function addKeyResult() {
    const container = document.getElementById('key-results-container');
    if (!container) return;

    const idx = (window._editingKeyResults || []).length;

    const newKR = {
        id: `kr-${Date.now()}`,
        description: '',
        target: 100,
        current: 0,
        unit: '%',
        status: 'on-track',
        linkedEpic: ''
    };

    if (!window._editingKeyResults) window._editingKeyResults = [];
    window._editingKeyResults.push(newKR);

    // Use insertAdjacentHTML to preserve existing input values
    container.insertAdjacentHTML('beforeend', renderKeyResultForm(newKR, idx));
}

function removeKeyResult(idx) {
    // 1. Sync current UI state back to window._editingKeyResults before removing
    harvestKeyResultsToState();

    // 2. Remove from state
    window._editingKeyResults.splice(idx, 1);

    // 3. Re-render the container to update indices
    const container = document.getElementById('key-results-container');
    if (container) {
        container.innerHTML = window._editingKeyResults.map((kr, i) => renderKeyResultForm(kr, i)).join('');
    }
}

/**
 * Harvests all OKR key result inputs from the DOM into window._editingKeyResults
 * This is used to ensure state is preserved before destructive re-renders (like removal)
 */
function harvestKeyResultsToState() {
    const krFields = document.querySelectorAll('[data-kr-field]');
    if (!window._editingKeyResults) window._editingKeyResults = [];

    krFields.forEach(field => {
        const idx = parseInt(field.getAttribute('data-kr-idx'));
        const fieldName = field.getAttribute('data-kr-field');
        if (window._editingKeyResults[idx]) {
            let val = field.value;
            if (fieldName === 'target' || fieldName === 'current') val = parseFloat(val) || 0;
            window._editingKeyResults[idx][fieldName] = val;
        }
    });
}

function deleteOKR(okrIndex) {
    const okr = UPDATE_DATA.metadata.okrs[okrIndex];
    if (!confirm(`Delete OKR "${okr.objective}"? This will not delete tasks or epics, but they will be unlinked from this OKR.`)) return;

    // Clear linkedOKR from epics
    const okrId = okr.id;
    if (UPDATE_DATA.metadata.epics) {
        UPDATE_DATA.metadata.epics.forEach(epic => {
            if (epic.linkedOKR === okrId) delete epic.linkedOKR;
        });
    }

    UPDATE_DATA.metadata.okrs.splice(okrIndex, 1);
    logChange('Delete OKR', okr.objective);
    switchView('okr');
    updateTabCounts();
}

function deleteSprint(sprintId) {
    const sprint = UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId);
    if (!confirm(`Delete sprint "${sprint.name}"? This will not delete tasks, but they will be unlinked from this sprint.`)) return;

    // Clear sprintId from items
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.sprintId === sprintId) delete item.sprintId;
            });
        });
    });

    const idx = UPDATE_DATA.metadata.sprints.findIndex(s => s.id === sprintId);
    UPDATE_DATA.metadata.sprints.splice(idx, 1);
    logChange('Delete Sprint', sprint.name);
    switchView('sprint');
    updateTabCounts();
}

function deleteRelease(releaseId) {
    const release = UPDATE_DATA.metadata.releases.find(r => r.id === releaseId);
    if (!confirm(`Delete release "${release.name}"? This will not delete tasks, but they will be unlinked from this release.`)) return;

    // Clear releasedIn from items
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.releasedIn === releaseId) delete item.releasedIn;
            });
        });
    });

    const idx = UPDATE_DATA.metadata.releases.findIndex(r => r.id === releaseId);
    UPDATE_DATA.metadata.releases.splice(idx, 1);
    logChange('Delete Release', release.name);
    switchView('releases');
    updateTabCounts();
}

function deleteRoadmap(id) {
    const horizon = UPDATE_DATA.metadata.roadmap.find(r => r.id === id);
    if (!confirm(`Delete roadmap category "${horizon.label}"? Tasks will remain but will be unassigned from this horizon.`)) return;

    // Clear planningHorizon from items
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.planningHorizon === id) delete item.planningHorizon;
            });
        });
    });

    const idx = UPDATE_DATA.metadata.roadmap.findIndex(r => r.id === id);
    UPDATE_DATA.metadata.roadmap.splice(idx, 1);
    logChange('Delete Roadmap', horizon.label);
    switchView('roadmap');
}

// System logout
function logoutAll() {
    localStorage.removeItem('gh_pat');
    localStorage.removeItem('khyaal_site_auth');
    localStorage.removeItem('GITHUB_CMS_TOKEN');
    location.reload();
}

// Toggle Epic Backlog Persistence
function toggleEpicBacklog(epicId, isOpen) {
    if (isOpen) {
        window.uiState.openEpics.add(epicId);
    } else {
        window.uiState.openEpics.delete(epicId);
    }
}

/**
 * Silent Data Persistence
 * Persists data to LocalStorage without refreshing the page.
 */
function saveToLocalStorage() {
    if (!UPDATE_DATA) return;
    localStorage.setItem('khyaal_data', JSON.stringify(UPDATE_DATA));
    console.log('✅ Changes persisted silently to LocalStorage');
}
