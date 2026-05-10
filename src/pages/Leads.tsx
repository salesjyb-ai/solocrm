import { useState } from 'react';
import { Plus, Search, Trash2, Download, GripVertical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

import Modal from '../components/Modal';
import type { LeadStatus } from '../types';
import f from './FormField.module.css';
import { exportLeads } from '../utils/exportCSV';
import styles from './Leads.module.css';

const statusOrder: LeadStatus[] = ['new', 'contacted', 'proposal', 'won', 'lost'];
const statusLabel: Record<LeadStatus, string> = { new: '신규', contacted: '연락완료', proposal: '제안중', won: '수주', lost: '실패' };
const statusColor: Record<LeadStatus, string> = { new: 'var(--text-muted)', contacted: 'var(--status-contact)', proposal: '#f59e0b', won: 'var(--status-won)', lost: 'var(--status-lost)' };

export default function Leads() {
  const { leads, addLead, updateLeadStatus, deleteLead } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);
  const [form, setForm] = useState({ name: '', company: '', dealName: '', contact: '', phone: '', value: '', status: 'new' as LeadStatus, nextAction: '', nextActionDate: '' });

  const filtered = leads.filter(l => {
    const q = search.trim();
    return !q || l.name.includes(q) || l.company.includes(q) || (l.dealName || '').includes(q);
  });

  const grouped = statusOrder.reduce((acc, s) => {
    acc[s] = filtered.filter(l => l.status === s);
    return acc;
  }, {} as Record<LeadStatus, typeof leads>);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.company.trim()) return;
    await addLead({ name: form.name, company: form.company, dealName: form.dealName, contact: form.contact, phone: form.phone, value: Number(form.value.replace(/,/g,'')) || 0, status: form.status, nextAction: form.nextAction, nextActionDate: form.nextActionDate, attachments: [] });
    setModalOpen(false);
    setForm({ name: '', company: '', dealName: '', contact: '', phone: '', value: '', status: 'new', nextAction: '', nextActionDate: '' });
  };

  const handleDrop = (toStatus: LeadStatus) => {
    if (dragId) {
      const lead = leads.find(l => l.id === dragId);
      if (lead && lead.status !== toStatus) updateLeadStatus(dragId, toStatus, lead.status);
    }
    setDragId(null);
    setDragOver(null);
  };

  const totalPipeline = leads.filter(l => l.status !== 'won' && l.status !== 'lost').reduce((s, l) => s + l.value, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>리드 & 딜</h1>
          <p className={styles.subtitle}>총 {leads.length}개 · 파이프라인 {totalPipeline.toLocaleString('ko-KR')}원</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.exportBtn} onClick={() => exportLeads(filtered)}><Download size={14} /> CSV</button>
          <button className={styles.addBtn} onClick={() => setModalOpen(true)}><Plus size={14} /> 새 리드</button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input className={styles.search} placeholder="사업명, 이름, 회사명 검색..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* 칸반 뷰 */}
      <div className={styles.kanbanBoard}>
        {statusOrder.map(status => {
          const items = grouped[status];
          const colValue = items.reduce((s, l) => s + l.value, 0);
          const isDragTarget = dragOver === status;
          return (
            <div key={status}
              className={`${styles.kanbanCol} ${isDragTarget ? styles.kanbanDragOver : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(status); }}
              onDrop={() => handleDrop(status)}
              onDragLeave={() => setDragOver(null)}
            >
              <div className={styles.kanbanColHeader} style={{ borderTopColor: statusColor[status] }}>
                <span className={styles.kanbanColTitle} style={{ color: statusColor[status] }}>{statusLabel[status]}</span>
                <span className={styles.kanbanColCount}>{items.length}</span>
                {colValue > 0 && <span className={styles.kanbanColValue}>{(colValue / 10000).toFixed(0)}만</span>}
              </div>
              <div className={styles.kanbanCards}>
                {items.length === 0 && (
                  <div className={styles.kanbanEmpty}>
                    {isDragTarget ? '여기에 드롭' : '없음'}
                  </div>
                )}
                {items.map(lead => (
                  <div key={lead.id}
                    className={styles.kanbanCard}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                    style={{ opacity: dragId === lead.id ? 0.5 : 1 }}
                  >
                    <div className={styles.kanbanCardTop}>
                      <GripVertical size={13} className={styles.kanbanGrip} />
                      <div className={styles.kanbanCardBody} onClick={() => navigate(`/leads/${lead.id}`)}>
                        <div className={styles.kanbanCardName}>{lead.dealName || lead.company}</div>
                        <div className={styles.kanbanCardSub}>{lead.company} · {lead.name}</div>
                      </div>
                      <button className={styles.kanbanDeleteBtn} onClick={() => { if (confirm(`"${lead.name}" 리드를 삭제할까요?`)) deleteLead(lead.id); }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {lead.value > 0 && (
                      <div className={styles.kanbanCardValue} style={{ color: statusColor[status] }}>
                        {lead.value.toLocaleString('ko-KR')}원
                      </div>
                    )}
                    {lead.nextAction && (
                      <div className={styles.kanbanCardAction}>→ {lead.nextAction}{lead.nextActionDate && ` (${lead.nextActionDate})`}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setForm({ name: '', company: '', dealName: '', contact: '', phone: '', value: '', status: 'new', nextAction: '', nextActionDate: '' }); }} title="새 리드 추가">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>담당자 이름 *</label>
              <input className={f.input} placeholder="김민준" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className={f.field}>
              <label className={f.label}>회사명 *</label>
              <input className={f.input} placeholder="테크스타트 주식회사" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>사업명</label>
            <input className={f.input} placeholder="AI 기반 민원처리 자동화 시스템 구축" value={form.dealName} onChange={e => setForm(p => ({ ...p, dealName: e.target.value }))} />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>이메일</label>
              <input className={f.input} placeholder="example@company.kr" value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>휴대폰 번호</label>
              <input className={f.input} type="tel" placeholder="010-0000-0000" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>딜 금액 (원)</label>
              <input className={f.input} type="text" inputMode="numeric" placeholder="5,000,000"
                value={form.value ? Number(form.value.replace(/,/g, '')).toLocaleString('ko-KR') : ''}
                onChange={e => setForm(p => ({ ...p, value: e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '') }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>상태</label>
              <select className={f.select} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as LeadStatus }))}>
                {statusOrder.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
              </select>
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>다음 액션</label>
              <input className={f.input} placeholder="제안서 발송" value={form.nextAction} onChange={e => setForm(p => ({ ...p, nextAction: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>예정일</label>
              <input className={f.input} type="date" value={form.nextActionDate} onChange={e => setForm(p => ({ ...p, nextActionDate: e.target.value }))} />
            </div>
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => { setModalOpen(false); setForm({ name: '', company: '', dealName: '', contact: '', phone: '', value: '', status: 'new', nextAction: '', nextActionDate: '' }); }}>취소</button>
            <button className={f.btnPrimary} onClick={handleSubmit}>추가</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
