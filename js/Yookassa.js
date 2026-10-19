// https://yookassa.ru/developers/payment-acceptance/integration-scenarios/widget/basics

if (!app.Yookassa) {

    let loaded = false;

    app.Yookassa = {
        init(onLoad) {
            console.log('app.Yookassa loading')
            if (loaded) {
                return;
            }

            const el = document.createElement('script');
            el.type = 'text/javascript';
            el.onload = function() {
                loaded = true;
            };
            el.src = "https://yookassa.ru/checkout-widget/v1/checkout-widget.js";
            document.getElementsByTagName('head')[0].appendChild(el);
        },

        isLoaded() {
            return loaded && window.YooMoneyCheckoutWidget;
        },

        showPayment(payment) {
            app.Popups.removeLast();

            const dark = app.Utils.createDIV({class: 'dark'});
            dark.style.zIndex = app.Popups.getNextZIndex();
            dark.style.opacity = 1;
            if (app.LAYOUT.VK || app.LAYOUT.OK_750 || app.LAYOUT.EXERU || app.LAYOUT.FS || app.LAYOUT.MMR) {
                dark.style.height = app.LAYOUT.getClientWHS0(app.LAYOUT.scale < 1 ? 0 : 6, 1) + 5 + 'px';
            } else {
                dark.style.height = app.LAYOUT.getClientWHS0(app.LAYOUT.scale < 1 ? 0 : 6, 1) - app.Utils.withOffsets(0, 1) + 'px';
            }
            dark.style.top = '0px';
            app.Popups.getCFG().els.main.appendChild(dark);

            const yookassaStyle = document.createElement('style');
            yookassaStyle.textContent = '.checkout-modal__content { overflow: visible !important; }';
            document.head.appendChild(yookassaStyle);

            const removeDark = () => {
                if (dark.parentNode) {
                    dark.parentNode.removeChild(dark);
                }
                if (yookassaStyle.parentNode) {
                    yookassaStyle.parentNode.removeChild(yookassaStyle);
                }
            }

            //Инициализация виджета. Все параметры обязательные.
            const checkout_cfg = {
                confirmation_token: payment.confirmation.confirmation_token, //Токен, который перед проведением оплаты нужно получить от ЮKassa
                customization: {
                    modal: true
                },
                error_callback(error) {
                    // Обработка ошибок инициализации
                    console.error(error);
                    removeDark();
                    checkout.destroy();
                }
            };

            // Если хотите настраивать отображение способов оплаты, напишите вашему менеджеру ЮKassa.
            if (payment.payment_method_data) {
                checkout_cfg.customization.payment_methods = [payment.payment_method_data];
            }

            const checkout = new window.YooMoneyCheckoutWidget(checkout_cfg);

            checkout.on('modal_close', () => {
                removeDark();
            });

            checkout.on('success', () => {
                app.Utils.showInfo('Куплено 🎉', {type :0});
                removeDark();
                checkout.destroy();
            });

            checkout.on('fail', () => {
                app.Utils.showInfo('Не удалось завершить покупку. Попробуйте позже');
                removeDark();
                checkout.destroy();
            });

            checkout.render()
                //Метод возвращает Promise, исполнение которого говорит о полной загрузке платежной формы (можно не использовать).
                .then(() => {
                    //Код, который нужно выполнить после отображения платежной формы.
                });
        },
    };

}
