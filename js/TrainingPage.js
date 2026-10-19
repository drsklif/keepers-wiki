if (!app.TrainingPage) {
    app.TrainingPage = {
        create(opponentId) {
            this.info(opponentId);
        },

        info(opponentId) {
            const p = app.Popups.createPopup1({
                id: 'TRAINING',
                display: {gold: 1, gems: 1},
                onUpdate() {
                },
                onClose() {
                    p.tmp._closed = 1;
                }
            });

            p.tmp = {
                els: {}
            };

            p.els.brd_r.appendChild(p.tmp.els.header = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: -25px', text: '...'}));

            app.Network.command({cmd: 'TrainingOppInfo', user: opponentId}, data => {
                if (data.error) {
                    app.Utils.showInfo('Попробуйте позже');
                } else {
                    p.tmp.els.header.innerText = data.u.n;
                    p.scroll.el.appendChild(app.Utils.createDIV({class: 'battle_advice', style: 'top: 10px', text: 'Выберите колоду игрока для тренировки:'}));
                    app.TrainingPage.createDeckBlock(p, data.u, data.main);
                    if (data.arena) {
                        app.TrainingPage.createDeckBlock(p, data.u, data.arena).els.main.style.top = '220px';
                    }
                }
            });

            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
            const contentRequiredHeight = 450;

            let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
            let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';

            p.scroll.availableHeight = availableHeight;

            p.els.wrap.style.width = '480px';
            p.els.wrap_s.style.width = (p.scroll.availableHeight) + 'px';
            p.els.wrap.style.height = (p.scroll.availableHeight) + 'px';

            p.scroll.top = 0;
            p.scroll.el.style.top = p.scroll.top + 'px';

            p.scroll.update = () => {
                TweenMax.delayedCall(0.001, () => {
                    const contentRequiredHeight = 450;
                    const availableHeight = p.scroll.availableHeight;
                    p.scroll.topMax = availableHeight < contentRequiredHeight ? contentRequiredHeight - availableHeight : 0;
                });
            };
            p.scroll.update();

            app.Popups.add(p);
        },

        createDeckBlock(p, opponent, deck) {
            const cfg = {
                els: {}
            };

            cfg.els.main = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 25px; top: 45px; width: 415px; padding: 5px; height: 150px;'});

            const deckName = deck.t === 1 ? 'Колода защиты на Арене' : 'Боевая колода';
            cfg.els.main.appendChild(app.Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 0px; padding-top: 3px;', html: '<a class="major str tdn">{0}</a><div>Мощь: <span class="info">{1}</span></div>'.format(deckName, app.Utils.toMoney(deck.pwr))}));

            const el_div = app.Utils.createDIV();

            const list = deck.l;
            while (list.length < 8) {
                list.push({card: 1});
            }

            list.forEach((entry, i) => {
                const card = app.UserUtil.wrapCard1(opponent, entry.card, true);
                const cfg = app.Cards.createCard(card, {stones: 1});
                cfg.main.style = `top: 45px; left: ${2 + i * 53}px; transform: scale(0.37)`;
                el_div.appendChild(cfg.main);
            });
            cfg.els.main.appendChild(el_div);
            cfg.els.main.appendChild(cfg.els.a_battle = app.Utils.createA({class: 'btn_g mlra_ab', style: 'top: 120px', html: '<div class="training_icon" style="transform: scale(0.6); transform-origin: center center; position: relative; margin: -15px 0px -11px -18px; display: inline-block;"></div>{0}'.format(deck.p.v === 0 ? 'Тренировка' : ('за <span class="res_icon res_icon_inline res_gem"></span> ' + deck.p.v))}, () => {
                app.Utils.addClass(cfg.els.a_battle, 'bw');
                app.Network.command({cmd: 'TrainingBattle', type: deck.t, user: opponent.id}, data => {
                    TweenMax.delayedCall(1, () => app.Utils.removeClass(cfg.els.a_battle, 'bw'));
                    if (data.error) {
                        app.Utils.showInfo('Попробуйте позже');
                    } else {
                        app.EventDispatcher.emit('battle begin',{training: 1});
                    }
                });
            }));

            p.scroll.el.appendChild(cfg.els.main);

            return cfg;
        },
    }
}