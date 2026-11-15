if (!app.AGUtil) {

    app.AGUtil = {

        init() {
            const script = document.createElement('script');
            script.src = 'https://ag.ru/agru-sdk/dist/umd/index.min.js';
            script.async = true;
            script.onload = this.onSDKLoad;
            const t = document.getElementsByTagName('script')[0];
            t.parentNode.insertBefore(script, t);

            this.loadD2D();
        },

        loadD2D() {
            const script = document.createElement('script');
            //script.src = 'https://cdn.devtodev.com/sdk/web/v2/devtodevsdk.js';
            script.src = 'https://keepers.mobi/js/devtodevsdk.js';
            script.async = true;
            script.onload = this.onD2DLoad;
            const t = document.getElementsByTagName('script')[0];
            t.parentNode.insertBefore(script, t);
        },

        onD2DLoad() {
            console.log('D2D loaded');

            const loop = () => {
                if (app.Model && app.Model.user) {
                    console.log('D2D initialization ...');
                    const config = {
                        userId: '' + app.Model.user.id,
                        currentLevel: app.Model.user.level + 1,
                        trackingAvailability: true,
                        logLevel: 'Debug', //'No'
                        applicationVersion: '1'
                    };
                    window.devtodev.initialize('30e139b8-07a9-02f2-a260-c72e03200c83', config);
                    console.log('D2D initialization complete.');

                    setTimeout(app.AGUtil.d2dCurrentBalance, 1000);
                } else {
                    setTimeout(loop, 1000);
                }
            };
            loop();
        },

        // -1 — туториал начат; номер вехи с 1; -2 — основная часть пройдена
        d2dTutorial(stepNumber) {
            if (window.devtodev === undefined) return;
            window.devtodev.tutorial(stepNumber);
        },

        d2dLevelUp() {
            if (window.devtodev === undefined) return;
            const balance = {
                "gold": app.Model.user.gold,
                "gems": app.UserUtil.getGemsTotal()
            };
            window.devtodev.levelUp(app.Model.user.level + 1, balance);
        },

        d2dCurrentBalance() {
            if (window.devtodev === undefined) return;
            const balance = {
                "gold": app.Model.user.gold,
                "gems": app.UserUtil.getGemsTotal()
            };
            window.devtodev.currentBalance(balance);
        },

        d2dRealCurrencyPayment(tId, price, currency, offer) {
            if (window.devtodev === undefined) return;
            console.log('d2dRealCurrencyPayment', arguments);
            window.devtodev.realCurrencyPayment(tId, price, offer, currency);
        },

        onSDKLoad() {
            console.log('AG SDK loaded');

            app.AGUtil._sdk = new AgRuSdk();
            app.AGUtil._sdk.on(AgRuSdkMethods.SayHello, (data) => {
                console.log('SayHello: ', data);
            });
            app.AGUtil._sdk.on(AgRuSdkMethods.ShowCampaign, (data) => {
                console.log('ShowCampaign: ', data);
                if (data.type === 'rewarded') {
                    if (data.status) {
                        if (app.AGUtil._lastAds1) {
                            const cmd = {cmd: 'Ads1Started', type: app.AGUtil._lastAds1.type};
                            if (app.AGUtil._lastAds1.data) {
                                cmd.data = app.AGUtil._lastAds1.data;
                            }
                            app.Network.command(cmd);
                        } else {
                            app.Network.command({cmd: 'AdsStarted'});
                        }
                    } else if (data.reward) {
                        if (app.AGUtil._lastAds1) {
                            app.Network.command({cmd: 'Ads1Completed', type: app.AGUtil._lastAds1.type}, data => {
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
                            });
                            delete app.AGUtil._lastAds1;
                        } else {
                            app.Network.command({cmd: 'AdsCompleted'});
                        }
                    } else {
                        if (app.AGUtil._lastAds1) {
                            app.Network.command({cmd: 'Ads1Skipped', type: app.AGUtil._lastAds1.type});
                            delete app.AGUtil._lastAds1;
                        } else {
                            app.Network.command({cmd: 'AdsSkipped'});
                        }
                    }
                }
            });
            app.AGUtil._sdk.on(AgRuSdkMethods.ShowPayment, (data) => {
                console.log('ShowPayment: ', data);

                if (data.status) return;

                const info = data.info;
                if (info == null) return;

                if (info.invoice) {
                    // TODO: process payment
                }
            });
            console.log('AG SDK', app.AGUtil._sdk);
        },

        showAuth() {
            app.AGUtil._sdk.authorize();
        },

        showPurchase(offer) {
            app.Network.command({cmd: 'AGToken', offer}, data => {
                console.log('AGToken: ', data);
                if (data.error) {
                    app.Utils.showInfo('Ошибка. Обратитесь в тех поддержку игры');
                } else {
                    try {
                        const response = JSON.parse(data.token);
                        if (response.token) {
                            app.AGUtil._sdk.showPayment(response.token);
                        } else if (response.detail) {
                            app.Utils.showInfo(`Ошибка обработки ответа сервера: '${response.detail}'. Обратитесь в тех поддержку игры`);
                        }
                    } catch (e) {
                        console.error(e);
                        app.Utils.showInfo('Ошибка обработки ответа сервера. Обратитесь в тех поддержку игры');
                    }
                }
            });
        },

        showAds() {
            delete app.AGUtil._lastAds1;
            app.AGUtil._sdk.showCampaign('rewarded', (data, error) => {
                console.log('showCampaign: ', data, error);
            });
        },

        showAds1(type, data) {
            app.AGUtil._lastAds1 = {type};
            if (data) app.AGUtil._lastAds1.data = data;
            app.AGUtil._sdk.showCampaign('rewarded', (data, error) => {
                console.log(`showCampaign '${type}': `, data, error);
            });
        },

        isGuest() {
            return app.AGUtil._sdk.options.guest === "true";
        }
    };

    const loopAds = () => {
        if (app.Model && app.Model.user) {
            if (app.UserUtil.isAdsAvailable()) {
                const state = app.Model.user.ads.state;
                switch (state.v) {
                    case -1:
                        state.v = 0;
                        app.Network.command({cmd: 'AdsReady'});
                        break;
                }
            }
        }
        setTimeout(loopAds, 5000);
    };
    setTimeout(loopAds, 3000);
}
