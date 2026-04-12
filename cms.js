// CMS State variables (will be initialized by auth)
let isCmsMode = false;
let editContext = null;
let _selectedContributors = [];
let _selectedTags = [];
let _selectedDeps = [];
window.isActionLockActive = false; // Management Lock to prevent UI refreshes during modals

// Watchdog: auto-releases the action lock after 30s to prevent silent UI freeze
function _setLockWatchdog() {
    clearTimeout(window._lockWatchdogTimer)
    window._lockWatchdogTimer = setTimeout(() => {
        if (window.isActionLockActive) {
            window.isActionLockActive = false
            console.error('❌ Action lock watchdog fired — lock was held >30s. UI auto-recovered.')
            if (typeof showToast === 'function') showToast('Save may have stalled — UI recovered. Please retry.', 'error')
        }
    }, 30000)
}
function _clearLockWatchdog() {
    clearTimeout(window._lockWatchdogTimer)
}

// CMS Config
const CMS_CONFIG = {
    repoOwner: 'Khyaal-Inc',
    repoName: 'khyaal-engineering-updates',
    filePath: 'data.json'
};

// ========================================
// CMS CORE UTILITIES
// ========================================

/**
 * Standard change logging for strategic visibility
 */

/**
 * Persists a ceremony audit for historical replay
 */
function saveCeremonyAudit(type, targetId, config) {
    if (!UPDATE_DATA.metadata.ceremonyAudits) UPDATE_DATA.metadata.ceremonyAudits = [];
    
    const auditRecord = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: type,
        targetId: targetId,
        config: config
    };

    // Keep history but only the last 3 per entity to avoid bloat
    UPDATE_DATA.metadata.ceremonyAudits.push(auditRecord);
    const entityAudits = UPDATE_DATA.metadata.ceremonyAudits.filter(a => a.targetId === targetId);
    if (entityAudits.length > 3) {
        const oldestIdx = UPDATE_DATA.metadata.ceremonyAudits.indexOf(entityAudits[0]);
        UPDATE_DATA.metadata.ceremonyAudits.splice(oldestIdx, 1);
    }
}

/**
 * Re-plays a historical ceremony audit summary
 */
function viewCeremonyAudit(type, targetId) {
    let auditConfig = null;
    let isHistorical = false;

    if (UPDATE_DATA.metadata.ceremonyAudits) {
        const audits = UPDATE_DATA.metadata.ceremonyAudits.filter(a => a.targetId === targetId && a.type === type);
        if (audits.length > 0) {
            const latestAudit = audits[audits.length - 1];
            auditConfig = { ...latestAudit.config, timestamp: latestAudit.timestamp };
            isHistorical = true;
        }
    }

    // Fallback: If no saved audit, synthesize one from current state
    if (!auditConfig) {
        auditConfig = synthesizeAudit(type, targetId);
    }

    if (auditConfig) {
        renderCeremonySuccess(type, auditConfig, isHistorical);
    } else {
        if (typeof showToast === 'function') showToast('Audit data unavailable for this item.');
    }
}

/**
 * Creates a "synthetic" audit record for items closed before the audit system was live
 */
function synthesizeAudit(type, targetId) {
    if (type === 'okr' || type === 'okr-launch') {
        const okr = UPDATE_DATA.metadata.okrs.find(o => o.id === targetId);
        if (!okr) return null;
        const linkedEpics = (UPDATE_DATA.metadata.epics || []).filter(e => e.linkedOKR === okr.id);
        const completedEpics = linkedEpics.filter(e => e.status === 'completed').length;
        const totalKRs = (okr.keyResults || []).length;
        const achievedKRs = (okr.keyResults || []).filter(kr => kr.status === 'achieved' || (kr.current >= kr.target)).length;
        const linkedSprints = (UPDATE_DATA.metadata.sprints || []).filter(s => s.linkedOKR === okr.id);
        const krItems = (okr.keyResults || []).map(kr => {
            const pct = kr.target ? Math.min(100, Math.round(((kr.current || 0) / kr.target) * 100)) : 0;
            return { name: `${kr.description} · ${kr.current || 0}/${kr.target} ${kr.unit}`, status: pct >= 100 ? 'done' : 'on-track', destination: `${pct}% complete` };
        });
        return {
            title: `${okr.quarter}: ${type === 'okr-launch' ? 'Quarter Launched' : 'OKR Closed'}`,
            description: `Synthesized from current records · ${okr.overallProgress || 0}% progress · ${achievedKRs}/${totalKRs} KRs hit`,
            mission: { objective: okr.objective, track: okr.owner, timeline: okr.quarter },
            details: [
                { label: 'Outcome', count: (okr.result || (type === 'okr-launch' ? 'ACTIVE' : 'ARCHIVED')).toUpperCase(), icon: '🎯' },
                { label: 'Progress', count: `${okr.overallProgress || 0}%`, icon: '📈' },
                { label: 'KR Hit Rate', count: `${achievedKRs} / ${totalKRs}`, icon: '📋' },
                { label: 'Epics', count: `${completedEpics} / ${linkedEpics.length}`, icon: '🚀' }
            ],
            extras: [
                { label: 'Linked Sprints', value: linkedSprints.length },
                { label: 'Strategic Breadth', value: `${new Set(linkedEpics.map(e => e.track).filter(Boolean)).size} tracks` }
            ],
            items: [
                ...krItems,
                ...linkedEpics.map(e => ({ id: e.id, name: e.name, status: e.status, destination: e.status === 'completed' ? 'Delivered' : 'Pending', type: 'epic', lead: okr.owner }))
            ],
            actions: [{ label: 'View OKRs', fn: () => switchView('okr') }, { label: 'View Analytics', fn: () => switchView('analytics') }]
        };
    }
    if (type === 'epic' || type === 'epic-kickoff') {
        const epic = UPDATE_DATA.metadata.epics.find(e => e.id === targetId);
        if (!epic) return null;
        const epicItems = findItemsByMetadataId('epicId', epic.id);
        const doneItems = epicItems.filter(i => i.status === 'done');
        const totalPoints = epicItems.reduce((sum, item) => sum + (parseInt(item.storyPoints) || 0), 0);
        const donePoints = doneItems.reduce((sum, item) => sum + (parseInt(item.storyPoints) || 0), 0);
        const completionPct = epicItems.length ? Math.round((doneItems.length / epicItems.length) * 100) : 0;
        const epicOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === epic.linkedOKR);
        const contrTaskCount = {};
        epicItems.forEach(i => (i.contributors || []).forEach(c => { contrTaskCount[c] = (contrTaskCount[c] || 0) + 1; }));
        const topContributors = Object.entries(contrTaskCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n).join(', ') || 'N/A';
        return {
            title: `${type === 'epic-kickoff' ? 'Epic Kicked Off' : 'Epic Closed'}: ${epic.name}`,
            description: `${completionPct}% complete · ${donePoints}/${totalPoints} SP delivered`,
            mission: {
                objective: epic.successCriteria || epic.description || epic.name,
                track: epicOKR ? `OKR: ${epicOKR.objective.substring(0, 50)}` : (epic.track || 'N/A'),
                timeline: epic.planningHorizon || epic.timeline || 'N/A'
            },
            wins: epic.successMetrics || epic.successCriteria,
            details: [
                { label: 'Stage at State', count: (epic.stage || 'delivery').toUpperCase(), icon: '🚦' },
                { label: 'Task Throughput', count: `${doneItems.length} / ${epicItems.length}`, icon: '📊' },
                { label: 'Points', count: `${donePoints} / ${totalPoints} SP`, icon: '💎' },
                { label: 'Team Size', count: Object.keys(contrTaskCount).length, icon: '👥' }
            ],
            extras: [
                { label: 'Top Contributors', value: topContributors },
                { label: 'Linked OKR', value: epicOKR ? epicOKR.quarter : 'None' },
                { label: 'Epic Health', value: completionPct >= 80 ? 'Healthy' : completionPct >= 50 ? 'At Risk' : 'Critical' }
            ],
            items: epicItems.map(i => ({ id: i.id, name: i.text, status: i.status, destination: i.status === 'done' ? 'Completed' : 'Backlog', type: 'task', lead: (i.contributors || [])[0], points: i.storyPoints })),
            actions: [{ label: 'Return to Epics', fn: () => switchView('epics') }]
        };
    }
    if (type === 'sprint' || type === 'sprint-kickoff') {
        const sprint = UPDATE_DATA.metadata.sprints.find(s => s.id === targetId);
        if (!sprint) return null;
        const sprintItems = findItemsByMetadataId('sprintId', sprint.id);
        const doneItems = sprintItems.filter(i => i.status === 'done');
        const plannedPoints = sprintItems.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);
        const completedPoints = doneItems.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);
        const velocityPct = plannedPoints ? Math.round((completedPoints / plannedPoints) * 100) : 0;
        const durationDays = (sprint.startDate && sprint.endDate)
            ? Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / (1000 * 60 * 60 * 24))
            : null;
        const sprintOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === sprint.linkedOKR);
        const contrTaskCount = {};
        sprintItems.forEach(i => (i.contributors || []).forEach(c => { contrTaskCount[c] = (contrTaskCount[c] || 0) + 1; }));
        const topContributors = Object.entries(contrTaskCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, cnt]) => `${n} (${cnt})`).join(', ') || 'N/A';
        return {
            title: `Sprint ${sprint.name} ${type === 'sprint-kickoff' ? 'Kicked Off' : 'Closed'}`,
            description: `${completedPoints}/${plannedPoints} pts · ${velocityPct}% commitment · ${doneItems.length}/${sprintItems.length} tasks done`,
            mission: {
                objective: sprint.goal || 'No goal defined',
                track: 'Sprint Team',
                timeline: `${sprint.startDate || 'TBD'} → ${sprint.endDate || 'TBD'}${durationDays ? ` (${durationDays}d)` : ''}`
            },
            details: [
                { label: 'Velocity', count: `${completedPoints} / ${plannedPoints} pts`, icon: '⚡' },
                { label: 'Commitment', count: `${velocityPct}%`, icon: '📊' },
                { label: 'Tasks Done', count: `${doneItems.length} / ${sprintItems.length}`, icon: '✅' },
                { label: 'Contributors', count: Object.keys(contrTaskCount).length, icon: '👥' }
            ],
            extras: [
                { label: 'Sprint Duration', value: durationDays ? `${durationDays} days` : 'N/A' },
                { label: 'Top Contributors', value: topContributors },
                { label: 'Blocked at Close', value: sprintItems.filter(i => i.status === 'blocked').length },
                { label: 'OKR Aligned', value: sprintOKR ? sprintOKR.objective.substring(0, 50) : 'None' }
            ],
            items: sprintItems.map(i => ({ id: i.id, name: i.text, status: i.status, destination: i.status === 'done' ? 'Shipped' : 'Rolled', type: 'task', lead: (i.contributors || [])[0], points: i.storyPoints })),
            actions: [{ label: 'Review Analytics', fn: () => switchView('analytics') }, { label: 'Go to Kanban', fn: () => switchView('kanban') }]
        };
    }
    if (type === 'release' || type === 'release-lock') {
        const release = UPDATE_DATA.metadata.releases.find(r => r.id === targetId);
        if (!release) return null;
        const releaseItems = findItemsByMetadataId('releasedIn', targetId);
        const doneItems = releaseItems.filter(i => i.status === 'done');
        const totalPoints = releaseItems.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);
        const releaseOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === release.linkedOKR);
        const epicsInScope = [...new Set(releaseItems.filter(i => i.epicId).map(i => i.epicId))]
            .map(eid => (UPDATE_DATA.metadata.epics || []).find(e => e.id === eid)).filter(Boolean);
        return {
            title: `${type === 'release-lock' ? 'Scope Locked' : 'Release Shipped'}: ${release.name}`,
            description: `${doneItems.length}/${releaseItems.length} items shipped · ${totalPoints} SP · Target: ${release.targetDate || 'TBD'}`,
            details: [
                { label: 'Items Shipped', count: `${doneItems.length} / ${releaseItems.length}`, icon: '🚀' },
                { label: 'Story Points', count: totalPoints, icon: '💎' },
                { label: 'Epics Covered', count: epicsInScope.length, icon: '📦' },
                { label: 'Target Date', count: release.targetDate || 'TBD', icon: '📅' }
            ],
            extras: [
                { label: 'Linked OKR', value: releaseOKR ? releaseOKR.quarter : 'None' },
                { label: 'QA Items', value: releaseItems.filter(i => i.status === 'qa').length },
                { label: 'In Review', value: releaseItems.filter(i => i.status === 'review').length }
            ],
            items: releaseItems.map(i => ({ id: i.id, name: i.text, status: i.status, destination: i.status === 'done' ? 'Shipped' : 'Pending', type: 'task', lead: (i.contributors || [])[0], points: i.storyPoints })),
            actions: [{ label: 'View Releases', fn: () => switchView('releases') }]
        };
    }
    // Generic fallback
    return {
        title: `Lifecycle Audit`,
        description: `This item was closed before the rich audit system was active.`,
        details: [
            { label: 'Record Type', count: type.toUpperCase(), icon: '📜' },
            { label: 'Final State', count: 'COMPLETED', icon: '✅' }
        ],
        actions: [{ label: 'Return to Dashboard', fn: () => switchView('analytics') }]
    };
}

// ── Legacy shim — keep working for any residual inline onclick references
function toggleCmsDrawer() { openSettingsPanel() }

// ── Settings Side Panel ──────────────────────────────────────────────────
let _settingsPanelTab = 'save'   // 'save' | 'settings' | 'admin'
let _spAdminSubTab = 'users'     // 'users' | 'teams'

function openSettingsPanel() {
    const panel = document.getElementById('settings-panel')
    const backdrop = document.getElementById('settings-backdrop')
    if (!panel) return
    panel.classList.add('active')
    if (backdrop) backdrop.classList.add('active')
    document.body.style.overflow = 'hidden'
    _renderSettingsTabs()
    _renderSettingsPanelBody()
}
window.openSettingsPanel = openSettingsPanel

function closeSettingsPanel() {
    const panel = document.getElementById('settings-panel')
    const backdrop = document.getElementById('settings-backdrop')
    if (panel) panel.classList.remove('active')
    if (backdrop) backdrop.classList.remove('active')
    document.body.style.overflow = ''
}
window.closeSettingsPanel = closeSettingsPanel

function switchSettingsTab(tab) {
    _settingsPanelTab = tab
    _renderSettingsTabs()
    _renderSettingsPanelBody()
}
window.switchSettingsTab = switchSettingsTab

function switchSpAdminSubTab(tab) {
    _spAdminSubTab = tab
    _renderSettingsPanelBody()
}
window.switchSpAdminSubTab = switchSpAdminSubTab

function _renderSettingsTabs() {
    const el = document.getElementById('settings-panel-tabs')
    if (!el) return
    const isAuth = !!window.isGithubAuthenticated
    const isPm = isAuth && (window.CURRENT_USER?.grants || []).some(g => g.mode === 'pm')
    const tabs = [
        { id: 'save', label: '💾 Save & Archive', show: true },
        { id: 'settings', label: '🔧 Settings', show: isAuth },
        { id: 'admin', label: '🛡️ Admin', show: isPm },
    ]
    el.innerHTML = tabs.filter(t => t.show).map(t =>
        `<button class="sp-tab-btn ${_settingsPanelTab === t.id ? 'active' : ''}" onclick="switchSettingsTab('${t.id}')">${t.label}</button>`
    ).join('')
}

function _renderSettingsPanelBody() {
    const el = document.getElementById('settings-panel-body')
    if (!el) return
    if (_settingsPanelTab === 'save') {
        el.innerHTML = _buildSpSaveTab()
    } else if (_settingsPanelTab === 'settings') {
        el.innerHTML = _buildSpSettingsTab()
    } else if (_settingsPanelTab === 'admin') {
        _buildSpAdminTab()
    }
}

function _buildSpSaveTab() {
    const isAuth = !!window.isGithubAuthenticated
    const isCms = !!isCmsMode
    if (!isCms) {
        return `<div class="text-slate-400 text-sm text-center py-12">
            <div class="text-3xl mb-3">🔒</div>
            <p class="font-semibold text-slate-500 mb-1">CMS mode not active</p>
            <p class="text-xs">Add <code class="bg-slate-100 px-1 rounded">?cms=true</code> to the URL and log in to enable editing.</p>
        </div>`
    }
    if (!isAuth) {
        return `<div class="text-slate-400 text-sm text-center py-12">
            <div class="text-3xl mb-3">🔑</div>
            <p class="font-semibold text-slate-500 mb-1">Not authenticated</p>
            <p class="text-xs">Log in to enable save and archive actions.</p>
        </div>`
    }
    // Archive filter HTML — pull current snapshot controls if available
    const archiveEl = document.getElementById('archive-filter')
    const archiveInner = archiveEl ? archiveEl.innerHTML : ''
    return `
        <div class="space-y-5">
            <div>
                <p class="sp-section-title">Data Actions</p>
                <div class="sp-action-row">
                    <div class="flex items-center gap-2 w-full mb-2">
                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span class="text-[10px] font-black text-green-600 uppercase tracking-widest">Authenticated</span>
                    </div>
                    <button onclick="saveToGithub()" id="save-to-github-btn" class="sp-btn sp-btn-primary">💾 Save to GitHub</button>
                    <button onclick="archiveAndClear()" id="archive-btn" class="sp-btn sp-btn-warning">📦 Archive & Clear</button>
                </div>
            </div>
            <div>
                <p class="sp-section-title">Session</p>
                <div class="sp-action-row">
                    <button onclick="logoutCms()" class="sp-btn sp-btn-secondary">🚪 Logout</button>
                </div>
            </div>
            ${archiveInner ? `<div><p class="sp-section-title">Snapshots & Filters</p><div class="mt-2">${archiveInner}</div></div>` : ''}
        </div>`
}

function _buildSpSettingsTab() {
    const isAuth = !!window.isGithubAuthenticated
    const meta = window.UPDATE_DATA?.metadata || {}
    const currentDensity = localStorage.getItem('khyaal_density') || 'default'
    return `
        <div class="space-y-5">
            <div>
                <p class="sp-section-title">Display Density</p>
                <p class="text-[11px] text-slate-400 mb-3">Controls spacing and font size across all views.</p>
                <div class="density-toggle-group">
                    <button class="density-toggle-btn ${currentDensity === 'compact' ? 'active' : ''}" data-density="compact" onclick="setDensity('compact')">Compact</button>
                    <button class="density-toggle-btn ${currentDensity === 'default' ? 'active' : ''}" data-density="default" onclick="setDensity('default')">Default</button>
                    <button class="density-toggle-btn ${currentDensity === 'comfortable' ? 'active' : ''}" data-density="comfortable" onclick="setDensity('comfortable')">Comfortable</button>
                </div>
            </div>
            ${isAuth ? `
            <div>
                <p class="sp-section-title">Metadata & Configuration</p>
                <div class="sp-action-row">
                    <button onclick="openMetadataEdit()" class="sp-btn sp-btn-secondary">🔧 Edit Metadata Settings</button>
                </div>
                <p class="text-[11px] text-slate-400">Sprint capacity, OKR config, custom statuses, and global settings.</p>
            </div>
            <div>
                <p class="sp-section-title">Current Project Data</p>
                <div class="rounded-lg border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1.5">
                    <div class="flex justify-between items-center"><span class="font-semibold">Active Project</span><select onchange="switchProject(this.value)" class="cms-input text-xs py-1 px-2 w-40">${(window.PROJECT_REGISTRY || []).map(p => `<option value="${p.id}" ${p.id === (window.ACTIVE_PROJECT_ID || 'default') ? 'selected' : ''}>${p.name}</option>`).join('')}</select></div>
                    <div class="flex justify-between"><span class="font-semibold">Tracks</span><span>${window.UPDATE_DATA?.tracks?.length || 0}</span></div>
                    <div class="flex justify-between"><span class="font-semibold">Sprints</span><span>${window.UPDATE_DATA?.metadata?.sprints?.length || 0}</span></div>
                    <div class="flex justify-between"><span class="font-semibold">Epics</span><span>${window.UPDATE_DATA?.metadata?.epics?.length || 0}</span></div>
                    <div class="flex justify-between"><span class="font-semibold">Sprint Capacity</span><span>${meta.sprintCapacity || 20} SP</span></div>
                </div>
            </div>` : ''}
        </div>`
}

async function _buildSpAdminTab() {
    const el = document.getElementById('settings-panel-body')
    if (!el) return
    const isPm = (window.CURRENT_USER?.grants || []).some(g => g.mode === 'pm')
    if (!isPm) {
        el.innerHTML = `<div class="text-slate-400 text-sm text-center py-12">
            <div class="text-2xl mb-2">🛡️</div>
            <p>PM grant required</p>
        </div>`
        return
    }

    el.innerHTML = `<div class="text-slate-400 text-sm text-center py-8">Loading…</div>`

    try {
        const jwt = localStorage.getItem('khyaal_site_auth')
        const res = await fetch(`${LAMBDA_URL}?action=read&projectId=default&filePath=users.json`, {
            headers: { 'Authorization': `Bearer ${jwt}` }
        })
        if (!res.ok) throw new Error(`Read failed: ${res.status}`)
        const { data, sha } = await res.json()
        _adminUsersData = data
        _adminUsersSha = sha || null
        if (Array.isArray(data?.projects) && data.projects.length > 0) {
            window.PROJECT_REGISTRY = data.projects
            renderTeamSwitcher()
        }
    } catch (err) {
        console.error('❌ [settings admin] load users:', err)
        el.innerHTML = `<div class="text-red-500 text-sm text-center py-8">Failed to load: ${err.message}</div>`
        return
    }

    _renderSpAdminBody(el)
}

function _renderSpAdminBody(el) {
    if (!el) el = document.getElementById('settings-panel-body')
    if (!el) return
    const subTabHtml = `
        <div class="sp-admin-tabs">
            <button class="sp-admin-tab-btn ${_spAdminSubTab === 'users' ? 'active' : ''}" onclick="switchSpAdminSubTab('users')">👤 Users &amp; Grants</button>
            <button class="sp-admin-tab-btn ${_spAdminSubTab === 'teams' ? 'active' : ''}" onclick="switchSpAdminSubTab('teams')">🏗️ Teams &amp; Tracks</button>
        </div>
        <div id="sp-admin-tab-content">
            ${_spAdminSubTab === 'users' ? buildAdminUsersTable() : _buildSpTeamsPanel()}
        </div>
        <div class="mt-5 pt-4 border-t border-slate-100">
            <button onclick="spAdminSaveUsers()" class="sp-btn sp-btn-primary">💾 Save to GitHub</button>
        </div>`
    el.innerHTML = subTabHtml
}

function _buildSpTeamsPanel() {
    const teamRegistry = (window.PROJECT_REGISTRY || [{ id: 'default', name: 'Khyaal Engineering', filePath: 'data.json' }])
    const activeTeamId = window.ACTIVE_PROJECT_ID || 'default'
    const dataProjects = (window.UPDATE_DATA?.projects || [])  // projects[] within active team's data.json

    // Build team rows — each team expands to show its projects
    const teamRows = teamRegistry.map((team, ti) => {
        const isActive = team.id === activeTeamId
        // Team-level projects from users.json (registry metadata only)
        const teamProjects = Array.isArray(team.projects) ? team.projects : []
        // If this is the active team, show real project data from data.json
        const liveProjects = isActive ? dataProjects : teamProjects
        const projectsLabel = liveProjects.length > 0
            ? liveProjects.map(p => p.name).join(', ')
            : '—'

        const projectSubRows = liveProjects.map((proj, pi) => {
            const projTracks = Array.isArray(proj.tracks) ? proj.tracks : []
            const trackNames = projTracks.map(t => t.name).join(' · ') || '—'
            const totalItems = projTracks.reduce((s, t) => s + t.subtracks.reduce((ss, st) => ss + st.items.length, 0), 0)
            return `
                <tr class="border-b border-slate-50">
                    <td class="pl-8 pr-3 py-1.5 text-[10px] text-slate-600 font-semibold">
                        <span class="text-slate-400 mr-1">↳</span>${proj.name}
                    </td>
                    <td class="px-3 py-1.5 text-[10px] text-slate-400">${trackNames}</td>
                    <td class="px-3 py-1.5 text-[10px] text-slate-400">${totalItems} items</td>
                    <td class="px-3 py-1.5 text-xs flex items-center gap-1">
                        ${isActive ? `<button onclick="adminEditProjectInline(${pi})" class="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold hover:bg-amber-100">Edit</button>` : ''}
                        ${(isActive && liveProjects.length > 1) ? `<button onclick="spAdminDeleteProject(${pi})" class="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold hover:bg-rose-100">Delete</button>` : ''}
                    </td>
                </tr>`
        }).join('')

        return `
            <tr class="border-b border-slate-100 ${isActive ? 'bg-indigo-50/40' : ''}">
                <td class="px-3 py-2 text-xs font-bold text-slate-800">
                    ${isActive ? '<span class="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 align-middle"></span>' : ''}
                    ${team.name}
                </td>
                <td class="px-3 py-2 text-[10px] text-slate-500">${liveProjects.length} project${liveProjects.length !== 1 ? 's' : ''}</td>
                <td class="px-3 py-2 text-[10px] text-slate-400 font-mono">${team.filePath || 'data.json'}</td>
                <td class="px-3 py-2 text-xs flex items-center gap-1 flex-wrap">
                    ${isActive
                        ? '<span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black">Active</span>'
                        : `<button onclick="spAdminSwitchTeam('${team.id}')" class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold hover:bg-indigo-100 hover:text-indigo-700">Switch</button>`
                    }
                    <button onclick="adminEditWorkspaceInline(${ti})" class="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold hover:bg-amber-100">Edit</button>
                    ${team.id !== 'default' ? `<button onclick="spAdminDeleteTeam(${ti})" class="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold hover:bg-rose-100">Delete</button>` : ''}
                    ${isActive ? `<button onclick="adminAddProject()" class="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold hover:bg-emerald-100">+ Project</button>` : ''}
                </td>
            </tr>
            ${projectSubRows}`
    }).join('')

    // Tracks table — all tracks in the active team (flat, for overview)
    const allTracks = dataProjects.flatMap(p => p.tracks || [])
    let trackHtml = ''
    if (allTracks.length === 0) {
        trackHtml = '<tr><td colspan="4" class="text-slate-400 text-xs text-center py-4">No tracks in active team data.</td></tr>'
    } else {
        trackHtml = allTracks.map((track, ti) => {
            const itemCount = track.subtracks.reduce((s, st) => s + st.items.length, 0)
            const doneCount = track.subtracks.reduce((s, st) => s + st.items.filter(i => i.status === 'done').length, 0)
            const pct = itemCount > 0 ? Math.round((doneCount / itemCount) * 100) : 0
            const themeColor = { blue: '#3b82f6', emerald: '#10b981', violet: '#7c3aed', amber: '#f59e0b', rose: '#f43f5e', slate: '#64748b' }[track.theme] || '#64748b'
            // Find which project this track belongs to
            const ownerProj = dataProjects.find(p => (p.tracks || []).some(t => t.id === track.id || t === track))
            const ownerLabel = ownerProj ? `<span class="text-indigo-500">${ownerProj.name}</span> · ` : ''
            const subRows = track.subtracks.map(st => `
                <tr class="border-b border-slate-50">
                    <td class="pl-8 pr-3 py-1 text-[10px] text-slate-400">↳ ${st.name}</td>
                    <td class="px-3 py-1 text-[10px] text-slate-400">${st.items.length}</td>
                    <td class="px-3 py-1 text-[10px] text-slate-400">${st.items.filter(i=>i.status==='done').length} done</td>
                    <td></td>
                </tr>`).join('')
            // ti here is index into allTracks (= UPDATE_DATA.tracks after normalizeData sync)
            return `
                <tr class="border-b border-slate-200 bg-slate-50/50">
                    <td class="px-3 py-2 text-xs font-black text-slate-800">
                        <span class="inline-block w-2 h-2 rounded-full mr-1.5" style="background:${themeColor}"></span>
                        ${ownerLabel}${track.name}
                    </td>
                    <td class="px-3 py-2 text-xs text-slate-500">${itemCount}</td>
                    <td class="px-3 py-2 text-xs text-slate-500">${doneCount} · ${pct}%</td>
                    <td class="px-3 py-2">
                        <button onclick="closeSettingsPanel(); openTrackEdit(${ti})" class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold hover:bg-indigo-50 hover:text-indigo-700">Edit</button>
                    </td>
                </tr>${subRows}`
        }).join('')
    }

    return `
        <div class="space-y-5">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <p class="sp-section-title" style="margin:0">Teams — ${teamRegistry.length} registered</p>
                    <button onclick="adminShowAddWorkspaceForm()" class="sp-btn sp-btn-primary" style="padding:0.3rem 0.7rem;font-size:0.7rem">+ Add Team</button>
                </div>
                <div class="overflow-x-auto rounded-lg border border-slate-200">
                    <table class="w-full text-xs border-collapse">
                        <thead>
                            <tr class="border-b border-slate-200 bg-slate-50">
                                <th class="text-left px-3 py-2 font-black text-slate-500 text-[10px] uppercase tracking-wide">Name</th>
                                <th class="text-left px-3 py-2 font-black text-slate-500 text-[10px] uppercase tracking-wide">Projects</th>
                                <th class="text-left px-3 py-2 font-black text-slate-500 text-[10px] uppercase tracking-wide">Data File</th>
                                <th class="text-left px-3 py-2 font-black text-slate-500 text-[10px] uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody>${teamRows}</tbody>
                    </table>
                </div>
                <p class="text-[10px] text-slate-400 mt-1">Teams are top-level workspaces. Each team has its own data file on GitHub. Projects group tracks within a team.</p>
            </div>
            <div>
                <div class="flex items-center justify-between mb-2">
                    <p class="sp-section-title" style="margin:0">Tracks — ${allTracks.length} in active team</p>
                    <button onclick="closeSettingsPanel(); openTrackEdit()" class="sp-btn sp-btn-secondary" style="padding:0.3rem 0.7rem;font-size:0.7rem">+ Add Track</button>
                </div>
                <div class="overflow-x-auto rounded-lg border border-slate-200">
                    <table class="w-full text-xs border-collapse">
                        <thead>
                            <tr class="border-b border-slate-200 bg-slate-50">
                                <th class="text-left px-3 py-2 font-black text-slate-500 text-[10px] uppercase tracking-wide">Track / Subtrack</th>
                                <th class="text-left px-3 py-2 font-black text-slate-500 text-[10px] uppercase tracking-wide">Items</th>
                                <th class="text-left px-3 py-2 font-black text-slate-500 text-[10px] uppercase tracking-wide">Progress</th>
                                <th class="text-left px-3 py-2 font-black text-slate-500 text-[10px] uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody>${trackHtml}</tbody>
                    </table>
                </div>
                <p class="text-[10px] text-slate-400 mt-1">Tracks are functional areas within a project. Items live in subtracks under each track.</p>
            </div>
        </div>`
}

// SP Admin CRUD — Team management (maps to PROJECT_REGISTRY / users.json projects[])
window.spAdminSwitchTeam = function(id) {
    if (typeof switchProject === 'function') switchProject(id)
    closeSettingsPanel()
}
window.spAdminDeleteTeam = function(pi) {
    const projects = _adminUsersData?.projects || window.PROJECT_REGISTRY
    const p = projects[pi]
    if (!p || p.id === 'default') { showToast('Cannot delete the default team', 'error'); return }
    if (!confirm(`Delete team "${p.name}"? This only removes it from the registry — no data files are deleted.`)) return
    if (!_adminUsersData) { showToast('Load admin panel first', 'error'); return }
    if (!Array.isArray(_adminUsersData.projects)) _adminUsersData.projects = [...window.PROJECT_REGISTRY]
    _adminUsersData.projects.splice(pi, 1)
    _syncProjectsToRegistry()
    showToast(`Team "${p.name}" removed — save to persist`, 'info')
    _renderSpAdminBody()
}
// ── Project CRUD within active team (data.json projects[]) ──────────────
window.spAdminDeleteProject = function(pi) {
    const projects = window.UPDATE_DATA?.projects || []
    const proj = projects[pi]
    if (!proj) return
    if (projects.length <= 1) { showToast('Cannot delete the last team', 'error'); return }
    if (!confirm(`Delete team "${proj.name}"? All its tracks and items will be removed from this team's data.`)) return
    projects.splice(pi, 1)
    const projEl = document.getElementById('project-filter')
    if (projEl) { projEl.dataset.populated = ''; projEl.value = '' }
    if (typeof normalizeData === 'function') normalizeData()
    showToast(`Team "${proj.name}" deleted — save data to persist`, 'info')
    _renderSpAdminBody()
}

window.spAdminSaveUsers = async function() {
    if (!_adminUsersData) return
    const jwt = localStorage.getItem('khyaal_site_auth')
    if (!jwt) { showToast('Not authenticated', 'error'); return }
    window.isActionLockActive = true
    _setLockWatchdog()
    try {
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(_adminUsersData, null, 2))))
        const res = await fetch(`${LAMBDA_URL}?action=write&projectId=default&filePath=users.json`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, sha: _adminUsersSha, message: 'chore: update users.json via admin' })
        })
        if (!res.ok) throw new Error(`Write failed: ${res.status}`)
        const { sha } = await res.json()
        _adminUsersSha = sha
        // Keep localStorage registry in sync after successful GitHub write
        try { localStorage.setItem('khyaal_registry', JSON.stringify(window.PROJECT_REGISTRY)) } catch (e) { /* quota */ }
        showToast('Saved to GitHub', 'success')
    } catch (err) {
        console.error('❌ [settings admin] save:', err)
        showToast(`Save failed: ${err.message}`, 'error')
    } finally {
        _clearLockWatchdog()
        window.isActionLockActive = false
    }
}

// ── Team switcher in nav bar ─────────────────────────────────────────────
function renderTeamSwitcher() {
    const el = document.getElementById('team-switcher')
    if (!el) return
    const reg = window.PROJECT_REGISTRY || []
    // Always show — even with 1 team it serves as a breadcrumb label
    el.style.display = ''
    el.innerHTML = reg.map(p =>
        `<option value="${p.id}" ${p.id === (window.ACTIVE_PROJECT_ID || 'default') ? 'selected' : ''}>${p.name}</option>`
    ).join('')
}
window.renderTeamSwitcher = renderTeamSwitcher

window.onTeamSwitcherChange = function(id) {
    if (typeof switchProject === 'function') switchProject(id)
}

// ========================================
// CONTEXT-AWARE FORM SYSTEM
// ========================================
// Determines which fields to show based on current view/workflow stage

/**
 * Get current context for form rendering
 * @returns {Object} Context object with view, mode, and workflowStage
 */
function getFormContext() {
    const activeView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    const currentMode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'pm';
    const workflowStage = (typeof getCurrentWorkflowStage === 'function') ? getCurrentWorkflowStage() : null;

    return {
        view: activeView,
        mode: currentMode,
        workflowStage: workflowStage
    };
}

/**
 * Define field groups and when they should be shown
 */
const FIELD_GROUPS = {
    what: {
        label: 'WHAT',
        title: 'Goal & Intent',
        icon: '🎯',
        fields: ['text', 'usecase', 'epicId', 'persona', 'tags'],
        color: '#6366f1' // indigo
    },
    when: {
        label: 'WHEN',
        title: 'Timeline & Cycle',
        icon: '📅',
        fields: ['planningHorizon', 'sprintId', 'startDate', 'due', 'releasedIn', 'publishedDate'], // Added PublishedDate
        color: '#8b5cf6' // purple
    },
    where: {
        label: 'WHERE',
        title: 'Action & Routing',
        icon: '⚡',
        fields: ['status', 'contributors', 'blockerNote', 'dependencies', 'note', 'mediaUrl'],
        color: '#10b981' // green
    },
    how: {
        label: 'HOW',
        title: 'Spec & Effort',
        icon: '🛠️',
        fields: ['storyPoints', 'priority', 'acceptanceCriteria', 'impactLevel', 'effortLevel', 'successMetric', 'strategicWeight', 'riskType'], // Added Weight & Risk
        color: '#f59e0b' // amber
    }
};

/**
 * Mapping: Which fields are NATIVE to which view (Stage-specific primary exposure)
 */
const LIFECYCLE_FIELD_MAP = {
    // Vision: OKR ownership, rationale, and status are core to managing objectives
    okr: ['text', 'usecase', 'epicId', 'planningHorizon', 'impactLevel', 'successMetric', 'strategicWeight', 'riskType', 'mediaUrl', 'contributors', 'note', 'status'],
    // Vision: Epics need owners, start dates, and end dates — not just description
    epics: ['text', 'usecase', 'persona', 'planningHorizon', 'impactLevel', 'status', 'successMetric', 'strategicWeight', 'riskType', 'mediaUrl', 'contributors', 'startDate', 'due'],
    // Vision→Definition: Roadmap items need ownership, sequencing, and rationale
    roadmap: ['text', 'planningHorizon', 'startDate', 'usecase', 'epicId', 'status', 'tags', 'impactLevel', 'effortLevel', 'riskType', 'contributors', 'note', 'priority'],
    // Definition: Backlog grooming needs AC, contributors, dependencies, and due date — core grooming fields
    backlog: ['text', 'usecase', 'persona', 'sprintId', 'planningHorizon', 'status', 'epicId', 'priority', 'storyPoints', 'tags', 'impactLevel', 'effortLevel', 'contributors', 'acceptanceCriteria', 'dependencies', 'due'],
    // Delivery: Sprint needs dependencies visible so devs can see what blocks them
    sprint: ['text', 'usecase', 'persona', 'acceptanceCriteria', 'sprintId', 'startDate', 'due', 'status', 'contributors', 'storyPoints', 'priority', 'blockerNote', 'note', 'dependencies'],
    track: ['text', 'usecase', 'persona', 'acceptanceCriteria', 'due', 'sprintId', 'status', 'contributors', 'storyPoints', 'priority', 'dependencies', 'blockerNote', 'note'],
    gantt: ['text', 'epicId', 'startDate', 'due', 'status', 'planningHorizon', 'dependencies', 'blockerNote', 'note', 'storyPoints', 'contributors'],
    dependency: ['text', 'status', 'blockerNote', 'dependencies', 'due', 'sprintId', 'epicId', 'note', 'contributors'],
    // Release notes: need epic link, business rationale, and contributor credit
    releases: ['text', 'releasedIn', 'publishedDate', 'status', 'mediaUrl', 'tags', 'note', 'epicId', 'usecase', 'contributors'],
    // Kanban board: cards need due date for urgency and AC for definition-of-done
    kanban: ['text', 'sprintId', 'status', 'contributors', 'priority', 'storyPoints', 'blockerNote', 'due', 'acceptanceCriteria'],
    // Aggregation views: show full delivery context — same as track
    status: ['text', 'status', 'contributors', 'priority', 'storyPoints', 'due', 'blockerNote', 'sprintId', 'epicId', 'note'],
    priority: ['text', 'priority', 'status', 'storyPoints', 'contributors', 'due', 'epicId', 'impactLevel', 'effortLevel', 'note'],
    contributor: ['text', 'contributors', 'status', 'priority', 'storyPoints', 'due', 'sprintId', 'epicId', 'blockerNote', 'note'],
    // Analytics/Dashboard: read context, minimal edit scope
    analytics: ['text', 'status', 'storyPoints', 'priority', 'contributors', 'sprintId', 'epicId', 'note'],
    dashboard: ['text', 'status', 'priority', 'contributors', 'blockerNote', 'note', 'epicId']
};

/**
 * Determine which field groups should be shown based on context and persona
 * @param {Object} context - Form context from getFormContext()
 * @returns {Array} Array of field group keys that should be shown
 */
function getVisibleFieldGroups(context) {
    // In the new 4-pillar system, we show pillars based on Persona (Mode)
    if (context.mode === 'dev') {
        return ['where', 'how', 'what', 'when']; // Dev focus: execution first
    } else if (context.mode === 'exec') {
        return ['what', 'when', 'where']; // Exec focus: strategy first, no technical 'how'
    } else {
        return ['what', 'when', 'where', 'how']; // PM see all
    }
}

/**
 * Check if a specific field should be shown
 * @param {string} fieldName - Name of the field
 * @param {Object} context - Form context
 * @returns {boolean} Whether the field should be shown
 */
function shouldShowField(fieldName, context) {
    const visibleGroups = getVisibleFieldGroups(context);

    for (const groupKey of visibleGroups) {
        const group = FIELD_GROUPS[groupKey];
        if (group.fields.includes(fieldName)) {
            return true;
        }
    }

    return false;
}

/**
 * Get recommended field groups for current context with helpful hints
 * @param {Object} context - Form context
 * @returns {Array} Array of {groupKey, label, description, fields}
 */
function getRecommendedFieldGroups(context) {
    const visibleGroups = getVisibleFieldGroups(context);
    const recommendations = [];

    const descriptions = {
        strategic: 'Link this task to strategic goals and define long-term planning',
        planning: 'Schedule the task for a sprint and set deadlines',
        execution: 'Assign owners and track implementation progress',
        delivery: 'Associate with a release and add supporting media',
        metadata: 'Add labels for better organization and filtering'
    };

    for (const groupKey of visibleGroups) {
        const group = FIELD_GROUPS[groupKey];
        if (!group.alwaysShow) {  // Don't recommend core fields
            recommendations.push({
                groupKey,
                label: group.label,
                icon: group.icon,
                description: descriptions[groupKey] || '',
                fields: group.fields
            });
        }
    }

    return recommendations;
}

/**
 * USAGE GUIDE FOR CONTEXT-AWARE FORMS:
 *
 * The functions above implement progressive disclosure for form fields.
 * Instead of showing all 40+ fields at once, forms will only show fields
 * relevant to the current workflow stage and view.
 *
 * INTEGRATION STEPS:
 *
 * 1. In openItemEdit() and addItem() functions below:
 *    - Call getFormContext() to get current context
 *    - Call shouldShowField(fieldName, context) before rendering each field
 *    - Group fields using getRecommendedFieldGroups(context)
 *
 * 2. Example integration:
 *    ```
 *    const context = getFormContext();
 *    const visibleGroups = getRecommendedFieldGroups(context);
 *
 *    // Only render field if it should be shown
 *    if (shouldShowField('sprintId', context)) {
 *        html += renderSprintField(item);
 *    }
 *    ```
 *
 * 3. Field Group Examples by Context:
 *    - Strategic Stage (OKR/Epics): epicId, planningHorizon, usecase
 *    - Planning Stage (Backlog/Sprint): sprintId, startDate, due, priority
 *    - Execution Stage (Kanban/Track): status, contributors, blockerNote
 *    - Reporting Stage (Dashboard/Releases): releasedIn, mediaUrl, status
 *
 * 4. Benefits:
 *    - Reduces cognitive load (fewer fields to fill)
 *    - Guides users through proper workflow sequence
 *    - Shows only relevant fields for current stage
 *    - Makes forms faster and less intimidating
 *
 * NOTE: openItemEdit() and addItem() below have been refactored to use buildContextAwareForm().
 */

// ========================================
// CONTEXT-AWARE FORM BUILDER
// ========================================

/**
 * Build context-aware form HTML based on current view, mode, and workflow stage
 * @param {Object} item - The item to edit (or {} for new items)
 * @param {boolean} isNewItem - Whether this is a new item or editing existing
 * @param {Object} trackInfo - {trackIndex, subtrackIndex} for routing/move fields
 * @returns {string} HTML for the form
 */
function buildContextAwareForm(item, isNewItem, trackInfo = {}) {
    const context = getFormContext();
    const persona = context.mode; // Respect the global dashboard mode
    const showAll = window.uiState.showAllTechnical;
    const visiblePillars = getVisibleFieldGroups(context); // Persona-aware: exec=3 pillars, dev=execution-first order, pm=all 4

    let html = '';

    // Slim Perspective Strip (replaces old 52px banner)
    const dotColor = persona === 'dev' ? 'bg-emerald-500' : persona === 'exec' ? 'bg-purple-500' : 'bg-indigo-500';
    const personaLabel = persona === 'dev' ? 'Developer' : persona === 'exec' ? 'Executive' : 'Product Manager';
    const stripClass = persona === 'dev' ? 'strip-dev' : persona === 'exec' ? 'strip-exec' : 'strip-pm';

    // Calculate hidden field count for toggle hint
    const nativeFields = LIFECYCLE_FIELD_MAP[context.view] || [];
    const allPillarFields = visiblePillars.flatMap(pk => FIELD_GROUPS[pk]?.fields || []);
    const hiddenCount = allPillarFields.filter(f => !nativeFields.includes(f)).length;
    const toggleLabel = showAll
        ? `Hide optional fields (${hiddenCount} extra)`
        : hiddenCount > 0 ? `Show all fields (${hiddenCount} hidden)` : 'Show all fields';

    html += `
        <div class="cms-perspective-strip ${stripClass}">
            <div class="flex items-center gap-2">
                <span class="relative flex h-1.5 w-1.5">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-30"></span>
                    <span class="relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}"></span>
                </span>
                <span class="strip-label">${personaLabel}</span>
                ${persona === 'dev' ? '<span class="strip-badge">🔒 Shield Active</span>' : ''}
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
                <span class="strip-toggle-label">${toggleLabel}</span>
                <div class="relative inline-flex items-center">
                    <input type="checkbox" class="sr-only peer" ${showAll ? 'checked' : ''} onchange="toggleShowAllTechnical()">
                    <div class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                </div>
            </label>
        </div>
    `;

    // ---- SYSTEM C: Stage-Aware Hint Banner ----
    if (typeof getModalStageFromView === 'function' && typeof window.STAGE_REQUIRED_FIELDS !== 'undefined') {
        const modalStage = getModalStageFromView(context.view);
        const stageInfo = window.STAGE_REQUIRED_FIELDS?.[modalStage];
        if (stageInfo) {
            // Count required-but-empty fields
            const required = stageInfo.fields || [];
            const missing = required.filter(f => {
                const v = item[f];
                return !v || (Array.isArray(v) && !v.length);
            });
            const stageColors = { ideation:'#7c3aed', spikes:'#7c3aed', vision:'#4f46e5', epics:'#4f46e5',
                                  roadmap:'#2563eb', backlog:'#2563eb', sprint:'#2563eb',
                                  delivery:'#059669', review:'#d97706' };
            const color = stageColors[modalStage] || '#4f46e5';
            html += `<div class="modal-stage-hint" style="border-left:4px solid ${color}">
                <span class="msh-icon" style="color:${color}">📍</span>
                <div class="msh-body">
                    <div class="msh-hint">${stageInfo.hint}</div>
                    ${missing.length > 0 ? `<div class="msh-missing">${missing.length} field${missing.length>1?'s':''} need attention below ↓</div>` : '<div class="msh-ok">✅ All key fields filled for this stage</div>'}
                </div>
            </div>`;
        }
    }

    // Dev mode: show protected-fields notice banner
    if (persona === 'dev') {
        const protectedInView = visiblePillars.flatMap(pk => FIELD_GROUPS[pk]?.fields || [])
            .filter(f => isFieldProtected(f) && (showAll || (LIFECYCLE_FIELD_MAP[context.view] || []).includes(f)));
        if (protectedInView.length > 0) {
            html += `
                <div class="dev-protected-banner">
                    🔒 <strong>${protectedInView.length} field${protectedInView.length > 1 ? 's are' : ' is'} read-only</strong> — managed by PM. <button type="button" onclick="switchMode('pm', true)" class="underline font-bold hover:text-indigo-900">Switch to PM</button> to edit.
                </div>
            `;
        }
    }

    // Main 4-Pillar Grid — persona-aware column sizing
    const gridPersonaClass = visiblePillars.length === 4 && persona === 'dev' ? 'pillars-4-dev' : `pillars-${visiblePillars.length}`;
    html += `<div class="cms-pillars-grid ${gridPersonaClass}">`;

    visiblePillars.forEach(pillarKey => {
        html += buildPillar(pillarKey, item, { ...context, mode: persona, showAll });
    });

    html += '</div>';

    // Move/routing fields (only for existing items in PM mode)
    if (!isNewItem && persona === 'pm' && trackInfo.trackIndex !== undefined) {
        html += buildMoveFields(trackInfo.trackIndex, trackInfo.subtrackIndex);
    }

    // Always include a hidden Note field if not visible in any pillar (preserves value on save)
    const noteVisible = visiblePillars.some(p => FIELD_GROUPS[p].fields.includes('note'))
        && (window.uiState.showAllTechnical || (LIFECYCLE_FIELD_MAP[context.view] || []).includes('note'));
    if (!noteVisible) {
        html += `<input type="hidden" id="edit-note" value="${item.note || ''}">`;
    }

    // Data lists for autocomplete
    html += buildDataLists();

    return html;
}

/**
 * Build a Pillar Section (WHAT, WHEN, WHERE, HOW) with required-field highlighting
 */
function buildPillar(pillarKey, item, context) {
    const pillar = FIELD_GROUPS[pillarKey];
    if (!pillar) return '';

    // Phase 43: Lifecycle-Aware Filtering
    let fields = [...pillar.fields];
    if (!context.showAll) {
        const nativeFieldsForView = LIFECYCLE_FIELD_MAP[context.view] || [];
        fields = fields.filter(f => nativeFieldsForView.includes(f));
    }
    if (fields.length === 0) return '';

    // SYSTEM C: Get required fields for this stage
    const modalStage = typeof getModalStageFromView === 'function' ? getModalStageFromView(context.view) : null;
    const stageRequired = (modalStage && window.STAGE_REQUIRED_FIELDS?.[modalStage]?.fields) || [];

    let html = `
        <div class="cms-pillar pillar-${pillarKey}">
            <div class="cms-pillar-header">
                <div class="cms-pillar-icon" style="background: ${pillar.color}20; color: ${pillar.color};">${pillar.icon}</div>
                <div>
                    <div class="cms-pillar-label">${pillar.label}</div>
                    <div class="cms-pillar-title">${pillar.title}</div>
                </div>
            </div>
            <div class="cms-pillar-content">
    `;

    fields.forEach(fieldName => {
        const isRequired = stageRequired.includes(fieldName);
        const val = item[fieldName];
        const isEmpty = !val || (Array.isArray(val) && !val.length);
        const needsAttention = isRequired && isEmpty;
        const alreadyDone   = isRequired && !isEmpty;

        if (needsAttention) {
            html += `<div class="field-stage-required">${renderField(fieldName, item)}<span class="field-required-badge">⚠️ Needed for this stage</span></div>`;
        } else if (alreadyDone) {
            html += `<div class="field-stage-done">${renderField(fieldName, item)}<span class="field-done-check">✓</span></div>`;
        } else {
            html += renderField(fieldName, item);
        }
    });

    html += `
            </div>
        </div>
    `;
    return html;
}

/**
 * Build context banner showing current stage and inherited info
 */
function buildContextBanner(item, context) {
    const stageMap = {
        'discovery': { label: 'Discovery Phase', icon: '🔍', color: '#6366f1' },
        'vision': { label: 'Vision Phase', icon: '🎯', color: '#8b5cf6' },
        'definition': { label: 'Definition Phase', icon: '📂', color: '#3b82f6' },
        'delivery': { label: 'Delivery Phase', icon: '⚡', color: '#10b981' },
        'review': { label: 'Review Phase', icon: '📊', color: '#f59e0b' }
    };

    const stage = stageMap[context.workflowStage] || stageMap.delivery;

    return `
        <div class="context-banner shadow-sm" style="border-left: 12px solid ${stage.color}; background: white; padding: 1.25rem; margin-bottom: 1.5rem; border-radius: 4px 12px 12px 4px; border-top: 1.5px solid #f1f5f9; border-right: 1.5px solid #f1f5f9; border-bottom: 1.5px solid #f1f5f9;">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-5">
                    <span class="text-4xl filter drop-shadow-sm">${stage.icon}</span>
                    <div>
                        <div class="context-banner-stage !text-xs !font-black uppercase tracking-widest" style="color: ${stage.color}">${stage.label}</div>
                        <div class="context-banner-view !text-slate-800 !font-bold">Execution Context: ${context.view.toUpperCase()}</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <span class="context-badge !bg-slate-100 !text-slate-600 !border-slate-200">Mode: ${context.mode.toUpperCase()}</span>
                    ${item.id ? `<span class="context-badge !bg-indigo-50 !text-indigo-700 !border-indigo-100 font-mono">ID: ${item.id}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Build a field group section
 */
function buildFieldGroup(groupKey, item, fieldsToShow) {
    const group = FIELD_GROUPS[groupKey];
    if (!group) return '';

    // Check if any fields from this group should be shown
    const groupFields = group.fields.filter(f => fieldsToShow.includes(f));
    if (groupFields.length === 0) return '';

    let html = `
        <div class="field-group">
            <div class="field-group-header">
                <span class="field-group-icon">${group.icon}</span>
                <span class="field-group-label">${group.label}</span>
            </div>
            <div class="field-group-content">
    `;

    // Render each field in the group
    groupFields.forEach(fieldName => {
        html += renderField(fieldName, item);
    });

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Render an individual field based on field name
 */
function renderField(fieldName, item) {
    const val = item[fieldName] || '';
    const isProtected = isFieldProtected(fieldName);
    const attr = isProtected ? 'readonly disabled' : '';
    const persona = window.uiState.modalPersona || (typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm');

    const fieldHtml = renderFieldInner(fieldName, item, val, isProtected, attr, persona);
    if (!fieldHtml) return '';

    if (isProtected) {
        return `<div class="protected-field-wrapper relative opacity-60" title="Managed by PM — read-only in Developer mode">${fieldHtml}<span class="protected-lock-badge">🔒</span></div>`;
    }
    return fieldHtml;
}

function renderFieldInner(fieldName, item, val, isProtected, attr, persona) {
    switch (fieldName) {
        case 'text':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🎯 Task Title <span class="text-rose-400">*</span></label>
                    <input type="text" id="edit-text" value="${val}" class="cms-input shadow-sm focus:shadow-md" placeholder="What mission-critical task needs attention?" required onblur="validateRequired(this)" ${attr}>
                    <p id="edit-text-error" class="text-[10px] text-rose-500 font-bold hidden mt-0.5">Title is required</p>
                </div>
            `;

        case 'note':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">📝 Engineering Context / Description</label>
                    <textarea id="edit-note" class="cms-input shadow-sm focus:shadow-md" rows="3" placeholder="Technical implementation details or operational notes..." ${attr}>${val}</textarea>
                </div>
            `;

        case 'status':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🚦 Engineering Lifecycle State</label>
                    <select id="edit-status" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="later" ${val === 'later' ? 'selected' : ''}>Backlog (Later)</option>
                        <option value="next" ${val === 'next' || !val ? 'selected' : ''}>Planned (Next)</option>
                        <option value="now" ${val === 'now' ? 'selected' : ''}>Developing (Now)</option>
                        <option value="qa" ${val === 'qa' ? 'selected' : ''}>Testing (QA)</option>
                        <option value="review" ${val === 'review' ? 'selected' : ''}>In Review (UAT)</option>
                        <option value="blocked" ${val === 'blocked' ? 'selected' : ''}>Blocked (Urgent)</option>
                        <option value="onhold" ${val === 'onhold' ? 'selected' : ''}>On Hold (Parked)</option>
                        <option value="done" ${val === 'done' ? 'selected' : ''}>Production (Done)</option>
                    </select>
                </div>
            `;

        case 'priority':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🔥 Priority</label>
                    <select id="edit-priority" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="high" ${val === 'high' ? 'selected' : ''}>🔴 High</option>
                        <option value="medium" ${val === 'medium' || !val ? 'selected' : ''}>🟡 Medium</option>
                        <option value="low" ${val === 'low' ? 'selected' : ''}>🟢 Low</option>
                    </select>
                </div>
            `;

        case 'usecase':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">💡 Business Value / Usecase</label>
                    <input type="text" id="edit-usecase" value="${val}" class="cms-input shadow-sm focus:shadow-md" placeholder="Strategic alignment or user impact statement..." ${attr}>
                </div>
            `;

        case 'epicId':
            const epics = UPDATE_DATA.metadata.epics || [];
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🚀 Strategic Epic Link</label>
                    <select id="edit-epicId" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="">None (Tactical / BAU)</option>
                        ${epics.map(e => `<option value="${e.id}" ${val === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
                    </select>
                </div>
            `;

        case 'planningHorizon':
            const knownHorizons = ['1M','3M','6M','1Y'];
            const isLegacyHorizon = val && !knownHorizons.includes(val);
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🗺️ Roadmap Horizon</label>
                    <select id="edit-planningHorizon" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="">None</option>
                        <option value="1M" ${val === '1M' ? 'selected' : ''}>Now (1 Month)</option>
                        <option value="3M" ${val === '3M' ? 'selected' : ''}>Next (3 Months)</option>
                        <option value="6M" ${val === '6M' ? 'selected' : ''}>Later (6 Months)</option>
                        <option value="1Y" ${val === '1Y' ? 'selected' : ''}>Long-term (1 Year)</option>
                        ${isLegacyHorizon ? `<option value="${val}" selected>Legacy: ${val}</option>` : ''}
                    </select>
                    ${isLegacyHorizon ? '<p class="text-[10px] text-amber-500 mt-1 font-bold uppercase tracking-tight">⚠️ Legacy value — update to standard horizon</p>' : ''}
                </div>
            `;

        case 'sprintId':
            const sprints = UPDATE_DATA.metadata.sprints || [];
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🏃 Execution Sprint</label>
                    <select id="edit-sprintId" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="">None</option>
                        ${sprints.map(s => `<option value="${s.id}" ${val === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                </div>
            `;

        case 'startDate':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">📅 Planned Start</label>
                    <input type="date" id="edit-startDate" value="${val}" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                </div>
            `;

        case 'due':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">⌛ Target Delivery Date</label>
                    <input type="date" id="edit-due" value="${val}" class="cms-input" ${attr}>
                </div>
            `;

        case 'contributors':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">👥 Team Contributors</label>
                    <div id="contrib-tag-input-edit" class="tag-input-wrapper min-h-[44px] shadow-sm" data-placeholder="Type name, press Enter..."></div>
                </div>
            `;

        case 'blockerNote':
            const isBlocked = item.blocker === true || item.status === 'blocked';
            return `
                <div class="field-wrapper ${isBlocked ? 'blocker-field p-4 bg-rose-50 border border-rose-200 rounded-xl' : ''}">
                    <label class="cms-label ${isBlocked ? '!text-rose-600' : ''}">
                        ${isBlocked ? '🛑' : '💬'} ${isBlocked ? 'Critical Blocker Reason' : 'Blocker Note'}
                        ${!isBlocked ? '<span class="text-[9px] font-normal text-slate-400 ml-1">(fill if blocked)</span>' : ''}
                    </label>
                    <input type="text" id="edit-blockerNote" value="${val}" class="cms-input shadow-sm focus:shadow-md ${isBlocked ? '!border-rose-300' : ''}" placeholder="${isBlocked ? 'What\'s blocking this mission?' : 'Describe any blocker if applicable...'}">
                    ${isBlocked ? '<p class="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-tight">⚠️ Currently flagged as blocked</p>' : ''}
                </div>
            `;

        case 'dependencies':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🔗 Technical Dependencies</label>
                    <div id="deps-tag-input-edit" class="tag-input-wrapper min-h-[44px] shadow-sm" data-placeholder="Paste task ID or search..."></div>
                </div>
            `;

        case 'releasedIn':
            const releases = UPDATE_DATA.metadata.releases || [];
            return `
                <div class="field-wrapper">
                    <label class="cms-label">📦 Target Release</label>
                    <select id="edit-releasedIn" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="">None (Continuous / BAU)</option>
                        ${releases.map(r => `<option value="${r.id}" ${val === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                    </select>
                </div>
            `;

        case 'publishedDate':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🚀 Milestone / Publish Date</label>
                    <input type="date" id="edit-publishedDate" value="${val}" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                </div>
            `;

        case 'strategicWeight':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">⚖️ Strategic Weight (%)</label>
                    <div class="flex items-center gap-3">
                        <input type="number" id="edit-strategicWeight" value="${val || 0}" class="cms-input shadow-sm focus:shadow-md w-24" min="0" max="100" ${attr}>
                        <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-500 transition-all duration-500" style="width: ${val || 0}%"></div>
                        </div>
                    </div>
                </div>
            `;

        case 'riskType':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">⚠️ Primary Risk Profile</label>
                    <select id="edit-riskType" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="none" ${val === 'none' ? 'selected' : ''}>None / Low Risk</option>
                        <option value="technical" ${val === 'technical' ? 'selected' : ''}>🛠️ Technical (Architecture/Legacy)</option>
                        <option value="market" ${val === 'market' ? 'selected' : ''}>📈 Market (Adoption/ROI)</option>
                        <option value="operational" ${val === 'operational' ? 'selected' : ''}>⚙️ Operational (Resource/Timeline)</option>
                        <option value="security" ${val === 'security' ? 'selected' : ''}>🛡️ Security / Compliance</option>
                    </select>
                </div>
            `;

        case 'mediaUrl':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🔗 Strategic Evidence / Media URL</label>
                    <input type="text" id="edit-mediaUrl" value="${val}" class="cms-input shadow-sm focus:shadow-md" placeholder="https://external-resource-link...">
                    <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Screenshots, demos, or documentation links</p>
                </div>
            `;

        case 'storyPoints':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🔢 Complexity (Story Points)</label>
                    <select id="edit-storyPoints" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="">— Select Points —</option>
                        ${[1,2,3,5,8,13,21].map(n => `<option value="${n}" ${val == n ? 'selected' : ''}>${n} pt${n > 1 ? 's' : ''}</option>`).join('')}
                    </select>
                    <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Fibonacci scale · 1=trivial · 5=1 day · 13=1 week</p>
                </div>
            `;

        case 'effortLevel':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🛠️ Implementation Effort</label>
                    <select id="edit-effortLevel" class="cms-input shadow-sm focus:shadow-md" onchange="updateRoiPreview()" ${attr}>
                        <option value="">Select Effort...</option>
                        <option value="low" ${val === 'low' ? 'selected' : ''}>🟢 Low — Easy Win</option>
                        <option value="medium" ${val === 'medium' ? 'selected' : ''}>🟡 Medium — Standard Cycle</option>
                        <option value="high" ${val === 'high' ? 'selected' : ''}>🔴 High — Major Complexity</option>
                    </select>
                    <div id="roi-preview-container" class="mt-3"></div>
                </div>
            `;

        case 'persona':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">👤 Target Persona</label>
                    <select id="edit-persona" class="cms-input shadow-sm focus:shadow-md" ${attr}>
                        <option value="none" ${val === 'none' ? 'selected' : ''}>General / All</option>
                        <option value="frontend" ${val === 'frontend' ? 'selected' : ''}>Frontend Developer</option>
                        <option value="backend" ${val === 'backend' ? 'selected' : ''}>Backend Developer</option>
                        <option value="sre" ${val === 'sre' ? 'selected' : ''}>SRE / Ops Engineer</option>
                        <option value="product" ${val === 'product' ? 'selected' : ''}>Product Manager</option>
                        <option value="executive" ${val === 'executive' ? 'selected' : ''}>Executive Stakeholder</option>
                        <option value="external" ${val === 'external' ? 'selected' : ''}>External Customer</option>
                    </select>
                </div>
            `;

        case 'successMetric':
            return `
                <div class="field-wrapper">
                    <label class="cms-label text-indigo-500 font-bold">📊 Quantitative Success Metric</label>
                    <input type="text" id="edit-successMetric" value="${val}" class="cms-input shadow-sm focus:shadow-md border-indigo-50" placeholder="e.g. Latency < 200ms or 99.9% Uptime" ${attr}>
                </div>
            `;

        case 'impactLevel':
            const impactColors = { high: 'text-emerald-600', medium: 'text-amber-500', low: 'text-slate-400' };
            return `
                <div class="field-wrapper">
                    <label class="cms-label ${impactColors[val] || ''}">💎 Strategic Impact</label>
                    <select id="edit-impactLevel" class="cms-input shadow-sm focus:shadow-md" onchange="updateRoiPreview()" ${attr}>
                        <option value="">Select Impact...</option>
                        <option value="low" ${val === 'low' ? 'selected' : ''}>🔵 Low — Tactical / Minor</option>
                        <option value="medium" ${val === 'medium' ? 'selected' : ''}>🟡 Medium — Baseline Support</option>
                        <option value="high" ${val === 'high' ? 'selected' : ''}>🟢 High — Strategic / Major</option>
                    </select>
                </div>
            `;

        case 'acceptanceCriteria':
            const acVal = Array.isArray(val) ? val.join('\n') : (val || '');
            const lineCount = acVal ? acVal.split('\n').filter(l => l.trim()).length : 0;
            return `
                <div class="field-wrapper full-width mt-4 ${isProtected ? 'persona-protected' : ''}">
                    <label class="cms-label">${isProtected ? '🔒' : '✅'} Acceptance Criteria</label>
                    <textarea id="edit-acceptanceCriteria" class="cms-input !min-h-[100px] shadow-sm focus:shadow-md ${isProtected ? 'bg-slate-50 opacity-80 cursor-not-allowed italic' : ''}" rows="4" placeholder="One criterion per line:&#10;✓ User can log in with email&#10;✓ Session persists 7 days" oninput="updateAcCount(this)" ${isProtected ? 'readonly disabled' : ''}>${acVal}</textarea>
                    <div class="flex justify-between mt-1">
                        <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tight">${isProtected ? 'Protected — PM level only' : 'One criterion per line'}</p>
                        <span id="ac-line-count" class="text-[10px] text-slate-400 font-bold">${lineCount > 0 ? lineCount + ' criteria' : ''}</span>
                    </div>
                </div>
            `;

        case 'tags':
            return `
                <div class="field-wrapper">
                    <label class="cms-label">🏷️ Categorization Tags</label>
                    <div id="tags-tag-input-edit" class="tag-input-wrapper min-h-[44px] shadow-sm" data-placeholder="Add tag..."></div>
                </div>
            `;

        default:
            return '';
    }
}

/**
 * Build move/routing fields for existing items
 */
function buildMoveFields(trackIndex, subtrackIndex) {
    return `
        <details class="cms-move-section mt-6">
            <summary class="cms-move-trigger">↪ Move to different track / subtrack</summary>
            <div class="cms-move-body">
                <div class="grid grid-cols-2 gap-6 mt-4">
                    <div>
                        <label class="block text-[12px] font-bold mb-2 text-slate-600">Target Track</label>
                        <select id="edit-move-track" class="cms-input !mb-0 shadow-sm" onchange="updateMoveSubtrackOpts(this.value)">
                            ${UPDATE_DATA.tracks.map((t, idx) => `<option value="${idx}" ${idx === trackIndex ? 'selected' : ''}>${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[12px] font-bold mb-2 text-slate-600">Target Subtrack</label>
                        <select id="edit-move-subtrack" class="cms-input !mb-0 shadow-sm">
                            ${UPDATE_DATA.tracks[trackIndex].subtracks.map((s, idx) => `<option value="${idx}" ${idx === subtrackIndex ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </details>
    `;
}

/**
 * Build autocomplete data lists
 */
function buildDataLists() {
    return `
        <datalist id="contributor-list">
            ${ALL_CONTRIBUTORS.map(c => `<option value="${c}">`).join('')}
        </datalist>
        <datalist id="tag-list">
            ${Array.from(new Set(UPDATE_DATA.tracks.flatMap(t => t.subtracks.flatMap(s => s.items.flatMap(i => i.tags || []))))).map(t => `<option value="${t}">`).join('')}
        </datalist>
        <datalist id="item-list">
            ${UPDATE_DATA.tracks.flatMap(t => t.subtracks.flatMap(s => s.items.map(i => `<option value="${i.id}">${i.text}</option>`))).join('')}
        </datalist>
    `;
}

// Global UI State for Persistence
window.uiState = {
    openEpics: new Set(), // Track Epic IDs that are currently expanded
    modalPersona: null,   // Current persona in modal ('pm' or 'dev')
    showAllTechnical: false, // PM deep-dive toggle
    isDirty: false // Unsaved changes tracker
};

/**
 * Persona Helper: Identify if a field is protected (Read-Only) for the current persona
 */
function isFieldProtected(fieldName) {
    const persona = window.uiState.modalPersona || (typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm');
    
    // Developers are PREVENTED from editing Strategic alignment
    if (persona === 'dev') {
        const protectedStrategicFields = [
            'epicId', 'impactLevel', 'successMetric', 'acceptanceCriteria',
            'planningHorizon', 'releasedIn', 'strategicWeight', 'riskType',
            'effortLevel', 'publishedDate', 'priority', 'usecase', 'persona',
            'sprintId'
        ];
        return protectedStrategicFields.includes(fieldName);
    }
    
    return false;
}

/**
 * Persona Toggle Handler
 */
function toggleModalPersona(p) {
    window.uiState.modalPersona = p;
    // Re-render the form if open
    if (editContext) {
        const data = getValidatedItemContext(editContext.itemId || { trackIndex: editContext.trackIndex, subtrackIndex: editContext.subtrackIndex, itemIndex: editContext.itemIndex });
        if (data) {
            document.getElementById('modal-form').innerHTML = buildContextAwareForm(data.item, editContext.type === 'item-new', { trackIndex: data.ti, subtrackIndex: data.si });
            attachModalFormListeners();
        }
    }
}

/**
 * Acceptance Criteria live line count
 */
function updateAcCount(el) {
    const count = el.value.split('\n').filter(l => l.trim()).length;
    const counter = document.getElementById('ac-line-count');
    if (counter) counter.textContent = count > 0 ? count + ' criteria' : '';
}

/**
 * Required field blur validation
 */
function validateRequired(el) {
    const err = document.getElementById(el.id + '-error');
    if (err) {
        if (!el.value.trim()) {
            el.classList.add('!border-rose-300');
            err.classList.remove('hidden');
        } else {
            el.classList.remove('!border-rose-300');
            err.classList.add('hidden');
        }
    }
}

/**
 * PM Deep-Dive Toggle
 */
function attachModalFormListeners() {
    const formEl = document.getElementById('modal-form');
    if (!formEl) return;
    formEl.addEventListener('input', () => { window.uiState.isDirty = true; }, { passive: true });
    formEl.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveCms(); }
    });
}

function toggleShowAllTechnical() {
    window.uiState.showAllTechnical = !window.uiState.showAllTechnical;
    if (editContext) {
        const data = getValidatedItemContext(editContext.itemId || { trackIndex: editContext.trackIndex, subtrackIndex: editContext.subtrackIndex, itemIndex: editContext.itemIndex });
        if (data) {
            document.getElementById('modal-form').innerHTML = buildContextAwareForm(data.item, editContext.type === 'item-new', { trackIndex: data.ti, subtrackIndex: data.si });
            attachModalFormListeners();
            setTimeout(() => {
                renderTagWidget('contrib-tag-input-edit', data.item.contributors || [], 'contributor-list', 'author');
                renderTagWidget('tags-tag-input-edit', data.item.tags || [], 'tag-list', 'tag');
                renderTagWidget('deps-tag-input-edit', data.item.dependencies || [], 'item-list', 'dep');
                if (typeof updateRoiPreview === 'function') updateRoiPreview();
            }, 10);
        }
    }
}

/**
 * Universal Item Context Resolver
 * Handles both Unique ID (string) and Index-based Pointer (object) lookups.
 */
function getValidatedItemContext(arg) {
    if (!arg) return null;

    // A: Look up by Unique String ID (Modern Protocol)
    if (typeof arg === 'string') {
        const found = findItemById(arg);
        if (found) return found;
    }

    // B: Look up by Object Indices { trackIndex, subtrackIndex, itemIndex } (Kanban/Legacy)
    if (typeof arg === 'object' && arg.itemIndex !== undefined) {
        const track = UPDATE_DATA.tracks[arg.trackIndex];
        if (track && track.subtracks[arg.subtrackIndex]) {
            const item = track.subtracks[arg.subtrackIndex].items[arg.itemIndex];
            if (item) {
                return {
                    item: item,
                    ti: arg.trackIndex,
                    si: arg.subtrackIndex,
                    ii: arg.itemIndex
                };
            }
        }
    }

    // C: Modal Context Fallback (Last Resort)
    if (editContext && editContext.itemIndex !== undefined) {
        const track = UPDATE_DATA.tracks[editContext.trackIndex];
        if (track && track.subtracks[editContext.subtrackIndex]) {
            return {
                item: track.subtracks[editContext.subtrackIndex].items[editContext.itemIndex],
                ti: editContext.trackIndex,
                si: editContext.subtrackIndex,
                ii: editContext.itemIndex
            };
        }
    }
    return null;
}

function findItemById(itemId) {
    if (!UPDATE_DATA) return null;
    for (let ti = 0; ti < UPDATE_DATA.tracks.length; ti++) {
        const track = UPDATE_DATA.tracks[ti];
        for (let si = 0; si < track.subtracks.length; si++) {
            const sub = track.subtracks[si];
            const ii = sub.items.findIndex(item => item.id === itemId);
            if (ii !== -1) {
                return { item: sub.items[ii], ti, si, ii };
            }
        }
    }
    return null;
}

async function adminLoadUsersRegistry() {
  try {
    const jwt = localStorage.getItem('khyaal_site_auth')
    const response = await fetch(LAMBDA_URL + '?action=read&filePath=users.json', {
      headers: { Authorization: 'Bearer ' + jwt }
    })
    if (!response.ok) return
    const { data, sha } = await response.json()
    if (data) window.PROJECT_REGISTRY = data
    if (sha) window._lastUsersSha = sha
  } catch (err) {
    console.warn('⚠️ adminLoadUsersRegistry: could not load users.json', err)
  }
}

function initCms() {
    const params = new URLSearchParams(window.location.search);
    const mode = getCurrentMode()

    // Global modal behavior (works even in read-only mode if a modal is triggered)
    const modal = document.getElementById('cms-modal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) closeCmsModal();
        });
    }

    // Always init snapshots for any authenticated user (not just CMS mode)
    const jwt = localStorage.getItem('khyaal_site_auth');
    if (jwt && !window._archiveFilterInited) {
        window._archiveFilterInited = true;
        initArchiveFilter();
    }

    if (mode === 'pm') adminLoadUsersRegistry()

    if (params.get('cms') === 'true') {
        isCmsMode = true;
        renderTeamSwitcher()
        // Auto-authenticate CMS if a JWT session exists — no PAT required
        if (jwt) {
            authenticateCms();
        }
    } else {
        window.isGithubAuthenticated = false;
    }
}

function authenticateCms() {
    const jwt = localStorage.getItem('khyaal_site_auth');
    if (!jwt) return;
    window.isGithubAuthenticated = true;

    renderTeamSwitcher()
    if (!window._archiveFilterInited) {
        window._archiveFilterInited = true;
        initArchiveFilter();
    }

    const currentView = document.querySelector('.filter-btn.active')?.id.replace('btn-', '') || 'track';
    if (typeof switchView === 'function') switchView(currentView);
}

function logoutCms() {
    window.isGithubAuthenticated = false;
    location.reload();
}

// ------ MODAL OPS (FULL) ------
function openItemEdit(ti, si, ii, itemId) {
    const data = getValidatedItemContext(itemId || { trackIndex: ti, subtrackIndex: si, itemIndex: ii });
    if (!data) return;

    // Reset Modal Persona UI State
    window.uiState.modalPersona = null; // Revert to view-based default
    window.uiState.showAllTechnical = false;

    const item = data.item;
    editContext = { type: 'item', trackIndex: data.ti, subtrackIndex: data.si, itemIndex: data.ii, itemId: item.id };

    const statusLabels = { now: '🔵 Developing', next: '🟠 Planned', later: '⚪ Backlog',
        qa: '🧪 Testing', review: '🟣 In Review', blocked: '🔴 Blocked',
        onhold: '🟡 On Hold', done: '🟢 Done' };
    const effectiveStatus = (item.blocker === true && item.status !== 'blocked') ? 'blocked' : item.status;
    const stagePill = effectiveStatus ? `<span class="modal-stage-pill">${statusLabels[effectiveStatus] || effectiveStatus}</span>` : '';
    const viewTitleMap = {
        backlog: 'Edit Backlog Item', sprint: 'Edit Sprint Item', track: 'Edit Track Item',
        kanban: 'Edit Kanban Item', roadmap: 'Edit Roadmap Item', releases: 'Edit Release Item',
        epics: 'Edit Epic Item', okr: 'Edit OKR Item', 'my-tasks': 'Edit My Task',
        dependency: 'Edit Task', status: 'Edit Task', priority: 'Edit Task', contributor: 'Edit Task'
    };
    const activeViewForTitle = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    const modalTitleText = viewTitleMap[activeViewForTitle] || 'Edit Task';
    document.getElementById('modal-title').innerHTML = `${modalTitleText} ${stagePill}`;

    const context = getFormContext();
    document.getElementById('modal-banner').innerHTML = buildContextBanner(item, context);
    document.getElementById('modal-form').innerHTML = buildContextAwareForm(item, false, { trackIndex: data.ti, subtrackIndex: data.si });

    // Inject footer buttons — Delete on left, Save on right
    document.getElementById('modal-footer').innerHTML = `
        <div class="footer-left">
            <button onclick="deleteItem(undefined, undefined, undefined, '${item.id}')" class="cms-btn cms-btn-danger">🗑 Delete</button>
        </div>
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="saveCms()" class="cms-btn cms-btn-primary">Save Changes <span class="kbd-hint">⌘↵</span></button>
    `;

    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Initialize widgets first, then enable dirty tracking after they settle
    window.uiState.isDirty = false;
    setTimeout(() => {
        renderTagWidget('contrib-tag-input-edit', item.contributors || [], 'contributor-list', 'author');
        renderTagWidget('tags-tag-input-edit', item.tags || [], 'tag-list', 'tag');
        renderTagWidget('deps-tag-input-edit', item.dependencies || [], 'item-list', 'dep');
        if (typeof updateRoiPreview === 'function') updateRoiPreview();
        // Attach dirty tracking AFTER widgets are done so their init doesn't trigger isDirty
        attachModalFormListeners();
    }, 50);
}

function addItem(trackIndex, subtrackIndex, defaults = {}) {
    // Reset Modal Persona UI State
    window.uiState.modalPersona = null;
    window.uiState.showAllTechnical = false;

    editContext = { type: 'item-new', trackIndex, subtrackIndex, defaults };

    const _addViewTitleMap = {
        backlog: 'New Backlog Item', sprint: 'New Sprint Item', track: 'New Track Item',
        kanban: 'New Kanban Item', roadmap: 'New Roadmap Item', releases: 'New Release Item',
        epics: 'New Epic Item', okr: 'New OKR Item', 'my-tasks': 'New Task'
    };
    const _addActiveView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    const _addModalTitle = _addViewTitleMap[_addActiveView] || 'New Task';
    document.getElementById('modal-title').innerHTML = `${_addModalTitle} <span class="modal-stage-pill">✨ Draft</span>`;

    const context = getFormContext();
    document.getElementById('modal-banner').innerHTML = buildContextBanner(defaults, context);
    document.getElementById('modal-form').innerHTML = buildContextAwareForm(defaults, true, { trackIndex, subtrackIndex });

    // Inject footer buttons
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="saveCms()" class="cms-btn cms-btn-primary">Create Task <span class="kbd-hint">⌘↵</span></button>
    `;

    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Initialize widgets first, then enable dirty tracking after they settle
    window.uiState.isDirty = false;
    setTimeout(() => {
        renderTagWidget('contrib-tag-input-edit', defaults.contributors || [], 'contributor-list', 'author');
        renderTagWidget('tags-tag-input-edit', defaults.tags || [], 'tag-list', 'tag');
        renderTagWidget('deps-tag-input-edit', defaults.dependencies || [], 'item-list', 'dep');
        // Attach dirty tracking AFTER widgets are done so their init doesn't trigger isDirty
        attachModalFormListeners();
    }, 50);
}

/**
 * Quick-assign a sprint to a backlog item without opening the full modal.
 * Called from the inline "Assign to Sprint" select on backlog cards.
 */
function quickAssignSprint(itemId, sprintId) {
    const found = findItemById(itemId);
    if (!found) return;
    found.item.sprintId = sprintId || '';
    logChange('sprint-assign', found.item.text);
    saveToLocalStorage();
    renderBacklogView();
}
window.quickAssignSprint = quickAssignSprint;

function updateSprintGoal(sprintId, goalText) {
    const sprints = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.sprints) || []
    const sprint = sprints.find(s => s.id === sprintId)
    if (!sprint) return
    const trimmed = (goalText || '').trim()
    if (sprint.goal === trimmed) return
    sprint.goal = trimmed
    logChange('sprint-goal-update', sprint.name)
    saveToLocalStorage()
}
window.updateSprintGoal = updateSprintGoal;

function quickAssignRelease(itemId, releaseId) {
    const found = findItemById(itemId)
    if (!found) return
    found.item.releasedIn = releaseId || ''
    logChange('release-assign', found.item.text)
    saveToLocalStorage()
    renderDashboard()
}
window.quickAssignRelease = quickAssignRelease

function quickAssignEpicHorizon(epicIdx, horizonId) {
    const epic = (window.UPDATE_DATA?.metadata?.epics || [])[epicIdx]
    if (!epic) return
    epic.planningHorizon = horizonId || ''
    logChange('epic-horizon-assign', epic.name)
    saveToLocalStorage()
    renderRoadmapView()
}
window.quickAssignEpicHorizon = quickAssignEpicHorizon

function bulkAssignBacklog(field, value) {
    const selected = window._backlogSelected
    if (!selected || selected.size === 0) return
    let changed = 0
    selected.forEach(itemId => {
        const found = findItemById(itemId)
        if (!found) return
        found.item[field] = value
        changed++
    })
    if (changed > 0) {
        logChange('bulk-assign', `${changed} items → ${field}=${value}`)
        saveToLocalStorage()
    }
    if (typeof clearBacklogSelection === 'function') clearBacklogSelection()
}
window.bulkAssignBacklog = bulkAssignBacklog

function quickChangeStatus(itemId, newStatus) {
    const found = findItemById(itemId)
    if (!found) return
    found.item.status = newStatus
    logChange('status-change', found.item.text)
    saveToLocalStorage()
    renderDashboard()
}
window.quickChangeStatus = quickChangeStatus

function quickChangePriority(itemId, newPriority) {
    const found = findItemById(itemId)
    if (!found) return
    found.item.priority = newPriority
    logChange('priority-change', found.item.text)
    saveToLocalStorage()
    renderDashboard()
}
window.quickChangePriority = quickChangePriority

function resolveBlocker(itemId) {
    const found = findItemById(itemId)
    if (!found) return
    found.item.blocker = false
    found.item.blockerNote = ''
    logChange('Blocker Resolved', found.item.text)
    saveToLocalStorage()
    renderDashboard()
    // Live re-render the dependency graph if it's currently visible
    const depView = document.getElementById('dependency-view')
    if (depView && depView.classList.contains('active') && typeof renderDependencyView === 'function') {
        renderDependencyView()
    }
}
window.resolveBlocker = resolveBlocker

// ============================================================
// SYSTEM M — Release Builder (3-step batch ship wizard)
// ============================================================
function openReleaseBuilder(sprintId) {
    // Collect candidates: ALL done items in sprint (including already-shipped — user can re-ship)
    const candidates = []
    const alreadyShipped = []  // done items that already have a release (shown as info, still selectable)
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                const matchesSprint = sprintId ? item.sprintId === sprintId : true
                if (matchesSprint && item.status === 'done') {
                    if (item.releasedIn) alreadyShipped.push(item)
                    else candidates.push(item)
                }
            })
        })
    })

    // If no done items at all, fall back to showing all items in the sprint
    const allSprintItems = []
    if (candidates.length === 0 && alreadyShipped.length === 0) {
        UPDATE_DATA.tracks.forEach(track => {
            track.subtracks.forEach(subtrack => {
                subtrack.items.forEach(item => {
                    if (sprintId ? item.sprintId === sprintId : true) {
                        allSprintItems.push(item)
                    }
                })
            })
        })
    }

    const sprint = sprintId ? (UPDATE_DATA.metadata?.sprints || []).find(s => s.id === sprintId) : null
    const sprintLabel = sprint ? sprint.name : 'All Sprints'
    const releases = UPDATE_DATA.metadata?.releases || []

    // -- Wizard state — pre-select unshipped done items only --
    let step = 1
    let selectedIds = new Set(candidates.map(i => i.id))
    let targetReleaseId = releases.length > 0 ? releases[0].id : ''
    let createNewName = ''
    let shouldPublish = false

    // -- Create overlay --
    const overlay = document.createElement('div')
    overlay.id = 'release-builder-overlay'
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(6px);z-index:4000;display:flex;align-items:center;justify-content:center;'
    document.body.appendChild(overlay)

    // All selectable items = unshipped done + already shipped (can re-assign) + fallback all
    const allCandidates = [...candidates, ...alreadyShipped]

    function renderWizard() {
        const renderList = allCandidates.length > 0 ? allCandidates : allSprintItems
        const totalPts = renderList.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + (i.storyPoints || 0), 0)

        const stepIndicator = [1, 2, 3].map(n => `
            <div style="display:flex;align-items:center;gap:6px;">
                <div style="width:22px;height:22px;border-radius:50%;background:${n <= step ? '#4f46e5' : '#e2e8f0'};color:${n <= step ? 'white' : '#94a3b8'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;">${n < step ? '✓' : n}</div>
                <span style="font-size:10px;font-weight:700;color:${n === step ? '#1e293b' : '#94a3b8'};white-space:nowrap;">${['Select Items','Pick Release','Confirm'][n-1]}</span>
                ${n < 3 ? '<div style="width:24px;height:1px;background:#e2e8f0;"></div>' : ''}
            </div>`).join('')

        let bodyHTML = ''

        if (step === 1) {
            if (renderList.length === 0) {
                bodyHTML = `
                    <div style="text-align:center;padding:32px 0;color:#64748b;">
                        <div style="font-size:36px;margin-bottom:12px;">📭</div>
                        <div style="font-weight:700;margin-bottom:6px;">No items in this sprint</div>
                        <div style="font-size:12px;">There are no items attached to <strong>${sprintLabel}</strong>.</div>
                    </div>`
            } else if (allCandidates.length === 0) {
                // No done items, but other items exist
                const rows = renderList.map(item => `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;margin-bottom:6px;opacity:0.7;">
                        <span style="font-size:12px;width:14px;display:inline-block;text-align:center;">⌛</span>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:12px;font-weight:600;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:line-through;">${item.text}</div>
                            <div style="font-size:9px;color:#94a3b8;margin-top:2px;text-transform:uppercase;font-weight:800;">Status: ${item.status} — must be Done</div>
                        </div>
                    </div>
                `).join('')
                bodyHTML = `
                    <div style="text-align:center;padding:12px 0 20px;color:#64748b;">
                        <div style="font-size:32px;margin-bottom:8px;">🚧</div>
                        <div style="font-weight:700;margin-bottom:4px;color:#1e293b;">No done items yet</div>
                        <div style="font-size:11px;">Complete items in <strong>${sprintLabel}</strong> before shipping them to a release.</div>
                    </div>
                    <div style="max-height:240px;overflow-y:auto;padding-right:4px;">${rows}</div>`
            } else {
                const rows = renderList.map(item => {
                    const checked = selectedIds.has(item.id)
                    const rel = item.releasedIn ? (releases.find(r => r.id === item.releasedIn)?.name || 'a release') : null
                    const releasedBadge = rel ? `<span style="font-size:9px;padding:2px 6px;background:#fef2f2;border-radius:4px;font-weight:700;color:#991b1b;flex-shrink:0;">Shipped in ${rel}</span>` : ''
                    const pts = item.storyPoints ? `<span style="font-size:9px;padding:2px 6px;background:#f1f5f9;border-radius:4px;font-weight:700;color:#64748b;">${item.storyPoints}SP</span>` : ''
                    const epic = (UPDATE_DATA.metadata?.epics || []).find(e => e.id === item.epicId)
                    const epicTag = epic ? `<span style="font-size:9px;padding:1px 6px;background:#ede9fe;border-radius:4px;font-weight:700;color:#6d28d9;">${epic.name.substring(0,20)}</span>` : ''
                    return `
                        <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${checked ? '#c7d2fe' : '#e2e8f0'};background:${checked ? '#eef2ff' : 'white'};cursor:pointer;transition:all 0.15s;margin-bottom:6px;">
                            <input type="checkbox" data-item-id="${item.id}" ${checked ? 'checked' : ''} style="accent-color:#4f46e5;width:14px;height:14px;flex-shrink:0;" onchange="window._rbToggleItem('${item.id}', this.checked)">
                            <div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:12px;font-weight:600;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.text}</div>
                                    <div style="display:flex;gap:4px;margin-top:3px;flex-wrap:wrap;">${pts}${epicTag}</div>
                                </div>
                                ${releasedBadge}
                            </div>
                        </label>`
                }).join('')

                bodyHTML = `
                    <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-size:11px;color:#64748b;font-weight:600;">${selectedIds.size} of ${renderList.length} items selected · ${totalPts} story points</span>
                        <div style="display:flex;gap:8px;">
                            <button onclick="window._rbSelectAll(true)" style="font-size:10px;font-weight:700;color:#4f46e5;background:none;border:none;cursor:pointer;padding:2px;">Select all</button>
                            <button onclick="window._rbSelectAll(false)" style="font-size:10px;font-weight:700;color:#64748b;background:none;border:none;cursor:pointer;padding:2px;">Deselect all</button>
                        </div>
                    </div>
                    <div style="max-height:280px;overflow-y:auto;padding-right:4px;">${rows}</div>`
            }
        }

        if (step === 2) {
            const existingReleaseOpts = releases.map(r => {
                const itemCount = 0  // simplified
                return `
                    <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${targetReleaseId === r.id ? '#c7d2fe' : '#e2e8f0'};background:${targetReleaseId === r.id ? '#eef2ff' : 'white'};cursor:pointer;margin-bottom:6px;">
                        <input type="radio" name="rb-release" value="${r.id}" ${targetReleaseId === r.id ? 'checked' : ''} style="accent-color:#4f46e5;flex-shrink:0;" onchange="window._rbSetRelease('${r.id}')">
                        <div style="flex:1;">
                            <div style="font-size:12px;font-weight:700;color:#1e293b;">${r.name}</div>
                            ${r.targetDate ? `<div style="font-size:10px;color:#64748b;">Target: ${r.targetDate}</div>` : ''}
                        </div>
                    </label>`
            }).join('')

            const newReleaseSection = `
                <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${targetReleaseId === '__new__' ? '#c7d2fe' : '#e2e8f0'};background:${targetReleaseId === '__new__' ? '#eef2ff' : 'white'};cursor:pointer;margin-bottom:6px;">
                    <input type="radio" name="rb-release" value="__new__" ${targetReleaseId === '__new__' ? 'checked' : ''} style="accent-color:#4f46e5;flex-shrink:0;" onchange="window._rbSetRelease('__new__')">
                    <div style="flex:1;">
                        <div style="font-size:12px;font-weight:700;color:#4f46e5;">+ Create new release</div>
                        ${targetReleaseId === '__new__' ? `
                        <input type="text" id="rb-new-release-name" value="${createNewName}" placeholder="e.g. v2.4 — May Release" 
                            style="margin-top:6px;width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:6px;font-size:12px;font-weight:600;outline:none;"
                            oninput="window._rbSetNewReleaseName(this.value)">` : ''}
                    </div>
                </label>`

            bodyHTML = `
                <div style="margin-bottom:12px;font-size:11px;color:#64748b;font-weight:600;">Ship <strong>${selectedIds.size} items</strong> to which release?</div>
                ${existingReleaseOpts}
                ${newReleaseSection}`
        }

        if (step === 3) {
            const selectedList = allCandidates.filter(i => selectedIds.has(i.id))
            const releaseName = targetReleaseId === '__new__'
                ? (createNewName || 'New Release')
                : (releases.find(r => r.id === targetReleaseId)?.name || 'Unknown')
            const totalPts = selectedList.reduce((s, i) => s + (i.storyPoints || 0), 0)

            bodyHTML = `
                <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:16px;">
                    <div style="font-size:28px;margin-bottom:10px;">📦</div>
                    <div style="font-size:16px;font-weight:800;color:#1e293b;margin-bottom:4px;">${selectedIds.size} items → ${releaseName}</div>
                    <div style="font-size:12px;color:#64748b;">${totalPts} story points · from ${sprintLabel}</div>
                </div>
                <label style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:8px;border:1px solid ${shouldPublish ? '#bbf7d0' : '#e2e8f0'};background:${shouldPublish ? '#f0fdf4' : 'white'};cursor:pointer;margin-bottom:8px;">
                    <input type="checkbox" ${shouldPublish ? 'checked' : ''} style="accent-color:#059669;width:14px;height:14px;flex-shrink:0;" onchange="window._rbSetPublish(this.checked)">
                    <div>
                        <div style="font-size:12px;font-weight:700;color:#1e293b;">Publish release now</div>
                        <div style="font-size:10px;color:#64748b;">Sets <code>publishedAt</code> to today and marks release as shipped</div>
                    </div>
                </label>
                <div style="font-size:10px;color:#94a3b8;padding:0 2px;">After shipping, you'll be prompted to update OKR progress.</div>`
        }

        const canProceedStep1 = allCandidates.length === 0 || selectedIds.size > 0
        const canProceedStep2 = targetReleaseId && (targetReleaseId !== '__new__' || createNewName.trim().length > 0)

        overlay.innerHTML = `
            <div style="background:white;border-radius:20px;box-shadow:0 40px 80px -15px rgba(0,0,0,0.2),inset 0 0 0 1px rgba(0,0,0,0.06);width:100%;max-width:520px;margin:0 16px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
                <!-- Header -->
                <div style="padding:20px 24px 16px;border-bottom:1px solid #f1f5f9;flex-shrink:0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                        <div>
                            <div style="font-size:14px;font-weight:800;color:#1e293b;letter-spacing:-0.02em;">🚀 Release Builder</div>
                            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Ship done items from ${sprintLabel}</div>
                        </div>
                        <button onclick="window._rbClose()" style="background:#f1f5f9;border:none;border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:14px;color:#64748b;">✕</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;">${stepIndicator}</div>
                </div>
                <!-- Body -->
                <div style="padding:20px 24px;flex:1;overflow-y:auto;">${bodyHTML}</div>
                <!-- Footer -->
                <div style="padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;gap:8px;flex-shrink:0;">
                    ${step > 1 ? `<button onclick="window._rbStep(${step - 1})" style="padding:9px 16px;border-radius:8px;background:#f1f5f9;border:none;font-size:12px;font-weight:700;color:#64748b;cursor:pointer;">← Back</button>` : ''}
                    <div style="flex:1;"></div>
                    <button onclick="window._rbClose()" style="padding:9px 16px;border-radius:8px;background:white;border:1px solid #e2e8f0;font-size:12px;font-weight:700;color:#64748b;cursor:pointer;">Cancel</button>
                    ${step < 3
                        ? `<button onclick="window._rbStep(${step + 1})" ${(!canProceedStep1 && step === 1) || (!canProceedStep2 && step === 2) ? 'disabled' : ''} style="padding:9px 20px;border-radius:8px;background:#4f46e5;border:none;font-size:12px;font-weight:700;color:white;cursor:pointer;opacity:${(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2) ? 0.4 : 1};">Next →</button>`
                        : `<button onclick="window._rbConfirm()" style="padding:9px 20px;border-radius:8px;background:#059669;border:none;font-size:12px;font-weight:700;color:white;cursor:pointer;">📦 Ship ${selectedIds.size} Items</button>`
                    }
                </div>
            </div>`
    }

    // -- Event handlers --
    window._rbClose = () => { overlay.remove(); delete window._rbClose; }
    window._rbStep = (n) => { step = n; renderWizard(); }
    window._rbToggleItem = (id, checked) => { checked ? selectedIds.add(id) : selectedIds.delete(id); renderWizard(); }
    window._rbSelectAll = (v) => { v ? allCandidates.forEach(i => selectedIds.add(i.id)) : selectedIds.clear(); renderWizard(); }
    window._rbSetRelease = (id) => { targetReleaseId = id; renderWizard(); }
    window._rbSetNewReleaseName = (v) => { createNewName = v; }
    window._rbSetPublish = (v) => { shouldPublish = v; renderWizard(); }

    window._rbConfirm = () => {
        // 1. Create new release if requested
        let finalReleaseId = targetReleaseId
        if (targetReleaseId === '__new__') {
            const newRelease = {
                id: `release-${Date.now()}`,
                name: createNewName.trim() || 'New Release',
                targetDate: '',
                publishedAt: shouldPublish ? new Date().toISOString() : null,
            }
            if (!UPDATE_DATA.metadata.releases) UPDATE_DATA.metadata.releases = []
            UPDATE_DATA.metadata.releases.push(newRelease)
            finalReleaseId = newRelease.id
        } else if (shouldPublish) {
            const r = (UPDATE_DATA.metadata.releases || []).find(r => r.id === finalReleaseId)
            if (r) r.publishedAt = new Date().toISOString()
        }

        // 2. Assign selected items to release
        let count = 0
        UPDATE_DATA.tracks.forEach(track => {
            track.subtracks.forEach(subtrack => {
                subtrack.items.forEach(item => {
                    if (selectedIds.has(item.id)) {
                        item.releasedIn = finalReleaseId
                        count++
                    }
                })
            })
        })

        // 3. Save + close
        if (typeof logChange === 'function') logChange('Release Builder', `${count} items → release ${finalReleaseId}`)
        if (typeof saveToLocalStorage === 'function') saveToLocalStorage()
        if (typeof renderDashboard === 'function') renderDashboard()
        overlay.remove()

        // 4. Handoff toast
        const relName = (UPDATE_DATA.metadata.releases || []).find(r => r.id === finalReleaseId)?.name || 'release'
        if (typeof showHandoffToast === 'function') {
            showHandoffToast(
                `📦 ${count} items shipped to ${relName} ✓`,
                'Update OKRs →',
                () => switchView('okr'),
                6000
            )
        }
    }

    renderWizard()
}

// Keep backward compat — old button calls still work
function promoteSprintToRelease(sprintId) {
    openReleaseBuilder(sprintId)
}

window.openReleaseBuilder     = openReleaseBuilder
window.promoteSprintToRelease = promoteSprintToRelease


function closeCmsModal() {
    if (window.uiState.isDirty) {
        const confirmed = confirm('You have unsaved changes. Discard them?');
        if (!confirmed) return;
    }
    window.uiState.isDirty = false;
    const modal = document.getElementById('cms-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    editContext = null;
}

// ------ TAG/CHIP INPUT HELPER ------
function renderTagWidget(wrapperId, initial, datalistId, type) {
    let currentSelection = Array.isArray(initial) ? [...initial] : (initial ? [initial] : []);
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    function getOptionsForType(t) {
        if (t === 'author') {
            const set = new Set(["Subhrajit", "Vivek", "Manish", "Raj", "Nikhil", "Rushikesh", "Susmit", "Pritish", "External"]);
            UPDATE_DATA.tracks.forEach(track => track.subtracks.forEach(s => s.items.forEach(i => (i.contributors || []).forEach(c => set.add(c)))));
            return Array.from(set).map(v => ({ value: v, text: v }));
        }
        if (t === 'tag') {
            const set = new Set(["Engineering", "Project-Updates", "Bug-Fix", "Feature", "Research", "Documentation", "Design", "Refactor", "Security", "SEO", "Performance", "Testing"]);
            UPDATE_DATA.tracks.forEach(track => track.subtracks.forEach(s => s.items.forEach(i => (i.tags || []).forEach(tg => set.add(tg)))));
            return Array.from(set).map(v => ({ value: v, text: v }));
        }
        if (t === 'dep') {
            const all = [];
            UPDATE_DATA.tracks.forEach(track => track.subtracks.forEach(s => s.items.forEach(i => all.push({ value: i.id, text: i.text }))));
            return all;
        }
        return [];
    }

    function refresh() {
        if (type === 'author') _selectedContributors = currentSelection;
        if (type === 'tag') _selectedTags = currentSelection;
        if (type === 'dep') _selectedDeps = currentSelection;

        const allOptions = getOptionsForType(type);
        const availableOptions = allOptions.filter(o => !currentSelection.includes(o.value));

        const chipsArea = document.getElementById(`${wrapperId}-chips`);
        const sugBox = document.getElementById(`${wrapperId}-suggestions`);

        if (chipsArea) {
            chipsArea.innerHTML = currentSelection.map(val => {
                let label = val;
                if (type === 'dep') {
                    let found = null;
                    UPDATE_DATA.tracks.forEach(t => t.subtracks.forEach(s => s.items.forEach(i => { if (i.id === val) found = i.text; })));
                    label = found ? found : val;
                }
                return `
                    <span class="contributor-tag ${type === 'tag' ? '!bg-slate-100 !text-slate-700' : (type === 'dep' ? '!bg-amber-50 !text-amber-800 border-amber-200' : '')}">
                        ${label}
                        <span class="contributor-tag-remove" onclick="removeWidgetTag('${wrapperId}', '${val}', '${type}')">&times;</span>
                    </span>`;
            }).join('');
        }

        if (sugBox) {
            sugBox.innerHTML = availableOptions.slice(0, 10).map(o => `
                <button type="button" class="text-[10px] px-2 py-1 bg-slate-50 hover:bg-slate-200 border border-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors" 
                    onclick="selectWidgetTag('${wrapperId}', '${o.value}', '${type}')">
                    + ${o.text.length > 20 ? o.text.substring(0, 20) + '...' : o.text}
                </button>
            `).join('');
        }
    }

    wrapper.innerHTML = `
        <div id="${wrapperId}-chips" class="flex flex-wrap gap-2 mb-2"></div>
        <div class="relative">
            <input type="text" class="tag-input-field !mb-0" placeholder="Add ${type === 'author' ? 'contributor' : (type === 'tag' ? 'tag' : 'dependency')}..." id="${wrapperId}-input">
            <div id="${wrapperId}-suggestions" class="flex flex-wrap gap-1.5 mt-2 overflow-x-auto pb-1"></div>
        </div>
    `;

    const input = document.getElementById(`${wrapperId}-input`);

    // Global access for onclicks
    window[`refresh_${wrapperId}`] = refresh;
    window[`selection_${wrapperId}`] = currentSelection;
    window[`options_${wrapperId}`] = type; // Store type to get options later

    input.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            if (e.key === ',' || e.key === 'Tab') e.preventDefault();
            const val = input.value.replace(/,$/, '').trim();
            if (val && !currentSelection.includes(val)) {
                currentSelection.push(val);
                input.value = '';
                refresh();
            }
        }
    };

    input.oninput = (e) => {
        const val = input.value.trim();
        const availableOptions = getOptionsForType(type).filter(o => !currentSelection.includes(o.value));

        if (val.length > 0) {
            const filtered = availableOptions.filter(o => o.text.toLowerCase().includes(val.toLowerCase()) || o.value.toLowerCase().includes(val.toLowerCase()));
            const sugBox = document.getElementById(`${wrapperId}-suggestions`);
            if (sugBox) {
                sugBox.innerHTML = filtered.slice(0, 10).map(o => `
                    <button type="button" class="text-[10px] px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-indigo-700 font-bold" 
                        onclick="selectWidgetTag('${wrapperId}', '${o.value}', '${type}')">
                        + ${o.text.length > 20 ? o.text.substring(0, 20) + '...' : o.text}
                    </button>
                `).join('');
            }
        } else {
            refresh();
        }

        // Auto-add if exact match
        if (availableOptions.some(o => o.value === val)) {
            currentSelection.push(val);
            input.value = '';
            refresh();
        }
    };
    refresh();
}

function selectWidgetTag(wrapperId, val, type) {
    const selection = window[`selection_${wrapperId}`];
    if (selection && !selection.includes(val)) {
        selection.push(val);
        window[`refresh_${wrapperId}`]();
    }
}

function removeWidgetTag(wrapperId, val, type) {
    const selection = window[`selection_${wrapperId}`];
    if (selection) {
        const idx = selection.indexOf(val);
        if (idx > -1) {
            selection.splice(idx, 1);
            window[`refresh_${wrapperId}`]();
        }
    }
}

// Keep legacy for safety if called from other places, but we transitioned to renderTagWidget
function renderContributorTagInput(w, i) { renderTagWidget(w, i, 'contributor-list', 'author'); }

// ------ SPRINT & RELEASE OPS ------
function openSprintEdit(sprintId) {
    const sprint = sprintId ? UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId) : { name: '', startDate: '', endDate: '', goal: '', linkedOKR: '' };
    editContext = { type: 'sprint', sprintId };

    const okrs = UPDATE_DATA.metadata.okrs || [];

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🏃</span>
            <span class="font-black tracking-tight">${sprintId ? 'Edit Sprint' : 'Add New Sprint'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Execution Stage Banner -->
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Lifecycle Stage: Delivery</div>
            <div class="stage-desc">Standardize the sprint window. Defined goals prevent scope creep and ensure focus.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Sprint Descriptor</label>
                <input type="text" id="edit-sprint-name" value="${sprint.name}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Foundation Sprint 01">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Start Date</label>
                    <input type="date" id="edit-sprint-start" value="${sprint.startDate || ''}" class="cms-input shadow-sm focus:shadow-md">
                </div>
                <div>
                    <label class="cms-label">Target Completion</label>
                    <input type="date" id="edit-sprint-end" value="${sprint.endDate || ''}" class="cms-input shadow-sm focus:shadow-md">
                </div>
            </div>

            <div>
                <label class="cms-label">Objective Alignment</label>
                <select id="edit-sprint-okr" class="cms-input shadow-sm focus:shadow-md">
                    <option value="">None (Tactical / Unlinked)</option>
                    ${okrs.map(o => `<option value="${o.id}" ${sprint.linkedOKR === o.id ? 'selected' : ''}>${o.quarter}: ${o.objective}</option>`).join('')}
                </select>
            </div>

            <div>
                <label class="cms-label">Core Sprint Goal</label>
                <textarea id="edit-sprint-goal" class="cms-input shadow-sm focus:shadow-md" rows="2" placeholder="What is the primary mission of this cycle?">${sprint.goal || ''}</textarea>
            </div>

            ${sprint.retro ? buildRetroReadonlySection(sprint) : (sprintId && sprint.status === 'completed' ? `
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                    <div class="text-xs font-black text-amber-800">No retrospective written yet</div>
                    <div class="text-[10px] text-amber-600 mt-0.5">Document learnings while they're fresh</div>
                </div>
                <button onclick="openRetroModal('${sprintId}')"
                    class="shrink-0 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-amber-700 transition-all">
                    📝 Write Retro
                </button>
            </div>` : '')}
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${sprintId ? `
            <button onclick="deleteSprint('${sprintId}')" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🔒</span> Close Sprint
            </button>
        ` : ''}
        ${sprintId && sprint.status === 'completed' ? `
            <button onclick="openRetroModal('${sprintId}')" class="cms-btn cms-btn-secondary flex items-center gap-2">
                <span>📝</span> ${sprint.retro ? 'Edit Retro' : 'Write Retro'}
            </button>` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${sprintId ? 'Save Changes' : 'Create Sprint'}
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Lifecycle Ceremony: Sprint Close
 * Handles rollover and velocity recording
 */
function renderSprintCloseModal(sprintId) {
    const sprint = UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('sprintId', sprintId) : [];
    const doneItems = items.filter(i => i.status === 'done');
    const pendingItems = items.filter(i => i.status !== 'done');

    const plannedPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);
    const completedPoints = doneItems.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🏁</span>
            <span class="font-black tracking-tight">Close Sprint: ${sprint.name}</span>
        </div>
    `;

    let pendingHtml = '';
    if (pendingItems.length > 0) {
        pendingHtml = `
            <div class="mt-6">
                <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Rollover Decisions (${pendingItems.length} items)</h4>
                <div class="space-y-2 max-h-60 overflow-y-auto pr-2">
                    ${pendingItems.map(item => `
                        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                            <div class="flex-1 min-w-0">
                                <div class="text-[10px] font-bold text-slate-400 uppercase">#${item.id} · ${item.status}</div>
                                <div class="text-xs font-bold text-slate-700 truncate">${item.text}</div>
                            </div>
                            <select class="cms-input !w-auto !mb-0 text-[10px] font-black" data-item-id="${item.id}" id="rollover-${item.id}">
                                <option value="next">Move to Next Sprint</option>
                                <option value="backlog">Move to Backlog</option>
                                <option value="drop">Drop from Sprint</option>
                            </select>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        pendingHtml = `
            <div class="mt-6 p-10 bg-emerald-50 border border-dashed border-emerald-200 rounded-3xl text-center">
                <div class="text-3xl mb-2">🎉</div>
                <h4 class="text-emerald-900 font-bold">Perfect Closure!</h4>
                <p class="text-emerald-700 text-xs">All items in this sprint were completed.</p>
            </div>
        `;
    }

    document.getElementById('modal-form').innerHTML = `
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Ceremony: Sprint Review</div>
            <div class="stage-desc">Formalize the end of the cycle. Record performance and clear the path for the next sprint.</div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="p-4 bg-slate-900 rounded-2xl text-white">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Actual Velocity</div>
                <div class="text-2xl font-black">${completedPoints} <span class="text-xs text-slate-500 font-bold">/ ${plannedPoints} pts</span></div>
                <div class="text-[10px] font-bold text-indigo-400 mt-1">${Math.round((completedPoints / (plannedPoints || 1)) * 100)}% Commitment Met</div>
            </div>
            <div class="p-4 bg-white border border-slate-200 rounded-2xl">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sprint Status</div>
                <div class="text-lg font-black text-slate-800">Finalizing...</div>
                <div class="text-[10px] font-bold text-slate-500 mt-1 italic">Rollover logic applied on save</div>
            </div>
        </div>

        ${pendingHtml}
    `;

    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="saveSprintClose('${sprintId}')" class="cms-btn cms-btn-primary">🏁 Finish & Close Sprint</button>
    `;

    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function saveSprintClose(sprintId) {
    const sprintIndex = UPDATE_DATA.metadata.sprints.findIndex(s => s.id === sprintId);
    if (sprintIndex === -1) return;

    const sprint = UPDATE_DATA.metadata.sprints[sprintIndex];
    // Find next non-completed sprint by position (not just index+1, handles gaps/deletions)
    const nextSprint = UPDATE_DATA.metadata.sprints.find((s, i) => i > sprintIndex && s.status !== 'completed');

    // 1. Calculate final points
    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('sprintId', sprintId) : [];
    const doneItems = items.filter(i => i.status === 'done');
    const plannedPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);
    const completedPoints = doneItems.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);

    // 2. Apply rollover resolutions
    const resolutionSelects = document.querySelectorAll('[id^="rollover-"]');
    const movements = [];
    
    resolutionSelects.forEach(select => {
        const itemId = select.getAttribute('data-item-id');
        const resolution = select.value;
        const item = items.find(i => i.id === itemId);
        if (item) movements.push({ item, resolution });
    });

    // Sort descending by itemIndex so splice doesn't affect subsequent indices
    movements.sort((a, b) => b.item.itemIndex - a.item.itemIndex);

    movements.forEach(m => {
        const { item, resolution } = m;
        // Update the real item in UPDATE_DATA
        const track = UPDATE_DATA.tracks[item.trackIndex];
        const subtrack = track.subtracks[item.subtrackIndex];
        const realItem = subtrack.items[item.itemIndex];

        if (resolution === 'next') {
            if (nextSprint) {
                realItem.sprintId = nextSprint.id;
                realItem.status = 'next'
            } else {
                // Fallback to backlog if no next sprint exists
                realItem.sprintId = '';
                realItem.status = 'later';
                moveItemToBacklog(item);
                if (typeof showToast === 'function') showToast(`No future sprint found — #${realItem.id} moved to backlog.`, 'warn');
            }
        } else if (resolution === 'backlog') {
            realItem.sprintId = '';
            realItem.status = 'later';
            moveItemToBacklog(item);
        } else if (resolution === 'drop') {
            // Drop = unassign from sprint and send to backlog as later
            realItem.sprintId = '';
            realItem.status = 'later';
            moveItemToBacklog(item);
        }
        realItem.updatedAt = new Date().toISOString();
    });

    // 3. Record Velocity History
    if (!UPDATE_DATA.metadata.velocityHistory) UPDATE_DATA.metadata.velocityHistory = [];
    
    // Check if record already exists, if so update it, else push
    const existingHistoryIdx = UPDATE_DATA.metadata.velocityHistory.findIndex(h => h.sprintId === sprintId);
    const historyRecord = {
        sprintId: sprintId,
        planned: plannedPoints,
        completed: completedPoints,
        velocity: Math.round((completedPoints / (plannedPoints || 1)) * 100),
        dates: `${sprint.startDate} - ${sprint.endDate}`
    };

    if (existingHistoryIdx !== -1) {
        UPDATE_DATA.metadata.velocityHistory[existingHistoryIdx] = historyRecord;
    } else {
        UPDATE_DATA.metadata.velocityHistory.push(historyRecord);
    }

    // 4. Update Sprint Status
    UPDATE_DATA.metadata.sprints[sprintIndex].status = 'completed';
    UPDATE_DATA.metadata.sprints[sprintIndex].completedPoints = completedPoints;

    // 5. Auto-recalc OKR progress for the linked OKR (if any)
    if (sprint.linkedOKR && typeof recalcOKRProgress === 'function') {
        const newOKRProgress = recalcOKRProgress(sprint.linkedOKR)
        if (newOKRProgress !== null) {
            logChange('okr-recalc', `OKR ${sprint.linkedOKR} → ${newOKRProgress}% (via sprint close)`)
        }
    }

    // 6. Notify and Save
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    
    // High-Fidelity Stats
    const totalTasks = items.length;
    const doneTasksCount = doneItems.length;
    const contributionSet = new Set();
    items.forEach(i => {
        if (Array.isArray(i.contributors)) {
            i.contributors.forEach(c => contributionSet.add(c));
        }
    });

    // Counts for summary
    const summary = {
        movedToNext: movements.filter(m => m.resolution === 'next').length,
        movedToBacklog: movements.filter(m => m.resolution === 'backlog').length,
        dropped: movements.filter(m => m.resolution === 'drop').length,
        totalResolved: movements.length,
        velocityResult: Math.round((completedPoints / (plannedPoints || 1)) * 100)
    };

    // ENSURE MODAL STAYS OPEN for the summary screen
    window._skipModalCloseOnce = true;

    const nextSprintName = nextSprint ? nextSprint.name : 'Backlog';

    // Velocity trend comparison
    const history = UPDATE_DATA.metadata.velocityHistory || [];
    const prevSprints = history.filter(h => h.sprintId !== sprintId).slice(-3);
    const avgVelocity = prevSprints.length ? Math.round(prevSprints.reduce((sum, h) => sum + h.completed, 0) / prevSprints.length) : null;
    const velocityTrend = avgVelocity !== null ? (completedPoints >= avgVelocity ? `↑ Above avg (${avgVelocity} pts)` : `↓ Below avg (${avgVelocity} pts)`) : 'First sprint';

    // Sprint duration in days
    const durationDays = (sprint.startDate && sprint.endDate)
        ? Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / (1000 * 60 * 60 * 24))
        : null;

    // Blocked items count at closure
    const blockedCount = items.filter(i => i.status === 'blocked').length;

    // Top contributors by task count
    const contrTaskCount = {};
    items.forEach(i => (i.contributors || []).forEach(c => { contrTaskCount[c] = (contrTaskCount[c] || 0) + 1; }));
    const topContributors = Object.entries(contrTaskCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, cnt]) => `${n} (${cnt})`).join(', ') || 'N/A';

    // Linked OKR
    const sprintOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === sprint.linkedOKR);

    const auditConfig = {
        timestamp: new Date().toISOString(),
        title: `Sprint ${sprint.name} Closed`,
        description: `${completedPoints} pts delivered · ${summary.velocityResult}% commitment met · ${velocityTrend}`,
        mission: {
            objective: sprint.goal || 'No goal defined for this sprint',
            track: 'Sprint Team',
            timeline: `${sprint.startDate || 'TBD'} → ${sprint.endDate || 'TBD'}${durationDays ? ` (${durationDays}d)` : ''}`
        },
        details: [
            { label: 'Velocity', count: `${completedPoints} / ${plannedPoints} pts`, icon: '⚡' },
            { label: 'Task Closure', count: `${doneTasksCount} / ${totalTasks}`, icon: '📊' },
            { label: `Rolled → ${nextSprintName}`, count: summary.movedToNext, icon: '🏃' },
            { label: 'To Backlog', count: summary.movedToBacklog, icon: '📚' }
        ],
        extras: [
            { label: 'Velocity Trend', value: velocityTrend },
            { label: 'Top Contributors', value: topContributors },
            { label: 'Blocked at Close', value: blockedCount },
            { label: 'Sprint Duration', value: durationDays ? `${durationDays} days` : 'N/A' },
            { label: 'OKR Aligned', value: sprintOKR ? sprintOKR.objective.substring(0, 50) : 'None' }
        ],
        items: items.map(i => ({
            id: i.id,
            name: i.text,
            type: 'task',
            status: i.status === 'done' ? 'done' : 'rolled',
            lead: (i.contributors || [])[0],
            points: i.storyPoints,
            destination: i.status === 'done' ? 'Shipped' : (movements.find(m => m.item.id === i.id)?.resolution || 'next').toUpperCase()
        })),
        actions: [
            { label: '📝 Write Retro', fn: () => openRetroModal('${sprintId}') },
            { label: 'Go to Kanban', fn: () => switchView('kanban') }
        ]
    };

    saveCeremonyAudit('sprint', sprintId, auditConfig);
    renderCeremonySuccess('sprint', auditConfig);

    if (typeof renderSprintView === 'function') renderSprintView();
    if (typeof renderAnalyticsView === 'function') renderAnalyticsView();
}

// ------ Sprint Retro Template ------

/**
 * Opens the retrospective form inside the already-open CMS modal.
 * Pre-populates sections from closed sprint data so the PM only
 * needs to fill in qualitative observations.
 */
function openRetroModal(sprintId) {
    const sprint = (UPDATE_DATA.metadata.sprints || []).find(s => s.id === sprintId)
    if (!sprint) return

    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('sprintId', sprintId) : []
    const doneItems   = items.filter(i => i.status === 'done')
    const blockedItems = items.filter(i => i.blocker || i.status === 'blocked')
    const rolledItems = items.filter(i => i.status !== 'done')

    const plannedPts   = items.reduce((s, i) => s + (parseInt(i.storyPoints) || 0), 0)
    const completedPts = doneItems.reduce((s, i) => s + (parseInt(i.storyPoints) || 0), 0)
    const velocityPct  = Math.round((completedPts / (plannedPts || 1)) * 100)

    const history = (UPDATE_DATA.metadata.velocityHistory || []).filter(h => h.sprintId !== sprintId).slice(-3)
    const avgVelocity = history.length
        ? Math.round(history.reduce((s, h) => s + h.completed, 0) / history.length)
        : null

    const sprintOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === sprint.linkedOKR)

    // Build suggested "What went well" bullets from data
    const wellSuggestions = []
    if (velocityPct >= 80) wellSuggestions.push(`✅ Strong delivery — ${velocityPct}% commitment met (${completedPts}/${plannedPts} pts)`)
    if (blockedItems.length === 0) wellSuggestions.push('✅ Sprint ran blocker-free')
    if (rolledItems.length === 0) wellSuggestions.push('✅ Full sprint closure — zero rollover')
    if (sprintOKR) wellSuggestions.push(`✅ Aligned to OKR: "${(sprintOKR.objective || '').substring(0, 60)}"`)
    const wellDefault = wellSuggestions.join('\n') || '(add observations here)'

    // Build suggested "What didn't go well" bullets
    const didntSuggestions = []
    if (velocityPct < 70) didntSuggestions.push(`⚠️ Velocity below target — ${velocityPct}% (${completedPts}/${plannedPts} pts)`)
    if (avgVelocity !== null && completedPts < avgVelocity) didntSuggestions.push(`⚠️ Below 3-sprint avg of ${avgVelocity} pts`)
    if (blockedItems.length > 0) didntSuggestions.push(`⚠️ ${blockedItems.length} blocker${blockedItems.length > 1 ? 's' : ''} during sprint: ${blockedItems.map(i => i.text.substring(0,30)).join('; ')}`)
    if (rolledItems.length > 0) didntSuggestions.push(`⚠️ ${rolledItems.length} item${rolledItems.length > 1 ? 's' : ''} rolled over`)
    const didntDefault = didntSuggestions.join('\n') || '(add observations here)'

    // Existing retro if already written
    const existing = sprint.retro || {}

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">📝</span>
            <span class="font-black tracking-tight">Sprint Retrospective — ${sprint.name}</span>
        </div>`

    document.getElementById('modal-banner').innerHTML = `
        <div class="flex flex-wrap gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span class="font-bold text-slate-500">Velocity: <strong class="text-slate-900">${velocityPct}%</strong></span>
            <span class="text-slate-300">|</span>
            <span class="font-bold text-slate-500">Done: <strong class="text-slate-900">${doneItems.length}/${items.length} tasks</strong></span>
            <span class="text-slate-300">|</span>
            <span class="font-bold text-slate-500">Blockers: <strong class="${blockedItems.length ? 'text-red-600' : 'text-slate-900'}">${blockedItems.length}</strong></span>
            ${avgVelocity !== null ? `<span class="text-slate-300">|</span><span class="font-bold text-slate-500">3-sprint avg: <strong class="text-slate-900">${avgVelocity} pts</strong></span>` : ''}
        </div>`

    document.getElementById('modal-form').innerHTML = `
        <div class="space-y-5">

            <div>
                <label class="cms-label">🟢 What went well?</label>
                <textarea id="retro-well" class="cms-input font-mono text-xs" rows="5"
                    placeholder="Observations about what worked…">${existing.well || wellDefault}</textarea>
            </div>

            <div>
                <label class="cms-label">🔴 What didn't go well?</label>
                <textarea id="retro-didnt" class="cms-input font-mono text-xs" rows="5"
                    placeholder="Friction points, surprises, or misses…">${existing.didnt || didntDefault}</textarea>
            </div>

            <div>
                <label class="cms-label">⚡ Action items for next sprint</label>
                <textarea id="retro-actions" class="cms-input font-mono text-xs" rows="4"
                    placeholder="Concrete improvements to act on…">${existing.actions || ''}</textarea>
            </div>

            <div>
                <label class="cms-label">😊 Team morale (1 – 5)</label>
                <div class="flex gap-3" id="retro-morale-picker">
                    ${[1,2,3,4,5].map(n => `
                        <button type="button"
                            onclick="document.querySelectorAll('.retro-morale-btn').forEach(b=>b.classList.remove('ring-2','ring-indigo-500','bg-indigo-50')); this.classList.add('ring-2','ring-indigo-500','bg-indigo-50'); document.getElementById('retro-morale-value').value='${n}'"
                            class="retro-morale-btn flex-1 py-2 rounded-xl border-2 border-slate-200 text-lg font-black text-slate-700 hover:border-indigo-300 transition-all ${(existing.morale || 0) == n ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}">
                            ${['😞','😐','🙂','😊','🚀'][n-1]}
                        </button>`).join('')}
                </div>
                <input type="hidden" id="retro-morale-value" value="${existing.morale || ''}">
            </div>

        </div>`

    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="saveRetro('${sprintId}')" class="cms-btn cms-btn-primary">💾 Save Retro</button>`

    // Ensure modal is open (it should already be from ceremony success)
    const modal = document.getElementById('cms-modal')
    if (!modal.classList.contains('active')) {
        modal.classList.add('active')
        document.body.style.overflow = 'hidden'
    }
}

function buildRetroReadonlySection(sprint) {
    const r = sprint.retro
    const moraleEmoji = ['😞','😐','🙂','😊','🚀'][r.morale - 1] || ''
    const savedDate = r.savedAt ? new Date(r.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

    const section = (label, value) => value ? `
        <div>
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">${label}</div>
            <div class="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono">${value}</div>
        </div>` : ''

    return `
        <div class="border-t border-slate-200 pt-5 space-y-4">
            <div class="flex items-center justify-between">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    📝 Retrospective ${savedDate ? `· Saved ${savedDate}` : ''}
                </div>
                ${moraleEmoji ? `<span class="text-lg" title="Team morale: ${r.morale}/5">${moraleEmoji}</span>` : ''}
            </div>
            ${section('🟢 What went well', r.well)}
            ${section('🔴 What didn\'t go well', r.didnt)}
            ${section('⚡ Action items', r.actions)}
        </div>`
}

function saveRetro(sprintId) {
    const sprint = (UPDATE_DATA.metadata.sprints || []).find(s => s.id === sprintId)
    if (!sprint) return

    sprint.retro = {
        well:    document.getElementById('retro-well')?.value.trim() || '',
        didnt:   document.getElementById('retro-didnt')?.value.trim() || '',
        actions: document.getElementById('retro-actions')?.value.trim() || '',
        morale:  parseInt(document.getElementById('retro-morale-value')?.value) || null,
        savedAt: new Date().toISOString()
    }

    saveToLocalStorage()
    if (typeof showToast === 'function') showToast('Retrospective saved — push to GitHub to persist', 'success')
    closeCmsModal()
}

/**
 * Lifecycle Ceremony: OKR Close
 * Formalizes the end of a quarterly strategic cycle
 */
function closeOKR(idx) {
    const okr = UPDATE_DATA.metadata.okrs[idx];
    if (!okr) return;

    // Show a proper in-modal picker instead of raw browser prompt
    editContext = { type: '_okrClose', idx };
    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🏁</span>
            <span class="font-black tracking-tight">Close OKR</span>
        </div>`;
    document.getElementById('modal-form').innerHTML = `
        <div class="lifecycle-banner strategic">
            <div class="stage-tag">Ceremony: OKR Quarter Close</div>
            <div class="stage-desc">Formalize the end of a strategic quarter. Record the outcome and archive the objective.</div>
        </div>
        <div class="space-y-5">
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-700 italic">
                <span class="font-black not-italic text-slate-900">Objective:</span> ${okr.objective}
            </div>
            <div class="p-4 bg-white border border-slate-200 rounded-2xl text-center">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Overall Progress</div>
                <div class="text-3xl font-black text-slate-900">${okr.overallProgress || 0}%</div>
            </div>
            <div>
                <label class="cms-label">Outcome Result</label>
                <div class="grid grid-cols-3 gap-3" id="okr-result-picker">
                    <button type="button" onclick="document.querySelectorAll('.okr-result-opt').forEach(b=>b.classList.remove('ring-2','ring-emerald-500')); this.classList.add('ring-2','ring-emerald-500'); document.getElementById('okr-result-value').value='achieved'"
                        class="okr-result-opt p-3 rounded-xl border-2 border-slate-200 text-center cursor-pointer hover:border-emerald-400 transition-all">
                        <div class="text-xl mb-1">🎯</div>
                        <div class="text-xs font-black text-emerald-700">Achieved</div>
                    </button>
                    <button type="button" onclick="document.querySelectorAll('.okr-result-opt').forEach(b=>b.classList.remove('ring-2','ring-emerald-500')); this.classList.add('ring-2','ring-emerald-500'); document.getElementById('okr-result-value').value='missed'"
                        class="okr-result-opt p-3 rounded-xl border-2 border-slate-200 text-center cursor-pointer hover:border-amber-400 transition-all">
                        <div class="text-xl mb-1">⚠️</div>
                        <div class="text-xs font-black text-amber-700">Missed</div>
                    </button>
                    <button type="button" onclick="document.querySelectorAll('.okr-result-opt').forEach(b=>b.classList.remove('ring-2','ring-emerald-500')); this.classList.add('ring-2','ring-emerald-500'); document.getElementById('okr-result-value').value='cancelled'"
                        class="okr-result-opt p-3 rounded-xl border-2 border-slate-200 text-center cursor-pointer hover:border-slate-400 transition-all">
                        <div class="text-xl mb-1">🚫</div>
                        <div class="text-xs font-black text-slate-600">Cancelled</div>
                    </button>
                </div>
                <input type="hidden" id="okr-result-value" value="achieved">
            </div>
        </div>`;
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="confirmCloseOKR(${idx})" class="cms-btn cms-btn-primary">🏁 Close OKR</button>`;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function confirmCloseOKR(idx) {
    const result = document.getElementById('okr-result-value')?.value || 'achieved';
    const okr = UPDATE_DATA.metadata.okrs[idx];
    if (!okr) return;

    UPDATE_DATA.metadata.okrs[idx].status = 'closed';
    UPDATE_DATA.metadata.okrs[idx].result = result;
    UPDATE_DATA.metadata.okrs[idx].updatedAt = new Date().toISOString();

    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    
    // Counts for summary
    const linkedEpics = (UPDATE_DATA.metadata.epics || []).filter(e => e.linkedOKR === okr.id);
    const completedEpics = linkedEpics.filter(e => e.status === 'completed').length;

    // ENSURE MODAL STAYS OPEN
    window._skipModalCloseOnce = true;

    // High-Fidelity Stats
    const totalKRs = (okr.keyResults || []).length;
    const achievedKRs = (okr.keyResults || []).filter(kr => kr.status === 'achieved' || kr.progress >= 100).length;
    const tracksInvolved = new Set(linkedEpics.map(e => e.track).filter(Boolean));
    const performanceScore = okr.overallProgress || 0;

    // Linked sprints count
    const linkedSprints = (UPDATE_DATA.metadata.sprints || []).filter(s => s.linkedOKR === okr.id || (okr.keyResults || []).some(kr => kr.sprintId === s.id));

    // KR detail items with progress bars
    const krItems = (okr.keyResults || []).map(kr => {
        const pct = kr.target ? Math.min(100, Math.round(((kr.current || 0) / kr.target) * 100)) : 0;
        return {
            name: `${kr.description} · ${kr.current || 0}/${kr.target} ${kr.unit}`,
            status: pct >= 100 ? 'done' : (pct >= 60 ? 'on-track' : 'at-risk'),
            destination: `${pct}% complete`,
            points: null,
            lead: null
        };
    });

    const resultColor = result === 'achieved' ? 'emerald' : result === 'missed' ? 'amber' : 'slate';

    const auditConfig = {
        timestamp: new Date().toISOString(),
        title: `OKR Closed: ${okr.quarter}`,
        description: `${result.toUpperCase()} · ${performanceScore}% overall · ${achievedKRs}/${totalKRs} key results hit`,
        mission: {
            objective: okr.objective,
            track: okr.owner,
            timeline: okr.quarter
        },
        details: [
            { label: 'Outcome', count: result.toUpperCase(), icon: result === 'achieved' ? '🎯' : result === 'missed' ? '⚠️' : '🚫' },
            { label: 'KR Hit Rate', count: `${achievedKRs} / ${totalKRs}`, icon: '📋' },
            { label: 'Epics Converted', count: `${completedEpics} / ${linkedEpics.length}`, icon: '🚀' },
            { label: 'Overall Progress', count: `${performanceScore}%`, icon: '📈' }
        ],
        extras: [
            { label: 'Strategic Breadth', value: `${tracksInvolved.size} tracks involved` },
            { label: 'Linked Sprints', value: linkedSprints.length },
            { label: 'Linked Initiatives', value: linkedEpics.length }
        ],
        items: [
            ...krItems,
            ...linkedEpics.map(e => ({
                id: e.id,
                name: e.name,
                status: e.status,
                destination: e.status === 'completed' ? 'Delivered' : 'Pending',
                type: 'epic',
                lead: okr.owner
            }))
        ],
        actions: [
            { label: 'Review Detailed Metrics', fn: () => switchView('analytics') },
            { label: 'View OKR Alignment', fn: () => switchView('okr') }
        ]
    };

    saveCeremonyAudit('okr', okr.id, auditConfig);
    renderCeremonySuccess('okr', auditConfig);

    if (typeof renderOkrView === 'function') renderOkrView();
}

/**
 * Lifecycle Ceremony: Epic Close
 * Cleans up tactical debt and completes a strategic initiative
 */
function closeEpic(idx) {
    const epic = UPDATE_DATA.metadata.epics[idx];
    if (!epic) return;

    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('epicId', epic.id) : [];
    const doneItems = items.filter(i => i.status === 'done');
    const pendingItems = items.filter(i => i.status !== 'done');
    const blockedItems = items.filter(i => i.status === 'blocked');
    const totalPoints = items.reduce((sum, item) => sum + (parseInt(item.storyPoints) || 0), 0);
    const donePoints = doneItems.reduce((sum, item) => sum + (parseInt(item.storyPoints) || 0), 0);
    const completionPct = items.length ? Math.round((doneItems.length / items.length) * 100) : 0;
    const epicOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === epic.linkedOKR);
    const contributorSet = new Set(items.flatMap(i => i.contributors || []));

    // Show a confirmation modal with epic stats before destructive action
    editContext = { type: '_epicClose', idx };
    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🏁</span>
            <span class="font-black tracking-tight">Close Epic: ${epic.name}</span>
        </div>`;
    document.getElementById('modal-form').innerHTML = `
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Ceremony: Epic Closure</div>
            <div class="stage-desc">Archive this initiative. Incomplete tasks will be moved to the Backlog.</div>
        </div>
        <div class="space-y-4">
            <div class="grid grid-cols-3 gap-3">
                <div class="p-3 bg-slate-900 rounded-xl text-white text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Completion</div>
                    <div class="text-2xl font-black">${completionPct}%</div>
                </div>
                <div class="p-3 bg-white border border-slate-200 rounded-xl text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Done / Total</div>
                    <div class="text-2xl font-black">${doneItems.length} / ${items.length}</div>
                </div>
                <div class="p-3 bg-white border border-slate-200 rounded-xl text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">To Backlog</div>
                    <div class="text-2xl font-black ${pendingItems.length > 0 ? 'text-amber-600' : 'text-emerald-600'}">${pendingItems.length}</div>
                </div>
            </div>
            ${epicOKR ? `
            <div class="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3">
                <span>🎯</span>
                <div>
                    <div class="text-[9px] font-black text-indigo-500 uppercase">Parent OKR</div>
                    <div class="text-xs font-bold text-indigo-900">${epicOKR.objective}</div>
                </div>
            </div>` : ''}
            ${pendingItems.length > 0 ? `
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-bold">
                ⚠️ ${pendingItems.length} incomplete task${pendingItems.length !== 1 ? 's' : ''} will be moved to Backlog and unlinked from this epic.
            </div>` : `
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold text-center">
                🎉 All tasks complete — perfect closure!
            </div>`}
        </div>`;
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="confirmCloseEpic(${idx})" class="cms-btn cms-btn-primary">🏁 Archive Epic</button>`;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function confirmCloseEpic(idx) {
    const epic = UPDATE_DATA.metadata.epics[idx];
    if (!epic) return;

    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('epicId', epic.id) : [];
    const doneItems = items.filter(i => i.status === 'done');
    const pendingItems = items.filter(i => i.status !== 'done');
    const blockedItems = items.filter(i => i.status === 'blocked');
    const totalPoints = items.reduce((sum, item) => sum + (parseInt(item.storyPoints) || 0), 0);
    const donePoints = doneItems.reduce((sum, item) => sum + (parseInt(item.storyPoints) || 0), 0);
    const completionPct = items.length ? Math.round((doneItems.length / items.length) * 100) : 0;
    const epicOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === epic.linkedOKR);
    const contributorSet = new Set(items.flatMap(i => i.contributors || []));

    // Sort descending by itemIndex so splice doesn't affect subsequent indices
    const sortedPending = [...pendingItems].sort((a, b) => b.itemIndex - a.itemIndex);

    sortedPending.forEach(item => {
        const track = UPDATE_DATA.tracks[item.trackIndex];
        const subtrack = track.subtracks[item.subtrackIndex];
        const realItem = subtrack.items[item.itemIndex];
        realItem.epicId = '';
        realItem.status = 'later';
        realItem.updatedAt = new Date().toISOString();
        moveItemToBacklog(item);
    });

    UPDATE_DATA.metadata.epics[idx].status = 'completed';
    UPDATE_DATA.metadata.epics[idx].completedAt = new Date().toISOString();
    UPDATE_DATA.metadata.epics[idx].updatedAt = new Date().toISOString();

    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    window._skipModalCloseOnce = true;

    // Top contributors sorted by task count
    const contributorTaskCount = {};
    items.forEach(i => (i.contributors || []).forEach(c => { contributorTaskCount[c] = (contributorTaskCount[c] || 0) + 1; }));
    const topContributors = Object.entries(contributorTaskCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name).join(', ') || 'N/A';

    const auditConfig = {
        timestamp: new Date().toISOString(),
        title: `Epic Closed: ${epic.name}`,
        description: `${completionPct}% completion · ${donePoints} of ${totalPoints} story points delivered.`,
        mission: {
            objective: epic.successCriteria || epic.description || epic.name,
            track: epicOKR ? `OKR: ${epicOKR.objective.substring(0, 60)}` : (epic.track || 'N/A'),
            timeline: epic.planningHorizon || epic.timeline || 'N/A'
        },
        wins: epic.successMetrics || epic.successCriteria,
        details: [
            { label: 'Task Throughput', count: `${doneItems.length} / ${items.length}`, icon: '📊' },
            { label: 'Points Delivered', count: `${donePoints} / ${totalPoints} SP`, icon: '💎' },
            { label: 'Moved to Backlog', count: sortedPending.length, icon: '📚' },
            { label: 'Stage at Close', count: (epic.stage || 'delivery').toUpperCase(), icon: '🚦' }
        ],
        extras: [
            { label: 'Top Contributors', value: topContributors },
            { label: 'Blocked at Close', value: blockedItems.length },
            { label: 'Linked OKR', value: epicOKR ? epicOKR.quarter : 'None' },
            { label: 'Epic Health', value: completionPct >= 80 ? 'Healthy' : completionPct >= 50 ? 'At Risk' : 'Critical' }
        ],
        items: items.map(i => ({
            id: i.id,
            name: i.text,
            type: 'task',
            status: i.status,
            lead: (i.contributors || [])[0],
            points: i.storyPoints,
            destination: i.status === 'done' ? 'Completed' : 'Backlog'
        })),
        actions: [
            { label: 'View Analytics', fn: () => switchView('analytics') },
            { label: 'Return to Epics', fn: () => switchView('epics') }
        ]
    };

    saveCeremonyAudit('epic', epic.id, auditConfig);
    renderCeremonySuccess('epic', auditConfig);

    if (typeof renderEpicsView === 'function') renderEpicsView();
}

/**
 * Shared Helper: Physically move an item to the "Backlog" subtrack of its parent track
 * Used by ceremonies for physical data organization
 */
function moveItemToBacklog(itemRef) {
    const track = UPDATE_DATA.tracks[itemRef.trackIndex];
    if (!track) return;

    const sourceSubtrack = track.subtracks[itemRef.subtrackIndex];
    if (!sourceSubtrack) return;

    const backlogSubtrack = track.subtracks.find(s => s.name === 'Backlog');
    if (!backlogSubtrack) return;

    // Don't move if it's already in the backlog
    if (sourceSubtrack === backlogSubtrack) return;

    // 1. Get the real item object from the source
    const itemsToMove = sourceSubtrack.items.splice(itemRef.itemIndex, 1);
    const itemObj = itemsToMove[0];

    // 2. Add to backlog
    if (itemObj) {
        backlogSubtrack.items.push(itemObj);
    }
}

/**
 * Ceremony Handoff UI: Renders a success summary after a lifecycle closure
 */
function renderCeremonySuccess(type, config, isHistorical = false) {
    // Ceremony-type color accent config
    const typeTheme = {
        'sprint':         { color: '#059669', bg: 'bg-emerald-600', light: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', icon: '🏃', label: 'Sprint Ceremony' },
        'sprint-kickoff': { color: '#0ea5e9', bg: 'bg-sky-600',     light: 'bg-sky-50',      border: 'border-sky-200',     text: 'text-sky-700',     icon: '🚀', label: 'Sprint Kickoff' },
        'okr':            { color: '#4f46e5', bg: 'bg-indigo-600',  light: 'bg-indigo-50',   border: 'border-indigo-200',  text: 'text-indigo-700',  icon: '🎯', label: 'OKR Quarter Close' },
        'okr-launch':     { color: '#4f46e5', bg: 'bg-indigo-600',  light: 'bg-indigo-50',   border: 'border-indigo-200',  text: 'text-indigo-700',  icon: '🎯', label: 'OKR Quarter Launch' },
        'epic':           { color: '#7c3aed', bg: 'bg-violet-600',  light: 'bg-violet-50',   border: 'border-violet-200',  text: 'text-violet-700',  icon: '🚀', label: 'Epic Ceremony' },
        'epic-kickoff':   { color: '#7c3aed', bg: 'bg-violet-600',  light: 'bg-violet-50',   border: 'border-violet-200',  text: 'text-violet-700',  icon: '🚀', label: 'Epic Kickoff' },
        'release':        { color: '#d97706', bg: 'bg-amber-600',   light: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   icon: '🚢', label: 'Release Ceremony' },
        'release-lock':   { color: '#d97706', bg: 'bg-amber-600',   light: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   icon: '📋', label: 'Release Scope Lock' },
        'roadmap':        { color: '#0891b2', bg: 'bg-cyan-600',    light: 'bg-cyan-50',     border: 'border-cyan-200',    text: 'text-cyan-700',    icon: '🗺️', label: 'Roadmap Ceremony' }
    };
    const theme = typeTheme[type] || { color: '#475569', bg: 'bg-slate-600', light: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: '📜', label: 'Lifecycle Ceremony' };

    // 0. MODAL TITLE with ceremony type accent bar
    const modalTitleEl = document.getElementById('modal-title');
    if (modalTitleEl) {
        modalTitleEl.innerHTML = `
            <div class="flex items-center gap-3 w-full">
                <span class="px-3 py-1.5 rounded-full ${theme.light} ${theme.text} ${theme.border} border text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <span>${theme.icon}</span>${theme.label}
                </span>
                <span class="font-black tracking-tight text-slate-800 text-sm flex-1 truncate">${isHistorical ? '📜 Historical Audit' : 'Lifecycle Audit'}</span>
                ${isHistorical && config.timestamp ? `<span class="text-[9px] font-bold text-slate-400 shrink-0">${new Date(config.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>` : ''}
            </div>`;
    }

    // 1. ACTION CENTER BUTTONS
    const allActions = [...(config.actions || [])];
    const ispm = typeof getCurrentMode === 'function' && getCurrentMode() === 'pm';

    // Reopen button for PM mode (historical view only)
    let reopenHtml = '';
    if (isHistorical && ispm && config._targetId && config._type) {
        reopenHtml = `<button onclick="if(confirm('Reopen this lifecycle item? This will revert its status.')) { /* reopen logic */ closeCmsModal(); }" class="cms-btn !bg-white hover:!bg-red-50 !text-red-600 !text-[10px] !font-black !uppercase !tracking-widest !py-3 !rounded-full border-2 border-red-200 w-full">↩ Reopen</button>`;
    }

    const actionsHtml = allActions.map(a => {
        const fnStr = a.fn.toString();
        return `<button onclick="(${fnStr})(); closeCmsModal();" class="cms-btn !bg-white hover:!bg-slate-50 !text-slate-950 !text-[11px] !font-black !uppercase !tracking-widest !py-3 !rounded-full transition-all shadow-sm hover:shadow-md border-2 border-slate-200 w-full active:scale-95">
            ${a.label}
        </button>`;
    }).join('');

    const doneButtonHtml = `<button onclick="closeCmsModal()" class="cms-btn cms-btn-primary w-full py-3 !rounded-full shadow-lg transition-all active:scale-95 !bg-slate-900 !text-white font-black uppercase tracking-widest text-[11px] border-2 border-white/10 hover:!bg-black">
        Done
    </button>`;

    // 2. COLOR ACCENT TOP BAR
    const accentBarHtml = `<div class="h-1.5 w-full rounded-full mb-6" style="background: linear-gradient(90deg, ${theme.color}, ${theme.color}88)"></div>`;

    // 2b. Historical date badge (prominent)
    const historicalBadgeHtml = isHistorical && config.timestamp ? `
        <div class="flex items-center justify-center gap-2 mb-4">
            <span class="px-4 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <span>🛡️</span> Historical Trace · Recorded ${new Date(config.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
        </div>` : '';

    // 3. MISSION BANNER
    let missionHtml = '';
    if (config.mission) {
        missionHtml = `
            <div class="mb-4 py-4 px-6 rounded-2xl border border-slate-700 shadow-xl w-full bg-slate-950 flex flex-col text-left relative overflow-hidden shrink-0">
                <div class="absolute right-3 top-3 opacity-[0.06] text-6xl pointer-events-none select-none">${theme.icon}</div>
                <div class="flex items-center gap-2 mb-2 relative z-10">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">${config.mission.track} · ${config.mission.timeline}</span>
                </div>
                <h4 class="text-[13px] font-black text-white leading-tight tracking-tight relative z-10 pr-16">${config.mission.objective}</h4>
            </div>`;
    }

    // 4. PERFORMANCE RIBBON
    const detailsHtml = config.details && config.details.length > 0 ? `
        <div class="flex items-stretch bg-white border border-slate-200 rounded-2xl w-full shadow-sm mb-4 shrink-0 overflow-hidden">
            ${config.details.map((d, i) => `
                <div class="flex-1 flex flex-col items-center justify-center py-4 ${i < config.details.length - 1 ? 'border-r border-slate-100' : ''} px-3">
                    <span class="text-[9px] shrink-0 mb-1">${d.icon}</span>
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] text-center leading-tight mb-1.5">${d.label}</span>
                    <span class="text-[15px] font-black text-slate-950 leading-none tracking-tighter text-center">${d.count}</span>
                </div>`).join('')}
        </div>` : '';

    // 5. EXTRAS (compact metadata grid)
    let extrasHtml = '';
    if (config.extras && config.extras.length > 0) {
        extrasHtml = `
            <div class="grid grid-cols-2 gap-2 mb-4 w-full">
                ${config.extras.map(e => `
                    <div class="flex items-center justify-between p-2 px-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${e.label}</span>
                        <span class="text-[10px] font-black text-slate-900 truncate max-w-[60%] text-right">${e.value}</span>
                    </div>`).join('')}
            </div>`;
    }

    // 6. STRATEGIC WINS
    let winsHtml = '';
    if (config.wins) {
        winsHtml = `
            <div class="mb-4 px-4 py-2.5 border-l-4 rounded-r-xl w-full" style="border-color: ${theme.color}; background: ${theme.color}10">
                <div class="text-[8px] font-black uppercase tracking-[0.3em] mb-1" style="color: ${theme.color}">Success Criteria</div>
                <p class="text-[11px] font-bold text-slate-900 italic leading-relaxed">"${config.wins}"</p>
            </div>`;
    }

    // 7. IMPACT LOG with enhanced item rows
    let impactHtml = '';
    if (config.items && config.items.length > 0) {
        const statusColors = {
            done: 'bg-emerald-500', completed: 'bg-emerald-500', achieved: 'bg-emerald-500', shipped: 'bg-emerald-500',
            blocked: 'bg-red-500', 'at-risk': 'bg-red-400',
            qa: 'bg-blue-500', review: 'bg-purple-500',
            now: 'bg-indigo-500', next: 'bg-sky-400', later: 'bg-slate-400', 'on-track': 'bg-emerald-400',
            rolled: 'bg-amber-400'
        };
        const statusLabels = {
            done: 'Done', completed: 'Done', achieved: 'Achieved', shipped: 'Shipped',
            blocked: 'Blocked', 'at-risk': 'At Risk',
            qa: 'QA', review: 'Review', now: 'Active', next: 'Next', later: 'Later', 'on-track': 'On Track',
            rolled: 'Rolled', pending: 'Pending', delivered: 'Delivered'
        };
        impactHtml = `
            <div class="text-left w-full shrink-0">
                <div class="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 px-1 flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Lifecycle Trace (${config.items.length} items)
                </div>
                <div class="audit-impact-log bg-slate-50 rounded-2xl border border-slate-200 overflow-y-auto max-h-[200px] p-2 space-y-1 custom-scrollbar shadow-inner">
                    ${config.items.map(item => {
                        const statusKey = (item.status || '').toLowerCase();
                        const isDone = ['done', 'completed', 'achieved', 'shipped'].includes(statusKey);
                        const dotColor = statusColors[statusKey] || 'bg-slate-400';
                        const statusLabel = statusLabels[statusKey] || (item.status || 'N/A');
                        const linkFn = item.type === 'epic' ? `switchView('epics', '${item.id}')` : (item.type === 'task' && item.id ? `openItemEdit('${item.id}')` : '');
                        const idTag = item.id ? `<span class="text-[8px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">#${String(item.id).substring(0, 12)}</span>` : '';

                        return `
                            <div class="flex items-center gap-2 p-2 pl-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all group ${linkFn ? 'cursor-pointer' : ''} active:scale-[0.99]"
                                 ${linkFn ? `onclick="${linkFn}"` : ''}>
                                <div class="w-2 h-2 rounded-full ${dotColor} shrink-0 opacity-75 group-hover:opacity-100"></div>
                                <div class="flex-1 min-w-0 flex flex-col">
                                    <span class="text-[10px] font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">${item.name}</span>
                                    ${item.lead ? `<span class="text-[8px] text-slate-400">${item.lead}${item.points ? ` · ${item.points}SP` : ''}</span>` : ''}
                                </div>
                                <div class="flex items-center gap-1.5 shrink-0">
                                    ${idTag}
                                    <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}">${statusLabel}</span>
                                    ${item.destination ? `<span class="text-[8px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">${item.destination}</span>` : ''}
                                </div>
                            </div>`;
                    }).join('')}
                </div>
            </div>`;
    }

    // 8. ASSEMBLE CONTENT
    document.getElementById('modal-form').innerHTML = `
        <div class="py-4 px-8 flex flex-col items-center w-full max-w-[1100px] mx-auto">
            ${accentBarHtml}
            ${historicalBadgeHtml}
            <div class="space-y-1.5 mb-6 w-full text-center">
                <h3 class="text-xl font-black text-slate-950 tracking-tighter leading-none">${config.title}</h3>
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">${config.description}</p>
            </div>
            <div class="w-full flex flex-col items-center gap-0">
                ${missionHtml}
                ${detailsHtml}
                ${extrasHtml}
                ${winsHtml}
                ${impactHtml}
            </div>
        </div>`;

    // 9. ACTION CENTER FOOTER
    document.getElementById('modal-footer').innerHTML = `
        <div class="px-8 py-6 border-t border-slate-200 bg-slate-50/50 flex flex-col items-center w-full gap-3">
            <div class="w-full max-w-[1100px] flex flex-wrap gap-3">
                ${actionsHtml}
                ${reopenHtml}
                ${doneButtonHtml}
            </div>
        </div>`;

    // 10. FINALIZE
    const modal = document.getElementById('cms-modal');
    modal.classList.add('active');
    modal.scrollTop = 0;
    document.body.style.overflow = 'hidden';
}

/**
 * Lifecycle Ceremony: Ship Release
 * Marks a release as completed and rolls over missed items
 */
function shipRelease(releaseId) {
    const releaseIdx = UPDATE_DATA.metadata.releases.findIndex(r => r.id === releaseId);
    if (releaseIdx === -1) return;

    const release = UPDATE_DATA.metadata.releases[releaseIdx];
    const nextRelease = UPDATE_DATA.metadata.releases.find((r, i) => i > releaseIdx && r.status !== 'completed');

    if (!confirm(`🚀 Ship Release: "${release.name}"?\n\nIncomplete items will be rolled over.`)) return;

    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('releasedIn', releaseId) : [];
    const pendingItems = items.filter(i => i.status !== 'done');

    // Move pending to next release
    pendingItems.forEach(item => {
        const track = UPDATE_DATA.tracks[item.trackIndex];
        const subtrack = track.subtracks[item.subtrackIndex];
        const realItem = subtrack.items[item.itemIndex];
        
        if (nextRelease) {
            realItem.releasedIn = nextRelease.id;
            realItem.status = 'next'; // Reset to Planned for next release
        } else {
            realItem.releasedIn = ''; // Back to unassigned if no next release
            realItem.status = 'later';
        }
        realItem.updatedAt = new Date().toISOString();
    });

    UPDATE_DATA.metadata.releases[releaseIdx].status = 'completed';
    UPDATE_DATA.metadata.releases[releaseIdx].updatedAt = new Date().toISOString();

    // Auto-recalc OKR progress: collect OKR IDs via release.linkedOKR + epics in scope
    if (typeof recalcOKRProgress === 'function') {
        const okrIds = new Set()
        if (release.linkedOKR) okrIds.add(release.linkedOKR)
        // Also pick up OKRs linked through the epics this release covers
        const epicIds = new Set(items.filter(i => i.epicId).map(i => i.epicId))
        ;(UPDATE_DATA.metadata?.epics || []).forEach(e => {
            if (epicIds.has(e.id) && e.linkedOKR) okrIds.add(e.linkedOKR)
        })
        okrIds.forEach(okrId => {
            const newProgress = recalcOKRProgress(okrId)
            if (newProgress !== null) {
                logChange('okr-recalc', `OKR ${okrId} → ${newProgress}% (via release ship)`)
            }
        })
    }

    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();

    // ENSURE MODAL STAYS OPEN
    window._skipModalCloseOnce = true;

    const nextReleaseName = nextRelease ? nextRelease.name : 'Backlog';
    const doneItems = items.filter(i => i.status === 'done');
    const qaItems = items.filter(i => i.status === 'qa');
    const reviewItems = items.filter(i => i.status === 'review');
    const totalPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);
    const donePoints = doneItems.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);
    const releaseOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === release.linkedOKR);
    const epicsInScope = [...new Set(items.filter(i => i.epicId).map(i => i.epicId))]
        .map(eid => (UPDATE_DATA.metadata.epics || []).find(e => e.id === eid)).filter(Boolean);
    const auditConfig = {
        timestamp: new Date().toISOString(),
        title: `Release Shipped: ${release.name}`,
        description: `${doneItems.length}/${items.length} items shipped · ${donePoints}/${totalPoints} pts · ${pendingItems.length > 0 ? `${pendingItems.length} rolled to ${nextReleaseName}` : 'Clean ship!'}`,
        details: [
            { label: 'Items Shipped', count: `${doneItems.length} / ${items.length}`, icon: '🚀' },
            { label: 'Points Delivered', count: `${donePoints} / ${totalPoints} SP`, icon: '💎' },
            { label: 'Rolled Over', count: pendingItems.length, icon: '📦' },
            { label: 'Epics Covered', count: epicsInScope.length, icon: '🗂️' }
        ],
        extras: [
            { label: 'Target Date', value: release.targetDate || 'TBD' },
            { label: 'QA Items at Ship', value: qaItems.length },
            { label: 'In Review at Ship', value: reviewItems.length },
            { label: 'Linked OKR', value: releaseOKR ? releaseOKR.quarter : 'None' },
            { label: 'Next Placement', value: nextReleaseName }
        ],
        items: items.map(i => ({
            id: i.id,
            name: i.text,
            type: 'task',
            status: i.status,
            lead: (i.contributors || [])[0],
            points: i.storyPoints,
            destination: i.status === 'done' ? 'Shipped' : nextReleaseName
        })),
        actions: [
            { label: 'Manage Releases', fn: () => switchView('releases') },
            { label: 'View OKRs', fn: () => switchView('okr') }
        ]
    };

    saveCeremonyAudit('release', releaseId, auditConfig);
    renderCeremonySuccess('release', auditConfig);

    if (typeof renderReleasesView === 'function') renderReleasesView();
}

/**
 * Lifecycle Ceremony: Advance Roadmap Horizons (Full Modal)
 * Bulk nudge of strategic initiatives across planning horizons
 */
function advanceRoadmapHorizons() {
    // Collect all shiftable items
    const shiftableItems = [];
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.planningHorizon === '3M' || item.planningHorizon === '6M') {
                    shiftableItems.push({
                        id: item.id,
                        name: item.text,
                        from: item.planningHorizon,
                        to: item.planningHorizon === '3M' ? '1M' : '3M',
                        track: track.name,
                        status: item.status
                    });
                }
            });
        });
    });

    const shiftableEpics = [];
    if (UPDATE_DATA.metadata.epics) {
        UPDATE_DATA.metadata.epics.forEach(epic => {
            if (epic.planningHorizon === '3M' || epic.planningHorizon === '6M') {
                shiftableEpics.push({
                    id: epic.id,
                    name: epic.name,
                    from: epic.planningHorizon,
                    to: epic.planningHorizon === '3M' ? '1M' : '3M',
                    isEpic: true
                });
            }
        });
    }

    const all = [...shiftableItems, ...shiftableEpics];

    if (all.length === 0) {
        if (typeof showToast === 'function') showToast('No items to advance — all horizons are already at 1M or further.');
        return;
    }

    // Build modal
    editContext = { type: '_roadmapAdvance' };
    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">⏩</span>
            <span class="font-black tracking-tight">Quarter Planning: Advance Roadmap</span>
        </div>`;

    const rowsHtml = all.map(item => `
        <div class="flex items-center gap-3 p-2.5 px-4 bg-white border border-slate-100 rounded-xl">
            <input type="checkbox" id="advance-${item.id}" data-id="${item.id}" data-is-epic="${item.isEpic || false}" checked
                class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0">
            <div class="flex-1 min-w-0">
                <div class="text-[11px] font-bold text-slate-800 truncate">${item.name}</div>
                ${item.track ? `<div class="text-[9px] text-slate-400">${item.track} · ${item.status || ''}</div>` : `<div class="text-[9px] text-violet-500 font-black uppercase tracking-widest">Epic</div>`}
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">${item.from}</span>
                <span class="text-slate-400 text-[10px]">→</span>
                <span class="text-[9px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">${item.to}</span>
            </div>
        </div>`).join('');

    document.getElementById('modal-form').innerHTML = `
        <div class="lifecycle-banner strategic">
            <div class="stage-tag">Opening Ceremony: Quarter Planning</div>
            <div class="stage-desc">Advance strategic items to the next planning horizon. Deselect any items you want to keep in their current horizon.</div>
        </div>
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${all.length} items to shift</div>
                <div class="flex gap-2">
                    <button type="button" onclick="document.querySelectorAll('[id^=advance-]').forEach(c=>c.checked=true)" class="text-[9px] font-black text-indigo-600 underline">Select All</button>
                    <button type="button" onclick="document.querySelectorAll('[id^=advance-]').forEach(c=>c.checked=false)" class="text-[9px] font-black text-slate-500 underline">None</button>
                </div>
            </div>
            <div class="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-50 rounded-2xl border border-slate-200 p-2">
                ${rowsHtml}
            </div>
            <div class="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-700 font-bold">
                ⚠️ Items at <strong>1M</strong> horizon are not shifted. Review them manually for backlog or archive.
            </div>
        </div>`;
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="confirmAdvanceRoadmapHorizons()" class="cms-btn cms-btn-primary">⏩ Advance Selected</button>`;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function confirmAdvanceRoadmapHorizons() {
    const checkboxes = document.querySelectorAll('[id^="advance-"]:checked');
    const selectedIds = new Set(Array.from(checkboxes).map(c => c.getAttribute('data-id')));
    const epicIds = new Set(Array.from(checkboxes).filter(c => c.getAttribute('data-is-epic') === 'true').map(c => c.getAttribute('data-id')));

    if (selectedIds.size === 0) {
        if (typeof showToast === 'function') showToast('No items selected — nothing to advance.');
        closeCmsModal();
        return;
    }

    let itemShiftCount = 0;
    let epicShiftCount = 0;
    const shiftLog = [];

    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (!selectedIds.has(item.id)) return;
                if (epicIds.has(item.id)) return; // skip epic IDs in items
                const from = item.planningHorizon;
                if (from === '3M') { item.planningHorizon = '1M'; itemShiftCount++; shiftLog.push({ name: item.text, from, to: '1M' }); }
                else if (from === '6M') { item.planningHorizon = '3M'; itemShiftCount++; shiftLog.push({ name: item.text, from, to: '3M' }); }
                item.updatedAt = new Date().toISOString();
            });
        });
    });

    if (UPDATE_DATA.metadata.epics) {
        UPDATE_DATA.metadata.epics.forEach(epic => {
            if (!epicIds.has(epic.id)) return;
            const from = epic.planningHorizon;
            if (from === '3M') { epic.planningHorizon = '1M'; epicShiftCount++; shiftLog.push({ name: epic.name, from, to: '1M', isEpic: true }); }
            else if (from === '6M') { epic.planningHorizon = '3M'; epicShiftCount++; shiftLog.push({ name: epic.name, from, to: '3M', isEpic: true }); }
            epic.updatedAt = new Date().toISOString();
        });
    }

    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    window._skipModalCloseOnce = true;

    const auditConfig = {
        timestamp: new Date().toISOString(),
        title: `Roadmap Horizons Advanced`,
        description: `${itemShiftCount} items + ${epicShiftCount} epics shifted to next horizon.`,
        details: [
            { label: 'Items Shifted', count: itemShiftCount, icon: '📋' },
            { label: 'Epics Shifted', count: epicShiftCount, icon: '🚀' },
            { label: 'Total', count: itemShiftCount + epicShiftCount, icon: '⏩' }
        ],
        items: shiftLog.map(s => ({
            name: s.name,
            status: s.isEpic ? 'epic' : 'shifted',
            destination: `${s.from} → ${s.to}`,
            lead: null, points: null
        })),
        actions: [
            { label: 'View Roadmap', fn: () => switchView('roadmap') }
        ]
    };

    saveCeremonyAudit('roadmap', `roadmap-advance-${Date.now()}`, auditConfig);
    renderCeremonySuccess('roadmap', auditConfig);

    if (typeof renderRoadmapView === 'function') renderRoadmapView();
}

// ═══════════════════════════════════════════════════════
// OPENING CEREMONIES
// ═══════════════════════════════════════════════════════

/**
 * Opening Ceremony: Sprint Kickoff
 * Formally activates a planned sprint and commits the team
 */
function kickoffSprint(sprintId) {
    const sprint = UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('sprintId', sprintId) : [];
    const totalPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0);
    const contributorSet = new Set(items.flatMap(i => i.contributors || []))
    const sprintOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === sprint.linkedOKR)
    const capacity = UPDATE_DATA.metadata?.capacity?.teamMembers?.length || 0

    editContext = { type: '_sprintKickoff', sprintId }
    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🚀</span>
            <span class="font-black tracking-tight">Sprint Kickoff: ${sprint.name}</span>
        </div>`
    document.getElementById('modal-form').innerHTML = `
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Opening Ceremony: Sprint Kickoff</div>
            <div class="stage-desc">Formally activate this sprint. Align the team on the goal and commit to delivery.</div>
        </div>
        <div class="space-y-4">
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm italic text-slate-700">
                <span class="font-black not-italic text-slate-900 block mb-1">Sprint Goal</span>
                ${sprint.goal || '<span class="text-slate-400">No goal defined — consider editing the sprint to add one.</span>'}
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Committed</div>
                    <div class="text-2xl font-black text-slate-900">${totalPoints}</div>
                    <div class="text-[9px] text-slate-500">story points</div>
                </div>
                <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Items</div>
                    <div class="text-2xl font-black text-slate-900">${items.length}</div>
                    <div class="text-[9px] text-slate-500">tasks</div>
                </div>
                <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Contributors</div>
                    <div class="text-2xl font-black text-slate-900">${contributorSet.size || capacity}</div>
                    <div class="text-[9px] text-slate-500">team members</div>
                </div>
            </div>
            ${sprintOKR ? `
            <div class="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3">
                <span class="text-lg">🎯</span>
                <div>
                    <div class="text-[9px] font-black text-indigo-500 uppercase">Aligned OKR</div>
                    <div class="text-xs font-bold text-indigo-900">${sprintOKR.objective}</div>
                    <div class="text-[9px] text-indigo-600">${sprintOKR.overallProgress || 0}% complete · ${sprintOKR.quarter}</div>
                </div>
            </div>` : ''}
            <div class="grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div class="p-3 bg-white rounded-xl border border-slate-100">📅 Start: <span class="font-bold text-slate-900">${sprint.startDate || 'TBD'}</span></div>
                <div class="p-3 bg-white rounded-xl border border-slate-100">🏁 End: <span class="font-bold text-slate-900">${sprint.endDate || 'TBD'}</span></div>
            </div>
        </div>`
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="confirmKickoffSprint('${sprintId}')" class="cms-btn cms-btn-primary">🚀 Activate Sprint</button>`
    document.getElementById('cms-modal').classList.add('active')
    document.body.style.overflow = 'hidden'
}

function confirmKickoffSprint(sprintId) {
    const sprint = UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId)
    if (!sprint) return
    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('sprintId', sprintId) : []
    const totalPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0)
    const contributorSet = new Set(items.flatMap(i => i.contributors || []))
    const sprintOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === sprint.linkedOKR)

    sprint.status = 'active'
    sprint.kickedOffAt = new Date().toISOString()
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage()
    window._skipModalCloseOnce = true

    const auditConfig = {
        timestamp: new Date().toISOString(),
        title: `Sprint Kickoff: ${sprint.name}`,
        description: `${totalPoints} story points committed across ${items.length} tasks. Sprint is now active.`,
        mission: { objective: sprint.goal || 'No goal defined', track: 'Sprint Team', timeline: `${sprint.startDate || 'TBD'} → ${sprint.endDate || 'TBD'}` },
        details: [
            { label: 'Committed Points', count: totalPoints, icon: '💎' },
            { label: 'Tasks in Scope', count: items.length, icon: '📋' },
            { label: 'Contributors', count: contributorSet.size, icon: '👥' },
            { label: 'OKR Aligned', count: sprintOKR ? 'Yes' : 'No', icon: '🎯' }
        ],
        items: items.map(i => ({ id: i.id, name: i.text, type: 'task', status: i.status, lead: (i.contributors || [])[0], points: i.storyPoints, destination: 'Committed' })),
        actions: [
            { label: 'Open Kanban', fn: () => switchView('kanban') },
            { label: 'View Sprint', fn: () => switchView('sprint') }
        ]
    }
    saveCeremonyAudit('sprint-kickoff', sprintId, auditConfig)
    renderCeremonySuccess('sprint-kickoff', auditConfig)
    if (typeof renderSprintView === 'function') renderSprintView()
}

/**
 * Opening Ceremony: OKR Quarter Launch
 * Formally activates a new OKR quarter and aligns the team
 */
function launchOKR(idx) {
    const okr = UPDATE_DATA.metadata.okrs[idx]
    if (!okr) return
    const linkedEpics = (UPDATE_DATA.metadata.epics || []).filter(e => e.linkedOKR === okr.id)

    editContext = { type: '_okrLaunch', idx }
    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🎯</span>
            <span class="font-black tracking-tight">Launch OKR Quarter</span>
        </div>`
    document.getElementById('modal-form').innerHTML = `
        <div class="lifecycle-banner strategic">
            <div class="stage-tag">Opening Ceremony: Quarter Launch</div>
            <div class="stage-desc">Formally launch this strategic quarter. Align on objectives and commit to key results.</div>
        </div>
        <div class="space-y-4">
            <div class="p-4 bg-slate-900 rounded-2xl text-white">
                <div class="text-[9px] font-black text-slate-400 uppercase mb-2">${okr.quarter} · ${okr.owner}</div>
                <h3 class="text-sm font-black leading-snug">${okr.objective}</h3>
            </div>
            <div>
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Key Results (${(okr.keyResults || []).length})</div>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${(okr.keyResults || []).map(kr => `
                        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                            <div class="flex-1 text-xs font-bold text-slate-700">${kr.description}</div>
                            <span class="text-[10px] font-black text-slate-500 shrink-0">Target: ${kr.target} ${kr.unit}</span>
                        </div>`).join('')}
                </div>
            </div>
            ${linkedEpics.length > 0 ? `
            <div class="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <div class="text-[9px] font-black text-indigo-500 uppercase mb-2">Linked Initiatives (${linkedEpics.length})</div>
                <div class="flex flex-wrap gap-2">${linkedEpics.map(e => `<span class="px-2 py-0.5 bg-white border border-indigo-200 rounded-full text-[10px] font-bold text-indigo-700">${e.name}</span>`).join('')}</div>
            </div>` : ''}
        </div>`
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="confirmLaunchOKR(${idx})" class="cms-btn cms-btn-primary">🎯 Launch Quarter</button>`
    document.getElementById('cms-modal').classList.add('active')
    document.body.style.overflow = 'hidden'
}

function confirmLaunchOKR(idx) {
    const okr = UPDATE_DATA.metadata.okrs[idx]
    if (!okr) return
    okr.launchedAt = new Date().toISOString()
    okr.status = 'active'
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage()
    window._skipModalCloseOnce = true

    const linkedEpics = (UPDATE_DATA.metadata.epics || []).filter(e => e.linkedOKR === okr.id)
    const auditConfig = {
        timestamp: new Date().toISOString(),
        title: `Quarter Launched: ${okr.quarter}`,
        description: `Strategic quarter formally activated. ${(okr.keyResults || []).length} key results in motion.`,
        mission: { objective: okr.objective, track: okr.owner, timeline: okr.quarter },
        details: [
            { label: 'Key Results', count: (okr.keyResults || []).length, icon: '🎯' },
            { label: 'Linked Epics', count: linkedEpics.length, icon: '🚀' },
            { label: 'Owner', count: okr.owner || 'Unassigned', icon: '👤' },
            { label: 'OKR Progress', count: `${okr.overallProgress || 0}%`, icon: '📈' }
        ],
        items: (okr.keyResults || []).map(kr => ({ name: `${kr.description}`, status: 'on-track', destination: `Target: ${kr.target} ${kr.unit}` })),
        actions: [
            { label: 'View OKRs', fn: () => switchView('okr') },
            { label: 'View Epics', fn: () => switchView('epics') }
        ]
    }
    saveCeremonyAudit('okr-launch', okr.id, auditConfig)
    renderCeremonySuccess('okr-launch', auditConfig)
    if (typeof renderOkrView === 'function') renderOkrView()
}

/**
 * Opening Ceremony: Epic Kickoff
 * Formally starts an epic and moves it into active delivery
 */
function kickoffEpic(idx) {
    const epic = UPDATE_DATA.metadata.epics[idx]
    if (!epic) return
    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('epicId', epic.id) : []
    const totalPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0)
    const contributorSet = new Set(items.flatMap(i => i.contributors || []))
    const epicOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === epic.linkedOKR)
    const horizon = (UPDATE_DATA.metadata.roadmap || []).find(h => h.id === epic.planningHorizon)

    editContext = { type: '_epicKickoff', idx }
    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🚀</span>
            <span class="font-black tracking-tight">Epic Kickoff</span>
        </div>`
    document.getElementById('modal-form').innerHTML = `
        <div class="lifecycle-banner defining">
            <div class="stage-tag">Opening Ceremony: Epic Kickoff</div>
            <div class="stage-desc">Move this epic from definition into active delivery. Confirm scope and team alignment.</div>
        </div>
        <div class="space-y-4">
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div class="text-xs font-black text-slate-900 mb-1">${epic.name}</div>
                <div class="text-[11px] text-slate-600">${epic.description || 'No description'}</div>
            </div>
            ${epic.successCriteria ? `
            <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div class="text-[9px] font-black text-emerald-600 uppercase mb-1">Success Criteria</div>
                <div class="text-xs font-bold text-emerald-900">${epic.successCriteria}</div>
            </div>` : ''}
            <div class="grid grid-cols-3 gap-3">
                <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Story Pts</div>
                    <div class="text-xl font-black">${totalPoints}</div>
                </div>
                <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Tasks</div>
                    <div class="text-xl font-black">${items.length}</div>
                </div>
                <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Team</div>
                    <div class="text-xl font-black">${contributorSet.size}</div>
                </div>
            </div>
            ${epicOKR ? `
            <div class="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-3 items-center">
                <span>🎯</span>
                <div>
                    <div class="text-[9px] font-black text-indigo-500 uppercase">Parent OKR</div>
                    <div class="text-xs font-bold text-indigo-900">${epicOKR.objective}</div>
                </div>
            </div>` : ''}
        </div>`
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="confirmKickoffEpic(${idx})" class="cms-btn cms-btn-primary">🚀 Start Epic</button>`
    document.getElementById('cms-modal').classList.add('active')
    document.body.style.overflow = 'hidden'
}

function confirmKickoffEpic(idx) {
    const epic = UPDATE_DATA.metadata.epics[idx]
    if (!epic) return
    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('epicId', epic.id) : []
    const totalPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0)
    const contributorSet = new Set(items.flatMap(i => i.contributors || []))
    const epicOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === epic.linkedOKR)

    epic.stage = 'delivery'
    epic.kickedOffAt = new Date().toISOString()
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage()
    window._skipModalCloseOnce = true

    const auditConfig = {
        timestamp: new Date().toISOString(),
        title: `Epic Kickoff: ${epic.name}`,
        description: `Epic moved to active delivery. ${totalPoints} story points committed across ${items.length} tasks.`,
        mission: { objective: epic.successCriteria || epic.description || epic.name, track: epic.name, timeline: epic.planningHorizon || 'Unset' },
        wins: epic.successCriteria,
        details: [
            { label: 'Story Points', count: totalPoints, icon: '💎' },
            { label: 'Tasks', count: items.length, icon: '📋' },
            { label: 'Contributors', count: contributorSet.size, icon: '👥' },
            { label: 'Parent OKR', count: epicOKR ? epicOKR.quarter : 'None', icon: '🎯' }
        ],
        items: items.map(i => ({ id: i.id, name: i.text, type: 'task', status: i.status, lead: (i.contributors || [])[0], points: i.storyPoints, destination: 'In Scope' })),
        actions: [
            { label: 'View Epics', fn: () => switchView('epics') },
            { label: 'Go to Backlog', fn: () => switchView('backlog') }
        ]
    }
    saveCeremonyAudit('epic-kickoff', epic.id, auditConfig)
    renderCeremonySuccess('epic-kickoff', auditConfig)
    if (typeof renderEpicsView === 'function') renderEpicsView()
}

/**
 * Opening Ceremony: Release Scope Lock
 * Formalizes the items in a release and moves it to in-progress
 */
function lockReleaseScope(releaseId) {
    const releaseIdx = UPDATE_DATA.metadata.releases.findIndex(r => r.id === releaseId)
    if (releaseIdx === -1) return
    const release = UPDATE_DATA.metadata.releases[releaseIdx]
    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('releasedIn', releaseId) : []
    const totalPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0)
    const releaseOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === release.linkedOKR)
    const epicsInScope = [...new Set(items.filter(i => i.epicId).map(i => i.epicId))]
        .map(eid => (UPDATE_DATA.metadata.epics || []).find(e => e.id === eid))
        .filter(Boolean)

    editContext = { type: '_releaseLock', releaseId }
    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">📋</span>
            <span class="font-black tracking-tight">Lock Release Scope: ${release.name}</span>
        </div>`
    document.getElementById('modal-form').innerHTML = `
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Opening Ceremony: Scope Lock</div>
            <div class="stage-desc">Confirm and lock the scope of this release. No new items after this point without a change request.</div>
        </div>
        <div class="space-y-4">
            <div class="grid grid-cols-3 gap-3">
                <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Items</div>
                    <div class="text-2xl font-black">${items.length}</div>
                </div>
                <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Story Pts</div>
                    <div class="text-2xl font-black">${totalPoints}</div>
                </div>
                <div class="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <div class="text-[10px] font-black text-slate-400 uppercase mb-1">Target Date</div>
                    <div class="text-sm font-black">${release.targetDate || 'TBD'}</div>
                </div>
            </div>
            ${epicsInScope.length > 0 ? `
            <div class="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div class="text-[9px] font-black text-amber-600 uppercase mb-2">Epics in Scope (${epicsInScope.length})</div>
                <div class="flex flex-wrap gap-2">${epicsInScope.map(e => `<span class="px-2 py-0.5 bg-white border border-amber-200 rounded-full text-[10px] font-bold text-amber-700">${e.name}</span>`).join('')}</div>
            </div>` : ''}
            ${releaseOKR ? `
            <div class="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-3 items-center">
                <span>🎯</span>
                <div>
                    <div class="text-[9px] font-black text-indigo-500 uppercase">OKR Alignment</div>
                    <div class="text-xs font-bold text-indigo-900">${releaseOKR.objective}</div>
                </div>
            </div>` : ''}
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm italic text-slate-700">
                ${release.goal || '<span class="text-slate-400">No release goal defined.</span>'}
            </div>
        </div>`
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary">Cancel</button>
        <button onclick="confirmLockReleaseScope('${releaseId}')" class="cms-btn cms-btn-primary">📋 Lock Scope</button>`
    document.getElementById('cms-modal').classList.add('active')
    document.body.style.overflow = 'hidden'
}

function confirmLockReleaseScope(releaseId) {
    const releaseIdx = UPDATE_DATA.metadata.releases.findIndex(r => r.id === releaseId)
    if (releaseIdx === -1) return
    const release = UPDATE_DATA.metadata.releases[releaseIdx]
    const items = typeof findItemsByMetadataId === 'function' ? findItemsByMetadataId('releasedIn', releaseId) : []
    const totalPoints = items.reduce((sum, i) => sum + (parseInt(i.storyPoints) || 0), 0)
    const releaseOKR = (UPDATE_DATA.metadata.okrs || []).find(o => o.id === release.linkedOKR)
    const epicsInScope = [...new Set(items.filter(i => i.epicId).map(i => i.epicId))]
        .map(eid => (UPDATE_DATA.metadata.epics || []).find(e => e.id === eid))
        .filter(Boolean)

    UPDATE_DATA.metadata.releases[releaseIdx].status = 'in_progress'
    UPDATE_DATA.metadata.releases[releaseIdx].lockedAt = new Date().toISOString()
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage()
    window._skipModalCloseOnce = true

    const auditConfig = {
        timestamp: new Date().toISOString(),
        title: `Scope Locked: ${release.name}`,
        description: `${items.length} items (${totalPoints} pts) locked for ${release.targetDate || 'TBD'}. Release is now in progress.`,
        details: [
            { label: 'Items Locked', count: items.length, icon: '🔒' },
            { label: 'Story Points', count: totalPoints, icon: '💎' },
            { label: 'Epics Covered', count: epicsInScope.length, icon: '🚀' },
            { label: 'Target Date', count: release.targetDate || 'TBD', icon: '📅' }
        ],
        items: items.map(i => ({ id: i.id, name: i.text, type: 'task', status: i.status, lead: (i.contributors || [])[0], points: i.storyPoints, destination: 'Locked in Release' })),
        actions: [
            { label: 'View Releases', fn: () => switchView('releases') },
            { label: 'Open Kanban', fn: () => switchView('kanban') }
        ]
    }
    saveCeremonyAudit('release-lock', releaseId, auditConfig)
    renderCeremonySuccess('release-lock', auditConfig)
    if (typeof renderReleasesView === 'function') renderReleasesView()
}

function openReleaseEdit(releaseId) {
    const release = releaseId ? UPDATE_DATA.metadata.releases.find(r => r.id === releaseId) : { name: '', targetDate: '', goal: '', linkedOKR: '' };
    editContext = { type: 'release', releaseId };

    const okrs = UPDATE_DATA.metadata.okrs || [];

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">📦</span>
            <span class="font-black tracking-tight">${releaseId ? 'Edit Engineering Release' : 'Add New Release'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Release Stage Banner -->
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Lifecycle Stage: Release Milestone</div>
            <div class="stage-desc">Manage production shipping windows. Unified release markers provide clarity on target dates.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Strategic Release Name</label>
                <input type="text" id="edit-release-name" value="${release.name}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. v2.1 (The Spark)">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Target Launch Date</label>
                    <input type="date" id="edit-release-date" value="${release.targetDate || ''}" class="cms-input shadow-sm focus:shadow-md">
                </div>
                <div>
                    <label class="cms-label">Strategic OKR Alignment</label>
                    <select id="edit-release-okr" class="cms-input shadow-sm focus:shadow-md">
                        <option value="">None (Unlinked)</option>
                        ${okrs.map(o => `<option value="${o.id}" ${release.linkedOKR === o.id ? 'selected' : ''}>${o.quarter}: ${o.objective}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div>
                <label class="cms-label">Market Impact & Release Goal</label>
                <textarea id="edit-release-goal" class="cms-input shadow-sm focus:shadow-md" rows="2" placeholder="Primary mission or customer impact of this release...">${release.goal || ''}</textarea>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${releaseId ? `
            <button onclick="deleteRelease('${releaseId}')" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete Release
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${releaseId ? 'Save Changes' : 'Create Release'}
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openEpicEdit(epicIndex) {
    const epic = epicIndex !== undefined ? UPDATE_DATA.metadata.epics[epicIndex] : { name: '', description: '', health: 'on-track' };
    const epicId = epicIndex !== undefined ? epic.id : undefined;
    editContext = { type: 'epic', epicId };

    const okrs = UPDATE_DATA.metadata.okrs || [];
    const horizons = UPDATE_DATA.metadata.roadmap || [];

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🚀</span>
            <span class="font-black tracking-tight">${epicId ? 'Edit Strategic Epic' : 'Add Strategic Epic'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Defining Stage Banner -->
        <div class="lifecycle-banner defining">
            <div class="stage-tag">Lifecycle Stage: Definition</div>
            <div class="stage-desc">Break down strategic OKRs into actionable initiatives. Define boundaries and business value.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Strategic Epic Name</label>
                <input type="text" id="edit-epic-name" value="${epic.name}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Platform Migration V2">
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Strategic Objective</label>
                    <select id="edit-epic-okr" class="cms-input shadow-sm focus:shadow-md">
                        <option value="">None (BAU / Unlinked)</option>
                        ${okrs.map(o => `<option value="${o.id}" ${epic.linkedOKR === o.id ? 'selected' : ''}>${o.objective}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="cms-label">Planning Horizon</label>
                    <select id="edit-epic-horizon" class="cms-input shadow-sm focus:shadow-md">
                        <option value="">No Specific Horizon</option>
                        ${horizons.map(h => `<option value="${h.id}" ${epic.planningHorizon === h.id ? 'selected' : ''}>${h.label}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Lifecycle Stage (Vision-First)</label>
                    <select id="edit-epic-stage" class="cms-input shadow-sm focus:shadow-md">
                        <option value="vision" ${epic.stage === 'vision' ? 'selected' : ''}>🎯 Vision (Alignment)</option>
                        <option value="definition" ${epic.stage === 'definition' || !epic.stage ? 'selected' : ''}>📂 Definition (Planning)</option>
                        <option value="delivery" ${epic.stage === 'delivery' ? 'selected' : ''}>⚡ Delivery (Execution)</option>
                        <option value="review" ${epic.stage === 'review' ? 'selected' : ''}>📊 Review (Analytics)</option>
                    </select>
                </div>
                <div>
                    <label class="cms-label">Execution Health</label>
                    <select id="edit-epic-health" class="cms-input shadow-sm focus:shadow-md">
                        <option value="on-track" ${epic.health === 'on-track' ? 'selected' : ''}>🟢 On-Track</option>
                        <option value="at-risk" ${epic.health === 'at-risk' ? 'selected' : ''}>🟡 At-Risk</option>
                        <option value="delayed" ${epic.health === 'delayed' ? 'selected' : ''}>🔴 Delayed</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="cms-label">Business Value & Intent</label>
                <textarea id="edit-epic-desc" class="cms-input shadow-sm focus:shadow-md" rows="2" placeholder="What strategic value does this Epic provide?">${epic.description || ''}</textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Strategic Weight (%)</label>
                    <input type="number" id="edit-epic-weight" value="${epic.strategicWeight || 0}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. 25" min="0" max="100">
                    <p class="text-[9px] text-slate-400 mt-1">Contribution to parent OKR</p>
                </div>
                <div>
                    <label class="cms-label">Primary Risk Type</label>
                    <select id="edit-epic-risk" class="cms-input shadow-sm focus:shadow-md">
                        <option value="none" ${epic.riskType === 'none' ? 'selected' : ''}>None / Neutral</option>
                        <option value="technical" ${epic.riskType === 'technical' ? 'selected' : ''}>🛠️ Technical (Complexity)</option>
                        <option value="market" ${epic.riskType === 'market' ? 'selected' : ''}>📈 Market (Adoption)</option>
                        <option value="operational" ${epic.riskType === 'operational' ? 'selected' : ''}>⚙️ Operational (Internal)</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="cms-label text-indigo-600 font-black">Success Criteria (ROI Focus)</label>
                <textarea id="edit-epic-success" class="cms-input shadow-sm focus:shadow-md border-indigo-100" rows="2" placeholder="What specific outcome defines success? (e.g. 95% reduction in latency)">${epic.successCriteria || ''}</textarea>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${epicId ? `
            <button onclick="deleteEpic(${epicIndex})" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete Epic
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${epicId ? 'Save Changes' : 'Create Epic'}
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openRoadmapEdit(id) {
    if (!UPDATE_DATA.metadata.roadmap) {
        UPDATE_DATA.metadata.roadmap = [
            { id: '1M', label: 'Now (Immediate / 1 Month)', color: 'blue' },
            { id: '3M', label: 'Next (Strategic / 3 Months)', color: 'indigo' },
            { id: '6M', label: 'Later (Future / 6 Months)', color: 'slate' }
        ];
    }
    const horizon = id ? UPDATE_DATA.metadata.roadmap.find(r => r.id === id) : { id: '', label: '', color: 'blue' };
    editContext = { type: 'roadmap', roadmapId: id };

    const okrs = UPDATE_DATA.metadata.okrs || [];

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🗺️</span>
            <span class="font-black tracking-tight">${id ? 'Edit Roadmap Category' : 'Add Roadmap Category'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Planning Stage Banner -->
        <div class="lifecycle-banner strategic">
            <div class="stage-tag">Lifecycle Stage: Strategic Roadmap</div>
            <div class="stage-desc">Map initiatives to Now, Next, and Future horizons to provide predictability to stakeholders.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Category Title</label>
                <input type="text" id="edit-roadmap-label" value="${horizon.label}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Q4 Strategic Focus">
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Internal Identifier</label>
                    <input type="text" id="edit-roadmap-id" value="${horizon.id}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. 1M" ${id ? 'readonly' : ''}>
                    <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">${id ? 'Immutable Key' : 'Unique key for linkage'}</p>
                </div>
                <div>
                    <label class="cms-label">Alignment Objective</label>
                    <select id="edit-roadmap-okr" class="cms-input shadow-sm focus:shadow-md">
                        <option value="">No Specific OKR</option>
                        ${okrs.map(o => `<option value="${o.id}" ${horizon.linkedObjective === o.id ? 'selected' : ''}>${o.objective}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div>
                <label class="cms-label">Horizon Aesthetic</label>
                <select id="edit-roadmap-color" class="cms-input shadow-sm focus:shadow-md">
                    <option value="blue" ${horizon.color === 'blue' ? 'selected' : ''}>Blue</option>
                    <option value="indigo" ${horizon.color === 'indigo' ? 'selected' : ''}>Indigo</option>
                    <option value="violet" ${horizon.color === 'violet' ? 'selected' : ''}>Violet</option>
                    <option value="emerald" ${horizon.color === 'emerald' ? 'selected' : ''}>Emerald</option>
                    <option value="amber" ${horizon.color === 'amber' ? 'selected' : ''}>Amber</option>
                    <option value="rose" ${horizon.color === 'rose' ? 'selected' : ''}>Rose</option>
                    <option value="slate" ${horizon.color === 'slate' ? 'selected' : ''}>Slate</option>
                </select>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${id ? `
            <button onclick="deleteRoadmap('${id}')" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete Category
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${id ? 'Save Changes' : 'Create Category'}
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function validateCmsForm() {
    const textEl = document.getElementById('edit-text') ||
        document.getElementById('edit-sprint-name') ||
        document.getElementById('edit-release-name') ||
        document.getElementById('edit-epic-name') ||
        document.getElementById('edit-okr-objective') ||
        document.getElementById('edit-track-name') ||
        document.getElementById('edit-subtrack-name') ||
        document.getElementById('edit-roadmap-label') ||
        document.getElementById('edit-roadmap-id');
    if (textEl && !textEl.value.trim()) {
        textEl.style.borderColor = '#ef4444';
        return false;
    }
    return true;
}

function saveCmsChanges() {
    if (!validateCmsForm()) return;

    if (editContext.type === 'item' || editContext.type === 'item-new') {
        const itemData = {};

        // Harvest only visible fields to maintain context-awareness
        const fieldMap = {
            'text': 'edit-text', 'status': 'edit-status', 'priority': 'edit-priority',
            'note': 'edit-note', 'usecase': 'edit-usecase', 'mediaUrl': 'edit-mediaUrl',
            'startDate': 'edit-startDate', 'due': 'edit-due', 'sprintId': 'edit-sprintId',
            'releasedIn': 'edit-releasedIn', 'planningHorizon': 'edit-planningHorizon',
            'epicId': 'edit-epicId', 'storyPoints': 'edit-storyPoints',
            'effortLevel': 'edit-effortLevel', 'impactLevel': 'edit-impactLevel',
            'publishedDate': 'edit-publishedDate', 'blockerNote': 'edit-blockerNote',
            'persona': 'edit-persona', 'successMetric': 'edit-successMetric'
        };

        Object.entries(fieldMap).forEach(([key, id]) => {
            const el = document.getElementById(id);
            if (el) {
                let val = el.value;
                if (key === 'storyPoints') val = parseInt(val) || 0;
                else val = val.trim();
                itemData[key] = val;
            }
        });

        // Specialized fields (Tags/AC)
        const acEl = document.getElementById('edit-acceptanceCriteria');
        if (acEl) {
            itemData.acceptanceCriteria = acEl.value.split('\n').map(s => s.trim()).filter(s => s !== '');
        }

        // Widgets (always available in context if rendered)
        if (document.getElementById('contrib-tag-input-edit')) itemData.contributors = [..._selectedContributors];
        if (document.getElementById('tags-tag-input-edit')) itemData.tags = [..._selectedTags];
        if (document.getElementById('deps-tag-input-edit')) itemData.dependencies = [..._selectedDeps];

        if (itemData.blockerNote) itemData.blocker = true;
        else if (document.getElementById('edit-blockerNote')) delete itemData.blocker;

        const moveTrackEl = document.getElementById('edit-move-track');
        const moveSubEl = document.getElementById('edit-move-subtrack');
        const targetTi = moveTrackEl ? parseInt(moveTrackEl.value) : editContext.trackIndex;
        const targetSi = moveSubEl ? parseInt(moveSubEl.value) : editContext.subtrackIndex;

        if (editContext.type === 'item') {
            // Validate indices before access
            if (editContext.trackIndex === undefined || editContext.subtrackIndex === undefined ||
                !UPDATE_DATA.tracks[editContext.trackIndex] ||
                !UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex]) {
                console.error('❌ Invalid edit context for item save:', editContext);
                alert('Error: Could not find original item location. Please refresh and try again.');
                return;
            }

            const oldItem = UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].items[editContext.itemIndex];
            const finalItem = { ...oldItem, ...itemData };

            if (targetTi !== editContext.trackIndex || targetSi !== editContext.subtrackIndex) {
                UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].items.splice(editContext.itemIndex, 1);
                UPDATE_DATA.tracks[targetTi].subtracks[targetSi].items.push(finalItem);
            } else {
                UPDATE_DATA.tracks[targetTi].subtracks[targetSi].items[editContext.itemIndex] = finalItem;
            }
            logChange('Edit Item', finalItem.text);
        } else {
            const newItem = {
                id: `task-${Date.now()}`,
                ...itemData,
                publishedDate: itemData.publishedDate || new Date().toISOString().split('T')[0]
            };

            if (UPDATE_DATA.tracks[targetTi] && UPDATE_DATA.tracks[targetTi].subtracks[targetSi]) {
                UPDATE_DATA.tracks[targetTi].subtracks[targetSi].items.push(newItem);
                logChange('Add Item', newItem.text);
            } else {
                console.error('❌ Target location for new item not found:', { targetTi, targetSi });
                alert('Error: Could not save item to the specified track.');
            }
        }
    } else if (editContext.type === 'sprint') {
        const sprintData = {
            id: editContext.sprintId || `sprint-${Date.now()}`,
            name: document.getElementById('edit-sprint-name').value.trim(),
            startDate: document.getElementById('edit-sprint-start').value,
            endDate: document.getElementById('edit-sprint-end').value,
            goal: document.getElementById('edit-sprint-goal').value.trim(),
            linkedOKR: document.getElementById('edit-sprint-okr').value
        };
        if (!UPDATE_DATA.metadata.sprints) UPDATE_DATA.metadata.sprints = [];
        if (editContext.sprintId) {
            const idx = UPDATE_DATA.metadata.sprints.findIndex(s => s.id === editContext.sprintId);
            UPDATE_DATA.metadata.sprints[idx] = sprintData;
        } else {
            UPDATE_DATA.metadata.sprints.push(sprintData);
        }
        logChange(editContext.sprintId ? 'Edit Sprint' : 'Add Sprint', sprintData.name);
        renderSprintView();

    } else if (editContext.type === 'release') {
        const relData = {
            id: editContext.releaseId || `rel-${Date.now()}`,
            name: document.getElementById('edit-release-name').value.trim(),
            targetDate: document.getElementById('edit-release-date').value,
            goal: document.getElementById('edit-release-goal').value.trim(),
            linkedOKR: document.getElementById('edit-release-okr').value
        };
        if (!UPDATE_DATA.metadata.releases) UPDATE_DATA.metadata.releases = [];
        if (editContext.releaseId) {
            const idx = UPDATE_DATA.metadata.releases.findIndex(r => r.id === editContext.releaseId);
            UPDATE_DATA.metadata.releases[idx] = relData;
        } else {
            UPDATE_DATA.metadata.releases.push(relData);
        }
        logChange(editContext.releaseId ? 'Edit Release' : 'Add Release', relData.name);
        renderReleasesView();
    } else if (editContext.type === 'metadata') {
        const meta = UPDATE_DATA.metadata;
        meta.title = document.getElementById('edit-meta-title').value;
        meta.dateRange = document.getElementById('edit-meta-dateRange').value;
        meta.nextReview = document.getElementById('edit-meta-nextReview').value;
        meta.description = document.getElementById('edit-meta-description').value;
        try {
            meta.customStatuses = JSON.parse(document.getElementById('edit-meta-customStatuses').value);
        } catch (e) { alert('Invalid Status JSON structure.'); return; }
        logChange('Edit Metadata', meta.title);

    } else if (editContext.type === 'track') {
        const name = document.getElementById('edit-track-name').value.trim();
        const theme = document.getElementById('edit-track-theme').value;
        if (editContext.trackIndex !== undefined) {
            const track = UPDATE_DATA.tracks[editContext.trackIndex];
            track.name = name;
            track.theme = theme;
        } else {
            UPDATE_DATA.tracks.push({
                name,
                theme,
                subtracks: [{ name: 'General', items: [] }]
            });
        }
        const _tf = document.getElementById('global-team-filter');
        if (_tf) _tf.dataset.populated = '';
        logChange(editContext.trackIndex !== undefined ? 'Edit Track' : 'Add Track', name);
        renderTrackView();
        updateTabCounts();

    } else if (editContext.type === 'epic') {
        const epicData = {
            id: editContext.epicId || `epic-${Date.now()}`,
            name: document.getElementById('edit-epic-name').value.trim(),
            description: document.getElementById('edit-epic-desc').value.trim(),
            health: document.getElementById('edit-epic-health').value,
            stage: document.getElementById('edit-epic-stage').value,
            successCriteria: document.getElementById('edit-epic-success').value.trim(),
            linkedOKR: document.getElementById('edit-epic-okr').value,
            planningHorizon: document.getElementById('edit-epic-horizon').value,
            strategicWeight: parseInt(document.getElementById('edit-epic-weight').value) || 0,
            riskType: document.getElementById('edit-epic-risk').value
        };
        if (!UPDATE_DATA.metadata.epics) UPDATE_DATA.metadata.epics = [];
        if (editContext.epicId) {
            const idx = UPDATE_DATA.metadata.epics.findIndex(e => e.id === editContext.epicId);
            UPDATE_DATA.metadata.epics[idx] = epicData;
        } else {
            UPDATE_DATA.metadata.epics.push(epicData);
        }
        logChange(editContext.epicId ? 'Edit Epic' : 'Add Epic', epicData.name);

    } else if (editContext.type === 'okr') {
        // Collect key results from form fields
        const keyResults = [];
        const krFields = document.querySelectorAll('[data-kr-field]');

        // Group fields by index
        const krsByIndex = {};
        krFields.forEach(field => {
            const idx = parseInt(field.getAttribute('data-kr-idx'));
            const fieldName = field.getAttribute('data-kr-field');

            if (!krsByIndex[idx]) {
                krsByIndex[idx] = {
                    id: window._editingKeyResults[idx]?.id || `kr-${Date.now()}-${idx}`,
                    description: '',
                    target: 100,
                    current: 0,
                    unit: '%',
                    progress: 0,
                    status: 'on-track',
                    linkedEpic: ''
                };
            }

            // Get value from field
            let value = field.value;
            if (fieldName === 'target' || fieldName === 'current') {
                value = parseFloat(value) || 0;
            }

            krsByIndex[idx][fieldName] = value;
        });

        // Calculate progress for each KR
        Object.values(krsByIndex).forEach(kr => {
            if (kr.target > 0) {
                kr.progress = Math.round((kr.current / kr.target) * 100);
            }
            keyResults.push(kr);
        });

        // Calculate overall OKR progress
        let overallProgress = 0;
        if (keyResults.length > 0) {
            const totalProgress = keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0);
            overallProgress = Math.round(totalProgress / keyResults.length);
        }

        const okrData = {
            id: editContext.okrId || `okr-${Date.now()}`,
            quarter: document.getElementById('edit-okr-quarter').value.trim(),
            objective: document.getElementById('edit-okr-objective').value.trim(),
            owner: document.getElementById('edit-okr-owner').value.trim(),
            keyResults: keyResults,
            overallProgress: overallProgress
        };

        if (!UPDATE_DATA.metadata.okrs) UPDATE_DATA.metadata.okrs = [];

        if (editContext.okrId) {
            const idx = UPDATE_DATA.metadata.okrs.findIndex(o => o.id === editContext.okrId);
            if (idx !== -1) {
                UPDATE_DATA.metadata.okrs[idx] = okrData;
            } else {
                UPDATE_DATA.metadata.okrs.push(okrData);
            }
        } else {
            UPDATE_DATA.metadata.okrs.push(okrData);
        }

        logChange(editContext.okrId ? 'Edit OKR' : 'Add OKR', okrData.objective);

        // AUTO-REFRESH VIEW
        if (typeof renderOkrView === 'function') renderOkrView();
        closeCmsModal();
    } else if (window._visionEditContext && window._visionEditContext.type === 'vision') {
        const visionText = document.getElementById('edit-vision-text')?.value.trim() || '';
        UPDATE_DATA.metadata.vision = visionText;
        logChange('Edit Vision', visionText ? 'Vision updated' : 'Vision cleared');
        window._visionEditContext = null;

    } else if (editContext.type === 'roadmap') {
        const roadmapData = {
            id: document.getElementById('edit-roadmap-id').value.trim(),
            label: document.getElementById('edit-roadmap-label').value.trim(),
            color: document.getElementById('edit-roadmap-color').value,
            linkedObjective: document.getElementById('edit-roadmap-okr').value
        };
        if (!UPDATE_DATA.metadata.roadmap) {
            UPDATE_DATA.metadata.roadmap = [
                { id: '1M', label: 'Now (Immediate / 1 Month)', color: 'blue' },
                { id: '3M', label: 'Next (Strategic / 3 Months)', color: 'indigo' },
                { id: '6M', label: 'Later (Future / 6 Months)', color: 'slate' }
            ];
        }
        if (editContext.roadmapId) {
            const idx = UPDATE_DATA.metadata.roadmap.findIndex(r => r.id === editContext.roadmapId);
            UPDATE_DATA.metadata.roadmap[idx] = roadmapData;
        } else {
            UPDATE_DATA.metadata.roadmap.push(roadmapData);
        }
        logChange(editContext.roadmapId ? 'Edit Roadmap' : 'Add Roadmap', roadmapData.label);
        renderRoadmapView();

    } else if (editContext.type === 'subtrack') {
        const subName = document.getElementById('edit-subtrack-name').value.trim();
        const subNote = document.getElementById('edit-subtrack-note').value.trim();
        if (editContext.subtrackIndex !== undefined) {
            const sub = UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex];
            sub.name = subName;
            sub.note = subNote;
        } else {
            UPDATE_DATA.tracks[editContext.trackIndex].subtracks.push({
                name: subName,
                note: subNote,
                items: []
            });
        }
        logChange(editContext.subtrackIndex !== undefined ? 'Edit Subtrack' : 'Add Subtrack', subName);
        renderTrackView();
    }

    saveToLocalStorage();
    renderDashboard();

    window.uiState.isDirty = false; // Saved — bypass unsaved-changes guard
    closeCmsModal();
    const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    if (typeof switchView === 'function') switchView(currentView);
}

function updateItemGrooming(trackIndex, subtrackIndex, itemIndex, field, value, itemId) {
    // 🏆 Phase 32: Use Universal Resolver for absolute ID-first matching
    const data = getValidatedItemContext(itemId || { trackIndex, subtrackIndex, itemIndex });
    if (!data) {
        console.error('❌ updateItemGrooming: Item context not found', { trackIndex, subtrackIndex, itemIndex, itemId });
        return;
    }
    
    data.item[field] = value;
    logChange(`Groom Item (${field})`, data.item.text);
    
    saveToLocalStorage();
    renderDashboard();
    
    // Auto-refresh the current view
    const currentView = window.currentActiveView || 'backlog';
    if (typeof switchView === 'function') switchView(currentView);
}

// Consolidated Track Management
function openTrackEdit(ti) {
    const track = ti !== undefined ? UPDATE_DATA.tracks[ti] : { name: '', theme: 'blue', subtracks: [{ name: 'General', items: [] }] };
    editContext = { type: 'track', trackIndex: ti };

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🏗️</span>
            <span class="font-black tracking-tight">${ti !== undefined ? 'Edit Functional Track' : 'Add New Track'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Infrastructure Banner -->
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Lifecycle Stage: Structural Framework</div>
            <div class="stage-desc">Manage the primary silos of your engineering organization. Tracks represent long-lived functional domains.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Track Identifier</label>
                <input type="text" id="edit-track-name" value="${track.name}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Platform Team">
            </div>
            <div>
                <label class="cms-label">Strategic Theme</label>
                <select id="edit-track-theme" class="cms-input shadow-sm focus:shadow-md">
                    <option value="blue" ${track.theme === 'blue' ? 'selected' : ''}>Standard Blue</option>
                    <option value="emerald" ${track.theme === 'emerald' ? 'selected' : ''}>Emerald Green</option>
                    <option value="violet" ${track.theme === 'violet' ? 'selected' : ''}>Violet Purple</option>
                    <option value="amber" ${track.theme === 'amber' ? 'selected' : ''}>Amber Yellow</option>
                    <option value="rose" ${track.theme === 'rose' ? 'selected' : ''}>Rose Pink</option>
                    <option value="slate" ${track.theme === 'slate' ? 'selected' : ''}>Cool Slate</option>
                </select>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${ti !== undefined ? `
            <button onclick="deleteTrack(${ti})" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete Track
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${ti !== undefined ? 'Save Changes' : 'Create Track'}
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function deleteTrack(ti) {
    if (!confirm(`Delete track "${UPDATE_DATA.tracks[ti].name}" and ALL its items?`)) return;
    UPDATE_DATA.tracks.splice(ti, 1);
    const _tf = document.getElementById('global-team-filter');
    if (_tf) _tf.dataset.populated = '';
    closeCmsModal();
    renderTrackView();
    updateTabCounts();
}

function addSubtrack(ti) {
    const name = prompt('Subtrack Name:');
    if (!name) return;
    UPDATE_DATA.tracks[ti].subtracks.push({ name, items: [] });
    renderTrackView();
    updateTabCounts();
}

function openSubtrackEdit(ti, si) {
    const sub = UPDATE_DATA.tracks[ti].subtracks[si];
    editContext = { type: 'subtrack', trackIndex: ti, subtrackIndex: si };

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">📂</span>
            <span class="font-black tracking-tight">Edit Engineering Subtrack</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <div class="space-y-5">
            <div>
                <label class="cms-label">Subtrack Header</label>
                <input type="text" id="edit-subtrack-name" value="${sub.name}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Core Features">
            </div>
            <div>
                <label class="cms-label">Context / Internal Notes</label>
                <textarea id="edit-subtrack-note" class="cms-input shadow-sm focus:shadow-md" rows="3" placeholder="Operational context for this group...">${sub.note || ''}</textarea>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        <button onclick="deleteSubtrack(${ti}, ${si})" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
            <span>🗑️</span> Delete Subtrack
        </button>
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> Save Changes
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function deleteSubtrack(ti, si) {
    if (!confirm(`Delete subtrack "${UPDATE_DATA.tracks[ti].subtracks[si].name}"?`)) return;
    UPDATE_DATA.tracks[ti].subtracks.splice(si, 1);
    closeCmsModal();
    renderTrackView();
    updateTabCounts();
}


/**
 * Real-time ROI Calculator for the form
 */
function updateRoiPreview() {
    const impactVal = document.getElementById('edit-impactLevel')?.value;
    const effortVal = document.getElementById('edit-effortLevel')?.value;
    const previewContainer = document.getElementById('roi-preview-container');

    if (!previewContainer) return;

    if (!impactVal || !effortVal) {
        previewContainer.innerHTML = '';
        return;
    }

    const impactValues = { low: 1, medium: 2, high: 3 };
    const effortValues = { low: 3, medium: 2, high: 1 };

    const impactNum = impactValues[impactVal];
    const effortNum = effortValues[effortVal];
    const score = Math.round((impactNum * effortNum) / 9 * 100);

    let label = 'Medium ROI';
    let color = 'bg-amber-50 text-amber-700 border-amber-200';
    if (score >= 80) {
        label = 'High ROI (Quick Win)';
        color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (score < 40) {
        label = 'Low ROI (Time Sink)';
        color = 'bg-slate-50 text-slate-500 border-slate-200';
    }

    previewContainer.innerHTML = `
        <div class="flex items-center justify-between p-2 rounded-lg border ${color} transition-all animate-in fade-in zoom-in duration-300">
            <span class="text-[10px] font-black uppercase tracking-wider">Calculated Priority</span>
            <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold">${label}</span>
                <span class="text-xs font-black px-1.5 py-0.5 rounded bg-white/50 border border-current/20">${score}</span>
            </div>
        </div>
    `;
}

function openMetadataEdit() {
    const meta = UPDATE_DATA.metadata;
    editContext = { type: 'metadata' };

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">⚙️</span>
            <span class="font-black tracking-tight">Edit Project DNA & Metadata</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- System Banner -->
        <div class="lifecycle-banner execution">
            <div class="stage-tag">Lifecycle Stage: System Configuration</div>
            <div class="stage-desc">Manage the global identifiers and metadata that drive the dashboard's filtering and alignment.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Dashboard Identifier</label>
                <input type="text" id="edit-meta-title" value="${meta.title}" class="cms-input shadow-sm focus:shadow-md">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="cms-label">Cycle / Quarter</label>
                    <input type="text" id="edit-meta-dateRange" value="${meta.dateRange}" class="cms-input shadow-sm focus:shadow-md">
                </div>
                <div>
                    <label class="cms-label">Review Cadence</label>
                    <input type="text" id="edit-meta-nextReview" value="${meta.nextReview || ''}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. April 15">
                </div>
            </div>
            <div>
                <label class="cms-label">Dashboard Vision Statement</label>
                <textarea id="edit-meta-description" class="cms-input shadow-sm focus:shadow-md" rows="2">${meta.description}</textarea>
            </div>
            <div>
                <label class="cms-label">Engineering Lifecycle States (JSON)</label>
                <div class="border border-slate-200 rounded-lg overflow-hidden focus-within:border-indigo-400 transition-colors">
                    <textarea id="edit-meta-customStatuses" class="cms-input font-mono text-xs p-4 !border-none !rounded-none focus:!shadow-none bg-slate-50" rows="8">${JSON.stringify(meta.customStatuses || [], null, 2)}</textarea>
                </div>
                <p class="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <span class="w-2.5 h-2.5 rounded-full bg-slate-100 flex items-center justify-center text-[8px]">!</span>
                    Format: [{"id":"status_id", "label":"Label", "class":"css_class", "bucket":"status_bucket"}]
                </p>
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> Save Metadata
        </button>
    `;
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}


// DELETED DUPLICATE openSubtrackEdit, deleteSubtrack, logoutAll here.
// Unique functions follow:

function updateMoveSubtrackOpts(ti) {
    const subSel = document.getElementById('edit-move-subtrack');
    if (!subSel) return;
    subSel.innerHTML = UPDATE_DATA.tracks[parseInt(ti)].subtracks.map((s, si) =>
        `<option value="${si}">${s.name}</option>`
    ).join('');
}

async function saveToGithub() {
    const btn = document.getElementById('save-to-github-btn');
    const jwt = localStorage.getItem('khyaal_site_auth');
    if (!jwt) { alert('Unauthorized'); return; }

    btn.disabled = true; btn.innerText = 'Saving...';
    window.isActionLockActive = true;
    _setLockWatchdog();
    try {
        const projectId = window.ACTIVE_PROJECT_ID || 'default';
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(UPDATE_DATA, null, 4))));
        const sha = window._lastDataSha || null
        const res = await fetch(`${LAMBDA_URL}?action=write`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, content, sha, message: 'CMS: Update dashboard data' })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Save failed');
        if (result.sha) window._lastDataSha = result.sha
        alert('Saved successfully!');
        location.reload();
    } catch (e) {
        console.error('❌ saveToGithub:', e);
        alert('Save error: ' + e.message);
        btn.disabled = false; btn.innerText = 'Save to GitHub';
    } finally {
        _clearLockWatchdog();
        window.isActionLockActive = false;
    }
}

// ------ COMMENTS ------
function toggleComments(ti, si, ii, itemId, viewPrefix = 'main') {
    const data = itemId ? findItemById(itemId) : { item: UPDATE_DATA.tracks[ti].subtracks[si].items[ii] };
    if (!data) return;
    
    const id = `${viewPrefix}-comments-${data.item.id}`;
    const el = document.getElementById(id);
    if (!el) return;
    
    const isNowVisible = el.classList.toggle('hidden') === false;
    
    // 🏆 Phase 29: Track open state to survive silent re-renders
    if (isNowVisible) {
        window.uiState.openComments.add(data.item.id);
    } else {
        window.uiState.openComments.delete(data.item.id);
    }
}

function addComment(ti, si, ii, itemId, viewPrefix = 'main') {
    // 🏆 Phase 31: Use Universal Resolver for absolute ID-first matching
    const data = getValidatedItemContext(itemId || { trackIndex: ti, subtrackIndex: si, itemIndex: ii });
    if (!data) {
        console.error('❌ addComment: Item context not found', { ti, si, ii, itemId });
        return;
    }
    
    const inputId = `${viewPrefix}-comment-input-${data.item.id}`;
    const input = document.getElementById(inputId);
    if (!input || !input.value.trim()) return;
    
    if (!data.item.comments) data.item.comments = [];
    data.item.comments.push({ 
        id: `c-${Date.now()}`, 
        text: input.value.trim(), 
        author: 'PM', 
        timestamp: new Date().toISOString() 
    });
    
    input.value = '';
    saveToLocalStorage();
    
    // Phase 29: Smart re-render (maintains open state)
    renderDashboard(); 
}

function deleteComment(ti, si, ii, cid, itemId, viewPrefix = 'main') {
    // 🏆 Phase 31: Use Universal Resolver for absolute ID-first matching
    const data = getValidatedItemContext(itemId || { trackIndex: ti, subtrackIndex: si, itemIndex: ii });
    if (!data) return;
    
    data.item.comments = (data.item.comments || []).filter(c => c.id !== cid);
    
    saveToLocalStorage();
    
    // Phase 29: Smart re-render (maintains open state)
    renderDashboard(); 
}

function deleteItem(ti_ignored, si_ignored, ii_ignored, itemId, viewPrefix) {
    const data = getValidatedItemContext(itemId);
    if (!data) return;

    // Prevent background refreshes from killing the modal
    window.isActionLockActive = true;
    _setLockWatchdog();
    window.uiState.isDirty = false; // Disarm unsaved-changes guard before any confirm dialog

    // Decouple from event loop to prevent instant closure
    setTimeout(() => {
        const confirmResult = confirm(`Delete task: "${data.item.text}"?`);
        if (!confirmResult) { _clearLockWatchdog(); window.isActionLockActive = false; return; }

        UPDATE_DATA.tracks[data.ti].subtracks[data.si].items.splice(data.ii, 1);
        logChange('Delete Item', data.item.text);

        closeCmsModal();
        saveToLocalStorage();
        
        // Final refresh
        if (viewPrefix) {
            renderDashboard();
            switchView(viewPrefix);
        } else {
            const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
            switchView(currentView);
        }
        updateTabCounts();

        // Release the lock
        _clearLockWatchdog();
        window.isActionLockActive = false;
    }, 0);
}

function sendToBacklog(ti_ignored, si_ignored, ii_ignored, itemId, viewPrefix) {
    const data = getValidatedItemContext(itemId);
    if (!data) return;

    window.isActionLockActive = true;
    _setLockWatchdog();
    setTimeout(() => {
        const track = UPDATE_DATA.tracks[data.ti];
        let bIdx = track.subtracks.findIndex(s => s.name === 'Backlog');
        if (bIdx === -1) { track.subtracks.push({ name: 'Backlog', items: [] }); bIdx = track.subtracks.length - 1; }
        const [item] = track.subtracks[data.si].items.splice(data.ii, 1);
        track.subtracks[bIdx].items.push(item);
        logChange('Move to Backlog', item.text);
        
        saveToLocalStorage();
        
        // Force full view reflection
        renderDashboard(); 
        if (viewPrefix) {
            switchView(viewPrefix);
        } else {
            const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
            switchView(currentView);
        }
        
        updateTabCounts();
        _clearLockWatchdog();
        window.isActionLockActive = false;
    }, 0);
}

function toggleBlocker(ti_ignored, si_ignored, ii_ignored, itemId, viewPrefix) {
    const data = getValidatedItemContext(itemId);
    if (!data) return;

    window.isActionLockActive = true;
    _setLockWatchdog();
    setTimeout(() => {
        if (data.item.blocker) { 
            delete data.item.blocker; 
            delete data.item.blockerNote; 
            logChange('Unblock Item', data.item.text); 
        } else { 
            const note = prompt('Blocker reason:', '') || ''; 
            if (!note) {
                _clearLockWatchdog();
                window.isActionLockActive = false;
                return;
            } 
            data.item.blocker = true; 
            data.item.blockerNote = note; 
            logChange('Flag Blocker', data.item.text); 
        }

        saveToLocalStorage();
        
        // Force full view reflection
        renderDashboard(); 
        if (viewPrefix) {
            switchView(viewPrefix);
        } else {
            const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
            switchView(currentView);
        }
        
        if (typeof renderBlockerStrip === 'function') renderBlockerStrip();

        // Ensure lock is released after all state-changing rendering is complete
        _clearLockWatchdog();
        window.isActionLockActive = false;
    }, 0);
}

// ------ ARCHIVE MANAGEMENT ------
async function initArchiveFilter() {
    const dates = new Set();
    let hasLegacy = false;

    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.publishedDate) {
                    const date = new Date(item.publishedDate);
                    const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                    dates.add(monthYear);
                } else {
                    hasLegacy = true;
                }
            });
        });
    });

    // ── Snapshots button → #nav-snapshots-btn ───────────────────────────────
    const snapshotsSlot = document.getElementById('nav-snapshots-btn')
    if (snapshotsSlot) {
        try {
            const jwt = localStorage.getItem('khyaal_site_auth');
            const response = await fetch(`${LAMBDA_URL}?action=read&projectId=${window.ACTIVE_PROJECT_ID || 'default'}&filePath=archive`, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            if (response.ok) {
                const { data: files } = await response.json();
                const archives = Array.isArray(files) ? files.filter(f => f.name.endsWith('.json')) : [];
                let snapRows = `<div class="flex flex-wrap gap-1.5 items-center">`
                if (window.loadingArchive) {
                    snapRows += `<button onclick="window.location.search=''" class="archive-btn">◉ Live</button>`
                }
                if (archives.length > 0) {
                    archives.sort((a, b) => b.name.localeCompare(a.name)).forEach(file => {
                        const displayName = file.name.replace('.json', '').replace(/-/g, ' ').trim()
                        const isActive = window.loadingArchive && window.loadingArchive.includes(file.name)
                        const activeClass = isActive ? 'ring-2 ring-indigo-500' : ''
                        snapRows += `<button onclick="loadArchive('${file.name}')" class="archive-btn ${activeClass} bg-indigo-50 text-indigo-700">${displayName}</button>`
                    })
                } else {
                    snapRows += `<span class="text-[11px] text-slate-400 italic">No snapshots yet</span>`
                }
                snapRows += `</div>`
                snapshotsSlot.innerHTML = `
                    <button class="nav-pill-btn" onclick="toggleNavSnapshotsPanel(this)" aria-label="Snapshots">
                        📸 ${archives.length || '–'}
                    </button>
                    <div class="nav-dropdown" id="nav-snapshots-panel">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Historical Snapshots</p>
                        ${snapRows}
                    </div>`
            } else {
                console.warn('⚠️ Snapshots fetch failed:', response.status)
            }
        } catch (e) {
            console.warn('⚠️ initArchiveFilter error:', e)
        }
    }
}

window.toggleNavFilterPanel = function(btn) {
    const panel = document.getElementById('nav-filter-panel')
    if (!panel) return
    const isOpen = panel.classList.toggle('open')
    btn.classList.toggle('active', isOpen)
    document.getElementById('nav-snapshots-panel')?.classList.remove('open')
    if (isOpen) {
        const close = (e) => { if (!panel.closest('.nav-filter-slot').contains(e.target)) { panel.classList.remove('open'); btn.classList.remove('active'); document.removeEventListener('click', close) } }
        setTimeout(() => document.addEventListener('click', close), 0)
    }
}

window.toggleNavSnapshotsPanel = function(btn) {
    const panel = document.getElementById('nav-snapshots-panel')
    if (!panel) return
    const isOpen = panel.classList.toggle('open')
    btn.classList.toggle('active', isOpen)
    document.getElementById('nav-filter-panel')?.classList.remove('open')
    if (isOpen) {
        const slot = document.getElementById('nav-snapshots-btn')
        const close = (e) => {
            if (slot && !slot.contains(e.target)) {
                panel.classList.remove('open')
                btn.classList.remove('active')
                document.removeEventListener('click', close)
            }
        }
        setTimeout(() => document.addEventListener('click', close), 0)
    }
}

function filterByDate(dateRange) {
    window.currentDateFilter = dateRange;
    document.querySelectorAll('.archive-btn').forEach(btn => btn.classList.toggle('active', btn.innerText === dateRange || (dateRange === 'all' && btn.innerText === 'All Entries')));
    const cv = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    if (cv === 'track') renderTrackView();
    else if (cv === 'status') renderStatusView();
    else if (cv === 'priority') renderPriorityView();
    else if (cv === 'contributor') renderContributorView();
}

async function archiveAndClear() {
    // Count in-progress items that are NOT done and NOT already in next/later
    let inProgressItems = []
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(sub => {
            sub.items.forEach(item => {
                if (['now', 'qa', 'review'].includes(item.status)) {
                    inProgressItems.push({ item, sub })
                }
            })
        })
    })

    let rollbackInProgress = false
    if (inProgressItems.length > 0) {
        const msg = `ARCHIVE & CLEAR DASHBOARD?\n\n⚠️ ${inProgressItems.length} item(s) are still in progress (now/qa/review) and will NOT be cleared.\n\nThey will remain in the data as-is. Optionally, roll them back to "next" so they show up in the next sprint.\n\nOptions:\n• OK = Archive & keep in-progress items as-is\n• Cancel = Stop and manually handle these items first\n\nPress OK to continue (or Cancel to abort).`
        if (!confirm(msg)) return
    } else {
        if (!confirm('ARCHIVE & CLEAR DASHBOARD? This will save all current data to a timestamped JSON file in /archive and clear all done items.')) return
    }

    const btn = document.getElementById('archive-btn');
    const jwt = localStorage.getItem('khyaal_site_auth');
    if (!jwt) { alert('Unauthorized'); return; }

    btn.disabled = true; btn.innerText = 'Archiving...';
    window.isActionLockActive = true;
    _setLockWatchdog();
    try {
        const projectId = window.ACTIVE_PROJECT_ID || 'default';
        const fileName = `archive_${new Date().toISOString().split('T')[0]}.json`;

        // 1. Write snapshot to archive folder (no sha needed — new file)
        const archiveRes = await fetch(`${LAMBDA_URL}?action=write`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                filePath: `archive/${fileName}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(UPDATE_DATA, null, 4)))),
                message: `Archive: ${UPDATE_DATA.metadata.dateRange}`
            })
        });
        if (!archiveRes.ok) {
            const err = await archiveRes.json();
            throw new Error(err.error || 'Archive write failed');
        }

        // 2. Clear done items; keep everything else (now/qa/review/next/later/blocked/onhold)
        UPDATE_DATA.tracks.forEach(track => {
            track.subtracks.forEach(sub => {
                sub.items = sub.items.filter(item => item.status !== 'done');
            });
        });

        // 3. Write cleared data back to main data file
        const resetRes = await fetch(`${LAMBDA_URL}?action=write`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(UPDATE_DATA, null, 4)))),
                message: 'CMS: post-archive data reset'
            })
        });
        if (!resetRes.ok) {
            const err = await resetRes.json();
            throw new Error(err.error || 'Data reset failed');
        }

        // 4. Hard-Sync Local Browser State
        saveToLocalStorage();

        alert('Archive successful!');
        location.reload();
    } catch (e) {
        console.error('❌ archiveAndClear:', e);
        alert('Archive error: ' + e.message);
        btn.disabled = false; btn.innerText = 'Archive & Clear';
    } finally {
        _clearLockWatchdog();
        window.isActionLockActive = false;
    }
}

async function loadArchive(fileName) {
    window.location.search = `?archive=archive/${fileName}`;
}

// ------ CMS ROUTING ------
function saveCms() {
    if (!editContext) return;

    // Capture pre-save state for handoff toast
    let prevStatus = null
    let newStatus = null
    if (editContext.type === 'item') {
        const oldItem = UPDATE_DATA.tracks[editContext.trackIndex]?.subtracks[editContext.subtrackIndex]?.items[editContext.itemIndex]
        prevStatus = oldItem?.status || null
    }
    // Read new status & sprintId before modal closes
    newStatus = document.getElementById('edit-status')?.value || null
    const newSprintId = document.getElementById('edit-sprintId')?.value || null
    const isNew = editContext.type === 'item-new'
    const ctxType = editContext.type

    saveCmsChanges()

    // Handoff toasts — guide the user on what to do next
    if (typeof showHandoffToast === 'function') {
        if (ctxType === 'item' && newStatus === 'done' && prevStatus !== 'done') {
            showHandoffToast('Marked Done ✓ — ship it to a release so it counts in your metrics', 'Ship to Release →', () => switchView('releases'))
        } else if (ctxType === 'item' && newStatus === 'blocked' && prevStatus !== 'blocked') {
            showHandoffToast('Blocker flagged 🛑 — PM should resolve before next standup', 'View Track →', () => switchView('track'))
        } else if (isNew) {
            if (newSprintId) {
                showHandoffToast('Task created & added to sprint ✓', 'View Sprint →', () => switchView('sprint'))
            } else {
                showHandoffToast('Task created ✓ — groom it in the backlog before sprint planning', 'Go to Backlog →', () => switchView('backlog'))
            }
        } else if (ctxType === 'sprint') {
            showHandoffToast('Sprint saved ✓ — pull tasks from Backlog to commit the scope', 'Go to Backlog →', () => switchView('backlog'))
        } else if (ctxType === 'release') {
            showHandoffToast('Release saved ✓ — ship done tasks into it', 'View Releases →', () => switchView('releases'))
        } else if (ctxType === 'okr') {
            showHandoffToast('OKR saved ✓ — create Epics to deliver each Key Result', 'Go to Epics →', () => switchView('epics'))
        } else if (ctxType === 'epic') {
            showHandoffToast('Epic saved ✓ — break it into tasks in the Backlog', 'Go to Backlog →', () => switchView('backlog'))
        }
    }
}

function deleteEpic(idx) {
    const epic = UPDATE_DATA.metadata.epics[idx];
    if (!confirm(`Delete strategic epic "${epic.name}"? This will not delete tasks, but they will be unlinked from this epic.`)) return;

    // Clear epicId from all items that were linked to this epic
    const epicId = epic.id;
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.epicId === epicId) delete item.epicId;
            });
        });
    });

    UPDATE_DATA.metadata.epics.splice(idx, 1);
    logChange('Delete Epic', epic.name);
    switchView('epics');
    updateTabCounts();
}

// ========================================
// OKR MANAGEMENT FUNCTIONS
// ========================================

function openOKREdit(okrIndex) {
    const okr = okrIndex !== undefined ? UPDATE_DATA.metadata.okrs[okrIndex] : {
        quarter: '',
        objective: '',
        owner: '',
        keyResults: []
    };
    const okrId = okrIndex !== undefined ? okr.id : undefined;
    editContext = { type: 'okr', okrIndex, okrId };

    document.getElementById('modal-title').innerHTML = `
        <div class="flex items-center gap-3 text-slate-900">
            <span class="text-2xl">🎯</span>
            <span class="font-black tracking-tight">${okrId ? 'Edit Strategic OKR' : 'Create New OKR'}</span>
        </div>
    `;

    document.getElementById('modal-form').innerHTML = `
        <!-- Strategic Stage Banner -->
        <div class="lifecycle-banner strategic">
            <div class="stage-tag">Lifecycle Stage: Strategic Vision</div>
            <div class="stage-desc">Define high-level objectives for the quarter to align technical delivery with business outcomes.</div>
        </div>

        <div class="space-y-5">
            <div>
                <label class="cms-label">Cyclical Quarter</label>
                <input type="text" id="edit-okr-quarter" value="${okr.quarter}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Q1 2026">
            </div>

            <div>
                <label class="cms-label">Primary Strategic Objective</label>
                <textarea id="edit-okr-objective" class="cms-input shadow-sm focus:shadow-md" rows="2" placeholder="What mission-critical objective are we targeting?">${okr.objective}</textarea>
            </div>

            <div>
                <label class="cms-label">Accountable Owner / Team</label>
                <input type="text" id="edit-okr-owner" value="${okr.owner}" class="cms-input shadow-sm focus:shadow-md" placeholder="e.g. Architecture Team">
            </div>
        </div>

        <div class="mt-8 pt-6 border-t border-slate-200">
            <div class="flex justify-between items-center mb-4">
                <label class="cms-label !mb-0">Key Results (Execution Metrics)</label>
                <button type="button" onclick="addKeyResult()" class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 rounded-lg transition-all">
                    + Add Key Result
                </button>
            </div>
            <div id="key-results-container" class="space-y-4">
                ${(okr.keyResults || []).map((kr, idx) => renderKeyResultForm(kr, idx)).join('')}
            </div>
        </div>
    `;

    // Set Footer
    document.getElementById('modal-footer').innerHTML = `
        <button onclick="closeCmsModal()" class="cms-btn cms-btn-secondary flex items-center gap-2">
            <span>✕</span> Cancel
        </button>
        ${okrId ? `
            <button onclick="deleteOKR(${okrIndex})" class="cms-btn cms-btn-danger mr-auto flex items-center gap-2">
                <span>🗑️</span> Delete OKR
            </button>
        ` : ''}
        <button onclick="saveCms()" class="cms-btn cms-btn-primary flex items-center gap-2">
            <span>✓</span> ${okrId ? 'Save Changes' : 'Create OKR'}
        </button>
    `;

    // Activate modal with background lock
    document.getElementById('cms-modal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Store key results in global state for manipulation
    window._editingKeyResults = okr.keyResults || [];
}

function renderKeyResultForm(kr, idx) {
    const epics = UPDATE_DATA.metadata.epics || [];
    return `
        <div class="cms-card" data-kr-index="${idx}">
            <div class="flex justify-between items-start mb-4">
                <div class="flex flex-col">
                    <span class="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Execution Metric</span>
                    <span class="text-xs font-bold text-slate-800 uppercase tracking-widest">Key Result ${idx + 1}</span>
                </div>
                <button type="button" onclick="removeKeyResult(${idx})" class="text-[9px] font-black text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-rose-500 px-2.5 py-1.5 rounded-lg transition-all uppercase tracking-widest">
                    Remove
                </button>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="cms-label !text-[9px]">Success Metric Descriptor</label>
                    <input type="text" class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" placeholder="e.g. Reduce latent performance by 15%..."
                           value="${kr.description || ''}" data-kr-field="description" data-kr-idx="${idx}">
                </div>

                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label class="cms-label !text-[9px]">Target</label>
                        <input type="number" class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" placeholder="100"
                               value="${kr.target || ''}" data-kr-field="target" data-kr-idx="${idx}">
                    </div>
                    <div>
                        <label class="cms-label !text-[9px]">Current</label>
                        <input type="number" class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" placeholder="75"
                               value="${kr.current || 0}" data-kr-field="current" data-kr-idx="${idx}">
                    </div>
                    <div>
                        <label class="cms-label !text-[9px]">Unit</label>
                        <input type="text" class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" placeholder="%"
                               value="${kr.unit || ''}" data-kr-field="unit" data-kr-idx="${idx}">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="cms-label !text-[9px]">Strategic Drift</label>
                        <select class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" data-kr-field="status" data-kr-idx="${idx}">
                            <option value="on-track" ${kr.status === 'on-track' ? 'selected' : ''}>🟢 On-Track</option>
                            <option value="at-risk" ${kr.status === 'at-risk' ? 'selected' : ''}>🟡 At-Risk</option>
                            <option value="behind" ${kr.status === 'behind' ? 'selected' : ''}>🔴 Behind</option>
                            <option value="achieved" ${kr.status === 'achieved' ? 'selected' : ''}>🏆 Achieved</option>
                        </select>
                    </div>
                    <div>
                        <label class="cms-label !text-[9px]">Linked Execution Source</label>
                        <select class="cms-input !mb-0 text-sm shadow-sm focus:shadow-md" data-kr-field="linkedEpic" data-kr-idx="${idx}">
                            <option value="">None (Unlinked)</option>
                            ${epics.map(e => `<option value="${e.id}" ${kr.linkedEpic === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function addKeyResult() {
    const container = document.getElementById('key-results-container');
    if (!container) return;

    const idx = (window._editingKeyResults || []).length;

    const newKR = {
        id: `kr-${Date.now()}`,
        description: '',
        target: 100,
        current: 0,
        unit: '%',
        status: 'on-track',
        linkedEpic: ''
    };

    if (!window._editingKeyResults) window._editingKeyResults = [];
    window._editingKeyResults.push(newKR);

    // Use insertAdjacentHTML to preserve existing input values
    container.insertAdjacentHTML('beforeend', renderKeyResultForm(newKR, idx));
}

function removeKeyResult(idx) {
    // 1. Sync current UI state back to window._editingKeyResults before removing
    harvestKeyResultsToState();

    // 2. Remove from state
    window._editingKeyResults.splice(idx, 1);

    // 3. Re-render the container to update indices
    const container = document.getElementById('key-results-container');
    if (container) {
        container.innerHTML = window._editingKeyResults.map((kr, i) => renderKeyResultForm(kr, i)).join('');
    }
}

/**
 * Harvests all OKR key result inputs from the DOM into window._editingKeyResults
 * This is used to ensure state is preserved before destructive re-renders (like removal)
 */
function harvestKeyResultsToState() {
    const krFields = document.querySelectorAll('[data-kr-field]');
    if (!window._editingKeyResults) window._editingKeyResults = [];

    krFields.forEach(field => {
        const idx = parseInt(field.getAttribute('data-kr-idx'));
        const fieldName = field.getAttribute('data-kr-field');
        if (window._editingKeyResults[idx]) {
            let val = field.value;
            if (fieldName === 'target' || fieldName === 'current') val = parseFloat(val) || 0;
            window._editingKeyResults[idx][fieldName] = val;
        }
    });
}

function deleteOKR(okrIndex) {
    const okr = UPDATE_DATA.metadata.okrs[okrIndex];
    if (!confirm(`Delete OKR "${okr.objective}"? This will not delete tasks or epics, but they will be unlinked from this OKR.`)) return;

    // Clear linkedOKR from epics
    const okrId = okr.id;
    if (UPDATE_DATA.metadata.epics) {
        UPDATE_DATA.metadata.epics.forEach(epic => {
            if (epic.linkedOKR === okrId) delete epic.linkedOKR;
        });
    }

    UPDATE_DATA.metadata.okrs.splice(okrIndex, 1);
    logChange('Delete OKR', okr.objective);
    switchView('okr');
    updateTabCounts();
}

function deleteSprint(sprintId) {
    const sprint = UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId);
    if (!confirm(`Close sprint "${sprint.name}"? This will mark it as closed. Sprint history is preserved.`)) return;

    // Clear sprintId from items
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.sprintId === sprintId) delete item.sprintId;
            });
        });
    });

    sprint.status = 'closed';
    sprint.closedAt = new Date().toISOString().split('T')[0];
    logChange('Close Sprint', sprint.name);
    saveToLocalStorage();
    switchView('sprint');
    updateTabCounts();
    renderDashboard();
}

function deleteRelease(releaseId) {
    const release = UPDATE_DATA.metadata.releases.find(r => r.id === releaseId);
    if (!confirm(`Delete release "${release.name}"? This will not delete tasks, but they will be unlinked from this release.`)) return;

    // Clear releasedIn from items
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.releasedIn === releaseId) delete item.releasedIn;
            });
        });
    });

    const idx = UPDATE_DATA.metadata.releases.findIndex(r => r.id === releaseId);
    UPDATE_DATA.metadata.releases.splice(idx, 1);
    logChange('Delete Release', release.name);
    switchView('releases');
    updateTabCounts();
}

function deleteRoadmap(id) {
    const horizon = UPDATE_DATA.metadata.roadmap.find(r => r.id === id);
    if (!confirm(`Delete roadmap category "${horizon.label}"? Tasks will remain but will be unassigned from this horizon.`)) return;

    // Clear planningHorizon from items
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.planningHorizon === id) delete item.planningHorizon;
            });
        });
    });

    const idx = UPDATE_DATA.metadata.roadmap.findIndex(r => r.id === id);
    UPDATE_DATA.metadata.roadmap.splice(idx, 1);
    logChange('Delete Roadmap', horizon.label);
    switchView('roadmap');
}

// System logout
function logoutAll() {
    localStorage.removeItem('khyaal_site_auth');
    location.reload();
}

// Toggle Epic Backlog Persistence
function toggleEpicBacklog(epicId, isOpen) {
    if (isOpen) {
        window.uiState.openEpics.add(epicId);
    } else {
        window.uiState.openEpics.delete(epicId);
    }
}

/**
 * Silent Data Persistence
 * Persists data to LocalStorage without refreshing the page.
 */
function saveToLocalStorage() {
    if (!UPDATE_DATA) return;
    const cacheKey = `khyaal_data_${window.ACTIVE_PROJECT_ID || 'default'}`
    localStorage.setItem(cacheKey, JSON.stringify(UPDATE_DATA));
    console.log('✅ Changes persisted silently to LocalStorage');
}

// ------ ADMIN PANEL (User & Grant Management) ------

let _adminUsersData = null   // in-memory copy of users.json while panel is open
let _adminUsersSha = null    // last-known SHA for optimistic lock

async function openAdminPanel() {
    const isPm = (window.CURRENT_USER?.grants || []).some(g => g.mode === 'pm')
    if (!isPm) { showToast('Admin access requires PM grant', 'error'); return }

    const modal = document.getElementById('admin-panel-modal')
    if (!modal) { console.error('❌ [admin] #admin-panel-modal not found'); return }

    modal.classList.add('active')
    document.body.style.overflow = 'hidden'
    renderAdminPanel('<div class="text-slate-400 text-sm text-center py-8">Loading users…</div>')

    try {
        const jwt = localStorage.getItem('khyaal_site_auth')
        const res = await fetch(`${LAMBDA_URL}?action=read&projectId=default&filePath=users.json`, {
            headers: { 'Authorization': `Bearer ${jwt}` }
        })
        if (!res.ok) throw new Error(`Read failed: ${res.status}`)
        const { data, sha } = await res.json()
        _adminUsersData = data
        _adminUsersSha = sha || null
        // Sync PROJECT_REGISTRY from users.json if projects array exists
        if (Array.isArray(data?.projects) && data.projects.length > 0) {
            window.PROJECT_REGISTRY = data.projects
        }
        renderAdminPanel(_adminActiveTab === 'teams' ? buildAdminTeamsPanel() : buildAdminUsersTable())
    } catch (err) {
        console.error('❌ [admin] load users:', err)
        renderAdminPanel(`<div class="text-red-500 text-sm text-center py-8">Failed to load users: ${err.message}</div>`)
    }
}

function closeAdminPanel() {
    const modal = document.getElementById('admin-panel-modal')
    if (modal) modal.classList.remove('active')
    document.body.style.overflow = ''
    _adminUsersData = null
    _adminUsersSha = null
    _adminActiveTab = 'users'
}

let _adminActiveTab = 'users'

function renderAdminPanel(bodyHtml) {
    const el = document.getElementById('admin-panel-body')
    if (!el) return
    const tabs = `
        <div class="flex gap-1 mb-5 border-b border-slate-200 pb-0">
            <button onclick="switchAdminTab('users')" id="admin-tab-users"
                class="admin-tab-btn ${_adminActiveTab === 'users' ? 'active' : ''}">
                👤 Users &amp; Grants
            </button>
            <button onclick="switchAdminTab('teams')" id="admin-tab-teams"
                class="admin-tab-btn ${_adminActiveTab === 'teams' ? 'active' : ''}">
                🏗️ Teams &amp; Projects
            </button>
        </div>`
    el.innerHTML = tabs + `<div id="admin-tab-content">${bodyHtml}</div>`
}
window.switchAdminTab = function(tab) {
    _adminActiveTab = tab
    if (tab === 'users') {
        renderAdminPanel(buildAdminUsersTable())
    } else {
        renderAdminPanel(buildAdminTeamsPanel())
    }
}

function buildAdminUsersTable() {
    if (!_adminUsersData) {
        return '<p class="text-slate-400 text-sm text-center py-8">Users data not loaded. Try closing and reopening the panel.</p>'
    }
    if (!Array.isArray(_adminUsersData.users)) {
        console.error('❌ [admin] unexpected users.json shape:', _adminUsersData)
        return `<p class="text-amber-600 text-sm text-center py-8">Unexpected data format from users.json — expected <code>{ users: [] }</code>.<br>Check browser console for details.</p>`
    }
    if (!_adminUsersData.users.length) {
        return '<p class="text-slate-400 text-sm text-center py-8">No users found in users.json. Add entries to users.json and redeploy.</p>'
    }

    const modeOptions = (currentMode) => ['pm', 'dev', 'exec'].map(m =>
        `<option value="${m}" ${m === currentMode ? 'selected' : ''}>${m.toUpperCase()}</option>`
    ).join('')

    const projectOptions = (currentId) => (window.PROJECT_REGISTRY || [{ id: 'default', name: 'Khyaal Engineering' }]).map(p =>
        `<option value="${p.id}" ${p.id === currentId ? 'selected' : ''}>${p.name} (${p.id})</option>`
    ).join('')

    let html = `
    <div class="overflow-x-auto">
        <table class="w-full text-xs border-collapse">
            <thead>
                <tr class="border-b-2 border-slate-200">
                    <th class="text-left py-2 px-3 font-black text-slate-600 uppercase tracking-wide">User</th>
                    <th class="text-left py-2 px-3 font-black text-slate-600 uppercase tracking-wide">ID</th>
                    <th class="text-left py-2 px-3 font-black text-slate-600 uppercase tracking-wide">Grants</th>
                    <th class="text-left py-2 px-3 font-black text-slate-600 uppercase tracking-wide">Actions</th>
                </tr>
            </thead>
            <tbody>`

    _adminUsersData.users.forEach((user, ui) => {
        const grantsHtml = user.grants.map((g, gi) => `
            <div class="flex items-center gap-2 mb-1">
                <select onchange="adminUpdateGrant(${ui}, ${gi}, 'projectId', this.value)"
                    class="border border-slate-200 rounded px-1 py-0.5 text-xs bg-white">
                    ${projectOptions(g.projectId)}
                </select>
                <select onchange="adminUpdateGrant(${ui}, ${gi}, 'mode', this.value)"
                    class="border border-slate-200 rounded px-1 py-0.5 text-xs bg-white">
                    ${modeOptions(g.mode)}
                </select>
                <button onclick="adminRemoveGrant(${ui}, ${gi})"
                    aria-label="Remove grant"
                    class="text-red-400 hover:text-red-600 font-black leading-none">✕</button>
            </div>`
        ).join('')

        html += `
            <tr class="border-b border-slate-100 align-top hover:bg-slate-50">
                <td class="py-3 px-3 font-bold text-slate-800">${user.name || user.id}</td>
                <td class="py-3 px-3 text-slate-500 font-mono">${user.id}</td>
                <td class="py-3 px-3">
                    ${grantsHtml || '<span class="text-slate-400 italic">No grants</span>'}
                    <button onclick="adminAddGrant(${ui})"
                        class="mt-1 text-indigo-600 hover:text-indigo-800 font-black text-xs">+ Add grant</button>
                </td>
                <td class="py-3 px-3">
                    <button onclick="adminSetPassword(${ui})"
                        class="text-slate-600 hover:text-slate-900 font-bold mr-2">Set PW</button>
                    <button onclick="adminRemoveUser(${ui})"
                        aria-label="Remove user ${user.id}"
                        class="text-red-400 hover:text-red-600 font-bold">Remove</button>
                </td>
            </tr>`
    })

    html += `
            </tbody>
        </table>
    </div>
    <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <button onclick="adminAddUser()"
            class="bg-slate-900 text-white px-4 py-2 rounded-lg font-black text-xs hover:bg-slate-800 transition-all">
            + Add User
        </button>
        <button onclick="adminSaveUsers()"
            class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-xs hover:bg-indigo-700 transition-all shadow-md">
            Save to GitHub
        </button>
    </div>`

    return html
}

function adminUpdateGrant(userIndex, grantIndex, field, value) {
    if (!_adminUsersData?.users[userIndex]?.grants[grantIndex]) return
    _adminUsersData.users[userIndex].grants[grantIndex][field] = value
}

function adminRemoveGrant(userIndex, grantIndex) {
    if (!_adminUsersData?.users[userIndex]) return
    _adminUsersData.users[userIndex].grants.splice(grantIndex, 1)
    renderAdminPanel(buildAdminUsersTable())
}

function adminAddGrant(userIndex) {
    if (!_adminUsersData?.users[userIndex]) return
    const firstProject = (window.PROJECT_REGISTRY || [])[0]?.id || 'default'
    _adminUsersData.users[userIndex].grants.push({
        projectId: firstProject,
        name: (window.PROJECT_REGISTRY || [])[0]?.name || 'Khyaal Engineering',
        mode: 'exec'
    })
    renderAdminPanel(buildAdminUsersTable())
}

function adminAddUser() {
    const id = prompt('Username (alphanumeric, no spaces):')?.trim().toLowerCase()
    if (!id || !/^[a-z0-9_-]+$/.test(id)) { showToast('Invalid username', 'error'); return }
    if (_adminUsersData.users.find(u => u.id === id)) { showToast('Username already exists', 'error'); return }

    const name = prompt('Display name:')?.trim()
    if (!name) return

    const password = prompt('Initial password (will be SHA-256 hashed):')?.trim()
    if (!password) return

    crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)).then(buf => {
        const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
        _adminUsersData.users.push({ id, name, passwordHash: hash, grants: [] })
        renderAdminPanel(buildAdminUsersTable())
        showToast(`User "${name}" added — save to GitHub to persist`, 'info')
    })
}

function adminSetPassword(userIndex) {
    const user = _adminUsersData?.users[userIndex]
    if (!user) return
    const password = prompt(`New password for "${user.name || user.id}":`)?.trim()
    if (!password) return

    crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)).then(buf => {
        const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
        _adminUsersData.users[userIndex].passwordHash = hash
        showToast('Password updated — save to GitHub to persist', 'info')
    })
}

function buildAdminTeamsPanel() {
    return `
    <div style="padding:24px;text-align:center">
      <div style="font-size:13px;color:#64748b;margin-bottom:16px">
        Manage workspaces, users, projects, tracks, and subtracks in the full Admin view.
      </div>
      <button onclick="switchView('admin')" class="btn-primary" style="padding:10px 20px;font-size:13px;font-weight:800">
        🛡️ Open Admin ↗
      </button>
    </div>
  `
}

// ── Project CRUD ──────────────────────────────────────────────────────────

function _syncProjectsToRegistry() {
    if (!_adminUsersData) return
    if (!Array.isArray(_adminUsersData.projects)) _adminUsersData.projects = []
    window.PROJECT_REGISTRY = _adminUsersData.projects.length > 0
        ? _adminUsersData.projects
        : [{ id: 'default', name: 'Khyaal Engineering', filePath: 'data.json' }]
    // Persist registry to localStorage so it survives reload before GitHub save
    try { localStorage.setItem('khyaal_registry', JSON.stringify(window.PROJECT_REGISTRY)) } catch (e) { /* quota */ }
    // Repopulate the track filter select with updated data
    const filterEl = document.getElementById('global-team-filter')
    if (filterEl) filterEl.dataset.populated = ''
    const projEl = document.getElementById('project-filter')
    if (projEl) projEl.dataset.populated = ''
    if (typeof normalizeData === 'function') normalizeData()
    renderTeamSwitcher()
}

window.adminSwitchProject = function(id) {
    if (typeof switchProject === 'function') switchProject(id)
    closeAdminPanel()
}

window.adminWsAddProject = function() {
    const container = document.getElementById('admin-project-form-container');
    if (!container) return;
    container.innerHTML = `
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-2 space-y-2">
            <div class="text-xs font-bold text-slate-700 mb-1">New Project</div>
            <input id="admin-proj-name" type="text" placeholder="Project name (e.g. AI Agent)" class="cms-input text-xs w-full" />
            <input id="admin-proj-id" type="text" placeholder="ID: lowercase-with-dashes" class="cms-input text-xs w-full" />
            <div class="flex gap-2 mt-1">
                <button onclick="adminAddProjectSave()" class="px-3 py-1 bg-emerald-600 text-white text-xs rounded font-bold hover:bg-emerald-700">Add</button>
                <button onclick="adminCancelProjectForm()" class="px-3 py-1 bg-slate-200 text-slate-700 text-xs rounded font-bold hover:bg-slate-300">Cancel</button>
            </div>
        </div>`;
    const nameInput = document.getElementById('admin-proj-name');
    const idInput = document.getElementById('admin-proj-id');
    if (nameInput && idInput) {
        nameInput.addEventListener('input', () => {
            idInput.value = nameInput.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        });
        nameInput.focus();
    }
};

window.adminAddProjectSave = function() {
    const name = document.getElementById('admin-proj-name')?.value.trim();
    const id = document.getElementById('admin-proj-id')?.value.trim().replace(/[^a-z0-9-]/g, '-');
    if (!name || !id) { showToast('Name and ID are required', 'error'); return; }
    if (window.PROJECT_REGISTRY.some(p => p.id === id)) { showToast(`ID "${id}" already exists`, 'error'); return; }
    if (!_adminUsersData) { showToast('Load admin panel first', 'error'); return; }
    if (!Array.isArray(_adminUsersData.projects)) _adminUsersData.projects = [...window.PROJECT_REGISTRY];
    const filePath = `data-${id}.json`;
    _adminUsersData.projects.push({ id, name, filePath });
    _syncProjectsToRegistry();
    scaffoldProjectDataFile(id, name);
    adminCancelProjectForm();
    showToast(`Project "${name}" added — save to GitHub to persist`, 'info');
    renderAdminPanel(buildAdminTeamsPanel());
};

async function scaffoldProjectDataFile(projectId, projectName) {
    const jwt = localStorage.getItem('khyaal_site_auth')
    if (!jwt) return
    const skeleton = {
        metadata: {
            title: projectName + ' Engineering Pulse',
            dateRange: '',
            description: '',
            vision: '',
            modes: { default: 'pm', devDefaultView: 'my-tasks', execDefaultView: 'dashboard' },
            epics: [], okrs: [], releases: [], sprints: [], ceremonyAudits: []
        },
        tracks: [
            {
                id: projectId + '-track-1',
                name: 'Engineering',
                subtracks: [
                    { name: 'Backlog', items: [] }
                ]
            }
        ]
    }
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(skeleton, null, 2))))
    const filePath = `data-${projectId}.json`
    try {
        const res = await fetch(`${LAMBDA_URL}?action=write`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: 'default', filePath, content, message: `chore: scaffold data file for project ${projectId}` })
        })
        if (!res.ok) throw new Error('Scaffold write failed: ' + res.status)
        console.log(`✅ Scaffolded ${filePath}`)
    } catch (err) {
        console.error('❌ scaffoldProjectDataFile:', err)
        showToast(`Warning: could not create data file for ${projectId} — create it manually`, 'error')
    }
}

window.adminEditProject = function(pi) {
    const projects = _adminUsersData?.projects || window.PROJECT_REGISTRY;
    const p = projects[pi];
    if (!p) return;
    const container = document.getElementById('admin-project-form-container');
    if (!container) return;
    container.innerHTML = `
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2 space-y-2">
            <div class="text-xs font-bold text-amber-700 mb-1">Edit Project</div>
            <input id="admin-proj-edit-name" type="text" value="${p.name}" class="cms-input text-xs w-full" />
            <input id="admin-proj-edit-file" type="text" value="${p.filePath || 'data-' + p.id + '.json'}" class="cms-input text-xs w-full" />
            <div class="flex gap-2 mt-1">
                <button onclick="adminEditProjectSave(${pi})" class="px-3 py-1 bg-amber-600 text-white text-xs rounded font-bold hover:bg-amber-700">Save</button>
                <button onclick="adminCancelProjectForm()" class="px-3 py-1 bg-slate-200 text-slate-700 text-xs rounded font-bold hover:bg-slate-300">Cancel</button>
            </div>
        </div>`;
    document.getElementById('admin-proj-edit-name')?.focus();
};

window.adminEditProjectSave = function(pi) {
    const newName = document.getElementById('admin-proj-edit-name')?.value.trim();
    const newFile = document.getElementById('admin-proj-edit-file')?.value.trim();
    if (!newName || !newFile) { showToast('Name and file path are required', 'error'); return; }
    if (!_adminUsersData) { showToast('Load admin panel first', 'error'); return; }
    if (!Array.isArray(_adminUsersData.projects)) _adminUsersData.projects = [...window.PROJECT_REGISTRY];
    const p = _adminUsersData.projects[pi];
    _adminUsersData.projects[pi] = { ...p, name: newName, filePath: newFile };
    _syncProjectsToRegistry();
    adminCancelProjectForm();
    showToast(`Project "${newName}" updated — save to GitHub to persist`, 'info');
    renderAdminPanel(buildAdminTeamsPanel());
};

window.adminCancelProjectForm = function() {
    const container = document.getElementById('admin-project-form-container');
    if (container) container.innerHTML = '';
};

window.adminDeleteProject = function(pi) {
    const projects = _adminUsersData?.projects || window.PROJECT_REGISTRY
    const p = projects[pi]
    if (!p || p.id === 'default') { showToast('Cannot delete the default project', 'error'); return }
    if (!confirm(`Delete project "${p.name}"? This only removes it from the registry — no data files are deleted.`)) return
    if (!_adminUsersData) { showToast('Load admin panel first', 'error'); return }
    if (!Array.isArray(_adminUsersData.projects)) _adminUsersData.projects = [...window.PROJECT_REGISTRY]
    _adminUsersData.projects.splice(pi, 1)
    // Clean up stale grants pointing to the deleted project
    if (Array.isArray(_adminUsersData.users)) {
        _adminUsersData.users.forEach(u => {
            if (Array.isArray(u.grants)) {
                u.grants = u.grants.filter(g => g.projectId !== p.id);
            }
        });
    }
    // Offer to tombstone the data file on GitHub
    if (confirm(`Also mark data file "data-${p.id}.json" as deleted on GitHub?`)) {
        deleteProjectDataFile(p.id);
    }
    _syncProjectsToRegistry()
    showToast(`Project "${p.name}" removed — save to GitHub to persist`, 'info')
    renderAdminPanel(buildAdminTeamsPanel())
}

function renderAdminView() {
  const container = document.getElementById('admin-view')
  if (!container) return
  const mode = getCurrentMode()
  if (mode !== 'pm') {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">Admin access requires PM mode.</div>'
    return
  }

  const usersActive = _adminActiveTab === 'users'
  const structActive = _adminActiveTab === 'structure'

  container.innerHTML = `
    <div style="max-width:960px;margin:0 auto;padding:24px 20px">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-size:20px;font-weight:900;color:#1e293b;margin:0">Admin</h2>
          <p style="font-size:12px;color:#94a3b8;margin:2px 0 0">Manage workspaces, users, and project structure</p>
        </div>
        <button onclick="switchView('okr')" style="padding:8px 16px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;font-weight:700;color:#374151;cursor:pointer">Back to Dashboard</button>
      </div>

      <!-- Sub-tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:0">
        <button onclick="adminSwitchTab('users')" style="padding:8px 18px;font-size:12px;font-weight:800;border:none;cursor:pointer;border-bottom:2px solid ${usersActive ? '#6366f1' : 'transparent'};margin-bottom:-2px;color:${usersActive ? '#6366f1' : '#64748b'};background:transparent">
          Users and Grants
        </button>
        <button onclick="adminSwitchTab('structure')" style="padding:8px 18px;font-size:12px;font-weight:800;border:none;cursor:pointer;border-bottom:2px solid ${structActive ? '#6366f1' : 'transparent'};margin-bottom:-2px;color:${structActive ? '#6366f1' : '#64748b'};background:transparent">
          Structure
        </button>
      </div>

      <!-- Tab content -->
      <div id="admin-tab-content">
        ${usersActive ? renderAdminUsersTab() : renderAdminStructureTab()}
      </div>

    </div>
  `;
}

function adminSwitchTab(tab) {
  _adminActiveTab = tab
  renderAdminView()
}

function renderAdminUsersTab() {
  const registry = window.PROJECT_REGISTRY || { users: [], projects: [] }
  const users = registry.users || []
  const workspaces = registry.projects || []
  const activeWsId = window.ACTIVE_PROJECT_ID || ''

  // Build user rows
  const userRows = users.map((u, ui) => {
    const initials = (u.name || u.id || '?')[0].toUpperCase()
    const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4']
    const avatarColor = colors[ui % colors.length]
    const grants = u.grants || []

    const grantRows = grants.map((g, gi) => {
      const ws = workspaces.find(p => p.id === g.projectId) || { name: g.projectId }
      const roleColors = { pm: '#dcfce7;color:#166534', dev: '#fef3c7;color:#92400e', exec: '#dbeafe;color:#1d4ed8' }
      const roleStyle = roleColors[g.mode] || '#f1f5f9;color:#374151'
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 10px;background:#f8fafc;border-radius:5px;border:1px solid #e2e8f0">
          <div>
            <span style="font-size:11px;font-weight:700;color:#1e293b">${ws.name}</span>
            <span style="font-size:9px;color:#94a3b8;margin-left:4px">/ All Projects</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="padding:2px 7px;background:${roleStyle};border-radius:4px;font-size:10px;font-weight:800">${g.mode}</span>
            <button onclick="adminRevokeGrant('${u.id}', ${gi})" style="padding:2px 6px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:3px;font-size:10px;cursor:pointer">x</button>
          </div>
        </div>`
    }).join('')

    return `
      <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;background:white;overflow:hidden">
        <div style="padding:10px 14px;background:#f8fafc;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:${avatarColor};color:white;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center">${initials}</div>
            <div>
              <div style="font-weight:800;color:#1e293b;font-size:12px">${u.name || u.id}</div>
              <div style="color:#64748b;font-size:10px">${u.email || u.id}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="adminEditUserInline('${u.id}')" style="padding:3px 10px;background:white;border:1px solid #e2e8f0;color:#374151;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Edit</button>
            <button onclick="adminRemoveUser('${u.id}')" style="padding:3px 10px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Remove</button>
          </div>
        </div>
        <div style="padding:8px 14px 10px" id="admin-user-detail-${u.id}">
          <div style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Workspace Access</div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${grantRows || '<div style="font-size:10px;color:#94a3b8">No grants yet</div>'}
            <button onclick="adminShowGrantForm('${u.id}')" style="padding:4px;border:1.5px dashed #c7d2fe;border-radius:5px;color:#6366f1;font-size:10px;font-weight:700;background:transparent;cursor:pointer;margin-top:4px">+ Grant Access to Workspace</button>
            <div id="admin-grant-form-${u.id}" style="display:none"></div>
          </div>
        </div>
      </div>`
  }).join('')

  // Build workspace rows
  const wsRows = workspaces.map(ws => {
    const isActive = ws.id === activeWsId
    return `
      <div style="border:${isActive ? '1.5px solid #c7d2fe' : '1px solid #e2e8f0'};border-radius:8px;margin-bottom:8px;background:${isActive ? '#eef2ff' : 'white'};overflow:hidden">
        <div style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${isActive ? '#6366f1' : '#cbd5e1'}"></span>
            <span style="font-weight:800;color:${isActive ? '#312e81' : '#475569'};font-size:12px">${ws.name}</span>
            ${isActive ? '<span style="background:#6366f1;color:white;border-radius:8px;padding:1px 7px;font-size:9px;font-weight:900">ACTIVE</span>' : ''}
            <span style="font-size:10px;color:#94a3b8">${ws.dataFile || ws.id + '.json'}</span>
          </div>
          <div style="display:flex;gap:6px">
            ${!isActive ? `<button onclick="adminSwitchWorkspace('${ws.id}')" style="padding:3px 10px;background:#f1f5f9;border:1px solid #e2e8f0;color:#374151;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Switch</button>` : ''}
            <button onclick="adminEditWorkspaceInline('${ws.id}')" style="padding:3px 10px;background:white;border:1px solid #e2e8f0;color:#374151;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Edit</button>
            <button onclick="adminDeleteWorkspace('${ws.id}')" style="padding:3px 10px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Delete</button>
          </div>
        </div>
        <div id="admin-ws-form-${ws.id}" style="display:none;padding:10px 14px;border-top:1px solid #e2e8f0;background:#f8fafc"></div>
      </div>`
  }).join('')

  return `
    <!-- Users section -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.07em">Users <span style="background:#e2e8f0;color:#64748b;border-radius:8px;padding:1px 6px;font-size:9px;font-weight:700;margin-left:4px">${users.length}</span></div>
      <button onclick="adminShowAddUserForm()" style="padding:5px 12px;background:#6366f1;color:white;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer">+ Add User</button>
    </div>
    <div id="admin-add-user-form" style="display:none;margin-bottom:12px"></div>
    ${userRows || '<div style="color:#94a3b8;font-size:12px;margin-bottom:12px">No users found.</div>'}

    <!-- Workspaces section -->
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.07em">Workspaces <span style="background:#e2e8f0;color:#64748b;border-radius:8px;padding:1px 6px;font-size:9px;font-weight:700;margin-left:4px">${workspaces.length}</span></div>
        <button onclick="adminShowAddWorkspaceForm()" style="padding:5px 12px;background:#6366f1;color:white;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer">+ Add Workspace</button>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:10px">Each workspace is a top-level data file on GitHub. Workspace changes save to users.json.</div>
      <div id="admin-add-ws-form" style="display:none;margin-bottom:12px"></div>
      ${wsRows || '<div style="color:#94a3b8;font-size:12px">No workspaces found.</div>'}
    </div>

    <!-- Save CTA -->
    <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:16px">
      <button onclick="adminSaveUsersJson()" style="width:100%;padding:10px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:12px;font-weight:900;cursor:pointer">Save Users and Workspaces to GitHub</button>
      <p style="font-size:10px;color:#94a3b8;text-align:center;margin-top:6px">Saves to users.json · Requires PM role</p>
    </div>
  `
}

// ─── Users & Grants CRUD ─────────────────────────────────────────────────────

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function adminShowAddUserForm() {
  const el = document.getElementById('admin-add-user-form')
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="background:#f8fafc;border:1.5px solid #c7d2fe;border-radius:8px;padding:14px">
      <div style="font-size:10px;font-weight:900;color:#4338ca;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Add User</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">User ID (login name)</label>
          <input id="admin-new-user-id" type="text" placeholder="gautam" style="width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:5px;font-size:11px;box-sizing:border-box">
        </div>
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Display Name</label>
          <input id="admin-new-user-name" type="text" placeholder="Gautam Lodhiya" style="width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:5px;font-size:11px;box-sizing:border-box">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Email</label>
          <input id="admin-new-user-email" type="email" placeholder="user@khyaal.com" style="width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:5px;font-size:11px;box-sizing:border-box">
        </div>
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Initial Password</label>
          <input id="admin-new-user-password" type="password" placeholder="password" style="width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:5px;font-size:11px;box-sizing:border-box">
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="adminSaveNewUser()" style="flex:1;padding:7px;background:#6366f1;color:white;border:none;border-radius:5px;font-size:11px;font-weight:800;cursor:pointer">Add User</button>
        <button onclick="document.getElementById('admin-add-user-form').style.display='none'" style="padding:7px 14px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

async function adminSaveNewUser() {
  const id = (document.getElementById('admin-new-user-id')?.value || '').trim()
  const name = (document.getElementById('admin-new-user-name')?.value || '').trim()
  const email = (document.getElementById('admin-new-user-email')?.value || '').trim()
  const password = (document.getElementById('admin-new-user-password')?.value || '').trim()
  if (!id || !name || !password) { showToast('User ID, name, and password are required', 'error'); return }
  const registry = window.PROJECT_REGISTRY || { users: [], projects: [] }
  if ((registry.users || []).find(u => u.id === id)) { showToast('User ID already exists', 'error'); return }
  const passwordHash = await sha256(password)
  const newUser = { id, name, email, passwordHash, grants: [] }
  if (!registry.users) registry.users = []
  registry.users.push(newUser)
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('User added — click Save to persist', 'info')
}

function adminEditUserInline(userId) {
  const registry = window.PROJECT_REGISTRY || { users: [] }
  const user = (registry.users || []).find(u => u.id === userId)
  if (!user) return
  const detailEl = document.getElementById('admin-user-detail-' + userId)
  if (!detailEl) return
  detailEl.innerHTML = `
    <div style="background:#f8fafc;border:1px solid #c7d2fe;border-radius:6px;padding:10px;margin-bottom:8px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Display Name</label>
          <input id="admin-edit-user-name-${userId}" type="text" value="${user.name || ''}" style="width:100%;padding:5px 8px;border:1px solid #c7d2fe;border-radius:4px;font-size:11px;box-sizing:border-box">
        </div>
        <div>
          <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Email</label>
          <input id="admin-edit-user-email-${userId}" type="email" value="${user.email || ''}" style="width:100%;padding:5px 8px;border:1px solid #c7d2fe;border-radius:4px;font-size:11px;box-sizing:border-box">
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="adminSaveUserEdit('${userId}')" style="flex:1;padding:6px;background:#6366f1;color:white;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">Save</button>
        <button onclick="renderAdminView()" style="padding:6px 12px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

function adminSaveUserEdit(userId) {
  const registry = window.PROJECT_REGISTRY || { users: [] }
  const user = (registry.users || []).find(u => u.id === userId)
  if (!user) return
  user.name = (document.getElementById('admin-edit-user-name-' + userId)?.value || '').trim() || user.name
  user.email = (document.getElementById('admin-edit-user-email-' + userId)?.value || '').trim() || user.email
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('User updated — click Save to persist', 'info')
}

function adminRemoveUser(userId) {
  if (!confirm('Remove user "' + userId + '"? This also removes all their grants.')) return
  const registry = window.PROJECT_REGISTRY || { users: [] }
  registry.users = (registry.users || []).filter(u => u.id !== userId)
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('User removed — click Save to persist', 'info')
}

function adminShowGrantForm(userId) {
  const el = document.getElementById('admin-grant-form-' + userId)
  if (!el) return
  const registry = window.PROJECT_REGISTRY || { users: [], projects: [] }
  const workspaces = registry.projects || []
  el.style.display = 'block'
  el.innerHTML = `
    <div style="background:#f8fafc;border:1px solid #c7d2fe;border-radius:5px;padding:8px;margin-top:6px">
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:flex-end">
        <div>
          <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Workspace</label>
          <select id="admin-grant-ws-${userId}" style="width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:10px">
            ${workspaces.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Role</label>
          <select id="admin-grant-role-${userId}" style="width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:10px">
            <option value="pm">pm</option>
            <option value="dev">dev</option>
            <option value="exec">exec</option>
          </select>
        </div>
        <button onclick="adminSaveGrant('${userId}')" style="padding:5px 10px;background:#6366f1;color:white;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">Add</button>
      </div>
      <button onclick="document.getElementById('admin-grant-form-${userId}').style.display='none'" style="margin-top:5px;padding:3px;width:100%;background:transparent;border:none;color:#94a3b8;font-size:9px;cursor:pointer">Cancel</button>
    </div>`
}

function adminSaveGrant(userId) {
  const registry = window.PROJECT_REGISTRY || { users: [] }
  const user = (registry.users || []).find(u => u.id === userId)
  if (!user) return
  const projectId = document.getElementById('admin-grant-ws-' + userId)?.value
  const mode = document.getElementById('admin-grant-role-' + userId)?.value
  if (!projectId || !mode) return
  if (!user.grants) user.grants = []
  if (user.grants.find(g => g.projectId === projectId)) { showToast('Grant already exists for this workspace', 'error'); return }
  user.grants.push({ projectId, mode })
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('Grant added — click Save to persist', 'info')
}

function adminRevokeGrant(userId, grantIdx) {
  if (!confirm('Remove this grant?')) return
  const registry = window.PROJECT_REGISTRY || { users: [] }
  const user = (registry.users || []).find(u => u.id === userId)
  if (!user || !user.grants) return
  user.grants.splice(grantIdx, 1)
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('Grant revoked — click Save to persist', 'info')
}

function adminShowAddWorkspaceForm() {
  const el = document.getElementById('admin-add-ws-form')
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="background:#f8fafc;border:1.5px solid #c7d2fe;border-radius:8px;padding:14px">
      <div style="font-size:10px;font-weight:900;color:#4338ca;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Add Workspace</div>
      <div style="margin-bottom:8px">
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Workspace Name</label>
        <input id="admin-new-ws-name" type="text" placeholder="AI Agent Team" style="width:100%;padding:6px 8px;border:1px solid #c7d2fe;border-radius:5px;font-size:11px;box-sizing:border-box" oninput="adminPreviewWsId(this.value)">
      </div>
      <div style="margin-bottom:10px">
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Data File (auto-generated)</label>
        <input id="admin-new-ws-file" type="text" placeholder="data-ai-agent-team.json" readonly style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:11px;background:#f1f5f9;color:#94a3b8;box-sizing:border-box">
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="adminSaveNewWorkspace()" style="flex:1;padding:7px;background:#6366f1;color:white;border:none;border-radius:5px;font-size:11px;font-weight:800;cursor:pointer">Create Workspace</button>
        <button onclick="document.getElementById('admin-add-ws-form').style.display='none'" style="padding:7px 14px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

function adminPreviewWsId(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const fileEl = document.getElementById('admin-new-ws-file')
  if (fileEl) fileEl.value = slug ? 'data-' + slug + '.json' : ''
}

async function adminSaveNewWorkspace() {
  const name = (document.getElementById('admin-new-ws-name')?.value || '').trim()
  if (!name) { showToast('Workspace name is required', 'error'); return }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const id = slug
  const dataFile = 'data-' + slug + '.json'
  const registry = window.PROJECT_REGISTRY || { users: [], projects: [] }
  if ((registry.projects || []).find(p => p.id === id)) { showToast('Workspace ID already exists', 'error'); return }
  if (!registry.projects) registry.projects = []
  registry.projects.push({ id, name, dataFile })
  window.PROJECT_REGISTRY = registry
  await scaffoldProjectDataFile(id, name)
  renderAdminView()
  showToast('Workspace created — click Save to persist registry', 'info')
}

function adminEditWorkspaceInline(wsId) {
  const el = document.getElementById('admin-ws-form-' + wsId)
  if (!el) return
  const registry = window.PROJECT_REGISTRY || { projects: [] }
  const ws = (registry.projects || []).find(p => p.id === wsId)
  if (!ws) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Workspace Name</label>
        <input id="admin-edit-ws-name-${wsId}" type="text" value="${ws.name}" style="width:100%;padding:5px 8px;border:1px solid #c7d2fe;border-radius:4px;font-size:11px;box-sizing:border-box">
      </div>
      <div>
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Data File</label>
        <input type="text" value="${ws.dataFile || wsId + '.json'}" readonly style="width:100%;padding:5px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:11px;background:#f1f5f9;color:#94a3b8;box-sizing:border-box">
      </div>
    </div>
    <div style="display:flex;gap:6px">
      <button onclick="adminSaveWorkspaceEdit('${wsId}')" style="flex:1;padding:6px;background:#6366f1;color:white;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">Save</button>
      <button onclick="document.getElementById('admin-ws-form-${wsId}').style.display='none'" style="padding:6px 12px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer">Cancel</button>
    </div>`
}

function adminSaveWorkspaceEdit(wsId) {
  const registry = window.PROJECT_REGISTRY || { projects: [] }
  const ws = (registry.projects || []).find(p => p.id === wsId)
  if (!ws) return
  ws.name = (document.getElementById('admin-edit-ws-name-' + wsId)?.value || '').trim() || ws.name
  window.PROJECT_REGISTRY = registry
  renderAdminView()
  showToast('Workspace updated — click Save to persist', 'info')
}

function adminDeleteWorkspace(wsId) {
  const registry = window.PROJECT_REGISTRY || { projects: [] }
  const ws = (registry.projects || []).find(p => p.id === wsId)
  if (!ws) return
  if (wsId === window.ACTIVE_PROJECT_ID) { showToast('Cannot delete the active workspace. Switch first.', 'error'); return }
  if (!confirm('Delete workspace "' + ws.name + '"? This will tombstone its data file on GitHub. This cannot be undone.')) return
  registry.projects = (registry.projects || []).filter(p => p.id !== wsId)
  window.PROJECT_REGISTRY = registry
  deleteProjectDataFile(wsId)
  renderAdminView()
  showToast('Workspace deleted — click Save to persist registry', 'info')
}

function adminSwitchWorkspace(wsId) {
  if (!confirm('Switch to workspace "' + wsId + '"? The page will reload.')) return
  window.ACTIVE_PROJECT_ID = wsId
  localStorage.setItem('khyaal_active_project', wsId)
  location.reload()
}

async function adminSaveUsersJson() {
  const registry = window.PROJECT_REGISTRY
  if (!registry) { showToast('No registry data to save', 'error'); return }
  if (window.isActionLockActive) { showToast('Save already in progress', 'error'); return }
  window.isActionLockActive = true
  try {
    const jwt = localStorage.getItem('khyaal_site_auth')
    const content = btoa(JSON.stringify(registry, null, 2))
    const response = await fetch(LAMBDA_URL + '?action=write', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, sha: window._lastUsersSha || undefined, message: 'chore: update users.json via admin panel', filePath: 'users.json' })
    })
    if (!response.ok) throw new Error('Write failed: ' + response.status)
    const { sha } = await response.json()
    if (sha) window._lastUsersSha = sha
    showToast('Users and Workspaces saved to GitHub', 'success')
  } catch (err) {
    console.error('❌ adminSaveUsersJson:', err)
    showToast('Save failed — check connection and try again', 'error')
  } finally {
    window.isActionLockActive = false
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function renderAdminStructureTab() {
  const projects = (window.UPDATE_DATA?.projects) || []
  const registry = window.PROJECT_REGISTRY || { projects: [] }
  const activeWsId = window.ACTIVE_PROJECT_ID || 'default'
  const activeWsName = (registry.projects || []).find(p => p.id === activeWsId)?.name || activeWsId

  const projectRows = projects.map((proj, pi) => {
    const trackCount = (proj.tracks || []).length
    const itemCount = (proj.tracks || []).reduce((sum, t) => sum + (t.subtracks || []).reduce((s2, st) => s2 + (st.items || []).length, 0), 0)

    const trackRows = (proj.tracks || []).map((track, ti) => {
      const trackId = track.id || String(ti)
      const trackItemCount = (track.subtracks || []).reduce((s, st) => s + (st.items || []).length, 0)
      const colorDot = track.color ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${track.color};margin-right:5px"></span>` : ''

      const subtracks = (track.subtracks || []).map((st, sti) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:#f8fafc;border-radius:4px;border:1px solid #f1f5f9">
          <span style="font-size:10px;color:#475569">+ ${st.name} <span style="color:#94a3b8">(${(st.items || []).length})</span></span>
          <div style="display:flex;gap:4px">
            <button onclick="adminRenameSubtrack('${proj.id}','${trackId}',${sti})" style="padding:2px 6px;background:white;border:1px solid #e2e8f0;color:#475569;border-radius:3px;font-size:9px;cursor:pointer">Rename</button>
            <button onclick="adminDeleteSubtrack('${proj.id}','${trackId}',${sti})" style="padding:2px 6px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:3px;font-size:9px;cursor:pointer">Delete</button>
          </div>
        </div>`).join('')

      return `
        <div style="border:1px solid #e2e8f0;border-radius:6px;margin-bottom:5px;overflow:hidden">
          <div style="padding:7px 10px;display:flex;justify-content:space-between;align-items:center;background:#fafafa">
            <div style="display:flex;align-items:center">${colorDot}<span style="font-weight:700;font-size:11px;color:#1e293b">${track.name}</span><span style="color:#94a3b8;font-size:10px;margin-left:6px">${trackItemCount} items</span></div>
            <div style="display:flex;gap:4px">
              <button onclick="adminEditTrackInline('${proj.id}','${trackId}')" style="padding:2px 8px;background:white;border:1px solid #e2e8f0;color:#374151;border-radius:4px;font-size:9px;font-weight:700;cursor:pointer">Edit</button>
              <button onclick="adminDeleteTrack('${proj.id}','${trackId}')" style="padding:2px 8px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:4px;font-size:9px;font-weight:700;cursor:pointer">Delete</button>
            </div>
          </div>
          <div id="admin-track-form-${proj.id}-${trackId}" style="display:none;padding:8px 10px;border-top:1px solid #f1f5f9;background:#f8fafc"></div>
          <div style="padding:5px 10px 7px 20px;border-top:1px solid #f8fafc">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="font-size:9px;font-weight:900;color:#cbd5e1;text-transform:uppercase;letter-spacing:.06em">Subtracks</div>
              <button onclick="adminAddSubtrack('${proj.id}','${trackId}')" style="padding:1px 7px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:3px;font-size:9px;font-weight:800;cursor:pointer">+ Subtrack</button>
            </div>
            <div id="admin-subtracks-${proj.id}-${trackId}" style="display:flex;flex-direction:column;gap:3px">
              ${subtracks || '<div style="font-size:9px;color:#94a3b8">No subtracks</div>'}
            </div>
            <div id="admin-subtrack-form-${proj.id}-${trackId}" style="display:none;margin-top:5px"></div>
          </div>
        </div>`
    }).join('')

    return `
      <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;background:white">
        <div style="padding:10px 14px;background:#f8fafc;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:900;color:#1e293b;font-size:13px">${proj.name}</span>
            <span style="color:#94a3b8;font-size:10px">${trackCount} tracks · ${itemCount} items</span>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="adminEditProjectInline('${proj.id}')" style="padding:3px 10px;background:white;border:1px solid #e2e8f0;color:#374151;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Edit</button>
            <button onclick="adminDeleteProject('${proj.id}')" style="padding:3px 10px;background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">Delete</button>
          </div>
        </div>
        <div id="admin-project-form-${proj.id}" style="display:none;padding:10px 14px;border-top:1px solid #e2e8f0;background:#f8fafc"></div>
        <div style="padding:8px 14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
            <div style="font-size:10px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Tracks</div>
            <button onclick="adminAddTrack('${proj.id}')" style="padding:2px 9px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:4px;font-size:9px;font-weight:800;cursor:pointer">+ Add Track</button>
          </div>
          <div id="admin-tracks-${proj.id}">
            ${trackRows || '<div style="font-size:10px;color:#94a3b8">No tracks yet</div>'}
          </div>
          <div id="admin-track-add-form-${proj.id}" style="display:none;margin-top:6px"></div>
        </div>
      </div>`
  }).join('')

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <div style="font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.07em">Projects</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px">in workspace: <strong style="color:#4338ca">${activeWsName}</strong></div>
      </div>
      <button onclick="adminAddProject()" style="padding:5px 12px;background:#10b981;color:white;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer">+ Add Project</button>
    </div>
    <div id="admin-add-project-form" style="display:none;margin-bottom:12px"></div>
    ${projectRows || '<div style="color:#94a3b8;font-size:12px">No projects in this workspace.</div>'}
    <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:8px">
      <button onclick="adminSaveStructure()" style="width:100%;padding:10px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:12px;font-weight:900;cursor:pointer">Save Structure to GitHub</button>
      <p style="font-size:10px;color:#94a3b8;text-align:center;margin-top:6px">Saves to data.json</p>
    </div>
  `
}

function adminAddProject() {
  const el = document.getElementById('admin-add-project-form')
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="background:#f8fafc;border:1.5px solid #a7f3d0;border-radius:8px;padding:14px">
      <div style="font-size:10px;font-weight:900;color:#065f46;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Add Project</div>
      <div style="margin-bottom:8px">
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Project Name</label>
        <input id="admin-new-proj-name" type="text" placeholder="Khyaal Platform" style="width:100%;padding:6px 8px;border:1px solid #a7f3d0;border-radius:5px;font-size:11px;box-sizing:border-box">
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="adminSaveNewProject()" style="flex:1;padding:7px;background:#10b981;color:white;border:none;border-radius:5px;font-size:11px;font-weight:800;cursor:pointer">Create Project</button>
        <button onclick="document.getElementById('admin-add-project-form').style.display='none'" style="padding:7px 14px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

function adminSaveNewProject() {
  const name = (document.getElementById('admin-new-proj-name')?.value || '').trim()
  if (!name) { showToast('Project name is required', 'error'); return }
  const id = 'proj-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()
  const newProject = { id, name, tracks: [] }
  if (!window.UPDATE_DATA.projects) window.UPDATE_DATA.projects = []
  window.UPDATE_DATA.projects.push(newProject)
  renderAdminView()
  showToast('Project added — click Save to persist', 'info')
}

function adminEditProjectInline(projectId) {
  const el = document.getElementById('admin-project-form-' + projectId)
  if (!el) return
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  if (!proj) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:flex-end">
      <div>
        <label style="display:block;font-size:10px;font-weight:700;color:#64748b;margin-bottom:3px">Project Name</label>
        <input id="admin-edit-proj-name-${projectId}" type="text" value="${proj.name}" style="width:100%;padding:5px 8px;border:1px solid #c7d2fe;border-radius:4px;font-size:11px;box-sizing:border-box">
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="adminSaveProjectEdit('${projectId}')" style="padding:6px 12px;background:#6366f1;color:white;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">Save</button>
        <button onclick="document.getElementById('admin-project-form-${projectId}').style.display='none'" style="padding:6px 10px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:4px;font-size:10px;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

function adminSaveProjectEdit(projectId) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  if (!proj) return
  proj.name = (document.getElementById('admin-edit-proj-name-' + projectId)?.value || '').trim() || proj.name
  renderAdminView()
  showToast('Project updated — click Save to persist', 'info')
}

function adminDeleteProject(projectId) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  if (!proj) return
  const itemCount = (proj.tracks || []).reduce((sum, t) => sum + (t.subtracks || []).reduce((s2, st) => s2 + (st.items || []).length, 0), 0)
  if (!confirm('Delete project "' + proj.name + '"? This will permanently remove ' + itemCount + ' items, all tracks, and all subtracks within it.')) return
  window.UPDATE_DATA.projects = (window.UPDATE_DATA.projects || []).filter(p => p.id !== projectId)
  renderAdminView()
  showToast('Project deleted — click Save to persist', 'info')
}

function adminAddTrack(projectId) {
  const el = document.getElementById('admin-track-add-form-' + projectId)
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px">
      <div style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:flex-end">
        <div>
          <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Track Name</label>
          <input id="admin-new-track-name-${projectId}" type="text" placeholder="Website" style="width:100%;padding:5px 7px;border:1px solid #bfdbfe;border-radius:4px;font-size:10px;box-sizing:border-box">
        </div>
        <div>
          <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Colour</label>
          <input id="admin-new-track-color-${projectId}" type="color" value="#3b82f6" style="height:28px;width:40px;border:1px solid #bfdbfe;border-radius:4px;padding:1px;cursor:pointer">
        </div>
        <button onclick="adminSaveNewTrack('${projectId}')" style="padding:5px 10px;background:#1d4ed8;color:white;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">Add</button>
      </div>
      <button onclick="document.getElementById('admin-track-add-form-${projectId}').style.display='none'" style="margin-top:5px;padding:3px;width:100%;background:transparent;border:none;color:#94a3b8;font-size:9px;cursor:pointer">Cancel</button>
    </div>`
}

function adminSaveNewTrack(projectId) {
  const name = (document.getElementById('admin-new-track-name-' + projectId)?.value || '').trim()
  if (!name) { showToast('Track name is required', 'error'); return }
  const color = document.getElementById('admin-new-track-color-' + projectId)?.value || '#3b82f6'
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  if (!proj) return
  const id = 't-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
  if (!proj.tracks) proj.tracks = []
  proj.tracks.push({ id, name, color, subtracks: [] })
  renderAdminView()
  showToast('Track added — click Save to persist', 'info')
}

function adminEditTrackInline(projectId, trackId) {
  const el = document.getElementById('admin-track-form-' + projectId + '-' + trackId)
  if (!el) return
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  const track = proj ? (proj.tracks || []).find(t => (t.id || '') === trackId) : null
  if (!track) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:flex-end">
      <div>
        <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Track Name</label>
        <input id="admin-edit-track-name-${projectId}-${trackId}" type="text" value="${track.name}" style="width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:10px;box-sizing:border-box">
      </div>
      <div>
        <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:2px">Colour</label>
        <input id="admin-edit-track-color-${projectId}-${trackId}" type="color" value="${track.color || '#3b82f6'}" style="height:26px;width:36px;border:1px solid #e2e8f0;border-radius:3px;padding:1px;cursor:pointer">
      </div>
      <div style="display:flex;gap:4px">
        <button onclick="adminSaveTrackEdit('${projectId}','${trackId}')" style="padding:4px 9px;background:#6366f1;color:white;border:none;border-radius:3px;font-size:9px;font-weight:800;cursor:pointer">Save</button>
        <button onclick="document.getElementById('admin-track-form-${projectId}-${trackId}').style.display='none'" style="padding:4px 7px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:3px;font-size:9px;cursor:pointer">Cancel</button>
      </div>
    </div>`
}

function adminSaveTrackEdit(projectId, trackId) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  const track = proj ? (proj.tracks || []).find(t => (t.id || '') === trackId) : null
  if (!track) return
  track.name = (document.getElementById('admin-edit-track-name-' + projectId + '-' + trackId)?.value || '').trim() || track.name
  track.color = document.getElementById('admin-edit-track-color-' + projectId + '-' + trackId)?.value || track.color
  renderAdminView()
  showToast('Track updated — click Save to persist', 'info')
}

function adminDeleteTrack(projectId, trackId) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  if (!proj) return
  const track = (proj.tracks || []).find(t => (t.id || '') === trackId)
  if (!track) return
  const itemCount = (track.subtracks || []).reduce((s, st) => s + (st.items || []).length, 0)
  if (!confirm('Delete track "' + track.name + '"? This removes ' + itemCount + ' items and all its subtracks.')) return
  proj.tracks = (proj.tracks || []).filter(t => (t.id || '') !== trackId)
  renderAdminView()
  showToast('Track deleted — click Save to persist', 'info')
}

function adminAddSubtrack(projectId, trackId) {
  const el = document.getElementById('admin-subtrack-form-' + projectId + '-' + trackId)
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `
    <div style="display:flex;gap:5px;align-items:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:6px 8px">
      <input id="admin-new-subtrack-name-${projectId}-${trackId}" type="text" placeholder="e.g. Backlog" style="flex:1;padding:4px 6px;border:1px solid #bbf7d0;border-radius:3px;font-size:10px">
      <button onclick="adminSaveNewSubtrack('${projectId}','${trackId}')" style="padding:4px 8px;background:#166534;color:white;border:none;border-radius:3px;font-size:9px;font-weight:800;cursor:pointer">Add</button>
      <button onclick="document.getElementById('admin-subtrack-form-${projectId}-${trackId}').style.display='none'" style="padding:4px 6px;background:transparent;border:none;color:#94a3b8;font-size:9px;cursor:pointer">x</button>
    </div>`
}

function adminSaveNewSubtrack(projectId, trackId) {
  const name = (document.getElementById('admin-new-subtrack-name-' + projectId + '-' + trackId)?.value || '').trim()
  if (!name) { showToast('Subtrack name is required', 'error'); return }
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  const track = proj ? (proj.tracks || []).find(t => (t.id || '') === trackId) : null
  if (!track) return
  if (!track.subtracks) track.subtracks = []
  track.subtracks.push({ name, items: [] })
  renderAdminView()
  showToast('Subtrack added — click Save to persist', 'info')
}

function adminRenameSubtrack(projectId, trackId, subtractIdx) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  const track = proj ? (proj.tracks || []).find(t => (t.id || '') === trackId) : null
  if (!track) return
  const st = (track.subtracks || [])[subtractIdx]
  if (!st) return
  const newName = prompt('Rename subtrack "' + st.name + '":', st.name)
  if (!newName || !newName.trim()) return
  st.name = newName.trim()
  renderAdminView()
  showToast('Subtrack renamed — click Save to persist', 'info')
}

function adminDeleteSubtrack(projectId, trackId, subtractIdx) {
  const proj = (window.UPDATE_DATA?.projects || []).find(p => p.id === projectId)
  const track = proj ? (proj.tracks || []).find(t => (t.id || '') === trackId) : null
  if (!track) return
  const st = (track.subtracks || [])[subtractIdx]
  if (!st) return
  if (!confirm('Delete subtrack "' + st.name + '"? This removes ' + (st.items || []).length + ' items permanently.')) return
  track.subtracks.splice(subtractIdx, 1)
  renderAdminView()
  showToast('Subtrack deleted — click Save to persist', 'info')
}

async function adminSaveStructure() {
  try {
    await saveToGithub(window.UPDATE_DATA)
    showToast('Structure saved to GitHub', 'success')
    renderDashboard()
  } catch (err) {
    console.error('❌ adminSaveStructure:', err)
  }
}

async function deleteProjectDataFile(projectId) {
    const jwt = localStorage.getItem('khyaal_site_auth');
    if (!jwt) return;
    try {
        const readRes = await fetch(`${LAMBDA_URL}?action=read&projectId=default&filePath=data-${projectId}.json`, {
            headers: { 'Authorization': `Bearer ${jwt}` }
        });
        if (!readRes.ok) {
            showToast(`data-${projectId}.json not found — may already be removed`, 'info');
            return;
        }
        const { sha } = await readRes.json();
        const tombstone = { _deleted: true, _deletedAt: new Date().toISOString(), projectId };
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(tombstone, null, 2))));
        const writeRes = await fetch(`${LAMBDA_URL}?action=write`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: 'default',
                filePath: `data-${projectId}.json`,
                content,
                sha,
                message: `chore: tombstone data file for deleted project ${projectId}`
            })
        });
        if (!writeRes.ok) throw new Error('Write failed: ' + writeRes.status);
        showToast(`data-${projectId}.json marked as deleted on GitHub`, 'success');
    } catch (err) {
        console.error('❌ deleteProjectDataFile:', err);
        showToast(`Could not tombstone data file — delete data-${projectId}.json manually from GitHub`, 'error');
    }
}

async function adminSaveUsers() {
    if (!_adminUsersData) return
    const jwt = localStorage.getItem('khyaal_site_auth')
    if (!jwt) { showToast('Not authenticated', 'error'); return }

    window.isActionLockActive = true
    _setLockWatchdog()
    try {
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(_adminUsersData, null, 2))))
        const res = await fetch(`${LAMBDA_URL}?action=write`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filePath: 'users.json',
                content,
                sha: _adminUsersSha || null,
                message: 'chore: update users and grants via admin panel'
            })
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || `Save failed: ${res.status}`)
        }
        const { sha } = await res.json()
        _adminUsersSha = sha
        showToast('Users saved to GitHub', 'success')
    } catch (err) {
        console.error('❌ [admin] save users:', err)
        showToast(`Save failed: ${err.message}`, 'error')
    } finally {
        _clearLockWatchdog()
        window.isActionLockActive = false
    }
}
