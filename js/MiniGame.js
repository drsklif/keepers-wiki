if (!app.MiniGame) {
    app.MiniGame = {
        TOTAL_COUPLES: 15,
        COUPLES_FOR_CHEST: 15,

        create() {
            const minigame = app.Model.user.minigame;

            const p = app.Popups.createPopup1({
                id: 'MINI_GAME',
                display: {gems: 1},
                onClose() {
                    p.tmp._closed = 1;
                    app.MainPage.getCFG().resources.energy_mini_game && app.MainPage.getCFG().resources.energy_mini_game.remove();
                }
            });

            p.els.brd_bg.className = 'brd_block_bg_fm';

            const v = Math.random();
            p.tmp = {
                v,
                els: {}
            };

            this._createResourceBlock(p);

            p.els.brd_r.appendChild(p.els.header = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Поиск близнецов'}));

            // create tabs
            p.cfg.tabs = {};

            if (minigame && (minigame.s.v !== 3 || minigame.found >= app.MiniGame.COUPLES_FOR_CHEST)) {
                p.cfg.tabs.t1 = {els: {}};
                p.cfg.tabs.t1.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 30px; z-index: 0', text: 'Событие'}, () => {
                    app.SoundManager.playClick();
                    this._onTabClick(p, 1);
                });
                p.els.brd_r.appendChild(p.cfg.tabs.t1.els.main);
                p.cfg.tabs.active = 1;
            } else {
                p.cfg.tabs.active = 2;
            }

            p.cfg.tabs.t2 = {els: {}};
            p.cfg.tabs.t2.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: {0}px; ; z-index: 0'.format(p.cfg.tabs.t1 ? 136 : 30), text: 'Рейтинг'}, () => {
                app.SoundManager.playClick();
                this._onTabClick(p, 2);
            });
            p.els.brd_r.appendChild(p.cfg.tabs.t2.els.main);

            this._onTabClick(p, p.cfg.tabs.active);

            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + 80);
            const availableHeight = Math.min(628, availableHeight0);
            const top = Math.max(80, (availableHeight0 - availableHeight) / 2);

            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';

            p.els.wrap.style.height = (availableHeight - 150) + 'px';
            p.els.wrap.style.width = '420px';
            p.els.wrap_s.style.width = '420px';
            p.els.wrap.style.left = '30px';
            p.els.wrap.style.top = '150px';

            p.scroll.availableHeight = (availableHeight - 150);
            p.scroll.update = () => {
                TweenMax.delayedCall(0.001, () => {
                    const h = 100;
                    const contentRequiredHeight = 5 * h;
                    p.scroll.topMax = p.scroll.availableHeight < contentRequiredHeight ? contentRequiredHeight - p.scroll.availableHeight : 0;
                    p.scroll.top = 0;
                    p.scroll.el.style.top = '0px';
                });
            };

            p.els.brd_r.appendChild(p.tmp.help = this._createHelp('MiniGame'));

            app.Popups.add(p);
        },

        _createResourceBlock(p) {
            const resources = app.MainPage.getCFG().resources;
            if (resources.energy_mini_game) {
                return
            }

            resources.energy_mini_game = {
                els: {},
                show() {
                    this.els.main.style.display = '';
                },
                hide() {
                    this.els.main.style.display = 'none';
                },
                remove() {
                    resources.energy_mini_game.els.main.parentNode.removeChild(resources.energy_mini_game.els.main);
                    delete resources.energy_mini_game;
                }
            };

            resources.energy_mini_game.els.main = app.Utils.createA({class: 'res_bg'}, () => {
                app.SoundManager.playClick();
                this._showEnergyShop();
            });
            resources.energy_mini_game.els.main.appendChild(resources.energy_mini_game.els.value = app.Utils.createSPAN({}));
            resources.energy_mini_game.els.main.appendChild(resources.energy_mini_game.els.icon = app.Utils.createSPAN({class: 'res_icon res_energy_p'}));
            resources.els.main.appendChild(resources.energy_mini_game.els.main);

            resources.energy_mini_game.update = () => {
                if (p.tmp._closed) {
                    resources.energy_mini_game && resources.energy_mini_game.remove();
                    return;
                }

                const minigame = app.Model.user.minigame;
                if (!minigame) {
                    resources.energy_mini_game && resources.energy_mini_game.remove();
                    return;
                }

                if (!resources.energy_mini_game) {
                    return;
                }

                if (resources.energy_mini_game.els.main.style.display === '') {
                    resources.energy_mini_game.els.value.innerText = minigame.attempts.v;
                }

                TweenMax.delayedCall(1, resources.energy_mini_game.update);
            };

            resources.energy_mini_game.update();
        },

        _onTabClick(p, tab) {
            const tabs = p.cfg.tabs;

            tabs.t1 && app.Utils.removeClass(tabs.t1.els.main, 'brd_block_tab_active');
            tabs.t2 && app.Utils.removeClass(tabs.t2.els.main, 'brd_block_tab_active');

            tabs.active = tab;

            this._clearContent(p);

            if (tab === 1) {
                tabs.t1 && app.Utils.addClass(tabs.t1.els.main, 'brd_block_tab_active');
                this._createTab1(p);
            } else {
                tabs.t2 && app.Utils.addClass(tabs.t2.els.main, 'brd_block_tab_active');
                this._createTab2(p);
            }

            tabs.active = tab;
        },

        _clearContent(p) {
            const keys = p.tmp.els;
            if (keys) {
                for (const key in keys) {
                    const node = p.tmp.els[key];
                    node.parentNode.removeChild(node);
                }
            }

            p.tmp.els = {};
            p.scroll.el.innerHTML = '';
        },

        _createTab1(p) {
            const el_list = app.Utils.createDIV({class: 'list_s mlra_ab', style: 'position: absolute; width: 380px; padding: 7px; top: 35px; min-height: 70px'}, null, [
                app.Utils.createDIV({class: 'bp_timer', style: 'right: 15px; top:20px;'}),
                p.tmp.els.timer = app.Utils.createDIV({style: 'position: absolute; width: 70px; right: 0px; top:55px; text-align: center', text: '2д 25ч'}),
                app.Utils.createDIV({class: 'quest_chest_prg'}, null, [
                    app.Utils.createDIV({class: 'quest_chest_prg_wrp'}, null, [
                        p.tmp.els.prg = app.Utils.createDIV({class: 'quest_chest_prg_bg', style: 'width: 0%'}),
                        p.tmp.els.prg_txt = app.Utils.createDIV({class: 'quest_chest_prg_text', text: `0 из ${app.MiniGame.COUPLES_FOR_CHEST}`})
                    ])
                ]),
                app.Utils.createDIV({class: 'quest_chest'}),
                app.Utils.createDIV({class: 'cntr', style: 'margin-left: 0px'}, null, [
                    p.tmp.els.help1 = app.Utils.createDIV({class: 'major big str', text: 'Вы  нашли все пары карт'}),
                    p.tmp.els.help2 = app.Utils.createDIV({class: 'mt5', text: 'Можно открыть!'})
                ]),
            ]);
            let chestClicked = false;
            el_list.onclick = () => {
                if (chestClicked) return;

                const minigame = app.Model.user.minigame;
                if (!minigame) return;

                chestClicked = true;

                const progress = minigame.found;
                const required = app.MiniGame.COUPLES_FOR_CHEST;

                if (progress >= required) {
                    app.Network.command({cmd: 'MiniGameChestOpen'}, data => {
                        if (p.tmp._closed || p.cfg.tabs.active !== 1) {
                        } else {
                            chestClicked = false;
                        }
                        if (data.error) {
                            app.Utils.showInfo('Попробуйте позже');
                        } else if (data.drop && data.drop.list && data.drop.list.length > 0) {
                            app.UserUtil.processChestDrop(data.drop);
                            app.MainPage.getCFG().resources.energy_mini_game.hide();
                            app.EventDispatcher.emit('show chest drop', {drop: data.drop,
                                onComplete: () => {
                                    app.MainPage.getCFG().resources.energy_mini_game.show();
                                    app.EventDispatcher.emit('user resources changed');
                                }
                            });
                        }
                    });
                } else {
                    chestClicked = false;

                    p.tmp.help.style.zIndex = 0;

                    const cp = app.Utils.createChestRewardPopup('Сундук Миг-Мога', {drop: app.Model.cfg.cfgMiniGame.round.reward});
                    cp.cfg.onClose = () => {
                        p.tmp.help.style.zIndex = app.Popups.getNextZIndex();
                    }
                }
            };
            p.tmp.els.el_list = el_list;
            p.els.brd_r.appendChild(el_list);

            const updatePrg = () => {
                const minigame = app.Model.user.minigame;

                const progress = minigame.found;
                const required = app.MiniGame.COUPLES_FOR_CHEST;

                p.tmp.els.prg.style.width = `${app.Utils.toPRG(progress, required)}%`;
                p.tmp.els.prg_txt.innerText = `${progress} из ${required}`;

                if (progress >= required) {
                    p.tmp.els.el_list.style.backgroundColor = 'rgb(2, 78, 43)';
                    p.tmp.els.el_list.style.borderColor = 'rgb(255, 197, 73)';
                    p.tmp.els.help1.innerText = 'Вы нашли все пары карт';
                    p.tmp.els.help2.innerText = 'Можно открыть!';
                } else {
                    p.tmp.els.el_list.style.backgroundColor = '';
                    p.tmp.els.el_list.style.borderColor = '';
                    p.tmp.els.help1.innerText = 'Найдите все пары карт';
                    p.tmp.els.help2.innerText = 'Количество пар до награды:';
                }
            };

            const updateEventTime = () => {
                const minigame = app.Model.user.minigame;

                const tl = app.TimeUtil._getMoscowTime(minigame.et) - app.TimeUtil._getMoscowTime(app.TimeUtil.now());
                if (tl < 0) {
                    p.tmp.els.timer.innerHTML = minigame.s.v === 3 ? 'Финал' : '....';
                } else {
                    p.tmp.els.timer.innerHTML = app.TimeUtil.formatToHumanTime(tl, 2);
                }
            };

            if (app.Model.user.minigame.s.v === 2) {
                p.scroll.el.appendChild(app.Utils.createDIV({class: 'battle_advice mlra_ab', style: 'top: 20px; font-size: 15px; width: 420px'}, null, [
                    app.Utils.createText('Новые пары через: '),
                    p.tmp.els.timer1 = app.Utils.createSPAN({class: 'info', text: '24м'}),
                    p.tmp.els.price = app.Utils.createA({class: 'tdn'}, () => {
                        if (app.Utils.hasClass(p.tmp.els.price, 'bw')) return;
                        app.Utils.addClass(p.tmp.els.price, 'bw');
                        app.Network.command({cmd: 'MiniGameRoundReset'}, data => {
                            if (p.tmp._closed || p.cfg.tabs.active !== 1) return;
                            if (data.error) {
                                switch (data.error.code) {
                                    case -1: {
                                        app.Utils.showInfo('Событие уже закончилось.');
                                        break;
                                    }
                                    case 1: {
                                        app.Utils.showInfo('Обновите игру');
                                        break;
                                    }
                                    case 5001: {
                                        app.Utils.processErrors(data.error);
                                        break;
                                    }
                                }
                            }
                        })
                    })
                ]));

                const update = () => {
                    if (p.tmp._closed || p.cfg.tabs.active !== 1) return;

                    const minigame = app.Model.user.minigame;
                    if (!minigame) return;

                    if (minigame.s.v !== 2) {
                        app.MiniGame.create();
                        return;
                    }

                    updatePrg();
                    updateEventTime();

                    const tl = app.TimeUtil._getMoscowTime(minigame.s.t) - app.TimeUtil._getMoscowTime(app.TimeUtil.now());
                    if (tl < 0) {
                        p.tmp.els.timer1.innerText = '...';
                    } else {
                        p.tmp.els.timer1.innerText = app.TimeUtil.formatToHumanTime(tl, 2);
                    }

                    const minutes = Math.ceil(tl / app.TimeUtil.M_MS);
                    const price = {t: 1, v: 1 * minutes};
                    p.tmp.els.price.innerHTML = '<span class="refresh_btn ml5"></span><span class="res_icon res_icon_inline res_gem"></span>' + price.v;

                    TweenMax.delayedCall(0.5, update);
                };
                update();

                return;
            }

            const slots = [];
            let canClick = true;

            const shuffle = (onComplete) => {
                app.Network.command({cmd: 'MiniGameState'}, data => {
                    if (p.tmp._closed || p.cfg.tabs.active !== 1) return;

                    // создаем новые слоты
                    const _slots = [];
                    for (let i = 0; i < app.MiniGame.TOTAL_COUPLES * 2; i++) {
                        const col = i % 6,
                            row = Math.floor(i / 6);

                        if (data.slots[i] === -1) {
                            const slot = this._createSlot( () => onClick(i));
                            slot.coordinates(col * 70, row * 95);
                            _slots.push(slot);
                        } else {
                            _slots.push({els: {}});
                        }
                    }

                    // мешаем все в центр с разбросом
                    const l = 420 / 2 - 70;
                    const t = p.scroll.availableHeight / 2 + Math.abs(p.scroll.top) - 70;

                    let delay = 0;
                    slots.forEach((slot, i) => {
                        if (slot.state === undefined) {
                            return;
                        }
                        const _delay = app.Utils.randomNumber(0.1, 0.3);
                        delay = Math.max(delay, _delay + 0.8);
                        const tl = new TimelineMax({delay: _delay});
                        tl.to(slot.els.back, 0.3, {left: '+=' + app.Utils.randomNumber(-30, 30), top: '+=' + app.Utils.randomNumber(-30, 30)});
                        tl.to(slot.els.back, 0.5, {bezier: [{left: l + app.Utils.randomNumber(-150, 150), top: t + app.Utils.randomNumber(-100, 100)}, {left: l + app.Utils.randomNumber(-30, 30), top: t + app.Utils.randomNumber(-30, 30)}], ease: Power1.easeInOut});
                    });

                    // заменяем слоты
                    TweenMax.delayedCall(delay + 0.1, () => {
                        for (let i = 0; i < app.MiniGame.TOTAL_COUPLES * 2; i++) {
                            const old = slots[i];
                            const _new = _slots[i];
                            if (old.state === undefined) {
                                if (_new.state !== undefined) {
                                    slots[i] = _new;
                                    TweenMax.set(_new.els.back, {left: l + app.Utils.randomNumber(-30, 30), top: t + app.Utils.randomNumber(-30, 30)});
                                    p.scroll.el.appendChild(slots[i].els.back);
                                }
                            } else if (_new.state === undefined) {
                                p.scroll.el.removeChild(old.els.back);
                                slots[i] = _new;
                            } else {
                                _new.els.back.style.left = old.els.back.style.left;
                                _new.els.back.style.top = old.els.back.style.top;
                                slots[i] = _new;
                                p.scroll.el.replaceChild(_new.els.back, old.els.back);
                            }
                        }

                        // выставляем каждый слот на свое новое место
                        slots.forEach((slot, i) => {
                            if (slot.state === undefined) return;
                            TweenMax.to(slot.els.back, 0.5, {bezier: [{left: l + app.Utils.randomNumber(-150, 150), top: t + app.Utils.randomNumber(-100, 100)}, {left: slot._left, top: slot._top}], ease: Power1.easeInOut}, '+=0.3');
                        });

                        onComplete && TweenMax.delayedCall(0.5 + 0.1, onComplete);
                    });
                });
            };

            const onClick = (i) => {
                if (p.tmp._closed || p.cfg.tabs.active !== 1 || !canClick) return;

                canClick = false;

                app.Network.command({cmd: 'MiniGameClick', slot: i}, data => {
                    if (p.tmp._closed || p.cfg.tabs.active !== 1) return;

                    if (data.error) {
                        switch (data.error.code) {
                            case -1: {
                                app.Utils.showInfo('Событие уже закончилось.');
                                break;
                            }
                            case 1: {
                                canClick = true;
                                app.Utils.showInfo('Закончилась энергия пар');
                                app.MiniGame._showEnergyShop();
                                break;
                            }
                            case 3: {
                                app.Utils.showInfo('Кликай в другой слот.');
                                canClick = true;
                                break;
                            }
                            default: {
                                app.Utils.showInfo('Попробуйте позже.');
                                canClick = true;
                                break;
                            }
                        }
                    } else {

                        if (data.points) {
                            TweenMax.delayedCall(1, () => {
                                app.Utils.showInfo('+' + data.points, {type: 0});
                            });
                        }

                        const slot = slots[i];
                        if (data.flag === 1) {
                            slot.createFront(data.card);
                            canClick = false;
                            slot.open(() => canClick = true);
                        } else if (data.flag === 2) {
                            slot.createFront(data.card);
                            canClick = false;
                            slot.open();

                            TweenMax.delayedCall(1, () => {
                                slots.forEach(slot => {
                                    if (slot.els.front) {
                                        slot.close();
                                    }
                                });
                                if (data.shuffle) {
                                    TweenMax.delayedCall(0.5, () => {
                                        shuffle(() => canClick = true);
                                    });
                                } else {
                                    TweenMax.delayedCall(0.1, () => canClick = true);
                                }
                            });
                        } else if (data.flag === 3) {
                            slot.createFront(data.card);
                            canClick = false;
                            slot.open();
                            TweenMax.delayedCall(1, () => {
                                slots.forEach(slot => {
                                    if (slot.els.front) {
                                        slot.hide(() => canClick = true);
                                    }
                                });
                            });
                        }

                        if (app.Model.user.minigame && app.Model.user.minigame.s.v !== 1) {
                            if (tl_update) tl_update.kill();
                            TweenMax.delayedCall(1.5, () => {
                                app.MiniGame.create();
                            });
                        }
                    }
                });
            };

            p.els.brd_r.appendChild(p.tmp.els.attempt = app.Utils.createDIV({class: 'mt5 cntr', style: 'position: absolute; width: 480px; top: 125px', html: 'Можно получить за найденную пару: <span class="major">10</span> очков'}));

            app.Network.command({cmd: 'MiniGameState'}, data => {
                if (p.tmp._closed || p.cfg.tabs.active !== 1) return;

                for (let i = 0; i < app.MiniGame.TOTAL_COUPLES * 2; i++) {
                    const col = i % 6,
                        row = Math.floor(i / 6);

                    if (data.slots[i] === -1) {
                        const slot = this._createSlot( () => onClick(i));
                        slot.coordinates(col * 70, row * 95);
                        slots.push(slot);
                        p.scroll.el.appendChild(slot.els.back);
                    } else if (data.slots[i] > 0) {
                        const slot = this._createSlot( () => onClick(i));
                        slot.coordinates(col * 70, row * 95);
                        slots.push(slot);
                        p.scroll.el.appendChild(slot.els.back);
                        TweenMax.delayedCall(0.5, () => {
                            slot.createFront(data.slots[i]);
                            canClick = false;
                            slot.open();
                        });
                    } else {
                        slots.push({els: {}});
                    }

                }
                p.scroll.update();
                TweenMax.delayedCall(1.2, () => canClick = true);
            });

            let tl_update;
            const update = () => {
                if (p.tmp._closed || p.cfg.tabs.active !== 1) return;

                const minigame = app.Model.user.minigame;
                if (!minigame) return;

                if (minigame.s.v !== 1) {
                    app.MiniGame.create();
                    return;
                }

                updateEventTime();
                updatePrg();

                const points = 10 - minigame.attempt;
                p.tmp.els.attempt.innerHTML = 'Можно получить за найденную пару: <span class="major">{0}</span> {1}'
                    .format(points, app.Utils.getGramString(points, 'очко', 'очка', 'очков'));

                tl_update = TweenMax.delayedCall(0.5, update);
            };
            update();
        },

        _createSlot(onClick) {
            const cfg = {
                els: {},
                state: -1,
                _left: 0,
                _top: 0,
                coordinates(left, top) {
                    left += -35;
                    top += -45;
                    this._left = left;
                    this._top = top;
                    TweenMax.set(cfg.els.back, {left, top});
                },
                createFront(cardId) {
                    const cfgCard = app.CFGUtil.getCardByID(cardId);
                    const card = app.Cards.createCard( {id: cfgCard.id, img: cfgCard.img, quality: cfgCard.quality, level: 0});
                    card.level.style.display = 'none';
                    cfg.els.front = card.main;
                    TweenMax.set(cfg.els.front, {transformOrigin: 'center center', left: this._left, top: this._top, scaleX: 0, scaleY: .5});
                    cfg.els.back.parentNode.appendChild(cfg.els.front);
                },
                open(onComplete) {
                    cfg.els.back.onclick = null;
                    const tl = new TimelineMax({
                        onComplete() {
                            cfg.els.front.onclick = onClick;
                            onComplete && onComplete();
                        }
                    });
                    tl.to(cfg.els.back, 0.3, {scaleX: 0, ease: Power2.easeIn});
                    tl.to(cfg.els.front, 0.3, {scaleX: 0.5, ease: Power2.easeOut});
                },
                close(onComplete) {
                    cfg.els.front.onclick = null;
                    const tl = new TimelineMax({
                        onComplete() {
                            if (cfg.els.front) {
                                if (cfg.els.front.parentNode) {
                                    cfg.els.front.parentNode.removeChild(cfg.els.front);
                                }
                                delete cfg.els.front;
                            }
                            cfg.els.back.onclick = onClick;
                            onComplete && onComplete();
                        }
                    });
                    tl.to(cfg.els.front, 0.3, {scaleX: 0, ease: Power2.easeIn});
                    tl.to(cfg.els.back, 0.3, {scaleX: 0.5, ease: Power2.easeOut});
                },
                hide(onComplete) {
                    cfg.els.back.onclick = null;
                    cfg.els.front.onclick = null;
                    const tl = new TimelineMax({
                        onComplete() {
                            if (cfg.els.front) {
                                if (cfg.els.front.parentNode) {
                                    cfg.els.front.parentNode.removeChild(cfg.els.front);
                                }
                                delete cfg.els.front;
                            }
                            onComplete && onComplete();
                        }
                    });
                    tl.to([cfg.els.front, cfg.els.back], 0.3, {scale: 0, ease: Power2.easeIn});
                }
            };

            cfg.els.back = app.Utils.createDIV({class: 'sh_card sh_card_brd_shirt', style: 'left: 0px; top: 0px'});
            TweenMax.set(cfg.els.back, {transformOrigin: 'center center', scale: 0.5, left: -35, top: -45});

            cfg.els.back.onclick = onClick;

            return cfg;
        },

        _createTab2(p) {
            app.Network.command({cmd: 'MiniGameRating'}, data => {
                if (p.tmp._closed || p.cfg.tabs.active !== 2) return;

                const minigame = app.Model.user.minigame;
                if (!minigame) return;

                const me = data.rating && data.rating.list.find(entry => entry.u.id === app.Model.user.id);

                if (minigame.s.v === 3) {
                    let el = app.Utils.createDIV({class: 'list_s', style: 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 35px; min-height: 75px; cursor: pointer; min-height: 50px;'}, null, [
                        app.Utils.createDIV({class: 'cntr'}, null, [
                            app.Utils.createDIV({text: 'Событие завершилось!'}),
                            app.Utils.createDIV({html: `Твое место в рейтинге: <span class="str major">${me && me.p || '?'}</span>`}),
                            app.Utils.createDIV({class: 'major big str mt5', text: 'Больше всех очков:'})
                        ])
                    ]);
                    p.els.brd_r.appendChild(el);
                    p.tmp.els.el_rating = el;
                } else {
                    let el = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 25px; top: 40px; width: 415px; padding: 5px; height: 55px'}, app.EventDispatcher.emit.bind(null, 'user info', app.Model.user.id));
                    let place;
                    el.appendChild(place = app.Utils.createDIV({class: 'rating_top_p rating_top_m', html: '<span class="normal" style="font-size: 12px; white-space: nowrap;">Моё место</span><div>?</div>'}));

                    let avatar = app.Utils.createAvatarComponent(app.Model.user.rank, app.Model.user.avatar.img);
                    avatar.els.main.style = 'transform: scale(0.7); left: 80px; top: 5px';
                    el.appendChild(avatar.els.main);

                    let points;
                    el.appendChild(points = app.Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 130px; padding-top: 5px', html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Найдено пар:</span><span class="flr mt5"> ?</span>'.format(app.UserUtil.getUserNameUpper0(app.Model.user.name))}));
                    p.els.brd_r.appendChild(el);
                    p.tmp.els.el_rating = el;

                    place.innerHTML = '<span class="normal" style="font-size: 12px; white-space: nowrap;">Моё место</span><div>{0}</div>'.format(me ? (me.p === 0 ? '?' : me.p) : '?');
                    points.innerHTML = '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Очки:</span><span class="flr mt5"> {1}</span>'.format(app.UserUtil.getUserNameUpper0(app.Model.user.name), me ? app.Utils.toMoney(me.v) : '?');
                }

                if (data.rating) {
                    data.rating.list.forEach((entry, i) => {
                        const el = app.Utils.createDIV({class: 'rating_row'}, app.EventDispatcher.emit.bind(null, 'user info', entry.u.id));
                        if (entry.p <= 3) {
                            el.appendChild(app.Utils.createDIV({class: 'rating_top_p rating_top_p' + entry.p}));
                        } else {
                            el.appendChild(app.Utils.createDIV({class: 'rating_top_p', text: entry.p}));
                        }

                        const avatar = app.Utils.createAvatarComponent(entry.u.r, entry.u.a);
                        avatar.els.main.style = 'transform: scale(0.5); left: 40px';
                        el.appendChild(avatar.els.main);

                        el.appendChild(app.Utils.createDIV({class: 'rating_row_r', html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Очки:</span><span class="flr mt5">{1}</span>'.format(app.UserUtil.getUserNameUpper0(entry.u.n), app.Utils.toMoney(entry.v))}));
                        p.scroll.el.appendChild(el);
                        p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb5'}));
                    });
                }

                TweenMax.delayedCall(0.001, () => {
                    if (p.tmp._closed || p.cfg.tabs.active !== 2) return;
                    p.scroll.contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                    p.scroll.top = 0;
                    p.scroll.topMax = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.contentRequiredHeight - p.scroll.availableHeight: 0;
                    p.scroll.el.style.top = p.scroll.top + 'px';
                });
            });
        },

        _showEnergyShop() {
            const p = app.Popups.createPopup({
                id: 'MINIGAME_E_SHOP'
            });

            const v = Math.random();
            p.tmp = {
                v,
                els: {}
            };

            p.els.popup.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 40px; top: -25px', text: 'Энергия Пар'}));

            p.els.popup.appendChild(app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 20px;'}, null, [
                app.Utils.createSPAN({class: 'res_icon res_icon_inline res_energy_p'}),
                p.tmp.els.v = app.Utils.createSPAN({class: 'info'}),
                app.Utils.createText(' из '),
                p.tmp.els.m = app.Utils.createSPAN({})
            ]));

            const update = () => {
                if (p.tmp._closed) return;

                const minigame = app.Model.user.minigame;
                if (!minigame) return;

                p.tmp.els.v.innerText = minigame.attempts.v;
                p.tmp.els.m.innerText = minigame.attempts.m;

                if (minigame.attempts.v < minigame.attempts.m) {
                    if (!p.tmp.els.r) {
                        p.els.popup.appendChild(p.tmp.els.r = app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 45px'}));
                        p.els.popup.appendChild(p.tmp.els.r_hr = app.Utils.createDIV({class: 'hr', style: 'width: 330px; position: absolute; top: 70px; left: 0px'}));
                        p.els.popup.appendChild(p.tmp.els.r_buy_txt = app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 80px', html: 'Купить <span class="res_icon res_icon_inline res_energy_p"></span>25?'}));
                        p.els.popup.appendChild(p.tmp.els.r_buy_btn = app.Utils.createA({class: 'btn_g btn_gs_c', style: 'left: 107px; top: 110px', html: '<span class="res_icon res_icon_inline res_gem"></span>{0}'.format(50 + 25 * minigame.attempts.b)}, () => {
                            if (app.Utils.hasClass(p.tmp.els.r_buy_btn, 'bw')) return;
                            app.Utils.addClass(p.tmp.els.r_buy_btn, 'bw');
                            app.Network.command({cmd: 'MiniGameEnergyBuy'}, data => {
                                if (data.error) {
                                    app.Utils.processErrors(data.error);
                                }
                            })
                        }));
                        p.els.popup.style.height = '160px';
                    }
                    const tl = app.TimeUtil.M_MS * 5 - (app.TimeUtil.now() - minigame.attempts.lrt);
                    if (tl < 0) {
                        p.tmp.els.r.innerHTML = 'обновляем ....';
                    } else {
                        p.tmp.els.r.innerHTML = `+1 через: <span class="info">${app.TimeUtil.formatToHumanTime(tl, 2)}</span>`;
                    }
                } else if (p.tmp.els.r) {
                    const parent = p.tmp.els.r.parentNode;
                    parent.removeChild(p.tmp.els.r);
                    parent.removeChild(p.tmp.els.r_hr);
                    parent.removeChild(p.tmp.els.r_buy_txt);
                    parent.removeChild(p.tmp.els.r_buy_btn);
                    delete p.tmp.els.r;
                    delete p.tmp.els.r_hr;
                    delete p.tmp.els.r_buy_txt;
                    delete p.tmp.els.r_buy_btn;
                    p.els.popup.style.height = '70px';
                }

                TweenMax.delayedCall(0.5, update);
            };

            p.els.popup.style.width = '330px';
            p.els.popup.style.height = '70px';

            update();

            TweenMax.delayedCall(0.001, function () {
                const availableHeight0 = app.LAYOUT.getClientWHS0(0);
                const contentRequiredHeight = app.LAYOUT.convert0(p.els.popup.getBoundingClientRect().height);
                const availableHeight = Math.min(contentRequiredHeight, availableHeight0 - 80 - 40);
                const top = Math.min(120, (availableHeight0 - availableHeight) / 2);

                p.els.popup.style.opacity = 1;
                p.els.popup.style.top = top + 'px';
            });

            app.Popups.add(p);
        },

        _createHelp(section) {
            let el = app.Utils.createDIV({class: 'help'});
            el.style.zIndex = app.Popups.getNextZIndex();
            el.onclick = function() {
                app.SoundManager.playClick();
                app.Network.command({cmd: 'Help', section: section}, function (data) {
                    if (data.error) {
                    } else {
                        let p = app.Popups.createPopup({
                            onClose() {
                                p.tmp._closed = 1;
                            }
                        });

                        p.tmp = {};

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
                        let div = app.Utils.createDIV({style: 'width: 410px; margin: 10px;', html: content});
                        p.scroll.el.appendChild(div);

                        p.scroll.el.appendChild(app.Utils.createDIV({class: 'cntr', style: 'left: 25px; top: -25px;', text: 'Награды за рейтинг:'}));
                        let el = app.Utils.createDIV({class: 'mlra', style: 'width: 300px'});

                        let rjCFG = app.Model.cfg.cfgMiniGame.rating.rewards;
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
                                el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gold', style: 'margin-top: 0px'}));
                                el_c.appendChild(app.Utils.createText(app.Utils.toMoney(entry.gold.min)));
                            }
                            if (entry.gems) {
                                el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gem', style: 'margin-top: 0px'}));
                                el_c.appendChild(app.Utils.createText(entry.gems.min));
                            }
                            if (entry.card) {
                                const cfgCard = app.CFGUtil.getCardByID(entry.card.id);
                                const min = entry.card.count.min;
                                el_c.appendChild(app.Utils.createDIV({class: 'flr vm', html: '<span class="res_icon res_icon_inline res_card_q{1}"></span>{0}'.format(min, cfgCard.quality)}));
                            }
                            el_r.appendChild(el_c);
                            el.appendChild(el_r);
                        });
                        p.scroll.el.appendChild(el);

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
    }
}
