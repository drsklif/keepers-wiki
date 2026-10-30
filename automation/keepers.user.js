// ==UserScript==
// @name         Keepers Helper
// @namespace    https://keepers.local/
// @version      0.2.0
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

  // Версия сборки. Должна совпадать с // @version в шапке.
  // PATCH — исправление, MINOR — новое поведение, MAJOR — ломающее изменение API или ключей хранения.
  const VERSION = "0.2.0";

  const helper = {
    version: VERSION,
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
    registerModule(name, initFn, version) {
      if (typeof initFn !== "function") return;
      const moduleVersion = typeof version === "string" && version.trim() ? version.trim() : "";
      this.modules.push({ name, initFn, version: moduleVersion });
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
          const versionLabel = mod.version ? ` ${mod.version}` : "";
          this.log(`Module initialized: ${mod.name}${versionLabel}`);
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
    isBattleOpen() {
      try {
        if (!window.app || !app.Popups) return false;
        if (typeof app.Popups.getByID === "function") {
          return Boolean(app.Popups.getByID("BATTLE"));
        }
        const last = typeof app.Popups.getLast === "function" ? app.Popups.getLast() : null;
        return Boolean(last && last.cfg && last.cfg.id === "BATTLE");
      } catch (_err) {
        return false;
      }
    },
    shouldPauseBackgroundAutomation() {
      return this.isBattleOpen();
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
