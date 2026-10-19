app.Fotostrana = (function() {

    const APP_ID = "keepers";
    const APP_CLIENT_SECRET = "4f2d63d0d93d34df7c87ac3cbfa922cc";

    // 0 - nothing
    // 1 - start initialization
    // 2 - initialized
    var _state = 0;
    var _client;

    function init() {
        if (_state != 0) return;

        _state = 1;
        var el = document.createElement('script');
        el.type = 'text/javascript';
        el.onload = function() {
            _state = 2;
            create();
            app.EventDispatcher.dispatchEvent('Fotostrana initialized');
        };

        var params = app.Utils.getRequestParameters();
        el.src = params.fsapi;
        document.getElementsByTagName('head')[0].appendChild(el);
    }

    function create() {
        _client = new fsapi(APP_ID, APP_CLIENT_SECRET);
        _client.init(errorCallBack);
        console.log(_client);
    }

    function errorCallBack() {
        console.log('FS api error');
    }

    return {
        init: init,
        isAvailable: function() {
            return _state == 2;
        },
        client: function() {
            return _client;
        }
    }

})();