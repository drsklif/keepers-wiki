(function () {
  "use strict";

  const helper = window.KeepersHelper;
  if (!helper || typeof helper.registerModule !== "function") {
    console.warn("[KeepersHelper/Quests] Core module is missing.");
    return;
  }

  helper.registerModule("quests-claim", (core) => {
    const STORAGE_KEY = "keepersHelper.quests.autoEnabled";
    const LEGACY_ENERGY_KEY = "keepersHelper.energy.autoEnabled";

    const CONFIG = {
      pollMs: 10000,
      userReadyPollMs: 400,
      delays: {
        afterReady: 400,
        afterReadyJitter: 350,
        betweenClaims: 350,
        betweenClaimsJitter: 250,
      },
      maxClaimAttempts: 4,
      claimCooldownMs: 30000,
    };

    const state = {
      autoEnabled: loadAutoEnabled(),
      userReady: false,
      busy: false,
      cycleToken: 0,
      claimAttempts: {},
      claimCooldownUntil: {},
      lastStatusKey: null,
      lastWaitLogKey: null,
      lastClaimed: [],
      overlay: null,
      autoButton: null,
      pollTimer: null,
    };

    function log(...args) {
      core.log("[AutoQuests]", ...args);
    }

    function loadAutoEnabled() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === "0") return false;
        if (raw === "1") return true;
        const legacy = window.localStorage.getItem(LEGACY_ENERGY_KEY);
        if (legacy === "0") return false;
        if (legacy === "1") return true;
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
          app.Model.user.quests &&
          Array.isArray(app.Model.user.quests.quests) &&
          app.UserUtil &&
          app.TimeUtil &&
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

    function getAllQuests() {
      const list = app.Model.user?.quests?.quests;
      return Array.isArray(list) ? list : [];
    }

    function isClaimed(quest) {
      return Number(quest?.rt) > 0;
    }

    function isProgressComplete(quest) {
      try {
        if (app.UserUtil && typeof app.UserUtil.isQuestComplete === "function") {
          return Boolean(app.UserUtil.isQuestComplete(quest));
        }
      } catch (_err) {
        // fall through
      }
      const progress = Number(quest?.progress) || 0;
      const required = Number(quest?.required) || 0;
      return required > 0 && progress >= required;
    }

    function isSkipped(quest) {
      if (!quest) return true;
      if (quest.type === "d_gb") {
        try {
          if (app.UserUtil && typeof app.UserUtil.isVKODR === "function" && app.UserUtil.isVKODR()) {
            return true;
          }
        } catch (_err) {
          // keep
        }
      }
      return false;
    }

    function isClaimable(quest) {
      if (!quest || isClaimed(quest) || isSkipped(quest)) return false;
      return isProgressComplete(quest);
    }

    function getClaimableQuests() {
      return getAllQuests().filter(isClaimable);
    }

    function questLabel(quest) {
      try {
        const name = app.CFGUtil?.getQuestName?.(quest);
        if (typeof name === "string" && name) return name;
      } catch (_err) {
        // fall through
      }
      return quest?.type || String(quest?.id || "?");
    }

    function formatReward(quest, response) {
      const reward = response?.quest?.reward || quest?.reward || {};
      const parts = [];
      if (reward.energy) parts.push(`энергия +${reward.energy}`);
      if (reward.gold) parts.push(`золото +${reward.gold}`);
      if (reward.gems) parts.push(`кристаллы +${reward.gems}`);
      if (reward.exp) parts.push(`опыт +${reward.exp}`);
      if (reward.dust) parts.push(`пыль +${reward.dust}`);
      if (reward.tickets) parts.push(`билеты +${reward.tickets}`);
      if (parts.length > 0) return parts.join(", ");
      if (response?.drop?.list?.length) return "дроп";
      return "награда";
    }

    function refreshResourcesHud() {
      try {
        const energy = app.Model.user?.energy;
        const els = app.MainPage?.getCFG?.()?.resources?.energy?.els;
        if (energy && els && els.value) {
          const html =
            app.Utils && typeof app.Utils.toMoney === "function"
              ? app.Utils.toMoney(energy.v)
              : String(energy.v);
          els.value.innerHTML = html;
          els.value.className = energy.v >= energy.max ? "red" : "";
        }
      } catch (_err) {
        // HUD from event
      }
      try {
        app.EventDispatcher.emit("user resources changed");
      } catch (_err) {
        // ignore
      }
    }

    function applyEnergyIfNeeded(before, response, quest) {
      const after = Number(app.Model.user?.energy?.v);
      if (Number.isFinite(before) && Number.isFinite(after) && after !== before) return;
      const fromUser = Number(response?.user?.energy?.v);
      if (Number.isFinite(fromUser) && Number.isFinite(before) && fromUser !== before) {
        app.Model.user.energy.v = fromUser;
        return;
      }
      const reward = Number(quest?.reward?.energy);
      if (Number.isFinite(before) && Number.isFinite(reward) && reward > 0) {
        app.Model.user.energy.v = before + reward;
      }
    }

    function tokenAlive(token) {
      return token === state.cycleToken && state.autoEnabled;
    }

    async function refreshQuestList(token) {
      const response = await sendCommand({ cmd: "UserQuestsVisit" });
      if (!tokenAlive(token)) return;
      if (response.error) {
        log("UserQuestsVisit ошибка", response.error.code ?? response.error);
      }
    }

    function findNextStage(type) {
      return getAllQuests().find((entry) => entry && entry.type === type && !isClaimed(entry));
    }

    async function claimQuest(quest, token) {
      if (Date.now() < (state.claimCooldownUntil[quest.id] || 0)) return;
      const energyBefore = Number(app.Model.user?.energy?.v);
      const claimedId = quest.id;
      const claimedType = quest.type;
      // Как в UI: прячем кнопку до ответа. Сервер сам подменит объект
      // следующим этапом; после ответа этот rt трогать нельзя.
      if (!isClaimed(quest)) {
        quest.rt = app.TimeUtil.now();
      }
      log(`${claimedType}: UserQuestComplete id=${claimedId}.`);
      const response = await sendCommand({ cmd: "UserQuestComplete", quest: claimedId });
      if (!tokenAlive(token)) return;
      if (response.error) {
        if (Number(quest.rt) > 0) quest.rt = 0;
        const n = (state.claimAttempts[claimedId] || 0) + 1;
        if (n >= CONFIG.maxClaimAttempts) {
          state.claimAttempts[claimedId] = 0;
          state.claimCooldownUntil[claimedId] = Date.now() + CONFIG.claimCooldownMs;
          log(
            `${claimedType}: ошибка ${response.error.code ?? ""}. Пауза ${Math.round(CONFIG.claimCooldownMs / 1000)}с.`
          );
        } else {
          state.claimAttempts[claimedId] = n;
          log(`${claimedType}: повтор ${n}/${CONFIG.maxClaimAttempts} — ${response.error.code ?? ""}`);
        }
        return;
      }
      applyEnergyIfNeeded(energyBefore, response, quest);
      try {
        if (response.drop && app.UserUtil?.processChestDrop) {
          app.UserUtil.processChestDrop(response.drop);
        }
      } catch (_err) {
        // merged by Network
      }
      refreshResourcesHud();
      delete state.claimAttempts[claimedId];
      delete state.claimCooldownUntil[claimedId];
      const text = formatReward(quest, response);
      state.lastClaimed = [`${questLabel(quest)}: ${text}`, ...state.lastClaimed].slice(0, 8);
      const next = findNextStage(claimedType);
      if (next) {
        log(
          `${claimedType}: получено — ${text}. Следующий этап ${next.progress}/${next.required} id=${next.id}.`
        );
      } else {
        log(`${claimedType}: получено — ${text}.`);
      }
    }

    async function runCycle(token, source) {
      const beforeCount = getClaimableQuests().length;
      await refreshQuestList(token);
      if (!tokenAlive(token)) return;

      let round = 0;
      while (tokenAlive(token) && round < 8) {
        const claimable = getClaimableQuests();
        if (claimable.length === 0) {
          if (round === 0) logWaitOnce("idle", `Нет готовых наград (${source}).`);
          return;
        }
        if (round === 0 && (claimable.length !== beforeCount || source !== "poll")) {
          log(`Готово к получению: ${claimable.length} (${source}).`);
        }
        round += 1;
        for (const quest of claimable) {
          if (!tokenAlive(token)) return;
          if (!isClaimable(quest)) continue;
          await claimQuest(quest, token);
          await sleep(jitterDelay(CONFIG.delays.betweenClaims, CONFIG.delays.betweenClaimsJitter));
        }
      }
    }

    function describeSnapshot() {
      const claimable = getClaimableQuests();
      const lines = [];
      if (claimable.length > 0) {
        lines.push(`Можно забрать: ${claimable.length}`);
        for (const quest of claimable.slice(0, 6)) {
          lines.push(`  ${questLabel(quest)} (${quest.progress}/${quest.required})`);
        }
      } else {
        lines.push("Готовых наград нет");
      }
      if (state.lastClaimed.length > 0) {
        lines.push("Недавно:");
        for (const line of state.lastClaimed.slice(0, 5)) {
          lines.push(`  ${line}`);
        }
      }
      if (state.busy) lines.push("Сейчас: проверка");
      return lines.join("\n");
    }

    function overlayStatusText() {
      if (!state.userReady) return "Задания: ждём модель";
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
      autoBtn.textContent = "Задания";
      autoBtn.addEventListener("click", () => {
        state.autoEnabled = !state.autoEnabled;
        saveAutoEnabled();
        if (!state.autoEnabled) {
          state.cycleToken += 1;
          state.busy = false;
        }
        log("Автозадания:", state.autoEnabled ? "вкл" : "выкл");
        updateOverlay();
      });

      const host =
        document.getElementById("ab-overlay") ||
        document.getElementById("ad-overlay") ||
        document.getElementById("aa-overlay") ||
        document.getElementById("ae-overlay");
      if (host) {
        host.appendChild(autoBtn);
        state.overlay = host;
      } else {
        const root = document.createElement("div");
        root.id = "aq-overlay";
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
      if (!state.autoEnabled) return;

      state.busy = true;
      const token = (state.cycleToken += 1);
      const waitMs =
        source === "poll" || source === "boot"
          ? jitterDelay(CONFIG.delays.afterReady, CONFIG.delays.afterReadyJitter)
          : 0;
      setTimeout(async () => {
        if (!tokenAlive(token)) {
          state.busy = false;
          return;
        }
        try {
          await runCycle(token, source);
        } catch (err) {
          log("Цикл заданий упал:", err);
        } finally {
          if (token === state.cycleToken) state.busy = false;
          updateOverlay();
        }
      }, waitMs);
    }

    function scan(source) {
      if (!isUserReady()) return;
      const claimable = getClaimableQuests();
      const statusKey = `${state.busy ? "busy" : "idle"}|${claimable.map((q) => q.id).join(",")}|${state.lastClaimed[0] || ""}`;
      if (statusKey !== state.lastStatusKey) {
        state.lastStatusKey = statusKey;
        updateOverlay();
      }
      if (!state.autoEnabled) return;
      if (source === "poll" || source === "boot") {
        scheduleCycle(source);
        return;
      }
      if (claimable.length > 0 && !state.busy) {
        scheduleCycle(source);
      }
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
    log("Quests claim module initialized.");
  });
})();
