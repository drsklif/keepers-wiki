app.EventUtil = (function() {
    return {
        PROCESS_EVENT: function(event) {
            //console.log(event.type, event);

            switch (event.type) {
                case 'GAME_MESSAGE':
                    app.Utils.showInfo(event.message, {top: 200, type: 0});
                    break;

                case 'PAYMENT': {
                    let drop = event.offer.drop;
                    app.Chests.showDrop(drop);
                    app.UserUtil.processChestDrop(drop);
                    app.EventDispatcher.emit('user resources changed');
                    break;
                }

                case 'RESTART': {
                    app.MainPage.showRestart(event.tl);
                    break;
                }

                case 'UPDATE': {
                    if (event.user) {
                        app.EventDispatcher.emit('UPDATE_USER_DATA', event.user);
                        const p = app.Popups.getLast();
                        if (p && p.cfg && p.cfg.onUpdate) {
                            if (p.cfg.id === 'BATTLE') {
                                if (event.user.boss) {
                                    p.cfg.onUpdate();
                                }
                                if (event.user.labyrinth) {
                                    p.cfg.onUpdate();
                                }
                            } else {
                                p.cfg.onUpdate();
                            }
                        }
                    }
                    if (event.pvpt
                        && event.pvpt.qSize
                        && app.Model.user.pvpt) {
                        app.Model.user.pvpt.qSize = event.pvpt.qSize;
                    }
                    if (event.champt
                        && event.champt.qSize
                        && app.Model.user.champt) {
                        app.Model.user.champt.qSize = event.champt.qSize;
                    }
                    if (event.champt
                        && event.champt.group && event.champt.group.user
                        && app.Model.user.champt) {
                        let g_users = app.Model.user.champt.g.users;
                        let g_user = event.champt.group.user;
                        for (let i = 0; i < g_users.length; i++) {
                            if (g_users[i].id === g_user.id) {
                                g_users[i] = g_user;
                                break;
                            }
                        }
                        if (event.slot !== undefined) {
                            let p = app.Popups.getLast();
                            if (p && p.cfg && p.cfg.id === 'ChampT') {
                                app.EventDispatcher.emit('champt enemy choice', {slot: event.slot});
                            }
                        }
                    }
                    if (event.champt && event.champt.battle) {
                        let p = app.Popups.getLast();
                        if (p && p.cfg && p.cfg.id === 'ChampT') {
                            app.Popups.removePopup(p);
                        }
                        app.EventDispatcher.emit('battle begin', {champt: 1});
                    }
                    if (event.labyrinth) {
                        let user = app.Model.user;
                        if (user.labyrinth) {
                            switch (event.labyrinth.type) {
                                case 'Alive': {
                                    app.Model.user.labyrinth.alive = event.labyrinth.v;
                                    let p = app.Popups.getLast();
                                    if (p && p.cfg && p.cfg.id === 'Labyrinth'
                                        && p.tmp && p.tmp.alive) {
                                        p.tmp.alive.update();
                                    }
                                    break;
                                }
                                case 'QSize': {
                                    app.Model.user.labyrinth.qSize = event.labyrinth.v;
                                    break;
                                }
                                case 'BOSS_HEALTH_CHANGED': {
                                    if (user.labyrinth.boss && user.labyrinth.boss.health) {
                                        user.labyrinth.boss.health.v = event.labyrinth.v;
                                        user.labyrinth._updated = 1;
                                        let p = app.Popups.getLast();
                                        if (p && p.cfg && p.cfg.onUpdate) {
                                            p.cfg.onUpdate();
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    if (event.user && event.user.ypc) {
                        if (event.user.ypc._new) {
                            TweenMax.delayedCall(0.5, () => {
                                app.loadJS1('YandexPromoCode', () => app.YandexPromoCode.create());
                            });
                        }
                    }
                    break;
                }

                case 'CHAT_MESSAGE_NEW': {
                    let message = event.message;

                    if (message.u.id !== app.Model.user.id) {
                        if (message.t.indexOf(app.UserUtil.getUserNameUpper0(app.Model.user.name)) !== -1) {
                            app.SoundManager.playChat();
                        }
                    }

                    if (message.p.startsWith('guild_chat')) {
                        if (app.Model.user.guild) {
                            let now = app.TimeUtil.now();
                            let o = app.Utils.parseJSON(message.t);
                            if (o && o.type === 'g_r_e') {
                                app.Model.user.guild.lceut = now;
                                app.UserUtil.getGuildEntry().lceut = now;
                            } else {
                                app.Model.user.guild.lcut = now;
                                app.UserUtil.getGuildEntry().lcut = now;
                            }
                        }
                    } else {
                        app.Model.cfg.chat.lut = app.TimeUtil.now();
                    }

                    let p = app.Popups.getLast();
                    if (p && p.cfg.id === 'CHAT') {
                        p.cfg.onNewMessage(event.message);
                    }
                    break;
                }

                case 'CHAT_MESSAGE_UPDATE': {
                    let p = app.Popups.getLast();
                    if (p && p.cfg.id === 'CHAT') {
                        p.cfg.onUpdateMessage(event.message);
                    }
                    break;
                }

                case 'CHAT_TYPING': {
                    let p = app.Popups.getLast();
                    if (p && p.cfg.id === 'CHAT') {
                        p.cfg.onTyping(event.list);
                    }
                    break
                }

                case 'MAIL_DIALOG_MESSAGE_NEW': {
                    if (event.dialog.id.startsWith('st_')) {
                        app.Model.user.mail.lsut = app.TimeUtil.now();
                        app.Model.user.support.unread++;
                    } else {
                        app.Model.user.mail.lut = app.TimeUtil.now();
                    }

                    let p = app.Popups.getLast();
                    if (p && p.cfg) {
                        if (p.cfg.id === 'MAIL') {
                            p.cfg.onUpdateDialog(event.dialog);
                        } else if (p.cfg.id === 'CHAT') {
                            app.Menu.getCFG().MENU3.els.note.style.display = '';
                        }
                    }
                    break;
                }

                case 'LEAGUE': {
                    let league = event.league;
                    switch (league.type) {
                        case 'ENEMY_FOUND': {
                            let p = app.Popups.getLast();
                            if (p && p.cfg && p.cfg.id === 'LEAGUE_LOOKING_ENEMY') {
                                p.tmp.enemyFound();
                            }
                            break;
                        }
                        case 'ENEMY_NOT_FOUND': {
                            let p = app.Popups.getLast();
                            if (p && p.cfg && p.cfg.id === 'LEAGUE_LOOKING_ENEMY') {
                                p.tmp.enemyNotFound();
                            }
                            break;
                        }
                        case 'LOOKING_ENEMY_CANCELED': {
                            let p = app.Popups.getLast();
                            if (p && p.cfg && p.cfg.id === 'LEAGUE_LOOKING_ENEMY') {
                                app.Popups.removeLast();
                            }
                            break;
                        }
                    }
                    break;
                }

                case 'BATTLE': {
                    let battle = event.battle;
                    if (battle.t === 4) {
                        let p = app.Popups.getLast();
                        if (p && p.cfg) {
                            if (p.cfg.id === 'LEAGUE_LOOKING_ENEMY') {
                                app.Popups.removeLast0();
                            }
                        }
                    }
                    app.BattlePage.create({league: 1});
                    break;
                }

                case 'FORUM': {
                    let data = event.data;
                    switch (data.type) {
                        case 'TOPIC_NEW': {
                            let forums = app.Model.user.forums;
                            let forum = data.forum;
                            if (forum.t === 0) {
                                if (forums.news.id === forum.id) {
                                    forums.news.lu = 0;
                                } else {
                                    forums.main.lu = 0;
                                }
                            } else {
                                let gf = app.UserUtil.getGuildForumByID(forum.id);
                                if (gf) gf.lu = 0;
                            }
                            break;
                        }
                        case 'TOPIC_UPDATE': {
                            let p = app.Popups.getLast();
                            if (p && p.cfg && p.cfg.id === 'MAIN_FORUM') {
                                p.cfg.onTopicUpdate(data.topic);
                            }
                            break;
                        }
                        case 'COMMENT_NEW': {
                            let p = app.Popups.getLast();
                            if (p && p.cfg && p.cfg.id === 'MAIN_FORUM') {
                                p.cfg.onNewComment(data.forum, data.topic, data.paging, data.comment);
                            } else {
                                let forums = app.Model.user.forums;
                                let forum = data.forum;
                                if (forum.t === 0) {
                                    if (forums.news.id === forum.id) {
                                        forums.news.lu = 0;
                                    }
                                    forums.main.lu = 0;
                                } else {
                                    let gf = app.UserUtil.getGuildForumByID(forum.id);
                                    if (gf) gf.lu = 0;
                                }
                            }
                            break;
                        }
                        case 'COMMENT_UPDATE': {
                            let p = app.Popups.getLast();
                            if (p && p.cfg && p.cfg.id === 'MAIN_FORUM') {
                                p.cfg.onCommentUpdate(data.comment);
                            }
                            break;
                        }
                    }
                    break;
                }

                case 'AG_PAYMENT': {
                    app.UserUtil.isAG() && app.AGUtil.d2dRealCurrencyPayment(event.transaction_id, event.price, event.currencyCode, event.productId);
                    break;
                }
            }
        }
    }
})();