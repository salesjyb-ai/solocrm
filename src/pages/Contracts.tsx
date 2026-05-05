import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, FileText, ChevronDown, ChevronRight, Link2, Calendar, Banknote, GripVertical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { Contract, ContractStatus } from '../types';
import f from './FormField.module.css';
import styles from './Contracts.module.css';

function formatKRW(val: number) {
  if (val >= 100000000) return `${(val / 100000000).toFixed(1)}억`;
  if (val >= 10000) return `${Math.round(val / 10000)}만`;
  return `${val.toLocaleString()}`;
}

const STATUS_LABEL: Record<ContractStatus, string> = { active: '진행중', completed: '완료', cancelled: '취소' };
const STATUS_COLOR: Record<ContractStatus, { bg: string; color: string }> = {
  active:    { bg: 'var(--status-contact-bg)', color: 'var(--status-contact)' },
  completed: { bg: 'var(--status-won-bg)',     color: 'var(--status-won)' },
  cancelled: { bg: 'var(--status-lost-bg)',    color: 'var(--status-lost)' },
};

const INIT_FORM = {
  title: '', contractNo: '', client: '', amount: '',
  contractDate: '', status: 'active' as ContractStatus,
  leadId: '', bidId: '', projectId: '',
  midDeliveryDate: '', midDeliveryDone: false,
  finalDeliveryDate: '', finalDeliveryDone: false,
  depositRate: '30', depositPaid: false, depositDate: '',
  midPaymentRate: '40', midPaymentPaid: false, midPaymentDate: '',
  balanceRate: '30', balancePaid: false, balanceDate: '',
  notes: '',
};

export default function Contracts() {
  const { contracts, addContract, updateContract, deleteContract, leads, bids, projects } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [filterStatus, setFilterStatus] = useState<ContractStatus | 'all'>('all');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ContractStatus | null>(null);

  const toggle = (id: string) => setExpanded(p => p === id ? null : id);

  const openAdd = () => { setEditingId(null); setForm(INIT_FORM); setModalOpen(true); };
  const openEdit = (c: Contract) => {
    setEditingId(c.id);
    setForm({
      title: c.title, contractNo: c.contractNo || '', client: c.client,
      amount: c.amount ? String(c.amount) : '', contractDate: c.contractDate || '',
      status: c.status, leadId: c.leadId || '', bidId: c.bidId || '', projectId: c.projectId || '',
      midDeliveryDate: c.midDeliveryDate || '', midDeliveryDone: c.midDeliveryDone,
      finalDeliveryDate: c.finalDeliveryDate || '', finalDeliveryDone: c.finalDeliveryDone,
      depositRate: String(c.depositRate), depositPaid: c.depositPaid, depositDate: c.depositDate || '',
      midPaymentRate: String(c.midPaymentRate), midPaymentPaid: c.midPaymentPaid, midPaymentDate: c.midPaymentDate || '',
      balanceRate: String(c.balanceRate), balancePaid: c.balancePaid, balanceDate: c.balanceDate || '',
      notes: c.notes || '',
    });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(INIT_FORM); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.client.trim()) return;
    const payload = {
      title: form.title, contractNo: form.contractNo, client: form.client,
      amount: form.amount ? Number(form.amount.replace(/,/g, '')) : undefined,
      contractDate: form.contractDate || undefined, status: form.status,
      leadId: form.leadId || undefined, bidId: form.bidId || undefined, projectId: form.projectId || undefined,
      midDeliveryDate: form.midDeliveryDate || undefined, midDeliveryDone: form.midDeliveryDone,
      finalDeliveryDate: form.finalDeliveryDate || undefined, finalDeliveryDone: form.finalDeliveryDone,
      depositRate: Number(form.depositRate) || 0, depositPaid: form.depositPaid, depositDate: form.depositDate || undefined,
      midPaymentRate: Number(form.midPaymentRate) || 0, midPaymentPaid: form.midPaymentPaid, midPaymentDate: form.midPaymentDate || undefined,
      balanceRate: Number(form.balanceRate) || 0, balancePaid: form.balancePaid, balanceDate: form.balanceDate || undefined,
      notes: form.notes || undefined,
    };
    if (editingId) await updateContract(editingId, payload);
    else await addContract(payload);
    closeModal();
  };

  const toggleField = (id: string, field: keyof Contract, val: boolean) => updateContract(id, { [field]: val } as Partial<Contract>);

  const handleDrop = (toStatus: ContractStatus) => {
    if (dragId) {
      const c = contracts.find(c => c.id === dragId);
      if (c && c.status !== toStatus) updateContract(dragId, { status: toStatus });
    }
    setDragId(null); setDragOver(null);
  };

  const CONTRACT_STATUSES: ContractStatus[] = ['active', 'completed', 'cancelled'];
  const grouped = CONTRACT_STATUSES.reduce((acc, s) => {
    acc[s] = contracts.filter(c => c.status === s);
    return acc;
  }, {} as Record<ContractStatus, typeof contracts>);

  const filtered = contracts.filter(c => filterStatus === 'all' || c.status === filterStatus);

  // 수금 진행률 계산
  // 통계
  const totalAmount = contracts.filter(c => c.status !== 'cancelled').reduce((s, c) => s + (c.amount || 0), 0);
  const paidAmount = contracts.filter(c => c.status !== 'cancelled').reduce((s, c) => {
    let paid = 0;
    if (c.depositPaid) paid += (c.amount || 0) * c.depositRate / 100;
    if (c.midPaymentPaid) paid += (c.amount || 0) * c.midPaymentRate / 100;
    if (c.balancePaid) paid += (c.amount || 0) * c.balanceRate / 100;
    return s + paid;
  }, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>계약 관리</h1>
          <p className={styles.subtitle}>총 {contracts.length}건 · 계약금액 {formatKRW(totalAmount)}원 · 수금완료 {formatKRW(paidAmount)}원</p>
        </div>
        <button className={styles.addBtn} onClick={openAdd}><Plus size={14} /> 계약 추가</button>
      </div>

      {/* 상태 필터 */}
      <div className={styles.filters}>
        {(['all', 'active', 'completed', 'cancelled'] as const).map(s => (
          <button key={s} className={`${styles.filter} ${filterStatus === s ? styles.filterActive : ''}`} onClick={() => setFilterStatus(s)}>
            {s === 'all' ? `전체 ${contracts.length}` : `${STATUS_LABEL[s]} ${contracts.filter(c => c.status === s).length}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.empty}>
          <FileText size={32} strokeWidth={1.5} />
          <p>{filterStatus === 'all' ? '등록된 계약이 없습니다' : `${STATUS_LABEL[filterStatus]} 계약이 없습니다`}</p>
          {filterStatus === 'all' && <button className={styles.addBtn} onClick={openAdd}><Plus size={13} /> 첫 계약 추가</button>}
        </div>
      )}

      {/* 필터 상태에서 드래그 안내 */}
      {filterStatus !== 'all' && (
        <div className={styles.dragHintBanner}>
          💡 드래그 이동은 <strong>전체</strong> 필터에서만 가능해요
        </div>
      )}

      {/* 전체 보기 - 상태별 섹션 + 드래그 */}
      {filterStatus === 'all' ? (
        <div className={styles.sectionList}>
          {(['active', 'completed', 'cancelled'] as ContractStatus[]).map(status => {
            const items = grouped[status];
            const isDragTarget = dragOver === status;
            return (
              <div key={status}
                className={`${styles.statusSection} ${isDragTarget ? styles.statusDragOver : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(status); }}
                onDrop={() => handleDrop(status)}
                onDragLeave={() => setDragOver(null)}
              >
                <div className={styles.statusSectionHeader}>
                  <span className={styles.statusSectionDot} style={{ background: STATUS_COLOR[status].color }} />
                  <span className={styles.statusSectionTitle}>{STATUS_LABEL[status]}</span>
                  <span className={styles.statusSectionCount}>{items.length}</span>
                  {isDragTarget && items.length === 0 && <span className={styles.dropHint}>여기에 드롭</span>}
                </div>
                <div className={styles.list}>
                  {items.length === 0 && !isDragTarget && <p className={styles.sectionEmpty}>계약 없음</p>}
                  {items.map(c => <ContractCard key={c.id} c={c} expanded={expanded} toggle={toggle} toggleField={toggleField} openEdit={openEdit} deleteContract={deleteContract} leads={leads} bids={bids} projects={projects} onDragStart={() => setDragId(c.id)} onDragEnd={() => { setDragId(null); setDragOver(null); }} isDragging={dragId === c.id} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div className={styles.list}>
        {filtered.map(c => <ContractCard key={c.id} c={c} expanded={expanded} toggle={toggle} toggleField={toggleField} openEdit={openEdit} deleteContract={deleteContract} leads={leads} bids={bids} projects={projects} onDragStart={() => setDragId(c.id)} onDragEnd={() => { setDragId(null); setDragOver(null); }} isDragging={dragId === c.id} />)}
      </div>
      )}
      {/* 추가/수정 모달 */}
      <Modal open={modalOpen} onClose={closeModal} title={editingId ? '계약 수정' : '계약 추가'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>계약명 *</label>
              <input className={f.input} placeholder="AI 민원처리 시스템 구축 용역" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
            </div>
            <div className={f.field}>
              <label className={f.label}>고객사 *</label>
              <input className={f.input} placeholder="서울주택도시공사" value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} />
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>계약번호</label>
              <input className={f.input} placeholder="2026-001" value={form.contractNo} onChange={e => setForm(p => ({ ...p, contractNo: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>계약금액 (원)</label>
              <input className={f.input} type="text" inputMode="numeric" placeholder="830,000,000"
                value={form.amount ? Number(form.amount.replace(/,/g, '')).toLocaleString('ko-KR') : ''}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '') }))} />
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>계약일</label>
              <input className={f.input} type="date" value={form.contractDate} onChange={e => setForm(p => ({ ...p, contractDate: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>상태</label>
              <select className={f.select} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ContractStatus }))}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* 납품 일정 */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>납품 일정</div>
            <div className={f.row}>
              <div className={f.field}>
                <label className={f.label}>중간 납품일</label>
                <input className={f.input} type="date" value={form.midDeliveryDate} onChange={e => setForm(p => ({ ...p, midDeliveryDate: e.target.value }))} />
              </div>
              <div className={f.field}>
                <label className={f.label}>최종 납품일</label>
                <input className={f.input} type="date" value={form.finalDeliveryDate} onChange={e => setForm(p => ({ ...p, finalDeliveryDate: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* 대금 수금 */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>대금 수금 (%)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: '선금', rateKey: 'depositRate', dateKey: 'depositDate' },
                { label: '중도금', rateKey: 'midPaymentRate', dateKey: 'midPaymentDate' },
                { label: '잔금', rateKey: 'balanceRate', dateKey: 'balanceDate' },
              ].map(p => (
                <div key={p.label} className={f.field}>
                  <label className={f.label}>{p.label} (%)</label>
                  <input className={f.input} type="number" min="0" max="100" value={form[p.rateKey as keyof typeof form] as string}
                    onChange={e => setForm(prev => ({ ...prev, [p.rateKey]: e.target.value }))} />
                  <input className={f.input} type="date" style={{ marginTop: 4 }} value={form[p.dateKey as keyof typeof form] as string}
                    onChange={e => setForm(prev => ({ ...prev, [p.dateKey]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          {/* 연결 */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>연결 (선택)</div>
            <div className={f.row}>
              <div className={f.field}>
                <label className={f.label}>리드</label>
                <select className={f.select} value={form.leadId} onChange={e => setForm(p => ({ ...p, leadId: e.target.value }))}>
                  <option value="">없음</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.company} - {l.name}</option>)}
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label}>입찰</label>
                <select className={f.select} value={form.bidId} onChange={e => setForm(p => ({ ...p, bidId: e.target.value }))}>
                  <option value="">없음</option>
                  {bids.map(b => <option key={b.id} value={b.id}>{b.title.slice(0, 25)}</option>)}
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label}>프로젝트</label>
                <select className={f.select} value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}>
                  <option value="">없음</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className={f.field}>
            <label className={f.label}>메모</label>
            <textarea className={f.textarea} rows={2} placeholder="특이사항, 계약 조건 등" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={closeModal}>취소</button>
            <button className={f.btnPrimary} onClick={handleSave}>{editingId ? '저장' : '추가'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ContractCard({ c, expanded, toggle, toggleField, openEdit, deleteContract, leads, bids, projects, onDragStart, onDragEnd, isDragging }: {
  c: Contract; expanded: string | null; toggle: (id: string) => void;
  toggleField: (id: string, field: keyof Contract, val: boolean) => void;
  openEdit: (c: Contract) => void; deleteContract: (id: string) => Promise<void>;
  leads: ReturnType<typeof useApp>['leads']; bids: ReturnType<typeof useApp>['bids']; projects: ReturnType<typeof useApp>['projects'];
  onDragStart: () => void; onDragEnd: () => void; isDragging: boolean;
}) {
  const isOpen = expanded === c.id;
  let paid = 0;
  if (c.depositPaid) paid += c.depositRate;
  if (c.midPaymentPaid) paid += c.midPaymentRate;
  if (c.balancePaid) paid += c.balanceRate;
  const progress = paid;
  const linkedLead = c.leadId ? leads.find(l => l.id === c.leadId) : null;
  const linkedBid = c.bidId ? bids.find(b => b.id === c.bidId) : null;
  const linkedProject = c.projectId ? projects.find(p => p.id === c.projectId) : null;

  return (
    <div className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      style={{ opacity: isDragging ? 0.5 : 1 }}>
      <div className={styles.cardHeader}>
        <GripVertical size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5, cursor: 'grab' }} />
        <div className={styles.headerLeft} onClick={() => toggle(c.id)}>
          <div className={styles.avatar}>{c.client[0]}</div>
          <div className={styles.nameBlock}>
            <span className={styles.contractTitle}>{c.title}</span>
            <span className={styles.clientName}>{c.client}{c.contractNo && <span className={styles.contractNo}> · {c.contractNo}</span>}</span>
          </div>
          <div className={styles.headerMeta}>
            {c.amount && <span className={styles.amount}>{formatKRW(c.amount)}원</span>}
            <span className={styles.statusChip} style={{ background: STATUS_COLOR[c.status].bg, color: STATUS_COLOR[c.status].color }}>{STATUS_LABEL[c.status]}</span>
            <div className={styles.progressWrap}>
              <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>
              <span className={styles.progressLabel}>{progress}%</span>
            </div>
          </div>
          {isOpen ? <ChevronDown size={16} className={styles.chevron} /> : <ChevronRight size={16} className={styles.chevron} />}
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => openEdit(c)} title="수정"><Edit2 size={13} /></button>
          <button onClick={() => { if (confirm(`"${c.title}" 계약을 삭제할까요?`)) deleteContract(c.id); }} title="삭제"><Trash2 size={13} /></button>
        </div>
      </div>
      {isOpen && (
        <div className={styles.detail}>
          <div className={styles.detailGrid}>
            <section className={styles.section}>
              <div className={styles.sectionTitle}><Calendar size={13} /> 납품 일정</div>
              <div className={styles.deliveryList}>
                {c.midDeliveryDate ? (
                  <div className={styles.deliveryItem}>
                    <button className={`${styles.deliveryCheck} ${c.midDeliveryDone ? styles.deliveryChecked : ''}`} onClick={() => toggleField(c.id, 'midDeliveryDone', !c.midDeliveryDone)}>
                      {c.midDeliveryDone && <Check size={10} strokeWidth={3} />}
                    </button>
                    <span className={`${styles.deliveryLabel} ${c.midDeliveryDone ? styles.done : ''}`}>중간 납품</span>
                    <span className={styles.deliveryDate}>{c.midDeliveryDate}</span>
                  </div>
                ) : null}
                {c.finalDeliveryDate ? (
                  <div className={styles.deliveryItem}>
                    <button className={`${styles.deliveryCheck} ${c.finalDeliveryDone ? styles.deliveryChecked : ''}`} onClick={() => toggleField(c.id, 'finalDeliveryDone', !c.finalDeliveryDone)}>
                      {c.finalDeliveryDone && <Check size={10} strokeWidth={3} />}
                    </button>
                    <span className={`${styles.deliveryLabel} ${c.finalDeliveryDone ? styles.done : ''}`}>최종 납품</span>
                    <span className={styles.deliveryDate}>{c.finalDeliveryDate}</span>
                  </div>
                ) : null}
                {!c.midDeliveryDate && !c.finalDeliveryDate && <span className={styles.emptyText}>납품 일정 미등록</span>}
              </div>
            </section>
            <section className={styles.section}>
              <div className={styles.sectionTitle}><Banknote size={13} /> 대금 수금</div>
              <div className={styles.paymentList}>
                {[
                  { label: '선금', rate: c.depositRate, paid: c.depositPaid, date: c.depositDate, paidField: 'depositPaid' as keyof Contract },
                  { label: '중도금', rate: c.midPaymentRate, paid: c.midPaymentPaid, date: c.midPaymentDate, paidField: 'midPaymentPaid' as keyof Contract },
                  { label: '잔금', rate: c.balanceRate, paid: c.balancePaid, date: c.balanceDate, paidField: 'balancePaid' as keyof Contract },
                ].filter(p => p.rate > 0).map(p => (
                  <div key={p.label} className={styles.paymentItem}>
                    <button className={`${styles.payCheck} ${p.paid ? styles.payChecked : ''}`} onClick={() => toggleField(c.id, p.paidField, !p.paid)}>
                      {p.paid && <Check size={10} strokeWidth={3} />}
                    </button>
                    <span className={`${styles.payLabel} ${p.paid ? styles.done : ''}`}>{p.label}</span>
                    <span className={styles.payRate}>{p.rate}%</span>
                    {c.amount && <span className={styles.payAmount}>{formatKRW(Math.round(c.amount * p.rate / 100))}원</span>}
                    {p.date && <span className={styles.payDate}>{p.date}</span>}
                    {p.paid && <span className={styles.paidBadge}>수금완료</span>}
                  </div>
                ))}
              </div>
            </section>
          </div>
          {(linkedLead || linkedBid || linkedProject) && (
            <section className={styles.linkSection}>
              <div className={styles.sectionTitle}><Link2 size={13} /> 연결</div>
              <div className={styles.linkList}>
                {linkedLead && <span className={styles.linkChip} style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>🤝 {linkedLead.company}</span>}
                {linkedBid && <span className={styles.linkChip} style={{ background: 'var(--status-contact-bg)', color: 'var(--status-contact)' }}>⚖️ {linkedBid.title.slice(0, 20)}</span>}
                {linkedProject && <span className={styles.linkChip} style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: linkedProject.color }}>📁 {linkedProject.name}</span>}
              </div>
            </section>
          )}
          {c.notes && (
            <section className={styles.notesSection}>
              <div className={styles.sectionTitle}><FileText size={13} /> 메모</div>
              <p className={styles.notesText}>{c.notes}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
