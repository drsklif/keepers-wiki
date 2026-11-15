// Подсказка туториала поверх игры: затемнение с вырезом под цель, рамка, Белла и реплика
app.TutorialOverlay = (function () {

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const HOLE_CORNER_RADIUS = 14;
    const DEFAULT_PADDING = 6;
    const BUBBLE_MIN_TOP = 56; // под шапкой с ресурсами
    const BUBBLE_GAP = 14;
    // цель появляется с анимацией (флаг над локацией — через ~2,5 с); дольше не ждём — нажатия снова проходят
    const TARGET_WAIT_BLOCK_MS = 5000;

    let layer, hint, lastPlacementKey, shownAt;

    // hint: {target, allMatches, padding, circle, unshaded, blocking, bellaScene, text, button, link}
    //   target — селектор или функция → элемент или массив; allMatches — рамка у каждого найденного по селектору;
    //   unshaded — ещё области без затемнения, селектор или функция → элементы; blocking — без цели всё затемнено
    //   и не нажимается, кроме реплики; bellaScene — Белла крупно по центру, без цели
    function show(nextHint) {
        hide();
        hint = nextHint;
        shownAt = Date.now();
        layer = app.Utils.createDIV({class: 'tut_layer'});
        app.Utils.el('dark_popup').appendChild(layer);
        layer.appendChild(hint.bellaScene ? createBellaScene() : createBubble('tut_bubble_small', true));
        place();
    }

    function hide() {
        if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
        layer = hint = lastPlacementKey = undefined;
    }

    // зовётся каждый кадр; перерисовывает, только если сдвинулась цель или граница меню
    function place() {
        if (!layer) return;
        const layerBox = getLayerBox();
        layer.style.height = layerBox.h + 'px';
        const padding = hint.padding === undefined ? DEFAULT_PADDING : hint.padding;
        const targetRects = findTargets().map(el => toLayerRect(el, layerBox, padding)).filter(Boolean);
        const bottomLimit = getBubbleBottomLimit(layerBox);
        const waitingForTarget = !!hint.target && !targetRects.length;
        const blockWhileWaiting = waitingForTarget && Date.now() - shownAt < TARGET_WAIT_BLOCK_MS;
        const key = JSON.stringify(targetRects) + layerBox.h + ':' + bottomLimit + ':' + blockWhileWaiting;
        if (key === lastPlacementKey) return;
        lastPlacementKey = key;

        Array.prototype.forEach.call(layer.querySelectorAll('.tut_shade, .tut_focus'), el => el.remove());
        if (waitingForTarget) {
            layer.classList.remove('tut_ready');
            // слой ещё прозрачный: затемнение невидимо, но нажатия мимо будущей цели не проходят
            if (blockWhileWaiting) layer.insertBefore(createShade(layerBox, []), layer.firstChild);
            return;
        }
        if (targetRects.length) {
            const focusRects = hint.circle ? targetRects.map(toCircleBounds) : targetRects;
            const unshadedRects = findUnshadedRects(layerBox);
            layer.insertBefore(createShade(layerBox, getHoles(focusRects, unshadedRects)), layer.firstChild);
            focusRects.forEach(r => layer.appendChild(createFocus(r)));
            const targetRect = focusRects.reduce(unionRect);
            placeBubble(layerBox, bottomLimit, targetRect, unshadedRects.reduce(unionRect, targetRect));
        } else {
            if (hint.blocking) layer.insertBefore(createShade(layerBox, []), layer.firstChild);
            placeBubble(layerBox, bottomLimit, null, null);
        }
        layer.classList.add('tut_ready');
    }

    function findTargets() {
        if (!hint.target) return [];
        if (typeof hint.target === 'function') return [].concat(hint.target()).filter(Boolean);
        if (hint.allMatches) return Array.from(document.querySelectorAll(hint.target));
        return [document.querySelector(hint.target)].filter(Boolean);
    }

    // слой внутри #dark_popup и масштабирован вместе с игрой
    function getLayerBox() {
        const r = layer.getBoundingClientRect();
        return {left: r.left, top: r.top, scale: r.width / layer.offsetWidth || 1, w: layer.offsetWidth, h: app.LAYOUT.convert0(app.LAYOUT.h)};
    }

    // округление — чтобы ключ размещения не менялся от дробных остатков пересчёта поворота
    function toLayerRect(el, layerBox, padding) {
        const r = getUnrotatedRect(el);
        if (!r.width || !r.height) return null;
        const round = v => Math.round(v * 10) / 10;
        return {
            x: round((r.left - layerBox.left) / layerBox.scale - padding),
            y: round((r.top - layerBox.top) / layerBox.scale - padding),
            w: round(r.width / layerBox.scale + padding * 2),
            h: round(r.height / layerBox.scale + padding * 2)
        };
    }

    // рамка цели без её собственного поворота GSAP: сундук на карте трясётся (Campaign.shake, ±10° вокруг центра),
    // а рамка и облачко стоят на месте. Центр у повёрнутой рамки тот же, размер — из W = w·cos + h·sin, H = w·sin + h·cos
    function getUnrotatedRect(el) {
        const r = el.getBoundingClientRect();
        const rotation = el._gsTransform ? el._gsTransform.rotation : 0;
        if (!rotation) return r;
        const angle = rotation * Math.PI / 180;
        const cos = Math.abs(Math.cos(angle)), sin = Math.abs(Math.sin(angle)), d = cos * cos - sin * sin;
        if (d < 0.5) return r;
        const w = (r.width * cos - r.height * sin) / d, h = (r.height * cos - r.width * sin) / d;
        return {left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h};
    }

    function toCircleBounds(r) {
        const d = Math.max(r.w, r.h);
        return {x: r.x - (d - r.w) / 2, y: r.y - (d - r.h) / 2, w: d, h: d};
    }

    function unionRect(a, b) {
        const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
        return {x: x, y: y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y};
    }

    function findUnshadedRects(layerBox) {
        if (!hint.unshaded) return [];
        const elements = typeof hint.unshaded === 'function' ? [].concat(hint.unshaded()) : Array.from(document.querySelectorAll(hint.unshaded));
        return elements.filter(Boolean).map(el => toLayerRect(el, layerBox, 4)).filter(Boolean);
    }

    // затемнение рисуется по evenodd: пересечение двух вырезов снова затемнилось бы — пересекающиеся вырезы сливаются в один
    function getHoles(focusRects, unshadedRects) {
        const holes = focusRects.map(r => ({rect: r, circle: !!hint.circle}))
            .concat(unshadedRects.map(r => ({rect: r, circle: false})));
        for (let i = 0; i < holes.length; i++) {
            for (let j = i + 1; j < holes.length; j++) {
                if (!intersects(holes[i].rect, holes[j].rect)) continue;
                holes[i] = {rect: unionRect(holes[i].rect, holes[j].rect), circle: holes[i].circle && contains(holes[i].rect, holes[j].rect)};
                holes.splice(j, 1);
                j = i;
            }
        }
        return holes;
    }

    function intersects(a, b) {
        return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    }

    function contains(outer, inner) {
        return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
    }

    function createShade(layerBox, holes) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'tut_shade');
        svg.setAttribute('width', layerBox.w);
        svg.setAttribute('height', layerBox.h);
        const path = document.createElementNS(SVG_NS, 'path');
        let d = 'M0 0H' + layerBox.w + 'V' + layerBox.h + 'H0Z';
        holes.forEach(hole => d += getHolePath(hole.rect, hole.circle));
        path.setAttribute('d', d);
        svg.appendChild(path);
        return svg;
    }

    function getHolePath(r, circle) {
        if (circle) {
            const rad = r.w / 2, cx = r.x + rad, cy = r.y + r.h / 2;
            return 'M' + (cx - rad) + ' ' + cy + 'a' + rad + ' ' + rad + ' 0 1 0 ' + (2 * rad) + ' 0a' + rad + ' ' + rad + ' 0 1 0 ' + (-2 * rad) + ' 0Z';
        }
        const q = Math.min(HOLE_CORNER_RADIUS, r.w / 2, r.h / 2), x = r.x, y = r.y, w = r.w, h = r.h;
        return 'M' + (x + q) + ' ' + y + 'H' + (x + w - q) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + q) +
            'V' + (y + h - q) + 'Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w - q) + ' ' + (y + h) +
            'H' + (x + q) + 'Q' + x + ' ' + (y + h) + ' ' + x + ' ' + (y + h - q) +
            'V' + (y + q) + 'Q' + x + ' ' + y + ' ' + (x + q) + ' ' + y + 'Z';
    }

    function createFocus(r) {
        return app.Utils.createDIV({
            class: 'tut_focus' + (hint.circle ? ' tut_focus_circle' : ''),
            style: 'left: {0}px; top: {1}px; width: {2}px; height: {3}px'.format(r.x, r.y, r.w, r.h)
        });
    }

    function createBellaScene() {
        const stage = app.Utils.createDIV({class: 'tut_bella_stage'});
        stage.appendChild(app.Utils.createDIV({class: 'tut_bella'}));
        stage.appendChild(createBubble('tut_bubble_scene', false));
        const scene = app.Utils.createDIV({class: 'tut_bella_scene'});
        scene.appendChild(stage);
        return scene;
    }

    function createBubble(sizeClass, withFace) {
        const bubble = app.Utils.createDIV({class: 'tut_bubble ' + sizeClass});
        if (withFace) bubble.appendChild(app.Utils.createDIV({class: 'tut_face'}));
        bubble.appendChild(app.Utils.createSPAN({class: 'tut_speaker', text: 'Белла'}));
        hint.text.split('\n').forEach(line => bubble.appendChild(app.Utils.createEL('p', {html: line})));
        if (hint.button || hint.link) {
            const actions = app.Utils.createDIV({class: 'tut_actions'});
            if (hint.button) actions.appendChild(app.Utils.createA({class: 'btn_g', text: hint.button.text}, hint.button.onClick));
            if (hint.link) actions.appendChild(app.Utils.createA({class: 'tut_link', text: hint.link.text}, hint.link.onClick));
            bubble.appendChild(actions);
        }
        return bubble;
    }

    // под или над целью вместе с областями без затемнения, не помещается — под или над целью; без цели — по центру
    function placeBubble(layerBox, bottomLimit, targetRect, targetWithUnshadedRect) {
        const bubble = layer.querySelector('.tut_bubble_small');
        if (!bubble) return;
        const h = bubble.offsetHeight;
        const below = r => r.y + r.h + BUBBLE_GAP + h <= bottomLimit ? r.y + r.h + BUBBLE_GAP : null;
        const above = r => r.y - BUBBLE_GAP - h >= BUBBLE_MIN_TOP ? r.y - BUBBLE_GAP - h : null;
        let y;
        if (!targetRect) y = (layerBox.h - h) / 2;
        else y = [below(targetWithUnshadedRect), above(targetWithUnshadedRect), below(targetRect), above(targetRect)].find(v => v !== null);
        if (y === undefined) y = bottomLimit - h;
        bubble.style.top = Math.max(BUBBLE_MIN_TOP, Math.min(y, bottomLimit - h)) + 'px';
    }

    // верх меню и кнопок звука и настроек (они поверх подсказки), иначе низ экрана
    function getBubbleBottomLimit(layerBox) {
        const tops = [document.querySelector('.home-talisman-shell .dock')]
            .concat(Array.from(document.querySelectorAll('.home-talisman-shell.utility-layer .top_icon')))
            .map(el => el && el.getBoundingClientRect())
            .filter(r => r && r.height)
            .map(r => r.top);
        if (!tops.length) return layerBox.h - 16;
        return Math.min(layerBox.h, (Math.min.apply(null, tops) - layerBox.top) / layerBox.scale) - 8;
    }

    return {
        show: show,
        hide: hide,
        place: place
    };
})();
