if (!app.OVMSDK) {

    let region = 'ru';

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

        getLocalizedPrice(offer, cb) {
            const sku = this.getInAppId(offer);
            return OVMSDK.getLocalizedPrice(sku);
        },

        purchase(offer) {
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