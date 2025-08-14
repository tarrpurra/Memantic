// import { useState } from 'react';
// import { Mementic_backend } from 'declarations/Mementic_backend';

import { Routes, Route } from "react-router";
import Index from "./pages/index";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import MyPlace from "./pages/MyPlace";
import Marketplace from "./pages/Marketplace";
import Portfolio from "./pages/Portfolio";
import Wallet from "./pages/Wallet";
import NotFound from "./pages/NotFound";
import { Toaster } from "../src/components/ui/toaster";
import { Toaster as Sonner } from "../src/components/ui/sonner";
import { TooltipProvider } from "../src/components/ui/tooltip";


function App() {
  // const [greeting, setGreeting] = useState('');

  // function handleSubmit(event) {
  //   event.preventDefault();
  //   const name = event.target.elements.name.value;
  //   Mementic_backend.greet(name).then((greeting) => {
  //     setGreeting(greeting);
  //   });
  //   return false;
  // }

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/myplace" element={<MyPlace />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/wallet" element={<Wallet />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
    </TooltipProvider>
  );
}

export default App;
