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
