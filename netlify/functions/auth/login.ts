import { Handler } from "@netlify/functions";
import {
  findAccountByAdminPassword,
  findAccountBySubUserPassword,
} from "../../lib/memory-db";

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { password } = JSON.parse(event.body || "{}");

    if (!password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "缺少密码" }),
      };
    }

    // 查找匹配管理员密码的账户
    let account = findAccountByAdminPassword(password);
    if (account) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          accountId: account.id,
          industryName: account.industry_name,
          userType: "admin",
        }),
      };
    }

    // 查找匹配子用户密码的账户
    account = findAccountBySubUserPassword(password);
    if (account) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          accountId: account.id,
          industryName: account.industry_name,
          userType: "sub_user",
        }),
      };
    }

    return {
      statusCode: 401,
      body: JSON.stringify({ error: "密码错误，请重试" }),
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "登录失败，请重试" }),
    };
  }
};

export { handler };
