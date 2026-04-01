// ========================================
// FIRST-TIME ONBOARDING WIZARD
// ========================================
// Guides new users through creating their first OKR → Epic → Task → Sprint

const WIZARD_STORAGE_KEY = 'khyaal_wizard_completed';

function shouldShowWizard() {
    // Check if wizard has been completed
    if (localStorage.getItem(WIZARD_STORAGE_KEY)) {
        return false;
    }

    // Check if data is empty (no OKRs, Epics, or meaningful tasks)
    const hasOKRs = UPDATE_DATA.metadata?.okrs && UPDATE_DATA.metadata.okrs.length > 0;
    const hasEpics = UPDATE_DATA.metadata?.epics && UPDATE_DATA.metadata.epics.length > 0;
    const hasTasks = UPDATE_DATA.tracks?.some(t =>
        t.subtracks.some(s => s.items && s.items.length > 0)
    );

    return !hasOKRs || !hasEpics || !hasTasks;
}

function initWizard() {
    if (!shouldShowWizard()) {
        return;
    }

    // Wait for DOM to be fully ready
    setTimeout(() => {
        if (typeof showWizard === 'function') {
            showWizard();
        }
    }, 1000);
}

function showWizard() {
    const wizardHtml = `
        <div id="onboarding-wizard" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <!-- Wizard Header -->
                <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-t-2xl">
                    <h1 class="text-3xl font-bold mb-2">🎉 Welcome to Khyaal Engineering Pulse!</h1>
                    <p class="text-blue-100">Let's set up your first quarter in 4 simple steps</p>
                </div>

                <!-- Progress Bar -->
                <div class="px-8 pt-6">
                    <div class="flex items-center justify-between mb-8">
                        <div class="wizard-step active" data-step="1">
                            <div class="step-circle">1</div>
                            <div class="step-label">OKR</div>
                        </div>
                        <div class="wizard-connector"></div>
                        <div class="wizard-step" data-step="2">
                            <div class="step-circle">2</div>
                            <div class="step-label">Epic</div>
                        </div>
                        <div class="wizard-connector"></div>
                        <div class="wizard-step" data-step="3">
                            <div class="step-circle">3</div>
                            <div class="step-label">Task</div>
                        </div>
                        <div class="wizard-connector"></div>
                        <div class="wizard-step" data-step="4">
                            <div class="step-circle">4</div>
                            <div class="step-label">Sprint</div>
                        </div>
                    </div>
                </div>

                <!-- Step Content -->
                <div id="wizard-content" class="px-8 pb-8">
                    ${getWizardStep1()}
                </div>

                <!-- Navigation Buttons -->
                <div class="border-t border-slate-200 px-8 py-4 flex justify-between">
                    <button onclick="skipWizard()" class="text-slate-500 hover:text-slate-700 font-medium">
                        Skip Setup
                    </button>
                    <div class="flex gap-3">
                        <button id="wizard-back-btn" onclick="wizardBack()" class="hidden px-6 py-2 border border-slate-300 rounded-lg font-bold hover:bg-slate-50">
                            Back
                        </button>
                        <button id="wizard-next-btn" onclick="wizardNext()" class="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inject wizard into DOM
    const wizardContainer = document.createElement('div');
    wizardContainer.innerHTML = wizardHtml;
    document.body.appendChild(wizardContainer);

    // Initialize wizard state
    window.wizardState = {
        currentStep: 1,
        data: {
            okr: {},
            epic: {},
            task: {},
            sprint: {}
        }
    };
}

function getWizardStep1() {
    return `
        <div class="wizard-step-content">
            <div class="mb-6">
                <div class="text-4xl mb-4">🎯</div>
                <h2 class="text-2xl font-bold text-slate-900 mb-2">Step 1: Define Your First OKR</h2>
                <p class="text-slate-600">OKRs (Objectives & Key Results) set your strategic direction for the quarter</p>
            </div>

            <div class="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Quarter</label>
                    <input type="text" id="wizard-okr-quarter" value="Q1 2026" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="e.g. Q1 2026">
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Objective <span class="text-red-500">*</span></label>
                    <input type="text" id="wizard-okr-objective" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="e.g. Modernize platform infrastructure and improve reliability">
                    <p class="text-xs text-slate-500 mt-1">A clear, inspiring goal you want to achieve this quarter</p>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Owner</label>
                    <input type="text" id="wizard-okr-owner" value="Platform Team" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="e.g. Platform Team">
                </div>

                <div class="border-t border-slate-300 pt-4">
                    <label class="block text-sm font-bold mb-3 text-slate-700">Key Result 1 <span class="text-red-500">*</span></label>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="col-span-2">
                            <input type="text" id="wizard-kr1-desc" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="e.g. Migrate 100% of legacy pages to new platform">
                        </div>
                        <div>
                            <input type="number" id="wizard-kr1-target" value="100" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="Target">
                        </div>
                        <div>
                            <input type="text" id="wizard-kr1-unit" value="%" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="Unit (%, pages, etc.)">
                        </div>
                    </div>
                </div>

                <details class="mt-4">
                    <summary class="cursor-pointer text-sm font-bold text-blue-600 hover:text-blue-700">+ Add More Key Results (Optional)</summary>
                    <div id="wizard-additional-krs" class="mt-4 space-y-3">
                        <!-- Additional KRs can be added here -->
                    </div>
                </details>
            </div>

            <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p class="text-sm text-blue-900"><strong>💡 Pro Tip:</strong> Great OKRs are ambitious but achievable. Each Key Result should have a clear metric and target.</p>
            </div>
        </div>
    `;
}

function getWizardStep2() {
    return `
        <div class="wizard-step-content">
            <div class="mb-6">
                <div class="text-4xl mb-4">🚀</div>
                <h2 class="text-2xl font-bold text-slate-900 mb-2">Step 2: Create Your First Epic</h2>
                <p class="text-slate-600">Epics are major initiatives that help you achieve your OKRs</p>
            </div>

            <div class="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Epic Name <span class="text-red-500">*</span></label>
                    <input type="text" id="wizard-epic-name" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="e.g. Platform Modernization Epic">
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Description</label>
                    <textarea id="wizard-epic-desc" class="w-full p-3 border border-slate-300 rounded-lg" rows="3" placeholder="Describe the strategic goal and scope..."></textarea>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Track / Team</label>
                    <select id="wizard-epic-track" class="w-full p-3 border border-slate-300 rounded-lg">
                        ${UPDATE_DATA.tracks.map(t => `<option value="${t.name}">${t.name}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Health Status</label>
                    <select id="wizard-epic-health" class="w-full p-3 border border-slate-300 rounded-lg">
                        <option value="on-track">🟢 On-Track</option>
                        <option value="at-risk">🟡 At-Risk</option>
                        <option value="delayed">🔴 Delayed</option>
                    </select>
                </div>

                <div class="border-t border-slate-300 pt-4">
                    <label class="block text-sm font-bold mb-2 text-slate-700">Timeline</label>
                    <div class="grid grid-cols-2 gap-3">
                        <input type="date" id="wizard-epic-start" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="Start Date">
                        <input type="date" id="wizard-epic-end" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="End Date">
                    </div>
                </div>
            </div>

            <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p class="text-sm text-green-900"><strong>💡 Pro Tip:</strong> This epic will be automatically linked to your OKR. Track its progress through the tasks you create.</p>
            </div>
        </div>
    `;
}

function getWizardStep3() {
    return `
        <div class="wizard-step-content">
            <div class="mb-6">
                <div class="text-4xl mb-4">📝</div>
                <h2 class="text-2xl font-bold text-slate-900 mb-2">Step 3: Add Your First Task</h2>
                <p class="text-slate-600">Break down your epic into actionable tasks</p>
            </div>

            <div class="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Task Description <span class="text-red-500">*</span></label>
                    <input type="text" id="wizard-task-text" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="e.g. Migrate homepage to new design system">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-2 text-slate-700">Priority</label>
                        <select id="wizard-task-priority" class="w-full p-3 border border-slate-300 rounded-lg">
                            <option value="high">🔴 High</option>
                            <option value="medium" selected>🟡 Medium</option>
                            <option value="low">🟢 Low</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2 text-slate-700">Story Points</label>
                        <select id="wizard-task-points" class="w-full p-3 border border-slate-300 rounded-lg">
                            <option value="">None</option>
                            <option value="1">1 - Trivial</option>
                            <option value="2">2 - Quick</option>
                            <option value="3">3 - Small</option>
                            <option value="5" selected>5 - Medium</option>
                            <option value="8">8 - Large</option>
                            <option value="13">13 - Very Large</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Planning Horizon</label>
                    <select id="wizard-task-horizon" class="w-full p-3 border border-slate-300 rounded-lg">
                        <option value="1M">🔵 Now (1 Month)</option>
                        <option value="3M">🟣 Next (3 Months)</option>
                        <option value="6M">⚪ Later (6+ Months)</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Acceptance Criteria (Optional)</label>
                    <textarea id="wizard-task-ac" class="w-full p-3 border border-slate-300 rounded-lg" rows="2" placeholder="Define what 'done' means for this task..."></textarea>
                </div>
            </div>

            <div class="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p class="text-sm text-indigo-900"><strong>💡 Pro Tip:</strong> Start with just one task to understand the flow. You can add more tasks later from the Backlog view.</p>
            </div>
        </div>
    `;
}

function getWizardStep4() {
    return `
        <div class="wizard-step-content">
            <div class="mb-6">
                <div class="text-4xl mb-4">🏃</div>
                <h2 class="text-2xl font-bold text-slate-900 mb-2">Step 4: Plan Your First Sprint</h2>
                <p class="text-slate-600">Organize work into 2-week execution cycles</p>
            </div>

            <div class="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Sprint Name <span class="text-red-500">*</span></label>
                    <input type="text" id="wizard-sprint-name" value="Foundation Sprint" class="w-full p-3 border border-slate-300 rounded-lg" placeholder="e.g. Sprint 1 - Foundation">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-2 text-slate-700">Start Date</label>
                        <input type="date" id="wizard-sprint-start" class="w-full p-3 border border-slate-300 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2 text-slate-700">End Date (2 weeks)</label>
                        <input type="date" id="wizard-sprint-end" class="w-full p-3 border border-slate-300 rounded-lg">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-2 text-slate-700">Sprint Goal</label>
                    <textarea id="wizard-sprint-goal" class="w-full p-3 border border-slate-300 rounded-lg" rows="2" placeholder="e.g. Establish platform foundation and security baseline"></textarea>
                </div>

                <div class="border-t border-slate-300 pt-4">
                    <label class="block text-sm font-bold mb-2 text-slate-700">Assign Task to This Sprint?</label>
                    <div class="flex items-center gap-3">
                        <input type="checkbox" id="wizard-assign-task" checked class="w-5 h-5">
                        <label for="wizard-assign-task" class="text-sm text-slate-700">Yes, add my first task to this sprint</label>
                    </div>
                </div>
            </div>

            <div class="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p class="text-sm text-purple-900"><strong>🎉 Almost Done!</strong> After this, you'll have a complete setup: OKR → Epic → Task → Sprint. You can start managing your work immediately!</p>
            </div>
        </div>
    `;
}

function wizardNext() {
    const currentStep = window.wizardState.currentStep;

    // Validate current step
    if (!validateWizardStep(currentStep)) {
        return;
    }

    // Save current step data
    saveWizardStepData(currentStep);

    // Move to next step
    if (currentStep < 4) {
        window.wizardState.currentStep++;
        renderWizardStep(window.wizardState.currentStep);
        updateWizardProgress();
    } else {
        // Final step - create all the data
        completeWizard();
    }
}

function wizardBack() {
    if (window.wizardState.currentStep > 1) {
        window.wizardState.currentStep--;
        renderWizardStep(window.wizardState.currentStep);
        updateWizardProgress();
    }
}

function validateWizardStep(step) {
    let isValid = true;
    let errorMessage = '';

    if (step === 1) {
        const objective = document.getElementById('wizard-okr-objective')?.value.trim();
        const kr1Desc = document.getElementById('wizard-kr1-desc')?.value.trim();

        if (!objective) {
            errorMessage = 'Please enter an objective for your OKR';
            isValid = false;
        } else if (!kr1Desc) {
            errorMessage = 'Please enter at least one key result';
            isValid = false;
        }
    } else if (step === 2) {
        const epicName = document.getElementById('wizard-epic-name')?.value.trim();
        if (!epicName) {
            errorMessage = 'Please enter a name for your epic';
            isValid = false;
        }
    } else if (step === 3) {
        const taskText = document.getElementById('wizard-task-text')?.value.trim();
        if (!taskText) {
            errorMessage = 'Please enter a description for your task';
            isValid = false;
        }
    } else if (step === 4) {
        const sprintName = document.getElementById('wizard-sprint-name')?.value.trim();
        if (!sprintName) {
            errorMessage = 'Please enter a name for your sprint';
            isValid = false;
        }
    }

    if (!isValid) {
        alert(errorMessage);
    }

    return isValid;
}

function saveWizardStepData(step) {
    if (step === 1) {
        window.wizardState.data.okr = {
            quarter: document.getElementById('wizard-okr-quarter').value.trim(),
            objective: document.getElementById('wizard-okr-objective').value.trim(),
            owner: document.getElementById('wizard-okr-owner').value.trim(),
            kr1: {
                description: document.getElementById('wizard-kr1-desc').value.trim(),
                target: parseInt(document.getElementById('wizard-kr1-target').value) || 100,
                unit: document.getElementById('wizard-kr1-unit').value.trim() || '%'
            }
        };
    } else if (step === 2) {
        window.wizardState.data.epic = {
            name: document.getElementById('wizard-epic-name').value.trim(),
            description: document.getElementById('wizard-epic-desc').value.trim(),
            track: document.getElementById('wizard-epic-track').value,
            health: document.getElementById('wizard-epic-health').value,
            startDate: document.getElementById('wizard-epic-start').value,
            endDate: document.getElementById('wizard-epic-end').value
        };
    } else if (step === 3) {
        window.wizardState.data.task = {
            text: document.getElementById('wizard-task-text').value.trim(),
            priority: document.getElementById('wizard-task-priority').value,
            storyPoints: parseInt(document.getElementById('wizard-task-points').value) || null,
            planningHorizon: document.getElementById('wizard-task-horizon').value,
            acceptanceCriteria: document.getElementById('wizard-task-ac').value.trim()
        };
    } else if (step === 4) {
        window.wizardState.data.sprint = {
            name: document.getElementById('wizard-sprint-name').value.trim(),
            startDate: document.getElementById('wizard-sprint-start').value,
            endDate: document.getElementById('wizard-sprint-end').value,
            goal: document.getElementById('wizard-sprint-goal').value.trim(),
            assignTask: document.getElementById('wizard-assign-task').checked
        };
    }
}

function renderWizardStep(step) {
    const content = document.getElementById('wizard-content');
    const nextBtn = document.getElementById('wizard-next-btn');
    const backBtn = document.getElementById('wizard-back-btn');

    if (step === 1) {
        content.innerHTML = getWizardStep1();
        nextBtn.textContent = 'Next →';
        backBtn.classList.add('hidden');
    } else if (step === 2) {
        content.innerHTML = getWizardStep2();
        nextBtn.textContent = 'Next →';
        backBtn.classList.remove('hidden');
    } else if (step === 3) {
        content.innerHTML = getWizardStep3();
        nextBtn.textContent = 'Next →';
        backBtn.classList.remove('hidden');
    } else if (step === 4) {
        content.innerHTML = getWizardStep4();
        nextBtn.textContent = '✓ Complete Setup';
        backBtn.classList.remove('hidden');

        // Auto-fill dates (today + 14 days)
        const today = new Date();
        const twoWeeksLater = new Date(today);
        twoWeeksLater.setDate(today.getDate() + 14);

        document.getElementById('wizard-sprint-start').value = today.toISOString().split('T')[0];
        document.getElementById('wizard-sprint-end').value = twoWeeksLater.toISOString().split('T')[0];
    }
}

function updateWizardProgress() {
    const currentStep = window.wizardState.currentStep;

    document.querySelectorAll('.wizard-step').forEach((step, index) => {
        if (index + 1 < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

function completeWizard() {
    const data = window.wizardState.data;

    // Generate IDs
    const okrId = `okr-${Date.now()}`;
    const epicId = `epic-${Date.now()}`;
    const taskId = `task-${Date.now()}`;
    const sprintId = `sprint-${Date.now()}`;

    // 1. Create OKR
    if (!UPDATE_DATA.metadata.okrs) UPDATE_DATA.metadata.okrs = [];
    UPDATE_DATA.metadata.okrs.push({
        id: okrId,
        quarter: data.okr.quarter,
        objective: data.okr.objective,
        owner: data.okr.owner,
        keyResults: [
            {
                id: `kr-${Date.now()}-1`,
                description: data.okr.kr1.description,
                target: data.okr.kr1.target,
                current: 0,
                unit: data.okr.kr1.unit,
                progress: 0,
                status: 'on-track',
                linkedEpic: epicId
            }
        ],
        overallProgress: 0
    });

    // 2. Create Epic
    if (!UPDATE_DATA.metadata.epics) UPDATE_DATA.metadata.epics = [];
    UPDATE_DATA.metadata.epics.push({
        id: epicId,
        name: data.epic.name,
        track: data.epic.track,
        objective: data.epic.description,
        scope: '',
        keyDeliverables: '',
        successMetrics: '',
        timeline: data.epic.startDate && data.epic.endDate ?
            `${data.epic.startDate} - ${data.epic.endDate}` : '',
        health: data.epic.health,
        status: 'in_progress',
        linkedOKR: okrId
    });

    // 3. Create Sprint
    if (!UPDATE_DATA.metadata.sprints) UPDATE_DATA.metadata.sprints = [];
    UPDATE_DATA.metadata.sprints.push({
        id: sprintId,
        name: data.sprint.name,
        startDate: data.sprint.startDate,
        endDate: data.sprint.endDate,
        goal: data.sprint.goal,
        tracks: [data.epic.track],
        plannedPoints: data.task.storyPoints || 0,
        completedPoints: null,
        status: 'active'
    });

    // 4. Create Task
    const trackIndex = UPDATE_DATA.tracks.findIndex(t => t.name === data.epic.track);
    if (trackIndex !== -1) {
        let backlogIndex = UPDATE_DATA.tracks[trackIndex].subtracks.findIndex(s => s.name === 'Backlog');
        if (backlogIndex === -1) {
            UPDATE_DATA.tracks[trackIndex].subtracks.push({ name: 'Backlog', items: [] });
            backlogIndex = UPDATE_DATA.tracks[trackIndex].subtracks.length - 1;
        }

        const newTask = {
            id: taskId,
            text: data.task.text,
            status: data.sprint.assignTask ? 'next' : 'later',
            priority: data.task.priority,
            storyPoints: data.task.storyPoints,
            contributors: [],
            note: '',
            usecase: '',
            acceptanceCriteria: data.task.acceptanceCriteria ? [data.task.acceptanceCriteria] : [],
            effortLevel: 'medium',
            impactLevel: 'high',
            mediaUrl: '',
            planningHorizon: data.task.planningHorizon,
            epicId: epicId,
            sprintId: data.sprint.assignTask ? sprintId : '',
            releasedIn: '',
            publishedDate: new Date().toISOString().split('T')[0]
        };

        UPDATE_DATA.tracks[trackIndex].subtracks[backlogIndex].items.push(newTask);
    }

    // Mark wizard as completed
    localStorage.setItem(WIZARD_STORAGE_KEY, 'true');

    // Close wizard
    closeWizard();

    // Show success message and redirect to appropriate view
    setTimeout(() => {
        alert('🎉 Setup complete! Your OKR, Epic, Task, and Sprint have been created.\n\nTip: Click "Save to GitHub" to persist your changes.');

        // Switch to Epics view to show the newly created epic
        if (typeof switchView === 'function') {
            switchView('epics');
        }
    }, 300);
}

function skipWizard() {
    if (confirm('Are you sure you want to skip the setup wizard? You can always create OKRs, Epics, and Tasks manually.')) {
        localStorage.setItem(WIZARD_STORAGE_KEY, 'true');
        closeWizard();
    }
}

function closeWizard() {
    const wizard = document.getElementById('onboarding-wizard');
    if (wizard) {
        wizard.remove();
    }
}

// Allow users to reset and re-run wizard
function resetWizard() {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
    location.reload();
}

// Auto-initialize wizard when app loads
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // Wait for UPDATE_DATA to be loaded
        const checkData = setInterval(() => {
            if (typeof UPDATE_DATA !== 'undefined' && UPDATE_DATA) {
                clearInterval(checkData);
                initWizard();
            }
        }, 100);
    });
}

// Export functions
window.initWizard = initWizard;
window.resetWizard = resetWizard;
window.showWizard = showWizard;
window.wizardNext = wizardNext;
window.wizardBack = wizardBack;
window.skipWizard = skipWizard;
