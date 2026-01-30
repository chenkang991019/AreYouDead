import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowRight, Ghost } from "lucide-react";

export const Disconnected = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-white p-10 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center">
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
        <div className="flex justify-center">
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="group w-full bg-[#00D68F] hover:bg-[#00B075] text-white h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-green-100"
              >
                连接钱包{" "}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      </div>
    </div>
  );
};
