// ========================================
// KANBAN BOARD VIEW
// ========================================
// Drag-and-drop Kanban board with swimlanes

function renderKanbanView() {
    const container = document.getElementById('kanban-view');
    if (!container) return;

    // Collect all items
    const items = [];
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                items.push({ ...item, track: track.name, subtrack: subtrack.name });
            });
        });
    });

    // Filter by mode
    const modeFilter = typeof getModeFilter === 'function' ? getModeFilter() : null;
    const filteredItems = modeFilter ? items.filter(modeFilter) : items;

    // Group by status
    const columns = {
        'backlog': { title: 'Backlog', status: 'later', items: [], color: 'bg-gray-50' },
        'next': { title: 'Next', status: 'next', items: [], color: 'bg-orange-50' },
        'now': { title: 'Now', status: 'now', items: [], color: 'bg-blue-50' },
        'ongoing': { title: 'Ongoing', status: 'ongoing', items: [], color: 'bg-amber-50' },
        'done': { title: 'Done', status: 'done', items: [], color: 'bg-emerald-50' }
    };

    filteredItems.forEach(item => {
        const status = item.status || 'later';
        const colKey = Object.keys(columns).find(k => columns[k].status === status) || 'backlog';
        columns[colKey].items.push(item);
    });

    // Render Kanban board
    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-slate-900">Kanban Board</h2>
                    <p class="text-slate-600 mt-1">${filteredItems.length} items across ${Object.keys(columns).length} columns</p>
                </div>
                <div class="flex gap-2">
                    <select id="kanban-swimlane" onchange="renderKanbanView()" class="cms-input text-sm py-2">
                        <option value="none">No Swimlanes</option>
                        <option value="epic">By Epic</option>
                        <option value="track">By Track</option>
                        <option value="contributor">By Contributor</option>
                    </select>
                </div>
            </div>

            <div class="kanban-board" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; min-height: 500px;">
                ${Object.entries(columns).map(([key, col]) => `
                    <div class="kanban-column ${col.color} rounded-lg p-4 border-2 border-slate-200"
                         data-status="${col.status}"
                         ondrop="handleKanbanDrop(event)"
                         ondragover="handleKanbanDragOver(event)">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-bold text-slate-900">${col.title}</h3>
                            <span class="bg-slate-900 text-white px-2 py-1 rounded-full text-xs font-bold">${col.items.length}</span>
                        </div>
                        <div class="space-y-3 kanban-cards" style="min-height: 400px;">
                            ${col.items.map(item => renderKanbanCard(item)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderKanbanCard(item) {
    const priorityColors = {
        high: 'border-l-red-500',
        medium: 'border-l-amber-500',
        low: 'border-l-slate-300'
    };

    const epics = UPDATE_DATA.metadata?.epics || [];
    const epic = item.epicId ? epics.find(e => e.id === item.epicId) : null;
    const epicBadge = epic ? `<div class="mt-2 text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 shadow-sm truncate inline-block max-w-full" title="Strategic Epic: ${epic.name}">🚀 ${epic.name}</div>` : '';

    const priorityColor = priorityColors[item.priority] || 'border-l-slate-300';
    const storyPoints = item.storyPoints ? `<span class="text-xs font-bold text-slate-500">${item.storyPoints} pts</span>` : '';
    const contributors = item.contributors?.slice(0, 2).join(', ') || 'Unassigned';

    return `
        <div class="kanban-card bg-white p-3 rounded-lg border-l-4 ${priorityColor} shadow-sm hover:shadow-md transition-shadow cursor-move"
             draggable="true"
             ondragstart="handleKanbanDragStart(event)"
             data-item-id="${item.id}"
             onclick="openItemQuickView('${item.id}')">
            <div class="flex justify-between items-start mb-2">
                <span class="text-xs font-bold text-slate-400 uppercase">${item.track || 'No Track'}</span>
                ${storyPoints}
            </div>
            <p class="text-sm font-semibold text-slate-900 mb-1 line-clamp-2">${item.text}</p>
            ${epicBadge}
            <div class="flex justify-between items-center text-xs text-slate-600 mt-3 pt-2 border-t border-slate-50">
                <span>👤 ${contributors}</span>
                ${item.blocker ? '<span class="text-red-600 font-bold animate-pulse">🚨 BLOCKED</span>' : ''}
            </div>
            ${item.due ? `<div class="text-[10px] text-slate-400 mt-2 font-medium">📅 Due: ${item.due}</div>` : ''}
        </div>
    `;
}

// Drag and Drop handlers
let draggedItem = null;

function handleKanbanDragStart(event) {
    draggedItem = event.target.dataset.itemId;
    event.target.style.opacity = '0.5';
}

function handleKanbanDragOver(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#3b82f6';
    event.currentTarget.style.borderWidth = '3px';
}

function handleKanbanDrop(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '';
    event.currentTarget.style.borderWidth = '2px';

    if (!draggedItem) return;

    const newStatus = event.currentTarget.dataset.status;
    const itemId = draggedItem;

    // Find and update the item
    let updated = false;
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            const item = subtrack.items.find(i => i.id === itemId);
            if (item) {
                item.status = newStatus;
                updated = true;
            }
        });
    });

    if (updated) {
        // Re-render the board
        renderKanbanView();

        // Show success message
        showToast(`Item moved to ${newStatus}`, 'success');
    }

    draggedItem = null;
}

function openItemQuickView(itemId) {
    // Find the item and its indices
    let trackIndex = -1;
    let subtrackIndex = -1;
    let itemIndex = -1;

    UPDATE_DATA.tracks.forEach((track, ti) => {
        track.subtracks.forEach((subtrack, si) => {
            const foundIndex = subtrack.items.findIndex(i => i.id === itemId);
            if (foundIndex !== -1) {
                trackIndex = ti;
                subtrackIndex = si;
                itemIndex = foundIndex;
            }
        });
    });

    if (trackIndex === -1 || subtrackIndex === -1 || itemIndex === -1) {
        console.error(`Item with id "${itemId}" not found`);
        return;
    }

    // Open edit modal using the correct function from cms.js
    if (typeof openItemEdit === 'function') {
        openItemEdit(trackIndex, subtrackIndex, itemIndex);
    } else {
        console.error('openItemEdit function not found');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    } text-white font-semibold`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Export
window.renderKanbanView = renderKanbanView;
window.openItemQuickView = openItemQuickView;
