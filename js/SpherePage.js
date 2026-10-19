app.SpherePage = (function() {

    var p;
    function create(type) {
        p = app.Popups.createPopup1({
            header: {value: 'Сферы Силы и Магии'},
            display: {menu: 0, gold: 1, gems: 1},
            onShow: function() {
                clearData();
                createData();
                if (!p.tmp._firstTIme) {
                    p.tmp._firstTIme = 1;
                    TweenMax.delayedCall(0.001, function() {
                        var top = 0;
                        switch (type) {
                            case 'F':
                                top += app.LAYOUT.convert0(p.tmp.list['HIT'].main.getBoundingClientRect().height);
                                break;
                            case 'N':
                                top += app.LAYOUT.convert0(p.tmp.list['HIT'].main.getBoundingClientRect().height);
                                top += app.LAYOUT.convert0(p.tmp.list['F'].main.getBoundingClientRect().height);
                                break;
                            case 'W':
                                top += app.LAYOUT.convert0(p.tmp.list['HIT'].main.getBoundingClientRect().height);
                                top += app.LAYOUT.convert0(p.tmp.list['F'].main.getBoundingClientRect().height);
                                top += app.LAYOUT.convert0(p.tmp.list['N'].main.getBoundingClientRect().height);
                                break;
                        }
                        p.cfg.onScroll(top);
                    });
                }
            },
            onScroll: function(deltaY) {
                let scroll = p.scroll;
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

                if (scroll.top === scroll.topMax) {
                    p.tmp.scroll_sh_top.style.opacity = 0;
                } else {
                    p.tmp.scroll_sh_top.style.opacity = 1;
                }

                if (scroll.top === scroll.topMin) {
                    p.tmp.scroll_sh_bottom.style.opacity = 0;
                } else {
                    p.tmp.scroll_sh_bottom.style.opacity = 1;
                }

                return true;
            },
            onClose: function() {
                p.tmp._closed = 1;
                p = undefined;
            }
        });

        p.tmp = {};

        p.els.header.style.zIndex = 3;

        p.els.wrap.appendChild(p.tmp.scroll_sh_top = app.Utils.createDIV({class: 'scroll_sh_top', style: 'width: 440px; opacity: 0'}));
        p.els.wrap.appendChild(p.tmp.scroll_sh_bottom = app.Utils.createDIV({class: 'scroll_sh_bottom', style: 'width: 440px; opacity: 0'}));

        var availableHeight = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight() + 40);
        availableHeight = Math.min(availableHeight, 628);

        p.els.brd.style.top = '80px';
        p.els.brd_r.style.height = availableHeight + 'px';

        p.els.wrap.style.left = '20px';
        p.els.wrap.style.width = '440px';
        p.els.wrap.style.height = availableHeight + 'px';
        p.els.wrap_s.style.width = '440px';

        p.scroll.availableHeight = availableHeight;

        app.Popups.add(p);
    }

    function clearData() {
        app.Utils.removeAllChild(p.scroll.el);
    }

    function createData() {
        p.tmp.list = {};

        app.CFGUtil.getSpheresAllTypes().forEach(function(type) {
            let els = createSphere(type);
            p.scroll.el.appendChild(els.main);
            p.tmp.list[type] = els;
        });

        p.tmp.updateSpheres = function() {
            app.CFGUtil.getSpheresAllTypes().forEach(function(type) {
                let els = p.tmp.list[type];
                if (els.a_plus) {
                    let level = app.UserUtil.getSphereLevelByType(type);
                    let prices = app.UserUtil.getSphereUpgradePricesByType(type);
                    if (level >= app.Model.user.level + 1 || !app.UserUtil.canPay([{t: 0, v: prices[0]}, {t: 1,v: prices[1]}])) {
                        app.Utils.addClass(els.a_plus, 'plus_s_d');
                    }
                }
            });
        };

        p.scroll.top = 20;
        p.scroll.topMax = 20;
        p.scroll.el.style.top = p.scroll.top + 'px';

        TweenMax.delayedCall(0.001, function() {
            if (!p) return;
            p.scroll.contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height) + 20;
            p.scroll.topMin = p.scroll.availableHeight < p.scroll.contentRequiredHeight ? p.scroll.availableHeight - p.scroll.contentRequiredHeight : 0;
        });
    }

    function createSphere(type) {
        var els = {};
        els.type = type;
        let level = app.UserUtil.getSphereLevelByType(type);
        let q;
        if (level > 0) {
            q = app.CFGUtil.getSpheresCFGQualityByLevel(level);
        }

        let el = els.main = app.Utils.createDIV({class: 'list_s', style: 'left: 5px; width: 415px; padding: 5px; margin-bottom: 5px'});
        el.appendChild(app.Utils.createDIV({class: 'sphere_icon ' + app.Utils.getSphereClass(type) + (q ? q + 1 : '')}));

        let el1 = app.Utils.createDIV({class: 'rune_row_right'});

        let bonuses = app.UserUtil.getSphereBonusesByType(type);
        el1.appendChild(app.Utils.createDIV({class: 'flr', html: '<span class="health"></span><span class="normal">+{0}</span>'.format(bonuses[1])}));
        el1.appendChild(app.Utils.createDIV({class: 'flr', html: '<img src="'+app.IMAGES.getPath(app.CFGUtil.getElemIMGByType(type))+'" style="width: 16px; height: 16px;"><span class="normal">+{0}</span>'.format(bonuses[0])}));

        el1.appendChild(app.Utils.createDIV({class: 'major str pb3', text: app.CFGUtil.getSphereNameByType(type)}));

        el1.appendChild(app.Utils.createDIV({class: 'rune_descr', html: 'Уровень: <span class="info">{0}</span>'.format(level)}));

        let prices = app.UserUtil.getSphereUpgradePricesByType(type);
        el1.appendChild(app.Utils.createDIV({class: 'rune_descr', html: '<span class="res_icon res_icon_inline res_gem"></span>{0} <span class="res_icon res_icon_inline res_gold"></span>{1}'.format(prices[1], prices[0])}));

        switch (type) {
            case 'HIT':
                el1.appendChild(app.Utils.createDIV({class: 'rune_descr', html: 'Увеличивает урон любой физической атаки.<br>Также увеличивает здоровье персонажа.'}));
                break;
            case 'F':
                el1.appendChild(app.Utils.createDIV({class: 'rune_descr', html: 'Увеличивает урон от магических атак карт огня.<br>Также увеличивает здоровье персонажа.'}));
                break;
            case 'N':
                el1.appendChild(app.Utils.createDIV({class: 'rune_descr', html: 'Увеличивает урон от магических атак карт природы.<br>Также увеличивает здоровье персонажа.'}));
                break;
            case 'W':
                el1.appendChild(app.Utils.createDIV({class: 'rune_descr', html: 'Увеличивает урон от магических атак карт воды.<br>Также увеличивает здоровье персонажа.'}));
                break;
        }

        if (level === app.CFGUtil.getSpheresMaxLevel) {
            el1.appendChild(app.Utils.createDIV({class: 'rune_descr', html: '<span class="major">Сфера максимального уровня</span>'}));
        } else {
            bonuses = app.CFGUtil.getSphereBonuses(type, level + 1);
            el1.appendChild(app.Utils.createDIV({class: 'rune_descr', html: '<span class="major">На следующем уровне:</span><br><img src="'+app.IMAGES.getPath(app.CFGUtil.getElemIMGByType(type))+'" style="width: 16px; height: 16px;" class="vm"> <span class="info">+{0}</span><span class="health"></span><span class="info">+{1}</span>'.format(bonuses[0], bonuses[1])}));

            el1.appendChild(els.a_plus = app.Utils.createA({class: 'plus_skill'}, function() {
                app.Utils.addClass(els.a_plus, 'plus_s_d');
                app.Network.command({cmd: 'UserSphereLevelUp', type: type}, function(data) {
                    if (data.error) {
                        app.Utils.processErrors(data.error);
                    } else {
                        app.Utils.showInfo('Уровень поднят', {type: 0});
                        if (p) {
                            const els = createSphere(type);
                            p.scroll.el.replaceChild(els.main, p.tmp.list[type].main);
                            p.tmp.list[type] = els;
                            p.tmp.updateSpheres();
                        }
                    }
                });
            }));

            if (level >= app.Model.user.level + 1 || !app.UserUtil.canPay([{t: 0, v: prices[0]}, {t: 1, v: prices[1]}])) {
                app.Utils.addClass(els.a_plus, 'plus_s_d');
            }
        }
        el.appendChild(el1);
        return els;
    }

    return {
        create: create
    }
})();