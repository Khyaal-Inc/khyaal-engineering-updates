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
// STATE
let showExecExecutionDetails = false;

// Helpers for lifecycle and visibility
function getOkrLifecycleStage(progress) {
    if (progress === 0) return { label: 'Discovery', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: '🔍' };
    if (progress <= 10) return { label: 'Vision', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: '🌟' };
    if (progress <= 30) return { label: 'Definition', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: '📐' };
    if (progress <= 95) return { label: 'Delivery', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: '🚀' };
    return { label: 'Review', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: '🏁' };
}

function toggleExecDetail() {
    showExecExecutionDetails = !showExecExecutionDetails;
    if (typeof renderOkrView === 'function') renderOkrView();
}

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
                        <h3 class="text-sm font-semibold text-indigo-900 mb-2">Product Vision & Strategy</h3>
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
                    <span class="text-[10px] font-medium text-slate-400">Quarterly Strategic Alignment</span>
                    <h2 class="text-sm font-bold text-slate-800">Objectives & Key Results</h2>
                </div>
                ${typeof renderInfoButton === 'function' ? renderInfoButton('okr') : ''}
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
    ribbonHtml += typeof renderInfoCardContainer === 'function' ? renderInfoCardContainer('okr') : '';

    if (okrs.length === 0) {
        container.innerHTML = visionHtml + ribbonHtml + `
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
    const progressColor = progress >= 90 ? 'bg-emerald-500' : progress >= 70 ? 'bg-blue-500' : progress >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    const showManagement = (typeof shouldShowManagement === 'function') ? shouldShowManagement() : false;
    const mode = (typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm');
    const stage = getOkrLifecycleStage(progress);
    
    // Check if OKR is closed
    const isClosed = okr.status === 'closed' || ['achieved', 'missed', 'cancelled'].includes(okr.status);
    const isLaunched = !isClosed && !!okr.launchedAt;
    const isPreLaunch = !isClosed && !okr.launchedAt;

    // Ribbon config
    const okrRibbonText = isClosed ? (okr.result || 'closed') : isLaunched ? 'Active' : 'Draft';
    const okrRibbonClass = isClosed
        ? (okr.result === 'achieved' ? 'ribbon-achieved' : okr.result === 'missed' ? 'ribbon-missed' : 'ribbon-cancelled')
        : isLaunched ? 'ribbon-active' : 'ribbon-planned';

    // Management Actions
    const cmsActions = showManagement ? `
        <div class="flex gap-1.5">
            <button onclick="openOKREdit(${idx})" class="item-action-btn edit">Edit</button>
            <button onclick="deleteOKR(${idx})" class="item-action-btn delete">Delete</button>
            ${isClosed
                ? `<button onclick="viewCeremonyAudit('okr', '${okr.id}')" class="item-action-btn neutral no-disable">📜 Audit</button>`
                : isPreLaunch
                    ? `<button onclick="launchOKR(${idx})" class="item-action-btn lifecycle no-disable">🎯 Launch Quarter</button>`
                    : `<button onclick="closeOKR(${idx})" class="item-action-btn lifecycle no-disable">🏁 Close OKR</button>`
            }
        </div>
    ` : '';

    const isExec = mode === 'exec';

    return `
        <div class="bg-white rounded-2xl border border-slate-300 shadow-md hover:shadow-xl transition-all mb-6 overflow-hidden okr-card-hover corner-ribbon-wrap ${isClosed ? 'lifecycle-closed' : ''}">
            <div class="corner-ribbon ${okrRibbonClass}">${okrRibbonText}</div>
            <!-- Top Status Bar -->
            <div class="h-1 w-full ${progressColor} opacity-80"></div>
            
            <div class="p-6">
                <!-- Header: Lifecycle + Meta -->
                <div class="flex justify-between items-start mb-4">
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center gap-3">
                            <div class="px-2.5 py-1 rounded-full text-[10px] font-semibold border ${stage.color} flex items-center gap-1.5">
                                <span>${stage.icon}</span> ${stage.label} Stage
                            </div>
                            <span class="text-[10px] font-medium text-slate-500">${okr.quarter}</span>
                            ${isClosed ? `<span class="lifecycle-closed-badge">✓ ${(okr.result || 'closed').toUpperCase()}</span>` : ''}
                        </div>
                        <h2 class="text-xl font-bold text-slate-900 tracking-tight leading-tight mt-1">${okr.objective}</h2>
                        ${okr.result ? `<div class="mt-2 p-3 bg-slate-50 border-l-4 border-slate-900 text-xs text-slate-700 italic font-medium"><span class="font-black not-italic text-slate-900">Result:</span> ${okr.result}</div>` : ''}
                        <div class="flex items-center gap-2 mt-1">
                            <div class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">👤</div>
                            <span class="text-xs font-bold text-slate-600">${okr.owner}</span>
                        </div>
                    </div>
                    
                    <div class="flex flex-col items-end gap-4">
                        ${cmsActions}
                        <div class="relative flex items-center justify-center w-16 h-16">
                            <svg class="w-full h-full transform -rotate-90">
                                <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="4" fill="transparent" class="text-slate-100" />
                                <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="4" fill="transparent" 
                                    stroke-dasharray="${2 * Math.PI * 28}" 
                                    stroke-dashoffset="${2 * Math.PI * 28 * (1 - progress / 100)}" 
                                    class="${progress >= 70 ? 'text-emerald-500' : 'text-indigo-500'} transition-all duration-1000" />
                            </svg>
                            <span class="absolute text-sm font-bold text-slate-900">${progress}%</span>
                        </div>
                    </div>
                </div>

                <!-- Strategic Summary (Executive Only) -->
                ${isExec && !showExecExecutionDetails ? `
                    <div class="bg-indigo-50/30 rounded-xl p-5 border border-indigo-200 mb-6">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-[10px] font-medium text-indigo-900/60">Strategic Pulse & ROI Insight</h4>
                            <button onclick="toggleExecDetail()" class="text-[10px] font-medium text-indigo-600 hover:text-indigo-800">
                                View Execution Details →
                            </button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 border border-indigo-100/50 rounded-lg overflow-hidden bg-white/50">
                            <div class="p-4 border-r border-indigo-100/50 space-y-1">
                                <div class="text-[10px] font-medium text-slate-400">Focus Area</div>
                                <div class="text-xs font-medium text-slate-700">${okr.keyResults[0]?.description.split(' ').slice(0, 3).join(' ')}...</div>
                            </div>
                            <div class="p-4 border-r border-indigo-100/50 space-y-1">
                                <div class="text-[10px] font-medium text-slate-400">Strategic Drift</div>
                                <div class="text-xs font-medium text-emerald-600 flex items-center gap-1.5 leading-none">
                                    <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Healthy / On-Track
                                </div>
                            </div>
                            <div class="p-4 space-y-1">
                                <div class="text-[10px] font-medium text-slate-400">Target Outcome</div>
                                <div class="text-xs font-medium text-slate-700">${okr.keyResults.length} Key Results Active</div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Key Results (Curated or Exhaustive) -->
                <div class="space-y-3">
                    ${(!isExec || showExecExecutionDetails) ? `
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest">Key Results</h3>
                            ${isExec ? `<button onclick="toggleExecDetail()" class="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">← Back to Overview</button>` : ''}
                        </div>
                        ${okr.keyResults.map(kr => renderKeyResult(kr)).join('')}
                    ` : ''}
                </div>

                <!-- Linked Items (Funnel) -->
                ${renderLinkedItems(okr, isExec && !showExecExecutionDetails)}
            </div>
        </div>
    `;
}

function renderKeyResult(kr) {
    const progressColor = kr.progress >= 100 ? 'bg-emerald-500' : kr.progress >= 70 ? 'bg-blue-500' : kr.progress >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    const statusSign = kr.status === 'achieved' ? 'text-emerald-500' : kr.status === 'on-track' ? 'text-blue-500' : kr.status === 'at-risk' ? 'text-amber-500' : 'text-rose-500';

    return `
        <div class="group p-4 bg-slate-50/50 hover:bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all">
            <div class="flex justify-between items-center gap-4">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-1.5 h-1.5 rounded-full ${kr.status === 'achieved' ? 'bg-emerald-500' : 'bg-blue-400 group-hover:animate-pulse'}"></div>
                    <p class="font-bold text-slate-800 text-sm truncate tracking-tight">${kr.description}</p>
                </div>
                <div class="flex items-center gap-4 shrink-0">
                    <div class="text-right">
                        <span class="text-xs font-black text-slate-900 tracking-tight">${kr.current} / ${kr.target}</span>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-0.5">${kr.unit}</span>
                    </div>
                    <div class="w-32 bg-slate-200 border border-slate-300/50 rounded-full h-2 relative overflow-hidden">
                        <div class="${progressColor} h-full rounded-full transition-all duration-1000" style="width: ${kr.progress}%"></div>
                    </div>
                </div>
            </div>
            ${kr.linkedEpic ? `
                <div class="flex items-center gap-1.5 mt-2 ml-4 opacity-80 group-hover:opacity-100 transition-opacity">
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Impact Source:</span>
                    <span class="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 cursor-pointer transition-colors">${kr.linkedEpic}</span>
                </div>
            ` : ''}
        </div>
    `;
}

function renderLinkedItems(okr, isCondensed = false) {
    const data = window.UPDATE_DATA || {};
    const okrId = okr.id;

    // 1. Find Linked items
    const epics = (data.metadata?.epics || []).filter(e => e.linkedOKR === okrId);
    const horizons = (data.metadata?.roadmap || []).filter(h => h.linkedObjective === okrId);
    const sprints = (data.metadata?.sprints || []).filter(s => s.linkedOKR === okrId);
    const releases = (data.metadata?.releases || []).filter(r => r.linkedOKR === okrId);

    // 5. Find tasks for Execution Pulse (only if not condensed)
    let tasks = [];
    if (!isCondensed) {
        const epicIds = epics.map(e => e.id);
        (data.tracks || []).forEach(track => {
            track.subtracks.forEach(subtrack => {
                subtrack.items.forEach(item => {
                    if (epicIds.includes(item.epicId)) tasks.push(item);
                });
            });
        });
    }

    const hasLinkedContent = epics.length > 0 || horizons.length > 0 || sprints.length > 0 || releases.length > 0;
    if (!hasLinkedContent) return '';

    const mode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';
    
    // Adaptive visibility: if condensed (Exec view), hide epics/sprints entirely
    const showEpics = !isCondensed && (mode === 'pm' || mode === 'dev');
    const showHorizons = mode === 'pm' || mode === 'exec';
    const showSprints = !isCondensed && (mode === 'pm' || mode === 'dev');
    const showReleases = mode === 'pm' || mode === 'exec';

    return `
        <div class="mt-8 pt-6 border-t border-slate-300">
            <div class="flex justify-between items-center mb-5">
                <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Strategic Alignment Funnel</h4>
                <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest">${mode} Perspective</div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <!-- Roadmap Alignment -->
                ${showHorizons ? `
                    <div class="bg-indigo-50/20 p-4 rounded-xl border border-indigo-200 shadow-sm">
                        <div class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3">Planning Horizon</div>
                        ${horizons.length > 0 ? horizons.map(h => `
                            <div class="flex items-center gap-2.5 mb-2 last:mb-0">
                                <div class="w-1.5 h-3 rounded-full bg-indigo-500"></div>
                                <span class="text-xs font-bold text-indigo-900 truncate">${h.label}</span>
                            </div>
                        `).join('') : '<div class="text-[10px] text-slate-400 italic font-bold">Unscheduled</div>'}
                    </div>
                ` : ''}

                <!-- Strategic Releases -->
                ${showReleases ? `
                    <div class="bg-purple-50/20 p-4 rounded-xl border border-purple-200 shadow-sm">
                        <div class="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-3">Targeted Releases</div>
                        ${releases.length > 0 ? releases.map(r => `
                            <div class="flex items-center gap-2.5 mb-2 last:mb-0">
                                <span class="text-xs">📦</span>
                                <span class="text-xs font-bold text-purple-900 truncate">${r.name}</span>
                            </div>
                        `).join('') : '<div class="text-[10px] text-slate-400 italic">No release linked</div>'}
                    </div>
                ` : ''}

                <!-- Supporting Epics -->
                ${showEpics ? `
                    <div class="bg-blue-50/20 p-4 rounded-xl border border-blue-200 shadow-sm">
                        <div class="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3">Supporting Epics</div>
                        ${epics.length > 0 ? epics.map(e => `
                            <div class="flex items-center gap-2.5 mb-2 last:mb-0">
                                <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                <span class="text-xs font-bold text-blue-900 truncate">${e.name}</span>
                            </div>
                        `).join('') : '<div class="text-[10px] text-slate-400 italic">None linked</div>'}
                    </div>
                ` : ''}

                <!-- Active Sprints -->
                ${showSprints ? `
                    <div class="bg-emerald-50/20 p-4 rounded-xl border border-emerald-200 shadow-sm">
                        <div class="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-3">Execution Sprints</div>
                        ${sprints.length > 0 ? sprints.map(s => `
                            <div class="flex items-center gap-2.5 mb-2 last:mb-0">
                                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 anim-ping"></div>
                                <span class="text-xs font-bold text-emerald-900 truncate">${s.name}</span>
                            </div>
                        `).join('') : '<div class="text-[10px] text-slate-400 italic">None active</div>'}
                    </div>
                ` : ''}
            </div>

            <!-- Execution Status Pulse -->
            ${!isCondensed && tasks.length > 0 ? `
                <div class="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-md">
                    <div class="flex items-center gap-6">
                        <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                             <div class="w-2 h-2 rounded-full bg-indigo-500"></div> Execution Pulse
                        </div>
                        <div class="flex items-center gap-3">
                             <div class="h-2.5 w-48 bg-slate-100 rounded-full overflow-hidden border border-slate-300/50 shadow-inner">
                                <div class="h-full bg-indigo-600 transition-all duration-1000" style="width: ${Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%"></div>
                             </div>
                             <span class="text-[10px] font-black text-slate-800">${Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}% Momentum</span>
                        </div>
                    </div>
                    <div class="text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                        ${tasks.length} Operational Units
                    </div>
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

/**
 * Recalculates overallProgress for a given OKR from actual task completion.
 * Walks: epic.linkedOKR → item.epicId → item.status === 'done'
 * Also nudges kr.current for any KR that has a linkedEpic.
 *
 * Returns the new progress value (0–100), or null if OKR not found.
 * Mutates UPDATE_DATA in-place — caller must call saveToLocalStorage() / saveToGithub().
 */
function recalcOKRProgress(okrId) {
    const data = window.UPDATE_DATA
    const okr = (data.metadata?.okrs || []).find(o => o.id === okrId)
    if (!okr) return null

    // Collect all epics that point to this OKR
    const linkedEpicIds = new Set(
        (data.metadata?.epics || [])
            .filter(e => e.linkedOKR === okrId)
            .map(e => e.id)
    )
    if (linkedEpicIds.size === 0) return null

    // Collect all tasks under those epics
    let totalTasks = 0
    let doneTasks = 0
    ;(data.tracks || []).forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (!linkedEpicIds.has(item.epicId)) return
                totalTasks++
                if (item.status === 'done') doneTasks++
            })
        })
    })

    if (totalTasks === 0) return null

    const newProgress = Math.round((doneTasks / totalTasks) * 100)
    okr.overallProgress = newProgress

    // Nudge kr.current for KRs that have a linkedEpic within scope
    ;(okr.keyResults || []).forEach(kr => {
        if (!kr.linkedEpic || !linkedEpicIds.has(kr.linkedEpic)) return
        // Count done tasks for the specific epic this KR tracks
        let krTotal = 0
        let krDone = 0
        ;(data.tracks || []).forEach(track => {
            track.subtracks.forEach(subtrack => {
                subtrack.items.forEach(item => {
                    if (item.epicId !== kr.linkedEpic) return
                    krTotal++
                    if (item.status === 'done') krDone++
                })
            })
        })
        if (krTotal > 0 && typeof kr.target === 'number') {
            kr.current = Math.round((krDone / krTotal) * kr.target)
            kr.progress = Math.round((krDone / krTotal) * 100)
        }
    })

    return newProgress
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
window.toggleExecDetail = toggleExecDetail;
window.recalcOKRProgress = recalcOKRProgress;
