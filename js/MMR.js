app.MMR = (function() {

    const PRIVATE_KEY = '4540594ecbfdf66b41376ba699c97385';
    let initialized = 0;

    let listeners = {};

    return {
        load(onLoad) {
            let el = document.createElement('script');
            el.type = 'text/javascript';
            el.onload = onLoad;
            el.async = true;
            el.src = 'https://connect.mail.ru/js/loader.js';
            document.getElementsByTagName('head')[0].appendChild(el);
        },

        init() {
            this.load(() => {
                mailru.loader.require('api', () => {
                    console.log('mmr api loaded');
                    mailru.app.init(PRIVATE_KEY);
                    console.log('mmr api initialized');
                    initialized = 1;
                })
            })
        },

        payment(serviceId, serviceName, price) {
            if (listeners[mailru.app.events.paymentDialogStatus] === undefined) {
                listeners[mailru.app.events.paymentDialogStatus] = (event) => {
                    console.log(event);
                }
                mailru.events.listen(mailru.app.events.paymentDialogStatus, listeners[mailru.app.events.paymentDialogStatus]);
            }
            if (listeners[mailru.app.events.incomingPayment] === undefined) {
                listeners[mailru.app.events.incomingPayment] = (event) => {
                    console.log(event);
                }
                mailru.events.listen(mailru.app.events.incomingPayment, listeners[mailru.app.events.incomingPayment]);
            }
            mailru.app.payments.showDialog({service_id: serviceId, service_name: serviceName, mailiki_price: price});
        }
    };
})();