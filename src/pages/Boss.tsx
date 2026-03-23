import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, Check, X, GripVertical, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { BossItem, BossItemType, BossSubItem, Priority } from '../types';
import Modal from '../components/Modal';
import styles from './Boss.module.css';
import f from './FormField.module.css';

const TYPE_LABEL: Record<BossItemType, string> = { question: '질문', task: '챙길 일', memo: '메모' };
const TYPE_COLOR: Record<BossItemType, string> = { question: '#6366f1', task: '#f59e0b', memo: '#10b981' };
const TYPE_BG: Record<BossItemType, string> = { question: '#eef2ff', task: '#fffbeb', memo: '#ecfdf5' };
const PRIORITY_LABEL: Record<Priority, string> = { high: '높음', medium: '중간', low: '낮음' };
const PRIORITY_COLOR: Record<Priority, string> = { high: 'var(--status-lost)', medium: '#f59e0b', low: 'var(--status-won)' };
const ALL_TYPES: BossItemType[] = ['question', 'task', 'memo'];

export default function Boss() {
  const { bossItems, projects, addBossItem, updateBossItem, deleteBossItem } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BossItem | null>(null);
  const [filter, setFilter] = useState<BossItemType | 'all'>('all');
  const [showDone, setShowDone] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [newSubInputs, setNewSubInputs] = useState<Record<string, string>>({});
  const [dragItem, setDragItem] = useState<{ id: string; fromType: BossItemType } | null>(null);
  const [dragOver, setDragOver] = useState<BossItemType | null>(null);
  const [form, setForm] = useState({ type: 'question' as BossItemType, title: '', content: '', priority: 'medium' as Priority, dueDate: '', projectId: '' });

  const filtered = bossItems.filter(i => {
    if (i.done && !showDone) return false;
    if (filter !== 'all' && i.type !== filter) return false;
    return true;
  });

  const grouped: Record<BossItemType, BossItem[]> = {
    question: filtered.filter(i => i.type === 'question'),
    task: filtered.filter(i => i.type === 'task'),
    memo: filtered.filter(i => i.type === 'memo'),
  };

  const openAdd = () => {
    setEditingItem(null);
    setForm({ type: 'question', title: '', content: '', priority: 'medium', dueDate: '', projectId: '' });
    setModalOpen(true);
  };

  const openEdit = (item: BossItem) => {
    setEditingItem(item);
    setForm({ type: item.type, title: item.title, content: item.content || '', priority: item.priority as Priority, dueDate: item.dueDate || '', projectId: item.projectId || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (editingItem) {
      await updateBossItem(editingItem.id, { type: form.type, title: form.title, content: form.content || undefined, priority: form.priority, dueDate: form.dueDate || undefined, projectId: form.projectId || undefined });
    } else {
      await addBossItem({ type: form.type, title: form.title, content: form.content || undefined, priority: form.priority, dueDate: form.dueDate || undefined, done: false, projectId: form.projectId || undefined, subItems: [] });
    }
    setModalOpen(false);
    setEditingItem(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setForm({ type: 'question', title: '', content: '', priority: 'medium', dueDate: '', projectId: '' });
  };

  const toggleSection = (type: BossItemType) => setExpanded(p => ({ ...p, [type]: !p[type] }));
  const toggleItem = (id: string) => setExpandedItems(p => ({ ...p, [id]: !p[id] }));

  const addSubItem = (itemId: string) => {
    const title = (newSubInputs[itemId] || '').trim();
    if (!title) return;
    const item = bossItems.find(b => b.id === itemId);
    if (!item) return;
    const newSub: BossSubItem = { id: crypto.randomUUID(), title, done: false };
    updateBossItem(itemId, { subItems: [...(item.subItems || []), newSub] });
    setNewSubInputs(p => ({ ...p, [itemId]: '' }));
  };

  const toggleSubItem = (itemId: string, subId: string) => {
    const item = bossItems.find(b => b.id === itemId);
    if (!item) return;
    updateBossItem(itemId, { subItems: item.subItems.map(s => s.id === subId ? { ...s, done: !s.done } : s) });
  };

  const deleteSubItem = (itemId: string, subId: string) => {
    const item = bossItems.find(b => b.id === itemId);
    if (!item) return;
    updateBossItem(itemId, { subItems: item.subItems.filter(s => s.id !== subId) });
  };

  const moveToType = (item: BossItem, newType: BossItemType) => {
    updateBossItem(item.id, { type: newType });
  };

  const handleDragStart = (id: string, fromType: BossItemType) => setDragItem({ id, fromType });
  const handleDragOver = (e: React.DragEvent, toType: BossItemType) => { e.preventDefault(); setDragOver(toType); };
  const handleDrop = (toType: BossItemType) => {
    if (dragItem && dragItem.fromType !== toType) updateBossItem(dragItem.id, { type: toType });
    setDragItem(null); setDragOver(null);
  };

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
          <button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> 항목 추가</button>
        </div>
      </div>

      <div className={styles.tabs}>
        {(['all', 'question', 'task', 'memo'] as const).map(t => (
          <button key={t} className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`} onClick={() => setFilter(t)}>
            {t === 'all' ? '전체' : TYPE_LABEL[t]}
            <span className={styles.tabCount}>{t === 'all' ? bossItems.filter(i => !i.done).length : bossItems.filter(i => i.type === t && !i.done).length}</span>
          </button>
        ))}
      </div>

      <div className={styles.sections}>
        {ALL_TYPES.map(type => {
          const items = grouped[type];
          if (filter !== 'all' && filter !== type) return null;
          const isOpen = expanded[type] !== false;
          const isDragTarget = dragOver === type;

          return (
            <div key={type} className={`${styles.section} ${isDragTarget ? styles.sectionDragOver : ''}`}
              onDragOver={e => handleDragOver(e, type)}
              onDrop={() => handleDrop(type)}
              onDragLeave={() => setDragOver(null)}
            >
              <button className={styles.sectionHeader} onClick={() => toggleSection(type)}>
                <span className={styles.sectionDot} style={{ background: TYPE_COLOR[type] }} />
                <span className={styles.sectionTitle}>{TYPE_LABEL[type]}</span>
                <span className={styles.sectionCount}>{items.length}</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isOpen && (
                <div className={styles.itemList}>
                  {items.length === 0 && (
                    <p className={styles.empty}>
                      항목이 없습니다.
                      {dragItem && dragItem.fromType !== type && <span className={styles.dropHint}> 여기에 드롭해서 이동</span>}
                    </p>
                  )}
                  {items.map(item => {
                    const subItems = item.subItems || [];
                    const doneSubCount = subItems.filter(s => s.done).length;
                    const isItemExpanded = expandedItems[item.id] !== false;
                    const otherTypes = ALL_TYPES.filter(t => t !== type);

                    return (
                      <div key={item.id} className={`${styles.item} ${item.done ? styles.itemDone : ''}`}
                        draggable onDragStart={() => handleDragStart(item.id, type)}
                        onDragEnd={() => { setDragItem(null); setDragOver(null); }}
                      >
                        <div className={styles.itemRow}>
                          <div className={styles.dragHandle} title="드래그해서 이동"><GripVertical size={14} /></div>
                          <input type="checkbox" className={styles.check} checked={item.done}
                            onChange={e => updateBossItem(item.id, { done: e.target.checked })} />
                          <div className={styles.itemBody} onClick={() => toggleItem(item.id)} style={{ cursor: 'pointer' }}>
                            <div className={styles.itemTop}>
                              <span className={styles.itemTitle}>{item.title}</span>
                              <div className={styles.itemMeta}>
                                <span className={styles.priority} style={{ color: PRIORITY_COLOR[item.priority as Priority] }}>● {PRIORITY_LABEL[item.priority as Priority]}</span>
                                {item.dueDate && <span className={styles.dueDate}>{item.dueDate}</span>}
                                {item.projectId && <span className={styles.projectTag}>{projects.find(p => p.id === item.projectId)?.name}</span>}
                                {subItems.length > 0 && <span className={styles.subCount}>{doneSubCount}/{subItems.length}</span>}
                              </div>
                            </div>
                            {item.content && <p className={styles.itemContent}>{item.content}</p>}
                          </div>
                          <div className={styles.itemActions}>
                            {otherTypes.map(t => (
                              <button key={t} className={styles.moveBtn}
                                style={{ background: TYPE_BG[t], color: TYPE_COLOR[t] }}
                                onClick={() => moveToType(item, t)} title={`${TYPE_LABEL[t]}(으)로 이동`}>
                                <ArrowRight size={10} /> {TYPE_LABEL[t]}
                              </button>
                            ))}
                            <button className={styles.editBtn} onClick={() => openEdit(item)} title="수정"><Edit2 size={12} /></button>
                            <button className={styles.deleteBtn} onClick={() => { if (confirm(`"${item.title}" 항목을 삭제할까요?`)) deleteBossItem(item.id); }} title="삭제"><Trash2 size={12} /></button>
                          </div>
                        </div>

                        {isItemExpanded && (
                          <div className={styles.subPanel}>
                            {subItems.map(sub => (
                              <div key={sub.id} className={`${styles.subItem} ${sub.done ? styles.subDone : ''}`}>
                                <button className={`${styles.subCheck} ${sub.done ? styles.subChecked : ''}`} onClick={() => toggleSubItem(item.id, sub.id)}>
                                  {sub.done && <Check size={9} strokeWidth={3} />}
                                </button>
                                <span className={styles.subTitle}>{sub.title}</span>
                                <button className={styles.subDeleteBtn} onClick={() => deleteSubItem(item.id, sub.id)}><X size={10} /></button>
                              </div>
                            ))}
                            <div className={styles.subInputRow}>
                              <input className={styles.subInput} placeholder="진행상황 항목 추가 (Enter)"
                                value={newSubInputs[item.id] || ''}
                                onChange={e => setNewSubInputs(p => ({ ...p, [item.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') addSubItem(item.id); }} />
                              {(newSubInputs[item.id] || '').trim() && (
                                <button className={styles.subAddBtn} onClick={() => addSubItem(item.id)}>추가</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editingItem ? '항목 수정' : '항목 추가'}>
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
            <input className={f.input} placeholder="내용을 입력하세요" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
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
            <button className={f.btnSecondary} onClick={closeModal}>취소</button>
            <button className={f.btnPrimary} onClick={handleSave}>{editingItem ? '저장' : '추가'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
