/**
 * @file api/analyze-image.js
 * @description Vercel 서버리스 함수 - 냉장고 사진을 전달받아 OpenRouter API를 통해 식재료 목록을 인식하고 JSON으로 반환합니다.
 *              - 기본 모델: process.env.OPENROUTER_MODEL (기본값: google/gemma-4-26b-a4b-it:free)
 *              - 업스트림 트래픽 초과(429 Rate Limit) 발생 시 대체 무료 비전 모델로 자동 안전 폴백(Fallback) 지원
 */

module.exports = async function handler(req, res) {
  // CORS 및 응답 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 사전 요청(Preflight) 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 메서드 검증
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '허용되지 않는 요청 메서드입니다. POST 메서드를 사용해주세요.'
    });
  }

  try {
    const { image } = req.body || {};

    // 이미지 데이터 존재 여부 확인 (Base64 Data URL)
    if (!image) {
      return res.status(400).json({
        success: false,
        error: '분석할 이미지 데이터(Base64)가 제공되지 않았습니다.'
      });
    }

    // 환경 변수에서 OpenRouter API 키 및 모델명 로드
    const apiKey = process.env.OPENROUTER_API_KEY;
    const primaryModel = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';
    // 무료 티어 429 대비 대체 비전 모델 목록
    const fallbackModels = [primaryModel, 'nvidia/nemotron-3.5-super-vl:free'];
    // 중복 제거
    const candidateModels = [...new Set(fallbackModels)];

    // API 키 미설정 시 오류 반환
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      return res.status(500).json({
        success: false,
        error: '.env.local 파일에 유효한 OPENROUTER_API_KEY가 설정되어 있지 않습니다.'
      });
    }

    // AI에게 전달할 시스템 프롬프트 (JSON 형식의 재료 목록 강제)
    const systemPrompt = `당신은 냉장고 속 식재료를 정확하게 파악하는 베테랑 요리 전문가 AI입니다.
주어진 냉장고 사진을 자세히 관찰하고, 식별 가능한 모든 식재료를 찾아내어 유효한 JSON 형식으로만 응답해야 합니다.

반드시 아래 JSON 스키마를 엄격하게 지켜주세요:
{
  "ingredients": [
    {
      "name": "재료명(예: 대파, 계란, 두부 등 한국어 명칭)",
      "category": "분류(채소/과일, 육류/가공육, 해산물, 유제품/알류, 소스/양념, 가공식품, 기타 중 택1)",
      "estimated_quantity": "추정 수량(예: 1단, 6알, 1모, 반 병 등 파악 가능한 경우)",
      "confidence": 0.0부터 1.0 사이의 인식 확신도(숫자)
    }
  ],
  "confidence_notes": "인식 상태에 대한 간단한 총평(예: 냉장고 조명이 양호하여 대부분의 채소와 유제품을 인식함)"
}

주의사항:
1. 마크다운 코드블록(\`\`\`json)이나 부가적인 설명 없이 오직 순수한 JSON 문자열만 출력하세요.
2. 식재료가 아닌 물건(밀폐용기 뚜껑, 냉장고 선반 등)은 제외하고 실제 섭취 가능한 재료만 나열하세요.
3. 식재료가 전혀 보이지 않는 경우 ingredients는 빈 배열([])로 반환하세요.`;

    let lastError = null;
    let selectedModel = primaryModel;
    let rawContent = null;

    // 가용 모델 순차 시도 (Rate Limit 발생 시 폴백 모델 전환)
    for (const model of candidateModels) {
      try {
        console.log(`[AI 분석 시도] 모델: ${model}`);
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Fridge Recipe App'
          },
          body: JSON.stringify({
            model: model,
            temperature: 0.2,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: '이 냉장고 사진에서 보이는 모든 식재료를 추출해서 지정된 JSON 형식으로 알려줘.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: image
                    }
                  }
                ]
              }
            ]
          })
        });

        // 429 Rate Limit 또는 업스트림 에러인 경우 다음 후보 모델로 시도
        if (openRouterResponse.status === 429 || openRouterResponse.status >= 500) {
          const errDetail = await openRouterResponse.text();
          console.warn(`[모델 ${model} 일시적 제한] 상태코드: ${openRouterResponse.status}, 상세: ${errDetail}`);
          lastError = `모델(${model}) 일시적 과부하: ${errDetail}`;
          continue;
        }

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          lastError = `OpenRouter API 실패 (${openRouterResponse.status}): ${errorText}`;
          continue;
        }

        const data = await openRouterResponse.json();
        rawContent = data.choices?.[0]?.message?.content;

        if (rawContent) {
          selectedModel = model;
          break; // 성공적으로 응답을 받아왔으므로 루프 탈출
        }
      } catch (reqErr) {
        lastError = reqErr.message;
      }
    }

    if (!rawContent) {
      return res.status(500).json({
        success: false,
        error: `현재 모든 무료 AI 모델이 일시적인 트래픽 초과(Rate Limit) 상태입니다. 잠시 후 다시 시도해주세요. (${lastError})`
      });
    }

    // 마크다운 코드 블록(```json ... ```) 제거 및 순수 JSON 추출
    let cleanedContent = rawContent.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError, '원본 내용:', rawContent);
      return res.status(500).json({
        success: false,
        error: 'AI 응답을 JSON으로 변환하는 중 오류가 발생했습니다.',
        raw: rawContent
      });
    }

    // 성공적으로 파싱된 재료 데이터 반환
    return res.status(200).json({
      success: true,
      modelUsed: selectedModel,
      data: parsedResult
    });

  } catch (err) {
    console.error('서버 내부 오류:', err);
    return res.status(500).json({
      success: false,
      error: `서버 처리 중 오류가 발생했습니다: ${err.message}`
    });
  }
};
