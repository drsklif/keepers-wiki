app.EventDispatcher = (function() {

    let idx = 0;
    let listeners = {};

    function addEventListener(type, callback) {
        let list = listeners[type];
        if (!list) {
            list = listeners[type] = [];
        }
        idx++;
        list.push({idx: idx, callback: callback});
        return idx;
    }

    function dispatchEvent(type, data) {
        let list = listeners[type];
        if (list) {
            list.forEach(function(entry) {
                entry.callback.call(null, data);
            });
        }
    }

    function removeEventListener(type, idx) {
        if (idx) {
            let list = listeners[type];
            if (list) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].idx === idx) {
                        list.splice(i, 1);
                    }
                }
                if (list.length === 0) {
                    delete listeners[type];
                }
            }
        } else {
            delete listeners[type];
        }
    }

    return {
        on: addEventListener,
        addEventListener: addEventListener,

        emit: dispatchEvent,
        dispatchEvent: dispatchEvent,

        removeEventListener: removeEventListener
    }
})();