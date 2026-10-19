if (!app.YandexPromoCode) {
    app.YandexPromoCode = {
        init() {

        },

        create() {
            if (app.YandexPromoCode._cfg) return;

            const cfg = {
                els: {}
            };

            const v = app.TimeUtil.now();
            cfg.v = v;

            const mainCFG = app.MainPage.getCFG();
            if (mainCFG.icons.header1.yandex_promo_code) {

            } else {
                mainCFG.icons.header1.yandex_promo_code = {
                    els: {},
                    update() {
                        if (v === app.YandexPromoCode._cfg.v && app.Model.user.ypc
                            && (app.Model.user.ypc.f === 0 || app.YandexPromoCode._cfg.popup)) {
                            TweenMax.delayedCall(1, mainCFG.icons.header1.yandex_promo_code.update);
                            return;
                        }
                        mainCFG.icons.header1.yandex_promo_code.remove();
                    },
                    remove() {
                        if (mainCFG.icons.header1.yandex_promo_code) {
                            mainCFG.icons.header1.els.main.removeChild(mainCFG.icons.header1.yandex_promo_code.els.icon);
                            delete mainCFG.icons.header1.yandex_promo_code;
                        }
                        delete app.YandexPromoCode._cfg;
                    }
                };
                mainCFG.icons.header1.yandex_promo_code.els.icon = app.Utils.createA({class: 'top_icon icon_yandex'}, () => {
                    app.SoundManager.playClick();
                    app.YandexPromoCode.show();
                });
                mainCFG.icons.header1.els.main.appendChild(mainCFG.icons.header1.yandex_promo_code.els.icon);
                TweenMax.delayedCall(1, mainCFG.icons.header1.yandex_promo_code.update);
            }

            app.YandexPromoCode._cfg = cfg;
        },

        _createDark(onClick) {
            const cfg = {
                els: {}
            };

            cfg.els.main = app.Utils.createDIV({class: 'dark'});
            cfg.els.main.style.opacity = 1;
            if (app.LAYOUT.VK || app.LAYOUT.OK_750 || app.LAYOUT.EXERU || app.LAYOUT.FS || app.LAYOUT.MMR) {
                cfg.els.main.style.height = app.LAYOUT.getClientWHS0(app.LAYOUT.scale < 1 ? 0 : 6, 1) + 5 + 'px';
            } else {
                cfg.els.main.style.height = app.LAYOUT.getClientWHS0(app.LAYOUT.scale < 1 ? 0 : 6, 1) - app.Utils.withOffsets(0, 1) + 'px';
            }

            if (onClick) {
                cfg.els.main.onclick = onClick;
            }

            return cfg;
        },

        _createPopup() {
            const isSocial = !app.Model.user.partner || app.Model.user.partner.t !== 'YANDEX';

            const cfg = {
                els: {}
            };

            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getFooterHeight() + 40);
            const availableHeight = Math.min(500, availableHeight0);
            const top = Math.max(80, (availableHeight0 - availableHeight) / 2);

            cfg.els.main = app.Utils.createDIV({class: 'mlra_ab yandex_promocode_popup'});
            cfg.els.main.style.top = top + 'px';

            let el_input_cancel;
            let el_input_cancel_label;
            cfg.els.header = app.Utils.createDIV({class: 'yandex_promocode_header'}, null, [
                app.Utils.createDIV({class: 'yandex_promocode_header_text', html: 'Получите Плюс Мульти<br> на 60 дней за 0 р.'}),
                app.Utils.createDIV({class: 'yandex_promocode_list'}, null, [
                    app.Utils.createDIV({class: 'yandex_promocode_list_item'}, null, [
                        app.Utils.createDIV({class: 'yandex_promocode_list_item_count', text: '1'}),
                        app.Utils.createDIV({class: 'yandex_promocode_list_item_text', text: 'Скопируйте уникальный промокод'})
                    ]),
                    app.Utils.createDIV({class: 'yandex_promocode_list_item'}, null, [
                        app.Utils.createDIV({class: 'yandex_promocode_list_item_count', text: '2'}),
                        app.Utils.createDIV({class: 'yandex_promocode_list_item_text', text: `Перейдите на страницу ${isSocial ? 'Яндекс.Плюс': 'plus.yandex.ru/gift'}`})
                    ]),
                    app.Utils.createDIV({class: 'yandex_promocode_list_item'}, null, [
                        app.Utils.createDIV({class: 'yandex_promocode_list_item_count', text: '3'}),
                        app.Utils.createDIV({class: 'yandex_promocode_list_item_text yandex_promocode_list_item_text_2r', html: 'Введите промокод в поле, нажмите кнопку <br>«Активировать» до 31.12.2022'})
                    ]),
                    app.Utils.createDIV({class: 'yandex_promocode_list_item yandex_promocode_list_item_last'}, null, [
                        app.Utils.createDIV({class: 'yandex_promocode_list_item_count', text: '4'}),
                        app.Utils.createDIV({class: 'yandex_promocode_list_item_text yandex_promocode_list_item_text_2r', html: 'Пройдите авторизацию в аккаунте Яндекса.<br> Если аккаунта нет, необходимо зарегистрироваться.'})
                    ])
                ]),
                app.Utils.createDIV({class: 'yandex_promocode_cancel mlra_ab'}, null, [
                    el_input_cancel = app.Utils.createEL('input', {id: 'yandex_cancel', class: 'yandex_promocode_cancel_check'}),
                    el_input_cancel_label = app.Utils.createEL('label', {text: 'Я уже применил промо код, больше не показывать'}),
                ]),
                app.Utils.createDIV({class: 'yandex_promocode_btn mlra_ab', text: app.Model.user.ypc.c}, () => {
                    if (isSocial) {
                        app.Utils.copyToClipboard("https://plus.yandex.ru/gift?code=" + app.Model.user.ypc.c);
                        app.Utils.showInfo('ссылка скопирована', {type: 0});
                    } else {
                        app.Utils.copyToClipboard(app.Model.user.ypc.c);
                        app.Utils.showInfo('Промокод скопирован', {type: 0});
                        window.open('https://plus.yandex.ru/gift?code=' + app.Model.user.ypc.c, '_blank');
                    }
                }),
                app.Utils.createDIV({class: 'yandex_promocode_text_copy mlra_ab', text: `Нажмите чтобы ${isSocial ? 'скопировать' : 'применить'}`}),
                app.Utils.createDIV({class: 'yandex_promocode_terms', text: 'Условия подписки Плюс Мульти: https://yandex.ru/legal/yandex_plus_conditions/. 60 дней подписки  Плюс Мульти  бесплатно,  далее автопродление - 299 руб./мес. Требуется указание данных банковской карты. Активировать  промокод  можно  на  сайте  plus.yandex.ru/gift   по 31.12.2022 г Предложение  только  для пользователей,  не  имеющих  активную Подписку  Яндекс  Плюс  (или  иную,  ее  включающую).    Один пользователь   может   активировать   промокод   только  один   раз.   В случае  наличия   в   действиях  пользователя  на сервисах ООО "ЯНДЕКС" и его аффилированных лиц признаков злоупотребления правами и возможностями активация промокода может быть недоступна.'}),
            ]);
            cfg.els.main.appendChild(cfg.els.header);

            el_input_cancel.type = 'checkbox';
            el_input_cancel_label.setAttribute('for', 'yandex_cancel');
            el_input_cancel.onclick = () => {
                app.Network.command({cmd: 'YPC_Close'});
            };

            return cfg;
        },

        show() {
            const parent = app.Utils.el('dark_popup');

            const _hide = () => {
                delete app.YandexPromoCode._cfg.popup;
                delete app.YandexPromoCode._cfg.onEscape;

                parent.removeChild(dark.els.main);
                parent.removeChild(popup.els.main);

                app.EventDispatcher.emit('MainPage show hide', {all: 1});
                app.EventDispatcher.emit('menu click', {type: app.Menu.TYPE.MAIN});
                app.EventDispatcher.emit('menu zIndex', 101);
            };
            app.YandexPromoCode._cfg.onEscape = _hide;

            const _show = () => {
                app.YandexPromoCode._cfg.popup = popup;

                parent.appendChild(dark.els.main);
                parent.appendChild(popup.els.main);

                app.EventDispatcher.emit('MainPage show hide', {});
                app.EventDispatcher.emit('menu zIndex', app.LAYOUT.scale < 1 ? -1 : 101);
            };

            const dark = app.YandexPromoCode._createDark(() => {
                _hide();
            });
            //dark.els.main.style.zIndex = app.Popups.getNextZIndex();

            const popup = app.YandexPromoCode._createPopup();
            //popup.els.main.style.zIndex = app.Popups.getNextZIndex();

            _show();
        },

        onEscape() {
            if (app.YandexPromoCode._cfg && app.YandexPromoCode._cfg.onEscape) {
                app.YandexPromoCode._cfg.onEscape();
                delete app.YandexPromoCode._cfg.onEscape;
            }
        }
    }
}