app.OKUtil = (function () {

    let initialized = false;
    let lastAdStarted;

    let forceUpdateAdAndShow;

    setTimeout(() => {
        console.log(app.Model.user.id);
        if (app.Model.user.id === 1692394) {
            app.MainPage.getCFG().user.els.main.onclick = () => {
                console.log('showAds1::chest0');
                app.OKUtil.showAds1('chest0');
            }
        }
    }, 3000);

    return {
        loadScript() {
            return new Promise((resolve) => {
                let script = document.createElement('script');
                script.type = 'text/javascript';
                script.async = true;
                script.onload = () => {
                    resolve();
                };
                script.src = '//api.ok.ru/js/fapi5.js';
                script.setAttribute('defer', 'defer');
                document.getElementsByTagName('head')[0].appendChild(script);
            });
        },

        init() {
            return new Promise((resolve, reject) => {
                this.loadScript().then(() => {
                    let params = FAPI.Util.getRequestParameters();
                    FAPI.init(params["api_server"], params["apiconnection"],
                        /*
                         * Первый параметр:
                         * функция, которая будет вызвана после успешной инициализации.
                         */
                        function () {
                            console.log('OK init success');

                            initialized = true;

                            window.API_callback = function (method, result, data) {
                                console.log('OK API_callback ****');
                                console.log(method, result, data);
                                console.log('**** OK API_callback');
                                switch (method) {
                                    case 'getPageInfo':
                                        if (result === 'ok') {
                                            // TODO: возможно нужно обновить размерность игры?
                                        }
                                        break;
                                    case 'showInvite':
                                        if (result === 'ok') {
                                            app.Utils.showInfo('Приглашение отправлено', {type: 0});
                                        }
                                        break;
                                    case 'showPayment':
                                        if (result === 'ok') {
                                            app.Utils.showInfo('Покупка успешна!', {type: 0});
                                        }
                                        break;
                                    case 'prepareMidroll':
                                        if (result === 'ok') {
                                            app.Network.command({cmd: 'AdsReady'});
                                        } else if (result === 'error') {
                                            //data - empty
                                            //data - disabled
                                            app.Network.command({cmd: 'AdsNotReady'});
                                        }
                                        break;
                                    case 'showMidroll':
                                        const _lastAdStarted = lastAdStarted;
                                        lastAdStarted = undefined;

                                        if (result === 'ok') {
                                            if (_lastAdStarted && app.OKUtil._isAdsTypeAds1(_lastAdStarted.t)) {
                                                const type = _lastAdStarted.t;
                                                app.Network.command({cmd: 'Ads1Completed', type: type}, data => {
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
                                            } else {
                                                app.Network.command({cmd: 'AdsCompleted'});
                                            }
                                        } else if (result === 'error') {
                                            if (_lastAdStarted && app.OKUtil._isAdsTypeAds1(_lastAdStarted.t)) {
                                                app.Network.command({cmd: 'Ads1Skipped', type: _lastAdStarted.t});
                                            } else {
                                                app.Network.command({cmd: 'AdsSkipped'});
                                            }
                                        }
                                        break;
                                }
                            };

                            resolve();
                        },
                        /*
                         * Второй параметр:
                         * функция, которая будет вызвана, если инициализация не удалась.
                         */
                        function (error) {
                            console.error('OK init error: [' + JSON.stringify(error) + ']')
                            reject(error);
                        }
                    );
                }).catch(err => {
                    console.error('Error', err);
                    reject();
                })
            });
        },

        loopAds() {
            let doUpdate = false;

            if (app.UserUtil.isAdsAvailable()) {
                if (app.Model.user.ads.state.v === -1) {
                    app.Model.user.ads.state.v = 0;
                    doUpdate = true;
                }
            }

            ['chest0', 'daily'].forEach(type => {
                if (app.UserUtil.isAds1Available(type)) {
                    if (app.Model.user.ads1[type].s.v === 1) {
                        app.Model.user.ads1[type].s.v = 2;
                        doUpdate = true;
                    }
                }
            });

            if (doUpdate) {
                app.OKUtil.updateAds();
            }

            setTimeout(app.OKUtil.loopAds, 3000);
        },

        updateAds() {
            if (!initialized) return;
            FAPI.invokeUIMethod("prepareMidroll");
        },

        showAds() {
            if (!initialized) return;
            lastAdStarted = {t: 'quests'};
            app.Network.command({cmd: 'AdsStarted'});
            FAPI.invokeUIMethod('showMidroll');
        },

        showAds1(type, data) {
            if (!initialized) return;
            lastAdStarted = {t: type};
            if (data) lastAdStarted.t.d = data;
            const cmd = {cmd: 'Ads1Started', type: type};
            if (data) {
                cmd.data = data;
            }
            app.Network.command(cmd);
            FAPI.invokeUIMethod('showMidroll');
        },

        _isAdsTypeAds1(type) {
            return type === 'chest0' || type === 'daily';
        },

        isWeb() {
            const params = app.Utils.getRequestParameters();
            if (params.container && !params.mob) return true;
            if (params.mob) {
                switch (params.mob_platform) {
                    case 'androidweb':
                    case 'iosweb':
                    case 'mobweb':
                        return true;
                }
            }
            return false;
        },

        checkPrize() {
            return new Promise(resolve => {
                FAPI.Client.call(
                    {
                        method: "users.checkFlag",
                        flag: "prize"
                    },
                    (status, data, error) => {
                        console.log(status, data, error);
                        resolve(data && data.success);
                    }
                );
            });
        },

        resetPrize() {
            FAPI.Client.call(
                {
                    method: "users.resetFlag",
                    flag: "prize"
                },
                (status, data, error) => {
                    console.log(status, data, error);
                }
            );

        }
    };
})();