app.Avatars = (function() {

    function createCharacterAvatarsBlock(p) {
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'big str mt10 major cntr', style: 'width: 420px', text: 'Персонажи:'}));

        // Мужские персонажи
        let el = app.Utils.createDIV({style: 'position: relative; margin-top: 10px; height: 80px'});
        [1, 2, 3, 4].forEach(function (idx, i) {
            let col = i % 4;
            let top = 0;
            let left = 40 + col * 90;
            let cfg = {
                img: '/images/avatars/male/{0}.jpg'.format(idx),
                els: {},
                price: 0
            };
            let el1 = app.Utils.createA({class: 'pers_info_l', style: 'top: {0}px; left: {1}px'.format(top, left)}, onSelect.bind(null, p, cfg));
            el1.appendChild(app.Utils.createIMG(cfg.img, {w: 60, h: 60}));
            el1.appendChild(cfg.els.brd1 = app.Utils.createDIV({class: 'pers_info_l_brd'}));
            el1.appendChild(cfg.els.brd2 = app.Utils.createDIV({class: 'pers_info_l_brd pers_info_l_brd_selected', style: 'opacity: 0'}));
            el.appendChild(el1);
            if (cfg.img === p.tmp.avatar.img) p.tmp.selected = cfg;
        });
        p.scroll.el.appendChild(el);

        // Женские персонажи
        el = app.Utils.createDIV({style: 'position: relative; height: 80px'});
        [1, 2, 3, 4].forEach(function (idx, i) {
            let col = i % 4;
            let top = 0;
            let left = 40 + col * 90;
            let cfg = {
                img: '/images/avatars/female/{0}.jpg'.format(idx),
                els: {},
                price: 0
            };
            let el1 = app.Utils.createA({class: 'pers_info_l', style: 'top: {0}px; left: {1}px'.format(top, left)}, onSelect.bind(null, p, cfg));
            el1.appendChild(app.Utils.createIMG(cfg.img, {w: 60, h: 60}));
            el1.appendChild(cfg.els.brd1 = app.Utils.createDIV({class: 'pers_info_l_brd'}));
            el1.appendChild(cfg.els.brd2 = app.Utils.createDIV({class: 'pers_info_l_brd pers_info_l_brd_selected', style: 'opacity: 0'}));
            el.appendChild(el1);
            if (cfg.img === p.tmp.avatar.img) p.tmp.selected = cfg;
        });
        p.scroll.el.appendChild(el);
    }

    function createCardAvatarsBlock(p) {
        let list0 = [],
            list1 = [],
            list2 = [];

        // default card id
        list0.push(app.CFGUtil.getDefaultCard());
        app.Model.user.cards.list.forEach(function(entry) {
            if (entry.level === -1) return;
            let cfgCard = app.CFGUtil.getCardByID(entry.card);
            switch (cfgCard.quality) {
                case 0:
                    list0.push(cfgCard);
                    break;
                case 1:
                    list1.push(cfgCard);
                    break;
                case 2:
                    list2.push(cfgCard);
                    break;
            }
        });

        if (list0.length > 0) {
            p.scroll.el.appendChild(app.Utils.createDIV({class: 'big str mb10 major cntr', style: 'width: 420px', text: 'Обычные карты:'}));

            // обновляли аватарку лорда, и нужно показывать новую тоже, если карта куплена
            {
                const cId = 3;
                if (list0.find(x => x.id === cId) != null) {
                    let cfgCard = app.CFGUtil.getCardByID(cId);
                    if (getPrice(cfgCard) === 0) {
                        cfgCard = app.Utils.clone(cfgCard);
                        cfgCard.img = '/images/cards/vampire2.jpg';
                        list0.push(cfgCard);
                    }
                }
            }

            for (let i = 0; i < list0.length; i += 4) {
                let el = app.Utils.createDIV({style: 'position: relative; height: 90px'});
                list0.slice(i, i + 4).forEach(function(cfgCard, i) {
                    let col = i % 4;
                    let top = 0;
                    let left = 40 + col * 90;
                    let cfg = {
                        img: cfgCard.img,
                        els: {},
                        price: getPrice(cfgCard)
                    };
                    let el1 = app.Utils.createA({class: 'pers_info_l', style: 'top: {0}px; left: {1}px'.format(top, left)}, onSelect.bind(null, p, cfg));
                    el1.appendChild(app.Utils.createDIV({class: 'ava_hidden ava_id' + cfgCard.id, html: '<img src="{0}" style="width: 60px;">'.format(app.IMAGES.getPath(cfg.img))}));
                    el1.appendChild(cfg.els.brd1 = app.Utils.createDIV({class: 'pers_info_l_brd'}));
                    el1.appendChild(cfg.els.brd2 = app.Utils.createDIV({class: 'pers_info_l_brd pers_info_l_brd_selected', style: 'opacity: 0'}));
                    if (cfg.price) el1.appendChild(app.Utils.createDIV({class: 'emblem_price', html: '<span class="res_icon res_icon_inline res_gem"></span>{0}'.format(cfg.price)}));
                    el.appendChild(el1);
                    if (cfg.img === p.tmp.avatar.img) p.tmp.selected = cfg;
                });
                p.scroll.el.appendChild(el);
            }
        }

        if (list1.length > 0) {
            p.scroll.el.appendChild(app.Utils.createDIV({class: 'big str mb10 major cntr', style: 'width: 420px', text: 'Необычные карты:'}));
            for (let i = 0; i < list1.length; i += 4) {
                let el = app.Utils.createDIV({style: 'position: relative; height: 90px'});
                list1.slice(i, i + 4).forEach(function(cfgCard, i) {
                    let col = i % 4;
                    let top = 0;
                    let left = 40 + col * 90;
                    let cfg = {
                        img: cfgCard.img,
                        els: {},
                        price: getPrice(cfgCard)
                    };
                    let el1 = app.Utils.createA({class: 'pers_info_l', style: 'top: {0}px; left: {1}px'.format(top, left)}, onSelect.bind(null, p, cfg));
                    el1.appendChild(app.Utils.createDIV({class: 'ava_hidden ava_id' + cfgCard.id, html: '<img src="{0}" style="width: 60px;">'.format(app.IMAGES.getPath(cfg.img))}));
                    el1.appendChild(cfg.els.brd1 = app.Utils.createDIV({class: 'pers_info_l_brd'}));
                    el1.appendChild(cfg.els.brd2 = app.Utils.createDIV({class: 'pers_info_l_brd pers_info_l_brd_selected', style: 'opacity: 0'}));
                    if (cfg.price) el1.appendChild(app.Utils.createDIV({class: 'emblem_price', html: '<span class="res_icon res_icon_inline res_gem"></span>{0}'.format(cfg.price)}));
                    el.appendChild(el1);
                    if (cfg.img === p.tmp.avatar.img) p.tmp.selected = cfg;
                });
                p.scroll.el.appendChild(el);
            }
        }

        if (list2.length > 0) {
            p.scroll.el.appendChild(app.Utils.createDIV({class: 'big str mb10 major cntr', style: 'width: 420px', text: 'Редкие карты:'}));
            for (let i = 0; i < list2.length; i += 4) {
                let el = app.Utils.createDIV({style: 'position: relative; height: 90px'});
                list2.slice(i, i + 4).forEach(function(cfgCard, i) {
                    let col = i % 4;
                    let top = 0;
                    let left = 40 + col * 90;
                    let cfg = {
                        img: cfgCard.img,
                        els: {},
                        price: getPrice(cfgCard)
                    };
                    let el1 = app.Utils.createA({class: 'pers_info_l', style: 'top: {0}px; left: {1}px'.format(top, left)}, onSelect.bind(null, p, cfg));
                    el1.appendChild(app.Utils.createDIV({class: 'ava_hidden ava_id' + cfgCard.id, html: '<img src="{0}" style="width: 60px;">'.format(app.IMAGES.getPath(cfg.img))}));
                    el1.appendChild(cfg.els.brd1 = app.Utils.createDIV({class: 'pers_info_l_brd'}));
                    el1.appendChild(cfg.els.brd2 = app.Utils.createDIV({class: 'pers_info_l_brd pers_info_l_brd_selected', style: 'opacity: 0'}));
                    if (cfg.price) el1.appendChild(app.Utils.createDIV({class: 'emblem_price', html: '<span class="res_icon res_icon_inline res_gem"></span>{0}'.format(cfg.price)}));
                    el.appendChild(el1);
                    if (cfg.img === p.tmp.avatar.img) p.tmp.selected = cfg;
                });
                p.scroll.el.appendChild(el);
            }
        }
    }

    function createEventAvatarsBlock(p) {
        let result = [];

        if (app.Model.user.avatar.o) {
            app.Model.user.avatar.o.forEach(img => {
                result.push({img: img, price: 0});
            });
            result.sort((e1, e2) => {
                const isE1Ny25 = e1.img.includes('ny25');
                const isE2Ny25 = e2.img.includes('ny25');

                // ny25 аватарки идут первыми
                if (isE1Ny25 && !isE2Ny25) return -1;
                if (!isE1Ny25 && isE2Ny25) return 1;

                // Если обе ny25, сортируем: мужские -> женские, простые -> rare
                if (isE1Ny25 && isE2Ny25) {
                    const isE1Male = e1.img.includes('1m');
                    const isE2Male = e2.img.includes('1m');
                    const isE1Female = e1.img.includes('1f');
                    const isE2Female = e2.img.includes('1f');

                    // Мужские перед женскими
                    if (isE1Male && isE2Female) return -1;
                    if (isE1Female && isE2Male) return 1;

                    // Если оба одного пола, простые перед rare
                    const isE1Rare = e1.img.includes('rare');
                    const isE2Rare = e2.img.includes('rare');

                    if (!isE1Rare && isE2Rare) return -1;
                    if (isE1Rare && !isE2Rare) return 1;
                }

                return 0;
            });
        }

        if (app.Model.user.halloween) {
            const avatars = [];
            avatars.push({img: '/images/puzzle/ava3.jpg', price: 99});
            avatars.push({img: '/images/puzzle/ava4.jpg', price: 99});
            avatars.push({img: '/images/puzzle/ava2.jpg', price: 499});
            if (app.Model.user.gender === 2) {
                avatars.push({img: '/images/avatars/event/halloween_f.jpg', price: 499});
                avatars.push({img: '/images/avatars/event/halloween_f_21.jpg', price: 499});
                avatars.push({img: '/images/avatars/event/halloween_f_22.jpg', price: 499});
                avatars.push({img: '/images/avatars/event/halloween_f_23.jpg', price: 499});
                avatars.push({img: '/images/avatars/event/halloween_f_24.jpg', price: 499});
                avatars.push({img: '/images/avatars/event/halloween_f_25.jpg', price: 499});
            } else {
                avatars.push({img: '/images/avatars/event/halloween_m.jpg', price: 499});
                avatars.push({img: '/images/avatars/event/halloween_m_21.jpg', price: 499});
                avatars.push({img: '/images/avatars/event/halloween_m_22.jpg', price: 499});
                avatars.push({img: '/images/avatars/event/halloween_m_23.jpg', price: 499});
                avatars.push({img: '/images/avatars/event/halloween_m_24.jpg', price: 499});
                avatars.push({img: '/images/avatars/event/halloween_m_25.jpg', price: 499});
            }

            if (app.Model.user.avatar.o) {
                for (let i = 0; i < avatars.length; i++) {
                    if (app.Model.user.avatar.o.indexOf(avatars[i].img) !== -1) {
                        avatars.splice(i--, 1);
                    }
                }
            }

            avatars.forEach(_cfg => {
                let found;
                for (let i = 0; i < result.length; i++) {
                    if (_cfg.img === result[i].img) {
                        found = 1;
                        break;
                    }
                }
                if (!found) {
                    result.push(_cfg);
                }
            });
        }

        if (app.Model.user.ny) {
            const avatars = [];
            avatars.push({img: '/images/avatars/ny/santa.jpg', price: 99});
            avatars.push({img: '/images/avatars/ny/snowmaiden.jpg', price: 99});
            if (app.Model.user.gender === 2) {
                avatars.push({img: '/images/avatars/ny/snowman_f.jpg', price: 499});
            } else {
                avatars.push({img: '/images/avatars/ny/snowman_m.jpg', price: 499});
            }

            if (app.Model.user.avatar.o) {
                for (let i = 0; i < avatars.length; i++) {
                    if (app.Model.user.avatar.o.indexOf(avatars[i].img) !== -1) {
                        avatars.splice(i--, 1);
                    }
                }
            }

            avatars.forEach(function(_cfg) {
                let found;
                for (let i = 0; i < result.length; i++) {
                    if (_cfg.img === result[i].img) {
                        found = 1;
                        break;
                    }
                }
                if (!found) {
                    result.push(_cfg);
                }
            });
        }

        if (app.Model.user.may_event) {
            const avatars = [];

            if (app.Model.user.may_event.st <= app.TimeUtil.now()) {
                if (app.Model.user.may_event.t === 'hb') {
                    if (app.Model.user.gender === 2) {
                        //avatars.push({img: '/images/avatars/event/hb_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/hb_f_24.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/hb_f_25.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/hb_26_f.jpg', price: 499});
                    } else {
                        //avatars.push({img: '/images/avatars/event/hb_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/hb_m_24.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/hb_m_25.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/hb_26_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'hb3') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/hb_f_21.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/hb_m_21.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'hb4') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/hb_f_22.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/hb_m_22.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'hb5') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/hb_f_23.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/hb_m_23.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'sun') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/sun_24_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/sun_25_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/sun_26_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/sun_24_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/sun_25_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/sun_26_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'sun_21') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/sun_21_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/sun_21_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'new_year') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/ny/snowman_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/ny/ny20_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/ny26_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/ny26_2_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/ny/snowman_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/ny/ny20_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/ny26_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/ny26_2_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'new_year_21') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/ny21_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/ny21_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'new_year_22') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/ny22_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/ny22_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'new_year_23') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/ny23_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/ny24_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/ny25_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/ny23_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/ny24_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/ny25_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'spring') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/spring_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/spring_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'wind') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/wind_23_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/wind_24_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/wind_25_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/wind_26_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/wind_23_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/wind_24_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/wind_25_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/wind_26_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'april') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/april_1_23_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/april_1_25_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/april_26_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/april_1_23_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/april_1_25_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/april_26_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'cosmos') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/cosmos_24_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/cosmos_25_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/cosmos_26_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/cosmos_24_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/cosmos_25_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/cosmos_26_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === 'magic') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/magic_25_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/magic_26_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/magic_25_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/magic_26_m.jpg', price: 499});
                    }

                } else if (app.Model.user.may_event.t === '8m') {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/flower_23_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/flower_24_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/flower_25_f.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/flower_26_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/flower_23_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/flower_24_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/flower_25_m.jpg', price: 499});
                        avatars.push({img: '/images/avatars/event/flower_26_m.jpg', price: 499});
                    }

                } else {
                    if (app.Model.user.gender === 2) {
                        avatars.push({img: '/images/avatars/event/flower_f.jpg', price: 499});
                    } else {
                        avatars.push({img: '/images/avatars/event/flower_m.jpg', price: 499});
                    }
                }
            }

            if (app.Model.user.avatar.o) {
                for (let i = 0; i < avatars.length; i++) {
                    if (app.Model.user.avatar.o.indexOf(avatars[i].img) !== -1) {
                        avatars.splice(i--, 1);
                    }
                }
            }

            avatars.forEach((_cfg) => {
                let found;
                for (let i = 0; i < result.length; i++) {
                    if (_cfg.img === result[i].img) {
                        found = 1;
                        break;
                    }
                }
                if (!found) {
                    result.push(_cfg);
                }
            });
        }

        if (app.Model.user.battlePath && app.Model.user.battlePath.t === '14f') {
            const avatars = [];
            if (app.Model.user.gender === 2) {
                avatars.push({img: '/images/avatars/event/love23_f.jpg', price: 99});
                avatars.push({img: '/images/avatars/event/love23_f_w.jpg', price: 499});
            } else {
                avatars.push({img: '/images/avatars/event/love23_m.jpg', price: 99});
                avatars.push({img: '/images/avatars/event/love23_m_w.jpg', price: 499});
            }
            avatars.forEach((_cfg) => {
                const found = result.find(avatar => avatar.img === _cfg.img);
                if (!found) {
                    result.push(_cfg);
                }
            });
        }

        if (result.length > 0) {
            p.scroll.el.appendChild(app.Utils.createDIV({class: 'big str mb10 major cntr', style: 'width: 420px', text: 'Специальные события:'}));
            for (let i = 0; i < result.length; i += 4) {
                let el = app.Utils.createDIV({style: 'position: relative; height: 90px'});
                result.slice(i, i + 4).forEach(function(_cfg, i) {
                    let col = i % 4;
                    let top = 0;
                    let left = 40 + col * 90;
                    let cfg = {
                        img: _cfg.img,
                        els: {},
                        price: _cfg.price
                    };
                    let el1 = app.Utils.createA({class: 'pers_info_l', style: 'top: {0}px; left: {1}px'.format(top, left)}, onSelect.bind(null, p, cfg));
                    el1.appendChild(app.Utils.createIMG(cfg.img, {w: 60, h: 60}));
                    el1.appendChild(cfg.els.brd1 = app.Utils.createDIV({class: 'pers_info_l_brd'}));
                    el1.appendChild(cfg.els.brd2 = app.Utils.createDIV({class: 'pers_info_l_brd pers_info_l_brd_selected', style: 'opacity: 0'}));
                    el.appendChild(el1);
                    if (cfg.price) el1.appendChild(app.Utils.createDIV({class: 'emblem_price', html: '<span class="res_icon res_icon_inline res_gem"></span>{0}'.format(cfg.price)}));
                    el.appendChild(el1);
                    if (cfg.img === p.tmp.avatar.img) p.tmp.selected = cfg;
                });
                p.scroll.el.appendChild(el);
            }
        }
    }

    function create() {
        var p = app.Popups.createPopup1({
            display: {energy: 1, gold: 1, gems: 1},
            header: {value: 'Выбор аватара'}
        });

        p.tmp = {};

        p.tmp.selected = undefined;

        p.tmp.avatar = app.Utils.createAvatarComponent(app.Model.user.rank, app.Model.user.avatar.img);
        app.Utils.addClass(p.tmp.avatar.els.main, 'mlra_ab');
        p.tmp.avatar.els.main.style.top = '15px';
        p.els.brd_r.appendChild(p.tmp.avatar.els.main);

        p.els.brd_r.appendChild(app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 95px'}));
        p.els.brd_r.appendChild(app.Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; bottom: 85px'}));

        p.tmp.price = {els: {}};
        p.els.brd_r.appendChild(p.tmp.price.els.price = app.Utils.createDIV({class: 'big str mtb10 major cntr', style: 'position: absolute; width: 480px; bottom: 50px', html: 'Цена: <span class="res_icon res_icon_inline res_gem"></span>0'}));
        p.els.brd_r.appendChild(app.Utils.createA({class: 'btn_g mlra_ab', style: 'bottom: 20px', text: 'Обновить'}, function() {
            app.Network.command({cmd: 'UserUpdateAvatar', avatar: p.tmp.selected.img}, function(data) {
                if (data.error) {
                    app.Utils.processErrors(data.error);
                } else {
                    app.Popups.removePopup(p);
                }
            });
        }));
        p.tmp.updatePrice = function() {
            p.tmp.price.els.price.innerHTML = 'Цена: <span class="res_icon res_icon_inline res_gem"></span>{0}'.format(p.tmp.selected.price);
        };

        createEventAvatarsBlock(p);
        createCharacterAvatarsBlock(p);
        createCardAvatarsBlock(p);

        if (p.tmp.selected) {
            p.tmp.selected.els.brd2.style.opacity = 1;
        }

        p.els.brd.style.opacity = 0;

        app.Popups.add(p);

        TweenMax.delayedCall(0.001, function() {
            let availableHeight0 = app.LAYOUT.getClientWHS0(80);
            let contentRequiredHeight = 638;
            let availableHeight = Math.min(contentRequiredHeight, availableHeight0);

            let top = (availableHeight0 - availableHeight) / 2;
            top = Math.max(80, top);

            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';

            p.els.wrap.style.width = '420px';
            p.els.wrap.style.top = '105px';
            p.els.wrap.style.left = '30px';

            let h0 = availableHeight - 105 - 90;
            p.els.wrap.style.height = h0 + 'px';
            p.els.wrap_s.style.width = '420px';

            let h1 = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
            p.scroll.availableHeight = h0;

            p.scroll.top = 0;
            p.scroll.topMax = p.scroll.availableHeight < h1 ? h1 - p.scroll.availableHeight : 0;
        });
    }

    function onSelect(p, cfg) {
        if (p.tmp.selected === cfg) return;
        if (p.tmp.selected) TweenMax.to(p.tmp.selected.els.brd2, 0.3, {opacity: 0});
        p.tmp.selected = cfg;
        TweenMax.to(p.tmp.selected.els.brd2, 0.3, {opacity: 1});
        p.tmp.avatar.update(app.Model.user.rank, p.tmp.selected.img);
        p.tmp.updatePrice();
    }

    function getPrice(cfgCard) {
        let cards = app.Model.user.avatar.c;
        if (cards) {
            for (let i = 0; i < cards.length; i++) {
                if (cards[i] === cfgCard.id) return 0;
            }
        }

        if (cfgCard.default) return 999;
        if (cfgCard.quality === 0) return 100;
        if (cfgCard.quality === 1) return 300;
        return 500;
    }

    return {
        create: create
    };
})();