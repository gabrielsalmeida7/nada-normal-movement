import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthHashErrorHandler } from "@/components/AuthHashErrorHandler";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CategoryRunning from "./pages/CategoryRunning";
import CategoryStreet from "./pages/CategoryStreet";
import Login from "./pages/Login";
import Register from "./pages/Register";
// Coming Soon, Carrinho e Checkout mantidos no código, mas sem rota ativa
// import ComingSoon from "./pages/ComingSoon";
// import Cart from "./pages/Cart";
// import Checkout from "./pages/Checkout";
// import CategorySocial from "./pages/CategorySocial"; // Social comentado por enquanto

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthHashErrorHandler />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/running" element={<CategoryRunning />} />
            <Route path="/street" element={<CategoryStreet />} />
            {/* Loja em breve: carrinho, checkout e coming-soon sem rota ativa */}
            <Route path="/carrinho" element={<Navigate to="/" replace />} />
            <Route path="/checkout/*" element={<Navigate to="/" replace />} />
            <Route path="/coming-soon" element={<Navigate to="/" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
