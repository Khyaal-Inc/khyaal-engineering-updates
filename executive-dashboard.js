// ========================================
// EXECUTIVE DASHBOARD
// ========================================
// High-level summary for executives - health, OKRs, risks

function renderExecutiveDashboard() {
    const container = document.getElementById('dashboard-view');
    if (!container) {
        const mainContent = document.querySelector('#main-content');
        if (mainContent) {
            const newView = document.createElement('div');
            newView.id = 'dashboard-view';
            newView.className = 'view-section';
            mainContent.appendChild(newView);
        } else return;
    }

    container.innerHTML = `
        <div class="space-y-6">
            <!-- Unified Pulse Ribbon -->
            <div id="dashboard-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <!-- Group 1: Navigation/Breadcrumb -->
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">📊</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-medium text-slate-400">Review / Executive Pulse</span>
                        <h2 class="text-sm font-bold text-slate-800">Executive Health Dashboard</h2>
                    </div>
                    ${typeof renderInfoButton === 'function' ? renderInfoButton('dashboard') : ''}
                </div>

                <!-- Group 2: Actions -->
                <div class="flex items-center gap-2">
                    <div id="dashboard-next-action-mount">
                        ${(typeof renderPrimaryStageAction === 'function') ? renderPrimaryStageAction('dashboard') : ''}
                    </div>
                </div>
            </div>
            ${typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('dashboard') : ''}

            <!-- Executive Summary -->
            ${renderExecutiveSummary()}

            <!-- OKR Progress -->
            ${renderOKRSummary()}

            <!-- Epic Health -->
            ${renderEpicHealth()}

            <!-- Top Risks & Blockers -->
            ${renderTopRisks()}

            <!-- Sprint Velocity Trend -->
            ${renderVelocitySummary()}
        </div>
    `;
}

function renderExecutiveSummary() {
    // Calculate key metrics
    let totalItems = 0, doneItems = 0, activeItems = 0, blockedItems = 0;

    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                totalItems++;
                if (item.status === 'done') doneItems++;
                if (item.status === 'now') activeItems++;
                if (item.blocker) blockedItems++;
            });
        });
    });

    const completionRate = Math.round((doneItems / totalItems) * 100);
    const epics = UPDATE_DATA.metadata?.epics || [];
    const okrs = UPDATE_DATA.metadata?.okrs || [];
    const avgOKRProgress = okrs.length > 0
        ? Math.round(okrs.reduce((sum, okr) => sum + (okr.overallProgress || 0), 0) / okrs.length)
        : 0;

    return `
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-2xl text-white shadow-2xl">
            <h1 class="text-3xl font-bold mb-6">Executive Dashboard</h1>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div class="text-xs font-bold text-purple-100 uppercase tracking-wider mb-1">OKR Progress</div>
                    <div class="text-4xl font-black">${avgOKRProgress}%</div>
                    <div class="text-xs text-purple-100 mt-1">${okrs.length} active objectives</div>
                </div>

                <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div class="text-xs font-bold text-purple-100 uppercase tracking-wider mb-1">Epic Health</div>
                    <div class="text-4xl font-black">${epics.filter(e => e.health === 'on-track').length}/${epics.length}</div>
                    <div class="text-xs text-purple-100 mt-1">on track</div>
                </div>

                <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div class="text-xs font-bold text-purple-100 uppercase tracking-wider mb-1">Completion Rate</div>
                    <div class="text-4xl font-black">${completionRate}%</div>
                    <div class="text-xs text-purple-100 mt-1">${doneItems}/${totalItems} items</div>
                </div>

                <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div class="text-xs font-bold text-purple-100 uppercase tracking-wider mb-1">Critical Blockers</div>
                    <div class="text-4xl font-black ${blockedItems > 0 ? 'text-red-300' : ''}">${blockedItems}</div>
                    <div class="text-xs text-purple-100 mt-1">require attention</div>
                </div>
            </div>
        </div>
    `;
}

function renderOKRSummary() {
    const okrs = UPDATE_DATA.metadata?.okrs || [];

    if (okrs.length === 0) return '';

    return `
        <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl relative overflow-hidden">
            <div class="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <span class="text-8xl font-black italic tracking-tighter">OKR</span>
            </div>
            
            <div class="flex justify-between items-end mb-8 relative z-10">
                <div>
                    <h2 class="text-3xl font-bold text-slate-900 tracking-tight">Strategic Progress</h2>
                    <p class="text-slate-500 font-medium text-sm mt-1">Outcome-based achievement per quarter</p>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-medium text-slate-400 block mb-1">Portfolio Health</span>
                    <span class="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-100">On Track</span>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${okrs.map(okr => {
                    const progress = okr.overallProgress || 0;
                    const krCount = okr.keyResults?.length || 0;
                    const achievedKR = (okr.keyResults || []).filter(kr => kr.progress >= 100).length;
                    
                    const color = progress >= 90 ? 'bg-emerald-500' : progress >= 70 ? 'bg-blue-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500';
                    const textColor = progress >= 90 ? 'text-emerald-600' : progress >= 70 ? 'text-blue-600' : 'text-slate-900';
                    const healthSignal = progress >= 70 ? '🟢 On Track' : progress >= 40 ? '🟡 At Risk' : '🔴 Behind';

                    return `
                        <div class="group p-5 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border border-slate-100 transition-all duration-500 hover:shadow-lg hover:-translate-y-1">
                            <div class="flex justify-between items-start mb-4">
                                <span class="bg-white p-2 rounded-xl shadow-sm text-lg">${progress >= 90 ? '🏆' : progress >= 70 ? '📈' : '⚡'}</span>
                                <div class="text-right">
                                    <div class="text-2xl font-black ${textColor}">${progress}%</div>
                                    <div class="text-[10px] font-medium text-slate-400">${okr.quarter}</div>
                                </div>
                            </div>

                            <h3 class="font-semibold text-slate-800 text-sm leading-tight mb-4 min-h-[40px] line-clamp-2">${okr.objective}</h3>

                            <div class="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-2">
                                <span>KR Milestone Success</span>
                                <span class="text-slate-800 font-semibold">${achievedKR} / ${krCount}</span>
                            </div>

                            <div class="w-full bg-slate-200 rounded-full h-2 mb-4 overflow-hidden">
                                <div class="${color} h-2 rounded-full transition-all duration-1000 group-hover:opacity-80" style="width: ${progress}%"></div>
                            </div>
                            
                            <div class="pt-3 border-t border-slate-200/50 flex justify-between items-center">
                                <div>
                                    <span class="text-[10px] text-slate-400 font-medium block">Owner: ${okr.owner || '—'}</span>
                                    <span class="text-[10px] font-medium mt-0.5 block">${healthSignal}</span>
                                </div>
                                <button onclick="switchView('okr')" class="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 px-2 py-1 rounded transition-all">Strategy Hub 🎯</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderEpicHealth() {
    const epics = UPDATE_DATA.metadata?.epics || [];

    return `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">Epic Health Overview</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${epics.map(epic => {
                    const healthIcon = epic.health === 'on-track' ? '🟢' : epic.health === 'at-risk' ? '🟡' : '🔴';
                    const healthColor = epic.health === 'on-track' ? 'border-green-500' : epic.health === 'at-risk' ? 'border-amber-500' : 'border-red-500';

                    return `
                        <div class="p-4 rounded-lg border-l-4 ${healthColor} bg-slate-50">
                            <div class="flex items-start justify-between mb-2">
                                <span class="text-2xl">${healthIcon}</span>
                                <span class="text-xs font-bold text-slate-500 uppercase">${epic.track}</span>
                            </div>
                            <h3 class="font-bold text-slate-900 mb-2">${epic.name}</h3>
                            <p class="text-xs text-slate-600 mb-2">${epic.objective}</p>
                            <div class="text-xs text-slate-500">
                                <div><strong>Timeline:</strong> ${epic.timeline}</div>
                                <div><strong>Status:</strong> ${epic.status}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderTopRisks() {
    const blockedItems = [];
    const atRiskOkrs = [];

    // Collect all blocked items with full context
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.blocker || item.status === 'blocked') {
                    blockedItems.push({
                        id: item.id,
                        text: item.text,
                        track: track.name,
                        subtrack: subtrack.name,
                        contributors: item.contributors || [],
                        blockerNote: item.blockerNote || 'No details provided',
                        priority: item.priority,
                        due: item.due,
                        epicId: item.epicId
                    });
                }
            });
        });
    });

    // At-risk OKRs (< 50% progress)
    const okrs = UPDATE_DATA.metadata?.okrs || [];
    okrs.forEach(okr => {
        if ((okr.overallProgress || 0) < 50) {
            atRiskOkrs.push(okr);
        }
    });

    const totalRisks = blockedItems.length + atRiskOkrs.length;

    if (totalRisks === 0) {
        return `
            <div class="bg-green-50 p-6 rounded-xl border border-green-200 flex items-center gap-4">
                <span class="text-4xl">✅</span>
                <div>
                    <h2 class="text-xl font-bold text-green-900">No Critical Risks</h2>
                    <p class="text-green-700 text-sm mt-1">All items are progressing normally. No blockers or at-risk goals detected.</p>
                </div>
            </div>
        `;
    }

    const epics = UPDATE_DATA.metadata?.epics || [];

    return `
        <div class="bg-white rounded-2xl border-2 border-red-200 shadow-lg overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 bg-red-50 border-b border-red-100">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">🚨</span>
                    <div>
                        <h2 class="text-lg font-black text-red-900">Blockers & At-Risk Items</h2>
                        <p class="text-xs text-red-600 font-bold">${totalRisks} item${totalRisks > 1 ? 's' : ''} need${totalRisks === 1 ? 's' : ''} attention</p>
                    </div>
                </div>
                <button onclick="switchMode('pm'); switchView('kanban');" class="exec-drill-btn">
                    View Full Board →
                </button>
            </div>

            ${blockedItems.length > 0 ? `
            <div class="p-4 space-y-3">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">🔴 Blocked Items (${blockedItems.length})</div>
                ${blockedItems.slice(0, 6).map(b => {
                    const epic = b.epicId ? epics.find(e => e.id === b.epicId) : null;
                    const priorityColor = b.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' : b.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200';
                    return `
                        <div class="exec-blocker-row">
                            <div class="exec-blocker-main">
                                <div class="exec-blocker-title">${b.text}</div>
                                <div class="exec-blocker-meta">
                                    <span class="exec-blocker-track">🏗️ ${b.track}</span>
                                    ${b.contributors.length ? `<span>· 👤 ${b.contributors.join(', ')}</span>` : ''}
                                    ${b.due ? `<span>· 📅 Due ${b.due}</span>` : ''}
                                    ${epic ? `<span>· 📍 ${epic.name}</span>` : ''}
                                </div>
                                <div class="exec-blocker-note">⚠️ ${b.blockerNote}</div>
                            </div>
                            <span class="exec-blocker-badge ${priorityColor}">${b.priority || 'medium'}</span>
                        </div>
                    `;
                }).join('')}
                ${blockedItems.length > 6 ? `<div class="text-xs text-slate-400 font-bold px-2">+ ${blockedItems.length - 6} more blocked items — <button onclick="switchMode('pm'); switchView('kanban');" class="underline text-indigo-600">view all</button></div>` : ''}
            </div>
            ` : ''}

            ${atRiskOkrs.length > 0 ? `
            <div class="p-4 pt-0 space-y-3 border-t border-slate-100">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 pt-3">🟡 At-Risk Goals (${atRiskOkrs.length})</div>
                ${atRiskOkrs.map(okr => `
                    <div class="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <span class="text-xl">⚡</span>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-bold text-slate-800 truncate">${okr.objective}</div>
                            <div class="text-xs text-amber-700 mt-0.5">Only ${okr.overallProgress || 0}% complete — needs to accelerate</div>
                        </div>
                        <button onclick="switchView('okr')" class="exec-drill-btn-sm">Review</button>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    `;
}

function renderVelocitySummary() {
    const velocityData = UPDATE_DATA.metadata?.velocityHistory || [];
    const completed = velocityData.filter(v => v.completed !== null);

    if (completed.length === 0) return '';

    const avgVelocity = Math.round(completed.reduce((sum, v) => sum + v.velocity, 0) / completed.length);
    const trend = completed.length >= 2
        ? completed[completed.length - 1].velocity > completed[completed.length - 2].velocity ? '📈' : '📉'
        : '➡️';

    return `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-slate-900">Team Velocity Trend</h2>
                <div class="text-right">
                    <div class="text-3xl">${trend}</div>
                    <div class="text-sm text-slate-600">Avg: ${avgVelocity}%</div>
                </div>
            </div>
            <div class="space-y-2">
                ${completed.slice(-3).map(sprint => `
                    <div class="flex justify-between items-center p-3 bg-slate-50 rounded">
                        <span class="font-semibold text-slate-900">${sprint.sprintId}</span>
                        <div class="flex items-center gap-3">
                            <span class="text-sm text-slate-600">${sprint.completed}/${sprint.planned} pts</span>
                            <span class="text-lg font-bold ${sprint.velocity >= 90 ? 'text-green-600' : 'text-amber-600'}">
                                ${sprint.velocity}%
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Export
window.renderExecutiveDashboard = renderExecutiveDashboard;
