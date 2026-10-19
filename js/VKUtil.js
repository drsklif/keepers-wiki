if (!app.VKUtil) {

    // VK Open API (глобал VK): нужен для VK.callMethod в Purchase и MainPage.
    // Грузится один раз, повторные вызовы получают колбэк сразу или встают в очередь загрузки
    const _openAPI = {loading: 0, ready: 0, onLoad: [], onError: []};

    // vkBridge
    app.VKUtil = {
        app_id: 6732282,
        group_id: 168438674,

        loadOpenAPI(onLoad, onError) {
            if (_openAPI.ready) {
                if (onLoad) onLoad();
                return;
            }

            if (onLoad) _openAPI.onLoad.push(onLoad);
            if (onError) _openAPI.onError.push(onError);

            if (_openAPI.loading) return;
            _openAPI.loading = 1;

            const mobile = app.UserUtil.isVKMobile();

            const flush = (key) => {
                const list = _openAPI[key];
                _openAPI.loading = 0;
                _openAPI[key] = [];
                if (key === 'onLoad') {
                    _openAPI.ready = 1;
                    // при ошибке очередь onLoad сохраняется: её выполнит следующая удачная попытка
                    _openAPI.onError = [];
                }
                for (let i = 0; i < list.length; i++) {
                    try {
                        list[i]();
                    } catch (e) {
                        console.log('loadOpenAPI callback error', e);
                    }
                }
            };

            const onScript = () => {
                // mobile_sdk бросает "Sdk is not init" в callMethod до VK.init, очереди вызовов у него нет.
                // xd_connection в этом не нуждается: он сам кладёт вызов в VK._initQueue
                if (mobile && !VK.proxy) {
                    VK.init(() => flush('onLoad'), () => flush('onError'), '5.124');
                    return;
                }
                flush('onLoad');
            };

            // повторное исполнение xd_connection сбрасывает VK._Rpc и VK._callbacks,
            // поэтому если глобал уже есть — второй раз не грузим
            if (typeof VK !== 'undefined') {
                onScript();
                return;
            }

            const el = document.createElement('script');
            el.type = 'text/javascript';
            el.onload = onScript;
            el.onerror = () => flush('onError');
            el.src = mobile
                ? 'https://vk.ru/js/api/mobile_sdk.js'
                : 'https://vk.ru/js/api/xd_connection.js?3';
            document.getElementsByTagName('head')[0].appendChild(el);
        },

        vkBridgeInit() {
            return new Promise((resolve) => {
                if (typeof vkBridge !== 'undefined' && vkBridge) {
                    resolve();
                } else {
                    const el = document.createElement('script');
                    el.src = app.getResourceURL('/js/libs/vk-bridge.2.4.7.js');
                    el.async = true;
                    el.onload = () => {
                        resolve();
                    }
                    document.getElementsByTagName('head')[0].appendChild(el);
                }
            });
        },

        vkBridgeEvents() {
            vkBridge.subscribe((e) => {
                if (!e.detail) return;

                const {type, data} = e.detail;

                switch (type) {
                    case 'VKWebAppInitResult': {
                        console.log('VKWebAppInitResult', data);
                        break;
                    }
                    case 'VKWebAppJoinGroupResult': {
                        console.log('VKWebAppJoinGroupResult', data);
                        break;
                    }
                    case 'VKWebAppAddToMenuFailed':
                    case 'VKWebAppAllowNotificationsFailed': {
                        if (data && data.error_data && data.error_data.error_code === 4) {
                            app.Utils.showInfo('Зря, это очень удобно )', {type: 0});
                        }
                        break;
                    }
                    case 'VKWebAppCheckAllowedScopesResult': {
                        console.log(data);
                        break;
                    }
                    case 'VKWebAppLocationChanged': {
                        console.log('VKWebAppLocationChanged', data);
                        break;
                    }
                    case 'VKWebAppChangeFragment': {
                        console.log('VKWebAppChangeFragment', data);
                        break;
                    }
                }
            });
        },

        vkBridgeCheckScopeAndAction(scopes, doAction) {
            let getScopesToken = (scopes) => {
                vkBridge.send('VKWebAppGetAuthToken', {'app_id': app.VKUtil.app_id, 'scope': scopes}).then(data => {
                    if (data && data.access_token) {
                        doAction();
                    } else {
                        app.Utils.showInfo('Необходимо разрешить доступ.');
                    }
                }).catch(err => {
                    console.log('Error: ', err);
                    if (err && err.error_type === 'client_error' && err.error_data && err.error_data.error_code === 4) {
                        app.Utils.showInfo('Необходимо разрешить доступ.');
                    } else {
                        app.Utils.showInfo('Функционал временно недоступен.');
                    }
                });
            };

            if (vkBridge.supports('VKWebAppCheckAllowedScopes')) {
                vkBridge.send('VKWebAppCheckAllowedScopes', {scopes: scopes}).then(data => {
                    if (data && data.result) {
                        let entry = data.result[0];
                        if (entry.allowed) {
                            doAction();
                        } else {
                            getScopesToken(scopes);
                        }
                    } else {
                        app.Utils.showInfo('Функционал временно недоступен.');
                    }
                });
            } else if (vkBridge.supports('VKWebAppGetAuthToken')) {
                getScopesToken(scopes);
            }
        },

        isMobile() {
            return vkBridge.isWebView();
        },

        showAds1(type, data) {
            if (vkBridge && vkBridge.supports('VKWebAppShowNativeAds')) {
                const cmd = {cmd: 'Ads1Started', type: type};
                if (data) {
                    cmd.data = data;
                }
                app.Network.command(cmd);
                vkBridge.send("VKWebAppShowNativeAds", {ad_format: 'reward'}).then(data => {
                    if (data && data.result) {
                        app.Network.command({cmd: 'Ads1Completed', type: type}, (data) => {
                            this.onAds1Completed(type, data);
                        });
                    } else {
                        app.Network.command({cmd: 'Ads1Skipped', type: type});
                    }
                }).catch(error => {
                    if (error.error_type === 'client_error'
                        && error.error_data && error.error_data.error_reason === 'No ads') {
                        app.Utils.showInfo('Вероятно AD_BLOCK блокирует рекламу');
                    }
                });
                return;
            }

            if (typeof admanInit === 'undefined') return;

            const onAdsReady = (adman) => {
                console.log('onAdsReady', adman);
                adman.onStarted(() => {
                    console.log('onStarted');
                    const cmd = {cmd: 'Ads1Started', type: type};
                    if (data) {
                        cmd.data = data;
                    }
                    app.Network.command(cmd);
                });
                adman.onCompleted(() => {
                    console.log('onCompleted');
                    app.Network.command({cmd: 'Ads1Completed', type: type}, (data) => {
                        this.onAds1Completed(type, data);
                    });
                });
                adman.onSkipped(() => {
                    console.log('onSkipped');
                    app.Network.command({cmd: 'Ads1Skipped', type: type});
                });
                adman.onClicked(() => {
                    console.log('onClicked');
                });
                adman.start('preroll');
            };
            const onNoAds = () => {
                console.log('onNoAds');
                app.Utils.showInfo('Предложенная реклама более не актуальна.');
                app.Network.command({cmd: 'Ads1NotReady', type: type});
            }
            admanInit({
                user_id: app.Model.user.partner.u,
                app_id: 6732282,
                type: 'rewarded'
            }, onAdsReady, onNoAds);
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

        /*
        // Access denied: this method is not allowed for game
        getParams() {
            console.log("getParams", vkBridge);
            vkBridge && vkBridge.send('VKWebAppGetLaunchParams')
                .then(data => {
                    console.log(data);
                }).catch(err => {
                    console.error(err);
                });
        }
         */
    };

    const utmTryToReward = () => {
        const hasUtm = app.Model.user.partner
            && app.Model.user.partner.cfg
            && app.Model.user.partner.cfg.misc
            && app.Model.user.partner.cfg.misc.utm;

        if (!hasUtm) return;

        if (app.Model.user.partner.cfg.misc.utm.rewarded) {
            console.log('utm already rewarded');
            return;
        }

        app.Network.command({cmd: 'VKCustomReward', state: 0}, data => {
            console.log('VKCustomReward', data);
            if (data.reward) {
                let received = 0;
                app.Utils.createRewardPopup(data.reward, {
                    header: 'Вам подарок!',
                    okButton: {
                        name: 'Забрать',
                        click() {
                            received = 1;
                            app.Network.command({cmd: 'VKCustomReward', state: 1}, data => {
                                if (data.error) {
                                    app.Utils.showInfo('Попробуйте позже');
                                } else {
                                    app.Utils.showInfo('Подарок получен!', {type: 0});
                                    if (data.reward.item) {
                                        app.UserUtil.addItem(data.reward.item, data.reward.itemCount);
                                    }
                                }
                            });
                        }
                    },
                    onClose() {
                        if (!received) {
                            app.Utils.showInfo('Не забудь забрать награду.', {type: 0});
                        }
                    }
                });
            }
        });
    };

    let intervalId = setInterval(() => {
        if (app
            && app.Model
            && app.Model.user
            /*
            && app.UserUtil
            && app.UserUtil.isTutorialCompleted()*/) {

            if (true) {
                const hasUtm = app.Model.user.partner
                    && app.Model.user.partner.cfg
                    && app.Model.user.partner.cfg.misc
                    && app.Model.user.partner.cfg.misc.utm;

                if (hasUtm) {
                    utmTryToReward();
                } else {
                    const utm = {};

                    const params = _getRequestParameters();
                    console.log(params);

                    const hash = params.hash;
                    if (hash && hash.length > 0) {
                        const plist = hash.split('&');
                        for (let i = 0; i < plist.length; i++) {
                            const param = plist[i];
                            const eqIdx = param.indexOf('=');
                            const key = param.substring(0, eqIdx);
                            const value = param.substring(eqIdx + 1);
                            utm[decodeURIComponent(key)] = decodeURIComponent(value);
                        }

                        const keys = Object.keys(utm);
                        if (keys) {
                            for (const key of keys) {
                                switch(key) {
                                    case 'utm_source':
                                    case 'utm_medium':
                                    case 'utm_campaign':
                                        continue;
                                    default:
                                        delete utm[key];
                                        break;
                                }
                            }
                        }
                    }

                    console.log('utm', utm);

                    if (utm.utm_campaign === '30.10.24') {
                        app.Network.command({cmd: 'VkUserPartnerCfgUpdate', misc: { utm }}, data => {
                            console.log('VkUserPartnerCfgUpdate', data);
                            if (data.updated) {
                                // TODO: remove
                                app.Model.user.partner.cfg = data.user.partner.cfg
                                setTimeout(utmTryToReward, 1000);
                            }
                        });
                    }
                }
            }
            clearInterval(intervalId);
        }
    }, 1000);

}