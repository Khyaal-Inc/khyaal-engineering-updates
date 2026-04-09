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

// ---- Shared computation helpers (used by multiple panel builders) ----

/**
 * Computes live epic health for a single epic:
 * On Track / At Risk / Slipping — by comparing % done vs % time elapsed.
 */
function computeEpicHealth(epic) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let total = 0, done = 0
    ;(UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(st => st.items.forEach(i => {
        if (i.epicId !== epic.id) return
        total++
        if (i.status === 'done') done++
    })))
    const donePct = total > 0 ? Math.round((done / total) * 100) : 0

    if (!epic.startDate || !epic.endDate) return { donePct, timePct: null, label: 'No dates', signal: 'no-dates' }
    const start = new Date(epic.startDate), end = new Date(epic.endDate)
    const elapsed = Math.min(today - start, end - start)
    const timePct = end > start ? Math.round((elapsed / (end - start)) * 100) : 0

    if (donePct >= timePct)              return { donePct, timePct, label: 'On Track',  signal: 'on-track' }
    if (donePct >= timePct - 20)         return { donePct, timePct, label: 'At Risk',   signal: 'at-risk'  }
    return                                      { donePct, timePct, label: 'Slipping',  signal: 'slipping' }
}

/**
 * Counts items shipped this quarter (status=done, updatedAt within current quarter).
 */
function countShippedThisQuarter() {
    const now = new Date()
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    let count = 0
    ;(UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(st => st.items.forEach(i => {
        if (i.status === 'done' && i.updatedAt && new Date(i.updatedAt) >= qStart) count++
    })))
    return count
}

function renderExecutiveSummary() {
    let totalItems = 0, doneItems = 0, blockedItems = 0
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                totalItems++
                if (item.status === 'done') doneItems++
                if (item.blocker || item.status === 'blocked') blockedItems++
            })
        })
    })

    const epics = UPDATE_DATA.metadata?.epics || []
    const okrs  = UPDATE_DATA.metadata?.okrs  || []

    const avgOKRProgress = okrs.length > 0
        ? Math.round(okrs.reduce((s, o) => s + (o.overallProgress || 0), 0) / okrs.length)
        : 0

    // Live epic health counts
    const epicHealthCounts = epics.reduce((acc, epic) => {
        const h = computeEpicHealth(epic)
        acc[h.signal] = (acc[h.signal] || 0) + 1
        return acc
    }, {})
    const onTrack = epicHealthCounts['on-track'] || 0

    const shippedQ = countShippedThisQuarter()
    const closedSprints = (UPDATE_DATA.metadata?.sprints || []).filter(s => s.status === 'completed' || s.status === 'closed').length

    return `
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-2xl text-white shadow-2xl">
            <div class="flex items-center justify-between mb-6">
                <h1 class="text-2xl font-black">Executive Pulse</h1>
                <span class="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    ${new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div class="bg-white/10 rounded-xl p-4 border border-white/20">
                    <div class="text-[9px] font-black text-purple-200 uppercase tracking-widest mb-1">OKR Progress</div>
                    <div class="text-3xl font-black">${avgOKRProgress}%</div>
                    <div class="text-[10px] text-purple-200 mt-1">${okrs.length} objective${okrs.length !== 1 ? 's' : ''}</div>
                </div>
                <div class="bg-white/10 rounded-xl p-4 border border-white/20">
                    <div class="text-[9px] font-black text-purple-200 uppercase tracking-widest mb-1">Epics On Track</div>
                    <div class="text-3xl font-black">${onTrack}/${epics.length}</div>
                    <div class="text-[10px] text-purple-200 mt-1">live health check</div>
                </div>
                <div class="bg-white/10 rounded-xl p-4 border border-white/20">
                    <div class="text-[9px] font-black text-purple-200 uppercase tracking-widest mb-1">Shipped This Qtr</div>
                    <div class="text-3xl font-black">${shippedQ}</div>
                    <div class="text-[10px] text-purple-200 mt-1">items delivered</div>
                </div>
                <div class="bg-white/10 rounded-xl p-4 border border-white/20">
                    <div class="text-[9px] font-black text-purple-200 uppercase tracking-widest mb-1">Sprints Closed</div>
                    <div class="text-3xl font-black">${closedSprints}</div>
                    <div class="text-[10px] text-purple-200 mt-1">all time</div>
                </div>
                <div class="bg-white/10 rounded-xl p-4 border border-white/20">
                    <div class="text-[9px] font-black text-purple-200 uppercase tracking-widest mb-1">Blockers</div>
                    <div class="text-3xl font-black ${blockedItems > 0 ? 'text-red-300' : ''}">${blockedItems}</div>
                    <div class="text-[10px] text-purple-200 mt-1">need attention</div>
                </div>
            </div>
        </div>`
}

function buildOKRRing(progress, size) {
    const r   = size / 2 - 5
    const circ = 2 * Math.PI * r
    const pct  = Math.max(0, Math.min(100, progress))
    const offset = circ * (1 - pct / 100)
    const stroke = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
    return `
        <svg width="${size}" height="${size}" class="-rotate-90" style="display:block">
            <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="#e2e8f0" stroke-width="5" fill="none"/>
            <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${stroke}" stroke-width="5" fill="none"
                stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
                stroke-linecap="round"/>
        </svg>`
}

function renderOKRSummary() {
    const okrs = UPDATE_DATA.metadata?.okrs || []
    if (okrs.length === 0) return ''

    // Live portfolio health
    const avgProgress = Math.round(okrs.reduce((s, o) => s + (o.overallProgress || 0), 0) / okrs.length)
    const portfolioLabel = avgProgress >= 70 ? 'On Track' : avgProgress >= 40 ? 'At Risk' : 'Behind'
    const portfolioClass = avgProgress >= 70
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : avgProgress >= 40
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'

    const cards = okrs.map(okr => {
        const pct       = okr.overallProgress || 0
        const krCount   = okr.keyResults?.length || 0
        const krDone    = (okr.keyResults || []).filter(kr => (kr.progress || 0) >= 100).length
        const signal    = pct >= 70 ? '🟢 On Track' : pct >= 40 ? '🟡 At Risk' : '🔴 Behind'
        const textColor = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-600'

        // Count linked items for execution context
        const epicIds = new Set((UPDATE_DATA.metadata?.epics || []).filter(e => e.linkedOKR === okr.id).map(e => e.id))
        let taskTotal = 0, taskDone = 0
        ;(UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(st => st.items.forEach(i => {
            if (!epicIds.has(i.epicId)) return; taskTotal++; if (i.status === 'done') taskDone++
        })))
        const execPulse = taskTotal > 0 ? `${taskDone}/${taskTotal} tasks done` : 'No linked tasks'

        return `
            <div class="group p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all hover:shadow-md">
                <div class="flex items-center gap-4 mb-4">
                    <!-- SVG ring -->
                    <div class="relative shrink-0" style="width:60px;height:60px">
                        ${buildOKRRing(pct, 60)}
                        <div class="absolute inset-0 flex items-center justify-center">
                            <span class="text-xs font-black ${textColor}">${pct}%</span>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">${okr.quarter || ''}</div>
                        <h3 class="text-xs font-black text-slate-800 leading-snug line-clamp-2">${okr.objective}</h3>
                    </div>
                </div>

                <div class="space-y-1.5 mb-4">
                    <div class="flex items-center justify-between text-[10px]">
                        <span class="text-slate-500 font-bold">Key Results</span>
                        <span class="font-black text-slate-700">${krDone}/${krCount} complete</span>
                    </div>
                    <!-- KR micro-bars -->
                    ${(okr.keyResults || []).slice(0, 3).map(kr => {
                        const kpct = kr.progress || 0
                        const kbar = kpct >= 100 ? 'bg-emerald-500' : kpct >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                        return `
                            <div class="flex items-center gap-2">
                                <div class="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                    <div class="${kbar} h-full rounded-full" style="width:${kpct}%"></div>
                                </div>
                                <span class="text-[9px] font-black text-slate-500 w-7 text-right">${kpct}%</span>
                            </div>`
                    }).join('')}
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                        <div class="text-[9px] font-black text-slate-400">${signal}</div>
                        <div class="text-[9px] text-slate-400 mt-0.5">${execPulse}</div>
                    </div>
                    <button onclick="switchView('okr')" class="text-[9px] font-black text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-100 px-2 py-1 rounded-lg transition-colors">
                        Details →
                    </button>
                </div>
            </div>`
    }).join('')

    return `
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-sm font-black text-slate-800">Strategic Progress — OKRs</h2>
                    <p class="text-[10px] text-slate-400 mt-0.5">Outcome-based achievement · auto-calculated from task completion</p>
                </div>
                <span class="text-[10px] font-black px-3 py-1 rounded-full border ${portfolioClass}">
                    Portfolio: ${portfolioLabel}
                </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>
        </div>`
}

function renderEpicHealth() {
    const epics = UPDATE_DATA.metadata?.epics || []
    if (epics.length === 0) return ''

    const today = new Date(); today.setHours(0, 0, 0, 0)

    const rows = epics.map(epic => {
        const h = computeEpicHealth(epic)
        const borderClass = h.signal === 'on-track' ? 'border-emerald-400' : h.signal === 'at-risk' ? 'border-amber-400' : h.signal === 'slipping' ? 'border-rose-500' : 'border-slate-300'
        const signalIcon  = h.signal === 'on-track' ? '🟢' : h.signal === 'at-risk' ? '🟡' : h.signal === 'slipping' ? '🔴' : '⚪'
        const barColor    = h.donePct >= 80 ? 'bg-emerald-500' : h.donePct >= 50 ? 'bg-amber-400' : 'bg-rose-400'

        // Time left label
        let timeLabel = '—'
        if (epic.endDate) {
            const daysLeft = Math.ceil((new Date(epic.endDate) - today) / (1000 * 60 * 60 * 24))
            timeLabel = daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`
        }

        // OKR linkage
        const linkedOKR = epic.linkedOKR
            ? (UPDATE_DATA.metadata?.okrs || []).find(o => o.id === epic.linkedOKR)
            : null

        return `
            <div class="p-4 rounded-xl border-l-4 ${borderClass} bg-white border border-slate-100 hover:shadow-sm transition-shadow">
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2">
                        <span>${signalIcon}</span>
                        <span class="text-xs font-black text-slate-800 leading-snug">${epic.name}</span>
                    </div>
                    <span class="text-[9px] font-black text-slate-400 shrink-0 uppercase tracking-wider">${epic.track || ''}</span>
                </div>
                ${linkedOKR ? `<div class="text-[9px] text-indigo-500 font-bold mb-2 truncate">🎯 ${linkedOKR.objective.substring(0, 50)}${linkedOKR.objective.length > 50 ? '…' : ''}</div>` : ''}
                <div class="flex items-center gap-2 mb-1.5">
                    <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div class="${barColor} h-full rounded-full" style="width:${h.donePct}%"></div>
                    </div>
                    <span class="text-[10px] font-black text-slate-600">${h.donePct}%</span>
                </div>
                <div class="flex items-center justify-between text-[9px] font-bold text-slate-400">
                    <span>${h.label}</span>
                    <span>${timeLabel}</span>
                </div>
            </div>`
    }).join('')

    // Summary counts
    const counts = epics.reduce((acc, e) => { const h = computeEpicHealth(e); acc[h.signal] = (acc[h.signal]||0)+1; return acc }, {})

    return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-sm font-black text-slate-800">Epic Health — Live</h2>
                <div class="flex items-center gap-3 text-[10px] font-black">
                    ${counts['on-track']  ? `<span class="text-emerald-600">🟢 ${counts['on-track']} on track</span>`  : ''}
                    ${counts['at-risk']   ? `<span class="text-amber-600">🟡 ${counts['at-risk']} at risk</span>`    : ''}
                    ${counts['slipping']  ? `<span class="text-rose-600">🔴 ${counts['slipping']} slipping</span>`   : ''}
                    ${counts['no-dates']  ? `<span class="text-slate-400">⚪ ${counts['no-dates']} no dates</span>`  : ''}
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">${rows}</div>
        </div>`
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
                    const linkedOKR = epic?.linkedOKR ? (UPDATE_DATA.metadata?.okrs || []).find(o => o.id === epic.linkedOKR) : null;
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
                                    ${linkedOKR ? `<span>· 🎯 ${linkedOKR.objective.substring(0, 40)}${linkedOKR.objective.length > 40 ? '…' : ''}</span>` : ''}
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
    const history  = UPDATE_DATA.metadata?.velocityHistory || []
    const sprints  = UPDATE_DATA.metadata?.sprints || []
    const completed = history.filter(v => v.completed != null)
    if (completed.length === 0) return ''

    const recent   = completed.slice(-5)
    const avgRate  = Math.round(recent.reduce((s, v) => s + Math.round((v.completed / (v.planned || 1)) * 100), 0) / recent.length)
    const last     = recent[recent.length - 1]
    const prev     = recent[recent.length - 2]
    const trendIcon  = !prev ? '→' : last.completed > prev.completed ? '↑' : last.completed < prev.completed ? '↓' : '→'
    const trendColor = trendIcon === '↑' ? 'text-emerald-600' : trendIcon === '↓' ? 'text-rose-600' : 'text-slate-500'

    // Max completed for bar scaling
    const maxPts = Math.max(...recent.map(v => v.planned || 1))

    const bars = recent.map(v => {
        const rate       = Math.round((v.completed / (v.planned || 1)) * 100)
        const barColor   = rate >= 90 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-400' : 'bg-rose-400'
        const barW       = Math.round((v.completed / maxPts) * 100)
        // Look up sprint name from sprints array
        const sprint     = sprints.find(s => s.id === v.sprintId)
        const label      = sprint?.name || v.sprintId

        return `
            <div class="flex items-center gap-3">
                <div class="text-[10px] font-bold text-slate-500 w-28 truncate shrink-0" title="${label}">${label}</div>
                <div class="flex-1 h-5 bg-slate-100 rounded-md overflow-hidden relative">
                    <div class="${barColor} h-full rounded-md transition-all" style="width:${barW}%"></div>
                    <span class="absolute inset-0 flex items-center pl-2 text-[9px] font-black text-white mix-blend-luminosity">${v.completed}/${v.planned} pts</span>
                </div>
                <div class="text-[10px] font-black ${rate >= 90 ? 'text-emerald-600' : rate >= 70 ? 'text-amber-600' : 'text-rose-600'} w-8 text-right shrink-0">${rate}%</div>
            </div>`
    }).join('')

    return `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-5">
                <div>
                    <h2 class="text-sm font-black text-slate-800">Sprint Velocity Cadence</h2>
                    <p class="text-[10px] text-slate-400 mt-0.5">Last ${recent.length} sprints</p>
                </div>
                <div class="text-right">
                    <span class="text-2xl font-black ${trendColor}">${trendIcon} ${avgRate}%</span>
                    <div class="text-[9px] text-slate-400 font-bold">avg commitment rate</div>
                </div>
            </div>
            <div class="space-y-2">${bars}</div>
        </div>`
}

// Export
window.renderExecutiveDashboard = renderExecutiveDashboard;
