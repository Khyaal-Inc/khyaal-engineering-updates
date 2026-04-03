// ========================================
// OKR (Objectives & Key Results) MODULE
// ========================================
// View and manage OKRs with auto-progress from linked items
//
// ==========================================
// PRODUCT MANAGEMENT WORKFLOW HIERARCHY
// ==========================================
// This system follows the industry-standard product management hierarchy:
//
// 1. PRODUCT VISION & STRATEGY
//    - The ultimate long-term goal (e.g., "Become the #1 travel app")
//    - Lives in: metadata.vision
//    - Managed via: editVision() function
//    - Timeframe: Multi-year horizon
//    - Purpose: North star that guides all strategic decisions
//
// 2. OKRs (OBJECTIVES & KEY RESULTS)
//    - Quarterly measurable outcomes aligned to vision
//    - Example: "Objective: Increase user retention. Key Result: 20% increase in weekly active users"
//    - Lives in: metadata.okrs[]
//    - Managed via: openOKREdit(), deleteOKR() (this file)
//    - Timeframe: Quarterly (3 months)
//    - Purpose: Translate vision into measurable quarterly goals
//
// 3. ROADMAP (STRATEGIC THEMES)
//    - Strategic initiatives that help achieve OKRs
//    - Example: "Revamp Onboarding Flow" to improve retention
//    - Lives in: metadata.roadmap[] (planning horizons: 1M, 3M, 6M)
//    - Managed via: openRoadmapEdit(), deleteRoadmap() in cms.js
//    - Timeframe: 1-6 month planning horizons
//    - Purpose: Define strategic initiatives mapped to time horizons
//
// 4. EPICS
//    - Large chunks of work broken down from roadmap themes
//    - Example: "Mobile App Redesign" Epic for onboarding revamp
//    - Lives in: metadata.epics[]
//    - Managed via: openEpicEdit(), deleteEpic() in cms.js
//    - Timeframe: 1-3 months typically
//    - Purpose: Break down strategic themes into executable work streams
//    - Links: epic.linkedOKR references okr.id
//
// 5. RELEASES
//    - Groups of epics/features ready to launch together
//    - Example: "v2.1 Platform Foundation" release
//    - Lives in: metadata.releases[]
//    - Managed via: openReleaseEdit(), deleteRelease() in cms.js
//    - Timeframe: 2-8 weeks typically
//    - Purpose: Package work into shippable increments
//    - Links: release.linkedEpic references epic.id
//
// 6. BACKLOG
//    - Granular list of specific tasks and user stories
//    - Example: "Add captcha to signup form"
//    - Lives in: tracks[].subtracks[] where subtrack.name === 'Backlog'
//    - Managed via: addItem(), openItemEdit() in cms.js
//    - Timeframe: Ongoing queue
//    - Purpose: Detailed task inventory ready for sprint planning
//    - Links: item.epicId, item.planningHorizon, item.releasedIn
//
// 7. SPRINTS
//    - Time-boxed cycles (1-4 weeks) of executing backlog items
//    - Example: "Sprint 42: Security Hardening"
//    - Lives in: metadata.sprints[]
//    - Managed via: openSprintEdit(), deleteSprint() in cms.js
//    - Timeframe: 1-4 weeks
//    - Purpose: Execute work in focused increments
//    - Links: item.sprintId references sprint.id
//
// DATA FLOW & LINKAGES:
// Vision → OKRs (aligned to vision)
//       → Roadmap Themes (strategic initiatives to hit OKRs)
//       → Epics (linkedOKR points to OKR ID)
//       → Releases (linkedEpic points to Epic ID)
//       → Backlog Items (epicId, planningHorizon, releasedIn)
//       → Sprints (items have sprintId)
//
// PROGRESS TRACKING:
// - OKR progress auto-calculated from Key Results
// - Key Result progress auto-calculated from linked Epic items
// - Epic health tracked manually (on-track, at-risk, delayed)
// - Sprint velocity tracked via completed story points
//
// ==========================================

function renderOkrView() {
    const container = document.getElementById('okr-view');
    if (!container) {
        // Create view container if it doesn't exist
        const mainContent = document.querySelector('#main-content');
        if (mainContent) {
            const newView = document.createElement('div');
            newView.id = 'okr-view';
            newView.className = 'view-section';
            mainContent.appendChild(newView);
            container = newView;
        } else {
            return;
        }
    }

    const okrs = UPDATE_DATA.metadata?.okrs || [];
    const vision = UPDATE_DATA.metadata?.vision || '';
    const showManagement = (typeof shouldShowManagement === 'function') ? shouldShowManagement() : false;

    // Vision Statement Section (if exists)
    let visionHtml = '';
    if (vision) {
        visionHtml = `
            <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-lg border border-indigo-200 shadow-sm mb-3">
                <div class="flex items-start gap-4">
                    <div class="text-4xl">🌟</div>
                    <div class="flex-1">
                        <h3 class="text-sm font-black text-indigo-900 uppercase tracking-widest mb-2">Product Vision & Strategy</h3>
                        <p class="text-lg font-semibold text-slate-800 leading-relaxed">${vision}</p>
                    </div>
                    ${showManagement ? `
                        <button onclick="editVision()" class="cms-btn cms-btn-secondary text-xs px-3 py-1.5" title="Edit Vision">
                            ✏️ Edit
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    } else if (showManagement) {
        visionHtml = `
            <div class="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 mb-8 text-center">
                <div class="text-4xl mb-2">🌟</div>
                <p class="text-slate-600 mb-3">No product vision defined</p>
                <button onclick="editVision()" class="cms-btn cms-btn-secondary text-sm">
                    + Add Vision Statement
                </button>
            </div>
        `;
    }

    // 3. Unified Ribbon Header
    let ribbonHtml = `
        <div id="okr-ribbon" class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <!-- Group 1: Navigation/Breadcrumb -->
            <div class="flex items-center gap-3 px-2">
                <span class="text-xl">🎯</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Quarterly Strategic Alignment</span>
                    <h2 class="text-sm font-black text-slate-800">Objectives & Key Results</h2>
                </div>
            </div>

            <!-- Group 2: Actions -->
            <div class="flex items-center gap-2">
                <div id="okr-next-action-mount">
                    ${(typeof renderPrimaryStageAction === 'function') ? renderPrimaryStageAction('okr') : ''}
                </div>
                
                ${showManagement ? `
                <div class="h-6 w-[1px] bg-slate-200 mx-2"></div>
                <button onclick="openOKREdit()" 
                    class="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 active:scale-95">
                    <span class="text-lg">➕</span> Add OKR
                </button>
                ` : ''}
            </div>
        </div>
    `;

    if (okrs.length === 0) {
        container.innerHTML = visionHtml + headerHtml + `
            <div class="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
                <div class="text-6xl mb-4">🎯</div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">No OKRs Defined</h3>
                <p class="text-slate-600">Define Objectives and Key Results to track strategic progress.</p>
                ${showManagement ? '<p class="text-slate-500 text-sm mt-4">Click "Add OKR" to create your first quarterly objective.</p>' : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = visionHtml + ribbonHtml + `
        <div class="space-y-6">
            ${okrs.map((okr, idx) => renderOkrCard(okr, idx)).join('')}
        </div>
    `;
}

function renderOkrCard(okr, idx) {
    const progress = okr.overallProgress || calculateOKRProgress(okr);
    const progressColor = progress >= 90 ? 'bg-green-500' : progress >= 70 ? 'bg-blue-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500';
    const showManagement = (typeof shouldShowManagement === 'function') ? shouldShowManagement() : false;

    // Management Actions (Edit/Delete buttons)
    const cmsActions = showManagement ? `
        <div class="flex gap-2">
            <button onclick="openOKREdit(${idx})" class="cms-btn cms-btn-secondary text-xs px-3 py-1.5" title="Edit OKR">
                ✏️ Edit
            </button>
            <button onclick="deleteOKR(${idx})" class="cms-btn cms-btn-secondary text-xs px-3 py-1.5 hover:bg-red-50 hover:text-red-600" title="Delete OKR">
                🗑️ Delete
            </button>
        </div>
    ` : '';

    return `
        <div class="bg-white p-3 rounded-lg border-2 border-slate-900 shadow-lg mb-4">
            <!-- Header -->
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${okr.quarter}</span>
                    <h2 class="text-2xl font-bold text-slate-900 mt-1">${okr.objective}</h2>
                    <p class="text-slate-600 mt-1">Owner: ${okr.owner}</p>
                </div>
                <div class="flex flex-col items-end gap-3">
                    ${cmsActions}
                    <div class="text-right">
                        <div class="text-4xl font-black ${progress >= 70 ? 'text-green-600' : 'text-slate-900'}">${progress}%</div>
                        <div class="text-xs text-slate-500 mt-1">Overall Progress</div>
                    </div>
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full bg-slate-200 rounded-full h-3 mb-6">
                <div class="${progressColor} h-3 rounded-full transition-all" style="width: ${progress}%"></div>
            </div>

            <!-- Key Results (Adaptive Density) -->
            <div class="space-y-4">
                <h3 class="font-bold text-slate-900 text-lg mb-3">Key Results</h3>
                ${((typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm') === 'exec') 
                    ? `<div class="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-sm text-slate-500">Key Result details are condensed for Executive overview. Check ROI funnel below for impact.</div>`
                    : okr.keyResults.map(kr => renderKeyResult(kr)).join('')}
            </div>

            <!-- Linked Items -->
            ${renderLinkedItems(okr)}
        </div>
    `;
}

function renderKeyResult(kr) {
    const progressColor = kr.progress >= 100 ? 'bg-green-500' : kr.progress >= 70 ? 'bg-blue-500' : kr.progress >= 50 ? 'bg-amber-500' : 'bg-orange-500';
    const statusBadge = kr.status === 'achieved' ? '✅' : kr.status === 'on-track' ? '🟢' : kr.status === 'at-risk' ? '🟡' : '🔴';

    return `
        <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${statusBadge}</span>
                        <p class="font-semibold text-slate-900">${kr.description}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-xl font-bold text-slate-900">${kr.current} / ${kr.target}</span>
                    <span class="text-sm text-slate-600 ml-1">${kr.unit}</span>
                </div>
            </div>

            <div class="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div class="${progressColor} h-2 rounded-full transition-all" style="width: ${kr.progress}%"></div>
            </div>

            ${kr.linkedEpic ? `<div class="text-xs text-slate-500 mt-2">🔗 Linked to Epic: ${kr.linkedEpic}</div>` : ''}
        </div>
    `;
}

function renderLinkedItems(okr) {
    const data = window.UPDATE_DATA || {};
    const okrId = okr.id;

    // 1. Find Linked Epics
    const epics = (data.metadata?.epics || []).filter(e => e.linkedOKR === okrId);

    // 2. Find Linked Roadmap Horizons
    const horizons = (data.metadata?.roadmap || []).filter(h => h.linkedObjective === okrId);

    // 3. Find Linked Sprints
    const sprints = (data.metadata?.sprints || []).filter(s => s.linkedOKR === okrId);

    // 4. Find Linked Releases
    const releases = (data.metadata?.releases || []).filter(r => r.linkedOKR === okrId);

    // 5. Find all individual tasks linked to the epics of this OKR (for progress)
    const epicIds = epics.map(e => e.id);
    const tasks = [];
    (data.tracks || []).forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (epicIds.includes(item.epicId)) {
                    tasks.push(item);
                }
            });
        });
    });

    const hasLinkedContent = epics.length > 0 || horizons.length > 0 || sprints.length > 0 || releases.length > 0;

    if (!hasLinkedContent) return `
        <div class="mt-6 pt-6 border-t border-slate-100 italic text-sm text-slate-400">
            No specific execution artifacts linked yet. Use the Epics or Roadmap views to align work to this objective.
        </div>
    `;

    const mode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';
    
    // PERSONA-AWARE DENSITY SHIFT
    // Exec: focus on ROI & Roadmap (Horizons & Releases)
    // Dev: focus on Execution (Epics & Sprints)
    // PM: focus on everything
    
    const showEpics = mode === 'pm' || mode === 'dev';
    const showHorizons = mode === 'pm' || mode === 'exec';
    const showSprints = mode === 'pm' || mode === 'dev';
    const showReleases = mode === 'pm' || mode === 'exec';

    return `
        <div class="mt-4 pt-4 border-t border-slate-900/10">
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Strategic Alignment Funnel</h4>
                <div class="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-widest">${mode} Perspective</div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Supporting Epics -->
                <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 ${!showEpics ? 'opacity-40 grayscale' : ''}">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-2">Supporting Epics</div>
                    ${showEpics ? (epics.length > 0 ? epics.map(e => `
                        <div class="flex items-center gap-2 mb-1.5 last:mb-0">
                            <div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            <span class="text-xs font-bold text-slate-700 truncate">${e.name}</span>
                        </div>
                    `).join('') : '<div class="text-[10px] text-slate-300 italic">None linked</div>') : '<div class="text-[10px] text-slate-400">Hidden in Exec view</div>'}
                </div>

                <!-- Roadmap Horizons -->
                <div class="bg-indigo-50/30 p-3 rounded-lg border border-indigo-100 ${!showHorizons ? 'opacity-40 grayscale' : ''}">
                    <div class="text-[10px] font-black text-indigo-400 uppercase mb-2">Roadmap Alignment</div>
                    ${showHorizons ? (horizons.length > 0 ? horizons.map(h => `
                        <div class="flex items-center gap-2 mb-1.5 last:mb-0">
                            <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <span class="text-xs font-bold text-indigo-900 truncate">${h.label}</span>
                        </div>
                    `).join('') : '<div class="text-[10px] text-indigo-300 italic">None linked</div>') : '<div class="text-[10px] text-slate-400">Hidden in Dev view</div>'}
                </div>

                <!-- Active Sprints -->
                <div class="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100 ${!showSprints ? 'opacity-40 grayscale' : ''}">
                    <div class="text-[10px] font-black text-emerald-500 uppercase mb-2">Targeted Sprints</div>
                    ${showSprints ? (sprints.length > 0 ? sprints.map(s => `
                        <div class="flex items-center gap-2 mb-1.5 last:mb-0">
                            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span class="text-xs font-bold text-emerald-900 truncate">${s.name}</span>
                        </div>
                    `).join('') : '<div class="text-[10px] text-emerald-300 italic">None linked</div>') : '<div class="text-[10px] text-slate-400">Hidden in Exec view</div>'}
                </div>

                <!-- Targeted Releases -->
                <div class="bg-amber-50/30 p-3 rounded-lg border border-amber-100 ${!showReleases ? 'opacity-40 grayscale' : ''}">
                    <div class="text-[10px] font-black text-amber-500 uppercase mb-2">Strategic Releases</div>
                    ${showReleases ? (releases.length > 0 ? releases.map(r => `
                        <div class="flex items-center gap-2 mb-1.5 last:mb-0">
                            <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                            <span class="text-xs font-bold text-amber-900 truncate">${r.name}</span>
                        </div>
                    `).join('') : '<div class="text-[10px] text-amber-300 italic">None linked</div>') : '<div class="text-[10px] text-slate-400">Hidden in Dev view</div>'}
                </div>
            </div>

            <!-- Execution Status -->
            ${tasks.length > 0 ? `
                <div class="mt-4 p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Pulse</div>
                        <div class="flex items-center gap-2">
                             <div class="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                <div class="h-full bg-indigo-500" style="width: ${Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%"></div>
                             </div>
                             <span class="text-[10px] font-bold text-slate-600">${Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}% Tasks Done</span>
                        </div>
                    </div>
                    <div class="text-[10px] font-bold text-slate-400">${tasks.length} total tasks across linked epics</div>
                </div>
            ` : ''}
        </div>
    `;
}

function calculateOKRProgress(okr) {
    if (!okr.keyResults || okr.keyResults.length === 0) return 0;

    const totalProgress = okr.keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0);
    return Math.round(totalProgress / okr.keyResults.length);
}

// Vision Management Function
function editVision() {
    const vision = UPDATE_DATA.metadata?.vision || '';
    const editContext = { type: 'vision' };

    if (typeof openCmsModal === 'function') {
        document.getElementById('modal-title').innerText = 'Edit Product Vision & Strategy';
        document.getElementById('modal-form').innerHTML = `
            <div>
                <label class="block text-sm font-bold mb-2 text-slate-700">Vision Statement</label>
                <textarea id="edit-vision-text" class="cms-input" rows="4" placeholder="e.g., Become the #1 platform for...">${vision}</textarea>
                <p class="text-xs text-slate-500 mt-2">Define your ultimate long-term goal. This guides all OKRs and strategic initiatives.</p>
            </div>
        `;
        document.getElementById('cms-modal').classList.add('active');

        // Store edit context globally
        window._visionEditContext = editContext;
    } else {
        // Fallback for if CMS not loaded
        const newVision = prompt('Enter Product Vision:', vision);
        if (newVision !== null) {
            UPDATE_DATA.metadata.vision = newVision.trim();
            renderOkrView();
        }
    }
}

// Export
window.renderOkrView = renderOkrView;
window.editVision = editVision;
