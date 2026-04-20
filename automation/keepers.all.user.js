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
      reactionDelayMs: 900,
      reactionJitterMs: 400,
      popupPollMs: 600,
      popupMissThreshold: 3,
    };

    const state = {
      battleActive: false,
      readyLogged: false,
      autoEnabled: false,
      popupMisses: 0,
      currentPhase: null,
      currentPhaseSource: null,
      lastRecommendationKey: null,
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
      autoBtn.textContent = "Авто";
      autoBtn.style.cursor = "pointer";
      autoBtn.style.border = "1px solid #777";
      autoBtn.style.borderRadius = "6px";
      autoBtn.style.padding = "4px 8px";
      autoBtn.style.background = "#2b2b2b";
      autoBtn.style.color = "#fff";
      autoBtn.addEventListener("click", () => {
        state.autoEnabled = !state.autoEnabled;
        log("Auto toggled:", state.autoEnabled);
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

        if (Array.isArray(cards) && cards.length === 3 && cards.every((c) => c && typeof c === "object")) {
          const ids = cards.map((c, idx) => getCardId(c, idx));
          const validCardCount = ids.filter((id) => isValidCardId(id)).length;
          const candidate = { cards, source: value, path, stateValue, validCardCount };
          if (stateValue === "CARD_SELECTION" && validCardCount > 0) {
            strictCandidates.push(candidate);
          } else if (validCardCount === 3 && /battle/i.test(path)) {
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

    function findThreeCardArrayInObject(root, rootLabel) {
      const queue = [{ value: root, depth: 0, path: rootLabel }];
      const seen = new Set();

      while (queue.length > 0) {
        const { value, depth, path } = queue.shift();
        if (!value || typeof value !== "object") continue;
        if (seen.has(value)) continue;
        seen.add(value);

        if (Array.isArray(value) && value.length === 3) {
          const ids = value.map((card, idx) => getCardId(card, idx));
          const validCount = ids.filter((id) => isValidCardId(id)).length;
          if (validCount >= 2) {
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
          cards.length === 3 &&
          cards.every((card) => card && typeof card === "object")
        ) {
          return { cards, path: "battle.direct" };
        }
      }

      const deepResult = findThreeCardArrayInObject(battle, "battle");
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

        if (Array.isArray(value) && value.length === 3 && value.every((v) => Number.isInteger(v))) {
          const inRange = value.every((idx) => idx >= 0 && idx < deck.length);
          if (inRange) {
            const cards = value.map((idx) => deck[idx]).filter(Boolean);
            if (cards.length === 3) {
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
        state.currentPhase = null;
        state.currentPhaseSource = null;
        return;
      }
      if (!nextPhase) return;

      if (!state.currentPhase) {
        state.currentPhase = nextPhase;
        state.currentPhaseSource = source;
        log(`Phase started: ${nextPhase} (source: ${source})`);
        return;
      }

      if (state.currentPhase !== nextPhase) {
        log(`Phase ended: ${state.currentPhase}`);
        state.currentPhase = nextPhase;
        state.currentPhaseSource = source;
        log(`Phase started: ${nextPhase} (source: ${source})`);
      }
    }

    function recommendFromCards(cards, sourceLabel) {
      const scored = cards
        .map((card, idx) => ({
          idx,
          id: getCardId(card, idx),
          name: getCardName(getCardId(card, idx)),
          power: getCardPower(getCardId(card, idx)),
        }))
        .filter((entry) => typeof entry.power === "number");

      if (scored.length === 0) {
        const keysPreview = cards.map((card, idx) => ({
          idx,
          id: getCardId(card, idx),
          keys: Object.keys(card || {}),
        }));
        log(
          `Фаза 1: есть список из 3 карт (${sourceLabel}), но не удалось посчитать мощь через app.UserUtil.getCardPower(cardId).`,
          keysPreview
        );
        return;
      }

      scored.sort((a, b) => b.power - a.power);
      const best = scored[0];
      const scoredKey = scored.map((entry) => `${entry.id}:${entry.power}`).join("|");
      if (state.lastRecommendationKey === scoredKey) return;
      state.lastRecommendationKey = scoredKey;

      log(
        `Фаза 1 рекомендация: выбрать карту idx=${best.idx}, id=${best.id}, name="${best.name}", power=${best.power}.`
      );
    }

    function handleBattleSnapshot(battle, source) {
      if (!battle || typeof battle !== "object") return;

      const phase = getBattleStateFromSnapshot(battle);
      if (phase) {
        setPhase(phase, source);
      }

      if (!state.autoEnabled) return;
      if (phase !== "CARD_SELECTION") return;

      // BattlePage uses u.m1.model.cards[0..2] in CARD_SELECTION and sends idx 0/1/2.
      const m1Cards = Array.isArray(battle?.m1?.cards) ? battle.m1.cards : null;
      if (m1Cards && m1Cards.length >= 3) {
        const phaseCards = m1Cards.slice(0, 3);
        state.noSnapshotCardsLogged = false;
        state.selectionIndicesLogged = false;
        state.noContextLogged = false;
        recommendFromCards(phaseCards, `${source} -> m1.cards[0..2]`);
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
          recommendFromCards(idxSelection.cards, `${source} -> ${idxSelection.path}`);
          return;
        }

        if (!state.noSnapshotCardsLogged) {
          state.noSnapshotCardsLogged = true;
          const m1DeckLen = Array.isArray(battle?.m1?.cards) ? battle.m1.cards.length : 0;
          log(
            `Фаза 1: state=CARD_SELECTION (${source}), но список из 3 карт не найден в battle snapshot. m1.cards=${m1DeckLen}`
          );
        }

        const fullDeck = Array.isArray(battle?.m1?.cards) ? battle.m1.cards : null;
        if (fullDeck && fullDeck.length > 0) {
          recommendFromCards(fullDeck, `${source} -> m1.cards(full-deck fallback)`);
        }
        return;
      }
      state.noSnapshotCardsLogged = false;
      state.selectionIndicesLogged = false;
      state.noContextLogged = false;
      recommendFromCards(cardContext.cards, `${source} -> ${cardContext.path}`);
    }

    function updatePhaseTracking(popup) {
      const detected = detectPhase(popup);
      const nextPhase = detected ? detected.phase : null;
      const nextSource = detected ? detected.path : null;
      setPhase(nextPhase, nextSource || "popup");
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
      state.currentPhase = null;
      state.currentPhaseSource = null;
      state.lastRecommendationKey = null;
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
                    cards: (getSelectableCardsFromBattleSnapshot(response.battle)?.cards || [])
                      .map((card, idx) => getCardId(card, idx)),
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

