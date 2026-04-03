console.log('📜 views.js loading...');

// --- Workflow View State & Initialization (Hoisted for Stability) ---
let currentWorkflowTab = 'pm';

function setWorkflowTab(tab) {
    currentWorkflowTab = tab;
    if (document.getElementById('workflow-view')?.classList.contains('active')) {
        renderWorkflowView();
    }
}

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

function renderCommentThread(comments, ti, si, ii) {
    if (!comments || comments.length === 0) return '<div class="text-slate-400 text-xs italic p-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">No discussion notes yet.</div>';

    return comments.map(c => {
        const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Legacy';
        return `
            <div class="comment-item bg-white p-3 rounded-lg border border-slate-100 shadow-sm mb-2 last:mb-0">
                <div class="flex items-center gap-2 mb-1.5">
                    <span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">${(c.author || 'P').charAt(0)}</span>
                    <span class="text-[11px] font-black text-slate-800 uppercase tracking-wider">${c.author || 'PM'}</span>
                    <span class="text-[10px] text-slate-400 font-medium">${dateStr}</span>
                    ${shouldShowManagement() ? `<button onclick="event.stopPropagation(); deleteComment(${ti},${si},${ii},'${c.id}')" class="ml-auto text-slate-300 hover:text-red-500 transition-colors">
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

    container.innerHTML = ribbonHtml + `<div id="workflow-content"></div>`;
    // ... rest of rendering logic
}

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
            const statusOrder = { "done": 1, "ongoing": 2, "now": 3, "next": 4, "later": 5 };

            let items = itemsInTag.filter(item => isItemInDateRange(item) && isItemInSearch(item));
            const sortedItems = [...items].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

            if (sortedItems.length === 0) {
                html += `<div class="empty-subtrack">No items match current filters.</div>`;
            } else {
                sortedItems.forEach((item) => {
                    const originalIndex = subtrack.items.indexOf(item);
                    html += renderItem(item, subtrack.note, trackIndex, subtrackIndex, originalIndex);
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

function renderItem(item, subtrackNote, trackIndex, subtrackIndex, itemIndex, isGrooming = false) {
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
    const effectiveNote = item.note || subtrackNote;

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
            <div class="flex items-center gap-3 mt-1.5 flex-wrap">
                <span onclick="event.stopPropagation(); openItemEdit(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer font-bold underline underline-offset-2">Edit</span>
                <span onclick="event.stopPropagation(); deleteItem(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="text-[11px] text-red-600 hover:text-red-800 cursor-pointer font-bold underline underline-offset-2">Delete</span>
                <button onclick="event.stopPropagation(); sendToBacklog(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="send-to-backlog-btn">→ Backlog</button>
                <button onclick="event.stopPropagation(); toggleBlocker(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="send-to-backlog-btn ${item.blocker ? 'text-red-600 border-red-200 bg-red-50' : ''}">${item.blocker ? '&#128275; Unblock' : '&#128274; Flag Blocker'}</button>
            </div>
        `;
    }

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
                        </div>
                        <div class="text-sm text-slate-800 font-semibold leading-tight flex-1">
                            <div class="info-wrapper mb-1">
                                <span class="info-text flex items-center">${displayText}${due}${storyPointsHTML}</span>
                                <button class="info-btn" aria-label="More information">i</button>
                                ${tooltipHTML}
                            </div>
                            <div class="flex flex-wrap items-center gap-2 mb-1">
                                ${strategicContext}
                                ${item.sprintId ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">🏃 ${(UPDATE_DATA.metadata.sprints || []).find(s => s.id === item.sprintId)?.name || item.sprintId}</span>` : ''}
                                ${item.releasedIn ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">📦 ${(UPDATE_DATA.metadata.releases || []).find(r => r.id === item.releasedIn)?.name || item.releasedIn}</span>` : ''}
                                ${mode !== 'exec' && tags ? `<div class="flex flex-wrap gap-1">${tags}</div>` : ''}
                            </div>
                            <div class="mb-2">${usecase}</div>
                            ${effortImpactHTML}
                            ${acHTML}
                            <div class="flex flex-wrap items-center gap-2 mt-2">
                                <button id="comment-btn-${trackIndex}-${subtrackIndex}-${itemIndex}" onclick="event.stopPropagation(); toggleComments(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors">💬 ${(item.comments || []).length} Comments</button>
                                ${cmsControls ? `<div>${cmsControls}</div>` : ''}
                            </div>

                            ${isGrooming ? `
                                <div class="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4" onclick="event.stopPropagation()">
                                    <div>
                                        <label class="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 tracking-wider">Priority</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'priority', this.value)" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
                                            <option value="medium" ${item.priority === 'medium' || !item.priority ? 'selected' : ''}>Medium</option>
                                            <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 tracking-wider">Epic</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'epicId', this.value)" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">No Epic</option>
                                            ${(UPDATE_DATA.metadata.epics || []).map(e => `<option value="${e.id}" ${item.epicId === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 tracking-wider">🏃 Sprint</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'sprintId', this.value)" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">No Sprint</option>
                                            ${(UPDATE_DATA.metadata.sprints || []).map(s => `<option value="${s.id}" ${item.sprintId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 tracking-wider">📦 Release</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'releasedIn', this.value)" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
                                            <option value="">No Release</option>
                                            ${(UPDATE_DATA.metadata.releases || []).find(r => r.id === item.releasedIn)?.name || item.releasedIn}
                                            ${(UPDATE_DATA.metadata.releases || []).map(r => `<option value="${r.id}" ${item.releasedIn === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 tracking-wider">🎯 Horizon</label>
                                        <select onchange="updateItemGrooming(${trackIndex}, ${subtrackIndex}, ${itemIndex}, 'planningHorizon', this.value)" class="w-full text-xs p-2 rounded-xl border border-indigo-100 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all">
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
                            <div id="comments-${trackIndex}-${subtrackIndex}-${itemIndex}" class="hidden w-full mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg" onclick="event.stopPropagation()">
                                <div id="thread-${trackIndex}-${subtrackIndex}-${itemIndex}" class="space-y-3 mb-3 max-h-48 overflow-y-auto pr-2">
                                    ${renderCommentThread(item.comments, trackIndex, subtrackIndex, itemIndex)}
                                </div>
                                ${shouldShowManagement() ? `
                                    <div class="flex gap-2 relative">
                                        <input type="text" id="comment-input-${trackIndex}-${subtrackIndex}-${itemIndex}" placeholder="Type @ to tag contributors..." class="cms-input flex-1 !mb-0 text-xs" onkeyup="if(event.key==='Enter') addComment(${trackIndex},${subtrackIndex},${itemIndex})">
                                        <button onclick="addComment(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="cms-btn cms-btn-primary !px-3 !py-1 flex-shrink-0 text-xs shadow-sm">Post</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
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
    const statuses = ['done', 'now', 'ongoing', 'next', 'later'];
    const statusTitles = { done: 'Done', now: 'Now', ongoing: 'On-Going', next: 'Next', later: 'Later' };

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
                html += `
                    <div class="item-row hover:bg-slate-50 transition-colors">
                        <div class="flex-1">
                            <span style="color: ${trackColor}; background: ${trackColor}10;" class="px-2 py-0.5 rounded-md font-bold text-[0.65rem] uppercase tracking-wider inline-block mb-1.5 border border-slate-200">
                                ${item.track} &rarr; ${item.subtrack}
                            </span>
                            ${renderItem(item, '', item.trackIndex, item.subtrackIndex, item.itemIndex)}
                        </div>
                    </div>`;
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

    let html = '';
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
                html += `
                    <div class="item-row hover:bg-slate-50 transition-colors">
                        <span style="color: ${trackColor}; background: ${trackColor}10;" class="px-2 py-0.5 rounded-md font-bold text-[0.65rem] uppercase tracking-wider inline-block mb-1.5 border border-slate-200">
                            ${item.track} &rarr; ${item.subtrack}
                        </span>
                        ${renderItem(item, '', item.trackIndex, item.subtrackIndex, item.itemIndex)}
                    </div>`;
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
    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';

    if (sortedNames.length === 0) {
        container.innerHTML = '<div class="text-center py-20 text-slate-400">No contributors found for current filters.</div>';
        return;
    }

    sortedNames.forEach(name => {
        const items = contributors[name];
        const statusOrder = ['done', 'now', 'ongoing', 'next', 'later'];
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
                            <div oncontextmenu="window.currentContextItem={ti:${item.trackIndex},si:${item.subtrackIndex},ii:${item.itemIndex}}; return false;" class="group relative flex items-center gap-2 p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white transition-all cursor-pointer" onclick="${shouldShowManagement() ? `openItemEdit(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})` : ''}">
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
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Definition / Tactical Backlog</span>
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
        backlogSub.items.forEach((item, ii) => {
            html += renderItem(item, '', trackIndex, si, ii, groomingMode);
        });
        html += `</div></div>`;
    });
    container.innerHTML = totalItems ? html : '<div class="text-center py-20 text-slate-400">Backlog is empty</div>';
}

// ------ Epics View ------
function renderEpicsView() {
    const container = document.getElementById('epics-view');
    if (!container) return;

    const data = window.UPDATE_DATA || {};
    const epics = (data.metadata && data.metadata.epics) || [];

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
            <div class="flex flex-wrap gap-2 ml-4">
                <button onclick="openEpicEdit(${idx})" class="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">Edit</button>
                <button onclick="deleteEpic(${idx})" class="text-rose-600 hover:text-rose-800 text-[10px] font-black uppercase tracking-widest bg-rose-50 px-2 py-1 rounded">Delete</button>
                <button onclick="groomEpicTasks('${e.id}')" class="text-sky-600 hover:text-sky-800 text-[10px] font-black uppercase tracking-widest bg-sky-50 px-2 py-1 rounded">Groom Tasks 📚</button>
                <button onclick="addItem(0, 0, { epicId: '${e.id}' })" class="text-emerald-600 hover:text-emerald-800 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">➕ Task</button>
            </div>
        ` : '';

        html += `
            <div class="sprint-card bg-white border-2 border-slate-900 rounded-xl overflow-hidden mb-8 shadow-xl">
                <div class="p-6 bg-slate-50 border-b-2 border-slate-900">
                    <div class="flex justify-between items-stretch gap-6">
                        <div class="flex-1">
                            <div class="flex items-center mb-2">
                                <span class="bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest mr-3">Strategic Epic</span>
                                <div class="font-black text-2xl text-slate-900">${e.name}</div>
                                ${cmsActions}
                            </div>
                            <div class="text-sm font-bold text-slate-500 mt-3 leading-relaxed max-w-2xl">
                                <span class="text-slate-900 font-extrabold uppercase text-[10px] tracking-widest block mb-1">Business Value & Goal</span>
                                ${e.description || e.objective || 'No description provided.'}
                            </div>
                        </div>
                        
                        <!-- Epic Metadata Tray -->
                        <div class="flex-shrink-0 flex flex-col items-end justify-between min-w-[150px] py-1 border-l border-slate-200 pl-6">
                            <div class="flex flex-col items-end gap-2">
                                ${epicOKR ? `<div class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-200 whitespace-nowrap">🎯 OKR: ${epicOKR.id}</div>` : ''}
                                ${epicHorizon ? `<div class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200 whitespace-nowrap">🗺️ ${epicHorizon.label.split('(')[0]}</div>` : ''}
                            </div>
                            
                            <div class="flex flex-col items-end gap-3 mt-auto w-full">
                                <div class="flex justify-between items-center w-full text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    <span>${progress}% Done</span>
                                    <span class="px-2 py-0.5 bg-${e.health === 'on-track' ? 'green' : (e.health === 'caution' || e.health === 'at-risk' ? 'amber' : 'rose')}-100 text-${e.health === 'on-track' ? 'green' : (e.health === 'caution' || e.health === 'at-risk' ? 'amber' : 'rose')}-700 rounded border border-current">
                                        ${e.health === 'on-track' ? 'ON-TRACK' : (e.health === 'at-risk' ? 'AT-RISK' : 'DELAYED')}
                                    </span>
                                </div>
                                <div class="h-3 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300 shadow-inner">
                                    <div class="h-full bg-indigo-600 transition-all duration-500" style="width: ${progress}%"></div>
                                </div>
                                <div class="text-[9px] font-bold text-slate-400">${doneCount}/${epicItems.length} Tasks Complete</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="p-2 space-y-4">
                    ${renderGroupedItems(epicItems)}
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

    let html = ribbonHtml + `<div class="grid grid-cols-1 gap-12">`;

    horizons.forEach(h => {
        const horizonItems = findItemsByMetadataId('planningHorizon', h.id);
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
                        <div class="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full shadow-sm animate-fade-in">
                            <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Alignment:</span>
                            <span class="text-xs font-bold text-indigo-700">🎯 ${horizonOKR.objective}</span>
                        </div>
                    ` : `
                        <div class="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No specific strategic objective linked</div>
                    `}
                </div>

                <div class="grid grid-cols-1 gap-6">
                    ${horizonItems.length > 0 ? renderGroupedItems(horizonItems) : '<div class="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 italic text-sm">No strategic initiatives mapped to this horizon.</div>'}
                </div>
            </div>`;
    });

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
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Definition / Sprint Planning</span>
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

    let html = ribbonHtml;

    if (sprints.length === 0) {
        container.innerHTML = html + '<div class="text-center py-20 text-slate-400">No sprints defined</div>';
        return;
    }

    sprints.forEach((s, idx) => {
        const sprintItems = findItemsByMetadataId('sprintId', s.id);
        const cmsActions = shouldShowManagement() ? `
            <div class="flex gap-2 ml-4">
                <button onclick="openSprintEdit('${s.id}')" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-tighter">Edit</button>
                <button onclick="deleteSprint('${s.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold uppercase tracking-tighter">Delete</button>
                <button onclick="addItem(0, 0, { sprintId: '${s.id}' })" class="text-emerald-600 hover:text-emerald-800 text-xs font-bold uppercase tracking-tighter">➕ Task</button>
            </div>
        ` : '';

        const sprintOKR = UPDATE_DATA.metadata.okrs?.find(o => o.id === s.linkedOKR);

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
                            <div class="text-sm font-bold text-slate-500 mt-1">📅 ${s.startDate || 'TBD'} - ${s.endDate || 'TBD'}</div>
                        </div>
                        <div class="text-right">
                             <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</div>
                             <span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold uppercase tracking-wider">${sprintItems.length} Tasks</span>
                        </div>
                    </div>
                    <div class="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-600 italic">
                        <span class="font-bold text-slate-800 not-italic">Goal:</span> ${s.goal || 'No goal set for this sprint.'}
                    </div>
                </div>
                <div class="p-2 space-y-4">
                    ${renderGroupedItems(sprintItems)}
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
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Definition / Release Milestones</span>
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

    let html = ribbonHtml;

    if (releases.length === 0) {
        container.innerHTML = html + '<div class="text-center py-20 text-slate-400">No releases defined</div>';
        return;
    }

    releases.forEach((r, idx) => {
        const releaseItems = findItemsByMetadataId('releasedIn', r.id);
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
                <div class="p-2 space-y-4">
                    ${renderGroupedItems(releaseItems)}
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

function renderGroupedItems(items) {
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
                <div class="border border-t-0 p-1 rounded-b-lg space-y-1">
                    ${group.items.map(item => renderItem(item, '', item.trackIndex, item.subtrackIndex, item.itemIndex)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ------ Gantt View ------
function renderGanttView() {
    google.charts.load('current', { 'packages': ['gantt'] });
    google.charts.setOnLoadCallback(drawGanttChart);
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
    window.openAddItemModal = function(type) {
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
    console.log('🔄 renderWorkflowView() called');
    const container = document.getElementById('workflow-view');
    if (!container) {
        console.error('❌ Engineering Playbook container (#workflow-view) not found.');
        return;
    }

    try {
        console.log('📊 Active Tab:', currentWorkflowTab);

    // Auto-sync tab with active persona if not manually set
    if (typeof currentMode !== 'undefined') {
        if (currentMode === 'dev') currentWorkflowTab = 'dev';
        else if (currentMode === 'pm') currentWorkflowTab = 'pm';
    }

    const pmSteps = [
        {
            title: '1. Discovery & Validation',
            desc: 'The "Idea Funnel." Capturing raw requests and researching future possibilities.',
            why: 'Discovery prevents backlog bloat by validating high-level ideas before they reach the roadmap.',
            how: 'Use the Roadmap "Later" bucket to park future horizons, and the Backlog to capture raw items.',
            meeting: 'Discovery / Ideation Sync',
            cadence: 'Bi-Weekly',
            stakeholders: 'Founders, PMs, Tech Leads',
            action: { label: 'Capture Ideas', view: 'backlog' }
        },
        {
            title: '2. Strategic Vision (OKRs)',
            desc: 'The "Commitment." Aligning validated ideas to business goals and a specific timeframe.',
            why: 'Strategic alignment ensures that every epic on the roadmap has a clear "Why" (Objective).',
            how: 'Commit items from Later to Now/Next in the Roadmap view and link them to OKRs & Epics.',
            meeting: 'Quarterly Strategy Review',
            cadence: 'Quarterly',
            stakeholders: 'Founders, PMs, EM',
            action: { label: 'Commit Strategy', view: 'roadmap' }
        },
        {
            title: '3. Definition & Readiness',
            desc: 'The "Machine." Breaking committed epics into estimated, ready-to-code tasks.',
            why: 'Definition ensures that the engineering team is never blocked by vague requirements.',
            how: 'Use Grooming Mode in the Backlog to set points and link tasks to the current sprint.',
            meeting: 'PBR (Backlog Grooming)',
            cadence: 'Weekly',
            stakeholders: 'PMs, EM, Tech Leads',
            action: { label: 'Groom Tasks', view: 'backlog' }
        },
        {
            title: '4. High-Velocity Delivery',
            desc: 'The "Action." Daily execution monitoring and proactive blocker resolution.',
            why: 'Visibility into daily status prevents "silent failures" and keeps the sprint on track.',
            how: 'Monitor the Kanban and the Global Blocker Strip. Use Tracks for area-specific health.',
            meeting: 'Daily Standup / Bug Scrub',
            cadence: 'Daily',
            stakeholders: 'EM, Developers, PMs',
            action: { label: 'Monitor Action', view: 'track' }
        },
        {
            title: '5. Analytics & Retros',
            desc: 'The "Learning." Reviewing metrics to optimize the process for the next loop.',
            why: 'Retro-driven process updates are the only way to sustainably improve team velocity.',
            how: 'Check the Executive Dashboard and Analytics for actual vs. planned performance.',
            meeting: 'Pulse / Retrospective Sync',
            cadence: 'Weekly',
            stakeholders: 'Founders, PMs, EM',
            action: { label: 'Review Pulse', view: 'dashboard' }
        }
    ];

    const devSteps = [
        {
            title: '1. Discovery & Research',
            desc: 'Technically validate future roadmap items through discovery spikes.',
            why: 'Spikes clear the path so that you never start a sprint task with massive unknowns.',
            how: 'Check the Roadmap for "Next/Later" spikes and use the Backlog to capture initial research results.',
            meeting: 'Discovery Sync / Spikes',
            cadence: 'Bi-Weekly',
            stakeholders: 'EM, Tech Leads, Devs',
            action: { label: 'View Spikes', view: 'backlog' }
        },
        {
            title: '2. Alignment on Strategy',
            desc: 'Uncovering the "Why." Understanding how your track impacts the quarterly OKRs.',
            why: 'Developers who understand the strategic "Why" build more resilient and scalable code.',
            how: 'Review the Epics and Roadmap to see the full strategic context of the current cycle.',
            meeting: 'Strategic Vision Sync',
            cadence: 'Quarterly',
            stakeholders: 'PMs, EM, Developers',
            action: { label: 'View Context', view: 'roadmap' }
        },
        {
            title: '3. Technical Readiness',
            desc: 'The defining phase. Refining tasks, story pointing, and clarifying outcomes.',
            why: 'The Grooming session is the most important meeting for developers to protect their focus.',
            how: 'Update estimations and technical acceptance criteria in the Backlog grooming mode.',
            meeting: 'PBR (Grooming / Readiness)',
            cadence: 'Weekly',
            stakeholders: 'EM, Tech Leads, Devs',
            action: { label: 'Refine Tasks', view: 'backlog' }
        },
        {
            title: '4. High-Velocity Action',
            desc: 'Daily execution, signaling progress, and alerting on blockers immediately.',
            why: 'A healthy pulse requires real-time data. Status signaling stops the need for manual reporting.',
            how: 'Check "My Tasks" daily. Update Kanban status and flag blockers immediately.',
            meeting: 'Daily Standup (DSU)',
            cadence: 'Daily',
            stakeholders: 'EM, Developers',
            action: { label: 'Execute Now', view: 'contributor' }
        },
        {
            title: '5. Analytics & Learnings',
            desc: 'Process optimization. Using metrics to make the next cycle smoother.',
            why: 'Retrospectives ensure that the same friction never happens two cycles in a row.',
            how: 'Review Velocity and Completion charts in Analytics to see if process changes are working.',
            meeting: 'Process Retro / Learning',
            cadence: 'Weekly / Bi-Weekly',
            stakeholders: 'Whole Team (EM, Devs, PM)',
            action: { label: 'Analyze Pulse', view: 'analytics' }
        }
    ];

    const activeSteps = currentWorkflowTab === 'pm' ? pmSteps : devSteps;

    let html = `
        <div class="max-w-4xl mx-auto py-8 mb-24 px-4 sm:px-0">
            <div class="mb-10 text-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <h2 class="text-3xl font-extrabold text-slate-800 tracking-tight">Engineering Playbook</h2>
                <p class="text-slate-500 mt-2 text-lg">A step-by-step guide to managing the engineering pipeline.</p>
                
                <div class="flex justify-center mt-8">
                    <div class="bg-slate-100 p-1.5 rounded-xl inline-flex shadow-inner">
                        <button onclick="setWorkflowTab('pm')" class="${currentWorkflowTab === 'pm' ? 'bg-white text-indigo-700 shadow border border-slate-200/50 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'} px-8 py-3 rounded-lg text-sm transition-all focus:outline-none flex items-center gap-2">👨‍💼 Product Managers</button>
                        <button onclick="setWorkflowTab('dev')" class="${currentWorkflowTab === 'dev' ? 'bg-white text-indigo-700 shadow border border-slate-200/50 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'} px-8 py-3 rounded-lg text-sm transition-all focus:outline-none flex items-center gap-2">👩‍💻 Developers</button>
                    </div>
                </div>
            </div>

            <div class="relative pl-0 md:pl-2">
                <div class="hidden md:block absolute left-10 top-8 bottom-8 w-1 bg-indigo-100/60 rounded-full"></div>
                <div class="space-y-8 relative z-10 w-full overflow-hidden">
    `;

    activeSteps.forEach((step, index) => {
        html += `
            <div class="flex flex-col md:flex-row gap-6 md:gap-8 group">
                <div class="hidden md:flex flex-shrink-0 w-16 h-16 bg-white border-4 border-indigo-50 shadow-sm rounded-2xl items-center justify-center group-hover:border-indigo-200 group-hover:shadow-md transition-all text-2xl font-black text-indigo-400 relative z-10 mt-3 transform group-hover:scale-105 group-hover:text-indigo-600">
                    ${index + 1}
                </div>
                
                <div class="flex-1 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm group-hover:shadow-lg transition-all relative overflow-hidden group-hover:-translate-y-1 duration-300">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-indigo-400 opacity-50 group-hover:bg-indigo-600 group-hover:opacity-100 transition-all"></div>
                    
                    <div class="flex flex-col md:flex-row justify-between items-start mb-8 md:pl-2">
                        <div>
                            <span class="text-[10px] font-bold text-indigo-500 tracking-widest uppercase mb-2 block bg-indigo-50 inline-block px-2 py-1 rounded-md">Step ${index + 1}</span>
                            <h3 class="text-2xl font-bold text-slate-800">${step.title}</h3>
                        </div>
                        <button onclick="switchView('${step.action.view}')" class="mt-4 md:mt-0 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-600 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap w-full md:w-auto">
                            ${step.action.label} 
                            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>
                    
                    <div class="space-y-6 text-sm text-slate-600 md:pl-2">
                        <div class="flex gap-4 items-start pb-4 border-b border-slate-100">
                            <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-lg flex-shrink-0 border border-slate-100">🎯</div>
                            <div class="flex-1 pt-1"><strong class="text-slate-800 block mb-1 font-black">The Goal</strong> ${step.desc}</div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 bg-slate-50/50 rounded-xl px-4 border border-slate-100 shadow-inner">
                            <div class="flex gap-3">
                                <div class="text-indigo-500 font-bold">🕒</div>
                                <div>
                                    <span class="text-[9px] uppercase tracking-tighter text-slate-400 font-bold block">Cadence</span>
                                    <span class="text-slate-700 font-bold">${step.cadence}</span>
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <div class="text-indigo-500 font-bold">🤝</div>
                                <div>
                                    <span class="text-[9px] uppercase tracking-tighter text-slate-400 font-bold block">Stakeholders</span>
                                    <span class="text-slate-700 font-bold">${step.stakeholders}</span>
                                </div>
                            </div>
                            <div class="col-span-1 sm:col-span-2 pt-1 border-t border-slate-200/50 mt-1">
                                <div class="flex gap-3 items-center">
                                    <div class="text-indigo-500 font-bold">📅</div>
                                    <div class="text-xs text-slate-500 font-medium">Sync Meeting: <span class="text-indigo-600 font-bold">${step.meeting}</span></div>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-4 items-start bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                            <div class="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-lg flex-shrink-0 opacity-80 text-amber-500 border border-amber-100">💡</div>
                            <div class="flex-1 pt-1"><strong class="text-amber-900 block mb-1 font-black">Why it matters</strong> <span class="text-amber-800/90 leading-relaxed font-medium">${step.why}</span></div>
                        </div>
                        <div class="flex gap-4 items-start pt-2">
                            <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-lg flex-shrink-0 border border-slate-100">🛠️</div>
                            <div class="flex-1 pt-1"><strong class="text-slate-800 block mb-1 font-black">How to do it</strong> <span class="leading-relaxed">${step.how}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    console.log('✅ renderWorkflowView() successfully rendered ' + activeSteps.length + ' steps');
    } catch (err) {
        console.error('❌ renderWorkflowView() failed to render playbook:', err);
        container.innerHTML = `
            <div class="p-12 text-center bg-white rounded-[2rem] border border-red-200 shadow-xl max-w-2xl mx-auto my-12">
                <div class="text-6xl mb-6">🏜️</div>
                <h3 class="text-2xl font-black text-slate-800 tracking-tight">Playbook Rendering Error</h3>
                <p class="text-slate-500 mt-3 font-medium leading-relaxed">
                    The Engineering Playbook experienced a data-linkage failure. This usually happens if a step definition is missing required metadata.
                </p>
                <div class="mt-8 p-6 bg-slate-50 rounded-2xl text-left font-mono text-sm text-red-600 border border-slate-200 overflow-auto max-h-48 shadow-inner">
                    <div class="font-bold border-b border-red-100 pb-2 mb-2">Error Log:</div>
                    ${err.stack || err.message}
                </div>
                <div class="flex gap-4 justify-center mt-10">
                    <button onclick="renderWorkflowView()" class="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5">
                        Try Again
                    </button>
                    <button onclick="switchView('okr')" class="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">
                        Exit to OKRs
                    </button>
                </div>
            </div>
        `;
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
        'track': { text: 'Review Pulse 📊', target: 'dashboard' },
        'kanban': { text: 'Review Pulse 📊', target: 'dashboard' },
        'my-tasks': { text: 'Review Pulse 📊', target: 'dashboard' },
        'dashboard': { text: 'Discover Ideas 🔍', target: 'roadmap' },
        'analytics': { text: 'Discover Ideas 🔍', target: 'roadmap' },
        'capacity': { text: 'Scope Sprints 🏃', target: 'sprint' },
        'status': { text: 'Review Pulse 📊', target: 'dashboard' },
        'workflow': { text: 'Discover Ideas 🔍', target: 'roadmap' },
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
