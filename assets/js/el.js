const formFieldsData = {
    basic: [
        { key: "规则名", id: "规则名", type: "text" },
        { key: "规则作者", id: "规则作者", type: "text" },
        { key: "请求头参数", id: "请求头参数", type: "text", var_btn: { vars: ["User-Agent", "手机", "MOBILE_UA", "Referer", "$", "#", "电脑", "PC_UA"], tips: ["User-Agent$手机#Referer$http://v.qq.com/"] } },
        { key: "网页编码格式", id: "网页编码格式", type: "text", var_btn: { vars: ["UTF-8", "GBK", "GB2312"] } },
        { key: "图片是否需要代理", id: "图片是否需要代理", type: "text" },
        { key: "是否开启获取首页数据", id: "是否开启获取首页数据", type: "text" },
        { key: "首页推荐链接", id: "首页推荐链接", type: "text" }
    ],
    home: [
        { key: "首页列表数组规则", id: "首页列表数组规则", type: "text", test_btn: true },
        { key: "首页片单列表数组规则", id: "首页片单列表数组规则", type: "text", test_btn: true, dependsOn: "首页列表数组规则" },
        { key: "首页片单是否Jsoup写法", id: "首页片单是否Jsoup写法", type: "text", isAdvanced: true }
    ],
    category: {
        rules: [
            { key: "分类起始页码", id: "分类起始页码", type: "text" },
            { key: "分类链接", id: "分类链接", type: "text", var_btn: { vars: ["{cateId}", "{class}", "{area}", "{year}", "{lang}", "{by}", "{catePg}", "[firstPage=]"], tips: ["http://v.qq.com/{cateId}/index{catePg}.html[firstPage=http://v.qq.com/{cateId}/index.html]", "https://v.xxx.xxxx/s/{cateId}/{catePg}?type={class}&year={year}&order={by}"] } },
            { key: "分类名称", id: "分类名称", type: "text" },
            { key: "分类名称替换词", id: "分类名称替换词", type: "text" },
            { key: "分类截取模式", id: "分类截取模式", type: "text", isAdvanced: true },
            { key: "分类Json数据二次截取", id: "分类Json数据二次截取", type: "text", isAdvanced: true },
            { key: "分类列表数组规则", id: "分类列表数组规则", type: "text", test_btn: true, isAdvanced: true },
            { key: "分类片单是否Jsoup写法", id: "分类片单是否Jsoup写法", type: "text", isAdvanced: true },
            { key: "分类片单标题", id: "分类片单标题", type: "text", test_btn: true, isAdvanced: true, dependsOn: "分类列表数组规则" },
            { key: "分类片单链接", id: "分类片单链接", type: "text", test_btn: true, isAdvanced: true, dependsOn: "分类列表数组规则" },
            { key: "分类片单图片", id: "分类片单图片", type: "text", test_btn: true, isAdvanced: true, dependsOn: "分类列表数组规则" },
            { key: "分类片单副标题", id: "分类片单副标题", type: "text", test_btn: true, isAdvanced: true, dependsOn: "分类列表数组规则" },
            { key: "分类片单链接加前缀", id: "分类片单链接加前缀", type: "text", isAdvanced: true },
            { key: "分类片单链接加后缀", id: "分类片单链接加后缀", type: "text", isAdvanced: true }
        ],
        filters: [
            { key: "筛选数据", id: "筛选数据", type: "textarea", var_btn: { vars: ["ext"], tips: ["值为 \"ext\"时，表示筛选菜单需从下列配置中动态获取"] } },
            { key: "筛选子分类名称", id: "筛选子分类名称", type: "text" },
            { key: "筛选子分类替换词", id: "筛选子分类替换词", type: "text" },
            { key: "筛选类型名称", id: "筛选类型名称", type: "text" },
            { key: "筛选类型替换词", id: "筛选类型替换词", type: "text" },
            { key: "筛选地区名称", id: "筛选地区名称", type: "text" },
            { key: "筛选地区替换词", id: "筛选地区替换词", type: "text" },
            { key: "筛选年份名称", id: "筛选年份名称", type: "text" },
            { key: "筛选年份替换词", id: "筛选年份替换词", type: "text" },
            { key: "筛选语言名称", id: "筛选语言名称", type: "text" },
            { key: "筛选语言替换词", id: "筛选语言替换词", type: "text" },
            { key: "筛选排序名称", id: "筛选排序名称", type: "text" },
            { key: "筛选排序替换词", id: "筛选排序替换词", type: "text" }
        ]
    },
    detail: [
        { key: "详情是否Jsoup写法", id: "详情是否Jsoup写法", type: "text" },
        { key: "演员详情", id: "演员详情", type: "text", test_btn: true },
        { key: "简介详情", id: "简介详情", type: "text", test_btn: true },
        { key: "类型详情", id: "类型详情", type: "text", test_btn: true },
        { key: "年代详情", id: "年代详情", type: "text", test_btn: true },
        { key: "地区详情", id: "地区详情", type: "text", test_btn: true }
    ],
    play: [
        { key: "线路列表数组规则", id: "线路列表数组规则", type: "text", test_btn: true },
        { key: "线路标题", id: "线路标题", type: "text", test_btn: true, dependsOn: "线路列表数组规则" },
        { key: "播放列表数组规则", id: "播放列表数组规则", type: "text", test_btn: true, isAdvanced: true },
        { key: "选集列表数组规则", id: "选集列表数组规则", type: "text", test_btn: true, isAdvanced: true, dependsOn: "播放列表数组规则" },
        { key: "选集标题链接是否Jsoup写法", id: "选集标题链接是否Jsoup写法", type: "text", isAdvanced: true },
        { key: "选集标题", id: "选集标题", type: "text", test_btn: true, isAdvanced: true, dependsOn: "播放列表数组规则" },
        { key: "选集链接", id: "选集链接", type: "text", test_btn: true, isAdvanced: true, dependsOn: "播放列表数组规则" },
        { key: "是否反转选集序列", id: "是否反转选集序列", type: "text", isAdvanced: true },
        { key: "选集链接加前缀", id: "选集链接加前缀", type: "text", isAdvanced: true },
        { key: "选集链接加后缀", id: "选集链接加后缀", type: "text", isAdvanced: true },
        { key: "链接是否直接播放", id: "链接是否直接播放", type: "text", isAdvanced: true },
        { key: "直接播放链接加前缀", id: "直接播放链接加前缀", type: "text", isAdvanced: true },
        { key: "直接播放链接加后缀", id: "直接播放链接加后缀", type: "text", isAdvanced: true },
        { key: "直接播放直链视频请求头", id: "直接播放直链视频请求头", type: "text", var_btn: { vars: ["User-Agent", "手机", "MOBILE_UA", "Referer", "$", "#", "电脑", "PC_UA"], tips: ["User-Agent$手机#Referer$http://v.qq.com/"] }, isAdvanced: true },
        { key: "分析MacPlayer", id: "分析MacPlayer", type: "text", isAdvanced: true },
        { key: "是否开启手动嗅探", id: "是否开启手动嗅探", type: "text", isAdvanced: true },
        { key: "手动嗅探视频链接关键词", id: "手动嗅探视频链接关键词", type: "text", isAdvanced: true },
        { key: "手动嗅探视频链接过滤词", id: "手动嗅探视频链接过滤词", type: "text", isAdvanced: true }
    ],
    search: [
        { key: "搜索请求头参数", id: "搜索请求头参数", type: "text", var_btn: { vars: ["User-Agent", "手机", "MOBILE_UA", "Referer", "$", "#", "电脑", "PC_UA"], tips: ["User-Agent$手机#Referer$http://v.qq.com/"] } },
        { key: "搜索链接", id: "搜索链接", type: "text", var_btn: { vars: [";post", "{wd}", "{SearchPg}"], tips: ["POST请求:http://v.qq.com/search.php;post", "POST请求:keyword={wd}&page={SearchPg}", "GET请求:https://www.00000.me/vodsearch/{wd}/page/{SearchPg}.html"] } },
        { key: "POST请求数据", id: "POST请求数据", type: "text", var_btn: { vars: ["{wd}", "{SearchPg}"], tips: ["POST请求:keyword={wd}&page={SearchPg}", "GET请求:https://www.00000.me/vodsearch/{wd}/page/{SearchPg}.html"] } },
        { key: "搜索截取模式", id: "搜索截取模式", type: "text", isAdvanced: true },
        { key: "搜索列表数组规则", id: "搜索列表数组规则", type: "text", test_btn: true, isAdvanced: true },
        { key: "搜索片单是否Jsoup写法", id: "搜索片单是否Jsoup写法", type: "text", isAdvanced: true },
        { key: "搜索片单图片", id: "搜索片单图片", type: "text", test_btn: true, isAdvanced: true, dependsOn: "搜索列表数组规则" },
        { key: "搜索片单标题", id: "搜索片单标题", type: "text", test_btn: true, isAdvanced: true, dependsOn: "搜索列表数组规则" },
        { key: "搜索片单链接", id: "搜索片单链接", type: "text", test_btn: true, isAdvanced: true, dependsOn: "搜索列表数组规则" },
        { key: "搜索片单副标题", id: "搜索片单副标题", type: "text", test_btn: true, isAdvanced: true, dependsOn: "搜索列表数组规则" },
        { key: "搜索片单链接加前缀", id: "搜索片单链接加前缀", type: "text", isAdvanced: true },
        { key: "搜索片单链接加后缀", id: "搜索片单链接加后缀", type: "text", isAdvanced: true }
    ]
};