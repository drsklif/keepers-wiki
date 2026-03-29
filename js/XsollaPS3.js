if (typeof app.XsollaPS3 === 'undefined') {
    app.XsollaPS3 = {
        // 0 - none
        // 1 - start load
        // 2 - loaded
        state: {v: 0, t: 0},

        payment(offer, data) {
            let returnUrl = location.protocol + '//' + location.host;
            let cmd = {cmd: 'XsollaGetAccessToken', offer: offer, mobile: app.Utils.isMobileOrTable(), return_url: returnUrl};
            if (data && data.mobile_invoice) {
                cmd.mobile_invoice = data.mobile_invoice;
            }
            if (data && data.payment_method) {
                cmd.payment_method = data.payment_method;
            }
            if (data && data.bank) {
                cmd.bank = data.bank;
            }
            app.Network.command(cmd, data => {
                if (data.error) {
                    app.Utils.showInfo('Покупки временно недоступны');
                } else {
                    app.XsollaPS3.open(data.token, data.sandbox);
                }
            });
        },

        open(access_token, sandbox) {
            if (this.state.v !== 2) {
                app.Utils.showInfo('Платежи временно недоступны.');
                return;
            }

            /*
            let options = {
                access_token: access_token
            };
            if (sandbox) {
                options.sandbox = true;
            }
            if (app.Utils.isMobileOrTable()) {
                options.childWindow = {
                    target: '_self'
                };
            } else {
                options.childWindow = {
                    target: '_self'
                };
            }

            XPayStationWidget.init(options);
            XPayStationWidget.open();
             */

            if (sandbox) {
                window.open('https://sandbox-secure.xsolla.com/paystation3/?access_token=' + access_token, '_self');
            } else {
                window.open('https://secure.xsolla.com/paystation3/?access_token=' + access_token, '_self');
            }
        },

        load() {
            if (this.state.v !== 0) return;

            this.state.v = 1;
            this.state.t = app.TimeUtil.now();

            this.state.v = 2;
            this.state.t = app.TimeUtil.now();

            /*
            let el = document.createElement('script');
            el.type = "text/javascript";
            el.onload = () => {
                this.state.v = 2;
                this.state.t = app.TimeUtil.now();
            };
            el.async = true;
            el.src = "https://cdn.xsolla.net/embed/paystation/1.2.2/widget.min.js";
            document.getElementsByTagName('head')[0].appendChild(el);
             */
        }
    };
}