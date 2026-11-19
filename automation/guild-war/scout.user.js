(function () {
  "use strict";

  const MODULE_VERSION = "0.1.4";

  const helper = window.KeepersHelper;
  if (!helper || typeof helper.registerModule !== "function") {
    console.warn("[KeepersHelper/GuildScout] Core module is missing.");
    return;
  }

  // Консоль: gwScout()
  // b(n), hp min/max/avg/sum, pwr min/max/avg/sum
  // Считаются все слоты с защитником (поле m), включая поверженных (h = 0).
  // Жизнь — текущее h, мощь — d.p. Данные те же, что на карте битвы: user.gw.b.
  const HEADER = "b(n), hp min/max/avg/sum, pwr min/max/avg/sum";

  const BUILDINGS = [
    { type: 2, code: "ВБ" },
    { type: 1, code: "ЗБ" },
    { type: 4, code: "Куз" },
    { type: 3, code: "Мел" },
    { type: 5, code: "Кап" },
  ];

  function isReady() {
    return Boolean(window.app && app.Model && app.Model.user);
  }

  function roundNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.round(n);
  }

  function summarize(values) {
    if (!values.length) return "0/0/0/0";
    let min = values[0];
    let max = values[0];
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
    }
    return `${min}/${max}/${Math.round(sum / values.length)}/${sum}`;
  }

  function findTower(guild, type) {
    const towers = guild && Array.isArray(guild.t) ? guild.t : [];
    for (let i = 0; i < towers.length; i++) {
      if (towers[i] && towers[i].t === type) return towers[i];
    }
    return null;
  }

  function findMember(guild, userId) {
    const members = guild && Array.isArray(guild.m) ? guild.m : [];
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (member && member.u && member.u.id === userId) return member;
    }
    return null;
  }

  function slotMemberId(slot) {
    if (!slot || typeof slot !== "object") return null;
    const marker = slot.m;
    if (marker == null || marker === 0 || marker === "") return null;
    if (typeof marker === "object") {
      return marker.id == null || marker.id === "" ? null : marker.id;
    }
    return marker;
  }

  function placedDefenders(guild, tower) {
    const slots = tower && tower.slots && Array.isArray(tower.slots.list) ? tower.slots.list : [];
    const defenders = [];
    for (let i = 0; i < slots.length; i++) {
      const userId = slotMemberId(slots[i]);
      if (userId == null) continue;
      defenders.push(findMember(guild, userId));
    }
    return defenders;
  }

  function formatBuilding(guild, building) {
    const defenders = placedDefenders(guild, findTower(guild, building.type));
    const health = [];
    const power = [];
    for (let i = 0; i < defenders.length; i++) {
      const member = defenders[i];
      if (!member) continue;
      const hp = roundNumber(member.h);
      if (hp != null) health.push(hp);
      const deck = member.d;
      const pwr = roundNumber(deck && deck.p);
      if (pwr != null) power.push(pwr);
    }
    return `${building.code}(${defenders.length}), ${summarize(health)}, ${summarize(power)}`;
  }

  function enemyGuild(battle, ownGuildId) {
    if (!battle || ownGuildId == null) return null;
    const g1 = battle.g1;
    const g2 = battle.g2;
    if (g1 && g1.id === ownGuildId) return g2 || null;
    if (g2 && g2.id === ownGuildId) return g1 || null;
    return null;
  }

  function formatReport(battle, ownGuildId) {
    const enemy = enemyGuild(battle, ownGuildId);
    if (!enemy) return null;
    const lines = [HEADER];
    for (let i = 0; i < BUILDINGS.length; i++) {
      lines.push(formatBuilding(enemy, BUILDINGS[i]));
    }
    return lines.join("\n");
  }

  function gwScout() {
    if (!isReady()) return "Игра ещё не загружена";
    const user = app.Model.user;
    const ownGuildId = user.guild ? user.guild.id : null;
    if (ownGuildId == null) return "Нет данных гильдии";
    const battle = user.gw && user.gw.b;
    if (!battle) return "Нет текущей битвы гильдий";
    const report = formatReport(battle, ownGuildId);
    if (!report) return "В битве нет гильдии противника";
    console.log(report);
  }

  helper.gwScout = gwScout;
  window.gwScout = gwScout;

  helper.registerModule("guild-scout", (core) => {
    core.gwScout = gwScout;
    window.gwScout = gwScout;
  }, MODULE_VERSION);
})();
