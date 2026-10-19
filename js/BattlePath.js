if (!app.BattlePath) {

    app.BattlePath = {
        _state: {v: 0},

        init() {

        },
        create() {
            if (!app.Model.user.battlePath) return;
            this._create();
        },
        _create() {
            let p = app.Popups.createPopup1({
                onShow() {
                    if (!app.Model.user.battlePath) {
                        app.Popups.removePopup(p);
                        return;
                    }
                    app.BattlePath.onTabClick(p, p.cfg.tabs.active);
                },
                onUpdate() {
                    if (!app.Model.user.battlePath) {
                        app.Popups.removePopup(p);
                        return;
                    }

                    if (p.cfg.tabs.active === 1) {

                    } else if (p.cfg.tabs.active === 2) {
                        let battlePath = app.Model.user.battlePath;

                        for (let t of ['free', 'paid']) {
                            let quests = battlePath.quests[t].list;
                            for (let i = 0; i < quests.length; i++) {
                                let quest = quests[i];
                                let oldCfg = p.tmp.t2.slotCFGS[i + (t === 'free' ? 0 : 2)];
                                let replace = false;
                                if (quest.t !== oldCfg.quest.t) {
                                    replace = true;
                                } else if (quest.p !== oldCfg.quest.p) {
                                    replace = true;
                                }
                                if (replace) {
                                    let newCfg = p.tmp.t2.createSlot(quest, oldCfg.idx, oldCfg.paid, p.tmp.t2.onQuestComplete);
                                    p.scroll.el.replaceChild(newCfg.els.main, oldCfg.els.main);
                                    oldCfg._remove = 1;

                                    let idx = p.tmp.t2.slotCFGS.indexOf(oldCfg);
                                    p.tmp.t2.slotCFGS[idx] = newCfg;
                                }
                            }
                        }
                    }
                },
                onScroll: (deltaY) => {
                    if (p.tmp.t1 && p.tmp.t1.tl) {
                        p.tmp.t1.tl.progress(1);
                        delete p.tmp.t1.tl;
                    }

                    let scroll = p.scroll;
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

                    if (p.tmp.el_scroll_sh_top) {
                        if (scroll.top === scroll.topMax) {
                            p.tmp.el_scroll_sh_top.style.opacity = 0;
                        } else {
                            p.tmp.el_scroll_sh_top.style.opacity = 1;
                        }
                    }

                    if (p.tmp.el_scroll_sh_bottom) {
                        if (scroll.top === scroll.topMin) {
                            p.tmp.el_scroll_sh_bottom.style.opacity = 0;
                        } else {
                            p.tmp.el_scroll_sh_bottom.style.opacity = 1;
                        }
                    }

                    return true;
                },
                onClose() {
                    p.tmp._closed = 1;
                }
            });

            p.els.brd_bg.className = 'brd_block_bp';

            p.tmp = {};

            p.cfg.tabs = {active: 1};

            let tab = p.cfg.tabs.t1 = {els: {}};
            tab.els.main = app.Utils.createA({class: 'brd_block_tab brd_block_tab_l', style: 'left: 30px', text: app.BattlePath.getEventName()}, this.onTabClick.bind(this, p, 1));
            tab.els.main.appendChild(tab.els.note = app.Utils.createSPAN({class: 'menu_note menu_note_g', style: 'right: -5px; display: none'}));
            p.els.brd_r.appendChild(tab.els.main);

            tab = p.cfg.tabs.t2 = {els: {}};
            tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 165px', text: 'Задания'}, this.onTabClick.bind(this, p, 2));
            tab.els.main.appendChild(tab.els.note = app.Utils.createSPAN({class: 'menu_note menu_note_g', style: 'right: -5px; display: none'}));
            p.els.brd_r.appendChild(tab.els.main);

            tab = p.cfg.tabs.t3 = {els: {}};
            tab.els.main = app.Utils.createA({class: 'brd_block_tab', style: 'left: 270px', text: 'Рейтинг'}, this.onTabClick.bind(this, p, 3));
            tab.els.main.appendChild(tab.els.note = app.Utils.createSPAN({class: 'menu_note menu_note_g', style: 'right: -5px; display: none'}));
            p.els.brd_r.appendChild(tab.els.main);

            let availableHeight0 = app.LAYOUT.getClientWHS0(80 + 80);
            let contentRequiredHeight = 628;

            let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
            let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';

            p.tmp.availableHeight = availableHeight;
            p.tmp.contentRequiredHeight = contentRequiredHeight;

            p.els.brd_r.appendChild(this.createHelp('BattlePath'));

            app.Popups.add(p);
        },

        onTabClick(p, tab) {
            let tabs = p.cfg.tabs;
            tabs.active = tab;

            app.Utils.removeClass(tabs.t1.els.main, 'brd_block_tab_active');
            app.Utils.removeClass(tabs.t2.els.main, 'brd_block_tab_active');
            app.Utils.removeClass(tabs.t3.els.main, 'brd_block_tab_active');

            this.clear(p);

            if (tab === 1) {
                app.Utils.addClass(tabs.t1.els.main, 'brd_block_tab_active');
                tabs.t1.els.main.style.zIndex = 1;
                tabs.t1.els.note.style.display = 'none';
                this.createTab1(p);
                if (app.UserUtil.hasAnyBattlePathCompleteQuest(true)) {
                    tabs.t2.els.note.style.display = '';
                }
            } else if (tab === 2) {
                app.Utils.addClass(tabs.t2.els.main, 'brd_block_tab_active');
                tabs.t2.els.main.style.zIndex = 1;
                tabs.t2.els.note.style.display = 'none';
                this.createTab2(p);
                if (app.UserUtil.hasAnyBattlePathStepReward(true) || app.UserUtil.canBattlePathOpenChest()) {
                    tabs.t1.els.note.style.display = '';
                }
            } else {
                app.Utils.addClass(tabs.t3.els.main, 'brd_block_tab_active');
                tabs.t3.els.main.style.zIndex = 1;
                tabs.t3.els.note.style.display = 'none';
                this.createTab3(p);
            }
        },

        clear(p) {
            if (p.tmp.list) {
                p.tmp.list.forEach(el => {
                    if (el.parentNode) el.parentNode.removeChild(el);
                });
                delete p.tmp.list;
            }

            if (p.tmp.el_scroll_sh_top) {
                if (p.tmp.el_scroll_sh_top.parentNode) {
                    p.tmp.el_scroll_sh_top.parentNode.removeChild(p.tmp.el_scroll_sh_top);
                }
                delete p.tmp.el_scroll_sh_top;
            }
            if (p.tmp.el_scroll_sh_bottom) {
                if (p.tmp.el_scroll_sh_bottom.parentNode) {
                    p.tmp.el_scroll_sh_bottom.parentNode.removeChild(p.tmp.el_scroll_sh_bottom);
                }
                delete p.tmp.el_scroll_sh_bottom;
            }

            app.Utils.removeAllChild(p.scroll.el);

            if (p.tmp.t1) {
                if (p.tmp.t1.tl) {
                    if (p.tmp.t1.tl.progress() !== 1) {
                        p.tmp.t1.tl.progress(1);
                        return;
                    }
                }
                delete p.tmp.t1;
            }

            delete p.tmp.t2;
        },

        createTab1(p) {
            p.tmp.list = [];
            p.tmp.t1 = {};
            let v = p.tmp.t1.v = Math.random();

            let battlePath = app.Model.user.battlePath;
            let currentStep = battlePath.step.c;

            let cfgBP = app.CFGUtil.getBattlePathCFG();
            let cfgBPNextStep = cfgBP.steps[currentStep + 1];

            let el_list = app.Utils.createDIV({class: 'list_s', style: 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 15px; min-height: 70px'});
            el_list.appendChild(app.Utils.createDIV({class: 'bp_ticket', style: 'left: 15px; top:10px; transform: scale(0.8);'}));
            el_list.appendChild(app.Utils.createDIV({class: 'bp_timer', style: 'right: 20px; top 5px;'}));
            let el_time;
            el_list.appendChild(el_time = app.Utils.createDIV({style: 'position: absolute; width: 70px; right: 5px; top:50px; text-align: center;'}));

            let update = () => {
                if (p.tmp._closed || p.cfg.tabs.active !== 1 || v !== p.tmp.t1.v) return;
                let timeLeft = battlePath.s.t - app.TimeUtil.now();
                if (timeLeft <= 0) {
                    el_time.innerText = 'Ожидаем обновления';
                } else {
                    el_time.innerText = app.TimeUtil.formatToHumanTime(timeLeft, 2);
                }
                TweenMax.delayedCall(1, update);
            };
            update();

            let el_ = app.Utils.createDIV({class: 'cntr'});
            el_.appendChild(app.Utils.createDIV({class: 'major big str', text: 'Золотой свиток'}));
            el_.appendChild(app.Utils.createA({class: battlePath.offer_bpath_gold ? 'btn_g btn_c mt10 mlra_ab' : 'btn_g btn_a mt10 mlra_ab', text: battlePath.offer_bpath_gold ? 'Активен' : 'Активировать'}, () => {
                this.createGoldTicketPopup();
            }));
            el_list.appendChild(el_);
            p.els.brd_r.appendChild(el_list);

            p.tmp.list.push(el_list);

            let progress = battlePath.step.p;
            let required = cfgBPNextStep ? cfgBPNextStep.required : -1;
            let prg = cfgBPNextStep ? app.Utils.toPRG(progress, required) : 100;

            let el_prg = app.Utils.createDIV({class: 'bp_prg mlra_ab', style: 'top: 120px'})
            let el_w = app.Utils.createDIV({class: 'bp_prg_wrap'});
            el_w.appendChild(app.Utils.createDIV({class: 'bp_prg_bg', style: 'width: {0}%'.format(prg)}));
            if (cfgBPNextStep) {
                el_w.appendChild(app.Utils.createDIV({class: 'bp_prg_text', text: '{0} из {1}'.format(progress, required)}));
            }
            el_prg.appendChild(el_w);
            el_prg.appendChild(app.Utils.createDIV({class: 'bp_pin', style: 'right: -15px; top: -4px', text: cfgBPNextStep ? currentStep + 2 : currentStep + 1}));
            el_prg.appendChild(app.Utils.createDIV({class: 'bp_curr ' + app.BattlePath.getEventValueIMGClass1(), style: 'left: -11px;top: 4px;transform: scale(0.75);'}));
            p.els.brd_r.appendChild(el_prg);
            p.tmp.list.push(el_prg);

            let createSlot = (step, entry, paid, lock, done, onClick) => {
                let cfg = {
                    step: step,
                    paid: paid,
                    lock: lock,
                    els: {}
                };

                let el;
                if (paid) {
                    el = app.Utils.createDIV({class: 'bp_slot fll', style: 'left: 20px'});
                } else {
                    el = app.Utils.createDIV({class: 'bp_slot flr', style: 'right: 20px'});
                }
                cfg.els.main = el;

                let reward = paid ? entry.reward.paid : entry.reward.free;

                let el_entry;

                if (reward.avatar) {
                    let img;
                    if (app.Model.user.gender === 1) {
                        img = paid ? '/images/avatars/event/23f/m_w.jpg' : '/images/avatars/event/23f/m.jpg';
                    } else {
                        img = paid ? '/images/avatars/event/23f/f_w.jpg' : '/images/avatars/event/23f/f.jpg';
                    }
                    let avatar = app.Utils.createAvatarComponent(65, img);
                    avatar.els.main.style = 'top: 2px; left: 40px;transform: scale(0.9143); transform-origin: bottom';
                    el.appendChild(avatar.els.main);
                    el_entry = avatar.els.main;
                } else {
                    let el_entry_class;
                    if (paid) {
                        el_entry_class = 'mlra_ab item_slot item_slot_empty item_slot_q5';
                    } else {
                        el_entry_class = 'mlra_ab item_slot item_slot_empty';
                    }

                    el.appendChild(el_entry = app.Utils.createDIV({class: el_entry_class, style: 'top: 5px;'}));

                    if (reward.item) {
                        let cfgItem = app.CFGUtil.getItemByID(reward.item);
                        el_entry.appendChild(app.Utils.createIMG(cfgItem.img, {style: 'width: 55px'}))
                        el_entry.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', text: reward.itemCount}));
                    } else if (reward.tickets) {
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_raid', style: 'left: 15px; top: 9px;'}))
                        el_entry.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', text: reward.tickets}))
                    } else if (reward.dust) {
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_dust', style: 'left: 12px; top: 10px;'}))
                        el_entry.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', text: reward.dust}))
                    } else if (reward.sd) {
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_dust_stone', style: 'left: 12px; top: 10px;'}))
                        el_entry.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', text: reward.sd}))
                    } else if (reward.gs) {
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_boss', style: 'left: 12px; top: 10px;'}))
                        el_entry.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', text: reward.gs}))
                    } else if (reward.gold) {
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 12px; top: 23px; transform: rotate(-18deg)'}))
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 18px; top: 30px; transform: rotate(40deg) scale(0.7)'}))
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 36px; top: 36px; rotate(-40deg) scale(0.7)'}))
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 18px; top: 42px; transform: rotate(-52deg)'}))
                        el_entry.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', text: reward.gold}))
                    } else if (reward.gems) {
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_gem', style: 'left: 10px; top: 23px; transform: rotate(-18deg)'}));
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_gem', style: 'left: 18px; top: 30px; transform: rotate(40deg) scale(0.7)'}));
                        el_entry.appendChild(app.Utils.createSPAN({class: 'res_icon res_gem', style: 'left: 18px; top: 42px; transform: rotate(-52deg) scale(1.3)'}));
                        el_entry.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', text: reward.gems}));
                    } else if (reward.premium) {
                        el_entry.appendChild(app.Utils.createDIV({class: 'item_slot_vip'}));
                        el_entry.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', text: reward.premium + 'д'}));
                    }
                    el_entry.appendChild(app.Utils.createSPAN({class: 'brd'}))
                }

                cfg.createDone = () => {
                    el_entry.appendChild(app.Utils.createSPAN({class: 'done', style: 'right: -15px; top: 0px; transform: scale(1);'}));
                };

                if (lock) {
                    el_entry.appendChild(app.Utils.createSPAN({class: 'sh_card_lock'}));
                } else if (done) {
                    cfg.createDone();
                } else {
                    el.appendChild(cfg.els.a = app.Utils.createA({class: paid ? 'btn_g btn_gs_a btn_c mlra_ab' : 'btn_g btn_gs_c mlra_ab', style: 'z-index: 1', text: 'Получить'}));
                }

                if (onClick) {
                    el.onclick = () => {
                        onClick(cfg);
                    };
                }

                return cfg;
            };

            let createChestSlot = (entry, locked, onClick) => {
                let cfg = {
                    els: {},

                    createProgress() {
                        let progress = app.Model.user.battlePath.chest.p;
                        let required = app.CFGUtil.getBattlePathCFG().chest.required;
                        let prg = app.Utils.toPRG(progress, required);

                        let el = cfg.els.prg = app.Utils.createDIV({class: 'bp_prg mlra_ab', style: 'top: 150px'});
                        let el_w = app.Utils.createDIV({class: 'bp_prg_wrap'});
                        let el_prg = cfg.els.prg1 = app.Utils.createDIV({class: 'bp_prg_bg', style: 'width: {0}%'.format(prg)});
                        let el_txt = cfg.els.prg2 = app.Utils.createDIV({class: 'bp_prg_text', text: '{0} из {1}'.format(progress, required)});
                        el_w.appendChild(el_prg);
                        el_w.appendChild(el_txt);
                        el.appendChild(el_w);
                        el.appendChild(app.Utils.createDIV({class: 'bp_curr ' + app.BattlePath.getEventValueIMGClass1(), style: 'left: -11px;top: 4px;transform: scale(0.75)'}));
                        cfg.els.main.appendChild(el);
                    },

                    createA() {
                        let el = cfg.els.a = app.Utils.createA({class: 'btn_g btn_gs_c mlra_ab', style: 'top: 150px;', text: 'Открыть'}, () => {
                            onClick(cfg);
                        });
                        cfg.els.main.appendChild(el);
                    },

                    createLockText() {
                        cfg.els.main.appendChild(cfg.els.lock_txt = app.Utils.createDIV({class: 'cntr', style: 'position: relative; top: 160px;', text: "Пройдите все этапы, чтобы получать сундуки до конца сезона"}));
                    },

                    createState() {
                        if (locked) {
                            this.createLockText();
                        } else {
                            let progress = app.Model.user.battlePath.chest.p;
                            let required = app.CFGUtil.getBattlePathCFG().chest.required;

                            if (progress < required) {
                                this.createProgress();
                            } else {
                                this.createA();
                            }
                        }
                    },

                    updateState() {
                        let isChestLocked = app.Model.user.battlePath.step.c < app.CFGUtil.getBattlePathCFG().length - 1;
                        if (isChestLocked) {
                            if (!cfg.els.lock_txt) {
                                this.createLockText();
                            }
                            if (cfg.els.a) {
                                if (cfg.els.a.parentNode) cfg.els.a.parentNode.removeChild(cfg.els.a);
                                delete cfg.els.a;
                            }
                            if (cfg.els.prg) {
                                if (cfg.els.prg.parentNode) cfg.els.prg.parentNode.removeChild(cfg.els.prg);
                                delete cfg.els.prg1;
                                delete cfg.els.prg2;
                                delete cfg.els.prg;
                            }
                        } else {
                            let progress = app.Model.user.battlePath.chest.p;
                            let required = app.CFGUtil.getBattlePathCFG().chest.required;
                            let isCanOpen = progress >= required;

                            if (cfg.els.a) {
                                if (!isCanOpen) {
                                    if (cfg.els.a.parentNode) cfg.els.a.parentNode.removeChild(cfg.els.a);
                                    delete cfg.els.a;
                                    this.createProgress();
                                }
                            } else if (cfg.els.prg) {
                                if (isCanOpen) {
                                    if (cfg.els.prg.parentNode) cfg.els.prg.parentNode.removeChild(cfg.els.prg);
                                    delete cfg.els.prg1;
                                    delete cfg.els.prg2;
                                    delete cfg.els.prg;
                                    this.createA();
                                } else {
                                    cfg.els.prg1.style.width = '{0}%'.format(app.Utils.toPRG(progress, required));
                                    cfg.els.prg2.innerText = '{0} из {1}'.format(progress, required);
                                }
                            }
                        }
                    }
                };
                let el = cfg.els.main = app.Utils.createDIV({class: 'bp_last_step'});

                let lock = locked || battlePath.chest.p < app.CFGUtil.getBattlePathCFG().chest.required;
                el.appendChild(app.Utils.createDIV({class: 'header_hr', style: 'width: 440px; top: 0px', html: lock ? '<div class="bp_lock mlra_ab"></div>' : ''}));
                el.appendChild(app.Utils.createDIV({class: 'platform mlra_ab', style: 'top: 95px;'}));
                el.appendChild(app.Utils.createDIV({class: 'chest2 mlra_ab', style: 'top: 45px;'}));
                cfg.createState();
                el.onclick = () => {
                    onClick(cfg);
                }
                return cfg;
            };

            let onGetReward = (cfg) => {
                if (cfg.els.a) {
                    cfg.els.a.parentNode.removeChild(cfg.els.a);
                    delete cfg.els.a;
                }
                if (cfg.lock) {
                    app.Utils.showInfo('Награда еще недоступна');
                } else {
                    if (cfg.paid && !battlePath.offer_bpath_gold) {
                        this.createGoldTicketPopup(p);
                    } else {
                        app.Network.command({cmd: 'BattlePathStepReward', step: cfg.step, paid: cfg.paid}, data => {
                            if (data.error) {
                                switch (data.error.code) {
                                    case 1:
                                        app.Utils.showInfo('Событие закончилось');
                                        break;
                                    case 2:
                                        app.Utils.showInfo('Награда еще недоступна');
                                        break;
                                    case 3:
                                        app.Utils.showInfo('Золотые награды недоступны');
                                        break;
                                    case 4:
                                        app.Utils.showInfo('Награда уже получена');
                                        break;
                                    default:
                                        app.Utils.showInfo('Попробуйте позже');
                                        break;
                                }
                            } else {
                                app.Utils.showInfo('Награда получена', {type: 0});
                                cfg.createDone();
                                cfgChest.updateState();
                            }
                        });
                    }
                }
            };

            let onChestClick = (cfg) => {
                if (cfg.els.a) {
                    if (app.Utils.hasClass(cfg.els.a, 'bw')) return;
                    app.Utils.addClass(cfg.els.a, 'bw');
                    app.Network.command({cmd: 'BattlePathChestOpen'}, data => {
                        if (data.error) {
                            switch (data.error.code) {
                                case 1:
                                    app.Utils.showInfo('Событие закончилось');
                                    break;
                                case 2:
                                    app.Utils.showInfo('Сундук не собран');
                                    break;
                                default:
                                    app.Utils.showInfo('Попробуйте позже');
                                    break;
                            }
                        } else {
                            app.UserUtil.processChestDrop(data.drop);
                            app.EventDispatcher.emit('show chest drop', {drop: data.drop});
                            app.EventDispatcher.emit('user resources changed');
                        }

                        if (p.tmp._closed) return;
                        app.Utils.removeClass(cfg.els.a, 'bw');
                        cfg.updateState();
                    });
                } else {
                    app.Utils.showInfo('Выполняйте задания, чтобы открыть сундук');
                }
            };

            let cfgSteps = app.CFGUtil.getBattlePathCFG().steps;
            cfgSteps.forEach((entry, i) => {
                let isStepLocked = i > currentStep;
                let rewards = battlePath.rewards[i];

                let el_class = 'bp_row';
                if (isStepLocked) {
                    el_class += ' bp_row_lock';
                }

                let el_row = app.Utils.createDIV({class: el_class});

                let doneL = rewards && rewards.paid;
                let cfgL = createSlot(i, entry, true, isStepLocked, doneL, onGetReward);
                el_row.appendChild(cfgL.els.main);

                el_row.appendChild(app.Utils.createDIV({class: 'bp_pin mlra_ab', style: 'top: 20px', text: (i + 1)}));

                let doneR = rewards && rewards.free;
                let cfgR = createSlot(i, entry, false, isStepLocked, doneR, onGetReward);
                el_row.appendChild(cfgR.els.main);

                if (i === currentStep && cfgBPNextStep) {
                    el_row.appendChild(app.Utils.createDIV({class: 'header_hr', style: 'width: 440px; top: 90px', html: '<div class="bp_lock mlra_ab"></div>'}));
                }

                p.scroll.el.appendChild(el_row);
            });

            let isChestLocked = battlePath.step.c < cfgSteps.length - 1;
            let cfgChest = createChestSlot(app.CFGUtil.getBattlePathCFG().chest, isChestLocked, onChestClick);
            p.scroll.el.appendChild(cfgChest.els.main);

            if (!isChestLocked) {
                el_prg.style.display = 'none';
            }

            p.els.wrap.appendChild(p.tmp.el_scroll_sh_top = app.Utils.createDIV({class: 'scroll_sh_top', style: 'width: 440px'}));
            p.tmp.list.push(p.tmp.el_scroll_sh_top);
            p.els.wrap.appendChild(p.tmp.el_scroll_sh_bottom = app.Utils.createDIV({class: 'scroll_sh_bottom', style: 'width: 440px'}));
            p.tmp.list.push(p.tmp.el_scroll_sh_bottom);

            p.els.wrap.style.width = '440px';
            p.els.wrap.style.height = (p.tmp.availableHeight - 155) + 'px';
            p.els.wrap.style.left = '20px';
            p.els.wrap.style.top = '155px';
            p.els.wrap_s.style.width = '440px';

            TweenMax.delayedCall(0.001, () => {
                if (p.tmp._closed) return;

                let contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                contentRequiredHeight += 50;

                let availableHeight = p.tmp.availableHeight - 150;

                p.scroll.top = 20;
                p.scroll.topMax = 20;
                p.scroll.topMin = contentRequiredHeight > availableHeight ? availableHeight - contentRequiredHeight : 0;
                p.scroll.el.style.top = p.scroll.top + 'px';

                let _i = 0;
                for (let i = 0; i < app.CFGUtil.getBattlePathCFG().steps.length; i++) {
                    let isStepLocked = i > currentStep;
                    if (isStepLocked) break;

                    let rewards = battlePath.rewards[i];
                    let doneFree = rewards && rewards.free;
                    if (!doneFree) {
                        _i = i;
                        break;
                    }
                    if (battlePath.offer_bpath_gold) {
                        let donePaid = rewards && rewards.paid;
                        if (!donePaid) {
                            _i = i;
                            break;
                        }
                    }
                }

                let moveTo = 0;

                if (_i === 0) {
                    if (battlePath.step.c === app.CFGUtil.getBattlePathCFG().steps.length - 1) {
                        moveTo = Math.max(p.scroll.top - contentRequiredHeight, p.scroll.topMin);
                    }
                } else if (_i > 0) {
                    let hof1 = app.LAYOUT.convert0(p.scroll.el.childNodes[0].getBoundingClientRect().height);
                    moveTo = Math.max(p.scroll.top - hof1 * _i, p.scroll.topMin);
                }

                if (moveTo !== 0) {
                    p.tmp.t1.tl = TweenMax.to(p.scroll, 0.5, {
                        top: moveTo,
                        delay: 0.3,
                        ease: Power2.easeInOut,
                        onUpdate() {
                            p.scroll.el.style.top = p.scroll.top + 'px';
                        }
                    });
                }
            });
        },

        createTab2(p) {
            p.tmp.list = [];
            p.tmp.t2 = {};

            let getQname = (quest) => {
                switch (quest.t) {
                    case 's_d':
                        return 'Распылить {0} {1}'.format(quest.r, app.Utils.getGramStringPrepared(quest.r, 'камень'));
                    case 's_dg':
                        return 'Получить {0} каменной пыли'.format(quest.r);
                    case 's_s':
                        return 'Выполнить {0} поиск в каменоломне'.format(quest.r);

                    case 'i_d':
                        return 'Распылить {0} {1}'.format(quest.r, app.Utils.getGramStringPrepared(quest.r, 'вещь'));
                    case 'i_dg':
                        return 'Получить {0} рунной пыли'.format(quest.r);

                    case 'c_cg':
                        return 'Получить {0} фрагментов простых карт'.format(quest.r);
                    case 'c_ucg':
                        return 'Получить {0} фрагментов необычных карт'.format(quest.r);
                    case 'c_rg':
                        return 'Получить {0} фрагментов редких карт'.format(quest.r);

                    case 'c_epu':
                        return 'Использовать {0} банку опыта карты'.format(quest.r);
                    case 'c_clu':
                        return 'Улучшить умение любой карты';

                    case 'e_s':
                        return 'Заработать {0} тонуса'.format(quest.r);
                    case 'gld_s':
                        return 'Потратить {0} золота'.format(app.Utils.toMoney(quest.r));
                    case 'g_s':
                        return 'Потратить {0} кристаллов'.format(app.Utils.toMoney(quest.r));
                    case 'g_g':
                        return 'Получить {0} кристаллов'.format(app.Utils.toMoney(quest.r));
                    case 'n_g':
                        return 'Получить {0} нексита'.format(app.Utils.toMoney(quest.r));

                    case 'b_t_h':
                        return 'Бросить на кубиках <img src="{1}" style="width: 18px; height: 18px;"> {0} раз'.format(quest.r, app.IMAGES.getPath('/images/hit_16.png'));
                    case 'b_t_f':
                        return 'Бросить на кубиках <img src="{1}" style="width: 18px; height: 18px;"> {0} раз'.format(quest.r, app.IMAGES.getPath('/images/elem_f_16.png'));
                    case 'b_t_n':
                        return 'Бросить на кубиках <img src="{1}" style="width: 18px; height: 18px;"> {0} раз'.format(quest.r, app.IMAGES.getPath('/images/elem_n_16.png'));
                    case 'b_t_w':
                        return 'Бросить на кубиках <img src="{1}" style="width: 18px; height: 18px;"> {0} раз'.format(quest.r, app.IMAGES.getPath('/images/elem_w_16.png'));

                    case 'a_b':
                        return 'Провести {0} бой на арене'.format(quest.r);
                    case 'l_w':
                        return 'Одержать победу в лиге {0} раз'.format(quest.r);
                    case 'c_w':
                        return 'Победить в кампании {0} раз'.format(quest.r);
                    case 'c_ab':
                        return 'Провести автобой в кампании {0} раз'.format(quest.r);

                    case 'd_q':
                        return 'Выполнить {0} ежедневное задание'.format(quest.r);
                }
            };

            let createSlot = (quest, idx, paid, onClick) => {
                let cfg = {
                    idx: idx,
                    paid: paid,
                    quest: quest,
                    els: {}
                };

                if (quest.t === 'EMPTY') {
                    let el = cfg.els.main = app.Utils.createDIV({class: 'quest_row mlra_ab mt5', style: 'width: 400px; position: relative;'});
                    let el_time;
                    el.appendChild(el_time = app.Utils.createDIV({class: 'mt5 info dbl cntr', style: 'height: 82px; line-height: 42px'}));
                    let el_reset;
                    cfg.update = () => {
                        if (p.tmp._closed || p.cfg.tabs.active !== 2 || cfg._remove) {
                            return;
                        }
                        let timeLeft = app.Model.user.battlePath.quests[paid ? 'paid' : 'free'].rt - app.TimeUtil.now();
                        if (timeLeft <= 0) {
                            el_time.innerText = 'Ожидаем обновления';
                        } else {
                            el_time.innerText = 'Следующее задание через {0}'.format(app.TimeUtil.formatToHumanTime(timeLeft, 2));
                            if (!el_reset) {
                                el.appendChild(el_reset = app.Utils.createA({class: 'btn_g mlra_ab', style: 'top: 45px', html: 'Сейчас за <span class="res_icon res_icon_inline res_gem"></span>5'}, () => {
                                    if (app.Utils.hasClass(el_reset, 'bw')) return;
                                    app.Utils.addClass(el_reset, 'bw')
                                    app.Network.command({cmd: 'BattlePathQuestReset', paid: paid, idx: idx}, data => {
                                        if (data.error) {
                                            switch (data.error.code) {
                                                case 1:
                                                    app.Utils.showInfo('Событие закончилось');
                                                    break;
                                                case 5001:
                                                    app.Utils.processErrors(data.error)
                                                    break;
                                                default:
                                                    app.Utils.showInfo('Попробуйте позже');
                                                    break;
                                            }
                                        }
                                    });
                                }));
                            }
                        }
                        TweenMax.delayedCall(1, cfg.update);
                    };
                    cfg.update();

                } else {
                    let isComplete = quest.p >= quest.r;

                    let el = cfg.els.main = app.Utils.createDIV({class: 'quest_row mlra_ab mt5', style: 'width: 400px; position: relative;'});
                    let a_class, a_name;
                    if (paid) {
                        if (isComplete) {
                            a_class = 'btn_g btn_gsm_a';
                            a_name = 'Получить';
                        } else {
                            a_class = 'btn_g btn_gsm';
                            a_name = 'Перейти';
                        }
                    } else {
                        if (isComplete) {
                            a_class = 'btn_g btn_gsm_c';
                            a_name = 'Получить';
                        } else {
                            a_class = 'btn_g btn_gsm';
                            a_name = 'Перейти';
                        }
                    }
                    el.appendChild(app.Utils.createA({class: a_class, style: 'top: 15px; left: 310px;', text: a_name}, () => {
                        onClick(cfg);
                    }));

                    let el_q = app.Utils.createA({class: 'mail_top_r mail_top_rw', style: 'margin-left: 5px'});
                    el.appendChild(el_q);

                    el_q.appendChild(app.Utils.createSPAN({class: 'mt5 info dbl', html: getQname(quest)}));

                    let el_prg = app.Utils.createDIV({class: 'log_dmg quest-progress', style: 'margin-top: 5px; margin-bottom: 5px;'});
                    el_prg.appendChild(app.Utils.createDIV({class: 'log_dmg_prg', style: 'width: {0}%'.format(app.Utils.toPRG(quest.p, quest.r))}));
                    el_prg.appendChild(app.Utils.createDIV({class: 'log_dmg_patch'}));
                    el_prg.appendChild(app.Utils.createDIV({class: 'log_dmg_text', text: '{0}/{1}'.format(Math.min(quest.p, quest.r), quest.r)}));
                    el_q.appendChild(el_prg);

                    let reward = quest.reward;
                    let el_r = app.Utils.createSPAN({class: 'mtb5', style: 'min-height: 20px'});
                    el_r.appendChild(app.Utils.createText('Награда: '));
                    el_r.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline ' + app.BattlePath.getEventValueIMGClass0(), style: 'transform: scale(0.5); margin-left: -10px; margin-right: -10px;'}));
                    el_r.appendChild(app.Utils.createText(reward.bpv));
                    el_r.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gem'}));
                    el_r.appendChild(app.Utils.createText(reward.gems));
                    el_q.appendChild(el_r);
                }

                return cfg;
            };
            p.tmp.t2.createSlot = createSlot;

            let battlePath = app.Model.user.battlePath;

            p.scroll.el.appendChild(app.Utils.createDIV({class: 'major str cntr mt20', text: 'Обычные задания:'}));

            let onQuestComplete = (cfg) => {
                if (cfg.paid && !app.Model.user.battlePath.offer_bpath_gold) {
                    this.createGoldTicketPopup(p);
                } else {
                    let isComplete = cfg.quest.p >= cfg.quest.r;
                    if (isComplete) {
                        app.Network.command({cmd: 'BattlePathQuestComplete', idx: cfg.idx, paid: cfg.paid}, data => {
                            if (data.error) {
                                switch (data.error.code) {
                                    case 1:
                                        app.Utils.showInfo('Событие закончилось');
                                        break;
                                    case 2:
                                        app.Utils.showInfo('Нужно завершить задание');
                                        break;
                                    case 3:
                                        app.Utils.showInfo('Золотые задания недоступны');
                                        break;
                                    default:
                                        app.Utils.showInfo('Попробуйте позже');
                                        break;
                                }
                            } else {
                                app.Utils.showInfo('Награда получена', {type: 0});
                            }
                        });
                    } else {
                        switch (cfg.quest.t) {
                            case 's_d':
                                app.EventDispatcher.emit('show profile', {inventory: 1, filter: 2});
                                return;
                            case 's_dg':
                            case 's_s':
                                app.DungeonPage.create({tabs: {active: 2}});
                                return;

                            case 'i_d':
                            case 'i_dg':
                                app.EventDispatcher.emit('show profile', {inventory: 1, filter: 1});
                                return;

                            case 'c_cg':
                            case 'c_ucg':
                            case 'c_rg':
                                app.ChestsPage.create();
                                return;

                            case 'c_epu':
                            case 'c_clu':
                                app.CardsPage.create();
                                return;

                            case 'e_s':
                                app.Campaign.create();
                                return;
                            case 'gld_s':
                            case 'g_s':
                                app.ShopPage.create();
                                return;
                            case 'g_g':
                                app.QuestsPage.create();
                                return;
                            case 'n_g':
                                app.loadJS1('Expedition', () => {
                                    app.Expedition.create();
                                });
                                return;

                            case 'b_t_h':
                            case 'b_t_f':
                            case 'b_t_n':
                            case 'b_t_w':
                                app.Campaign.create();
                                return;

                            case 'a_b':
                                app.ArenaPage.create();
                                return;
                            case 'l_w':
                                app.LeaguePage.create();
                                return;
                            case 'c_w':
                                app.Campaign.create();
                                return;
                            case 'c_ab':
                                app.Campaign.create();
                                return;

                            case 'd_q':
                                app.QuestsPage.create();
                                return;
                        }
                    }
                }
            };
            p.tmp.t2.onQuestComplete = onQuestComplete;

            p.tmp.t2.slotCFGS = [];
            battlePath.quests.free.list.forEach((quest, i) => {
                let cfg = createSlot(quest, i, false, onQuestComplete);
                p.scroll.el.appendChild(cfg.els.main);
                p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb10', style: 'width: 420px;'}));
                p.tmp.t2.slotCFGS.push(cfg);
            });

            p.scroll.el.appendChild(app.Utils.createDIV({class: 'major str cntr mt20', text: 'Задания золотого свитка:'}));

            battlePath.quests.paid.list.forEach((quest, i) => {
                let cfg = createSlot(quest, i, true, onQuestComplete);
                p.scroll.el.appendChild(cfg.els.main);
                p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb10', style: 'width: 420px;'}));
                p.tmp.t2.slotCFGS.push(cfg);
            });

            p.els.wrap.style.width = '440px';
            p.els.wrap.style.height = p.tmp.availableHeight + 'px';
            p.els.wrap.style.left = '20px';
            p.els.wrap.style.top = '0px';
            p.els.wrap_s.style.width = '440px';

            TweenMax.delayedCall(0.001, () => {
                if (p.tmp._closed) return;

                let contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                let availableHeight = p.tmp.availableHeight;

                p.scroll.top = 1;
                p.scroll.topMax = 1;
                p.scroll.topMin = contentRequiredHeight > availableHeight ? availableHeight - contentRequiredHeight : 0;
                p.scroll.el.style.top = p.scroll.top + 'px';
            });
        },

        createTab3(p) {
            p.tmp.list = [];

            let el;
            p.els.brd_r.appendChild(el = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Лучшие игроки'}));
            p.tmp.list.push(el);

            const el_list = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 25px; top: 40px; width: 415px; padding: 5px; height: 55px'}, app.EventDispatcher.emit.bind(null, 'user info', app.Model.user.id));
            let el_place;
            el_list.appendChild(el_place = app.Utils.createDIV({class: 'rating_top_p rating_top_m', html: '<span class="normal" style="font-size: 12px; white-space: nowrap;">Моё место</span><div>?</div>'}));

            let avatar = app.Utils.createAvatarComponent(app.Model.user.rank, app.Model.user.avatar.img);
            avatar.els.main.style = 'transform: scale(0.7); left: 80px; top: 5px';
            el_list.appendChild(avatar.els.main);

            let el_points;
            el_list.appendChild(el_points = app.Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 130px; padding-top: 5px', html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">{1}:</span><span class="flr mt5"> ?</span>'.format(app.UserUtil.getUserNameUpper0(app.Model.user.name), app.BattlePath.getCollectedLabel())}));
            p.els.brd_r.appendChild(el_list);
            p.tmp.list.push(el_list);

            p.els.wrap.appendChild(p.tmp.el_scroll_sh_top = app.Utils.createDIV({class: 'scroll_sh_top', style: 'width: 440px'}));
            p.tmp.list.push(p.tmp.el_scroll_sh_top);
            p.els.wrap.appendChild(p.tmp.el_scroll_sh_bottom = app.Utils.createDIV({class: 'scroll_sh_bottom', style: 'width: 440px'}));
            p.tmp.list.push(p.tmp.el_scroll_sh_bottom);

            let availableHeight = p.tmp.availableHeight - 120;
            p.els.wrap.style.left = '30px';
            p.els.wrap.style.top = '120px';
            p.els.wrap.style.width = '420px';
            p.els.wrap_s.style.width = '420px';
            p.els.wrap.style.height = availableHeight + 'px';

            p.scroll.top = 20;
            p.scroll.topMax = 20;
            p.scroll.topMin = 0;
            p.scroll.el.style.top = p.scroll.top + 'px';

            app.Network.command({cmd: 'BattlePathRating'}, data => {
                if (p.tmp._closed || p.cfg.tabs.active !== 3) return;
                if (data.error) {
                    switch (data.error.code) {
                        case 1:
                            app.Utils.showInfo('Событие закончилось');
                            break;
                        default:
                            app.Utils.showInfo('Попробуйте позже');
                            break;
                    }
                } else {
                    if (data.me) {
                        el_place.innerHTML = '<span class="normal" style="font-size: 12px; white-space: nowrap;">Моё место</span><div>{0}</div>'.format(data.me.p);
                        el_points.innerHTML = '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">{1}:</span><span class="flr mt5"> {2}</span>'.format(app.UserUtil.getUserNameUpper0(app.Model.user.name), app.BattlePath.getCollectedLabel(), data.me.v);
                    }

                    data.list.forEach(function(entry, i) {
                        let el = app.Utils.createDIV({class: 'rating_row'}, app.EventDispatcher.emit.bind(null, 'user info', entry.u.id));
                        if (entry.p <= 3) {
                            el.appendChild(app.Utils.createDIV({class: 'rating_top_p rating_top_p' + entry.p}));
                        } else {
                            el.appendChild(app.Utils.createDIV({class: 'rating_top_p', text: entry.p}));
                        }

                        let avatar = app.Utils.createAvatarComponent(entry.u.r, entry.u.a);
                        avatar.els.main.style = 'transform: scale(0.5); left: 40px';
                        el.appendChild(avatar.els.main);

                        el.appendChild(app.Utils.createDIV({class: 'rating_row_r', html: '<a class="major str tdn">{0}</a><div class="clr"></div><span class="mt5 dbl fll">{1}:</span><span class="flr mt5">{2}</span>'.format(app.UserUtil.getUserNameUpper0(entry.u.n), app.BattlePath.getCollectedLabel(), app.Utils.toMoney(entry.v))}));
                        p.scroll.el.appendChild(el);
                        p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb5'}));
                    });

                    TweenMax.delayedCall(0.001, function() {
                        if (p.tmp._closed || p.cfg.tabs.active !== 3) return;

                        p.scroll.availableHeight = availableHeight;
                        p.scroll.contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                        p.scroll.top = 20;
                        p.scroll.topMax = 20;
                        p.scroll.topMin = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.availableHeight - p.scroll.contentRequiredHeight: 0;
                        p.scroll.el.style.top = p.scroll.top + 'px';
                    });
                }
            });
        },

        createGoldTicketPopup() {
            let p = app.Popups.createPopup1({
                header: {value: 'Золотой свиток'},
                onUpdate() {
                    if (!app.Model.user.battlePath) {
                        app.Popups.removePopup(p);
                    }
                },
                onClose() {
                    p.tmp._closed = 1;
                }
            });

            p.els.brd_bg.className = 'brd_block_bp';

            p.tmp = {};

            p.scroll.el.appendChild(app.Utils.createDIV({class: 'major str cntr mt20', html: 'Золотой свиток даёт преимущества до конца сезона:'}));

            let el = app.Utils.createDIV({class: 'vip_page_text mlra_ab', style: 'margin-top: 25px; width: 240px;'});
            el.appendChild(app.Utils.createSPAN({class: 'done', style: 'left: -24px; top:-0px; transform: scale(0.55);'}));
            el.appendChild(app.Utils.createSPAN({class: 'done', style: 'left: -24px; top:22px; transform: scale(0.55);'}));
            el.appendChild(app.Utils.createSPAN({class: 'done', style: 'left: -24px; top:44px; transform: scale(0.55);'}));
            el.appendChild(app.Utils.createSPAN({class: 'done', style: 'left: -24px; top:67px; transform: scale(0.55);'}));
            el.appendChild(app.Utils.createText('Получаемый опыт '));
            el.appendChild(app.Utils.createSPAN({class: 'res_exp res_exp_inline'}));
            el.appendChild(app.Utils.createSPAN({class: 'info str', text: 'x2'}));
            el.appendChild(app.Utils.createBR());
            el.appendChild(app.Utils.createText('Максимум энергии '));
            el.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_energy'}));
            el.appendChild(app.Utils.createSPAN({class: 'info str', text: '+100'}));
            el.appendChild(app.Utils.createBR());
            el.appendChild(app.Utils.createSPAN({style: 'line-height: 20px', text: 'Доступ  ко всем наградам сезона'}));
            el.appendChild(app.Utils.createBR());
            el.appendChild(app.Utils.createSPAN({style: 'line-height: 20px', text: 'Дополнительные задания сезона'}));
            el.appendChild(app.Utils.createBR());
            p.scroll.el.appendChild(el);

            p.scroll.el.appendChild(app.Utils.createDIV({class: 'bp_ticket mlra_ab', style: 'top:210px; transform: scale(1)'}));

            let battlePath = app.Model.user.battlePath;
            if (battlePath.offer_bpath_gold) {
                p.scroll.el.appendChild(app.Utils.createA({class: 'btn_g btn_c mt10 mlra_ab', style: 'top: 300px', text: 'Активен'}));
            } else {
                app.Network.command({cmd: 'BattlePathOffer'}, data => {
                    if (p.tmp._closed) return;

                    let offer = data.offer_bpath_gold;
                    if (!offer) return;

                    let price;
                    if (app.UserUtil.isGoogle()) {
                        let skuDetails = google.getSkuDetails(offer.sku);
                        skuDetails = JSON.parse(skuDetails);
                        if (skuDetails.error) {
                            console.log('skuDetails for ' + offer.sku + ' not found');
                            return;
                        }
                        price = skuDetails.price.v / 1000000 + ' ' + skuDetails.price.c;
                    } else {
                        price = app.Utils.toMoney(offer.p);
                        if (app.UserUtil.isVK()) {
                            price += ' ' + app.Utils.getGramString(offer.p, 'голос', 'голоса', 'голосов');
                        } else if (app.UserUtil.isOK() && !app.UserUtil._isInIDsForXsolla()) {
                            price += ' OK';
                        } else if (app.UserUtil.isFS()) {
                            price += ' ФМ';
                        } else if (app.UserUtil.isGamepad()) {
                            price += ' GP';
                        } else if (app.UserUtil.isMMR()) {
                            price += ' ' + Utils.getGramString(offer.p, 'мэйлик', 'мэйлика', 'мэйликов');
                        } else if (app.UserUtil.isRBK()) {
                            price += ' RBK';
                        } else if (app.UserUtil.isPlaydeck()) {
                            price += ' STARS';
                        } else {
                            price += 'р';
                        }
                    }

                    const a = app.Utils.createA({class: 'btn_g btn_gs_a mlra_ab', style: 'top: 300px', text: price});
                    app.Purchase.addOfferOnClick(a, {offer});
                    p.scroll.el.appendChild(a);
                });
            }

            TweenMax.delayedCall(0.001, () => {
                let contentRequiredHeight = 350;
                let availableHeight0 = app.LAYOUT.getClientWHS0(80 + 80);
                let availableHeight = Math.min(contentRequiredHeight + 20, availableHeight0);
                let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

                p.els.brd.style.top = top + 'px';
                p.els.brd_r.style.height = availableHeight + 'px';
                p.els.wrap.style.height = (contentRequiredHeight + 20 - 20) + 'px';

                p.scroll.top = 0;
                p.scroll.topMax = availableHeight < contentRequiredHeight ? contentRequiredHeight - p.scroll.availableHeight : 0;
            });

            app.Popups.add(p);
        },

        createHelp(section) {
            let el = app.Utils.createDIV({class: 'help'});
            el.style.zIndex = app.Popups.getNextZIndex();
            el.onclick = function () {
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
                            p.els.popup.appendChild(header = app.Utils.createDIV({
                                class: 'header',
                                style: 'left: 90px; top: -25px',
                                text: header
                            }));
                        }

                        let createRewards = () => {
                            let el = app.Utils.createDIV({class: 'mlra', style: 'width: 300px'});
                            let rjCFG = app.Model.cfg.cfgBattlePath.rating.total.rewards;
                            rjCFG.forEach(function (entry, i) {
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
                                el_r.appendChild(el_record = app.Utils.createSPAN({
                                    class: 'str fll pt3 major',
                                    text: place
                                }));
                                let el_c = app.Utils.createDIV({class: 'flr'});
                                if (entry.dust) {
                                    el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_dust'}));
                                    el_c.appendChild(app.Utils.createText(app.Utils.toMoney1(entry.dust.min)));
                                }
                                if (entry.sd) {
                                    el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_dust_stone'}));
                                    el_c.appendChild(app.Utils.createText(app.Utils.toMoney1(entry.sd.min)));
                                }
                                if (entry.gold) {
                                    el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gold'}));
                                    el_c.appendChild(app.Utils.createText(app.Utils.toMoney1(entry.gold.min)));
                                }
                                if (entry.gems) {
                                    el_c.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gem'}));
                                    el_c.appendChild(app.Utils.createText(app.Utils.toMoney1(entry.gems.min)));
                                }
                                if (entry.card) {
                                    let min = entry.card.count.min;
                                    el_c.appendChild(app.Utils.createDIV({
                                        class: 'flr vm',
                                        html: '<span class="res_icon res_icon_inline res_card_q1"></span>{0}'.format(min)
                                    }));
                                }
                                el_r.appendChild(el_c);
                                el.appendChild(el_r);
                            });
                            return el;
                        };

                        if (!content) {
                            content = '{0}';
                        }

                        let el = createRewards();
                        p.scroll.el.appendChild(app.Utils.createDIV({style: 'width: 410px; margin: 10px;', html: content.format(el.innerHTML)}));

                        app.Popups.add(p);

                        TweenMax.delayedCall(0.001, function () {
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
        },

    getEventName() {
            switch (app.Model.user.battlePath.t) {
                case '14f': return 'Сезон любви';
                case '23f': return 'Сезон Защиты';
                case 'luck': return 'Сезон Удачи';
            }
        },

        getEventValueIMGClass0() {
            switch (app.Model.user.battlePath.t) {
                case '14f': return 'res_health';
                case '23f': return 'res_shield';
                case 'luck': return 'res_luck';
            }
        },

        getEventValueIMGClass1() {
            switch (app.Model.user.battlePath.t) {
                case '14f': return 'bp_curr_heart';
                case '23f': return 'bp_curr_sh';
                case 'luck': return 'bp_curr_luck';
            }
        },

        getCollectedLabel() {
            switch (app.Model.user.battlePath.t) {
                case '14f': return 'Собрано сердец';
                case '23f': return 'Собрано подков';
                case 'luck': return 'Собрано подков';
            }
        }
    };
}