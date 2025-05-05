'use client';

import { 
  ShieldCheckIcon, 
  MagnifyingGlassIcon, 
  TableCellsIcon, 
  KeyIcon 
} from '@heroicons/react/24/outline';

export default function FeaturesSection() {
  const features = [
    {
      name: 'Detecção de APIs Supabase',
      description: 'Identifica automaticamente APIs Supabase expostas em seu site ou aplicação web.',
      icon: MagnifyingGlassIcon,
    },
    {
      name: 'Identificação de Tabelas',
      description: 'Detecta tabelas e seus dados que podem estar expostos publicamente sem a devida proteção.',
      icon: TableCellsIcon,
    },
    {
      name: 'Descoberta de Chaves',
      description: 'Encontra chaves de API e tokens de autenticação que podem estar expostos no código-fonte.',
      icon: KeyIcon,
    },
    {
      name: 'Recomendações de Segurança',
      description: 'Fornece orientações sobre como proteger seus dados e corrigir vulnerabilidades encontradas.',
      icon: ShieldCheckIcon,
    },
  ];

  return (
    <div className="py-16 bg-dark-darker">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Proteção Avançada</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Principais Funcionalidades
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            O ScanShield oferece um conjunto completo de ferramentas para identificar e corrigir vulnerabilidades em suas aplicações que utilizam Supabase.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16 border border-gray-800 rounded-lg p-6 bg-dark-light hover:bg-dark-light/70 transition-colors">
                <dt className="text-base font-semibold leading-7 text-white">
                  <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-300">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
