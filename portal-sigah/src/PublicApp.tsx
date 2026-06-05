import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import InstitutionalContext from './components/InstitutionalContext'
import TeamSection from './components/TeamSection'
import Capabilities from './components/Capabilities'
import EquipmentShowcase from './components/EquipmentShowcase'
import ProblemSection from './components/ProblemSection'
import LimitsSection from './components/LimitsSection'
import ContactSection from './components/ContactSection'
import ProductShowcase from './components/ProductShowcase'
import ScrollVideoEngine from './components/ScrollVideoEngine'
import ServicePlans from './components/ServicePlans'
import NewServices from './components/NewServices'
import MarketSection from './components/MarketSection'
import FinancialProjection from './components/FinancialProjection'
import Footer from './components/Footer'
import LoginModal from './components/LoginModal'

import { pilotInventory } from './data/pilotInventory'
import { financialData } from './data/financialData'
import { servicePlans, planFeatures } from './data/servicePlans'

export default function PublicApp() {
  const [showLogin, setShowLogin] = useState(false)
  const navigate = useNavigate()

  const openLogin  = () => navigate('/login')
  const closeLogin = () => setShowLogin(false)

  return (
    <>
      <Navbar onLoginClick={openLogin} />
      <main className="pt-16">
        <Hero onLoginClick={openLogin} />
        <InstitutionalContext inventory={pilotInventory} />
        <ProblemSection />
        <TeamSection />
        <Capabilities />
        <EquipmentShowcase />
        <LimitsSection />
        <ProductShowcase />
        <ScrollVideoEngine />
        <ServicePlans plans={servicePlans} features={planFeatures} onLoginClick={openLogin} />
        <NewServices />
        <MarketSection />
        <FinancialProjection data={financialData} />
        <ContactSection />
      </main>
      <Footer onLoginClick={openLogin} />

      {showLogin && <LoginModal onClose={closeLogin} />}
    </>
  )
}
