'use client';

import React from 'react';
import Image from 'next/image';

interface Testimonial {
  name: string;
  site: string;
  url: string;
  logo: string;
  dev: string;
  devImage: string;
  testimonial: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Cartoom Personalizados',
    site: 'www.cartoompersonalizados.com',
    url: 'https://cartoompersonalizados.com',
    logo: 'https://cartoompersonalizados.com/images/logo.png',
    dev: 'Moisés Missias',
    devImage: 'https://pub-55625ef692bf44f3a5a40fad2cfe6bcb.r2.dev/documentos/perfil.moises-missias.jpg',
    testimonial: 'O ScanShield foi fundamental para identificar vulnerabilidades críticas em nosso site que não tínhamos percebido. Após as recomendações, implementamos as correções e agora nossos dados estão muito mais seguros. Recomendo para qualquer empresa que valorize a segurança de seus clientes.'
  },
  {
    name: 'TrackPro',
    site: 'www.trackpro.com.br',
    url: 'https://trackpro.com.br',
    logo: 'https://trackpro.com.br/logotipo-branco.png',
    dev: 'Victor Hugo',
    devImage: 'https://pub-55625ef692bf44f3a5a40fad2cfe6bcb.r2.dev/documentos/perfil-victor-hugo.jpg',
    testimonial: 'Graças ao ScanShield, descobrimos exposições de dados que poderiam ter causado sérios problemas para nossa empresa. A ferramenta não apenas identificou as vulnerabilidades, mas também nos guiou no processo de correção. Hoje operamos com muito mais tranquilidade sabendo que nossos sistemas estão protegidos.'
  }
];

const SuccessCases: React.FC = () => {
  return (
    <section className="py-16 bg-[#0c0b1d]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Cases de Sucesso</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Conheça empresas que melhoraram significativamente sua segurança após utilizarem o ScanShield para identificar e corrigir vulnerabilidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          {testimonials.map((item, index) => (
            <div key={index} className="bg-[#13122b] border border-[#2e2d4c] rounded-xl p-6 transition-transform duration-300 hover:transform hover:scale-105 relative z-10">
              <div className="flex flex-col h-full">
                <div className="flex items-center mb-6">
                  <div className="relative w-32 h-16 bg-white rounded-md p-2 flex items-center justify-center">
                    <Image 
                      src={item.logo} 
                      alt={`${item.name} logo`} 
                      width={120} 
                      height={60} 
                      className="object-contain"
                    />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-white">{item.name}</h3>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#7b68ee] hover:text-[#a855f7] transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(item.url, '_blank');
                      }}
                    >
                      {item.site}
                    </a>
                  </div>
                </div>

                <div className="flex-grow">
                  <p className="text-gray-300 italic mb-6">"{item.testimonial}"</p>
                </div>

                <div className="flex items-center mt-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image 
                      src={item.devImage} 
                      alt={item.dev} 
                      width={48} 
                      height={48} 
                      className="object-cover"
                    />
                  </div>
                  <div className="ml-3">
                    <p className="text-white font-medium">{item.dev}</p>
                    <p className="text-gray-400 text-sm">Desenvolvedor</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuccessCases;
