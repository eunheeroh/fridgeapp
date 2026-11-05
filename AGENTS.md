# AGENTS.md - 프로젝트 개발 및 에이전트 행동 지침

이 문서는 OpenRouter API 기반의 **냉장고 재료 인식 및 레시피 추천 웹앱** 프로젝트를 개발하고 유지보수할 때 AI 에이전트가 반드시 준수해야 하는 핵심 규칙과 가이드라인을 정의합니다.

---

## 📌 핵심 원칙 및 제약 사항 (Core Rules)

### 1. 기술 스택 및 구조
- **프론트엔드**: 순수 **HTML/CSS/JS** (`index.html`, `style.css`, `script.js`) 만 사용합니다.
- **백엔드**: **Vercel 서버리스 함수** (`api/*.js`, Node.js 런타임)를 사용합니다.
- **금지 사항**: React, Vue, Next.js, Vite, Webpack, Tailwind CLI 등 어떠한 프레임워크나 복잡한 번들러/빌드 도구도 사용하지 않습니다. (Vanilla JS 지향)

### 2. OpenRouter API 통신 규칙
- **호출 위치**: 클라이언트(`script.js`)에서 OpenRouter API를 직접 호출하는 것은 절대 금지하며, 반드시 `api/` 폴더 안의 Vercel 서버리스 함수를 통해서만 호출합니다.
- **환경 변수**:
  - API 키: `process.env.OPENROUTER_API_KEY`
  - 모델명: `process.env.OPENROUTER_MODEL` (기본값: `google/gemma-4-26b-a4b-it:free`)
- **보안**: API 키가 클라이언트에 노출되지 않도록 서버리스 함수 내부에서만 사용합니다.

### 3. 작업 단위 및 검증 안내 (Step-by-step Development)
- **점진적 개발**: 한 번에 여러 기능을 몰아서 구현하지 않고, **한 번에 한 가지 기능만 구현**합니다.
- **검증 가이드 필수**: 구현이 완료될 때마다 사용자가 브라우저나 터미널에서 어떻게 확인하고 테스트할 수 있는지 구체적인 확인 절차를 안내합니다.

### 4. 코드 주석 규칙
- 작성되는 **모든 코드(HTML, CSS, JS, API 함수)에는 명확하고 친절한 한국어 주석**을 작성합니다.
- 코드의 목적, 함수의 파라미터 및 반환값, 비즈니스 로직의 의도를 상세히 설명합니다.

### 5. 환경 설정 및 버전 관리
- 민감한 키값은 `.env.local`에 저장합니다.
- `.env.local`, `.vercel`, `node_modules` 등 민감 정보 및 임시 파일은 반드시 `.gitignore`에 등록하여 버전 관리에서 제외합니다.

### 6. 터미널 명령 직접 실행 및 결과 보고
- 개발 및 테스트에 필요한 터미널 명령(예: 의존성 설치, 로컬 서버 실행 등)은 에이전트가 직접 실행하고, 그 실행 결과와 상태를 사용자에게 명확히 설명합니다.

---

## 🗂️ 프로젝트 권장 디렉토리 구조

```text
app_fridge/
├── PRD_step1.md          # 1단계 요구사항 명세서 (이미지 인식)
├── PRD_step2.md          # 2단계 요구사항 명세서 (레시피 생성)
├── PRD_step3.md          # 3단계 요구사항 명세서 (프로필 & 저장)
├── AGENTS.md             # 에이전트 개발 규칙 (본 파일)
├── .env.local            # 로컬 환경 변수 (OPENROUTER_API_KEY 등)
├── .gitignore            # Git 제외 목록
├── package.json          # 프로젝트 메타데이터 및 Vercel dev 스크립트
├── index.html            # 반응형 메인 UI (Vanilla HTML)
├── style.css             # 스타일시트 (순수 CSS, 모바일 우선 반응형)
├── script.js             # 클라이언트 상호작용 및 API 연동 로직
└── api/                  # Vercel 서버리스 함수
    ├── analyze-image.js  # 1단계: 이미지 분석 및 재료 추출 API
    └── generate-recipe.js# 2단계: 재료 기반 레시피 생성 API
```

---

## 📋 단계별 개발 로드맵 (PRD 기준)

### 1단계: 이미지 업로드 및 재료 인식 ([PRD_step1.md](file:///PRD_step1.md))
- [ ] 반응형 이미지 업로드 UI 구축 (카메라 촬영 / 파일 선택 / 드래그 앤 드롭).
- [ ] 클라이언트 이미지 리사이징/압축 로직 구현.
- [ ] `api/analyze-image.js` 서버리스 함수 작성 (`google/gemma-4-26b-a4b-it:free` 연동).
- [ ] 재료 태그 리스트 렌더링 및 추가/수정/삭제 UI 완성.

### 2단계: AI 맞춤형 레시피 생성 ([PRD_step2.md](file:///PRD_step2.md))
- [ ] 조리 옵션 필터 UI (조미료 보유 여부, 소요 시간, 난이도 등).
- [ ] `api/generate-recipe.js` 서버리스 함수 작성 (레시피 생성 프롬프트 및 JSON 스키마).
- [ ] 레시피 카드 및 인터랙티브 상세 조리 뷰 (단계별 체크리스트, 타이머) 구현.

### 3단계: 사용자 프로필 및 레시피 저장소 ([PRD_step3.md](file:///PRD_step3.md))
- [ ] 사용자 프로필 관리 UI (알레르기, 기피 재료, 선호 매운맛 등 설정).
- [ ] 2단계 레시피 생성 시 프로필 제약 조건 연계.
- [ ] LocalStorage / IndexedDB 기반 '나만의 레시피 북' 저장/조회/삭제 및 메모/별점 기능.
- [ ] Web Share API 및 인쇄/클립보드 공유 기능 구현.

