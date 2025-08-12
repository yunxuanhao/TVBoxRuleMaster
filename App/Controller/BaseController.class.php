<?php
 /**
 * --------------------------------------------------------------------
 * @description 项目的基础控制器，负责处理所有控制器的基础逻辑。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */
defined('IN_APP') or die('Direct access is not allowed.');

class BaseController extends Controller {
    public function __construct(){
        parent::__construct();
        $this->checkAuth();
    }

    final protected function checkAuth(){
        if (C('NEED_LOGIN') !== true) return;
        
        $controllerName = C('CONTROLLER_NAME');
        $ACTION_NAME = C('ACTION_NAME');
        
        $islogined = !empty($_SESSION['user_authenticated']);
        if (!$islogined) {
            if($controllerName !== 'Login'){
                return $this->redirect('index.php/Login');
            }
        }

    }
}
?>