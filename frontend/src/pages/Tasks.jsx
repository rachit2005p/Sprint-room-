import React, { useState } from 'react';
import { Plus } from 'lucide-react';

/**
 * Tasks — Kanban-board-style page with three columns (Todo, In Progress, Done).
 * Renders hardcoded sample tasks with assignee avatars. All state is local;
 * this is a frontend-only UI prototype — no API calls or drag-and-drop.
 */
const initialTasks = [
  { id: 1, title: 'Design system audit', description: 'Review existing components and identify gaps in the design system.', status: 'todo', assignees: ['JD', 'AK', 'ML'] },
  { id: 2, title: 'API integration specs', description: 'Document all endpoints needed for the dashboard module.', status: 'todo', assignees: ['RK'] },
  { id: 3, title: 'User onboarding flow', description: 'Build step-by-step onboarding wizard for new users.', status: 'in-progress', assignees: ['SP', 'JC'] },
  { id: 4, title: 'Notification service', description: 'Implement real-time push notifications via WebSocket.', status: 'in-progress', assignees: ['AT'] },
  { id: 5, title: 'Deploy staging env', description: 'Set up CI/CD pipeline and deploy to staging server.', status: 'done', assignees: ['ML', 'JD'] },
  { id: 6, title: 'Unit test coverage', description: 'Achieve 80%+ unit test coverage on core modules.', status: 'done', assignees: ['RK', 'SP', 'JC'] },
  { id: 7, title: 'Database migration plan', description: 'Outline migration strategy for schema v2.', status: 'done', assignees: ['AT'] },
];

/* Column definitions for the Kanban board:
   - key:     status value matched against each task's `status` field
   - label:   column header shown in the UI
   - badge:   Tailwind class that colours the status pill (pink = todo, blue = progress, green = done) */
const columns = [
  { key: 'todo', label: 'Todo', badge: 'badge-pink' },
  { key: 'in-progress', label: 'In Progress', badge: 'badge-blue' },
  { key: 'done', label: 'Done', badge: 'badge-green' },
];

const Tasks = () => {
  const [tasks, setTasks] = useState(initialTasks);

  const getColumnTasks = (status) => tasks.filter(t => t.status === status);

  return (
    <div>
      <h1 className="section-title mb-1">Tasks</h1>
      <p className="section-subtitle mb-6">Track and manage sprint tasks across your team.</p>

      <div className="flex gap-5 overflow-x-auto pb-4">
        {columns.map(col => {
          const colTasks = getColumnTasks(col.key);
          return (
            <div key={col.key} className="min-w-[280px] w-[320px] shrink-0 bg-bg-secondary rounded-card p-4 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={col.badge}>{col.label}</span>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
              </div>

              <div className="space-y-3">
                {colTasks.map(task => (
                  <div key={task.id} className="card shadow-soft">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{task.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{task.description}</p>
                    <div className="flex items-center -space-x-1.5">
                      {task.assignees.map((initials, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full border-2 border-white bg-brand-light text-brand text-[10px] font-bold flex items-center justify-center"
                          title={initials}
                        >
                          {initials}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn-ghost w-full mt-3 flex items-center justify-center gap-1.5 text-sm">
                <Plus size={15} /> Add Task
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Tasks;
