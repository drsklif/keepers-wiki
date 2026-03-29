app.TimeUtil = (function() {
    var S_MS = 1000;
    var M_MS = S_MS * 60;
    var H_MS = M_MS * 60;
    var D_MS = H_MS * 24;
    var W_MS = D_MS * 7;

    var _now = 0;
    var _start = 0;
    var _server = {time: 0};

    return {
        S_MS: S_MS,
        M_MS: M_MS,
        H_MS: H_MS,
        D_MS: D_MS,
        W_MS: W_MS,

        init: function(server) {
            _server = server;
            _start = Date.now();
        },

        update: function() {
            _now = _server.time + (Date.now() - _start);
        },

        _update: function(server) {
            _server = server;
            _start = Date.now();
        },

        now: function() {
            return _now;
        },

        _parseTime: function(time) {
            let d = 0;
            let h = 0;
            let m = 0;
            let s = 0;
            if (time >= D_MS) {
                d = Math.floor(time / D_MS);
                time = time % D_MS;
            }
            if (time >= H_MS) {
                h = Math.floor(time / H_MS);
                time = time % H_MS;
            }
            if (time >= M_MS) {
                m = Math.floor(time / M_MS);
                time = Math.floor(time % M_MS);
            }
            if (time >= S_MS) {
                s = Math.ceil(time / S_MS);
            }
            return {d: d, h: h, m: m, s: s};
        },

        formatToHumanTime: function (time, deep) {
            deep = deep || 3;
            let data = this._parseTime(time);
            let d = data.d;
            let h = data.h;
            let m = data.m;
            let s = data.s;

            let str;

            if (d > 0) {
                str = d + 'д';
                deep--;
            }
            if (deep > 0 && h > 0) {
                if (str) {
                    str += ' ' + h + 'ч';
                } else {
                    str = h + 'ч';
                }
                deep--;
            }
            if (deep > 0 && m > 0) {
                if (str) {
                    str += ' ' + m + 'м';
                } else {
                    str = m + 'м';
                }
                deep--;
            }
            if (deep > 0 && s > 0) {
                if (str) {
                    str += ' ' + s + 'с';
                } else {
                    str = s + 'с';
                }
            }
            if (!str) {
                str = '< 1c';
            }
            return str;
        },

        formatClockTime: function(time, deep) {
            time = this._getMoscowTime(time);

            let h = time.getHours();
            let m = time.getMinutes();
            let s = time.getSeconds();

            let str;

            deep = deep || 3;

            str = h < 10 ? '0' + h : h;
            if (deep > 1) str += ':' + (m < 10 ? '0' + m : m);
            if (deep > 2) str += ':' + (s < 10 ? '0' + s : s);

            return str;
        },

        getDaisDif: function(time1, time2) {
            let d1 = this._getMoscowTime(time1);
            let d2 = this._getMoscowTime(time2);
            let dif = d2.getTime() - d1.getTime();
            return Math.floor(dif / D_MS);
        },

        isSameDay: function(time1, time2) {
            //let d1 = this._getMoscowTime(time1);
            let d1 = new Date();
            d1.setTime(time1);
            this.resetDate(d1);

            let d2 = new Date();
            d2.setTime(time2);
            this.resetDate(d2);

            return d1.getTime() === d2.getTime();
        },

        isSameYear(time1, time2) {
            let d1 = new Date();
            d1.setTime(time1);

            let d2 = new Date();
            d2.setTime(time2);

            return d1.getFullYear() === d2.getFullYear();
        },

        resetDate: function(date) {
            date.setHours(0, 0, 0, 0);
            return date;
        },

        isSunday: function(time) {
            return this.isDay(time, 0);
        },

        isSaturday: function(time) {
            return this.isDay(time, 6);
        },

        isDay: function(time, day) {
            return new Date(time).getDay() === day;
        },

        // https://stackoverflow.com/questions/7971813/get-helsinki-local-time-regardless-of-local-time-zone
        _getMoscowTime: function(time) {
            let date = new Date();
            date.setTime(time
                                + (date.getTimezoneOffset() * 60000) // local offset
                                + (H_MS * 3)); // target offset
            return date;
        }
    }
})();