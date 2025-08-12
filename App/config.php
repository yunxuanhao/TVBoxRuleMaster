<?php
// 应用配置文件
return array(
    /**
     * URL路由模式
     * - 'NORMAL':    普通模式 index.php?c=Controller&a=Action
     * - 'PATH_INFO': 路径模式 index.php/Controller/Action
     */
    'PATH_MOD' => 'PATH_INFO',

    /**
     * 是否开启URL重写（伪静态）
     * 开启后会隐藏URL中的 index.php，需要Web服务器配置重写规则。
     * - true:  /Controller/Action
     * - false: /index.php/Controller/Action
     */
    'REWRITE' => false,

    /**
     * 其他应用配置
     */
    'PASSWORD' => 'tvbox',
    'NEED_LOGIN' => true,
    'USE_SESSION' => true,
    'PC_UA' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
);