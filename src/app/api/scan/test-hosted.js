// Script para testar a detecção e consulta de tabelas do Supabase hospedado
const fs = require('fs');
const path = require('path');
const { processHostedSupabaseUrls } = require('./supabase-hosted');

// URLs de teste
const apiUrls = [
  'https://studio.rardevops.com/rest/v1',
  'https://example.supabase.co/rest/v1',
  'https://api.example.com/data'
];

// Tokens JWT de teste (substitua por tokens reais para teste)
const jwtMatches = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
];

// Tabelas já encontradas
const tableData = [];

// Executa o teste
async function runTest() {
  try {
    console.log('Iniciando teste de detecção de Supabase hospedado...');
    
    // Processa as URLs
    const updatedTableData = await processHostedSupabaseUrls(apiUrls, jwtMatches, tableData, fs, path);
    
    // Exibe o resultado
    console.log('Tabelas encontradas:', updatedTableData);
    console.log('Teste concluído!');
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

// Executa o teste
runTest();
