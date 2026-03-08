import { useState, useMemo } from 'react';
import { Plus, Check, Download, ChevronDown, ChevronRight, AlertCircle, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { Task } from '../types';
import f from './FormField.module.css';
import { exportTasks } from '../utils/exportCSV';
import styles from './Tasks.module.css';

type ViewMode = 'date' | 'all';
type TabFilter = 'upcoming' | 'today' | 'all';

function getKSTToday() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).toISOString().split('T')[0];
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

export default function Tasks() {
  const { tasks, toggleTask, addTask, leads, projects } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [tabFilter, setTabFilter] = useState<TabFilter>('upcoming');
  const [showDone, setShowDone] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ title: '', dueDate: '', linkedType: '' as '' | 'lead' | 'project', linkedId: '' });

  const today = getKSTToday();
  const todayDate = new Date(today + 'T00:00:00');
  const weekLater = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!showDone && t.done) return false;
      if (tabFilter === 'today') return t.dueDate === today;
      if (tabFilter === 'upcoming') return t.dueDate <= weekLater || !t.done;
      return true;
    });
  }, [tasks, showDone, tabFilter, today, weekLater]);

  // 날짜별 그룹핑
  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const noDate: Task[] = [];
    filteredTasks.forEach(t => {
      if (!t.dueDate) { noDate.push(t); return; }
      if (!map[t.dueDate]) map[t.dueDate] = [];
      map[t.dueDate].push(t);
    });
    const sortedDates = Object.keys(map).sort();
    return { sortedDates, map, noDate };
  }, [filteredTasks]);

  const toggleCollapse = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  const handleAdd = () => {
    if (!form.title) return;
    const linkedTo = form.linkedType && form.linkedId ? (() => {
      if (form.linkedType === 'lead') { const l = leads.find(l => l.id === form.linkedId); return l ? { type: 'lead' as const, id: l.id, name: l.company } : undefined; }
      const p = projects.find(p => p.id === form.linkedId); return p ? { type: 'project' as const, id: p.id, name: p.name } : undefined;
    })() : undefined;
    addTask({ title: form.title, done: false, dueDate: form.dueDate || today, linkedTo });
    setModalOpen(false);
    setForm({ title: '', dueDate: '', linkedType: '', linkedId: '' });
  };

  const pendingCount = tasks.filter(t => !t.done).length;
  const doneCount = tasks.filter(t => t.done).length;
  const todayCount = tasks.filter(t => t.dueDate === today && !t.done).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>할 일</h1>
          <p className={styles.subtitle}>{pendingCount}개 남음 · {doneCount}개 완료</p>
        </div>
        <div className={styles.headerRight}>
          {/* 뷰 토글 */}
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${viewMode === 'date' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('date')}>
              <Calendar size={13} /> 날짜별
            </button>
            <button className={`${styles.viewBtn} ${viewMode === 'all' ? styles.viewBtnActive : ''}`} onClick={() => setViewMode('all')}>
              전체
            </button>
          </div>
          <button className={styles.exportBtn} onClick={() => exportTasks(tasks)}>
            <Download size={14} /> CSV
          </button>
          <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
            <Plus size={14} /> 할 일 추가
          </button>
        </div>
      </div>

      {/* 탭 필터 */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tabFilter === 'today' ? styles.tabActive : ''}`} onClick={() => setTabFilter('today')}>
          오늘 <span className={styles.tabBadge}>{todayCount}</span>
        </button>
        <button className={`${styles.tab} ${tabFilter === 'upcoming' ? styles.tabActive : ''}`} onClick={() => setTabFilter('upcoming')}>
          이번 주
        </button>
        <button className={`${styles.tab} ${tabFilter === 'all' ? styles.tabActive : ''}`} onClick={() => setTabFilter('all')}>
          전체
        </button>
        <label className={styles.doneToggle}>
          <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
          완료 항목 보기
        </label>
      </div>

      {viewMode === 'date' ? (
        /* 날짜별 그룹 뷰 */
        <div className={styles.dateGroups}>
          {grouped.sortedDates.length === 0 && grouped.noDate.length === 0 && (
            <div className={styles.emptyState}>할 일이 없습니다 🎉</div>
          )}

          {/* 날짜 초과 항목 먼저 */}
          {grouped.sortedDates.filter(d => d < today).map(date => {
            const { label, tag, tagType } = formatDateLabel(date, today);
            const isOpen = collapsed[date] !== true;
            const items = grouped.map[date];
            return (
              <div key={date} className={styles.dateGroup}>
                <button className={styles.dateHeader} onClick={() => toggleCollapse(date)}>
                  <span className={styles.dateLabel}>{label}</span>
                  {tag && <span className={`${styles.dateTag} ${styles[`tag_${tagType}`]}`}>{tag}</span>}
                  <span className={styles.dateCount}>{items.filter(t => !t.done).length}개</span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isOpen && (
                  <div className={styles.dateItems}>
                    {items.map(task => <TaskRow key={task.id} task={task} today={today} onToggle={() => toggleTask(task.id)} />)}
                  </div>
                )}
              </div>
            );
          })}

          {/* 오늘 이후 */}
          {grouped.sortedDates.filter(d => d >= today).map(date => {
            const { label, tag, tagType } = formatDateLabel(date, today);
            const isOpen = collapsed[date] !== true;
            const items = grouped.map[date];
            return (
              <div key={date} className={styles.dateGroup}>
                <button className={styles.dateHeader} onClick={() => toggleCollapse(date)}>
                  <span className={styles.dateLabel}>{label}</span>
                  {tag && <span className={`${styles.dateTag} ${styles[`tag_${tagType}`]}`}>{tag}</span>}
                  <span className={styles.dateCount}>{items.filter(t => !t.done).length}개</span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isOpen && (
                  <div className={styles.dateItems}>
                    {items.map(task => <TaskRow key={task.id} task={task} today={today} onToggle={() => toggleTask(task.id)} />)}
                  </div>
                )}
              </div>
            );
          })}

          {/* 날짜 없는 항목 */}
          {grouped.noDate.length > 0 && (
            <div className={styles.dateGroup}>
              <button className={styles.dateHeader} onClick={() => toggleCollapse('nodate')}>
                <span className={styles.dateLabel}>날짜 미지정</span>
                <span className={styles.dateCount}>{grouped.noDate.length}개</span>
                {collapsed['nodate'] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              {!collapsed['nodate'] && (
                <div className={styles.dateItems}>
                  {grouped.noDate.map(task => <TaskRow key={task.id} task={task} today={today} onToggle={() => toggleTask(task.id)} />)}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 전체 리스트 뷰 */
        <div className={styles.listView}>
          {filteredTasks.length === 0 && <div className={styles.emptyState}>할 일이 없습니다 🎉</div>}
          {filteredTasks
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .map(task => <TaskRow key={task.id} task={task} today={today} onToggle={() => toggleTask(task.id)} />)
          }
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="할 일 추가">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>내용 *</label>
            <input className={f.input} placeholder="예: 제안서 검토 후 발송" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} autoFocus />
          </div>
          <div className={f.field}>
            <label className={f.label}>날짜</label>
            <input className={f.input} type="date" value={form.dueDate} onChange={e => setForm(p => ({...p, dueDate: e.target.value}))} />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>연결 대상</label>
              <select className={f.select} value={form.linkedType} onChange={e => setForm(p => ({...p, linkedType: e.target.value as '' | 'lead' | 'project', linkedId: ''}))}>
                <option value="">없음</option>
                <option value="lead">리드</option>
                <option value="project">프로젝트</option>
              </select>
            </div>
            {form.linkedType && (
              <div className={f.field}>
                <label className={f.label}>{form.linkedType === 'lead' ? '리드' : '프로젝트'} 선택</label>
                <select className={f.select} value={form.linkedId} onChange={e => setForm(p => ({...p, linkedId: e.target.value}))}>
                  <option value="">선택...</option>
                  {form.linkedType === 'lead'
                    ? leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company})</option>)
                    : projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                  }
                </select>
              </div>
            )}
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => setModalOpen(false)}>취소</button>
            <button className={f.btnPrimary} onClick={handleAdd}>추가</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TaskRow({ task, today, onToggle }: { task: Task; today: string; onToggle: () => void }) {
  const overdue = !task.done && task.dueDate < today;
  return (
    <div className={`${styles.taskRow} ${task.done ? styles.done : ''} ${overdue ? styles.overdue : ''}`} onClick={onToggle}>
      <div className={`${styles.check} ${task.done ? styles.checked : ''}`}>
        {task.done && <Check size={11} strokeWidth={3} />}
      </div>
      <div className={styles.taskBody}>
        <span className={styles.taskTitle}>{task.title}</span>
        {task.linkedTo && (
          <span className={styles.taskLink}>{task.linkedTo.type === 'lead' ? '🤝' : '📁'} {task.linkedTo.name}</span>
        )}
      </div>
      {overdue && <AlertCircle size={13} className={styles.overdueIcon} />}
    </div>
  );
}
