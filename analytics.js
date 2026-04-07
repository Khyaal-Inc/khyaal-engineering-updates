// ========================================
// ANALYTICS & METRICS MODULE
// ========================================
// Sprint velocity, burndown, cycle time, and KPI tracking

function renderAnalyticsView() {
    const container = document.getElementById('analytics-view');
    if (!container) {
        const mainContent = document.querySelector('#main-content');
        if (mainContent) {
            const newView = document.createElement('div');
            newView.id = 'analytics-view';
            newView.className = 'view-section';
            mainContent.appendChild(newView);
        } else {
            return;
        }
    }

    const velocityData = UPDATE_DATA.metadata?.velocityHistory || [];
    const sprints = UPDATE_DATA.metadata?.sprints || [];

    container.innerHTML = `
        <div class="space-y-6">
            <!-- Unified Pulse Ribbon -->
            <div id="analytics-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <!-- Group 1: Navigation/Breadcrumb -->
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">📈</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-medium text-slate-400">Review / Engineering Analytics</span>
                        <h2 class="text-sm font-bold text-slate-800">Velocity & Retrospective</h2>
                    </div>
                    ${typeof renderInfoButton === 'function' ? renderInfoButton('analytics') : ''}
                </div>

                <!-- Group 2: Actions -->
                <div class="flex items-center gap-2">
                    <div id="analytics-next-action-mount">
                        ${(typeof renderPrimaryStageAction === 'function') ? renderPrimaryStageAction('analytics') : ''}
                    </div>
                </div>
            </div>
            ${typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('analytics') : ''}

            <!-- Strategic Pulse Banner -->
            ${renderStrategicAnalyticsBanner()}

            <!-- KPI Cards (Outcome Focused) -->
            ${renderKPICards()}

            <!-- Sprint Progress (real data) -->
            ${renderSprintProgress()}

            <!-- Velocity Chart -->
            ${renderVelocityChart(velocityData)}

            <!-- Metrics Table -->
            ${renderMetricsTable(velocityData)}
        </div>
    `;

    // Load Google Charts if available
    if (typeof google !== 'undefined' && google.charts) {
        google.charts.load('current', { packages: ['corechart', 'line'] });
        google.charts.setOnLoadCallback(() => {
            drawVelocityChart(velocityData);
            drawBurndownChart();
        });
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

// Export
window.renderAnalyticsView = renderAnalyticsView;
