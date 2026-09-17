import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/HomePremium';
import Result from './pages/ResultPremium';
import { PrivacyPage, TermsPage, ContactPage } from './pages/TrustPages';
import { BrandMark, ActionLink } from './components/ui';
import { ThemeProvider } from './themeProvider';

function TopShell() {
  return (
    <div className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <BrandMark />
        <div className="hidden items-center gap-6 text-sm text-zinc-600 md:flex">
          <ActionLink href="/" variant="ghost">Home</ActionLink>
          <ActionLink href="/#product" variant="ghost">Product</ActionLink>
          <ActionLink href="/#security" variant="ghost">Security</ActionLink>
          <ActionLink href="/#docs" variant="ghost">Docs</ActionLink>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <TopShell />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-6 lg:px-8">
        <div className="max-w-md rounded-[24px] border border-zinc-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">404</p>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">This page does not exist.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">The route you followed is not part of the VibeCheck workspace.</p>
          <ActionLink href="/" className="mt-6 inline-flex" variant="primary">Go home</ActionLink>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

export default App;