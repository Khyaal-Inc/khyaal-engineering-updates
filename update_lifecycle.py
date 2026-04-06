import sys

content = open("lifecycle-guide.js").read()

replacements = {
    "nextView: 'sprint', nextLabel: 'Assign to a sprint →',": "prevView: 'roadmap', prevLabel: '← Roadmap',\n        nextView: 'sprint', nextLabel: 'Assign to a sprint →',",
    "nextView: 'releases', nextLabel: 'Ship done work →',": "prevView: 'sprint', prevLabel: '← Sprint Plan',\n        nextView: 'releases', nextLabel: 'Ship done work →',",
    "nextView: 'kanban', nextLabel: 'Start building →',": "prevView: 'backlog', prevLabel: '← Backlog',\n        nextView: 'kanban', nextLabel: 'Start building →',",
    "nextView: 'kanban', nextLabel: 'Open daily board →',": "prevView: 'kanban', prevLabel: '← Daily Board',\n        nextView: 'kanban', nextLabel: 'Open daily board →',",
    "nextView: 'epics', nextLabel: 'Create Epics for each goal →',": "prevView: 'analytics', prevLabel: '← Analytics',\n        nextView: 'epics', nextLabel: 'Create Epics for each goal →',",
    "nextView: 'roadmap', nextLabel: 'Place on roadmap →',": "prevView: 'okr', prevLabel: '← OKRs',\n        nextView: 'roadmap', nextLabel: 'Place on roadmap →',",
    "nextView: 'backlog', nextLabel: 'Break into tasks →',": "prevView: 'epics', prevLabel: '← Epics',\n        nextView: 'backlog', nextLabel: 'Break into tasks →',",
    "nextView: 'analytics', nextLabel: 'Review velocity →',": "prevView: 'kanban', prevLabel: '← Sprint Board',\n        nextView: 'analytics', nextLabel: 'Review velocity →',",
    "nextView: 'okr', nextLabel: 'Update quarterly goals →',": "prevView: 'releases', prevLabel: '← Releases',\n        nextView: 'okr', nextLabel: 'Update quarterly goals →',",
    "nextView: 'spikes', nextLabel: 'Validate ideas as spikes →',": "prevView: null, prevLabel: '',\n        nextView: 'spikes', nextLabel: 'Validate ideas as spikes →',",
    "nextView: 'okr', nextLabel: 'Set quarterly goals →',": "prevView: 'ideation', prevLabel: '← Raw Ideas',\n        nextView: 'okr', nextLabel: 'Set quarterly goals →',",
    "nextView: 'sprint', nextLabel: 'Plan the sprint →',": "prevView: 'backlog', prevLabel: '← Task Backlog',\n        nextView: 'sprint', nextLabel: 'Plan the sprint →',"
}

for k, v in replacements.items():
    content = content.replace(k, v)

old_render = """        ${info.nextView ? `
        <button onclick="switchView('${info.nextView}');toggleInfoCard('${viewId}')" class="lgi-next-btn">
            ${info.nextLabel}
        </button>` : ''}"""
new_render = """        <div style="display:flex;gap:8px;margin-top:16px;">
            ${info.prevView ? `<button onclick="switchView('${info.prevView}');toggleInfoCard('${viewId}')" class="lgi-next-btn" style="flex:1;background:#f1f5f9;color:#64748b;border-color:#e2e8f0;font-size:11px;">${info.prevLabel}</button>` : ''}
            ${info.nextView ? `<button onclick="switchView('${info.nextView}');toggleInfoCard('${viewId}')" class="lgi-next-btn" style="flex:2;">${info.nextLabel}</button>` : ''}
        </div>"""

content = content.replace(old_render, new_render)
open("lifecycle-guide.js", "w").write(content)
print("Updated lifecycle-guide.js")
