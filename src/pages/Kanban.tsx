import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { IssueStatus, Priority, Issue } from '../types';
import f from './FormField.module.css';
import styles from './Kanban.module.css';

const COLUMNS: { id: IssueStatus; label: string }[] = [
  { id: 'todo',        label: '할 일' },
  { id: 'in_progress', label: '진행 중' },
  { id: 'done',        label: '완료' },
];

const PRIORITY_COLOR: Record<Priority, string> = {
  low: 'var(--text-muted)', medium: 'var(--status-contact)', high: 'var(--accent2)',
};
const PRIORITY_LABEL: Record<Priority, string> = { low: '낮음', medium: '보통', high: '높음' };

export default function Kanban() {
  const { projects, addIssue, updateIssue, updateIssueStatus, deleteIssue } = useApp();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  // projects가 나중에 로드될 때 selectedProjectId 자동 설정
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects.filter(p => p.status === 'active')[0]?.id || projects[0].id);
    }
  }, [projects, selectedProjectId]);
  const [addModal, setAddModal] = useState<IssueStatus | null>(null);
  const [issueForm, setIssueForm] = useState({ title: '', priority: 'medium' as Priority, dueDate: '' });

  // drag state
  const dragging = useRef<{ issueId: string; fromStatus: IssueStatus } | null>(null);
  const [dragOver, setDragOver] = useState<IssueStatus | null>(null);
  const [editIssue, setEditIssue] = useState<Issue | null>(null);
  const [eForm, setEForm] = useState({ title: '', status: 'todo' as IssueStatus, priority: 'medium' as Priority, dueDate: '', assignee: '', memo: '' });
  const [dragOverIssueId, setDragOverIssueId] = useState<string | null>(null);

  const project = projects.find(p => p.id === selectedProjectId);

  const handleAddIssue = async () => {
    if (!issueForm.title || !selectedProjectId || !addModal) return;
    await addIssue(selectedProjectId, { title: issueForm.title, status: addModal, priority: issueForm.priority, dueDate: issueForm.dueDate });
    setAddModal(null);
    setIssueForm({ title: '', priority: 'medium', dueDate: '' });
  };

  const handleDragStart = (issueId: string, fromStatus: IssueStatus) => {
    dragging.current = { issueId, fromStatus };
  };

  const handleDragOver = (e: React.DragEvent, colId: IssueStatus, overIssueId?: string) => {
    e.preventDefault();
    setDragOver(colId);
    setDragOverIssueId(overIssueId || null);
  };

  const handleDrop = async (e: React.DragEvent, toStatus: IssueStatus) => {
    e.preventDefault();
    if (!dragging.current || !project) return;
    const { issueId, fromStatus } = dragging.current;
    if (fromStatus !== toStatus) {
      await updateIssueStatus(project.id, issueId, toStatus);
    }
    dragging.current = null;
    setDragOver(null);
    setDragOverIssueId(null);
  };

  const handleDragEnd = () => {
    dragging.current = null;
    setDragOver(null);
    setDragOverIssueId(null);
  };

  const getIssues = (status: IssueStatus): Issue[] =>
    project?.issues.filter(i => i.status === status) || [];

  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).toISOString().split('T')[0];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>칸반 보드</h1>
          <p className={styles.subtitle}>이슈를 드래그해서 상태를 변경하세요</p>
        </div>
        <select
          className={styles.projectSelect}
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
        >
          {projects.filter(p => p.status === 'active').map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!project ? (
        <div className={styles.empty}>진행 중인 프로젝트가 없습니다.</div>
      ) : (
        <>
          {/* 프로젝트 진행률 헤더 */}
          <div className={styles.progressBar}>
            <div className={styles.progressLabel}>
              <span style={{ color: project.color, fontWeight: 700 }}>{project.name}</span>
              <span className={styles.progressCount}>
                {project.issues.filter(i => i.status === 'done').length} / {project.issues.length} 완료
              </span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: project.issues.length === 0 ? '0%' :
                    `${Math.round(project.issues.filter(i => i.status === 'done').length / project.issues.length * 100)}%`,
                  background: project.color,
                }}
              />
            </div>
          </div>

          {/* 칸반 컬럼들 */}
          <div className={styles.board}>
            {COLUMNS.map(col => {
              const issues = getIssues(col.id);
              const isOver = dragOver === col.id;
              return (
                <div
                  key={col.id}
                  className={`${styles.column} ${isOver ? styles.columnOver : ''}`}
                  onDragOver={e => handleDragOver(e, col.id)}
                  onDrop={e => handleDrop(e, col.id)}
                >
                  <div className={styles.colHeader}>
                    <div className={styles.colTitle}>
                      <span className={`${styles.colDot} ${styles[`dot_${col.id}`]}`} />
                      {col.label}
                      <span className={styles.colCount}>{issues.length}</span>
                    </div>
                    <button
                      className={styles.colAddBtn}
                      onClick={() => setAddModal(col.id)}
                      title="이슈 추가"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className={styles.cardList}>
                    {issues.map(issue => {
                      const isOverThis = dragOverIssueId === issue.id;
                      const overdue = issue.dueDate && issue.status !== 'done' && issue.dueDate < today;
                      return (
                        <div
                          key={issue.id}
                          className={`${styles.card} ${isOverThis ? styles.cardOver : ''} ${issue.status === 'done' ? styles.cardDone : ''}`}
                          draggable
                          onDragStart={() => handleDragStart(issue.id, issue.status)}
                          onDragOver={e => { e.stopPropagation(); handleDragOver(e, col.id, issue.id); }}
                          onDragEnd={handleDragEnd}
                        >
                          <div className={styles.cardTop}>
                            <GripVertical size={13} className={styles.grip} />
                            <span className={styles.cardTitle} onClick={e => { e.stopPropagation(); setEForm({ title: issue.title, status: issue.status, priority: issue.priority, dueDate: issue.dueDate || '', assignee: issue.assignee || '', memo: issue.memo || '' }); setEditIssue(issue); }} style={{cursor:'pointer', flex:1}}>{issue.title}</span>
                            <button
                              className={styles.cardDelete}
                              onClick={() => deleteIssue(project.id, issue.id)}
                              title="삭제"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                          <div className={styles.cardMeta}>
                            <span
                              className={styles.priority}
                              style={{ color: PRIORITY_COLOR[issue.priority] }}
                            >
                              ● {PRIORITY_LABEL[issue.priority]}
                            </span>
                            {issue.dueDate && (
                              <span className={`${styles.dueDate} ${overdue ? styles.overdue : ''}`}>
                                {issue.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* 드롭 영역 플레이스홀더 */}
                    {isOver && issues.length === 0 && (
                      <div className={styles.dropPlaceholder} />
                    )}

                    {/* 빈 컬럼 안내 */}
                    {!isOver && issues.length === 0 && (
                      <div className={styles.emptyCol}>이슈 없음</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Modal open={!!addModal} onClose={() => setAddModal(null)} title={`이슈 추가 — ${COLUMNS.find(c => c.id === addModal)?.label}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>이슈 제목 *</label>
            <input
              className={f.input}
              placeholder="예: API 연동 테스트"
              value={issueForm.title}
              onChange={e => setIssueForm(p => ({ ...p, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddIssue()}
              autoFocus
            />
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
            <button className={f.btnSecondary} onClick={() => setAddModal(null)}>취소</button>
            <button className={f.btnPrimary} onClick={handleAddIssue}>추가</button>
          </div>
        </div>
      </Modal>

      {/* 이슈 수정 모달 */}
      <Modal open={!!editIssue} onClose={() => setEditIssue(null)} title="이슈 수정">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>제목 *</label>
            <input className={f.input} value={eForm.title} onChange={e => setEForm(p => ({...p, title: e.target.value}))} autoFocus />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>상태</label>
              <select className={f.select} value={eForm.status} onChange={e => setEForm(p => ({...p, status: e.target.value as IssueStatus}))}>
                <option value="todo">할 일</option>
                <option value="in_progress">진행중</option>
                <option value="done">완료</option>
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>우선순위</label>
              <select className={f.select} value={eForm.priority} onChange={e => setEForm(p => ({...p, priority: e.target.value as Priority}))}>
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>마감일</label>
              <input className={f.input} type="date" value={eForm.dueDate} onChange={e => setEForm(p => ({...p, dueDate: e.target.value}))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>담당자</label>
              <input className={f.input} placeholder="담당자 이름" value={eForm.assignee} onChange={e => setEForm(p => ({...p, assignee: e.target.value}))} />
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>메모</label>
            <textarea className={f.textarea} rows={3} placeholder="메모를 입력하세요..." value={eForm.memo} onChange={e => setEForm(p => ({...p, memo: e.target.value}))} />
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => setEditIssue(null)}>취소</button>
            <button className={f.btnPrimary} onClick={async () => {
              if (!eForm.title.trim() || !editIssue) return;
              await updateIssue(editIssue.id, { title: eForm.title, status: eForm.status, priority: eForm.priority, dueDate: eForm.dueDate, assignee: eForm.assignee, memo: eForm.memo });
              setEditIssue(null);
            }}>저장</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
