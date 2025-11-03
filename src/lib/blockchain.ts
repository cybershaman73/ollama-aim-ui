import hypercycle from "hypercyclejs";

const sepoliaBaseRPC = import.meta.env.VITE_RPC_BASE_SEPOLIA;
const baseRPC = import.meta.env.VITE_RPC_BASE;
const mainnetRPC = import.meta.env.VITE_RPC_MAINNET;
const sepoliaRPC = import.meta.env.VITE_RPC_SEPOLIA;

export const wagmiConfig = hypercycle.wagmiConfig();

export const startConfig = () =>
  hypercycle.setAvailableRPCs({
    sepolia: sepoliaRPC,
    mainnet: mainnetRPC,
    base: baseRPC,
    baseSepolia: sepoliaBaseRPC,
  });

export const getLastSelectedChain = () => {
  try {
    const stored: string | null = localStorage.getItem("lastSelectedChain");
    if (stored == "null") return null;
    return stored;
  } catch (error) {
    console.error("Error parsing stored chain:", error);
    return null;
  }
};
