import { useState } from 'react';
import { Plus, Check, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { Task } from '../types';
import f from './FormField.module.css';
import { exportTasks } from '../utils/exportCSV';
import styles from './Tasks.module.css';

export default function Tasks() {
  const { tasks, toggleTask, addTask, leads, projects } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', dueDate: '', linkedType: '' as '' | 'lead' | 'project', linkedId: '' });

  const today = new Date().toISOString().split('T')[0];
  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);

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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>할 일</h1>
          <p className={styles.subtitle}>{pending.length}개 남음 · {done.length}개 완료</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className={styles.exportBtn} onClick={() => exportTasks(tasks)}>
            <Download size={14} /> CSV
          </button>
          <button className={styles.addBtn} onClick={() => setModalOpen(true)}><Plus size={14} /> 할 일 추가</button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>진행 중 ({pending.length})</div>
        {pending.length === 0 && <div className={styles.empty}>모든 할 일을 완료했습니다! 🎉</div>}
        {pending.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(task => (
          <TaskRow key={task.id} task={task} today={today} onToggle={() => toggleTask(task.id)} />
        ))}
      </div>

      {done.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>완료 ({done.length})</div>
          {done.map(task => (
            <TaskRow key={task.id} task={task} today={today} onToggle={() => toggleTask(task.id)} />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="할 일 추가">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>내용 *</label>
            <input className={f.input} placeholder="예: 제안서 검토 후 발송" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
          </div>
          <div className={f.field}>
            <label className={f.label}>마감일</label>
            <input className={f.input} type="date" value={form.dueDate} onChange={e => setForm(p => ({...p, dueDate: e.target.value}))} />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>연결 대상 유형</label>
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
        <div className={styles.taskMeta}>
          <span className={overdue ? styles.overdueDate : styles.date}>{task.dueDate}</span>
          {task.linkedTo && <span className={styles.link}>{task.linkedTo.type === 'lead' ? '🤝' : '📁'} {task.linkedTo.name}</span>}
        </div>
      </div>
    </div>
  );
}
