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
                if (['now', 'ongoing'].includes(item.status)) {
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
    
    // 4. Initial Render - Default to Epics View
    console.log('🎨 Initial render - defaulting to epics view');
    switchView('epics'); // Default to epics view
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

    document.getElementById('page-title').textContent = meta.title;
    document.getElementById('page-date').textContent = meta.dateRange;
    document.getElementById('page-desc').textContent = meta.description;
    document.getElementById('footer-text').textContent = `${meta.title} • ${meta.dateRange}`;

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