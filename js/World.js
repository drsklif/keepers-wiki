app.World = (function() {
    return {
        createMain: function () {
            document.body.className = 'b{0}_1200'.format(app.LAYOUT.w);
            //document.body.removeAttribute('style');
            document.body.style = '';

            let el = app.Utils.createDIV({id: 'main0', class: 'main'});
            el.style.width = app.LAYOUT.w + 'px';
            if (app.LAYOUT.YANDEX) {
                el.style.zIndex = 0;
                el.style.position = 'relative';
            }
            let el1 = app.Utils.createDIV({id: 'main_brd', class: 'main_brd'});
            let el2 = app.Utils.createDIV({id: 'main', class: 'main_zoom'});
            el2.style.zIndex = 100;
            el2.style.width = app.LAYOUT.w + 'px';
            el1.appendChild(el2);
            el.appendChild(el1);
            document.body.appendChild(el);

            if (app.LAYOUT.scale < 1) {
                el2.style.transform = 'scale(' + app.LAYOUT.scale + ')';
            }
        },

        showConnectionLost: function (data) {
            if (app.Utils.el('connection_error')) return;

            let text;

            if (data && data.code !== undefined) {
                switch (data.code) {
                    case -1:
                        text = data.message;
                        break;
                    case 'OTHER_CLIENT_CONNECTED':
                        text = 'Игра была открыта в другом месте';
                        break;
                    case 'SERVER_RESTART':
                        text = 'Рестарт сервера';
                        break;
                    case 'CONNECTION_LOST':
                        text = 'Соединение потеряно!';
                        break;
                    case 'SERVER_ERROR':
                        text = 'Ошибка на стороне сервера игры. Сообщите в тех поддержку';
                        break;
                }
            }

            if (!text) text = 'Соединение потеряно!';

            let zIndex = 500000;
            let div0 = app.Utils.createDIV();
            div0.style.zIndex = zIndex;
            div0.style.width = app.LAYOUT.w + 'px';
            div0.style.position = 'absolute';
            if (app.LAYOUT.scale < 1) {
                div0.style.transform = 'scale(' + app.LAYOUT.scale + ')';
            }
            let div = app.Utils.createDIV({id: 'connection_error'});
            div.appendChild(app.Utils.createDIV({class: 'dark', style: 'top: 0px; opacity: 0.9'}));
            div.appendChild(app.Utils.createDIV({class: 'connecntion', style: 'margin-left: auto; margin-right: auto; left: 0px; right: 0px; top: 100px'}));
            div.appendChild(app.Utils.createDIV({class: 'str big cntr', style: 'position: absolute; margin-left: auto; margin-right: auto; left: 0px; right: 0px; top: 160px', html: text}));
            div.appendChild(app.Utils.createA({class: 'btn_g', style: 'margin-left: auto; margin-right: auto; left: 0px; right: 0px; top: 195px', text: 'Обновить'}, function () {
                location.reload(false);
            }));
            div0.appendChild(div);
            document.body.appendChild(div0);
        },

        loop: function () {
            if (app.GAME_STATE) {
                app.TimeUtil.update();
                app.Model.update();
                app.Game.update();
            }
            window.requestAnimationFrame(app.World.loop);
        }
    };
})();