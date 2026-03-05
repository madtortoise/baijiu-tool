# Netlify 部署指南

## 问题说明
前端在 Netlify 上可以打开，但 API 调用失败是因为后端没有在线。

## 解决方案

### 最快捷方案：部署后端到 Railway（推荐）

#### 步骤 1：部署后端到 Railway
1. 访问 [Railway.app](https://railway.app)
2. 用 GitHub 账号注册登录
3. 新建项目 → Deploy from GitHub → 选择 `baijiu-tool` 仓库
4. Railway 会自动检测到 Node.js 项目
5. 添加启动指令（在 Settings → Deploy）：
   ```
   npm run build && NODE_ENV=production npm run dev
   ```
6. 等待部署完成，获取提供的 URL（例如：`https://baijiu-tool-prod.railway.app`）

#### 步骤 2：在 Netlify 配置环境变量
1. 登录 Netlify Dashboard
2. 进入你的网站设置 → Build & deploy → Environment
3. 添加新环境变量：
   - **Key**: `VITE_API_URL`
   - **Value**: `https://你的-railway-url.railway.app/api` （注意替换为实际 URL）
4. 触发重新部署（Deploy → Trigger deploy）

#### 步骤 3：测试
- 打开 https://baijiu-tool.netlify.app/
- 现在注册和登录应该可以正常工作了

---

## 其他部署选择

### 方案 2：使用 Render
1. 访问 [Render.com](https://render.com)
2. 从 GitHub 创建新项目
3. 使用 Node 运行时
4. 在 Netlify 中设置 `VITE_API_URL=https://你的-render-url.onrender.com/api`

### 方案 3：使用 Heroku（收费）
需要信用卡，但部署流程类似

---

## 本地开发

无需任何修改，直接运行：
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
```

前端会自动连接到本地的 `http://localhost:5173/api`
