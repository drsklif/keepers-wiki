if (!app.OVMSDK) {

    let region = 'ru';

    // Google-сборка: обёртка отвечает этим кодом, когда Google Play не отдал товар
    const PRODUCT_NOT_FOUND = 2000;
    // таймер идёт с постановки в очередь: мост шлёт запросы в обёртку по одному
    const PRICE_TIMEOUT_MS = 5000;
    const GOOGLE_PAY_UNAVAILABLE = 'Google Play в России не принимает оплату. Установите игру из RuStore — аккаунт и прогресс сохранятся.';
    let googlePayUnavailable = false;
    let googlePayUnavailableShown = false;

    function showGooglePayUnavailable() {
        app.Utils.showInfo(GOOGLE_PAY_UNAVAILABLE, {type: 1, animation: 0, duration: 6});
    }

    app.OVMSDK = {

        init() {
            OVMSDK.setUserId(app.Model.user.id);

            OVMSDK.getAppVersion().then(v => {
                region = v.includes('en')
                    ? 'en'
                    : 'ru';
            });

            if (!app.UserUtil.isAdsDisabled()) this.initAds();
        },

        getLocalizedPrice(offer) {
            const sku = this.getInAppId(offer);
            const price = OVMSDK.getLocalizedPrice(sku);
            if (!app.UserUtil.isOVMType('google')) return price;

            // покупку закрывает только отказ Google; таймаут бывает и при исправном Google
            price.then(() => {
                googlePayUnavailable = false;
            }, e => {
                if (e && e.code === PRODUCT_NOT_FOUND) googlePayUnavailable = true;
            });

            // обёртка может не ответить вовсе, тогда без таймаута кнопка навсегда остаётся с «...»
            const timeout = new Promise((resolve, reject) => setTimeout(() => reject('price timeout: ' + sku), PRICE_TIMEOUT_MS));
            return Promise.race([price, timeout]).catch(e => {
                if (!googlePayUnavailableShown) {
                    googlePayUnavailableShown = true;
                    showGooglePayUnavailable();
                }
                throw e;
            });
        },

        purchase(offer) {
            if (googlePayUnavailable) {
                showGooglePayUnavailable();
                return Promise.resolve();
            }
            const sku = this.getInAppId(offer);
            return OVMSDK.purchase(sku, app.Model.user.id);
        },

        isRuRegion() {
            return region === 'ru';
        },

        getInAppId(offer) {
            let id;
            if (app.Utils.isNumber(offer)) {
                id = 'ru.over.keepers.gems_' + offer;
            } else {
                id = 'ru.over.keepers.' + offer;
            }
            return id;
        },

        showAds1(type, data) {
            OVMSDK.adAvailable().then(available => {
                if (!available) {
                    app.Utils.showInfo('Предложенная реклама более не актуальна.');
                    app.Network.command({cmd: 'Ads1NotReady', type: type});
                    return;
                }
                const cmd = {cmd: 'Ads1Started', type: type};
                if (data) {
                    cmd.data = data;
                }
                app.Network.command(cmd);
                OVMSDK.adWatch(type).then(() => {
                    app.Network.command({cmd: 'Ads1Completed', type: type}, (data) => {
                        this.onAds1Completed(type, data);
                    });
                }).catch(() => {
                    app.Network.command({cmd: 'Ads1Skipped', type: type});
                });
            });
        },

        onAds1Completed(type, data) {
            if (data.drop) {
                app.UserUtil.processChestDrop(data.drop);
                app.Chests.showDrop(data.drop);
            } else if (type === 'daily') {
                let p = app.Popups.getLast();
                if (p && p.cfg && p.cfg.id === '_REWARD_') {
                    delete p.cfg.ad;
                    app.Utils.createRewardPopup(p.tmp.reward, p.cfg, 2);
                    app.Popups.removePopup(p);
                }
            }
        },

        showAds() {
            app.Network.command({cmd: 'AdsStarted'});
            OVMSDK.adWatch().then(() => {
                app.Network.command({cmd: 'AdsCompleted'});
            }).catch(() => {
                app.Utils.showInfo('Предложенная реклама более не актуальна.');
                app.Network.command({cmd: 'AdsSkipped'});
            });
        },

        initAds() {
            OVMSDK.adAvailable().then(available => {
                if (!app.Model.user.ads) {
                    if (available) {
                        app.Network.command({cmd: 'AdsInit'}, () => {
                            this.loopAds();
                        });
                    }
                } else {
                    app.Model.user.ads.available = available;
                    if (!available) {
                        app.Network.command({cmd: 'AdsNotReady'});
                    }
                    this.loopAds();
                }
            });
        },

        loopAds() {
            if (app.UserUtil.isAdsAvailable()) {
                let state = app.Model.user.ads.state;
                if (state.v === -1) {
                    state.v = 0;
                    OVMSDK.adAvailable().then(available => {
                        app.Network.command({cmd: available ? 'AdsReady' : 'AdsNotReady'});
                    });
                }
            }
            setTimeout(() => this.loopAds(), 5000);
        }
    };

    setTimeout(() => {
        if (app.Model.user.id === 3776318) {
            app.loadEruda();
        }
    }, 1);
}