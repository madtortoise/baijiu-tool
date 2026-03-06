import { Handler } from "@netlify/functions";
import { updateAccountPasswords } from "../../lib/memory-db";

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

    if (!adminPassword && !subUserPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "至少需要修改一个密码" }),
      };
    }

    const success = updateAccountPasswords(
      accountId,
      adminPassword,
      subUserPassword
    );

    if (!success) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "账户不存在" }),
      };
    }

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
