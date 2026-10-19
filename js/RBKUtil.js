let _initialized;

app.RBKUtil = {
    init(api_server) {
        if (_initialized) return;
        _initialized = 1

        app.loadJS0(api_server + 'bundles/gamesiteapi/js/gsapi.js', () => {
            setTimeout(() => {
                const promos = app.Model.user.partner.cfg.promos;
                if (promos) {
                    for (const key of Object.keys(promos)) {
                        if (promos[key] === 0) {
                            app.Network.command({cmd: 'RBKPromoReward', promo: key, state: 0}, data => {
                                if (data.error) {
                                } else {
                                    const header = 'Приятный начальный бонус!';
                                    const reward = app.Utils.dropToReward(data.drop);
                                    app.Utils.createRewardPopup(reward, {
                                        header: 'Вам подарок!',
                                        text: header,
                                        okButton: {
                                            name: 'Забрать',
                                            click() {
                                                app.Network.command({cmd: 'RBKPromoReward', promo: key, state: 1}, data => {
                                                    if (data.error) {
                                                        app.Utils.showInfo('Попробуйте позже');
                                                    } else {
                                                        app.UserUtil.processChestDrop(data.drop);
                                                        app.EventDispatcher.emit('show chest drop', {drop: data.drop});
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                            });
                            break;
                        }
                    }
                }
            }, 1000);
        });
    },

    getPriceIcon() {
        return 'https://puu.sh/IgBix/b02dc31a3a.png';
    },

    processPurchase(pack) {
        app.Network.command({cmd: 'RBKPurchase', pack: pack}, (data) => {
            if (data.result === 0) {
                if (pack.startsWith('gems_')) {
                    const p = app.Popups.getLast();
                    if (p && p.cfg && p.cfg.id === 'RESOURCES_SHOP') {
                        app.Popups.removePopup(p);
                    }
                }
            } else if (data.result === 1) {
                GSAPI.UI.showPayment();
            } else {
                app.Utils.showInfo('Покупка недоступна. Обратитесь в техподдержку игры');
            }
        });
    }
};