# SoloCRM

혼자 쓰는 영업 CRM + 프로젝트 관리 웹앱

## 로컬 실행
```bash
npm install
npm run dev
```

## GitHub Pages 배포
```bash
# 빌드
npm run build

# dist/ 폴더 내용을 gh-pages 브랜치에 푸시
# 또는 gh-pages 패키지 사용:
npm install -g gh-pages
gh-pages -d dist
```

## 기술 스택
- React + TypeScript + Vite
- HashRouter (GitHub Pages 호환)
- CSS Modules
- 다크/라이트 모드 (localStorage 저장)
- 더미 데이터 (다음 단계: Supabase 연동)
