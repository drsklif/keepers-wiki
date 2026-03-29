app.Dice = (function() {

    var rise = {};
    var fall = {};

    function init() {
        let types = app.Model.cfg.dice.type;

        let step = 140;

        rise[types.F] = [];
        rise[types.N] = [];
        rise[types.W] = [];
        rise[types.HIT] = [];
        for (let i = 0; i < 12; i++) {
            rise[types.F].push({x: i * step, y: 0});
            rise[types.N].push({x: i * step, y: step});
            rise[types.W].push({x: i * step, y: 2 * step});
            rise[types.HIT].push({x: i * step, y: 3 * step});
        }

        fall[types.F] = [];
        fall[types.N] = [];
        fall[types.W] = [];
        fall[types.HIT] = [];

        fall[types.F].push({x: 0, y: 8 * step});
        fall[types.N].push({x: 0, y: 8 * step});
        fall[types.W].push({x: 0, y: 8 * step});
        fall[types.HIT].push({x: 0, y: 8 * step});

        for (let i = 0; i < 11; i++) {
            fall[types.F].push({x: i * step, y: 4 * step});
            fall[types.N].push({x: i * step, y: 5 * step});
            fall[types.W].push({x: i * step, y: 6 * step});
            fall[types.HIT].push({x: i * step, y: 7 * step});
        }

        fall[types.F].push(rise[types.F][0]);
        fall[types.N].push(rise[types.N][0]);
        fall[types.W].push(rise[types.W][0]);
        fall[types.HIT].push(rise[types.HIT][0]);
    }

    return {
        init: init,

        firstRiseFramePosition: function(el, dt) {
            el.style.backgroundPositionX = -rise[dt][0].x + 'px';
            el.style.backgroundPositionY = -rise[dt][0].y + 'px';
        },

        getRandomDT: function() {
            let rnd = app.Utils.randomInt(0, 3);
            return rnd === 0 ? app.Model.cfg.dice.type.HIT : rnd === 1 ? app.Model.cfg.dice.type.F : rnd === 2 ? app.Model.cfg.dice.type.N : app.Model.cfg.dice.type.W;
        },

        animate: function (el, fromDT, toDT, onComplete) {
            let _rise = rise[fromDT];
            let _fall = fall[toDT];

            let frame = 1;

            let loop = function() {
                let data;
                if (frame < _rise.length) {
                    data = _rise[frame];
                } else {
                    data = _fall[frame - _rise.length];
                }

                let x = data.x;
                let y = data.y;

                // console.log('frame = %i, x = %i, y = %i', frame, x, y);

                el.style.backgroundPositionX = -x + 'px';
                el.style.backgroundPositionY = -y + 'px';

                if (frame === _rise.length + _fall.length - 1) {
                    if (onComplete) onComplete();
                    return;
                }

                frame++;

                TweenMax.delayedCall(0.04, loop);
            };
            loop();
        }
    };
})();