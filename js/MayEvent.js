app.MayEvent = (function() {

    function create(cfg) {
        let event = app.Model.user.may_event;

        if (!event) {
            app.Utils.showInfo('Событие завершилось!');
            return;
        }

        if (event.s.v === 0) {
        } else if (event.s.v === 1) {
            create1(cfg);
        } else if (event.s.v === 2) {
            create2(cfg);
            /*
            if (app.UserUtil.isYandex()) {
                const me = event.me;
                if (me && me.ratings && me.ratings.yandex && me.ratings.yandex.place <= 3) {
                    const id = app.Model.user.id;
                    if (id === 2095593 || id === 2225175 || id === 1958184) {
                        _createYandexWin();
                    }
                }
            }
             */
        }
    }

    function create1(cfg) {
        let p = app.Popups.createPopup1({
            id: 'MAY_EVENT',
            onUpdate: function() {
                if (p.tmp.event.s.v !== app.Model.user.may_event.s.v) {
                    create();
                } else if (p.tmp.event !== app.Model.user.may_event) {
                    p.tmp.event = app.Model.user.may_event;
                    if (p.cfg.tabs.active === 1) {
                        onTabClick(p, 1);
                    }
                }

                if (p.cfg.tabs.active === 2) {
                    if (p.tmp.shop && p.tmp.shop !== app.Model.user.shop3) {
                        p.tmp.shop = app.Model.user.shop3;
                        onTabClick(p, 2);
                    }
                }
            },
            onClose: function() {
                p.tmp._closed = 1;
            }
        });

        p.tmp = {};
        p.tmp.event = app.Model.user.may_event;

        switch (p.tmp.event.t) {
            case 'hb':
            case 'hb3':
            case 'hb4':
            case 'hb5':
                p.cfg.display = {gold: 1, gems: 1, hb: 1};
                p.els.brd_bg.className = 'brd_block_bg_hb';
                break;
            case 'sun':
            case 'sun_21':
                p.cfg.display = {gold: 1, gems: 1, sun: 1};
                p.els.brd_bg.className = 'brd_block_bg_sun';
                break;
            case 'new_year':
            case 'new_year_21':
            case 'new_year_22':
            case 'new_year_23':
                p.cfg.display = {gold: 1, gems: 1, snowf: 1};
                p.els.brd_bg.className = 'brd_block_bg_ny';
                break;
            case 'april':
                p.cfg.display = {gold: 1, gems: 1, april: 1};
                p.els.brd_bg.className = 'brd_block_bg_april';
                break;
            case 'cosmos':
                p.cfg.display = {gold: 1, gems: 1, cosmos: 1};
                p.els.brd_bg.className = 'brd_block_bg_cosmos';
                break;
            case 'magic':
                p.cfg.display = {gold: 1, gems: 1, magic: 1};
                p.els.brd_bg.className = 'brd_block_bg_magic';
                break;
            case 'wind':
                p.cfg.display = {gold: 1, gems: 1, wind: 1};
                p.els.brd_bg.className = 'brd_block_bg_wind';
                break;
            default:
                p.cfg.display = {gold: 1, gems: 1, flowers: 1};
                p.els.brd_bg.className = 'brd_block_bg_flowers';
                break;
        }

        p.cfg.tabs = {active: 1};
        let tab = p.cfg.tabs.t1 = {els: {}};
        tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 30px', text: 'Задания'}, onTabClick.bind(null, p, 1));
        p.els.brd_r.appendChild(tab.els.main);

        tab = p.cfg.tabs.t2 = {els: {}};
        tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 134px', text: 'Магазин'}, onTabClick.bind(null, p, 2));
        p.els.brd_r.appendChild(tab.els.main);

        tab = p.cfg.tabs.t3 = {els: {}};
        tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 238px', text: 'Рейтинги'}, onTabClick.bind(null, p, 3));
        p.els.brd_r.appendChild(tab.els.main);

        /*
        if (p.tmp.event.yandex && app.UserUtil.isYandex()) {
            //p.els.brd_bg.className += ' brd_block_bg_april_yandex';
            tab = p.cfg.tabs.t4 = {els: {}};
            tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 342px', text: 'Яндекс'}, onTabClick.bind(null, p, 4));
            p.els.brd_r.appendChild(tab.els.main);
        }
         */

        let availableHeight0 = app.LAYOUT.getClientWHS0(0);
        let contentRequiredHeight = 628;

        let availableHeight = Math.min(contentRequiredHeight, availableHeight0 - 80 - 40);
        p.tmp.availableHeight = availableHeight;
        let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

        p.els.brd.style.opacity = 1;
        p.els.brd.style.top = top + 'px';

        p.els.brd_r.style.height = availableHeight + 'px';

        p.els.wrap.style.left = '30px';
        p.els.wrap.style.width = '420px';
        p.els.wrap_s.style.width = '420px';

        p.els.brd_r.appendChild(createHelp(() => {
            if (p.cfg.tabs.active === 4) {
                return 'NEW_YEAR_EVENT_YANDEX';
            }
            switch (p.tmp.event.t) {
                case 'hb':
                case 'hb3':
                case 'hb4':
                case 'hb5':
                    return 'HB_EVENT';
                case 'sun':
                case 'sun_21':
                    return 'SUN_EVENT';
                case 'new_year':
                case 'new_year_21':
                case 'new_year_22':
                case 'new_year_23':
                    return 'NEW_YEAR_EVENT';
                case 'april':
                    return 'APRIL_1_EVENT';
                case 'cosmos':
                    return 'COSMOS_EVENT';
                case 'magic':
                    return 'MAGIC_EVENT';
                case 'wind':
                    return 'WIND_EVENT';
                default:
                    return 'MAY_EVENT';
            }
        }));

        app.Popups.add(p);

        if (cfg && cfg.tabs) {
            if (cfg.tabs.active) {
                onTabClick(p, cfg.tabs.active);
            } else if (cfg.tabs.yandex && p.cfg.tabs.t4) {
                onTabClick(p, 4);
            }
        } else {
            onTabClick(p, 1);
        }
    }

    function create2(cfg) {
        let p = app.Popups.createPopup1({
            id: 'MAY_EVENT',
            onUpdate: function() {
                if (p.cfg.tabs.active === 2) {
                    if (p.tmp.shop && p.tmp.shop !== app.Model.user.shop3) {
                        p.tmp.shop = app.Model.user.shop3;
                        onTabClick2(p, 2);
                    }
                }
            },
            onClose: function() {
                p.tmp._closed = 1;
            }
        });

        p.tmp = {};
        p.tmp.event = app.Model.user.may_event;

        switch (p.tmp.event.t) {
            case 'hb':
            case 'hb3':
            case 'hb4':
            case 'hb5':
                p.cfg.display = {gold: 1, gems: 1, hb: 1};
                p.els.brd_bg.className = 'brd_block_bg_hb';
                break;
            case 'sun':
            case 'sun_21':
                p.cfg.display = {gold: 1, gems: 1, sun: 1};
                p.els.brd_bg.className = 'brd_block_bg_sun';
                break;
            case 'new_year':
            case 'new_year_21':
            case 'new_year_22':
            case 'new_year_23':
                p.cfg.display = {gold: 1, gems: 1, snowf: 1};
                p.els.brd_bg.className = 'brd_block_bg_ny';
                break;
            case 'april':
                p.cfg.display = {gold: 1, gems: 1, april: 1};
                p.els.brd_bg.className = 'brd_block_bg_april';
                break;
            case 'cosmos':
                p.cfg.display = {gold: 1, gems: 1, cosmos: 1};
                p.els.brd_bg.className = 'brd_block_bg_cosmos';
                break;
            case 'magic':
                p.cfg.display = {gold: 1, gems: 1, magic: 1};
                p.els.brd_bg.className = 'brd_block_bg_magic';
                break;
            case 'wind':
                p.cfg.display = {gold: 1, gems: 1, wind: 1};
                p.els.brd_bg.className = 'brd_block_bg_wind';
                break;
            default:
                p.cfg.display = {gold: 1, gems: 1, flowers: 1};
                p.els.brd_bg.className = 'brd_block_bg_flowers';
                break;
        }

        let availableHeight0 = app.LAYOUT.getClientWHS0(0);
        let contentRequiredHeight = 628;

        let availableHeight = Math.min(contentRequiredHeight, availableHeight0 - 80 - 40);
        p.tmp.availableHeight = availableHeight;
        let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

        p.els.brd.style.opacity = 1;
        p.els.brd.style.top = top + 'px';

        p.els.brd_r.style.height = availableHeight + 'px';

        p.els.wrap.style.left = '30px';
        p.els.wrap.style.width = '420px';
        p.els.wrap_s.style.width = '420px';

        p.els.brd_r.appendChild(createHelp(() => {
            if (p.cfg.tabs.active === 3) {
                return 'NEW_YEAR_EVENT_YANDEX';
            }
            switch (p.tmp.event.t) {
                case 'hb':
                case 'hb3':
                case 'hb4':
                case 'hb5':
                    return 'HB_EVENT';
                case 'sun':
                case 'sun_21':
                    return 'SUN_EVENT';
                case 'new_year':
                case 'new_year_21':
                case 'new_year_22':
                case 'new_year_23':
                    return 'NEW_YEAR_EVENT';
                case 'april':
                    return 'APRIL_1_EVENT';
                case 'cosmos':
                    return 'COSMOS_EVENT';
                case 'magic':
                    return 'MAGIC_EVENT';
                case 'wind':
                    return 'WIND_EVENT';
                default:
                    return 'MAY_EVENT';
            }
        }));

        p.cfg.tabs = {active: 1};
        let tab = p.cfg.tabs.t1 = {els: {}};
        tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 30px', text: 'Итог'}, onTabClick2.bind(null, p, 1));
        p.els.brd_r.appendChild(tab.els.main);

        tab = p.cfg.tabs.t2 = {els: {}};
        tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 134px', text: 'Магазин'}, onTabClick2.bind(null, p, 2));
        p.els.brd_r.appendChild(tab.els.main);

        if (p.tmp.event.yandex && app.UserUtil.isYandex()) {
            //p.els.brd_bg.className += ' brd_block_bg_april_yandex';
            tab = p.cfg.tabs.t3 = {els: {}};
            tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 238px', text: 'Яндекс'}, onTabClick2.bind(null, p, 3));
            p.els.brd_r.appendChild(tab.els.main);
        }

        app.Popups.add(p);

        if (cfg && cfg.tabs) {
            if (cfg.tabs.active) {
                onTabClick2(p, cfg.tabs.active);
            } else if (cfg.tabs.yandex && p.cfg.tabs.t3) {
                onTabClick2(p, 3);
            }
        } else {
            onTabClick2(p, 1);
        }
    }

    function onTabClick(p, tab) {
        let tabs = p.cfg.tabs;

        tabs.active = tab;

        app.Utils.removeClass(tabs.t1.els.main, 'brd_block_tab_active');
        app.Utils.removeClass(tabs.t2.els.main, 'brd_block_tab_active');
        app.Utils.removeClass(tabs.t3.els.main, 'brd_block_tab_active');

        tabs.t1.els.main.style.zIndex = 0;
        tabs.t2.els.main.style.zIndex = 0;
        tabs.t3.els.main.style.zIndex = 0;

        if (tabs.t4) {
            app.Utils.removeClass(tabs.t4.els.main, 'brd_block_tab_active');
            tabs.t4.els.main.style.zIndex = 0;
        }

        if (tab === 1) {
            app.Utils.addClass(tabs.t1.els.main, 'brd_block_tab_active');
            tabs.t1.els.main.style.zIndex = 1;
            createQuests(p);

        } else if (tab === 2) {
            app.Utils.addClass(tabs.t2.els.main, 'brd_block_tab_active');
            tabs.t2.els.main.style.zIndex = 1;
            createShop(p);

        } else if (tab === 3) {
            app.Utils.addClass(tabs.t3.els.main, 'brd_block_tab_active');
            tabs.t3.els.main.style.zIndex = 1;
            createRatings(p);

        } else if (tab === 4) {
            app.Utils.addClass(tabs.t4.els.main, 'brd_block_tab_active');
            tabs.t4.els.main.style.zIndex = 1;
            createYandexRatings(p);
        }
    }

    function onTabClick2(p, tab) {
        let tabs = p.cfg.tabs;

        tabs.active = tab;

        app.Utils.removeClass(tabs.t1.els.main, 'brd_block_tab_active');
        app.Utils.removeClass(tabs.t2.els.main, 'brd_block_tab_active');

        tabs.t1.els.main.style.zIndex = 0;
        tabs.t2.els.main.style.zIndex = 0;

        if (tabs.t3) {
            app.Utils.removeClass(tabs.t3.els.main, 'brd_block_tab_active');
            tabs.t3.els.main.style.zIndex = 0;
        }

        if (tab === 1) {
            app.Utils.addClass(tabs.t1.els.main, 'brd_block_tab_active');
            tabs.t1.els.main.style.zIndex = 1;
            create2_content(p);

        } else if (tab === 2) {
            app.Utils.addClass(tabs.t2.els.main, 'brd_block_tab_active');
            tabs.t2.els.main.style.zIndex = 1;
            createShop(p);

        } else if (tab === 3) {
            app.Utils.addClass(tabs.t3.els.main, 'brd_block_tab_active');
            tabs.t3.els.main.style.zIndex = 1;
            createYandexRatings(p);
        }
    }

    function clearContent(p) {
        if (p.tmp.display) {
            p.tmp.display.list.forEach(function(el) {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            delete p.tmp.display;
        }
        delete p.tmp.shop;
        app.Utils.removeAllChild(p.scroll.el);
        app.Utils.removeClass(p.els.brd_bg, 'brd_block_bg_april_yandex');
    }

    function createQuests(p) {
        clearContent(p);

        p.tmp.display = {list: []};

        let el;
        p.els.brd_r.appendChild(el = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: getEventName(p.tmp.event.t)}));
        p.tmp.display.list.push(el);

        el = app.Utils.createDIV({class: 'list_s', style: 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 35px; min-height: 75px; cursor: pointer'});
        p.els.brd_r.insertBefore(el, p.els.wrap);
        p.tmp.display.list.push(el);

        switch (p.tmp.event.t) {
            case 'hb':
            case 'hb3':
            case 'hb4':
            case 'hb5':
                el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_hb res_icon_inline"></span>кексики за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: ...</div></div>';
                break;
            case 'sun':
            case 'sun_21':
                el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_sun res_icon_inline"></span>частицы света за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: ...</div></div>';
                break;
            case 'new_year':
            case 'new_year_21':
            case 'new_year_22':
            case 'new_year_23':
                el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_snow res_icon_inline"></span>снежинки за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: ...</div></div>';
                break;
            case 'april':
                el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_april res_icon_inline"></span>колпаки за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: ...</div></div>';
                break;
            case 'cosmos':
                el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_cosmos res_icon_inline"></span>звёзды за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: ...</div></div>';
                break;
            case 'magic':
                el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_magic res_icon_inline"></span>частицы магии за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: ...</div></div>';
                break;
            case 'wind':
                el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_wind res_icon_inline"></span>змеев за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: ...</div></div>';
                break;
            default:
                el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_flowers res_icon_inline"></span>цветы за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: ...</div></div>';
                break;
        }

        let list = [];

        if (p.tmp.event.me) {
            let qlist = p.tmp.event.me.quests.daily;
            for (let key in qlist) {
                list.push(qlist[key]);
            }

            qlist = p.tmp.event.me.quests.event;
            for (let key in qlist) {
                list.push(qlist[key]);
            }
        }

        for (let i = 0; i < list.length; i++) {
            if (list[i].step === -1) {
                list.splice(i--, 1);
            }
        }

        list.sort((e1, e2) => {
            let c1 = app.UserUtil.isMayEventQuestComplete(e1);
            let c2 = app.UserUtil.isMayEventQuestComplete(e2);
            if (c1) {
                if (!c2) return -1;
            }
            if (c2) return 1;
            return e2.lut - e1.lut;
        });

        list.forEach((qj) => {
            let els = {};
            let el = app.Utils.createDIV({class: 'quest_row'});

            if (app.UserUtil.isMayEventQuestComplete(qj)) {
                let a;
                el.appendChild(a = app.Utils.createA({class: 'btn_g btn_gsm_c', style: 'top: 15px; left: 320px', text: 'Получить'}, function() {
                    if (app.Utils.hasClass(a, 'bw')) return;
                    app.Utils.addClass(a, 'bw');

                    let rects = {};
                    if (qj.reward.flowers) rects.flowers = els.reward_flowers.getBoundingClientRect();
                    if (qj.reward.sun) rects.sun = els.reward_sun.getBoundingClientRect();
                    if (qj.reward.wind) rects.wind = els.reward_wind.getBoundingClientRect();
                    if (qj.reward.hb) rects.hb = els.reward_hb.getBoundingClientRect();
                    if (qj.reward.snowf) rects.snowf = els.reward_snowf.getBoundingClientRect();
                    if (qj.reward.april) rects.april = els.reward_april.getBoundingClientRect();
                    if (qj.reward.cosmos) rects.cosmos = els.reward_cosmos.getBoundingClientRect();
                    if (qj.reward.magic) rects.magic = els.reward_magic.getBoundingClientRect();
                    if (qj.reward.gems) rects.gems = els.reward_gems.getBoundingClientRect();

                    app.Network.command({cmd: 'MayEventQuestComplete', type: qj.type}, function(data) {
                        if (data.error) {
                            switch (data.error.code) {
                                case 1:
                                    app.Utils.showInfo('Задание не найдено');
                                    break;
                                case 2:
                                    app.Utils.showInfo('Задание уже выполнено');
                                    break;
                                case 3:
                                    app.Utils.showInfo('Задание еще не выполнено');
                                    break;

                                default:
                                    app.Utils.showInfo('Попробуйте позже');
                                    break;
                            }
                        } else {
                            if (p.tmp._closed) return;

                            if (qj.reward.flowers) animateRewardFlowers(rects.flowers, qj.reward.flowers);
                            if (qj.reward.sun) animateRewardSun(rects.sun, qj.reward.sun);
                            if (qj.reward.wind) animateRewardWind(rects.wind, qj.reward.wind);
                            if (qj.reward.hb) animateRewardHb(rects.hb, qj.reward.hb);
                            if (qj.reward.snowf) animateRewardSnowflake(rects.snowf, qj.reward.snowf);
                            if (qj.reward.april) animateRewardApril(rects.april, qj.reward.april);
                            if (qj.reward.cosmos) animateRewardCosmos(rects.cosmos, qj.reward.cosmos);
                            if (qj.reward.magic) animateRewardMagic(rects.magic, qj.reward.magic);
                            if (qj.reward.gems) animateRewardGems(rects.gems, qj.reward.gems);

                            p.cfg.onUpdate();
                        }
                    });
                }));
            }

            let el1 = app.Utils.createDIV({class: 'mail_top_r mail_top_rw', style: 'margin-left: 5px'});
            el1.appendChild(app.Utils.createDIV({class: 'dbl major str', text: getQuestName(qj)}));

            el1.appendChild(app.Utils.createDIV({class: 'mt5 info dbl', text: getQuestDescription(qj)}));

            let progress = qj.progress;
            let required = qj.required;

            if (qj.type === 'D_BLITZ_TOP') {
                progress = progress > 0 && progress <= required ? required : 0;
            }

            let prg = progress * 100 / required;
            prg = Math.min(100, prg);

            el1.appendChild(app.Utils.createDIV({class: 'log_dmg', style: 'margin-top: 5px; margin-bottom: 5px', html: '<div class="log_dmg_prg" style="width: {2}%;"></div><div class="log_dmg_patch"></div><div class="log_dmg_text">{0}/{1}</div>'.format(progress, required, prg)}));

            let el2 = app.Utils.createDIV({class: 'mtb5', style: 'min-height: 20px'});
            el2.appendChild(app.Utils.createText('Награда: '));
            if (qj.reward.flowers) {
                el2.appendChild(els.reward_flowers = app.Utils.createSPAN({class: 'res_icon res_flower res_icon_inline'}));
                el2.appendChild(app.Utils.createText(app.Utils.toMoney(qj.reward.flowers)));
            }
            if (qj.reward.sun) {
                el2.appendChild(els.reward_sun = app.Utils.createSPAN({class: 'res_icon res_sun res_icon_inline'}));
                el2.appendChild(app.Utils.createText(app.Utils.toMoney(qj.reward.sun)));
            }
            if (qj.reward.wind) {
                el2.appendChild(els.reward_wind = app.Utils.createSPAN({class: 'res_icon res_wind res_icon_inline'}));
                el2.appendChild(app.Utils.createText(app.Utils.toMoney(qj.reward.wind)));
            }
            if (qj.reward.hb) {
                el2.appendChild(els.reward_hb = app.Utils.createSPAN({class: 'res_icon res_hb res_icon_inline'}));
                el2.appendChild(app.Utils.createText(app.Utils.toMoney(qj.reward.hb)));
            }
            if (qj.reward.snowf) {
                el2.appendChild(els.reward_snowf = app.Utils.createSPAN({class: 'res_icon res_snow res_icon_inline'}));
                el2.appendChild(app.Utils.createText(app.Utils.toMoney(qj.reward.snowf)));
            }
            if (qj.reward.april) {
                el2.appendChild(els.reward_april = app.Utils.createSPAN({class: 'res_icon res_april res_icon_inline'}));
                el2.appendChild(app.Utils.createText(app.Utils.toMoney(qj.reward.april)));
            }
            if (qj.reward.cosmos) {
                el2.appendChild(els.reward_cosmos = app.Utils.createSPAN({class: 'res_icon res_cosmos res_icon_inline'}));
                el2.appendChild(app.Utils.createText(app.Utils.toMoney(qj.reward.cosmos)));
            }
            if (qj.reward.magic) {
                el2.appendChild(els.reward_magic = app.Utils.createSPAN({class: 'res_icon res_magic res_icon_inline'}));
                el2.appendChild(app.Utils.createText(app.Utils.toMoney(qj.reward.magic)));
            }
            if (qj.reward.gems) {
                el2.appendChild(els.reward_gems = app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gem'}));
                if (app.UserUtil.isMayEventQuestComplete(qj) && app.UserUtil.isPremiumActive()) {
                    el2.appendChild(app.Utils.createSPAN({class: 'r_green', text: qj.reward.gems * 2}));
                } else {
                    el2.appendChild(app.Utils.createText(app.Utils.toMoney(qj.reward.gems)));
                }
            }
            el1.appendChild(el2);

            el2 = app.Utils.createDIV({style: 'position: relative; height: 20px; margin-top: 10px'});
            for (let i = 0; i < qj.steps; i++) {
                let step = i + 1;
                el2.appendChild(app.Utils.createDIV({class: 'menu_note' + (qj.step > step || qj.step === step && app.UserUtil.isMayEventQuestComplete(qj) ? ' menu_note_g' : ''), style: 'left: {0}px'.format(22 * i)}));
            }
            el1.appendChild(el2);

            el.appendChild(el1);
            p.scroll.el.appendChild(el);
            p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb5'}));
        });

        p.tmp.update = function() {
            if (p.tmp._closed || p.cfg.tabs.active !== 1) return;
            let tl = p.tmp.event.et - app.TimeUtil.now();
            tl = app.TimeUtil.formatToHumanTime(tl, 2);
            switch (p.tmp.event.t) {
                case 'hb':
                case 'hb3':
                case 'hb4':
                case 'hb5':
                    el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_hb res_icon_inline"></span>кексики за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: {0}</div></div>'.format(tl);
                    break;
                case 'sun':
                case 'sun_21':
                    el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_sun res_icon_inline"></span>частицы света за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: {0}</div></div>'.format(tl);
                    break;
                case 'new_year':
                case 'new_year_21':
                case 'new_year_22':
                case 'new_year_23':
                    el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_snow res_icon_inline"></span>снежинки за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: {0}</div></div>'.format(tl);
                    break;
                case 'april':
                    el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_april res_icon_inline"></span>колпаки за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: {0}</div></div>'.format(tl);
                    break;
                case 'cosmos':
                    el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_cosmos res_icon_inline"></span>звёзды за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: {0}</div></div>'.format(tl);
                    break;
                case 'magic':
                    el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_magic res_icon_inline"></span>частицы магии за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: {0}</div></div>'.format(tl);
                    break;
                case 'wind':
                    el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_wind res_icon_inline"></span>змеев за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: {0}</div></div>'.format(tl);
                    break;
                default:
                    el.innerHTML = '<div class="cntr"><div>Получай <span class="res_icon res_flowers res_icon_inline"></span>цветы за выполнение заданий и обменивай их на ценные награды!</div><div class="major big str mt5">До конца события: {0}</div></div>'.format(tl);
                    break;
            }
            TweenMax.delayedCall(1, p.tmp.update);
        };
        TweenMax.delayedCall(1, p.tmp.update);

        let availableHeight = p.tmp.availableHeight - 145;
        p.els.wrap.style.left = '30px';
        p.els.wrap.style.top = '140px';
        p.els.wrap.style.width = '420px';
        p.els.wrap_s.style.width = '420px';
        p.els.wrap.style.height = availableHeight + 'px';

        TweenMax.delayedCall(0.001, function() {
            if (p.tmp._closed) return;

            p.scroll.availableHeight = availableHeight;
            p.scroll.contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
            p.scroll.top = 0;
            p.scroll.topMax = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.contentRequiredHeight - p.scroll.availableHeight: 0;
            p.scroll.el.style.top = p.scroll.top + 'px';
        });
    }

    function createShop(p) {
        clearContent(p);

        p.tmp.shop = app.Model.user.shop3;
        p.tmp.shop.type = 3;

        p.tmp.display = {list: []};

        let create = function() {
            let tmp = p.tmp.tab = {};

            tmp.main = app.Utils.createDIV({class: 'battle_advice', style: 'top: 15px'});
            tmp.main.appendChild(app.Utils.createText('Новые товары через: '));
            tmp.main.appendChild(tmp.time = app.Utils.createSPAN({class: 'info', text: app.TimeUtil.formatToHumanTime(p.tmp.shop.rt - app.TimeUtil.now(), 2)}));
            tmp.main.appendChild(tmp.refresh = app.Utils.createA({class: 'tdn'}, function() {
                if (app.Utils.hasClass(tmp.refresh, 'bw')) return;
                app.Utils.addClass(tmp.refresh, 'bw');
                let type = p.tmp.shop.type;
                app.Network.command({cmd: 'ShopReset', type: type}, function(data) {
                    if (data.error) {
                        app.Utils.processErrors(data.error);
                    } else {
                        app.Model.user.shop3.lvt = app.TimeUtil.now();
                        if (p.tmp._closed) return;
                        p.cfg.onUpdate();
                        app.Utils.showInfo('Магазин обновлен', {type: 0});
                    }
                });
            }));
            tmp.refresh.appendChild(app.Utils.createSPAN({class: 'refresh_btn ml5'}));
            app.Utils.appendPriceBlock(tmp.refresh, p.tmp.shop.rp);
            p.els.brd_r.appendChild(tmp.main);
            p.tmp.display.list.push(tmp.main);

            p.tmp.shop.slots = [];
            p.tmp.shop.list.forEach(function(entry, i) {
                let cfg = createSlot(i, entry);

                let col = i % 2,
                    row = Math.floor(i / 2);
                let left = 25 + 217 * col,
                    top = 0;

                if (row > 0) {
                    for (let i1 = i - 2; i1 >= 0; i1 -= 2) {
                        let ep = p.tmp.shop.list[i1];
                        if (ep.card) {
                            top += 135;
                        } else {
                            top += 120;
                        }
                    }
                }

                cfg.els.main.style.top = top + 'px';
                cfg.els.main.style.left = left + 'px';

                p.tmp.shop.slots.push(cfg);
                p.scroll.el.appendChild(cfg.els.main);
            });
        };

        let createSlot = function(i, entry) {
            let cfg = {els: {}};

            cfg.els.main = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; width: 208px; height: 110px'});

            let cfgItem;
            let cfgCard;
            let name;

            if (entry.item) {
                cfgItem = app.CFGUtil.getItemByID(entry.item);
                name = cfgItem.name;
            } else if (entry.card) {
                cfgCard = app.CFGUtil.getCardByID(entry.card);
                name = cfgCard.name;
                cfg.els.main.style.height = '125px';
            } else if (entry.tickets) {
                name = 'Часы';
            } else if (entry.dust) {
                name = 'Рунная пыль';
            } else if (entry.sd) {
                name = 'Каменная пыль';
            } else if (entry.gold) {
                name = 'Золото';
            }

            cfg.els.main.appendChild(app.Utils.createDIV({class: 'cntr str major pt5', style: 'font-size: 12px', text: name}));

            if (cfgItem) {
                let div = app.Utils.createDIV({class: 'item_slot ' + app.Utils.getItemQualityClass(cfgItem.quality), style: {left: '12px', top: '25px'}});
                div.appendChild(app.Utils.createIMG(cfgItem.img, {w: 55}));
                div.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', text: entry.value}));
                div.appendChild(app.Utils.createSPAN({class: 'brd'}));
                app.Utils.addItemInfoOnClick1(div, {item: entry.item});
                cfg.els.main.appendChild(div);

            } else if (cfgCard) {
                let div = app.Utils.createDIV({class: 'sh_card', style: 'left: 8px; top: 25px; transform: scale(0.5)'});
                let qClass = app.Utils.getCardQualityClass(cfgCard.quality);
                if (qClass) {
                    app.Utils.addClass(div, qClass);
                }
                div.appendChild(app.Utils.createIMG(cfgCard.img, {class: 'sh_skill'}));
                div.appendChild(app.Utils.createDIV({class: 'sh_card_brd'}));
                let div1 = app.Utils.createDIV({class: 'sh_card_elem'});
                div1.appendChild(app.Utils.createIMG(app.CFGUtil.getCardElemIMGByID(cfgCard.id), {w: 30, h: 30}));
                div.appendChild(div1);
                div.appendChild(app.Utils.createDIV({class: 'sh_card_lamp_rdy'}));
                div.appendChild(app.Utils.createSPAN({class: 'txt cntr', text: entry.value}));
                app.Utils.addItemInfoOnClick1(div, {card: entry.card});
                cfg.els.main.appendChild(div);

            } else if (entry.tickets) {
                let div = app.Utils.createDIV({class: 'item_slot item_slot_full', style: 'left: {0}px; top: {1}px'.format(12, 25)});
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_raid', style: 'left: 15px; top: 9px'}));
                div.appendChild(app.Utils.createSPAN({class: 'txt txt_need', text: entry.value}));
                div.appendChild(app.Utils.createSPAN({class: 'brd'}));
                app.Utils.addItemInfoOnClick1(div, {tickets: 1});
                cfg.els.main.appendChild(div);

            } else if (entry.dust) {
                let div = app.Utils.createDIV({class: 'item_slot item_slot_full', style: 'left: {0}px; top: {1}px'.format(12, 25)});
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_dust', style: 'left: 15px; top: 9px'}));
                div.appendChild(app.Utils.createSPAN({class: 'txt txt_need', text: entry.value}));
                div.appendChild(app.Utils.createSPAN({class: 'brd'}));
                app.Utils.addItemInfoOnClick1(div, {dust: 1});
                cfg.els.main.appendChild(div);

            } else if (entry.gold) {
                let div = app.Utils.createDIV({class: 'item_slot item_slot_full', style: 'left: {0}px; top: {1}px'.format(12, 25)});
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 12px; top: 15px; transform: rotate(-18deg);'}));
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 18px; top: 22px; transform: rotate(40deg) scale(0.7);'}));
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 36px; top: 28px; transform: rotate(-40deg) scale(0.7);'}));
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 18px; top: 34px; transform: scale(1) rotate(-52deg);'}));
                div.appendChild(app.Utils.createSPAN({class: 'txt txt_need', text: app.Utils.toMoney1(entry.value)}));
                div.appendChild(app.Utils.createSPAN({class: 'brd'}));
                app.Utils.addItemInfoOnClick1(div, {gold: 1});
                cfg.els.main.appendChild(div);
            }

            if (entry.bought) {
                let div = app.Utils.createDIV({class: 'slot_info', style: 'left: 82px'});
                div.appendChild(app.Utils.createDIV({class: 'minor cntr str', style: 'position: absolute; width: 115px; left: 0px; top: 15px', text: 'Куплено'}));
                cfg.els.main.appendChild(div);
            } else {
                let div = app.Utils.createDIV({class: 'slot_info', style: 'left: 82px'});
                let div1 = app.Utils.createDIV({class: 'cntr w115'});
                app.Utils.appendPriceBlock(div1, entry.price);
                div.appendChild(div1);

                div.appendChild(cfg.els.buy_a = app.Utils.createA({class: 'btn_g btn_gs_c', style: 'left: 0px; top: 25px', text: 'Купить'}, function() {
                    if (entry.tickets && app.Model.user.level < 9) {
                        app.Utils.showInfo('Часы достпны с 10 уровня');
                        return;
                    }
                    if (!app.UserUtil.canPay(entry.price)) {
                        app.EventDispatcher.emit('not enough resources', {price: entry.price});
                        return;
                    }
                    if (app.Utils.hasClass(cfg.els.buy_a, 'bw')) {
                        app.Utils.showInfo('В процессе');
                        return;
                    }

                    p.tmp.shop.slots.forEach(function(e) {
                        if (e.buy_a) app.Utils.addClass(e.buy_a, 'bw');
                    });

                    let type = p.tmp.shop.type;
                    app.Network.command({cmd: 'ShopBuyItem', type: type, slot: i}, function(data) {
                        if (data.error) {
                            app.Utils.processErrors(data.error);
                        } else {
                            entry.bought = 1;

                            if (entry.item) app.UserUtil.addItem(entry.item, entry.value);
                            if (entry.card) app.UserUtil.addCard(entry.card, entry.value);

                            app.EventDispatcher.emit('user resources changed');

                            app.Utils.showInfo('Куплено', {type: 0});
                        }

                        if (!p || type !== p.tmp.shop.type) return;

                        let cfg_new = createSlot(i, entry);
                        let cfg_old = p.tmp.shop.slots[i];
                        p.tmp.shop.slots[i] = cfg_new;
                        p.tmp.shop.slots.forEach(function(e) {
                            if (e.buy_a) app.Utils.removeClass(e.buy_a, 'bw');
                        });
                        cfg_new.els.main.style.top = cfg_old.els.main.style.top;
                        cfg_new.els.main.style.left = cfg_old.els.main.style.left;
                        p.scroll.el.replaceChild(cfg_new.els.main, cfg_old.els.main);
                    });
                }));

                if (entry.tickets && app.Model.user.level < 9) {
                    app.Utils.addClass(cfg.els.buy_a, 'bw');
                }

                cfg.els.main.appendChild(div);
            }

            return cfg;
        };

        create();

        let availableHeight = p.tmp.availableHeight - 70;
        p.els.wrap.style.left = '0px';
        p.els.wrap.style.top = '70px';
        p.els.wrap.style.width = '480px';
        p.els.wrap_s.style.width = '480px';
        p.els.wrap.style.height = availableHeight + 'px';

        TweenMax.delayedCall(0.001, function() {
            if (p.tmp._closed) return;

            let contentRequiredHeight = 0;
            for (let i = 0; i < p.tmp.shop.slots.length; i += 2) {
                contentRequiredHeight += app.LAYOUT.convert0(p.tmp.shop.slots[i].els.main.getBoundingClientRect().height);
            }

            p.scroll.top = 0;
            p.scroll.topMax = p.scroll.availableHeight < contentRequiredHeight ? contentRequiredHeight - p.scroll.availableHeight : 0;
            p.scroll.el.style.top = p.scroll.top + 'px';
        });
    }

    function createRatings(p) {
        clearContent(p);

        p.tmp.display = {list: []};

        let sortType, sortName;
        if (!p.tmp.sort_type) p.tmp.sort_type = 'today';

        switch (p.tmp.sort_type) {
            case 'today':
                sortType = 'сегодня';
                sortName = 'Рейтинг за сегодня';
                break;
            case 'yesterday':
                sortType = 'вчера';
                sortName = 'Рейтинг за вчера';
                break;
            case 'total':
                sortType = 'событие';
                sortName = 'Рейтинг за событие';
                break;
        }

        let el;
        p.els.brd_r.appendChild(el = app.Utils.createA({class: 'btn_d', style: 'left: 30px; top: 5px; transform: scale(0.9);', text: sortType}, function() {
            switch (p.tmp.sort_type) {
                case 'today':
                    p.tmp.sort_type = 'yesterday';
                    break;
                case 'yesterday':
                    p.tmp.sort_type = 'total';
                    break;
                case 'total':
                    p.tmp.sort_type = 'today';
                    break;
            }
            onTabClick(p, 3);
        }));
        p.tmp.display.list.push(el);

        p.els.brd_r.appendChild(el = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: sortName}));
        p.tmp.display.list.push(el);

        el = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 25px; top: 40px; width: 415px; padding: 5px; height: 55px'}, app.EventDispatcher.emit.bind(null, 'user info', app.Model.user.id));
        let place;
        el.appendChild(place = app.Utils.createDIV({class: 'rating_top_p rating_top_m', html: '<span class="normal" style="font-size: 12px; white-space: nowrap;">Моё место</span><div>?</div>'}));

        let avatar = app.Utils.createAvatarComponent(app.Model.user.rank, app.Model.user.avatar.img);
        avatar.els.main.style = 'transform: scale(0.7); left: 80px; top: 5px';
        el.appendChild(avatar.els.main);

        let points;
        el.appendChild(points = app.Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 130px; padding-top: 5px', html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Собрано {1}:</span><span class="flr mt5"> ?</span>'.format(app.UserUtil.getUserNameUpper0(app.Model.user.name), getEventResName(p.tmp.event.t))}));
        p.els.brd_r.appendChild(el);
        p.tmp.display.list.push(el);

        app.Network.command({cmd: 'MayEventRatings', type: p.tmp.sort_type}, function(data) {
            if (p.tmp._closed) return;
            if (p.cfg.tabs.active !== 3) return;

            let event = app.Model.user.may_event;
            if (!event) return;

            const me = event.me;
            const meRating = me.ratings[p.tmp.sort_type];
            place.innerHTML = '<span class="normal" style="font-size: 12px; white-space: nowrap;">Моё место</span><div>{0}</div>'.format(meRating ? (meRating.place === 0 ? '?' : meRating.place) : '?');
            points.innerHTML = '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Собрано {2}:</span><span class="flr mt5"> {1}</span>'.format(app.UserUtil.getUserNameUpper0(app.Model.user.name), meRating ? app.Utils.toMoney(meRating.points) : '?', getEventResName(event.t));

            if (data.rating) {
                data.rating.list.forEach((entry, i) => {
                    const el = app.Utils.createDIV({class: 'rating_row'}, app.EventDispatcher.emit.bind(null, 'user info', entry.u.id));
                    if (entry.p <= 3) {
                        el.appendChild(app.Utils.createDIV({class: 'rating_top_p rating_top_p' + entry.p}));
                    } else {
                        el.appendChild(app.Utils.createDIV({class: 'rating_top_p', text: entry.p}));
                    }

                    let avatar = app.Utils.createAvatarComponent(entry.u.r, entry.u.a);
                    avatar.els.main.style = 'transform: scale(0.5); left: 40px';
                    el.appendChild(avatar.els.main);

                    el.appendChild(app.Utils.createDIV({class: 'rating_row_r', html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Собрано {2}:</span><span class="flr mt5">{1}</span>'.format(app.UserUtil.getUserNameUpper0(entry.u.n), app.Utils.toMoney(entry.v), getEventResName(event.t))}));
                    p.scroll.el.appendChild(el);
                    p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb5'}));
                });
            }

            TweenMax.delayedCall(0.001, function() {
                if (p.tmp._closed) return;
                p.scroll.availableHeight = availableHeight;
                p.scroll.contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                p.scroll.top = 0;
                p.scroll.topMax = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.contentRequiredHeight - p.scroll.availableHeight: 0;
                p.scroll.el.style.top = p.scroll.top + 'px';
            });
        });

        let availableHeight = p.tmp.availableHeight - 120;
        p.els.wrap.style.left = '30px';
        p.els.wrap.style.top = '120px';
        p.els.wrap.style.width = '420px';
        p.els.wrap_s.style.width = '420px';
        p.els.wrap.style.height = availableHeight + 'px';

        TweenMax.delayedCall(0.001, function() {
            if (p.tmp._closed) return;

            p.scroll.availableHeight = availableHeight;
            p.scroll.contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
            p.scroll.top = 0;
            p.scroll.topMax = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.contentRequiredHeight - p.scroll.availableHeight: 0;
            p.scroll.el.style.top = p.scroll.top + 'px';
        });
    }

    function createYandexRatings(p) {
        clearContent(p);

        console.log('rating');

        app.Utils.addClass(p.els.brd_bg, 'brd_block_bg_april_yandex');

        p.tmp.display = {list: []};

        let availableHeight = p.tmp.availableHeight - 120;
        p.els.wrap.style.left = '30px';
        p.els.wrap.style.top = '120px';
        p.els.wrap.style.width = '420px';
        p.els.wrap_s.style.width = '420px';
        p.els.wrap.style.height = availableHeight + 'px';

        let el;
        p.els.brd_r.appendChild(el = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Рейтинг Яндекса'}));
        p.tmp.display.list.push(el);

        el = app.Utils.createDIV({
            class: 'list_s',
            style: 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 35px; min-height: 75px; cursor: pointer; min-height: 50px;',
            html: '<div class="cntr"><div>3 игрока Яндекс.Игр, набравшие больше всего снежинок, получат дополнительный приз:<br><span class="major str big">Яндекс.Станцию Мини!</span></div></div></div>'
        });
        p.els.brd_r.appendChild(el);
        p.tmp.display.list.push(el);

        app.Network.command({cmd: 'MayEventRatings', type: 'yandex'}, data => {
            if (p.tmp._closed) return;

            let event = app.Model.user.may_event;
            if (!event) return;

            if (data.rating) {
                data.rating.list.forEach(function(entry, i) {
                    let el = app.Utils.createDIV({class: 'rating_row'}, app.EventDispatcher.emit.bind(null, 'user info', entry.u.id));
                    if (entry.p <= 3) {
                        el.appendChild(app.Utils.createDIV({class: 'rating_top_p rating_top_p' + entry.p}));
                    } else {
                        el.appendChild(app.Utils.createDIV({class: 'rating_top_p', text: entry.p}));
                    }

                    let avatar = app.Utils.createAvatarComponent(entry.u.r, entry.u.a);
                    avatar.els.main.style = 'transform: scale(0.5); left: 40px';
                    el.appendChild(avatar.els.main);

                    el.appendChild(app.Utils.createDIV({class: 'rating_row_r', html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Собрано {2}:</span><span class="flr mt5">{1}</span>'.format(app.UserUtil.getUserNameUpper0(entry.u.n), app.Utils.toMoney(entry.v), getEventResName(event.t))}));
                    p.scroll.el.appendChild(el);
                    p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb5'}));
                });

                let me = data.rating.me;
                if (me && me.p > 3) {
                    let lastInRating = data.rating.list[data.rating.list.length - 1];
                    let el = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 0px; top: 190px; width: 405px; padding: 5px; height: 55px;'});
                    let avatar = app.Utils.createAvatarComponent(me.u.r, me.u.a);
                    avatar.els.main.style = 'transform: scale(0.7); left:10px; top: 10px';
                    el.appendChild(avatar.els.main);
                    el.appendChild(app.Utils.createDIV({
                        class: 'rating_row_r',
                        style: 'margin-left: 65px; padding-top: 5px;',
                        html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt10 dbl fll">Снежинок до попадания в этот рейтинг:</span><span class="flr mt10"><span class="res_icon res_snow res_icon_inline"></span> {1}</span>'.format(app.UserUtil.getUserNameUpper0(me.u.n), app.Utils.toMoney(lastInRating.v - me.v + 1))
                    }));
                    p.scroll.el.appendChild(el);
                }
            }

            p.scroll.el.appendChild(app.Utils.createDIV({class: 'cntr', html: '<a href="#">Правила конкурса от Яндекса</a>'}, () => {
                createHelp(() => 'NEW_YEAR_EVENT_YANDEX').click();
            }));

            TweenMax.delayedCall(0.001, () => {
                if (p.tmp._closed) return;

                p.scroll.availableHeight = availableHeight;
                p.scroll.contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                if (data.rating && data.rating.me && data.rating.me.p > 3) {
                    p.scroll.contentRequiredHeight = 160 + 100;
                }
                p.scroll.top = 0;
                p.scroll.topMax = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.contentRequiredHeight - p.scroll.availableHeight: 0;
                p.scroll.el.style.top = p.scroll.top + 'px';
            });
        });

        TweenMax.delayedCall(0.001, () => {
            if (p.tmp._closed) return;
            p.scroll.availableHeight = availableHeight;
            p.scroll.contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
            p.scroll.top = 0;
            p.scroll.topMax = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.contentRequiredHeight - p.scroll.availableHeight: 0;
            p.scroll.el.style.top = p.scroll.top + 'px';
        });
    }

    function create2_content(p) {
        clearContent(p);

        p.tmp.display = {list: []};

        let  el;
        p.els.brd_r.appendChild(el = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: getEventName(p.tmp.event.t)}));
        p.tmp.display.list.push(el);

        el = app.Utils.createDIV({class: 'list_s', style: 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 35px; min-height: 75px; cursor: pointer; min-height: 50px'});
        el.innerHTML = '<div class="cntr"><div>Событие завершилось!</div><div>Твое место в рейтинге: <span class="str major">...</span></div><div class="major big str mt5">Больше всех {0} набрали:</div></div>'.format(getEventResName(p.tmp.event.t));
        p.els.brd_r.appendChild(el);
        p.tmp.display.list.push(el);

        app.Network.command({cmd: 'MayEventRatings', type: 'total'}, function(data) {
            if (p.tmp._closed) return;

            let may_event = app.Model.user.may_event;
            if (may_event && may_event.me) {
                el.innerHTML = '<div class="cntr"><div>Событие завершилось!</div><div>Твое место в рейтинге: <span class="str major">{0}</span></div><div class="major big str mt5">Больше всех {1} набрали:</div></div>'.format(may_event.me.ratings.total.place, getEventResName(may_event.t));
            }

            if (data.rating) {
                data.rating.list.forEach(function(entry, i) {
                    let  el = app.Utils.createDIV({class: 'rating_row'}, app.EventDispatcher.emit.bind(null, 'user info', entry.u.id));
                    if (entry.p <= 3) {
                        el.appendChild(app.Utils.createDIV({class: 'rating_top_p rating_top_p' + entry.p}));
                    } else {
                        el.appendChild(app.Utils.createDIV({class: 'rating_top_p', text: entry.p}));
                    }

                    let  avatar = app.Utils.createAvatarComponent(entry.u.r, entry.u.a);
                    avatar.els.main.style = 'transform: scale(0.5); left: 40px';
                    el.appendChild(avatar.els.main);

                    el.appendChild(app.Utils.createDIV({class: 'rating_row_r', html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Собрано {2}:</span><span class="flr mt5">{1}</span>'.format(app.UserUtil.getUserNameUpper0(entry.u.n), entry.v, getEventResName(may_event.t))}));
                    p.scroll.el.appendChild(el);
                    p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb5'}));
                });
            }

            TweenMax.delayedCall(0.001, function() {
                if (p.tmp._closed) return;

                p.scroll.availableHeight = availableHeight;
                p.scroll.contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                p.scroll.top = 0;
                p.scroll.topMax = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.contentRequiredHeight - p.scroll.availableHeight: 0;
                p.scroll.el.style.top = p.scroll.top + 'px';
            });
        });

        let  availableHeight = p.tmp.availableHeight - 120;
        p.els.wrap.style.top = '120px';
        p.els.wrap.style.height = availableHeight + 'px';
        p.els.wrap.style.left = '30px';
    }

    function createHelp(getSection) {
        let el = app.Utils.createDIV({class: 'help'});
        el.style.zIndex = app.Popups.getNextZIndex();
        el.onclick = function() {
            app.SoundManager.playClick();
            app.Network.command({cmd: 'Help', section: getSection()}, function (data) {
                if (data.error) {
                } else {
                    let p = app.Popups.createPopup({});

                    p.els.popup.style.opacity = 0;
                    p.els.popup.style.position = 'relative';
                    p.els.popup.style.left = '0px';

                    let wrap = app.Utils.createDIV({class: 'wrap', style: 'top: 10px; width: 430px'});
                    let wrap_s = app.Utils.createDIV({class: 'wrap_scroll', style: 'width: 430px'});
                    wrap.appendChild(wrap_s);
                    p.els.popup.appendChild(wrap);

                    p.scroll = {el: wrap_s, top: 0, topMax: 0};
                    p.scroll.el.style.top = p.scroll.top + 'px';

                    let content = data.content;
                    let header;
                    if (content && content.indexOf('header=') === 0) {
                        let idx = content.indexOf(';');
                        header = content.substr(7, idx - 7);
                        content = content.substr(idx + 1);
                        p.els.popup.appendChild(header = app.Utils.createDIV({class: 'header', style: 'left: 90px; top: -25px', text: header}));
                    }

                    let createRewards = function(daily) {
                        let el = app.Utils.createDIV({class: 'mlra', style: 'width: 300px'});
                        let rjCFG = daily ? app.Model.cfg.cfgNY2019.rewards : app.Model.cfg.cfgNY2019.rewards1;
                        let myEntry;
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
                            let el_record;
                            el_r.appendChild(el_record = app.Utils.createSPAN({class: 'str fll pt3 major', text: place}));
                            if (!myEntry) {
                                let rating = daily ? app.Model.user.may_event.me.ratings.today : app.Model.user.may_event.me.ratings.total;
                                if (rating && rating.place > 0 && rating.place <= entry.p) {
                                    myEntry = entry;
                                    el_record.className = 'str fll pt3 r_green';
                                }
                            }
                            let el_c = app.Utils.createDIV({class: 'flr'});
                            if (entry.premium) {
                                const time = app.TimeUtil.formatToHumanTime(entry.premium, 1) + '.';
                                el_c.appendChild(app.Utils.createSPAN({class: 'vip_bg_crown_inline'}));
                                el_c.appendChild(app.Utils.createText(time));
                            }
                            if (entry.dust) {
                                el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_dust'}));
                                el_c.appendChild(app.Utils.createText(entry.dust.min));
                            }
                            if (entry.sd) {
                                el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_dust_stone'}));
                                el_c.appendChild(app.Utils.createText(entry.sd.min));
                            }
                            if (entry.gold) {
                                el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gold'}));
                                el_c.appendChild(app.Utils.createText(entry.gold.min));
                            }
                            if (entry.gems) {
                                el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gem'}));
                                el_c.appendChild(app.Utils.createText(entry.gems.min));
                            }
                            if (entry.card) {
                                let min = entry.card.count.min;
                                el_c.appendChild(app.Utils.createDIV({class: 'flr vm', html: '<span class="res_icon res_icon_inline res_card_q1"></span>{0}'.format(min)}));
                            }
                            el_r.appendChild(el_c);
                            el.appendChild(el_r);
                        });
                        return el;
                    };

                    let el1 = createRewards(1);
                    let el2 = createRewards(0);

                    if (!content) {
                        content = '{0}{1}';
                    }
                    p.scroll.el.appendChild(app.Utils.createDIV({style: 'width: 410px; margin: 10px;', html: content.format(el1.innerHTML, el2.innerHTML)}));

                    app.Popups.add(p);

                    TweenMax.delayedCall(0.001, function() {
                        let availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
                        let contentRequiredHeight = app.LAYOUT.convert0(wrap_s.getBoundingClientRect().height);
                        let availableHeight = Math.min(contentRequiredHeight, availableHeight0);

                        let top;
                        if (app.Utils.isMobile()) {
                            top = (availableHeight0 - availableHeight) / 2;
                            top = Math.max(80, top);
                        } else {
                            top = 80;
                        }

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
                }
            });
        };
        return el;
    }

    function getQuestName(qj) {
        switch (qj.type) {
            case 'D_EXP': return 'Активность фестиваля';
            case 'D_GEMS_SPEND': return 'Щедрая душа';
            case 'D_ROULETTE': return 'Споры с фортуной';
            case 'D_CARDS_FOUND': return 'По крупицам';
            case 'D_BLITZ_TOP': return 'Страсть к лидерству';
            case 'D_BATTLE_CARD_COMMON': return 'Демонстрация силы';
            case 'D_BATTLE_CARD_OTHER': return 'Демонстрация магии';
            case 'D_ITEM_FOUND': return 'Странник';
            case 'D_STONES_CAVE_FIND': return 'Камнетёс';
            case 'D_LEAGUE_RACE_WIN': return 'Легенда Лиги';

            case 'VISIT': return 'Как на праздник!';
            case 'ARENA_BATTLE': return 'Бравый боец';
            case 'DUNGEON_CHEST_OPEN': return 'Лабиринты';
            case 'QUEST_COMPLETE': return 'В банде Элрода';
            case 'PVPT_BATTLE': return 'Огненная пунктуальность';
            case 'EVENT_QUESTS_COMPLETE': return 'Задания фестиваля';

            case 'LEAGUE_CHEST_OPEN': return 'Сундуки лиги';
            case 'LEAGUE_RACE_FINISH': return 'Фестивальные гонки';

            case 'EXPEDITION_TOTAL_TIME': return 'Поднять паруса!';
        }
    }

    function getQuestDescription(qj) {
        switch (qj.type) {
            case 'D_EXP': return 'Заработай сегодня {0} личного опыта'.format(qj.required);
            case 'D_GEMS_SPEND': return 'Потрать сегодня {0} кристаллов'.format(qj.required);
            case 'D_ROULETTE': return 'Вращай сегодня колесо фортуны {0} {1}'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'раз'));
            case 'D_CARDS_FOUND': return 'Получи сегодня {0} фрагментов карт из сундуков'.format(qj.required);
            case 'D_BLITZ_TOP': return 'Войди сегодня в топ{0} челленджа'.format(qj.required);
            case 'D_BATTLE_CARD_COMMON': return 'Проведи сегодня {0} {1} простой картой'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'раунд'));
            case 'D_BATTLE_CARD_OTHER': return 'Проведи сегодня {0} {1} магической картой'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'раунд'));
            case 'D_ITEM_FOUND': return 'Получи сегодня {0} {1} снаряжения в кампании'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'предмет'));
            case 'D_STONES_CAVE_FIND': return 'Проведи сегодня {0} {1} в каменоломне'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'поиск'));
            case 'D_LEAGUE_RACE_WIN': return 'Одержи сегодня {0} {1} в Лиге Доблести'.format(qj.required, app.Utils.getGramString(qj.required, 'победу', 'победы', 'побед'));

            case 'VISIT': return 'Посещение игры в дни фестиваля. День {0}'.format(qj.required);
            case 'ARENA_BATTLE': return 'Проведи {0} {1} на арене за время фестиваля'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'бой'));
            case 'DUNGEON_CHEST_OPEN': return 'Открой {0} {1} подземелья за время фестиваля'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'сундук'));
            case 'QUEST_COMPLETE': return 'Выполни {0} ежедневных заданий Элрода за время фестиваля'.format(qj.required);
            case 'PVPT_BATTLE': return 'Прими участие в турнире Френы {0} {1} за время фестиваля'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'раз'));
            case 'EVENT_QUESTS_COMPLETE': return 'Выполни {0} {1} фестиваля за время его проведения'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'задание'));

            case 'LEAGUE_CHEST_OPEN': return 'Открой {0} {1} лиги за время фестиваля'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'сундук'));
            case 'LEAGUE_RACE_FINISH': return 'Дойди до финиша в гонке Лиги {0} {1} за время фестиваля'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'раз'));

            case 'EXPEDITION_TOTAL_TIME': return 'Проведи {0} {1} в экспедиции за время фестиваля'.format(qj.required, app.Utils.getGramStringPrepared(qj.required, 'час'));
        }
    }

    function animateRewardSnowflake(el, value) {
        animateReward0('snowf', el, {left: 0, top: 6}, value);

        let els_res = app.MainPage.getCFG().resources.snowf.els;
        let obj = {value: app.Model.user.items.snowf - value};
        let tl = new TimelineMax({
            onComplete: function () {
                els_res.value.innerHTML = app.Utils.toMoney(app.Model.user.items.snowf);
            }
        });
        tl.set(els_res.value, {innerHTML: app.Utils.toMoney(obj.value)});
        tl.to(obj, 0.3, {value: app.Model.user.items.snowf, onUpdate: function() {
                els_res.value.innerHTML = app.Utils.toMoney(Math.floor(obj.value));
            }}, '+=0.5');
    }

    function animateRewardApril(el, value) {
        animateReward0('april', el, {left: 0, top: 6}, value);

        let els_res = app.MainPage.getCFG().resources.april.els;
        let obj = {value: app.Model.user.items.april - value};
        let tl = new TimelineMax({
            onComplete: function () {
                els_res.value.innerHTML = app.Utils.toMoney(app.Model.user.items.april);
            }
        });
        tl.set(els_res.value, {innerHTML: app.Utils.toMoney(obj.value)});
        tl.to(obj, 0.3, {value: app.Model.user.items.april, onUpdate: function() {
                els_res.value.innerHTML = app.Utils.toMoney(Math.floor(obj.value));
            }}, '+=0.5');
    }

    function animateRewardCosmos(el, value) {
        animateReward0('cosmos', el, {left: 0, top: 6}, value);

        let els_res = app.MainPage.getCFG().resources.cosmos.els;
        let obj = {value: app.Model.user.items.cosmos - value};
        let tl = new TimelineMax({
            onComplete: function () {
                els_res.value.innerHTML = app.Utils.toMoney(app.Model.user.items.cosmos);
            }
        });
        tl.set(els_res.value, {innerHTML: app.Utils.toMoney(obj.value)});
        tl.to(obj, 0.3, {value: app.Model.user.items.cosmos, onUpdate: function() {
                els_res.value.innerHTML = app.Utils.toMoney(Math.floor(obj.value));
            }}, '+=0.5');
    }

    function animateRewardMagic(el, value) {
        animateReward0('magic', el, {left: 0, top: 6}, value);

        let els_res = app.MainPage.getCFG().resources.magic.els;
        let obj = {value: app.Model.user.items.magic - value};
        let tl = new TimelineMax({
            onComplete: function () {
                els_res.value.innerHTML = app.Utils.toMoney(app.Model.user.items.magic);
            }
        });
        tl.set(els_res.value, {innerHTML: app.Utils.toMoney(obj.value)});
        tl.to(obj, 0.3, {value: app.Model.user.items.magic, onUpdate: function() {
                els_res.value.innerHTML = app.Utils.toMoney(Math.floor(obj.value));
            }}, '+=0.5');
    }

    function animateRewardFlowers(el, value) {
        animateReward0('flowers', el, {left: 0, top: 6}, value);

        let els_res = app.MainPage.getCFG().resources.flowers.els;
        let obj = {value: app.Model.user.items.flowers - value};
        let tl = new TimelineMax({
            onComplete: function () {
                els_res.value.innerHTML = app.Utils.toMoney(app.Model.user.items.flowers);
            }
        });
        tl.set(els_res.value, {innerHTML: app.Utils.toMoney(obj.value)});
        tl.to(obj, 0.3, {value: app.Model.user.items.flowers, onUpdate: function() {
                els_res.value.innerHTML = app.Utils.toMoney(Math.floor(obj.value));
            }}, '+=0.5');
    }

    function animateRewardSun(el, value) {
        animateReward0('sun', el, {left: 0, top: 6}, value);

        let els_res = app.MainPage.getCFG().resources.sun.els;
        let obj = {value: app.Model.user.items.sun - value};
        let tl = new TimelineMax({
            onComplete: function () {
                els_res.value.innerHTML = app.Utils.toMoney(app.Model.user.items.sun);
            }
        });
        tl.set(els_res.value, {innerHTML: app.Utils.toMoney(obj.value)});
        tl.to(obj, 0.3, {value: app.Model.user.items.sun, onUpdate: function() {
                els_res.value.innerHTML = app.Utils.toMoney(Math.floor(obj.value));
            }}, '+=0.5');
    }

    function animateRewardWind(el, value) {
        animateReward0('wind', el, {left: 0, top: 6}, value);

        let els_res = app.MainPage.getCFG().resources.wind.els;
        let obj = {value: app.Model.user.items.wind - value};
        let tl = new TimelineMax({
            onComplete: function () {
                els_res.value.innerHTML = app.Utils.toMoney(app.Model.user.items.wind);
            }
        });
        tl.set(els_res.value, {innerHTML: app.Utils.toMoney(obj.value)});
        tl.to(obj, 0.3, {value: app.Model.user.items.wind, onUpdate: function() {
                els_res.value.innerHTML = app.Utils.toMoney(Math.floor(obj.value));
            }}, '+=0.5');
    }

    function animateRewardHb(el, value) {
        animateReward0('hb', el, {left: 0, top: 6}, value);

        let els_res = app.MainPage.getCFG().resources.hb.els;
        let obj = {value: app.Model.user.items.hb - value};
        let tl = new TimelineMax({
            onComplete: function () {
                els_res.value.innerHTML = app.Utils.toMoney(app.Model.user.items.hb);
            }
        });
        tl.set(els_res.value, {innerHTML: app.Utils.toMoney(obj.value)});
        tl.to(obj, 0.3, {value: app.Model.user.items.hb, onUpdate: function() {
                els_res.value.innerHTML = app.Utils.toMoney(Math.floor(obj.value));
            }}, '+=0.5');
    }

    function animateRewardGems(el, value) {
        animateReward0('gems', el, {left: -3, top: 0}, value);

        let els_res = app.MainPage.getCFG().resources.gems.els;
        let obj = {value: app.UserUtil.getGemsTotal() - value};
        let tl = new TimelineMax({
            onComplete: function () {
                els_res.value.innerHTML = app.Utils.toMoney(app.UserUtil.getGemsTotal());
            }
        });
        tl.set(els_res.value, {innerHTML: app.Utils.toMoney(obj.value)});
        tl.to(obj, 0.3, {value: app.UserUtil.getGemsTotal(), onUpdate: function() {
                els_res.value.innerHTML = app.Utils.toMoney(Math.floor(obj.value));
            }}, '+=0.5');
    }

    function animateReward0(type, parent, offsets, value) {
        let els = [];
        els.push(app.Utils.animationCreateReward(type, parent, offsets));
        if (value >= 500) els.push(app.Utils.animationCreateReward(type, parent, {left: -3, top: -3}));
        if (value >= 1000) els.push(app.Utils.animationCreateReward(type, parent, {left: -3, top: -3}));
        if (value >= 2000) els.push(app.Utils.animationCreateReward(type, parent, {left: -3, top: -3}));

        let delays = [0.01, 0.03, 0.05, 0.07];
        delays.shuffle(delays);

        let dirs = els.length === 1 ? [0] : [1, 2, 3, 4];
        dirs.shuffle(dirs);

        els.forEach(function(el, i) {
            animate1(type, el, dirs[i], delays[i]);
        });
    }

    function animate1(type, el, dir, delay) {
        app.Utils.animationAnimateReward(null, type, el, dir, delay);
    }

    function getEventName(t) {
        switch (t) {
            case 'hb':
            case 'hb3':
            case 'hb4':
            case 'hb5':
                return 'Фестиваль красок';
            case 'sun':
            case 'sun_21':
                return 'Фестиваль солнца';
            case 'new_year':
            case 'new_year_21':
            case 'new_year_22':
            case 'new_year_23':
                return 'Новый год!';
            case 'spring': return 'Фестиваль весны';
            case 'april': return 'Фестиваль юмора';
            case 'cosmos': return 'Фестиваль космоса';
            case 'magic': return 'Фестиваль магии';
            case 'wind': return 'Фестиваль ветра';
            default: return 'Фестиваль цветов';
        }
    }

    function getEventResName(t, v) {
        switch (t) {
            case 'hb':
            case 'hb3':
            case 'hb4':
            case 'hb5':
                return 'кексов';
            case 'sun':
            case 'sun_21':
                return 'частиц света';
            case 'new_year':
            case 'new_year_21':
            case 'new_year_22':
            case 'new_year_23':
                return 'снежинок';
            case 'april': return 'колпаков';
            case 'cosmos': return 'звёзд';
            case 'magic': return 'частиц магии';
            case 'wind': return 'змеев';
            default: return 'цветов';
        }
    }

    function _createYandexWin() {
        const p = app.Popups.createPopup({});
        p.els.popup.style = 'position: absolute;width: 430px; height: 350px; top: 130px; opacity: 1; background: #010101 url(https://keepers.mobi/images/brd_block_april_yandex.jpg?v=8.0.38) right bottom no-repeat';

        p.els.popup.appendChild(app.Utils.createDIV({class: 'header mlra_ab', style: 'top: -25px;', text: 'Поздравляем!'}));
        p.els.popup.appendChild(app.Utils.createDIV({class: 'cntr mt20 mb10', style: 'width: 430px', html: 'Вы выиграли <span class="str major">Яндекс Станция мини</span>'}));
        p.els.popup.appendChild(app.Utils.createDIV({class: 'cntr mt20 mb10 info', style: 'width: 430px', html: 'ID: ' + app.Model.user.partner.u}));

        p.els.popup.appendChild(app.Utils.createDIV({class: 'cntr mt20', style: 'width: 430px', html: 'Сделайте скриншот этого экрана'}));
        p.els.popup.appendChild(app.Utils.createDIV({class: 'cntr mb10', style: 'width: 430px', html: 'и пришлите его организаторам<br> на почту <a href="mailto:yndx-games-prizes@yandex.ru" class="info">yndx-games-prizes@yandex.ru</a>'}))

        p.els.popup.appendChild(app.Utils.createDIV({class: 'cntr mt20 mb10', style: 'width: 430px', html: '<a href="#" class="info">Полные условия конкурса</a>'}, () => {
            createHelp(() => 'NEW_YEAR_EVENT_YANDEX').click();
        }))
        app.Popups.add(p);
    }

    return {
        create: create,
        createHelp: createHelp
    };

})();