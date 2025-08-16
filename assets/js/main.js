/**
 * --------------------------------------------------------------------
 * @description 项目前端核心文件，文件负责处理TVbox规则编辑器的所有前端逻辑，包括表单渲染、数据处理、
 * 规则测试、弹窗管理以及与服务器的交互。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */
document.addEventListener('DOMContentLoaded', () => {

    /**
     * @description 全局变量和实例定义
     */
    let currentRulesData = {};
    let downloadStatus = {};
    let currentEditInfo = {};
    let rawJsonContent = '';
    let currentConfigBaseDir = '';
    let ruleClipboard = {
        data: null,
        sourceBaseDir: ''
    };
    const defaultJsonUrl = 'https://raw.githubusercontent.com/liu673cn/box/refs/heads/main/m.json';

    /**
     * @description 动态编译所有Handlebars模板
     */
    const templateIds = [
        'basic-tab-template', 'simple-item-template', 'site-item-template',
        'filter-item-template', 'tab-content-template', 'details-modal-body-template',
        'file-browser-body-template', 'add-site-modal-template', 'add-parse-modal-template',
        'add-filter-modal-template', 'download-modal-template', 'ai-helper-modal-template',
        'push-modal-template'
    ];
    
    const templates = templateIds.reduce((acc, id) => {
        const key = id.replace(/-template$/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
        acc[key] = Handlebars.compile(document.getElementById(id)?.innerHTML || '');
        return acc;
    }, {});

    /**
     * @description 注册Handlebars助手函数
     */
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('endsWith', (str, suffix) => typeof str === 'string' && str.endsWith(suffix));
    Handlebars.registerHelper('buildList', function(children) {
        if (children && children.length > 0) {
            return new Handlebars.SafeString(templates.fileBrowserBody({ files: children }));
        }
        return '';
    });
    
    /**
     * @description 页面主要元素的引用
     */
    const jsonUrlInput = document.getElementById('jsonUrlInput');
    const localFileInput = document.getElementById('localFileInput');
    const loadingDiv = document.getElementById('loading');

    /**
     * @description 从localStorage获取URL历史记录
     * @returns {string[]}
     */
    function getUrlHistory() {
        try {
            const history = localStorage.getItem('urlHistory');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * @description 将新的URL添加到历史记录中
     * @param {string} url 
     */
    function addToUrlHistory(url) {
        let history = getUrlHistory();
        history = history.filter(item => item !== url);
        history.unshift(url);
        if (history.length > 20) {
            history.pop();
        }
        localStorage.setItem('urlHistory', JSON.stringify(history));
    }

    /**
     * @description 更新所有列表的列数
     */
    function updateGridColumns() {
        const columns = document.getElementById('column-select').value;
        document.querySelectorAll('.rule-list-grid').forEach(grid => {
            grid.style.setProperty('--grid-columns', columns);
        });
    }
    
    /**
     * @description 解析资源路径，移除md5等后缀
     * @param {string} pathStr - 原始路径字符串
     * @returns {string|null} 解析后的路径
     */
    function parseAssetPath(pathStr) {
        if (!pathStr || typeof pathStr !== 'string') return null;
        return pathStr.split(';')[0];
    }
    
    /**
     * @description 获取URL的基础路径
     * @param {string} url - 完整的URL地址
     * @returns {string} URL的基础路径
     */
    function getBaseUrl(url) {
        const lastSlash = url.lastIndexOf('/');
        return url.substring(0, lastSlash + 1);
    }

    /**
     * @description 更新UI上的下载状态指示器
     * @param {string} uniqueId - 状态元素的唯一ID
     * @param {string} status - 新的状态 (e.g., 'pending', 'downloading', 'downloaded', 'failed')
     */
    function updateDownloadStatusUI(uniqueId, status) {
        const statusElement = document.getElementById(`status-${uniqueId}`);
        if (statusElement) {
            statusElement.className = `download-status ${status || 'pending'}`;
        }
    }

    /**
     * @description 更新单个爬虫规则项的综合下载状态
     * @param {number} index - 爬虫规则的索引
     */
    function updateCombinedSiteStatus(index) {
        const site = currentRulesData.sites[index];
        if (!site) return;

        const assetsToCheck = ['jar', 'ext', 'api'];
        const statuses = [];
        
        assetsToCheck.forEach(key => {
            const assetId = `site-${index}-${key}`;
            if (downloadStatus.hasOwnProperty(assetId)) {
                statuses.push(downloadStatus[assetId]);
            }
        });

        if (statuses.length === 0) {
            updateDownloadStatusUI(`site-item-${index}`, ''); // 如果没有可下载资源，则清除状态
            return;
        }
        
        let combinedStatus = 'downloaded';
        if (statuses.some(s => s === 'failed')) {
            combinedStatus = 'failed';
        } else if (statuses.some(s => s === 'downloading')) {
            combinedStatus = 'downloading';
        } else if (statuses.some(s => s === 'pending')) {
            combinedStatus = 'pending';
        }
        
        updateDownloadStatusUI(`site-item-${index}`, combinedStatus);
    }

    /**
     * @description 从URL加载并渲染规则
     */
    function loadAndRenderRulesFromUrl() {
        const url = jsonUrlInput.value.trim();
        if (!url) {
            showToast('请输入有效的JSON链接地址。', 'error');
            return;
        }
        
        if (url.includes('/box/')) {
            const pathAfterBox = url.split('/box/')[1];
            const lastSlashIndex = pathAfterBox.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                currentConfigBaseDir = pathAfterBox.substring(0, lastSlashIndex + 1);
            } else {
                currentConfigBaseDir = '';
            }
        } else {
            currentConfigBaseDir = '';
        }

        loadingDiv.style.display = 'block';
        rawJsonContent = '';
        const proxyUrl = `index.php/Proxy/load?target_url=${encodeURIComponent(url)}`;
        fetch(proxyUrl)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP 错误! 状态码: ${response.status}`);
                return response.text();
            })
            .then(responseText => {
                rawJsonContent = responseText;
                addToUrlHistory(url);
                localStorage.setItem('savedJsonUrl', url);
                document.getElementById('file-name-display').textContent = url.split('/').pop();
                processJsonContent(responseText);
            })
            .catch(error => {
                showToast(`读取或解析失败: ${error.message}`, 'error');
            })
            .finally(() => {
                loadingDiv.style.display = 'none';
            });
    }

    /**
     * @description 从本地文件加载并渲染规则
     * @param {Event} event - 文件输入事件
     */
    function loadAndRenderRulesFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            rawJsonContent = e.target.result;
            document.getElementById('file-name-display').textContent = file.name;
            processJsonContent(e.target.result);
        };
        reader.onerror = () => showToast('读取本地文件失败。', 'error');
        reader.readAsText(file);
        event.target.value = '';
    }

    /**
     * @description 处理JSON内容并分发渲染
     * @param {string} content - JSON字符串内容
     */
    function processJsonContent(content) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.innerHTML = '');
        loadingDiv.style.display = 'block';
        try {
            let cleanedContent = content
                .split('\n')
                .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('/*'))
                .join('\n')
                .replace(/,\s*([}\]])/g, '$1');
            currentRulesData = JSON.parse(cleanedContent);
            renderAllTabs(currentRulesData);

            if (currentRulesData.sites && Array.isArray(currentRulesData.sites)) {
                const apisToUpdate = [...new Set(
                    currentRulesData.sites
                        .map(site => site.api)
                        .filter(api => typeof api === 'string' && (api.startsWith('csp_') || api.endsWith('.js') || api.endsWith('.py')))
                )];

                if (apisToUpdate.length > 0) {
                    fetch('index.php/Proxy/updateApiList', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(apisToUpdate)
                    });
                }
            }

            setTimeout(() => {
                const initialActiveTab = document.querySelector('.tabs .tab-btn.active');
                if (initialActiveTab) {
                    const mockEvent = { currentTarget: initialActiveTab };
                    openTab(mockEvent, initialActiveTab.dataset.tab);
                }
            }, 0);
            
            showToast('规则加载并渲染成功！', 'success');
        } catch (error) {
            showToast(`解析JSON失败: ${error.message}`, 'error');
        } finally {
            loadingDiv.style.display = 'none';
        }
    }
    
    /**
     * @description 渲染所有选项卡
     * @param {object} data - 完整的规则数据
     */
    function renderAllTabs(data = {}){
        renderBasicTab(data);
        renderLivesTab(data.lives);
        renderSitesTab(data.sites);
        renderParsesTab(data.parses, data.flags);
        renderFiltersTab(data.rules, data.ads);
        updateGridColumns();
    }
    
    /**
     * @description 从所有标签页的表单中读取当前值，并更新到 currentRulesData 对象中。
     */
    function updateCurrentRulesDataFromForm() {
        if (!currentRulesData) return;

        currentRulesData.spider = document.getElementById('spider-url')?.value || "";
        currentRulesData.wallpaper = document.getElementById('wallpaper-url')?.value || "";
        currentRulesData.warningText = document.getElementById('warning-text')?.value || "";

        const ijkText = document.getElementById('ijk-url')?.value;
        if (ijkText) {
            try {
                currentRulesData.ijk = JSON.parse(ijkText);
            } catch (e) {
                currentRulesData.ijk = ijkText;
            }
        }

        const flagsText = document.getElementById('flags')?.value;
        if (flagsText !== undefined) {
            currentRulesData.flags = flagsText.split(',').map(f => f.trim()).filter(Boolean);
        }

        const adsText = document.getElementById('ads')?.value;
        if (adsText !== undefined) {
            currentRulesData.ads = adsText.split('\n').map(a => a.trim()).filter(Boolean);
        }
    }

    /**
     * @description 渲染基础信息选项卡
     * @param {object} data - 规则数据
     */
    function renderBasicTab(data) {
        const container = document.getElementById('basic');
        if (!container || !data) return;
        
        container.innerHTML = templates.basicTab({
            spiderPath: data.spider || '',
            wallpaper: data.wallpaper || '',
            ijk: data.ijk ? JSON.stringify(data.ijk, null, 2) : '',
            warningText: data.warningText || ''
        });
        
        updateDownloadStatusUI('spider', downloadStatus['spider'] || 'pending');
    }

    /**
     * @description 渲染爬虫规则选项卡
     * @param {Array} sites - 站点规则数组
     */
    function renderSitesTab(sites) {
        const container = document.getElementById('sites');
        if (!container) return;
        
        container.innerHTML = templates.tabContent({ 
            entityName: '爬虫', 
            itemType: 'sites',
            showCreateButton: true
        });

        const grid = container.querySelector('.rule-list-grid');
        grid.addEventListener('click', handleGridItemClick);

        let listHtml = '';
        (sites || []).forEach((site, index) => {
            const ext = parseAssetPath(site.ext);
            const jar = parseAssetPath(site.jar);
            
            let combinedStatus = 'pending';
            const jarStatusId = `site-${index}-jar`;
            const extStatusId = `site-${index}-ext`;
            const jarStatus = downloadStatus[jarStatusId];
            const extStatus = downloadStatus[extStatusId];
            if (jarStatus === 'failed' || extStatus === 'failed') combinedStatus = 'failed';
            else if (jarStatus === 'downloading' || extStatus === 'downloading') combinedStatus = 'downloading';
            else if (jarStatus === 'downloaded' || extStatus === 'downloaded') combinedStatus = 'downloaded';

            listHtml += templates.siteItem({
                index: index,
                name: site.name,
                api: site.api || '',
                displayValue: ext || site.api || site.key || '',
                hasAssets: (typeof jar === 'string' && jar.startsWith('./')) || (typeof ext === 'string' && ext.startsWith('./')),
                combinedStatus: combinedStatus
            });
        });
        grid.innerHTML = listHtml;
    }

    /**
     * @description 渲染解析接口选项卡
     * @param {Array} parses - 解析规则数组
     * @param {Array} flags - 解析标识数组
     */
    function renderParsesTab(parses, flags) {
        const container = document.getElementById('parses');
        if (!container) return;
        container.innerHTML = templates.tabContent({ 
            entityName: '解析', 
            itemType: 'parses',
            showCreateButton: true
        });
        container.querySelector('.rule-list-grid').addEventListener('click', handleGridItemClick);
        
        const grid = container.querySelector('.rule-list-grid');
        let listHtml = '';
        (parses || []).forEach((parse, index) => {
            listHtml += templates.simpleItem({
                itemType: 'parses',
                index: index,
                name: parse.name,
                url: parse.url
            });
        });
        grid.innerHTML = listHtml;
        if (Array.isArray(flags)) {
            container.insertAdjacentHTML('beforeend', `<div class="form-group list-footer"><label for="flags">解析标识 (flags)</label><textarea id="flags" rows="3">${flags.join(',')}</textarea></div>`);
        }
    }

    /**
     * @description 渲染直播规则选项卡
     * @param {Array} lives - 直播规则数组
     */
    function renderLivesTab(lives){
        const container = document.getElementById('lives');
        if(!container) return;
        container.innerHTML = templates.tabContent({ 
            entityName: '直播', 
            itemType: 'lives',
            showCreateButton: false 
        });
        container.querySelector('.rule-list-grid').addEventListener('click', handleGridItemClick);
        
        const grid = container.querySelector('.rule-list-grid');
        let listHtml = '';
        (lives || []).forEach((live, index) => {
            listHtml += templates.simpleItem({
                itemType: 'lives',
                index: index,
                name: live.name,
                url: live.url
            });
        });
        grid.innerHTML = listHtml;
    }

    /**
     * @description 渲染广告过滤选项卡
     * @param {Array} rules - 过滤规则数组
     * @param {Array} ads - 广告域名数组
     */
    function renderFiltersTab(rules, ads) {
        const container = document.getElementById('filters');
        if (!container) return;
        container.innerHTML = templates.tabContent({ 
            entityName: '过滤规则', 
            itemType: 'rules',
            showCreateButton: true
        });
        container.querySelector('.rule-list-grid').addEventListener('click', handleGridItemClick);

        const grid = container.querySelector('.rule-list-grid');
        let listHtml = '';
        (rules || []).forEach((rule, index) => {
            const displayName = rule.name || (Array.isArray(rule.hosts) ? rule.hosts.join(', ') : rule.host);
            let displayValue = '';
            if (rule.rule) { displayValue = Array.isArray(rule.rule) ? rule.rule.join('\n') : rule.rule; } 
            else if (rule.regex) { displayValue = Array.isArray(rule.regex) ? rule.regex.join('\n') : rule.regex; }
            listHtml += templates.filterItem({
                index: index,
                displayName: displayName,
                displayValue: displayValue
            });
        });
        grid.innerHTML = listHtml;
        if (Array.isArray(ads)) {
            container.insertAdjacentHTML('beforeend', `<div class="form-group list-footer"><label for="ads">广告域名 (ads)</label><textarea id="ads" rows="3">${ads.join('\n')}</textarea></div>`);
        }
    }

    /**
     * @description 打开文件浏览器弹窗
     */
    async function openFileBrowser() {
        const fileBrowserModal = new Modal({
            id: 'file-browser-modal',
            title: '选择服务器上的配置文件',
            footer: `
                <button id="select-local-file-btn" class="btn secondary-btn">选择本地文件</button>
                <button id="open-selected-file-btn" class="btn primary-btn">打开选中文件</button>
            `
        });

        const body = fileBrowserModal.getBodyElement();
        body.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await fetch('index.php/Proxy/listFiles');
            if (!response.ok) throw new Error('无法获取文件列表');
            const files = await response.json();
            if (files.length === 0) {
                body.innerHTML = '<p>服务器上的 "box" 目录为空或不存在。</p>';
            } else {
                body.innerHTML = templates.fileBrowserBody({ files: files });
            }
        } catch (error) {
            body.innerHTML = `<p class="error-message">加载失败: ${error.message}</p>`;
        }
    }
    
    /**
     * @description 打开选中的服务器文件
     */
    function openSelectedServerFile() {
        const selectedRadio = document.querySelector('#file-browser-modal .modal-main-content input[name="server-file-radio"]:checked');
        if (!selectedRadio) {
            showToast('请先选择一个JSON文件！', 'error');
            return;
        }
        const filePath = selectedRadio.value;
        const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        const newUrl = `${window.location.origin}${currentPath}/box/${filePath}`;
        jsonUrlInput.value = newUrl;
        closeModalById('file-browser-modal');
        loadAndRenderRulesFromUrl();
    }
    
    /**
     * @description 打开详情编辑弹窗
     * @param {object} itemData - 该项的数据
     * @param {string} itemType - 项目类型
     * @param {number} index - 项目索引
     */
    function openDetailsModal(itemData, itemType, index) {
        if (!itemData) return;
        
        const configs = {
            sites: siteConfig,
            parses: parseConfig,
            lives: liveConfig,
            rules: filterConfig
        };
        const config = configs[itemType];
        if(!config) {
             showToast('该项目类型不支持编辑', 'warning');
             return;
        }

        currentEditInfo = { itemData, itemType, index, config };
        
        const fields = config.fieldOrder.map(key => {
            if (!config.translations[key]) return null;
            let value = itemData[key];
            if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value, null, 2);
            }
            const isBoolean = config.booleanFields.includes(key);
            return {
                id: `${itemType}-${index}-detail-${key}`,
                label: config.translations[key],
                value: value === undefined || value === null ? '' : value,
                isTextarea: config.textareaFields.includes(key) || (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))),
                isBoolean: isBoolean,
                fullWidth: config.fullWidthFields.includes(key),
                trueValue: key === 'pass' ? 'true' : 1,
                falseValue: key === 'pass' ? 'false' : 0,
                trueText: key === 'pass' ? 'True' : '是',
                falseText: key === 'pass' ? 'False' : '否',
            };
        }).filter(Boolean);
        
        new Modal({
            id: 'details-modal',
            title: `编辑 - ${itemData.name || '项目'}`,
            content: templates.detailsModalBody({ fields: fields }),
            footer: '<button id="modal-save-btn" class="btn primary-btn">确认</button>'
        });
    }

    /**
     * @description 保存弹窗修改
     */
    function saveModalChanges() {
        const { itemType, index, config } = currentEditInfo;
        if (!itemType || index === undefined || !config) return;
        
        const updatedData = { ...currentRulesData[itemType][index] };
        
        config.fieldOrder.forEach(key => {
            const inputElement = document.getElementById(`${itemType}-${index}-detail-${key}`);
            if (inputElement) {
                let value = inputElement.value;
                if (config.booleanFields.includes(key)) {
                    if (key === 'pass') {
                        updatedData[key] = value === 'true';
                    } else {
                        updatedData[key] = value === '1' ? 1 : 0;
                    }
                } else if (inputElement.tagName === 'TEXTAREA' && (value.startsWith('[') || value.startsWith('{'))) {
                    try {
                        updatedData[key] = JSON.parse(value);
                    } catch (e) { updatedData[key] = value; }
                } else {
                    updatedData[key] = value;
                }
            }
        });
        
        currentRulesData[itemType][index] = updatedData;
        renderAllTabs(currentRulesData);
        closeModalById('details-modal');
        showToast('修改已确认', 'success');
    }

    /**
     * @description 删除指定项目
     * @param {string} itemType - 项目类型
     * @param {number} index - 项目索引
     */
    function deleteItem(itemType, index) {
        if (!currentRulesData[itemType] || currentRulesData[itemType][index] === undefined) return;
        
        const itemElement = document.querySelector(`[data-item-type="${itemType}"][data-index="${index}"]`);

        if(itemElement){
            itemElement.classList.add('item-fade-out');
        }
        
        setTimeout(() => {
            currentRulesData[itemType].splice(index, 1);
            renderAllTabs(currentRulesData);
            showToast('项目已删除', 'success');
        }, 300);
    }
    
    /**
     * @description 应用一个统一的站点过滤器
     * @param {HTMLElement} clickedBtn - 被点击的按钮元素
     */
    function applySiteFilter(clickedBtn) {
        const isAlreadyActive = clickedBtn.classList.contains('active');

        document.querySelectorAll('.site-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const items = document.querySelectorAll('#sites .rule-item-container');
        
        if (!isAlreadyActive) {
            clickedBtn.classList.add('active');

            const filterType = clickedBtn.dataset.filterType;
            const filterValue = clickedBtn.dataset.filterValue;

            items.forEach(item => {
                const index = parseInt(item.dataset.index, 10);
                const siteData = currentRulesData.sites[index];
                if (!siteData) return;

                const itemApi = siteData.api || '';
                const itemExt = siteData.ext || '';
                let isMatch = false;

                switch (filterType) {
                    case 'equals':
                        isMatch = itemApi === filterValue;
                        break;
                    case 'endsWith':
                        isMatch = itemExt.endsWith(filterValue);
                        break;
                }
                item.style.display = isMatch ? '' : 'none';
            });
        } else {
            items.forEach(item => {
                item.style.display = '';
            });
        }
    }

    /**
     * @description 添加新的爬虫规则
     */
    async function addSpider() {
        const newSite = {
            key: document.getElementById('new-site-key-modal').value.trim(),
            name: document.getElementById('new-site-name-modal').value.trim(),
            type: parseInt(document.getElementById('new-site-type-modal').value, 10),
            api: document.getElementById('new-site-api-modal').value.trim(),
            searchable: document.getElementById('new-site-searchable-modal').checked ? 1 : 0,
            quickSearch: document.getElementById('new-site-quick-modal').checked ? 1 : 0,
            filterable: document.getElementById('new-site-filterable-modal').checked ? 1 : 0,
            ext: document.getElementById('new-site-ext-modal').value.trim(),
            jar: document.getElementById('new-site-jar-modal').value.trim(),
        };
        
        if (!newSite.name || !newSite.key || !newSite.ext) {
            showToast('规则名称、唯一标识和规则链接不能为空！', 'error');
            return;
        }

        if (currentRulesData.sites && currentRulesData.sites.length > 0) {
            const isDuplicate = currentRulesData.sites.some(site => 
                site.name.toLowerCase() === newSite.name.toLowerCase() ||
                site.key.toLowerCase() === newSite.key.toLowerCase() ||
                site.ext === newSite.ext
            );

            if (isDuplicate) {
                scrollToTop();
                showToast('规则名称、唯一标识或链接已存在，请修改后重试。', 'error');
                return;
            }
        }

        if (newSite.ext.startsWith('./') && newSite.ext.endsWith('.json')) {
            const customContent = document.getElementById('new-site-custom-content-modal').value;
            const saveAsDefault = document.getElementById('save-as-default-toggle-modal').checked;
            
            const pathFromInput = newSite.ext.substring(2);
            const finalRelativePath = currentConfigBaseDir + pathFromInput;

            const formData = new FormData();
            formData.append('relativePath', finalRelativePath);
            formData.append('apiName', newSite.api);
            formData.append('customContent', customContent);
            formData.append('saveAsDefault', saveAsDefault);

            try {
                showToast('正在创建规则文件...', 'info');
                const response = await fetch('index.php/Proxy/createRuleFile', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.message);
                }
                showToast(result.message, 'success');

            } catch (error) {
                showToast(`文件创建失败: ${error.message}`, 'error');
                return;
            }
        }

        if (!currentRulesData.sites) currentRulesData.sites = [];
        currentRulesData.sites.unshift(newSite);
        renderSitesTab(currentRulesData.sites);
        showToast('新爬虫规则已成功添加！', 'success');
        closeModalById('add-site-modal');
    }

    /**
     * @description 添加新的解析接口
     */
    function addParse() {
        const newParse = {
            name: document.getElementById('new-parse-name-modal').value.trim(),
            type: parseInt(document.getElementById('new-parse-type-modal').value, 10),
            url: document.getElementById('new-parse-url-modal').value.trim(),
        };
        const extValue = document.getElementById('new-parse-ext-modal').value.trim();
        if (extValue) {
            try {
                newParse.ext = JSON.parse(extValue);
            } catch (e) {
                newParse.ext = extValue;
            }
        }
        if (!newParse.name || !newParse.url) {
            showToast('接口名称和接口地址不能为空！', 'error');
            return;
        }
        if (isNaN(newParse.type)) {
            showToast('类型必须是数字！', 'error');
            return;
        }
        if (!currentRulesData.parses) currentRulesData.parses = [];
        currentRulesData.parses.unshift(newParse);
        renderParsesTab(currentRulesData.parses, currentRulesData.flags);
        showToast('新解析接口已成功添加！', 'success');
        closeModalById('add-parse-modal');
    }

    /**
     * @description 添加新的过滤规则
     */
    function addFilterRule() {
        const newRule = {
            name: document.getElementById('new-filter-name-modal').value.trim() || undefined,
            host: document.getElementById('new-filter-host-modal').value.trim() || undefined,
        };
        const hostsText = document.getElementById('new-filter-hosts-modal').value.trim();
        const rulesText = document.getElementById('new-filter-rules-modal').value.trim();
        
        try {
            if (hostsText) newRule.hosts = JSON.parse(hostsText);
            if (rulesText) newRule.rule = JSON.parse(rulesText);
        } catch (e) {
            showToast('主机列表或规则列表的JSON格式无效！', 'error');
            return;
        }

        Object.keys(newRule).forEach(key => newRule[key] === undefined && delete newRule[key]);

        if (!currentRulesData.rules) currentRulesData.rules = [];
        currentRulesData.rules.unshift(newRule);
        renderFiltersTab(currentRulesData.rules, currentRulesData.ads);
        showToast('新过滤规则已添加！', 'success');
        closeModalById('add-filter-modal');
    }


    /**
     * @description 启动下载流程 
     */
    async function startDownloadProcess() {
        const targetDir = document.getElementById('download-dir-input').value.trim();
        const targetFilename = document.getElementById('download-filename-input').value.trim();
        const mainJsonUrl = jsonUrlInput.value.trim();

        if (!targetDir || !targetFilename) {
            showToast('目录和文件名不能为空！', 'error');
            return;
        }

        const fileNameElement = document.getElementById('file-name-display');
        const originalTitle = document.title;
        const originalFileName = fileNameElement.textContent;
        const downloadFailures = new Map();
        const assetsToDownload = [];
        downloadStatus = {};

        try {
            showToast('开始下载流程...', 'info');
            closeModalById('download-modal');

            document.getElementById('basic').classList.add('show-status');
            document.getElementById('sites').classList.add('show-status');
            
            updateCurrentRulesDataFromForm();
            let dataToSave = JSON.parse(JSON.stringify(currentRulesData));
            const baseUrl = getBaseUrl(mainJsonUrl);
            
            const discoverAndRegisterAsset = (originalPath, assetId, site = null) => {
                if (!originalPath || typeof originalPath !== 'string') return;
                if (site && assetId.endsWith('-ext') && (originalPath.startsWith('http://127.0.0.1') || originalPath.startsWith('http://localhost'))) return;
                if (site && (site.type === 1 || site.type === 2)) return;
                if (site && assetId.endsWith('-api') && site.type !== 3) return;
                if (site && assetId.endsWith('-ext') && (site.api === 'csp_AppYs' || site.api === 'csp_AppYsV2')) return;
                
                const parsedPath = parseAssetPath(originalPath);
                const isLocalRelative = parsedPath.startsWith('./');
                const isRemote = parsedPath.startsWith('http');

                if (isLocalRelative || isRemote) {
                    const sourceUrl = isLocalRelative ? new URL(parsedPath, baseUrl).href : parsedPath;
                    const alreadyExists = assetsToDownload.some(task => task.sourceUrl === sourceUrl);
                    if (!alreadyExists) {
                        assetsToDownload.push({
                            sourceUrl: sourceUrl,
                            originalPath: originalPath,
                            targetRelativePath: parsedPath,
                            id: assetId
                        });
                        downloadStatus[assetId] = 'pending';
                    }
                }
            };

            discoverAndRegisterAsset(dataToSave.spider, 'spider');
            (dataToSave.sites || []).forEach((site, index) => {
                discoverAndRegisterAsset(site.jar, `site-${index}-jar`, site);
                discoverAndRegisterAsset(site.api, `site-${index}-api`, site);
                discoverAndRegisterAsset(site.ext, `site-${index}-ext`, site);
            });

            renderAllTabs(currentRulesData);
            const totalCount = assetsToDownload.length;
            showToast(`共找到 ${totalCount} 个资源需要下载...`, 'info');
            
            let downloadedCount = 0;
            const updateStatusText = () => {
                const statusText = `下载中 (已完成 ${downloadedCount} / 总计 ${totalCount})...`;
                document.title = statusText;
                fileNameElement.textContent = statusText;
            };
            updateStatusText();

            for (const task of assetsToDownload) {
                downloadStatus[task.id] = 'downloading';
                updateDownloadStatusUI(task.id, 'downloading');
                if (task.id.startsWith('site-')) updateCombinedSiteStatus(parseInt(task.id.split('-')[1]));

                try {
                    const formData = new FormData();
                    formData.append('action', 'download_asset');
                    formData.append('source_url', task.sourceUrl);
                    formData.append('target_dir', targetDir);
                    formData.append('relative_path', task.targetRelativePath);
                    const response = await fetch('index.php/Proxy/downloadAsset', { method: 'POST', body: formData });
                    if (!response.ok) throw new Error(`服务器返回错误: ${response.status}`);
                    const result = await response.json();
                    if (!result.success) throw new Error(result.message);
                    downloadStatus[task.id] = 'downloaded';
                } catch (error) {
                    downloadStatus[task.id] = 'failed';
                    downloadFailures.set(task.originalPath, error.message);
                }
                
                downloadedCount++;
                updateStatusText();

                updateDownloadStatusUI(task.id, downloadStatus[task.id]);
                if (task.id.startsWith('site-')) updateCombinedSiteStatus(parseInt(task.id.split('-')[1]));
            }

            const remapPath = (originalPath) => {
                if (downloadFailures.has(originalPath)) return originalPath;
                for (const asset of assetsToDownload) {
                    if (asset.originalPath === originalPath) return asset.targetRelativePath;
                }
                return originalPath;
            };

            dataToSave.spider = remapPath(dataToSave.spider);
            (dataToSave.sites || []).forEach(site => {
                site.jar = remapPath(site.jar);
                site.ext = remapPath(site.ext);
                site.api = remapPath(site.api);
            });

            const finalContentToSave = JSON.stringify(dataToSave, null, 2);
            const saveFormData = new FormData();
            saveFormData.append('action', 'save_config');
            saveFormData.append('dir', targetDir);
            saveFormData.append('filename', targetFilename);
            saveFormData.append('content', finalContentToSave);
            const saveResponse = await fetch('index.php/Proxy/saveConfig', { method: 'POST', body: saveFormData });
            if (!saveResponse.ok) throw new Error(`服务器返回错误: ${saveResponse.status}`);
            const saveResult = await saveResponse.json();
            if (!saveResult.success) throw new Error(saveResult.message);
            showToast('主配置文件保存成功！', 'success');

            const failureCount = downloadFailures.size;
            let reportMessage = `<p>总计任务: ${totalCount}<br>成功: ${totalCount - failureCount}<br>失败: ${failureCount}</p>`;
            if (failureCount > 0) {
                let failureList = Array.from(downloadFailures.keys()).map(file => `<li style="color:red; margin-bottom:5px;">${file}</li>`).join('');
                reportMessage += `<p><b>失败列表 (已在配置中保留原始链接):</b></p><ul style="list-style-type:none; padding-left:0; max-height:150px; overflow-y:auto;">${failureList}</ul>`;
            }
            await showDialog({ type: 'alert', title: '下载报告', message: reportMessage, okText: '关闭' });

            const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const newUrl = `${window.location.origin}${currentPath}/box/${targetDir}/${targetFilename}`;
            jsonUrlInput.value = newUrl;
            addToUrlHistory(newUrl);

        } catch (error) {
            showToast(`下载流程发生严重错误: ${error.message}`, 'error');
        } finally {
            document.title = originalTitle;
            fileNameElement.textContent = originalFileName;
            setTimeout(() => {
                document.getElementById('basic').classList.remove('show-status');
                document.getElementById('sites').classList.remove('show-status');
                downloadStatus = {};
                renderAllTabs(currentRulesData);
            }, 5000);
        }
    }

    /**
     * @description 项目编辑的配置对象
     */
    const siteConfig = {
        translations: { key: '唯一标识', name: '规则名称', type: '类型', api: '爬虫接口', ext: '规则链接', searchable: '可搜索', quickSearch: '快速搜索', filterable: '可筛选', jar: 'Jar文件' },
        fieldOrder: ['key', 'name', 'type', 'api', 'ext', 'searchable', 'quickSearch', 'filterable', 'jar'],
        booleanFields: ['searchable', 'quickSearch', 'filterable'],
        textareaFields: ['ext', 'jar'],
        fullWidthFields: ['ext', 'jar']
    };
    const parseConfig = {
        translations: { name: '接口名称', type: '类型', url: '接口地址', ext: '扩展参数' },
        fieldOrder: ['name', 'type', 'url', 'ext'],
        booleanFields: [],
        textareaFields: ['url', 'ext'],
        fullWidthFields: ['url', 'ext']
    };
    const liveConfig = {
        translations: { name: '名称', type: '类型', pass: 'Pass', url: '链接', epg: 'EPG', logo: 'Logo' },
        fieldOrder: ['name', 'type', 'pass', 'url', 'epg', 'logo'],
        booleanFields: ['pass'],
        textareaFields: ['url', 'epg', 'logo'],
        fullWidthFields: ['url', 'epg', 'logo']
    };
    const filterConfig = {
        translations: { host: '主机名', rule: '规则列表', name: '规则名称', hosts: '主机列表' },
        fieldOrder: ['name', 'host', 'hosts', 'rule'],
        booleanFields: [],
        textareaFields: ['host', 'hosts', 'rule'],
        fullWidthFields: ['host', 'hosts', 'rule']
    };
    
    /**
     * @description 为规则列表（grid）中的项处理点击事件（事件委托）
     * @param {Event} e - 点击事件对象
     */
    async function handleGridItemClick(e) {
    const itemContainer = e.target.closest('.rule-item-container');
    if (!itemContainer) return;
    
    const itemType = itemContainer.dataset.itemType;
    const index = parseInt(itemContainer.dataset.index, 10);
    const itemData = currentRulesData[itemType]?.[index];

    if (!itemData) return;
    
    const deleteButton = e.target.closest('.delete-item-btn');
    if(deleteButton){
        e.stopPropagation();
        deleteItem(itemType, index);
        return;
    }

    const actionButton = e.target.closest('.action-btn');
    if(actionButton){
        e.stopPropagation();
        const action = actionButton.dataset.action;
         if (action === 'copy-rule') {
            ruleClipboard.data = JSON.parse(JSON.stringify(itemData));
            ruleClipboard.sourceBaseDir = currentConfigBaseDir;
            showToast(`规则 “${itemData.name}” 已复制到剪贴板`, 'success');
            return;
        }
        if (action === 'check-rule') {
            checkRuleHealth(itemData);
            return;
        }
        if (action === 'test-url' && actionButton.dataset.url) {
            window.open(actionButton.dataset.url, '_blank');
        } else if (action === 'edit-file') {
            updateCurrentRulesDataFromForm();
            
            let targetFile = null;
            const extPath = parseAssetPath(itemData.ext);
            if (extPath && /\.(json|js|py|txt)$/i.test(extPath)) {
                targetFile = extPath;
            }
            const jarPath = parseAssetPath(itemData.jar);
            if (!targetFile && jarPath && /\.(js|py)$/i.test(jarPath)) {
                targetFile = jarPath;
            }

            if (!targetFile) {
                showToast('该规则为内置或不可编辑文件类型', 'info');
                return;
            }

            const isLocal = jsonUrlInput.value.includes(window.location.origin) && jsonUrlInput.value.includes('/box/');
            let fileUrlPath;

            if (isLocal) {
                const mainConfigPath = new URL(jsonUrlInput.value).pathname;
                const baseDir = mainConfigPath.substring(0, mainConfigPath.lastIndexOf('/'));
                const relativeFilePath = targetFile.replace('./', '');
                fileUrlPath = `${baseDir}/${relativeFilePath}`.replace('/box/', '');

                try {
                    const response = await fetch(`index.php/Proxy/checkFileExists?path=${encodeURIComponent(fileUrlPath)}`);
                    const result = await response.json();
                    if (!result.exists) {
                        showToast('文件在服务器上不存在，请先下载', 'error');
                        return;
                    }
                } catch (error) {
                     showToast('检查文件是否存在时出错', 'error');
                     return;
                }
            } else {
                const targetDir = document.getElementById('download-dir-input').value.trim();
                const targetStatusId = /\.(json|js|py)$/i.test(extPath) ? `site-${index}-ext` : `site-${index}-jar`;
                if (downloadStatus[targetStatusId] !== 'downloaded') {
                    showToast('请先下载此规则文件才能进行编辑', 'error');
                    return;
                }
                if (!targetDir) {
                    showToast('下载目录未设置，无法确定文件路径', 'error');
                    return;
                }
                fileUrlPath = `${targetDir}/${targetFile.replace('./', '')}`;
            }
            
            const openUrl = `index.php/Edit?file=${encodeURIComponent(fileUrlPath)}&api=${encodeURIComponent(itemData.api || '')}`;
            
            const editorModal = new Modal({
                id: 'editor-modal-' + md5(fileUrlPath),
                title: '编辑 - ' + itemData.name,
                content: openUrl,
                width: '50%',
                height: '70%',
                showMin: false
            });

            editorModal.open();
        }
    } else {
         openDetailsModal(itemData, itemType, index);
    }
}
    
    /**
     * @description 检测单个规则的资源健康度
     * @param {object} siteData - 被点击的爬虫规则对象
     */
    async function checkRuleHealth(siteData) {
        if (!siteData.ext && !siteData.jar) {
            showToast('该规则没有配置 ext 或 jar 链接，无需检测。', 'info');
            return;
        }

        showDialog({
            type: 'alert',
            title: `检测报告 - ${siteData.name}`,
            message: '<div id="health-check-results"><div class="loading-spinner"></div><p style="text-align:center;">正在检测资源，请稍候...</p></div>',
            okText: '关闭'
        }).catch(()=>{});

        const resultsContainer = document.getElementById('health-check-results');
        
        try {
            const formData = new FormData();
            formData.append('extPath', siteData.ext || '');
            formData.append('jarPath', siteData.jar || '');
            formData.append('baseConfigUrl', jsonUrlInput.value);

            const response = await fetch('index.php/Proxy/checkAssetHealth', { method: 'POST', body: formData });
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message);
            }

            if (result.results.length === 0) {
                resultsContainer.innerHTML = `<p>未找到任何可检测的链接。</p>`;
                return;
            }

            let html = '<ul style="list-style:none; padding:0; margin:0;">';
            result.results.forEach(res => {
                let statusText = res.status;
                let statusColor = 'grey';
                if (statusText === '存在' || (typeof statusText === 'number' && statusText >= 200 && statusText < 400)) {
                    statusColor = 'green';
                } else {
                    statusColor = 'red';
                }
                
                html += `<li style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px solid #eee;">
                            <span style="word-break:break-all; font-size: 14px; padding-right: 10px;">${res.url}</span>
                            <strong style="color:${statusColor}; flex-shrink:0;">${statusText}</strong>
                         </li>`;
            });
            html += '</ul>';
            resultsContainer.innerHTML = html;

        } catch (error) {
            resultsContainer.innerHTML = `<p style="color:red;">检测失败: ${error.message}</p>`;
        }
    }
    
    /**
     * @description 页面初始化和事件绑定
     */
    jsonUrlInput.value = localStorage.getItem('savedJsonUrl') || defaultJsonUrl;

    document.getElementById('readUrlBtn').addEventListener('click', loadAndRenderRulesFromUrl);
    
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const url = jsonUrlInput.value.trim();
            if (!url.startsWith(window.location.origin) || !url.includes('/box/')) {
                showToast('错误：只能保存在此服务器上的文件！', 'error');
                return;
            }

            const pathParts = url.split('/box/');
            const relativePath = pathParts.length > 1 ? pathParts[1] : null;
            if (!relativePath) {
                showToast('无法从URL中解析出有效的文件路径！', 'error');
                return;
            }

            if (Object.keys(currentRulesData).length === 0) {
                showToast('没有可保存的数据，请先加载一个规则文件。', 'warning');
                return;
            }
            updateCurrentRulesDataFromForm();

            const fileContent = JSON.stringify(currentRulesData, null, 2);

            const formData = new FormData();
            formData.append('filePath', relativePath);
            formData.append('fileContent', fileContent);

            showToast('正在保存...', 'info');
            fetch('index.php/Edit/save', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showToast(result.message, 'success');
                } else {
                    throw new Error(result.message);
                }
            })
            .catch(error => {
                showToast(`保存失败: ${error.message}`, 'error');
            });
        });
    }

    document.getElementById('selectFileBtn').addEventListener('click', openFileBrowser);
    document.getElementById('downloadRulesBtn').addEventListener('click', () => {
        if (Object.keys(currentRulesData).length === 0) {
            showToast('请先加载一个配置文件！', 'error');
            return;
        }
        new Modal({
            id: 'download-modal',
            title: '下载配置及资源',
            content: templates.downloadModal(),
            footer: '<button id="start-download-btn" class="btn primary-btn">开始下载</button>'
        });
    });
    document.getElementById('aiHelperBtn').addEventListener('click', () => {
        new Modal({
            id: 'ai-helper-modal',
            title: 'AI 帮写小助手',
            content: templates.aiHelperModal(),
        });
    });
    document.getElementById('historyBtn').addEventListener('click', () => {
        const history = getUrlHistory();
        let listHtml = '<ul id="historyList">';
        if (history.length === 0) {
            listHtml += '<li>没有历史记录。</li>';
        } else {
            history.forEach(url => {
                listHtml += `<li class="history-item" data-url="${url}" title="加载: ${url}">${url}</li>`;
            });
        }
        listHtml += '</ul>';

        new Modal({
            id: 'history-modal',
            title: '加载历史记录',
            content: listHtml,
            footer: '<button id="clearHistoryBtn" class="btn danger-btn">清空历史记录</button>'
        });
    });
    
    document.getElementById('online-edit-btn').addEventListener('click', () => {
        const url = jsonUrlInput.value.trim();
        if (url.startsWith(window.location.origin) && url.includes('/box/')) {
            const pathParts = new URL(url).pathname.split('/box/');
            if (pathParts.length > 1) {
                const filePath = pathParts[1];
                window.open(`index.php/Edit?file=${encodeURIComponent(filePath)}`, '_blank');
            } else {
                showToast('无法从当前URL解析出本地文件路径', 'error');
            }
        } else {
            showToast('请先将规则下载到本地，并加载本地规则后才能进行在线编辑', 'warning');
        }
    });

    document.getElementById('viewSourceBtn').addEventListener('click', () => {
        if (rawJsonContent) {
            const codeElement = document.createElement('pre');
            codeElement.innerHTML = `<code id="sourceCodeView" class="language-json">${rawJsonContent}</code>`;
            new Modal({
                id: 'source-view-modal',
                title: '查看源码',
                content: codeElement.outerHTML,
                width: '80%',
                height: '80%'
            });
        } else {
            showToast('请先加载一个规则文件以查看源码。', 'warning');
        }
    });

    document.getElementById('column-select').addEventListener('change', updateGridColumns);
    localFileInput.addEventListener('change', loadAndRenderRulesFromFile);

    document.body.addEventListener('click', async (e) => {
        if (e.target.id === 'add-spider-btn-modal') addSpider();
        if (e.target.id === 'add-parse-btn-modal') addParse();
        if (e.target.id === 'add-filter-btn-modal') addFilterRule();
        
        if (e.target.id === 'modal-save-btn') saveModalChanges();
        if (e.target.classList.contains('select-api-btn-edit')) {
            const apiInput = e.target.closest('.input-with-buttons').querySelector('.details-input');
            if (apiInput) {
                openApiSelectorModal(apiInput);
            }
        }
        if (e.target.id === 'start-download-btn') startDownloadProcess();
        if (e.target.id === 'select-local-file-btn') {
            closeModalById('file-browser-modal');
            localFileInput.click();
        }
        if (e.target.id === 'open-selected-file-btn') openSelectedServerFile();
        if (e.target.id === 'ai-helper-close-btn') closeModalById('ai-helper-modal');

        // 处理历史记录项的点击
        if (e.target && e.target.classList.contains('history-item')) {
            const url = e.target.dataset.url;
            jsonUrlInput.value = url;
            closeModalById('history-modal');

            loadAndRenderRulesFromUrl();
        }

        // 处理清空历史记录按钮的点击
        if (e.target && e.target.id === 'clearHistoryBtn') {
            localStorage.removeItem('urlHistory');
            const historyList = document.getElementById('historyList');
            if (historyList) {
                historyList.innerHTML = '<li>历史记录已清空。</li>';
            }
            showToast('历史记录已清空', 'success');
        }
        
        /**
         * @description 处理推送到TVBox的请求
         * @param {string} action - 要执行的动作 (test_connection, push_config, search)
         * @param {string} payload - 附加数据 (URL或关键字)
         * @param {string} tvboxIp - TVBox的接口地址
         */
        const handlePush = async (action, payload, tvboxIp) => {
            const formData = new FormData();
            formData.append('tvboxUrl', tvboxIp);
            formData.append('action', action);
            formData.append('payload', payload);
            
            const toastMessage = action === 'test_connection' ? '正在测试连接...' : '正在发送命令...';
            showToast(toastMessage, 'info');

            try {
                const response = await fetch('index.php/Proxy/pushToTvbox', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    showToast(result.message || '命令已成功发送！', 'success');
                    localStorage.setItem('tvbox_push_ip', tvboxIp);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                showToast(`发送失败: ${error.message}`, 'error');
            }
        };
        
        if (e.target.id === 'push-test-btn') {
            const tvboxIp = document.getElementById('push-tvbox-ip').value.trim();
            if (!tvboxIp) {
                showToast('请输入TvBox接口地址！', 'warning');
                return;
            }
            await handlePush('test_connection', '', tvboxIp);
        }
        if (e.target.id === 'push-confirm-btn') {
            const tvboxIp = document.getElementById('push-tvbox-ip').value.trim();
            const configUrl = document.getElementById('push-config-url').value.trim();
            if (!tvboxIp || !configUrl) return;
            await handlePush('push_config', configUrl, tvboxIp);
        }
        if (e.target.id === 'push-search-btn') {
            const tvboxIp = document.getElementById('push-tvbox-ip').value.trim();
            const keyword = document.getElementById('push-search-keyword').value.trim();
            if (!tvboxIp || !keyword) return;
            await handlePush('search', keyword, tvboxIp);
        }

        
        if (e.target.id === 'filter-sites-btn') {
            const sites = currentRulesData.sites || [];
            if (sites.length === 0) {
                showToast('当前没有可供筛选的爬虫规则。', 'info');
                return;
            }

            const uniqueApis = [...new Set(sites.map(site => site.api).filter(Boolean))];
            if (uniqueApis.length === 0) {
                showToast('当前规则中没有可供筛选的爬虫接口(api)。', 'info');
                return;
            }

            let standardApis = [];
            let otherApisExist = false;
            
            uniqueApis.forEach(api => {
                if (api.startsWith('csp_') || api.endsWith('.js') || api.endsWith('.py')) {
                    standardApis.push(api);
                } else {
                    otherApisExist = true;
                }
            });
            
            let dialogContentHtml = `
                <div class="form-group" style="margin-bottom: 10px;">
                    <input type="text" id="api-search-input" placeholder="输入接口名进行搜索..." style="padding: 6px 10px; font-size: 14px;">
                </div>
                <div class="api-filter-grid">`;
            
            let apiButtonsHtml = '';
            apiButtonsHtml += `<button class="btn secondary-btn" data-api-filter="*">显示全部</button>`;
            if (otherApisExist) {
                apiButtonsHtml += `<button class="btn secondary-btn" data-api-filter="__others__">其他接口</button>`;
            }
            standardApis.forEach(api => {
                apiButtonsHtml += `<button class="btn secondary-btn" data-api-filter="${api}">${api}</button>`;
            });

            dialogContentHtml += apiButtonsHtml + '</div>';
            
            try {
                showDialog({
                    type: 'alert',
                    title: '按爬虫接口筛选',
                    message: dialogContentHtml,
                    okText: '关闭'
                });

                setTimeout(() => {
                    const grid = document.querySelector('.api-filter-grid');
                    if (!grid) return;
                    const buttons = grid.querySelectorAll('button');
                    const searchInput = document.getElementById('api-search-input');

                    if (searchInput) {
                        searchInput.addEventListener('input', () => {
                            const searchTerm = searchInput.value.toLowerCase();
                            buttons.forEach(button => {
                                const apiName = button.dataset.apiFilter;
                                if (apiName && apiName.toLowerCase().includes(searchTerm)) {
                                    button.style.display = '';
                                } else {
                                    button.style.display = 'none';
                                }
                            });
                        });
                    }
                    
                    buttons.forEach(button => {
                        if (button.scrollWidth > button.clientWidth) {
                            button.classList.add('has-marquee');
                            const text = button.textContent;
                            button.innerHTML = `<div class="marquee-wrapper"><div class="marquee-text">${text}</div></div>`;
                        }
                    });
                }, 0);
                
                document.body.querySelector('.dialog-overlay').addEventListener('click', (event) => {
                    const filterBtn = event.target.closest('[data-api-filter]');
                    if (filterBtn) {
                        const filterValue = filterBtn.dataset.apiFilter;
                        const allSiteItems = document.querySelectorAll('#sites .rule-item-container');
                        
                        let filterToastMessage = '';
                        allSiteItems.forEach(item => {
                            const siteData = currentRulesData.sites[parseInt(item.dataset.index, 10)];
                            if (!siteData) return;

                            let isMatch = false;
                            if (filterValue === '*') {
                                isMatch = true;
                                filterToastMessage = '已显示全部规则';
                            } else if (filterValue === '__others__') {
                                isMatch = !(siteData.api && (siteData.api.startsWith('csp_') || siteData.api.endsWith('.js') || siteData.api.endsWith('.py')));
                                filterToastMessage = '已筛选：其他接口';
                            } else {
                                isMatch = siteData.api === filterValue;
                                filterToastMessage = `已筛选：${filterValue}`;
                            }
                            if (isMatch) {
                                item.style.display = '';
                            } else {
                                item.style.display = 'none';
                            }
                        });

                        if(filterToastMessage) {
                            showToast(filterToastMessage, 'success');
                        }

                        const closeBtn = document.querySelector('.dialog-overlay .ok-btn');
                        if (closeBtn) closeBtn.click();
                    }
                });

            } catch (err) {
            }
            return;
        }

        const dirHeader = e.target.closest('.file-list-item.is-dir');
        if (dirHeader) {
            const parentLi = dirHeader.parentElement;
            if (parentLi && parentLi.classList.contains('dir')) {
                parentLi.classList.toggle('collapsed');
                const icon = dirHeader.querySelector('.toggle-icon');
                if (icon) icon.textContent = parentLi.classList.contains('collapsed') ? '+' : '−';
            }
        }
        
        const boolSetter = e.target.closest('.bool-setter');
        if(boolSetter){
            const input = document.getElementById(boolSetter.dataset.targetId);
            if (input) {
                input.value = boolSetter.dataset.value;
            }
        }

        const siteFilterBtn = e.target.closest('.site-filter-btn');
        if (siteFilterBtn) {
            applySiteFilter(siteFilterBtn);
        }

        if (e.target.id === 'toggle-custom-content-btn') {
            const ruleLinkInput = document.getElementById('new-site-ext-modal');
            const ruleLinkValue = ruleLinkInput ? ruleLinkInput.value.trim() : '';
            
            if (ruleLinkValue.startsWith('http://') || ruleLinkValue.startsWith('https://')) {
                showToast('“内容”功能仅适用于创建本地相对路径规则文件。', 'warning');
                return;
            }

            const wrapper = document.getElementById('custom-content-wrapper');
            if (wrapper) {
                const isHidden = wrapper.style.display === 'none';
                wrapper.style.display = isHidden ? 'block' : 'none';
                e.target.textContent = isHidden ? '收起' : '内容';
            }
        }

        const deleteAllBtn = e.target.closest('.delete-all-btn');
        if (deleteAllBtn) {
            const itemType = deleteAllBtn.dataset.itemType;
            if (!itemType || !currentRulesData[itemType]) return;
            
            const entityNames = { sites: '爬虫规则', parses: '解析接口', lives: '直播源', rules: '过滤规则' };
            const entityName = entityNames[itemType] || '项目';

            try {
                await showDialog({
                    type: 'confirm',
                    title: '危险操作确认',
                    message: `您确定要清空所有【${entityName}】吗？此操作不可撤销。`
                });

                const container = document.getElementById(itemType);
                container.querySelectorAll('.rule-item-container').forEach(item => {
                    item.classList.add('shake-on-delete');
                    setTimeout(() => item.classList.remove('shake-on-delete'), 800);
                });

                setTimeout(() => {
                    currentRulesData[itemType] = [];
                    if (itemType === 'parses') currentRulesData.flags = [];
                    if (itemType === 'rules') currentRulesData.ads = [];
                    renderAllTabs(currentRulesData);
                    showToast(`所有${entityName}已清空！`, 'success');
                }, 100);

            } catch (error) {
                showToast('操作已取消', 'info');
            }
        }
        
        if (e.target.id === 'paste-rule-btn') {
            if (!ruleClipboard.data) {
                showToast('剪贴板为空，请先复制一条规则。', 'warning');
                return;
            }
            
            const newRule = JSON.parse(JSON.stringify(ruleClipboard.data));
            
            // 检查 key 和 name 冲突
            let keyExists = currentRulesData.sites.some(site => site.key === newRule.key);
            let nameExists = currentRulesData.sites.some(site => site.name === newRule.name);
            while(keyExists || nameExists) {
                newRule.name += '_复制';
                newRule.key += '_copy';
                keyExists = currentRulesData.sites.some(site => site.key === newRule.key);
                nameExists = currentRulesData.sites.some(site => site.name === newRule.name);
            }

            showToast('正在粘贴规则并处理资源文件...', 'info');

            try {
                // 检查并复制 ext 和 jar 资源文件
                for (const key of ['ext', 'jar']) {
                    const assetPath = newRule[key];
                    if (assetPath && typeof assetPath === 'string' && assetPath.startsWith('./')) {
                        const formData = new FormData();
                        formData.append('sourceBasePath', ruleClipboard.sourceBaseDir);
                        formData.append('targetBasePath', currentConfigBaseDir);
                        formData.append('assetRelativePath', assetPath);

                        const response = await fetch('index.php/Proxy/copyAsset', { method: 'POST', body: formData });
                        const result = await response.json();
                        if (!result.success) {
                            throw new Error(result.message);
                        }
                    }
                }

                currentRulesData.sites.unshift(newRule);
                renderSitesTab(currentRulesData.sites);
                showToast(`规则 “${newRule.name}” 已成功粘贴！`, 'success');

            } catch (error) {
                showToast(`粘贴失败: ${error.message}`, 'error');
            }
        }

        
        const createNewBtn = e.target.closest('.create-new-btn');
        if (createNewBtn) {
            const itemType = createNewBtn.dataset.itemType;
            if (itemType === 'sites') {
                new Modal({
                    id: 'add-site-modal',
                    title: '新增爬虫规则',
                    content: templates.addSiteModal(),
                    footer: '<button id="add-spider-btn-modal" class="btn primary-btn">添加</button>'
                });
                // Dynamic updates for the modal
                setTimeout(() => {
                    const addSiteModalElement = document.getElementById('add-site-modal');
                    if(addSiteModalElement) {
                        const nameInput = addSiteModalElement.querySelector('#new-site-name-modal');
                        const apiInput = addSiteModalElement.querySelector('#new-site-api-modal');
                        const keyInput = addSiteModalElement.querySelector('#new-site-key-modal');
                        const label = addSiteModalElement.querySelector('label[for="save-as-default-toggle-modal"]');
                        
                        const updateDynamicFields = () => {
                            const name = nameInput.value.trim();
                            const api = apiInput.value.trim();
                            if (name || api) {
                                keyInput.value = md5(`${Date.now()}${name}${api}`, { pretty: true });
                            } else {
                                keyInput.value = '';
                            }
                            if (label) {
                                label.textContent = api ? `将以上内容保存为 ${api} 的默认模板` : '将以上内容保存为该接口的默认模板';
                            }
                        };
                        
                        nameInput.addEventListener('input', updateDynamicFields);
                        apiInput.addEventListener('input', updateDynamicFields);
                        updateDynamicFields();
                    }
                }, 0);

            } else if (itemType === 'parses') {
                new Modal({
                    id: 'add-parse-modal',
                    title: '新增解析接口',
                    content: templates.addParseModal(),
                    footer: '<button id="add-parse-btn-modal" class="btn primary-btn">添加</button>'
                });
            } else if (itemType === 'rules') {
                 new Modal({
                    id: 'add-filter-modal',
                    title: '新增过滤规则',
                    content: templates.addFilterModal(),
                    footer: '<button id="add-filter-btn-modal" class="btn primary-btn">添加</button>'
                });
            }
        }
    });

    /**
     * @description 推送按钮绑定
     */

    document.getElementById('pushBtn').addEventListener('click', () => {
        const pushModal = new Modal({
            id: 'push-modal',
            title: '推送至TVBox',
            content: templates.pushModal(),
        });
        
        // Populate fields after modal is created
        setTimeout(() => {
            const configUrlInput = document.getElementById('push-config-url');
            const tvboxIpInput = document.getElementById('push-tvbox-ip');
            if(configUrlInput) configUrlInput.value = jsonUrlInput.value;
            if(tvboxIpInput) tvboxIpInput.value = localStorage.getItem('tvbox_push_ip') || '';
        }, 0);
    });

    /**
     * @description 为“新增爬虫规则”弹窗添加动态交互
     */
    if (document.body.querySelector('#add-site-modal')) {
        const addSiteModalElement = document.body.querySelector('#add-site-modal');
        const nameInput = addSiteModalElement.querySelector('#new-site-name-modal');
        const apiInput = addSiteModalElement.querySelector('#new-site-api-modal');
        const keyInput = addSiteModalElement.querySelector('#new-site-key-modal');
        const label = addSiteModalElement.querySelector('label[for="save-as-default-toggle-modal"]');
        
        const updateDynamicFields = () => {
            const name = nameInput.value.trim();
            const api = apiInput.value.trim();

            if (name || api) {
                const timestamp = Date.now();
                const uniqueString = `${timestamp}${name}${api}`;
                keyInput.value = md5(uniqueString, { pretty: true });
            } else {
                keyInput.value = '';
            }

            if (label) {
                if (api) {
                    label.textContent = `将以上内容保存为 ${api} 的默认模板`;
                } else {
                    label.textContent = '将以上内容保存为该接口的默认模板';
                }
            }
        };
        
        addSiteModalElement.addEventListener('input', (e) => {
            if (e.target === nameInput || e.target === apiInput) {
                updateDynamicFields();
            }
        });

        updateDynamicFields();
    }

    /**
     * @description 打开API选择器弹窗，并处理内部所有事件
     */
    function openApiSelectorModal(targetInput) {
        let currentPage = 1;
        let totalPages = 1;
        let isLoading = false;
        let currentSearch = '';

        const dialogContentHtml = `
            <div class="form-group" style="margin-bottom: 10px;">
                <input type="text" id="api-search-input" placeholder="输入接口名进行搜索..." style="padding: 6px 10px; font-size: 14px;">
            </div>
            <div class="api-filter-grid" id="api-selector-list" style="max-height: 45vh;"></div>
        `;

        showDialog({
            type: 'alert',
            title: '选择爬虫接口',
            message: dialogContentHtml,
            okText: '关闭'
        }).catch(() => {});

        const dialogOverlay = document.body.querySelector('.dialog-overlay');
        const listContainer = document.getElementById('api-selector-list');
        const searchInput = document.getElementById('api-search-input');
        
        
        const fetchApiList = async (page, search = '') => {
            if (isLoading || (page > 1 && page > totalPages)) return;
            isLoading = true;
            if (page === 1) listContainer.innerHTML = '<div class="loading-spinner"></div>';

            try {
                const response = await fetch(`index.php/Proxy/getApiList?page=${page}&search=${encodeURIComponent(search)}`);
                const result = await response.json();
                if (result.success) {
                    if (page === 1) listContainer.innerHTML = '';
                    totalPages = result.totalPages;
                    result.data.forEach(api => {
                        const button = document.createElement('button');
                        button.className = 'btn secondary-btn';
                        button.dataset.apiName = api;
                        button.textContent = api;
                        listContainer.appendChild(button);
                    });
                    currentPage++;
                }
            } catch (e) {
                listContainer.innerHTML = '加载列表失败。';
            } finally {
                isLoading = false;
            }
        };

        listContainer.addEventListener('scroll', () => {
            if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 10) {
                fetchApiList(currentPage, currentSearch);
            }
        });
        
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                totalPages = 1;
                currentSearch = searchInput.value;
                listContainer.scrollTop = 0;
                fetchApiList(currentPage, currentSearch);
            }, 300);
        });

        if (dialogOverlay) {
            dialogOverlay.addEventListener('click', (e) => {
                const selectedApiBtn = e.target.closest('[data-api-name]');
                if (selectedApiBtn && targetInput) {
                    targetInput.value = selectedApiBtn.dataset.apiName;
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    const closeBtn = dialogOverlay.querySelector('.ok-btn');
                    if (closeBtn) closeBtn.click();
                }
            });
        }

        fetchApiList(1, '');
    }

    /**
     * @description 为“新增爬虫规则”弹窗添加事件
     */
    if (document.body.querySelector('#add-site-modal')) {
        document.body.querySelector('#add-site-modal').addEventListener('click', (e) => {
            if (e.target.id === 'select-api-btn') {
                const apiInput = document.getElementById('new-site-api-modal');
                openApiSelectorModal(apiInput);
            }
        });
    }    
    /**
     * @description 首页 Ctrl+S 保存快捷键
     */
    setupSaveShortcut(() => {
        const saveButton = document.getElementById('saveBtn');
        if (saveButton) {
            saveButton.click();
        }
    });
    
    loadAndRenderRulesFromUrl();
    updateGridColumns();
});