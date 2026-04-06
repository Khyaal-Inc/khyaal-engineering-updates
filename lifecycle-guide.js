// ============================================================
// LIFECYCLE GUIDE SYSTEM — v1.0
// 8-system architecture: Breadcrumb · Info Cards · Quick Actions
// Modal Highlighting · Empty States · Toasts · Gateway Checks
// See: LIFECYCLE_UX_ARCHITECTURE.md for full design spec
// ============================================================
console.log('🧭 lifecycle-guide.js loading...');

// ---- Stage Configuration ----
const STAGES = [
    { id: 'discovery', icon: '💡', label: 'Discover', primaryView: 'ideation', color: '#7c3aed', stageNum: 1 },
    { id: 'vision',    icon: '🎯', label: 'Goals',    primaryView: 'okr',      color: '#4f46e5', stageNum: 2 },
    { id: 'definition',icon: '📐', label: 'Plan',     primaryView: 'backlog',  color: '#2563eb', stageNum: 3 },
    { id: 'delivery',  icon: '🚀', label: 'Build',    primaryView: 'kanban',   color: '#059669', stageNum: 4 },
    { id: 'review',    icon: '🏁', label: 'Ship',     primaryView: 'releases', color: '#d97706', stageNum: 5 },
];

// ---- View → Stage Map ----
const VIEW_LIFECYCLE_MAP = {
    ideation:   { stageId: 'discovery', stageNum: 1 },
    spikes:     { stageId: 'discovery', stageNum: 1 },
    okr:        { stageId: 'vision',    stageNum: 2 },
    epics:      { stageId: 'vision',    stageNum: 2 },
    roadmap:    { stageId: 'definition', stageNum: 3 },
    backlog:    { stageId: 'definition', stageNum: 3 },
    sprint:     { stageId: 'definition', stageNum: 3 },
    capacity:   { stageId: 'definition', stageNum: 3 },
    track:      { stageId: 'delivery',  stageNum: 4 },
    kanban:     { stageId: 'delivery',  stageNum: 4 },
    'my-tasks': { stageId: 'delivery',  stageNum: 4 },
    gantt:      { stageId: 'delivery',  stageNum: 4 },
    dependency: { stageId: 'delivery',  stageNum: 4 },
    status:     { stageId: 'delivery',  stageNum: 4 },
    priority:   { stageId: 'delivery',  stageNum: 4 },
    contributor:{ stageId: 'delivery',  stageNum: 4 },
    releases:   { stageId: 'review',    stageNum: 5 },
    analytics:  { stageId: 'review',    stageNum: 5 },
    dashboard:  { stageId: 'review',    stageNum: 5 },
};

// ---- Stage Completion Checks ----
function _getAllItemsFlat() {
    const data = window.UPDATE_DATA;
    if (!data) return [];
    const items = [];
    (data.tracks || []).forEach(t => t.subtracks.forEach(s => s.items.forEach(i => items.push(i))));
    return items;
}

function checkStageCompletion(stageId) {
    const data = window.UPDATE_DATA;
    if (!data) return false;
    switch (stageId) {
        case 'discovery': return _getAllItemsFlat().some(i => (i.tags || []).some(t => ['idea','spike'].includes(t.toLowerCase())));
        case 'vision':    return (data.metadata?.okrs?.length > 0) && (data.metadata?.epics?.length > 0);
        case 'definition':return (data.metadata?.sprints?.length > 0) && _getAllItemsFlat().some(i => i.sprintId && i.storyPoints);
        case 'delivery':  return _getAllItemsFlat().some(i => i.status === 'done');
        case 'review':    return (data.metadata?.releases || []).some(r => r.status === 'published');
        default:          return false;
    }
}

// ============================================================
// SYSTEM A — Lifecycle Breadcrumb
// ============================================================
function renderLifecycleBreadcrumb(currentView) {
    const container = document.getElementById('mini-pipeline');
    if (!container) return;
    const currentStageNum = VIEW_LIFECYCLE_MAP[currentView]?.stageNum || null;

    container.innerHTML = STAGES.map((stage, idx) => {
        const isActive  = stage.stageNum === currentStageNum;
        const isDone    = checkStageCompletion(stage.id);
        const connector = idx > 0 ? `<span class="lc-connector ${isDone && stage.stageNum <= currentStageNum ? 'lc-done' : ''}">›</span>` : '';
        const cls = `lc-node ${isActive ? 'lc-active' : ''} ${isDone && !isActive ? 'lc-done' : ''}`;
        const style = isActive ? `style="color:${stage.color};border-color:${stage.color};background:${stage.color}14"` : '';
        return `${connector}
            <button onclick="switchView('${stage.primaryView}')" class="${cls}" ${style} title="${stage.label} — click to open">
                <span>${stage.icon}</span>
                <span class="lc-label">${stage.label}</span>
                ${isDone && !isActive ? '<span class="lc-check">✓</span>' : ''}
                ${isActive ? '<span class="lc-pulse"></span>' : ''}
            </button>`;
    }).join('');
}

// ============================================================
// SYSTEM D — Info (ℹ) Cards
// ============================================================
const VIEW_INFO_CARDS = {
    backlog: {
        title: 'Backlog — Task List',
        stage: 'Stage 3 · Plan', stageColor: '#2563eb',
        whatItIs: 'Every task lives here before going into a sprint. Make each one clear enough that anyone could pick it up and know exactly what "done" looks like.',
        cadence: 'Weekly · Monday before sprint planning', duration: '60 min',
        who: [
            { role: 'PM', resp: 'Leads — writes done criteria, sets priority' },
            { role: 'Tech Lead', resp: 'Reviews size estimates, flags risks' },
            { role: 'Developers', resp: 'Clarify acceptance criteria' },
        ],
        agenda: [
            'Find tasks with no strategic goal (Epic) linked — fix these first',
            'Estimate each task\'s size in story points (1=tiny · 13=week of work)',
            'Write what "done" means for each task',
            'Set priority: High / Medium / Low',
            'Set time horizon: Now (1M) · Next (3M) · Later (6M)',
            'Check team capacity before deciding what goes in next sprint',
        ],
        prevView: 'roadmap', prevLabel: '← Roadmap',
        nextView: 'sprint', nextLabel: 'Assign to a sprint →',
        readiness: () => {
            const items = _getAllItemsFlat().filter(i => i.status !== 'done');
            const r = [];
            const noEpic   = items.filter(i => !i.epicId).length;
            const noPoints = items.filter(i => !i.storyPoints).length;
            const noAC     = items.filter(i => !i.acceptanceCriteria?.length).length;
            if (noEpic)   r.push({ t: 'error', m: `${noEpic} tasks have no goal (Epic) linked` });
            if (noPoints) r.push({ t: 'warn',  m: `${noPoints} tasks missing size estimate` });
            if (noAC)     r.push({ t: 'warn',  m: `${noAC} tasks have no "done" criteria written` });
            return r;
        }
    },
    kanban: {
        title: 'Kanban — Daily Work Board',
        stage: 'Stage 4 · Build', stageColor: '#059669',
        whatItIs: 'Your team\'s real-time status board. Cards move left-to-right as work progresses. Keeping it accurate means no one needs to ask "how\'s it going?"',
        cadence: 'Daily · Updated every morning in standup', duration: '5 min upkeep',
        who: [
            { role: 'Developers', resp: 'Move cards to match real current status' },
            { role: 'PM', resp: 'Watches for blockers, resolves them' },
        ],
        agenda: [
            'Move your tasks to where they actually are right now',
            'Mark anything finished as Done ✅',
            'If something\'s blocking you → flag it as Blocked and describe it',
            'PM: check the Blocked column → resolve what you can',
            'Done items → assign to a release so they get counted in OKR progress',
        ],
        prevView: 'sprint', prevLabel: '← Sprint Plan',
        nextView: 'releases', nextLabel: 'Ship done work →',
        readiness: () => {
            const items = _getAllItemsFlat();
            const r = [];
            const blocked  = items.filter(i => i.status === 'blocked' || i.blocker).length;
            const doneNoRel= items.filter(i => i.status === 'done' && !i.releasedIn).length;
            if (blocked)   r.push({ t: 'error', m: `${blocked} tasks are currently blocked` });
            if (doneNoRel) r.push({ t: 'warn',  m: `${doneNoRel} Done tasks not yet shipped to a release` });
            return r;
        }
    },
    sprint: {
        title: 'Sprint — 2-Week Commitment',
        stage: 'Stage 3 · Plan', stageColor: '#2563eb',
        whatItIs: 'A sprint is the team\'s 2-week promise. Create one here, set the goal, then pull ready tasks from the Backlog. Once locked, scope shouldn\'t change.',
        cadence: 'Every 2 weeks · Sprint Planning meeting', duration: '2 hours',
        who: [
            { role: 'PM', resp: 'Decides what goes in, sets the sprint goal' },
            { role: 'Dev Team', resp: 'Estimates, commits, clarifies done criteria' },
        ],
        agenda: [
            'Create a new sprint — name it and set 2-week start/end dates',
            'Create a release placeholder for what this sprint will ship',
            'Pull ready backlog tasks into this sprint',
            'Confirm total story points ≤ team capacity',
            'Dev team review each task and ask questions before locking',
        ],
        prevView: 'backlog', prevLabel: '← Backlog',
        nextView: 'kanban', nextLabel: 'Start building →',
        readiness: () => {
            const sprints = window.UPDATE_DATA?.metadata?.sprints || [];
            const active = sprints.find(s => s.status === 'active');
            if (!active) return [{ t: 'info', m: 'No active sprint — create one to start planning' }];
            const items = _getAllItemsFlat().filter(i => i.sprintId === active.id);
            const r = [];
            const noOwner = items.filter(i => !i.contributors?.length).length;
            if (noOwner) r.push({ t: 'warn', m: `${noOwner} sprint tasks have no developer assigned` });
            return r;
        }
    },
    track: {
        title: 'Track — Team Overview',
        stage: 'Stage 4 · Build', stageColor: '#059669',
        whatItIs: 'The PM\'s daily view of what the whole team is working on, grouped by product area. Use in standups to see the full picture at a glance.',
        cadence: 'Daily · Standup review', duration: '10 min',
        who: [
            { role: 'PM', resp: 'Monitors progress, resolves blockers' },
            { role: 'Tech Lead', resp: 'Checks cross-team dependencies' },
        ],
        agenda: [
            'Scan for anything in Blocked status immediately',
            'Check team pulse score in ribbon — below 70% means trouble',
            'Resolve blockers using the ✅ Resolve button',
            'Look for tasks overdue or approaching deadline',
        ],
        prevView: 'kanban', prevLabel: '← Daily Board',
        nextView: 'kanban', nextLabel: 'Open daily board →',
        readiness: () => {
            const blocked = _getAllItemsFlat().filter(i => i.status === 'blocked' || i.blocker).length;
            return blocked ? [{ t: 'error', m: `${blocked} blocked tasks need PM attention` }] : [];
        }
    },
    okr: {
        title: 'OKRs — Quarterly Goals',
        stage: 'Stage 2 · Set Goals', stageColor: '#4f46e5',
        whatItIs: 'Big quarterly goals. Everything you build should trace back to one of these. Set them at the quarter start, update progress after each release.',
        cadence: 'Quarterly setup · Monthly review · Update after each release', duration: 'Half-day quarterly setup',
        who: [
            { role: 'Founders / Exec', resp: 'Set the objectives and success numbers' },
            { role: 'PM', resp: 'Translates goals into Epics, tracks progress' },
        ],
        agenda: [
            'Define 2–4 objectives for the quarter',
            'For each objective, set 2–3 measurable key results',
            'Link each key result to a strategic initiative (Epic)',
            'After every release, update how much progress was made',
            'Score at quarter end: 0–100%',
        ],
        prevView: 'analytics', prevLabel: '← Analytics',
        nextView: 'epics', nextLabel: 'Create Epics for each goal →',
        readiness: () => {
            const okrs  = window.UPDATE_DATA?.metadata?.okrs || [];
            const epics = window.UPDATE_DATA?.metadata?.epics || [];
            const r = [];
            if (!okrs.length)  r.push({ t: 'info', m: 'No quarterly goals defined yet' });
            const unlinked = epics.filter(e => !e.linkedOKR).length;
            if (unlinked) r.push({ t: 'warn', m: `${unlinked} Epics not linked to any quarterly goal` });
            return r;
        }
    },
    epics: {
        title: 'Epics — Strategic Initiatives',
        stage: 'Stage 2 · Set Goals', stageColor: '#4f46e5',
        whatItIs: 'An Epic is a major initiative — weeks to months of work that delivers a meaningful business outcome. Every task should belong to one.',
        cadence: 'Created quarterly · Health reviewed monthly', duration: '30 min to create · 15 min monthly review',
        who: [
            { role: 'PM', resp: 'Creates and owns each Epic' },
            { role: 'Exec', resp: 'Reviews health and strategic alignment' },
        ],
        agenda: [
            'Create an Epic for each OKR Key Result',
            'Set timeline (start + end dates) — required for Gantt view',
            'Assign a health status: On Track / Caution / At Risk',
            'Link to the OKR it serves',
            'Set risk type if applicable',
            'Monthly: update health status based on actual progress',
        ],
        prevView: 'okr', prevLabel: '← OKRs',
        nextView: 'roadmap', nextLabel: 'Place on roadmap →',
        readiness: () => {
            const epics = window.UPDATE_DATA?.metadata?.epics || [];
            const r = [];
            if (!epics.length) r.push({ t: 'info', m: 'No initiatives (Epics) defined yet' });
            const noOKR   = epics.filter(e => !e.linkedOKR).length;
            const noDates = epics.filter(e => !e.startDate || !e.endDate).length;
            if (noOKR)   r.push({ t: 'warn', m: `${noOKR} Epics have no OKR linked — invisible in goal tracking` });
            if (noDates) r.push({ t: 'warn', m: `${noDates} Epics missing dates — won't appear in Gantt` });
            return r;
        }
    },
    roadmap: {
        title: 'Roadmap — What Ships When',
        stage: 'Stage 3 · Plan', stageColor: '#2563eb',
        whatItIs: 'Sorts your initiatives into time buckets: Now (this month), Next (1–3 months), Later (6+ months). Keeps everyone aligned on priorities.',
        cadence: 'Monthly review + when priorities shift', duration: '90 min monthly',
        who: [
            { role: 'PM', resp: 'Maintains and adjusts horizon assignments' },
            { role: 'Founders / Exec', resp: 'Reviews for strategic alignment' },
        ],
        agenda: [
            'Review what\'s in "Now" — is it actually launching this month?',
            'Move anything that slipped: Now → Next',
            'Promote anything accelerated: Next → Now',
            'Check Gantt for timeline conflicts between Epics',
            'Update release target dates if slipped',
        ],
        prevView: 'epics', prevLabel: '← Epics',
        nextView: 'backlog', nextLabel: 'Break into tasks →',
        readiness: () => {
            const noHorizon = _getAllItemsFlat().filter(i => !i.planningHorizon && i.status !== 'done').length;
            return noHorizon ? [{ t: 'warn', m: `${noHorizon} tasks have no roadmap horizon set` }] : [];
        }
    },
    releases: {
        title: 'Releases — Shipping Finished Work',
        stage: 'Stage 5 · Ship', stageColor: '#d97706',
        whatItIs: 'A release captures a versioned batch of finished work. Create one at sprint planning as a placeholder. Fill it at sprint end via "Ship Items →".',
        cadence: 'Created at Sprint Planning · Published at sprint end', duration: '30 min at sprint end',
        who: [
            { role: 'PM', resp: 'Promotes done items, publishes the release' },
            { role: 'Exec', resp: 'Reviews what shipped vs. OKR goals' },
        ],
        agenda: [
            'Go to active sprint → click "Ship Items →" to move Done tasks here',
            'Verify items landed in the right release',
            'Update quarterly goal (OKR) progress based on what shipped',
            'Set/confirm the publish date',
            'Archive old releases at quarter end',
        ],
        prevView: 'kanban', prevLabel: '← Sprint Board',
        nextView: 'analytics', nextLabel: 'Review velocity →',
        readiness: () => {
            const releases = window.UPDATE_DATA?.metadata?.releases || [];
            const r = [];
            if (!releases.length) return [{ t: 'info', m: 'No releases defined — create one during sprint planning' }];
            const empty = releases.filter(rel => {
                const items = _getAllItemsFlat().filter(i => i.releasedIn === rel.id);
                return items.length === 0 && rel.status !== 'published';
            }).length;
            if (empty) r.push({ t: 'warn', m: `${empty} releases empty — use "Ship Items →" from a sprint` });
            return r;
        }
    },
    analytics: {
        title: 'Analytics — Velocity & Results',
        stage: 'Stage 5 · Ship', stageColor: '#d97706',
        whatItIs: 'How fast is the team going? Velocity trends, sprint burndown, and performance over time. Review here to update your quarterly OKR progress.',
        cadence: 'Monthly + after each sprint ends', duration: '20 min',
        who: [
            { role: 'PM', resp: 'Reviews trends, updates OKR progress' },
            { role: 'Exec', resp: 'Health check — on track for the quarter?' },
        ],
        agenda: [
            'Check velocity trend — stable, rising, or falling?',
            'Review completed vs. planned (how accurate was planning?)',
            'Update quarterly goal (OKR) progress based on what shipped',
            'Note patterns for retrospective',
        ],
        prevView: 'releases', prevLabel: '← Releases',
        nextView: 'okr', nextLabel: 'Update quarterly goals →',
        readiness: () => {
            const noPoints = _getAllItemsFlat().filter(i => i.status === 'done' && !i.storyPoints).length;
            return noPoints ? [{ t: 'warn', m: `${noPoints} Done tasks have no story points — velocity will be incomplete` }] : [];
        }
    },
    ideation: {
        title: 'Ideation — Idea Capture',
        stage: 'Stage 1 · Discover', stageColor: '#7c3aed',
        whatItIs: 'A scratchpad for raw ideas before making any commitment. Tag items with #idea to appear here.',
        cadence: 'Ongoing · Review weekly', duration: '15–30 min',
        who: [
            { role: 'PM', resp: 'Curates and promotes ideas' },
            { role: 'Founders', resp: 'Sources strategic ideas' },
        ],
        agenda: [
            'Capture any new idea — even rough ones',
            'Tag with #idea so it appears in this view',
            'Add a short note on why it matters (business value)',
            'Worth validating technically? Add #spike tag → move to Spikes',
            'Archive ideas no longer relevant',
        ],
        prevView: null, prevLabel: '',
        nextView: 'spikes', nextLabel: 'Validate ideas as spikes →',
        readiness: () => {
            const ideas  = _getAllItemsFlat().filter(i => (i.tags||[]).some(t => t.toLowerCase()==='idea'));
            const noDesc = ideas.filter(i => !i.usecase && !i.note).length;
            return noDesc ? [{ t: 'warn', m: `${noDesc} ideas have no description — add why it matters` }] : [];
        }
    },
    spikes: {
        title: 'Spikes — Technical Validation',
        stage: 'Stage 1 · Discover', stageColor: '#7c3aed',
        whatItIs: 'A spike is a short research task to answer a technical question before committing to build. Tag items with #spike.',
        cadence: 'When a new initiative needs validation', duration: '1–3 days per spike',
        who: [
            { role: 'PM', resp: 'Defines the question the spike must answer' },
            { role: 'Tech Lead', resp: 'Leads spike, documents findings' },
        ],
        agenda: [
            'Define the exact question this spike must answer (acceptance criteria)',
            'Time-box it — max 2–3 days',
            'Document findings in the notes field',
            'Outcome: feasible? → promote to an Epic',
        ],
        prevView: 'ideation', prevLabel: '← Raw Ideas',
        nextView: 'okr', nextLabel: 'Set quarterly goals →',
        readiness: () => {
            const spikes = _getAllItemsFlat().filter(i => (i.tags||[]).some(t => t.toLowerCase()==='spike'));
            const noQ = spikes.filter(i => !i.acceptanceCriteria?.length).length;
            return noQ ? [{ t: 'warn', m: `${noQ} spikes have no question defined — add acceptance criteria` }] : [];
        }
    },
    dashboard: {
        title: 'Executive Dashboard',
        stage: 'Stage 5 · Ship', stageColor: '#d97706',
        whatItIs: 'Strategic health cockpit. OKR progress, Epic health, blockers, release timeline — all at a glance for leadership.',
        cadence: 'Weekly leadership review', duration: '15 min',
        who: [
            { role: 'Exec / Founders', resp: 'Reviews health, flags strategic concerns' },
            { role: 'PM', resp: 'Presents updates, answers questions' },
        ],
        agenda: [
            'Review OKR progress — on track for the quarter?',
            'Check Epic health — any initiatives at risk?',
            'Count active blockers — engineers unblocked?',
            'Review upcoming release date — will it ship on time?',
            'Decide if any re-prioritization is needed',
        ],
        prevView: 'releases', prevLabel: '← Releases',
        nextView: 'okr', nextLabel: 'Update quarterly goals →',
        readiness: () => {
            const blocked = _getAllItemsFlat().filter(i => i.status === 'blocked' || i.blocker).length;
            return blocked ? [{ t: 'error', m: `${blocked} blocked tasks need attention` }] : [];
        }
    },
    capacity: {
        title: 'Capacity — Team Load Planning',
        stage: 'Stage 3 · Plan', stageColor: '#2563eb',
        whatItIs: 'Before committing to a sprint, check if the team has time for it all. Prevents over-committing and burnout.',
        cadence: 'Before every sprint planning', duration: '15 min',
        who: [
            { role: 'PM', resp: 'Reviews capacity before sprint assignment' },
            { role: 'Tech Lead', resp: 'Flags upcoming time constraints' },
        ],
        agenda: [
            'Check total available story points for this sprint window',
            'Account for meetings, PTO, interruptions',
            'Keep sprint total ≤ 80% of team capacity',
            'Identify if anyone is over or under loaded',
        ],
        prevView: 'backlog', prevLabel: '← Task Backlog',
        nextView: 'sprint', nextLabel: 'Plan the sprint →',
        readiness: () => []
    }
};

// ---- Info Card HTML ----
function renderInfoCardHTML(viewId) {
    const info = VIEW_INFO_CARDS[viewId];
    if (!info) return '';
    const issues = info.readiness ? info.readiness() : [];
    const issueIcons = { error: '🔴', warn: '🟡', info: 'ℹ️', ok: '✅' };
    const readinessHTML = issues.length
        ? issues.map(i => `<div class="lgi-issue lgi-${i.t}">${issueIcons[i.t]||'·'} ${i.m}</div>`).join('')
        : `<div class="lgi-issue lgi-ok">✅ Everything looks good in this view</div>`;

    return `
    <div class="lgi-card" id="lgi-${viewId}">
        <div class="lgi-header" style="border-left:4px solid ${info.stageColor}">
            <div>
                <div class="lgi-stage" style="color:${info.stageColor}">${info.stage}</div>
                <div class="lgi-title">${info.title}</div>
            </div>
            <button onclick="toggleInfoCard('${viewId}')" class="lgi-close">✕</button>
        </div>
        <p class="lgi-what">${info.whatItIs}</p>
        <div class="lgi-meta">
            <div class="lgi-meta-item"><span>📅</span><div><div class="lgi-ml">When</div><div class="lgi-mv">${info.cadence}</div></div></div>
            <div class="lgi-meta-item"><span>⏱</span><div><div class="lgi-ml">Duration</div><div class="lgi-mv">${info.duration}</div></div></div>
        </div>
        ${info.who?.length ? `
        <div class="lgi-section">
            <div class="lgi-section-title">👥 Who's Involved</div>
            ${info.who.map(w=>`<div class="lgi-who-row"><span class="lgi-who-role">${w.role}</span><span class="lgi-who-resp">${w.resp}</span></div>`).join('')}
        </div>` : ''}
        <div class="lgi-section">
            <div class="lgi-section-title">✅ Agenda</div>
            ${info.agenda.map((a,i)=>`<div class="lgi-agenda-row"><span class="lgi-step">${i+1}</span><span>${a}</span></div>`).join('')}
        </div>
        <div class="lgi-section">
            <div class="lgi-section-title">📋 Current Status</div>
            ${readinessHTML}
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;">
            ${info.prevView ? `<button onclick="switchView('${info.prevView}');toggleInfoCard('${viewId}')" class="lgi-next-btn" style="flex:1;background:#f1f5f9;color:#64748b;border-color:#e2e8f0;font-size:11px;">${info.prevLabel}</button>` : ''}
            ${info.nextView ? `<button onclick="switchView('${info.nextView}');toggleInfoCard('${viewId}')" class="lgi-next-btn" style="flex:2;">${info.nextLabel}</button>` : ''}
        </div>
    </div>`;
}

function toggleInfoCard(viewId) {
    const card = document.getElementById(`lgi-${viewId}`);
    if (card) card.classList.toggle('lgi-visible');
}

// ---- Info button HTML (embedded in any view ribbon) ----
function renderInfoButton(viewId) {
    if (!VIEW_INFO_CARDS[viewId]) return '';
    return `<button onclick="toggleInfoCard('${viewId}')" class="lgi-btn" title="What is this view? Agenda, who attends, current status check.">ℹ</button>`;
}
function renderInfoCardContainer(viewId) {
    if (!VIEW_INFO_CARDS[viewId]) return '';
    return `<div class="lgi-card-wrap">${renderInfoCardHTML(viewId)}</div>`;
}

// ============================================================
// SYSTEM B — Quick Actions
// ============================================================
const QA_DEFS = {
    'add-to-sprint': {
        label: '🏃 Add to Sprint', type: 'dropdown',
        opts: () => (window.UPDATE_DATA?.metadata?.sprints||[]).filter(s=>s.status!=='completed'),
        optLabel: s => s.name,
        exec: (item, val) => {
            item.sprintId = val;
            if (item.status === 'later') item.status = 'next';
            _qaSave(); showHandoffToast('Added to sprint ✓', 'Open Kanban →', ()=>switchView('kanban'));
        }
    },
    'ship-to-release': {
        label: '📦 Ship to Release', type: 'dropdown',
        opts: () => (window.UPDATE_DATA?.metadata?.releases||[]).filter(r=>r.status!=='published'),
        optLabel: r => r.name,
        exec: (item, val) => {
            item.releasedIn = val;
            _qaSave(); showHandoffToast('Shipped to release ✓', 'View Release →', ()=>switchView('releases'));
        }
    },
    'mark-done': {
        label: '✅ Mark Done', type: 'action',
        exec: (item) => {
            item.status = 'done'; item.updatedAt = new Date().toISOString();
            _qaSave(); showHandoffToast('Done ✓ — ship it to a release so it counts in your metrics', 'Ship →', ()=>switchView('releases'));
        }
    },
    'start-working': {
        label: '▶ Start Working', type: 'action',
        exec: (item) => { item.status = 'now'; item.updatedAt = new Date().toISOString(); _qaSave(); }
    },
    'flag-blocker': {
        label: '🛑 Flag Blocker', type: 'inline-text', placeholder: "What's blocking you?",
        exec: (item, note) => {
            item.status='blocked'; item.blocker=true; item.blockerNote=note;
            item.updatedAt = new Date().toISOString(); _qaSave();
        }
    },
    'resolve-blocker': {
        label: '✅ Resolve', type: 'action',
        exec: (item) => {
            item.blocker=false; item.status='next'; item.blockerNote='';
            item.updatedAt = new Date().toISOString(); _qaSave();
        }
    },
    'link-epic': {
        label: '🔗 Link to Goal', type: 'dropdown',
        opts: () => window.UPDATE_DATA?.metadata?.epics || [],
        optLabel: e => e.name,
        exec: (item, val) => { item.epicId = val; _qaSave(); }
    }
};

function _qaSave() {
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof window.renderCurrentView === 'function') window.renderCurrentView();
}

function getQuickActions(item, viewId) {
    const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm';
    const canEdit = typeof shouldShowManagement === 'function' ? shouldShowManagement() : false;
    if (!canEdit && mode === 'exec') return [];
    const s = item.status || 'later';
    let acts = [];
    if (viewId === 'backlog' || viewId === 'roadmap') {
        acts.push('link-epic');
        acts.push('add-to-sprint');
    } else if (viewId === 'sprint') {
        if (s !== 'done') acts.push('mark-done');
        if (s === 'now')  acts.push('flag-blocker');
        if (s === 'done') acts.push('ship-to-release');
    } else if (viewId === 'kanban') {
        if (s==='next'||s==='later') acts.push('start-working');
        if (s==='now')  { acts.push('mark-done'); acts.push('flag-blocker'); }
        if (s==='done') acts.push('ship-to-release');
        if ((s==='blocked'||item.blocker) && mode==='pm') acts.push('resolve-blocker');
    } else if (viewId === 'track') {
        if (s==='next') acts.push('start-working');
        if (s==='now')  acts.push('mark-done');
        if ((s==='blocked'||item.blocker) && mode==='pm') acts.push('resolve-blocker');
    }
    return acts;
}

function renderQuickActionBar(item, viewId, ti, si, ii) {
    const acts = getQuickActions(item, viewId);
    if (!acts.length) return '';
    const pills = acts.map(id => {
        const def = QA_DEFS[id]; if (!def) return '';
        const uid = `qa-${item.id}-${id}`.replace(/[^a-zA-Z0-9-]/g,'_');
        if (def.type === 'action') {
            return `<button class="qa-pill" onclick="event.stopPropagation();window._qaExec('${id}','${item.id}',null,${ti},${si},${ii})">${def.label}</button>`;
        } else if (def.type === 'dropdown') {
            const opts = def.opts();
            if (!opts.length) return `<span class="qa-pill qa-disabled">${def.label} (none)</span>`;
            return `<select class="qa-select" onclick="event.stopPropagation()" onchange="event.stopPropagation();window._qaExec('${id}','${item.id}',this.value,${ti},${si},${ii});this.value=''">
                <option value="">${def.label} ▾</option>
                ${opts.map(o=>`<option value="${o.id}">${def.optLabel(o)}</option>`).join('')}
            </select>`;
        } else if (def.type === 'inline-text') {
            return `<div class="qa-inline-wrap" id="${uid}" onclick="event.stopPropagation()">
                <button class="qa-pill qa-pill-warn" onclick="event.stopPropagation();document.getElementById('${uid}').classList.toggle('open')">${def.label}</button>
                <div class="qa-inline-input-wrap">
                    <input class="qa-text-input" placeholder="${def.placeholder}"
                        onkeydown="if(event.key==='Enter'){event.stopPropagation();window._qaText('${id}','${item.id}',this.value,${ti},${si},${ii});document.getElementById('${uid}').classList.remove('open')}">
                    <button class="qa-send" onclick="event.stopPropagation();const inp=document.getElementById('${uid}').querySelector('input');window._qaText('${id}','${item.id}',inp.value,${ti},${si},${ii});document.getElementById('${uid}').classList.remove('open')">Send</button>
                </div>
            </div>`;
        }
        return '';
    }).join('');
    return `<div class="qa-bar" onclick="event.stopPropagation()">${pills}</div>`;
}

// Global executors (onclick can't close over variables)
window._qaExec = function(id, itemId, val, ti, si, ii) {
    if (!val && QA_DEFS[id]?.type === 'dropdown') return;
    const item = window.UPDATE_DATA?.tracks?.[ti]?.subtracks?.[si]?.items?.[ii];
    if (!item || item.id !== itemId) {
        // Linear scan fallback
        const found = _getAllItemsFlat().find(x => x.id === itemId);
        if (found) QA_DEFS[id]?.exec(found, val);
        return;
    }
    QA_DEFS[id]?.exec(item, val);
};
window._qaText = function(id, itemId, text, ti, si, ii) {
    if (!text?.trim()) return;
    window._qaExec(id, itemId, text.trim(), ti, si, ii);
};

// ============================================================
// SYSTEM H — Handoff Toasts
// ============================================================
function showHandoffToast(msg, ctaLabel, ctaFn, duration = 5500) {
    const existing = document.querySelectorAll('.lgt');
    if (existing.length >= 2) existing[0].remove();
    const t = document.createElement('div');
    t.className = 'lgt';
    t.innerHTML = `<div class="lgt-msg">${msg}</div>${ctaLabel ? `<button class="lgt-cta">${ctaLabel}</button>` : ''}<button class="lgt-x" onclick="this.parentElement.remove()">×</button>`;
    document.body.appendChild(t);
    if (ctaLabel && ctaFn) t.querySelector('.lgt-cta')?.addEventListener('click', () => { ctaFn(); t.remove(); });
    requestAnimationFrame(() => t.classList.add('lgt-in'));
    setTimeout(() => { t.classList.remove('lgt-in'); setTimeout(()=>t.remove(), 350); }, duration);
}

// ============================================================
// SYSTEM G — Smart Empty States
// ============================================================
const EMPTY_STATES = {
    ideation:  { icon:'💡', h:'No ideas captured yet', b:'This is where you park ideas worth exploring — before committing to build anything.', a:'Capture first idea', fn:"window.openAddItemModal&&openAddItemModal('idea')" },
    spikes:    { icon:'🧪', h:'No technical spikes', b:'A spike is a short research task to prove something is feasible. Tag items with #spike.', a:'Create first spike', fn:"window.openAddItemModal&&openAddItemModal('spike')" },
    okr:       { icon:'🎯', h:'No quarterly goals yet', b:'Define 2–4 big goals for the quarter. Everything else traces back to these.', a:'Set first OKR →', fn:"typeof openOKREdit==='function'&&openOKREdit()" },
    epics:     { icon:'🚀', h:'No initiatives defined', b:'An Epic is a major initiative that delivers a meaningful outcome. Create one per OKR key result.', a:'Create first Epic →', fn:"typeof openEpicEdit==='function'?openEpicEdit():switchView('epics')" },
    backlog:   { icon:'📋', h:'Backlog is empty', b:'Break your Epics into smaller tasks so they can be planned into sprints.', a:'Go to Epics →', fn:"switchView('epics')", a2:'Or add a task directly', fn2:"typeof addItem==='function'&&addItem(0,0)" },
    sprint:    { icon:'🏃', h:'No sprint created yet', b:'A sprint is a 2-week commitment. Create one here, then pull tasks from Backlog.', a:'Create first sprint', fn:"typeof openSprintEdit==='function'&&openSprintEdit()" },
    releases:  { icon:'📦', h:'No releases defined', b:'Create a release during sprint planning, fill it at sprint end via "Ship Items →".', a:'Create release', fn:"typeof openReleaseEdit==='function'&&openReleaseEdit()", a2:'Go to Sprint to ship →', fn2:"switchView('sprint')" },
    kanban:    { icon:'📋', h:'No tasks on the board', b:'Assign tasks to an active sprint from the Backlog — they\'ll appear here.', a:'Go to Backlog →', fn:"switchView('backlog')" },
};

function renderSmartEmptyState(viewId) {
    const s = EMPTY_STATES[viewId];
    if (!s) return `<div class="ses-fallback">Nothing here yet.</div>`;
    return `<div class="ses">
        <div class="ses-icon">${s.icon}</div>
        <h3 class="ses-h">${s.h}</h3>
        <p class="ses-b">${s.b}</p>
        <div class="ses-actions">
            ${s.a ? `<button class="ses-btn-primary" onclick="${s.fn}">${s.a}</button>` : ''}
            ${s.a2 ? `<button class="ses-btn-secondary" onclick="${s.fn2}">${s.a2}</button>` : ''}
        </div>
    </div>`;
}

// ============================================================
// SYSTEM I — Lifecycle Rail (7-phase dot indicator per item)
// ============================================================
function detectItemPhase(item) {
    if (!item) return 0
    if (item.status === 'done' && item.releasedIn) return 7       // Shipped
    if (item.status === 'done') return 6                           // Done, unshipped
    if (['now','qa','review'].includes(item.status)) return 5      // Execution
    if (item.sprintId && item.contributors?.length) return 4       // Sprint committed
    if (item.sprintId || (item.storyPoints && item.acceptanceCriteria?.length)) return 3  // Groomed
    if (item.epicId || item.planningHorizon) return 2              // Planned
    if (item.text) return 1                                        // Captured
    return 0
}

function renderLifecycleRail(item) {
    const phase = detectItemPhase(item)
    const phases = ['💡','🎯','📐','📋','🚀','✅','📦']
    const labels = ['Idea','Plan','Groom','Sprint','Build','Done','Ship']
    return `<div class="lrail" title="Phase ${phase}/7: ${labels[Math.max(0,phase-1)] || 'Idea'}">
        ${phases.map((dot, i) => `<span class="lrail-dot ${i < phase ? 'lrail-done' : ''} ${i === phase-1 ? 'lrail-active' : ''}"></span>`).join('')}
    </div>`
}
window.renderLifecycleRail = renderLifecycleRail
window.detectItemPhase = detectItemPhase

// ============================================================
// SYSTEM J — Enrichment / Readiness Score (per item badge)
// ============================================================
function getItemScore(item) {
    const checks = [
        !!item.text,
        !!item.usecase,
        !!item.epicId,
        !!item.storyPoints,
        !!(item.acceptanceCriteria?.length),
        !!(item.contributors?.length),
        !!item.sprintId,
        !!item.due,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function getReadinessBadge(item) {
    const score = getItemScore(item)
    const cls = score >= 80 ? 'ready' : score >= 50 ? 'partial' : 'low'
    const label = score >= 80 ? '✓ Ready' : score >= 50 ? `${score}%` : `${score}%`
    return `<span class="rbadge rbadge-${cls}" title="Item completeness: ${score}%">${label}</span>`
}
window.getItemScore = getItemScore
window.getReadinessBadge = getReadinessBadge

// ============================================================
// SYSTEM F — Gateway Checks (validate before quick actions)
// ============================================================
function runGatewayCheck(actionId, item) {
    if (actionId === 'add-to-sprint') {
        if (!item.storyPoints) return { blocked: true, msg: 'Add a story point estimate before assigning to sprint — helps the team know how much work this is.' }
        if (!item.epicId) return { blocked: false, warn: 'This task has no linked Goal (Epic). Consider linking it so it counts toward OKR progress.' }
    }
    if (actionId === 'mark-done') {
        if (!item.acceptanceCriteria?.length) return { blocked: false, warn: '"Done" means the acceptance criteria pass. None are written — are you sure?' }
    }
    if (actionId === 'ship-to-release') {
        if (item.status !== 'done') return { blocked: true, msg: 'Mark this task as Done before shipping it to a release.' }
    }
    return { blocked: false }
}
window.runGatewayCheck = runGatewayCheck

// ============================================================
// SYSTEM K — Cross-View Jump Links (view-in hover links)
// ============================================================
window._pendingHighlightItemId = null

function renderJumpLinks(item, currentViewId) {
    const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm'
    const views = []
    if (currentViewId !== 'kanban' && item.sprintId) views.push({ v: 'kanban', label: 'Kanban' })
    if (currentViewId !== 'sprint' && item.sprintId) views.push({ v: 'sprint', label: 'Sprint' })
    if (currentViewId !== 'track') views.push({ v: 'track', label: 'Track' })
    if (currentViewId !== 'backlog' && mode === 'pm') views.push({ v: 'backlog', label: 'Backlog' })
    if (!views.length) return ''
    return `<div class="jump-links">${views.slice(0,2).map(j =>
        `<button class="jump-link" onclick="event.stopPropagation();window._pendingHighlightItemId='${item.id}';switchView('${j.v}')" title="View in ${j.label}">↗ ${j.label}</button>`
    ).join('')}</div>`
}
window.renderJumpLinks = renderJumpLinks

// Wire highlight after switchView re-renders
const _origSwitchForHighlight = window.switchView
if (typeof _origSwitchForHighlight === 'function') {
    window.switchView = function(viewId) {
        _origSwitchForHighlight(viewId)
        if (window._pendingHighlightItemId) {
            setTimeout(() => {
                const id = window._pendingHighlightItemId
                window._pendingHighlightItemId = null
                const els = document.querySelectorAll(`[data-item-id="${id}"]`)
                els.forEach(el => {
                    el.classList.add('item-highlight-pulse')
                    setTimeout(() => el.classList.remove('item-highlight-pulse'), 2200)
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                })
            }, 300)
        }
    }
}

// ============================================================
// SYSTEM L — Cadence Nudge Banner
// ============================================================
const CADENCE_SCHEDULE = [
    { day: 1, type: 'standup',  label: 'Monday Standup', view: 'track',   icon: '☀️', msg: 'Start the week — check blockers, confirm sprint scope is on track.' },
    { day: 1, type: 'weekly',   label: 'Weekly Review',  view: 'sprint',  icon: '📋', msg: 'Review sprint progress and update item statuses.' },
    { day: 3, type: 'standup',  label: 'Mid-Week Standup', view: 'kanban', icon: '🔄', msg: 'Mid-week check — move blocked items, re-prioritize if needed.' },
    { day: 3, type: 'grooming', label: 'Backlog Grooming', view: 'backlog', icon: '✂️', msg: "Groom next sprint's tasks — estimate, link epics, write done criteria." },
    { day: 5, type: 'standup',  label: 'Friday Standup',  view: 'track',  icon: '🏁', msg: 'End-of-week — ship done items to releases, clear blockers.' },
    { day: 5, type: 'release',  label: 'Release Day',     view: 'releases', icon: '📦', msg: 'Ship done items to the release, update OKR progress.' },
]

function getCadenceNudge() {
    const day = new Date().getDay() // 0=Sun, 1=Mon...5=Fri, 6=Sat
    const nudges = CADENCE_SCHEDULE.filter(n => n.day === day)
    if (!nudges.length) return null
    return nudges[0]
}

function renderCadenceNudgeBanner() {
    const bar = document.getElementById('cadence-nudge-bar')
    if (!bar) return
    const nudge = getCadenceNudge()
    if (!nudge) { bar.style.display = 'none'; return }
    const dismissed = localStorage.getItem(`nudge_dismissed_${nudge.type}_${new Date().toDateString()}`)
    if (dismissed) { bar.style.display = 'none'; return }
    bar.style.display = 'flex'
    bar.innerHTML = `
        <span class="cnb-icon">${nudge.icon}</span>
        <div class="cnb-body">
            <span class="cnb-label">${nudge.label}</span>
            <span class="cnb-msg">${nudge.msg}</span>
        </div>
        <button class="cnb-cta" onclick="switchView('${nudge.view}');document.getElementById('cadence-nudge-bar').style.display='none'">${nudge.label.split(' ')[0]} View →</button>
        <button class="cnb-dismiss" onclick="localStorage.setItem('nudge_dismissed_${nudge.type}_'+new Date().toDateString(),'1');document.getElementById('cadence-nudge-bar').style.display='none'">✕</button>
    `
}
window.renderCadenceNudgeBanner = renderCadenceNudgeBanner

// ============================================================
// SYSTEM N — Sprint Health HUD (command strip mini pill)
// ============================================================
function renderSprintHUD() {
    const slot = document.getElementById('sprint-hud-mount')
    if (!slot) return
    const sprints = window.UPDATE_DATA?.metadata?.sprints || []
    const active = sprints.find(s => s.status === 'active') || sprints[sprints.length - 1]
    if (!active) { slot.innerHTML = ''; return }

    const items = _getAllItemsFlat().filter(i => i.sprintId === active.id)
    if (!items.length) { slot.innerHTML = ''; return }

    const done    = items.filter(i => i.status === 'done').length
    const blocked = items.filter(i => i.status === 'blocked' || i.blocker).length
    const total   = items.length
    const pct     = Math.round((done / total) * 100)
    const healthCls = blocked > 0 ? 'hud-warn' : pct >= 70 ? 'hud-ok' : 'hud-neutral'

    slot.innerHTML = `
        <button class="sprint-hud ${healthCls}" onclick="switchView('sprint')" title="Sprint: ${active.name} — ${pct}% done${blocked ? ', ' + blocked + ' blocked' : ''}">
            <span class="hud-name">${active.name}</span>
            <div class="hud-bar"><div class="hud-fill" style="width:${pct}%"></div></div>
            <span class="hud-pct">${pct}%</span>
            ${blocked ? `<span class="hud-block">🛑${blocked}</span>` : ''}
        </button>
    `
}
window.renderSprintHUD = renderSprintHUD

// ============================================================
// Extended INFO CARDS — OKR, Epics, Roadmap, My Tasks, etc.
// ============================================================
Object.assign(VIEW_INFO_CARDS, {
    okr: {
        title: 'OKRs — Quarterly Goals',
        stage: 'Stage 2 · Set Goals', stageColor: '#4f46e5',
        whatItIs: 'OKRs are your team\'s quarterly promises. One Objective (a bold direction) with 2–4 Key Results (measurable milestones). Everything you build should trace back to a Key Result.',
        cadence: 'Quarterly · Q-planning meeting', duration: '3 hours',
        who: [
            { role: 'Leadership', resp: 'Sets the Objective — the direction' },
            { role: 'PM', resp: 'Drafts Key Results with measurable targets' },
            { role: 'Tech Lead', resp: 'Sanity-checks feasibility of KR targets' },
        ],
        agenda: [
            'Review last quarter\'s OKRs — what was achieved?',
            'Set 1 bold Objective for this quarter',
            'Write 2–4 Key Results — each must be a number you can measure',
            'Link existing Epics to Key Results',
            'Create Epics for Key Results that have no work yet',
        ],
        nextView: 'epics', nextLabel: 'Create Epics for each KR →',
        readiness: () => {
            const okrs = window.UPDATE_DATA?.metadata?.okrs || []
            const r = []
            if (!okrs.length) r.push({ t: 'error', m: 'No OKRs defined — set your quarterly direction first' })
            else {
                const noKR = okrs.filter(o => !o.keyResults?.length).length
                if (noKR) r.push({ t: 'warn', m: `${noKR} OKRs have no Key Results written` })
            }
            return r
        }
    },
    epics: {
        title: 'Epics — Major Initiatives',
        stage: 'Stage 2 · Set Goals', stageColor: '#4f46e5',
        whatItIs: 'An Epic is a major chunk of work — big enough to span multiple sprints, small enough that you can describe it in one sentence. Each Epic should deliver one meaningful outcome for your users.',
        cadence: 'Monthly · Quarterly planning + monthly review', duration: '90 min',
        who: [
            { role: 'PM', resp: 'Owns each Epic — defines scope and success metric' },
            { role: 'Tech Lead', resp: 'Estimates effort, flags technical risks' },
        ],
        agenda: [
            'Create one Epic per OKR Key Result',
            'Write a one-line impact statement: what user problem does this solve?',
            'Set a quantitative success metric (a number)',
            'Assign a risk type: execution / market / technical',
            'Break the Epic into tasks in the Backlog',
        ],
        prevView: 'epics', prevLabel: '← Epics',
        nextView: 'backlog', nextLabel: 'Break into tasks →',
        readiness: () => {
            const epics = window.UPDATE_DATA?.metadata?.epics || []
            const r = []
            if (!epics.length) r.push({ t: 'error', m: 'No Epics defined — create one per OKR Key Result' })
            else {
                const noMetric = epics.filter(e => !e.successMetric).length
                if (noMetric) r.push({ t: 'warn', m: `${noMetric} Epics missing a measurable success metric` })
            }
            return r
        }
    },
    roadmap: {
        title: 'Roadmap — Strategic Timeline',
        stage: 'Stage 3 · Plan', stageColor: '#2563eb',
        whatItIs: 'The roadmap is your promise to stakeholders about what ships when. It translates Epics into time-horizon buckets: Now (1M), Next (3M), Later (6M). Don\'t fill it with tasks — only Epics and major milestones.',
        cadence: 'Monthly · Roadmap review', duration: '60 min',
        who: [
            { role: 'PM', resp: 'Owns the roadmap — decides horizon assignment' },
            { role: 'Leadership', resp: 'Challenges trade-offs, approves shifts' },
        ],
        agenda: [
            'Review what\'s in Now — is it still the right priority?',
            'Move completed Epics to the archive',
            'Promote items from Next → Now if capacity allows',
            'Add new Epics from OKR planning',
            'Flag any items at risk of slipping horizon',
        ],
        nextView: 'backlog', nextLabel: 'Plan sprints →',
        readiness: () => []
    },
    ideation: {
        title: 'Ideation — Capture Ideas',
        stage: 'Stage 1 · Discover', stageColor: '#7c3aed',
        whatItIs: 'Ideas before they\'re commitments. Park anything worth exploring here — user feedback, market signals, internal requests, or intuitions. Don\'t filter too early; capture first, evaluate later.',
        cadence: 'Ongoing · Weekly ideation session (optional)', duration: '30 min',
        who: [
            { role: 'Anyone', resp: 'Can submit ideas' },
            { role: 'PM', resp: 'Evaluates, tags, and promotes ideas to Epics or Spikes' },
        ],
        agenda: [
            'Tag all ideas: #idea, #user-feedback, #tech-debt, #spike, etc.',
            'Write one sentence on why this idea matters (Impact field)',
            'Review ideas older than 30 days — promote or archive',
            'Promote validated ideas to Epics in Goals view',
        ],
        nextView: 'okr', nextLabel: 'Set goals →',
        readiness: () => []
    },
    'my-tasks': {
        title: 'My Tasks — Daily Focus',
        stage: 'Stage 4 · Build', stageColor: '#059669',
        whatItIs: 'Your personal work queue — filtered to only your assigned items. Start here every morning. Clear your blockers first, then focus on Now items. Done at EOD → ship to release.',
        cadence: 'Daily · Morning planning', duration: '5 min',
        who: [{ role: 'You', resp: 'Own and update your tasks daily' }],
        agenda: [
            'Fix any Blocked items first — paste the blocker note, ping the PM',
            'Focus on Now items — these are the sprint commitment',
            'Update status on anything you finished yesterday',
            'If a task will slip — flag it now, not on demo day',
        ],
        nextView: 'kanban', nextLabel: 'See team board →',
        readiness: () => {
            const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null
            if (!user) return []
            const myItems = _getAllItemsFlat().filter(i => (i.contributors||[]).includes(user))
            const blocked = myItems.filter(i => i.status === 'blocked' || i.blocker).length
            return blocked ? [{ t: 'error', m: `${blocked} of your tasks are blocked — resolve before standup` }] : []
        }
    },
    analytics: {
        title: 'Analytics — Velocity & Health',
        stage: 'Stage 5 · Ship', stageColor: '#d97706',
        whatItIs: 'Sprint velocity, burndown, and team health metrics. Use this in retrospectives to understand if the team is sustainable and improving over time.',
        cadence: 'Bi-weekly · Retrospective', duration: '60 min',
        who: [
            { role: 'PM', resp: 'Presents velocity trend, identifies patterns' },
            { role: 'Team', resp: 'Reflects on what slowed them down' },
        ],
        agenda: [
            'Review velocity: are points delivered per sprint increasing?',
            'Check blockers trend — did we resolve faster this sprint?',
            'Identify top 1 process improvement for next sprint',
            'Celebrate Done items shipped to releases',
        ],
        nextView: 'releases', nextLabel: 'Review releases →',
        readiness: () => []
    },
    dashboard: {
        title: 'Executive Dashboard — KPI Summary',
        stage: 'Stage 5 · Ship', stageColor: '#d97706',
        whatItIs: 'High-level health summary for leadership. OKR progress, Epic completion, sprint status, and top risks — in one view. No task-level detail.',
        cadence: 'Monthly · Leadership review', duration: '30 min',
        who: [
            { role: 'PM', resp: 'Prepares summary, highlights risks' },
            { role: 'Leadership', resp: 'Reviews progress, makes priority calls' },
        ],
        agenda: [
            'Review OKR progress: on track, at risk, or behind?',
            'Epic completion rate vs. roadmap target',
            'Any blockers that need leadership intervention?',
            'Confirm next quarter planning is scheduled',
        ],
        nextView: 'okr', nextLabel: 'Review OKRs →',
        readiness: () => []
    },
})

// Extended EMPTY_STATES
Object.assign(EMPTY_STATES, {
    okr:      { icon:'🎯', h:'No quarterly goals yet', b:'Define 2–4 OKRs: one bold Objective + measurable Key Results. Everything the team builds should trace back to these.', a:'Create first OKR →', fn:"typeof openOKREdit==='function'?openOKREdit():null" },
    'my-tasks':{ icon:'👤', h:'No tasks assigned to you', b:'Tasks assigned to you in any sprint will appear here. Ask your PM to assign items, or check the Kanban board.', a:'View Kanban →', fn:"switchView('kanban')" },
    epics:    { icon:'🚀', h:'No Epics defined', b:'Create one Epic per OKR Key Result. An Epic is a major initiative that spans multiple sprints.', a:'Create first Epic →', fn:"typeof openEpicEdit==='function'?openEpicEdit():null" },
    roadmap:  { icon:'🗺️', h:'No roadmap items', b:'Add Epics to time-horizon buckets: Now (1M) / Next (3M) / Later (6M). This is your strategic promise to stakeholders.', a:'Go to Epics →', fn:"switchView('epics')" },
    ideation: { icon:'💡', h:'No ideas captured yet', b:'This is where you park ideas before committing to build. Tag them #idea or #spike and explain why they matter.', a:'Capture first idea', fn:"typeof addItem==='function'?addItem(0,0,{tags:['idea']}):null" },
})

// ============================================================
// Extended Quick Actions (Appendix C additions)
// ============================================================
Object.assign(QA_DEFS, {
    'clone-item': {
        label: '📋 Clone to Next Sprint', type: 'action',
        exec: (item) => {
            const sprints = window.UPDATE_DATA?.metadata?.sprints || []
            const nextSprint = sprints.find(s => s.status !== 'completed' && s.id !== item.sprintId)
            if (!nextSprint) { showHandoffToast('No other sprint found — create one first', 'Add Sprint →', ()=>switchView('sprint')); return }
            const clone = { ...item, id: `task-${Date.now()}`, status: 'next', sprintId: nextSprint.id, updatedAt: new Date().toISOString() }
            // Find original item location and push clone
            let placed = false
            ;(window.UPDATE_DATA?.tracks||[]).forEach(t => t.subtracks.forEach(s => {
                if (!placed && s.items.some(i => i.id === item.id)) { s.items.push(clone); placed = true }
            }))
            if (placed) { _qaSave(); showHandoffToast(`Cloned to ${nextSprint.name} ✓`, 'View Sprint →', ()=>switchView('sprint')) }
        }
    },
    'set-due-date': {
        label: '📅 Set Due Date', type: 'inline-text', placeholder: 'YYYY-MM-DD (e.g. 2025-06-30)',
        exec: (item, val) => {
            if (!val.match(/^\d{4}-\d{2}-\d{2}$/)) { showHandoffToast('Use format YYYY-MM-DD', null, null, 2500); return }
            item.due = val; item.updatedAt = new Date().toISOString()
            _qaSave(); showHandoffToast(`Due date set: ${val} ✓`, null, null, 2500)
        }
    },
    'update-kr-progress': {
        label: '🎯 Update OKR Progress', type: 'action',
        exec: (item) => {
            const linkedEpic = item.epicId ? (window.UPDATE_DATA?.metadata?.epics || []).find(e => e.id === item.epicId) : null;
            if (linkedEpic && linkedEpic.linkedOKR) {
                const okrIndex = (window.UPDATE_DATA?.metadata?.okrs || []).findIndex(o => o.id === linkedEpic.linkedOKR);
                if (okrIndex >= 0 && typeof openOKREdit === 'function') {
                    openOKREdit(okrIndex);
                    return;
                }
            }
            showHandoffToast('Not linked to an OKR.', 'Strategy Hub →', () => switchView('okr'), 4000);
        }
    },
    'create-spike': {
        label: '🧪 Create Spike', type: 'inline-text', placeholder: 'What do you need to research?',
        exec: (item, question) => {
            if (!question?.trim()) return
            const spike = { id: `task-${Date.now()}`, text: `[Spike] ${question}`, tags: ['spike'], status: 'next',
                            note: `Linked from: ${item.text}`, spikeLinkedFrom: item.id, updatedAt: new Date().toISOString() }
            let placed = false
            ;(window.UPDATE_DATA?.tracks||[]).forEach(t => t.subtracks.forEach(s => {
                if (!placed && s.items.some(i => i.id === item.id)) { s.items.push(spike); placed = true }
            }))
            if (placed) { _qaSave(); showHandoffToast('Spike created ✓', 'View Ideation →', ()=>switchView('spikes')) }
        }
    },
    'promote-to-roadmap': {
        label: '🗺️ Add to Roadmap', type: 'dropdown',
        opts: () => [{ id:'1M', name:'Now (1 Month)' }, { id:'3M', name:'Next (3 Months)' }, { id:'6M', name:'Later (6 Months)' }],
        optLabel: h => h.name,
        exec: (item, val) => {
            item.planningHorizon = val; item.updatedAt = new Date().toISOString()
            _qaSave(); showHandoffToast('Added to roadmap ✓', 'View Roadmap →', ()=>switchView('roadmap'))
        }
    },
})

// Wire gateway checks into _qaExec
const _origQaExec = window._qaExec
window._qaExec = function(id, itemId, val, ti, si, ii) {
    if (!val && QA_DEFS[id]?.type === 'dropdown') return
    let item = window.UPDATE_DATA?.tracks?.[ti]?.subtracks?.[si]?.items?.[ii]
    if (!item || item.id !== itemId) item = _getAllItemsFlat().find(x => x.id === itemId)
    if (!item) return
    const check = runGatewayCheck(id, item)
    if (check.blocked) { showHandoffToast(`⚠️ ${check.msg}`, null, null, 5000); return }
    if (check.warn) {
        if (!confirm(check.warn + '\n\nContinue anyway?')) return
    }
    QA_DEFS[id]?.exec(item, val)
}

// Extend getQuickActions with new actions
const _origGetQA = getQuickActions
window._getQuickActionsExtended = function(item, viewId) {
    const acts = _origGetQA(item, viewId)
    const mode = typeof getCurrentMode === 'function' ? getCurrentMode() : 'pm'
    const s = item.status || 'later'
    // Cross-view actions (PM only)
    if (mode === 'pm' && typeof shouldShowManagement === 'function' && shouldShowManagement()) {
        if (!item.planningHorizon && (viewId === 'backlog' || viewId === 'ideation')) acts.push('promote-to-roadmap')
        if (!item.due) acts.push('set-due-date')
        if (viewId === 'sprint' && s !== 'done') acts.push('clone-item')
        if (viewId === 'ideation' || viewId === 'spikes') acts.push('create-spike')
        if (item.epicId) acts.push('update-kr-progress')
    }
    return acts
}

// ============================================================
// SYSTEM C — Stage-Aware Modal Field Hints
// ============================================================
const STAGE_REQUIRED_FIELDS = {
    ideation:   { fields: ['text','tags','usecase'],                           hint: 'Capturing this idea — add a title, tag it #idea, and explain why it matters.' },
    spikes:     { fields: ['text','tags','note','acceptanceCriteria'],         hint: 'Running a spike — define the question it answers and document findings in the note.' },
    vision:     { fields: ['text','usecase','epicId','successMetric'],         hint: 'Setting a goal — link it to an Epic and define what measurable success looks like.' },
    epics:      { fields: ['text','usecase','startDate','due','riskType'],     hint: 'Creating an initiative — it needs a timeline and a risk type.' },
    roadmap:    { fields: ['planningHorizon','epicId','startDate','due'],      hint: 'Planning this initiative — set which time bucket it belongs to and add dates for the timeline.' },
    backlog:    { fields: ['epicId','storyPoints','priority','acceptanceCriteria','planningHorizon'], hint: 'Grooming — before sprint planning, every task needs a goal, size estimate, and done criteria.' },
    sprint:     { fields: ['sprintId','contributors','status','acceptanceCriteria'], hint: 'Committing to sprint — assign an owner and confirm done criteria is clear.' },
    delivery:   { fields: ['status','contributors'],                           hint: 'Executing — keep status current and flag blockers immediately.' },
    review:     { fields: ['releasedIn','status'],                             hint: 'Shipping — assign to a release so it shows up in your metrics and OKR progress.' },
};

function getModalStageFromView(viewId) {
    const m = { ideation:'ideation', spikes:'spikes', okr:'vision', epics:'epics', roadmap:'roadmap',
                backlog:'backlog', sprint:'sprint', capacity:'sprint', track:'delivery', kanban:'delivery',
                'my-tasks':'delivery', status:'delivery', priority:'delivery', contributor:'delivery',
                releases:'review', analytics:'review', dashboard:'review' };
    return m[viewId] || 'delivery';
}

// ============================================================
// SYSTEM A — Breadcrumb hook: auto-update on every switchView
// ============================================================
(function() {
    const _orig = window.switchView;
    if (typeof _orig === 'function') {
        window.switchView = function(viewId) {
            _orig(viewId);
            window.currentActiveView = viewId;
            setTimeout(() => {
                renderLifecycleBreadcrumb(viewId);
                // System N — refresh Sprint HUD on every view switch
                if (typeof renderSprintHUD  === 'function') renderSprintHUD();
                // System L — show cadence nudge if relevant day
                if (typeof renderCadenceNudgeBanner === 'function') renderCadenceNudgeBanner();
            }, 60);
        };
    }
    // Also fire on initial load (after data is available)
    setTimeout(() => {
        if (typeof renderSprintHUD === 'function') renderSprintHUD();
        if (typeof renderCadenceNudgeBanner === 'function') renderCadenceNudgeBanner();
    }, 800);
})();


window.renderCurrentView = function() {
    const v = window.currentActiveView || 'track';
    const map = { track:'renderTrackView', kanban:'renderKanbanView', backlog:'renderBacklogView',
                  sprint:'renderSprintView', roadmap:'renderRoadmapView', epics:'renderEpicsView',
                  releases:'renderReleasesView', okr:'renderOkrView', status:'renderStatusView',
                  priority:'renderPriorityView', contributor:'renderContributorView' };
    if (map[v] && typeof window[map[v]] === 'function') window[map[v]]();
};

// ============================================================
// Exports
// ============================================================
window.renderLifecycleBreadcrumb = renderLifecycleBreadcrumb;
window.toggleInfoCard            = toggleInfoCard;
window.renderInfoButton          = renderInfoButton;
window.renderInfoCardContainer   = renderInfoCardContainer;
window.renderQuickActionBar      = renderQuickActionBar;
window.showHandoffToast          = showHandoffToast;
window.renderSmartEmptyState     = renderSmartEmptyState;
window.STAGE_REQUIRED_FIELDS     = STAGE_REQUIRED_FIELDS;
window.getModalStageFromView     = getModalStageFromView;
console.log('✅ lifecycle-guide.js — 8 systems active');
