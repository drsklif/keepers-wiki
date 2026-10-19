app.Menu = (function() {

    var EventDispatcher, Utils;

    var cfg;

    var TYPE = {
        PROFILE: 'PROFILE',
        CARDS: 'CARDS',
        MAIN: 'MAIN',
        QUESTS: 'QUESTS',
        GUILD: 'GUILD'
    };

    /** Слева направо. Ключ cfg, тип, суффикс спрайта иконки и подпись. */
    var ITEMS = [
        {key: 'MENU1', type: 'PROFILE', icon: 'profile', name: 'Профиль'},
        {key: 'MENU2', type: 'CARDS',   icon: 'cards',   name: 'Карты'},
        {key: 'MENU3', type: 'MAIN',    icon: 'home',    name: 'Главная'},
        {key: 'MENU4', type: 'QUESTS',  icon: 'quests',  name: 'Задания'},
        {key: 'MENU5', type: 'GUILD',   icon: 'guild',   name: 'Гильдия'}
    ];

    /** Столько искр в слое эффектов; позиции и фазы заданы в style.css. */
    var SPARKS = 4;

    function init() {
        EventDispatcher = app.EventDispatcher;
        Utils = app.Utils;
    }

    function isRedesign() {
        return !app.UserUtil.isOldDesign();
    }

    /** Квадратная раскладка соцсетей: футер всегда считается от 640. */
    function isSquare() {
        return !!(app.LAYOUT.VK || app.LAYOUT.OK_750 || app.LAYOUT.EXERU || app.LAYOUT.FS || app.LAYOUT.MMR);
    }

    /**
     * Высота полосы меню. В новом оформлении пропорциональна ширине — 0.17 от неё,
     * см. README макета; прежнее оформление держит свои 70px.
     * На это число опираются MainPage, GuildPage и app.js, считая высоту контента.
     */
    function getFooterHeight() {
        if (!isRedesign()) return 70;
        return (isSquare() ? 640 : app.LAYOUT.w) * 0.17;
    }

    /**
     * Сколько места резервируется снизу под меню: у прежнего оформления полоса 70px
     * плюс 6px зазора, у нового зазора нет.
     */
    function getReservedHeight() {
        return isRedesign() ? getFooterHeight() : 76;
    }

    /** Логическая высота: при scale < 1 экран вмещает больше логических пикселей. */
    function getLogicalHeight() {
        return app.LAYOUT.scale < 1 ? app.LAYOUT.h / app.LAYOUT.scale : app.LAYOUT.h;
    }

    function activeClass() {
        return isRedesign() ? 'is-active' : 'active';
    }

    function create() {
        cfg = {els: {}};
        if (isRedesign()) {
            createRedesign();
        } else {
            createLegacy();
        }
        updateWHS();
    }

    function updateWHS() {
        if (isRedesign()) updateRedesignWHS(); else updateLegacyWHS();
    }

    /**
     * Оформления отличаются разметкой, а не только стилями, поэтому переключение
     * требует пересборки. Ставим новый узел на место старого, сохраняя видимость
     * и z-index, которые выставляет Game.js.
     */
    function rebuild() {
        const previous = cfg && cfg.els.main;
        const parent = previous && previous.parentNode;
        const display = previous ? previous.style.display : '';
        const zIndex = previous ? previous.style.zIndex : '';
        create();
        if (!parent) return;
        parent.replaceChild(cfg.els.main, previous);
        cfg.els.main.style.display = display;
        if (zIndex) cfg.els.main.style.zIndex = zIndex;
    }

    /**
     * Разметка из markup/mockups/footer-menu-redesign/production-frame.html.
     * Контракт прежний: els.main — кнопка, els.item — иконка, els.name — подпись,
     * els.note — точка уведомления, в которую пишут Game.js и EventUtil.js.
     */
    function createRedesign() {
        cfg.els.nav = Utils.createEL('nav', {class: 'footer-menu-redesign'});
        cfg.els.nav.appendChild(Utils.createDIV({class: 'footer-rail'}));

        ITEMS.forEach(function(item) {
            const els = {};
            els.main = Utils.createEL('button', {class: 'menu-button', type: 'button'});
            els.main.dataset.menu = item.icon;
            if (item.type === TYPE.MAIN) Utils.addClass(els.main, 'is-active');

            els.main.appendChild(createEffects());
            els.main.appendChild(els.item = Utils.createSPAN({class: 'menu-icon-shell menu-icon--' + item.icon}));
            els.main.appendChild(els.note = Utils.createSPAN({class: 'menu_note menu_note_g', style: 'display: none'}));
            els.main.appendChild(els.name = Utils.createSPAN({class: 'menu-label', text: item.name}));
            els.main.onclick = _onMenuItemClick.bind(null, item.type);

            cfg[item.key] = {els: els};
            cfg.els.nav.appendChild(els.main);
        });

        cfg.els.nav.addEventListener('animationend', function(e) {
            if (e.animationName === 'production-arrival') {
                const button = e.target.closest('.menu-button');
                if (button) Utils.removeClass(button, 'is-entering');
            }
        });

        // Срез по краю экрана: медальон ниже края делает документ прокручиваемым.
        cfg.els.main = Utils.createDIV({class: 'footer-menu-clip'});
        cfg.els.main.appendChild(cfg.els.nav);
    }

    /** Аура, вспышка прилёта и искры. CSS показывает их только у активной вкладки. */
    function createEffects() {
        const fx = Utils.createSPAN({class: 'menu-effects'});
        fx.appendChild(Utils.createSPAN({class: 'menu-aura'}));
        fx.appendChild(Utils.createSPAN({class: 'menu-burst'}));
        for (let i = 0; i < SPARKS; i++) {
            fx.appendChild(Utils.createEL('i', {class: 'menu-spark menu-spark-' + i}));
        }
        return fx;
    }

    function createLegacy() {
        cfg.els.main = Utils.createDIV({class: 'menu_b'});
        cfg.els.main.style.zIndex = 101;
        cfg.els.main.style.width = (isSquare() ? 751 : app.LAYOUT.w) + 'px';

        const div_b = Utils.createDIV({class: 'menu_b_c'});
        cfg.els.active_bg = Utils.createDIV({class: 'active_bg', style: 'left: 36%'});
        div_b.appendChild(cfg.els.active_bg);

        ITEMS.forEach(function(item, i) {
            const active = item.type === TYPE.MAIN;
            const els = {};
            els.main = Utils.createA({class: [i === 0 ? 'first' : '', active ? 'active' : ''].join(' ').trim()});
            els.main.style.width = (active ? 28 : 18) + '%';
            els.main.appendChild(els.note = Utils.createDIV({class: 'menu_note menu_note_g', style: 'display: none'}));
            els.item = Utils.createDIV({class: 'menu_item menu_' + (item.icon === 'home' ? 'main' : item.icon === 'quests' ? 'quest' : item.icon)});
            els.item.style.marginTop = (active ? -14 : 7) + 'px';
            els.item.style.transform = 'scale(' + (active ? 1 : 0.785) + ')';
            els.main.appendChild(els.item);
            els.main.appendChild(els.name = Utils.createSPAN({text: item.name}));
            els.main.onclick = _onMenuItemClick.bind(null, item.type);
            cfg[item.key] = {els: els};
            div_b.appendChild(els.main);
        });

        cfg.els.main.appendChild(div_b);
        cfg.els.main.appendChild(Utils.createDIV({class: 'bottom_brd'}));
    }

    function onMenuItemClick0(type) {
        const menu_old = getSelectedMenu();
        const menu_new = getMenuByType(type);
        if (menu_old === menu_new) return;

        if (isRedesign()) {
            // Медальон, иконка, подпись и точка переезжают CSS-переходами, как на стенде.
            Utils.removeClass(menu_old.els.main, 'is-active');
            Utils.removeClass(menu_old.els.main, 'is-entering');
            Utils.addClass(menu_new.els.main, 'is-active');
            Utils.addClass(menu_new.els.main, 'is-entering');
            return;
        }

        TweenMax.to(menu_old.els.main, 0.3, {width: '18%', ease: Ease.easeOut});
        TweenMax.to(menu_old.els.item, 0.3, {marginTop: 7, scale: 0.785, ease: Ease.easeOut});
        Utils.removeClass(menu_old.els.main, 'active');

        TweenMax.to(menu_new.els.main, 0.3, {width: '28%', ease: Ease.easeOut});
        TweenMax.to(menu_new.els.item, 0.3, {marginTop: -14, scale: 1, ease: Ease.easeOut});
        Utils.addClass(menu_new.els.main, 'active');
        TweenMax.set(menu_new.els.name, {opacity: 0});
        TweenMax.to(menu_new.els.name, 0.1, {delay: 0.1, opacity: 1, ease: Ease.easeOut});

        const index = ITEMS.findIndex(function(item) { return item.type === type; });
        TweenMax.to(cfg.els.active_bg, 0.3, {left: index * 18 + '%', ease: Ease.easeOut});
    }

    function _onMenuItemClick(type) {
        app.SoundManager.playClick();
        onMenuItemClick(type);
    }

    function onMenuItemClick(type, data) {
        let menu_old = getSelectedMenu();
        let menu_new = getMenuByType(type);

        if (menu_old === menu_new) {
            if (type === TYPE.MAIN) {
                app.Popups.removeAll();
            }
            return;
        }

        onMenuItemClick0(type);

        let params = {type: type};
        if (data) params.data = data;
        EventDispatcher.emit('menu click', params);
    }

    function getSelectedMenu() {
        const active = activeClass();
        for (let i = 0; i < ITEMS.length; i++) {
            const menu = cfg[ITEMS[i].key];
            if (menu && Utils.hasClass(menu.els.main, active)) return menu;
        }
    }

    function getMenuByType(type) {
        const item = ITEMS.find(function(i) { return i.type === type; });
        return item ? cfg[item.key] : undefined;
    }

    /**
     * Геометрия футера. Формулы из README макета: ширина берётся от раскладки,
     * высота — 0.17 от ширины, а при scale < 1 футер масштабируется отдельно,
     * поэтому его верх считается от уже отмасштабированной высоты.
     */
    function updateRedesignWHS() {
        const layout = app.LAYOUT;
        const footerWidth = isSquare() ? 640 : layout.w;
        const footerHeight = footerWidth * 0.17;
        // запас сверху: элементы выступают над футером до ~6cqw
        const lift = footerHeight * 0.5;
        const clip = cfg.els.main;
        const nav = cfg.els.nav;

        clip.style.width = layout.w * layout.scale + 'px';
        clip.style.height = (lift + footerHeight) * layout.scale + 'px';
        clip.style.top = layout.h - (lift + footerHeight) * layout.scale + 'px';

        nav.style.width = footerWidth + 'px';
        nav.style.height = footerHeight + 'px';
        nav.style.left = (layout.w - footerWidth) / 2 * layout.scale + 'px';
        nav.style.top = lift * layout.scale + 'px';
        nav.style.transform = layout.scale < 1 ? 'scale(' + layout.scale + ')' : '';
    }

    function updateLegacyWHS() {
        const el = cfg.els.main;
        el.style.width = (isSquare() ? 751 : app.LAYOUT.w) + 'px';
        el.style.transform = '';
        if (app.LAYOUT.scale < 1) {
            el.style.transform = 'scale(' + app.LAYOUT.scale + ')';
            let top = app.LAYOUT.h - Utils.withOffsets(76, 2);
            top = top + (76 - 76 * app.LAYOUT.scale) + 3;
            el.style.top = top + 'px';
        } else {
            el.style.top = app.LAYOUT.h - Utils.withOffsets(76, 2) + (isSquare() ? 5 : 0) + 'px';
        }
    }

    function destroy() {

    }

    return {
        init: init,
        create: create,
        destroy: destroy,
        TYPE: TYPE,
        isSelected: function(type) {
            let el = getSelectedMenu();
            return el === getMenuByType(type);
        },
        getCFG: function() {
            return cfg;
        },
        onMenuItemClick: onMenuItemClick,
        onMenuItemClick0: onMenuItemClick0,
        getFooterHeight: getFooterHeight,
        getReservedHeight: getReservedHeight,
        getLogicalHeight: getLogicalHeight,
        rebuild: rebuild,
        updateWHS: updateWHS
    }
})();