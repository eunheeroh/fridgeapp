/**
 * @file api/generate-recipe.js
 * @description Vercel 서버리스 함수 - 1단계에서 추출된 식재료 및 2~3단계 사용자 조리 옵션/프로필(알레르기, 기피 재료, 선호 맛)을
 *              바탕으로 OpenRouter API를 호출하여 최적의 맞춤형 레시피를 생성하고 정형화된 JSON으로 반환합니다.
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
    const { ingredients = [], options = {}, profile = {} } = req.body || {};

    // 재료 목록 유효성 검증
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: '레시피를 생성할 재료 목록이 전달되지 않았습니다.'
      });
    }

    // 환경 변수에서 OpenRouter API 키 및 모델명 로드
    const apiKey = process.env.OPENROUTER_API_KEY;
    const primaryModel = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';
    
    // 무료 티어 후보 모델 목록 (429 Rate Limit 발생 시 자동 폴백)
    const fallbackModels = [
      primaryModel,
      'nvidia/nemotron-3.5-super-vl:free',
      'meta-llama/llama-3.3-70b-instruct:free'
    ];
    const candidateModels = [...new Set(fallbackModels)];

    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      return res.status(500).json({
        success: false,
        error: '.env.local 파일에 유효한 OPENROUTER_API_KEY가 설정되어 있지 않습니다.'
      });
    }

    // 재료 텍스트 정리
    const ingredientListText = ingredients.map(item => {
      if (typeof item === 'string') return item;
      return `${item.name}${item.estimated_quantity ? ` (${item.estimated_quantity})` : ''}`;
    }).join(', ');

    // 2단계 조리 옵션
    const {
      baseSeasoning = true,
      difficulty = '상관없음',
      cookingTime = '30분 이내',
      dishType = '전체',
      servings = '1~2인분'
    } = options;

    // 3단계 사용자 프로필 옵션 (알레르기, 기피 재료, 선호 매운맛 등)
    const {
      dietaryType = '일반식',
      allergies = [],
      dislikedIngredients = [],
      spiceLevel = '보통',
      saltLevel = '보통'
    } = profile;

    // 제외 재료 문자열 생성
    const excludedList = [...allergies, ...dislikedIngredients].filter(Boolean);
    const excludedText = excludedList.length > 0 ? excludedList.join(', ') : '없음';

    // AI 시스템 프롬프트 (전문 셰프 및 엄격한 JSON 스키마 강제)
    const systemPrompt = `당신은 사용자의 냉장고 속 잔여 식재료를 최대한 활용하여 맛있고 건강한 요리를 제안하는 전문 셰프 AI입니다.
주어진 보유 재료 목록과 조건만으로 즉시 만들 수 있는 추천 레시피 2~3가지를 구성하여 오직 유효한 JSON 형식으로만 응답해야 합니다.

절대 추가 정보를 되묻거나 에러를 출력하지 마세요. 주어진 재료가 적더라도 가능한 최선의 요리법을 구성하여 무조건 아래 JSON 스키마로만 응답하세요:
{
  "recipes": [
    {
      "recipe_id": "recipe_1",
      "title": "요리 이름 (예: 파기름 두부 부침)",
      "summary": "요리에 대한 매력적인 한 줄 소개",
      "cooking_time": "소요 시간 (예: 15분, 30분)",
      "difficulty": "난이도 (쉬움 / 보통 / 요리사 수준 중 택1)",
      "servings": "인원수 (예: 1~2인분)",
      "calories_approx": "대략적인 열량 (예: 약 450 kcal)",
      "ingredients_used": [
        {
          "name": "재료명",
          "amount": "필요 분량 (예: 1모, 2알, 1큰술)",
          "status": "구분 (보유 재료 / 기본 양념 / 대체 가능 중 택1)"
        }
      ],
      "steps": [
        {
          "step": 1,
          "description": "조리 단계에 대한 상세하고 친절한 설명",
          "timer_seconds": 타이머가필요한경우초단위숫자(예: 180, 불필요시 0)
        }
      ],
      "chef_tips": "셰프의 특급 팁 또는 대체 재료 조언"
    }
  ]
}

중요 준수 사항:
1. 마크다운 코드블록(\`\`\`json)이나 사족, 에러 메시지 없이 오직 위의 recipes 키를 가진 JSON 문자열만 출력하세요.
2. [알레르기 및 기피 재료]에 포함된 재료는 절대 주재료나 부재료로 사용하지 마세요. (엄격한 제외 규칙)
3. 사용자의 식단 유형(비건, 저탄고지 등)과 선호 매운맛/간 조절 조건을 레시피 조리법에 적극 반영하세요. (예: 비건이면 계란/육류 대신 두부 중심)
4. 사용자가 가진 재료를 메인으로 삼고, 구하기 힘든 특이하고 비싼 재료는 절대 주재료로 요구하지 마세요.`;

    // 사용자 프롬프트 구성
    const userPrompt = `[보유 식재료]: ${ingredientListText}
[조리 옵션]:
- 기본 조미료 보유 여부: ${baseSeasoning ? '보유함' : '최소한의 양념만 사용'}
- 희망 난이도: ${difficulty}
- 희망 조리 시간: ${cookingTime}
- 요리 유형: ${dishType}
- 식사 인원: ${servings}

[사용자 개인 프로필 제약 조건]:
- 식단 유형: ${dietaryType}
- 알레르기 및 절대 기피 재료 (반드시 제외): ${excludedText}
- 선호 매운맛 강도: ${spiceLevel}
- 선호 간 맞춤: ${saltLevel}

위 모든 조건과 프로필 제약 조건을 반영하여 가장 안전하고 맛있는 맞춤 레시피 2~3가지를 JSON으로 생성해줘.`;

    let lastError = null;
    let selectedModel = primaryModel;
    let rawContent = null;

    // 가용 모델 순차 시도 (429 과부하 시 자동 우회)
    for (const model of candidateModels) {
      try {
        console.log(`[레시피 생성 시도] 모델: ${model}`);
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
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: userPrompt
              }
            ]
          })
        });

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
          break;
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

    // 마크다운 코드 블록 제거 및 순수 JSON 추출
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

    if (!parsedResult.recipes || !Array.isArray(parsedResult.recipes) || parsedResult.recipes.length === 0) {
      return res.status(500).json({
        success: false,
        error: '생성된 레시피 데이터가 올바른 규격이 아닙니다.',
        raw: parsedResult
      });
    }

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
