/**
 * ProjectSidebar
 * Left panel showing the project list.
 * Design: Dark Universe - glassmorphism, Space Grotesk font.
 *
 * Fixes vs previous version:
 *  - Delete button is always visible (was hidden by opacity-0 without group class)
 *  - Rename: click pencil icon OR double-click the name text
 *  - Delete confirmation row is clearly visible
 */

import { useState, useRef, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Plus, Trash2, Pencil, FolderOpen, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectSidebar() {
  const {
    projects, activeProjectId,
    createProject, deleteProject, renameProject, switchProject,
  } = useProject();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus & select when entering edit mode
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  function startEdit(id: string, name: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(null);
    setEditingId(id);
    setEditValue(name);
  }

  function confirmEdit() {
    if (editingId && editValue.trim()) {
      renameProject(editingId, editValue.trim());
      toast.success('已重命名');
    }
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function startDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(null);
    setDeletingId(id);
  }

  function confirmDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteProject(id);
    setDeletingId(null);
    toast.success('项目已删除');
  }

  function cancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(null);
  }

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
      <div
        className="flex-1 overflow-y-auto py-1.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}
      >
        {projects.map((proj) => {
          const isActive = proj.id === activeProjectId;
          const isEditing = editingId === proj.id;
          const isDeleting = deletingId === proj.id;

          return (
            <div
              key={proj.id}
              className="mx-2 mb-1 rounded-lg transition-all duration-150"
              style={{
                background: isActive ? 'rgba(79,142,247,0.12)' : 'rgba(255,255,255,0.02)',
                border: isActive
                  ? '1px solid rgba(79,142,247,0.3)'
                  : '1px solid rgba(255,255,255,0.05)',
                cursor: isEditing ? 'default' : 'pointer',
              }}
              onClick={() => {
                if (!isEditing && !isDeleting) switchProject(proj.id);
              }}
            >
              {/* Main row */}
              <div className="flex items-start gap-2 px-2.5 pt-2 pb-1.5">
                {/* Active dot */}
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                  style={{
                    background: isActive ? '#4f8ef7' : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive ? '0 0 6px rgba(79,142,247,0.6)' : 'none',
                  }}
                />

                {/* Name area */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      onBlur={confirmEdit}
                      onClick={e => e.stopPropagation()}
                      className="w-full text-xs font-mono bg-transparent outline-none px-0"
                      style={{
                        color: '#e2e8f0',
                        borderBottom: '1px solid rgba(79,142,247,0.6)',
                      }}
                    />
                  ) : (
                    <div
                      className="text-xs font-mono truncate leading-tight"
                      style={{ color: isActive ? '#e2e8f0' : '#64748b' }}
                      onDoubleClick={e => startEdit(proj.id, proj.name, e)}
                      title={proj.name}
                    >
                      {proj.name}
                    </div>
                  )}

                  {/* Cloud info */}
                  {proj.cloud ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <FolderOpen size={9} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-[9px] font-mono text-slate-600 truncate">
                        {proj.cloud.count.toLocaleString()} pts
                      </span>
                    </div>
                  ) : (
                    <div className="text-[9px] font-mono text-slate-700 mt-0.5">空项目</div>
                  )}
                </div>

                {/* Action buttons — always visible */}
                {!isEditing && !isDeleting && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Rename */}
                    <button
                      onClick={e => startEdit(proj.id, proj.name, e)}
                      title="重命名"
                      className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                      style={{ color: '#334155' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
                    >
                      <Pencil size={10} />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={e => startDelete(proj.id, e)}
                      title="删除"
                      className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                      style={{ color: '#334155' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>

              {/* Delete confirmation row */}
              {isDeleting && (
                <div
                  className="flex items-center gap-1.5 px-2.5 pb-2"
                  onClick={e => e.stopPropagation()}
                >
                  <span className="text-[10px] font-mono text-red-400 flex-1">确认删除？</span>
                  <button
                    onClick={e => confirmDelete(proj.id, e)}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono"
                    style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    <Check size={9} /> 确认
                  </button>
                  <button
                    onClick={cancelDelete}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <X size={9} /> 取消
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div
        className="flex-shrink-0 px-3 py-2 text-center"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span className="text-[9px] font-mono text-slate-700">双击名称或点击 ✏ 重命名</span>
      </div>
    </div>
  );
}
