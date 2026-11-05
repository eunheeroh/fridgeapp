# 🥗 냉장고 파먹기 AI (Fridge Recipe AI)

> **"냉장고 사진 한 장으로 재료를 찾고, 나만의 맞춤형 레시피를 추천받으세요!"**  
> OpenRouter API(`google/gemma-4-26b-a4b-it:free` 등)를 활용한 반응형 냉장고 재료 인식 & 레시피 추천 웹 애플리케이션입니다.

---

## 🌟 주요 기능

### 1단계: AI 스마트 재료 인식
- **다양한 업로드**: 모바일 카메라 즉시 촬영, 사진 앨범 선택, 데스크톱 드래그 앤 드롭 지원
- **클라이언트 이미지 압축**: Canvas API 기반 자동 리사이징으로 빠른 전송 속도 보장
- **재료 태그 인터랙션**: 카테고리별 컬러 뱃지, 잘못 인식된 재료 삭제(`×`), 누락된 재료 직접 추가

### 2단계: 맞춤형 레시피 생성 & 인터랙티브 조리 뷰
- **조리 조건 필터**: 기본 양념 보유 여부, 소요 시간(15분/30분/1시간), 난이도, 요리 종류, 식사 인원 선택
- **2~3가지 요리 추천**: 보유한 재료를 우선 활용한 현실적인 요리법 제안
- **조리 모드(Cooking Mode)**: 단계별 완료 체크리스트 & Web Audio API 기반 카운트다운 조리 타이머

### 3단계: 나만의 레시피 북 & 사용자 프로필
- **식습관 & 알레르기 프로필**: 알레르기 및 기피 재료 등록 시 레시피 생성에서 100% 자동 제외
- **영구 보관(LocalStorage)**: 마음에 드는 요리 저장, 별점(1~5점) 및 나만의 조리 메모 기록
- **공유 & 백업**: Web Share API 네이티브 공유, 클립보드 복사, JSON 파일 백업

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS, 프레임워크 없는 순수 웹)
- **Backend / Serverless**: Vercel Serverless Functions (`api/*.js`, Node.js 런타임)
- **AI Model**: OpenRouter API (`google/gemma-4-26b-a4b-it:free` 및 비전 모델 자동 폴백)

---

## 🚀 로컬 실행 방법

1. **저장소 복제**:
   ```bash
   git clone https://github.com/사용자아이디/저장소이름.git
   cd app_fridge
   ```

2. **의존성 설치**:
   ```bash
   npm install
   ```

3. **환경 변수 설정**:
   프로젝트 루트에 `.env.local` 파일을 생성하고 OpenRouter API 키를 입력합니다:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
   ```

4. **로컬 서버 실행**:
   ```bash
   npm run dev
   ```
   브라우저에서 `http://localhost:3000`으로 접속합니다.

