'use client';

import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  CodeBracketIcon,
  DocumentChartBarIcon,
  CheckCircleIcon,
  SparklesIcon
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
      icon: SparklesIcon,
    },
    {
      id: 'url_submitted',
      name: 'URL enviada para análise',
      icon: CheckCircleIcon,
    },
    {
      id: 'extracting_data',
      name: 'Extraindo dados',
      icon: ArrowPathIcon,
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
      icon: CheckCircleIcon,
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
            {isPreviousStep || (isCurrentStep && step.id === 'completed') ? (
              <CheckCircleIcon className="text-green-500 w-7 h-7 flex-shrink-0 mr-4" />
            ) : isCurrentStep ? (
              <step.icon className={`text-indigo-400 w-7 h-7 flex-shrink-0 mr-4 ${isLoading ? 'animate-spin' : 'animate-pulse'}`} />
            ) : (
              <step.icon className="text-gray-400 w-7 h-7 flex-shrink-0 mr-4" />
            )}
            <p className={`text-base ${
              isPreviousStep || (isCurrentStep && step.id === 'completed')
                ? 'text-green-500' 
                : isCurrentStep 
                  ? 'text-indigo-400' 
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
