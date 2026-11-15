// Закрывает мир по пройденным вехам; по текущей вехе и экрану выбирает подсказку из TutorialScenario и показывает её через TutorialOverlay;
// после основной части ведёт Путь Хранителя (TutorialPath). update() зовёт Game.update0 каждый кадр.
app.Tutorial = (function () {

    let loading = false;
    let phase;
    let hint;
    let doneStepsCount;
    let pendingLesson;
    let dismissed;
    let pathShown = false;
    let lastErrorText;
    // прощание Беллы — после Пути Хранителя: пока оно не показано, из подсказок остаётся только оно
    const FAREWELL_LESSON = 'see_you';
    // пока подсказки грузятся (1–2 с после главной), мир не нажимается: иначе новичок успевал уйти в кампанию без карт.
    // Не загрузились за это время — снимаем блок, чтобы игра не встала
    const LOADING_BLOCK_MAX_MS = 10000;
    let loadingBlocker;

    // исключение здесь остановило бы World.loop: следующий кадр он планирует после Game.update
    function update() {
        try {
            updateFrame();
        } catch (e) {
            if (String(e) !== lastErrorText) console.error(e);
            lastErrorText = String(e);
            hint = undefined;
            if (app.TutorialOverlay) app.TutorialOverlay.hide();
        }
    }

    function updateFrame() {
        const UserUtil = app.UserUtil;
        if (UserUtil.isTutorialCompleted()) {
            if (pathShown) onCompleted();
            // урок отмечается при показе: прощание держим, пока оно на экране
            if (!UserUtil.isTutorialLessonPending(FAREWELL_LESSON) && !(hint && hint.lesson === FAREWELL_LESSON)) return;
        }
        // фаза — до загрузки подсказок, иначе мир успевает показаться открытым
        if (UserUtil.isTutorialMainCompleted()) {
            if (phase) onMainCompleted();
        } else {
            reportStepToDevtodev();
            setPhase(getPhase());
            blockWorldWhileLoading();
        }
        if (!app.TutorialScenario || !app.TutorialOverlay || !app.TutorialPath) {
            load();
            return;
        }
        // подсказка покажется в этом же кадре
        unblockWorld();
        if (UserUtil.isTutorialMainCompleted() && !UserUtil.isTutorialCompleted()) {
            app.TutorialPath.update();
            pathShown = true;
        }
        updateStarsChestGoal(app.TutorialScenario.getStarsChestGoalTexts());

        const next = findHint();
        if (next === hint) {
            if (hint) app.TutorialOverlay.place();
            return;
        }
        hint = next;
        if (hint && hint.marksLessonSeen) markLessonSeen(hint.lesson);
        if (hint) app.TutorialOverlay.show(toOverlayHint(hint));
        else app.TutorialOverlay.hide();
    }

    // undefined — блока ещё не было, null — уже снят и больше не ставится
    function blockWorldWhileLoading() {
        if (loadingBlocker !== undefined) return;
        loadingBlocker = app.Utils.createDIV({style: 'position: fixed; left: 0; top: 0; right: 0; bottom: 0; z-index: 100001'});
        document.body.appendChild(loadingBlocker);
        setTimeout(unblockWorld, LOADING_BLOCK_MAX_MS);
    }

    function unblockWorld() {
        if (loadingBlocker) loadingBlocker.remove();
        loadingBlocker = null;
    }

    function load() {
        if (loading) return;
        loading = true;
        const unlock = () => loading = false;
        app.loadJS1('TutorialOverlay', () => app.loadJS1('TutorialScenario', () => app.loadJS1('TutorialPath', unlock, unlock), unlock), unlock);
    }

    // показанная подсказка урока остаётся, хотя урок уже отмечен; нажатая — не возвращается, пока не сменится экран
    function findHint() {
        const tutorial = app.Model.user.tutorial;
        const screen = getScreen();
        if (dismissed && dismissed.screen !== screen) dismissed = undefined;
        return app.TutorialScenario.hints.find(h =>
            (!dismissed || h !== dismissed.hint)
            && (!app.UserUtil.isTutorialCompleted() || h.lesson === FAREWELL_LESSON)
            && (!h.step || h.step === tutorial.currentMainStep)
            && (!h.lesson || h === hint || tutorial.l.indexOf(h.lesson) === -1 && pendingLesson !== h.lesson)
            && (typeof h.screen === 'function' ? h.screen(screen) : h.screen === screen)
            && (!h.when || h.when())) || null;
    }

    function getScreen() {
        const popup = app.Popups.getLast();
        return popup ? popup.cfg.id || '' : 'MAIN';
    }

    function toOverlayHint(scenarioHint) {
        const overlayHint = Object.assign({}, scenarioHint);
        if (typeof scenarioHint.text === 'function') overlayHint.text = scenarioHint.text();
        if (scenarioHint.button) overlayHint.button = toOverlayAction(scenarioHint.button, scenarioHint);
        const link = typeof scenarioHint.link === 'function' ? scenarioHint.link() : scenarioHint.link;
        overlayHint.link = link ? toOverlayAction(link, scenarioHint) : undefined;
        return overlayHint;
    }

    function toOverlayAction(action, scenarioHint) {
        return {text: action.text, onClick: () => {
            dismissed = {hint: scenarioHint, screen: getScreen()};
            if (action.stepDone) markStepDone(scenarioHint.step);
            if (action.onClick) action.onClick();
        }};
    }

    function markStepDone(step) {
        app.Network.command({cmd: 'TutorialStepDone', step: step});
    }

    // до ответа сервера урок уже не показываем
    function markLessonSeen(lesson) {
        pendingLesson = lesson;
        app.Network.command({cmd: 'TutorialLessonSeen', lesson: lesson}, () => pendingLesson = undefined);
    }

    // что открыто на главной и в меню: none — портал и сундук; portal — только портал; partial — + «Главная» и «Профиль»;
    // free — + «Карты» и «Задания»
    function getPhase() {
        if (!app.UserUtil.isTutorialStepDone('first_summon')) return 'none';
        if (!app.UserUtil.isTutorialStepDone('first_battle')) return 'portal';
        if (!app.UserUtil.isTutorialStepDone('first_item_worn')) return 'partial';
        return 'free';
    }

    // метки цели: над порталом на главной и над сундуком на карте первой главы; null убирает обе
    function updateStarsChestGoal(texts) {
        setStarsChestGoalLabel(document.querySelector('.main_bg a.campaign'), texts && texts.main);
        const chest = document.querySelector('.map_bg .decor.chest' + (texts ? texts.chest : 1));
        // старый Campaign.min.js без getCurrentChapterID — метки на карте нет, остальной туториал работает
        const onChapter1 = !!app.Campaign && !!app.Campaign.getCurrentChapterID && app.Campaign.getCurrentChapterID() === 1;
        const mapLabel = setStarsChestGoalLabel(chest && chest.parentNode, onChapter1 && texts && texts.map);
        // третий сундук первой главы — у верхнего края карты, над ним метку закрыла бы рамка окна
        if (mapLabel) placeNear(mapLabel, chest, texts.chest === 3);
    }

    // по видимой рамке target: у сундука scale и анимация появления; зазор — под рамку подсказки на сундуке (~11px)
    function placeNear(label, target, below) {
        const parentRect = label.parentNode.getBoundingClientRect();
        const parentScale = parentRect.width / label.parentNode.offsetWidth;
        const r = target.getBoundingClientRect();
        label.style.left = ((r.left + r.right) / 2 - parentRect.left) / parentScale + 'px';
        label.style.top = below
            ? (r.bottom - parentRect.top) / parentScale + 12 + 'px'
            : (r.top - parentRect.top) / parentScale - label.offsetHeight - 12 + 'px';
    }

    function setStarsChestGoalLabel(parent, text) {
        if (!parent) return null;
        let label = parent.querySelector(':scope > .tut_stars_chest_goal');
        if (!text) {
            if (label) label.remove();
            return null;
        }
        if (!label) parent.appendChild(label = app.Utils.createSPAN({class: 'tut_stars_chest_goal'}));
        if (label.textContent !== text) label.textContent = text;
        return label;
    }

    // tut_world_closed — при любой фазе, до конца основной части
    function setPhase(next) {
        if (next === phase) return;
        const root = document.documentElement;
        if (phase) root.classList.remove('tut_phase_' + phase);
        if (next) root.classList.add('tut_phase_' + next);
        root.classList.toggle('tut_world_closed', !!next);
        phase = next;
    }

    function reportStepToDevtodev() {
        const count = app.Model.user.tutorial.d.length;
        if (app.UserUtil.isAG()) {
            if (doneStepsCount === undefined && count === 0) app.AGUtil.d2dTutorial(-1);
            if (doneStepsCount !== undefined && count > doneStepsCount) app.AGUtil.d2dTutorial(count);
        }
        doneStepsCount = count;
    }

    function onMainCompleted() {
        reportStepToDevtodev();
        setPhase(undefined);
        if (app.UserUtil.isAG()) app.AGUtil.d2dTutorial(-2);
    }

    function onCompleted() {
        pathShown = false;
        updateStarsChestGoal(null);
        hint = undefined;
        app.TutorialOverlay.hide();
        app.TutorialPath.finish();
    }

    return {
        update: update,
        markLessonSeen: markLessonSeen
    };
})();
