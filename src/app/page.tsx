import ModernHeroSection from '@/components/ModernHeroSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import SuccessCases from '@/components/SuccessCases';
// import HeroSection from '@/components/HeroSection';

export default function Home() {
  return (
    <main>
      <ModernHeroSection />
      {/* Para voltar ao design original, comente a linha acima e descomente a linha abaixo */}
      {/* <HeroSection /> */}
      
      {/* Seção de cases de sucesso */}
      <SuccessCases />
      
      {/* Seção de contato */}
      <ContactSection />
      
      {/* Rodapé */}
      <Footer />
    </main>
  );
}
