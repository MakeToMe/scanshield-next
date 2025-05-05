'use client';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-darker py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold text-white">
                <span className="text-primary">Scan</span>
                <span className="text-secondary">Shield</span>
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Protegendo seus dados contra exposição indevida
              </p>
            </div>
            <div className="text-sm text-gray-400">
              <p>&copy; {currentYear} ScanShield. Todos os direitos reservados.</p>
              <p className="mt-1">
                Desenvolvido com segurança em mente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
