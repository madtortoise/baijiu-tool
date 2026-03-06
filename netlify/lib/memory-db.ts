// 简单的内存数据库实现，用于 Netlify Functions
// 在生产环境中，应该使用 Supabase 或其他数据库服务

interface Account {
  id: number;
  industry_name: string;
  admin_password: string;
  sub_user_password: string;
  created_at: string;
}

// 使用全局变量存储账户（注意：Netlify Functions 无法保证数据持久化）
// 生产环境需要使用外部数据库
let accounts: Account[] = [];
let nextId = 1;

// 从环境变量初始化演示账户（可选）
function initializeAccounts() {
  if (accounts.length === 0) {
    // 可以从环境变量初始化测试账户
    const testAccount = process.env.TEST_ACCOUNT;
    if (testAccount) {
      try {
        const parsed = JSON.parse(testAccount);
        accounts.push({
          id: nextId++,
          ...parsed,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        // 如果无法解析，忽略
      }
    }
  }
}

export function getAccounts(): Account[] {
  initializeAccounts();
  return accounts;
}

export function findAccountByAdminPassword(password: string): Account | undefined {
  initializeAccounts();
  return accounts.find(
    (acc) => acc.admin_password === password
  );
}

export function findAccountBySubUserPassword(
  password: string
): Account | undefined {
  initializeAccounts();
  return accounts.find(
    (acc) => acc.sub_user_password === password
  );
}

export function createAccount(
  industryName: string,
  adminPassword: string,
  subUserPassword: string
): Account {
  initializeAccounts();
  const account: Account = {
    id: nextId++,
    industry_name: industryName,
    admin_password: adminPassword,
    sub_user_password: subUserPassword,
    created_at: new Date().toISOString(),
  };
  accounts.push(account);
  return account;
}

export function updateAccountPasswords(
  accountId: number,
  adminPassword?: string,
  subUserPassword?: string
): boolean {
  initializeAccounts();
  const account = accounts.find((acc) => acc.id === accountId);
  if (!account) return false;

  if (adminPassword) {
    account.admin_password = adminPassword;
  }
  if (subUserPassword) {
    account.sub_user_password = subUserPassword;
  }
  return true;
}
