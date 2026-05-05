import { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Phone, Mail, X, Briefcase } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { Partner, PartnerStatus, PartnerGrade, PartnerProject, PartnerProjectStatus } from '../types';
import f from './FormField.module.css';
import styles from './Partners.module.css';

const STATUS: Record<PartnerStatus, { label: string; color: string; bg: string }> = {
  active:  { label: '활성',  color: 'var(--status-won)',     bg: 'var(--status-won-bg)' },
  dormant: { label: '휴면',  color: '#f59e0b',               bg: '#fffbeb' },
  ended:   { label: '종료',  color: 'var(--status-lost)',    bg: 'var(--status-lost-bg)' },
};

const GRADE: Record<PartnerGrade, { label: string; color: string }> = {
  strategic: { label: '⭐ 전략',  color: '#f59e0b' },
  preferred: { label: '✦ 우선',   color: 'var(--accent)' },
  general:   { label: '일반',      color: 'var(--text-muted)' },
};

const PROJ_STATUS: Record<PartnerProjectStatus, { label: string; color: string }> = {
  ongoing:   { label: '진행중', color: 'var(--status-contact)' },
  completed: { label: '완료',   color: 'var(--status-won)' },
  cancelled: { label: '취소',   color: 'var(--status-lost)' },
};

const INIT_FORM = {
  name: '', status: 'active' as PartnerStatus, grade: 'general' as PartnerGrade,
  contactName: '', contactEmail: '', contactPhone: '',
  commissionRate: '', contractStart: '', contractEnd: '', mainField: '', notes: '',
};
const INIT_PROJ = { title: '', description: '', startDate: '', endDate: '', status: 'ongoing' as PartnerProjectStatus, amount: '' };

function formatKRW(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.round(v / 10000)}만`;
  return v.toLocaleString();
}

export default function Partners() {
  const { partners, addPartner, updatePartner, deletePartner, addPartnerProject, updatePartnerProject, deletePartnerProject } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<PartnerStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [projModal, setProjModal] = useState<{ partnerId: string; proj?: PartnerProject } | null>(null);
  const [projForm, setProjForm] = useState(INIT_PROJ);

  const filtered = partners.filter(p => filterStatus === 'all' || p.status === filterStatus);

  const openAdd = () => { setEditingId(null); setForm(INIT_FORM); setModalOpen(true); };
  const openEdit = (p: Partner) => {
    setEditingId(p.id);
    setForm({
      name: p.name, status: p.status, grade: p.grade,
      contactName: p.contactName || '', contactEmail: p.contactEmail || '', contactPhone: p.contactPhone || '',
      commissionRate: p.commissionRate ? String(p.commissionRate) : '',
      contractStart: p.contractStart || '', contractEnd: p.contractEnd || '',
      mainField: p.mainField || '', notes: p.notes || '',
    });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(INIT_FORM); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name, status: form.status, grade: form.grade,
      contactName: form.contactName || undefined, contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      commissionRate: form.commissionRate ? Number(form.commissionRate) : undefined,
      contractStart: form.contractStart || undefined, contractEnd: form.contractEnd || undefined,
      mainField: form.mainField || undefined, notes: form.notes || undefined,
    };
    if (editingId) await updatePartner(editingId, payload);
    else await addPartner(payload);
    closeModal();
  };

  const openAddProj = (partnerId: string) => {
    setProjModal({ partnerId });
    setProjForm(INIT_PROJ);
  };
  const openEditProj = (partnerId: string, proj: PartnerProject) => {
    setProjModal({ partnerId, proj });
    setProjForm({
      title: proj.title, description: proj.description || '',
      startDate: proj.startDate || '', endDate: proj.endDate || '',
      status: proj.status, amount: proj.amount ? String(proj.amount) : '',
    });
  };
  const closeProjModal = () => { setProjModal(null); setProjForm(INIT_PROJ); };

  const handleSaveProj = async () => {
    if (!projModal || !projForm.title.trim()) return;
    const payload = {
      title: projForm.title, description: projForm.description || undefined,
      startDate: projForm.startDate || undefined, endDate: projForm.endDate || undefined,
      status: projForm.status, amount: projForm.amount ? Number(projForm.amount.replace(/,/g, '')) : undefined,
    };
    if (projModal.proj) await updatePartnerProject(projModal.partnerId, projModal.proj.id, payload);
    else await addPartnerProject(projModal.partnerId, payload);
    closeProjModal();
  };

  const totalActive = partners.filter(p => p.status === 'active').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>파트너사 관리</h1>
          <p className={styles.subtitle}>총 {partners.length}개 · 활성 {totalActive}개</p>
        </div>
        <button className={styles.addBtn} onClick={openAdd}><Plus size={14} /> 파트너사 추가</button>
      </div>

      {/* 상태 필터 */}
      <div className={styles.filters}>
        {(['all', 'active', 'dormant', 'ended'] as const).map(s => (
          <button key={s}
            className={`${styles.filter} ${filterStatus === s ? styles.filterActive : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? `전체 ${partners.length}` : `${STATUS[s].label} ${partners.filter(p => p.status === s).length}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.empty}>
          <Briefcase size={32} strokeWidth={1.5} />
          <p>{filterStatus === 'all' ? '등록된 파트너사가 없습니다' : `${STATUS[filterStatus as PartnerStatus].label} 파트너사가 없습니다`}</p>
          {filterStatus === 'all' && <button className={styles.addBtn} onClick={openAdd}><Plus size={13} /> 파트너사 추가</button>}
        </div>
      )}

      <div className={styles.list}>
        {filtered.map(partner => {
          const isOpen = expanded === partner.id;
          const totalAmount = partner.projects.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);

          return (
            <div key={partner.id} className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}>
              {/* 헤더 */}
              <div className={styles.cardHeader} onClick={() => setExpanded(isOpen ? null : partner.id)}>
                <div className={styles.headerLeft}>
                  <div className={styles.avatar}>{partner.name[0]}</div>
                  <div className={styles.nameBlock}>
                    <div className={styles.nameRow}>
                      <span className={styles.name}>{partner.name}</span>
                      <span className={styles.grade} style={{ color: GRADE[partner.grade].color }}>{GRADE[partner.grade].label}</span>
                      <span className={styles.statusChip} style={{ background: STATUS[partner.status].bg, color: STATUS[partner.status].color }}>
                        {STATUS[partner.status].label}
                      </span>
                    </div>
                    <div className={styles.meta}>
                      {partner.mainField && <span>{partner.mainField}</span>}
                      {partner.commissionRate && <span>수수료 {partner.commissionRate}%</span>}
                      {partner.contactName && <span>{partner.contactName}</span>}
                      {totalAmount > 0 && <span className={styles.amount}>협업 {formatKRW(totalAmount)}원</span>}
                    </div>
                  </div>
                </div>
                <div className={styles.headerRight}>
                  <span className={styles.projCount}><Briefcase size={11} /> {partner.projects.length}건</span>
                  <button className={styles.editBtn} onClick={e => { e.stopPropagation(); openEdit(partner); }}><Edit2 size={13} /></button>
                  <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); if (confirm(`"${partner.name}"을 삭제할까요?`)) deletePartner(partner.id); }}><Trash2 size={13} /></button>
                  {isOpen ? <ChevronDown size={15} className={styles.chevron} /> : <ChevronRight size={15} className={styles.chevron} />}
                </div>
              </div>

              {/* 상세 */}
              {isOpen && (
                <div className={styles.detail}>
                  {/* 연락처 + 계약 정보 */}
                  <div className={styles.infoGrid}>
                    {partner.contactEmail && (
                      <div className={styles.infoItem}><Mail size={12} /><span>{partner.contactEmail}</span></div>
                    )}
                    {partner.contactPhone && (
                      <div className={styles.infoItem}><Phone size={12} /><span>{partner.contactPhone}</span></div>
                    )}
                    {(partner.contractStart || partner.contractEnd) && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>계약 기간</span>
                        <span>{partner.contractStart || '?'} ~ {partner.contractEnd || '?'}</span>
                      </div>
                    )}
                  </div>

                  {partner.notes && (
                    <div className={styles.notes}>{partner.notes}</div>
                  )}

                  {/* 협업 프로젝트 이력 */}
                  <div className={styles.projSection}>
                    <div className={styles.projHeader}>
                      <span className={styles.projTitle}>협업 프로젝트 이력 <span className={styles.projCount2}>{partner.projects.length}</span></span>
                      <button className={styles.addProjBtn} onClick={() => openAddProj(partner.id)}><Plus size={12} /> 이력 추가</button>
                    </div>
                    {partner.projects.length === 0 && <p className={styles.projEmpty}>협업 이력이 없습니다</p>}
                    <div className={styles.projList}>
                      {partner.projects.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')).map(proj => (
                        <div key={proj.id} className={styles.projItem}>
                          <div className={styles.projLeft}>
                            <div className={styles.projItemTop}>
                              <span className={styles.projItemTitle}>{proj.title}</span>
                              <span className={styles.projStatusChip} style={{ color: PROJ_STATUS[proj.status].color }}>{PROJ_STATUS[proj.status].label}</span>
                            </div>
                            {proj.description && <p className={styles.projDesc}>{proj.description}</p>}
                            <div className={styles.projMeta}>
                              {proj.startDate && <span>{proj.startDate}{proj.endDate ? ` ~ ${proj.endDate}` : ''}</span>}
                              {proj.amount && <span className={styles.projAmount}>{formatKRW(proj.amount)}원</span>}
                            </div>
                          </div>
                          <div className={styles.projItemActions}>
                            <button onClick={() => openEditProj(partner.id, proj)}><Edit2 size={12} /></button>
                            <button onClick={() => { if (confirm('이 이력을 삭제할까요?')) deletePartnerProject(partner.id, proj.id); }}><X size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 파트너사 추가/수정 모달 */}
      <Modal open={modalOpen} onClose={closeModal} title={editingId ? '파트너사 수정' : '파트너사 추가'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>회사명 *</label>
              <input className={f.input} placeholder="(주)테크파트너" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className={f.field}>
              <label className={f.label}>주력 분야</label>
              <input className={f.input} placeholder="AI, 클라우드, SI" value={form.mainField} onChange={e => setForm(p => ({ ...p, mainField: e.target.value }))} />
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>등급</label>
              <select className={f.select} value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value as PartnerGrade }))}>
                <option value="strategic">⭐ 전략</option>
                <option value="preferred">✦ 우선</option>
                <option value="general">일반</option>
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>상태</label>
              <select className={f.select} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as PartnerStatus }))}>
                <option value="active">활성</option>
                <option value="dormant">휴면</option>
                <option value="ended">종료</option>
              </select>
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>담당자</label>
              <input className={f.input} placeholder="홍길동" value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>연락처</label>
              <input className={f.input} placeholder="010-0000-0000" value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} />
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>이메일</label>
            <input className={f.input} placeholder="partner@company.com" value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>수수료율 (%)</label>
              <input className={f.input} type="number" min="0" max="100" step="0.1" placeholder="10" value={form.commissionRate} onChange={e => setForm(p => ({ ...p, commissionRate: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>계약 시작일</label>
              <input className={f.input} type="date" value={form.contractStart} onChange={e => setForm(p => ({ ...p, contractStart: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>계약 종료일</label>
              <input className={f.input} type="date" value={form.contractEnd} onChange={e => setForm(p => ({ ...p, contractEnd: e.target.value }))} />
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>메모 / 특이사항</label>
            <textarea className={f.textarea} rows={3} placeholder="계약 조건, 주의사항 등" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={closeModal}>취소</button>
            <button className={f.btnPrimary} onClick={handleSave}>{editingId ? '저장' : '추가'}</button>
          </div>
        </div>
      </Modal>

      {/* 협업 프로젝트 추가/수정 모달 */}
      <Modal open={!!projModal} onClose={closeProjModal} title={projModal?.proj ? '프로젝트 이력 수정' : '프로젝트 이력 추가'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>프로젝트명 *</label>
            <input className={f.input} placeholder="공공기관 AI 챗봇 구축" value={projForm.title} onChange={e => setProjForm(p => ({ ...p, title: e.target.value }))} autoFocus />
          </div>
          <div className={f.field}>
            <label className={f.label}>설명</label>
            <textarea className={f.textarea} rows={2} placeholder="협업 내용 요약" value={projForm.description} onChange={e => setProjForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>시작일</label>
              <input className={f.input} type="date" value={projForm.startDate} onChange={e => setProjForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>종료일</label>
              <input className={f.input} type="date" value={projForm.endDate} onChange={e => setProjForm(p => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>상태</label>
              <select className={f.select} value={projForm.status} onChange={e => setProjForm(p => ({ ...p, status: e.target.value as PartnerProjectStatus }))}>
                <option value="ongoing">진행중</option>
                <option value="completed">완료</option>
                <option value="cancelled">취소</option>
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>금액 (원)</label>
              <input className={f.input} type="text" inputMode="numeric" placeholder="50,000,000"
                value={projForm.amount ? Number(projForm.amount.replace(/,/g, '')).toLocaleString('ko-KR') : ''}
                onChange={e => setProjForm(p => ({ ...p, amount: e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '') }))} />
            </div>
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={closeProjModal}>취소</button>
            <button className={f.btnPrimary} onClick={handleSaveProj}>{projModal?.proj ? '저장' : '추가'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
