app.SoundManager = (function () {
    var _audio_context;
    var _audio_ext = -1;
    var _state = 0;

    var Sound = function (url) {
        this.url = url;
        this.buffer = undefined;

        // 0 -
        // 1 - start load
        // 2 - loaded
        // 3 - start decode
        // 4 - decoded
        this.state = 0;
    };
    Sound.prototype.load = function(onLoad) {
        let self = this;
        if (self.state !== 0) return;
        self.state = 1;
        let request = new XMLHttpRequest();
        request.onload = function () {
            self.data = request.response;
            self.state = 2;
            onLoad();
        };
        request.responseType = 'arraybuffer';
        request.open('GET', self.url, true);
        request.send();
    };
    Sound.prototype.decode = function(onDecode) {
        let self = this;
        if (self.state !== 2) return;
        self.state = 3;
        _audio_context.decodeAudioData(self.data, function(buffer) {
            self.buffer = buffer;
            self.state = 4;
            if (onDecode) {
                onDecode();
            }
        });
    };
    Sound.prototype.canPlay = function () {
        return this.buffer !== undefined;
    };
    Sound.prototype.play = function (gain) {
        let source = _audio_context.createBufferSource();
        source.buffer = this.buffer;
        let gainNode = _audio_context.createGain();
        gainNode.gain.value = gain;
        source.connect(gainNode);
        gainNode.connect(_audio_context.destination);

        if (source.start) {
            source.start(0);
        } else if (source.play) {
            source.play(0);
        } else if (source.noteOn) {
            source.noteOn(0);
        }

        this.source = source;
        this.gainNode = gainNode;
    };
    Sound.prototype.fadeStart = function(gain) {
        let source = _audio_context.createBufferSource();
        source.buffer = this.buffer;
        let gainNode = _audio_context.createGain();
        gainNode.gain.value = gain;
        source.connect(gainNode);
        gainNode.connect(_audio_context.destination);
        gainNode.gain.linearRampToValueAtTime(0, _audio_context.currentTime);
        gainNode.gain.linearRampToValueAtTime(gain, _audio_context.currentTime + 2);

        if (source.start) {
            source.start(0);
        } else if (source.play) {
            source.play(0);
        } else if (source.noteOn) {
            source.noteOn(0);
        }

        source.loop = true;
        this.source = source;
        this.gainNode = gainNode;
    };
    Sound.prototype.fadeStop = function() {
        this.gainNode.gain.linearRampToValueAtTime(0, _audio_context.currentTime + 2);
        this.source.stop(_audio_context.currentTime + 2);
        delete this.source;
        delete this.gainNode;
    };

    var sounds = {
        v: '1.0.0.3',
        list: [
            {alias: 'bg1', file: '/sounds/bg1.{0}', v: '1'},
            {alias: 'bg2', file: '/sounds/bg2.{0}', v: '1'},
            {alias: 'bg3', file: '/sounds/bg3.{0}', v: '1'},
            {alias: 'chat', file: '/sounds/chat.{0}', v: '1'},
            {alias: 'click', file: '/sounds/click.{0}', v: '1'},
            {alias: 'roulette', file: '/sounds/ruletka.{0}', v: '1'},
            {alias: 'dice', file: '/sounds/kubiki.{0}', v: '1'},
            {alias: 'win', file: '/sounds/win.{0}', v: '1'},
            {alias: 'draw', file: '/sounds/nichya.{0}', v: '1'},
            {alias: 'lose', file: '/sounds/lose.{0}', v: '1'},
            {alias: 'sword1', file: '/sounds/sword1.{0}', v: '1'},
            {alias: 'sword2', file: '/sounds/sword2.{0}', v: '1'},
            {alias: 'magic2', file: '/sounds/magic2.{0}', v: '1'},
            {alias: 'magic5', file: '/sounds/magic5.{0}', v: '1'},
            {alias: 'miss', file: '/sounds/miss.{0}', v: '1'},
            {alias: 'chest_jump', file: '/sounds/sunduk_jump.{0}', v: '1'},
            {alias: 'chest_drop', file: '/sounds/sunduk_monetki.{0}', v: '1'},
            {alias: 'chest_drop_card', file: '/sounds/sunduk_karta.{0}', v: '1'}
        ],
        getCFG: function(alias) {
            let list = this.list, cfg;
            for (let i = 0; i < list.length; i++) {
                if ((cfg = list[i]).alias === alias) return cfg;
            }
        },
        getPath0: function(cfg) {
            let RESOURCE_URL;
            if (typeof VK_ODR !== 'undefined' && VK_ODR) {
                RESOURCE_URL = VK_ODR_CORS_SERVER;
            } else if (typeof window._GAMEPUSH !== 'undefined' && window._GAMEPUSH) {
                RESOURCE_URL = 'https://keepers.mobi';
            } else {
                let host = window.location.host;
                if (host.indexOf('98934') !== -1 && host.indexOf('yandex') !== -1) {
                    RESOURCE_URL = 'https://keepers.mobi';
                } else {
                    RESOURCE_URL = location.protocol + '//' + host;
                }
            }
            return RESOURCE_URL + cfg.file.format(_audio_ext) + '?v=' + this.v + '.' + cfg.v;
        },
        load: function(alias, onLoad) {
            let cfg = this.getCFG(alias);
            if (cfg.sound) {
                if (onLoad) {
                    onLoad(alias);
                }
                return;
            }
            cfg.sound = new Sound(this.getPath0(cfg));
            cfg.sound.load(function() {
                if (onLoad) {
                    onLoad(alias);
                }
            });
        }
    };

    return {
        initContext: function() {
            if (this.isAvailable()) {
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                _audio_context = new window.AudioContext();
                _state = 1;
                sounds.list.forEach(function(cfg) {
                    if (cfg.sound && cfg.sound.state === 2) {
                        cfg.sound.decode(function() {
                            app.EventDispatcher.dispatchEvent('sound decoded', cfg.alias);
                        });
                    }
                });
            } else {
                _state = -1;
            }
            console.log('SoundManager state :: ' + _state);
            return _state;
        },

        initExt: function() {
            let audio = new Audio();
            if (audio.canPlayType) {
                let ext;
                if (audio.canPlayType('audio/ogg; codecs="vorbis"') !== '') {
                    ext = 'ogg';
                } else if (audio.canPlayType('audio/mpeg; codecs="mp3"') !== '') {
                    ext = 'mp3';
                }
                if (ext) {
                    _audio_ext = ext;
                }
            }
            return _audio_ext;
        },

        isAvailable: function() {
            return window.AudioContext = window.AudioContext || window.webkitAudioContext;
        },

        load: function(list, onLoad, onComplete) {
            if (this.isAvailable()) {
                let progress = 0;
                let total = list.length;
                list.forEach(function(alias) {
                    sounds.load(alias, function() {
                        progress++;
                        if (onLoad) {
                            onLoad(alias);
                        }
                        if (_audio_context) {
                            sounds.getCFG(alias).sound.decode(function() {
                                app.EventDispatcher.dispatchEvent('sound decoded', alias);
                            });
                        }
                        if (progress === total) {
                            if (onComplete) {
                                onComplete();
                            }
                        }
                    });
                });
            } else {
                if (onComplete) {
                    onComplete();
                }
            }
        },

        SOUNDS: sounds,
        playBG1: function() {
            this._playBG('bg1');
        },
        stopBG1: function() {
            this._stopBG('bg1');
        },
        playBG2: function() {
            this._playBG('bg2');
        },
        stopBG2: function() {
            this._stopBG('bg2');
        },
        playBG3: function() {
            this._playBG('bg3');
        },
        stopBG3: function() {
            this._stopBG('bg3');
        },
        playChat: function() {
            this._playEffects('chat');
        },
        playClick: function() {
            this._playEffects('click');
        },
        playRoulette: function() {
            this._playEffects('roulette');
        },
        playDice: function() {
            this._playEffects('dice');
        },
        playWin: function() {
            this._playEffects('win');
        },
        playDraw: function() {
            this._playEffects('draw');
        },
        playLose: function() {
            this._playEffects('lose');
        },
        playSword: function() {
            let rnd = Math.random();
            if (rnd < 0.5) {
                this._playEffects('sword1');
            } else {
                this._playEffects('sword2');
            }
        },
        playMagic: function() {
            let rnd = Math.random();
            if (rnd < 0.5) {
                this._playEffects('magic2');
            } else {
                this._playEffects('magic5');
            }
        },
        playHeal: function() {
            this._playEffects('magic2');
        },
        playMiss: function() {
            this._playEffects('miss');
        },
        playChestJump: function() {
            this._playEffects('chest_jump');
        },
        playChestDrop: function() {
            this._playEffects('chest_drop');
        },
        playChestDropCard: function() {
            this._playEffects('chest_drop_card');
        },
        _playBG: function(alias) {
            if (this.isAvailable()) {
                let cfg = sounds.getCFG(alias);
                if (cfg.sound && cfg.sound.state === 4) {
                    if (app.Model.user.sounds.bg && !cfg.sound.gainNode) {
                        cfg.sound.fadeStart(app.Model.user.sounds.bg / 100);
                    }
                }
            }
        },
        _stopBG: function(alias) {
            let cfg = sounds.getCFG(alias);
            if (cfg.sound && cfg.sound.gainNode) {
                cfg.sound.fadeStop();
            }
        },
        playBG0: function(alias) {
            let cfg = sounds.getCFG(alias);
            if (cfg.sound) {
                if (cfg.sound.state === 4) {
                    app.EventDispatcher.dispatchEvent('sound play bg', alias);
                }
            } else {
                this.load([alias], null, null);
            }
        },
        _playEffects: function(type) {
            if (this.isAvailable()) {
                let cfg = sounds.getCFG(type);
                if (cfg.sound && cfg.sound.state === 4) {
                    if (app.Model.user.sounds.effects) {
                        if (type === 'click') {
                            cfg.sound.play(app.Model.user.sounds.effects / 100 * 0.7);
                        } else {
                            cfg.sound.play(app.Model.user.sounds.effects / 100);
                        }
                    }
                }
            }
        },

        settingsChanged: function() {
            let self = this;
            let us = app.Model.user.sounds;

            let alias;

            if (us.bg === 0) {
                self.stopBG1();
                self.stopBG2();
                self.stopBG3();
            } else if (app.Menu.isSelected(app.Menu.TYPE.GUILD)) {
                alias = 'bg3';
            } else {
                alias = 'bg1';
            }

            if (alias) {
                let cfg = sounds.getCFG(alias);
                if (cfg.sound) {
                    if (cfg.sound.state === 4) {
                        if (cfg.sound.gainNode) {
                            cfg.sound.gainNode.gain.value = us.bg / 100;
                        } else {
                            cfg.sound.fadeStart(us.bg / 100);
                        }
                    }
                } else {
                    self.playBG0(alias);
                }
            }
        },

        fixIOS: function() {
            // Create empty buffer
            try {
                if (!_audio_context) return;
                let buffer = _audio_context.createBuffer(1, 1, 22050);
                let source = _audio_context.createBufferSource();
                source.buffer = buffer;
                // Connect to output (speakers)
                source.connect(_audio_context.destination);
                // Play sound
                if (source.start) {
                    source.start(0);
                } else if (source.play) {
                    source.play(0);
                } else if (source.noteOn) {
                    source.noteOn(0);
                }
            } catch (e) {
                console.error('Error:', e.stack);
            }
        },

        pauseAllAudio: function() {
            this.stopBG1();
            this.stopBG2();
            this.stopBG3();
        },

        resumeAllAudio: function() {
            this.settingsChanged();
        }
    }
})();

// Expose pauseAllAudio and resumeAllAudio globally for external callers
window.pauseAllAudio = function() {
    if (app && app.SoundManager) {
        app.SoundManager.pauseAllAudio();
    }
};

window.resumeAllAudio = function() {
    if (app && app.SoundManager) {
        app.SoundManager.resumeAllAudio();
    }
};