// CMS State variables (will be initialized by auth)
let isCmsMode = false;
let editContext = null;
let _selectedContributors = [];
let _selectedTags = [];
let _selectedDeps = [];

// CMS Config
const CMS_CONFIG = {
    repoOwner: 'Khyaal-Inc',
    repoName: 'khyaal-engineering-updates',
    filePath: 'data.json'
};

function initCms() {
    const params = new URLSearchParams(window.location.search);
    
    // Global modal behavior (works even in read-only mode if a modal is triggered)
    const modal = document.getElementById('cms-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeCmsModal();
        });
    }

    if (params.get('cms') === 'true') {
        isCmsMode = true;
        document.getElementById('cms-controls').classList.add('active');
        const token = localStorage.getItem('gh_pat') || '';
        if (token) {
            document.getElementById('github-token').value = token;
            authenticateCms();
        }
    } else {
        window.isGithubAuthenticated = false;
        const ctrls = document.getElementById('cms-controls');
        if (ctrls) ctrls.classList.remove('active');
    }
}

function authenticateCms() {
    const token = document.getElementById('github-token').value;
    if (!token) return;
    localStorage.setItem('gh_pat', token);
    window.isGithubAuthenticated = true;

    document.getElementById('cms-auth-section').classList.add('hidden');
    document.getElementById('cms-actions-section').classList.remove('hidden');

    const currentView = document.querySelector('.filter-btn.active')?.id.replace('btn-', '') || 'track';
    if (typeof switchView === 'function') switchView(currentView);
}

function logoutCms() {
    localStorage.removeItem('gh_pat');
    window.isGithubAuthenticated = false;
    location.reload();
}

// ------ MODAL OPS (FULL) ------
function openItemEdit(trackIndex, subtrackIndex, itemIndex) {
    const item = UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex].items[itemIndex];
    editContext = { type: 'item', trackIndex, subtrackIndex, itemIndex };

    document.getElementById('modal-title').innerText = 'Edit Item';
    document.getElementById('modal-form').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-bold mb-1.5 text-slate-700">Text</label>
                    <input type="text" id="edit-text" value="${item.text}" class="cms-input" placeholder="What needs to be done?">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Status</label>
                        <select id="edit-status" class="cms-input">
                            <option value="done" ${item.status === 'done' ? 'selected' : ''}>Done</option>
                            <option value="now" ${item.status === 'now' ? 'selected' : ''}>Now</option>
                            <option value="ongoing" ${item.status === 'ongoing' ? 'selected' : ''}>On-Going</option>
                            <option value="next" ${item.status === 'next' ? 'selected' : ''}>Next</option>
                            <option value="later" ${item.status === 'later' ? 'selected' : ''}>Later</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Priority</label>
                        <select id="edit-priority" class="cms-input">
                            <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
                            <option value="medium" ${item.priority === 'medium' || !item.priority ? 'selected' : ''}>Medium</option>
                            <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-1.5 text-slate-700">Impact / Usecase</label>
                    <input type="text" id="edit-usecase" value="${item.usecase || ''}" class="cms-input" placeholder="Value provided by this item...">
                </div>

                <div>
                    <label class="block text-sm font-bold mb-1.5 text-slate-700">Media URL</label>
                    <input type="text" id="edit-mediaUrl" value="${item.mediaUrl || ''}" class="cms-input" placeholder="https://...">
                </div>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-bold mb-1.5 text-slate-700">Note / Description</label>
                    <textarea id="edit-note" class="cms-input" rows="4" placeholder="Technical details or notes...">${item.note || ''}</textarea>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Start Date</label>
                        <input type="date" id="edit-startDate" value="${item.startDate || ''}" class="cms-input">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Due Date</label>
                        <input type="date" id="edit-due" value="${item.due || ''}" class="cms-input">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Sprint</label>
                        <select id="edit-sprintId" class="cms-input">
                            <option value="">None</option>
                            ${(UPDATE_DATA.metadata.sprints || []).map(s => `<option value="${s.id}" ${item.sprintId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Release</label>
                        <select id="edit-releasedIn" class="cms-input">
                            <option value="">None</option>
                            ${(UPDATE_DATA.metadata.releases || []).map(r => `<option value="${r.id}" ${item.releasedIn === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Planning Horizon</label>
                        <select id="edit-planningHorizon" class="cms-input">
                            <option value="">None</option>
                            <option value="1M" ${item.planningHorizon === '1M' ? 'selected' : ''}>1 Month</option>
                            <option value="3M" ${item.planningHorizon === '3M' ? 'selected' : ''}>3 Months</option>
                            <option value="6M" ${item.planningHorizon === '6M' ? 'selected' : ''}>6 Months</option>
                            <option value="1Y" ${item.planningHorizon === '1Y' ? 'selected' : ''}>1 Year</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Linked Epic</label>
                        <select id="edit-epicId" class="cms-input">
                            <option value="">None</option>
                            ${(UPDATE_DATA.metadata.epics || []).map(e => `<option value="${e.id}" ${item.epicId === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-8 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-800">Contributors</label>
                    <div id="contrib-tag-input-edit" class="tag-input-wrapper min-h-[44px]"></div>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-800">Tags</label>
                    <div id="tags-tag-input-edit" class="tag-input-wrapper min-h-[44px]"></div>
                </div>
            </div>

            <div>
                <label class="block text-sm font-bold mb-2 text-slate-800">Dependencies (Blockers)</label>
                <div id="deps-tag-input-edit" class="tag-input-wrapper min-h-[44px]"></div>
            </div>
            
            <div class="p-4 bg-red-50 border border-red-100 rounded-xl">
                <label class="block text-sm font-bold mb-1.5 text-red-700">Blocker Reason (Critical)</label>
                <input type="text" id="edit-blockerNote" value="${item.blockerNote || ''}" class="cms-input !mb-0 border-red-200 focus:border-red-500" placeholder="Flags this item as a blocker with this reason...">
            </div>
        </div>
        
        <div class="mt-8 p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
            <label class="block text-[11px] uppercase font-black text-slate-500 mb-4 tracking-[0.2em] text-center">Move Item (Routing)</label>
            <div class="grid grid-cols-2 gap-6">
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
    document.getElementById('cms-modal').classList.add('active');
    
    // Initialize tag inputs after modal is in DOM
    setTimeout(() => {
        renderTagWidget('contrib-tag-input-edit', item.contributors || [], 'contributor-list', 'author');
        renderTagWidget('tags-tag-input-edit', item.tags || [], 'tag-list', 'tag');
        renderTagWidget('deps-tag-input-edit', item.dependencies || [], 'item-list', 'dep');
    }, 10);
}

function addItem(trackIndex, subtrackIndex, defaults = {}) {
    editContext = { type: 'item-new', trackIndex, subtrackIndex, defaults };
    document.getElementById('modal-title').innerText = 'Add New Item';
    const sprints = UPDATE_DATA.metadata.sprints || [];
    const releases = UPDATE_DATA.metadata.releases || [];
    const epics = UPDATE_DATA.metadata.epics || [];

    document.getElementById('modal-form').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-bold mb-1.5 text-slate-700">Text</label>
                    <input type="text" id="edit-text" value="" class="cms-input" placeholder="What needs to be done?">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Status</label>
                        <select id="edit-status" class="cms-input">
                            <option value="done" ${defaults.status === 'done' ? 'selected' : ''}>Done</option>
                            <option value="now" ${defaults.status === 'now' ? 'selected' : ''}>Now</option>
                            <option value="ongoing" ${defaults.status === 'ongoing' ? 'selected' : ''}>On-Going</option>
                            <option value="next" ${!defaults.status || defaults.status === 'next' ? 'selected' : ''}>Next</option>
                            <option value="later" ${defaults.status === 'later' ? 'selected' : ''}>Later</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Priority</label>
                        <select id="edit-priority" class="cms-input">
                            <option value="high" ${defaults.priority === 'high' ? 'selected' : ''}>High</option>
                            <option value="medium" ${!defaults.priority || defaults.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="low" ${defaults.priority === 'low' ? 'selected' : ''}>Low</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-1.5 text-slate-700">Impact / Usecase</label>
                    <input type="text" id="edit-usecase" value="" class="cms-input" placeholder="Optional impact details...">
                </div>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-bold mb-1.5 text-slate-700">Note / Description</label>
                    <textarea id="edit-note" class="cms-input" rows="4" placeholder="Description..."></textarea>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Start Date</label>
                        <input type="date" id="edit-startDate" value="" class="cms-input">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1 text-slate-500 uppercase tracking-wider">Due Date</label>
                        <input type="date" id="edit-due" value="" class="cms-input">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Sprint</label>
                        <select id="edit-sprintId" class="cms-input">
                            <option value="">None</option>
                            ${sprints.map(s => `<option value="${s.id}" ${s.id === defaults.sprintId ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Release</label>
                        <select id="edit-releasedIn" class="cms-input">
                            <option value="">None</option>
                            ${releases.map(r => `<option value="${r.id}" ${r.id === defaults.releasedIn ? 'selected' : ''}>${r.name}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Planning Horizon</label>
                        <select id="edit-planningHorizon" class="cms-input">
                            <option value="">None</option>
                            <option value="1M" ${defaults.planningHorizon === '1M' ? 'selected' : ''}>1 Month</option>
                            <option value="3M" ${defaults.planningHorizon === '3M' ? 'selected' : ''}>3 Months</option>
                            <option value="6M" ${defaults.planningHorizon === '6M' ? 'selected' : ''}>6 Months</option>
                            <option value="1Y" ${defaults.planningHorizon === '1Y' ? 'selected' : ''}>1 Year</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Linked Epic</label>
                        <select id="edit-epicId" class="cms-input">
                            <option value="">None</option>
                            ${epics.map(e => `<option value="${e.id}" ${e.id === defaults.epicId ? 'selected' : ''}>${e.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </div>
                            ${(UPDATE_DATA.metadata.epics || []).map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-8 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-800">Contributors</label>
                    <div id="contrib-tag-input-edit" class="tag-input-wrapper min-h-[44px]"></div>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-800">Tags</label>
                    <div id="tags-tag-input-edit" class="tag-input-wrapper min-h-[44px]"></div>
                </div>
            </div>

            <div>
                <label class="block text-sm font-bold mb-2 text-slate-800">Dependencies</label>
                <div id="deps-tag-input-edit" class="tag-input-wrapper min-h-[44px]"></div>
            </div>
        </div>

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
    document.getElementById('cms-modal').classList.add('active');
    setTimeout(() => {
        renderTagWidget('contrib-tag-input-edit', [], 'contributor-list', 'author');
        renderTagWidget('tags-tag-input-edit', [], 'tag-list', 'tag');
        renderTagWidget('deps-tag-input-edit', [], 'item-list', 'dep');
    }, 10);
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
                    UPDATE_DATA.tracks.forEach(t => t.subtracks.forEach(s => s.items.forEach(i => { if(i.id === val) found = i.text; })));
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
    const sprint = sprintId ? UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId) : { name: '', startDate: '', endDate: '', goal: '' };
    editContext = { type: 'sprint', sprintId };
    
    document.getElementById('modal-title').innerText = sprintId ? 'Edit Sprint' : 'Add New Sprint';
    document.getElementById('modal-form').innerHTML = `
        <label class="block text-sm font-bold mb-1">Sprint Name</label>
        <input type="text" id="edit-sprint-name" value="${sprint.name}" class="cms-input" placeholder="e.g. Sprint 42">
        <div class="grid grid-cols-2 gap-2">
            <div>
                <label class="block text-xs font-bold mb-1">Start Date</label>
                <input type="date" id="edit-sprint-start" value="${sprint.startDate || ''}" class="cms-input">
            </div>
            <div>
                <label class="block text-xs font-bold mb-1">End Date</label>
                <input type="date" id="edit-sprint-end" value="${sprint.endDate || ''}" class="cms-input">
            </div>
        </div>
        <label class="block text-sm font-bold mb-1">Sprint Goal</label>
        <textarea id="edit-sprint-goal" class="cms-input">${sprint.goal || ''}</textarea>
    `;
    document.getElementById('cms-modal').classList.add('active');
}

function openReleaseEdit(releaseId) {
    const release = releaseId ? UPDATE_DATA.metadata.releases.find(r => r.id === releaseId) : { name: '', targetDate: '', goal: '' };
    editContext = { type: 'release', releaseId };

    document.getElementById('modal-title').innerText = releaseId ? 'Edit Release' : 'Add New Release';
    document.getElementById('modal-form').innerHTML = `
        <label class="block text-sm font-bold mb-1">Release Name</label>
        <input type="text" id="edit-release-name" value="${release.name}" class="cms-input" placeholder="e.g. v2.1 (The Spark)">
        <label class="block text-sm font-bold mb-1">Target Date</label>
        <input type="date" id="edit-release-date" value="${release.targetDate || ''}" class="cms-input">
        <label class="block text-sm font-bold mb-1">Goal/Focus</label>
        <textarea id="edit-release-goal" class="cms-input" rows="3">${release.goal || ''}</textarea>
    `;
    document.getElementById('cms-modal').classList.add('active');
}

function openEpicEdit(epicIndex) {
    const epic = epicIndex !== undefined ? UPDATE_DATA.metadata.epics[epicIndex] : { name: '', description: '', health: 'on-track' };
    const epicId = epicIndex !== undefined ? epic.id : undefined;
    editContext = { type: 'epic', epicId };

    document.getElementById('modal-title').innerText = epicId ? 'Edit Strategic Epic' : 'Add Strategic Epic';
    document.getElementById('modal-form').innerHTML = `
        <label class="block text-sm font-bold mb-1">Epic Name</label>
        <input type="text" id="edit-epic-name" value="${epic.name}" class="cms-input" placeholder="e.g. Platform Migration V2">
        
        <label class="block text-sm font-bold mb-1 mt-4">Health</label>
        <select id="edit-epic-health" class="cms-input">
            <option value="on-track" ${epic.health === 'on-track' ? 'selected' : ''}>On-Track</option>
            <option value="at-risk" ${epic.health === 'at-risk' ? 'selected' : ''}>At-Risk</option>
            <option value="delayed" ${epic.health === 'delayed' ? 'selected' : ''}>Delayed</option>
        </select>

        <label class="block text-sm font-bold mb-1 mt-4">Description / Goal</label>
        <textarea id="edit-epic-desc" class="cms-input" rows="3">${epic.description || ''}</textarea>
    `;
    document.getElementById('cms-modal').classList.add('active');
}

function validateCmsForm() {
    const textEl = document.getElementById('edit-text') || 
                   document.getElementById('edit-sprint-name') || 
                   document.getElementById('edit-release-name') || 
                   document.getElementById('edit-epic-name') ||
                   document.getElementById('edit-track-name') ||
                   document.getElementById('edit-subtrack-name');
    if (textEl && !textEl.value.trim()) {
        textEl.style.borderColor = '#ef4444';
        return false;
    }
    return true;
}

function saveCmsChanges() {
    if (!validateCmsForm()) return;

    if (editContext.type === 'item' || editContext.type === 'item-new') {
        const itemData = {
            text: document.getElementById('edit-text').value.trim(),
            status: document.getElementById('edit-status').value,
            priority: document.getElementById('edit-priority').value,
            note: document.getElementById('edit-note').value.trim(),
            usecase: document.getElementById('edit-usecase').value.trim(),
            mediaUrl: document.getElementById('edit-mediaUrl').value.trim(),
            startDate: document.getElementById('edit-startDate').value,
            due: document.getElementById('edit-due').value,
            sprintId: document.getElementById('edit-sprintId').value,
            releasedIn: document.getElementById('edit-releasedIn')?.value || '',
            planningHorizon: document.getElementById('edit-planningHorizon')?.value || '',
            epicId: document.getElementById('edit-epicId')?.value || '',
            contributors: [..._selectedContributors],
            tags: [..._selectedTags],
            dependencies: [..._selectedDeps],
            blockerNote: (document.getElementById('edit-blockerNote')?.value || '').trim()
        };
        if (itemData.blockerNote) itemData.blocker = true;
        else delete itemData.blocker;

        const moveTrackEl = document.getElementById('edit-move-track');
        const moveSubEl = document.getElementById('edit-move-subtrack');
        const targetTi = moveTrackEl ? parseInt(moveTrackEl.value) : editContext.trackIndex;
        const targetSi = moveSubEl ? parseInt(moveSubEl.value) : editContext.subtrackIndex;

        if (editContext.type === 'item') {
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
                publishedDate: new Date().toISOString(),
                ...itemData 
            };
            UPDATE_DATA.tracks[targetTi].subtracks[targetSi].items.push(newItem);
            logChange('Add Item', newItem.text);
        }
    } else if (editContext.type === 'sprint') {
        const sprintData = {
            id: editContext.sprintId || `sprint-${Date.now()}`,
            name: document.getElementById('edit-sprint-name').value.trim(),
            startDate: document.getElementById('edit-sprint-start').value,
            endDate: document.getElementById('edit-sprint-end').value,
            goal: document.getElementById('edit-sprint-goal').value.trim()
        };
        if (!UPDATE_DATA.metadata.sprints) UPDATE_DATA.metadata.sprints = [];
        if (editContext.sprintId) {
            const idx = UPDATE_DATA.metadata.sprints.findIndex(s => s.id === editContext.sprintId);
            UPDATE_DATA.metadata.sprints[idx] = sprintData;
        } else {
            UPDATE_DATA.metadata.sprints.push(sprintData);
        }
        logChange(editContext.sprintId ? 'Edit Sprint' : 'Add Sprint', sprintData.name);

    } else if (editContext.type === 'release') {
        const relData = {
            id: editContext.releaseId || `rel-${Date.now()}`,
            name: document.getElementById('edit-release-name').value.trim(),
            targetDate: document.getElementById('edit-release-date').value,
            goal: document.getElementById('edit-release-goal').value.trim()
        };
        if (!UPDATE_DATA.metadata.releases) UPDATE_DATA.metadata.releases = [];
        if (editContext.releaseId) {
            const idx = UPDATE_DATA.metadata.releases.findIndex(r => r.id === editContext.releaseId);
            UPDATE_DATA.metadata.releases[idx] = relData;
        } else {
            UPDATE_DATA.metadata.releases.push(relData);
        }
        logChange(editContext.releaseId ? 'Edit Release' : 'Add Release', relData.name);

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
        logChange(editContext.trackIndex !== undefined ? 'Edit Track' : 'Add Track', name);
        renderTrackView();
        updateTabCounts();

    } else if (editContext.type === 'epic') {
        const epicData = {
            id: editContext.epicId || `epic-${Date.now()}`,
            name: document.getElementById('edit-epic-name').value.trim(),
            description: document.getElementById('edit-epic-desc').value.trim(),
            health: document.getElementById('edit-epic-health').value
        };
        if (!UPDATE_DATA.metadata.epics) UPDATE_DATA.metadata.epics = [];
        if (editContext.epicId) {
            const idx = UPDATE_DATA.metadata.epics.findIndex(e => e.id === editContext.epicId);
            UPDATE_DATA.metadata.epics[idx] = epicData;
        } else {
            UPDATE_DATA.metadata.epics.push(epicData);
        }
        logChange(editContext.epicId ? 'Edit Epic' : 'Add Epic', epicData.name);

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

    closeCmsModal();
    const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    switchView(currentView);
}

function updateItemGrooming(trackIndex, subtrackIndex, itemIndex, field, value) {
    const item = UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex].items[itemIndex];
    item[field] = value;
    logChange(`Groom Item (${field})`, item.text);
    // Auto-refresh the view to show status changes
    const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'backlog';
    switchView(currentView);
}

// Consolidated Track Management
function openTrackEdit(ti) {
    const track = ti !== undefined ? UPDATE_DATA.tracks[ti] : { name: '', theme: 'blue', subtracks: [{ name: 'General', items: [] }] };
    editContext = { type: 'track', trackIndex: ti };
    
    document.getElementById('modal-title').innerText = ti !== undefined ? 'Edit Track' : 'Add New Track';
    document.getElementById('modal-form').innerHTML = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-bold mb-1.5 text-slate-700">Track Name</label>
                <input type="text" id="edit-track-name" value="${track.name}" class="cms-input" placeholder="e.g. Platform Team">
            </div>
            <div>
                <label class="block text-sm font-bold mb-1.5 text-slate-700">Theme Color</label>
                <select id="edit-track-theme" class="cms-input">
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
    document.getElementById('cms-modal').classList.add('active');
}

function deleteTrack(ti) {
    if (!confirm(`Delete track "${UPDATE_DATA.tracks[ti].name}" and ALL its items?`)) return;
    UPDATE_DATA.tracks.splice(ti, 1);
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
    
    document.getElementById('modal-title').innerText = 'Edit Subtrack';
    document.getElementById('modal-form').innerHTML = `
        <label class="block text-sm font-bold mb-1">Subtrack Name</label>
        <input type="text" id="edit-subtrack-name" value="${sub.name}" class="cms-input">
        <label class="block text-sm font-bold mb-1">Subtrack Note</label>
        <textarea id="edit-subtrack-note" class="cms-input">${sub.note || ''}</textarea>
    `;
    document.getElementById('cms-modal').classList.add('active');
}

function deleteSubtrack(ti, si) {
    if (!confirm(`Delete subtrack "${UPDATE_DATA.tracks[ti].subtracks[si].name}"?`)) return;
    UPDATE_DATA.tracks[ti].subtracks.splice(si, 1);
    renderTrackView();
    updateTabCounts();
}

function closeCmsModal() {
    document.getElementById('cms-modal').classList.remove('active');
    editContext = null;
}

function openMetadataEdit() {
    const meta = UPDATE_DATA.metadata;
    editContext = { type: 'metadata' };

    document.getElementById('modal-title').innerText = 'Edit Project Metadata';
    document.getElementById('modal-form').innerHTML = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-bold mb-1.5 text-slate-700">Project Title</label>
                <input type="text" id="edit-meta-title" value="${meta.title}" class="cms-input">
            </div>
            <div>
                <label class="block text-sm font-bold mb-1.5 text-slate-700">Date Range / Status</label>
                <input type="text" id="edit-meta-dateRange" value="${meta.dateRange}" class="cms-input">
            </div>
            <div>
                <label class="block text-sm font-bold mb-1.5 text-slate-700">Next Review / Milestone</label>
                <input type="text" id="edit-meta-nextReview" value="${meta.nextReview || ''}" class="cms-input" placeholder="e.g. Next Update: April 15">
            </div>
            <div>
                <label class="block text-sm font-bold mb-1.5 text-slate-700">Description</label>
                <textarea id="edit-meta-description" class="cms-input" rows="2">${meta.description}</textarea>
            </div>
            <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">Custom Statuses (JSON)</label>
                <textarea id="edit-meta-customStatuses" class="cms-input font-mono text-xs p-3 bg-slate-50" rows="6">${JSON.stringify(meta.customStatuses || [], null, 2)}</textarea>
                <p class="text-[10px] text-slate-400 mt-1">Format: [{"id":"status_id", "label":"Label", "class":"css_class", "bucket":"status_bucket"}]</p>
            </div>
        </div>
    `;
    document.getElementById('cms-modal').classList.add('active');
}


function openSubtrackEdit(trackIndex, subtrackIndex) {
    const sub = UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex];
    editContext = { type: 'subtrack', trackIndex, subtrackIndex };

    document.getElementById('modal-title').innerText = 'Edit Subtrack';
    document.getElementById('modal-form').innerHTML = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-bold mb-1.5 text-slate-700">Subtrack Name</label>
                <input type="text" id="edit-subtrack-name" value="${sub.name}" class="cms-input">
            </div>
            <div>
                <label class="block text-sm font-bold mb-1.5 text-slate-700">Description / Note</label>
                <textarea id="edit-subtrack-note" class="cms-input" rows="3">${sub.note || ''}</textarea>
            </div>
        </div>
    `;
    document.getElementById('cms-modal').classList.add('active');
}

function deleteSubtrack(trackIndex, subtrackIndex) {
    if (!confirm('Delete this subtrack and all its items?')) return;
    UPDATE_DATA.tracks[trackIndex].subtracks.splice(subtrackIndex, 1);
    renderTrackView();
    updateTabCounts();
}

function logoutAll() {
    localStorage.removeItem('gh_pat');
    location.reload();
}

function updateMoveSubtrackOpts(ti) {
    const subSel = document.getElementById('edit-move-subtrack');
    if (!subSel) return;
    subSel.innerHTML = UPDATE_DATA.tracks[parseInt(ti)].subtracks.map((s, si) =>
        `<option value="${si}">${s.name}</option>`
    ).join('');
}

async function saveToGithub() {
    const btn = document.getElementById('save-to-github-btn');
    const token = localStorage.getItem('gh_pat');
    if (!token) { alert('Unauthorized'); return; }
    
    btn.disabled = true; btn.innerText = 'Saving...';
    try {
        const getRes = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        const fileData = await getRes.json();
        
        const putRes = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'CMS: Update dashboard data',
                content: btoa(unescape(encodeURIComponent(JSON.stringify(UPDATE_DATA, null, 4)))),
                sha: fileData.sha
            })
        });
        if (putRes.ok) { alert('Saved successfully!'); location.reload(); }
        else throw new Error('GitHub push failed');
    } catch (e) {
        alert('Save error: ' + e.message);
        btn.disabled = false; btn.innerText = 'Save to GitHub';
    }
}

// ------ COMMENTS ------
function toggleComments(ti, si, ii) {
    const id = `comments-${ti}-${si}-${ii}`;
    document.getElementById(id)?.classList.toggle('hidden');
}

function addComment(ti, si, ii) {
    const input = document.getElementById(`comment-input-${ti}-${si}-${ii}`);
    if (!input || !input.value.trim()) return;
    const item = UPDATE_DATA.tracks[ti].subtracks[si].items[ii];
    if (!item.comments) item.comments = [];
    item.comments.push({ id: `c-${Date.now()}`, text: input.value.trim(), author: 'PM', timestamp: new Date().toISOString() });
    input.value = '';
    const thread = document.getElementById(`thread-${ti}-${si}-${ii}`);
    if (thread) thread.innerHTML = renderCommentThread(item.comments, ti, si, ii);
}

function deleteComment(ti, si, ii, cid) {
    const item = UPDATE_DATA.tracks[ti].subtracks[si].items[ii];
    item.comments = (item.comments || []).filter(c => c.id !== cid);
    const thread = document.getElementById(`thread-${ti}-${si}-${ii}`);
    if (thread) thread.innerHTML = renderCommentThread(item.comments, ti, si, ii);
}

function deleteItem(ti, si, ii) {
    if (!confirm('Delete item?')) return;
    UPDATE_DATA.tracks[ti].subtracks[si].items.splice(ii, 1);
    const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    if (currentView === 'track') renderTrackView();
    else if (currentView === 'backlog') renderBacklogView();
    updateTabCounts();
}

function sendToBacklog(ti, si, ii) {
    const track = UPDATE_DATA.tracks[ti];
    let bIdx = track.subtracks.findIndex(s => s.name === 'Backlog');
    if (bIdx === -1) { track.subtracks.push({ name: 'Backlog', items: [] }); bIdx = track.subtracks.length - 1; }
    const [item] = track.subtracks[si].items.splice(ii, 1);
    track.subtracks[bIdx].items.push(item);
    renderTrackView();
    updateTabCounts();
}

function toggleBlocker(ti, si, ii) {
    const item = UPDATE_DATA.tracks[ti].subtracks[si].items[ii];
    if (item.blocker) { delete item.blocker; delete item.blockerNote; }
    else { item.blocker = true; item.blockerNote = prompt('Blocker reason:', '') || ''; }
    renderTrackView();
    renderBlockerStrip();
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

    const container = document.getElementById('archive-filter');
    if (!container) return;
    
    let html = '<div class="flex flex-wrap gap-2 items-center">';
    html += '<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filters:</span>';
    html += '<button onclick="filterByDate(\'all\')" class="archive-btn active">All Entries</button>';

    if (hasLegacy) {
        html += '<button onclick="filterByDate(\'Legacy\')" class="archive-btn">Legacy</button>';
    }

    Array.from(dates).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
        html += `<button onclick="filterByDate('${date}')" class="archive-btn">${date}</button>`;
    });
    html += '</div>';

    // Add Physical Archives Section
    try {
        const response = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/archive`);
        if (response.ok) {
            const files = await response.json();
            const archives = files.filter(f => f.name.endsWith('.json'));

            if (archives.length > 0) {
                html += '<div class="flex flex-wrap gap-2 items-center mt-4 pt-4 border-t border-slate-100 w-full">';
                html += '<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Snapshots:</span>';

                if (window.loadingArchive) {
                    html += `<button onclick="window.location.search=''" class="archive-btn bg-slate-900 text-white p-2 text-[10px] rounded">Live</button>`;
                }

                archives.sort((a, b) => b.name.localeCompare(a.name)).forEach(file => {
                    let displayName = file.name.replace('.json', '').replace(/-/g, ' ').trim();
                    const isActive = window.loadingArchive && window.loadingArchive.includes(file.name);
                    const activeClass = isActive ? 'ring-2 ring-indigo-500' : '';
                    html += `<button onclick="loadArchive('${file.name}')" class="archive-btn ${activeClass} bg-indigo-50 text-indigo-700 p-2 text-[10px] rounded uppercase font-bold">${displayName}</button>`;
                });
                html += '</div>';
            }
        }
    } catch (e) {}
    container.innerHTML = html;
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
    if (!confirm('ARCHIVE & CLEAR DASHBOARD? This will save all current data to a timestamped JSON file in /archive and clear the main view.')) return;

    const btn = document.getElementById('archive-btn');
    const token = localStorage.getItem('gh_pat');
    if (!token) { alert('Unauthorized'); return; }

    btn.disabled = true; btn.innerText = 'Archiving...';
    try {
        // 1. Generate archive data
        const archiveContent = JSON.stringify(UPDATE_DATA, null, 4);
        const fileName = `archive_${new Date().toISOString().split('T')[0]}.json`;

        // 2. Put to Archive folder
        await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/archive/${fileName}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Archive: ${UPDATE_DATA.metadata.dateRange}`,
                content: btoa(unescape(encodeURIComponent(archiveContent)))
            })
        });

        // 3. Clear data (keep 'later' and 'ongoing' maybe? or just clear all 'done')
        UPDATE_DATA.tracks.forEach(track => {
            track.subtracks.forEach(sub => {
                sub.items = sub.items.filter(item => item.status !== 'done');
            });
        });

        // 4. Update Main Data
        const getRes = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        const fileData = await getRes.json();
        
        await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'CMS: post-archive data reset',
                content: btoa(unescape(encodeURIComponent(JSON.stringify(UPDATE_DATA, null, 4)))),
                sha: fileData.sha
            })
        });

        alert('Archive successful!');
        location.reload();
    } catch (e) {
        alert('Archive error: ' + e.message);
        btn.disabled = false; btn.innerText = 'Archive & Clear';
    }
}

async function loadArchive(fileName) {
    window.location.search = `?archive=archive/${fileName}`;
}

// ------ CMS ROUTING ------
function saveCms() {
    if (!editContext) return;
    saveCmsChanges();
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

function deleteSprint(sprintId) {
    const sprint = UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId);
    if (!confirm(`Delete sprint "${sprint.name}"? This will not delete tasks, but they will be unlinked from this sprint.`)) return;
    
    // Clear sprintId from items
    UPDATE_DATA.tracks.forEach(track => {
        track.subtracks.forEach(subtrack => {
            subtrack.items.forEach(item => {
                if (item.sprintId === sprintId) delete item.sprintId;
            });
        });
    });

    const idx = UPDATE_DATA.metadata.sprints.findIndex(s => s.id === sprintId);
    UPDATE_DATA.metadata.sprints.splice(idx, 1);
    logChange('Delete Sprint', sprint.name);
    switchView('sprint');
    updateTabCounts();
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

function logoutAll() {
    localStorage.removeItem('khyaal_site_auth');
    localStorage.removeItem('GITHUB_CMS_TOKEN');
    location.reload();
}
