import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, ChevronRight, Download, GripVertical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { Issue, IssueStatus, Priority } from '../types';
import f from './FormField.module.css';
import { exportProjects } from '../utils/exportCSV';
import styles from './Projects.module.css';

const priorityLabel: Record<Priority, string> = { low: '낮음', medium: '보통', high: '높음' };
const priorityColor: Record<Priority, string> = { low: 'var(--text-muted)', medium: 'var(--status-contact)', high: 'var(--accent2)' };
const projectColors = ['#2d6a4f','#e07a5f','#3d405b','#4895ef','#7b2d8b','#f4a261'];

const ISSUE_STATUSES: { value: IssueStatus; label: string; color: string; bg: string }[] = [
  { value: 'todo',        label: '할 일',   color: 'var(--text-muted)',     bg: 'var(--bg-secondary)' },
  { value: 'in_progress', label: '진행중',  color: 'var(--status-contact)', bg: 'var(--status-contact-bg)' },
  { value: 'done',        label: '완료',    color: 'var(--status-won)',     bg: 'var(--status-won-bg)' },
];

export default function Projects() {
  const navigate = useNavigate();
  const { projects, addProject, deleteProject, addIssue, updateIssueStatus, deleteIssue } = useApp();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addProjectModal, setAddProjectModal] = useState(false);
  const [addIssueModal, setAddIssueModal] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({ name: '', color: projectColors[0] });
  const [issueForm, setIssueForm] = useState({ title: '', priority: 'medium' as Priority, dueDate: '' });
  const [drag, setDrag] = useState<{ issueId: string; projectId: string; fromStatus: IssueStatus } | null>(null);
  const [dragOver, setDragOver] = useState<{ projectId: string; status: IssueStatus } | null>(null);

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const handleAddProject = async () => {
    if (!projectForm.name.trim()) return;
    await addProject(projectForm.name, projectForm.color);
    setAddProjectModal(false);
    setProjectForm({ name: '', color: projectColors[0] });
  };

  const handleAddIssue = async () => {
    if (!issueForm.title.trim() || !addIssueModal) return;
    await addIssue(addIssueModal, { title: issueForm.title, status: 'todo', priority: issueForm.priority, dueDate: issueForm.dueDate });
    setAddIssueModal(null);
    setIssueForm({ title: '', priority: 'medium', dueDate: '' });
  };

  const handleDrop = (projectId: string, toStatus: IssueStatus) => {
    if (drag && drag.projectId === projectId && drag.fromStatus !== toStatus) {
      updateIssueStatus(projectId, drag.issueId, toStatus);
    }
    setDrag(null);
    setDragOver(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>프로젝트</h1>
          <p className={styles.subtitle}>{projects.filter(p => p.status === 'active').length}개 진행 중</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.exportBtn} onClick={() => exportProjects(projects)}><Download size={14} /> CSV</button>
          <button className={styles.addBtn} onClick={() => setAddProjectModal(true)}><Plus size={14} /> 새 프로젝트</button>
        </div>
      </div>

      <div className={styles.projectList}>
        {projects.filter(p => p.status === 'active').map(project => {
          const done = project.issues.filter(i => i.status === 'done').length;
          const total = project.issues.length;
          const pct = total === 0 ? 0 : Math.round((done / total) * 100);
          const isOpen = expanded[project.id] === true;

          // 이슈를 상태별로 그룹화
          const grouped: Record<IssueStatus, Issue[]> = {
            todo:        project.issues.filter(i => i.status === 'todo'),
            in_progress: project.issues.filter(i => i.status === 'in_progress'),
            done:        project.issues.filter(i => i.status === 'done'),
          };

          return (
            <div key={project.id} className={styles.projectCard}>
              <div className={styles.projectHeader}>
                <div className={styles.projectLeft} onClick={() => navigate(`/projects/${project.id}`)} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
                  <div className={styles.projectDot} style={{ background: project.color }} />
                  <div>
                    <div className={styles.projectName}>{project.name}</div>
                    <div className={styles.projectMeta}>{done}/{total} 완료 · {pct}%</div>
                  </div>
                </div>
                <div className={styles.projectRight}>
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${pct}%`, background: project.color }} />
                    </div>
                  </div>
                  <button className={styles.issueAddBtn} onClick={e => { e.stopPropagation(); setAddIssueModal(project.id); }}>
                    <Plus size={13} /> 이슈
                  </button>
                  <button className={styles.deleteProjectBtn} onClick={e => { e.stopPropagation(); if (confirm(`"${project.name}" 프로젝트를 삭제할까요?`)) deleteProject(project.id); }}>
                    <Trash2 size={13} />
                  </button>
                  <button className={styles.toggleBtn} onClick={() => toggle(project.id)}>
                    {isOpen ? <ChevronDown size={15} className={styles.chevron} /> : <ChevronRight size={15} className={styles.chevron} />}
                  </button>
                </div>
              </div>

              {/* 이슈 칸반 뷰 */}
              {isOpen && (
                <div className={styles.issueKanban}>
                  {ISSUE_STATUSES.map(({ value: status, label, color, bg }) => {
                    const items = grouped[status];
                    const isDragTarget = dragOver?.projectId === project.id && dragOver?.status === status;
                    return (
                      <div key={status}
                        className={`${styles.issueCol} ${isDragTarget ? styles.issueColDragOver : ''}`}
                        style={{ borderTopColor: color }}
                        onDragOver={e => { e.preventDefault(); setDragOver({ projectId: project.id, status }); }}
                        onDrop={() => handleDrop(project.id, status)}
                        onDragLeave={() => setDragOver(null)}
                      >
                        <div className={styles.issueColHeader}>
                          <span className={styles.issueColTitle} style={{ color }}>{label}</span>
                          <span className={styles.issueColCount} style={{ background: bg, color }}>{items.length}</span>
                        </div>
                        <div className={styles.issueCards}>
                          {items.length === 0 && (
                            <div className={styles.issueColEmpty}>
                              {isDragTarget ? '여기에 드롭' : '없음'}
                            </div>
                          )}
                          {items.map(issue => (
                            <div key={issue.id}
                              className={`${styles.issueCard} ${issue.status === 'done' ? styles.issueCardDone : ''}`}
                              draggable
                              onDragStart={() => setDrag({ issueId: issue.id, projectId: project.id, fromStatus: status })}
                              onDragEnd={() => { setDrag(null); setDragOver(null); }}
                              style={{ opacity: drag?.issueId === issue.id ? 0.4 : 1 }}
                            >
                              <GripVertical size={12} className={styles.issueGrip} />
                              <div className={styles.issueCardBody}>
                                <span className={styles.issueCardTitle}>{issue.title}</span>
                                <div className={styles.issueCardMeta}>
                                  <span style={{ color: priorityColor[issue.priority], fontSize: 10 }}>● {priorityLabel[issue.priority]}</span>
                                  {issue.dueDate && <span className={styles.issueCardDate}>{issue.dueDate}</span>}
                                </div>
                              </div>
                              <button className={styles.issueDeleteBtn}
                                onClick={() => { if (confirm(`"${issue.title}" 이슈를 삭제할까요?`)) deleteIssue(project.id, issue.id); }}>
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {projects.filter(p => p.status === 'active').length === 0 && (
          <div className={styles.emptyState}>
            <p>진행 중인 프로젝트가 없습니다.</p>
            <button className={styles.addBtn} onClick={() => setAddProjectModal(true)}><Plus size={14} /> 첫 프로젝트 만들기</button>
          </div>
        )}
      </div>

      <Modal open={addProjectModal} onClose={() => { setAddProjectModal(false); setProjectForm({ name: '', color: projectColors[0] }); }} title="새 프로젝트">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>프로젝트 이름 *</label>
            <input className={f.input} placeholder="예: Q3 마케팅 캠페인" value={projectForm.name} onChange={e => setProjectForm(p => ({ ...p, name: e.target.value }))} autoFocus />
          </div>
          <div className={f.field}>
            <label className={f.label}>컬러</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {projectColors.map(c => (
                <button key={c} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: projectForm.color === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} onClick={() => setProjectForm(p => ({ ...p, color: c }))} />
              ))}
            </div>
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => { setAddProjectModal(false); setProjectForm({ name: '', color: projectColors[0] }); }}>취소</button>
            <button className={f.btnPrimary} onClick={handleAddProject}>생성</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!addIssueModal} onClose={() => { setAddIssueModal(null); setIssueForm({ title: '', priority: 'medium', dueDate: '' }); }} title="이슈 추가">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>이슈 제목 *</label>
            <input className={f.input} placeholder="예: 기능 요구사항 문서 작성" value={issueForm.title} onChange={e => setIssueForm(p => ({ ...p, title: e.target.value }))} autoFocus />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>우선순위</label>
              <select className={f.select} value={issueForm.priority} onChange={e => setIssueForm(p => ({ ...p, priority: e.target.value as Priority }))}>
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>마감일</label>
              <input className={f.input} type="date" value={issueForm.dueDate} onChange={e => setIssueForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => setAddIssueModal(null)}>취소</button>
            <button className={f.btnPrimary} onClick={handleAddIssue}>추가</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
