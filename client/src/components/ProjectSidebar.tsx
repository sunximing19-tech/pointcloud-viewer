/**
 * ProjectSidebar
 * Collapsible left-most panel showing the project list.
 * Design: Dark Universe - glassmorphism, Space Grotesk font.
 * Features:
 *   - List of projects with active indicator
 *   - Click to switch project
 *   - Create new empty project
 *   - Delete project (with confirmation)
 *   - Inline rename on double-click
 *   - Shows file name and point count if cloud is loaded
 */

import { useState, useRef, useCallback } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Plus, Trash2, FolderOpen, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectSidebar() {
  const { projects, activeProjectId, createProject, deleteProject, renameProject, switchProject } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
    setTimeout(() => inputRef.current?.select(), 50);
  }, []);

  const handleConfirmEdit = useCallback(() => {
    if (editingId && editValue.trim()) {
      renameProject(editingId, editValue.trim());
    }
    setEditingId(null);
  }, [editingId, editValue, renameProject]);

  const handleDeleteConfirm = useCallback((id: string) => {
    deleteProject(id);
    setDeletingId(null);
    toast.success('项目已删除');
  }, [deleteProject]);

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: 'rgba(6,9,16,0.97)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-3 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">项目列表</span>
        <button
          onClick={() => { createProject(); toast.success('新项目已创建'); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-all"
          style={{
            background: 'rgba(79,142,247,0.12)',
            border: '1px solid rgba(79,142,247,0.25)',
            color: '#93c5fd',
          }}
          title="新建项目"
        >
          <Plus size={10} /> 新建
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-1.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
        {projects.map((proj) => {
          const isActive = proj.id === activeProjectId;
          const isEditing = editingId === proj.id;
          const isDeleting = deletingId === proj.id;

          return (
            <div
              key={proj.id}
              className="mx-2 mb-1 rounded-lg transition-all duration-150 cursor-pointer"
              style={{
                background: isActive ? 'rgba(79,142,247,0.12)' : 'rgba(255,255,255,0.02)',
                border: isActive ? '1px solid rgba(79,142,247,0.3)' : '1px solid rgba(255,255,255,0.05)',
              }}
              onClick={() => !isEditing && !isDeleting && switchProject(proj.id)}
            >
              <div className="flex items-center gap-2 px-2.5 py-2">
                {/* Active indicator */}
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: isActive ? '#4f8ef7' : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive ? '0 0 6px rgba(79,142,247,0.6)' : 'none',
                  }}
                />

                {/* Name / edit input */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleConfirmEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={handleConfirmEdit}
                      className="w-full text-xs font-mono bg-transparent outline-none"
                      style={{ color: '#e2e8f0', borderBottom: '1px solid rgba(79,142,247,0.5)' }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="text-xs font-mono truncate"
                      style={{ color: isActive ? '#e2e8f0' : '#64748b' }}
                      onDoubleClick={e => { e.stopPropagation(); handleStartEdit(proj.id, proj.name); }}
                      title="双击重命名"
                    >
                      {proj.name}
                    </div>
                  )}

                  {/* Cloud info */}
                  {proj.cloud && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <FolderOpen size={9} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-slate-600 truncate">
                        {proj.cloud.count.toLocaleString()} pts
                      </span>
                    </div>
                  )}
                  {!proj.cloud && (
                    <div className="text-[9px] font-mono text-slate-700 mt-0.5">空项目</div>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && !isDeleting && (
                  <button
                    onClick={e => { e.stopPropagation(); setDeletingId(proj.id); }}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                    style={{ color: '#475569' }}
                    title="删除项目"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>

              {/* Delete confirmation */}
              {isDeleting && (
                <div
                  className="flex items-center gap-1.5 px-2.5 pb-2"
                  onClick={e => e.stopPropagation()}
                >
                  <span className="text-[10px] font-mono text-red-400 flex-1">确认删除？</span>
                  <button
                    onClick={() => handleDeleteConfirm(proj.id)}
                    className="w-5 h-5 flex items-center justify-center rounded"
                    style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                  >
                    <Check size={9} />
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="w-5 h-5 flex items-center justify-center rounded"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}
                  >
                    <X size={9} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="flex-shrink-0 px-3 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span className="text-[9px] font-mono text-slate-700">双击项目名可重命名</span>
      </div>
    </div>
  );
}
