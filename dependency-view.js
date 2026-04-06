// ========================================
// DEPENDENCY GRAPH VIEW
// ========================================
// Visualizes task dependencies using Mermaid.js

function renderDependencyView() {
    const container = document.getElementById('dependency-view');
    if (!container) return;

    // Collect all items with dependencies
    const items = [];
    const itemMap = {};

    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.id) {
                    items.push(item);
                    itemMap[item.id] = item;
                }
            });
        });
    });

    // Build dependency graph
    const nodes = [];
    const edges = [];
    const hasConnections = new Set();

    items.forEach(item => {
        if (item.dependencies) {
            const deps = Array.isArray(item.dependencies) ? item.dependencies : [item.dependencies];

            deps.forEach(depId => {
                if (itemMap[depId]) {
                    hasConnections.add(item.id);
                    hasConnections.add(depId);

                    edges.push({
                        from: depId,
                        to: item.id,
                        type: item.blocker ? 'blocker' : 'normal'
                    });
                }
            });
        }
    });

    // Only show items that have connections
    const connectedItems = items.filter(i => hasConnections.has(i.id));

    if (connectedItems.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
                <div class="text-6xl mb-4">🕸️</div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">No Dependencies Found</h3>
                <p class="text-slate-600">Add dependencies to items to see the dependency graph.</p>
                <p class="text-sm text-slate-500 mt-4">Tip: Set item.dependencies = ["item-id"] in the CMS</p>
            </div>
        `;
        return;
    }

    // Generate Mermaid diagram
    let mermaidCode = 'graph TD\n';

    // Add nodes with styling
    connectedItems.forEach(item => {
        const safeId = 'node_' + item.id.replace(/[^a-zA-Z0-9]/g, '_');
        // Sanitize label to prevent syntax errors (remove quotes and brackets)
        const label = item.text.substring(0, 30).replace(/["\\[\\]{}()]/g, '');
        const statusColor = getStatusColor(item.status);

        mermaidCode += `    ${safeId}["${label}"]:::${item.status}\n`;
    });

    // Add edges
    edges.forEach(edge => {
        const fromId = 'node_' + edge.from.replace(/[^a-zA-Z0-9]/g, '_');
        const toId = 'node_' + edge.to.replace(/[^a-zA-Z0-9]/g, '_');

        if (edge.type === 'blocker') {
            mermaidCode += `    ${fromId} -.->|blocker| ${toId}\n`;
        } else {
            mermaidCode += `    ${fromId} --> ${toId}\n`;
        }
    });

    // Add styling
    mermaidCode += `
    classDef done fill:#10b981,stroke:#059669,color:#fff
    classDef now fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef next fill:#f97316,stroke:#ea580c,color:#fff
    classDef later fill:#6b7280,stroke:#4b5563,color:#fff
    `;

    container.innerHTML = `
        <div id="dependency-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">🕸️</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery · Visualize task blockers and inter-item dependencies</span>
                    <h2 class="text-sm font-black text-slate-800">Dependency Graph</h2>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div id="dependency-next-action-mount">
                    ${typeof renderPrimaryStageAction === 'function' ? renderPrimaryStageAction('dependency') : ''}
                </div>
            </div>
        </div>
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <p class="text-slate-600">Visualizing ${connectedItems.length} connected items with ${edges.length} dependencies</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="exportDependencyGraph()" class="cms-btn cms-btn-secondary text-xs">
                        📥 Export PNG
                    </button>
                </div>
            </div>

            <!-- Legend -->
            <div class="flex gap-4 text-xs mb-6 p-4 bg-slate-50 rounded-lg">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded bg-emerald-500"></div>
                    <span>Done</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded bg-blue-500"></div>
                    <span>Now</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded bg-orange-500"></div>
                    <span>Next</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded bg-gray-500"></div>
                    <span>Later</span>
                </div>
                <div class="mx-4 border-l border-slate-300"></div>
                <div class="flex items-center gap-2">
                    <div class="text-slate-600">──▶</div>
                    <span>Depends on</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="text-red-600">···▶</div>
                    <span>Blocker</span>
                </div>
            </div>

            <!-- Mermaid Diagram -->
            <div class="mermaid-container overflow-x-auto" style="min-height: 400px;">
                <pre class="mermaid">${mermaidCode}</pre>
            </div>

            <!-- Critical Path Highlighting -->
            <div class="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <h4 class="font-bold text-red-900 mb-2">⚠️ Critical Blockers</h4>
                <div class="text-sm text-red-800">
                    ${edges.filter(e => e.type === 'blocker').length} blocking dependencies found.
                    Review items marked as blockers to prevent delays.
                </div>
            </div>
        </div>
    `;

    // Initialize Mermaid
    if (window.mermaid) {
        setTimeout(() => {
            mermaid.init(undefined, container.querySelectorAll('.mermaid'));
        }, 100);
    }
}

function getStatusColor(status) {
    const colorMap = {
        done: '#10b981',
        now: '#3b82f6',
        next: '#f97316',
        later: '#6b7280'
    };
    return colorMap[status] || '#6b7280';
}

function exportDependencyGraph() {
    const svg = document.querySelector('#dependency-view svg');
    if (!svg) {
        alert('No graph to export');
        return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dependency-graph.png';
            a.click();
            URL.revokeObjectURL(url);
        });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

// Export function
window.renderDependencyView = renderDependencyView;
window.exportDependencyGraph = exportDependencyGraph;
