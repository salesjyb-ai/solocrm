import { useState, useMemo } from 'react';
import { Plus, Search, Pin, Trash2, Edit2, X, Check, Tag, ChevronDown, ChevronRight, BookOpen, Lightbulb, Users, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { Note, NoteCategory, NoteChecklist } from '../types';
import f from './FormField.module.css';
import styles from './Notes.module.css';

const CATEGORY: Record<NoteCategory, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  tip:       { label: '영업 팁',   icon: <Lightbulb size={12} />, color: '#f59e0b', bg: '#fffbeb' },
  knowledge: { label: '업계 지식', icon: <BookOpen size={12} />,  color: '#6366f1', bg: '#eef2ff' },
  network:   { label: '인맥 관리', icon: <Users size={12} />,     color: '#10b981', bg: '#ecfdf5' },
  general:   { label: '기타 메모', icon: <FileText size={12} />,  color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
};

const INIT_FORM = {
  title: '', content: '', category: 'general' as NoteCategory,
  tags: '', leadId: '', projectId: '', pinned: false,
};

export default function Notes() {
  const { notes, leads, projects, addNote, updateNote, deleteNote } = useApp();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<NoteCategory | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCheckText, setNewCheckText] = useState<Record<string, string>>({});
  const [editingCheckId, setEditingCheckId] = useState<{ noteId: string; itemId: string; val: string } | null>(null);

  const filtered = useMemo(() => {
    return notes.filter(n => {
      const q = search.trim();
      const matchSearch = !q || n.title.includes(q) || (n.content || '').includes(q) || n.tags.some(t => t.includes(q));
      const matchCat = catFilter === 'all' || n.category === catFilter;
      return matchSearch && matchCat;
    }).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [notes, search, catFilter]);

  const openAdd = () => {
    setEditingNote(null);
    setForm(INIT_FORM);
    setModalOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setForm({
      title: note.title, content: note.content || '',
      category: note.category, tags: note.tags.join(', '),
      leadId: note.leadId || '', projectId: note.projectId || '',
      pinned: note.pinned,
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingNote(null); setForm(INIT_FORM); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      title: form.title, content: form.content || undefined,
      category: form.category, tags,
      checklist: editingNote?.checklist || [],
      leadId: form.leadId || undefined, projectId: form.projectId || undefined,
      pinned: form.pinned,
    };
    if (editingNote) await updateNote(editingNote.id, payload);
    else await addNote(payload);
    closeModal();
  };

  // 체크리스트
  const addCheckItem = (noteId: string) => {
    const text = (newCheckText[noteId] || '').trim();
    if (!text) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const newItem: NoteChecklist = { id: crypto.randomUUID(), text, done: false };
    updateNote(noteId, { checklist: [...note.checklist, newItem] });
    setNewCheckText(p => ({ ...p, [noteId]: '' }));
  };

  const toggleCheck = (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    updateNote(noteId, { checklist: note.checklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c) });
  };

  const deleteCheck = (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    updateNote(noteId, { checklist: note.checklist.filter(c => c.id !== itemId) });
  };

  const saveCheckEdit = (noteId: string, itemId: string, val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    updateNote(noteId, { checklist: note.checklist.map(c => c.id === itemId ? { ...c, text: trimmed } : c) });
    setEditingCheckId(null);
  };

  const totalCount = notes.length;
  const pinnedCount = notes.filter(n => n.pinned).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>나만의 메모장</h1>
          <p className={styles.subtitle}>총 {totalCount}개 · 고정 {pinnedCount}개</p>
        </div>
        <button className={styles.addBtn} onClick={openAdd}><Plus size={14} /> 메모 추가</button>
      </div>

      {/* 검색 + 카테고리 필터 */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input className={styles.search} placeholder="제목, 내용, 태그 검색..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className={styles.clearSearch} onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <div className={styles.catFilters}>
          <button className={`${styles.catBtn} ${catFilter === 'all' ? styles.catActive : ''}`} onClick={() => setCatFilter('all')}>
            전체 <span className={styles.catCount}>{notes.length}</span>
          </button>
          {(Object.entries(CATEGORY) as [NoteCategory, typeof CATEGORY[NoteCategory]][]).map(([key, val]) => (
            <button key={key}
              className={`${styles.catBtn} ${catFilter === key ? styles.catActive : ''}`}
              style={catFilter === key ? { background: val.bg, color: val.color, borderColor: val.color } : {}}
              onClick={() => setCatFilter(key)}
            >
              {val.icon} {val.label}
              <span className={styles.catCount}>{notes.filter(n => n.category === key).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 메모 목록 */}
      {filtered.length === 0 && (
        <div className={styles.empty}>
          <FileText size={32} strokeWidth={1.5} />
          <p>{search || catFilter !== 'all' ? '검색 결과가 없습니다' : '첫 메모를 작성해보세요'}</p>
          {!search && catFilter === 'all' && <button className={styles.addBtn} onClick={openAdd}><Plus size={13} /> 메모 추가</button>}
        </div>
      )}

      <div className={styles.grid}>
        {filtered.map(note => {
          const cat = CATEGORY[note.category];
          const isExpanded = expandedId === note.id;
          const doneCount = note.checklist.filter(c => c.done).length;
          const linkedLead = note.leadId ? leads.find(l => l.id === note.leadId) : null;
          const linkedProject = note.projectId ? projects.find(p => p.id === note.projectId) : null;

          return (
            <div key={note.id} className={`${styles.card} ${note.pinned ? styles.cardPinned : ''}`}>
              {/* 카드 헤더 */}
              <div className={styles.cardHeader}>
                <span className={styles.catChip} style={{ background: cat.bg, color: cat.color }}>
                  {cat.icon} {cat.label}
                </span>
                <div className={styles.cardActions}>
                  <button
                    className={`${styles.pinBtn} ${note.pinned ? styles.pinned : ''}`}
                    onClick={() => updateNote(note.id, { pinned: !note.pinned })}
                    title={note.pinned ? '고정 해제' : '고정'}
                  >
                    <Pin size={13} />
                  </button>
                  <button className={styles.editBtn} onClick={() => openEdit(note)} title="수정"><Edit2 size={13} /></button>
                  <button className={styles.deleteBtn} onClick={() => { if (confirm(`"${note.title}" 메모를 삭제할까요?`)) deleteNote(note.id); }} title="삭제"><Trash2 size={13} /></button>
                </div>
              </div>

              {/* 제목 */}
              <div className={styles.cardTitle} onClick={() => setExpandedId(isExpanded ? null : note.id)}>
                <span>{note.title}</span>
                {(note.content || note.checklist.length > 0) && (
                  isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                )}
              </div>

              {/* 태그 */}
              {note.tags.length > 0 && (
                <div className={styles.tags}>
                  {note.tags.map(tag => (
                    <span key={tag} className={styles.tag}><Tag size={9} /> {tag}</span>
                  ))}
                </div>
              )}

              {/* 연결 정보 */}
              {(linkedLead || linkedProject) && (
                <div className={styles.links}>
                  {linkedLead && <span className={styles.linkChip} style={{ color: 'var(--accent)', background: 'var(--accent-light)' }}>🤝 {linkedLead.company}</span>}
                  {linkedProject && <span className={styles.linkChip} style={{ color: 'var(--status-contact)', background: 'var(--status-contact-bg)' }}>📁 {linkedProject.name}</span>}
                </div>
              )}

              {/* 체크리스트 요약 (접힌 상태) */}
              {!isExpanded && note.checklist.length > 0 && (
                <div className={styles.checkSummary} onClick={() => setExpandedId(note.id)}>
                  <div className={styles.checkBar}>
                    <div className={styles.checkBarFill} style={{ width: `${note.checklist.length ? (doneCount / note.checklist.length) * 100 : 0}%` }} />
                  </div>
                  <span className={styles.checkSummaryText}>{doneCount}/{note.checklist.length} 완료</span>
                </div>
              )}

              {/* 펼쳐진 내용 */}
              {isExpanded && (
                <div className={styles.expandedContent}>
                  {note.content && <p className={styles.content}>{note.content}</p>}

                  {/* 체크리스트 */}
                  {(note.checklist.length > 0 || true) && (
                    <div className={styles.checklist}>
                      {note.checklist.length > 0 && (
                        <div className={styles.checkHeader}>
                          <span className={styles.checkTitle}>체크리스트</span>
                          <span className={styles.checkPct}>{doneCount}/{note.checklist.length}</span>
                        </div>
                      )}
                      {note.checklist.map(item => (
                        <div key={item.id} className={`${styles.checkItem} ${item.done ? styles.checkDone : ''}`}>
                          <button className={`${styles.checkBox} ${item.done ? styles.checkBoxDone : ''}`} onClick={() => toggleCheck(note.id, item.id)}>
                            {item.done && <Check size={9} strokeWidth={3} />}
                          </button>
                          {editingCheckId?.noteId === note.id && editingCheckId?.itemId === item.id ? (
                            <input
                              className={styles.checkEditInput}
                              value={editingCheckId.val}
                              autoFocus
                              onChange={e => setEditingCheckId(p => p ? { ...p, val: e.target.value } : null)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveCheckEdit(note.id, item.id, editingCheckId.val);
                                if (e.key === 'Escape') setEditingCheckId(null);
                              }}
                              onBlur={() => saveCheckEdit(note.id, item.id, editingCheckId.val)}
                            />
                          ) : (
                            <span className={styles.checkText} onDoubleClick={() => setEditingCheckId({ noteId: note.id, itemId: item.id, val: item.text })}>{item.text}</span>
                          )}
                          {!(editingCheckId?.noteId === note.id && editingCheckId?.itemId === item.id) && (
                            <button className={styles.checkEditBtn} onClick={() => setEditingCheckId({ noteId: note.id, itemId: item.id, val: item.text })} title="수정"><Edit2 size={10} /></button>
                          )}
                          <button className={styles.checkDelete} onClick={() => deleteCheck(note.id, item.id)}><X size={10} /></button>
                        </div>
                      ))}
                      <div className={styles.checkInput}>
                        <input
                          className={styles.checkInputField}
                          placeholder="항목 추가 (Enter)"
                          value={newCheckText[note.id] || ''}
                          onChange={e => setNewCheckText(p => ({ ...p, [note.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') addCheckItem(note.id); }}
                        />
                        {(newCheckText[note.id] || '').trim() && (
                          <button className={styles.checkAddBtn} onClick={() => addCheckItem(note.id)}>추가</button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={styles.cardMeta}>
                    {new Date(note.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 수정
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 추가/수정 모달 */}
      <Modal open={modalOpen} onClose={closeModal} title={editingNote ? '메모 수정' : '메모 추가'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>제목 *</label>
              <input className={f.input} placeholder="ex) 공공기관 RFP 읽는 법" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
            </div>
            <div className={f.field}>
              <label className={f.label}>카테고리</label>
              <select className={f.select} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as NoteCategory }))}>
                {(Object.entries(CATEGORY) as [NoteCategory, typeof CATEGORY[NoteCategory]][]).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>내용</label>
            <textarea className={f.textarea} rows={5} placeholder="자유롭게 기록하세요" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
          </div>
          <div className={f.field}>
            <label className={f.label}>태그 (쉼표로 구분)</label>
            <input className={f.input} placeholder="ex) RFP, 공공기관, 입찰전략" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>리드 연결 (선택)</label>
              <select className={f.select} value={form.leadId} onChange={e => setForm(p => ({ ...p, leadId: e.target.value }))}>
                <option value="">없음</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.dealName || l.company}</option>)}
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>프로젝트 연결 (선택)</label>
              <select className={f.select} value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}>
                <option value="">없음</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <label className={styles.pinnedToggle}>
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))} />
            <Pin size={13} /> 상단 고정
          </label>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={closeModal}>취소</button>
            <button className={f.btnPrimary} onClick={handleSave}>{editingNote ? '저장' : '추가'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
