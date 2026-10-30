(function () {
  "use strict";

  const helper = window.KeepersHelper;
  if (!helper || typeof helper.registerModule !== "function") {
    console.warn("[KeepersHelper/Frena] Core module is missing.");
    return;
  }

  helper.registerModule("frena-auto", (core) => {
    const STORAGE_KEY = "keepersHelper.frena.autoEnabled";
    const STORAGE_RESULTS = "keepersHelper.frena.results";
    const MAX_FIGHTS = 5;
    const PHASE_COUNT = 5;
    const TOP_PLACE = 3;
    const SIGNUP_CUTOFF_MS = 3000;
    const BATTLE_CUTOFF_MS = 5000;

    const CONFIG = {
      pollMs: 1000,
      userReadyPollMs: 400,
      searchWaitMs: 12000,
      errorCooldownMs: 10000,
      resumeCooldownMs: 5000,
      dismissResultMs: 1500,
      suppressPvptMs: 4000,
      delays: {
        afterReady: 400,
        afterReadyJitter: 350,
      },
    };

    const PHASE_LABEL = {
      1: "запись",
      2: "группы",
      3: "бои",
      4: "подсчёт",
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
      nextResumeAt: 0,
      continueArmedUntil: 0,
      pvptBattleArmedAt: 0,
      fightsAtSend: -1,
      tournamentKey: "",
      seenFights: 0,
      openingPlace: null,
      pvptBattleLive: false,
      sawPvptBattlePopup: false,
      dismissResultUntil: 0,
      suppressPvptUntil: 0,
      lastStatusKey: null,
      lastWaitLogKey: null,
      overlay: null,
      autoButton: null,
      pollTimer: null,
      results: loadResults(),
    };

    function log(...args) {
      core.log("[AutoFrena]", ...args);
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

    function emptyResults(period) {
      return { period, tournaments: [] };
    }

    function currentPeriodKey() {
      try {
        const moscow = app.TimeUtil._getMoscowTime(app.TimeUtil.now());
        const y = moscow.getFullYear();
        const m = String(moscow.getMonth() + 1).padStart(2, "0");
        const d = String(moscow.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      } catch (_err) {
        return null;
      }
    }

    function loadResults() {
      try {
        const raw = window.localStorage.getItem(STORAGE_RESULTS);
        if (!raw) return emptyResults(null);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return emptyResults(null);
        return {
          period: parsed.period != null ? String(parsed.period) : null,
          tournaments: Array.isArray(parsed.tournaments) ? parsed.tournaments : [],
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
      const period = currentPeriodKey();
      if (!period) return state.results;
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

    function getPvpt() {
      const pvpt = app.Model.user?.pvpt;
      if (!pvpt || pvpt.remove || pvpt.type === "remove") return null;
      return pvpt;
    }

    function getPhase() {
      const phase = Number(getPvpt()?.state?.v);
      return Number.isFinite(phase) ? phase : -1;
    }

    function getBattlePhase() {
      const phase = Number(getPvpt()?.state?.phase);
      return Number.isFinite(phase) ? phase : 0;
    }

    function isEnrolled() {
      return Boolean(getPvpt()?.e);
    }

    function timeLeft(ts) {
      const t = Number(ts) || 0;
      if (!t) return null;
      return t - app.TimeUtil.now();
    }

    function phaseTimeLeft() {
      const pvpt = getPvpt();
      if (!pvpt || getPhase() !== 3) return null;
      const duration = Number(pvpt.cfg?.phase_duration) || 0;
      const started = Number(pvpt.state?.t) || 0;
      if (!duration || !started) return null;
      return duration - (app.TimeUtil.now() - started);
    }

    function getMyEntry() {
      const users = getPvpt()?.g?.users;
      if (!Array.isArray(users)) return null;
      const id = getPvpt()?.e?.id || app.Model.user.id;
      return users.find((user) => user && user.id === id) || null;
    }

    function getMyBattles() {
      const battles = getMyEntry()?.battles;
      return Array.isArray(battles) ? battles : [];
    }

    function completedBattles() {
      return getMyBattles().filter((row) => row && row.result !== -1);
    }

    function hasPhaseBattle(phase) {
      return getMyBattles().some((row) => row && Number(row.phase) === Number(phase));
    }

    function foughtEnemyIds() {
      const ids = new Set();
      getMyBattles().forEach((row) => {
        if (!row || row.enemy == null) return;
        if (row.result === -1) return;
        ids.add(Number(row.enemy));
      });
      return ids;
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

    function enemyName(user) {
      return (user && user.u && user.u.n) || String(user?.id || "?");
    }

    function fightOutcome(row) {
      if (!row) return "неясно";
      if (row.result === 0) return "ничья";
      const me = getPvpt()?.e?.id || app.Model.user.id;
      if (row.result === me) return "победа";
      return "поражение";
    }

    function countOutcomes(battles) {
      const me = getPvpt()?.e?.id || app.Model.user.id;
      let wins = 0;
      let losses = 0;
      let draws = 0;
      (battles || []).forEach((row) => {
        if (!row || row.result === -1 || row.result == null) return;
        if (row.result === 0) draws += 1;
        else if (row.result === me) wins += 1;
        else losses += 1;
      });
      return { wins, losses, draws };
    }

    function noteTournamentResult() {
      if (!isEnrolled() || getPhase() !== 5) return;
      const pvpt = getPvpt();
      const me = getMyEntry();
      if (!pvpt || !me || pvpt.st == null) return;
      const id = String(pvpt.st);
      const outcomes = countOutcomes(completedBattles());
      const entry = {
        id,
        place: Number(me.place) || 0,
        points: Number(me.points1 ?? me.points) || 0,
        wins: outcomes.wins,
        losses: outcomes.losses,
        draws: outcomes.draws,
        at: app.TimeUtil.now(),
      };
      const results = ensurePeriodResults();
      const index = results.tournaments.findIndex((item) => item && item.id === id);
      if (index >= 0) {
        results.tournaments[index] = entry;
      } else {
        results.tournaments.push(entry);
        log(
          `Итог сохранён: место ${entry.place}, ${entry.points} оч. (${entry.wins}П ${entry.losses}Пор ${entry.draws}Н).`
        );
      }
      saveResults();
    }

    function formatDayResults() {
      const list = ensurePeriodResults().tournaments || [];
      if (!list.length) return ["Сегодня турниров ещё не было"];
      const totalPoints = list.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
      const wins = list.reduce((sum, item) => sum + (Number(item.wins) || 0), 0);
      const losses = list.reduce((sum, item) => sum + (Number(item.losses) || 0), 0);
      const draws = list.reduce((sum, item) => sum + (Number(item.draws) || 0), 0);
      const lines = [
        `Сегодня: ${list.length}, ${totalPoints} оч., ${wins}П ${losses}Пор ${draws}Н`,
      ];
      list.forEach((item, index) => {
        lines.push(
          `${index + 1}) место ${item.place ?? "?"}, ${item.points ?? 0} оч. — ${item.wins || 0}П ${item.losses || 0}Пор ${item.draws || 0}Н`
        );
      });
      return lines;
    }

    function syncFights() {
      const pvpt = getPvpt();
      const key = pvpt ? `${pvpt.st || 0}` : "";
      const fights = completedBattles();
      if (key !== state.tournamentKey) {
        state.tournamentKey = key;
        state.seenFights = fights.length;
        state.signupClosed = false;
        state.fightsAtSend = -1;
        state.nextBattleAt = 0;
        state.openingPlace = null;
      }
      const me = getMyEntry();
      if (me && state.openingPlace == null && me.place != null) {
        state.openingPlace = Number(me.place) || null;
        if (state.openingPlace != null) {
          log(`Стартовое место в группе: ${state.openingPlace}.`);
        }
      }
      if (fights.length < state.seenFights) {
        state.seenFights = fights.length;
      } else if (fights.length > state.seenFights) {
        for (let i = state.seenFights; i < fights.length; i += 1) {
          const row = fights[i];
          log(
            `Бой ${i + 1} из ${MAX_FIGHTS}: ${fightOutcome(row)}` +
              (row.points != null ? `, +${row.points}` : "") +
              "."
          );
        }
        state.seenFights = fights.length;
      }
      if (state.fightsAtSend >= 0 && fights.length > state.fightsAtSend) {
        state.nextBattleAt = 0;
        state.fightsAtSend = -1;
      }
    }

    function signupTimeLeft() {
      const pvpt = getPvpt();
      if (!pvpt) return null;
      // Клиент гасит «Записаться» за 3 секунды до st.
      const left = timeLeft(pvpt.st);
      if (left == null) return null;
      return left - SIGNUP_CUTOFF_MS;
    }

    function canSignupNow() {
      if (getPhase() !== 1 || isEnrolled() || state.signupClosed) return false;
      if (Date.now() < state.nextSignupAt) return false;
      const left = signupTimeLeft();
      if (left != null && left <= 0) return false;
      return true;
    }

    function availableEnemies() {
      const users = getPvpt()?.g?.users;
      const me = getMyEntry();
      if (!Array.isArray(users) || !me) return [];
      const fought = foughtEnemyIds();
      return users.filter((user) => {
        if (!user || user.id == null) return false;
        if (user.id === me.id) return false;
        if (fought.has(Number(user.id))) return false;
        return true;
      });
    }

    function preferLowerFirst() {
      // Только первая атака турнира: если стартовое место 1–3, один раз бьём ниже.
      // Дальше всегда предпочитаем выше, иначе к концу недобираем очки.
      if (getMyBattles().length > 0) return false;
      const place = Number(state.openingPlace);
      return Number.isFinite(place) && place >= 1 && place <= TOP_PLACE;
    }

    function pickEnemy() {
      const me = getMyEntry();
      const myPlace = Number(me?.place) || 0;
      const pool = availableEnemies();
      if (!pool.length) return null;

      const lower = pool.filter((user) => Number(user.place) > myPlace);
      const higher = pool.filter((user) => Number(user.place) < myPlace);
      const equal = pool.filter((user) => Number(user.place) === myPlace);

      let candidates;
      let reason;
      if (preferLowerFirst()) {
        candidates = lower.length ? lower : equal.length ? equal : higher;
        reason = lower.length
          ? `старт ${state.openingPlace}, первая атака ниже`
          : `старт ${state.openingPlace}, ниже нет, беру доступного`;
      } else {
        candidates = higher.length ? higher : equal.length ? equal : lower;
        reason = higher.length
          ? `бью выше за очки`
          : `выше нет, беру доступного`;
      }

      candidates = candidates.slice().sort((a, b) => {
        const placeDiff = Number(b.place) - Number(a.place);
        if (placeDiff) return placeDiff;
        return (Number(a.deck?.power) || 0) - (Number(b.deck?.power) || 0);
      });
      const enemy = candidates[0];
      return {
        enemy,
        reason:
          `${reason}: ${enemyName(enemy)} место ${enemy.place}` +
          (enemy.deck?.power != null ? `, мощь ${formatPower(enemy.deck.power)}` : ""),
      };
    }

    function canFightNow() {
      if (getPhase() !== 3 || !isEnrolled()) return false;
      if (isLiveBattleOpen()) return false;
      if (!getPvpt()?.g) return false;
      if (completedBattles().length >= MAX_FIGHTS) return false;
      if (hasPhaseBattle(getBattlePhase())) return false;
      const left = phaseTimeLeft();
      if (left != null && left <= BATTLE_CUTOFF_MS) return false;
      if (Date.now() < state.nextBattleAt) return false;
      if (unfinishedDialog()) return false;
      if (!pickEnemy()) return false;
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
        state.suppressPvptUntil = Date.now() + CONFIG.suppressPvptMs;
        state.nextBattleAt = Math.max(state.nextBattleAt, Date.now() + 3000);
        log("Продолжаю незавершённый бой турнира.");
        node.onclick();
        return true;
      }
      return false;
    }

    function closePvptPopup() {
      if (Date.now() > state.suppressPvptUntil) return;
      const popup = lastPopup();
      if (!popup?.cfg || popup.cfg.id !== "PVPT") return;
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
        state.suppressPvptUntil = Date.now() + CONFIG.suppressPvptMs;
        log("Закрыл итог боя.");
      } catch (err) {
        log("Не закрыл итог боя", err);
      }
    }

    function noteBattleClosed() {
      const open = isLiveBattleOpen();
      if (open && (state.pvptBattleLive || Date.now() < state.continueArmedUntil)) {
        state.pvptBattleLive = true;
        state.sawPvptBattlePopup = true;
        state.nextBattleAt = 0;
      }
      if (!open && state.sawPvptBattlePopup) {
        state.sawPvptBattlePopup = false;
        state.pvptBattleLive = false;
        state.pvptBattleArmedAt = 0;
        state.continueArmedUntil = 0;
        state.dismissResultUntil = Date.now() + CONFIG.dismissResultMs;
        state.nextBattleAt = Date.now() + 2000;
      } else if (
        !open &&
        state.pvptBattleLive &&
        !state.sawPvptBattlePopup &&
        state.pvptBattleArmedAt &&
        Date.now() - state.pvptBattleArmedAt > CONFIG.searchWaitMs
      ) {
        state.pvptBattleLive = false;
        state.pvptBattleArmedAt = 0;
      }
    }

    function describeSnapshot() {
      const lines = [];
      const pvpt = getPvpt();
      if (!pvpt) {
        const next = app.Model.user?.pvpt_next;
        if (next?.nst) {
          const left = timeLeft(next.nst);
          lines.push(left > 0 ? `Следующий через ${formatRemain(left)}` : "Ждём следующий турнир");
        } else {
          lines.push("Турнира нет");
        }
      } else {
        const phase = getPhase();
        lines.push(`Фаза: ${PHASE_LABEL[phase] || phase}`);
        if (phase === 1) {
          const left = signupTimeLeft();
          lines.push(isEnrolled() ? "Записан" : "Не записан");
          if (left != null) lines.push(left > 0 ? `До старта ${formatRemain(left)}` : "Старт");
          if (pvpt.qSize != null) lines.push(`В очереди: ${pvpt.qSize}`);
        } else if (phase === 2) {
          lines.push("Формируют группы");
        } else if (phase === 3) {
          const fights = completedBattles().length;
          const me = getMyEntry();
          lines.push(`Фаза боёв ${getBattlePhase()} из ${PHASE_COUNT}`);
          lines.push(`Бои: ${fights} из ${MAX_FIGHTS}`);
          if (hasPhaseBattle(getBattlePhase())) lines.push("Атака в этой фазе уже была");
          if (me) lines.push(`Место ${me.place ?? "?"}, очки ${me.points1 ?? me.points ?? "?"}`);
          const left = phaseTimeLeft();
          if (left != null) lines.push(left > 0 ? `До конца фазы ${formatRemain(left)}` : "Конец фазы");
        } else if (phase === 4 || phase === 5) {
          const me = getMyEntry();
          if (me) lines.push(`Место ${me.place ?? "?"}, очки ${me.points1 ?? me.points ?? "?"}`);
        }
        if (!isEnrolled() && phase > 1) lines.push("Без записи");
      }
      if (isLiveBattleOpen()) lines.push("Пауза: идёт бой");
      if (state.busy) lines.push("Сейчас: команда");
      lines.push(...formatDayResults());
      return lines.join("\n");
    }

    function updateOverlay() {
      if (!state.autoButton) return;
      state.autoButton.title = state.userReady ? describeSnapshot() : "Френа: ждём модель";
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
      autoBtn.textContent = "Френа";
      autoBtn.addEventListener("click", () => {
        state.autoEnabled = !state.autoEnabled;
        saveAutoEnabled();
        if (!state.autoEnabled) {
          state.cycleToken += 1;
          state.busy = false;
        }
        log("Турнир Френы:", state.autoEnabled ? "вкл" : "выкл");
        updateOverlay();
      });

      const host =
        document.getElementById("ab-overlay") ||
        document.getElementById("aq-overlay") ||
        document.getElementById("ad-overlay") ||
        document.getElementById("aa-overlay") ||
        document.getElementById("ae-overlay") ||
        document.getElementById("ac-overlay");
      if (host) {
        host.appendChild(autoBtn);
        state.overlay = host;
      } else {
        const root = document.createElement("div");
        root.id = "af-overlay";
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
      if (type === 7 && typeof app.BattlePage.restoreBattle === "function") {
        state.pvptBattleLive = true;
        state.pvptBattleArmedAt = Date.now();
        log("Поднимаю незакрытый бой турнира.");
        app.BattlePage.restoreBattle(battle);
        return true;
      }
      return false;
    }

    function openBattle() {
      state.pvptBattleLive = true;
      state.pvptBattleArmedAt = Date.now();
      app.EventDispatcher.emit("battle begin", { pvpt: 1 });
    }

    async function signup(token) {
      log("PVPTAddToQ.");
      const response = await sendCommand({ cmd: "PVPTAddToQ" });
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

    async function startBattle(token) {
      const pick = pickEnemy();
      if (!pick) {
        log("Нет доступных соперников.");
        return;
      }
      const fights = completedBattles().length;
      log(`PVPTBattle: ${pick.reason}. Уже сыграно ${fights} из ${MAX_FIGHTS}.`);
      state.fightsAtSend = fights;
      state.nextBattleAt = Date.now() + CONFIG.searchWaitMs;
      const response = await sendCommand({ cmd: "PVPTBattle", enemy: pick.enemy.id });
      if (!tokenAlive(token)) return;
      if (response.error) {
        const code = response.error.code;
        state.nextBattleAt = Date.now() + CONFIG.errorCooldownMs;
        if (response.battle) resumeBattle(response.battle);
        if (code === -2) {
          log("Бой отклонён:", response.error.message || code);
          return;
        }
        log("PVPTBattle ошибка", code ?? response.error);
        return;
      }
      openBattle();
    }

    async function runCycle(token) {
      if (canSignupNow()) {
        await signup(token);
        return;
      }
      if (canFightNow()) await startBattle(token);
    }

    function getIdleBlockReason() {
      if (!state.autoEnabled) return "выкл";
      const pvpt = getPvpt();
      if (!pvpt) return "нет турнира";
      if (canSignupNow()) return null;
      if (isLiveBattleOpen()) return "battle";
      if (unfinishedDialog()) return "resume";
      const phase = getPhase();
      if (phase === 1) {
        if (!isEnrolled() && Date.now() < state.nextSignupAt) return "signup-cd";
        return isEnrolled() ? "signed" : "signup-closed";
      }
      if (phase === 2) return "groups";
      if (phase === 4) return "tally";
      if (phase === 5) return "results";
      if (phase !== 3) return "idle";
      if (!isEnrolled()) return "missed";
      if (completedBattles().length >= MAX_FIGHTS) return "fights";
      if (hasPhaseBattle(getBattlePhase())) return "phase-done";
      const left = phaseTimeLeft();
      if (left != null && left <= BATTLE_CUTOFF_MS) return "phase-end";
      if (!pvpt.g) return "no-group";
      if (!availableEnemies().length) return "no-enemy";
      if (Date.now() < state.nextBattleAt) return "search";
      return null;
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
      noteTournamentResult();
      noteBattleClosed();
      if (state.autoEnabled) {
        closePvptPopup();
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
      if (reason === "signed") {
        const left = signupTimeLeft();
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
      if (reason === "tally") {
        logWaitOnce("tally", `Считаем результаты фазы ${getBattlePhase()}.`);
        return;
      }
      if (reason === "fights") {
        logWaitOnce("fights", `Все ${MAX_FIGHTS} боёв сыграны.`);
        return;
      }
      if (reason === "phase-done") {
        logWaitOnce(`phase-done:${getBattlePhase()}`, `Фаза ${getBattlePhase()}: атака уже была, жду следующую.`);
        return;
      }
      if (reason === "phase-end") {
        logWaitOnce("phase-end", "До конца фазы меньше 5 секунд, новый бой не начинаю.");
        return;
      }
      if (reason === "search") {
        logWaitOnce("search", `Жду старт боя: ${formatRemain(state.nextBattleAt - Date.now())}.`);
        return;
      }
      if (reason === "missed") {
        logWaitOnce("missed", "Турнир уже идёт, записи не было.");
        return;
      }
      if (reason === "results") {
        const me = getMyEntry();
        logWaitOnce(
          "results",
          me
            ? `Итог: место ${me.place ?? "?"}, очки ${me.points1 ?? me.points ?? "?"}.`
            : "Турнир завершён."
        );
        return;
      }
      if (reason === "нет турнира") {
        const next = app.Model.user?.pvpt_next;
        const left = next?.nst != null ? timeLeft(next.nst) : null;
        logWaitOnce("none", left > 0 ? `Турнира нет, следующий через ${formatRemain(left)}.` : "Турнира Френы нет.");
        return;
      }
      if (reason === "no-group") {
        logWaitOnce("no-group", "Группа ещё не пришла.");
        return;
      }
      if (reason === "no-enemy") {
        logWaitOnce("no-enemy", "Нет доступных соперников для атаки.");
        return;
      }
      if (source !== "poll" && source !== "boot" && !String(source).startsWith("event:")) return;
      if (reason) return;
      scheduleCycle(source);
    }

    function hookEvents() {
      if (app.EventDispatcher && typeof app.EventDispatcher.on === "function") {
        app.EventDispatcher.on("UPDATE_USER_DATA", (user) => {
          if (user && user.pvpt) scan("event:UPDATE_USER_DATA");
        });
        app.EventDispatcher.on("battle begin", (payload) => {
          if (payload && payload.pvpt) {
            state.pvptBattleLive = true;
            state.pvptBattleArmedAt = Date.now();
            log("Бой турнира начался.");
          }
        });
      }

      if (app.EventUtil && typeof app.EventUtil.PROCESS_EVENT === "function") {
        const original = app.EventUtil.PROCESS_EVENT.bind(app.EventUtil);
        app.EventUtil.PROCESS_EVENT = function patchedProcessEvent(event) {
          const result = original(event);
          try {
            const pvptUpdate =
              event &&
              event.type === "UPDATE" &&
              ((event.user && event.user.pvpt) || event.pvpt);
            if (pvptUpdate) setTimeout(() => scan("event:pvpt"), 50);
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
    log("Frena auto module initialized.");
  });
})();
