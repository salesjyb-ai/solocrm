import type { Lead, Project, Task } from './types';

export const initialLeads: Lead[] = [
  { id: 'l1', name: '김민준', company: '테크스타트 주식회사', status: 'proposal', value: 12000000, contact: 'minjun@techstart.kr', nextAction: '제안서 최종 검토 미팅', nextActionDate: '2025-07-08', createdAt: '2025-06-10', updatedAt: '2025-07-01' },
  { id: 'l2', name: '이서연', company: '그린에너지코리아', status: 'contacted', value: 8500000, contact: 'seoyeon@greenek.com', nextAction: '니즈 파악 전화', nextActionDate: '2025-07-07', createdAt: '2025-06-15', updatedAt: '2025-06-28' },
  { id: 'l3', name: '박도현', company: '스마트팩토리솔루션', status: 'new', value: 25000000, contact: 'dohyun@sfs.co.kr', nextAction: '첫 미팅 일정 조율', nextActionDate: '2025-07-10', createdAt: '2025-07-01', updatedAt: '2025-07-01' },
  { id: 'l4', name: '최예원', company: '핀테크플랫폼', status: 'won', value: 6000000, contact: 'yewon@fintp.kr', nextAction: '계약서 발송', nextActionDate: '2025-07-05', createdAt: '2025-05-20', updatedAt: '2025-07-02' },
  { id: 'l5', name: '정우진', company: '리테일플러스', status: 'contacted', value: 15000000, contact: 'woojin@retailplus.kr', nextAction: '데모 시연 준비', nextActionDate: '2025-07-09', createdAt: '2025-06-20', updatedAt: '2025-06-30' },
  { id: 'l6', name: '한수민', company: '글로벌트레이딩', status: 'lost', value: 3000000, contact: 'sumin@gt.kr', createdAt: '2025-05-10', updatedAt: '2025-06-15' },
];

export const initialProjects: Project[] = [
  {
    id: 'p1', name: '테크스타트 ERP 도입', color: '#2d6a4f', status: 'active', createdAt: '2025-06-01',
    issues: [
      { id: 'i1', projectId: 'p1', title: '현황 분석 문서 작성', status: 'done', priority: 'high', dueDate: '2025-07-02', createdAt: '2025-06-01' },
      { id: 'i2', projectId: 'p1', title: '기능 요구사항 정의', status: 'in_progress', priority: 'high', dueDate: '2025-07-08', createdAt: '2025-06-05' },
      { id: 'i3', projectId: 'p1', title: '벤더 후보 리스트업', status: 'todo', priority: 'medium', dueDate: '2025-07-15', createdAt: '2025-06-05' },
      { id: 'i4', projectId: 'p1', title: '예산 승인 요청', status: 'todo', priority: 'high', dueDate: '2025-07-12', createdAt: '2025-06-10' },
    ]
  },
  {
    id: 'p2', name: '마케팅 자동화 시스템', color: '#e07a5f', status: 'active', createdAt: '2025-06-10',
    issues: [
      { id: 'i5', projectId: 'p2', title: '랜딩페이지 A/B 테스트 설계', status: 'in_progress', priority: 'medium', dueDate: '2025-07-10', createdAt: '2025-06-10' },
      { id: 'i6', projectId: 'p2', title: '이메일 시퀀스 초안', status: 'todo', priority: 'low', dueDate: '2025-07-20', createdAt: '2025-06-12' },
      { id: 'i7', projectId: 'p2', title: 'CRM 연동 테스트', status: 'todo', priority: 'high', dueDate: '2025-07-14', createdAt: '2025-06-15' },
    ]
  },
  {
    id: 'p3', name: '핀테크플랫폼 컨설팅', color: '#3d405b', status: 'active', createdAt: '2025-07-01',
    issues: [
      { id: 'i8', projectId: 'p3', title: '킥오프 미팅 자료 준비', status: 'done', priority: 'high', dueDate: '2025-07-05', createdAt: '2025-07-01' },
      { id: 'i9', projectId: 'p3', title: '주간 보고서 템플릿 작성', status: 'in_progress', priority: 'medium', dueDate: '2025-07-08', createdAt: '2025-07-01' },
    ]
  },
];

export const initialTasks: Task[] = [
  { id: 't1', title: '이서연 님께 니즈 파악 전화', done: false, dueDate: '2025-07-07', linkedTo: { type: 'lead', id: 'l2', name: '그린에너지코리아' } },
  { id: 't2', title: '기능 요구사항 정의 문서 완료', done: false, dueDate: '2025-07-08', linkedTo: { type: 'project', id: 'p1', name: '테크스타트 ERP 도입' } },
  { id: 't3', title: '박도현 첫 미팅 일정 조율', done: false, dueDate: '2025-07-10', linkedTo: { type: 'lead', id: 'l3', name: '스마트팩토리솔루션' } },
  { id: 't4', title: '제안서 최종 검토 미팅 준비', done: false, dueDate: '2025-07-08', linkedTo: { type: 'lead', id: 'l1', name: '테크스타트 주식회사' } },
  { id: 't5', title: '주간 보고서 템플릿 작성', done: false, dueDate: '2025-07-08', linkedTo: { type: 'project', id: 'p3', name: '핀테크플랫폼 컨설팅' } },
  { id: 't6', title: '정우진 데모 시연 자료 준비', done: true, dueDate: '2025-07-06', linkedTo: { type: 'lead', id: 'l5', name: '리테일플러스' } },
];
