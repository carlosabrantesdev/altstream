import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full py-stack-lg px-container-margin flex flex-col md:flex-row justify-between items-center bg-surface-container-lowest border-t border-outline-variant/10 gap-4 mt-stack-lg">
      <span className="font-display-hero text-body-lg text-primary">© 2026 AltStream. Todos os direitos reservados.</span>
      <div className="flex flex-wrap justify-center gap-6">
        <a className="text-on-surface-variant font-body-md text-body-md hover:text-primary transition-all duration-300 hover:opacity-80" href="#">Política de Privacidade</a>
        <a className="text-on-surface-variant font-body-md text-body-md hover:text-primary transition-all duration-300 hover:opacity-80" href="#">Termos de Serviço</a>
        <a className="text-on-surface-variant font-body-md text-body-md hover:text-primary transition-all duration-300 hover:opacity-80" href="#">Fale Conosco</a>
      </div>
    </footer>
  );
}