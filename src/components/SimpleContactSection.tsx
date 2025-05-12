'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EnvelopeIcon, PhoneIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

type FormData = {
  email: string;
  whatsapp: string;
  message: string;
};

export default function SimpleContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormData>();

  // Função para formatar o número de WhatsApp com máscara
  const formatWhatsApp = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      // Simulando um envio de formulário
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Dados do formulário:', data);
      
      // Limpa o formulário após o envio bem-sucedido
      reset();
      setSubmitSuccess(true);
      
      // Reseta a mensagem de sucesso após 5 segundos
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 bg-[#0c0b1d]" style={{ position: 'relative', zIndex: 9999 }}>
      <div className="container mx-auto px-4 max-w-5xl" style={{ position: 'relative', zIndex: 51 }}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            <span className="text-[#7b68ee]">Entre em </span>
            <span className="text-[#a855f7]">Contato</span>
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Tem dúvidas ou precisa de ajuda? Preencha o formulário abaixo e entraremos em contato o mais breve possível.
          </p>
        </div>
        
        <div className="bg-[#13122b] border border-[#2e2d4c] rounded-xl p-8 shadow-lg" style={{ position: 'relative', zIndex: 52 }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ position: 'relative', zIndex: 53 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Campo de Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email <span className="text-[#a855f7]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    {...register('email', { 
                      required: 'Email é obrigatório',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Email inválido'
                      }
                    })}
                    className="block w-full pl-10 pr-3 py-3 bg-[#1e1d3c] border border-[#2e2d4c] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7b68ee] focus:border-transparent"
                    placeholder="seu@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              
              {/* Campo de WhatsApp */}
              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300 mb-2">
                  WhatsApp <span className="text-gray-400">(opcional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="whatsapp"
                    type="tel"
                    {...register('whatsapp')}
                    onChange={(e) => {
                      e.target.value = formatWhatsApp(e.target.value);
                    }}
                    className="block w-full pl-10 pr-3 py-3 bg-[#1e1d3c] border border-[#2e2d4c] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7b68ee] focus:border-transparent"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
            
            {/* Campo de Mensagem */}
            <div className="mb-6">
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                Mensagem <span className="text-[#a855f7]">*</span>
              </label>
              <textarea
                id="message"
                {...register('message', { required: 'Mensagem é obrigatória' })}
                rows={5}
                className="block w-full px-4 py-3 bg-[#1e1d3c] border border-[#2e2d4c] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7b68ee] focus:border-transparent"
                placeholder="Digite sua mensagem aqui..."
              />
              {errors.message && (
                <p className="mt-2 text-sm text-red-500">{errors.message.message}</p>
              )}
            </div>
            
            {/* Botão de Enviar */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gradient-to-r from-[#7b68ee] to-[#a855f7] hover:from-[#6a59d1] hover:to-[#954ae3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7b68ee] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar Mensagem
                    <PaperAirplaneIcon className="h-5 w-5 ml-2" />
                  </>
                )}
              </button>
            </div>
            
            {/* Mensagem de sucesso */}
            {submitSuccess && (
              <div className="mt-4 p-4 bg-green-900/30 border border-green-500 rounded-lg">
                <p className="text-green-400 text-center">
                  Mensagem enviada com sucesso! Entraremos em contato em breve.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
