app.BossPage = (function() {

    function create() {
        var boss = app.Model.user.boss;
        if (boss) {
            if (boss.s === 'SHIELD') {
                if (boss.e.sm > boss.e.s) {
                    create1();
                } else {
                    create1_2();
                }
            } else if (boss.s === 'BOSS') {
                create2();
            } else if (boss.s === 'RESULT') {
                create3();
            }
        }
    }

    function create1() {
        var boss = app.Model.user.boss;

        var p = app.Popups.createPopup1({
            id: 'BOSS_1',
            display: {menu: 0, energy: 1},
            header: {value: 'Зорус Ужасный!'},
            onUpdate: function() {
                if (!app.Model.user.boss) {
                    app.Popups.removePopup(p);
                } else if (app.Model.user.boss.s === 'SHIELD') {
                    boss = app.Model.user.boss;
                    if (boss.e.sm > boss.e.s) {
                        var progress = boss.e.sm - boss.e.s;
                        var required = boss.e.sm;
                        TweenMax.killTweensOf([p.tmp._obj]);
                        p.tmp._obj.now = progress;
                        TweenMax.to(p.tmp._obj, 0.3, {
                            old: p.tmp._obj.now, onUpdate: function () {
                                let prg = (p.tmp._obj.old * 100 / required);
                                p.tmp.shield.style.opacity = prg / 100;
                                p.tmp.prg.style.width = prg + '%';
                                p.tmp.prg_text.innerText = '{0}'.format(app.Utils.toMoney(Math.floor(p.tmp._obj.old)));
                            }
                        });
                        p.tmp.updatePlace();
                    } else {
                        app.Popups.removePopup0(p);
                        create();
                    }
                } else {
                    app.Popups.removePopup0(p);
                    create();
                }
            }
        });

        p.tmp = {};

        var progress = boss.e.sm - boss.e.s;
        var required = boss.e.sm;
        var prg = progress * 100 / required;
        p.tmp._obj = {old: progress, now: progress};

        p.els.brd_bg.className = 'brd_block_bg_zorus';

        var el = app.Utils.createDIV({style: 'background:url(' + app.IMAGES.getPath('/images/character_an.png') + ') center 100px no-repeat; top: -30px; position: relative'});
        el.appendChild(p.tmp.shield = app.Utils.createIMG('/images/character_an_shield.png', {class: 'dbl mlra_ab', style: 'opacity: {0}'.format(prg / 100)}));
        p.scroll.el.appendChild(el);

        p.scroll.el.appendChild(app.Utils.createDIV({class: 'battle_advice mlra_ab', style: 'width: 380px; top: 350px', text: 'Прочность щита:'}));

        el = app.Utils.createDIV({class: 'quest_chest_prg', style: 'left: 115px; top: 370px;'});
        el1 = app.Utils.createDIV({class: 'quest_chest_prg_wrp'});
        el1.appendChild(p.tmp.prg = app.Utils.createDIV({class: 'quest_chest_prg_bg outboss_en_prg_bg', style: 'width: {0}%'.format(prg)}));
        el1.appendChild(p.tmp.prg_text = app.Utils.createDIV({class: 'quest_chest_prg_text', text: '{0}'.format(app.Utils.toMoney(progress))}));
        el.appendChild(el1);
        p.scroll.el.appendChild(el);

        p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 400px;'}));

        p.scroll.el.appendChild(app.Utils.createDIV({class: 'battle_advice mlra_ab', style: 'width: 400px; top: 410px;', html: 'Битва с Зорусом начнётся Завтра!<br>Сегодня нужно уничтожить его магический щит.'}));
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'battle_advice mlra_ab', style: 'width: 400px; top: 455px;', html: 'Все Хранители зарабатывая тонус ослабляют щит!'}));

        p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 475px'}));

        p.tmp.updatePlace = function() {
            if (!p.tmp.place) {
                p.scroll.el.appendChild(p.tmp.place = app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 488px;'}));
            }

            var place = boss.e.sp;

            p.tmp.place.innerHTML = place === -1 ? 'Тебя нет в рейтинге' : 'Твое место в рейтинге: <span class="info">{0}</span>'.format(place);
        };
        p.tmp.updatePlace();

        p.scroll.el.appendChild(app.Utils.createA({class: 'btn_g', style: 'left: 160px; top: 508px; font-size: 12px;', html: '<div class="rating_top_p rating_top_p1" style="transform: scale(0.6); transform-origin: center center 0px; position: relative; margin: -17px 0px -16px -8px; display: inline-block;"></div>Рейтинг по тонусу'}, function() {
            app.RatingsPage.create(app.RatingsPage.TYPE.BOSS_ENERGY);
        }));

        p.els.brd_r.appendChild(createHelp(1));

        var availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
        var availableHeight = Math.min(550, availableHeight0);
        var top = (availableHeight0 - availableHeight) / 2;
        top = Math.max(80, top);

        p.els.brd.style.top = top + 'px';
        p.els.brd_r.style.height = availableHeight + 'px';

        p.els.wrap.style.height = availableHeight + 'px';
        p.els.wrap.style.zIndex = 1;
        p.els.header.style.zIndex = 2;

        var contentRequiredHeight = 550;
        p.scroll.availableHeight = availableHeight;
        p.scroll.topMax = p.scroll.availableHeight < contentRequiredHeight ? contentRequiredHeight - p.scroll.availableHeight : 0;

        app.Popups.add(p);
    }

    function create1_2() {
        var boss = app.Model.user.boss;

        var p = app.Popups.createPopup1({
            id: 'BOSS_1',
            display: {menu: 0, energy: 1},
            header: {value: 'Зорус Ужасный!'},
            onUpdate: function() {
                if (!app.Model.user.boss) {
                    app.Popups.removePopup(p);
                } else if (app.Model.user.boss.s === 'SHIELD') {
                    boss = app.Model.user.boss;
                    p.tmp.updatePlace();
                } else {
                    app.Popups.removePopup0(p);
                    create();
                }
            }
        });

        p.tmp = {};

        p.els.brd_bg.className = 'brd_block_bg_zorus';

        var el = app.Utils.createDIV({style: 'background:url(' + app.IMAGES.getPath('/images/character_an.png') + ') center 100px no-repeat; top: -30px; position: relative'});
        el.appendChild(p.tmp.shield = app.Utils.createIMG('/images/character_an_shield.png', {class: 'dbl mlra_ab', style: 'opacity: 0'}));
        p.scroll.el.appendChild(el);

        p.scroll.el.appendChild(app.Utils.createDIV({class: 'battle_advice mlra_ab', style: 'width: 400px; top: 320px;', text: 'Магический щит Зоруса разрушен.'}));
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'battle_advice mlra_ab', style: 'width: 400px; top: 345px;', text: 'Битва начнётся Завтра!'}));

        p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 385px;'}));

        p.tmp.updatePlace = function() {
            if (!p.tmp.place) {
                p.scroll.el.appendChild(p.tmp.place = app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 408px;'}));
            }

            var place = boss.e.sp;

            p.tmp.place.innerHTML = place == -1 ? 'Тебя нет в рейтинге' : 'Твое место в рейтинге: <span class="info">{0}</span>'.format(place);
        };
        p.tmp.updatePlace();

        p.scroll.el.appendChild(app.Utils.createA({class: 'btn_g', style: 'left: 160px; top: 428px; font-size: 12px;', html: '<div class="rating_top_p rating_top_p1" style="transform: scale(0.6); transform-origin: center center 0px; position: relative; margin: -17px 0px -16px -8px; display: inline-block;"></div>Рейтинг по тонусу'}, function() {
            app.RatingsPage.create(app.RatingsPage.TYPE.BOSS_ENERGY);
        }));

        p.els.brd_r.appendChild(createHelp(1));

        var availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
        var availableHeight = Math.min(500, availableHeight0);
        var top = (availableHeight0 - availableHeight) / 2;
        top = Math.max(80, top);

        p.els.brd.style.top = top + 'px';
        p.els.brd_r.style.height = availableHeight + 'px';

        p.els.wrap.style.height = availableHeight + 'px';
        p.els.wrap.style.zIndex = 1;
        p.els.header.style.zIndex = 2;

        var contentRequiredHeight = 500;
        p.scroll.availableHeight = availableHeight;
        p.scroll.topMax = p.scroll.availableHeight < contentRequiredHeight ? contentRequiredHeight - p.scroll.availableHeight : 0;

        app.Popups.add(p);
    }

    function create2() {
        var boss = app.Model.user.boss;

        var p = app.Popups.createPopup1({
            id: 'BOSS_2',
            display: {menu: 0, energy: 1, gems: 1},
            header: {value: 'Зорус Ужасный!'},
            onShow: function() {
                p.cfg.onUpdate();
            },
            onUpdate: function() {
                if (!app.Model.user.boss) {
                    app.Popups.removePopup(p);
                } else if (app.Model.user.boss.s === 'BOSS') {
                    boss = app.Model.user.boss;
                    var progress = boss.e.h;
                    var required = boss.e.hm;
                    TweenMax.killTweensOf([p.tmp._obj]);
                    p.tmp._obj.now = progress;
                    TweenMax.to(p.tmp._obj, 0.3, {old: p.tmp._obj.now, onUpdate: function() {
                        var prg = (p.tmp._obj.old * 100 / required);
                        p.tmp.fire.style.opacity = 1 - prg/100;
                        p.tmp.prg.style.width = prg + '%';
                        p.tmp.prg_text.innerText = '{0}'.format(app.Utils.toMoney(Math.floor(p.tmp._obj.old)));
                    }});
                    p.tmp.updatePriceAuto();
                    p.tmp.updatePrice();
                    p.tmp.updatePlace();
                } else {
                    app.Popups.removePopup0(p);
                    create();
                }
            }
        });

        p.tmp = {};

        var progress = boss.e.h;
        var required = boss.e.hm;
        var prg = progress * 100 / required;
        p.tmp._obj = {old: progress, now: progress};

        p.els.brd_bg.className = 'brd_block_bg_zorus';

        var el = app.Utils.createDIV({style: 'background:url(' + app.IMAGES.getPath('/images/character_an.png') + ') center 100px no-repeat; top: -20px; position: relative'});
        el.appendChild(p.tmp.fire = app.Utils.createIMG('/images/character_an_fire.png', {class: 'dbl mlra_ab', style: 'opacity: {0}'.format(1 - prg/100)}));
        p.scroll.el.appendChild(el);

        el = app.Utils.createDIV({class: 'quest_chest_prg', style: 'left: 115px; top: 320px'});
        el1 = app.Utils.createDIV({class: 'quest_chest_prg_wrp'});
        el1.appendChild(p.tmp.prg = app.Utils.createDIV({class: 'quest_chest_prg_bg', style: 'width: {0}%'.format(prg)}));
        el1.appendChild(p.tmp.prg_text = app.Utils.createDIV({class: 'quest_chest_prg_text', text: '{0}'.format(app.Utils.toMoney(progress))}));
        el.appendChild(el1);
        p.scroll.el.appendChild(el);

        p.tmp.updatePrice = function() {
            if (!p.tmp.price) {
                p.scroll.el.appendChild(p.tmp.price = app.Utils.createA({class: 'btn_g', style: 'left: 160px; top: 360px'}, function () {
                    if (app.Utils.hasClass(p.tmp.price, 'bw')) return;
                    app.Utils.addClass(p.tmp.price, 'bw');
                    app.Network.command({cmd: 'BossBattleBegin'}, function(data) {
                        app.Utils.removeClass(p.tmp.price, 'bw');
                        if (data.error) {
                            app.Utils.processErrors(data.error);
                        } else {
                            app.EventDispatcher.dispatchEvent('battle begin', {zorus: 1});
                        }
                    })
                }));
            }
            var energy = app.UserUtil.getBossAttackPrice();
            p.tmp.price.innerHTML = 'В бой за <span class="res_icon res_icon_inline res_energy"></span>{0}'.format(energy);
        };
        p.tmp.updatePrice();

        p.tmp.updatePriceAuto = function() {
            let me = app.UserUtil.getBossMember();
            if (me && me.attempts > 0) {
                if (!p.tmp.price_auto) {
                    let els = p.tmp.price_auto = {};
                    p.scroll.el.appendChild(els.hr = app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 400px'}));
                    p.scroll.el.appendChild(els.advice = app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 410px;', text: 'или Автобой:'}));
                    p.scroll.el.appendChild(els.price = app.Utils.createA({class: 'btn_g btn_a', style: 'left: 160px; top:430px'}, function () {
                        if (app.Utils.hasClass(els.price, 'bw')) return;
                        app.Utils.addClass(els.price, 'bw');
                        app.Network.command({cmd: 'BossBattleBegin', auto: 1}, function(data) {
                            app.Utils.removeClass(els.price, 'bw');
                            if (data.error) {
                                app.Utils.processErrors(data.error);
                            } else {
                                app.BattlePage.showBossEnd({battle: data.battle});
                            }
                        })
                    }));
                }
                let energy = app.UserUtil.getBossAttackPrice();
                let gems = app.UserUtil.getBossAttackAutoPrice();
                p.tmp.price_auto.price.innerHTML = 'За <span class="res_icon res_icon_inline res_energy"></span>{0} и <span class="res_icon res_icon_inline res_gem"></span>{1}'.format(energy, gems);
            } else {
                if (p.tmp.price_auto) {
                    let els = p.tmp.price_auto;
                    delete p.tmp.price_auto;
                    p.scroll.el.removeChild(els.hr);
                    p.scroll.el.removeChild(els.advice);
                    p.scroll.el.removeChild(els.price);
                }
            }
        };
        p.tmp.updatePriceAuto();

        p.tmp.updatePlace = function() {
            if (!p.tmp.place) {
                let els = p.tmp.place = {};
                p.scroll.el.appendChild(els.hr = app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 470px'}));
                p.scroll.el.appendChild(els.place = app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 488px'}));
                p.scroll.el.appendChild(els.rating = app.Utils.createA({class: 'btn_g', style: 'left: 160px; top: 508px; font-size: 12px', html: '<div class="rating_top_p rating_top_p1" style="transform: scale(0.6); transform-origin: center center 0px; position: relative; margin: -17px 0px -16px -8px; display: inline-block;"></div>Рейтинг по урону'}, function() {
                    app.RatingsPage.create(app.RatingsPage.TYPE.BOSS);
                }));
            }

            if (p.tmp.price_auto) {
                p.tmp.place.hr.style.top = '470px';
                p.tmp.place.place.style.top = '488px';
                p.tmp.place.rating.style.top = '508px';
            } else {
                p.tmp.place.hr.style.top = '440px';
                p.tmp.place.place.style.top = '458px';
                p.tmp.place.rating.style.top = '478px';
            }

            let me = app.UserUtil.getBossMemberSorted();
            let place = me ? me.p : -1;
            p.tmp.place.place.innerHTML = place === -1 ? 'Тебя нет в рейтинге' : 'Твое место в рейтинге: <span class="info">{0}</span>'.format(place);
        };
        p.tmp.updatePlace();

        p.els.brd_r.appendChild(createHelp(2));

        var availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
        var availableHeight = Math.min(628, availableHeight0);
        var top = (availableHeight0 - availableHeight) / 2;
        top = Math.max(80, top);

        p.els.brd.style.top = top + 'px';
        p.els.brd_r.style.height = availableHeight + 'px';

        p.els.wrap.style.height = availableHeight + 'px';

        var contentRequiredHeight = 600;
        p.scroll.availableHeight = availableHeight;
        p.scroll.topMax = p.scroll.availableHeight < contentRequiredHeight ? contentRequiredHeight - p.scroll.availableHeight : 0;

        app.Popups.add(p);
    }

    function create3() {
        var boss = app.Model.user.boss;

        var p = app.Popups.createPopup1({
            id: 'BOSS_3',
            display: {menu: 0},
            header: {value: 'Зорус Ужасный!'},
            onUpdate: function() {
                if (!app.Model.user.boss) {
                    app.Popups.removePopup(p);
                } else if (app.Model.user.boss.s === 'RESULT') {
                } else {
                    app.Popups.removePopup0(p);
                    create();
                }
            }
        });

        p.tmp = {};

        p.els.brd_bg.className = 'brd_block_bg_zorus';

        p.scroll.el.appendChild(app.Utils.createDIV({style: 'top: -20px; position: relative', html: '<img src="' + app.IMAGES.getPath('/images/character_an_dead.png') + '" class="dbl mlra_ab">'}));
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 400px;', text: 'Зорус повержен!'}));

        p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 450px;'}));

        p.tmp.updatePlace = function() {
            if (!p.tmp.place) {
                p.scroll.el.appendChild(p.tmp.place = app.Utils.createDIV({class: 'battle_advice', style: 'width: 480px; top: 465px'}));
            }

            var me = app.UserUtil.getBossMemberSorted();
            var place = me ? me.p : -1;

            p.tmp.place.innerHTML = place === -1 ? 'Тебя нет в рейтинге' : 'Твое место в рейтинге: <span class="info">{0}</span>'.format(place);
        };
        p.tmp.updatePlace();

        p.scroll.el.appendChild(app.Utils.createA({class: 'btn_g', style: 'left: 160px; top: 490px; font-size: 12px', html: '<div class="rating_top_p rating_top_p1" style="transform: scale(0.6); transform-origin: center center 0px; position: relative; margin: -17px 0px -16px -8px; display: inline-block;"></div>Рейтинг по урону'}, function() {
            app.RatingsPage.create(app.RatingsPage.TYPE.BOSS);
        }));

        p.els.brd_r.appendChild(createHelp(2));

        let availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
        let availableHeight = Math.min(628, availableHeight0);
        let top = (availableHeight0 - availableHeight) / 2;
        top = Math.max(80, top);

        p.els.brd.style.top = top + 'px';
        p.els.brd_r.style.height = availableHeight + 'px';

        p.els.wrap.style.height = availableHeight + 'px';

        let contentRequiredHeight = 600;
        p.scroll.availableHeight = availableHeight;
        p.scroll.topMax = p.scroll.availableHeight < contentRequiredHeight ? contentRequiredHeight - p.scroll.availableHeight : 0;

        app.Popups.add(p);
    }

    function createHelp(type) {
        let el = app.Utils.createDIV({class: 'help'});
        el.style.zIndex = app.Popups.getNextZIndex();
        el.onclick = function() {
            app.SoundManager.playClick();
            app.Network.command({cmd: 'Help', section: 'Zorus'}, function (data) {
                if (data.error) {
                    app.Utils.processErrors(data.error);
                } else {
                    let p = app.Popups.createPopup({});

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
                        var idx = content.indexOf(';');
                        var header = content.substr(7, idx - 7);
                        content = content.substr(idx + 1);
                        p.els.popup.appendChild(header = app.Utils.createDIV({class: 'header', style: 'left: 90px; top: -25px', text: header}));
                    }

                    let div = app.Utils.createDIV({style: 'width: 410px; margin: 10px;', html: content});
                    p.scroll.el.appendChild(div);

                    let rjCFG;
                    let el_group_text;
                    let el;
                    if (type === 1) {
                        p.scroll.el.appendChild(el_group_text = app.Utils.createDIV({class: 'cntr', style: 'left: 25px; top: -25px;', text: 'Награды за рейтинг по тонусу:'}));
                        el = app.Utils.createDIV({class: 'mlra', style: 'width: 400px'});
                        rjCFG = app.CFGUtil.getBossCFG().rewards.energy;
                    } else {
                        let group;
                        let boss = app.Model.user.boss;
                        if (boss && boss.e.g) {
                            group = boss.e.g.id;
                        } else {
                            group = app.UserUtil.getLevelGroupID(app.Model.user.level);
                        }
                        rjCFG = app.CFGUtil.getBossCFG().rewards.groups[group].list;
                        el_group_text = app.Utils.createDIV({class: 'cntr', style: 'left: 25px; top: -25px;'});
                        el_group_text.onclick = function() {
                            group = app.UserUtil.getNextLevelGroupID(group);
                            rjCFG = app.CFGUtil.getBossCFG().rewards.groups[group].list;
                            updateRewards(group);
                        };
                        p.scroll.el.appendChild(el_group_text);
                        el = app.Utils.createDIV({class: 'mlra'});
                    }

                    p.scroll.el.appendChild(el);
                    p.els.popup.appendChild(wrap);
                    app.Popups.add(p);

                    let updateRewards = function(group) {
                        app.Utils.removeAllChild(el);
                        if (type === 2) {
                            let myGroup;
                            if (app.Model.user.boss && app.Model.user.boss.e.g) {
                                myGroup = app.Model.user.boss.e.g.id;
                            } else {
                                myGroup = app.UserUtil.getLevelGroupID(app.Model.user.level);
                            }

                            if (group === undefined) group = myGroup;

                            if (group === myGroup) {
                                el_group_text.innerHTML = 'Ты находишься в группе игроков {0} уровней.<br/>Награды за рейтинг:'.format(app.UserUtil.getBossGroupDesc(group));
                            } else {
                                el_group_text.innerHTML = 'Награды группы игроков {0} уровней:'.format(app.UserUtil.getBossGroupDesc(group));
                            }
                        }

                        rjCFG.forEach(function(entry, i) {
                            let place;
                            if (entry.p === -1) {
                                let prev = rjCFG[i - 1];
                                place = prev ? (prev.p + 1) + ' и ниже' : 'Для всех';
                            } else if (i === 0) {
                                place = entry.p + ' место';
                            } else {
                                let prev = rjCFG[i - 1];
                                if (entry.p - prev.p === 1) {
                                    place = entry.p + ' место';
                                } else {
                                    place = (prev.p + 1) + ' - ' + entry.p + ' место';
                                }
                            }
                            let el_r = app.Utils.createDIV({class: 'rewards_row'});
                            el_r.appendChild(app.Utils.createSPAN({class: 'str fll pt3 major', text: place}));
                            let el_c = app.Utils.createDIV({class: 'flr'});
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
                        updateScroll();
                    };
                    let updateScroll = function() {
                        TweenMax.delayedCall(0.001, function () {
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

                            if (header) {
                                let w = app.LAYOUT.convert0(header.getBoundingClientRect().width);
                                header.style.left = (430 - w) / 2 + 'px';
                            }

                            p.els.popup.style.opacity = 1;
                            p.els.popup.style.top = top + 'px';
                        });
                    };
                    updateRewards();
                }
            });
        };
        return el;
    }

    return {
        create: create
    }
})();