if (!app.Beeline) {

    const cashbackPopupEnabled = false;

    let el_spinner;
    const showSpinner = () => {
        el_spinner = app.Utils.createDIV({class: 'mlra_ab', style: 'position: absolute;width: 80px; padding-top: 250px; z-index: 103'}, null, [
            app.Utils.createDIV({class: 'lds-ellipsis'}, null, [
                app.Utils.createDIV(),
                app.Utils.createDIV(),
                app.Utils.createDIV(),
                app.Utils.createDIV(),
            ])
        ]);
        const dark = app.Utils.el('dark_popup');
        if (dark) {
            dark.parentNode.appendChild(el_spinner);
        }
    };

    const hideSpinner = () => {
        if (el_spinner) {
            if (el_spinner.parentNode) {
                el_spinner.parentNode.removeChild(el_spinner);
            }
        }
        el_spinner = undefined;
    };

    app.Beeline = {

        init() {
            this.showAgreementsIfNeeded();
        },

        showAgreementsIfNeeded() {
            if (!app.UserUtil.isBeeline())
                return;

            if (app.Model.user.partner.cfg && app.Model.user.partner.cfg.docs === 1)
                return;

            const p = app.Popups.createPopup({
                onEscape() {
                    app.Utils.showInfo('Необходимо ознакомиться с документами');
                    return true;
                }
            });

            p.els.close.onclick = () => {
                app.Utils.showInfo('Необходимо ознакомиться с документами');
            };

            p.els.dark.onclick = () => {
                app.Utils.showInfo('Необходимо ознакомиться с документами');
            };

            p.els.popup.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 40px; top: -25px', text: 'Важная информация!'}));

            p.els.popup.appendChild(app.Utils.createDIV({class: 'list_s mlra_ab', style: 'position: relative; width: 300px; padding: 7px; margin-top: 20px; min-height: 75px; cursor: pointer'}, null, [
                app.Utils.createDIV({class: 'cntr', html: '<div>Поставьте галочки и нажмите на кнопку "OK", чтобы подтвердить, что вы ознакомились и принимаете\n' +
                        'условия Соглашения, Политики конфиденциальности, Пользовательского соглашения и Согласия на\n' +
                        'обработку персональных данных</div>'})
            ]));

            let el;
            p.els.popup.appendChild(el = app.Utils.createDIV({style: 'position: relative; margin-left: 10px; top: 10px'}));

            let el_in = app.Utils.createEL('input');
            el_in.id = 'in1';
            el_in.type = 'checkbox';
            el_in.onchange = () => onSelect('in1');
            el.appendChild(el_in);

            let el_l = app.Utils.createEL('label', {style: 'margin-left: 10px'});
            el_l.setAttribute('for', 'in1');
            el_l.append(app.Utils.createA({text: 'Соглашение'}, () => {
                app.loadJS('Agreement', () => {
                    app.Agreement.create1();
                });
            }));
            el.appendChild(el_l);

            el.appendChild(app.Utils.createBR());

            el_in = app.Utils.createEL('input');
            el_in.id = 'in2';
            el_in.type = 'checkbox';
            el_in.onchange = () => onSelect('in2');
            el.appendChild(el_in);

            el_l = app.Utils.createEL('label', {style: 'margin-left: 10px'});
            el_l.setAttribute('for', 'in2');
            el_l.append(app.Utils.createA({text: 'Политика конфиденциальности'}, () => {
                app.loadJS('Agreement',  ()=>  {
                    app.Agreement.create3();
                });
            }));
            el.appendChild(el_l);

            el.appendChild(app.Utils.createBR());

            el_in = app.Utils.createEL('input');
            el_in.id = 'in3';
            el_in.type = 'checkbox';
            el_in.onchange = () => onSelect('in3');
            el.appendChild(el_in);

            el_l = app.Utils.createEL('label', {style: 'margin-left: 10px'});
            el_l.setAttribute('for', 'in3');
            el_l.append(app.Utils.createA({href: 'https://beeline.keepers.mobi/docs/beeline_agr.pdf', target: '_blank', text: 'Пользовательское соглашение'}));
            el.appendChild(el_l);

            el.appendChild(app.Utils.createBR());

            el_in = app.Utils.createEL('input');
            el_in.id = 'in4';
            el_in.type = 'checkbox';
            el_in.onchange = () => onSelect('in4');
            el.appendChild(el_in);

            el_l = app.Utils.createEL('label', {style: 'margin-left: 10px'});
            el_l.setAttribute('for', 'in4');
            el_l.append(app.Utils.createA({href: 'https://beeline.keepers.mobi/docs/beeline_consent.pdf', target: '_blank', text: 'Согласие на обработку персональных данных'}));
            el.appendChild(el_l);

            let a;
            p.els.popup.appendChild(a = app.Utils.createA({class: 'btn_g btn_gs mlra_ab bw', style: 'bottom: 7px', text: 'OK'}, () => {
                if (app.Utils.hasClass(a, 'bw')) {
                    app.Utils.showInfo('Необходимо ознакомиться с документами');
                    return;
                }
                app.Network.command({cmd: 'BeelineDocsComplete'}, data => {
                    if (data.user.partner.cfg.docs === 1) {
                        app.Popups.removePopup(p);
                    }
                });
            }));


            let selected = {};
            const onSelect = (el_in_id) => {
                if (selected[el_in_id]) {
                    delete selected[el_in_id];
                } else {
                    selected[el_in_id] = 1;
                }

                const keys = Object.keys(selected);
                if (keys.length === 4) {
                    app.Utils.removeClass(a, 'bw');
                } else {
                    app.Utils.addClass(a, 'bw');
                }
            };

            p.els.popup.style.opacity = 0;
            p.els.popup.style.width = '340px';
            p.els.popup.style.height = '310px';
            p.els.popup.style.left = '0px';

            if (app.Utils.isMobile()) {
                p.els.popup.style.transform = 'scale(1.25)';
                p.els.popup.style.transformOrigin = 'center top';
            }

            app.Popups.add(p);

            app.Popups.centerPopup(p, function() {
                return app.LAYOUT.convert0(p.els.popup.getBoundingClientRect().height);
            }, function(top, availableHeight) {
                p.els.popup.style.opacity = 1;
                p.els.popup.style.top = top + 'px';
            });
        },

        showCashback() {
            if (!cashbackPopupEnabled) {
                return;
            }
            const p = app.Popups.createPopup({});

            p.els.popup.appendChild(app.Utils.createDIV({class: 'header', style: 'left: 40px; top: -25px', text: 'Кэшбэк 30%'}));

            p.els.popup.appendChild(app.Utils.createDIV({
                style: 'margin: 20px auto 50px auto; width: 295px; text-align: center',
                html: 'Совершая покупки, получайте  <span class="info">30%</span><br> обратно на ваш мобильный баланс. <br><br>' +
                    'Максимальный кэшбэк <br>за период акции – <span class="info">1000 руб. </span><br><br>' +
                    'Акция продлится до 15 мая 2024.<br> Бюджет акции ограничен.' +
                    'Подробности в  <a href="https://static.beeline.ru/upload/images/gaming/ПА_Кешбэк.pdf" target="_blank">правилах акции</a>'
            }));

            p.els.popup.appendChild(app.Utils.createA({class: 'btn_g', style: 'left: 85px; top: 195px', text: 'В магазин'}, () => {
                app.Popups.removeLast();
            }));

            p.els.popup.style.opacity = 0;
            p.els.popup.style.width = '330px';
            p.els.popup.style.height = '240px';
            p.els.popup.style.left = '90px';

            app.Popups.add(p);

            app.Popups.centerPopup(p, function() {
                return app.LAYOUT.convert0(p.els.popup.getBoundingClientRect().height);
            }, function(top, availableHeight) {
                p.els.popup.style.opacity = 1;
                p.els.popup.style.top = top + 'px';
            });

        },

        doPurchaseWeb(offerType) {
            if (el_spinner) {
                return;
            }
            showSpinner();
            app.Network.command({cmd: 'BeelinePayment', offer: offerType, returnUrl: location.origin + '/beeline_return.html'}, data => {
                hideSpinner();
                if (data.error) {
                    switch (data.error.code) {
                        case 1:
                            app.Utils.showInfo('Только для билайна');
                            break;
                        case 2:
                            app.Utils.showInfo('Продукт не найден');
                            break;
                        case 3:
                            app.Utils.showInfo('Акция не активна');
                            break;
                        case 8:
                            app.Utils.showInfo('Слишком много незавершённых оплат, попробуйте позже');
                            break;
                        default:
                            app.Utils.showInfo('Ошибка запроса');
                            break;
                    }
                } else if (data.paymentUrl) {
                    this.showWidget(data.paymentUrl);
                } else {
                    app.Utils.showInfo('Что-то пошло не так (');
                }
            });
        },

        // зачисление придёт с сервера обычной нотификацией PAYMENT, здесь только показываем страницу оплаты
        showWidget(url) {
            const origin = new URL(url).origin;
            const zIndex = app.Popups.getNextZIndex();

            const dark = app.Utils.createDIV({class: 'dark', style: 'top: 0px; opacity: 0.9; z-index: ' + zIndex});
            dark.style.height = app.LAYOUT.getClientWHS0(app.LAYOUT.scale < 1 ? 0 : 6, 1) + 'px';

            const frame = app.Utils.createEL('iframe');
            frame.src = url;
            frame.allow = 'payment';
            frame.style.cssText = 'position: absolute; left: 0; right: 0; margin: 0 auto; top: 20px; width: min(420px, 100%); height: 640px; border: 0; border-radius: 12px; background: #fff; z-index: ' + (zIndex + 1);

            const close = app.Utils.createDIV({class: 'close', style: 'position: absolute; right: 10px; top: 10px; z-index: ' + (zIndex + 2)});

            const main = app.Popups.getCFG().els.main;
            main.appendChild(dark);
            main.appendChild(frame);
            main.appendChild(close);

            const remove = () => {
                window.removeEventListener('message', onMessage);
                [dark, frame, close].forEach(el => el.parentNode && el.parentNode.removeChild(el));
            };

            const onMessage = e => {
                let d = e.data;
                if (typeof d === 'string') {
                    try { d = JSON.parse(d); } catch (_) { return; }
                }
                const action = d && d.action;
                if (typeof action !== 'string') {
                    return;
                }
                if (e.origin === origin && action.startsWith('closed-')) {
                    // closed-success и returnUrl могут прийти оба — remove повтор выдерживает
                    remove();
                    if (action === 'closed-success') {
                        app.Utils.showInfo('Проверяем оплату…', {type: 0});
                    } else if (action === 'closed-error' || action === 'closed-system') {
                        app.Utils.showInfo('Не удалось завершить покупку');
                    }
                } else if (e.origin === location.origin && action === 'keepers-return') {
                    remove();
                    app.Utils.showInfo('Проверяем оплату…', {type: 0});
                }
            };

            close.onclick = remove;
            window.addEventListener('message', onMessage);
        },

        doPurchase(offer, price) {
            // с сайта билайна платим через виджет, подтверждение спрашивает он сам
            if (app.Model.user.partner.cfg && app.Model.user.partner.cfg.src === 'web') {
                this.doPurchaseWeb(typeof offer === 'string' ? offer : offer.t);
                return;
            }

            let confirmPopup;
            const confirm = (offerName, price) => {
                const p = confirmPopup = app.Popups.createConfirm(
                    {
                        headerText: 'Оплата',
                        centerText: 'Списать {0} рублей со счета телефона для покупки <span class="str major">{1}</span> ?'.format(price, offerName),
                        yesText: {
                            text: 'Да',
                            className: 'btn_g btn_gs_c'
                        },
                        noText: 'Нет',
                        _flags: 1
                    },
                    () => {
                        app.Utils.addClass(p.els.a_no, 'bw');
                        showSpinner();
                        pay();
                    },
                    () => {});

                const onNoClick = p.els.a_no.onclick;
                p.els.a_no.onclick = () => {
                    if (el_spinner) {
                    } else {
                        onNoClick();
                    }
                }

                const onClose = p.els.close.onclick;
                p.els.close.onclick = () => {
                    if (el_spinner) {
                    } else {
                        onClose();
                    }
                };

                const onDark = p.els.dark.onclick;
                p.els.dark.onclick = () => {
                    if (el_spinner) {
                    } else {
                        onDark();
                    }
                };

                p.cfg.onEscape = () => {
                    if (el_spinner) {
                        return true;
                    }
                }

                p.cfg.onClose = () => {
                    confirmPopup = undefined;
                };
            };

            const pay = () => {
                const offerType = typeof offer === 'string' ? offer : offer.t;
                app.Network.command({cmd: 'BeelinePayment', offer: offerType}, data => {
                    hideSpinner();
                    if (confirmPopup) {
                        app.Popups.removePopup(confirmPopup);
                    }
                    if (data.error) {
                        switch (data.error.code) {
                            case 1:
                                app.Utils.showInfo('Только для билайна');
                                break;
                            case 2:
                                app.Utils.showInfo('Продукт не найден');
                                break;
                            case 3:
                                app.Utils.showInfo('Акция не активна');
                                break;
                            case 4:
                                app.Utils.showInfo('Ошибка запроса');
                                break;
                            case 5:
                            case 6:
                                app.Utils.showInfo('Неизвестная ошибка');
                                break;
                            case 7:
                                let info;
                                switch (data.error.info) {
                                    case 'RULE_CODE_BALANCE':
                                        info = 'К сожалению, у вас недостаточно средств на счете для покупки';
                                        break;
                                    case 'RULE_CODE_STATUS' :
                                        info = 'К сожалению, вам недоступна покупка, так как ваш номер заблокирован';
                                        break;
                                    case 'RULE_CODE_PAYMENT_TYPE':
                                        info = 'К сожалению, вам недоступна покупка, так как у вас подключена постоплатная система расчетов';
                                        break;
                                    case 'RULE_CODE_SOC':
                                        info = 'К сожалению, вам недоступна покупка, так как у вас активирован запрет на подключение платных услуг';
                                        break;
                                    case 'RULE_CODE_REGION':
                                        info = 'К сожалению, вам недоступна покупка, так как она не предоставляется в вашем регионе';
                                        break;
                                    case 'RULE_CODE_ACCOUNT':
                                        info = 'К сожалению, вам недоступна покупка, так как у вас подключен специальный авансовый счёт';
                                        break;
                                }
                                if (info) {
                                    app.Utils.showInfo(info);
                                } else {
                                    app.Utils.showInfo('Неизвестная ошибка');
                                }
                                break;
                            default:
                                app.Utils.showInfo('Неизвестная ошибка');
                                break;
                        }
                    } else if (data.ok === 1) {
                        app.Utils.showInfo('Успешно', {type: 0});
                    } else {
                        app.Utils.showInfo('Что-то пошло не так (');
                    }
                });
            };

            price = app.Utils.toMoney1(price);

            if (typeof offer === 'string') { // gems_50
                confirm('{0} кристаллов'.format(offer.substring(5)), price);
            } else {
                app.loadJS1('SalePage', () => {
                    confirm(app.SalePage.getOfferName(offer), price);
                });
            }
        }
    };
}