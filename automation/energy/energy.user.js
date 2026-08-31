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
        afterClaimable: 400,
        afterClaimableJitter: 350,
      },
      maxClaimAttempts: 5,
    };

    const state = {
      autoEnabled: loadAutoEnabled(),
      userReady: false,
      claiming: false,
      claimToken: 0,
      claimAttempts: {},
      blockedKey: null,
      lastStatusKey: null,
      overlay: null,
      autoButton: null,
      pollTimer: null,
      catalog: {},
      windows: {},
      shapeLogged: false,
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

    function isClaimable(quest) {
      if (!quest || quest.rt) return false;
      try {
        return Boolean(app.UserUtil.isQuestComplete(quest));
      } catch (_err) {
        const progress = Number(quest.progress) || 0;
        const required = Number(quest.required) || 0;
        return required > 0 && progress >= required;
      }
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
          return { text: `через ${app.TimeUtil.formatToHumanTime(untilStart, deep)}` };
        }
        if (now < spec.endTs) return { text: "сейчас" };
        return { text: "завтра" };
      }
      const bounds = getWindowBounds(quest);
      if (!bounds) return { text: spec?.label || quest.type };
      const moscowNow = app.TimeUtil._getMoscowTime(now);
      const untilStart = bounds.start.getTime() - moscowNow.getTime();
      if (untilStart > 0) {
        const deep = untilStart > 5 * app.TimeUtil.M_MS && untilStart < app.TimeUtil.H_MS ? 1 : 2;
        return { text: `через ${app.TimeUtil.formatToHumanTime(untilStart, deep)}` };
      }
      const untilEnd = bounds.end.getTime() - moscowNow.getTime();
      if (untilEnd > 0) return { text: "сейчас" };
      return { text: "завтра" };
    }

    function describeQuest(quest) {
      const spec = getQuestWindow(quest);
      const label = spec?.label || quest.type;
      if (quest.rt) return `${label}: получено`;
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
      if (state.blockedKey && state.blockedKey.startsWith(`${quest.id}:`)) {
        state.blockedKey = null;
      }
      updateOverlay();
    }

    function retryClaim(quest, token, reason) {
      if (token !== state.claimToken) return;
      const n = (state.claimAttempts[quest.id] || 0) + 1;
      state.claimAttempts[quest.id] = n;
      state.claiming = false;
      if (n >= CONFIG.maxClaimAttempts) {
        state.blockedKey = `${quest.id}:${quest.progress}/${quest.required}`;
        log(`${quest.type}: останавливаем попытки (${reason}). Ждём изменения статуса квеста.`);
        return;
      }
      log(`${quest.type}: повтор ${n}/${CONFIG.maxClaimAttempts} — ${reason}.`);
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

      const energyBefore = Number(app.Model.user?.energy?.v);
      log(`${quest.type}: UserQuestComplete id=${quest.id}.`);
      app.Network.command({ cmd: "UserQuestComplete", quest: quest.id }, (response) => {
        if (token !== state.claimToken) return;
        if (!state.autoEnabled) {
          state.claiming = false;
          return;
        }
        if (response && response.error) {
          try {
            if (app.Utils && typeof app.Utils.processErrors === "function") {
              app.Utils.processErrors(response.error);
            }
          } catch (_err) {
            // ignore
          }
          retryClaim(quest, token, `ошибка сервера ${response.error?.code ?? ""}`.trim());
          return;
        }
        onClaimSuccess(quest, token, energyBefore, response || {});
      });
    }

    function scheduleClaim(quest, source) {
      if (!state.autoEnabled) return;
      if (state.claiming) return;
      const blockKey = `${quest.id}:${quest.progress}/${quest.required}`;
      if (state.blockedKey === blockKey) return;

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
