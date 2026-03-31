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
    if (params.get('cms') === 'true') {
        isCmsMode = true;
        document.getElementById('cms-controls').classList.add('active');
        const token = localStorage.getItem('gh_pat') || '';
        if (token) {
            document.getElementById('github-token').value = token;
            authenticateCms();
        }
        document.getElementById('cms-modal').addEventListener('click', function(e) {
            if (e.target === this) closeCmsModal();
        });
    }
}

function authenticateCms() {
    const token = document.getElementById('github-token').value;
    if (!token) return;
    localStorage.setItem('gh_pat', token);
    window.isAuthenticated = true;
    isAuthenticated = true;

    document.getElementById('cms-auth-section').classList.add('hidden');
    document.getElementById('cms-actions-section').classList.remove('hidden');

    const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    switchView(currentView);
}

function logoutCms() {
    localStorage.removeItem('gh_pat');
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

function addItem(trackIndex, subtrackIndex) {
    editContext = { type: 'item-new', trackIndex, subtrackIndex };
    document.getElementById('modal-title').innerText = 'Add New Item';
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
                            <option value="done">Done</option>
                            <option value="now">Now</option>
                            <option value="ongoing">On-Going</option>
                            <option value="next" selected>Next</option>
                            <option value="later">Later</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1.5 text-slate-700">Priority</label>
                        <select id="edit-priority" class="cms-input">
                            <option value="high">High</option>
                            <option value="medium" selected>Medium</option>
                            <option value="low">Low</option>
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

                <div>
                    <label class="block text-sm font-bold mb-1.5 text-slate-700">Sprint</label>
                    <select id="edit-sprintId" class="cms-input">
                        <option value="">None</option>
                        ${(UPDATE_DATA.metadata.sprints || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
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
    const sprint = sprintId ? UPDATE_DATA.metadata.sprints.find(s => s.id === sprintId) : { name: '', start: '', end: '', goal: '' };
    editContext = { type: 'sprint', sprintId };
    
    document.getElementById('modal-title').innerText = sprintId ? 'Edit Sprint' : 'Add New Sprint';
    document.getElementById('modal-form').innerHTML = `
        <label class="block text-sm font-bold mb-1">Sprint Name</label>
        <input type="text" id="edit-sprint-name" value="${sprint.name}" class="cms-input" placeholder="e.g. Sprint 42">
        <div class="grid grid-cols-2 gap-2">
            <div>
                <label class="block text-xs font-bold mb-1">Start Date</label>
                <input type="date" id="edit-sprint-start" value="${sprint.start}" class="cms-input">
            </div>
            <div>
                <label class="block text-xs font-bold mb-1">End Date</label>
                <input type="date" id="edit-sprint-end" value="${sprint.end}" class="cms-input">
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

function validateCmsForm() {
    const textEl = document.getElementById('edit-text') || document.getElementById('edit-sprint-name') || document.getElementById('edit-release-name');
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
            start: document.getElementById('edit-sprint-start').value,
            end: document.getElementById('edit-sprint-end').value,
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
    } else if (editContext.type === 'track') {
        const name = document.getElementById('edit-track-name').value.trim();
        const theme = document.getElementById('edit-track-theme').value;
        if (editContext.trackIndex !== undefined) {
            UPDATE_DATA.tracks[editContext.trackIndex].name = name;
            UPDATE_DATA.tracks[editContext.trackIndex].theme = theme;
        } else {
            UPDATE_DATA.tracks.push({ name, theme, subtracks: [] });
        }
        logChange('Track Change', name);
    } else if (editContext.type === 'subtrack') {
        const name = document.getElementById('edit-subtrack-name').value.trim();
        const note = document.getElementById('edit-subtrack-note').value.trim();
        UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].name = name;
        UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].note = note;
        logChange('Subtrack Change', name);
    }

    closeCmsModal();
    const currentView = document.querySelector('.view-section.active')?.id.replace('-view', '') || 'track';
    switchView(currentView);
}

// ------ TRACK & SUBTRACK OPS ------
function openTrackEdit(ti) {
    const track = ti !== undefined ? UPDATE_DATA.tracks[ti] : { name: '', theme: 'blue', subtracks: [] };
    editContext = { type: 'track', trackIndex: ti };
    
    document.getElementById('modal-title').innerText = ti !== undefined ? 'Edit Track' : 'Add New Track';
    document.getElementById('modal-form').innerHTML = `
        <label class="block text-sm font-bold mb-1">Track Name</label>
        <input type="text" id="edit-track-name" value="${track.name}" class="cms-input">
        <label class="block text-sm font-bold mb-1">Theme Color</label>
        <select id="edit-track-theme" class="cms-input">
            ${Object.keys(themeColors).map(c => `<option value="${c}" ${track.theme === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
        </select>
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

async function loadArchive(fileName) {
    window.location.search = `?archive=archive/${fileName}`;
}
