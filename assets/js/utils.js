 /**
 * --------------------------------------------------------------------
 * @description 通用组件。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */

/**
 * 切换标签页显示
 */
function openTab(evt, tabId) {
    const clickedButton = evt.currentTarget;
    const buttonContainer = clickedButton.parentElement;
    if (!buttonContainer) return;

    const buttons = buttonContainer.querySelectorAll(`.${clickedButton.classList[0]}`);
    buttons.forEach(btn => btn.classList.remove('active'));

    const contentParent = buttonContainer.parentElement;
    const contentClass = clickedButton.classList[0].replace('-btn', '-content');
    if (contentParent) {
        contentParent.querySelectorAll(`:scope > .${contentClass}`).forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active');
        });
    }

    clickedButton.classList.add('active');
    
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
        tabElement.style.display = 'block';
        tabElement.classList.add('active');

        const nestedActiveButton = tabElement.querySelector('.tab-btn.active');
        if (nestedActiveButton) {
            const onclickAttr = nestedActiveButton.getAttribute('onclick');
            if (onclickAttr) {
                const nestedContentId = onclickAttr.match(/'([^']*)'/)[1];
                const nestedContentElement = document.getElementById(nestedContentId);
                if (nestedContentElement) {
                    nestedContentElement.style.display = 'block';
                    nestedContentElement.classList.add('active');
                }
            }
        }
        document.querySelector('.tab-btn.active')?.click();
    }
}


/**
 * 显示一个短暂的通知消息 (Toast)。
 */
function showToast(message, type = '') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}


const activeModals = {}; // 存放弹窗实例

/**
 * 通用模态弹窗类 (Modal Class)
 */
class Modal {
    constructor(options) {
        this.options = Object.assign({
            title: 'Modal',
            content: '',
            footer: '',
            id: null,
            width: '650px',
            height: '60%',
            resizable: true,
            showMax: true,
            showMin: true,
            showFull: true,
            onClose: null,
        }, options);

        this.winboxInstance = null;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        this.resizeHandler = this._handleResize.bind(this);
        
        this.open();
    }

    _handleResize() {
        if (this.winboxInstance && this.isMobile) {
            this.winboxInstance.resize('100%', '100%').move('center', 'center');
        }
    }

    open() {
        if (this.winboxInstance) {
            this.winboxInstance.focus();
            return this;
        }
        document.body.classList.add('body-lock-scroll');
        let controlClasses = [];
        if (!this.options.showMax) controlClasses.push('no-max');
        if (!this.options.showMin) controlClasses.push('no-min');
        if (!this.options.showFull) controlClasses.push('no-full');

        const winboxParams = {
            id: this.options.id,
            title: this.options.title,
            class: ["modal-winbox", ...controlClasses],
            x: 'center',
            y: 'center',
            width: this.isMobile ? '100%' : this.options.width,
            height: this.isMobile ? '100%' : this.options.height,
            resize: this.isMobile ? false : this.options.resizable,
            onclose: () => {
                document.body.classList.remove('body-lock-scroll');

                if (this.isMobile) {
                    window.removeEventListener('resize', this.resizeHandler);
                }
                if (typeof this.options.onClose === 'function') {
                    this.options.onClose();
                }
                if (this.options.id) {
                    delete activeModals[this.options.id];
                }
                this.winboxInstance = null;
                return false;
            }
        };
        
        if (typeof this.options.content === 'string' && (this.options.content.startsWith('http') || this.options.content.startsWith('/') || this.options.content.startsWith('index.php'))) {
            winboxParams.url = this.options.content;
        } else {
            const mainContentHtml = `<div class="modal-main-content">${this.options.content || ''}</div>`;
            const footerHtml = `<div class="modal-footer">${this.options.footer || ''}</div>`;
            winboxParams.html = mainContentHtml + footerHtml;
        }

        this.winboxInstance = new WinBox(winboxParams);
        if (this.options.id) {
            activeModals[this.options.id] = this;
        }

        if (this.isMobile) {
            window.addEventListener('resize', this.resizeHandler);
        }

        return this;
    }
    
    close() {
        if (this.winboxInstance) {
            this.winboxInstance.close();
        }
    }
    
    getBodyElement() {
        return this.winboxInstance?.body.querySelector('.modal-main-content');
    }

    getFooterElement() {
        return this.winboxInstance?.body.querySelector('.modal-footer');
    }

    maximize() {
        this.winboxInstance?.maximize();
        return this;
    }
}

/**
 * @description 通过ID关闭一个WinBox窗口
 */
function closeModalById(id) {
    const modalInstance = activeModals[id];
    if (modalInstance) {
        modalInstance.close();
    }
}

/**
 * 显示一个可配置的、返回Promise的异步对话框。
 */
function showDialog(options) {
    const config = Object.assign({
        title: '',
        message: '',
        type: 'alert',
        placeholder: '',
        okText: '确认',
        cancelText: '取消',
    }, options);

    return new Promise((resolve, reject) => {
        document.body.classList.add('body-lock-scroll');
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        let inputHtml = '';
        if (config.type === 'prompt') {
            inputHtml = `<input type="text" class="dialog-input" placeholder="${config.placeholder}">`;
        }

        let buttonsHtml = `<button class="btn primary-btn ok-btn">${config.okText}</button>`;
        if (config.type === 'confirm' || config.type === 'prompt') {
            buttonsHtml = `<button class="btn secondary-btn cancel-btn">${config.cancelText}</button>` + buttonsHtml;
        }

        const dialogHtml = `
            <div class="dialog-container" role="dialog" aria-modal="true" tabindex="-1">
                <div class="dialog-header">${config.title}</div>
                <div class="dialog-body">
                    <p>${config.message}</p>
                    ${inputHtml}
                </div>
                <div class="dialog-footer">${buttonsHtml}</div>
            </div>
        `;
        overlay.innerHTML = dialogHtml;
        document.body.appendChild(overlay);

        const dialogContainer = overlay.querySelector('.dialog-container');
        const inputElement = overlay.querySelector('.dialog-input');
        const okBtn = overlay.querySelector('.ok-btn');
        const cancelBtn = overlay.querySelector('.cancel-btn');

        const closeDialog = (reason) => {
            document.body.classList.remove('body-lock-scroll');
            overlay.classList.remove('visible');
            const handleTransitionEnd = () => {
                overlay.removeEventListener('transitionend', handleTransitionEnd);
                overlay.remove(); 
                if (reason === 'resolve') {
                    const result = config.type === 'prompt' ? inputElement.value : true;
                    resolve(result);
                } else {
                    reject(new Error('Dialog cancelled by user.'));
                }
            };
            overlay.addEventListener('transitionend', handleTransitionEnd);
        };

        if (okBtn) {
            okBtn.addEventListener('click', () => closeDialog('resolve'));
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closeDialog('reject'));
        }
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog('reject');
            }
        });

        setTimeout(() => {
            overlay.classList.add('visible');
            dialogContainer.focus();
            if(inputElement) inputElement.focus();
        }, 10);
    });
}

/**
 * @description 注册通用的 Ctrl+S 保存快捷键。
 * @param {function} onSave - 当用户按下 Ctrl+S 时要执行的回调函数。
 */
function setupSaveShortcut(onSave) {
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault(); // 阻止浏览器默认的“保存网页”行为
            if (typeof onSave === 'function') {
                onSave();
            }
        }
    });
}

/**
 * 计算字符串的MD5哈希值。
 * @param {string} string - 需要进行哈希计算的原始字符串。
 * @param {object} [options={}] - 一个可选的配置对象。
 * @param {boolean} [options.pretty=false] - 如果为 true，则将输出格式化为大写，并每8个字符用连字符(-)分隔。
 * @returns {string} 计算出的32位十六进制MD5哈希值。
 */
function md5(string, options = {}) {
    function rotateLeft(lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }

    function addUnsigned(lX, lY) {
        let lX4, lY4, lX8, lY8, lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }
        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            } else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        } else {
            return (lResult ^ lX8 ^ lY8);
        }
    }

    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }

    function FF(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function GG(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function HH(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function II(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(string) {
        let lWordCount;
        const lMessageLength = string.length;
        const lNumberOfWords_temp1 = lMessageLength + 8;
        const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
        const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        let lWordArray = Array(lNumberOfWords - 1);
        let lBytePosition = 0;
        let lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    }

    function wordToHex(lValue) {
        let WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
        }
        return WordToHexValue;
    }

    let x = Array();
    let k, AA, BB, CC, DD, a, b, c, d;
    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    x = convertToWordArray(string);
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

    for (k = 0; k < x.length; k += 16) {
        AA = a; BB = b; CC = c; DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
        d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
        c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
        b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
        a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
        d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
        c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
        b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
        a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
        d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
        c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
        b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
        a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
        d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
        c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
        b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
        a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
        d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
        c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
        b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
        a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
        d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
        c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
        b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
        a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
        d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
        c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
        b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
        a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
        d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
        c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
        b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
        a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
        d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
        c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
        b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
        a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
        d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
        c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
        b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
        a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
        d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
        c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
        b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
        a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
        d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
        c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
        b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
        a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
        d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
        c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
        b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
        a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
        d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
        c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
        b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
        a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
        d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
        c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
        b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
        a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
        d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
        c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
        b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
        a = addUnsigned(a, AA);
        b = addUnsigned(b, BB);
        c = addUnsigned(c, CC);
        d = addUnsigned(d, DD);
    }

    let result = (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
    
    if (options.pretty) {
        result = result.toUpperCase().replace(/(.{8})(?!$)/g, '$1-');
    }

    return result;
}

/**
 * 平滑地将页面滚动到顶部。
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const scrollTopBtn = document.getElementById('scrollToTopBtn');
    if (!scrollTopBtn) return;

    scrollTopBtn.addEventListener('click', scrollToTop);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    }, { passive: true });
});
