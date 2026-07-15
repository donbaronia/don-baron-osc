import { base44 } from "@/api/base44Client";
import { AppService } from "@/services";

export const HCM = {
  // Backend function calls (complex operations) — mantém via função de backend
  init: () => base44.functions.invoke('hcmEngine', { action: 'init' }).then(r => r.data),
  getDashboard: () => base44.functions.invoke('hcmEngine', { action: 'getDashboard' }).then(r => r.data),
  getEmployeeDetail: (employee_id) => base44.functions.invoke('hcmEngine', { action: 'getEmployeeDetail', employee_id }).then(r => r.data),
  aiAnalyze: (employee_id) => base44.functions.invoke('hcmEngine', { action: 'aiAnalyze', employee_id }).then(r => r.data),
  generateOnboarding: (employee_id) => base44.functions.invoke('hcmEngine', { action: 'generateOnboarding', employee_id }).then(r => r.data),
  generatePayroll: (employee_id, month, year) => base44.functions.invoke('hcmEngine', { action: 'generatePayroll', employee_id, month, year }).then(r => r.data),

  // ===== DON BARON CORE 3.0 =====
  // TODA gravação passa por AppService (validação → PersistenceEngine → RecoveryEngine
  // → read-back → EventBus → auditoria → sync). Nenhuma gravação direta em base44.entities.

  // Employee CRUD
  listEmployees: () => AppService.list("Employee", "-created_date", 200),
  getEmployee: (id) => AppService.findOne("Employee", id),
  createEmployee: (data, options = {}) => AppService.create("Employee", data, { ...options, module: "rh", validate: false }),
  updateEmployee: (id, data, options = {}) => AppService.update("Employee", id, data, { ...options, module: "rh", validate: false }),
  deleteEmployee: (id, options = {}) => AppService.delete("Employee", id, { ...options, module: "rh", validate: false }),

  // Candidates
  listCandidates: () => AppService.list("Candidate", "-created_date", 100),
  createCandidate: (data, options = {}) => AppService.create("Candidate", data, { ...options, module: "rh", validate: false }),
  updateCandidate: (id, data, options = {}) => AppService.update("Candidate", id, data, { ...options, module: "rh", validate: false }),

  // Job Openings
  listJobOpenings: () => AppService.list("JobOpening", "-created_date", 100),
  createJobOpening: (data, options = {}) => AppService.create("JobOpening", data, { ...options, module: "rh", validate: false }),
  updateJobOpening: (id, data, options = {}) => AppService.update("JobOpening", id, data, { ...options, module: "rh", validate: false }),

  // Documents
  listDocuments: () => AppService.list("EmployeeDocument", "-created_date", 200),
  listDocumentsByEmployee: (employee_id) => AppService.find("EmployeeDocument", { employee_id }),
  createDocument: (data, options = {}) => AppService.create("EmployeeDocument", data, { ...options, module: "rh", validate: false }),
  updateDocument: (id, data, options = {}) => AppService.update("EmployeeDocument", id, data, { ...options, module: "rh", validate: false }),
  deleteDocument: (id, options = {}) => AppService.delete("EmployeeDocument", id, { ...options, module: "rh", validate: false }),

  // Time Records
  listTimeRecords: () => AppService.find("TimeRecord", {}, "-date", 200),
  listTimeRecordsByEmployee: (employee_id) => AppService.find("TimeRecord", { employee_id }, "-date", 30),
  createTimeRecord: (data, options = {}) => AppService.create("TimeRecord", data, { ...options, module: "rh", validate: false }),
  updateTimeRecord: (id, data, options = {}) => AppService.update("TimeRecord", id, data, { ...options, module: "rh", validate: false }),

  // Advances — agora via AppService (read-back + recovery + evento advance_created + auditoria automáticos)
  listAdvances: () => AppService.find("EmployeeAdvance", {}, "-date", 200),
  listAdvancesByEmployee: (employee_id) => AppService.find("EmployeeAdvance", { employee_id }),
  createAdvance: async (data, options = {}) => AppService.create("EmployeeAdvance", data, { ...options, module: "rh", validate: false }),
  updateAdvance: async (id, data, options = {}) => AppService.update("EmployeeAdvance", id, data, { ...options, module: "rh", validate: false }),

  // Performance Reviews
  listReviews: () => AppService.find("PerformanceReview", {}, "-review_date", 200),
  listReviewsByEmployee: (employee_id) => AppService.find("PerformanceReview", { employee_id }, "-review_date", 200),
  createReview: (data, options = {}) => AppService.create("PerformanceReview", data, { ...options, module: "rh", validate: false }),

  // Trainings
  listTrainings: () => AppService.list("Training", "-created_date", 200),
  listTrainingsByEmployee: (employee_id) => AppService.find("Training", { employee_id }),
  createTraining: (data, options = {}) => AppService.create("Training", data, { ...options, module: "rh", validate: false }),
  updateTraining: (id, data, options = {}) => AppService.update("Training", id, data, { ...options, module: "rh", validate: false }),

  // Career Plans
  listCareerPlans: () => AppService.list("CareerPlan", "-created_date", 100),
  createCareerPlan: (data, options = {}) => AppService.create("CareerPlan", data, { ...options, module: "rh", validate: false }),
  updateCareerPlan: (id, data, options = {}) => AppService.update("CareerPlan", id, data, { ...options, module: "rh", validate: false }),

  // Recognitions
  listRecognitions: () => AppService.find("Recognition", {}, "-date", 200),
  createRecognition: (data, options = {}) => AppService.create("Recognition", data, { ...options, module: "rh", validate: false }),

  // Occurrences
  listOccurrences: () => AppService.find("Occurrence", {}, "-date", 200),
  createOccurrence: (data, options = {}) => AppService.create("Occurrence", data, { ...options, module: "rh", validate: false }),
  updateOccurrence: (id, data, options = {}) => AppService.update("Occurrence", id, data, { ...options, module: "rh", validate: false }),

  // Payroll
  listPayrolls: () => AppService.list("Payroll", "-created_date", 200),
};

export const EMPLOYEE_STATUS_CONFIG = {
  ativo: { label: 'Ativo', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  inativo: { label: 'Inativo', color: 'text-neutral-500', bg: 'bg-neutral-100', dot: 'bg-neutral-400' },
  ferias: { label: 'Férias', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  afastado: { label: 'Afastado', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  demitido: { label: 'Demitido', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
  suspendso: { label: 'Suspenso', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
};

export const DEPARTMENT_CONFIG = {
  administracao: { label: 'Administração', emoji: '🏢', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  financeiro: { label: 'Financeiro', emoji: '📊', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  compras: { label: 'Compras', emoji: '🛒', color: 'text-blue-600', bg: 'bg-blue-50' },
  estoque: { label: 'Estoque', emoji: '📦', color: 'text-amber-600', bg: 'bg-amber-50' },
  producao: { label: 'Produção', emoji: '🏭', color: 'text-orange-600', bg: 'bg-orange-50' },
  rh: { label: 'RH', emoji: '👥', color: 'text-purple-600', bg: 'bg-purple-50' },
  delivery: { label: 'Delivery', emoji: '🏍️', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  operacao: { label: 'Operação', emoji: '⚙️', color: 'text-neutral-600', bg: 'bg-neutral-100' },
  limpeza: { label: 'Limpeza', emoji: '🧹', color: 'text-teal-600', bg: 'bg-teal-50' },
  manutencao: { label: 'Manutenção', emoji: '🔧', color: 'text-slate-600', bg: 'bg-slate-50' },
  outros: { label: 'Outros', emoji: '📋', color: 'text-neutral-500', bg: 'bg-neutral-50' },
};

export const CAREER_LEVEL_CONFIG = {
  auxiliar: { label: 'Auxiliar', emoji: '1️⃣', color: 'text-neutral-600', order: 1 },
  operador: { label: 'Operador', emoji: '2️⃣', color: 'text-blue-600', order: 2 },
  lider: { label: 'Líder', emoji: '3️⃣', color: 'text-purple-600', order: 3 },
  supervisor: { label: 'Supervisor', emoji: '4️⃣', color: 'text-orange-600', order: 4 },
  gerente: { label: 'Gerente', emoji: '5️⃣', color: 'text-red-600', order: 5 },
};

export const SHIFT_CONFIG = {
  manha: { label: 'Manhã', emoji: '🌅', color: 'text-amber-600' },
  tarde: { label: 'Tarde', emoji: '☀️', color: 'text-orange-600' },
  noite: { label: 'Noite', emoji: '🌙', color: 'text-indigo-600' },
  madrugada: { label: 'Madrugada', emoji: '🌃', color: 'text-purple-600' },
  integral: { label: 'Integral', emoji: '🕐', color: 'text-blue-600' },
};

export const CONTRACT_TYPE_CONFIG = {
  clt: { label: 'CLT', color: 'text-blue-600', bg: 'bg-blue-50' },
  pj: { label: 'PJ', color: 'text-purple-600', bg: 'bg-purple-50' },
  experiencia: { label: 'Experiência', color: 'text-amber-600', bg: 'bg-amber-50' },
  temporada: { label: 'Temporada', color: 'text-cyan-600', bg: 'bg-cyan-50' },
};

export const CANDIDATE_STATUS_CONFIG = {
  novo: { label: 'Novo', color: 'text-blue-600', bg: 'bg-blue-50' },
  em_analise: { label: 'Em Análise', color: 'text-amber-600', bg: 'bg-amber-50' },
  entrevistado: { label: 'Entrevistado', color: 'text-purple-600', bg: 'bg-purple-50' },
  aprovado: { label: 'Aprovado', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  reprovado: { label: 'Reprovado', color: 'text-red-600', bg: 'bg-red-50' },
  contratado: { label: 'Contratado', color: 'text-teal-600', bg: 'bg-teal-50' },
};

export const JOB_OPENING_STATUS_CONFIG = {
  aberta: { label: 'Aberta', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  pausada: { label: 'Pausada', color: 'text-amber-600', bg: 'bg-amber-50' },
  fechada: { label: 'Fechada', color: 'text-neutral-500', bg: 'bg-neutral-100' },
};

export const DOC_TYPE_CONFIG = {
  rg: { label: 'RG', emoji: '📄' }, cpf: { label: 'CPF', emoji: '📄' },
  cnh: { label: 'CNH', emoji: '🚗' }, ctps: { label: 'CTPS', emoji: '📄' },
  aso: { label: 'ASO', emoji: '🏥' }, exame_medico: { label: 'Exame Médico', emoji: '🏥' },
  contrato: { label: 'Contrato', emoji: '📝' }, advertencia: { label: 'Advertência', emoji: '⚠️' },
  certificado: { label: 'Certificado', emoji: '🏆' }, curso: { label: 'Curso', emoji: '📚' },
  treinamento: { label: 'Treinamento', emoji: '🎓' }, epi: { label: 'EPI', emoji: '🦺' },
  comprovante_residencia: { label: 'Comprovante Residência', emoji: '🏠' }, outros: { label: 'Outros', emoji: '📎' },
};

export const DOC_STATUS_CONFIG = {
  valido: { label: 'Válido', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  vencendo: { label: 'Vencendo', color: 'text-amber-600', bg: 'bg-amber-50' },
  vencido: { label: 'Vencido', color: 'text-red-600', bg: 'bg-red-50' },
  sem_validade: { label: 'Sem Validade', color: 'text-neutral-500', bg: 'bg-neutral-100' },
};

export const TIME_RECORD_STATUS_CONFIG = {
  normal: { label: 'Normal', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  atraso: { label: 'Atraso', color: 'text-red-600', bg: 'bg-red-50' },
  saida_antecipada: { label: 'Saída Antecipada', color: 'text-orange-600', bg: 'bg-orange-50' },
  falta: { label: 'Falta', color: 'text-red-600', bg: 'bg-red-50' },
  folga: { label: 'Folga', color: 'text-blue-600', bg: 'bg-blue-50' },
  ferias: { label: 'Férias', color: 'text-purple-600', bg: 'bg-purple-50' },
};

export const TIME_RECORD_TYPE_CONFIG = {
  manual: { label: 'Manual', emoji: '✍️' }, pin: { label: 'PIN', emoji: '🔢' },
  qr: { label: 'QR Code', emoji: '📱' }, biometria: { label: 'Biometria', emoji: ' fingerprint' },
};

export const ADVANCE_TYPE_CONFIG = {
  vale_semanal: { label: 'Vale Semanal', emoji: '💵', color: 'text-blue-600', bg: 'bg-blue-50' },
  vale_transporte: { label: 'Vale Transporte', emoji: '🚌', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  vale_alimentacao: { label: 'Vale Alimentação', emoji: '🍔', color: 'text-orange-600', bg: 'bg-orange-50' },
  adiantamento: { label: 'Adiantamento', emoji: '💰', color: 'text-amber-600', bg: 'bg-amber-50' },
  emprestimo: { label: 'Empréstimo', emoji: '🏦', color: 'text-purple-600', bg: 'bg-purple-50' },
  desconto: { label: 'Desconto', emoji: '➖', color: 'text-red-600', bg: 'bg-red-50' },
};

export const ADVANCE_STATUS_CONFIG = {
  ativo: { label: 'Ativo', color: 'text-blue-600', bg: 'bg-blue-50' },
  quitado: { label: 'Quitado', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  cancelado: { label: 'Cancelado', color: 'text-neutral-500', bg: 'bg-neutral-100' },
};

export const TRAINING_TYPE_CONFIG = {
  interno: { label: 'Interno', emoji: '🏠', color: 'text-blue-600', bg: 'bg-blue-50' },
  externo: { label: 'Externo', emoji: '🌐', color: 'text-purple-600', bg: 'bg-purple-50' },
  video: { label: 'Vídeo', emoji: '📹', color: 'text-red-600', bg: 'bg-red-50' },
  documento: { label: 'Documento', emoji: '📄', color: 'text-amber-600', bg: 'bg-amber-50' },
  prova: { label: 'Prova', emoji: '📝', color: 'text-orange-600', bg: 'bg-orange-50' },
  onboarding: { label: 'Onboarding', emoji: '🚀', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export const TRAINING_STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'text-neutral-600', bg: 'bg-neutral-100' },
  em_andamento: { label: 'Em Andamento', color: 'text-blue-600', bg: 'bg-blue-50' },
  concluido: { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  reprovado: { label: 'Reprovado', color: 'text-red-600', bg: 'bg-red-50' },
  expirado: { label: 'Expirado', color: 'text-orange-600', bg: 'bg-orange-50' },
};

export const RECOGNITION_TYPE_CONFIG = {
  elogio: { label: 'Elogio', emoji: '💬', color: 'text-blue-600', bg: 'bg-blue-50' },
  premiacao: { label: 'Premiação', emoji: '🏆', color: 'text-amber-600', bg: 'bg-amber-50' },
  destaque: { label: 'Destaque', emoji: '⭐', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  meta: { label: 'Meta Atingida', emoji: '🎯', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  aniversario: { label: 'Aniversário', emoji: '🎂', color: 'text-pink-600', bg: 'bg-pink-50' },
};

export const OCCURRENCE_TYPE_CONFIG = {
  advertencia: { label: 'Advertência', emoji: '⚠️', color: 'text-amber-600', bg: 'bg-amber-50' },
  suspensao: { label: 'Suspensão', emoji: '🚫', color: 'text-red-600', bg: 'bg-red-50' },
  acidente: { label: 'Acidente', emoji: '🩹', color: 'text-red-600', bg: 'bg-red-50' },
  conflito: { label: 'Conflito', emoji: '⚡', color: 'text-orange-600', bg: 'bg-orange-50' },
  feedback: { label: 'Feedback', emoji: '💬', color: 'text-blue-600', bg: 'bg-blue-50' },
  faltas: { label: 'Faltas', emoji: '❌', color: 'text-red-600', bg: 'bg-red-50' },
  atrasos: { label: 'Atrasos', emoji: '⏰', color: 'text-orange-600', bg: 'bg-orange-50' },
  outros: { label: 'Outros', emoji: '📋', color: 'text-neutral-600', bg: 'bg-neutral-100' },
};

export const OCCURRENCE_SEVERITY_CONFIG = {
  baixa: { label: 'Baixa', color: 'text-blue-600', bg: 'bg-blue-50' },
  media: { label: 'Média', color: 'text-amber-600', bg: 'bg-amber-50' },
  alta: { label: 'Alta', color: 'text-orange-600', bg: 'bg-orange-50' },
  critica: { label: 'Crítica', color: 'text-red-600', bg: 'bg-red-50' },
};

export const REVIEW_CRITERIA = [
  { key: 'pontualidade', label: 'Pontualidade' },
  { key: 'produtividade', label: 'Produtividade' },
  { key: 'qualidade', label: 'Qualidade' },
  { key: 'comprometimento', label: 'Comprometimento' },
  { key: 'organizacao', label: 'Organização' },
  { key: 'trabalho_equipe', label: 'Trabalho em Equipe' },
  { key: 'relacionamento', label: 'Relacionamento' },
  { key: 'lideranca', label: 'Liderança' },
];

export const CANDIDATE_SOURCE_CONFIG = {
  indicacao: { label: 'Indicação', emoji: '🤝' },
  online: { label: 'Online', emoji: '🌐' },
  walk_in: { label: 'Porta', emoji: '🚪' },
  parceria: { label: 'Parceria', emoji: '🤝' },
  interna: { label: 'Interna', emoji: '🔄' },
};

export const RISK_CONFIG = {
  baixo: { label: 'Baixo', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  medio: { label: 'Médio', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  alto: { label: 'Alto', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
};