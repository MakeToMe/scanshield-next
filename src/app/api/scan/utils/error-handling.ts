import { NextResponse } from 'next/server';

/**
 * Trata erros específicos do processo de scan
 * @param error Erro capturado
 * @returns Resposta formatada para o cliente
 */
export function handleScanError(error: any) {
  console.error('❌ Erro durante o scan:', error);
  
  // Verifica se é um erro de timeout
  if (error.message && error.message.includes('Timeout')) {
    return NextResponse.json({
      success: false,
      message: 'Tempo limite excedido ao tentar acessar o site. Verifique se o site está online e tente novamente.',
      status: 'timeout',
    }, { status: 408 });
  }
  
  // Verifica se é um erro de navegação
  if (error.message && error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
    return NextResponse.json({
      success: false,
      message: 'Não foi possível resolver o nome do domínio. Verifique se a URL está correta.',
      status: 'invalid_domain',
    }, { status: 400 });
  }
  
  // Verifica se é um erro de conexão recusada
  if (error.message && error.message.includes('net::ERR_CONNECTION_REFUSED')) {
    return NextResponse.json({
      success: false,
      message: 'Conexão recusada pelo servidor. Verifique se o site está online.',
      status: 'connection_refused',
    }, { status: 503 });
  }
  
  // Verifica se é um erro de certificado SSL
  if (error.message && error.message.includes('SSL')) {
    return NextResponse.json({
      success: false,
      message: 'Erro de certificado SSL. O site pode não ser seguro.',
      status: 'ssl_error',
    }, { status: 525 });
  }
  
  // Erro genérico
  return NextResponse.json({
    success: false,
    message: 'Ocorreu um erro ao processar a solicitação: ' + (error.message || 'Erro desconhecido'),
    status: 'error',
  }, { status: 500 });
}
