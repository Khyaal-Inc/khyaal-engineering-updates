console.log('📜 views.js loading...');

// --- Workflow View State & Initialization (Hoisted for Stability) ---
let currentWorkflowTab = 'pm';

function setWorkflowTab(tab) {
    currentWorkflowTab = tab;
    if (document.getElementById('workflow-view')?.classList.contains('active')) {
        renderWorkflowView();
    }
}

// Ensure global UI state for transient elements
if (!window.uiState) window.uiState = { openEpics: new Set(), openComments: new Set() };
if (!window.uiState.openComments) window.uiState.openComments = new Set();

window.setWorkflowTab = setWorkflowTab;
window.renderWorkflowView = renderWorkflowView;
window.renderDiscoveryView = renderDiscoveryView;

// ------ Rendering Helpers ------
function shouldShowManagement() {
    const params = new URLSearchParams(window.location.search);
    // Correctly check for presence of authentication hash or github state
    const isSiteAuthed = !!localStorage.getItem('khyaal_site_auth');
    return params.get('cms') === 'true' && (!!window.isGithubAuthenticated || isSiteAuthed);
}

/**
 * Exec filter banner: shown when exec mode filters visible items
 * @param {number} shownCount - number of items after exec filter
 * @param {number} totalCount - total items before exec filter
 * @param {string} viewId - session key for "show all" toggle state
 */
function renderExecFilterBanner(shownCount, totalCount, viewId) {
    const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm';
    if (mode !== 'exec' || totalCount === 0) return '';
    const sessionKey = `exec_show_all_${viewId}`;
    const showingAll = sessionStorage.getItem(sessionKey) === 'true';
    if (shownCount >= totalCount && !showingAll) return '';
    const displayed = showingAll ? totalCount : shownCount;
    return `
        <div class="exec-filter-banner">
            <span>📊 Showing <strong>${displayed}</strong> of <strong>${totalCount}</strong> items — filtered to high-impact &amp; active</span>
            <button onclick="sessionStorage.setItem('exec_show_all_${viewId}', '${showingAll ? 'false' : 'true'}'); if(typeof render${viewId.charAt(0).toUpperCase() + viewId.slice(1)}View === 'function') render${viewId.charAt(0).toUpperCase() + viewId.slice(1)}View();" class="exec-filter-toggle">
                ${showingAll ? 'Show filtered' : 'Show all'}
            </button>
        </div>
    `;
}

/**
 * Apply exec mode filter to an items array, respecting session "show all" toggle
 */
function applyExecFilter(items, viewId) {
    const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm';
    if (mode !== 'exec') return items;
    const sessionKey = `exec_show_all_${viewId}`;
    if (sessionStorage.getItem(sessionKey) === 'true') return items;
    const filter = typeof getModeFilter === 'function' ? getModeFilter() : null;
    return filter ? items.filter(filter) : items;
}

function renderContributors(contributors) {
    return (contributors || []).map(name =>
        `<span class="contributor-tag ${contributorColors[name] || 'bg-gray-100 text-gray-600'}">${name}</span>`
    ).join('');
}

function renderDueDateBadge(item) {
    if (!item.due || ['next', 'later'].includes(item.status) || item.status === 'done') return '';
    const dueDate = new Date(item.due);
    if (isNaN(dueDate.getTime())) return `<span class="ml-2 inline-flex items-center gap-1 font-bold text-[10px] text-orange-700">(${item.due})</span>`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((dueDate - today) / 86400000);
    if (diffDays < 0) return `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase tracking-wider">&#9888; Overdue (${item.due})</span>`;
    if (diffDays <= 2) return `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-[10px] uppercase tracking-wider">&#128336; Due Soon (${item.due})</span>`;
    return `<span class="ml-2 inline-flex items-center gap-1 font-bold text-[10px] text-orange-700">(${item.due})</span>`;
}

const tagClasses = {
    'tech-debt': 'tag-tech-debt', 'bug': 'tag-bug', 'feature': 'tag-feature',
    'compliance': 'tag-compliance', 'customer': 'tag-customer'
};
function renderTagPills(tags) {
    if (!tags || !tags.length) return '';
    return tags.map(t => {
        const key = t.toLowerCase().replace(/\s+/g, '-');
        return `<span class="tag-pill ${tagClasses[key] || ''}">${t}</span>`;
    }).join(' ');
}

function renderCommentThread(comments, ti, si, ii, itemId, viewPrefix = 'main') {
    if (!comments || comments.length === 0) return '<div class="text-slate-400 text-xs italic p-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">No discussion notes yet.</div>';

    return comments.map(c => {
        const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Legacy';
        return `
            <div class="comment-item bg-white p-3 rounded-lg border border-slate-100 shadow-sm mb-2 last:mb-0">
                <div class="flex items-center gap-2 mb-1.5">
                    <span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">${(c.author || 'P').charAt(0)}</span>
                    <span class="text-[11px] font-black text-slate-800 uppercase tracking-wider">${c.author || 'PM'}</span>
                    <span class="text-[10px] text-slate-400 font-medium">${dateStr}</span>
                    ${shouldShowManagement() ? `<button onclick="event.stopPropagation(); deleteComment(${ti},${si},${ii},'${c.id}', '${itemId}', '${viewPrefix}')" class="ml-auto text-slate-300 hover:text-red-500 transition-colors">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>` : ''}
                </div>
                <div class="text-xs text-slate-600 leading-relaxed font-medium pl-8">
                    ${c.text}
                </div>
            </div>`;
    }).join('');
}

// ------ Workflow / Playbook View ------
function renderWorkflowView() {
    const container = document.getElementById('workflow-view');
    if (!container) return;

    let ribbonHtml = `
        <div id="workflow-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <!-- Group 1: Navigation/Breadcrumb -->
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">🛠️</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Engineering Playbook</span>
                    <h2 class="text-sm font-black text-slate-800">Process & Workflow</h2>
                </div>
            </div>

            <!-- Group 2: Actions -->
            <div class="flex items-center gap-2">
                <div id="workflow-next-action-mount">
                    ${renderPrimaryStageAction('workflow')}
                </div>
            </div>
        </div>
    `;

    const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm'
    const activeTab = window.workflowTab || (mode === 'dev' ? 'dev' : 'pm')

    const stages = [
        {
            num: 1, icon: '🔍', title: 'Discovery', color: 'border-slate-300 bg-slate-50',
            badgeColor: 'bg-slate-100 text-slate-700',
            who: ['PM'], when: 'Pre-quarter / ongoing',
            views: [{ id: 'ideation', label: 'Ideation' }, { id: 'spikes', label: 'Spikes' }],
            steps: [
                'Capture raw ideas and opportunities in Ideation view',
                'Run technical spikes to validate feasibility',
                'Tag ideas with #idea or #spike',
                'Shortlist validated ideas as input for Vision stage'
            ],
            output: 'Validated idea list ready for OKR planning',
            next: { id: 'okr', label: 'Vision →' },
            devVisible: false
        },
        {
            num: 2, icon: '🌟', title: 'Vision', color: 'border-indigo-200 bg-indigo-50/30',
            badgeColor: 'bg-indigo-100 text-indigo-700',
            who: ['PM', 'Exec'], when: 'Quarter start (once per quarter)',
            views: [{ id: 'okr', label: 'OKRs' }, { id: 'epics', label: 'Epics' }],
            steps: [
                'Set quarterly Objectives & Key Results in OKR view',
                'Create Strategic Epics aligned to each OKR',
                'Link Key Results to Epics via "Linked Epic" field',
                'Get Exec sign-off on OKR targets'
            ],
            output: 'OKRs with linked Epics and measurable Key Results',
            next: { id: 'roadmap', label: 'Definition →' },
            devVisible: false
        },
        {
            num: 3, icon: '📐', title: 'Definition', color: 'border-blue-200 bg-blue-50/30',
            badgeColor: 'bg-blue-100 text-blue-700',
            who: ['PM', 'Dev'], when: 'Sprint start (every 1–2 weeks)',
            views: [{ id: 'roadmap', label: 'Roadmap' }, { id: 'backlog', label: 'Backlog' }, { id: 'sprint', label: 'Sprint' }],
            steps: [
                'Map Epics to planning horizons in Roadmap view',
                'Break Epics into tasks in Backlog — set story points, AC, priority',
                'Assign tasks to sprint via inline "Assign to Sprint" on backlog items',
                'Create a Release milestone with target date',
                'Dev: Review your sprint tasks, ask PM to clarify acceptance criteria'
            ],
            output: 'Sprint with committed items, Release milestone created',
            next: { id: 'kanban', label: 'Delivery →' },
            devVisible: true,
            devNote: 'Review your assigned tasks in Sprint view. Clarify acceptance criteria before starting.'
        },
        {
            num: 4, icon: '🚀', title: 'Delivery', color: 'border-emerald-200 bg-emerald-50/30',
            badgeColor: 'bg-emerald-100 text-emerald-700',
            who: ['Dev', 'PM'], when: 'During sprint (daily)',
            views: [{ id: 'my-tasks', label: 'My Tasks' }, { id: 'kanban', label: 'Kanban' }, { id: 'track', label: 'Track' }, { id: 'dependency', label: 'Dependencies' }],
            steps: [
                'Dev: Open My Tasks — see your assigned items with Epic + OKR context',
                'Move cards on Kanban: Later → Next → Now → QA → Review → Done',
                'Flag a blocker via the item edit modal if you are stuck',
                'PM: Resolve blockers using the "✅ Resolve" button on the blocker strip',
                'Mark items Done once code is merged and verified'
            ],
            output: 'Done items in Kanban ready to be shipped to a Release',
            next: { id: 'releases', label: 'Review/Ship →' },
            devVisible: true,
            devNote: 'This is your primary stage. Use My Tasks as your daily starting point.'
        },
        {
            num: 5, icon: '🏁', title: 'Review / Ship', color: 'border-purple-200 bg-purple-50/30',
            badgeColor: 'bg-purple-100 text-purple-700',
            who: ['PM', 'Exec'], when: 'Sprint end / release day',
            views: [{ id: 'releases', label: 'Releases' }, { id: 'analytics', label: 'Analytics' }, { id: 'dashboard', label: 'Dashboard' }],
            steps: [
                'Click "📦 Promote Done Items →" on sprint card to assign done items to a release',
                'Open Releases view — verify items, set publish date',
                'PM: Update OKR Key Result progress based on what shipped',
                'Exec: Review Dashboard for blockers, OKR health, and at-risk items',
                'Review Analytics — velocity, burndown, team performance',
                'Decide what goes into next quarter\'s Discovery → restart cycle'
            ],
            output: 'Published release + updated OKR progress → feeds next Discovery',
            next: { id: 'ideation', label: 'Discovery →' },
            devVisible: true,
            devNote: 'Check Releases to confirm your work is correctly attributed. Review Analytics for team velocity.'
        }
    ]

    const visibleStages = activeTab === 'dev' ? stages.filter(s => s.devVisible) : stages

    const stageCards = visibleStages.map(s => {
        const whoHtml = s.who.map(w => {
            const colors = { PM: 'bg-blue-100 text-blue-800', Dev: 'bg-green-100 text-green-800', Exec: 'bg-purple-100 text-purple-800' }
            return `<span class="px-2 py-0.5 rounded-full text-[10px] font-black ${colors[w]}">${w}</span>`
        }).join('')
        const viewBtns = s.views.map(v =>
            `<button onclick="switchView('${v.id}')" class="playbook-view-btn">${v.label} →</button>`
        ).join('')
        const stepsList = (activeTab === 'dev' && s.devNote ? [s.devNote, ...s.steps.filter((_, i) => i > 0)] : s.steps)
            .map((step, i) => `<li class="flex gap-2.5 items-start"><span class="shrink-0 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-500">${i + 1}</span><span class="text-xs text-slate-700 leading-relaxed">${step}</span></li>`).join('')

        return `
            <div class="playbook-stage-card rounded-2xl border-2 ${s.color} p-6">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <span class="w-8 h-8 rounded-xl ${s.badgeColor} flex items-center justify-center text-base font-black">${s.num}</span>
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-xl">${s.icon}</span>
                                <h3 class="text-base font-black text-slate-900">${s.title}</h3>
                            </div>
                            <div class="flex items-center gap-1.5 flex-wrap">
                                ${whoHtml}
                                <span class="text-[10px] text-slate-400 font-bold ml-1">· ${s.when}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2 justify-end">${viewBtns}</div>
                </div>
                <ul class="space-y-2 mb-4">${stepsList}</ul>
                <div class="flex items-center justify-between pt-4 border-t border-slate-200/60">
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Output</div>
                    <div class="text-xs font-bold text-slate-600 text-right max-w-xs">${s.output}</div>
                </div>
                <div class="mt-3 flex justify-end">
                    <button onclick="switchView('${s.next.id}')" class="cms-btn cms-btn-primary text-xs px-4 py-1.5">${s.next.label}</button>
                </div>
            </div>`
    }).join('')

    container.innerHTML = ribbonHtml + `
        <div class="space-y-4">
            <!-- Tabs -->
            <div class="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
                <button onclick="window.workflowTab='pm'; renderWorkflowView()" class="px-5 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'pm' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}">👨‍💼 PM Playbook</button>
                <button onclick="window.workflowTab='dev'; renderWorkflowView()" class="px-5 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'dev' ? 'bg-green-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}">👩‍💻 Developer Guide</button>
            </div>

            <!-- Lifecycle flow strip -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-2 flex-wrap text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span class="text-slate-300">Flow:</span>
                <span class="px-2 py-1 bg-slate-100 rounded">🔍 Discovery</span><span class="text-slate-300">→</span>
                <span class="px-2 py-1 bg-indigo-100 rounded text-indigo-700">🌟 Vision</span><span class="text-slate-300">→</span>
                <span class="px-2 py-1 bg-blue-100 rounded text-blue-700">📐 Definition</span><span class="text-slate-300">→</span>
                <span class="px-2 py-1 bg-emerald-100 rounded text-emerald-700">🚀 Delivery</span><span class="text-slate-300">→</span>
                <span class="px-2 py-1 bg-purple-100 rounded text-purple-700">🏁 Review/Ship</span><span class="text-slate-300">→ loops back</span>
            </div>

            <!-- Stage cards -->
            <div class="space-y-4">${stageCards}</div>
        </div>
    `
}

window.workflowTab = null

// ------ Track View ------
function renderTrackView() {
    const container = document.getElementById('track-view');
    if (!container) return;

    // 1. Initial Setup: Create persistent structure if it doesn't exist
    if (!document.getElementById('track-ribbon')) {
        const teams = Array.from(new Set(UPDATE_DATA.tracks.filter(tr => tr.name).map(tr => tr.name)));
        const teamOptions = teams.map(n => `<option value="${n}">${n}</option>`).join('');

        container.innerHTML = `
            <div id="track-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <!-- Group 0: Title -->
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">🏗️</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery · All work organized by engineering team — see who owns what</span>
                        <h2 class="text-sm font-black text-slate-800">Engineering Tracks</h2>
                    </div>
                </div>
                <!-- Group 1: Navigation & Filters -->
                <div class="flex flex-wrap items-center gap-3 flex-1">
                    <div class="max-w-[420px] flex-1 min-w-[240px] relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                        <input type="search" id="track-search-input" placeholder="Search tasks, owners, or notes..."
                            value="${globalSearchQuery || ''}"
                            class="search-input w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600/30 transition-all font-semibold text-slate-700 placeholder:text-slate-400"
                            onkeyup="filterBySearch(this.value)">
                    </div>

                    <div class="h-6 w-[1px] bg-slate-200 mx-1 hidden md:block"></div>

                    <div class="flex items-center gap-2">
                        <select id="global-team-filter"
                            class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-100 transition-all cursor-pointer focus:ring-4 focus:ring-indigo-600/10"
                            onchange="renderTrackView()">
                            <option value="">🌍 All Tracks</option>
                            ${teamOptions}
                        </select>

                        <select id="date-range-preset" onchange="applyDatePreset(); renderTrackView();"
                            class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-100 transition-all cursor-pointer focus:ring-4 focus:ring-indigo-600/10">
                            <option value="all">📅 All Dates</option>
                            <option value="today">Today</option>
                            <option value="this-week">This Week</option>
                            <option value="this-month">This Month</option>
                            <option value="custom">Custom Range...</option>
                        </select>

                        <div id="custom-date-inputs" class="hidden flex gap-2">
                            <input type="date" id="filter-start-date" onchange="renderTrackView()"
                                class="px-2 py-1.5 border border-slate-100 rounded-lg text-xs bg-slate-50 font-bold">
                            <input type="date" id="filter-end-date" onchange="renderTrackView()"
                                class="px-2 py-1.5 border border-slate-100 rounded-lg text-xs bg-slate-50 font-bold">
                        </div>
                    </div>
                </div>

                <!-- Group 2: Actions -->
                <div class="flex items-center gap-2">
                    <button onclick="exportData('csv')"
                        class="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 rounded-xl transition-all shadow-sm group"
                        title="Export Clean CSV">
                        <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                    </button>
                    
                    <div id="track-next-action-mount" class="hidden md:block">
                        ${renderPrimaryStageAction('track')}
                    </div>

                    ${shouldShowManagement() ? `
                    <div class="h-6 w-[1px] bg-slate-200 mx-2"></div>
                    <button onclick="openTrackEdit()" class="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 active:scale-95">
                        <span class="text-lg">${getCurrentWorkflowStage() === 'discovery' ? '🔮' : '🏗️'}</span> 
                        ${getCurrentWorkflowStage() === 'discovery' ? 'Add Discovery Track' : 'Add New Track'}
                    </button>
                    ` : ''}
                </div>
            </div>
            <div id="track-content"></div>
        `;
    }

    // 2. Render content based on current filters
    const contentArea = document.getElementById('track-content');
    const activeTeam = getActiveTeam();
    const searchQuery = document.getElementById('track-search-input')?.value || '';

    let html = '';

    UPDATE_DATA.tracks.forEach((track, trackIndex) => {
        if (activeTeam && activeTeam !== track.name) return;
        const accentColor = themeColors[track.theme] || '#0f172a';

        // Calculate Team Pulse (Health)
        let totalActive = 0;
        let blocked = 0;
        track.subtracks.forEach(s => {
            s.items.forEach(i => {
                if (i.status !== 'later' && i.status !== 'done') {
                    totalActive++;
                    if (i.blocker) blocked++;
                }
            });
        });

        const healthScore = totalActive > 0 ? Math.round(((totalActive - blocked) / totalActive) * 100) : 100;
        const healthStatus = healthScore >= 90 ? 'Healthy' : healthScore >= 70 ? 'Strained' : 'At Risk';
        const healthColor = healthScore >= 90 ? 'bg-emerald-500' : healthScore >= 70 ? 'bg-amber-500' : 'bg-red-500';

        html += `<div class="track-card" style="border-color: ${accentColor}">`;
        html += `
            <div class="track-header" style="background: linear-gradient(135deg, ${accentColor} 0%, #1e293b 100%)">
                <div class="flex justify-between items-center w-full">
                    <div class="flex items-center gap-3">
                        <span class="text-xl font-black uppercase tracking-tighter">${track.name}</span>
                        <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 border border-white/20 backdrop-blur-sm" title="Team Pulse: ${healthScore}% Healthy">
                            <div class="w-2 h-2 rounded-full ${healthColor} ${healthScore < 90 ? 'animate-pulse' : ''}"></div>
                            <span class="text-[10px] font-black uppercase tracking-widest">${healthStatus}</span>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        ${shouldShowManagement() ? `
                        <button onclick="addSubtrack(${trackIndex})" class="bg-white/10 hover:bg-white/20 p-1 rounded text-xs px-2 transition-colors font-bold">Add Subtrack</button>
                        <button onclick="openTrackEdit(${trackIndex})" class="bg-white/10 hover:bg-white/20 p-1 rounded text-xs px-2 transition-colors">Edit</button>
                        <button onclick="deleteTrack(${trackIndex})" class="bg-white/10 hover:bg-white/20 p-1 rounded text-xs px-2 transition-colors">Delete</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        track.subtracks.forEach((subtrack, subtrackIndex) => {
            const itemsInTag = subtrack.items.filter(isItemMatchingTagFilter);
            const activeItemsSub = itemsInTag.filter(i => i.status !== 'later');
            const totalActiveSub = activeItemsSub.length;
            const doneItemsSub = activeItemsSub.filter(i => i.status === 'done').length;
            const percent = totalActiveSub > 0 ? Math.round((doneItemsSub / totalActiveSub) * 100) : 0;
            const blockerCount = itemsInTag.filter(i => i.blocker).length;

            const iconId = `icon-${track.id || trackIndex}-${subtrackIndex}`;
            const collapsed = isSubtrackCollapsed(track.id || String(trackIndex), subtrack.name);
            const rotateClass = collapsed ? 'style="transform:rotate(-90deg)"' : '';

            html += `<div class="subtrack-section" data-track="${trackIndex}" data-sub="${subtrackIndex}"
                        ondragover="event.preventDefault(); this.classList.add('drag-over')"
                        ondragleave="this.classList.remove('drag-over')"
                        ondrop="handleDrop(event, ${trackIndex}, ${subtrackIndex}); this.classList.remove('drag-over')">`;
            html += `
                <div class="subtrack-title flex justify-between items-center px-4 py-3 mb-1 cursor-pointer transition-all duration-300 rounded-r-lg group/sub" 
                     onclick="toggleSubtrack('${track.id || trackIndex}', '${subtrack.name}', '${iconId}')"
                     style="border-left: 6px solid ${accentColor}; 
                            background: linear-gradient(to right, ${accentColor}18 ${percent}%, #f8fafc ${percent}%);
                            box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <span class="font-black text-slate-900 text-lg truncate">${subtrack.name}</span>
                        <span class="flex-shrink-0 text-[11px] font-black text-slate-600 bg-white/90 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm tracking-wider">${percent}%</span>
                        ${blockerCount > 0 ? `<span class="flex-shrink-0 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">&#128274; ${blockerCount} blocker${blockerCount > 1 ? 's' : ''}</span>` : ''}
                    </div>

                    <div class="flex gap-2 items-center flex-shrink-0">
                        ${shouldShowManagement() ? `
                        <div class="flex gap-1" onclick="event.stopPropagation()">
                            <button onclick="addItem(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md hover:bg-emerald-100 font-bold border border-emerald-100 shadow-sm transition-colors uppercase tracking-wider">Add Item</button>
                            <button onclick="openSubtrackEdit(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md hover:bg-blue-100 font-bold border border-blue-100 shadow-sm transition-colors uppercase tracking-wider">Edit</button>
                            <button onclick="deleteSubtrack(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-red-50 text-red-700 px-2.5 py-1.5 rounded-md hover:bg-red-100 font-bold border border-red-100 shadow-sm transition-colors uppercase tracking-wider">Delete</button>
                        </div>
                        ` : ''}
                        <span class="ml-2 text-slate-400">
                            <svg class="w-5 h-5 transition-transform duration-200" id="${iconId}" ${rotateClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </span>
                    </div>
                </div>
            `;

            html += `<div id="body-${iconId}" ${collapsed ? 'style="display:none"' : ''}>`;
            const statusOrder = { "done": 1, "now": 2, "next": 3, "later": 4 };

            let items = itemsInTag.filter(item => isItemInDateRange(item) && isItemInSearch(item));
            const sortedItems = [...items].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

            if (sortedItems.length === 0) {
                html += `<div class="empty-subtrack">No items match current filters.</div>`;
            } else {
                sortedItems.forEach((item) => {
                    const originalIndex = subtrack.items.indexOf(item);
                    html += renderItem(item, 'track', trackIndex, subtrackIndex, originalIndex);
                });
            }

            if (shouldShowManagement()) {
                html += `
                    <div class="px-6 pb-4">
                        <button onclick="addItem(${trackIndex}, ${subtrackIndex})" class="cms-add-btn">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                            Add Item
                        </button>
                    </div>
                `;
            }
            html += `</div></div>`;
        });
        html += `</div>`;
    });
    if (contentArea) contentArea.innerHTML = html;
}

function toggleSubtrack(trackId, subtrackName, iconId) {
    const body = document.getElementById('body-' + iconId);
    const icon = document.getElementById(iconId);
    if (!body) return;
    const isNowCollapsed = body.style.display !== 'none';
    body.style.display = isNowCollapsed ? 'none' : '';
    if (icon) icon.style.transform = isNowCollapsed ? 'rotate(-90deg)' : '';
    setSubtrackCollapsed(trackId, subtrackName, isNowCollapsed);
}

function renderItem(item, viewPrefix = 'main', trackIndex, subtrackIndex, itemIndex, isGrooming = false) {
    const isRoadmap = viewPrefix === 'roadmap';
    const isEpicView = viewPrefix === 'epic';
    const mode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';
    const status = statusConfig[item.status];
    const priority = item.priority || 'medium';
    const priorityInfo = priorityConfig[priority];
    const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

    // Impact/Usecase (Focus for PM/Exec)
    const showImpactInline = (mode === 'pm' || mode === 'exec');
    const usecaseRaw = item.usecase ? `<div class="usecase-box ${!showImpactInline ? 'opacity-60 text-[11px]' : ''}"><span class="font-bold">Impact:</span> ${item.usecase}</div>` : '';
    const usecase = highlightSearch(usecaseRaw);

    const due = renderDueDateBadge(item);
    const tags = renderTagPills(item.tags);
    const blockerStrip = item.blocker ? `<div class="blocker-strip"><span class="blocker-badge">&#128274; Blocker</span>${item.blockerNote || 'This item is flagged as a blocker'}</div>` : '';

    const storyPointsHTML = item.storyPoints ? `<span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[9px] border border-slate-200 shadow-sm" title="Story Points">${item.storyPoints} SP</span>` : '';
    const displayText = highlightSearch(item.text);
    const effectiveNote = item.note || '';

    // --- STRATEGIC CONTEXT (Epics/OKRs) ---
    // Shown prominently for PM/Exec, tucked away for Dev unless critical
    let strategicContext = '';
    const showStrategyInline = (mode === 'pm' || mode === 'exec');

    const epics = UPDATE_DATA.metadata?.epics || [];
    const okrs = UPDATE_DATA.metadata?.okrs || [];

    if (item.epicId) {
        const epic = epics.find(e => e.id === item.epicId);
        if (epic) {
            let okrText = '';
            if (epic.linkedOKR) {
                const okr = okrs.find(o => o.id === epic.linkedOKR);
                okrText = okr ? `🎯 ${okr.objective.substring(0, 20)}...` : '';
            }
            if (showStrategyInline) {
                strategicContext = `
                    <div class="flex items-center gap-2 mt-2 mb-1">
                        <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black border border-indigo-100 flex items-center gap-1 shadow-sm" title="Strategic Epic">
                            🚀 ${epic.name}
                        </span>
                        ${okrText ? `<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-black border border-emerald-100 flex items-center gap-1 shadow-sm" title="Aligned OKR">${okrText}</span>` : ''}
                    </div>
                `;
            }
        }
    }

    // --- ROI SCORE ---
    // Primary for Exec/PM, Secondary for Dev
    const impactValues = { low: 1, medium: 2, high: 3 };
    const effortValues = { low: 3, medium: 2, high: 1 };
    let roiScoreHTML = '';
    if (item.impactLevel && item.effortLevel) {
        const impactNum = impactValues[item.impactLevel] || 1;
        const effortNum = effortValues[item.effortLevel] || 1;
        const score = Math.round((impactNum * effortNum) / 9 * 100);
        const scoreColor = score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : score >= 50 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-slate-500 bg-slate-50 border-slate-200';

        if (mode === 'exec' || mode === 'pm') {
            roiScoreHTML = `
                <div class="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded border ${scoreColor} text-[9px] font-black shadow-sm" title="Priority ROI Score (Impact/Effort)">
                    <span class="opacity-50">ROI</span> ${score}
                </div>
            `;
        }
    }

    // --- EXECUTION DETAILS (Acceptance Criteria, Effort/Impact Labels) ---
    // Shown inline for Dev/PM, hidden in Tooltip for Exec
    const showExecutionInline = (mode === 'pm' || mode === 'dev');

    let effortImpactHTML = '';
    if ((item.effortLevel || item.impactLevel) && showExecutionInline) {
        effortImpactHTML = `
            <div class="mt-2 pt-2 border-t border-slate-100 flex items-center">
                <div class="flex gap-4 text-[10px] uppercase tracking-wider">
                    ${item.effortLevel ? `<span><span class="font-black text-slate-400">Effort:</span> <span class="text-slate-700">${item.effortLevel}</span></span>` : ''}
                    ${item.impactLevel ? `<span><span class="font-black text-slate-400">Value:</span> <span class="text-slate-700">${item.impactLevel}</span></span>` : ''}
                </div>
            </div>
        `;
    }

    let acHTML = '';
    if (item.acceptanceCriteria && item.acceptanceCriteria.length > 0 && showExecutionInline) {
        acHTML = `
            <div class="mt-2 pt-2 border-t border-slate-100">
                <span class="block font-black text-slate-400 text-[10px] mb-1 uppercase tracking-wider">Acceptance Criteria</span>
                <ul class="list-disc pl-4 space-y-1 text-[10px] text-slate-600 font-medium">
                    ${item.acceptanceCriteria.map(ac => `<li>${ac}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Tooltip Content (Always has everything for accessibility)
    const idHTML = shouldShowManagement() ? `<div class="mt-2 pt-2 border-t border-slate-200 text-[0.65rem] font-mono text-slate-400">ID: ${item.id}</div>` : '';
    let cleanNote = effectiveNote ? effectiveNote.replace(/<[^>]*>?/gm, '').replace('Note:', '').trim() : '';
    cleanNote = highlightSearch(cleanNote);

    const tooltipHTML = `
        <div class="tooltip-content" role="tooltip">
            ${cleanNote ? `<span class="block font-bold mb-1">${item.note ? 'Item Note:' : 'Subtrack Note:'}</span><div class="mb-2 text-slate-600">${cleanNote}</div>` : ''}
            ${!showExecutionInline && (item.effortLevel || item.impactLevel) ? `
                <div class="my-2 py-2 border-t border-slate-100 flex justify-between text-[10px]">
                    <span>Effort: ${item.effortLevel || 'N/A'}</span>
                    <span>Value: ${item.impactLevel || 'N/A'}</span>
                </div>
            ` : ''}
            ${!showExecutionInline && item.acceptanceCriteria?.length > 0 ? `
                <div class="my-2 py-2 border-t border-slate-100">
                    <span class="font-bold">Acceptance Criteria:</span>
                    <ul class="list-disc pl-4 mt-1">${item.acceptanceCriteria.map(ac => `<li>${ac}</li>`).join('')}</ul>
                </div>
            ` : ''}
            ${idHTML}
        </div>
    `;

    let cmsControls = '';
    if (shouldShowManagement()) {
        cmsControls = `
            <div class="flex items-center gap-3 mt-1.5 flex-wrap ${isRoadmap ? 'opacity-40 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-300' : ''}">
                <span onclick="event.stopPropagation(); openItemEdit(undefined, undefined, undefined, '${item.id}')" class="text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer font-bold underline underline-offset-2">Edit</span>
                <span onclick="event.stopPropagation(); deleteItem(undefined, undefined, undefined, '${item.id}', '${viewPrefix}')" class="text-[11px] text-red-600 hover:text-red-800 cursor-pointer font-bold underline underline-offset-2">Delete</span>
                <button onclick="event.stopPropagation(); sendToBacklog(undefined, undefined, undefined, '${item.id}', '${viewPrefix}')" class="send-to-backlog-btn">→ Backlog</button>
                <button onclick="event.stopPropagation(); toggleBlocker(undefined, undefined, undefined, '${item.id}', '${viewPrefix}')" class="send-to-backlog-btn ${item.blocker ? 'text-red-600 border-red-200 bg-red-50' : ''}">${item.blocker ? '&#128275; Unblock' : '&#128274; Flag Blocker'}</button>
            </div>
        `;
    }

    // --- STRATEGIC CONNECTORS (Tactical Level) ---
    const personaLabels = {
        frontend: { label: '👤 FRONTEND', class: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        backend: { label: '👤 BACKEND', class: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        sre: { label: '👤 SRE / OPS', class: 'bg-rose-50 text-rose-700 border-rose-100' },
        product: { label: '👤 PRODUCT', class: 'bg-amber-50 text-amber-700 border-amber-100' },
        executive: { label: '👤 EXECUTIVE', class: 'bg-slate-900 text-white border-slate-900' },
        external: { label: '👤 EXTERNAL', class: 'bg-pink-50 text-pink-700 border-pink-100' }
    };

    const personaInfo = item.persona ? (personaLabels[item.persona] || { label: '👤 ALL personas', class: 'bg-slate-50 text-slate-500 border-slate-200' }) : null;
    const personaHTML = personaInfo ? `<span class="persona-badge ${personaInfo.class} mb-1">${personaInfo.label}</span>` : '';

    const metricRowHTML = item.successMetric ? `
        <div class="strategic-metric-row">
            <div class="strategic-metric-label">Quantitative Success Metric</div>
            <div class="strategic-metric-value">📊 ${item.successMetric}</div>
        </div>
    ` : '';

    return `
        ${blockerStrip}
        <div class="item-row ${status.bucket} ${mode}-perspective"
            draggable="${shouldShowManagement() ? 'true' : 'false'}"
            ondragstart="if(${shouldShowManagement()}){dragSource={trackIndex:${trackIndex},subtrackIndex:${subtrackIndex},itemIndex:${itemIndex}};this.classList.add('dragging');}"
            ondragend="this.classList.remove('dragging')">
            <div class="item-content">
                <div class="flex justify-between items-start w-full gap-4">
                    <div class="flex items-start gap-4 flex-1">
                        <div class="flex flex-col gap-1 items-center flex-shrink-0 mt-1">
                            <span class="status-pill ${status.class} text-[10px] py-0.5 w-full text-center min-w-[54px]">${status.label}</span>
                            <span class="status-pill ${priorityInfo.class} text-[9px] py-0 px-1 opacity-80 uppercase font-black tracking-tighter w-full text-center">${priorityLabel}</span>
                            ${personaHTML}
                        </div>
                        <div class="text-sm text-slate-800 font-semibold leading-tight flex-1">
                            <div class="info-wrapper mb-1">
                                <span class="info-text flex items-center">${displayText}${due}${storyPointsHTML}</span>
                                <button class="info-btn" aria-label="More information" onclick="event.stopPropagation(); document.getElementById('${viewPrefix}-tooltip-${item.id}').classList.toggle('visible')">i</button>
                                <span id="${viewPrefix}-tooltip-${item.id}" class="tooltip">${item.description || 'No detailed description available.'}</span>
                            </div>
                            <div class="flex flex-wrap items-center gap-2 mb-1">
                                ${strategicContext}
                                ${!isRoadmap ? `
                                    ${item.sprintId ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">🏃 ${(UPDATE_DATA.metadata.sprints || []).find(s => s.id === item.sprintId)?.name || item.sprintId}</span>` : ''}
                                    ${item.releasedIn ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">📦 ${(UPDATE_DATA.metadata.releases || []).find(r => r.id === item.releasedIn)?.name || item.releasedIn}</span>` : ''}
                                ` : ''}
                                ${mode !== 'exec' && tags ? `<div class="flex flex-wrap gap-1">${tags}</div>` : ''}
                            </div>
                            ${!isRoadmap ? `
                                <div class="mb-2">${usecase}</div>
                                ${metricRowHTML}
                                ${effortImpactHTML}
                                ${acHTML}
                            ` : ''}
                            <div class="flex flex-wrap items-center gap-2 mt-2">
                                <button id="${viewPrefix}-comment-btn-${item.id}" onclick="event.stopPropagation(); toggleComments(${trackIndex}, ${subtrackIndex}, ${itemIndex}, '${item.id}', '${viewPrefix}')" class="text-[11px] font-bold px-2 py-1 ${isRoadmap ? 'bg-slate-50 text-slate-400 opacity-60 hover:opacity-100 hover:bg-slate-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded transition-all">💬 ${(item.comments || []).length} Comments</button>
                                ${cmsControls ? `<div>${cmsControls}</div>` : ''}
                            </div>

                            ${isGrooming ? `
                                <div class="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4" onclick="event.stopPropagation()">
                                    <div>
                                        <label class="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 tracking-wider">Priority</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'priority', this.value, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
                                            <option value="medium" ${item.priority === 'medium' || !item.priority ? 'selected' : ''}>Medium</option>
                                            <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 tracking-wider">Epic</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'epicId', this.value, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">No Epic</option>
                                            ${(UPDATE_DATA.metadata.epics || []).map(e => `<option value="${e.id}" ${item.epicId === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 tracking-wider">🏃 Sprint</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'sprintId', this.value, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">No Sprint</option>
                                            ${(UPDATE_DATA.metadata.sprints || []).map(s => `<option value="${s.id}" ${item.sprintId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 tracking-wider">📦 Release</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'releasedIn', this.value, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">No Release</option>
                                            ${(UPDATE_DATA.metadata.releases || []).find(r => r.id === item.releasedIn)?.name || item.releasedIn}
                                            ${(UPDATE_DATA.metadata.releases || []).map(r => `<option value="${r.id}" ${item.releasedIn === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 tracking-wider">🎯 Horizon</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'planningHorizon', this.value, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">None</option>
                                            ${((UPDATE_DATA.metadata && UPDATE_DATA.metadata.roadmap) || [
                { id: '1M', label: 'Now (Immediate / 1 Month)' },
                { id: '3M', label: 'Next (Strategic / 3 Months)' },
                { id: '6M', label: 'Later (Future / 6 Months)' }
            ]).map(h => `<option value="${h.id}" ${item.planningHorizon === h.id ? 'selected' : ''}>${h.label}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            ` : ''}
                            <div id="${viewPrefix}-comments-${item.id}" class="${window.uiState?.openComments?.has(item.id) ? '' : 'hidden'} w-full mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg" onclick="event.stopPropagation()">
                                <div id="${viewPrefix}-thread-${item.id}" class="space-y-3 mb-3 max-h-48 overflow-y-auto pr-2">
                                    ${renderCommentThread(item.comments, trackIndex, subtrackIndex, itemIndex, item.id, viewPrefix)}
                                </div>
                                ${shouldShowManagement() ? `
                                    <div class="flex gap-2 relative">
                                        <input type="text" id="${viewPrefix}-comment-input-${item.id}" placeholder="Type @ to tag contributors..." class="cms-input flex-1 !mb-0 text-xs" onkeyup="if(event.key==='Enter') addComment(${trackIndex},${subtrackIndex},${itemIndex}, '${item.id}', '${viewPrefix}')">
                                        <button onclick="addComment(${trackIndex}, ${subtrackIndex}, ${itemIndex}, '${item.id}', '${viewPrefix}')" class="cms-btn cms-btn-primary !px-3 !py-1 flex-shrink-0 text-xs shadow-sm">Post</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex-shrink-0 flex flex-col items-end justify-between min-w-[110px] py-0.5">
                        <div class="flex flex-wrap justify-end gap-1">
                            ${renderContributors(item.contributors)}
                        </div>
                        <div class="flex flex-col items-end gap-2 mt-auto">
                            ${roiScoreHTML}
                            ${item.mediaUrl ? `
                                <div class="group relative inline-block">
                                    <a href="${item.mediaUrl}" target="_blank" onclick="event.stopPropagation()">
                                        <img src="${item.mediaUrl}" class="h-10 w-16 object-cover rounded border border-slate-200 shadow-sm cursor-zoom-in hover:scale-105 transition-transform" 
                                             onerror="this.style.display='none'">
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ------ Status View ------
function renderStatusView() {
    const container = document.getElementById('status-view');
    const statuses = ['done', 'now', 'next', 'later'];
    const statusTitles = { done: 'Done', now: 'Now', next: 'Next', later: 'Later' };

    let ribbonHtml = `
        <div id="status-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <!-- Group 1: Navigation/Breadcrumb -->
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">📊</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Tactical Health Tracking</span>
                    <h2 class="text-sm font-black text-slate-800">Status Categorization</h2>
                </div>
            </div>

            <!-- Group 2: Actions -->
            <div class="flex items-center gap-2">
                <div id="status-next-action-mount">
                    ${renderPrimaryStageAction('status')}
                </div>
            </div>
        </div>
    `;

    let html = ribbonHtml;
    const activeTeam = getActiveTeam();

    statuses.forEach(status => {
        let items = [];
        UPDATE_DATA.tracks.forEach((track, trackIndex) => {
            if (activeTeam && activeTeam !== track.name) return;
            track.subtracks.forEach((subtrack, subtrackIndex) => {
                subtrack.items.forEach((item, itemIndex) => {
                    if (item.status === status && isItemMatchingTagFilter(item) && isItemInDateRange(item) && isItemInSearch(item)) {
                        items.push({ ...item, track: track.name, trackTheme: track.theme, subtrack: subtrack.name, trackIndex, subtrackIndex, itemIndex });
                    }
                });
            });
        });

        if (items.length > 0) {
            const config = statusConfig[status];
            html += `
                <div class="status-card">
                    <div class="${config.class} text-white px-6 py-4 font-bold flex items-center gap-3 text-lg status-sticky-header">
                        ${statusTitles[status]}
                        <span class="ml-auto text-sm font-normal opacity-90">${items.length} items</span>
                    </div>
                    <div class="p-1">
            `;
            items.forEach(item => {
                const trackColor = themeColors[item.trackTheme] || '#64748b';
                const allStatuses = ['later', 'next', 'now', 'qa', 'review', 'blocked', 'onhold', 'done'];
                const statusOpts = allStatuses.map(s => `<option value="${s}" ${s === item.status ? 'selected' : ''}>${s}</option>`).join('');
                html += `
                    <div class="item-row hover:bg-slate-50 transition-colors">
                        <div class="flex-1">
                            <span style="color: ${trackColor}; background: ${trackColor}10;" class="px-2 py-0.5 rounded-md font-bold text-[0.65rem] uppercase tracking-wider inline-block mb-1.5 border border-slate-200">
                                ${item.track} &rarr; ${item.subtrack}
                            </span>
                            ${renderItem(item, 'status', item.trackIndex, item.subtrackIndex, item.itemIndex)}
                        </div>
                    </div>
                    ${shouldShowManagement() ? `<div class="quick-assign-bar">
                        <span class="quick-assign-label">Move to:</span>
                        <select class="quick-assign-select" onchange="quickChangeStatus('${item.id}', this.value)">
                            ${statusOpts}
                        </select>
                    </div>` : ''}`;
            });
            html += `</div></div>`;
        }
    });
    container.innerHTML = html;
}

// ------ Priority View ------
function renderPriorityView() {
    const container = document.getElementById('priority-view');
    const priorities = ['high', 'medium', 'low'];
    const priorityTitles = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };

    let html = `
        <div id="priority-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">⚡</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Definition · Items ranked by business priority</span>
                    <h2 class="text-sm font-black text-slate-800">Priority Matrix</h2>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div id="priority-next-action-mount">
                    ${renderPrimaryStageAction('priority')}
                </div>
            </div>
        </div>
    `;
    const activeTeam = getActiveTeam();

    priorities.forEach(priority => {
        let items = [];
        UPDATE_DATA.tracks.forEach((track, trackIndex) => {
            if (activeTeam && activeTeam !== track.name) return;
            track.subtracks.forEach((subtrack, subtrackIndex) => {
                subtrack.items.forEach((item, itemIndex) => {
                    const itemPriority = item.priority || 'medium';
                    if (itemPriority === priority && isItemMatchingTagFilter(item) && isItemInDateRange(item) && isItemInSearch(item)) {
                        items.push({ ...item, track: track.name, trackTheme: track.theme, subtrack: subtrack.name, trackIndex, subtrackIndex, itemIndex });
                    }
                });
            });
        });

        if (items.length > 0) {
            const config = priorityConfig[priority];
            html += `
                <div class="status-card">
                    <div class="${config.class} px-6 py-4 font-bold flex items-center gap-3 text-lg status-sticky-header">
                        ${priorityTitles[priority]}
                        <span class="ml-auto text-sm font-normal opacity-70">${items.length} items</span>
                    </div>
                    <div>
            `;
            items.forEach(item => {
                const trackColor = themeColors[item.trackTheme] || '#64748b';
                const priorityOpts = ['high', 'medium', 'low'].map(p => `<option value="${p}" ${p === (item.priority || 'medium') ? 'selected' : ''}>${p}</option>`).join('');
                html += `
                    <div class="item-row hover:bg-slate-50 transition-colors">
                        <span style="color: ${trackColor}; background: ${trackColor}10;" class="px-2 py-0.5 rounded-md font-bold text-[0.65rem] uppercase tracking-wider inline-block mb-1.5 border border-slate-200">
                            ${item.track} &rarr; ${item.subtrack}
                        </span>
                        ${renderItem(item, 'priority', item.trackIndex, item.subtrackIndex, item.itemIndex)}
                    </div>
                    ${shouldShowManagement() ? `<div class="quick-assign-bar">
                        <span class="quick-assign-label">Set priority:</span>
                        <select class="quick-assign-select" onchange="quickChangePriority('${item.id}', this.value)">
                            ${priorityOpts}
                        </select>
                    </div>` : ''}`;
            });
            html += `</div></div>`;
        }
    });
    container.innerHTML = html;
}

// ------ Contributor View ------
function renderContributorView() {
    const container = document.getElementById('contributor-view');
    const contributors = {};
    const activeTeam = getActiveTeam();

    let ribbonHtml = `
        <div id="contributor-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">👥</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery · Work distribution across team members</span>
                    <h2 class="text-sm font-black text-slate-800">Contributor Workload</h2>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div id="contributor-next-action-mount">
                    ${renderPrimaryStageAction('contributor')}
                </div>
            </div>
        </div>
    `;

    UPDATE_DATA.tracks.forEach((track, ti) => {
        if (activeTeam && activeTeam !== track.name) return;
        track.subtracks.forEach((subtrack, si) => {
            subtrack.items.forEach((item, ii) => {
                if (!isItemMatchingTagFilter(item) || !isItemInDateRange(item) || !isItemInSearch(item)) return;
                (item.contributors || []).forEach(name => {
                    if (!contributors[name]) contributors[name] = [];
                    contributors[name].push({ ...item, trackName: track.name, trackTheme: track.theme, trackIndex: ti, subtrackIndex: si, itemIndex: ii });
                });
            });
        });
    });

    const sortedNames = Object.keys(contributors).sort((a, b) => contributors[b].length - contributors[a].length);
    let html = ribbonHtml + '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';

    if (sortedNames.length === 0) {
        container.innerHTML = ribbonHtml + '<div class="text-center py-20 text-slate-400">No contributors found for current filters.</div>';
        return;
    }

    sortedNames.forEach(name => {
        const items = contributors[name];
        const statusOrder = ['done', 'now', 'next', 'later'];
        const colorClass = contributorColors[name] || 'bg-slate-600';
        const textColor = contributorColors[name] ? '' : 'text-white';

        html += `
            <div class="contributor-compact-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div class="${colorClass} ${textColor} px-4 py-2.5 font-black text-sm flex items-center justify-between border-b">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">${name.charAt(0)}</div>
                        ${name}
                    </div>
                    <span class="text-[10px] bg-white/10 px-1.5 py-0.5 rounded opacity-80 uppercase tracking-widest">${items.length} tasks</span>
                </div>
                <div class="p-2 space-y-3 bg-slate-50/30">`;

        statusOrder.forEach(status => {
            const statusItems = items.filter(i => i.status === status);
            if (statusItems.length === 0) return;

            const statusCfg = statusConfig[status] || { icon: '•', color: '#64748b' };
            html += `
                <div class="status-group mb-2 last:mb-0">
                    <div class="text-[9px] font-black uppercase tracking-widest mb-2 px-2 py-0.5 flex items-center gap-2 w-fit -ml-2 border-l-4 rounded-r" style="color: ${statusCfg.color}; background: ${statusCfg.color}10; border-color: ${statusCfg.color};">
                        ${status}
                    </div>
                    <div class="space-y-0.5 px-1">
                        ${statusItems.map(item => `
                            <div oncontextmenu="window.currentContextItem={ti:${item.trackIndex},si:${item.subtrackIndex},ii:${item.itemIndex}}; return false;" class="group relative flex items-center gap-2 p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white transition-all cursor-pointer" onclick="${shouldShowManagement() ? `openItemEdit(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex}, '${item.id}')` : ''}">
                                <div class="flex-1 text-[11px] font-medium text-slate-600 group-hover:text-slate-900 truncate" title="${item.text}">
                                    ${highlightSearch(item.text)}
                                </div>
                                ${item.priority === 'high' ? '<span class="text-[8px] text-red-500 font-black" title="High Priority">!</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        });
        html += `</div></div>`;
    });
    container.innerHTML = html + '</div>';
}

// ------ Backlog View ------
let groomingMode = false;
function toggleGroomingMode() {
    groomingMode = !groomingMode;
    renderTrackView(); // from views.js
    updateBacklogBadge(); // from cms.js
    buildTagFilterBar(); // from core.js
    updateTabCounts(); // from core.js
    renderBlockerStrip(); // from core.js
    renderBacklogView();
}

function renderBacklogView() {
    const container = document.getElementById('backlog-view');
    let html = '';
    if (shouldShowManagement()) {
        const ribbonHtml = `
            <div id="backlog-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <!-- Group 1: Navigation/Breadcrumb -->
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">📚</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Definition · Items waiting to be planned into a sprint</span>
                        <h2 class="text-sm font-black text-slate-800">Engineering Backlog</h2>
                    </div>
                </div>

                <!-- Group 2: Actions -->
                <div class="flex items-center gap-2">
                    <div id="backlog-next-action-mount">
                        ${renderPrimaryStageAction('backlog')}
                    </div>
                    
                    <div class="h-6 w-[1px] bg-slate-200 mx-2"></div>
                    <button onclick="toggleGroomingMode()" 
                        class="px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg flex items-center gap-2 active:scale-95 ${groomingMode ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-4 ring-emerald-500/10' : 'bg-slate-900 text-white hover:bg-slate-800'}">
                        ${groomingMode ? '✅ Grooming Active' : '🔧 Enter Grooming Mode'}
                    </button>
                </div>
            </div>
        `;
        html += ribbonHtml;
    }

    let totalItems = 0;
    const activeTeam = getActiveTeam();
    UPDATE_DATA.tracks.forEach((track, trackIndex) => {
        if (activeTeam && activeTeam !== track.name) return;
        const backlogSub = track.subtracks.find(s => s.name === 'Backlog');
        if (!backlogSub || !backlogSub.items.length) return;
        totalItems += backlogSub.items.length;

        const si = track.subtracks.indexOf(backlogSub);
        html += `<div class="backlog-track-card mb-6 overflow-hidden ${groomingMode ? 'border-2 border-indigo-400 shadow-xl scale-[1.01] transform transition-all' : ''}">
            <div class="p-4 bg-slate-100 font-extrabold border-b flex justify-between items-center text-slate-700">
                <span class="flex items-center gap-2">🏗️ ${track.name} Backlog <span class="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">${backlogSub.items.length}</span></span>
                ${shouldShowManagement() ? `<button onclick="addItem(${trackIndex}, ${si})" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 transition-all"><span>+</span> Add Item</button>` : ''}
            </div>
            <div class="p-3 space-y-3 bg-white">`;
        const sprints = (UPDATE_DATA.metadata?.sprints || []);
        backlogSub.items.forEach((item, ii) => {
            html += `<div class="backlog-item-wrapper">`;
            html += renderItem(item, 'backlog', trackIndex, si, ii, groomingMode);
            if (shouldShowManagement() && sprints.length > 0) {
                const assignedSprint = sprints.find(s => s.id === item.sprintId);
                const sprintOptions = sprints.map(s => `<option value="${s.id}" ${item.sprintId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
                html += `
                    <div class="backlog-sprint-assign">
                        ${assignedSprint
                            ? `<span class="backlog-sprint-badge assigned">🏃 ${assignedSprint.name}</span>`
                            : `<span class="backlog-sprint-badge unplanned">⚪ Unplanned</span>`
                        }
                        <select class="backlog-sprint-select" onchange="quickAssignSprint('${item.id}', this.value)">
                            <option value="">→ Assign to Sprint…</option>
                            ${sprintOptions}
                        </select>
                    </div>
                `;
            }
            html += `</div>`;
        });
        html += `</div></div>`;
    });
    if (!totalItems) {
        const showMgmt = shouldShowManagement()
        container.innerHTML = (html || '') + `
            <div class="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center mt-4">
                <div class="text-6xl mb-4">📋</div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">No backlog items yet</h3>
                <p class="text-slate-500 text-sm mb-6">Start by capturing ideas in Ideation or breaking down your Epics into actionable tasks.</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="switchView('ideation')" class="cms-btn cms-btn-secondary">Browse Ideation →</button>
                    ${showMgmt ? `<button onclick="addItem(0,0)" class="cms-btn cms-btn-primary">+ Add First Item</button>` : ''}
                </div>
            </div>`;
        return
    }
    container.innerHTML = html;
}

// ------ Epics View ------
function renderEpicLifecycle(currentStage) {
    const stages = [
        { id: 'vision', label: 'Vision', icon: '🎯' },
        { id: 'definition', label: 'Definition', icon: '📂' },
        { id: 'delivery', label: 'Delivery', icon: '⚡' },
        { id: 'review', label: 'Review', icon: '📊' }
    ];

    const currentIdx = stages.findIndex(s => s.id === currentStage);
    const effectiveIdx = currentIdx === -1 ? 1 : currentIdx; // Default to definition

    return `
        <div class="epic-lifecycle-container px-2 pb-6">
            ${stages.map((s, idx) => {
        const isActive = idx <= effectiveIdx;
        const isCurrent = idx === effectiveIdx;
        return `
                    <div class="epic-stage-pill ${isActive ? 'active' : ''}" style="${isActive ? `--stage-color: ${idx === 0 ? '#8b5cf6' : idx === 1 ? '#3b82f6' : idx === 2 ? '#10b981' : '#f59e0b'}` : ''}">
                        <div class="epic-stage-label ${isCurrent ? 'font-black' : ''}">
                            ${s.icon} ${s.label}
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

// ------ Epics View ------
function renderEpicsView() {
    const container = document.getElementById('epics-view');
    if (!container) return;

    const data = window.UPDATE_DATA || {};
    const epics = (data.metadata && data.metadata.epics) || [];
    const activeMode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';

    let ribbonHtml = `
        <div id="epics-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <!-- Group 1: Navigation/Breadcrumb -->
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">🚀</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Vision / Strategic Epics</span>
                    <h2 class="text-sm font-black text-slate-800">Engineering Epics</h2>
                </div>
            </div>

            <!-- Group 2: Actions -->
            <div class="flex items-center gap-2">
                <div id="epics-next-action-mount">
                    ${renderPrimaryStageAction('epics')}
                </div>
                
                ${shouldShowManagement() ? `
                <div class="h-6 w-[1px] bg-slate-200 mx-2"></div>
                <button onclick="openEpicEdit()" 
                    class="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 active:scale-95">
                    <span class="text-lg">🏗️</span> Add Strategic Epic
                </button>
                ` : ''}
            </div>
        </div>
    `;

    let html = ribbonHtml;

    if (epics.length === 0) {
        container.innerHTML = html + `<div class="text-center py-20 text-slate-400">
            No epics defined in metadata.epics. 
            <br><small>Data source: ${data.metadata ? 'Object present' : 'Object missing'}</small>
        </div>`;
        return;
    }

    epics.forEach((e, idx) => {
        const epicItems = findItemsByMetadataId('epicId', e.id);
        const doneCount = epicItems.filter(i => i.status === 'done').length;
        const progress = epicItems.length ? Math.round((doneCount / epicItems.length) * 100) : 0;

        const epicOKR = data.metadata.okrs?.find(o => o.id === e.linkedOKR);
        const epicHorizon = data.metadata.roadmap?.find(h => h.id === e.planningHorizon);

        const cmsActions = shouldShowManagement() ? `
            <div class="flex flex-wrap gap-2 ml-auto">
                <button onclick="openEpicEdit(${idx})" class="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">Edit</button>
                <button onclick="deleteEpic(${idx})" class="text-rose-600 hover:text-rose-800 text-[10px] font-black uppercase tracking-widest bg-rose-50 px-2 py-1 rounded">Delete</button>
                <button onclick="groomEpicTasks('${e.id}')" class="text-sky-600 hover:text-sky-800 text-[10px] font-black uppercase tracking-widest bg-sky-50 px-2 py-1 rounded">Groom Tasks 📚</button>
                <button onclick="addItem(0, 0, { epicId: '${e.id}' })" class="text-emerald-600 hover:text-emerald-800 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">➕ Task</button>
            </div>
        ` : '';

        // COMPACT IA Section Mapping: WHAT, WHERE, WHEN, HOW
        const strategicGrid = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4 items-start">
                <!-- WHAT: Vision & Success -->
                <div class="md:col-span-1 space-y-2">
                    <span class="text-slate-400 font-black uppercase text-[8px] tracking-[0.2em] block">Epic Vision (The What)</span>
                    <div class="text-xs font-bold text-slate-800 leading-snug line-clamp-3" title="${e.description || ''}">${e.description || 'No vision statement provided.'}</div>
                    ${e.successCriteria ? `
                    <div class="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 mt-2">
                        <span class="text-indigo-400 font-black uppercase text-[8px] tracking-[0.2em] block mb-1">Success Criteria</span>
                        <div class="text-[10px] font-black text-indigo-900 leading-tight">${e.successCriteria}</div>
                    </div>
                    ` : ''}
                </div>

                <!-- WHERE: Strategic Alignment -->
                <div class="space-y-2">
                    <span class="text-slate-400 font-black uppercase text-[8px] tracking-[0.2em] block">Alignment (The Where)</span>
                    ${epicOKR ? `
                        <div class="px-3 py-2 bg-white border border-indigo-600/10 rounded-lg shadow-sm">
                            <div class="flex justify-between items-center mb-0.5">
                                <div class="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Objective</div>
                                ${e.strategicWeight ? `<div class="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1 rounded">${e.strategicWeight}% Weight</div>` : ''}
                            </div>
                            <button onclick="switchView('okr')" class="epic-okr-link" title="View OKR">🎯 ${epicOKR.objective}</button>
                        </div>
                    ` : ''}
                    ${epicHorizon ? `
                        <div class="px-3 py-2 bg-white border border-slate-900/10 rounded-lg shadow-sm mt-2">
                            <div class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Horizon</div>
                            <div class="text-[10px] font-black text-slate-800 truncate">🗺️ ${epicHorizon.label.split('(')[0]}</div>
                        </div>
                    ` : ''}
                </div>

                <!-- WHEN: Lifecycle -->
                <div class="md:col-span-1">
                     <span class="text-slate-400 font-black uppercase text-[8px] tracking-[0.2em] block mb-3 px-1">Epic Lifecycle (The When)</span>
                     ${renderEpicLifecycle(e.stage)}
                </div>

                <!-- HOW: Progress & Health -->
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 font-black uppercase text-[8px] tracking-[0.2em] block">Health (The How)</span>
                        <span class="px-1.5 py-0.5 bg-${e.health === 'on-track' ? 'green' : (e.health === 'caution' || e.health === 'at-risk' ? 'amber' : 'rose')}-100 text-${e.health === 'on-track' ? 'green' : (e.health === 'caution' || e.health === 'at-risk' ? 'amber' : 'rose')}-700 rounded font-black text-[8px] border border-current uppercase">
                            ${e.health}
                        </span>
                    </div>
                    
                    <div class="flex-1">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-[10px] font-black text-slate-700">${progress}% Complete</span>
                            <span class="text-[9px] font-bold text-slate-400">${doneCount}/${epicItems.length} Tasks</span>
                        </div>
                        <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div class="h-full bg-indigo-600 transition-all duration-700 ease-out" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        let epicItemsForCard = findItemsByMetadataId('epicId', e.id);
        const epicItemsHtml = epicItemsForCard.map(item => renderItem(item, 'epic', item.trackIndex, item.subtrackIndex, item.itemIndex)).join('');

        html += `
            <div class="sprint-card epic-card p-0 mb-8 overflow-hidden rounded-3xl" id="epic-${e.id}">
                <div class="epic-section-header">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-md ring-2 ring-slate-100">
                            ${(progress === 100) ? '✅' : (e.health === 'on-track' ? '🚀' : '⚠️')}
                        </div>
                        <div>
                            <div class="flex items-center gap-2 mb-0.5">
                                <div class="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Strategic Epic</div>
                                ${e.riskType && e.riskType !== 'none' ? `<span class="risk-badge risk-${e.riskType}">${e.riskType} Risk</span>` : ''}
                            </div>
                            <h2 class="text-lg font-black text-slate-900 tracking-tight leading-none">${e.name}</h2>
                        </div>
                        ${cmsActions}
                    </div>
                </div>
                
                <div class="p-5 bg-white border-b border-slate-50">
                    ${strategicGrid}
                </div>

                <!-- HOW Context: Tactical Execution (Unified Progressive Disclosure) -->
                <div class="bg-slate-50 border-t border-slate-100 items-contain">
                    <details class="epic-tactical-details group" ${window.uiState.openEpics.has(e.id) ? 'open' : ''} ontoggle="toggleEpicBacklog('${e.id}', this.open)">
                        <summary class="epic-tactical-summary">
                            <span class="group-open:rotate-180 transition-transform">▼</span>
                            ${activeMode === 'exec'
                ? 'View Tactical Execution Details'
                : 'View Execution Backlog & Strategic Tools <span class="pm-mode-indicator">PM Mode</span>'}
                        </summary>
                        <div class="epic-tactical-scroll p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div class="border border-t-0 p-0 rounded-b-lg overflow-hidden">
                                ${epicItemsHtml}
                            </div>
                        </div>
                    </details>
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

// ------ Roadmap View ------
function renderRoadmapView() {
    const container = document.getElementById('roadmap-view');
    if (!container) return;
    const data = window.UPDATE_DATA || {};
    const horizons = data.metadata?.roadmap || [];
    const showManagement = shouldShowManagement();

    let ribbonHtml = `
        <div id="roadmap-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <!-- Group 1: Navigation/Breadcrumb -->
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">🗺️</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Future Product Horizons</span>
                    <h2 class="text-sm font-black text-slate-800">Strategic Roadmap</h2>
                </div>
            </div>

            <!-- Group 2: Actions -->
            <div class="flex items-center gap-2">
                <div id="roadmap-next-action-mount">
                    ${renderPrimaryStageAction('roadmap')}
                </div>
                
                ${showManagement ? `
                <div class="h-6 w-[1px] bg-slate-200 mx-2"></div>
                <button onclick="openRoadmapEdit()" 
                    class="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 active:scale-95">
                    <span class="text-lg">🛤️</span> Add Roadmap Item
                </button>
                ` : ''}
            </div>
        </div>
    `;

    if (horizons.length === 0) {
        container.innerHTML = ribbonHtml + `
            <div class="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                <div class="text-6xl mb-4">🏜️</div>
                <h3 class="text-xl font-bold text-slate-700">The Roadmap is Empty</h3>
                <p class="mt-2 text-sm text-slate-500">Add a planning horizon to start mapping your strategic vision.</p>
                ${showManagement ? `<button onclick="openRoadmapEdit()" class="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Add Item</button>` : ''}
            </div>
        `;
        return;
    }

    const _allRoadmapItems = horizons.flatMap(h => findItemsByMetadataId('planningHorizon', h.id));
    const _filteredRoadmapItems = applyExecFilter(_allRoadmapItems, 'roadmap');
    let html = ribbonHtml + renderExecFilterBanner(_filteredRoadmapItems.length, _allRoadmapItems.length, 'roadmap') + `<div class="grid grid-cols-1 gap-12">`;

    horizons.forEach(h => {
        const horizonItems = applyExecFilter(findItemsByMetadataId('planningHorizon', h.id), 'roadmap');
        const horizonOKR = data.metadata.okrs?.find(o => o.id === h.linkedObjective);

        const cmsActions = shouldShowManagement() ? `
            <div class="flex gap-2 ml-4">
                <button onclick="openRoadmapEdit('${h.id}')" class="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-widest bg-white/80 px-2 py-1 rounded border border-indigo-100 transition-colors">Edit</button>
                <button onclick="deleteRoadmap('${h.id}')" class="text-rose-600 hover:text-rose-800 text-[10px] font-black uppercase tracking-widest bg-white/80 px-2 py-1 rounded border border-rose-100 transition-colors">Delete</button>
            </div>
        ` : '';

        html += `
            <div class="roadmap-section mb-16">
                <div class="flex flex-col items-center mb-8">
                    <div class="flex items-center w-full gap-4 mb-4">
                        <div class="h-[2px] flex-1 bg-slate-200"></div>
                        <div class="px-6 py-3 bg-${h.color || 'slate'}-100 text-${h.color || 'slate'}-800 rounded-2xl font-black text-sm uppercase tracking-[0.2em] border-2 border-current flex items-center gap-4 shadow-md bg-white">
                            ${h.label || h.name}
                            ${cmsActions}
                            ${shouldShowManagement() ? `<button onclick="addItem(0, 0, { planningHorizon: '${h.id}' })" class="bg-${h.color || 'slate'}-600 text-white hover:scale-110 p-1.5 rounded-xl text-[10px] w-7 h-7 flex items-center justify-center transition-all shadow-lg" title="Add Task to this Horizon"><span>➕</span></button>` : ''}
                        </div>
                        <div class="h-[2px] flex-1 bg-slate-200"></div>
                    </div>
                    
                    ${horizonOKR ? `
                        <div class="w-full max-w-4xl px-8 py-6 bg-indigo-600 text-white rounded-3xl shadow-2xl relative overflow-hidden group">
                            <!-- Background Decoration -->
                            <div class="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div class="relative z-10 flex flex-col gap-2">
                                <div class="flex items-center gap-3">
                                    <span class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">Primary Strategic Alignment</span>
                                    <div class="h-[1px] flex-1 bg-indigo-400/30"></div>
                                </div>
                                <h3 class="text-xl font-black leading-tight flex items-start gap-4">
                                    <span class="text-3xl mt-1">🎯</span>
                                    <span>${horizonOKR.objective}</span>
                                </h3>
                                ${horizonOKR.keyResults ? `
                                    <div class="mt-4 pt-4 border-t border-indigo-400/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        ${Array.isArray(horizonOKR.keyResults) 
                                            ? horizonOKR.keyResults.map(kr => `
                                                <div class="flex items-start gap-2 text-xs font-medium text-indigo-100">
                                                    <span class="text-indigo-300">↳</span>
                                                    ${kr.description || kr}
                                                </div>
                                            `).join('')
                                            : (typeof horizonOKR.keyResults === 'string' ? horizonOKR.keyResults.split('\n').filter(s => s.trim()).map(s => `
                                                <div class="flex items-start gap-2 text-xs font-medium text-indigo-100">
                                                    <span class="text-indigo-300">↳</span>
                                                    ${s}
                                                </div>
                                            `).join('') : '')
                                        }
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : `
                        <div class="px-6 py-4 bg-slate-50 border border-slate-200 border-dashed rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                            No specific strategic objective linked to this horizon
                        </div>
                    `}
                </div>

                <div class="grid grid-cols-1 gap-6">
                    ${horizonItems.length > 0 ? renderGroupedItems(horizonItems, 'roadmap') : '<div class="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 italic text-sm">No strategic initiatives mapped to this horizon.</div>'}
                </div>
            </div>`;
    });

    html += '</div>';

    // Add backlog navigation footer — single authoritative entry point for unplanned items
    if (showManagement) {
        const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm';
        if (mode !== 'exec') {
            html += `
                <div class="roadmap-backlog-footer">
                    <span class="roadmap-backlog-label">📚 Backlog <span class="roadmap-backlog-sub">(items not yet assigned to a planning horizon)</span></span>
                    <button onclick="switchView('backlog')" class="roadmap-backlog-link">→ Open full Backlog view</button>
                </div>
            `;
        }
    }

    container.innerHTML = html || '<div class="text-center py-20 text-slate-400">Roadmap is empty. Use the button to add your first planning category.</div>';
}

// ------ Sprint View ------
function renderSprintView() {
    const container = document.getElementById('sprint-view');
    if (!container) return;
    const sprints = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.sprints) || [];

    let ribbonHtml = `
        <div id="sprint-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <!-- Group 1: Navigation/Breadcrumb -->
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">🏃</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Definition · Work your team has committed to this time window</span>
                    <h2 class="text-sm font-black text-slate-800">Sprint Management</h2>
                </div>
            </div>

            <!-- Group 2: Actions -->
            <div class="flex items-center gap-2">
                <div id="sprint-next-action-mount">
                    ${renderPrimaryStageAction('sprint')}
                </div>
                
                ${shouldShowManagement() ? `
                <div class="h-6 w-[1px] bg-slate-200 mx-2"></div>
                <button onclick="openSprintEdit()" 
                    class="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 active:scale-95">
                    <span class="text-lg">➕</span> Add New Sprint
                </button>
                ` : ''}
            </div>
        </div>
    `;

    // Collect all sprint items for exec banner total count
    const _allSprintItems = sprints.flatMap(s => findItemsByMetadataId('sprintId', s.id));
    const _filteredSprintItems = applyExecFilter(_allSprintItems, 'sprint');
    let html = ribbonHtml + renderExecFilterBanner(_filteredSprintItems.length, _allSprintItems.length, 'sprint');

    if (sprints.length === 0) {
        container.innerHTML = html + '<div class="text-center py-20 text-slate-400">No sprints defined</div>';
        return;
    }

    sprints.forEach((s, idx) => {
        const sprintItems = applyExecFilter(findItemsByMetadataId('sprintId', s.id), 'sprint');
        const cmsActions = shouldShowManagement() ? `
            <div class="flex gap-2 ml-4">
                <button onclick="openSprintEdit('${s.id}')" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-tighter">Edit</button>
                <button onclick="deleteSprint('${s.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold uppercase tracking-tighter">Delete</button>
                <button onclick="addItem(0, 0, { sprintId: '${s.id}' })" class="text-emerald-600 hover:text-emerald-800 text-xs font-bold uppercase tracking-tighter">➕ Task</button>
            </div>
        ` : '';

        const sprintOKR = UPDATE_DATA.metadata.okrs?.find(o => o.id === s.linkedOKR);

        // Compute which release(s) this sprint feeds into, via items' releasedIn field
        const releases = UPDATE_DATA.metadata?.releases || [];
        const releaseIdCounts = {};
        sprintItems.forEach(item => {
            if (item.releasedIn) releaseIdCounts[item.releasedIn] = (releaseIdCounts[item.releasedIn] || 0) + 1;
        });
        const topReleaseId = Object.keys(releaseIdCounts).sort((a, b) => releaseIdCounts[b] - releaseIdCounts[a])[0];
        const topRelease = topReleaseId ? releases.find(r => r.id === topReleaseId) : null;
        const releasePill = topRelease
            ? `<span class="sprint-release-pill" onclick="switchView('releases')" title="View release">📦 → ${topRelease.name}</span>`
            : '';

        // Sprint density: done vs total items
        const doneItems = sprintItems.filter(i => i.status === 'done').length;
        const totalSprintItems = sprintItems.length;
        const donePct = totalSprintItems > 0 ? Math.round((doneItems / totalSprintItems) * 100) : 0;
        const densityDots = totalSprintItems > 0
            ? Array.from({ length: Math.min(totalSprintItems, 10) }, (_, i) =>
                `<span class="sprint-density-dot ${i < Math.round(doneItems / totalSprintItems * Math.min(totalSprintItems, 10)) ? 'done' : ''}"></span>`
              ).join('')
            : '';

        html += `
            <div class="sprint-card bg-white border rounded-xl overflow-hidden mb-8 shadow-sm">
                <div class="p-6 bg-slate-50 border-b">
                    <div class="flex justify-between items-start">
                        <div>
                            ${sprintOKR ? `<div class="mb-2"><span class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black uppercase tracking-widest border border-indigo-100">🎯 Alignment: ${sprintOKR.objective.substring(0, 50)}${sprintOKR.objective.length > 50 ? '...' : ''}</span></div>` : ''}
                            <div class="flex items-center">
                                <div class="font-black text-2xl text-slate-900">${s.name}</div>
                                ${cmsActions}
                            </div>
                            <div class="flex items-center gap-3 mt-1 flex-wrap">
                                <span class="text-sm font-bold text-slate-500">📅 ${s.startDate || 'TBD'} - ${s.endDate || 'TBD'}</span>
                                ${releasePill}
                                ${shouldShowManagement() ? `<button onclick="promoteSprintToRelease('${s.id}')" class="sprint-promote-btn">📦 Promote Done Items →</button>` : ''}
                            </div>
                        </div>
                        <div class="text-right">
                             <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Capacity</div>
                             <span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold uppercase tracking-wider">${totalSprintItems} Tasks</span>
                             ${totalSprintItems > 0 ? `
                             <div class="sprint-density-bar mt-2">
                                 ${densityDots}
                             </div>
                             <div class="text-[10px] text-slate-400 mt-1 font-bold">${doneItems}/${totalSprintItems} done · ${donePct}%</div>
                             ` : ''}
                        </div>
                    </div>
                    <div class="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-600 italic">
                        <span class="font-bold text-slate-800 not-italic">Goal:</span> ${s.goal || 'No goal set for this sprint.'}
                    </div>
                </div>
                <div class="p-2 space-y-4">
                    ${renderGroupedItems(sprintItems, 'sprint')}
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

// ------ Releases View ------
function renderReleasesView() {
    const container = document.getElementById('releases-view');
    if (!container) return;
    const releases = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.releases) || [];

    let ribbonHtml = `
        <div id="releases-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <!-- Group 1: Navigation/Breadcrumb -->
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">📦</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Review · Ship completed work to stakeholders</span>
                    <h2 class="text-sm font-black text-slate-800">Engineering Releases</h2>
                </div>
            </div>

            <!-- Group 2: Actions -->
            <div class="flex items-center gap-2">
                <div id="releases-next-action-mount">
                    ${renderPrimaryStageAction('releases')}
                </div>
                
                ${shouldShowManagement() ? `
                <div class="h-6 w-[1px] bg-slate-200 mx-2"></div>
                <button onclick="openReleaseEdit()" 
                    class="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 active:scale-95">
                    <span class="text-lg">➕</span> Add New Release
                </button>
                ` : ''}
            </div>
        </div>
    `;

    const _allReleaseItems = releases.flatMap(r => findItemsByMetadataId('releasedIn', r.id));
    const _filteredReleaseItems = applyExecFilter(_allReleaseItems, 'releases');
    let html = ribbonHtml + renderExecFilterBanner(_filteredReleaseItems.length, _allReleaseItems.length, 'releases');

    if (releases.length === 0) {
        container.innerHTML = html + '<div class="text-center py-20 text-slate-400">No releases defined</div>';
        return;
    }

    releases.forEach((r, idx) => {
        const releaseItems = applyExecFilter(findItemsByMetadataId('releasedIn', r.id), 'releases');
        const cmsActions = shouldShowManagement() ? `
            <div class="flex gap-2 ml-4">
                <button onclick="openReleaseEdit('${r.id}')" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-tighter">Edit</button>
                <button onclick="deleteRelease('${r.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold uppercase tracking-tighter">Delete</button>
                <button onclick="addItem(0, 0, { releasedIn: '${r.id}' })" class="text-emerald-600 hover:text-emerald-800 text-xs font-bold uppercase tracking-tighter">➕ Task</button>
            </div>
        ` : '';

        const releaseOKR = UPDATE_DATA.metadata.okrs?.find(o => o.id === r.linkedOKR);

        html += `
            <div class="sprint-card bg-white border rounded-xl overflow-hidden mb-8 shadow-sm">
                <div class="p-6 bg-slate-50 border-b">
                    <div class="flex justify-between items-start">
                        <div>
                            ${releaseOKR ? `<div class="mb-2"><span class="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-black uppercase tracking-widest border border-amber-100">🚀 Strategic Value: ${releaseOKR.objective.substring(0, 50)}${releaseOKR.objective.length > 50 ? '...' : ''}</span></div>` : ''}
                            <div class="flex items-center">
                                <div class="font-black text-2xl text-slate-900">${r.name}</div>
                                ${cmsActions}
                            </div>
                            <div class="text-sm font-bold text-slate-500 mt-1">🎯 Target: ${r.targetDate || 'TBD'}</div>
                        </div>
                        <div class="text-right">
                             <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Scope</div>
                             <span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold uppercase tracking-wider">${releaseItems.length} Tasks</span>
                        </div>
                    </div>
                </div>
                ${(() => {
                    const epicsInRelease = [...new Map(
                        releaseItems.filter(i => i.epicId)
                            .map(i => {
                                const ep = (UPDATE_DATA.metadata?.epics || []).find(e => e.id === i.epicId)
                                return ep ? [ep.id, ep] : null
                            })
                            .filter(Boolean)
                    ).values()]
                    return epicsInRelease.length ? `
                        <div class="px-6 pb-3 flex flex-wrap gap-2 items-center">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Epics:</span>
                            ${epicsInRelease.map(ep => `<button onclick="switchView('epics')" class="release-epic-pill">📍 ${ep.name}</button>`).join('')}
                        </div>` : ''
                })()}
                <div class="p-2 space-y-4">
                    ${renderGroupedItemsWithReleaseAssign(releaseItems, releases, r.id)}
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

// ------ AGGREGATION HELPERS ------
function findItemsByMetadataId(key, value) {
    const found = [];
    const data = window.UPDATE_DATA || { tracks: [] };
    data.tracks.forEach((track, ti) => {
        track.subtracks.forEach((subtrack, si) => {
            subtrack.items.forEach((item, ii) => {
                if (item[key] === value) {
                    found.push({ ...item, trackName: track.name, trackTheme: track.theme, trackIndex: ti, subtrackIndex: si, itemIndex: ii });
                }
            });
        });
    });
    return found;
}

function renderGroupedItems(items, viewPrefix = 'main') {
    if (items.length === 0) return '<div class="text-center py-8 text-slate-400 italic text-sm">No items assigned yet.</div>';

    const grouped = {};
    items.forEach(i => {
        if (!grouped[i.trackName]) grouped[i.trackName] = { theme: i.trackTheme, items: [] };
        grouped[i.trackName].items.push(i);
    });

    return Object.keys(grouped).map(trackName => {
        const group = grouped[trackName];
        const color = themeColors[group.theme] || '#1e293b';
        return `
            <div class="mb-4 last:mb-0">
                <div class="px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-white rounded-t-lg" style="background: ${color}">
                    ${trackName}
                </div>
                <div class="border border-t-0 p-0 rounded-b-lg overflow-hidden">
                    ${group.items.map(item => renderItem(item, viewPrefix, item.trackIndex, item.subtrackIndex, item.itemIndex)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Renders items with an inline "Move to Release ▾" quick-assign bar below each item
function renderGroupedItemsWithReleaseAssign(items, allReleases, currentReleaseId) {
    if (items.length === 0) return '<div class="text-center py-8 text-slate-400 italic text-sm">No items in this release yet. Use "📦 Promote Done Items →" on a sprint, or assign items via the backlog.</div>';

    const grouped = {};
    items.forEach(i => {
        if (!grouped[i.trackName]) grouped[i.trackName] = { theme: i.trackTheme, items: [] };
        grouped[i.trackName].items.push(i);
    });

    const releaseOptions = allReleases.map(rel =>
        `<option value="${rel.id}" ${rel.id === currentReleaseId ? 'selected' : ''}>${rel.name}</option>`
    ).join('')

    return Object.keys(grouped).map(trackName => {
        const group = grouped[trackName];
        const color = themeColors[group.theme] || '#1e293b';
        return `
            <div class="mb-4 last:mb-0">
                <div class="px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-white rounded-t-lg" style="background: ${color}">
                    ${trackName}
                </div>
                <div class="border border-t-0 rounded-b-lg overflow-hidden">
                    ${group.items.map(item => `
                        <div>
                            ${renderItem(item, 'release', item.trackIndex, item.subtrackIndex, item.itemIndex)}
                            ${shouldShowManagement() ? `
                            <div class="quick-assign-bar release-assign-bar">
                                <span class="quick-assign-label">📦 Release:</span>
                                <select class="quick-assign-select" onchange="quickAssignRelease('${item.id}', this.value)">
                                    <option value="">— Unassigned —</option>
                                    ${releaseOptions}
                                </select>
                            </div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ------ Gantt View ------
function renderGanttView() {
    const container = document.getElementById('gantt-view');
    if (container) {
        const ribbonHtml = `
            <div id="gantt-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">📅</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery · Timeline of epics and milestones</span>
                        <h2 class="text-sm font-black text-slate-800">Gantt Timeline</h2>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <div id="gantt-next-action-mount">
                        ${renderPrimaryStageAction('gantt')}
                    </div>
                </div>
            </div>
            <div id="gantt-chart-container"></div>
        `;
        container.innerHTML = ribbonHtml;
    }
    // Use setTimeout to ensure container innerHTML is committed to DOM before Google Charts callback fires
    setTimeout(() => {
        google.charts.load('current', { 'packages': ['gantt'] });
        google.charts.setOnLoadCallback(drawGanttChart);
    }, 0);
}

function drawGanttChart() {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Task ID');
    data.addColumn('string', 'Task Name');
    data.addColumn('string', 'Resource');
    data.addColumn('date', 'Start Date');
    data.addColumn('date', 'End Date');
    data.addColumn('number', 'Duration');
    data.addColumn('number', 'Percent Complete');
    data.addColumn('string', 'Dependencies');

    const rows = [];
    const epics = UPDATE_DATA.metadata?.epics || [];

    epics.forEach(epic => {
        // Find date range from items in this epic if not explicitly set
        let startDate = epic.startDate ? new Date(epic.startDate) : null;
        let endDate = epic.endDate ? new Date(epic.endDate) : null;

        let totalItems = 0;
        let doneItems = 0;

        if (!startDate || !endDate) {
            // Scan items for dates if epic dates missing
            UPDATE_DATA.tracks.forEach(track => {
                track.subtracks.forEach(subtrack => {
                    subtrack.items.forEach(item => {
                        if (item.epicId === epic.id) {
                            totalItems++;
                            if (item.status === 'done') doneItems++;

                            if (item.startDate) {
                                const s = new Date(item.startDate);
                                if (!startDate || s < startDate) startDate = s;
                            }
                            if (item.due) {
                                const d = new Date(item.due);
                                if (!endDate || d > endDate) endDate = d;
                            }
                        }
                    });
                });
            });
        }

        if (startDate && endDate && startDate < endDate) {
            const percent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
            rows.push([
                epic.id,
                epic.name,
                epic.track || 'Strategy',
                startDate,
                endDate,
                null,
                percent,
                null
            ]);
        }
    });

    if (!rows.length) {
        document.getElementById('gantt-chart-container').innerHTML = `
            <div class="p-12 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <div class="text-4xl mb-3">📅</div>
                <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest">No Strategic Timeline</h3>
                <p class="text-xs text-slate-500 mt-2">Add dates to your Epics or Tasks to generate the strategic roadmap view.</p>
            </div>
        `;
        return;
    }

    data.addRows(rows);
    const options = {
        height: rows.length * 45 + 50,
        gantt: {
            trackHeight: 45,
            labelStyle: { fontName: 'Inter', fontSize: 11, color: '#1e293b' },
            barCornerRadius: 4
        }
    };
    const chart = new google.visualization.Gantt(document.getElementById('gantt-chart-container'));

    // Phase 9 Reset: High-fidelity action mapping
    window.openAddItemModal = function (type) {
        if (typeof addItem === 'function') {
            // Default to first track/subtrack for discovery items
            addItem(0, 0, {
                tags: [type],
                status: 'later',
                text: type === 'spike' ? '[SPIKE] ' : '[IDEA] '
            });
        } else {
            console.error('❌ CMS addItem handler not found!');
        }
    };

    google.visualization.events.addListener(chart, 'select', function () {
        const selection = chart.getSelection();
        if (selection.length > 0) {
            const row = selection[0].row;
            const epicId = data.getValue(row, 0);
            if (typeof openEpicEdit === 'function') openEpicEdit(epicId);
        }
    });

    chart.draw(data, options);
}

// Duplicate Epics view removed

function renderWorkflowView() {
    console.log('🔄 renderWorkflowView() V3');
    const container = document.getElementById('workflow-view');
    if (!container) return;

    try {
        if (typeof getCurrentMode === 'function') {
            const mode = getCurrentMode();
            if (mode === 'dev') currentWorkflowTab = 'dev';
            else if (mode === 'pm') currentWorkflowTab = 'pm';
        }

        // Standardized data for both personas
        const steps = (currentWorkflowTab === 'pm') ? [
            { phase: '1', cadence: 'Weekly', title: 'Ideation Sandbox', goal: 'Capture raw requests and future explorations.', insight: 'Discovery prevents backlog bloat by validating ideas early.', event: 'Ideation Sync', people: 'PM, Founders', view: 'ideation', label: 'Ideas' },
            { phase: '1', cadence: 'Bi-Weekly', title: 'Technical Spikes', goal: 'Validate research and feasibility through spikes.', insight: 'Spikes clear architectural blockers before roadmap commitment.', event: 'R&D Sync', people: 'Tech Leads', view: 'spikes', label: 'Spikes' },
            { phase: '2', cadence: 'Quarterly', title: 'Strategic OKRs', goal: 'Define high-level quarterly Objectives.', insight: 'OKRs align engineering output with business outcomes.', event: 'Exec Sync', people: 'Founders, PMs', view: 'okr', label: 'OKRs' },
            { phase: '2', cadence: 'Monthly', title: 'Strategic Epics', goal: 'Map quarterly goals to specific initiatives.', insight: 'Epics provide a container for tactical delivery focus.', event: 'Vision Sync', people: 'PM, EM', view: 'epics', label: 'Epics' },
            { phase: '3', cadence: 'Bi-Weekly', title: 'Roadmap Alignment', goal: 'Sort Epics into Now, Next, and Later horizons.', insight: 'Roadmaps provide predictability for stakeholders.', event: 'Horizon Sync', people: 'Founders, PMs', view: 'roadmap', label: 'Roadmap' },
            { phase: '3', cadence: 'Weekly', title: 'Backlog Grooming', goal: 'Ensure tasks are defined and ready.', insight: 'Groomed tasks prevent sprint-start friction.', event: 'PBR / Grooming', people: 'EM, Devs', view: 'backlog', label: 'Backlog' },
            { phase: '4', cadence: 'Bi-Weekly', title: 'Sprint Planning', goal: 'Commit to a 2-week cycle based on capacity.', insight: 'Predictability relies on realistic commitment.', event: 'Planning', people: 'Whole Team', view: 'sprint', label: 'Sprints' },
            { phase: '4', cadence: 'Daily', title: 'Kanban Execution', goal: 'Manage daily flow and signal task status.', insight: 'Real-time status stops the need for manual reports.', event: 'Standup', people: 'Developers', view: 'kanban', label: 'Kanban' },
            { phase: '4', cadence: 'Daily', title: 'Dependency Monitoring', goal: 'Visualize and unblock task relationships.', insight: 'Blockers are expensive; red-edge tracking prevents delay.', event: 'Escalation', people: 'EM, Devs', view: 'dependency', label: 'Blockers' },
            { phase: '5', cadence: 'Bi-Weekly', title: 'Analytics & Review', goal: 'Review velocity and performance trends.', insight: 'Data-driven retros lead to process optimization.', event: 'Retrospective', people: 'PM, EM, Devs', view: 'analytics', label: 'Metrics' }
        ] : [
            { phase: '1', cadence: 'Bi-Weekly', title: 'Exploration Spikes', goal: 'Technically validate roadmap items through R&D.', insight: 'Clears the path for standard sprint tasks.', event: 'Technical Disc.', people: 'EM, Devs', view: 'spikes', label: 'Spikes' },
            { phase: '2', cadence: 'Quarterly', title: 'Strategic Context', goal: 'Understand the "Why" behind your track\'s OKRs.', insight: 'Informed devs build more resilient systems.', event: 'Strategic Sync', people: 'PM, Devs', view: 'okr', label: 'OKRs' },
            { phase: '3', cadence: 'Weekly', title: 'Requirements Clarity', goal: 'Refine technical tasks and acceptance criteria.', insight: 'Detailed requirements protect developer focus.', event: 'PBR Sync', people: 'EM, Devs', view: 'backlog', label: 'Backlog' },
            { phase: '4', cadence: 'Daily', title: 'Task Ownership', goal: 'Manage your personal "My Tasks" list.', insight: 'Focus is the primary driver of quality.', event: 'Daily Focus', people: 'Developers', view: 'contributor', label: 'Focus' },
            { phase: '4', cadence: 'Daily', title: 'Status Signaling', goal: 'Signal active work in Kanban.', insight: 'Signals stop the PM from asking "How is it going?"', event: 'Status Sync', people: 'Devs', view: 'kanban', label: 'Kanban' },
            { phase: '4', cadence: 'Immediate', title: 'Blocker Disclosure', goal: 'Flag impediments immediately via capture modal.', insight: 'Blockers trigger the global strip for PM response.', event: 'Alert Sync', people: 'EM, PM', view: 'kanban', label: 'Blocker' },
            { phase: '4', cadence: 'Daily', title: 'Dependency Awareness', goal: 'Visualize what is blocking your work.', insight: 'Awareness of blockers prevents wasted R&D.', event: 'Blocker Review', people: 'Devs', view: 'dependency', label: 'Blockers' },
            { phase: '4', cadence: 'Daily', title: 'Sprint Commitments', goal: 'Maintain velocity through focused execution.', insight: 'Sustainable pace prevents team burnout.', event: 'Sprint Sync', people: 'Whole Team', view: 'sprint', label: 'Sprint' },
            { phase: '5', cadence: 'Bi-Weekly', title: 'Velocity Feedback', goal: 'Review team performance metrics.', insight: 'Self-optimization drives engineering excellence.', event: 'Velocity Retro', people: 'Devs, EM', view: 'analytics', label: 'Metrics' },
            { phase: '5', cadence: 'Quarterly', title: 'Process Learning', goal: 'Optimizing the workflow based on data.', insight: 'Ensures friction is never repeated.', event: 'Process Retro', people: 'Whole Team', view: 'roadmap', label: 'Roadmap' }
        ];

        let html = `
            <div class="max-w-3xl mx-auto py-10 px-6 mb-24">
                <!-- V3 MacOS-Style Header -->
                <div class="flex flex-col items-center mb-12 text-center">
                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Engineering Playbook</div>
                    <h2 class="text-3xl font-black text-slate-800 tracking-tight mb-8">Lifecycle Sequential Guide</h2>
                    
                    <div class="persona-picker-macos">
                        <button onclick="setWorkflowTab('pm')" class="tab-btn ${currentWorkflowTab === 'pm' ? 'active' : ''}">
                            <span>🏆</span> Product Managers
                        </button>
                        <button onclick="setWorkflowTab('dev')" class="tab-btn ${currentWorkflowTab === 'dev' ? 'active' : ''}">
                            <span>👩‍💻</span> Developers
                        </button>
                    </div>
                </div>

                <div class="relative">
                    <div class="roadmap-spine"></div>
                    
                    <div class="space-y-6">
        `;

        steps.forEach((step, index) => {
            const stepNum = step.phase + '.' + ((index % 5) + 1); // Grouped by phase visually
            html += `
                <div class="flex gap-6 group items-start">
                    <!-- Precise Roadmap Node -->
                    <div class="roadmap-node flex-shrink-0">
                        ${stepNum}
                    </div>

                    <!-- V3 Executive Card -->
                    <div class="playbook-card-v3 flex-1 rounded-2xl p-5 relative overflow-hidden">
                        <!-- Consolidated Meta Row -->
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <span class="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">Phase ${step.phase}</span>
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">${step.cadence}</span>
                            </div>
                            <button onclick="switchView('${step.view}')" class="btn-ghost-v3">
                                Go to ${step.label}
                            </button>
                        </div>

                        <h3 class="text-base font-black text-slate-800 mb-4 leading-tight">${step.title}</h3>

                        <div class="space-y-4">
                            <!-- Goal Line (High Density) -->
                            <div class="flex gap-3 items-center">
                                <div class="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                <span class="text-[11px] text-slate-600 font-medium">
                                    <span class="text-slate-400 font-black uppercase text-[8px] tracking-wider mr-2">Goal:</span>
                                    ${step.goal}
                                </span>
                            </div>

                            <!-- Structural Meta Grid -->
                            <div class="grid grid-cols-2 gap-4 py-2 border-y border-slate-100/50">
                                <div>
                                    <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Stakeholders</div>
                                    <div class="text-[10px] font-bold text-slate-600 truncate">${step.people}</div>
                                </div>
                                <div>
                                    <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Sync Event</div>
                                    <div class="text-[10px] font-bold text-indigo-500 truncate">${step.event}</div>
                                </div>
                            </div>

                            <!-- Minimalist Consultant Insight -->
                            <div class="insight-minimalist mt-2">
                                <div class="flex flex-col">
                                    <span class="label">Subtle Insight</span>
                                    <span class="content font-medium opacity-90">${step.insight}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
                
                <div class="mt-16 text-center">
                    <p class="text-[11px] text-slate-400 font-medium italic opacity-70">Guided by Khyaal Engineering Principles • Vision-First Lifecycle</p>
                </div>
            </div>
        `;

        container.innerHTML = html;
        console.log('✅ renderWorkflowView() V3');
    } catch (err) {
        console.error('❌ renderWorkflowView() V3 Error:', err);
    }
}

/**
 * Stage-Aware Action Helper
 */
/**
 * Granular View-to-View Alignment Funnel
 */
function renderPrimaryStageAction(currentView) {
    const viewActions = {
        'okr': { text: 'Build Epics 🚀', target: 'epics' },
        'epics': { text: 'Plan Roadmap 🗺️', target: 'roadmap' },
        'roadmap': { text: 'Groom Backlog 📚', target: 'backlog' },
        'backlog': { text: 'Scope Sprints 🏃', target: 'sprint' },
        'sprint': { text: 'Execute Tasks ⚡', target: 'track' },
        'track': { text: 'Plan Next Sprint 🏃', target: 'sprint' },
        'kanban': { text: 'Ship to Release 📦', target: 'releases' },
        'my-tasks': { text: 'Review Pulse 📊', target: 'dashboard' },
        'dashboard': { text: 'Plan Next Quarter 🎯', target: 'okr' },
        'analytics': { text: 'Plan Next Quarter 🎯', target: 'okr' },
        'capacity': { text: 'Scope Sprints 🏃', target: 'sprint' },
        'status': { text: 'Ship to Release 📦', target: 'releases' },
        'priority': { text: 'Ship to Release 📦', target: 'releases' },
        'contributor': { text: 'Review Pulse 📊', target: 'dashboard' },
        'dependency': { text: 'Review Pulse 📊', target: 'dashboard' },
        'gantt': { text: 'Review Pulse 📊', target: 'dashboard' },
        'releases': { text: 'Review Analytics 📊', target: 'analytics' },
        'workflow': { text: 'Start with OKRs 🎯', target: 'okr' },
        'discovery': { text: 'Explore Spikes 🧪', target: 'spikes' },
        'ideation': { text: 'Explore Spikes 🧪', target: 'spikes' },
        'spikes': { text: 'Set Vision 🎯', target: 'okr' }
    };

    const action = viewActions[currentView] || { text: 'Set Vision 🎯', target: 'okr' };

    return `
        <button id="next-action-btn" onclick="switchView('${action.target}')" class="bg-white border-2 border-slate-100 text-slate-700 px-4 py-2 rounded-xl font-black text-xs hover:bg-slate-50 transition-all shadow-sm group">
            Next: <span class="group-hover:text-indigo-600 transition-colors">${action.text}</span>
        </button>
    `;
}

/**
 * Discovery / Ideation View (Stage 1)
 */
function renderDiscoveryView() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Correct view context retrieval
    const currentView = window.currentActiveView || 'ideation';
    const title = currentView === 'spikes' ? 'Technical Spikes' : 'Ideation Sandbox';

    let ribbonHtml = `
        <div id="discovery-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <!-- Group 1: Navigation/Breadcrumb -->
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">🔍</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Discovery / Exploration & Ideation</span>
                    <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest">${title}</h2>
                </div>
            </div>
            
            <div class="flex items-center gap-3">
                <button onclick="openAddItemModal('${currentView === 'ideation' ? 'idea' : 'spike'}')" 
                        class="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-lg shadow-indigo-100 hover:bg-slate-900 transition-all">
                    + Add ${currentView === 'ideation' ? 'Idea' : 'Spike'}
                </button>
                <button onclick="switchView('${currentView === 'ideation' ? 'spikes' : 'okr'}')" 
                        class="bg-white text-slate-900 border border-slate-200 px-4 py-1.5 rounded-lg text-xs font-black hover:bg-slate-50 transition-all flex items-center gap-2">
                    Next: ${currentView === 'ideation' ? 'Explore Spikes' : 'Set Strategy'} 🚀
                </button>
            </div>
        </div>
    `;

    // Filter for ideas and spikes across all tracks
    let allItems = [];
    if (UPDATE_DATA && UPDATE_DATA.tracks) {
        UPDATE_DATA.tracks.forEach(t => {
            if (t.subtracks) {
                t.subtracks.forEach(s => {
                    if (s.items) {
                        s.items.forEach(i => {
                            const tags = (i.tags || []).map(tag => tag.toLowerCase());
                            const isSpike = tags.includes('spike');
                            const isIdea = tags.includes('idea') || tags.includes('discovery') || tags.includes('exploration');
                            const isLater = i.status === 'later' || i.status === 'done';

                            // Differentiate content by view
                            if (allItems.length < 500) { // Safety limit
                                if (currentView === 'ideation' && (isIdea || (isLater && !isSpike))) {
                                    allItems.push({
                                        ...i,
                                        track: t.name,
                                        subtrack: s.name,
                                        trackIndex: UPDATE_DATA.tracks.indexOf(t),
                                        subtrackIndex: t.subtracks.indexOf(s),
                                        itemIndex: s.items.indexOf(i)
                                    });
                                } else if (currentView === 'spikes' && isSpike) {
                                    allItems.push({
                                        ...i,
                                        track: t.name,
                                        subtrack: s.name,
                                        trackIndex: UPDATE_DATA.tracks.indexOf(t),
                                        subtrackIndex: t.subtracks.indexOf(s),
                                        itemIndex: s.items.indexOf(i)
                                    });
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    if (allItems.length === 0) {
        console.warn(`⚠️ renderDiscoveryView('${currentView}'): No items found matching criteria.`);
    }

    let html = ribbonHtml + `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${allItems.length > 0 ? allItems.map(item => `
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col h-full">
                    <div class="flex justify-between items-start mb-4">
                        <span class="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                            ${item.track}
                        </span>
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-tighter">${item.status}</span>
                    </div>
                    
                    <h3 class="text-lg font-black text-slate-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">${item.text}</h3>
                    
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${(item.tags || []).map(tag => `
                            <span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">#${tag}</span>
                        `).join('')}
                    </div>
                </div>
            `).join('') : `
                <div class="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                    <div class="text-5xl mb-4">💡</div>
                    <h3 class="text-xl font-black text-slate-900">No active discovery items</h3>
                    <p class="text-slate-500 mt-2">Tag items with #idea or #spike in the backlog to see them here.</p>
                </div>
            `}
        </div>
    `;

    const targetId = `${currentView}-view`;
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
        targetEl.innerHTML = html;
        console.log(`✨ Rendered DiscoveryView('${currentView}') to #${targetId}`);
    } else {
        console.warn(`⚠️ Target element #${targetId} not found for Discovery rendering.`);
    }
}

// Export
window.renderDiscoveryView = renderDiscoveryView;
console.log('✅ views.js fully loaded including Discovery');
