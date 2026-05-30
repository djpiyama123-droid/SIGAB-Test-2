import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import InstitutionalContext from './components/InstitutionalContext'
import ScrollVideoEngine from './components/ScrollVideoEngine'
import ServicePlans from './components/ServicePlans'
import FinancialProjection from './components/FinancialProjection'
import MasterPlanTimeline from './components/MasterPlanTimeline'
import Footer from './components/Footer'
import LoginModal from './components/LoginModal'

import { pilotInventory } from './data/pilotInventory'
import { financialData } from './data/financialData'
import { servicePlans, planFeatures } from './data/servicePlans'
import { masterPlanMilestones } from './data/masterPlanMilestones'

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
        <ScrollVideoEngine />
        <ServicePlans plans={servicePlans} features={planFeatures} onLoginClick={openLogin} />
        <FinancialProjection data={financialData} />
        <MasterPlanTimeline milestones={masterPlanMilestones} />
      </main>
      <Footer onLoginClick={openLogin} />

      {showLogin && <LoginModal onClose={closeLogin} />}
    </>
  )
}
