// Путь Хранителя: виджет на главной и окно целей. Цели, тексты и награды — cfgTutorialPath, состояние — user.tutorial
app.TutorialPath = (function () {

    let widget, renderedGoalsKey, windowPopup;

    // зовётся каждый кадр, пока Путь не пройден
    function update() {
        if (!widget) createWidget();
        widget.style.display = app.Popups.getLast() ? 'none' : '';
        const goals = getGoals();
        const key = JSON.stringify(goals);
        if (key === renderedGoalsKey) return;
        renderedGoalsKey = key;
        renderWidget(goals);
        if (windowPopup) renderGoals(goals);
    }

    // Путь пройден: виджет убрать, открытое окно перерисовать — в нём все цели забраны
    function finish() {
        if (widget && widget.parentNode) widget.parentNode.removeChild(widget);
        widget = renderedGoalsKey = undefined;
        if (windowPopup) renderGoals(getGoals());
    }

    // цели игрока в порядке cfgTutorialPath
    function getGoals() {
        const tutorial = app.Model.user.tutorial;
        const cfg = app.Model.cfg.cfgTutorialPath;
        return (cfg && cfg.goals || [])
            .filter(goal => tutorial.pathGoals.indexOf(goal.goal) !== -1)
            .map(goal => ({
                code: goal.goal,
                text: goal.text,
                reward: goal.reward,
                reached: tutorial.pr.indexOf(goal.goal) !== -1,
                claimed: tutorial.pc.indexOf(goal.goal) !== -1
            }));
    }

    function createWidget() {
        widget = app.Utils.createA({class: 'tut_path'}, showWindow);
        app.Utils.el('main').appendChild(widget);
    }

    function renderWidget(goals) {
        const current = goals.find(goal => !goal.claimed);
        const claimedCount = goals.filter(goal => goal.claimed).length;
        const claimableCount = goals.filter(goal => goal.reached && !goal.claimed).length;
        if (!current) return;
        widget.innerHTML =
            (claimableCount ? '<span class="tut_path_badge">' + (claimableCount === 1 ? 'Награда!' : 'Награды: ' + claimableCount) + '</span>' : '') +
            '<span class="tut_path_icon">' + (goals.indexOf(current) + 1) + '</span>' +
            '<span class="tut_path_title">Путь Хранителя · ' + claimedCount + '/' + goals.length + '</span>' +
            '<span class="tut_path_goal">' + current.text + '</span>' +
            '<span class="tut_path_bar"><i style="width: ' + Math.round(claimedCount * 100 / goals.length) + '%"></i></span>';
    }

    function showWindow() {
        app.SoundManager.playClick();
        windowPopup = app.Popups.createPopup1({
            id: 'TUTORIAL_PATH',
            header: {value: 'Путь Хранителя'},
            display: {gold: 1, gems: 1},
            onClose: function () {
                windowPopup = undefined;
            }
        });
        renderGoals(getGoals());
        app.Popups.add(windowPopup);
        layoutWindow();
    }

    function renderGoals(goals) {
        app.Utils.removeAllChild(windowPopup.scroll.el);
        const list = app.Utils.createEL('ul', {class: 'tut_goals'});
        const current = goals.find(goal => !goal.claimed);
        goals.forEach((goal, i) => {
            const state = goal.claimed ? 'tut_goal_claimed' : goal.reached ? 'tut_goal_claimable' : goal === current ? 'tut_goal_current' : '';
            const item = app.Utils.createEL('li', {class: 'tut_goal ' + state});
            item.appendChild(app.Utils.createSPAN({class: 'tut_goal_mark', text: goal.claimed || goal.reached ? '✓' : String(i + 1)}));
            item.appendChild(app.Utils.createSPAN({class: 'tut_goal_text', text: goal.text}));
            item.appendChild(app.Utils.createSPAN({class: 'tut_goal_reward', text: formatReward(goal.reward)}));
            if (goal.reached && !goal.claimed) {
                item.appendChild(app.Utils.createA({class: 'tut_goal_claim', text: 'Забрать'}, () => claim(goal.code)));
            }
            list.appendChild(item);
        });
        windowPopup.scroll.el.appendChild(list);
    }

    function layoutWindow() {
        TweenMax.delayedCall(0.001, function () {
            if (!windowPopup) return;
            const availableHeight0 = app.LAYOUT.getClientWHS0(0);
            const contentRequiredHeight = windowPopup.scroll.el.firstChild.offsetHeight + 20;
            const availableHeight = Math.min(contentRequiredHeight + 35, availableHeight0 - 80 - 40);
            windowPopup.els.brd.style.opacity = 1;
            windowPopup.els.brd.style.top = Math.max(80, (availableHeight0 - availableHeight) / 2) + 'px';
            windowPopup.els.brd_r.style.height = availableHeight + 'px';
            windowPopup.els.wrap.style.top = '10px';
            windowPopup.els.wrap.style.height = availableHeight - 10 + 'px';
            windowPopup.scroll.topMax = Math.max(0, contentRequiredHeight - (availableHeight - 10));
        });
    }

    function claim(goal) {
        app.Network.command({cmd: 'TutorialPathClaim', goal: goal}, function (data) {
            if (data.error) {
                app.Utils.processErrors(data.error);
                return;
            }
            app.UserUtil.processChestDrop(data.drop);
            app.EventDispatcher.emit('show chest drop', {drop: data.drop});
        });
    }

    function formatReward(reward) {
        const parts = [];
        if (reward.gold) parts.push(app.Utils.toMoney(reward.gold) + ' золота');
        if (reward.gems) parts.push(reward.gems + ' кристаллов');
        (reward.items || []).forEach(item => parts.push(app.CFGUtil.getItemByID(item.item).name + (item.count > 1 ? ' ×' + item.count : '')));
        if (reward.cards) parts.push('фрагменты карты');
        if (reward.chest) parts.push('сундук');
        return parts.join(', ');
    }

    return {
        update: update,
        finish: finish,
        showWindow: showWindow
    };
})();
