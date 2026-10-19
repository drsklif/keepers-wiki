if (!app.Ifree2) {
    app.Ifree2 = {
        payment(offer, data) {
            app.Network.command({cmd: 'Ifree2BillingMobileInvoice', offer}, data => {
                if (data.error) {
                    app.Utils.showInfo('Покупки временно недоступны');
                } else {
                    app.Utils.showInfo('Счет выставлен. Ожидайте', {type: 0, top: 60});
                }
            });
        },

        paymentBank(offer, data) {
            app.Network.command({cmd: 'Ifree2BillingBankInvoice', offer}, data => {
                console.log(data);
                if (data.error) {
                    app.Utils.showInfo('Покупки временно недоступны');
                } else {
                    window.open(data.url, '_self');
                }
            });
            app.Utils.showInfo('Ожидайте', {type: 0});
        }
    };
}