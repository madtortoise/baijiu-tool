import { Handler } from "@netlify/functions";
import { getDatabase } from "../../lib/db";

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { industryName, adminPassword, subUserPassword } = JSON.parse(
      event.body || "{}"
    );

    if (!industryName || !adminPassword || !subUserPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "缺少必要字段" }),
      };
    }

    if (adminPassword.length > 10 || subUserPassword.length > 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "密码不能超过10个字符" }),
      };
    }

    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO accounts (industry_name, admin_password, sub_user_password)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(industryName, adminPassword, subUserPassword);

    return {
      statusCode: 200,
      body: JSON.stringify({
        accountId: result.lastInsertRowid,
        industryName,
      }),
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "注册失败，请重试" }),
    };
  }
};

export { handler };
