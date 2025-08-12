 /**
 * --------------------------------------------------------------------
 * @description 通用组件。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */


/**
 * 切换标签页显示
 * @param {Event} evt - 点击事件对象。
 * @param {string} tabId - 要激活的目标标签页内容的ID。
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
 * 平滑地将页面滚动到顶部。
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * 显示一个短暂的通知消息 (Toast)。
 * @param {string} message - 要显示的消息内容。
 * @param {string} [type=''] -通知的类型，可选值: 'success', 'error', 'info'。
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

/**
 * 通用模态弹窗类 (Modal Class)
 */
class Modal {
    /**
     * @param {object} options - 弹窗配置
     * @param {string} options.id - 弹窗的唯一ID
     * @param {string} options.title - 弹窗的标题
     * @param {string|HTMLElement} [options.content=''] - 弹窗主体内容
     * @param {string|HTMLElement} [options.footer=''] - 弹窗页脚内容
     * @param {function} [options.onClose=null] - 弹窗关闭时的回调函数
     * @param {function} [options.onOpen=null] - 弹窗打开时的回调函数
     */
    constructor(options) {
        this.options = Object.assign({
            id: null,
            title: '',
            content: '',
            footer: '',
            onClose: null,
            onOpen: null
        }, options);

        this.modalElement = null;
        this._createModal();
        this._attachEventListeners();
    }

    /**
     * 内部方法：创建弹窗的HTML结构
     * @private
     */
    _createModal() {
        if (!this.options.id) {
            console.error('Modal ID is required.');
            return;
        }

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'modal-container';
        this.modalElement.id = this.options.id;
        this.modalElement.style.display = 'none';

        const modalHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${this.options.title}</h3>
                    <button type="button" class="modal-close-btn" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body"></div>
                ${this.options.footer ? '<div class="modal-footer"></div>' : ''}
            </div>
        `;
        this.modalElement.innerHTML = modalHTML;
        
        this.bodyElement = this.modalElement.querySelector('.modal-body');
        this.setBody(this.options.content);

        if (this.options.footer) {
            this.footerElement = this.modalElement.querySelector('.modal-footer');
            this.setFooter(this.options.footer);
        }

        document.body.appendChild(this.modalElement);
    }

    /**
     * 内部方法：为关闭按钮和遮罩层绑定关闭事件
     * @private
     */
    _attachEventListeners() {
        this.modalElement.querySelector('.modal-close-btn').addEventListener('click', () => this.close());
        this.modalElement.querySelector('.modal-overlay').addEventListener('click', () => this.close());
    }

    /** * 公共方法：打开弹窗
     */
    open() {
        this.modalElement.style.display = 'flex';
        setTimeout(() => this.modalElement.classList.add('active'), 10);
        if (typeof this.options.onOpen === 'function') {
            this.options.onOpen();
        }
    }

    /** * 公共方法：关闭弹窗 (已修复)
     */
    close() {
        if (this._isClosing) return;
        this._isClosing = true;
        this.modalElement.classList.remove('active');
        
        const handleTransitionEnd = () => {
            this.modalElement.style.display = 'none';
            this.modalElement.removeEventListener('transitionend', handleTransitionEnd);
            this._isClosing = false;
            
            if (typeof this.options.onClose === 'function') {
                this.options.onClose();
            }
        };

        this.modalElement.addEventListener('transitionend', handleTransitionEnd);

        setTimeout(handleTransitionEnd, this.options.animationDuration + 100);
    }

    /**
     * 公共方法：设置弹窗标题
     * @param {string} title - 新的标题
     */
    setTitle(title) {
        const titleEl = this.modalElement.querySelector('.modal-title');
        if (titleEl) titleEl.innerHTML = title;
    }

    /**
     * 公共方法：设置弹窗主体内容
     * @param {string|HTMLElement} content - 新的内容
     */
    setBody(content) {
        if (!this.bodyElement) return;
        this.bodyElement.innerHTML = '';
        if (typeof content === 'string') {
            this.bodyElement.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.bodyElement.appendChild(content);
        }
    }
    
    /**
     * 公共方法：设置弹窗页脚内容
     * @param {string|HTMLElement} footerContent - 新的页脚内容
     */
    setFooter(footerContent) {
        if (!this.footerElement) return;
        this.footerElement.innerHTML = '';
        if (typeof footerContent === 'string') {
            this.footerElement.innerHTML = footerContent;
        } else if (footerContent instanceof HTMLElement) {
            this.footerElement.appendChild(footerContent);
        }
    }
    
    /**
     * 公共方法：获取弹窗主体元素
     * @returns {HTMLElement}
     */
    getBodyElement() {
        return this.bodyElement;
    }
    
    /**
     * 公共方法：获取弹窗页脚元素
     * @returns {HTMLElement|undefined}
     */
    getFooterElement() {
        return this.footerElement;
    }

    /**
     * 公共方法：销毁弹窗并从DOM中移除
     */
    destroy() {
        if (this.modalElement) {
            document.body.removeChild(this.modalElement);
            this.modalElement = null;
        }
    }
}

/**
 * 显示一个可配置的、返回Promise的异步对话框。(已修复)
 * @param {object} options - 对话框配置
 * @param {string} options.title - 标题
 * @param {string} options.message - 显示的文本消息
 * @param {string} [options.type='alert'] - 类型: 'alert', 'confirm', 'prompt'
 * @param {string} [options.placeholder=''] - 输入框的占位符 (仅 prompt 类型有效)
 * @param {string} [options.okText='确认'] - 确认按钮的文本
 * @param {string} [options.cancelText='取消'] - 取消按钮的文本
 * @returns {Promise<string|boolean>} - confirm类型resolve(true), prompt类型resolve(inputValue), alert类型resolve()。取消则reject。
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
            overlay.classList.remove('visible');
            const handleTransitionEnd = () => {
                overlay.removeEventListener('transitionend', handleTransitionEnd);
                overlay.remove(); 
                if (reason === 'resolve') {
                    const result = config.type === 'prompt' ? inputElement.value : true;
                    resolve(result);
                } else {
                    reject();
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