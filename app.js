let UPDATE_DATA = null;
            // Contributor color mapping
            const contributorColors = {
                "Subhrajit": "bg-indigo-100 text-indigo-800 border border-indigo-200",
                "Vivek": "bg-blue-100 text-blue-800 border border-blue-200",
                "Manish": "bg-purple-100 text-purple-800 border border-purple-200",
                "Raj": "bg-slate-100 text-slate-800 border border-slate-200",
                "Nikhil": "bg-teal-100 text-teal-800 border border-teal-200",
                "Rushikesh": "bg-pink-100 text-pink-800 border border-pink-200",
                "External": "bg-gray-100 text-gray-600 border border-gray-200"
            };

            const statusConfig = {
                done: { label: 'Done', class: 'badge-done', bucket: 'bucket-done' },
                now: { label: 'Now', class: 'badge-now', bucket: 'bucket-now' },
                ongoing: { label: 'On-Going', class: 'badge-ongoing', bucket: 'bucket-ongoing' },
                next: { label: 'Next', class: 'badge-next', bucket: 'bucket-next' },
                later: { label: 'Later', class: 'badge-later', bucket: 'bucket-later' }
            };

            const priorityConfig = {
                high: { label: 'High', class: 'priority-high' },
                medium: { label: 'Medium', class: 'priority-medium' },
                low: { label: 'Low', class: 'priority-low' }
            };

            function renderContributors(contributors) {
                return (contributors || []).map(name =>
                    `<span class="contributor-tag ${contributorColors[name] || 'bg-gray-100 text-gray-600'}">${name}</span>`
                ).join('');
            }

            // ------ Helper: Due-date badge with overdue/warning colouring ------
            function renderDueDateBadge(item) {
                if (!item.due || ['next', 'later'].includes(item.status) || item.status === 'done') return '';
                const dueDate = new Date(item.due);
                if (isNaN(dueDate.getTime())) return `<span class="ml-2 inline-flex items-center gap-1 font-bold text-[10px] text-orange-700">(${item.due})</span>`;
                const today = new Date(); today.setHours(0,0,0,0);
                const diffDays = Math.floor((dueDate - today) / 86400000);
                if (diffDays < 0) return `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase tracking-wider">&#9888; Overdue (${item.due})</span>`;
                if (diffDays <= 2) return `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-[10px] uppercase tracking-wider">&#128336; Due Soon (${item.due})</span>`;
                return `<span class="ml-2 inline-flex items-center gap-1 font-bold text-[10px] text-orange-700">(${item.due})</span>`;
            }

            // ------ Helper: Tag pills ------
            const tagClasses = {
                'tech-debt': 'tag-tech-debt', 'bug': 'tag-bug', 'feature': 'tag-feature',
                'compliance': 'tag-compliance', 'customer': 'tag-customer'
            };
            function renderTagPills(tags) {
                if (!tags || !tags.length) return '';
                return tags.map(t => {
                    const key = t.toLowerCase().replace(/\s+/g, '-');
                    return `<span class="tag-pill ${tagClasses[key] || ''}">${t}</span>`;
                }).join(' ');
            }

            // ------ Helper: Highlight search matches in text ------
            function highlightSearch(text) {
                if (!text) return text;
                // Parse @mentions
                let parsed = text.replace(/@([A-Za-z0-9_ -]+)/g, '<mark class="bg-blue-100 text-blue-800 font-bold px-1 rounded">@$1</mark>');
                if (!globalSearchQuery) return parsed;
                const escaped = globalSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return parsed.replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:#fef9c3;padding:0 1px;border-radius:2px;">$1</mark>');
            }

            // ===============================================================
            // EXPORT & DIGEST
            // ===============================================================
            function exportToCSV() {
                let csv = 'Track,Subtrack,Item ID,Title,Status,Priority,Contributors,Sprint,Released In,Blocker,Tags,Due\n';
                UPDATE_DATA.tracks.forEach(t => {
                    t.subtracks.forEach(s => {
                        s.items.forEach(i => {
                            const esc = (str) => `"${(str || '').replace(/"/g, '""')}"`;
                            csv += `${esc(t.name)},${esc(s.name)},${esc(i.id)},${esc(i.text)},${esc(i.status)},${esc(i.priority)},${esc((i.contributors||[]).join(';'))},${esc(i.sprintId)},${esc(i.releasedIn)},${i.blocker ? 'Yes' : 'No'},${esc((i.tags||[]).join(';'))},${esc(i.due)}\n`;
                        });
                    });
                });
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none'; a.href = url; a.download = 'Khyaal_Updates_Export.csv';
                document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
                logChange('Export', 'Downloaded CSV');
            }

            function generateDigest() {
                const today = new Date().toLocaleDateString();
                let text = `*Khyaal Engineering Digest (${today})*\n\n`;
                let doneItems = [];
                let nowItems = [];
                let blockers = [];
                
                UPDATE_DATA.tracks.forEach(t => t.subtracks.forEach(s => s.items.forEach(i => {
                    if (i.status === 'done') doneItems.push(`- [${t.name}] ${i.text}`);
                    if (i.status === 'now') nowItems.push(`- [${t.name}] ${i.text} ${i.contributors ? '(' + i.contributors.join(', ') + ')' : ''}`);
                    if (i.blocker) blockers.push(`- 🔴 [${t.name}] ${i.text} (Blocked: ${i.blockerNote || 'No details'})`);
                })));

                if (blockers.length) text += `*🚨 BLOCKERS:*\n${blockers.join('\\n')}\n\n`;
                text += `*✅ RECENTLY SHIPPED:*\n${doneItems.slice(0,10).join('\\n')}${doneItems.length > 10 ? '\\n...and more!' : ''}\n\n`;
                text += `*🚀 IN FLIGHT (NOW):*\n${nowItems.slice(0,15).join('\\n')}\n`;

                alert("Digest generated! Sending to clipboard...");
                navigator.clipboard.writeText(text).then(() => {
                    alert("✅ Digest copied to clipboard! You can paste it into Slack.");
                }).catch(err => {
                    prompt("Failed to copy automatically. Copy the text below:", text.replace(/\\n/g, '\n'));
                });
                logChange('Digest Generated', 'Copied to clipboard');
            }



            // ===============================================================
            // CONTRIBUTOR AUTOCOMPLETE
            // ===============================================================
            let ALL_CONTRIBUTORS = [];
            let _selectedContributors = [];

            function buildContributorList() {
                const set = new Set();
                (UPDATE_DATA.tracks || []).forEach(t =>
                    t.subtracks.forEach(s =>
                        s.items.forEach(i =>
                            (i.contributors || []).forEach(c => { if (c.trim()) set.add(c.trim()); })
                        )
                    )
                );
                ALL_CONTRIBUTORS = Array.from(set).sort();
            }

            let ALL_TAGS_MODAL = [];
            let _selectedTags = [];
            function buildTagsModalList() {
                const set = new Set();
                (UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(s => s.items.forEach(i => (i.tags || []).forEach(tg => set.add(tg)))));
                ALL_TAGS_MODAL = Array.from(set).sort();
            }

            function renderTagsTagInput(containerId, initial = []) {
                _selectedTags = [...initial];
                const wrap = document.getElementById(containerId);
                if (!wrap) return;
                wrap.innerHTML = '';
                _selectedTags.forEach(name => {
                    wrap.insertAdjacentHTML('beforeend',
                        `<span class="tag-pill">${name}<span class="contributor-tag-remove ml-1 bg-white/50 px-1 rounded cursor-pointer" onclick="removeTagsTag('${name}','${containerId}')">✕</span></span>`);
                });
                const inputWrap = document.createElement('div');
                inputWrap.style.position = 'relative'; inputWrap.style.flex = '1';
                inputWrap.style.minWidth = '120px';
                inputWrap.innerHTML = `<input id="tags-input-${containerId}" class="cms-input !mb-0 !border-0 bg-transparent focus:ring-0" placeholder="Add tag..." autocomplete="off"
                    oninput="filterTagsDropdown(this.value,'${containerId}')"
                    onkeydown="handleTagsKey(event,'${containerId}')">
                    <div id="tags-palette-${containerId}" class="flex flex-wrap gap-1 mb-2 mt-1">
                        ${['feature', 'bug', 'tech-debt', 'compliance', 'customer', 'blocker'].map(t => `<span class="tag-pill cursor-pointer hover:scale-105 transition-transform" onclick="addTagsTag('${t}','${containerId}')">+ ${t}</span>`).join('')}
                    </div>
                    <div id="tags-dd-${containerId}" class="contributor-dropdown p-1" style="display:none"></div>`;
                wrap.appendChild(inputWrap);
            }

            function filterTagsDropdown(query, containerId) {
                const dd = document.getElementById(`tags-dd-${containerId}`);
                if (!dd) return;
                const q = query.toLowerCase().trim();
                const matches = ALL_TAGS_MODAL.filter(c => c.toLowerCase().includes(q) && !_selectedTags.includes(c));
                if (!q || (!matches.length && q.length < 2)) { dd.style.display = 'none'; return; }
                let html = matches.slice(0, 8).map(c => `<div class="p-1.5 px-2 hover:bg-slate-100 cursor-pointer rounded text-xs font-bold uppercase tracking-wider text-slate-700" onclick="addTagsTag('${c}','${containerId}')">${c}</div>`).join('');
                if (q && !matches.includes(q) && !_selectedTags.includes(q)) {
                    html += `<div class="p-1.5 px-2 hover:bg-blue-50 cursor-pointer rounded text-xs font-bold uppercase tracking-wider text-blue-700 mt-1 border-t border-slate-100 pt-2">+ Create "${q}"</div>`;
                }
                dd.innerHTML = html;
                dd.style.display = 'block';
            }

            function handleTagsKey(e, containerId) {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const val = e.target.value.trim().replace(/,+$/, '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
                    if (val) addTagsTag(val, containerId);
                }
            }

            function addTagsTag(name, containerId) {
                if (!name || _selectedTags.includes(name)) return;
                _selectedTags.push(name);
                if (!ALL_TAGS_MODAL.includes(name)) ALL_TAGS_MODAL.push(name);
                renderTagsTagInput(containerId, _selectedTags);
            }

            function removeTagsTag(name, containerId) {
                _selectedTags = _selectedTags.filter(n => n !== name);
                renderTagsTagInput(containerId, _selectedTags);
            }

            function renderContributorTagInput(containerId, initial = []) {
                _selectedContributors = [...initial];
                const wrap = document.getElementById(containerId);
                if (!wrap) return;
                wrap.innerHTML = '';
                _selectedContributors.forEach(name => {
                    wrap.insertAdjacentHTML('beforeend',
                        `<span class="contributor-tag">${name}<span class="contributor-tag-remove" onclick="removeContributorTag('${name}','${containerId}')">✕</span></span>`);
                });
                const inputWrap = document.createElement('div');
                inputWrap.style.position = 'relative'; inputWrap.style.flex = '1';
                inputWrap.innerHTML = `<input id="contrib-input-${containerId}" class="tag-input-field" placeholder="Type name..." autocomplete="off"
                    oninput="filterContributorDropdown(this.value,'${containerId}')"
                    onkeydown="handleContribKey(event,'${containerId}')">
                    <div id="contrib-dd-${containerId}" class="contributor-dropdown" style="display:none"></div>`;
                wrap.appendChild(inputWrap);
            }

            function filterContributorDropdown(query, containerId) {
                const dd = document.getElementById(`contrib-dd-${containerId}`);
                if (!dd) return;
                const q = query.toLowerCase().trim();
                const matches = ALL_CONTRIBUTORS.filter(c => c.toLowerCase().includes(q) && !_selectedContributors.includes(c));
                if (!q || !matches.length) { dd.style.display = 'none'; return; }
                dd.innerHTML = matches.slice(0, 8).map(c =>
                    `<div class="contributor-dropdown-item" onclick="addContributorTag('${c}','${containerId}')">${c}</div>`
                ).join('');
                dd.style.display = 'block';
            }

            function handleContribKey(e, containerId) {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const val = e.target.value.trim().replace(/,+$/, '');
                    if (val) addContributorTag(val, containerId);
                }
            }

            function addContributorTag(name, containerId) {
                if (!name || _selectedContributors.includes(name)) return;
                _selectedContributors.push(name);
                if (!ALL_CONTRIBUTORS.includes(name)) ALL_CONTRIBUTORS.push(name);
                renderContributorTagInput(containerId, _selectedContributors);
            }

            function removeContributorTag(name, containerId) {
                _selectedContributors = _selectedContributors.filter(c => c !== name);
                renderContributorTagInput(containerId, _selectedContributors);
            }

            function getSelectedContributors() { return [..._selectedContributors]; }

            // ===============================================================
            // CHANGELOG (in-session audit log)
            // ===============================================================
            let CHANGELOG = [];
            function logChange(action, detail) {
                CHANGELOG.unshift({ action, detail, time: new Date().toLocaleTimeString() });
                if (CHANGELOG.length > 50) CHANGELOG.pop();
                const badge = document.getElementById('changelog-count');
                if (badge) badge.textContent = CHANGELOG.length;
                const body = document.getElementById('changelog-body');
                if (body) body.innerHTML = CHANGELOG.map(e =>
                    `<div class="changelog-entry"><strong>${e.action}</strong> — ${e.detail}<div class="changelog-time">${e.time}</div></div>`
                ).join('');
            }
            function toggleChangelog() {
                document.getElementById('changelog-panel').classList.toggle('open');
            }

            // ===============================================================
            // TAG FILTER
            // ===============================================================
            let activeTagFilter = null;
            function setTagFilter(tag) {
                activeTagFilter = (activeTagFilter === tag) ? null : tag;
                buildTagFilterBar();
                const view = document.querySelector('.view-section.active');
                if (view) switchView(view.id.replace('-view', ''));
            }
            function isItemMatchingTagFilter(item) {
                if (!activeTagFilter) return true;
                return (item.tags || []).some(t => t.toLowerCase() === activeTagFilter.toLowerCase());
            }
            function buildTagFilterBar() {
                const bar = document.getElementById('tag-filter-bar');
                if (!bar) return;
                const allTags = new Set();
                (UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(s => s.items.forEach(i => (i.tags || []).forEach(tg => allTags.add(tg)))));
                if (!allTags.size) { bar.innerHTML = ''; return; }
                bar.innerHTML = [...allTags].map(tg =>
                    `<span class="tag-filter-pill${activeTagFilter === tg ? ' active' : ''}" onclick="setTagFilter('${tg}')">${tg}</span>`
                ).join('') + (activeTagFilter ? `<span class="tag-filter-pill clear" onclick="setTagFilter(null)">✕ Clear</span>` : '');
            }

            // ===============================================================
            // BULK OPERATIONS
            // ===============================================================
            let selectedItems = new Set();
            function toggleItemSelect(key, el) {
                if (el.checked) selectedItems.add(key);
                else selectedItems.delete(key);
                updateBulkBar();
            }
            function updateBulkBar() {
                const bar = document.getElementById('bulk-action-bar');
                if (!bar) return;
                if (selectedItems.size > 0) {
                    bar.classList.add('active');
                    const cnt = document.getElementById('bulk-count');
                    if (cnt) cnt.textContent = `${selectedItems.size} selected`;
                } else { bar.classList.remove('active'); }
            }
            function parseBulkKey(key) {
                const [ti, si, ii] = key.split('-').map(Number);
                return { trackIndex: ti, subtrackIndex: si, itemIndex: ii };
            }
            function bulkUpdateStatus(status) {
                selectedItems.forEach(key => {
                    const { trackIndex: ti, subtrackIndex: si, itemIndex: ii } = parseBulkKey(key);
                    UPDATE_DATA.tracks[ti].subtracks[si].items[ii].status = status;
                });
                logChange('Bulk Status', `${selectedItems.size} items → ${status}`);
                selectedItems.clear(); updateBulkBar(); renderTrackView(); updateTabCounts();
            }
            function bulkUpdatePriority(priority) {
                selectedItems.forEach(key => {
                    const { trackIndex: ti, subtrackIndex: si, itemIndex: ii } = parseBulkKey(key);
                    UPDATE_DATA.tracks[ti].subtracks[si].items[ii].priority = priority;
                });
                logChange('Bulk Priority', `${selectedItems.size} items → ${priority}`);
                selectedItems.clear(); updateBulkBar(); renderTrackView(); updateTabCounts();
            }
            function bulkSendToBacklog() {
                // Process in reverse order to keep indices valid
                const sorted = [...selectedItems].map(k => { const p = parseBulkKey(k); return p; })
                    .sort((a, b) => b.itemIndex - a.itemIndex);
                sorted.forEach(({ trackIndex: ti, subtrackIndex: si, itemIndex: ii }) => {
                    const track = UPDATE_DATA.tracks[ti];
                    let bi = track.subtracks.findIndex(s => s.name === 'Backlog');
                    if (bi === -1) { track.subtracks.push({ name: 'Backlog', items: [] }); bi = track.subtracks.length - 1; }
                    const [item] = track.subtracks[si].items.splice(ii, 1);
                    track.subtracks[bi].items.push(item);
                });
                logChange('Bulk → Backlog', `${selectedItems.size} items moved`);
                selectedItems.clear(); updateBulkBar(); renderTrackView(); updateBacklogBadge(); updateTabCounts();
            }
            function bulkDelete() {
                if (!confirm(`Delete ${selectedItems.size} items?`)) return;
                const sorted = [...selectedItems].map(k => parseBulkKey(k)).sort((a, b) => b.itemIndex - a.itemIndex);
                sorted.forEach(({ trackIndex: ti, subtrackIndex: si, itemIndex: ii }) => {
                    UPDATE_DATA.tracks[ti].subtracks[si].items.splice(ii, 1);
                });
                logChange('Bulk Delete', `${selectedItems.size} items deleted`);
                selectedItems.clear(); updateBulkBar(); renderTrackView(); updateBacklogBadge(); updateTabCounts();
            }

            // ===============================================================
            // TAB COUNT BADGES
            // ===============================================================
            function updateTabCounts() {
                let allItems = [];
                (UPDATE_DATA.tracks || []).forEach(t => t.subtracks.forEach(s => s.items.forEach(i => allItems.push(i))));
                const counts = {
                    track: allItems.length,
                    status: allItems.length,
                    priority: allItems.length,
                    contributor: allItems.length,
                    gantt: allItems.filter(i => i.startDate || i.due).length,
                    backlog: 0,
                    sprint: (UPDATE_DATA.metadata && UPDATE_DATA.metadata.sprints ? UPDATE_DATA.metadata.sprints.length : 0),
                    releases: allItems.filter(i => i.releasedIn).length
                };
                (UPDATE_DATA.tracks || []).forEach(t => {
                    const bl = t.subtracks.find(s => s.name === 'Backlog');
                    if (bl) counts.backlog += bl.items.length;
                });
                ['track','status','priority','contributor','gantt','backlog','sprint','releases','dependency'].forEach(v => {
                    const el = document.getElementById(`tab-count-${v}`);
                    if (el) el.textContent = counts[v] || '';
                });
            }

            // ===============================================================
            // SPRINT / CYCLE MANAGEMENT
            // ===============================================================
            function renderSprintView() {
                const container = document.getElementById('sprint-view');
                if (!container) return;
                const sprints = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.sprints) || [];
                let html = '';
                if (!sprints.length) {
                    html = `<div class="text-center py-16 text-slate-400">
                        <div class="text-4xl mb-4">🏃</div>
                        <p class="text-lg font-semibold">No sprints yet</p>
                        ${isAuthenticated ? `
                        <p class="text-sm mt-1 mb-4">Click below to create your first sprint.</p>
                        <button onclick="openSprintEdit()" class="filter-btn active" style="margin:auto; display:inline-block">Add Sprint</button>
                        ` : ''}
                    </div>`;
                    container.innerHTML = html; return;
                }
                const today = new Date(); today.setHours(0,0,0,0);
                let allItems = [];
                UPDATE_DATA.tracks.forEach((t, ti) => t.subtracks.forEach((s, si) => s.items.forEach((item, ii) => { if (getActiveTeam() && t.name !== getActiveTeam()) return;
                    allItems.push({ ...item, _ti: ti, _si: si, _ii: ii });
                })));

                html += `<div class="mb-4 text-right">
                    ${isAuthenticated ? `<button onclick="openSprintEdit()" class="filter-btn active">➕ Add New Sprint</button>` : ''}
                </div>`;

                sprints.forEach(sprint => {
                    const sprintItems = allItems.filter(i => i.sprintId === sprint.id);
                    const done = sprintItems.filter(i => i.status === 'done').length;
                    const total = sprintItems.length;
                    const pct = total ? Math.round((done / total) * 100) : 0;
                    const end = new Date(sprint.end); end.setHours(23,59,59);
                    const carryover = sprintItems.filter(i => i.status !== 'done' && end < today);
                    const isCurrent = new Date(sprint.start) <= today && today <= end;
                    const statusLabel = isCurrent ? '🟢 Active' : (end < today ? '🔴 Ended' : '⏳ Upcoming');
                    html += `<div class="sprint-card">
                        <div class="sprint-header">
                            <div class="flex-1">
                                <div class="flex items-center gap-3">
                                    <span class="font-bold text-lg">${sprint.name}</span>
                                    <span class="sprint-badge">${statusLabel}</span>
                                    ${isAuthenticated ? `<button onclick="openSprintEdit('${sprint.id}')" class="sprint-badge cursor-pointer hover:bg-white/30">✏ Edit</button>` : ''}
                                </div>
                                <div class="text-xs opacity-75 mt-1">${sprint.start} → ${sprint.end}${sprint.goal ? ` · ${sprint.goal}` : ''}</div>
                                <div class="sprint-progress-bar mt-2"><div class="sprint-progress-fill" style="width:${pct}%"></div></div>
                                <div class="text-xs opacity-75 mt-1">${done}/${total} done (${pct}%)${carryover.length ? ` · ⚠ ${carryover.length} carryover` : ''}</div>
                            </div>
                        </div>
                        <div>
                            ${sprintItems.length ? sprintItems.map(item => {
                                const due = renderDueDateBadge(item);
                                const pInfo = priorityConfig[item.priority || 'medium'];
                                return `<div class="sprint-item-row flex items-center gap-3">
                                    <span class="status-pill ${statusConfig[item.status]?.class || ''} text-[9px] min-w-[44px] text-center">${statusConfig[item.status]?.label || item.status}</span>
                                    <span class="status-pill ${pInfo.class} text-[8px] uppercase font-black">${item.priority || 'med'}</span>
                                    <span class="flex-1">${item.text}${due}</span>
                                    ${(item.contributors || []).slice(0,3).map(c => `<span class="contributor-avatar">${c.charAt(0).toUpperCase()}</span>`).join('')}
                                </div>`;
                            }).join('') : `<div class="sprint-item-row text-slate-400 italic">No items assigned to this sprint</div>`}
                        </div>
                    </div>`;
                });
                container.innerHTML = html;
            }

            function openSprintEdit(sprintId) {
                const sprints = (UPDATE_DATA.metadata.sprints || []);
                const sprint = sprintId ? sprints.find(s => s.id === sprintId) : null;
                editContext = { type: 'sprint', sprintId };
                document.getElementById('modal-title').innerText = sprint ? 'Edit Sprint' : 'Add Sprint';
                document.getElementById('modal-form').innerHTML = `
                <label class="block text-sm font-bold mb-1">Sprint Name</label>
                <input type="text" id="edit-sprint-name" class="cms-input" value="${sprint ? sprint.name : ''}" placeholder="e.g. Sprint 23">
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-sm font-bold mb-1">Start Date</label>
                    <input type="date" id="edit-sprint-start" class="cms-input" value="${sprint ? sprint.start : ''}"></div>
                    <div><label class="block text-sm font-bold mb-1">End Date</label>
                    <input type="date" id="edit-sprint-end" class="cms-input" value="${sprint ? sprint.end : ''}"></div>
                </div>
                <label class="block text-sm font-bold mb-1">Sprint Goal</label>
                <textarea id="edit-sprint-goal" class="cms-input">${sprint ? (sprint.goal || '') : ''}</textarea>
                ${sprint ? `<button onclick="deleteSprint('${sprint.id}')" class="mt-2 text-red-600 text-xs underline">Delete Sprint</button>` : ''}
                `;
                document.getElementById('cms-modal').classList.add('active');
                setTimeout(() => {
                    const existing = document.getElementById('edit-contributors');
                    const initial = existing && existing.value ? existing.value.split(',').map(s=>s.trim()).filter(s=>s) : [];
                    renderContributorTagInput('contrib-tag-input-edit', initial);
                }, 10);
            }

            function deleteSprint(sprintId) {
                if (!confirm('Delete this sprint?')) return;
                UPDATE_DATA.metadata.sprints = (UPDATE_DATA.metadata.sprints || []).filter(s => s.id !== sprintId);
                UPDATE_DATA.tracks.forEach(t => t.subtracks.forEach(s => s.items.forEach(i => { if (i.sprintId === sprintId) delete i.sprintId; })));
                logChange('Delete Sprint', sprintId);
                closeCmsModal(); renderSprintView(); updateTabCounts();
            }

            // ===============================================================
            // DEPENDENCY GRAPH VIEW
            // ===============================================================
            // --- Removed duplicate renderDependencyView ---


            // ===============================================================
            // PM COMMENTS / NOTES
            // ===============================================================
            function toggleComments(trackIndex, subtrackIndex, itemIndex) {
                const id = `comments-${trackIndex}-${subtrackIndex}-${itemIndex}`;
                const el = document.getElementById(id);
                if (!el) return;
                el.style.display = el.style.display === 'none' ? 'block' : 'none';
            }

            function addComment(trackIndex, subtrackIndex, itemIndex) {
                const input = document.getElementById(`comment-input-${trackIndex}-${subtrackIndex}-${itemIndex}`);
                const text = input ? input.value.trim() : '';
                if (!text) return;
                const item = UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex].items[itemIndex];
                if (!item.comments) item.comments = [];
                const comment = { id: `c-${Date.now()}`, text, author: 'PM', timestamp: new Date().toISOString() };
                item.comments.push(comment);
                input.value = '';
                logChange('Comment Added', item.text.substring(0, 40));
                // Re-render comment thread in place
                const thread = document.getElementById(`thread-${trackIndex}-${subtrackIndex}-${itemIndex}`);
                if (thread) thread.innerHTML = renderCommentThread(item.comments, trackIndex, subtrackIndex, itemIndex);
            }

            function deleteComment(trackIndex, subtrackIndex, itemIndex, commentId) {
                const item = UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex].items[itemIndex];
                item.comments = (item.comments || []).filter(c => c.id !== commentId);
                logChange('Comment Deleted', item.text.substring(0, 40));
                const thread = document.getElementById(`thread-${trackIndex}-${subtrackIndex}-${itemIndex}`);
                if (thread) thread.innerHTML = renderCommentThread(item.comments, trackIndex, subtrackIndex, itemIndex);
            }

            function renderCommentThread(comments, ti, si, ii) {
                return (comments || []).map(c => `
                    <div class="comment-item">
                        ${c.text}
                        <div class="comment-meta">${c.author} · ${new Date(c.timestamp).toLocaleString()}
                        ${isAuthenticated ? `<span class="cursor-pointer text-red-400 ml-2" onclick="deleteComment(${ti},${si},${ii},'${c.id}')">✕</span>` : ''}
                        </div>
                    </div>`).join('') +
                    (isAuthenticated ? `<div class="flex gap-2 mt-2">
                        <input id="comment-input-${ti}-${si}-${ii}" class="comment-input flex-1" placeholder="Add a note...">
                        <button onclick="addComment(${ti},${si},${ii})" class="cms-btn-sm">Add</button>
                    </div>` : '');
            }

            // ===============================================================
            // RELEASE TRACKING
            // ===============================================================
            function renderReleasesView() {
                const container = document.getElementById('releases-view');
                if (!container) return;
                const releases = (UPDATE_DATA.metadata && UPDATE_DATA.metadata.releases) || [];
                let html = '';
                if (!releases.length) {
                    html = `<div class="text-center py-16 text-slate-400">
                        <div class="text-4xl mb-4">📦</div>
                        <p class="text-lg font-semibold">No releases defined</p>
                        ${isAuthenticated ? `
                        <p class="text-sm mt-1 mb-4">Click below to create your first release.</p>
                        <button onclick="openReleaseEdit()" class="filter-btn active" style="margin:auto; display:inline-block">Add Release</button>
                        ` : ''}
                    </div>`;
                    container.innerHTML = html; return;
                }

                html += `<div class="mb-4 text-right">
                    ${isAuthenticated ? `<button onclick="openReleaseEdit()" class="filter-btn active">➕ Add New Release</button>` : ''}
                </div>`;

                let allItems = [];
                UPDATE_DATA.tracks.forEach((t, ti) => t.subtracks.forEach((s, si) => s.items.forEach((item, ii) => { if (getActiveTeam() && t.name !== getActiveTeam()) return;
                    allItems.push({ ...item, _ti: ti, _si: si, _ii: ii });
                })));

                releases.forEach(release => {
                    const rItems = allItems.filter(i => i.releasedIn === release.id);
                    const done = rItems.filter(i => i.status === 'done').length;
                    const pct = rItems.length ? Math.round((done / rItems.length) * 100) : 0;
                    
                    html += `<div class="sprint-card">
                        <div class="sprint-header">
                            <div class="flex-1">
                                <div class="flex items-center gap-3">
                                    <span class="font-bold text-lg">${release.name}</span>
                                    ${isAuthenticated ? `<button onclick="openReleaseEdit('${release.id}')" class="sprint-badge cursor-pointer hover:bg-white/30">✏ Edit</button>` : ''}
                                </div>
                                <div class="text-xs opacity-75 mt-1">${release.targetDate ? `Target: ${release.targetDate}` : 'No target date'}${release.goal ? ` · ${release.goal}` : ''}</div>
                                <div class="sprint-progress-bar mt-2"><div class="sprint-progress-fill" style="width:${pct}%; background-color:#10b981;"></div></div>
                                <div class="text-xs opacity-75 mt-1">${done}/${rItems.length} done (${pct}%)</div>
                            </div>
                        </div>
                        <div>
                            ${rItems.length ? rItems.map(item => {
                                const due = renderDueDateBadge(item);
                                const pInfo = priorityConfig[item.priority || 'medium'];
                                return `<div class="sprint-item-row flex items-center gap-3">
                                    <span class="status-pill ${statusConfig[item.status]?.class || ''} text-[9px] min-w-[44px] text-center">${statusConfig[item.status]?.label || item.status}</span>
                                    <span class="status-pill ${pInfo.class} text-[8px] uppercase font-black">${item.priority || 'med'}</span>
                                    <span class="flex-1">${item.text}${due}</span>
                                    ${(item.contributors || []).slice(0,3).map(c => `<span class="contributor-avatar">${c.charAt(0).toUpperCase()}</span>`).join('')}
                                </div>`;
                            }).join('') : `<div class="sprint-item-row text-slate-400 italic">No items assigned to this release</div>`}
                        </div>
                    </div>`;
                });
                container.innerHTML = html;
            }

            function openReleaseEdit(releaseId) {
                if (!UPDATE_DATA.metadata.releases) UPDATE_DATA.metadata.releases = [];
                const releases = UPDATE_DATA.metadata.releases;
                const release = releaseId ? releases.find(r => r.id === releaseId) : null;
                editContext = { type: 'release', releaseId };
                document.getElementById('modal-title').innerText = release ? 'Edit Release' : 'Add Release';
                document.getElementById('modal-form').innerHTML = `
                <label class="block text-sm font-bold mb-1">Release Version / Name</label>
                <input type="text" id="edit-release-name" class="cms-input" value="${release ? release.name : ''}" placeholder="e.g. v2.4.1">
                <label class="block text-sm font-bold mb-1">Target Date</label>
                <input type="date" id="edit-release-date" class="cms-input" value="${release ? (release.targetDate||'') : ''}">
                <label class="block text-sm font-bold mb-1">Release Goal</label>
                <textarea id="edit-release-goal" class="cms-input" placeholder="What are we shipping?">${release ? (release.goal || '') : ''}</textarea>
                ${release ? `<button type="button" onclick="deleteRelease('${release.id}')" class="w-full mt-4 bg-red-50 text-red-600 font-bold py-2 rounded border border-red-200 hover:bg-red-100">Delete Release</button>` : ''}
                `;
                document.getElementById('cms-modal').classList.add('active');
            }

            function deleteRelease(id) {
                if(!confirm("Delete this release? Items won't be deleted, but will be unassigned.")) return;
                UPDATE_DATA.metadata.releases = UPDATE_DATA.metadata.releases.filter(r => r.id !== id);
                UPDATE_DATA.tracks.forEach(t => t.subtracks.forEach(s => s.items.forEach(i => { if(i.releasedIn===id) i.releasedIn=''; })));
                closeCmsModal();
                updateTabCounts();
                renderReleasesView();
                logChange('Release Deleted', id);
            }

            // ===============================================================
            // KEYBOARD SHORTCUTS
            // ===============================================================
            function setupKeyboardShortcuts() {
                document.addEventListener('keydown', e => {
                    if (document.getElementById('cms-modal').classList.contains('active')) return;
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    const viewMap = { '1':'track','2':'status','3':'priority','4':'contributor','5':'gantt','6':'backlog','7':'sprint','8':'releases' };
                    if (viewMap[e.key]) { e.preventDefault(); switchView(viewMap[e.key]); return; }
                    if (e.key === '/') { e.preventDefault(); const s = document.getElementById('global-search'); if (s) { s.focus(); s.select(); } }
                    if (e.key === 'Escape') { closeCmsModal(); }
                });
            }

            // ===============================================================
            // CMS FORM VALIDATION
            // ===============================================================
            function validateCmsForm() {
                const textEl = document.getElementById('edit-text');
                const sprintNameEl = document.getElementById('edit-sprint-name');
                let valid = true;
                document.querySelectorAll('.cms-field-error').forEach(el => el.remove());
                if (textEl && !textEl.value.trim()) {
                    textEl.style.borderColor = '#ef4444';
                    textEl.insertAdjacentHTML('afterend', '<p class="cms-field-error text-red-500 text-xs mt-1">Title is required</p>');
                    valid = false;
                }
                if (sprintNameEl && !sprintNameEl.value.trim()) {
                    sprintNameEl.style.borderColor = '#ef4444';
                    sprintNameEl.insertAdjacentHTML('afterend', '<p class="cms-field-error text-red-500 text-xs mt-1">Sprint name is required</p>');
                    valid = false;
                }
                return valid;
            }


            // ------ Subtrack collapse state persistence via sessionStorage ------
            function getCollapseKey(trackId, subtrackName) { return `khyaal_col_${trackId}_${subtrackName.replace(/\s/g,'_')}`; }
            function isSubtrackCollapsed(trackId, subtrackName) { return sessionStorage.getItem(getCollapseKey(trackId, subtrackName)) === '1'; }
            function setSubtrackCollapsed(trackId, subtrackName, v) { sessionStorage.setItem(getCollapseKey(trackId, subtrackName), v ? '1' : '0'); }

            function renderTrackView() {
                const container = document.getElementById('track-view');
                let html = '';

                const themeColors = {
                    blue: '#1e40af',      // Stronger Blue for accessibility
                    emerald: '#065f46',   // Stronger Emerald
                    violet: '#5b21b6',    // Stronger Violet
                    amber: '#92400e',     // Stronger Amber
                    rose: '#9f1239',      // Stronger Rose
                    slate: '#334155'      // Stronger Slate
                };

                const activeTeam = getActiveTeam();
                UPDATE_DATA.tracks.forEach((track, trackIndex) => {
                    if (activeTeam && activeTeam !== track.name) return;
                    const accentColor = themeColors[track.theme] || '#0f172a';
                    html += `<div class="track-card" style="border-color: ${accentColor}">`;
                    html += `
                        <div class="track-header" style="background: linear-gradient(135deg, ${accentColor} 0%, #1e293b 100%)">
                            <div class="flex justify-between items-center w-full">
                                <span>${track.name}</span>
                                <div class="flex gap-2">
                                    ${isAuthenticated ? `
                                    <button onclick="addSubtrack(${trackIndex})" class="bg-white/10 hover:bg-white/20 p-1 rounded text-xs px-2 transition-colors font-bold">Add Subtrack</button>
                                    <button onclick="openTrackEdit(${trackIndex})" class="bg-white/10 hover:bg-white/20 p-1 rounded text-xs px-2 transition-colors">Edit</button>
                                    <button onclick="deleteTrack(${trackIndex})" class="bg-white/10 hover:bg-white/20 p-1 rounded text-xs px-2 transition-colors">Delete</button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;

                    track.subtracks.forEach((subtrack, subtrackIndex) => {
                        subtrack.items = subtrack.items.filter(isItemMatchingTagFilter);
                        // Calculate Subtrack Progress early (exclude 'later' and backlog items)
                        const activeItemsSub = subtrack.items.filter(i => i.status !== 'later');
                        const totalActiveSub = activeItemsSub.length;
                        const doneItemsSub = activeItemsSub.filter(i => i.status === 'done').length;
                        const percent = totalActiveSub > 0 ? Math.round((doneItemsSub / totalActiveSub) * 100) : 0;
                        const blockerCount = subtrack.items.filter(i => i.blocker).length;

                        // Use track.id (not name) to avoid icon ID collisions across tracks
                        const iconId = `icon-${track.id || trackIndex}-${subtrackIndex}`;
                        const collapsed = isSubtrackCollapsed(track.id || String(trackIndex), subtrack.name);
                        const rotateClass = collapsed ? 'style="transform:rotate(-90deg)"' : '';

                        html += `<div class="subtrack-section" data-track="${trackIndex}" data-sub="${subtrackIndex}"
                            ondragover="event.preventDefault(); this.classList.add('drag-over')"
                            ondragleave="this.classList.remove('drag-over')"
                            ondrop="handleDrop(event, ${trackIndex}, ${subtrackIndex}); this.classList.remove('drag-over')">`;
                        html += `
                            <div class="subtrack-title flex justify-between items-center px-4 py-3 mb-1 cursor-pointer transition-all duration-300 rounded-r-lg group/sub" 
                                 onclick="toggleSubtrack('${track.id || trackIndex}', '${subtrack.name}', '${iconId}')"
                                 style="border-left: 6px solid ${accentColor}; 
                                        background: linear-gradient(to right, ${accentColor}18 ${percent}%, #f8fafc ${percent}%);
                                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                                
                                <div class="flex items-center gap-4 flex-1 min-w-0">
                                    <span class="font-black text-slate-900 text-lg truncate">${subtrack.name}</span>
                                    <span class="flex-shrink-0 text-[11px] font-black text-slate-600 bg-white/90 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm tracking-wider">${percent}%</span>
                                    ${blockerCount > 0 ? `<span class="flex-shrink-0 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">&#128274; ${blockerCount} blocker${blockerCount > 1 ? 's' : ''}</span>` : ''}
                                </div>

                                <div class="flex gap-2 items-center flex-shrink-0">
                                    ${window.isAuthenticated === true ? `
                                    <div class="flex gap-1" onclick="event.stopPropagation()">
                                        <button onclick="addItem(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md hover:bg-emerald-100 font-bold border border-emerald-100 shadow-sm transition-colors uppercase tracking-wider">Add Item</button>
                                        <button onclick="openSubtrackEdit(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md hover:bg-blue-100 font-bold border border-blue-100 shadow-sm transition-colors uppercase tracking-wider">Edit</button>
                                        <button onclick="deleteSubtrack(${trackIndex}, ${subtrackIndex})" class="text-[10px] bg-red-50 text-red-700 px-2.5 py-1.5 rounded-md hover:bg-red-100 font-bold border border-red-100 shadow-sm transition-colors uppercase tracking-wider">Delete</button>
                                    </div>
                                    ` : ''}
                                    <span class="ml-2 text-slate-400">
                                        <svg class="w-5 h-5 transition-transform duration-200" id="${iconId}" ${rotateClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                    </span>
                                </div>
                            </div>
                        `;

                        html += `<div id="body-${iconId}" ${collapsed ? 'style="display:none"' : ''}>`;
                        const statusOrder = { "done": 1, "ongoing": 2, "now": 3, "next": 4, "later": 5 };

                        // Map items to include their original index for correct editing
                        let itemsWithIndex = subtrack.items.map((item, originalIndex) => ({
                            ...item,
                            originalIndex
                        }));

                        // Filter items by date if a filter is active
                        let items = itemsWithIndex.filter(item => isItemInDateRange(item));
                        if (window.currentDateFilter && window.currentDateFilter !== 'all') {
                            items = items.filter(item => {
                                if (window.currentDateFilter === 'Legacy') return !item.publishedDate;
                                if (!item.publishedDate) return false;
                                const d = new Date(item.publishedDate);
                                return d.toLocaleString('default', { month: 'short', year: 'numeric' }) === window.currentDateFilter;
                            });
                        }

                        // Apply Global Search
                        items = items.filter(item => isItemInSearch(item));

                        const sortedItems = [...items].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
                        if (sortedItems.length === 0) {
                            html += `<div class="empty-subtrack">No items yet${window.currentDateFilter && window.currentDateFilter !== 'all' ? ' for this filter' : ''}.</div>`;
                        } else {
                            sortedItems.forEach((item) => {
                                html += renderItem(item, subtrack.note, trackIndex, subtrackIndex, item.originalIndex);
                            });
                        }

                        if (isAuthenticated) {
                            html += `
                            <div class="px-6 pb-4">
                                <button onclick="addItem(${trackIndex}, ${subtrackIndex})" class="cms-add-btn">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                                    Add Item
                                </button>
                            </div>
                        `;
                        }

                        html += `</div></div>`;
                    });

                    html += `</div>`;
                });

                container.innerHTML = html;
            }

            function toggleSubtrack(trackId, subtrackName, iconId) {
                const body = document.getElementById('body-' + iconId);
                const icon = document.getElementById(iconId);
                if (!body) return;
                const isNowCollapsed = body.style.display !== 'none';
                body.style.display = isNowCollapsed ? 'none' : '';
                if (icon) icon.style.transform = isNowCollapsed ? 'rotate(-90deg)' : '';
                setSubtrackCollapsed(trackId, subtrackName, isNowCollapsed);
            }

            // Drag-and-drop: move item across subtracks
            let dragSource = null;
            function handleDrop(event, targetTrackIndex, targetSubtrackIndex) {
                event.preventDefault();
                if (!dragSource) return;
                const { trackIndex: sT, subtrackIndex: sS, itemIndex: sI } = dragSource;
                if (sT === targetTrackIndex && sS === targetSubtrackIndex) { dragSource = null; return; }
                const [item] = UPDATE_DATA.tracks[sT].subtracks[sS].items.splice(sI, 1);
                UPDATE_DATA.tracks[targetTrackIndex].subtracks[targetSubtrackIndex].items.push(item);
                dragSource = null;
                renderTrackView();
                updateBacklogBadge();
            }

            function renderItem(item, subtrackNote, trackIndex, subtrackIndex, itemIndex) {
                const status = statusConfig[item.status];
                const priority = item.priority || 'medium';
                const priorityInfo = priorityConfig[priority];
                const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
                const usecaseRaw = item.usecase ? `<div class="usecase-box"><span class="font-bold">Impact:</span> ${item.usecase}</div>` : '';
                const usecase = highlightSearch(usecaseRaw);
                const due = renderDueDateBadge(item);
                const tags = renderTagPills(item.tags);
                const blockerStrip = item.blocker ? `<div class="blocker-strip"><span class="blocker-badge">&#128274; Blocker</span>${item.blockerNote || 'This item is flagged as a blocker'}</div>` : '';

                const displayText = highlightSearch(item.text);
                let contentHtml = `${displayText}${due}`;
                const effectiveNote = item.note || subtrackNote;

                if (effectiveNote) {
                    let cleanNote = effectiveNote.replace(/<[^>]*>?/gm, '').replace('Note:', '').trim();
                    cleanNote = highlightSearch(cleanNote);
                    const idHTML = isAuthenticated ? `<div class="mt-2 pt-2 border-t border-slate-200 text-[0.65rem] font-mono text-slate-400">ID: ${item.id}</div>` : '';
                    contentHtml = `
                    <div class="info-wrapper">
                        <span class="info-text">${displayText}${due}</span>
                        <button class="info-btn" aria-label="More information">i</button>
                        <div class="tooltip-content" role="tooltip">
                            <span class="block font-bold mb-1">${item.note ? 'Item Note:' : 'Subtrack Note:'}</span>
                            ${cleanNote}
                            ${idHTML}
                        </div>
                    </div>
                `;
                }

                let cmsControls = '';
                if (isAuthenticated) {
                    cmsControls = `
                    <div class="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span onclick="event.stopPropagation(); openItemEdit(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer font-bold underline underline-offset-2">Edit</span>
                        <span onclick="event.stopPropagation(); deleteItem(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="text-[11px] text-red-600 hover:text-red-800 cursor-pointer font-bold underline underline-offset-2">Delete</span>
                        <button onclick="event.stopPropagation(); sendToBacklog(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="send-to-backlog-btn">→ Backlog</button>
                        <button onclick="event.stopPropagation(); toggleBlocker(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="send-to-backlog-btn ${item.blocker ? 'text-red-600 border-red-200 bg-red-50' : ''}">${item.blocker ? '&#128275; Unblock' : '&#128274; Flag Blocker'}</button>
                    </div>
                `;
                }

                return `
                ${blockerStrip}
                <div class="item-row ${status.bucket}"
                    draggable="${isAuthenticated ? 'true' : 'false'}"
                    ondragstart="if(${isAuthenticated}){dragSource={trackIndex:${trackIndex},subtrackIndex:${subtrackIndex},itemIndex:${itemIndex}};this.classList.add('dragging');}"
                    ondragend="this.classList.remove('dragging')">
                    <div class="item-content">
                        <div class="flex justify-between items-start w-full gap-4">
                            <div class="flex items-start gap-4 flex-1">
                                <div class="flex flex-col gap-1 items-center flex-shrink-0 mt-1">
                                    <span class="status-pill ${status.class} text-[10px] py-0.5 w-full text-center min-w-[54px]">${status.label}</span>
                                    <span class="status-pill ${priorityInfo.class} text-[9px] py-0 px-1 opacity-80 uppercase font-black tracking-tighter w-full text-center">${priorityLabel}</span>
                                </div>
                                <div class="text-sm text-slate-800 font-semibold leading-tight flex-1">
                                    <div class="mb-1">${contentHtml}</div>
                                    <div class="flex flex-wrap items-center gap-2 mb-1">
                                        ${item.sprintId ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">🏃 ${(UPDATE_DATA.metadata.sprints||[]).find(s=>s.id===item.sprintId)?.name || item.sprintId}</span>` : ''}
                                        ${item.releasedIn ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">📦 ${(UPDATE_DATA.metadata.releases||[]).find(r=>r.id===item.releasedIn)?.name || item.releasedIn}</span>` : ''}
                                        ${tags ? `<div class="flex flex-wrap gap-1">${tags}</div>` : ''}
                                    </div>
                                    <div class="mb-2">${usecase}</div>
                                    <div class="flex flex-wrap items-center gap-2">
                                        <button onclick="event.stopPropagation(); toggleComments(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors">💬 ${(item.comments||[]).length} Comments</button>
                                        ${cmsControls ? `<div>${cmsControls}</div>` : ''}
                                    </div>
                                    <div id="comments-${trackIndex}-${subtrackIndex}-${itemIndex}" class="hidden w-full mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg" onclick="event.stopPropagation()">
                                        <div id="thread-${trackIndex}-${subtrackIndex}-${itemIndex}" class="space-y-3 mb-3 max-h-48 overflow-y-auto pr-2">
                                            ${renderCommentThread(item.comments, trackIndex, subtrackIndex, itemIndex)}
                                        </div>
                                        ${isAuthenticated ? `
                                            <div class="flex gap-2 relative">
                                                <input type="text" id="comment-input-${trackIndex}-${subtrackIndex}-${itemIndex}" placeholder="Type @ to tag contributors..." class="cms-input flex-1 !mb-0 text-xs" onkeyup="if(event.key==='Enter') addComment(${trackIndex},${subtrackIndex},${itemIndex})">
                                                <button onclick="addComment(${trackIndex}, ${subtrackIndex}, ${itemIndex})" class="cms-btn cms-btn-primary !px-3 !py-1 flex-shrink-0 text-xs shadow-sm">Post</button>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="flex-shrink-0">
                                <div class="flex flex-wrap justify-end gap-1">
                                    ${renderContributors(item.contributors)}
                                </div>
                            </div>
                        </div>
                        ${item.mediaUrl ? `
                            <div class="mt-2 group relative inline-block">
                                <a href="${item.mediaUrl}" target="_blank" onclick="event.stopPropagation()">
                                    <img src="${item.mediaUrl}" class="h-10 w-16 object-cover rounded border border-slate-200 shadow-sm cursor-zoom-in hover:scale-105 transition-transform" 
                                         onerror="this.style.display='none'">
                                </a>
                                <div class="hidden group-hover:block absolute -top-8 left-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">Click to view full image</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            }


            function renderStatusView() {
                const container = document.getElementById('status-view');
                const statuses = ['done', 'now', 'ongoing', 'next', 'later'];
                const statusTitles = {
                    done: 'Done',
                    now: 'Now',
                    ongoing: 'On-Going',
                    next: 'Next',
                    later: 'Later'
                };
                
                if (UPDATE_DATA.metadata && UPDATE_DATA.metadata.customStatuses) {
                    UPDATE_DATA.metadata.customStatuses.forEach(cs => {
                        if (!statuses.includes(cs.id)) {
                            statuses.push(cs.id);
                            statusTitles[cs.id] = cs.label;
                        }
                    });
                }

                const themeColors = {
                    blue: '#1e40af',
                    emerald: '#065f46',
                    violet: '#5b21b6',
                    amber: '#92400e',
                    rose: '#9f1239',
                    slate: '#334155'
                };

                const subtrackNotes = {};
                UPDATE_DATA.tracks.forEach(track => {
                    track.subtracks.forEach(subtrack => {
                        if (subtrack.note) subtrackNotes[subtrack.name] = subtrack.note;
                    });
                });

                let html = '';
                const activeTeam = getActiveTeam();

                statuses.forEach(status => {
                    let items = [];
                    UPDATE_DATA.tracks.forEach((track, trackIndex) => {
                        if (activeTeam && activeTeam !== track.name) return;
                        track.subtracks.forEach((subtrack, subtrackIndex) => {
                            subtrack.items.filter(isItemMatchingTagFilter).forEach((item, itemIndex) => {
                                if (item.status === status) {
                                    if (!isItemInDateRange(item)) return;
                                    if (window.currentDateFilter && window.currentDateFilter !== 'all' && window.currentDateFilter !== 'All Entries') {
                                        if (window.currentDateFilter === 'Legacy') { if (item.publishedDate) return; }
                                        else {
                                            if (!item.publishedDate) return;
                                            const d = new Date(item.publishedDate);
                                            if (d.toLocaleString('default', { month: 'short', year: 'numeric' }) !== window.currentDateFilter) return;
                                        }
                                    }
                                    items.push({ ...item, track: track.name, trackTheme: track.theme, subtrack: subtrack.name, trackIndex, subtrackIndex, itemIndex });
                                }
                            });
                        });
                    });

                    const seen = new Set();
                    items = items.filter(i => { const d = seen.has(i.text); seen.add(i.text); return !d; });

                    if (items.length > 0) {
                        const config = statusConfig[status];
                        html += `
                        <div class="status-card">
                            <div class="${config.class} text-white px-6 py-4 font-bold flex items-center gap-3 text-lg status-sticky-header">
                                <div class="w-2.5 h-2.5 bg-white rounded-full shadow-sm"></div>
                                ${statusTitles[status]}
                                <span class="ml-auto text-sm font-normal opacity-90">${items.length} items</span>
                            </div>
                            <div class="p-1">
                    `;

                        items.forEach(item => {
                            const trackColor = themeColors[item.trackTheme] || '#64748b';
                            const effectiveNote = item.note || subtrackNotes[item.subtrack];
                            let contentHtml = `${highlightSearch(item.text)}${renderDueDateBadge(item)}`;
                            if (effectiveNote) {
                                const cleanNote = effectiveNote.replace(/<[^>]*>?/gm, '').replace('Note:', '').trim();
                                const idHTML = isAuthenticated ? `<div class="mt-2 pt-2 border-t border-slate-200 text-[0.65rem] font-mono text-slate-400">ID: ${item.id}</div>` : '';
                                contentHtml = `
                                <div class="info-wrapper">
                                    <span class="info-text">${highlightSearch(item.text)}${renderDueDateBadge(item)}</span>
                                    <button class="info-btn">i</button>
                                    <div class="tooltip-content" role="tooltip">
                                        <span class="block font-bold mb-1">${item.note ? 'Item Note:' : 'Subtrack Note:'}</span>
                                        ${cleanNote}
                                        ${idHTML}
                                    </div>
                                </div>
                            `;
                            }

                            html += `
                            <div class="item-row hover:bg-slate-50 transition-colors">
                                <div class="flex justify-between items-start w-full gap-4">
                                    <div class="flex-1">
                                        <div class="text-sm font-semibold text-slate-800 leading-tight">
                                            <span style="color: ${trackColor}; background: ${trackColor}10;" class="px-2 py-0.5 rounded-md font-bold text-[0.65rem] uppercase tracking-wider inline-block mb-1.5 border border-slate-200">
                                                ${item.track} &rarr; ${item.subtrack}
                                            </span>
                                            <div class="flex items-start gap-4">
                                                <div class="flex flex-col gap-1 items-center flex-shrink-0 mt-0.5">
                                                    <span class="status-pill ${statusConfig[item.status].class} min-w-[54px] text-center">${statusConfig[item.status].label}</span>
                                                    <span class="status-pill ${priorityConfig[item.priority||'medium'].class} text-[9px] py-0 px-1 opacity-80 uppercase font-black text-center">${priorityConfig[item.priority||'medium'].label}</span>
                                                </div>
                                                <div class="flex-1">
                                                    <div class="mb-1">${contentHtml}</div>
                                                    <div class="mb-2">${item.usecase ? `<div class="usecase-box mt-1 text-xs font-normal"><span class="font-bold">Impact:</span> ${item.usecase}</div>` : ''}</div>
                                                    ${isAuthenticated ? `<div class="flex items-center gap-3 mt-1.5 flex-wrap">
                                                        <span onclick="event.stopPropagation(); openItemEdit(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})" class="text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer font-bold underline underline-offset-2">Edit</span>
                                                        <span onclick="event.stopPropagation(); deleteItem(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})" class="text-[11px] text-red-600 hover:text-red-800 cursor-pointer font-bold underline underline-offset-2">Delete</span>
                                                    </div>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex-shrink-0 pt-1">
                                        <div class="flex flex-wrap justify-end gap-1">
                                            ${renderContributors(item.contributors)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        });

                        html += `</div></div>`;
                    }
                });

                container.innerHTML = html;
            }

            function renderPriorityView() {
                const container = document.getElementById('priority-view');
                const priorities = ['high', 'medium', 'low'];
                const priorityTitles = {
                    high: 'High Priority (Critical & Urgent)',
                    medium: 'Medium Priority (Important, Standard)',
                    low: 'Low Priority (Nice-to-have, Backlog)'
                };

                const themeColors = {
                    blue: '#1e40af',
                    emerald: '#065f46',
                    violet: '#5b21b6',
                    amber: '#92400e',
                    rose: '#9f1239',
                    slate: '#334155'
                };

                const subtrackNotes = {};
                UPDATE_DATA.tracks.forEach(track => {
                    track.subtracks.forEach(subtrack => {
                        if (subtrack.note) subtrackNotes[subtrack.name] = subtrack.note;
                    });
                });

                let html = '';

                const activeTeam = getActiveTeam();
                priorities.forEach(priority => {
                    let items = [];
                    UPDATE_DATA.tracks.forEach((track, trackIndex) => {
                        if (activeTeam && activeTeam !== track.name) return;
                        track.subtracks.forEach((subtrack, subtrackIndex) => {
                        subtrack.items = subtrack.items.filter(isItemMatchingTagFilter);
                            subtrack.items.forEach((item, itemIndex) => {
                                const itemPriority = item.priority || 'medium';
                                if (itemPriority === priority) {
                                    if (!isItemInDateRange(item)) return;

                                    if (window.currentDateFilter && window.currentDateFilter !== 'all') {
                                        if (window.currentDateFilter === 'Legacy') {
                                            if (item.publishedDate) return;
                                        } else {
                                            if (!item.publishedDate) return;
                                            const d = new Date(item.publishedDate);
                                            if (d.toLocaleString('default', { month: 'short', year: 'numeric' }) !== window.currentDateFilter) return;
                                        }
                                    }

                                    items.push({
                                        ...item,
                                        track: track.name,
                                        trackTheme: track.theme,
                                        subtrack: subtrack.name,
                                        trackIndex,
                                        subtrackIndex,
                                        itemIndex
                                    });
                                }
                            });
                        });
                    });

                    const seen = new Set();
                    items = items.filter(item => {
                        const duplicate = seen.has(item.text);
                        seen.add(item.text);
                        return !duplicate;
                    });

                    if (items.length > 0) {
                        const config = priorityConfig[priority];
                        html += `
                        <div class="status-card">
                            <div class="${config.class} px-6 py-4 font-bold flex items-center gap-3 text-lg status-sticky-header" style="color: inherit;">
                                <div class="w-2.5 h-2.5 rounded-full shadow-sm" style="background: currentColor;"></div>
                                ${priorityTitles[priority]}
                                <span class="ml-auto text-sm font-normal opacity-70">${items.length} items</span>
                            </div>
                            <div>
                    `;

                        items.forEach(item => {
                            const status = statusConfig[item.status];
                            const trackColor = themeColors[item.trackTheme] || '#64748b';
                            const usecase = item.usecase ? `<div class="usecase-box mt-1 text-xs"><span class="font-bold">Impact:</span> ${item.usecase}</div>` : '';
                            const due = item.due ? `<span class="ml-1 text-[0.65rem] font-bold text-orange-700">[${item.due}]</span>` : '';
                            const subtrackNote = subtrackNotes[item.subtrack];
                            const effectiveNote = item.note || subtrackNote;

                            let contentHtml = `${highlightSearch(item.text)}${due}`;
                            if (effectiveNote) {
                                const cleanNote = effectiveNote.replace(/<[^>]*>?/gm, '').replace('Note:', '').trim();
                                contentHtml = `
                                <div class="info-wrapper">
                                    <span class="info-text">${highlightSearch(item.text)}${due}</span>
                                    <button class="info-btn" aria-label="More information">i</button>
                                    <div class="tooltip-content" role="tooltip">
                                        <span class="block font-bold mb-1">${item.note ? 'Item Note:' : 'Subtrack Note:'}</span>
                                        ${cleanNote}
                                    </div>
                                </div>
                            `;
                            }

                            html += `
                            <div class="item-row hover:bg-slate-50 transition-colors">
                                <div class="flex justify-between items-start w-full gap-4">
                                    <div class="flex-1">
                                        <div class="text-sm font-semibold text-slate-800 leading-tight">
                                            <span style="color: ${trackColor}; background: ${trackColor}10;" class="px-2 py-0.5 rounded-md font-bold text-[0.65rem] uppercase tracking-wider inline-block mb-1.5 border border-${item.trackTheme}-200">
                                                ${item.track} &rarr; ${item.subtrack}
                                            </span>
                                            <div class="flex items-start gap-4">
                                                <div class="flex flex-col gap-1 items-center flex-shrink-0 mt-0.5">
                                                    <span class="status-pill ${status.class} min-w-[54px] text-center">${status.label}</span>
                                                    ${(() => {
                                                        const pInfo = priorityConfig[item.priority || 'medium'];
                                                        return `<span class="status-pill ${pInfo.class} text-[9px] py-0 px-1 opacity-80 uppercase font-black tracking-tighter text-center">${pInfo.label}</span>`;
                                                    })()}
                                                </div>
                                                <div class="flex-1">
                                                    <div class="mb-1">${contentHtml}</div>
                                                    <div class="mb-2">${usecase}</div>
                                                    ${isAuthenticated ? `<div class="flex items-center gap-3 mt-1.5 flex-wrap">
                                                        <span onclick="event.stopPropagation(); openItemEdit(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})" class="text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer font-bold underline underline-offset-2">Edit</span>
                                                        <span onclick="event.stopPropagation(); deleteItem(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})" class="text-[11px] text-red-600 hover:text-red-800 cursor-pointer font-bold underline underline-offset-2">Delete</span>
                                                        <button onclick="event.stopPropagation(); sendToBacklog(${item.trackIndex}, ${item.subtrackIndex}, ${item.itemIndex})" class="send-to-backlog-btn">&rarr; Backlog</button>
                                                    </div>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex-shrink-0 pt-1">
                                        <div class="flex flex-wrap justify-end gap-1">
                                            ${renderContributors(item.contributors)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        });

                        html += `</div></div>`;
                    }
                });

                container.innerHTML = html;
            }

            function renderContributorView() {
                const container = document.getElementById('contributor-view');
                if (!container) return;
                const contributors = {};
                const subtrackNotes = {};
                const activeTeam = getActiveTeam();

                UPDATE_DATA.tracks.forEach(track => {
                    if (activeTeam && activeTeam !== track.name) return;
                    track.subtracks.forEach(subtrack => {
                        if (subtrack.note) subtrackNotes[subtrack.name] = subtrack.note;
                        subtrack.items.forEach(item => {
                            if (!isItemInDateRange(item)) return;
                            if (window.currentDateFilter && window.currentDateFilter !== 'all') {
                                if (window.currentDateFilter === 'Legacy') { if (item.publishedDate) return; }
                                else {
                                    if (!item.publishedDate) return;
                                    const d = new Date(item.publishedDate);
                                    if (d.toLocaleString('default', { month: 'short', year: 'numeric' }) !== window.currentDateFilter) return;
                                }
                            }
                            (item.contributors || []).forEach(name => {
                                if (!contributors[name]) contributors[name] = [];
                                contributors[name].push({ ...item, track: track.name, trackTheme: track.theme, subtrack: subtrack.name });
                            });
                        });
                    });
                });

                const sortedNames = Object.keys(contributors).sort((a, b) => {
                    const getUnique = (n) => { const seen = new Set(); return contributors[n].filter(i => { const d = seen.has(i.text); seen.add(i.text); return !d; }).length; };
                    const countA = getUnique(a), countB = getUnique(b);
                    return countB !== countA ? countB - countA : a.localeCompare(b);
                });

                let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
                sortedNames.forEach(name => {
                    const seen = new Set();
                    const items = contributors[name].filter(i => { const d = seen.has(i.text); seen.add(i.text); return !d; });
                    const colorClass = contributorColors[name] || 'bg-gray-600';
                    html += `<div class="contributor-card">
                        <div class="contributor-header ${colorClass.replace('text-', 'text-white').replace('border', '')}" style="background: linear-gradient(135deg, var(--tw-gradient-from, #4f46e5), var(--tw-gradient-to, #7c3aed));">
                            <h3 class="font-bold text-xl relative z-10">${name}</h3>
                            <p class="text-white/80 text-sm relative z-10">${items.length} deliverables</p>
                        </div>
                        <div class="p-5 space-y-8">`;
                    
                    ['done', 'now', 'ongoing', 'next', 'later'].forEach(status => {
                        const statusItems = items.filter(i => i.status === status);
                        if (statusItems.length > 0) {
                            html += `<div class="status-section">
                                <div class="status-header" style="color: ${status === 'done' ? '#166534' : status === 'now' ? '#1e40af' : status === 'ongoing' ? '#92400e' : status === 'next' ? '#9a3412' : '#374151'}">
                                    <div class="w-1.5 h-1.5 rounded-full" style="background: currentColor"></div>
                                    ${statusConfig[status].label} (${statusItems.length})
                                </div>
                                <ul class="space-y-4 pl-3.5">`;
                            statusItems.forEach(item => {
                                const effectiveNote = item.note || subtrackNotes[item.subtrack];
                                let contentHtml = `${item.text}${renderDueDateBadge(item)}`;
                                if (effectiveNote) {
                                    const cleanNote = effectiveNote.replace(/<[^>]*>?/gm, '').replace('Note:', '').trim();
                                    contentHtml = `<div class="info-wrapper"><span class="info-text">• ${item.text}${renderDueDateBadge(item)}</span><button class="info-btn">i</button><div class="tooltip-content"><span class="block font-bold mb-1">${item.note ? 'Item Note:' : 'Subtrack Note:'}</span>${cleanNote}</div></div>`;
                                }
                                html += `<li class="text-sm text-slate-700 leading-snug">
                                    <div class="flex flex-col gap-1">
                                        <div class="font-medium">${contentHtml}</div>
                                        ${item.mediaUrl ? `<div class="mt-2 group relative inline-block"><img src="${item.mediaUrl}" class="h-10 w-16 object-cover rounded border border-slate-200 shadow-sm cursor-zoom-in hover:scale-105" onclick="window.open('${item.mediaUrl}', '_blank')" onerror="this.style.display='none'"></div>` : ''}
                                        <div class="mt-1 text-[0.6rem] font-bold uppercase tracking-wider opacity-80" style="color: ${themeColors[item.trackTheme] || '#64748b'}">
                                            <span class="status-pill ${priorityConfig[item.priority||'medium'].class} text-[9px] py-0 px-1 opacity-80 uppercase font-black">${priorityConfig[item.priority||'medium'].label}</span>
                                            ${item.track} → ${item.subtrack}
                                        </div>
                                    </div>
                                </li>`;
                            });
                            html += `</ul></div>`;
                        }
                    });
                    html += `</div></div>`;
                });
                container.innerHTML = html + '</div>';
            }

            function renderDependencyView() {
                const container = document.getElementById('dependency-view');
                if (!container) return;
                let mermaidSyntax = 'graph TD\n';
                let hasDependencies = false;
                const activeTeam = getActiveTeam();
                const nodes = new Map();
                const edges = [];

                UPDATE_DATA.tracks.forEach(track => {
                    if (activeTeam && activeTeam !== track.name) return;
                    track.subtracks.forEach(subtrack => {
                        subtrack.items.forEach(item => {
                            if (item.status === 'done' || item.status === 'later') return;
                            const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, '_');
                            const label = item.text.replace(/["\\\\]/g, '').replace(/[^a-zA-Z0-9 .,!?_-]/g, '').substring(0, 40) + '...';
                            let nodeStyle = '';
                            if (item.status === 'now') nodeStyle = 'style ' + safeId + ' fill:#dbeafe,stroke:#1e40af,color:#1e3a8a';
                            else if (item.status === 'ongoing') nodeStyle = 'style ' + safeId + ' fill:#f3e8ff,stroke:#6b21a8,color:#581c87';
                            else if (item.status === 'next') nodeStyle = 'style ' + safeId + ' fill:#fef3c7,stroke:#b45309,color:#92400e';
                            nodes.set(safeId, { label, style: nodeStyle });

                            if (item.dependencies) {
                                hasDependencies = true;
                                item.dependencies.split(',').map(d => d.trim()).filter(d => d).forEach(dep => {
                                    edges.push(`${dep.replace(/[^a-zA-Z0-9_-]/g, '_')} --> ${safeId}`);
                                });
                            }
                        });
                    });
                });

                if (!hasDependencies) {
                    container.innerHTML = '<div class="flex flex-col items-center justify-center p-16 text-slate-400 font-medium text-lg"><i class="fas fa-project-diagram text-4xl mb-4 text-slate-300"></i>No active cross-task dependencies tracked.</div>';
                    return;
                }

                nodes.forEach((data, id) => {
                    mermaidSyntax += `    ${id}["${data.label}"]\n`;
                    if (data.style) mermaidSyntax += `    ${data.style}\n`;
                });
                edges.forEach(edge => { mermaidSyntax += `    ${edge}\n`; });

                container.innerHTML = `<div class="bg-white border border-slate-200 rounded-lg p-6 w-full min-h-[500px] shadow-sm overflow-auto flex justify-center"><div class="mermaid">${mermaidSyntax}</div></div>`;
                if (window.mermaid) {
                    setTimeout(() => { try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {} }, 50);
                }
            }

            // Draw a red reference line for 'Today' on top of the Gantt chart

            function renderGanttView() {
                google.charts.load('current', { 'packages': ['gantt'] });
                google.charts.setOnLoadCallback(drawGanttChart);
            }

            function drawGanttChart() {
                const data = new google.visualization.DataTable();
                data.addColumn('string', 'Task ID');
                data.addColumn('string', 'Task Name');
                data.addColumn('string', 'Resource');
                data.addColumn('date', 'Start Date');
                data.addColumn('date', 'End Date');
                data.addColumn('number', 'Duration');
                data.addColumn('number', 'Percent Complete');
                data.addColumn('string', 'Dependencies');

                // First pass: collect IDs that will be rendered
                const renderedIds = new Set();
                const activeTeam = getActiveTeam();
                UPDATE_DATA.tracks.forEach(track => {
                    if (activeTeam && activeTeam !== track.name) return;
                    track.subtracks.forEach(subtrack => {
                        subtrack.items.forEach(item => {
                            if (!isItemInDateRange(item)) return;
                            const isMilestone = item.text.toLowerCase().includes('launch') || item.text.toLowerCase().includes('milestone');
                            if (isMilestone) {
                                const mDate = item.startDate ? new Date(item.startDate) : (item.due ? new Date(item.due) : null);
                                if (mDate && !isNaN(mDate.getTime())) {
                                    renderedIds.add(item.id);
                                }
                            } else if (item.startDate && item.due) {
                                const start = new Date(item.startDate);
                                const end = new Date(item.due);
                                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                                    renderedIds.add(item.id);
                                }
                            }
                        });
                    });
                });

                const rows = [];
                UPDATE_DATA.tracks.forEach(track => {
                    track.subtracks.forEach(subtrack => {
                        subtrack.items.forEach(item => {
                            if (!renderedIds.has(item.id)) return;

                            const isMilestone = item.text.toLowerCase().includes('launch') || item.text.toLowerCase().includes('milestone');
                            let start = item.startDate ? new Date(item.startDate) : new Date(item.due);
                            let end = item.due ? new Date(item.due) : new Date(item.startDate);

                            if (isMilestone) {
                                if (!item.startDate) start = end;
                                if (!item.due) end = start;
                            }

                            // If it's a milestone (start and end are same or close, or specific flag)
                            // In Google Charts Gantt, a milestone is a task with duration 0.
                            const duration = isMilestone ? 0 : null; // Google Gantt uses end date if duration is null

                            // Percentage based on status
                            let percent = 0;
                            if (item.status === 'done') percent = 100;
                            else if (item.status === 'ongoing') percent = 75;
                            else if (item.status === 'now') percent = 25;

                            // Filter dependencies: only include those that are also being rendered
                            let cleanDeps = null;
                            if (item.dependencies) {
                                const depList = item.dependencies.split(',')
                                    .map(d => d.trim())
                                    .filter(d => d && renderedIds.has(d));
                                if (depList.length > 0) {
                                    cleanDeps = depList.join(',');
                                }
                            }

                            rows.push([
                                item.id,
                                item.text,
                                track.name,
                                start,
                                end,
                                duration,
                                percent,
                                cleanDeps
                            ]);
                        });
                    });
                });

                // Add Global Milestones from metadata if any
                if (UPDATE_DATA.metadata.milestones) {
                    UPDATE_DATA.metadata.milestones.forEach((m, idx) => {
                        const mDate = new Date(m.date);
                        data.addRow([ `ms-${idx}`, m.text, 'Milestone', mDate, mDate, 0, 100, null ]);
                    });
                }
                
                // Add TODAY milestone
                const today = new Date();
                data.addRow([ 'today-milestone', 'TODAY', 'Milestone', today, today, 0, 100, null ]);

                if (rows.length === 0) {
                    document.getElementById('gantt-chart-container').innerHTML = '<div class="text-center py-10 text-slate-500">No tasks found for the selected date range.</div>';
                    return;
                }

                data.addRows(rows);

                const options = {
                    height: rows.length * 40 + 80,
                    gantt: {
                        trackHeight: 40,
                        barHeight: 25,
                        labelStyle: {
                            fontName: 'Inter',
                            fontSize: 12,
                            color: '#1e293b'
                        }
                    }
                };

                const chart = new google.visualization.Gantt(document.getElementById('gantt-chart-container'));
                
                // Add a dynamic "Today" milestone so PMs can track current progress easily
                data.addRow([
                    'gantt-marker-today',
                    '📍 TODAY',
                    'Milestone',
                    new Date(),
                    new Date(),
                    0,
                    100,
                    null
                ]);

                chart.draw(data, options);
            }

            function exportData(format) {
                if (format === 'csv') {
                    let csv = 'Task ID,Track,Subtrack,Text,Status,Priority,Start Date,Due Date,Contributors,Sprint,Released In,Blocker,Tags,Impact\n';
                    UPDATE_DATA.tracks.forEach(track => {
                        track.subtracks.forEach(subtrack => {
                            subtrack.items.forEach(item => {
                                if (!isItemInDateRange(item)) return;
                                const esc = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
                                csv += `${esc(item.id)},${esc(track.name)},${esc(subtrack.name)},${esc(item.text)},${esc(item.status)},${esc(item.priority || 'medium')},${esc(item.startDate)},${esc(item.due)},${esc((item.contributors||[]).join('; '))},${esc(item.sprintId)},${esc(item.releasedIn)},${item.blocker ? 'Yes' : 'No'},${esc((item.tags||[]).join('; '))},${esc(item.usecase)}\n`;
                            });
                        });
                    });

                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.setAttribute('download', `engineering_updates_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }

            function generateDigest() {
                const today = new Date().toLocaleDateString();
                let text = `*Khyaal Engineering Digest (${today})*\n\n`;
                let doneItems = [];
                let nowItems = [];
                let blockers = [];
                
                UPDATE_DATA.tracks.forEach(t => t.subtracks.forEach(s => s.items.forEach(i => {
                    if (i.status === 'done') doneItems.push(`- [${t.name}] ${i.text}`);
                    if (i.status === 'now') nowItems.push(`- [${t.name}] ${i.text} ${i.contributors && i.contributors.length ? '(' + i.contributors.join(', ') + ')' : ''}`);
                    if (i.blocker) blockers.push(`- 🔴 [${t.name}] ${i.text} (Blocked: ${i.blockerNote || 'No details'})`);
                })));

                if (blockers.length) text += `*🚨 BLOCKERS:*\n${blockers.join('\\n')}\n\n`;
                text += `*✅ RECENTLY SHIPPED:*\n${doneItems.slice(0,10).join('\\n')}${doneItems.length > 10 ? '\\n...and more!' : ''}\n\n`;
                text += `*🚀 IN FLIGHT (NOW):*\n${nowItems.slice(0,15).join('\\n')}\n`;

                alert("Digest generated! Sending to clipboard...");
                navigator.clipboard.writeText(text.replace(/\\n/g, '\n')).then(() => {
                    alert("✅ Digest copied to clipboard! You can paste it into Slack.");
                }).catch(err => {
                    prompt("Failed to copy automatically. Copy the text below:", text.replace(/\\n/g, '\n'));
                });
                logChange('Digest Generated', 'Copied to clipboard');
            }

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

            function switchView(view) {
                document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.filter-btn').forEach(el => el.classList.remove('active'));

                const targetView = document.getElementById(view + '-view');
                const targetBtn = document.getElementById('btn-' + view);

                if (targetView) targetView.classList.add('active');
                if (targetBtn) targetBtn.classList.add('active');

                // Show/Hide Gantt specific controls
                const exportGanttBtn = document.getElementById('export-gantt-btn');
                if (exportGanttBtn) exportGanttBtn.classList.toggle('hidden', view !== 'gantt');

                // Show/Hide Backlog specific header
                const backlogHeader = document.getElementById('backlog-view-header');
                if (backlogHeader) backlogHeader.classList.toggle('hidden', view !== 'backlog');

                // Render based on current view
                if (view === 'track') renderTrackView();
                if (view === 'status') renderStatusView();
                if (view === 'priority') renderPriorityView();
                if (view === 'contributor') renderContributorView();
                if (view === 'gantt') renderGanttView();
                if (view === 'backlog') { renderBacklogView(); updateBacklogBadge(); }
                if (view === 'sprint') renderSprintView();
                if (view === 'releases') renderReleasesView();
                if (view === 'dependency') renderDependencyView();
                buildTagFilterBar();
                updateTabCounts();
            }

            let globalSearchQuery = '';
            function filterBySearch(query) {
                globalSearchQuery = query.toLowerCase();
                const activeSection = document.querySelector('.view-section.active');
                if (activeSection) {
                    const currentView = activeSection.id.replace('-view', '');
                    switchView(currentView);
                }
            }

            function isItemInSearch(item) {
                if (!globalSearchQuery) return true;
                const text = item.text.toLowerCase();
                const note = (item.note || '').toLowerCase();
                const usecase = (item.usecase || '').toLowerCase();
                const contributors = (item.contributors || []).join(' ').toLowerCase();
                const track = (item.track || '').toLowerCase();
                const subtrack = (item.subtrack || '').toLowerCase();
                
                return text.includes(globalSearchQuery) || 
                       note.includes(globalSearchQuery) || 
                       usecase.includes(globalSearchQuery) || 
                       contributors.includes(globalSearchQuery) ||
                       track.includes(globalSearchQuery) ||
                       subtrack.includes(globalSearchQuery);
            }

            // CMS State
            let isCmsMode = false;
            let isAuthenticated = false;
            let githubToken = '';
            let editContext = null;
            let currentAllItems = []; // For dependency autocomplete

            function showDependencyPicker() {
                const picker = document.getElementById('dependency-picker');
                if (picker) picker.style.display = 'block';
            }
            function filterDependencies(query) {
                const q = query.toLowerCase();
                const items = document.querySelectorAll('.dependency-item');
                items.forEach(item => {
                    const text = item.innerText.toLowerCase();
                    item.style.display = text.includes(q) ? 'flex' : 'none';
                });
            }
            function addDependency(id) {
                const input = document.getElementById('edit-dependencies');
                if (!input) return;
                let deps = input.value.split(',').map(s=>s.trim()).filter(Boolean);
                if (!deps.includes(id)) deps.push(id);
                input.value = deps.join(', ');
                const picker = document.getElementById('dependency-picker');
                if (picker) picker.style.display = 'none';
                input.focus();
            }
            document.addEventListener('click', (e) => {
                const picker = document.getElementById('dependency-picker');
                const input = document.getElementById('edit-dependencies');
                if (picker && e.target !== input && !picker.contains(e.target)) {
                    picker.style.display = 'none';
                }
            });

            const CMS_CONFIG = {
                repoOwner: 'Khyaal-Inc',
                repoName: 'khyaal-engineering-updates',
                filePath: 'data.json'
            };

            // Helper functions for UTF-8 Base64 (fixes gibberish root cause)
            function toBase64(str) {
                return btoa(unescape(encodeURIComponent(str)));
            }

            function fromBase64(b64) {
                return decodeURIComponent(escape(atob(b64)));
            }

            function initCms() {
                const params = new URLSearchParams(window.location.search);
                if (params.get('cms') === 'true') {
                    isCmsMode = true;
                    document.getElementById('cms-controls').classList.add('active');

                    // Load token if exists
                    githubToken = localStorage.getItem('gh_pat') || '';
                    if (githubToken) {
                        document.getElementById('github-token').value = githubToken;
                        authenticateCms();
                    }

                    // Close modal on outside click
                    document.getElementById('cms-modal').addEventListener('click', function(e) {
                        if (e.target === this) {
                            closeCmsModal();
                        }
                    });
                }
            }

            function authenticateCms() {
                const token = document.getElementById('github-token').value;
                if (!token) return;

                githubToken = token;
                localStorage.setItem('gh_pat', token);
                window.isAuthenticated = true;
                isAuthenticated = true;

                document.getElementById('cms-auth-section').classList.add('hidden');
                document.getElementById('cms-actions-section').classList.remove('hidden');

                // Re-render to show edit buttons
                const currentView = document.querySelector('.view-section.active').id.replace('-view', '');
                if (currentView === 'track') renderTrackView();
                if (currentView === 'status') renderStatusView();
                if (currentView === 'priority') renderPriorityView();
                if (currentView === 'contributor') renderContributorView();
            }

            function logoutCms() {
                localStorage.removeItem('gh_pat');
                location.reload();
            }

            async function archiveAndClear() {
                if (!confirm('Are you sure you want to archive all current entries and clear the main page? This is irreversible.')) return;

                const btn = document.getElementById('archive-btn');
                const status = document.getElementById('cms-status');
                btn.disabled = true;
                btn.innerText = 'Archiving...';

                try {
                    // 1. Generate the archive content (current data)
                    const archiveDataString = JSON.stringify(UPDATE_DATA, null, 12);
                    
                    // 2. Commit the archive JSON file
                    const dateRange = UPDATE_DATA.metadata.dateRange.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                    const archivePath = `archive/${dateRange}.json`;
                    status.innerText = `Creating archive data at ${archivePath}...`;
                    
                    const archiveResponse = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${archivePath}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: `Archive: ${UPDATE_DATA.metadata.dateRange}`,
                            content: btoa(unescape(encodeURIComponent(archiveDataString)))
                        })
                    });
                    if (!archiveResponse.ok) { throw new Error('Failed to create archive file on GitHub.'); }

                    // 3. Clear data and update the main data.json
                    const clearedData = JSON.parse(JSON.stringify(UPDATE_DATA)); 
                    clearedData.tracks.forEach(track => {
                        track.subtracks.forEach(subtrack => {
                            subtrack.items = subtrack.items.filter(item => item.status !== 'done');
                        });
                    });
                    clearedData.metadata.dateRange = 'New Update - Please set date range';
                    
                    status.innerText = 'Clearing live data...';
                    const mainDataRes = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
                        headers: { 'Authorization': `token ${githubToken}` }
                    });
                    const mainDataJson = await mainDataRes.json();
                    
                    const updateResponse = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: 'CMS: Clear entries after archive',
                            content: btoa(unescape(encodeURIComponent(JSON.stringify(clearedData, null, 12)))),
                            sha: mainDataJson.sha
                        })
                    });

                    status.innerText = 'Archive complete!';
                    setTimeout(() => location.reload(), 2000);

                } catch (error) {
                    console.error(error);
                    status.innerText = 'Error: ' + error.message;
                    btn.disabled = false;
                    btn.innerText = 'Archive & Clear';
                }
            }

            async function saveToGithub() {
                const btn = document.getElementById('save-to-github-btn');
                const status = document.getElementById('cms-status');

                try {
                    btn.disabled = true;
                    btn.innerText = 'Saving...';
                    status.innerText = 'Fetching latest data...';

                    // 1. Get current file data from GitHub
                    const response = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
                        headers: { 'Authorization': `token ${githubToken}` }
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status} ${response.statusText}` }));
                        throw new Error(`GitHub API Error: ${errorData.message}`);
                    }

                    const fileData = await response.json();

                    // 2. Prepare new data content
                    const dataString = JSON.stringify(UPDATE_DATA, null, 12);

                    // 3. Commit the changes
                    status.innerText = 'Committing changes to data.json...';
                    const putResponse = await fetch(`https://api.github.com/repos/${CMS_CONFIG.repoOwner}/${CMS_CONFIG.repoName}/contents/${CMS_CONFIG.filePath}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: 'CMS: Update engineering data',
                            content: btoa(unescape(encodeURIComponent(dataString))),
                            sha: fileData.sha
                        })
                    });

                    if (putResponse.ok) {
                        status.innerText = 'Saved successfully! Changes are live immediately.';
                        setTimeout(() => location.reload(), 3000);
                    } else {
                        throw new Error('Failed to save to GitHub');
                    }
                } catch (error) {
                    console.error(error);
                    status.innerText = 'Error: ' + error.message;
                    btn.disabled = false;
                    btn.innerText = 'Save to GitHub';
                }
            }

            // CRUD Helpers
            function addItem(trackIndex, subtrackIndex) {
                editContext = { type: 'item-new', trackIndex, subtrackIndex };
                
                currentAllItems = [];
                UPDATE_DATA.tracks.forEach(t => t.subtracks.forEach(s => s.items.forEach(i => {
                    currentAllItems.push({ id: i.id, text: i.text });
                })));

                document.getElementById('modal-title').innerText = 'Add New Item';
                document.getElementById('modal-form').innerHTML = `
                <label class="block text-sm font-bold mb-1">Task Title</label>
                <input type="text" id="edit-text" class="cms-input" placeholder="e.g. Implement feature X">
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-sm font-bold mb-1">Status</label>
                        <select id="edit-status" class="cms-input">
                            <option value="done">Done</option>
                            <option value="now">Now</option>
                            <option value="ongoing">On-Going</option>
                            <option value="next">Next</option>
                            <option value="later">Later</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1">Priority</label>
                        <select id="edit-priority" class="cms-input">
                            <option value="high">High</option>
                            <option value="medium" selected>Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>
                <label class="block text-sm font-bold mb-1">Contributors</label>
                <div class="relative"><div id="contrib-tag-input-edit" class="tag-input-wrapper cms-input" style="height:auto"></div></div>
                <input type="hidden" id="edit-contributors" value="">
                <label class="block text-sm font-bold mb-1">Note / Description</label>
                <textarea id="edit-note" class="cms-input"></textarea>
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <div>
                        <label class="block text-sm font-bold mb-1">Sprint</label>
                        <select id="edit-sprintId" class="cms-input"><option value="">-- None --</option>${(UPDATE_DATA.metadata.sprints||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1">Released In</label>
                        <select id="edit-releasedIn" class="cms-input"><option value="">-- Unreleased --</option>${(UPDATE_DATA.metadata.releases||[]).map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}</select>
                    </div>
                </div>
                <label class="block text-sm font-bold mb-1">Impact/Usecase</label>
                <input type="text" id="edit-usecase" class="cms-input">
                <label class="block text-sm font-bold mb-1">Image/Media URL</label>
                <input type="text" id="edit-mediaUrl" class="cms-input" placeholder="https://example.com/image.png">
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-sm font-bold mb-1">Start Date</label>
                        <input type="date" id="edit-startDate" class="cms-input">
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1">Due Date</label>
                        <input type="text" id="edit-due" class="cms-input" placeholder="e.g. March 30">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="col-span-2">
                        <label class="block text-sm font-bold mb-1">Tags</label>
                        <div id="tags-tag-input-edit" class="cms-input" style="min-height: 40px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; padding: 4px;"></div>
                        <input type="hidden" id="edit-tags" value="">
                    </div>
                </div>
                <label class="block text-sm font-bold mb-1 mt-2">Dependencies (Task IDs, comma separated)</label>
                <div class="relative">
                    <input type="text" id="edit-dependencies" class="cms-input" placeholder="task-123, task-456" onfocus="showDependencyPicker()" oninput="filterDependencies(this.value)">
                    <div id="dependency-picker" class="dependency-picker" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:200px; overflow-y:auto; background:white; border:1px solid #e2e8f0; z-index:100; margin-top:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); border-radius:8px;">
                        <input type="text" class="dependency-search sticky top-0 bg-white border-b border-slate-200" style="padding:4px; font-size:10px; width:100%; box-sizing:border-box;" placeholder="Search task..." onkeyup="filterDependencies(this.value)">
                        <div class="dependency-list" id="dependency-picker-list">
                            ${currentAllItems.map(i => `
                                <button type="button" class="dependency-item w-full text-left px-2 py-1 text-[10px] hover:bg-slate-100 flex justify-between border-b border-slate-50" onclick="addDependency('${i.id}')" title="${i.text}">
                                    <span class="truncate pr-2 font-bold">${i.text.substring(0,30)}</span>
                                    <span class="dependency-item-id text-slate-400 font-mono">${i.id}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="mt-4 p-3 border border-red-500/30 rounded-lg bg-red-500/5">
                    <label class="block text-sm font-bold text-red-400 mb-1">🔒 Blocker Note (Optional)</label>
                    <input type="text" id="edit-blockerNote" class="cms-input" placeholder="If blocked, describe why...">
                    <p class="text-[10px] text-slate-400 mt-1">Adding text here will automatically red-flag this item as blocked.</p>
                </div>
            `;
                document.getElementById('cms-modal').classList.add('active');

                setTimeout(() => {
                    renderContributorTagInput('contrib-tag-input-edit', []);
                    renderTagsTagInput('tags-tag-input-edit', []);
                }, 10);
            }

            function openItemEdit(trackIndex, subtrackIndex, itemIndex) {
                const item = UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex].items[itemIndex];
                editContext = { type: 'item', trackIndex, subtrackIndex, itemIndex };

                // Get all items for the dependency picker
                currentAllItems = [];
                UPDATE_DATA.tracks.forEach(t => {
                    t.subtracks.forEach(s => {
                        s.items.forEach(i => {
                            if (i.id !== item.id) { // Don't depend on self
                                currentAllItems.push({ id: i.id, text: i.text });
                            }
                        });
                    });
                });

                document.getElementById('modal-title').innerText = 'Edit Item';
                document.getElementById('modal-form').innerHTML = `
                <label class="block text-sm font-bold mb-1">Text</label>
                <input type="text" id="edit-text" value="${item.text}" class="cms-input">
                <label class="block text-sm font-bold mb-1">Status</label>
                <select id="edit-status" class="cms-input">
                    <option value="done" ${item.status === 'done' ? 'selected' : ''}>Done</option>
                    <option value="now" ${item.status === 'now' ? 'selected' : ''}>Now</option>
                    <option value="ongoing" ${item.status === 'ongoing' ? 'selected' : ''}>On-Going</option>
                    <option value="next" ${item.status === 'next' ? 'selected' : ''}>Next</option>
                    <option value="later" ${item.status === 'later' ? 'selected' : ''}>Later</option>
                </select>
                <label class="block text-sm font-bold mb-1">Priority</label>
                <select id="edit-priority" class="cms-input">
                    <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
                    <option value="medium" ${item.priority === 'medium' || !item.priority ? 'selected' : ''}>Medium</option>
                    <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
                </select>
                <label class="block text-sm font-bold mb-1">Contributors</label>
                <div class="relative"><div id="contrib-tag-input-edit" class="tag-input-wrapper cms-input" style="height:auto"></div></div>
                <input type="hidden" id="edit-contributors" value="${(item.contributors || []).join(', ')}">
                <label class="block text-sm font-bold mb-1">Note</label>
                <textarea id="edit-note" class="cms-input">${item.note || ''}</textarea>
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <div>
                        <label class="block text-sm font-bold mb-1">Sprint</label>
                        <select id="edit-sprintId" class="cms-input"><option value="">-- None --</option>${(UPDATE_DATA.metadata.sprints||[]).map(s=>`<option value="${s.id}" ${item.sprintId===s.id?'selected':''}>${s.name}</option>`).join('')}</select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1">Released In</label>
                        <select id="edit-releasedIn" class="cms-input"><option value="">-- Unreleased --</option>${(UPDATE_DATA.metadata.releases||[]).map(r=>`<option value="${r.id}" ${item.releasedIn===r.id?'selected':''}>${r.name}</option>`).join('')}</select>
                    </div>
                </div>
                <label class="block text-sm font-bold mb-1">Impact/Usecase</label>
                <input type="text" id="edit-usecase" value="${item.usecase || ''}" class="cms-input">
                <label class="block text-sm font-bold mb-1">Image/Media URL</label>
                <input type="text" id="edit-mediaUrl" value="${item.mediaUrl || ''}" class="cms-input" placeholder="https://example.com/image.png">
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-sm font-bold mb-1">Start Date</label>
                        <input type="date" id="edit-startDate" value="${item.startDate || ''}" class="cms-input">
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1">Due Date</label>
                        <input type="date" id="edit-due" value="${item.due || ''}" class="cms-input">
                    </div>
                </div>
                <label class="block text-sm font-bold mb-1">Tags</label>
                <div id="tags-tag-input-edit" class="cms-input" style="min-height: 40px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; padding: 4px;"></div>
                <input type="hidden" id="edit-tags" value="${(item.tags || []).join(', ')}">
                <label class="block text-sm font-bold mb-1">Blocker Note (leave blank if not a blocker)</label>
                <input type="text" id="edit-blockerNote" value="${item.blockerNote || ''}" class="cms-input" placeholder="Describe blocker...">
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-sm font-bold mb-1">Move to Track</label>
                        <select id="edit-move-track" class="cms-input" onchange="updateMoveSubtrackOpts(this.value)">
                            ${UPDATE_DATA.tracks.map((t, ti) => `<option value="${ti}" ${ti === trackIndex ? 'selected' : ''}>${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-1">Move to Subtrack</label>
                        <select id="edit-move-subtrack" class="cms-input">
                            ${UPDATE_DATA.tracks[trackIndex].subtracks.map((s, si) => `<option value="${si}" ${si === subtrackIndex ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <label class="block text-sm font-bold mt-2 mb-1">Dependencies (Task IDs, comma separated)</label>
                <div class="relative">
                    <input type="text" id="edit-dependencies" value="${item.dependencies || ''}" class="cms-input" placeholder="task-123, task-456" onfocus="showDependencyPicker()" oninput="filterDependencies(this.value)">
                    <div id="dependency-picker" class="dependency-picker" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:200px; overflow-y:auto; background:white; border:1px solid #e2e8f0; z-index:100; margin-top:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); border-radius:8px;">
                        <input type="text" class="dependency-search sticky top-0 bg-white border-b border-slate-200" style="padding:4px; font-size:10px; width:100%; box-sizing:border-box;" placeholder="Search task..." onkeyup="filterDependencies(this.value)">
                        <div class="dependency-list" id="dependency-picker-list">
                            ${currentAllItems.map(i => `
                                <button type="button" class="dependency-item w-full text-left px-2 py-1 text-[10px] hover:bg-slate-100 flex justify-between border-b border-slate-50" onclick="addDependency('${i.id}')" title="${i.text}">
                                    <span class="truncate pr-2 font-bold">${i.text.substring(0,30)}</span>
                                    <span class="dependency-item-id text-slate-400 font-mono">${i.id}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
                document.getElementById('cms-modal').classList.add('active');
                setTimeout(() => {
                    const existingContribs = document.getElementById('edit-contributors');
                    const initialContribs = existingContribs && existingContribs.value ? existingContribs.value.split(',').map(s=>s.trim()).filter(s=>s) : [];
                    renderContributorTagInput('contrib-tag-input-edit', initialContribs);

                    const existingTags = document.getElementById('edit-tags');
                    const initialTags = existingTags && existingTags.value ? existingTags.value.split(',').map(s=>s.trim()).filter(s=>s) : [];
                    renderTagsTagInput('tags-tag-input-edit', initialTags);
                }, 10);
            }




            function deleteItem(trackIndex, subtrackIndex, itemIndex) {
                if (confirm('Are you sure you want to delete this item?')) {
                    UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex].items.splice(itemIndex, 1);
                    renderTrackView();
                    updateBacklogBadge();
                }
            }

            // Send any item to the Backlog subtrack of its track
            function sendToBacklog(trackIndex, subtrackIndex, itemIndex) {
                const track = UPDATE_DATA.tracks[trackIndex];
                let backlogIdx = track.subtracks.findIndex(s => s.name === 'Backlog');
                if (backlogIdx === -1) {
                    track.subtracks.push({ name: 'Backlog', items: [] });
                    backlogIdx = track.subtracks.length - 1;
                }
                const [item] = track.subtracks[subtrackIndex].items.splice(itemIndex, 1);
                track.subtracks[backlogIdx].items.push(item);
                const currentView = document.querySelector('.view-section.active').id.replace('-view', '');
                switchView(currentView);
                updateBacklogBadge();
            }

            // Toggle blocker flag on an item
            function toggleBlocker(trackIndex, subtrackIndex, itemIndex) {
                const item = UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex].items[itemIndex];
                if (item.blocker) {
                    delete item.blocker;
                    delete item.blockerNote;
                } else {
                    const note = prompt('Optional: Describe the blocker (leave blank to skip):', '');
                    item.blocker = true;
                    if (note) item.blockerNote = note;
                }
                renderTrackView();
            }

            // Update the backlog badge count on the tab button
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

            // Render all Backlog subtracks grouped by track
            function renderBacklogView() {
                const container = document.getElementById('backlog-view');
                const themeColors = {
                    blue: '#1e40af', emerald: '#065f46', violet: '#5b21b6',
                    amber: '#92400e', rose: '#9f1239', slate: '#334155'
                };
                let html = '';
                let totalItems = 0;

                const activeTeam = getActiveTeam();
                UPDATE_DATA.tracks.forEach((track, trackIndex) => {
                    if (activeTeam && activeTeam !== track.name) return;
                    const accentColor = themeColors[track.theme] || '#0f172a';
                    const backlogSubtracks = track.subtracks
                        .map((s, si) => ({ subtrack: s, si }))
                        .filter(({ subtrack }) => subtrack.name === 'Backlog');

                    let trackItems = [];
                    backlogSubtracks.forEach(({ subtrack, si }) => {
                        subtrack.items.forEach((item, ii) => {
                            trackItems.push({ ...item, _si: si, _ii: ii });
                        });
                    });

                    if (trackItems.length === 0) return;
                    totalItems += trackItems.length;

                    // Sort by priority
                    const pOrder = { high: 0, medium: 1, low: 2 };
                    trackItems.sort((a, b) => (pOrder[a.priority || 'medium'] - pOrder[b.priority || 'medium']));

                    html += `<div class="backlog-track-card">
                        <div class="track-header" style="background: linear-gradient(135deg, ${accentColor} 0%, #1e293b 100%)">
                            ${track.name} Backlog <span class="backlog-count-badge">${trackItems.length}</span>
                        </div>
                        <div>`;

                    trackItems.forEach(item => {
                        const status = statusConfig[item.status] || statusConfig['later'];
                        const priority = item.priority || 'medium';
                        const priorityInfo = priorityConfig[priority];
                        const due = renderDueDateBadge(item);
                        const tags = renderTagPills(item.tags);
                        const blockerStrip = item.blocker ? `<div class="blocker-strip"><span class="blocker-badge">&#128274; Blocker</span>${item.blockerNote || ''}</div>` : '';

                        // Build Move To Subtrack options (all non-Backlog subtracks)
                        const moveOpts = track.subtracks.map((s, si) =>
                            s.name !== 'Backlog' ? `<option value="${si}">${s.name}</option>` : ''
                        ).join('');

                        const cmsCtrl = isAuthenticated ? `
                            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                                <button onclick="promoteBacklogItem(${trackIndex}, ${item._si}, ${item._ii})" class="promote-btn">&#8679; Promote to Next</button>
                                <select id="move-sel-${trackIndex}-${item._si}-${item._ii}" class="text-xs border border-slate-200 rounded px-1 py-0.5">
                                    <option value="">Move to subtrack...</option>${moveOpts}
                                </select>
                                <button onclick="moveFromBacklog(${trackIndex}, ${item._si}, ${item._ii})" class="send-to-backlog-btn">Move</button>
                                <span onclick="deleteItem(${trackIndex}, ${item._si}, ${item._ii}); renderBacklogView();" class="text-[11px] text-red-600 cursor-pointer font-bold underline">Delete</span>
                            </div>` : '';

                        html += `${blockerStrip}
                        <div class="item-row bucket-later">
                            <div class="item-content">
                                <div class="flex justify-between items-start w-full gap-4">
                                    <div class="flex items-start gap-4 flex-1">
                                        <div class="flex flex-col gap-1 items-center flex-shrink-0 mt-1">
                                            <span class="status-pill ${status.class} text-[10px] py-0.5 w-full text-center min-w-[54px]">${status.label}</span>
                                            <span class="status-pill ${priorityInfo.class} text-[9px] py-0 px-1 opacity-80 uppercase font-black tracking-tighter w-full text-center">${priority}</span>
                                        </div>
                                        <div class="text-sm text-slate-800 font-semibold leading-tight flex-1">
                                            <div class="mb-1">${highlightSearch(item.text)}${due}</div>
                                            ${tags ? `<div class="flex flex-wrap gap-1 mb-1">${tags}</div>` : ''}
                                            ${item.usecase ? `<div class="usecase-box"><span class="font-bold">Impact:</span> ${item.usecase}</div>` : ''}
                                            ${cmsCtrl}
                                        </div>
                                    </div>
                                    <div class="flex-shrink-0">
                                        <div class="flex flex-wrap justify-end gap-1">${renderContributors(item.contributors)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    });

                    html += `</div></div>`;
                });

                if (totalItems === 0) {
                    html = `<div class="text-center py-16 text-slate-400">
                        <div class="text-4xl mb-4">&#10003;</div>
                        <p class="font-semibold text-lg">Backlog is empty!</p>
                        <p class="text-sm mt-1">Use "→ Backlog" on any item to park it here.</p>
                    </div>`;
                }

                container.innerHTML = html;
            }

            // Promote a backlog item to "next" status and move it to the first non-Backlog subtrack
            function promoteBacklogItem(trackIndex, subtrackIndex, itemIndex) {
                const track = UPDATE_DATA.tracks[trackIndex];
                const [item] = track.subtracks[subtrackIndex].items.splice(itemIndex, 1);
                item.status = 'next';
                // Move to first non-backlog subtrack
                const targetSub = track.subtracks.find(s => s.name !== 'Backlog');
                if (targetSub) targetSub.items.push(item);
                else track.subtracks[subtrackIndex].items.unshift(item); // fallback
                renderBacklogView();
                updateBacklogBadge();
            }

            // Move a backlog item to a selected subtrack
            function moveFromBacklog(trackIndex, subtrackIndex, itemIndex) {
                const sel = document.getElementById(`move-sel-${trackIndex}-${subtrackIndex}-${itemIndex}`);
                const targetSi = parseInt(sel.value);
                if (isNaN(targetSi)) { alert('Please select a subtrack to move to.'); return; }
                const [item] = UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex].items.splice(itemIndex, 1);
                UPDATE_DATA.tracks[trackIndex].subtracks[targetSi].items.push(item);
                renderBacklogView();
                updateBacklogBadge();
            }

            

            function openMetadataEdit() {
                const meta = UPDATE_DATA.metadata;
                editContext = { type: 'metadata' };

                document.getElementById('modal-title').innerText = 'Edit Page Metadata';
                document.getElementById('modal-form').innerHTML = `
                <label class="block text-sm font-bold mb-1">Title</label>
                <input type="text" id="edit-title" value="${meta.title}" class="cms-input">
                <label class="block text-sm font-bold mb-1">Date Range</label>
                <input type="text" id="edit-dateRange" value="${meta.dateRange}" class="cms-input">
                <label class="block text-sm font-bold mb-1">Description</label>
                <input type="text" id="edit-description" value="${meta.description}" class="cms-input">
                
                <label class="block text-sm font-bold mt-4 mb-1">Custom Statuses (JSON format)</label>
                <textarea id="edit-customStatuses" class="cms-input font-mono text-xs p-2 bg-slate-50 border-slate-300" rows="5" placeholder='[{"id":"review","label":"In Review","class":"review","bucket":"bucket-review"}]'>${JSON.stringify(meta.customStatuses || [], null, 2)}</textarea>
                <p class="text-[10px] text-slate-500 mb-4 font-normal">Define new status lanes. Required properties: id, label, class, bucket.</p>
            `;
                document.getElementById('cms-modal').classList.add('active');
                setTimeout(() => {
                    const existing = document.getElementById('edit-contributors');
                    const initial = existing && existing.value ? existing.value.split(',').map(s=>s.trim()).filter(s=>s) : [];
                    renderContributorTagInput('contrib-tag-input-edit', initial);
                }, 10);
            }

            function openTrackEdit(trackIndex) {
                const track = UPDATE_DATA.tracks[trackIndex];
                editContext = { type: 'track', trackIndex };

                document.getElementById('modal-title').innerText = 'Edit Team (Track)';
                document.getElementById('modal-form').innerHTML = `
                <label class="block text-sm font-bold mb-1">Track Name</label>
                <input type="text" id="edit-track-name" value="${track.name}" class="cms-input">
                <label class="block text-sm font-bold mb-1">Theme (blue, emerald, violet, amber, rose, slate)</label>
                <input type="text" id="edit-track-theme" value="${track.theme}" class="cms-input">
            `;
                document.getElementById('cms-modal').classList.add('active');
                setTimeout(() => {
                    const existing = document.getElementById('edit-contributors');
                    const initial = existing && existing.value ? existing.value.split(',').map(s=>s.trim()).filter(s=>s) : [];
                    renderContributorTagInput('contrib-tag-input-edit', initial);
                }, 10);
            }

            function addTrack() {
                const newTrack = {
                    id: `track-${Date.now()}`,
                    name: "New Track",
                    theme: "slate",
                    subtracks: []
                };
                UPDATE_DATA.tracks.push(newTrack);
                renderTrackView();
                openTrackEdit(UPDATE_DATA.tracks.length - 1);
            }

            function deleteTrack(trackIndex) {
                if (confirm('Are you sure you want to delete this ENTIRE track and all its subtracks?')) {
                    UPDATE_DATA.tracks.splice(trackIndex, 1);
                    renderTrackView();
                }
            }

            function openSubtrackEdit(trackIndex, subtrackIndex) {
                const subtrack = UPDATE_DATA.tracks[trackIndex].subtracks[subtrackIndex];
                editContext = { type: 'subtrack', trackIndex, subtrackIndex };

                document.getElementById('modal-title').innerText = 'Edit Subtrack';
                document.getElementById('modal-form').innerHTML = `
                <label class="block text-sm font-bold mb-1">Subtrack Name</label>
                <input type="text" id="edit-subtrack-name" value="${subtrack.name}" class="cms-input">
                <label class="block text-sm font-bold mb-1">Default Note</label>
                <textarea id="edit-subtrack-note" class="cms-input">${subtrack.note || ''}</textarea>
            `;
                document.getElementById('cms-modal').classList.add('active');
                setTimeout(() => {
                    const existing = document.getElementById('edit-contributors');
                    const initial = existing && existing.value ? existing.value.split(',').map(s=>s.trim()).filter(s=>s) : [];
                    renderContributorTagInput('contrib-tag-input-edit', initial);
                }, 10);
            }

            function addSubtrack(trackIndex) {
                const newSubtrack = {
                    name: "New Subtrack",
                    items: []
                };
                UPDATE_DATA.tracks[trackIndex].subtracks.push(newSubtrack);
                renderTrackView();
                openSubtrackEdit(trackIndex, UPDATE_DATA.tracks[trackIndex].subtracks.length - 1);
            }

            function deleteSubtrack(trackIndex, subtrackIndex) {
                if (confirm('Are you sure you want to delete this subtrack and all its items?')) {
                    UPDATE_DATA.tracks[trackIndex].subtracks.splice(subtrackIndex, 1);
                    renderTrackView();
                }
            }

            function saveCmsChanges() {
                if (!validateCmsForm()) return;

                if (editContext.type === 'item' || editContext.type === 'item-new') {
                    // Prefer tag-input widget; fall back to the hidden text input
                    const contribFromWidget = getSelectedContributors();
                    const contribFromText = ((document.getElementById('edit-contributors') || {}).value || '');
                    const contributors = contribFromWidget.length ? contribFromWidget
                        : contribFromText.split(',').map(s => s.trim()).filter(s => s);

                    const sprintIdEl = document.getElementById('edit-sprintId');
                    const releasedInEl = document.getElementById('edit-releasedIn');

                    const tagsFromWidget = _selectedTags;
                    const tagsFromText = ((document.getElementById('edit-tags') || {}).value || '');
                    const tags = tagsFromWidget.length ? tagsFromWidget : tagsFromText.split(',').map(s => s.trim()).filter(s => s);

                    const item = {
                        id: editContext.type === 'item' ?
                            (UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].items[editContext.itemIndex].id || `task-${Date.now()}`) :
                            `task-${Date.now()}`,
                        text: document.getElementById('edit-text').value.trim(),
                        status: document.getElementById('edit-status').value,
                        priority: document.getElementById('edit-priority').value,
                        contributors,
                        note: document.getElementById('edit-note').value,
                        usecase: document.getElementById('edit-usecase').value,
                        mediaUrl: document.getElementById('edit-mediaUrl').value,
                        startDate: document.getElementById('edit-startDate').value,
                        due: document.getElementById('edit-due').value,
                        dependencies: (document.getElementById('edit-dependencies') || {}).value,
                        publishedDate: new Date().toISOString().split('T')[0],
                        tags,
                        blockerNote: ((document.getElementById('edit-blockerNote') || {}).value || '').trim(),
                        sprintId: sprintIdEl ? sprintIdEl.value : undefined,
                        releasedIn: releasedInEl ? releasedInEl.value.trim() : undefined,
                    };

                    if (item.blockerNote) item.blocker = true;
                    else { delete item.blocker; delete item.blockerNote; }
                    if (!item.tags || !item.tags.length) delete item.tags;
                    if (!item.note) delete item.note;
                    if (!item.usecase) delete item.usecase;
                    if (!item.startDate) delete item.startDate;
                    if (!item.due) delete item.due;
                    if (!item.dependencies) delete item.dependencies;
                    if (!item.sprintId) delete item.sprintId;
                    if (!item.releasedIn) delete item.releasedIn;
                    if (item.priority === 'medium') delete item.priority;

                    // Handle Move-to-Track/Subtrack
                    const moveTrackEl = document.getElementById('edit-move-track');
                    const moveSubEl = document.getElementById('edit-move-subtrack');
                    const targetTi = moveTrackEl ? parseInt(moveTrackEl.value) : editContext.trackIndex;
                    const targetSi = moveSubEl ? parseInt(moveSubEl.value) : editContext.subtrackIndex;

                    if (editContext.type === 'item') {
                        const srcItems = UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].items;
                        if (targetTi !== editContext.trackIndex || targetSi !== editContext.subtrackIndex) {
                            srcItems.splice(editContext.itemIndex, 1);
                            UPDATE_DATA.tracks[targetTi].subtracks[targetSi].items.push(item);
                        } else { srcItems[editContext.itemIndex] = item; }
                        logChange('Edit Item', item.text.substring(0, 40));
                    } else {
                        UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].items.push(item);
                        logChange('Add Item', item.text.substring(0, 40));
                    }
                    buildContributorList();

                } else if (editContext.type === 'sprint') {
                    if (!UPDATE_DATA.metadata.sprints) UPDATE_DATA.metadata.sprints = [];
                    const name = document.getElementById('edit-sprint-name').value.trim();
                    const start = document.getElementById('edit-sprint-start').value;
                    const end = document.getElementById('edit-sprint-end').value;
                    const goal = document.getElementById('edit-sprint-goal').value.trim();
                    if (editContext.sprintId) {
                        const idx = UPDATE_DATA.metadata.sprints.findIndex(s => s.id === editContext.sprintId);
                        if (idx !== -1) UPDATE_DATA.metadata.sprints[idx] = { id: editContext.sprintId, name, start, end, goal };
                        logChange('Edit Sprint', name);
                    } else {
                        UPDATE_DATA.metadata.sprints.push({ id: `sprint-${Date.now()}`, name, start, end, goal });
                        logChange('Add Sprint', name);
                    }

                } else if (editContext.type === 'release') {
                    if (!UPDATE_DATA.metadata.releases) UPDATE_DATA.metadata.releases = [];
                    const name = document.getElementById('edit-release-name').value.trim();
                    const targetDate = document.getElementById('edit-release-date').value;
                    const goal = document.getElementById('edit-release-goal').value.trim();
                    if (editContext.releaseId) {
                        const idx = UPDATE_DATA.metadata.releases.findIndex(r => r.id === editContext.releaseId);
                        if (idx !== -1) UPDATE_DATA.metadata.releases[idx] = { id: editContext.releaseId, name, targetDate, goal };
                        logChange('Edit Release', name);
                    } else {
                        UPDATE_DATA.metadata.releases.push({ id: `rel-${Date.now()}`, name, targetDate, goal });
                        logChange('Add Release', name);
                    }

                } else if (editContext.type === 'track') {
                    UPDATE_DATA.tracks[editContext.trackIndex].name = document.getElementById('edit-track-name').value;
                    UPDATE_DATA.tracks[editContext.trackIndex].theme = document.getElementById('edit-track-theme').value;
                } else if (editContext.type === 'subtrack') {
                    UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].name = document.getElementById('edit-subtrack-name').value;
                    UPDATE_DATA.tracks[editContext.trackIndex].subtracks[editContext.subtrackIndex].note = document.getElementById('edit-subtrack-note').value;
                } else if (editContext.type === 'metadata') {
                    UPDATE_DATA.metadata.title = document.getElementById('edit-title').value;
                    UPDATE_DATA.metadata.dateRange = document.getElementById('edit-dateRange').value;
                    UPDATE_DATA.metadata.description = document.getElementById('edit-description').value;
                    let parsedStatuses = [];
                    try {
                        const raw = document.getElementById('edit-customStatuses').value.trim();
                        if (raw) parsedStatuses = JSON.parse(raw);
                    } catch(e) { alert("Invalid JSON in Custom Statuses"); return; }
                    UPDATE_DATA.metadata.customStatuses = parsedStatuses;
                    
                    document.getElementById('page-title').textContent = UPDATE_DATA.metadata.title;
                    document.getElementById('page-date').textContent = UPDATE_DATA.metadata.dateRange;
                    document.getElementById('page-desc').textContent = UPDATE_DATA.metadata.description;
                    document.getElementById('footer-text').textContent = `${UPDATE_DATA.metadata.title} • ${UPDATE_DATA.metadata.dateRange}`;
                }

                closeCmsModal();
                updateBacklogBadge();
                buildTagFilterBar();
                updateTabCounts();
                const currentView = document.querySelector('.view-section.active').id.replace('-view', '');
                switchView(currentView);
            }

            function closeCmsModal() {
                document.getElementById('cms-modal').classList.remove('active');
                editContext = null;
            }

            // Update move-to-subtrack options when move-to-track changes
            function updateMoveSubtrackOpts(trackIndex) {
                const subSel = document.getElementById('edit-move-subtrack');
                if (!subSel) return;
                const ti = parseInt(trackIndex);
                subSel.innerHTML = UPDATE_DATA.tracks[ti].subtracks.map((s, si) =>
                    `<option value="${si}">${s.name}</option>`
                ).join('');
            }


            // Archive Management
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
                            html += '<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Historical Snapshots:</span>';
                            
                            // Add "Back to Current" if viewing an archive
                            if (window.loadingArchive) {
                                html += `<button onclick="window.location.search=''" class="archive-btn bg-slate-900 border-slate-900 text-white p-2 rounded text-sm hover:bg-slate-800">← Back to Live Updates</button>`;
                            }

                            archives.sort((a, b) => b.name.localeCompare(a.name)).forEach(file => {
                                // Clean up name for display (e.g., feb-1---mar-18--2026.json -> Feb 1 – Mar 18, 2026)
                                let displayName = file.name.replace('.json', '').replace(/-/g, ' ').trim();
                                displayName = displayName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

                                const isActive = window.loadingArchive && window.loadingArchive.includes(file.name);
                                const activeClass = isActive ? 'ring-2 ring-amber-500 ring-offset-2 font-bold' : '';

                                html += `<button onclick="loadArchive('${file.name}')" class="archive-btn ${activeClass} bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800 p-2 rounded text-sm">${displayName}</button>`;
                            });
                            html += '</div>';
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch archives:', e);
                }

                container.innerHTML = html;
            }

            function filterByDate(dateRange) {
                window.currentDateFilter = dateRange;

                document.querySelectorAll('.archive-btn').forEach(btn => {
                    const isMatch = (dateRange === 'all' && btn.innerText === 'All Entries') ||
                        (dateRange === 'Legacy' && btn.innerText === 'Legacy') ||
                        (btn.innerText === dateRange);
                    btn.classList.toggle('active', isMatch);
                });

                const currentView = document.querySelector('.view-section.active').id.replace('-view', '');
                if (currentView === 'track') renderTrackView();
                if (currentView === 'status') renderStatusView();
                if (currentView === 'priority') renderPriorityView();
                if (currentView === 'contributor') renderContributorView();
            }

            // Initialize


            async function loadArchive(fileName) {
                window.location.search = `?archive=archive/${fileName}`;
            }

            
            function getActiveTeam() {
                const el = document.getElementById('global-team-filter');
                return el ? el.value : '';
            }

            function normalizeData() {
                const filterEl = document.getElementById('global-team-filter');
                if (filterEl && !filterEl.dataset.populated) {
                    const teams = Array.from(new Set(UPDATE_DATA.tracks.filter(tr => tr.name).map(tr => tr.name)));
                    if (teams.length > 0) {
                        const currentVal = filterEl.value;
                        filterEl.innerHTML = '<option value="">🌍 All Teams</option>' + teams.map(n => `<option value="${n}" ${n === currentVal ? 'selected' : ''}>${n}</option>`).join('');
                        filterEl.dataset.populated = "true";
                    }
                }

                if (UPDATE_DATA.metadata && UPDATE_DATA.metadata.customStatuses) {
                    UPDATE_DATA.metadata.customStatuses.forEach(cs => {
                        statusConfig[cs.id] = { label: cs.label, class: cs.class, bucket: cs.bucket };
                    });
                }
                UPDATE_DATA.tracks.forEach((track, trackIndex) => {
                    track.subtracks.forEach(subtrack => {
                        subtrack.items.forEach((item, index) => {
                            if (!item.id) {
                                const safeTrackId = (track.id || track.name || 'track').toLowerCase().replace(/\s/g, '');
                                const safeSubtrackName = (subtrack.name || 'sub').toLowerCase().replace(/\s/g, '-');
                                item.id = `${safeTrackId}-${safeSubtrackName}-${index}`;
                            }

                            // Clean up: If status is 'next' or 'later', clear the auto-generated dates from previous session
                            if (['next', 'later'].includes(item.status)) {
                                if (item.startDate === '2026-03-20') delete item.startDate;
                                if (item.due === '2026-03-27') delete item.due;
                            }

                            // Only auto-assign default dates for active statuses (now/ongoing) if missing
                            if (['now', 'ongoing'].includes(item.status)) {
                                if (!item.startDate) item.startDate = new Date().toISOString().split('T')[0];
                                if (!item.due) {
                                    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                                    item.due = nextWeek.toISOString().split('T')[0];
                                }
                            }
                        });
                    });
                });
            }

            // Advanced Date Filtering
            let activeDateFilter = {
                type: 'all',
                start: null,
                end: null
            };

            function applyDatePreset() {
                const preset = document.getElementById('date-range-preset').value;
                const customInputs = document.getElementById('custom-date-inputs');

                activeDateFilter.type = preset;
                if (customInputs) customInputs.classList.toggle('hidden', preset !== 'custom');

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (preset === 'today') {
                    activeDateFilter.start = new Date(today);
                    activeDateFilter.end = new Date(today);
                } else if (preset === 'this-week') {
                    const first = today.getDate() - today.getDay();
                    const last = first + 6;
                    activeDateFilter.start = new Date(new Date(today).setDate(first));
                    activeDateFilter.end = new Date(new Date(today).setDate(last));
                } else if (preset === 'this-month') {
                    activeDateFilter.start = new Date(today.getFullYear(), today.getMonth(), 1);
                    activeDateFilter.end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                } else if (preset === 'all') {
                    activeDateFilter.start = null;
                    activeDateFilter.end = null;
                }

                filterData();
            }

            function filterData() {
                if (activeDateFilter.type === 'custom') {
                    const startStr = document.getElementById('filter-start-date').value;
                    const endStr = document.getElementById('filter-end-date').value;
                    activeDateFilter.start = startStr ? new Date(startStr) : null;
                    activeDateFilter.end = endStr ? new Date(endStr) : null;
                }

                const activeSection = document.querySelector('.view-section.active');
                if (activeSection) {
                    const currentView = activeSection.id.replace('-view', '');
                    switchView(currentView);
                }
            }

            function isItemInDateRange(item) {
                if (activeDateFilter.type === 'all') return true;

                // Check both startDate and due date
                const checkDate = (dateStr) => {
                    if (!dateStr) return null;
                    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        return new Date(dateStr);
                    }
                    // Fallback for "23 Mar" style
                    const currentYear = new Date().getFullYear();
                    const d = new Date(`${dateStr} ${currentYear}`);
                    return isNaN(d.getTime()) ? null : d;
                };

                const itemStart = checkDate(item.startDate);
                const itemEnd = checkDate(item.due);

                if (!itemStart && !itemEnd) return true;

                const filterStart = activeDateFilter.start;
                const filterEnd = activeDateFilter.end;

                // If item falls anywhere within the filter range
                const startInRange = filterStart ? (itemEnd ? itemEnd >= filterStart : true) : true;
                const endInRange = filterEnd ? (itemStart ? itemStart <= filterEnd : true) : true;

                return startInRange && endInRange;
            }