<?php
/**
 * 获取和设置配置参数 支持批量定义
 * 如果$key是关联型数组，则会按K-V的形式写入配置
 * 如果$key是数字索引数组，则返回对应的配置数组
 * @param string|array $key 配置变量
 * @param array|null $value 配置值
 * @return array|null
 */
function C($key = null,$value=null){
    static $_config = array();
    $args = func_num_args();
    if(is_null($key)){
        return $_config;  //如果传入的key是null，则返回所有配置
    }
    if($args == 1){
        if(is_string($key)){  //如果传入的key是字符串
            return isset($_config[$key])?$_config[$key]:null;
        }
        if(is_array($key)){
            if(array_keys($key) !== range(0, count($key) - 1)){  //如果传入的key是关联数组
                $_config = array_merge($_config, $key);
            }else{
                $ret = array();
                foreach ($key as $k) {
                    $ret[$k] = isset($_config[$k])?$_config[$k]:null;
                }
                return $ret;
            }
        }


    }else{
        if(is_string($key)){
            $_config[$key] = $value;
        }else{
            halt('传入参数不正确');
        }
    }
    return null;
}

/**
 * 调用Widget
 * @param string $name widget名
 * @param array $data 传递给widget的变量列表，key为变量名，value为变量值
 * @return void
 */
function W($name, $data = array()){
    $fullName = $name.'Widget';
    if(!class_exists($fullName)){
        halt('Widget '.$name.'不存在');
    }
    $widget = new $fullName();
    $widget->invoke($data);
}

/**
 * 调用其他控制器的动作 支持A('name/action')和A('name','action')两种方式
 * @param string $name 控制器名或"控制器/动作"
 * @param string $action 动作名
 * @param array $data 传递的参数
 * @return mixed
 */
function A($name, $action = '', $data = array()){
    if(strpos($name, '/')){
        list($name, $action) = explode('/', $name);
    }
    $fullName = ucfirst(strtolower($name)) . 'Controller';
    if(!class_exists($fullName)){
        halt('控制器 ' . $name . ' 不存在');
    }
    $controller = new $fullName();
    $actionName = $action . 'Action';
    if(!method_exists($controller, $actionName)){
        halt('方法 ' . $action . ' 不存在');
    }
    // 将$data中的值赋给控制器，以便在动作中使用
    if(is_array($data) && !empty($data)){
        foreach($data as $key => $value){
            $controller->assign($key, $value);
        }
    }
    return $controller->$actionName();
}

/**
 * 终止程序运行
 * @param string $str 终止原因
 * @param bool $display 是否显示调用栈，默认不显示
 * @return void
 */
function halt($str, $display=false){
    Log::fatal($str.' debug_backtrace:'.var_export(debug_backtrace(), true));
    header("Content-Type:text/html; charset=utf-8");
    if($display){
        echo "<pre>";
        debug_print_backtrace();
        echo "</pre>";
    }
    echo $str;
    exit;
}

/**
 * 获取数据库实例 (Medoo)
 * 如果Lib目录下有medoo.php，则初始化并返回Medoo实例
 * 否则返回null
 * @return \Medoo\Medoo|null
 */
function M(){
    static $instance = null;
    static $checked = false;

    if ($checked) {
        return $instance;
    }

    $medooPath = C('APP_FULL_PATH').'Lib/medoo.php';

    if (file_exists($medooPath)) {
        include_once $medooPath;
        
        if (!class_exists('\Medoo\Medoo')) {
            $checked = true;
            halt('medoo.php 文件已存在, 但 \Medoo\Medoo 类未找到.');
            return null; // or just halt
        }

        $conf = C(array('DB_HOST','DB_PORT','DB_USER','DB_PWD','DB_NAME','DB_CHARSET'));
        
        if (empty($conf['DB_HOST']) || empty($conf['DB_USER']) || empty($conf['DB_NAME'])) {
             Log::warn('数据库配置不完整 (DB_HOST, DB_USER, DB_NAME), 无法初始化Medoo');
             $checked = true;
             return null;
        }

        $medooConf = [
            'database_type' => C('DB_TYPE') ?: 'mysql',
            'server' => $conf['DB_HOST'],
            'database_name' => $conf['DB_NAME'],
            'username' => $conf['DB_USER'],
            'password' => $conf['DB_PWD'] ?? '',
            'charset' => $conf['DB_CHARSET'] ?: 'utf8',
            'port' => $conf['DB_PORT'] ?: 3306,
            'option' => [ // 增加PDO选项，增强健壮性
                PDO::ATTR_CASE => PDO::CASE_NATURAL,
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]
        ];
        
        try {
            $instance = new \Medoo\Medoo($medooConf);
        } catch (\Exception $e) {
            halt('Medoo 数据库连接失败: ' . $e->getMessage());
            $instance = null;
        }
    }
    
    $checked = true;
    return $instance;
}


/**
 * 如果文件存在就include进来
 * @param string $path 文件路径
 * @return void
 */
function includeIfExist($path){
    if(file_exists($path)){
        include $path;
    }
}

/**
 * 总控类
 */
class Core {
    /**
     * 控制器
     * @var string
     */
    private $c;
    /**
     * Action
     * @var string
     */
    private $a;
    /**
     * 单例
     * @var Core
     */
    private static $_instance;

    /**
     * 构造函数，初始化配置
     * @param array $conf
     */
    private function __construct($conf){
        C($conf);
    }
    private function __clone(){}

    /**
     * 获取单例
     * @param array $conf
     * @return Core
     */
    public static function getInstance($conf){
        if(!(self::$_instance instanceof self)){
            self::$_instance = new self($conf);
        }
        return self::$_instance;
    }
    /**
     * 运行应用实例
     * @access public
     * @return void
     */
    public function run(){
        if(C('USE_SESSION') == true){
            session_start();
        }
        define('IS_GET', $_SERVER['REQUEST_METHOD'] === 'GET');
        define('IS_POST', $_SERVER['REQUEST_METHOD'] === 'POST');
        define('IS_AJAX', isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest');
    
        C('APP_FULL_PATH', getcwd().'/'.C('APP_PATH').'/');
        includeIfExist( C('APP_FULL_PATH').'/common.php');
        $pathMod = C('PATH_MOD');
        $pathMod = empty($pathMod)?'NORMAL':$pathMod;
        spl_autoload_register(array('Core', 'autoload'));
        
        if(strcmp(strtoupper($pathMod),'NORMAL') === 0 || (!isset($_SERVER['PATH_INFO']) && !isset($_SERVER['REQUEST_URI']))){
            $this->c = isset($_GET['c'])?$_GET['c']:'Index';
            $this->a = isset($_GET['a'])?$_GET['a']:'Index';
        }else{
            $pathInfo = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : $_SERVER['REQUEST_URI'];
            if (($pos = strpos($pathInfo, '?')) !== false) {
                $pathInfo = substr($pathInfo, 0, $pos);
            }
            $pathInfo = preg_replace('/index\.php/i', '', $pathInfo);
            $pathInfoArr = explode('/',trim($pathInfo,'/'));
            
            if(isset($pathInfoArr[0]) && $pathInfoArr[0] !== ''){
                $this->c = $pathInfoArr[0];
            }else{
                $this->c = 'Index';
            }
            if(isset($pathInfoArr[1])){
                $this->a = $pathInfoArr[1];
            }else{
                $this->a = 'Index';
            }
        }
    
        C('CONTROLLER_NAME', $this->c);
        C('ACTION_NAME', $this->a);
        if(!class_exists($this->c.'Controller')){
            halt('控制器'.$this->c.'不存在');
        }
        $controllerClass = $this->c.'Controller';
        $controller = new $controllerClass();
        if(!method_exists($controller, $this->a.'Action')){
            halt('方法'.$this->a.'不存在');
        }
        call_user_func(array($controller,$this->a.'Action'));
    }
    /**
     * 自动加载函数
     * @param string $class 类名
     */
    public static function autoload($class){
        if(substr($class,-10)=='Controller'){
            includeIfExist(C('APP_FULL_PATH').'/Controller/'.$class.'.class.php');
        }elseif(substr($class,-6)=='Widget'){
            includeIfExist(C('APP_FULL_PATH').'/Widget/'.$class.'.class.php');
        }else{
            includeIfExist(C('APP_FULL_PATH').'/Lib/'.$class.'.class.php');
        }
    }
}

/**
 * 控制器类
 */
class Controller {
    /**
     * 视图实例
     * @var View
     */
    private $_view;

    /**
     * 构造函数，初始化视图实例，调用hook
     */
    public function __construct(){
        $this->_view = new View();
        $this->_init();
    }

    /**
     * 前置hook
     */
    protected function _init(){}
    /**
     * 渲染模板并输出
     * @param null|string $tpl 模板文件路径
     * 参数为相对于App/View/文件的相对路径，不包含后缀名，例如index/index
     * 如果参数为空，则默认使用$controller/$action.php
     * 如果参数不包含"/"，则默认使用$controller/$tpl
     * @return void
     */
    protected function display($tpl=''){
        if($tpl === ''){
            $trace = debug_backtrace();
            $controller = substr($trace[1]['class'], 0, -10);
            $action = substr($trace[1]['function'], 0 , -6);
            $tpl = $controller . '/' . $action;
        }elseif(strpos($tpl, '/') === false){
            $trace = debug_backtrace();
            $controller = substr($trace[1]['class'], 0, -10);
            $tpl = $controller . '/' . $tpl;
        }
        $this->_view->display($tpl);
    }
    /**
     * 为视图引擎设置一个模板变量
     * @param string $name 要在模板中使用的变量名
     * @param mixed $value 模板中该变量名对应的值
     * @return void
     */
    protected function assign($name,$value){
        $this->_view->assign($name,$value);
    }
    /**
     * 将数据用json格式输出至浏览器，并停止执行代码
     * @param array $data 要输出的数据
     */
    protected function ajaxReturn($data){
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
    /**
     * 重定向至指定url
     * @param string $url 要跳转的url
     * @param void
     */
    protected function redirect($url){
        header("Location: $url");
        exit;
    }
}

/**
 * 视图类
 */
class View {
    /**
     * 视图文件目录
     * @var string
     */
    private $_tplDir;
    /**
     * 视图文件路径
     * @var string
     */
    private $_viewPath;
    /**
     * 视图变量列表
     * @var array
     */
    private $_data = array();
    /**
     * 给tplInclude用的变量列表
     * @var array
     */
    private static $tmpData;

    /**
     * @param string $tplDir
     */
    public function __construct($tplDir=''){
        if($tplDir == ''){
            $this->_tplDir = './'.C('APP_PATH').'/View/';
        }else{
            $this->_tplDir = $tplDir;
        }

    }
    /**
     * 为视图引擎设置一个模板变量
     * @param string $key 要在模板中使用的变量名
     * @param mixed $value 模板中该变量名对应的值
     * @return void
     */
    public function assign($key, $value) {
        $this->_data[$key] = $value;
    }
    /**
     * 渲染模板并输出
     * @param null|string $tplFile 模板文件路径，相对于App/View/文件的相对路径，不包含后缀名，例如index/index
     * @return void
     */
    public function display($tplFile) {
        $this->_viewPath = $this->_tplDir . $tplFile . '.php';
        unset($tplFile);
        extract($this->_data);
        include $this->_viewPath;
    }
    /**
     * 用于在模板文件中包含其他模板
     * @param string $path 相对于View目录的路径
     * @param array $data 传递给子模板的变量列表，key为变量名，value为变量值
     * @return void
     */
    public static function tplInclude($path, $data=array()){
        self::$tmpData = array(
            'path' => C('APP_FULL_PATH') . '/View/' . $path . '.php',
            'data' => $data,
        );
        unset($path);
        unset($data);
        extract(self::$tmpData['data']);
        include self::$tmpData['path'];
    }
}

/**
 * Widget类
 * 使用时需继承此类，重写invoke方法，并在invoke方法中调用display
 */
class Widget {
    /**
     * 视图实例
     * @var View
     */
    protected $_view;
    /**
     * Widget名
     * @var string
     */
    protected $_widgetName;

    /**
     * 构造函数，初始化视图实例
     */
    public function __construct(){
        $this->_widgetName = get_class($this);
        $dir = C('APP_FULL_PATH') . '/Widget/Tpl/';
        $this->_view = new View($dir);
    }

    /**
     * 处理逻辑
     * @param mixed $data 参数
     */
    public function invoke($data){}

    /**
     * 渲染模板
     * @param string $tpl 模板路径，如果为空则用类名作为模板名
     */
    protected function display($tpl=''){
        if($tpl == ''){
            $tpl = $this->_widgetName;
        }
        $this->_view->display($tpl);
    }

    /**
     * 为视图引擎设置一个模板变量
     * @param string $name 要在模板中使用的变量名
     * @param mixed $value 模板中该变量名对应的值
     * @return void
     */
    protected function assign($name,$value){
        $this->_view->assign($name,$value);
    }
}

/**
 * 日志类
 * 使用方法：Log::fatal('error msg');
 * 保存路径为 App/Log，按天存放
 * fatal和warning会记录在.log.wf文件中
 */
class Log{
    /**
     * 打日志，支持SAE环境
     * @param string $msg 日志内容
     * @param string $level 日志等级
     * @param bool $wf 是否为错误日志
     */
    public static function write($msg, $level='DEBUG', $wf=false){
        if(function_exists('sae_debug')){ //如果是SAE，则使用sae_debug函数打日志
            $msg = "[{$level}]".$msg;
            sae_set_display_errors(false);
            sae_debug(trim($msg));
            sae_set_display_errors(true);
        }else{
            $msg = date('[ Y-m-d H:i:s ]')."[{$level}]".$msg."\r\n";
            $logPath = C('APP_FULL_PATH').'/Log/'.date('Ymd').'.log';
            if($wf){
                $logPath .= '.wf';
            }
            file_put_contents($logPath, $msg, FILE_APPEND);
        }
    }

    /**
     * 打印fatal日志
     * @param string $msg 日志信息
     */
    public static function fatal($msg){
        self::write($msg, 'FATAL', true);
    }

    /**
     * 打印warning日志
     * @param string $msg 日志信息
     */
    public static function warn($msg){
        self::write($msg, 'WARN', true);
    }

    /**
     * 打印notice日志
     * @param string $msg 日志信息
     */
    public static function notice($msg){
        self::write($msg, 'NOTICE');
    }

    /**
     * 打印debug日志
     * @param string $msg 日志信息
     */
    public static function debug($msg){
        self::write($msg, 'DEBUG');
    }

    /**
     * 打印sql日志
     * @param string $msg 日志信息
     */
    public static function sql($msg){
        self::write($msg, 'SQL');
    }
}

/**
 * ExtException类，记录额外的异常信息
 */
class ExtException extends Exception{
    /**
     * @var array
     */
    protected $extra;

    /**
     * @param string $message
     * @param array $extra
     * @param int $code
     * @param null $previous
     */
    public function __construct($message = "", $extra = array(), $code = 0, $previous = null){
        $this->extra = $extra;
        parent::__construct($message, $code, $previous);
    }

    /**
     * 获取额外的异常信息
     * @return array
     */
    public function getExtra(){
        return $this->extra;
    }
}