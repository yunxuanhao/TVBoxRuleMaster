<?php
 /**
 * --------------------------------------------------------------------
 * @description 项目的核心控制器，负责处理远程URL的代理加载、文件列表、文件检查和配置保存等功能。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */
defined('IN_APP') or die('Direct access is not allowed.');

class ProxyController extends BaseController  {

    private $baseSaveDir = './box/';
    private $cacheDir = './cache/';
    private $cacheTtl = 3600;

    /**
     * 构造函数，确保目录存在
     */
    public function __construct(){
        parent::__construct();
        if (!is_dir($this->baseSaveDir)) mkdir($this->baseSaveDir, 0755, true);
        if (!is_dir($this->cacheDir)) mkdir($this->cacheDir, 0755, true);
    }
    
    /**
     * 代理远程URL加载 (默认Action)
     * 访问URL: index.php/Proxy/load?target_url=...
     * (已优化本地文件加载逻辑，可自动计算spider的MD5)
     */
    public function loadAction() {
        if (!isset($_GET['target_url'])) {
            $this->ajaxReturn(['error' => '缺少目标URL (target_url) 参数']);
        }
        
        $targetUrl = $_GET['target_url'];
        $serverHost = $_SERVER['HTTP_HOST'];

        if (strpos($targetUrl, $serverHost) !== false && strpos($targetUrl, '/box/') !== false) {
            $urlParts = parse_url($targetUrl);
            $localPath = realpath(ROOT_PATH . $urlParts['path']);
            
            if ($localPath && file_exists($localPath) && strpos($localPath, realpath(ROOT_PATH)) === 0) {
                header('Content-Type: application/json; charset=utf-8');
                $content = file_get_contents($localPath);
                $data = json_decode($content);

                if (json_last_error() === JSON_ERROR_NONE && is_object($data) && isset($data->spider) && is_string($data->spider)) {
                    $spiderParts = explode(';md5;', $data->spider);
                    $jarRelativePath = $spiderParts[0];

                    $jsonDir = dirname($localPath);
                    $jarAbsolutePath = realpath($jsonDir . '/' . $jarRelativePath);

                    if ($jarAbsolutePath && is_readable($jarAbsolutePath)) {
                        $md5 = md5_file($jarAbsolutePath);
                        $data->spider = $jarRelativePath . ';md5;' . $md5;
                        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    } else {
                        $data->spider = $jarRelativePath;
                        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    }
                } else {
                    echo $content;
                }
                exit;
            } else {
                 $this->ajaxReturn(['error' => '本地文件未找到或路径无效']);
            }
        }

        if (!is_dir($this->cacheDir)) mkdir($this->cacheDir, 0755, true);
        
        $cacheHash = md5($targetUrl);
        $cacheFilePath = $this->cacheDir . $cacheHash . '.cache';

        if (file_exists($cacheFilePath) && (time() - filemtime($cacheFilePath) < $this->cacheTtl)) {
            header('Content-Type: application/json; charset=utf-8');
            echo file_get_contents($cacheFilePath);
            exit;
        }

        $result = httpCurl(['url' => $targetUrl]);
        
        if (isset($result['error'])) {
            $this->ajaxReturn(['error' => 'cURL 请求失败: ' . $result['error']]);
        } else {
            $httpCode = $result['info']['http_code'];
            $contentType = $result['info']['content_type'];

            if ($httpCode >= 200 && $httpCode < 400) {
                file_put_contents($cacheFilePath, $result['body']);
                if ($contentType) header('Content-Type: ' . $contentType);
                else header('Content-Type: application/json; charset=utf-8');
                echo $result['body'];
                exit;
            } else {
                http_response_code($httpCode);
                echo "无法从目标服务器获取内容。服务器返回错误: HTTP " . $httpCode;
                exit;
            }
        }
    }

    /**
     * 列出文件
     * 访问URL: index.php/Proxy/listFiles
     */
    public function listFilesAction() {
        if (!is_dir($this->baseSaveDir)) {
            $this->ajaxReturn([]);
        }

        function scan_directory_recursive($dir, $baseDir) {
            $result = [];
            $items = array_diff(scandir($dir), ['.', '..']);
            foreach ($items as $item) {
                $path = $dir . '/' . $item;
                $relativePath = str_replace($baseDir, '', $path);
                if (is_dir($path)) {
                    $result[] = ['name' => $item, 'type' => 'dir', 'path' => ltrim($relativePath, '/'), 'children' => scan_directory_recursive($path, $baseDir)];
                } else {
                    $result[] = ['name' => $item, 'type' => 'file', 'path' => ltrim($relativePath, '/')];
                }
            }
            return $result;
        }

        $fileTree = scan_directory_recursive(rtrim($this->baseSaveDir, '/'), rtrim($this->baseSaveDir, '/') . '/');
        $this->ajaxReturn($fileTree);
    }

    /**
     * 检查文件是否存在
     * 访问URL: index.php/Proxy/checkFileExists?path=...
     */
    public function checkFileExistsAction(){
        $filePath = isset($_GET['path']) ? sanitize_path($_GET['path']) : '';
        $fullPath = $this->baseSaveDir . $filePath;
        $this->ajaxReturn(['exists' => file_exists($fullPath), 'path' => $filePath]);
    }

    /**
     * 保存配置文件
     * 访问URL: index.php/Proxy/saveConfig (POST请求)
     */
    public function saveConfigAction() {
        if (!isset($_POST['dir'], $_POST['filename'], $_POST['content'])) {
            $this->ajaxReturn(['success' => false, 'message' => '缺少保存配置的参数']);
        }
        
        $targetDir = $this->baseSaveDir . sanitize_path($_POST['dir']) . '/';
        $filename = sanitize_path($_POST['filename']);
        
        if (!is_dir($targetDir)) mkdir($targetDir, 0755, true);

        if (file_put_contents($targetDir . $filename, $_POST['content']) !== false) {
            $this->ajaxReturn(['success' => true, 'message' => '配置文件保存成功']);
        } else {
            $this->ajaxReturn(['success' => false, 'message' => '配置文件写入失败，请检查目录权限']);
        }
    }
    
    /**
     * 下载资源文件
     * 访问URL: index.php/Proxy/downloadAsset (POST请求)
     */
    public function downloadAssetAction() {
        if (!isset($_POST['source_url'], $_POST['target_dir'], $_POST['relative_path'])) {
            $this->ajaxReturn(['success' => false, 'message' => '缺少下载资源的参数']);
        }

        $sourceUrl = $_POST['source_url'];
        $targetDir = sanitize_path($_POST['target_dir']);
        $relativePath = sanitize_path($_POST['relative_path']);
        $localFullPath = $this->baseSaveDir . $targetDir . '/' . $relativePath;
        $localDir = dirname($localFullPath);

        if (!is_dir($localDir)) {
            if (!mkdir($localDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '创建目录失败: ' . $localDir]);
            }
        }
        
        $result = httpCurl(['url' => $sourceUrl]);
        
        if (isset($result['error'])) {
             $this->ajaxReturn(['success' => false, 'message' => 'cURL下载失败: ' . $result['error']]);
        } else {
             if (file_put_contents($localFullPath, $result['body']) !== false) {
                 $this->ajaxReturn(['success' => true, 'message' => '资源下载成功: ' . $localFullPath]);
             } else {
                 $this->ajaxReturn(['success' => false, 'message' => '文件写入本地失败']);
             }
        }
    }

    /**
     * 创建规则文件并填充默认内容
     * 访问URL: index.php/Proxy/createRuleFile (POST请求)
     */
    public function createRuleFileAction() {
        header('Content-Type: application/json');

        $relativePath = $_POST['relativePath'] ?? null;
        $apiName = $_POST['apiName'] ?? null;
        $customContent = $_POST['customContent'] ?? null;

        $saveAsDefault = !empty($_POST['saveAsDefault']) && $_POST['saveAsDefault'] !== 'false';

        if (!$relativePath || !$apiName) {
            $this->ajaxReturn(['success' => false, 'message' => '缺少必要的参数']);
        }

        $targetPath = $this->baseSaveDir . sanitize_path($relativePath);
        $targetDir = dirname($targetPath);

        if (file_exists($targetPath)) {
            // $this->ajaxReturn(['success' => false, 'message' => '文件已存在，无法创建']);
        }

        if (!is_dir($targetDir)) {
            if (!mkdir($targetDir, 0755, true)) {
                $this->ajaxReturn(['success' => false, 'message' => '创建目录失败，请检查 /box 目录权限']);
            }
        }

        $finalContent = '';
        if (!empty($customContent)) {
            $finalContent = $customContent;
        } else {
            $templatePath = ROOT_PATH . '/Json/' . $apiName . '.json';
            if (file_exists($templatePath)) {
                $finalContent = file_get_contents($templatePath);
            } else {
                $this->ajaxReturn([
                    'success' => false,
                    'message' => "默认模板 Json/{$apiName}.json 未找到。请点击“内容”按钮设置默认内容，或在服务器Json目录下手动创建该文件。"
                ]);
                return;
            }
        }

        if (file_put_contents($targetPath, $finalContent) === false) {
            $this->ajaxReturn(['success' => false, 'message' => '规则文件写入失败']);
            return;
        }

        if ($saveAsDefault && !empty($customContent)) {
            $defaultTemplatePath = ROOT_PATH . '/Json/' . $apiName . '.json';
            $defaultTemplateDir = dirname($defaultTemplatePath);
            if (!is_dir($defaultTemplateDir)) {
                mkdir($defaultTemplateDir, 0755, true);
            }
            file_put_contents($defaultTemplatePath, $customContent);
        }

        $this->ajaxReturn(['success' => true, 'message' => '规则文件创建成功']);
    }
}
