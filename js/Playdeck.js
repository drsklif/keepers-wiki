if (!app.Playdeck) {

    const { parent } = window;

    const handleReceiveMessage = (message) => {
        if (!message || !message.data || !message.data.playdeck) return;

        const playdeck = message.data.playdeck;
        console.log("[game 🎾 :]", playdeck.method, playdeck.value);

        if (playdeck.method === "isOpen") {
            window.playdeckIsOpen = playdeck.value;
        }

        if (playdeck.method === "getUserProfile") {
            window.playdeckUser = playdeck.value;
        }

        if (playdeck.method === "requestPayment") {
            app.Playdeck.openTelegramLink(playdeck.value);
        }
    }

    app.Playdeck = {
        init() {
            window.playdeck = 1;
            window.addEventListener("message", handleReceiveMessage);
            app.Playdeck.getUserProfile();
        },

        getUserProfile() {
            console.log('Playdeck::getUserProfile');
            parent.postMessage({ playdeck: { method: "getUserProfile" } }, "*")
        },

        setLoadingProgress: function (value) {
            parent.postMessage({ playdeck: { method: "loading", value: value } }, "*")
        },

        requestPayment(offer) {
            console.log('Playdeck::requestPayment', offer);
            app.Network.command({cmd: 'PlaydeckCreateInvoice', offer}, data => {
                offer = data.offer;

                let price;
                let description;
                if (offer.t.startsWith("gems_")) {
                    price = offer.price;
                    description = app.Utils.toMoney(offer.gems) + ' кристаллов';
                } else {
                    price = offer.p;
                    description = offer.n || app.SalePage && app.SalePage.getOfferName(offer) || "Акция";
                }

                console.log('Playdeck::PlaydeckCreateInvoice', offer, price, description, data.id);

                const req = {
                    playdeck: {
                        method: 'requestPayment',
                        value: {
                            'amount': price, // integer
                            'description': description,
                            'externalId': data.id, // Unique order identifier in your system, which you can use to check in postback that payment was successful
                            // 'photoUrl': 'optional field'
                        }
                    }
                };

                console.log('Playdeck::PlaydeckCreateInvoice', req);

                parent.postMessage(req, '*');
            });
        },

        openTelegramLink(url) {
            parent.postMessage(
                {
                    playdeck: {
                        method: 'openTelegramLink',
                        value: url,
                    },
                },
                '*'
            );
        }
    };
}