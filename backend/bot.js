require('dotenv').config();
const { createPublicClient, http, parseAbiItem, formatUnits } = require('viem');
const { sepolia } = require('viem/chains');
const nodemailer = require('nodemailer');

const CONTRACT_ADDRESS = "0xee4e4A59f8AC362351150365933Dc53A71388633"; 

const transporter = nodemailer.createTransport({
    service: 'qq',
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const client = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com') 
});

let lastBlockChecked = 0n;

async function main() {
    console.log("🤖 死了么DApp 邮件机器人启动...");
    try {
        lastBlockChecked = await client.getBlockNumber();
        console.log(`📡 当前区块高度: ${lastBlockChecked}，开始监控...`);
        setInterval(checkForEvents, 10000); // 建议改为10秒一次，避免请求过频被封IP
    } catch (e) {
        console.error("启动失败:", e.message);
    }
}

async function checkForEvents() {
    try {
        const currentBlock = await client.getBlockNumber();
        if (currentBlock <= lastBlockChecked) return;

        const fromBlock = lastBlockChecked + 1n;
        const toBlock = currentBlock;
        console.log(`🔍 检查区块范围: ${fromBlock} -> ${toBlock}`);

        // --- 1. 检查 WarningTriggered 事件 ---
        const warningLogs = await client.getLogs({
            address: CONTRACT_ADDRESS,
            event: parseAbiItem('event WarningTriggered(address indexed userAddress, string name, string email)'),
            fromBlock, toBlock
        });

        for (const log of warningLogs) {
            const { name, email } = log.args;
            await sendEmail(
                email, 
                `【紧急预警】，请确认安全`,
                `检测到您的好友 ${name} 已连续3天未签到。请立即尝试联系他/她以确认安全。`
            );
        }

        // --- 2. 检查 InheritanceDistributed 事件 ---
        const inheritanceLogs = await client.getLogs({
            address: CONTRACT_ADDRESS,
            event: parseAbiItem('event InheritanceDistributed( address indexed userAddress, string userName, string userEmail )'),
            fromBlock, toBlock
        });

        for (const log of inheritanceLogs) {
            const { userAddress, userName, userEmail } = log.args;
            const emailText = `尊敬的用户/家属：：\n\n` +
                `您好。\n\n` +
                `【资产信息】\n` +
                `由于系统监测到地址 ${userAddress} 的持有者 ${userName} 已超过 5天 未进行安全签到，根据其此前在以太坊智能合约中预设的指令，数字资产分配方案已于 ${new Date().toLocaleString()} 正式触发并执行。`        
             await sendEmail(
                userEmail, 
                `【重要】关于 ${userName} 数字资产分配方案执行完毕的通知`,
                emailText
            );
        }

        // --- 3. 检查 HeirNotification 事件 (最重要：发给受益人) ---
        const heirLogs = await client.getLogs({
            address: CONTRACT_ADDRESS,
            event: parseAbiItem('event HeirNotification(address indexed fromUser, string fromName, address indexed toHeir, string heirEmail, uint256 amount)'),
            fromBlock, toBlock
        });

        for (const log of heirLogs) {
            const { fromName, heirEmail, amount } = log.args;
            const readableAmount = formatUnits(amount, 6);
            
            const emailText = `尊敬的受益人：\n\n` +
                `这是一封重要的资产到账通知。您的好友/亲属 ${fromName} 此前在“死了么DApp”系统中将您设定为受益人。\n\n` +
                `【资产信息】\n` +
                `到账金额：${readableAmount} USDT\n` +
                `到账网络：Sepolia Testnet\n\n` +
                `这笔资产承载着 ${fromName} 对您的信任。请登录您的钱包查收。如有疑问请注意甄别诈骗。`;

            await sendEmail(
                heirEmail, 
                `【资产到账通知】您收到一笔来自 ${fromName} 的数字遗产`,
                emailText
            );
        }

        // 全部处理完后再更新区块高度
        lastBlockChecked = toBlock;

    } catch (error) {
        console.error("❌ 轮询异常:", error.message);
    }
}

async function sendEmail(to, subject, text) {
    if (!to || !to.includes('@')) {
        console.error(`🚫 无效的邮箱地址: ${to}`);
        return;
    }
    try {
        await transporter.sendMail({
            from: `"死了么DApp" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text
        });
        console.log(`✅ 邮件已发送至: ${to}`);
    } catch (error) {
        console.error(`❌ 邮件发送给 ${to} 失败:`, error.message);
    }
}

main();