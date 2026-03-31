// ========================================
// OKR (Objectives & Key Results) MODULE
// ========================================
// View and manage OKRs with auto-progress from linked items

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

    if (okrs.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
                <div class="text-6xl mb-4">🎯</div>
                <h3 class="text-xl font-bold text-slate-900 mb-2">No OKRs Defined</h3>
                <p class="text-slate-600">Define Objectives and Key Results to track strategic progress.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="space-y-6">
            ${okrs.map(okr => renderOkrCard(okr)).join('')}
        </div>
    `;
}

function renderOkrCard(okr) {
    const progress = okr.overallProgress || calculateOKRProgress(okr);
    const progressColor = progress >= 90 ? 'bg-green-500' : progress >= 70 ? 'bg-blue-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500';

    return `
        <div class="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
            <!-- Header -->
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${okr.quarter}</span>
                    <h2 class="text-2xl font-bold text-slate-900 mt-1">${okr.objective}</h2>
                    <p class="text-slate-600 mt-1">Owner: ${okr.owner}</p>
                </div>
                <div class="text-right">
                    <div class="text-4xl font-black ${progress >= 70 ? 'text-green-600' : 'text-slate-900'}">${progress}%</div>
                    <div class="text-xs text-slate-500 mt-1">Overall Progress</div>
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

// Export
window.renderOkrView = renderOkrView;
