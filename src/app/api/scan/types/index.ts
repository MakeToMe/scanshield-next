// Tipos compartilhados entre os passos do processo de scan

export interface ScanRequest {
  url: string;
}

export interface ScanResult {
  success: boolean;
  message: string;
  scanId: string;
  status: string;
  scanResults?: ScanJsonData;
  sitesScanned?: number;
}

export interface ScanJsonData {
  urlsSupabase: string[];
  tokensJWT: string[];
  urlsApi: string[];
  urlsGenericas: string[];
  chavesSensiveis: string[];
  urlsBancoDados: string[];
  urlsSuspeitas: string[];
  tecnologiasDetectadas: string[];
}

export interface Step1Result {
  scanId: string;
  normalizedUrl: string;
  domainName: string;
  scanJsonData: ScanJsonData;
  sitesScanned: number;
}

export interface ApiTestResult {
  url: string;
  token: string;
  tokenDisplay: string;
  status: 'success' | 'error' | 'not_found';
  error?: string;
  statusCode?: number;
  responseTime: number;
  data: any;
  hasSwagger?: boolean;
}

export interface Step2Result {
  scanId: string;
  results: ApiTestResult[];
  timestamp: string;
  success: boolean;
  error?: string;
  urlsTestadas?: string[];
  shouldRunStep4?: boolean;  // Indica se o passo 4 deve ser executado
}

export interface WebhookResult {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface Step3Result {
  scanId: string;
  timestamp: string;
  success: boolean;
  tables: Array<{
    name: string;
    path: string;
    methods: string[];
    columns?: string[];
    columnCount?: number;
    rowCount?: number;
    isEstimate?: boolean;
    rlsWarning?: string;
    error?: string;
  }>;
  rpcs: Array<{
    name: string;
    path: string;
    method: string;
    parameters?: any[];
  }>;
  error?: string;
  step4?: WebhookResult;  // Resultado do envio para o webhook
}
