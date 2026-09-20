import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/HomePremium';
import Result from './pages/ResultPremium';
import { PrivacyPage, TermsPage, ContactPage } from './pages/TrustPages';
import { BrandMark, ActionLink } from './components/ui';

function TopShell() {
  return (
    <div className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-[#050706]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <BrandMark />
        <div className="hidden items-center gap-6 text-sm text-[#A3AAA7] md:flex">
          <ActionLink href="/" variant="ghost">Home</ActionLink>
          <ActionLink href="/#features" variant="ghost">Features</ActionLink>
          <ActionLink href="/#how-it-works" variant="ghost">How it works</ActionLink>
          <ActionLink href="/#docs" variant="ghost">Docs</ActionLink>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-[#050706] text-[#F5F7F6]">
      <TopShell />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-6 lg:px-8">
        <div className="max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1110] p-8 text-center shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#35E59A]">404 Error</p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#F5F7F6]">Page not found</h1>
          <p className="mt-2 text-sm text-[#A3AAA7]">The route you followed is not part of the VibeCheck workspace.</p>
          <div className="mt-6 flex justify-center">
            <ActionLink href="/" variant="primary">Return Home →</ActionLink>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/result/:id" element={<Result />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;