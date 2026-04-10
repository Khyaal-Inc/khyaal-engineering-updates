// UPDATE_DATA is global, provided by index.html initialization

// Multi-project state — 'default' maps to the legacy data.json file
window.ACTIVE_PROJECT_ID = window.ACTIVE_PROJECT_ID || 'default'

// Restore team registry from localStorage cache (survives reload before GitHub save)
const _cachedRegistry = (() => {
    try { return JSON.parse(localStorage.getItem('khyaal_registry') || 'null') } catch { return null }
})()
window.PROJECT_REGISTRY = window.PROJECT_REGISTRY || _cachedRegistry || [
    { id: 'default', name: 'Khyaal Engineering', filePath: 'data.json' }
]

// Active sub-project within the current team's data.json
window.ACTIVE_SUBPROJECT_ID = window.ACTIVE_SUBPROJECT_ID || null

// Returns the selected project ID from #project-filter
function getActiveProject() {
    return document.getElementById('project-filter')?.value || null
}

// Returns the selected track name from #global-team-filter
function getActiveTrack() {
    return document.getElementById('global-team-filter')?.value || null
}

// Returns the tracks for the currently selected project (or all tracks if no project selected)
// Views use this instead of UPDATE_DATA.tracks so they respect the project filter.
// NOTE: UPDATE_DATA.tracks is always kept in sync with the active project's tracks by
// normalizeData(), so CMS edit code can continue to use UPDATE_DATA.tracks directly.
function getActiveTracks() {
    const projects = window.UPDATE_DATA?.projects || []
    if (!projects.length) return window.UPDATE_DATA?.tracks || []
    const activeProj = getActiveProject()
    if (activeProj) {
        const proj = projects.find(p => p.id === activeProj)
        return proj?.tracks || []
    }
    // No project filter — flatten all projects' tracks
    return projects.flatMap(p => p.tracks || [])
}

function switchProject(projectId) {
    if (window.ACTIVE_PROJECT_ID === projectId) return
    window.ACTIVE_PROJECT_ID = projectId
    window.ACTIVE_SUBPROJECT_ID = null
    const project = window.PROJECT_REGISTRY.find(p => p.id === projectId)
    if (project && typeof CMS_CONFIG !== 'undefined') {
        CMS_CONFIG.filePath = project.filePath
    }
    const cacheKey = `khyaal_data_${projectId}`
    localStorage.removeItem(cacheKey)
    window.UPDATE_DATA = null
    // Enforce max-mode from grant — auto-switch persona to the ceiling for this project
    if (window.CURRENT_USER) {
        const grant = (window.CURRENT_USER.grants || []).find(g => g.projectId === projectId)
        if (grant && typeof switchMode === 'function') {
            switchMode(grant.mode, true)  // stayInModal=true: switch mode without switching view
        }
    }
    if (typeof showToast === 'function') showToast(`Switching to ${project?.name || projectId}…`, 'info')
    if (typeof initDashboard === 'function') initDashboard()
}

// Called when the project filter (#project-filter) changes
function onProjectFilterChange() {
    window.ACTIVE_SUBPROJECT_ID = document.getElementById('project-filter')?.value || null
    // Reset track filter so it repopulates from the new project's tracks
    const filterEl = document.getElementById('global-team-filter')
    if (filterEl) { filterEl.dataset.populated = ''; filterEl.value = '' }
    if (typeof normalizeData === 'function') normalizeData()
    if (typeof renderDashboard === 'function') renderDashboard()
}
window.onProjectFilterChange = onProjectFilterChange

let globalSearchQuery = '';
let isAuthenticated = false; // Will be set by auth logic

// Contributor color mapping
const contributorColors = {
    "Subhrajit": "bg-indigo-100 text-indigo-800 border border-indigo-200",
    "Vivek": "bg-blue-100 text-blue-800 border border-blue-200",
    "Manish": "bg-purple-100 text-purple-800 border border-purple-200",
    "Raj": "bg-slate-100 text-slate-800 border border-slate-200",
    "Nikhil": "bg-teal-100 text-teal-800 border border-teal-200",
    "Rushikesh": "bg-pink-100 text-pink-800 border border-pink-200",
    "External": "bg-gray-100 text-gray-600 border border-gray-200"
};

const themeColors = {
    blue: '#1e40af',      // Stronger Blue for accessibility
    emerald: '#065f46',   // Stronger Emerald
    violet: '#5b21b6',    // Stronger Violet
    amber: '#92400e',     // Stronger Amber
    rose: '#9f1239',      // Stronger Rose
    slate: '#334155'      // Stronger Slate
};

const statusConfig = {
    done:    { label: 'Done',    class: 'badge-done',    bucket: 'bucket-done' },
    now:     { label: 'Now',     class: 'badge-now',     bucket: 'bucket-now' },
    next:    { label: 'Next',    class: 'badge-next',    bucket: 'bucket-next' },
    later:   { label: 'Later',   class: 'badge-later',   bucket: 'bucket-later' },
    blocked: { label: 'Blocked', class: 'badge-blocked', bucket: 'bucket-blocked' },
    onhold:  { label: 'On Hold', class: 'badge-onhold',  bucket: 'bucket-onhold' },
    qa:      { label: 'QA',      class: 'badge-qa',      bucket: 'bucket-qa' },
    review:  { label: 'Review',  class: 'badge-review',  bucket: 'bucket-review' }
};

const priorityConfig = {
    high: { label: 'High', class: 'priority-high' },
    medium: { label: 'Medium', class: 'priority-medium' },
    low: { label: 'Low', class: 'priority-low' }
};

// ------ Helper: Highlight search matches in text ------
function highlightSearch(text) {
    if (!text) return text;
    // Parse @mentions
    let parsed = text.replace(/@([A-Za-z0-9_ -]+)/g, '<mark class="bg-blue-100 text-blue-800 font-bold px-1 rounded">@$1</mark>');
    if (!globalSearchQuery) return parsed;
    const escaped = globalSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return parsed.replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:#fef9c3;padding:0 1px;border-radius:2px;">$1</mark>');
}

// ------ Global Blocker Alert Strip ------
function renderBlockerStrip() {
    const strip = document.getElementById('global-blocker-strip');
    const headerBadge = document.getElementById('header-blocker-badge');
    if (!strip) return;

    let blockers = [];
    const activeTeam = getActiveTeam();

    UPDATE_DATA.tracks.forEach(track => {
        if (activeTeam && activeTeam !== track.name) return;
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.blocker) {
                    blockers.push({
                        id: item.id,
                        text: item.text,
                        note: item.blockerNote,
                        track: track.name,
                        subtrack: subtrack.name
                    });
                }
            });
        });
    });

    // Update Header Badge (Progressive Disclosure)
    if (headerBadge) {
        if (blockers.length > 0) {
            headerBadge.innerHTML = `
                <button onclick="document.getElementById('global-blocker-strip').classList.toggle('hidden')" 
                    class="flex items-center gap-1.5 px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all group"
                    title="${blockers.length} Active Blockers"
                >
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <span class="text-[10px] font-semibold text-red-700">${blockers.length}</span>
                </button>
            `;
        } else {
            headerBadge.innerHTML = '';
        }
    }

    if (blockers.length === 0) {
        strip.classList.add('hidden');
        strip.innerHTML = '';
        return;
    }

    // Keep the full strip hidden by default, only toggle via badge or if needed
    // strip.classList.remove('hidden'); 

    let html = `<div class="bg-red-50 p-4 rounded-2xl border border-red-200 shadow-xl animate-fadeInDown">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-semibold bg-red-600 text-white px-2.5 py-1 rounded-full">🚨 ${blockers.length} Active Blocker${blockers.length > 1 ? 's' : ''}</span>
                            <span class="text-xs text-red-800 font-medium">Action required to unblock progress</span>
                        </div>
                        <button onclick="document.getElementById('global-blocker-strip').classList.add('hidden')" class="text-red-400 hover:text-red-700">✕</button>
                    </div>
                    <div class="space-y-2">
                `;

    blockers.forEach(b => {
        html += `
            <div class="blocker-alert-item border-l-4 border-red-500 bg-white/50 p-3 rounded-r-xl shadow-sm">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex-1">
                        <div class="text-[10px] font-medium text-red-400 mb-1">${b.track} › ${b.subtrack}</div>
                        <div class="text-sm font-semibold text-red-900">${b.text}</div>
                        ${b.note ? `<div class="text-xs text-red-700 italic mt-1 bg-red-100/50 p-1.5 rounded-lg border border-red-100">• ${b.note}</div>` : ''}
                    </div>
                    ${b.id ? `<button onclick="resolveBlocker('${b.id}')" class="blocker-resolve-btn shrink-0">✅ Resolve</button>` : ''}
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    strip.innerHTML = html;
}

// ------ Search & Filters ------
// ------ SEARCH & FILTERS ------
function filterBySearch(q) {
    globalSearchQuery = q.toLowerCase().trim();
    const activeView = document.querySelector('.view-section.active')?.id.replace('-view', '');
    if (activeView) switchView(activeView);
}

function groomEpicTasks(epicId) {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) searchInput.value = epicId;
    globalSearchQuery = epicId.toLowerCase().trim();
    switchView('backlog');
}

function isItemInSearch(item) {
    if (!globalSearchQuery) return true;
    const q = globalSearchQuery;
    const text = (item.text || '').toLowerCase();
    const note = (item.note || '').toLowerCase();
    const usecase = (item.usecase || '').toLowerCase();
    const status = (item.status || '').toLowerCase();
    const priority = (item.priority || '').toLowerCase();
    const epicId = (item.epicId || '').toLowerCase();
    const sprint = (item.sprint || '').toLowerCase();
    const release = (item.releasedIn || '').toLowerCase();
    const contribs = (item.contributors || []).join(' ').toLowerCase();
    const tags = (item.tags || []).join(' ').toLowerCase();

    return text.includes(q) || note.includes(q) || usecase.includes(q) ||
        status.includes(q) || priority.includes(q) || contribs.includes(q) ||
        tags.includes(q) || epicId.includes(q) || sprint.includes(q) || release.includes(q);
}

function isItemInDateRange(item) {
    if (window.currentDateFilter && window.currentDateFilter !== 'all') {
        if (window.currentDateFilter === 'Legacy') {
            return !item.publishedDate;
        }
        // Month-Year format like "Mar 2026"
        const itemDate = item.publishedDate ? new Date(item.publishedDate) : null;
        if (!itemDate) return false;
        const monthYear = itemDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        return monthYear === window.currentDateFilter;
    }

    const preset = document.getElementById('date-range-preset')?.value || 'all';
    if (preset === 'all') return true;

    const itemDate = item.due ? new Date(item.due) : (item.startDate ? new Date(item.startDate) : null);
    if (!itemDate || isNaN(itemDate.getTime())) return preset === 'all';

    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (preset === 'today') return itemDate.toDateString() === today.toDateString();
    if (preset === 'this-week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return itemDate >= startOfWeek && itemDate <= endOfWeek;
    }
    if (preset === 'this-month') return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
    if (preset === 'custom') {
        const start = document.getElementById('filter-start-date').value;
        const end = document.getElementById('filter-end-date').value;
        if (!start || !end) return true;
        return itemDate >= new Date(start) && itemDate <= new Date(end);
    }
    return true;
}

function getActiveTeam() {
    return document.getElementById('global-team-filter')?.value || null;
}

function updateTabCounts() {
    let allItems = [];
    (UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(s => s.items.forEach(i => allItems.push(i))));

    // Get current user for my-tasks count
    const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    const myTasksCount = currentUser ? allItems.filter(i => i.contributors && i.contributors.includes(currentUser)).length : allItems.length;

    const counts = {
        track: allItems.length,
        status: allItems.length,
        priority: allItems.length,
        contributor: allItems.length,
        gantt: allItems.filter(i => i.startDate || i.due).length,
        backlog: 0,
        sprint: (UPDATE_DATA.metadata && UPDATE_DATA.metadata.sprints ? UPDATE_DATA.metadata.sprints.length : 0),
        epics: (UPDATE_DATA.metadata && UPDATE_DATA.metadata.epics ? UPDATE_DATA.metadata.epics.length : 0),
        roadmap: allItems.filter(i => i.planningHorizon).length,
        releases: allItems.filter(i => i.releasedIn).length,
        okr: (UPDATE_DATA.metadata && UPDATE_DATA.metadata.okrs ? UPDATE_DATA.metadata.okrs.length : 0),
        kanban: allItems.length,
        analytics: (UPDATE_DATA.metadata && UPDATE_DATA.metadata.velocityHistory ? UPDATE_DATA.metadata.velocityHistory.length : 0),
        capacity: (() => { const s = (UPDATE_DATA.metadata?.sprints || []).find(s => s.status === 'active'); if (!s) return 0; const names = new Set(); (UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(st => st.items.forEach(i => { if (i.sprintId === s.id) (i.contributors || []).forEach(c => names.add(c)) }))); return names.size })(),
        'my-tasks': myTasksCount,
        dashboard: (UPDATE_DATA.metadata && UPDATE_DATA.metadata.epics ? UPDATE_DATA.metadata.epics.length : 0)
    };
    (UPDATE_DATA.tracks || []).forEach(t => {
        const bl = t.subtracks.find(s => s.name === 'Backlog');
        if (bl) counts.backlog += bl.items.length;
    });
    ['track', 'status', 'priority', 'contributor', 'gantt', 'backlog', 'sprint', 'releases', 'dependency', 'epics', 'roadmap', 'kanban', 'okr', 'analytics', 'capacity', 'my-tasks', 'dashboard'].forEach(v => {
        const el = document.getElementById(`tab-count-${v}`);
        if (el) el.textContent = counts[v] || '';
    });
}

function switchView(view) {
    try {
        window.currentActiveView = view; // Set global state immediately

        const targetId = `${view}-view`;
        const vSection = document.getElementById(targetId);

        console.log(`🎯 switchView('${view}') - DOM Analysis:`, {
            exists: !!vSection,
            allSections: document.querySelectorAll('.view-section').length,
            targetId: targetId
        });

        // Terminal Diagnostic: If search failed, log what's actually there
        if (!vSection) {
            const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
            console.warn('❌ CRITICAL: Target view missing. Current DOM IDs:', allIds.slice(0, 50));
        }

        document.querySelectorAll('.view-section').forEach(v => {
            v.classList.remove('active');
            v.style.display = 'none'; // Force hide
        });
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));

        const btn = document.getElementById(`btn-${view}`);
        if (btn) btn.classList.add('active');

        if (vSection) {
            vSection.classList.add('active');
            vSection.style.display = 'block'; // Force show
            console.log(`✅ switchView('${view}') - Stage Sync Initiated`);

            // Sync breadcrumb & ribbon stage
            if (typeof detectStageFromView === 'function') {
                detectStageFromView();
            }
        }

        // Render the appropriate view
        if (view === 'track') renderTrackView();
        if (view === 'workflow') renderWorkflowView();
        if (view === 'ideation' || view === 'spikes') {
            if (typeof renderDiscoveryView === 'function') renderDiscoveryView(view);
        }
        if (view === 'roadmap') renderRoadmapView();
        if (view === 'epics') renderEpicsView();
        if (view === 'status') renderStatusView();
        if (view === 'priority') renderPriorityView();
        if (view === 'contributor') renderContributorView();
        if (view === 'gantt') renderGanttView();
        if (view === 'backlog') renderBacklogView();
        if (view === 'sprint') renderSprintView();
        if (view === 'releases') renderReleasesView();
        if (view === 'dependency') renderDependencyView();
        if (view === 'kanban') renderKanbanView();
        if (view === 'okr') renderOkrView();
        if (view === 'analytics') renderAnalyticsView();
        if (view === 'capacity') renderCapacityView();
        if (view === 'my-tasks') renderMyTasksView();
        if (view === 'dashboard') renderExecutiveDashboard();
        if (view === 'activity') renderActivityView();
        if (view === 'ideation' || view === 'spikes') {
            if (typeof renderDiscoveryView === 'function') renderDiscoveryView();
        }

        renderBlockerStrip();
        buildTagFilterBar();
        updateTabCounts();

        // Synergistic update: Update stage detection and command strip breadcrumbs AFTER view has rendered
        if (typeof detectStageFromView === 'function') detectStageFromView();
        if (typeof updateCommandStripNav === 'function') updateCommandStripNav();
    } catch (e) {
        console.error('❌ switchView Error:', e);
    }
}

// ------ Persistence Helpers ------
function getCollapseKey(trackId, subtrackName) { return `khyaal_col_${trackId}_${subtrackName.replace(/\s/g, '_')}`; }
function isSubtrackCollapsed(trackId, subtrackName) { return sessionStorage.getItem(getCollapseKey(trackId, subtrackName)) === '1'; }
function setSubtrackCollapsed(trackId, subtrackName, v) { sessionStorage.setItem(getCollapseKey(trackId, subtrackName), v ? '1' : '0'); }

// ------ Changelog ------
let CHANGELOG = [];
function logChange(action, detail) {
    CHANGELOG.unshift({ action, detail, time: new Date().toLocaleTimeString() });
    if (CHANGELOG.length > 50) CHANGELOG.pop();
    const badge = document.getElementById('changelog-count');
    if (badge) badge.textContent = CHANGELOG.length;
    const body = document.getElementById('changelog-body');
    if (body) body.innerHTML = CHANGELOG.map(e =>
        `<div class="changelog-entry"><strong>${e.action}</strong> — ${e.detail}<div class="changelog-time">${e.time}</div></div>`
    ).join('');
}
function toggleChangelog() {
    document.getElementById('changelog-panel').classList.toggle('open');
}

// ------ Tag Filter ------
let activeTagFilter = null;
function setTagFilter(tag) {
    activeTagFilter = (activeTagFilter === tag) ? null : tag;
    buildTagFilterBar();
    const view = document.querySelector('.view-section.active');
    if (view) switchView(view.id.replace('-view', ''));
}
function isItemMatchingTagFilter(item) {
    if (!activeTagFilter) return true;
    return (item.tags || []).some(t => t.toLowerCase() === activeTagFilter.toLowerCase());
}
function buildTagFilterBar() {
    const bar = document.getElementById('tag-filter-bar');
    if (!bar) return;
    const allTags = new Set();
    (UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(s => s.items.forEach(i => (i.tags || []).forEach(tg => allTags.add(tg)))));
    if (!allTags.size) { bar.innerHTML = ''; return; }
    bar.innerHTML = [...allTags].map(tg =>
        `<span class="tag-filter-pill${activeTagFilter === tg ? ' active' : ''}" onclick="setTagFilter('${tg}')">${tg}</span>`
    ).join('') + (activeTagFilter ? `<span class="tag-filter-pill clear" onclick="setTagFilter(null)">✕ Clear</span>` : '');
}

// ------ Contributor Helpers ------
let ALL_CONTRIBUTORS = [];
function buildContributorList() {
    const set = new Set();
    (UPDATE_DATA.tracks || []).forEach(t =>
        t.subtracks.forEach(s =>
            s.items.forEach(i =>
                (i.contributors || []).forEach(c => { if (c.trim()) set.add(c.trim()); })
            )
        )
    );
    ALL_CONTRIBUTORS = Array.from(set).sort();
}

// Export for global use
window.switchView = switchView;
if (typeof addItem === 'function') {
    window.openAddItemModal = addItem; // Map ribbon buttons to CMS addItem
} else {
    // Fallback if cms.js hasn't loaded yet
    window.openAddItemModal = (type) => {
        if (typeof addItem === 'function') {
            addItem(type);
        } else {
            console.error('❌ CMS addItem function not found!');
        }
    };
}

// ------ Keyboard Shortcuts ------
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        // Cmd+K / Ctrl+K — open command palette (works even from inputs)
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault()
            const palette = document.getElementById('cmd-palette')
            if (palette && palette.classList.contains('open')) {
                closeCmdPalette()
            } else {
                openCmdPalette()
            }
            return
        }

        // Block all other shortcuts when any modal or the palette is open
        const cmsModal = document.getElementById('cms-modal')
        const adminModal = document.getElementById('admin-panel-modal')
        const cmdPalette = document.getElementById('cmd-palette')
        if (cmsModal && cmsModal.classList.contains('active')) return
        if (adminModal && adminModal.classList.contains('active')) return
        if (cmdPalette && cmdPalette.classList.contains('open')) return
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

        const viewMap = {
            '1': 'epics',
            '2': 'roadmap',
            '3': 'backlog',
            '4': 'sprint',
            '5': 'track',
            '6': 'releases',
            '7': 'status',
            '8': 'priority',
            '9': 'contributor',
            '0': 'dependency'
        }
        if (viewMap[e.key]) { e.preventDefault(); switchView(viewMap[e.key]); return }
        if (e.key === '/') { e.preventDefault(); const s = document.querySelector('.search-input'); if (s) { s.focus(); s.select(); } }
    })
}

// ------ Command Palette ------

let _cmdPaletteIndex = 0    // currently highlighted result index
let _cmdPaletteResults = [] // flat array of result objects built on each query

// View shortcuts surfaced in the palette regardless of search query
const CMD_VIEWS = [
    { id: 'epics',       label: 'Epics',        icon: '🌟', stage: 'Vision' },
    { id: 'okr',         label: 'OKRs',          icon: '🎯', stage: 'Vision' },
    { id: 'roadmap',     label: 'Roadmap',       icon: '🗺️', stage: 'Plan' },
    { id: 'backlog',     label: 'Backlog',        icon: '📋', stage: 'Plan' },
    { id: 'sprint',      label: 'Sprint',         icon: '⚡', stage: 'Plan' },
    { id: 'kanban',      label: 'Kanban',         icon: '📌', stage: 'Build' },
    { id: 'track',       label: 'Track',          icon: '📊', stage: 'Build' },
    { id: 'releases',    label: 'Releases',       icon: '🚀', stage: 'Ship' },
    { id: 'analytics',   label: 'Analytics',      icon: '📈', stage: 'Ship' },
    { id: 'dashboard',   label: 'Dashboard',      icon: '🏠', stage: 'Ship' },
    { id: 'dependency',  label: 'Dependencies',   icon: '🔗', stage: 'Build' },
    { id: 'status',      label: 'By Status',      icon: '🔵', stage: 'Build' },
    { id: 'priority',    label: 'By Priority',    icon: '🔴', stage: 'Build' },
    { id: 'contributor', label: 'By Contributor', icon: '👤', stage: 'Build' },
    { id: 'ideation',    label: 'Ideation',       icon: '💡', stage: 'Discover' },
    { id: 'workflow',    label: 'Workflow',        icon: '🔍', stage: 'Discover' },
]

function openCmdPalette() {
    const palette = document.getElementById('cmd-palette')
    const input = document.getElementById('cmd-palette-input')
    if (!palette || !input) return
    palette.classList.add('open')
    document.body.style.overflow = 'hidden'
    input.value = ''
    _cmdPaletteIndex = 0
    renderCmdPaletteResults('')
    // Use rAF so the element is visible before focus
    requestAnimationFrame(() => input.focus())
}

function closeCmdPalette() {
    const palette = document.getElementById('cmd-palette')
    if (palette) palette.classList.remove('open')
    document.body.style.overflow = ''
    _cmdPaletteResults = []
    _cmdPaletteIndex = 0
}

function onCmdPaletteInput(value) {
    _cmdPaletteIndex = 0
    renderCmdPaletteResults(value.trim())
}

function onCmdPaletteKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeCmdPalette(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveCmdPaletteIndex(1); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); moveCmdPaletteIndex(-1); return }
    if (e.key === 'Enter')     { e.preventDefault(); executeCmdPaletteResult(_cmdPaletteIndex); return }
}

function moveCmdPaletteIndex(delta) {
    const len = _cmdPaletteResults.length
    if (!len) return
    _cmdPaletteIndex = (_cmdPaletteIndex + delta + len) % len
    highlightCmdPaletteResult()
}

function highlightCmdPaletteResult() {
    const items = document.querySelectorAll('#cmd-palette-results .cp-result')
    items.forEach((el, i) => el.classList.toggle('cp-active', i === _cmdPaletteIndex))
    items[_cmdPaletteIndex]?.scrollIntoView({ block: 'nearest' })
}

function executeCmdPaletteResult(index) {
    const result = _cmdPaletteResults[index]
    if (!result) return
    closeCmdPalette()
    result.action()
}

// Fuzzy score: higher is better. Returns -1 if no match.
function cmdScore(text, query) {
    if (!query) return 1
    const t = text.toLowerCase()
    const q = query.toLowerCase()
    const idx = t.indexOf(q)
    if (idx === -1) return -1
    // Bonus for word-start match, penalty for position
    const wordStart = idx === 0 || /\W/.test(t[idx - 1]) ? 20 : 0
    return 100 - idx + wordStart
}

// Score an item across multiple fields; returns best score across all fields
function cmdScoreItem(item, query) {
    if (!query) return 1
    const fields = [
        item.text || '',
        item.usecase || '',
        item.acceptanceCriteria || '',
        ...(Array.isArray(item.tags) ? item.tags : []),
        ...(Array.isArray(item.contributors) ? item.contributors : [])
    ]
    const scores = fields.map(f => cmdScore(f, query)).filter(s => s >= 0)
    return scores.length > 0 ? Math.max(...scores) : -1
}

// ---- Recent items (last 5 item IDs opened via palette) ----
const _RECENT_KEY = 'khyaal_cmd_recent'

function getCmdRecent() {
    try { return JSON.parse(localStorage.getItem(_RECENT_KEY) || '[]') } catch { return [] }
}

function pushCmdRecent(itemId) {
    const prev = getCmdRecent().filter(id => id !== itemId)
    localStorage.setItem(_RECENT_KEY, JSON.stringify([itemId, ...prev].slice(0, 5)))
}

// ---- Action command corpus (triggered by leading '>') ----
function buildActionCorpus(actionQuery) {
    const data = window.UPDATE_DATA
    const actions = [
        { label: 'New Epic',          sub: 'Open the create-epic form',          icon: '🌟', action: () => { if (typeof openEpicEdit === 'function') openEpicEdit(null); switchView('epics') } },
        { label: 'New Sprint',        sub: 'Open the create-sprint form',         icon: '⚡', action: () => { if (typeof openSprintEdit === 'function') openSprintEdit(); switchView('sprint') } },
        { label: 'New Release',       sub: 'Open the create-release form',        icon: '🚀', action: () => { if (typeof openReleaseEdit === 'function') openReleaseEdit(); switchView('releases') } },
        { label: 'New Roadmap Item',  sub: 'Open the create-roadmap-item form',   icon: '🗺️', action: () => { if (typeof openRoadmapEdit === 'function') openRoadmapEdit(); switchView('roadmap') } },
        { label: 'Advance Horizons',  sub: 'Shift all roadmap horizons forward',  icon: '⏩', action: () => { if (typeof advanceRoadmapHorizons === 'function') advanceRoadmapHorizons() } },
        { label: 'Switch to PM',      sub: 'Change persona to Product Manager',   icon: '📋', action: () => { if (typeof switchMode === 'function') switchMode('pm') } },
        { label: 'Switch to Dev',     sub: 'Change persona to Developer',         icon: '💻', action: () => { if (typeof switchMode === 'function') switchMode('dev') } },
        { label: 'Switch to Exec',    sub: 'Change persona to Executive',         icon: '📊', action: () => { if (typeof switchMode === 'function') switchMode('exec') } },
        { label: 'Refresh Data',      sub: 'Clear cache and reload from GitHub',  icon: '🔄', action: () => { localStorage.removeItem('khyaal_data'); location.reload() } },
    ]

    // Dynamic: active sprint close
    if (data) {
        const activeSprint = (data.metadata?.sprints || []).find(s => s.status === 'active')
        if (activeSprint) {
            actions.push({
                label: `Close Sprint: ${activeSprint.name || activeSprint.id}`,
                sub: 'Open sprint close ceremony',
                icon: '🏁',
                action: () => { if (typeof renderSprintCloseModal === 'function') renderSprintCloseModal(activeSprint.id); switchView('sprint') }
            })
        }
    }

    return actions
        .map(a => ({ ...a, score: cmdScore(a.label, actionQuery) }))
        .filter(a => !actionQuery || a.score >= 0)
        .sort((a, b) => b.score - a.score)
        .map(a => ({ type: 'action', icon: a.icon, title: a.label, sub: a.sub, badge: 'Action', action: a.action }))
}

function buildCmdCorpus(query) {
    const results = []

    // ── Action mode: leading '>' ───────────────────────────────────────────
    if (query.startsWith('>')) {
        const actionQuery = query.slice(1).trim()
        return buildActionCorpus(actionQuery)
    }

    // ── Views ─────────────────────────────────────────────────────────────
    const matchedViews = CMD_VIEWS
        .map(v => ({ ...v, score: cmdScore(v.label, query) }))
        .filter(v => v.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, query ? 3 : 5)

    matchedViews.forEach(v => results.push({
        type: 'view',
        icon: v.icon,
        title: v.label,
        sub: `${v.stage} stage`,
        badge: 'View',
        action: () => switchView(v.id)
    }))

    if (!window.UPDATE_DATA) return results

    // ── Recent items (shown on empty query) ────────────────────────────────
    if (!query) {
        const recentIds = getCmdRecent()
        const allItems = (UPDATE_DATA.tracks || []).flatMap(track =>
            track.subtracks.flatMap(sub => sub.items.map(item => ({ item, track, sub })))
        )
        recentIds.forEach(id => {
            const found = allItems.find(({ item }) => item.id === id)
            if (!found) return
            const { item, track, sub } = found
            results.push({
                type: 'recent',
                icon: '🕐',
                title: item.text || item.id,
                sub: `${track.name} › ${sub.name}  ·  ${item.status || ''}`,
                badge: item.priority || '',
                action: () => {
                    pushCmdRecent(item.id)
                    if (typeof openItemEdit === 'function') openItemEdit(null, null, null, item.id)
                }
            })
        })
        return results
    }

    // ── Items ──────────────────────────────────────────────────────────────
    if (query) {
        const itemMatches = []
        ;(UPDATE_DATA.tracks || []).forEach(track => {
            track.subtracks.forEach(sub => {
                sub.items.forEach(item => {
                    const score = cmdScoreItem(item, query)
                    if (score >= 0) itemMatches.push({ item, track, sub, score })
                })
            })
        })
        itemMatches.sort((a, b) => b.score - a.score).slice(0, 5).forEach(({ item, track, sub }) => {
            results.push({
                type: 'item',
                icon: '📝',
                title: item.text || item.id,
                sub: `${track.name} › ${sub.name}  ·  ${item.status || ''}`,
                badge: item.priority || '',
                action: () => {
                    pushCmdRecent(item.id)
                    if (typeof openItemEdit === 'function') openItemEdit(null, null, null, item.id)
                }
            })
        })
    }

    // ── Epics ──────────────────────────────────────────────────────────────
    if (query) {
        const epics = (UPDATE_DATA.metadata?.epics || [])
        epics
            .map((ep, i) => ({ ep, i, score: cmdScore(ep.name || ep.id || '', query) }))
            .filter(x => x.score >= 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .forEach(({ ep, i }) => results.push({
                type: 'epic',
                icon: '🌟',
                title: ep.name || ep.id,
                sub: `Epic  ·  ${ep.status || 'active'}`,
                badge: 'Epic',
                action: () => {
                    if (typeof openEpicEdit === 'function') openEpicEdit(i)
                    switchView('epics')
                }
            }))
    }

    // ── OKRs ───────────────────────────────────────────────────────────────
    if (query) {
        ;(UPDATE_DATA.metadata?.okrs || [])
            .map(okr => ({ okr, score: cmdScore(okr.objective || '', query) }))
            .filter(x => x.score >= 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .forEach(({ okr }) => results.push({
                type: 'okr',
                icon: '🎯',
                title: okr.objective,
                sub: `OKR  ·  ${okr.status || 'active'}`,
                badge: 'OKR',
                action: () => switchView('okr')
            }))
    }

    // ── Sprints ────────────────────────────────────────────────────────────
    if (query) {
        ;(UPDATE_DATA.metadata?.sprints || [])
            .map(sp => ({ sp, score: cmdScore(sp.name || sp.id || '', query) }))
            .filter(x => x.score >= 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .forEach(({ sp }) => results.push({
                type: 'sprint',
                icon: '⚡',
                title: sp.name || sp.id,
                sub: `Sprint  ·  ${sp.status || ''}`,
                badge: 'Sprint',
                action: () => {
                    if (typeof openSprintEdit === 'function') openSprintEdit(sp.id)
                    switchView('sprint')
                }
            }))
    }

    // ── Releases ───────────────────────────────────────────────────────────
    if (query) {
        ;(UPDATE_DATA.metadata?.releases || [])
            .map(r => ({ r, score: cmdScore(r.name || r.id || '', query) }))
            .filter(x => x.score >= 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .forEach(({ r }) => results.push({
                type: 'release',
                icon: '🚀',
                title: r.name || r.id,
                sub: `Release  ·  ${r.status || 'planned'}`,
                badge: 'Release',
                action: () => {
                    if (typeof openReleaseEdit === 'function') openReleaseEdit(r.id)
                    switchView('releases')
                }
            }))
    }

    return results
}

function renderCmdPaletteResults(query) {
    _cmdPaletteResults = buildCmdCorpus(query)
    const container = document.getElementById('cmd-palette-results')
    const icon = document.getElementById('cmd-palette-icon')
    if (!container) return

    // Update search icon to signal mode
    const isActionMode = query.startsWith('>')
    if (icon) icon.textContent = isActionMode ? '⚡' : '⌘'

    if (!_cmdPaletteResults.length) {
        container.innerHTML = ''  // :empty pseudo triggers "No results"
        return
    }

    // Group by type for visual separation
    const typeOrder = ['action', 'recent', 'view', 'item', 'epic', 'okr', 'sprint', 'release']
    const typeLabel  = { action: 'Actions', recent: 'Recently Opened', view: 'Views', item: 'Items', epic: 'Epics', okr: 'OKRs', sprint: 'Sprints', release: 'Releases' }
    const iconClass  = { action: 'cp-icon-action', recent: 'cp-icon-recent', view: 'cp-icon-view', item: 'cp-icon-item', epic: 'cp-icon-epic', okr: 'cp-icon-okr', sprint: 'cp-icon-sprint', release: 'cp-icon-release' }

    let html = ''
    let flatIndex = 0
    const grouped = {}
    _cmdPaletteResults.forEach(r => { (grouped[r.type] = grouped[r.type] || []).push(r) })

    typeOrder.forEach(type => {
        if (!grouped[type]?.length) return
        html += `<div class="cp-group-label">${typeLabel[type]}</div>`
        grouped[type].forEach(r => {
            const active = flatIndex === _cmdPaletteIndex ? ' cp-active' : ''
            const idx = flatIndex++
            html += `<div class="cp-result${active}" role="option" onclick="executeCmdPaletteResult(${idx})"
                onmouseenter="setCmdPaletteIndex(${idx})">
                <span class="cp-result-icon ${iconClass[r.type] || ''}">${r.icon}</span>
                <div class="cp-result-body">
                    <div class="cp-result-title">${r.title}</div>
                    ${r.sub ? `<div class="cp-result-sub">${r.sub}</div>` : ''}
                </div>
                ${r.badge ? `<span class="cp-result-badge">${r.badge}</span>` : ''}
            </div>`
        })
    })

    const hint = isActionMode
        ? `↑↓ navigate &nbsp;·&nbsp; ↵ execute &nbsp;·&nbsp; esc close`
        : `↑↓ navigate &nbsp;·&nbsp; ↵ open &nbsp;·&nbsp; esc close &nbsp;·&nbsp; <kbd>&gt;</kbd> for actions`
    html += `<div class="cp-kbd">${hint}</div>`
    container.innerHTML = html
}

function setCmdPaletteIndex(index) {
    _cmdPaletteIndex = index
    highlightCmdPaletteResult()
}
