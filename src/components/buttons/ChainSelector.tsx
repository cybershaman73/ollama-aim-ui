import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@radix-ui/react-select";
import { useEffect } from "react";

import { useAccount, useSwitchChain } from "wagmi";
import hypercyclejs from "hypercyclejs";
// Define supported chain IDs
type SupportedChainId = 1 | 8453 | 84532 | 11155111; // Mainnet, Base, Base Sepolia, Sepolia

export default function ChainSelector() {
  const { chain } = useAccount();
  const { chains, switchChain } = useSwitchChain();
  const idToIcon: Record<string, string> = {
    "1": "https://assets.coingecko.com/coins/images/279/standard/ethereum.png?1696501628",
    "8453":
      "https://raw.githubusercontent.com/base-org/brand-kit/refs/heads/main/logo/in-product/Base_Network_Logo.svg",
  };
  const handleChain = async (value: string) => {
    try {
      const selectedChain = chains?.find((c) => c.id.toString() === value);
      console.log(selectedChain, "chain selector");
      if (selectedChain) {
        localStorage.setItem(
          "lastSelectedChain",
          JSON.stringify(selectedChain.name)
        );
        switchChain({ chainId: selectedChain.id });
        // await hypercyclejs.chainSwitcher(selectedChain.id as SupportedChainId);
      }
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    if (chain) hypercyclejs.chainSwitcher(chain.id as SupportedChainId);
  }, [chain]);
  return (
    <div className="relative -top-0.5right-5 text-right">
      <Select
        onValueChange={(value: string) => handleChain(value)}
        value={chain?.id.toString()}
      >
        <SelectTrigger
          asChild
          className="transition-all duration-200 w-[135px] focus:bg-sky-500 focus:text-white hover:bg-slate-800 
            cursor-pointer inline-flex items-center justify-center rounded-xl border
             px-1 py-2 font-bold text-slate-950"
        >
          <div className="w-[135px] justify-between border-slate-800  text-white">
            {chain ? (
              <div className="flex items-center">
                {chain.name}
                {chain && idToIcon[chain.id] && (
                  <img
                    src={idToIcon[chain.id]}
                    className="ml-2 w-5"
                    alt={chain.name}
                  />
                )}
              </div>
            ) : (
              "Select Chain"
            )}
          </div>
        </SelectTrigger>

        <SelectContent className="w-48 rounded-xl  border text-white bg-slate-800 border-slate-800  z-50">
          <div className="py-1 px-2 font-semibold  text-left mt-2">
            Select Network
          </div>
          <div className="h-px bg-slate-800" />

          {chains?.map((chain, index) => (
            <SelectItem
              key={index}
              value={chain.id.toString()}
              className="flex outline-0 items-center  py-1 px-2 last:pb-2 hover:bg-sky-100 hover:text-slate-900
              last:rounded-b-xl cursor-pointer  transition-all duration-200"
            >
              <div className="mr-2">{chain.name}</div>
              {chain && idToIcon[chain.id] && (
                <img
                  src={idToIcon[chain.id]}
                  className="w-5"
                  alt={chain.name}
                />
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}