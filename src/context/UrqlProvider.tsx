import { ReactNode, useEffect, useState } from "react";
import {
  cacheExchange,
  Client,
  createClient,
  fetchExchange,
  Provider,
} from "urql";
import { useAccount } from "wagmi";
import { getLastSelectedChain } from "../lib/blockchain";
import { clientGetter } from "../lib/graphql/client";
import { GRAPH_URLS } from "../constants/addresses";

interface UrqlProviderProps {
  children: ReactNode;
}
const UrqlProvider = ({ children }: UrqlProviderProps) => {
  const { chain } = useAccount();
  const lastSelectedChain = getLastSelectedChain();

  const chainName = lastSelectedChain
    ? lastSelectedChain.replace(/^"|"$/g, "")
    : chain
    ? chain.name
    : "Ethereum";
  if (chain && !lastSelectedChain) {
    localStorage.setItem("lastSelectedChain", JSON.stringify(chain.name));
  }
  const graphURL = GRAPH_URLS[chainName as keyof typeof GRAPH_URLS];
  const [currentClient, setCurrentClient] = useState<Client>(() =>
    createClient({
      url: graphURL,
      exchanges: [cacheExchange, fetchExchange],
    })
  );

  useEffect(() => {
    const handleClient = async () => {
      const client = await clientGetter(chain!.name ? chain!.name : undefined);
      setCurrentClient(client!);
    };
    handleClient();
  }, [lastSelectedChain, chain]);
  return <Provider value={currentClient}>{children}</Provider>;
};

export default UrqlProvider;
