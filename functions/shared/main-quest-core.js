(function (root, factory) {
  const skills = root.EverrealmSkills || (typeof require === "function" ? require("./skill-core.js") : null);
  const api = factory(skills);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmMainQuest = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Skills) {
  "use strict";

  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  }

  const QUESTS = freeze([
    {
      id: "main-1",
      number: 1,
      requiredLevel: 5,
      title: "冒險者的第一步",
      objectiveType: "commission-stars",
      objectiveText: "完成 1★、2★、3★ 公會委託各一次",
      reward: { manualStar: 1, panelId: "adventurer", panelName: "冒險者面板" },
    },
    {
      id: "main-2",
      number: 2,
      requiredLevel: 10,
      title: "戰場的基本功",
      objectiveType: "quiz",
      objectiveText: "通過艾利斯的戰鬥知識問答",
      reward: { manualStar: 2, panelId: "skilled_adventurer", panelName: "熟練冒險者面板" },
    },
    {
      id: "main-3",
      number: 3,
      requiredLevel: 15,
      title: "會長的認同",
      objectiveType: "guildmaster-recognition",
      objectiveText: "在接下任務後，再次取得公會會長洛琪希的認同",
      reward: { manualStar: 3, panelId: "veteran_adventurer", panelName: "資深冒險者面板" },
    },
  ]);

  const QUIZ_QUESTIONS = freeze([
    {
      id: "ap-gain",
      prompt: "每個新回合開始時，角色通常會增加幾多 AP？",
      choices: ["5 AP", "10 AP", "20 AP", "全部回滿"],
      correctIndex: 1,
      explanation: "每回合會增加 10 AP；高消耗技能要預先留 AP。",
    },
    {
      id: "rear-damage",
      prompt: "如果成功從敵人背後命中，通常會有甚麼好處？",
      choices: ["傷害會提高", "傷害會降低", "必定 Miss", "完全沒有分別"],
      correctIndex: 0,
      explanation: "背後攻擊有較高位置傷害加成。",
    },
    {
      id: "speed-grade",
      prompt: "同一回合雙方都出手時，技能速度級別通常有甚麼作用？",
      choices: ["決定金幣掉落", "影響出手先後", "只影響動畫", "決定移動格數"],
      correctIndex: 1,
      explanation: "速度級別會影響行動順序；較快的技能通常會先出手。",
    },
    {
      id: "friendly-fire",
      prompt: "範圍攻擊覆蓋到友軍時，應該注意甚麼？",
      choices: ["自己人永遠免疫", "有可能連友軍也會命中", "只會回復自己人", "範圍技能不會命中任何單位"],
      correctIndex: 1,
      explanation: "戰場存在友軍傷害，選擇落點時要特別注意。",
    },
    {
      id: "ap-shortage",
      prompt: "如果目前 AP 不足以支付技能消耗，最合理的做法是？",
      choices: ["照用，之後先扣", "技能會免費", "今輪改用其他行動或留 AP", "直接跳過前置技能"],
      correctIndex: 2,
      explanation: "AP 不足時無法強行使用技能，應改用其他行動或累積 AP。",
    },
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function whole(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.trunc(number))) : fallback;
  }

  function getQuest(id) {
    const key = String(id || "").trim();
    return QUESTS.find((quest) => quest.id === key) || null;
  }

  const BOUND_CHOICE_ENVELOPE_STARS = freeze([...new Set(QUESTS.map((quest) => whole(quest.reward?.manualStar, 0, 0, 99)).filter(Boolean))]);

  function emptyBoundChoiceEnvelopes() {
    return Object.fromEntries(BOUND_CHOICE_ENVELOPE_STARS.map((star) => [star, 0]));
  }

  function emptyProgress() {
    return {
      commissionStars: { 1: false, 2: false, 3: false },
      quizIndex: 0,
      nextQuizDay: 0,
      guildmasterRecognition: false,
    };
  }

  function emptyState() {
    return {
      schemaVersion: 2,
      activeQuestId: null,
      status: "idle",
      completedQuestIds: [],
      boundChoiceEnvelopes: emptyBoundChoiceEnvelopes(),
      progress: emptyProgress(),
    };
  }

  function normalizeState(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const completed = [...new Set((Array.isArray(source.completedQuestIds) ? source.completedQuestIds : [])
      .map((id) => String(id || "").trim()).filter((id) => getQuest(id)))];
    const activeQuestId = getQuest(source.activeQuestId) && !completed.includes(String(source.activeQuestId))
      ? String(source.activeQuestId)
      : null;
    const progressSource = source.progress && typeof source.progress === "object" ? source.progress : {};
    const stars = progressSource.commissionStars && typeof progressSource.commissionStars === "object"
      ? progressSource.commissionStars
      : {};
    const progress = emptyProgress();
    for (const star of [1, 2, 3]) progress.commissionStars[star] = Boolean(stars[star]);
    progress.quizIndex = whole(progressSource.quizIndex, 0, 0, QUIZ_QUESTIONS.length);
    progress.nextQuizDay = whole(progressSource.nextQuizDay, 0, 0, Number.MAX_SAFE_INTEGER);
    progress.guildmasterRecognition = Boolean(progressSource.guildmasterRecognition);
    const envelopeSource = source.boundChoiceEnvelopes && typeof source.boundChoiceEnvelopes === "object"
      ? source.boundChoiceEnvelopes
      : {};
    const boundChoiceEnvelopes = emptyBoundChoiceEnvelopes();
    for (const star of BOUND_CHOICE_ENVELOPE_STARS) boundChoiceEnvelopes[star] = whole(envelopeSource[star], 0, 0, 9999);
    let status = activeQuestId && ["active", "ready_to_claim"].includes(source.status) ? source.status : activeQuestId ? "active" : "idle";
    const active = getQuest(activeQuestId);
    if (active?.objectiveType === "commission-stars" && [1, 2, 3].every((star) => progress.commissionStars[star])) status = "ready_to_claim";
    if (active?.objectiveType === "quiz" && progress.quizIndex >= QUIZ_QUESTIONS.length) status = "ready_to_claim";
    if (active?.objectiveType === "guildmaster-recognition" && progress.guildmasterRecognition) status = "ready_to_claim";
    return { schemaVersion: 2, activeQuestId, status, completedQuestIds: completed, boundChoiceEnvelopes, progress };
  }

  function nextIncompleteQuest(rawState) {
    const state = normalizeState(rawState);
    return QUESTS.find((quest) => !state.completedQuestIds.includes(quest.id)) || null;
  }

  function availableQuest(rawState, level) {
    const state = normalizeState(rawState);
    if (state.activeQuestId) return null;
    const next = nextIncompleteQuest(state);
    return next && whole(level, 1, 1, 999) >= next.requiredLevel ? next : null;
  }

  function nextLockedQuest(rawState) {
    const state = normalizeState(rawState);
    if (state.activeQuestId) return null;
    return nextIncompleteQuest(state);
  }

  function activeQuest(rawState) {
    const state = normalizeState(rawState);
    return getQuest(state.activeQuestId);
  }

  function start(rawState, questId, level) {
    const state = normalizeState(rawState);
    if (state.activeQuestId) return { ok: false, reason: "already-active", state, quest: activeQuest(state) };
    const quest = getQuest(questId);
    if (!quest) return { ok: false, reason: "not-found", state, quest: null };
    const next = nextIncompleteQuest(state);
    if (!next || next.id !== quest.id) return { ok: false, reason: "out-of-order", state, quest };
    if (whole(level, 1, 1, 999) < quest.requiredLevel) return { ok: false, reason: "level", state, quest };
    return {
      ok: true,
      reason: null,
      quest,
      state: {
        ...state,
        activeQuestId: quest.id,
        status: "active",
        progress: emptyProgress(),
      },
    };
  }

  function recordCommissionReport(rawState, star) {
    const state = normalizeState(rawState);
    const quest = activeQuest(state);
    if (!quest || quest.objectiveType !== "commission-stars" || state.status !== "active") return { changed: false, state, quest };
    const safeStar = whole(star, 0, 0, 99);
    if (![1, 2, 3].includes(safeStar) || state.progress.commissionStars[safeStar]) return { changed: false, state, quest };
    const next = clone(state);
    next.progress.commissionStars[safeStar] = true;
    if ([1, 2, 3].every((value) => next.progress.commissionStars[value])) next.status = "ready_to_claim";
    return { changed: true, state: next, quest, completedObjective: next.status === "ready_to_claim" };
  }

  function currentQuizQuestion(rawState) {
    const state = normalizeState(rawState);
    const quest = activeQuest(state);
    if (!quest || quest.objectiveType !== "quiz" || state.status !== "active") return null;
    return QUIZ_QUESTIONS[state.progress.quizIndex] || null;
  }

  function answerQuiz(rawState, questionId, answerIndex, currentDay) {
    const state = normalizeState(rawState);
    const quest = activeQuest(state);
    if (!quest || quest.objectiveType !== "quiz") return { ok: false, reason: "not-active-quiz", state, quest, correct: false };
    if (state.status === "ready_to_claim") return { ok: false, reason: "already-complete", state, quest, correct: true };
    const day = whole(currentDay, 0, 0, Number.MAX_SAFE_INTEGER);
    if (day < 1) return { ok: false, reason: "quiz-day-required", state, quest, correct: false };
    if (state.progress.nextQuizDay > day) {
      return { ok: false, reason: "quiz-cooldown", state, quest, correct: false, nextQuizDay: state.progress.nextQuizDay };
    }
    const question = QUIZ_QUESTIONS[state.progress.quizIndex];
    if (!question || question.id !== String(questionId || "")) return { ok: false, reason: "question-mismatch", state, quest, correct: false };
    const selected = whole(answerIndex, -1, -1, 99);
    if (selected !== question.correctIndex) {
      const next = clone(state);
      next.progress.nextQuizDay = day + 1;
      return { ok: true, reason: "wrong-answer", state: next, quest, correct: false, question, explanation: question.explanation, nextQuizDay: next.progress.nextQuizDay };
    }
    const next = clone(state);
    next.progress.nextQuizDay = 0;
    next.progress.quizIndex = Math.min(QUIZ_QUESTIONS.length, next.progress.quizIndex + 1);
    if (next.progress.quizIndex >= QUIZ_QUESTIONS.length) next.status = "ready_to_claim";
    return { ok: true, reason: null, state: next, quest, correct: true, question, explanation: question.explanation, completedObjective: next.status === "ready_to_claim" };
  }

  function recordGuildmasterRecognition(rawState) {
    const state = normalizeState(rawState);
    const quest = activeQuest(state);
    if (!quest || quest.objectiveType !== "guildmaster-recognition" || state.status !== "active") return { changed: false, state, quest };
    const next = clone(state);
    next.progress.guildmasterRecognition = true;
    next.status = "ready_to_claim";
    return { changed: true, state: next, quest, completedObjective: true };
  }

  function choiceSkillPool(rawSkillState, star) {
    const skills = Skills.normalizeSkillState(rawSkillState);
    const safeStar = whole(star, 0, 0, 99);
    const pool = skills.classId === "fighter"
      ? Skills.getFighterGuildBookPool(safeStar)
      : Skills.getSkillsByStar(safeStar, { classId: skills.classId });
    const learned = new Set((skills.unlockedSkillIds || []).map((id) => Skills.canonicalSkillId?.(id) || String(id)));
    const unlearned = pool.filter((skill) => !learned.has(skill.id));
    const choices = unlearned.length ? unlearned : pool;
    return choices.map((skill) => ({ id: skill.id, name: skill.name, description: skill.description, apCost: skill.apCost, speedGrade: skill.speedGrade }));
  }

  function rewardSkillPool(rawState, rawSkillState) {
    const state = normalizeState(rawState);
    const quest = activeQuest(state);
    if (!quest || state.status !== "ready_to_claim") return [];
    return choiceSkillPool(rawSkillState, quest.reward.manualStar);
  }

  function claim(rawState) {
    const state = normalizeState(rawState);
    const quest = activeQuest(state);
    if (!quest) return { ok: false, reason: "not-active", state, quest: null };
    if (state.status !== "ready_to_claim") return { ok: false, reason: "not-ready", state, quest };
    const next = clone(state);
    const envelopeStar = whole(quest.reward.manualStar, 0, 0, 99);
    if (!BOUND_CHOICE_ENVELOPE_STARS.includes(envelopeStar)) return { ok: false, reason: "invalid-reward-star", state, quest };
    next.boundChoiceEnvelopes[envelopeStar] = Math.min(9999, whole(next.boundChoiceEnvelopes[envelopeStar], 0, 0, 9999) + 1);
    next.completedQuestIds = [...new Set([...next.completedQuestIds, quest.id])];
    next.activeQuestId = null;
    next.status = "idle";
    next.progress = emptyProgress();
    return {
      ok: true,
      reason: null,
      state: next,
      quest,
      reward: { ...clone(quest.reward), boundChoiceEnvelopeStar: envelopeStar },
    };
  }

  function consumeBoundChoiceEnvelope(rawState, star) {
    const state = normalizeState(rawState);
    const safeStar = whole(star, 0, 0, 99);
    if (!BOUND_CHOICE_ENVELOPE_STARS.includes(safeStar)) return { ok: false, reason: "invalid-star", state };
    if (whole(state.boundChoiceEnvelopes[safeStar], 0) < 1) return { ok: false, reason: "no-envelope", state };
    const next = clone(state);
    next.boundChoiceEnvelopes[safeStar] -= 1;
    return { ok: true, reason: null, star: safeStar, state: next };
  }

  function view(rawState, level) {
    const state = normalizeState(rawState);
    const active = activeQuest(state);
    if (active) {
      let progressText = "";
      let progressValue = 0;
      let progressMax = 1;
      if (active.objectiveType === "commission-stars") {
        const done = [1, 2, 3].filter((star) => state.progress.commissionStars[star]);
        progressValue = done.length;
        progressMax = 3;
        progressText = [1, 2, 3].map((star) => `${star}★ ${state.progress.commissionStars[star] ? "✓" : "－"}`).join("　");
      } else if (active.objectiveType === "quiz") {
        progressValue = state.progress.quizIndex;
        progressMax = QUIZ_QUESTIONS.length;
        progressText = `${Math.min(progressValue, progressMax)} / ${progressMax}`;
      } else {
        progressValue = state.progress.guildmasterRecognition ? 1 : 0;
        progressMax = 1;
        progressText = state.progress.guildmasterRecognition ? "已取得認同" : "尚未取得認同";
      }
      return {
        state: "active",
        quest: active,
        ready: state.status === "ready_to_claim",
        objectiveText: active.objectiveText,
        progressText,
        progressValue,
        progressMax,
      };
    }
    const available = availableQuest(state, level);
    if (available) return { state: "available", quest: available, ready: false, objectiveText: "返回公會找資深冒險者艾利斯", progressText: "可以開始" };
    const next = nextLockedQuest(state);
    if (next) return { state: "locked", quest: next, ready: false, objectiveText: `Lv.${next.requiredLevel} 開放`, progressText: "" };
    return { state: "complete", quest: null, ready: false, objectiveText: "目前主線已完成", progressText: "" };
  }

  return Object.freeze({
    QUESTS,
    QUIZ_QUESTIONS,
    BOUND_CHOICE_ENVELOPE_STARS,
    emptyState,
    normalizeState,
    getQuest,
    nextIncompleteQuest,
    availableQuest,
    nextLockedQuest,
    activeQuest,
    start,
    recordCommissionReport,
    currentQuizQuestion,
    answerQuiz,
    recordGuildmasterRecognition,
    choiceSkillPool,
    rewardSkillPool,
    claim,
    consumeBoundChoiceEnvelope,
    view,
  });
});
