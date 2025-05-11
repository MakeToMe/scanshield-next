'use client';

import Image from 'next/image';

export default function Footer() {
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
            <div className="text-sm text-gray-400 flex flex-col items-center">
              <p>&copy; Desenvolvido por Guardia Soluções em Tecnologia</p>
              <div className="mt-3 relative h-12 w-36">
                <Image 
                  src="https://pub-55625ef692bf44f3a5a40fad2cfe6bcb.r2.dev/documentos/GST-TRANSPARENTE.png"
                  alt="Guardia Soluções em Tecnologia"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
