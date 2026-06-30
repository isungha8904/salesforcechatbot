// Vercel 서버리스 함수: Groq API 프록시 (무료)
// 브라우저는 GROQ_API_KEY를 절대 보지 못하며, 이 함수가 대신 Groq을 호출한다.

// 사용할 Groq 모델. 변경하고 싶으면 이 값만 바꾸면 된다.
// (예: 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it')
const MODEL = "llama-3.3-70b-versatile";

// Groq는 OpenAI 호환 엔드포인트를 제공한다.
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// 입문자 가이드 특화 시스템 프롬프트 (한국어 중심)
const SYSTEM_PROMPT = `당신은 'Salesforce 길잡이'라는 이름의 친절한 멘토 챗봇입니다.
대상 사용자는 Salesforce 생태계에 처음 진입하는, 생태계를 전혀 모르는 입문자입니다.
이들은 어드민(Admin), 개발자(Developer), 컨설턴트(Consultant), 슈퍼유저(Super User) 중
하나가 되려는 사람들입니다.

당신의 역할과 답변 원칙:
1. 항상 한국어로, 쉽고 친절하게 설명합니다. (단, 사용자가 영어로 질문하면 영어로 답합니다.)
2. 전문 용어(예: Apex, Flow, SOQL, Sandbox, Trailhead, Org 등)가 처음 등장하면
   괄호나 한 줄로 짧은 정의를 덧붙여 입문자도 이해할 수 있게 합니다.
3. 사용자의 목표 역할(어드민/개발자/컨설턴트/슈퍼유저)에 맞는 학습 경로,
   추천 자격증(예: Salesforce Certified Administrator, Platform Developer I,
   다양한 Consultant 자격증 등), Trailhead 모듈/트레일을 구체적으로 안내합니다.
4. 답변은 단계적으로, 다음에 무엇을 하면 좋을지(Next step)를 함께 제안합니다.
5. 확실하지 않은 정보는 추측하지 말고, 솔직히 모른다고 말한 뒤 공식 문서나
   Trailhead 확인을 권유합니다.
6. 너무 길지 않게, 핵심 위주로 정리하되 필요하면 짧은 목록을 활용합니다.

항상 입문자의 눈높이에서, 격려하는 따뜻한 톤을 유지하세요.`;

export default async function handler(req, res) {
  // 다른 도메인의 HTML 페이지에서 widget.js로 호출할 수 있도록 CORS 허용.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 브라우저 프리플라이트(OPTIONS) 요청 처리.
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "서버에 GROQ_API_KEY가 설정되어 있지 않습니다. Vercel 환경변수에 키를 등록해 주세요.",
    });
  }

  // Vercel은 보통 req.body를 파싱해 주지만, 안전하게 직접 처리한다.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const clientMessages = Array.isArray(body?.messages) ? body.messages : [];
  if (clientMessages.length === 0) {
    return res.status(400).json({ error: "messages가 비어 있습니다." });
  }

  // 클라이언트 메시지를 OpenAI/xAI 포맷으로 변환.
  // 시스템 프롬프트를 맨 앞에 두고, role: 'user' | 'assistant' 로 매핑한다.
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...clientMessages
      .filter((m) => m && typeof m.text === "string" && m.text.trim() !== "")
      .map((m) => ({
        role: m.role === "model" || m.role === "bot" ? "assistant" : "user",
        content: m.text,
      })),
  ];

  const payload = {
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
  };

  try {
    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      const message =
        (typeof data?.error === "string" ? data.error : data?.error?.message) ||
        "Groq API 호출 중 오류가 발생했습니다.";
      return res.status(groqRes.status).json({ error: message });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "";

    if (!reply) {
      const finishReason = data?.choices?.[0]?.finish_reason;
      return res.status(200).json({
        reply:
          "죄송해요, 답변을 생성하지 못했습니다." +
          (finishReason ? ` (사유: ${finishReason})` : "") +
          " 질문을 조금 바꿔서 다시 시도해 주세요.",
      });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: "서버에서 Groq API 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    });
  }
}
