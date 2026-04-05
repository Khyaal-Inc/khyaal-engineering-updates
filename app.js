// app.js - Dashboard Entry Point & Data Orchestrator

// ------ DATA NORMALIZATION ------
function normalizeData() {
    if (!UPDATE_DATA) return;

    // 1. Populate Global Team Filter if it exists
    const filterEl = document.getElementById('global-team-filter');
    if (filterEl && !filterEl.dataset.populated) {
        const teams = Array.from(new Set(UPDATE_DATA.tracks.filter(tr => tr.name).map(tr => tr.name)));
        if (teams.length > 0) {
            const currentVal = filterEl.value;
            filterEl.innerHTML = '<option value="">🌍 All Tracks</option>' + teams.map(n => `<option value="${n}" ${n === currentVal ? 'selected' : ''}>${n}</option>`).join('');
            filterEl.dataset.populated = "true";
        }
    }

    // 2. Load Custom Statuses into Global Config
    if (UPDATE_DATA.metadata && UPDATE_DATA.metadata.customStatuses) {
        UPDATE_DATA.metadata.customStatuses.forEach(cs => {
            statusConfig[cs.id] = { label: cs.label, class: cs.class, bucket: cs.bucket };
        });
    }

    // 3. Ensure every item has a unique ID and common fields
    UPDATE_DATA.tracks.forEach((track, trackIndex) => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach((item, index) => {
                // Ensure unique ID
                if (!item.id) {
                    const safeTrackId = (track.id || track.name || 'track').toLowerCase().replace(/\s/g, '');
                    const safeSubtrackName = (subtrack.name || 'sub').toLowerCase().replace(/\s/g, '-');
                    item.id = `${safeTrackId}-${safeSubtrackName}-${index}`;
                }

                // Clean up default dates for next/later if they are from a previous session's template
                if (['next', 'later'].includes(item.status)) {
                    if (item.startDate === '2026-03-20') delete item.startDate;
                    if (item.due === '2026-03-27') delete item.due;
                }

                // Auto-assign today's date if missing for active tasks
                if (item.status === 'now') {
                    if (!item.startDate) item.startDate = new Date().toISOString().split('T')[0];
                }
            });
        });
    });
}

// ------ CORE APP INITIALIZATION ------
// This is called by index.html after a successful basic auth login
function initDashboard() {
    console.log('🚀 initDashboard() called');
    console.log('📊 UPDATE_DATA:', UPDATE_DATA);

    if (!UPDATE_DATA) {
        console.error('❌ UPDATE_DATA is null or undefined');
        return;
    }

    // 1. Sync metadata to UI
    console.log('🔄 Syncing metadata to UI...');
    syncMetadataToUI();

    // 2. Prep data structures
    console.log('🔧 Normalizing data...');
    normalizeData();

    // 3. Build contributor list
    console.log('👥 Building contributor list...');
    buildContributorList(); // from core.js

    // 4. Setup global behaviors
    console.log('⚙️ Setting up global behaviors...');
    setupKeyboardShortcuts(); // from core.js
    initCms(); // from cms.js

    // 5. Initialize Mode System
    console.log('🎭 Initializing mode system...');
    if (typeof initModeSystem === 'function') {
        initModeSystem(); // from modes.js
    }

    // 5a. Initialize Onboarding Wizard (shows if needed)
    console.log('🧙 Checking for onboarding wizard...');
    if (typeof initWizard === 'function') {
        initWizard(); // from wizard.js
    }

    // 5b. Initialize Workflow Navigation
    console.log('🗺️ Initializing workflow navigation...');
    if (typeof initWorkflowNav === 'function') {
        initWorkflowNav(); // from workflow-nav.js
    }

    // 6. Initial Render - Default to mode-specific view
    console.log('🎨 Initial render - defaulting to mode view');
    const mode = getCurrentMode();
    const defaultView = mode === 'pm' ? 'okr' :
        mode === 'dev' ? 'my-tasks' :
            mode === 'exec' ? 'dashboard' : 'okr';
    switchView(defaultView);
    renderTrackView(); // from views.js
    updateBacklogBadge(); // from cms.js
    buildTagFilterBar(); // from core.js
    updateTabCounts(); // from core.js
    renderBlockerStrip(); // from core.js

    console.log('✅ Dashboard initialization complete');
}

function syncMetadataToUI() {
    const meta = UPDATE_DATA.metadata;
    if (!meta) return;

    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = meta.title;

    const dateEl = document.getElementById('page-date');
    if (dateEl) dateEl.textContent = meta.dateRange;

    const descEl = document.getElementById('page-desc');
    if (descEl) descEl.textContent = meta.description;

    const footerEl = document.getElementById('footer-text');
    if (footerEl) footerEl.textContent = `${meta.title} • ${meta.dateRange}`;

    if (meta.nextReview) {
        const footerNext = document.getElementById('footer-next');
        if (footerNext) footerNext.textContent = `Next Review: ${meta.nextReview}`;
    }
}

// Helper: Update backog badge (needed for initial load)
function updateBacklogBadge() {
    let count = 0;
    UPDATE_DATA.tracks.forEach(t => {
        const bl = t.subtracks.find(s => s.name === 'Backlog');
        if (bl) count += bl.items.length;
    });
    const badge = document.getElementById('backlog-tab-badge');
    if (badge) {
        badge.textContent = count > 0 ? count : '';
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
}

// ------ DATE FILTERS (Extended) ------
function applyDatePreset() {
    const preset = document.getElementById('date-range-preset').value;
    const customInputs = document.getElementById('custom-date-inputs');
    if (customInputs) customInputs.classList.toggle('hidden', preset !== 'custom');

    // Re-render current view with new date filters
    const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    switchView(currentView);
}

function filterData() {
    const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    switchView(currentView);
}

// ------ Gantt Export Helper ------
function exportGantt() {
    const container = document.getElementById('gantt-chart-container');
    const svg = container.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.download = `gantt_chart_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

// ------ Data Export (CSV) ------
function exportData(type) {
    if (type !== 'csv') return;

    const activeTeam = (typeof getActiveTeam === 'function') ? getActiveTeam() : '';
    const rows = [["Track", "Subtrack", "Task", "Status", "Priority", "Owner", "Due"]];

    UPDATE_DATA.tracks.forEach(track => {
        if (activeTeam && activeTeam !== track.name) return;
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                const searchMatch = (typeof isItemInSearch === 'function') ? isItemInSearch(item) : true;
                const dateMatch = (typeof isItemInDateRange === 'function') ? isItemInDateRange(item) : true;

                if (searchMatch && dateMatch) {
                    rows.push([
                        track.name,
                        subtrack.name,
                        item.text,
                        item.status,
                        item.priority,
                        (item.contributors || []).join('; '),
                        item.due || ''
                    ]);
                }
            });
        });
    });

    let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `khyaal_engineering_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ------ Slack Digest Generator ------
function generateDigest() {
    const activeTeam = (typeof getActiveTeam === 'function') ? getActiveTeam() : '';
    let stats = { done: 0, now: 0, blocked: 0 };
    let recentDone = [];
    let highPriority = [];

    UPDATE_DATA.tracks.forEach(track => {
        if (activeTeam && activeTeam !== track.name) return;
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                const searchMatch = (typeof isItemInSearch === 'function') ? isItemInSearch(item) : true;
                const dateMatch = (typeof isItemInDateRange === 'function') ? isItemInDateRange(item) : true;

                if (searchMatch && dateMatch) {
                    if (item.status === 'done') {
                        stats.done++;
                        recentDone.push(`• ${item.text} (${track.name})`);
                    } else if (item.status === 'now') {
                        stats.now++;
                        if (item.priority === 'high') {
                            highPriority.push(`• ${item.text} [${item.status.toUpperCase()}]`);
                        }
                    }
                    if (item.blocker) stats.blocked++;
                }
            });
        });
    });

    let digest = `🚀 *Engineering Update Digest* ${activeTeam ? `for ${activeTeam}` : ''}\n\n`;
    digest += `✅ *Completed:* ${stats.done}\n`;
    digest += `⚡ *Active:* ${stats.now}\n`;
    digest += `🚨 *Blockers:* ${stats.blocked}\n\n`;

    if (recentDone.length > 0) {
        digest += `*Highlights:* \n${recentDone.slice(0, 5).join('\n')}\n\n`;
    }

    if (highPriority.length > 0) {
        digest += `*Critical Focus:* \n${highPriority.slice(0, 5).join('\n')}\n\n`;
    }

    digest += `🔗 View full dashboard for details.`;

    // Create temporary modal to show the digest
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-8 animate-scale-in">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h3 class="text-2xl font-black text-slate-900">Engineering Digest</h3>
                    <p class="text-slate-500 text-sm font-medium mt-1">Copy this to your Slack channel</p>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <textarea id="digest-textarea" readonly class="w-full h-80 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-mono text-slate-700 mb-6 focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all">${digest}</textarea>
            <div class="flex gap-3">
                <button onclick="const ta = document.getElementById('digest-textarea'); ta.select(); navigator.clipboard.writeText(ta.value); this.innerText='Copied!'" class="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl">Copy to Clipboard</button>
                <button onclick="this.closest('.fixed').remove()" class="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}