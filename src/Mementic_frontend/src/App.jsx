// import { useState } from 'react';
// import { Mementic_backend } from 'declarations/Mementic_backend';

import { Routes, Route } from "react-router-dom";
import Index from "./Pages/index";
import Login from "./Pages/Login";
import Landing from "./Pages/Landing";
import MyPlace from "./Pages/MyPlace";
import Marketplace from "./Pages/Marketplace";
import Portfolio from "./Pages/Portfolio";
import Wallet_Page from "./Pages/Wallet";
import PreMarketplace from "./Pages/PreMarketplace";
import Auction from "./Pages/Auction";
import MemeNFTPlace from "./Pages/MemeNFTPlace";
import NotFound from "./Pages/NotFound";
import { ToastContainer } from "./components/Toast";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider, useToastContext } from "./contexts/ToastContext";

// Component to display toasts
const ToastDisplay = () => {
  const { toasts, dismissToast } = useToastContext();
  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
};

function App() {
  // const [greeting, setGreeting] = useState('');

  // function handleSubmit(event) {
  //   event.preventDefault();
  //   const name = event.target.value;
  //   Mementic_backend.greet(name).then((greeting) => {
  //     setGreeting(greeting);
  //   });
  //   return false;
  // }

  return (
    <ToastProvider>
      <AuthProvider>
        <ToastDisplay />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/myplace" element={<MyPlace />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/pre-marketplace" element={<PreMarketplace />} />
          <Route path="/auction" element={<Auction />} />
          <Route path="/meme-nft" element={<MemeNFTPlace />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/wallet" element={<Wallet_Page />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
