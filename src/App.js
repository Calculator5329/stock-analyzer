import React, { useEffect, useState } from 'react';
import { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import Header from './components/Header';
import './App.css';

// Lazy-loaded route components
const LandingSection = lazy(() => import('./components/LandingSection'));
const StockAnalyzer = lazy(() => import('./components/StockAnalyzer'));
const CompoundInterest = lazy(() => import('./components/CompoundInterest'));
const MortgageCalculator = lazy(() => import('./components/MortgageCalculator'));
const Budgeting = lazy(() => import('./components/Budgeting'));
const RetirementPlanner = lazy(() => import('./components/RetirementPlanner'));
const ExpenseAnalyzer = lazy(() => import('./components/ExpenseAnalyzer'));
const PortfolioTracker = lazy(() => import('./components/PortfolioTracker'));

function App() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = (container) => {
    console.log(container);
  };

  const particlesOptions = {
    background: {
      color: {
        value: '#0d0d0d',
      },
    },
    fpsLimit: 60,
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: 'repulse',
        },
        resize: true,
      },
      modes: {
        repulse: {
          distance: 100,
          duration: 0.4,
        },
      },
    },
    particles: {
      color: {
        value: '#ffffff',
      },
      links: {
        color: '#ffffff',
        distance: 150,
        enable: true,
        opacity: 0.1,
        width: 1,
      },
      collisions: {
        enable: true,
      },
      move: {
        direction: 'none',
        enable: true,
        outModes: {
          default: 'bounce',
        },
        random: false,
        speed: 1,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 800,
        },
        value: 80,
      },
      opacity: {
        value: 0.1,
      },
      shape: {
        type: 'circle',
      },
      size: {
        value: { min: 1, max: 5 },
      },
    },
    detectRetina: true,
  };

  if (init) {
    return (
      <Router>
        <div className="App">
          <Particles
            id="tsparticles"
            particlesLoaded={particlesLoaded}
            options={particlesOptions}
          />
          <Header />
          <main className="main-content">
            <Suspense fallback={<div className="app-loading">Loading...</div>}>
              <Routes>
                <Route path="/" element={<LandingSection />} />
                <Route path="/stock-analyzer" element={<StockAnalyzer />} />
                <Route path="/compound-interest" element={<CompoundInterest />} />
                <Route path="/mortgage-calculator" element={<MortgageCalculator />} />
                <Route path="/budgeting" element={<Budgeting />} />
                <Route path="/retirement-planner" element={<RetirementPlanner />} />
                <Route path="/expense-analyzer" element={<ExpenseAnalyzer />} />
                <Route path="/portfolio-tracker" element={<PortfolioTracker />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    );
  }

  return <></>;
}

export default App;