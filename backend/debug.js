// debug.js
require('dotenv').config();
const { createPublicClient, http, parseAbiItem } = require('viem');
const { sepolia } = require('viem/chains');

// ⚠️ 确保这里是你 Etherscan 截图里那个有 Log 的地址
const CONTRACT_ADDRESS = "0xee4e4A59f8AC362351150365933Dc53A71388633"; 

const client = createPublicClient({
    chain: sepolia,
    // 换个稳点的节点
    transport: http('https://ethereum-sepolia-rpc.publicnode.com') 
});

async function main() {
    try {
        console.log("1. 正在尝试连接 Sepolia 网络...");
        const blockNumber = await client.getBlockNumber();
        console.log(`✅ 连接成功！当前区块高度: ${blockNumber}`);

        console.log("2. 正在搜索过去 2000 个区块的日志...");
        
        // 主动去拉取历史日志
        const logs = await client.getLogs({
            address: CONTRACT_ADDRESS,
            event: parseAbiItem('event WarningTriggered(address indexed userAddress, string name, string email)'),
            fromBlock: blockNumber - 2000n, // 往前查 2000 个块
            toBlock: 'latest'
        });

        if (logs.length > 0) {
            console.log(`🎉 成功找到 ${logs.length} 条历史日志！配置完全正确！`);
            logs.forEach(log => {
                console.log("--------------------------------");
                console.log("用户:", log.args.name);
                console.log("邮箱:", log.args.email);
            });
        } else {
            console.log("❌ 连接成功，但没找到日志。可能是合约地址错，或者事件签名 ABI 不匹配。");
        }

    } catch (error) {
        console.error("❌ 网络连接失败 (RPC 挂了):", error);
    }
}

main();