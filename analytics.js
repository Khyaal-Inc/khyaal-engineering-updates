// ========================================
// ANALYTICS & METRICS MODULE
// ========================================
// Sprint velocity, burndown, cycle time, and KPI tracking

function renderAnalyticsView() {
    const container = document.getElementById('analytics-view')
    if (!container) return

    const mode         = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm'
    const velocityData = UPDATE_DATA.metadata?.velocityHistory || []

    const ribbon = `
        <div id="analytics-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">📈</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-medium text-slate-400">Ship · Analytics — ${mode === 'exec' ? 'Outcome & OKR trends' : mode === 'dev' ? 'Your sprint contribution' : 'Velocity & retrospective'}</span>
                    <h2 class="text-sm font-bold text-slate-800">Engineering Analytics</h2>
                </div>
                ${typeof renderInfoButton === 'function' ? renderInfoButton('analytics') : ''}
            </div>
            <div class="flex items-center gap-2">
                <div id="analytics-next-action-mount">
                    ${typeof renderPrimaryStageAction === 'function' ? renderPrimaryStageAction('analytics') : ''}
                </div>
            </div>
        </div>
        ${typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('analytics') : ''}`

    // ---- Exec: OKR outcome view only ----
    if (mode === 'exec') {
        container.innerHTML = `<div class="space-y-6">${ribbon}${renderStrategicAnalyticsBanner()}${renderOKRTrendPanel()}${renderEpicHealthPanel()}${renderSprintForecastPanel()}</div>`
        return
    }

    // ---- Dev: personal sprint contribution ----
    if (mode === 'dev') {
        container.innerHTML = `<div class="space-y-6">${ribbon}${renderDevContributionPanel()}${renderSprintProgress()}</div>`
        if (typeof google !== 'undefined' && google.charts) {
            google.charts.load('current', { packages: ['corechart'] })
            google.charts.setOnLoadCallback(() => drawBurndownChart())
        }
        return
    }

    // ---- PM: full analytics ----
    container.innerHTML = `
        <div class="space-y-6">
            ${ribbon}
            ${renderStrategicAnalyticsBanner()}
            ${renderKPICards()}
            ${renderSprintProgress()}
            ${renderVelocityChart(velocityData)}
            ${renderOKRTrendPanel()}
            ${renderEpicHealthPanel()}
            ${renderSprintForecastPanel()}
            ${renderMetricsTable(velocityData)}
        </div>`

    if (typeof google !== 'undefined' && google.charts) {
        google.charts.load('current', { packages: ['corechart', 'line'] })
        google.charts.setOnLoadCallback(() => {
            drawVelocityChart(velocityData)
            drawBurndownChart()
        })
    }
}

function calculateCurrentSprintVelocity() {
    // Find the active sprint
    const sprints = UPDATE_DATA.metadata?.sprints || []
    const activeSprint = sprints.find(s => s.status === 'active')
    if (!activeSprint) return null

    let planned = 0, completed = 0, inReview = 0, inProgress = 0
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(sub => {
            sub.items.forEach(item => {
                if (item.sprintId !== activeSprint.id) return
                const pts = parseInt(item.storyPoints) || 0
                planned += pts
                if (item.status === 'done') completed += pts
                else if (item.status === 'qa' || item.status === 'review') inReview += pts
                else if (item.status === 'now') inProgress += pts
            })
        })
    })
    return { sprintId: activeSprint.id, name: activeSprint.name, planned, completed, inReview, inProgress }
}

function renderKPICards() {
    // Calculate KPIs from velocity history
    const velocityData = UPDATE_DATA.metadata?.velocityHistory || []
    const historicalCompleted = velocityData.filter(v => v.completed !== null)

    const avgVelocity = historicalCompleted.length > 0
        ? Math.round(historicalCompleted.reduce((sum, v) => sum + v.completed, 0) / historicalCompleted.length)
        : 0

    const lastSprint = historicalCompleted[historicalCompleted.length - 1]
    const lastVelocity = lastSprint ? Math.round((lastSprint.completed / lastSprint.planned) * 100) : 0

    // Count items by status bucket across all tracks
    let activeItems = 0, completedItems = 0, inReviewItems = 0, blockedItems = 0
    let completedPoints = 0, inReviewPoints = 0
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                const pts = parseInt(item.storyPoints) || 0
                if (item.status === 'done') { completedItems++; completedPoints += pts }
                else if (item.status === 'qa' || item.status === 'review') { inReviewItems++; inReviewPoints += pts }
                else if (item.status === 'now') activeItems++
                else if (item.status === 'blocked') blockedItems++
            })
        })
    })

    // Auto-calculated current sprint progress (overlays velocity history)
    const currentSprint = calculateCurrentSprintVelocity()
    const currentPct = currentSprint && currentSprint.planned > 0
        ? Math.round((currentSprint.completed / currentSprint.planned) * 100)
        : null

    const commitmentDisplay = currentPct !== null
        ? currentPct
        : lastVelocity
    const commitmentLabel = currentPct !== null
        ? `${currentSprint.name} in progress`
        : 'last sprint delivery'
    const commitmentColor = commitmentDisplay >= 90 ? 'text-emerald-600' : commitmentDisplay >= 70 ? 'text-amber-600' : 'text-red-500'

    return `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Velocity</div>
                <div class="text-3xl font-black text-slate-900">${avgVelocity}</div>
                <div class="text-[10px] font-bold text-slate-500 mt-1 italic">story points / sprint</div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Commitment</div>
                <div class="text-3xl font-black ${commitmentColor}">${commitmentDisplay}%</div>
                <div class="text-[10px] font-bold text-slate-500 mt-1 italic">${commitmentLabel}</div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Review / QA</div>
                <div class="text-3xl font-black text-violet-600">${inReviewItems}</div>
                <div class="text-[10px] font-bold text-slate-500 mt-1 italic">${inReviewPoints} pts · needs sign-off</div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div class="flex items-center justify-between mb-1">
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Now</div>
                    ${blockedItems > 0 ? `<span class="text-[9px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">${blockedItems} blocked</span>` : ''}
                </div>
                <div class="text-3xl font-black text-indigo-600">${activeItems}</div>
                <div class="text-[10px] font-bold text-slate-500 mt-1 italic">${completedItems} total delivered · ${completedPoints} pts</div>
            </div>
        </div>
    `
}

function renderStrategicAnalyticsBanner() {
    const okrs = UPDATE_DATA.metadata?.okrs || [];
    const avgOkrProgress = okrs.length > 0 
        ? Math.round(okrs.reduce((sum, o) => sum + (o.overallProgress || 0), 0) / okrs.length)
        : 0;

    // Calculate Strategic Impact Score (Delivery vs Outcome)
    // Formula: (Avg OKR Progress) / (Total Items Completed Ratio)
    let completedItems = 0;
    let totalItems = 0;
    UPDATE_DATA.tracks.forEach(t => t.subtracks.forEach(s => s.items.forEach(i => {
        totalItems++;
        if (i.status === 'done') completedItems++;
    })));
    
    const deliveryRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const impactScore = deliveryRate > 0 ? Math.round((avgOkrProgress / (deliveryRate || 1)) * 100) : 0;
    
    return `
        <div class="relative bg-slate-900 rounded-3xl p-8 overflow-hidden border border-slate-800 shadow-2xl">
            <div class="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
            <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div class="max-w-xl">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">Strategic Pulse</span>
                        <div class="h-1 w-1 rounded-full bg-slate-700"></div>
                        <span class="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Outcome Projection: Q2 2026</span>
                    </div>
                    <h2 class="text-4xl font-black text-white tracking-tight leading-none mb-4">
                        Engineering velocity is driving <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">${avgOkrProgress}%</span> of strategic outcomes.
                    </h2>
                    <p class="text-slate-400 font-medium text-sm">Your delivery rate is currently <span class="text-white font-bold">${Math.round(deliveryRate)}%</span>. The Strategic Impact Score indicates high alignment between tasks and business goals.</p>
                </div>
                
                <div class="flex-shrink-0 flex items-center gap-8">
                    <div class="text-center">
                        <div class="relative inline-flex items-center justify-center p-1 rounded-full bg-slate-800 border border-slate-700 shadow-lg mb-2">
                             <svg class="w-16 h-16 transform -rotate-90">
                                <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="4" fill="transparent" class="text-slate-700"></circle>
                                <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="4" fill="transparent" stroke-dasharray="${2 * Math.PI * 28}" stroke-dashoffset="${2 * Math.PI * 28 * (1 - impactScore/100)}" class="text-indigo-500 transition-all duration-1000"></circle>
                             </svg>
                             <span class="absolute text-xs font-black text-white">${impactScore}</span>
                        </div>
                        <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Impact Score</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderVelocityChart(data) {
    return `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">Velocity Trend</h2>
            <div id="velocity-chart" style="height: 400px;"></div>
        </div>
    `
}

function renderSprintProgress() {
    const currentSprint = calculateCurrentSprintVelocity()
    const sprints = UPDATE_DATA.metadata?.sprints || []
    const activeSprint = sprints.find(s => s.status === 'active')

    if (!currentSprint || currentSprint.planned === 0) {
        return `
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500 text-sm">
                No active sprint — assign items to a sprint to see progress here.
            </div>
        `
    }

    const { name, planned, completed, inReview, inProgress } = currentSprint
    const remaining = planned - completed
    const donePct = Math.round((completed / planned) * 100)
    const reviewPct = Math.round((inReview / planned) * 100)
    const activePct = Math.round((inProgress / planned) * 100)
    const remainderPct = 100 - donePct - reviewPct - activePct

    // Sprint date context
    let dateLabel = ''
    if (activeSprint?.endDate) {
        const end = new Date(activeSprint.endDate)
        const now = new Date()
        const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
        dateLabel = daysLeft > 0 ? `${daysLeft}d remaining` : 'Overdue'
    }

    return `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-slate-900">Sprint Progress — ${name}</h2>
                ${dateLabel ? `<span class="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">${dateLabel}</span>` : ''}
            </div>

            <!-- Segmented progress bar -->
            <div class="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex mb-3">
                <div class="h-full bg-emerald-500 transition-all" style="width:${donePct}%" title="Done: ${completed} pts"></div>
                <div class="h-full bg-violet-400 transition-all" style="width:${reviewPct}%" title="In Review/QA: ${inReview} pts"></div>
                <div class="h-full bg-blue-400 transition-all" style="width:${activePct}%" title="In Progress: ${inProgress} pts"></div>
                <div class="h-full bg-slate-200 transition-all" style="width:${Math.max(0, remainderPct)}%" title="Not started: ${remaining - inReview - inProgress} pts"></div>
            </div>

            <!-- Legend -->
            <div class="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 mb-4">
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>Done ${donePct}% (${completed} pts)</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block"></span>Review/QA ${reviewPct}% (${inReview} pts)</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span>In Progress ${activePct}% (${inProgress} pts)</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>Remaining ${Math.max(0, remainderPct)}% (${Math.max(0, remaining - inReview - inProgress)} pts)</span>
            </div>

            <!-- Sprint item breakdown chart placeholder -->
            <div id="burndown-chart" style="height: 300px;"></div>
        </div>
    `
}

function renderMetricsTable(data) {
    const liveSprint = calculateCurrentSprintVelocity()

    return `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">Sprint History</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-slate-200">
                            <th class="text-left p-3 font-bold text-slate-900">Sprint</th>
                            <th class="text-right p-3 font-bold text-slate-900">Planned</th>
                            <th class="text-right p-3 font-bold text-slate-900">Done pts</th>
                            <th class="text-right p-3 font-bold text-slate-900">In Review</th>
                            <th class="text-right p-3 font-bold text-slate-900">Velocity %</th>
                            <th class="text-right p-3 font-bold text-slate-900">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(sprint => {
                            const isActive = liveSprint && sprint.sprintId === liveSprint.sprintId
                            const completedVal = (isActive && (sprint.completed === null || sprint.completed === undefined))
                                ? liveSprint.completed
                                : sprint.completed
                            const inReviewVal = isActive ? liveSprint.inReview : null

                            const velocity = completedVal !== null
                                ? Math.round((completedVal / sprint.planned) * 100)
                                : null

                            const statusBadge = isActive
                                ? `<span class="text-blue-600 font-bold">Active</span>`
                                : sprint.completed === null
                                ? '<span class="text-slate-400 font-bold">Pending</span>'
                                : velocity >= 90
                                ? '<span class="text-green-600 font-bold">✓ Great</span>'
                                : velocity >= 70
                                ? '<span class="text-amber-600 font-bold">○ Good</span>'
                                : '<span class="text-red-600 font-bold">✗ Below</span>'

                            return `
                                <tr class="border-b border-slate-100 hover:bg-slate-50 ${isActive ? 'bg-blue-50/40' : ''}">
                                    <td class="p-3">
                                        <div class="font-semibold text-slate-900">${sprint.sprintId}</div>
                                        <div class="text-xs text-slate-500">${sprint.dates || ''}</div>
                                    </td>
                                    <td class="text-right p-3 font-semibold">${sprint.planned}</td>
                                    <td class="text-right p-3 font-semibold text-emerald-700">${completedVal !== null ? completedVal : '-'}</td>
                                    <td class="text-right p-3 font-semibold text-violet-600">${inReviewVal !== null ? inReviewVal : '-'}</td>
                                    <td class="text-right p-3 font-bold">${velocity !== null ? velocity + '%' : '-'}</td>
                                    <td class="text-right p-3">${statusBadge}</td>
                                </tr>
                            `
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `
}

function drawVelocityChart(data) {
    const chartData = [['Sprint', 'Planned', 'Completed', 'Forecast']]

    // Auto-calculate current sprint velocity from live item data
    const currentSprint = calculateCurrentSprintVelocity()

    data.forEach(sprint => {
        // If this sprint entry matches the active sprint and has no completed value yet, use live calc
        const isActiveSprint = currentSprint && sprint.sprintId === currentSprint.sprintId
        const completedVal = (isActiveSprint && (sprint.completed === null || sprint.completed === undefined))
            ? currentSprint.completed
            : sprint.completed
        chartData.push([
            sprint.sprintId,
            sprint.planned,
            completedVal,
            sprint.forecast || null
        ])
    })

    const dataTable = google.visualization.arrayToDataTable(chartData);

    const options = {
        title: '',
        hAxis: { title: 'Sprint' },
        vAxis: { title: 'Story Points', minValue: 0 },
        series: {
            0: { color: '#94a3b8', lineWidth: 2 },
            1: { color: '#3b82f6', lineWidth: 3 },
            2: { color: '#10b981', lineWidth: 2, lineDashStyle: [4, 4] }
        },
        legend: { position: 'bottom' },
        chartArea: { width: '80%', height: '70%' }
    };

    const chartContainer = document.getElementById('velocity-chart');
    if (!chartContainer) return;
    const chart = new google.visualization.LineChart(chartContainer);
    chart.draw(dataTable, options);
}

function drawBurndownChart() {
    const chartContainer = document.getElementById('burndown-chart')
    if (!chartContainer) return

    const currentSprint = calculateCurrentSprintVelocity()
    if (!currentSprint || currentSprint.planned === 0) return

    const { planned, completed, inReview, inProgress } = currentSprint
    const notStarted = Math.max(0, planned - completed - inReview - inProgress)

    // Pie chart showing current sprint status distribution by story points
    const chartData = google.visualization.arrayToDataTable([
        ['Status', 'Story Points'],
        ['Done', completed],
        ['In Review / QA', inReview],
        ['In Progress', inProgress],
        ['Not Started', notStarted]
    ])

    const options = {
        title: 'Sprint Story Points by Status',
        colors: ['#10b981', '#a78bfa', '#60a5fa', '#e2e8f0'],
        legend: { position: 'right' },
        chartArea: { width: '60%', height: '80%' },
        pieHole: 0.4,
        tooltip: { text: 'value' }
    }

    const chart = new google.visualization.PieChart(chartContainer)
    chart.draw(chartData, options)
}

// ---- OKR Trend Panel ----
// Shows each OKR's overallProgress alongside the sprint count that touched it,
// and a simple "sprints to completion" forecast.
function renderOKRTrendPanel() {
    const okrs     = UPDATE_DATA.metadata?.okrs || []
    const velocity = UPDATE_DATA.metadata?.velocityHistory || []
    const sprints  = UPDATE_DATA.metadata?.sprints || []

    if (okrs.length === 0) return ''

    // Average velocity (completed pts) over last 3 sprints
    const recent = velocity.slice(-3)
    const avgPts = recent.length > 0
        ? Math.round(recent.reduce((s, h) => s + (h.completed || 0), 0) / recent.length)
        : 0

    const rows = okrs.map(okr => {
        const pct        = okr.overallProgress || 0
        const remaining  = 100 - pct
        const barColor   = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'

        // Count closed sprints that were linked to this OKR
        const linkedSprints = sprints.filter(s => s.linkedOKR === okr.id && (s.status === 'completed' || s.status === 'closed')).length

        // Forecast: if avgPts > 0 and we know remaining progress, estimate sprints
        // Heuristic: each sprint advances OKR by (pct / linkedSprints) on average
        let forecastLabel = '—'
        if (linkedSprints > 0 && pct > 0 && pct < 100) {
            const ptsPerSprint = pct / linkedSprints
            const sprintsNeeded = Math.ceil(remaining / ptsPerSprint)
            forecastLabel = `~${sprintsNeeded} sprint${sprintsNeeded !== 1 ? 's' : ''}`
        } else if (pct >= 100) {
            forecastLabel = '✓ Complete'
        }

        const krsTotal = okr.keyResults?.length || 0
        const krsDone  = (okr.keyResults || []).filter(kr => (kr.progress || 0) >= 100).length

        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                <td class="px-4 py-3">
                    <div class="text-xs font-bold text-slate-800 truncate max-w-[220px]">${okr.objective || okr.title || okr.id}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">${okr.quarter || ''} · ${krsTotal} KRs (${krsDone} complete)</div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <div class="h-2 w-32 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div class="${barColor} h-full rounded-full transition-all" style="width:${pct}%"></div>
                        </div>
                        <span class="text-xs font-black text-slate-700">${pct}%</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-center text-xs text-slate-600">${linkedSprints}</td>
                <td class="px-4 py-3 text-center text-xs font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-indigo-600'}">${forecastLabel}</td>
            </tr>`
    }).join('')

    return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 class="text-sm font-black text-slate-800">OKR Progress Trend</h3>
                ${avgPts > 0 ? `<span class="text-[10px] font-bold text-slate-400">Avg velocity: ${avgPts} pts / sprint (last 3)</span>` : ''}
            </div>
            <table class="w-full">
                <thead>
                    <tr class="border-b border-slate-200">
                        <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Objective</th>
                        <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Progress</th>
                        <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Sprints Run</th>
                        <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Forecast to 100%</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`
}

// ---- Epic Health Panel ----
// Classifies each epic as On Track / At Risk / Slipping based on
// % done vs % of time elapsed to its end date.
function renderEpicHealthPanel() {
    const epics  = UPDATE_DATA.metadata?.epics || []
    const today  = new Date(); today.setHours(0, 0, 0, 0)

    // Build epic → item completion map
    const epicStats = {}
    ;(UPDATE_DATA.tracks || []).forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (!item.epicId) return
                if (!epicStats[item.epicId]) epicStats[item.epicId] = { total: 0, done: 0 }
                epicStats[item.epicId].total++
                if (item.status === 'done') epicStats[item.epicId].done++
            })
        })
    })

    const rows = epics.map(epic => {
        const stats   = epicStats[epic.id] || { total: 0, done: 0 }
        const donePct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

        // Time elapsed %
        let timePct   = null
        let timeLabel = '—'
        if (epic.startDate && epic.endDate) {
            const start    = new Date(epic.startDate)
            const end      = new Date(epic.endDate)
            const total    = end - start
            const elapsed  = Math.min(today - start, total)
            timePct  = total > 0 ? Math.round((elapsed / total) * 100) : 0
            const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
            timeLabel = daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`
        }

        // Health classification
        let health, healthClass
        if (timePct === null) {
            health = 'No dates'; healthClass = 'text-slate-400'
        } else if (donePct >= timePct) {
            health = '✓ On Track'; healthClass = 'text-emerald-600'
        } else if (donePct >= timePct - 20) {
            health = '⚠ At Risk'; healthClass = 'text-amber-600'
        } else {
            health = '⛔ Slipping'; healthClass = 'text-rose-600'
        }

        const barColor = donePct >= 80 ? 'bg-emerald-500' : donePct >= 50 ? 'bg-amber-500' : 'bg-rose-500'

        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                <td class="px-4 py-3">
                    <div class="text-xs font-bold text-slate-800 truncate max-w-[200px]">${epic.name}</div>
                    <div class="text-[10px] text-slate-400">${epic.track || ''}</div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <div class="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div class="${barColor} h-full rounded-full" style="width:${donePct}%"></div>
                        </div>
                        <span class="text-xs font-black text-slate-700">${donePct}%</span>
                    </div>
                    <div class="text-[9px] text-slate-400 mt-0.5">${stats.done}/${stats.total} items</div>
                </td>
                <td class="px-4 py-3 text-center text-xs text-slate-500">${timeLabel}</td>
                <td class="px-4 py-3 text-center">
                    <span class="text-xs font-black ${healthClass}">${health}</span>
                </td>
            </tr>`
    }).join('')

    if (!epics.length) return ''

    return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100">
                <h3 class="text-sm font-black text-slate-800">Epic Health — On Track vs Slipping</h3>
            </div>
            <table class="w-full">
                <thead>
                    <tr class="border-b border-slate-200">
                        <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Epic</th>
                        <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Completion</th>
                        <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Time Left</th>
                        <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Health</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`
}

// ---- Sprint Forecast Panel ----
// Projects future sprint velocity using a simple 3-sprint rolling average.
// Shows "sprints to current OKR completion" per linked OKR.
function renderSprintForecastPanel() {
    const velocity = UPDATE_DATA.metadata?.velocityHistory || []
    const sprints  = UPDATE_DATA.metadata?.sprints || []
    const okrs     = UPDATE_DATA.metadata?.okrs || []

    if (velocity.length < 2) return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-8 text-center">
            <div class="text-slate-400 text-sm">Need at least 2 closed sprints for forecasting.</div>
        </div>`

    const recent  = velocity.slice(-3)
    const avgPts  = Math.round(recent.reduce((s, h) => s + (h.completed || 0), 0) / recent.length)
    const avgRate = recent.length > 0
        ? Math.round(recent.reduce((s, h) => s + Math.round((h.completed / (h.planned || 1)) * 100), 0) / recent.length)
        : 0

    // Trend: is velocity improving, stable, declining?
    const trend = recent.length >= 2
        ? (recent[recent.length - 1].completed > recent[0].completed ? '↑ Improving' : recent[recent.length - 1].completed < recent[0].completed ? '↓ Declining' : '→ Stable')
        : '→ Stable'
    const trendColor = trend.startsWith('↑') ? 'text-emerald-600' : trend.startsWith('↓') ? 'text-rose-600' : 'text-slate-600'

    // Next sprint forecast
    const futureSprints = sprints.filter(s => s.status !== 'completed' && s.status !== 'closed')
    const nextSprint    = futureSprints[0]

    const forecastCards = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div class="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Rolling Avg Velocity</div>
                <div class="text-2xl font-black text-indigo-900">${avgPts}<span class="text-sm font-bold ml-1">pts</span></div>
                <div class="text-[10px] text-indigo-600 mt-1">per sprint (last ${recent.length})</div>
            </div>
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Commitment Rate</div>
                <div class="text-2xl font-black ${avgRate >= 85 ? 'text-emerald-700' : avgRate >= 70 ? 'text-amber-700' : 'text-rose-700'}">${avgRate}%</div>
                <div class="text-[10px] text-slate-500 mt-1">planned → delivered avg</div>
            </div>
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Velocity Trend</div>
                <div class="text-2xl font-black ${trendColor}">${trend}</div>
                <div class="text-[10px] text-slate-500 mt-1">${nextSprint ? `Next: ${nextSprint.name}` : 'No upcoming sprint'}</div>
            </div>
        </div>`

    // OKR forecast rows
    const okrRows = okrs.map(okr => {
        const pct      = okr.overallProgress || 0
        if (pct >= 100) return `
            <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span class="text-xs font-bold text-slate-700 truncate max-w-[60%]">${okr.objective || okr.id}</span>
                <span class="text-xs font-black text-emerald-600">✓ Complete</span>
            </div>`

        const linkedSprints = sprints.filter(s => s.linkedOKR === okr.id && (s.status === 'completed' || s.status === 'closed')).length
        const ptsPerSprint  = linkedSprints > 0 ? pct / linkedSprints : null
        const remaining     = 100 - pct

        let forecast = 'Insufficient data'
        if (ptsPerSprint && ptsPerSprint > 0) {
            const n = Math.ceil(remaining / ptsPerSprint)
            forecast = `~${n} sprint${n !== 1 ? 's' : ''} (${Math.round(ptsPerSprint)}%/sprint)`
        }

        return `
            <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span class="text-xs font-bold text-slate-700 truncate max-w-[60%]">${okr.objective || okr.id}</span>
                <div class="flex items-center gap-3">
                    <div class="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                        <div class="${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'} h-full rounded-full" style="width:${pct}%"></div>
                    </div>
                    <span class="text-[10px] font-black text-indigo-600 whitespace-nowrap">${forecast}</span>
                </div>
            </div>`
    }).join('')

    return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100">
                <h3 class="text-sm font-black text-slate-800">Sprint Forecast</h3>
            </div>
            <div class="p-6">
                ${forecastCards}
                ${okrRows ? `
                    <div>
                        <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">OKR Completion Forecast</div>
                        ${okrRows}
                    </div>` : ''}
            </div>
        </div>`
}

// ---- Dev Contribution Panel ----
// Shows the current user's sprint items + personal velocity (pts done this sprint).
function renderDevContributionPanel() {
    const currentUser = (typeof window.CURRENT_USER !== 'undefined' && window.CURRENT_USER?.name)
        ? window.CURRENT_USER.name : null

    const activeSprint = (UPDATE_DATA.metadata?.sprints || []).find(s => s.status === 'active')
    const velocity     = UPDATE_DATA.metadata?.velocityHistory || []

    if (!activeSprint) return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-8 text-center">
            <div class="text-slate-400 text-sm">No active sprint found.</div>
        </div>`

    // Collect this user's items in the active sprint
    const myItems = []
    ;(UPDATE_DATA.tracks || []).forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.sprintId !== activeSprint.id) return
                if (!currentUser || (item.contributors || []).includes(currentUser)) {
                    myItems.push(item)
                }
            })
        })
    })

    const myPts    = myItems.reduce((s, i) => s + (parseInt(i.storyPoints) || 0), 0)
    const myDone   = myItems.filter(i => i.status === 'done').reduce((s, i) => s + (parseInt(i.storyPoints) || 0), 0)
    const myPct    = myPts > 0 ? Math.round((myDone / myPts) * 100) : 0
    const blocked  = myItems.filter(i => i.status === 'blocked' || i.blocker).length
    const barColor = myPct >= 80 ? 'bg-emerald-500' : myPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'

    const statusOrder = ['blocked', 'now', 'qa', 'review', 'next', 'done', 'later']
    const itemRows = statusOrder.flatMap(status => {
        const bucket = myItems.filter(i => i.status === status)
        if (!bucket.length) return []
        const badgeClass = (typeof statusConfig !== 'undefined' && statusConfig[status]?.class) || 'bg-slate-100 text-slate-600'
        return [`
            <div class="mb-3">
                <div class="mb-1"><span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${badgeClass}">${status}</span></div>
                ${bucket.map(item => `
                    <div class="flex items-center gap-2 py-1.5 pl-2 text-[11px] text-slate-700 border-b border-slate-50 last:border-0">
                        <span class="flex-1 truncate">${item.text}</span>
                        ${item.storyPoints ? `<span class="text-[10px] font-black text-slate-400 shrink-0">${item.storyPoints}p</span>` : ''}
                    </div>`).join('')}
            </div>`]
    }).join('')

    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                <div class="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">My Sprint Progress</div>
                <div class="text-3xl font-black text-indigo-900">${myPct}%</div>
                <div class="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden mt-2">
                    <div class="${barColor} h-full rounded-full" style="width:${myPct}%"></div>
                </div>
                <div class="text-[10px] text-indigo-600 mt-1.5">${myDone}/${myPts} pts done</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">My Items</div>
                <div class="text-3xl font-black text-slate-900">${myItems.length}</div>
                <div class="text-[10px] text-slate-500 mt-1">in ${activeSprint.name}</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Blocked</div>
                <div class="text-3xl font-black ${blocked > 0 ? 'text-rose-600' : 'text-emerald-600'}">${blocked}</div>
                <div class="text-[10px] text-slate-500 mt-1">${blocked > 0 ? 'needs attention' : 'all clear'}</div>
            </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 class="text-sm font-black text-slate-800 mb-4">My Sprint Items — ${activeSprint.name}</h3>
            ${itemRows || `<div class="text-slate-400 text-sm text-center py-4">No items assigned to you in this sprint.</div>`}
        </div>`
}

// Export
window.renderAnalyticsView = renderAnalyticsView;
