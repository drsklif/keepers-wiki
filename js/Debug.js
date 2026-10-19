app.Debug = (function() {

    function create() {
        let p = app.Utils.createDIV({class: 'popup', style: 'width: 330px; height: 420px; top: 125px; z-index: 500000; margin-left: auto; margin-right: auto;left: 0;right: 0;'});

        p.appendChild(app.Utils.createA({class: 'close', style: 'right: -5px; top: -10px;'}, function() {
            document.body.removeChild(p);
            p = undefined;
        }));
        let el = app.Utils.createDIV({class: 'list_s', style: 'left:10px; top: 20px; width: 305px; height: 115px;'});
        let el1 = app.Utils.createDIV({class: 'pt10 pl15'});
        let w = app.Utils.createDIV({class: 'wrap', style: 'width: 295px; height: 105px;'});
        let w_s = app.Utils.createDIV({class: 'wrap_scroll', style: 'width: 295px'});
        w.appendChild(w_s);
        el1.appendChild(w);
        el.appendChild(el1);
        p.appendChild(el);
        document.body.appendChild(p);

        let update = function() {
            if (p) {
                app.Utils.removeAllChild(w_s);
                app.Utils.DEBUG.logs.forEach(function(log) {
                    w_s.appendChild(app.Utils.createSPAN({html: log + '<br>'}));
                });
                setTimeout(update, 1000);
            }
        };
        update();
    }

    return {
        create: create
    }
})();