let STATE = {
    NONE: 0,
    CREATED: 1,
    ANIMATION: 2,
    OPENED: 3,
    CLOSED: 4,
};

let Notifications = {

    // 0 - нет
    // 1 - создан
    // 2 - анимация
    // 3 - открыта
    // 4 - закрыта
    state: {v: STATE.NONE},

    cfg: {
        els: {}
    },

    tmp: {
        w: 0,
        h: 0,
        needToUpdateSizes: 0,
        pvpt: {},
        labyrinth: {},
        reset() {
            this.w = h = 0;
            this.needToUpdateSizes = 0;
            this.pvpt = {};
            this.labyrinth = {};
        }
    },

    create() {
        if (this.state.v !== STATE.NONE) return;

        this.state.v = STATE.CREATED;

        this.cfg.els.main = app.Utils.createDIV({class: 'tment_plate_pos'});
        this.cfg.els.bg = app.Utils.createDIV({class: 'tment_plate_bg'});
        this.cfg.els.l = app.Utils.createDIV({class: 'tment_plate_l_bg'});
        this.cfg.els.r = app.Utils.createDIV({class: 'tment_plate_r_bg'});
        this.cfg.els.t = app.Utils.createDIV({class: 'tment_plate_t_bg'});
        this.cfg.els.b = app.Utils.createDIV({class: 'tment_plate_b_bg'});
        this.cfg.els.p = app.Utils.createDIV({class: 'tment_plate_p'});

        this.cfg.els.p.appendChild(app.Utils.createDIV({class: 'tment_plate_lt'}));
        this.cfg.els.p.appendChild(app.Utils.createDIV({class: 'tment_plate_rt'}));
        this.cfg.els.p.appendChild(app.Utils.createDIV({class: 'tment_plate_lb'}));
        this.cfg.els.p.appendChild(app.Utils.createDIV({class: 'tment_plate_rb'}));

        this.cfg.els.data = app.Utils.createDIV({class: 'cntr', style: 'width: 0; height: 0; padding: 5px; opacity: 0'});
        this.cfg.els.p.appendChild(this.cfg.els.data);

        this.cfg.els.arrow = app.Utils.createDIV({class: 'tment_plate_arr', style: 'transform: scaleX(-1) translateY(-50%)'}, () => this.onArrowClick());
        this.cfg.els.p.appendChild(this.cfg.els.arrow);

        this.cfg.els.b.appendChild(this.cfg.els.p);
        this.cfg.els.t.appendChild(this.cfg.els.b);
        this.cfg.els.r.appendChild(this.cfg.els.t);
        this.cfg.els.l.appendChild(this.cfg.els.r);
        this.cfg.els.bg.appendChild(this.cfg.els.l);
        this.cfg.els.main.appendChild(this.cfg.els.bg);

        app.Utils.el('dark_popup').appendChild(this.cfg.els.main);

        this.state.v = STATE.CLOSED;
    },

    remove() {
        if (this.state === STATE.NONE) return;

        TweenMax.killTweensOf(this.cfg.els.data);
        TweenMax.killTweensOf(this.cfg.els.arrow);

        app.Utils.el('dark_popup').removeChild(this.cfg.els.main);

        this.state.v = STATE.NONE;

        this.cfg = {els: {}};
        this.tmp.reset();
    },

    updateSizes(animation, onComplete, force) {
        let el0;
        if (this.cfg.pvpt) {
            el0 = app.Utils.createDIV({style: 'position: absolute; pointer-events: none; opacity: 0', html: this.cfg.pvpt.els.main.innerHTML});
            app.Utils.el('dark_popup').appendChild(el0);
        }

        let el1;
        if (this.cfg.labyrinth) {
            el1 = app.Utils.createDIV({style: 'position: absolute; pointer-events: none; opacity: 0', html: this.cfg.labyrinth.els.main.innerHTML});
            app.Utils.el('dark_popup').appendChild(el1);
        }

        let el2;
        if (this.cfg.champt) {
            el2 = app.Utils.createDIV({style: 'position: absolute; pointer-events: none; opacity: 0', html: this.cfg.champt.els.main.innerHTML});
            app.Utils.el('dark_popup').appendChild(el2);
        }

        TweenMax.delayedCall(0.001, () => {
            if (this.state.v === STATE.NONE) {
                if (el0) app.Utils.el('dark_popup').removeChild(el0);
                if (el1) app.Utils.el('dark_popup').removeChild(el1);
                if (el2) app.Utils.el('dark_popup').removeChild(el2);
                console.log('updateSizes remove');
                this.remove();
                return;
            }

            let w = 0, h = 0;

            if (el0) {
                let rect = el0.getBoundingClientRect();
                w = app.LAYOUT.convert0(rect.width);
                h = app.LAYOUT.convert0(rect.height);
                app.Utils.el('dark_popup').removeChild(el0);
            }

            if (el1) {
                let rect = el1.getBoundingClientRect();
                w = Math.max(w, app.LAYOUT.convert0(rect.width));
                h += app.LAYOUT.convert0(rect.height);
                app.Utils.el('dark_popup').removeChild(el1);
            }

            if (el2) {
                let rect = el2.getBoundingClientRect();
                w = Math.max(w, app.LAYOUT.convert0(rect.width));
                h += app.LAYOUT.convert0(rect.height);
                app.Utils.el('dark_popup').removeChild(el2);
            }

            let count = el0 ? 1 : 0;
            count += el1 ? 1 : 0;
            count += el2 ? 1 : 0;
            if (count > 1) h += 10;
            if (count > 2) h += 10;

            if (w > 0) w += 20;

            if (force || this.tmp.w !== w || this.tmp.h !== h) {
                this.tmp.w = w;
                this.tmp.h = h;
                animation({w, h, onComplete});
            } else {
                onComplete();
            }
        });
    },

    canShowPVPT() {
        const pvpt = app.Model.user.pvpt;
        if (pvpt) return pvpt.state.v === 1 || pvpt.e;

        const next = app.Model.user.pvpt_next;
        return next && next.nst > app.TimeUtil.now();
    },

    createPVPT() {
        let cfg = {
            els: {},
            remove() {
                if (app.Notifications.cfg.pvpt) {
                    if (app.Notifications.cfg.pvpt.els.main.parentNode) {
                        app.Notifications.cfg.pvpt.els.main.parentNode.removeChild(app.Notifications.cfg.pvpt.els.main);
                    }
                    delete app.Notifications.cfg.pvpt;
                }
                if (app.Notifications.cfg.labyrinth) {
                    app.Notifications.tmp.needToUpdateSizes = 1;
                } else {
                    app.Notifications.remove();
                }
            },
            update() {
                let pvpt = app.Model.user.pvpt;

                if (!pvpt) {
                    let next = app.Model.user.pvpt_next;
                    if (next) {
                        let text = 'Турнир Френы<br/>';
                        let tl = next.nst - app.TimeUtil.now();
                        if (tl > 1000) {
                            text += 'Через<br>{0}'.format(tl <= 0 ? 'сейчас' : app.TimeUtil.formatToHumanTime(tl, 2));
                        } else {
                            text += 'Ожидаем';
                        }
                        this.els.main.innerHTML = text;
                    } else {
                        this.remove();
                    }
                } else {

                    if (pvpt.state.v !== 1 && !pvpt.e) {
                        this.remove();
                        return;
                    }

                    let text = 'Турнир Френы<br/>';

                    switch (pvpt.state.v) {
                        case 1: {
                            if (pvpt.nst) {
                                let tl = pvpt.nst - app.TimeUtil.now();
                                text += 'Через<br>{0}'.format(tl <= 0 ? 'сейчас' : app.TimeUtil.formatToHumanTime(tl, 2));
                            } else {
                                let tl = pvpt.st - app.TimeUtil.now();
                                if (pvpt.e) {
                                    text += 'Начало<br>{0}'.format(tl <= 0 ? 'сейчас' : app.TimeUtil.formatToHumanTime(tl, 2));
                                } else {
                                    tl -= 3000; // ping
                                    if (tl <= 0) {
                                        text += 'Запись<br><span class="red">закончилась</span>';
                                    } else {
                                        text += '<span class="r_green">Запись<br>{0}</span>'.format(app.TimeUtil.formatToHumanTime(tl, 2));
                                    }
                                }
                            }
                            break;
                        }
                        case 2: {
                            text += 'Формируем<br>группы';
                            break;
                        }
                        case 3: {
                            let tl = pvpt.cfg.phase_duration - (app.TimeUtil.now() - pvpt.state.t);
                            text += 'Фаза {0} из {1}<br>{2}'.format(pvpt.state.phase, 5, tl <= 0 ? 'сейчас' : app.TimeUtil.formatToHumanTime(tl, 2));

                            if (!app.Notifications.tmp.pvpt.s) {
                                app.Notifications.tmp.pvpt.s = pvpt.state.v;
                                if (pvpt.e) {
                                    app.Utils.showInfo('Началась фаза {0} в турнире!'.format(pvpt.state.phase), {type: 0});
                                    if (app.Notifications.state === STATE.CLOSED) {
                                        app.Notifications.onArrowClick();
                                    }
                                }
                            }
                            break;
                        }
                        case 4: {
                            text += 'Турнир Френы<br>Считаем';
                            break;
                        }
                        case 5: {
                            text += 'Результаты';
                            if (!app.Notifications.tmp.pvpt.s) {
                                app.Notifications.tmp.pvpt.s = pvpt.state.v;
                                if (pvpt.e) {
                                    app.Utils.showInfo('Турнир Френы завершился. Посмотри результаты!', {type: 0});
                                    if (app.Notifications.state === STATE.CLOSED) {
                                        app.Notifications.onArrowClick();
                                    }
                                }
                            }
                            break;
                        }
                    }

                    if (text !== this.els.main.innerHTML) {
                        this.els.main.innerHTML = text;
                    }
                }
            }
        };
        cfg.els.main = app.Utils.createDIV({}, () => {
            app.loadJS1('PVPT', () => {
                app.PVPT.create();
            });
        });
        cfg.update();
        return cfg;
    },

    canShowLabyrinth() {
        const lab = app.Model.user.labyrinth;
        if (lab) {
            if (lab.state.v === 1 || lab.state.v === 2 || lab.e) return true;
            if (lab.state.v === 0 && lab.state.t > 0) {
                return lab.state.t > app.TimeUtil.now();
            }
        }
        return false;
    },

    createLabyrinth() {
        let cfg = {
            els: {},
            remove() {
                if (app.Notifications.cfg.labyrinth) {
                    if (app.Notifications.cfg.labyrinth.els.main.parentNode) {
                        app.Notifications.cfg.labyrinth.els.main.parentNode.removeChild(app.Notifications.cfg.labyrinth.els.main);
                    }
                    delete app.Notifications.cfg.labyrinth;
                }
                if (app.Notifications.cfg.pvpt) {
                    app.Notifications.tmp.needToUpdateSizes = 1;
                } else {
                    app.Notifications.remove();
                }
            },
            update() {
                let lab = app.Model.user.labyrinth;
                if (!lab || lab.type === 'remove') {
                    this.remove();
                    return;
                }

                if (lab.state.v === 0 && lab.state.t > 0) {
                    let next = lab.state.t;
                    let text = 'Лабиринт<br/>';
                    let tl = next - app.TimeUtil.now();
                    if (tl > 1000) {
                        text += 'Через<br>{0}'.format(tl <= 0 ? 'сейчас' : app.TimeUtil.formatToHumanTime(tl, 2));
                    } else {
                        text += 'Ожидаем';
                    }
                    this.els.main.innerHTML = text;
                    return;
                } else if (lab.state.v === 1 || lab.state.v === 2 || lab.e) {
                } else {
                    this.remove();
                    return;
                }

                let text = 'Лабиринт<br/>';

                switch (lab.state.v) {
                    case 1: {
                        let tl = lab.state.t - app.TimeUtil.now();
                        if (tl <= 0) {
                            text += 'Ожидаем<br/>запись';
                        } else {
                            text += 'Через<br>{0}'.format(app.TimeUtil.formatToHumanTime(tl, 2));
                        }
                        break;
                    }
                    case 2: {
                        let tl = lab.state.t - app.TimeUtil.now();
                        if (lab.e) {
                            if (tl <= 0) {
                                text += 'Ожидаем<br/>начала';
                            } else {
                                text += '<span class="r_green">Запись<br>{0}</span>'.format(app.TimeUtil.formatToHumanTime(tl, 2));
                            }
                        } else {
                            tl -= 3000; // ping
                            if (tl <= 0) {
                                text += 'Запись<br><span class="red">закончилась</span>';
                            } else {
                                text += '<span class="r_green">Запись<br>{0}</span>'.format(app.TimeUtil.formatToHumanTime(tl, 2));
                            }
                        }
                        break;
                    }
                    case 3: {
                        let tl = lab.state.t - app.TimeUtil.now();
                        if (tl <= 0) {
                            text += 'Ожидаем<br/>завершения';
                        } else {
                            text += 'Завершится<br>{0}'.format(app.TimeUtil.formatToHumanTime(tl, 2));
                        }
                        break;
                    }
                    case 4: {
                        text += 'Результаты';
                        break;
                    }
                }

                this.els.main.innerHTML = text;
            }
        };
        let clicked = 0;
        cfg.els.main = app.Utils.createDIV({}, () => {
            if (clicked) return;
            clicked = 1;
            app.loadJS1('Labyrinth', () => {
                clicked = 0;
                app.Labyrinth.create();
            });
        });
        cfg.update();
        return cfg;
    },

    canShowChampT() {
        const champt = app.Model.user.champt;
        return champt && (champt.state.v === 0 || champt.state.v === 1 || champt.state.v === 2 || champt.e);
    },

    createChampT() {
        let cfg = {
            els: {},
            remove() {
                if (app.Notifications.cfg.champt) {
                    if (app.Notifications.cfg.champt.els.main.parentNode) {
                        app.Notifications.cfg.champt.els.main.parentNode.removeChild(app.Notifications.cfg.champt.els.main);
                    }
                    delete app.Notifications.cfg.champt;
                }
                if (app.Notifications.cfg.pvpt || app.Notifications.cfg.labyrinth) {
                    app.Notifications.tmp.needToUpdateSizes = 1;
                } else {
                    app.Notifications.remove();
                }
            },
            update() {
                let champt = app.Model.user.champt;

                if (!champt || champt.type === 'remove') {
                    this.remove();
                    return;
                }

                if (champt.state.v === 0 || champt.state.v === 1 || champt.state.v === 2 || champt.e) {
                } else {
                    this.remove();
                    return;
                }

                let text = 'Турнир Чемпионов<br/>';

                switch (champt.state.v) {
                    case 0: {
                        let tl = champt.st - app.TimeUtil.now();
                        tl -= 1000; // ping
                        if (tl <= 0) {
                            text += 'Ожидаем<br/>запись';
                        } else {
                            text += 'Через<br>{0}'.format(app.TimeUtil.formatToHumanTime(tl, 2));
                        }
                        break;
                    }
                    case 1: {
                        let tl = champt.state.t - app.TimeUtil.now();
                        tl -= 3000; // ping
                        if (tl <= 0) {
                            text += 'Формируем<br/>группы';
                        } else {
                            text += '<span class="r_green">Запись<br>{0}</span>'.format(app.TimeUtil.formatToHumanTime(tl, 2));
                        }
                        break;
                    }
                    case 2: {
                        text += 'Формируем<br/>группы';
                        break;
                    }
                    case 3: {
                        let tl = champt.state.t - app.TimeUtil.now();
                        if (tl <= 0) {
                            text += 'Ожидаем<br/>завершения';
                        } else {
                            text += 'Завершится<br>{0}'.format(app.TimeUtil.formatToHumanTime(tl, 2));
                        }
                        break;
                    }
                    case 4:
                    case 5: {
                        text += 'Результаты';
                        break;
                    }
                }

                this.els.main.innerHTML = text;
            }
        };

        let clicked = 0;
        cfg.els.main = app.Utils.createDIV({}, () => {
            if (clicked) return;
            clicked = 1;
            app.loadJS1('ChampT', () => {
                clicked = 0;
                app.ChampT.create();
            });
        });
        cfg.update();

        return cfg;
    },

    onArrowClick() {
        if (this.state.v === STATE.ANIMATION) {
            return;
        }

        if (!this.canShowPVPT() && !this.canShowLabyrinth() && !this.canShowChampT()) {
            this.remove();
            return;
        }

        if (this.state.v === STATE.OPENED) {
            this.state.v = STATE.ANIMATION;

            this.tmp.w = 0;
            this.tmp.h = 0;

            TweenMax.killTweensOf(this.cfg.els.data);
            TweenMax.killTweensOf(this.cfg.els.arrow);

            let tl = new TimelineMax({
                onComplete: () => {
                    if (this.state.v === STATE.NONE) return;
                    this.state.v = STATE.CLOSED;
                    app.Utils.removeAllChild(this.cfg.els.data);
                    delete this.cfg.pvpt;
                    delete this.cfg.labyrinth;
                    delete this.cfg.champt;
                }
            });
            tl.to(this.cfg.els.data, 0.3, {opacity: 0});
            tl.to(this.cfg.els.data, 0.3, {width: 0, height: 0, padding: 0});
            TweenMax.to(this.cfg.els.arrow, 0.3, {delay: 0.2, scaleX: 1});

        } else {
            this.state.v = STATE.ANIMATION;

            if (this.canShowPVPT()) {
                this.cfg.pvpt = this.createPVPT();
            }

            if (this.canShowLabyrinth()) {
                this.cfg.labyrinth = this.createLabyrinth();
            }

            if (this.canShowChampT()) {
                this.cfg.champt = this.createChampT();
            }

            if (this.cfg.pvpt) {
                this.cfg.els.data.appendChild(this.cfg.pvpt.els.main);
                if (this.cfg.labyrinth) {
                    this.cfg.els.data.appendChild(app.Utils.createDIV({class: 'hr mtb5', style: 'background-size: 100px 1px'}));
                    this.cfg.els.data.appendChild(this.cfg.labyrinth.els.main);
                }
                if (this.cfg.champt) {
                    this.cfg.els.data.appendChild(app.Utils.createDIV({class: 'hr mtb5', style: 'background-size: 100px 1px'}));
                    this.cfg.els.data.appendChild(this.cfg.champt.els.main);
                }
            } else if (this.cfg.labyrinth) {
                this.cfg.els.data.appendChild(this.cfg.labyrinth.els.main);
                if (this.cfg.champt) {
                    this.cfg.els.data.appendChild(app.Utils.createDIV({class: 'hr mtb5', style: 'background-size: 100px 1px'}));
                    this.cfg.els.data.appendChild(this.cfg.champt.els.main);
                }
            } else if (this.cfg.champt) {
                this.cfg.els.data.appendChild(this.cfg.champt.els.main);
            }

            app.Notifications.updateSizes(({w, h, onComplete}) => {
                TweenMax.killTweensOf(this.cfg.els.data);
                TweenMax.killTweensOf(this.cfg.els.arrow);
                const tl = new TimelineMax({onComplete});
                tl.to(this.cfg.els.data, 0.3, {width: w, height: h, padding: 5});
                tl.to(this.cfg.els.data, 0.3, {opacity: 1});
                TweenMax.to(this.cfg.els.arrow, 0.3, {delay: 0.2, scaleX: -1});
            }, () => {
                if (this.state.v === STATE.NONE) return;
                this.state.v = STATE.OPENED;
            }, true);
        }
    },

    onArrowClickIfNotInBattle() {
        const p = app.Popups.getLast();
        if (p && p.cfg && p.cfg.id === 'BATTLE') return;
        this.onArrowClick();
    },

    update() {
        if (this.state.v === STATE.NONE) {
            if (this.canShowPVPT() || this.canShowLabyrinth() || this.canShowChampT()) {
                this.create();
            }
        } else if (this.state.v === STATE.CLOSED) {
            if (app.Model.user.pvpt) {
                let pvpt = app.Model.user.pvpt;
                let tmp = this.tmp.pvpt;
                if (tmp.s === undefined) {
                    tmp.s = pvpt.state.v;
                    if (tmp.s === 1) {
                        app.Utils.showInfo('Открыта запись на турнир Френы', {type: 0});
                        this.onArrowClickIfNotInBattle();
                    }
                } else if (tmp.s !== pvpt.state.v) {
                    tmp.s = pvpt.state.v;
                    if (tmp.s === 3) {
                        if (pvpt.e) {
                            app.Utils.showInfo('Началась фаза {0} в турнире!'.format(pvpt.state.phase), {type: 0});
                            this.onArrowClickIfNotInBattle();
                        }
                    }
                }
            } else {
                let pvpt = this.tmp.pvpt;
                if (pvpt.s) this.tmp.pvpt = {};
            }

            if (app.Model.user.labyrinth) {
                let lab = app.Model.user.labyrinth;
                let tmp = this.tmp.labyrinth;
                if (tmp.s !== lab.state.v) {
                    switch (lab.state.v) {
                        case 2: {
                            app.Utils.showInfo('Открыта запись на поход', {type: 0});
                            this.onArrowClickIfNotInBattle();
                            break;
                        }
                        case 3: {
                            if (lab.e) {
                                app.Utils.showInfo('Поход начался', {type: 0});
                                this.onArrowClickIfNotInBattle();
                            }
                            break;
                        }
                        case 4: {
                            if (lab.e) {
                                app.Utils.showInfo('Поход результаты', {type: 0});
                                this.onArrowClickIfNotInBattle();
                            }
                            break;
                        }
                    }
                    tmp.s = lab.state.v;
                }
            } else {
                let lab = this.tmp.labyrinth;
                if (lab.s) this.tmp.labyrinth = {};
            }

            let champt = app.Model.user.champt;
            if (champt) {
                let tmp = this.tmp.champt;
                if (!tmp) tmp = this.tmp.champt = {};
                if (tmp.s !== champt.state.v) {
                    switch (champt.state.v) {
                        case 1: {
                            app.Utils.showInfo('Открыта запись на турнир Чемпионов', {type: 0});
                            this.onArrowClickIfNotInBattle();
                            break;
                        }
                        case 3: {
                            if (champt.e) {
                                app.Utils.showInfo('Турнир начался', {type: 0});
                                this.onArrowClickIfNotInBattle();
                            }
                            break;
                        }
                        case 4:
                        case 5: {
                            if (champt.e) {
                                app.Utils.showInfo('Турнир результаты', {type: 0});
                                this.onArrowClickIfNotInBattle();
                            }
                            break;
                        }
                    }
                    tmp.s = champt.state.v
                }
            }
        }

        if (this.state.v !== STATE.NONE) {
            let top = 135;
            if (app.GuildPage.getCFG()) {
                let el = app.GuildPage.getCFG().els.emblem.name;
                let rect = el.getBoundingClientRect();
                top = rect.top + app.LAYOUT.convert0(rect.height);
                if (top > 0) {
                    top += 5;
                }
            }
            if (top !== 0 && this.cfg.els.main.style.top !== top + 'px') {
                TweenMax.killTweensOf(this.cfg.els.main);
                TweenMax.to(this.cfg.els.main, 0.3, {top: top});
            }

            if (this.cfg.pvpt) {
                this.cfg.pvpt.update();
                app.Notifications.tmp.needToUpdateSizes = 1;
            }
            if (this.cfg.labyrinth) {
                this.cfg.labyrinth.update();
                app.Notifications.tmp.needToUpdateSizes = 1;
            }
            if (this.cfg.champt) {
                this.cfg.champt.update();
                app.Notifications.tmp.needToUpdateSizes = 1;
            }
        }

        if (app.Notifications.tmp.needToUpdateSizes) {
            app.Notifications.tmp.needToUpdateSizes = 0;
            if (this.state.v === STATE.OPENED) {
                this.state.v = STATE.ANIMATION;
                this.updateSizes(({w, h, onComplete}) => {
                    TweenMax.killTweensOf(this.cfg.els.data);
                    let tl = new TimelineMax({onComplete});
                    tl.to(this.cfg.els.data, 0.3, {width: w, height: h, padding: 5});
                }, () => {
                    if (this.state.v === STATE.NONE) return;
                    this.state.v = STATE.OPENED;
                });
            }
        }

        if (this._updateTL) {
            this._updateTL.kill();
        }
        this._updateTL = TweenMax.delayedCall(0.5, () => this.update());
    },


};

app.Notifications = Notifications;