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
                if (item.status === 'now' || item.status === 'ongoing') activeItems++;
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
            <h1 class="text-3xl font-black mb-6">Executive Dashboard</h1>

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
        <div class="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">OKR Progress Summary</h2>
            <div class="space-y-3">
                ${okrs.map(okr => {
                    const progress = okr.overallProgress || 0;
                    const color = progress >= 90 ? 'bg-green-500' : progress >= 70 ? 'bg-blue-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500';

                    return `
                        <div class="p-4 bg-slate-50 rounded-lg">
                            <div class="flex justify-between items-center mb-2">
                                <div class="flex-1">
                                    <div class="font-bold text-slate-900">${okr.objective}</div>
                                    <div class="text-xs text-slate-500 mt-1">${okr.quarter} • ${okr.owner}</div>
                                </div>
                                <div class="text-2xl font-black ${progress >= 70 ? 'text-green-600' : 'text-slate-900'}">
                                    ${progress}%
                                </div>
                            </div>
                            <div class="w-full bg-slate-200 rounded-full h-2">
                                <div class="${color} h-2 rounded-full transition-all" style="width: ${progress}%"></div>
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
    const risks = [];

    // Find blocked items
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.blocker) {
                    risks.push({
                        type: 'blocker',
                        item: item.text,
                        track: track.name,
                        note: item.blockerNote || 'Dependencies not met',
                        priority: item.priority
                    });
                }
            });
        });
    });

    // Check for at-risk OKRs
    const okrs = UPDATE_DATA.metadata?.okrs || [];
    okrs.forEach(okr => {
        if (okr.overallProgress < 50) {
            risks.push({
                type: 'okr-risk',
                item: okr.objective,
                note: `Only ${okr.overallProgress}% progress`,
                priority: 'high'
            });
        }
    });

    if (risks.length === 0) {
        return `
            <div class="bg-green-50 p-6 rounded-xl border border-green-200">
                <h2 class="text-2xl font-bold text-green-900 mb-2">✅ No Critical Risks</h2>
                <p class="text-green-800">All systems on track. No blockers or at-risk initiatives.</p>
            </div>
        `;
    }

    return `
        <div class="bg-white p-6 rounded-xl border-2 border-red-500 shadow-xl">
            <h2 class="text-2xl font-bold text-red-900 mb-4">⚠️ Top Risks & Blockers (${risks.length})</h2>
            <div class="space-y-3">
                ${risks.slice(0, 5).map(risk => `
                    <div class="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div class="flex justify-between items-start mb-1">
                            <div class="font-bold text-red-900">${risk.item}</div>
                            <span class="text-xs px-2 py-1 bg-red-200 text-red-800 rounded font-bold uppercase">${risk.type}</span>
                        </div>
                        <p class="text-sm text-red-800">${risk.note}</p>
                        ${risk.track ? `<div class="text-xs text-red-600 mt-1">Track: ${risk.track}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ${risks.length > 5 ? `<div class="text-sm text-slate-600 mt-3">+ ${risks.length - 5} more risks</div>` : ''}
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
