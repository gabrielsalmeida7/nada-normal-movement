import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Rola a página para o topo sempre que a rota mudar.
 * Corrige o comportamento onde o scroll era mantido ao navegar entre páginas.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
