# 🌱 AreYouDead - 链上生命信号守护协议

> **"当数字世界需要确认你依然鲜活，我们为你守护最后一道安全线"**

[Live Demo](https://are-you-dead.vercel.app/) | [Verified Contract](https://sepolia.etherscan.io/address/0xee4e4A59f8AC362351150365933Dc53A71388633)

---

## 📖 项目简介

AreYouDead 是一个部署在 **Sepolia 测试网** 上的全栈去中心化应用 (DApp)。它解决了独居人士或加密资产持有者对于“意外失联”的担忧。

与传统的 Web2 解决方案不同，本协议的核心逻辑运行在智能合约上，**不可篡改、去中心化执行**。配合链下 Node.js 服务，实现了从链上状态监测到 Web2 邮件通知的完整闭环。

---

## ⚡️ 核心功能

| 功能                        | 描述                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------- |
| ✅ **心跳检测 (Heartbeat)** | 用户需定期在 DApp 签到（Proof of Life）                                            |
| ✅ **预警阶段 (Warning)**   | 若超 **3 天** 未签到，系统自动触发链下邮件网关，向紧急联系人发送预警               |
| ✅ **执行阶段 (Execution)** | 若宽限期 **2 天** 过后仍未签到，合约将自动把锁定的 USDT 资产转账给预设的受益人地址 |
| ✅ **去中心化身份**         | 使用 MetaMask 钱包登录，数据存储在区块链上                                         |
| ✅ **多用户隔离**           | 支持任意用户注册，每个用户拥有独立的状态和配置                                     |
| ✅ **双重触发机制**         | 区分“预警”和“执行”两个时间阈值，防止误操作                                         |
| ✅ **Web2/Web3 互通**       | 链上事件（Event）驱动链下邮件通知（Email）                                         |
| ✅ **资产继承**             | 支持 USDT 资产的自动分配与转移                                                     |
| ✅ **可视化交互**           | 极简 UI 设计，实时反馈签到状态                                                     |

---

## 🛠️ 技术栈

### 前端 (Frontend)

- **Framework**: Next.js 14 (App Router)
- **Web3 Hooks**: Wagmi v2 + Viem
- **Wallet**: RainbowKit
- **UI Component**: Shadcn/ui + Tailwind CSS

### 智能合约 (Smart Contract)

- **Language**: Solidity 0.8.x
- **Network**: Sepolia Testnet
- **Tools**: Remix IDE (Development & Deployment)

### 后端守望者 (Backend Watcher)

- **Runtime**: Node.js
- **Logic**: Viem (轮询监听链上事件)
- **Notification**: Nodemailer (SMTP 邮件服务)

---

## 🚀 快速开始

### 1. 克隆项目

git clone https://github.com/chenkang991019/AreYouDead.git
cd AreYouDead

### 2. 前端启动 (Frontend)

npm install
npm run dev

# 访问 http://localhost:3000

### 3. 配置并启动后端机器人

cd backend
npm install

# 创建配置文件

echo "EMAIL_USER=your_email@qq.com" >> .env
echo "EMAIL_PASS=your_app_password" >> .env

# 启动服务

node bot.js

📂 目录结构
code
Text
AreYouDead/
├── app/ # Next.js 前端页面
│ ├── page.tsx # 主页逻辑
│ ├── constants.ts # 合约地址与 ABI 配置
│ └── ...
├── components/ # UI 组件 (Shadcn)
├── backend/ # Node.js 监听服务
│ ├── bot.js # 核心轮询逻辑
│ └── .env # 敏感配置 (Git Ignored)
├── public/ # 静态资源
└── README.md # 项目文档
⛓️ 合约信息 (Sepolia)
Contract Address: 0xee4e4A59f8AC362351150365933Dc53A71388633
Etherscan: View on Sepolia Etherscan
📸 项目演示

1. 正常状态 (已签到)
   ![App Screenshot](https://github.com/chenkang991019/AreYouDead/blob/main/public/homePage.png)
2. 预警触发 (邮件通知)
   ![App Screenshot](https://github.com/chenkang991019/AreYouDead/blob/main/public/warning.jpg)
3. 资产分配通知
   ![App Screenshot](https://github.com/chenkang991019/AreYouDead/blob/main/public/asset.jpg)
4. 资产分配
   ![App Screenshot](https://github.com/chenkang991019/AreYouDead/blob/main/public/allocate.jpg)

   ⚠️ 免责声明
   本项目仅供 Web3 学习与技术展示 使用。
   Author: Chen Kang
   License: MIT
