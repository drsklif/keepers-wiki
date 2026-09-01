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
        document.getElementById("aq-overlay") ||
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
