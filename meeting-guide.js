// ============================================================
// SYSTEM E — Meeting Co-Pilot (meeting-guide.js)
// 8 scenarios: step-by-step guided panel for every PM ritual
// ============================================================
console.log('🧭 meeting-guide.js loading...');

// ---- Scenario Definitions ----
const MEETING_SCENARIOS = {
    standup: {
        icon: '☀️',
        title: 'Morning Standup',
        meta: { cadence: 'Daily · 15 min', who: 'PM + Dev Team', view: 'kanban' },
        steps: [
            {
                label: 'Open the Kanban board',
                detail: 'This is your team\'s live work board — the source of truth for standup.',
                action: { label: '→ Open Kanban', fn: () => switchView('kanban') },
                detectComplete: () => window.currentActiveView === 'kanban',
            },
            {
                label: 'Update your card statuses',
                detail: 'Each dev moves their cards to where they actually are (Later → Next → Now → Done). Do this before talking, not during.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Check the Blocked column',
                detail: 'Any blocked item is a risk to the sprint. PM: pick 1–2 to resolve today.',
                action: { label: '→ View Blockers', fn: () => switchView('track') },
                detectComplete: () => false,
            },
            {
                label: 'Review sprint progress',
                detail: 'Are you on track? Sprint HUD shows % done. If below 50% and past midpoint, escalate.',
                action: { label: '→ Open Sprint', fn: () => switchView('sprint') },
                detectComplete: () => window.currentActiveView === 'sprint',
            },
            {
                label: 'Close: 1 action per blocker',
                detail: 'Assign one person to each blocker. Don\'t leave standup without ownership.',
                action: null,
                detectComplete: () => false,
            },
        ]
    },
    grooming: {
        icon: '✂️',
        title: 'Backlog Grooming',
        meta: { cadence: 'Weekly · 60 min', who: 'PM + Dev Team', view: 'backlog' },
        steps: [
            {
                label: 'Open Backlog view',
                detail: 'All unscheduled work lives here. Your goal: make the top 10 items sprint-ready before planning.',
                action: { label: '→ Open Backlog', fn: () => switchView('backlog') },
                detectComplete: () => window.currentActiveView === 'backlog',
            },
            {
                label: 'Find orphaned tasks (no Epic linked)',
                detail: 'Unlinked tasks don\'t count toward OKR progress. Use "Link to Goal" to fix them.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Estimate story points (Fibonacci)',
                detail: '1=trivial · 2=simple · 3=small · 5=medium · 8=large · 13=X-large. Use "Estimate ▾" on each card.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Write acceptance criteria',
                detail: '"Done" means these criteria pass. Use "Write AC →" to open the modal focused on that field.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Set priority on each item',
                detail: 'High = must be in next sprint. Medium = want it. Low = nice-to-have. Rank before sprint planning.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Confirm: sprint-ready badge appears',
                detail: 'Items showing "✓ Ready" have everything needed for sprint planning. Aim for ≥10 sprint-ready tasks.',
                action: { label: '→ Plan Sprint', fn: () => switchView('sprint') },
                detectComplete: () => window.currentActiveView === 'sprint',
            },
        ]
    },
    'sprint-planning': {
        icon: '📋',
        title: 'Sprint Planning',
        meta: { cadence: 'Bi-weekly · 90 min', who: 'PM + Dev Team', view: 'sprint' },
        steps: [
            {
                label: 'Check team capacity',
                detail: 'Before pulling tasks, confirm who\'s available. Use Capacity view to see available story points.',
                action: { label: '→ Capacity View', fn: () => switchView('capacity') },
                detectComplete: () => window.currentActiveView === 'capacity',
            },
            {
                label: 'Create a new sprint',
                detail: 'Name it (e.g. "S5 Apr 14–28"), set 2-week dates, write the sprint goal in 1 sentence.',
                action: { label: '→ Open Sprint', fn: () => switchView('sprint') },
                detectComplete: () => window.currentActiveView === 'sprint',
            },
            {
                label: 'Pull ready tasks from Backlog',
                detail: 'Use "Add to Sprint ▾" on each sprint-ready backlog item. Start with High priority.',
                action: { label: '→ Open Backlog', fn: () => switchView('backlog') },
                detectComplete: () => window.currentActiveView === 'backlog',
            },
            {
                label: 'Confirm total story points ≤ capacity',
                detail: 'Sprint HUD shows total committed SP. Never exceed 85% of available capacity.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Assign contributors to each task',
                detail: 'Every sprint task needs an owner. Use the Contributors field in the edit modal.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Create release placeholder',
                detail: 'Create a release (e.g. "v2.5") now — you\'ll fill it at sprint end.',
                action: { label: '→ Releases', fn: () => switchView('releases') },
                detectComplete: () => window.currentActiveView === 'releases',
            },
            {
                label: 'Confirm previous sprint is CLOSED',
                detail: 'If the previous sprint is still "active", close it now using the "🏁 Close Sprint" ceremony. This ensures velocity is recorded and items are rolled over.',
                action: { label: '→ Open Sprint', fn: () => switchView('sprint') },
                detectComplete: () => false,
            },
            {
                label: 'Lock sprint — brief devs',
                detail: 'Everyone reviews their tasks. Scope is now locked. Dev: ask PM about any unclear AC now.',
                action: { label: '→ Open Kanban', fn: () => switchView('kanban') },
                detectComplete: () => window.currentActiveView === 'kanban',
            },
        ]
    },
    quarterly: {
        icon: '🎯',
        title: 'Quarterly Planning',
        meta: { cadence: 'Quarterly · Half day', who: 'PM + Leadership', view: 'okr' },
        steps: [
            {
                label: 'Archive & Close last quarter\'s OKRs',
                detail: 'Formalize the outcomes of the previous cycle. Use the "🏁 Close OKR" ceremony to score each Objective and record final results.',
                action: { label: '→ OKR View', fn: () => switchView('okr') },
                detectComplete: () => window.currentActiveView === 'okr',
            },
            {
                label: 'Set this quarter\'s Objective',
                detail: 'One bold direction for the quarter. Not a list — a north star. Example: "Launch mobile app to 10k users".',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Write 2–4 Key Results (with numbers)',
                detail: 'Each KR must be measurable. "Improve UX" is bad. "Increase D7 retention from 30% to 45%" is good.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Create or update Epics for each KR',
                detail: 'Each Key Result needs a strategic initiative (Epic) that will achieve it.',
                action: { label: '→ Epics View', fn: () => switchView('epics') },
                detectComplete: () => window.currentActiveView === 'epics',
            },
            {
                label: 'Place Epics on the Roadmap',
                detail: 'Assign each Epic to a time horizon: Now (1M) · Next (3M) · Later (6M).',
                action: { label: '→ Roadmap', fn: () => switchView('roadmap') },
                detectComplete: () => window.currentActiveView === 'roadmap',
            },
            {
                label: 'Schedule quarterly reviews',
                detail: 'Block calendar for: Monthly OKR check-in (1 hr) · Mid-quarter course correction (2 hrs).',
                action: null,
                detectComplete: () => false,
            },
        ]
    },
    'release-day': {
        icon: '🚀',
        title: 'Release Day',
        meta: { cadence: 'Bi-weekly · Sprint end', who: 'PM', view: 'sprint' },
        steps: [
            {
                label: 'Review Done items in Sprint',
                detail: 'Open sprint view — scan all Done items. Are acceptance criteria actually met?',
                action: { label: '→ Open Sprint', fn: () => switchView('sprint') },
                detectComplete: () => window.currentActiveView === 'sprint',
            },
            {
                label: 'Ship Done items to Release',
                detail: 'Use "📦 Ship to Release ▾" on each Done item, or batch ship from the sprint ribbon.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Open Releases view — verify items',
                detail: 'Confirm all shipped items appear. Fix any items shipped to wrong release.',
                action: { label: '→ Releases', fn: () => switchView('releases') },
                detectComplete: () => window.currentActiveView === 'releases',
            },
            {
                label: 'Execute Ship Release Ceremony',
                detail: 'Finalize the production milestone. Use the "🚢 Ship Release" button. This formalizes the version and manages any missed item rollovers.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Update OKR Key Result progress',
                detail: 'Based on what shipped, update the % progress on affected Key Results.',
                action: { label: '→ OKR View', fn: () => switchView('okr') },
                detectComplete: () => window.currentActiveView === 'okr',
            },
            {
                label: 'Review Analytics velocity',
                detail: 'Did we hit our point commitment? Velocity trending up or down? Note patterns for retro.',
                action: { label: '→ Analytics', fn: () => switchView('analytics') },
                detectComplete: () => window.currentActiveView === 'analytics',
            },
        ]
    },
    'first-setup': {
        icon: '🌱',
        title: 'First Time Setup',
        meta: { cadence: 'Once · ~45 min', who: 'PM + Leadership', view: 'okr' },
        steps: [
            {
                label: 'Create your first OKR',
                detail: 'Go to OKR view. Set 1 Objective with 2–3 Key Results for this quarter.',
                action: { label: '→ OKR View', fn: () => switchView('okr') },
                detectComplete: () => (window.UPDATE_DATA?.metadata?.okrs?.length > 0),
            },
            {
                label: 'Create your first Epic',
                detail: 'An Epic is the initiative that will achieve your OKR. Link it to a Key Result.',
                action: { label: '→ Epics', fn: () => switchView('epics') },
                detectComplete: () => (window.UPDATE_DATA?.metadata?.epics?.length > 0),
            },
            {
                label: 'Add tasks to the Backlog',
                detail: 'Break the Epic into 5–10 smaller tasks. Each task = 1–3 days of work.',
                action: { label: '→ Backlog', fn: () => switchView('backlog') },
                detectComplete: () => {
                    const items = [];
                    (window.UPDATE_DATA?.tracks||[]).forEach(t => t.subtracks.forEach(s => s.items.forEach(i => items.push(i))));
                    return items.length > 0;
                },
            },
            {
                label: 'Create your first Sprint',
                detail: 'Name it "Sprint 1", set 2-week dates, write a one-sentence sprint goal.',
                action: { label: '→ Sprint', fn: () => switchView('sprint') },
                detectComplete: () => (window.UPDATE_DATA?.metadata?.sprints?.length > 0),
            },
            {
                label: 'Add tasks to the sprint',
                detail: 'Use "Add to Sprint ▾" in Backlog to assign tasks to Sprint 1.',
                action: { label: '→ Backlog', fn: () => switchView('backlog') },
                detectComplete: () => false,
            },
            {
                label: 'Open Kanban — you\'re ready to build! 🎉',
                detail: 'Your sprint tasks appear here. Move cards as you work. Daily: update statuses before standup.',
                action: { label: '→ Kanban', fn: () => switchView('kanban') },
                detectComplete: () => window.currentActiveView === 'kanban',
            },
        ]
    },
    'weekly-review': {
        icon: '📊',
        title: 'Weekly Review',
        meta: { cadence: 'Weekly · Monday · 30 min', who: 'PM', view: 'track' },
        steps: [
            {
                label: 'Track view — scan all work',
                detail: '5-minute birds-eye view. Red = blocked. Orange = overdue. Open Track view.',
                action: { label: '→ Track View', fn: () => switchView('track') },
                detectComplete: () => window.currentActiveView === 'track',
            },
            {
                label: 'Review sprint progress',
                detail: 'Check sprint % completion. If <40% with 1 week left — flag risk to leadership.',
                action: { label: '→ Sprint', fn: () => switchView('sprint') },
                detectComplete: () => window.currentActiveView === 'sprint',
            },
            {
                label: 'Check Epic health',
                detail: 'Any Epics sliding to "At Risk"? Update health status and note the reason.',
                action: { label: '→ Epics', fn: () => switchView('epics') },
                detectComplete: () => window.currentActiveView === 'epics',
            },
            {
                label: 'Review roadmap horizon',
                detail: 'Are "Now" items still the right priority? Move anything that shifted.',
                action: { label: '→ Roadmap', fn: () => switchView('roadmap') },
                detectComplete: () => window.currentActiveView === 'roadmap',
            },
            {
                label: 'Check dependencies',
                detail: 'Any new blocking relationships? Flag them before they cascade.',
                action: { label: '→ Dependencies', fn: () => switchView('dependency') },
                detectComplete: () => window.currentActiveView === 'dependency',
            },
        ]
    },
    retro: {
        icon: '🔄',
        title: 'Sprint Retrospective',
        meta: { cadence: 'Bi-weekly · 45 min', who: 'PM + Dev Team', view: 'analytics' },
        steps: [
            {
                label: 'Open Analytics — review velocity',
                detail: 'Are we delivering more or fewer points per sprint? Trend is more important than the number.',
                action: { label: '→ Analytics', fn: () => switchView('analytics') },
                detectComplete: () => window.currentActiveView === 'analytics',
            },
            {
                label: 'Review sprint completion rate',
                detail: 'Points committed vs. points delivered. >80% = good planning. <60% = overcommitting.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Identify top 3 blockers this sprint',
                detail: 'What slowed the team? People? Process? Technology? Agree on 1 improvement.',
                action: null,
                detectComplete: () => false,
            },
            {
                label: 'Move un-done items',
                detail: 'Unfinished sprint items: clone to next sprint or send back to backlog.',
                action: { label: '→ Sprint', fn: () => switchView('sprint') },
                detectComplete: () => false,
            },
            {
                label: 'Execute Sprint Close Ceremony',
                detail: 'The final ritual. Click "🏁 Close Sprint" on the active sprint card. This records velocity history and guides you through rolling over or dropping un-done items.',
                action: { label: '→ Open Sprint', fn: () => switchView('sprint') },
                detectComplete: () => false,
            },
            {
                label: 'Feed learnings to next planning',
                detail: 'Record 1 process improvement in retro notes. Check: does backlog need replenishing?',
                action: { label: '→ Backlog', fn: () => switchView('backlog') },
                detectComplete: () => window.currentActiveView === 'backlog',
            },
        ]
    },
};

// ---- State ----
let _activeScenario = null;
let _stepCompletion = {}; // { scenarioId: Set of completed step indices }
const SESSION_KEY = 'guide_state';

function _loadState() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
            const s = JSON.parse(raw);
            _activeScenario = s.scenario || null;
            // Restore completion sets
            Object.keys(s.completion || {}).forEach(k => {
                _stepCompletion[k] = new Set(s.completion[k]);
            });
        }
    } catch(e) {}
}

function _saveState() {
    const completion = {};
    Object.keys(_stepCompletion).forEach(k => {
        completion[k] = Array.from(_stepCompletion[k]);
    });
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ scenario: _activeScenario, completion }));
}

// ---- Panel Rendering ----
function renderGuidePanel() {
    const panel = document.getElementById('guide-panel');
    if (!panel) return;

    const scenarioKeys = Object.keys(MEETING_SCENARIOS);
    const sc = _activeScenario ? MEETING_SCENARIOS[_activeScenario] : null;
    const completed = sc ? (_stepCompletion[_activeScenario] || new Set()) : new Set();

    const scenarioBtns = scenarioKeys.map(k => {
        const s = MEETING_SCENARIOS[k];
        return `<button class="guide-scenario-btn ${_activeScenario === k ? 'active' : ''}"
            onclick="window._guideSelectScenario('${k}')">${s.icon} ${s.title}</button>`;
    }).join('');

    let bodyHTML = '';
    if (!sc) {
        bodyHTML = `
            <div style="text-align:center;padding:40px 20px;opacity:0.5;">
                <div style="font-size:40px;margin-bottom:12px;">🧭</div>
                <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);margin-bottom:8px;">Meeting Co-Pilot</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.4);line-height:1.6;">
                    Choose a meeting type above to get<br>step-by-step guidance in real-time.
                </div>
            </div>`;
    } else {
        // Find current active step
        let activeStep = -1;
        sc.steps.forEach((step, i) => {
            if (!completed.has(i) && activeStep === -1) activeStep = i;
        });
        if (activeStep === -1 && sc.steps.length > 0) activeStep = sc.steps.length; // all done

        const stepsHTML = sc.steps.map((step, i) => {
            const isDone = completed.has(i);
            const isActive = i === activeStep;
            const cls = isDone ? 'step-done' : isActive ? 'step-active' : '';
            const numIcon = isDone ? '✓' : (i + 1);
            const actionHTML = isActive && step.action
                ? `<button class="guide-step-action" onclick="window._guideStepAction(${i})">${step.action.label}</button>`
                : '';
            const checkBtn = !isDone
                ? `<button onclick="window._guideMarkStep(${i})" style="position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.3);border-radius:6px;padding:2px 6px;font-size:9px;cursor:pointer;font-weight:700;" title="Mark done">✓ Done</button>`
                : '';

            return `<div class="guide-step ${cls}" onclick="window._guideMarkStep(${i})">
                <div class="guide-step-num">${numIcon}</div>
                <div class="guide-step-text">
                    <div class="guide-step-label">${step.label}</div>
                    ${isActive ? `<div class="guide-step-detail">${step.detail}</div>` : ''}
                    ${actionHTML}
                </div>
                ${checkBtn}
            </div>`;
        }).join('');

        const allDone = completed.size >= sc.steps.length;
        const progressPct = Math.round((completed.size / sc.steps.length) * 100);

        bodyHTML = `
            <div class="guide-scenario-header">
                <span class="guide-scenario-icon">${sc.icon}</span>
                <div class="guide-scenario-title">${sc.title}</div>
                <div class="guide-scenario-meta">
                    <span class="guide-meta-pill">${sc.meta.cadence}</span>
                    <span class="guide-meta-pill">👥 ${sc.meta.who}</span>
                    <span class="guide-meta-pill">${completed.size}/${sc.steps.length} steps</span>
                </div>
                <div style="margin-top:10px;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${progressPct}%;background:#6366f1;border-radius:2px;transition:width 0.4s;"></div>
                </div>
            </div>
            <div class="guide-steps">${stepsHTML}</div>
            ${allDone ? `
            <div style="margin-top:20px;padding:16px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:12px;text-align:center;">
                <div style="font-size:24px;margin-bottom:6px;">🎉</div>
                <div style="font-size:13px;font-weight:800;color:#86efac;">Meeting complete!</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;">Great work. Reset to run again.</div>
                <button class="guide-btn-secondary" style="margin-top:10px;font-size:10px;" onclick="window._guideReset()">Reset steps</button>
            </div>` : ''}`;
    }

    panel.innerHTML = `
        <div class="guide-header">
            <div>
                <div class="guide-title">🧭 Meeting Co-Pilot</div>
                <div class="guide-subtitle">Step-by-step guidance for every PM ritual</div>
            </div>
            <button class="guide-close" onclick="closeMeetingGuide()">✕</button>
        </div>
        <div class="guide-scenarios">${scenarioBtns}</div>
        <div class="guide-body">${bodyHTML}</div>
        ${sc ? `<div class="guide-footer">
            <button class="guide-btn-primary" onclick="window._guideNextStep()">→ Next Step</button>
            <button class="guide-btn-secondary" onclick="window._guideReset()">Reset</button>
        </div>` : ''}
    `;
}

// ---- Public API ----
function openMeetingGuide(scenarioId) {
    const panel = document.getElementById('guide-panel');
    const backdrop = document.getElementById('guide-backdrop');
    if (!panel) return;
    if (scenarioId) _activeScenario = scenarioId;
    renderGuidePanel();
    panel.classList.add('guide-open');
    if (backdrop) backdrop.classList.add('guide-open');
    _saveState();
}

function closeMeetingGuide() {
    const panel = document.getElementById('guide-panel');
    const backdrop = document.getElementById('guide-backdrop');
    if (panel) panel.classList.remove('guide-open');
    if (backdrop) backdrop.classList.remove('guide-open');
}

// ---- Internal handlers ----
window._guideSelectScenario = function(scenarioId) {
    _activeScenario = scenarioId;
    if (!_stepCompletion[scenarioId]) _stepCompletion[scenarioId] = new Set();
    _saveState();
    renderGuidePanel();
};

window._guideMarkStep = function(stepIdx) {
    if (!_activeScenario) return;
    if (!_stepCompletion[_activeScenario]) _stepCompletion[_activeScenario] = new Set();
    const set = _stepCompletion[_activeScenario];
    if (set.has(stepIdx)) {
        set.delete(stepIdx); // toggle off
    } else {
        set.add(stepIdx);
    }
    _saveState();
    renderGuidePanel();
};

window._guideNextStep = function() {
    if (!_activeScenario) return;
    const sc = MEETING_SCENARIOS[_activeScenario];
    if (!sc) return;
    const set = _stepCompletion[_activeScenario] || new Set();
    // Find first incomplete step and mark it done
    for (let i = 0; i < sc.steps.length; i++) {
        if (!set.has(i)) { set.add(i); break; }
    }
    _stepCompletion[_activeScenario] = set;
    _saveState();
    renderGuidePanel();
};

window._guideStepAction = function(stepIdx) {
    if (!_activeScenario) return;
    const sc = MEETING_SCENARIOS[_activeScenario];
    const step = sc?.steps[stepIdx];
    if (step?.action?.fn) {
        step.action.fn();
        // Auto-mark after a delay if step has a detectComplete that triggers
        setTimeout(() => {
            if (step.detectComplete && step.detectComplete()) {
                window._guideMarkStep(stepIdx);
            }
        }, 500);
    }
};

window._guideReset = function() {
    if (!_activeScenario) return;
    _stepCompletion[_activeScenario] = new Set();
    _saveState();
    renderGuidePanel();
};

// ---- Auto-advance via switchView hook ----
(function() {
    const _origSV = window.switchView;
    if (typeof _origSV === 'function') {
        window.switchView = function(viewId) {
            _origSV(viewId);
            // Check if any active step's detectComplete now passes
            setTimeout(() => {
                if (!_activeScenario) return;
                const sc = MEETING_SCENARIOS[_activeScenario];
                if (!sc) return;
                const set = _stepCompletion[_activeScenario] || new Set();
                let changed = false;
                sc.steps.forEach((step, i) => {
                    if (!set.has(i) && step.detectComplete && step.detectComplete()) {
                        set.add(i); changed = true;
                    }
                });
                if (changed) {
                    _stepCompletion[_activeScenario] = set;
                    _saveState();
                    // Refresh panel if open
                    const panel = document.getElementById('guide-panel');
                    if (panel?.classList.contains('guide-open')) renderGuidePanel();
                }
            }, 300);
        };
    }
})();

// ---- Keyboard shortcut: G to open guide ----
document.addEventListener('keydown', e => {
    if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
        const panel = document.getElementById('guide-panel');
        if (panel?.classList.contains('guide-open')) {
            closeMeetingGuide();
        } else {
            openMeetingGuide();
        }
    }
});

// ---- Restore state on load ----
_loadState();

// ---- Exports ----
window.openMeetingGuide  = openMeetingGuide;
window.closeMeetingGuide = closeMeetingGuide;
window.MEETING_SCENARIOS = MEETING_SCENARIOS;

console.log('✅ meeting-guide.js — 8 scenarios active');
