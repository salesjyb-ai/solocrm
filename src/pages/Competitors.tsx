import { useState } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, X, Check, Shield, Sword, FileText, Gavel, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { Competitor, CompetitorBidResult } from '../types';
import f from './FormField.module.css';
import styles from './Competitors.module.css';

const RESULT_LABEL: Record<CompetitorBidResult, string> = {
  won_us: '우리 수주', won_them: '경쟁사 수주', other: '기타',
};
const RESULT_COLOR: Record<CompetitorBidResult, { bg: string; color: string }> = {
  won_us: { bg: 'var(--status-won-bg)', color: 'var(--status-won)' },
  won_them: { bg: 'var(--status-lost-bg)', color: 'var(--status-lost)' },
  other: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' },
};

const INIT_FORM = { name: '', size: '', mainField: '', bidTypes: '', strengths: '', weaknesses: '', notes: '' };
const INIT_BID_FORM = { bidTitle: '', bidAgency: '', bidDate: '', result: '' as CompetitorBidResult | '', memo: '' };

export default function Competitors() {
  const { competitors, bids, addCompetitor, updateCompetitor, deleteCompetitor, addCompetitorBid, deleteCompetitorBid } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [bidTargetId, setBidTargetId] = useState<string | null>(null);
  const [bidForm, setBidForm] = useState(INIT_BID_FORM);
  const [bidLinkId, setBidLinkId] = useState('');

  const toggle = (id: string) => setExpanded(p => p === id ? null : id);

  const openAdd = () => { setEditingId(null); setForm(INIT_FORM); setModalOpen(true); };
  const openEdit = (c: Competitor) => {
    setEditingId(c.id);
    setForm({ name: c.name, size: c.size || '', mainField: c.mainField || '', bidTypes: c.bidTypes || '', strengths: c.strengths || '', weaknesses: c.weaknesses || '', notes: c.notes || '' });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(INIT_FORM); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      await updateCompetitor(editingId, { name: form.name, size: form.size, mainField: form.mainField, bidTypes: form.bidTypes, strengths: form.strengths, weaknesses: form.weaknesses, notes: form.notes });
    } else {
      await addCompetitor({ name: form.name, size: form.size, mainField: form.mainField, bidTypes: form.bidTypes, strengths: form.strengths, weaknesses: form.weaknesses, notes: form.notes });
    }
    closeModal();
  };

  const openBidModal = (competitorId: string) => {
    setBidTargetId(competitorId);
    setBidForm(INIT_BID_FORM);
    setBidLinkId('');
    setBidModalOpen(true);
  };
  const closeBidModal = () => { setBidModalOpen(false); setBidTargetId(null); setBidForm(INIT_BID_FORM); setBidLinkId(''); };

  const handleBidSave = async () => {
    if (!bidTargetId || !bidForm.bidTitle.trim()) return;
    const linkedBid = bidLinkId ? bids.find(b => b.id === bidLinkId) : undefined;
    await addCompetitorBid(bidTargetId, {
      bidId: linkedBid?.id,
      bidTitle: linkedBid ? linkedBid.title : bidForm.bidTitle,
      bidAgency: linkedBid ? linkedBid.agency : bidForm.bidAgency,
      bidDate: bidForm.bidDate || undefined,
      result: bidForm.result || undefined,
      memo: bidForm.memo || undefined,
    });
    closeBidModal();
  };

  // 기존 입찰 연결 시 자동 채우기
  const handleBidLink = (bidId: string) => {
    setBidLinkId(bidId);
    if (bidId) {
      const b = bids.find(b => b.id === bidId);
      if (b) setBidForm(p => ({ ...p, bidTitle: b.title, bidAgency: b.agency, bidDate: b.deadline || '' }));
    } else {
      setBidForm(INIT_BID_FORM);
    }
  };

  const wonUs = (c: Competitor) => c.bids.filter(b => b.result === 'won_us').length;
  const wonThem = (c: Competitor) => c.bids.filter(b => b.result === 'won_them').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>경쟁사</h1>
          <p className={styles.subtitle}>총 {competitors.length}개 경쟁사 · 입찰 경쟁 현황 관리</p>
        </div>
        <button className={styles.addBtn} onClick={openAdd}><Plus size={14} /> 경쟁사 추가</button>
      </div>

      {competitors.length === 0 && (
        <div className={styles.empty}>
          <Building2 size={32} strokeWidth={1.5} />
          <p>등록된 경쟁사가 없습니다</p>
          <button className={styles.addBtn} onClick={openAdd}><Plus size={13} /> 첫 경쟁사 추가</button>
        </div>
      )}

      <div className={styles.list}>
        {competitors.map(c => {
          const isOpen = expanded === c.id;
          const us = wonUs(c);
          const them = wonThem(c);
          const total = c.bids.length;
          const winRate = total > 0 ? Math.round((us / total) * 100) : null;

          return (
            <div key={c.id} className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}>
              {/* 헤더 */}
              <div className={styles.cardHeader}>
                <div className={styles.headerLeft} onClick={() => toggle(c.id)}>
                  <div className={styles.avatar}>{c.name[0]}</div>
                  <div className={styles.nameBlock}>
                    <span className={styles.companyName}>{c.name}</span>
                    <span className={styles.meta}>
                      {c.size && <span>{c.size}</span>}
                      {c.mainField && <span>{c.mainField}</span>}
                    </span>
                  </div>
                  <div className={styles.stats}>
                    {total > 0 && (
                      <>
                        <span className={styles.statItem} style={{ color: 'var(--status-won)' }}><Check size={11} /> {us}승</span>
                        <span className={styles.statItem} style={{ color: 'var(--status-lost)' }}><X size={11} /> {them}패</span>
                        {winRate !== null && <span className={styles.statRate}>{winRate}%</span>}
                      </>
                    )}
                  </div>
                  {isOpen ? <ChevronDown size={16} className={styles.chevron} /> : <ChevronRight size={16} className={styles.chevron} />}
                </div>
                <div className={styles.headerActions}>
                  <button onClick={() => openEdit(c)} title="수정"><Edit2 size={13} /></button>
                  <button onClick={() => { if (confirm(`"${c.name}" 경쟁사를 삭제할까요?`)) deleteCompetitor(c.id); }} title="삭제"><Trash2 size={13} /></button>
                </div>
              </div>

              {/* 상세 */}
              {isOpen && (
                <div className={styles.detail}>
                  {/* 입찰 유형 */}
                  {c.bidTypes && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}><Gavel size={12} /> 주요 입찰 유형</span>
                      <span className={styles.infoValue}>{c.bidTypes}</span>
                    </div>
                  )}

                  {/* 강약점 */}
                  {(c.strengths || c.weaknesses) && (
                    <div className={styles.swRow}>
                      {c.strengths && (
                        <div className={styles.swBox} style={{ borderColor: 'var(--status-lost)', background: 'var(--status-lost-bg)' }}>
                          <div className={styles.swTitle}><Sword size={12} /> 강점 (위협)</div>
                          <div className={styles.swContent}>{c.strengths}</div>
                        </div>
                      )}
                      {c.weaknesses && (
                        <div className={styles.swBox} style={{ borderColor: 'var(--status-won)', background: 'var(--status-won-bg)' }}>
                          <div className={styles.swTitle}><Shield size={12} /> 약점 (우리 기회)</div>
                          <div className={styles.swContent}>{c.weaknesses}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 메모 */}
                  {c.notes && (
                    <div className={styles.notesBox}>
                      <span className={styles.infoLabel}><FileText size={12} /> 메모</span>
                      <span className={styles.notesText}>{c.notes}</span>
                    </div>
                  )}

                  {/* 입찰 이력 */}
                  <div className={styles.bidsSection}>
                    <div className={styles.bidsHeader}>
                      <span className={styles.bidsTitle}>맞붙은 입찰 이력 <span className={styles.count}>{c.bids.length}</span></span>
                      <button className={styles.addBidBtn} onClick={() => openBidModal(c.id)}><Plus size={12} /> 이력 추가</button>
                    </div>
                    {c.bids.length === 0 && <div className={styles.emptyBids}>아직 입찰 이력이 없습니다</div>}
                    <div className={styles.bidList}>
                      {c.bids.sort((a, b) => (b.bidDate || '').localeCompare(a.bidDate || '')).map(bid => (
                        <div key={bid.id} className={styles.bidItem}>
                          <div className={styles.bidLeft}>
                            <span className={styles.bidTitle}>{bid.bidTitle}</span>
                            {bid.bidAgency && <span className={styles.bidAgency}>{bid.bidAgency}</span>}
                            {bid.bidDate && <span className={styles.bidDate}>{bid.bidDate}</span>}
                            {bid.memo && <span className={styles.bidMemo}>{bid.memo}</span>}
                          </div>
                          <div className={styles.bidRight}>
                            {bid.result && (
                              <span className={styles.resultChip} style={{ background: RESULT_COLOR[bid.result].bg, color: RESULT_COLOR[bid.result].color }}>
                                {RESULT_LABEL[bid.result]}
                              </span>
                            )}
                            <button className={styles.delBidBtn} onClick={() => { if (confirm('이 이력을 삭제할까요?')) deleteCompetitorBid(bid.id, c.id); }}><X size={11} /></button>
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

      {/* 경쟁사 추가/수정 모달 */}
      <Modal open={modalOpen} onClose={closeModal} title={editingId ? '경쟁사 수정' : '경쟁사 추가'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>회사명 *</label>
              <input className={f.input} placeholder="삼성SDS" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className={f.field}>
              <label className={f.label}>규모</label>
              <input className={f.input} placeholder="대기업 / 중견 / 중소" value={form.size} onChange={e => setForm(p => ({ ...p, size: e.target.value }))} />
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>주력 분야</label>
            <input className={f.input} placeholder="AI, 클라우드, 공공 SI" value={form.mainField} onChange={e => setForm(p => ({ ...p, mainField: e.target.value }))} />
          </div>
          <div className={f.field}>
            <label className={f.label}>자주 맞닥뜨리는 입찰 유형</label>
            <input className={f.input} placeholder="용역, 소프트웨어 개발, 유지보수" value={form.bidTypes} onChange={e => setForm(p => ({ ...p, bidTypes: e.target.value }))} />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label} style={{ color: 'var(--status-lost)' }}>강점 (위협 요인)</label>
              <textarea className={f.textarea} rows={3} placeholder="브랜드 인지도, 낮은 단가, 레퍼런스 다수" value={form.strengths} onChange={e => setForm(p => ({ ...p, strengths: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label} style={{ color: 'var(--status-won)' }}>약점 (우리 기회)</label>
              <textarea className={f.textarea} rows={3} placeholder="유연성 부족, 커스터마이징 어려움" value={form.weaknesses} onChange={e => setForm(p => ({ ...p, weaknesses: e.target.value }))} />
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>메모</label>
            <textarea className={f.textarea} rows={2} placeholder="추가 정보, 주요 담당자 등" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={closeModal}>취소</button>
            <button className={f.btnPrimary} onClick={handleSave}>{editingId ? '저장' : '추가'}</button>
          </div>
        </div>
      </Modal>

      {/* 입찰 이력 추가 모달 */}
      <Modal open={bidModalOpen} onClose={closeBidModal} title="입찰 이력 추가">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.field}>
            <label className={f.label}>기존 입찰에서 연결 (선택)</label>
            <select className={f.select} value={bidLinkId} onChange={e => handleBidLink(e.target.value)}>
              <option value="">직접 입력</option>
              {bids.map(b => <option key={b.id} value={b.id}>{b.title} ({b.agency})</option>)}
            </select>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>입찰명 *</label>
              <input className={f.input} placeholder="AI 민원처리 시스템 구축" value={bidForm.bidTitle} onChange={e => setBidForm(p => ({ ...p, bidTitle: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>발주처</label>
              <input className={f.input} placeholder="행정안전부" value={bidForm.bidAgency} onChange={e => setBidForm(p => ({ ...p, bidAgency: e.target.value }))} />
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>입찰일</label>
              <input className={f.input} type="date" value={bidForm.bidDate} onChange={e => setBidForm(p => ({ ...p, bidDate: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>결과</label>
              <select className={f.select} value={bidForm.result} onChange={e => setBidForm(p => ({ ...p, result: e.target.value as CompetitorBidResult | '' }))}>
                <option value="">미정</option>
                <option value="won_us">우리 수주</option>
                <option value="won_them">경쟁사 수주</option>
                <option value="other">기타</option>
              </select>
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>메모</label>
            <input className={f.input} placeholder="가격 차이, 기술점수 등" value={bidForm.memo} onChange={e => setBidForm(p => ({ ...p, memo: e.target.value }))} />
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={closeBidModal}>취소</button>
            <button className={f.btnPrimary} onClick={handleBidSave}>추가</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
