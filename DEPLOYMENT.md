# 部署指南（npm 版，前后端）

适用：本仓库的前端（Vite）与后端（server/）。使用 npm 与 pm2；支持 Node 16.20.2 环境。

## 环境要求

- Node：v16.20.2（或任意 16.x ≥16.14）
- 包管理器：npm
- 进程管理：pm2

### 安装 Node v16.20.2（推荐 nvm）

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 16.20.2 && nvm use 16.20.2 && nvm alias default 16.20.2
node -v  # v16.20.2
```

### 安装 pm2

```bash
npm i -g pm2
pm2 -v
```

## 后端部署（server/）

1) 配置环境变量：
```bash
cp server/.env.example server/.env
# 按需编辑 server/.env （创建.env）
DATABASE_URL="mysql://username:Password!@127.0.0.1:3306/bookmarks"
PORT=4000
JWT_SECRET="replace-with-a-strong-secret"
```

2) 安装依赖（已适配 Node 16）：
```bash
npm install
cd server && npm install && cd -
```

3) 数据库迁移与种子（如使用 Prisma）：
```bash
cd server
npm run prisma:generate
npm run prisma:migrate
# 如有种子脚本：npm run seed  或  node prisma/seed.ts（按项目脚本为准）
数据初始化（可选）：`node server/prisma/seed.ts`
cd -
```

4) 构建与本地验证（TypeScript 需先构建）：
```bash
cd server
# 如为 TypeScript，请先构建（若有脚本）：
npm run build  # 没有则跳过
# 本地验证：
npm start      # 或 npm run dev（开发模式）
cd -
```

后端入口文件路径请以实际为准（常见为 `server/dist/index.js`；若直接运行 TS，请在生产中改为已构建的 JS）。

## 前端部署（根目录）

1) 环境变量 `.env` 文件。

2) 安装与构建：
```bash
npm install
npm run build   # 产物在 dist/
```


## 使用 PM2 运行

最小化方案（直接命令启动）：
```bash
# 后端（以构建产物为例）
pm2 start server/dist/index.js --name bookmarks-api --time


# 常用
pm2 status
pm2 logs bookmarks-api --lines 200
pm2 restart bookmarks-api
pm2 stop bookmarks-api
pm2 delete bookmarks-api
pm2 save
pm2 startup   # 按提示执行生成的命令以开机自启
```

## 故障排查（精简）

- Node 版本：确保 `node -v` 为 `v16.20.2`；若 pm2 拿到的是系统 Node，先 `nvm use 16.20.2` 再启动 pm2。
- 端口占用：`lsof -i :3000`、`lsof -i :5173` 或使用 `ss -lntp` 检查。
- 环境变量：确认 `server/.env` 内容与 pm2 进程工作目录（cwd）。必要时将关键变量写入 pm2 配置的 `env`。
- 前端刷新 404：使用 `--spa` 或在 Nginx 中 `try_files $uri /index.html;`。

## 标准上线流程

1. 拉代码：`git pull`
2. 后端装依赖：`npm install`（根目录下的`server/`）
3. 前端装依赖：`npm install`（根目录）
4. 构建：`npm run build`（前端）与 `npm run build`（后端）
5. 启动：`pm2 start server/dist/index.js` 
6. 验证：`pm2 logs`、接口与页面自检


## nginx 配置

server
{
    listen 80;
    listen [::]:80;
    server_name test.tangyikai.top;
    index index.html index.htm default.htm default.html;
    root /www/wwwroot/test.tangyikai.top/dist;
    #CERT-APPLY-CHECK--START
    # 用于SSL证书申请时的文件验证相关配置 -- 请勿删除并保持这段设置在优先级高的位置
    include /www/server/panel/vhost/nginx/well-known/test.tangyikai.top.conf;
    #CERT-APPLY-CHECK--END

    #SSL-START SSL相关配置，请勿删除或修改下一行带注释的404规则
    #error_page 404/404.html;
    #SSL-END

    #ERROR-PAGE-START  错误页配置，可以注释、删除或修改
    #error_page 404 /404.html;
    #error_page 502 /502.html;
    #ERROR-PAGE-END

    #REWRITE-START URL重写规则引用,修改后将导致面板设置的伪静态规则失效
    include /www/server/panel/vhost/rewrite/html_test.tangyikai.top.conf;
    #REWRITE-END

    #禁止访问的文件或目录
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.env|\.svn|\.project|LICENSE|README.md)
    {
        return 404;
    }

    #一键申请SSL证书验证目录相关设置
    location ~ \.well-known{
        allow all;
    }
    
    location /api/ { proxy_pass http://127.0.0.1:4000/api/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; 
      
    }

    #禁止在证书验证目录放入敏感文件
    if ( $uri ~ "^/\.well-known/.*\.(php|jsp|py|js|css|lua|ts|go|zip|tar\.gz|rar|7z|sql|bak)$" ) {
        return 403;
    }

    # location ~ .*\\.(gif|jpg|jpeg|png|bmp|swf)$
    # {
    #     expires      30d;
    #     error_log /dev/null;
    #     access_log /dev/null;
    # }
    

    # location ~ .*\\.(js|css)?$
    # {
    #     expires      12h;
    #     error_log /dev/null;
    #     access_log /dev/null;
    # }
    
    location ~* .(?:gif|jpg|jpeg|png|bmp|webp|svg|ico|js|css)$ {
      if ($arg_v != "") {
        expires -1;
        add_header Cache-Control "no-cache, must-revalidate";
        add_header Pragma "no-cache";
        break;
      }
    }
    
    access_log  /www/wwwlogs/test.tangyikai.top.log;
    error_log  /www/wwwlogs/test.tangyikai.top.error.log;
}
