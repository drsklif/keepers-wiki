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
