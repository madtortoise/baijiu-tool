import { Handler } from "@netlify/functions";
import { createAccount } from "../../lib/memory-db";

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

    const account = createAccount(industryName, adminPassword, subUserPassword);

    return {
      statusCode: 200,
      body: JSON.stringify({
        accountId: account.id,
        industryName: account.industry_name,
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
