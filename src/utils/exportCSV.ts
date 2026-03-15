import type { Lead, Project, Task } from '../types';

type Row = (string | number)[];

function downloadCSV(filename: string, headers: string[], rows: Row[]) {
  const BOM = '\uFEFF';
  const escape = (cell: string | number) => {
    const str = String(cell ?? '');
    return str.includes(',') || str.includes('\n') || str.includes('"')
      ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const LABEL: Record<string, string> = {
  new: '신규', contacted: '연락완료', proposal: '제안중', won: '수주', lost: '실패',
  todo: '할 일', in_progress: '진행 중', done: '완료',
  low: '낮음', medium: '보통', high: '높음',
  active: '진행중', paused: '일시정지',
};
const l = (v: string) => LABEL[v] || v;
const today = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).toISOString().split('T')[0];

export function exportLeads(leads: Lead[]) {
  downloadCSV(`리드_${today()}.csv`,
    ['이름', '회사', '연락처', '상태', '딜 금액(원)', '다음 액션', '예정일', '생성일'],
    leads.map(x => [x.name, x.company, x.contact||'', l(x.status), x.value, x.nextAction||'', x.nextActionDate||'', x.createdAt])
  );
}

export function exportProjects(projects: Project[]) {
  downloadCSV(`프로젝트_${today()}.csv`,
    ['프로젝트', '프로젝트상태', '이슈', '이슈상태', '우선순위', '마감일'],
    projects.flatMap(p =>
      p.issues.length === 0
        ? [[p.name, l(p.status), '', '', '', '']]
        : p.issues.map(i => [p.name, l(p.status), i.title, l(i.status), l(i.priority), i.dueDate||''])
    )
  );
}

export function exportTasks(tasks: Task[]) {
  downloadCSV(`할일_${today()}.csv`,
    ['할 일', '완료여부', '마감일', '연결유형', '연결대상'],
    tasks.map(t => [t.title, t.done?'완료':'미완료', t.dueDate, t.linkedTo?(t.linkedTo.type==='lead'?'리드':'프로젝트'):'', t.linkedTo?.name||''])
  );
}
