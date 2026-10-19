app.Network = (function() {

    var num = 0;
    var listeners = {};
    var socket;

    // До подтверждения Auth/Reconnect у сокета нет GameSession, и любая команда
    // отлетит с "Game session not found" -> events {error: {code: -2}}.
    // Поэтому до подтверждения команды копим, а не отправляем
    var sessionReady = false;
    // num последней отправленной Auth/Reconnect, по ответу на неё открываем очередь
    var authNum = 0;
    var authSentAt = 0;
    var sendQueue = [];
    // предохранитель от бесконечного накопления, если связи нет долго
    var SEND_QUEUE_LIMIT = 50;

    // Команды, которые безопасно отправить повторно после обрыва: читающие и идемпотентные.
    // Мутирующие сюда добавлять НЕЛЬЗЯ, пока сервер не дедуплицирует по ключу —
    // повторная покупка или открытие сундука выполнятся дважды.
    var RETRY_SAFE = ['ChatMessages', 'ChatViewed', 'ChatClosed',
        'GuildChatMessages', 'GuildChatViewed', 'MailDialogs', 'MailDialogMessages',
        'SupportTicketMessages', 'ForumTopicsGet', 'ForumTopicGet',
        'Ping', 'ClientMetrics'];
    // sendReport живёт в create(), сюда выносим ссылку для публичного report()
    var reportFn;

    // Диагностика: серверной агрегации нет, счётчики отдаются через app.Network.stats()
    var stats = {
        connects: 0,
        reconnects: 0,
        disconnects: {},
        forced: {},
        fallbacks: 0,
        probesSent: 0,
        probesLost: 0,
        queued: 0,
        dropped: 0,
        retried: 0,
        flushed: 0,
        downMs: 0,
        lastDownAt: 0
    };

    function bump(map, key) {
        map[key] = (map[key] || 0) + 1;
    }

    function transportName() {
        return socket && socket.io && socket.io.engine && socket.io.engine.transport
            ? socket.io.engine.transport.name : null;
    }

    function emitCommand(data) {
        let entry = listeners['num_' + data.num];
        if (entry) entry.sentAt = Date.now();
        socket.emit('command', data);
    }

    function flushSendQueue() {
        if (!sendQueue.length) return;
        console.log('socketio ::: flush send queue: ' + sendQueue.length);
        let list = sendQueue;
        sendQueue = [];
        stats.flushed += list.length;
        for (let i = 0; i < list.length; i++) {
            emitCommand(list[i]);
        }
    }

    // самая старая отправленная команда без ответа
    function oldestPendingMs() {
        let now = Date.now();
        let oldest = 0;
        for (let key in listeners) {
            let sentAt = listeners[key].sentAt;
            if (!sentAt) continue;
            let age = now - sentAt;
            if (age > oldest) oldest = age;
        }
        return oldest;
    }

    const State = {
        NONE: 0,
        CONNECTING: 1,
        CONNECTED: 2,
        RECONNECTING: 3,
        CONNECT_ERROR: 4,
        SERVER_ERROR: 5,
        SERVER_DISCONNECT: 6
    };

    function resolveUrl() {
        if (typeof VK_ODR !== 'undefined' && VK_ODR) {
            return VK_ODR_SERVER_WS_URL;
        }

        let host = window.location.host;
        // for docker
        /*if (true) {
            return 'http://' + window.location.hostname + ':10086';
        } else*/
        if (host.startsWith('localhost')
            || host.startsWith('l1')
            || host.startsWith('l2')
            || host.startsWith('l3')
            || host.startsWith('192.168.')
            || host.startsWith('95.170.152.16')
            || host.startsWith('37.192.45.123')

            || host.startsWith('103.71.20.207')
            || host.startsWith('test')
            || host.startsWith('t1')
            || host.startsWith('t2')
        ) {
            // со страницы по https браузер блокирует ws://, а 9086 без TLS — идём через nginx на 443
            return location.protocol === 'https:'
                ? 'https://' + window.location.hostname
                : 'http://' + window.location.hostname + ':9086';
        } else if (window._GAMEPUSH) {
            return 'https://gp.keepers.mobi';
        } else if (window._YANDEX) {
            // 19.08.2026: websocket проходит и через 443, переезд не проверен на игроках
            return 'https://ya.keepers.mobi:444';
        } else if (host.startsWith('vk.')) {
            return 'https://' + window.location.hostname + ':444';
        } else {
            // 443, а не отдельный порт: нестандартные порты закрыты в части сетей.
            // nginx отдаёт /socket.io/ на апстрим 9086
            return 'https://' + window.location.hostname;
        }
    }

    // пользовательский текст ходит через encodeJSUnicode/decodeJSUnicode

    function encodeOutgoing(data) {
        switch (data.cmd) {
            case 'ChatMessageAdd':
            case 'ChatMessageEdit':
            case 'GuildChatMessageAdd':
            case 'SupportTicketMessageAdd':
            case 'MailDialogMessageAdd':
            case 'ForumTopicCommentCreate':
            case 'SupportTicketCreate':
            {
                if (data.text) {
                    data.text = app.Utils.encodeJSUnicode(data.text);
                }
                break;
            }
            case 'ForumTopicCreate':
            {
                if (data.subject) data.subject = app.Utils.encodeJSUnicode(data.subject);
                if (data.text) data.text = app.Utils.encodeJSUnicode(data.text);
                break;
            }
        }
    }

    function decodeCommandResponse(cmd, e) {
        switch (cmd) {
            case 'ChatMessageAdd':
            case 'ChatMessageEdit':
            case 'GuildChatMessageAdd':
            case 'SupportTicketMessageAdd':
            case 'MailDialogMessageAdd':
            {
                if (e.message) {
                    if (e.message.t) {
                        e.message.t = app.Utils.decodeJSUnicode(e.message.t);
                    }
                }
                break;
            }
            case 'ForumTopicCreate':
            {
                if (e.topic) {
                    e.topic.s = app.Utils.decodeJSUnicode(e.topic.s);
                    e.topic.txt = app.Utils.decodeJSUnicode(e.topic.txt);
                }
                break;
            }
            case 'ForumTopicsGet':
            {
                if (e.topics) {
                    e.topics.forEach(topic => {
                        topic.s = app.Utils.decodeJSUnicode(topic.s);
                        topic.txt = app.Utils.decodeJSUnicode(topic.txt);
                    });
                }
                break;
            }
            case 'ForumTopicGet':
            {
                if (e.topic) {
                    e.topic.txt = app.Utils.decodeJSUnicode(e.topic.txt);
                }
                if (e.comments) {
                    e.comments.forEach(comment => {
                        comment.txt = app.Utils.decodeJSUnicode(comment.txt);
                    });
                }
                break;
            }
            case 'ForumTopicCommentCreate':
            {
                if (e.comment) {
                    e.comment.txt = app.Utils.decodeJSUnicode(e.comment.txt);
                }
                break;
            }
            case 'ChatMessages':
            case 'GuildChatMessages':
            case 'MailDialogMessages':
            {
                if (e.list) {
                    e.list.forEach(message => {
                        if (message.t) {
                            message.t = app.Utils.decodeJSUnicode(message.t);
                        }
                    });
                }
                break;
            }
            case 'MailDialogs':
            {
                if (e.list) {
                    e.list.forEach(dialog => {
                        if (dialog.last && dialog.last.t) {
                            dialog.last.t = app.Utils.decodeJSUnicode(dialog.last.t);
                        }
                    });
                }
                break;
            }
            case 'SupportTicketMessages':
            {
                if (e.list) {
                    e.list.forEach(message => {
                        if (message.t) {
                            message.t = app.Utils.decodeJSUnicode(message.t);
                        }
                    });
                }
                break;
            }
        }
    }

    function decodeEvent(e) {
        switch (e.type) {
            case 'CHAT_MESSAGE_NEW':
            case 'CHAT_MESSAGE_UPDATE':
            {
                if (e.message) {
                    e.message.t = app.Utils.decodeJSUnicode(e.message.t);
                }
                break;
            }
            case 'MAIL_DIALOG_MESSAGE_NEW':
            {
                if (e.dialog) {
                    let dialog = e.dialog;
                    if (dialog && dialog.last) {
                        dialog.last.t = app.Utils.decodeJSUnicode(dialog.last.t);
                    }
                }
                break;
            }
            case 'FORUM':
            {
                switch (e.data.type) {
                    case 'TOPIC_UPDATE':
                    {
                        if (e.data.topic) {
                            let topic = e.data.topic;
                            topic.txt = app.Utils.decodeJSUnicode(topic.txt);
                        }
                        break;
                    }
                    case 'COMMENT_NEW':
                    case 'COMMENT_UPDATE':
                    {
                        if (e.data.comment) {
                            let comment = e.data.comment;
                            comment.txt = app.Utils.decodeJSUnicode(comment.txt);
                        }
                        break;
                    }
                }
                break;
            }
        }
    }

    function init() {
        console.log('init');
        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.onload = function () {
            console.log('socket loaded');
            create();
        };
        script.src = app.getResourceURL('/js/libs/socket.io.v2.2.0.js');
        document.getElementsByTagName('head')[0].appendChild(script);
    }

    function create() {
        // повторный io.connect вернул бы закешированный Manager/Socket и навесил бы
        // все обработчики второй раз: двойной Auth, двойной сторож, двойные подписки
        if (socket) return;

        let url = resolveUrl();
        console.log(url);
        //debug(url);

        if (app.LAYOUT._OPERA_MINI || app.LAYOUT._OPERA || app.LAYOUT._UC) {
            //socket = io.connect(url, {autoConnect: false, reconnection: false, transports: ['polling'], timeout: 5000});
        } else {
            //socket = io.connect(url, {autoConnect: false, reconnection: false, transports: ['websocket', 'polling'], timeout: 5000});
        }
        // reconnection ведёт socket.io. Руками соединение не переоткрываем:
        // это дало бы два параллельных коннекта
        socket = io.connect(url, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            randomizationFactor: 0.5,
            transports: ['websocket', 'polling'],
            // polling-only ломался в iframe ВК: сессия поднималась, но входящих данных не было
            // transports: ['polling'],
            // upgrade: false,
            timeout: 10000
        });

        let state = {code: State.NONE};
        let changeState = function(code, data) {
            state.code = code;
            if (data) {
                state.data = data;
            } else {
                delete state.data;
            }
        };

        // хоть раз доходили до рабочего соединения: до этого момента обрыв — это
        // "игра не запустилась" и о нём надо сказать, после — молча переподключаемся
        let everConnected = false;

        let startedAt = Date.now();

        // живость канала: измерения и пороги

        // Связь пропадает тихо, без FIN/RST, а engine.io замечает это только через
        // pingInterval + pingTimeout = 85с, и всё это время socket.connected врёт
        let lastInbound = Date.now();
        // Порог держать выше pingInterval (25с): иначе зонд будет уходить на здоровом
        // соединении, где понг сам обновляет lastInbound
        // Выше pingInterval (25с) с запасом на дрожание: при прежних 30с зазор был
        // пять секунд, и любой притормозивший таймер уводил простаивающее соединение
        // в зонд, а оттуда в реконнект. На активном игроке скорость реакции не падает —
        // там раньше срабатывает проверка по oldestPendingMs
        const INBOUND_SILENCE_LIMIT = 40000;

        // Зависшая команда — повод для зонда, а не для разрыва: на мобильных сетях
        // всплеск RTT в пару секунд обычное дело. Пороги от измеренной задержки игрока
        let rtt = [];
        function noteRtt(ms) {
            rtt.push(ms);
            if (rtt.length > 20) rtt.shift();
        }
        function rttMedian() {
            if (!rtt.length) return 200;
            let a = rtt.slice().sort(function(x, y) { return x - y; });
            return a[Math.floor(a.length / 2)];
        }
        // Шестикратный запас к медиане. Нижняя граница по транспорту: на polling ответ
        // ждёт пересоздания удерживаемого long-poll GET, и с секундным порогом зонд
        // рвал бы живой канал. Неизвестный транспорт считаем polling'ом
        const SUSPECT_FLOOR = {websocket: 3000, polling: 5000};
        function suspectMs() {
            let floor = SUSPECT_FLOOR[transportName()] || SUSPECT_FLOOR.polling;
            return Math.max(floor, rttMedian() * 6);
        }
        // канал отвечает, а конкретная команда висит — что-то заклинило, переподключаемся
        const COMMAND_STUCK_LIMIT = 25000;
        // после удачного зонда не дёргаем его снова, пока висит та же медленная команда
        const PROBE_COOLDOWN = 10000;

        let touchInbound = function() {
            lastInbound = Date.now();
        };

        // Уходит только после реконнекта: здоровая сессия не шлёт ничего.
        // Без колбэка — ответ не нужен, а листенер висел бы в памяти
        let sendReport = function(reason) {
            let data = JSON.parse(JSON.stringify(stats));
            data.reason = reason;
            data.ageMs = Date.now() - startedAt;
            data.transport = transportName();
            // app.Network.command({cmd: 'ClientMetrics', data: data});
        };
        reportFn = sendReport;

        // рвём транспорт, а не socket.disconnect(): последний выставляет skipReconnect,
        // и socket.io перестанет переподключаться сам
        // key отдельно от reason: reason содержит миллисекунды, и ключами счётчика
        // они бы плодили по строке на каждый разрыв
        let forceReconnect = function(key, reason) {
            if (!socket.connected) return;
            console.log('socketio ::: force reconnect: ' + (reason || key) + ', тишина ' + (Date.now() - lastInbound) + 'мс');
            bump(stats.forced, key);
            if (socket.io && socket.io.engine) {
                socket.io.engine.close();
            }
        };

        // зонд и сторож

        // Активная проверка живости: socket.connected в мёртвом соединении врёт.
        // Ping наследуется от Command, а не SecureCommand, поэтому сессии не требует

        // столько тишины должно накопиться, чтобы событийный зонд имел смысл
        const PROBE_MIN_SILENCE = 10000;
        let probeInFlight = false;
        let lastProbeOk = 0;
        // растёт на каждый connect: таймаут зонда не должен рвать соединение,
        // которое успело смениться, пока зонд был в полёте
        let connGen = 0;

        // minSilence: не зондировать, если входящий трафик был только что —
        // иначе каждое переключение вкладки стоит пакета и строки в серверном логе
        let probe = function(reason, minSilence) {
            // один зонд за раз: второй бесполезен и упёрся бы в серверный
            // дедуп "still in process"
            if (probeInFlight) return;
            if (!socket.connected) return;
            if (minSilence && Date.now() - lastInbound < minSilence) return;

            probeInFlight = true;
            stats.probesSent++;
            const gen = connGen;

            let answered = false;

            app.Network.command({cmd: 'Ping'}, function() {
                answered = true;
                // ответ мог прийти на переотправку после реконнекта —
                // состояние нового соединения не трогаем
                if (gen !== connGen) return;
                probeInFlight = false;
                lastProbeOk = Date.now();
                touchInbound();
            });
            // command() присвоил зонду текущий num — запоминаем, чтобы прибрать
            // за собой, если ответа не будет: иначе колбэк повиснет в listeners навсегда
            let probeNum = num;

            const deadline = suspectMs();
            const startedAt = Date.now();

            setTimeout(function() {
                if (answered) return;
                // проверка поколения строго до любых действий: устаревший таймаут
                // не должен гасить probeInFlight и запись зонда, отправленного
                // уже новым соединением
                if (gen !== connGen) return;

                probeInFlight = false;
                delete listeners['num_' + probeNum];

                // Таймаут — обычный setTimeout, и при заморозке JS-потока он срабатывает
                // позже срока, а на планшетах может выполниться раньше разбора уже
                // пришедшего ответа. Просроченный больше чем вдвое таймаут означает
                // замерший поток, а не потерянный пакет: рвать связь тут нельзя
                if (Date.now() - startedAt > deadline * 2) {
                    console.log('socketio ::: probe timeout stale, поток замирал');
                    return;
                }

                stats.probesLost++;
                console.log('socketio ::: probe lost (' + reason + ')');
                forceReconnect('probe lost', 'probe lost: ' + reason);
            }, deadline);
        };

        // Сторож: событий браузера недостаточно, соединение умирает и при активной вкладке
        setInterval(function() {
            if (!socket.connected) return;
            // в engine.io v3 пинги шлёт клиент, а у скрытой вкладки браузер клампит
            // таймеры: тишина там не обрыв. Возврат покрыт зондом на visibilitychange
            if (document.hidden) return;

            // Auth/Reconnect может остаться без ответа, а без колбэка его нет в listeners.
            // Зонд не спасает: Ping отвечает и без сессии. Не поймать — очередь закрыта
            if (authNum && Date.now() - authSentAt > COMMAND_STUCK_LIMIT) {
                forceReconnect('auth stuck');
                return;
            }

            let pending = oldestPendingMs();

            if (pending > COMMAND_STUCK_LIMIT) {
                forceReconnect('command stuck', 'command stuck ' + pending + 'мс');
                return;
            }

            if (pending > suspectMs() && Date.now() - lastProbeOk > PROBE_COOLDOWN) {
                probe('pending ' + pending + 'мс');
                return;
            }

            // на простое сначала зонд, а не разрыв: разовая задержка понга
            // не повод платить полным Reconnect'ом
            if (Date.now() - lastInbound > INBOUND_SILENCE_LIMIT) {
                probe('inbound silence');
            }
        }, 500);

        // транспорты: в socket.io 2.x автофолбэка нет (tryAllTransports только с 4.7.1),
        // откат websocket -> polling делаем руками. Откат — пауза, а не запрет

        // откаты подряд без успешного websocket; задаёт длину паузы до его возврата
        let pollingFallbacks = 0;
        // Первая пауза короткая: TransportError часто разовый (сеть/прокси моргнули).
        // Дальше длиннее, чтобы не долбить заведомо закрытый websocket реконнектами
        const WS_RETRY_DELAYS = [2 * 60000, 5 * 60000, 15 * 60000];
        let wsRetryTimer = 0;
        // пауза вышла, но вкладка была в фоне — дорвём при visibilitychange
        let wsRetryPending = false;

        // Manager читает opts.transports только при следующем open: живое polling-соединение
        // от восстановления opts само не перейдёт, для этого нужен retryWebsocket.
        // Таймер не гасим: иначе переключение вкладки отменяло бы назревающий возврат
        let restoreWebsocketOpts = function() {
            if (socket.io.opts.transports.length > 1) return;
            socket.io.opts.transports = ['websocket', 'polling'];
            console.log('socketio ::: transports restored to [websocket, polling]');
        };

        let retryWebsocket = function() {
            restoreWebsocketOpts();
            if (!socket.connected || transportName() !== 'polling') return;
            // в фоне соединение не рвём: сторож там молчит по той же причине
            if (document.hidden) {
                wsRetryPending = true;
                return;
            }
            forceReconnect('ws retry');
        };

        let fallbackToPolling = function() {
            // сети нет вовсе — это не проблема websocket, счётчик не расходуем
            if (navigator.onLine === false) return false;
            if (socket.io.opts.transports.length <= 1) return false;
            console.log('try to change transports to [polling]');
            socket.io.opts.transports = ['polling'];
            pollingFallbacks++;
            stats.fallbacks++;
            if (wsRetryTimer) clearTimeout(wsRetryTimer);
            wsRetryTimer = setTimeout(retryWebsocket,
                WS_RETRY_DELAYS[Math.min(pollingFallbacks - 1, WS_RETRY_DELAYS.length - 1)]);
            changeState(State.RECONNECTING);
            return true;
        };

        // события socket.io

        socket.on('connect', function() {
            console.log('socketio ::: connect');
            //debug('socketio ::: connect');
            changeState(State.CONNECTED);
            connGen++;
            stats.connects++;
            let isReconnect = everConnected;
            if (isReconnect) stats.reconnects++;
            if (stats.lastDownAt) {
                stats.downMs += Date.now() - stats.lastDownAt;
                stats.lastDownAt = 0;
            }
            everConnected = true;
            touchInbound();
            // медиана прошлого соединения, возможно другого транспорта, занизила бы
            // таймаут зонда: 130мс с websocket дают секунду на polling
            rtt = [];
            if (pollingFallbacks && transportName() === 'websocket') {
                // websocket снова работает: следующий откат начнёт отсчёт пауз заново
                pollingFallbacks = 0;
                wsRetryPending = false;
            }
            // сокет новый, сессии на сервере под ним ещё нет — ждём Auth/Reconnect
            sessionReady = false;
            // пакеты, буферизованные socket.io в разрыве, устарели; socket.io отправил бы
            // их сразу после обработчиков connect — то есть ПОСЛЕ свежей Auth
            socket.sendBuffer = [];

            app.EventDispatcher.emit('network connected');

            if (isReconnect) {
                sendReport('reconnect');
            }
        });

        socket.on('command', function(data) {
            //console.log('socketio ::: command');
            touchInbound();
            let e = JSON.parse(data);

            // Определяем сами, а не по вызову извне: не зависим от версии index.html.
            // Обязательно ДО колбэков: они не обёрнуты в try/catch, и исключение
            // оставило бы очередь закрытой навсегда
            if (authNum && e.num === authNum) {
                authNum = 0;
                if (e.error) {
                    // сессию поднять не удалось: очередь не откроется, поэтому
                    // не молчим, а показываем игроку экран с «Обновить».
                    // AUTH_ERROR: index.html покажет причину сам (например, протухший токен билайна)
                    app.EventDispatcher.emit('network disconnected', {code: 'AUTH_ERROR'});
                } else {
                    sessionReady = true;
                    flushSendQueue();
                }
            }

            if (e.server) {
                if (app && app.TimeUtil) {
                    app.TimeUtil._update(e.server);
                }
            }

            // запись снимаем до обработки: исключение ниже не должно оставить её
            // в listeners, иначе сторож посчитает команду зависшей и порвёт соединение
            let entry;
            if (e.num && listeners['num_' + e.num]) {
                entry = listeners['num_' + e.num];
                delete listeners['num_' + e.num];
                if (entry.sentAt) noteRtt(Date.now() - entry.sentAt);
            }

            if (entry) {
                decodeCommandResponse(entry.cmd, e);
            }

            if (e.cookies) {
                let cookies = [];
                e.cookies.forEach(cookie => cookies.push(cookie));
                if (cookies.length > 0) {
                    app.Utils.setCookies(cookies).then(() => {
                        if (e.reload) {
                            location.reload(false);
                        }
                    });
                } else if (e.reload) {
                    location.reload(false);
                }
            }

            if (e.user) {
                app.EventDispatcher.emit('UPDATE_USER_DATA', e.user);
            }

            // update last action time
            if (e.user && e.user.lat) {
            } else if (app.Model && app.Model.user) {
                app.Model.user.lat = app.TimeUtil.now();
            }

            if (e.events && e.events.list) {
                // ev, а не e: прежнее `let list = e.events.list, e;` читало e
                // в temporal dead zone — ReferenceError на любом ответе с events
                let list = e.events.list, ev;
                for (let i = 0; i < list.length; i++) {
                    ev = list[i];
                    if (ev.type === 'DISCONNECT') {
                        changeState(State.SERVER_DISCONNECT, ev);
                        app.EventDispatcher.emit('network disconnected', {code: ev.code});
                        socket.disconnect();
                        return;
                    }
                    if (app.GAME_STATE === 1) {
                        if (app.EventUtil) {
                            app.EventUtil.PROCESS_EVENT(ev);
                        }
                    }
                }
            }

            if (entry && entry.callback) {
                entry.callback.call(null, e);
            }

        });

        socket.on('events', function(data) {
            //console.log('socketio ::: events');
            touchInbound();

            let events;
            try {
                events = JSON.parse(data);
            } catch (e) {
                console.error(e, data);
            }

            if (!events) {
                app.EventDispatcher.emit('network disconnected', {code: 'SERVER_ERROR'});
                return;
            }

            if (events.error) {
                switch (events.error.code) {
                    case -1:
                        app.EventDispatcher.emit('network disconnected', {code: 'SERVER_ERROR'});
                        break;
                    case -2:
                        app.EventDispatcher.emit('network disconnected', {showConnectionLost: 0});
                        app.Utils.showInfo('Необходимо перезагрузить игру');
                        break;
                }
                return;
            }

            if (events.list) {
                let list = events.list, e;
                for (let i = 0; i < list.length; i++) {
                    e = list[i];
                    if (e.type === 'DISCONNECT') {
                        changeState(State.SERVER_DISCONNECT, e);
                        app.EventDispatcher.emit('network disconnected', {code: e.code});
                        socket.disconnect();
                        return;
                    }
                    if (app.GAME_STATE === 1) {
                        if (app.EventUtil) {
                            decodeEvent(e);
                            app.EventUtil.PROCESS_EVENT(e);
                        }
                    }
                }
            }
        });

        socket.on('connect_error', function(data) {
            // не console.error: перехватчик в index.html шлёт его на сервер командой Error
            console.log('socketio ::: connect_error', data, JSON.stringify(data));

            // try to polling
            if (typeof data === 'object' && data.type === 'TransportError') {
                if (fallbackToPolling()) return;
            }

            let stateCode = state.code;

            changeState(State.CONNECT_ERROR, data);

            // игра уже работала — молча переподключаемся дальше, игроку показывать нечего
            if (everConnected) return;

            if (stateCode === State.NONE || stateCode === State.RECONNECTING) {
                app.EventDispatcher.emit('network disconnected');
            }
        });

        socket.on('connect_timeout', function() {
            console.log('socketio ::: connect_timeout');

            if (state.code === State.CONNECT_ERROR) {
                // try to polling
                if (typeof state.data === 'object' && state.data.type === 'TransportError') {
                    if (fallbackToPolling()) return;
                }
                if (everConnected) return;
                app.EventDispatcher.emit('network disconnected');
            }
        });


        // reconnect

        socket.on('reconnect', function(data) {
            console.log('socketio ::: reconnect');
            console.log(data);
        });

        socket.on('reconnect_attempt', function(data) {
            console.log('socketio ::: reconnect_attempt');
            console.log(data);
        });

        socket.on('reconnecting', function(data) {
            console.log('socketio ::: reconnecting');
            console.log(data);
        });

        socket.on('reconnect_error', function(data) {
            console.log('socketio ::: reconnecting');
            console.log(data);
        });

        socket.on('reconnect_failed', function(data) {
            console.log('socketio ::: reconnect_failed');
            console.log(data);
        });


        // error from the server

        socket.on('error', function(data) {
            console.log('socketio ::: error');
            //debug('socketio ::: error ::: ' + JSON.stringify(data));
            changeState(State.SERVER_ERROR, data);
        });

        socket.on('disconnect', function(data) {
            //console.log('socketio ::: disconnect');
            //console.log(data);

            sessionReady = false;
            probeInFlight = false;
            // ответ на Auth этого сокета уже не придёт; свежую пришлёт index.html
            // на следующий 'network connected'
            authNum = 0;
            // Ответы на отправленные команды уже не придут: сокет другой. Безопасные
            // переотправляем, остальные закрываем ошибкой — иначе интерфейс повиснет,
            // а сторож посчитает их зависшими и убьёт новое соединение
            let retried = 0;
            for (let key in listeners) {
                let entry = listeners[key];
                if (!entry.sentAt) continue;

                // не больше одной переотправки: команду, которую сервер стабильно
                // не отвечает, бесконечный retry гонял бы reconnect по кругу
                if (entry.data && !entry.retried && RETRY_SAFE.indexOf(entry.cmd) !== -1) {
                    entry.retried = true;
                    entry.sentAt = 0;
                    sendQueue.push(entry.data);
                    retried++;
                    stats.retried++;
                    continue;
                }

                delete listeners[key];
                if (entry.callback) {
                    try {
                        entry.callback.call(null, {error: {code: -1, message: 'connection lost'}});
                    } catch (e) {
                        console.log('socketio ::: callback error on disconnect', e);
                    }
                }
            }
            if (retried) console.log('socketio ::: retry after reconnect: ' + retried);
            bump(stats.disconnects, String(data));
            if (!stats.lastDownAt) stats.lastDownAt = Date.now();
            console.log('socketio ::: disconnect: ' + data);

            // терминальные случаи: сервер прислал DISCONNECT (OTHER_CLIENT_CONNECTED,
            // SERVER_RESTART) или соединение закрыли мы сами. Переподключаться нельзя,
            // и 'network disconnected' уже отправлен обработчиком events
            if (state.code === State.SERVER_DISCONNECT || 'io client disconnect' === data) {
                return;
            }

            // сервер закрыл соединение без DISCONNECT: socket.io в этом случае
            // не переподключается, открываем руками. Пауза с разбросом, чтобы после
            // рестарта не лечь на сервер всей толпой
            if ('io server disconnect' === data) {
                changeState(State.RECONNECTING);
                setTimeout(function() {
                    socket.open();
                }, 3000 + Math.floor(Math.random() * 5000));
                return;
            }

            // остальное (transport error/close, ping timeout) socket.io переподключает
            // сам, поэтому молчим: экран "Соединение потеряно" заставил бы игрока
            // перезагружаться зря
            changeState(State.RECONNECTING);

            // до первого успешного коннекта это не обрыв, а "игра не запустилась"
            if (!everConnected) {
                app.EventDispatcher.emit('network disconnected');
            }
        });

        // понг движка — единственный трафик на простаивающем соединении
        socket.io.on('pong', function() {
            touchInbound();
        });

        // события браузера: об обрыве он знает сразу, engine.io — только через 85с

        window.addEventListener('offline', function() {
            // единственный случай, когда рвём без вопросов: сети нет, зондировать нечем
            forceReconnect('browser offline');
        });

        window.addEventListener('online', function() {
            // сеть сменилась — прежний отказ websocket ни о чём не говорит
            restoreWebsocketOpts();
            probe('browser online', PROBE_MIN_SILENCE);
        });

        // Возврат из фона: пока вкладка была скрыта, пинги не уходили и сервер мог
        // выкинуть сессию. Состояние соединения считаем неизвестным и выясняем зондом
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) return;
            restoreWebsocketOpts();
            // возврат websocket, назревший пока вкладка была в фоне
            if (wsRetryPending && socket.connected && transportName() === 'polling') {
                wsRetryPending = false;
                forceReconnect('ws retry');
                return;
            }
            probe('visible', PROBE_MIN_SILENCE);
        });

        // Возврат из bfcache: браузер закрывает websocket при входе туда,
        // поэтому здесь мы почти наверняка с мёртвым соединением
        window.addEventListener('pageshow', function(e) {
            if (e.persisted) probe('bfcache restore', PROBE_MIN_SILENCE);
        });

        document.addEventListener('resume', function() {
            probe('lifecycle resume', PROBE_MIN_SILENCE);
        });

        changeState(State.CONNECTING);
        socket.open();
    }

    function debug(msg) {
        app.Utils.DEBUG.push(msg);
    }

    return {
        init: init,
        getSocket: function() {
            return socket;
        },
        isConnected: function() {
            return socket && socket.connected;
        },
        // диагностика: app.Network.stats() в консоли
        stats: function() {
            return JSON.parse(JSON.stringify(stats));
        },
        // отправка отчёта по запросу: событие CLIENT_METRICS с сервера
        // или вручную из консоли — app.Network.report()
        report: function(reason) {
            if (reportFn) reportFn(reason || 'requested');
        },
        command: function command(data, callback) {
            data.num = ++num;
            if (callback) {
                const key = 'num_' + data.num;
                listeners[key] = {cmd: data.cmd, callback: callback, sentAt: 0, data: data};
            }
            if (data.cmd) {
                encodeOutgoing(data);
            }
            if (data.cmd === 'Auth' || data.cmd === 'Reconnect') {
                // в разрыве не отправляем: socket.io отложил бы пакет в sendBuffer,
                // который мы чистим на connect — свежую Auth точка входа пришлёт сама
                if (!socket || !socket.connected) {
                    delete listeners['num_' + data.num];
                    if (callback) {
                        try {
                            callback.call(null, {error: {code: -1, message: 'connection lost'}});
                        } catch (e) {
                            console.log('socketio ::: callback error on drop', e);
                        }
                    }
                    return;
                }
                authNum = data.num;
                authSentAt = Date.now();
                emitCommand(data);
                return;
            }

            // Ping мимо очереди: сессия ему не нужна, смысл в проверке связи до её
            // подтверждения. В разорванный сокет не шлём — уйдёт в sendBuffer и приедет
            // после реконнекта, когда ответ уже не нужен
            if (data.cmd === 'Ping') {
                if (socket && socket.connected) emitCommand(data);
                return;
            }

            if (!sessionReady) {
                if (sendQueue.length >= SEND_QUEUE_LIMIT) {
                    console.log('socketio ::: send queue overflow, drop: ' + data.cmd);
                    stats.dropped++;
                    delete listeners['num_' + data.num];
                    // без ошибки ждущий ответа интерфейс повис бы навсегда
                    if (callback) {
                        try {
                            callback.call(null, {error: {code: -1, message: 'queue overflow'}});
                        } catch (e) {
                            console.log('socketio ::: callback error on drop', e);
                        }
                    }
                    return;
                }
                sendQueue.push(data);
                stats.queued++;
                return;
            }

            emitCommand(data);
        }
    };
})();
