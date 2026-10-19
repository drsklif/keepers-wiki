// Popups2 — новая система попапов.
//
// План: ~/.claude/plans/shimmering-crunching-shannon.md
//
// Использует app.Popups для стек-менеджмента и общего DOM-контейнера #dark_popup.
// Старый app.Popups остаётся 1:1 — миграция вызовов поэтапно.
//
// Архитектура:
//   create(cfg)
//     → validateCfg / resolveCfg          (нормализация снапшота)
//     → STYLES[style].buildSkeleton       (DOM: dark + container + header + close + body)
//     → buildInstance                     (фасад с state machine)
//     → cfg.hooks.onMount(instance)       (caller строит контент в p.body)
//     → positionContainer                 (синхронное центрирование)
//     → mount                             (Popups.add + animation.enter)
//     → wireHandlers                      (close + dark — после mount, чтобы handler'ы
//                                          работали только когда DOM уже в документе)
//
// Расширение через registerStyle / registerAnimation:
//   STYLES[name]      = {buildSkeleton(cfg)}
//   ANIMATIONS[name]  = {enter(instance), exit(instance, done)}
//
//   cfg.style    = string ключ из STYLES (default 'flat')
//   cfg.animate  = bool | string ключ из ANIMATIONS | {enter, exit} объект (default 'pop')

app.Popups2 = (function() {

    // ========================================================================
    // Constants
    // ========================================================================

    var BASE_CANVAS_WIDTH = 480;
    var DEFAULT_STYLE = 'flat';
    var DEFAULT_ANIMATION = 'pop';

    var STATE = {
        MOUNTING: 'mounting',  // skeleton построен, в DOM ещё нет; close() запрещён
        VISIBLE:  'visible',   // в DOM, активен
        CLOSING:  'closing',   // animation.exit в процессе
        CLOSED:   'closed',    // удалён из DOM
    };

    // Регистры стилей и анимаций. Заполняются через registerStyle/registerAnimation
    // ниже (внизу файла). Built-in варианты регистрируются тем же путём, что и внешние.
    var STYLES = {};
    var ANIMATIONS = {};

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Создаёт попап. Возвращает instance.
     *
     * cfg:
     *   id?: string                           - id для замены (Popups.add дедуплицирует)
     *   style?: string                        - ключ из STYLES (default 'flat')
     *   size: {                               - REQUIRED
     *     width: number,
     *     height: number,                     - фиксированная (auto будет в v2)
     *   }
     *   scale?: {                             - опциональный масштаб container'а
     *     mobile?: number,                    - default 1
     *     desktop?: number,                   - default 1
     *     mobileOrigin?: string,              - default 'center top'
     *   }
     *   display?: object                      - HUD visibility {energy:1, gold:1, ...}
     *   header?: string
     *   closeOnBackdrop?: boolean             - default true; false → клик по dark игнорируется
     *   closeOnEscape?: boolean               - default true; false → Esc игнорируется
     *   showPrevious?: boolean                - continueShowingPrevious; default false
     *   animate?: bool | string | {enter, exit}  - default 'pop' (true = 'pop'; false = 'none')
     *   animateOnReplace?: boolean            - default false; true → animation.enter играется и на id-replace
     *                                           (по умолчанию replace мгновенный, без enter — чтобы не было «дёргания»)
     *   onMount?(p)                           - до Popups.add; caller строит контент в p.body
     *   onShow?(p)                            - при показе (старт таймеров)
     *   onHide?(p)                            - попап скрыт сверху другим
     *   onClose?(p)                           - удалён из DOM
     *   onReplace?(p)                         - id-replace (default: вызывает onClose)
     *   onDarkClick?(p): bool                 - перехват клика по backdrop; truthy = caller обработал
     *   onEscape?(p): bool                    - перехват Esc; truthy = caller обработал
     *
     * Instance:
     *   cfg                  - resolved cfg (immutable snapshot)
     *   els: {dark, container, header, close, body}
     *   body                 - read-only getter на els.body (перезапись игнорируется)
     *   tmp: {}              - sandbox caller'а (любое state)
     *   state                - STATE.* строка
     *   isClosed(): bool
     *   close(): void        - программное закрытие; throws если state === MOUNTING
     *   setHeader(text): void
     *
     * Caller hooks могут кинуть exception — это пройдёт наверх. Popup при этом
     * остаётся в полу-собранном состоянии. Caller отвечает за свою устойчивость.
     */
    function create(cfg) {
        validateCfg(cfg);
        var resolved = resolveCfg(cfg);
        var els = STYLES[resolved.style].buildSkeleton(resolved);
        var instance = buildInstance(els, resolved);

        callIfDefined(instance.cfg.hooks, 'onMount', instance);
        positionContainer(instance);
        mount(instance);
        wireHandlers(instance);

        return instance;
    }

    function registerStyle(name, builder) {
        if (typeof name !== 'string' || !name) {
            throw new Error('[Popups2] style name must be a non-empty string');
        }
        if (typeof builder.buildSkeleton !== 'function') {
            throw new Error('[Popups2] style "' + name + '" must define buildSkeleton(cfg)');
        }
        STYLES[name] = builder;
    }

    function registerAnimation(name, profile) {
        if (typeof name !== 'string' || !name) {
            throw new Error('[Popups2] animation name must be a non-empty string');
        }
        if (typeof profile.enter !== 'function' || typeof profile.exit !== 'function') {
            throw new Error('[Popups2] animation "' + name + '" must define enter(instance) and exit(instance, done)');
        }
        ANIMATIONS[name] = profile;
    }

    // ========================================================================
    // Validation & cfg resolution
    // ========================================================================

    // Все проверки cfg в одном месте. resolveCfg доверяет validateCfg.
    function validateCfg(cfg) {
        if (!cfg) throw new Error('[Popups2] cfg is required');
        validateSize(cfg.size);
        validateStyle(cfg.style);
        validateAnimation(cfg.animate);
    }

    function validateSize(size) {
        if (!size || typeof size.width !== 'number' || typeof size.height !== 'number') {
            throw new Error('[Popups2] cfg.size {width:number, height:number} is required');
        }
    }

    function validateStyle(style) {
        var key = style || DEFAULT_STYLE;
        if (!STYLES[key]) throw new Error('[Popups2] unknown style: "' + key + '"');
    }

    function validateAnimation(animate) {
        if (animate === undefined || animate === true || animate === false) return;
        if (typeof animate === 'string') {
            if (!ANIMATIONS[animate]) throw new Error('[Popups2] unknown animation: "' + animate + '"');
            return;
        }
        if (typeof animate === 'object'
            && typeof animate.enter === 'function'
            && typeof animate.exit === 'function') return;
        throw new Error('[Popups2] cfg.animate must be bool, string, or {enter, exit}');
    }

    function resolveCfg(cfg) {
        var Utils = app.Utils;
        var LAYOUT = app.LAYOUT;

        var isMobile = Utils.isMobile();
        var scaleCfg = cfg.scale || {};
        var scale = isMobile ? (scaleCfg.mobile || 1) : (scaleCfg.desktop || 1);
        var origin = (isMobile && scale !== 1)
            ? (scaleCfg.mobileOrigin || 'center top')
            : 'center center';

        return {
            id: cfg.id,
            style: cfg.style || DEFAULT_STYLE,
            size: {width: cfg.size.width, height: cfg.size.height},
            scale: scale,
            scaleOrigin: origin,
            darkOpacity: LAYOUT.scale < 1 ? 0.85 : 0.7,
            display: cfg.display || {},
            header: cfg.header,
            closeOnBackdrop: cfg.closeOnBackdrop !== false,
            closeOnEscape:   cfg.closeOnEscape   !== false,
            showPrevious: !!cfg.showPrevious,
            animation: resolveAnimation(cfg.animate),
            animateOnReplace: !!cfg.animateOnReplace,
            hooks: {
                onMount:     cfg.onMount,
                onShow:      cfg.onShow,
                onHide:      cfg.onHide,
                onClose:     cfg.onClose,
                onReplace:   cfg.onReplace,
                onDarkClick: cfg.onDarkClick,
                onEscape:    cfg.onEscape,
            },
        };
    }

    // Валидация уже сделана в validateCfg — здесь только lookup.
    function resolveAnimation(animate) {
        if (animate === false) return ANIMATIONS.none;
        if (animate === undefined || animate === true) return ANIMATIONS[DEFAULT_ANIMATION];
        if (typeof animate === 'string') return ANIMATIONS[animate];
        return animate;
    }

    // ========================================================================
    // Instance & lifecycle
    // ========================================================================

    function buildInstance(els, resolved) {
        var instance = {
            cfg: resolved,
            els: els,
            tmp: {},
            state: STATE.MOUNTING,
        };

        // body — read-only getter на els.body. Защита от случайного `p.body = X`.
        Object.defineProperty(instance, 'body', {
            get: function() { return instance.els.body; },
            enumerable: true,
        });

        instance.isClosed = function() {
            return instance.state === STATE.CLOSED;
        };

        // close() в фазе MOUNTING бессмысленен (попап не в DOM, _legacyHandle не создан) —
        // вместо тихого no-op'а кидаем понятную ошибку.
        instance.close = function() {
            if (instance.state === STATE.MOUNTING) {
                throw new Error('[Popups2] cannot close popup before it is mounted');
            }
            requestClose(instance);
        };

        // setHeader — пока style-агностичный; в v2 при добавлении 'framed' стиля
        // нужно будет диспатчить через STYLES[cfg.style].setHeader.
        instance.setHeader = function(text) {
            instance.els.header.innerText = text || '';
            instance.els.header.style.display = text ? '' : 'none';
        };

        return instance;
    }

    function wireHandlers(instance) {
        var hooks = instance.cfg.hooks;

        instance.els.close.onclick = function() {
            requestClose(instance);
        };

        // Симметрично с onEscape: handler всегда ставится, проверки внутри.
        instance.els.dark.onclick = function() {
            if (instance.cfg.closeOnBackdrop === false) return;
            if (hooks.onDarkClick && hooks.onDarkClick(instance)) return;
            requestClose(instance);
        };
    }

    function positionContainer(instance) {
        var Utils = app.Utils;
        var LAYOUT = app.LAYOUT;
        var size = instance.cfg.size;
        var topOffset = Utils.isMobile() ? 76 : (80 + 76);
        var availableHeight0 = LAYOUT.getClientWHS0(topOffset);
        var availableHeight = Math.min(size.height, availableHeight0);
        var top = Math.max(80, (availableHeight0 - availableHeight) / 2);
        instance.els.container.style.top = top + 'px';
        instance.els.container.style.left = Math.round((BASE_CANVAS_WIDTH - size.width) / 2) + 'px';
    }

    function mount(instance) {
        var Popups = app.Popups;
        // Replace-детект ДО Popups.add: если попап с таким id уже в стеке,
        // Popups.add его уберёт синхронно (через removeDisplay + onReplace).
        // В этом случае пропускаем animation.enter, чтобы не было «дёргания»
        // (popEnter ставит dark.opacity=0 и scale=0.92 → визуальный flash).
        // Skeleton в buildFlatSkeleton уже выставляет финальные стили (darkOpacity,
        // mobile transform), поэтому без enter попап появляется сразу в нужном виде.
        // Opt-in: cfg.animateOnReplace: true → анимация играется и на replace.
        var isReplace = !!(instance.cfg.id && Popups.getByID(instance.cfg.id));

        instance._legacyHandle = buildLegacyHandle(instance);
        Popups.add(instance._legacyHandle);
        instance.state = STATE.VISIBLE;

        if (!isReplace || instance.cfg.animateOnReplace) {
            instance.cfg.animation.enter(instance);
        }
    }

    function buildLegacyHandle(instance) {
        var hooks = instance.cfg.hooks;
        // Структура `cfg` здесь — формат, который ожидает app.Popups.add.
        // Это НЕ то же самое, что instance.cfg (resolved Popups2 config).
        return {
            cfg: {
                id:                       instance.cfg.id,
                display:                  instance.cfg.display,
                continueShowingPrevious:  instance.cfg.showPrevious,
                onShow:    makeHookProxy(instance, 'onShow'),
                onHide:    makeHookProxy(instance, 'onHide'),
                onClose:   function() {
                    markClosed(instance);
                    callIfDefined(hooks, 'onClose', instance);
                },
                onReplace: function() {
                    markClosed(instance);
                    var hookName = (typeof hooks.onReplace === 'function') ? 'onReplace' : 'onClose';
                    callIfDefined(hooks, hookName, instance);
                },
                // Контракт с глобальным Esc-handler'ом (он смотрит на cfg.onEscape
                // у топового попапа): возврат truthy = "я обработал, не делай default close".
                onEscape: function() {
                    if (instance.cfg.closeOnEscape === false) return true;
                    if (hooks.onEscape && hooks.onEscape(instance)) return true;
                    requestClose(instance);
                    return true;
                },
            },
            display: [instance.els.dark, instance.els.container],
        };
    }

    // Прокси для простых hook'ов (без побочной логики).
    function makeHookProxy(instance, hookName) {
        return function() {
            callIfDefined(instance.cfg.hooks, hookName, instance);
        };
    }

    function requestClose(instance) {
        if (instance.state === STATE.CLOSING || instance.state === STATE.CLOSED) return;
        instance.state = STATE.CLOSING;
        var Popups = app.Popups;
        instance.cfg.animation.exit(instance, function() {
            Popups.removePopup(instance._legacyHandle);
        });
    }

    function markClosed(instance) {
        instance.state = STATE.CLOSED;
        // Replace-path не идёт через animation.exit (старый Popups дёргает onReplace
        // прямо после removeDisplay), поэтому потенциально живые tween'ы убиваем здесь.
        // Для close-path это no-op (tween'ы уже завершились).
        TweenMax.killTweensOf(instance.els.dark);
        TweenMax.killTweensOf(instance.els.container);
    }

    // ========================================================================
    // Built-in style: 'flat' (createPopup-эквивалент)
    // ========================================================================

    function buildFlatSkeleton(cfg) {
        var Utils = app.Utils;
        var Popups = app.Popups;

        var dark = buildDarkOverlay(cfg);

        var container = Utils.createDIV({class: 'popup'});
        container.style.width = cfg.size.width + 'px';
        container.style.height = cfg.size.height + 'px';
        if (cfg.scale !== 1) {
            container.style.transform = 'scale(' + cfg.scale + ')';
            container.style.transformOrigin = cfg.scaleOrigin;
        }

        var header = Utils.createDIV({class: 'header', style: 'left: 40px; top: -25px', text: cfg.header || ''});
        if (!cfg.header) header.style.display = 'none';
        container.appendChild(header);

        var close = Utils.createA({class: 'close', style: 'right: -5px; top: -10px; z-index: ' + Popups.getNextZIndex()});
        container.appendChild(close);

        // body — отдельный inner DIV, заполняющий container 100%.
        // Caller всегда аппендит в `instance.body`, не в container. Это гарантирует,
        // что в v2 (scrollable) семантика body не изменится — тогда body станет
        // inner scroll-area внутри overflow:hidden враппера.
        var body = Utils.createDIV({class: 'popup_body', style: 'position: absolute; left: 0; top: 0; right: 0; bottom: 0'});
        container.appendChild(body);

        return {dark: dark, container: container, header: header, close: close, body: body};
    }

    function buildDarkOverlay(cfg) {
        var Utils = app.Utils;
        var LAYOUT = app.LAYOUT;
        var dark = Utils.createDIV({class: 'dark'});
        dark.style.opacity = cfg.darkOpacity;
        var heightArg = LAYOUT.scale < 1 ? 0 : 6;
        if (LAYOUT.VK || LAYOUT.OK_750 || LAYOUT.EXERU || LAYOUT.FS || LAYOUT.MMR) {
            dark.style.height = LAYOUT.getClientWHS0(heightArg, 1) + 5 + 'px';
        } else {
            dark.style.height = LAYOUT.getClientWHS0(heightArg, 1) - Utils.withOffsets(0, 1) + 'px';
        }
        return dark;
    }

    registerStyle('flat', {buildSkeleton: buildFlatSkeleton});

    // ========================================================================
    // Built-in animations: 'pop', 'none'
    // ========================================================================

    function popEnter(instance) {
        var dark = instance.els.dark;
        var container = instance.els.container;
        var scale = instance.cfg.scale;
        var origin = instance.cfg.scaleOrigin;

        TweenMax.killTweensOf(dark);
        dark.style.opacity = 0;
        TweenMax.to(dark, 0.2, {opacity: instance.cfg.darkOpacity, ease: Power2.easeOut});

        TweenMax.killTweensOf(container);
        TweenMax.fromTo(container, 0.3,
            {scale: scale * 0.92, opacity: 0, transformOrigin: origin},
            {scale: scale, opacity: 1, ease: Back.easeOut.config(1.4)});
    }

    function popExit(instance, done) {
        var dark = instance.els.dark;
        var container = instance.els.container;
        var scale = instance.cfg.scale;

        TweenMax.killTweensOf(dark);
        TweenMax.killTweensOf(container);

        // pointer-events: none — защита от повторного клика во время exit-анимации.
        // (Дополнительно к state-check в requestClose.)
        dark.style.pointerEvents = 'none';
        container.style.pointerEvents = 'none';

        // Barrier: ждём завершения обоих tween'ов.
        // Если будут добавляться новые tween'ы в exit — bump'ить pending вручную.
        var pending = 2;
        var onTweenDone = function() { if (--pending === 0) done(); };

        TweenMax.to(dark, 0.15, {opacity: 0, onComplete: onTweenDone});
        TweenMax.to(container, 0.18, {opacity: 0, scale: scale * 0.95, ease: Power2.easeIn, onComplete: onTweenDone});
    }

    function noopEnter() {}
    function noopExit(_instance, done) { done(); }

    registerAnimation('pop',  {enter: popEnter,  exit: popExit});
    registerAnimation('none', {enter: noopEnter, exit: noopExit});

    // ========================================================================
    // Helpers
    // ========================================================================

    function callIfDefined(host, hookName, arg) {
        if (host && typeof host[hookName] === 'function') host[hookName](arg);
    }

    // ========================================================================
    // Exports
    // ========================================================================

    return {
        create:             create,
        registerStyle:      registerStyle,
        registerAnimation:  registerAnimation,
        STATE:              STATE,
    };
})();
