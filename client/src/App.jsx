import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Result from './pages/Result';

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-black text-zinc-700 mb-4">404</p>
        <p className="text-sm text-zinc-500 mb-6">This page doesn't exist.</p>
        <button
          onClick={() => navigate('/')}
          className="text-xs text-zinc-600 hover:text-zinc-400 underline"
        >
          Go home
        </button>
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;