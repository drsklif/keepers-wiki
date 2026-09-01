// ==UserScript==
// @name         Keepers Helper
// @namespace    https://keepers.local/
// @version      0.1.0
// @description		Automation of actions for the game Keepers
// @description:en	Automation of actions for the game Keepers
// @description:ru	Автоматизация рутинных действий в игре Keepers
// @author          anonymous
// @match        https://keepers.mobi/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const helper = {
    config: {
      debug: true,
      appReadyPollMs: 500,
    },
    state: {
      appReady: false,
      modulesInitialized: false,
    },
    modules: [],
    log(...args) {
      if (!this.config.debug) return;
      console.log("[KeepersHelper]", ...args);
    },
    registerModule(name, initFn) {
      if (typeof initFn !== "function") return;
      this.modules.push({ name, initFn });
      this.log(`Module registered: ${name}`);
      if (this.state.appReady) {
        this.initModules();
      }
    },
    initModules() {
      if (this.state.modulesInitialized) return;
      this.state.modulesInitialized = true;

      for (const mod of this.modules) {
        try {
          mod.initFn(this);
          this.log(`Module initialized: ${mod.name}`);
        } catch (err) {
          this.log(`Module init failed: ${mod.name}`, err);
        }
      }
    },
    isAppReady() {
      return Boolean(
        window.app &&
          app.EventDispatcher &&
          app.EventUtil &&
          app.Popups
      );
    },
    boot() {
      const timer = setInterval(() => {
        if (!this.isAppReady()) return;

        clearInterval(timer);
        this.state.appReady = true;
        this.log("Core initialized.");
        this.initModules();
      }, this.config.appReadyPollMs);
    },
  };

  window.KeepersHelper = helper;
  helper.boot();
})();

(function () {
  "use strict";

  const helper = window.KeepersHelper;
  if (!helper || typeof helper.registerModule !== "function") {
    console.warn("[KeepersHelper/Battle] Core module is missing.");
    return;
  }

  helper.registerModule("battle-detector", (core) => {
    const CONFIG = {
      // Опорная скорость UI: значения в delays откалиброваны при этом множителе (x1.5).
      referenceSpeed: 1.5,
      // Нижний предел любой масштабированной задержки (мс).
      minDelayMs: 60,
      delays: {
        // [Фаза 1] Ожидание готовности UI после CARD_SELECTION.
        cardUiReady: 950,
        cardUiReadyJitter: 150,
        // [Фаза 1] Пауза перед кликом по карте (бывш. reaction).
        cardActionGap: 900,
        cardActionGapJitter: 400,
        // [Фаза 1] Пауза после клика по карте, до «В бой!» (нельзя объединять с actionGap — иначе desync).
        cardConfirm: 450,
        // [Фаза 2] Ожидание готовности UI кубиков после DICE_SELECTION.
        diceUiReady: 700,
        diceUiReadyJitter: 120,
        // [Фаза 2] Пауза перед автовыбором кубиков (бывш. reaction).
        diceActionGap: 900,
        diceActionGapJitter: 400,
        // [Фаза 2] Верхняя граница diceActionGap, когда все 6 граней уже целевые.
        diceActionGapCap: 300,
        // [ROUND_END] Задержка перед нативным skip-анимации.
        battleSkip: 450,
        // [ROUND_END] Интервал между первым и вторым click skip.
        battleSkipSecond: 140,
        // [Фаза 2] Длительность временного ускорения броска кубиков.
        diceRollBoost: 1400,
        // [UI retry] Повторная проверка DOM (кубики, overlay skip, «В бой!»).
        retryPoll: 120,
        retryPollReady: 140,
        retrySkipOverlay: 100,
        // [Старт] Задержка перед логом «Battle UI is ready».
        battleReady: 400,
      },
      // [Фаза 2] Абсолютный TweenMax-scale на время анимации броска кубиков (не умножается на кнопку «Скорость»).
      diceRollAnimBoostScale: 3.2,
      // [Фаза 1] Множитель к выбранной скорости UI на время CARD_SELECTION (анимации + задержки).
      cardSelectionSpeedFactor: 1.2,
      // [Глобально] Доступные скорости анимаций для кнопки «Скорость».
      uiSpeedLevels: [1.5, 2, 3],
      // [Детектор] Частота проверки battle popup (не масштабируется).
      popupPollMs: 600,
      // [Детектор] Сколько «промахов» popup подряд считать окончанием боя.
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
      uiSpeedIndex: 0,
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
      speedButton: null,
    };

    function log(...args) {
      core.log("[AutoBattle]", ...args);
    }

    function getSelectedUiSpeed() {
      const levels =
        Array.isArray(CONFIG.uiSpeedLevels) && CONFIG.uiSpeedLevels.length > 0
          ? CONFIG.uiSpeedLevels
          : [CONFIG.referenceSpeed || 1.5];
      const idx = Math.max(0, Math.min(state.uiSpeedIndex, levels.length - 1));
      const speed = levels[idx];
      return typeof speed === "number" && Number.isFinite(speed) && speed > 0 ? speed : 1.5;
    }

    function getCardPhaseSpeedFactor() {
      const factor = CONFIG.cardSelectionSpeedFactor;
      return typeof factor === "number" && Number.isFinite(factor) && factor > 0 ? factor : 1;
    }

    function getCurrentUiSpeed() {
      const base = getSelectedUiSpeed();
      if (state.currentPhase === "CARD_SELECTION") {
        return base * getCardPhaseSpeedFactor();
      }
      return base;
    }

    function scaleDelay(baseMs, opts = {}) {
      const base = Math.max(0, Number(baseMs) || 0);
      if (base === 0) return 0;
      const speed = Math.max(0.1, getCurrentUiSpeed());
      const ref = Math.max(0.1, CONFIG.referenceSpeed || 1.5);
      const minMs = Math.max(0, opts.min ?? CONFIG.minDelayMs ?? 60);
      const scaled = Math.round((base * ref) / speed);
      if (opts.max != null && Number.isFinite(opts.max)) {
        return Math.max(minMs, Math.min(opts.max, scaled));
      }
      return Math.max(minMs, scaled);
    }

    function scaleDelayWithJitter(baseMs, jitterMs, opts = {}) {
      const jitter = Math.max(0, Number(jitterMs) || 0);
      const extra = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
      return scaleDelay(baseMs + extra, opts);
    }

    function cardPhaseWaitDelay() {
      return scaleDelayWithJitter(CONFIG.delays.cardUiReady, CONFIG.delays.cardUiReadyJitter);
    }

    function cardActionGapDelay() {
      return scaleDelayWithJitter(CONFIG.delays.cardActionGap, CONFIG.delays.cardActionGapJitter);
    }

    function dicePhaseWaitDelay() {
      return scaleDelayWithJitter(CONFIG.delays.diceUiReady, CONFIG.delays.diceUiReadyJitter);
    }

    function diceActionGapDelay(opts = {}) {
      const delay = scaleDelayWithJitter(CONFIG.delays.diceActionGap, CONFIG.delays.diceActionGapJitter);
      if (opts.cap) {
        return Math.min(scaleDelay(CONFIG.delays.diceActionGapCap), delay);
      }
      return delay;
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

      const delay = scaleDelay(CONFIG.delays.battleSkip, { min: 0 });
      const secondMs = scaleDelay(CONFIG.delays.battleSkipSecond, { min: CONFIG.minDelayMs });
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
              setTimeout(() => tryApply(attempt + 1), scaleDelay(CONFIG.delays.retrySkipOverlay));
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
      const durationMs = scaleDelay(CONFIG.delays.diceRollBoost, { min: 200 });
      state.diceAnimPrevScale = getSelectedUiSpeed();
      TweenMax.globalTimeScale(boostScale);
      state.diceAnimBoostActive = true;
      log(`Фаза DICE: ускоряем анимацию броска x${boostScale}. (${reason})`);

      if (state.diceAnimBoostTimer) {
        clearTimeout(state.diceAnimBoostTimer);
      }
      state.diceAnimBoostTimer = setTimeout(() => {
        restoreDiceAnimBoost("dice-boost-timeout");
      }, durationMs);
    }

    function restoreDiceAnimBoost(source) {
      if (state.diceAnimBoostTimer) {
        clearTimeout(state.diceAnimBoostTimer);
        state.diceAnimBoostTimer = null;
      }
      if (!state.diceAnimBoostActive) return;
      state.diceAnimBoostActive = false;
      state.diceAnimPrevScale = 1;
      applyBattleTweenScale(source || "dice-boost-end");
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

      const confirmMs = scaleDelay(CONFIG.delays.cardConfirm);
      const tryConfirm = (attempt = 0) => {
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
          if (attempt < 8) {
            setTimeout(() => tryConfirm(attempt + 1), scaleDelay(CONFIG.delays.retryPoll));
            return;
          }
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
      };
      setTimeout(() => tryConfirm(0), confirmMs);
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
      if (state.speedButton) {
        const levels = Array.isArray(CONFIG.uiSpeedLevels) && CONFIG.uiSpeedLevels.length > 0 ? CONFIG.uiSpeedLevels : [1.5];
        const idx = Math.max(0, Math.min(state.uiSpeedIndex, levels.length - 1));
        const speed = levels[idx];
        state.speedButton.textContent = `Скорость x${speed}`;
      }
    }

    function applyBattleTweenScale(source) {
      if (!window.TweenMax || typeof TweenMax.globalTimeScale !== "function") {
        log(`Скорость UI: TweenMax.globalTimeScale недоступен. (${source})`);
        return;
      }
      if (state.diceAnimBoostActive) return;
      const base = getSelectedUiSpeed();
      const factor = state.currentPhase === "CARD_SELECTION" ? getCardPhaseSpeedFactor() : 1;
      const scale = Number((base * factor).toFixed(4));
      TweenMax.globalTimeScale(scale);
      if (factor !== 1) {
        log(`Скорость UI: x${base} × ${factor} (фаза карт) = x${scale}. (${source})`);
      } else {
        log(`Скорость UI: x${base}. (${source})`);
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

      const speedBtn = document.createElement("button");
      speedBtn.type = "button";
      speedBtn.textContent = "Скорость x1.5";
      speedBtn.style.cursor = "pointer";
      speedBtn.style.border = "1px solid #777";
      speedBtn.style.borderRadius = "6px";
      speedBtn.style.padding = "4px 8px";
      speedBtn.style.background = "#2b2b2b";
      speedBtn.style.color = "#fff";
      speedBtn.addEventListener("click", () => {
        const levels = Array.isArray(CONFIG.uiSpeedLevels) && CONFIG.uiSpeedLevels.length > 0 ? CONFIG.uiSpeedLevels : [1.5];
        state.uiSpeedIndex = (state.uiSpeedIndex + 1) % levels.length;
        if (state.diceAnimBoostActive) {
          state.diceAnimPrevScale = getSelectedUiSpeed();
        }
        applyBattleTweenScale("ui-button");
        updateOverlay();
      });

      root.appendChild(status);
      root.appendChild(autoBtn);
      root.appendChild(speedBtn);
      document.body.appendChild(root);
      state.overlay = root;
      state.autoButton = autoBtn;
      state.speedButton = speedBtn;
      const levels = Array.isArray(CONFIG.uiSpeedLevels) && CONFIG.uiSpeedLevels.length > 0 ? CONFIG.uiSpeedLevels : [1.5];
      state.uiSpeedIndex = 0;
      applyBattleTweenScale("init");
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
        if (state.currentPhase === "DICE_SELECTION") {
          restoreDiceAnimBoost("phase-end:DICE_SELECTION");
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
        applyBattleTweenScale("phase-clear");
        return;
      }
      if (!nextPhase) return;

      if (!state.currentPhase) {
        state.currentPhase = nextPhase;
        state.currentPhaseSource = source;
        log(`Phase started: ${nextPhase} (source: ${source})`);
        applyBattleTweenScale(`phase-start:${source}`);
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
        if (state.currentPhase === "DICE_SELECTION") {
          restoreDiceAnimBoost("phase-change:DICE_SELECTION");
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
        applyBattleTweenScale(`phase-change:${source}`);
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

      const waitMs = dicePhaseWaitDelay();
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

        const gapMs = diceActionGapDelay({ cap: allTargetNow });
        log(
          `Фаза 2: автовыбор кубиков через ${gapMs}ms (UI ~${waitMs}ms). dices=${JSON.stringify(mask)}.${allTargetNow ? " Все 6 целевые -> переходим сразу в «В бой!»." : ""} rolls=${rollsNum}. (${sourceLabel})`
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
                setTimeout(() => applyMaskAndClick(attempt + 1), scaleDelay(CONFIG.delays.retryPoll));
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
                  setTimeout(() => applyMaskAndClick(attempt + 1), scaleDelay(CONFIG.delays.retryPollReady));
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
        }, gapMs);
      }, waitMs);
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

      const waitMs = cardPhaseWaitDelay();

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
            `Фаза 1 рекомендация (после ~${waitMs}ms анимации UI): выбрать карту idx=${best.idx}, id=${best.id}, name="${best.name}", power=${best.power}, dmgMagic=${best.dmg.magic}, dmgNormal=${best.dmg.normal}. (${sourceLabel})`
          );
        }, waitMs);
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

        const gapMs = cardActionGapDelay();
        log(
          `Фаза 1: автовыбор — UI ~${waitMs}ms + пауза ${gapMs}ms — idx=${best.idx}, name="${best.name}", power=${best.power}, dmgMagic=${best.dmg.magic}, dmgNormal=${best.dmg.normal}. (${sourceLabel})`
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
        }, gapMs);
      }, waitMs);
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

      const delay = scaleDelay(CONFIG.delays.battleReady);
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
      applyBattleTweenScale("battle-end");
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

(function () {
  "use strict";

  const helper = window.KeepersHelper;
  if (!helper || typeof helper.registerModule !== "function") {
    console.warn("[KeepersHelper/Energy] Core module is missing.");
    return;
  }

  helper.registerModule("energy-claim", (core) => {
    const STORAGE_KEY = "keepersHelper.energy.autoEnabled";
    const NAME_WINDOW_RE = /с\s+(\d{1,2})(?::(\d{2}))?\s+до\s+(\d{1,2})(?::(\d{2}))?/i;

    const CONFIG = {
      pollMs: 2000,
      userReadyPollMs: 400,
      delays: {
        afterClaimable: 600,
        afterClaimableJitter: 400,
      },
      maxClaimAttempts: 4,
      claimCooldownMs: 45000,
    };

    const state = {
      autoEnabled: loadAutoEnabled(),
      userReady: false,
      claiming: false,
      claimToken: 0,
      claimAttempts: {},
      lastStatusKey: null,
      overlay: null,
      autoButton: null,
      pollTimer: null,
      catalog: {},
      windows: {},
      shapeLogged: false,
      visitedWindows: {},
      claimCooldownUntil: {},
    };

    function log(...args) {
      core.log("[AutoEnergy]", ...args);
    }

    function loadAutoEnabled() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === "0") return false;
        if (raw === "1") return true;
      } catch (_err) {
        // ignore
      }
      return true;
    }

    function saveAutoEnabled() {
      try {
        window.localStorage.setItem(STORAGE_KEY, state.autoEnabled ? "1" : "0");
      } catch (_err) {
        // ignore
      }
    }

    function jitterDelay(baseMs, jitterMs) {
      const base = Math.max(0, Number(baseMs) || 0);
      const jitter = Math.max(0, Number(jitterMs) || 0);
      const extra = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
      return base + extra;
    }

    function isUserReady() {
      return Boolean(
        window.app &&
          app.Model &&
          app.Model.user &&
          app.Model.user.quests &&
          Array.isArray(app.Model.user.quests.quests) &&
          app.Model.user.energy &&
          app.UserUtil &&
          app.CFGUtil &&
          app.TimeUtil &&
          app.Network &&
          typeof app.Network.command === "function" &&
          app.EventDispatcher &&
          app.MainPage
      );
    }

    function getDailyQuests() {
      if (!isUserReady()) return [];
      if (app.UserUtil.getDailyQuests) return app.UserUtil.getDailyQuests() || [];
      const list = app.Model.user.quests.quests;
      return Array.isArray(list) ? list : [];
    }

    function safeQuestName(quest) {
      try {
        const name = app.CFGUtil.getQuestName(quest);
        return typeof name === "string" ? name : "";
      } catch (_err) {
        return "";
      }
    }

    function functionSource(fn) {
      try {
        return typeof fn === "function" ? Function.prototype.toString.call(fn) : "";
      } catch (_err) {
        return "";
      }
    }

    function discoverCatalogFromClient() {
      const catalog = {};
      const add = (type, startHour, endHour, source) => {
        if (!type || !Number.isFinite(startHour) || !Number.isFinite(endHour)) return;
        catalog[type] = { type, startHour, endHour, source };
      };

      const cfgSrc = functionSource(app.CFGUtil?.getQuestName);
      const cfgRe =
        /case\s*["']?(d_e\d+)["']?\s*:\s*return\s*"[^"]*энерг[^"]*"\.format\(\s*(\d+)\s*\+\s*app\.Model\.user\.gmt\s*,\s*(\d+)\s*\+\s*app\.Model\.user\.gmt\s*\)/g;
      let m;
      while ((m = cfgRe.exec(cfgSrc))) {
        add(m[1], Number(m[2]), Number(m[3]), "CFGUtil.getQuestName");
      }

      const pageSrc = functionSource(app.QuestsPage?.create);
      const pageRe = /case\s*["']?(d_e\d+)["']?\s*:\s*b\s*=\s*(\d+)\s*,\s*x\s*=\s*(\d+)/g;
      while ((m = pageRe.exec(pageSrc))) {
        if (!catalog[m[1]]) add(m[1], Number(m[2]), Number(m[3]), "QuestsPage.create");
      }

      return catalog;
    }

    function parseHoursFromText(text) {
      if (typeof text !== "string" || !text) return null;
      const m = text.match(NAME_WINDOW_RE);
      if (!m) return null;
      return {
        startHour: Number(m[1]),
        startMinute: m[2] != null ? Number(m[2]) : 0,
        endHour: Number(m[3]),
        endMinute: m[4] != null ? Number(m[4]) : 0,
      };
    }

    function pickFinite(obj, keys) {
      if (!obj || typeof obj !== "object") return null;
      for (const key of keys) {
        const value = Number(obj[key]);
        if (Number.isFinite(value)) return value;
      }
      return null;
    }

    function extractWindowFromQuestFields(quest) {
      const data = quest.data && typeof quest.data === "object" ? quest.data : {};
      const bags = [quest, data];
      const startHourKeys = ["startHour", "fromHour", "h1", "hs", "sh"];
      const endHourKeys = ["endHour", "toHour", "h2", "he", "eh"];
      for (const bag of bags) {
        const startHour = pickFinite(bag, startHourKeys);
        const endHour = pickFinite(bag, endHourKeys);
        if (startHour != null && endHour != null) {
          return { startHour, endHour, startMinute: 0, endMinute: 0, source: "quest-fields" };
        }
      }

      const startTs = pickFinite(quest, ["st", "nst", "from", "start"]);
      const endTs = pickFinite(quest, ["et", "net", "to", "end"]);
      const now = app.TimeUtil.now();
      if (
        startTs != null &&
        endTs != null &&
        endTs > startTs &&
        startTs > now - 8 * app.TimeUtil.D_MS &&
        endTs < now + 8 * app.TimeUtil.D_MS
      ) {
        const start = app.TimeUtil._getMoscowTime(startTs);
        const end = app.TimeUtil._getMoscowTime(endTs);
        return {
          startHour: start.getHours(),
          startMinute: start.getMinutes(),
          endHour: end.getHours(),
          endMinute: end.getMinutes(),
          startTs,
          endTs,
          source: "quest-timestamps",
        };
      }
      return null;
    }

    function formatHourLabel(hour, minute) {
      const h = Math.max(0, Number(hour) || 0);
      const m = Math.max(0, Number(minute) || 0);
      return m ? `${h}:${String(m).padStart(2, "0")}` : `${h}`;
    }

    function windowLabel(win) {
      if (!win) return "";
      return `${formatHourLabel(win.startHour, win.startMinute)}–${formatHourLabel(win.endHour, win.endMinute)}`;
    }

    function buildQuestWindow(quest) {
      const gmt = Number(app.Model.user.gmt) || 0;
      const fromFields = extractWindowFromQuestFields(quest);
      if (fromFields) {
        return { ...fromFields, label: windowLabel(fromFields) };
      }

      const fromName = parseHoursFromText(safeQuestName(quest));
      if (fromName) {
        return { ...fromName, source: "quest-name", label: windowLabel(fromName) };
      }

      const fromCatalog = state.catalog[quest.type];
      if (fromCatalog) {
        const win = {
          startHour: fromCatalog.startHour + gmt,
          startMinute: 0,
          endHour: fromCatalog.endHour + gmt,
          endMinute: 0,
          source: fromCatalog.source,
        };
        win.label = windowLabel(win);
        return win;
      }
      return null;
    }

    function isEnergyQuest(quest) {
      if (!quest) return false;
      if (state.catalog[quest.type]) return true;
      if (/^d_e\d+$/i.test(quest.type || "")) return true;
      const name = safeQuestName(quest);
      if (/энерг/i.test(name) && NAME_WINDOW_RE.test(name)) return true;
      return Boolean(quest.reward && Number(quest.reward.energy) > 0 && NAME_WINDOW_RE.test(name));
    }

    function getEnergyQuests() {
      return getDailyQuests().filter(isEnergyQuest);
    }

    function refreshWindows(source) {
      state.catalog = discoverCatalogFromClient();
      const quests = getEnergyQuests();
      const next = {};
      for (const quest of quests) {
        const key = quest.type || String(quest.id);
        next[key] = buildQuestWindow(quest);
      }
      state.windows = next;

      const catalogLine = Object.values(state.catalog)
        .map((w) => `${w.type} ${w.startHour}:00–${w.endHour}:00 (${w.source})`)
        .join(", ");
      const questLine = quests
        .map((q) => {
          const win = next[q.type || String(q.id)];
          return `${q.type}#${q.id} ${win ? `${win.label} [${win.source}]` : "окно неизвестно"}`;
        })
        .join(", ");
      log(
        `Расписание энергии (${source}):` +
          (catalogLine ? ` клиент [${catalogLine}]` : " клиент не распарсился") +
          `; квесты [${questLine || "нет"}]; gmt=${app.Model.user.gmt ?? "?"}.`
      );

      if (!state.shapeLogged && quests.length > 0) {
        state.shapeLogged = true;
        log(
          "Поля energy-квестов:",
          quests.map((q) => ({
            id: q.id,
            type: q.type,
            keys: Object.keys(q),
            data: q.data ?? null,
            reward: q.reward ?? null,
            progress: q.progress,
            required: q.required,
            rt: q.rt,
            name: safeQuestName(q),
          }))
        );
      }
      return quests;
    }

    function isClaimed(quest) {
      return Number(quest?.rt) > 0;
    }

    function isProgressComplete(quest) {
      try {
        return Boolean(app.UserUtil.isQuestComplete(quest));
      } catch (_err) {
        const progress = Number(quest.progress) || 0;
        const required = Number(quest.required) || 0;
        return required > 0 && progress >= required;
      }
    }

    function isClaimable(quest) {
      if (!quest || isClaimed(quest)) return false;
      // Energy quests stay progress=0 until UserQuestsVisit; the live window is the real gate.
      if (getWindowPhase(quest).phase === "now") return true;
      return isProgressComplete(quest);
    }

    function getQuestWindow(quest) {
      const key = quest.type || String(quest.id);
      if (!state.windows[key]) {
        state.windows[key] = buildQuestWindow(quest);
      }
      return state.windows[key];
    }

    function getWindowBounds(quest) {
      const spec = getQuestWindow(quest);
      if (!spec || !app.TimeUtil) return null;
      if (spec.startTs != null && spec.endTs != null) {
        return {
          start: new Date(spec.startTs),
          end: new Date(spec.endTs),
        };
      }
      const start = app.TimeUtil._getMoscowTime(app.TimeUtil.now());
      app.TimeUtil.resetDate(start);
      start.setHours(spec.startHour, spec.startMinute || 0, 0, 0);
      const end = app.TimeUtil._getMoscowTime(app.TimeUtil.now());
      app.TimeUtil.resetDate(end);
      end.setHours(spec.endHour, spec.endMinute || 0, 0, 0);
      return { start, end };
    }

    function getWindowPhase(quest) {
      const spec = getQuestWindow(quest);
      const now = app.TimeUtil.now();
      if (spec?.startTs != null && spec?.endTs != null) {
        if (now < spec.startTs) {
          const untilStart = spec.startTs - now;
          const deep = untilStart > 5 * app.TimeUtil.M_MS && untilStart < app.TimeUtil.H_MS ? 1 : 2;
          return {
            phase: "before",
            text: `через ${app.TimeUtil.formatToHumanTime(untilStart, deep)}`,
          };
        }
        if (now < spec.endTs) return { phase: "now", text: "сейчас" };
        return { phase: "after", text: "завтра" };
      }
      const bounds = getWindowBounds(quest);
      if (!bounds) return { phase: "unknown", text: spec?.label || quest.type };
      const moscowNow = app.TimeUtil._getMoscowTime(now);
      const untilStart = bounds.start.getTime() - moscowNow.getTime();
      if (untilStart > 0) {
        const deep = untilStart > 5 * app.TimeUtil.M_MS && untilStart < app.TimeUtil.H_MS ? 1 : 2;
        return {
          phase: "before",
          text: `через ${app.TimeUtil.formatToHumanTime(untilStart, deep)}`,
        };
      }
      const untilEnd = bounds.end.getTime() - moscowNow.getTime();
      if (untilEnd > 0) return { phase: "now", text: "сейчас" };
      return { phase: "after", text: "завтра" };
    }

    function windowVisitKey(quest) {
      const spec = getQuestWindow(quest);
      const moscow = app.TimeUtil._getMoscowTime(app.TimeUtil.now());
      const day = `${moscow.getFullYear()}-${moscow.getMonth() + 1}-${moscow.getDate()}`;
      return `${quest.id}:${spec?.label || quest.type}:${day}`;
    }

    function describeQuest(quest) {
      const spec = getQuestWindow(quest);
      const label = spec?.label || quest.type;
      if (isClaimed(quest)) return `${label}: получено`;
      if (isClaimable(quest)) return `${label}: можно забрать`;
      return `${label}: ${getWindowPhase(quest).text}`;
    }

    function getClaimableQuests() {
      return getEnergyQuests().filter(isClaimable);
    }

    function getEnergyHudEls() {
      try {
        return app.MainPage.getCFG()?.resources?.energy?.els || null;
      } catch (_err) {
        return null;
      }
    }

    function refreshEnergyHud() {
      const energy = app.Model.user?.energy;
      const els = getEnergyHudEls();
      if (energy && els && els.value) {
        const html =
          app.Utils && typeof app.Utils.toMoney === "function"
            ? app.Utils.toMoney(energy.v)
            : String(energy.v);
        els.value.innerHTML = html;
        els.value.className = energy.v >= energy.max ? "red" : "";
      }
      try {
        app.EventDispatcher.emit("user resources changed");
      } catch (_err) {
        // HUD already written above
      }
    }

    function applyEnergyRewardIfNeeded(before, response, quest) {
      const after = Number(app.Model.user?.energy?.v);
      if (Number.isFinite(before) && Number.isFinite(after) && after !== before) {
        return { before, after, applied: "server" };
      }
      const fromUser = Number(response?.user?.energy?.v);
      if (Number.isFinite(fromUser) && Number.isFinite(before) && fromUser !== before) {
        app.Model.user.energy.v = fromUser;
        if (response.user.energy.max != null) {
          app.Model.user.energy.max = response.user.energy.max;
        }
        return { before, after: fromUser, applied: "response" };
      }
      const reward = Number(quest?.reward?.energy);
      if (Number.isFinite(before) && Number.isFinite(reward) && reward > 0) {
        app.Model.user.energy.v = before + reward;
        return { before, after: before + reward, applied: "reward" };
      }
      return { before, after, applied: "none" };
    }

    function overlayStatusText() {
      if (!state.userReady) return "Энергия: ждём модель";
      const lines = getEnergyQuests().map(describeQuest);
      return lines.length > 0 ? lines.join("\n") : "Энергия: нет квестов";
    }

    function updateOverlay() {
      if (state.autoButton) {
        state.autoButton.title = overlayStatusText();
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

    function styleControlButton(btn) {
      btn.type = "button";
      btn.style.cursor = "pointer";
      btn.style.border = "1px solid #777";
      btn.style.borderRadius = "6px";
      btn.style.padding = "4px 8px";
      btn.style.background = "#2b2b2b";
      btn.style.color = "#fff";
    }

    function ensureOverlay() {
      if (state.overlay) return;

      const host = document.getElementById("ab-overlay");
      const autoBtn = document.createElement("button");
      styleControlButton(autoBtn);
      autoBtn.textContent = "Энергия";
      autoBtn.addEventListener("click", () => {
        state.autoEnabled = !state.autoEnabled;
        saveAutoEnabled();
        if (!state.autoEnabled) {
          state.claimToken += 1;
          state.claiming = false;
        }
        log("Автоэнергия:", state.autoEnabled ? "вкл" : "выкл");
        updateOverlay();
      });

      if (host) {
        host.appendChild(autoBtn);
        state.overlay = host;
      } else {
        const root = document.createElement("div");
        root.id = "ae-overlay";
        root.style.position = "fixed";
        root.style.top = "12px";
        root.style.left = "12px";
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
        root.appendChild(autoBtn);
        document.body.appendChild(root);
        state.overlay = root;
      }

      state.autoButton = autoBtn;
      updateOverlay();
    }

    function markQuestClaimed(quest) {
      if (!quest.rt) {
        quest.rt = app.TimeUtil.now();
      }
      try {
        app.UserUtil.setQuestByID(quest.id, quest);
      } catch (_err) {
        // model already holds the same object
      }
    }

    function onClaimSuccess(quest, token, energyBefore, response) {
      if (token !== state.claimToken) return;
      const applied = applyEnergyRewardIfNeeded(energyBefore, response, quest);
      markQuestClaimed(quest);
      refreshEnergyHud();
      log(
        `${quest.type}: получено.` +
          (Number.isFinite(applied.before) && Number.isFinite(applied.after)
            ? ` энергия ${applied.before} → ${applied.after} (${applied.applied}).`
            : "")
      );
      state.claiming = false;
      delete state.claimAttempts[quest.id];
      delete state.claimCooldownUntil[quest.id];
      updateOverlay();
    }

    function retryClaim(quest, token, reason) {
      if (token !== state.claimToken) return;
      const n = (state.claimAttempts[quest.id] || 0) + 1;
      state.claiming = false;
      if (n >= CONFIG.maxClaimAttempts) {
        state.claimAttempts[quest.id] = 0;
        state.claimCooldownUntil[quest.id] = Date.now() + CONFIG.claimCooldownMs;
        log(
          `${quest.type}: ошибка (${reason}). Пауза ${Math.round(CONFIG.claimCooldownMs / 1000)}с, потом ещё раз.`
        );
        return;
      }
      state.claimAttempts[quest.id] = n;
      log(`${quest.type}: повтор ${n}/${CONFIG.maxClaimAttempts} — ${reason}.`);
    }

    function sendUserQuestsVisit(quest, token, done) {
      const key = windowVisitKey(quest);
      if (state.visitedWindows[key]) {
        done();
        return;
      }
      state.visitedWindows[key] = true;
      log(
        `${quest.type}: UserQuestsVisit (окно открыто, в модели ${quest.progress}/${quest.required}, rt=${quest.rt || 0}).`
      );
      app.Network.command({ cmd: "UserQuestsVisit" }, () => {
        if (token !== state.claimToken) return;
        done();
      });
    }

    function performClaim(quest, token) {
      if (token !== state.claimToken) return;
      if (!state.autoEnabled) {
        state.claiming = false;
        return;
      }
      if (!isClaimable(quest)) {
        state.claiming = false;
        return;
      }

      sendUserQuestsVisit(quest, token, () => {
        if (token !== state.claimToken) return;
        if (!state.autoEnabled || !isClaimable(quest)) {
          state.claiming = false;
          return;
        }
        const energyBefore = Number(app.Model.user?.energy?.v);
        const byWindow = getWindowPhase(quest).phase === "now" && !isProgressComplete(quest);
        log(
          `${quest.type}: UserQuestComplete id=${quest.id}` +
            (byWindow ? " (по окну, прогресс ещё 0)." : ".")
        );
        app.Network.command({ cmd: "UserQuestComplete", quest: quest.id }, (response) => {
          if (token !== state.claimToken) return;
          if (!state.autoEnabled) {
            state.claiming = false;
            return;
          }
          if (response && response.error) {
            retryClaim(
              quest,
              token,
              `ошибка сервера ${response.error?.code ?? ""}`.trim()
            );
            return;
          }
          onClaimSuccess(quest, token, energyBefore, response || {});
        });
      });
    }

    function scheduleClaim(quest, source) {
      if (!state.autoEnabled) return;
      if (state.claiming) return;
      if (Date.now() < (state.claimCooldownUntil[quest.id] || 0)) return;

      state.claiming = true;
      const token = (state.claimToken += 1);
      const waitMs = jitterDelay(CONFIG.delays.afterClaimable, CONFIG.delays.afterClaimableJitter);
      log(`${quest.type}: можно забрать (${source}), команда через ${waitMs}ms.`);
      setTimeout(() => performClaim(quest, token), waitMs);
    }

    function scan(source) {
      if (!isUserReady()) return;
      if (source === "boot" || Object.keys(state.windows).length === 0) {
        refreshWindows(source);
      }
      const quests = getEnergyQuests();
      const statusKey = quests.map(describeQuest).join("|");
      if (statusKey !== state.lastStatusKey) {
        if (source !== "boot" && quests.some((q) => !state.windows[q.type || String(q.id)])) {
          refreshWindows(source);
        }
        state.lastStatusKey = statusKey;
        if (quests.length > 0) {
          log(`Статус: ${statusKey}. (${source})`);
        }
        updateOverlay();
      }

      if (!state.autoEnabled) return;
      const claimable = getClaimableQuests();
      if (claimable.length === 0) return;
      scheduleClaim(claimable[0], source);
    }

    function hookEvents() {
      if (app.EventDispatcher && typeof app.EventDispatcher.on === "function") {
        app.EventDispatcher.on("UPDATE_USER_DATA", () => {
          scan("event:UPDATE_USER_DATA");
        });
      }

      if (app.EventUtil && typeof app.EventUtil.PROCESS_EVENT === "function") {
        const original = app.EventUtil.PROCESS_EVENT.bind(app.EventUtil);
        app.EventUtil.PROCESS_EVENT = function patchedProcessEvent(event) {
          try {
            if (event && event.type === "GAME_MESSAGE" && typeof event.message === "string") {
              if (/энерг/i.test(event.message)) {
                log("GAME_MESSAGE про энергию:", event.message);
              }
            }
            if (event && event.type === "UPDATE" && event.user && event.user.quests) {
              setTimeout(() => scan("event:UPDATE.quests"), 50);
            }
          } catch (err) {
            log("PROCESS_EVENT hook failed:", err);
          }
          return original(event);
        };
      }
    }

    function startPolling() {
      if (state.pollTimer) return;
      state.pollTimer = setInterval(() => scan("poll"), CONFIG.pollMs);
    }

    function waitForUser() {
      if (isUserReady()) {
        state.userReady = true;
        log("Модель игрока готова.");
        ensureOverlay();
        hookEvents();
        startPolling();
        scan("boot");
        return;
      }
      setTimeout(waitForUser, CONFIG.userReadyPollMs);
    }

    ensureOverlay();
    waitForUser();
    log("Energy claim module initialized.");
  });
})();

(function () {
  "use strict";

  const helper = window.KeepersHelper;
  if (!helper || typeof helper.registerModule !== "function") {
    console.warn("[KeepersHelper/Arena] Core module is missing.");
    return;
  }

  helper.registerModule("arena-auto", (core) => {
    const STORAGE_KEY = "keepersHelper.arena.autoEnabled";
    const BATTLE_COST = { t: 1, v: 5 };

    const CONFIG = {
      pollMs: 2000,
      userReadyPollMs: 400,
      powerSlack: 1.1,
      maxRefreshesPerCycle: 10,
      refreshCooldownMs: 30000,
      delays: {
        afterReady: 400,
        afterReadyJitter: 350,
        betweenRefresh: 700,
        betweenRefreshJitter: 500,
        afterBattle: 200,
        afterBattleJitter: 150,
      },
    };

    const state = {
      autoEnabled: loadAutoEnabled(),
      userReady: false,
      busy: false,
      cycleToken: 0,
      refreshCooldownUntil: 0,
      lastStatusKey: null,
      lastWaitLogKey: null,
      localRt: 0,
      overlay: null,
      autoButton: null,
      pollTimer: null,
    };

    function log(...args) {
      core.log("[AutoArena]", ...args);
    }

    function loadAutoEnabled() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === "0") return false;
        if (raw === "1") return true;
      } catch (_err) {
        // ignore
      }
      return true;
    }

    function saveAutoEnabled() {
      try {
        window.localStorage.setItem(STORAGE_KEY, state.autoEnabled ? "1" : "0");
      } catch (_err) {
        // ignore
      }
    }

    function jitterDelay(baseMs, jitterMs) {
      const base = Math.max(0, Number(baseMs) || 0);
      const jitter = Math.max(0, Number(jitterMs) || 0);
      const extra = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
      return base + extra;
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function isUserReady() {
      return Boolean(
        window.app &&
          app.Model &&
          app.Model.user &&
          app.Model.user.arena &&
          app.Model.user.arena.entry &&
          app.UserUtil &&
          typeof app.UserUtil.getDeckCardsPower === "function" &&
          app.TimeUtil &&
          typeof app.TimeUtil.now === "function" &&
          app.Network &&
          typeof app.Network.command === "function" &&
          app.EventDispatcher
      );
    }

    function sendCommand(body) {
      return new Promise((resolve) => {
        app.Network.command(body, (response) => resolve(response || {}));
      });
    }

    function getArena() {
      return app.Model.user?.arena || null;
    }

    function getEntry() {
      return getArena()?.entry || null;
    }

    function getAttempts() {
      const attempts = getArena()?.attempts;
      const value = Number(attempts?.value) || 0;
      const baseMax = Number(attempts?.max) || 0;
      let max = baseMax;
      try {
        if (app.UserUtil.isPremiumActive && app.UserUtil.isPremiumActive()) {
          const bonus = Number(app.Model.user?.premium?.v?.cfg?.bonus?.arena) || 0;
          max = baseMax + bonus;
        }
      } catch (_err) {
        // keep base max
      }
      return { value, max, baseMax };
    }

    function getOwnPower() {
      try {
        const power = Number(app.UserUtil.getDeckCardsPower());
        return Number.isFinite(power) ? power : 0;
      } catch (_err) {
        return 0;
      }
    }

    function getPowerLimit(ownPower) {
      return ownPower * CONFIG.powerSlack;
    }

    function getEnemies() {
      const list = getEntry()?.enemies;
      return Array.isArray(list) ? list : [];
    }

    function getEnemyPower(enemy) {
      return Number(enemy?.u?.pwr) || 0;
    }

    function getEnemyId(enemy) {
      return enemy?.u?.id;
    }

    function getEnemyName(enemy) {
      return enemy?.u?.n || String(getEnemyId(enemy) || "?");
    }

    function formatPower(value) {
      const n = Number(value) || 0;
      try {
        if (app.Utils && typeof app.Utils.toMoney === "function") {
          return app.Utils.toMoney(n);
        }
      } catch (_err) {
        // fall through
      }
      return String(n);
    }

    function formatRemain(ms) {
      const left = Math.max(0, Number(ms) || 0);
      try {
        if (app.TimeUtil && typeof app.TimeUtil.formatToHumanTime === "function") {
          return app.TimeUtil.formatToHumanTime(left, 2);
        }
      } catch (_err) {
        // fall through
      }
      const totalSec = Math.ceil(left / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      if (h > 0) return `${h}ч ${m}м`;
      const s = totalSec % 60;
      if (m > 0) return `${m}м ${s}с`;
      return `${s}с`;
    }

    function rewardWaitMs() {
      const now = app.TimeUtil.now();
      const rt = Number(getEntry()?.rt) || 0;
      const serverWait = rt > now ? rt - now : 0;
      const localWait = state.localRt > now ? state.localRt - now : 0;
      return Math.max(serverWait, localWait);
    }

    function canPayBattle() {
      try {
        if (typeof app.UserUtil.canPay === "function") {
          return app.UserUtil.canPay(BATTLE_COST);
        }
      } catch (_err) {
        // fall through
      }
      try {
        return (app.UserUtil.getGemsTotal?.() || 0) >= BATTLE_COST.v;
      } catch (_err) {
        return false;
      }
    }

    function isLiveBattleOpen() {
      try {
        if (!app.Popups || typeof app.Popups.getLast !== "function") return false;
        const popup = app.Popups.getLast();
        return Boolean(popup && popup.cfg && popup.cfg.id === "BATTLE");
      } catch (_err) {
        return false;
      }
    }

    function refreshResourcesHud() {
      try {
        app.EventDispatcher.emit("user resources changed");
      } catch (_err) {
        // HUD already updated by Network
      }
    }

    function describeSnapshot() {
      const attempts = getAttempts();
      const ownPower = getOwnPower();
      const limit = getPowerLimit(ownPower);
      const waitMs = rewardWaitMs();
      const first = getEnemies()[0];
      const firstPwr = first ? getEnemyPower(first) : 0;
      const lines = [
        `Попытки: ${attempts.value} из ${attempts.max}`,
        `Мощь колоды: ${formatPower(ownPower)} (лимит соперника ${formatPower(Math.floor(limit))})`,
      ];
      if (waitMs > 0) {
        lines.push(`Награда через: ${formatRemain(waitMs)}`);
      } else {
        const rt = Number(getEntry()?.rt) || 0;
        lines.push(rt ? "Награда: в процессе" : "Награда: можно бить");
      }
      if (first) {
        const ok = firstPwr <= limit;
        lines.push(
          `Первый: ${getEnemyName(first)} ${formatPower(firstPwr)}${ok ? " ✓" : " слишком сильный"}`
        );
      } else {
        lines.push("Первый: нет списка");
      }
      if (!canPayBattle()) {
        lines.push(`Кристаллы: нужно ${BATTLE_COST.v}`);
      }
      if (state.busy) lines.push("Сейчас: цикл боя");
      return lines.join("\n");
    }

    function overlayStatusText() {
      if (!state.userReady) return "Арена: ждём модель";
      return describeSnapshot();
    }

    function updateOverlay() {
      if (!state.autoButton) return;
      state.autoButton.title = overlayStatusText();
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

    function styleControlButton(btn) {
      btn.type = "button";
      btn.style.cursor = "pointer";
      btn.style.border = "1px solid #777";
      btn.style.borderRadius = "6px";
      btn.style.padding = "4px 8px";
      btn.style.background = "#2b2b2b";
      btn.style.color = "#fff";
    }

    function ensureOverlay() {
      if (state.overlay) return;

      const autoBtn = document.createElement("button");
      styleControlButton(autoBtn);
      autoBtn.textContent = "Арена";
      autoBtn.addEventListener("click", () => {
        state.autoEnabled = !state.autoEnabled;
        saveAutoEnabled();
        if (!state.autoEnabled) {
          state.cycleToken += 1;
          state.busy = false;
        }
        log("Автоарена:", state.autoEnabled ? "вкл" : "выкл");
        updateOverlay();
      });

      const host =
        document.getElementById("ab-overlay") || document.getElementById("ae-overlay");
      if (host) {
        host.appendChild(autoBtn);
        state.overlay = host;
      } else {
        const root = document.createElement("div");
        root.id = "aa-overlay";
        root.style.position = "fixed";
        root.style.top = "12px";
        root.style.left = "12px";
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
        root.appendChild(autoBtn);
        document.body.appendChild(root);
        state.overlay = root;
      }

      state.autoButton = autoBtn;
      updateOverlay();
    }

    function logWaitOnce(key, ...args) {
      if (state.lastWaitLogKey === key) return;
      state.lastWaitLogKey = key;
      log(...args);
    }

    function tokenAlive(token) {
      return token === state.cycleToken && state.autoEnabled;
    }

    function isEnemyAcceptable(enemy, ownPower) {
      if (!getEnemyId(enemy)) return false;
      return getEnemyPower(enemy) <= getPowerLimit(ownPower);
    }

    async function refreshEnemies(token) {
      log("ArenaEnemiesUpdate.");
      const response = await sendCommand({ cmd: "ArenaEnemiesUpdate" });
      if (!tokenAlive(token)) return null;
      if (response.error) {
        log("Обновление списка: ошибка", response.error.code ?? response.error);
        return null;
      }
      return getEnemies();
    }

    async function runCycle(token, source) {
      const ownPower = getOwnPower();
      if (ownPower <= 0) {
        logWaitOnce("no-power", "Нет мощи боевой колоды, пропускаем.");
        return;
      }

      const limit = getPowerLimit(ownPower);
      let enemies = getEnemies();
      let refreshes = 0;

      const pickFirst = () => enemies[0] || null;

      if (!pickFirst()) {
        enemies = (await refreshEnemies(token)) || [];
        refreshes += 1;
        if (!tokenAlive(token)) return;
      }

      while (tokenAlive(token) && !isEnemyAcceptable(pickFirst(), ownPower)) {
        const first = pickFirst();
        const pwr = first ? getEnemyPower(first) : 0;
        const name = first ? getEnemyName(first) : "нет";
        if (refreshes >= CONFIG.maxRefreshesPerCycle) {
          state.refreshCooldownUntil = Date.now() + CONFIG.refreshCooldownMs;
          log(
            `Первый (${name}, ${formatPower(pwr)}) сильнее лимита ${formatPower(Math.floor(limit))}. ` +
              `Пауза ${Math.round(CONFIG.refreshCooldownMs / 1000)}с после ${refreshes} обновлений.`
          );
          return;
        }
        log(
          `Первый ${name} ${formatPower(pwr)} > ${formatPower(Math.floor(limit))}, обновляем список.`
        );
        await sleep(jitterDelay(CONFIG.delays.betweenRefresh, CONFIG.delays.betweenRefreshJitter));
        if (!tokenAlive(token)) return;
        enemies = (await refreshEnemies(token)) || [];
        refreshes += 1;
      }

      if (!tokenAlive(token)) return;

      const enemy = pickFirst();
      const enemyId = getEnemyId(enemy);
      if (!enemyId) {
        log("Нет соперника после обновлений.");
        return;
      }

      log(
        `Бой (${source}): ${getEnemyName(enemy)} ${formatPower(getEnemyPower(enemy))} ` +
          `против ${formatPower(ownPower)}, авто.`
      );
      const battle = await sendCommand({ cmd: "ArenaBattle", enemy: enemyId, auto: 1 });
      if (!tokenAlive(token)) return;

      if (battle.error) {
        const code = battle.error.code;
        try {
          if (app.Utils && typeof app.Utils.processErrors === "function") {
            app.Utils.processErrors(battle.error);
          }
        } catch (_err) {
          // ignore
        }
        if (code === 5) {
          log("Место изменилось, список устарел.");
          await refreshEnemies(token);
          return;
        }
        if (code === 4) {
          logWaitOnce("in-battle", "Соперник или мы уже в бою, ждём.");
          return;
        }
        if (code === 3) {
          logWaitOnce("no-attempts-server", "Сервер: попытки закончились.");
          return;
        }
        if (code === 6) {
          logWaitOnce("no-gems-server", "Сервер: не хватает кристаллов.");
          return;
        }
        log("ArenaBattle ошибка", code ?? battle.error);
        return;
      }

      refreshResourcesHud();
      if (rewardWaitMs() <= 0) {
        state.localRt = app.TimeUtil.now() + 2 * 60 * 60 * 1000;
      }
      await sleep(jitterDelay(CONFIG.delays.afterBattle, CONFIG.delays.afterBattleJitter));
      if (!tokenAlive(token)) return;

      const end = await sendCommand({ cmd: "ArenaBattleEnd" });
      if (!tokenAlive(token)) return;
      if (end.error) {
        log("ArenaBattleEnd ошибка", end.error.code ?? end.error);
      } else {
        const placeNow = end.placeNow;
        const placeOld = end.placeOld;
        const attempts = getAttempts();
        const waitMs = rewardWaitMs();
        log(
          `Бой закрыт.` +
            (placeOld != null && placeNow != null ? ` Место ${placeOld} → ${placeNow}.` : "") +
            ` Попытки ${attempts.value} из ${attempts.max}.` +
            (waitMs > 0 ? ` Следующий через ${formatRemain(waitMs)}.` : "")
        );
      }
      refreshResourcesHud();
    }

    function getIdleBlockReason() {
      if (!state.autoEnabled) return "выкл";
      if (isLiveBattleOpen()) return "battle";
      const attempts = getAttempts();
      if (attempts.value <= 0) return "attempts";
      const waitMs = rewardWaitMs();
      if (waitMs > 0) return `rt:${Math.ceil(waitMs / 1000)}`;
      if (Date.now() < state.refreshCooldownUntil) return "refresh-cd";
      if (!canPayBattle()) return "gems";
      if (getOwnPower() <= 0) return "power";
      return null;
    }

    function scheduleCycle(source) {
      if (state.busy) return;
      if (getIdleBlockReason()) return;

      state.busy = true;
      const token = (state.cycleToken += 1);
      const waitMs = jitterDelay(CONFIG.delays.afterReady, CONFIG.delays.afterReadyJitter);
      log(`Можно бить (${source}), команда через ${waitMs}ms.`);
      setTimeout(async () => {
        if (!tokenAlive(token)) {
          state.busy = false;
          return;
        }
        if (getIdleBlockReason()) {
          state.busy = false;
          updateOverlay();
          return;
        }
        try {
          await runCycle(token, source);
        } catch (err) {
          log("Цикл арены упал:", err);
        } finally {
          if (token === state.cycleToken) state.busy = false;
          state.lastWaitLogKey = null;
          updateOverlay();
        }
      }, waitMs);
    }

    function scan(source) {
      if (!isUserReady()) return;
      const reason = state.busy ? "busy" : getIdleBlockReason();
      const statusKey = `${reason || "ready"}|${describeSnapshot()}`;
      if (statusKey !== state.lastStatusKey) {
        state.lastStatusKey = statusKey;
        updateOverlay();
      }

      if (!state.autoEnabled) return;
      if (reason === "battle") {
        logWaitOnce("battle", "Идёт бой, арену подождём.");
        return;
      }
      if (reason === "attempts") {
        const a = getAttempts();
        logWaitOnce("attempts", `Попыток нет (${a.value} из ${a.max}).`);
        return;
      }
      if (reason && String(reason).startsWith("rt:")) {
        logWaitOnce("rt", `Ждём награду: ${formatRemain(rewardWaitMs())}.`);
        return;
      }
      if (reason === "refresh-cd") {
        const left = Math.max(0, state.refreshCooldownUntil - Date.now());
        logWaitOnce("refresh-cd", `Пауза обновлений списка: ${formatRemain(left)}.`);
        return;
      }
      if (reason === "gems") {
        logWaitOnce("gems", `Не хватает кристаллов на автобой (${BATTLE_COST.v}).`);
        return;
      }
      if (reason === "power") {
        logWaitOnce("power", "Нет мощи боевой колоды.");
        return;
      }
      if (reason) return;
      scheduleCycle(source);
    }

    function hookEvents() {
      if (app.EventDispatcher && typeof app.EventDispatcher.on === "function") {
        app.EventDispatcher.on("UPDATE_USER_DATA", () => {
          scan("event:UPDATE_USER_DATA");
        });
      }

      if (app.EventUtil && typeof app.EventUtil.PROCESS_EVENT === "function") {
        const original = app.EventUtil.PROCESS_EVENT.bind(app.EventUtil);
        app.EventUtil.PROCESS_EVENT = function patchedProcessEvent(event) {
          try {
            if (event && event.type === "UPDATE" && event.user && event.user.arena) {
              setTimeout(() => scan("event:UPDATE.arena"), 50);
            }
          } catch (err) {
            log("PROCESS_EVENT hook failed:", err);
          }
          return original(event);
        };
      }
    }

    function startPolling() {
      if (state.pollTimer) return;
      state.pollTimer = setInterval(() => scan("poll"), CONFIG.pollMs);
    }

    function waitForUser() {
      if (isUserReady()) {
        state.userReady = true;
        log("Модель игрока готова.");
        ensureOverlay();
        hookEvents();
        startPolling();
        scan("boot");
        return;
      }
      setTimeout(waitForUser, CONFIG.userReadyPollMs);
    }

    ensureOverlay();
    waitForUser();
    log("Arena auto module initialized.");
  });
})();

(function () {
  "use strict";

  const helper = window.KeepersHelper;
  if (!helper || typeof helper.registerModule !== "function") {
    console.warn("[KeepersHelper/Dungeon] Core module is missing.");
    return;
  }

  helper.registerModule("dungeon-auto", (core) => {
    const STORAGE_ENABLED = "keepersHelper.dungeon.autoEnabled";
    const STORAGE_RESULTS = "keepersHelper.dungeon.results";

    const CORRIDORS = [
      { type: "HIT", name: "Золотой" },
      { type: "F", name: "Жаркий" },
      { type: "N", name: "Зелёный" },
      { type: "W", name: "Затопленный" },
    ];

    const STONE_NAMES = {
      D: "пыль",
      C: "крит",
      H: "удар",
      F: "огонь",
      N: "природа",
      W: "вода",
    };

    const CONFIG = {
      pollMs: 2000,
      userReadyPollMs: 400,
      gridSize: 64,
      delays: {
        afterReady: 500,
        afterReadyJitter: 400,
        betweenActions: 400,
        betweenActionsJitter: 300,
      },
    };

    const state = {
      autoEnabled: loadAutoEnabled(),
      userReady: false,
      busy: false,
      cycleToken: 0,
      lastStatusKey: null,
      lastWaitLogKey: null,
      overlay: null,
      autoButton: null,
      pollTimer: null,
      results: loadResults(),
    };

    function log(...args) {
      core.log("[AutoDungeon]", ...args);
    }

    function loadAutoEnabled() {
      try {
        const raw = window.localStorage.getItem(STORAGE_ENABLED);
        if (raw === "0") return false;
        if (raw === "1") return true;
      } catch (_err) {
        // ignore
      }
      return true;
    }

    function saveAutoEnabled() {
      try {
        window.localStorage.setItem(STORAGE_ENABLED, state.autoEnabled ? "1" : "0");
      } catch (_err) {
        // ignore
      }
    }

    function emptyResults(period) {
      return { period, chests: [], quarry: [] };
    }

    // Keepers' daily cycle is the game clock (client: TimeUtil Moscow day), not the
    // player's local midnight. HIT.lot is that day's open ts from the server.
    function currentPeriodStart() {
      const now = app.TimeUtil.now();
      const hitLot = Number(getDungeonEntry("HIT")?.lot) || 0;
      if (hitLot > 0 && hitLot <= now && now - hitLot < 2 * app.TimeUtil.D_MS) {
        return hitLot;
      }
      try {
        if (app.CFGUtil && typeof app.CFGUtil.getDungeonNextOpenTime === "function") {
          return app.CFGUtil.getDungeonNextOpenTime("HIT", now);
        }
      } catch (_err) {
        // fall through
      }
      const caveRt = Number(getCave()?.rt) || 0;
      if (caveRt > now) return caveRt - app.TimeUtil.D_MS;
      return now;
    }

    function loadResults() {
      try {
        const raw = window.localStorage.getItem(STORAGE_RESULTS);
        if (!raw) return emptyResults(null);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return emptyResults(null);
        const period = Number(parsed.period);
        return {
          period: Number.isFinite(period) && period > 0 ? period : null,
          chests: Array.isArray(parsed.chests) ? parsed.chests : [],
          quarry: Array.isArray(parsed.quarry) ? parsed.quarry : [],
        };
      } catch (_err) {
        return emptyResults(null);
      }
    }

    function saveResults() {
      try {
        window.localStorage.setItem(STORAGE_RESULTS, JSON.stringify(state.results));
      } catch (_err) {
        // ignore
      }
    }

    function ensurePeriodResults() {
      const period = currentPeriodStart();
      if (state.results.period !== period) {
        state.results = emptyResults(period);
        saveResults();
      }
      return state.results;
    }

    function jitterDelay(baseMs, jitterMs) {
      const base = Math.max(0, Number(baseMs) || 0);
      const jitter = Math.max(0, Number(jitterMs) || 0);
      const extra = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
      return base + extra;
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function isUserReady() {
      return Boolean(
        window.app &&
          app.Model &&
          app.Model.user &&
          app.TimeUtil &&
          typeof app.TimeUtil.now === "function" &&
          app.Network &&
          typeof app.Network.command === "function" &&
          app.EventDispatcher
      );
    }

    function sendCommand(body) {
      return new Promise((resolve) => {
        app.Network.command(body, (response) => resolve(response || {}));
      });
    }

    function formatRemain(ms) {
      const left = Math.max(0, Number(ms) || 0);
      try {
        if (app.TimeUtil && typeof app.TimeUtil.formatToHumanTime === "function") {
          return app.TimeUtil.formatToHumanTime(left, 2);
        }
      } catch (_err) {
        // fall through
      }
      const totalSec = Math.ceil(left / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      if (h > 0) return `${h}ч ${m}м`;
      const s = totalSec % 60;
      if (m > 0) return `${m}м ${s}с`;
      return `${s}с`;
    }

    function formatMoney(value) {
      const n = Number(value) || 0;
      try {
        if (app.Utils && typeof app.Utils.toMoney === "function") {
          return app.Utils.toMoney(n);
        }
      } catch (_err) {
        // fall through
      }
      return String(n);
    }

    function itemName(id) {
      try {
        const item = app.CFGUtil?.getItemByID?.(id);
        return item?.name || item?.n || `предмет ${id}`;
      } catch (_err) {
        return `предмет ${id}`;
      }
    }

    function cardName(id) {
      try {
        const card = app.CFGUtil?.getCardByID?.(id);
        return card?.name || card?.n || `карта ${id}`;
      } catch (_err) {
        return `карта ${id}`;
      }
    }

    function formatDrop(drop) {
      const list = drop?.list;
      if (!Array.isArray(list) || list.length === 0) return "пусто";
      return list
        .map((entry) => {
          if (entry.gold) return `${formatMoney(entry.gold)} золота`;
          if (entry.gems) return `${entry.gems} кристаллов`;
          if (entry.item) return `${itemName(entry.item)} ×${entry.value || 1}`;
          if (entry.card) return `${cardName(entry.card)} ×${entry.value || 1}`;
          if (entry.dust) return `${formatMoney(entry.dust)} пыли`;
          if (entry.energy) return `${entry.energy} энергии`;
          return JSON.stringify(entry);
        })
        .join(", ");
    }

    function formatStoneFind(cell, extra) {
      if (!cell) return "ничего";
      if (cell.t === "D") {
        const value = extra?.gbBonus ? extra.value : cell.v;
        const bonus = extra?.gbBonus ? ` (+${extra.gbBonus})` : "";
        return `${STONE_NAMES.D} ${formatMoney(value)}${bonus}`;
      }
      const name = STONE_NAMES[cell.t] || cell.t;
      return `камень «${name}»`;
    }

    function refreshResourcesHud() {
      try {
        app.EventDispatcher.emit("user resources changed");
      } catch (_err) {
        // HUD already updated by Network
      }
    }

    function getDungeonEntry(type) {
      try {
        if (app.UserUtil && typeof app.UserUtil.getDungeonByType === "function") {
          return app.UserUtil.getDungeonByType(type);
        }
      } catch (_err) {
        // fall through
      }
      const dungeon = app.Model.user?.dungeon;
      if (!dungeon) return null;
      if (type === "HIT") return dungeon.b1;
      if (type === "F") return dungeon.b2;
      if (type === "N") return dungeon.b3;
      return dungeon.b4;
    }

    function isChestReady(entry) {
      if (!entry || Number(entry.s) !== 2) return false;
      const lcot = Number(entry.lcot) || 0;
      if (!lcot) return true;
      return app.TimeUtil.now() - lcot >= app.TimeUtil.D_MS;
    }

    function corridorStatus(spec) {
      const entry = getDungeonEntry(spec.type);
      if (!entry) return `${spec.name}: нет данных`;
      if (isChestReady(entry)) return `${spec.name}: сундук`;
      if (Number(entry.s) === 1) return `${spec.name}: бой (пропускаем)`;
      if (Number(entry.s) === 2) {
        const lcot = Number(entry.lcot) || 0;
        const wait = lcot ? app.TimeUtil.D_MS - (app.TimeUtil.now() - lcot) : 0;
        if (wait > 0) return `${spec.name}: сундук через ${formatRemain(wait)}`;
      }
      try {
        if (app.CFGUtil && typeof app.CFGUtil.getDungeonNextOpenTime === "function") {
          const next = app.CFGUtil.getDungeonNextOpenTime(spec.type, app.TimeUtil.now());
          const gameNow = app.TimeUtil._getMoscowTime(app.TimeUtil.now()).getTime();
          const left = next - gameNow;
          if (left > 0) return `${spec.name}: через ${formatRemain(left)}`;
        }
      } catch (_err) {
        // fall through
      }
      return `${spec.name}: закрыт`;
    }

    function getReadyChests() {
      if (!app.Model.user?.dungeon) return [];
      return CORRIDORS.filter((spec) => isChestReady(getDungeonEntry(spec.type)));
    }

    function getCave() {
      return app.Model.user?.s_cave || null;
    }

    function getTriesLeft() {
      try {
        if (app.UserUtil && typeof app.UserUtil.hasStonesCaveTries === "function") {
          if (!app.UserUtil.hasStonesCaveTries()) return 0;
        }
      } catch (_err) {
        // fall through
      }
      const left = Number(getCave()?.t?.l);
      return Number.isFinite(left) && left > 0 ? left : 0;
    }

    function getOccupiedCells() {
      const map = getCave()?.l;
      if (!map || typeof map !== "object") return {};
      return map;
    }

    function listCaveCells() {
      const map = getOccupiedCells();
      const list = [];
      for (const key of Object.keys(map)) {
        const cell = map[key];
        if (!cell) continue;
        list.push({ num: Number(key) || Number(cell.c) || 0, cell });
      }
      return list.sort((a, b) => a.num - b.num);
    }

    function cellTimestamp(cell) {
      return Number(cell?.st) || Number(cell?.et) || Number(cell?.rt) || 0;
    }

    function isCellInCurrentPeriod(cell) {
      const period = currentPeriodStart();
      const ts = cellTimestamp(cell);
      if (!period || !ts) return false;
      const span = app.TimeUtil.D_MS || 24 * 60 * 60 * 1000;
      return ts >= period && ts < period + span;
    }

    function listTodayCaveCells() {
      const dated = listCaveCells().filter((x) => isCellInCurrentPeriod(x.cell));
      if (dated.length > 0) return dated;
      // No timestamps on cells: still count in-progress, otherwise fall back to t.t.
      return listCaveCells().filter((x) => x.cell && !x.cell.t);
    }

    function getTriesUsedToday() {
      const left = getTriesLeft();
      const fromCfg = Number(app.Model.cfg?.cfgStones?.tries) || 8;
      const fromField = listTodayCaveCells().length;
      const fromCounter = Number(getCave()?.t?.t) || 0;
      const inferred = Math.max(0, fromCfg - left);
      return Math.max(fromField, fromCounter, inferred);
    }

    function getTriesMax() {
      const left = getTriesLeft();
      const used = getTriesUsedToday();
      const fromCfg = Number(app.Model.cfg?.cfgStones?.tries) || 0;
      return Math.max(fromCfg, left + used, 8);
    }

    function summarizeCaveCells(cells) {
      const done = cells.filter((x) => x.cell && x.cell.t);
      if (done.length === 0) return "";
      const stones = {};
      let dust = 0;
      let dustCount = 0;
      for (const { cell } of done) {
        if (cell.t === "D") {
          dustCount += 1;
          dust += Number(cell.v) || 0;
        } else {
          stones[cell.t] = (stones[cell.t] || 0) + 1;
        }
      }
      const parts = [];
      if (dustCount) parts.push(`${STONE_NAMES.D} ${dustCount} (${formatMoney(dust)})`);
      for (const type of ["C", "H", "F", "N", "W"]) {
        if (stones[type]) parts.push(`${STONE_NAMES[type]} ${stones[type]}`);
      }
      return parts.join(", ");
    }

    function getCurrentDig() {
      const cave = getCave();
      if (!cave) return null;
      const map = cave.l;
      if (map) {
        for (const key of Object.keys(map)) {
          const cell = map[key];
          if (cell && !cell.t) {
            return { cell, num: Number(key) || Number(cell.c) || 0 };
          }
        }
      }
      if (cave.c && !cave.c.t) {
        return { cell: cave.c, num: Number(cave.c.c) || 0 };
      }
      return null;
    }

    function isDigReady(dig) {
      if (!dig?.cell) return false;
      if (dig.cell.t) return false;
      const et = Number(dig.cell.et) || 0;
      return et > 0 && et <= app.TimeUtil.now();
    }

    function pickRandomFreeCell() {
      const occupied = getOccupiedCells();
      const free = [];
      for (let n = 1; n <= CONFIG.gridSize; n += 1) {
        if (!occupied[String(n)] && !occupied[n]) free.push(n);
      }
      if (free.length === 0) return null;
      return free[Math.floor(Math.random() * free.length)];
    }

    function quarryResetWaitMs() {
      const rt = Number(getCave()?.rt) || 0;
      if (!rt) return 0;
      const now = app.TimeUtil.now();
      return rt > now ? rt - now : 0;
    }

    function recordChest(spec, drop) {
      const results = ensurePeriodResults();
      const text = formatDrop(drop);
      results.chests.push({
        type: spec.type,
        name: spec.name,
        text,
        at: app.TimeUtil.now(),
      });
      saveResults();
      log(`${spec.name}: сундук — ${text}.`);
    }

    function recordQuarry(num, cell, extra) {
      const results = ensurePeriodResults();
      const text = formatStoneFind(cell, extra);
      results.quarry.push({
        cell: num,
        t: cell?.t,
        text,
        at: app.TimeUtil.now(),
      });
      saveResults();
      log(`Клетка ${num}: ${text}.`);
    }

    function tokenAlive(token) {
      return token === state.cycleToken && state.autoEnabled;
    }

    async function claimChest(spec, token) {
      log(`${spec.name}: DungeonChestOpen.`);
      const response = await sendCommand({ cmd: "DungeonChestOpen", type: spec.type });
      if (!tokenAlive(token)) return;
      if (response.error) {
        log(`${spec.name}: ошибка сундука`, response.error.code ?? response.error);
        return;
      }
      try {
        if (response.drop && app.UserUtil && typeof app.UserUtil.processChestDrop === "function") {
          app.UserUtil.processChestDrop(response.drop);
        }
      } catch (_err) {
        // inventory already merged by Network
      }
      recordChest(spec, response.drop);
      refreshResourcesHud();
    }

    async function collectDig(dig, token) {
      log(`Клетка ${dig.num}: StonesCaveSearchCompleted.`);
      const response = await sendCommand({ cmd: "StonesCaveSearchCompleted" });
      if (!tokenAlive(token)) return;
      if (response.error) {
        log(`Сбор клетки ${dig.num}: ошибка`, response.error.code ?? response.error);
        return;
      }
      recordQuarry(dig.num, response.cell || dig.cell, response);
      refreshResourcesHud();
    }

    async function startDig(cellNum, token) {
      log(`Клетка ${cellNum}: StonesCaveStartDig.`);
      const response = await sendCommand({ cmd: "StonesCaveStartDig", cell: cellNum });
      if (!tokenAlive(token)) return;
      if (response.error) {
        const code = response.error.code;
        if (code === 2) log("Уже идёт поиск — ждём или забираем текущую клетку.");
        else if (code === 3) log("Попытки каменоломни закончились.");
        else log("StartDig ошибка", code ?? response.error);
        return;
      }
      const dig = getCurrentDig();
      const waitMs = dig?.cell?.et ? Math.max(0, dig.cell.et - app.TimeUtil.now()) : 0;
      log(
        `Поиск на клетке ${cellNum} начат.` +
          (waitMs > 0 ? ` Готово через ${formatRemain(waitMs)}.` : "") +
          ` Попыток ${getTriesLeft()} из ${getTriesMax()}.`
      );
    }

    async function runCycle(token, source) {
      const chests = getReadyChests();
      for (const spec of chests) {
        if (!tokenAlive(token)) return;
        await claimChest(spec, token);
        await sleep(jitterDelay(CONFIG.delays.betweenActions, CONFIG.delays.betweenActionsJitter));
      }

      if (!getCave()) return;

      const dig = getCurrentDig();
      if (dig && isDigReady(dig)) {
        await collectDig(dig, token);
        if (!tokenAlive(token)) return;
        await sleep(jitterDelay(CONFIG.delays.betweenActions, CONFIG.delays.betweenActionsJitter));
      } else if (dig && !isDigReady(dig)) {
        return;
      }

      if (!tokenAlive(token)) return;
      if (getCurrentDig()) return;
      if (getTriesLeft() <= 0) return;

      const cellNum = pickRandomFreeCell();
      if (!cellNum) {
        logWaitOnce("grid-full", "Поле каменоломни заполнено, ждём сброс.");
        return;
      }
      await startDig(cellNum, token);
    }

    function getIdleBlockReason() {
      if (!state.autoEnabled) return "выкл";
      if (getReadyChests().length > 0) return null;
      const cave = getCave();
      if (!cave && !app.Model.user?.dungeon) return "no-dungeon";
      const dig = getCurrentDig();
      if (dig && isDigReady(dig)) return null;
      if (dig && !isDigReady(dig)) {
        const wait = Math.max(0, Number(dig.cell.et) - app.TimeUtil.now());
        return `dig:${Math.ceil(wait / 1000)}`;
      }
      if (cave && getTriesLeft() > 0 && pickRandomFreeCell()) return null;
      if (cave && getTriesLeft() <= 0) return "tries";
      if (getReadyChests().length === 0) return "idle";
      return null;
    }

    function describeSnapshot() {
      const lines = [];
      if (app.Model.user?.dungeon) {
        lines.push("Сокровища:");
        for (const spec of CORRIDORS) {
          const claimed = ensurePeriodResults().chests.filter((c) => c.type === spec.type);
          if (claimed.length > 0) {
            lines.push(`  ${spec.name}: ${claimed.map((c) => c.text).join("; ")}`);
          } else {
            lines.push(`  ${corridorStatus(spec)}`);
          }
        }
      }
      const cave = getCave();
      if (cave) {
        const left = getTriesLeft();
        const used = getTriesUsedToday();
        const max = getTriesMax();
        const dig = getCurrentDig();
        let quarry = `Каменоломня: осталось ${left}, потрачено ${used} (лимит ${max})`;
        if (dig && isDigReady(dig)) quarry += `, клетка ${dig.num} готова`;
        else if (dig) {
          const wait = Math.max(0, Number(dig.cell.et) - app.TimeUtil.now());
          quarry += `, клетка ${dig.num} ещё ${formatRemain(wait)}`;
        } else if (left <= 0) {
          const reset = quarryResetWaitMs();
          quarry += reset > 0 ? `, сброс через ${formatRemain(reset)}` : "";
        }
        lines.push(quarry);
        const todayDone = listTodayCaveCells().filter((x) => x.cell.t);
        if (todayDone.length > 0) {
          lines.push(
            `  Сегодня: ${todayDone.map((x) => `#${x.num} ${formatStoneFind(x.cell)}`).join("; ")}`
          );
        }
        const allDone = listCaveCells().filter((x) => x.cell.t);
        const fieldLine = summarizeCaveCells(allDone);
        if (fieldLine) {
          lines.push(`  Поле: ${fieldLine} (${allDone.length}/64)`);
        }
        const todaySummary = summarizeCaveCells(todayDone);
        if (todaySummary && todayDone.length > 3) {
          lines.push(`  Сегодня всего: ${todaySummary}`);
        }
      }
      if (state.busy) lines.push("Сейчас: команда");
      return lines.length > 0 ? lines.join("\n") : "Подземелье: нет данных";
    }

    function overlayStatusText() {
      if (!state.userReady) return "Подземелье: ждём модель";
      return describeSnapshot();
    }

    function updateOverlay() {
      if (!state.autoButton) return;
      state.autoButton.title = overlayStatusText();
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

    function styleControlButton(btn) {
      btn.type = "button";
      btn.style.cursor = "pointer";
      btn.style.border = "1px solid #777";
      btn.style.borderRadius = "6px";
      btn.style.padding = "4px 8px";
      btn.style.background = "#2b2b2b";
      btn.style.color = "#fff";
    }

    function ensureOverlay() {
      if (state.overlay) return;

      const autoBtn = document.createElement("button");
      styleControlButton(autoBtn);
      autoBtn.textContent = "Подземелье";
      autoBtn.addEventListener("click", () => {
        state.autoEnabled = !state.autoEnabled;
        saveAutoEnabled();
        if (!state.autoEnabled) {
          state.cycleToken += 1;
          state.busy = false;
        }
        log("Автоподземелье:", state.autoEnabled ? "вкл" : "выкл");
        updateOverlay();
      });

      const host =
        document.getElementById("ab-overlay") ||
        document.getElementById("ae-overlay") ||
        document.getElementById("aa-overlay");
      if (host) {
        host.appendChild(autoBtn);
        state.overlay = host;
      } else {
        const root = document.createElement("div");
        root.id = "ad-overlay";
        root.style.position = "fixed";
        root.style.top = "12px";
        root.style.left = "12px";
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
        root.appendChild(autoBtn);
        document.body.appendChild(root);
        state.overlay = root;
      }

      state.autoButton = autoBtn;
      updateOverlay();
    }

    function logWaitOnce(key, ...args) {
      if (state.lastWaitLogKey === key) return;
      state.lastWaitLogKey = key;
      log(...args);
    }

    function scheduleCycle(source) {
      if (state.busy) return;
      if (getIdleBlockReason()) return;

      state.busy = true;
      const token = (state.cycleToken += 1);
      const waitMs = jitterDelay(CONFIG.delays.afterReady, CONFIG.delays.afterReadyJitter);
      log(`Есть действие (${source}), команда через ${waitMs}ms.`);
      setTimeout(async () => {
        if (!tokenAlive(token)) {
          state.busy = false;
          return;
        }
        if (getIdleBlockReason()) {
          state.busy = false;
          updateOverlay();
          return;
        }
        try {
          await runCycle(token, source);
        } catch (err) {
          log("Цикл подземелья упал:", err);
        } finally {
          if (token === state.cycleToken) state.busy = false;
          state.lastWaitLogKey = null;
          updateOverlay();
        }
      }, waitMs);
    }

    function scan(source) {
      if (!isUserReady()) return;
      ensurePeriodResults();
      const reason = state.busy ? "busy" : getIdleBlockReason();
      const statusKey = `${reason || "ready"}|${describeSnapshot()}`;
      if (statusKey !== state.lastStatusKey) {
        state.lastStatusKey = statusKey;
        updateOverlay();
      }

      if (!state.autoEnabled) return;
      if (reason === "no-dungeon") {
        logWaitOnce("no-dungeon", "Подземелье в модели ещё нет.");
        return;
      }
      if (reason && String(reason).startsWith("dig:")) {
        const dig = getCurrentDig();
        const wait = dig?.cell?.et ? Math.max(0, dig.cell.et - app.TimeUtil.now()) : 0;
        logWaitOnce("dig", `Ждём поиск на клетке ${dig?.num}: ${formatRemain(wait)}.`);
        return;
      }
      if (reason === "tries") {
        const reset = quarryResetWaitMs();
        logWaitOnce(
          "tries",
          `Попыток каменоломни нет (${getTriesLeft()} из ${getTriesMax()}).` +
            (reset > 0 ? ` Сброс через ${formatRemain(reset)}.` : "")
        );
        return;
      }
      if (reason === "idle") {
        logWaitOnce("idle", "Сундуков нет, каменоломня ждёт.");
        return;
      }
      if (reason) return;
      scheduleCycle(source);
    }

    function hookEvents() {
      if (app.EventDispatcher && typeof app.EventDispatcher.on === "function") {
        app.EventDispatcher.on("UPDATE_USER_DATA", () => {
          scan("event:UPDATE_USER_DATA");
        });
      }

      if (app.EventUtil && typeof app.EventUtil.PROCESS_EVENT === "function") {
        const original = app.EventUtil.PROCESS_EVENT.bind(app.EventUtil);
        app.EventUtil.PROCESS_EVENT = function patchedProcessEvent(event) {
          try {
            if (event && event.type === "UPDATE" && event.user && (event.user.dungeon || event.user.s_cave)) {
              setTimeout(() => scan("event:UPDATE.dungeon"), 50);
            }
          } catch (err) {
            log("PROCESS_EVENT hook failed:", err);
          }
          return original(event);
        };
      }
    }

    function startPolling() {
      if (state.pollTimer) return;
      state.pollTimer = setInterval(() => scan("poll"), CONFIG.pollMs);
    }

    function waitForUser() {
      if (isUserReady()) {
        state.userReady = true;
        log("Модель игрока готова.");
        ensurePeriodResults();
        ensureOverlay();
        hookEvents();
        startPolling();
        scan("boot");
        return;
      }
      setTimeout(waitForUser, CONFIG.userReadyPollMs);
    }

    ensureOverlay();
    waitForUser();
    log("Dungeon auto module initialized.");
  });
})();

