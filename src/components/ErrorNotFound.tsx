'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ErrorNotFound() {
  return (
    <div className="rounded-lg border border-red-500 bg-dark-light p-6 shadow-md">
      <div className="flex flex-col items-center text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Erro 404 - Página não encontrada</h3>
        <p className="text-gray-300 mb-4">
          Não foi possível acessar a URL fornecida. Verifique se o endereço está correto e se o site está online.
        </p>
        <div className="bg-dark-darker rounded-lg p-4 w-full max-w-md">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Possíveis causas:</h4>
          <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
            <li>A URL digitada está incorreta</li>
            <li>O servidor está offline ou inacessível</li>
            <li>O site requer autenticação</li>
            <li>Há um firewall ou proxy bloqueando o acesso</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
