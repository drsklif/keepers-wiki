if (!app.Shop) {
    app.Shop = {
        createByType(cfg, type) {
            const shop = app.UserUtil.getShopByType(type);
            if (!shop) return;

            const p = app.Popups.createPopup1({
                id: cfg.id || 'SHOP_' + type,
                display: cfg.display || {},
                onUpdate() {
                    const shop = app.UserUtil.getShopByType(type);
                    if (p.tmp.shop && p.tmp.shop !== shop) {
                        p.tmp.shop = shop;
                        p.tmp.type = type;
                        app.Shop._clear(p);
                        app.Shop._create(p);
                        cfg.onUpdate && TweenMax.delayedCall(0.001, cfg.onUpdate);
                    }
                },
                onEscape() {
                    cfg.onEscape && cfg.onEscape();
                    return true;
                },
                onCloseBTNClick() {
                    cfg.onCloseBTNClick && cfg.onCloseBTNClick();
                },
                onReplace() {
                    p.tmp._closed = 1;
                    cfg.onReplace && TweenMax.delayedCall(0.001, cfg.onReplace);
                },
                onClose() {
                    p.tmp._closed = 1;
                    cfg.onClose && TweenMax.delayedCall(0.001, cfg.onClose);
                }
            });

            p.tmp = {
                shop: shop,
                type: type
            };

            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + 76);
            const contentRequiredHeight = 628;

            let availableHeight = Math.min(contentRequiredHeight, availableHeight0);
            let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';

            p.scroll.availableHeight = availableHeight;

            p.els.wrap.style.top = '70px';
            p.els.wrap.style.left = '0px';
            p.els.wrap.style.width = '480px';
            p.els.wrap.style.height = (p.scroll.availableHeight - 70) + 'px';
            p.els.wrap_s.style.width = '480px';

            if (cfg.tabs) {
                cfg.tabs.forEach(tab => {
                    p.els.brd_r.appendChild(tab.els.main);
                });
            }
            this._create(p);

            TweenMax.delayedCall(0.001, () => {
                if (p.tmp._closed) return;

                let contentRequiredHeight = 0;
                for (let i = 0; i < p.tmp.shop.slots.length; i += 2) {
                    contentRequiredHeight += app.LAYOUT.convert0(p.tmp.shop.slots[i].els.main.getBoundingClientRect().height);
                }
                contentRequiredHeight += 20;

                const availableHeight = p.scroll.availableHeight - 70 - 30;

                p.scroll.top = 0;
                p.scroll.topMax = availableHeight < contentRequiredHeight ? contentRequiredHeight - availableHeight : 0;
                p.scroll.el.style.top = p.scroll.top + 'px';
            });

            app.Popups.add(p);

            return p;
        },

        _clear(p) {
            if (p.tmp.list) {
                p.tmp.list.forEach(el => {
                    if (el.parentNode) el.parentNode.removeChild(el)
                });
                delete p.tmp.list;
            }
            if (p.tmp.shop.slots) {
                delete p.tmp.shop.slots;
            }
            app.Utils.removeAllChild(p.scroll.el);
        },

        _create(p) {
            p.tmp.list = [];

            const cfg = {
                els: {}
            };

            cfg.els.main = app.Utils.createDIV({class: 'battle_advice', style: 'top: 15px'});
            cfg.els.main.appendChild(app.Utils.createText('Новые товары через: '));
            cfg.els.main.appendChild(cfg.els.time = app.Utils.createSPAN({class: 'info', text: app.TimeUtil.formatToHumanTime(p.tmp.shop.rt - app.TimeUtil.now(), 2)}));
            cfg.els.main.appendChild(cfg.els.refresh = app.Utils.createA({class: 'tdn'}, function() {
                if (app.Utils.hasClass(cfg.els.refresh, 'bw')) return;
                app.Utils.addClass(cfg.els.refresh, 'bw');
                const type = p.tmp.type;
                app.Network.command({cmd: 'ShopReset', type}, function(data) {
                    if (data.error) {
                        app.Utils.processErrors(data.error);
                    } else {
                        app.UserUtil.getShopByType(type).lvt = app.TimeUtil.now();
                        if (p.tmp._closed) return;
                        p.cfg.onUpdate();
                        app.Utils.showInfo('Магазин обновлен', {type: 0});
                    }
                });
            }));
            cfg.els.refresh.appendChild(app.Utils.createSPAN({class: 'refresh_btn ml5'}));
            app.Utils.appendPriceBlock(cfg.els.refresh, p.tmp.shop.rp);
            p.els.brd_r.appendChild(cfg.els.main);
            p.tmp.list.push(cfg.els.main);

            p.tmp.shop.slots = [];
            p.tmp.shop.list.forEach((entry, i) => {
                const cfg = this._createSlot(p, i, entry);

                const col = i % 2,
                    row = Math.floor(i / 2);
                const left = 25 + 217 * col;
                let top = 0;

                if (row > 0) {
                    for (let i1 = i - 2; i1 >= 0; i1 -= 2) {
                        let ep = p.tmp.shop.list[i1];
                        if (ep.card) {
                            top += 135;
                        } else {
                            top += 120;
                        }
                    }
                }

                cfg.els.main.style.top = top + 'px';
                cfg.els.main.style.left = left + 'px';

                p.tmp.shop.slots.push(cfg);
                p.scroll.el.appendChild(cfg.els.main);
            });
        },

        _createSlot(p, i, entry) {
            const cfg = {els: {}};

            cfg.els.main = app.Utils.createDIV({class: 'list_s', style: 'position: absolute; width: 208px; height: 110px'});

            let cfgItem;
            let cfgCard;
            let name;

            if (entry.item) {
                cfgItem = app.CFGUtil.getItemByID(entry.item);
                name = cfgItem.name;
            } else if (entry.card) {
                cfgCard = app.CFGUtil.getCardByID(entry.card);
                name = cfgCard.name;
                cfg.els.main.style.height = '125px';
            } else if (entry.tickets) {
                name = 'Часы';
            } else if (entry.dust) {
                name = 'Рунная пыль';
            } else if (entry.sd) {
                name = 'Каменная пыль';
            } else if (entry.gold) {
                name = 'Золото';
            }

            cfg.els.main.appendChild(app.Utils.createDIV({class: 'cntr str major pt5', style: 'font-size: 12px', text: name}));

            if (cfgItem) {
                const div = app.Utils.createDIV({class: 'item_slot ' + app.Utils.getItemQualityClass(cfgItem.quality), style: {left: '12px', top: '25px'}});
                div.appendChild(app.Utils.createIMG(cfgItem.img, {w: 55}));
                div.appendChild(app.Utils.createSPAN({class: 'item_slot_counter', text: entry.value}));
                div.appendChild(app.Utils.createSPAN({class: 'brd'}));
                app.Utils.addItemInfoOnClick1(div, {item: entry.item});
                cfg.els.main.appendChild(div);

            } else if (cfgCard) {
                const div = app.Utils.createDIV({class: 'sh_card', style: 'left: 8px; top: 25px; transform: scale(0.5)'});
                let qClass = app.Utils.getCardQualityClass(cfgCard.quality);
                if (qClass) {
                    app.Utils.addClass(div, qClass);
                }
                div.appendChild(app.Utils.createIMG(cfgCard.img, {class: 'sh_skill'}));
                div.appendChild(app.Utils.createDIV({class: 'sh_card_brd'}));
                div.appendChild(app.Utils.createDIV({class: 'sh_card_elem'}, null, [app.Utils.createIMG(app.CFGUtil.getCardElemIMGByID(cfgCard.id), {w: 30, h: 30})]));
                div.appendChild(app.Utils.createDIV({class: 'sh_card_lamp_rdy'}));
                div.appendChild(app.Utils.createSPAN({class: 'txt cntr', text: entry.value}));
                app.Utils.addItemInfoOnClick1(div, {card: entry.card});
                cfg.els.main.appendChild(div);

            } else if (entry.tickets) {
                const div = app.Utils.createDIV({class: 'item_slot item_slot_full', style: 'left: {0}px; top: {1}px'.format(12, 25)});
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_raid', style: 'left: 15px; top: 9px'}));
                div.appendChild(app.Utils.createSPAN({class: 'txt txt_need', text: entry.value}));
                div.appendChild(app.Utils.createSPAN({class: 'brd'}));
                app.Utils.addItemInfoOnClick1(div, {tickets: 1});
                cfg.els.main.appendChild(div);

            } else if (entry.dust) {
                const div = app.Utils.createDIV({class: 'item_slot item_slot_full', style: 'left: {0}px; top: {1}px'.format(12, 25)});
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_dust', style: 'left: 15px; top: 9px'}));
                div.appendChild(app.Utils.createSPAN({class: 'txt txt_need', text: entry.value}));
                div.appendChild(app.Utils.createSPAN({class: 'brd'}));
                app.Utils.addItemInfoOnClick1(div, {dust: 1});
                cfg.els.main.appendChild(div);

            } else if (entry.sd) {
                const div = app.Utils.createDIV({class: 'item_slot item_slot_full', style: 'left: {0}px; top: {1}px'.format(12, 25)});
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_dust_stone', style: 'left: 15px; top: 9px'}));
                div.appendChild(app.Utils.createSPAN({class: 'txt txt_need', text: entry.value}));
                div.appendChild(app.Utils.createSPAN({class: 'brd'}));
                app.Utils.addItemInfoOnClick1(div, {sd: 1});
                cfg.els.main.appendChild(div);

            } else if (entry.gold) {
                const div = app.Utils.createDIV({class: 'item_slot item_slot_full', style: 'left: {0}px; top: {1}px'.format(12, 25)});
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 12px; top: 15px; transform: rotate(-18deg);'}));
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 18px; top: 22px; transform: rotate(40deg) scale(0.7);'}));
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 36px; top: 28px; transform: rotate(-40deg) scale(0.7);'}));
                div.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 18px; top: 34px; transform: scale(1) rotate(-52deg);'}));
                div.appendChild(app.Utils.createSPAN({class: 'txt txt_need', text: app.Utils.toMoney1(entry.value)}));
                div.appendChild(app.Utils.createSPAN({class: 'brd'}));
                app.Utils.addItemInfoOnClick1(div, {gold: 1});
                cfg.els.main.appendChild(div);
            }

            if (entry.bought) {
                const div = app.Utils.createDIV({class: 'slot_info', style: 'left: 82px'});
                div.appendChild(app.Utils.createDIV({class: 'minor cntr str', style: 'position: absolute; width: 115px; left: 0px; top: 15px', text: 'Куплено'}));
                cfg.els.main.appendChild(div);
            } else {
                const div = app.Utils.createDIV({class: 'slot_info', style: 'left: 82px'});
                const div1 = app.Utils.createDIV({class: 'cntr w115'});
                app.Utils.appendPriceBlock(div1, entry.price);
                div.appendChild(div1);

                div.appendChild(cfg.els.buy_a = app.Utils.createA({class: 'btn_g btn_gs_c', style: 'left: 0px; top: 25px', text: 'Купить'}, function() {
                    if (entry.tickets && app.Model.user.level < 9) {
                        app.Utils.showInfo('Часы достпны с 10 уровня');
                        return;
                    }
                    if (!app.UserUtil.canPay(entry.price)) {
                        app.EventDispatcher.emit('not enough resources', {price: entry.price});
                        return;
                    }
                    if (app.Utils.hasClass(cfg.els.buy_a, 'bw')) {
                        app.Utils.showInfo('В процессе');
                        return;
                    }

                    p.tmp.shop.slots.forEach(function(e) {
                        if (e.buy_a) app.Utils.addClass(e.buy_a, 'bw');
                    });

                    const type = p.tmp.type;
                    app.Network.command({cmd: 'ShopBuyItem', type: type, slot: i}, function(data) {
                        if (data.error) {
                            app.Utils.processErrors(data.error);
                        } else {
                            entry.bought = 1;

                            if (entry.item) app.UserUtil.addItem(entry.item, entry.value);
                            if (entry.card) app.UserUtil.addCard(entry.card, entry.value);

                            app.EventDispatcher.emit('user resources changed');

                            app.Utils.showInfo('Куплено', {type: 0});
                        }

                        if (!p || type !== p.tmp.type) return;

                        const cfg_new = app.Shop._createSlot(p, i, entry);
                        const cfg_old = p.tmp.shop.slots[i];
                        p.tmp.shop.slots[i] = cfg_new;
                        p.tmp.shop.slots.forEach(function(e) {
                            if (e.buy_a) app.Utils.removeClass(e.buy_a, 'bw');
                        });
                        cfg_new.els.main.style.top = cfg_old.els.main.style.top;
                        cfg_new.els.main.style.left = cfg_old.els.main.style.left;
                        p.scroll.el.replaceChild(cfg_new.els.main, cfg_old.els.main);
                    });
                }));

                if (entry.tickets && app.Model.user.level < 9) {
                    app.Utils.addClass(cfg.els.buy_a, 'bw');
                }

                cfg.els.main.appendChild(div);
            }

            return cfg;
        }
    };
}
