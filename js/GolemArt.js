// Арт и анимации голема: без сети и команд. hit — только после принятого сервером удара.
app.GolemArt = (function() {
    'use strict';

    const NAMES = {runic: 'Рунник', stone: 'Кременец'};
    const ASSET_BASE = '/images/golems/';
    const DEFEAT_MS = 360;

    // неизвестный или пустой вид — Рунник, как на сервере: исключение остановило бы цикл обновлений главной
    function kindOf(code) {
        return NAMES[code] ? code : 'runic';
    }

    function nameOf(code) {
        return NAMES[kindOf(code)];
    }

    function create(options) {
        const kind = kindOf(options.kind);
        const main = options.mode === 'main';
        const root = document.createElement('div');
        root.className = 'golem' + (main ? ' golem--main' : '');
        root.dataset.kind = kind;
        root.setAttribute('role', 'img');
        root.setAttribute('aria-label', NAMES[kind]);

        function layer(tag, cls) {
            const e = document.createElement(tag);
            e.className = 'golem__' + cls;
            root.appendChild(e);
            return e;
        }

        layer('div', 'aura');
        layer('div', 'shadow');
        const body = layer('img', 'body'), rubble = layer('img', 'rubble'), dust = layer('div', 'dust'),
            impact = layer('div', 'impact'), wave = layer('div', 'wave');
        body.alt = rubble.alt = '';
        body.draggable = rubble.draggable = false;
        body.src = app.IMAGES.getPath(ASSET_BASE + 'golem-' + kind + (main ? '-main' : '') + '.png');
        rubble.src = app.IMAGES.getPath(ASSET_BASE + 'golem-' + kind + '-dead.png');

        let dead = false, destroyed = false, animations = [], chips = [], generation = 0;

        function noMotion() {
            return !body.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }

        function cancelEffects() {
            generation++;
            animations.forEach(a => a.cancel());
            animations = [];
            chips.forEach(c => c.remove());
            chips = [];
        }

        function animate(el, frames, opts) {
            const a = el.animate(frames, opts);
            animations.push(a);
            return a;
        }

        function spawnChips(count) {
            for (let i = 0; i < count; i++) {
                const c = layer('i', 'chip');
                chips.push(c);
                c.style.left = (35 + Math.random() * 30) + '%';
                c.style.top = (55 + Math.random() * 15) + '%';
                animate(c, [
                    {transform: 'translate(0,0)', opacity: 1},
                    {transform: 'translate(' + ((Math.random() - .5) * 90) + 'px,55px) rotate(130deg)', opacity: 0}
                ], {duration: 400, easing: 'ease-in'}).onfinish = () => c.remove();
            }
        }

        function hit(critical) {
            if (dead || destroyed) return;
            cancelEffects();
            if (noMotion()) return;
            if (!critical) {
                animate(body, [{transform: 'translate(0,0)'}, {transform: 'translate(-2px,1px)', offset: .25}, {transform: 'translate(0,0)'}], {duration: 220, easing: 'ease-out'});
                spawnChips(3);
                return;
            }
            // крит: задержка в точке удара, сильная отдача и обратное покачивание
            animate(body, [
                {transform: 'translate(0,0) rotate(0)', filter: 'brightness(1)'},
                {transform: 'translate(-8px,4px) rotate(-4deg)', filter: 'brightness(1.65)', offset: .12},
                {transform: 'translate(-8px,4px) rotate(-4deg)', filter: 'brightness(1.25)', offset: .23},
                {transform: 'translate(4px,-1px) rotate(2deg)', filter: 'brightness(1)', offset: .5},
                {transform: 'translate(-2px,1px) rotate(-.8deg)', filter: 'brightness(1)', offset: .74},
                {transform: 'translate(0,0) rotate(0)', filter: 'brightness(1)'}
            ], {duration: 520, easing: 'ease-out'});
            animate(impact, [{opacity: 0, transform: 'scale(.45)'}, {opacity: 1, transform: 'scale(1)', offset: .18}, {opacity: 0, transform: 'scale(1.25)'}], {duration: 260, easing: 'ease-out'});
            animate(wave, [{opacity: .9, transform: 'scale(.25)'}, {opacity: .65, offset: .35}, {opacity: 0, transform: 'scale(1.45)'}], {duration: 480, easing: 'ease-out'});
            spawnChips(10);
            animate(dust, [{opacity: .8, transform: 'scale(.4)'}, {opacity: 0, transform: 'scale(1.9)'}], {duration: 520, easing: 'ease-out'});
        }

        // оседание длится DEFEAT_MS; без анимаций — сразу груда камней
        function defeat() {
            if (dead || destroyed) return;
            cancelEffects();
            dead = true;
            root.setAttribute('aria-label', NAMES[kind] + ' повержен');
            if (noMotion()) {
                root.classList.add('is-dead');
                return;
            }
            const token = generation;
            spawnChips(7);
            animate(body, [{opacity: 1, transform: 'translateY(0)'}, {opacity: 0, transform: 'translateY(14px)'}], {duration: 260, easing: 'ease-in', fill: 'forwards'});
            rubble.style.visibility = 'visible';
            const end = animate(rubble, [{opacity: 0}, {opacity: 0, offset: .3}, {opacity: 1}], {duration: DEFEAT_MS, fill: 'forwards'});
            animate(root.querySelector('.golem__aura'), [{opacity: .5}, {opacity: 0}], {duration: 240, fill: 'forwards'});
            end.onfinish = () => {
                if (destroyed || token !== generation) return;
                root.classList.add('is-dead');
                cancelEffects();
                rubble.style.visibility = '';
            };
        }

        function destroy() {
            if (destroyed) return;
            destroyed = true;
            cancelEffects();
            root.remove();
        }

        if (options.dead) {
            dead = true;
            root.classList.add('is-dead');
            root.setAttribute('aria-label', NAMES[kind] + ' повержен');
        }

        return {el: root, kind: kind, name: NAMES[kind], hit: hit, defeat: defeat, destroy: destroy};
    }

    return {
        DEFEAT_MS: DEFEAT_MS,
        kindOf: kindOf,
        nameOf: nameOf,
        create: create
    };
})();
