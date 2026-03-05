import Database from "better-sqlite3";
import path from "path";

// 使用 Netlify Functions 临时目录或项目根目录
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/items.db'  // Netlify Functions 临时目录
  : path.resolve(process.cwd(), 'items.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  db = new Database(dbPath);

  // 初始化表
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

  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
