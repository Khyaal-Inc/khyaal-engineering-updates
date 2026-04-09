// ========================================
// DEVELOPER FOCUS VIEW — My Tasks
// ========================================
// Sprint-grouped personal task view with quick-mark-done and OKR context.

// ---- Data helpers ----

/**
 * Returns all items assigned to `name`, enriched with track/subtrack/item indices.
 */
function collectMyItems(name) {
    const items = []
    ;(UPDATE_DATA.tracks || []).forEach((track, ti) => {
        track.subtracks.forEach((subtrack, si) => {
            subtrack.items.forEach((item, ii) => {
                if (!(item.contributors || []).includes(name)) return
                items.push({ ...item, trackIndex: ti, subtrackIndex: si, itemIndex: ii, trackName: track.name })
            })
        })
    })
    return items
}

/**
 * Buckets items into sprint-aware groups.
 * Sections: blocked → active sprint → up next (next sprint / backlog) → rest
 */
function bucketMyItems(items) {
    const sprints    = UPDATE_DATA.metadata?.sprints || []
    const active     = sprints.find(s => s.status === 'active')
    const nextSprint = sprints.find(s => s.status !== 'active' && s.status !== 'completed' && s.status !== 'closed')

    const blocked     = []
    const thisSprint  = []
    const upNext      = []
    const rest        = []

    items.forEach(item => {
        if (item.status === 'blocked' || item.blocker) {
            blocked.push(item)
        } else if (active && item.sprintId === active.id) {
            thisSprint.push(item)
        } else if (nextSprint && item.sprintId === nextSprint.id) {
            upNext.push(item)
        } else if (!item.sprintId && (item.status === 'next' || item.status === 'later')) {
            upNext.push(item)
        } else {
            rest.push(item)
        }
    })

    return { blocked, thisSprint, upNext, rest, active, nextSprint }
}

/**
 * Resolves epic → OKR chain for a task and returns context metadata.
 * Returns null if no epic is linked.
 */
function resolveTaskOKRContext(item) {
    const epics = UPDATE_DATA.metadata?.epics || []
    const okrs  = UPDATE_DATA.metadata?.okrs  || []

    const epic = item.epicId ? epics.find(e => e.id === item.epicId) : null
    if (!epic) return null

    const okr = epic.linkedOKR ? okrs.find(o => o.id === epic.linkedOKR) : null

    // What % of the OKR's total items does this task represent?
    let okrItemCount = 0
    if (okr) {
        const epicIds = new Set(epics.filter(e => e.linkedOKR === okr.id).map(e => e.id))
        ;(UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(st => st.items.forEach(i => {
            if (epicIds.has(i.epicId)) okrItemCount++
        })))
    }

    return { epic, okr, okrItemCount }
}

// ---- Quick-mark-done ----

/**
 * Cycles item status: now → done, next → now, later → now.
 * Writes to localStorage silently; re-renders the view.
 * Called from inline onclick — must be on window.
 */
function quickCycleStatus(ti, si, ii) {
    const item = UPDATE_DATA.tracks[ti].subtracks[si].items[ii]
    const next = { now: 'done', next: 'now', later: 'now', done: 'now' }
    item.status = next[item.status] || 'now'
    item.updatedAt = new Date().toISOString()
    logChange('quick-status', item.text)
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage()
    renderMyTasksView()
}
window.quickCycleStatus = quickCycleStatus

// ---- HTML builders ----

function buildMyTaskCard(item, canEdit) {
    const ctx    = resolveTaskOKRContext(item)
    const today  = new Date(); today.setHours(0, 0, 0, 0)
    const dueDate = item.due ? new Date(item.due) : null
    const isOverdue = dueDate && dueDate < today && item.status !== 'done'
    const isDueToday = dueDate && dueDate.toDateString() === today.toDateString() && item.status !== 'done'

    const statusBadgeClass = (typeof statusConfig !== 'undefined' && statusConfig[item.status]?.class) || 'bg-slate-100 text-slate-600'
    const borderAccent = item.status === 'blocked' || item.blocker
        ? 'border-l-4 border-rose-500'
        : isOverdue
            ? 'border-l-4 border-orange-400'
            : isDueToday
                ? 'border-l-4 border-amber-400'
                : item.status === 'done'
                    ? 'border-l-4 border-emerald-400 opacity-70'
                    : 'border-l-4 border-slate-200'

    // Quick-mark button label: cycle the status one step
    const cycleLabel = { now: 'Mark done ✓', next: 'Start →', later: 'Start →', done: 'Reopen ↩' }
    const cycleClass = item.status === 'done'
        ? 'text-slate-400 hover:text-slate-600'
        : item.status === 'now'
            ? 'text-emerald-600 hover:text-emerald-800 font-black'
            : 'text-indigo-600 hover:text-indigo-800'

    const editHandler = canEdit
        ? `openItemEdit(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex}, '${item.id}')`
        : ''

    // OKR context strip
    const okrStrip = ctx ? `
        <div class="flex items-center gap-1.5 mb-2 flex-wrap">
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Context</span>
            <button onclick="switchView('epics')" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-1.5 py-0.5 rounded">
                📍 ${ctx.epic.name}
            </button>
            ${ctx.okr ? `
                <span class="text-slate-300">›</span>
                <span class="text-[10px] font-bold text-slate-500 truncate max-w-[200px]" title="${ctx.okr.objective}">
                    🎯 ${ctx.okr.objective.length > 50 ? ctx.okr.objective.substring(0, 50) + '…' : ctx.okr.objective}
                </span>
                ${ctx.okrItemCount > 0 ? `
                    <span class="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        1 of ${ctx.okrItemCount} tasks
                    </span>` : ''}
            ` : ''}
        </div>` : ''

    // Blocker alert
    const blockerAlert = (item.blocker || item.status === 'blocked') ? `
        <div class="mt-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-bold">
            ⛔ Blocked: ${item.blockerNote || 'Dependencies not met'}
        </div>` : ''

    // Due date badge
    let dueBadge = ''
    if (isOverdue) {
        dueBadge = `<span class="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">⚠ Overdue (${item.due})</span>`
    } else if (isDueToday) {
        dueBadge = `<span class="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">📅 Due today</span>`
    } else if (item.due && item.status !== 'done') {
        dueBadge = `<span class="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">${item.due}</span>`
    }

    return `
        <div class="my-tasks-card bg-white rounded-xl border border-slate-200 ${borderAccent} p-4 hover:shadow-md transition-shadow">
            ${okrStrip}
            <div class="flex items-start gap-3">
                <!-- Quick-mark button -->
                <button onclick="quickCycleStatus(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})"
                        class="${cycleClass} text-[10px] font-bold shrink-0 mt-0.5 transition-colors"
                        aria-label="${cycleLabel[item.status] || 'Change status'}">
                    ${item.status === 'done' ? '☑' : '☐'}
                </button>

                <div class="flex-1 min-w-0">
                    <!-- Title -->
                    <div class="flex items-start gap-2 mb-1.5">
                        <span class="text-sm font-bold text-slate-800 leading-snug flex-1 ${item.status === 'done' ? 'line-through text-slate-400' : ''}"
                              ${canEdit ? `onclick="${editHandler}" style="cursor:pointer"` : ''}>
                            ${item.text}
                        </span>
                        ${item.storyPoints ? `<span class="text-[10px] font-black text-slate-400 shrink-0 mt-0.5">${item.storyPoints}p</span>` : ''}
                    </div>

                    <!-- Meta row -->
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${statusBadgeClass}">
                            ${item.status}
                        </span>
                        ${item.priority === 'high' ? `<span class="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200">High priority</span>` : ''}
                        ${dueBadge}
                        <span class="text-[10px] text-slate-400">${item.trackName}</span>
                    </div>

                    ${blockerAlert}

                    ${item.note ? `<p class="text-xs text-slate-500 mt-2 leading-relaxed">${item.note}</p>` : ''}

                    <!-- Action row -->
                    ${canEdit ? `
                        <div class="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                            <button onclick="${editHandler}"
                                    class="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                                    aria-label="Edit task">
                                Edit details →
                            </button>
                            <button onclick="quickCycleStatus(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})"
                                    class="text-[10px] font-bold ${cycleClass} transition-colors">
                                ${cycleLabel[item.status] || 'Change status'}
                            </button>
                        </div>` : ''}
                </div>
            </div>
        </div>`
}

function buildMyTaskSection(label, items, canEdit, emptyMsg) {
    if (items.length === 0 && !emptyMsg) return ''
    return `
        <div class="my-tasks-section">
            <div class="flex items-center gap-3 mb-3">
                <h2 class="text-xs font-black uppercase tracking-widest text-slate-500">${label}</h2>
                ${items.length > 0 ? `<span class="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">${items.length}</span>` : ''}
            </div>
            ${items.length > 0
                ? `<div class="space-y-3">${items.map(item => buildMyTaskCard(item, canEdit)).join('')}</div>`
                : `<div class="text-xs text-slate-400 italic py-3 pl-1">${emptyMsg}</div>`}
        </div>`
}

function buildMyTasksSummaryBar(buckets, currentUser) {
    const { thisSprint, blocked, upNext, rest, active } = buckets
    const allMine = [...blocked, ...thisSprint, ...upNext, ...rest]
    const donePts = allMine.filter(i => i.status === 'done' && active && i.sprintId === active.id)
        .reduce((s, i) => s + (parseInt(i.storyPoints) || 0), 0)
    const totalPts = thisSprint.reduce((s, i) => s + (parseInt(i.storyPoints) || 0), 0)
    const pct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0
    const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'

    return `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-center gap-6">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-black text-indigo-700">
                    ${currentUser.charAt(0)}
                </div>
                <div>
                    <div class="text-sm font-black text-slate-800">${currentUser}</div>
                    <div class="text-[10px] text-slate-400">${allMine.length} total tasks</div>
                </div>
            </div>
            ${active ? `
                <div class="flex-1 min-w-[160px]">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">${active.name}</span>
                        <span class="text-[10px] font-black text-slate-700">${pct}%</span>
                    </div>
                    <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div class="${barColor} h-full rounded-full transition-all" style="width:${pct}%"></div>
                    </div>
                    <div class="text-[9px] text-slate-400 mt-1">${donePts}/${totalPts} pts done · ${thisSprint.length} items</div>
                </div>` : ''}
            <div class="flex items-center gap-4 text-center">
                ${blocked.length > 0 ? `<div><div class="text-lg font-black text-rose-600">${blocked.length}</div><div class="text-[9px] font-black text-slate-400 uppercase">Blocked</div></div>` : ''}
                <div><div class="text-lg font-black text-indigo-600">${thisSprint.length}</div><div class="text-[9px] font-black text-slate-400 uppercase">This Sprint</div></div>
                <div><div class="text-lg font-black text-slate-600">${upNext.length}</div><div class="text-[9px] font-black text-slate-400 uppercase">Up Next</div></div>
            </div>
            <button onclick="promptUserSelection()" class="ml-auto text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors" aria-label="Switch user">
                Switch user
            </button>
        </div>`
}

// ---- Main renderer ----

function renderMyTasksView() {
    const container = document.getElementById('my-tasks-view')
    if (!container) return

    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null
    const canEdit     = typeof shouldShowManagement === 'function' ? shouldShowManagement() : false

    const ribbon = `
        <div id="my-tasks-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">✅</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-medium text-slate-400">Build · Personal task focus${currentUser ? ` — ${currentUser}` : ''}</span>
                    <h2 class="text-sm font-bold text-slate-800">My Tasks</h2>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div id="my-tasks-next-action-mount">
                    ${typeof renderPrimaryStageAction === 'function' ? renderPrimaryStageAction('my-tasks') : ''}
                </div>
            </div>
        </div>`

    if (!currentUser) {
        container.innerHTML = ribbon + `
            <div class="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center max-w-lg mx-auto">
                <div class="text-5xl mb-4">👤</div>
                <h3 class="text-lg font-black text-slate-900 mb-2">Select your name</h3>
                <p class="text-slate-500 text-sm mb-6">Choose your name to see your assigned tasks and sprint progress.</p>
                <button onclick="promptUserSelection()" class="cms-btn cms-btn-primary">Select user</button>
            </div>`
        return
    }

    const allItems = collectMyItems(currentUser)

    if (allItems.length === 0) {
        container.innerHTML = ribbon + `
            <div class="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center max-w-lg mx-auto">
                <div class="text-5xl mb-4">🔍</div>
                <h3 class="text-lg font-black text-slate-900 mb-2">No tasks for ${currentUser}</h3>
                <p class="text-slate-500 text-sm mb-6">You may not have any items yet, or your contributor name may differ from what's in the data. Ask your PM to add <strong>${currentUser}</strong> to item contributors.</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="promptUserSelection()" class="cms-btn cms-btn-secondary">Change name</button>
                    <button onclick="switchView('kanban')" class="cms-btn cms-btn-primary">View Kanban</button>
                </div>
            </div>`
        return
    }

    const buckets = bucketMyItems(allItems)
    const { blocked, thisSprint, upNext, rest, active, nextSprint } = buckets

    const activeLabel = active ? `This Sprint — ${active.name}` : 'This Sprint'
    const nextLabel   = nextSprint ? `Up Next — ${nextSprint.name}` : 'Up Next / Backlog'

    container.innerHTML = `
        <div class="space-y-6">
            ${ribbon}
            ${buildMyTasksSummaryBar(buckets, currentUser)}
            ${buildMyTaskSection('🚨 Blocked', blocked, canEdit, '')}
            ${buildMyTaskSection(activeLabel, thisSprint, canEdit, 'No items assigned to you in the active sprint.')}
            ${buildMyTaskSection(nextLabel, upNext, canEdit, '')}
            ${buildMyTaskSection('Other', rest, canEdit, '')}

            <!-- Quick nav -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                ${[
                    { icon: '📋', label: 'Kanban', view: 'kanban' },
                    { icon: '🔗', label: 'Dependencies', view: 'dependency' },
                    { icon: '🏃', label: 'Sprint', view: 'sprint' },
                    { icon: '🛠️', label: 'Playbook', view: 'workflow' }
                ].map(({ icon, label, view }) => `
                    <button onclick="switchView('${view}')"
                            class="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-center"
                            aria-label="Go to ${label}">
                        <div class="text-2xl mb-1">${icon}</div>
                        <div class="text-xs font-bold text-slate-700">${label}</div>
                    </button>`).join('')}
            </div>
        </div>`
}

// Export
window.renderMyTasksView = renderMyTasksView
