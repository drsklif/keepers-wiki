let ysdk;
let player;
let payments;
let products;

// user data
let _oldPower;

let _ya_update = () => {
    // YANDEX METRIKA GOALS
    if (typeof ym !== 'undefined') {
        if (app && app.UserUtil && app.Model && app.Model.user) {
            if (app.UserUtil.isYandex()) {
                let cfg = app.Model.user.partner.cfg;
                if (cfg && cfg.metrika) {
                    let goals = ['in_game_10m', 'in_game_30m', 'in_game_1h', 'in_game_10h', 'in_game_100h', 'first_payment'];
                    goals.forEach(goal => {
                        if (cfg.metrika[goal] === 0) {
                            cfg.metrika[goal] = 1;
                            app.Network.command({cmd: 'YandexMarkGoalSend', goal: goal});
                            ym(68190592, 'reachGoal', goal);
                        }
                    });
                }
            }
        }
    }
    setTimeout(_ya_update, 5000);
};
setTimeout(_ya_update, 5000);

let YandexUtil = {
    initSDK() {
        console.log('Yandex initSDK');
        let t = document.getElementsByTagName('script')[0];
        let s = document.createElement('script');
        s.src = 'https://yandex.ru/games/sdk/v2?v=1';
        s.async = true;
        s.onload = this.onSDKLoad;
        t.parentNode.insertBefore(s, t);
    },

    onSDKLoad() {
        YaGames.init({screen: {orientation: 'portrait', lock: true}}).then(_ysdk => {
            console.log('Yandex SDK initialized');
            ysdk = _ysdk;

            console.log('ysdk.environment.i18n.lang', ysdk.environment.i18n.lang);

            const t = () => {
                if (app
                    && app.Model
                    && app.Model.user) {
                    if (app.Model.user.id === 3661454) {
                    } else if (true || app.Model.user.id === 3710271) {
                        ysdk.adv.showFullscreenAdv({
                            callbacks: {
                                onOpen() {
                                    console.log('showFullscreenAdv', 'onOpen');
                                },
                                onClose() {
                                    console.log('showFullscreenAdv', 'onClose');
                                },
                                onError() {
                                    console.log('showFullscreenAdv', 'onError');
                                },
                                onOffline() {
                                    console.log('showFullscreenAdv', 'onOffline');
                                }
                            }
                        });
                    }
                } else {
                    setTimeout(t, 300);
                }
            };
            t();

            app.YandexUtil.getLocalStorage().then(() => {
                app.EventDispatcher.emit('YSDK initialized');
            })
        }).catch(err => {
            console.log('onSDKLoad', JSON.stringify(err));
        });
    },

    getSDKPlayer(force, tryToCompleteOldPayments) {
        return new Promise((resolve, reject) => {
            if (player) {
                resolve();
            } else {
                ysdk.getPlayer({signed: true}).then(_player => {
                    console.log('player initialized', _player);
                    player = _player;
                    let localStorage = tryGetLocalStorage();
                    if (localStorage) {
                        localStorage.removeItem('_glc');
                    }

                    if (app && app.Network) {
                        app.Network.command({cmd: 'OnYandexAuth', uID: player.getUniqueID(), signature: player.signature}, (data) => {
                            if (data.error) {
                                switch (data.error.code) {
                                    case 1:
                                        document.location.reload(false);
                                        break;
                                    case 2:
                                        document.location.reload(false);
                                        break;
                                }
                            }
                        });
                    }
                    if (tryToCompleteOldPayments === undefined || tryToCompleteOldPayments) {
                        this.getSKDPayments(true);
                    }
                    const updateInfo = () => {
                        if (app.Network) {
                            app.Network.command({cmd: 'YandexGuestInfo', guest: !player.isAuthorized()});
                        } else {
                            setTimeout(updateInfo, 1000);
                        }
                    };
                    setTimeout(updateInfo, 1000);
                    resolve();
                }).catch(err => {
                    console.error('getSDKPlayer1', JSON.stringify(err));
                    if (err && err.code === 'UNAUTHORIZED') {
                        app.Utils && app.Utils.showInfo('Необходимо авторизоваться в Yandex');
                    }
                    if (force) {
                        ysdk.auth.openAuthDialog().then(() => {
                            // app.Network.command({cmd: 'OnYandexAuth', uiD});
                            this.getSDKPlayer(true, tryToCompleteOldPayments);
                        }).catch(err => {
                            console.error('getSDKPlayer2', JSON.stringify(err));
                        });
                    } else {
                        reject(err);
                    }
                });
            }
        });
    },

    getPlayer() {
        return player;
    },

    getSKDPayments(force) {
        return new Promise((resolve, reject) => {
            if (payments) {
                resolve();
            } else {
                ysdk.getPayments({signed: true}).then(_payments => {
                    console.log('payments initialized');
                    payments = _payments;
                    this.processOldPayments();
                    resolve();
                }).catch(err => {
                    console.error('getSKDPayments', JSON.stringify(err));
                    if (app && app.Network) {
                        app.Network.command({cmd: 'Error', err: 'getSKDPayments. ' + JSON.stringify(err)});
                    }
                    if (app && app.Utils) {
                        app.Utils.showInfo('Покупки недоступны, обратитесь в тех поддержку игры.');
                    }
                    reject(err);
                });
            }
        });
    },

    getProducts() {
        return new Promise((resolve, reject) => {
            if (products) {
                resolve();
            } else {
                app.YandexUtil.getSKDPayments(true).then(() => {
                    payments.getCatalog().then(list => {
                        products = list;
                        resolve();
                    });
                }).catch(err => {
                    console.log('getProducts', err);
                    if (app && app.Utils) {
                        app.Utils.showInfo('Покупки недоступны, обратитесь в тех поддержку игры..');
                    }
                    if (err && err.code && err.code === 'UNAUTHORIZED') {
                        ysdk.auth.openAuthDialog();
                    }
                })
            }
        });
    },

    getProduct(id) {
        return new Promise((resolve, reject) => {
            app.YandexUtil.getProducts().then(() => {
                let product;
                for (let i = 0; i < products.length; i++) {
                    if (products[i].id === id) {
                        product = products[i];
                        break;
                    }
                }
                resolve(product);
            })
        });
    },

    doPurchase(id) {
        if (!player) {
            this.getSDKPlayer(true, false).then(() => {
                this.doPurchase(id);
            }).catch(err => {
                console.error('doPurchase1', err);
                if (app && app.Network) {
                    app.Network.command({cmd: 'Error', err: 'doPurchase1. ' + JSON.stringify(err)});
                }
            });
            return;
        }

        if (!payments) {
            this.getSKDPayments(true).then(() => {
                this.doPurchase(id);
            }).catch(err => {
                console.log('doPurchase2', err);
                if (app && app.Network) {
                    app.Network.command({cmd: 'Error', err: 'doPurchase2. ' + JSON.stringify(err)});
                }
            });
            return;
        }

        payments.purchase(id).then(purchase => {
            this.validatePurchase(purchase);
        }).catch(err => {
            console.error('doPurchase3', JSON.stringify(err));
            if (app && app.Utils) {
                if (err && err.code === 'PAYMENT_USER_CANCELED') {
                    app.Utils.showInfo('Возвращайтесь позже!', {type: 0});
                } else {
                    app.Utils.showInfo('Покупки недоступны, обратитесь в тех поддержку игры...');
                }
            }
        });
    },

    processOldPayments() {
        if (player && payments) {
            payments.getPurchases({signed: true}).then(purchases => {
                this.validatePurchases(purchases.signature, () => {
                    purchases.forEach(purchase => this.consumePurchase(purchase));
                })
            }).catch(err => {
                console.error('processOldPayments', JSON.stringify(err));
                if (app && app.Network) {
                    app.Network.command({cmd: 'Error', err: 'processOldPayments. ' + JSON.stringify(err)});
                }
            });
        }
    },

    validatePurchase(purchase) {
        fetch('https://ya.keepers.mobi/billing/payment?partner=ya', {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({id: player.getUniqueID(), signature: purchase.signature})
        }).then(function (response) {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error("HTTP error, status = " + response.status);
            }
        }).then(function (data) {
            if (data.error) {
                console.log(data.error);
                if (app && app.Utils) {
                    app.Utils.showInfo('Покупки временно недоступны, обратитесь в тех поддержку игры');
                }
            } else if (data.ok) {
                if (app) {
                    if (app.Utils) {
                        app.Utils.showInfo('Покупка успешна', {type: 0});
                    }
                    if (app.Popups) {
                        let p = app.Popups.getLast();
                        if (p && p.cfg && p.cfg.id === 'RESOURCES_SHOP') {
                            app.Popups.removePopup(p);
                        }
                    }
                }
                YandexUtil.consumePurchase(purchase);
            } else {
                if (app && app.Utils) {
                    app.Utils.showInfo('Покупки временно недоступны, обратитесь в тех поддержку игры');
                }
            }
        }).catch(err => {
            console.error('validatePurchase', JSON.stringify(err));
            if (app && app.Network) {
                app.Network.command({cmd: 'Error', err: 'validatePurchase. ' + JSON.stringify(err)});
            }
        });
    },

    validatePurchases(signature, onComplete) {
        fetch('https://ya.keepers.mobi/billing/payment?partner=ya', {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({id: player.getUniqueID(), signature: signature})
        }).then(function (response) {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error("HTTP error, status = " + response.status);
            }
        }).then(function (data) {
            if (data.error) {
                console.log(data.error);
                if (app && app.Utils) {
                    app.Utils.showInfo('Покупки временно недоступны, обратитесь в тех поддержку игры');
                }
            } else if (data.ok) {
                if (app && app.Utils) {
                    app.Utils.showInfo('Покупка успешна', {type: 0});
                }
                if (app && app.Popups) {
                    let p = app.Popups.getLast();
                    if (p && p.cfg && p.cfg.id === 'RESOURCES_SHOP') {
                        app.Popups.removePopup(p);
                    }
                }
                onComplete();
            } else {
                if (app && app.Utils) {
                    app.Utils.showInfo('Покупки временно недоступны, обратитесь в тех поддержку игры');
                }
            }
        }).catch(err => {
            console.error('validatePurchases', JSON.stringify(err));
            if (app && app.Network) {
                app.Network.command({cmd: 'Error', err: 'validatePurchases. ' + JSON.stringify(err)});
            }
        });
    },

    consumePurchase(purchase) {
        if (payments) {
            payments.consumePurchase(purchase.purchaseToken)
                .then(() => {
                    console.log(purchase.productID + ' ' + purchase.purchaseToken + ' consumed');
                }).catch(err => {
                console.error('consumePurchase', JSON.stringify(err));
            });
        }
    },

    showAds() {
        const ad = {};
        ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen() {
                    console.log('Ads: open');
                    ad.started = 1;
                    app.Network.command({cmd: 'AdsStarted'});
                    stopSound();
                },
                onRewarded() {
                    console.log('Ads: rewarded');
                    ad.rewarded = 1;
                    app.Network.command({cmd: 'AdsCompleted'});
                },
                onClose() {
                    console.log('Ads: close');
                    ad.closed = 1;
                    if (ad.rewarded) {
                    } else {
                        app.Utils.showInfo('Необходимо завершить просмотр рекламы');
                        app.Network.command({cmd: 'AdsSkipped'});
                    }
                    startSound();
                },
                onError(e) {
                    console.error('Ads: error', e);
                    ad.error = 1;
                    if (ad.rewarded) {
                    } else {
                        app.Utils.showInfo('Предложенная реклама более не актуальна.');
                        app.Network.command({cmd: 'AdsSkipped'});
                    }
                    startSound();
                }
            }
        });
    },

    showAds1(type, data) {
        const ad = {};
        ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen() {
                    console.log('Ads: open');
                    ad.started = 1;
                    const cmd = {cmd: 'Ads1Started', type: type};
                    if (data) {
                        cmd.data = data;
                    }
                    app.Network.command(cmd);
                    stopSound();
                },
                onRewarded() {
                    console.log('Ads: rewarded');
                    ad.rewarded = 1;
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
                },
                onClose() {
                    console.log('Ads: close');
                    ad.closed = 1;
                    if (ad.rewarded) {
                    } else {
                        app.Utils.showInfo('Необходимо завершить просмотр рекламы');
                        app.Network.command({cmd: 'Ads1Skipped', type: type});
                    }
                    startSound();
                },
                onError(e) {
                    console.error('Ads: error', e);
                    ad.error = 1;
                    if (ad.rewarded) {
                    } else {
                        app.Utils.showInfo('Предложенная реклама более не актуальна.');
                        app.Network.command({cmd: 'Ads1Skipped', type: type});
                    }
                    startSound();
                }
            }
        });
    },

    showRegPopup(onComplete) {
        let p = app.Popups.createPopup1({
            header: {value: 'Авторизация'}
        });

        p.els.brd_bg.className = 'brd_block_bg';

        p.scroll.el.appendChild(app.Utils.createDIV({class: 'cntr str big', style: 'margin-top: 75px', html: 'Авторизируйтесь в сервисе Яндекс,<br> чтобы не потерять прогресс  своего персонажа'}));
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'hr mtb10', style: 'width: 420px;'}));
        p.scroll.el.appendChild(app.Utils.createDIV({class: 'btn_wrp mt20', html: '<a class="btn_g mlra_ab">Авторизоваться</a>'}, () => {
            if (!player) {
                this.getSDKPlayer(true, false).then(() => {
                    app.Popups.removePopup(p);
                    onComplete();
                }).catch(err => {
                    console.error('showRegPopup', JSON.stringify(err));
                });
            }
        }));

        app.Popups.add(p);

        let contentRequiredHeight = 200;

        app.Popups.centerPopup(p, function() {
            return contentRequiredHeight;
        }, function(top, availableHeight) {
            p.els.brd.style.top = top + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';

            p.els.wrap.style.width = '420px';
            p.els.wrap.style.left = '30px';
            p.els.wrap.style.height = availableHeight + 'px';

            p.els.wrap_s.style.width = '420px';

            p.scroll.top = 0;
            p.scroll.topMax = availableHeight < contentRequiredHeight ? contentRequiredHeight - availableHeight : 0;
        });
    },

    updateLeaderboardScore() {
        const power = app.UserUtil.getAllPower();
        if (_oldPower !== power) {
            _oldPower = power;
            ysdk.leaderboards.setScore('power', _oldPower);
        }
    },

    getLocalStorage() {
        return ysdk.getStorage()
            .then(safeStorage => Object.defineProperty(window, 'localStorage', {get: () => safeStorage}))
            .then(() => localStorage)
            .catch(err => {
                console.log('getLocalStorage', JSON.stringify(err));
            })
    }
};

app.YandexUtil = YandexUtil;

setInterval(() => {
    if (app.Model && app.Model.user) {
        app.YandexUtil.updateLeaderboardScore();
    }
}, 5000);

setTimeout(() => {
    if (app.Model && app.Model.user) {
        ysdk.notifications.allow();
        app.Network.command({cmd: 'YandexPushAllowed'});
    }
}, 3000);

const processHash = () => {
    if (app.Model && app.Model.user) {
        const hash = location.hash;
        if (hash) {
            if (hash.includes('agreement')) {
                app.loadJS1('Agreement', () => {
                    app.Agreement.create1();
                });
            }
            if (hash.includes('privacy')) {
                app.loadJS1('Agreement', () => {
                    app.Agreement.create3();
                });
            }
            if (hash.includes('chatrules')) {
                app.loadJS1('Agreement', () => {
                    app.Agreement.create4();
                });
            }
        }
    } else {
        setTimeout(processHash, 1000);
    }
};
processHash();

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


let soundState = 0;
let soundEffects = 0;
const stopSound = () => {
    if (soundState === 1) return;
    soundState = 1;
    soundEffects = app.Model.user.sounds.effects;
    app.Model.user.sounds.effects = 0;
    if (app.SoundManager) {
        app.SoundManager.stopBG1();
    }
};
const startSound = () => {
    setTimeout(() => {
        if (soundState === 2) return;
        soundState = 2;
        app.Model.user.sounds.effects = soundEffects;
        soundEffects = 0;
        if (app.SoundManager) {
            app.SoundManager.playBG1();
        }
    }, 3000);
};



//app.loadEruda();

setTimeout(() => {
    if (app.Model && app.Model.user /*&& app.Model.user.id === 3539882*/) {
        const proceedOldBonuses = async () => {
            let receivedBonuses = [];
            try {
                // запросить, какие бонусы начислены игроку
                receivedBonuses = await ysdk.bonuses.getPlayerBonuses();
            } catch (e) {
                // не удалось получить список бонусов игрока
            }

            console.log('old bobuses', receivedBonuses);

            // основной кейс появления бонуса прямо в процессе игры - ввод одного промокода, который сразу должен быть обработан
            receivedBonuses.forEach(async bonus => {
                await consumeBonus(bonus);
            });
        }

        const proceedBonusesOnAwarded = async () => {
            let receivedBonuses = [];
            try {
                // запросить, какие бонусы начислены игроку
                receivedBonuses = await ysdk.bonuses.getPlayerBonuses();
            } catch (e) {
                // не удалось получить список бонусов игрока
            }

            console.log('awarded bobuses', receivedBonuses);

            // основной кейс появления бонуса прямо в процессе игры - ввод одного промокода, который сразу должен быть обработан
            if (receivedBonuses.length > 0) {
                const bonus = receivedBonuses[0];
                await consumeBonus(bonus);
            }
        };

        const consumeBonus = async (bonus) => {
            try {
                await ysdk.bonuses.consume(bonus.token);
                const data = await consumeOnServer(bonus);

                console.log('data', data);

                if (data) {
                    if (data.user) {
                        app.EventDispatcher.emit('UPDATE_USER_DATA', data.user);
                    }
                    if (data.drop) {
                        showReward(data.drop)
                    }
                }
            } catch (e) {
                // не удалось консумировать бонус
            }
        };

        const consumeOnServer = async (bonus) => {
            const response = await fetch(
                'https://ya.keepers.mobi/yandex_bonus.jsp?key=54984',
                {
                    method: 'POST',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(
                        {
                            user: {
                                id: app.Model.user.id
                            },
                            bonus
                        }
                    )
                }
            )

            if (!response.ok) {
                app.Utils.showInfo('Ошибка начисления бонуса. Обратитесь в техподдержку игры')
                return;
            }

            return await response.json();
        };

        const showReward = (drops) => {
            const reward = {};
            drops.forEach(drop => {
                if (drop.energy) {
                    reward.energy = drop.energy;
                }
                if (drop.gold) {
                    reward.gold = drop.gold;
                }
                if (drop.gems) {
                    reward.gems = drop.gems;
                }
                if (drop.premium) {
                    reward.premium = drop.premium / app.TimeUtil.D_MS;
                }
            });

            app.Utils.createRewardPopup(reward, {
                header: 'Вам подарок!',
                text: 'Подарок от игры!',
                okButton: {
                    name: 'Забрать',
                    click() {
                        app.Utils.showInfo('Подарок получен!', {type: 0});
                    }
                }
            });
        };


        ysdk.on('BONUS_AWARDED', async () => {
            await proceedBonusesOnAwarded();
        });

        (async function() {
            await proceedOldBonuses()
        })();

    }
}, 3000);