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

function renderKPICards() {
    // Calculate KPIs
    const velocityData = UPDATE_DATA.metadata?.velocityHistory || [];
    const completed = velocityData.filter(v => v.completed !== null);

    const avgVelocity = completed.length > 0
        ? Math.round(completed.reduce((sum, v) => sum + v.completed, 0) / completed.length)
        : 0;

    const lastSprint = completed[completed.length - 1];
    const lastVelocity = lastSprint ? Math.round((lastSprint.completed / lastSprint.planned) * 100) : 0;

    // Count active items
    let activeItems = 0;
    let completedItems = 0;
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.status === 'done') completedItems++;
                else if (item.status === 'now') activeItems++;
            });
        });
    });

    return `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Strategic Velocity</div>
                <div class="text-3xl font-black text-slate-900">${avgVelocity}</div>
                <div class="text-[10px] font-bold text-slate-500 mt-1 italic">story points / sprint</div>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Commitment Accuracy</div>
                <div class="text-3xl font-black ${lastVelocity >= 90 ? 'text-emerald-600' : 'text-amber-600'}">${lastVelocity}%</div>
                <div class="text-[10px] font-bold text-slate-500 mt-1 italic">last sprint delivery</div>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outcome Pulse</div>
                <div class="text-3xl font-black text-indigo-600">${activeItems}</div>
                <div class="text-[10px] font-bold text-slate-500 mt-1 italic">active strategic items</div>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Completion</div>
                <div class="text-3xl font-black text-emerald-600">${completedItems}</div>
                <div class="text-[10px] font-bold text-slate-500 mt-1 italic">total items delivered</div>
            </div>
        </div>
    `;
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
    `;
}

function renderBurndownChart(sprints) {
    const activeSprint = sprints.find(s => s.status === 'active');

    if (!activeSprint) {
        return `
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                <p class="text-slate-600">No active sprint for burndown chart</p>
            </div>
        `;
    }

    return `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">Sprint Burndown - ${activeSprint.name}</h2>
            <div id="burndown-chart" style="height: 400px;"></div>
        </div>
    `;
}

function renderMetricsTable(data) {
    return `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">Sprint History</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-slate-200">
                            <th class="text-left p-3 font-bold text-slate-900">Sprint</th>
                            <th class="text-right p-3 font-bold text-slate-900">Planned</th>
                            <th class="text-right p-3 font-bold text-slate-900">Completed</th>
                            <th class="text-right p-3 font-bold text-slate-900">Velocity %</th>
                            <th class="text-right p-3 font-bold text-slate-900">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(sprint => {
                            const velocity = sprint.completed !== null
                                ? Math.round((sprint.completed / sprint.planned) * 100)
                                : null;

                            const statusBadge = sprint.completed === null
                                ? '<span class="text-blue-600 font-bold">Active</span>'
                                : velocity >= 90
                                ? '<span class="text-green-600 font-bold">✓ Great</span>'
                                : velocity >= 70
                                ? '<span class="text-amber-600 font-bold">○ Good</span>'
                                : '<span class="text-red-600 font-bold">✗ Below</span>';

                            return `
                                <tr class="border-b border-slate-100 hover:bg-slate-50">
                                    <td class="p-3">
                                        <div class="font-semibold text-slate-900">${sprint.sprintId}</div>
                                        <div class="text-xs text-slate-500">${sprint.dates}</div>
                                    </td>
                                    <td class="text-right p-3 font-semibold">${sprint.planned}</td>
                                    <td class="text-right p-3 font-semibold">${sprint.completed !== null ? sprint.completed : '-'}</td>
                                    <td class="text-right p-3 font-bold">${velocity !== null ? velocity + '%' : '-'}</td>
                                    <td class="text-right p-3">${statusBadge}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function drawVelocityChart(data) {
    const chartData = [['Sprint', 'Planned', 'Completed', 'Forecast']];

    data.forEach(sprint => {
        chartData.push([
            sprint.sprintId,
            sprint.planned,
            sprint.completed,
            sprint.forecast || null
        ]);
    });

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
    // Sample burndown data (you can calculate this from actual sprint items)
    const burndownData = [
        ['Day', 'Ideal', 'Actual'],
        ['Day 1', 55, 55],
        ['Day 3', 45, 50],
        ['Day 5', 35, 42],
        ['Day 7', 25, 35],
        ['Day 9', 15, 22],
        ['Day 11', 5, 12],
        ['Day 14', 0, 0]
    ];

    const dataTable = google.visualization.arrayToDataTable(burndownData);

    const options = {
        title: '',
        hAxis: { title: 'Sprint Days' },
        vAxis: { title: 'Remaining Points', minValue: 0 },
        series: {
            0: { color: '#94a3b8', lineWidth: 2, lineDashStyle: [4, 4] },
            1: { color: '#3b82f6', lineWidth: 3 }
        },
        legend: { position: 'bottom' },
        chartArea: { width: '80%', height: '70%' }
    };

    const chartContainer = document.getElementById('burndown-chart');
    if (!chartContainer) return;
    const chart = new google.visualization.LineChart(chartContainer);
    chart.draw(dataTable, options);
}

// Export
window.renderAnalyticsView = renderAnalyticsView;
