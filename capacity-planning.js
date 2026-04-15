// ========================================
// CAPACITY PLANNING MODULE
// ========================================
// Derives contributor workload entirely from actual item data —
// no static teamMembers config required.

// ---- Data helpers ----

/**
 * Returns the set of sprint IDs to display: active + up to N most recent closed.
 * Always puts active sprint last (rightmost column).
 */
function getCapacitySprints(maxClosed) {
    const sprints = UPDATE_DATA.metadata?.sprints || []
    const active = sprints.filter(s => s.status === 'active')
    const closed = sprints
        .filter(s => s.status === 'completed' || s.status === 'closed')
        .slice(-maxClosed)
    return [...closed, ...active]
}

/**
 * Walks all items in the given sprints and returns a contributor → sprint → stats map.
 * stats = { points: number, done: number, items: Item[] }
 */
function buildCapacityMatrix(sprintIds) {
    const matrix = {} // { contributorName: { sprintId: { points, done, items } } }

    const activeTeam = typeof getActiveTeam === 'function' ? getActiveTeam() : null

    ;(UPDATE_DATA.tracks || []).forEach(track => {
        if (activeTeam && activeTeam !== track.id) return
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach((item, ii) => {
                if (!sprintIds.has(item.sprintId)) return
                const pts = parseInt(item.storyPoints) || 0
                const contributors = item.contributors || []
                const share = contributors.length > 0 ? pts / contributors.length : pts

                contributors.forEach(name => {
                    if (!matrix[name]) matrix[name] = {}
                    if (!matrix[name][item.sprintId]) {
                        matrix[name][item.sprintId] = { points: 0, done: 0, items: [] }
                    }
                    matrix[name][item.sprintId].points += share
                    if (item.status === 'done') matrix[name][item.sprintId].done += share
                    matrix[name][item.sprintId].items.push(item)
                })
            })
        })
    })

    return matrix
}

/**
 * Returns total committed / done points per sprint across all contributors.
 */
function buildSprintTotals(matrix, sprintIds) {
    const totals = {}
    sprintIds.forEach(id => totals[id] = { points: 0, done: 0 })
    Object.values(matrix).forEach(bysprint => {
        Object.entries(bysprint).forEach(([sid, stats]) => {
            if (!totals[sid]) return
            totals[sid].points += Math.round(stats.points)
            totals[sid].done   += Math.round(stats.done)
        })
    })
    return totals
}

/**
 * Computes average velocity (completed points) from the last N closed sprints.
 * Returns { avg, samples, closedSprints[] }
 */
function computeAvgVelocity(maxSamples) {
    const sprints = UPDATE_DATA.metadata?.sprints || []
    const closed = sprints
        .filter(s => s.status === 'completed' || s.status === 'closed')
        .slice(-maxSamples)

    if (closed.length === 0) return { avg: 0, samples: 0, closedSprints: [] }

    const closedIdSet = new Set(closed.map(s => s.id))
    const matrix = buildCapacityMatrix(closedIdSet)
    const totals = buildSprintTotals(matrix, closedIdSet)

    let totalDone = 0
    closed.forEach(s => { totalDone += (totals[s.id]?.done || 0) })
    const avg = closed.length > 0 ? Math.round(totalDone / closed.length) : 0

    return { avg, samples: closed.length, closedSprints: closed }
}

/**
 * Builds a banner comparing active sprint planned scope vs avg velocity.
 * Risk threshold: planned > velocity × 1.2
 */
function buildVelocityComparisonBanner(activeSprint, activeSprintTotalPts, velocity) {
    if (!activeSprint || velocity.samples === 0) return ''

    const planned = activeSprintTotalPts
    const avg = velocity.avg
    const ratio = avg > 0 ? planned / avg : null

    let statusHtml = ''
    if (ratio === null) {
        statusHtml = `<span class="cap-velocity-badge cap-velocity-unknown">No velocity data</span>`
    } else if (ratio > 1.2) {
        const overPct = Math.round((ratio - 1) * 100)
        statusHtml = `<span class="cap-velocity-badge cap-velocity-risk">⚠ ${overPct}% over avg velocity — scope risk</span>`
    } else if (ratio > 1.0) {
        statusHtml = `<span class="cap-velocity-badge cap-velocity-caution">~ Slightly above avg — watchable</span>`
    } else {
        statusHtml = `<span class="cap-velocity-badge cap-velocity-ok">✓ Within velocity range</span>`
    }

    return `
        <div class="cap-velocity-banner">
            <div class="cap-velocity-row">
                <span class="cap-velocity-label">Sprint scope</span>
                <span class="cap-velocity-val">${planned} pts</span>
                <span class="cap-velocity-sep">vs</span>
                <span class="cap-velocity-label">Avg velocity</span>
                <span class="cap-velocity-val">${avg} pts</span>
                <span class="cap-velocity-label cap-velocity-sample">(${velocity.samples} sprint${velocity.samples !== 1 ? 's' : ''})</span>
                ${statusHtml}
            </div>
        </div>`
}

/**
 * Builds a warning row listing unpointed items in the active sprint.
 */
function buildUnpointedWarning(activeSprint) {
    if (!activeSprint) return ''

    const unpointed = []
    ;(UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(st => st.items.forEach(item => {
        if (item.sprintId !== activeSprint.id) return
        if (!item.storyPoints || parseInt(item.storyPoints) === 0) {
            unpointed.push(item)
        }
    })))

    if (unpointed.length === 0) return ''

    const pills = unpointed.slice(0, 6).map(item =>
        `<span class="cap-unpointed-pill">${item.title || item.id}</span>`
    ).join('')
    const overflow = unpointed.length > 6
        ? `<span class="cap-unpointed-more">+${unpointed.length - 6} more</span>`
        : ''

    return `
        <div class="cap-unpointed-banner">
            <span class="cap-unpointed-icon">⚠</span>
            <span class="cap-unpointed-count">${unpointed.length} unpointed item${unpointed.length !== 1 ? 's' : ''} in active sprint:</span>
            <div class="cap-unpointed-pills">${pills}${overflow}</div>
        </div>`
}

/**
 * Builds per-contributor workload bars vs a weekly capacity threshold.
 * Default capacity: 20 SP per sprint (configurable via UPDATE_DATA.metadata.sprintCapacity).
 */
function buildWorkloadBars(activeSprint, matrix) {
    if (!activeSprint) return ''

    const capacity = (UPDATE_DATA.metadata?.sprintCapacity) || 20
    const contributors = Object.keys(matrix).sort()
    const activeRows = contributors.filter(name => (matrix[name] || {})[activeSprint.id])

    if (activeRows.length === 0) return ''

    const bars = activeRows.map(name => {
        const stats = matrix[name][activeSprint.id]
        const pts = Math.round(stats.points)
        const fillPct = Math.min(Math.round((pts / capacity) * 100), 100)
        const overPct = pts > capacity ? Math.round(((pts - capacity) / capacity) * 100) : 0

        let barCls, labelCls, statusLabel
        if (pts > capacity * 1.15) {
            barCls = 'cap-bar-over'; labelCls = 'cap-bar-label-over'; statusLabel = `${overPct}% over`
        } else if (pts > capacity * 0.85) {
            barCls = 'cap-bar-near'; labelCls = 'cap-bar-label-near'; statusLabel = 'near capacity'
        } else {
            barCls = 'cap-bar-ok'; labelCls = 'cap-bar-label-ok'; statusLabel = 'under capacity'
        }

        const colorClass = (typeof contributorColors !== 'undefined' && contributorColors[name])
            ? contributorColors[name]
            : 'bg-slate-100 text-slate-700'

        return `
            <div class="cap-workload-row">
                <div class="cap-workload-name">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${colorClass}">${name}</span>
                </div>
                <div class="cap-workload-bar-wrap">
                    <div class="cap-workload-bar-track">
                        <div class="cap-workload-bar-fill ${barCls}" style="width:${fillPct}%"></div>
                        <div class="cap-workload-capacity-line" style="left:${Math.min(Math.round((capacity / Math.max(pts, capacity)) * 100), 100)}%"></div>
                    </div>
                </div>
                <div class="cap-workload-pts">${pts}<span class="cap-workload-pts-cap">/${capacity}</span></div>
                <div class="cap-workload-status ${labelCls}">${statusLabel}</div>
            </div>`
    }).join('')

    return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-black text-slate-800">Workload vs Capacity</h3>
                <span class="text-[10px] text-slate-400 font-bold">Threshold: ${capacity} pts / sprint</span>
            </div>
            <div class="space-y-2.5">${bars}</div>
            <div class="mt-3 flex items-center gap-5 text-[10px] text-slate-500 font-bold">
                <span class="flex items-center gap-1.5"><span class="w-3 h-2 rounded cap-bar-ok inline-block"></span> Under</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-2 rounded cap-bar-near inline-block"></span> Near (&gt;85%)</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-2 rounded cap-bar-over inline-block"></span> Over (&gt;115%)</span>
                <span class="ml-auto text-slate-400">| = sprint capacity threshold</span>
            </div>
        </div>`
}

// ---- HTML builders ----

function buildCapacityHeader(sprints, totals) {
    const sprintCols = sprints.map(s => {
        const t = totals[s.id] || { points: 0, done: 0 }
        const pct = t.points > 0 ? Math.round((t.done / t.points) * 100) : 0
        const isActive = s.status === 'active'
        return `
            <th class="px-4 py-3 text-center min-w-[140px]">
                <div class="text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-600' : 'text-slate-400'}">
                    ${isActive ? '● Active' : 'Closed'}
                </div>
                <div class="text-xs font-bold text-slate-800 mt-0.5 truncate max-w-[130px]">${s.name}</div>
                <div class="text-[10px] text-slate-500 mt-1">${t.points} pts · ${pct}% done</div>
            </th>`
    }).join('')

    return `
        <thead>
            <tr class="border-b border-slate-200">
                <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[140px]">Contributor</th>
                ${sprintCols}
                <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[100px]">Avg Load</th>
            </tr>
        </thead>`
}

function buildCapacityRow(name, matrix, sprints, currentUser, mode) {
    // Dev persona: only show own row
    if (mode === 'dev' && currentUser && name !== currentUser) return ''

    const colorClass = (typeof contributorColors !== 'undefined' && contributorColors[name])
        ? contributorColors[name]
        : 'bg-slate-100 text-slate-700'

    let totalPts = 0
    let sprintCount = 0

    const cells = sprints.map(s => {
        const stats = (matrix[name] || {})[s.id]
        if (!stats || stats.points === 0) {
            return `<td class="px-4 py-3 text-center text-slate-300 text-xs">—</td>`
        }
        const pts = Math.round(stats.points)
        const donePts = Math.round(stats.done)
        const pct = Math.round((stats.done / stats.points) * 100)
        const barColor = pct >= 90 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
        const isActive = s.status === 'active'
        const itemCount = stats.items.length

        totalPts += pts
        sprintCount++

        return `
            <td class="px-4 py-3">
                <div class="flex flex-col gap-1 items-center">
                    <div class="text-xs font-bold text-slate-800">${pts} pts</div>
                    <div class="w-full max-w-[120px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div class="${barColor} h-full rounded-full" style="width:${Math.min(pct,100)}%"></div>
                    </div>
                    <div class="text-[10px] text-slate-500">${donePts}/${pts} done · ${itemCount} items</div>
                    ${isActive && pct < 20 && pts > 0 ? `<div class="text-[9px] font-black text-rose-500 uppercase tracking-wide">At risk</div>` : ''}
                </div>
            </td>`
    }).join('')

    const avg = sprintCount > 0 ? Math.round(totalPts / sprintCount) : 0

    return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
            <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${colorClass}">${name}</span>
            </td>
            ${cells}
            <td class="px-4 py-3 text-center">
                <span class="text-xs font-black text-slate-700">${avg} pts</span>
                <div class="text-[10px] text-slate-400">/ sprint</div>
            </td>
        </tr>`
}

function buildCapacitySummaryCards(sprints, matrix) {
    const activeSprint = sprints.find(s => s.status === 'active')
    if (!activeSprint) return ''

    const contributors = Object.keys(matrix)
    let totalPts = 0
    let donePts = 0
    let overloadedCount = 0
    let maxContributor = ''
    let maxPts = 0

    contributors.forEach(name => {
        const stats = (matrix[name] || {})[activeSprint.id]
        if (!stats) return
        const pts = Math.round(stats.points)
        const done = Math.round(stats.done)
        totalPts += pts
        donePts += done
        if (pts > maxPts) { maxPts = pts; maxContributor = name }
        // Heuristic: >25 pts in a 2-week sprint = over-committed
        if (pts > 25) overloadedCount++
    })

    const progressPct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0
    const sprintLabel = activeSprint.name

    return `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div class="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Active Sprint</div>
                <div class="text-sm font-bold text-indigo-900 truncate">${sprintLabel}</div>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <div class="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Team Progress</div>
                <div class="text-2xl font-black text-emerald-900">${progressPct}<span class="text-sm font-bold">%</span></div>
                <div class="text-[10px] text-emerald-700">${donePts}/${totalPts} pts done</div>
            </div>
            <div class="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div class="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1">Top Load</div>
                <div class="text-sm font-bold text-amber-900 truncate">${maxContributor || '—'}</div>
                <div class="text-[10px] text-amber-700">${maxPts} pts committed</div>
            </div>
            <div class="bg-rose-50 border border-rose-100 rounded-xl p-4">
                <div class="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1">Over-committed</div>
                <div class="text-2xl font-black text-rose-900">${overloadedCount}</div>
                <div class="text-[10px] text-rose-700">contributor${overloadedCount !== 1 ? 's' : ''} &gt;25 pts</div>
            </div>
        </div>`
}

function buildExecCapacitySummary(sprints, matrix) {
    // Exec persona gets a simple trend table, no per-person drill-down
    const rows = sprints.map(s => {
        let total = 0, done = 0, contributors = 0
        Object.values(matrix).forEach(byS => {
            const stats = byS[s.id]
            if (!stats) return
            total += Math.round(stats.points)
            done  += Math.round(stats.done)
            contributors++
        })
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        const isActive = s.status === 'active'
        return `
            <tr class="border-b border-slate-100">
                <td class="px-4 py-3 text-xs font-bold text-slate-800">
                    ${isActive ? '<span class="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 align-middle"></span>' : ''}
                    ${s.name}
                </td>
                <td class="px-4 py-3 text-center text-xs text-slate-700">${contributors}</td>
                <td class="px-4 py-3 text-center text-xs text-slate-700">${total} pts</td>
                <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <div class="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                            <div class="${pct >= 80 ? 'bg-emerald-500' : 'bg-amber-500'} h-full rounded-full" style="width:${pct}%"></div>
                        </div>
                        <span class="text-xs font-bold text-slate-700">${pct}%</span>
                    </div>
                </td>
            </tr>`
    }).join('')

    return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100">
                <h3 class="text-sm font-black text-slate-800">Sprint Delivery Trend</h3>
            </div>
            <table class="w-full">
                <thead>
                    <tr class="border-b border-slate-200">
                        <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Sprint</th>
                        <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Contributors</th>
                        <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Committed</th>
                        <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Completion</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`
}

// ---- Main renderer ----

function renderCapacityView() {
    const container = document.getElementById('capacity-view')
    if (!container) return

    const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm'

    // Exec gets a simplified summary — no per-person data
    if (mode === 'exec') {
        const sprints = getCapacitySprints(4)
        if (sprints.length === 0) {
            container.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm">No sprint data available.</div>`
            return
        }
        const sprintIdSet = new Set(sprints.map(s => s.id))
        const matrix = buildCapacityMatrix(sprintIdSet)
        container.innerHTML = `
            <div class="space-y-6">
                <div class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 px-4">
                    <span class="text-xl">⚖️</span>
                    <div>
                        <div class="text-[10px] font-medium text-slate-400">Plan / Capacity</div>
                        <h2 class="text-sm font-bold text-slate-800">Sprint Delivery Overview</h2>
                    </div>
                </div>
                ${buildExecCapacitySummary(sprints, matrix)}
            </div>`
        return
    }

    // PM / Dev: full matrix
    const sprints = getCapacitySprints(3)
    if (sprints.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm">No sprint data available. Assign items to a sprint to see capacity.</div>`
        return
    }

    const sprintIdSet = new Set(sprints.map(s => s.id))
    const matrix = buildCapacityMatrix(sprintIdSet)
    const contributors = Object.keys(matrix).sort()

    if (contributors.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm">No contributors found in sprint items. Assign contributors to items to see capacity.</div>`
        return
    }

    // Build sprint totals for header
    const totals = {}
    sprints.forEach(s => { totals[s.id] = { points: 0, done: 0 } })
    contributors.forEach(name => {
        Object.entries(matrix[name]).forEach(([sid, stats]) => {
            if (!totals[sid]) return
            totals[sid].points += Math.round(stats.points)
            totals[sid].done   += Math.round(stats.done)
        })
    })

    const activeSprint = sprints.find(s => s.status === 'active') || null
    const activeSprintTotalPts = activeSprint ? (totals[activeSprint.id]?.points || 0) : 0
    const velocity = computeAvgVelocity(4)

    const currentUser = typeof window.CURRENT_USER !== 'undefined' && window.CURRENT_USER?.name
        ? window.CURRENT_USER.name
        : null

    const rows = contributors
        .map(name => buildCapacityRow(name, matrix, sprints, currentUser, mode))
        .filter(Boolean)
        .join('')

    const devNotice = mode === 'dev'
        ? `<div class="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-bold">Developer view — showing your assignments only.</div>`
        : ''

    container.innerHTML = `
        <div class="space-y-6">
            <!-- Header ribbon -->
            <div class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 px-4">
                <span class="text-xl">⚖️</span>
                <div>
                    <div class="text-[10px] font-medium text-slate-400">Plan / Capacity</div>
                    <h2 class="text-sm font-bold text-slate-800">Team Capacity Planner</h2>
                </div>
            </div>

            ${buildVelocityComparisonBanner(activeSprint, activeSprintTotalPts, velocity)}

            ${buildUnpointedWarning(activeSprint)}

            ${buildCapacitySummaryCards(sprints, matrix)}

            ${buildWorkloadBars(activeSprint, matrix)}

            ${devNotice}

            <!-- Matrix table -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table class="w-full">
                    ${buildCapacityHeader(sprints, totals)}
                    <tbody>${rows}</tbody>
                </table>
            </div>

            <!-- Legend -->
            <div class="flex items-center gap-6 px-1 text-[10px] text-slate-500 font-bold">
                <span class="flex items-center gap-1.5"><span class="w-3 h-1.5 rounded-full bg-emerald-500 inline-block"></span> ≥90% done</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-1.5 rounded-full bg-amber-500 inline-block"></span> 60–89% done</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-1.5 rounded-full bg-rose-500 inline-block"></span> &lt;60% done</span>
                <span class="ml-auto text-slate-400">Points split equally when item has multiple contributors</span>
            </div>
        </div>`
}

// Export
window.renderCapacityView = renderCapacityView
