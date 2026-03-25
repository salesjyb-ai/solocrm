import { useState, useMemo, useRef } from 'react';
import { Plus, Check, Download, ChevronDown, ChevronRight, AlertCircle, Calendar, Trash2, X, Pencil, GripVertical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { Task, Subtask } from '../types';
import f from './FormField.module.css';
import { exportTasks } from '../utils/exportCSV';
import styles from './Tasks.module.css';

type ViewMode = 'date' | 'all';
type TabFilter = 'today' | 'upcoming' | 'all';

// drag payload: task 드래그 or subtask 드래그 구분
type DragPayload =
  | { kind: 'task'; taskId: string; fromDate: string }
  | { kind: 'subtask'; taskId: string; subtaskId: string };

function getKSTToday() {
  return new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function formatDateLabel(dateStr: string, today: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const todayD = new Date(today + 'T00:00:00');
  const diff = Math.round((d.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24));
  const weekday = d.toLocaleDateString('ko-KR', { weekday: 'short' });
  const mmdd = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  if (diff < 0) return { label: `${mmdd} (${weekday})`, tag: '기한 초과', tagType: 'overdue' };
  if (diff === 0) return { label: `${mmdd} (${weekday})`, tag: '오늘', tagType: 'today' };
  if (diff === 1) return { label: `${mmdd} (${weekday})`, tag: '내일', tagType: 'tomorrow' };
  if (diff <= 7) return { label: `${mmdd} (${weekday})`, tag: `${diff}일 후`, tagType: 'soon' };
  return { label: `${mmdd} (${weekday})`, tag: '', tagType: 'normal' };
}

function MiniCalendar({ tasks, onSelectDate, onClose }: { tasks: Task[]; onSelectDate: (date: string) => void; onClose: () => void }) {
  const today = getKSTToday();
  const [viewDate, setViewDate] = useState(() => new Date(today + 'T00:00:00'));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const taskDates = new Set(tasks.filter(t => { if (!t.dueDate) return false; const d = new Date(t.dueDate + 'T00:00:00'); return d.getFullYear() === year && d.getMonth() === month; }).map(t => t.dueDate));
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  return (
    <div className={styles.calendarPopup}>
      <div className={styles.calNavRow}>
        <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className={styles.calNavBtn}>‹</button>
        <span className={styles.calMonthLabel}>{year}년 {month + 1}월</span>
        <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className={styles.calNavBtn}>›</button>
        <button onClick={onClose} className={styles.calCloseBtn}><X size={14} /></button>
      </div>
      <div className={styles.calGrid}>
        {['일','월','화','수','목','금','토'].map(d => <div key={d} className={styles.calWeekday}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return (
            <button key={dateStr} className={`${styles.calDay} ${dateStr === today ? styles.calToday : ''} ${taskDates.has(dateStr) ? styles.calHasTasks : ''}`}
              onClick={() => { onSelectDate(dateStr); onClose(); }}>
              {day}{taskDates.has(dateStr) && <span className={styles.calDot} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Tasks() {
  const { tasks, toggleTask, deleteTask, addTask, updateTaskDate, updateTaskSubtasks, leads, projects } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [tabFilter, setTabFilter] = useState<TabFilter>('upcoming');
  const [showDone, setShowDone] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', dueDate: '', linkedType: '' as '' | 'lead' | 'project', linkedId: '' });
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null); // subtask 드롭 대상
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const today = getKSTToday();
  const weekLater = new Date(new Date().getTime() + 9 * 60 * 60 * 1000 + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleCalendarSelect = (date: string) => { setSelectedDate(date); setTabFilter('all'); setShowDone(true); };
  const clearDateFilter = () => setSelectedDate(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedDate) return t.dueDate === selectedDate && (!t.done || showDone);
      if (!showDone && t.done) return false;
      if (tabFilter === 'today') return t.dueDate === today;
      if (tabFilter === 'upcoming') return t.dueDate <= weekLater;
      return true;
    });
  }, [tasks, showDone, tabFilter, today, weekLater, selectedDate]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const noDate: Task[] = [];
    filteredTasks.forEach(t => {
      if (!t.dueDate) { noDate.push(t); return; }
      if (!map[t.dueDate]) map[t.dueDate] = [];
      map[t.dueDate].push(t);
    });
    return { sortedDates: Object.keys(map).sort(), map, noDate };
  }, [filteredTasks]);

  const toggleCollapse = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }));
  const openModal = (date = '') => { setModalDate(date); setForm({ title: '', dueDate: date, linkedType: '', linkedId: '' }); setModalOpen(true); };
  const handleModalAdd = async () => {
    if (!form.title.trim()) return;
    const linkedTo = form.linkedType && form.linkedId ? (() => {
      if (form.linkedType === 'lead') { const l = leads.find(l => l.id === form.linkedId); return l ? { type: 'lead' as const, id: l.id, name: l.company } : undefined; }
      const p = projects.find(p => p.id === form.linkedId); return p ? { type: 'project' as const, id: p.id, name: p.name } : undefined;
    })() : undefined;
    await addTask({ title: form.title, done: false, dueDate: form.dueDate || today, linkedTo, subtasks: [] });
    setModalOpen(false);
    setForm({ title: '', dueDate: '', linkedType: '', linkedId: '' });
  };
  const handleInlineAdd = async (date: string) => {
    const title = (inlineInputs[date] || '').trim();
    if (!title) return;
    await addTask({ title, done: false, dueDate: date, linkedTo: undefined, subtasks: [] });
    setInlineInputs(p => ({ ...p, [date]: '' }));
  };

  // 드래그 앤 드롭: 날짜 그룹 간 task 이동
  const handleDateDrop = (toDate: string) => {
    if (!drag) return;
    if (drag.kind === 'task' && drag.fromDate !== toDate) {
      updateTaskDate(drag.taskId, toDate);
    }
    if (drag.kind === 'subtask') {
      // 날짜 그룹에 드롭 시 무시 (task에만 드롭)
    }
    setDrag(null);
    setDragOverDate(null);
  };

  // 드래그 앤 드롭: subtask → 다른 task로 이동
  const handleTaskDrop = (toTaskId: string) => {
    if (!drag || drag.kind !== 'subtask') return;
    const fromTask = tasks.find(t => t.id === drag.taskId);
    const toTask = tasks.find(t => t.id === toTaskId);
    if (!fromTask || !toTask || drag.taskId === toTaskId) return;
    const sub = fromTask.subtasks.find(s => s.id === drag.subtaskId);
    if (!sub) return;
    updateTaskSubtasks(drag.taskId, fromTask.subtasks.filter(s => s.id !== drag.subtaskId));
    updateTaskSubtasks(toTaskId, [...(toTask.subtasks || []), sub]);
    setDrag(null);
    setDragOverTaskId(null);
  };

  const pendingCount = tasks.filter(t => !t.done).length;
  const doneCount = tasks.filter(t => t.done).length;
  const todayCount = tasks.filter(t => t.dueDate === today && !t.done).length;

  const renderDateGroup = (date: string) => {
    const { label, tag, tagType } = formatDateLabel(date, today);
    const isOpen = collapsed[date] !== true;
    const items = grouped.map[date];
    const isDragTarget = dragOverDate === date && drag?.kind === 'task';
    return (
      <div key={date} className={`${styles.dateGroup} ${isDragTarget ? styles.dateGroupDragOver : ''}`}
        ref={el => { dateRefs.current[date] = el; }}
        onDragOver={e => { e.preventDefault(); if (drag?.kind === 'task') setDragOverDate(date); }}
        onDrop={() => handleDateDrop(date)}
        onDragLeave={() => setDragOverDate(null)}
      >
        <div className={styles.dateHeader}>
          <button className={styles.dateToggle} onClick={() => toggleCollapse(date)}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <span className={styles.dateLabel}>{label}</span>
          {tag && <span className={`${styles.dateTag} ${styles[`tag_${tagType}`]}`}>{tag}</span>}
          <span className={styles.dateCount}>{items.filter(t => !t.done).length}개</span>
          <button className={styles.dateAddBtn} onClick={() => openModal(date)} title="이 날짜에 추가"><Plus size={13} /></button>
        </div>
        {isOpen && (
          <div className={styles.dateItems}>
            {items.map(task => (
              <TaskRow key={task.id} task={task} today={today}
                isDragTarget={dragOverTaskId === task.id && drag?.kind === 'subtask'}
                onToggle={() => toggleTask(task.id)}
                onDelete={() => deleteTask(task.id)}
                onUpdateSubtasks={(subs) => updateTaskSubtasks(task.id, subs)}
                onDragStart={() => setDrag({ kind: 'task', taskId: task.id, fromDate: date })}
                onDragEnd={() => { setDrag(null); setDragOverDate(null); }}
                onSubtaskDragStart={(subtaskId) => setDrag({ kind: 'subtask', taskId: task.id, subtaskId })}
                onSubtaskDragEnd={() => { setDrag(null); setDragOverTaskId(null); }}
                onSubtaskDragOver={() => { if (drag?.kind === 'subtask') setDragOverTaskId(task.id); }}
                onSubtaskDrop={() => handleTaskDrop(task.id)}
                onSubtaskDragLeave={() => setDragOverTaskId(null)}
              />
            ))}
            <div className={styles.inlineAdd}>
              <input className={styles.inlineInput} placeholder="+ 빠르게 추가 (Enter)"
                value={inlineInputs[date] || ''}
                onChange={e => setInlineInputs(p => ({ ...p, [date]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleInlineAdd(date); }} />
              {(inlineInputs[date] || '').trim() && (
                <button className={styles.inlineSubmit} onClick={() => handleInlineAdd(date)}>추가</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>할 일</h1>
          <p className={styles.subtitle}>{pendingCount}개 남음 · {doneCount}개 완료</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.calendarWrap}>
            <button className={`${styles.calBtn} ${showCalendar ? styles.calBtnActive : ''}`} onClick={() => setShowCalendar(p => !p)}>
              <Calendar size={14} /> 날짜 이동
            </button>
            {showCalendar && <MiniCalendar tasks={tasks} onSelectDate={handleCalendarSelect} onClose={() => setShowCalendar(false)} />}
          </div>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${viewMode === 'date' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('date')}>날짜별</button>
            <button className={`${styles.viewBtn} ${viewMode === 'all' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('all')}>전체</button>
          </div>
          <button className={styles.exportBtn} onClick={() => exportTasks(tasks)}><Download size={14} /> CSV</button>
          <button className={styles.addBtn} onClick={() => openModal()}><Plus size={14} /> 할 일 추가</button>
        </div>
      </div>

      {selectedDate && (
        <div className={styles.dateFilterBanner}>
          <Calendar size={13} />
          <span>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} 할 일만 보는 중</span>
          <button onClick={clearDateFilter}><X size={13} /> 필터 해제</button>
        </div>
      )}

      {!selectedDate && (
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tabFilter === 'today' ? styles.tabActive : ''}`} onClick={() => setTabFilter('today')}>오늘 <span className={styles.tabBadge}>{todayCount}</span></button>
          <button className={`${styles.tab} ${tabFilter === 'upcoming' ? styles.tabActive : ''}`} onClick={() => setTabFilter('upcoming')}>이번 주</button>
          <button className={`${styles.tab} ${tabFilter === 'all' ? styles.tabActive : ''}`} onClick={() => setTabFilter('all')}>전체</button>
          <label className={styles.doneToggle}>
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> 완료 항목 보기
          </label>
        </div>
      )}

      {viewMode === 'date' ? (
        <div className={styles.dateGroups}>
          {grouped.sortedDates.length === 0 && grouped.noDate.length === 0 && <div className={styles.emptyState}>할 일이 없습니다 🎉</div>}
          {grouped.sortedDates.filter(d => d < today).map(renderDateGroup)}
          {grouped.sortedDates.filter(d => d >= today).map(renderDateGroup)}
          {grouped.noDate.length > 0 && (
            <div className={styles.dateGroup}>
              <div className={styles.dateHeader}>
                <button className={styles.dateToggle} onClick={() => toggleCollapse('nodate')}>
                  {collapsed['nodate'] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                <span className={styles.dateLabel}>날짜 미지정</span>
                <span className={styles.dateCount}>{grouped.noDate.length}개</span>
              </div>
              {!collapsed['nodate'] && (
                <div className={styles.dateItems}>
                  {grouped.noDate.map(task => (
                    <TaskRow key={task.id} task={task} today={today}
                      isDragTarget={dragOverTaskId === task.id && drag?.kind === 'subtask'}
                      onToggle={() => toggleTask(task.id)}
                      onDelete={() => deleteTask(task.id)}
                      onUpdateSubtasks={(subs) => updateTaskSubtasks(task.id, subs)}
                      onDragStart={() => setDrag({ kind: 'task', taskId: task.id, fromDate: '' })}
                      onDragEnd={() => { setDrag(null); setDragOverDate(null); }}
                      onSubtaskDragStart={(subtaskId) => setDrag({ kind: 'subtask', taskId: task.id, subtaskId })}
                      onSubtaskDragEnd={() => { setDrag(null); setDragOverTaskId(null); }}
                      onSubtaskDragOver={() => { if (drag?.kind === 'subtask') setDragOverTaskId(task.id); }}
                      onSubtaskDrop={() => handleTaskDrop(task.id)}
                      onSubtaskDragLeave={() => setDragOverTaskId(null)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.listView}>
          {filteredTasks.length === 0 && <div className={styles.emptyState}>할 일이 없습니다 🎉</div>}
          {filteredTasks.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).map(task => (
            <TaskRow key={task.id} task={task} today={today}
              isDragTarget={false}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => deleteTask(task.id)}
              onUpdateSubtasks={(subs) => updateTaskSubtasks(task.id, subs)}
              onDragStart={() => {}}
              onDragEnd={() => {}}
              onSubtaskDragStart={() => {}}
              onSubtaskDragEnd={() => {}}
              onSubtaskDragOver={() => {}}
              onSubtaskDrop={() => {}}
              onSubtaskDragLeave={() => {}}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalDate ? `${modalDate} 할 일 추가` : '할 일 추가'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>내용 *</label>
            <input className={f.input} placeholder="예: 제안서 검토 후 발송" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleModalAdd(); }} autoFocus />
          </div>
          <div className={f.field}>
            <label className={f.label}>날짜</label>
            <input className={f.input} type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>연결 대상</label>
              <select className={f.select} value={form.linkedType} onChange={e => setForm(p => ({ ...p, linkedType: e.target.value as '' | 'lead' | 'project', linkedId: '' }))}>
                <option value="">없음</option>
                <option value="lead">리드</option>
                <option value="project">프로젝트</option>
              </select>
            </div>
            {form.linkedType && (
              <div className={f.field}>
                <label className={f.label}>{form.linkedType === 'lead' ? '리드' : '프로젝트'} 선택</label>
                <select className={f.select} value={form.linkedId} onChange={e => setForm(p => ({ ...p, linkedId: e.target.value }))}>
                  <option value="">선택...</option>
                  {form.linkedType === 'lead' ? leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company})</option>) : projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => setModalOpen(false)}>취소</button>
            <button className={f.btnPrimary} onClick={handleModalAdd}>추가</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TaskRow({ task, today, isDragTarget, onToggle, onDelete, onUpdateSubtasks, onDragStart, onDragEnd, onSubtaskDragStart, onSubtaskDragEnd, onSubtaskDragOver, onSubtaskDrop, onSubtaskDragLeave }: {
  task: Task; today: string; isDragTarget: boolean;
  onToggle: () => void; onDelete: () => void;
  onUpdateSubtasks: (subs: Subtask[]) => void;
  onDragStart: () => void; onDragEnd: () => void;
  onSubtaskDragStart: (subtaskId: string) => void;
  onSubtaskDragEnd: () => void;
  onSubtaskDragOver: () => void;
  onSubtaskDrop: () => void;
  onSubtaskDragLeave: () => void;
}) {
  const overdue = !task.done && task.dueDate < today;
  const [expanded, setExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubVal, setEditingSubVal] = useState('');
  const subtasks = task.subtasks || [];
  const doneCount = subtasks.filter(s => s.done).length;

  const addSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    onUpdateSubtasks([...subtasks, { id: crypto.randomUUID(), title, done: false }]);
    setNewSubtask('');
  };
  const toggleSubtask = (id: string) => onUpdateSubtasks(subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s));
  const deleteSubtask = (id: string) => onUpdateSubtasks(subtasks.filter(s => s.id !== id));
  const startEditSubtask = (sub: Subtask) => { setEditingSubId(sub.id); setEditingSubVal(sub.title); };
  const saveEditSubtask = (id: string) => {
    const title = editingSubVal.trim();
    if (!title) return;
    onUpdateSubtasks(subtasks.map(s => s.id === id ? { ...s, title } : s));
    setEditingSubId(null); setEditingSubVal('');
  };

  return (
    <div className={`${styles.taskWrap} ${task.done ? styles.done : ''} ${isDragTarget ? styles.taskDropTarget : ''}`}
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); onSubtaskDragOver(); }}
      onDrop={e => { e.stopPropagation(); onSubtaskDrop(); }}
      onDragLeave={onSubtaskDragLeave}
    >
      <div className={`${styles.taskRow} ${overdue ? styles.overdue : ''}`}>
        <GripVertical size={13} className={styles.taskGrip} />
        <button className={`${styles.completeBtn} ${task.done ? styles.completeBtnDone : ''}`} onClick={onToggle} title={task.done ? '완료 취소' : '완료'}>
          {task.done ? <Check size={11} strokeWidth={3} /> : <Check size={11} strokeWidth={2} />}
        </button>
        <div className={styles.taskBody}>
          <span className={styles.taskTitle}>{task.title}</span>
          {subtasks.length > 0 && <span className={styles.subCount}>{doneCount}/{subtasks.length}</span>}
          {task.linkedTo && <span className={styles.taskLink}>{task.linkedTo.type === 'lead' ? '🤝' : '📁'} {task.linkedTo.name}</span>}
        </div>
        {overdue && <AlertCircle size={13} className={styles.overdueIcon} />}
        <button className={styles.subToggleBtn} onClick={() => setExpanded(p => !p)} title="하위 업무">
          <Plus size={13} />
          {subtasks.length > 0 && (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />)}
        </button>
        <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); if (confirm(`"${task.title}" 할 일을 삭제할까요?`)) onDelete(); }} title="삭제">
          <Trash2 size={13} />
        </button>
      </div>

      {isDragTarget && (
        <div className={styles.subtaskDropHint}>하위 업무를 여기에 드롭</div>
      )}

      {expanded && (
        <div className={styles.subtaskPanel}>
          {subtasks.map(sub => (
            <div key={sub.id} className={`${styles.subtaskRow} ${sub.done ? styles.subDone : ''}`}
              draggable
              onDragStart={e => { e.stopPropagation(); onSubtaskDragStart(sub.id); }}
              onDragEnd={e => { e.stopPropagation(); onSubtaskDragEnd(); }}
            >
              <GripVertical size={11} className={styles.subGrip} />
              <button className={`${styles.subCompleteBtn} ${sub.done ? styles.subCompleteBtnDone : ''}`} onClick={() => toggleSubtask(sub.id)}>
                {sub.done && <Check size={9} strokeWidth={3} />}
              </button>
              {editingSubId === sub.id ? (
                <input className={styles.subEditInput} value={editingSubVal}
                  onChange={e => setEditingSubVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEditSubtask(sub.id); if (e.key === 'Escape') { setEditingSubId(null); } }}
                  autoFocus />
              ) : (
                <span className={styles.subTitle}>{sub.title}</span>
              )}
              {editingSubId === sub.id ? (
                <div className={styles.subEditActions}>
                  <button className={styles.subSaveBtn} onClick={() => saveEditSubtask(sub.id)}>저장</button>
                  <button className={styles.subCancelBtn} onClick={() => setEditingSubId(null)}><X size={11} /></button>
                </div>
              ) : (
                <div className={styles.subActions}>
                  {!sub.done && <button className={styles.subEditBtn} onClick={() => startEditSubtask(sub)} title="수정"><Pencil size={11} /></button>}
                  <button className={styles.subDeleteBtn} onClick={() => deleteSubtask(sub.id)} title="삭제"><X size={11} /></button>
                </div>
              )}
            </div>
          ))}
          <div className={styles.subtaskInput}>
            <input className={styles.subInput} placeholder="하위 업무 추가 (Enter)" value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }} />
            {newSubtask.trim() && <button className={styles.inlineSubmit} onClick={addSubtask}>추가</button>}
          </div>
        </div>
      )}
    </div>
  );
}
