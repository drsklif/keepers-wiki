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

    function init() {
        EventDispatcher = app.EventDispatcher;
        Utils = app.Utils;
    }

    function create() {
        cfg = {els: {}};

        cfg.els.main = Utils.createDIV({class: 'menu_b'});
        cfg.els.main.style.zIndex = 101;
        cfg.els.main.style.width = (app.LAYOUT.VK || app.LAYOUT.OK_750 || app.LAYOUT.EXERU || app.LAYOUT.FS || app.LAYOUT.MMR ? 751 : app.LAYOUT.w) + 'px';

        var div_b = Utils.createDIV({class: 'menu_b_c'});

        cfg.els.active_bg = Utils.createDIV({class: 'active_bg', style: 'left: 36%'});
        div_b.appendChild(cfg.els.active_bg);

        var els = {};
        els.main = Utils.createA({class: 'first'});
        els.main.style = 'width: 18%';
        els.main.appendChild(els.note = Utils.createDIV({class: 'menu_note menu_note_g', style: 'display: none'}));
        els.item = Utils.createDIV({class: 'menu_item menu_profile'});
        els.item.style = 'margin-top: 7px; transform: scale(0.785)';
        els.main.appendChild(els.item);
        els.main.appendChild(els.name = Utils.createSPAN({text: 'Профиль'}));
        els.main.onclick = _onMenuItemClick.bind(null, TYPE.PROFILE);
        cfg.MENU1 = {els: els};
        div_b.appendChild(cfg.MENU1.els.main);

        els = {};
        els.main = Utils.createA({});
        els.main.style = 'width: 18%';
        els.main.appendChild(els.note = Utils.createDIV({class: 'menu_note menu_note_g', style: 'display: none'}));
        els.item = Utils.createDIV({class: 'menu_item menu_cards'});
        els.item.style = 'margin-top: 7px; transform: scale(0.785)';
        els.main.appendChild(els.item);
        els.main.appendChild(els.name = Utils.createSPAN({text: 'Карты'}));
        els.main.onclick = _onMenuItemClick.bind(null, TYPE.CARDS);
        cfg.MENU2 = {els: els};
        div_b.appendChild(cfg.MENU2.els.main);

        els = {};
        els.main = Utils.createA({class: 'active'});
        els.main.style = 'width: 28%';
        els.main.appendChild(els.note = Utils.createDIV({class: 'menu_note menu_note_g', style: 'display: none'}));
        els.item = Utils.createDIV({class: 'menu_item menu_main'});
        els.item.style = 'margin-top: -14px; transform: scale(1)';
        els.main.appendChild(els.item);
        els.main.appendChild(els.name = Utils.createSPAN({text: 'Главная'}));
        els.main.onclick = _onMenuItemClick.bind(null, TYPE.MAIN);
        cfg.MENU3 = {els: els};
        div_b.appendChild(cfg.MENU3.els.main);

        els = {};
        els.main = Utils.createA({});
        els.main.style = 'width: 18%';
        els.main.appendChild(els.note = Utils.createDIV({class: 'menu_note menu_note_g', style: 'display: none'}));
        els.item = Utils.createDIV({class: 'menu_item menu_quest'});
        els.item.style = 'margin-top: 7px; transform: scale(0.785)';
        els.main.appendChild(els.item);
        els.main.appendChild(els.name = Utils.createSPAN({text: 'Задания'}));
        els.main.onclick = _onMenuItemClick.bind(null, TYPE.QUESTS);
        cfg.MENU4 = {els: els};
        div_b.appendChild(cfg.MENU4.els.main);

        els = {};
        els.main = Utils.createA({});
        els.main.style = 'width: 18%';
        els.main.appendChild(els.note = Utils.createDIV({class: 'menu_note menu_note_g', style: 'display: none'}));
        els.item = Utils.createDIV({class: 'menu_item menu_guild'});
        els.item.style = 'margin-top: 7px; transform: scale(0.785)';
        els.main.appendChild(els.item);
        els.main.appendChild(els.name = Utils.createSPAN({text: 'Гильдия'}));
        els.main.onclick = _onMenuItemClick.bind(null, TYPE.GUILD);
        cfg.MENU5 = {els: els};
        div_b.appendChild(cfg.MENU5.els.main);
        cfg.els.main.appendChild(div_b);

        cfg.els.main.appendChild(Utils.createDIV({class: 'bottom_brd'}));

        this.updateWHS();
    }

    function onMenuItemClick0(type) {
        let menu_old = getSelectedMenu();
        let menu_new = getMenuByType(type);

        if (menu_old === menu_new) return;

        TweenMax.to(menu_old.els.main, 0.3, {width: '18%', ease: Ease.easeOut});
        TweenMax.to(menu_old.els.item, 0.3, {marginTop: 7, scale: 0.785, ease: Ease.easeOut});
        Utils.removeClass(menu_old.els.main, 'active');

        TweenMax.to(menu_new.els.main, 0.3, {width: '28%', ease: Ease.easeOut});
        TweenMax.to(menu_new.els.item, 0.3, {marginTop: -14, scale: 1, ease: Ease.easeOut});
        Utils.addClass(menu_new.els.main, 'active');
        TweenMax.set(menu_new.els.name, {opacity: 0});
        TweenMax.to(menu_new.els.name, 0.1, {delay: 0.1, opacity: 1, ease: Ease.easeOut});

        let left;
        switch (type) {
            case TYPE.PROFILE:
                left = 0;
                break;
            case TYPE.CARDS:
                left = 18;
                break;
            case TYPE.MAIN:
                left = 18 * 2;
                break;
            case TYPE.QUESTS:
                left = 18 * 3;
                break;
            case TYPE.GUILD:
                left = 18 * 4;
                break;
        }
        TweenMax.to(cfg.els.active_bg, 0.3, {left: left + '%', ease: Ease.easeOut});
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
        if (Utils.hasClass(cfg.MENU1.els.main, 'active')) {
            return cfg.MENU1;
        }
        if (Utils.hasClass(cfg.MENU2.els.main, 'active')) {
            return cfg.MENU2;
        }
        if (Utils.hasClass(cfg.MENU3.els.main, 'active')) {
            return cfg.MENU3;
        }
        if (Utils.hasClass(cfg.MENU4.els.main, 'active')) {
            return cfg.MENU4;
        }
        if (Utils.hasClass(cfg.MENU5.els.main, 'active')) {
            return cfg.MENU5;
        }
    }

    function getMenuByType(type) {
        switch (type) {
            case TYPE.PROFILE: return cfg.MENU1;
            case TYPE.CARDS: return cfg.MENU2;
            case TYPE.MAIN: return cfg.MENU3;
            case TYPE.QUESTS: return cfg.MENU4;
            case TYPE.GUILD: return cfg.MENU5;
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
        updateWHS: function() {
            cfg.els.main.style.width = (app.LAYOUT.VK || app.LAYOUT.OK_750 || app.LAYOUT.EXERU || app.LAYOUT.FS || app.LAYOUT.MMR ? 751 : app.LAYOUT.w) + 'px';
            cfg.els.main.style.transform = '';
            if (app.LAYOUT.scale < 1) {
                cfg.els.main.style.transform = 'scale(' + app.LAYOUT.scale + ')';
                let top = app.LAYOUT.h - Utils.withOffsets(76, 2);
                top = top + (76 - 76 * app.LAYOUT.scale) + 3;
                cfg.els.main.style.top = top + 'px';
            } else {
                if (app.LAYOUT.VK || app.LAYOUT.OK_750 || app.LAYOUT.EXERU || app.LAYOUT.FS || app.LAYOUT.MMR) {
                    cfg.els.main.style.top = app.LAYOUT.h - Utils.withOffsets(76, 2) + 5 + 'px';
                } else {
                    cfg.els.main.style.top = app.LAYOUT.h - Utils.withOffsets(76, 2) + 'px';
                }
            }
        }
    }
})();