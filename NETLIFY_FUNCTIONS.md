# Netlify Functions 设置

## 目录结构

登录/注册/密码更新现在使用 Netlify Functions 实现：

```
netlify/
├── functions/
│   ├── auth/
│   │   ├── login.ts          # POST /api/auth/login
│   │   ├── register.ts       # POST /api/auth/register
│   │   └── update-password.ts # PUT /api/auth/update-password
│   └── ... (其他API将来添加)
├── lib/
│   └── db.ts                  # 数据库初始化
```

## 本地开发

在本地开发时，仍然使用 Express 服务器（server.ts）：

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
```

Express 服务器会在 `http://localhost:3000` 启动，并提供相同的 API 路由。

## Netlify 部署

### 自动路由

当部署到 Netlify 时，所有 `/api/*` 请求会自动重定向到对应的 Netlify Functions：

- `/api/auth/login` → `/.netlify/functions/auth/login`
- `/api/auth/register` → `/.netlify/functions/auth/register`
- `/api/auth/update-password` → `/.netlify/functions/auth/update-password`

这个映射由 `netlify.toml` 中的重定向规则配置。

### 部署步骤

```bash
# 1. 确保项目已提交到 GitHub
git push

# 2. Netlify 会自动部署
# - 运行 npm run build（构建Vue应用）
# - 自动部署 netlify/functions 目录下的函数
# - 使用 dist 作为静态文件根目录
```

## 数据持久化

**重要**：当前实现在 Netlify Functions 中使用SQLite数据库，但每次函数执行后数据可能丢失。

### 推荐的生产解决方案：

1. **Supabase**（推荐）- 免费的 PostgreSQL 数据库
   - 替换 `netlify/lib/db.ts` 中的数据库层
   - 使用 Supabase 的 JavaScript SDK

2. **Netlify Blobs**（简单）
   - Netlify 原生存储方案
   - 无需额外设置

3. **MongoDB Atlas** - 灵活的 NoSQL
   - 免费额度充足

### 集成 Supabase 的例子：

```typescript
// netlify/lib/db.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function loginUser(password: string) {
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("admin_password", password)
    .single();
  
  return data;
}
```

需在 Netlify 环境变量中配置：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 常见问题

### Q: 为什么本地部署还是用 Express？
A: 因为 Netlify Functions 在本地开发时需要特殊的工具支持。使用 Express 可以更快地开发和测试。

### Q: 如何在本地测试 Netlify Functions？
A: 使用 Netlify CLI：
```bash
npm install -g netlify-cli
netlify dev
```
这会启动本地 Netlify 环境，包括 Functions 支持。

### Q: 如何添加更多 API 成为 Netlify Functions？
A: 遵循相同的模式：
```
netlify/functions/items/list.ts       # GET /api/items → /.netlify/functions/items/list
netlify/functions/items/create.ts     # POST /api/items → /.netlify/functions/items/create
```
