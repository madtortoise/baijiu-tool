import { Handler } from "@netlify/functions";
import { getDatabase } from "../../lib/db";

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "PUT") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { accountId, adminPassword, subUserPassword } = JSON.parse(
      event.body || "{}"
    );

    if (!accountId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "缺少账户ID" }),
      };
    }

    if (adminPassword && adminPassword.length > 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "管理员密码不能超过10个字符" }),
      };
    }

    if (subUserPassword && subUserPassword.length > 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "子用户密码不能超过10个字符" }),
      };
    }

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
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "至少需要修改一个密码" }),
      };
    }

    values.push(accountId);
    const db = getDatabase();
    const query = `UPDATE accounts SET ${updates.join(", ")} WHERE id = ?`;
    db.prepare(query).run(...values);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Update password error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "更新密码失败，请重试" }),
    };
  }
};

export { handler };
