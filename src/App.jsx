import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AppLayout from '@/components/layout/AppLayout';
import CommandCenter from '@/pages/CommandCenter';
import Dashboard from '@/pages/Dashboard';
import Financeiro from '@/pages/Financeiro';
import Estoque from '@/pages/Estoque';
import Producao from '@/pages/Producao';
import CMV from '@/pages/CMV';
import Compras from '@/pages/Compras';
import Documentos from '@/pages/Documentos';
import Indicadores from '@/pages/Indicadores';
import BaronAI from '@/pages/BaronAI';
import Inteligencia from '@/pages/Inteligencia';
import Decisoes from '@/pages/Decisoes';
import EventBusPage from '@/pages/EventBus';
import Administracao from '@/pages/Administracao';
import CadastroMestre from '@/pages/CadastroMestre';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/producao" element={<Producao />} />
        <Route path="/cmv" element={<CMV />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/indicadores" element={<Indicadores />} />
        <Route path="/ia" element={<BaronAI />} />
        <Route path="/inteligencia" element={<Inteligencia />} />
        <Route path="/decisoes" element={<Decisoes />} />
        <Route path="/event-bus" element={<EventBusPage />} />
        <Route path="/administracao" element={<Administracao />} />
        <Route path="/cadastro" element={<CadastroMestre />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App