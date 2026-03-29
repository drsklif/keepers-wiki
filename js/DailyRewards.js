app.DailyRewards = (function() {

    function create() {
        let p = app.Popups.createPopup1({
            header: {value: 'Ежедневная награда'},
            onShow: function() {
                _1(p);
            },
            onScroll: function(deltaY) {
                let scroll = p.scroll;
                if (scroll.topMax === 0) return;
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
            },
            onUpdate: function() {
                if (p.tmp.dr !== app.Model.user.dr) {
                    p.tmp.dr = app.Model.user.dr;
                    _1(p);
                    TweenMax.delayedCall(0.001, p.tmp.updateScroll);
                }
            },
            onClose: function() {
                p.tmp._closed = 1;
                p = undefined;
            }
        });

        p.tmp = {};
        p.tmp.dr = app.Model.user.dr;
        p.tmp.dr.current = app.UserUtil.getCurrentDailyRewardIDX();
        p.tmp.list = [];

        let availableHeight0 = app.LAYOUT.getClientWHS0(80 + 76);
        let availableHeight = Math.min(availableHeight0, 628);
        let top = (availableHeight0 - availableHeight) / 2;
        top = Math.max(80, top);

        p.els.brd_bg.className = 'brd_block_bg';
        p.els.brd.style.top = top + 'px';
        p.els.brd_r.style.height = availableHeight + 'px';
        p.els.wrap.style.height = availableHeight + 'px';

        p.els.wrap.appendChild(app.Utils.createDIV({class: 'scroll_sh_top', style: 'left: 25px; width: 435px'}));
        p.els.wrap.appendChild(app.Utils.createDIV({class: 'scroll_sh_bottom', style: 'left: 25px; width: 435px'}));
        p.cfg.onScroll(0);

        p.scroll.availableHeight = availableHeight;
        p.scroll.el.style.top = '20px';

        app.Popups.add(p);

        p.tmp.updateScroll = function() {
            if (!p) return;
            let contentRequiredHeight = 20 + (80 + 20 + 8 + 15) * Math.ceil(p.tmp.dr.l.length / 5);
            if (p.scroll.availableHeight < contentRequiredHeight) {
                p.scroll.topMax = 20;
                p.scroll.topMin = p.scroll.availableHeight - contentRequiredHeight;
            } else {
                p.scroll.topMax = 0;
                p.scroll.topMin = 0;
            }
        };
        TweenMax.delayedCall(0.001, function() {
            if (!p) return;
            p.tmp.updateScroll();
            let idx = p.tmp.dr.current;
            let row = Math.floor(idx / 5);
            let top = 120 * row;
            if (top > 0) {
                p.cfg.onScroll(top);
            }
        });
    }

    function _1(p) {
        app.Utils.removeAllChild(p.scroll.el);

        let months = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
        let list = p.tmp.dr.l;

        let c = 0;
        list.forEach(function(r) {
            if (r.rt) c++;
        });
        let text;
        if (c === 0) {
            text = 'Первая награда в {0}'.format(months[p.tmp.dr.m]);
        } else {
            text = 'Получена в {0} {1} {2}'.format(months[p.tmp.dr.m], c, app.Utils.getGramString(c, 'раз', 'раза', 'раз'));
        }
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'cntr major big', style: 'width: 480px; position: absolute; left: 0px;', text: text}));

        let div = app.Utils.createDIV({class: 'cntr', style: 'position: absolute; top: 40px'});
        let left_offset = 25;
        list.forEach(function(r, i) {
            let current = p.tmp.dr.current === i;
            let received = r.rt;
            let col = i % 5,
                row = Math.floor(i / 5);
            let left = left_offset + 88 * col;
            let top = 120 * row;
            let els = {};
            els.main = app.Utils.createDIV({class: 'item_slot', style: 'transform: scale(1.25)'});
            els.main.style.left = left + 'px';
            els.main.style.top = top + 'px';
            if (current) {
                els.main.style.zIndex = 1;
            }
            if (received) {
                app.Utils.addClass(els.main, 'item_slot_empty');
            } else if (current) {
                app.Utils.addClass(els.main, 'item_slot_q2');
            } else {
                app.Utils.addClass(els.main, 'item_slot_q5');
            }
            if (r.t) {
                els.main.appendChild(app.Utils.createSPAN({class: 'res_icon res_raid' + (received ? ' bw' : ''), style: 'left: 15px; top: 9px'}));
                els.main.appendChild(app.Utils.createSPAN({class: 'txt txt_need' + (received ? ' bw' : ''), text: app.Utils.toMoney1(r.t)}));
            }
            if (r.g1) {
                els.main.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold' + (received ? ' bw' : ''), style: 'left: 10px; top: 18px; transform: rotate(-18deg)'}));
                els.main.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold' + (received ? ' bw' : ''), style: 'left: 18px; top: 25px; transform: rotate(40deg) scale(0.7)'}));
                els.main.appendChild(app.Utils.createSPAN({class: 'res_icon res_gold' + (received ? ' bw' : ''), style: 'left: 18px; top: 37px; transform: scale(1.3) rotate(-52deg)'}));
                els.main.appendChild(app.Utils.createSPAN({class: 'txt txt_need' + (received ? ' bw' : ''), text: app.Utils.toMoney1(r.g1)}));
            }
            if (r.g2) {
                els.main.appendChild(app.Utils.createSPAN({class: 'gems_p' + (received ? ' bw' : ''), style: 'left: -45px; top: -50px; transform: scale(0.8); transform-origin: center'}));
                els.main.appendChild(app.Utils.createSPAN({class: 'txt txt_need' + (received ? ' bw' : ''), text: app.Utils.toMoney1(r.g2)}));
            }
            if (r.i) {
                let cfgItem = app.CFGUtil.getItemByID(r.i);
                els.main.appendChild(app.Utils.createIMG(cfgItem.img));
                els.main.appendChild(app.Utils.createSPAN({class: 'txt txt_need' + (received ? ' bw' : ''), text: app.Utils.toMoney1(r.v)}));
            }
            els.main.appendChild(els.brd = app.Utils.createSPAN({class: 'txt brd'}));
            els.main.appendChild(app.Utils.createSPAN({class: 'txt txt_day' + (received ? ' bw' : current ? ' r_green' : ' normal'), text: 'День ' + (i + 1)}));
            if (received) {
                els.main.appendChild(app.Utils.createSPAN({class: 'done', style: 'left: 12px; top: 15px'}));
            }
            if (current) {
                TweenMax.set(els.brd, {boxShadow: '0px 0px 15px 2px rgba(174,255,0,1)', borderRadius: 15});
                let tl = new TimelineMax({onComplete: function() {
                    if (p.tmp.dr === app.Model.user.dr) {
                        tl.progress(0);
                    }
                }});
                tl.to(els.brd, 1, {boxShadow: '0px 0px 15px 6px rgba(174,255,0,1)', ease: Elastic.easeOut});
                tl.to(els.brd, 0.5, {boxShadow: '0px 0px 15px 2px rgba(174,255,0,1)'});
                els.main.onclick = function() {
                    els.main.onclick = null;
                    app.Network.command({cmd: 'DailyRewardGet'}, function(data) {
                        if (data.error) {
                            app.Utils.processErrors(data.error);
                        } else {
                            let reward = data.reward;
                            if (reward.t) {
                                reward.tickets = reward.t;
                                delete reward.t;
                            }
                            if (reward.g1) {
                                reward.gold = reward.g1;
                                delete reward.g1;
                            }
                            if (reward.g2) {
                                reward.gems = reward.g2;
                                delete reward.g2;
                            }
                            if (reward.i) {
                                reward.item = reward.i;
                                reward.itemCount = reward.v;
                                delete reward.i;
                                delete reward.v;
                            }
                            app.Utils.createRewardPopup(data.reward, {header: 'Награда', ad: {daily: 1}});
                            app.Popups.removePopup(p);
                        }
                    });
                };
            }
            p.tmp.list.push({els: els});
            div.appendChild(els.main);
        });

        p.scroll.el.appendChild(div);
    }

    return {
        create: create
    };
})();