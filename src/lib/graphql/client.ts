import { cacheExchange, createClient, fetchExchange } from "urql";
import { GRAPH_URLS } from "../../constants/addresses";
import { getLastSelectedChain } from "../blockchain";
export const clientGetter = async (walletChain?: string) => {
  try {
    const lastSelectedChain = getLastSelectedChain();

    let chainName = lastSelectedChain
      ? lastSelectedChain.replace(/^"|"$/g, "")
      : walletChain;

    if (walletChain && walletChain != chainName) {
      chainName = walletChain;
    }
    const finalClient = createClient({
      url: GRAPH_URLS[
        chainName
          ? (chainName as unknown as keyof typeof GRAPH_URLS)
          : "Ethereum"
      ],
      exchanges: [cacheExchange, fetchExchange],
    });
    return finalClient;
  } catch (error) {
    console.log(error);
  }
};
