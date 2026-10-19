app.GuildBuildings = (function() {

    const onTabClick = (p, tab) => {
        const tabs = p.cfg.tabs;
        tabs.active = tab;

        tabs.t1.els.main.style.zIndex = 0;
        app.Utils.removeClass(tabs.t1.els.main, 'brd_block_tab_active');

        app.Utils.removeClass(tabs.t2.els.main, 'brd_block_tab_active');
        tabs.t2.els.main.style.zIndex = 0;

        clearContent(p);

        if (tab === 1) {
            tabs.t1.els.main.style.zIndex = 1;
            app.Utils.addClass(tabs.t1.els.main, 'brd_block_tab_active');
            content1(p);
        } else if (tab === 2) {
            tabs.t2.els.main.style.zIndex = 1;
            app.Utils.addClass(tabs.t2.els.main, 'brd_block_tab_active');
            content2(p);
        }
    };

    const content1 = (p) => {
        p.tmp.t1 = {
            els: {},
            onScroll(deltaY) {
                const scroll = p.scroll;

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

                if (scroll.top === scroll.topMax) {
                    p.tmp.t1.els.scroll_sh_top.style.opacity = 0;
                } else {
                    p.tmp.t1.els.scroll_sh_top.style.opacity = 1;
                }

                if (scroll.top === scroll.topMin) {
                    p.tmp.t1.els.scroll_sh_bottom.style.opacity = 0;
                } else {
                    p.tmp.t1.els.scroll_sh_bottom.style.opacity = 1;
                }

                scroll.el.style.top = scroll.top + 'px';

                return true;
            },
            updateChest() {
                const ge = app.UserUtil.getGuildEntry();
                createChest(p, ge.b.c);
            }
        };
        p.els.brd_r.appendChild(p.tmp.t1.els.header = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Реликвии гильдии'}));

        const doCreate = () => {
            const ge = app.UserUtil.getGuildEntry();

            createChest(p, ge.b.c);

            const list = app.Model.user.guild.buildings.map(building => createBuilding(p, building));
            list.forEach(cfg => {
                if (ge && ge.b && ge.b.d && ge.b.d[cfg.type]) {
                    cfg.error = {code: 15};
                    app.Utils.addClass(cfg.els.a1, 'bw');
                    app.Utils.addClass(cfg.els.a2, 'bw');
                }
                p.scroll.el.appendChild(cfg.els.main);
            });

            const update = () => {
                if (p.tmp._closed) return;
                if (p.cfg.tabs.active !== 1) return;

                list.forEach(entry => {
                    entry.update();
                });

                TweenMax.delayedCall(0.3, update);
            };
            update();

            TweenMax.delayedCall(0.001, () => {
                let contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                contentRequiredHeight += 50;

                const availableHeight = p.scroll.availableHeight - 100;

                p.scroll.top = 0;
                p.scroll.topMax = 0;
                p.scroll.topMin = contentRequiredHeight > availableHeight ? availableHeight - contentRequiredHeight : 0;
                p.scroll.el.style.top = p.scroll.top + 'px';
            });
        };

        doCreate();

        TweenMax.delayedCall(0.03, () => {
            app.EventDispatcher.emit('MainPage show hide', {nexit: 1, dust: 1, stones_dust: 1, gs: 1, gold: 1, gems: 1});
        });

        p.els.wrap.style.left = '';
        p.els.wrap.style.top = '140px';
        p.els.wrap.style.height = (p.scroll.availableHeight - 140) + 'px';
        p.els.wrap.style.width = '';
        p.els.wrap_s.style.width = '';

        p.els.wrap.appendChild(p.tmp.t1.els.scroll_sh_top = app.Utils.createDIV({class: 'scroll_sh_top', style: 'left: 20px; width: 440px; opacity: 0'}));
        p.els.wrap.appendChild(p.tmp.t1.els.scroll_sh_bottom = app.Utils.createDIV({class: 'scroll_sh_bottom', style: 'left: 20px; width: 440px; opacity: 0'}));

        p.cfg.onScroll(0);
    };

    const createChest = (p, chest) => {
        const cfg = {
            els: {}
        };

        const v = chest._v = Math.random();

        const complete = chest.p >= chest.r;

        cfg.els.main = app.Utils.createDIV({class: 'list_s'});
        if (complete) {
            cfg.els.main.style = 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 40px; min-height: 70px; background-color: #024e2b; border-color: #ffc549; cursor: pointer';
        } else {
            cfg.els.main.style = 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 40px; min-height: 70px';
        }

        cfg.els.prg = app.Utils.createDIV({class: 'quest_chest_prg'});

        cfg.els.prg_wrp = app.Utils.createDIV({class: 'quest_chest_prg_wrp'});
        cfg.els.prg_wrp.appendChild(app.Utils.createDIV({class: 'quest_chest_prg_bg', style: 'width: {0}%'.format(app.Utils.toPRG(chest.p, chest.r))}));
        cfg.els.prg_wrp.appendChild(app.Utils.createDIV({class: 'quest_chest_prg_text', text: '{0} из {1}'.format(Math.min(chest.p, chest.r), chest.r)}));
        cfg.els.prg.appendChild(cfg.els.prg_wrp);

        cfg.els.main.appendChild(cfg.els.prg);

        cfg.els.main.appendChild(app.Utils.createDIV({class: 'quest_chest'}));

        cfg.els.main.appendChild(app.Utils.createDIV({class: 'cntr', style: 'margin-left: 70px'}, null, [
                app.Utils.createDIV({class: 'major big str', text: 'Сундук реликвий'}),
                app.Utils.createDIV({class: 'mt5', text: complete ? 'Можно открыть!' : 'Пожертвований до награды:'})
            ])
        );

        cfg.els.main.onclick = () => {
            if (chest.p < chest.r) {
                app.Utils.createChestRewardPopup('Сундук реликвий', app.CFGUtil.getGuildBuildingChestById(chest.id));
                return;
            }

            app.Network.command({cmd: 'GuildBuildingChestOpen'}, data => {
                if (data.error) {
                    app.Utils.showInfo('Попробуйте позже');
                } else {
                    app.UserUtil.processChestDrop(data.drop);
                    app.EventDispatcher.emit('show chest drop', {drop: data.drop});
                    app.EventDispatcher.emit('user resources changed');
                }
            });
        };

        cfg.update = () => {
            if (p.tmp._closed || !p.tmp.t1 || cfg._closed) return;
            const ge = app.UserUtil.getGuildEntry();
            if (ge.b.c._v !== v) {
                cfg._closed = 1;
                p.tmp.t1.updateChest();
                return;
            }
            TweenMax.delayedCall(0.3, cfg.update);
        };

        if (p.tmp.t1.chest) {
            p.els.brd_r.replaceChild(cfg.els.main, p.tmp.t1.chest.els.main);
        } else {
            p.els.brd_r.appendChild(cfg.els.main);
        }

        p.tmp.t1.chest = cfg;

        cfg.update();

        return cfg;
    };

    const createBuilding = (p, building) => {
        const cfg = {
            type: building.t,
            els: {}
        };

        const type = building.t;

        const commonDonatePrice = getBuildingDonationPrice(building, false);
        const premiumDonatePrice = getBuildingDonationPrice(building, true);

        cfg.els.main = app.Utils.createDIV({class: 'list_s mlra_ab', style: 'width: 415px; padding: 5px; margin-top: 5px'});

        cfg.els.main.appendChild(cfg.els.lvl = app.Utils.createDIV({class: 'sh_card_lvl', style: 'left: -3px; top: -3px; float: left; transform: scale(0.75)', text: 1}));
        cfg.els.main.appendChild(app.Utils.createDIV({class: 'relic_icon ' + getBuildingIcon(building)}));

        cfg.els.main.appendChild(app.Utils.createDIV({class: 'rune_row_right'}, null, [
            app.Utils.createDIV({class: 'flr'}, null, [
                app.Utils.createSPAN({class: 'normal'}, null, [
                    app.Utils.createText('Бонус сегодня: '),
                    cfg.els.bonus_today = app.Utils.createSPAN({class: 'r_green', text: '+5%'})
                ])
            ]),
            app.Utils.createDIV({class: 'major str pb3', text: getBuildingName(building)}),
            app.Utils.createDIV({class: 'rune_descr'}, null, [
                app.Utils.createSPAN({style: 'font-weight: normal; color: #fff', html: getBuildingDescription(building)})
            ])
        ]));

        cfg.els.main.appendChild(app.Utils.createDIV({class: 'hr', style: 'background-size: 600px; margin: 5px 0px 5px 0px'}));

        cfg.els.main.appendChild(app.Utils.createDIV({class: 'rune_descr', style: 'height: 75px'}, null, [
            app.Utils.createDIV({class: 'mt0'}, null, [
                app.Utils.createText('Бонус на завтра: '),
                cfg.els.bonus_tomorrow = app.Utils.createSPAN({class: 'info', text: '2%'}),
                app.Utils.createDIV({class: 'card_prg', style: 'top:0px; right: -10px; position: absolute; transform: scale(0.85)'}, null, [
                    cfg.els.prg_prg = app.Utils.createDIV({class: 'card_prg_bg', style: 'width: 20%'}),
                    cfg.els.prg_cnt = app.Utils.createDIV({class: 'card_prg_counr', text: '50/200'}),
                    app.Utils.createDIV({class: 'card_prg_full_blink', style: 'left: -10px; opacity: 0'}),
                    cfg.els.prg_lvl = app.Utils.createDIV({class: 'sh_card_lvl', style: 'left:-15px; top: -2px; transform: scale(0.7)', text: '2'})
                ])
            ]),
            app.Utils.createDIV({class: 'mt5 cntr', text: 'Пожертвовать для бонуса на завтра:'}),
            cfg.els.a1 = app.Utils.createA({class: 'btn_g', style: 'left: 20px; top: 47px; position: absolute'}, null, [
                app.Utils.createSPAN({class: 'res_icon res_icon_inline ' + getBuildingDonationIconClass(building)}),
                app.Utils.createText(app.Utils.toMoney1(commonDonatePrice.v))
            ]),
            cfg.els.a2 = app.Utils.createA({class: 'btn_g btn_a', style: 'right: 20px; top: 47px; position: absolute'}, null, [
                app.Utils.createSPAN({class: 'res_icon res_icon_inline ' + getBuildingDonationIconClass(building)}),
                app.Utils.createText(app.Utils.toMoney1(premiumDonatePrice.v))
            ]),
            app.Utils.createDIV({class: 'mt10 cntr', text: 'или'}),
            app.Utils.createDIV({class: 'clr'})
        ]));

        cfg.els.a1.onclick = () => {
            if (app.Utils.hasClass(cfg.els.a1, 'bw')
                || app.Utils.hasClass(cfg.els.a2, 'bw')) {
                if (cfg.error) {
                    processDonateError(cfg.error);
                }
                return;
            }

            app.Utils.addClass(cfg.els.a1, 'bw')

            app.Network.command({cmd: 'GuildBuildingDonate', type: building.t, donate: commonDonatePrice.v}, data => {
                if (data.error) {
                    app.Utils.removeClass(cfg.els.a1, 'bw')
                    processDonateError(data.error, {price: commonDonatePrice});
                } else {
                    cfg.error = {code: 15};
                    app.Utils.addClass(cfg.els.a2, 'bw');
                }
            });
        };

        cfg.els.a2.onclick = () => {
            if (app.Utils.hasClass(cfg.els.a1, 'bw')
                || app.Utils.hasClass(cfg.els.a2, 'bw')) {
                if (cfg.error) {
                    cfg.error && processDonateError(cfg.error);
                }
                return;
            }

            if (!app.UserUtil.isPremiumActive()) {
                app.Utils.showInfo('Доступно при активном премиуме');
                return;
            }

            app.Utils.addClass(cfg.els.a2, 'bw')

            app.Network.command({cmd: 'GuildBuildingDonate', type: building.t, donate: premiumDonatePrice.v}, data => {
                if (data.error) {
                    app.Utils.removeClass(cfg.els.a2, 'bw')
                    processDonateError(data.error, {price: premiumDonatePrice});
                } else {
                    cfg.error = {code: 15};
                    app.Utils.addClass(cfg.els.a1, 'bw')
                }
            });
        };

        cfg.update = () => {
            const building = getCurrentBuilding(type);

            if (building.t === 'V') {
                cfg.els.bonus_today.innerText = '+' + getBuildingCurrentBonus(building);
            } else {
                cfg.els.bonus_today.innerText = '+' + getBuildingCurrentBonus(building) + '%';
            }

            const prg = getBuildingTomorrowProgress(building);

            if (building.t === 'V') {
                cfg.els.bonus_tomorrow.innerText = '+' + prg[1];
            } else {
                cfg.els.bonus_tomorrow.innerText = '+' + prg[1] + '%';
            }

            cfg.els.prg_lvl.innerText = prg[0];

            const isMax = prg[4];
            if (isMax) {
                cfg.els.prg_prg.style.width = '100%';
                cfg.els.prg_cnt.innerText = 'max';
            } else {
                const current = prg[2];
                const required = prg[3];
                cfg.els.prg_prg.style.width = app.Utils.toPRG(current, required) + '%';
                cfg.els.prg_cnt.innerText = app.Utils.toMoney1(current) + '/' + app.Utils.toMoney1(required);
            }
        };

        return cfg;
    };

    const content2 = (p) => {
        p.tmp.t2 = {
            els: {},
            onScroll(deltaY) {
                const scroll = p.scroll;
                if (scroll.topMax === 0 || scroll.topMin === 0) {
                    return true;
                }

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

                return true;
            }
        };

        let ratingPeriod = 0;
        let ratingBuildingType = 'ALL';

        p.els.brd_r.appendChild(p.tmp.t2.els.header = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Они помогают гильдии'}));
        p.els.brd_r.appendChild(p.tmp.t2.els.left = app.Utils.createA({class: 'btn_d', style: 'left: 30px; top: 5px; transform: scale(0.9)'}));
        p.els.brd_r.appendChild(p.tmp.t2.els.right = app.Utils.createA({class: 'btn_d', style: 'right: 19px; top: 5px; transform: scale(0.9)'}));

        const avatar = app.Utils.createAvatarComponent(app.Model.user.rank, app.Model.user.avatar.img);
        avatar.els.main.style = 'transform: scale(0.7); left: 80px; top: 5px';

        p.els.brd_r.appendChild(p.tmp.t2.els.avatar = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 25px; top: 40px; width: 415px; padding: 5px; height: 55px'}, null, [
            p.tmp.t2.els.my_place = app.Utils.createDIV({class: 'rating_top_p rating_top_m', html: '<span class="normal" style="font-size: 12px; white-space: nowrap;">Моё место</span><div>{0}</div>'.format(2)}),
            avatar.els.main,
            p.tmp.t2.els.my_value = app.Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 130px; padding-top: 5px',
                html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt10 dbl fll">Пожертвований:</span><span class="flr mt10">{1}</span>'.format(app.UserUtil.getUserNameUpper0(app.Model.user.name), 1)})
        ]));

        p.els.wrap.appendChild(p.tmp.t2.els.scroll_sh_top = app.Utils.createDIV({class: 'scroll_sh_top', style: 'width: 420px'}));
        p.els.wrap.appendChild(p.tmp.t2.els.scroll_sh_bottom = app.Utils.createDIV({class: 'scroll_sh_bottom', style: 'width: 420px'}));

        const getRatingPeriodName = () => {
            switch(ratingPeriod) {
                case 0: return 'Сегодня';
                case 1: return 'Вчера';
                case 2: return 'Неделя';
            }
        };

        const getNextRatingPeriod = () => {
            switch (ratingPeriod) {
                case 0: return 1;
                case 1: return 2;
                case 2: return 0;
            }
        };

        const getRatingBuildingTypeName = () => {
            switch (ratingBuildingType) {
                case 'I': return 'Компас';
                case 'II': return 'Кирка';
                case 'III': return 'Ножницы';
                case 'IV': return 'Якорь';
                case 'V': return 'Ключ';
                case 'VI': return 'Кубик';
                case 'ALL': return 'Все';
            }
        };

        const getNextRatingBuildingType = () => {
            switch (ratingBuildingType) {
                case 'I': return 'II';
                case 'II': return 'III';
                case 'III': return 'IV';
                case 'IV': return 'V';
                case 'V': return 'VI';
                case 'VI': return 'ALL';
                case 'ALL': return 'I';
            }
        };

        const getRatingBuildingTypeIcon = () => {
            let resIcon;
            switch (ratingBuildingType) {
                case 'I': resIcon = 'res_nexit'; break;
                case 'II': resIcon = 'res_dust'; break;
                case 'III': resIcon = 'res_dust_stone'; break;
                case 'IV': resIcon = 'res_gold'; break;
                case 'V': resIcon = 'res_boss'; break;
                case 'VI': resIcon = 'res_gem'; break;
                default: resIcon = ''; break;
            }
            if (resIcon !== '') {
                resIcon = '<div class="res_icon res_icon_inline {0}"></div>'.format(resIcon);
            }
            return resIcon;
        };

        const onRatingTypeClick = () => {
            if (app.Utils.hasClass(p.tmp.t2.els.left, 'bw')) {
                return;
            }
            app.Utils.addClass(p.tmp.t2.els.left, 'bw');
            app.Utils.addClass(p.tmp.t2.els.right, 'bw');

            ratingPeriod = getNextRatingPeriod();
            p.tmp.t2.els.left.innerText = getRatingPeriodName();

            loadRating();
        };

        const onRatingBuildingNameClick = () => {
            if (app.Utils.hasClass(p.tmp.t2.els.right, 'bw')) {
                return;
            }
            app.Utils.addClass(p.tmp.t2.els.left, 'bw');
            app.Utils.addClass(p.tmp.t2.els.right, 'bw');

            ratingBuildingType = getNextRatingBuildingType();
            p.tmp.t2.els.right.innerText = getRatingBuildingTypeName();

            loadRating();
        };

        const loadRating = () => {
            app.Network.command({cmd: 'GuildBuildingRating', period: ratingPeriod, type: ratingBuildingType}, data => {
                if (p.tmp._closed || !p.tmp.t2) {
                    return;
                }
                app.Utils.removeClass(p.tmp.t2.els.left, 'bw');
                app.Utils.removeClass(p.tmp.t2.els.right, 'bw');

                console.log(data);

                if (data.error) {
                    app.Utils.showInfo('Упс :(');
                } else {
                    updateMe(data.rating.list.find(entry => entry.u.id === app.Model.user.id));
                    createList(data.rating.list);
                }
            });
        };

        const updateMe = (entry) => {
            entry = entry || {p: '?', v: '?'};
            p.tmp.t2.els.my_place.innerHTML = '<span class="normal" style="font-size: 12px; white-space: nowrap;">Моё место</span><div>{0}</div>'.format(entry.p);

            p.tmp.t2.els.my_value.innerHTML = '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt10 dbl fll">Пожертвований:</span><span class="flr mt10">{1}</span>'
                .format(app.UserUtil.getUserNameUpper0(app.Model.user.name), getRatingBuildingTypeIcon() + app.Utils.toMoney(entry.v));
        };

        const createList = (list) => {
            app.Utils.removeAllChild(p.scroll.el);

            list.forEach(entry => createRow(entry));

            let list2 = app.Model.user.guild.e.filter(ge => !list.find(entry => entry.u.id === ge.u.id));
            if (list2) {
                p.scroll.el.appendChild(app.Utils.createDIV({class: 'header_hr', style: 'position: relative;', html: '<span>Не помогали:</span>'}))
                list2 = list2.map(ge => {
                    return {u: ge.u, p: '?', v: 0};
                });
                list2.forEach(entry => createRow(entry));
            }

            TweenMax.delayedCall(0.01, () => {
                const contentRequiredHeight = 20 + app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                const availableHeight = p.scroll.availableHeight - 115;
                p.scroll.topMin = contentRequiredHeight > availableHeight ? availableHeight - contentRequiredHeight : 0;
            });
        };

        const createRow = (entry) => {
            const avatar = app.Utils.createAvatarComponent(entry.u.r, entry.u.a);
            avatar.els.main.style = 'transform: scale(0.5); left: 40px';

            const el_r = app.Utils.createDIV({class: 'rating_row'}, null, [
                app.Utils.createDIV({class: 'rating_top_p' + (entry.p === '?' || entry.p > 3 ? '' : ' rating_top_p' + entry.p),
                    text: entry.p === '?' || entry.p > 3 ? entry.p : ''}),
                avatar.els.main,
                app.Utils.createDIV({class: 'rating_row_r',
                    html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Пожертвований:</span><span class="flr mt5">{1}</span>'
                        .format(app.UserUtil.getUserNameUpper0(entry.u.n), getRatingBuildingTypeIcon() + app.Utils.toMoney(entry.v))}),
            ]);
            p.scroll.el.appendChild(el_r);
            p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb5'}));
        };

        p.tmp.t2.els.left.innerText = getRatingPeriodName();
        p.tmp.t2.els.left.onclick = onRatingTypeClick;

        p.tmp.t2.els.right.innerText = getRatingBuildingTypeName();
        p.tmp.t2.els.right.onclick = onRatingBuildingNameClick;

        p.els.wrap.style.left = '30px';
        p.els.wrap.style.top = '115px';
        p.els.wrap.style.height = (p.scroll.availableHeight - 115) + 'px';
        p.els.wrap.style.width = '420px';
        p.els.wrap_s.style.width = '420px';

        p.scroll.top = 20;
        p.scroll.topMax = 20;
        p.scroll.el.style.top = p.scroll.top + 'px';

        TweenMax.delayedCall(0.01, loadRating);
    };

    const clearContent = (p) => {
        if (p.tmp.t1) {
            Object.keys(p.tmp.t1.els).forEach(key => {
                const el = p.tmp.t1.els[key];
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            if (p.tmp.t1.chest) {
                p.tmp.t1.chest.els.main.parentNode.removeChild(p.tmp.t1.chest.els.main);
            }
            p.tmp.t1.chest._closed = 1;
            delete p.tmp.t1;
        }

        if (p.tmp.t2) {
            Object.keys(p.tmp.t2.els).forEach(key => {
                const el = p.tmp.t2.els[key];
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            delete p.tmp.t2;
        }

        app.Utils.removeAllChild(p.scroll.el);
    };

    function getCurrentBuilding(type) {
        return app.Model.user.guild.buildings.find(b => b.t === type);
    }

    function getBuildingName(building) {
        switch (building.t) {
            case 'I': return 'Золотой компас';
            case 'II': return 'Сапфировая Кирка';
            case 'III': return 'Изумрудные ножницы';
            case 'IV': return 'Некситовый Якорь';
            case 'V': return 'Магический Ключ';
            case 'VI': return 'Кубик стихий';
        }
    }

    function getBuildingIcon(building) {
        switch (building.t) {
            case 'I': return 'relic_compass';
            case 'II': return 'relic_pick';
            case 'III': return 'relic_scissors';
            case 'IV': return 'relic_anchor';
            case 'V': return 'relic_key';
            case 'VI': return 'relic_dice';
        }
    }

    function getBuildingDescription(building) {
        switch (building.t) {
            case 'I': return 'Увеличивает<span class="res_icon res_icon_inline res_gold"></span>в кампании и колесе фортуны на 2% за каждый уровень пожертвований';
            case 'II': return 'Увеличивает добычу<span class="res_icon res_icon_inline res_dust_stone"></span>в каменоломне на 2% за каждый уровень пожертвований';
            case 'III': return 'Увеличивает количество<span class="res_icon res_icon_inline res_dust"></span>при распылении вещей на 2% за каждый уровень пожертвований';
            case 'IV': return 'Увеличивает <span class="res_icon res_icon_inline res_icon res_icon_inline res_nexit"></span>в экспедициях на 2% за каждый уровень пожертвований</span>';
            case 'V': return 'Увеличивает число фрагментов каждой карты в ежедневных сундуках на 1<span class="res_icon res_icon_inline res_icon res_icon_inline res_card_q1"></span> за каждый уровень пожертвований</span>';
            case 'VI': return 'Увеличивает <img src="{0}" style="width: 20px; height: 20px; vertical-align: text-bottom;"> базовый урон от умений карт на 1% за каждый уровень пожертвований</span>'
                .format(app.IMAGES.getPath('/images/damage.png'));
        }
    }

    function getBuildingDonationIconClass(building) {
        switch (building.t) {
            case 'I': return 'res_nexit';
            case 'II': return 'res_dust';
            case 'III': return 'res_dust_stone';
            case 'IV': return 'res_gold';
            case 'V': return 'res_boss';
            case 'VI': return 'res_gem';
        }
    }

    function getBuildingCurrentBonus(building) {
        return getBuildingBonusByLevel(building.t, building.lvl);
    }

    function getBuildingBonusByLevel(type, level) {
        if (level === 0) {
            return 0;
        }

        const buildingJ = cfgGetBuildingByType(type);
        const levelsJA = buildingJ.levels;
        const levelJ = level < levelsJA.length
            ? levelsJA[level - 1]
            : levelsJA[levelsJA.length - 1]
        return levelJ.bonus;
    }

    function getBuildingTomorrowProgress(building) {
        const buildingJ = cfgGetBuildingByType(building.t);
        const levelsJA = buildingJ.levels;

        let current = building.ce;
        let required = levelsJA[0].required;
        let level = 0;

        for (let i = 0; i < levelsJA.length; i++) {
            if (current < required) {
                break;
            }

            level++;

            current -= required;

            if (level !== levelsJA.length) {
                required = levelsJA[level].required;
            }
        }

        return [level, getBuildingBonusByLevel(building.t, level), current, required, level === levelsJA.length];
    }

    function getBuildingDonationPrice(building, commonOrPremium) {
        return app.GuildUtil.getBuildingDonationPrice(building.t, commonOrPremium);
    }

    function cfgGetBuildingByType(type) {
        return app.GuildUtil.cfgGetBuildingByType(type);
    }

    function processDonateError(error, addInfo) {
        switch (error.code) {
            case 14:
                app.EventDispatcher.emit('not enough resources', addInfo);
                break;
            case 15:
                app.Utils.showInfo('Сегодня уже сделано пожертвование этой реликвии.');
                break;
            case 16:
                app.Utils.showInfo('Пожертвование еще недоступно.');
                break;
            default:
                app.Utils.showInfo('Ошибка. повторите позже');
                break;
        }
    }

    return {
        show() {
            const p = app.Popups.createPopup1({
                onScroll(deltaY) {
                    if (p.tmp.t2) {
                        return p.tmp.t2.onScroll(deltaY);
                    }
                    if (p.tmp.t1) {
                        return p.tmp.t1.onScroll(deltaY);
                    }
                    return false;
                },
                onClose() {
                    p.tmp._closed = 1;
                }
            });

            p.tmp = {};

            p.cfg.tabs = {active: 1};

            let tab = {els: {}};
            tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 30px', text: 'Бонусы'}, onTabClick.bind(null, p, 1));
            p.els.brd_r.appendChild(tab.els.main);
            p.cfg.tabs.t1 = tab;

            tab = {els: {}};
            tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 134px', text: 'Статистика'}, onTabClick.bind(null, p, 2));
            p.els.brd_r.appendChild(tab.els.main);
            p.cfg.tabs.t2 = tab;

            p.els.brd_r.appendChild(app.Utils.createHelpPopup('GuildBuildings'));

            const contentRequiredHeight = 665;
            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight() + 40);
            const availableHeight = Math.min(contentRequiredHeight, availableHeight0);
            const top = Math.max(80 + 40, (availableHeight0 - availableHeight) / 2);

            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';

            p.scroll.availableHeight = availableHeight;

            p.scroll.update = () => {
                const contentRequiredHeight = 665;
                const availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight() + 40);
                const availableHeight = Math.min(contentRequiredHeight, availableHeight0);
                const top = Math.max(80 + 40, (availableHeight0 - availableHeight) / 2);
                p.scroll.availableHeight = availableHeight;
            };

            onTabClick(p, 1);

            app.Popups.add(p);
        },

    };
})();