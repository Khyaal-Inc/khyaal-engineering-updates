// UPDATE_DATA is global, provided by index.html initialization
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
    done: { label: 'Done', class: 'badge-done', bucket: 'bucket-done' },
    now: { label: 'Now', class: 'badge-now', bucket: 'bucket-now' },
    ongoing: { label: 'On-Going', class: 'badge-ongoing', bucket: 'bucket-ongoing' },
    next: { label: 'Next', class: 'badge-next', bucket: 'bucket-next' },
    later: { label: 'Later', class: 'badge-later', bucket: 'bucket-later' }
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
    if (!strip) return;

    let blockers = [];
    const activeTeam = getActiveTeam();

    UPDATE_DATA.tracks.forEach(track => {
        if (activeTeam && activeTeam !== track.name) return;
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.blocker) {
                    blockers.push({
                        text: item.text,
                        note: item.blockerNote,
                        track: track.name,
                        subtrack: subtrack.name
                    });
                }
            });
        });
    });

    if (blockers.length === 0) {
        strip.classList.add('hidden');
        strip.innerHTML = '';
        return;
    }

    strip.classList.remove('hidden');
    let html = `<div class="global-blocker-strip">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">🚨 ${blockers.length} Active Blocker${blockers.length > 1 ? 's' : ''}</span>
                        <span class="text-xs text-red-800 font-bold">Action required to unblock progress</span>
                    </div>
                `;

    blockers.forEach(b => {
        html += `
            <div class="blocker-alert-item border-l-2 border-red-500 pl-3 py-1">
                <div class="dot"></div>
                <div class="flex-1">
                    <span class="font-black text-xs text-red-900">[${b.track} → ${b.subtrack}]</span>
                    <span class="text-sm font-medium text-red-800">${b.text}</span>
                    ${b.note ? `<div class="text-[11px] text-red-700 italic mt-0.5">• ${b.note}</div>` : ''}
                </div>
            </div>
        `;
    });

    html += `</div>`;
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

    const today = new Date(); today.setHours(0,0,0,0);
    
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
        capacity: (UPDATE_DATA.metadata && UPDATE_DATA.metadata.capacity && UPDATE_DATA.metadata.capacity.teamMembers ? UPDATE_DATA.metadata.capacity.teamMembers.length : 0)
    };
    (UPDATE_DATA.tracks || []).forEach(t => {
        const bl = t.subtracks.find(s => s.name === 'Backlog');
        if (bl) counts.backlog += bl.items.length;
    });
    ['track', 'status', 'priority', 'contributor', 'gantt', 'backlog', 'sprint', 'releases', 'dependency', 'epics', 'roadmap', 'kanban', 'okr', 'analytics', 'capacity'].forEach(v => {
        const el = document.getElementById(`tab-count-${v}`);
        if (el) el.textContent = counts[v] || '';
    });
}

function switchView(view) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    
    const btn = document.getElementById(`btn-${view}`);
    if (btn) btn.classList.add('active');
    
    const vSection = document.getElementById(`${view}-view`);
    if (vSection) vSection.classList.add('active');
    
    // Render the appropriate view
    if (view === 'track') renderTrackView();
    if (view === 'workflow') renderWorkflowView();
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
    
    renderBlockerStrip();
    buildTagFilterBar();
    updateTabCounts();
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

// ------ Keyboard Shortcuts ------
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        const modal = document.getElementById('cms-modal');
        if (modal && modal.classList.contains('active')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
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
        };
        if (viewMap[e.key]) { e.preventDefault(); switchView(viewMap[e.key]); return; }
        if (e.key === '/') { e.preventDefault(); const s = document.querySelector('.search-input'); if (s) { s.focus(); s.select(); } }
    });
}
