'use client';

import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  CodeBracketIcon,
  DocumentChartBarIcon,
  CheckCircleIcon,
  SparklesIcon,
  GlobeAltIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

export type ScanStep = 
  | 'initial'
  | 'url_submitted'
  | 'extracting_data'
  | 'searching_vulnerabilities'
  | 'analyzing_apis'
  | 'generating_diagnosis'
  | 'completed';

interface ScanProgressStepsProps {
  currentStep: ScanStep;
  isLoading: boolean;
}

const ScanProgressSteps: React.FC<ScanProgressStepsProps> = ({ currentStep, isLoading }) => {
  // Define os passos e seus ícones
  const steps = [
    {
      id: 'initial',
      name: 'Informe a URL e clique em escanear',
      icon: GlobeAltIcon,
    },
    {
      id: 'url_submitted',
      name: 'URL enviada para análise',
      icon: GlobeAltIcon,
    },
    {
      id: 'extracting_data',
      name: 'Extraindo dados',
      icon: ServerIcon,
    },
    {
      id: 'searching_vulnerabilities',
      name: 'Procurando vulnerabilidades',
      icon: ShieldCheckIcon,
    },
    {
      id: 'analyzing_apis',
      name: 'Analisando APIs',
      icon: CodeBracketIcon,
    },
    {
      id: 'generating_diagnosis',
      name: 'Realizando diagnóstico',
      icon: DocumentChartBarIcon,
    },
    {
      id: 'completed',
      name: 'Diagnóstico realizado',
      icon: SparklesIcon,
    }
  ];

  // Determina qual passo mostrar
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  
  // Se estiver no estado inicial, mostra apenas o primeiro passo
  if (currentStep === 'initial') {
    const initialStep = steps[0];
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-start">
          <initialStep.icon className="text-indigo-400 w-7 h-7 flex-shrink-0 mr-4" />
          <p className="text-gray-200 text-base">{initialStep.name}</p>
        </div>
      </div>
    );
  }

  // Determina quais passos mostrar com base no progresso atual
  const visibleSteps = steps.filter((step, index) => {
    // Sempre mostra o passo inicial
    if (index === 0) return false; // Não mostra o passo inicial depois de começar
    
    // Mostra o passo atual e todos os passos anteriores
    return index <= currentStepIndex;
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      {visibleSteps.map((step, index) => {
        const isCurrentStep = step.id === currentStep;
        const isPreviousStep = steps.findIndex(s => s.id === step.id) < currentStepIndex;
        
        return (
          <div key={step.id} className="flex items-start">
            {(isCurrentStep && step.id !== 'completed') ? (
              isLoading ? (
                <ArrowPathIcon className="text-white w-7 h-7 flex-shrink-0 mr-4 animate-spin" />
              ) : (
                <step.icon className="text-white w-7 h-7 flex-shrink-0 mr-4 animate-pulse" />
              )
            ) : isPreviousStep || step.id === 'completed' ? (
              <step.icon className="text-green-500 w-7 h-7 flex-shrink-0 mr-4" />
            ) : (
              <step.icon className="text-gray-400 w-7 h-7 flex-shrink-0 mr-4" />
            )}
            <p className={`text-base ${
              (isCurrentStep && step.id !== 'completed')
                ? 'text-white'
                : isPreviousStep || step.id === 'completed'
                  ? 'text-green-500' 
                  : 'text-gray-400'
            }`}>
              {step.name}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default ScanProgressSteps;
