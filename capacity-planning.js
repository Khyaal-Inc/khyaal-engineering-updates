// ========================================
// CAPACITY PLANNING MODULE
// ========================================
// Team capacity, workload distribution, sprint planning

function renderCapacityView() {
    const container = document.getElementById('capacity-view');
    if (!container) {
        const mainContent = document.querySelector('#main-content');
        if (mainContent) {
            const newView = document.createElement('div');
            newView.id = 'capacity-view';
            newView.className = 'view-section';
            mainContent.appendChild(newView);
        } else return;
    }

    const capacity = UPDATE_DATA.metadata?.capacity || {};
    const teamMembers = capacity.teamMembers || [];
    const sprints = UPDATE_DATA.metadata?.sprints || [];
    const activeSprint = sprints.find(s => s.status === 'active');

    // Calculate workload per person
    const workload = calculateWorkload(teamMembers, activeSprint);

    container.innerHTML = `
        <div class="space-y-6">
            <!-- Unified Pulse Ribbon -->
            <div id="capacity-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <!-- Group 1: Navigation/Breadcrumb -->
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">📊</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Review / Team Capacity</span>
                        <h2 class="text-sm font-black text-slate-800">Resource & Load Balance</h2>
                    </div>
                </div>

                <!-- Group 2: Actions -->
                <div class="flex items-center gap-2">
                    <div id="capacity-next-action-mount">
                        ${(typeof renderPrimaryStageAction === 'function') ? renderPrimaryStageAction('capacity') : ''}
                    </div>
                </div>
            </div>

            <!-- Capacity Overview -->
            <div class="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
                <h2 class="text-2xl font-bold text-slate-900 mb-4">Team Capacity Overview</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="p-4 bg-blue-50 rounded-lg">
                        <div class="text-sm font-bold text-slate-500 uppercase">Total Capacity</div>
                        <div class="text-3xl font-black text-slate-900 mt-1">${capacity.totalCapacity || 0}</div>
                        <div class="text-xs text-slate-600 mt-1">points/sprint</div>
                    </div>
                    <div class="p-4 bg-green-50 rounded-lg">
                        <div class="text-sm font-bold text-slate-500 uppercase">Planned</div>
                        <div class="text-3xl font-black text-slate-900 mt-1">${activeSprint?.plannedPoints || 0}</div>
                        <div class="text-xs text-slate-600 mt-1">current sprint</div>
                    </div>
                    <div class="p-4 bg-amber-50 rounded-lg">
                        <div class="text-sm font-bold text-slate-500 uppercase">Utilization</div>
                        <div class="text-3xl font-black text-slate-900 mt-1">${calculateUtilization(capacity.totalCapacity, activeSprint?.plannedPoints)}%</div>
                        <div class="text-xs text-slate-600 mt-1">capacity used</div>
                    </div>
                </div>
            </div>

            <!-- Team Member Workload -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 class="text-2xl font-bold text-slate-900 mb-4">Team Workload Distribution</h2>
                <div class="space-y-4">
                    ${teamMembers.map(member => renderMemberWorkload(member, workload[member.name])).join('')}
                </div>
            </div>

            <!-- Sprint Planning Helper -->
            ${renderSprintPlanningHelper(teamMembers, activeSprint)}
        </div>
    `;
}

function calculateWorkload(teamMembers, activeSprint) {
    const workload = {};

    teamMembers.forEach(member => {
        workload[member.name] = {
            capacity: member.capacity,
            assigned: 0,
            items: []
        };
    });

    // Calculate assigned work
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.sprintId === activeSprint?.id && item.contributors) {
                    const points = item.storyPoints || 0;
                    const contributors = item.contributors.length;

                    item.contributors.forEach(contributor => {
                        if (workload[contributor]) {
                            workload[contributor].assigned += points / contributors;
                            workload[contributor].items.push(item);
                        }
                    });
                }
            });
        });
    });

    return workload;
}

function renderMemberWorkload(member, workload) {
    if (!workload) return '';

    const utilization = Math.round((workload.assigned / workload.capacity) * 100);
    const isOverloaded = utilization > 100;
    const barColor = isOverloaded ? 'bg-red-500' : utilization > 80 ? 'bg-amber-500' : 'bg-green-500';

    return `
        <div class="p-4 border border-slate-200 rounded-lg">
            <div class="flex justify-between items-center mb-2">
                <div>
                    <div class="font-bold text-slate-900">${member.name}</div>
                    <div class="text-xs text-slate-500">${member.role} • ${member.track}</div>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold ${isOverloaded ? 'text-red-600' : 'text-slate-900'}">
                        ${Math.round(workload.assigned)} / ${workload.capacity} pts
                    </div>
                    <div class="text-xs text-slate-600">${utilization}% utilized</div>
                </div>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-3">
                <div class="${barColor} h-3 rounded-full transition-all" style="width: ${Math.min(utilization, 100)}%"></div>
            </div>
            ${isOverloaded ? '<div class="text-xs text-red-600 mt-2 font-bold">⚠️ Over capacity!</div>' : ''}
            <div class="text-xs text-slate-600 mt-2">${workload.items.length} items assigned</div>
        </div>
    `;
}

function renderSprintPlanningHelper(teamMembers, activeSprint) {
    const totalCapacity = teamMembers.reduce((sum, m) => sum + m.capacity, 0);
    const planned = activeSprint?.plannedPoints || 0;
    const remaining = totalCapacity - planned;

    return `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 class="text-2xl font-bold text-slate-900 mb-4">Sprint Planning Recommendations</h2>
            <div class="space-y-3">
                <div class="p-4 ${remaining > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-lg border">
                    <div class="font-bold ${remaining > 0 ? 'text-green-900' : 'text-red-900'}">
                        ${remaining > 0 ? '✅' : '⚠️'} Capacity Status
                    </div>
                    <div class="text-sm ${remaining > 0 ? 'text-green-800' : 'text-red-800'} mt-1">
                        ${remaining > 0
                            ? `You have ${remaining} points of capacity remaining for this sprint.`
                            : `Sprint is over capacity by ${Math.abs(remaining)} points.`
                        }
                    </div>
                </div>

                <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div class="font-bold text-blue-900">💡 Recommendations</div>
                    <ul class="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                        <li>Aim for 80-90% capacity utilization for sustainable pace</li>
                        <li>Balance workload across team members</li>
                        <li>Reserve 10-20% capacity for unplanned work</li>
                        ${remaining < 0 ? '<li class="font-bold">Consider moving items to next sprint</li>' : ''}
                    </ul>
                </div>
            </div>
        </div>
    `;
}

function calculateUtilization(totalCapacity, planned) {
    if (!totalCapacity || !planned) return 0;
    return Math.round((planned / totalCapacity) * 100);
}

// Export
window.renderCapacityView = renderCapacityView;
