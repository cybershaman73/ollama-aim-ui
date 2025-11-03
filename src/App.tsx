import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
//import hypercycle from "hypercyclejs";
import Layout from "./components/layout";
import Error from "./pages/Error";
import ChatDemo from "./pages/ChatDemo";
import { startConfig } from "./lib/blockchain";
import { WagmiProvider } from "wagmi";
import { conneckitTheme } from "./lib/utils";

import { Toaster } from "react-hot-toast";

const VITE_BASE_ROUTE = import.meta.env.VITE_BASE_ROUTE;

import ChatProvider from "./context/ChatProvider";

import { wagmiConfig } from "./lib/blockchain";

function App() {
  startConfig();
  const queryClient = new QueryClient();
  return (
    <>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ChatProvider>
            <ConnectKitProvider customTheme={conneckitTheme}>
              <Router basename={VITE_BASE_ROUTE}>
                <Routes>
                  <Route
                    element={
                      <Layout>
                        <Outlet />
                      </Layout>
                    }
                  >
                    <Route path="/" element={<ChatDemo />} />
                    <Route path="*" element={<Error />} />
                  </Route>
                </Routes>
              </Router>
            </ConnectKitProvider>
          </ChatProvider>
        </QueryClientProvider>
      </WagmiProvider>
      <Toaster />
    </>
  );
}

export default App;
