// ------ Rendering Helpers ------
function renderContributors(contributors) {
    return (contributors || []).map(name =>
        `<span class="contributor-tag ${contributorColors[name] || 'bg-gray-100 text-gray-600'}">${name}</span>`
    ).join('');
}

function renderDueDateBadge(item) {
    if (!item.due || ['next', 'later'].includes(item.status) || item.status === 'done') return '';
    const dueDate = new Date(item.due);
    if (isNaN(dueDate.getTime())) return `<span class="ml-2 inline-flex items-center gap-1 font-bold text-[10px] text-orange-700">(${item.due})</span>`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((dueDate - today) / 86400000);
    if (diffDays < 0) return `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase tracking-wider">&#9888; Overdue (${item.due})</span>`;
    if (diffDays <= 2) return `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-[10px] uppercase tracking-wider">&#128336; Due Soon (${item.due})</span>`;
    return `<span class="ml-2 inline-flex items-center gap-1 font-bold text-[10px] text-orange-700">(${item.due})</span>`;
}

const tagClasses = {
    'tech-debt': 'tag-tech-debt', 'bug': 'tag-bug', 'feature': 'tag-feature',
    'compliance': 'tag-compliance', 'customer': 'tag-customer'
};
function renderTagPills(tags) {
    if (!tags || !tags.length) return '';
    return tags.map(t => {
        const key = t.toLowerCase().replace(/\s+/g, '-');
        return `<span class="tag-pill ${tagClasses[key] || ''}">${t}</span>`;
    }).join(' ');
}

function renderCommentThread(comments, ti, si, ii) {
    if (!comments || comments.length === 0) return '<div class="text-slate-400 text-xs italic p-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">No discussion notes yet.</div>';
    
    return comments.map(c => {
        const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Legacy';
        return `
            <div class="comment-item bg-white p-3 rounded-lg border border-slate-100 shadow-sm mb-2 last:mb-0">
                <div class="flex items-center gap-2 mb-1.5">
                    <span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">${(c.author || 'P').charAt(0)}</span>
                    <span class="text-[11px] font-black text-slate-800 uppercase tracking-wider">${c.author || 'PM'}</span>
                    <span class="text-[10px] text-slate-400 font-medium">${dateStr}</span>
                    ${isAuthenticated ? `<button onclick="event.stopPropagation(); deleteComment(${ti},${si},${ii},'${c.id}')" class="ml-auto text-slate-300 hover:text-red-500 transition-colors">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>` : ''}
                </div>
                <div class="text-xs text-slate-600 leading-relaxed font-medium pl-8">
                    ${c.text}
                </div>
            </div>`;
    }).join('');
}

// ------ Track View ------
function renderTrackView() {
    const container = document.getElementById('track-view');
    let html = '';
    const activeTeam = getActiveTeam();

    UPDATE_DATA.tracks.forEach((track, trackIndex) => {
        if (activeTeam && activeTeam !== track.name) return;
        const accentColor = themeColors[track.theme] || '#0f172a';
        html += `<div class="track-card" style="border-color: ${accentColor}">`;
        html += `
            <div class="track-header" style="background: linear-gradient(135deg, ${accentColor} 0%, #1e293b 100%)">
                <div class="flex justify-between items-center w-full">
                    <span>${track.name}</span>
                    <div class="flex gap-2">
                        ${isAuthenticated ? `
                        <button onclick="addSubtrack(${trackIndex})" class="bg-white/10 hover:bg-white/20 p-1 rounded text-xs px-2 transition-colors font-bold">Add Subtrack</button>
                        <button onclick="openTrackEdit(${trackIndex})" class="bg-white/10 hover:bg-white/20 p-1 rounded text-xs px-2 transition-colors">Edit</button>
                        <button onclick="deleteTrack(${trackIndex})" class="bg-white/10 hover:bg-white/20 p-1 rounded text-xs px-2 transition-colors">Delete</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        track.subtracks.forEach((subtrack, subtrackIndex) => {
            const itemsInTag = subtrack.items.filter(isItemMatchingTagFilter);
            const activeItemsSub = itemsInTag.filter(i => i.status !== 'later');
            const totalActiveSub = activeItemsSub.length;
            const doneItemsSub = activeItemsSub.filter(i => i.status === 'done').length;
            const percent = totalActiveSub > 0 ? Math.round((doneItemsSub / totalActiveSub) * 100) : 0;
            const blockerCount = itemsInTag.filter(i => i.blocker).length;

            const iconId = `icon-${track.id || trackIndex}-${subtrackIndex}`;
            const collapsed = isSubtrackCollapsed(track.id || String(trackIndex), subtrack.name);
            const rotateClass = collapsed ? 'style="transform:rotate(-90deg)"' : '';

            html += `<div class="subtrack-section" data-track="${trackIndex}" data-sub="${subtrackIndex}"
                        ondragover="event.preventDefault(); this.classList.add('drag-over')"
                        ondragleave="this.classList.remove('drag-over')"
                        ondrop="handleDrop(event, ${trackIndex}, ${subtrackIndex}); this.classList.remove('drag-over')">`;
            html += `
                <div class="subtrack-title flex justify-between items-center px-4 py-3 mb-1 cursor-pointer transition-all duration-300 rounded-r-lg group/sub" 
                     onclick="toggleSubtrack('${track.id || trackIndex}', '${subtrack.name}', '${iconId}')"
                     style="border-left: 6px solid ${accentColor}; 
                            background: linear-gradient(to right, ${accentColor}18 ${percent}%, #f8fafc ${percent}%);
                            box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <span class="font-black text-slate-900 text-lg truncate">${subtrack.name}</span>
                        <span class="flex-shrink-0 text-[11px] font-black text-slate-600 bg-white/90 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm tracking-wider">${percent}%</span>
                        ${blockerCount > 0 ? `<span class="flex-shrink-0 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">&#128274; ${blockerCount} blocker${blockerCount > 1 ? 's' : ''}</span>` : ''}
                    </div>

                    <div class="flex gap-2 items-center flex-shrink-0">
                        ${isAuthenticated ? `
                        <div class="flex gap-1" onclick="event.stopPropagation()">
                            <button onclick="addItem(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md hover:bg-emerald-100 font-bold border border-emerald-100 shadow-sm transition-colors uppercase tracking-wider">Add Item</button>
                            <button onclick="openSubtrackEdit(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md hover:bg-blue-100 font-bold border border-blue-100 shadow-sm transition-colors uppercase tracking-wider">Edit</button>
                            <button onclick="deleteSubtrack(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-red-50 text-red-700 px-2.5 py-1.5 rounded-md hover:bg-red-100 font-bold border border-red-100 shadow-sm transition-colors uppercase tracking-wider">Delete</button>
                        </div>
                        ` : ''}
                        <span class="ml-2 text-slate-400">
                            <svg class="w-5 h-5 transition-transform duration-200" id="${iconId}" ${rotateClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </span>
                    </div>
                </div>
            `;

            html += `<div id="body-${iconId}" ${collapsed ? 'style="display:none"' : ''}>`;
            const statusOrder = { "done": 1, "ongoing": 2, "now": 3, "next": 4, "later": 5 };

            let items = itemsInTag.filter(item => isItemInDateRange(item) && isItemInSearch(item));
            const sortedItems = [...items].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
            
            if (sortedItems.length === 0) {
                html += `<div class="empty-subtrack">No items match current filters.</div>`;
            } else {
                sortedItems.forEach((item) => {
                    const originalIndex = subtrack.items.indexOf(item);
                    html += renderItem(item, subtrack.note, trackIndex, subtrackIndex, originalIndex);
                });
            }

            if (isAuthenticated) {
                html += `
                    <div class="px-6 pb-4">
                        <button onclick="addItem(${trackIndex}, ${subtrackIndex})" class="cms-add-btn">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                            Add Item
                        </button>
                    </div>
                `;
            }
            html += `</div></div>`;
        });
        html += `</div>`;
    });
    container.innerHTML = html;
}

function toggleSubtrack(trackId, subtrackName, iconId) {
    const body = document.getElementById('body-' + iconId);
    const icon = document.getElementById(iconId);
    if (!body) return;
    const isNowCollapsed = body.style.display !== 'none';
    body.style.display = isNowCollapsed ? 'none' : '';
    if (icon) icon.style.transform = isNowCollapsed ? 'rotate(-90deg)' : '';
    setSubtrackCollapsed(trackId, subtrackName, isNowCollapsed);
}

function renderItem(item, subtrackNote, trackIndex, subtrackIndex, itemIndex) {
    const status = statusConfig[item.status];
    const priority = item.priority || 'medium';
    const priorityInfo = priorityConfig[priority];
    const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
    const usecaseRaw = item.usecase ? `<div class="usecase-box"><span class="font-bold">Impact:</span> ${item.usecase}</div>` : '';
    const usecase = highlightSearch(usecaseRaw);
    const due = renderDueDateBadge(item);
    const tags = renderTagPills(item.tags);
    const blockerStrip = item.blocker ? `<div class="blocker-strip"><span class="blocker-badge">&#128274; Blocker</span>${item.blockerNote || 'This item is flagged as a blocker'}</div>` : '';

    const displayText = highlightSearch(item.text);
    let contentHtml = `${displayText}${due}`;
    const effectiveNote = item.note || subtrackNote;

    if (effectiveNote) {
        let cleanNote = effectiveNote.replace(/<[^>]*>?/gm, '').replace('Note:', '').trim();
        cleanNote = highlightSearch(cleanNote);
        const idHTML = isAuthenticated ? `<div class="mt-2 pt-2 border-t border-slate-200 text-[0.65rem] font-mono text-slate-400">ID: ${item.id}</div>` : '';
        contentHtml = `
            <div class="info-wrapper">
                <span class="info-text">${displayText}${due}</span>
                <button class="info-btn" aria-label="More information">i</button>
                <div class="tooltip-content" role="tooltip">
                    <span class="block font-bold mb-1">${item.note ? 'Item Note:' : 'Subtrack Note:'}</span>
                    ${cleanNote}
                    ${idHTML}
                </div>
            </div>
        `;
    }

    let cmsControls = '';
    if (isAuthenticated) {
        cmsControls = `
            <div class="flex items-center gap-3 mt-1.5 flex-wrap">
                <span onclick="event.stopPropagation(); openItemEdit(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer font-bold underline underline-offset-2">Edit</span>
                <span onclick="event.stopPropagation(); deleteItem(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="text-[11px] text-red-600 hover:text-red-800 cursor-pointer font-bold underline underline-offset-2">Delete</span>
                <button onclick="event.stopPropagation(); sendToBacklog(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="send-to-backlog-btn">→ Backlog</button>
                <button onclick="event.stopPropagation(); toggleBlocker(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="send-to-backlog-btn ${item.blocker ? 'text-red-600 border-red-200 bg-red-50' : ''}">${item.blocker ? '&#128275; Unblock' : '&#128274; Flag Blocker'}</button>
            </div>
        `;
    }

    return `
        ${blockerStrip}
        <div class="item-row ${status.bucket}"
            draggable="${isAuthenticated ? 'true' : 'false'}"
            ondragstart="if(${isAuthenticated}){dragSource={trackIndex:${trackIndex},subtrackIndex:${subtrackIndex},itemIndex:${itemIndex}};this.classList.add('dragging');}"
            ondragend="this.classList.remove('dragging')">
            <div class="item-content">
                <div class="flex justify-between items-start w-full gap-4">
                    <div class="flex items-start gap-4 flex-1">
                        <div class="flex flex-col gap-1 items-center flex-shrink-0 mt-1">
                            <span class="status-pill ${status.class} text-[10px] py-0.5 w-full text-center min-w-[54px]">${status.label}</span>
                            <span class="status-pill ${priorityInfo.class} text-[9px] py-0 px-1 opacity-80 uppercase font-black tracking-tighter w-full text-center">${priorityLabel}</span>
                        </div>
                        <div class="text-sm text-slate-800 font-semibold leading-tight flex-1">
                            <div class="mb-1">${contentHtml}</div>
                            <div class="flex flex-wrap items-center gap-2 mb-1">
                                ${item.sprintId ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">🏃 ${(UPDATE_DATA.metadata.sprints || []).find(s => s.id === item.sprintId)?.name || item.sprintId}</span>` : ''}
                                ${item.releasedIn ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">📦 ${(UPDATE_DATA.metadata.releases || []).find(r => r.id === item.releasedIn)?.name || item.releasedIn}</span>` : ''}
                                ${tags ? `<div class="flex flex-wrap gap-1">${tags}</div>` : ''}
                            </div>
                            <div class="mb-2">${usecase}</div>
                            <div class="flex flex-wrap items-center gap-2">
                                <button id="comment-btn-${trackIndex}-${subtrackIndex}-${itemIndex}" onclick="event.stopPropagation(); toggleComments(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors">💬 ${(item.comments || []).length} Comments</button>
                                ${cmsControls ? `<div>${cmsControls}</div>` : ''}
                            </div>
                            <div id="comments-${trackIndex}-${subtrackIndex}-${itemIndex}" class="hidden w-full mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg" onclick="event.stopPropagation()">
                                <div id="thread-${trackIndex}-${subtrackIndex}-${itemIndex}" class="space-y-3 mb-3 max-h-48 overflow-y-auto pr-2">
                                    ${renderCommentThread(item.comments, trackIndex, subtrackIndex, itemIndex)}
                                </div>
                                ${isAuthenticated ? `
                                    <div class="flex gap-2 relative">
                                        <input type="text" id="comment-input-${trackIndex}-${subtrackIndex}-${itemIndex}" placeholder="Type @ to tag contributors..." class="cms-input flex-1 !mb-0 text-xs" onkeyup="if(event.key==='Enter') addComment(${trackIndex},${subtrackIndex},${itemIndex})">
                                        <button onclick="addComment(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="cms-btn cms-btn-primary !px-3 !py-1 flex-shrink-0 text-xs shadow-sm">Post</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex-shrink-0">
                        <div class="flex flex-wrap justify-end gap-1">
                            ${renderContributors(item.contributors)}
                        </div>
                    </div>
                </div>
                ${item.mediaUrl ? `
                    <div class="mt-2 group relative inline-block">
                        <a href="${item.mediaUrl}" target="_blank" onclick="event.stopPropagation()">
                            <img src="${item.mediaUrl}" class="h-10 w-16 object-cover rounded border border-slate-200 shadow-sm cursor-zoom-in hover:scale-105 transition-transform" 
                                 onerror="this.style.display='none'">
                        </a>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// ------ Status View ------
function renderStatusView() {
    const container = document.getElementById('status-view');
    const statuses = ['done', 'now', 'ongoing', 'next', 'later'];
    const statusTitles = { done: 'Done', now: 'Now', ongoing: 'On-Going', next: 'Next', later: 'Later' };

    let html = '';
    const activeTeam = getActiveTeam();

    statuses.forEach(status => {
        let items = [];
        UPDATE_DATA.tracks.forEach((track, trackIndex) => {
            if (activeTeam && activeTeam !== track.name) return;
            track.subtracks.forEach((subtrack, subtrackIndex) => {
                subtrack.items.forEach((item, itemIndex) => {
                    if (item.status === status && isItemMatchingTagFilter(item) && isItemInDateRange(item) && isItemInSearch(item)) {
                        items.push({ ...item, track: track.name, trackTheme: track.theme, subtrack: subtrack.name, trackIndex, subtrackIndex, itemIndex });
                    }
                });
            });
        });

        if (items.length > 0) {
            const config = statusConfig[status];
            html += `
                <div class="status-card">
                    <div class="${config.class} text-white px-6 py-4 font-bold flex items-center gap-3 text-lg status-sticky-header">
                        ${statusTitles[status]}
                        <span class="ml-auto text-sm font-normal opacity-90">${items.length} items</span>
                    </div>
                    <div class="p-1">
            `;
            items.forEach(item => {
                const trackColor = themeColors[item.trackTheme] || '#64748b';
                html += `
                    <div class="item-row hover:bg-slate-50 transition-colors">
                        <div class="flex-1">
                            <span style="color: ${trackColor}; background: ${trackColor}10;" class="px-2 py-0.5 rounded-md font-bold text-[0.65rem] uppercase tracking-wider inline-block mb-1.5 border border-slate-200">
                                ${item.track} &rarr; ${item.subtrack}
                            </span>
                            ${renderItem(item, '', item.trackIndex, item.subtrackIndex, item.itemIndex)}
                        </div>
                    </div>`;
            });
            html += `</div></div>`;
        }
    });
    container.innerHTML = html;
}

// ------ Priority View ------
function renderPriorityView() {
    const container = document.getElementById('priority-view');
    const priorities = ['high', 'medium', 'low'];
    const priorityTitles = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };

    let html = '';
    const activeTeam = getActiveTeam();

    priorities.forEach(priority => {
        let items = [];
        UPDATE_DATA.tracks.forEach((track, trackIndex) => {
            if (activeTeam && activeTeam !== track.name) return;
            track.subtracks.forEach((subtrack, subtrackIndex) => {
                subtrack.items.forEach((item, itemIndex) => {
                    const itemPriority = item.priority || 'medium';
                    if (itemPriority === priority && isItemMatchingTagFilter(item) && isItemInDateRange(item) && isItemInSearch(item)) {
                        items.push({ ...item, track: track.name, trackTheme: track.theme, subtrack: subtrack.name, trackIndex, subtrackIndex, itemIndex });
                    }
                });
            });
        });

        if (items.length > 0) {
            const config = priorityConfig[priority];
            html += `
                <div class="status-card">
                    <div class="${config.class} px-6 py-4 font-bold flex items-center gap-3 text-lg status-sticky-header">
                        ${priorityTitles[priority]}
                        <span class="ml-auto text-sm font-normal opacity-70">${items.length} items</span>
                    </div>
                    <div>
            `;
            items.forEach(item => {
                const trackColor = themeColors[item.trackTheme] || '#64748b';
                html += `
                    <div class="item-row hover:bg-slate-50 transition-colors">
                        <span style="color: ${trackColor}; background: ${trackColor}10;" class="px-2 py-0.5 rounded-md font-bold text-[0.65rem] uppercase tracking-wider inline-block mb-1.5 border border-slate-200">
                            ${item.track} &rarr; ${item.subtrack}
                        </span>
                        ${renderItem(item, '', item.trackIndex, item.subtrackIndex, item.itemIndex)}
                    </div>`;
            });
            html += `</div></div>`;
        }
    });
    container.innerHTML = html;
}

// ------ Contributor View ------
function renderContributorView() {
    const container = document.getElementById('contributor-view');
    const contributors = {};
    const activeTeam = getActiveTeam();

    UPDATE_DATA.tracks.forEach((track, ti) => {
        if (activeTeam && activeTeam !== track.name) return;
        track.subtracks.forEach((subtrack, si) => {
            subtrack.items.forEach((item, ii) => {
                if (!isItemMatchingTagFilter(item) || !isItemInDateRange(item) || !isItemInSearch(item)) return;
                (item.contributors || []).forEach(name => {
                    if (!contributors[name]) contributors[name] = [];
                    contributors[name].push({ ...item, trackName: track.name, trackTheme: track.theme, trackIndex: ti, subtrackIndex: si, itemIndex: ii });
                });
            });
        });
    });

    const sortedNames = Object.keys(contributors).sort((a,b) => contributors[b].length - contributors[a].length);
    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';
    
    if (sortedNames.length === 0) {
        container.innerHTML = '<div class="text-center py-20 text-slate-400">No contributors found for current filters.</div>';
        return;
    }

    sortedNames.forEach(name => {
        const items = contributors[name];
        const statusOrder = ['done', 'now', 'ongoing', 'next', 'later'];
        const colorClass = contributorColors[name] || 'bg-slate-600';
        const textColor = contributorColors[name] ? '' : 'text-white';
        
        html += `
            <div class="contributor-compact-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div class="${colorClass} ${textColor} px-4 py-2.5 font-black text-sm flex items-center justify-between border-b">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">${name.charAt(0)}</div>
                        ${name}
                    </div>
                    <span class="text-[10px] bg-white/10 px-1.5 py-0.5 rounded opacity-80 uppercase tracking-widest">${items.length} tasks</span>
                </div>
                <div class="p-2 space-y-3 bg-slate-50/30">`;
        
        statusOrder.forEach(status => {
            const statusItems = items.filter(i => i.status === status);
            if (statusItems.length === 0) return;

            const statusCfg = statusConfig[status] || { icon: '•', color: '#64748b' };
            html += `
                <div class="status-group mb-2 last:mb-0">
                    <div class="text-[9px] font-black uppercase tracking-widest mb-2 px-2 py-0.5 flex items-center gap-2 w-fit -ml-2 border-l-4 rounded-r" style="color: ${statusCfg.color}; background: ${statusCfg.color}10; border-color: ${statusCfg.color};">
                        ${status}
                    </div>
                    <div class="space-y-0.5 px-1">
                        ${statusItems.map(item => `
                            <div oncontextmenu="window.currentContextItem={ti:${item.trackIndex},si:${item.subtrackIndex},ii:${item.itemIndex}}; return false;" class="group relative flex items-center gap-2 p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white transition-all cursor-pointer" onclick="openItemEdit(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})">
                                <div class="flex-1 text-[11px] font-medium text-slate-600 group-hover:text-slate-900 truncate" title="${item.text}">
                                    ${highlightSearch(item.text)}
                                </div>
                                ${item.priority === 'high' ? '<span class="text-[8px] text-red-500 font-black" title="High Priority">!</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        });
        html += `</div></div>`;
    });
    container.innerHTML = html + '</div>';
}

// ------ Backlog View ------
let groomingMode = false;
function toggleGroomingMode() {
    groomingMode = !groomingMode;
    renderBacklogView();
}

function renderBacklogView() {
    const container = document.getElementById('backlog-view');
    let html = '';
    if (isAuthenticated) {
        html += `
            <div class="flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl mb-6 shadow-lg">
                <div>
                    <h2 class="text-xl font-bold">🗂️ Backlog Management</h2>
                    <p class="text-slate-400 text-xs">Items in "Backlog" subtracks</p>
                </div>
                <button onclick="toggleGroomingMode()" class="px-4 py-2 rounded-lg font-bold text-sm bg-slate-700 hover:bg-slate-600">
                    ${groomingMode ? '✅ Exit Grooming' : '🔧 Grooming Mode'}
                </button>
            </div>
        `;
    }

    let totalItems = 0;
    const activeTeam = getActiveTeam();
    UPDATE_DATA.tracks.forEach((track, trackIndex) => {
        if (activeTeam && activeTeam !== track.name) return;
        const backlogSub = track.subtracks.find(s => s.name === 'Backlog');
        if (!backlogSub || !backlogSub.items.length) return;
        totalItems += backlogSub.items.length;

        html += `<div class="backlog-track-card mb-6">
            <div class="track-header p-3 bg-slate-100 font-bold border-b">${track.name} Backlog</div>
            <div class="p-2 space-y-2">`;
        backlogSub.items.forEach((item, ii) => {
            const si = track.subtracks.indexOf(backlogSub);
            html += renderItem(item, '', trackIndex, si, ii);
        });
        html += `</div></div>`;
    });
    container.innerHTML = totalItems ? html : '<div class="text-center py-20 text-slate-400">Backlog is empty</div>';
}

// ------ Sprint View ------
function renderSprintView() {
    const container = document.getElementById('sprint-view');
    const sprints = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.sprints) || [];
    let html = isAuthenticated ? `<div class="mb-4 text-right"><button onclick="openSprintEdit()" class="filter-btn active">➕ Add Sprint</button></div>` : '';
    
    if (sprints.length === 0) {
        container.innerHTML = html + '<div class="text-center py-20 text-slate-400">No sprints defined</div>';
        return;
    }

    sprints.forEach(s => {
        const sprintItems = findItemsByMetadataId('sprintId', s.id);
        html += `
            <div class="sprint-card bg-white border rounded-xl overflow-hidden mb-8 shadow-sm">
                <div class="p-6 bg-slate-50 border-b">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-black text-2xl text-slate-900">${s.name}</div>
                            <div class="text-sm font-bold text-slate-500 mt-1">📅 ${s.start} - ${s.end}</div>
                        </div>
                        <div class="text-right">
                             <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</div>
                             <span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold uppercase tracking-wider">${sprintItems.length} Tasks</span>
                        </div>
                    </div>
                    <div class="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-600 italic">
                        <span class="font-bold text-slate-800 not-italic">Goal:</span> ${s.goal || 'No goal set for this sprint.'}
                    </div>
                </div>
                <div class="p-2 space-y-4">
                    ${renderGroupedItems(sprintItems)}
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

// ------ Releases View ------
function renderReleasesView() {
    const container = document.getElementById('releases-view');
    const releases = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.releases) || [];
    let html = isAuthenticated ? `<div class="mb-4 text-right"><button onclick="openReleaseEdit()" class="filter-btn active">➕ Add Release</button></div>` : '';
    
    if (releases.length === 0) {
        container.innerHTML = html + '<div class="text-center py-20 text-slate-400">No releases defined</div>';
        return;
    }

    releases.forEach(r => {
        const releaseItems = findItemsByMetadataId('releasedIn', r.id);
        html += `
            <div class="sprint-card bg-white border rounded-xl overflow-hidden mb-8 shadow-sm">
                <div class="p-6 bg-slate-50 border-b">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-black text-2xl text-slate-900">${r.name}</div>
                            <div class="text-sm font-bold text-slate-500 mt-1">🎯 Target: ${r.targetDate || 'TBD'}</div>
                        </div>
                        <div class="text-right">
                             <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Scope</div>
                             <span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold uppercase tracking-wider">${releaseItems.length} Tasks</span>
                        </div>
                    </div>
                </div>
                <div class="p-2 space-y-4">
                    ${renderGroupedItems(releaseItems)}
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

// ------ AGGREGATION HELPERS ------
function findItemsByMetadataId(key, value) {
    const found = [];
    UPDATE_DATA.tracks.forEach((track, ti) => {
        track.subtracks.forEach((subtrack, si) => {
            subtrack.items.forEach((item, ii) => {
                if (item[key] === value) {
                    found.push({ ...item, trackName: track.name, trackTheme: track.theme, trackIndex: ti, subtrackIndex: si, itemIndex: ii });
                }
            });
        });
    });
    return found;
}

function renderGroupedItems(items) {
    if (items.length === 0) return '<div class="text-center py-8 text-slate-400 italic text-sm">No items assigned yet.</div>';
    
    const grouped = {};
    items.forEach(i => {
        if (!grouped[i.trackName]) grouped[i.trackName] = { theme: i.trackTheme, items: [] };
        grouped[i.trackName].items.push(i);
    });

    return Object.keys(grouped).map(trackName => {
        const group = grouped[trackName];
        const color = themeColors[group.theme] || '#1e293b';
        return `
            <div class="mb-4 last:mb-0">
                <div class="px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-white rounded-t-lg" style="background: ${color}">
                    ${trackName}
                </div>
                <div class="border border-t-0 p-1 rounded-b-lg space-y-1">
                    ${group.items.map(item => renderItem(item, '', item.trackIndex, item.subtrackIndex, item.itemIndex)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ------ Gantt View ------
function renderGanttView() {
    google.charts.load('current', { 'packages': ['gantt'] });
    google.charts.setOnLoadCallback(drawGanttChart);
}

function drawGanttChart() {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Task ID');
    data.addColumn('string', 'Task Name');
    data.addColumn('string', 'Resource');
    data.addColumn('date', 'Start Date');
    data.addColumn('date', 'End Date');
    data.addColumn('number', 'Duration');
    data.addColumn('number', 'Percent Complete');
    data.addColumn('string', 'Dependencies');

    const rows = [];
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (!item.startDate || !item.due) return;
                rows.push([item.id, item.text, track.name, new Date(item.startDate), new Date(item.due), null, item.status === 'done' ? 100 : 0, null]);
            });
        });
    });

    if (!rows.length) {
        document.getElementById('gantt-chart-container').innerHTML = '<div class="p-10 text-center text-slate-400">No tasks with dates for Gantt chart</div>';
        return;
    }

    data.addRows(rows);
    const options = { height: rows.length * 40 + 50, gantt: { trackHeight: 40 } };
    const chart = new google.visualization.Gantt(document.getElementById('gantt-chart-container'));

    google.visualization.events.addListener(chart, 'select', function () {
        const selection = chart.getSelection();
        if (selection.length > 0) {
            const row = selection[0].row;
            const taskId = data.getValue(row, 0);
            UPDATE_DATA.tracks.forEach((t, ti) => {
                t.subtracks.forEach((s, si) => {
                    const ii = s.items.findIndex(item => item.id === taskId);
                    if (ii !== -1) openItemEdit(ti, si, ii);
                });
            });
        }
    });

    chart.draw(data, options);
}
