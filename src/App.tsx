import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthHashErrorHandler } from "@/components/AuthHashErrorHandler";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";
import CategoryRunning from "./pages/CategoryRunning";
import CategoryStreet from "./pages/CategoryStreet";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutError from "./pages/CheckoutError";
import CheckoutPending from "./pages/CheckoutPending";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
            <Route path="/" element={<ComingSoon />} />
            <Route path="/home" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/running" element={<CategoryRunning />} />
            <Route path="/street" element={<CategoryStreet />} />
            <Route path="/carrinho" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/sucesso" element={<CheckoutSuccess />} />
            <Route path="/checkout/erro" element={<CheckoutError />} />
            <Route path="/checkout/pendente" element={<CheckoutPending />} />
            {/* <Route path="/social" element={<CategorySocial />} /> Social comentado por enquanto */}
            <Route path="/coming-soon" element={<ComingSoon />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
