"use client";

import { useSwitchChain } from "wagmi";
import { sepolia } from "viem/chains"; // 引入 sepolia 配置
import { ShieldAlert, RefreshCw, Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NetworkGuard = () => {
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-orange-100 p-10 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center">
        {/* 警告图标 */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 bg-orange-100 rounded-3xl rotate-6 animate-pulse" />
          <div className="absolute inset-0 bg-orange-500 rounded-3xl -rotate-3 flex items-center justify-center shadow-lg shadow-orange-200">
            <ShieldAlert className="text-white w-10 h-10" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
          网络不匹配
        </h2>
        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
          检测到您的钱包连接到了错误的网络。
          <br />
          本协议仅在{" "}
          <span className="font-bold text-slate-600">Sepolia Testnet</span>{" "}
          上运行。
        </p>

        <Button
          onClick={() => switchChain({ chainId: sepolia.id })}
          disabled={isSwitching}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white h-14 rounded-2xl font-bold shadow-xl shadow-orange-100 transition-all active:scale-95"
        >
          {isSwitching ? (
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-5 h-5 mr-2" />
          )}
          切换至 Sepolia 网络
        </Button>

        <p className="mt-6 text-[10px] text-slate-300 uppercase font-bold tracking-[0.2em]">
          Safety First Protocol
        </p>
      </div>
    </div>
  );
};
