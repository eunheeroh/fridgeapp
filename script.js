/**
 * @file script.js
 * @description 냉장고 파먹기 AI - 전체 통합 클라이언트 스크립트
 *              - 1단계: 사진 업로드 및 Canvas 기반 리사이징/압축, AI 재료 인식, 태그 편집
 *              - 2단계: 조리 옵션 설정, AI 맞춤형 레시피 생성, 인터랙티브 조리 뷰 (타이머 & 체크리스트)
 *              - 3단계: 사용자 프로필(식이/알레르기) 관리 & 2단계 자동 연동,
 *                       LocalStorage 기반 '나만의 레시피 북' CRUD, 별점/메모, Web Share 공유/내보내기
 */

// ==========================================================================
// 1. 전역 상태(State) 관리 객체 및 LocalStorage 키
// ==========================================================================
const STORAGE_KEYS = {
  PROFILE: 'fridge_ai_user_profile',
  RECIPES: 'fridge_ai_saved_recipes'
};

const AppState = {
  currentStep: 1,          // 현재 단계 (1, 2, 3)
  selectedFile: null,      // 사용자가 업로드한 원본 사진
  compressedBase64: null,  // 압축 및 리사이즈 완료된 Base64 이미지
  isAnalyzing: false,      // 1단계 AI 재료 분석 진행 중 여부
  ingredients: [],         // 확정된 재료 목록 [{ name, category, estimated_quantity, confidence }]
  confidenceNote: '',      // AI 분석 총평

  // 2단계 레시피 상태
  isGeneratingRecipe: false,
  recipes: [],               // AI가 추천한 레시피 목록
  currentRecipe: null,       // 현재 상세 모달에서 열람 중인 레시피

  // 타이머 상태
  timer: {
    intervalId: null,
    totalSeconds: 0,
    remainingSeconds: 0,
    isRunning: false,
    stepTitle: ''
  },

  // 3단계 사용자 프로필 상태
  profile: {
    nickname: '즐거운 미식가',
    avatar: '🧑‍🍳',
    dietaryType: '일반식',
    allergies: [],           // ['갑각류(새우/게)', '오이' 등]
    spiceLevel: '보통 (신라면 정도)',
    saltLevel: '보통'
  },

  // 3단계 저장된 레시피 목록
  savedRecipes: [],
  bookFilter: 'all',         // 'all' | 'favorites' | 'quick'
  bookSearchQuery: '',
  bookSort: 'latest'         // 'latest' | 'rating' | 'time'
};

// ==========================================================================
// 2. DOM 요소 참조
// ==========================================================================
const DOM = {
  // 스텝 인디케이터
  stepIndicator1: document.getElementById('stepIndicator1'),
  stepIndicator2: document.getElementById('stepIndicator2'),
  stepIndicator3: document.getElementById('stepIndicator3'),

  // 뷰 컨테이너
  viewStep1: document.getElementById('viewStep1'),
  viewStep2: document.getElementById('viewStep2'),
  viewStep3: document.getElementById('viewStep3'),

  // 1단계 요소
  dropzone: document.getElementById('dropzone'),
  dropzoneEmpty: document.getElementById('dropzoneEmpty'),
  fileInput: document.getElementById('fileInput'),
  cameraInput: document.getElementById('cameraInput'),
  previewWrapper: document.getElementById('previewWrapper'),
  previewImage: document.getElementById('previewImage'),
  scanOverlay: document.getElementById('scanOverlay'),
  scanModelInfo: document.getElementById('scanModelInfo'),
  btnReupload: document.getElementById('btnReupload'),
  btnAnalyze: document.getElementById('btnAnalyze'),
  ingredientCount: document.getElementById('ingredientCount'),
  tagsContainer: document.getElementById('tagsContainer'),
  emptyState: document.getElementById('emptyState'),
  addIngredientForm: document.getElementById('addIngredientForm'),
  inputName: document.getElementById('inputName'),
  inputQuantity: document.getElementById('inputQuantity'),
  confidenceNote: document.getElementById('confidenceNote'),
  confidenceText: document.getElementById('confidenceText'),
  btnGoToStep2: document.getElementById('btnGoToStep2'),

  // 2단계 요소
  btnBackToStep1: document.getElementById('btnBackToStep1'),
  selectedIngredientsChips: document.getElementById('selectedIngredientsChips'),
  profileBannerAlert: document.getElementById('profileBannerAlert'),
  profileBannerText: document.getElementById('profileBannerText'),
  btnGoToProfileSettings: document.getElementById('btnGoToProfileSettings'),
  recipeOptionsForm: document.getElementById('recipeOptionsForm'),
  optBaseSeasoning: document.getElementById('optBaseSeasoning'),
  optCookingTime: document.getElementById('optCookingTime'),
  optDifficulty: document.getElementById('optDifficulty'),
  optDishType: document.getElementById('optDishType'),
  optServings: document.getElementById('optServings'),
  btnGenerateRecipe: document.getElementById('btnGenerateRecipe'),
  recipeLoadingCard: document.getElementById('recipeLoadingCard'),
  recipeModelInfo: document.getElementById('recipeModelInfo'),
  recipesResultSection: document.getElementById('recipesResultSection'),
  recipesCount: document.getElementById('recipesCount'),
  recipeCardsGrid: document.getElementById('recipeCardsGrid'),
  btnRegenerate: document.getElementById('btnRegenerate'),

  // 3단계 서브탭 및 레시피 북 요소
  tabBtnRecipeBook: document.getElementById('tabBtnRecipeBook'),
  tabBtnProfile: document.getElementById('tabBtnProfile'),
  panelRecipeBook: document.getElementById('panelRecipeBook'),
  panelProfile: document.getElementById('panelProfile'),
  savedRecipeCount: document.getElementById('savedRecipeCount'),
  inputRecipeSearch: document.getElementById('inputRecipeSearch'),
  selectBookSort: document.getElementById('selectBookSort'),
  btnExportJson: document.getElementById('btnExportJson'),
  bookTagsFilter: document.getElementById('bookTagsFilter'),
  savedRecipesGrid: document.getElementById('savedRecipesGrid'),
  emptyBookState: document.getElementById('emptyBookState'),
  btnGoStep1FromBook: document.getElementById('btnGoStep1FromBook'),

  // 3단계 프로필 설정 요소
  profileForm: document.getElementById('profileForm'),
  profileNickname: document.getElementById('profileNickname'),
  avatarSelector: document.getElementById('avatarSelector'),
  profileDietaryType: document.getElementById('profileDietaryType'),
  allergyPresetChips: document.getElementById('allergyPresetChips'),
  inputCustomAllergy: document.getElementById('inputCustomAllergy'),
  btnAddCustomAllergy: document.getElementById('btnAddCustomAllergy'),
  activeAllergyTags: document.getElementById('activeAllergyTags'),
  profileSpiceLevel: document.getElementById('profileSpiceLevel'),
  profileSaltLevel: document.getElementById('profileSaltLevel'),
  btnSaveProfile: document.getElementById('btnSaveProfile'),
  btnResetAllData: document.getElementById('btnResetAllData'),

  // 상세 모달 요소
  recipeDetailModal: document.getElementById('recipeDetailModal'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  modalDifficulty: document.getElementById('modalDifficulty'),
  modalTitle: document.getElementById('modalTitle'),
  modalTime: document.getElementById('modalTime'),
  modalServings: document.getElementById('modalServings'),
  modalCalories: document.getElementById('modalCalories'),
  modalSummary: document.getElementById('modalSummary'),
  modalIngredientsList: document.getElementById('modalIngredientsList'),
  modalStepsList: document.getElementById('modalStepsList'),
  modalChefTipsBox: document.getElementById('modalChefTipsBox'),
  modalChefTips: document.getElementById('modalChefTips'),
  modalStarRating: document.getElementById('modalStarRating'),
  modalStarText: document.getElementById('modalStarText'),
  modalUserNotes: document.getElementById('modalUserNotes'),
  btnSaveRecipe: document.getElementById('btnSaveRecipe'),
  btnShareRecipe: document.getElementById('btnShareRecipe'),

  // 타이머 위젯 요소
  timerWidget: document.getElementById('timerWidget'),
  timerStepBadge: document.getElementById('timerStepBadge'),
  timerDigital: document.getElementById('timerDigital'),
  btnTimerToggle: document.getElementById('btnTimerToggle'),
  btnTimerReset: document.getElementById('btnTimerReset'),
  btnTimerClose: document.getElementById('btnTimerClose')
};

// ==========================================================================
// 3. 단계(Step) 및 서브 탭 전환 로직
// ==========================================================================
/**
 * 1, 2, 3단계 화면으로 전환합니다.
 * @param {number} step 전환할 단계 번호
 */
function switchStep(step) {
  AppState.currentStep = step;

  // 인디케이터 초기화
  [DOM.stepIndicator1, DOM.stepIndicator2, DOM.stepIndicator3].forEach((el, idx) => {
    el.classList.toggle('active', idx + 1 === step);
  });

  // 뷰 패널 숨김 처리
  DOM.viewStep1.classList.add('hidden');
  DOM.viewStep2.classList.add('hidden');
  DOM.viewStep3.classList.add('hidden');

  if (step === 1) {
    DOM.viewStep1.classList.remove('hidden');
  } else if (step === 2) {
    if (AppState.ingredients.length === 0) {
      alert('최소 1개 이상의 식재료가 필요합니다. 1단계에서 먼저 재료를 등록해주세요.');
      switchStep(1);
      return;
    }
    DOM.viewStep2.classList.remove('hidden');
    renderSelectedIngredientsSummary();
    updateProfileBannerInStep2();

    // 생성된 레시피가 없으면 첫 레시피 자동 요청
    if (AppState.recipes.length === 0 && !AppState.isGeneratingRecipe) {
      generateRecipes();
    }
  } else if (step === 3) {
    DOM.viewStep3.classList.remove('hidden');
    renderSavedRecipes();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 3단계 내부 서브탭(레시피 북 vs 프로필 설정) 전환
 * @param {string} tabName 'book' | 'profile'
 */
function switchSubTab(tabName) {
  if (tabName === 'book') {
    DOM.tabBtnRecipeBook.classList.add('active');
    DOM.tabBtnProfile.classList.remove('active');
    DOM.panelRecipeBook.classList.remove('hidden');
    DOM.panelProfile.classList.add('hidden');
    renderSavedRecipes();
  } else {
    DOM.tabBtnRecipeBook.classList.remove('active');
    DOM.tabBtnProfile.classList.add('active');
    DOM.panelRecipeBook.classList.add('hidden');
    DOM.panelProfile.classList.remove('hidden');
    bindProfileToForm();
  }
}

// ==========================================================================
// 4. 1단계: 이미지 압축 및 재료 분석 (/api/analyze-image)
// ==========================================================================
function compressImage(file, maxDimension = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('이미지 객체 생성 실패'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}

async function handleFileSelect(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일(JPG, PNG, WebP)만 업로드할 수 있습니다.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert('파일 크기는 최대 10MB 이하이어야 합니다.');
    return;
  }

  AppState.selectedFile = file;

  try {
    const compressed = await compressImage(file);
    AppState.compressedBase64 = compressed;

    DOM.previewImage.src = compressed;
    DOM.dropzoneEmpty.classList.add('hidden');
    DOM.previewWrapper.classList.remove('hidden');
    DOM.btnAnalyze.disabled = false;
  } catch (error) {
    alert('이미지 처리 중 문제가 발생했습니다: ' + error.message);
  }
}

function resetUpload() {
  AppState.selectedFile = null;
  AppState.compressedBase64 = null;
  AppState.isAnalyzing = false;
  DOM.fileInput.value = '';
  DOM.cameraInput.value = '';
  DOM.previewImage.src = '';
  DOM.previewWrapper.classList.add('hidden');
  DOM.dropzoneEmpty.classList.remove('hidden');
  DOM.scanOverlay.classList.add('hidden');
  DOM.btnAnalyze.disabled = true;
}

async function analyzeImage() {
  if (!AppState.compressedBase64 || AppState.isAnalyzing) return;

  AppState.isAnalyzing = true;
  DOM.btnAnalyze.disabled = true;
  DOM.scanOverlay.classList.remove('hidden');

  try {
    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: AppState.compressedBase64 })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || `서버 오류 (${response.status})`);
    }

    const { ingredients = [], confidence_notes = '' } = result.data || {};

    if (ingredients.length === 0) {
      alert('식재료를 명확하게 식별하지 못했습니다. 아래 입력창에서 재료를 직접 추가해주세요!');
    } else {
      AppState.ingredients = ingredients;
      AppState.confidenceNote = confidence_notes;
    }

    if (result.modelUsed) {
      DOM.scanModelInfo.textContent = `Model: ${result.modelUsed}`;
    }

    renderIngredients();

  } catch (error) {
    console.error('AI 재료 분석 오류:', error);
    alert(`재료 인식에 실패했습니다: ${error.message}`);
  } finally {
    AppState.isAnalyzing = false;
    DOM.btnAnalyze.disabled = false;
    DOM.scanOverlay.classList.add('hidden');
  }
}

function renderIngredients() {
  const count = AppState.ingredients.length;
  DOM.ingredientCount.textContent = count;

  if (count === 0) {
    DOM.tagsContainer.innerHTML = '';
    DOM.tagsContainer.appendChild(DOM.emptyState);
    DOM.emptyState.classList.remove('hidden');
    DOM.btnGoToStep2.disabled = true;
    DOM.confidenceNote.classList.add('hidden');
    return;
  }

  DOM.emptyState.classList.add('hidden');
  DOM.tagsContainer.innerHTML = '';

  AppState.ingredients.forEach((item, index) => {
    const tag = document.createElement('div');
    tag.className = 'ingredient-tag';
    tag.innerHTML = `
      <span class="tag-category-dot" style="background-color: #10b981;" title="${item.category || '기타'}"></span>
      <span class="tag-name">${escapeHtml(item.name)}</span>
      ${item.estimated_quantity ? `<span class="tag-qty">(${escapeHtml(item.estimated_quantity)})</span>` : ''}
      <button type="button" class="tag-btn-remove" data-index="${index}" title="재료 삭제" aria-label="${item.name} 삭제">×</button>
    `;
    DOM.tagsContainer.appendChild(tag);
  });

  const removeButtons = DOM.tagsContainer.querySelectorAll('.tag-btn-remove');
  removeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      removeIngredient(idx);
    });
  });

  if (AppState.confidenceNote) {
    DOM.confidenceText.textContent = AppState.confidenceNote;
    DOM.confidenceNote.classList.remove('hidden');
  } else {
    DOM.confidenceNote.classList.add('hidden');
  }

  DOM.btnGoToStep2.disabled = count === 0;
}

function removeIngredient(index) {
  if (index >= 0 && index < AppState.ingredients.length) {
    AppState.ingredients.splice(index, 1);
    renderIngredients();
  }
}

function addCustomIngredient(name, quantity) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const isDuplicate = AppState.ingredients.some(item => item.name.toLowerCase() === trimmedName.toLowerCase());
  if (isDuplicate) {
    alert(`'${trimmedName}'(은)는 이미 목록에 있습니다.`);
    return;
  }

  AppState.ingredients.push({
    name: trimmedName,
    category: '기타',
    estimated_quantity: quantity.trim() || '적당량',
    confidence: 1.0
  });

  renderIngredients();
}

// ==========================================================================
// 5. 2단계: AI 맞춤형 레시피 생성 (/api/generate-recipe)
// ==========================================================================
function renderSelectedIngredientsSummary() {
  DOM.selectedIngredientsChips.innerHTML = '';
  AppState.ingredients.forEach(item => {
    const chip = document.createElement('span');
    chip.className = 'chip-mini';
    chip.textContent = `${item.name}${item.estimated_quantity ? ` (${item.estimated_quantity})` : ''}`;
    DOM.selectedIngredientsChips.appendChild(chip);
  });
}

/**
 * 2단계 상단에 사용자의 3단계 프로필(알레르기, 기피재료 등) 연동 상태를 안내합니다.
 */
function updateProfileBannerInStep2() {
  const allergies = AppState.profile.allergies || [];
  if (allergies.length > 0) {
    DOM.profileBannerText.textContent = `[${AppState.profile.nickname}]님의 프로필 반영: 기피 재료(${allergies.join(', ')})가 제외된 레시피를 추천합니다.`;
  } else {
    DOM.profileBannerText.textContent = `[${AppState.profile.nickname}]님의 선호 식단(${AppState.profile.dietaryType})과 매운맛(${AppState.profile.spiceLevel})이 반영됩니다.`;
  }
}

async function generateRecipes() {
  if (AppState.ingredients.length === 0 || AppState.isGeneratingRecipe) return;

  AppState.isGeneratingRecipe = true;
  DOM.btnGenerateRecipe.disabled = true;
  DOM.recipeLoadingCard.classList.remove('hidden');
  DOM.recipesResultSection.classList.add('hidden');
  DOM.recipeLoadingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const options = {
    baseSeasoning: DOM.optBaseSeasoning.checked,
    cookingTime: DOM.optCookingTime.value,
    difficulty: DOM.optDifficulty.value,
    dishType: DOM.optDishType.value,
    servings: DOM.optServings.value
  };

  try {
    const response = await fetch('/api/generate-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: AppState.ingredients,
        options: options,
        profile: AppState.profile // 3단계 프로필 함께 전송
      })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || `서버 오류 (${response.status})`);
    }

    const { recipes = [] } = result.data || {};
    AppState.recipes = recipes;

    if (result.modelUsed) {
      DOM.recipeModelInfo.textContent = `Model: ${result.modelUsed}`;
    }

    renderRecipeCards();

  } catch (error) {
    console.error('레시피 생성 오류:', error);
    alert(`레시피 생성에 실패했습니다: ${error.message}`);
  } finally {
    AppState.isGeneratingRecipe = false;
    DOM.btnGenerateRecipe.disabled = false;
    DOM.recipeLoadingCard.classList.add('hidden');
  }
}

function renderRecipeCards() {
  DOM.recipesCount.textContent = AppState.recipes.length;
  DOM.recipeCardsGrid.innerHTML = '';

  if (AppState.recipes.length === 0) {
    DOM.recipesResultSection.classList.add('hidden');
    return;
  }

  DOM.recipesResultSection.classList.remove('hidden');

  AppState.recipes.forEach((recipe, index) => {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.setAttribute('data-index', index);

    // 저장 여부 확인
    const isSaved = AppState.savedRecipes.some(r => r.title === recipe.title);

    card.innerHTML = `
      <div>
        <span class="recipe-card-badge">${escapeHtml(recipe.difficulty || '보통')}</span>
        <h4 class="recipe-card-title">
          ${escapeHtml(recipe.title)}
          ${isSaved ? ' <span title="보관함에 저장됨">⭐</span>' : ''}
        </h4>
        <p class="recipe-card-summary">${escapeHtml(recipe.summary || '')}</p>
      </div>
      <div>
        <div class="recipe-card-meta">
          <span class="card-meta-item">⏱ ${escapeHtml(recipe.cooking_time || '20분')}</span>
          <span class="card-meta-item">👥 ${escapeHtml(recipe.servings || '1~2인분')}</span>
          ${recipe.calories_approx ? `<span class="card-meta-item">🔥 ${escapeHtml(recipe.calories_approx)}</span>` : ''}
        </div>
        <div class="recipe-card-footer">
          <span class="card-view-btn">조리법 자세히 보기 →</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openRecipeModal(recipe);
    });

    DOM.recipeCardsGrid.appendChild(card);
  });

  DOM.recipesResultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==========================================================================
// 6. 레시피 상세 모달, 별점 & 메모, 공유 기능
// ==========================================================================
function openRecipeModal(recipe) {
  AppState.currentRecipe = recipe;

  DOM.modalTitle.textContent = recipe.title;
  DOM.modalDifficulty.textContent = recipe.difficulty || '쉬움';
  DOM.modalTime.textContent = recipe.cooking_time || '20분';
  DOM.modalServings.textContent = recipe.servings || '1~2인분';
  DOM.modalCalories.textContent = recipe.calories_approx || '약 400 kcal';
  DOM.modalSummary.textContent = recipe.summary || '';

  // 재료 리스트
  DOM.modalIngredientsList.innerHTML = '';
  if (recipe.ingredients_used && recipe.ingredients_used.length > 0) {
    recipe.ingredients_used.forEach(ing => {
      const itemEl = document.createElement('div');
      itemEl.className = 'modal-ing-item';
      const isAlt = ing.status && ing.status.includes('대체');
      itemEl.innerHTML = `
        <span class="ing-name">
          ${escapeHtml(ing.name)}
          ${ing.status ? `<span class="ing-status-tag ${isAlt ? 'alt' : ''}">${escapeHtml(ing.status)}</span>` : ''}
        </span>
        <span class="ing-amount">${escapeHtml(ing.amount || '적당량')}</span>
      `;
      DOM.modalIngredientsList.appendChild(itemEl);
    });
  }

  // 조리 단계 리스트
  DOM.modalStepsList.innerHTML = '';
  if (recipe.steps && recipe.steps.length > 0) {
    recipe.steps.forEach((step, idx) => {
      const stepCard = document.createElement('div');
      stepCard.className = 'cooking-step-card';

      const hasTimer = step.timer_seconds && step.timer_seconds > 0;
      const timerMinutes = hasTimer ? Math.ceil(step.timer_seconds / 60) : 0;

      stepCard.innerHTML = `
        <input type="checkbox" class="step-checkbox" id="stepCheck_${idx}" aria-label="단계 완료 체크">
        <span class="step-num-badge">${step.step || (idx + 1)}</span>
        <div class="step-content">
          <p class="step-desc">${escapeHtml(step.description)}</p>
          ${hasTimer ? `
            <button type="button" class="btn-step-timer" data-seconds="${step.timer_seconds}">
              ⏱ ${timerMinutes}분 타이머 시작 (${step.timer_seconds}초)
            </button>
          ` : ''}
        </div>
      `;

      const checkbox = stepCard.querySelector('.step-checkbox');
      checkbox.addEventListener('change', () => {
        stepCard.classList.toggle('completed', checkbox.checked);
      });

      if (hasTimer) {
        const btnTimer = stepCard.querySelector('.btn-step-timer');
        btnTimer.addEventListener('click', (e) => {
          e.stopPropagation();
          startCookingTimer(step.timer_seconds, `${step.step || (idx + 1)}단계 조리 타이머`);
        });
      }

      DOM.modalStepsList.appendChild(stepCard);
    });
  }

  // 팁
  if (recipe.chef_tips) {
    DOM.modalChefTips.textContent = recipe.chef_tips;
    DOM.modalChefTipsBox.classList.remove('hidden');
  } else {
    DOM.modalChefTipsBox.classList.add('hidden');
  }

  // 저장 상태 및 별점/메모 바인딩
  const savedItem = AppState.savedRecipes.find(r => r.title === recipe.title);
  if (savedItem) {
    DOM.btnSaveRecipe.textContent = '⭐ 보관함 저장 완료 (저장 해제)';
    DOM.btnSaveRecipe.classList.remove('btn-accent');
    DOM.btnSaveRecipe.classList.add('btn-secondary');
    setStarRatingUI(savedItem.userRating || 0);
    DOM.modalUserNotes.value = savedItem.userNotes || '';
  } else {
    DOM.btnSaveRecipe.textContent = '⭐ 나만의 레시피 북에 저장';
    DOM.btnSaveRecipe.classList.remove('btn-secondary');
    DOM.btnSaveRecipe.classList.add('btn-accent');
    setStarRatingUI(recipe.userRating || 0);
    DOM.modalUserNotes.value = recipe.userNotes || '';
  }

  DOM.recipeDetailModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeRecipeModal() {
  // 모달을 닫을 때 작성 중인 메모/별점 자동 동기화
  if (AppState.currentRecipe) {
    const note = DOM.modalUserNotes.value;
    const rating = getCurrentStarRatingUI();
    AppState.currentRecipe.userNotes = note;
    AppState.currentRecipe.userRating = rating;

    const savedIndex = AppState.savedRecipes.findIndex(r => r.title === AppState.currentRecipe.title);
    if (savedIndex !== -1) {
      AppState.savedRecipes[savedIndex].userNotes = note;
      AppState.savedRecipes[savedIndex].userRating = rating;
      saveRecipesToStorage();
      renderSavedRecipes();
    }
  }

  DOM.recipeDetailModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// 별점 UI 헬퍼
function setStarRatingUI(rating) {
  const stars = DOM.modalStarRating.querySelectorAll('.star-btn');
  stars.forEach(star => {
    const val = parseInt(star.getAttribute('data-value'), 10);
    star.classList.toggle('active', val <= rating);
  });
  DOM.modalStarText.textContent = rating > 0 ? `${rating}점 / 5점` : '미평가';
}

function getCurrentStarRatingUI() {
  const activeStars = DOM.modalStarRating.querySelectorAll('.star-btn.active');
  return activeStars.length;
}

/**
 * 현재 열린 레시피를 나만의 레시피 북에 저장 또는 해제합니다.
 */
function toggleSaveCurrentRecipe() {
  if (!AppState.currentRecipe) return;

  const recipe = AppState.currentRecipe;
  const existingIndex = AppState.savedRecipes.findIndex(r => r.title === recipe.title);

  if (existingIndex !== -1) {
    // 이미 저장된 경우 -> 삭제
    AppState.savedRecipes.splice(existingIndex, 1);
    saveRecipesToStorage();
    DOM.btnSaveRecipe.textContent = '⭐ 나만의 레시피 북에 저장';
    DOM.btnSaveRecipe.classList.remove('btn-secondary');
    DOM.btnSaveRecipe.classList.add('btn-accent');
    alert(`[${recipe.title}] 레시피가 보관함에서 삭제되었습니다.`);
  } else {
    // 새로 저장
    const recipeToSave = {
      ...recipe,
      id: 'saved_' + Date.now(),
      saved_at: new Date().toISOString(),
      userRating: getCurrentStarRatingUI(),
      userNotes: DOM.modalUserNotes.value
    };
    AppState.savedRecipes.unshift(recipeToSave);
    saveRecipesToStorage();
    DOM.btnSaveRecipe.textContent = '⭐ 보관함 저장 완료 (저장 해제)';
    DOM.btnSaveRecipe.classList.remove('btn-accent');
    DOM.btnSaveRecipe.classList.add('btn-secondary');
    alert(`🎉 [${recipe.title}] 레시피가 '나만의 레시피 북'에 영구 보관되었습니다!\n언제든 3단계에서 꺼내보실 수 있습니다.`);
  }

  renderSavedRecipes();
  renderRecipeCards();
}

/**
 * Web Share API를 사용해 레시피를 카카오톡, 메시지 또는 클립보드로 공유합니다.
 */
async function shareCurrentRecipe() {
  if (!AppState.currentRecipe) return;
  const recipe = AppState.currentRecipe;

  const shareText = `[냉장고 파먹기 AI 레시피: ${recipe.title}]
- 조리 시간: ${recipe.cooking_time || '20분'} (${recipe.difficulty || '쉬움'})
- 한 줄 소개: ${recipe.summary || ''}
- 필요 재료: ${recipe.ingredients_used?.map(i => `${i.name}(${i.amount})`).join(', ') || ''}

자세한 조리법은 냉장고 파먹기 AI 앱에서 확인하세요!`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: recipe.title,
        text: shareText,
        url: window.location.href
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        copyToClipboard(shareText);
      }
    }
  } else {
    copyToClipboard(shareText);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('📋 레시피 내용이 클립보드에 복사되었습니다!\n카카오톡이나 메모장에 붙여넣기(Ctrl+V) 하세요.');
  }).catch(() => {
    alert('클립보드 복사에 실패했습니다.');
  });
}

// ==========================================================================
// 7. 3단계: 나만의 레시피 북 (LocalStorage CRUD & 필터/정렬)
// ==========================================================================
function saveRecipesToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(AppState.savedRecipes));
  } catch (e) {
    console.error('레시피 저장소 저장 실패:', e);
  }
}

function loadSavedRecipesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECIPES);
    if (raw) {
      AppState.savedRecipes = JSON.parse(raw);
    }
  } catch (e) {
    console.error('레시피 저장소 로드 실패:', e);
  }
}

/**
 * 저장된 레시피 목록을 검색어, 필터, 정렬 기준에 맞춰 렌더링합니다.
 */
function renderSavedRecipes() {
  loadSavedRecipesFromStorage();
  const totalCount = AppState.savedRecipes.length;
  DOM.savedRecipeCount.textContent = totalCount;

  // 필터링 적용
  let list = [...AppState.savedRecipes];

  // 1. 검색어 필터
  const q = AppState.bookSearchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter(r => 
      r.title.toLowerCase().includes(q) ||
      r.summary?.toLowerCase().includes(q) ||
      r.ingredients_used?.some(i => i.name.toLowerCase().includes(q))
    );
  }

  // 2. 태그 필터
  if (AppState.bookFilter === 'favorites') {
    list = list.filter(r => (r.userRating || 0) >= 4);
  } else if (AppState.bookFilter === 'quick') {
    list = list.filter(r => r.cooking_time && r.cooking_time.includes('15분'));
  }

  // 3. 정렬
  if (AppState.bookSort === 'rating') {
    list.sort((a, b) => (b.userRating || 0) - (a.userRating || 0));
  } else if (AppState.bookSort === 'time') {
    list.sort((a, b) => parseInt(a.cooking_time || 30) - parseInt(b.cooking_time || 30));
  } else {
    // 최신순
    list.sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0));
  }

  DOM.savedRecipesGrid.innerHTML = '';

  if (list.length === 0) {
    DOM.emptyBookState.classList.remove('hidden');
    return;
  }

  DOM.emptyBookState.classList.add('hidden');

  list.forEach(recipe => {
    const card = document.createElement('article');
    card.className = 'recipe-card saved-recipe-card';

    const stars = '★'.repeat(recipe.userRating || 0) + '☆'.repeat(5 - (recipe.userRating || 0));
    const savedDateStr = recipe.saved_at ? new Date(recipe.saved_at).toLocaleDateString('ko-KR') : '';

    card.innerHTML = `
      <div>
        <div class="saved-card-header">
          <span class="saved-rating-stars">${recipe.userRating > 0 ? stars : '<span style="color:#94a3b8;">미평가</span>'}</span>
          <button type="button" class="btn-card-delete" title="보관함에서 삭제" aria-label="삭제">🗑</button>
        </div>
        <h4 class="recipe-card-title">${escapeHtml(recipe.title)}</h4>
        <p class="recipe-card-summary">${escapeHtml(recipe.summary || '')}</p>
        ${recipe.userNotes ? `<div class="saved-note-preview">📝 ${escapeHtml(recipe.userNotes)}</div>` : ''}
      </div>
      <div>
        <div class="recipe-card-meta">
          <span class="card-meta-item">⏱ ${escapeHtml(recipe.cooking_time || '20분')}</span>
          <span class="card-meta-item">👥 ${escapeHtml(recipe.servings || '1~2인분')}</span>
          <span class="saved-card-date">${savedDateStr}</span>
        </div>
        <div class="recipe-card-footer">
          <span class="card-view-btn">조리법 열기 →</span>
        </div>
      </div>
    `;

    // 삭제 버튼
    const btnDel = card.querySelector('.btn-card-delete');
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`'${recipe.title}' 레시피를 보관함에서 삭제하시겠습니까?`)) {
        AppState.savedRecipes = AppState.savedRecipes.filter(r => r.title !== recipe.title);
        saveRecipesToStorage();
        renderSavedRecipes();
      }
    });

    // 카드 클릭 시 상세 모달
    card.addEventListener('click', () => {
      openRecipeModal(recipe);
    });

    DOM.savedRecipesGrid.appendChild(card);
  });
}

/**
 * 저장된 레시피 목록을 JSON 파일로 백업 다운로드
 */
function exportRecipesJson() {
  if (AppState.savedRecipes.length === 0) {
    alert('저장된 레시피가 없어 내보낼 데이터가 없습니다.');
    return;
  }
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(AppState.savedRecipes, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `fridge_recipes_backup_${new Date().toISOString().slice(0, 10)}.json`);
  dlAnchor.click();
}

// ==========================================================================
// 8. 3단계: 사용자 프로필 관리 (식습관 & 알레르기)
// ==========================================================================
function saveProfileToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(AppState.profile));
  } catch (e) {
    console.error('프로필 저장 실패:', e);
  }
}

function loadProfileFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) {
      AppState.profile = { ...AppState.profile, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('프로필 로드 실패:', e);
  }
}

function bindProfileToForm() {
  DOM.profileNickname.value = AppState.profile.nickname || '';
  DOM.profileDietaryType.value = AppState.profile.dietaryType || '일반식';
  DOM.profileSpiceLevel.value = AppState.profile.spiceLevel || '보통 (신라면 정도)';
  DOM.profileSaltLevel.value = AppState.profile.saltLevel || '보통';

  // 아바타 선택자
  const avatars = DOM.avatarSelector.querySelectorAll('.avatar-option');
  avatars.forEach(av => {
    av.classList.toggle('active', av.getAttribute('data-avatar') === AppState.profile.avatar);
  });

  // 기피 재료 칩
  renderAllergyChips();
}

function renderAllergyChips() {
  const currentAllergies = AppState.profile.allergies || [];

  // 프리셋 칩 활성화 상태 동기화
  const presetChips = DOM.allergyPresetChips.querySelectorAll('.chip-toggle');
  presetChips.forEach(chip => {
    const ing = chip.getAttribute('data-ingredient');
    chip.classList.toggle('active', currentAllergies.includes(ing));
  });

  // 활성화된 알레르기 태그 렌더링
  DOM.activeAllergyTags.innerHTML = '';
  currentAllergies.forEach((allergy, idx) => {
    const badge = document.createElement('span');
    badge.className = 'allergy-badge-remove';
    badge.innerHTML = `
      🚫 ${escapeHtml(allergy)}
      <button type="button" data-index="${idx}" aria-label="제거">×</button>
    `;
    DOM.activeAllergyTags.appendChild(badge);
  });

  // 태그 개별 삭제 이벤트 바인딩
  const removeButtons = DOM.activeAllergyTags.querySelectorAll('button');
  removeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      AppState.profile.allergies.splice(idx, 1);
      saveProfileToStorage();
      renderAllergyChips();
    });
  });
}

function toggleAllergyItem(ingredient) {
  if (!AppState.profile.allergies) AppState.profile.allergies = [];
  const idx = AppState.profile.allergies.indexOf(ingredient);
  if (idx !== -1) {
    AppState.profile.allergies.splice(idx, 1);
  } else {
    AppState.profile.allergies.push(ingredient);
  }
  saveProfileToStorage();
  renderAllergyChips();
}

function addCustomAllergy() {
  const val = DOM.inputCustomAllergy.value.trim();
  if (!val) return;
  if (!AppState.profile.allergies) AppState.profile.allergies = [];
  if (!AppState.profile.allergies.includes(val)) {
    AppState.profile.allergies.push(val);
    saveProfileToStorage();
    renderAllergyChips();
  }
  DOM.inputCustomAllergy.value = '';
}

function handleProfileSubmit(e) {
  e.preventDefault();
  AppState.profile.nickname = DOM.profileNickname.value.trim() || '미식가';
  AppState.profile.dietaryType = DOM.profileDietaryType.value;
  AppState.profile.spiceLevel = DOM.profileSpiceLevel.value;
  AppState.profile.saltLevel = DOM.profileSaltLevel.value;

  saveProfileToStorage();
  alert('✅ 사용자 프로필이 성공적으로 저장되었습니다!\n이후 생성되는 모든 AI 레시피에 자동 반영됩니다.');
  updateProfileBannerInStep2();
}

function resetAllData() {
  if (confirm('⚠️ 저장된 모든 레시피와 프로필 설정을 초기화하시겠습니까? (되돌릴 수 없습니다)')) {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.RECIPES);
    AppState.profile = {
      nickname: '즐거운 미식가',
      avatar: '🧑‍🍳',
      dietaryType: '일반식',
      allergies: [],
      spiceLevel: '보통 (신라면 정도)',
      saltLevel: '보통'
    };
    AppState.savedRecipes = [];
    bindProfileToForm();
    renderSavedRecipes();
    alert('모든 데이터가 초기화되었습니다.');
  }
}

// ==========================================================================
// 9. 인터랙티브 조리 타이머 로직 (Web Audio API 기반 합성 차임벨)
// ==========================================================================
function startCookingTimer(seconds, title) {
  if (AppState.timer.intervalId) {
    clearInterval(AppState.timer.intervalId);
  }

  AppState.timer.totalSeconds = seconds;
  AppState.timer.remainingSeconds = seconds;
  AppState.timer.isRunning = true;
  AppState.timer.stepTitle = title;

  DOM.timerStepBadge.textContent = title;
  updateTimerDisplay();

  DOM.timerWidget.classList.remove('hidden');
  DOM.btnTimerToggle.textContent = '일시정지';

  AppState.timer.intervalId = setInterval(() => {
    if (AppState.timer.remainingSeconds > 0) {
      AppState.timer.remainingSeconds--;
      updateTimerDisplay();

      if (AppState.timer.remainingSeconds === 0) {
        clearInterval(AppState.timer.intervalId);
        AppState.timer.isRunning = false;
        playTimerAlarmSound();
        alert(`🔔 [${AppState.timer.stepTitle}] 조리 시간이 종료되었습니다! 다음 단계로 넘어가세요.`);
        DOM.btnTimerToggle.textContent = '다시 시작';
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(AppState.timer.remainingSeconds / 60);
  const s = AppState.timer.remainingSeconds % 60;
  DOM.timerDigital.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toggleTimer() {
  if (AppState.timer.remainingSeconds === 0) {
    startCookingTimer(AppState.timer.totalSeconds, AppState.timer.stepTitle);
    return;
  }

  if (AppState.timer.isRunning) {
    clearInterval(AppState.timer.intervalId);
    AppState.timer.isRunning = false;
    DOM.btnTimerToggle.textContent = '계속';
  } else {
    AppState.timer.isRunning = true;
    DOM.btnTimerToggle.textContent = '일시정지';
    AppState.timer.intervalId = setInterval(() => {
      if (AppState.timer.remainingSeconds > 0) {
        AppState.timer.remainingSeconds--;
        updateTimerDisplay();
        if (AppState.timer.remainingSeconds === 0) {
          clearInterval(AppState.timer.intervalId);
          AppState.timer.isRunning = false;
          playTimerAlarmSound();
          alert(`🔔 [${AppState.timer.stepTitle}] 조리 시간이 종료되었습니다!`);
          DOM.btnTimerToggle.textContent = '다시 시작';
        }
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(AppState.timer.intervalId);
  AppState.timer.isRunning = false;
  AppState.timer.remainingSeconds = AppState.timer.totalSeconds;
  updateTimerDisplay();
  DOM.btnTimerToggle.textContent = '시작';
}

function closeTimer() {
  clearInterval(AppState.timer.intervalId);
  AppState.timer.isRunning = false;
  DOM.timerWidget.classList.add('hidden');
}

function playTimerAlarmSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.35);
    });
  } catch (e) {
    console.log('오디오 재생 실패:', e);
  }
}

// ==========================================================================
// 10. 공통 유틸리티 및 이벤트 등록
// ==========================================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function initEvents() {
  // 스텝 네비게이션 클릭
  DOM.stepIndicator1.addEventListener('click', () => switchStep(1));
  DOM.stepIndicator2.addEventListener('click', () => switchStep(2));
  DOM.stepIndicator3.addEventListener('click', () => switchStep(3));

  // 1단계 파일/카메라 인풋
  DOM.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
  });
  DOM.cameraInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
  });

  // 드래그 앤 드롭
  ['dragenter', 'dragover'].forEach(name => {
    DOM.dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      DOM.dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(name => {
    DOM.dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      DOM.dropzone.classList.remove('dragover');
    });
  });
  DOM.dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
  });

  // 1단계 버튼들
  DOM.btnReupload.addEventListener('click', resetUpload);
  DOM.btnAnalyze.addEventListener('click', analyzeImage);

  // 재료 직접 추가
  DOM.addIngredientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addCustomIngredient(DOM.inputName.value, DOM.inputQuantity.value);
    DOM.inputName.value = '';
    DOM.inputQuantity.value = '';
    DOM.inputName.focus();
  });

  // 1단계 -> 2단계 이동
  DOM.btnGoToStep2.addEventListener('click', () => switchStep(2));
  // 2단계 -> 1단계 복귀
  DOM.btnBackToStep1.addEventListener('click', () => switchStep(1));

  // 2단계 프로필 수정 링크 클릭 시 3단계 프로필 탭으로 바로 이동
  DOM.btnGoToProfileSettings.addEventListener('click', () => {
    switchStep(3);
    switchSubTab('profile');
  });

  // 2단계 조리 옵션 폼 제출
  DOM.recipeOptionsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateRecipes();
  });
  DOM.btnRegenerate.addEventListener('click', () => generateRecipes());

  // 모달 닫기
  DOM.btnCloseModal.addEventListener('click', closeRecipeModal);
  DOM.recipeDetailModal.addEventListener('click', (e) => {
    if (e.target === DOM.recipeDetailModal) closeRecipeModal();
  });

  // 모달 별점 클릭 이벤트
  const starBtns = DOM.modalStarRating.querySelectorAll('.star-btn');
  starBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.getAttribute('data-value'), 10);
      setStarRatingUI(val);
    });
  });

  // 모달 레시피 저장 및 공유 버튼
  DOM.btnSaveRecipe.addEventListener('click', toggleSaveCurrentRecipe);
  DOM.btnShareRecipe.addEventListener('click', shareCurrentRecipe);

  // 타이머 컨트롤
  DOM.btnTimerToggle.addEventListener('click', toggleTimer);
  DOM.btnTimerReset.addEventListener('click', resetTimer);
  DOM.btnTimerClose.addEventListener('click', closeTimer);

  // 3단계 서브탭 전환
  DOM.tabBtnRecipeBook.addEventListener('click', () => switchSubTab('book'));
  DOM.tabBtnProfile.addEventListener('click', () => switchSubTab('profile'));

  // 3단계 레시피 북 검색 & 정렬
  DOM.inputRecipeSearch.addEventListener('input', (e) => {
    AppState.bookSearchQuery = e.target.value;
    renderSavedRecipes();
  });
  DOM.selectBookSort.addEventListener('change', (e) => {
    AppState.bookSort = e.target.value;
    renderSavedRecipes();
  });
  DOM.btnExportJson.addEventListener('click', exportRecipesJson);
  DOM.btnGoStep1FromBook.addEventListener('click', () => switchStep(1));

  // 레시피 북 필터 버튼
  const filterBtns = DOM.bookTagsFilter.querySelectorAll('.tag-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.bookFilter = btn.getAttribute('data-filter');
      renderSavedRecipes();
    });
  });

  // 3단계 프로필 아바타 선택
  const avatars = DOM.avatarSelector.querySelectorAll('.avatar-option');
  avatars.forEach(av => {
    av.addEventListener('click', () => {
      avatars.forEach(a => a.classList.remove('active'));
      av.classList.add('active');
      AppState.profile.avatar = av.getAttribute('data-avatar');
    });
  });

  // 3단계 프로필 기피 재료 프리셋 칩 클릭
  const presetChips = DOM.allergyPresetChips.querySelectorAll('.chip-toggle');
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const ing = chip.getAttribute('data-ingredient');
      toggleAllergyItem(ing);
    });
  });

  // 3단계 커스텀 기피 재료 추가
  DOM.btnAddCustomAllergy.addEventListener('click', addCustomAllergy);
  DOM.inputCustomAllergy.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomAllergy();
    }
  });

  // 프로필 폼 저장 및 데이터 초기화
  DOM.profileForm.addEventListener('submit', handleProfileSubmit);
  DOM.btnResetAllData.addEventListener('click', resetAllData);

  // ESC 키 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !DOM.recipeDetailModal.classList.contains('hidden')) {
      closeRecipeModal();
    }
  });
}

// 애플리케이션 초기 로드
document.addEventListener('DOMContentLoaded', () => {
  loadProfileFromStorage();
  loadSavedRecipesFromStorage();
  initEvents();
  renderIngredients();
  bindProfileToForm();
});
