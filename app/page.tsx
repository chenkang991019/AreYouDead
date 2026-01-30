"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { sepolia } from "viem/chains"; // 引入 sepolia 配置
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./constants";
import {
  Ghost,
  Pencil,
  CheckCircle2,
  Coffee,
  X,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Info,
} from "lucide-react"; // 引入新图标
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { InheritanceSettings } from "@/components/InheritanceSettings";

export default function Home() {
  const { address, isConnected, status } = useAccount();

  // 本地表单状态
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ✨ 新增状态：今天是否已签到
  const [isCheckedInToday, setIsCheckedInToday] = useState(false);

  // --- 读取合约数据 ---
  const {
    data: userData,
    refetch: refetchUserData,
    isLoading: isLoadingUserData,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "users",
    args: address ? [address] : undefined,
  });

  const savedName = userData ? userData[0] : "";
  const savedEmail = userData ? userData[1] : "";
  const lastCheckIn = userData ? userData[2] : BigInt(0);
  const userExists = userData ? userData[4] : false;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected) {
      setName("");
      setEmail("");
    }
  }, [address]);

  // --- 核心逻辑：判断日期 & 同步数据 ---
  // --- 核心逻辑：实时判断是否已签到 ---
  useEffect(() => {
    if (userExists && lastCheckIn) {
      setName(String(savedName));
      setEmail(String(savedEmail));
      // 定义一个检查函数
      const checkStatus = () => {
        // --- 调试模式 (按秒算) ---
        const now = Math.floor(Date.now() / 1000);
        const diff = now - Number(lastCheckIn);

        // 如果距离上次签到超过 30 秒，就变成 false (按钮变亮)
        // 如果在 30 秒内，就是 true (显示已签到)
        setIsCheckedInToday(diff < 30);

        // --- 上线模式 (按天算) - 上线时把上面几行注释掉，用下面这个 ---
        /*
        const lastDate = new Date(Number(lastCheckIn) * 1000);
        const today = new Date();
        const isSameDay = 
          lastDate.getFullYear() === today.getFullYear() &&
          lastDate.getMonth() === today.getMonth() &&
          lastDate.getDate() === today.getDate();
        setIsCheckedInToday(isSameDay);
        */
      };

      // 1. 马上执行一次
      checkStatus();

      // 2. 开启定时器，每 1 秒检查一次
      const interval = setInterval(checkStatus, 1000);

      // 3. 页面关闭时清理定时器 (防止内存泄漏)
      return () => clearInterval(interval);
    }
  }, [userExists, lastCheckIn, userExists]); // 依赖项：当链上数据变了，也会重新启动定时器

  // --- 写入合约 ---
  const {
    writeContract,
    isPending,
    data: hash,
    error,
    isError,
  } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // --- 签到合约 ---
  const {
    writeContract: checkIn,
    data: checkInHash,
    isPending: checkInPending,
    error: checkInError,
  } = useWriteContract();

  // --- 签到合约 --- 等待交易确认
  const { isSuccess: checkInSuccess, isLoading: checkInLoading } =
    useWaitForTransactionReceipt({
      hash: checkInHash,
    });
  useEffect(() => {
    if (checkInError) {
      // 处理错误逻辑
      console.log("错误详情:", error);
      if (checkInError.message.includes("User rejected")) {
        toast.error("用户已取消");
      } else if (checkInError.message.includes("insufficient funds")) {
        toast.error("钱包余额不足");
      } else {
        toast.error("发生错误，请稍后再试");
      }
    }
  }, [checkInError]);

  useEffect(() => {
    refetchUserData(); // 刷新用户数据
  }, [checkInSuccess, refetchUserData]);

  const handleCheckIn = () => {
    checkIn({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "checkIn",
    });
  };

  const handleSaveProfile = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "setProfile",
      args: [name, email],
    });
    setIsEditing(false);
  };

  const handleTriggerCheck = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "checkStatus",
      args: [address],
    });
  };
  if (!mounted) return null;
  //  如果正在“连接中”或“重连中”，显示 Loading，而不是登录页
  if (status === "connecting" || status === "reconnecting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA]">
        <div className="relative mb-6">
          <Ghost className="w-16 h-16 text-green-500 animate-bounce" />
          <Loader2 className="w-20 h-20 text-green-200 animate-spin absolute -top-2 -left-2" />
        </div>
        <p className="text-slate-400 font-medium">正在唤醒信号...</p>
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-white p-10 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center">
          {/* 图标装饰 */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-green-100 rounded-3xl rotate-6 animate-pulse" />
            <div className="absolute inset-0 bg-green-500 rounded-3xl -rotate-3 flex items-center justify-center shadow-lg shadow-green-200">
              <Ghost className="text-white w-12 h-12" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">
            身份验证
          </h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            请先连接您的加密钱包，
            <br />
            以管理您的数字遗产和安全签到。
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-left p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <ShieldCheck className="text-green-500 shrink-0" size={20} />
              <span className="text-xs text-slate-500 font-medium">
                您的私钥和资产始终安全存储在您的钱包中。
              </span>
            </div>
          </div>

          {/* 这里放置真正的连接按钮 */}
          <div className="flex justify-center">
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={openConnectModal}
                  className="group w-full bg-[#00D68F] hover:bg-[#00B075] text-white h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-green-100"
                >
                  连接钱包
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </ConnectButton.Custom>
          </div>

          <p className="mt-6 text-[10px] text-slate-300 uppercase font-bold tracking-[0.2em]">
            Secure On-Chain Protocol
          </p>
        </div>
      </div>
    );
  }
  if (isLoadingUserData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA]">
        <div className="relative mb-6">
          <Ghost className="w-16 h-16 text-green-500 animate-bounce" />
          <Loader2 className="w-20 h-20 text-green-200 animate-spin absolute -top-2 -left-2" />
        </div>
        <p className="text-slate-400 font-medium animate-pulse">
          正在检测生命信号...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center relative font-sans text-slate-600">
      <div className="absolute top-4 right-4 z-10 scale-75">
        <ConnectButton />
      </div>

      <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center space-y-12 p-6">
        {/* 1. 个人信息区域 */}
        {!isConnected && (
          <div className="w-full space-y-6 text-center z-10">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 space-y-3 animate-in fade-in zoom-in-95">
              <h3 className="text-sm font-bold text-slate-700 mb-4">
                请先连接钱包
              </h3>
            </div>
          </div>
        )}
        {isConnected && (
          <div className="w-full space-y-6 text-center z-10">
            {!userExists || isEditing ? (
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex justify-end cursor-pointer">
                  <X size={16} onClick={() => setIsEditing(false)} />
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-4">
                  {userExists ? "修改信息" : "新人注册"}
                </h3>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="你的名字"
                  className="text-center bg-slate-50"
                />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="紧急联系人邮箱"
                  className="text-center bg-slate-50"
                />
                <Button
                  onClick={handleSaveProfile}
                  className="w-full bg-[#00D68F] hover:bg-[#00B075] text-white"
                >
                  {isPending ? "保存中..." : "保存上链"}
                </Button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className="cursor-pointer group"
              >
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-slate-800">
                  {String(savedName)}
                  <Pencil
                    size={16}
                    className="text-slate-300 group-hover:text-[#00D68F]"
                  />
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  {String(savedEmail)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. 签到按钮 (逻辑变化区) */}
        {userExists && (
          <div className="relative group">
            {/* 这里的逻辑：如果今天签过了，显示绿色静止圆圈；没签过，显示动画渐变圆圈 */}
            {isCheckedInToday ? (
              // ✅ 状态：已签到
              <div className="w-64 h-64 rounded-full bg-emerald-50 border-4 border-emerald-100 flex flex-col items-center justify-center text-emerald-600 shadow-inner cursor-default transition-all duration-500">
                <CheckCircle2
                  size={64}
                  strokeWidth={1.5}
                  className="mb-4 animate-in zoom-in spin-in-180 duration-700"
                />
                <span className="text-2xl font-bold">今日已签</span>
                <span className="text-xs mt-2 opacity-70">明天见 👋</span>
              </div>
            ) : (
              // ⏳ 状态：未签到
              <button
                onClick={handleCheckIn}
                disabled={checkInPending || !isConnected}
                className="relative w-64 h-64 rounded-full bg-gradient-to-b from-[#00E599] to-[#00C885] shadow-[0_20px_50px_-12px_rgba(0,214,143,0.5)] flex flex-col items-center justify-center text-white active:scale-95 border-4 border-[#E0FBF2] hover:-translate-y-1 transition-all duration-300"
              >
                {/* 装饰光晕 */}
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-full transition-opacity"></div>

                {checkInPending || checkInLoading ? (
                  <div className="animate-spin text-4xl">⏳</div>
                ) : (
                  <>
                    <Ghost
                      size={64}
                      strokeWidth={1.5}
                      className="mb-4 drop-shadow-md"
                    />
                    <span className="text-2xl font-bold tracking-wide shadow-black drop-shadow-sm">
                      今日签到
                    </span>
                  </>
                )}
              </button>
            )}

            {/* 测试按钮 */}
            {!isCheckedInToday && (
              <div className="absolute -bottom-12 w-full text-center">
                <button
                  onClick={handleTriggerCheck}
                  className="text-[10px] text-slate-300 hover:text-red-400 transition-colors"
                >
                  模拟超时检查 (测试用)
                </button>
              </div>
            )}
          </div>
        )}
        {/* --- 规则提示区域 --- */}
        {userExists && (
          <div className="w-full max-w-[340px] px-4 mt-2 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="bg-slate-100/50 rounded-[24px] p-5 flex gap-4 items-start border border-slate-200/50 shadow-sm">
              <div className="bg-blue-50 p-2 rounded-xl shrink-0">
                <Info size={16} className="text-blue-400" />
              </div>
              <div className="space-y-1">
                <p className="text-[12px] leading-relaxed text-slate-600">
                  <span className="font-bold text-orange-500">3 日</span>{" "}
                  未签到，系统将通过{" "}
                  <span className="font-semibold text-slate-700">邮件</span>{" "}
                  提醒您的紧急联系人。
                </p>
                <p className="text-[12px] leading-relaxed text-slate-600">
                  <span className="font-bold text-red-500">5 日</span>{" "}
                  未签到，系统将判定为生命信号消失，自动执行{" "}
                  <span className="font-semibold text-[#00D68F]">
                    资产分发方案
                  </span>
                  。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. 底部状态栏 */}
        {userExists && (
          <div className="w-full bg-white rounded-2xl p-5 shadow-sm mb-6 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${isCheckedInToday ? "bg-emerald-100 text-emerald-500" : "bg-orange-100 text-orange-500"}`}
              >
                {isCheckedInToday ? <Coffee size={20} /> : <Ghost size={20} />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700">
                  {isCheckedInToday ? "安全状态" : "等待签到"}
                </span>
                <span className="text-xs text-slate-400">
                  {isCheckedInToday ? "您的合约现在很安全" : "请记得点击大按钮"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                Last Seen
              </p>
              <p className="text-xs font-mono text-slate-600 font-medium">
                {new Date(Number(lastCheckIn) * 1000).toLocaleDateString()}
              </p>
              <p className="text-[10px] text-slate-400">
                {new Date(Number(lastCheckIn) * 1000).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        )}
        {isConnected && userExists && <InheritanceSettings />}
      </div>
    </div>
  );
}
