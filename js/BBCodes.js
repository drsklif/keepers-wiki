app.BBCodes = (function() {
    function BBException(code, message) {
        this.name = 'BBException';
        this.code = code;
        this.message = message;
        this.stack = (new Error()).stack;
    }
    BBException.prototype = Object.create(Error.prototype);
    BBException.prototype.constructor = BBException;

    function process(src) {
        let codes = [];

        try {
            process0(src, codes, null, 0);
        } catch (e) {
            console.error(e);
            return src;
        }

        let map1 = {};
        let map2 = {};

        try {
            for (let i = 0; i < codes.length; i++) {
                let code = codes[i];
                map1[code.s0] = code;
                if (!code.e0) {
                    if ('hr' === code.name) {
                    } else {
                        throw new BBException(-1, "BB code close error. Code '" + code.name + "' must be closed");
                    }
                } else {
                    map2[code.e0] = code;
                }
            }
        } catch (e) {
            console.error(e);
            return src;
        }

        let result = '';
        for (let i = 0; i < src.length; i++) {
            let code = map1[i];
            if (code != null) {
                result += getCodeReplacementStart(code);
                i = code.s1;
                continue;
            } else {
                code = map2[i];
                if (code != null) {
                    result += getCodeReplacementEnd(code);
                    i = code.e1;
                    continue;
                }
            }
            result += src.charAt(i);
        }
        return result;
    }

    function process0(src, codes, parent, start) {
        for (let i = start; i < src.length; i++) {
            let c = src.charAt(i);
            if (c === '[') {
                let s0 = i;
                let s1 = -1;
                while (++i < src.length) {
                    if (src.charAt(i) === ']') {
                        s1 = i;
                        break;
                    }
                }

                let data = src.substring(s0 + 1, s1);

                // единственный закрывающийся бб код - тот, в обработку которого мы провалились
                if (data.charAt(0) === '/') {
                    let name = data.substring(1, data.length);
                    if (isTagSupported(name)) {
                        if (parent == null) {
                            throw new BBException(-1, "BB code close error. Tag '" + name + "'is not open");
                        }
                        if (name !== parent.name) {
                            throw new BBException(-1, "BB code close error. Waiting for closing '" + parent.name + "' tag");
                        }
                        parent.e0 = s0;
                        parent.e1 = s1;
                    }
                    break;
                } else {
                    let code = {
                        addParam: function(key, value) {
                            if (!this.params) this.params = {};
                            this.params[key] = value;
                        },
                        addChild: function(child) {
                            if (!this.children) this.children = [];
                            this.children.push(child);
                        }
                    };
                    code.s0 = s0;
                    code.s1 = s1;
                    parseCodeName(code, data);
                    if (isTagSupported(code.name)) {
                        codes.push(code);
                        if (parent != null) {
                            code.parent = parent;
                            parent.addChild(code);
                        }
                        // проваливаемся в обработку бб кода
                        if ('hr' === code.name || 'user' === code.name || 'topic' === code.name || 'comment' === code.name) {
                        } else {
                            process0(src, codes, code, s1 + 1);
                            i = code.e0 + 1;
                        }
                    }
                }
            }
        }
    }

    function parseCodeName(code, data) {
        for (let i = 0; i < data.length; i++) {
            let c = data.charAt(i);
            if (c === ' ') {
                if (code.name == null) {
                    code.name = data.substring(0, i);
                }
            } else if (c === '=') {
                if (code.name == null) {
                    code.name = data.substring(0, i);
                    code.addParam(code.name, readForward(data, code.name.length, [' ', '=']));
                } else {
                    code.addParam(readBack(data, i, ' ', '='), readForward(data, i, [' ', '=']));
                }
            }
        }
        if (code.name == null) {
            code.name = data.substring(0, data.length);
        }
    }

    function readForward(src, start, stopChars) {
        for (let i = start + 1; i < src.length; i++) {
            let c = src.charAt(i);
            for (let j = 0; j < stopChars.length; j++) {
                if (c === stopChars[j]) {
                    return src.substring(start + 1, i);
                }
            }
        }
        return src.substring(start + 1, src.length);
    }

    function readBack(src, start, stopChars) {
        for (let i = start - 1; i >= 0; i--) {
            let c = src.charAt(i);
            for (let j = 0; j < stopChars.length; j++) {
                if (c === stopChars[j]) {
                    return src.substring(i + 1, start);
                }
            }
        }
        return src.substring(0, start);
    }

    function getCodeReplacementStart(code) {
        switch (code.name) {
            case 'b': return "<span class='str'>";
            case 'p': return "<p class='chat_message_p'>";
            case 'i': return "<span class='italic'>";
            case 'u': return "<span class='tdu'>";
            case 's': return "<span class='tds'>";
            case 'small': return "<span class='small_text'>";
            case 'big': return "<span class='big_text'>";
            case 'right': return "<div class='tright'>";
            case 'center': return "<div class='cntr'>";
            case 'sup': return "<sup>";
            case 'sub': return "<sub>";
            case 'q': return "<div class='blockquote-wrapper'><div class='blockquote'><div>";

            case 'color': {
                if (code.params != null && code.params.color) {
                    return "<span style='color: " + code.params.color + "'>";
                } else {
                    return '<span>';
                }
            }

            case 'bg': {
                if (code.params != null && code.params.bg) {
                    return "<span style='background-color: " + code.params.bg + "'>";
                } else {
                    return '<span>';
                }
            }

            case 'hr': {
                if (code.params != null && code.params.color) {
                    return "<div class='hr_forum' style='background: " + code.params.color + "'></div>";
                }
                return "<div class='hr_forum'></div>";
            }

            case 'ul': return "<ul class='ul_forum'>";
            case 'ol': return "<ol class='ol_forum'>";
            case '*': return "<li>";

            case 'a': {
                if (code.params != null && code.params.href) {
                    let a = "<a href=\"" + code.params.href + "\"";
                    if (code.params.target) {
                        a += " target=\"" + code.params.target + "\"";
                    }
                    if (code.params.style) {
                        a += " style=\"" + code.params.style + "\"";
                    }
                    a += '>';
                    return a;
                }
                return '[a]';
            }
        }
    }

    function getCodeReplacementEnd(code) {
        switch (code.name) {
            case 'b':
            case 'i':
            case 'u':
            case 's':
            case 'small':
            case 'big':
            case 'color':
            case 'bg':
                return "</span>";

            case 'p':
                return "</p>";

            case 'right':
            case 'center':
                return "</div>";

            case 'sup': return "</sup>";
            case 'sub': return "</sub>";

            case 'q': return "</div></div></div>";

            case 'ul': return "</ul>";
            case 'ol': return "</ol>";
            case '*': return "</li>";

            case 'a': return '</a>';
        }
    }

    function isTagSupported(name) {
        switch (name) {
            case 'b':
            case 'p':
            case 'i':
            case 'u':
            case 's':
            case 'small':
            case 'big':
            case 'color':
            case 'bg':
            case 'right':
            case 'center':
            case 'hr':
            case 'sup':
            case 'sub':
            case 'q':
            case 'ul':
            case 'ol':
            case '*':
            case 'a':
                return true;
        }
    }

    return {
        process: process
    };
})();