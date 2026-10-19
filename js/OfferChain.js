if (!app.OfferChain) {
    app.OfferChain = {
        create() {
            if (!app.Model.user.offer.a2 || app.Model.user.offer.a2.t !== 'offer_chain') {
                return;
            }

            const p = app.Popups.createPopup1({
                id: 'offer_chain',
                header: {value: app.Model.user.offer.a2.n},
                onScroll(deltaY) {
                    if (p.tmp.tl) {
                        p.tmp.tl.kill();
                        delete p.tmp.tl;
                    }
                }
            });

            p.tmp = {};

            p.els.brd_r.appendChild(app.Utils.createDIV({class: 'str cntr', style: 'margin-top: 15px', text: 'Забирая одну награду, вы получаете доступ к следующей!'}));

            const update = () => {
                const offer = app.Model.user.offer.a2;

                const current = offer.steps.find(step => step.rt === undefined);

                const createStep = (num, step) => {
                    const cfg = {
                        els: []
                    };

                    const completed = step.rt;
                    const locked = current !== step;

                    cfg.els.main = app.Utils.createDIV({class: 'chain_promo' + (step.offer ? ' chain_promo_p' : '')}, null, [
                        app.Utils.createDIV({class: 'sh_card_lvl', style: 'left: -3px; top: -3px; float: left; transform: scale(0.75)', text: num})
                    ]);

                    if (step.x) {
                        cfg.els.main.appendChild(app.Utils.createDIV({class: 'gems_choice', style: 'right: 15px; top: -1px; left: auto'}, null, [
                            app.Utils.createDIV({style: 'transform: rotate(-20deg); margin-top: 17px; margin-left: -3px'}, null, [
                                app.Utils.createText('Ценность '),
                                app.Utils.createSPAN({class: 'big str', style: 'color: #fff90b', text: 'x' + step.x})
                            ])
                        ]));
                    }

                    // create reward
                    const el_reward = app.Utils.createDIV({class: 'chain_promo_rewards mlra_ab'});

                    if (step.drop.gold) {
                        const el = app.Utils.createDIV({class: 'chain_promo_reward'}, null, [
                            app.Utils.createDIV({class: 'item_slot item_slot_empty', style: 'position: relative'}, null, [
                                app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 10px; top: 23px; transform: rotate(-18deg)'}),
                                app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 18px; top: 30px; transform: rotate(40deg) scale(0.7)'}),
                                app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 36px; top: 31px; transform: rotate(-40deg) scale(0.7)'}),
                                app.Utils.createSPAN({class: 'res_icon res_gold', style: 'left: 18px; top: 37px; transform: scale(1) rotate(-52deg)'}),
                                app.Utils.createSPAN({class: 'txt txt_need', text: app.Utils.toMoney(step.drop.gold)}),
                                app.Utils.createSPAN({class: 'brd'})
                            ])
                        ]);
                        el_reward.appendChild(el);
                        app.Utils.addItemInfoOnClick1(el, {gold: step.drop.gold});
                    }
                    if (step.drop.gems) {
                        const el = app.Utils.createDIV({class: 'chain_promo_reward'}, null, [
                            app.Utils.createDIV({class: 'item_slot item_slot_empty item_slot_q4', style: 'position: relative'}, null, [
                                app.Utils.createSPAN({class: 'gems_p', style: 'left: -45px; top: -50px; transform: scale(0.8); transform-origin: center center'}),
                                app.Utils.createSPAN({class: 'txt txt_need', text: app.Utils.toMoney(step.drop.gems)}),
                                app.Utils.createSPAN({class: 'brd'})
                            ])
                        ]);
                        el_reward.appendChild(el);
                        app.Utils.addItemInfoOnClick1(el, {gems: step.drop.gems});
                    }
                    if (step.drop.tickets) {
                        const el = app.Utils.createDIV({class: 'chain_promo_reward'}, null, [
                            app.Utils.createDIV({class: 'item_slot item_slot_empty', style: 'position: relative'}, null, [
                                app.Utils.createSPAN({class: 'res_icon res_raid', style: 'left: 12px; top: 10px'}),
                                app.Utils.createSPAN({class: 'txt txt_need', text: app.Utils.toMoney(step.drop.tickets)}),
                                app.Utils.createSPAN({class: 'brd'})
                            ])
                        ]);
                        el_reward.appendChild(el);
                        app.Utils.addItemInfoOnClick1(el, {tickets: step.drop.tickets});
                    }
                    if (step.drop.dust) {
                        const el = app.Utils.createDIV({class: 'chain_promo_reward'}, null, [
                            app.Utils.createDIV({class: 'item_slot item_slot_empty', style: 'position: relative'}, null, [
                                app.Utils.createSPAN({class: 'res_icon res_dust', style: 'left: 12px; top: 10px'}),
                                app.Utils.createSPAN({class: 'txt txt_need', text: app.Utils.toMoney(step.drop.dust)}),
                                app.Utils.createSPAN({class: 'brd'})
                            ])
                        ]);
                        el_reward.appendChild(el);
                        app.Utils.addItemInfoOnClick1(el, {dust: step.drop.dust});
                    }
                    if (step.drop.sd) {
                        const el = app.Utils.createDIV({class: 'chain_promo_reward'}, null, [
                            app.Utils.createDIV({class: 'item_slot item_slot_empty', style: 'position: relative'}, null, [
                                app.Utils.createSPAN({class: 'res_icon res_dust_stone', style: 'left: 12px; top: 10px'}),
                                app.Utils.createSPAN({class: 'txt txt_need', text: app.Utils.toMoney(step.drop.sd)}),
                                app.Utils.createSPAN({class: 'brd'})
                            ])
                        ]);
                        el_reward.appendChild(el);
                        app.Utils.addItemInfoOnClick1(el, {sd: step.drop.sd});
                    }
                    if (step.drop.gs) {
                        const el = app.Utils.createDIV({class: 'chain_promo_reward'}, null, [
                            app.Utils.createDIV({class: 'item_slot item_slot_empty', style: 'position: relative'}, null, [
                                app.Utils.createSPAN({class: 'res_icon res_boss', style: 'left: 12px; top: 10px'}),
                                app.Utils.createSPAN({class: 'txt txt_need', text: app.Utils.toMoney(step.drop.gs)}),
                                app.Utils.createSPAN({class: 'brd'})
                            ])
                        ]);
                        el_reward.appendChild(el);
                        app.Utils.addItemInfoOnClick1(el, {gs: step.drop.gs});
                    }
                    if (step.drop.nexit) {
                        const el = app.Utils.createDIV({class: 'chain_promo_reward'}, null, [
                            app.Utils.createDIV({class: 'item_slot item_slot_empty', style: 'position: relative'}, null, [
                                app.Utils.createSPAN({class: 'res_icon res_nexit', style: 'left: 12px; top: 10px'}),
                                app.Utils.createSPAN({class: 'txt txt_need', text: app.Utils.toMoney(step.drop.nexit)}),
                                app.Utils.createSPAN({class: 'brd'})
                            ])
                        ]);
                        el_reward.appendChild(el);
                        app.Utils.addItemInfoOnClick1(el, {nexit: step.drop.nexit});
                    }
                    if (step.drop.items) {
                        step.drop.items.forEach(entry => {
                            const cfgItem = app.CFGUtil.getItemByID(entry.item);
                            const el = app.Utils.createDIV({class: 'chain_promo_reward'}, null, [
                                app.Utils.createDIV({class: 'item_slot item_slot_full ' + app.Utils.getItemQualityClass(cfgItem.quality), style: 'position: relative'}, null, [
                                    app.Utils.createIMG(cfgItem.img),
                                    app.Utils.createSPAN({class: 'txt txt_need', text: entry.count}),
                                    app.Utils.createSPAN({class: 'brd'})
                                ])
                            ]);
                            el_reward.appendChild(el);
                            app.Utils.addItemInfoOnClick1(el, {item: entry.id});
                        });
                    }
                    if (step.drop.premium) {
                        const el = app.Utils.createDIV({class: 'chain_promo_reward'}, null, [
                            app.Utils.createDIV({class: 'item_slot item_slot_full item_slot_q1', style: 'position: relative'}, null, [
                                app.Utils.createSPAN({class: 'item_slot_vip'}),
                                app.Utils.createSPAN({class: 'item_slot_counter', text: app.TimeUtil.formatToHumanTime(step.drop.premium * app.TimeUtil.D_MS, 1)}),
                                app.Utils.createSPAN({class: 'brd'})
                            ])
                        ]);
                        el_reward.appendChild(el);
                        app.Utils.addItemInfoOnClick1(el, {premium: step.drop.premium});
                    }
                    if (step.drop.chest) {
                        el_reward.appendChild(app.Utils.createDIV({class: 'platform mlra_ab', style: 'top: 35px'}));
                        el_reward.appendChild(app.Utils.createDIV({class: 'chest{0} mlra_ab'.format(step.drop.chest.type + 1), style: 'top: -19px'}));
                        el_reward.onclick = () => {
                            app.OfferChain.showChestDrop(step);
                        };
                    }
                    if (step.drop.avatars) {
                        const gender = Math.max(1, app.Model.user.gender);
                        const avatar = step.drop.avatars[gender - 1];
                        const el = app.Utils.createDIV({class: 'chain_promo_reward'}, null, [
                            app.Utils.createA({class: 'pers_info_l', style: 'position: relative; display: inline-block; width: 70px; left: 0px;'}, null, [
                                app.Utils.createIMG(avatar, {w: 60, h: 60}),
                                app.Utils.createDIV({class: 'pers_info_l_brd'})
                            ])
                        ]);
                        el_reward.appendChild(el);
                        app.Utils.addItemInfoOnClick1(el, {avatar: 'Вау, какая аватарка!'});
                    }
                    cfg.els.main.appendChild(el_reward);

                    const el_a = app.Utils.createA({class: 'btn_g btn_a mlra_ab', style: 'top: 130px'});
                    if (completed) {
                        app.Utils.addClass(el_a, 'bw');
                        el_a.innerText = 'Награда получена';
                        el_a.onclick = () => {
                            app.Utils.showInfo('Награда уже получена!');
                        };
                    } else {
                        if (locked) {
                            app.Utils.removeClass(el_a, 'btn_a');
                            el_a.appendChild(app.Utils.createDIV({class: 'icon_lock'}));
                            el_a.onclick = () => {
                                app.Utils.showInfo('Шаг еще закрыт!');
                            };
                        }

                        let el_a_text;
                        el_a.appendChild(el_a_text = app.Utils.createSPAN({}))

                        if (step.offer) {
                            const offer = step.offer;
                            if (!app.UserUtil.isPaymentsAvailable()) {
                                el_a_text.innerText = 'недоступно';
                                el_a.onclick = () => {
                                    app.Utils.showInfo('Покупки на IOS недоступны', {type: 1})
                                };
                            } else {

                                if (current === step) {
                                    el_a_text.innerText = '...';
                                    if (app.UserUtil.isOVM()
                                        && !app.UserUtil.isOVM_STANDALONE()
                                        && !app.OVMSDK.isRuRegion()) {

                                        OVMSDK.getLocalizedPrice('ru.over.keepers.' + offer.t)
                                            .then(data => {
                                                el_a_text.innerText = data;
                                            })
                                            .catch(e => {
                                                console.error('Error', e);
                                            });

                                    } else if (app.UserUtil.isGoogle()) {
                                        let skuDetails = google.getSkuDetails(offer.sku);
                                        skuDetails = JSON.parse(skuDetails);
                                        if (skuDetails.error) {
                                            console.log('skuDetails for ' + offer.sku + ' not found');
                                            return;
                                        }
                                        el_a_text.innerText = skuDetails.price.v / 1000000 + ' ' + skuDetails.price.c;
                                    } else {
                                        let price = app.Utils.toMoney(offer.p);
                                        if (app.UserUtil.isVK()) {
                                            price += ' ' + app.Utils.getGramString(offer.p, 'голос', 'голоса', 'голосов');
                                        } else if (app.UserUtil.isOK() && !app.UserUtil._isInIDsForXsolla()) {
                                            price += ' OK';
                                        } else if (app.UserUtil.isFS()) {
                                            price += ' ФМ';
                                        } else if (app.UserUtil.isGamepad()) {
                                            price += ' GP';
                                        } else if (app.UserUtil.isMMR()) {
                                            price += ' ' + app.Utils.getGramString(offer.p, 'мэйлик', 'мэйлика', 'мэйликов');
                                        } else if (app.UserUtil.isRBK()) {
                                            price += ' RBK';
                                        } else if (app.UserUtil.isPlaydeck()) {
                                            price += ' STARS';
                                        } else {
                                            price += 'р';
                                        }

                                        el_a_text.innerText = price;

                                        if (app.UserUtil.isYandex()) {
                                            app.YandexUtil.getProduct(offer.t).then(product => {
                                                el_a_text.innerText = product.price;
                                            });
                                        }
                                    }
                                } else {
                                    el_a_text.innerText = '';
                                }
                            }
                            app.Purchase.addOfferOnClick(
                                el_a,
                                {
                                    actionBefore() {
                                        if (locked) {
                                            app.Utils.showInfo('Нужно собрать предыдушие!');
                                            return;
                                        }

                                        if (app.Utils.hasClass(el_a, 'bw')) return;

                                        app.Utils.addClass(el_a, 'bw');

                                        return 1;
                                    },
                                    offer
                                });
                        } else {
                            el_a_text.innerText = 'Бесплатно';
                            el_a.onclick = () => {
                                if (locked) {
                                    app.Utils.showInfo('Нужно собрать предыдушие!');
                                    return;
                                }

                                if (app.Utils.hasClass(el_a, 'bw')) {
                                    return;
                                }
                                app.Utils.addClass(el_a, 'bw');

                                app.Network.command({cmd: 'OfferChainFreeGet'}, data => {
                                    console.log(data);
                                    if (data.error) {
                                        app.Utils.showInfo('Попробуйте позже');
                                    } else {
                                        app.UserUtil.processChestDrop(data.drop);
                                        app.EventDispatcher.emit('show chest drop', {drop: data.drop});
                                        app.EventDispatcher.emit('user resources changed');
                                        update();
                                    }
                                });
                            };
                        }
                    }
                    cfg.els.main.appendChild(el_a);

                    return cfg;
                };

                app.Utils.removeAllChild(p.scroll.el);

                offer.steps.forEach((step, num) => {
                    p.scroll.el.appendChild(createStep(num + 1, step).els.main);
                });
            };

            update();

            const contentRequiredHeight = 650;
            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
            const availableHeight = Math.min(contentRequiredHeight, availableHeight0);
            const top = Math.max(80, (availableHeight0 - availableHeight) / 2);

            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';

            p.els.wrap.style.top = 40 + 'px';
            p.els.wrap.style.height = (availableHeight - 40) + 'px';

            p.scroll.availableHeight = availableHeight - 40;
            TweenMax.delayedCall(0.01, () => {
                const contentRequiredHeight = app.LAYOUT.convert0(p.scroll.el.getBoundingClientRect().height);
                p.scroll.topMax = p.scroll.availableHeight < contentRequiredHeight ? contentRequiredHeight - p.scroll.availableHeight : 0;

                // scroll to active step
                const activeStepIdx = app.Model.user.offer.a2.steps.findIndex(step => !step.rt);
                if (activeStepIdx > 0) {
                    const moveTo = Math.max(-p.scroll.topMax, -activeStepIdx * 170);
                    p.tmp.tl = TweenMax.to(p.scroll, 0.4, {
                        top: moveTo,
                        delay: 0.3,
                        ease: Power2.easeInOut,
                        onUpdate() {
                            p.scroll.el.style.top = p.scroll.top + 'px';
                        }
                    });
                }
            });

            app.Popups.add(p);
        },

        showChestDrop(stepJ) {
            const type = stepJ.drop.chest.type;
            const cfg = app.Model.cfg.cfgChests.list[type];

            let cfgCards;
            if (type === 2) {
                cfgCards = cfg.paid.cards;
            } else {
                cfgCards = cfg.cards;
            }

            if (cfgCards) {
                const cfg = {};

                const div = cfg.drops = app.Utils.createDIV({class: 'mlra_ab', style: 'position: absolute; text-align: center; top: 125px; font-size: 15px'});
                div.appendChild(app.Utils.createEL('strong', {text: 'Можно найти: Фрагменты карт'}));

                let div1 = app.Utils.createDIV({class: 'mlra_ab', style: 'width: 200px'});
                if (cfgCards.q0) {
                    let min = cfgCards.q0.count.min * cfgCards.q0.fragments.min;
                    let max = cfgCards.q0.count.max * cfgCards.q0.fragments.max;
                    div1.appendChild(app.Utils.createDIV({class: 'rewards_row', html: '<div class="fll pt3">Простые</div><span class="str flr vm"><span class="res_icon res_icon_inline res_card_q0"></span>{0}-{1}</span>'.format(min, max)}));
                }
                if (cfgCards.q1) {
                    let min = cfgCards.q1.count.min * cfgCards.q1.fragments.min;
                    let max = cfgCards.q1.count.max * cfgCards.q1.fragments.max;
                    div1.appendChild(app.Utils.createDIV({class: 'rewards_row', html: '<div class="fll pt3">Необычные</div><span class="str flr vm"><span class="res_icon res_icon_inline res_card_q1"></span>{0}-{1}</span>'.format(min, max)}));
                }
                if (cfgCards.q2) {
                    let min = cfgCards.q2.count.min * cfgCards.q2.fragments.min;
                    let max = cfgCards.q2.count.max * cfgCards.q2.fragments.max;
                    div1.appendChild(app.Utils.createDIV({class: 'rewards_row', html: '<div class="fll pt3">Редкие</div><span class="str flr vm"><span class="res_icon res_icon_inline res_card_q2"></span>{0}-{1}</span>'.format(min, max)}));
                }
                div.appendChild(div1);
                if (cfgCards.to5stars) {
                    cfg.to5stars = 1;
                    div.appendChild(app.Utils.createDIV({style: 'margin-top: 5px', html: 'Шанс получить карту <div style="position: relative; display: inline-block; margin-top: 3px;">5 <div class="star_1 star_inline"></div>'}));
                    const list = [...cfgCards.to5stars.cards];
                    list.shuffle();
                    list.forEach((cardId, i) => {
                        const cfgCard = app.CFGUtil.getCardByID(cardId);
                        const el = app.Utils.createDIV({class: 'sh_card', style: 'top: 160px; transform: matrix(0.73, 0, 0, 0.73, 0, 0); position: absolute; transform-origin: center top'});
                        switch (i) {
                            case 0:
                                el.style.left = '45px';
                                break;
                            case 1:
                                app.Utils.addClass(el, 'mlra_ab');
                                break;
                            case 2:
                                el.style.right = '45px';
                                break;
                        }
                        const qClass = app.Utils.getCardQualityClass(cfgCard.quality);
                        if (qClass) {
                            app.Utils.addClass(el, qClass);
                        }
                        el.appendChild(app.Utils.createIMG(cfgCard.img, {class: 'sh_skill'}));
                        el.appendChild(app.Utils.createDIV({class: 'sh_card_brd'}));
                        el.appendChild(app.Utils.createDIV({class: 'sh_card_elem', html: '<img src="' + app.CFGUtil.getCardElemIMGByID(cfgCard.id) + '" style="width: 30px; height: 30px;">'}));
                        el.appendChild(app.Utils.createDIV({class: 'sh_card_lamp_rdy'}));
                        el.appendChild(app.Utils.createDIV({class: 'sh_card_stars sh_card_stars5'}));
                        el.onclick = ()=>  {
                            app.CardsPage.showCardInfo(cfgCard.id);
                        };
                        div.appendChild(el);
                    });
                }

                const p = app.Popups.createPopup({
                });

                p.tmp = {chest: cfg};

                let wrap = p.els.wrap = app.Utils.createDIV({class: 'wrap', style: 'top: 10px; width: 430px'});
                let wrap_s = p.els.wrap_s = app.Utils.createDIV({class: 'wrap_scroll', style: 'width: 430px'});
                wrap.appendChild(wrap_s);

                p.scroll = {el: wrap_s, top: 0, topMax: 0};
                p.scroll.el.style.top = p.scroll.top + 'px';

                p.els.popup.appendChild(wrap);

                p.els.popup.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 91px; top: -25px', text: type === 0 ? 'Деревянный Сундук' : type === 1 ? 'Серебряный сундук' : 'Золотой сундук'}));

                p.scroll.el.appendChild(app.Utils.createDIV({class: 'platform', style: 'left: 143px; top: 65px'}));
                if (type === 0) {
                    p.scroll.el.appendChild(app.Utils.createDIV({class: 'chest1', style: 'left: 162px; top: 35px'}));
                } else if (type === 1) {
                    p.scroll.el.appendChild(app.Utils.createDIV({class: 'chest2', style: 'left: 155px; top: 20px'}));
                } else {
                    p.scroll.el.appendChild(app.Utils.createDIV({class: 'chest3', style: 'left: 150px; top: 10px'}));
                }

                p.scroll.el.appendChild(div);

                p.scroll.el.appendChild(cfg.a = app.Utils.createA({class: 'btn_g btn_gs', style: 'left: 157px', text: 'Хорошо!'}, () => {
                    app.Popups.removePopup(p);
                }));

                p.scroll.update = function() {
                    TweenMax.delayedCall(0.001, function() {
                        let drops_h = app.LAYOUT.convert0(p.tmp.chest.drops.getBoundingClientRect().height);
                        if (drops_h <= 0) {
                            p.scroll.update();
                            return;
                        }
                        if (p.tmp.chest.to5stars) {
                            drops_h += 150;
                        }
                        p.tmp.chest.a.style.top = (125 + drops_h + 20) + 'px';

                        let availableHeight0 = app.LAYOUT.getClientWHS0(0);
                        let contentRequiredHeight = 125 + drops_h + 20 + 40;
                        let availableHeight = Math.min(contentRequiredHeight + 10, availableHeight0 - 80 - 40); // 80 - минимальный отступ сверху; 40 - минимальный отступ снизу
                        let top = Math.max(80, (availableHeight0 - availableHeight) / 2);

                        p.els.popup.style.opacity = 1;
                        p.els.popup.style.top = top + 'px';
                        p.els.popup.style.height = availableHeight + 'px';

                        p.els.wrap.style.top = '10px';
                        p.els.wrap.style.height = availableHeight - 10 + 'px';

                        p.scroll.topMax = (availableHeight - 10) < contentRequiredHeight ? contentRequiredHeight - (availableHeight - 10) : 0;
                    });
                };
                p.scroll.update();

                app.Popups.add(p);
            }
        }
    };
}