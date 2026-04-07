// ========================================
// DEVELOPER FOCUS VIEW
// ========================================
// "My Tasks" view for developers - simplified, focused interface

function renderMyTasksView() {
    const container = document.getElementById('my-tasks-view');
    if (!container) {
        const mainContent = document.querySelector('#main-content');
        if (mainContent) {
            const newView = document.createElement('div');
            newView.id = 'my-tasks-view';
            newView.className = 'view-section';
            mainContent.appendChild(newView);
        } else return;
    }

    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

    if (!currentUser) {
        container.innerHTML = `
            <div class="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
                <div class="text-6xl mb-4">👤</div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">Select Your Name</h3>
                <p class="text-slate-600 mb-4">Choose your name to see your assigned tasks.</p>
                <button onclick="promptUserSelection()" class="cms-btn cms-btn-primary">
                    Select User
                </button>
            </div>
        `;
        return;
    }

    // Collect user's tasks
    const myTasks = {
        today: [],
        thisWeek: [],
        upcoming: [],
        blocked: []
    };

    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.contributors && item.contributors.includes(currentUser)) {
                    const task = { ...item, track: track.name, subtrack: subtrack.name };

                    if (task.blocker) {
                        myTasks.blocked.push(task);
                    } else if (task.due) {
                        const dueDate = new Date(task.due);
                        if (dueDate.toDateString() === today.toDateString()) {
                            myTasks.today.push(task);
                        } else if (dueDate <= weekFromNow) {
                            myTasks.thisWeek.push(task);
                        } else {
                            myTasks.upcoming.push(task);
                        }
                    } else if (task.status === 'now') {
                        myTasks.thisWeek.push(task);
                    } else {
                        myTasks.upcoming.push(task);
                    }
                }
            });
        });
    });

    const totalTasks = Object.values(myTasks).reduce((sum, arr) => sum + arr.length, 0);

    if (totalTasks === 0) {
        container.innerHTML = `
            <div class="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center max-w-lg mx-auto mt-12">
                <div class="text-6xl mb-4">🔍</div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">No tasks assigned to ${currentUser}</h3>
                <p class="text-slate-500 text-sm mb-6">You may not have any items yet, or your name might not match what's in the contributor list. Ask your PM to add <strong>${currentUser}</strong> to item contributors.</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="promptUserSelection()" class="cms-btn cms-btn-secondary">Change my name</button>
                    <button onclick="switchView('kanban')" class="cms-btn cms-btn-primary">View full Kanban</button>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="space-y-6">
            <!-- Unified Pulse Ribbon -->
            <div id="my-tasks-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <!-- Group 1: Navigation/Breadcrumb -->
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">✅</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-medium text-slate-400">Delivery / Personal Task Focus</span>
                        <h2 class="text-sm font-bold text-slate-800">My Tasks</h2>
                    </div>
                </div>

                <!-- Group 2: Actions -->
                <div class="flex items-center gap-2">
                    <div id="my-tasks-next-action-mount">
                        ${(typeof renderPrimaryStageAction === 'function') ? renderPrimaryStageAction('my-tasks') : ''}
                    </div>
                </div>
            </div>

            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-xl">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold">Welcome back, ${currentUser}! 👋</h1>
                        <p class="mt-2 text-blue-100">You have ${totalTasks} tasks across ${Object.keys(myTasks).length} categories</p>
                    </div>
                    <button onclick="promptUserSelection()" class="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors">
                        Change User
                    </button>
                </div>
            </div>

            <!-- Blocked Items (Priority) -->
            ${myTasks.blocked.length > 0 ? renderTaskSection('🚨 Blocked', myTasks.blocked, 'red') : ''}

            <!-- Today's Tasks -->
            ${myTasks.today.length > 0 ? renderTaskSection('📅 Due Today', myTasks.today, 'orange') : ''}

            <!-- This Week -->
            ${renderTaskSection('📆 This Week', myTasks.thisWeek, 'blue')}

            <!-- Upcoming -->
            ${renderTaskSection('🔮 Upcoming', myTasks.upcoming, 'slate')}

            <!-- Quick Actions -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 class="font-bold text-slate-900 mb-3">Quick Actions</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button onclick="switchView('kanban')" class="p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-center">
                        <div class="text-2xl mb-1">📊</div>
                        <div class="text-sm font-bold text-slate-900">Kanban</div>
                    </button>
                    <button onclick="switchView('dependency')" class="p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-center">
                        <div class="text-2xl mb-1">🕸️</div>
                        <div class="text-sm font-bold text-slate-900">Dependencies</div>
                    </button>
                    <button onclick="switchView('sprint')" class="p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-center">
                        <div class="text-2xl mb-1">🏃</div>
                        <div class="text-sm font-bold text-slate-900">Sprint</div>
                    </button>
                    <button onclick="switchView('workflow')" class="p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-center">
                        <div class="text-2xl mb-1">🛠️</div>
                        <div class="text-sm font-bold text-slate-900">Playbook</div>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderTaskSection(title, tasks, color) {
    if (tasks.length === 0) return '';

    const colorMap = {
        red: 'border-red-200 bg-red-50',
        orange: 'border-orange-200 bg-orange-50',
        blue: 'border-blue-200 bg-blue-50',
        slate: 'border-slate-200 bg-slate-50'
    };

    return `
        <div class="bg-white p-6 rounded-xl border ${colorMap[color]} shadow-sm">
            <h2 class="text-xl font-bold text-slate-900 mb-4">${title} (${tasks.length})</h2>
            <div class="space-y-3">
                ${tasks.map(task => renderDevTaskCard(task)).join('')}
            </div>
        </div>
    `;
}

function renderDevTaskCard(task) {
    const statusColors = {
        done: 'bg-green-500',
        now: 'bg-blue-500',
        next: 'bg-orange-500',
        later: 'bg-gray-500'
    };

    const statusColor = statusColors[task.status] || 'bg-gray-500';

    // Resolve Epic and OKR context for "why does this task matter?"
    const epics = UPDATE_DATA.metadata?.epics || [];
    const okrs = UPDATE_DATA.metadata?.okrs || [];
    const epic = task.epicId ? epics.find(e => e.id === task.epicId) : null;
    const okr = epic?.linkedOKR ? okrs.find(o => o.id === epic.linkedOKR) : null;
    const contextRow = epic ? `
        <div class="dev-task-context-row">
            <button onclick="switchView('epics')" class="dev-task-context-epic dev-task-context-link">📍 ${epic.name}</button>
            ${okr ? `<span class="dev-task-context-sep">→</span><span class="dev-task-context-okr">🎯 ${okr.objective.length > 60 ? okr.objective.substring(0, 60) + '…' : okr.objective}</span>` : ''}
        </div>
    ` : '';

    return `
        <div class="p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
            ${contextRow}
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <h3 class="font-bold text-slate-900">${task.text}</h3>
                    <div class="text-xs text-slate-500 mt-1">${task.track} • ${task.subtrack}</div>
                </div>
                <div class="flex items-center gap-2">
                    ${task.storyPoints ? `<span class="text-xs font-bold text-slate-500">${task.storyPoints} pts</span>` : ''}
                    <span class="${statusColor} w-3 h-3 rounded-full"></span>
                </div>
            </div>

            ${task.note ? `<p class="text-sm text-slate-600 mb-2">${task.note}</p>` : ''}

            <div class="flex justify-between items-center mt-3">
                <div class="flex gap-2">
                    ${task.due ? `<span class="text-xs px-2 py-1 bg-slate-100 rounded">📅 ${task.due}</span>` : ''}
                    ${task.priority ? `<span class="text-xs px-2 py-1 ${task.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100'} rounded">${task.priority}</span>` : ''}
                </div>
                <button onclick="openItemQuickView('${task.id}')" class="text-xs text-blue-600 hover:text-blue-800 font-bold">
                    View Details →
                </button>
            </div>

            ${task.blocker ? `<div class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800"><strong>🚨 Blocked:</strong> ${task.blockerNote || 'Dependencies not met'}</div>` : ''}
        </div>
    `;
}

// Export
window.renderMyTasksView = renderMyTasksView;
