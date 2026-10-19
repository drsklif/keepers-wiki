/**
 * Награды сезона Лиги Доблести: карточка игрока на главной лиги, экран наград и оффер пропуска.
 * Вёрстка — markup/battle_pvp/league-main.html и league-season-rewards.html.
 * Пороги и награды — cfgLeagues.list[].seasonRewards, прогресс недели — user.league.season.
 */
app.LeagueSeason = (function () {

    const PASS_OFFER_TYPE = 'offer_league_pass';

    // шкала экрана наград: центры рубежей и края заливки в px от верха .league_season_scale
    const FIRST_MILESTONE_Y = 88;
    const MILESTONE_STEP_Y = 80;
    const GAUGE_FILL_TOP_Y = 28;
    const GAUGE_FILL_BOTTOM_Y = 848;
    // метки «Сейчас» и «Рекорд»: высота .league_season_marker и наименьший зазор между ними
    const MARKER_HEIGHT = 34;
    const MIN_MARKERS_GAP = 5;

    /** Ключ ресурса в конфиге → иконка спрайта и подпись. */
    const RESOURCE_VIEWS = {
        gold: {icon: 'gold', title: 'Золото'},
        dust: {icon: 'rune_dust', title: 'Рунная пыль'},
        sd: {icon: 'stone_dust', title: 'Каменная пыль'},
        gems: {icon: 'gems', title: 'Кристаллы'},
        card: {icon: 'cards', title: 'Фрагменты карты'},
        cards: {icon: 'cards', title: 'Фрагменты случайной карты'},
    };

    // высота карточки игрока задана, а не измерена: LeaguePage раскладывает гонку под ней в onShow, пока попап скрыт
    const PLAYER_CARD_HEIGHT = 198;
    const PLAYER_CARD_HEIGHT_WITHOUT_SEASON = 121;

    let rewardsPopup;
    let passOfferPopup;

    function milestonesOf(league) {
        const cfgLeague = app.CFGUtil.getLeagueByID(league.l);
        return league.season && cfgLeague && cfgLeague.seasonRewards ? cfgLeague.seasonRewards : null;
    }

    /** Награда конфига — один ресурс: {gold: 25000} | {card: {id, count}} | {cards: {q, count}}. */
    function rewardView(reward) {
        const configKey = Object.keys(reward)[0];
        const value = reward[configKey];
        const view = Object.assign({amount: typeof value === 'number' ? value : value.count}, RESOURCE_VIEWS[configKey]);
        if (configKey === 'card') {
            view.title = 'Фрагменты карты «{0}»'.format(app.CFGUtil.getCardByID(value.id).name);
        }
        return view;
    }

    function isReached(milestone, season) {
        return season.vh >= milestone.valor;
    }

    function isClaimed(milestoneNumber, track, season) {
        return (track === 'FREE' ? season.sfc : season.spc).includes(milestoneNumber);
    }

    /** Открытые и не забранные; pass — только с пропуском. Тот же отбор делает сервер. */
    function claimableRewards(league) {
        const season = league.season;
        const result = [];
        (milestonesOf(league) || []).forEach((milestone, i) => {
            if (!isReached(milestone, season)) return;
            if (!isClaimed(i + 1, 'FREE', season)) result.push(milestone.free);
            if (season.sp && !isClaimed(i + 1, 'PASS', season)) result.push(milestone.pass);
        });
        return result;
    }

    /** Суммы по иконке: на сводке фрагменты разных карт складываются в одну строку. */
    function sumByIcon(rewards) {
        const sums = new Map();
        rewards.map(rewardView).forEach(view => {
            const sum = sums.get(view.icon) || Object.assign({}, view, {amount: 0});
            sum.amount += view.amount;
            sums.set(view.icon, sum);
        });
        return [...sums.values()];
    }

    /**
     * Высота заливки шкалы: линейно между соседними рубежами, ноль доблести — верх шкалы.
     * Выше последнего рубежа — с шагом последнего отрезка, до низа шкалы.
     */
    function valorToY(valor, milestones) {
        let prevValor = 0, prevY = GAUGE_FILL_TOP_Y, y = GAUGE_FILL_TOP_Y;
        for (let i = 0; i < milestones.length; i++) {
            y = FIRST_MILESTONE_Y + i * MILESTONE_STEP_Y;
            if (valor <= milestones[i].valor || i === milestones.length - 1) {
                return Math.min(GAUGE_FILL_BOTTOM_Y,
                    prevY + (y - prevY) * (valor - prevValor) / (milestones[i].valor - prevValor));
            }
            prevValor = milestones[i].valor;
            prevY = y;
        }
        return y;
    }

    function iconHTML(view) {
        return `<span class="league_season_icon league_season_icon_${view.icon}" title="${view.title}"></span>`;
    }

    //
    // ГЛАВНАЯ ЛИГИ
    //

    /** Карточка игрока; без наград сезона у дивизиона — без прогресса и кнопки «Награды». */
    function createPlayerCard() {
        const els = {};
        els.main = app.Utils.createDIV({class: 'list_s league_season_player'});
        els.main.innerHTML = `
            <div class="league_season_player_top">
                <div class="league_season_player_avatar"></div>
                <div>
                    <div class="league_season_player_name"></div>
                    <div class="league_season_player_stats">
                        <span>Доблесть сезона:<span class="league_rating_icon res_icon_inline" style="transform: scale(.45); margin-left: -10px; margin-right: -10px;"></span><strong data-valor></strong></span>
                        <span data-winrate>Процент побед: <strong data-winrate-value></strong></span>
                    </div>
                </div>
            </div>
            <div class="league_season_progress">
                <div class="league_season_progress_body">
                    <div class="league_season_progress_bar">
                        <i class="league_season_progress_record_fill"></i>
                        <i class="league_season_progress_live_fill"></i>
                        <b class="league_season_progress_value"></b>
                    </div>
                    <div class="league_season_progress_milestone">Получай доблесть, чтобы забрать награду</div>
                </div>
                <div class="league_season_next_reward"></div>
            </div>
            <div class="league_season_actions">
                <div class="league_season_action league_season_action_rating">Рейтинг</div>
                <div class="league_season_action league_season_action_rewards">Награды</div>
            </div>`;

        const inCard = selector => els.main.querySelector(selector);
        const avatar = app.Utils.createAvatarComponent(app.Model.user.rank, app.Model.user.avatar.img);
        inCard('.league_season_player_avatar').appendChild(avatar.els.main);
        inCard('.league_season_player_name').innerText = app.UserUtil.getUserNameUpper0(app.Model.user.name);
        inCard('[data-winrate]').onclick = () => app.Utils.showInfo('Процент побед за последние 30 боев', {type: 0});
        inCard('.league_season_action_rating').onclick = () => app.RatingsPage.create(3);
        inCard('.league_season_action_rewards').onclick = showRewards;

        els.height = () => milestonesOf(app.Model.user.league) ? PLAYER_CARD_HEIGHT : PLAYER_CARD_HEIGHT_WITHOUT_SEASON;

        els.update = () => {
            const league = app.Model.user.league;
            els.main.style.height = els.height() + 'px';
            inCard('[data-valor]').innerText = app.Utils.toMoney(league.r);
            inCard('[data-winrate-value]').innerText = app.UserUtil.getLeagueLast100bwr(league) + '%';

            const milestones = milestonesOf(league);
            inCard('.league_season_progress').style.display = milestones ? '' : 'none';
            inCard('.league_season_action_rewards').style.display = milestones ? '' : 'none';
            if (!milestones) return;

            const season = league.season;
            const reachedCount = milestones.filter(milestone => isReached(milestone, season)).length;
            const next = milestones[reachedCount];
            const recordFill = next ? Math.min(100, season.vh / next.valor * 100) : 100;
            const liveFill = next ? Math.min(100, league.r / next.valor * 100) : 100;
            inCard('.league_season_progress_record_fill').style.width = recordFill + '%';
            inCard('.league_season_progress_live_fill').style.width = liveFill + '%';
            inCard('.league_season_progress_value').innerText = next
                ? '{0} / {1}'.format(app.Utils.toMoney(league.r), app.Utils.toMoney(next.valor))
                : app.Utils.toMoney(league.r);

            inCard('.league_season_progress').classList.toggle('league_season_progress_complete', !next);
            const nextReward = inCard('.league_season_next_reward');
            if (next) {
                // с пропуском — free и pass одной суммой; разные ресурсы не складываются, тогда показан free
                const view = sumByIcon(season.sp ? [next.free, next.pass] : [next.free])[0];
                nextReward.innerHTML = iconHTML(view) + '<b>{0}</b>'.format(app.Utils.toMoney1(view.amount));
            } else {
                nextReward.innerHTML = '';
            }

            const claimableCount = claimableRewards(league).length;
            inCard('.league_season_action_rewards').innerHTML = claimableCount
                ? 'Награды<span class="league_season_badge">{0}</span>'.format(claimableCount)
                : 'Награды';
        };
        els.update();

        return els;
    }

    //
    // ЭКРАН НАГРАД
    //

    function showRewards() {
        if (rewardsPopup) return;
        const league = app.Model.user.league;
        if (!milestonesOf(league)) return;

        const p = rewardsPopup = app.Popups.createPopup1({
            id: 'LEAGUE_SEASON',
            display: {gold: 1, gems: 1},
            header: {value: app.CFGUtil.getLeagueByID(league.l).name},
            onUpdate() {
                if (p.tmp.renderedLeague === app.Model.user.league) return;
                if (!milestonesOf(app.Model.user.league)) {
                    app.Popups.removePopup(p);
                    return;
                }
                renderRewards(p);
                fitPopupToContent(p);
            },
            onShow() {
                fitPopupToContent(p);
            },
            onClose() {
                p.tmp.closed = true;
                rewardsPopup = undefined;
            }
        });
        p.tmp = {};
        p.els.brd_bg.className = 'brd_block_bg_pvp';

        renderRewards(p);
        app.Popups.add(p);

        const updateTimer = () => {
            if (p.tmp.closed) return;
            const timer = p.scroll.el.querySelector('.league_season_stats_timer');
            if (timer) timer.innerText = seasonTimeLeftText();
            TweenMax.delayedCall(1, updateTimer);
        };
        updateTimer();
    }

    function seasonTimeLeftText() {
        const timeLeft = app.Model.user.league.season.et - app.TimeUtil.now();
        return timeLeft > 0 ? app.TimeUtil.formatToHumanTime(timeLeft, 2) : '...';
    }

    function renderRewards(p) {
        const league = p.tmp.renderedLeague = app.Model.user.league;
        // дивизион меняется при открытом окне: выход из отборочной
        p.els.header.innerText = app.CFGUtil.getLeagueByID(league.l).name;
        const season = league.season;
        const milestones = milestonesOf(league);

        const rows = milestones.map((milestone, i) => {
            const number = i + 1;
            const reached = isReached(milestone, season);
            return `
                <div class="league_season_milestone${reached ? ' league_season_milestone_reached' : ''}" style="top: ${FIRST_MILESTONE_Y + i * MILESTONE_STEP_Y}px">
                    ${rewardCardHTML(milestone.free, number, 'FREE', reached, season)}
                    <span class="league_season_threshold">${app.Utils.toMoney(milestone.valor)}</span>
                    <span class="league_season_bridge"></span>
                    ${rewardCardHTML(milestone.pass, number, 'PASS', reached, season)}
                </div>`;
        }).join('');

        const liveY = valorToY(league.r, milestones);
        const recordY = valorToY(season.vh, milestones);
        // рекорд — только если его метка не налезает на «Сейчас»
        const recordMarkerFits = recordY - liveY >= MARKER_HEIGHT + MIN_MARKERS_GAP;
        const markers = (recordMarkerFits ? markerHTML('Рекорд', season.vh, recordY, true) : '')
            + markerHTML('Сейчас', league.r, liveY, false);

        const claimable = sumByIcon(claimableRewards(league));
        const passRewardsReached = sumByIcon(milestones
            .filter(milestone => isReached(milestone, season))
            .map(milestone => milestone.pass));

        const content = app.Utils.createDIV({class: 'league_season_content'});
        content.innerHTML = `
            <div class="league_season_stats">
                <div>Сейчас<strong>${app.Utils.toMoney(league.r)}</strong></div>
                <div>Рекорд сезона<strong class="league_season_stats_record">${app.Utils.toMoney(season.vh)}</strong></div>
                <div>До конца сезона<strong class="league_season_stats_timer">${seasonTimeLeftText()}</strong></div>
            </div>
            <div class="league_season_intro">Набирай доблесть — открывай награды</div>
            <div class="league_season_track_headings">
                <div class="league_season_track_heading">Награды сезона</div>
                <div class="league_season_track_heading league_season_track_heading_pass" data-pass-offer><span class="league_season_pass_crown"></span><span>${season.sp ? 'Пропуск активен' : 'Награды пропуска'}</span></div>
            </div>
            <div class="league_season_scale">
                <div class="league_season_gauge">
                    <div class="league_season_gauge_record_fill" style="height: ${recordY - GAUGE_FILL_TOP_Y}px"></div>
                    <div class="league_season_gauge_live_fill" style="height: ${liveY - GAUGE_FILL_TOP_Y}px"></div>
                    <span class="league_season_gauge_cap"></span>
                </div>
                ${rows}
                ${markers}
            </div>
            <div class="league_season_summary_panels${season.sp ? ' league_season_summary_panels_single' : ''}">
                <div class="league_season_summary_panel">
                    <div class="league_season_summary_title">Можно забрать сейчас</div>
                    ${summaryItemsHTML(claimable, isReached(milestones[0], season) ? 'Всё получено' : 'Набери доблесть до первого рубежа')}
                    ${claimable.length ? '<div class="league_season_claim_button league_season_summary_action" data-claim-all>Забрать все</div>' : ''}
                </div>
                ${season.sp ? '' : `<div class="league_season_summary_panel league_season_summary_panel_pass">
                    <div class="league_season_summary_title">Доступно с пропуском</div>
                    ${summaryItemsHTML(passRewardsReached, 'Набери доблесть до первого рубежа')}
                    <div class="league_season_pass_button league_season_summary_action" data-pass-offer>Активировать пропуск</div>
                </div>`}
            </div>
            <div class="league_season_legend">
                <span><i></i>Сейчас</span>
                <span><i class="league_season_legend_record"></i>Максимум сезона</span>
            </div>
            <div class="league_season_note">Достигнутые награды сохраняются после поражений</div>`;

        content.querySelectorAll('[data-claim]').forEach(button => {
            button.onclick = () => claim(button, {cmd: 'LeagueSeasonClaim', milestone: +button.dataset.milestone, track: button.dataset.track});
        });
        const claimAll = content.querySelector('[data-claim-all]');
        if (claimAll) claimAll.onclick = () => claim(claimAll, {cmd: 'LeagueSeasonClaimAll'});
        if (!season.sp) {
            content.querySelectorAll('[data-pass-offer]').forEach(el => el.onclick = showPassOffer);
        }

        app.Utils.removeAllChild(p.scroll.el);
        p.scroll.el.appendChild(content);
    }

    function rewardCardHTML(reward, milestoneNumber, track, reached, season) {
        const view = rewardView(reward);
        const head = iconHTML(view) + `<b class="league_season_reward_amount">${app.Utils.toMoney1(view.amount)}</b>`;
        const passClass = track === 'PASS' ? ' league_season_reward_pass' : '';

        if (track === 'PASS' && !season.sp) {
            return `<div class="league_season_reward${passClass} league_season_reward_offer" data-pass-offer>${head}<span class="league_season_pass_lock"></span></div>`;
        }
        if (isClaimed(milestoneNumber, track, season)) {
            return `<div class="league_season_reward${passClass} league_season_reward_claimed">${head}<span class="league_season_reward_state">✓ Получено</span></div>`;
        }
        if (reached) {
            return `<div class="league_season_reward${passClass} league_season_reward_claimable">${head}`
                + `<div class="league_season_claim_button" data-claim data-milestone="${milestoneNumber}" data-track="${track}">Забрать</div></div>`;
        }
        return `<div class="league_season_reward${passClass} league_season_reward_locked">${head}<span class="league_season_reward_state">Не достигнуто</span></div>`;
    }

    function markerHTML(label, valor, y, isRecord) {
        return `<div class="league_season_marker${isRecord ? ' league_season_marker_record' : ''}" style="top: ${y}px"><small>${label}</small><b>${app.Utils.toMoney(valor)}</b></div>`;
    }

    function summaryItemsHTML(sums, emptyText) {
        if (!sums.length) {
            return `<div class="league_season_summary_items"><span class="league_season_summary_empty">${emptyText}</span></div>`;
        }
        return '<div class="league_season_summary_items">'
            + sums.map(sum => `<div class="league_season_summary_item">${iconHTML(sum)}<b>${app.Utils.toMoney1(sum.amount)}</b></div>`).join('')
            + '</div>';
    }

    /** Ответ — в форме сундука лиги; отказ приносит актуальный user.league, и экран перерисуется по нему. */
    function claim(button, command) {
        if (app.Utils.hasClass(button, 'bw')) return;
        app.Utils.addClass(button, 'bw');
        app.Network.command(command, data => {
            app.Utils.removeClass(button, 'bw');
            if (data.error) {
                refreshLeaguePopups();
                app.Utils.showInfo('Награда уже недоступна');
                return;
            }
            refreshLeaguePopups();
            app.UserUtil.processChestDrop(data.drop);
            app.EventDispatcher.dispatchEvent('show chest drop', {drop: data.drop});
            app.EventDispatcher.dispatchEvent('user resources changed');
        });
    }

    /** Ответ команды обновляет модель, но onUpdate попапов зовёт только серверный UPDATE и только у верхнего. */
    function refreshLeaguePopups() {
        ['LEAGUE', 'LEAGUE_SEASON'].forEach(id => {
            const p = app.Popups.getByID(id);
            if (p) p.cfg.onUpdate();
        });
    }

    function fitPopupToContent(p) {
        TweenMax.delayedCall(0.001, () => {
            const contentRequiredHeight = p.scroll.el.firstChild.offsetHeight;
            // скрыт попапом сверху (дроп): высота 0, перемерит onShow
            if (!contentRequiredHeight) return;
            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
            const availableHeight = Math.min(contentRequiredHeight + 10, availableHeight0);

            p.els.brd.style.top = Math.max(80, (availableHeight0 - availableHeight) / 2) + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';
            p.els.wrap.style.top = '10px';
            p.els.wrap.style.height = availableHeight - 10 + 'px';

            p.scroll.top = 0;
            p.scroll.availableHeight = availableHeight - 10;
            p.scroll.topMax = contentRequiredHeight > p.scroll.availableHeight ? contentRequiredHeight - p.scroll.availableHeight : 0;
        });
    }

    //
    // ОФФЕР ПРОПУСКА
    //

    function showPassOffer() {
        if (passOfferPopup) return;

        const p = passOfferPopup = app.Popups.createPopup1({
            header: {value: 'Сезонный пропуск'},
            onUpdate() {
                // пропуск зачислен — покупать нечего
                if (app.Model.user.league.season && app.Model.user.league.season.sp) {
                    app.Popups.removePopup(p);
                    refreshLeaguePopups();
                }
            },
            onClose() {
                p.tmp.closed = true;
                passOfferPopup = undefined;
            }
        });
        p.tmp = {};
        p.els.brd_bg.className = 'brd_block_bg_pvp';

        const content = app.Utils.createDIV({class: 'league_season_offer mlra_ab'});
        content.innerHTML = `
            <div class="league_season_offer_resources">
                ${['gems', 'rune_dust', 'stone_dust', 'cards', 'gold'].map(icon => `<span class="league_season_icon league_season_icon_${icon}"></span>`).join('')}
            </div>
            <p>Открой дополнительную линейку наград за доблесть в этом сезоне.</p>
            <p>Награды уже достигнутых рубежей будут доступны сразу после активации.</p>
            <div class="league_season_pass_button" data-buy>...</div>
            <div class="league_season_offer_note">Пропуск действует до конца текущего сезона.</div>`;
        p.scroll.el.appendChild(content);

        app.Network.command({cmd: 'LeagueSeasonOffer'}, data => {
            if (p.tmp.closed) return;
            const offer = data[PASS_OFFER_TYPE];
            const buy = content.querySelector('[data-buy]');
            if (!offer) {
                buy.innerText = app.Model.user.league.season.sp ? 'Пропуск активен' : 'Пропуск недоступен на этой платформе';
                return;
            }
            const price = formatOfferPrice(offer);
            if (!price) return;
            buy.innerText = 'Активировать пропуск · ' + price;
            // пропуск мог зачислиться, пока сверху был другой попап: повторная оплата не вернётся
            app.Purchase.addOfferOnClick(buy, {offer, actionBefore: () => !app.Model.user.league.season.sp});
        });

        app.Popups.add(p);
        fitPopupToContent(p);
    }

    /** Как в BattlePath.createGoldTicketPopup. @return undefined, если Google не знает sku. */
    function formatOfferPrice(offer) {
        if (app.UserUtil.isGoogle()) {
            const skuDetails = JSON.parse(google.getSkuDetails(offer.sku));
            if (skuDetails.error) {
                console.log('skuDetails for ' + offer.sku + ' not found');
                return undefined;
            }
            return skuDetails.price.v / 1000000 + ' ' + skuDetails.price.c;
        }
        let price = app.Utils.toMoney(offer.p);
        if (app.UserUtil.isVK()) {
            price += ' ' + app.Utils.getGramString(offer.p, 'голос', 'голоса', 'голосов');
        } else if (app.UserUtil.isOK() && !app.UserUtil._isInIDsForXsolla()) {
            price += ' OK';
        } else if (app.UserUtil.isFS()) {
            price += ' ФМ';
        } else if (app.UserUtil.isGamepad()) {
            price += ' GP';
        } else if (app.UserUtil.isMMR()) {
            price += ' ' + app.Utils.getGramString(offer.p, 'мэйлик', 'мэйлика', 'мэйликов');
        } else if (app.UserUtil.isRBK()) {
            price += ' RBK';
        } else if (app.UserUtil.isPlaydeck()) {
            price += ' STARS';
        } else {
            price += ' ₽';
        }
        return price;
    }

    return {
        createPlayerCard: createPlayerCard,
    };
})();
