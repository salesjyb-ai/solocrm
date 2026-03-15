import { useState } from 'react';
import { Plus, Search, Trash2, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { LeadStatusBadge, LeadStatusSelect } from '../components/StatusBadge';
import Modal from '../components/Modal';
import type { LeadStatus } from '../types';
import f from './FormField.module.css';
import { exportLeads } from '../utils/exportCSV';
import styles from './Leads.module.css';

const statusOrder: LeadStatus[] = ['new', 'contacted', 'proposal', 'won', 'lost'];
const statusLabel: Record<LeadStatus, string> = { new: '신규', contacted: '연락완료', proposal: '제안중', won: '수주', lost: '실패' };

export default function Leads() {
  const { leads, addLead, updateLeadStatus, deleteLead } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', contact: '', phone: '', value: '', status: 'new' as LeadStatus, nextAction: '', nextActionDate: '' });

  const filtered = leads.filter(l => {
    const matchSearch = l.name.includes(search.trim()) || l.company.includes(search.trim());
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.company.trim()) return;
    await addLead({ name: form.name, company: form.company, contact: form.contact, phone: form.phone, value: Number(form.value) || 0, status: form.status, nextAction: form.nextAction, nextActionDate: form.nextActionDate });
    setModalOpen(false);
    setForm({ name: '', company: '', contact: '', phone: '', value: '', status: 'new', nextAction: '', nextActionDate: '' });
  };

  const stats = statusOrder.map(s => ({ status: s, count: leads.filter(l => l.status === s).length, value: leads.filter(l => l.status === s).reduce((sum, l) => sum + l.value, 0) }));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>리드 & 딜</h1>
          <p className={styles.subtitle}>총 {leads.length}개 리드 · 파이프라인 {leads.filter(l=>l.status!=='won'&&l.status!=='lost').reduce((s,l)=>s+l.value,0).toLocaleString('ko-KR')}원</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className={styles.exportBtn} onClick={() => exportLeads(filtered)}>
            <Download size={14} /> CSV
          </button>
          <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
            <Plus size={14} /> 새 리드
          </button>
        </div>
      </div>

      {/* Funnel stats */}
      <div className={styles.funnelRow}>
        {stats.map(s => (
          <button key={s.status} className={`${styles.funnelItem} ${filterStatus === s.status ? styles.funnelActive : ''}`} onClick={() => setFilterStatus(filterStatus === s.status ? 'all' : s.status)}>
            <LeadStatusBadge status={s.status} />
            <span className={styles.funnelCount}>{s.count}건</span>
            <span className={styles.funnelValue}>{s.value > 0 ? `${(s.value/10000).toLocaleString()}만` : '-'}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input className={styles.search} placeholder="이름, 회사명 검색..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>이름 / 회사</th>
              <th>상태</th>
              <th>딜 금액</th>
              <th>다음 액션</th>
              <th>날짜</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className={styles.empty}>검색 결과가 없습니다</td></tr>
            )}
            {filtered.map(lead => (
              <tr key={lead.id} className={styles.row}>
                <td>
                  <div className={styles.nameCell} onClick={() => navigate(`/leads/${lead.id}`)} style={{cursor:"pointer"}}>
                    <div className={styles.avatar}>{lead.company[0]}</div>
                    <div>
                      <div className={styles.name}>{lead.name}</div>
                      <div className={styles.company}>{lead.company}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <LeadStatusSelect value={lead.status} onChange={s => updateLeadStatus(lead.id, s, lead.status)} />
                </td>
                <td className={styles.valueCell}>{lead.value.toLocaleString('ko-KR')}원</td>
                <td className={styles.actionCell}>{lead.nextAction || <span className={styles.na}>-</span>}</td>
                <td className={styles.dateCell}>{lead.nextActionDate || <span className={styles.na}>-</span>}</td>
                <td>
                  <button className={styles.deleteBtn} onClick={() => deleteLead(lead.id)} title="삭제">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setForm({ name: '', company: '', contact: '', phone: '', value: '', status: 'new', nextAction: '', nextActionDate: '' }); }} title="새 리드 추가">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>담당자 이름 *</label>
              <input className={f.input} placeholder="김민준" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>회사명 *</label>
              <input className={f.input} placeholder="테크스타트 주식회사" value={form.company} onChange={e => setForm(p => ({...p, company: e.target.value}))} />
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>이메일</label>
              <input className={f.input} placeholder="example@company.kr" value={form.contact} onChange={e => setForm(p => ({...p, contact: e.target.value}))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>휴대폰 번호</label>
              <input className={f.input} type="tel" placeholder="010-0000-0000" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>딜 금액 (원)</label>
              <input
                className={f.input}
                type="text"
                inputMode="numeric"
                placeholder="5,000,000"
                value={form.value ? Number(form.value.replace(/,/g, '')).toLocaleString('ko-KR') : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                  setForm(p => ({...p, value: raw}));
                }}
              />
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>상태</label>
            <select className={f.select} value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value as LeadStatus}))}>
              {statusOrder.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </select>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>다음 액션</label>
              <input className={f.input} placeholder="제안서 발송" value={form.nextAction} onChange={e => setForm(p => ({...p, nextAction: e.target.value}))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>예정일</label>
              <input className={f.input} type="date" value={form.nextActionDate} onChange={e => setForm(p => ({...p, nextActionDate: e.target.value}))} />
            </div>
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => { setModalOpen(false); setForm({ name: '', company: '', contact: '', phone: '', value: '', status: 'new', nextAction: '', nextActionDate: '' }); }}>취소</button>
            <button className={f.btnPrimary} onClick={handleSubmit}>추가</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
