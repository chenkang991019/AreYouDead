"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  getDefaultWallets,
  getDefaultConfig,
  lightTheme, // 建议加上主题配置
} from "@rainbow-me/rainbowkit";
import { sepolia, mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import "@rainbow-me/rainbowkit/styles.css";

// 1. 确保这一行拿到值，哪怕是测试用的
const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID || "1234567890abcdef1234567890abcdef";

const { wallets } = getDefaultWallets();

// 2. 将 config 设为常量
const config = getDefaultConfig({
  appName: "Are You Dead",
  projectId: projectId,
  chains: [sepolia, mainnet],
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
  },
});

// 3. 确保 QueryClient 在函数外
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  // 4. 解决 Hydration 问题的额外保险
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact" // 建议用 compact，和你 UI 风格更搭
          theme={lightTheme({
            accentColor: "#00D68F", // 使用你的主题绿
            borderRadius: "large",
          })}
        >
          {mounted && children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
