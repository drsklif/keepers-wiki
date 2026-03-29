var app = (function() {

    console.log('%cЭта функция браузера предназначена только для разработчиков.', 'color: red; -webkit-text-stroke: 1px black; font-size: 30px');

    function __getRequestParameters() {
        if (typeof _getRequestParameters !== 'undefined') {
            return _getRequestParameters();
        } else {
            if (app && app.Utils) {
                return app.Utils.getRequestParameters();
            } else {
                const getRequestParameters = function() {
                    let s1 = location.search.substring(1, location.search.length).split('&'),
                        r = {},
                        s2;
                    for (let i = 0; i < s1.length; i++) {
                        s2 = s1[i].split('=');
                        r[decodeURIComponent(s2[0])] = decodeURIComponent(s2[1]);
                    }
                    return r;
                };
                return getRequestParameters();
            }
        }
    }

    function _getPlatform() {
        const params = __getRequestParameters();

        let platform;
        if (params.partner === 'vk' || location.hostname === 'vk.keepers.mobi') {
            platform = 'VK';
        } else if (params.partner === 'ok' || location.hostname === 'od.keepers.mobi') {
            platform = 'OK';
        } else if (params.partner === 'spaces' || location.hostname === 'spaces.keepers.mobi') {
            platform = 'SPACES';
        } else if (location.hostname === 'mailru.keepers.mobi') {
            platform = 'MAILRU';
        } else if (location.hostname === 'mmr.keepers.mobi') {
            platform = 'MMR';
        } else if (location.hostname === 'exe.keepers.mobi') {
            platform = 'EXERU';
        } else if (location.hostname === 'fs.keepers.mobi') {
            platform = 'FS';
        } else if (location.hostname === 'gamepad.keepers.mobi') {
            platform = 'GAME_PAD';
        } else if (location.hostname === 'ag.keepers.mobi') {
            platform = 'AG';
        } else if (params.partner === 'rbk') {
            platform = 'RBK';
        } else if (params.google) {
            platform = 'WRAP';
        } else if (params.partner === 'GAMEPUSH' || window._GAMEPUSH) {
            platform = 'GAMEPUSH';
        } else {
            const host = window.location.host;
            if (host.startsWith('localhost')
                || host.startsWith('l1')
                || host.startsWith('l2')
                || host.startsWith('l3')
                || host.startsWith('192.168.')
                || host.startsWith('95.170.152.16')
                || host.startsWith('37.192.45.123')
            ) {
                platform = 'localhost';
            } else if (host.indexOf('98934') !== -1 && host.indexOf('yandex') !== -1) {
                platform = 'YANDEX';
            } else {
                platform = 'SITE';
            }
        }
        return platform;
    }

    function _getResourceURL(path) {
        if (typeof VK_ODR !== 'undefined' && VK_ODR) {
            return getVK_ODR_Path(path);
        }

        const platform = _getPlatform();
        const host = window.location.host;

        let RESOURCE_URL;

        switch (platform) {
            case 'localhost':
                RESOURCE_URL = '';
                break;
            case 'YANDEX':
                RESOURCE_URL = 'https://ya.keepers.mobi';
                break;
            case 'VK':
                RESOURCE_URL = 'https://vk.keepers.mobi';
                break;
            case 'OK':
                RESOURCE_URL = 'https://od.keepers.mobi';
                break;
            case 'SPACES':
                RESOURCE_URL = 'https://spaces.keepers.mobi';
                break;
            case 'FS':
                RESOURCE_URL = 'https://fs.keepers.mobi';
                break;
            case 'EXERU':
                RESOURCE_URL = 'https://exe.keepers.mobi';
                break;
            case 'MAILRU':
            case 'MMR':
                RESOURCE_URL = 'https://mmr.keepers.mobi';
                break;
            case 'wrap':
                RESOURCE_URL = 'https://wrap.keepers.mobi';
                break;
            case 'AG':
                RESOURCE_URL = 'https://ag.keepers.mobi';
                break;
            case 'GAMEPUSH':
                RESOURCE_URL = 'https://gp.keepers.mobi';
                break;
            default:
                RESOURCE_URL = location.protocol + '//' + host;
                break;
        }

        /*
        if (host.startsWith('localhost')
            || host.startsWith('l1')
            || host.startsWith('l2')
            || host.startsWith('l3')
            || host.startsWith('192.168.')
            || host.startsWith('95.170.152.16')
            || host.startsWith('37.192.45.123')) {
            RESOURCE_URL = '';
        } else {
            if (host.indexOf('98934') !== -1 && host.indexOf('yandex') !== -1) {
                RESOURCE_URL = 'https://ya.keepers.mobi';
            } else {
                RESOURCE_URL = location.protocol + '//' + host;
            }
        }
        */

        if (path.startsWith(RESOURCE_URL)) {
            return path;
        }

        if (path[0] === '/') {
            return RESOURCE_URL + path;
        }

        return RESOURCE_URL + '/' + path;
    }

    var _LAYOUT_BASE;

    var css = {
        v: '328',

        list: [
            {alias: 'style', file: _getResourceURL(_getPlatform() === 'SITE' ? '/style.min.css' : '/wrap.style.min.css'), v: '1'},
            {alias: 'common', file: _getResourceURL(_getPlatform() === 'SITE' ? '/common.min.css' : '/wrap.common.min.css'), v: '1'},
            {alias: 'vk_750', file: _getResourceURL(_getPlatform() === 'SITE' ? '/style_sq.min.css' : '/wrap.style_sq.min.css'), v: '1'}
        ],

        getCFG: function(alias) {
            let list = this.list, cfg;
            for (let i = 0; i < list.length; i++) {
                if ((cfg = list[i]).alias === alias) return cfg;
            }
        },
        getPath: function(alias) {
            let cfg = this.getCFG(alias);
            return cfg.file + '?v=' + this.v + '.' + cfg.v;
        },
        addInlineStyles: function(styles) {
            let style = document.createElement('style');
            style.type = "text/css";
            // browser detection (based on prototype.js)
            if(!!(window.attachEvent && !window.opera)) {
                style.styleSheet.cssText = styles;
            } else {
                style.appendChild(document.createTextNode(styles));
            }
            document.getElementsByTagName('head')[0].appendChild(style);
            return style;
        }
    };

    let test = false;
    test = window._GAMEPUSH === 1;

    let js_min = test ? 0 : 1;
    let js_v = test ? Math.random() : '';
    var js = {
        v: '10.0.98' + js_v,
        list: [
            {alias: 'EventDispatcher', file: _getResourceURL('/js/EventDispatcher.js'), v: '3'},
            {alias: 'Utils', file: _getResourceURL('/js/Utils' + (js_min ? '.min.js' : '.js')), v: '64'},
            {alias: 'TimeUtil', file: _getResourceURL('/js/TimeUtil.js'), v: '2'},
            {alias: 'CFGUtil', file: _getResourceURL('/js/CFGUtil' + (js_min ? '.min.js' : '.js')), v: '27'},
            {alias: 'UserUtil', file: _getResourceURL('/js/UserUtil' + (js_min ? '.min.js' : '.js')), v: '106'},
            {alias: 'GuildUtil', file: _getResourceURL('/js/GuildUtil' + (js_min ? '.min.js' : '.js')), v: '10'},
            {alias: 'EventUtil', file: _getResourceURL('/js/EventUtil.js'), v: '21'},
            {alias: 'Model', file: _getResourceURL('/js/Model' + (js_min ? '.min.js' : '.js')), v: '41'},
            {alias: 'Mailru', file: _getResourceURL('/js/Mailru.js'), v: '5'},
            {alias: 'World', file: _getResourceURL('/js/World.js'), v: '9'},
            {alias: 'Game', file: _getResourceURL('/js/Game' + (js_min ? '.min.js' : '.js')), v: '74'},
            {alias: 'Dice', file: _getResourceURL('/js/Dice.js'), v: '1'},
            {alias: 'Menu', file: _getResourceURL('/js/Menu.js'), v: '6'},
            {alias: 'MainPage', file: _getResourceURL('/js/MainPage' + (js_min ? '.min.js' : '.js')), v: '385'},
            {alias: 'ProfilePage', file: _getResourceURL('/js/ProfilePage' + (js_min ? '.min.js' : '.js')), v: '18'},
            {alias: 'CardsPage', file: _getResourceURL('/js/CardsPage' + (js_min ? '.min.js' : '.js')), v: '18'},
            {alias: 'Cards', file: _getResourceURL('/js/Cards' + (js_min ? '.min.js' : '.js')), v: '66'},
            {alias: 'Campaign', file: _getResourceURL('/js/Campaign' + (js_min ? '.min.js' : '.js')), v: '13'},
            {alias: 'ChestsPage', file: _getResourceURL('/js/ChestsPage' + (js_min ? '.min.js' : '.js')), v: '8'},
            {alias: 'Chests', file: _getResourceURL('/js/Chests' + (js_min ? '.min.js' : '.js')), v: '35'},
            {alias: 'Chat', file: _getResourceURL('/js/Chat' + (js_min ? '.min.js' : '.js')), v: '86'},
            {alias: 'ShopPage', file: _getResourceURL('/js/ShopPage' + (js_min ? '.min.js' : '.js')), v: '23'},
            {alias: 'ArenaPage', file: _getResourceURL('/js/ArenaPage' + (js_min ? '.min.js' : '.js')), v: '15'},
            {alias: 'Popups', file: _getResourceURL('/js/Popups' + (js_min ? '.min.js' : '.js')), v: '16'},
            {alias: 'Forum', file: _getResourceURL('/js/Forum' + (js_min ? '.min.js' : '.js')), v: '27'},
            {alias: 'QuestsPage', file: _getResourceURL('/js/QuestsPage' + (js_min ? '.min.js' : '.js')), v: '35'},
            {alias: 'RatingsPage', file: _getResourceURL('/js/RatingsPage' + (js_min ? '.min.js' : '.js')), v: '18'},
            {alias: 'GuildPage', file: _getResourceURL('/js/GuildPage' + (js_min ? '.min.js' : '.js')), v: '55'},
            {alias: 'GuildRaids', file: _getResourceURL('/js/GuildRaids' + (js_min ? '.min.js' : '.js')), v: '8'},
            {alias: 'DungeonPage', file: _getResourceURL('/js/DungeonPage' + (js_min ? '.min.js' : '.js')), v: '5'},
            {alias: 'BattleReplay', file: _getResourceURL('/js/BattleReplay' + (js_min ? '.min.js' : '.js')), v: '9'},
            {alias: 'BattlePage', file: _getResourceURL('/js/BattlePage' + (js_min ? '.min.js' : '.js')), v: '19'},
            {alias: 'LeaguePage', file: _getResourceURL('/js/LeaguePage' + (js_min ? '.min.js' : '.js')), v: '30'},
            {alias: 'SoundManager', file: _getResourceURL('/js/SoundManager.js'), v: '7'},
            {alias: 'Tutorial', file: _getResourceURL('/js/Tutorial' + (js_min ? '.min.js' : '.js')), v: '4'},
            {alias: 'AchievementsPage', file: _getResourceURL('/js/AchievementsPage' + (js_min ? '.min.js' : '.js')), v: '7'},
            {alias: 'DailyRewards', file: _getResourceURL('/js/DailyRewards.js'), v: '7'},
            {alias: 'Notifications', file: _getResourceURL('/js/Notifications.js'), v: '38'},
            {alias: 'Purchase', file: _getResourceURL('/js/Purchase' + (js_min ? '.min.js' : '.js')), v: '38'},
            {alias: 'Shop', file: _getResourceURL('/js/Shop.js'), v: '5'},

            {alias: 'BBCodes', file: _getResourceURL('/js/BBCodes.js'), v: '5'},
            {alias: 'Network', file: _getResourceURL('/js/Network_4' + (js_min ? '.min.js' : '.js')), v: '24'}
        ],
        lazyList: [
            {alias: 'Avatars', file: _getResourceURL('/js/Avatars.js'), v: '67'},
            {alias: 'SpherePage', file: _getResourceURL('/js/SpherePage.js'), v: '4'},
            {alias: 'BlitzPage', file: _getResourceURL('/js/BlitzPage' + (js_min ? '.min.js' : '.js')), v: '2'},
	    {alias: 'GuildBlitzPage', file: _getResourceURL('/js/GuildBlitzPage.js'), v: '25'},
	    {alias: 'GuildBlitzUtil', file: _getResourceURL('/js/GuildBlitzUtil.js'), v: '5'},
            {alias: 'SalePage', file: _getResourceURL('/js/SalePage' + (js_min ? '.min.js' : '.js')), v: '60'},
            {alias: 'Sale1', file: _getResourceURL('/js/Sale1' + (js_min ? '.min.js' : '.js')), v: '110'},
            {alias: 'SearchPage', file: _getResourceURL('/js/SearchPage.js'), v: '3'},
            {alias: 'SettingsPage', file: _getResourceURL('/js/SettingsPage' + (js_min ? '.min.js' : '.js')), v: '46'},
            {alias: 'BossPage', file: _getResourceURL('/js/BossPage.js'), v: '19'},
            {alias: 'Agreement', file: _getResourceURL('/js/Agreement' + (js_min ? '.min.js' : '.js')), v: '18'},
            {alias: 'Exeru', file: _getResourceURL('/js/Exeru.js'), v: '2'},
            {alias: 'Fotostrana', file: _getResourceURL('/js/Fotostrana.js'), v: '1'},
            {alias: 'Premium', file: _getResourceURL('/js/Premium' + (js_min ? '.min.js' : '.js')), v: '51'},
            {alias: 'Halloween', file: _getResourceURL('/js/Halloween.js'), v: '41'},
            {alias: 'PVPT', file: _getResourceURL('/js/PVPT' + (js_min ? '.min.js' : '.js')), v: '20'},
            {alias: 'MayEvent', file: _getResourceURL('/js/MayEvent.js'), v: '62'},
            {alias: 'OKUtil', file: _getResourceURL('/js/OKUtil.js'), v: '14' + '.' + Math.random()},
            {alias: 'VKUtil', file: _getResourceURL('/js/VKUtil.js'), v: '46'},
            {alias: 'YandexUtil', file: _getResourceURL('/js/YandexUtil.js'), v: '57.' + Math.random()},
            {alias: 'RBKUtil', file: _getResourceURL('/js/RBKUtil.js'), v: '2'},
            {alias: 'GuildWar', file: _getResourceURL('/js/GuildWar' + (js_min ? '.min.js' : '.js')), v: '41'},
	    {alias: 'GuildBuildings', file: _getResourceURL('/js/GuildBuildings' + '.js'), v: '5'},
            {alias: 'Virus', file: _getResourceURL('/js/VirusPage.js'), v: '17'},
            {alias: 'StonesPage', file: _getResourceURL('/js/StonesPage.js'), v: '15'},
            {alias: 'MMR', file: _getResourceURL('/js/MMR.js'), v: '15'},
            {alias: 'GuildEvent', file: _getResourceURL('/js/GuildEvent' + (js_min ? '.min.js' : '.js')), v: '7'},
            {alias: 'GoogleReview', file: _getResourceURL('/js/GoogleReview' + (js_min ? '.min.js' : '.js')), v: '8'},
            {alias: 'Debug', file: _getResourceURL('/js/Debug.js'), v: '3'},
            {alias: 'XsollaPS3', file: _getResourceURL('/js/XsollaPS3.js'), v: '4'},
            {alias: 'Labyrinth', file: _getResourceURL('/js/Labyrinth' + (js_min ? '.min.js' : '.js')), v: '22'},
            {alias: 'BattlePath', file: _getResourceURL('/js/BattlePath.js'), v: '29'},
            {alias: 'ChampT', file: _getResourceURL('/js/ChampT' + (js_min ? '.min.js' : '.js')), v: '10'},
            {alias: 'Expedition', file: _getResourceURL('/js/Expedition.js'), v: '4'},
            {alias: 'OVMSDK', file: _getResourceURL('/js/OVMSDK.js'), v: '1.0' + Math.random()},
            {alias: 'MainShopPage', file: _getResourceURL('/js/MainShopPage' + (js_min ? '.min.js' : '.js')), v: '102'},
            {alias: 'MailPage', file: _getResourceURL('/js/MailPage' + (js_min ? '.min.js' : '.js')), v: '27'},
            {alias: 'TrainingPage', file: _getResourceURL('/js/TrainingPage.js'), v: '4'},
            {alias: 'AGUtil', file: _getResourceURL('/js/AGUtil.js'), v: '3.' + Math.random()},
            {alias: 'YandexPromoCode', file: _getResourceURL('/js/YandexPromoCode.js'), v: '3'},
            {alias: 'MiniGame', file: _getResourceURL('/js/MiniGame.js'), v: '3'},
            {alias: 'Beeline', file: _getResourceURL('/js/Beeline.js'), v: '1.' + Math.random()},
            {alias: 'Ifree2', file: _getResourceURL('/js/Ifree2.js'), v: '1.' + Math.random()},
            {alias: 'OfferChain', file: _getResourceURL('/js/OfferChain.js'), v: '1.' + Math.random()},
            {alias: 'Playdeck', file: _getResourceURL('/js/Playdeck.js'), v: '1.' + Math.random()},
            {alias: 'GamePush', file: _getResourceURL('/js/GamePush.js'), v: '1.' + Math.random()},
	    {alias: 'Yookassa', file: _getResourceURL('/js/Yookassa.js'), v: '1.' + Math.random()},
        ],
        getCFG: function(alias) {
            let list = this.list, cfg;
            for (let i = 0; i < list.length; i++) {
                if ((cfg = list[i]).alias === alias) return cfg;
            }
            list = this.lazyList;
            for (let i = 0; i < list.length; i++) {
                if ((cfg = list[i]).alias === alias) return cfg;
            }
        },
        getPath: function(alias) {
            return this.getPath0(this.getCFG(alias));
        },
        getPath0: function(cfg) {
            return cfg.file + '?v=' + this.v + '.' + cfg.v;
        }
    };

    var images = {
        v: '8.0.37',
        list: [
            {file: _getResourceURL('/images/sprite_decor.png'), v: '12'},
            {file: _getResourceURL('/images/sprite_gems.png'), v: '2'},
            {file: _getResourceURL('/images/sprite_gems2.png'), v: '9'},
            {file: _getResourceURL('/images/sprite_main.png'), v: '36'},
            {file: _getResourceURL('/images/sprite_battle.png'), v: '7'},
            {file: _getResourceURL('/images/sprite_bp.png'), v: '7'},
            {file: _getResourceURL('/images/sprite_bf.png'), v: '1'},
            {file: _getResourceURL('/images/avatars/male/1.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/male/2.jpg'), v: '2'},
            {file: _getResourceURL('/images/avatars/male/3.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/male/4.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/female/1.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/female/2.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/female/3.jpg'), v: '3'},
            {file: _getResourceURL('/images/avatars/female/4.jpg'), v: '1'},
            {file: _getResourceURL('/images/puzzle/halloween.png'), v: '2'},
            {file: _getResourceURL('/images/sprite_cards_icons.png'), v: '29'},
            {file: _getResourceURL('/images/brd_block_friday.jpg'), v: '2'},
            {file: _getResourceURL('/images/labyrinth/sprite_drop.png'), v: '1'},
            {file: _getResourceURL('/images/chgift.png'), v: '1'},
            {file: _getResourceURL('/images/main_bg_640_1200.jpg'), v: '2'},
            {file: _getResourceURL('/images/main_bg_750_750.jpg'), v: '2'},
            {file: _getResourceURL('/images/guild_bg_750_750.jpg'), v: '4'},
	    {file: _getResourceURL('/images/guild_bg_640_1200.jpg'), v: '4'},
            {file: _getResourceURL('/images/sprite_cosmos.png'), v: '4'},
            {file: _getResourceURL('/images/sprite_magic.png'), v: '4'},
            {file: _getResourceURL('/images/present_leaf.png'), v: '1'}
        ],
        getPath: function(path) {
            if (path.startsWith('https') || path.startsWith('http')) {
            } else {
                path = _getResourceURL(path);
            }
            const cfg = this.getCFG(path);
            if (cfg) {
                return cfg.file + '?v=' + this.v + '.' + cfg.v;
            }
            return _getResourceURL(path) + '?v=' + this.v;
        },
        getCFG: function(alias) {
            return this.list.find(_cfg => _cfg.file === alias);
        }
    };

    return {
        init: function(progress) {
            let self = this;
            let total = 2;
            progress.set(0, total, 'Загрузка ресурсов');
            let onLoad = function() {
                progress.progress++;
                if (progress.isComplete()) {
                    self.updateLayout();

                    progress.set(0, self.LAYOUT.VK ? 3 : 2, 'Загрузка ресурсов');
                    onLoad = function() {
                        progress.progress++;
                        if (progress.isComplete()) {
                            if (self.LAYOUT.MAILRU) {
                                self.loadJS('Mailru', function () {
                                    console.load('done');
                                });
                            }
                        }
                    };
                    self.loadCSS('style', onLoad);
                    self.loadCSS('common', onLoad);
                    if (self.LAYOUT.VK) {
                        self.loadCSS('vk_750', onLoad);
                    }
                }
            };
            this.loadGSAP(onLoad);
            this.loadJS('Utils', onLoad);
        },

        updateLayout: function() {
            let w0 = window.innerWidth
                        || document.documentElement.clientWidth
                        || document.body.clientWidth;

            let h0 = window.innerHeight
                        || document.documentElement.clientHeight
                        || document.body.clientHeight;

            let LAYOUT = {};

            let ua = navigator.userAgent;

            if (ua.indexOf('Opera Mini/') !== -1) LAYOUT._OPERA_MINI = 1;
            if (ua.indexOf('OPR/') !== -1) LAYOUT._OPERA = 1;
            if (ua.indexOf('UCBrowser/') !== -1) LAYOUT._UC = 1;
            if (ua.indexOf('iPhone') !== -1) LAYOUT._IPHONE = 1;

            let params = __getRequestParameters();

            if (location.hostname === 'mailru.keepers.mobi' || location.hostname === 'od.keepers.mobi' || location.hostname === 'vk.keepers.mobi') {
                if (LAYOUT._IPHONE && screen && screen.width) {
                    w0 = Math.min(w0, screen.width);
                }

                /*
                if (!_LAYOUT_BASE) _LAYOUT_BASE = {w: w0, h: h0};
                w0 = Math.min(w0, _LAYOUT_BASE.w);
                h0 = Math.min(h0, _LAYOUT_BASE.h);
                */

                if (location.hostname === 'od.keepers.mobi') {
                    if (!_LAYOUT_BASE) _LAYOUT_BASE = {w: w0, h: h0, h0: h0};

                    // это нужно для тех, кто открывает m.ok.ru через браузер
                    // 28 - размер черной полоски ОКов
                    if (LAYOUT._IPHONE) {
                    } else if (params && !params.container) {
                        if (params.mob && params.mob_platform === 'mobweb') {
                        } else {
                            //_LAYOUT_BASE.h = _LAYOUT_BASE.h0 - 28;
                        }
                    }
                    w0 = Math.min(w0, _LAYOUT_BASE.w);
                    h0 = Math.min(h0, _LAYOUT_BASE.h);
                }
            }

            if (params.partner === 'vk' /*|| location.hostname === 'vk.keepers.mobi'*/) {
                LAYOUT.w = 750;
                LAYOUT.h = 750;
                LAYOUT.maxH = 750;
                LAYOUT.scale = 1;
                LAYOUT.VK = 1;
                LAYOUT.screen = {w: w0, h: h0};
            } else {
                if (w0 >= 640) {
                    LAYOUT.w = 640;
                    LAYOUT.h = Math.min(h0, 1200);
                    LAYOUT.maxH = 1200;
                    LAYOUT.scale = 1;
                    LAYOUT.screen = {w: w0, h : h0};
                } else if (w0 >= 480) {
                    LAYOUT.w = 480;
                    LAYOUT.h = Math.min(h0, 1200);
                    LAYOUT.maxH = 1200;
                    LAYOUT.scale = 1;
                    LAYOUT.screen = {w: w0, h: h0};
                } else {
                    LAYOUT.w = 480;
                    LAYOUT.h = Math.min(h0, 1200);
                    LAYOUT.maxH = 1200;
                    LAYOUT.scale = w0 / 480;
                    LAYOUT.scaledH = LAYOUT.h * LAYOUT.scale;
                    LAYOUT.scaledH = Math.min(LAYOUT.scaledH, LAYOUT.h);
                    LAYOUT.screen = {w: w0, h : h0};
                }
                if (location.hostname === 'vk.keepers.mobi') {
                    LAYOUT.VK_MOBILE = 1;
                }
                if (location.hostname === 'mailru.keepers.mobi') {
                    LAYOUT.MAILRU = 1;
                    LAYOUT.h = Math.min(LAYOUT.h, h0);
                }
                if (location.hostname === 'mmr.keepers.mobi') {
                    LAYOUT.w = 750;
                    LAYOUT.h = 750;
                    LAYOUT.maxH = 750;
                    LAYOUT.scale = 1;
                    LAYOUT.MMR = 1;
                    LAYOUT.screen = {w: w0, h: h0};
                }
                if (location.hostname === 'od.keepers.mobi') {
                    if (params.container && !params.mob) {
                        LAYOUT.w = 750;
                        LAYOUT.h = 750;
                        LAYOUT.maxH = 750;
                        LAYOUT.scale = 1;
                        LAYOUT.OK_750 = 1;
                        LAYOUT.screen = {w: w0, h: h0};
                    } else {
                        LAYOUT.OK = 1;
                        LAYOUT.h = Math.min(LAYOUT.h, h0);
                    }
                }
                if (location.hostname === 'exe.keepers.mobi') {
                    LAYOUT.w = 750;
                    LAYOUT.h = 750;
                    LAYOUT.maxH = 750;
                    LAYOUT.scale = 1;
                    LAYOUT.EXERU = 1;
                    LAYOUT.screen = {w: w0, h: h0};
                }
                if (location.hostname === 'fs.keepers.mobi') {
                    LAYOUT.w = 750;
                    LAYOUT.h = 750;
                    LAYOUT.maxH = 750;
                    LAYOUT.scale = 1;
                    LAYOUT.FS = 1;
                    LAYOUT.screen = {w: w0, h: h0};
                }
                if (window._YANDEX) {
                    LAYOUT.YANDEX = 1;
                    LAYOUT.h = Math.min(LAYOUT.h, h0);
                }
            }

            LAYOUT.convert = function(value) {
                if (this.scale < 1) {
                    value *= this.scale;
                }
                return value;
            };

            LAYOUT.convert0 = function(value) {
                if (this.scale < 1) {
                    value *= 1 / this.scale;
                }
                return value;
            };

            LAYOUT.getClientWHS0 = function(h, flags) {
                h = app.Utils.withOffsets(h, flags);
                if (this.scale < 1) {
                    return this.convert0(this.h) - h;
                } else {
                    return this.h - h;
                }
            };

            this.LAYOUT = LAYOUT;
        },

        CSS: css,
        loadCSS: function(alias, onLoad) {
            const head  = document.getElementsByTagName('head')[0];
            const link  = document.createElement('link');
            link.onload = function() {
                onLoad();
            };
            link.rel  = 'stylesheet';
            link.type = 'text/css';
            link.href = css.getPath(alias);
            head.appendChild(link);
        },

        JS: js,
        loadJS: function(alias, onLoad) {
            let path = js.getPath(alias);
            this.loadJS0(path, onLoad);
        },
        loadJS1: function(alias, onLoad) {
            if (app[alias]) {
                onLoad();
            } else {
                let path = js.getPath(alias);
                this.loadJS0(path, onLoad);
            }
        },
        loadJS0: function(path, onLoad) {
            let el = document.createElement('script');
            el.type = 'text/javascript';
            el.onload = function() {
                onLoad();
            };
            el.src = path;
            document.getElementsByTagName('head')[0].appendChild(el);
        },
        loadGSAP: function(onLoad) {
            this.loadJS0(_getResourceURL('/js/libs/gsap/TweenMax.min.js'), onLoad);
        },
        loadJSAll: function(onLoad, onComplete) {
            let self = this;
            let list = js.list;
            let progress = 0;
            let total = list.length;
            let load = function(cfg) {
                if (app[cfg.alias]) {
                    progress++;
                    if (progress === total) {
                        onComplete();
                    }
                } else {
                    self.loadJS0(js.getPath0(cfg), function () {
                        progress++;
                        onLoad(cfg.alias);
                        if (progress === total) {
                            onComplete();
                        }
                    });
                }
            };
            for (let i = 0; i < list.length; i++) {
                load(list[i]);
            }
        },

        IMAGES: images,
        loadIMGs: function(sources, onLoad, onComplete) {
            let progress = 0;
            let total = sources.length;
            sources.forEach(function (source) {
                let p = new Promise(function (resolve, reject) {
                    let img = new Image();
                    img.onload = function () {
                        progress++;
                        resolve({source: source, state: 0, last: progress === total});
                    };
                    img.onerror = function () {
                        progress++;
                        resolve({source: source, state: 1, last: progress === total});
                    };
                    img.src = images.getPath(source);
                });
                p.then(function(data) {
                    onLoad(data);
                    if (data.last) {
                        onComplete();
                    }
                });
            });
        },

        RESIZE: {
            tID: 0,
            value: 1,
            isOn: function() {
                return this.value;
            },
            off: function() {
                if (this.tID) {
                    clearTimeout(this.tID);
                }
                this.value = 0;
            },
            on: function() {
                let self = this;
                self.tID = setTimeout(function() {
                    self.value = 1;
                    app.onResize();
                }, 500);
            }
        },

        onResize: function() {
            console.log('onResize');

            if (!app.UserUtil
                || !app.Utils
                || !app.MainPage
                || !app.Model
                || !app.Model.user) {
                return;
            }

            if (!app.RESIZE.isOn()) {
                return;
            }

            if (app.UserUtil.isVK() && !app.UserUtil.isVKMobile()) {
                return;
            }

            try {
                app.updateLayout();

                if (app.Popups) {
                    let p = app.Popups.getLast();
                    if (p && p.els.dark) {
                        p.els.dark.style.height = app.LAYOUT.getClientWHS0(app.LAYOUT.scale < 1 ? 0 : 6, 1) + 'px';
                    }
                }

                document.body.className = 'b{0}_1200'.format(app.LAYOUT.w);
                app.Utils.el('main0').style.width = app.LAYOUT.w + 'px';
                app.Utils.el('main').style.width = app.LAYOUT.w + 'px';

                if (app.LAYOUT.scale < 1) {
                    app.Utils.el('main').style.transform = 'scale(' + app.LAYOUT.scale + ')';
                } else {
                    app.Utils.el('main').style.transform = '';
                }

                let cfg = app.MainPage.getCFG();
                cfg.content.els.main.style.height = app.LAYOUT.convert0(app.LAYOUT.h) - 76 + 6 + 'px';
                cfg.icons.bottom.els.main.style.top = cfg.icons.bottom1.els.main.style.top = app.LAYOUT.getClientWHS0(0) - (76 + 55 + 10) + 'px';
                cfg.content.scroll.top = Math.max(-210, (app.LAYOUT.convert0(app.LAYOUT.h) - app.LAYOUT.maxH) / 2);
                cfg.content.scroll.topMax = app.LAYOUT.maxH - app.LAYOUT.convert0(app.LAYOUT.h);
                cfg.content.scroll.el.style.top = cfg.content.scroll.top + "px";

                if (app.GuildPage) {
                    let content = app.GuildPage.getCFG();
                    if (content) {
                        content.els.main.style.height = app.LAYOUT.convert0(app.LAYOUT.h) - 76 + 6 + 'px';
                        content.scroll.top = Math.max(-210, (app.LAYOUT.convert0(app.LAYOUT.h) - app.LAYOUT.maxH) / 2);
                        content.scroll.topMax = app.LAYOUT.maxH - app.LAYOUT.convert0(app.LAYOUT.h);
                        content.scroll.el.style.top = content.scroll.top + "px";
                    }
                }

                if (app.Menu) app.Menu.updateWHS();
                app.Popups.updateWHS();
            } catch(e) {
                console.error(e);
            }
        },

        getResourceURL: function(path) {
            return _getResourceURL(path);
        },

        loadEruda() {
            app.loadJS0('https://cdn.jsdelivr.net/npm/eruda', () => {
                eruda.init();
            });
        }
    };
})();
