// ========================================
// KANBAN BOARD VIEW
// ========================================
// Drag-and-drop Kanban board with swimlanes

window.kanbanMyItemsOnly = sessionStorage.getItem('khyaal_kanban_my_items') === 'true'

function toggleKanbanMyItems() {
    window.kanbanMyItemsOnly = !window.kanbanMyItemsOnly
    sessionStorage.setItem('khyaal_kanban_my_items', window.kanbanMyItemsOnly)
    renderKanbanView()
}
window.toggleKanbanMyItems = toggleKanbanMyItems

function renderKanbanView() {
    const container = document.getElementById('kanban-view');
    if (!container) return;

    const swimlane = document.getElementById('kanban-swimlane')?.value || 'none';
    const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm';

    // Collect all items with source context
    const items = [];
    UPDATE_DATA.tracks.forEach((track, ti) => {
        track.subtracks.forEach((subtrack, si) => {
            subtrack.items.forEach((item, ii) => {
                items.push({ ...item, track: track.name, trackIndex: ti, subtrackIndex: si, itemIndex: ii });
            });
        });
    });

    // Filter by mode — in dev mode, optionally filter to current user only
    const modeFilter = typeof getModeFilter === 'function' ? getModeFilter() : null;
    const myItemsActive = mode === 'dev' && window.kanbanMyItemsOnly
    // When myItemsActive: always apply modeFilter (user's items only)
    // When not active in dev mode: no automatic filter (show all items on kanban)
    const filteredItems = myItemsActive && modeFilter
        ? items.filter(modeFilter)
        : items

    // Status columns definition: Full Engineering & Product Lifecycle
    const statusCols = [
        { key: 'backlog', title: 'Backlog (Later)', status: 'later', color: 'border-slate-200 bg-slate-50/20' },
        { key: 'planned', title: 'Planned (Next)', status: 'next', color: 'border-orange-200 bg-orange-50/20' },
        { key: 'developing', title: 'Developing (Now)', status: 'now', color: 'border-blue-200 bg-blue-50/30' },
        { key: 'testing', title: 'Testing (QA)', status: 'qa', color: 'border-purple-200 bg-purple-50/20' },
        { key: 'review', title: 'In Review (UAT)', status: 'review', color: 'border-indigo-200 bg-indigo-50/20' },
        { key: 'blocked', title: 'Blocked (Urgent)', status: 'blocked', color: 'border-red-200 bg-red-50/30' },
        { key: 'onhold', title: 'On Hold (Parked)', status: 'onhold', color: 'border-amber-200 bg-amber-50/30' },
        { key: 'done', title: 'Production (Done)', status: 'done', color: 'border-emerald-200 bg-emerald-50/30' }
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

    // Calculate dynamic height based on swimlane mode (Hardware-guaranteed style)
    const isFlatView = swimlane === 'none';
    const columnMaxHeight = isFlatView ? 'calc(100vh - 120px)' : '650px';
    const columnHeightClass = isFlatView ? '' : 'h-fit';

    // Render Kanban board
    container.innerHTML = `
        <div class="bg-white p-3 rounded-3xl border border-slate-200 shadow-xl">
        <div style="position:relative;margin-bottom:24px;">
            <div id="kanban-ribbon" class="bg-slate-50/50 p-2 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-6">
                <div class="flex items-center gap-2 px-2">
                    <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <span class="text-white text-xl">📋</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-medium text-slate-400">Stage 4 · Build — Drag cards to update live status</span>
                        <h2 class="text-base font-bold text-slate-800">Unified Kanban</h2>
                    </div>
                    ${typeof renderInfoButton === 'function' ? renderInfoButton('kanban') : ''}
                </div>

                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <span class="text-[10px] font-medium text-slate-400 px-3">Swimlanes:</span>
                        <select id="kanban-swimlane" onchange="renderKanbanView()"
                            class="bg-slate-50 border-none rounded-lg px-4 py-1.5 text-xs font-medium text-slate-700 focus:ring-0 cursor-pointer hover:bg-slate-100 transition-colors">
                            <option value="none" ${swimlane === 'none' ? 'selected' : ''}>None (Flat View)</option>
                            <option value="epic" ${swimlane === 'epic' ? 'selected' : ''}>By Strategic Epic</option>
                            <option value="track" ${swimlane === 'track' ? 'selected' : ''}>By Functional Track</option>
                            <option value="contributor" ${swimlane === 'contributor' ? 'selected' : ''}>By Contributor</option>
                        </select>
                    </div>
                    
                    ${mode === 'dev' ? `
                    <button onclick="toggleKanbanMyItems()" class="kanban-my-items-toggle ${myItemsActive ? 'active' : ''}">
                        ${myItemsActive ? '👤 My Items' : '👥 All Items'}
                    </button>
                    ` : ''}

                    <div id="kanban-next-action-mount">
                        ${typeof renderPrimaryStageAction === 'function' ? renderPrimaryStageAction('kanban') : ''}
                    </div>

                    <button onclick="openAddItemModal('kanban')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2">
                        <span>+</span> Quick Task
                    </button>
                </div>
            </div>
            ${typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('kanban') : ''}

            ${filteredItems.length === 0 ? (typeof renderSmartEmptyState === 'function' ? renderSmartEmptyState('kanban') : '<div class="text-center py-20 text-slate-400">No items available</div>') : `
            <div class="kanban-board flex flex-col gap-12 overflow-x-auto pb-4 custom-scrollbar px-2">
                ${swimlaneGroups.map((group, groupIdx) => `
                    <div class="kanban-row ${groupIdx > 0 ? 'pt-2' : ''}">
                        ${group.title ? `
                            <div class="flex items-center gap-3 mb-4 px-2">
                                <span class="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full shadow-sm">
                                    ${group.title}
                                </span>
                                <div class="flex-1 h-[2px] bg-slate-200/60 ml-1 rounded-full"></div>
                            </div>
                        ` : ''}
                        
                        <div class="flex gap-6 min-w-max pr-4">
                            ${statusCols.map(col => {
                                const columnItems = group.items.filter(i => (i.status || 'later') === col.status);
                                return `
                                    <div class="kanban-column ${col.color} rounded-2xl p-2.5 border border-dashed transition-all duration-300 flex flex-col ${columnHeightClass} w-[310px] flex-shrink-0 shadow-sm"
                                         style="max-height: ${columnMaxHeight};"
                                         data-status="${col.status}"
                                         data-group-id="${group.id}"
                                         ondrop="handleKanbanDrop(event)"
                                         ondragover="handleKanbanDragOver(event)"
                                         ondragleave="handleKanbanDragLeave(event)">
                                        <div class="flex justify-between items-center mb-3 px-1 flex-shrink-0">
                                            <div class="flex items-center gap-1.5">
                                                <h4 class="text-xs font-semibold text-slate-700">${col.title}</h4>
                                                <span class="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">${columnItems.length}</span>
                                            </div>
                                        </div>
                                        <div class="space-y-3 kanban-cards flex-1 overflow-y-auto pr-1 min-h-[120px] custom-scrollbar">
                                            ${columnItems.map(item => renderKanbanCard(item)).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            `}
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
    const epicBadge = epic ? `<div class="mt-1 text-[8px] font-black uppercase text-indigo-900 bg-indigo-100/80 px-1.5 py-0.5 rounded border border-indigo-200 truncate inline-block max-w-full shadow-sm">🚀 ${epic.name}</div>` : '';

    const priorityColor = priorityColors[item.priority] || 'border-l-slate-300';
    const storyPoints = item.storyPoints ? `<span class="bg-slate-100 text-[10px] font-bold text-slate-500 px-1.5 py-0.5 rounded-full">${item.storyPoints} pts</span>` : '';
    const contributors = item.contributors?.slice(0, 2).join(', ') || 'Unassigned';

    return `
        <div class="kanban-card bg-white p-2 rounded-lg border border-slate-200 border-l-[6px] ${priorityColor} shadow-[0_12px_40px_rgba(0,0,0,0.12),0_0_1px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.15),0_0_1px_rgba(0,0,0,0.2)] transition-all cursor-grab active:cursor-grabbing relative group"
             draggable="true"
             ondragstart="handleKanbanDragStart(event)"
             ondrop="handleKanbanDrop(event)"
             data-item-id="${item.id}"
             onclick="openItemEdit(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})">
            
            <div class="flex justify-between items-start mb-1">
                <span class="text-[10px] font-medium text-slate-400">${item.track || 'No Track'}</span>
                ${storyPoints}
            </div>

            <h4 class="text-xs font-semibold text-slate-900 leading-tight mb-1 line-clamp-2 hover:text-indigo-600 transition-colors">${item.text}</h4>

            ${item.acceptanceCriteria ? `<div class="kanban-card-ac">${(Array.isArray(item.acceptanceCriteria) ? item.acceptanceCriteria[0] : String(item.acceptanceCriteria).split('\\n')[0]).substring(0, 80)}${String(item.acceptanceCriteria).length > 80 ? '…' : ''}</div>` : ''}

            ${epicBadge}

            ${item.mediaUrl ? `
                <div class="mt-2 text-[10px] font-medium text-indigo-500 hover:text-indigo-700">
                    <a href="${item.mediaUrl}" target="_blank" onclick="event.stopPropagation()">🔗 ${item.mediaUrl.match(/\\.(jpeg|jpg|gif|png|webp)$/i) ? 'View Media' : 'View Link'}</a>
                </div>
            ` : ''}

            <div class="flex justify-between items-center text-[10px] text-slate-600 mt-2 pt-1.5 border-t border-slate-100">
                <div class="flex items-center gap-1 font-medium">
                    <div class="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-semibold text-white">
                        ${(item.contributors?.[0] || 'U').charAt(0)}
                    </div>
                    <span class="capitalize">${contributors}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    ${item.blocker ? '<span class="text-[10px] font-medium bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200">🛑 Blocked</span>' : ''}
                    ${item.due ? `<span class="font-medium text-slate-500 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 text-[10px]">📅 ${item.due.split('-').slice(1).join('/')}</span>` : ''}
                </div>
            </div>
            
            <!-- Quick Actions (hover-reveal, CMS-gated, delivery-stage aware) -->
            ${typeof shouldShowManagement === 'function' && shouldShowManagement() ? `
            <div class="cms-controls-row flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-slate-100">
                <button onclick="event.stopPropagation(); openItemEdit(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})" class="item-action-btn edit">Edit</button>
                <button onclick="event.stopPropagation(); deleteItem(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex}, '${item.id}', 'kanban')" class="item-action-btn delete">Delete</button>
                <button onclick="event.stopPropagation(); toggleBlocker(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex}, '${item.id}', 'kanban')" class="item-action-btn ${item.blocker ? 'active' : 'neutral'}">${item.blocker ? '🔓 Unblock' : '🔒 Blocker'}</button>
            </div>` : ''}
            <div class="drop-indicator absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded hidden"></div>
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

    if (trackIndex !== -1 && typeof openItemEdit === 'function') {
        openItemEdit(trackIndex, subtrackIndex, itemIndex);
    }
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
