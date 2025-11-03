import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col text-primary justify-center items-center bg-gradient-to-b from-slate-800 to-slate-900">
      <Navbar />
      <div className="w-full h-full">
        {children}
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
