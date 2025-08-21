// import { useState } from 'react';
// import { Mementic_backend } from 'declarations/Mementic_backend';

import { Routes, Route } from "react-router";
import Index from "./pages/index";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import MyPlace from "./pages/MyPlace";
import Marketplace from "./pages/Marketplace";
import Portfolio from "./pages/Portfolio";
import Wallet_Page from "./pages/Wallet";
import NotFound from "./pages/NotFound";
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
