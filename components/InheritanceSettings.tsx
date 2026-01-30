"use client";

import { useEffect, useState } from "react";
import {
  useWriteContract,
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, isAddress } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Settings,
  Plus,
  Trash2,
  Save,
  Wallet,
  Activity,
  Info,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  Lock,
  Mail,
  Loader2,
} from "lucide-react";
import { CONTRACT_ADDRESS, CONTRACT_ABI, ERC20_ABI } from "../app/constants";
import { toast } from "sonner";

export const InheritanceSettings = () => {
  // 1. 基础状态
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [list, setList] = useState([
    { address: "", share: "", email: "", isInvalid: false },
  ]); // 增加了 email
  const { address } = useAccount();

  //失焦判断地址合法性
  const handleAddressBlur = (index: number) => {
    const newList = [...list];
    const addr = newList[index].address;

    // 如果是空的，不显示错误；如果不为空且地址非法，标记为 invalid
    newList[index].isInvalid = addr !== "" && !isAddress(addr);
    setList(newList);
  };

  // --- 2. 声明多个写入 Hook (解决 Loading 冲突) ---

  // A. 保存规则
  const {
    writeContract: writeSave,
    data: saveHash,
    isPending: isSavePending,
  } = useWriteContract();
  const { isLoading: isSaveLoading, isSuccess: isSaveSuccess } =
    useWaitForTransactionReceipt({ hash: saveHash });

  // B. 授权/存入 (资产操作)
  const {
    writeContract: writeAsset,
    data: assetHash,
    isPending: isAssetPending,
  } = useWriteContract();
  const { isLoading: isAssetLoading, isSuccess: isAssetSuccess } =
    useWaitForTransactionReceipt({ hash: assetHash });

  // C. 取出资产
  const {
    writeContract: writeWithdraw,
    data: withdrawHash,
    isPending: isWithdrawPending,
  } = useWriteContract();
  const { isLoading: isWithdrawLoading, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  // --- 3. 读取合约数据 ---
  const USDT_ADDRESS = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";

  // 钱包余额
  const { data: walletBalance, refetch: refetchWallet } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  // 合约已存金额
  const { data: contractBalance, refetch: refetchContract } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getUserUSDTBalance", // 对应合约新函数
    args: [address!],
    query: { enabled: !!address },
  });

  // 授权额度
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, CONTRACT_ADDRESS],
    query: { enabled: !!address },
  });

  // --- 4. 监听成功与刷新 ---
  // 1. 专门管保存成功
  useEffect(() => {
    if (isSaveSuccess) {
      toast.success("分配规则保存成功！");
      refetchAll(); // 刷新所有数据
    }
  }, [isSaveSuccess]);

  // 2. 专门管资产操作成功
  useEffect(() => {
    if (isAssetSuccess) {
      toast.success("资产操作已确认");
      setAmount(""); // 只有资产操作需要清空输入框
      refetchAll();
    }
  }, [isAssetSuccess]);

  // 3. 专门管取出成功
  useEffect(() => {
    if (isWithdrawSuccess) {
      toast.success("资产已取出到钱包");
      setAmount("");
      refetchAll();
    }
  }, [isWithdrawSuccess]);

  // 提取一个公用的刷新函数
  const refetchAll = () => {
    refetchWallet?.();
    refetchContract?.();
    refetchAllowance?.();
  };

  // 切换账号关闭
  useEffect(() => {
    setOpen(false);
    setList([{ address: "", share: "", email: "", isInvalid: false }]);
    refetchAll(); // 刷新所有数据
  }, [address]);

  //  从链上读取该地址保存的受益人方案
  const {
    data: contractHeirs,
    isSuccess: isReadSuccess,
    refetch: refetchHeirs,
    isLoading: isFetchingHeirs,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getHeirs",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address, // 只有有地址时才读取
    },
  });

  // 同步链上数据到本地 list 状态
  useEffect(() => {
    if (address) {
      // 当切换地址或读取成功时
      if (contractHeirs && contractHeirs.length > 0) {
        // 将链上返回的数组对象转换为前端 input 需要的字符串格式
        const formattedList = contractHeirs.map((heir: any) => ({
          address: heir.account,
          email: heir.email,
          share: heir.share.toString(), // BigInt 转成字符串
          isInvalid: false, // 新增：初始化时标记为合法
        }));
        setList(formattedList);
      } else {
        // 如果链上没数据，显示一个空的输入框
        setList([{ address: "", share: "", email: "", isInvalid: false }]);
      }
    }
  }, [contractHeirs, address, isReadSuccess]);

  // --- 5. 交互逻辑 ---
  const totalShare = list.reduce(
    (acc, curr) => acc + Number(curr.share || 0),
    0,
  );
  const isReady = totalShare === 100;
  const parsedAmount = parseUnits(amount || "0", 6);
  const needsApprove =
    allowance !== undefined ? allowance < parsedAmount : true;

  // 存入/授权动作
  const handleAssetAction = () => {
    if (needsApprove) {
      writeAsset({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, parsedAmount],
      });
    } else {
      writeAsset({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "depositUSDT",
        args: [parsedAmount],
      });
    }
  };

  // 取出动作
  const handleWithdraw = () => {
    writeWithdraw({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "withdraw",
      args: [parsedAmount],
    });
  };

  // 保存规则
  const handleSave = () => {
    if (!isReady) return toast.error("比例总和必须为 100%");
    writeSave({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "setHeirs",
      args: [
        list.map((i) => i.address as `0x${string}`),
        list.map((i) => BigInt(i.share)),
        list.map((i) => i.email), // 对应合约新参数
      ],
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full border-slate-200 text-slate-500 hover:text-green-600 transition-all"
        >
          <Settings className="mr-2 h-4 w-4" /> 资产分配设置
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[28px]">
        {/* Header */}
        <div className="bg-[#fcfcfc] px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-xl">
            <Activity className="text-green-600 w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-slate-800">
            分配方案与金库
          </DialogTitle>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-white border-b border-slate-50">
          <div className="flex justify-between items-center mb-2 text-[11px] font-bold text-slate-400 uppercase">
            <span>分配进度</span>
            <span
              className={
                totalShare === 100 ? "text-green-500" : "text-blue-500"
              }
            >
              {totalShare}% / 100%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${totalShare === 100 ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(totalShare, 100)}%` }}
            />
          </div>
        </div>

        {/* List: 调整为包含邮箱的紧凑布局 */}
        <div className="px-6 py-4 max-h-[300px] overflow-y-auto space-y-3 bg-white scrollbar-hide">
          {list.map((item, index) => (
            <div
              key={index}
              className={`group relative p-4 rounded-[24px] border transition-all duration-300 ${
                item.isInvalid
                  ? "bg-red-50 border-red-200 shadow-sm" // 错误状态颜色
                  : "bg-slate-50 border-slate-100 hover:bg-white hover:border-green-100 hover:shadow-md"
              }`}
            >
              <div className="space-y-3">
                {/* 第一行：地址栏 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 ">
                    <Wallet
                      className={`w-3.5 h-3.5 ${item.isInvalid ? "text-red-400" : "text-slate-400"}`}
                    />
                    <Input
                      placeholder="受益人钱包地址 (0x...)"
                      value={item.address}
                      onBlur={() => handleAddressBlur(index)} // 失去焦点时校验
                      onChange={(e) => {
                        const newList = [...list];
                        newList[index].address = e.target.value;
                        // 输入时如果重新变合法了，取消红框
                        if (isAddress(e.target.value))
                          newList[index].isInvalid = false;
                        setList(newList);
                      }}
                      className="h-7 border-none bg-transparent p-0 text-xs font-mono focus-visible:ring-0 placeholder:text-slate-300"
                    />
                  </div>
                  {item.isInvalid && (
                    <p className="text-[10px] text-red-500 font-bold ml-6 animate-pulse">
                      无效的以太坊地址
                    </p>
                  )}
                </div>

                {/* 第二行：邮箱与比例 */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100/50">
                  <div className="flex-1 flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    <Input
                      placeholder="通知邮箱"
                      value={item.email}
                      onChange={(e) => {
                        const n = [...list];
                        n[index].email = e.target.value;
                        setList(n);
                      }}
                      className="h-6 border-none bg-transparent p-0 text-xs focus-visible:ring-0"
                    />
                  </div>

                  {/* --- 美化后的比例控件 --- */}
                  <div className="flex items-center gap-0 bg-white rounded-xl border border-slate-200 overflow-hidden focus-within:border-green-400 transition-colors shadow-sm">
                    <div className="bg-slate-50 px-2 py-1 border-r border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                      Share
                    </div>
                    <input
                      type="number"
                      value={item.share}
                      className="w-10 bg-transparent text-center text-xs font-black text-[#00D68F] outline-none"
                      onChange={(e) => {
                        const n = [...list];
                        n[index].share = e.target.value;
                        setList(n);
                      }}
                    />
                    <span className="pr-2 text-[11px] font-bold text-slate-300">
                      %
                    </span>
                  </div>

                  {list.length > 1 && (
                    <button
                      onClick={() =>
                        setList(list.filter((_, i) => i !== index))
                      }
                      className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="ghost"
            onClick={() =>
              setList([
                ...list,
                { address: "", share: "", email: "", isInvalid: false },
              ])
            }
            className="w-full h-10 border-dashed border-slate-200 text-slate-400 text-xs"
          >
            <Plus size={14} className="mr-2" /> 添加受益人
          </Button>
        </div>

        {/* Vault Section */}
        <div className="bg-slate-50 border-t border-slate-100 p-6 space-y-4">
          <div className="flex justify-between">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <Lock size={12} /> 金库余额:{" "}
              {contractBalance
                ? Number(formatUnits(contractBalance as bigint, 6)).toFixed(2)
                : "0.00"}{" "}
              USDT
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <Wallet size={12} /> 钱包:{" "}
              {walletBalance
                ? Number(formatUnits(walletBalance, 6)).toFixed(2)
                : "0.00"}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder="金额"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 rounded-xl bg-white font-bold"
              />
              <button
                onClick={() => setAmount(formatUnits(walletBalance || 0n, 6))}
                className="absolute right-7 top-3.5 text-[10px] font-bold text-blue-500"
              >
                MAX
              </button>
            </div>
            <Button
              onClick={handleAssetAction}
              disabled={!amount || isAssetPending || isAssetLoading}
              className={`h-11 px-4 rounded-xl font-bold ${needsApprove ? "bg-blue-500" : "bg-green-500"}`}
            >
              {isAssetPending || isAssetLoading ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : needsApprove ? (
                "授权"
              ) : (
                "存入"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleWithdraw}
              disabled={!amount || isWithdrawPending || isWithdrawLoading}
              className="h-11 px-4 rounded-xl font-bold border-slate-200"
            >
              {isWithdrawPending || isWithdrawLoading ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                "取出"
              )}
            </Button>
          </div>
        </div>

        {/* Final Save */}
        <div className="p-6 pt-0 bg-slate-50">
          <Button
            className={`w-full h-12 rounded-xl font-bold transition-all shadow-md ${isReady ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-400"}`}
            disabled={isSavePending || isSaveLoading || !isReady}
            onClick={handleSave}
          >
            {isSavePending || isSaveLoading ? (
              <Loader2 className="animate-spin w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存规则到区块链
          </Button>
          <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed">
            * 资产将在 5 天未签到后按上述方案分发
          </p>
        </div>
        <DialogDescription className="sr-only"></DialogDescription>
      </DialogContent>
    </Dialog>
  );
};
