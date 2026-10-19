app.Virus = (function() {

    function create() {
        let p = app.Popups.createPopup1({
            header: {value: 'Зараза вредная!'},
            display: {energy: 1, gems: 1},
            onUpdate: function() {
                if (p.tmp.virus !== app.Model.user.virus) {
                    p.tmp.virus = app.Model.user.virus;
                    if (p.tmp.updateVirusHealth) {
                        p.tmp.updateVirusHealth();
                    }
                }
            },
            onClose: function() {
                p.tmp._closed = 1;
                app.Network.command({cmd: 'VirusOut'});
            }
        });

        p.tmp = {};

        p.els.brd_bg.className = 'brd_block_bg_zorus';

        let contentRequiredHeight = 600;
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
                if (p.tmp.virus.h > 0) {
                    state_battle(p);
                } else {
                    state_dead(p);
                }
            }
        });
    }

    function state_battle(p) {
        let tl_energy;

        //const img = '/images/character_virus_fa.png';
        const img = '/images/character_virus.png';
        let el_boss = app.Utils.createDIV({style: 'background:url(' + app.IMAGES.getPath(img) + '); transform-origin: center; position: absolute; left: 119px; top: 40px;height: 236px; width: 242px'});
        let scale = 1;
        el_boss.onclick = function() {
            app.Network.command({cmd: 'VirusClick'}, function(data) {
                if (p.tmp._closed) return;
                app.SoundManager.playClick();
                p.tmp.virus = app.Model.user.virus;
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
                        state_dead(p);
                    }
                } else {
                    if (p.tmp.virus.h <= 0) {
                        state_dead(p);
                    } else {
                        if (data.card) {
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
                        }

                        updateVirusHealth();
                        updateRatingPlace();
                    }

                }

            });

            // анимация сжатия
            {
                let tl = new TimelineMax({
                    onComplete: function () {
                        scale += 0.1;
                    }
                });
                scale -= 0.1;
                tl.to(el_boss, 0.1, {scale: scale});
                tl.to(el_boss, 0.1, {scale: 1});
            }
        };
        p.scroll.el.appendChild(el_boss);

        p.scroll.el.appendChild(app.Utils.createIMG(app.IMAGES.getPath('/images/character_virus_light.png'), {class: 'dbl', style: 'position: absolute; left: 70px; top: -60px; pointer-events: none'}));

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

                let tl = new TimelineMax();
                tl.to(els.main, 0.1, {top: '-=10'});
                tl.to(els.main, 0.3, {top: '+=10'});
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

        let crit_cfg = {
            els: {}
        };

        let updateCritInfo = function() {
            let e = p.tmp.virus.e;

            if (!crit_cfg.els.main) {
                crit_cfg.els.main = app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 420px'});
                p.scroll.el.appendChild(crit_cfg.els.main);
                p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 440px;'}));
                p.scroll.el.appendChild(crit_cfg.els.advice = app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 450px;', html: 'Можно увеличить шанс на <span class="info">{0}%</span>'.format(p.tmp.virus.crit.step)}));
            }

            crit_cfg.els.main.innerHTML = 'Шанс крита в текущей битве: <span class="info">{0}%</span>'.format(e.crit);

            if (e.crit >= p.tmp.virus.crit.max) {
                crit_cfg.els.advice.style.top = '470px';
                crit_cfg.els.advice.innerText = 'У тебя максимальный крит';
                app.Utils.addClass(crit_cfg.els.advice, 'minor');
                if (crit_cfg.els.a) {
                    p.scroll.el.removeChild(crit_cfg.els.a);
                    delete crit_cfg.els.a;
                }
            } else {
                if (!crit_cfg.els.a) {
                    p.scroll.el.appendChild(crit_cfg.els.a = app.Utils.createA({class: 'btn_g mlra_ab', style: 'top: 470px; color: white;', html: 'Увеличить за <span class="res_icon res_icon_inline res_gem"></span>{0}'.format(p.tmp.virus.crit.price.v)}, function() {
                        if (app.Utils.hasClass(crit_cfg.els.a, 'bw')) return;
                        app.Utils.addClass(crit_cfg.els.a, 'bw');
                        app.Network.command({cmd: 'VirusCritInc'}, function(data) {
                            if (p.tmp._closed) return;
                            app.Utils.removeClass(crit_cfg.els.a, 'bw');
                            if (data.error) {
                                switch (data.error.code) {
                                    case 1:
                                        app.Utils.showInfo('У тебя уже максимальный крит');
                                        break;
                                    case 2:
                                        app.EventDispatcher.dispatchEvent('not enough resources', {price:{t:1}});
                                        break;
                                    default:
                                        app.Utils.showInfo('Попробуйте позже');
                                        break;
                                }
                            } else {
                                p.tmp.virus = app.Model.user.virus;
                                if (p.tmp.virus.h <= 0) {
                                    state_dead(p);
                                } else {
                                    updateCritInfo();
                                }
                                app.Utils.showInfo('Шанс крита увеличен!', {type: 0});
                            }
                        });
                    }));
                } else {
                    crit_cfg.els.a.innerHTML = 'Увеличить за <span class="res_icon res_icon_inline res_gem"></span>{0}'.format(p.tmp.virus.crit.price.v);
                }
            }
        };
        updateCritInfo();

        p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 505px'}));

        let el_rating = app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 520px'});
        p.scroll.el.appendChild(el_rating);

        let updateRatingPlace = function() {
            let place = p.tmp.virus.e.rating.p;
            el_rating.innerHTML = 'Твое место в рейтинге: <span class="info">{0}</span>'.format(place === -1 ? '?' : place);
        };
        updateRatingPlace();

        p.scroll.el.appendChild(app.Utils.createA({class: 'btn_g', style: 'left: 160px; top: 540px; font-size: 12px', html: '<div class="rating_top_p rating_top_p1" style="transform: scale(0.6); transform-origin: center center 0px; position: relative; margin: -17px 0px -16px -8px; display: inline-block;"></div>Рейтинг по урону'}, function() {
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

    function state_dead(p) {
        delete p.tmp.updateVirusHealth;

        app.Utils.removeAllChild(p.scroll.el);

        p.scroll.el.appendChild(app.Utils.createDIV({style: 'top: -20px; position: relative;', html: '<img src="'+app.IMAGES.getPath('/images/character_virus_dead.png')+'" class="dbl mlra_ab">'}));
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 400px', text: 'Зараза повержена!'}));
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 450px;'}));

        let el_rating = app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 465px'});
        p.scroll.el.appendChild(el_rating);

        let updateRatingPlace = function() {
            let place = p.tmp.virus.e.rating.p;
            el_rating.innerHTML = 'Твое место в рейтинге: <span class="info">{0}</span>'.format(place === -1 ? '?' : place);
        };
        updateRatingPlace();

        p.scroll.el.appendChild(app.Utils.createA({class: 'btn_g', style: 'left: 160px; top: 490px; font-size: 12px', html: '<div class="rating_top_p rating_top_p1" style="transform: scale(0.6); transform-origin: center center 0px; position: relative; margin: -17px 0px -16px -8px; display: inline-block;"></div>Рейтинг по урону'}, function() {
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

                if (scroll.top === scroll.topMax) {
                    el_scroll_sh_top.style.opacity = 0;
                } else {
                    el_scroll_sh_top.style.opacity = 1;
                }

                if (scroll.top === scroll.topMin) {
                    el_scroll_sh_bottom.style.opacity = 0;
                } else {
                    el_scroll_sh_bottom.style.opacity = 1;
                }

                return true;
            }
        });

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
            let group = app.UserUtil.getLevelGroupByID(p1.tmp.group);
            el_groups_filter.innerText = group.name;
            el_header.innerText = 'Рейтинг {0}'.format(group.name);
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

        let el_scroll_sh_top, el_scroll_sh_bottom;
        p1.els.wrap.appendChild(el_scroll_sh_top = app.Utils.createDIV({class: 'scroll_sh_top', style: 'width: 420px; opacity: 0'}));
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
                            el_group_text.innerHTML = 'Ты находишься в группе игроков {0} уровней.<br/>Награды за рейтинг:'.format(app.UserUtil.getBossGroupDesc(group));
                        } else {
                            el_group_text.innerHTML = 'Награды группы игроков {0} уровней:'.format(app.UserUtil.getBossGroupDesc(group));
                        }
                        app.Utils.removeAllChild(el);
                        app.Network.command({cmd: 'VirusRewards', group: group}, function(data) {
                            if (data.list) {
                                let list = data.list;

                                let myEntry;
                                if (app.Model.user.virus && app.Model.user.virus.e && app.Model.user.virus.e.group === group) {
                                    let myPlace = app.Model.user.virus.e.rating.p;
                                    for (let i = 0; i < list.length; i++) {
                                        let entry = list[i];
                                        if (myPlace <= entry.p) {
                                            myEntry = entry;
                                            break;
                                        }
                                    }
                                    if (!myEntry) {
                                        myEntry = list[list.length - 1];
                                    }
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