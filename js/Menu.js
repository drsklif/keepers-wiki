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

    // слева направо
    var ITEMS = [
        {key: 'MENU1', type: 'PROFILE', icon: 'profile', name: 'Профиль'},
        {key: 'MENU2', type: 'CARDS',   icon: 'cards',   name: 'Карты'},
        {key: 'MENU3', type: 'MAIN',    icon: 'home',    name: 'Главная'},
        {key: 'MENU4', type: 'QUESTS',  icon: 'quests',  name: 'Задания'},
        {key: 'MENU5', type: 'GUILD',   icon: 'guild',   name: 'Гильдия'}
    ];

    function init() {
        EventDispatcher = app.EventDispatcher;
        Utils = app.Utils;
    }

    function isRedesign() {
        return !app.UserUtil.isOldDesign();
    }

    function isSquare() {
        return !!(app.LAYOUT.VK || app.LAYOUT.OK_750 || app.LAYOUT.EXERU || app.LAYOUT.FS || app.LAYOUT.MMR);
    }

    // Логические пиксели. Оба меню масштабируются с игрой: на узком телефоне новое было 70 экранных px — заметно выше старого.
    function getFooterHeight() {
        return 70;
    }

    // Старое оформление: полоса 70px + 6px зазора.
    function getReservedHeight() {
        return isRedesign() ? getFooterHeight() : 76;
    }

    // Отступ затемнения попапов от низа: 6px только у старого меню при scale >= 1.
    function getDarkGap() {
        // до входа пользователя нет — isOldDesign() упал бы
        const user = app.Model && app.Model.user;
        const oldDesign = !!user && user.od === 1;
        return app.LAYOUT.scale < 1 || !oldDesign ? 0 : 6;
    }

    function getLogicalHeight() {
        return app.LAYOUT.scale < 1 ? app.LAYOUT.h / app.LAYOUT.scale : app.LAYOUT.h;
    }

    // Облегчённая главная хранится в аккаунте (поле lm): в ВК игра во фрейме, браузер стирает его localStorage,
    // и галочка слетала после выхода в соцсеть. localStorage — галочка до переноса, пока её не пересохранят.
    function isLiteMotion() {
        const user = app.Model && app.Model.user;
        if (user && user.lm === 1) return true;
        try {
            return localStorage.getItem('liteMotion') === '1';
        } catch (e) {
            return false;
        }
    }

    // lm уже сохранён на сервере; прежнюю отметку устройства снимаем, иначе галочку не выключить
    function setLiteMotion(on) {
        app.Model.user.lm = on ? 1 : 0;
        try {
            localStorage.removeItem('liteMotion');
        } catch (e) {}
        document.documentElement.classList.toggle('lite-motion', isLiteMotion());
    }

    function create() {
        document.documentElement.classList.toggle('game-lake-atmosphere', isRedesign());
        document.documentElement.classList.toggle('lite-motion', isLiteMotion());
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

    // Сохраняет display и z-index, которые ставит Game.js.
    function rebuild() {
        const previous = cfg && cfg.els.main;
        const parent = previous && previous.parentNode;
        const display = previous ? previous.style.display : '';
        const zIndex = previous ? previous.style.zIndex : '';
        if (cfg && cfg.els.layer) cfg.els.layer.remove();
        create();
        if (!parent) return;
        parent.replaceChild(cfg.els.main, previous);
        cfg.els.main.style.display = display;
        if (zIndex) cfg.els.main.style.zIndex = zIndex;
    }

    function createRedesign() {
        const node = '<svg class="thread-node" style="left:{0}%" viewBox="0 0 8 12"><path d="M4 0L8 6 4 12 0 6z"/></svg>';
        cfg.els.main = Utils.createDIV({class: 'home-talisman-shell'});
        cfg.els.nav = Utils.createEL('nav', {class: 'dock'});
        cfg.els.nav.innerHTML = '<div class="utility-row"></div>' +
            '<div class="thread-fixed"><div class="ribbon-art"></div>' +
            '<svg class="thread-line" viewBox="0 0 640 70" preserveAspectRatio="none"><path d="M0 51 Q32 43 64 51 T192 51 T320 51 T448 51 T576 51 T704 51" vector-effect="non-scaling-stroke"/></svg>' +
            [10, 30, 50, 70, 90].map(x => node.format(x)).join('') + '</div>' +
            '<div class="selection"><span></span><i class="active-aura"></i><i class="mote m1"></i><i class="mote m2"></i><i class="mote m3"></i><i class="mote m4"></i><i class="mote m5"></i></div>';
        cfg.els.utility = cfg.els.nav.querySelector('.utility-row');
        // Звук и настройки — над затемнением попапов, как в старом оформлении: шестерёнкой входят по логину со старта обучения
        cfg.els.layer = Utils.createDIV({class: 'home-talisman-shell utility-layer', html: '<div class="utility-row"></div>'});

        ITEMS.forEach(function(item, i) {
            const els = {};
            els.main = Utils.createEL('button', {class: 'tab', type: 'button'});
            els.main.dataset.menu = item.type;
            els.main.appendChild(els.item = Utils.createSPAN({class: 'object'}));
            els.item.appendChild(Utils.createSPAN({class: 'talisman-icon', style: '--sprite:' + i * 25 + '%'}));
            els.main.appendChild(els.name = Utils.createSPAN({class: 'caption', text: item.name}));
            els.main.appendChild(els.note = Utils.createSPAN({class: 'notice notice-count', style: 'display: none'}));
            els.main.onclick = _onMenuItemClick.bind(null, item.type);
            cfg[item.key] = {els: els};
            cfg.els.nav.appendChild(els.main);
        });
        selectRedesign(TYPE.MAIN);

        cfg.els.main.appendChild(cfg.els.nav);
        startThreadMotes(cfg.els.nav.querySelector('.thread-fixed'));
    }

    function selectRedesign(type) {
        const index = ITEMS.findIndex(item => item.type === type);
        cfg.els.nav.style.setProperty('--active', index);
        ITEMS.forEach(function(item, i) {
            Utils[i === index ? 'addClass' : 'removeClass'](cfg[item.key].els.main, 'active');
        });
    }

    function startThreadMotes(thread) {
        if (isLiteMotion()) return;
        const curve = thread.querySelector('path');
        const host = Utils.createDIV({class: 'thread-motes'});
        thread.appendChild(host);
        const reduced = matchMedia('(prefers-reduced-motion: reduce)');
        const total = curve.getTotalLength();
        let lo = 0, hi = total;
        for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2;
            if (curve.getPointAtLength(mid).x < 640) lo = mid; else hi = mid;
        }
        const end = (lo + hi) / 2;
        const points = Array.from({length: 257}, (_, i) => {
            const p = curve.getPointAtLength(end * i / 256);
            return {x: p.x, y: p.y};
        });
        const motes = Array.from({length: 14}, (_, i) => {
            const el = Utils.createEL('i', {class: 'thread-mote' + (i % 3 === 0 ? ' warm' : '')});
            host.appendChild(el);
            return {el: el, offset: (i * .61803398875) % 1, duration: 80 + (i * 11) % 41, blink: 7 + (i * 3) % 8, phase: i * 1.79};
        });
        let raf = 0, last = 0, elapsed = 0, previous = 0;

        function frame(now) {
            // меню пересобрано
            if (!host.isConnected && last) return stop();
            raf = requestAnimationFrame(frame);
            if (now - last < 32) return;
            last = now;
            if (previous) elapsed += Math.min((now - previous) / 1000, .1);
            previous = now;
            const width = thread.clientWidth;
            for (const m of motes) {
                const t = (elapsed / m.duration + m.offset) % 1;
                const pos = t * 256, index = Math.min(255, Math.floor(pos)), fraction = pos - index;
                const a = points[index], b = points[index + 1];
                const x = (a.x + (b.x - a.x) * fraction) * width / 640 + Math.sin(elapsed * .12 + m.phase) * 5;
                const spread = -18 + Math.sin(m.phase * 1.7) * 19;
                const y = a.y + (b.y - a.y) * fraction + spread + Math.sin(elapsed * .21 + m.phase) * 10;
                const edge = Math.min(1, t * 22, (1 - t) * 22);
                const pulse = Math.pow((Math.sin(elapsed * 2 * Math.PI / m.blink + m.phase) + 1) / 2, 1.8);
                m.el.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)';
                m.el.style.opacity = (edge * pulse * .85).toFixed(3);
            }
        }
        function sync() {
            cancelAnimationFrame(raf);
            raf = 0;
            previous = 0;
            const enabled = !reduced.matches && !document.hidden && !Utils.hasClass(document.body, 'scene-covered');
            host.hidden = !enabled;
            if (enabled) raf = requestAnimationFrame(frame);
        }
        const observer = new MutationObserver(sync);
        function stop() {
            cancelAnimationFrame(raf);
            observer.disconnect();
            // Safari до 14 и Firefox до 55: у MediaQueryList нет addEventListener, только addListener
            if (reduced.removeEventListener) reduced.removeEventListener('change', sync); else reduced.removeListener(sync);
            document.removeEventListener('visibilitychange', sync);
        }
        if (reduced.addEventListener) reduced.addEventListener('change', sync); else reduced.addListener(sync);
        document.addEventListener('visibilitychange', sync);
        observer.observe(document.body, {attributes: true, attributeFilter: ['class']});
        sync();
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
            els.main.dataset.menu = item.type;
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
            selectRedesign(type);
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
        for (let i = 0; i < ITEMS.length; i++) {
            const menu = cfg[ITEMS[i].key];
            if (menu && Utils.hasClass(menu.els.main, 'active')) return menu;
        }
    }

    function getMenuByType(type) {
        const item = ITEMS.find(function(i) { return i.type === type; });
        return item ? cfg[item.key] : undefined;
    }

    // Координаты .main_brd экранные. Уже 480px игра уменьшается масштабом — меню вместе с ней, как старое (updateLegacyWHS).
    function updateRedesignWHS() {
        const layout = app.LAYOUT;
        const scale = Math.min(1, layout.scale);
        const gameWidth = layout.w * scale;
        const width = Math.min(gameWidth, 750);
        const el = cfg.els.main;
        el.style.width = width / scale + 'px';
        el.style.left = (gameWidth - width) / 2 + 'px';
        el.style.top = layout.h - 70 * scale + 'px';
        el.style.transformOrigin = '0 0';
        el.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
        ['width', 'left', 'top', 'transformOrigin', 'transform'].forEach(key => cfg.els.layer.style[key] = el.style[key]);
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
        getDarkGap: getDarkGap,
        getLogicalHeight: getLogicalHeight,
        getUtilityRow: function() {
            return cfg.els.utility;
        },
        getUtilityLayer: function() {
            return cfg.els.layer;
        },
        rebuild: rebuild,
        isLiteMotion: isLiteMotion,
        setLiteMotion: setLiteMotion,
        updateWHS: updateWHS
    }
})();