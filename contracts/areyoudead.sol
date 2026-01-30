// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title AreYouDead (死了么)
 * @dev 这是一个数字遗产自动分发合约。
 * 流程：设置规则 -> 存入 USDT -> 定期签到。
 * 如果超过 5 天未签到，合约将自动按比例把 USDT 发送给受益人。
 */

// 引入 OpenZeppelin 安全库
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AreYouDead is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- 1. 数据结构 ---

    struct Heir {
        address account; // 受益人地址
        uint256 share; // 分配比例 (1-100)
        string email; // 受益人邮箱 (用于后端通知)
    }

    struct User {
        string name; // 用户姓名
        string email; // 用户主邮箱
        uint256 lastCheckIn; // 上次签到时间戳
        bool isWarningTriggered; // 是否已发出预警邮件
        bool exists; // 是否已注册
        uint256 usdtBalance; // 在本合约托管的 USDT 余额
        Heir[] heirs; // 受益人名单及方案
    }

    // --- 2. 存储变量 ---

    // 映射：钱包地址 => 用户详情
    mapping(address => User) public users;
    // 数组：存所有用户地址，方便后端遍历
    address[] public userAddresses;

    // Sepolia USDT 合约地址
    IERC20 public immutable usdtToken =
        IERC20(0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0);

    // --- 3. 时间配置 ---

    uint256 public constant WARNING_PERIOD = 3 days; // 30秒即触发报警（演示用，生产3天）
    uint256 public constant INHERITANCE_PERIOD = 5 days; // 60秒自动分配（测试） 5天未签到执行遗产分发

    // --- 4. 事件 (前端和后端监听的核心) ---

    event ProfileUpdated(
        address indexed userAddress,
        string name,
        string email
    );
    event CheckIn(address indexed userAddress, uint256 timestamp);
    event HeirsUpdated(address indexed userAddress, uint256 heirCount);
    event USDTDeposited(address indexed userAddress, uint256 amount);
    event USDTWithdrawn(address indexed userAddress, uint256 amount);

    // 触发邮件预警事件（后端监听到后给用户发邮件）
    event WarningTriggered(
        address indexed userAddress,
        string name,
        string email
    );

    // 受益人通知事件（后端监听到后给每个受益人发邮件）
    event HeirNotification(
        address indexed fromUser,
        string fromName,
        address indexed toHeir,
        string heirEmail,
        uint256 amount
    );

    // 遗产分配总完成事件
    event InheritanceDistributed(
        address indexed userAddress,
        string userName,
        string userEmail
    );

    // --- 5. 核心修改函数 ---

    // A. 注册或修改个人资料
    function setProfile(
        string calldata _name,
        string calldata _email
    ) external {
        User storage user = users[msg.sender];
        if (!user.exists) {
            user.exists = true;
            userAddresses.push(msg.sender);
        }
        user.name = _name;
        user.email = _email;
        user.lastCheckIn = block.timestamp; // 更新资料视为一次签到
        user.isWarningTriggered = false;

        emit ProfileUpdated(msg.sender, _name, _email);
    }

    // B. 用户手动签到 (证明自己还活着)
    function checkIn() external {
        User storage user = users[msg.sender];
        require(user.exists, "User not registered");

        user.lastCheckIn = block.timestamp;
        user.isWarningTriggered = false;

        emit CheckIn(msg.sender, block.timestamp);
    }

    // C. 设置受益人方案 (存储在链上)
    function setHeirs(
        address[] calldata _accounts,
        uint256[] calldata _shares,
        string[] calldata _emails
    ) external {
        require(users[msg.sender].exists, "User not registered");
        require(
            _accounts.length == _shares.length &&
                _accounts.length == _emails.length,
            "Arrays length mismatch"
        );

        User storage user = users[msg.sender];
        delete user.heirs; // 清空旧方案

        uint256 totalShare = 0;
        for (uint i = 0; i < _accounts.length; i++) {
            require(_accounts[i] != address(0), "Invalid heir address");
            user.heirs.push(
                Heir({
                    account: _accounts[i],
                    share: _shares[i],
                    email: _emails[i]
                })
            );
            totalShare += _shares[i];
        }
        require(totalShare == 100, "Total share must be 100%");
        emit HeirsUpdated(msg.sender, _accounts.length);
    }

    // D. 存入 USDT 资产 (需先在 USDT 合约执行 Approve)
    function depositUSDT(uint256 _amount) external nonReentrant {
        require(users[msg.sender].exists, "User not registered");
        require(_amount > 0, "Amount must > 0");

        // 将 USDT 从用户钱包拉取到本合约
        usdtToken.safeTransferFrom(msg.sender, address(this), _amount);

        users[msg.sender].usdtBalance += _amount;
        emit USDTDeposited(msg.sender, _amount);
    }

    // E. 取回资产 (用户反悔了或需要用钱时取出)
    function withdraw(uint256 _amount) external nonReentrant {
        User storage user = users[msg.sender];
        require(user.usdtBalance >= _amount, "Insufficient balance");

        user.usdtBalance -= _amount;
        usdtToken.safeTransfer(msg.sender, _amount);

        // 取钱动作也视为一次签到
        user.lastCheckIn = block.timestamp;
        user.isWarningTriggered = false;

        emit USDTWithdrawn(msg.sender, _amount);
        emit CheckIn(msg.sender, block.timestamp);
    }

    // --- 6. 自动化与清算逻辑 ---

    // 检查并触发资产分发 (可由后端自动任务触发，或由受益人手动触发)
    function checkStatus(address _target) external nonReentrant {
        User storage user = users[_target];
        require(user.exists, "User not found");

        uint256 timePassed = block.timestamp - user.lastCheckIn;

        // 阶段 1: 预警邮件触发
        if (timePassed > WARNING_PERIOD && !user.isWarningTriggered) {
            user.isWarningTriggered = true;
            emit WarningTriggered(_target, user.name, user.email);
        }

        // 阶段 2: 遗产分发触发
        else if (
            timePassed > INHERITANCE_PERIOD &&
            user.isWarningTriggered &&
            user.usdtBalance > 0
        ) {
            _distribute(_target);
        }
    }

    // 内部函数：执行真正的转账逻辑
    function _distribute(address _target) internal {
        User storage user = users[_target];
        uint256 totalToDistribute = user.usdtBalance;
        string memory senderName = user.name;

        // 提前存好数据，因为后面要清空 balance
        string memory userName = user.name;
        string memory userEmail = user.email;

        // 必须先清零，防止重入攻击
        user.usdtBalance = 0;

        for (uint i = 0; i < user.heirs.length; i++) {
            uint256 heirAmount = (totalToDistribute * user.heirs[i].share) /
                100;
            if (heirAmount > 0) {
                // 转账给受益人
                usdtToken.safeTransfer(user.heirs[i].account, heirAmount);

                // 发射事件，让后端给受益人发邮件
                emit HeirNotification(
                    _target,
                    senderName,
                    user.heirs[i].account,
                    user.heirs[i].email,
                    heirAmount
                );
            }
        }
        emit InheritanceDistributed(_target, userName, userEmail);
    }

    // --- 7. 只读辅助函数 ---

    // 批量检查所有用户 (后端 Cron Job 专用)
    function checkAllUsers() external {
        for (uint i = 0; i < userAddresses.length; i++) {
            address addr = userAddresses[i];
            if (users[addr].exists) {
                uint256 timePassed = block.timestamp - users[addr].lastCheckIn;

                // 自动预警
                if (
                    timePassed > WARNING_PERIOD &&
                    !users[addr].isWarningTriggered
                ) {
                    users[addr].isWarningTriggered = true;
                    emit WarningTriggered(
                        addr,
                        users[addr].name,
                        users[addr].email
                    );
                }

                // 自动分发 (由于循环中转账非常耗 Gas，实际批量操作时需谨慎)
                else if (
                    timePassed > INHERITANCE_PERIOD &&
                    users[addr].isWarningTriggered &&
                    users[addr].usdtBalance > 0
                ) {
                    _distribute(addr);
                }
            }
        }
    }

    function getAllUsers() external view returns (address[] memory) {
        return userAddresses;
    }

    function getHeirs(address _user) external view returns (Heir[] memory) {
        return users[_user].heirs;
    }

    function getUserUSDTBalance(address _user) external view returns (uint256) {
        return users[_user].usdtBalance;
    }
}
