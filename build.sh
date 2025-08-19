#!/bin/bash

# 打印日志，方便调试
echo "Build script started..."

# 创建 api 目录，-p 参数确保目录不存在时才创建，存在时也不会报错
mkdir -p api

echo "Moving files to api/ directory..."

# 查找当前目录下的所有文件和文件夹(除了 api, .vercel, .git 和配置文件)
# 然后将它们移动到 api/ 目录中
# find . -maxdepth 1: 只查找当前目录（深度为1）
# -not -name '...': 排除指定的文件或目录
# -exec mv -t api/ {} +: 高效地将所有找到的项目移动到 api/ 目录下
find . -maxdepth 1 \
  -not -name 'api' \
  -not -name 'vercel.json' \
  -not -name 'package.json' \
  -not -name 'build.sh' \
  -not -name '.git' \
  -not -name '.vercel' \
  -not -name '.' \
  -exec mv -t api/ {} +

echo "Build script finished successfully."