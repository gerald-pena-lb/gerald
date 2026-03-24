"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { generateProjectPDF } from "@/lib/pdf";

interface Task {
  id: number;
  section_id: number;
  name: string;
  description: string;
  status: string;
  due_date: string;
  remarks: string;
  notes: string;
  assigned_to: string;
  sort_order: number;
}

interface Section {
  id: number;
  name: string;
  sort_order: number;
}

interface ProjectDetail {
  id: number;
  name: string;
  description: string;
  goals: string;
  date: string;
  due_date: string;
  status: string;
  sections: Section[];
  tasks: Task[];
  expenditures: { id: number; description: string; amount: number; date: string; remarks: string }[];
  total_tasks: number;
  completed_tasks: number;
  completion_pct: number;
}

interface MemberOption {
  id: number;
  full_name: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", goals: "", date: "", due_date: "", status: "" });
  const [newSection, setNewSection] = useState("");
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [taskForms, setTaskForms] = useState<Record<number, boolean>>({});
  const [newTaskName, setNewTaskName] = useState("");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  async function load() {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setProject(data);
    setForm({
      name: data.name,
      description: data.description || "",
      goals: data.goals || "",
      date: data.date,
      due_date: data.due_date || "",
      status: data.status,
    });
  }

  useEffect(() => {
    load();
    fetch("/api/members").then((r) => r.json()).then(setMembers).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(false);
    load();
  }

  async function handleDelete() {
    if (!confirm("Delete this project and all its sections/tasks?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  }

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSection.trim()) return;
    await fetch(`/api/projects/${id}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSection }),
    });
    setNewSection("");
    setShowSectionForm(false);
    load();
  }

  async function handleDeleteSection(sectionId: number) {
    if (!confirm("Delete this section and all its tasks?")) return;
    await fetch(`/api/projects/${id}/sections?section_id=${sectionId}`, { method: "DELETE" });
    load();
  }

  async function handleAddTask(sectionId: number) {
    if (!newTaskName.trim()) return;
    await fetch(`/api/projects/${id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section_id: sectionId, name: newTaskName }),
    });
    setNewTaskName("");
    setTaskForms((f) => ({ ...f, [sectionId]: false }));
    load();
  }

  async function handleToggleTaskStatus(task: Task) {
    const next = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "completed" : "pending";
    await fetch(`/api/projects/${id}/tasks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: task.id, status: next }),
    });
    load();
  }

  async function handleUpdateTask(task: Task) {
    await fetch(`/api/projects/${id}/tasks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: task.id,
        name: task.name,
        description: task.description,
        due_date: task.due_date,
        remarks: task.remarks,
        notes: task.notes,
        assigned_to: task.assigned_to,
      }),
    });
    setEditingTask(null);
    setExpandedTask(null);
    load();
  }

  async function handleDeleteTask(taskId: number) {
    await fetch(`/api/projects/${id}/tasks?task_id=${taskId}`, { method: "DELETE" });
    setExpandedTask(null);
    load();
  }

  function getTasksForSection(sectionId: number) {
    return (project?.tasks || []).filter((t) => t.section_id === sectionId);
  }

  if (!project) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header with completion */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Project</div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generateProjectPDF(project)}
            className="px-4 py-2 bg-[#c9a227] text-white rounded-md text-sm hover:bg-[#b08d20]"
          >
            Download Report (PDF)
          </button>
          <button onClick={() => setEditing(!editing)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            {editing ? "Cancel" : "Edit"}
          </button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>

      {/* Completion bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress: {project.completed_tasks}/{project.total_tasks} tasks completed
          </span>
          <span className="text-lg font-bold text-[#1e3a5f]">{project.completion_pct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-[#c9a227] h-3 rounded-full transition-all"
            style={{ width: `${project.completion_pct}%` }}
          />
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Goals</label>
              <textarea value={form.goals} onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
                rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <button onClick={handleSave} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#152c4a]">
              Save Changes
            </button>
          </div>
        ) : (
          <div>
            {project.goals && (
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Goals</div>
                <p className="text-gray-700 whitespace-pre-wrap">{project.goals}</p>
              </div>
            )}
            {project.description && (
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Description</div>
                <p className="text-gray-600 whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
            <div className="flex gap-6 text-sm">
              <span className="text-gray-500">Start: {project.date}</span>
              {project.due_date && <span className="text-gray-500">Due: {project.due_date}</span>}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                project.status === "upcoming" ? "bg-blue-100 text-blue-800" :
                project.status === "ongoing" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
              }`}>{project.status}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sections & Tasks (Asana-like) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Sections & Tasks</h2>
          <button
            onClick={() => setShowSectionForm(!showSectionForm)}
            className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#152c4a]"
          >
            Add Section
          </button>
        </div>

        {showSectionForm && (
          <form onSubmit={handleAddSection} className="bg-white rounded-lg shadow p-4 mb-4 flex gap-3">
            <input
              type="text"
              required
              placeholder="Section name..."
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button type="submit" className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#152c4a]">Add</button>
          </form>
        )}

        {project.sections.map((section) => {
          const sectionTasks = getTasksForSection(section.id);
          const sectionCompleted = sectionTasks.filter((t) => t.status === "completed").length;
          return (
            <div key={section.id} className="bg-white rounded-lg shadow mb-4">
              {/* Section header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-800">{section.name}</h3>
                  <span className="text-xs text-gray-500">{sectionCompleted}/{sectionTasks.length} done</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setTaskForms((f) => ({ ...f, [section.id]: !f[section.id] })); setNewTaskName(""); }}
                    className="px-2 py-1 text-xs bg-[#1e3a5f] text-white rounded hover:bg-[#152c4a]"
                  >
                    + Task
                  </button>
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Add task form */}
              {taskForms[section.id] && (
                <div className="px-5 py-3 border-b border-gray-100 bg-blue-50 flex gap-2">
                  <input
                    type="text"
                    placeholder="Task name..."
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTask(section.id); } }}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => handleAddTask(section.id)}
                    className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#152c4a]"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Tasks */}
              {sectionTasks.map((task) => (
                <div key={task.id} className="border-b border-gray-100 last:border-0">
                  <div
                    className="flex items-center px-5 py-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleTaskStatus(task); }}
                      className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center flex-shrink-0 ${
                        task.status === "completed"
                          ? "bg-green-500 border-green-500 text-white"
                          : task.status === "in_progress"
                          ? "border-yellow-500 bg-yellow-50"
                          : "border-gray-300"
                      }`}
                    >
                      {task.status === "completed" && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                      {task.status === "in_progress" && (
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {task.name}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {task.assigned_to && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{task.assigned_to}</span>}
                      {task.due_date && <span>{task.due_date}</span>}
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        task.status === "completed" ? "bg-green-100 text-green-700" :
                        task.status === "in_progress" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                      }`}>{task.status}</span>
                    </div>
                  </div>

                  {/* Expanded task detail */}
                  {expandedTask === task.id && (
                    <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Task Name</label>
                          <input
                            type="text"
                            value={editingTask?.id === task.id ? editingTask.name : task.name}
                            onChange={(e) => setEditingTask({ ...(editingTask || task), id: task.id, name: e.target.value })}
                            onFocus={() => { if (!editingTask || editingTask.id !== task.id) setEditingTask({ ...task }); }}
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
                          <select
                            value={editingTask?.id === task.id ? editingTask.assigned_to || "" : task.assigned_to || ""}
                            onChange={(e) => setEditingTask({ ...(editingTask || task), id: task.id, assigned_to: e.target.value })}
                            onFocus={() => { if (!editingTask || editingTask.id !== task.id) setEditingTask({ ...task }); }}
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.full_name}>{m.full_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                          <input
                            type="date"
                            value={editingTask?.id === task.id ? editingTask.due_date || "" : task.due_date || ""}
                            onChange={(e) => setEditingTask({ ...(editingTask || task), id: task.id, due_date: e.target.value })}
                            onFocus={() => { if (!editingTask || editingTask.id !== task.id) setEditingTask({ ...task }); }}
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                          <input
                            type="text"
                            value={editingTask?.id === task.id ? editingTask.description || "" : task.description || ""}
                            onChange={(e) => setEditingTask({ ...(editingTask || task), id: task.id, description: e.target.value })}
                            onFocus={() => { if (!editingTask || editingTask.id !== task.id) setEditingTask({ ...task }); }}
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
                          <textarea
                            rows={2}
                            value={editingTask?.id === task.id ? editingTask.remarks || "" : task.remarks || ""}
                            onChange={(e) => setEditingTask({ ...(editingTask || task), id: task.id, remarks: e.target.value })}
                            onFocus={() => { if (!editingTask || editingTask.id !== task.id) setEditingTask({ ...task }); }}
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                          <textarea
                            rows={2}
                            value={editingTask?.id === task.id ? editingTask.notes || "" : task.notes || ""}
                            onChange={(e) => setEditingTask({ ...(editingTask || task), id: task.id, notes: e.target.value })}
                            onFocus={() => { if (!editingTask || editingTask.id !== task.id) setEditingTask({ ...task }); }}
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {editingTask?.id === task.id && (
                          <button
                            onClick={() => handleUpdateTask(editingTask)}
                            className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-md text-xs hover:bg-[#152c4a]"
                          >
                            Save Changes
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs hover:bg-red-700"
                        >
                          Delete Task
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {sectionTasks.length === 0 && !taskForms[section.id] && (
                <div className="px-5 py-4 text-sm text-gray-400">No tasks in this section</div>
              )}
            </div>
          );
        })}

        {project.sections.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            No sections yet. Add a section to start organizing tasks.
          </div>
        )}
      </div>

      {/* Expenditures */}
      {project.expenditures.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expenditures</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {project.expenditures.map((exp) => (
                <tr key={exp.id}>
                  <td className="px-3 py-2 text-sm">{exp.date}</td>
                  <td className="px-3 py-2 text-sm">{exp.description}</td>
                  <td className="px-3 py-2 text-sm">&#8369;{exp.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
