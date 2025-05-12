import React from 'react';
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

interface ScanStepsProps {
  currentStep: ScanStep;
}

const ScanSteps: React.FC<ScanStepsProps> = ({ currentStep }) => {
  const steps = [
    {
      id: 'url_submitted',
      name: 'URL enviada para análise',
      icon: DocumentTextIcon,
      status: getStepStatus('url_submitted', currentStep)
    },
    {
      id: 'extracting_data',
      name: 'Extraindo dados',
      icon: ArrowPathIcon,
      status: getStepStatus('extracting_data', currentStep)
    },
    {
      id: 'searching_vulnerabilities',
      name: 'Procurando vulnerabilidades',
      icon: ShieldCheckIcon,
      status: getStepStatus('searching_vulnerabilities', currentStep)
    },
    {
      id: 'analyzing_apis',
      name: 'Analisando APIs',
      icon: CodeBracketIcon,
      status: getStepStatus('analyzing_apis', currentStep)
    },
    {
      id: 'generating_diagnosis',
      name: 'Realizando diagnóstico',
      icon: DocumentChartBarIcon,
      status: getStepStatus('generating_diagnosis', currentStep)
    },
    {
      id: 'completed',
      name: 'Diagnóstico realizado',
      icon: CheckCircleIcon,
      status: getStepStatus('completed', currentStep)
    }
  ];

  // Determina quais etapas devem ser exibidas com base no estado atual
  const visibleSteps = steps.filter(step => {
    if (currentStep === 'initial') {
      return false; // Não mostra nenhuma etapa no estado inicial
    }
    
    const stepIndex = steps.findIndex(s => s.id === step.id);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    // Se a etapa atual for 'completed', mostra todas as etapas
    if (currentStep === 'completed') {
      return true;
    }
    
    // Mostra apenas a etapa atual e as já concluídas
    return stepIndex <= currentIndex;
  });

  if (currentStep === 'initial' || visibleSteps.length === 0) {
    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center text-purple-400">
          <SparklesIcon className="h-5 w-5 mr-2" />
          <span>Informe a URL e clique em escanear</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {visibleSteps.map((step) => (
        <div key={step.id} className="flex items-center transition-all duration-300 ease-in-out">
          {step.status === 'complete' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
          ) : step.status === 'current' ? (
            <step.icon className="h-5 w-5 text-purple-400 mr-2 animate-pulse" />
          ) : (
            <step.icon className="h-5 w-5 text-gray-400 mr-2" />
          )}
          <span className={
            step.status === 'complete' 
              ? 'text-green-500' 
              : step.status === 'current' 
                ? 'text-purple-400' 
                : 'text-gray-400'
          }>
            {step.name}
          </span>
        </div>
      ))}
    </div>
  );
};

// Função auxiliar para determinar o status de cada etapa
function getStepStatus(stepId: string, currentStep: ScanStep): 'complete' | 'current' | 'upcoming' {
  const stepOrder: ScanStep[] = [
    'initial',
    'url_submitted',
    'extracting_data',
    'searching_vulnerabilities',
    'analyzing_apis',
    'generating_diagnosis',
    'completed'
  ];
  
  const stepIndex = stepOrder.indexOf(stepId as ScanStep);
  const currentIndex = stepOrder.indexOf(currentStep);
  
  if (stepIndex < currentIndex) {
    return 'complete';
  } else if (stepIndex === currentIndex) {
    return 'current';
  } else {
    return 'upcoming';
  }
}

export default ScanSteps;
