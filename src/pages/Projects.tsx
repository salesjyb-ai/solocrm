import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IssueStatusSelect } from '../components/StatusBadge';
import Modal from '../components/Modal';
import type { Priority } from '../types';
import f from './FormField.module.css';
import { exportProjects } from '../utils/exportCSV';
import styles from './Projects.module.css';

const priorityLabel: Record<Priority, string> = { low: '낮음', medium: '보통', high: '높음' };
const priorityColor: Record<Priority, string> = { low: 'var(--text-muted)', medium: 'var(--status-contact)', high: 'var(--accent2)' };
const projectColors = ['#2d6a4f','#e07a5f','#3d405b','#4895ef','#7b2d8b','#f4a261'];

export default function Projects() {
  const navigate = useNavigate();
  const { projects, addProject, deleteProject, addIssue, updateIssueStatus, deleteIssue } = useApp();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(Object.fromEntries(projects.map(p => [p.id, true])));
  const [addProjectModal, setAddProjectModal] = useState(false);
  const [addIssueModal, setAddIssueModal] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({ name: '', color: projectColors[0] });
  const [issueForm, setIssueForm] = useState({ title: '', priority: 'medium' as Priority, dueDate: '' });

  const toggle = (id: string) => setExpanded(p => ({...p, [id]: !p[id]}));

  const handleAddProject = () => {
    if (!projectForm.name) return;
    addProject(projectForm.name, projectForm.color);
    setAddProjectModal(false);
    setProjectForm({ name: '', color: projectColors[0] });
  };

  const handleAddIssue = () => {
    if (!issueForm.title || !addIssueModal) return;
    addIssue(addIssueModal, { title: issueForm.title, status: 'todo', priority: issueForm.priority, dueDate: issueForm.dueDate });
    setAddIssueModal(null);
    setIssueForm({ title: '', priority: 'medium', dueDate: '' });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>프로젝트</h1>
          <p className={styles.subtitle}>{projects.filter(p=>p.status==='active').length}개 진행 중</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className={styles.exportBtn} onClick={() => exportProjects(projects)}>
            <Download size={14} /> CSV
          </button>
          <button className={styles.addBtn} onClick={() => setAddProjectModal(true)}>
            <Plus size={14} /> 새 프로젝트
          </button>
        </div>
      </div>

      <div className={styles.projectList}>
        {projects.filter(p => p.status === 'active').map(project => {
          const done = project.issues.filter(i => i.status === 'done').length;
          const total = project.issues.length;
          const pct = total === 0 ? 0 : Math.round((done / total) * 100);
          return (
            <div key={project.id} className={styles.projectCard}>
              <div className={styles.projectHeader} onClick={() => toggle(project.id)}>
                <div className={styles.projectLeft}>
                  <div className={styles.projectDot} style={{ background: project.color }} />
                  <div>
                    <div className={styles.projectName} onClick={e => { e.stopPropagation(); navigate(`/projects/${project.id}`); }} style={{cursor:'pointer'}}>{project.name}</div>
                    <div className={styles.projectMeta}>{done}/{total} 완료 · {pct}%</div>
                  </div>
                </div>
                <div className={styles.projectRight}>
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${pct}%`, background: project.color }} /></div>
                  </div>
                  <button className={styles.issueAddBtn} onClick={e => { e.stopPropagation(); setAddIssueModal(project.id); }}>
                    <Plus size={13} /> 이슈
                  </button>
                  <button className={styles.deleteProjectBtn} onClick={e => { e.stopPropagation(); if(confirm(`"${project.name}" 프로젝트를 삭제할까요?`)) deleteProject(project.id); }}>
                    <Trash2 size={13} />
                  </button>
                  {expanded[project.id] ? <ChevronDown size={15} className={styles.chevron} /> : <ChevronRight size={15} className={styles.chevron} />}
                </div>
              </div>

              {expanded[project.id] && (
                <div className={styles.issueTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>이슈</th>
                        <th>상태</th>
                        <th>우선순위</th>
                        <th>마감일</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.issues.length === 0 && (
                        <tr><td colSpan={5} className={styles.emptyRow}>이슈가 없습니다. 추가해보세요!</td></tr>
                      )}
                      {project.issues.map(issue => (
                        <tr key={issue.id} className={`${styles.issueRow} ${issue.status === 'done' ? styles.issueDone : ''}`}>
                          <td className={styles.issueTitleCell}>{issue.title}</td>
                          <td><IssueStatusSelect value={issue.status} onChange={s => updateIssueStatus(project.id, issue.id, s)} /></td>
                          <td>
                            <span className={styles.priority} style={{ color: priorityColor[issue.priority] }}>
                              ● {priorityLabel[issue.priority]}
                            </span>
                          </td>
                          <td className={styles.dateCell}>{issue.dueDate || <span className={styles.na}>-</span>}</td>
                          <td>
                            <button className={styles.deleteBtn} onClick={() => deleteIssue(project.id, issue.id)}>
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {projects.filter(p=>p.status==='active').length === 0 && (
          <div className={styles.emptyState}>
            <p>진행 중인 프로젝트가 없습니다.</p>
            <button className={styles.addBtn} onClick={() => setAddProjectModal(true)}><Plus size={14} /> 첫 프로젝트 만들기</button>
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      <Modal open={addProjectModal} onClose={() => setAddProjectModal(false)} title="새 프로젝트">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>프로젝트 이름 *</label>
            <input className={f.input} placeholder="예: Q3 마케팅 캠페인" value={projectForm.name} onChange={e => setProjectForm(p => ({...p, name: e.target.value}))} />
          </div>
          <div className={f.field}>
            <label className={f.label}>컬러</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {projectColors.map(c => (
                <button key={c} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: projectForm.color === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', transition: 'border 0.1s' }} onClick={() => setProjectForm(p => ({...p, color: c}))} />
              ))}
            </div>
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => setAddProjectModal(false)}>취소</button>
            <button className={f.btnPrimary} onClick={handleAddProject}>생성</button>
          </div>
        </div>
      </Modal>

      {/* Add Issue Modal */}
      <Modal open={!!addIssueModal} onClose={() => setAddIssueModal(null)} title="이슈 추가">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>이슈 제목 *</label>
            <input className={f.input} placeholder="예: 기능 요구사항 문서 작성" value={issueForm.title} onChange={e => setIssueForm(p => ({...p, title: e.target.value}))} />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>우선순위</label>
              <select className={f.select} value={issueForm.priority} onChange={e => setIssueForm(p => ({...p, priority: e.target.value as Priority}))}>
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>마감일</label>
              <input className={f.input} type="date" value={issueForm.dueDate} onChange={e => setIssueForm(p => ({...p, dueDate: e.target.value}))} />
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
