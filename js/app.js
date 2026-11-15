var app = (function () {

    console.log('%cЭта функция браузера предназначена только для разработчиков.', 'color: red; -webkit-text-stroke: 1px black; font-size: 30px');

    function __getRequestParameters() {
        if (typeof _getRequestParameters !== 'undefined') {
            return _getRequestParameters();
        } else {
            if (app && app.Utils) {
                return app.Utils.getRequestParameters();
            } else {
                const getRequestParameters = function () {
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
                || host.startsWith('test')
                || host.startsWith('l1')
                || host.startsWith('l2')
                || host.startsWith('l3')
                || host.startsWith('192.168.')
                || host.startsWith('95.170.152.16')
                || host.startsWith('37.192.45.123')
                || host.startsWith('103.71.20.207')
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

    const WRAP_HOST = 'https://wrap.keepers.mobi';
    const KEEPERS_HOST = 'https://keepers.mobi';

    // Картинки соцсетей (VK, OK, Яндекс) идут с wrap. У части игроков, в основном с мобильного интернета,
    // wrap недоступен — тогда картинки берутся с keepers: там те же файлы, CSS с ними собирает Prepare.prepareCSS
    const socialImages = (function () {
        // после недоступного wrap следующие сутки картинки сразу с keepers
        const WRAP_UNAVAILABLE_KEY = 'wrapUnavailableAt';
        const WRAP_UNAVAILABLE_TTL_MS = 24 * 60 * 60 * 1000;
        // 614 байт, одна из картинок экрана боя
        const PROBE_IMAGE_PATH = '/images/damage.png';
        const PROBE_TIMEOUT_MS = 3000;
        // проверка идёт и после ошибки картинки с wrap, а ошибкой бывает и 404
        const PROBE_INTERVAL_MS = 60 * 1000;

        let fromKeepers = wrapUnavailableRecently();
        let probeStartedAt = 0;

        function host() {
            return fromKeepers ? KEEPERS_HOST : WRAP_HOST;
        }

        function wrapUnavailableRecently() {
            try {
                return Date.now() - Number(localStorage.getItem(WRAP_UNAVAILABLE_KEY) || 0) < WRAP_UNAVAILABLE_TTL_MS;
            } catch (e) {
                return false;
            }
        }

        function rememberWrapUnavailable(unavailable) {
            try {
                if (unavailable) {
                    localStorage.setItem(WRAP_UNAVAILABLE_KEY, String(Date.now()));
                } else {
                    localStorage.removeItem(WRAP_UNAVAILABLE_KEY);
                }
            } catch (e) {
            }
        }

        function measureImageLoad(origin) {
            return new Promise(resolve => {
                const t0 = Date.now();
                const img = new Image();
                const finish = (outcome) => {
                    clearTimeout(timeoutID);
                    img.onload = img.onerror = null;
                    resolve({outcome: outcome, ms: Date.now() - t0});
                };
                const timeoutID = setTimeout(() => finish('timeout'), PROBE_TIMEOUT_MS);
                img.onload = () => finish('ok');
                img.onerror = () => finish('error');
                // случайный параметр — мимо кэша, проверяется сеть
                img.src = origin + PROBE_IMAGE_PATH + '?probe=' + Math.random();
            });
        }

        // wrap не ответил, а keepers ответил — переключаемся; в лог идёт любой неответ wrap
        function probe(trigger) {
            if (Date.now() - probeStartedAt < PROBE_INTERVAL_MS) return;
            probeStartedAt = Date.now();

            Promise.all([measureImageLoad(WRAP_HOST), measureImageLoad(KEEPERS_HOST)]).then(([wrapLoad, keepersLoad]) => {
                if (wrapLoad.outcome === 'ok') {
                    rememberWrapUnavailable(false);
                    return;
                }
                if (keepersLoad.outcome === 'ok') switchToKeepers();
                const connection = navigator.connection;
                const net = connection ? (connection.type || '?') + '/' + (connection.effectiveType || '?') : '?';
                _sendErrorAfterAuth('wrap probe: wrap=' + wrapLoad.outcome + ' ' + wrapLoad.ms + 'ms, keepers=' + keepersLoad.outcome + ' ' + keepersLoad.ms + 'ms, net=' + net
                    + ', trigger=' + trigger + ', images=' + (fromKeepers ? 'keepers' : 'wrap'));
            });
        }

        function keepersCSSURL(url) {
            return url.replace(/\/wrap\.(\w+\.min\.css)/, '/$1');
        }

        // Фоны, уже поставленные из JS (inline style), остаются с wrap до перерисовки экрана
        function switchToKeepers() {
            if (fromKeepers) return;
            fromKeepers = true;
            rememberWrapUnavailable(true);

            images.list.forEach(cfg => cfg.file = cfg.file.replace(WRAP_HOST, KEEPERS_HOST));
            css.list.forEach(cfg => cfg.file = keepersCSSURL(cfg.file));

            Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), oldLink => {
                const href = keepersCSSURL(oldLink.href);
                if (href === oldLink.href) return;
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                // старый CSS убираем после загрузки нового, иначе экран на миг остаётся без стилей
                link.onload = () => oldLink.parentNode && oldLink.parentNode.removeChild(oldLink);
                link.href = href;
                oldLink.parentNode.insertBefore(link, oldLink.nextSibling);
            });

            Array.prototype.forEach.call(document.images, img => {
                if (img.src.startsWith(WRAP_HOST)) img.src = img.src.replace(WRAP_HOST, KEEPERS_HOST);
            });
        }

        return {
            host: host,
            fromKeepers: () => fromKeepers,
            // проверка при старте и после каждой ошибки картинки с wrap — только там, где картинки идут через этот модуль
            start: function () {
                if (!_getResourceURL(PROBE_IMAGE_PATH).startsWith(host())) return;
                probe('start');
                document.addEventListener('error', event => {
                    const el = event.target;
                    if (!fromKeepers && el.tagName === 'IMG' && el.src.startsWith(WRAP_HOST)) probe('img');
                }, true);
            }
        };
    })();

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
                RESOURCE_URL = path.includes('/images/') ? socialImages.host() : 'https://ya.keepers.mobi';
                break;
            case 'VK':
                RESOURCE_URL = path.includes('/images/') ? socialImages.host() : 'https://vk.keepers.mobi';
                break;
            case 'OK':
                RESOURCE_URL = path.includes('/images/') ? socialImages.host() : 'https://od.keepers.mobi';
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

    // Error принимается только после Auth; ждём игрока до 2 минут
    function _sendErrorAfterAuth(error, tries = 0) {
        if (app.Model && app.Model.user && app.Network && app.Network.isConnected()) {
            app.Network.command({cmd: 'Error', error: error});
        } else if (tries < 60) {
            setTimeout(() => _sendErrorAfterAuth(error, tries + 1), 2000);
        }
    }

    // при загрузке app.js: index.html не вызывает app.init
    socialImages.start();

    var _LAYOUT_BASE;

    // wrap.*.min.css — картинки с wrap, *.min.css — с keepers (Prepare.prepareCSS)
    function _cssPath(name) {
        return (_getPlatform() === 'SITE' || socialImages.fromKeepers() ? '/' : '/wrap.') + name + '.min.css';
    }

    var css = {
        v: '417',

        list: [
            {
                alias: 'style',
                file: _getResourceURL(_cssPath('style')),
                v: '1'
            },
            {
                alias: 'common',
                file: _getResourceURL(_cssPath('common')),
                v: '1'
            },
            {
                alias: 'artifacts',
                file: _getResourceURL(_cssPath('artifacts')),
                v: '1'
            },
            {
                alias: 'echo',
                file: _getResourceURL(_cssPath('echo')),
                v: '1'
            },
            {
                alias: 'vk_750',
                file: _getResourceURL(_cssPath('style_sq')),
                v: '1'
            }
        ],

        getCFG: function (alias) {
            let list = this.list, cfg;
            for (let i = 0; i < list.length; i++) {
                if ((cfg = list[i]).alias === alias) return cfg;
            }
        },
        getPath: function (alias) {
            let cfg = this.getCFG(alias);
            return cfg.file + '?v=' + this.v + '.' + cfg.v;
        },
        addInlineStyles: function (styles) {
            let style = document.createElement('style');
            style.type = "text/css";
            // browser detection (based on prototype.js)
            if (!!(window.attachEvent && !window.opera)) {
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
    if (!test) {
        test = _getPlatform() === 'localhost';
    }

    let js_min = test ? 0 : 1;
    let js_v = test ? Math.random() : '';
    var js = {
        v: '10.0.98' + js_v,
        list: [
            {alias: 'EventDispatcher', file: _getResourceURL('/js/EventDispatcher.js'), v: '3'},
            {alias: 'Utils', file: _getResourceURL('/js/Utils' + (js_min ? '.min.js' : '.js')), v: '74'},
            {alias: 'TimeUtil', file: _getResourceURL('/js/TimeUtil.js'), v: '3'},
            {alias: 'CFGUtil', file: _getResourceURL('/js/CFGUtil' + (js_min ? '.min.js' : '.js')), v: '34'},
            {alias: 'UserUtil', file: _getResourceURL('/js/UserUtil' + (js_min ? '.min.js' : '.js')), v: '119'},
            {alias: 'GuildUtil', file: _getResourceURL('/js/GuildUtil' + (js_min ? '.min.js' : '.js')), v: '10'},
            {alias: 'EventUtil', file: _getResourceURL('/js/EventUtil.js'), v: '22'},
            {alias: 'Model', file: _getResourceURL('/js/Model' + (js_min ? '.min.js' : '.js')), v: '51'},
            {alias: 'Mailru', file: _getResourceURL('/js/Mailru.js'), v: '5'},
            {alias: 'World', file: _getResourceURL('/js/World.js'), v: '12'},
            {alias: 'Game', file: _getResourceURL('/js/Game' + (js_min ? '.min.js' : '.js')), v: '84'},
            {alias: 'Dice', file: _getResourceURL('/js/Dice.js'), v: '1'},
            {alias: 'Menu', file: _getResourceURL('/js/Menu.js'), v: '17'},
            {alias: 'MainPage', file: _getResourceURL('/js/MainPage' + (js_min ? '.min.js' : '.js')), v: '439'},
            {alias: 'ProfilePage', file: _getResourceURL('/js/ProfilePage' + (js_min ? '.min.js' : '.js')), v: '21'},
            {alias: 'CardsPage', file: _getResourceURL('/js/CardsPage' + (js_min ? '.min.js' : '.js')), v: '24'},
            {alias: 'Cards', file: _getResourceURL('/js/Cards' + (js_min ? '.min.js' : '.js')), v: '77'},
            {alias: 'Campaign', file: _getResourceURL('/js/Campaign' + (js_min ? '.min.js' : '.js')), v: '16'},
            {alias: 'ChestsPage', file: _getResourceURL('/js/ChestsPage' + (js_min ? '.min.js' : '.js')), v: '9'},
            {alias: 'Chests', file: _getResourceURL('/js/Chests' + (js_min ? '.min.js' : '.js')), v: '46'},
            {alias: 'Chat', file: _getResourceURL('/js/Chat' + (js_min ? '.min.js' : '.js')), v: '90'},
            {alias: 'ShopPage', file: _getResourceURL('/js/ShopPage' + (js_min ? '.min.js' : '.js')), v: '24'},
            {alias: 'ArenaPage', file: _getResourceURL('/js/ArenaPage' + (js_min ? '.min.js' : '.js')), v: '18'},
            {alias: 'Popups', file: _getResourceURL('/js/Popups' + (js_min ? '.min.js' : '.js')), v: '25'},
            {alias: 'Popups2', file: _getResourceURL('/js/Popups2' + ('.js')), v: '3'},
            {alias: 'Forum', file: _getResourceURL('/js/Forum' + (js_min ? '.min.js' : '.js')), v: '30'},
            {alias: 'QuestsPage', file: _getResourceURL('/js/QuestsPage' + (js_min ? '.min.js' : '.js')), v: '41'},
            {alias: 'RatingsPage', file: _getResourceURL('/js/RatingsPage' + (js_min ? '.min.js' : '.js')), v: '22'},
            {alias: 'GuildPage', file: _getResourceURL('/js/GuildPage' + (js_min ? '.min.js' : '.js')), v: '61'},
            {alias: 'GuildRaids', file: _getResourceURL('/js/GuildRaids' + (js_min ? '.min.js' : '.js')), v: '8'},
            {alias: 'DungeonPage', file: _getResourceURL('/js/DungeonPage' + (js_min ? '.min.js' : '.js')), v: '6'},
            {alias: 'BattleReplay', file: _getResourceURL('/js/BattleReplay' + (js_min ? '.min.js' : '.js')), v: '11'},
            {alias: 'BattlePage', file: _getResourceURL('/js/BattlePage' + (js_min ? '.min.js' : '.js')), v: '33'},
            {alias: 'LeaguePage', file: _getResourceURL('/js/LeaguePage' + (js_min ? '.min.js' : '.js')), v: '34'},
            {alias: 'LeagueSeason', file: _getResourceURL('/js/LeagueSeason.js'), v: '9'},
            {alias: 'SoundManager', file: _getResourceURL('/js/SoundManager.js'), v: '8'},
            {alias: 'Tutorial', file: _getResourceURL('/js/Tutorial.js'), v: '10'},
            {
                alias: 'AchievementsPage',
                file: _getResourceURL('/js/AchievementsPage' + (js_min ? '.min.js' : '.js')),
                v: '7'
            },
            {alias: 'DailyRewards', file: _getResourceURL('/js/DailyRewards.js'), v: '8'},
            {alias: 'Notifications', file: _getResourceURL('/js/Notifications.js'), v: '41'},
            {alias: 'Purchase', file: _getResourceURL('/js/Purchase' + (js_min ? '.min.js' : '.js')), v: '46'},
            {alias: 'Shop', file: _getResourceURL('/js/Shop.js'), v: '7'},

            {alias: 'BBCodes', file: _getResourceURL('/js/BBCodes.js'), v: '5'},
            {alias: 'Network', file: _getResourceURL('/js/Network_4' + (false && js_min ? '.min.js' : '.js')), v: '46'}
        ],
        lazyList: [
            {alias: 'TutorialOverlay', file: _getResourceURL('/js/TutorialOverlay.js'), v: '3'},
            {alias: 'TutorialScenario', file: _getResourceURL('/js/TutorialScenario.js'), v: '15'},
            {alias: 'TutorialPath', file: _getResourceURL('/js/TutorialPath.js'), v: '1'},
            {alias: 'Avatars', file: _getResourceURL('/js/Avatars.js'), v: '80'},
            {alias: 'SpherePage', file: _getResourceURL('/js/SpherePage.js'), v: '5'},
            {alias: 'BlitzPage', file: _getResourceURL('/js/BlitzPage' + (js_min ? '.min.js' : '.js')), v: '4'},
            {alias: 'GuildBlitzPage', file: _getResourceURL('/js/GuildBlitzPage.js'), v: '34'},
            {alias: 'GuildBlitzUtil', file: _getResourceURL('/js/GuildBlitzUtil.js'), v: '6'},
            {alias: 'SalePage', file: _getResourceURL('/js/SalePage' + (js_min ? '.min.js' : '.js')), v: '63'},
            {alias: 'Sale1', file: _getResourceURL('/js/Sale1' + (js_min ? '.min.js' : '.js')), v: '119'},
            {alias: 'SearchPage', file: _getResourceURL('/js/SearchPage.js'), v: '4'},
            {alias: 'SettingsPage', file: _getResourceURL('/js/SettingsPage' + (js_min ? '.min.js' : '.js')), v: '60'},
            {alias: 'BossPage', file: _getResourceURL('/js/BossPage.js'), v: '21'},
            {alias: 'Agreement', file: _getResourceURL('/js/Agreement' + (js_min ? '.min.js' : '.js')), v: '19'},
            {alias: 'Exeru', file: _getResourceURL('/js/Exeru.js'), v: '2'},
            {alias: 'Fotostrana', file: _getResourceURL('/js/Fotostrana.js'), v: '1'},
            {alias: 'Premium', file: _getResourceURL('/js/Premium' + (js_min ? '.min.js' : '.js')), v: '54'},
            {alias: 'Halloween', file: _getResourceURL('/js/Halloween.js'), v: '43'},
            {alias: 'PVPT', file: _getResourceURL('/js/PVPT' + (js_min ? '.min.js' : '.js')), v: '22'},
            {alias: 'MayEvent', file: _getResourceURL('/js/MayEvent.js'), v: '67'},
            {alias: 'OKUtil', file: _getResourceURL('/js/OKUtil.js'), v: '14' + '.' + Math.random()},
            {alias: 'VKUtil', file: _getResourceURL('/js/VKUtil.js'), v: '50'},
            {alias: 'YandexUtil', file: _getResourceURL('/js/YandexUtil.js'), v: '58.' + Math.random()},
            {alias: 'RBKUtil', file: _getResourceURL('/js/RBKUtil.js'), v: '2'},
            {alias: 'GuildWar', file: _getResourceURL('/js/GuildWar' + (js_min ? '.min.js' : '.js')), v: '42'},
            {alias: 'GuildBuildings', file: _getResourceURL('/js/GuildBuildings' + '.js'), v: '6'},
            {alias: 'Virus', file: _getResourceURL('/js/VirusPage.js'), v: '30'},
            {alias: 'GolemRewards', file: _getResourceURL('/js/GolemRewards.js'), v: '10'},
            {alias: 'GolemArt', file: _getResourceURL('/js/GolemArt.js'), v: '1'},
            {alias: 'StonesPage', file: _getResourceURL('/js/StonesPage.js'), v: '15'},
            {alias: 'MMR', file: _getResourceURL('/js/MMR.js'), v: '15'},
            {alias: 'GuildEvent', file: _getResourceURL('/js/GuildEvent' + (js_min ? '.min.js' : '.js')), v: '8'},
            {alias: 'GoogleReview', file: _getResourceURL('/js/GoogleReview' + (js_min ? '.min.js' : '.js')), v: '8'},
            {alias: 'Debug', file: _getResourceURL('/js/Debug.js'), v: '3'},
            {alias: 'XsollaPS3', file: _getResourceURL('/js/XsollaPS3.js'), v: '4'},
            {alias: 'Labyrinth', file: _getResourceURL('/js/Labyrinth' + (js_min ? '.min.js' : '.js')), v: '28'},
            {alias: 'BattlePath', file: _getResourceURL('/js/BattlePath.js'), v: '33'},
            {alias: 'ChampT', file: _getResourceURL('/js/ChampT' + (js_min ? '.min.js' : '.js')), v: '11'},
            {alias: 'Expedition', file: _getResourceURL('/js/Expedition.js'), v: '9'},
            {alias: 'OVMSDK', file: _getResourceURL('/js/OVMSDK.js'), v: '1.1' + Math.random()},
            {alias: 'MainShopPage', file: _getResourceURL('/js/MainShopPage' + (js_min ? '.min.js' : '.js')), v: '105'},
            {alias: 'MailPage', file: _getResourceURL('/js/MailPage' + (js_min ? '.min.js' : '.js')), v: '48'},
            {alias: 'TrainingPage', file: _getResourceURL('/js/TrainingPage.js'), v: '5'},
            {alias: 'Presents', file: _getResourceURL('/js/Presents.js'), v: '5'},
            {alias: 'AGUtil', file: _getResourceURL('/js/AGUtil.js'), v: '3.' + Math.random()},
            {alias: 'YandexPromoCode', file: _getResourceURL('/js/YandexPromoCode.js'), v: '5'},
            {alias: 'MiniGame', file: _getResourceURL('/js/MiniGame.js'), v: '4'},
            {alias: 'Beeline', file: _getResourceURL('/js/Beeline.js'), v: '1.' + Math.random()},
            {alias: 'Ifree2', file: _getResourceURL('/js/Ifree2.js'), v: '1.' + Math.random()},
            {alias: 'OfferChain', file: _getResourceURL('/js/OfferChain.js'), v: '2.' + Math.random()},
            {alias: 'Playdeck', file: _getResourceURL('/js/Playdeck.js'), v: '1.' + Math.random()},
            {alias: 'GamePush', file: _getResourceURL('/js/GamePush.js'), v: '1.' + Math.random()},
            {alias: 'Yookassa', file: _getResourceURL('/js/Yookassa.js'), v: '1.' + Math.random()},
        ],
        getCFG: function (alias) {
            let list = this.list, cfg;
            for (let i = 0; i < list.length; i++) {
                if ((cfg = list[i]).alias === alias) return cfg;
            }
            list = this.lazyList;
            for (let i = 0; i < list.length; i++) {
                if ((cfg = list[i]).alias === alias) return cfg;
            }
        },
        getPath: function (alias) {
            return this.getPath0(this.getCFG(alias));
        },
        getPath0: function (cfg) {
            return cfg.file + '?v=' + this.v + '.' + cfg.v;
        }
    };

    var images = {
        v: '8.0.38',
        list: [
            {file: _getResourceURL('/images/avatars/female/1.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/female/2.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/female/3.jpg'), v: '3'},
            {file: _getResourceURL('/images/avatars/female/4.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/male/1.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/male/2.jpg'), v: '2'},
            {file: _getResourceURL('/images/avatars/male/3.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/male/4.jpg'), v: '1'},
            {file: _getResourceURL('/images/brd_block_friday.jpg'), v: '2'},
            {file: _getResourceURL('/images/brd_block_golem_runic.jpg'), v: '1'},
            {file: _getResourceURL('/images/brd_block_golem_stone.jpg'), v: '1'},
            {file: _getResourceURL('/images/cards/vampire.jpg'), v: '2'},
            {file: _getResourceURL('/images/cards/vampire2.jpg'), v: '2'},
            {file: _getResourceURL('/images/chgift.png'), v: '1'},
            {file: _getResourceURL('/images/festival-forge-platform-150.png'), v: '1'},
            {file: _getResourceURL('/images/festival-forge-platform-300.png'), v: '1'},
            {file: _getResourceURL('/images/fire-currency-68.png'), v: '1'},
            {file: _getResourceURL('/images/fire-festival-popup-bg.jpg'), v: '1'},
            {file: _getResourceURL('/images/fire-gift-brazier.png'), v: '1'},
            {file: _getResourceURL('/images/fire-gift-chest.png'), v: '1'},
            {file: _getResourceURL('/images/fire-shop-promo.jpg'), v: '1'},
            {file: _getResourceURL('/images/guild_bg_640_1200.jpg'), v: '4'},
            {file: _getResourceURL('/images/guild_bg_750_750.jpg'), v: '4'},
            {file: _getResourceURL('/images/labyrinth/sprite_drop.png'), v: '1'},
            {file: _getResourceURL('/images/main_bg_640_1200.jpg'), v: '2'},
            {file: _getResourceURL('/images/main_v2/background-reference-v3-sunny.jpg'), v: '1'},
            {file: _getResourceURL('/images/main_v2/background-vertical-v5.jpg'), v: '1'},
            {file: _getResourceURL('/images/main_v2/arena-v1.png'), v: '1'},
            {file: _getResourceURL('/images/main_v2/castle-grass-v3.png'), v: '1'},
            {file: _getResourceURL('/images/main_v2/chest-v1.png'), v: '1'},
            {file: _getResourceURL('/images/main_v2/dungeon-v1.png'), v: '1'},
            {file: _getResourceURL('/images/main_v2/plate-stone-ready-v2.svg'), v: '1'},
            {file: _getResourceURL('/images/main_v2/plate-stone-v1.svg'), v: '1'},
            {file: _getResourceURL('/images/main_v2/portal-v1.png'), v: '1'},
            {file: _getResourceURL('/images/main_v2/ship-large-v1.png'), v: '1'},
            {file: _getResourceURL('/images/main_v2/ship-small-v1.png'), v: '1'},
            {file: _getResourceURL('/images/main_v2/shop-v1.png'), v: '1'},
            {file: _getResourceURL('/images/talisman_menu/talisman-thread-v10.png'), v: '1'},
            {file: _getResourceURL('/images/talisman_menu/talismans-atlas.png'), v: '1'},
            {file: _getResourceURL('/images/talisman_menu/utility-stone-gray.svg'), v: '1'},
            {file: _getResourceURL('/images/avatars/event/hb_26_w_f.jpg'), v: '1'},
            {file: _getResourceURL('/images/avatars/event/hb_26_w_m.jpg'), v: '1'},
            {file: _getResourceURL('/images/golems/golem-runic.png'), v: '1'},
            {file: _getResourceURL('/images/golems/golem-runic-main.png'), v: '1'},
            {file: _getResourceURL('/images/golems/golem-runic-dead.png'), v: '1'},
            {file: _getResourceURL('/images/golems/golem-stone.png'), v: '1'},
            {file: _getResourceURL('/images/golems/golem-stone-main.png'), v: '1'},
            {file: _getResourceURL('/images/golems/golem-stone-dead.png'), v: '1'},
            {file: _getResourceURL('/images/main_bg_750_750.jpg'), v: '2'},
            {file: _getResourceURL('/images/league-season-rewards-sprite.png'), v: '1'},
            {file: _getResourceURL('/images/present_leaf.png'), v: '1'},
            {file: _getResourceURL('/images/puzzle/halloween.png'), v: '2'},
            {file: _getResourceURL('/images/sprite_battle.png'), v: '11'},
            {file: _getResourceURL('/images/sprite_bf.png'), v: '1'},
            {file: _getResourceURL('/images/sprite_bp.png'), v: '7'},
            {file: _getResourceURL('/images/sprite_cards_icons.png'), v: '34'},
            {file: _getResourceURL('/images/sprite_cosmos.png'), v: '4'},
            {file: _getResourceURL('/images/sprite_decor.png'), v: '16'},
            {file: _getResourceURL('/images/sprite_gems.png'), v: '2'},
            {file: _getResourceURL('/images/sprite_gems2.png'), v: '10'},
            {file: _getResourceURL('/images/sprite_magic.png'), v: '4'},
            {file: _getResourceURL('/images/sprite_main.png'), v: '39'},
            {file: _getResourceURL('/images/sprite_ny.png'), v: '2'},
            {file: _getResourceURL('/images/sprite_relic.png'), v: '2'},
            {file: _getResourceURL('/images/tutorial/bella.png'), v: '1'}
        ],
        getPath: function (path) {
            // готовый адрес из getURLUsedByCSS; относительный путь с ?v= (BBCodesUtil) по-прежнему получает хост
            if (path.startsWith('http') && path.indexOf('?v=') !== -1) return path;
            if (path.startsWith('https') || path.startsWith('http')) {
            } else {
                path = _getResourceURL(path);
            }
            const cfg = this.getCFG(path);
            if (cfg) {
                return cfg.file + '?v=' + this.v + '.' + cfg.v;
            }
            // хост уже есть: повторный _getResourceURL склеивал чужой хост с wrap («/https://vk.keepers.mobi/images/...», 404)
            return path + '?v=' + this.v;
        },
        // хост как у подключённого CSS (_cssPath), версия — из images.list (в CSS — из ServerUtil.IMAGES_LIST, должны совпадать)
        getURLUsedByCSS: function (path) {
            const cfg = this.getCFG(_getResourceURL(path));
            const host = _getPlatform() === 'SITE' ? KEEPERS_HOST : socialImages.host();
            return host + path + '?v=' + this.v + (cfg ? '.' + cfg.v : '');
        },
        getCFG: function (alias) {
            return this.list.find(_cfg => _cfg.file === alias);
        }
    };

    return {
        init: function (progress) {
            let self = this;
            let total = 2;
            progress.set(0, total, 'Загрузка ресурсов');
            let onLoad = function () {
                progress.progress++;
                if (progress.isComplete()) {
                    self.updateLayout();

                    progress.set(0, self.LAYOUT.VK ? 3 : 2, 'Загрузка ресурсов');
                    onLoad = function () {
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

        updateLayout: function () {
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
                    LAYOUT.screen = {w: w0, h: h0};
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
                    LAYOUT.screen = {w: w0, h: h0};
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

            LAYOUT.convert = function (value) {
                if (this.scale < 1) {
                    value *= this.scale;
                }
                return value;
            };

            LAYOUT.convert0 = function (value) {
                if (this.scale < 1) {
                    value *= 1 / this.scale;
                }
                return value;
            };

            LAYOUT.getClientWHS0 = function (h, flags) {
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
        loadCSS: function (alias, onLoad) {
            const head = document.getElementsByTagName('head')[0];
            const link = document.createElement('link');
            link.onload = function () {
                onLoad();
            };
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = css.getPath(alias);
            head.appendChild(link);
        },

        JS: js,
        loadJS: function (alias, onLoad) {
            let path = js.getPath(alias);
            this.loadJS0(path, onLoad);
        },
        loadJS1: function (alias, onLoad, onError) {
            if (app[alias]) {
                onLoad();
            } else {
                let path = js.getPath(alias);
                this.loadJS0(path, onLoad, onError);
            }
        },
        loadJS0: function (path, onLoad, onError) {
            let el = document.createElement('script');
            el.type = 'text/javascript';
            el.onload = function () {
                onLoad();
            };
            // без этого при обрыве сети вызывающий ждёт onLoad вечно
            el.onerror = function () {
                el.parentNode.removeChild(el);
                if (onError) onError();
            };
            el.src = path;
            document.getElementsByTagName('head')[0].appendChild(el);
        },
        loadGSAP: function (onLoad) {
            this.loadJS0(_getResourceURL('/js/libs/gsap/TweenMax.min.js'), onLoad);
        },
        loadJSAll: function (onLoad, onComplete) {
            let self = this;
            let list = js.list;
            let progress = 0;
            let total = list.length;
            let load = function (cfg) {
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
        loadIMGs: function (sources, onLoad, onComplete) {
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
                p.then(function (data) {
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
            isOn: function () {
                return this.value;
            },
            off: function () {
                if (this.tID) {
                    clearTimeout(this.tID);
                }
                this.value = 0;
            },
            on: function () {
                let self = this;
                self.tID = setTimeout(function () {
                    self.value = 1;
                    app.onResize();
                }, 500);
            }
        },

        onResize: function () {
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
                        p.els.dark.style.height = app.LAYOUT.getClientWHS0(app.Menu.getDarkGap(), 1) + 'px';
                    }
                }

                // на body ещё scene-covered, chest-ready
                document.body.className = document.body.className.replace(/\bb\d+_1200\b/, 'b{0}_1200'.format(app.LAYOUT.w));
                app.World.fitMainToScreen();
                app.Utils.el('main').style.width = app.LAYOUT.w + 'px';

                if (app.LAYOUT.scale < 1) {
                    app.Utils.el('main').style.transform = 'scale(' + app.LAYOUT.scale + ')';
                } else {
                    app.Utils.el('main').style.transform = '';
                }

                let cfg = app.MainPage.getCFG();
                app.MainPage.layoutAboveFooter();
                cfg.content.scroll.top = Math.max(-210, (app.LAYOUT.convert0(app.LAYOUT.h) - app.LAYOUT.maxH) / 2);
                cfg.content.scroll.topMax = app.LAYOUT.maxH - app.LAYOUT.convert0(app.LAYOUT.h);
                cfg.content.scroll.el.style.top = cfg.content.scroll.top + "px";

                if (app.GuildPage) {
                    let content = app.GuildPage.getCFG();
                    if (content) {
                        // как в GuildPage.create: в новом оформлении сцена уходит под полупрозрачное меню
                        content.els.main.style.height = app.LAYOUT.convert0(app.LAYOUT.h) - (app.UserUtil.isOldDesign() ? app.Menu.getFooterHeight() : 0) + 'px';
                        content.scroll.top = Math.max(-210, (app.LAYOUT.convert0(app.LAYOUT.h) - app.LAYOUT.maxH) / 2);
                        content.scroll.topMax = app.LAYOUT.maxH - app.LAYOUT.convert0(app.LAYOUT.h);
                        content.scroll.el.style.top = content.scroll.top + "px";
                    }
                }

                if (app.Menu) app.Menu.updateWHS();
                app.Popups.updateWHS();
            } catch (e) {
                console.error(e);
            }
        },

        getResourceURL: function (path) {
            return _getResourceURL(path);
        },

        loadEruda() {
            app.loadJS0('https://cdn.jsdelivr.net/npm/eruda', () => {
                eruda.init();
            });
        }
    };
})();
