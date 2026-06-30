// Vercel 서버리스 함수: Gemini API 프록시
// 브라우저는 GEMINI_API_KEY를 절대 보지 못하며, 이 함수가 대신 Gemini를 호출한다.

// 사용할 Gemini 모델. 변경하고 싶으면 이 값만 바꾸면 된다.
// (예: 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro')
const MODEL = "gemini-2.0-flash";

const GEMINI_ENDPOINT = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "서버에 GEMINI_API_KEY가 설정되어 있지 않습니다. Vercel 환경변수에 키를 등록해 주세요.",
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

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) {
    return res.status(400).json({ error: "messages가 비어 있습니다." });
  }

  // 클라이언트 메시지를 Gemini contents 포맷으로 변환
  // role: 'user' | 'model', parts: [{ text }]
  const contents = messages
    .filter((m) => m && typeof m.text === "string" && m.text.trim() !== "")
    .map((m) => ({
      role: m.role === "model" || m.role === "bot" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

  const payload = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  try {
    const geminiRes = await fetch(GEMINI_ENDPOINT(MODEL, apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const message =
        data?.error?.message || "Gemini API 호출 중 오류가 발생했습니다.";
      return res.status(geminiRes.status).json({ error: message });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("\n") || "";

    if (!reply) {
      // 안전 필터 등으로 응답이 비어 있는 경우
      const blockReason =
        data?.promptFeedback?.blockReason ||
        data?.candidates?.[0]?.finishReason;
      return res.status(200).json({
        reply:
          "죄송해요, 답변을 생성하지 못했습니다." +
          (blockReason ? ` (사유: ${blockReason})` : "") +
          " 질문을 조금 바꿔서 다시 시도해 주세요.",
      });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: "서버에서 Gemini API 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    });
  }
}
