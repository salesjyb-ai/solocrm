import { useState } from 'react';
import { Plus, Search, Trash2, Edit2, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { Bid, BidStatus } from '../types';
import f from './FormField.module.css';
import styles from './Bids.module.css';

const STATUS_LABEL: Record<BidStatus, string> = { preparing: '준비중', active: '진행중', won: '낙찰', lost: '탈락' };
const STATUS_COLOR: Record<BidStatus, string> = {
  preparing: 'var(--text-muted)',
  active: 'var(--status-contact)',
  won: 'var(--status-won)',
  lost: 'var(--status-lost)',
};
const STATUS_BG: Record<BidStatus, string> = {
  preparing: 'var(--bg-secondary)',
  active: 'var(--status-contact-bg)',
  won: 'var(--status-won-bg)',
  lost: 'var(--status-lost-bg)',
};

function getDday(deadline?: string): { label: string; urgent: boolean } {
  if (!deadline) return { label: '-', urgent: false };
  const today = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
  const diff = Math.ceil((new Date(deadline + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);
  if (diff < 0) return { label: '종료', urgent: false };
  if (diff === 0) return { label: 'D-day', urgent: true };
  return { label: `D-${diff}`, urgent: diff <= 7 };
}

interface NaraItem { bidNo: string; title: string; agency: string; deadline: string; amount: number | null; stage?: string; bizType?: string; }

export default function Bids() {
  const { bids, addBid, updateBid, deleteBid } = useApp();
  const [filterStatus, setFilterStatus] = useState<BidStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<NaraItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchStats, setSearchStats] = useState<{ bidCount: number; preCount: number } | null>(null);
  const INIT_FORM = { title: '', agency: '', deadline: '', amount: '', status: 'preparing' as BidStatus, memo: '', bidNo: '' };
  const [form, setForm] = useState(INIT_FORM);

  const filtered = bids.filter(b => filterStatus === 'all' || b.status === filterStatus);
  const counts = { all: bids.length, preparing: 0, active: 0, won: 0, lost: 0 };
  bids.forEach(b => counts[b.status]++);

  const openAdd = () => { setEditingBid(null); setForm(INIT_FORM); setModalOpen(true); };
  const openEdit = (bid: Bid) => {
    setEditingBid(bid);
    setForm({ title: bid.title, agency: bid.agency, deadline: bid.deadline || '', amount: bid.amount ? String(bid.amount) : '', status: bid.status, memo: bid.memo || '', bidNo: bid.bidNo || '' });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingBid(null); setForm(INIT_FORM); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.agency.trim()) return;
    const payload = { title: form.title, agency: form.agency, deadline: form.deadline || undefined, amount: form.amount ? Number(form.amount.replace(/,/g, '')) : undefined, status: form.status, memo: form.memo || undefined, bidNo: form.bidNo || undefined };
    if (editingBid) await updateBid(editingBid.id, payload);
    else await addBid(payload);
    closeModal();
  };

  const handleNaraSearch = async () => {
    if (!searchKeyword.trim()) return;
    setSearching(true); setSearchError(''); setSearchResults([]);
    try {
      const res = await fetch(`https://cozpygdrzzdwuupbahei.supabase.co/functions/v1/narajangteo-proxy?keyword=${encodeURIComponent(searchKeyword)}`, {
        headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenB5Z2Ryenpkd3V1cGJhaGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDc5MzMsImV4cCI6MjA4ODM4MzkzM30.Pnquf4aBjhEdqS4Qrg0WDyic2tGTVBOc9i3MA7BXovo' },
      });
      const json = await res.json();
      if (json.error) { setSearchError(json.error); return; }
      setSearchResults(json.items || []);
      setSearchStats({ bidCount: json.bidCount || 0, preCount: json.preCount || 0 });
    } catch (e) { setSearchError(String(e)); }
    finally { setSearching(false); }
  };

  const selectNaraItem = (item: NaraItem) => {
    setForm(p => ({ ...p, title: item.title, agency: item.agency, deadline: item.deadline, amount: item.amount ? String(item.amount) : '', bidNo: item.bidNo }));
    setSearchOpen(false); setSearchResults([]); setSearchKeyword('');
    setModalOpen(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>나라장터 입찰 트래커</h1>
          <p className={styles.subtitle}>진행 중 {counts.active}건 · 준비중 {counts.preparing}건</p>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.searchBtn} onClick={() => setSearchOpen(true)}><Search size={14} /> 공고 검색</button>
          <button className={styles.addBtn} onClick={openAdd}><Plus size={14} /> 직접 추가</button>
        </div>
      </div>

      <div className={styles.filters}>
        {(['all', 'preparing', 'active', 'won', 'lost'] as const).map(s => (
          <button key={s} className={`${styles.filter} ${filterStatus === s ? styles.filterActive : ''}`} onClick={() => setFilterStatus(s)}>
            {s === 'all' ? '전체' : STATUS_LABEL[s]} <span className={styles.filterCount}>{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <span>공고명</span><span>발주처</span><span>규모</span><span>마감일</span><span>D-day</span><span>상태</span><span></span>
        </div>
        {filtered.length === 0 && <div className={styles.empty}>등록된 입찰이 없습니다.</div>}
        {filtered.map(bid => {
          const dday = getDday(bid.deadline);
          return (
            <div key={bid.id} className={`${styles.tableRow} ${bid.status === 'lost' ? styles.rowLost : ''}`}>
              <span className={styles.bidTitle} onClick={() => openEdit(bid)}>
                {bid.title}
                {bid.bidNo && <span className={styles.bidNo}>{bid.bidNo}</span>}
              </span>
              <span className={styles.agency}>{bid.agency}</span>
              <span className={styles.amount}>{bid.amount ? `${(bid.amount / 100000000).toFixed(1)}억` : '-'}</span>
              <span className={styles.deadline}>{bid.deadline || '-'}</span>
              <span className={`${styles.dday} ${dday.urgent ? styles.ddayUrgent : ''}`}>{dday.label}</span>
              <span className={styles.statusBadge} style={{ color: STATUS_COLOR[bid.status], background: STATUS_BG[bid.status] }}>{STATUS_LABEL[bid.status]}</span>
              <div className={styles.actions}>
                <button onClick={() => openEdit(bid)}><Edit2 size={12} /></button>
                <button onClick={() => { if (confirm(`"${bid.title}" 입찰을 삭제할까요?`)) deleteBid(bid.id); }}><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={searchOpen} onClose={() => { setSearchOpen(false); setSearchResults([]); setSearchKeyword(''); }} title="나라장터 공고 검색">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className={f.input} placeholder="공고명 검색 (예: AI, 클라우드, 빅데이터)" value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNaraSearch(); }} autoFocus style={{ flex: 1 }} />
            <button className={f.btnPrimary} onClick={handleNaraSearch} style={{ whiteSpace: 'nowrap' }} disabled={searching}>
              {searching ? '검색 중...' : '검색'}
            </button>
          </div>
          {/* 나라장터 바로가기 */}
          <a
            href={searchKeyword.trim()
              ? `https://www.g2b.go.kr/pt/menu/selectSubFrame.do?framesrc=/pt/menu/frameBidNoticeList.do?bidNtceNm=${encodeURIComponent(searchKeyword.trim())}`
              : 'https://www.g2b.go.kr/pt/menu/selectSubFrame.do?framesrc=/pt/menu/frameBidNoticeList.do'
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--accent)',
              padding: '7px 12px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <ExternalLink size={13} />
            {searchKeyword.trim()
              ? `나라장터에서 "${searchKeyword.trim()}" 직접 검색하기`
              : '나라장터 입찰공고 바로가기'
            }
          </a>
          {searchError && (
            <div style={{ fontSize: 12, color: 'var(--status-lost)', padding: '8px 12px', background: 'var(--status-lost-bg)', borderRadius: 'var(--radius-sm)' }}>
              {searchError.includes('API key') ? '나라장터 API 키가 설정되지 않았습니다.' : searchError}
            </div>
          )}
          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {searchStats && (
                <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text-secondary)', paddingBottom: 4 }}>
                  <span>총 {searchResults.length}건</span>
                  {searchStats.preCount > 0 && <span>· 사전규격 {searchStats.preCount}건</span>}
                  {searchStats.bidCount > 0 && <span>· 입찰공고 {searchStats.bidCount}건</span>}
                </div>
              )}
              {searchResults.map(item => (
                <div key={item.bidNo || item.title} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--border)' }}
                  onClick={() => selectNaraItem(item)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {item.stage && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                        background: item.stage === '사전규격' ? 'var(--status-preparing-bg)' : 'var(--status-active-bg)',
                        color: item.stage === '사전규격' ? 'var(--status-preparing)' : 'var(--status-active)',
                      }}>{item.stage}</span>
                    )}
                    {item.bizType && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.bizType}</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>{item.agency}</span>
                    {item.deadline && <span>{item.stage === '사전규격' ? '의견마감' : '입찰마감'} {item.deadline}</span>}
                    {item.amount && <span>{(item.amount / 100000000).toFixed(1)}억</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>클릭하면 자동 입력됩니다 <ExternalLink size={10} style={{ verticalAlign: 'middle' }} /></div>
                </div>
              ))}
            </div>
          )}
          {searchResults.length === 0 && !searching && !searchError && searchKeyword && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>검색 결과가 없습니다.</div>
          )}
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={closeModal} title={editingBid ? '입찰 수정' : '입찰 추가'}>
        <div className={f.form}>
          <div className={f.field}>
            <label className={f.label}>공고명 *</label>
            <input className={f.input} placeholder="AI 기반 업무시스템 구축 용역" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>발주처 *</label>
              <input className={f.input} placeholder="한국수력원자력" value={form.agency} onChange={e => setForm(p => ({ ...p, agency: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>입찰번호</label>
              <input className={f.input} placeholder="나라장터 공고번호" value={form.bidNo} onChange={e => setForm(p => ({ ...p, bidNo: e.target.value }))} />
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>규모 (원)</label>
              <input className={f.input} type="text" inputMode="numeric" placeholder="830,000,000"
                value={form.amount ? Number(form.amount.replace(/,/g,'')).toLocaleString('ko-KR') : ''}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value.replace(/,/g,'').replace(/[^0-9]/g,'') }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>마감일</label>
              <input className={f.input} type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>상태</label>
            <select className={f.select} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as BidStatus }))}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className={f.field}>
            <label className={f.label}>메모</label>
            <textarea className={f.textarea} rows={3} placeholder="전략, 경쟁사 정보 등..." value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} />
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={closeModal}>취소</button>
            <button className={f.btnPrimary} onClick={handleSave}>{editingBid ? '저장' : '추가'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
