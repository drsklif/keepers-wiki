app.Virus = (function() {

    // подсказка «Нажимай на Рунника» — первые HINT_HITS ударов каждой битвы (r); переоткрытие окна счёт не сбрасывает
    const HINT_HITS = 5;
    const hint = {run: 0, hits: 0};
    // винительный падеж для подсказки «Нажимай на …»
    const GOLEM_ACC = {runic: 'Рунника', stone: 'Кременца'};

    function create() {
        app.loadJS1('GolemArt', function() {
            app.loadJS1('GolemRewards', createPopup);
        });
    }

    function createPopup() {
        const virus = app.Model.user.virus;
        // бой сняли, пока грузился модуль
        if (!virus) return;
        const run = virus.r;
        let p = app.Popups.createPopup1({
            header: {value: app.GolemArt.nameOf(virus.k)},
            display: {energy: 1, gems: 1},
            onUpdate: function() {
                if (p.tmp.virus === app.Model.user.virus) return;
                p.tmp.virus = app.Model.user.virus;
                if (p.tmp.personalPanel) p.tmp.personalPanel.update(p.tmp.virus);
                // запущен новый бой — арт и заголовок попапа от прошлого
                if (p.tmp.virus && p.tmp.virus.r !== run) {
                    app.Popups.removePopup(p);
                    return;
                }
                if (p.tmp.updateVirusHealth) {
                    p.tmp.updateVirusHealth();
                    // голема добили другие
                    if (p.tmp.virus && p.tmp.virus.h <= 0) finishBattle(p);
                }
            },
            onClose: function() {
                p.tmp._closed = 1;
                if (p.tmp.golemArt) p.tmp.golemArt.destroy();
                app.Network.command({cmd: 'VirusOut'});
            }
        });

        p.tmp = {};

        p.els.brd_bg.className = 'brd_block_bg_golem_' + app.GolemArt.kindOf(virus.k);

        let contentRequiredHeight = 600 + (app.GolemRewards.personalProgress(virus) ? app.GolemRewards.PROGRESS_CARD_RESERVE : 0);
        let availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
        let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
        let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

        p.els.brd.style.top = top + 'px';
        p.els.brd_r.style.height = availableHeight + 'px';

        p.els.wrap.style.height = availableHeight + 'px';

        p.scroll.top = 0;
        p.scroll.topMax = availableHeight < contentRequiredHeight ? contentRequiredHeight - availableHeight : 0;
        p.scroll.availableHeight = availableHeight;
        p.scroll.el.style.top = p.scroll.top + 'px';

        p.els.brd_r.appendChild(createHelp());

        app.Popups.add(p);

        app.Network.command({cmd: 'VirusIn'}, function(data) {
            if (p.tmp._closed) return;
            if (data.error) {
                app.Utils.showInfo('Попробуйте позже');
            } else {
                p.tmp.virus = app.Model.user.virus;
                // бой закрыт, пока попап открывался: сервер прислал UNSET
                if (!p.tmp.virus) {
                    app.Popups.removePopup(p);
                    return;
                }
                if (p.tmp.virus.h > 0) {
                    state_battle(p);
                } else {
                    state_dead(p);
                }
            }
        });
    }

    function state_battle(p) {
        fitPopupHeight(p, 600 + (app.GolemRewards.personalProgress(p.tmp.virus) ? app.GolemRewards.PROGRESS_CARD_RESERVE : 0));
        let tl_energy, el_hint;

        const art = p.tmp.golemArt = app.GolemArt.create({kind: p.tmp.virus.k});
        art.el.style.position = 'absolute';
        art.el.style.left = '119px';
        art.el.style.top = '40px';
        art.el.style.cursor = 'pointer';
        art.el.onclick = function() {
            if (p.tmp.defeated) return;
            app.Network.command({cmd: 'VirusClick'}, function(data) {
                if (p.tmp._closed) return;
                app.SoundManager.playClick();
                p.tmp.virus = app.Model.user.virus;
                if (p.tmp.personalPanel) p.tmp.personalPanel.update(p.tmp.virus);
                if (data.error) {
                    switch (data.error.code) {
                        case 1:
                            app.Utils.showInfo('Недостаточно энергии');
                            break;
                        default:
                            app.Utils.showInfo('Попробуйте позже');
                            break;
                    }
                    if (p.tmp.virus.h <= 0) {
                        finishBattle(p);
                    }
                } else {
                    if (p.tmp.virus.h <= 0) {
                        finishBattle(p);
                    } else {
                        if (data.card) {
                            if (++hint.hits === HINT_HITS && el_hint) {
                                TweenMax.to(el_hint, 0.5, {opacity: 0, onComplete: () => el_hint.remove()});
                            }
                            {
                                let els_res = app.MainPage.getCFG().resources.energy.els;
                                app.UserUtil.pay({t: 2, v: 1});
                                els_res.value.innerHTML = app.Model.user.energy.v;
                                tl_energy = new TimelineMax({
                                    onComplete: function () {
                                        els_res.main.style.left = '0px';
                                        els_res.main.style.top = '0px';
                                    }
                                });
                                tl_energy.to(els_res.main, 0.1, {left: '-=1', top: '-=1'});
                                tl_energy.to(els_res.main, 0.1, {left: '+=1', top: '+=1'});
                            }

                            let dmg = data.dmg;
                            let isCrit = data.crit;

                            let sides = [1, 2];
                            let side = sides[app.Utils.randomInt(0, sides.length - 1)];

                            let el_dmg;

                            if (side === 1) {
                                el_dmg = app.Utils.createDIV({class: 'team_item_damage', style: 'top: 80px; opacity: 1; left: 90px; pointer-events: none;'});
                                el_dmg.appendChild(app.Utils.createDIV({class: 'heal_digit damage_digit_minus'}));
                                dmg = '' + dmg;
                                for (let i = 0; i < dmg.length; i++) {
                                    let clazz = 'damage_digit damage_digit_' + dmg[i];
                                    el_dmg.appendChild(app.Utils.createDIV({class: clazz, style: 'left: ' + (16 + 16 * i) + 'px'}));
                                }
                                let width = 16 + 16 * dmg.length;
                                el_dmg.style.left = (170 - width / 2) + 'px';
                            } else if (side === 2) {
                                el_dmg = app.Utils.createDIV({class: 'team_item_damage', style: 'top: 80px; opacity: 1; left: 280px; pointer-events: none;'});
                                el_dmg.appendChild(app.Utils.createDIV({class: 'heal_digit damage_digit_minus'}));
                                dmg = '' + dmg;
                                for (let i = 0; i < dmg.length; i++) {
                                    let clazz = 'damage_digit damage_digit_' + dmg[i];
                                    el_dmg.appendChild(app.Utils.createDIV({class: clazz, style: 'left: ' + (16 + 16 * i) + 'px'}));
                                }
                                let width = 16 + 16 * dmg.length;
                                el_dmg.style.left = (270 - width / 2) + 'px';
                            }
                            p.scroll.el.appendChild(el_dmg);

                            let tl = new TimelineMax({
                                onComplete: function () {
                                    if (el_dmg.parentNode) p.scroll.el.removeChild(el_dmg);
                                }
                            });
                            if (isCrit) {
                                tl.to(el_dmg, 0.3, {scale: 1.7, ease: Back.easeOut});
                                if (side === 1) {
                                    tl.to(el_dmg, 0.5, {left: 0, top: '+=30'});
                                    tl.to(el_dmg, 0.3, {opacity: 0}, '-=0.2');
                                } else {
                                    tl.to(el_dmg, 0.5, {left: 340, top: '+=30'});
                                    tl.to(el_dmg, 0.3, {opacity: 0}, '-=0.2');
                                }
                            } else {
                                let left0, top0;
                                let left, top, dif;
                                if (side === 1) {
                                    left0 = 0;
                                    top0 = 0;
                                    left = app.Utils.randomInt(10, 30);
                                    top = app.Utils.randomInt(10, 20);
                                    dif = app.Utils.randomInt(10, 30);
                                    tl.to(el_dmg, 0.7, {bezier: [{left: left0 + left + dif, top: top0 + top}, {left: left0 + left, top: top0 + top}], ease: Power1.easeInOut});
                                    tl.to(el_dmg, 0.3, {opacity: 0}, '-=0.2');
                                } else if (side ===  2) {
                                    left0 = 320;
                                    top0 = 0;
                                    left = app.Utils.randomInt(10, 30);
                                    top = app.Utils.randomInt(10, 20);
                                    dif = app.Utils.randomInt(10, 30);
                                    tl.to(el_dmg, 0.7, {bezier: [{left: left0 + left, top: top0 + top}, {left: left0 + left + dif, top: top0 + top}], ease: Power1.easeInOut});
                                    tl.to(el_dmg, 0.3, {opacity: 0}, '-=0.2');
                                }
                            }

                            p.tmp.cards.highlight(data.card);
                            art.hit(Boolean(isCrit));
                        }

                        updateVirusHealth();
                        updateRatingPlace();
                    }

                }

            });
        };
        p.scroll.el.appendChild(art.el);
        // 05.11 десятки игроков жали «Увеличить» вместо удара: что бить надо по самому голему, на экране не было сказано
        if (hint.run !== p.tmp.virus.r) {
            hint.run = p.tmp.virus.r;
            hint.hits = 0;
        }
        if (hint.hits < HINT_HITS) {
            el_hint = app.Utils.createDIV({class: 'battle_advice', style: 'top: 16px; pointer-events: none;',
                html: 'Нажимай на {0}, чтобы ударить: <span class="info">1 удар — 1 энергия</span>'.format(GOLEM_ACC[art.kind])});
            p.scroll.el.appendChild(el_hint);
        }

        let health = p.tmp.virus.h;
        let healthMax = p.tmp.virus.hm;
        let prg = health * 100 / healthMax;

        let el_prg = app.Utils.createDIV({class: 'quest_chest_prg', style: 'left: 115px; top:280px'});
        let el_prg_w = app.Utils.createDIV({class: 'quest_chest_prg_wrp'});
        let el_prg_bg = app.Utils.createDIV({class: 'quest_chest_prg_bg', style: 'width: {0}%'.format(prg)});
        el_prg_w.appendChild(el_prg_bg);
        let el_prg_txt = app.Utils.createDIV({class: 'quest_chest_prg_text', text: '{0} из {1}'.format(app.Utils.toMoney(health), app.Utils.toMoney(healthMax))});
        el_prg_w.appendChild(el_prg_txt);
        el_prg.appendChild(el_prg_w);
        p.scroll.el.appendChild(el_prg);

        let updateVirusHealth = p.tmp.updateVirusHealth = function() {
            TweenMax.killTweensOf(el_prg_bg);

            if (p._closed || !p.tmp.virus) return;

            let old_h = health;
            health = p.tmp.virus.h;

            let prg = health * 100 / healthMax;
            TweenMax.to(el_prg_bg, 0.3, {width: prg + '%'});

            let old = {v: old_h};
            TweenMax.to(old, 0.3, {
                v: health,
                onUpdate: function () {
                    let value = Math.floor(old.v);
                    el_prg_txt.innerText = '{0} из {1}'.format(app.Utils.toMoney(value), app.Utils.toMoney(healthMax));
                },
                onComplete: function() {
                    el_prg_txt.innerText = '{0} из {1}'.format(app.Utils.toMoney(health), app.Utils.toMoney(healthMax));
                }
            });
        };

        p.tmp.cards = {
            list: {},
            highlight: function(cID) {
                let els = this.list[cID];

                els.highlight.style.opacity = 1;

                let animation = function(frame) {
                    els.highlight.style.backgroundPosition = '0 {0}px'.format(frame * -137);
                    if (frame < 5) {
                        TweenMax.delayedCall(0.05, animation.bind(null, frame + 1));
                    } else {
                        TweenMax.delayedCall(0.05, () => {
                            els.highlight.style.opacity = 0;
                        });
                    }
                };

                animation(0);

                // частые удары: относительные -=10/+=10 накладывались и карта уезжала; отменяем прошлую и идём к абсолютным 0 → 10
                TweenMax.killTweensOf(els.main);
                let tl = new TimelineMax();
                tl.to(els.main, 0.1, {top: 0});
                tl.to(els.main, 0.3, {top: 10});
            }
        };
        let el_list = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 25px; top: 320px; width: 415px; padding: 5px; height: 78px;'});
        let el_list_content = app.Utils.createDIV({});
        p.tmp.virus.e.deck.list.forEach((cID, i) => {
            let card = app.UserUtil.wrapCard(cID);
            let els = app.Cards.createCard(card);
            els.level.style.opacity = 0;
            els.main.style.left = (2 + 52 * i) + 'px';
            els.main.style.top = 10 + 'px';
            els.main.style.transform = 'scale(0.37)';
            els.main.appendChild(els.highlight = app.Utils.createDIV({class: 'highlight_card', style: 'opacity: 0'}));
            el_list_content.appendChild(els.main);
            p.tmp.cards.list['' + cID] = els;
        });
        el_list.appendChild(el_list_content);
        p.scroll.el.appendChild(el_list);

        const controls = p.tmp.battleControls = app.GolemRewards.createBattleControls({
            virus: p.tmp.virus,
            onOpenRewards: () => showPersonalRewards(p),
            onCrit: function() {
                controls.setBusy(true);
                app.Network.command({cmd: 'VirusCritInc'}, function(data) {
                    if (p.tmp._closed) return;
                    controls.setBusy(false);
                    if (data.error) {
                        switch (data.error.code) {
                            case 1:
                                app.Utils.showInfo('У тебя уже максимальный крит');
                                break;
                            case 2:
                                app.EventDispatcher.dispatchEvent('not enough resources', {price: {t: 1}});
                                break;
                            default:
                                app.Utils.showInfo('Попробуйте позже');
                                break;
                        }
                    } else {
                        p.tmp.virus = app.Model.user.virus;
                        if (p.tmp.virus.h <= 0) {
                            finishBattle(p);
                        } else {
                            controls.updateCrit(p.tmp.virus);
                        }
                        app.Utils.showInfo('Шанс крита увеличен!', {type: 0});
                    }
                });
            },
            onRating: function() {
                app.Network.command({cmd: 'VirusRating', group: p.tmp.virus.e.group}, function(data) {
                    if (p.tmp._closed) return;
                    if (data.list) rating(p, data);
                    else app.Utils.showInfo('Рейтинг еще не сформирован');
                });
            }
        });
        if (controls.personal) p.tmp.personalPanel = controls.personal;
        p.scroll.el.appendChild(controls.el);
        fitPopupHeight(p, 410 + controls.el.offsetHeight + 24);
        let updateRatingPlace = function() { controls.updateRating(p.tmp.virus); };
    }

    // голем оседает DEFEAT_MS, клики уже не принимаются; потом экран после боя
    function finishBattle(p) {
        if (p.tmp.defeated) return;
        p.tmp.defeated = 1;
        p.tmp.golemArt.defeat();
        TweenMax.delayedCall(app.GolemArt.DEFEAT_MS / 1000, () => {
            if (!p.tmp._closed) state_dead(p);
        });
    }

    function state_dead(p) {
        delete p.tmp.updateVirusHealth;
        delete p.tmp.personalPanel;
        delete p.tmp.battleControls;
        const hasPersonal = Boolean(app.GolemRewards.personalProgress(p.tmp.virus));
        if (hasPersonal) fitPopupHeight(p, 575);

        if (p.tmp.golemArt) p.tmp.golemArt.destroy();
        app.Utils.removeAllChild(p.scroll.el);

        const art = p.tmp.golemArt = app.GolemArt.create({kind: p.tmp.virus.k, dead: true});
        art.el.style.position = 'absolute';
        art.el.style.left = '119px';
        art.el.style.top = (hasPersonal ? 20 : 130) + 'px';
        p.scroll.el.appendChild(art.el);
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: ' + (hasPersonal ? 265 : 400) + 'px', text: art.name + ' повержен!'}));
        if (hasPersonal) {
            p.tmp.personalPanel = app.GolemRewards.createVictoryPanel({virus: p.tmp.virus, top: 300, onOpenRewards: () => showPersonalRewards(p)});
            p.scroll.el.appendChild(p.tmp.personalPanel.el);
        }
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: ' + (hasPersonal ? 475 : 450) + 'px;'}));

        let el_rating = app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: ' + (hasPersonal ? 490 : 465) + 'px'});
        p.scroll.el.appendChild(el_rating);

        let updateRatingPlace = function() {
            let place = p.tmp.virus.e.rating.p;
            el_rating.innerHTML = 'Твое место в рейтинге: <span class="info">{0}</span>'.format(place === -1 ? '?' : place);
        };
        updateRatingPlace();

        p.scroll.el.appendChild(app.Utils.createA({class: 'btn_g', style: 'left: 160px; top: ' + (hasPersonal ? 520 : 490) + 'px; font-size: 12px', html: '<div class="rating_top_p rating_top_p1" style="transform: scale(0.6); transform-origin: center center 0px; position: relative; margin: -17px 0px -16px -8px; display: inline-block;"></div>Рейтинг по урону'}, function() {
            app.Network.command({cmd: 'VirusRating', group: p.tmp.virus.e.group}, function(data) {
                if (p.tmp._closed) return;
                if (data.list) {
                    rating(p, data);
                } else {
                    app.Utils.showInfo('Рейтинг еще не сформирован');
                }
            });
        }));
    }

    function fitPopupHeight(p, required) {
        const available0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
        const available = Math.min(required, available0);
        p.els.brd.style.top = Math.max(80, (available0 - available) / 2) + 'px';
        p.els.brd_r.style.height = available + 'px';
        p.els.wrap.style.height = available + 'px';
        p.scroll.top = 0;
        p.scroll.topMax = Math.max(0, required - available);
        p.scroll.availableHeight = available;
        p.scroll.el.style.top = '0px';
    }

    function showPersonalRewards(parent) {
        if (!app.GolemRewards.personalProgress(parent.tmp.virus)) return;
        const p = app.Popups.createPopup1({header: {value: 'Награды за участие'}});
        p.els.brd_bg.className = 'brd_block_bg_golem_' + app.GolemArt.kindOf(parent.tmp.virus.k);
        const groupLine = app.Utils.createDIV({class: 'battle_advice', style: 'position: relative; width: 420px; padding: 2px 0 6px',
            text: 'Твоя группа: {0} уровней'.format(app.UserUtil.getLevelGroupName(parent.tmp.virus.e.group))});
        p.scroll.el.appendChild(groupLine);
        const content = app.GolemRewards.createLadder(parent.tmp.virus);
        content.style.position = 'relative';
        content.style.width = '420px';
        p.scroll.el.appendChild(content);
        app.Popups.add(p);
        const required = groupLine.offsetHeight + content.offsetHeight;
        const available0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
        const available = Math.min(required + 20, available0);
        p.els.brd.style.top = Math.max(80, (available0 - available) / 2) + 'px';
        p.els.brd_r.style.height = available + 'px';
        p.els.wrap.style.left = '30px';
        p.els.wrap.style.width = '420px';
        p.els.wrap.style.height = available + 'px';
        p.scroll.top = 0;
        p.scroll.topMax = Math.max(0, required - available);
        p.scroll.availableHeight = available;
        p.scroll.el.style.top = '0px';
    }

    function rating(p, data) {
        let p1 = app.Popups.createPopup1({
            onScroll: function (deltaY) {
                let scroll = p1.scroll;
                if (scroll.topMax === 0 || scroll.topMin === 0) return true;
                scroll.top -= deltaY;
                if (scroll.top < 0) {
                    if (scroll.top < scroll.topMin) {
                        scroll.top = scroll.topMin;
                    }
                } else {
                    if (scroll.top > scroll.topMax) {
                        scroll.top = scroll.topMax;
                    }
                }
                scroll.el.style.top = scroll.top + 'px';

                if (scroll.top === scroll.topMin) {
                    el_scroll_sh_bottom.style.opacity = 0;
                } else {
                    el_scroll_sh_bottom.style.opacity = 1;
                }

                return true;
            }
        });

        p1.els.brd_bg.className = 'brd_block_bg_golem_' + app.GolemArt.kindOf(p.tmp.virus.k);
        p1.tmp = {};

        p1.tmp.group = p.tmp.virus.e.group;

        let el_groups_filter;
        p1.els.brd_r.appendChild(el_groups_filter = app.Utils.createA({class: 'btn_d', style: 'left: 30px; top: 5px; transform: scale(0.9)'}, function() {
            p1.tmp.group = app.UserUtil.getNextLevelGroupID(p1.tmp.group);
            updateHeaders();
            clearContent();
            app.Network.command({cmd: 'VirusRating', group: p1.tmp.group}, function(data) {
                if (p.tmp._closed) return;
                if (p1.tmp.group !== data.group) return;
                if (data.list) {
                    createContent(data);
                }
            });
        }));

        let el_header;
        p1.els.brd_r.appendChild(el_header = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px;'}));

        let updateHeaders = function() {
            const groupName = app.UserUtil.getLevelGroupName(p1.tmp.group);
            el_groups_filter.innerText = groupName;
            el_header.innerText = 'Рейтинг {0}'.format(groupName);
        };

        let clearContent = function() {
            let last = p1.els.brd_r.lastChild;
            if (last.className === 'list_s') {
                p1.els.brd_r.removeChild(last);
            }
            app.Utils.removeAllChild(p1.scroll.el);
        };

        let createContent = function(data) {
            if (data.me) {
                let el_list = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 25px; top: 40px; width: 415px; padding: 5px; height: 55px'});
                el_list.appendChild(app.Utils.createDIV({class: 'rating_top_p rating_top_m', html: '<span class="normal" style="font-size: 12px; white-space: nowrap;">Моё место</span><div>{0}</div>'.format(data.me.rating.p)}));

                let avatar = app.Utils.createAvatarComponent(app.Model.user.rank, app.Model.user.avatar.img);
                avatar.els.main.style = 'transform: scale(0.7); left: 80px; top: 5px';
                el_list.appendChild(avatar.els.main);

                let el_name = app.Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 130px; padding-top: 5px'});
                el_name.appendChild(app.Utils.createA({class: 'major str tdn', text: app.UserUtil.getUserNameUpper0(app.Model.user.name)}));
                el_name.appendChild(app.Utils.createDIV({class: 'clr'}));
                el_name.appendChild(app.Utils.createSPAN({class: 'mt5 dbl fll', html: 'Урон:'}));
                el_name.appendChild(app.Utils.createSPAN({class: 'flr mt5', html: app.Utils.toMoney(data.me.rating.v)}));
                el_list.appendChild(el_name);

                p1.els.brd_r.appendChild(el_list);
            }

            data.list.forEach(entry => {
                let el = app.Utils.createDIV({class: 'rating_row'});
                if (entry.rating.p >= 1 && entry.rating.p <= 3) {
                    el.appendChild(app.Utils.createDIV({class: 'rating_top_p rating_top_p' + entry.rating.p}));
                } else {
                    el.appendChild(app.Utils.createDIV({class: 'rating_top_p', text: entry.rating.p}));
                }

                let avatar = app.Utils.createAvatarComponent(entry.u.r, entry.u.a);
                avatar.els.main.style = 'transform: scale(0.5); left: 40px';
                el.appendChild(avatar.els.main);

                let el_name = app.Utils.createDIV({class: 'rating_row_r'});
                el_name.appendChild(app.Utils.createA({class: 'major str tdn', text: app.UserUtil.getUserNameUpper0(entry.u.n)}));
                el_name.appendChild(app.Utils.createDIV({class: 'clr'}));
                el_name.appendChild(app.Utils.createSPAN({class: 'mt5 dbl fll', html: 'Урон:'}));
                el_name.appendChild(app.Utils.createSPAN({class: 'flr mt5', html: app.Utils.toMoney(entry.rating.v)}));
                el.appendChild(el_name);

                p1.scroll.el.appendChild(el);
                p1.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb5'}));
            });

            if (data.me) {
                p1.els.wrap.style.top = '110px';
                p1.els.wrap.style.height = (availableHeight - 110) + 'px';
                p1.scroll.availableHeight = availableHeight - 110;
            } else {
                p1.els.wrap.style.top = '40px';
                p1.els.wrap.style.height = (availableHeight - 40) + 'px';
                p1.scroll.availableHeight = availableHeight - 40;
            }

            TweenMax.delayedCall(0.001, () => {
                let contentRequiredHeight = app.LAYOUT.convert0(p1.scroll.el.getBoundingClientRect().height);
                p1.scroll.topMin = contentRequiredHeight > p1.scroll.availableHeight ? p1.scroll.availableHeight - contentRequiredHeight : 0;
            });
        };

        // верхней тени нет: на фоне голема она темнила строки под «Моё место»
        let el_scroll_sh_bottom;
        p1.els.wrap.appendChild(el_scroll_sh_bottom = app.Utils.createDIV({class: 'scroll_sh_bottom', style: 'width: 420px; opacity: 0'}));

        let contentRequiredHeight = 600;
        let availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
        let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
        let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

        p1.els.brd.style.top = top + 'px';
        p1.els.brd_r.style.height = availableHeight + 'px';

        p1.els.wrap.style.left = '30px';
        p1.els.wrap.style.width = '420px';
        p1.els.wrap.style.height = '0px';

        p1.scroll.top = 20;
        p1.scroll.topMax = 20;
        p1.scroll.topMin = 20;
        p1.scroll.availableHeight = 0;
        p1.scroll.el.style.top = p1.scroll.top + 'px';

        app.Popups.add(p1);

        updateHeaders();
        createContent(data);
    }

    function createHelp() {
        let el = app.Utils.createDIV({class: 'help'});
        el.style.zIndex = app.Popups.getNextZIndex();
        el.onclick = function() {
            app.SoundManager.playClick();
            app.Network.command({cmd: 'Help', section: 'Virus'}, function(data) {
                if (data.error) {
                    app.Utils.processErrors(data.error);
                } else {
                    let p = app.Popups.createPopup({});

                    p.tmp = {};

                    p.els.popup.style.opacity = 0;
                    p.els.popup.style.position = 'relative';
                    p.els.popup.style.left = '0px';

                    let wrap = app.Utils.createDIV({class: 'wrap', style: 'top: 10px; width: 430px'});
                    let wrap_s = app.Utils.createDIV({class: 'wrap_scroll', style: 'width: 430px'});
                    wrap.appendChild(wrap_s);

                    p.scroll = {el: wrap_s, top: 0, topMax: 0};
                    p.scroll.el.style.top = p.scroll.top + 'px';

                    let content = data.content;
                    if (content && content.indexOf('header=') === 0) {
                        let idx = content.indexOf(';');
                        let header = content.substr(7, idx - 7);
                        content = content.substr(idx + 1);
                        p.els.popup.appendChild(p.tmp.header = app.Utils.createDIV({class: 'header', style: 'left: 90px; top: -25px', text: header}));
                    }

                    let div = app.Utils.createDIV({style: 'width: 410px; margin: 10px;', html: content});
                    p.scroll.el.appendChild(div);

                    let group = app.Model.user.virus.e.group;

                    let el_group_text = app.Utils.createDIV({class: 'cntr', style: 'left: 25px; top: -25px;'});
                    el_group_text.onclick = function () {
                        group = app.UserUtil.getNextLevelGroupID(group);
                        updateRewards(group);
                    };
                    p.scroll.el.appendChild(el_group_text);

                    let el = app.Utils.createDIV({class: 'mlra', style: 'width: 400px'});

                    p.scroll.el.appendChild(el);
                    p.els.popup.appendChild(wrap);
                    app.Popups.add(p);

                    let updateRewards = function(group) {
                        if (group === app.Model.user.virus.e.group) {
                            el_group_text.innerHTML = 'Ты находишься в группе игроков {0} уровней.<br/>Награды за рейтинг:'.format(app.UserUtil.getLevelGroupName(group));
                        } else {
                            el_group_text.innerHTML = 'Награды группы игроков {0} уровней:'.format(app.UserUtil.getLevelGroupName(group));
                        }
                        app.Utils.removeAllChild(el);
                        app.Network.command({cmd: 'VirusRewards', group: group}, function(data) {
                            if (data.list) {
                                let list = data.list;

                                let myEntry;
                                if (app.Model.user.virus && app.Model.user.virus.e && app.Model.user.virus.e.group === group) {
                                    // -1 — ещё без места; ниже последнего приза награды за место нет
                                    let myPlace = app.Model.user.virus.e.rating.p;
                                    if (myPlace > 0) myEntry = list.find(entry => myPlace <= entry.p);
                                }

                                list.forEach((entry, i) => {
                                    let place;
                                    if (entry.p === -1) {
                                        let prev = list[i - 1];
                                        place = prev ? (prev.p + 1) + ' и выше' : 'Для всех';
                                    } else if (i === 0) {
                                        place = entry.p + ' место';
                                    } else {
                                        let prev = list[i - 1];
                                        if (entry.p - prev.p === 1) {
                                            place = entry.p + ' место';
                                        } else {
                                            place = (prev.p + 1) + ' - ' + entry.p + ' место';
                                        }
                                    }
                                    let el_r = app.Utils.createDIV({class: 'rewards_row'});
                                    let el_record;
                                    el_r.appendChild(el_record = app.Utils.createSPAN({class: 'str fll pt3 major', text: place}));
                                    if (entry === myEntry) {
                                        el_record.className = 'str fll pt3 r_green';
                                    }

                                    let el_c = app.Utils.createDIV({class: 'flr'});
                                    if (entry.dust) {
                                        el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_dust'}));
                                        el_c.appendChild(app.Utils.createText(app.Utils.toMoney1(entry.dust.min)));
                                    }
                                    if (entry.sd) {
                                        el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_dust_stone'}));
                                        el_c.appendChild(app.Utils.createText(app.Utils.toMoney1(entry.sd.min)));
                                    }
                                    if (entry.gold) {
                                        el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gold'}));
                                        el_c.appendChild(app.Utils.createText(app.Utils.toMoney1(entry.gold.min)));
                                    }
                                    if (entry.gems) {
                                        el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gem'}));
                                        el_c.appendChild(app.Utils.createText(app.Utils.toMoney1(entry.gems.min)));
                                    }
                                    if (entry.cards) {
                                        if (entry.cards.q0) {
                                            let min = entry.cards.q0.count.min * entry.cards.q0.fragments.min;
                                            let max = entry.cards.q0.count.max * entry.cards.q0.fragments.max;
                                            el_c.appendChild(app.Utils.createDIV({class: 'str flr vm', html: '<span class="res_icon res_icon_inline res_card_q0"></span>{0}-{1}'.format(min, max)}));
                                        }
                                        if (entry.cards.q1) {
                                            let min = entry.cards.q1.count.min * entry.cards.q1.fragments.min;
                                            let max = entry.cards.q1.count.max * entry.cards.q1.fragments.max;
                                            el_c.appendChild(app.Utils.createDIV({class: 'str flr vm', html: '<span class="res_icon res_icon_inline res_card_q1"></span>{0}-{1}'.format(min, max)}));
                                        }
                                        if (entry.cards.q2) {
                                            let min = entry.cards.q2.count.min * entry.cards.q2.fragments.min;
                                            let max = entry.cards.q2.count.max * entry.cards.q2.fragments.max;
                                            el_c.appendChild(app.Utils.createDIV({class: 'str flr vm', html: '<span class="res_icon res_icon_inline res_card_q2"></span>{0}-{1}'.format(min, max)}));
                                        }
                                    }
                                    el_r.appendChild(el_c);
                                    el.appendChild(el_r);
                                });
                                el.appendChild(app.Utils.createDIV({class: 'battle_advice minor', style: 'position: relative; left: 0; width: 400px; white-space: normal; margin-top: 8px', text: 'С {0}-го места награды за рейтинг нет. Гарантированная награда за энергию сохраняется.'.format(list[list.length - 1].p + 1)}));
                            }
                            updateScroll();
                        });
                    };
                    let updateScroll = function() {
                        TweenMax.delayedCall(0.001, function() {
                            let availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
                            let contentRequiredHeight = app.LAYOUT.convert0(wrap_s.getBoundingClientRect().height);
                            let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
                            let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

                            if (availableHeight < contentRequiredHeight) {
                                p.els.popup.style.height = availableHeight + 'px';
                                wrap.style.height = availableHeight - 20 + 'px';
                                p.scroll.topMax = (availableHeight - 20) < contentRequiredHeight ? contentRequiredHeight - (availableHeight - 20) : 0;
                            } else {
                                p.els.popup.style.height = contentRequiredHeight + 20 + 'px';
                                wrap.style.height = contentRequiredHeight + 'px';
                            }

                            if (p.tmp.header) {
                                let w = app.LAYOUT.convert0(p.tmp.header.getBoundingClientRect().width);
                                p.tmp.header.style.left = (430 - w) / 2 + 'px';
                            }

                            p.els.popup.style.opacity = 1;
                            p.els.popup.style.top = top + 'px';
                        });
                    };
                    updateScroll();
                    updateRewards(group);
                }
            });
        };
        return el;
    }

    return {
        create: create
    };
})();