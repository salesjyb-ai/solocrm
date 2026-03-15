import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { BossItemType, Priority } from '../types';
import Modal from '../components/Modal';
import styles from './Boss.module.css';
import f from './FormField.module.css';

const TYPE_LABEL: Record<BossItemType, string> = { question: '질문', task: '챙길 일', memo: '메모' };
const TYPE_COLOR: Record<BossItemType, string> = { question: '#6366f1', task: '#f59e0b', memo: '#10b981' };
const PRIORITY_LABEL: Record<Priority, string> = { high: '높음', medium: '중간', low: '낮음' };
const PRIORITY_COLOR: Record<Priority, string> = { high: 'var(--status-lost)', medium: '#f59e0b', low: 'var(--status-won)' };

export default function Boss() {
  const { bossItems, projects, addBossItem, updateBossItem, deleteBossItem } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<BossItemType | 'all'>('all');
  const [showDone, setShowDone] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ type: 'question' as BossItemType, title: '', content: '', priority: 'medium' as Priority, dueDate: '', projectId: '' });

  const filtered = bossItems.filter(i => {
    if (i.done && !showDone) return false;
    if (filter !== 'all' && i.type !== filter) return false;
    return true;
  });

  const grouped = {
    question: filtered.filter(i => i.type === 'question'),
    task: filtered.filter(i => i.type === 'task'),
    memo: filtered.filter(i => i.type === 'memo'),
  };

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    await addBossItem({ type: form.type, title: form.title, content: form.content || undefined, priority: form.priority, dueDate: form.dueDate || undefined, done: false, projectId: form.projectId || undefined });
    setForm({ type: 'question', title: '', content: '', priority: 'medium', dueDate: '', projectId: '' });
    setModalOpen(false);
  };

  const toggleSection = (type: BossItemType) => setExpanded(p => ({ ...p, [type]: !p[type] }));

  const pendingCount = bossItems.filter(i => !i.done).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>임은희 상무님 관리</h1>
          <p className={styles.sub}>미완료 {pendingCount}건</p>
        </div>
        <div className={styles.headerRight}>
          <label className={styles.doneToggle}>
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
            완료 항목 보기
          </label>
          <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
            <Plus size={15} /> 항목 추가
          </button>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className={styles.tabs}>
        {(['all', 'question', 'task', 'memo'] as const).map(t => (
          <button key={t} className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`} onClick={() => setFilter(t)}>
            {t === 'all' ? '전체' : TYPE_LABEL[t]}
            <span className={styles.tabCount}>{t === 'all' ? bossItems.filter(i => !i.done).length : bossItems.filter(i => i.type === t && !i.done).length}</span>
          </button>
        ))}
      </div>

      {/* 섹션별 목록 */}
      {(['question', 'task', 'memo'] as BossItemType[]).map(type => {
        const items = grouped[type];
        if (filter !== 'all' && filter !== type) return null;
        const isOpen = expanded[type] !== false;
        return (
          <div key={type} className={styles.section}>
            <button className={styles.sectionHeader} onClick={() => toggleSection(type)}>
              <span className={styles.sectionDot} style={{ background: TYPE_COLOR[type] }} />
              <span className={styles.sectionTitle}>{TYPE_LABEL[type]}</span>
              <span className={styles.sectionCount}>{items.length}</span>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {isOpen && (
              <div className={styles.itemList}>
                {items.length === 0 && <p className={styles.empty}>항목이 없습니다.</p>}
                {items.map(item => (
                  <div key={item.id} className={`${styles.item} ${item.done ? styles.itemDone : ''}`}>
                    <input type="checkbox" className={styles.check} checked={item.done} onChange={e => updateBossItem(item.id, { done: e.target.checked })} />
                    <div className={styles.itemBody}>
                      <div className={styles.itemTop}>
                        <span className={styles.itemTitle}>{item.title}</span>
                        <div className={styles.itemMeta}>
                          <span className={styles.priority} style={{ color: PRIORITY_COLOR[item.priority as Priority] }}>● {PRIORITY_LABEL[item.priority as Priority]}</span>
                          {item.dueDate && <span className={styles.dueDate}>{item.dueDate}</span>}
                          {item.projectId && <span className={styles.projectTag}>{projects.find(p => p.id === item.projectId)?.name}</span>}
                        </div>
                      </div>
                      {item.content && <p className={styles.itemContent}>{item.content}</p>}
                    </div>
                    <button className={styles.deleteBtn} onClick={() => deleteBossItem(item.id)}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setForm({ type: 'question', title: '', content: '', priority: 'medium', dueDate: '', projectId: '' }); }} title="항목 추가">
        <div className={f.form}>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>유형 *</label>
              <select className={f.select} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as BossItemType }))}>
                <option value="question">질문 (물어봐야 할 것)</option>
                <option value="task">챙길 일 (상무님 할 일)</option>
                <option value="memo">메모 (공유 자료)</option>
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>우선순위</label>
              <select className={f.select} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as Priority }))}>
                <option value="high">높음</option>
                <option value="medium">중간</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>제목 *</label>
            <input className={f.input} placeholder="내용을 입력하세요" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className={f.field}>
            <label className={f.label}>상세 메모</label>
            <textarea className={f.textarea} placeholder="추가 내용 (선택)" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3} />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>마감일</label>
              <input className={f.input} type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>관련 프로젝트</label>
              <select className={f.select} value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}>
                <option value="">없음</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className={f.actions}>
            <button className={f.cancel} onClick={() => { setModalOpen(false); setForm({ type: 'question', title: '', content: '', priority: 'medium', dueDate: '', projectId: '' }); }}>취소</button>
            <button className={f.submit} onClick={handleAdd}>추가</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
