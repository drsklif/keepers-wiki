app.StonesPage = (function() {

    function createInDungeonTab(p) {
        app.EventDispatcher.emit('MainPage show hide', {gems: 1, stones_dust: 1});

        app.Utils.removeAllChild(p.scroll.el);

        p.els.brd_bg.className = 'brd_block_bg_stone_cave';

        let content = app.Utils.createDIV({});
        p.scroll.el.appendChild(content);

        // for cells update
        let v = Math.random();

        let update = () => {
            app.Utils.removeAllChild(content);

            let cfg_tries = {
                v: v,
                els: {},
                create() {
                    this.els.main = app.Utils.createDIV({class: 'battle_advice', style: 'top: 20px; font-size: 15px; width: 440px; left: 20px;'});
                    content.appendChild(this.els.main);
                },
                update() {
                    if (this.v !== v) return;

                    if (app.Model.user.s_cave.t.l > 0) {
                        delete this.els.prefix;
                        delete this.els.time;
                        delete this.els.refresh;
                        app.Utils.removeAllChild(this.els.main);
                        this.els.main.innerHTML = 'Осталось попыток поиска сегодня: <span class="info">{0}</span>'.format(app.Model.user.s_cave.t.l);
                    } else if (app.Model.user.s_cave.l && Object.keys(app.Model.user.s_cave.l).length === 64) {
                        delete this.els.prefix;
                        delete this.els.time;
                        delete this.els.refresh;
                        app.Utils.removeAllChild(this.els.main);
                        let tl = app.Model.user.s_cave.rt - app.TimeUtil.now();
                        this.els.main.innerHTML = 'Все обновится через: <span class="info">{0}</span>'.format(app.TimeUtil.formatToHumanTime(tl, 2));
                    } else {
                        if (!this.els.prefix) {
                            app.Utils.removeAllChild(this.els.main);
                            this.els.main.appendChild(this.els.prefix = app.Utils.createText('Новые попытки через: '));
                            this.els.main.appendChild(this.els.time = app.Utils.createSPAN({class: 'info'}));
                            this.els.main.appendChild(this.els.refresh = app.Utils.createA({class: 'tdn', html: '<span class="refresh_btn ml5"/>'}, () => {
                                if (app.Utils.hasClass(this.els.refresh, 'bw')) return;

                                let resetPrice = app.CFGUtil.getStonesCaveResetTriesPrice(app.Model.user.s_cave.t.trc);
                                if (!app.UserUtil.canPay(resetPrice)) {
                                    app.EventDispatcher.emit('not enough resources', {price: resetPrice});
                                    return;
                                }

                                app.Utils.addClass(this.els.refresh, 'bw');

                                app.Network.command({cmd: 'StonesCaveResetTries'}, (data) => {
                                    if (data.error) {
                                        app.Utils.showInfoTryLater();
                                    } else {
                                        cfg_tries.update();
                                    }
                                });
                            }));
                        }
                        let resetPrice = app.CFGUtil.getStonesCaveResetTriesPrice(app.Model.user.s_cave.t.trc);
                        app.Utils.appendPriceBlock(this.els.refresh, resetPrice);
                        let tl = app.Model.user.s_cave.rt - app.TimeUtil.now();
                        this.els.time.innerText = app.TimeUtil.formatToHumanTime(tl, 2);
                    }
                    TweenMax.delayedCall(1, this.update);
                }
            };
            cfg_tries.create();
            cfg_tries.update();

            let cellIcons = [1,2,3,4,4,3,2,1, 2,1,4,3,4,1,2,3, 1,2,3,4,4,3,2,1, 2,1,4,3,4,1,2,3, 1,2,3,4,4,3,2,1, 2,1,4,3,4,1,2,3, 1,2,3,4,4,3,2,1, 2,1,4,3,4,1,2,3];

            let cells = app.Utils.createDIV({class: 'cave_cells'});
            let currentCellCFG;
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    let cellNum = i * 8 + j + 1;
                    let cfg = {els: {}};
                    cfg.els.main = app.Utils.createDIV({class: 'cave_cell cave_cell' + cellIcons[cellNum - 1], style: 'cursor: pointer;'});
                    let cell = app.UserUtil.getStonesCaveCellByNum(cellNum);
                    if (cell) {
                        if (cell.t) {
                            switch (cell.t) {
                                case 'D':
                                    cfg.els.main.appendChild(app.Utils.createSPAN({class: 'res_icon res_dust_stone'}));
                                    cfg.els.main.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', style: 'display: block', text: cell.v}));
                                    cfg.els.main.appendChild(app.Utils.createSPAN({class: 'done', style: 'top: 18px;'}));
                                    break;
                                case 'C':
                                case 'H':
                                case 'F':
                                case 'N':
                                case 'W':
                                    cfg.els.main.appendChild(app.Utils.createDIV({class: 'sh_card_stone {0}'.format(app.Utils.getStoneClassByType(cell.t))}));
                                    cfg.els.main.appendChild(app.Utils.createSPAN({class: 'done', style: 'top: 18px;'}));
                                    break;
                            }
                        } else {
                            currentCellCFG = cfg;
                            currentCellCFG.cell = cell;
                            cfg.els.main.appendChild(app.Utils.createDIV({class: 'cave_cell_time'}));
                            cfg.els.main.appendChild(cfg.time = app.Utils.createDIV({class: 'cave_cell_time_txt'}));
                            cfg.v = v;
                            cfg.update = () => {
                                if (p.tmp._closed || cfg.v !== v) return;
                                let tl = (cell.et - app.TimeUtil.now());
                                if (tl < 0) {
                                    cfg.time.innerText = 'готово';
                                } else {
                                    cfg.time.innerText = app.TimeUtil.formatToHumanTime(tl, 2);
                                }
                                TweenMax.delayedCall(1, cfg.update);
                            }
                            cfg.update();
                            cfg.els.main.onclick = () => {
                                let p;
                                let doComplete = () => {
                                    if (cfg._click === 1) return;
                                    cfg._click = 1;
                                    app.Network.command({cmd: 'StonesCaveSearchCompleted'}, (data) => {
                                        delete cfg._click;
                                        if (data.error) {
                                        } else {
                                            showSearchCompleted(data);
                                            update();
                                            app.EventDispatcher.emit('user resources changed');
                                            if (p) app.Popups.removePopup(p);
                                        }
                                    });
                                };

                                let tl = (cell.et - app.TimeUtil.now());
                                if (tl >= 0) {
                                    p = app.Popups.createPopup({
                                        display: {gems: 1},
                                        onClose() {
                                            p.tmp._closed = 1;
                                        }
                                    });

                                    p.tmp = {};

                                    p.els.popup.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 40px; top: -25px', text: 'Поиск камней'}));
                                    p.els.popup.appendChild(app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 20px;', html: 'Можно найти камни или<br> пыль для их прокачки'}));

                                    let el_time;
                                    p.els.popup.appendChild(el_time = app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 65px;'}));

                                    p.els.popup.appendChild(app.Utils.createDIV({class: 'hr', style: 'width: 330px; position: absolute; top: 90px; left: 0px;'}));
                                    p.els.popup.appendChild(app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 100px;', text: 'Ускорить?'}));

                                    let a_boost;
                                    p.els.popup.appendChild(a_boost = app.Utils.createA({class: 'btn_g btn_gs_c', style: 'left: 107px; top: 130px'}, () => {
                                        if (app.Utils.hasClass(a_boost, 'bw')) return;
                                        app.Utils.addClass(a_boost, 'bw');
                                        app.Network.command({cmd: 'StonesCaveBoostSearch'}, (data) => {
                                            if (data.error) {
                                                switch (data.error.code) {
                                                    case 3:
                                                        doComplete();
                                                        break;
                                                    default:
                                                        app.Utils.showInfoTryLater();
                                                    break;
                                                }
                                            } else {
                                                doComplete();
                                            }
                                        });
                                    }));

                                    let update = () => {
                                        if (p.tmp._closed || cfg.v !== v) return;
                                        let tl = (cell.et - app.TimeUtil.now());
                                        if (tl < 0) {
                                            app.Popups.removePopup(p);
                                            doComplete();
                                        } else {
                                            el_time.innerHTML = 'Закончится через: <span class="info">{0}</span>'.format(app.TimeUtil.formatToHumanTime(tl, 2));
                                            let price = app.CFGUtil.getStonesCFGIntervalBoostPrice();
                                            let minutes = Math.ceil(tl / app.TimeUtil.M_MS);
                                            if (minutes > 1) {
                                                price = app.Utils.clone(price);
                                                price.v = price.v * minutes;
                                            }
                                            app.Utils.removeAllChild(a_boost);
                                            app.Utils.appendPriceBlock(a_boost, price);
                                            TweenMax.delayedCall(1, update);
                                        }
                                    };
                                    update();

                                    let contentRequiredHeight = 350;
                                    let availableHeight0 = app.LAYOUT.getClientWHS0(80 + 40);
                                    let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
                                    let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

                                    p.els.popup.style.top = top + 'px';
                                    p.els.popup.style.width = '330px';
                                    p.els.popup.style.height = '180px';

                                    app.Popups.add(p);
                                } else {
                                    doComplete();
                                }
                            };
                        }
                    } else {
                        cfg.els.main.onclick = () => {
                            if (cfg._click === 1) return;
                            cfg._click = 1;
                            app.Network.command({cmd: 'StonesCaveStartDig', cell: cellNum}, (data) => {
                                delete cfg._click;
                                if (data.error) {
                                    switch (data.error.code) {
                                        case 2:
                                            if (currentCellCFG) {
                                                let cell = currentCellCFG.cell;
                                                if (cell.et - app.TimeUtil.now() > 0) {
                                                    app.Utils.showInfo('Сначала дождись награды', {type: 0});
                                                } else {
                                                    app.Utils.showInfo('Сначала забери награду', {type: 0});
                                                }
                                                let tl = new TimelineMax();
                                                tl.set(currentCellCFG.els.main, {transformOrigin: 'center'});
                                                tl.to(currentCellCFG.els.main, 0.1, {scale: 1.1});
                                                tl.to(currentCellCFG.els.main, 0.1, {scale: 1});
                                            } else {
                                                app.Utils.showInfo('Попробуйте обновить игру');
                                            }
                                            break;
                                        case 3:
                                            app.Utils.showInfo('Попытки закончились');
                                            break;
                                        default:
                                            app.Utils.showInfoTryLater();
                                            break;
                                    }
                                } else {
                                    update();
                                }
                            });
                        };
                    }
                    cells.appendChild(cfg.els.main);
                }
            }
            content.appendChild(cells);
        };
        update();
    }

    function showSearchCompleted(data) {
        let cell = data.cell;

        let p = app.Popups.createPopup({
            display: {gems: 1, stones_dust: 1}
        });

        p.els.popup.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 40px; top: -25px', text: 'Поиск камней'}));
        p.els.popup.appendChild(app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 20px', html: '<div class="info mb5">Поиск завершен</div>Найдено:'}));

        switch (cell.t) {
            case 'D': {
                const value = data.gbBonus
                        ? data.value
                        : cell.v;
                p.els.popup.appendChild(app.Utils.createDIV({
                    class: 'item_slot item_slot_empty mlra_ab',
                    style: 'top: 80px',
                    html: '<span class="res_icon res_dust_stone" style="left: 12px; top: 9px;"></span><span class="txt txt_need">{0}{1}</span><span class="brd"></span>'.format(value, data.gbBonus ? ' <span class="r_green">+{0}</span>'.format(data.gbBonus) : '')
                }));
                break;
            }
            case 'C':
            case 'H':
            case 'F':
            case 'N':
            case 'W':
                p.els.popup.appendChild(app.Utils.createDIV({class: 'sh_card_stone_plate stone_q1 mlra_ab', style: 'top:80px; transform: scale(1.25); transform-origin: center;', html: '<div class="sh_card_stone {0}"></div><div class="sh_card_stone_lvl">1</div>'.format(app.Utils.getStoneClassByType(cell.t))}));
                break
        }

        p.els.popup.appendChild(app.Utils.createA({class: 'btn_g btn_gs_c', style: 'left: 107px; bottom: 20px', text: 'Отлично'}, () => {
            app.Popups.removePopup(p);
        }))

        let contentRequiredHeight = 350;
        let availableHeight0 = app.LAYOUT.getClientWHS0(80 + 40);
        let availableHeight = Math.min(contentRequiredHeight, availableHeight0);

        let top = (availableHeight0 - availableHeight) / 2;
        top = Math.max(80, top);

        p.els.popup.style.top = top + 'px';
        p.els.popup.style.width = '330px';
        p.els.popup.style.height = '220px';

        app.Popups.add(p);
    }

    return {
        createInDungeonTab: createInDungeonTab
    }

})();