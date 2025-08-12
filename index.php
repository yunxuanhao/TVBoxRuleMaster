<?php
/**
 * 应用唯一的入口文件
 */
define('ROOT_PATH', dirname(__FILE__));
define('IN_APP', true);
define('APP_PATH','App');
//print_r($_SERVER);die;
require_once 'Core.php';
$conf = require_once APP_PATH.'/config.php';
$conf['APP_PATH'] = APP_PATH; // 必须设置应用路径
Core::getInstance($conf)->run();
