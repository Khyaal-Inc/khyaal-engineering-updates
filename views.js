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
                    <span class="text-[10px] font-medium text-slate-400">Engineering Playbook</span>
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
                    <div class="text-[10px] font-medium text-slate-400">Output</div>
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
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-2 flex-wrap text-[10px] font-medium text-slate-500">
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
        const _trackSource = (typeof getActiveTracks === 'function') ? getActiveTracks() : (UPDATE_DATA.tracks || [])
        const teams = Array.from(new Set(_trackSource.filter(tr => tr.name).map(tr => tr.name)));
        const teamOptions = teams.map(n => `<option value="${n}">${n}</option>`).join('');

        container.innerHTML = `
            <div id="track-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <!-- Group 0: Title -->
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">🏗️</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-medium text-slate-400">Delivery · All work organized by engineering team — see who owns what</span>
                        <h2 class="text-sm font-black text-slate-800">Engineering Tracks</h2>
                    </div>
                    ${typeof renderInfoButton === 'function' ? renderInfoButton('track') : ''}
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
            ${typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('track') : ''}
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
                        <span class="text-xl font-bold">${track.name}</span>
                        <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 border border-white/20 backdrop-blur-sm" title="Team Pulse: ${healthScore}% Healthy">
                            <div class="w-2 h-2 rounded-full ${healthColor} ${healthScore < 90 ? 'animate-pulse' : ''}"></div>
                            <span class="text-[10px] font-medium">${healthStatus}</span>
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
                        <span class="font-semibold text-slate-900 text-base truncate">${subtrack.name}</span>
                        <span class="flex-shrink-0 text-[11px] font-semibold text-slate-600 bg-white/90 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">${percent}%</span>
                        ${blockerCount > 0 ? `<span class="flex-shrink-0 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">🔒 ${blockerCount} blocker${blockerCount > 1 ? 's' : ''}</span>` : ''}
                    </div>

                    <div class="flex gap-2 items-center flex-shrink-0">
                        ${shouldShowManagement() ? `
                        <div class="flex gap-1" onclick="event.stopPropagation()">
                            <button onclick="addItem(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md hover:bg-emerald-100 font-medium border border-emerald-100 transition-colors">+ Item</button>
                            <button onclick="openSubtrackEdit(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md hover:bg-blue-100 font-medium border border-blue-100 transition-colors">Edit</button>
                            <button onclick="deleteSubtrack(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-red-50 text-red-700 px-2.5 py-1.5 rounded-md hover:bg-red-100 font-medium border border-red-100 transition-colors">Delete</button>
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
    const status = statusConfig[item.status] || { label: item.status || 'Unknown', class: 'badge-later', bucket: 'bucket-later' };
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

    const storyPointsHTML = item.storyPoints ? `<span class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200" title="Story Points">${item.storyPoints} SP</span>` : '';
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
                    <div class="flex items-center gap-2 mt-1.5 mb-0.5">
                        <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-100 flex items-center gap-1" title="Strategic Epic">
                            🚀 ${epic.name}
                        </span>
                        ${okrText ? `<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100 flex items-center gap-1" title="Aligned OKR">${okrText}</span>` : ''}
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
                <div class="flex gap-4 text-[10px]">
                    ${item.effortLevel ? `<span><span class="font-medium text-slate-400">Effort:</span> <span class="text-slate-700">${item.effortLevel}</span></span>` : ''}
                    ${item.impactLevel ? `<span><span class="font-medium text-slate-400">Value:</span> <span class="text-slate-700">${item.impactLevel}</span></span>` : ''}
                </div>
            </div>
        `;
    }

    let acHTML = '';
    if (item.acceptanceCriteria && item.acceptanceCriteria.length > 0 && showExecutionInline) {
        acHTML = `
            <div class="mt-2 pt-2 border-t border-slate-100">
                <span class="block font-medium text-slate-400 text-[10px] mb-1">Acceptance Criteria</span>
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
        const linkedEpic = item.epicId ? (UPDATE_DATA.metadata?.epics || []).find(e => e.id === item.epicId) : null;
        let okrAction = '';
        if (linkedEpic && linkedEpic.linkedOKR) {
            const linkedOkr = (UPDATE_DATA.metadata?.okrs || []).find(o => o.id === linkedEpic.linkedOKR);
            if (linkedOkr) {
                okrAction = `<button onclick="event.stopPropagation(); switchView('okr'); showHandoffToast('Update KR progress in the OKR panel →', null, null, 3500)" class="item-action-btn okr" title="Jump to OKR: ${(linkedOkr.title || linkedOkr.objective || '').replace(/"/g, '&quot;')}">↗ ${(linkedEpic.name || 'Epic').replace(/</g,'&lt;')}</button>`;
            }
        }

        // Lifecycle-aware quick actions — show only what's relevant per stage
        // Stage is inferred from viewPrefix (which view is rendering this item)
        const viewStageMap = {
            roadmap: 'definition', backlog: 'definition', gantt: 'definition',
            sprint: 'delivery', main: 'delivery', kanban: 'delivery', track: 'delivery', dependency: 'delivery',
            releases: 'review', analytics: 'review', status: 'review', priority: 'review', contributor: 'review',
            okr: 'vision', epics: 'vision',
            ideation: 'discovery', spikes: 'discovery', discovery: 'discovery'
        }
        const itemStage = viewStageMap[viewPrefix] || viewStageMap[mode === 'exec' ? 'okr' : 'main'] || 'delivery'

        // Edit + Delete always available in CMS mode
        const editBtn = `<button onclick="event.stopPropagation(); openItemEdit(undefined, undefined, undefined, '${item.id}')" class="item-action-btn edit">Edit</button>`
        const deleteBtn = `<button onclick="event.stopPropagation(); deleteItem(undefined, undefined, undefined, '${item.id}', '${viewPrefix}')" class="item-action-btn delete">Delete</button>`

        // Stage-specific extra actions — blocker hidden on done items
        const isDone = item.status === 'done';
        const blockerBtn = (itemStage === 'delivery' && !isDone) ? `<button onclick="event.stopPropagation(); toggleBlocker(undefined, undefined, undefined, '${item.id}', '${viewPrefix}')" class="item-action-btn ${item.blocker ? 'active' : 'neutral'}">${item.blocker ? '🔓 Unblock' : '🔒 Blocker'}</button>` : (item.blocker && !isDone ? `<button onclick="event.stopPropagation(); toggleBlocker(undefined, undefined, undefined, '${item.id}', '${viewPrefix}')" class="item-action-btn active">🔓 Unblock</button>` : '')

        // Hide Backlog button if already in backlog, or item is actively in-flight
        const activeStatuses = ['now', 'qa', 'review', 'blocked'];
        const isAlreadyBacklog = (viewPrefix === 'backlog' || item.status === 'later');
        const backlogBtn = (itemStage === 'definition' || itemStage === 'delivery') && !isAlreadyBacklog && !activeStatuses.includes(item.status) ? `<button onclick="event.stopPropagation(); sendToBacklog(undefined, undefined, undefined, '${item.id}', '${viewPrefix}')" class="item-action-btn neutral">→ Backlog</button>` : ''

        cmsControls = `
            <div class="cms-controls-row flex items-center gap-1.5 flex-wrap">
                ${editBtn}${deleteBtn}${backlogBtn}${blockerBtn}${okrAction}
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

    // --- LIFECYCLE COACHING SYSTEMS (I, J, K) ---
    const lifecycleRailHTML = (() => { try { return typeof renderLifecycleRail === 'function' ? renderLifecycleRail(item) : ''; } catch(e) { return ''; } })();
    const readinessBadgeHTML = (() => { try { return typeof getReadinessBadge === 'function' ? getReadinessBadge(item) : ''; } catch(e) { return ''; } })();
    const jumpLinksHTML = (() => { try { return typeof renderJumpLinks === 'function' ? renderJumpLinks(item, viewPrefix) : ''; } catch(e) { return ''; } })();

    // Tier 3 expandable content (detail on demand)
    const hasExpandable = !isRoadmap && (usecase || metricRowHTML || effortImpactHTML || acHTML || roiScoreHTML || lifecycleRailHTML || readinessBadgeHTML || jumpLinksHTML)
    const expandId = `${viewPrefix}-expand-${item.id}`
    const toggleId = `${viewPrefix}-expand-toggle-${item.id}`
    const expandableContent = hasExpandable ? `
        <div id="${expandId}" class="item-expand hidden">
            ${usecase ? `<div class="mb-2 text-sm text-slate-600">${usecase}</div>` : ''}
            ${metricRowHTML}
            ${effortImpactHTML}
            ${acHTML}
            ${roiScoreHTML ? `<div class="mt-1 flex">${roiScoreHTML}</div>` : ''}
            ${lifecycleRailHTML || readinessBadgeHTML || jumpLinksHTML ? `
            <div class="item-meta-row mt-2">
                ${lifecycleRailHTML}
                ${readinessBadgeHTML}
                ${jumpLinksHTML}
            </div>` : ''}
        </div>
    ` : ''

    return `
        ${blockerStrip}
        <div class="item-row ${status.bucket} ${mode}-perspective"
            data-item-id="${item.id}"
            draggable="${shouldShowManagement() ? 'true' : 'false'}"
            ondragstart="if(${shouldShowManagement()}){dragSource={trackIndex:${trackIndex},subtrackIndex:${subtrackIndex},itemIndex:${itemIndex}};this.classList.add('dragging');}"
            ondragend="this.classList.remove('dragging')">
            <div class="item-content">
                <div class="flex justify-between items-start w-full gap-4">
                    <div class="flex items-start gap-4 flex-1">
                        <div class="flex flex-col gap-1 items-center flex-shrink-0 mt-1">
                            <span class="status-pill ${status.class} py-0.5 w-full text-center min-w-[54px]">${status.label}</span>
                            <span class="status-pill ${priorityInfo.class} text-[10px] py-0 px-1 opacity-70 w-full text-center">${priorityLabel}</span>
                            ${personaHTML}
                            ${(() => {
                                if (!isGrooming) return '';
                                const gs = computeGroomScore(item);
                                const cls = gs >= 70 ? 'groom-done' : gs >= 40 ? 'groom-todo' : 'groom-none';
                                const label = gs >= 70 ? `✓ ${gs}` : `${gs}pts`;
                                return `<span class="groom-badge ${cls}" title="Grooming score: epicId(25)+storyPoints(25)+AC(25)+priority(15)+sprintId(10)">${label}</span>`;
                            })()}
                        </div>
                        <div class="text-sm text-slate-800 font-semibold leading-tight flex-1">
                            <div class="info-wrapper mb-1">
                                <span class="info-text flex items-center flex-wrap gap-1">${displayText}${due}${storyPointsHTML}</span>
                                <button class="info-btn" aria-label="More information" onclick="event.stopPropagation(); document.getElementById('${viewPrefix}-tooltip-${item.id}').classList.toggle('visible')">i</button>
                                ${tooltipHTML.replace('class="tooltip-content"', `id="${viewPrefix}-tooltip-${item.id}" class="tooltip-content"`)}
                            </div>
                            <div class="flex flex-wrap items-center gap-1.5 mb-1">
                                ${strategicContext}
                                ${!isRoadmap ? `
                                    ${item.sprintId ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">🏃 ${(UPDATE_DATA.metadata.sprints || []).find(s => s.id === item.sprintId)?.name || item.sprintId}</span>` : ''}
                                    ${item.releasedIn ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100">📦 ${(UPDATE_DATA.metadata.releases || []).find(r => r.id === item.releasedIn)?.name || item.releasedIn}</span>` : ''}
                                ` : ''}
                                ${mode !== 'exec' && tags ? `<div class="flex flex-wrap gap-1">${tags}</div>` : ''}
                            </div>
                            ${expandableContent}
                            <div class="flex flex-wrap items-center gap-2 mt-1.5">
                                ${hasExpandable ? `
                                <button id="${toggleId}" class="item-expand-toggle" onclick="event.stopPropagation(); const el=document.getElementById('${expandId}'); const me=document.getElementById('${toggleId}'); el.classList.toggle('hidden'); me.classList.toggle('open');">
                                    <span class="chevron">▾</span> Details
                                </button>` : ''}
                                <button id="${viewPrefix}-comment-btn-${item.id}" onclick="event.stopPropagation(); toggleComments(${trackIndex}, ${subtrackIndex}, ${itemIndex}, '${item.id}', '${viewPrefix}')" class="text-[11px] font-medium px-2 py-0.5 ${isRoadmap ? 'bg-slate-50 text-slate-400 opacity-60 hover:opacity-100 hover:bg-slate-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} rounded transition-all">💬 ${(item.comments || []).length}</button>
                                ${cmsControls}
                            </div>

                            ${isGrooming ? `
                                <div class="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-sm grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4" onclick="event.stopPropagation()">
                                    <div>
                                        <label class="block text-[10px] font-semibold text-indigo-400 mb-1.5">Priority</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'priority', this.value, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
                                            <option value="medium" ${item.priority === 'medium' || !item.priority ? 'selected' : ''}>Medium</option>
                                            <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-semibold text-indigo-400 mb-1.5">Epic</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'epicId', this.value, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">No Epic</option>
                                            ${(UPDATE_DATA.metadata.epics || []).map(e => `<option value="${e.id}" ${item.epicId === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-semibold text-indigo-400 mb-1.5">🏃 Sprint</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'sprintId', this.value, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">No Sprint</option>
                                            ${(UPDATE_DATA.metadata.sprints || []).map(s => `<option value="${s.id}" ${item.sprintId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-semibold text-indigo-400 mb-1.5">📦 Release</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'releasedIn', this.value, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">No Release</option>
                                            ${(UPDATE_DATA.metadata.releases || []).find(r => r.id === item.releasedIn)?.name || item.releasedIn}
                                            ${(UPDATE_DATA.metadata.releases || []).map(r => `<option value="${r.id}" ${item.releasedIn === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-semibold text-indigo-400 mb-1.5">🎯 Horizon</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'planningHorizon', this.value, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">None</option>
                                            ${[{id:'1M',label:'1M — Now'},{id:'3M',label:'3M — Next'},{id:'6M',label:'6M — Later'},{id:'1Y',label:'1Y — Future'}].map(h => `<option value="${h.id}" ${item.planningHorizon === h.id ? 'selected' : ''}>${h.label}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-semibold text-indigo-400 mb-1.5">⚡ Points</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'storyPoints', parseInt(this.value)||0, '${item.id}')" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">—</option>
                                            ${[1,2,3,5,8,13,21].map(p => `<option value="${p}" ${item.storyPoints === p ? 'selected' : ''}>${p}</option>`).join('')}
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
                    <div class="flex-shrink-0 flex flex-col items-end gap-2 py-0.5">
                        <div class="flex flex-wrap justify-end gap-1">
                            ${renderContributors(item.contributors)}
                        </div>
                        ${item.mediaUrl ? `
                            <a href="${item.mediaUrl}" target="_blank" onclick="event.stopPropagation()" class="flex items-center justify-center h-7 px-2 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-500 truncate max-w-[100px]">
                                ${item.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? `
                                <img src="${item.mediaUrl}" class="h-8 w-12 object-cover rounded cursor-zoom-in hover:scale-105 transition-transform"
                                     onerror="this.style.display='none'; this.parentElement.textContent='🔗 Link';">
                                ` : `🔗 Link`}
                            </a>
                        ` : ''}
                    </div>
                </div>
                ${(() => { 
                    try { 
                        // Hide Quick Actions if Grooming is active to avoid Duplicate UI
                        if (isGrooming) return '';
                        return typeof renderQuickActionBar === 'function' ? renderQuickActionBar(item, viewPrefix, trackIndex, subtrackIndex, itemIndex) : ''; 
                    } catch(e) { return ''; } 
                })()}
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
                    <span class="text-[10px] font-medium text-slate-400">Tactical Health Tracking</span>
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
                            <span style="color: ${trackColor}; background: ${trackColor}10;" class="px-2 py-0.5 rounded-md font-medium text-xs inline-block mb-1.5 border border-slate-200">
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
                    <span class="text-[10px] font-medium text-slate-400">Definition · Items ranked by business priority</span>
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
                        <span style="color: ${trackColor}; background: ${trackColor}10;" class="px-2 py-0.5 rounded-md font-medium text-xs inline-block mb-1.5 border border-slate-200">
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

/**
 * Collects all items per contributor, with track/subtrack/item indices attached.
 * Respects team filter, tag filter, date range, and search.
 */
function buildContributorMap() {
    const map = {} // name → [enriched items]
    const activeTeam = getActiveTeam()
    UPDATE_DATA.tracks.forEach((track, ti) => {
        if (activeTeam && activeTeam !== track.name) return
        track.subtracks.forEach((subtrack, si) => {
            subtrack.items.forEach((item, ii) => {
                if (!isItemMatchingTagFilter(item) || !isItemInDateRange(item) || !isItemInSearch(item)) return
                ;(item.contributors || []).forEach(name => {
                    if (!map[name]) map[name] = []
                    map[name].push({ ...item, trackIndex: ti, subtrackIndex: si, itemIndex: ii })
                })
            })
        })
    })
    return map
}

/**
 * Computes health stats for a single contributor's item list.
 * active = items in the currently active sprint
 */
function buildContributorStats(items) {
    const activeSprint = (UPDATE_DATA.metadata?.sprints || []).find(s => s.status === 'active')
    const activeItems = activeSprint ? items.filter(i => i.sprintId === activeSprint.id) : []
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const pts       = activeItems.reduce((s, i) => s + (parseInt(i.storyPoints) || 0), 0)
    const donePts   = activeItems.filter(i => i.status === 'done').reduce((s, i) => s + (parseInt(i.storyPoints) || 0), 0)
    const blocked   = activeItems.filter(i => i.status === 'blocked' || i.blocker).length
    const overdue   = activeItems.filter(i => {
        if (!i.due || i.status === 'done') return false
        return new Date(i.due) < today
    }).length
    const pct = pts > 0 ? Math.round((donePts / pts) * 100) : 0

    return { activeSprint, activeItems, pts, donePts, pct, blocked, overdue, total: items.length }
}

/**
 * Builds a full contributor card (PM/Dev view).
 */
function buildContributorCard(name, items, stats, isOwn, canEdit) {
    const colorClass = contributorColors[name] || 'bg-slate-100 text-slate-700'
    const barColor   = stats.pct >= 80 ? 'bg-emerald-500' : stats.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
    const statusOrder = ['blocked', 'now', 'qa', 'review', 'next', 'done', 'later']

    // Sprint-scoped items grouped by status
    const sprintGroups = statusOrder
        .map(status => {
            const bucket = stats.activeItems.filter(i => i.status === status)
            if (!bucket.length) return ''
            const badgeClass = statusConfig[status]?.class || 'bg-slate-100 text-slate-600'
            const rows = bucket.map(item => `
                <div class="group flex items-start gap-2 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                     onclick="${canEdit ? `openItemEdit(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex}, '${item.id}')` : ''}">
                    <div class="flex-1 text-[11px] font-medium text-slate-600 group-hover:text-slate-900 leading-tight truncate" title="${item.text}">
                        ${highlightSearch(item.text)}
                    </div>
                    ${item.storyPoints ? `<span class="text-[9px] font-black text-slate-400 shrink-0">${item.storyPoints}p</span>` : ''}
                    ${item.priority === 'high' ? `<span class="text-[9px] font-black text-rose-500 shrink-0" title="High priority">!</span>` : ''}
                    ${item.due && new Date(item.due) < new Date() && item.status !== 'done' ? `<span class="text-[9px] font-black text-orange-500 shrink-0" title="Overdue">⚠</span>` : ''}
                </div>`).join('')
            return `
                <div class="mb-2">
                    <div class="mb-1"><span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${badgeClass}">${status}</span></div>
                    <div class="space-y-0.5 pl-1">${rows}</div>
                </div>`
        }).join('')

    const ownRing = isOwn ? 'ring-2 ring-indigo-400 ring-offset-1' : ''

    return `
        <div class="contributor-compact-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${ownRing}">
            <!-- Header -->
            <div class="${colorClass} px-4 py-2.5 flex items-center justify-between border-b border-black/5">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">${name.charAt(0)}</div>
                    <span class="font-black text-sm">${name}</span>
                    ${isOwn ? `<span class="text-[9px] font-black bg-black/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">You</span>` : ''}
                </div>
                <span class="text-[10px] font-bold opacity-70">${stats.total} total</span>
            </div>

            <!-- Sprint stats bar -->
            <div class="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                ${stats.activeSprint ? `
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Active Sprint</span>
                        <span class="text-[10px] font-black text-slate-700">${stats.donePts}/${stats.pts} pts · ${stats.pct}%</span>
                    </div>
                    <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                        <div class="${barColor} h-full rounded-full transition-all" style="width:${stats.pct}%"></div>
                    </div>
                    <div class="flex items-center gap-3 text-[9px] font-bold">
                        <span class="text-slate-500">${stats.activeItems.length} items</span>
                        ${stats.blocked > 0  ? `<span class="text-rose-600">⛔ ${stats.blocked} blocked</span>` : ''}
                        ${stats.overdue > 0  ? `<span class="text-orange-600">⚠ ${stats.overdue} overdue</span>` : ''}
                        ${stats.blocked === 0 && stats.overdue === 0 ? `<span class="text-emerald-600">✓ On track</span>` : ''}
                    </div>
                ` : `<div class="text-[10px] text-slate-400 italic">No active sprint</div>`}
            </div>

            <!-- Sprint items by status -->
            <div class="p-3 space-y-0.5 bg-white max-h-72 overflow-y-auto">
                ${sprintGroups || `<div class="text-[10px] text-slate-400 italic py-2 text-center">No items in active sprint</div>`}
            </div>
        </div>`
}

/**
 * Builds a compact aggregate row for Exec view — no task details.
 */
function buildContributorExecRow(name, items, stats) {
    const colorClass = contributorColors[name] || 'bg-slate-100 text-slate-700'
    const barColor   = stats.pct >= 80 ? 'bg-emerald-500' : stats.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
    return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
            <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${colorClass}">
                    <span class="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[9px] font-black">${name.charAt(0)}</span>
                    ${name}
                </span>
            </td>
            <td class="px-4 py-3 text-center text-xs font-bold text-slate-700">${stats.activeItems.length}</td>
            <td class="px-4 py-3">
                <div class="flex items-center gap-2 justify-center">
                    <div class="h-1.5 w-20 bg-slate-200 rounded-full overflow-hidden">
                        <div class="${barColor} h-full rounded-full" style="width:${stats.pct}%"></div>
                    </div>
                    <span class="text-xs font-black text-slate-700">${stats.pct}%</span>
                </div>
            </td>
            <td class="px-4 py-3 text-center">
                ${stats.blocked > 0
                    ? `<span class="text-xs font-black text-rose-600">⛔ ${stats.blocked}</span>`
                    : `<span class="text-xs text-emerald-600 font-bold">—</span>`}
            </td>
            <td class="px-4 py-3 text-center">
                ${stats.overdue > 0
                    ? `<span class="text-xs font-black text-orange-600">⚠ ${stats.overdue}</span>`
                    : `<span class="text-xs text-emerald-600 font-bold">—</span>`}
            </td>
        </tr>`
}

function renderContributorView() {
    const container = document.getElementById('contributor-view')
    if (!container) return

    const mode     = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm'
    const canEdit  = shouldShowManagement()
    const map      = buildContributorMap()
    const names    = Object.keys(map).sort((a, b) => map[b].length - map[a].length)

    // Current user name for Dev persona "you" badge
    const currentUser = (typeof window.CURRENT_USER !== 'undefined' && window.CURRENT_USER?.name)
        ? window.CURRENT_USER.name
        : null

    const ribbon = `
        <div id="contributor-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">👥</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-medium text-slate-400">Build · Team health — sprint workload &amp; blockers</span>
                    <h2 class="text-sm font-black text-slate-800">Contributor Workload</h2>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div id="contributor-next-action-mount">
                    ${typeof renderPrimaryStageAction === 'function' ? renderPrimaryStageAction('contributor') : ''}
                </div>
            </div>
        </div>`

    if (names.length === 0) {
        container.innerHTML = ribbon + `<div class="text-center py-20 text-slate-400 text-sm">No contributors found for current filters.</div>`
        return
    }

    // ---- Exec: aggregate table only ----
    if (mode === 'exec') {
        const rows = names.map(name => {
            const stats = buildContributorStats(map[name])
            return buildContributorExecRow(name, map[name], stats)
        }).join('')

        container.innerHTML = ribbon + `
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-slate-200">
                            <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Contributor</th>
                            <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Sprint Items</th>
                            <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Completion</th>
                            <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Blocked</th>
                            <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Overdue</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`
        return
    }

    // ---- Dev: own card first, others collapsed summary ----
    // ---- PM:  all cards, full detail ----
    let visibleNames = names
    if (mode === 'dev' && currentUser) {
        // Own card first, others after
        visibleNames = [
            ...(names.includes(currentUser) ? [currentUser] : []),
            ...names.filter(n => n !== currentUser)
        ]
    }

    const cards = visibleNames.map(name => {
        const stats = buildContributorStats(map[name])
        const isOwn = name === currentUser

        // Dev: render other contributors as compact read-only summary (no task list)
        if (mode === 'dev' && !isOwn) {
            const colorClass = contributorColors[name] || 'bg-slate-100 text-slate-700'
            const barColor   = stats.pct >= 80 ? 'bg-emerald-500' : stats.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
            return `
                <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm opacity-70">
                    <div class="${colorClass} px-4 py-2.5 flex items-center justify-between border-b border-black/5">
                        <div class="flex items-center gap-2">
                            <div class="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[9px] font-black">${name.charAt(0)}</div>
                            <span class="font-bold text-sm">${name}</span>
                        </div>
                        <span class="text-[9px] font-bold opacity-60">${stats.activeItems.length} items · ${stats.pct}%</span>
                    </div>
                    <div class="px-4 py-3 bg-slate-50/60">
                        <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div class="${barColor} h-full rounded-full" style="width:${stats.pct}%"></div>
                        </div>
                        <div class="flex gap-3 mt-1.5 text-[9px] font-bold">
                            ${stats.blocked > 0 ? `<span class="text-rose-600">⛔ ${stats.blocked} blocked</span>` : ''}
                            ${stats.overdue > 0 ? `<span class="text-orange-600">⚠ ${stats.overdue} overdue</span>` : ''}
                            ${stats.blocked === 0 && stats.overdue === 0 ? `<span class="text-emerald-600">✓ On track</span>` : ''}
                        </div>
                    </div>
                </div>`
        }

        return buildContributorCard(name, map[name], stats, isOwn, canEdit)
    }).join('')

    container.innerHTML = ribbon + `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">${cards}</div>`
}

// ------ Backlog View ------
// ---- Grooming score (0-100, weighted) ----
// epicId(25) + storyPoints(25) + acceptanceCriteria(25) + priority≠none(15) + sprintId(10)
function computeGroomScore(item) {
    let s = 0
    if (item.epicId)  s += 25
    if (item.storyPoints > 0) s += 25
    if (item.acceptanceCriteria && String(item.acceptanceCriteria).trim().length > 0) s += 25
    if (item.priority && item.priority !== 'none' && item.priority !== '') s += 15
    if (item.sprintId) s += 10
    return s
}

// ---- Bulk-select state for grooming mode ----
// Exposed on window so cms.js bulkAssignBacklog can read it
const _backlogSelected = new Set()
window._backlogSelected = _backlogSelected

function toggleBacklogSelect(itemId) {
    if (_backlogSelected.has(itemId)) {
        _backlogSelected.delete(itemId)
    } else {
        _backlogSelected.add(itemId)
    }
    renderBacklogView()
}
window.toggleBacklogSelect = toggleBacklogSelect

function clearBacklogSelection() {
    _backlogSelected.clear()
    renderBacklogView()
}
window.clearBacklogSelection = clearBacklogSelection

let groomingMode = false;
function toggleGroomingMode() {
    groomingMode = !groomingMode;
    _backlogSelected.clear()
    renderTrackView(); // from views.js
    updateBacklogBadge(); // from cms.js
    buildTagFilterBar(); // from core.js
    updateTabCounts(); // from core.js
    renderBlockerStrip(); // from core.js
    renderBacklogView();
}

function renderBacklogView() {
    const container = document.getElementById('backlog-view');
    const sprints = (UPDATE_DATA.metadata?.sprints || [])
    const showMgmt = shouldShowManagement()
    const activeTeam = getActiveTeam()
    const sprintReadyFilter = sessionStorage.getItem('backlog_sprint_ready_filter') === 'true'

    // ---- Gather all backlog items and compute stats ----
    const allBacklogItems = []
    UPDATE_DATA.tracks.forEach((track, trackIndex) => {
        if (activeTeam && activeTeam !== track.name) return
        const bl = track.subtracks.find(s => s.name === 'Backlog')
        if (!bl) return
        const si = track.subtracks.indexOf(bl)
        bl.items.forEach((item, ii) => {
            allBacklogItems.push({ item, track, trackIndex, si, ii, score: computeGroomScore(item) })
        })
    })

    const totalCount   = allBacklogItems.length
    const readyCount   = allBacklogItems.filter(r => r.score >= 70).length
    const unpointedCount = allBacklogItems.filter(r => !r.item.storyPoints || r.item.storyPoints <= 0).length
    const unepicedCount  = allBacklogItems.filter(r => !r.item.epicId).length
    const readyPct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0
    const barColor = readyPct >= 70 ? 'bg-emerald-500' : readyPct >= 40 ? 'bg-amber-400' : 'bg-red-400'

    let html = ''

    // ---- Ribbon ----
    if (showMgmt) {
        html += `
            <div style="position:relative;margin-bottom:16px;">
                <div id="backlog-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-3 px-2">
                        <span class="text-xl">📚</span>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-medium text-slate-400">Stage 3 · Plan — Items waiting to be planned into a sprint</span>
                            <h2 class="text-sm font-black text-slate-800">Engineering Backlog</h2>
                        </div>
                        ${typeof renderInfoButton === 'function' ? renderInfoButton('backlog') : ''}
                    </div>
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
                ${typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('backlog') : ''}
            </div>
        `
    }

    // ---- Grooming summary header (always visible when there are items) ----
    if (totalCount > 0) {
        const filterBtnClass = sprintReadyFilter
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
        html += `
            <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div class="flex items-center gap-4">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grooming Health</span>
                        <span class="text-xs font-black ${readyPct >= 70 ? 'text-emerald-600' : readyPct >= 40 ? 'text-amber-600' : 'text-red-500'}">${readyCount} / ${totalCount} sprint-ready (≥70pts)</span>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[10px] text-slate-400 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">⚡ ${unpointedCount} unpointed</span>
                        <span class="text-[10px] text-slate-400 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">🌟 ${unepicedCount} no epic</span>
                        <button onclick="sessionStorage.setItem('backlog_sprint_ready_filter', '${!sprintReadyFilter}'); renderBacklogView()"
                            class="text-[10px] font-black px-3 py-1.5 rounded-lg border transition-all ${filterBtnClass}">
                            ${sprintReadyFilter ? '✅ Sprint-Ready Only' : '🎯 Show Sprint-Ready'}
                        </button>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="${barColor} h-full rounded-full transition-all" style="width:${readyPct}%"></div>
                    </div>
                    <span class="text-[10px] font-black text-slate-500 w-8 text-right">${readyPct}%</span>
                </div>
            </div>
        `
    }

    // ---- Grooming session banner ----
    if (groomingMode) {
        const selCount = _backlogSelected.size
        html += `
            <div class="grooming-session-bar">
                <div class="flex items-center gap-2">
                    <span class="text-sm">🔧</span>
                    <span class="font-black text-indigo-800 text-xs">Grooming Session Active</span>
                    <span class="text-xs text-indigo-500">${totalCount - readyCount} item${(totalCount - readyCount) !== 1 ? 's' : ''} need grooming</span>
                </div>
                <div class="flex items-center gap-3">
                    ${selCount > 0 ? `<span class="text-xs font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">${selCount} selected</span>` : ''}
                    <span class="text-xs font-bold text-indigo-400">${readyCount} sprint-ready</span>
                    <button onclick="toggleGroomingMode()" class="text-[10px] font-black text-indigo-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">✕ Exit</button>
                </div>
            </div>
        `
    }

    // ---- Floating bulk-action bar ----
    if (groomingMode && _backlogSelected.size > 0) {
        const sprintOpts = sprints.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
        const horizonOpts = [
            {id:'1M',label:'1M — Now'},{id:'3M',label:'3M — Next'},
            {id:'6M',label:'6M — Later'},{id:'1Y',label:'1Y — Future'}
        ].map(h => `<option value="${h.id}">${h.label}</option>`).join('')
        html += `
            <div class="groom-bulk-bar">
                <span class="groom-bulk-count">${_backlogSelected.size} selected</span>
                <div class="flex items-center gap-2 flex-wrap">
                    ${sprints.length > 0 ? `
                    <select class="groom-bulk-select" onchange="if(this.value) bulkAssignBacklog('sprintId', this.value); this.value=''">
                        <option value="">→ Assign Sprint…</option>
                        ${sprintOpts}
                    </select>` : ''}
                    <select class="groom-bulk-select" onchange="if(this.value) bulkAssignBacklog('planningHorizon', this.value); this.value=''">
                        <option value="">→ Assign Horizon…</option>
                        ${horizonOpts}
                    </select>
                    <button onclick="clearBacklogSelection()" class="groom-bulk-clear">✕ Clear</button>
                </div>
            </div>
        `
    }

    // ---- Item list ----
    let totalItems = 0
    UPDATE_DATA.tracks.forEach((track, trackIndex) => {
        if (activeTeam && activeTeam !== track.name) return
        const backlogSub = track.subtracks.find(s => s.name === 'Backlog')
        if (!backlogSub || !backlogSub.items.length) return

        // Apply sprint-ready filter
        const visibleItems = backlogSub.items.map((item, ii) => ({ item, ii }))
            .filter(({ item }) => !sprintReadyFilter || computeGroomScore(item) >= 70)

        if (!visibleItems.length) return
        totalItems += visibleItems.length

        const si = track.subtracks.indexOf(backlogSub)
        html += `<div class="backlog-track-card mb-6 overflow-hidden ${groomingMode ? 'border-2 border-indigo-400 shadow-xl scale-[1.01] transform transition-all' : ''}">
            <div class="p-4 bg-slate-100 font-extrabold border-b flex justify-between items-center text-slate-700">
                <span class="flex items-center gap-2">🏗️ ${track.name} Backlog <span class="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">${visibleItems.length}</span></span>
                ${showMgmt ? `<button onclick="addItem(${trackIndex}, ${si})" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 transition-all"><span>+</span> Add Item</button>` : ''}
            </div>
            <div class="p-3 space-y-3 bg-white">`

        visibleItems.forEach(({ item, ii }) => {
            const isSelected = _backlogSelected.has(item.id)
            html += `<div class="backlog-item-wrapper${isSelected ? ' groom-item-selected' : ''}">`
            if (groomingMode && showMgmt) {
                html += `<label class="groom-checkbox-label">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleBacklogSelect('${item.id}')" class="groom-checkbox">
                </label>`
            }
            html += renderItem(item, 'backlog', trackIndex, si, ii, groomingMode)
            if (showMgmt && sprints.length > 0 && !groomingMode) {
                const assignedSprint = sprints.find(s => s.id === item.sprintId)
                const sprintOptions = sprints.map(s => `<option value="${s.id}" ${item.sprintId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')
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
                `
            }
            html += `</div>`
        })
        html += `</div></div>`
    })

    if (!totalItems) {
        container.innerHTML = (html || '') + `
            <div class="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center mt-4">
                <div class="text-6xl mb-4">${sprintReadyFilter ? '🎯' : '📋'}</div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">${sprintReadyFilter ? 'No sprint-ready items' : 'No backlog items yet'}</h3>
                <p class="text-slate-500 text-sm mb-6">${sprintReadyFilter ? 'Items need a score ≥70 to appear here. Groom more items to prepare them.' : 'Start by capturing ideas in Ideation or breaking down your Epics into actionable tasks.'}</p>
                <div class="flex gap-3 justify-center">
                    ${sprintReadyFilter ? `<button onclick="sessionStorage.removeItem('backlog_sprint_ready_filter'); renderBacklogView()" class="cms-btn cms-btn-secondary">← Show all items</button>` : `<button onclick="switchView('ideation')" class="cms-btn cms-btn-secondary">Browse Ideation →</button>`}
                    ${showMgmt && !sprintReadyFilter ? `<button onclick="addItem(0,0)" class="cms-btn cms-btn-primary">+ Add First Item</button>` : ''}
                </div>
            </div>`
        return
    }
    container.innerHTML = html
}

// ------ Epics View ------
function renderEpicLifecycle(currentStage) {
    const stages = [
        { id: 'vision', label: 'Vision', icon: '🎯' },
        { id: 'definition', label: 'Plan', icon: '📂' },
        { id: 'delivery', label: 'Build', icon: '⚡' },
        { id: 'review', label: 'Ship', icon: '📊' }
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
    const activeTeam = typeof getActiveTeam === 'function' ? getActiveTeam() : null
    const allEpicsRaw = (data.metadata && data.metadata.epics) || [];
    const epics = activeTeam ? allEpicsRaw.filter(e => !e.track || e.track === activeTeam) : allEpicsRaw
    const activeMode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';

    let ribbonHtml = `
        <div id="epics-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <!-- Group 1: Navigation/Breadcrumb -->
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">🚀</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-medium text-slate-400">Stage 2 · Vision — High-level strategic containers for tactical execution</span>
                    <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest">Engineering Epics</h2>
                </div>
                ${typeof renderInfoButton === 'function' ? renderInfoButton('epics') : ''}
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

    let html = ribbonHtml + (typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('epics') : '');

    if (epics.length === 0) {
        container.innerHTML = html + `<div class="text-center py-20 text-slate-400">
            No epics defined in metadata.epics. 
            <br><small>Data source: ${data.metadata ? 'Object present' : 'Object missing'}</small>
        </div>`;
        return;
    }

    epics.forEach((e, idx) => {
        const isClosed = e.status === 'completed';
        const isDelivery = !isClosed && (e.stage === 'delivery' || e.stage === 'review' || e.kickedOffAt);
        const isPreKickoff = !isClosed && !isDelivery;
        const epicItems = findItemsByMetadataId('epicId', e.id);
        const doneCount = epicItems.filter(i => i.status === 'done').length;
        const progress = epicItems.length ? Math.round((doneCount / epicItems.length) * 100) : 0;

        const epicOKR = data.metadata.okrs?.find(o => o.id === e.linkedOKR);
        const epicHorizon = data.metadata.roadmap?.find(h => h.id === e.planningHorizon);

        const cmsActions = shouldShowManagement() ? `
            <div class="flex flex-wrap gap-1.5 ml-auto">
                <button onclick="openEpicEdit(${idx})" class="item-action-btn edit">Edit</button>
                <button onclick="deleteEpic(${idx})" class="item-action-btn delete">Delete</button>
                ${isClosed
                    ? `<button onclick="viewCeremonyAudit('epic', '${e.id}')" class="item-action-btn neutral no-disable">📜 Audit</button>`
                    : isPreKickoff
                        ? `<button onclick="kickoffEpic(${idx})" class="item-action-btn lifecycle no-disable">🚀 Kickoff</button>`
                        : `<button onclick="closeEpic(${idx})" class="item-action-btn lifecycle no-disable">🏁 Close Epic</button>`
                }
                <button onclick="groomEpicTasks('${e.id}')" class="item-action-btn neutral">Groom 📚</button>
                <button onclick="addItem(0, 0, { epicId: '${e.id}' })" class="item-action-btn okr">+ Task</button>
            </div>
        ` : '';

        // COMPACT IA Section Mapping: WHAT, WHERE, WHEN, HOW
        const strategicGrid = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4 items-start">
                <!-- WHAT: Vision & Success -->
                <div class="md:col-span-1 space-y-2">
                    <span class="text-slate-400 font-medium text-[10px] block">Epic Vision (The What)</span>
                    <div class="text-xs font-bold text-slate-800 leading-snug line-clamp-3" title="${e.description || ''}">${e.description || 'No vision statement provided.'}</div>
                    ${e.successCriteria ? `
                    <div class="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 mt-2">
                        <span class="text-indigo-400 font-medium text-[10px] block mb-1">Success Criteria</span>
                        <div class="text-[10px] font-black text-indigo-900 leading-tight">${e.successCriteria}</div>
                    </div>
                    ` : ''}
                </div>

                <!-- WHERE: Strategic Alignment -->
                <div class="space-y-2">
                    <span class="text-slate-400 font-medium text-[10px] block">Alignment (The Where)</span>
                    ${epicOKR ? `
                        <div class="px-3 py-2 bg-white border border-indigo-600/10 rounded-lg shadow-sm">
                            <div class="flex justify-between items-center mb-0.5">
                                <div class="text-[8px] font-medium text-[10px] text-indigo-400">Objective</div>
                                ${e.strategicWeight ? `<div class="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1 rounded">${e.strategicWeight}% Weight</div>` : ''}
                            </div>
                            <button onclick="switchView('okr')" class="epic-okr-link" title="View OKR">🎯 ${epicOKR.objective}</button>
                        </div>
                    ` : ''}
                    ${epicHorizon ? `
                        <div class="px-3 py-2 bg-white border border-slate-900/10 rounded-lg shadow-sm mt-2">
                            <div class="text-[8px] font-medium text-[10px] text-slate-400 mb-0.5">Horizon</div>
                            <div class="text-[10px] font-black text-slate-800 truncate">🗺️ ${epicHorizon.label.split('(')[0]}</div>
                        </div>
                    ` : ''}
                </div>

                <!-- WHEN: Lifecycle -->
                <div class="md:col-span-1">
                     <span class="text-slate-400 font-medium text-[10px] block mb-3 px-1">Epic Lifecycle (The When)</span>
                     ${renderEpicLifecycle(e.stage)}
                </div>

                <!-- HOW: Progress & Health -->
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 font-medium text-[10px] block">Health (The How)</span>
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

        const epicRibbonText = isClosed ? 'Closed' : isDelivery ? 'In Flight' : 'Defining';
        const epicRibbonClass = isClosed ? 'ribbon-closed' : isDelivery ? 'ribbon-active' : 'ribbon-planned';

        html += `
            <div class="sprint-card epic-card p-0 mb-8 overflow-hidden rounded-3xl corner-ribbon-wrap ${isClosed ? 'lifecycle-closed' : ''}" id="epic-${e.id}">
                <div class="corner-ribbon ${epicRibbonClass}">${epicRibbonText}</div>
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
                            <div class="flex items-center gap-2">
                                <h2 class="text-lg font-black text-slate-900 tracking-tight leading-none">${e.name}</h2>
                                ${isClosed ? `<span class="lifecycle-closed-badge">✓ Closed</span>` : isDelivery ? `<span class="lifecycle-closed-badge" style="background:#eef2ff;border-color:#c7d2fe;color:#4f46e5;">● In Flight</span>` : ''}
                            </div>
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
// ------ Roadmap helpers ------

function buildRoadmapEpicCard(epic, epicIdx, horizons, mode, showManagement) {
    const epics = (window.UPDATE_DATA?.metadata?.epics || [])
    const okrs  = (window.UPDATE_DATA?.metadata?.okrs  || [])
    const epicItems = findItemsByMetadataId('epicId', epic.id)
    const total = epicItems.length
    const done  = epicItems.filter(i => i.status === 'done').length
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0
    const linkedOKR = okrs.find(o => o.id === epic.linkedOKR)

    const statusColors = { completed: 'bg-emerald-100 text-emerald-800', delivery: 'bg-blue-100 text-blue-800', active: 'bg-indigo-100 text-indigo-800' }
    const statusLabel  = epic.status === 'completed' ? 'Done' : (epic.stage || epic.status || 'planned')
    const statusClass  = statusColors[epic.status] || statusColors[epic.stage] || 'bg-slate-100 text-slate-600'

    const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'

    const horizonSelect = showManagement && mode !== 'exec' ? `
        <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Horizon:</span>
            <select class="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-indigo-200 outline-none"
                onchange="quickAssignEpicHorizon(${epicIdx}, this.value)">
                <option value="">— Unassigned —</option>
                ${horizons.map(h => `<option value="${h.id}" ${epic.planningHorizon === h.id ? 'selected' : ''}>${h.label || h.name}</option>`).join('')}
            </select>
        </div>
    ` : ''

    const editActions = showManagement && mode !== 'exec' ? `
        <div class="flex gap-1.5 mt-2">
            <button onclick="openEpicEdit(${epicIdx})" class="item-action-btn edit">Edit</button>
        </div>
    ` : ''

    return `
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between gap-3 mb-2">
                <div class="flex-1 min-w-0">
                    <span class="text-xs font-black text-slate-800 leading-snug">${epic.name}</span>
                    ${epic.description ? `<p class="text-[10px] text-slate-500 mt-0.5 line-clamp-2">${epic.description}</p>` : ''}
                </div>
                <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusClass}">${statusLabel}</span>
            </div>

            ${linkedOKR ? `
                <div class="flex items-center gap-1.5 mb-2 px-2 py-1 bg-indigo-50 rounded-lg">
                    <span class="text-[9px] text-indigo-400 font-black uppercase tracking-widest">OKR</span>
                    <span class="text-[10px] text-indigo-700 font-bold truncate">${linkedOKR.objective}</span>
                </div>
            ` : `
                <div class="flex items-center gap-1.5 mb-2 px-2 py-1 bg-slate-50 rounded-lg">
                    <span class="text-[10px] text-slate-400 italic">No OKR linked</span>
                </div>
            `}

            <div class="space-y-1">
                <div class="flex items-center justify-between text-[10px] text-slate-500">
                    <span>${done} / ${total} tasks done</span>
                    <span class="font-black ${pct >= 80 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'}">${pct}%</span>
                </div>
                <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="${barColor} h-full rounded-full transition-all" style="width:${pct}%"></div>
                </div>
            </div>

            ${horizonSelect}
            ${editActions}
        </div>
    `
}

function buildRoadmapHorizonBar(epics, horizonId) {
    const horizonEpics = epics.filter(e => e.planningHorizon === horizonId)
    const total = horizonEpics.length
    if (total === 0) return ''
    const onTrack = horizonEpics.filter(e => {
        const items = findItemsByMetadataId('epicId', e.id)
        if (items.length === 0) return false
        const pct = Math.round((items.filter(i => i.status === 'done').length / items.length) * 100)
        return pct >= 40
    }).length
    const pct = Math.round((onTrack / total) * 100)
    const barColor = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
    return `
        <div class="w-full flex items-center gap-3 mb-3">
            <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="${barColor} h-full rounded-full" style="width:${pct}%"></div>
            </div>
            <span class="text-[10px] font-black text-slate-500 whitespace-nowrap">${onTrack}/${total} epics on track</span>
        </div>
    `
}

function renderRoadmapView() {
    const container = document.getElementById('roadmap-view');
    if (!container) return;
    const data = window.UPDATE_DATA || {};
    const horizons = data.metadata?.roadmap || [];
    const allEpics = data.metadata?.epics || [];
    const allOKRs  = data.metadata?.okrs  || [];
    const showManagement = shouldShowManagement();
    const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm';
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : ''

    let ribbonHtml = `
        <div id="roadmap-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <!-- Group 1: Navigation/Breadcrumb -->
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">🗺️</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-medium text-slate-400">Stage 3 · Plan — Predictive alignment of initiatives into future horizons</span>
                    <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest">Strategic Roadmap</h2>
                </div>
                ${typeof renderInfoButton === 'function' ? renderInfoButton('roadmap') : ''}
            </div>

            <!-- Group 2: Actions -->
            <div class="flex items-center gap-2">
                <div id="roadmap-next-action-mount">
                    ${renderPrimaryStageAction('roadmap')}
                </div>

                ${showManagement ? `
                <div class="h-6 w-[1px] bg-slate-200 mx-2"></div>
                <button onclick="advanceRoadmapHorizons()"
                    class="px-4 py-2.5 rounded-xl text-xs font-black text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-slate-100 shadow-sm flex items-center gap-2">
                    <span>⏩</span> Advance Horizons
                </button>
                <div class="h-6 w-[1px] bg-slate-200 mx-1"></div>
                <button onclick="openRoadmapEdit()"
                    class="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 active:scale-95">
                    🗺️ Add Roadmap Item
                </button>
                ` : ''}
            </div>
        </div>
    `;
    ribbonHtml += typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('roadmap') : '';

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

    // Track filter — applied before persona filtering
    const _roadmapActiveTeam = typeof getActiveTeam === 'function' ? getActiveTeam() : null
    const trackFilteredEpics = _roadmapActiveTeam
        ? allEpics.filter(e => !e.track || e.track === _roadmapActiveTeam)
        : allEpics

    // Persona filtering for epics
    const activeOKRIds = new Set(allOKRs.filter(o => o.status === 'active' || !o.status).map(o => o.id))
    let visibleEpics = trackFilteredEpics
    if (mode === 'exec') {
        // Exec: only epics linked to active OKRs (track filter already applied)
        visibleEpics = trackFilteredEpics.filter(e => e.linkedOKR && activeOKRIds.has(e.linkedOKR))
    } else if (mode === 'dev' && currentUser) {
        // Dev: only epics that contain the dev's items
        const myEpicIds = new Set()
        ;(data.tracks || []).forEach(track => {
            track.subtracks.forEach(subtrack => {
                subtrack.items.forEach(item => {
                    if ((item.contributors || []).includes(currentUser) && item.epicId) {
                        myEpicIds.add(item.epicId)
                    }
                })
            })
        })
        visibleEpics = allEpics.filter(e => myEpicIds.has(e.id))
    }

    const epicIndexMap = new Map(allEpics.map((e, i) => [e.id, i]))

    const _allRoadmapItems = horizons.flatMap(h => findItemsByMetadataId('planningHorizon', h.id));
    const _filteredRoadmapItems = applyExecFilter(_allRoadmapItems, 'roadmap');
    let html = ribbonHtml + renderExecFilterBanner(_filteredRoadmapItems.length, _allRoadmapItems.length, 'roadmap') + `<div class="grid grid-cols-1 gap-12">`;

    if (mode === 'dev' && currentUser && visibleEpics.length === 0) {
        html += `<div class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm italic">No roadmap epics contain your tasks yet.</div>`
    }

    horizons.forEach(h => {
        const horizonOKR = data.metadata.okrs?.find(o => o.id === h.linkedObjective);
        const horizonEpics = visibleEpics.filter(e => e.planningHorizon === h.id)
        const horizonItems = applyExecFilter(findItemsByMetadataId('planningHorizon', h.id), 'roadmap');

        // Exec: skip horizons with no visible epics
        if (mode === 'exec' && horizonEpics.length === 0) return

        const cmsActions = shouldShowManagement() ? `
            <div class="flex gap-1.5 ml-4">
                <button onclick="openRoadmapEdit('${h.id}')" class="item-action-btn edit">Edit</button>
                <button onclick="deleteRoadmap('${h.id}')" class="item-action-btn delete">Delete</button>
            </div>
        ` : '';

        html += `
            <div class="roadmap-section mb-16">
                <div class="flex flex-col items-center mb-6">
                    <div class="flex items-center w-full gap-4 mb-3">
                        <div class="h-[2px] flex-1 bg-slate-200"></div>
                        <div class="px-6 py-3 bg-${h.color || 'slate'}-100 text-${h.color || 'slate'}-800 rounded-2xl font-black text-sm uppercase tracking-[0.2em] border-2 border-current flex items-center gap-4 shadow-md bg-white">
                            ${h.label || h.name}
                            ${cmsActions}
                            ${shouldShowManagement() && mode !== 'exec' ? `<button onclick="addItem(0, 0, { planningHorizon: '${h.id}' })" class="item-action-btn okr" title="Add Task to this Horizon">+ Task</button>` : ''}
                        </div>
                        <div class="h-[2px] flex-1 bg-slate-200"></div>
                    </div>

                    ${buildRoadmapHorizonBar(allEpics, h.id)}

                    ${horizonOKR ? `
                        <div class="w-full max-w-4xl px-8 py-6 bg-indigo-600 text-white rounded-3xl shadow-2xl relative overflow-hidden group">
                            <div class="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div class="relative z-10 flex flex-col gap-2">
                                <div class="flex items-center gap-3">
                                    <span class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">Primary Strategic Alignment</span>
                                    <div class="h-[1px] flex-1 bg-indigo-400/30"></div>
                                </div>
                                <h3 class="text-xl font-bold leading-tight flex items-start gap-4">
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

                ${horizonEpics.length > 0 ? `
                    <div class="mb-4">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Epics</div>
                        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            ${horizonEpics.map(e => buildRoadmapEpicCard(e, epicIndexMap.get(e.id), horizons, mode, showManagement)).join('')}
                        </div>
                    </div>
                ` : mode !== 'exec' ? `
                    <div class="text-center py-8 bg-indigo-50/30 rounded-2xl border border-dashed border-indigo-100 text-slate-400 italic text-sm mb-4">No epics assigned to this horizon yet.</div>
                ` : ''}

                ${mode !== 'exec' && horizonItems.length > 0 ? `
                    <div>
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tasks (no epic)</div>
                        <div class="grid grid-cols-1 gap-4">
                            ${renderGroupedItems(horizonItems, 'roadmap')}
                        </div>
                    </div>
                ` : ''}
            </div>`;
    });

    html += '</div>';

    // Add backlog navigation footer — single authoritative entry point for unplanned items
    if (showManagement && mode !== 'exec') {
        html += `
            <div class="roadmap-backlog-footer">
                <span class="roadmap-backlog-label">📚 Backlog <span class="roadmap-backlog-sub">(items not yet assigned to a planning horizon)</span></span>
                <button onclick="switchView('backlog')" class="roadmap-backlog-link">→ Open full Backlog view</button>
            </div>
        `;
    }

    container.innerHTML = html || '<div class="text-center py-20 text-slate-400">Roadmap is empty. Use the button to add your first planning category.</div>';
}

// ------ Sprint Planning helpers ------
function buildSprintPlanningPanel(sprint) {
    if (!sprint) return ''
    const sprintId = sprint.id
    const mode = getCurrentMode()
    if (mode === 'exec') return ''

    const sprints = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.sprints) || []
    const closedSprints = sprints.filter(s => s.status === 'completed')

    // Average velocity from closed sprints (story points done)
    let avgVelocity = 0
    if (closedSprints.length > 0) {
        const velocities = closedSprints.map(s => {
            const items = findItemsByMetadataId('sprintId', s.id)
            return items.filter(i => i.status === 'done').reduce((acc, i) => acc + (parseInt(i.storyPoints, 10) || 0), 0)
        })
        avgVelocity = Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length)
    }

    // Current sprint committed points
    const currentItems = findItemsByMetadataId('sprintId', sprintId)
    const committedPts = currentItems.reduce((acc, i) => acc + (parseInt(i.storyPoints, 10) || 0), 0)
    const capacityPct = avgVelocity > 0 ? Math.min(Math.round((committedPts / avgVelocity) * 100), 200) : 0
    const isOver = avgVelocity > 0 && committedPts > avgVelocity

    const capacityBar = avgVelocity > 0 ? `
        <div class="sprint-capacity-bar-wrap">
            <div class="sprint-capacity-bar">
                <div class="sprint-capacity-fill ${isOver ? 'over' : ''}" style="width:${Math.min(capacityPct, 100)}%"></div>
            </div>
            <span>${committedPts}pts / ${avgVelocity}pts avg${isOver ? ' ⚠️' : ''}</span>
        </div>
    ` : `<span style="font-size:10px;color:#94a3b8;">No velocity history</span>`

    // Unassigned backlog items (no sprintId), sorted by groom score desc
    const _plannerActiveTeam = typeof getActiveTeam === 'function' ? getActiveTeam() : null
    const allItems = []
    UPDATE_DATA.tracks.forEach(track => {
        if (_plannerActiveTeam && _plannerActiveTeam !== track.name) return
        track.subtracks.forEach(sub => {
            sub.items.forEach(item => {
                if (!item.sprintId) allItems.push(item)
            })
        })
    })
    allItems.sort((a, b) => computeGroomScore(b) - computeGroomScore(a))
    const topBacklog = allItems.slice(0, 30)

    const backlogRows = topBacklog.length > 0
        ? topBacklog.map(item => {
            const score = computeGroomScore(item)
            const badgeClass = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low'
            const pts = item.storyPoints > 0 ? `<span style="font-size:10px;color:#94a3b8;">${item.storyPoints}sp</span>` : ''
            return `
                <div class="sprint-planning-item"
                    draggable="true"
                    ondragstart="sprintPlanDragStart(event, '${item.id}')"
                    title="${(item.text || '').replace(/'/g, '&#39;')}">
                    <span class="planning-groom-badge ${badgeClass}">${score}</span>
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:#1e293b;">${item.text || '—'}</span>
                    ${pts}
                    <button class="sprint-assign-btn" onclick="plannerAssignToSprint('${item.id}', '${sprintId}')">→ Sprint</button>
                </div>`
        }).join('')
        : '<div class="text-center py-6 text-slate-400 italic text-xs">All items are assigned to sprints</div>'

    // Current sprint items list
    const sprintRows = currentItems.length > 0
        ? currentItems.map(item => {
            const pts = item.storyPoints > 0 ? `<span style="font-size:10px;color:#94a3b8;">${item.storyPoints}sp</span>` : ''
            return `
                <div class="sprint-planning-item" title="${(item.text || '').replace(/'/g, '&#39;')}">
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:#1e293b;">${item.text || '—'}</span>
                    ${pts}
                    <button class="sprint-remove-btn" onclick="plannerRemoveFromSprint('${item.id}')">✕</button>
                </div>`
        }).join('')
        : `<div class="sprint-planning-drag-zone"
                ondragover="event.preventDefault();this.classList.add('over')"
                ondragleave="this.classList.remove('over')"
                ondrop="sprintPlanDrop(event, '${sprintId}');this.classList.remove('over')">
                Drop items here to add to sprint
            </div>`

    // Editable goal field
    const goalHtml = `
        <div style="padding:10px 14px;background:#f8fafc;border-top:1.5px solid #e2e8f0;">
            <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:4px;">Sprint Goal</div>
            <textarea class="sprint-goal-input" rows="2"
                placeholder="Set a clear goal for this sprint…"
                onblur="updateSprintGoal('${sprintId}', this.value)"
                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.blur()}"
            >${sprint.goal || ''}</textarea>
        </div>
    `

    return `
        <div class="sprint-planning-panel">
            <div class="sprint-planning-col">
                <div class="sprint-planning-col-header backlog">
                    <span>📋 Backlog — top ${topBacklog.length} by readiness</span>
                    <span style="font-size:10px;font-weight:600;color:#94a3b8;">${allItems.length} unassigned</span>
                </div>
                <div class="sprint-planning-item-list">${backlogRows}</div>
            </div>
            <div class="sprint-planning-col">
                <div class="sprint-planning-col-header sprint">
                    <span>🏃 ${sprint.name}</span>
                    ${capacityBar}
                </div>
                <div class="sprint-planning-item-list"
                    ondragover="event.preventDefault();document.getElementById('sprint-drop-zone-${sprintId}')?.classList.add('over')"
                    ondragleave="document.getElementById('sprint-drop-zone-${sprintId}')?.classList.remove('over')"
                    ondrop="sprintPlanDrop(event,'${sprintId}')">
                    ${sprintRows}
                    ${currentItems.length > 0 ? `
                        <div class="sprint-planning-drag-zone" id="sprint-drop-zone-${sprintId}"
                            ondragover="event.preventDefault();this.classList.add('over')"
                            ondragleave="this.classList.remove('over')"
                            ondrop="sprintPlanDrop(event,'${sprintId}');this.classList.remove('over')">
                            Drop more items here
                        </div>` : ''}
                </div>
                ${goalHtml}
            </div>
        </div>
    `
}

function sprintPlanDragStart(event, itemId) {
    event.dataTransfer.setData('text/plain', itemId)
    event.dataTransfer.effectAllowed = 'move'
}
window.sprintPlanDragStart = sprintPlanDragStart

function sprintPlanDrop(event, sprintId) {
    event.preventDefault()
    const itemId = event.dataTransfer.getData('text/plain')
    if (!itemId) return
    plannerAssignToSprint(itemId, sprintId)
}
window.sprintPlanDrop = sprintPlanDrop

function plannerAssignToSprint(itemId, sprintId) {
    if (typeof quickAssignSprint === 'function') {
        quickAssignSprint(itemId, sprintId)
    }
    // Re-render sprint view preserving planning panel open state
    const openPlanningId = window._sprintPlanningOpenId
    renderSprintView()
    if (openPlanningId) window._sprintPlanningOpenId = openPlanningId
}
window.plannerAssignToSprint = plannerAssignToSprint

function plannerRemoveFromSprint(itemId) {
    if (typeof quickAssignSprint === 'function') {
        quickAssignSprint(itemId, '')
    }
    const openPlanningId = window._sprintPlanningOpenId
    renderSprintView()
    if (openPlanningId) window._sprintPlanningOpenId = openPlanningId
}
window.plannerRemoveFromSprint = plannerRemoveFromSprint

function toggleSprintPlanning(sprintId) {
    if (sprintId === null) {
        // Ribbon toggle: open first active/planned sprint, or close if already open
        if (window._sprintPlanningOpenId) {
            window._sprintPlanningOpenId = null
        } else {
            const sprints = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.sprints) || []
            const target = sprints.find(s => s.status === 'active') || sprints.find(s => s.status !== 'completed')
            window._sprintPlanningOpenId = target ? target.id : null
        }
    } else if (window._sprintPlanningOpenId === sprintId) {
        window._sprintPlanningOpenId = null
    } else {
        window._sprintPlanningOpenId = sprintId
    }
    renderSprintView()
}
window.toggleSprintPlanning = toggleSprintPlanning

// ------ Sprint View ------
function renderSprintView() {
    const container = document.getElementById('sprint-view');
    if (!container) return;
    const sprints = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.sprints) || [];

    let ribbonHtml = `
        <div style="position:relative;margin-bottom:24px;">
            <div id="sprint-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <!-- Group 1: Navigation/Breadcrumb -->
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">🏃</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-medium text-slate-400">Stage 3 · Plan — Work your team has committed to this time window</span>
                        <h2 class="text-sm font-black text-slate-800">Sprint Management</h2>
                    </div>
                    ${typeof renderInfoButton === 'function' ? renderInfoButton('sprint') : ''}
                </div>

                <!-- Group 2: Sprint HUD + Actions -->
                <div class="flex items-center gap-2">
                    <div id="sprint-ribbon-hud"></div>
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
                    ${getCurrentMode() !== 'exec' ? `
                    <button onclick="toggleSprintPlanning(null)"
                        class="sprint-planning-toggle ${window._sprintPlanningOpenId ? 'active' : ''}">
                        📐 Plan
                    </button>` : ''}
                </div>
            </div>
            ${typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('sprint') : ''}
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
        const isClosed = s.status === 'completed';
        const sprintItems = applyExecFilter(findItemsByMetadataId('sprintId', s.id), 'sprint');
        const isActive = s.status === 'active';
        const isPlanned = !isClosed && !isActive;
        const cmsActions = shouldShowManagement() ? `
            <div class="flex gap-1.5 ml-4">
                <button onclick="openSprintEdit('${s.id}')" class="item-action-btn edit">Edit</button>
                <button onclick="deleteSprint('${s.id}')" class="item-action-btn delete">Delete</button>
                ${isClosed
                    ? `<button onclick="viewCeremonyAudit('sprint', '${s.id}')" class="item-action-btn neutral no-disable">📜 Audit</button>`
                    : isPlanned
                        ? `<button onclick="kickoffSprint('${s.id}')" class="item-action-btn lifecycle no-disable">🚀 Kickoff</button>`
                        : `<button onclick="renderSprintCloseModal('${s.id}')" class="item-action-btn lifecycle no-disable">🏁 Close Sprint</button>`
                }
                <button onclick="addItem(0, 0, { sprintId: '${s.id}' })" class="item-action-btn okr">+ Task</button>
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

        const sprintRibbonText = isClosed ? 'Closed' : isActive ? 'Active' : 'Planned';
        const sprintRibbonClass = isClosed ? 'ribbon-closed' : isActive ? 'ribbon-active' : 'ribbon-planned';

        const isPlanningOpen = window._sprintPlanningOpenId === s.id
        const planningToggleBtn = !isClosed && getCurrentMode() !== 'exec' ? `
            <button onclick="toggleSprintPlanning('${s.id}')"
                class="sprint-planning-toggle ${isPlanningOpen ? 'active' : ''}">
                📐 ${isPlanningOpen ? 'Hide Plan' : 'Plan Sprint'}
            </button>` : ''

        html += `
            <div class="sprint-card bg-white border rounded-xl overflow-hidden mb-8 shadow-sm corner-ribbon-wrap ${isClosed ? 'lifecycle-closed' : ''}">
                ${(isClosed || isActive) ? `<div class="corner-ribbon ${sprintRibbonClass}">${sprintRibbonText}</div>` : ''}
                <div class="p-6 bg-slate-50 border-b">
                    <div class="flex justify-between items-start">
                        <div>
                            ${sprintOKR ? `<div class="mb-2"><span class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black uppercase tracking-widest border border-indigo-100">🎯 Alignment: ${sprintOKR.objective.substring(0, 50)}${sprintOKR.objective.length > 50 ? '...' : ''}</span></div>` : ''}
                            <div class="flex items-center gap-3">
                                <div class="font-black text-2xl text-slate-900">${s.name}</div>
                                ${isClosed ? `<span class="lifecycle-closed-badge">✓ Closed</span>` : isActive ? `<span class="lifecycle-closed-badge" style="background:#eef2ff;border-color:#c7d2fe;color:#4f46e5;">● Active</span>` : ''}
                                ${planningToggleBtn}
                                ${cmsActions}
                            </div>
                            <div class="flex items-center gap-3 mt-1 flex-wrap">
                                <span class="text-sm font-bold text-slate-500">📅 ${s.startDate || 'TBD'} - ${s.endDate || 'TBD'}</span>
                                ${releasePill}
                                ${!isClosed && shouldShowManagement() ? `<button onclick="promoteSprintToRelease('${s.id}')" class="sprint-promote-btn">📦 Promote Done Items →</button>` : ''}
                            </div>
                        </div>
                        <div class="text-right">
                             <div class="text-[10px] font-medium text-slate-400 mb-1">Capacity</div>
                             <span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold uppercase tracking-wider">${totalSprintItems} Tasks</span>
                             ${totalSprintItems > 0 ? `
                             <div class="sprint-density-bar mt-2">
                                 ${densityDots}
                             </div>
                             <div class="text-[10px] text-slate-400 mt-1 font-bold">${doneItems}/${totalSprintItems} done · ${donePct}%</div>
                             ` : ''}
                        </div>
                    </div>
                    ${isPlanningOpen ? '' : `
                    <div class="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-600 italic">
                        <span class="font-bold text-slate-800 not-italic">Goal:</span> ${s.goal || 'No goal set for this sprint.'}
                    </div>`}
                </div>
                ${isPlanningOpen ? buildSprintPlanningPanel(s) : ''}
                <div class="p-2 space-y-4">
                    ${renderGroupedItems(sprintItems, 'sprint')}
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

// ------ Releases View ------
// ------ Release Readiness helpers (F26) ------

function computeReleaseReadiness(release, items) {
    const sprints = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.sprints) || []
    const checks = []

    // 1. Has a name
    checks.push({
        id: 'name',
        label: 'Release has a name',
        pass: !!(release.name && release.name.trim())
    })

    // 2. Has a target date
    checks.push({
        id: 'date',
        label: 'Target date set',
        pass: !!(release.targetDate && release.targetDate.trim())
    })

    // 3. Has at least one item in scope
    checks.push({
        id: 'scope',
        label: 'At least one item in scope',
        pass: items.length > 0
    })

    // 4. All items done (no open blockers or in-flight work)
    const openItems = items.filter(i => i.status !== 'done')
    checks.push({
        id: 'done',
        label: `All items done (${items.length - openItems.length} / ${items.length})`,
        pass: items.length > 0 && openItems.length === 0
    })

    // 5. No open blockers among release items
    const openBlockers = items.filter(i => i.blocker && i.status !== 'done')
    checks.push({
        id: 'blockers',
        label: openBlockers.length === 0 ? 'No open blockers' : `${openBlockers.length} open blocker${openBlockers.length > 1 ? 's' : ''}`,
        pass: openBlockers.length === 0
    })

    // 6. At least one closed sprint feeds this release
    const releasedIds = new Set(items.map(i => i.sprintId).filter(Boolean))
    const feedingSprints = sprints.filter(s => s.status === 'completed' && releasedIds.has(s.id))
    checks.push({
        id: 'sprint',
        label: feedingSprints.length > 0
            ? `${feedingSprints.length} closed sprint${feedingSprints.length > 1 ? 's' : ''} feeding release`
            : 'At least one closed sprint feeding release',
        pass: feedingSprints.length > 0
    })

    // 7. Linked to an OKR
    checks.push({
        id: 'okr',
        label: release.linkedOKR ? 'Linked to an OKR' : 'No OKR linked (optional)',
        pass: !!release.linkedOKR,
        optional: true
    })

    const required = checks.filter(c => !c.optional)
    const passed = required.filter(c => c.pass).length
    const score = Math.round((passed / required.length) * 100)

    let status
    if (score === 100) status = 'ready'
    else if (score >= 60) status = 'partial'
    else status = 'blocked'

    return { score, status, checks, passed, total: required.length }
}

function buildReleaseReadinessBadge(readiness) {
    if (readiness.status === 'ready') {
        return `<span class="release-ready-badge ready">✓ Ready to Ship</span>`
    }
    if (readiness.status === 'partial') {
        return `<span class="release-ready-badge partial">⚠ ${readiness.passed}/${readiness.total} checks</span>`
    }
    return `<span class="release-ready-badge blocked">✕ ${readiness.passed}/${readiness.total} checks</span>`
}

function buildReleaseReadinessChecklist(release, items, readiness) {
    const panelId = `release-readiness-${release.id}`
    const isOpen = !!(window._releaseReadinessOpen && window._releaseReadinessOpen[release.id])

    const checkRows = readiness.checks.map(c => `
        <div class="readiness-check-row ${c.pass ? 'pass' : c.optional ? 'optional' : 'fail'}">
            <span class="readiness-check-icon">${c.pass ? '✓' : c.optional ? '○' : '✕'}</span>
            <span class="readiness-check-label">${c.label}${c.optional ? ' <span class="readiness-optional-tag">optional</span>' : ''}</span>
        </div>
    `).join('')

    const scoreBar = `
        <div class="readiness-score-bar-wrap">
            <div class="readiness-score-bar">
                <div class="readiness-score-fill ${readiness.status}" style="width:${readiness.score}%"></div>
            </div>
            <span class="readiness-score-label">${readiness.score}%</span>
        </div>
    `

    return `
        <div class="release-readiness-panel">
            <button class="readiness-toggle-btn" onclick="toggleReleaseReadiness('${release.id}')">
                ${buildReleaseReadinessBadge(readiness)}
                ${scoreBar}
                <span class="readiness-chevron">${isOpen ? '▲' : '▼'}</span>
            </button>
            ${isOpen ? `
            <div class="readiness-checklist" id="${panelId}">
                ${checkRows}
            </div>` : ''}
        </div>
    `
}

function toggleReleaseReadiness(releaseId) {
    if (!window._releaseReadinessOpen) window._releaseReadinessOpen = {}
    window._releaseReadinessOpen[releaseId] = !window._releaseReadinessOpen[releaseId]
    renderReleasesView()
}
window.toggleReleaseReadiness = toggleReleaseReadiness

function renderReleasesView() {
    const container = document.getElementById('releases-view');
    if (!container) return;
    const releases = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.releases) || [];

    const _allReleaseItems = releases.flatMap(r => findItemsByMetadataId('releasedIn', r.id));
    const _filteredReleaseItems = applyExecFilter(_allReleaseItems, 'releases');

    // Pre-compute readiness summary pills for the ribbon
    const openReleases = releases.filter(r => r.status !== 'completed')
    let readinessPillsHtml = ''
    if (openReleases.length > 0) {
        const statuses = openReleases.map(r => {
            const items = applyExecFilter(findItemsByMetadataId('releasedIn', r.id), 'releases')
            return computeReleaseReadiness(r, items).status
        })
        const readyCount   = statuses.filter(s => s === 'ready').length
        const partialCount = statuses.filter(s => s === 'partial').length
        const blockedCount = statuses.filter(s => s === 'blocked').length
        readinessPillsHtml = [
            readyCount   > 0 ? `<span class="release-ready-badge ready">${readyCount} Ready</span>` : '',
            partialCount > 0 ? `<span class="release-ready-badge partial">${partialCount} Partial</span>` : '',
            blockedCount > 0 ? `<span class="release-ready-badge blocked">${blockedCount} Blocked</span>` : ''
        ].filter(Boolean).join('')
    }

    const ribbonHtml = `
        <div style="position:relative;margin-bottom:24px;">
            <div id="releases-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <!-- Group 1: Navigation/Breadcrumb -->
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">📦</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-medium text-slate-400">Stage 5 · Ship — Publish completed work to stakeholders</span>
                        <h2 class="text-sm font-black text-slate-800">Engineering Releases</h2>
                    </div>
                    ${typeof renderInfoButton === 'function' ? renderInfoButton('releases') : ''}
                    ${readinessPillsHtml ? `<div class="flex items-center gap-2 ml-2">${readinessPillsHtml}</div>` : ''}
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
            ${typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('releases') : ''}
        </div>
    `;

    let html = ribbonHtml + renderExecFilterBanner(_filteredReleaseItems.length, _allReleaseItems.length, 'releases');

    if (releases.length === 0) {
        container.innerHTML = html + (typeof renderSmartEmptyState === 'function' ? renderSmartEmptyState('releases') : '<div class="text-center py-20 text-slate-400">No releases defined</div>');
        return;
    }

    releases.forEach((r, idx) => {
        const isClosed = r.status === 'completed';
        const isInProgress = r.status === 'in_progress';
        const isPlannedRelease = !isClosed && !isInProgress;
        const releaseItems = applyExecFilter(findItemsByMetadataId('releasedIn', r.id), 'releases');
        const cmsActions = shouldShowManagement() ? `
            <div class="flex gap-1.5 ml-4">
                <button onclick="openReleaseEdit('${r.id}')" class="item-action-btn edit">Edit</button>
                <button onclick="deleteRelease('${r.id}')" class="item-action-btn delete">Delete</button>
                ${isClosed
                    ? `<button onclick="viewCeremonyAudit('release', '${r.id}')" class="item-action-btn neutral no-disable">📜 Audit</button>`
                    : isPlannedRelease
                        ? `<button onclick="lockReleaseScope('${r.id}')" class="item-action-btn lifecycle no-disable">📋 Lock Scope</button>`
                        : `<button onclick="shipRelease('${r.id}')" class="item-action-btn lifecycle no-disable">🚢 Ship Release</button>`
                }
                <button onclick="addItem(0, 0, { releasedIn: '${r.id}' })" class="item-action-btn okr">+ Task</button>
            </div>
        ` : '';

        const releaseOKR = UPDATE_DATA.metadata.okrs?.find(o => o.id === r.linkedOKR);
        const releaseRibbonText = isClosed ? 'Shipped' : isInProgress ? 'In Progress' : 'Planned';
        const releaseRibbonClass = isClosed ? 'ribbon-shipped' : isInProgress ? 'ribbon-active' : 'ribbon-planned';

        const readiness = computeReleaseReadiness(r, releaseItems)

        const epicsInRelease = [...new Map(
            releaseItems.filter(i => i.epicId)
                .map(i => {
                    const ep = (UPDATE_DATA.metadata?.epics || []).find(e => e.id === i.epicId)
                    return ep ? [ep.id, ep] : null
                })
                .filter(Boolean)
        ).values()]

        html += `
            <div class="sprint-card bg-white border rounded-xl overflow-hidden mb-8 shadow-sm corner-ribbon-wrap ${isClosed ? 'lifecycle-closed' : ''}">
                ${(isClosed || isInProgress) ? `<div class="corner-ribbon ${releaseRibbonClass}">${releaseRibbonText}</div>` : ''}
                <div class="p-6 bg-slate-50 border-b">
                    <div class="flex justify-between items-start">
                        <div>
                            ${releaseOKR ? `<div class="mb-2"><span class="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-black uppercase tracking-widest border border-amber-100">🚀 Strategic Value: ${releaseOKR.objective.substring(0, 50)}${releaseOKR.objective.length > 50 ? '...' : ''}</span></div>` : ''}
                            <div class="flex items-center gap-3">
                                <div class="font-black text-2xl text-slate-900">${r.name}</div>
                                ${isClosed ? `<span class="lifecycle-closed-badge">✓ Shipped</span>` : isInProgress ? `<span class="lifecycle-closed-badge" style="background:#ecfdf5;border-color:#a7f3d0;color:#047857;">● Locked</span>` : ''}
                                ${cmsActions}
                            </div>
                            <div class="text-sm font-bold text-slate-500 mt-1">🎯 Target: ${r.targetDate || 'TBD'}</div>
                        </div>
                        <div class="text-right">
                             <div class="text-[10px] font-medium text-slate-400 mb-1">Scope</div>
                             <span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold uppercase tracking-wider">${releaseItems.length} Tasks</span>
                        </div>
                    </div>
                    ${!isClosed ? buildReleaseReadinessChecklist(r, releaseItems, readiness) : ''}
                </div>
                ${epicsInRelease.length ? `
                    <div class="px-6 pb-3 flex flex-wrap gap-2 items-center">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Epics:</span>
                        ${epicsInRelease.map(ep => `<button onclick="switchView('epics')" class="release-epic-pill">📍 ${ep.name}</button>`).join('')}
                    </div>` : ''}
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
    const activeTeam = typeof getActiveTeam === 'function' ? getActiveTeam() : null
    data.tracks.forEach((track, ti) => {
        if (activeTeam && activeTeam !== track.name) return
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
    const container = document.getElementById('gantt-view')
    if (!container) return

    const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm'

    const personaLabel = mode === 'exec'
        ? 'OKR-linked epics only'
        : mode === 'dev'
            ? 'your epics & tasks'
            : 'all epics & tasks'

    container.innerHTML = `
        <div style="position:relative;margin-bottom:24px;">
            <div id="gantt-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">📅</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-medium text-slate-400">Plan · Timeline — ${personaLabel}</span>
                        <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest">Gantt Timeline</h2>
                    </div>
                    ${typeof renderInfoButton === 'function' ? renderInfoButton('gantt') : ''}
                </div>
                <div class="flex items-center gap-2">
                    <div id="gantt-next-action-mount">
                        ${typeof renderPrimaryStageAction === 'function' ? renderPrimaryStageAction('gantt') : ''}
                    </div>
                </div>
            </div>
            ${typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('gantt') : ''}
        </div>
        <div class="overflow-x-auto w-full bg-white rounded-xl border border-slate-200">
            <div id="gantt-chart-container" style="min-height:400px; min-width: 1200px;"></div>
        </div>
    `

    // Guard: Google Charts CDN may not be available
    if (typeof google === 'undefined' || typeof google.charts === 'undefined') {
        document.getElementById('gantt-chart-container').innerHTML = `
            <div class="p-12 text-center">
                <div class="text-4xl mb-3">⚠️</div>
                <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest">Charts library unavailable</h3>
                <p class="text-xs text-slate-500 mt-2">Google Charts CDN could not be reached. Check your network connection.</p>
            </div>`
        return
    }

    // Capture mode for use inside the async callback
    const _mode = mode
    setTimeout(() => {
        google.charts.load('current', { packages: ['gantt'] })
        google.charts.setOnLoadCallback(() => drawGanttChart(_mode))
    }, 0)
}

function drawGanttChart(mode) {
    const container = document.getElementById('gantt-chart-container')
    if (!container) return

    const allEpics   = UPDATE_DATA.metadata?.epics    || []
    const allSprints = UPDATE_DATA.metadata?.sprints   || []
    const allOkrs    = UPDATE_DATA.metadata?.okrs      || []

    // Build sprint lookup for start-date fallback on items that have no startDate
    const sprintById = {}
    allSprints.forEach(s => { sprintById[s.id] = s })

    // Resolve current user name for Dev persona
    const currentUser = (typeof window.CURRENT_USER !== 'undefined' && window.CURRENT_USER?.name)
        ? window.CURRENT_USER.name
        : null

    const _ganttActiveTeam = typeof getActiveTeam === 'function' ? getActiveTeam() : null

    // Determine which epic IDs are visible for this persona
    let visibleEpicIds = null // null = all
    if (mode === 'exec') {
        // Exec: only epics linked to an active/in-flight OKR
        const activeOkrIds = new Set(allOkrs.map(o => o.id))
        visibleEpicIds = new Set(allEpics.filter(e => activeOkrIds.has(e.linkedOKR)).map(e => e.id))
    } else if (mode === 'dev' && currentUser) {
        // Dev: only epics where the contributor has at least one item
        const devEpicIds = new Set()
        ;(UPDATE_DATA.tracks || []).forEach(track => {
            if (_ganttActiveTeam && _ganttActiveTeam !== track.name) return
            track.subtracks.forEach(subtrack => {
                subtrack.items.forEach(item => {
                    if ((item.contributors || []).includes(currentUser) && item.epicId) {
                        devEpicIds.add(item.epicId)
                    }
                })
            })
        })
        visibleEpicIds = devEpicIds
    }

    // --- Build epic rows ---
    const rows = []
    const epicDates = {} // epic.id → { start, end, total, done }

    allEpics.forEach(epic => {
        if (visibleEpicIds !== null && !visibleEpicIds.has(epic.id)) return

        let start = epic.startDate ? new Date(epic.startDate) : null
        let end   = epic.endDate   ? new Date(epic.endDate)   : null
        let total = 0, done = 0

        // Scan items to fill missing dates and compute progress
        ;(UPDATE_DATA.tracks || []).forEach(track => {
            if (_ganttActiveTeam && _ganttActiveTeam !== track.name) return
            track.subtracks.forEach(subtrack => {
                subtrack.items.forEach(item => {
                    if (item.epicId !== epic.id) return
                    // Persona filter on items
                    if (mode === 'dev' && currentUser && !(item.contributors || []).includes(currentUser)) return
                    total++
                    if (item.status === 'done') done++

                    // Start: item.startDate → sprint start → skip
                    let itemStart = null
                    if (item.startDate) {
                        itemStart = new Date(item.startDate)
                    } else if (item.sprintId && sprintById[item.sprintId]?.startDate) {
                        itemStart = new Date(sprintById[item.sprintId].startDate)
                    }
                    if (itemStart && (!start || itemStart < start)) start = itemStart

                    // End: item.due → sprint end → skip
                    let itemEnd = null
                    if (item.due) {
                        itemEnd = new Date(item.due)
                    } else if (item.sprintId && sprintById[item.sprintId]?.endDate) {
                        itemEnd = new Date(sprintById[item.sprintId].endDate)
                    }
                    if (itemEnd && (!end || itemEnd > end)) end = itemEnd
                })
            })
        })

        if (!start || !end || start >= end) return

        epicDates[epic.id] = { start, end }
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        const depString = (epic.dependencies?.length > 0) ? epic.dependencies.join(',') : null

        rows.push([epic.id, epic.name, epic.track || 'Strategy', start, end, null, pct, depString])
    })

    // --- Build item rows (PM mode only — too granular for Dev/Exec) ---
    const validRowIds = new Set(rows.map(r => r[0]))
    const itemRowsPendingDeps = []

    if (mode === 'pm') {
        ;(UPDATE_DATA.tracks || []).forEach(track => {
            if (_ganttActiveTeam && _ganttActiveTeam !== track.name) return
            track.subtracks.forEach(subtrack => {
                subtrack.items.forEach(item => {
                    // Item must belong to a visible epic that has a row
                    if (item.epicId && !validRowIds.has(item.epicId)) return

                    let start = item.startDate ? new Date(item.startDate) : null
                    if (!start && item.sprintId && sprintById[item.sprintId]?.startDate) {
                        start = new Date(sprintById[item.sprintId].startDate)
                    }
                    const end = item.due ? new Date(item.due) : null
                    if (!start || !end || start >= end) return

                    const pct = item.status === 'done' ? 100 : item.status === 'now' ? 50 : 0
                    const resource = item.epicId
                        ? (allEpics.find(e => e.id === item.epicId)?.name || 'Task')
                        : 'Orphan Task'

                    validRowIds.add(item.id)
                    itemRowsPendingDeps.push({
                        row: [item.id, item.text.substring(0, 35), resource, start, end, null, pct, ''],
                        deps: item.dependencies || []
                    })
                })
            })
        })

        itemRowsPendingDeps.forEach(info => {
            const safeDeps = info.deps.filter(id => validRowIds.has(id))
            info.row[7] = safeDeps.length > 0 ? safeDeps.join(',') : null
            rows.push(info.row)
        })
    }

    // --- Empty state ---
    if (!rows.length) {
        const hint = mode === 'exec'
            ? 'No OKR-linked epics with date ranges found.'
            : mode === 'dev'
                ? 'No epics with your contributor tag have date ranges yet.'
                : 'Add dates to Epics (or to sprint items) to generate the timeline.'
        container.innerHTML = `
            <div class="p-12 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <div class="text-4xl mb-3">📅</div>
                <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest">No Timeline Data</h3>
                <p class="text-xs text-slate-500 mt-2">${hint}</p>
            </div>`
        return
    }

    // --- Dynamic width ---
    let minDate = null, maxDate = null
    rows.forEach(r => {
        if (r[3] && (!minDate || r[3] < minDate)) minDate = r[3]
        if (r[4] && (!maxDate || r[4] > maxDate)) maxDate = r[4]
    })
    let chartWidth = 1200
    if (minDate && maxDate) {
        const days = (maxDate - minDate) / (1000 * 60 * 60 * 24)
        chartWidth = Math.max(1200, Math.round(days * 15))
    }
    container.style.width = chartWidth + 'px'

    // --- Draw ---
    const data = new google.visualization.DataTable()
    data.addColumn('string', 'Task ID')
    data.addColumn('string', 'Task Name')
    data.addColumn('string', 'Resource')
    data.addColumn('date',   'Start Date')
    data.addColumn('date',   'End Date')
    data.addColumn('number', 'Duration')
    data.addColumn('number', 'Percent Complete')
    data.addColumn('string', 'Dependencies')
    data.addRows(rows)

    const options = {
        height: rows.length * 45 + 50,
        width: chartWidth,
        gantt: {
            trackHeight: 45,
            labelStyle: { fontName: 'Inter', fontSize: 11, color: '#1e293b' },
            barCornerRadius: 4
        }
    }
    const chart = new google.visualization.Gantt(container)

    // Click-through: epic → openEpicEdit, item → openItemEdit
    google.visualization.events.addListener(chart, 'select', function () {
        const selection = chart.getSelection()
        if (!selection.length) return
        const rowId = data.getValue(selection[0].row, 0)
        const epics = UPDATE_DATA.metadata?.epics || []
        const epicIndex = epics.findIndex(e => e.id === rowId)
        if (epicIndex !== -1) {
            if (typeof openEpicEdit === 'function') openEpicEdit(epicIndex)
            return
        }
        ;(UPDATE_DATA.tracks || []).forEach((track, tIdx) => {
            track.subtracks.forEach((subtrack, sIdx) => {
                const itemIndex = subtrack.items.findIndex(i => i.id === rowId)
                if (itemIndex !== -1 && typeof openItemEdit === 'function') {
                    openItemEdit(tIdx, sIdx, itemIndex)
                }
            })
        })
    })

    chart.draw(data, options)
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
            { phase: '4', cadence: 'Bi-Weekly', title: 'Sprint Close Ceremony', goal: 'Formalize sprint end, record velocity, and rollover items.', insight: 'Formal closure ensures data integrity and team reflection.', event: 'Sprint Close', people: 'PM, EM', view: 'sprint', label: 'Close Sprint' },
            { phase: '5', cadence: 'By Release', title: 'Release Ship Ceremony', goal: 'Finalize production milestones and ship code.', insight: 'Shipping is the only metric that truly counts for the business.', event: 'Release Sync', people: 'PM, Devs', view: 'releases', label: 'Ship' },
            { phase: '5', cadence: 'Bi-Weekly', title: 'Analytics & Review', goal: 'Review velocity and performance trends.', insight: 'Data-driven retros lead to process optimization.', event: 'Retrospective', people: 'PM, EM, Devs', view: 'analytics', label: 'Metrics' },
            { phase: '5', cadence: 'Quarterly', title: 'OKR Close Ceremony', goal: 'Score outcomes and record quarterly impact.', insight: 'Closing the loop ensures strategic learning for the next cycle.', event: 'Outcome Review', people: 'Founders, PM', view: 'okr', label: 'Close OKR' }
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
                    <div class="text-[10px] font-medium text-slate-400 mb-4 tracking-widest uppercase">Engineering Playbook</div>
                    <h2 class="text-3xl font-bold text-slate-800 tracking-tight mb-8">Lifecycle Sequential Guide</h2>
                    
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
                                <span class="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">Stage ${step.phase}</span>
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">${step.cadence}</span>
                            </div>
                            <button onclick="switchView('${step.view}')" class="btn-ghost-v3">
                                Go to ${step.label}
                            </button>
                        </div>

                        <h3 class="text-base font-bold text-slate-800 mb-4 leading-tight">${step.title}</h3>

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
        'okr': { text: 'Refine Epics 🚀', target: 'epics' },
        'epics': { text: 'Map Roadmap 🗺️', target: 'roadmap' },
        'roadmap': { text: 'Groom Backlog 📚', target: 'backlog' },
        'backlog': { text: 'Scope Sprints 🏃', target: 'sprint' },
        'sprint': { text: 'Execute Work ⚡', target: 'track' },
        'track': { text: 'Ship Release 📦', target: 'releases' },
        'kanban': { text: 'Ship Release 📦', target: 'releases' },
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
                    <span class="text-[10px] font-medium text-slate-400">Stage 1 · Discover — Ideation sandbox for capturing raw requests and explorations</span>
                    <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest">${title}</h2>
                </div>
                ${typeof renderInfoButton === 'function' ? renderInfoButton(currentView) : ''}
            </div>
            
            <div class="flex items-center gap-3">
                ${shouldShowManagement() ? `
                <button onclick="openAddItemModal('${currentView === 'ideation' ? 'idea' : 'spike'}')"
                        class="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-900 transition-all">
                    + Add ${currentView === 'ideation' ? 'Idea' : 'Spike'}
                </button>` : ''}
                <button onclick="switchView('${currentView === 'ideation' ? 'spikes' : 'okr'}')"
                        class="bg-white text-slate-900 border border-slate-200 px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 transition-all flex items-center gap-2">
                    Next: ${currentView === 'ideation' ? 'Explore Spikes' : 'Set Strategy'} 🚀
                </button>
            </div>
        </div>
    `;
    ribbonHtml += typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer(currentView) : '';

    // Filter for ideas and spikes across all tracks
    const _discoveryActiveTeam = typeof getActiveTeam === 'function' ? getActiveTeam() : null
    let allItems = [];
    if (UPDATE_DATA && UPDATE_DATA.tracks) {
        UPDATE_DATA.tracks.forEach(t => {
            if (_discoveryActiveTeam && _discoveryActiveTeam !== t.name) return
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
                    <h3 class="text-xl font-bold text-slate-900">No active discovery items</h3>
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

// ------ Activity Feed View (F27) ------

// Action type config: icon + colour class
const ACTIVITY_ACTION_CONFIG = {
    // Item-level
    'Edit Item':          { icon: '✏️', group: 'item',     label: 'Item edited' },
    'Add Item':           { icon: '➕', group: 'item',     label: 'Item added' },
    'Delete Item':        { icon: '🗑️', group: 'item',     label: 'Item deleted' },
    'status-change':      { icon: '🔄', group: 'item',     label: 'Status changed' },
    'priority-change':    { icon: '⚡', group: 'item',     label: 'Priority changed' },
    'sprint-assign':      { icon: '🏃', group: 'item',     label: 'Assigned to sprint' },
    'release-assign':     { icon: '📦', group: 'item',     label: 'Assigned to release' },
    'bulk-assign':        { icon: '📋', group: 'item',     label: 'Bulk assigned' },
    'Groom Item (storyPoints)': { icon: '🎯', group: 'item', label: 'Story points set' },
    'Groom Item (epicId)':      { icon: '🔗', group: 'item', label: 'Epic linked' },
    'Groom Item (priority)':    { icon: '⚡', group: 'item', label: 'Priority groomed' },
    'Groom Item (acceptanceCriteria)': { icon: '📝', group: 'item', label: 'AC updated' },
    'Move to Backlog':    { icon: '📚', group: 'item',     label: 'Moved to backlog' },
    'Flag Blocker':       { icon: '🚫', group: 'item',     label: 'Blocker flagged' },
    'Blocker Resolved':   { icon: '✅', group: 'item',     label: 'Blocker resolved' },
    'Unblock Item':       { icon: '✅', group: 'item',     label: 'Item unblocked' },
    // Sprint-level
    'Add Sprint':         { icon: '🏁', group: 'sprint',   label: 'Sprint created' },
    'Edit Sprint':        { icon: '✏️', group: 'sprint',   label: 'Sprint edited' },
    'Delete Sprint':      { icon: '🗑️', group: 'sprint',   label: 'Sprint deleted' },
    'sprint-goal-update': { icon: '🎯', group: 'sprint',   label: 'Sprint goal updated' },
    // Release-level
    'Add Release':        { icon: '🚀', group: 'release',  label: 'Release created' },
    'Edit Release':       { icon: '✏️', group: 'release',  label: 'Release edited' },
    'Delete Release':     { icon: '🗑️', group: 'release',  label: 'Release deleted' },
    'Release Builder':    { icon: '📦', group: 'release',  label: 'Items promoted to release' },
    // Epic/OKR-level
    'Add Epic':           { icon: '🌟', group: 'strategic', label: 'Epic created' },
    'Edit Epic':          { icon: '✏️', group: 'strategic', label: 'Epic edited' },
    'Delete Epic':        { icon: '🗑️', group: 'strategic', label: 'Epic deleted' },
    'epic-horizon-assign':{ icon: '🗺️', group: 'strategic', label: 'Horizon assigned' },
    'Add OKR':            { icon: '🎯', group: 'strategic', label: 'OKR created' },
    'Edit OKR':           { icon: '✏️', group: 'strategic', label: 'OKR edited' },
    'Delete OKR':         { icon: '🗑️', group: 'strategic', label: 'OKR deleted' },
    'okr-recalc':         { icon: '📊', group: 'strategic', label: 'OKR progress updated' },
    // Other
    'Edit Metadata':      { icon: '⚙️', group: 'system',   label: 'Metadata updated' },
    'Add Track':          { icon: '🏗️', group: 'system',   label: 'Track added' },
    'Edit Track':         { icon: '✏️', group: 'system',   label: 'Track edited' },
    'Edit Roadmap':       { icon: '🗺️', group: 'system',   label: 'Roadmap updated' },
    'Add Roadmap':        { icon: '🗺️', group: 'system',   label: 'Roadmap created' },
    'Edit Vision':        { icon: '🌟', group: 'system',   label: 'Vision updated' },
    'Edit Subtrack':      { icon: '✏️', group: 'system',   label: 'Subtrack edited' },
    'Add Subtrack':       { icon: '➕', group: 'system',   label: 'Subtrack added' }
}

const ACTIVITY_GROUP_COLORS = {
    item:      { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
    sprint:    { bg: '#eef2ff', border: '#c7d2fe', text: '#4338ca' },
    release:   { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
    strategic: { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
    system:    { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' }
}

function getActivityConfig(action) {
    if (ACTIVITY_ACTION_CONFIG[action]) return ACTIVITY_ACTION_CONFIG[action]
    // Fuzzy match for groom variants
    const groomMatch = Object.keys(ACTIVITY_ACTION_CONFIG).find(k => action.startsWith(k))
    if (groomMatch) return ACTIVITY_ACTION_CONFIG[groomMatch]
    return { icon: '📝', group: 'system', label: action }
}

function formatActivityTimestamp(isoString) {
    if (!isoString) return ''
    const ts = new Date(isoString)
    const now = new Date()
    const diffMs = now - ts
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr  = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)
    if (diffMin < 2)  return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr  < 24) return `${diffHr}h ago`
    if (diffDay === 1) return 'yesterday'
    if (diffDay < 7)  return `${diffDay}d ago`
    return ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function getActivityDayLabel(isoString) {
    if (!isoString) return 'Unknown'
    const ts = new Date(isoString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tsDay = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate())
    const diffDay = Math.floor((today - tsDay) / 86400000)
    if (diffDay === 0) return 'Today'
    if (diffDay === 1) return 'Yesterday'
    if (diffDay < 7)  return ts.toLocaleDateString('en-IN', { weekday: 'long' })
    return ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildActivityLinkOut(action, target) {
    const meta = UPDATE_DATA.metadata || {}
    // Sprint match
    const sprint = (meta.sprints || []).find(s => s.name === target || s.id === target)
    if (sprint) return `<button onclick="switchView('sprint')" class="activity-link-out">→ Sprint</button>`
    // Release match
    const release = (meta.releases || []).find(r => r.name === target || r.id === target)
    if (release) return `<button onclick="switchView('releases')" class="activity-link-out">→ Release</button>`
    // Epic match
    const epic = (meta.epics || []).find(e => e.name === target || e.id === target)
    if (epic) return `<button onclick="switchView('epics')" class="activity-link-out">→ Epic</button>`
    // OKR match (objective text is usually the target)
    const okr = (meta.okrs || []).find(o => o.objective === target || o.id === target)
    if (okr) return `<button onclick="switchView('okr')" class="activity-link-out">→ OKR</button>`
    // Item match — scan tracks
    let foundItem = null
    ;(UPDATE_DATA.tracks || []).forEach(track => {
        track.subtracks.forEach(sub => {
            sub.items.forEach(item => {
                if (item.text === target) foundItem = item
            })
        })
    })
    if (foundItem) return `<button onclick="switchView('kanban')" class="activity-link-out">→ Kanban</button>`
    return ''
}

// Exec-visible action groups
const EXEC_VISIBLE_GROUPS = new Set(['release', 'strategic'])
// Dev-visible action groups
const DEV_VISIBLE_GROUPS = new Set(['item', 'sprint'])

function renderActivityView() {
    const container = document.getElementById('activity-view')
    if (!container) return

    const mode = getCurrentMode()
    const activity = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.activity) || []

    // Persona filter
    const filtered = activity.filter(entry => {
        const cfg = getActivityConfig(entry.action)
        if (mode === 'exec') return EXEC_VISIBLE_GROUPS.has(cfg.group)
        if (mode === 'dev')  return DEV_VISIBLE_GROUPS.has(cfg.group)
        return true // PM sees all
    })

    // Type filter (stored in sessionStorage)
    const typeFilter = sessionStorage.getItem('activity_type_filter') || 'all'
    const visibleEntries = typeFilter === 'all'
        ? filtered
        : filtered.filter(e => getActivityConfig(e.action).group === typeFilter)

    // Summary counts for ribbon filter chips
    const groupCounts = {}
    filtered.forEach(e => {
        const g = getActivityConfig(e.action).group
        groupCounts[g] = (groupCounts[g] || 0) + 1
    })

    const filterGroups = [
        { key: 'all',      label: 'All',      count: filtered.length },
        { key: 'item',     label: 'Items',    count: groupCounts.item || 0 },
        { key: 'sprint',   label: 'Sprints',  count: groupCounts.sprint || 0 },
        { key: 'release',  label: 'Releases', count: groupCounts.release || 0 },
        { key: 'strategic',label: 'Strategic',count: groupCounts.strategic || 0 },
        { key: 'system',   label: 'System',   count: groupCounts.system || 0 }
    ].filter(g => g.key === 'all' || g.count > 0)

    const filterChips = filterGroups.map(g => `
        <button onclick="setActivityFilter('${g.key}')"
            class="activity-filter-chip ${typeFilter === g.key ? 'active' : ''}">
            ${g.label}${g.count > 0 && g.key !== 'all' ? ` <span class="activity-filter-count">${g.count}</span>` : ''}
        </button>
    `).join('')

    const ribbonHtml = `
        <div style="position:relative;margin-bottom:24px;">
            <div id="activity-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">📋</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-medium text-slate-400">Stage 5 · Ship — Audit trail of all CMS operations</span>
                        <h2 class="text-sm font-black text-slate-800">Activity Feed</h2>
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-wrap px-2">
                    ${filterChips}
                </div>
            </div>
        </div>
    `

    if (filtered.length === 0) {
        container.innerHTML = ribbonHtml + `
            <div class="text-center py-20 text-slate-400">
                <div class="text-4xl mb-4">📋</div>
                <div class="font-bold text-slate-500 mb-1">No activity yet</div>
                <div class="text-sm">Activity is recorded when items are created, edited, or moved through CMS.</div>
            </div>`
        return
    }

    // Group visible entries by day
    const byDay = {}
    visibleEntries.forEach(entry => {
        const day = getActivityDayLabel(entry.timestamp)
        if (!byDay[day]) byDay[day] = []
        byDay[day].push(entry)
    })

    let feedHtml = ''
    Object.entries(byDay).forEach(([day, entries]) => {
        feedHtml += `<div class="activity-day-header">${day}</div>`
        entries.forEach(entry => {
            const cfg = getActivityConfig(entry.action)
            const colors = ACTIVITY_GROUP_COLORS[cfg.group] || ACTIVITY_GROUP_COLORS.system
            const linkOut = buildActivityLinkOut(entry.action, entry.target)
            const relTime = formatActivityTimestamp(entry.timestamp)
            const fullTime = entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''
            feedHtml += `
                <div class="activity-entry" style="border-left-color:${colors.border}">
                    <div class="activity-entry-icon" style="background:${colors.bg};color:${colors.text};border-color:${colors.border}">
                        ${cfg.icon}
                    </div>
                    <div class="activity-entry-body">
                        <div class="activity-entry-label">${cfg.label}</div>
                        <div class="activity-entry-target" title="${(entry.target || '').replace(/"/g, '&quot;')}">
                            ${entry.target || '—'}
                        </div>
                    </div>
                    <div class="activity-entry-meta">
                        <span class="activity-group-pill" style="background:${colors.bg};color:${colors.text};border-color:${colors.border}">
                            ${cfg.group}
                        </span>
                        <span class="activity-rel-time" title="${fullTime}">${relTime}</span>
                        ${linkOut}
                    </div>
                </div>
            `
        })
    })

    if (visibleEntries.length === 0) {
        feedHtml = `<div class="text-center py-12 text-slate-400 italic text-sm">No entries match the selected filter.</div>`
    }

    container.innerHTML = ribbonHtml + `<div class="activity-feed-wrap">${feedHtml}</div>`
}
window.renderActivityView = renderActivityView

function setActivityFilter(group) {
    sessionStorage.setItem('activity_type_filter', group)
    renderActivityView()
}
window.setActivityFilter = setActivityFilter

console.log('✅ views.js fully loaded including Discovery');
