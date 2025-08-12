<?php
 /**
 * --------------------------------------------------------------------
 * @description 项目的首页控制器，负责处理首页的显示逻辑。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */
defined('IN_APP') or die('Direct access is not allowed.');

class IndexController extends BaseController {

    public function indexAction(){
        $this->display('Index/index');
    }
}
?>