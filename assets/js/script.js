/**
 * --------------------------------------------------------------------
 * @description 项目前端核心文件，文件负责处理TVbox规则编辑器的所有前端逻辑，包括表单渲染、数据处理、
 * 规则测试、弹窗管理以及与服务器的交互。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */

let currentInputEle;
window.globalVariables = {};
let tempDetailPageUrl = '';
let testResultsCache = [];
let isHtmlMode = false;
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const PC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36';

const jsoupToggleMap = {
    'home': '首页片单是否Jsoup写法',
    'category-rules-basic': '分类片单是否Jsoup写法',
    'detail': '详情是否Jsoup写法',
    'play': '选集标题链接是否Jsoup写法',
    'search': '搜索片单是否Jsoup写法'
};

/**
 * 编译并渲染 Handlebars 模板。
 * @param {string} templateId - 模板的 script 标签ID。
 * @param {object} [data={}] - 渲染模板所需的数据对象。
 * @returns {string} 渲染后的HTML字符串，如果模板未找到则返回空字符串。
 */
function renderTemplate(templateId, data = {}) {
    const source = document.getElementById(templateId)?.innerHTML;
    if (!source) {
        console.error(`Template with ID '${templateId}' not found.`);
        return '';
    }
    const template = Handlebars.compile(source);
    return template(data);
}

/**
 * 解析JSON格式的规则内容并填充到表单中。
 * @param {string} content - 包含规则的JSON格式字符串。
 */
function parseAndRenderRules(content) {
    try {
        let cleanedContentLines = content.split('\n').filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('/*'));
        let cleanedContent = cleanedContentLines.join('\n');
        cleanedContent = cleanedContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        cleanedContent = cleanedContent.replace(/^\s*[\r\n]/gm, '');

        let rules;
        try {
            rules = JSON.parse(cleanedContent);
        } catch (err) {
            let aggressiveContent = cleanedContent.replace(/,\s*([}\]])/g, '$1');
            rules = JSON.parse(aggressiveContent);
        }

        fillForm(rules);
        showToast('规则内容加载成功！', 'success');
    } catch (error) {
        console.error('解析JSON文件失败:', error);
        showToast('规则内容加载失败，请检查文件格式。', 'error');
    }
}

/**
 * 从表单中收集所有数据并组装成一个JSON对象。
 * @returns {object} 包含所有表单数据的的对象。
 */
function collectFormDataIntoJson() {
    const form = document.getElementById('ruleForm');
    const inputs = form.querySelectorAll('input, textarea');
    const data = {};

    // 基础字段
    inputs.forEach(input => {
        if (input.id && input.value) {
            // 对于筛选数据，尝试解析为JSON对象
            if (input.id === '筛选数据') {
                try {
                    data[input.id] = JSON.parse(input.value);
                } catch (e) {
                    data[input.id] = input.value; // 解析失败则存为字符串
                }
            } else {
                data[input.id] = input.value;
            }
        }
    });
    
    return data;
}

/**
 * 页面加载完成后的主入口函数。
 */
document.addEventListener('DOMContentLoaded', () => {
    /**
     * DOM加载完毕后执行的匿名函数，负责初始化页面、实例化组件和绑定事件。
     */
    if (typeof formFieldsData === 'undefined') {
        console.error('el.js 未能成功加载，无法渲染表单。');
        alert('核心数据文件 el.js 加载失败，请检查文件路径或网络连接。');
        return;
    }
    Handlebars.registerHelper('eq', (a, b) => a === b);

    // 使用事件委托处理弹窗内的按钮点击
    document.body.addEventListener('click', (event) => {
        if (event.target.id === 'manualTestBtn') manualRunTest();
        if (event.target.id === 'applySelectorBtn') applySelectorToField();
        if (event.target.id === 'toggleSourceBtn') {
            const sourceTextarea = document.getElementById('sourceHtmlInput');
            if(sourceTextarea) sourceTextarea.style.display = sourceTextarea.style.display === 'none' ? 'block' : 'none';
        }
        if (event.target.id === 'saveVariablesBtn') saveVariables();
        if (event.target.id === 'toggleResultModeBtn') toggleResultMode();
    });

    document.getElementById('autoTestBtn').addEventListener('click', startAutomatedTest);
    
    document.getElementById('variableBtn').addEventListener('click', () => {
        new Modal({
            id: 'variableModal',
            title: '设置变量默认值',
            content: renderTemplate('variable-modal-template'),
            footer: '<button id="saveVariablesBtn" class="btn primary-btn">保存</button>'
        });
    
        setTimeout(() => {
            const inputsContainer = document.getElementById('variableInputs');
            if(!inputsContainer) return;
            inputsContainer.innerHTML = '';
            
            const allVariables = ['wd', 'SearchPg', 'cateId', 'class', 'area', 'year', 'lang', 'by', 'catePg'];
            allVariables.forEach(v => {
                const div = document.createElement('div');
                div.className = 'form-group';
                const label = document.createElement('label');
                label.innerText = `{${v}}`;
                label.setAttribute('for', `var-${v}`);
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `var-${v}`;
                input.setAttribute('data-variable-name', v);
                input.value = window.globalVariables[v] || '';
                div.appendChild(label);
                div.appendChild(input);
                inputsContainer.appendChild(div);
            });
        }, 100);
    });

    // document.getElementById('helpBtn').addEventListener('click', () => {
    //     new Modal({
    //         id: 'helpModal',
    //         title: 'TVbox规则语法帮助',
    //         content: renderTemplate('help-modal-template')
    //     });
    // });
    
    document.getElementById('saveBtn').addEventListener('click', () => {
        if (!filePathFromServer) {
            showToast('文件路径未知，无法保存。', 'error');
            return;
        }
        
        const jsonData = collectFormDataIntoJson();
        const fileContent = JSON.stringify(jsonData, null, 2);

        const formData = new FormData();
        formData.append('filePath', filePathFromServer);
        formData.append('fileContent', fileContent);

        showToast('正在保存...', 'info');
        fetch('/index.php/Edit/save', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                showToast(result.message, 'success');
            } else {
                throw new Error(result.message);
            }
        })
        .catch(err => {
            showToast(`保存失败: ${err.message}`, 'error');
        });
    });

    document.getElementById('editBtn').addEventListener('click', 
        () => {
            const urlParams = new URLSearchParams(window.location.search);
            const file = urlParams.get('file');
            window.open('/index.php/Edit?file=' + file + '&api=editor', '_blank')
        }
    );

    document.addEventListener('input', (event) => {
        if (event.target.closest('#ruleForm') || event.target.closest('#testModal') || event.target.closest('#variableModal')) {
            if (event.target.id && event.target.id.startsWith('var-')) {
                return;
            }
            saveFormData();
        }
    });
    
    renderForm();
    loadVariables();
    
    if (typeof fileContentFromServer !== 'undefined' && fileContentFromServer && !fileContentFromServer.startsWith('错误：')) {
        parseAndRenderRules(fileContentFromServer);
    } else if (typeof fileContentFromServer !== 'undefined') {
        alert(fileContentFromServer);
    } else {
        loadFormData();
    }
    
    setupSaveShortcut(() => {
        const saveButton = document.getElementById('saveBtn');
        if (saveButton) {
            saveButton.click();
        }
    });
});

/**
 * 根据 formFieldsData 渲染整个表单结构。
 */
function renderForm() {
    const fieldTemplate = Handlebars.compile(document.getElementById('form-field-template').innerHTML);

    const renderTabContent = (tabId, fields) => {
        const container = document.getElementById(tabId);
        if (!container) return;

        let html = '';
        fields.forEach(field => {
            html += fieldTemplate(field);
        });
        container.innerHTML = html;
        
        // 渲染完成后，为需要复杂交互的按钮绑定事件
        fields.forEach(field => {
            const formGroup = container.querySelector(`[for="${field.id}"]`)?.parentElement;
            if (!formGroup) return;

            const buttonContainer = formGroup.querySelector('.input-with-buttons');
            
            if (field.test_btn) {
                const testBtn = document.createElement('button');
                testBtn.type = 'button';
                testBtn.className = 'btn secondary-btn btn-sm';
                testBtn.innerText = '测试';
                testBtn.onclick = () => openTestModal(field.id);
                buttonContainer.appendChild(testBtn);
            }
    
            if (field.var_btn) {
                const varBtn = document.createElement('button');
                varBtn.type = 'button';
                varBtn.className = 'btn secondary-btn btn-sm';
                varBtn.innerText = '变量';
                varBtn.onclick = () => toggleAccordion(field.id, field.var_btn);
                buttonContainer.appendChild(varBtn);
            }
        });
    };

    for (const tabName in formFieldsData) {
        if (tabName === 'category') {
            renderTabContent('category-rules-basic', formFieldsData.category.rules);
            renderTabContent('category-filter-menu', formFieldsData.category.filters);
        } else {
            renderTabContent(tabName, formFieldsData[tabName]);
        }
    }
}

/**
 * 将字段渲染到指定的子标签页容器中。
 * @param {string} containerId - 容器元素的ID。
 * @param {Array<object>} fields - 要渲染的字段定义数组。
 */
function renderSubTabFields(containerId, fields) {
    const container = document.getElementById(containerId);
    if (container) {
        renderFieldsToContainer(container, fields);
    }
}

/**
 * 将一组字段渲染到指定的容器元素中。
 * @param {HTMLElement} container - 目标容器元素。
 * @param {Array<object>} fields - 要渲染的字段定义数组。
 */
function renderFieldsToContainer(container, fields) {
    container.innerHTML = '';
    fields.forEach(field => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        if (field.isAdvanced) {
            formGroup.classList.add('advanced-field');
        }

        const label = document.createElement('label');
        label.setAttribute('for', field.id);
        label.innerText = field.key;

        const input = field.type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
        input.type = field.type || 'text';
        input.id = field.id;
        input.name = field.id;

        formGroup.appendChild(label);
        formGroup.appendChild(input);

        if (field.test_btn) {
            const testBtn = document.createElement('button');
            testBtn.type = 'button';
            testBtn.className = 'test-btn';
            testBtn.innerText = '测试';
            testBtn.onclick = () => openTestModal(field.id);
            formGroup.appendChild(testBtn);
        }

        if (field.var_btn) {
            const varBtn = document.createElement('button');
            varBtn.type = 'button';
            varBtn.className = 'var-btn';
            varBtn.innerText = '变量';
            varBtn.onclick = () => toggleAccordion(field.id, field.var_btn);
            formGroup.appendChild(varBtn);
        }

        container.appendChild(formGroup);
    });
}

/**
 * 切换高级/普通模式。
 */
function toggleAdvancedMode() {
    const body = document.body;
    const btn = document.getElementById('advancedModeBtn');
    const isActive = body.classList.toggle('advanced-mode-active');
    btn.classList.toggle('active', isActive);
    btn.innerText = isActive ? '高级模式' : '普通模式';
    localStorage.setItem('tvbox_advanced_mode', isActive);

    if (isActive) {
        showToast('已切换至高级模式', 'info');
    } else {
        showToast('已切换至普通模式', 'info');
    }
}

/**
 * 从localStorage加载高级模式状态。
 */
function loadAdvancedModeState() {
    const isActive = localStorage.getItem('tvbox_advanced_mode') === 'true';
    const body = document.body;
    const btn = document.getElementById('advancedModeBtn');
    if (isActive) {
        body.classList.add('advanced-mode-active');
        btn.classList.add('active');
        btn.innerText = '高级模式';
    } else {
        body.classList.remove('advanced-mode-active');
        btn.classList.remove('active');
        btn.innerText = '普通模式';
    }
}

/**
 * 将当前表单数据保存到localStorage。
 */
function saveFormData() {
    const formInputs = document.querySelectorAll('#ruleForm input, #ruleForm textarea');
    const formData = {};
    formInputs.forEach(input => {
        if (input.id) {
            formData[input.id] = input.value;
        }
    });
    localStorage.setItem('tvbox_form_data', JSON.stringify(formData));
}

/**
 * 从localStorage加载并填充表单数据。
 */
function loadFormData() {
    const savedData = localStorage.getItem('tvbox_form_data');
    if (savedData) {
        try {
            const formData = JSON.parse(savedData);
            for (const key in formData) {
                const input = document.getElementById(key);
                if (input) {
                    input.value = formData[key];
                }
            }
        } catch (e) {
            console.error('加载本地表单数据失败:', e);
        }
    }
}

/**
 * 使用给定的规则对象填充表单。
 * @param {object} rules - 从JSON文件解析出的规则对象。
 */
function fillForm(rules) {
    for (const key in rules) {
        const input = document.getElementById(key);
        if (input) {
            if (key === '筛选数据' && typeof rules[key] === 'object') {
                input.value = JSON.stringify(rules[key], null, 2);
            } else {
                input.value = rules[key];
            }
        }
    }
    saveFormData();
}

/**
 * 切换分类页面下的子标签页。
 * @param {Event} evt - 点击事件对象。
 * @param {string} tabName - 要显示的目标子标签页内容ID。
 */
function openSubTab(evt, tabName) {
    const tabContents = document.querySelectorAll('#category .sub-tab-content');
    tabContents.forEach(tab => tab.style.display = "none");

    const tabButtons = document.querySelectorAll('#category .sub-tabs .sub-tab-btn');
    tabButtons.forEach(btn => btn.classList.remove("active"));

    const tabElement = document.getElementById(tabName);
    if (tabElement) {
        tabElement.style.display = "block";
    }
    evt.currentTarget.classList.add("active");
}

/**
 * 解析请求头参数字符串。
 * @param {string} headerString - 格式化的请求头字符串。
 * @returns {object} 解析后的请求头对象。
 */
function parseHeaders(headerString) {
    const headers = {};
    if (!headerString) return headers;
    const trimmed = headerString.trim();
    if (trimmed === '手机' || trimmed === 'MOBILE_UA') {
        headers['User-Agent'] = MOBILE_UA;
        return headers;
    }
    if (trimmed === '电脑' || trimmed === 'PC_UA') {
        headers['User-Agent'] = PC_UA;
        return headers;
    }
    const pairs = trimmed.split('#');
    pairs.forEach(pair => {
        if (pair.includes('$')) {
            const parts = pair.split('$');
            const key = parts.shift().trim();
            const value = parts.join('$').trim();
            if (key && value) {
                headers[key] = value;
            }
        }
    });
    return headers;
}

/**
 * 根据字段ID查找其在 formFieldsData 中的定义。
 * @param {string} fieldId - 字段的ID。
 * @returns {object|null} 找到的字段定义对象，或null。
 */
function findFieldById(fieldId) {
    for (const tabKey in formFieldsData) {
        const tabData = formFieldsData[tabKey];
        let fields = [];
        if (Array.isArray(tabData)) {
            fields = tabData;
        } else if (typeof tabData === 'object' && tabData !== null) {
            if (tabData.rules) fields.push(...tabData.rules);
            if (tabData.filters) fields.push(...tabData.filters);
        }
        const foundField = fields.find(field => field.id === fieldId);
        if (foundField) {
            return foundField;
        }
    }
    return null;
}

/**
 * 准备并打开测试弹窗。
 * @param {string} key - 触发测试的输入框ID。
 */
async function openTestModal(key) {
    currentInputEle = document.getElementById(key);
    if (!currentInputEle) {
        console.error("无法找到元素: ", key);
        return;
    }
    
    const fieldDef = findFieldById(key);
    
    new Modal({
        id: 'testModal',
        title: '测试：' + (fieldDef ? fieldDef.key : 'CSS选择器'),
        content: renderTemplate('test-modal-template'),
        footer: '<button id="manualTestBtn" class="btn primary-btn">运行测试</button>',
        width: '700px',
        height: '80%'
    });

    // 延迟以确保DOM元素已创建
    setTimeout(async () => {
        document.getElementById('testSelectorInput').value = currentInputEle.value;
        document.getElementById('testResultContent').innerHTML = '';
        const resultContainer = document.querySelector('.test-result-container');
        if(resultContainer) resultContainer.style.display = 'none';
        
        testResultsCache = [];
        isHtmlMode = false;
        document.getElementById('toggleResultModeBtn').innerText = '切换到HTML模式';

        const sourceInput = document.getElementById('sourceHtmlInput');
        if (sourceInput) {
            sourceInput.style.display = 'none';
            sourceInput.value = '';
        }

        let url = '';
        const parentTabContent = currentInputEle.closest('.tab-content, .sub-tab-content');
        if (parentTabContent) {
            const parentId = parentTabContent.id;
            if (parentId.startsWith('home')) {
                url = document.getElementById('首页推荐链接')?.value || '';
            } else if (parentId.startsWith('category')) {
                let categoryUrlTemplate = document.getElementById('分类链接')?.value || '';
                if (categoryUrlTemplate) {
                    url = categoryUrlTemplate.replace(/\[firstPage=.*?\]/, '');
                }
            } else if (parentId.startsWith('detail') || parentId.startsWith('play')) {
                if (!tempDetailPageUrl) {
                    showToast('详情链接为空，正尝试自动获取...', 'info');
                    document.getElementById('testUrl').value = '正在自动获取链接...';
                    const categoryUrl = (document.getElementById('分类链接')?.value || '').replace(/\[firstPage=.*?\]/, '');
                    const listRule = document.getElementById('分类列表数组规则')?.value || '';
                    const linkRule = document.getElementById('分类片单链接')?.value || '';
                    const prefix = document.getElementById('分类片单链接加前缀')?.value || '';
                    const suffix = document.getElementById('分类片单链接加后缀')?.value || '';
                    if (!categoryUrl || !listRule || !linkRule) {
                        url = '自动获取失败: 分类相关规则未填写';
                        showToast(url, 'error');
                    } else {
                        const headers = parseHeaders(document.getElementById('请求头参数').value);
                        const listResult = await runTest(categoryUrl, listRule, null, headers);
                        if (listResult.success && listResult.extractedElements.length > 0) {
                            const contextHtml = listResult.extractedElements[0].outerHTML;
                            const linkResult = await runTest(null, linkRule, contextHtml, headers);
                            if (linkResult.success && linkResult.finalResult.length > 0) {
                                const linkPart = linkResult.finalResult[0];
                                tempDetailPageUrl = prefix + linkPart + suffix;
                                url = tempDetailPageUrl;
                                showToast('已自动获取详情页链接！', 'success');
                            } else {
                                url = '自动获取失败: 未能从分类项中提取到链接';
                                showToast(url, 'error');
                            }
                        } else {
                            url = '自动获取失败: 未能在分类页找到列表';
                            showToast(url, 'error');
                        }
                    }
                } else {
                    url = tempDetailPageUrl;
                }
            } else if (parentId.startsWith('search')) {
                url = document.getElementById('搜索链接')?.value || '';
            }
        }
        
        document.getElementById('testUrl').value = url || '请手动输入URL';
    }, 100);
}

/**
 * 在测试弹窗中更新测试结果显示。
 * @param {object} result - runTest函数返回的结果对象。
 * @param {string} selector - 当前测试使用的选择器。
 * @param {string} url - 当前测试使用的URL或上下文描述。
 * @param {boolean} isAutomated - 是否为一键自动测试流程。
 */
function updateTestModalContent(result, selector, url, isAutomated) {
    const resultDiv = document.getElementById('testResultContent');
    const resultContainer = document.querySelector('.test-result-container');
    if(!resultDiv || !resultContainer) return;
    
    resultContainer.style.display = 'block';

    testResultsCache = [{
        extractedElements: result.extractedElements,
        finalResult: result.finalResult,
        selector: selector,
        url: url,
        isFinalResultDirect: result.isFinalResultDirect
    }];
    
    const infoDiv = document.createElement('div');
    if(resultDiv.innerHTML && !isAutomated){ 
        infoDiv.innerHTML = `<hr style="margin-top:15px; margin-bottom:15px;"><b>测试URL:</b> ${url}<br><b>CSS选择器:</b> `;
    } else {
        resultDiv.innerHTML = '';
        infoDiv.innerHTML = `<b>测试URL:</b> ${url}<br><b>CSS选择器:</b> `;
    }

    const selectorPre = document.createElement('pre');
    selectorPre.style.cssText = 'display: inline; padding: 2px 4px; background-color: #f0f0f0; border-radius: 3px;';
    selectorPre.innerText = selector;
    infoDiv.appendChild(selectorPre);
    resultDiv.appendChild(infoDiv);

    if (result.success) {
        const displayItems = result.isFinalResultDirect ? result.finalResult : result.extractedElements;
        
        if (displayItems && displayItems.length > 0) {
            const count = document.createElement('p');
            count.innerHTML = `<br><b>找到 ${displayItems.length} 个结果:</b>`;
            resultDiv.appendChild(count);
            
            displayItems.forEach(item => {
                const pre = document.createElement('pre');
                pre.style.cssText = 'white-space: pre-wrap; word-break: break-all;';
                if (result.isFinalResultDirect) {
                    pre.innerText = item;
                } else {
                    pre.innerText = item.textContent ? item.textContent.trim() : '';
                }
                resultDiv.appendChild(pre);
            });
        } else {
            const noResult = document.createElement('p');
            noResult.innerHTML = `<br><b><span style="color:red;">未找到匹配的元素。</span></b>`;
            if (result.error) {
                noResult.innerHTML += `<br>错误信息: ${result.error}`;
            }
            resultDiv.appendChild(noResult);
        }
    } else {
        const errorMsg = document.createElement('p');
        errorMsg.innerHTML = `<br><b><span style="color:red;">测试失败:</span></b> ${result.error}`;
        resultDiv.appendChild(errorMsg);
    }
    if (isAutomated) {
        resultDiv.scrollTop = resultDiv.scrollHeight;
    }
}

/**
 * 执行手动测试。
 */
async function manualRunTest() {
    const url = document.getElementById('testUrl').value;
    const selector = document.getElementById('testSelectorInput').value;
    const resultDiv = document.getElementById('testResultContent');
    const resultContainer = document.querySelector('.test-result-container');
    if(!resultDiv || !resultContainer) return;

    const sourceHtml = document.getElementById('sourceHtmlInput').value;
    if (sourceHtml && sourceHtml.trim() !== '') {
        resultDiv.innerHTML = '正在使用自定义源码进行测试...';
        resultContainer.style.display = 'block';
        const result = await runTest(null, selector, sourceHtml);
        updateTestModalContent(result, selector, '本地源码测试', false);
        return;
    }

    if (!url || !selector || url.includes('请') || url.includes('失败')) {
        resultDiv.innerHTML = 'URL和选择器都不能为空，或URL无效。';
        resultContainer.style.display = 'block';
        return;
    }

    resultDiv.innerHTML = '正在加载并测试，请稍候...';
    resultContainer.style.display = 'block';

    const fieldId = currentInputEle.id;
    const parentTab = currentInputEle.closest('.tab-content, .sub-tab-content');
    const parentTabId = parentTab ? parentTab.id : '';

    let headerString = '';
    if (parentTabId === 'search') {
        headerString = document.getElementById('搜索请求头参数')?.value || '';
    } else {
        headerString = document.getElementById('请求头参数')?.value || '';
    }
    const headers = parseHeaders(headerString);

    const fieldDefinition = findFieldById(fieldId);
    const parentRuleId = fieldDefinition ? fieldDefinition.dependsOn : null;

    if (parentRuleId) {
        const parentSelector = document.getElementById(parentRuleId)?.value || '';
        if (!parentSelector) {
            resultDiv.innerHTML = `<b><span style="color:red;">测试失败:</span></b> 依赖的父规则 "${parentRuleId}" 为空。`;
            return;
        }
        resultDiv.innerHTML = `正在执行父规则 [<b>${parentRuleId}</b>]...`;
        const parentResult = await runTest(url, parentSelector, null, headers);
        if (!parentResult.success || !parentResult.extractedElements || parentResult.extractedElements.length === 0) {
            resultDiv.innerHTML = `<b><span style="color:red;">父规则测试失败:</span></b> 未能从父规则 [<b>${parentRuleId}</b>] 中找到任何元素。请先确保父规则正确。`;
            return;
        }
        const contextHtml = parentResult.extractedElements[0].outerHTML;
        const firstElementText = parentResult.extractedElements[0].textContent.trim().substring(0, 100);
        resultDiv.innerHTML = `父规则执行成功, 已找到 ${parentResult.extractedElements.length} 个元素。<br><b>上下文(第一个元素预览):</b> <pre style="background-color:#eee;padding:5px;">${firstElementText}...</pre>`;
        const childResult = await runTest(null, selector, contextHtml, headers);
        updateTestModalContent(childResult, selector, `在 [${parentRuleId}] 的第一个结果内`, false);
    } else {
        const result = await runTest(url, selector, null, headers);
        updateTestModalContent(result, selector, url, false);
        if (fieldId === '分类片单链接' && result.success && result.finalResult.length > 0) {
            const prefix = document.getElementById('分类片单链接加前缀').value;
            const suffix = document.getElementById('分类片单链接加后缀').value;
            tempDetailPageUrl = prefix + result.finalResult[0] + suffix;
            showToast('已自动获取并暂存详情页链接！', 'success');
            document.getElementById('testUrl').value = tempDetailPageUrl;
        }
        if (fieldId === '搜索片单链接' && result.success && result.finalResult.length > 0) {
            const prefix = document.getElementById('搜索片单链接加前缀').value;
            const suffix = document.getElementById('搜索片单链接加后缀').value;
            tempDetailPageUrl = prefix + result.finalResult[0] + suffix;
            showToast('已从搜索结果自动获取并暂存详情页链接！', 'success');
            document.getElementById('testUrl').value = tempDetailPageUrl;
        }
    }
}

/**
 * 切换测试结果的显示模式（纯文本/HTML）。
 */
function toggleResultMode() {
    isHtmlMode = !isHtmlMode;
    const btn = document.getElementById('toggleResultModeBtn');
    const resultDiv = document.getElementById('testResultContent');
    if (!btn || !resultDiv) return;

    const existingContent = Array.from(resultDiv.children).slice(0, 1);
    resultDiv.innerHTML = '';
    existingContent.forEach(child => resultDiv.appendChild(child));
    
    if (testResultsCache.length > 0) {
        const resultItem = testResultsCache[0];
        const displayItems = resultItem.isFinalResultDirect ? resultItem.finalResult : resultItem.extractedElements;
        if (displayItems && displayItems.length > 0) {
            const count = document.createElement('p');
            count.innerHTML = `<br><b>找到 ${displayItems.length} 个结果:</b>`;
            resultDiv.appendChild(count);
            displayItems.forEach(item => {
                const pre = document.createElement('pre');
                pre.style.cssText = 'white-space: pre-wrap; word-break: break-all;';
                if(resultItem.isFinalResultDirect) {
                    pre.innerText = item;
                } else if (isHtmlMode) {
                    pre.innerText = item.outerHTML || '无法显示HTML内容';
                } else {
                    pre.innerText = item.textContent?.trim() || '';
                }
                resultDiv.appendChild(pre);
            });
        } else {
            const noResult = document.createElement('p');
            noResult.innerHTML = `<br><b><span style="color:red;">未找到匹配的元素。</span></b>`;
            resultDiv.appendChild(noResult);
        }
    }
    btn.innerText = isHtmlMode ? '切换到纯文本模式' : '切换到HTML模式';
}

/**
 * 将测试弹窗中的选择器应用到主表单对应的输入框。
 */
function applySelectorToField() {
    if (currentInputEle) {
        const newSelector = document.getElementById('testSelectorInput').value;
        currentInputEle.value = newSelector;
        saveFormData();
        showToast('新选择器已应用并保存！', 'success');
    }
}

/**
 * 展开或收起变量/提示的手风琴面板。
 * @param {string} key - 关联的输入框ID。
 * @param {object} var_btn_data - 包含变量和提示信息的对象。
 */
function toggleAccordion(key, var_btn_data) {
    let accordionDiv = document.getElementById('accordion-' + key);
    if (!accordionDiv) {
        accordionDiv = document.createElement('div');
        accordionDiv.id = 'accordion-' + key;
        accordionDiv.className = 'variable-accordion';
        document.getElementById(key)?.parentElement.after(accordionDiv);
    }

    if (accordionDiv.style.display === 'flex') {
        accordionDiv.style.display = 'none';
        return;
    }

    currentInputEle = document.getElementById(key);
    accordionDiv.style.display = 'flex';
    accordionDiv.innerHTML = '';
    const variables = var_btn_data.vars || [];
    const examples = var_btn_data.tips || [];
    const varListDiv = document.createElement('div');
    varListDiv.className = 'variable-list';
    variables.forEach(v => {
        const varItem = document.createElement('div');
        varItem.className = 'variable-item';
        varItem.innerText = v;
        varItem.onclick = () => insertVariable(v);
        varListDiv.appendChild(varItem);
    });
    accordionDiv.appendChild(varListDiv);

    if (examples.length > 0) {
        const exampleBlock = document.createElement('div');
        exampleBlock.className = 'example-block';
        let exampleHtml = '<h4>使用范例:</h4>';
        examples.forEach(e => {
            exampleHtml += `<div class="example-code">${e}</div>`;
        });
        exampleBlock.innerHTML = exampleHtml;
        accordionDiv.appendChild(exampleBlock);
    }
}

/**
 * 在当前光标位置插入变量字符串。
 * @param {string} variable - 要插入的变量文本。
 */
function insertVariable(variable) {
    if (!currentInputEle) return;
    const input = currentInputEle;
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const before = input.value.substring(0, startPos);
    const after = input.value.substring(endPos, input.value.length);
    input.value = before + variable + after;
    input.focus();
    input.selectionStart = input.selectionEnd = startPos + variable.length;
    saveFormData();
}

/**
 * 保存用户在弹窗中设置的变量值。
 */
function saveVariables() {
    const inputs = document.querySelectorAll('#variableInputs input[data-variable-name]');
    const newVariables = {};
    inputs.forEach(input => {
        const varName = input.getAttribute('data-variable-name');
        if(varName) {
            newVariables[varName] = input.value;
        }
    });
    localStorage.setItem('tvbox_variables', JSON.stringify(newVariables));
    window.globalVariables = newVariables;
    closeModalById('variableModal');
    showToast('变量已保存！', 'success');
}

/**
 * 从localStorage加载变量。
 */
function loadVariables() {
    const savedVariables = localStorage.getItem('tvbox_variables');
    if (savedVariables) {
        try {
            window.globalVariables = JSON.parse(savedVariables);
        } catch (e) {
            console.error('加载本地变量失败:', e);
            window.globalVariables = {};
        }
    }
}

/**
 * 执行CSS选择器测试的核心函数。
 * @param {string|null} url - 要抓取的URL，如果提供了htmlContent则可为null。
 * @param {string} selector - 要执行的CSS选择器。
 * @param {string|null} htmlContent - 可选的HTML内容，如果提供则不抓取URL。
 * @param {object} [customHeaders={}] - 自定义请求头。
 * @returns {Promise<object>} 返回包含测试结果的Promise对象。
 */
async function runTest(url, selector, htmlContent = null, customHeaders = {}) {
    let doc;
    let elements = [];

    try {
        if (htmlContent) {
            const parser = new DOMParser();
            doc = parser.parseFromString(htmlContent, 'text/html');
            elements = Array.from(doc.body.childNodes);
        } else if(url) {
            let tempUrl = url;
            for (const key in window.globalVariables) {
                if (window.globalVariables[key]) {
                    tempUrl = tempUrl.replace(new RegExp(`{${key}}`, 'g'), window.globalVariables[key]);
                }
            }
            const isPost = tempUrl.includes(';post');
            if (isPost) tempUrl = tempUrl.replace(';post', '');
            
            const proxyUrl = `/index.php/Proxy/load?target_url=${encodeURIComponent(tempUrl)}`;
            const fetchOptions = { method: isPost ? 'POST' : 'GET', headers: {} };

            if (Object.keys(customHeaders).length > 0) {
                fetchOptions.headers['X-Custom-Headers'] = JSON.stringify(customHeaders);
            }
            if(isPost) {
                let postData = document.getElementById('POST请求数据')?.value || '';
                for (const key in window.globalVariables) {
                    if (window.globalVariables[key]) postData = postData.replace(new RegExp(`{${key}}`, 'g'), window.globalVariables[key]);
                }
                fetchOptions.body = postData;
                fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            const response = await fetch(proxyUrl, fetchOptions);
            if (!response.ok) throw new Error(`HTTP 错误! 状态码: ${response.status}`);
            const htmlText = await response.text();
            const sourceInput = document.getElementById('sourceHtmlInput');
            if (sourceInput) {
                sourceInput.value = htmlText;
            }
            const parser = new DOMParser();
            doc = parser.parseFromString(htmlText, 'text/html');
            elements = [doc];
        } else {
             throw new Error('URL和HTML内容都为空。');
        }
    } catch (error) {
        return { success: false, error: error.message, finalResult: [], extractedElements: [] };
    }
    
    const selectorParts = selector.split('&&');
    let finalResult = [];
    let isFinalResultDirect = false;

    for (let i = 0; i < selectorParts.length; i++) {
        let part = selectorParts[i].trim();
        if (!part) continue;

        const attributeKeywords = ['Text', 'Html', 'href', 'data-original', 'src', 'data-src', 'title'];
        if (attributeKeywords.some(keyword => part.startsWith(keyword))) {
            const extractionParts = part.split('!');
            const extractor = extractionParts[0];

            finalResult = elements.flatMap(el => {
                let value = '';
                if (extractor === 'Text') value = el.textContent || '';
                else if (extractor === 'Html') value = el.innerHTML || '';
                else if (el.getAttribute) value = el.getAttribute(extractor) || '';
                
                if (extractionParts.length > 1) {
                    for (let j = 1; j < extractionParts.length; j++) {
                        value = value.replace(new RegExp(extractionParts[j], 'g'), '');
                    }
                }
                const trimmedValue = value.trim();
                return trimmedValue ? [trimmedValue] : [];
            });
            isFinalResultDirect = true;
            break;
        }

        let nextElements = [];
        try {
            for (const currentElement of elements) {
                if (currentElement.nodeType !== 1 && currentElement.nodeType !== 9) continue;
                nextElements.push(...Array.from(currentElement.querySelectorAll(part)));
            }
        } catch (e) {
            nextElements = []; 
        }
        elements = nextElements;
        if (elements.length === 0) break;
    }
    
    return { success: true, finalResult: isFinalResultDirect ? finalResult : [], doc: doc, extractedElements: elements, isFinalResultDirect: isFinalResultDirect };
}

/**
 * 开始一键自动测试流程。
 */
async function startAutomatedTest() {
    showToast('开始一键自动测试...', 'info');
    tempDetailPageUrl = '';
    
    // Create and open the modal first
    new Modal({
        id: 'testModal',
        title: '一键测试进行中...',
        content: renderTemplate('test-modal-template'),
        footer: '<button id="manualTestBtn" class="btn primary-btn" style="display:none;">运行测试</button>',
        width: '700px',
        height: '80%'
    });

    // Use a timeout to ensure modal is rendered before tests start
    setTimeout(async () => {
        await testHomepage();
        await testCategory();
        await testDetail();
        await testPlay();
        
        showToast('一键自动测试流程完成！', 'success');
        const modalTitle = document.querySelector('#testModal .wb-title');
        if (modalTitle) modalTitle.textContent = '一键测试完成';
    }, 500);
}

/**
 * 自动测试首页规则。
 */
async function testHomepage() {
    openTab({ currentTarget: document.querySelector('.tabs .tab-btn[onclick*="home"]') }, 'home');
    const homepageUrl = document.getElementById('首页推荐链接')?.value;
    const homepageRule = document.getElementById('首页片单列表数组规则')?.value;
    
    if (!homepageUrl || !homepageRule) {
        updateTestModalContent({ success: false, error: '首页规则或URL为空，跳过此测试。' }, '首页片单列表数组规则', 'N/A', true);
        return;
    }
    
    currentInputEle = document.getElementById('首页片单列表数组规则');
    document.getElementById('testSelectorInput').value = homepageRule;
    document.getElementById('testUrl').value = homepageUrl;
    
    const headers = parseHeaders(document.getElementById('请求头参数')?.value);
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = await runTest(homepageUrl, homepageRule, null, headers);
    updateTestModalContent(result, homepageRule, homepageUrl, true);
    
    if (result.success && result.extractedElements.length > 0) {
        showToast('【首页规则】测试通过！', 'success');
    } else {
        showToast('【首页规则】测试失败。', 'error');
    }
}

/**
 * 自动测试分类规则。
 */
async function testCategory() {
    openTab({ currentTarget: document.querySelector('.tabs .tab-btn[onclick*="category"]') }, 'category');
    const subTabButton = document.querySelector('#category .sub-tab-btn');
    if (subTabButton) openSubTab({ currentTarget: subTabButton }, 'category-rules-basic');
    
    let categoryUrlTemplate = document.getElementById('分类链接')?.value || '';
    const categoryRule = document.getElementById('分类列表数组规则')?.value;
    const detailUrlRule = document.getElementById('分类片单链接')?.value;
    
    if (!categoryUrlTemplate || !categoryRule || !detailUrlRule) {
         updateTestModalContent({ success: false, error: '分类规则或URL为空，跳过此测试。' }, '分类列表数组规则', 'N/A', true);
        return;
    }
    
    categoryUrlTemplate = categoryUrlTemplate.replace(/\[firstPage=.*?\]/, '');
    currentInputEle = document.getElementById('分类列表数组规则');
    document.getElementById('testSelectorInput').value = categoryRule;
    document.getElementById('testUrl').value = categoryUrlTemplate;
    
    const headers = parseHeaders(document.getElementById('请求头参数')?.value);
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = await runTest(categoryUrlTemplate, categoryRule, null, headers);
    updateTestModalContent(result, categoryRule, categoryUrlTemplate, true);
    
    if (result.success && result.extractedElements.length > 0) {
        showToast('【分类列表数组规则】测试通过！', 'success');
        const firstMovieEl = result.extractedElements[0].outerHTML;
        const detailUrlResult = await runTest(null, detailUrlRule, firstMovieEl, headers);
        
        if (detailUrlResult.success && detailUrlResult.finalResult.length > 0) {
            const prefix = document.getElementById('分类片单链接加前缀')?.value || '';
            const suffix = document.getElementById('分类片单链接加后缀')?.value || '';
            tempDetailPageUrl = prefix + detailUrlResult.finalResult[0] + suffix;
            showToast('已从分类结果中获取到详情页链接。', 'success');
        } else {
            showToast('无法从分类结果中提取详情页链接。', 'error');
        }
    } else {
        showToast('【分类列表数组规则】测试失败。', 'error');
    }
}

/**
 * 自动测试详情页规则。
 */
async function testDetail() {
    openTab({ currentTarget: document.querySelector('.tabs .tab-btn[onclick*="detail"]') }, 'detail');
    if (!tempDetailPageUrl) {
         updateTestModalContent({ success: false, error: '详情页URL为空，跳过【详情规则】测试。'}, 'N/A', 'N/A', true);
        return;
    }
    
    const detailRules = ['演员详情', '简介详情', '类型详情'];
    const headers = parseHeaders(document.getElementById('请求头参数')?.value);
    
    for (const ruleId of detailRules) {
        const selector = document.getElementById(ruleId)?.value;
        if (!selector) continue;
        
        currentInputEle = document.getElementById(ruleId);
        document.getElementById('testSelectorInput').value = selector;
        document.getElementById('testUrl').value = tempDetailPageUrl;
        
        await new Promise(resolve => setTimeout(resolve, 500));
        const result = await runTest(tempDetailPageUrl, selector, null, headers);
        updateTestModalContent(result, selector, tempDetailPageUrl, true);
        
        if (result.success && (result.finalResult.length > 0 || result.extractedElements.length > 0)) {
            showToast(`【${ruleId}】测试通过！`, 'success');
        } else {
            showToast(`【${ruleId}】测试失败。`, 'error');
        }
    }
}

/**
 * 自动测试播放列表规则。
 */
async function testPlay() {
    openTab({ currentTarget: document.querySelector('.tabs .tab-btn[onclick*="play"]') }, 'play');
    if (!tempDetailPageUrl) {
         updateTestModalContent({ success: false, error: '详情页URL为空，跳过【播放规则】测试。'}, 'N/A', 'N/A', true);
        return;
    }
    
    const playRules = ['线路列表数组规则', '选集列表数组规则'];
    const headers = parseHeaders(document.getElementById('请求头参数')?.value);
    
    for (const ruleId of playRules) {
        const selector = document.getElementById(ruleId)?.value;
        if (!selector) continue;
        
        currentInputEle = document.getElementById(ruleId);
        document.getElementById('testSelectorInput').value = selector;
        document.getElementById('testUrl').value = tempDetailPageUrl;
        
        await new Promise(resolve => setTimeout(resolve, 500));
        const result = await runTest(tempDetailPageUrl, selector, null, headers);
        updateTestModalContent(result, selector, tempDetailPageUrl, true);
        
        if (result.success && result.extractedElements.length > 0) {
            showToast(`【${ruleId}】测试通过！`, 'success');
        } else {
            showToast(`【${ruleId}】测试失败。`, 'error');
        }
    }
}