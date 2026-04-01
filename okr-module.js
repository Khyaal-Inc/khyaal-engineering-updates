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
            <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200 shadow-sm mb-8">
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

    // Management Header (Add OKR button)
    let headerHtml = showManagement ? `
        <div class="flex justify-between items-center mb-6">
            <button onclick="openOKREdit()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-md flex items-center gap-2">
                <span>🎯</span> Add OKR
            </button>
        </div>
    ` : '';

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

    container.innerHTML = visionHtml + headerHtml + `
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
        <div class="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
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

            <!-- Key Results -->
            <div class="space-y-4">
                <h3 class="font-bold text-slate-900 text-lg mb-3">Key Results</h3>
                ${okr.keyResults.map(kr => renderKeyResult(kr)).join('')}
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
    // Find all items linked to this OKR's epics
    const linkedEpics = okr.keyResults.map(kr => kr.linkedEpic).filter(Boolean);
    const items = [];

    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (linkedEpics.includes(item.epicId)) {
                    items.push({ ...item, track: track.name });
                }
            });
        });
    });

    if (items.length === 0) return '';

    const doneCount = items.filter(i => i.status === 'done').length;
    const totalCount = items.length;
    const completionRate = Math.round((doneCount / totalCount) * 100);

    return `
        <div class="mt-6 pt-6 border-t border-slate-200">
            <div class="flex justify-between items-center mb-3">
                <h4 class="font-bold text-slate-900">Linked Items</h4>
                <span class="text-sm text-slate-600">${doneCount}/${totalCount} completed (${completionRate}%)</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                ${items.slice(0, 6).map(item => `
                    <div class="text-sm p-2 bg-white rounded border border-slate-200">
                        <div class="flex justify-between items-start">
                            <span class="font-medium text-slate-900">${item.text}</span>
                            <span class="ml-2 text-xs ${item.status === 'done' ? 'text-green-600' : 'text-slate-500'}">${item.status}</span>
                        </div>
                        ${item.storyPoints ? `<div class="text-xs text-slate-500 mt-1">${item.storyPoints} pts</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ${items.length > 6 ? `<div class="text-sm text-slate-500 mt-2">+ ${items.length - 6} more items</div>` : ''}
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
