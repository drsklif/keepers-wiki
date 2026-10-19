app.SearchPage = (function() {

    var TimeUtil, Utils, CFGUtil, UserUtil, Popups, EventDispatcher, Network;

    function _init() {
        TimeUtil = app.TimeUtil;
        Utils = app.Utils;
        CFGUtil = app.CFGUtil;
        UserUtil = app.UserUtil;
        Popups = app.Popups;
        EventDispatcher = app.EventDispatcher;
        Network = app.Network;
    }

    var popup;

    // 1 - ищем по игрокам
    // 2 - ищем по гильдиям
    function create(type) {
        _init();

        const cfg = {};
        cfg.type = type;
        cfg.display = {gold: 1, gems: 1};
        cfg.onScroll = function(deltaY) {
            let scroll = popup.scroll;
            if (scroll.topMax === 0 || scroll.topMin === 0) return true;
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
        };
        cfg.onClose = function() {
        };

        popup = Popups.createPopup1(cfg);

        let availableHeight;
        const lp = Popups.getLast();
        if (lp && lp.cfg && lp.cfg.display && !lp.cfg.display.menu) {
            availableHeight = app.LAYOUT.getClientWHS0(80 + 40);
        } else {
            cfg.display.menu = 1;
            availableHeight = app.LAYOUT.getClientWHS0(80 + app.Menu.getFooterHeight() + 40);
        }
        availableHeight = Math.min(availableHeight, 628);

        popup.tmp = {};
        popup.tmp.availableHeight = availableHeight;

        popup.els.brd.style.top = '80px';
        popup.els.brd_r.style.height = availableHeight + 'px';

        popup.els.wrap.style.top = '80px';
        popup.els.wrap.style.width = '420px';
        popup.els.wrap.style.height = (availableHeight - 80) + 'px';
        popup.els.wrap.style.left = '30px';
        popup.els.wrap_s.style.width = '420px';
        popup.els.wrap.appendChild(Utils.createDIV({class: 'scroll_sh_top', style: 'width: 420px'}));
        popup.els.wrap.appendChild(Utils.createDIV({class: 'scroll_sh_bottom', style: 'width: 420px'}));

        popup.cfg.tabs = {active: type};

        const tab = popup.cfg.tabs.tab = {els: {}};
        tab.els.main = Utils.createA({class: 'brd_block_tab', style: 'left: 30px', text: type === 1 ? 'Игроки' : 'Гильдии'}, onTabClick.bind(null, type));
        popup.els.brd_r.appendChild(tab.els.main);
        popup.els.brd_r.appendChild(tab.els.main);

        Popups.add(popup);

        onTabClick(popup.cfg.tabs.active);
    }

    function onTabClick(tab) {
        const tabs = popup.cfg.tabs;

        tabs.active = tab;

        Utils.removeClass(tabs.tab.els.main, 'brd_block_tab_active');
        if (tabs.t2) Utils.removeClass(tabs.t2.els.main, 'brd_block_tab_active');

        Utils.removeAllChild(popup.scroll.el);

        if (popup.tmp.tab) {
            popup.tmp.tab.list.forEach(function(el) {
                el.parentNode.removeChild(el);
            });
            delete popup.tmp.tab;
        }
        if (popup.tmp.t2) {
            popup.tmp.t2.list.forEach(function(el) {
                el.parentNode.removeChild(el);
            });
            delete popup.tmp.t2;
        }

        if (tab === 1) {
            Utils.addClass(tabs.tab.els.main, 'brd_block_tab_active');
            showTab1();
        } else {
            Utils.addClass(tabs.tab.els.main, 'brd_block_tab_active');
            showTab2();
        }
    }

    function showTab1() {
        popup.tmp.tab = {};
        popup.tmp.tab.list = [];

        popup.els.wrap.style.top = '100px';
        popup.els.wrap.style.height = (popup.tmp.availableHeight - 80 - 20) + 'px';

        popup.scroll.availableHeight = popup.tmp.availableHeight - 110;
        popup.scroll.availableHeight -= 20;

        var div = Utils.createDIV({class: 'list_s', style: 'position: relative; left: 25px; top: 15px; width: 415px; padding: 5px'});
        var a;
        div.appendChild(a = Utils.createA({class: 'btn_g', style: 'top: 12px; left: 190px', text: 'Найти игрока'}, function() {
            if (Utils.hasClass(a, 'bw')) return;
            Utils.addClass(a, 'bw');
            var value = input.value.trim().toLowerCase();
            if (value.length === 0 || value === 'введите ник игрока') {
                Utils.showInfo('Неверное имя');
                Utils.removeClass(a, 'bw');
                return;
            }
            Network.command({cmd: 'UserFindByName', name: value}, function(data) {
                if (!popup) return;
                Utils.removeClass(a, 'bw');
                if (data.error) {
                    switch (data.error.code) {
                        default:
                            Utils.showInfo('Игрок не найден');
                            break;
                    }
                } else {
                    Utils.removeAllChild(popup.scroll.el);
                    popup.scroll.top = 0;
                    popup.scroll.topMax = 0;
                    popup.scroll.el.style.top = '0px';
                    if (data.list) {
                        create(data.list);
                    } else {
                        Utils.showInfo('Никто не найден');
                    }
                }
            });
        }));
        div.appendChild(Utils.createDIV({class: 'major str tdn', text: 'Поиск по нику:'}));
        var div0 = Utils.createDIV();
        var input = Utils.createEL('input', {class: 'minor', style: 'width: 170px'});
        input.type = 'text';
        input.value = 'Введите ник игрока';
        input.onfocus = function() {
            Utils.removeClass(input, 'minor');
            var value = input.value.trim();
            if (value.toLowerCase() === 'введите ник игрока') {
                input.value = '';
            }
        };
        input.onblur = function() {
            var value = input.value.trim();
            if (value.length === 0 || value.toLowerCase() === 'введите ник игрока') {
                console.log(Utils);
                Utils.addClass(input, 'minor');
                input.value = 'Введите ник игрока';
            }
        };
        input.addEventListener('keyup', function(event) {
            switch (event.keyCode) {
                case 13:
                    a.onclick();
                    break;
            }
        });
        div0.appendChild(input);
        div.appendChild(div0);
        popup.els.brd_r.appendChild(div);
        popup.tmp.tab.list.push(div);

        Network.command({cmd: 'Online'}, function(data) {
            var div1 = Utils.createDIV({class: 'mt5', html: 'Онлайн: <span class="info">{0}</span>'.format(Utils.toMoney1(data.online))});
            div.appendChild(div1);
        });

        var create = function(list) {
            popup.scroll.top = 20;
            popup.scroll.topMax = 20;
            popup.scroll.topMin = 0;
            popup.scroll.el.style.top = '20px';
            list.forEach(function(entry) {
                var div = Utils.createDIV({class: 'rating_row'}, EventDispatcher.dispatchEvent.bind(null, 'user info', entry.id));

                var avatar = app.Utils.createAvatarComponent(entry.r, entry.a);
                avatar.els.main.style = 'left: 0px; transform: scale(0.5)';
                div.appendChild(avatar.els.main);

                var el = Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 40px'});
                el.appendChild(Utils.createA({class: 'major str tdn', text: UserUtil.getUserNameUpper0(entry.n)}));
                el.appendChild(Utils.createDIV({class: 'clr'}));
                el.appendChild(Utils.createSPAN({class: 'mt5 fll', text: entry.l + 1 + ' уровень'}));
                if (UserUtil.isOnline(entry.lat)) {
                    el.appendChild(Utils.createDIV({class: 'menu_note menu_note_g', style: 'top: 10px'}));
                } else {
                    el.appendChild(Utils.createDIV({class: 'flr mt5', text: '{0} назад'.format(TimeUtil.formatToHumanTime(TimeUtil.now() - entry.lat, 1))}));
                }
                div.appendChild(el);

                popup.scroll.el.appendChild(div);
                popup.scroll.el.appendChild(Utils.createDIV({class: 'hr mtb5'}));
            });
            TweenMax.delayedCall(0.001, function() {
                var contentRequiredHeight = app.LAYOUT.convert0(popup.scroll.el.getBoundingClientRect().height);
                contentRequiredHeight -= 20;
                popup.scroll.topMin = popup.scroll.availableHeight < contentRequiredHeight ? popup.scroll.availableHeight - contentRequiredHeight : 0;
            });
        };
    }

    function showTab2() {
        popup.tmp.tab = {};
        popup.tmp.tab.list = [];

        popup.els.wrap.style.top = '100px';
        popup.els.wrap.style.height = (popup.tmp.availableHeight - 80 - 20) + 'px';

        popup.scroll.availableHeight = popup.tmp.availableHeight - 110;
        popup.scroll.availableHeight -= 20;

        const div = Utils.createDIV({class: 'list_s', style: 'position: relative; left: 25px; top: 15px; width: 415px; padding: 5px'});

        let a;
        div.appendChild(a = Utils.createA({class: 'btn_g', style: 'top: 12px; left: 190px', text: 'Найти гильдию'}, function() {
            if (Utils.hasClass(a, 'bw')) return;
            Utils.addClass(a, 'bw');
            const value = input.value.trim().toLowerCase();
            if (value.length === 0 || value === 'введите название гильдии') {
                Utils.showInfo('Неверное имя');
                Utils.removeClass(a, 'bw');
                return;
            }
            Network.command({cmd: 'GuildFind', name: value}, function(data) {
                if (!popup) return;
                Utils.removeClass(a, 'bw');
                if (data.error) {
                    switch (data.error.code) {
                        default:
                            Utils.showInfo('Гильдия не найдена');
                            break;
                    }
                } else {
                    Utils.removeAllChild(popup.scroll.el);
                    popup.scroll.top = 0;
                    popup.scroll.topMax = 0;
                    popup.scroll.el.style.top = '0px';
                    if (data.list) {
                        create(data.list);
                    } else {
                        Utils.showInfo('Никто не найден');
                    }
                }
            });
        }));
        div.appendChild(Utils.createDIV({class: 'major str tdn', text: 'Поиск по гильдиям:'}));
        const div0 = Utils.createDIV();
        const input = Utils.createEL('input', {class: 'minor', style: 'width: 170px'});
        input.type = 'text';
        input.value = 'Введите название гильдии';
        input.onfocus = function() {
            Utils.removeClass(input, 'minor');
            var value = input.value.trim();
            if (value.toLowerCase() === 'введите название гильдии') {
                input.value = '';
            }
        };
        input.onblur = function() {
            const value = input.value.trim();
            if (value.length === 0 || value.toLowerCase() === 'введите название гильдии') {
                console.log(Utils);
                Utils.addClass(input, 'minor');
                input.value = 'Введите название гильдии';
            }
        };
        input.addEventListener('keyup', function(event) {
            switch (event.keyCode) {
                case 13:
                    a.onclick();
                    break;
            }
        });
        div0.appendChild(input);
        div.appendChild(div0);
        popup.els.brd_r.appendChild(div);
        popup.tmp.tab.list.push(div);

        const create = function(list) {
            popup.scroll.top = 20;
            popup.scroll.topMax = 20;
            popup.scroll.topMin = 0;
            popup.scroll.el.style.top = '20px';

            list.forEach(function(entry) {
                const div = Utils.createDIV({class: 'rating_row'}, EventDispatcher.dispatchEvent.bind(null, 'guild info', entry.id));

                const avatar = Utils.createA({class: 'guild_info_l', style: 'transform: scale(0.5); left: 0px;'});
                avatar.appendChild(Utils.createIMG(entry.avatar.img, {w: 96, h: 96}));
                avatar.appendChild(Utils.createDIV({class: 'guild_info_l_brd guild_rank_bronze'}));
                div.appendChild(avatar);

                const el = Utils.createDIV({class: 'rating_row_r', style: 'margin-left: 65px; min-height: 48px'});
                el.appendChild(Utils.createA({class: 'major str tdn', text: app.GuildUtil.getUpperName(entry.name)}));
                el.appendChild(Utils.createText(' '));
                el.appendChild(Utils.createSPAN({class: entry.minLevel > app.Model.user.level + 1 ? 'red' : 'minor', text: '(' + entry.minLevel + '+)'}));
                el.appendChild(Utils.createDIV({class: 'clr'}));
                const el1 = Utils.createSPAN({class: 'dbl fll'});
                el1.appendChild(Utils.createText('Состав: '));
                el1.appendChild(Utils.createSPAN({class: 'r_green', text: entry.members.online}));
                el1.appendChild(Utils.createText(' / '));
                el1.appendChild(Utils.createSPAN({class: entry.members.total >= app.GuildUtil.GUILD_LIMIT ? 'red' : 'info', text: entry.members.total}));
                el1.appendChild(Utils.createText(' / ' + app.GuildUtil.GUILD_LIMIT));
                el1.appendChild(Utils.createBR());
                el1.appendChild(Utils.createText('Тонус за 7 дней: ' + entry.wes));
                el.appendChild(el1);
                div.appendChild(el);

                popup.scroll.el.appendChild(div);
                popup.scroll.el.appendChild(Utils.createDIV({class: 'hr mtb5'}));
            });

            TweenMax.delayedCall(0.001, function() {
                let contentRequiredHeight = app.LAYOUT.convert0(popup.scroll.el.getBoundingClientRect().height);
                contentRequiredHeight -= 10;
                popup.scroll.topMin = popup.scroll.availableHeight < contentRequiredHeight ? popup.scroll.availableHeight - contentRequiredHeight : 0;
            });
        };
    }

    return {
        create: create
    }
})();