if (!app.Presents) {

    // предел подписи на сервере: PresentsService.TEXT_MAX_LENGTH
    const TEXT_MAX_LENGTH = 60;

    const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    // размеры из макетов: 90px в профиле и карточке, 84px в каталоге
    const STYLES = ''
        + '.gift_fr{width:90px;height:90px;border-radius:13px;box-sizing:border-box;position:relative;overflow:visible;'
        + 'border:3px solid transparent;background:linear-gradient(#141010,#141010) padding-box,var(--fr) border-box;'
        + 'display:flex;align-items:center;justify-content:center;box-shadow:var(--glow,none),inset 0 0 10px rgba(0,0,0,.55);}'
        + '.gift_fr img{position:static;left:auto;top:auto;width:78px;height:78px;object-fit:contain;}'
        + '.gift_fr_s{width:84px;height:84px;border-radius:12px;}'
        + '.gift_fr_s img{width:72px;height:72px;}'
        + '.gift_fr_common{--fr:linear-gradient(150deg,#c2ac80,#6e5f43 50%,#3f352a);}'
        + '.gift_fr_vip{--fr:linear-gradient(150deg,#ffe9a8,#f0b93c 45%,#916219);--glow:0 0 12px rgba(240,185,60,.55);}'
        + '.gift_fr_lim{--fr:linear-gradient(135deg,#c86bff,#ff6bd0 45%,#ffcf6b);--glow:0 0 14px rgba(200,107,255,.6);}'
        + '.gift_ribbon{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);padding:1px 9px;border-radius:9px;'
        + 'font-size:10px;font-weight:bold;white-space:nowrap;line-height:1.4;letter-spacing:.3px;'
        + 'border:1px solid rgba(0,0,0,.45);box-shadow:0 2px 5px rgba(0,0,0,.55);z-index:4;}'
        + '.gift_fr_s .gift_ribbon{padding:1px 8px;font-size:9px;}'
        + '.gift_fr_hidden{opacity:.45;}'
        + '.gift_ribbon_hidden{background:linear-gradient(180deg,#8b8272,#5a5344);color:#1c1a15;}'
        + '.gift_ribbon_vip{background:linear-gradient(180deg,#ffe9a8,#e8a92c);color:#3a2600;}'
        + '.gift_ribbon_lim{background:linear-gradient(180deg,#e6a3ff,#b06bff);color:#260a38;text-shadow:0 1px 0 rgba(255,255,255,.25);}'

        // лента в профиле
        + '.gift_line{justify-content:flex-start;}'
        + '.gift_line .player_presents_line_container{transition:transform .22s ease;will-change:transform;}'
        // тень у края — только с той стороны, где ещё есть подарки
        + '.gift_line:before,.gift_line:after{content:\'\';position:absolute;top:0;bottom:0;width:48px;'
        + 'z-index:1;pointer-events:none;display:none;}'
        + '.gift_line:before{left:0;background:linear-gradient(to right,#010101 0%,rgba(1,1,1,0) 100%);}'
        + '.gift_line:after{right:0;background:linear-gradient(to left,#010101 0%,rgba(1,1,1,0) 100%);}'
        + '.gift_line_l:before,.gift_line_r:after{display:block;}'
        + '.gift_line .player_present{display:flex;align-items:center;justify-content:center;}'
        + '.gift_arr{z-index:5;}'

        // подпись отправителя под подарком
        + '.gift_sender{display:block;width:104px;margin-top:9px;font-size:11px;text-align:center;'
        + 'white-space:nowrap;overflow:hidden;text-decoration:none;line-height:1.2;}'
        + 'a.gift_sender{cursor:pointer;}'
        + '.gift_sender.fade{text-align:left;-webkit-mask-image:linear-gradient(90deg,#000 70%,transparent 100%);'
        + 'mask-image:linear-gradient(90deg,#000 70%,transparent 100%);}'
        + '.gift_sender_i{display:inline;width:auto;margin:0;}'

        // карточка подарка
        + '.gd_gift{display:flex;align-items:center;justify-content:center;height:150px;}'
        + '.gd_name{text-align:center;}'
        + '.gd_type{text-align:center;margin-top:4px;font-size:13px;}'
        + '.gd_card{margin:16px 20px 0;padding:10px 12px;}'
        + '.gd_from{overflow:hidden;}'
        + '.gd_from .date{float:right;color:#a99a80;}'
        + '.gd_msg{position:relative;margin:10px 0 0;padding:9px 12px 9px 22px;background:#120d08;'
        + 'border:1px solid #454033;border-radius:8px;color:#d8cba8;line-height:1.4;'
        + 'text-align:left;word-wrap:break-word;}'
        + '.gd_msg:before{content:\'\\201C\';position:absolute;left:6px;top:-4px;font-size:26px;color:#6e6047;}'
        + '.gd_mod{text-align:center;margin-top:16px;}'
        + '.gd_btn{display:inline-block;font-size:11px;font-weight:bold;padding:5px 14px;border-radius:12px;'
        + 'cursor:pointer;text-decoration:none;margin:0 6px;background:#33302a;border:1px solid #6a6250;color:#d8cdb2;}'
        + '.gd_btn:hover{color:#f0e6cc;}'
        + '.gd_btn_del{background:#4a2a2a;border-color:#8a3a3a;color:#eab0b0;}'
        + '.gd_btn_take{background:linear-gradient(#63b23c,#3d7a24);border-color:#2c5a18;'
        + 'color:#fff !important;text-shadow:0 1px 1px rgba(0,0,0,.5);}'
        + '.gd_btn.bw{opacity:.5;cursor:default;}'

        // сетка «все подарки»
        + '.gifts_all{position:absolute;left:26px;width:428px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px 4px;}'
        + '.ga_cell{display:flex;flex-direction:column;align-items:center;cursor:pointer;}'

        // каталог отправки
        + '.cat_grid{position:absolute;left:22px;top:92px;width:436px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px 4px;}'
        + '.cat_grid .hr_text{grid-column:1 / -1;margin:6px 0 -4px;}'
        + '.cat_div_note{grid-column:1 / -1;text-align:center;font-size:11px;color:#b06bff;margin:-8px 0 2px;}'
        + '.cat_cell{display:flex;flex-direction:column;align-items:center;cursor:pointer;}'
        + '.cat_price{margin-top:9px;font-size:13px;font-weight:bold;color:#fff;background:#1c1610;'
        + 'border:1px solid #5a4d34;border-radius:11px;padding:2px 9px;white-space:nowrap;}'
        + '.cat_price .res_icon{transform:scale(0.62);margin:-6px -8px -6px -2px;}'
        + '.cat_tgl{display:inline-block;font-size:12px;color:#a99a80;cursor:pointer;background:#1a140d;'
        + 'border:1px solid #4a3f2e;border-radius:14px;padding:5px 12px 5px 9px;margin:0 5px;}'
        + '.cat_tgl .dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:#5a5040;margin-right:6px;vertical-align:-1px;}'
        + '.cat_tgl.on{color:#efe6d4;border-color:#b06bff;}'
        + '.cat_tgl.on .dot{background:#b06bff;}'
        + '.cat_tgl.off{opacity:.45;cursor:default;}'
        + '.cat_prem{font-size:10px;color:#b06bff;margin-left:4px;}'
        + '.sel_gift{display:flex;align-items:center;justify-content:center;height:140px;}'
        + '.sel_name{text-align:center;}'
        + '.sel_type{text-align:center;margin-top:3px;font-size:12px;color:#7a6f58;}'
        + '.sel_type .t,.gd_type .t{color:#f0b93c;font-weight:bold;}'
        + '.sel_type .g,.gd_type .g{color:#7a6f58;}'
        + '.sel_type .lim,.gd_type .lim{color:#c86bff;font-weight:bold;}'
        + '.sel_msg{width:352px;box-sizing:border-box;display:block;margin:12px auto 0;resize:none;background:#120d08;'
        + 'border:1px solid #454033;border-radius:8px;color:#d8cba8;padding:8px 10px;font-family:inherit;font-size:12px;}'
        + '.sel_msg::placeholder{color:#6f6455;}'
        + '.sel_row{text-align:center;margin-top:10px;font-size:0;}'
        + '.sel_buy{position:relative !important;display:block;margin:14px auto 0;}'
        + '.sel_buy .res_icon{transform:scale(0.62);margin:-6px -6px -6px -4px;}';

    let stylesAdded = false;

    app.Presents = {

        // ============ команды сервера ============

        net: {
            // остаток тиража уменьшают чужие отправки, поэтому каталог читаем каждый раз:
            // кэш показывал бы «осталось N» уже после того, как позицию разобрали
            loadCatalog(onDone) {
                this.command({cmd: 'PresentCatalog'}, onDone);
            },

            loadList(uID, onDone, onFail) {
                this.command({cmd: 'PresentList', user: uID || 0}, onDone, onFail);
            },

            sendGift(uID, itemId, mode, text, onDone, onFail) {
                this.command({cmd: 'PresentSend', user: uID, item: itemId, mode: mode, text: text || ''}, onDone, onFail);
            },

            take(id, onDone, onFail) {
                this.command({cmd: 'PresentTake', id: id}, onDone, onFail);
            },

            setHidden(id, hidden, onDone, onFail) {
                this.command({cmd: 'PresentHide', id: id, hidden: hidden ? 1 : 0}, onDone, onFail);
            },

            removeGift(id, onDone, onFail) {
                this.command({cmd: 'PresentRemove', id: id}, onDone, onFail);
            },

            // тост общий для всех экранов модуля, поэтому живёт здесь
            command(data, onDone, onFail) {
                const net = this;
                app.Network.command(data, function (res) {
                    if (res.error) {
                        app.Utils.processErrors(res.error);
                        if (onFail) onFail(res.error);
                    } else if (onDone) {
                        onDone(res);
                    }
                });
            }
        },

        // ============ общий рендер ============

        view: {
            /** Тип подарка: премиум важнее тиража. Единственное место, где это решается. */
            type(gift) {
                if (gift.prem) return 'vip';
                return gift.sn || gift.tot ? 'lim' : null;
            },

            /** Позиция каталога глазами карточки: у неё остаток вместо номера. */
            fromItem(item) {
                return {img: item.img, prem: item.prem, tot: item.tot, left: item.left};
            },

            /** Карточка подарка: рамка по типу, ленточка, картинка. */
            createCard(gift, small) {
                const type = this.type(gift);
                const frame = type ? 'gift_fr_' + type : 'gift_fr_common';
                const card = app.Utils.createDIV({class: 'gift_fr ' + frame + (small ? ' gift_fr_s' : '') + (gift.h ? ' gift_fr_hidden' : '')});

                if (gift.img) card.appendChild(app.Utils.createIMG(gift.img));

                const ribbon = this.ribbon(gift);
                if (ribbon) card.appendChild(app.Utils.createSPAN({class: 'gift_ribbon ' + ribbon.cls, text: ribbon.text}));

                return card;
            },

            /**
             * Пометка на карточке. Удалённый и скрытый важнее всего — это состояние подарка;
             * номер экземпляра важнее VIP, про который уже говорит золотая рамка.
             */
            ribbon(gift) {
                if (gift.removed) return {cls: 'gift_ribbon_hidden', text: 'удалён'};
                if (gift.h) return {cls: 'gift_ribbon_hidden', text: 'скрыт'};
                if (gift.sn) return {cls: 'gift_ribbon_lim', text: gift.tot ? '{0} из {1}'.format(gift.sn, gift.tot) : '№' + gift.sn};
                if (gift.left !== undefined) return {cls: 'gift_ribbon_lim', text: 'осталось {0}'.format(gift.left)};
                if (gift.prem) return {cls: 'gift_ribbon_vip', text: 'VIP'};
                return null;
            },

            /**
             * Строка «Тип · Группа»: тип берётся от подарка (VIP либо лимитный),
             * во вкладке VIP название группы не дублирует метку.
             */
            createType(className, gift, groupName) {
                const el = app.Utils.createDIV({class: className});
                const type = this.type(gift);
                const label = type === 'vip' ? {cls: 't', text: 'VIP'}
                        : type === 'lim' ? {cls: 'lim', text: gift.left !== undefined ? 'Лимитированный, осталось ' + gift.left : 'Лимитированный'}
                        : null;

                if (label) el.appendChild(app.Utils.createSPAN({class: label.cls, text: label.text}));
                if (groupName && !(type === 'vip' && groupName === 'VIP')) {
                    el.appendChild(app.Utils.createSPAN({class: 'g', text: label ? ' · {0}'.format(groupName) : groupName}));
                }
                return el;
            },

            /** Ценник как в макете: сначала число, следом значок кристалла. */
            appendGems(el, value) {
                el.appendChild(app.Utils.createText(app.Utils.toMoney(value)));
                el.appendChild(app.Utils.createSPAN({class: 'res_icon res_icon_inline res_gem'}));
            },

            /** Кто подарил: отправитель виден там же, где виден сам подарок, поэтому всегда ссылка. */
            createSender(gift, inline) {
                const base = 'gift_sender' + (inline ? ' gift_sender_i' : '');

                return app.Utils.createA({class: base + ' major str tdn', text: app.UserUtil.getUserNameUpper0(gift.from.n)}, function () {
                    app.EventDispatcher.emit('user info', gift.from.id);
                });
            },

            /** Не поместившийся ник уводим в маску вместо троеточия. */
            fadeIfTooLong(el) {
                if (el.scrollWidth > el.clientWidth + 1) app.Utils.addClass(el, 'fade');
            }
        },

        /**
         * Лента подарков для профиля: заголовок, счётчик, стрелки, промотка свайпом.
         * Возвращает элементы и занимаемую высоту; null — показывать нечего, блока в профиле нет.
         */
        createProfileLine(presents, user, top) {
            const Utils = app.Utils;
            const els = [];
            const list = presents.list || [];
            let total = presents.c + (presents.hc || 0);

            // пустой блок с «Получено 0» смысла не несёт: подарить можно кнопкой выше
            if (total === 0) return null;

            app.Presents.addStyles();

            els.push(Utils.createDIV({class: 'major str', style: 'position: absolute; left: 35px; top: {0}px'.format(top),
                text: 'Подарки'}));

            const counter = Utils.createA({class: 'info tdu', style: 'position: absolute; right: 35px; top: {0}px'.format(top + 2),
                text: 'Получено {0}'.format(total)}, function () {
                app.Presents.showAll(user, presents.rp);
            });
            els.push(counter);

            // лента живёт по своему списку: скрытые в него не попадают, а в счётчике владельца есть
            if (list.length === 0) return {els: els, height: 40};

            const line = Utils.createDIV({class: 'player_presents_line gift_line',
                style: 'position: absolute; top: {0}px; left: 58px; width: 364px'.format(top + 27)});
            const strip = Utils.createDIV({class: 'player_presents_line_container',
                style: 'width: 100%; justify-content: center'});
            line.appendChild(strip);

            list.forEach(function (gift) {
                const cell = Utils.createDIV({class: 'player_present', style: 'cursor: pointer'});
                const drawCard = function () {
                    Utils.removeAllChild(cell);
                    cell.appendChild(app.Presents.view.createCard(gift));
                };
                drawCard();

                cell.onclick = function () {
                    app.Presents.showDetail(gift, user.id, {
                        onRemoved() {
                            strip.removeChild(cell);
                            counter.innerText = 'Получено {0}'.format(--total);

                            // подарков стало меньше: пересобираем центровку и стрелки.
                            // блок остаётся с «Получено 0»: профиль уже отмерил под него место
                            relayout();
                        },
                        onHiddenChanged: drawCard
                    });
                };
                strip.appendChild(cell);
            });

            // стрелки прячем до замера: иначе они успевают мигнуть там, где листать нечего
            const left = Utils.createDIV({class: 'slots_arr gift_arr',
                style: 'position: absolute; left: 26px; top: {0}px; transform: scale(0.8); transform-origin: center; display: none'.format(top + 55)});
            const right = Utils.createDIV({class: 'slots_arr slots_arr_r gift_arr',
                style: 'position: absolute; left: 425px; top: {0}px; transform: scale(-0.8, 0.8); transform-origin: center; display: none'.format(top + 55)});

            els.push(left, line, right);
            const relayout = this._enableScroll(line, strip, left, right);

            return {els: els, height: 145};
        },

        /**
         * Промотка ленты: стрелки и перетаскивание.
         * Возвращает пересчёт раскладки — его зовут, когда подарков стало меньше.
         */
        _enableScroll(line, strip, left, right) {
            const STEP = 222;
            let offset = 0;
            let scrollMax = 0;
            let dragged = false;

            /**
             * Пересчёт после изменения состава: помещается всё — ставим по центру,
             * не помещается — прижимаем влево и включаем промотку.
             */
            const layout = function () {
                // ширину содержимого меряем в нейтральном состоянии: центрирование её обрезает
                strip.style.width = '';
                strip.style.justifyContent = 'flex-start';
                scrollMax = Math.max(0, strip.scrollWidth - line.clientWidth);

                if (scrollMax === 0) {
                    strip.style.width = '100%';
                    strip.style.justifyContent = 'center';
                    offset = 0;
                }
                apply(false);
            };

            const apply = function (animate) {
                strip.style.transition = animate ? 'transform .22s ease' : 'none';
                strip.style.transform = 'translateX(' + (-offset) + 'px)';

                // упёрлись в край — с этой стороны листать нечего: ни стрелки, ни тени
                const more = {l: offset > 0.5, r: offset < scrollMax - 0.5};
                left.style.display = more.l ? '' : 'none';
                right.style.display = more.r ? '' : 'none';
                app.Utils[more.l ? 'addClass' : 'removeClass'](line, 'gift_line_l');
                app.Utils[more.r ? 'addClass' : 'removeClass'](line, 'gift_line_r');
            };

            const scrollTo = function (value, animate) {
                offset = Math.min(scrollMax, Math.max(0, value));
                apply(animate);
            };

            left.onclick = () => scrollTo(offset - STEP, true);
            right.onclick = () => scrollTo(offset + STEP, true);

            // слушатели живут только на время перетаскивания, иначе копятся при каждом открытии профиля
            const startDrag = function (startX, moveEvent, endEvent, getX) {
                const startOffset = offset;
                const onMove = function (e) {
                    if (Math.abs(getX(e) - startX) > 4) dragged = true;
                    scrollTo(startOffset - (getX(e) - startX), false);
                };
                const onEnd = function () {
                    document.removeEventListener(moveEvent, onMove);
                    document.removeEventListener(endEvent, onEnd);
                    apply(true);
                };
                document.addEventListener(moveEvent, onMove, {passive: true});
                document.addEventListener(endEvent, onEnd);
            };

            line.addEventListener('mousedown', function (e) {
                e.preventDefault();
                dragged = false;
                startDrag(e.clientX, 'mousemove', 'mouseup', e => e.clientX);
            });
            line.addEventListener('touchstart', function (e) {
                dragged = false;
                startDrag(e.touches[0].clientX, 'touchmove', 'touchend', e => e.touches[0].clientX);
            }, {passive: true});

            // промотка заканчивается кликом по подарку — гасим его до того, как он дойдёт до ячейки
            line.addEventListener('click', function (e) {
                if (!dragged) return;
                dragged = false;
                e.stopPropagation();
                e.preventDefault();
            }, true);

            requestAnimationFrame(layout);
            return layout;
        },

        // ============ каталог отправки ============

        /** Каталог: вкладки-группы, подгруппы отбивками, выбор подарка. */
        showCatalog(user) {
            this.addStyles();

            const Utils = app.Utils;
            const p = app.Popups.createPopup1({id: 'PRESENT_CATALOG', display: {gems: 1}, onClose() { p.tmp._closed = 1; }});
            p.tmp = {};

            p.els.brd_r.appendChild(app.Popups.createHelp('Presents'));

            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
            const availableHeight = Math.min(560, availableHeight0);
            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = Math.max(80, (availableHeight0 - availableHeight) / 2) + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';
            p.els.wrap.style.width = '480px';
            // отступ сверху как в макетах: шапка не липнет к рамке
            p.els.wrap.style.top = '15px';
            p.els.wrap.style.height = availableHeight - 20 + 'px';
            p.els.wrap_s.style.width = availableHeight - 20 + 'px';
            p.scroll.availableHeight = availableHeight - 20;
            p.scroll.top = 0;
            p.scroll.el.style.top = '0px';

            app.Popups.add(p);

            this.refreshCatalog(p, user);

            return p;
        },

        /** Каталог перечитываем целиком: у позиции мог кончиться тираж, пока экран был открыт. */
        refreshCatalog(p, user) {
            if (p.tmp._closed) return;

            this.net.loadCatalog(function (catalog) {
                if (p.tmp._closed) return;

                // вкладки живут вне области прокрутки, их снимаем отдельно
                (p.tmp.tabEls || []).forEach(el => el.parentNode.removeChild(el));
                app.Utils.removeAllChild(p.scroll.el);

                app.Presents.renderCatalog(p, user, catalog);
            });
        },

        /** Вкладки каталога и сетка выбранной вкладки. */
        renderCatalog(p, user, catalog) {
            const Utils = app.Utils;
            const tabs = catalog.tabs || [];

            const avatar = Utils.createAvatarComponent(user.rank, user.avatar.img);
            avatar.els.main.style = 'left: 35px; top: 0px';
            p.scroll.el.appendChild(avatar.els.main);
            p.scroll.el.appendChild(Utils.createDIV({class: 'major str big', style: 'position: absolute; left: 110px; top: 6px',
                text: app.UserUtil.getUserNameUpper0(user.name)}));
            p.scroll.el.appendChild(Utils.createDIV({class: 'char_info', style: 'left: 110px; top: 34px; color: #a99a80',
                text: 'Отправка подарка'}));
            p.scroll.el.appendChild(Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 72px'}));

            if (tabs.length === 0) {
                p.scroll.el.appendChild(Utils.createDIV({class: 'info cntr', style: 'position: absolute; width: 480px; top: 100px', text: 'Каталог пуст'}));
                return;
            }

            const grid = Utils.createDIV({class: 'cat_grid'});
            const tabEls = [];

            const openTab = function (index) {
                tabEls.forEach((el, i) => Utils.removeClass(el, 'brd_block_tab_active'));
                Utils.addClass(tabEls[index], 'brd_block_tab_active');
                app.Presents.fillCatalogGrid(p, user, catalog, tabs[index], grid);
            };

            tabs.forEach(function (tab, i) {
                const el = Utils.createA({class: 'brd_block_tab', style: 'left: {0}px'.format(30 + i * 104), text: tab.n},
                    openTab.bind(null, i));
                tabEls.push(el);
                p.els.brd_r.appendChild(el);
            });

            p.tmp.tabEls = tabEls;
            p.scroll.el.appendChild(grid);
            openTab(0);
        },

        /** Позиции вкладки: сначала свои, затем подгруппы с отбивками. */
        fillCatalogGrid(p, user, catalog, tab, grid) {
            const Utils = app.Utils;
            const myPremium = app.UserUtil.isPremiumActive();

            Utils.removeAllChild(grid);

            const addItems = function (parentId, groupName) {
                catalog.items.filter(item => item.par === parentId).forEach(function (item) {
                    const cell = Utils.createDIV({class: 'cat_cell'}, function () {
                        app.Presents.showSendPopup(p, user, item, groupName, myPremium);
                    });
                    cell.appendChild(app.Presents.view.createCard(app.Presents.view.fromItem(item), true));

                    const price = Utils.createDIV({class: 'cat_price'});
                    app.Presents.view.appendGems(price, item.price);
                    cell.appendChild(price);
                    grid.appendChild(cell);
                });
            };

            addItems(tab.id, tab.n);
            (tab.subgroups || []).forEach(function (subgroup) {
                grid.appendChild(Utils.createDIV({class: 'hr_text', html: '<span>{0}</span>'.format(subgroup.n)}));

                const until = app.Presents.seasonEnd(subgroup.to);
                if (until) grid.appendChild(Utils.createDIV({class: 'cat_div_note', text: 'только до {0}'.format(until)}));

                addItems(subgroup.id, subgroup.n);
            });

            if (!grid.firstChild) {
                grid.appendChild(Utils.createDIV({class: 'info cntr', style: 'grid-column: 1 / -1', text: 'Здесь пока пусто'}));
            }

            TweenMax.delayedCall(0.001, function () {
                const required = grid.offsetTop + grid.offsetHeight + 40;
                p.scroll.top = 0;
                p.scroll.el.style.top = '0px';
                p.scroll.topMax = Math.max(0, required - p.scroll.availableHeight);
            });
        },

        /** Выбор режима и подписи, отправка. Раскладка потоком, как в макете. */
        showSendPopup(catalogPopup, user, item, groupName, myPremium) {
            const Utils = app.Utils;
            const p = app.Popups.createPopup({});
            let mode = 'NORMAL';

            p.els.popup.style = 'width: 400px; height: auto; padding-bottom: 16px; left: 40px; top: 100px';
            p.els.popup.appendChild(Utils.createDIV({class: 'header', style: 'left: 75px; top: -30px', text: 'Подарок'}));

            const giftBox = Utils.createDIV({class: 'sel_gift'});
            const card = this.view.createCard(this.view.fromItem(item));
            card.style.cssText += ';transform: scale(1.25); transform-origin: center';
            giftBox.appendChild(card);
            p.els.popup.appendChild(giftBox);

            p.els.popup.appendChild(Utils.createDIV({class: 'sel_name major str big', text: item.n}));

            // «VIP · Группа»; в самой VIP-группе метка не дублируется
            p.els.popup.appendChild(this.view.createType('sel_type', this.view.fromItem(item), groupName));

            const text = Utils.createEL('textarea', {class: 'sel_msg', rows: 2});
            text.maxLength = TEXT_MAX_LENGTH;
            text.placeholder = 'Добавить подпись к подарку… (до {0} символов)'.format(TEXT_MAX_LENGTH);
            p.els.popup.appendChild(text);

            const row = Utils.createDIV({class: 'sel_row'});
            const priv = this._createToggle('Приватно', !myPremium);

            priv.onclick = myPremium
                ? function () {
                    mode = mode === 'PRIVATE' ? 'NORMAL' : 'PRIVATE';
                    Utils[mode === 'PRIVATE' ? 'addClass' : 'removeClass'](priv, 'on');
                }
                : () => Utils.showInfo('Приватные подарки — по премиуму');

            row.appendChild(priv);
            p.els.popup.appendChild(row);

            const send = Utils.createA({class: 'btn_g btn_c sel_buy', text: 'Подарить за {0}'.format(Utils.toMoney(item.price))}, function () {
                if (Utils.hasClass(send, 'bw')) return;
                Utils.addClass(send, 'bw');

                app.Presents.net.sendGift(user.id, item.id, mode, text.value, function () {
                    app.Popups.removePopup(p);
                    app.Popups.removePopup(catalogPopup);
                    Utils.showInfo('Подарок отправлен', {type: 0});
                }, function (error) {
                    Utils.removeClass(send, 'bw');

                    // позиции больше нет: показываем актуальный каталог, а не устаревший остаток
                    if (error.code === 16001 || error.code === 16002) {
                        app.Popups.removePopup(p);
                        app.Presents.refreshCatalog(catalogPopup, user);
                    }
                });
            });
            send.appendChild(Utils.createSPAN({class: 'res_icon res_icon_inline res_gem'}));
            p.els.popup.appendChild(send);

            app.Popups.add(p);
            return p;
        },

        _createToggle(label, disabled) {
            const el = app.Utils.createSPAN({class: 'cat_tgl' + (disabled ? ' off' : '')});
            el.appendChild(app.Utils.createSPAN({class: 'dot'}));
            el.appendChild(app.Utils.createText(label));
            if (disabled) el.appendChild(app.Utils.createSPAN({class: 'cat_prem', text: '🔷 премиум'}));
            return el;
        },

        // ============ все подарки игрока ============

        /** Страница со всеми подарками: сетка по четыре в ряд и сортировка. */
        showAll(user, receives) {
            this.addStyles();

            const Utils = app.Utils;
            const p = app.Popups.createPopup1({id: 'PRESENTS', onClose() { p.tmp._closed = 1; }});
            p.tmp = {};

            p.els.brd_r.appendChild(Utils.createA({class: 'brd_block_tab brd_block_tab_active', style: 'left: 30px', text: 'Подарки'}));
            p.els.brd_r.appendChild(app.Popups.createHelp('Presents'));

            const availableHeight0 = app.LAYOUT.getClientWHS0(80 + app.Menu.getReservedHeight());
            const availableHeight = Math.min(560, availableHeight0);
            p.els.brd.style.opacity = 1;
            p.els.brd.style.top = Math.max(80, (availableHeight0 - availableHeight) / 2) + 'px';
            p.els.brd_r.style.height = availableHeight + 'px';
            p.els.wrap.style.width = '480px';
            // отступ сверху как в макетах: шапка не липнет к рамке
            p.els.wrap.style.top = '15px';
            p.els.wrap.style.height = availableHeight - 20 + 'px';
            p.els.wrap_s.style.width = availableHeight - 20 + 'px';
            p.scroll.availableHeight = availableHeight - 20;
            p.scroll.top = 0;
            p.scroll.el.style.top = '0px';

            app.Popups.add(p);

            this.net.loadList(user.id, function (data) {
                if (p.tmp._closed) return;
                app.Presents.renderAll(p, data, user, receives);
            });

            return p;
        },

        /** Сетка подарков с переключателем сортировки. Раскладка по макету gifts_all. */
        renderAll(p, data, user, receives) {
            const Utils = app.Utils;
            const list = data.list;
            const owner = user.id === app.Model.user.id;
            let total = data.c + (data.hc || 0);

            const avatar = Utils.createAvatarComponent(user.rank, user.avatar.img);
            avatar.els.main.style = 'left: 35px; top: 0px';
            p.scroll.el.appendChild(avatar.els.main);
            p.scroll.el.appendChild(Utils.createDIV({class: 'major str big', style: 'position: absolute; left: 110px; top: 0px',
                text: 'Подарки игрока'}));
            p.scroll.el.appendChild(Utils.createDIV({class: 'char_info', style: 'left: 110px; top: 26px',
                html: '<span class="info str">{0}</span>'.format(app.UserUtil.getUserNameUpper0(user.name))}));
            const counter = Utils.createDIV({class: 'char_info', style: 'left: 110px; top: 46px; color: #a99a80',
                text: 'Получено {0}'.format(total)});
            p.scroll.el.appendChild(counter);
            p.scroll.el.appendChild(Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 72px'}));

            // кнопка дарения занимает свою строку: без неё сетка поднимается к шапке
            const canGift = !owner && receives;
            if (canGift) {
                p.scroll.el.appendChild(Utils.createA({class: 'btn_g btn_c', style: 'left: 160px; top: 82px', text: 'Отправить подарок'}, function () {
                    app.Presents.showCatalog(user);
                }));
            }

            if (list.length === 0) {
                p.scroll.el.appendChild(Utils.createDIV({class: 'info cntr', style: 'position: absolute; width: 480px; top: 140px', text: 'Подарков пока нет'}));
                return;
            }

            const grid = Utils.createDIV({class: 'gifts_all', style: 'top: ' + (canGift ? 144 : 96) + 'px'});

            const fill = function () {
                Utils.removeAllChild(grid);
                // свежие сверху: другого порядка игрок не просил
                list.slice().sort((a, b) => b.tt - a.tt).forEach(function (gift) {
                    const cell = Utils.createDIV({class: 'ga_cell'}, function () {
                        app.Presents.showDetail(gift, user.id, {
                            onRemoved() {
                                list.splice(list.indexOf(gift), 1);
                                counter.innerText = 'Получено {0}'.format(--total);
                                fill();
                            }
                        });
                    });
                    cell.appendChild(app.Presents.view.createCard(gift));

                    const sender = app.Presents.view.createSender(gift);
                    cell.appendChild(sender);
                    grid.appendChild(cell);
                    app.Presents.view.fadeIfTooLong(sender);
                });

                p.scroll.topMax = Math.max(0, grid.offsetTop + grid.offsetHeight + 40 - p.scroll.availableHeight);
            };

            if (canGift) {
                p.scroll.el.appendChild(Utils.createDIV({class: 'hr', style: 'position: absolute; width: 480px; top: 128px'}));
            }
            p.scroll.el.appendChild(grid);
            fill();
        },

        // ============ карточка подарка ============

        /** Карточка полученного подарка. Владельцу — скрыть и удалить. */
        showDetail(gift, ownerId, callbacks) {
            this.addStyles();

            const Utils = app.Utils;
            const p = app.Popups.createPopup({});

            p.els.popup.style = 'width: 400px; height: auto; padding-bottom: 16px; left: 40px; top: 120px';
            p.els.popup.appendChild(Utils.createDIV({class: 'header', style: 'left: 75px; top: -30px', text: 'Подарок'}));

            const giftBox = Utils.createDIV({class: 'gd_gift'});
            const drawCard = function () {
                Utils.removeAllChild(giftBox);
                const card = app.Presents.view.createCard(gift);
                card.style.cssText += ';transform: scale(1.4); transform-origin: center';
                giftBox.appendChild(card);
            };
            drawCard();
            p.els.popup.appendChild(giftBox);

            p.els.popup.appendChild(Utils.createDIV({class: 'gd_name major str big', text: gift.n || 'Подарок'}));

            const type = this.view.createType('gd_type', gift, gift.gn);
            // приватный — премиум-режим: видно и владельцу, и дарителю
            if (gift.m === 'PRIVATE') {
                type.appendChild(Utils.createSPAN({class: 'g',
                    text: type.firstChild ? ' · приватный' : 'приватный'}));
            }
            if (type.firstChild) p.els.popup.appendChild(type);

            const info = Utils.createDIV({class: 'list_s gd_card'});
            const from = Utils.createDIV({class: 'gd_from'});
            from.appendChild(Utils.createSPAN({class: 'str', text: 'От: '}));
            from.appendChild(this.view.createSender(gift, true));
            // у ещё не забранного времени получения нет, и выдумывать его нечем
            if (gift.tt) {
                const ago = app.TimeUtil.now() - gift.tt;
                from.appendChild(Utils.createSPAN({class: 'date',
                    text: ago < app.TimeUtil.M_MS ? 'только что' : app.TimeUtil.formatToHumanTime(ago, 1) + ' назад'}));
            }
            info.appendChild(from);

            // подпись приходит экранированной (BBCodesUtil.fix), поэтому html, а не text
            if (gift.txt) info.appendChild(Utils.createDIV({class: 'gd_msg', html: gift.txt}));
            p.els.popup.appendChild(info);

            if (ownerId === app.Model.user.id) {
                const row = Utils.createDIV({class: 'gd_mod'});
                this._fillActions(row, p, gift, drawCard, callbacks || {});
                p.els.popup.appendChild(row);
            }

            app.Popups.add(p);
            return p;
        },

        /**
         * Кнопки зависят от состояния подарка: не забран — «Забрать», забран — скрыть и удалить,
         * удалён — ничего, карточка остаётся только посмотреть.
         */
        _fillActions(row, p, gift, drawCard, callbacks) {
            const Utils = app.Utils;
            Utils.removeAllChild(row);

            if (gift.removed) return;

            if (!gift.tt) {
                let take;
                row.appendChild(take = Utils.createA({class: 'gd_btn gd_btn_take', text: 'Забрать'}, function () {
                    if (Utils.hasClass(take, 'bw')) return;
                    Utils.addClass(take, 'bw');

                    app.Presents.net.take(gift.id, function (res) {
                        gift.tt = res.tt;
                        // подарок в профиле — карточка становится обычной, с модерацией
                        app.Presents._fillActions(row, p, gift, drawCard, callbacks);
                        if (callbacks.onTaken) callbacks.onTaken(gift.tt);
                        Utils.showInfo('Подарок получен', {type: 0});
                    }, function () {
                        Utils.removeClass(take, 'bw');
                    });
                }));
                return;
            }

            const hide = Utils.createA({class: 'gd_btn', text: gift.h ? 'Показать' : 'Скрыть'}, function () {
                if (Utils.hasClass(hide, 'bw')) return;
                Utils.addClass(hide, 'bw');
                app.Presents.net.setHidden(gift.id, !gift.h, function () {
                    Utils.removeClass(hide, 'bw');
                    gift.h = gift.h ? 0 : 1;
                    hide.innerText = gift.h ? 'Показать' : 'Скрыть';
                    drawCard();
                    if (callbacks.onHiddenChanged) callbacks.onHiddenChanged(gift.h);
                    Utils.showInfo(gift.h ? 'Скрыт от гостей' : 'Виден всем', {type: 0});
                }, function () {
                    Utils.removeClass(hide, 'bw');
                });
            });

            const remove = Utils.createA({class: 'gd_btn gd_btn_del', text: 'Удалить'}, function () {
                // _flags: 1 — подтверждение закрываем сами: пока запрос в полёте,
                // карточка не должна ожить и принять второе «Удалить»
                const confirm = app.Popups.createConfirm({
                    headerText: 'Удаление',
                    centerText: {
                        text: 'Удалить подарок?<br>Вернуть его будет нельзя.',
                        style: 'position: relative; top: 30px; margin: 0 25px'
                    },
                    yesText: {text: 'Удалить'},
                    noText: 'Отмена',
                    _flags: 1
                }, function () {
                    app.Presents.net.removeGift(gift.id, function () {
                        app.Popups.removePopup(confirm);
                        app.Popups.removePopup(p);
                        Utils.showInfo('Подарок удалён', {type: 0});
                        if (callbacks.onRemoved) callbacks.onRemoved();
                    }, function () {
                        app.Popups.removePopup(confirm);
                    });
                });
            });

            row.appendChild(hide);
            row.appendChild(remove);
            p.els.popup.appendChild(row);
        },

        /** «5 ноября» из даты вида 2026-11-05; без даты подгруппа постоянная. */
        seasonEnd(date) {
            if (!date) return null;
            const parts = date.split('-');
            const month = MONTHS[parseInt(parts[1], 10) - 1];
            return month ? '{0} {1}'.format(parseInt(parts[2], 10), month) : null;
        },

        // style.min.css собирается вне проекта, поэтому стили едут с модулем
        addStyles() {
            if (stylesAdded) return;
            stylesAdded = true;
            app.CSS.addInlineStyles(STYLES);
        }
    };
}
