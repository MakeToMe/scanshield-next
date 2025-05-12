import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Definir interfaces para os tipos
interface Table {
  name: string;
  rowCount: number;
  columns: string[];
}

interface SupabaseResult {
  baseUrl: string;
  hasKey: boolean;
  tables: Table[];
  rpcs: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json({ error: 'Nome do domínio é obrigatório' }, { status: 400 });
    }

    // Caminho para o arquivo JSON do escaneamento
    const jsonFilePath = path.join(process.cwd(), 'public', `${domain}-scan.json`);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(jsonFilePath)) {
      return NextResponse.json({ 
        error: `Arquivo de escaneamento não encontrado para o domínio ${domain}` 
      }, { status: 404 });
    }

    // Ler o arquivo JSON
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    // Verificar se há URLs do Supabase
    if (!jsonData.urlsSupabase || jsonData.urlsSupabase.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhuma URL do Supabase encontrada no escaneamento' 
      }, { status: 404 });
    }

    // Usar a primeira URL do Supabase encontrada
    let supabaseUrl = jsonData.urlsSupabase[0];
    
    // Normalizar a URL (remover barra final se existir)
    if (supabaseUrl.endsWith('/')) {
      supabaseUrl = supabaseUrl.slice(0, -1);
    }
    
    // Usar o primeiro token JWT encontrado, se houver
    const token = jsonData.tokensJWT && jsonData.tokensJWT.length > 0 
      ? jsonData.tokensJWT[0] 
      : '';

    // Resultado inicial
    const result: SupabaseResult = {
      baseUrl: supabaseUrl,
      hasKey: !!token,
      tables: [],
      rpcs: []
    };

    // Se temos um token, vamos tentar obter as tabelas
    if (token) {
      try {
        // Chamada simples para obter as tabelas
        const tablesResponse = await fetch(`${supabaseUrl}/rest/v1/?select=*`, {
          method: 'GET',
          headers: {
            'apikey': token,
            'Authorization': `Bearer ${token}`
          }
        });

        if (tablesResponse.ok) {
          const tablesData = await tablesResponse.json();
          console.log('Resposta da API de tabelas:', tablesData);
          
          // Se temos dados de tabelas, vamos processá-los
          if (tablesData && typeof tablesData === 'object') {
            // Extrair nomes das tabelas
            const tableNames = Object.keys(tablesData);
            
            // Para cada tabela, obter mais informações
            const tables = [];
            for (const tableName of tableNames) {
              try {
                // Tentar obter uma linha da tabela para ver as colunas
                const tableResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=1`, {
                  method: 'GET',
                  headers: {
                    'apikey': token,
                    'Authorization': `Bearer ${token}`
                  }
                });

                if (tableResponse.ok) {
                  const rowData = await tableResponse.json();
                  
                  // Extrair informações da tabela
                  const table = {
                    name: tableName,
                    rowCount: Array.isArray(rowData) ? rowData.length : 0,
                    columns: Array.isArray(rowData) && rowData.length > 0 
                      ? Object.keys(rowData[0]) 
                      : []
                  };
                  
                  tables.push(table);
                }
              } catch (error) {
                console.error(`Erro ao obter dados da tabela ${tableName}:`, error);
              }
            }
            
            result.tables = tables;
          }
        } else {
          console.error('Erro ao obter tabelas:', await tablesResponse.text());
        }

        // Tentar obter RPCs
        try {
          const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
            method: 'GET',
            headers: {
              'apikey': token,
              'Authorization': `Bearer ${token}`
            }
          });

          if (rpcResponse.ok) {
            const rpcData = await rpcResponse.json();
            console.log('Resposta da API de RPCs:', rpcData);
            
            // Processar RPCs conforme o formato retornado
            if (Array.isArray(rpcData)) {
              result.rpcs = rpcData.map(rpc => typeof rpc === 'string' ? rpc : rpc.name || JSON.stringify(rpc));
            } else if (typeof rpcData === 'object') {
              result.rpcs = Object.keys(rpcData);
            }
          }
        } catch (error) {
          console.error('Erro ao obter RPCs:', error);
        }
      } catch (error) {
        console.error('Erro ao acessar a API do Supabase:', error);
      }
    }

    // Retornar o resultado
    return NextResponse.json({
      supabaseInfo: result,
      message: 'Informações do Supabase obtidas com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json({ 
      error: `Erro ao processar requisição: ${error.message}` 
    }, { status: 500 });
  }
}
