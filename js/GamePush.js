const PROJECT_ID = 20106;
const PUBLIC_TOKEN = "q9dgacocsWMia7tG2nS8xE2zh5AA69Ot"

const GamePush = {
    initSDK() {
        console.log('GamePush initSDK');

        const script = document.createElement('script');
        script.src = `https://gamepush.com/sdk/gamepush.js?projectId=${PROJECT_ID}&publicToken=${PUBLIC_TOKEN}&callback=onGPInit`;
        script.async = true;
        script.onload = this.onSDKLoad;

        const t = document.getElementsByTagName('script')[0];
        t.parentNode.insertBefore(script, t);
    },

    onSDKLoad() {
        console.log('GamePush onSDKLoad')

        window.onGPInit = async (gp) => {
            // Wait while the player syncs with the server
            await gp.player.ready;

            // Show the ad preloader and wait until it ends
            // await gp.ads.showPreloader();

            // Show the sticky banner (then it will update itself)
            // gp.ads.showSticky();

            app.GamePush._gp = gp

            app.EventDispatcher.emit('GamePush SDK initialized');

            let currentPlayerId = app.GamePush.getPlayer().id;
            console.log("currentPlayer", currentPlayerId);

            app.GamePush._gp.player.on("login", async (success) => {
                console.log("login", success);

                const newPlayerId = app.GamePush.getPlayer().id;
                console.log("newPlayer", newPlayerId);

                app.Network.command({cmd: 'GamePushAuthOrClone', cuid: currentPlayerId, tuid: newPlayerId}, data => {
                    if (data.error) {
                        app.Utils.showInfo('Что-то пошло не так. Обратитесь в техподдержку игры.');
                    } else {
                        app.Model.user = data.user;
                    }
                });

                currentPlayerId = newPlayerId;
            });

            app.GamePush._gp.player.on("logout", async (success) => {
                console.log("logout", success);

                let newPlayerId = 0;
                let attempts = 15;
                const waitNewPlayer = () => {
                    newPlayerId = app.GamePush.getPlayer().id;
                    if (newPlayerId !== 0) {
                        callback();
                        return;
                    }

                    attempts--;
                    if (attempts > 0) {
                        setTimeout(waitNewPlayer, 100);
                    }
                };
                waitNewPlayer();

                const callback = () => {
                    console.log("newPlayer", newPlayerId);
                    currentPlayerId = newPlayerId;

                    app.Network.command({cmd: 'Auth', partner: {t: 'GAMEPUSH', uID: newPlayerId}}, data => {
                        app.Model.user = data.user;
                    });
                };

                //
                // app.Network.command({cmd: 'GamePushLoggedOut', cuid: currentPlayerId, tuid: newPlayerId}, data => {
                //     if (data.error) {
                //         app.Utils.showInfo('Что-то пошло не так. Обратитесь в техподдержку игры.');
                //     } else {
                //         app.Model.user = data.user;
                //     }
                // });
                //
                // currentPlayerId = newPlayerId;
            });

            app.GamePush._gp.payments.on('purchase', ({ product, purchase }) => {
                console.log('purchase', product, purchase)
                app.GamePush._gp.payments.consume({tag: product.tag})
            });
            app.GamePush._gp.payments.on('error:purchase', (error) => {
                console.log('purchase', error)
            });

            app.GamePush._gp.payments.on('consume', ({ product, purchase }) => {
                console.log('consume', product, purchase)
            });

            app.GamePush._gp.payments.on('error:consume', (error) => {
                console.log('error:consume', error)
            });
        }
    },

    getPlayer() {
        return app.GamePush._gp.player
    },

    doPurchase(offer) {
        app.GamePush._gp.payments.purchase({tag: offer})
    }
};

app.GamePush = GamePush;