#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const harPath = process.argv[2] || path.join(__dirname, "keepers.mobi-frena.har");
const outPath = process.argv[3] || path.join(__dirname, "frena-har-summary.json");

function parseFrame(data) {
  if (!data || !data.startsWith("42")) return null;
  let arr;
  try {
    arr = JSON.parse(data.slice(2));
  } catch (err) {
    return null;
  }
  let payload = arr[1];
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (err) {
      return { event: arr[0], payload };
    }
  }
  return { event: arr[0], payload };
}

function loadMessages(file) {
  const har = JSON.parse(fs.readFileSync(file, "utf8"));
  const entry = (har.log.entries || []).find((item) => item._webSocketMessages);
  if (!entry) throw new Error("В HAR нет websocket-сообщений");
  return entry._webSocketMessages;
}

function selfRow(pvpt) {
  const id = pvpt && pvpt.e && pvpt.e.id;
  const users = (pvpt && pvpt.g && pvpt.g.users) || [];
  if (!id) return null;
  return users.find((user) => user.id === id) || null;
}

function compactJournal(row) {
  if (row.phase && !row.m1 && !row.m2) return { marker: row.phase };
  return {
    winner: row.winner,
    points: row.points,
    m1: row.m1 && row.m1.id,
    m2: row.m2 && row.m2.id,
    keys: Object.keys(row),
  };
}

function compactUser(user) {
  return {
    id: user.id,
    name: user.u && user.u.n,
    place: user.place,
    points: user.points,
    points1: user.points1,
    power: user.deck && user.deck.power,
    battles: user.battles || [],
  };
}

function compactEntry(entry) {
  if (!entry || typeof entry !== "object") return entry || null;
  return {
    id: entry.id,
    group: entry.group,
    sortPower: entry.sortPower,
    health: entry.health,
    deckPower: entry.deck && entry.deck.power,
    deckSize: entry.deck && entry.deck.list ? entry.deck.list.length : undefined,
  };
}

function compactPvpt(pvpt) {
  if (!pvpt) return null;
  if (pvpt.remove) return { remove: true };
  const group = pvpt.g;
  return {
    state: pvpt.state || null,
    st: pvpt.st,
    qSize: pvpt.qSize,
    cfg: pvpt.cfg || null,
    entry: compactEntry(pvpt.e),
    group: group
      ? {
          id: group.id,
          users: (group.users || []).map(compactUser),
          journalSize: (group.journal || []).length,
        }
      : null,
  };
}

function signature(snapshot) {
  if (!snapshot) return "";
  const group = snapshot.group;
  const me = group && snapshot.entry && group.users.find((user) => user.id === snapshot.entry.id);
  return JSON.stringify({
    state: snapshot.state,
    entry: snapshot.entry,
    me: me && { place: me.place, points1: me.points1, battles: me.battles },
    roster: group && group.users.map((user) => [user.id, user.place, user.points, user.points1]),
  });
}

function battleBrief(battle) {
  if (!battle) return null;
  return {
    t: battle.t,
    winner: battle.winner,
    data: battle.data || null,
    rounds: battle.state ? Object.keys(battle.state).length : undefined,
  };
}

function main() {
  const messages = loadMessages(harPath);
  const commands = [];
  const pending = new Map();
  const timeline = [];
  const qSize = [];
  const stamps = [];
  let rewards = null;
  let next = null;
  let journal = null;
  let lastSig = "";
  const commandCounts = {};

  messages.forEach((message, index) => {
    const frame = parseFrame(message.data);
    if (!frame || !frame.payload || typeof frame.payload !== "object") return;
    const payload = frame.payload;

    if (message.type === "send" && payload.cmd) {
      commandCounts[payload.cmd] = (commandCounts[payload.cmd] || 0) + 1;
      if (payload.num != null) pending.set(payload.num, { index, time: message.time, request: payload });
      return;
    }

    if (frame.event === "command" && message.type === "receive") {
      if (!rewards && payload.cfg && payload.cfg.cfgPVPT40) rewards = payload.cfg.cfgPVPT40;
      const sent = payload.num != null ? pending.get(payload.num) : null;
      if (sent && /^PVPT/.test(sent.request.cmd)) {
        const pvpt = payload.user && payload.user.pvpt;
        commands.push({
          time: sent.time,
          cmd: sent.request.cmd,
          num: sent.request.num,
          enemy: sent.request.enemy,
          error: payload.error || null,
          battle: battleBrief(payload.battle),
          pvpt: compactPvpt(pvpt),
          pvpt40: payload.user && (payload.user._pvpt40 != null ? payload.user._pvpt40 : payload.user.items && payload.user.items.pvpt40),
        });
      }
      considerPvpt(index, message.time, "reply", payload.user && payload.user);
      return;
    }

    if (frame.event !== "events" || !payload.list) return;
    for (const event of payload.list) {
      if (event.pvpt && event.pvpt.qSize != null) qSize.push({ time: message.time, qSize: event.pvpt.qSize });
      if (event.user) considerPvpt(index, message.time, "update", event.user);
    }
  });

  function considerPvpt(index, time, source, user) {
    if (!user) return;
    if (user.pvpt_next) next = user.pvpt_next;
    if (user._pvpt40 != null) stamps.push({ time, source, pvpt40: user._pvpt40 });
    if (!user.pvpt) return;
    if (user.pvpt.g && user.pvpt.g.journal) journal = user.pvpt.g.journal.map(compactJournal);
    const snapshot = compactPvpt(user.pvpt);
    const sig = signature(snapshot);
    if (sig === lastSig) return;
    lastSig = sig;
    timeline.push({ index, time, source, pvpt: snapshot });
  }

  const summary = {
    file: path.basename(harPath),
    messages: messages.length,
    commands: commandCounts,
    rewards,
    next,
    qSize: qSize.length
      ? { updates: qSize.length, first: qSize[0].qSize, last: qSize[qSize.length - 1].qSize, min: Math.min(...qSize.map((item) => item.qSize)), max: Math.max(...qSize.map((item) => item.qSize)) }
      : null,
    stamps,
    timeline,
    journal,
    pvptCommands: commands,
  };

  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  printReport(summary, outPath);
}

function phaseLabel(state) {
  if (!state) return "нет состояния";
  const phase = state.phase ? ` фаза ${state.phase}` : "";
  const results = state.results ? " подсчёт" : "";
  return `v=${state.v}${phase}${results}`;
}

function printReport(summary, outPath) {
  console.log(`${summary.file}: ${summary.messages} кадров`);
  console.log(`Команды клиента: ${Object.entries(summary.commands).map(([cmd, count]) => `${cmd}×${count}`).join(", ")}`);
  console.log(`Награды cfgPVPT40: ${JSON.stringify(summary.rewards)}`);
  console.log(`Следующий турнир: ${JSON.stringify(summary.next)}`);
  console.log(`Очередь qSize: ${JSON.stringify(summary.qSize)}`);
  console.log(`Печати _pvpt40: ${summary.stamps.map((item) => item.pvpt40).join(" → ") || "нет"}`);
  console.log("\nСостояние:");
  let previous = "";
  for (const step of summary.timeline) {
    const pvpt = step.pvpt;
    const me = pvpt.group && pvpt.entry && pvpt.group.users.find((user) => user.id === pvpt.entry.id);
    const fights = me && me.battles.length ? ` бои ${JSON.stringify(me.battles)}` : "";
    const score = me ? ` место ${me.place} счёт ${me.points1}` : "";
    const group = pvpt.group ? ` группа ${pvpt.group.id} игроков ${pvpt.group.users.length}` : "";
    const line = `- ${phaseLabel(pvpt.state)}${group}${score}${fights} q=${pvpt.qSize}`;
    if (line === previous) continue;
    previous = line;
    console.log(line);
  }
  console.log(`Шагов в сводке: ${summary.timeline.length}. Одинаковые строки схлопнуты: это чужие очки в той же фазе.`);
  console.log("\nКоманды турнира:");
  for (const command of summary.pvptCommands) {
    const me = command.pvpt && command.pvpt.group && command.pvpt.entry
      ? command.pvpt.group.users.find((user) => user.id === command.pvpt.entry.id)
      : null;
    const enrolled = command.pvpt && command.pvpt.entry ? ` entry ${command.pvpt.entry.id} group ${command.pvpt.entry.group}` : "";
    const enemy = command.enemy ? ` enemy ${command.enemy}` : "";
    const battle = command.battle ? ` battle ${JSON.stringify(command.battle)}` : "";
    const self = me ? ` место ${me.place} счёт ${me.points1} бои ${JSON.stringify(me.battles)}` : "";
    const error = command.error ? ` error ${JSON.stringify(command.error)}` : "";
    console.log(`- ${command.cmd}${enrolled}${enemy}${error}${battle}${self}`);
  }
  console.log(`\nСводка: ${outPath}`);
}

main();
