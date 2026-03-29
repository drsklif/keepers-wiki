if (!app.GuildBlitzPage) {

    app.GuildBlitzPage = {
        create() {
            const p = app.Popups.createPopup1({
                id: 'GuildBlitz',
                display: {user: 0, guild_blitz: 1, gold: 1, gems: 1},
                onShow: function () {
                    const blitz = p.tmp.blitz;

                    // Отмечаем, что игрок открыл ЧГ, если это первое открытие
                    if (p.tmp.userEntry && p.tmp.userEntry.firstOpen) {
                        app.Network.command({cmd: 'GuildBlitzMarkOpened'}, data => {
                            if (data.error) {
                            } else {
                                // Обновляем локальное состояние
                                p.tmp.userEntry.firstOpen = false;
                            }
                        });
                    }

                    if (blitz.s === 'WAITING' || blitz.s === 'FINISHED') {

                        // удалить табу с заданиями, если она есть
                        let tab = p.tmp.tabs.removeByName('second');
                        if (tab) {
                            if (tab.el.parentNode) {
                                tab.el.parentNode.removeChild(tab.el);
                            }

                            // после удаления нужно подвигать табу с активностью
                            tab = p.tmp.tabs.getByName('third');
                            if (tab) {
                                tab.el.style.left = '136px';
                            }

                            // если активная таба была 'second', переключаемся на 'first'
                            if (p.tmp.tabs.active === 'second') {
                                p.tmp.tabs.active = 'first';
                            }
                        }

                    }
                    app.GuildBlitzPage.onTabClick(p, p.tmp.tabs.active);
                },
                onNewBlitzData(blitz) {
                    // Save scroll position before update
                    const savedScrollTop = p.scroll.top;
                    const activeTab = p.tmp.tabs.active;

                    p.tmp.updateBlitzData();
                    p.cfg.onShow();
                    app.GuildBlitzPage.updateTasksTabNotification(p);

                    // Restore scroll position after update
                    if (activeTab === 'second') {
                        TweenMax.delayedCall(0.002, function() {
                            p.scroll.top = savedScrollTop;
                            p.cfg.onScroll(0);
                        });
                    }
                },
                onScroll: function (deltaY) {
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
                },
                onUpdate: function () {
                },
                onClose: function () {
                    p.tmp._closed = 1;
                }
            });

            p.tmp = {};
            p.tmp.updateBlitzData = () => {
                p.tmp.blitz = app.Model.user.guildBlitz;

                p.tmp.guildEntry = p.tmp.blitz.id === -1
                    ? {}
                    : app.Model.user.guildBlitz.group.guilds.find(guildEntry => guildEntry.id === app.Model.user.guild.id);

                p.tmp.userEntry = p.tmp.blitz.id === -1
                    ? {}
                    : p.tmp.guildEntry.users.find(userEntry => userEntry.id === app.Model.user.id);
            };
            p.tmp.updateBlitzData();
            p.tmp.version = Math.random();

            // Определяем, какую вкладку показать при открытии
            let initialTab = 'first';
            if (p.tmp.blitz.id !== -1
                && p.tmp.userEntry
                && p.tmp.userEntry.firstOpen === false
                && p.tmp.blitz.s !== 'WAITING' && p.tmp.blitz.s !== 'FINISHED'
            ) {
                // Не первое открытие и челлендж активен - показываем вкладку заданий
                initialTab = 'second';
            }

            p.tmp.tabs = {
                active: initialTab,
                list: [],
                getActive() {
                    return this.getByName(this.active);
                },
                getByName(name) {
                    return this.list.find(tab => tab.name === name);
                },
                removeByName(name) {
                    const tab = this.getByName(name);
                    if (tab) {
                        this.list = this.list.filter(t => t.name !== name);
                        return tab;
                    }
                }
            };

            p.tmp.tabs.list.push({
                name: 'first',
                el: app.Utils.createA({
                    class: 'brd_block_tab',
                    style: 'left: 30px',
                    text: 'Рейтинг'
                }, this.onTabClick.bind(app.GuildBlitzPage, p, 'first'))
            });
            p.els.brd_r.appendChild(p.tmp.tabs.list[0].el);

            if (p.tmp.blitz.id !== -1 && p.tmp.blitz.s !== 'WAITING') {
                let el;
                const noob = !p.tmp.userEntry || app.GuildUtil.getEntry(app.Model.user.guild, app.Model.user.id).jt > p.tmp.blitz.st;
                if (!noob) {
                    p.tmp.tabs.list.push({
                        name: 'second',
                        el: el = app.Utils.createA({
                            class: 'brd_block_tab',
                            style: 'left: 136px',
                            text: 'Задания'
                        }, this.onTabClick.bind(app.GuildBlitzPage, p, 'second'))
                    });
                    p.els.brd_r.appendChild(el);
                }

                p.tmp.tabs.list.push({
                    name: 'third',
                    el: el = app.Utils.createA({
                        class: 'brd_block_tab',
                        style: 'left: {0}px'.format(noob ? 136 : 242),
                        text: 'Активность'
                    }, this.onTabClick.bind(app.GuildBlitzPage, p, 'third'))
                });
                p.els.brd_r.appendChild(el);
            }

            p.els.brd_r.appendChild(app.Utils.createHelpPopup('Guild_Blitz'));

            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + 76);
            const availableHeight = Math.min(availableHeight0, 628);
            let top = (availableHeight0 - availableHeight) / 2;
            top = Math.max(80, top);

            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';
            p.els.wrap.style.height = availableHeight + 'px';

            p.tmp.availableHeight = availableHeight;

            //p.scroll.el.style.top = '20px';
            //p.scroll.availableHeight = availableHeight;

            app.Popups.add(p);
            
            // Инициализируем notification для вкладки "Задания"
            this.updateTasksTabNotification(p);
        },

        updateTasksTabNotification(p) {
            // Получаем вкладку "Задания" по имени
            const tasksTab = p.tmp.tabs.getByName('second');
            if (!tasksTab) {
                return;
            }

            const blitz = app.Model.user.guildBlitz;
            const hasCompleted = blitz && blitz.s === 'RUNNING' && (app.UserUtil.canClaimGuildBlitzTask() || app.UserUtil.hasCompletedGuildBlitzChest());
            
            if (hasCompleted) {
                if (!tasksTab.note) {
                    tasksTab.el.appendChild(tasksTab.note = app.Utils.createSPAN({class: 'menu_note menu_note_g', style: 'right: -5px'}));
                }
            } else {
                if (tasksTab.note) {
                    if (tasksTab.note.parentNode) {
                        tasksTab.note.parentNode.removeChild(tasksTab.note);
                    }
                    delete tasksTab.note;
                }
            }
        },

        onTabClick(p, tabName) {
            const currentTab = p.tmp.tabs.getActive();
            const tab = p.tmp.tabs.list.find(tab => tab.name === tabName);
            p.tmp.tabs.active = tabName;

            app.Utils.removeClass(currentTab.el, 'brd_block_tab_active');
            app.Utils.addClass(tab.el, 'brd_block_tab_active');

            this.clearTab(p, currentTab);

            if (tabName === 'first') {
                p.els.brd_bg.className = 'brd_block_challenge_g_bg';
                this.createTabRating(p)
            } else if (tabName === 'second') {
                p.els.brd_bg.className = 'brd_block_camp_bg';
                this.createTabTasks(p);
            } else if (tabName === 'third') {
                p.els.brd_bg.className = 'brd_block_camp_bg';
                this.createTabActivity(p);
            }
        },

        clearTab(p, tab) {
            if (tab.tmp) {
                tab.tmp.forEach(el => {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                })
            }
        },

        createTabRating(p) {
            const currentTab = p.tmp.tabs.getActive();
            currentTab.tmp = [];

            const header = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Челлендж гильдий'});
            p.els.brd_r.appendChild(header);
            currentTab.tmp.push(header);

            {
                const cfg = this.createRightBlock(p);
                p.scroll.el.appendChild(cfg.el);
                currentTab.tmp.push(cfg.el);
            }

            if (p.tmp.blitz.id === -1 || p.tmp.blitz.s === 'WAITING') {
                let el;

                // Показываем условия участия
                p.scroll.el.appendChild(el = app.Utils.createDIV({
                    class: 'list_s cntr',
                    style: 'width: 200px; left: 230px; margin-top: 55px; padding: 10px;',
                    html: 'Доступ к недельному челленджу открывается только тем гильдиям, где хотя бы <span class="major">15 игроков</span> набрали <span class="major">500</span> тонуса за прошедшую неделю.'
                }));
                currentTab.tmp.push(el);
            } else {
                const guilds = p.tmp.blitz.group.guilds;

                const cfg = this.createGuildsList(p, guilds);
                p.scroll.el.appendChild(cfg.el);
                currentTab.tmp.push(cfg.el);
            }

            p.els.wrap.style.top = "";
            p.els.wrap.style.left = "";
            p.els.wrap.style.width = "";
            p.els.wrap_s.style.width = "";

            p.els.wrap.style.height = p.tmp.availableHeight + 'px';

            p.scroll.top = 0;
            delete p.scroll.topMax;
            delete p.scroll.topMin;
            p.cfg.onScroll(0);

            TweenMax.delayedCall(0.001, function() {
                const contentRequiredHeight = p.tmp.blitz.id === -1
                    ? 0
                    : p.tmp.blitz.group.guilds.length * (60 + 11);
                const availableHeight = Math.min(p.tmp.availableHeight, contentRequiredHeight + 10);

                p.els.brd.style.opacity = 1;

                p.scroll.availableHeight = availableHeight - 10;

                p.scroll.top = 0;
                p.scroll.topMax = 1;
                p.scroll.topMin = p.tmp.availableHeight < contentRequiredHeight
                    ? p.tmp.availableHeight - contentRequiredHeight
                    : 0;
            });
        },

        createTabTasks(p) {
            const currentTab = p.tmp.tabs.getActive();
            currentTab.tmp = [];

            const header = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Челлендж гильдий'});
            p.els.brd_r.appendChild(header);
            currentTab.tmp.push(header);

            // chest
            {
                const cfg = {};

                const chest = p.tmp.userEntry.chest;
                const progress = chest.p;
                const required = chest.r;
                const complete = progress >= required;

                cfg.el = app.Utils.createDIV({
                    class: 'list_s',
                    style: complete
                        ? 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 35px; min-height: 70px; background-color: #024e2b; border-color: #ffc549; cursor: pointer'
                        : 'position: relative; left: 76px; width: 310px; padding: 7px; margin-top: 35px; min-height: 70px'
                }, () => {

                    if (!complete) {
                        app.Utils.showInfo('Нужно выполнять задания челленджа');
                        return;
                    }

                    app.Network.command({cmd: 'GuildBlitzCompleteChest'}, data => {
                        if (data.error) {

                        } else {
                            app.UserUtil.processChestDrop(data.drop);
                            app.EventDispatcher.emit('show chest drop', {drop: data.drop});
                            app.EventDispatcher.emit('user resources changed');
                        }
                    })
                }, [
                    app.Utils.createDIV({class: 'quest_chest_prg'}, null, [
                        app.Utils.createDIV({class: 'quest_chest_prg_wrp'}, null, [
                            app.Utils.createDIV({class: 'quest_chest_prg_bg', style: 'width: {0}%'.format(app.Utils.toPRG(progress, required))}),
                            app.Utils.createDIV({class: 'quest_chest_prg_text', text: '{0} из {1}'.format(Math.min(progress, required), required)})
                        ])
                    ]),
                    app.Utils.createDIV({class: 'quest_chest'}),
                    app.Utils.createDIV({class: 'cntr', style: 'margin-left: 70px'}, null, [
                        app.Utils.createDIV({class: 'major big str', text: 'Сундук заданий'}),
                        app.Utils.createDIV({class: 'mt5', html: complete ? 'Можно открыть!' : '<div class="mt5">Количество <div class="res_icon res_icon_inline res_ch_g_active"></div> до награды:</div>:'})
                    ])
                ]);

                p.scroll.el.appendChild(cfg.el);
                currentTab.tmp.push(cfg.el)
            }

            // quest
            {
                const task = p.tmp.userEntry.task;
                if (!task) {
                    return
                }

                let el;
                p.scroll.el.appendChild(el = app.Utils.createDIV({class: 'major str cntr mt20', html: 'Ваше задание:'}));
                currentTab.tmp.push(el);

                const progress = task.p;
                const required = app.GuildBlitzUtil.getTaskRequired(p.tmp.userEntry);
                const complete = progress >= required;

                // goto or get reward
                let el_a_goto_or_get;
                if (complete) {
                    el_a_goto_or_get = app.Utils.createA({class: 'btn_g', style: 'top: 15px; left: 260px', html: 'Получить за 1<span class="res_icon res_icon_inline res_energy_p"></span>'}, () => {
                        if (app.Utils.hasClass(el_a_goto_or_get, 'bw')) {
                            return;
                        }

                        app.Utils.addClass(el_a_goto_or_get, 'bw');

                        app.Network.command({cmd: 'GuildBlitzCompleteTask'}, data => {
                            if (data.error) {
                                switch (data.error.code) {
                                    case 5: {
                                        app.Utils.showInfo('Недостаточно энергии');
                                        app.Utils.removeClass(el_a_goto_or_get, 'bw');
                                        break;
                                    }
                                }
                            } else {
                            }
                        });
                    });
                } else {
                    el_a_goto_or_get = app.Utils.createA({class: 'btn_g btn_gsm', style: 'top: 15px; left: 310px', text: 'Перейти'}, () => {
                        /*
                        if (!task.s) {
                            app.Utils.showInfo('Задание ещё не выполняется');
                            return;
                        }
                         */
                        app.GuildBlitzUtil.goto(p.tmp.userEntry);
                    });
                    /*
                    if (!task.s) {
                        app.Utils.addClass(el_a_goto_or_get, 'bw');
                    }
                     */
                }

                p.scroll.el.appendChild(el = app.Utils.createDIV({
                    class: 'quest_row mlra_ab mt5',
                    style: 'width: 400px; position: relative'
                }, null, [
                    el_a_goto_or_get,
                    app.Utils.createA({class: 'mail_top_r mail_top_rw', style: 'margin-left: 5px; margin-right: 150px;'}, null, [
                        app.Utils.createDIV({class: 'mt5 info dbl', text: app.GuildBlitzUtil.getTaskDescription(p.tmp.userEntry)}),
                        app.Utils.createDIV({class: 'log_dmg', style: 'margin-top: 5px; margin-bottom: 5px'}, null, [
                            app.Utils.createDIV({class: 'log_dmg_prg', style: 'width: {0}%'.format(app.Utils.toPRG(progress, required))}),
                            app.Utils.createDIV({class: 'log_dmg_patch'}),
                            app.Utils.createDIV({class: 'log_dmg_text', text: '{0}/{1}'.format(progress, required)}),
                        ]),
                        app.Utils.createDIV({
                            class: 'mtb5',
                            style: 'min-height: 20px',
                            text: 'Награда: '
                        }, null, [
                            this.createTaskReward(app.GuildBlitzUtil.getTaskReward(p.tmp.userEntry)).el
                        ])
                    ])
                ]));

                /*
                let el_a_start, el_after_a_start_hr, el_after_a_start_or;
                if (!task.s) {
                    el.appendChild(el_a_start = app.Utils.createA({
                        class: 'btn_g  mlra_ab mt10',
                        html: 'Выполнять за <span class="res_icon res_icon_inline res_energy_p"></span>1'
                    }, () => {
                        if (app.Utils.hasClass(el_a_start, 'bw')) {
                            return;
                        }

                        const userEntry = app.GuildBlitzUtil.getUserEntry();
                        if (userEntry.e.v < 1) {
                            app.Utils.showInfo('Недостаточно энергии');
                            return;
                        }

                        app.Utils.addClass(el_a_start, 'bw');

                        app.Network.command({cmd: 'GuildBlitzStartTask'}, data => {
                            let remove = false;
                            if (data.error) {
                                switch (data.error.code) {
                                    case 3: {
                                        app.Utils.showInfo('Турнир еще не начался');
                                        app.Utils.removeClass(el_a_start, 'bw');
                                        break;
                                    }

                                    // already started
                                    case 4: {
                                        remove = true;
                                        break;
                                    }
                                    case 5: {
                                        app.Utils.showInfo('Недостаточно энергии');
                                        app.Utils.removeClass(el_a_start, 'bw');
                                        break;
                                    }
                                    default: {
                                        app.Utils.removeClass(el_a_start, 'bw');
                                        break;
                                    }
                                }
                            } else {
                                remove = true;
                            }

                            if (remove) {
                                app.Utils.removeClass(el_a_goto_or_get, 'bw');

                                el_a_start.parentNode.removeChild(el_a_start);
                                el_a_start = undefined;
                                el_after_a_start_hr.parentNode.removeChild(el_after_a_start_hr);
                                el_after_a_start_hr = undefined;
                                el_after_a_start_or.parentNode.removeChild(el_after_a_start_or);
                                el_after_a_start_or = undefined;
                            }
                        });
                    }));
                    el.appendChild(el_after_a_start_hr = app.Utils.createDIV({class: 'hr mt20 mb10', style: 'margin-top: 60px'}));
                    el.appendChild(el_after_a_start_or = app.Utils.createDIV({class: 'cntr mt20', text: 'Или'}));
                }
                 */

                const taskSkipPrice = app.GuildBlitzUtil.getBaseTaskSkipPrice(task.id)
                const isFreeSkip = (p.tmp.userEntry.dtsc || 0) === 0;

                const el_a_skip = el.appendChild(app.Utils.createA({
                    class: 'btn_g  mlra_ab mt10',
                    html: isFreeSkip
                        ? 'Пропустить'
                        : 'Пропустить за <span class="res_icon res_icon_inline res_gem"></span>' + taskSkipPrice.v
                }, () => {
                    if (app.Utils.hasClass(el_a_skip, 'bw')) {
                        app.Utils.showInfo('Забирай награду :)', {type: 0})
                        return;
                    }

                    const confirmText = isFreeSkip
                        ? 'Пропустить задание бесплатно?'
                        : 'Точно пропустить задание за <span class="res_icon res_icon_inline res_gem"></span>{0} ?'.format(taskSkipPrice.v);

                    app.Popups.createConfirm({
                        continueShowingPrevious: 1,
                        centerText: confirmText
                    }, () => {
                        app.Network.command({cmd: 'GuildBlitzSkipTask'}, data => {
                            if (data.error) {
                                switch (data.error.code) {
                                    case 3: {
                                        app.Utils.showInfo('Турнир еще не начался');
                                        break;
                                    }
                                    case 5001: {
                                        app.Utils.processErrors(data.error);
                                        break;
                                    }
                                }
                            } else {
                                app.Utils.showInfo('Задание пропущено', {type: 0});
                            }
                        });
                    }, () => { });

                }));
                if (complete) {
                    app.Utils.addClass(el_a_skip, 'bw');
                }

                currentTab.tmp.push(el)
            }

            // ========== Коллективные задания ==========
            const guildEntry = p.tmp.guildEntry;
            if (guildEntry && guildEntry.ct) {
                let el;

                // Заголовок секции
                p.scroll.el.appendChild(el = app.Utils.createDIV({
                    class: 'header_hr',
                    style: 'position: relative; margin-top: 70px;'
                }, null, [
                    app.Utils.createSPAN({text: 'Общие задания:'})
                ]));
                currentTab.tmp.push(el);

                const collectiveTasks = guildEntry.ct;
                const taskTypes = [
                    {key: 'energy', name: 'Заработать вместе тонус', icon: 'res_energy_p'},
                    {key: 'dust', name: 'Получить или потратить рунную пыль', icon: 'res_dust'},
                    {key: 'stoneDust', name: 'Получить или потратить каменную пыль', icon: 'res_stone_dust'},
                    {key: 'gems', name: 'Получить или потратить кристаллы', icon: 'res_gem'}
                ];

                taskTypes.forEach((taskType, idx) => {
                    const task = collectiveTasks[taskType.key];
                    if (!task) return;

                    // Проверяем, все ли этапы выполнены
                    const allCompleted = task.cs === 10 && task.sc && task.sc[9];
                    const currentStage = task.cs || 1;
                    const currentProgress = task.cp || 0;

                    // Получаем данные из конфига
                    const stageRequired = app.GuildBlitzUtil.getCollectiveTaskStageRequirement(task.t, currentStage);
                    const stageReward = app.GuildBlitzUtil.getCollectiveTaskStageReward(task.t, currentStage);

                    // Подсчитываем общее количество полученных очков за ВЫПОЛНЕННЫЕ этапы
                    // Если мы на 1 этапе и он не завершен, значит еще ничего не получили
                    let totalPointsEarned = 0;
                    if (task.sc) {
                        for (let i = 0; i < currentStage; i++) {
                            if (task.sc[i]) {
                                totalPointsEarned += app.GuildBlitzUtil.getCollectiveTaskStageReward(task.t, i + 1);
                            }
                        }
                    }

                    p.scroll.el.appendChild(el = app.Utils.createDIV({
                        class: 'quest_row mlra_ab',
                        style: 'width: 400px;'
                    }, null, [
                        // Показываем награду или общее количество полученных очков
                        app.Utils.createSPAN({
                            class: 'dbl',
                            style: 'position: absolute; top: 15px; left: 320px;',
                            html: 'Получено:<br><span class="res_icon res_icon_inline res_ch_g_active" style="transform: scale(0.5); margin-left: -10px; margin-right: -10px;"></span> ' + app.Utils.toMoney(totalPointsEarned)
                        }),
                        app.Utils.createA({
                            class: 'mail_top_r mail_top_rw',
                            style: 'margin-left: 5px;'
                        }, null, [
                            app.Utils.createSPAN({
                                class: 'mt5 info dbl',
                                text: task.t === 'ENERGY_SPENT'
                                    ? 'Заработать вместе ' + app.Utils.toMoney1(stageRequired) + ' тонуса'
                                    : task.t === 'DUST_TOTAL'
                                        ? 'Получить или потратить вместе ' + app.Utils.toMoney1(stageRequired) + ' рунной пыли'
                                        : task.t === 'STONE_DUST_TOTAL'
                                            ? 'Получить или потратить вместе ' + app.Utils.toMoney1(stageRequired) + ' каменной пыли'
                                            : 'Получить или потратить вместе ' + app.Utils.toMoney1(stageRequired) + ' кристаллов'
                            }),
                            app.Utils.createDIV({class: 'log_dmg', style: 'margin-top: 5px; margin-bottom: 5px;'}, null, [
                                app.Utils.createDIV({
                                    class: 'log_dmg_prg',
                                    style: 'width: {0}%'.format(stageRequired > 0 ? app.Utils.toPRG(currentProgress, stageRequired) : 100)
                                }),
                                app.Utils.createDIV({class: 'log_dmg_patch'}),
                                app.Utils.createDIV({
                                    class: 'log_dmg_text',
                                    text: '{0}/{1}'.format(app.Utils.toMoney(Math.min(currentProgress, stageRequired)), app.Utils.toMoney1(stageRequired))
                                })
                            ]),
                            app.Utils.createSPAN({
                                class: 'mtb5',
                                style: 'min-height: 20px;',
                                html: 'Награда за этап: <span class="res_icon res_icon_inline res_ch_g_active" style="transform: scale(0.5); margin-left: -10px; margin-right: -10px;"></span> ' + stageReward
                            }),
                            // 10-stage indicator
                            app.Utils.createDIV({style: 'position: relative; height: 20px; margin-top: 10px;'}, null,
                                (() => {
                                    const stages = [];
                                    for (let i = 0; i < 10; i++) {
                                        const completed = task.sc && task.sc[i];
                                        stages.push(app.Utils.createDIV({
                                            class: 'menu_note' + (completed ? ' menu_note_g' : ''),
                                            style: 'left: {0}px'.format(22 * i)
                                        }));
                                    }
                                    return stages;
                                })()
                            )
                        ])
                    ]));
                    currentTab.tmp.push(el);

                    // Добавляем разделитель после каждого задания, кроме последнего
                    if (idx < taskTypes.length - 1) {
                        p.scroll.el.appendChild(el = app.Utils.createDIV({class: 'hr mtb5'}));
                        currentTab.tmp.push(el);
                    }
                });
            }

            p.els.wrap.style.top = "";
            p.els.wrap.style.left = "";
            p.els.wrap.style.width = "";
            p.els.wrap_s.style.width = "";

            p.els.wrap.style.height = p.tmp.availableHeight + 'px';

            p.scroll.top = 0;
            p.scroll.topMax = 1;

            TweenMax.delayedCall(0.001, function() {
                let contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);

                p.scroll.topMin = contentRequiredHeight > p.tmp.availableHeight
                    ? p.tmp.availableHeight - contentRequiredHeight
                    : 0;

                p.cfg.onScroll(0);
            });
        },

        createTaskReward(reward) {
            const cfg = {};

            cfg.el = app.Utils.createSPAN({}, null);
            this.createRewardInfoBlockToParentNode(cfg.el, reward);

            return cfg;
        },

        createTabActivity(p) {
            const currentTab = p.tmp.tabs.getActive();
            currentTab.tmp = [];

            const header = app.Utils.createDIV({class: 'header', style: 'left: 115px; top: 0px', text: 'Рейтинг активности'});
            p.els.brd_r.appendChild(header);
            currentTab.tmp.push(header);

            const guildEntry = p.tmp.guildEntry;

            // me top block
            {
                let el;

                const blitz = p.tmp.blitz;

                let userEntry = p.tmp.userEntry || {p: 0, place: 0}

                let place = userEntry.place;

                // если не набран минимум
                // или есть новичок
                // новичком может быть и тот, кто участвовал, потом вышел, и снова зашел
                if (userEntry.p < app.GuildBlitzUtil.MINIMUM
                    || app.GuildUtil.getEntry(app.Model.user.guild, app.Model.user.id).jt > blitz.st) {
                    place = 0;
                }

                const avatar = app.Utils.createAvatarComponent(app.Model.user.rank, app.Model.user.avatar.img);
                avatar.els.main.style = 'transform: scale(0.7); left: 80px; top: 5px';
                p.els.brd_r.appendChild(el = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; left: 25px; top: 40px; width: 415px; padding: 5px; height: 55px;'}, null, [
                    app.Utils.createDIV({class: 'rating_top_p rating_top_m'}, null, [
                        app.Utils.createSPAN({class: 'normal', style: 'font-size: 12px; white-space: nowrap;', text: 'Моё место'}),
                        app.Utils.createDIV({text: place === 0 ? '?' : place})
                    ]),
                    avatar.els.main,
                    app.Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 130px; padding-top: 5px;'}, null, [
                        app.Utils.createA({class: 'major str tdn', text: app.UserUtil.getUserNameUpper0(app.Model.user.name)}),
                        app.Utils.createDIV({class: 'clr'}),
                        app.Utils.createDIV({class: 'mt10 dbl fll', text: 'Активность:'}),
                        app.Utils.createSPAN({class: 'flr mt10'}, null, [
                            app.Utils.createSPAN({
                                class: 'res_icon res_icon_inline res_ch_g_active',
                                style: 'transform: scale(0.5); margin-left: -10px; margin-right: -10px'
                            }),
                            app.Utils.createText(' ' + userEntry.p)
                        ])
                    ])
                ]));
                currentTab.tmp.push(el);
            }


            // списки участников

            const participants = [];
            const participantsBelowMinimum = [];
            const noobs = [];

            {
                const blitz = p.tmp.blitz;
                const guildEntry = p.tmp.guildEntry;
                const guild = app.Model.user.guild;

                // Backend уже отсортировал пользователей по очкам и времени, и присвоил им места
                // Итерируемся по отсортированному списку guildEntry.users
                for (let i = 0; i < guildEntry.users.length; i++) {
                    const userEntry = guildEntry.users[i];
                    
                    // Находим дополнительные данные пользователя из guild.e
                    const guildMember = guild.e.find(e => e.u.id === userEntry.id);
                    if (!guildMember) {
                        continue; // Игрок покинул гильдию
                    }

                    const userData = {
                        id: userEntry.id,
                        avatar: userEntry.a,
                        name: userEntry.n,
                        rank: userEntry.r,
                        points: userEntry.p,
                        place: userEntry.place,
                    };

                    if (guildMember.jt > blitz.st) {
                        noobs.push(userData);
                    } else {
                        if (userEntry.p < app.GuildBlitzUtil.MINIMUM) {
                            participantsBelowMinimum.push(userData);
                        } else {
                            participants.push(userData);
                        }
                    }
                }

                // Зануляем места для отображения "?" вместо цифр
                participantsBelowMinimum.forEach(p => p.place = 0);
                noobs.forEach(p => p.place = 0);

                const createList = (list) => {
                    let el;

                    list.forEach((entry, idx) => {
                        const avatar = app.Utils.createAvatarComponent(entry.rank, entry.avatar);
                        avatar.els.main.style = 'transform: scale(0.5); left: 40px';

                        p.scroll.el.appendChild(el = app.Utils.createDIV({class: 'rating_row'}, null, [
                            entry.place === 0
                                ? app.Utils.createDIV({class: 'rating_top_p', text: '?'})
                                : entry.place >= 1 && entry.place <= 3
                                    ? app.Utils.createDIV({class: 'rating_top_p rating_top_p' + entry.place})
                                    : app.Utils.createDIV({class: 'rating_top_p', text: entry.place}),
                            avatar.els.main,
                            app.Utils.createDIV({class: 'rating_row_r'}, null, [
                                app.Utils.createA({class: 'major str tdn', text: app.UserUtil.getUserNameUpper0(entry.name)}),
                                app.Utils.createDIV({class: 'clr'}),
                                app.Utils.createDIV({class: 'mt5 dbl fll', text: 'Активность:'}),
                                app.Utils.createDIV({class: 'flr mt5'}, null, [
                                    app.Utils.createDIV({class: 'res_icon res_icon_inline res_ch_g_active', style: 'transform: scale(0.5); margin-left: -10px; margin-right: -10px;'}),
                                    app.Utils.createText(' ' + entry.points)
                                ])
                            ])
                        ]));
                        currentTab.tmp.push(el);

                        if (idx < list.length - 1) {
                            p.scroll.el.appendChild(el = app.Utils.createDIV({class: 'hr mtb5'}));
                            currentTab.tmp.push(el);
                        }
                    });
                }

                if (participants.length > 0) {
                    createList(participants);
                }
                if (participantsBelowMinimum.length > 0) {
                    let el;
                    p.scroll.el.appendChild(el = app.Utils.createDIV({class: 'header_hr', style: 'position: relative;'}, null, [
                        app.Utils.createSPAN({text: 'Не набран минимум (10):'})
                    ]));
                    currentTab.tmp.push(el);
                    createList(participantsBelowMinimum);
                }
                if (noobs.length > 0) {
                    let el;
                    p.scroll.el.appendChild(el = app.Utils.createDIV({class: 'header_hr', style: 'position: relative;'}, null, [
                        app.Utils.createSPAN({text: 'Новички гильдии:'})
                    ]));
                    currentTab.tmp.push(el);
                    createList(noobs);
                }
            }


            p.els.wrap.style.top = '120px';
            p.els.wrap.style.left = '30px';
            p.els.wrap.style.height = (p.tmp.availableHeight - 120) + 'px';
            p.els.wrap.style.width = '420px';
            p.els.wrap_s.style.width = '420px';

            p.scroll.top = 0;
            p.scroll.topMax = 1;

            TweenMax.delayedCall(0.001, function() {
                let contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                contentRequiredHeight += 125;

                p.scroll.topMin = contentRequiredHeight > p.tmp.availableHeight
                    ? p.tmp.availableHeight - contentRequiredHeight
                    : 0;

                console.log(p.scroll);
                console.log('contentRequiredHeight', contentRequiredHeight)
                console.log('p.tmp.availableHeight', p.tmp.availableHeight)

                p.cfg.onScroll(0);
            });

            p.cfg.onScroll(0);
        },

        createRightBlock(p) {
            const cfg = {};

            cfg.el = app.Utils.createDIV({});
            cfg.el.appendChild(this.createMyGuildEmblem().el);
            cfg.el.appendChild(this.createMyGuildInfo(p).el);

            return cfg;
        },

        createGuildsList(p, guildEntries) {
            const cfg = {};

            cfg.el = app.Utils.createDIV({});
            guildEntries.forEach((guildEntry, idx) => {
                cfg.el.appendChild(this.createGuildListEntry(p, guildEntry, idx).el);
            });

            return cfg;
        },

        createGuildListEntry(p, guildEntry, idx) {
            const cfg = {};

            cfg.el = app.Utils.createDIV({
                class: 'list_s',
                style: 'width: 220px; height: 55px; left: 230px; margin-top: {0}px'.format(idx === 0 ? 35 : 10)
            }, null, [
                app.Utils.createDIV({class: 'slot_info'}, null, [
                    app.Utils.createDIV({class: 'str major', text: app.GuildUtil.getUpperName(guildEntry.n)}),
                    app.Utils.createDIV({
                        class: 'w115',
                        html: 'Место: <span class="info">{0}</span>'.format(guildEntry.place === 0 ? '?' : guildEntry.place)
                    }),
                    app.Utils.createDIV({
                        class: 'w170',
                        html: 'Активность: <div class="res_icon res_icon_inline res_ch_g_active"></div><span class="info">{0}</span>'.format(guildEntry.p)
                    })
                ]),
                app.Utils.createA({class: 'guild_info_l', style:'transform: scale(0.31); left: 5px; top: 10px'}, null, [
                    app.Utils.createIMG0(app.IMAGES.getPath(guildEntry.a), {w: 96, h: 96}),
                    app.Utils.createDIV({class: 'guild_info_l_brd guild_rank_bronze'})
                ])
            ]);

            return cfg;
        },

        createMyGuildEmblem() {
            const guild = app.Model.user.guild;

            const cfg = {};

            cfg.el = app.Utils.createDIV({class: 'guild_info'}, null, [
                app.Utils.createA({class: 'guild_info_l'}, null, [
                    app.Utils.createIMG0(app.IMAGES.getPath(guild.avatar.img), {w: 96, h: 96})
                ]),
                app.Utils.createDIV({class: 'guild_info_l_brd guild_rank_bronze'}),
                app.Utils.createDIV({class: 'guild_title'}, null, [
                    app.Utils.createDIV({class: 'guild_title_text', text: app.GuildUtil.getUpperName(guild.name)})
                ])
            ]);

            return cfg;
        },

        createMyGuildInfo(p) {
            const cfg = {};

            const blitz = p.tmp.blitz;
            const place = p.tmp.guildEntry.place;
            const totalGuilds = p.tmp.blitz.id === -1
                ? 0
                : blitz.group.guilds.length;

            cfg.el = app.Utils.createDIV({class: 'arena_info'}, null, [
                p.tmp.blitz.id === -1
                    ? app.Utils.createDIV({class: 'mt5 str', text: 'Гильдия не участвует в челлендже'})
                    : blitz.s === 'WAITING'
                        ? app.Utils.createDIV({})
                        : app.Utils.createDIV({
                            class: 'mt5 str',
                            html: 'Наше место: <span class="info">{0}</span> из <span class="info">{1}</span>'.format(place === 0 ? '?' : place, totalGuilds)
                        }),
                app.Utils.createDIV({class: 'hr mt5', style: 'background-size: 200px 1px'}),
                cfg.tl = app.Utils.createDIV({class: 'mt10', html: ''}),
                app.Utils.createDIV({class: 'hr mt5', style: 'background-size: 200px 1px'}),
                p.tmp.blitz.id === -1
                    ? app.Utils.createDIV({})
                    : app.Utils.createDIV({
                        class: 'mt10',
                        html: place === 0
                                ? 'Выполняйте задания, чтобы получить очки активности и побороться за ценные призы'
                                : 'Текущий приз ({0} место):<br>'.format(place)
                    }),
                p.tmp.blitz.id === -1 || place === 0
                    ? app.Utils.createDIV({})
                    : this.creteRewardInfo(place).el
            ]);

            if (place > 0 && place !== 1 && blitz.s !== 'FINISHED') {
                cfg.el.appendChild(app.Utils.createDIV({
                    class: 'hr mt5',
                    style: 'background-size: 200px 1px; position: relative; padding: 5px 0px',
                    html: '<span class="craft_arr craft_arr_done" style="display: block; position: absolute; transform: scale(-1); transform-origin: center center; left: 91px; top: -5px;"></span>'
                }));
                cfg.el.appendChild(this.creteRewardInfo(place - 1).el);
            }

            cfg.el.appendChild(app.Utils.createA({class: 'btn_g btn_gs mt10', style: 'position: relative; margin-left: auto;margin-right: auto', text: 'Все призы'}, this.showAllRewards));
            cfg.el.appendChild(app.Utils.createDIV({class: 'hr mt5', style: 'background-size: 200px 1px'}));

            const v = p.tmp.version;
            const update = () => {
                if (p.tmp._closed || p.tmp.version !== v) {
                    return;
                }

                if (blitz.s === 'FINISHED') {
                    cfg.tl.innerHTML = 'Челлендж гильдий:<br /><span class="info">завершен</span>';
                    return;
                }

                if (blitz.s === 'WAITING') {
                    let timeUntilStart = p.tmp.blitz.st - app.TimeUtil.now();
                    if (timeUntilStart < 0) {
                        timeUntilStart = '< 0';
                    }
                    cfg.tl.innerHTML = 'До начала челленджа:<br /><span class="info">{0}</span>'.format(app.TimeUtil.formatToHumanTime(timeUntilStart, 3));
                    TweenMax.delayedCall(1, update);
                    return;
                }

                let timeLeft = p.tmp.blitz.et - app.TimeUtil.now();
                if (timeLeft < 0) {
                    timeLeft = '< 0';
                }
                cfg.tl.innerHTML = 'До конца челленджа:<br /><span class="info">{0}</span>'.format(app.TimeUtil.formatToHumanTime(timeLeft, 3));

                TweenMax.delayedCall(1, update);
            };
            update()

            return cfg;
        },

        creteRewardInfo(place) {
            const cfg = {};

            cfg.el = app.Utils.createDIV({});

            const reward = this.getEventRewardForPlace(place);
            this.createRewardInfoBlockToParentNode(cfg.el, reward);

            return cfg;
        },

        getEventRewardForPlace(place) {
            const cfg = app.CFGUtil.getGuildBlitzCFG();
            const rewardsCFG = cfg.rewards.event.list;

            if (place > 0) {
                for (let reward of rewardsCFG) {
                    if (place <= reward.p) {
                        return reward;
                    }
                }
            }

            return rewardsCFG[rewardsCFG.length - 1];
        },

        showEnergyShop() {
            const blitz = app.Model.user.guildBlitz;
            if (!blitz) {
                return
            }

            const p = app.Popups.createPopup({
                display: {user: 0, guild_blitz: 1, gold: 1, gems: 1},
                onClose() {
                    p.tmp._closed = 1;
                }
            });

            const cfgGuildBlitz = app.CFGUtil.getGuildBlitzCFG();

            p.tmp = {};
            p.tmp.updateBlitzData = () => {
                const userEntry = app.GuildBlitzUtil.getUserEntry();

                if (userEntry) {
                    p.tmp.energy = {
                        v: userEntry.e.v,
                        max: userEntry.e.m || cfgGuildBlitz.energy.max.def,
                        nrt: userEntry.e.nrt || 0,
                        bp: userEntry.e.bp,
                        dbc: userEntry.e.dbc
                    };
                } else {
                    p.tmp.energy = {
                        v: 0,
                        max: cfgGuildBlitz.energy.max.def,
                        nrt: 0
                    };
                }
            };
            p.tmp.updateBlitzData();

            p.els.popup.style.opacity = 1;
            p.els.popup.style.width = '330px';
            p.els.popup.style.height = '100px';
            p.els.popup.style.top = '120px';
            if (app.Utils.isMobile()) {
                p.els.popup.style.transform = 'scale(1.25)';
                p.els.popup.style.transformOrigin = 'center top';
            }

            p.els.popup.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 40px; top: -25px', text: 'Энергия'}));

            const el = app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 20px'});
            el.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_energy_p'}));
            el.appendChild(p.els.energy_v = app.Utils.createSPAN({text: p.tmp.energy.v}));
            el.appendChild(app.Utils.createText(' из '));
            el.appendChild(p.els.energy_max = app.Utils.createSPAN({text: p.tmp.energy.max}));
            p.tmp.updateEnergyData = () => {
                p.els.energy_v.innerText = p.tmp.energy.v;
                p.els.energy_max.innerText = p.tmp.energy.max;
                p.els.energy_max.className = app.UserUtil.isPremiumActive() ? 'info' : '';
                p.els.energy_v.className = p.tmp.energy.v > p.tmp.energy.max ? 'red' : 'info';
            };
            p.tmp.updateEnergyData();
            p.els.popup.appendChild(el);

            if (p.tmp.energy.nrt) {
                p.els.popup.appendChild(p.els.restore = app.Utils.createDIV({class: 'battle_advice', style: 'width: 330px; top: 45px'}));

                let start = app.TimeUtil.now();
                const update = () => {
                    if (p.tmp._closed) {
                        return;
                    }

                    const userEntry = app.GuildBlitzUtil.getUserEntry();
                    if (!userEntry) {
                        return;
                    }

                    if (userEntry.e.v !== p.tmp.energy.v) {
                        p.tmp.updateBlitzData();
                        p.tmp.updateEnergyData();

                        if (!userEntry.e.nrt) {
                            if (p.els.restore.parentNode) {
                                p.els.restore.parentNode.removeChild(p.els.restore);
                            }
                            return;
                        }

                        start = app.TimeUtil.now();
                        TweenMax.delayedCall(0.01, update);
                        return;
                    }

                    let timeLeft = p.tmp.energy.nrt - (app.TimeUtil.now() - start);
                    if (timeLeft < 0) {
                        timeLeft = '< 0';
                    }
                    p.els.restore.innerText = '+1 через {0}'.format(app.TimeUtil.formatToHumanTime(timeLeft, 2));

                    if (timeLeft < 0) {
                        p.tmp.updateBlitzData();
                        p.tmp.updateEnergyData();
                        start = app.TimeUtil.now();
                        TweenMax.delayedCall(2, update);
                    } else {
                        TweenMax.delayedCall(0.5, update);
                    }
                };
                update();
            }

            // Add premium info block first
            let premiumBlockHeight = 0;
            if (p.tmp.energy.max !== cfgGuildBlitz.energy.max.premium) {
                p.els.popup.appendChild(app.Utils.createDIV({
                    class: 'battle_advice info',
                    style: 'width: 330px; top: 75px',
                    html: '+2<span class="res_icon res_icon_inline res_energy_p"></span> к максимуму при активном премиуме'
                }));
                premiumBlockHeight = 30; // Height of premium info block
            }

            // Add energy purchase button when energy is 0
            if (p.tmp.energy.v === 0) {
                const topPosition = 75 + premiumBlockHeight + 10; // After premium block + margin
                const buttonTopPosition = topPosition + 30; // Button below the text

                p.els.popup.appendChild(app.Utils.createDIV({class: 'hr', style: `width: 330px; position: absolute; top: ${topPosition - 5}px; left: 0px`}));

                const div = app.Utils.createDIV({class: 'battle_advice', style: `width: 330px; top: ${topPosition}px`});
                div.appendChild(app.Utils.createText('Купить'));
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_energy_p'}));
                div.appendChild(app.Utils.createText(cfgGuildBlitz.energy.max.def + '?'));
                p.els.popup.appendChild(div);

                // Use dynamic price from server (progressive daily pricing)
                console.log('p.tmp.energy', p.tmp.energy);
                const price = {t: 1, v: p.tmp.energy.bp || 250};
                let a;
                p.els.popup.appendChild(a = app.Utils.createPriceA(price, {class: 'btn_g btn_gs_c', style: `left: 107px; top: ${buttonTopPosition}px`}, function() {
                    if (!app.UserUtil.canPay(price)) {
                        app.EventDispatcher.emit('not enough resources', {price: price});
                        return;
                    }
                    if (app.Utils.hasClass(a, 'bw')) {
                        app.Utils.showInfo('В процессе');
                        return;
                    }
                    app.Utils.addClass(a, 'bw');
                    app.Network.command({cmd: 'GuildBlitzEnergyBuy'}, function(data) {
                        if (!p) return;
                        if (data.error) {
                            switch (data.error.code) {
                                case 4: {
                                    app.Utils.showInfo('Максимальное колво покупок в день: 3');
                                    break;
                                }
                                default: {
                                    app.Utils.showInfo('Попробуйте позже');
                                    break;
                                }
                            }
                            app.Utils.removeClass(a, 'bw');
                        } else {
                            app.Popups.removePopup(p);
                        }
                    });
                }));

                // Adjust popup height to accommodate all elements
                const totalHeight = Math.max(150, buttonTopPosition + 40);
                p.els.popup.style.height = totalHeight + 'px';
            }

            app.Popups.add(p);
        },

        showAllRewards() {
            const p = app.Popups.createPopup({});

            p.els.popup.style.width = '300px';
            p.els.popup.style.height = '450px';
            p.els.popup.style.left = (480 - 300) / 2 + 'px';
            p.els.popup.style.opacity = 0;

            p.els.popup.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 25px; top: -25px;', text: 'Возможные призы'}));
            p.els.popup.appendChild(app.Utils.createDIV({style: 'margin-top: 15px'}));

            const cfg = app.CFGUtil.getGuildBlitzCFG();
            const rewardsCFG = cfg.rewards.event.list;

            const lastReward = rewardsCFG[rewardsCFG.length - 1];

            rewardsCFG.forEach((entry, i) => {
                let place;
                if (entry.p >= 1 && entry.p <= 3) {
                    place = entry.p + ' место';
                } else if (entry.p > 3) {
                    place = entry.p;

                    const prev = rewardsCFG[i - 1];
                    if (entry.p !== prev.p + 1) {
                        place = (prev.p + 1) + ' - ' + place;
                    } else if (entry === lastReward) {
                        place += '+';
                    }

                    place += ' место';
                } else if (entry.p === -1) {
                    place = 'Остальные';
                }

                const el_r = app.Utils.createDIV({class: 'rewards_row'});
                el_r.appendChild(app.Utils.createSPAN({class: 'str fll pt3 major', text: place}));

                const el_c = app.Utils.createDIV({class: 'flr'});
                app.GuildBlitzPage.createRewardInfoBlockToParentNode(el_c, entry);

                el_r.appendChild(el_c);
                p.els.popup.appendChild(el_r);
            });

            p.els.popup.appendChild(app.Utils.createA({class: 'btn_g btn_gs', style: 'left: 92px; top: 410px', text: 'Ok'}, ()=> {
                app.Popups.removeLast();
            }));

            app.Popups.add(p);

            TweenMax.delayedCall(0.001, function() {
                const availableHeight0 = app.LAYOUT.getClientWHS0(80 + 76);
                const contentRequiredHeight = 450;
                const availableHeight = Math.min(contentRequiredHeight, availableHeight0);

                let top;
                if (app.Utils.isMobile()) {
                    top = (availableHeight0 - availableHeight) / 2;
                    top = Math.max(80, top);
                } else {
                    top = 80;
                }

                p.els.popup.style.opacity = 1;
                p.els.popup.style.top = top + 'px';
            });
        },

        createRewardInfoBlockToParentNode(node, reward) {
            if (reward.gbp) {
                node.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_ch_g_active'}));
                node.appendChild(app.Utils.createText(app.Utils.toMoney1(reward.gbp)));
            }
            if (reward.gs) {
                node.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_boss'}));
                node.appendChild(app.Utils.createText(app.Utils.toMoney1(reward.gs)));
            }
            if (reward.roulette) {
                node.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_wheel'}));
                node.appendChild(app.Utils.createText(reward.roulette));
            }
            if (reward.dust) {
                node.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_dust'}));
                node.appendChild(app.Utils.createText(reward.dust));
            }
            if (reward.tickets) {
                node.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_raid'}));
                node.appendChild(app.Utils.createText(reward.tickets));
            }
            if (reward.gold) {
                node.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gold'}));
                node.appendChild(app.Utils.createText(reward.gold));
            }
            if (reward.gems) {
                node.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gem'}));
                node.appendChild(app.Utils.createText(reward.gems));
            }
        }
    };
}