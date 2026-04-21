(function () {
  "use strict";

  const helper = window.KeepersHelper;
  if (!helper || typeof helper.registerModule !== "function") {
    console.warn("[KeepersHelper/Battle] Core module is missing.");
    return;
  }

  helper.registerModule("battle-detector", (core) => {
    const CONFIG = {
      // [Общее] Базовая "человеческая" задержка перед авто-действиями (в миллисекундах).
      reactionDelayMs: 900,
      // [Общее] Случайный разброс к reactionDelayMs (0..reactionJitterMs).
      reactionJitterMs: 400,
      // [Фаза 1] Ожидание готовности UI после CARD_SELECTION (до показа/клика карт).
      cardSelectionUiReadyMs: 950,
      // [Фаза 1] Разброс задержки готовности UI карт.
      cardSelectionUiReadyJitterMs: 150,
      // [Фаза 1] Пауза между кликом по карте и поиском кнопки "В бой!".
      cardDomConfirmDelayMs: 450,
      // [Фаза 2] Ожидание готовности UI кубиков после входа в DICE_SELECTION.
      diceSelectionUiReadyMs: 700,
      // [Фаза 2] Разброс задержки готовности UI кубиков.
      diceSelectionUiReadyJitterMs: 120,
      // [ROUND_END] Через сколько мс после старта фазы пробовать нативный skip-анимации.
      battleFastSkipDelayMs: 450,
      // [ROUND_END] Интервал между первым и вторым click для нативного skip.
      battleFastSkipSecondClickMs: 140,
      // [Фаза 2] Во сколько раз ускорять TweenMax только для анимации броска кубиков.
      diceRollAnimBoostScale: 3.2,
      // [Фаза 2] Длительность временного ускорения броска кубиков.
      diceRollAnimBoostDurationMs: 1400,
      // [Детектор] Частота проверки battle popup.
      popupPollMs: 600,
      // [Детектор] Сколько "промахов" popup подряд считать окончанием боя.
      popupMissThreshold: 3,
    };

    const state = {
      battleActive: false,
      readyLogged: false,
      autoEnabled: true,
      popupMisses: 0,
      currentPhase: null,
      currentPhaseSource: null,
      lastRecommendationKey: null,
      lastAutoCardKey: null,
      autoSelectionPendingKey: null,
      recommendationUiWaitKey: null,
      lastDiceRecommendationKey: null,
      diceRecommendationUiWaitKey: null,
      diceWarmupSkippedKey: null,
      lastAutoDiceKey: null,
      diceAutoPendingKey: null,
      battleFastSkipPending: false,
      diceAnimBoostActive: false,
      diceAnimPrevScale: 1,
      diceAnimBoostTimer: null,
      cardSelectionGen: 0,
      noContextLogged: false,
      powerErrorLogged: false,
      lastBattleSnapshotKey: null,
      noSnapshotCardsLogged: false,
      selectionIndicesLogged: false,
      cardSelectionDebugLogged: false,
      commandHooksInstalled: 0,
      commandHookScanTimer: null,
      pollTimer: null,
      overlay: null,
      autoButton: null,
    };

    function log(...args) {
      core.log("[AutoBattle]", ...args);
    }

    function randomDelay() {
      const jitter = Math.max(0, CONFIG.reactionJitterMs);
      return CONFIG.reactionDelayMs + Math.floor(Math.random() * (jitter + 1));
    }

    function cardSelectionUiReadyDelay() {
      const jitter = Math.max(0, CONFIG.cardSelectionUiReadyJitterMs);
      return CONFIG.cardSelectionUiReadyMs + Math.floor(Math.random() * (jitter + 1));
    }

    function diceSelectionUiReadyDelay() {
      const jitter = Math.max(0, CONFIG.diceSelectionUiReadyJitterMs);
      return CONFIG.diceSelectionUiReadyMs + Math.floor(Math.random() * (jitter + 1));
    }

    function safeGetBattlePopup() {
      try {
        if (!window.app || !app.Popups || !app.Popups.getLast) return null;
        const p = app.Popups.getLast();
        if (!p || !p.cfg) return null;
        return p.cfg.id === "BATTLE" ? p : null;
      } catch (err) {
        log("safeGetBattlePopup failed:", err);
        return null;
      }
    }

    /** Прямой Network.command(BattleCardSelected) не вызывает колбэки BattlePage — UI остаётся на выборе. Дублируем шаги клиента. */
    function listBattleCardChoiceRoots(popup) {
      const el = popup?.scroll?.el;
      if (!el) return [];
      return Array.from(el.children).filter((node) => node?.classList?.contains("sh_card"));
    }

    function findBattleCardConfirmControl(popup) {
      const root = popup?.scroll?.el;
      if (!root) return null;
      const links = root.querySelectorAll("a.btn_g, a.btn_gs, a");
      for (const a of links) {
        const t = (a.textContent || "").trim();
        if (t === "В бой!" || t.startsWith("В бой")) return a;
      }
      return null;
    }

    function listBattleDiceItems(popup) {
      const root = popup?.scroll?.el;
      if (!root) return [];
      return Array.from(root.querySelectorAll(".dice_block .dice_item"));
    }

    function isDiceItemSelected(el) {
      if (!el) return false;
      const mark = el.querySelector(".dice_item_selected");
      if (!mark) return false;
      return mark.style.display !== "none";
    }

    function countSelectedDiceItems(items) {
      if (!Array.isArray(items)) return 0;
      let n = 0;
      for (const el of items) {
        if (isDiceItemSelected(el)) n += 1;
      }
      return n;
    }

    function findDiceRollControl(popup) {
      const root = popup?.scroll?.el;
      if (!root) return null;
      const links = root.querySelectorAll("a.btn_g, a.btn_gs, a");
      for (const a of links) {
        const t = (a.textContent || "").trim();
        if (t === "Бросить" || t.startsWith("Бросить") || t === "В бой!" || t.startsWith("В бой")) return a;
      }
      return null;
    }

    function triggerBattleFastSkip(reason) {
      if (!state.autoEnabled) return;
      if (state.battleFastSkipPending) return;
      state.battleFastSkipPending = true;
      log(`Фаза BATTLE: планируем ускорение анимации. (${reason})`);

      const delay = Math.max(0, CONFIG.battleFastSkipDelayMs);
      const secondMs = Math.max(60, CONFIG.battleFastSkipSecondClickMs);
      setTimeout(() => {
        const popup = safeGetBattlePopup();
        const brd = popup?.els?.brd_r;
        if (!popup || !brd) {
          log(`Фаза BATTLE: ускорение отменено — popup/brd недоступны. (${reason})`);
          state.battleFastSkipPending = false;
          return;
        }
        const findBattleSkipOverlay = () => {
          const kids = Array.from(brd.children || []);
          return kids.reverse().find((el) => {
            if (!el || typeof el.onclick !== "function") return false;
            if (el.tagName !== "DIV") return false;
            const cs = window.getComputedStyle(el);
            if (!cs) return false;
            return cs.opacity === "0" && cs.pointerEvents !== "none";
          });
        };

        const clickOverlayTwice = (overlay) => {
          try {
            overlay.onclick();
          } catch (_e) {
            overlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
          }
          setTimeout(() => {
            try {
              overlay.onclick();
            } catch (_e) {
              overlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            }
          }, secondMs);
        };

        const tryApply = (attempt = 0) => {
          if (!state.autoEnabled) {
            state.battleFastSkipPending = false;
            return;
          }
          const pNow = safeGetBattlePopup();
          const brdNow = pNow?.els?.brd_r;
          if (!pNow || !brdNow) {
            state.battleFastSkipPending = false;
            return;
          }
          const overlay = findBattleSkipOverlay();
          if (!overlay) {
            if (attempt < 12) {
              setTimeout(() => tryApply(attempt + 1), 100);
              return;
            }
            state.battleFastSkipPending = false;
            log(`Фаза BATTLE: ускорение не применилось — не найден штатный overlay skip. (${reason})`);
            return;
          }
          clickOverlayTwice(overlay);
          state.battleFastSkipPending = false;
          log(`Фаза BATTLE: ускоряем анимацию через штатный overlay-click x2. (${reason})`);
        };

        tryApply(0);
      }, delay);
    }

    function triggerDiceRollAnimationBoost(reason) {
      if (!state.autoEnabled) return;
      if (!window.TweenMax || typeof TweenMax.globalTimeScale !== "function") return;
      if (state.diceAnimBoostActive) return;

      const boostScale = Math.max(1, CONFIG.diceRollAnimBoostScale);
      const durationMs = Math.max(200, CONFIG.diceRollAnimBoostDurationMs);
      state.diceAnimPrevScale = TweenMax.globalTimeScale();
      TweenMax.globalTimeScale(boostScale);
      state.diceAnimBoostActive = true;
      log(`Фаза DICE: ускоряем анимацию броска x${boostScale}. (${reason})`);

      if (state.diceAnimBoostTimer) {
        clearTimeout(state.diceAnimBoostTimer);
      }
      state.diceAnimBoostTimer = setTimeout(() => {
        const backTo =
          typeof state.diceAnimPrevScale === "number" && Number.isFinite(state.diceAnimPrevScale)
            ? state.diceAnimPrevScale
            : 1;
        TweenMax.globalTimeScale(backTo);
        state.diceAnimBoostActive = false;
        state.diceAnimPrevScale = 1;
        state.diceAnimBoostTimer = null;
        log(`Фаза DICE: возвращаем скорость анимации x${backTo}.`);
      }, durationMs);
    }

    function performAutobattleCardDom(bestIdx, best, sourceLabel, scoredKey, gen) {
      const popup = safeGetBattlePopup();
      if (!popup) {
        log("Фаза 1: автовыбор DOM — попап BATTLE не найден.");
        state.autoSelectionPendingKey = null;
        return;
      }
      const roots = listBattleCardChoiceRoots(popup);
      if (!roots[bestIdx]) {
        log(
          `Фаза 1: автовыбор DOM — нет карты idx=${bestIdx} (элементов .sh_card среди детей scroll: ${roots.length}). (${sourceLabel})`
        );
        state.autoSelectionPendingKey = null;
        return;
      }

      roots[bestIdx].click();

      const confirmMs = Math.max(100, CONFIG.cardDomConfirmDelayMs);
      setTimeout(() => {
        if (gen !== state.cardSelectionGen) {
          state.autoSelectionPendingKey = null;
          return;
        }
        if (!state.autoEnabled) {
          state.autoSelectionPendingKey = null;
          return;
        }
        if (state.currentPhase !== "CARD_SELECTION") {
          state.autoSelectionPendingKey = null;
          return;
        }

        const p2 = safeGetBattlePopup();
        const confirm = findBattleCardConfirmControl(p2);
        if (!confirm) {
          log("Фаза 1: автовыбор DOM — кнопка «В бой!» не найдена после клика по карте.");
          state.autoSelectionPendingKey = null;
          return;
        }
        confirm.click();
        state.lastAutoCardKey = scoredKey;
        state.autoSelectionPendingKey = null;
        log(
          `Фаза 1: автовыбор через UI (карта + «В бой!»): idx=${best.idx}, id=${best.id}, name="${best.name}", power=${best.power}, dmgMagic=${best.dmg.magic}, dmgNormal=${best.dmg.normal}. (${sourceLabel})`
        );
      }, confirmMs);
    }

    function updateOverlay() {
      if (!state.overlay) return;
      const status = state.battleActive ? "BATTLE" : "IDLE";
      state.overlay.querySelector(".ab-status").textContent = status;
      if (state.autoButton) {
        if (state.autoEnabled) {
          state.autoButton.style.background = "#0b7fff";
          state.autoButton.style.borderColor = "#60a8ff";
          state.autoButton.style.boxShadow = "0 0 8px rgba(11, 127, 255, 0.6)";
        } else {
          state.autoButton.style.background = "#2b2b2b";
          state.autoButton.style.borderColor = "#777";
          state.autoButton.style.boxShadow = "none";
        }
      }
    }

    function ensureOverlay() {
      if (state.overlay) return;
      const root = document.createElement("div");
      root.id = "ab-overlay";
      root.style.position = "fixed";
      root.style.top = "12px";
      root.style.right = "12px";
      root.style.zIndex = "999999";
      root.style.background = "rgba(0, 0, 0, 0.75)";
      root.style.color = "#fff";
      root.style.padding = "8px 10px";
      root.style.border = "1px solid rgba(255, 255, 255, 0.25)";
      root.style.borderRadius = "8px";
      root.style.fontFamily = "Arial, sans-serif";
      root.style.fontSize = "12px";
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.gap = "6px";

      const status = document.createElement("div");
      status.className = "ab-status";
      status.textContent = "IDLE";

      const autoBtn = document.createElement("button");
      autoBtn.type = "button";
      autoBtn.textContent = "Автобой";
      autoBtn.style.cursor = "pointer";
      autoBtn.style.border = "1px solid #777";
      autoBtn.style.borderRadius = "6px";
      autoBtn.style.padding = "4px 8px";
      autoBtn.style.background = "#2b2b2b";
      autoBtn.style.color = "#fff";
      autoBtn.addEventListener("click", () => {
        state.autoEnabled = !state.autoEnabled;
        state.cardSelectionGen += 1;
        log("Автобой:", state.autoEnabled ? "вкл" : "выкл");
        updateOverlay();
      });

      root.appendChild(status);
      root.appendChild(autoBtn);
      document.body.appendChild(root);
      state.overlay = root;
      state.autoButton = autoBtn;
      updateOverlay();
    }

    function getCardId(card, fallbackIdx) {
      if (!card || typeof card !== "object") return `idx:${fallbackIdx}`;
      return card.card ?? card.id ?? card.cardId ?? card.cid ?? card.card?.id ?? `idx:${fallbackIdx}`;
    }

    function isValidCardId(cardId) {
      if (typeof cardId !== "number" || !Number.isFinite(cardId)) return false;
      if (!window.app || !app.CFGUtil || typeof app.CFGUtil.getCardByID !== "function") return false;
      try {
        return Boolean(app.CFGUtil.getCardByID(cardId));
      } catch (_err) {
        return false;
      }
    }

    function getCardPower(cardId) {
      if (!isValidCardId(cardId)) return null;
      try {
        if (!window.app || !app.UserUtil || typeof app.UserUtil.getCardPower !== "function") {
          return null;
        }
        const power = app.UserUtil.getCardPower(cardId);
        return typeof power === "number" && Number.isFinite(power) ? power : null;
      } catch (err) {
        if (!state.powerErrorLogged) {
          state.powerErrorLogged = true;
          log("getCardPower failed once:", err);
        }
        return null;
      }
    }

    function getCardName(cardId) {
      if (!isValidCardId(cardId)) return `id:${cardId}`;
      try {
        const cfgCard = app.CFGUtil.getCardByID(cardId);
        if (cfgCard && typeof cfgCard.name === "string" && cfgCard.name.trim()) {
          return cfgCard.name.trim();
        }
      } catch (_err) {
        // no-op, fallback below
      }
      return `id:${cardId}`;
    }

    function isCardLike(entry) {
      if (!entry || typeof entry !== "object") return false;
      const cardId = entry.card ?? entry.id ?? entry.cardId ?? entry.cid ?? entry.card?.id;
      return typeof cardId === "number" && Number.isFinite(cardId);
    }

    function isSelectableHandLength(n) {
      return Number.isInteger(n) && n >= 1 && n <= 3;
    }

    function findCardSelectionContext(root, rootLabel) {
      const queue = [{ value: root, depth: 0, path: rootLabel }];
      const seen = new Set();
      const strictCandidates = [];
      const looseCandidates = [];

      while (queue.length > 0) {
        const { value, depth, path } = queue.shift();
        if (!value || typeof value !== "object") continue;
        if (seen.has(value)) continue;
        seen.add(value);

        const stateValue = value.state || value.s;
        const cards = value.cards || value.c || value.list;

        if (
          Array.isArray(cards) &&
          isSelectableHandLength(cards.length) &&
          cards.every((c) => c && typeof c === "object")
        ) {
          const ids = cards.map((c, idx) => getCardId(c, idx));
          const validCardCount = ids.filter((id) => isValidCardId(id)).length;
          const candidate = { cards, source: value, path, stateValue, validCardCount };
          if (stateValue === "CARD_SELECTION" && validCardCount > 0) {
            strictCandidates.push(candidate);
          } else if (
            validCardCount === cards.length &&
            isSelectableHandLength(cards.length) &&
            /battle/i.test(path)
          ) {
            looseCandidates.push(candidate);
          }
        }

        if (depth >= 7) continue;
        for (const [key, nested] of Object.entries(value)) {
          if (nested && typeof nested === "object") {
            queue.push({ value: nested, depth: depth + 1, path: `${path}.${key}` });
          }
        }
      }

      if (strictCandidates.length > 0) {
        strictCandidates.sort((a, b) => b.validCardCount - a.validCardCount);
        return strictCandidates[0];
      }
      if (looseCandidates.length > 0) {
        looseCandidates.sort((a, b) => b.validCardCount - a.validCardCount);
        return looseCandidates[0];
      }
      return null;
    }

    function getSearchRoots(popup) {
      const roots = [];
      if (!popup) return roots;
      roots.push({ value: popup, label: "popup" });
      if (popup.tmp) roots.push({ value: popup.tmp, label: "popup.tmp" });
      if (popup.cfg) roots.push({ value: popup.cfg, label: "popup.cfg" });
      if (popup.cfg && popup.cfg.options) roots.push({ value: popup.cfg.options, label: "popup.cfg.options" });
      return roots;
    }

    function normalizePhase(value) {
      if (typeof value !== "string") return null;
      const phase = value.trim().toUpperCase();
      const known = new Set([
        "INIT_BATTLE",
        "CARD_SELECTION",
        "DICE_SELECTION",
        "DICE_END",
        "ENEMY_WAIT",
        "ENEMY_READY",
        "BATTLE",
        "BATTLE_FAST",
        "ROUND_END",
        "FAST_ROUND",
        "END",
      ]);
      return known.has(phase) ? phase : null;
    }

    function detectPhase(popup) {
      const roots = getSearchRoots(popup);
      const candidates = [];

      for (const root of roots) {
        const queue = [{ value: root.value, depth: 0, path: root.label }];
        const seen = new Set();

        while (queue.length > 0) {
          const { value, depth, path } = queue.shift();
          if (!value || typeof value !== "object") continue;
          if (seen.has(value)) continue;
          seen.add(value);

          const stateVal = normalizePhase(value.state);
          const sVal = normalizePhase(value.s);
          const phase = stateVal || sVal;
          if (phase) {
            const score = /battle/i.test(path) ? 2 : 1;
            candidates.push({ phase, path, score });
          }

          if (depth >= 7) continue;
          for (const [key, nested] of Object.entries(value)) {
            if (nested && typeof nested === "object") {
              queue.push({ value: nested, depth: depth + 1, path: `${path}.${key}` });
            }
          }
        }
      }

      if (candidates.length === 0) return null;
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0];
    }

    function normalizePhaseFromBattleState(phase) {
      return normalizePhase(phase);
    }

    function getBattleStateFromSnapshot(battle) {
      if (!battle || typeof battle !== "object") return null;
      return normalizePhaseFromBattleState(battle.state);
    }

    function findSmallSelectableCardArrayInObject(root, rootLabel) {
      const queue = [{ value: root, depth: 0, path: rootLabel }];
      const seen = new Set();

      while (queue.length > 0) {
        const { value, depth, path } = queue.shift();
        if (!value || typeof value !== "object") continue;
        if (seen.has(value)) continue;
        seen.add(value);

        if (Array.isArray(value) && isSelectableHandLength(value.length)) {
          const ids = value.map((card, idx) => getCardId(card, idx));
          const validCount = ids.filter((id) => isValidCardId(id)).length;
          if (validCount === value.length && validCount >= 1) {
            return { cards: value, path, validCount };
          }
        }

        if (depth >= 8) continue;
        if (Array.isArray(value)) {
          value.forEach((nested, idx) => {
            if (nested && typeof nested === "object") {
              queue.push({ value: nested, depth: depth + 1, path: `${path}[${idx}]` });
            }
          });
        } else {
          for (const [key, nested] of Object.entries(value)) {
            if (nested && typeof nested === "object") {
              queue.push({ value: nested, depth: depth + 1, path: `${path}.${key}` });
            }
          }
        }
      }

      return null;
    }

    function getSelectableCardsFromBattleSnapshot(battle) {
      if (!battle || typeof battle !== "object") return null;

      const candidates = [
        battle.cards,
        battle.m1 && battle.m1.cards,
        battle.m1 && battle.m1.c,
      ];

      for (const cards of candidates) {
        if (
          Array.isArray(cards) &&
          isSelectableHandLength(cards.length) &&
          cards.every((card) => card && typeof card === "object")
        ) {
          return { cards, path: "battle.direct" };
        }
      }

      const deepResult = findSmallSelectableCardArrayInObject(battle, "battle");
      if (deepResult) {
        return { cards: deepResult.cards, path: deepResult.path };
      }

      return null;
    }

    function debugCardSelectionSnapshot(battle, source) {
      if (state.cardSelectionDebugLogged) return;
      state.cardSelectionDebugLogged = true;

      const topKeys = Object.keys(battle || {});
      const m1Keys = Object.keys((battle && battle.m1) || {});
      const arrays = [];

      const queue = [{ value: battle, depth: 0, path: "battle" }];
      const seen = new Set();
      while (queue.length > 0) {
        const { value, depth, path } = queue.shift();
        if (!value || typeof value !== "object") continue;
        if (seen.has(value)) continue;
        seen.add(value);

        if (Array.isArray(value)) {
          arrays.push({ path, len: value.length });
        }

        if (depth >= 3) continue;
        if (Array.isArray(value)) {
          value.forEach((nested, idx) => {
            if (nested && typeof nested === "object") {
              queue.push({ value: nested, depth: depth + 1, path: `${path}[${idx}]` });
            }
          });
        } else {
          for (const [key, nested] of Object.entries(value)) {
            if (nested && typeof nested === "object") {
              queue.push({ value: nested, depth: depth + 1, path: `${path}.${key}` });
            }
          }
        }
      }

      const shortArrays = arrays
        .filter((entry) => entry.len <= 10)
        .slice(0, 30);

      log(
        `CARD_SELECTION debug (${source}): topKeys=${topKeys.join(",")}; m1Keys=${m1Keys.join(",")}; arrays<=10=`,
        shortArrays
      );
    }

    function findSelectionIndicesInBattleSnapshot(battle) {
      const deck = Array.isArray(battle?.m1?.cards) ? battle.m1.cards : null;
      if (!deck || deck.length === 0) return null;

      const queue = [{ value: battle, depth: 0, path: "battle" }];
      const seen = new Set();
      const matches = [];

      while (queue.length > 0) {
        const { value, depth, path } = queue.shift();
        if (!value || typeof value !== "object") continue;
        if (seen.has(value)) continue;
        seen.add(value);

        if (
          Array.isArray(value) &&
          isSelectableHandLength(value.length) &&
          value.every((v) => Number.isInteger(v))
        ) {
          const inRange = value.every((idx) => idx >= 0 && idx < deck.length);
          if (inRange) {
            const cards = value.map((idx) => deck[idx]).filter(Boolean);
            if (cards.length === value.length) {
              matches.push({
                indices: value.slice(),
                cards,
                path,
              });
            }
          }
        }

        if (depth >= 8) continue;
        if (Array.isArray(value)) {
          value.forEach((nested, idx) => {
            if (nested && typeof nested === "object") {
              queue.push({ value: nested, depth: depth + 1, path: `${path}[${idx}]` });
            }
          });
        } else {
          for (const [key, nested] of Object.entries(value)) {
            if (nested && typeof nested === "object") {
              queue.push({ value: nested, depth: depth + 1, path: `${path}.${key}` });
            }
          }
        }
      }

      if (matches.length === 0) return null;
      return matches[0];
    }

    function setPhase(nextPhase, source) {
      if (!nextPhase && state.currentPhase) {
        log(`Phase ended: ${state.currentPhase}`);
        if (state.currentPhase === "DICE_SELECTION" && state.diceAnimBoostActive) {
          const backTo =
            typeof state.diceAnimPrevScale === "number" && Number.isFinite(state.diceAnimPrevScale)
              ? state.diceAnimPrevScale
              : 1;
          if (window.TweenMax && typeof TweenMax.globalTimeScale === "function") {
            TweenMax.globalTimeScale(backTo);
          }
          state.diceAnimBoostActive = false;
          state.diceAnimPrevScale = 1;
          if (state.diceAnimBoostTimer) {
            clearTimeout(state.diceAnimBoostTimer);
            state.diceAnimBoostTimer = null;
          }
        }
        if (state.currentPhase === "CARD_SELECTION") {
          state.autoSelectionPendingKey = null;
          state.lastAutoCardKey = null;
          state.lastRecommendationKey = null;
          state.recommendationUiWaitKey = null;
          state.cardSelectionGen += 1;
        }
        if (state.currentPhase === "DICE_SELECTION") {
          state.lastDiceRecommendationKey = null;
          state.diceRecommendationUiWaitKey = null;
          state.lastAutoDiceKey = null;
          state.diceAutoPendingKey = null;
          state.cardSelectionGen += 1;
        }
        state.currentPhase = null;
        state.currentPhaseSource = null;
        return;
      }
      if (!nextPhase) return;

      if (!state.currentPhase) {
        state.currentPhase = nextPhase;
        state.currentPhaseSource = source;
        log(`Phase started: ${nextPhase} (source: ${source})`);
        if (nextPhase === "DICE_SELECTION") {
          triggerDiceRollAnimationBoost(`phase-start:${source}`);
        }
        if (nextPhase === "ROUND_END") {
          triggerBattleFastSkip(`phase-start:${source}`);
        }
        return;
      }

      if (state.currentPhase !== nextPhase) {
        log(`Phase ended: ${state.currentPhase}`);
        if (state.currentPhase === "DICE_SELECTION" && state.diceAnimBoostActive) {
          const backTo =
            typeof state.diceAnimPrevScale === "number" && Number.isFinite(state.diceAnimPrevScale)
              ? state.diceAnimPrevScale
              : 1;
          if (window.TweenMax && typeof TweenMax.globalTimeScale === "function") {
            TweenMax.globalTimeScale(backTo);
          }
          state.diceAnimBoostActive = false;
          state.diceAnimPrevScale = 1;
          if (state.diceAnimBoostTimer) {
            clearTimeout(state.diceAnimBoostTimer);
            state.diceAnimBoostTimer = null;
          }
        }
        if (state.currentPhase === "CARD_SELECTION") {
          state.autoSelectionPendingKey = null;
          state.lastAutoCardKey = null;
          state.lastRecommendationKey = null;
          state.recommendationUiWaitKey = null;
          state.cardSelectionGen += 1;
        }
        if (state.currentPhase === "DICE_SELECTION") {
          state.lastDiceRecommendationKey = null;
          state.diceRecommendationUiWaitKey = null;
          state.lastAutoDiceKey = null;
          state.diceAutoPendingKey = null;
          state.cardSelectionGen += 1;
        }
        state.currentPhase = nextPhase;
        state.currentPhaseSource = source;
        log(`Phase started: ${nextPhase} (source: ${source})`);
        if (nextPhase === "DICE_SELECTION") {
          triggerDiceRollAnimationBoost(`phase-change:${source}`);
        }
        if (nextPhase === "ROUND_END") {
          triggerBattleFastSkip(`phase-change:${source}`);
        }
      }
    }

    function pickBestFromPhaseCards(cards) {
      const getCardQualityInfo = (cardId) => {
        if (!isValidCardId(cardId)) return { quality: -1, qualityName: "?" };
        try {
          const cfgCard = app.CFGUtil.getCardByID(cardId);
          const quality = typeof cfgCard?.quality === "number" ? cfgCard.quality : -1;
          const qualityName =
            typeof app.CFGUtil.getCardQualityName === "function"
              ? app.CFGUtil.getCardQualityName(quality)
              : String(quality);
          return { quality, qualityName };
        } catch (_e) {
          return { quality: -1, qualityName: "?" };
        }
      };

      const getCardDamageStats = (card) => {
        const combos = Array.isArray(card?.combos) ? card.combos : [];
        let normal = 0;
        let magic = 0;
        for (const combo of combos) {
          const hit = typeof combo?.hit === "number" && Number.isFinite(combo.hit) ? combo.hit : 0;
          const types = Array.isArray(combo?.type) ? combo.type : [];
          if (types.includes("HIT")) normal += hit;
          if (types.includes("F") || types.includes("N") || types.includes("W")) magic += hit;
        }
        return { normal, magic, total: normal + magic };
      };

      const scored = cards
        .map((card, idx) => ({
          idx,
          id: getCardId(card, idx),
          name: getCardName(getCardId(card, idx)),
          power: getCardPower(getCardId(card, idx)),
          ...getCardQualityInfo(getCardId(card, idx)),
          dmg: getCardDamageStats(card),
        }))
        .filter((entry) => typeof entry.power === "number");

      if (scored.length === 0) {
        const keysPreview = cards.map((card, idx) => ({
          idx,
          id: getCardId(card, idx),
          keys: Object.keys(card || {}),
        }));
        log(
          `Фаза 1: есть карты для выбора (${cards.length} шт.), но не удалось посчитать мощь через app.UserUtil.getCardPower(cardId).`,
          keysPreview
        );
        return null;
      }

      scored.sort((a, b) => {
        if (b.power !== a.power) return b.power - a.power;
        if (b.quality !== a.quality) return b.quality - a.quality;
        if (b.dmg.total !== a.dmg.total) return b.dmg.total - a.dmg.total;
        if (b.dmg.magic !== a.dmg.magic) return b.dmg.magic - a.dmg.magic;
        if (b.dmg.normal !== a.dmg.normal) return b.dmg.normal - a.dmg.normal;
        return a.idx - b.idx;
      });
      const best = scored[0];
      const scoredKey = scored
        .map((entry) => `${entry.id}:${entry.power}:${entry.dmg.magic}:${entry.dmg.normal}`)
        .join("|");
      return { best, scoredKey, scored };
    }

    function formatDiceSnapshot(dices) {
      if (!Array.isArray(dices)) return "[]";
      return dices.map((d, i) => `${i}:${d?.t ?? "?"}(s=${d?.s ? 1 : 0})`).join(", ");
    }

    function getBattleCardCfgForDicePhase(battle) {
      const idx = battle?.m1?.cardIDX;
      const cards = battle?.m1?.cards;
      if (typeof idx !== "number" || idx < 0 || !Array.isArray(cards) || !cards[idx]) return null;
      const cid = getCardId(cards[idx], idx);
      if (typeof cid !== "number" || !isValidCardId(cid)) return null;
      try {
        return app.CFGUtil.getCardByID(cid) || null;
      } catch (_e) {
        return null;
      }
    }

    /**
     * Маска для BattleDiceRoll.dices: 1 = держать кубик, 0 = отпустить (пойдёт в переброс).
     * У кубиков в бою только грани F / N / W / HIT (см. CFGUtil.getElemIMGByType).
     * — Простая карта (quality===0): имеет смысл удерживать только HIT; стихии F/N/W гоняем.
     * — Необычная и выше (quality>=1): у карты есть основная стихия et (часто F/N/W); держим HIT и все грани, совпадающие с et.
     */
    function buildDiceHoldMaskFromBattle(battle, dices) {
      const n = Array.isArray(dices) ? dices.length : 0;
      if (n === 0) return { mask: [], note: "нет кубиков", cardLine: "" };

      const cfg = getBattleCardCfgForDicePhase(battle);
      const quality = typeof cfg?.quality === "number" ? cfg.quality : 0;
      const et = typeof cfg?.et === "string" ? cfg.et.trim() : "";
      const name = cfg && typeof cfg.name === "string" ? cfg.name.trim() : "";
      const cardLine = cfg
        ? `карта хода: «${name || "без имени"}» quality=${quality} et=${et || "—"}`
        : "карта хода: не удалось сопоставить m1.cardIDX + CFGUtil.getCardByID — только логика HIT";

      const mask = new Array(n).fill(0);
      for (let i = 0; i < n; i += 1) {
        if (dices[i] && dices[i].t === "HIT") mask[i] = 1;
      }

      const isSimple = quality === 0;
      const elemIsFNW = et === "F" || et === "N" || et === "W";

      if (!isSimple && elemIsFNW) {
        for (let i = 0; i < n; i += 1) {
          if (dices[i] && dices[i].t === et) mask[i] = 1;
        }
      }

      const held = mask.reduce((a, v) => a + (v ? 1 : 0), 0);
      let note;
      if (isSimple) {
        note =
          held > 0
            ? "простая карта: держим только грани HIT, F/N/W — на переброс"
            : "простая карта: HIT на столе нет — перебрасываем все кубики (ищем HIT)";
      } else if (elemIsFNW) {
        note = `магическая карта: держим HIT и все грани стихии ${et} (остальное на переброс)`;
      } else {
        note =
          "магическая карта, но et не F/N/W — держим только HIT (как запасной вариант; при необходимости уточним правило под вашу колоду)";
      }

      const allTargetNow = mask.every((v) => v === 1);
      return { mask, note, cardLine, allTargetNow };
    }

    function runPhaseTwoDiceRecommendation(battle, sourceLabel) {
      const dices = battle?.m1?.dices;
      if (!Array.isArray(dices) || dices.length === 0) {
        log(`Фаза 2: DICE_SELECTION (${sourceLabel}), но m1.dices пуст или отсутствует.`);
        return;
      }
      const rolls = battle?.m1?.rolls;
      const rollsNum = typeof rolls === "number" && Number.isFinite(rolls) ? rolls : -1;
      if (rollsNum <= 0) return;
      /** Дедуп лога: число оставшихся бросков + для каждого кубика пара «грань t» и «уже закреплён игроком s». */
      const snapKey = `${rollsNum}|${dices.map((d) => `${d?.t ?? "?"}:${d?.s ? 1 : 0}`).join(",")}`;

      // Первый кадр DICE_SELECTION в клиенте часто искусственный: 6xF до реального BattleDiceRoll.
      const looksLikeWarmup =
        rollsNum >= 3 && dices.length === 6 && dices.every((d) => d?.t === "F" && !d?.s);
      if (looksLikeWarmup) {
        if (state.diceWarmupSkippedKey !== snapKey) {
          state.diceWarmupSkippedKey = snapKey;
          log("Фаза 2: пропускаем стартовый прелоад кубиков (6xF до первого реального броска).");
        }
        return;
      }

      if (state.lastDiceRecommendationKey === snapKey) return;
      if (state.diceRecommendationUiWaitKey === snapKey) return;
      state.diceRecommendationUiWaitKey = snapKey;

      const uiMs = diceSelectionUiReadyDelay();
      const gen = (state.cardSelectionGen += 1);
      setTimeout(() => {
        state.diceRecommendationUiWaitKey = null;
        if (gen !== state.cardSelectionGen) return;
        if (state.currentPhase !== "DICE_SELECTION") return;
        if (state.lastDiceRecommendationKey === snapKey) return;
        state.lastDiceRecommendationKey = snapKey;

        const { mask, note, cardLine, allTargetNow } = buildDiceHoldMaskFromBattle(battle, dices);
        if (!state.autoEnabled) {
          log(
            `Фаза 2 РЕКОМЕНДАЦИЯ: dices=${JSON.stringify(mask)}. ${note}${allTargetNow ? " Все 6 граней уже целевые -> можно сразу жать «В бой!»." : ""}. rolls=${rollsNum >= 0 ? rollsNum : "?"}. ${cardLine}. Кубики: [${formatDiceSnapshot(
              dices
            )}]. (${sourceLabel})`
          );
          return;
        }

        if (state.lastAutoDiceKey === snapKey) return;
        if (state.diceAutoPendingKey === snapKey) return;
        state.diceAutoPendingKey = snapKey;

        const delay = allTargetNow ? Math.min(300, randomDelay()) : randomDelay();
        log(
          `Фаза 2: автовыбор кубиков через ${delay}ms. dices=${JSON.stringify(mask)}.${allTargetNow ? " Все 6 целевые -> переходим сразу в «В бой!»." : ""} rolls=${rollsNum}. (${sourceLabel})`
        );

        setTimeout(() => {
          if (!state.autoEnabled) {
            state.diceAutoPendingKey = null;
            return;
          }
          if (gen !== state.cardSelectionGen) {
            state.diceAutoPendingKey = null;
            return;
          }
          if (state.currentPhase !== "DICE_SELECTION") {
            state.diceAutoPendingKey = null;
            return;
          }

          const popup = safeGetBattlePopup();
          const items = listBattleDiceItems(popup);
          if (items.length !== mask.length) {
            log(
              `Фаза 2: автовыбор кубиков пропущен — в UI dice_item=${items.length}, в модели=${mask.length}.`
            );
            state.diceAutoPendingKey = null;
            return;
          }

          for (let i = 0; i < items.length; i += 1) {
            const shouldHold = mask[i] === 1;
            const selectedNow = isDiceItemSelected(items[i]);
            if (selectedNow !== shouldHold) {
              items[i].click();
            }
          }

          const applyMaskAndClick = (attempt = 0) => {
            const pNow = safeGetBattlePopup();
            const itemsNow = listBattleDiceItems(pNow);
            const rollBtnNow = findDiceRollControl(pNow);
            if (!rollBtnNow) {
              log("Фаза 2: автовыбор кубиков — кнопка броска не найдена.");
              state.diceAutoPendingKey = null;
              return;
            }

            if (itemsNow.length !== mask.length) {
              if (attempt < 5) {
                setTimeout(() => applyMaskAndClick(attempt + 1), 120);
                return;
              }
              log(
                `Фаза 2: автовыбор кубиков пропущен — в UI dice_item=${itemsNow.length}, в модели=${mask.length}.`
              );
              state.diceAutoPendingKey = null;
              return;
            }

            for (let i = 0; i < itemsNow.length; i += 1) {
              const shouldHold = mask[i] === 1;
              const selectedNow = isDiceItemSelected(itemsNow[i]);
              if (selectedNow !== shouldHold) {
                itemsNow[i].click();
              }
            }

            const btnText = (rollBtnNow.textContent || "").trim();
            if (allTargetNow) {
              const selectedCount = countSelectedDiceItems(itemsNow);
              const readyForFight = selectedCount === mask.length && btnText.startsWith("В бой");
              if (!readyForFight) {
                if (attempt < 6) {
                  setTimeout(() => applyMaskAndClick(attempt + 1), 140);
                  return;
                }
                log(
                  `Фаза 2: все 6 целевые, но UI не готов к "В бой!" (selected=${selectedCount}/${mask.length}, btn="${btnText}").`
                );
                state.diceAutoPendingKey = null;
                return;
              }
            }

            rollBtnNow.click();
            state.lastAutoDiceKey = snapKey;
            state.diceAutoPendingKey = null;
            log(`Фаза 2: автовыбор применён, клик по кнопке "${btnText}".`);
            if (btnText.startsWith("Бросить")) {
              triggerDiceRollAnimationBoost(`roll-click:${sourceLabel}`);
            }
            if (btnText.startsWith("В бой")) {
              triggerBattleFastSkip(`after-dice-click:${sourceLabel}`);
            }
          };
          applyMaskAndClick(0);
        }, delay);
      }, uiMs);
    }

    function runPhaseOneCardChoice(phaseCards, sourceLabel) {
      const triple =
        Array.isArray(phaseCards) && phaseCards.length > 3
          ? phaseCards.slice(0, 3)
          : phaseCards;

      const picked = pickBestFromPhaseCards(triple);
      if (!picked) return;

      const { best, scoredKey, scored } = picked;
      const cardsListLine = scored
        .map(
          (c) =>
            `idx=${c.idx} "${c.name}" rare=${c.qualityName}(${c.quality}) power=${c.power} totalDmg=${c.dmg.total}`
        );
      log(`Фаза 1 карты:\n${cardsListLine.join("\n")}\n(${sourceLabel})`);

      if (state.autoEnabled && (!Array.isArray(triple) || triple.length < 1)) {
        log(`Фаза 1: автовыбор пропущен — нет карт в снапшоте. (${sourceLabel})`);
        return;
      }

      const uiMs = cardSelectionUiReadyDelay();

      if (!state.autoEnabled) {
        if (state.lastRecommendationKey === scoredKey) return;
        if (state.recommendationUiWaitKey === scoredKey) return;
        state.recommendationUiWaitKey = scoredKey;
        const gen = (state.cardSelectionGen += 1);
        setTimeout(() => {
          state.recommendationUiWaitKey = null;
          if (gen !== state.cardSelectionGen) return;
          if (state.currentPhase !== "CARD_SELECTION") return;
          if (state.autoEnabled) return;
          if (state.lastRecommendationKey === scoredKey) return;
          state.lastRecommendationKey = scoredKey;
          log(
            `Фаза 1 рекомендация (после ~${uiMs}ms анимации UI): выбрать карту idx=${best.idx}, id=${best.id}, name="${best.name}", power=${best.power}, dmgMagic=${best.dmg.magic}, dmgNormal=${best.dmg.normal}. (${sourceLabel})`
          );
        }, uiMs);
        return;
      }

      if (state.lastAutoCardKey === scoredKey) return;
      if (state.autoSelectionPendingKey === scoredKey) return;
      state.autoSelectionPendingKey = scoredKey;

      const gen = (state.cardSelectionGen += 1);
      setTimeout(() => {
        if (!state.autoEnabled) {
          state.autoSelectionPendingKey = null;
          return;
        }
        if (gen !== state.cardSelectionGen) {
          state.autoSelectionPendingKey = null;
          return;
        }
        if (state.currentPhase !== "CARD_SELECTION") {
          state.autoSelectionPendingKey = null;
          return;
        }

        const delay = randomDelay();
        log(
          `Фаза 1: автовыбор — анимация UI ~${uiMs}ms, затем ещё ${delay}ms — idx=${best.idx}, name="${best.name}", power=${best.power}, dmgMagic=${best.dmg.magic}, dmgNormal=${best.dmg.normal}. (${sourceLabel})`
        );

        setTimeout(() => {
          if (!state.autoEnabled) {
            state.autoSelectionPendingKey = null;
            return;
          }
          if (gen !== state.cardSelectionGen) {
            state.autoSelectionPendingKey = null;
            return;
          }
          if (state.currentPhase !== "CARD_SELECTION") {
            state.autoSelectionPendingKey = null;
            return;
          }

          performAutobattleCardDom(best.idx, best, sourceLabel, scoredKey, gen);
        }, delay);
      }, uiMs);
    }

    function handleBattleSnapshot(battle, source) {
      if (!battle || typeof battle !== "object") return;

      const phase = getBattleStateFromSnapshot(battle);
      if (phase) {
        setPhase(phase, source);
      }

      if (phase === "DICE_SELECTION") {
        runPhaseTwoDiceRecommendation(battle, source);
      }

      if (phase !== "CARD_SELECTION") return;

      // BattlePage: u.m1.model.cards[0], [1], [2] if present; idx в BattleCardSelected совпадает с позицией в этом срезе (0..2).
      const m1Cards = Array.isArray(battle?.m1?.cards) ? battle.m1.cards : null;
      if (m1Cards && m1Cards.length >= 1) {
        const phaseCards = m1Cards.slice(0, 3);
        state.noSnapshotCardsLogged = false;
        state.selectionIndicesLogged = false;
        state.noContextLogged = false;
        runPhaseOneCardChoice(phaseCards, `${source} -> m1.cards[0..2]`);
        return;
      }

      const cardContext = getSelectableCardsFromBattleSnapshot(battle);
      if (!cardContext) {
        debugCardSelectionSnapshot(battle, source);

        const idxSelection = findSelectionIndicesInBattleSnapshot(battle);
        if (idxSelection) {
          state.noSnapshotCardsLogged = false;
          state.selectionIndicesLogged = true;
          log(
            `Фаза 1: найден выбор по индексам (${idxSelection.path}) -> [${idxSelection.indices.join(", ")}].`
          );
          runPhaseOneCardChoice(idxSelection.cards, `${source} -> ${idxSelection.path}`);
          return;
        }

        if (!state.noSnapshotCardsLogged) {
          state.noSnapshotCardsLogged = true;
          const m1DeckLen = Array.isArray(battle?.m1?.cards) ? battle.m1.cards.length : 0;
          log(
            `Фаза 1: state=CARD_SELECTION (${source}), но карты для выбора не извлечены из snapshot. m1.cards=${m1DeckLen}`
          );
        }

        const fullDeck = Array.isArray(battle?.m1?.cards) ? battle.m1.cards : null;
        if (fullDeck && fullDeck.length > 0) {
          runPhaseOneCardChoice(fullDeck, `${source} -> m1.cards(full-deck fallback)`);
        }
        return;
      }
      state.noSnapshotCardsLogged = false;
      state.selectionIndicesLogged = false;
      state.noContextLogged = false;
      runPhaseOneCardChoice(cardContext.cards, `${source} -> ${cardContext.path}`);
    }

    /** Не затирать фазу в null: detectPhase часто не видит состояние в DOM, а фаза уже выставлена из снапшота боя (сокет/command). */
    function updatePhaseTracking(popup) {
      const detected = detectPhase(popup);
      if (!detected) return;
      setPhase(detected.phase, detected.path || "popup");
    }

    function onBattleDetected(source, popup) {
      if (!popup) return;
      if (state.battleActive) {
        state.popupMisses = 0;
        return;
      }

      state.battleActive = true;
      state.readyLogged = false;
      state.popupMisses = 0;
      /* Не сбрасывать currentPhase: ответ BattleUpdate мог уже выставить CARD_SELECTION через handleBattleSnapshot;
         обнуление здесь ломает отложенный автовыбор (таймер видит фазу не CARD_SELECTION). Фазу обнуляет onBattleEnded. */
      state.lastRecommendationKey = null;
      state.lastAutoCardKey = null;
      state.autoSelectionPendingKey = null;
      state.recommendationUiWaitKey = null;
      state.lastDiceRecommendationKey = null;
      state.diceRecommendationUiWaitKey = null;
      state.diceWarmupSkippedKey = null;
      state.lastAutoDiceKey = null;
      state.diceAutoPendingKey = null;
      state.battleFastSkipPending = false;
      if (state.diceAnimBoostTimer) {
        clearTimeout(state.diceAnimBoostTimer);
        state.diceAnimBoostTimer = null;
      }
      state.diceAnimBoostActive = false;
      state.diceAnimPrevScale = 1;
      /* Не делаем cardSelectionGen += 1 здесь: CARD_SELECTION часто приходит из сокета/command раньше первого
         обнаружения попапа; инкремент отменял бы уже запланированный автовыбор карты в начале боя. */
      state.noContextLogged = false;
      state.powerErrorLogged = false;
      state.lastBattleSnapshotKey = null;
      state.noSnapshotCardsLogged = false;
      state.selectionIndicesLogged = false;
      state.cardSelectionDebugLogged = false;
      updateOverlay();
      log(`Battle detected from "${source}".`);

      const delay = randomDelay();
      setTimeout(() => {
        const stillInBattle = state.battleActive && safeGetBattlePopup();
        if (!stillInBattle) {
          return;
        }
        if (!state.readyLogged) {
          state.readyLogged = true;
          log("Battle UI is ready. Automation can start now.");
        }
      }, delay);
    }

    function onBattleEnded() {
      if (!state.battleActive) return;
      state.battleActive = false;
      state.readyLogged = false;
      state.popupMisses = 0;
      if (state.currentPhase) {
        log(`Phase ended: ${state.currentPhase}`);
      }
      state.currentPhase = null;
      state.currentPhaseSource = null;
      state.lastRecommendationKey = null;
      state.lastAutoCardKey = null;
      state.autoSelectionPendingKey = null;
      state.recommendationUiWaitKey = null;
      state.lastDiceRecommendationKey = null;
      state.diceRecommendationUiWaitKey = null;
      state.diceWarmupSkippedKey = null;
      state.lastAutoDiceKey = null;
      state.diceAutoPendingKey = null;
      state.battleFastSkipPending = false;
      if (state.diceAnimBoostTimer) {
        clearTimeout(state.diceAnimBoostTimer);
        state.diceAnimBoostTimer = null;
      }
      state.diceAnimBoostActive = false;
      state.diceAnimPrevScale = 1;
      state.cardSelectionGen += 1;
      state.noContextLogged = false;
      state.powerErrorLogged = false;
      state.lastBattleSnapshotKey = null;
      state.noSnapshotCardsLogged = false;
      state.selectionIndicesLogged = false;
      state.cardSelectionDebugLogged = false;
      updateOverlay();
      log("Battle ended or popup closed.");
    }

    function startPopupPolling() {
      if (state.pollTimer) return;
      state.pollTimer = setInterval(() => {
        const popup = safeGetBattlePopup();
        if (popup) {
          state.popupMisses = 0;
          onBattleDetected("popup-poll", popup);
          updatePhaseTracking(popup);
          return;
        }

        if (!state.battleActive) return;
        state.popupMisses += 1;
        if (state.popupMisses >= CONFIG.popupMissThreshold) {
          onBattleEnded();
        }
      }, CONFIG.popupPollMs);
    }

    function hookEventDispatcher() {
      if (!app.EventDispatcher || !app.EventDispatcher.on) {
        log("EventDispatcher not available.");
        return;
      }

      app.EventDispatcher.on("battle begin", (payload) => {
        log("EventDispatcher battle begin:", payload || {});
        const popup = safeGetBattlePopup();
        if (popup) onBattleDetected("event:battle begin", popup);
      });
    }

    function hookProcessEvent() {
      if (!app.EventUtil || typeof app.EventUtil.PROCESS_EVENT !== "function") {
        log("EventUtil.PROCESS_EVENT not available.");
        return;
      }

      const original = app.EventUtil.PROCESS_EVENT.bind(app.EventUtil);
      app.EventUtil.PROCESS_EVENT = function patchedProcessEvent(event) {
        if (event && event.type === "BATTLE") {
          log("Socket event BATTLE received.");
          if (event.battle) {
            handleBattleSnapshot(event.battle, "event:BATTLE");
          }
        }
        return original(event);
      };
    }

    function wrapCommandFunction(owner, ownerPath) {
      if (!owner || typeof owner.command !== "function") return false;
      if (owner.command.__abHooked) return false;

      const originalCommand = owner.command.bind(owner);
      const wrapped = function patchedCommand(payload, callback) {
        const cmdName = payload?.cmd || "unknown";
        const isBattleCmd = cmdName.startsWith("Battle");

        if (isBattleCmd) {
          log(`Command sent: ${cmdName} (via ${ownerPath}.command)`);
        }

        const wrappedCallback = typeof callback === "function"
          ? function wrappedResponse(response) {
              try {
                if (response && response.battle) {
                  const snapshotKey = JSON.stringify({
                    state: response.battle.state,
                    st: response.battle.st,
                    cardIDX: response.battle?.m1?.cardIDX,
                    rolls: response.battle?.m1?.rolls,
                    cards: (getSelectableCardsFromBattleSnapshot(response.battle)?.cards || [])
                      .map((card, idx) => getCardId(card, idx)),
                    dices: (Array.isArray(response.battle?.m1?.dices) ? response.battle.m1.dices : []).map((d) => ({
                      t: d?.t ?? "?",
                      s: d?.s ? 1 : 0,
                    })),
                  });
                  if (snapshotKey !== state.lastBattleSnapshotKey) {
                    state.lastBattleSnapshotKey = snapshotKey;
                    handleBattleSnapshot(response.battle, `command:${cmdName}`);
                  }
                }
              } catch (err) {
                log("battle snapshot parse failed:", err);
              }
              return callback(response);
            }
          : callback;

        return originalCommand(payload, wrappedCallback);
      };

      wrapped.__abHooked = true;
      wrapped.__abOriginal = originalCommand;
      owner.command = wrapped;
      state.commandHooksInstalled += 1;
      log(`Command hook installed on ${ownerPath}.command`);
      return true;
    }

    function hookCommandResponses() {
      if (!window.app || typeof app !== "object") {
        log("app object not available for command hooks.");
        return;
      }

      const queue = [{ value: app, path: "app", depth: 0 }];
      const seen = new Set();

      while (queue.length > 0) {
        const { value, path, depth } = queue.shift();
        if (!value || typeof value !== "object") continue;
        if (seen.has(value)) continue;
        seen.add(value);

        wrapCommandFunction(value, path);

        if (depth >= 2) continue;
        for (const [key, nested] of Object.entries(value)) {
          if (nested && typeof nested === "object") {
            queue.push({ value: nested, path: `${path}.${key}`, depth: depth + 1 });
          }
        }
      }

      if (!state.commandHookScanTimer) {
        state.commandHookScanTimer = setInterval(() => {
          hookCommandResponses();
        }, 2000);
      }
    }

    ensureOverlay();
    hookEventDispatcher();
    hookProcessEvent();
    hookCommandResponses();
    startPopupPolling();
    log("Battle detector initialized.");
  });
})();
