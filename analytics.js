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
            <!-- KPI Cards -->
            ${renderKPICards()}

            <!-- Velocity Chart -->
            ${renderVelocityChart(velocityData)}

            <!-- Sprint Burndown -->
            ${renderBurndownChart(sprints)}

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
                else if (item.status === 'now' || item.status === 'ongoing') activeItems++;
            });
        });
    });

    return `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
                <div class="text-sm font-bold text-slate-500 uppercase tracking-wider">Avg Velocity</div>
                <div class="text-4xl font-black text-slate-900 mt-2">${avgVelocity}</div>
                <div class="text-xs text-slate-600 mt-1">story points/sprint</div>
            </div>

            <div class="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
                <div class="text-sm font-bold text-slate-500 uppercase tracking-wider">Sprint Completion</div>
                <div class="text-4xl font-black ${lastVelocity >= 90 ? 'text-green-600' : 'text-amber-600'} mt-2">${lastVelocity}%</div>
                <div class="text-xs text-slate-600 mt-1">last sprint</div>
            </div>

            <div class="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
                <div class="text-sm font-bold text-slate-500 uppercase tracking-wider">In Progress</div>
                <div class="text-4xl font-black text-blue-600 mt-2">${activeItems}</div>
                <div class="text-xs text-slate-600 mt-1">active items</div>
            </div>

            <div class="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
                <div class="text-sm font-bold text-slate-500 uppercase tracking-wider">Completed</div>
                <div class="text-4xl font-black text-green-600 mt-2">${completedItems}</div>
                <div class="text-xs text-slate-600 mt-1">total done</div>
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

    const chart = new google.visualization.LineChart(document.getElementById('velocity-chart'));
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

    const chart = new google.visualization.LineChart(document.getElementById('burndown-chart'));
    chart.draw(dataTable, options);
}

// Export
window.renderAnalyticsView = renderAnalyticsView;
