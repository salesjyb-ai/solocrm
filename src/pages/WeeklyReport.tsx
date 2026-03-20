import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import type { WeeklyActivityType } from '../types';
import f from './FormField.module.css';
import styles from './WeeklyReport.module.css';

const TYPE_LABEL: Record<WeeklyActivityType, string> = {
  call: '전화', meeting: '대면미팅', email: '이메일', proposal: '제안서', new_contact: '신규컨택',
};
const TYPE_COLOR: Record<WeeklyActivityType, string> = {
  call: 'var(--status-contact)', meeting: 'var(--accent)', email: 'var(--status-proposal)',
  proposal: 'var(--accent2)', new_contact: 'var(--status-new)',
};

function getKSTToday() {
  return new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function getWeekRange(offset: number): { start: string; end: string; label: string } {
  const today = new Date(getKSTToday() + 'T00:00:00');
  const dow = (today.getDay() + 6) % 7; // 0=Mon
  const mon = new Date(today.getTime() - dow * 86400000 + offset * 7 * 86400000);
  const sun = new Date(mon.getTime() + 6 * 86400000);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const year = mon.getFullYear();
  const weekNo = Math.ceil(((mon.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
  return { start: fmt(mon), end: fmt(sun), label: `${year}년 ${weekNo}주차 (${mon.getMonth()+1}/${mon.getDate()} ~ ${sun.getMonth()+1}/${sun.getDate()})` };
}

function getDaysOfWeek(start: string) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export default function WeeklyReport() {
  const { weeklyActivities, addWeeklyActivity, deleteWeeklyActivity } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ activityDate: getKSTToday(), type: 'call' as WeeklyActivityType, count: '1', note: '' });

  const week = getWeekRange(weekOffset);
  const days = getDaysOfWeek(week.start);
  const DAY_LABEL = ['월', '화', '수', '목', '금'];

  const weekData = useMemo(() =>
    weeklyActivities.filter(a => a.activityDate >= week.start && a.activityDate <= week.end),
    [weeklyActivities, week.start, week.end]
  );

  const totalByType = useMemo(() => {
    const totals: Record<WeeklyActivityType, number> = { call: 0, meeting: 0, email: 0, proposal: 0, new_contact: 0 };
    weekData.forEach(a => { totals[a.type] = (totals[a.type] || 0) + a.count; });
    return totals;
  }, [weekData]);

  const totalByDay = useMemo(() => {
    const t: Record<string, number> = {};
    weekData.forEach(a => { t[a.activityDate] = (t[a.activityDate] || 0) + a.count; });
    return t;
  }, [weekData]);

  const maxDay = Math.max(...days.map(d => totalByDay[d] || 0), 1);

  const handleSave = async () => {
    if (!form.count || Number(form.count) < 1) return;
    await addWeeklyActivity({ activityDate: form.activityDate, type: form.type, count: Number(form.count), note: form.note || undefined });
    setModalOpen(false);
    setForm({ activityDate: getKSTToday(), type: 'call', count: '1', note: '' });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>주간 영업 활동 리포트</h1>
          <p className={styles.subtitle}>{week.label}</p>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.navBtn} onClick={() => setWeekOffset(p => p - 1)}><ChevronLeft size={15} /></button>
          <button className={styles.navBtn} onClick={() => setWeekOffset(0)} disabled={weekOffset === 0} style={{ fontSize: 11 }}>이번 주</button>
          <button className={styles.navBtn} onClick={() => setWeekOffset(p => p + 1)} disabled={weekOffset >= 0}><ChevronRight size={15} /></button>
          <button className={styles.addBtn} onClick={() => setModalOpen(true)}><Plus size={14} /> 활동 입력</button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className={styles.kpiRow}>
        {(Object.keys(TYPE_LABEL) as WeeklyActivityType[]).map(t => (
          <div key={t} className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{TYPE_LABEL[t]}</span>
            <span className={styles.kpiNum} style={{ color: TYPE_COLOR[t] }}>{totalByType[t]}</span>
          </div>
        ))}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>총 활동</span>
          <span className={styles.kpiNum}>{Object.values(totalByType).reduce((a, b) => a + b, 0)}</span>
        </div>
      </div>

      {/* 일별 막대 차트 */}
      <div className={styles.chartCard}>
        <p className={styles.chartTitle}>일별 활동 현황</p>
        <div className={styles.chartBars}>
          {days.map((day, i) => {
            const total = totalByDay[day] || 0;
            const pct = maxDay > 0 ? (total / maxDay) * 100 : 0;
            const isToday = day === getKSTToday();
            return (
              <div key={day} className={styles.barGroup}>
                <span className={styles.barNum} style={{ opacity: total > 0 ? 1 : 0 }}>{total}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ height: `${Math.max(pct, total > 0 ? 8 : 0)}%`, background: isToday ? 'var(--accent)' : 'var(--status-contact)', opacity: isToday ? 1 : 0.6 }} />
                </div>
                <span className={`${styles.barDay} ${isToday ? styles.barDayToday : ''}`}>{DAY_LABEL[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 활동 목록 */}
      <div className={styles.activityList}>
        <p className={styles.listTitle}>이번 주 활동 기록</p>
        {weekData.length === 0 && <div className={styles.empty}>이번 주 활동 기록이 없습니다.</div>}
        {[...weekData].sort((a, b) => b.activityDate.localeCompare(a.activityDate)).map(act => (
          <div key={act.id} className={styles.actItem}>
            <span className={styles.actDot} style={{ background: TYPE_COLOR[act.type] }} />
            <span className={styles.actType} style={{ color: TYPE_COLOR[act.type] }}>{TYPE_LABEL[act.type]}</span>
            <span className={styles.actCount}>{act.count}건</span>
            <span className={styles.actDate}>{act.activityDate}</span>
            {act.note && <span className={styles.actNote}>{act.note}</span>}
            <button className={styles.actDelete} onClick={() => { if (confirm('삭제할까요?')) deleteWeeklyActivity(act.id); }}>×</button>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setForm({ activityDate: getKSTToday(), type: 'call', count: '1', note: '' }); }} title="활동 입력">
        <div className={f.form}>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>날짜</label>
              <input className={f.input} type="date" value={form.activityDate} onChange={e => setForm(p => ({ ...p, activityDate: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>유형</label>
              <select className={f.select} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as WeeklyActivityType }))}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>건수</label>
            <input className={f.input} type="number" min="1" value={form.count} onChange={e => setForm(p => ({ ...p, count: e.target.value }))} />
          </div>
          <div className={f.field}>
            <label className={f.label}>메모 (선택)</label>
            <input className={f.input} placeholder="주요 내용..." value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => { setModalOpen(false); setForm({ activityDate: getKSTToday(), type: 'call', count: '1', note: '' }); }}>취소</button>
            <button className={f.btnPrimary} onClick={handleSave}>추가</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
