import { motion } from "framer-motion";
import { Instagram, Youtube, Twitter } from "lucide-react";

const footerLinks = {
  shop: [
    { label: "Running", href: "#running" },
    { label: "Street", href: "#street" },
    { label: "Social", href: "#social" },
    { label: "Acessórios", href: "#" },
    { label: "Suplementação", href: "#" },
  ],
  brand: [
    { label: "Manifesto", href: "#manifesto" },
    { label: "Nossa História", href: "#" },
    { label: "Comunidade", href: "#community" },
    { label: "Eventos", href: "#" },
    { label: "Podcast", href: "#" },
  ],
  support: [
    { label: "FAQ", href: "#" },
    { label: "Trocas e Devoluções", href: "#" },
    { label: "Rastreamento", href: "#" },
    { label: "Contato", href: "#" },
    { label: "Termos de Uso", href: "#" },
  ],
};

const socialLinks = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Twitter, href: "#", label: "Twitter" },
];

export const Footer = () => {
  return (
    <footer className="bg-nn-black border-t-4 border-nn-orange relative overflow-hidden">
      {/* Background brand image */}
      <div className="absolute top-10 right-10 opacity-10">
        <img
          src="/lovable-uploads/NN1.png"
          alt=""
          className="w-48 h-48 object-contain"
        />
      </div>

      {/* Newsletter Section */}
      <div className="container py-16 relative z-10">
        <div className="bg-gradient-tropical border-4 border-nn-black p-8 md:p-12 shadow-brutal">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-display text-3xl md:text-4xl text-nn-black mb-4">
                FIQUE POR DENTRO DO{" "}
                <span className="text-nn-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">CAOS</span>
              </h3>
              <p className="text-nn-black/80 font-medium">
                Receba novidades, lançamentos exclusivos e convites para eventos.
              </p>
            </div>
            <div className="flex gap-4">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                className="flex-1 bg-nn-black border-4 border-nn-black px-4 py-3 text-nn-white placeholder:text-nn-white/50 focus:border-nn-yellow focus:outline-none transition-colors font-body"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-nn-black text-nn-orange font-display px-6 py-3 uppercase tracking-wider shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-300 border-4 border-nn-black"
              >
                Enviar
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container pb-12 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column - Logo 50% larger */}
          <div className="lg:col-span-2">
            <img
              alt="Nada Normal"
              className="h-[180px] w-auto mb-6 drop-shadow-[0_0_20px_hsl(25,100%,55%,0.5)]"
              src="/lovable-uploads/ce6d23c5-e49a-4363-9799-40abb2b86648.png"
            />
            <p className="text-nn-white/70 mb-6 max-w-sm">
              Não corremos para caber em planilhas. Corremos porque o silêncio do
              asfalto é o único lugar que entende nossa loucura.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-12 bg-card border-2 border-nn-orange/50 hover:border-nn-orange hover:bg-nn-orange hover:text-nn-black flex items-center justify-center transition-all duration-300 hover:shadow-neon-orange text-nn-white"
                  aria-label={social.label}
                >
                  <social.icon size={20} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-display text-lg text-nn-lime mb-6">LOJA</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-nn-white/70 hover:text-nn-orange transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg text-nn-yellow mb-6">MARCA</h4>
            <ul className="space-y-3">
              {footerLinks.brand.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-nn-white/70 hover:text-nn-orange transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg text-nn-orange mb-6">SUPORTE</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-nn-white/70 hover:text-nn-orange transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-nn-orange/30">
        <div className="container py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-nn-white/50 text-sm text-center md:text-left">
            © 2024 Nada Normal. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6 text-sm text-nn-white/50">
            <a href="#" className="hover:text-nn-orange transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-nn-orange transition-colors">
              Cookies
            </a>
            <a href="#" className="hover:text-nn-orange transition-colors">
              Termos
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
