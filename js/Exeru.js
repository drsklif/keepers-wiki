app.Exeru = (function() {

    // 0 - nothing
    // 1 - start initialization
    // 2 - initialized
    var state = 0;
    var api;

    function init() {
        if (state != 0) return;

        state = 1;
        var el = document.createElement('script');
        el.type = 'text/javascript';
        el.onload = function() {
            state = 2;
            create();
            app.EventDispatcher.dispatchEvent('EXERU initialized');
        };
        el.src = '//exe.ru/assets/js/api.js';
        document.getElementsByTagName('head')[0].appendChild(el);
    }

    function create() {
        window.exe_ru_callback = callback;
        api = new ExeRuApi({
            'showInviteFriends': 'exe_ru_callback',
            'showRequestBox': 'exe_ru_callback',
            'showOrderBox': 'exe_ru_callback',
            'friends.getAppUsers': 'exe_ru_callback',
            'users.get': 'exe_ru_callback'
        });
    }

    function callback(method, params) {
        console.log('callback', method, params);
        switch (method) {
            case 'showInviteFriends': {
                if (params.response.length > 0) {
                    app.Utils.showInfo('Приглашение отправлено', {type: 0});
                }
                break;
            }
            case 'showOrderBox': {
                if (params.result === 'success') {
                    app.Utils.showInfo('Покупка успешна!', {type: 0});
                } else if (params.result === 'cancel') {
                } else if (params.result === 'fail') {
                    console.log(params);
                    app.Utils.showInfo('В процессе покупки произошла ошибка. Попробуйте позже');
                }
                break;
            }
            case 'showRequestBox': {
                if (params.response) {
                    app.Utils.showInfo('Напоминание отправлено', {type: 0});
                }
                break;
            }
            case 'friends.getAppUsers': {
                app.EventDispatcher.dispatchEvent('EXERU friends.getAppUsers', params);
                break;
            }
            case 'users.get': {
                app.EventDispatcher.dispatchEvent('EXERU users.get', params);
                break;
            }
        }
    }

    return {
        init: init,
        isAvailable: function() {
            return state == 2;
        },
        api: function() {
            return api;
        }
    }
})();