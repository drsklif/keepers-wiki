(function () {
  "use strict";

  const helper = window.KeepersHelper;
  if (!helper || typeof helper.registerModule !== "function") {
    console.warn("[KeepersHelper/Champions] Core module is missing.");
    return;
  }

  helper.registerModule("champions-auto", (core) => {
    const STORAGE_KEY = "keepersHelper.champions.autoEnabled";
    const MAX_FIGHTS = 5;
    const MAX_HEALERS = 2;
    // Топ воды и огня важнее любой карты природы в паре.
    // Вода: 68 Мерра Дочь Дождя, 80 Сул'Тан Мерцающий, 89 Шакка Гроза Прилива, 92 Смотритель Маяка.
    // Огонь: 56 Огненный Рык, 67 Морок Возрожденный, 81 Архангел Кастиэль, 90 Вестник Затмения.
    const PREFERRED_OVER_NATURE = new Set([68, 80, 89, 92, 56, 67, 81, 90]);
    // Слоты 0–3 — свой выбор. Слоты 4–7 сервер заполняет сам, по мере чужого драфта.
    const AUTO_SLOT_FROM = 4;
    const AUTO_CARD_COUNT = 4;
    const CARD_LEVEL = 100;
    const SIGNUP_CUTOFF_MS = 3000;
    const BATTLE_CUTOFF_MS = 5000;

    const CONFIG = {
      pollMs: 1000,
      userReadyPollMs: 400,
      searchWaitMs: 12000,
      errorCooldownMs: 10000,
      choiceCooldownMs: 5000,
      resumeCooldownMs: 5000,
      dismissResultMs: 1500,
      suppressChampTMs: 4000,
      maxPicksPerCycle: 6,
      draftMinWaitMs: 2000,
      draftStableMs: 1500,
      draftMaxWaitMs: 10000,
      delays: {
        afterReady: 400,
        afterReadyJitter: 350,
        betweenPicks: 300,
        betweenPicksJitter: 200,
      },
    };

    const PHASE_LABEL = {
      0: "ожидание записи",
      1: "запись",
      2: "группы",
      3: "бои",
      4: "итоги",
      5: "итоги",
    };

    const state = {
      autoEnabled: loadAutoEnabled(),
      userReady: false,
      busy: false,
      cycleToken: 0,
      signupClosed: false,
      nextSignupAt: 0,
      nextBattleAt: 0,
      nextChoiceAt: 0,
      nextResumeAt: 0,
      continueArmedUntil: 0,
      champtBattleArmedAt: 0,
      fightsAtSend: -1,
      tournamentKey: "",
      seenFights: 0,
      champtBattleLive: false,
      sawChampBattlePopup: false,
      dismissResultUntil: 0,
      suppressChampTUntil: 0,
      draftId: "",
      draftStartedAt: 0,
      draftChangedAt: 0,
      draftDealtKey: "",
      draftSlots: [],
      draftSettled: false,
      pendingPicks: [],
      lastStatusKey: null,
      lastWaitLogKey: null,
      overlay: null,
      autoButton: null,
      pollTimer: null,
    };

    function log(...args) {
      core.log("[AutoChampions]", ...args);
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
          app.TimeUtil &&
          typeof app.TimeUtil.now === "function" &&
          app.Network &&
          typeof app.Network.command === "function" &&
          app.EventDispatcher &&
          app.UserUtil &&
          app.CFGUtil
      );
    }

    function sendCommand(body) {
      return new Promise((resolve) => {
        app.Network.command(body, (response) => resolve(response || {}));
      });
    }

    function getChampt() {
      const champt = app.Model.user?.champt;
      if (!champt || champt.remove || champt.type === "remove") return null;
      return champt;
    }

    function getPhase() {
      const phase = Number(getChampt()?.state?.v);
      return Number.isFinite(phase) ? phase : -1;
    }

    function isEnrolled() {
      return Boolean(getChampt()?.e);
    }

    function timeLeft(ts) {
      const t = Number(ts) || 0;
      if (!t) return null;
      return t - app.TimeUtil.now();
    }

    function getMyEntry() {
      const users = getChampt()?.g?.users;
      if (!Array.isArray(users)) return null;
      const id = app.Model.user.id;
      return users.find((user) => user && user.id === id) || null;
    }

    function getMyFights() {
      const journal = getChampt()?.g?.journal;
      if (!Array.isArray(journal)) return [];
      const id = app.Model.user.id;
      return journal.filter((row) => row && row.u1 === id);
    }

    function isChoicePhase() {
      return Number(getMyEntry()?.state?.v) === 1;
    }

    function getChoice() {
      const choice = getMyEntry()?.state?.choice;
      if (!choice || !choice.c1 || !choice.c2) return null;
      return choice;
    }

    function isLiveBattleOpen() {
      return Boolean(core.shouldPauseBackgroundAutomation && core.shouldPauseBackgroundAutomation());
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

    function cfgCard(id) {
      try {
        return app.CFGUtil.getCardByID(id) || null;
      } catch (_err) {
        return null;
      }
    }

    function cardElement(cfg) {
      if (!cfg || !cfg.quality) return "HIT";
      return cfg.et || "HIT";
    }

    function comboTypes(type) {
      if (Array.isArray(type)) return type;
      if (typeof type === "string" && type) return [type];
      return [];
    }

    function weekBonus(types, value) {
      const stat = Number(value) || 0;
      if (stat <= 0) return 0;
      try {
        return Number(app.UserUtil.calculateCardComboTypesWeekBonus(comboTypes(types), stat)) || 0;
      } catch (_err) {
        return 0;
      }
    }

    function maxCardStars(id) {
      try {
        const stars = Number(app.CFGUtil.getCardStarsMax(id));
        return Number.isFinite(stars) && stars > 0 ? stars : 0;
      } catch (_err) {
        return 0;
      }
    }

    function serverPower(card) {
      const value = Number(card?.pwr ?? card?.power);
      return Number.isFinite(value) && value > 0 ? value : 0;
    }

    function level100Card(card) {
      const id = Number(card?.id);
      const cfg = Number.isFinite(id) ? cfgCard(id) : null;
      const described = {
        id: Number.isFinite(id) ? id : 0,
        name: cfg?.name ? String(cfg.name) : (Number.isFinite(id) ? String(id) : "?"),
        element: cardElement(cfg),
        quality: Number(cfg?.quality) || 0,
        power: 0,
        hit: 0,
        heal: 0,
        healer: false,
        score: 0,
        raw: card,
      };
      if (!cfg) {
        described.hit = Number(card?.hit) || 0;
        described.heal = Number(card?.heal) || 0;
        described.hit += weekBonus([described.element], described.hit);
        described.heal += weekBonus([described.element], described.heal);
        described.healer = described.heal > 0;
        described.score = described.hit + described.heal;
        return described;
      }

      const stars = maxCardStars(described.id);
      described.stars = stars;
      if (!described.power) {
        try {
          const levels = (cfg.combos || []).map(() => CARD_LEVEL);
          described.power = Number(app.CFGUtil.getCardPower(described.id, CARD_LEVEL, stars, levels)) || 0;
        } catch (_err) {
          described.power = 0;
        }
      }

      (cfg.combos || []).forEach((combo) => {
        let scaled = combo;
        try {
          scaled = app.UserUtil.cardComboOnLevel(cfg, combo, CARD_LEVEL, stars) || combo;
        } catch (_err) {
          scaled = combo;
        }
        const types = comboTypes(scaled.type || combo.type);
        const hit = Number(scaled.hit) || 0;
        const heal = Number(scaled.heal) || 0;
        described.hit += hit + weekBonus(types, hit);
        described.heal += heal + weekBonus(types, heal);
      });
      described.healer = described.heal > 0;
      described.score = described.hit + described.heal;
      return described;
    }

    function dealtList() {
      const cards = getMyEntry()?.state?.cards;
      if (!Array.isArray(cards)) return [];
      return cards.filter((card) => card && typeof card === "object" && card.id != null);
    }

    function dealtKey() {
      const cards = getMyEntry()?.state?.cards;
      if (!Array.isArray(cards)) return "";
      return cards.map((card) => (card && card.id != null ? card.id : "-")).join(",");
    }

    function knownDeck() {
      const dealt = dealtList();
      const ids = new Set(dealt.map((card) => Number(card.id)));
      const extra = state.pendingPicks.filter((card) => card && !ids.has(Number(card.id)));
      return dealt.concat(extra);
    }

    function countHealers() {
      return knownDeck().filter((card) => level100Card(card).healer).length;
    }

    function dealtSlots() {
      const cards = getMyEntry()?.state?.cards;
      if (!Array.isArray(cards)) return [];
      return cards.map((card) => (card && typeof card === "object" && card.id != null ? card : null));
    }

    function snapshotSlots(slots) {
      return slots.map((card) => (card ? { id: Number(card.id) } : null));
    }

    function consumePending(card) {
      const id = Number(card?.id);
      const index = state.pendingPicks.findIndex((item) => Number(item?.id) === id);
      if (index < 0) return false;
      state.pendingPicks.splice(index, 1);
      return true;
    }

    function logAutoCards(previousSlots, nextSlots) {
      nextSlots.forEach((card, index) => {
        if (!card) return;
        const prevId = Number(previousSlots[index]?.id);
        if (prevId === Number(card.id)) return;
        if (consumePending(card)) return;
        log(`Автокарта ${index + 1}: ${formatPickCard(level100Card(card))}.`);
      });
    }

    function noteDraft() {
      if (!isChoicePhase()) {
        state.draftId = "";
        state.draftSettled = false;
        state.pendingPicks = [];
        state.draftSlots = [];
        return;
      }
      const id = `${state.tournamentKey}:draft`;
      const key = dealtKey();
      const now = Date.now();
      const slots = dealtSlots();
      if (state.draftId !== id) {
        state.draftId = id;
        state.draftStartedAt = now;
        state.draftChangedAt = now;
        state.draftDealtKey = key;
        state.draftSettled = false;
        state.pendingPicks = [];
        logAutoCards([], slots);
        state.draftSlots = snapshotSlots(slots);
        return;
      }
      if (key !== state.draftDealtKey) {
        logAutoCards(state.draftSlots, slots);
        state.draftSlots = snapshotSlots(slots);
        state.draftDealtKey = key;
        state.draftChangedAt = now;
      }
    }

    function autoDealtCount() {
      return dealtSlots().reduce(
        (count, card, index) => count + (index >= AUTO_SLOT_FROM && card ? 1 : 0),
        0
      );
    }

    function draftTimersReady() {
      if (state.draftSettled) return true;
      const now = Date.now();
      const sinceStart = now - (state.draftStartedAt || now);
      const sinceChange = now - (state.draftChangedAt || now);
      if (autoDealtCount() >= AUTO_CARD_COUNT) {
        if (sinceStart < CONFIG.draftMinWaitMs) return false;
        if (sinceChange < CONFIG.draftStableMs) return false;
        return true;
      }
      return sinceStart >= CONFIG.draftMaxWaitMs && sinceChange >= 600;
    }

    function draftWaitDetail() {
      const now = Date.now();
      const sinceStart = now - (state.draftStartedAt || now);
      const sinceChange = now - (state.draftChangedAt || now);
      const autos = autoDealtCount();
      const left = autos >= AUTO_CARD_COUNT
        ? Math.max(CONFIG.draftMinWaitMs - sinceStart, CONFIG.draftStableMs - sinceChange, 0)
        : Math.max(CONFIG.draftMaxWaitMs - sinceStart, 600 - sinceChange, 0);
      return `Автокарты ${autos} из ${AUTO_CARD_COUNT}, жду ещё ${formatRemain(left)}.`;
    }

    function prefer(index, first, second, reason) {
      const taken = index === 1 ? second : first;
      const left = index === 1 ? first : second;
      return { index, taken, left, reason };
    }

    function preferredOverNature(first, second) {
      const firstTop = PREFERRED_OVER_NATURE.has(first.id);
      const secondTop = PREFERRED_OVER_NATURE.has(second.id);
      if (firstTop && second.element === "N" && !secondTop) return 0;
      if (secondTop && first.element === "N" && !firstTop) return 1;
      return -1;
    }

    function pickChoiceIndex(choice) {
      const first = level100Card(choice.c1);
      const second = level100Card(choice.c2);
      const serverFirst = serverPower(choice.c1);
      const serverSecond = serverPower(choice.c2);
      if (serverFirst && serverSecond) {
        first.power = serverFirst;
        second.power = serverSecond;
      }

      const healers = countHealers();
      if (healers >= MAX_HEALERS && first.healer !== second.healer) {
        return prefer(first.healer ? 1 : 0, first, second, `уже ${MAX_HEALERS} лечения, беру без лечения`);
      }
      const forcedHeal = healers >= MAX_HEALERS && first.healer && second.healer ? "обе с лечением, " : "";

      const topIndex = preferredOverNature(first, second);
      if (topIndex >= 0) {
        const top = topIndex === 0 ? first : second;
        const elementName = top.element === "W" ? "воды" : "огня";
        return prefer(topIndex, first, second, `${forcedHeal}топ ${elementName} важнее природы`);
      }

      if (first.element === second.element) {
        if (second.power !== first.power) {
          return prefer(second.power > first.power ? 1 : 0, first, second, `${forcedHeal}стихия ${first.element}, по мощи ${CARD_LEVEL}`);
        }
        if (second.score !== first.score) {
          return prefer(second.score > first.score ? 1 : 0, first, second, `${forcedHeal}стихия ${first.element}, мощь равна, по урону и лечению`);
        }
        return prefer(0, first, second, `${forcedHeal}стихия ${first.element}, карты равны`);
      }

      if (second.score !== first.score) {
        return prefer(
          second.score > first.score ? 1 : 0,
          first,
          second,
          `${forcedHeal}стихии ${first.element} и ${second.element}, по урону и лечению с бонусом недели`
        );
      }
      if (second.power !== first.power) {
        return prefer(second.power > first.power ? 1 : 0, first, second, `${forcedHeal}урон и лечение равны, по мощи`);
      }
      return prefer(0, first, second, `${forcedHeal}карты равны`);
    }

    function formatPickCard(card) {
      const parts = [`${card.name} [${card.element}]`, `мощь ${formatPower(card.power)}`];
      if (card.hit) parts.push(`урон ${formatPower(card.hit)}`);
      if (card.heal) parts.push(`лечение ${formatPower(card.heal)}`);
      return parts.join(", ");
    }

    function fightOutcome(row) {
      if (!row) return "неясно";
      if (row.result === app.Model.user.id) return "победа";
      if (row.result === 0) return "ничья";
      return "поражение";
    }

    function syncFights() {
      const champt = getChampt();
      const key = champt ? `${champt.st || 0}:${getPhase()}` : "";
      const fights = getMyFights();
      if (key !== state.tournamentKey) {
        state.tournamentKey = key;
        state.seenFights = fights.length;
        state.signupClosed = false;
        state.fightsAtSend = -1;
        state.nextBattleAt = 0;
        return;
      }
      if (fights.length < state.seenFights) {
        state.seenFights = fights.length;
      } else if (fights.length > state.seenFights) {
        for (let i = state.seenFights; i < fights.length; i += 1) {
          log(`Бой ${i + 1} из ${MAX_FIGHTS}: ${fightOutcome(fights[i])}.`);
        }
        state.seenFights = fights.length;
      }
      if (state.fightsAtSend >= 0 && fights.length > state.fightsAtSend) {
        state.nextBattleAt = 0;
        state.fightsAtSend = -1;
      }
    }

    function canSignupNow() {
      if (getPhase() !== 1 || isEnrolled() || state.signupClosed) return false;
      if (Date.now() < state.nextSignupAt) return false;
      const left = timeLeft(getChampt()?.state?.t);
      if (left != null && left <= SIGNUP_CUTOFF_MS) return false;
      return true;
    }

    function choiceKey(choice) {
      if (!choice) return "";
      return [choice.c1, choice.c2]
        .map((card) => `${card?.id ?? "?"}:${card?.stars ?? ""}:${card?.level ?? ""}`)
        .join("|");
    }

    function canFightNow() {
      if (getPhase() !== 3 || !isEnrolled()) return false;
      if (isLiveBattleOpen() || isChoicePhase()) return false;
      if (!getChampt()?.g) return false;
      if (getMyFights().length >= MAX_FIGHTS) return false;
      const left = timeLeft(getChampt()?.state?.t);
      if (left != null && left <= BATTLE_CUTOFF_MS) return false;
      if (Date.now() < state.nextBattleAt) return false;
      if (unfinishedDialog()) return false;
      return true;
    }

    function lastPopup() {
      try {
        if (!app.Popups || typeof app.Popups.getLast !== "function") return null;
        return app.Popups.getLast() || null;
      } catch (_err) {
        return null;
      }
    }

    function popupText(popup) {
      try {
        return popup?.els?.popup?.textContent || "";
      } catch (_err) {
        return "";
      }
    }

    function unfinishedDialog() {
      const popup = lastPopup();
      if (!popup) return null;
      if (getPhase() !== 3 || !isEnrolled()) return null;
      if (!popupText(popup).includes("Бой в турнире не был завершен")) return null;
      return popup;
    }

    function clickContinue(popup) {
      const root = popup?.els?.popup;
      if (!root || typeof root.querySelectorAll !== "function") return false;
      const nodes = root.querySelectorAll("a, button, .btn_g");
      for (const node of nodes) {
        const label = (node.textContent || "").trim();
        if (label !== "Продолжить" || typeof node.onclick !== "function") continue;
        state.nextResumeAt = Date.now() + CONFIG.resumeCooldownMs;
        state.continueArmedUntil = Date.now() + CONFIG.searchWaitMs;
        state.suppressChampTUntil = Date.now() + CONFIG.suppressChampTMs;
        state.nextBattleAt = Math.max(state.nextBattleAt, Date.now() + 3000);
        log("Продолжаю незавершённый бой турнира.");
        node.onclick();
        return true;
      }
      return false;
    }

    function closeChampTPopup() {
      if (Date.now() > state.suppressChampTUntil) return;
      const popup = lastPopup();
      if (!popup?.cfg || popup.cfg.id !== "ChampT") return;
      try {
        app.Popups.removePopup(popup);
        log("Закрыл окно турнира.");
      } catch (err) {
        log("Не закрыл окно турнира", err);
      }
    }

    function dismissResultPopup() {
      if (Date.now() > state.dismissResultUntil) return;
      const popup = lastPopup();
      if (!popup?.els?.popup || popup.cfg?.id) return;
      const root = popup.els.popup;
      if (typeof root.querySelector !== "function") return;
      if (!root.querySelector(".arena_d_b, .arena_w_b, .arena_l_b")) return;
      const text = popupText(popup);
      if (!text.includes("Понятно") && !text.includes("Отлично") && !text.includes("К турниру")) return;
      try {
        app.Popups.removeLast();
        state.dismissResultUntil = 0;
        log("Закрыл итог боя.");
      } catch (err) {
        log("Не закрыл итог боя", err);
      }
    }

    function noteBattleClosed() {
      const open = isLiveBattleOpen();
      if (open && (state.champtBattleLive || Date.now() < state.continueArmedUntil)) {
        state.champtBattleLive = true;
        state.sawChampBattlePopup = true;
        state.nextBattleAt = 0;
      }
      if (!open && state.sawChampBattlePopup) {
        state.sawChampBattlePopup = false;
        state.champtBattleLive = false;
        state.champtBattleArmedAt = 0;
        state.continueArmedUntil = 0;
        state.dismissResultUntil = Date.now() + CONFIG.dismissResultMs;
        state.nextBattleAt = Date.now() + 2000;
      } else if (
        !open &&
        state.champtBattleLive &&
        !state.sawChampBattlePopup &&
        state.champtBattleArmedAt &&
        Date.now() - state.champtBattleArmedAt > CONFIG.searchWaitMs
      ) {
        state.champtBattleLive = false;
        state.champtBattleArmedAt = 0;
      }
    }

    function describeSnapshot() {
      const champt = getChampt();
      if (!champt) return "Турнира нет";
      const phase = getPhase();
      const lines = [`Фаза: ${PHASE_LABEL[phase] || phase}`];
      if (phase === 0) {
        const left = timeLeft(champt.st);
        lines.push(left > 0 ? `Запись через ${formatRemain(left)}` : "Ждём запись");
      } else if (phase === 1) {
        const left = timeLeft(champt.state?.t);
        lines.push(isEnrolled() ? "Записан" : "Не записан");
        if (left != null) lines.push(left > 0 ? `До старта ${formatRemain(left)}` : "Старт");
        if (champt.qSize != null) lines.push(`В очереди: ${champt.qSize}`);
      } else if (phase === 3) {
        const fights = getMyFights();
        const entry = getMyEntry();
        lines.push(`Бои: ${fights.length} из ${MAX_FIGHTS}`);
        if (entry) lines.push(`Место ${entry.place ?? "?"}, очки ${entry.points ?? "?"}`);
        const left = timeLeft(champt.state?.t);
        if (left != null) lines.push(left > 0 ? `До конца ${formatRemain(left)}` : "Завершение");
        if (isChoicePhase()) {
          if (getChoice() && !draftTimersReady()) lines.push(draftWaitDetail());
          else lines.push(getChoice() ? "Выбор карты" : "Ждём пару или бой");
          lines.push(`Лечение: ${countHealers()} из ${MAX_HEALERS}`);
        }
      } else if (phase === 4 || phase === 5) {
        const entry = getMyEntry();
        if (entry) lines.push(`Место ${entry.place ?? "?"}, очки ${entry.points ?? "?"}`);
      }
      if (!isEnrolled() && phase > 1) lines.push("Без записи");
      if (isLiveBattleOpen()) lines.push("Пауза: идёт бой");
      if (state.busy) lines.push("Сейчас: команда");
      return lines.join("\n");
    }

    function updateOverlay() {
      if (!state.autoButton) return;
      state.autoButton.title = state.userReady ? describeSnapshot() : "Чемпионы: ждём модель";
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
      autoBtn.textContent = "Чемпионы";
      autoBtn.addEventListener("click", () => {
        state.autoEnabled = !state.autoEnabled;
        saveAutoEnabled();
        if (!state.autoEnabled) {
          state.cycleToken += 1;
          state.busy = false;
        }
        log("Турнир чемпионов:", state.autoEnabled ? "вкл" : "выкл");
        updateOverlay();
      });

      const host =
        document.getElementById("ab-overlay") ||
        document.getElementById("aq-overlay") ||
        document.getElementById("ad-overlay") ||
        document.getElementById("aa-overlay") ||
        document.getElementById("ae-overlay");
      if (host) {
        host.appendChild(autoBtn);
        state.overlay = host;
      } else {
        const root = document.createElement("div");
        root.id = "ac-overlay";
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

    function resumeBattle(battle) {
      if (!battle || !app.BattlePage) return false;
      const type = Number(battle.t);
      if (type === 10 && !battle.champt && typeof app.BattlePage.restoreBattle === "function") {
        state.champtBattleLive = true;
        state.champtBattleArmedAt = Date.now();
        log("Поднимаю незакрытый бой турнира.");
        app.BattlePage.restoreBattle(battle);
        return true;
      }
      log("ChampTBattle вернул состояние турнира, окно не открываю.");
      return false;
    }

    async function signup(token) {
      log("ChampTQAdd.");
      const response = await sendCommand({ cmd: "ChampTQAdd" });
      if (!tokenAlive(token)) return;
      if (response.error) {
        const code = response.error.code;
        if (code === 1) {
          state.signupClosed = true;
          log("Запись уже закрыта.");
          return;
        }
        state.nextSignupAt = Date.now() + CONFIG.errorCooldownMs;
        log("Запись: ошибка", code ?? response.error);
        return;
      }
      if (!isEnrolled()) state.nextSignupAt = Date.now() + CONFIG.errorCooldownMs;
      log(isEnrolled() ? "Записался в турнир." : "Запись отправлена.");
    }

    async function pickCards(token) {
      const enemyName = getMyEntry()?.state?.enemy?.u?.n;
      if (enemyName) log(`Черновик против ${enemyName}.`);
      for (let n = 0; n < CONFIG.maxPicksPerCycle; n += 1) {
        if (!tokenAlive(token) || isLiveBattleOpen()) return;
        if (Date.now() < state.nextChoiceAt) return;
        const choice = getChoice();
        if (!choice) {
          log("Черновик: ждём следующую пару или бой.");
          return;
        }
        const before = choiceKey(choice);
        if (!state.draftSettled && autoDealtCount() < AUTO_CARD_COUNT) {
          log(`Автокарт ${autoDealtCount()} из ${AUTO_CARD_COUNT}, ждать дальше нельзя. Выбираю.`);
        }
        state.draftSettled = true;
        const pick = pickChoiceIndex(choice);
        log(`${pick.reason}. Беру ${formatPickCard(pick.taken)}. Сопернику ${formatPickCard(pick.left)}.`);
        if (pick.taken.raw) state.pendingPicks.push(pick.taken.raw);
        const response = await sendCommand({
          cmd: "ChampTBattleCardChoice",
          choice: pick.index,
        });
        if (!tokenAlive(token)) return;
        if (response.error || choiceKey(getChoice()) === before) {
          consumePending(pick.taken.raw);
          if (response.error) {
            state.nextChoiceAt = Date.now() + CONFIG.choiceCooldownMs;
            log("Выбор карты: ошибка", response.error.code ?? response.error);
            return;
          }
          state.nextChoiceAt = Date.now() + CONFIG.delays.betweenPicks;
          log("Пара на экране та же, жду обновление.");
          return;
        }
        await sleep(jitterDelay(CONFIG.delays.betweenPicks, CONFIG.delays.betweenPicksJitter));
      }
    }

    async function startBattle(token) {
      const fights = getMyFights().length;
      log(`ChampTBattle, уже сыграно ${fights} из ${MAX_FIGHTS}.`);
      state.fightsAtSend = fights;
      state.nextBattleAt = Date.now() + CONFIG.searchWaitMs;
      const response = await sendCommand({ cmd: "ChampTBattle" });
      if (!tokenAlive(token)) return;
      if (response.error) {
        const code = response.error.code;
        state.nextBattleAt = Date.now() + CONFIG.errorCooldownMs;
        if (code === -2) {
          log("Бой отклонён:", response.error.message || code);
          return;
        }
        log("ChampTBattle ошибка", code ?? response.error);
        return;
      }
      if (response.battle) resumeBattle(response.battle);
      else log("Ищу соперника.");
    }

    async function runCycle(token) {
      if (canSignupNow()) {
        await signup(token);
        return;
      }
      if (isChoicePhase() && getChoice() && draftTimersReady() && !isLiveBattleOpen()) {
        await pickCards(token);
        return;
      }
      if (canFightNow()) await startBattle(token);
    }

    function getIdleBlockReason() {
      if (!state.autoEnabled) return "выкл";
      const champt = getChampt();
      if (!champt) return "нет турнира";
      if (canSignupNow()) return null;
      if (isLiveBattleOpen()) return "battle";
      if (unfinishedDialog()) return "resume";
      const phase = getPhase();
      if (phase === 0) return "wait-reg";
      if (phase === 1) {
        if (!isEnrolled() && Date.now() < state.nextSignupAt) return "signup-cd";
        return isEnrolled() ? "signed" : "signup-closed";
      }
      if (phase === 2) return "groups";
      if (phase === 4 || phase === 5) return "results";
      if (phase !== 3) return "idle";
      if (!isEnrolled()) return "missed";
      if (isChoicePhase()) {
        if (Date.now() < state.nextChoiceAt) return "choice-cd";
        if (!getChoice()) return "draft-wait";
        if (!draftTimersReady()) return "draft-settle";
        return null;
      }
      if (getMyFights().length >= MAX_FIGHTS) return "fights";
      const left = timeLeft(champt.state?.t);
      if (left != null && left <= BATTLE_CUTOFF_MS) return "phase-end";
      if (!champt.g) return "no-group";
      if (Date.now() < state.nextBattleAt) return "search";
      return null;
    }

    function scheduleCycle(source) {
      if (state.busy) return;
      if (getIdleBlockReason()) return;

      state.busy = true;
      const token = (state.cycleToken += 1);
      const picking = isChoicePhase() && getChoice();
      const waitMs = picking
        ? jitterDelay(CONFIG.delays.betweenPicks, CONFIG.delays.betweenPicksJitter)
        : jitterDelay(CONFIG.delays.afterReady, CONFIG.delays.afterReadyJitter);
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
          await runCycle(token);
        } catch (err) {
          log("Цикл турнира упал:", err);
        } finally {
          if (token === state.cycleToken) state.busy = false;
          state.lastWaitLogKey = null;
          updateOverlay();
        }
      }, waitMs);
    }

    function scan(source) {
      if (!isUserReady()) return;
      syncFights();
      noteDraft();
      noteBattleClosed();
      if (state.autoEnabled) {
        closeChampTPopup();
        dismissResultPopup();
        const dialog = unfinishedDialog();
        if (dialog && Date.now() >= state.nextResumeAt && !state.busy) {
          clickContinue(dialog);
        }
      }

      const reason = state.busy ? "busy" : getIdleBlockReason();
      const statusKey = `${reason || "ready"}|${describeSnapshot()}`;
      if (statusKey !== state.lastStatusKey) {
        state.lastStatusKey = statusKey;
        updateOverlay();
      }

      if (!state.autoEnabled) return;
      if (reason === "battle") {
        logWaitOnce("battle", "Идёт бой, турнир подождём.");
        return;
      }
      if (reason === "resume") {
        logWaitOnce("resume", "Есть незавершённый бой турнира.");
        return;
      }
      if (reason === "wait-reg") {
        const left = timeLeft(getChampt()?.st);
        logWaitOnce("wait-reg", left > 0 ? `Запись через ${formatRemain(left)}.` : "Ждём открытия записи.");
        return;
      }
      if (reason === "signed") {
        const left = timeLeft(getChampt()?.state?.t);
        logWaitOnce("signed", left > 0 ? `В турнире, старт через ${formatRemain(left)}.` : "В турнире, ждём группы.");
        return;
      }
      if (reason === "signup-closed") {
        logWaitOnce("signup-closed", "Запись недоступна.");
        return;
      }
      if (reason === "signup-cd") {
        logWaitOnce("signup-cd", "Пауза после ошибки записи.");
        return;
      }
      if (reason === "groups") {
        logWaitOnce("groups", "Формируют группы.");
        return;
      }
      if (reason === "draft-wait") {
        logWaitOnce("draft-wait", "Черновик без пары, жду сервер.");
        return;
      }
      if (reason === "draft-settle") {
        logWaitOnce(`draft-settle:${dealtKey()}`, `${draftWaitDetail()} Потом выберу карту.`);
        return;
      }
      if (reason === "choice-cd") {
        logWaitOnce("choice-cd", "Пауза после ошибки выбора карты.");
        return;
      }
      if (reason === "fights") {
        logWaitOnce("fights", `Все ${MAX_FIGHTS} боёв сыграны.`);
        return;
      }
      if (reason === "phase-end") {
        logWaitOnce("phase-end", "До конца фазы меньше 5 секунд, новый бой не начинаю.");
        return;
      }
      if (reason === "search") {
        logWaitOnce("search", `Жду соперника: ${formatRemain(state.nextBattleAt - Date.now())}.`);
        return;
      }
      if (reason === "missed") {
        logWaitOnce("missed", "Турнир уже идёт, записи не было.");
        return;
      }
      if (reason === "results") {
        const entry = getMyEntry();
        logWaitOnce(
          "results",
          entry
            ? `Итог: место ${entry.place ?? "?"}, очки ${entry.points ?? "?"}.`
            : "Турнир завершён."
        );
        return;
      }
      if (reason === "нет турнира") {
        logWaitOnce("none", "Турнира чемпионов нет.");
        return;
      }
      if (reason === "no-group") {
        logWaitOnce("no-group", "Группа ещё не пришла.");
        return;
      }
      if (source !== "poll" && source !== "boot" && !String(source).startsWith("event:")) return;
      if (reason) return;
      scheduleCycle(source);
    }

    function hookEvents() {
      if (app.EventDispatcher && typeof app.EventDispatcher.on === "function") {
        app.EventDispatcher.on("UPDATE_USER_DATA", (user) => {
          if (user && user.champt) scan("event:UPDATE_USER_DATA");
        });
        app.EventDispatcher.on("battle begin", (payload) => {
          if (payload && payload.champt) {
            state.champtBattleLive = true;
            state.champtBattleArmedAt = Date.now();
            log("Бой турнира начался.");
          }
        });
      }

      if (app.EventUtil && typeof app.EventUtil.PROCESS_EVENT === "function") {
        const original = app.EventUtil.PROCESS_EVENT.bind(app.EventUtil);
        app.EventUtil.PROCESS_EVENT = function patchedProcessEvent(event) {
          const result = original(event);
          try {
            const champtUpdate =
              event &&
              event.type === "UPDATE" &&
              ((event.user && event.user.champt) || event.champt);
            if (champtUpdate) setTimeout(() => scan("event:champt"), 50);
          } catch (err) {
            log("PROCESS_EVENT hook failed:", err);
          }
          return result;
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
    log("Champions auto module initialized.");
  });
})();
