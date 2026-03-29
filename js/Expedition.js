if (!app.Expedition) {

    const getLocationCompleteReward = (value) => {
        return value + app.GuildUtil.calculateBuildingsBonus('IV', value);
    };

    app.Expedition = {
        create() {
            if (app.Model.user.expedition) {
                this._create0();
            } else {
                this._createClosed();
            }
        },
        _createClosed() {
            const p = app.Popups.createPopup({});

            p.els.popup.appendChild(app.Utils.createDIV({
                class: 'header',
                style: 'left: 40px; top: -25px',
                text: 'Нужен 20 уровень'
            }));
            p.els.popup.appendChild(app.Utils.createDIV({
                class: 'battle_advice',
                style: 'width: 330px; top: 20px',
                text: 'Экспедиции доступны с 20 уровня и выше'
            }));

            p.els.popup.appendChild(app.Utils.createDIV({class: 'cntr', style: 'position: relative; top: 50px'}, null, [app.Utils.createIMG('/images/lvl_need.png', {w: 129, h: 76})]));

            p.els.popup.appendChild(app.Utils.createDIV({
                class: 'battle_advice',
                style: 'width: 330px; top: 135px',
                text: 'Выполняй задания и проходи миссии Кампании, чтобы поднять уровень'
            }));
            p.els.popup.appendChild(app.Utils.createA({
                class: 'btn_g',
                style: 'left: 85px; top: 185px',
                text: 'Понятно'
            }, () => {
                app.Popups.removeLast();
            }));

            p.els.popup.appendChild(app.Utils.createHelpPopup('Expeditions'));

            const contentRequiredHeight = 250;
            const availableHeight0 = app.LAYOUT.getClientWHS0(76);
            const availableHeight = Math.min(contentRequiredHeight, availableHeight0);

            let top = (availableHeight0 - availableHeight) / 2;
            top = Math.max(80, top);

            p.els.popup.style.top = top + 'px';
            p.els.popup.style.left = '90px';
            p.els.popup.style.height = '240px';
            p.els.popup.style.width = '330px';

            app.Popups.add(p);
        },
        _create0() {
            const p = app.Popups.createPopup1({
                id: 'EXPEDITION',
                display: {nexit: 1, gems: 1},
                onUpdate: function() {
                    if (p.cfg.tabs.active === 2) {
                        if (p.tmp.shop && p.tmp.shop !== app.Model.user.shop4) {
                            p.tmp.shop = app.Model.user.shop4;
                            app.Expedition._onTab0Clicked(p, 2);
                        }
                    }
                },
                onReplace() {
                    p.tmp._closed = 1;
                },
                onClose() {
                    p.tmp._closed = 1;
                }
            });

            p.tmp = {};

            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + 76);
            const contentRequiredHeight = 628;

            let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
            let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';

            p.scroll.availableHeight = availableHeight;

            p.cfg.tabs = {active: 1};
            let tab = p.cfg.tabs.t1 = {els: {}};
            tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 30px', text: 'Экспедиции'}, this._onTab0Clicked.bind(this, p, 1));
            tab.els.main.appendChild(tab.els.note = app.Utils.createSPAN({class: 'menu_note menu_note_g', style: 'right: -5px; display: none'}));
            p.els.brd_r.appendChild(tab.els.main);

            tab = p.cfg.tabs.t2 = {els: {}};
            tab.els.main = app.Utils.createA({class: 'brd_block_tab brd_block_tab_l', style: 'left: 136px', text: 'Магазин'}, this._onTab0Clicked.bind(this, p, 2));
            tab.els.main.appendChild(tab.els.note = app.Utils.createSPAN({class: 'menu_note menu_note_g', style: 'right: -5px; display: none'}));
            p.els.brd_r.appendChild(tab.els.main);

            this._onTab0Clicked(p, 1);

            p.els.brd_r.appendChild(app.Utils.createHelpPopup('Expeditions'));

            app.Popups.add(p);
        },

        _clear0_content(p) {
            delete p.tmp.v;
            delete p.tmp.cfgs;
            if (p.tmp.list) {
                p.tmp.list.forEach(el => {
                    if (el.parentNode) el.parentNode.removeChild(el)
                });
                delete p.tmp.list;
            }
            app.Utils.removeAllChild(p.scroll.el);
        },

        _onTab0Clicked(p, tab) {
            this._clear0_content(p);

            const tabs = p.cfg.tabs;

            tabs.active = tab;

            app.Utils.removeClass(tabs.t1.els.main, 'brd_block_tab_active');
            app.Utils.removeClass(tabs.t2.els.main, 'brd_block_tab_active');

            if (tab === 1) {
                app.Utils.addClass(tabs.t1.els.main, 'brd_block_tab_active');
                this._create0_content0(p);
            } else {
                app.Utils.addClass(tabs.t2.els.main, 'brd_block_tab_active');
                let tabClicked = 2;
                const _p = app.Shop.createByType({
                    display: p.cfg.display,
                    tabs: [
                        {
                            els: {
                                main: app.Utils.createA({class: 'brd_block_tab', style: 'left: 30px', text: 'Экспедиции'}, () => {
                                    app.Popups.removePopup(_p);
                                    app.Expedition._onTab0Clicked(p, 1);
                                })
                            }
                        },
                        {
                            els: {
                                main: app.Utils.createA({class: 'brd_block_tab brd_block_tab_l brd_block_tab_active', style: 'left: 136px', text: 'Магазин'}, () => {
                                    app.Popups.removePopup(_p);
                                    app.Expedition._onTab0Clicked(p, 2);
                                })
                            }
                        }
                    ],
                    onEscape() {
                        app.Popups.removePopup(_p);
                        app.Popups.removePopup(p);
                    },
                    onCloseBTNClick() {
                        app.Popups.removePopup(_p);
                        app.Popups.removePopup(p);
                    },
                }, 4);

                const onclick = _p.els.dark.onclick;
                _p.els.dark.onclick = () => {
                    onclick();
                    app.Popups.removePopup(p);
                }
            }
        },

        _create0_content0(p) {
            p.tmp.list = [];
            p.tmp.cfgs = [];

            p.els.brd_bg.className = 'brd_block_bg';

            let el;
            p.els.brd_r.appendChild(el = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Доступные походы'}));
            p.tmp.list.push(el);
            p.els.brd_r.appendChild(el = app.Utils.createDIV({class: 'list_s', style: 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 35px; min-height: 75px; cursor: pointer', html: '<div class="cntr"><div>Отправляй экспедиции в различные локации,<br> чтобы получить ценный ресурс - Нексит.<br>Можно отправить до <span class="info">трех</span> экспедиций <br> различной длительности.<br></div></div></div>'}));
            p.tmp.list.push(el);

            const createRow = (id) => {
                const cfg = {
                    _id: id,
                    _state: {v: -2},
                    _updateState(v, d) {
                        this._state = {v: v};
                        if (d) {
                            this._state.d = d;
                        }
                    },
                    els: {},
                    update() {
                        const location = app.Model.user.expedition.l[id];
                        switch (location.s.v) {
                            case -1: {
                                if (this._state.v !== -1) {
                                    app.Utils.addClass(cfg.els.main, 'bw');
                                    cfg.els.required.innerHTML = 'Завершите предыдущую<br> экспедицию';
                                    cfg.els.a_update.className = (cfgLocation.premium ? 'btn_g btn_gs_a' : 'btn_g btn_gs_c') + ' mlra_ab bw';
                                    cfg.els.a_update.onclick = () => {
                                        app.Utils.showInfo('Необходимо завершить<br> предыдущию экспедицию');
                                    };
                                    this._updateState(-1);
                                }
                                break
                            }
                            case 0: {
                                const cardsPower = location.l.reduce((acc, cardId) => acc + app.UserUtil.getCardPower(cardId), 0);
                                if (this._state.v !== 0) {
                                    app.Utils.removeClass(cfg.els.main, 'bw');
                                    if (cardsPower === 0) {
                                        cfg.els.required.innerHTML = `Необходимая мощь: <span class="info">${app.Utils.toMoney(location.pwr)}</span>`;
                                    } else {
                                        cfg.els.required.innerHTML = `Необходимая мощь: <span class="info"><span class="${location.pwr > cardsPower ? 'red' : 'r_green'}">${app.Utils.toMoney(cardsPower)}</span> / ${app.Utils.toMoney(location.pwr)}</span>`;
                                    }
                                    cfg.els.duration.innerHTML = 'Длительность: <span class="info">{0}</span>'.format(app.TimeUtil.formatToHumanTime(cfgLocation.duration.run, 1));
                                    cfg.els.required.style.display = '';
                                    cfg.els.duration.style.display = '';
                                    cfg.els.reward.style.display = '';
                                    cfg.els.a_update.className = 'btn_g mlra_ab ' + (cfgLocation.premium ? 'btn_gs_a' : 'btn_gs_c');
                                    cfg.els.a_update.innerText = 'Отправить';
                                    cfg.els.a_update.onclick = () => {
                                        app.Expedition._create1(id);
                                    }
                                    this._updateState(0, { cardsPower });
                                } else if (cardsPower !== this._state.d.cardsPower) {
                                    if (cardsPower === 0) {
                                        cfg.els.required.innerHTML = `Необходимая мощь: <span class="info">${app.Utils.toMoney(location.pwr)}</span>`;
                                    } else {
                                        cfg.els.required.innerHTML = `Необходимая мощь: <span class="info"><span class="${location.pwr > cardsPower ? 'red' : 'r_green'}">${app.Utils.toMoney(cardsPower)}</span> / ${app.Utils.toMoney(location.pwr)}</span>`;
                                    }
                                    this._updateState(0, { cardsPower });
                                }
                                break;
                            }
                            case 1: {
                                if (this._state.v !== 1) {
                                    const power = location.l.reduce((acc, cardId) => acc + app.UserUtil.getCardPower(cardId), 0);
                                    cfg.els.required.innerHTML = 'Задействована мощь: <span class="info">{0}</span>'.format(app.Utils.toMoney(power));
                                    cfg.els.required.style.display = '';
                                    cfg.els.reward.style.display = '';
                                    cfg.els.a_update.innerText = 'Подробнее';
                                    cfg.els.a_update.className = 'btn_g btn_gs mlra_ab';
                                    cfg.els.a_update.onclick = () => {
                                        app.Expedition._create1(id);
                                    }
                                    this._updateState(1);
                                }
                                const tl = Math.max(0, location.s.t - app.TimeUtil.now());
                                if (tl === 0) {
                                    cfg.els.duration.innerHTML = 'Завершение ...';
                                } else {
                                    cfg.els.duration.innerHTML = 'Осталось: <span class="info">{0}</span>'.format(app.TimeUtil.formatToHumanTime(tl, tl < app.TimeUtil.H_MS * 10 ? 2 : 1));
                                }
                                break;
                            }
                            case 2: {
                                if (this._state.v !== 2) {
                                    cfg.els.required.style.display = 'none';
                                    cfg.els.reward.style.display = 'none';
                                    cfg.els.duration.innerHTML = 'Экспедиция завершена';
                                    cfg.els.a_update.innerHTML = 'Забрать <span class="res_icon res_icon_inline res_nexit"></span>{0}'.format(getLocationCompleteReward(cfgLocation.reward.nexit));
                                    cfg.els.a_update.className = 'btn_g mlra_ab btn_a';
                                    cfg.els.a_update.onclick = () => {
                                        if (app.Utils.hasClass(cfg.els.a_update, 'bw')) return;
                                        app.Utils.addClass(cfg.els.a_update, 'bw');
                                        app.Network.command({cmd: 'ExpeditionReward', location: id}, data => {
                                            if (data.error) {
                                                app.Utils.showInfo('Попробуйте позже');
                                            } else {
                                                app.Chests.showDrop(data.drop);
                                            }
                                        });
                                    };
                                    this._updateState(2);
                                }
                                break;
                            }
                            case 3: {
                                const tl = Math.max(0, location.s.t - app.TimeUtil.now());
                                if (tl === 0) {
                                    cfg.els.duration.innerHTML = 'Ожидаем ...';
                                } else {
                                    cfg.els.duration.innerHTML = 'Новая экспедиция через: <span class="info">{0}</span>'.format(app.TimeUtil.formatToHumanTime(tl, tl < app.TimeUtil.H_MS * 10 ? 2 : 1));
                                }

                                const price = Math.max(1, Math.ceil(tl / app.TimeUtil.M_MS));
                                cfg.els.a_update.innerHTML = 'Ускорить за <span class="res_icon res_icon_inline res_gem"></span>{0}'.format(price);

                                if (this._state.v !== 3) {
                                    cfg.els.reward.style.display = 'none';
                                    cfg.els.a_update.className = 'btn_g mlra_ab btn_c';
                                    cfg.els.a_update.onclick = () => {
                                        // if (app.Utils.hasClass(cfg.els.a_update, 'bw')) return;
                                        // app.Utils.addClass(cfg.els.a_update, 'bw');

                                        // confirmation
                                        {
                                            let p = app.Popups.createPopup({
                                                display: {gems: 1},
                                                onClose() {
                                                    p.tmp._closed = 1;
                                                }
                                            });
                                            p.tmp = {};

                                            p.els.popup.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 40px; top: -25px', text: 'Отдых'}));
                                            p.els.popup.appendChild(app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 20px', html: 'Новый поход в эту экспедицию<br>будет доступен после передышки'}));

                                            let el_time;
                                            p.els.popup.appendChild(el_time = app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 70px;'}));

                                            p.els.popup.appendChild(app.Utils.createDIV({class: 'hr', style: 'width: 330px; position: absolute; top: 110px; left: 0px;'}));
                                            p.els.popup.appendChild(app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 125px;', text: 'Ускорить?'}));

                                            let a_boost;
                                            p.els.popup.appendChild(a_boost = app.Utils.createA({class: 'btn_g btn_gs_c', style: 'left: 107px; top: 155px'}, () => {
                                                if (app.Utils.hasClass(a_boost, 'bw')) return;
                                                app.Utils.addClass(a_boost, 'bw');
                                                app.Network.command({cmd: 'ExpeditionRestBoost', location: id}, data => {
                                                    if (data.error) {
                                                        switch (data.error.code) {
                                                            case 4: {
                                                                app.Utils.showInfo('Недостаточно кристаллов')
                                                                break;
                                                            }
                                                            default: {
                                                                app.Utils.showInfo('Попробуйте позже');
                                                                break;
                                                            }
                                                        }
                                                    } else {
                                                        app.Popups.removePopup(p);
                                                    }
                                                });
                                            }));

                                            const update = () => {
                                                if (p.tmp._closed) return;

                                                const location = app.Model.user.expedition.l[id];
                                                let price;
                                                if (location.s.v !== 3) {
                                                    price = 0;
                                                } else {
                                                    const tl = Math.max(0, location.s.t - app.TimeUtil.now());
                                                    if (tl === 0) {
                                                        price = 0;
                                                    } else {
                                                        price = Math.max(1, Math.ceil(tl / app.TimeUtil.M_MS));
                                                    }
                                                }

                                                el_time.innerHTML = 'Новая закончится через:<br><span class="info">{0}</span>'.format(app.TimeUtil.formatToHumanTime(tl, tl < app.TimeUtil.H_MS * 10 ? 2 : 1));

                                                app.Utils.removeAllChild(a_boost);
                                                app.Utils.appendPriceBlock(a_boost, {t:1, v:price});

                                                console.log('update');
                                                TweenMax.delayedCall(1, update);
                                            };
                                            update();

                                            let contentRequiredHeight = 330;
                                            let availableHeight0 = app.LAYOUT.getClientWHS0(80 + 40);
                                            let availableHeight = Math.min(contentRequiredHeight, availableHeight0);

                                            let top = (availableHeight0 - availableHeight) / 2;
                                            top = Math.max(80, top);

                                            p.els.popup.style.top = top + 'px';
                                            p.els.popup.style.width = '330px';
                                            p.els.popup.style.height = '200px';

                                            app.Popups.add(p);
                                        }
                                    };
                                    this._updateState(3);
                                }
                                break;
                            }
                        }
                    }
                };

                const cfgLocation = app.CFGUtil.getExpeditionLocation(id);

                cfg.els.main = app.Utils.createDIV({class: 'exp_row exp_row_' + id});
                cfg.els.desc = app.Utils.createDIV({class: 'exp_desc'});
                cfg.els.desc.appendChild(app.Utils.createDIV({class: 'str major', html: (cfgLocation.premium ? '<span class="vip_bg_crown_inline"></span>' : '') + cfgLocation.name}));
                cfg.els.desc.appendChild(cfg.els.required = app.Utils.createDIV({class: 'mt5'}));
                cfg.els.desc.appendChild(cfg.els.duration = app.Utils.createDIV({class: 'mt5'}));
                cfg.els.desc.appendChild(cfg.els.reward = app.Utils.createDIV({class: 'mt5', html: 'Награда: <span class="res_icon res_icon_inline res_nexit"></span> <span class="info">{0}</span>'.format(cfgLocation.reward.nexit)}));
                cfg.els.main.appendChild(cfg.els.desc);

                cfg.els.main.appendChild(cfg.els.a_update = app.Utils.createA({class: 'btn_g mlra_ab ' + (cfgLocation.premium ? 'btn_gs_a' : 'btn_gs_c'), style: 'bottom: 7px', text: 'Отправить'}));

                return cfg;
            };

            const keys = Object.keys(app.Model.user.expedition.l);
            keys.reverse().forEach(key => {
                const cfg = createRow(Number(key));
                cfg.update();
                p.tmp.cfgs.push(cfg);
                p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr', style: 'background-size: 600px; margin: 0'}));
                p.scroll.el.appendChild(cfg.els.main);
            });
            p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr', style: 'background-size: 600px; margin: 0'}));

            const v = p.tmp.v = app.TimeUtil.now();
            let tl;
            const update = () => {
                if (p.tmp._closed || v !== p.tmp.v) return;

                if (tl) {
                    tl.kill();
                }

                const keys = Object.keys(app.Model.user.expedition.l);
                if (keys.length !== p.tmp.cfgs.length) {
                    for (const key of keys) {
                        let cfg = p.tmp.cfgs.find(cfg => cfg._id === Number(key));
                        if (!cfg) {
                            cfg = createRow(Number(key));
                            cfg.update();
                            p.scroll.el.insertBefore(cfg.els.main, p.tmp.cfgs[0].els.main);
                            p.scroll.el.insertBefore(app.Utils.createDIV({class: 'hr', style: 'background-size: 600px; margin: 0'}), p.tmp.cfgs[0].els.main);
                            p.tmp.cfgs.splice(0, 0, cfg);
                        }
                    }
                }

                p.tmp.cfgs.forEach(cfg => cfg.update());

                p.scroll.update();

                tl = TweenMax.delayedCall(0.3, update);
            };
            tl = TweenMax.delayedCall(1, update);

            p.els.wrap.style.top = '150px';
            p.els.wrap.style.left = '20px';
            p.els.wrap.style.width = '440px';
            p.els.wrap_s.style.width = '440px';
            p.els.wrap.style.height = (p.scroll.availableHeight - 150) + 'px';

            p.scroll.top = 0;
            p.scroll.el.style.top = p.scroll.top + 'px';

            p.scroll.update = () => {
                TweenMax.delayedCall(0.001, () => {
                    const contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                    const availableHeight = p.scroll.availableHeight - 150 - 20;
                    p.scroll.topMax = availableHeight < contentRequiredHeight ? contentRequiredHeight - availableHeight : 0;
                });
            };
            p.scroll.update();
        },

        _create1(id) {
            const p = app.Popups.createPopup1({
                id: 'EXPEDITION_' + id,
                display: {nexit: 1, gems: 1},
                onReplace() {
                    p.tmp._closed = 1;
                },
                onClose() {
                    p.tmp._closed = 1;
                }
            });

            p.tmp = {
                id: id,
                cfgLocation: app.CFGUtil.getExpeditionLocation(id),
                location: app.Model.user.expedition.l[id]
            };

            p.els.brd_bg.className = 'brd_block_bg';

            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + 76);
            const contentRequiredHeight = 628;

            let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
            let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';

            p.scroll.availableHeight = availableHeight;
            p.scroll.update = () => {
                TweenMax.delayedCall(0.001, () => {
                    p.scroll.top = 0;
                    p.scroll.topMax = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.contentRequiredHeight - p.scroll.availableHeight : 0;
                    p.scroll.el.style.top = p.scroll.top + 'px';
                });
            };

            this._create1_content(p);

            p.scroll.update();

            p.els.brd_r.appendChild(app.Utils.createHelpPopup('Expeditions'));

            app.Popups.add(p);
        },

        _create1_content(p) {
            this._clear1_content(p);

            p.tmp.list = [];

            if (p.tmp.location.s.v === 0) {
                this._create1_content0(p);
            } else if (p.tmp.location.s.v === 1) {
                this._create1_content1(p);
            } else if (p.tmp.location.s.v === 2) {
                this._create1_content2(p);
            }
        },

        _clear1_content(p) {
            delete p.tmp.v;
            if (p.tmp.list) {
                p.tmp.list.forEach(el => {
                    if (el.parentNode) el.parentNode.removeChild(el)
                });
                delete p.tmp.list;
            }
            app.Utils.removeAllChild(p.scroll.el);
        },

        _create1_content0(p) {
            let el_list, el_duration, el_required, el_a;
            p.els.brd_r.appendChild(el_list = app.Utils.createDIV({class: 'list_s', style: 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 5px; min-height: 120px; cursor: pointer'}, null,
                [
                    app.Utils.createDIV({class: 'cntr'}, null, [
                        app.Utils.createDIV({}, null, [
                            app.Utils.createDIV({class: 'major str', text: 'Выберите карты для экспедиции'}),
                            el_duration = app.Utils.createDIV({class: 'mt5'}),
                            el_required = app.Utils.createDIV({class: 'mt5'}),
                            app.Utils.createDIV({class: 'mt5', html: 'Награда: <span class="res_icon res_icon_inline res_nexit"></span> <span class="info">{0}</span>'.format(p.tmp.cfgLocation.reward.nexit)}),
                            el_a = app.Utils.createA({class: 'btn_g mlra_ab ' + (p.tmp.cfgLocation.premium ? 'btn_gs_a' : 'btn_gs_c'), style: 'bottom: 2px'})
                        ])
                    ])
                ]));
            el_duration.innerHTML = 'Длительность: <span class="info"> {0}</span>'.format(app.TimeUtil.formatToHumanTime(p.tmp.cfgLocation.duration.run, 1));
            el_a.innerText = 'Отправить';
            el_a.onclick = () => {
                if (app.Utils.hasClass(el_a, 'bw')) {
                    app.Utils.showInfo('Недостаточно мощи');
                    return;
                }
                app.Network.command({cmd: 'ExpeditionStart', location: p.tmp.id}, data => {
                    if (data.error) {
                        switch (data.error.code) {
                            case 5: {
                                app.Utils.showInfo('Можно отправить только 3 экспедиции');
                                break;
                            }
                            case 6: {
                                app.Utils.showInfo('Нужен активный премиум');
                                break;
                            }
                            default: {
                                app.Utils.showInfo('Попробуйте позже');
                                break;
                            }
                        }
                    } else {
                        app.Popups.removePopup(p);
                        //p.tmp.location = app.Model.user.expedition.l[p.tmp.id];
                        //this._create1_content(p);
                    }
                });
            };
            p.tmp.list.push(el_list);

            p.scroll.el.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Доступные карты'}));

            const keys = Object.keys(app.Model.user.expedition.l);
            keys.removeByValue('' + p.tmp.id);

            let cards = app.Model.user.cards.list;
            cards = cards.filter(entry => {
                if (entry.level === -1) return false;
                for (const key of keys) {
                    const location = app.Model.user.expedition.l[key];
                    if (location.l.includes(entry.card)) {
                        return false;
                    }
                }
                return true;
            });
            cards = cards.map(entry => {
                return {card: app.UserUtil.wrapCard(entry.card, true), power: app.UserUtil.getCardPower(entry.card)};
            }, []);
            cards.sort((e1, e2) => e2.power - e1.power);

            cards.forEach((entry, i) => {
                const cfg = app.Cards.createCard(entry.card, {stones: 1});
                const col = i % 4,
                    row = Math.floor(i / 4);
                cfg.main.style = `top: ${40 + row * 160}px; left: ${30 + col * 107}px; transform: matrix(0.73, 0, 0, 0.73, 0, 0)`;
                cfg.main.appendChild(app.Utils.createDIV({class: 'rarity', style: 'top: 190px; left: auto', html: '<span class="str ">Мощь: </span><span class="info ">{0}</span>'.format(app.Utils.toMoney(entry.power))}));
                cfg.main.onclick = () => {
                    if (selected) {
                        app.Network.command({cmd: 'ExpeditionRemoveCard', location: p.tmp.id, card: entry.card.id}, data => {
                            if (data.error) {
                                app.Utils.showInfo('Попробуйте позже');
                            } else {
                                p.tmp.location = app.Model.user.expedition.l[p.tmp.id];
                                selected = !selected;
                                updateOnSelectionChange();
                                update();
                            }
                        });
                    } else {
                        app.Network.command({cmd: 'ExpeditionAddCard', location: p.tmp.id, card: entry.card.id}, data => {
                            if (data.error) {
                                app.Utils.showInfo('Попробуйте позже');
                            } else {
                                p.tmp.location = app.Model.user.expedition.l[p.tmp.id];
                                selected = !selected;
                                updateOnSelectionChange();
                                update();
                            }
                        });
                    }
                };
                p.scroll.el.appendChild(cfg.main);

                const el_done = app.Utils.createSPAN({class: 'sh_card_done', style: `top: ${85 + row * 160}px; left: ${65 + col * 107}px; transform: scale(1); pointer-events: none`});
                p.scroll.el.appendChild(el_done);

                let selected = p.tmp.location.l.includes(entry.card.id);
                const updateOnSelectionChange = () => {
                    el_done.style.display = selected ? '' : 'none';
                    if (selected) {
                        app.Utils.addClass(cfg.main, 'bw');
                    } else {
                        app.Utils.removeClass(cfg.main, 'bw');
                    }
                }
                updateOnSelectionChange();
            });

            p.els.wrap.style.top = '150px';
            p.els.wrap.style.height = (p.scroll.availableHeight - 150) + 'px';
            p.scroll.contentRequiredHeight = 40 + 160 + (160 * Math.ceil(cards.length / 4));
            p.scroll.update();

            const v = p.tmp.v = app.TimeUtil.now();
            let tl;
            const update = () => {
                if (p.tmp._closed || v !== p.tmp.v) return;

                if (tl) {
                    tl.kill();
                }

                const location = app.Model.user.expedition.l[p.tmp.id];
                if (location !== p.tmp.location) {
                    this._create1(p.tmp.id);
                } else {
                    const cardsPower = location.l.reduce((acc, cardId) => acc + app.UserUtil.getCardPower(cardId), 0);
                    el_required.innerHTML = `Необходимая мощь: <span class="info"><span class="${location.pwr > cardsPower ? 'red' : 'r_green'}">${app.Utils.toMoney(cardsPower)}</span> / ${app.Utils.toMoney(location.pwr)}</span>`;
                    if (location.pwr > cardsPower) {
                        app.Utils.addClass(el_a, 'bw');
                    } else {
                        app.Utils.removeClass(el_a, 'bw');
                    }
                    tl = TweenMax.delayedCall(1, update);
                }
            };
            update();
        },

        _create1_content1(p) {
            let el_list, el_duration, el_required;
            p.els.brd_r.appendChild(el_list = app.Utils.createDIV({class: 'list_s', style: 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 5px; min-height: 90px; cursor: pointer'}, null,
                [
                    app.Utils.createDIV({class: 'cntr'}, null, [
                        app.Utils.createDIV({}, null, [
                            app.Utils.createDIV({class: 'major str', text: p.tmp.cfgLocation.name}),
                            el_required = app.Utils.createDIV({class: 'mt5'}),
                            el_duration = app.Utils.createDIV({class: 'mt5'}),
                            app.Utils.createDIV({class: 'mt5', html: 'Награда: <span class="res_icon res_icon_inline res_nexit"></span> <span class="info">{0}</span>'.format(p.tmp.cfgLocation.reward.nexit)}),
                        ])
                    ])
                ]));
            p.tmp.list.push(el_list);

            p.scroll.el.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Участвуют карты'}));

            let cards = p.tmp.location.l.map(cardId => app.UserUtil.getCardByID(cardId), []);

            cards.forEach((entry, i) => {
                let selected = p.tmp.location.l.includes(entry.card);
                const card = app.UserUtil.wrapCard(entry.card, true);
                const cfg = app.Cards.createCard(card, {stones: 1});
                const col = i % 4,
                    row = Math.floor(i / 4);
                cfg.main.style = `top: ${40 + row * 160}px; left: ${30 + col * 107}px; transform: matrix(0.73, 0, 0, 0.73, 0, 0)`;
                if (selected) {
                    app.Utils.addClass(cfg.main, 'bw');
                }
                const power = app.UserUtil.getCardPower(card.id);
                cfg.main.appendChild(app.Utils.createDIV({class: 'rarity', style: 'top: 190px; left: auto', html: '<span class="str ">Мощь: </span><span class="info ">{0}</span>'.format(app.Utils.toMoney(power))}));
                cfg.main.onclick = () => {

                };
                p.scroll.el.appendChild(cfg.main);

                const el_done = app.Utils.createSPAN({class: 'sh_card_done', style: `top: ${85 + row * 160}px; left: ${65 + col * 107}px; transform: scale(1); pointer-events: none`});
                el_done.style.display = selected ? '' : 'none';

                p.scroll.el.appendChild(el_done);
            });

            p.els.wrap.style.top = '120px';
            p.els.wrap.style.height = (p.scroll.availableHeight - 120) + 'px';
            p.scroll.contentRequiredHeight = 40 + 160 + (160 * Math.ceil(cards.length / 4));
            p.scroll.update();

            const v = p.tmp.v = app.TimeUtil.now();
            const update = () => {
                if (p.tmp._closed || v !== p.tmp.v) return;
                const location = app.Model.user.expedition.l[p.tmp.id];
                if (location !== p.tmp.location) {
                    this._create1(p.tmp.id);
                } else {
                    const tl = Math.max(0, location.s.t - app.TimeUtil.now());
                    if (tl === 0) {
                        el_duration.innerHTML = 'Завершение ...';
                    } else {
                        el_duration.innerHTML = 'Осталось: <span class="info"> {0}</span>'.format(app.TimeUtil.formatToHumanTime(tl, tl < app.TimeUtil.H_MS * 10 ? 2 : 1));
                    }
                    const power = location.l.reduce((acc, cardId) => acc + app.UserUtil.getCardPower(cardId), 0);
                    el_required.innerHTML = 'Задействована мощь: <span class="info"> {0}</span>'.format(app.Utils.toMoney(power));
                    TweenMax.delayedCall(1, update);
                }
            };
            update();
        },

        _create1_content2(p) {
            let el_list, el_duration, el_required, el_a;
            p.els.brd_r.appendChild(el_list = app.Utils.createDIV({class: 'list_s', style: 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 5px; min-height: 100px; cursor: pointer'}, null,
                [
                    app.Utils.createDIV({class: 'cntr'}, null, [
                        app.Utils.createDIV({}, null, [
                            app.Utils.createDIV({class: 'major str', text: p.tmp.cfgLocation.name}),
                            el_duration = app.Utils.createDIV({class: 'mt5'}),
                            el_required = app.Utils.createDIV({class: 'mt5'}),
                            el_a = app.Utils.createA({class: 'btn_g btn_a mlra_ab', style: 'bottom: 2px'})
                        ])
                    ])
                ]));

            el_duration.innerHTML = 'Экспедиция завершена';

            const power = p.tmp.location.l.reduce((acc, cardId) => acc + app.UserUtil.getCardPower(cardId), 0);
            el_required.innerHTML = 'Задействована мощь: <span class="info"> {0}</span>'.format(app.Utils.toMoney(power));

            el_a.appendChild(app.Utils.createText('Забрать '));
            el_a.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_nexit'}));
            el_a.appendChild(app.Utils.createText(getLocationCompleteReward(p.tmp.cfgLocation.reward.nexit)));
            el_a.onclick = () => {
                if (app.Utils.hasClass(el_a, 'bw')) return;
                app.Utils.addClass(el_a, 'bw');
                app.Network.command({cmd: 'ExpeditionReward', location: p.tmp.id}, data => {
                    if (data.error) {
                        app.Utils.showInfo('Попробуйте позже');
                    } else {
                        app.Chests.showDrop(data.drop);
                        app.Popups.removePopup(p);
                    }
                });
            };

            p.tmp.list.push(el_list);

            p.scroll.el.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Участвуют карты'}));

            let cards = p.tmp.location.l.map(cardId => app.UserUtil.getCardByID(cardId), []);
            cards.forEach((entry, i) => {
                let selected = p.tmp.location.l.includes(entry.card);
                const card = app.UserUtil.wrapCard(entry.card, true);
                const cfg = app.Cards.createCard(card, {stones: 1});
                const col = i % 4,
                    row = Math.floor(i / 4);
                cfg.main.style = `top: ${40 + row * 160}px; left: ${30 + col * 107}px; transform: matrix(0.73, 0, 0, 0.73, 0, 0)`;
                if (selected) {
                    app.Utils.addClass(cfg.main, 'bw');
                }
                const power = app.UserUtil.getCardPower(card.id);
                cfg.main.appendChild(app.Utils.createDIV({class: 'rarity', style: 'top: 190px; left: auto', html: '<span class="str ">Мощь: </span><span class="info ">{0}</span>'.format(app.Utils.toMoney(power))}));
                cfg.main.onclick = () => {

                };
                p.scroll.el.appendChild(cfg.main);

                const el_done = app.Utils.createSPAN({class: 'sh_card_done', style: `top: ${85 + row * 160}px; left: ${65 + col * 107}px; transform: scale(1); pointer-events: none`});
                el_done.style.display = selected ? '' : 'none';

                p.scroll.el.appendChild(el_done);
            });

            p.els.wrap.style.top = '150px';
            p.els.wrap.style.height = (p.scroll.availableHeight - 150) + 'px';
            p.scroll.contentRequiredHeight = 40 + 160 + (160 * Math.ceil(cards.length / 4));
            p.scroll.update();
        }
    };
}