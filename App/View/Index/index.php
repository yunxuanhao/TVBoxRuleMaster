<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TVbox 规则加载器</title>
    <link rel="stylesheet" href="assets/css/ui.css?t=<?php echo time();?>">
    <link rel="stylesheet" href="assets/css/main.css?t=<?php echo time();?>">
</head>
<body>

    <div class="container">
        <header class="main-header d-flex align-items-center flex-wrap">
            <div class="file-path me-auto">
                <span class="file-icon">📖</span>
                <span id="file-name-display" class="file-name">选择文件或输入链接</span>
            </div>

            <div class="layout-selector">
                <label for="column-select">列表布局:</label>
                <select id="column-select" name="column-select">
                    <option value="1">每行1个</option>
                    <option value="2" selected="">每行2个</option>
                    <option value="3">每行3个</option>
                    <option value="4">每行4个</option>
                </select>
            </div>

            <div class="global-actions">
                <div class="btn-group gbtn-sm">
                    <button id="saveBtn" class="btn primary-btn">保存修改</button>
                    <button id="historyBtn" class="btn secondary-btn">文件历史</button>
                    <button id="online-edit-btn" class="btn secondary-btn">在线编辑</button>
                    <button id="downloadRulesBtn" class="btn secondary-btn">下载</button>
                </div>
            </div>

            <div class="input-with-buttons w-100 mt-2">
                <input type="text" id="jsonUrlInput" placeholder="请输入TVbox规则集合的JSON链接">
                <div class="btn-group">
                    <button id="readUrlBtn" class="btn primary-btn">加载</button>
                    <button id="viewSourceBtn" class="btn secondary-btn">查看源码</button>
                    <button id="selectFileBtn" class="btn secondary-btn">选择文件</button>
                </div>
            </div>
        </header>

        <main class="main-content">
            <div class="tabs">
                <div class="tab-btn active" onclick="openTab(event, 'basic')" data-tab="basic">基础信息</div>
                <div class="tab-btn" onclick="openTab(event, 'lives')" data-tab="lives">直播规则</div>
                <div class="tab-btn" onclick="openTab(event, 'sites')" data-tab="sites">爬虫规则</div>
                <div class="tab-btn" onclick="openTab(event, 'parses')" data-tab="parses">解析接口</div>
                <div class="tab-btn" onclick="openTab(event, 'filters')" data-tab="filters">广告过滤</div>
            </div>
            
            <div id="basic" class="tab-content active" style="display: block;"></div>
            <div id="lives" class="tab-content" style="display: none;"></div>
            <div id="sites" class="tab-content" style="display: none;"></div>
            <div id="parses" class="tab-content" style="display: none;"></div>
            <div id="filters" class="tab-content" style="display: none;"></div>
        </main>


        
        <div id="loading" style="display: none; text-align: center; padding: 20px; font-size: 16px;">正在读取内容...</div>
    </div>

    <div id="templates" style="display: none;">
        
        <script id="add-site-modal-template" type="text/x-handlebars-template">
            <div id="create-spider-form-modal" class="details-panel create-panel active" style="max-height:none; opacity:1; padding:0; background:none;">
                <div class="form-group"><label for="new-site-name-modal">规则名称</label><input id="new-site-name-modal" type="text" placeholder="例如：酷云影视"></div>
                <div class="form-group"><label for="new-site-key-modal">唯一标识</label><input id="new-site-key-modal" type="text" placeholder="例如：ky_m"></div>
                <div class="form-group" style="grid-column: 1 / -1;"><label for="new-site-ext-modal">规则链接</label><input id="new-site-ext-modal" type="text" placeholder="http://.../rule.json"></div>
                <div class="form-group"><label for="new-site-api-modal">爬虫接口</label><input id="new-site-api-modal" type="text" value="csp_XYQHiker"></div>
                <div class="form-group"><label for="new-site-type-modal">类型</label><select id="new-site-type-modal"><option value="1">1 (csp)</option><option value="0">0 (vod)</option><option value="2">2</option><option value="3" selected>3</option></select></div>
                <div class="form-group"><label for="new-site-jar-modal">Jar文件</label><input id="new-site-jar-modal" type="text" placeholder="例如：./libs/Panda.jar"></div>
                <div class="form-group checkbox-group">
                    <input type="checkbox" id="new-site-searchable-modal" style="width: auto;" checked>
                    <label>可搜索</label>
                    <input type="checkbox" id="new-site-filterable-modal" style="width: auto;" checked>
                    <label>可筛选</label>
                    <input type="checkbox" id="new-site-quick-modal" style="width: auto;" checked>
                    <label>快速搜索</label>
                </div>

            </div>
        </script>
        
        <script id="add-parse-modal-template" type="text/x-handlebars-template">
             <div id="create-parse-form-modal" class="details-panel create-panel active" style="max-height:none; opacity:1; padding:0; background:none;">
                <div class="details-form-grid">
                    <div class="form-group"><label for="new-parse-name-modal">接口名称</label><input id="new-parse-name-modal" type="text" placeholder="例如：XX解析"></div>
                    <div class="form-group"><label for="new-parse-type-modal">类型</label><input id="new-parse-type-modal" type="text" placeholder="0, 1, 2, 3"></div>
                    <div class="form-group" style="grid-column: 1 / -1;"><label for="new-parse-url-modal">接口地址(URL)</label><input id="new-parse-url-modal" type="text" placeholder="http://..."></div>
                    <div class="form-group" style="grid-column: 1 / -1;"><label for="new-parse-ext-modal">扩展参数(ext)</label><textarea id="new-parse-ext-modal" rows="3" placeholder='例如：{"header":{"user-agent":"PC_UA"}}'></textarea></div>
                </div>
            </div>
        </script>
        
        <script id="add-filter-modal-template" type="text/x-handlebars-template">
            <div id="create-filter-form-modal" class="details-panel create-panel active" style="max-height:none; opacity:1; padding:0; background:none;">
                <div class="details-form-grid">
                    <div class="form-group"><label for="new-filter-name-modal">规则名称</label><input id="new-filter-name-modal" type="text" placeholder="例如：非凡过滤"></div>
                    <div class="form-group"><label for="new-filter-host-modal">主机名</label><input id="new-filter-host-modal" type="text" placeholder="例如：vip.ffzy"></div>
                    <div class="form-group" style="grid-column: 1 / -1;"><label for="new-filter-hosts-modal">主机列表</label><textarea id="new-filter-hosts-modal" rows="3" placeholder='例如：["vip.ffzy"]'></textarea></div>
                    <div class="form-group" style="grid-column: 1 / -1;"><label for="new-filter-rules-modal">规则列表</label><textarea id="new-filter-rules-modal" rows="3" placeholder='例如：["playwm/?video_id="]'></textarea></div>
                </div>
            </div>
        </script>

        <script id="basic-tab-template" type="text/x-handlebars-template">
            <div class="form-group">
                <label for="spider-url">爬虫Jar (spider) <span id="status-spider" class="download-status"></span></label>
                <input type="text" id="spider-url" name="spider-url" value="{{spiderPath}}">
            </div>
            <div class="form-group">
                <label for="wallpaper-url">壁纸 (wallpaper)</label>
                <input type="text" id="wallpaper-url" name="wallpaper-url" value="{{wallpaper}}">
            </div>
            <div class="form-group">
                <label for="ijk-url">播放器 (ijk)</label>
                <textarea id="ijk-url" name="ijk-url" rows="5">{{ijk}}</textarea>
            </div>
            <div class="form-group">
                <label for="warning-text">警告文本 (warningText)</label>
                <textarea id="warning-text" name="warning-text" rows="3">{{warningText}}</textarea>
            </div>
        </script>

        <script id="simple-item-template" type="text/x-handlebars-template">
            <div id="{{itemType}}-item-{{index}}" class="rule-item-container" data-index="{{index}}" data-item-type="{{itemType}}">
                <button type="button" class="delete-item-btn">&times;</button>
                <div class="form-group">
                    <label for="{{itemType}}-{{index}}">{{name}}</label>
                    <div class="input-with-buttons">
                        <input type="text" id="{{itemType}}-{{index}}" value="{{url}}" readonly>
                        <div class="action-btn-group">
                             <button type="button" class="btn btn-sm secondary-btn action-btn" data-action="test-url" data-url="{{url}}">测试</button>
                        </div>
                    </div>
                </div>
            </div>
        </script>
        
        <script id="site-item-template" type="text/x-handlebars-template">
            <div id="site-item-{{index}}" class="rule-item-container" data-api="{{api}}" data-index="{{index}}" data-item-type="sites">
                <button type="button" class="delete-item-btn">&times;</button>
                <div class="form-group">
                    <label for="site-{{index}}">
                        {{name}}
                        {{#if hasAssets}}
                            <span id="status-site-item-{{index}}" class="download-status {{combinedStatus}}"></span>
                        {{/if}}
                    </label>
                    <div class="input-with-buttons">
                        <input type="text" id="site-{{index}}" value="{{displayValue}}" readonly>
                        <div class="action-btn-group">
                             <button type="button" class="btn btn-sm secondary-btn action-btn" data-action="edit-file">编辑</button>
                        </div>
                    </div>
                </div>
            </div>
        </script>

        <script id="filter-item-template" type="text/x-handlebars-template">
            <div id="rules-item-{{index}}" class="rule-item-container" data-index="{{index}}" data-item-type="rules">
                <button type="button" class="delete-item-btn">&times;</button>
                <div class="form-group">
                    <label for="rules-{{index}}">{{displayName}}</label>
                    <textarea id="rules-{{index}}" readonly rows="3">{{displayValue}}</textarea>
                </div>
            </div>
        </script>
        <script id="tab-content-template" type="text/x-handlebars-template">
            <div class="controls-container d-flex justify-between align-items-center">
                <div class="left-controls">
                    {{#if showCreateButton}}
                        <div class="btn-group">
                            <button type="button" class="btn primary-btn create-new-btn" data-item-type="{{itemType}}">+ 新增</button>
                            <button type="button" class="btn danger-btn delete-all-btn" data-item-type="{{itemType}}">清空</button>
                        </div>
                    {{else}}
                        <button type="button" class="btn danger-btn delete-all-btn" data-item-type="{{itemType}}">清空</button>
                    {{/if}}
                </div>
                <div class="right-controls">
                    {{#if (eq itemType "sites")}}
                        <div class="btn-group">
                            <button type="button" class="btn secondary-btn site-filter-btn" data-filter-type="equals" data-filter-value="csp_XYQHiker">只看XYQH</button>
                            <button type="button" class="btn secondary-btn site-filter-btn" data-filter-type="equals" data-filter-value="csp_XBPQ">只看XBPQ</button>
                            <button type="button" class="btn secondary-btn site-filter-btn" data-filter-type="endsWith" data-filter-value=".js">只看Js</button>
                        </div>
                    {{/if}}
                </div>
            </div>
            <div class="rule-list-grid"></div>
        </script>
        <script id="tab-content-template1" type="text/x-handlebars-template">
            <div class="controls-container">
                <div class="left-controls">
                    <div class="btn-group">
                         <button type="button" class="btn danger-btn delete-all-btn" data-item-type="{{itemType}}">删除全部</button>
                    </div>
                </div>
                <div class="right-controls">
                    {{{rightControls}}}
                </div>
            </div>
            <div class="rule-list-grid"></div>
        </script>

        <script id="details-modal-body-template" type="text/x-handlebars-template">
            <div class="details-form-grid">
                {{#each fields}}
                <div class="details-item" {{#if this.fullWidth}}style="grid-column: 1 / -1;"{{/if}}>
                    <label class="details-label" for="{{this.id}}">{{this.label}}</label>
                    {{#if this.isBoolean}}
                        <div class="input-with-buttons">
                            <input class="details-input" type="text" id="{{this.id}}" value="{{this.value}}">
                            <button type="button" class="btn btn-sm success-btn bool-setter" data-target-id="{{this.id}}" data-value="{{this.trueValue}}">{{this.trueText}}</button>
                            <button type="button" class="btn btn-sm danger-btn bool-setter" data-target-id="{{this.id}}" data-value="{{this.falseValue}}">{{this.falseText}}</button>
                        </div>
                    {{else if this.isTextarea}}
                        <textarea class="details-input" id="{{this.id}}" rows="3">{{this.value}}</textarea>
                    {{else}}
                        <input class="details-input" type="text" id="{{this.id}}" value="{{this.value}}">
                    {{/if}}
                </div>
                {{/each}}
            </div>
        </script>

        <script id="file-browser-body-template" type="text/x-handlebars-template">
            {{#if files.length}}
            <ul class="file-list">
                {{#each files}}
                {{#if (eq type "dir")}}
                <li class="dir collapsed">
                    <div class="file-list-item is-dir">
                        <span class="icon toggle-icon">+</span>
                        <span class="icon">📁</span> {{name}}
                    </div>
                    {{{buildList children}}}
                </li>
                {{else}}
                <li>
                    {{#if (endsWith name ".json")}}
                    <div class="file-list-item is-file">
                        <label>
                            <input type="radio" name="server-file-radio" value="{{path}}">
                            <span class="icon">📄</span> {{name}}
                        </label>
                    </div>
                    {{else}}
                    <div class="file-list-item is-file" style="padding-left: 30px;">
                        <span class="icon">▫️</span> {{name}}
                    </div>
                    {{/if}}
                </li>
                {{/if}}
                {{/each}}
            </ul>
            {{else}}
            <p>服务器上的 "box" 目录为空或不存在。</p>
            {{/if}}
        </script>
        <script id="download-modal-template" type="text/x-handlebars-template">
            <div class="form-group">
                <label for="download-dir-input">存放目录名 (在服务器box/目录下创建)</label>
                <input type="text" id="download-dir-input" placeholder="例如: my_config">
            </div>
            <div class="form-group">
                <label for="download-filename-input">配置文件名</label>
                <input type="text" id="download-filename-input" value="config.json">
            </div>
        </script>

    </div>

    <input type="file" id="localFileInput" accept=".json" style="display: none;">
    <div class="toast-container"></div>
    
    <script src="assets/js/handlebars.min.js"></script>
    <script src="assets/js/utils.js?t=<?php echo time();?>"></script>
    <script src="assets/js/main.js?t=<?php echo time();?>"></script>
    <button id="scrollToTopBtn" title="返回顶部">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
    </button>
</body>
</html>