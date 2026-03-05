import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const db = new Database("items.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    industry_name TEXT NOT NULL,
    admin_password TEXT NOT NULL,
    sub_user_password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { industryName, adminPassword, subUserPassword } = req.body;
    
    if (!industryName || !adminPassword || !subUserPassword) {
      return res.status(400).json({ error: "缺少必要字段" });
    }

    if (adminPassword.length > 10 || subUserPassword.length > 10) {
      return res.status(400).json({ error: "密码不能超过10个字符" });
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO accounts (industry_name, admin_password, sub_user_password)
        VALUES (?, ?, ?)
      `);
      const result = stmt.run(industryName, adminPassword, subUserPassword);
      res.json({ accountId: result.lastInsertRowid, industryName });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "注册失败，请重试" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: "缺少密码" });
    }

    try {
      // 查找匹配管理员密码的账户
      let account = db.prepare(`
        SELECT id, industry_name, admin_password FROM accounts 
        WHERE admin_password = ?
      `).get(password);

      if (account) {
        return res.json({ 
          accountId: account.id, 
          industryName: account.industry_name,
          userType: 'admin'
        });
      }

      // 查找匹配子用户密码的账户
      account = db.prepare(`
        SELECT id, industry_name FROM accounts 
        WHERE sub_user_password = ?
      `).get(password);

      if (account) {
        return res.json({ 
          accountId: account.id, 
          industryName: account.industry_name,
          userType: 'sub_user'
        });
      }

      res.status(401).json({ error: "密码错误，请重试" });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "登录失败，请重试" });
    }
  });

  app.put("/api/auth/update-password", (req, res) => {
    const { accountId, adminPassword, subUserPassword } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ error: "缺少账户ID" });
    }

    if (adminPassword && adminPassword.length > 10) {
      return res.status(400).json({ error: "管理员密码不能超过10个字符" });
    }

    if (subUserPassword && subUserPassword.length > 10) {
      return res.status(400).json({ error: "子用户密码不能超过10个字符" });
    }

    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (adminPassword) {
        updates.push("admin_password = ?");
        values.push(adminPassword);
      }

      if (subUserPassword) {
        updates.push("sub_user_password = ?");
        values.push(subUserPassword);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "至少需要修改一个密码" });
      }

      values.push(accountId);
      const query = `UPDATE accounts SET ${updates.join(", ")} WHERE id = ?`;
      db.prepare(query).run(...values);

      res.json({ success: true });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ error: "更新密码失败，请重试" });
    }
  });

  // API Routes
  app.get("/api/items", (req, res) => {
    const { name, priceRanges, accountId } = req.query;
    
    if (!accountId) {
      return res.status(400).json({ error: "缺少账户ID" });
    }

    let query = "SELECT * FROM items WHERE account_id = ?";
    const params: any[] = [accountId];

    if (name) {
      query += " AND name LIKE ?";
      params.push(`%${name}%`);
    }

    if (priceRanges) {
      const ranges = (priceRanges as string).split(",");
      const rangeConditions: string[] = [];
      
      ranges.forEach(range => {
        if (range === "0-100") rangeConditions.push("(price >= 0 AND price <= 100)");
        else if (range === "100-200") rangeConditions.push("(price > 100 AND price <= 200)");
        else if (range === "200-300") rangeConditions.push("(price > 200 AND price <= 300)");
        else if (range === "300-400") rangeConditions.push("(price > 300 AND price <= 400)");
        else if (range === "400+") rangeConditions.push("(price > 400)");
      });

      if (rangeConditions.length > 0) {
        query += ` AND (${rangeConditions.join(" OR ")})`;
      }
    }

    query += " ORDER BY created_at DESC";
    
    try {
      const items = db.prepare(query).all(...params);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.post("/api/items", (req, res) => {
    const { name, description, price, stock, image, accountId } = req.body;
    
    if (!name || price === undefined || stock === undefined || !accountId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (stock < 0) {
      return res.status(400).json({ error: "库存不能为负数" });
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO items (account_id, name, description, price, stock, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(accountId, name, description, price, stock, image);
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  app.put("/api/items/:id", (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, image, accountId } = req.body;

    if (!name || price === undefined || stock === undefined || !accountId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (stock < 0) {
      return res.status(400).json({ error: "库存不能为负数" });
    }

    try {
      const stmt = db.prepare(`
        UPDATE items 
        SET name = ?, description = ?, price = ?, stock = ?, image_url = ?
        WHERE id = ? AND account_id = ?
      `);
      stmt.run(name, description, price, stock, image, id, accountId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", (req, res) => {
    const { id } = req.params;
    const { accountId } = req.query;
    
    if (!accountId) {
      return res.status(400).json({ error: "缺少账户ID" });
    }

    try {
      db.prepare("DELETE FROM items WHERE id = ? AND account_id = ?").run(id, accountId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.post("/api/items/batch-delete", (req, res) => {
    const { ids, accountId } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !accountId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    try {
      const placeholders = ids.map(() => "?").join(",");
      const stmt = db.prepare(`DELETE FROM items WHERE id IN (${placeholders}) AND account_id = ?`);
      const result = stmt.run(...ids, accountId);
      console.log(`Batch delete: requested ${ids.length}, actually deleted ${result.changes}`);
      res.json({ success: true, deletedCount: result.changes });
    } catch (error) {
      console.error('Batch delete error:', error);
      res.status(500).json({ error: "Failed to batch delete items" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
