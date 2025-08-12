<?php
 /**
 * --------------------------------------------------------------------
 * @description 项目的登录控制器，负责处理用户登录和登出逻辑。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */
defined('IN_APP') or die('Direct access is not allowed.');

class LoginController extends BaseController {
    
    public function indexAction(){
        $this->display('Login/index');
    }

    public function doLoginAction(){
        $password = $_POST['password'] ?? '';
        $correct_password = C('PASSWORD');
        
        if (!empty($password) && $password === $correct_password) {
            $_SESSION['user_authenticated'] = true;
            $this->redirect('/');
        } else {
            $this->assign('error', '密码错误，请重试。');
            $this->display('Login/index');
        }
    }

    public function logoutAction(){
        session_destroy();
        $this->redirect('/');
    }
}
?>