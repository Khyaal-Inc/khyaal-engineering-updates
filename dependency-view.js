// ============================================================
// SYSTEM O — Dependency Risk Radar
// Enhanced dependency graph with critical path algorithm
// ============================================================
console.log('🕸️ dependency-view.js — System O loading...');

// ---- Critical Path Algorithm ----
// Finds the longest dependency chain (most items in sequence)
// using topological sort + dynamic programming on a DAG
function computeCriticalPath(itemMap, edges) {
    // Build adjacency: fromId → [toId, ...]
    const adj = {}        // from → [to]
    const indegree = {}   // for topo sort

    Object.keys(itemMap).forEach(id => { adj[id] = []; indegree[id] = 0; })

    edges.forEach(e => {
        if (!adj[e.from]) adj[e.from] = []
        adj[e.from].push(e.to)
        indegree[e.to] = (indegree[e.to] || 0) + 1
    })

    // Kahn's topo sort
    const queue = Object.keys(indegree).filter(id => indegree[id] === 0)
    const dist = {}       // longest path ending at node
    const prev = {}       // predecessor in longest path
    Object.keys(itemMap).forEach(id => { dist[id] = 1; prev[id] = null; })

    while (queue.length > 0) {
        const u = queue.shift()
        ;(adj[u] || []).forEach(v => {
            if (dist[u] + 1 > dist[v]) {
                dist[v] = dist[u] + 1
                prev[v] = u
            }
            indegree[v]--
            if (indegree[v] === 0) queue.push(v)
        })
    }

    // Find node with max distance
    let maxDist = 0
    let tail = null
    Object.keys(dist).forEach(id => {
        if (dist[id] > maxDist) { maxDist = dist[id]; tail = id; }
    })

    if (!tail || maxDist <= 1) return []

    // Walk back to get the chain
    const path = []
    let cur = tail
    while (cur !== null) {
        path.unshift(cur)
        cur = prev[cur]
    }
    return path
}

// ---- Cascade Analysis ----
// For a blocked item, count how many downstream items it unblocks if resolved
function getCascadeCount(itemId, edges) {
    const downstream = new Set()
    const stack = [itemId]
    while (stack.length > 0) {
        const cur = stack.pop()
        edges.forEach(e => {
            if (e.from === cur && !downstream.has(e.to)) {
                downstream.add(e.to)
                stack.push(e.to)
            }
        })
    }
    return downstream.size
}

// ---- Risk Score ----
// 0-100: combines blocker count, critical path length, and cascade depth
function computeRiskScore(blockerCount, criticalPathLength, totalEdges) {
    if (totalEdges === 0) return 0
    const blockerRatio = Math.min(blockerCount / Math.max(totalEdges, 1), 1)
    const pathRisk = Math.min((criticalPathLength - 1) / 10, 1)
    return Math.round((blockerRatio * 0.6 + pathRisk * 0.4) * 100)
}

// ---- Node ID helpers ----
// Mermaid node IDs: 'node_' + item.id with non-alphanumeric chars → '_'
function toMermaidId(itemId) {
    return 'node_' + itemId.replace(/[^a-zA-Z0-9]/g, '_')
}

// Reverse map: mermaid safe ID → original item ID (built per render)
let _depNodeMap = {}   // mermaidSafeId → itemId

// ---- Main View Renderer ----
function renderDependencyView() {
    const container = document.getElementById('dependency-view')
    if (!container) return
    _depNodeMap = {}

    // Collect all items
    const items = []
    const itemMap = {}

    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.id) {
                    items.push(item)
                    itemMap[item.id] = item
                    _depNodeMap[toMermaidId(item.id)] = item.id
                }
            })
        })
    })

    // Build dependency graph
    const edges = []
    const hasConnections = new Set()

    // Collect blocker node IDs first so edge colouring covers all adjacent edges
    const blockerIds = new Set(items.filter(i => i.blocker || i.status === 'blocked').map(i => i.id))

    items.forEach(item => {
        if (item.dependencies) {
            const deps = Array.isArray(item.dependencies) ? item.dependencies : [item.dependencies]
            deps.forEach(depId => {
                if (itemMap[depId]) {
                    hasConnections.add(item.id)
                    hasConnections.add(depId)
                    // Flag edge as blocker if either endpoint is a blocked item
                    edges.push({
                        from: depId,
                        to: item.id,
                        isBlocker: blockerIds.has(item.id) || blockerIds.has(depId)
                    })
                }
            })
        }
    })

    const connectedItems = items.filter(i => hasConnections.has(i.id))

    if (connectedItems.length === 0) {
        container.innerHTML = `
            <div id="dependency-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-3 px-2">
                    <span class="text-xl">🕸️</span>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery · Visualize blockers and dependency chains</span>
                        <h2 class="text-sm font-black text-slate-800">Dependency Risk Radar</h2>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <div id="dependency-next-action-mount">
                        ${typeof renderPrimaryStageAction === 'function' ? renderPrimaryStageAction('dependency') : ''}
                    </div>
                </div>
            </div>
            ${typeof renderSmartEmptyState === 'function' ? renderSmartEmptyState('dependency') : `
            <div class="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
                <div class="text-6xl mb-4">🕸️</div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">No Dependencies Found</h3>
                <p class="text-slate-600 mb-2">Add dependencies to items to see the dependency graph.</p>
                <p class="text-sm text-slate-500">Tip: Open any item's edit modal and use the Dependencies field.</p>
            </div>`}`;
        return
    }

    // ---- Compute critical path & risk metrics ----
    const criticalPathIds = computeCriticalPath(
        Object.fromEntries(connectedItems.map(i => [i.id, i])),
        edges
    )
    const criticalPathSet = new Set(criticalPathIds)

    const blockerEdges = edges.filter(e => e.isBlocker)
    const criticalBlockers = connectedItems.filter(i =>
        criticalPathSet.has(i.id) && (i.blocker || i.status === 'blocked')
    )
    const riskScore = computeRiskScore(blockerEdges.length, criticalPathIds.length, edges.length)
    const riskColor = riskScore >= 60 ? '#ef4444' : riskScore >= 30 ? '#f59e0b' : '#22c55e'
    const riskLabel = riskScore >= 60 ? 'High Risk' : riskScore >= 30 ? 'Moderate' : 'Low Risk'

    // ---- Build Mermaid diagram ----
    let mermaidCode = 'graph TD\n'

    connectedItems.forEach(item => {
        const safeId = 'node_' + item.id.replace(/[^a-zA-Z0-9]/g, '_')
        const label = item.text.substring(0, 28).replace(/["\\[\]{}()<>\r\n]/g, ' ').trim()
        const isCritical = criticalPathSet.has(item.id)
        const isBlocker = item.blocker || item.status === 'blocked'
        const styleClass = isBlocker ? 'critical_blocker' : isCritical ? 'critical_path' : item.status
        mermaidCode += `    ${safeId}["${label}"]:::${styleClass}\n`
    })

    edges.forEach(edge => {
        const fromId = 'node_' + edge.from.replace(/[^a-zA-Z0-9]/g, '_')
        const toId   = 'node_' + edge.to.replace(/[^a-zA-Z0-9]/g, '_')
        const isCriticalEdge = criticalPathSet.has(edge.from) && criticalPathSet.has(edge.to)
        if (edge.isBlocker) {
            mermaidCode += `    ${fromId} -.->${"|⚠ blocked|"} ${toId}\n`
        } else if (isCriticalEdge) {
            mermaidCode += `    ${fromId} ==> ${toId}\n`
        } else {
            mermaidCode += `    ${fromId} --> ${toId}\n`
        }
    })

    mermaidCode += `
    classDef done fill:#10b981,stroke:#059669,color:#fff
    classDef now fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef next fill:#f97316,stroke:#ea580c,color:#fff
    classDef later fill:#6b7280,stroke:#4b5563,color:#fff
    classDef blocked fill:#ef4444,stroke:#dc2626,color:#fff
    classDef critical_path fill:#4f46e5,stroke:#3730a3,color:#fff,stroke-width:3px
    classDef critical_blocker fill:#7f1d1d,stroke:#ef4444,color:#fff,stroke-width:3px
    `

    // ---- Risk Radar Panel HTML ----
    const criticalChainHTML = criticalPathIds.length > 1 ? `
        <div style="margin-top:10px;">
            <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin-bottom:6px;">Critical Chain (${criticalPathIds.length} items)</div>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
                ${criticalPathIds.map((id, idx) => {
                    const item = itemMap[id]
                    if (!item) return ''
                    const isBlocking = item.blocker || item.status === 'blocked'
                    return `
                        <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;
                            background:${isBlocking ? '#fef2f2' : '#eef2ff'};
                            color:${isBlocking ? '#991b1b' : '#3730a3'};
                            border:1px solid ${isBlocking ? '#fecaca' : '#c7d2fe'};"
                            title="${item.text}">
                            ${isBlocking ? '🔴' : '●'} ${item.text.substring(0,18)}${item.text.length > 18 ? '…' : ''}
                        </span>
                        ${idx < criticalPathIds.length - 1 ? '<span style="color:#94a3b8;font-size:10px;">→</span>' : ''}`
                }).join('')}
            </div>
        </div>` : ''

    const criticalBlockerCards = criticalBlockers.length > 0 ? criticalBlockers.map(item => {
        const cascadeCount = getCascadeCount(item.id, edges)
        return `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;border-radius:8px;margin-bottom:8px;">
                <span style="font-size:18px;flex-shrink:0;">⛔</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;color:#991b1b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.text}</div>
                    <div style="font-size:10px;color:#b91c1c;margin-top:2px;">
                        Critical path blocker · unlocks <strong>${cascadeCount}</strong> downstream item${cascadeCount !== 1 ? 's' : ''} when resolved
                    </div>
                    ${item.blockerNote ? `<div style="font-size:10px;color:#7f1d1d;margin-top:3px;font-style:italic;">"${item.blockerNote.substring(0,80)}"</div>` : ''}
                </div>
                <button onclick="typeof resolveBlocker==='function'&&resolveBlocker('${item.id}')"
                    style="flex-shrink:0;padding:4px 10px;background:#ef4444;color:white;border:none;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;">
                    ✓ Resolve
                </button>
            </div>`
    }).join('') : ''

    const nonCriticalBlockers = connectedItems.filter(i =>
        !criticalPathSet.has(i.id) && (i.blocker || i.status === 'blocked')
    )
    const nonCriticalCards = nonCriticalBlockers.length > 0 ? `
        <div style="margin-top:12px;">
            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Other Blockers (off critical path)</div>
            ${nonCriticalBlockers.map(item => `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fafafa;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;">
                    <span style="font-size:14px;">🔴</span>
                    <div style="flex:1;font-size:11px;font-weight:600;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.text}</div>
                    <button onclick="typeof resolveBlocker==='function'&&resolveBlocker('${item.id}')"
                        style="flex-shrink:0;padding:3px 8px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;">
                        Resolve
                    </button>
                </div>`).join('')}
        </div>` : ''

    // ---- Final HTML ----
    container.innerHTML = `
        <div id="dependency-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">🕸️</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery · Dependency Risk Radar — critical path analysis</span>
                    <h2 class="text-sm font-black text-slate-800">Dependency Risk Radar</h2>
                </div>
                ${typeof renderInfoButton === 'function' ? renderInfoButton('dependency') : ''}
            </div>
            <div class="flex items-center gap-3">
                <!-- Risk Score Pill -->
                <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;background:${riskColor}15;border:1px solid ${riskColor}40;font-size:11px;font-weight:800;color:${riskColor};">
                    <span style="width:8px;height:8px;border-radius:50%;background:${riskColor};display:inline-block;"></span>
                    Risk Score ${riskScore} · ${riskLabel}
                </div>
                <button onclick="exportDependencyGraph()" class="cms-btn cms-btn-secondary text-xs">📥 Export</button>
                <div id="dependency-next-action-mount">
                    ${typeof renderPrimaryStageAction === 'function' ? renderPrimaryStageAction('dependency') : ''}
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start;">
            <!-- Left: Graph -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <!-- Legend -->
                <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:11px;margin-bottom:16px;padding:10px 14px;background:#f8fafc;border-radius:8px;">
                    <div style="display:flex;align-items:center;gap:5px;"><div style="width:12px;height:12px;border-radius:3px;background:#10b981;"></div><span>Done</span></div>
                    <div style="display:flex;align-items:center;gap:5px;"><div style="width:12px;height:12px;border-radius:3px;background:#3b82f6;"></div><span>Now</span></div>
                    <div style="display:flex;align-items:center;gap:5px;"><div style="width:12px;height:12px;border-radius:3px;background:#f97316;"></div><span>Next</span></div>
                    <div style="display:flex;align-items:center;gap:5px;"><div style="width:12px;height:12px;border-radius:3px;background:#4f46e5;"></div><span>Critical Path</span></div>
                    <div style="display:flex;align-items:center;gap:5px;"><div style="width:12px;height:12px;border-radius:3px;background:#7f1d1d;"></div><span>Critical Blocker</span></div>
                    <div style="margin-left:8px;padding-left:8px;border-left:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;">
                        <span>──▶ depends on</span>
                        <span style="color:#4f46e5;font-weight:700;">=⇒ critical chain</span>
                        <span>···▶ blocker</span>
                    </div>
                </div>
                <p style="font-size:11px;color:#94a3b8;margin-bottom:12px;">${connectedItems.length} connected items · ${edges.length} dependencies · ${criticalPathIds.length} in critical chain</p>
                <style>
                    .mermaid svg { width: 100%; height: auto; min-width: 600px; max-width: none !important; }
                    #dependency-view svg g.node { cursor: pointer; }
                    #dependency-view svg g.node:hover rect,
                    #dependency-view svg g.node:hover polygon,
                    #dependency-view svg g.node:hover circle { filter: brightness(0.88); }
                </style>
                <div class="mermaid-container overflow-x-auto bg-slate-50 border border-slate-200 rounded-lg p-4" style="min-height:360px;">
                    <div class="mermaid w-full">${mermaidCode}</div>
                </div>
            </div>

            <!-- Right: Risk Radar Panel -->
            <div style="display:flex;flex-direction:column;gap:12px;">

                <!-- Risk Score Card -->
                <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
                    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:8px;">Radar Summary</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                        <div style="text-align:center;padding:10px;background:#f8fafc;border-radius:8px;">
                            <div style="font-size:22px;font-weight:900;color:${riskColor};">${riskScore}</div>
                            <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Risk Score</div>
                        </div>
                        <div style="text-align:center;padding:10px;background:#f8fafc;border-radius:8px;">
                            <div style="font-size:22px;font-weight:900;color:#4f46e5;">${criticalPathIds.length}</div>
                            <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Chain Length</div>
                        </div>
                        <div style="text-align:center;padding:10px;background:#f8fafc;border-radius:8px;">
                            <div style="font-size:22px;font-weight:900;color:#ef4444;">${criticalBlockers.length}</div>
                            <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Crit. Blockers</div>
                        </div>
                        <div style="text-align:center;padding:10px;background:#f8fafc;border-radius:8px;">
                            <div style="font-size:22px;font-weight:900;color:#f59e0b;">${blockerEdges.length}</div>
                            <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Blocker Edges</div>
                        </div>
                    </div>
                    ${criticalChainHTML}
                </div>

                <!-- Critical Blockers Card -->
                ${criticalBlockers.length > 0 ? `
                <div style="background:white;border:1px solid #fecaca;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(239,68,68,0.08);">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
                        <span style="font-size:14px;">⛔</span>
                        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#991b1b;">Critical Blockers</div>
                        <span style="margin-left:auto;font-size:10px;padding:1px 6px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;font-weight:700;color:#ef4444;">${criticalBlockers.length}</span>
                    </div>
                    ${criticalBlockerCards}
                </div>` : `
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;">
                    <div style="font-size:24px;margin-bottom:6px;">✅</div>
                    <div style="font-size:12px;font-weight:700;color:#15803d;">No Critical Blockers</div>
                    <div style="font-size:10px;color:#16a34a;margin-top:3px;">Your critical path is clear.</div>
                </div>`}

                ${nonCriticalCards}

                <!-- Actions -->
                <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
                    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:8px;">Quick Actions</div>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <button onclick="switchView('kanban')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:700;color:#374151;cursor:pointer;text-align:left;">
                            <span>📋</span> View all blockers in Kanban
                        </button>
                        <button onclick="switchView('sprint')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:700;color:#374151;cursor:pointer;text-align:left;">
                            <span>🏃</span> Review sprint items
                        </button>
                        <button onclick="exportDependencyGraph()" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:700;color:#374151;cursor:pointer;text-align:left;">
                            <span>📥</span> Export graph as PNG
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `

    // Initialize Mermaid then wire node click-through
    if (window.mermaid) {
        const targetNode = container.querySelector('.mermaid')
        if (!targetNode) return
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                observer.disconnect()
                mermaid.run({ nodes: container.querySelectorAll('.mermaid') })
                    .then(() => attachDepGraphClicks(container))
                    .catch(err => console.warn('Mermaid render error:', err))
            }
        }, { threshold: 0.01 })
        observer.observe(container)
    }
}

// ---- Node click-through ----
// After Mermaid renders, find each <g class="node"> in the SVG and attach
// a click handler that opens the item edit modal for that node's item.
// Mermaid 10 sets id="flowchart-<safeId>-<n>" on node <g> elements.
function attachDepGraphClicks(container) {
    const svg = container.querySelector('svg')
    if (!svg) return

    // Style cursor on all node groups so the affordance is clear
    svg.querySelectorAll('g.node').forEach(nodeEl => {
        // Mermaid 10 id format: "flowchart-node_xxx_yyy-0"
        const rawId = nodeEl.id || ''                          // e.g. "flowchart-node_platform_website_auth_0-0"
        const match = rawId.match(/^flowchart-(.+?)-\d+$/)    // capture the safeId part
        if (!match) return

        const safeId = match[1]                                // e.g. "node_platform_website_auth_0"
        const itemId = _depNodeMap[safeId]
        if (!itemId) return

        nodeEl.style.cursor = 'pointer'

        // Tooltip: show item title on hover
        const item = (window.UPDATE_DATA?.tracks || [])
            .flatMap(t => t.subtracks.flatMap(s => s.items))
            .find(i => i.id === itemId)
        if (item) {
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
            title.textContent = item.text + ' — click to edit'
            nodeEl.prepend(title)
        }

        nodeEl.addEventListener('click', () => {
            if (typeof openItemEdit === 'function') openItemEdit(null, null, null, itemId)
        })
    })
}

function getStatusColor(status) {
    return { done:'#10b981', now:'#3b82f6', next:'#f97316', later:'#6b7280', blocked:'#ef4444' }[status] || '#6b7280'
}

function exportDependencyGraph() {
    const svg = document.querySelector('#dependency-view svg')
    if (!svg) { alert('No graph to export yet — wait for the diagram to render.'); return }
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
        canvas.width = img.width; canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = 'dependency-risk-radar.png'; a.click()
            URL.revokeObjectURL(url)
        })
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
}

// Expose computeCriticalPath as global helper (used by spec's data helpers)
window.computeCriticalPath    = computeCriticalPath
window.renderDependencyView   = renderDependencyView
window.exportDependencyGraph  = exportDependencyGraph
console.log('✅ dependency-view.js — System O (Dependency Risk Radar) active')

