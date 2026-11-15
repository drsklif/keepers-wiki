// Представление личных наград. Пороги и расход приходят с сервера; клиент их не начисляет.
app.GolemRewards = (function() {
    'use strict';
    // запас высоты окна до первой отрисовки; затем VirusPage.fitPopupHeight берёт offsetHeight
    const PROGRESS_CARD_RESERVE = 70;
    const RESOURCE_CLASSES = {gold: 'res_gold', gems: 'res_gem', dust: 'res_dust', sd: 'res_dust_stone', q0: 'res_card_q0', q1: 'res_card_q1', q2: 'res_card_q2'};
    const RESOURCE_NAMES = {gold: 'золота', gems: 'кристаллов', dust: 'рунной пыли', sd: 'каменной пыли', q0: 'обычных фрагментов', q1: 'редких фрагментов', q2: 'фрагментов высшей редкости'};

    function element(tag, className, text) {
        const el = document.createElement(tag);
        el.className = className || '';
        if (text !== undefined) el.textContent = text;
        return el;
    }

    // Неполный/старый ответ не должен обещать игроку награду, которой нет на сервере.
    function personalProgress(virus) {
        const raw = virus && virus.personal;
        if (!raw || !Number.isSafeInteger(raw.energySpent) || raw.energySpent < 0 || !Array.isArray(raw.tiers) || raw.tiers.length === 0) return null;
        const tiers = [];
        let previous = 0;
        for (const tier of raw.tiers) {
            if (!tier || !Number.isSafeInteger(tier.energy) || tier.energy <= previous || !tier.reward || typeof tier.reward !== 'object') return null;
            const reward = {};
            for (const key of Object.keys(RESOURCE_CLASSES)) {
                const value = tier.reward[key];
                if (value === undefined) continue;
                if (!Number.isSafeInteger(value) || value < 0) return null;
                if (value > 0) reward[key] = value;
            }
            if (Object.keys(reward).length === 0) return null;
            tiers.push({energy: tier.energy, reward: reward});
            previous = tier.energy;
        }
        let reached = -1;
        tiers.forEach((tier, i) => { if (raw.energySpent >= tier.energy) reached = i; });
        return {spent: raw.energySpent, tiers: tiers, reached: reached, next: reached + 1 < tiers.length ? reached + 1 : -1, sent: raw.sent === true};
    }

    // replaceChildren нет в Safari до 14; app.Utils не берём — модуль грузит и стенд markup/golems
    function clear(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    function rewardLine(reward, large) {
        const line = element('div', 'gr-rewards' + (large ? ' gr-rewards-large' : ''));
        Object.keys(RESOURCE_CLASSES).forEach(key => {
            if (!reward[key]) return;
            const item = element('span', 'gr-resource');
            item.setAttribute('aria-label', reward[key] + ' ' + RESOURCE_NAMES[key]);
            item.title = RESOURCE_NAMES[key];
            const icon = element('span', 'res_icon res_icon_inline ' + RESOURCE_CLASSES[key]);
            icon.setAttribute('aria-hidden', 'true');
            item.appendChild(icon);
            item.appendChild(element('b', '', reward[key].toLocaleString('ru-RU')));
            line.appendChild(item);
        });
        return line;
    }

    function createVictoryPanel(options) {
        const root = element('section', 'gr-panel list_s');
        root.style.left = '30px';
        root.style.top = options.top + 'px';
        root.setAttribute('aria-label', 'Гарантированные награды за участие');
        function update(virus) {
            clear(root);
            const data = personalProgress(virus);
            root.hidden = !data;
            if (!data) return;
            const header = element('div', 'gr-panel-heading');
            header.appendChild(element('b', 'major', 'Награда за участие'));
            const all = element('a', 'gr-all', 'Все ступени ›');
            all.href = '#';
            all.onclick = event => { event.preventDefault(); options.onOpenRewards(); };
            header.appendChild(all);
            root.appendChild(header);
            const earned = element('div', 'gr-earned');
            earned.appendChild(element('span', data.reached >= 0 ? 'r_green' : 'minor', data.reached >= 0 ? '✓ Уже заработано' : 'Первая награда впереди'));
            if (data.reached >= 0) earned.appendChild(rewardLine(data.tiers[data.reached].reward));
            root.appendChild(earned);
            root.appendChild(element('div', 'gr-finished', data.reached >= 0 ? (data.sent ? 'Награда отправлена на почту' : 'После подведения итогов придёт на почту') : 'Для личной награды не хватило энергии'));
            root.appendChild(element('div', 'gr-note', 'Награда за место учитывается отдельно.'));
        }
        update(options.virus);
        return {el: root, update: update};
    }

    function createLadder(virus) {
        const data = personalProgress(virus);
        const root = element('section', 'gr-ladder');
        if (!data) return root;
        root.appendChild(element('div', 'gr-ladder-intro', 'Твой вклад: ' + data.spent + ' энергии'));
        root.appendChild(element('div', 'gr-ladder-subtitle', 'Награда за участие не зависит от места в рейтинге'));
        data.tiers.forEach((tier, i) => {
            const row = element('div', 'gr-tier' + (i === data.reached ? ' gr-tier-current' : i === data.next ? ' gr-tier-next' : ''));
            const label = element('div', 'gr-tier-label');
            label.appendChild(element('b', i <= data.reached ? 'r_green' : 'major', tier.energy + ' энергии'));
            label.appendChild(element('span', 'gr-tier-status', i === data.reached ? '✓ Заработано' : i < data.reached ? 'Пройдено' : i === data.next ? 'Следующая ступень' : 'За личный вклад'));
            row.appendChild(label);
            row.appendChild(rewardLine(tier.reward, true));
            root.appendChild(row);
        });
        root.appendChild(element('p', 'gr-ladder-rule', 'Получишь итоговый пакет одной достигнутой ступени. Награды ступеней не складываются.'));
        root.appendChild(element('p', 'gr-ladder-rule', 'Пакет придёт на почту после победы над големом. Награда за место добавится отдельно.'));
        return root;
    }

    // по образцу карточки сезона лиги (league_season_*)
    function createProgressAndRatingCard(options) {
        const root = element('section', 'gr-combined list_s');
        root.setAttribute('aria-label', 'Прогресс участия и место в рейтинге');
        const meta = element('div', 'gr-combined-meta');
        const stage = element('span', 'gr-combined-stage');
        const place = element('span', 'gr-combined-place', 'Место по урону: ');
        const placeValue = element('b');
        place.appendChild(placeValue);
        meta.appendChild(stage);
        meta.appendChild(place);
        root.appendChild(meta);
        const track = element('div', 'league_season_progress_bar gr-combined-track');
        track.setAttribute('role', 'progressbar');
        track.setAttribute('aria-label', 'Энергия до следующей личной награды');
        track.setAttribute('aria-valuemin', '0');
        const fill = element('div', 'league_season_progress_live_fill');
        const progressValue = element('b', 'league_season_progress_value');
        track.appendChild(fill);
        track.appendChild(progressValue);
        root.appendChild(track);
        const note = element('div', 'gr-combined-note');
        root.appendChild(note);
        const actions = element('div', 'gr-combined-actions league_season_actions');
        [['Рейтинг', 'rating', options.onRating], ['Награды', 'rewards', options.onOpenRewards]].forEach(([title, type, handler]) => {
            const button = element('a', 'league_season_action league_season_action_' + type, title);
            button.href = '#';
            button.onclick = event => { event.preventDefault(); handler(); };
            actions.appendChild(button);
        });
        root.appendChild(actions);
        function updateRating(virus) {
            const place = virus && virus.e && virus.e.rating && virus.e.rating.p;
            placeValue.textContent = place > 0 ? String(place) : '—';
        }
        function update(virus) {
            const data = personalProgress(virus);
            root.hidden = !data;
            if (!data) return;
            const target = data.tiers[data.next >= 0 ? data.next : data.tiers.length - 1].energy;
            stage.textContent = 'Ступень ' + (data.next >= 0 ? data.next + 1 : data.tiers.length) + ' из ' + data.tiers.length;
            track.setAttribute('aria-valuemax', String(target));
            track.setAttribute('aria-valuenow', String(Math.min(data.spent, target)));
            fill.style.width = Math.min(100, data.spent / target * 100) + '%';
            progressValue.textContent = Math.min(data.spent, target) + ' / ' + target;
            note.textContent = data.next >= 0 ? (data.reached < 0 ? 'До награды — ' : 'До следующей награды — ') + (target - data.spent) + ' энергии' : 'Все личные ступени пройдены';
            updateRating(virus);
        }
        update(options.virus);
        return {el: root, update: update, updateRating: updateRating};
    }

    function createBattleControls(options) {
        const root = element('section', 'gr-controls');
        root.style.left = '30px';
        root.style.top = '410px';
        root.setAttribute('aria-label', 'Награды, усиление и рейтинг');
        const personal = personalProgress(options.virus) ? createProgressAndRatingCard(options) : null;

        function row(title, buttonText, onClick) {
            if (root.children.length) root.appendChild(element('div', 'gr-controls-divider'));
            const section = element('div', 'gr-control-row');
            const textBlock = element('div', 'gr-control-copy');
            const heading = element('div', 'gr-control-heading');
            const value = element('b', 'gr-control-value');
            heading.appendChild(element('span', '', title));
            heading.appendChild(value);
            const detail = element('div', 'gr-control-detail');
            textBlock.appendChild(heading);
            textBlock.appendChild(detail);
            section.appendChild(textBlock);
            const button = element('a', 'btn_g btn_gs gr-control-action', buttonText);
            button.href = '#';
            button.onclick = event => { event.preventDefault(); onClick(); };
            section.appendChild(button);
            root.appendChild(section);
            return {el: section, value: value, detail: detail, button: button};
        }

        let busy = false, maxed = false;
        const crit = row('Шанс крита', 'Усилить', () => { if (!busy && !maxed) options.onCrit(); });
        crit.el.classList.add('gr-crit-card');
        crit.button.className = 'gr-control-action gr-themed-action';
        if (personal) root.appendChild(personal.el);
        const placeRow = personal ? null : row('Место в рейтинге', 'Рейтинг', options.onRating);
        if (placeRow) placeRow.detail.textContent = 'В твоей группе уровней';

        function updateCrit(virus) {
            const chance = virus.e.crit;
            maxed = chance >= virus.crit.max;
            crit.value.textContent = chance.toLocaleString('ru-RU') + '%';
            crit.detail.textContent = maxed ? 'Максимум до конца боя' : '+' + virus.crit.step.toLocaleString('ru-RU') + '% до конца боя';
            clear(crit.button);
            crit.button.appendChild(element('span', '', maxed ? 'Максимум' : 'Усилить'));
            if (!maxed) {
                const price = element('span', 'gr-control-cost');
                price.appendChild(element('span', 'res_icon res_icon_inline res_gem'));
                price.appendChild(document.createTextNode(virus.crit.price.v));
                crit.button.appendChild(price);
            }
            crit.button.classList.toggle('gr-action-max', maxed);
            crit.button.setAttribute('aria-disabled', String(maxed || busy));
            crit.button.tabIndex = maxed ? -1 : 0;
        }
        function updateRating(virus) {
            if (personal) personal.updateRating(virus);
            else placeRow.value.textContent = virus.e.rating.p > 0 ? String(virus.e.rating.p) : '—';
        }
        function setBusy(value) {
            busy = value;
            crit.button.classList.toggle('bw', busy);
            crit.button.setAttribute('aria-disabled', String(maxed || busy));
        }
        updateCrit(options.virus);
        updateRating(options.virus);
        return {el: root, personal: personal, updateCrit: updateCrit, updateRating: updateRating, setBusy: setBusy};
    }

    return {personalProgress: personalProgress, createVictoryPanel: createVictoryPanel, createLadder: createLadder, createBattleControls: createBattleControls, PROGRESS_CARD_RESERVE: PROGRESS_CARD_RESERVE};
})();
