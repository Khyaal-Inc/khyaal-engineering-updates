// ========================================
// KANBAN BOARD VIEW
// ========================================
// Drag-and-drop Kanban board with swimlanes

function renderKanbanView() {
    const container = document.getElementById('kanban-view');
    if (!container) return;

    const swimlane = document.getElementById('kanban-swimlane')?.value || 'none';

    // Collect all items with source context
    const items = [];
    UPDATE_DATA.tracks.forEach((track, ti) => {
        track.subtracks.forEach((subtrack, si) => {
            subtrack.items.forEach((item, ii) => {
                items.push({ ...item, track: track.name, trackIndex: ti, subtrackIndex: si, itemIndex: ii });
            });
        });
    });

    // Filter by mode
    const modeFilter = typeof getModeFilter === 'function' ? getModeFilter() : null;
    const filteredItems = modeFilter ? items.filter(modeFilter) : items;

    // Status columns definition
    const statusCols = [
        { key: 'backlog', title: 'Backlog', status: 'later', color: 'border-slate-200 bg-slate-50/30' },
        { key: 'now', title: 'Now', status: 'now', color: 'border-blue-100 bg-blue-50/20' },
        { key: 'next', title: 'Next', status: 'next', color: 'border-orange-100 bg-orange-50/20' },
        { key: 'done', title: 'Done', status: 'done', color: 'border-emerald-100 bg-emerald-50/20' }
    ];

    // Grouping logic
    let swimlaneGroups = [];
    if (swimlane === 'epic') {
        const epics = UPDATE_DATA.metadata?.epics || [];
        const groupsMap = { 'unassigned': { id: 'unassigned', title: 'No Epic Alignment', items: [] } };
        epics.forEach(e => groupsMap[e.id] = { id: e.id, title: e.name, items: [] });
        filteredItems.forEach(item => {
            const gid = item.epicId || 'unassigned';
            if (groupsMap[gid]) groupsMap[gid].items.push(item);
        });
        swimlaneGroups = Object.values(groupsMap).filter(g => g.items.length > 0 || g.id !== 'unassigned');
    } else if (swimlane === 'track') {
        UPDATE_DATA.tracks.forEach(t => swimlaneGroups.push({ id: t.name, title: t.name, items: [] }));
        filteredItems.forEach(item => {
            const group = swimlaneGroups.find(g => g.id === item.track);
            if (group) group.items.push(item);
        });
    } else if (swimlane === 'contributor') {
        const contribs = new Set();
        filteredItems.forEach(item => (item.contributors || ['Unassigned']).forEach(c => contribs.add(c)));
        Array.from(contribs).sort().forEach(c => swimlaneGroups.push({ id: c, title: c, items: [] }));
        filteredItems.forEach(item => {
            const itemContribs = item.contributors && item.contributors.length > 0 ? item.contributors : ['Unassigned'];
            itemContribs.forEach(c => {
                const group = swimlaneGroups.find(g => g.id === c);
                if (group) group.items.push(item);
            });
        });
    } else {
        swimlaneGroups = [{ id: 'all', title: '', items: filteredItems }];
    }

    // Render Kanban board
    container.innerHTML = `
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
            <div id="kanban-ribbon" class="bg-slate-50/50 p-3 rounded-2xl border border-slate-200 mb-8 flex flex-wrap items-center justify-between gap-6">
                <div class="flex items-center gap-4 px-2">
                    <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <span class="text-white text-xl">📋</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Execution Delivery</span>
                        <h2 class="text-base font-black text-slate-800">Unified Kanban</h2>
                    </div>
                </div>

                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <span class="text-[10px] font-black uppercase text-slate-400 px-3">Swimlanes:</span>
                        <select id="kanban-swimlane" onchange="renderKanbanView()" 
                            class="bg-slate-50 border-none rounded-lg px-4 py-1.5 text-xs font-black text-slate-700 focus:ring-0 cursor-pointer hover:bg-slate-100 transition-colors">
                            <option value="none" ${swimlane === 'none' ? 'selected' : ''}>None (Flat View)</option>
                            <option value="epic" ${swimlane === 'epic' ? 'selected' : ''}>By Strategic Epic</option>
                            <option value="track" ${swimlane === 'track' ? 'selected' : ''}>By Functional Track</option>
                            <option value="contributor" ${swimlane === 'contributor' ? 'selected' : ''}>By Contributor</option>
                        </select>
                    </div>
                    
                    <button onclick="openAddItemModal('kanban')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2">
                        <span>+</span> Quick Task
                    </button>
                </div>
            </div>

            <div class="kanban-board flex gap-8 overflow-x-auto pb-4 custom-scrollbar">
                ${swimlaneGroups.map(group => `
                    <div class="kanban-row">
                        ${group.title ? `
                            <div class="flex items-center gap-3 mb-4 px-2">
                                <div class="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                <h3 class="text-xs font-black uppercase tracking-widest text-slate-500">${group.title}</h3>
                                <div class="flex-1 h-[1px] bg-slate-100 ml-2"></div>
                            </div>
                        ` : ''}
                        
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                            ${statusCols.map(col => {
                                const columnItems = group.items.filter(i => (i.status || 'later') === col.status);
                                return `
                                    <div class="kanban-column ${col.color} rounded-2xl p-4 border border-dashed transition-all duration-300 flex flex-col max-h-[calc(100vh-220px)] min-w-[320px] shadow-sm"
                                         data-status="${col.status}"
                                         data-group-id="${group.id}"
                                         ondrop="handleKanbanDrop(event)"
                                         ondragover="handleKanbanDragOver(event)"
                                         ondragleave="handleKanbanDragLeave(event)">
                                        <div class="flex justify-between items-center mb-5 px-1 flex-shrink-0">
                                            <div class="flex items-center gap-2">
                                                <h4 class="text-[12px] font-black uppercase tracking-wider text-slate-900">${col.title}</h4>
                                                <span class="text-[10px] font-black bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">${columnItems.length}</span>
                                            </div>
                                        </div>
                                        <div class="space-y-4 kanban-cards flex-1 overflow-y-auto pr-1 min-h-[120px] custom-scrollbar">
                                            ${columnItems.map(item => renderKanbanCard(item)).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderKanbanCard(item) {
    const priorityColors = {
        high: 'border-l-red-600',
        medium: 'border-l-amber-600',
        low: 'border-l-slate-400'
    };

    const epics = UPDATE_DATA.metadata?.epics || [];
    const epic = item.epicId ? epics.find(e => e.id === item.epicId) : null;
    const epicBadge = epic ? `<div class="mt-2 text-[9px] font-black uppercase text-indigo-900 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200 truncate inline-block max-w-full shadow-sm">🚀 ${epic.name}</div>` : '';

    const priorityColor = priorityColors[item.priority] || 'border-l-slate-300';
    const storyPoints = item.storyPoints ? `<span class="bg-slate-100 text-[10px] font-bold text-slate-500 px-1.5 py-0.5 rounded-full">${item.storyPoints} pts</span>` : '';
    const contributors = item.contributors?.slice(0, 2).join(', ') || 'Unassigned';

    return `
        <div class="kanban-card bg-white p-4 rounded-xl border border-slate-200 border-l-[6px] ${priorityColor} shadow-[0_8px_30px_rgb(0,0,0,0.04),0_0_1px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_45px_rgb(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.15)] transition-all cursor-grab active:cursor-grabbing relative group"
             draggable="true"
             ondragstart="handleKanbanDragStart(event)"
             ondrop="handleKanbanDrop(event)"
             data-item-id="${item.id}"
             onclick="openItemEdit(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})">
            
            <div class="flex justify-between items-start mb-2.5">
                <span class="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">${item.track || 'No Track'}</span>
                ${storyPoints}
            </div>

            <h4 class="text-[13px] font-black text-slate-900 leading-snug mb-3 line-clamp-2 hover:text-indigo-600 transition-colors">${item.text}</h4>
            
            ${epicBadge}

            <div class="flex justify-between items-center text-[10px] text-slate-800 mt-4 pt-3 border-t border-slate-100">
                <div class="flex items-center gap-1.5 font-black">
                    <div class="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[9px] font-black text-white shadow-sm">
                        ${(item.contributors?.[0] || 'U').charAt(0)}
                    </div>
                    <span class="capitalize tracking-tight">${contributors}</span>
                </div>
                <div class="flex items-center gap-2">
                    ${item.blocker ? '<span class="text-[9px] font-black bg-red-100 text-red-800 px-2 py-0.5 rounded border border-red-200 shadow-sm animate-pulse">🛑 BLOCKED</span>' : 
                      (item.due ? `<span class="font-black text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">📅 ${item.due.split('-').slice(1).join('/')}</span>` : '')}
                </div>
            </div>
            
            <!-- Insertion indicator -->
            <div class="drop-indicator absolute -top-2 left-0 right-0 h-1 bg-indigo-500 rounded hidden"></div>
        </div>
    `;
}

// Drag and Drop handlers
let draggedItem = null;

function handleKanbanDragStart(event) {
    draggedItem = event.target.dataset.itemId;
    event.target.classList.add('opacity-40');
    event.dataTransfer.setData('text/plain', draggedItem);
}

function handleKanbanDragOver(event) {
    event.preventDefault();
    const target = event.currentTarget;
    
    if (target.classList.contains('kanban-column')) {
        target.classList.add('bg-indigo-50/40', 'border-indigo-400');
    } else if (target.classList.contains('kanban-card')) {
        const indicator = target.querySelector('.drop-indicator');
        if (indicator) indicator.classList.remove('hidden');
    }
}

function handleKanbanDragLeave(event) {
    const target = event.currentTarget;
    if (target.classList.contains('kanban-column')) {
        target.classList.remove('bg-indigo-50/40', 'border-indigo-400');
    } else if (target.classList.contains('kanban-card')) {
        const indicator = target.querySelector('.drop-indicator');
        if (indicator) indicator.classList.add('hidden');
    }
}

function handleKanbanDrop(event) {
    event.preventDefault();
    const dropTarget = event.currentTarget;
    const itemId = draggedItem || event.dataTransfer.getData('text/plain');

    // Reset styles
    document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('bg-indigo-50/40', 'border-indigo-400'));
    document.querySelectorAll('.drop-indicator').forEach(i => i.classList.add('hidden'));
    document.querySelectorAll('.kanban-card').forEach(c => c.classList.remove('opacity-40'));

    if (!itemId) return;

    const targetStatus = dropTarget.dataset.status; // Dropped on which column?
    const targetItemId = dropTarget.dataset.itemId; // Dropped on which card?

    // 1. Locate the dragged item in UPDATE_DATA
    let sourceLoc = null;
    UPDATE_DATA.tracks.forEach((t, ti) => {
        t.subtracks.forEach((s, si) => {
            const idx = s.items.findIndex(i => i.id === itemId);
            if (idx !== -1) sourceLoc = { ti, si, idx, item: s.items[idx] };
        });
    });

    if (!sourceLoc) return;

    // 2. Identify new status
    // If dropped on a card, it inherits that card's status
    let finalStatus = targetStatus;
    if (targetItemId) {
        let targetItem = null;
        UPDATE_DATA.tracks.forEach(track => {
            track.subtracks.forEach(subtrack => {
                const i = subtrack.items.find(it => it.id === targetItemId);
                if (i) targetItem = i;
            });
        });
        if (targetItem) finalStatus = targetItem.status || 'later';
    }

    if (!finalStatus) return;

    // 3. Update memory data
    const itemReference = sourceLoc.item;
    const oldStatus = itemReference.status || 'later';
    
    // Update status field
    itemReference.status = finalStatus;

    // Handle reordering / prioritization
    if (targetItemId && targetItemId !== itemId) {
        let targetLoc = null;
        UPDATE_DATA.tracks.forEach((t, ti) => {
            t.subtracks.forEach((s, si) => {
                const idx = s.items.findIndex(i => i.id === targetItemId);
                if (idx !== -1) targetLoc = { ti, si, idx };
            });
        });

        if (targetLoc) {
            // Remove from source subtrack
            UPDATE_DATA.tracks[sourceLoc.ti].subtracks[sourceLoc.si].items.splice(sourceLoc.idx, 1);
            
            // Insert into target subtrack at target index
            UPDATE_DATA.tracks[targetLoc.ti].subtracks[targetLoc.si].items.splice(targetLoc.idx, 0, itemReference);
            
            logChange('Prioritized Task', `${itemReference.text} moved relative to ${UPDATE_DATA.tracks[targetLoc.ti].subtracks[targetLoc.si].items[targetLoc.idx+1]?.text || 'target'}`);
        }
    } else if (finalStatus !== oldStatus) {
        logChange('Updated Status (Kanban)', `${itemReference.text}: ${oldStatus.toUpperCase()} ➔ ${finalStatus.toUpperCase()}`);
    }

    // 4. Synchronization and Refresh
    renderKanbanView();
    updateTabCounts();
    if (typeof renderBlockerStrip === 'function') renderBlockerStrip();
    
    showToast(`"${itemReference.text}" updated successfully`, 'success');
    draggedItem = null;
}

function openItemQuickView(itemId) {
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

    if (trackIndex === -1 || subtrackIndex === -1 || itemIndex === -1) return;
    if (typeof openItemEdit === 'function') openItemEdit(trackIndex, subtrackIndex, itemIndex);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container') || (() => {
        const c = document.createElement('div');
        c.id = 'toast-container';
        c.className = 'fixed bottom-8 right-8 z-[200] flex flex-col gap-3';
        document.body.appendChild(c);
        return c;
    })();

    const toast = document.createElement('div');
    toast.className = `px-6 py-4 rounded-2xl shadow-2xl ${
        type === 'success' ? 'bg-slate-900' : 'bg-red-600'
    } text-white text-sm font-black flex items-center gap-3 animate-slideInRight`;
    
    toast.innerHTML = `
        <span class="${type === 'success' ? 'text-emerald-400' : 'text-white'}">
            ${type === 'success' ? '✓' : '⚠'}
        </span>
        ${message}
    `;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.className += ' animate-slideOutRight';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Export
window.renderKanbanView = renderKanbanView;
window.openItemQuickView = openItemQuickView;
window.handleKanbanDrop = handleKanbanDrop;
window.handleKanbanDragStart = handleKanbanDragStart;
window.handleKanbanDragOver = handleKanbanDragOver;
window.handleKanbanDragLeave = handleKanbanDragLeave;
