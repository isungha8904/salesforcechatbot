# ☁️ Salesforce 길잡이 — 입문자 가이드 챗봇

Salesforce 생태계에 **처음 진입하는 입문자**(어드민 · 개발자 · 컨설턴트 · 슈퍼유저)를 위한
AI 챗봇입니다. xAI **Grok API**로 답변을 생성하고, HTML 프론트엔드로 동작하며,
**Vercel**로 배포합니다.

- 🎨 Salesforce 느낌의 UI (Salesforce 블루 `#00A1E0`)
- 💬 우측 하단의 작은 채팅 버블 → 클릭하면 부드럽게 펼쳐지는 위젯
- 🇰🇷 한국어 중심 (질문이 영어면 영어로 응답)
- 🔐 API 키는 **서버리스 함수**가 보관 — 브라우저에 절대 노출되지 않음

---

## 📁 프로젝트 구조

```
salesforcechatbot/
├── public/
│   └── index.html      # 챗봇 UI (단일 페이지, 순수 HTML/CSS/JS)
├── api/
│   └── chat.js         # Vercel 서버리스 함수: Grok API 프록시
├── vercel.json         # 라우팅 설정
├── package.json        # 메타데이터 (외부 의존성 없음)
├── .env.example        # 환경변수 예시
└── README.md
```

---

## 🔑 필요한 키

xAI **Grok API 키** 1개가 필요합니다.

1. https://console.x.ai 접속 → 로그인
2. **API Keys** 메뉴에서 키 생성 → 키 복사
3. 이 키를 코드에 넣지 말고, 아래 Vercel 환경변수(`XAI_API_KEY`)로 등록합니다.

> 참고: xAI는 사용량 기반(pay-as-you-go) 과금입니다. 콘솔에서 결제(크레딧) 등록이
> 되어 있어야 호출이 동작합니다.

---

## 🚀 Vercel 배포 방법

1. 이 저장소를 GitHub에 푸시합니다.
2. [Vercel](https://vercel.com)에 로그인 → **Add New… → Project** → 이 저장소 **Import**.
3. **Environment Variables**에 다음을 추가합니다.
   - Name: `XAI_API_KEY`
   - Value: *(xAI 콘솔에서 발급한 키)*
4. **Deploy** 클릭. 배포가 끝나면 제공되는 URL에서 챗봇이 동작합니다.

> 환경변수를 나중에 추가/변경했다면 **Redeploy** 해야 적용됩니다.

---

## 💻 로컬에서 실행하기

Vercel CLI로 서버리스 함수까지 함께 실행할 수 있습니다.

```bash
# 1) Vercel CLI 설치 (최초 1회)
npm i -g vercel

# 2) 환경변수 설정 (둘 중 하나)
#    - 프로젝트 루트에 .env 파일 생성 후 XAI_API_KEY=... 작성
#    - 또는 셸에서: export XAI_API_KEY=...

# 3) 로컬 개발 서버 실행 (http://localhost:3000)
vercel dev
```

> 단순히 `public/index.html`만 브라우저로 열면 UI는 보이지만 `/api/chat` 함수가
> 없어 답변이 오지 않습니다. 답변까지 테스트하려면 `vercel dev`로 실행하세요.

---

## ⚙️ 모델 변경

기본 모델은 `grok-3`입니다. `api/chat.js` 상단의 `MODEL` 상수만 바꾸면 됩니다.

```js
const MODEL = "grok-3"; // 예: "grok-3-mini", "grok-4", "grok-2-latest"
```

---

## 🧩 다른 웹페이지에 위젯으로 얹기

`public/index.html`의 `landing` 영역은 데모용입니다. 실제 사이트에 임베드할 때는
채팅 버블/패널 마크업과 `<style>`, `<script>`만 가져다 쓰면 됩니다.
(`/api/chat` 엔드포인트가 같은 도메인에 배포되어 있어야 합니다.)
