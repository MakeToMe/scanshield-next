'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon, 
  KeyIcon, 
  LinkIcon, 
  ServerIcon, // Substituindo DatabaseIcon por ServerIcon
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import ErrorNotFound from './ErrorNotFound';
import Footer from './Footer';
import FeaturesSection from './FeaturesSection';

interface FormData {
  url: string;
}

interface TableData {
  name: string;
  rowCount: number;
  columns: string[];
}

interface ScanResult {
  urlsFound: string[];
  apiUrls: string[];
  keysFound: string[];
  tableData?: TableData[];
  error?: string;
}

export default function HeroSection() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showNotFound, setShowNotFound] = useState(false);
  const [foundSupabaseButNoTables, setFoundSupabaseButNoTables] = useState(false);

  // Função para normalizar a URL
  const normalizeUrl = (url: string) => {
    if (!url) return url;
    
    // Adiciona protocolo se não existir
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    return url;
  };

  // Função para truncar URLs do Supabase
  const truncateSupabaseUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `https://...${urlObj.hostname.substring(0, 4)}...`;
    } catch (e) {
      return url.substring(0, 15) + '...';
    }
  };

  // Função para truncar nomes de tabelas
  const truncateTableName = (name: string) => {
    if (name.length <= 3) return name;
    return name.substring(0, 3) + '...';
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setShowNotFound(false);
      setScanResult(null);
      setFoundSupabaseButNoTables(false);
      
      // Normaliza a URL
      const normalizedUrl = normalizeUrl(data.url);
      
      // Faz a requisição para o endpoint seguro
      const response = await axios.post('/api/scan', { url: normalizedUrl });
      
      // Verifica se há erro 404
      if (response.data.error && response.data.error.includes('404')) {
        setShowNotFound(true);
        setIsLoading(false);
        return;
      }
      
      // Verifica se encontrou Supabase mas não encontrou tabelas
      if (
        response.data.apiUrls && 
        response.data.apiUrls.some((url: string) => url.includes('supabase')) && 
        (!response.data.tableData || response.data.tableData.length === 0)
      ) {
        setFoundSupabaseButNoTables(true);
      }
      
      setScanResult(response.data);
    } catch (error: any) {
      console.error('Erro ao escanear:', error);
      
      // Verifica se é um erro 404
      if (error.response && error.response.status === 404) {
        setShowNotFound(true);
      } else {
        setScanResult({
          urlsFound: [],
          apiUrls: [],
          keysFound: [],
          error: error.message || 'Erro ao escanear a URL'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Função para registrar o scan no Supabase (será implementada no backend)
  const logScanToSupabase = async (url: string, result: any) => {
    try {
      await axios.post('/api/log-scan', {
        url,
        hasVulnerabilities: result.tableData && result.tableData.length > 0,
        tablesFound: result.tableData ? result.tableData.length : 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao registrar scan:', error);
    }
  };

  const tableCount = scanResult?.tableData?.length || 0;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow">
        <div className="bg-dark-darker py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                <span className="text-primary">Scan</span>
                <span className="text-secondary">Shield</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Detecte vulnerabilidades em APIs Supabase e proteja seus dados contra exposição indevida.
              </p>
              <div className="mt-10">
                <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xl">
                  <div className="flex gap-x-4">
                    <label htmlFor="url" className="sr-only">
                      URL para escanear
                    </label>
                    <input
                      id="url"
                      {...register('url', { required: 'URL é obrigatória' })}
                      className="min-w-0 flex-auto rounded-md border-0 bg-dark/50 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                      placeholder="Digite a URL para escanear (ex: exemplo.com)"
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`flex-none rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        isLoading ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                    >
                      {isLoading ? 'Escaneando...' : 'Escanear'}
                    </button>
                  </div>
                  {errors.url && (
                    <p className="mt-2 text-sm text-red-500">{errors.url.message}</p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Resultado do Scan */}
        <div className="py-12 bg-dark">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            {isLoading && (
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-lg text-gray-300">Escaneando a URL, aguarde...</p>
              </div>
            )}

            {showNotFound && <ErrorNotFound />}

            {scanResult?.error && !showNotFound && (
              <div className="rounded-lg border border-red-500 bg-dark-light p-4 shadow-md">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" />
                  <h3 className="text-lg font-medium text-white">Erro ao escanear</h3>
                </div>
                <p className="mt-2 text-sm text-gray-300">{scanResult.error}</p>
              </div>
            )}

            {foundSupabaseButNoTables && (
              <div className="rounded-lg border border-green-500 bg-dark-light p-6 shadow-md animate-glow relative overflow-hidden mb-8">
                <div className="pyro">
                  <div className="before" style={{ '--delay': '0' } as any}></div>
                  <div className="after" style={{ '--delay': '0.25' } as any}></div>
                </div>
                <div className="relative z-10">
                  <div className="flex justify-center mb-4">
                    <CheckCircleIcon className="h-12 w-12 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-center text-white mb-4">
                    Parabéns! Nenhuma vulnerabilidade grave encontrada.
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Detectamos que seu site utiliza Supabase, mas não encontramos tabelas com dados expostos.
                    Isso é um bom sinal de que sua implementação está seguindo boas práticas de segurança.
                  </p>
                  <div className="bg-yellow-900/30 border border-yellow-600/50 rounded p-3 text-yellow-200 text-sm">
                    <strong>Importante:</strong> Isso não garante que não existam outras vulnerabilidades.
                    Continue seguindo boas práticas de segurança e realize testes periódicos.
                  </div>
                </div>
              </div>
            )}

            {scanResult && !scanResult.error && !foundSupabaseButNoTables && (
              <div>
                {/* Resumos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="rounded-lg border border-gray-700 bg-dark-light p-4 shadow-md">
                    <div className="flex items-center text-gray-300">
                      <LinkIcon className="h-5 w-5 text-primary mr-2" />
                      <h3 className="text-sm font-medium">URLs encontradas ({scanResult.urlsFound.length})</h3>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-700 bg-dark-light p-4 shadow-md">
                    <div className="flex items-center text-gray-300">
                      <LinkIcon className="h-5 w-5 text-yellow-500 mr-2" />
                      <h3 className="text-sm font-medium">APIs ({scanResult.apiUrls.length})</h3>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-700 bg-dark-light p-4 shadow-md">
                    <div className="flex items-center text-gray-300">
                      <KeyIcon className="h-5 w-5 text-secondary mr-2" />
                      <h3 className="text-sm font-medium">Chaves ({scanResult.keysFound.length})</h3>
                    </div>
                  </div>
                </div>

                {/* Contagem de Tabelas */}
                {scanResult.tableData && scanResult.tableData.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center">
                      <ServerIcon className="h-6 w-6 text-primary mr-2" />
                      <h3 className="text-xl font-bold text-white">
                        Tabelas encontradas: <span className="text-red-500">{tableCount}</span>
                      </h3>
                    </div>
                  </div>
                )}

                {/* Tabelas */}
                {scanResult.tableData && scanResult.tableData.length > 0 && (
                  <div className="mt-6">
                    <div className="flex flex-wrap gap-4">
                      {scanResult.tableData.map((table, index) => (
                        <div
                          key={index}
                          className="flex-1 min-w-[300px] max-w-[calc(50%-8px)] rounded-lg border border-red-500 bg-dark-light p-4 shadow-md pulse-border"
                        >
                          <div className="animate-siren rounded-lg p-1">
                            <div className="bg-dark-darker rounded-lg p-3">
                              <h4 className="text-lg font-medium text-white mb-2">
                                Tabela: {table.name}
                              </h4>
                              <p className="text-sm text-gray-400 mb-1">
                                Registros: <span className="text-white">{table.rowCount}</span>
                              </p>
                              <div>
                                <h5 className="text-sm text-gray-400 mb-1">Colunas:</h5>
                                <div className="flex flex-wrap gap-1">
                                  {table.columns.map((column, colIndex) => (
                                    <span
                                      key={colIndex}
                                      className="inline-flex items-center rounded-md bg-dark px-2 py-1 text-xs font-medium text-gray-300 ring-1 ring-inset ring-gray-700"
                                    >
                                      {column}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <FeaturesSection />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
