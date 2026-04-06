// app.js - Dashboard Entry Point & Data Orchestrator

// ------ DATA NORMALIZATION ------
function normalizeData() {
    if (!UPDATE_DATA) return;

    // 1. Populate Global Team Filter if it exists
    const filterEl = document.getElementById('global-team-filter');
    if (filterEl && !filterEl.dataset.populated) {
        const teams = Array.from(new Set(UPDATE_DATA.tracks.filter(tr => tr.name).map(tr => tr.name)));
        if (teams.length > 0) {
            const currentVal = filterEl.value;
            filterEl.innerHTML = '<option value="">🌍 All Tracks</option>' + teams.map(n => `<option value="${n}" ${n === currentVal ? 'selected' : ''}>${n}</option>`).join('');
            filterEl.dataset.populated = "true";
        }
    }

    // 2. Load Custom Statuses into Global Config
    if (UPDATE_DATA.metadata && UPDATE_DATA.metadata.customStatuses) {
        UPDATE_DATA.metadata.customStatuses.forEach(cs => {
            statusConfig[cs.id] = { label: cs.label, class: cs.class, bucket: cs.bucket };
        });
    }

    // 3. Ensure every item has a unique ID and common fields
    UPDATE_DATA.tracks.forEach((track, trackIndex) => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach((item, index) => {
                // Ensure unique ID
                if (!item.id) {
                    const safeTrackId = (track.id || track.name || 'track').toLowerCase().replace(/\s/g, '');
                    const safeSubtrackName = (subtrack.name || 'sub').toLowerCase().replace(/\s/g, '-');
                    item.id = `${safeTrackId}-${safeSubtrackName}-${index}`;
                }

                // Clean up default dates for next/later if they are from a previous session's template
                if (['next', 'later'].includes(item.status)) {
                    if (item.startDate === '2026-03-20') delete item.startDate;
                    if (item.due === '2026-03-27') delete item.due;
                }

                // Auto-assign today's date if missing for active tasks
                if (item.status === 'now') {
                    if (!item.startDate) item.startDate = new Date().toISOString().split('T')[0];
                }
            });
        });
    });
}

/**
 * Universal Dashboard Orchestrator
 * Performs a silent, global refresh of all UI modules to match current UPDATE_DATA.
 * Names aligned with core.js switchView mapping.
 */
function renderDashboard() {
    console.log('🔄 renderDashboard() triggered - Synchronizing all views...');
    
    // 1. Refresh global metadata displays
    syncMetadataToUI();
    
    // 2. Re-normalize data structures (IDs, dates, counts)
    normalizeData();
    
    // 3. Trigger all primary view renders with Error Shielding (Phase 34)
    const runSafe = (fn, name) => {
        if (typeof fn === 'function') {
            try { fn(); } catch (e) { console.error(`❌ Render error in ${name}:`, e); }
        }
    };

    runSafe(renderWorkflowView, 'Workflow');
    runSafe(renderDiscoveryView, 'Discovery');
    runSafe(renderTrackView, 'Track');
    runSafe(renderContributorView, 'Contributor');
    runSafe(renderStatusView, 'Status');
    runSafe(renderPriorityView, 'Priority');
    runSafe(renderDependencyView, 'Dependency');
    runSafe(renderGanttView, 'Gantt');
    runSafe(renderSprintView, 'Sprint');
    runSafe(renderReleasesView, 'Releases');
    runSafe(renderRoadmapView, 'Roadmap');
    runSafe(renderOkrView, 'OKR');
    runSafe(renderEpicsView, 'Epics');
    runSafe(renderBacklogView, 'Backlog');
    runSafe(renderKanbanView, 'Kanban');
    runSafe(renderAnalyticsView, 'Analytics');
    runSafe(renderCapacityView, 'Capacity');
    runSafe(renderMyTasksView, 'MyTasks');
    runSafe(renderExecutiveDashboard, 'ExecutiveDashboard');
    
    // 4. Update cross-view indicators
    if (typeof updateTabCounts === 'function') updateTabCounts();
    if (typeof updateBacklogBadge === 'function') updateBacklogBadge();
    if (typeof renderBlockerStrip === 'function') renderBlockerStrip();
    if (typeof buildTagFilterBar === 'function') buildTagFilterBar();
}

// ------ CORE APP INITIALIZATION ------
// This is called by index.html after a successful basic auth login
function initDashboard() {
    console.log('🚀 initDashboard() called');
    console.log('📊 UPDATE_DATA:', UPDATE_DATA);

    if (!UPDATE_DATA) {
        console.error('❌ UPDATE_DATA is null or undefined');
        return;
    }

    // 🏆 Phase 35: Immediate State Allocation
    // Ensure global UI state is available before ANY sub-initialization or render
    if (!window.uiState) window.uiState = { openEpics: new Set(), openComments: new Set() };
    if (!window.uiState.openComments) window.uiState.openComments = new Set();
    if (!window.uiState.openEpics) window.uiState.openEpics = new Set();

    // Initial setup
    syncMetadataToUI();
    normalizeData();
    buildContributorList(); // from core.js
    setupKeyboardShortcuts(); // from core.js
    initCms(); // from cms.js

    if (typeof initModeSystem === 'function') initModeSystem(); // from modes.js
    if (typeof initWizard === 'function') initWizard(); // from wizard.js
    if (typeof initWorkflowNav === 'function') initWorkflowNav(); // from workflow-nav.js

    // Initial view set
    const mode = getCurrentMode();
    const defaultView = mode === 'pm' ? 'okr' : mode === 'dev' ? 'my-tasks' : mode === 'exec' ? 'dashboard' : 'okr';
    
    // Perform initial render loop
    switchView(defaultView);
    renderDashboard();

    // Lifecycle Guide: init breadcrumb + current view tracking
    window.currentActiveView = defaultView;
    if (typeof renderLifecycleBreadcrumb === 'function') {
        setTimeout(() => renderLifecycleBreadcrumb(defaultView), 150);
    }


    console.log('✅ Dashboard initialization complete');
}

function syncMetadataToUI() {
    const meta = UPDATE_DATA.metadata;
    if (!meta) return;

    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = meta.title;

    const dateEl = document.getElementById('page-date');
    if (dateEl) dateEl.textContent = meta.dateRange;

    const descEl = document.getElementById('page-desc');
    if (descEl) descEl.textContent = meta.description;

    const footerEl = document.getElementById('footer-text');
    if (footerEl) footerEl.textContent = `${meta.title} • ${meta.dateRange}`;

    if (meta.nextReview) {
        const footerNext = document.getElementById('footer-next');
        if (footerNext) footerNext.textContent = `Next Review: ${meta.nextReview}`;
    }
}

// Helper: Update backlog badge (needed for initial load)
function updateBacklogBadge() {
    let count = 0;
    UPDATE_DATA.tracks.forEach(t => {
        const bl = t.subtracks.find(s => s.name === 'Backlog');
        if (bl) count += bl.items.length;
    });
    const badge = document.getElementById('backlog-tab-badge');
    if (badge) {
        badge.textContent = count > 0 ? count : '';
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
}

// ------ DATE FILTERS (Extended) ------
function applyDatePreset(preset) {
    if (!window.UPDATE_DATA) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // This logic is mostly for reporting views
    renderDashboard();
}