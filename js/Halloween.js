app.Halloween = (function() {

    function create() {
        if (!app.Model.user.halloween) {
            app.Utils.showInfo('Событие не активно');
            return;
        }

        const event = app.Model.user.halloween;
        if (event.state.v === 2) {
            stateRun();
        } else if (event.state.v === 3) {
            stateEnd();
        }
    }

    function stateRun() {
        let p = app.Popups.createPopup1({
            id: 'HALLOWEEN',
            display: {gold: 1, gems: 1},

            onShow() {
                p.cfg.onUpdate();
            },

            onUpdate() {
                if (!app.Model.user.halloween) {
                    app.Popups.removePopup(p);
                    return;
                }

                if (app.Model.user.halloween) app.Model.user.halloween.found = [];

                if (p.tmp.halloween !== app.Model.user.halloween) {
                    if (app.Model.user.halloween.state.v === 3) {
                        create();
                        return;
                    }
                    p.tmp.halloween = app.Model.user.halloween;
                    if (p.tmp.t1) {
                        p.tmp.t1.list.forEach((cfg_old, i) => {
                            const cfg_actual = getPuzzleByID(cfg_old.puzzle.id);
                            if (cfg_old.puzzle !== cfg_actual) {
                                const cfg_new = createPuzzle(cfg_actual);
                                cfg_new.els.main.style.cssText = cfg_old.els.main.style.cssText;
                                cfg_new.els.main.onclick = () => {
                                    createPuzzleContent(cfg_actual);
                                };
                                cfg_old.els.main.parentNode.replaceChild(cfg_new.els.main, cfg_old.els.main);
                                p.tmp.t1.list[i] = cfg_new;
                            }
                        });
                    }
                }
            },

            onScroll(deltaY) {
                if (p.cfg.tabs.active === 2) return false;

                const scroll = p.scroll;

                if (scroll.topMax === 0) return;

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

                if (scroll._tl) scroll._tl.kill();
                scroll._tl = TweenMax.to(scroll.el, 0.1, {top: scroll.top});

                return true;
            },

            onReplace() {
                p.tmp._closed = 1;
            },
            onClose() {
                p.tmp._closed = 1;
            }
        });

        p.tmp = {};
        p.tmp.halloween = app.Model.user.halloween;

        let availableHeight0 = app.LAYOUT.getClientWHS0(80 + 40);
        let contentRequiredHeight = 628;

        let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
        let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

        p.els.brd.style.opacity = 1;
        p.els.brd.style.top = top + 'px';

        p.els.brd_r.style.height = availableHeight + 'px';

        p.els.wrap.style.top = '10px';
        p.els.wrap.style.width = '420px';
        p.els.wrap.style.height = (availableHeight - 10) + 'px';
        p.els.wrap.style.left = '30px';
        p.els.wrap_s.style.width = '420px';

        p.cfg.tabs = {active: 1};

        let tab = p.cfg.tabs.t1 = {els: {}};
        tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 30px', text: 'Маскарад'}, function() {
            app.SoundManager.playClick();
            onTabClick(p, 1);
        });
        p.els.brd_r.appendChild(tab.els.main);

        tab = p.cfg.tabs.t2 = {els: {}};
        tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 134px', text: 'Рейтинг'}, function() {
            app.SoundManager.playClick();
            onTabClick(p, 2);
        });
        p.els.brd_r.appendChild(tab.els.main);

        p.els.brd_r.appendChild(createHelp('Halloween'));

        app.Popups.add(p);

        onTabClick(p, 1);
    }

    function stateEnd() {
        let p = app.Popups.createPopup1({
            id: 'HALLOWEEN',
            header: {value: 'Маскарад Героев'},
            display: {gold: 1, gems: 1}
        });

        p.els.brd_r.appendChild(app.Utils.createDIV({class: 'big str mt10 major cntr', style: 'width: 480px', text: 'Событие завершилось'}));

        let me = app.Model.user.halloween.e;
        let place = me ? me.rating.place : 0;
        let points = me ? me.rating.points : 0;

        let el = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 25px; top: 40px; width: 415px; padding: 5px; height: 55px'}, app.EventDispatcher.dispatchEvent.bind(null, 'user info', app.Model.user.id));
        el.appendChild(app.Utils.createDIV({class: 'rating_top_p rating_top_m', html: '<span class="normal" style="font-size: 12px; white-space: nowrap;">Моё место</span><div>{0}</div>'.format(place)}));

        let avatar = app.Utils.createAvatarComponent(app.Model.user.rank, app.Model.user.avatar.img);
        avatar.els.main.style = 'transform: scale(0.7); left: 80px; top: 5px';
        el.appendChild(avatar.els.main);

        el.appendChild(app.Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 130px; padding-top: 5px', html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Собрано коллекций:</span><span class="flr mt5"> {1}</span>'.format(app.UserUtil.getUserNameUpper0(app.Model.user.name), points)}));
        p.els.brd_r.appendChild(el);

        p.els.brd_r.appendChild(app.Utils.createDIV({class: 'big str mt10 major cntr', style: 'width: 480px; position: relative; top: 80px', text: 'Лучшие коллекционеры:'}));

        app.Model.user.halloween.rating.list.forEach((entry, i) => {
            let el = app.Utils.createDIV({class: 'rating_row'}, app.EventDispatcher.dispatchEvent.bind(null, 'user info', entry.u.id));
            if (entry.place <= 3) {
                el.appendChild(app.Utils.createDIV({class: 'rating_top_p rating_top_p' + entry.place}));
            } else {
                el.appendChild(app.Utils.createDIV({class: 'rating_top_p', text: entry.place}));
            }

            let avatar = app.Utils.createAvatarComponent(entry.u.r, entry.u.a);
            avatar.els.main.style = 'transform: scale(0.5); left: 40px';
            el.appendChild(avatar.els.main);

            el.appendChild(app.Utils.createDIV({class: 'rating_row_r', html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">Собрано коллекций:</span><span class="flr mt5">{1}</span>'.format(app.UserUtil.getUserNameUpper0(entry.u.n), entry.points)}));
            p.scroll.el.appendChild(el);
        });

        let availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight() + 40);
        let contentRequiredHeight = 628;

        let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
        let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

        p.els.brd.style.opacity = 1;
        p.els.brd.style.top = top + 'px';

        p.els.brd_r.style.height = availableHeight + 'px';

        availableHeight -= 165;
        p.els.wrap.style.top = '165px';
        p.els.wrap.style.left = '30px';
        p.els.wrap.style.width = '420px';
        p.els.wrap.style.height = availableHeight + 'px';

        p.els.brd_r.appendChild(createHelp('Halloween'));

        app.Popups.add(p);

        TweenMax.delayedCall(0.001, function() {
            if (!p) return;

            p.scroll.availableHeight = availableHeight;
            p.scroll.contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
            p.scroll.top = 0;
            p.scroll.topMax = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.contentRequiredHeight - p.scroll.availableHeight: 0;
            p.scroll.el.style.top = p.scroll.top + 'px';
        });
    }

    function onTabClick(p, tab) {
        const tabs = p.cfg.tabs;

        tabs.active = tab;

        app.Utils.removeClass(tabs.t1.els.main, 'brd_block_tab_active');
        app.Utils.removeClass(tabs.t2.els.main, 'brd_block_tab_active');

        if (tab === 1) {
            app.Utils.addClass(tabs.t1.els.main, 'brd_block_tab_active');
            createTab1Content(p);
        } else {
            app.Utils.addClass(tabs.t2.els.main, 'brd_block_tab_active');
            createTab2Content(p);
        }
    }

    function clearContent(p) {
        if (p.tmp.t1) {
            p.tmp.t1.els.list.forEach(el => {
                el.parentNode.removeChild(el);
            });
            delete p.tmp.t1;
        }
        if (p.tmp.t2) {
            p.tmp.t2.els.list.forEach(el => {
                el.parentNode.removeChild(el);
            });
            delete p.tmp.t2;
        }
        app.Utils.removeAllChild(p.scroll.el);
    }

    function createTab1Content(p) {
        clearContent(p);

        p.tmp.t1 = {
            els: {
                list: []
            },
            list: []
        };

        const v = p.tmp.t1.v = Math.random();

        let el = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px;', text: 'Маскарад Героев'});
        p.els.brd_r.appendChild(el);
        p.tmp.t1.els.list.push(el);

        el = app.Utils.createDIV({class: 'list_s', style: 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 35px; margin-bottom: 10px; min-height: 75px; cursor: pointer'});
        let el1 = app.Utils.createDIV({class: 'cntr'});
        el1.appendChild(app.Utils.createDIV({html: 'Получай элементы коллекций <br>за активность в игре<br>и зарабатывай кристаллы!'}));
        el1.appendChild(p.tmp.t1.els.time = app.Utils.createDIV({class: 'major big str mt5'}));
        el.appendChild(el1);
        p.els.brd_r.appendChild(el);
        p.tmp.t1.els.list.push(el);

        const list = app.Model.user.halloween.puzzles.list;
        list.sort((p1, p2) => {
            const c1 = isPuzzleCollected(p1);
            const c2 = isPuzzleCollected(p2);
            if (c1) {
                return c2 ? 0 : -1;
            }
            if (c2) {
                return 1;
            }
            return 0;
        });

        let _current = 0;
        const _total = Math.ceil(list.length / 4);
        for (let i = 0; i < list.length; i += 4) {
            const el = app.Utils.createDIV({style: 'position: relative; height: 90px'});
            TweenMax.delayedCall(0.01 * i, () => {
                for (let i1 = i; i1 < i + 4 && i1 < list.length; i1++) {
                    const entry = list[i1];
                    const cfg = createPuzzle(entry);
                    cfg.els.main.style.top = '0px';
                    cfg.els.main.style.left = (40 + (i1 - i) * 90) + 'px';
                    cfg.els.main.onclick = () => {
                        createPuzzleContent(entry);
                    };
                    el.appendChild(cfg.els.main);
                    p.tmp.t1.list.push(cfg);
                }
                _current++;
                if (_current === _total) {
                    initScroll();
                }
            });
            p.scroll.el.appendChild(el);
        }

        p.tmp.t1.update = function() {
            if (p.tmp._closed
                || !p.tmp.t1 || p.tmp.t1.v !== v) return;
            const tl = p.tmp.halloween.et - app.TimeUtil.now();
            p.tmp.t1.els.time.innerText = 'До конца тыквовина: {0}'.format(app.TimeUtil.formatToHumanTime(tl, 2));
            TweenMax.delayedCall(1, p.tmp.t1.update);
        };
        p.tmp.t1.update();

        let availableHeight0 = app.LAYOUT.getClientWHS0(80 + 40);
        let availableHeight = Math.min(628, availableHeight0);

        p.els.wrap.style.top = '140px';
        p.els.wrap.style.height = (availableHeight - 140) + 'px';

        p.scroll.availableHeight = availableHeight - 140;

        p.scroll.top = 10;
        p.scroll.topMax = 10;
        p.scroll.el.style.top = p.scroll.top + 'px';

        const initScroll = () => {
            TweenMax.delayedCall(0.001, () => {
                if (p.tmp._closed
                    || !p.tmp.t1 || p.tmp.t1.v !== v) return;
                const contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                p.scroll.topMin = -(p.scroll.availableHeight < contentRequiredHeight ? contentRequiredHeight - p.scroll.availableHeight: 0);
            });
        }
    }

    function createTab2Content(p) {
        clearContent(p);

        p.tmp.t2 = {
            els: {
                list: []
            }
        };

        const create = (rating) => {
            let me = rating.me;
            if (!me) {
                me = {u: {id: app.Model.user.id, n: app.Model.user.name, a: app.Model.user.avatar.img, r: app.Model.user.rank}, p: '?', v: 0};
            }

            if (me) {
                const div = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 25px; top: 20px; width: 415px; padding: 5px; height: 55px'}, app.EventDispatcher.dispatchEvent.bind(null, 'user info', me.u.id));
                let div1 = app.Utils.createDIV({class: 'rating_top_p rating_top_m'});
                div1.appendChild(app.Utils.createSPAN({class: 'normal', style: 'font-size: 12px; white-space: nowrap', text: 'Моё место'}));
                div1.appendChild(app.Utils.createDIV({text: me.p || '?'}));
                div.appendChild(div1);

                const avatar = app.Utils.createAvatarComponent(me.u.r, me.u.a);
                avatar.els.main.style = 'transform: scale(0.7); left: 80px; top: 5px';
                div.appendChild(avatar.els.main);

                div1 = app.Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 130px; padding-top: 5px'});
                div1.appendChild(app.Utils.createA({class: 'major str tdn', text: app.UserUtil.getUserNameUpper0(me.u.n)}));
                div1.appendChild(app.Utils.createDIV({class: 'clr'}));

                div1.appendChild(app.Utils.createSPAN({class: 'mt10 dbl fll', text: 'Собрано коллекций:'}));
                div1.appendChild(app.Utils.createSPAN({class: 'flr mt10', html: app.Utils.toMoney(me.v)}));

                div.appendChild(div1);
                p.els.brd_r.appendChild(div);
                p.tmp.t2.els.list.push(div);
            }

            if (!rating.list || rating.list.length === 0) {
                p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr_text', style: 'width: 420px; position: relative; top: 120px', html: '<span>Рейтинг пуст</span>'}));
            } else {
                let createListEntry = (entry) => {
                    let els = {};
                    els.main = app.Utils.createDIV({class: 'rating_row'}, app.EventDispatcher.dispatchEvent.bind(null, 'user info', entry.u.id));

                    if (entry.p <= 3) {
                        els.main.appendChild(app.Utils.createDIV({class: 'rating_top_p rating_top_p' + entry.p}));
                    } else {
                        els.main.appendChild(app.Utils.createDIV({class: 'rating_top_p', text: entry.p}));
                    }

                    let avatar = app.Utils.createAvatarComponent(entry.u.r, entry.u.a);
                    avatar.els.main.style = 'transform: scale(0.5); left: 40px';
                    els.main.appendChild(avatar.els.main);

                    let div1 = app.Utils.createDIV({class: 'rating_row_r'});
                    div1.appendChild(app.Utils.createA({class: 'major str tdn', text: app.UserUtil.getUserNameUpper0(entry.u.n)}));
                    div1.appendChild(app.Utils.createDIV({class: 'clr'}));

                    div1.appendChild(app.Utils.createSPAN({class: 'mt5 dbl fll', text: 'Собрано коллекций:'}));
                    div1.appendChild(app.Utils.createSPAN({class: 'flr mt5', html: app.Utils.toMoney(entry.v)}));
                    els.main.appendChild(div1);

                    p.scroll.el.appendChild(els.main);
                    p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb5'}));
                };
                rating.list.forEach(entry => createListEntry(entry));
            }

            let availableHeight0 = app.LAYOUT.getClientWHS0(80 + 40);
            let availableHeight = Math.min(628, availableHeight0);

            let h = me ? 105 : 25;
            p.els.wrap.style.top = h + 'px';
            p.els.wrap.style.height = (availableHeight - h) + 'px';
            p.scroll.availableHeight = availableHeight - h;

            TweenMax.delayedCall(0.001, () => {
                if (p.tmp._closed) return;
                let contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                p.scroll.top = 0;
                p.scroll.topMin = 0;
                p.scroll.topMax = p.scroll.availableHeight < contentRequiredHeight ? contentRequiredHeight - p.scroll.availableHeight : 0;
                p.scroll.el.style.top = p.scroll.top + 'px';
            });
        };

        const load = () => {
            app.Network.command({cmd: 'Ratings', type: 11}, data => {
                if (data.error) {
                } else {
                    if (p.tmp.t2 !== undefined) {
                        create(data.rating);
                    }
                }
            });
        };

        load();
    }

    function createPuzzle(puzzle) {
        const cfg = {
            els: {}
        };

        cfg.puzzle = puzzle;

        let type;
        if (puzzle.id.startsWith('card_')) {
            type = 1;
        } else if (puzzle.id.startsWith('raid_')) {
            type = 2;
        }

        const id_parts = puzzle.id.split('_');

        let cfgCard;
        let cfgBoss;

        if (type === 1) {
            cfgCard = app.CFGUtil.getCardByID(Number(id_parts[1]));
        } else if (type === 2) {
            cfgBoss = app.CFGUtil.getRaidBossCFG(Number(id_parts[1]), Number(id_parts[2]));
        }

        cfg.els.main = app.Utils.createA({class: 'pers_info_l'});
        if (type === 1) {
            cfg.els.main.appendChild(app.Utils.createDIV({class: 'ava_hidden ava_id' + cfgCard.id, html: '<img src="{0}" style="width: 60px;">'.format(app.IMAGES.getPath(cfgCard.img))}));
        } else {
            cfg.els.main.appendChild(app.Utils.createIMG(cfgBoss.avatar, {w: 60}));
        }
        cfg.els.main.appendChild(app.Utils.createDIV({class: 'pers_info_l_brd brd_collection'}));

        const found = countPuzzlePieces(puzzle);
        const required = puzzle.list.length;

        if (found < required) {
            app.Utils.addClass(cfg.els.main, 'bw');
            cfg.els.main.appendChild(app.Utils.createDIV({class: 'emblem_price', style: 'text-align: left; padding-left: 28px; width: 54px', text: '{0} из {1}'.format(found, required)}));
        } else {
            cfg.els.main.appendChild(app.Utils.createDIV({class: 'menu_note menu_note_g', style: 'transform: scale(1); top: -5px; right: -5px'}));
        }

        return cfg;
    }

    function createPuzzleContent(puzzle) {
        let p = app.Popups.createPopup1({
            id: 'HALLOWEEN_1',
            header: {value: getPuzzleName(puzzle)},
            display: {gold: 1, gems: 1}
        });

        p.tmp = {};

        let el = p.scroll.el.appendChild(app.Utils.createDIV({class: 'mlra_ab', style: 'width: 300px; height: 429px; position: relative; background-image: url({0})'.format(app.IMAGES.getPath(puzzle.bg))}));
        puzzle.list.forEach(function(entry, i) {
            let style = 'float: left';

            switch (i) {
                case 0: break;
                case 1: style += '; margin-left: -33px'; break;
                case 2: style += '; margin-left: -36px'; break;
                case 3: style += '; margin-top: -78px'; break;
                case 4: style += '; margin-left: -24px; margin-top: -95px'; break;
                case 5: style += '; margin-left: -24px; margin-top: -53px'; break;
                case 6: style += '; margin-top: -50px'; break;
                case 7: style += '; margin-left: -25px; margin-top: -89px'; break;
                case 8: style += '; margin-left: -27px; margin-top: -50px'; break;
            }

            let has = hasPuzzlePiece(puzzle.id + ':' + entry.id);
            let img;
            if (has) {
                img = entry.img;
            } else {
                img = '/images/puzzle/0{0}.png'.format(i + 1);
            }
            el.appendChild(app.Utils.createIMG(img, {style: style}));
            if (i > 0 && i / 3 === 0) {
                el.appendChild(app.Utils.createDIV({class: 'clr'}));
            }
        });
        el.appendChild(app.Utils.createDIV({style: 'width: 300px; height: 429px; position: absolute; left: 0px; top: 0px; background-image: url({0})'.format(app.IMAGES.getPath('/images/puzzle/border.png'))}));
        p.scroll.el.appendChild(el);

        const found = countPuzzlePieces(puzzle);
        const required = puzzle.list.length;

        p.scroll.el.appendChild(app.Utils.createDIV({class: 'big str cntr mtb5', text: '{0} из {1}'.format(found, required)}));

        let a;
        let a_text = 'Получить <span class="res_icon res_icon_inline res_gem"></span> ';
        if (app.UserUtil.isPremiumActive()) {
            a_text += '<span class="r_green">15</span>';
        } else {
            a_text += '10';
        }
        p.scroll.el.appendChild(a = app.Utils.createA({class: 'btn_g mlra_ab', style: 'top: 495px', html: a_text}, function() {
            if (found < required) {
                app.Utils.showInfo('Нужно собрать все пазлы коллекции');
                return;
            }
            if (app.Utils.hasClass(a, 'bw')) return;
            app.Utils.addClass(a, 'bw');

            app.Network.command({cmd: 'GameEventPuzzleComplete', puzzle: puzzle.id}, function(data) {
                if (data.error) {
                    app.Utils.processErrors(data.error);
                } else {
                    animateRewardGems(a.getBoundingClientRect(), app.UserUtil.isPremiumActive() ? 15 : 10);
                    createPuzzleContent(getPuzzleByID(puzzle.id));
                }
            })
        }));
        if (found < required) {
            app.Utils.addClass(a, 'bw');
        }

        let availableHeight0 = app.LAYOUT.getClientWHS0(80 + 40);
        let contentRequiredHeight = 628;

        let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
        let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

        p.els.brd.style.opacity = 1;
        p.els.brd.style.top = top + 'px';

        p.els.brd_r.style.height = availableHeight + 'px';

        availableHeight -= 20;
        p.els.wrap.style.top = '20px';
        p.els.wrap.style.height = availableHeight + 'px';

        TweenMax.delayedCall(0.001, function() {
            if (!p) return;
            p.scroll.availableHeight = availableHeight;
            p.scroll.contentRequiredHeight = 495 + 40;
            p.scroll.top = 0;
            p.scroll.topMax = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.contentRequiredHeight - p.scroll.availableHeight: 0;
            p.scroll.el.style.top = p.scroll.top + 'px';
        });

        app.Popups.add(p);
    }

    function countPuzzlePieces(puzzle) {
        let c = 0;
        puzzle.list.forEach(entry => {
            if (hasPuzzlePiece(puzzle.id + ':' + entry.id)) c++;
        });
        return c;
    }

    function isPuzzleCollected(puzzle) {
        const found = countPuzzlePieces(puzzle);
        const required = puzzle.list.length;
        return found >= required;
    }

    function hasPuzzlePiece(key) {
        const me = app.Model.user.halloween.e;
        return me && me.pieces[key];
    }

    function getPuzzleName(puzzle) {
        const id_parts = puzzle.id.split('_');
        if (puzzle.id.startsWith('card_')) {
            const cfgCard = app.CFGUtil.getCardByID(Number(id_parts[1]));
            return cfgCard.name;
        } else if (puzzle.id.startsWith('raid_')) {
            const cfgBoss = app.CFGUtil.getRaidBossCFG(Number(id_parts[1]), Number(id_parts[2]));
            return cfgBoss.name;
        }
    }

    function getPuzzleByID(id) {
        const list = app.Model.user.halloween.puzzles.list;
        return list.find(entry => entry.id === id);
    }

    function animateRewardGems(parent, value) {
        let el = app.Utils.animationCreateReward('gems', parent, {left: 93, top: 6});
        app.Utils.animationAnimateReward(null, 'gems', el, 0, 0);

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
        }}, '+=0.7');
    }

    function createHelp(section) {
        let el = app.Utils.createDIV({class: 'help'});
        el.style.zIndex = app.Popups.getNextZIndex();
        el.onclick = function() {
            app.SoundManager.playClick();
            app.Network.command({cmd: 'Help', section: section}, function (data) {
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

                    let createRewards = function() {
                        let el = app.Utils.createDIV({class: 'mlra', style: 'width: 300px'});
                        let rjCFG = app.Model.cfg.cfgHalloween.rewards;
                        let myEntry = app.Model.user.halloween.e;
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
                            if (myEntry && myEntry.rating.place > 0 && myEntry.rating.place <= entry.p) {
                                el_record.className = 'str fll pt3 r_green';
                                myEntry = undefined;
                            }
                            let el_c = app.Utils.createDIV({class: 'flr'});
                            if (entry.dust) {
                                el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_dust'}));
                                el_c.appendChild(app.Utils.createText(app.Utils.toMoney(entry.dust.min)));
                            }
                            if (entry.sd) {
                                el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_dust_stone'}));
                                el_c.appendChild(app.Utils.createText(app.Utils.toMoney(entry.sd.min)));
                            }
                            if (entry.gold) {
                                el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gold'}));
                                el_c.appendChild(app.Utils.createText(app.Utils.toMoney(entry.gold.min)));
                            }
                            if (entry.gems) {
                                el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gem'}));
                                el_c.appendChild(app.Utils.createText(app.Utils.toMoney(entry.gems.min)));
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

                    let el1 = createRewards();
                    p.scroll.el.appendChild(app.Utils.createDIV({style: 'width: 410px; margin: 10px;', html: content.format(el1.innerHTML)}));

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

    return {
        create: create,
        showFound: function(list, onComplete) {
            let el = app.Utils.createDIV({class: 'info_msg info_msg_shadow', style: 'z-index: 10001; top: 120px; padding: 0px; opacity: 0'});
            el.appendChild(app.Utils.createText('Получены элементы коллекций '));
            el.appendChild(app.Utils.createSPAN({class: 'r_green', text: 'x{0}'.format(list.length)}));
            el.appendChild(app.Utils.createBR());
            list.forEach(entry => {
                el.appendChild(app.Utils.createIMG(entry.img, {class: 'mt10', h: 60}));
            });
            app.Utils.el('dark_popup').appendChild(el);
            let tl = new TimelineMax({onComplete: () => {
                el.parentNode.removeChild(el);
                if (onComplete) onComplete();
            }});
            tl.set(el, {scale: 0.7});
            tl.to(el, 0.3, {scale: 1, opacity: 1, ease: Back.easeOut});
            tl.call(() => {
                el.style.pointerEvents = "auto";
                el.onclick = () => {
                    if (app.Model.user.halloween && app.Model.user.halloween.found && app.Model.user.halloween.found.length > 0) {
                        app.Model.user.halloween.found = [];
                    }
                    tl.progress(1);
                };
            });
            tl.to(el, 0.3, {scale: 0.7, opacity: 0, ease: Back.easeIn}, '+=2');
        },
        hasAnyCollectedPuzzle: function() {
            let me = app.Model.user.halloween.e;
            if (me) {
                let list = app.Model.user.halloween.puzzles.list, puzzle;
                for (let i = 0; i < list.length; i++) {
                    puzzle = list[i];
                    if (countPuzzlePieces(puzzle) === puzzle.list.length) return true;
                }
            }
        }
    };
})();