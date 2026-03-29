if (!app.GuildBlitzUtil) {

    const cfg = app.Model.cfg.cfgGuildBlitz;

    app.GuildBlitzUtil = {

        MINIMUM: cfg.rewards.guild.minPoints,

        getBaseTask(taskId) {
            return cfg.quests.find(task => task.id === taskId);
        },

        getBaseTaskSkipPrice(taskId) {
            const task = this.getBaseTask(taskId);
            const difficulty = task.difficulty;
            switch (difficulty) {
                case 'S': return cfg.TASK_S_SKIP_PRICE;
                case 'M': return cfg.TASK_M_SKIP_PRICE;
                case 'L': return cfg.TASK_L_SKIP_PRICE;
            }
        },

        getBaseTaskByUserEntry(userEntry) {
            const task = userEntry.task;
            return this.getBaseTask(task.id);
        },

        getTaskRequired(userEntry) {
            const baseTask = this.getBaseTaskByUserEntry(userEntry);
            return baseTask.required;
        },

        getTaskDescription(userEntry) {
            const baseTask = this.getBaseTaskByUserEntry(userEntry);

            switch (baseTask.type) {
                case 'ARENA_WIN': {
                    return 'Одержать {0} {1} на арене'.format(baseTask.required, app.Utils.getGramString(baseTask.required, 'победу', 'победы', 'побед'));
                }
                case 'ARENA_WINS_ROW': {
                    return 'Одержать на арене {0} победы подряд'.format(baseTask.required);
                }
                case 'ARENA_WINS_STRONGER': {
                    return 'Победить противника на арене с защитой выше твоей атаки';
                }
                case 'CAMPAIGN_AUTO_BATTLE': {
                    return 'Использовать автобой в кампании {0} раз'.format(baseTask.required);
                }
                case 'CAMPAIGN_FIND_ITEM': {
                    return 'Получить в кампании {0} предметов снаряжения'.format(baseTask.required);
                }
                case 'ANY_STONE_LEVEL_UP': {
                    return 'Поднять уровень любого камня {0} раз'.format(baseTask.required);
                }
                case 'ANY_CARD_LEVEL_UP': {
                    return 'Поднять уровень любой карты {0} раз'.format(baseTask.required);
                }
                case 'ANY_CARD_COMBO_LEVEL_UP': {
                    return 'Поднять {0} уровней умений любых карт'.format(baseTask.required);
                }
                case 'STONE_DUST_GET': {
                    return 'Получить {0} каменной пыли'.format(baseTask.required);
                }
                case 'ITEM_DUST_GET': {
                    return 'Получить {0} рунной пыли'.format(baseTask.required);
                }
                case 'ENERGY_SPEND': {
                    return 'Потратить {0} энергии'.format(baseTask.required);
                }
                case 'SHOP2_BY_CARD': {
                    return 'Купить {0} фрагментов карт у торговца гильдии'.format(baseTask.required);
                }
                case 'ANY_SHOP_RESET': {
                    return 'Обнови ассортимен любого магазина';
                }
                case 'GUILD_STONES_SPEND': {
                    return 'Потратить {0} камней гильдии'.format(baseTask.required);;
                }
                case 'GUILD_RAID_BATTLE': {
                    return 'Провести бой в рейде';
                }
                case 'GUILD_ENERGY_HELP_REQUEST': {
                    return 'Сделать запрос энергии у гильдии';
                }
                case 'ROULETTE': {
                    return 'Вращать колесо фортуны {0} {1}'.format(baseTask.required, app.Utils.getGramString(baseTask.required, 'раз', 'раза', 'раз'));
                }
                case 'GOLD_SPEND': {
                    return 'Потратить {0} золота'.format(app.Utils.toMoney(baseTask.required));
                }
                case 'GEMS_SPEND': {
                    return 'Потратить {0} кристаллов'.format(app.Utils.toMoney(baseTask.required));
                }
                case 'LEAGUE_WIN': {
                    return 'Одержать победу в лиге {0} {1}'.format(baseTask.required, app.Utils.getGramString(baseTask.required, 'раз', 'раза', 'раз'));
                }
                case 'LEAGUE_CHEST_OPEN': {
                    return 'Открыть сундук лиги';
                }
                case 'NEXIT_SPEND': {
                    return 'Потратить {0} нексита'.format(app.Utils.toMoney(baseTask.required));
                }
                case 'CARDS_FOUND': {
                    return 'Получить {0} фрагментов любых карт'.format(baseTask.required);
                }
                case 'DAILY_QUEST_COMPLETE': {
                    return 'Выполнить {0} ежедневных задания'.format(baseTask.required);
                }
                case 'ATTACK_WEEK_ABILITY': {
                    return 'Атаковать умением с бонусом недели стихии {0} раз'.format(baseTask.required);
                }
                case 'EXPEDITION_SEND': {
                    return 'Отправить экспедицию {0} {1}'.format(baseTask.required, app.Utils.getGramString(baseTask.required, 'раз', 'раза', 'раз'))
                }
            }
        },

        getTaskReward(userEntry) {
            const baseTask = this.getBaseTaskByUserEntry(userEntry);
            return baseTask.reward;
        },

        goto(userEntry) {
            const baseTask = this.getBaseTaskByUserEntry(userEntry);

            switch (baseTask.type) {
                case 'ARENA_WIN':
                case 'ARENA_WINS_ROW':
                case 'ARENA_WINS_STRONGER': {
                    app.EventDispatcher.emit('show arena');
                    break;
                }

                case 'CAMPAIGN_AUTO_BATTLE':
                case 'CAMPAIGN_FIND_ITEM':
                case 'ENERGY_SPEND':
                case 'ATTACK_WEEK_ABILITY': {
                    app.Campaign.create();
                    break;
                }

                case 'ANY_STONE_LEVEL_UP': {
                    app.CardsPage.create({tab: -1}).cfg.onTabClick(3);
                    break;
                }

                case 'ANY_CARD_LEVEL_UP':
                case 'ANY_CARD_COMBO_LEVEL_UP': {
                    app.CardsPage.create();
                    break;
                }

                case 'STONE_DUST_GET': {
                    app.DungeonPage.create({tabs: {active: 2}});
                    break
                }

                case 'ITEM_DUST_GET': {
                    app.EventDispatcher.emit('show profile', {inventory: 1, filter: 1});
                    break;
                }

                case 'SHOP2_BY_CARD':
                case 'GUILD_STONES_SPEND': {
                    app.GuildPage.onGuildShopClick();
                    break;
                }

                case 'GOLD_SPEND':
                case 'ANY_SHOP_RESET': {
                    app.EventDispatcher.emit('show shop');
                    break;
                }

                case 'GUILD_RAID_BATTLE': {
                    app.EventDispatcher.emit('show campaign', {raids: 1});
                    break;
                }
                case 'GUILD_ENERGY_HELP_REQUEST': {
                    app.Chat.createChat({tabs: {active: 3}});
                    break;
                }

                case 'ROULETTE':
                case 'GEMS_SPEND': {
                    app.MainPage.showGoldShop();
                    break;
                }

                case 'LEAGUE_WIN':
                case 'LEAGUE_CHEST_OPEN': {
                    app.EventDispatcher.emit('show league');
                    break;
                }

                case 'EXPEDITION_SEND':
                case 'NEXIT_SPEND': {
                    app.loadJS1('Expedition', () => {
                        app.Expedition.create();
                        if (baseTask.type === 'NEXIT_SPEND') {
                            app.Expedition._onTab0Clicked(app.Popups.getLast(), 2);
                        }
                    });
                    break;
                }

                case 'CARDS_FOUND': {
                    app.ChestsPage.create();
                    break;
                }
                case 'DAILY_QUEST_COMPLETE': {
                    app.QuestsPage.create();
                    break;
                }
            }
        },

        getUserEntry() {
            if (!app.Model.user.guild) {
                return;
            }

            const blitz = app.Model.user.guildBlitz;
            if (!blitz || !blitz.group || !blitz.group.guilds) {
                return;
            }

            const guildEntry = blitz.group.guilds.find(guildEntry => guildEntry.id === app.Model.user.guild.id);
            if (!guildEntry) {
                return;
            }

            return guildEntry.users.find(userEntry => userEntry.id === app.Model.user.id);
        },

        // ========== Коллективные задания ==========

        getCollectiveTaskConfig(taskType) {
            const commonQuests = cfg.common_quests;
            if (!commonQuests) {
                return null;
            }
            return commonQuests.find(task => task.type === taskType);
        },

        getCollectiveTaskStageRequirement(taskType, stage) {
            const config = this.getCollectiveTaskConfig(taskType);
            if (!config || !config.stages) {
                return 0;
            }
            const stageConfig = config.stages.find(s => s.stage === stage);
            return stageConfig ? stageConfig.required : 0;
        },

        getCollectiveTaskStageReward(taskType, stage) {
            const config = this.getCollectiveTaskConfig(taskType);
            if (!config || !config.stages) {
                return 0;
            }
            const stageConfig = config.stages.find(s => s.stage === stage);
            return stageConfig ? stageConfig.points : 0;
        },

        getCollectiveTaskDisplayName(taskType) {
            const config = this.getCollectiveTaskConfig(taskType);
            return config ? config.displayName : taskType;
        },

        getCollectiveTaskIcon(taskType) {
            const config = this.getCollectiveTaskConfig(taskType);
            return config ? config.icon : 'res_icon';
        }
    };
}