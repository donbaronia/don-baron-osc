import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import CommandCenter from '@/pages/CommandCenter';
import Dashboard from '@/pages/Dashboard';
import Financeiro from '@/pages/Financeiro';
import Estoque from '@/pages/Estoque';
import Producao from '@/pages/Producao';
import CMV from '@/pages/CMV';
import Compras from '@/pages/Compras';
import Documentos from '@/pages/Documentos';
import DocumentosFinanceiros from '@/pages/DocumentosFinanceiros';
import ProcessamentoDocumentos from '@/pages/ProcessamentoDocumentos';
import Indicadores from '@/pages/Indicadores';
import BaronAI from '@/pages/BaronAI';
import Inteligencia from '@/pages/Inteligencia';
import Decisoes from '@/pages/Decisoes';
import EventBusPage from '@/pages/EventBus';
import Administracao from '@/pages/Administracao';
import CadastroMestre from '@/pages/CadastroMestre';
import Integracoes from '@/pages/Integracoes';
import Kernel from '@/pages/Kernel';
import BaronBrain from '@/pages/BaronBrain';
import FuncionariosDigitais from '@/pages/FuncionariosDigitais';
import MissionControl from '@/pages/MissionControl';
import HumanCapital from '@/pages/HumanCapital';
import PeopleAnalytics from '@/pages/PeopleAnalytics';
import EnterprisePlanning from '@/pages/EnterprisePlanning';
import WhatsAppAssistant from '@/pages/WhatsAppAssistant';
import WhatsAppConnector from '@/pages/WhatsAppConnector';
import Motoboys from '@/pages/Motoboys';
import Relatorios from '@/pages/Relatorios';
import BaronHistorico from '@/pages/BaronHistorico';
import BDSErrorBoundary from '@/components/bds/BDSErrorBoundary';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <BDSErrorBoundary>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<CommandCenter />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/producao" element={<Producao />} />
        <Route path="/cmv" element={<CMV />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/documentos-financeiros" element={<DocumentosFinanceiros />} />
        <Route path="/processamento" element={<ProcessamentoDocumentos />} />
        <Route path="/indicadores" element={<Indicadores />} />
        <Route path="/ia" element={<BaronAI />} />
        <Route path="/inteligencia" element={<Inteligencia />} />
        <Route path="/decisoes" element={<Decisoes />} />
        <Route path="/event-bus" element={<EventBusPage />} />
        <Route path="/administracao" element={<Administracao />} />
        <Route path="/cadastro" element={<CadastroMestre />} />
        <Route path="/integracoes" element={<Integracoes />} />
        <Route path="/kernel" element={<Kernel />} />
        <Route path="/brain" element={<BaronBrain />} />
        <Route path="/workforce" element={<FuncionariosDigitais />} />
        <Route path="/missions" element={<MissionControl />} />
        <Route path="/rh" element={<HumanCapital />} />
        <Route path="/people-analytics" element={<PeopleAnalytics />} />
        <Route path="/planejamento" element={<EnterprisePlanning />} />
        <Route path="/whatsapp" element={<WhatsAppAssistant />} />
        <Route path="/whatsapp-connector" element={<WhatsAppConnector />} />
        <Route path="/motoboys" element={<Motoboys />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/baron-historico" element={<BaronHistorico />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </BDSErrorBoundary>
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