'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import ScanResultsBarChart from './ScanResultsBarChart';
import SimpleGaugeChart from './SimpleGaugeChart';
import dynamic from 'next/dynamic';

// Importação dinâmica do Player Lottie para melhor performance
const LottiePlayer = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Player), {
  ssr: false,
  loading: () => null
});
import { 
  ShieldCheckIcon, 
  KeyIcon, 
  LockClosedIcon,
  ServerIcon,
  SparklesIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import NetworkAnimation from './NetworkAnimation';
import CounterAnimation from './CounterAnimation';
import ErrorNotFound from './ErrorNotFound';
import StatsCounter from './StatsCounter';
import ScanProgressSteps, { ScanStep } from './ScanProgressSteps';

interface FormData {
  url: string;
}

interface ScanResult {
  scanResults?: {
    urlsSupabase: string[];
    tokensJWT: string[];
    urlsApi: string[];
    urlsGenericas: string[];
    chavesSensiveis: string[];
    urlsBancoDados: string[];
    urlsSuspeitas: string[];
  };
  supabaseInfo?: {
    baseUrl: string;
    hasKey: boolean;
    tables: Array<{name: string; rowCount: number; columnCount: number}>;
    rpcs: string[];
  };
  analysisResult?: {
    diagnostico: string;
    pontuacao: number;
    recomendacoes: string[];
    nivel_risco: string;
    output?: string;
  };
  message?: string;
  error?: string;
  sitesScanned?: number;
}



// Componente para exibir recursos de segurança
function SecurityFeatures() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-white text-center mb-12">
        Recursos de Segurança Avançados
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1: Automação de Navegador */}
        <div className="p-6 rounded-xl bg-[#1e1d3c] border border-[#2e2d4c] transition-all hover:bg-[#252447] hover:border-[#3e3d6c]">
          <div className="mb-4 bg-gradient-to-r from-[#7b68ee] to-[#a855f7] p-3 rounded-lg inline-block">
            <GlobeAltIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Automação de Navegador</h3>
          <p className="text-gray-300">
            Nosso backend simula a execução real do seu site em um ambiente seguro, como se fosse um navegador de verdade, permitindo análise precisa do comportamento da aplicação.
          </p>
        </div>
        
        {/* Card 2: Varredura Customizada */}
        <div className="p-6 rounded-xl bg-[#1e1d3c] border border-[#2e2d4c] transition-all hover:bg-[#252447] hover:border-[#3e3d6c]">
          <div className="mb-4 bg-gradient-to-r from-[#a855f7] to-[#38bdf8] p-3 rounded-lg inline-block">
            <KeyIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Varredura Customizada</h3>
          <p className="text-gray-300">
            Inspecionamos o código-fonte em busca de chaves de API, conexões com bancos de dados, URLs sensíveis e tokens vazados diretamente no frontend.
          </p>
        </div>
        
        {/* Card 3: Reconhecimento Supabase */}
        <div className="p-6 rounded-xl bg-[#1e1d3c] border border-[#2e2d4c] transition-all hover:bg-[#252447] hover:border-[#3e3d6c]">
          <div className="mb-4 bg-gradient-to-r from-[#38bdf8] to-[#7b68ee] p-3 rounded-lg inline-block">
            <ServerIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Reconhecimento Supabase</h3>
          <p className="text-gray-300">
            Identificamos automaticamente exposições via OpenAPI/Swagger, listando tabelas, funções, permissões públicas e possíveis brechas no seu Supabase.
          </p>
        </div>
        
        {/* Card 4: Testes de Injeção */}
        <div className="p-6 rounded-xl bg-[#1e1d3c] border border-[#2e2d4c] transition-all hover:bg-[#252447] hover:border-[#3e3d6c]">
          <div className="mb-4 bg-gradient-to-r from-[#7b68ee] to-[#a855f7] p-3 rounded-lg inline-block">
            <LockClosedIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Testes de Injeção</h3>
          <p className="text-gray-300">
            Executamos uma varredura com foco nas principais falhas da OWASP Top 10, como XSS, CSRF e SQL Injection, usando motores como o OWASP ZAP.
          </p>
        </div>
        
        {/* Card 5: Análise Semântica com IA */}
        <div className="p-6 rounded-xl bg-[#1e1d3c] border border-[#2e2d4c] transition-all hover:bg-[#252447] hover:border-[#3e3d6c]">
          <div className="mb-4 bg-gradient-to-r from-[#a855f7] to-[#38bdf8] p-3 rounded-lg inline-block">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Análise Semântica com IA</h3>
          <p className="text-gray-300">
            Aplicamos um modelo de IA treinado em segurança para interpretar os dados coletados, identificar falhas e classificar automaticamente o nível e impacto do risco.
          </p>
        </div>
        
        {/* Card 6: Diagnóstico de Segurança */}
        <div className="p-6 rounded-xl bg-[#1e1d3c] border border-[#2e2d4c] transition-all hover:bg-[#252447] hover:border-[#3e3d6c]">
          <div className="mb-4 bg-gradient-to-r from-[#38bdf8] to-[#7b68ee] p-3 rounded-lg inline-block">
            <LockClosedIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Diagnóstico de Segurança</h3>
          <p className="text-gray-300">
            Receba um relatório claro e detalhado com a análise dos riscos identificados, além de orientações práticas para fortalecer a segurança da sua aplicação.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ModernHeroSection() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showNotFound, setShowNotFound] = useState(false);
  const [sitesScanned, setSitesScanned] = useState(0);
  const [currentStep, setCurrentStep] = useState<ScanStep>('initial');
  
  // Adiciona um evento para atualizar o contador local quando o StatsCounter atualizar
  useEffect(() => {
    const handleStatsUpdated = (event: CustomEvent<{count: number}>) => {
      if (event.detail && typeof event.detail.count === 'number') {
        console.log('ModernHeroSection recebeu evento stats-updated com valor:', event.detail.count);
        setSitesScanned(event.detail.count);
      }
    };
    
    // Adiciona o ouvinte de evento personalizado
    window.addEventListener('stats-updated', handleStatsUpdated as EventListener);
    
    // Também ouve o evento sites-count-updated para compatibilidade
    const handleSitesCountUpdated = (event: CustomEvent<{count: number}>) => {
      if (event.detail && typeof event.detail.count === 'number') {
        console.log('ModernHeroSection recebeu evento sites-count-updated com valor:', event.detail.count);
        setSitesScanned(event.detail.count);
      }
    };
    window.addEventListener('sites-count-updated', handleSitesCountUpdated as EventListener);
    
    // Carrega as estatísticas iniciais apenas uma vez ao carregar
    fetchStats();
    
    return () => {
      window.removeEventListener('stats-updated', handleStatsUpdated as EventListener);
      window.removeEventListener('sites-count-updated', handleSitesCountUpdated as EventListener);
    };
  }, []);
  
  // Função para buscar as estatísticas do servidor
  const fetchStats = async () => {
    try {
      const apiUrl = new URL('/api/stats', window.location.href).href;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.sitesScanned === 'number') {
          console.log('ModernHeroSection atualizou estatísticas:', data.sitesScanned);
          setSitesScanned(data.sitesScanned);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const normalizeUrl = (url: string) => {
    if (!url) return url;
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    return url;
  };



  const onSubmit = async (data: FormData) => {
    try {
      // Ativa o estado de carregamento imediatamente
      setIsLoading(true);
      setShowNotFound(false);
      setScanResult(null);
      
      // Atualiza o passo atual para URL enviada
      setCurrentStep('url_submitted');
      
      const normalizedUrl = normalizeUrl(data.url);
      
      // Simula a extração de dados (passo 2)
      setTimeout(() => setCurrentStep('extracting_data'), 500);
      
      // Faz a chamada à API usando caminho absoluto
      const apiUrl = new URL('/api/scan', window.location.href).href;
      console.log(`Enviando scan para: ${apiUrl}`);
      
      // Simula os próximos passos com tempos diferentes
      setTimeout(() => setCurrentStep('searching_vulnerabilities'), 2000);
      setTimeout(() => setCurrentStep('analyzing_apis'), 4000);
      setTimeout(() => setCurrentStep('generating_diagnosis'), 6000);
      
      const response = await axios.post(apiUrl, { url: normalizedUrl });
      
      // Marca como concluído quando a resposta chegar
      setTimeout(() => setCurrentStep('completed'), 500);
      
      // Não precisamos mais chamar fetchStats aqui, pois o contador será atualizado
      // através do evento 'sites-count-updated' quando recebermos a resposta
      
      if (response.data.error && response.data.error.includes('404')) {
        setShowNotFound(true);
        setIsLoading(false);
        return;
      }
      
      setScanResult(response.data);
      
      // Se recebemos o número de sites escaneados na resposta, atualizamos o contador
      if (response.data.sitesScanned && typeof response.data.sitesScanned === 'number') {
        // Dispara um evento personalizado para atualizar o contador em todos os componentes
        const sitesCountEvent = new CustomEvent('sites-count-updated', {
          detail: { count: response.data.sitesScanned }
        });
        window.dispatchEvent(sitesCountEvent);
        console.log(`Contador atualizado após escaneamento: ${response.data.sitesScanned}`);
      }
    } catch (error: any) {
      console.error('Erro ao escanear:', error);
      
      // Verifica se é um erro 404 ou se a mensagem de erro contém informação sobre página não encontrada
      if (error.response && error.response.status === 404 || 
          (error.response && error.response.data && error.response.data.error && 
           (error.response.data.error.includes('404') || 
            error.response.data.error.includes('não encontrada') || 
            error.response.data.error.includes('not found')))) {
        setShowNotFound(true);
      } 
      // Verifica se é um erro 500 que pode estar relacionado a site não encontrado
      else if (error.response && error.response.status === 500 && 
               error.message && (error.message.includes('failed') || error.message.includes('falhou'))) {
        setShowNotFound(true);
      } 
      else {
        setScanResult({
          scanResults: {
            urlsSupabase: [],
            tokensJWT: [],
            urlsApi: [],
            urlsGenericas: [],
            chavesSensiveis: [],
            urlsBancoDados: [],
            urlsSuspeitas: []
          },
          error: error.message || 'Erro ao escanear a URL'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Não precisamos mais deste useEffect, pois o StatsCounter já está buscando as estatísticas
  // e atualizando o contador através de eventos

  return (
    <div className="min-h-screen bg-[#13122b] text-white relative">
      {/* Animação de rede no fundo - posicionada para cobrir toda a página */}
      <div className="fixed inset-0 z-0" style={{ pointerEvents: 'none' }}>
        <NetworkAnimation />
      </div>
      
      {/* Conteúdo da seção hero */}
      <div className="relative z-10" style={{ minHeight: '650px' }}>
        <div className="mx-auto max-w-5xl py-12 sm:py-16 lg:py-20 px-4">
          <div className="text-center">
            <div className="flex justify-center items-center mb-6">
              <div className="relative">
                <ShieldCheckIcon className="h-12 w-12 sm:h-14 sm:w-14 text-indigo-500 mr-3 animate-pulse" />
                <div className="absolute inset-0 bg-indigo-500 opacity-20 rounded-full blur-md animate-ping-slow"></div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight md:text-6xl">
                <span className="text-primary">Scan</span><span className="text-secondary">Shield</span>
              </h1>
            </div>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-6">
              Escaneie qualquer site em busca de vulnerabilidades, receba um relatório detalhado e garanta a segurança da sua aplicação.
            </p>

            {/* Componente StatsCounter oculto para garantir que as estatísticas sejam carregadas */}
            <div className="hidden"><StatsCounter /></div>
            
            {/* Contador de sites escaneados e passos */}
            <div className="flex flex-col md:flex-row justify-between items-stretch mb-12 gap-6 max-w-4xl mx-auto">
              {/* Contador de sites - lado esquerdo */}
              <div className="px-8 py-8 flex flex-col justify-center items-center md:w-2/5">
                <div className="flex items-center justify-center">
                  <CounterAnimation 
                    targetValue={sitesScanned} 
                    className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent" 
                    duration={1500}
                    prefix=""
                  />
                  <span className="text-7xl md:text-8xl font-bold text-purple-400 ml-2">+</span>
                </div>
                <p className="bg-[#1e1d3c] px-4 py-1 rounded-full border border-[#2e2d4c] shadow-md text-gray-300 mt-3 text-lg font-medium">Sites escaneados</p>
              </div>
              
              {/* Passos do processo - lado direito */}
              <div className="px-8 py-6 md:w-3/5 flex items-center">
                <ScanProgressSteps currentStep={currentStep} isLoading={isLoading} />
              </div>
            </div>
            
            {/* Formulário de scan */}
            <div className="w-full max-w-2xl mx-auto mb-10">
              <form onSubmit={handleSubmit(onSubmit)} className="w-full">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-grow">
                    <input
                      type="text"
                      {...register('url', { required: 'URL é obrigatória' })}
                      className="w-full px-5 py-4 rounded-xl bg-[#1e1d3c] border border-[#2e2d4c] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white shadow-lg shadow-indigo-900/20"
                      placeholder="Digite a URL para escanear (ex: exemplo.com)"
                      disabled={isLoading}
                    />
                    {errors.url && (
                      <p className="mt-2 text-sm text-red-500">{errors.url.message}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium transition-all shadow-lg shadow-indigo-900/20 ${
                      isLoading ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? 'Escaneando...' : 'Escanear'}
                  </button>
                </div>
              </form>
              
              {/* Animação de escaneamento */}
              {isLoading && (
                <div className="mt-8 flex flex-col items-center justify-center p-6 rounded-xl bg-[#1e1d3c]/80 border border-[#2e2d4c] shadow-lg shadow-indigo-900/20">
                  <h3 className="text-xl font-bold text-white mb-4">Escaneamento em progresso</h3>
                  <div className="w-56 h-56">
                    {/* Fallback enquanto o Lottie carrega */}
                    <LottiePlayer
                      src="/ScanShield.json"
                      className="w-full h-full"
                      loop
                      autoplay
                      renderer="svg"
                      background="transparent"
                      speed={1}
                    />
                  </div>
                  <div className="flex flex-col items-center mt-4 max-w-md">
                    <p className="text-gray-200 text-center animate-pulse text-lg font-medium">Escaneando a URL...</p>
                    <p className="text-gray-300 mt-3 text-center">Este processo pode levar alguns segundos, dependendo do tamanho e complexidade do código-fonte do site escaneado.</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Resultados do scan - Mostrados logo após a URL */}
            {(scanResult || showNotFound) && (
              <div className="w-full max-w-4xl mx-auto mt-8 mb-16">
                <div className="p-6 rounded-xl bg-[#1e1d3c] border border-[#2e2d4c]">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    Resultados da análise
                  </h2>
                  
                  {showNotFound && (
                    <div className="max-w-2xl mx-auto">
                      <ErrorNotFound />
                    </div>
                  )}
                  
                  {scanResult && !scanResult.error && !showNotFound && (
                    <div>
                      {/* Gráfico de Barras Horizontais */}
                      <ScanResultsBarChart 
                        chaves={scanResult?.scanResults?.chavesSensiveis?.length || 0}
                        apis={scanResult?.scanResults?.urlsApi?.length || 0}
                        urls={scanResult?.scanResults?.urlsGenericas?.length || 0}
                        urlsSuspeitas={scanResult?.scanResults?.urlsSuspeitas?.length || 0}
                        tokens={scanResult?.scanResults?.tokensJWT?.length || 0}
                        tabelas={scanResult?.supabaseInfo?.tables?.length || 0}
                        rpcs={scanResult?.supabaseInfo?.rpcs?.length || 0}
                      />
                      
                      {/* Gráfico de Medidor de Risco */}
                      {/* Exibe o nível de risco com animação suave */}
                      <SimpleGaugeChart 
                        riskLevel={
                          // Verificar várias condições para determinar o nível de risco
                          scanResult?.analysisResult?.nivel_risco === 'alto' ? 'Alto' :
                          scanResult?.analysisResult?.output?.includes('Risco Alto') ? 'Alto' :
                          scanResult?.analysisResult?.output?.includes('🔴 Alto') ? 'Alto' :
                          scanResult?.analysisResult?.output?.includes('risco como alta') ? 'Alto' :
                          scanResult?.analysisResult?.nivel_risco === 'medio' ? 'Médio' :
                          scanResult?.analysisResult?.output?.includes('Risco Médio') ? 'Médio' :
                          scanResult?.analysisResult?.output?.includes('🟡 Médio') ? 'Médio' :
                          scanResult?.analysisResult?.nivel_risco === 'baixo' ? 'Baixo' :
                          scanResult?.analysisResult?.output?.includes('Risco Baixo') ? 'Baixo' :
                          scanResult?.analysisResult?.output?.includes('🟢 Baixo') ? 'Baixo' :
                          'Nulo'
                        }
                      />
                      
                      {/* Resumos */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="p-6 rounded-xl bg-[#13122b] border border-[#2e2d4c]">
                          <div className="flex items-center text-gray-300">
                            <KeyIcon className="h-5 w-5 text-[#7b68ee] mr-2" />
                            <h3 className="text-sm font-medium">Chaves ({scanResult?.scanResults?.chavesSensiveis?.length || 0})</h3>
                          </div>
                        </div>
                        
                        <div className="p-6 rounded-xl bg-[#13122b] border border-[#2e2d4c]">
                          <div className="flex items-center text-gray-300">
                            <ServerIcon className="h-5 w-5 text-[#a855f7] mr-2" />
                            <h3 className="text-sm font-medium">APIs ({scanResult?.scanResults?.urlsApi?.length || 0})</h3>
                          </div>
                        </div>
                        
                        <div className="p-6 rounded-xl bg-[#13122b] border border-[#2e2d4c]">
                          <div className="flex items-center text-gray-300">
                            <LockClosedIcon className="h-5 w-5 text-[#7b68ee] mr-2" />
                            <h3 className="text-sm font-medium">URLs ({scanResult?.scanResults?.urlsGenericas?.length || 0})</h3>
                          </div>
                        </div>
                      </div>
                      
                      {/* Supabase Info */}
                      {scanResult?.scanResults?.urlsSupabase && scanResult.scanResults.urlsSupabase.length > 0 && (
                        <div className="mb-8">
                          <div className="p-6 rounded-xl bg-[#13122b] border border-[#2e2d4c]">
                            <div className="flex items-center mb-4">
                              <ServerIcon className="h-6 w-6 text-[#7b68ee] mr-2" />
                              <h3 className="text-xl font-bold text-white">
                                Supabase detectado: <span className="text-[#a855f7]">{scanResult?.scanResults?.urlsSupabase?.[0]}</span>
                              </h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="p-4 rounded-lg bg-[#13122b] border border-[#2e2d4c]">
                                <h4 className="text-lg font-medium text-white flex items-center">
                                  <span className="text-[#7b68ee] mr-2">{scanResult?.scanResults?.tokensJWT?.length || 0}</span> Tokens JWT encontrados
                                </h4>
                              </div>
                              
                              <div className="p-4 rounded-lg bg-[#13122b] border border-[#2e2d4c]">
                                <h4 className="text-lg font-medium text-white flex items-center">
                                  <span className="text-[#a855f7] mr-2">{scanResult?.scanResults?.urlsSuspeitas?.length || 0}</span> URLs suspeitas encontradas
                                </h4>
                              </div>
                            </div>
                            
                            {/* Tabelas */}
                            {scanResult.supabaseInfo && scanResult.supabaseInfo.tables && scanResult.supabaseInfo.tables.length > 0 && (
                              <div className="mt-6">
                                <h4 className="text-lg font-medium text-white mb-3">Tabelas encontradas: <span className="text-secondary">{scanResult.supabaseInfo.tables.length}</span></h4>
                                <div className="bg-[#13122b] border border-[#2e2d4c] rounded-lg p-4 overflow-x-auto">
                                  <table className="min-w-full divide-y divide-[#2e2d4c]">
                                    <thead>
                                      <tr>
                                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Nome</th>
                                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Linhas</th>
                                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Colunas</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2e2d4c]">
                                      {scanResult.supabaseInfo.tables.map((table, index) => (
                                        <tr key={index}>
                                          <td className="px-4 py-2 text-sm text-gray-300">{table.name}</td>
                                          <td className="px-4 py-2 text-sm text-gray-300">{table.rowCount}</td>
                                          <td className="px-4 py-2 text-sm text-gray-300">{table.columnCount}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            
                            {/* RPCs */}
                            {scanResult.supabaseInfo && scanResult.supabaseInfo.rpcs && scanResult.supabaseInfo.rpcs.length > 0 && (
                              <div className="mt-6">
                                <h4 className="text-lg font-medium text-white mb-3">Funções RPC encontradas: <span className="text-secondary">{scanResult.supabaseInfo.rpcs.length}</span></h4>
                                <div className="bg-[#13122b] border border-[#2e2d4c] rounded-lg overflow-hidden">
                                  <table className="min-w-full divide-y divide-[#2e2d4c]">
                                    <thead className="bg-[#1e1d3c]">
                                      <tr>
                                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-300 w-16">Qtd</th>
                                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-300">Nome</th>
                                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-300">Descrição</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2e2d4c]">
                                      {scanResult.supabaseInfo.rpcs.map((rpc, index) => {
                                        // Função para determinar a descrição com base no nome da RPC
                                        const getDescription = (rpcName: string) => {
                                          const rpcDescriptions: Record<string, string> = {
                                            'create_guide': 'Cria guias a partir de cotações',
                                            'fix_old_order': 'Corrige códigos de pedidos antigos',
                                            'add_special': 'Adiciona instruções especiais para exames',
                                            'link_exams': 'Vincula exames a tipos de jejum',
                                            'generate_guia': 'Gera código de guia médica',
                                            'generate_pedido': 'Gera código de pedido',
                                            'link_specific': 'Vincula exames específicos a jejum',
                                            'generate_quotation': 'Gera cotação de exames',
                                            'get_fasting': 'Obtém informações de jejum por código'
                                          };
                                          
                                          // Procura por correspondências parciais
                                          for (const [key, desc] of Object.entries(rpcDescriptions)) {
                                            if (rpcName.toLowerCase().includes(key.toLowerCase())) {
                                              return desc;
                                            }
                                          }
                                          
                                          return 'Função RPC do Supabase';
                                        };
                                        
                                        return (
                                          <tr key={index}>
                                            <td className="px-4 py-2 text-sm text-gray-300 text-center">{index + 1}</td>
                                            <td className="px-4 py-2 text-sm text-gray-300 text-center">
                                              {rpc.substring(0, 10)}
                                              {rpc.length > 10 && '...'}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-300 text-center">
                                              {getDescription(rpc)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Diagnóstico de Segurança */}
                      {scanResult.analysisResult && (
                        <div className="mb-8">
                          <h3 className="text-2xl font-bold text-white mb-6 border-b border-[#2e2d4c] pb-3">
                            Diagnóstico de Segurança
                          </h3>
                          
                          <div className="p-6 rounded-xl bg-[#13122b] border border-[#2e2d4c]">
                            <div className="text-gray-300 whitespace-pre-line custom-scrollbar max-h-[600px] overflow-y-auto pr-2">
                              {scanResult.analysisResult.output ? (
                                <div className="text-left" 
                                  dangerouslySetInnerHTML={{
                                    __html: scanResult.analysisResult.output
                                      // Substituir quebras de linha por elementos HTML
                                      .replace(/\n/g, '<br>')
                                      // Destacar títulos das seções
                                      .replace(/🔍 Análise Geral|🔍 Análise Geral/g, '<h4 class="text-xl font-bold text-indigo-400 mt-6 mb-3">🔍 Análise Geral</h4>')
                                      .replace(/🔑 Chaves e Segredos Encontrados|🔑 Chaves e Segredos Encontrados/g, '<h4 class="text-xl font-bold text-indigo-400 mt-6 mb-3">🔑 Chaves e Segredos Encontrados</h4>')
                                      .replace(/🌎 URLs de API ou Serviços|🌐 URLs de API ou Serviços/g, '<h4 class="text-xl font-bold text-indigo-400 mt-6 mb-3">🌐 URLs de API ou Serviços</h4>')
                                      .replace(/🕵️ URLs Suspeitas ou Quebradas|🕵️ URLs Suspeitas ou Quebradas/g, '<h4 class="text-xl font-bold text-indigo-400 mt-6 mb-3">🕵️ URLs Suspeitas ou Quebradas</h4>')
                                      .replace(/📌 Veredito Final|📌 Veredito Final/g, '<div class="mt-8 mb-4 p-4 bg-[#1e1d3c] border border-[#2e2d4c] rounded-lg"><h4 class="text-2xl font-bold text-white mb-3">📌 Veredito Final</h4>')
                                      // Adicionar fechamento da div do veredito
                                      .replace(/Recomendações:\s*([\s\S]*?)(?=<\/div>|$)/g, 'Recomendações:<ul class="list-disc pl-6 mt-3 space-y-2">$1</ul></div>')
                                      // Formatar recomendações como lista
                                      .replace(/(\d+\.)\s*([^<\n]+)/g, '<li class="text-gray-300">$2</li>')
                                      // Destacar níveis de risco
                                      .replace(/\[🟢 Baixo\]/g, '<span class="text-green-500 font-bold">🟢 Baixo</span>')
                                      .replace(/\[🟡 Médio\]/g, '<span class="text-yellow-500 font-bold">🟡 Médio</span>')
                                      .replace(/\[🔴 Alto\]/g, '<span class="text-red-500 font-bold">🔴 Alto</span>')
                                      // Destacar itens de lista
                                      .replace(/- (✅|⚠️|❌)/g, '<div class="flex items-start my-2">$1')
                                      .replace(/(✅|⚠️|❌)([^<]+)/g, '<span class="inline-block w-6 text-xl">$1</span><span class="flex-1">$2</span></div>')
                                      // Destacar ícones
                                      .replace(/(🔍|🔑|📦|🌎|🕵️|📌|🔴|✅|❌|⚠️)/g, '<span class="text-[#7b68ee]">$1</span>')
                                      // Destacar texto em negrito
                                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                  }} />
                                ) : (
                                  <p className="text-left">{scanResult.analysisResult.diagnostico}</p>
                                )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção de recursos de segurança */}
      <section className="py-16 bg-[#13122b] border-t border-[#1e1d3c]">
        <div className="container mx-auto px-4">
          <SecurityFeatures />
        </div>
      </section>
    </div>
  );
}
