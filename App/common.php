<?php
if (!defined('IN_APP')) {
    die('Direct access is not allowed.');
}

/**
 * 清理并规范化路径，防止目录遍历攻击
 * @param string $path
 * @return string
 */
function sanitize_path($path) {
    // 移除协议、域名和 ../ & .\
    $path = preg_replace('/^[\w]+:\/\/[^\/]+/', '', $path);
    $path = str_replace(['../', '..\\'], '', $path);
    return trim($path, '/\\');
}

/**
 * 根据配置生成前端可用的URL
 *
 * @param string $controller 控制器名称 (例如: 'Proxy')
 * @param string $action 方法名称 (例如: 'load')
 * @param array $params URL查询参数数组 (例如: ['key' => 'value'])
 * @return string 构建好的URL
 */
function WWW_URL($controller, $action, $params = []) {
    $path_mod = C('PATH_MOD');
    $rewrite = C('REWRITE');
    
    $baseUrl = '';
    $queryParams = $params;

    if (strcasecmp($path_mod, 'PATH_INFO') === 0) {
        $baseUrl = $rewrite ? '' : 'index.php';
        $baseUrl .= '/' . $controller . '/' . $action;
    } else { // NORMAL 模式
        $baseUrl = 'index.php';
        $queryParams['c'] = $controller;
        $queryParams['a'] = $action;
    }

    $queryString = http_build_query($queryParams);

    if (!empty($queryString)) {
        return $baseUrl . '?' . $queryString;
    }
    
    return $baseUrl;
}
/**
 * 格式化路径以适配 VSCode 的文件协议
 *
 * @param string $path 原始路径
 * @return string 格式化后的路径
 */
function formatPathForVSCode($path) {
    $path = str_replace('\\', '/', $path);
    if (preg_match('/^[A-Za-z]:/', $path)) {
        $path = '/' . $path;
    }
    $parts = explode('/', $path);
    $encodedParts = array_map('rawurlencode', $parts);
    $encodedPath = implode('/', $encodedParts);
    
    return $encodedPath;
}

/**
 * 检测当前是否运行在本地开发环境
 * 
 * @return bool 如果是本地环境返回true，否则返回false
 */
function isLocalEnvironment() {
    // 1. 检查服务器IP地址
    $serverIP = $_SERVER['SERVER_ADDR'] ?? '';
    $remoteIP = $_SERVER['REMOTE_ADDR'] ?? '';
    
    $localIPs = ['127.0.0.1', '::1'];
    if (in_array($serverIP, $localIPs)) {
        return true;
    }
    
    // 2. 检查主机名
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (strpos($host, 'localhost') !== false || 
        strpos($host, '.local') !== false || 
        strpos($host, '127.0.0.1') !== false) {
        return true;
    }
    
    // 3. 检查开发环境变量（如Laravel的APP_ENV）
    if (getenv('APP_ENV') === 'local' || getenv('APP_ENV') === 'development') {
        return true;
    }
    
    // 4. 检查常见的开发域名模式
    if (preg_match('/\.(test|dev|local)$/', $host)) {
        return true;
    }
    
    // 5. 检查X-Forwarded-For头（适用于某些本地代理设置）
    $forwardedFor = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwardedFor && in_array(trim(explode(',', $forwardedFor)[0], $localIPs))) {
        return true;
    }
    
    // 6. 检查是否通过VPN或内网访问
    $ipLong = ip2long($remoteIP);
    $privateRanges = [
        ['10.0.0.0', '10.255.255.255'],
        ['172.16.0.0', '172.31.255.255'],
        ['192.168.0.0', '192.168.255.255']
    ];
    
    foreach ($privateRanges as $range) {
        $start = ip2long($range[0]);
        $end = ip2long($range[1]);
        if ($ipLong >= $start && $ipLong <= $end) {
            return true;
        }
    }
    
    return false;
}

/**
 * @description (新增) 递归删除目录及其所有内容
 * @param string $dir 要删除的目录路径
 * @return bool
 */
function deleteDirectory($dir) {
    if (!file_exists($dir)) {
        return true;
    }
    if (!is_dir($dir)) {
        return unlink($dir);
    }
    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..') {
            continue;
        }
        if (!deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
            return false;
        }
    }
    return rmdir($dir);
}
/**
 * 发起一个 cURL HTTP 请求
 *
 * @param array $options cURL请求的配置数组
 * @return array 成功时返回 ['body' => string, 'info' => array], 失败时返回 ['error' => string]
 * 如果 RETURNHEADER 为 true, 成功时返回 ['header' => string, 'body' => string, 'info' => array]
 */
function httpCurl($options) {
    if (empty($options['url'])) {
        return ['error' => 'cURL Error: URL is required.'];
    }
    
    $url            = $options['url'];
    $postData       = $options['data'] ?? null;
    $headers        = $options['header'] ?? [];
    $timeout        = $options['TIMEOUT'] ?? 15;
    $returnHeader   = $options['RETURNHEADER'] ?? false;
    $returnTransfer = $options['RETURNTRANSFER'] ?? true;
    $followLocation = $options['FOLLOWLOCATION'] ?? true;
    
    if (!array_filter($headers, function($h) { return stripos($h, 'User-Agent:') === 0; })) {
        $headers[] = 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36';
    }
    
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, $returnTransfer);
    curl_setopt($ch, CURLOPT_HEADER, $returnHeader);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, $followLocation);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    if (!empty($postData)) {
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    }
    
    $response = curl_exec($ch);
    $err = curl_error($ch);
    $info = curl_getinfo($ch);
    
    curl_close($ch);
    
    if ($err) {
        return ['error' => $err];
    }
    
    $result = ['body' => $response, 'info' => $info];

    if ($returnHeader) {
        $headerSize = $info['header_size'];
        $result['header'] = substr($response, 0, $headerSize);
        $result['body'] = substr($response, $headerSize);
    }

    return $result;
}