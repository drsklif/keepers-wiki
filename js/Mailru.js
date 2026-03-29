app.Mailru = (function() {

    let _initialized = 0;
    const GMRID = 3971;
    let externalApi;

    let landing;

    function init() {
        if (_initialized) return;
        _initialized = 1;
        // app.loadJS0('//games.mail.ru/app/' + GMRID + '/static/mailru.core.js', function() {
        app.loadJS0('//vkplay.ru/app/{0}/static/mailru.core.js'.format(GMRID), function() {
            console.log('MAILRU :: mailru.core loaded');
            onLoad(window.iframeApi);
        });
    }

    function onLoad(iframeApi) {
        if (typeof iframeApi === 'undefined') {
            console.log('Cannot find iframeApi function, are we inside an iframe?');
            return;
        }

        let callbacks = {
            appid: GMRID,
            getLoginStatusCallback: function(status) {
                console.log('MAILRU :: getLoginStatusCallback');
                console.log(status);
                if (status) {
                    switch (status.loginStatus) {
                        case 0:
                            externalApi.authUser();
                            break;
                        case 1:
                            externalApi.registerUser();
                            break;
                        case 2:
                            externalApi.userInfo();
                            break;
                    }
                }
            },
            userInfoCallback: function(info) {
                console.log('MAILRU :: userInfoCallback');
                console.log(info);
                app.EventDispatcher.dispatchEvent('MAILRU onLogin', {user: {uid: info.uid}});
            },
            userProfileCallback: function(profile) {
                console.log('userProfileCallback');
                console.log(profile);
            },
            registerUserCallback: function(info) {
                console.log('MAILRU :: registerUserCallback');
                console.log(info);
                app.EventDispatcher.dispatchEvent('MAILRU onLogin', {user: {uid: info.uid}});
            },
            paymentFrameUrlCallback: function(url) {
                console.log('MAILRU :: paymentFrameUrlCallback');
                console.log(url);
            },
            getAuthTokenCallback: function(token) {
                console.log('MAILRU :: getAuthTokenCallback');
                console.log(token);
            },
            paymentReceivedCallback: function(data) {
                console.log('MAILRU :: paymentReceivedCallback');
                console.log(data);
            },
            paymentWindowClosedCallback: function() {
                console.log('MAILRU :: paymentWindowClosedCallback');
            },
            userConfirmCallback: function() {
                console.log('MAILRU :: userConfirmCallback');
            }
        };

        function error(err) {
            throw new Error('Could not init external api ' + err);
        }

        function connected(api) {
            externalApi = api;
        }

        iframeApi(callbacks).then(connected, error);
    }

    function createLanding() {
        landing = {};

        landing.styles = app.CSS.addInlineStyles('.btn_landing {width: 360px; height: 190px; position: absolute; background: url(images/landing_btn.png) center -191px no-repeat; display: block; top: 200px; } .btn_landing:hover { background-position: center 0px;}');

        let wrap = landing.el = app.Utils.createDIV({class: 'wrap'});
        let wrap_s = app.Utils.createDIV({class: 'wrap_scroll'});

        let div = app.Utils.createDIV({class: 'main_bg'});
        div.style.height = '1200px';
        div.style.background = 'url(' + app.IMAGES.getPath('/images/landing_640_1200.jpg') + ')';

        let a = app.Utils.createA({class: 'btn_landing mlra_ab'}, () => {
            externalApi.getLoginStatus();
        });
        div.appendChild(a);
        wrap_s.appendChild(div);

        wrap.appendChild(wrap_s);
        app.Utils.el('main').appendChild(wrap);

        wrap.style.height = app.LAYOUT.convert0(app.LAYOUT.h) + 'px';
        let scroll = {el: wrap_s};
        scroll.topMax = app.LAYOUT.maxH - app.LAYOUT.convert0(app.LAYOUT.h);
        scroll.el.style.top = scroll.top + "px";
    }

    function removeLanding() {
        if (landing) {
            document.getElementsByTagName('head')[0].removeChild(landing.styles);
            app.Utils.el('main').removeChild(landing.el);
            landing = undefined;
        }
    }

    return {
        init: init,
        createLanding: createLanding,
        removeLanding: removeLanding,
        api: function() {
            return externalApi;
        }
    };
})();