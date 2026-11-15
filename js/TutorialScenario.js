// Подсказки туториала. Тексты и шаги — из прототипа markup/tutorial_v2/build.py (ветка feature/tutorial).
// Подсказка: step — код текущей вехи (TutorialMainStep), lesson — разовый урок (TutorialLesson), пока не отмечен;
// screen — id верхнего попапа или 'MAIN', либо функция от него; when — доп. условие; text, link — значение или функция;
// marksLessonSeen — показ отмечает урок; button.stepDone закрывает веху; остальное — для TutorialOverlay.
app.TutorialScenario = (function () {

    const EKVAL_CARD_ID = 11;
    const UNCOMMON_QUALITY = 1;
    const STARS_CHEST_STARS = 5;
    // сундуки 2 и 3 глав — как в Campaign.getChestStarsRequired
    const CHAPTER_CHEST_STARS = {2: 20, 3: 30};
    const DECK_SIZE = 8;
    const FIRST_RANK = 1;
    // непрозрачная часть спрайтов sprite_decor.png в пикселях элемента
    const PIN_DRAWN_AREA = {left: 7, top: 9, right: 74, bottom: 81};
    const FLAG_DRAWN_AREA = {left: 7, top: 9, right: 70, bottom: 70};
    const ELEMENT_GENITIVE_NAMES = {F: 'огня', N: 'природы', W: 'воды'};
    const SUMMON_EKVAL_TEXT = 'Фрагментов хватает — <b>призови Эквала</b>, он станет твоей первой картой.';

    // все 6 кубиков оставлены — BattlePage меняет «Бросить еще» на «В бой!»: перебрасывать нечего
    const ALL_DICES_KEPT_HINT = {
        screen: 'BATTLE',
        when: () => getRollableDiceView() && areAllDicesKept(),
        target: () => getRollableDiceView().els.roll_btn,
        unshaded: getBattleBoardAndKeptDices,
        text: 'Все кубики оставлены — перебрасывать нечего. Жми <b>«В бой!»</b>.'
    };

    // окно выпадения листается тапом по экрану — не все игроки догадываются, кнопка делает то же
    const CHEST_DROP_NEXT_BUTTON = {text: 'Далее', onClick: () => {
        const popup = app.Popups.getLast();
        if (popup && popup.cfg.onDarkClick) popup.cfg.onDarkClick();
    }};

    const hints = [
        {
            step: 'intro',
            screen: 'MAIN',
            bellaScene: true,
            text: 'Хранитель, наконец-то! Я Белла — берегу эти земли.\n' +
                'Портал проснулся, и из него лезут <b>порождения тьмы</b>. Остановить их можно только картами магии.',
            button: {text: 'Приступить', stepDone: true},
            // игрок с площадки входит через неё — входа по логину нет и в настройках
            link: () => app.Model.user.partner ? null : {text: 'Уже есть персонаж? Войти', onClick: () => app.loadJS1('SettingsPage', () => app.SettingsPage.showLogin())}
        },

        // первый сундук — фрагменты Эквала (TutorialService.findScriptedChestDrop)
        {
            step: 'first_chest',
            screen: 'MAIN',
            target: '.main_bg a.chest',
            padding: 14,
            text: 'Сначала тебе нужна своя карта. Открой сундук — в нём <b>фрагменты</b> для призыва.'
        },
        {
            step: 'first_chest',
            screen: 'CHESTS',
            target: () => findPopupButton('Бесплатно'),
            text: 'Этот сундук открывается бесплатно.'
        },
        {
            step: 'first_summon',
            screen: 'CHEST_DROP',
            when: isChestDropShown,
            text: 'Фрагменты Эквала! Их ровно столько, сколько нужно для <b>призыва</b>.',
            button: CHEST_DROP_NEXT_BUTTON
        },

        // меню ещё скрыто — окно карты открывает Белла
        {
            step: 'first_summon',
            screen: 'MAIN',
            blocking: true,
            text: SUMMON_EKVAL_TEXT,
            button: {text: 'Открыть карту', onClick: showEkvalCard}
        },
        {
            step: 'first_summon',
            screen: 'CHESTS',
            blocking: true,
            text: SUMMON_EKVAL_TEXT,
            button: {text: 'Открыть карту', onClick: showEkvalCard}
        },
        {
            step: 'first_summon',
            screen: 'CARD_' + EKVAL_CARD_ID,
            target: () => findPopupButton('Призвать'),
            text: 'Нажми <b>«Призвать»</b> — фрагменты станут картой.'
        },
        {
            step: 'first_battle',
            screen: 'CARD_' + EKVAL_CARD_ID,
            text: 'Готово — Эквал теперь твой!',
            button: {text: 'Дальше', onClick: () => app.Popups.removeAll()}
        },
        {
            step: 'first_battle',
            lesson: 'ekval_intro',
            marksLessonSeen: true,
            screen: 'MAIN',
            bellaScene: true,
            text: 'Каменный Эквал — крепкий боец. Он бьёт <b>мечом</b>: чем больше мечей выпадет на кубиках, тем больше ударов.',
            button: {text: 'В бой!'}
        },

        // бои основной части: закрытая локация, нет энергии, прерванный бой
        {
            screen: 'CAMPAIGN_LOCATION',
            when: () => !app.UserUtil.isTutorialMainCompleted() && !findPopupUserLocation(),
            text: 'Эта локация пока закрыта — она откроется, когда пройдёшь предыдущую.',
            button: {text: 'К карте', onClick: () => app.Popups.removeLast()}
        },
        {
            screen: s => s === 'CAMPAIGN_LOCATION' || s === 'CAMPAIGN_LOSE',
            when: () => !app.UserUtil.isTutorialMainCompleted() && isEnergyShortForPopupLocation() && findEnergyItem(),
            target: getEnergyCounter,
            unshaded: getLastPopupWithHeader,
            padding: 2,
            text: () => 'Энергия кончилась, но у тебя есть <b>' + findEnergyItem().name.toLowerCase() + '</b> — она даст ' + findEnergyItem().value + ' энергии.',
            button: {text: 'Выпить', onClick: () => app.MainPage.useEnergyItem(findEnergyItem())}
        },
        {
            screen: 'BATTLE_CONTINUE',
            when: () => !app.UserUtil.isTutorialMainCompleted(),
            target: () => findPopupButton('Продолжить'),
            unshaded: () => app.Popups.getLast().els.popup,
            text: 'Бой прервался — продолжим с того же места.'
        },

        // первый бой: портал → локация 1 → постановочный бой (TutorialService.attachBattleScript)
        {
            step: 'first_battle',
            screen: 'MAIN',
            target: '.main_bg a.campaign',
            padding: 4,
            circle: true,
            text: 'Порождения тьмы уже бродят по Долине Странников. Портал перенесёт тебя туда — <b>нажми на него</b>.'
        },
        {
            step: 'first_battle',
            screen: 'CAMPAIGN',
            target: getLocationPinToAttack,
            padding: 4,
            text: 'Это Долина Странников. Начнём с первой локации.'
        },
        {
            step: 'first_battle',
            screen: 'CAMPAIGN_LOCATION',
            target: () => findPopupButton('Напасть'),
            unshaded: () => getLastPopupWithHeader().concat(getEnergyCounter()),
            text: () => 'Каждый бой стоит <b>' + app.CFGUtil.getChapterLocationByID(app.CFGUtil.getChapterByID(1), 1).energyCost +
                ' энергии</b>. С каждым новым уровнем запас пополняется.'
        },
        {
            step: 'first_battle',
            screen: 'BATTLE',
            when: () => isHandShown() && !findPopupButton('В бой!'),
            target: () => findCardElement(EKVAL_CARD_ID),
            padding: 4,
            text: 'В руку приходят <b>3 карты</b> из колоды. Выбери Эквала — он сильнее скелетов.'
        },
        {
            step: 'first_battle',
            screen: 'BATTLE',
            when: () => !getBattleDices() && findPopupButton('В бой!'),
            target: () => findPopupButton('В бой!'),
            text: 'Отправляй Эквала в бой.'
        },
        {
            step: 'first_battle',
            screen: 'BATTLE',
            when: () => getSwordsToKeep().length > 0,
            target: () => getDices(['HIT']),
            unshaded: '#dark_popup .popup_btl',
            padding: 3,
            text: 'Каждый <b>меч</b> на кубиках — удар Эквала. Нажми на кубики с мечами, чтобы их оставить.'
        },
        {
            step: 'first_battle',
            screen: 'BATTLE',
            when: () => getRollableDiceView() && getSwordsToKeep().length === 0 && !areAllDicesKept() && getRollsLeft() > 1,
            target: () => getRollableDiceView().els.roll_btn,
            unshaded: getBattleBoardAndKeptDices,
            text: 'Остальные кубики перебросим — вдруг выпадут ещё мечи. Всего у тебя <b>3 броска</b> за ход.'
        },
        {
            step: 'first_battle',
            screen: 'BATTLE',
            when: () => getRollableDiceView() && getSwordsToKeep().length === 0 && !areAllDicesKept() && getRollsLeft() === 1,
            target: () => getRollableDiceView().els.roll_btn,
            unshaded: getBattleBoardAndKeptDices,
            text: 'Последний бросок за этот ход — перебросим кубики без мечей.'
        },
        Object.assign({step: 'first_battle'}, ALL_DICES_KEPT_HINT),
        // «Повторить» начинает постановочный бой заново
        {
            step: 'first_battle',
            screen: 'CAMPAIGN_LOSE',
            target: () => findPopupButton('Повторить'),
            unshaded: getLastPopupWithHeader,
            text: 'Не беда — бой можно повторить. Оставляй кубики с <b>мечами</b>: каждый меч — удар Эквала.'
        },
        {
            step: 'first_item_worn',
            screen: 'CAMPAIGN_WIN',
            target: '#dark_popup .camp_star:not(.camp_star_d)',
            unshaded: getLastPopupWithHeader,
            padding: 2,
            circle: true,
            text: 'Победа! Каждый выигранный бой в локации даёт <b>звезду</b>, всего их три.\n' +
                'Звёзды открывают сундуки с фрагментами новых карт, так что переигрывать пройденное — не зря.',
            button: {text: 'На главную', onClick: () => app.Popups.removeAll()}
        },
        // «ОК», крестик или Esc в окне победы возвращают на карту главы
        {
            step: 'first_item_worn',
            screen: s => s === 'CAMPAIGN' || s === 'CAMPAIGN_LOCATION',
            text: 'Новая вещь ждёт в <b>«Профиле»</b> — вернёмся на главную.',
            button: {text: 'На главную', onClick: () => app.Popups.removeAll()}
        },

        // первая вещь
        {
            step: 'first_item_worn',
            screen: 'MAIN',
            target: menuTab('PROFILE'),
            padding: 2,
            text: () => 'Тебе выпала первая вещь — <b>' + findItemToWear().name.toLowerCase() + '</b>! Надень её: вещи добавляют жизней. Открой «Профиль».'
        },
        {
            screen: 'PROFILE',
            when: () => (app.Model.user.tutorial.currentMainStep === 'first_item_worn' || app.UserUtil.isTutorialMainCompleted()) && findItemSlot('Надеть'),
            target: () => findItemSlot('Надеть'),
            padding: 4,
            text: 'Нажми на вещь — она встанет в свой слот.'
        },
        {
            lesson: 'item_worn',
            marksLessonSeen: true,
            screen: 'PROFILE',
            // «Жизней стало больше» — сразу после первой вещи, не позже основной части
            when: () => app.UserUtil.isTutorialStepDone('first_item_worn') && !app.UserUtil.isTutorialMainCompleted(),
            text: 'Жизней стало больше! У каждого ранга <b>6 вещей</b> — собери все, и ранг можно будет повысить.',
            button: {text: 'В кампанию', onClick: showCampaign}
        },

        // свободная игра: задания и сундук за звёзды
        {
            lesson: 'quests',
            screen: 'MAIN',
            when: hasQuestsTabNotice,
            target: menuTab('QUESTS'),
            padding: 2,
            text: 'Награды за выполненное уже ждут — загляни во вкладку <b>«Задания»</b>.'
        },
        {
            lesson: 'quests',
            marksLessonSeen: true,
            screen: 'QUESTS',
            when: () => findPopupButton('Получить'),
            target: () => findPopupButton('Получить'),
            text: 'Выполненные задания — с кнопкой <b>«Получить»</b>. Ежедневные задания каждый день новые, незабранные награды сгорают — заходи почаще. ' +
                'В ежедневных трижды в день дают <b>бесплатную энергию</b>.',
            button: {text: 'Понятно'}
        },
        {
            lesson: 'stars_chest_goal',
            marksLessonSeen: true,
            step: 'stars_chest',
            screen: 'CAMPAIGN',
            when: () => getChapter1Stars() < STARS_CHEST_STARS,
            target: '.map_bg .decor.chest1',
            unshaded: '.map_bg > .tut_stars_chest_goal',
            padding: 4,
            text: () => 'Наберёшь <b>' + STARS_CHEST_STARS + ' звёзд</b> — откроется сундук с фрагментами новой карты. Сейчас у тебя ' + getChapter1Stars() + '. ' +
                'Не хватает — переиграй локации, где меньше трёх звёзд.',
            button: {text: 'Понятно'}
        },
        {
            step: 'stars_chest',
            screen: 'MAIN',
            when: () => getChapter1Stars() >= STARS_CHEST_STARS,
            target: '.main_bg a.campaign',
            padding: 4,
            circle: true,
            text: '<b>' + STARS_CHEST_STARS + ' звёзд!</b> Сундук за звёзды готов — загляни в кампанию.'
        },
        {
            step: 'stars_chest',
            screen: 'CAMPAIGN',
            when: () => getChapter1Stars() >= STARS_CHEST_STARS,
            target: '.map_bg .decor.chest1',
            padding: 4,
            text: '<b>' + STARS_CHEST_STARS + ' звёзд!</b> Сундук готов — нажми на него.'
        },

        // необычная карта из сундука за звёзды (TutorialService.findScriptedCampaignChestDrop): призыв и первая звезда
        {
            step: 'uncommon_summon',
            screen: 'CHEST_DROP',
            when: isChestDropShown,
            text: 'Фрагменты <b>необычной</b> карты! Хватит и на призыв, и на <b>первую звезду</b>.',
            button: CHEST_DROP_NEXT_BUTTON
        },
        {
            step: 'uncommon_summon',
            screen: s => s === 'MAIN' && !!findUncommonCard(isSummonable),
            target: menuTab('CARDS'),
            padding: 2,
            text: 'Фрагментов хватает на <b>призыв</b>! Загляни во вкладку <b>«Карты»</b>.'
        },
        {
            step: 'uncommon_summon',
            screen: s => s === 'CAMPAIGN' || s === 'CHESTS',
            when: () => !!findUncommonCard(isSummonable),
            text: 'Фрагментов хватает на <b>призыв</b> новой карты!',
            button: {text: 'На главную', onClick: () => app.Popups.removeAll()}
        },
        {
            step: 'uncommon_summon',
            screen: 'CARDS',
            when: () => !!findUncommonCard(isSummonable),
            target: () => findCardElement(findUncommonCard(isSummonable).card),
            padding: 4,
            text: () => 'Вот эта карта — <b>«' + getCardName(findUncommonCard(isSummonable)) + '»</b>. Нажми на неё.'
        },
        {
            step: 'uncommon_summon',
            screen: s => !!findUncommonCard(isSummonable) && s === 'CARD_' + findUncommonCard(isSummonable).card,
            target: () => findPopupButton('Призвать'),
            text: 'Всё готово — <b>призови</b> её.'
        },
        // окно карты помнит вкладку: «Развить» — только на «Звёздах»
        {
            step: 'first_star',
            screen: s => !!findUncommonCard(isSummonedWithoutStars) && s === 'CARD_' + findUncommonCard(isSummonedWithoutStars).card,
            when: () => !findPopupButton('Развить') && findInactiveTab('Звезды'),
            target: () => findInactiveTab('Звезды'),
            padding: 2,
            text: 'Открой вкладку <b>«Звёзды»</b>.'
        },
        {
            step: 'first_star',
            screen: s => !!findUncommonCard(isSummonedWithoutStars) && s === 'CARD_' + findUncommonCard(isSummonedWithoutStars).card,
            target: () => findPopupButton('Развить'),
            text: () => 'Карта призвана и <b>сама встала в колоду</b>. Первая звезда откроет атаку <b>' +
                getElementGenitiveName(findUncommonCard(isSummonedWithoutStars)) + '</b> — она бьёт сильнее меча. Нажми <b>«Развить»</b>.'
        },
        {
            step: 'first_star',
            screen: 'MAIN',
            target: menuTab('CARDS'),
            padding: 2,
            text: 'Новую карту можно усилить <b>первой звездой</b> — загляни во вкладку «Карты».'
        },
        {
            step: 'first_star',
            screen: 'CARDS',
            when: () => !!findUncommonCard(isSummonedWithoutStars),
            target: () => findCardElement(findUncommonCard(isSummonedWithoutStars).card),
            padding: 4,
            text: 'Нажми на карту, чтобы развить первую звезду.'
        },

        // второй постановочный бой: атака стихией (TutorialService.attachBattleScript)
        {
            step: 'element_attack_battle',
            screen: s => !!findUncommonCard(isStarred) && s === 'CARD_' + findUncommonCard(isStarred).card,
            text: () => 'Есть <b>первая звезда</b>! Теперь в бою оставляй кубики <b>' + getElementGenitiveName(findUncommonCard(isStarred)) +
                '</b> — каждый даст сильный удар. Мечи тоже в деле, хоть и слабее.',
            button: {text: 'В бой', onClick: () => app.Popups.removeAll()}
        },
        {
            step: 'element_attack_battle',
            screen: 'MAIN',
            target: '.main_bg a.campaign',
            padding: 4,
            circle: true,
            text: 'Испытаем новую атаку — <b>нажми на портал</b>.'
        },
        {
            step: 'element_attack_battle',
            screen: 'CAMPAIGN',
            target: getLocationPinToAttack,
            padding: 4,
            text: 'Испытаем новую атаку — нажми на локацию.'
        },
        {
            step: 'element_attack_battle',
            screen: 'CAMPAIGN_LOCATION',
            target: () => findPopupButton('Напасть'),
            text: 'Нападай!'
        },
        {
            step: 'element_attack_battle',
            screen: 'BATTLE',
            when: () => isHandShown() && !findPopupButton('В бой!') && findUncommonCard(isStarred),
            target: () => findCardElement(findUncommonCard(isStarred).card),
            padding: 4,
            text: () => 'Выбери карту <b>«' + getCardName(findUncommonCard(isStarred)) + '»</b>.'
        },
        {
            step: 'element_attack_battle',
            screen: 'BATTLE',
            when: () => !getBattleDices() && findPopupButton('В бой!'),
            target: () => findPopupButton('В бой!'),
            text: 'В бой!'
        },
        {
            step: 'element_attack_battle',
            screen: 'BATTLE',
            when: () => getElementDicesToKeep().length > 0,
            target: () => getDices(getElementDiceTypes()),
            unshaded: '#dark_popup .popup_btl',
            padding: 3,
            text: () => 'Оставь кубики <b>' + getElementGenitiveName(findUncommonCard(isStarred)) + '</b> и <b>мечи</b> — у карты обе атаки, стихия сильнее.'
        },
        {
            step: 'element_attack_battle',
            screen: 'BATTLE',
            when: () => getRollableDiceView() && getElementDicesToKeep().length === 0 && !areAllDicesKept(),
            target: () => getRollableDiceView().els.roll_btn,
            unshaded: getBattleBoardAndKeptDices,
            text: 'Остальные кубики перебросим.'
        },
        Object.assign({step: 'element_attack_battle'}, ALL_DICES_KEPT_HINT),
        {
            step: 'element_attack_battle',
            screen: 'CAMPAIGN_LOSE',
            target: () => findPopupButton('Повторить'),
            unshaded: getLastPopupWithHeader,
            text: () => 'Не беда — бой можно повторить. Оставляй кубики <b>' + getElementGenitiveName(findUncommonCard(isStarred)) + '</b>: они бьют сильнее меча.'
        },

        // конец основной части
        {
            step: 'world_open',
            screen: s => s === 'CAMPAIGN' || s === 'CAMPAIGN_LOCATION',
            text: 'Отличный бой! Возвращайся на главную — там тебя кое-что ждёт.',
            button: {text: 'На главную', onClick: () => app.Popups.removeAll()}
        },
        {
            step: 'world_open',
            screen: 'MAIN',
            bellaScene: true,
            text: 'Ты быстро учишься! Дальше решай, куда идти, а я буду рядом.\n' +
                '<b>Путь Хранителя</b> подскажет следующую цель и наградит за каждую. За первые шаги тебе уже кое-что причитается.',
            button: {text: 'Открыть Путь', stepDone: true, onClick: () => app.TutorialPath.showWindow()}
        },

        // Путь Хранителя (TutorialPath): награда ждёт; о ней на главной говорит метка виджета
        {
            screen: 'TUTORIAL_PATH',
            when: () => !!document.querySelector('.tut_goal_claim') && (!app.Model.user.tutorial.pc.length || isLastPathGoalLeft()),
            target: '.tut_goal_claim',
            unshaded: () => [app.Popups.getLast().els.brd, app.Popups.getLast().els.header],
            padding: 3,
            text: () => isLastPathGoalLeft() ? 'Последний шаг Пути — забирай награду!' : 'Шаг выполнен — забирай награду. Следующая цель уже ждёт.'
        },

        // первый ранг: пустой слот → «Где искать?»; все вещи надеты → награда Пути → повышение ранга
        {
            lesson: 'empty_slot',
            screen: 'PROFILE',
            when: afterMainPart(() => app.Model.user.rank === FIRST_RANK && findItemSlot('Найти') && !findItemSlot('Надеть')),
            target: () => findItemSlot('Найти'),
            padding: 4,
            text: 'Для нового ранга нужны <b>все 6 вещей</b>. Нажми на пустой слот — покажу, где выпадает вещь.'
        },
        {
            lesson: 'empty_slot',
            marksLessonSeen: true,
            screen: 'PROFILE_SLOT',
            when: afterMainPart(findOpenDropLocation),
            target: findOpenDropLocation,
            padding: 4,
            text: 'Здесь выпадает эта вещь. Нажми на локацию — она откроется в кампании. Вещь может выпасть не с первого раза.',
            button: {text: 'Понятно'}
        },
        {
            screen: 'MAIN',
            when: afterMainPart(findItemToWear),
            target: menuTab('PROFILE'),
            padding: 2,
            text: () => 'Новая вещь — <b>' + findItemToWear().name.toLowerCase() + '</b>! Надень её в «Профиле».'
        },
        {
            screen: 'MAIN',
            when: afterMainPart(isAllSlotsWornRewardWaiting),
            target: '.tut_path',
            padding: 4,
            text: 'Все 6 вещей надеты — шаг Пути выполнен! Забери награду.'
        },
        {
            screen: 'PROFILE',
            when: afterMainPart(isAllSlotsWornRewardWaiting),
            blocking: true,
            text: 'Все 6 вещей надеты — шаг Пути выполнен! Забери награду, а потом поднимем ранг.',
            button: {text: 'К Пути', onClick: () => app.TutorialPath.showWindow()}
        },
        {
            screen: 'MAIN',
            when: afterMainPart(() => canFirstRankUp() && !isAllSlotsWornRewardWaiting()),
            target: menuTab('PROFILE'),
            padding: 2,
            text: () => 'Золота хватает на <b>новый ранг</b> — он стоит ' + app.Utils.toMoney(getFirstRankUpPrice().v) + '. Открой «Профиль».'
        },
        {
            screen: 'PROFILE',
            when: afterMainPart(() => app.Model.user.rank === FIRST_RANK && findRankUpButton() && !isAllSlotsWornRewardWaiting()),
            target: findRankUpButton,
            padding: 4,
            text: () => 'Профиль собран — можно поднять <b>ранг</b>! Вещи уйдут, но жизни, которые они давали, останутся, и сверху ещё <b>+' +
                app.CFGUtil.getRankByID(FIRST_RANK).health + ' навсегда</b>. Дальше — 6 новых вещей, посильнее.'
        },

        // зелье опыта: урок засчитывается, только когда зелье выпито — после него идёт урок по умениям
        {
            lesson: 'exp_potion',
            screen: 'MAIN',
            when: afterMainPart(() => !hasAnyCardGainedExp() && findCardForExpPotion()),
            target: menuTab('CARDS'),
            padding: 2,
            text: 'У тебя есть <b>зелье опыта</b> — оно повышает уровень карты. Открой «Карты».'
        },
        {
            lesson: 'exp_potion',
            screen: 'CARDS',
            when: afterMainPart(() => !hasAnyCardGainedExp() && findCardForExpPotion()),
            target: () => findCardElement(findCardForExpPotion().id),
            padding: 4,
            text: () => 'Нажми на «' + findCardForExpPotion().name + '».'
        },
        {
            lesson: 'exp_potion',
            screen: s => s.indexOf('CARD_') === 0,
            when: afterMainPart(() => !hasAnyCardGainedExp() && findCardExpTabForPotion() && !app.Utils.hasClass(findCardExpTabForPotion(), 'brd_block_tab_active')),
            target: findCardExpTabForPotion,
            padding: 2,
            text: 'Открой вкладку <b>«Опыт»</b>.'
        },
        {
            lesson: 'exp_potion',
            screen: s => s.indexOf('CARD_') === 0,
            when: afterMainPart(() => !hasAnyCardGainedExp() && findCardExpTabForPotion() && app.Utils.hasClass(findCardExpTabForPotion(), 'brd_block_tab_active')),
            target: () => Array.from(document.querySelectorAll('#dark_popup .item_slot.item_slot_full:not(.bw)')).concat(findPopupButton('Использовать')),
            padding: 3,
            // Cards.canCardUpdateExp: простой карте подходит зелье любой стихии, стихийной — только её
            text: () => {
                const card = app.Popups.getLast().cfg.card;
                const suitablePotionText = card.quality === 0 ? '<b>Простой</b> карте подходит зелье любой стихии.'
                    : 'Этой карте подходит только зелье <b>' + ELEMENT_GENITIVE_NAMES[card.et] + '</b>.';
                return 'Выбери зелье и нажми <b>«Использовать»</b>. ' + suitablePotionText + ' С уровнем карты можно дальше улучшать её умения, но обогнать тебя по уровню карта не может.';
            }
        },
        {
            lesson: 'exp_potion',
            marksLessonSeen: true,
            screen: s => s.indexOf('CARD_') === 0 || s === 'CARDS' || s === 'MAIN',
            when: afterMainPart(hasAnyCardGainedExp),
            text: 'Готово — карта получила опыт! Хватит опыта — вырастет её уровень, а с ним и сила.',
            button: {text: 'Понятно'}
        },

        // умение карты: его уровень не выше уровня карты
        {
            lesson: 'card_skill',
            screen: 'MAIN',
            when: afterMainPart(findCardForSkillUp),
            target: menuTab('CARDS'),
            padding: 2,
            text: () => 'Уровень карты «' + findCardForSkillUp().name + '» вырос — теперь можно <b>улучшить её умение</b>. Открой «Карты».'
        },
        {
            lesson: 'card_skill',
            screen: 'CARDS',
            when: afterMainPart(findCardForSkillUp),
            target: () => findCardElement(findCardForSkillUp().id),
            padding: 4,
            text: () => 'Нажми на «' + findCardForSkillUp().name + '».'
        },
        {
            lesson: 'card_skill',
            screen: s => s.indexOf('CARD_') === 0,
            when: afterMainPart(() => canPopupCardSkillUp() && findInactiveTab('Умения')),
            target: () => findInactiveTab('Умения'),
            padding: 2,
            text: 'Открой вкладку <b>«Умения»</b>.'
        },
        {
            lesson: 'card_skill',
            marksLessonSeen: true,
            screen: s => s.indexOf('CARD_') === 0,
            when: afterMainPart(() => canPopupCardSkillUp() && findSkillUpButton()),
            target: findSkillUpButton,
            padding: 4,
            text: 'Нажми <b>«+»</b> у умения — оно будет бить сильнее. Уровень умения не может обогнать уровень карты.',
            button: {text: 'Понятно'}
        },

        // своя карта не встала в полную колоду
        {
            lesson: 'deck_full',
            screen: 'MAIN',
            when: afterMainPart(findCardOutOfFullDeck),
            target: menuTab('CARDS'),
            padding: 2,
            text: () => 'Карта <b>«' + getCardName(findCardOutOfFullDeck()) + '»</b> не поместилась в колоду — там уже ' + DECK_SIZE + ' карт. Загляни в «Карты» и реши, кого заменить.'
        },
        {
            lesson: 'deck_full',
            screen: 'CARDS',
            when: afterMainPart(() => findCardOutOfFullDeck() && findInactiveTab('Боевая колода')),
            target: () => findInactiveTab('Боевая колода'),
            padding: 2,
            text: 'Открой <b>«Боевую колоду»</b>.'
        },
        {
            lesson: 'deck_full',
            marksLessonSeen: true,
            screen: 'CARDS',
            when: afterMainPart(findCardOutOfFullDeck),
            target: () => findCardElement(findCardOutOfFullDeck().card),
            padding: 4,
            text: 'Новая карта — в «Не участвуют». Нажми на неё, выбери <b>«В колоду»</b> и карту, которую она заменит. Колоду можно менять когда угодно.',
            button: {text: 'Понятно'}
        },

        // Арена: колода защиты, соперники
        {
            lesson: 'arena_defence_deck',
            screen: 'Arena',
            when: afterMainPart(() => findPopupButton('Изменить')),
            target: () => findPopupButton('Изменить'),
            padding: 4,
            text: 'Пока тебя нет в игре, другие Хранители могут напасть — отбиваться будет <b>колода защиты</b>. Я поставила туда твои боевые карты — загляни.'
        },
        {
            lesson: 'arena_defence_deck',
            marksLessonSeen: true,
            screen: 'ARENA_DEFENCE_DECK',
            when: afterMainPart(() => getDefenceDeckCardElements().length),
            target: getDefenceDeckCardElements,
            padding: 2,
            text: 'Это колода защиты. Новые карты сюда <b>сами не попадут</b> — получишь карту, загляни и реши, ставить ли её в защиту.',
            button: {text: 'Понятно'}
        },
        {
            lesson: 'arena_enemies',
            marksLessonSeen: true,
            screen: 'Arena',
            when: afterMainPart(() => !app.UserUtil.isTutorialLessonPending('arena_defence_deck') && findPopupButton('Напасть')),
            target: '#dark_popup .list_s_arena',
            allMatches: true,
            padding: 2,
            text: 'Выбери соперника и нападай. Побеждай и поднимайся в рейтинге: награда зависит от места. Энергия здесь не нужна — у Арены свои бои на день.',
            button: {text: 'Понятно'}
        },
        // после первого боя: ArenaBattleEndCommand заводит таймер на 2 часа, ArenaUtil по нему шлёт на почту награду за место в тот момент
        {
            lesson: 'arena_reward',
            marksLessonSeen: true,
            screen: 'Arena',
            when: afterMainPart(() => !app.UserUtil.isTutorialLessonPending('arena_enemies')
                && app.Model.user.arena.entry.p > 0 && app.Model.user.arena.entry.rt > app.TimeUtil.now() && findArenaRow('До получения награды')),
            target: () => [findArenaRow('Мое место'), findArenaRow('Награда текущего места'), findArenaRow('До получения награды')],
            padding: 2,
            text: () => 'Сейчас ты на <b>' + app.Model.user.arena.entry.p + '-м месте</b>. Награду дают не сразу: когда таймер дойдёт до нуля, на почту придёт награда ' +
                'за место, на котором ты будешь <b>в тот момент</b>. Другие Хранители тоже нападают и могут занять твоё место — держись повыше.',
            button: {text: 'Понятно'}
        },

        // Путь Хранителя пройден: прощание и зачем возвращаться
        {
            lesson: 'see_you',
            marksLessonSeen: true,
            screen: 'MAIN',
            when: afterMainPart(() => app.UserUtil.isTutorialCompleted()),
            bellaScene: true,
            text: '<b>Путь Хранителя пройден!</b> У тебя всё прекрасно получается.\n' +
                'Энергия понемногу восстанавливается сама, а в <b>заданиях</b> можно забрать бесплатную. Бои Арены обновляются <b>раз в сутки</b>. Дальше — твоя история: Долина ждёт своего Хранителя.',
            button: {text: 'Вперёд!'}
        },

        // после первого ранга; игрок с площадки входит через неё — сохранять нечего. Награда за сохранение — в сюжетном задании «Сохрани персонажа»
        {
            lesson: 'account_save_offer',
            marksLessonSeen: true,
            screen: 'MAIN',
            when: () => app.Model.user.rank > 1 && !app.Model.user.partner
                && app.Model.user.login === String(app.Model.user.id),
            bellaScene: true,
            text: 'Первый ранг уже твой — не потеряй прогресс. Придумай логин и пароль, и Хранитель будет ждать тебя на любом устройстве.',
            button: {text: 'Сохранить', onClick: () => app.loadJS('SettingsPage', () => app.SettingsPage.showSaveCharacter())},
            link: {text: 'Позже'}
        }
    ];

    // строка окна Арены по началу подписи: «Мое место», «Награда текущего места», «До получения награды»
    function findArenaRow(textStart) {
        return Array.from(document.querySelectorAll('#dark_popup .my_power > div, #dark_popup .arena_info > div'))
            .find(div => div.offsetParent && div.textContent.indexOf(textStart) === 0);
    }

    function findPopupButton(textStart) {
        return Array.from(document.querySelectorAll('#dark_popup a.btn_g'))
            .find(a => a.offsetParent && a.textContent.indexOf(textStart) === 0);
    }

    function isChestDropShown() {
        const popup = app.Popups.getLast();
        return !!(popup && popup.shown && popup.tl && !popup.tl.isActive());
    }

    // заголовок окна вынесен над рамкой и в её прямоугольник не входит
    function getLastPopupWithHeader() {
        const popup = app.Popups.getLast().els.popup;
        return [popup, popup.querySelector(':scope > .header')].filter(Boolean);
    }

    // локация игрока из окна локации или поражения; у закрытой — undefined
    function findPopupUserLocation() {
        const cfg = app.Popups.getLast().cfg;
        const chapter = app.UserUtil.getChapterByID(cfg.chapter);
        return chapter && app.UserUtil.getChapterLocationByID(chapter, cfg.location);
    }

    function isEnergyShortForPopupLocation() {
        const cfg = app.Popups.getLast().cfg;
        return app.Model.user.energy.v < app.CFGUtil.getChapterLocationByID(app.CFGUtil.getChapterByID(cfg.chapter), cfg.location).energyCost;
    }

    function findEnergyItem() {
        return app.UserUtil.getItemsByType('p_e')[0];
    }

    function getEnergyCounter() {
        const icon = document.querySelector('.header_res .res_energy');
        return icon && icon.parentNode;
    }

    function showEkvalCard() {
        app.Popups.removeAll();
        app.Cards.showCardInfoPopup(app.UserUtil.wrapCard(EKVAL_CARD_ID, true));
    }

    function findCardElement(cardId) {
        const img = app.CFGUtil.getCardByID(cardId).img;
        return Array.from(document.querySelectorAll('#dark_popup .sh_card'))
            .find(el => el.offsetParent && el.querySelector('.sh_skill[src*="' + img + '"]'));
    }

    // надпись выбора карты; после «В бой!» игра её убирает, карта ещё летит
    function isHandShown() {
        const advice = app.Popups.getLast().els.advice;
        return !!(advice && advice.parentNode && advice.textContent.indexOf('Выбери карту') === 0);
    }

    // кубики игрока в бою; до выбора карты их нет
    function getBattleDices() {
        const players = app.BattlePage._players();
        return players && players.m1 && players.m1.view && players.m1.view.dices;
    }

    // вид игрока в бою, пока можно перебросить кубики; иначе null
    function getRollableDiceView() {
        const players = app.BattlePage._players();
        const view = getBattleDices() && players.m1.view;
        if (!view || view.rollsInProcess || !players.m1.model.rolls) return null;
        return view.els.roll_btn && view.els.roll_btn.offsetParent ? view : null;
    }

    function getRollsLeft() {
        return app.BattlePage._players().m1.model.rolls;
    }

    function getSwordsToKeep() {
        return getDicesToKeep(['HIT']);
    }

    function getElementDicesToKeep() {
        return getDicesToKeep(getElementDiceTypes());
    }

    function getElementDiceTypes() {
        const card = findUncommonCard(isStarred);
        return card ? ['HIT', app.CFGUtil.getCardByID(card.card).et] : [];
    }

    function getDicesToKeep(types) {
        return getDices(types, d => !d.selected);
    }

    // кубики нужных типов; подсветка остаётся и на оставленных, чтобы рамка не прыгала после каждого нажатия
    function getDices(types, test) {
        const view = getRollableDiceView();
        return view ? view.dices.list.filter(d => types.indexOf(d.type) !== -1 && (!test || test(d))).map(d => d.els.main) : [];
    }

    function areAllDicesKept() {
        const view = getRollableDiceView();
        return !!view && view.dices.list.every(d => d.selected);
    }

    // перед перебросом оставленные кубики видны, не под затемнением
    function getBattleBoardAndKeptDices() {
        const view = getRollableDiceView();
        const kept = view ? view.dices.list.filter(d => d.selected).map(d => d.els.main) : [];
        return [document.querySelector('#dark_popup .popup_btl')].concat(kept);
    }

    // вкладка меню в новом и старом оформлении (Menu.js ставит data-menu в обоих)
    function menuTab(type) {
        return '[data-menu=' + type + ']';
    }

    function showCampaign() {
        app.Popups.removeAll();
        app.EventDispatcher.emit('show campaign', {raids: 1});
    }

    // вещь в инвентаре для пустого слота
    function findItemToWear() {
        const slot = app.Model.user.body.slots.find(s => !s.on && app.UserUtil.wrapItem(s.item).count > 0);
        return slot ? app.UserUtil.wrapItem(slot.item) : null;
    }

    function findItemSlot(text) {
        return Array.from(document.querySelectorAll('#dark_popup .item_slot'))
            .find(el => el.offsetParent && Array.from(el.querySelectorAll('.txt')).some(t => t.textContent === text));
    }

    function afterMainPart(test) {
        return () => app.UserUtil.isTutorialMainCompleted() && test();
    }

    function findOpenDropLocation() {
        return Array.from(document.querySelectorAll('#dark_popup a.craft_get:not(.red)')).find(a => a.offsetParent);
    }

    // без заголовка «Мощь»
    function getDefenceDeckCardElements() {
        return app.Popups.getLast().els.tmp.list1.slice(1).map(entry => entry.els.main);
    }

    function isLastPathGoalLeft() {
        const tutorial = app.Model.user.tutorial;
        return tutorial.pathGoals.filter(goal => tutorial.pc.indexOf(goal) === -1).length === 1;
    }

    function isPathGoalClaimable(goal) {
        const tutorial = app.Model.user.tutorial;
        return tutorial.pr.indexOf(goal) !== -1 && tutorial.pc.indexOf(goal) === -1;
    }

    // после повышения ранга вещи сняты — подсказка «все 6 вещей надеты» была бы неправдой
    function isAllSlotsWornRewardWaiting() {
        return app.Model.user.rank === FIRST_RANK && isPathGoalClaimable('all_slots_worn');
    }

    function canFirstRankUp() {
        const user = app.Model.user;
        return user.rank === FIRST_RANK && user.body.slots.every(slot => slot.on) && app.UserUtil.canPay(getFirstRankUpPrice());
    }

    function getFirstRankUpPrice() {
        return app.CFGUtil.getRankByID(FIRST_RANK).price;
    }

    function findRankUpButton() {
        const button = findPopupButton('Повысить ранг');
        return button && !app.Utils.hasClass(button, 'bw') ? button : null;
    }

    // опыт карте даёт только CardUseExpPotionCommand: есть опыт или уровень — значит, зелье выпито
    function hasAnyCardGainedExp() {
        return app.Model.user.cards.list.some(c => {
            const card = app.UserUtil.wrapCard(c.card);
            return card.level > 0 || card.exp > 0;
        });
    }

    function findCardForExpPotion() {
        return app.Model.user.cards.list.map(c => app.UserUtil.wrapCard(c.card)).find(app.Cards.canCardUpdateExp);
    }

    function findCardExpTabForPotion() {
        const cfg = app.Popups.getLast().cfg;
        return cfg.tabs && cfg.tabs.t3 && app.Cards.canCardUpdateExp(cfg.card) ? cfg.tabs.t3.els.main : null;
    }

    function findCardForSkillUp() {
        return app.Model.user.cards.list.map(c => app.UserUtil.wrapCard(c.card, true)).find(app.Cards.canCardUpdateDetails);
    }

    function canPopupCardSkillUp() {
        const card = app.Popups.getLast().cfg.card;
        return !!card && !!app.Cards.canCardUpdateDetails(card);
    }

    // «+» в строке умения; plus_s_d — умение догнало уровень карты. Жёлтые «+» под картой — уровень и звёзды
    function findSkillUpButton() {
        return Array.from(document.querySelectorAll('#dark_popup .skill_row > a.plus_skill:not(.plus_s_d)')).find(a => a.offsetParent);
    }

    function findCardOutOfFullDeck() {
        const cards = app.Model.user.cards;
        const deck = cards.decks[cards.adx];
        if (deck.length < DECK_SIZE) return null;
        return cards.list.find(c => c.level !== -1 && deck.indexOf(c.card) === -1);
    }

    function findInactiveTab(text) {
        return Array.from(document.querySelectorAll('#dark_popup .brd_block_tab:not(.brd_block_tab_active)'))
            .find(a => a.offsetParent && a.textContent.indexOf(text) === 0);
    }

    function hasQuestsTabNotice() {
        const notice = document.querySelector(menuTab('QUESTS') + ' .notice');
        return !!(notice && notice.offsetParent);
    }

    function getChapter1Stars() {
        const chapter = app.UserUtil.getChapterByID(1);
        return chapter ? app.UserUtil.getChapterStars(chapter) : 0;
    }

    function findUncommonCard(test) {
        return app.Model.user.cards.list.find(c => app.CFGUtil.getCardByID(c.card).quality === UNCOMMON_QUALITY && test(c));
    }

    function isSummonable(card) {
        return card.level === -1 && app.UserUtil.canCardStarsUp(card);
    }

    function isSummonedWithoutStars(card) {
        return card.level !== -1 && card.stars === 0;
    }

    function isStarred(card) {
        return card.stars > 0;
    }

    function getCardName(card) {
        return app.CFGUtil.getCardByID(card.card).name;
    }

    function getElementGenitiveName(card) {
        return ELEMENT_GENITIVE_NAMES[app.CFGUtil.getCardByID(card.card).et];
    }

    // у активной локации над пином флаг .act; Campaign.js опускает его на место через пару секунд после открытия карты — до этого null.
    // Флага нет, когда активная локация на другой карте или уже с тремя звёздами: тогда — открытая локация с наименьшим числом звёзд
    function getLocationPinToAttack() {
        const pins = Array.from(document.querySelectorAll('.map_bg .pin'));
        const pin = pins.find(pin => pin.querySelector('.act'));
        if (pin) return getPinWithFlag(pin);
        const stars = pin => [3, 2, 1].find(n => pin.classList.contains('pin_' + n + 's')) || 0;
        const openPins = pins.filter(pin => !pin.classList.contains('pin_n'));
        return openPins.reduce((best, pin) => !best || stars(pin) < stars(best) ? pin : best, null);
    }

    // рамка — по нарисованным частям пина и флага, без прозрачных полей спрайтов
    function getPinWithFlag(pin) {
        const flag = pin.querySelector('.act');
        if (getComputedStyle(flag).opacity !== '1') return null;
        const pinBounds = getDrawnBounds(pin, PIN_DRAWN_AREA);
        const flagBounds = getDrawnBounds(flag, FLAG_DRAWN_AREA);
        const left = Math.min(pinBounds.left, flagBounds.left);
        const top = Math.min(pinBounds.top, flagBounds.top);
        const rect = new DOMRect(left, top, Math.max(pinBounds.right, flagBounds.right) - left, Math.max(pinBounds.bottom, flagBounds.bottom) - top);
        return {getBoundingClientRect: () => rect};
    }

    function getDrawnBounds(el, area) {
        const r = el.getBoundingClientRect();
        const scale = r.width / el.offsetWidth;
        return {left: r.left + area.left * scale, top: r.top + area.top * scale, right: r.left + area.right * scale, bottom: r.top + area.bottom * scale};
    }

    // цель свободной игры — прогресс к ближайшему неоткрытому сундуку первой главы; null — меток нет.
    // Первый — пока не готов (дальше ведёт Белла), второй и третий — и готовые, пока не открыты; после Пути меток нет.
    // main, map — тексты меток на главной и на карте главы, chest — номер сундука для метки на карте
    function getStarsChestGoalTexts() {
        const stars = getChapter1Stars();
        if (!app.UserUtil.isTutorialMainCompleted()) {
            if (app.Model.user.tutorial.currentMainStep !== 'stars_chest' || stars >= STARS_CHEST_STARS) return null;
            return getChestGoalTexts(1, stars, STARS_CHEST_STARS);
        }
        const chapter = app.UserUtil.getChapterByID(1);
        if (app.UserUtil.isTutorialCompleted() || !chapter) return null;
        const chest = [2, 3].find(n => !chapter['chest' + n]);
        return chest ? getChestGoalTexts(chest, stars, CHAPTER_CHEST_STARS[chest]) : null;
    }

    function getChestGoalTexts(chest, stars, required) {
        const progress = '★ ' + Math.min(stars, required) + ' / ' + required;
        return {main: progress + (stars >= required ? ' · сундук готов' : ' · сундук за звёзды'), map: progress, chest: chest};
    }

    return {
        hints: hints,
        getStarsChestGoalTexts: getStarsChestGoalTexts
    };
})();
