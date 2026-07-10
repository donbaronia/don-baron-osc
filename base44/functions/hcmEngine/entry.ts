import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function nowStr() { return new Date().toISOString(); }

async function safeList(sr, entityName, limit, sort) {
  try { return await sr.entities[entityName].list(sort || '-created_date', limit || 100); }
  catch (e) { return []; }
}

async function safeFilter(sr, entityName, query, sort, limit) {
  try { return await sr.entities[entityName].filter(query, sort, limit || 100); }
  catch (e) { return []; }
}

function calcDaysToExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(expiryDate); exp.setHours(0,0,0,0);
  return Math.round((exp - today) / (1000 * 60 * 60 * 24));
}

function docStatus(expiryDate) {
  if (!expiryDate) return 'sem_validade';
  const days = calcDaysToExpiry(expiryDate);
  if (days < 0) return 'vencido';
  if (days <= 30) return 'vencendo';
  return 'valido';
}

const SAMPLE_EMPLOYEES = [
  { full_name: 'João Silva', short_name: 'João', cpf: '123.456.789-00', position: 'Gerente Geral', department: 'administracao', shift: 'integral', salary: 6500, salary_type: 'mensal', contract_type: 'clt', career_level: 'gerente', hire_date: dateStr(-1095), phone: '(85) 99999-1000', email: 'joao@donbaron.com', pix_key: '123.456.789-00', pix_type: 'cpf', bank_name: 'Banco do Brasil', bank_agency: '1234', bank_account: '12345-6', city: 'Fortaleza', state: 'CE', status: 'ativo', schedule_type: 'fixo', work_schedule: '08:00-18:00', work_days: ['seg','ter','qua','qui','sex'], transport_vale: 200, food_vale: 400, uniform_delivered: true, badge_delivered: true, epi_delivered: true, onboarding_completed: true, onboarding_completed_at: nowStr(), bank_hours_balance: 240, vacation_days_remaining: 30 },
  { full_name: 'Maria Santos', short_name: 'Maria', cpf: '234.567.890-11', position: 'Supervisora de Produção', department: 'producao', shift: 'integral', salary: 4200, salary_type: 'mensal', contract_type: 'clt', career_level: 'supervisor', hire_date: dateStr(-730), phone: '(85) 98888-2000', email: 'maria@donbaron.com', pix_key: '234.567.890-11', pix_type: 'cpf', city: 'Fortaleza', state: 'CE', status: 'ativo', schedule_type: 'escala', work_schedule: '06:00-16:00', work_days: ['seg','ter','qua','qui','sex','sab'], transport_vale: 150, food_vale: 350, uniform_delivered: true, badge_delivered: true, epi_delivered: true, onboarding_completed: true, onboarding_completed_at: nowStr(), bank_hours_balance: 180, vacation_days_remaining: 30 },
  { full_name: 'Carlos Pereira', short_name: 'Carlos', cpf: '345.678.901-22', position: 'Líder de Produção', department: 'producao', shift: 'tarde', salary: 3200, salary_type: 'mensal', contract_type: 'clt', career_level: 'lider', hire_date: dateStr(-540), phone: '(85) 97777-3000', email: 'carlos@donbaron.com', pix_key: '345.678.901-22', pix_type: 'cpf', city: 'Fortaleza', state: 'CE', status: 'ativo', schedule_type: 'escala', work_schedule: '14:00-23:00', work_days: ['seg','ter','qua','qui','sex','sab'], transport_vale: 150, food_vale: 300, uniform_delivered: true, badge_delivered: true, epi_delivered: true, onboarding_completed: true, onboarding_completed_at: nowStr(), bank_hours_balance: 90, vacation_days_remaining: 30 },
  { full_name: 'Ana Oliveira', short_name: 'Ana', cpf: '456.789.012-33', birth_date: '1995-03-15', position: 'Operadora de Produção', department: 'producao', shift: 'manha', salary: 2200, salary_type: 'mensal', contract_type: 'clt', career_level: 'operador', hire_date: dateStr(-365), phone: '(85) 96666-4000', email: 'ana@donbaron.com', pix_key: '456.789.012-33', pix_type: 'cpf', city: 'Fortaleza', state: 'CE', status: 'ativo', schedule_type: 'escala', work_schedule: '06:00-14:00', work_days: ['seg','ter','qua','qui','sex','sab'], transport_vale: 120, food_vale: 250, uniform_delivered: true, badge_delivered: true, onboarding_completed: true, onboarding_completed_at: nowStr(), bank_hours_balance: 60, vacation_days_remaining: 30 },
  { full_name: 'Pedro Costa', short_name: 'Pedro', cpf: '567.890.123-44', position: 'Auxiliar de Estoque', department: 'estoque', shift: 'integral', salary: 1800, salary_type: 'mensal', contract_type: 'experiencia', career_level: 'auxiliar', hire_date: dateStr(-90), experience_end_date: dateStr(0), phone: '(85) 95555-5000', email: 'pedro@donbaron.com', pix_key: '567.890.123-44', pix_type: 'cpf', city: 'Fortaleza', state: 'CE', status: 'ativo', schedule_type: 'fixo', work_schedule: '08:00-17:00', work_days: ['seg','ter','qua','qui','sex'], transport_vale: 100, food_vale: 200, uniform_delivered: true, badge_delivered: true, onboarding_completed: false, bank_hours_balance: -30, vacation_days_remaining: 30 },
  { full_name: 'Fernanda Lima', short_name: 'Fernanda', cpf: '678.901.234-55', position: 'Analista Financeiro', department: 'financeiro', shift: 'integral', salary: 3800, salary_type: 'mensal', contract_type: 'clt', career_level: 'operador', hire_date: dateStr(-450), phone: '(85) 94444-6000', email: 'fernanda@donbaron.com', pix_key: '678.901.234-55', pix_type: 'cpf', city: 'Fortaleza', state: 'CE', status: 'ativo', schedule_type: 'fixo', work_schedule: '08:00-17:00', work_days: ['seg','ter','qua','qui','sex'], transport_vale: 150, food_vale: 300, uniform_delivered: true, badge_delivered: true, onboarding_completed: true, onboarding_completed_at: nowStr(), bank_hours_balance: 120, vacation_days_remaining: 30 },
  { full_name: 'Roberto Souza', short_name: 'Roberto', cpf: '789.012.345-66', position: 'Motoboy', department: 'delivery', shift: 'noite', salary: 2000, salary_type: 'mensal', contract_type: 'clt', career_level: 'operador', hire_date: dateStr(-300), phone: '(85) 93333-7000', email: 'roberto@donbaron.com', pix_key: '789.012.345-66', pix_type: 'cpf', city: 'Fortaleza', state: 'CE', status: 'ativo', schedule_type: 'escala', work_schedule: '18:00-23:00', work_days: ['seg','ter','qua','qui','sex','sab','dom'], transport_vale: 200, food_vale: 250, uniform_delivered: true, badge_delivered: true, epi_delivered: true, onboarding_completed: true, onboarding_completed_at: nowStr(), bank_hours_balance: 0, vacation_days_remaining: 30 },
  { full_name: 'Marcos Alves', short_name: 'Marcos', cpf: '890.123.456-77', position: 'Operador de Produção', department: 'producao', shift: 'noite', salary: 2200, salary_type: 'mensal', contract_type: 'clt', career_level: 'operador', hire_date: dateStr(-200), phone: '(85) 92222-8000', email: 'marcos@donbaron.com', pix_key: '890.123.456-77', pix_type: 'cpf', city: 'Fortaleza', state: 'CE', status: 'ativo', schedule_type: 'escala', work_schedule: '18:00-02:00', work_days: ['seg','ter','qua','qui','sex','sab'], transport_vale: 120, food_vale: 250, uniform_delivered: true, badge_delivered: true, onboarding_completed: true, onboarding_completed_at: nowStr(), bank_hours_balance: -60, vacation_days_remaining: 30 },
  { full_name: 'Juliana Ferreira', short_name: 'Juliana', cpf: '901.234.567-88', position: 'Analista de RH', department: 'rh', shift: 'integral', salary: 3500, salary_type: 'mensal', contract_type: 'clt', career_level: 'operador', hire_date: dateStr(-600), phone: '(85) 91111-9000', email: 'juliana@donbaron.com', pix_key: '901.234.567-88', pix_type: 'cpf', city: 'Fortaleza', state: 'CE', status: 'ferias', schedule_type: 'fixo', work_schedule: '08:00-17:00', work_days: ['seg','ter','qua','qui','sex'], transport_vale: 150, food_vale: 300, vacation_start_date: dateStr(-5), vacation_end_date: dateStr(25), vacation_days_remaining: 15, uniform_delivered: true, badge_delivered: true, onboarding_completed: true, bank_hours_balance: 30 },
  { full_name: 'Patrícia Gomes', short_name: 'Patrícia', cpf: '012.345.678-99', position: 'Ex-Operadora', department: 'producao', shift: 'manha', salary: 2200, salary_type: 'mensal', contract_type: 'clt', career_level: 'operador', hire_date: dateStr(-400), termination_date: dateStr(-30), termination_reason: 'Pedido de demissão', phone: '(85) 90000-0001', email: 'patricia@email.com', pix_key: '012.345.678-99', pix_type: 'cpf', city: 'Fortaleza', state: 'CE', status: 'demitido', schedule_type: 'fixo', work_schedule: '06:00-14:00', work_days: ['seg','ter','qua','qui','sex','sab'], transport_vale: 100, food_vale: 250 },
];

const SAMPLE_CANDIDATES = [
  { name: 'Lucas Mendes', phone: '(85) 98765-4321', email: 'lucas@email.com', position_applied: 'Operador de Produção', department: 'producao', source: 'indicacao', source_detail: 'Indicado por Maria Santos', status: 'entrevistado', interview_date: nowStr(), rating: 4, notes: 'Boa experiência anterior' },
  { name: 'Beatriz Rocha', phone: '(85) 97654-3210', email: 'beatriz@email.com', position_applied: 'Auxiliar de Estoque', department: 'estoque', source: 'online', status: 'novo', rating: 0 },
  { name: 'Rafael Torres', phone: '(85) 96543-2109', email: 'rafael@email.com', position_applied: 'Motoboy', department: 'delivery', source: 'walk_in', status: 'aprovado', rating: 5, interview_notes: 'Excelente perfil, disponibilidade imediata', hire_reason: 'Perfil alinhado e disponibilidade' },
  { name: 'Camila Dias', phone: '(85) 95432-1098', email: 'camila@email.com', position_applied: 'Operadora de Produção', department: 'producao', source: 'online', status: 'reprovado', rating: 2, rejection_reason: 'Falta de experiência na área' },
];

const SAMPLE_JOB_OPENINGS = [
  { title: 'Operador de Produção', department: 'producao', position: 'Operador', career_level: 'operador', description: 'Operador para linha de produção de hambúrgueres', requirements: ['Experiência em produção de alimentos', 'Disponibilidade para escala 6x1'], salary_min: 2000, salary_max: 2500, contract_type: 'clt', shift: 'manha', openings: 2, filled: 0, candidate_count: 3, status: 'aberta', publication_date: dateStr(-10) },
  { title: 'Motoboy', department: 'delivery', position: 'Motoboy', career_level: 'operador', description: 'Entregador para delivery noturno', requirements: ['CNH A', 'Moto própria', 'Disponibilidade noturna'], salary_min: 1800, salary_max: 2300, contract_type: 'clt', shift: 'noite', openings: 3, filled: 0, candidate_count: 2, status: 'aberta', publication_date: dateStr(-5) },
  { title: 'Auxiliar de Estoque', department: 'estoque', position: 'Auxiliar', career_level: 'auxiliar', description: 'Auxiliar para controle e organização de estoque', requirements: ['Organização', 'Conhecimento básico de estoque'], salary_min: 1500, salary_max: 1900, contract_type: 'experiencia', shift: 'integral', openings: 1, filled: 0, candidate_count: 1, status: 'pausada', publication_date: dateStr(-20) },
];

async function handleInit(sr, user) {
  const existing = await safeList(sr, 'Employee', 5);
  if (existing.length > 0) return Response.json({ initialized: false, count: existing.length, message: 'HCM already seeded' });

  const companyId = user?.company_id || '';
  let counts = { employees: 0, candidates: 0, job_openings: 0, documents: 0, time_records: 0, advances: 0, reviews: 0, trainings: 0, career_plans: 0, recognitions: 0, occurrences: 0 };

  // Employees
  const empMap = {};
  for (const emp of SAMPLE_EMPLOYEES) {
    const created = await sr.entities.Employee.create({ ...emp, company_id: companyId, version: 1 });
    empMap[emp.short_name] = created;
    counts.employees++;
  }

  // Candidates
  for (const c of SAMPLE_CANDIDATES) {
    await sr.entities.Candidate.create({ ...c, company_id: companyId, version: 1 });
    counts.candidates++;
  }

  // Job Openings
  for (const j of SAMPLE_JOB_OPENINGS) {
    await sr.entities.JobOpening.create({ ...j, company_id: companyId, version: 1 });
    counts.job_openings++;
  }

  // Documents with expiry
  const docData = [
    { emp: 'Marcos', doc_type: 'aso', doc_name: 'ASO Admissional', issue_date: dateStr(-200), expiry_date: dateStr(15) },
    { emp: 'Roberto', doc_type: 'cnh', doc_name: 'CNH Categoria A', issue_date: dateStr(-365), expiry_date: dateStr(-5) },
    { emp: 'Ana', doc_type: 'aso', doc_name: 'ASO Admissional', issue_date: dateStr(-365), expiry_date: dateStr(0) },
    { emp: 'João', doc_type: 'contrato', doc_name: 'Contrato de Trabalho', issue_date: dateStr(-1095) },
    { emp: 'Pedro', doc_type: 'ctps', doc_name: 'Carteira de Trabalho', issue_date: dateStr(-90) },
    { emp: 'Carlos', doc_type: 'treinamento', doc_name: 'Treinamento de Segurança', issue_date: dateStr(-180), expiry_date: dateStr(60) },
  ];
  for (const d of docData) {
    const emp = empMap[d.emp]; if (!emp) continue;
    const status = docStatus(d.expiry_date);
    await sr.entities.EmployeeDocument.create({ employee_id: emp.id, employee_name: emp.full_name, doc_type: d.doc_type, doc_name: d.doc_name, issue_date: d.issue_date, expiry_date: d.expiry_date, status, days_to_expiry: calcDaysToExpiry(d.expiry_date) || 0, uploaded_by: 'Sistema', company_id: companyId, version: 1 });
    counts.documents++;
  }

  // Time records (today)
  const today = dateStr(0);
  for (const [name, emp] of Object.entries(empMap)) {
    if (emp.status !== 'ativo' && emp.status !== 'ferias') continue;
    const isLate = name === 'Pedro';
    await sr.entities.TimeRecord.create({ employee_id: emp.id, employee_name: emp.full_name, date: today, clock_in: isLate ? '08:25' : '08:02', clock_out: '', type: 'manual', late_minutes: isLate ? 25 : 0, status: isLate ? 'atraso' : 'normal', company_id: companyId, version: 1 });
    counts.time_records++;
  }

  // Advances
  const advData = [
    { emp: 'Pedro', type: 'vale_semanal', amount: 100, installments: 1, description: 'Vale semanal', date: dateStr(-2), status: 'ativo' },
    { emp: 'João', type: 'emprestimo', amount: 3000, installments: 6, installment_amount: 500, installments_paid: 2, balance: 2000, description: 'Empréstimo pessoal', date: dateStr(-60), status: 'ativo' },
    { emp: 'Roberto', type: 'vale_transporte', amount: 200, installments: 1, description: 'Vale transporte mensal', date: dateStr(-5), status: 'ativo' },
    { emp: 'Ana', type: 'adiantamento', amount: 500, installments: 2, installment_amount: 250, installments_paid: 0, balance: 500, description: 'Adiantamento salarial', date: dateStr(-1), status: 'ativo' },
  ];
  for (const a of advData) {
    const emp = empMap[a.emp]; if (!emp) continue;
    const balance = a.balance !== undefined ? a.balance : a.amount;
    await sr.entities.EmployeeAdvance.create({ employee_id: emp.id, employee_name: emp.full_name, type: a.type, amount: a.amount, installments: a.installments || 1, installment_amount: a.installment_amount || a.amount, installments_paid: a.installments_paid || 0, balance, description: a.description, date: a.date, status: a.status, company_id: companyId, version: 1 });
    counts.advances++;
  }

  // Performance reviews
  const revData = [
    { emp: 'João', scores: { pontualidade: 9, produtividade: 9, qualidade: 10, comprometimento: 10, organizacao: 9, trabalho_equipe: 9, relacionamento: 10, lideranca: 10 }, comments: 'Excelente gestão e liderança', strengths: ['Liderança', 'Comprometimento'], improvements: ['Delegar mais tarefas'] },
    { emp: 'Carlos', scores: { pontualidade: 8, produtividade: 8, qualidade: 8, comprometimento: 8, organizacao: 7, trabalho_equipe: 9, relacionamento: 8, lideranca: 7 }, comments: 'Bom desempenho geral', strengths: ['Trabalho em equipe'], improvements: ['Organização', 'Liderança'] },
    { emp: 'Pedro', scores: { pontualidade: 5, produtividade: 6, qualidade: 7, comprometimento: 6, organizacao: 6, trabalho_equipe: 7, relacionamento: 7, lideranca: 4 }, comments: 'Precisa melhorar pontualidade e comprometimento', strengths: ['Relacionamento'], improvements: ['Pontualidade', 'Comprometimento', 'Liderança'], development_plan: 'Plano de desenvolvimento focado em pontualidade e responsabilidade' },
    { emp: 'Ana', scores: { pontualidade: 9, produtividade: 8, qualidade: 9, comprometimento: 9, organizacao: 8, trabalho_equipe: 9, relacionamento: 9, lideranca: 6 }, comments: 'Ótima profissional, potencial para liderança', strengths: ['Qualidade', 'Trabalho em equipe'], improvements: ['Liderança'], development_plan: 'Preparar para posição de líder com treinamentos de gestão' },
  ];
  for (const r of revData) {
    const emp = empMap[r.emp]; if (!emp) continue;
    const avg = Object.values(r.scores).reduce((a, b) => a + b, 0) / Object.values(r.scores).length;
    await sr.entities.PerformanceReview.create({ employee_id: emp.id, employee_name: emp.full_name, review_date: dateStr(-15), reviewer_name: 'João Silva', period: '2026-H1', scores: r.scores, average_score: Math.round(avg * 10) / 10, comments: r.comments, development_plan: r.development_plan || '', strengths: r.strengths || [], improvements: r.improvements || [], status: 'concluida', company_id: companyId, version: 1 });
    counts.reviews++;
  }

  // Trainings
  const trainData = [
    { emp: 'Ana', title: 'Higiene e Segurança Alimentar', type: 'interno', category: 'Segurança', duration_hours: 8, start_date: dateStr(-300), completion_date: dateStr(-295), score: 9.5, status: 'concluido', is_mandatory: true },
    { emp: 'Pedro', title: 'Gestão de Estoque', type: 'interno', category: 'Operacional', duration_hours: 4, start_date: dateStr(-30), status: 'pendente', is_mandatory: true },
    { emp: 'Maria', title: 'Liderança e Gestão de Equipes', type: 'externo', provider: 'SEBRAE', category: 'Liderança', duration_hours: 16, start_date: dateStr(-120), completion_date: dateStr(-105), score: 10, status: 'concluido', certificate_url: '', is_mandatory: false },
    { emp: 'Roberto', title: 'Segurança no Trânsito', type: 'video', category: 'Segurança', duration_hours: 2, start_date: dateStr(-10), status: 'em_andamento', is_mandatory: true },
    { emp: 'Carlos', title: 'NR-6 EPI', type: 'interno', category: 'Segurança', duration_hours: 4, start_date: dateStr(-60), completion_date: dateStr(-58), score: 8, status: 'concluido', expiry_date: dateStr(305), is_mandatory: true },
    { emp: 'Marcos', title: 'Higiene e Segurança Alimentar', type: 'interno', category: 'Segurança', duration_hours: 8, start_date: dateStr(-200), completion_date: dateStr(-195), score: 7, status: 'concluido', expiry_date: dateStr(165), is_mandatory: true },
  ];
  for (const t of trainData) {
    const emp = empMap[t.emp]; if (!emp) continue;
    await sr.entities.Training.create({ employee_id: emp.id, employee_name: emp.full_name, ...t, company_id: companyId, version: 1 });
    counts.trainings++;
  }

  // Career plans
  const careerData = [
    { emp: 'Pedro', current_level: 'auxiliar', target_level: 'operador', requirements: [{ description: 'Concluir treinamento de Gestão de Estoque', completed: false }, { description: 'Melhorar pontualidade', completed: false }, { description: '90 dias sem advertências', completed: false }], progress_pct: 0 },
    { emp: 'Ana', current_level: 'operador', target_level: 'lider', requirements: [{ description: 'Concluir curso de Liderança', completed: false }, { description: 'Manter avaliação acima de 8', completed: true, completed_at: nowStr() }, { description: '6 meses na posição atual', completed: true, completed_at: nowStr() }], progress_pct: 67, target_promotion_date: dateStr(90) },
    { emp: 'Carlos', current_level: 'lider', target_level: 'supervisor', requirements: [{ description: 'Concluir gestão avançada', completed: false }, { description: 'Avaliação de liderança acima de 8', completed: false }], progress_pct: 0 },
  ];
  for (const c of careerData) {
    const emp = empMap[c.emp]; if (!emp) continue;
    await sr.entities.CareerPlan.create({ employee_id: emp.id, employee_name: emp.full_name, ...c, status: 'ativo', company_id: companyId, version: 1 });
    counts.career_plans++;
  }

  // Recognitions
  const recData = [
    { emp: 'Maria', type: 'destaque', title: 'Funcionária Destaque do Mês', description: 'Excelente desempenho na gestão de produção', date: dateStr(-10), awarded_by: 'João Silva', value: 200 },
    { emp: 'Carlos', type: 'elogio', title: 'Elogio por Dedicação', description: 'Sempre disponível para cobrir escalas', date: dateStr(-15), awarded_by: 'Maria Santos', value: 0 },
    { emp: 'Ana', type: 'meta', title: 'Meta de Produção Atingida', description: 'Bateu meta de produção por 3 meses seguidos', date: dateStr(-20), awarded_by: 'Maria Santos', value: 150 },
    { emp: 'João', type: 'premiacao', title: '5 Anos de Empresa', description: 'Comemoração de 5 anos de dedicação', date: dateStr(-5), awarded_by: 'Diretoria', value: 500 },
  ];
  for (const r of recData) {
    const emp = empMap[r.emp]; if (!emp) continue;
    await sr.entities.Recognition.create({ employee_id: emp.id, employee_name: emp.full_name, ...r, company_id: companyId, version: 1 });
    counts.recognitions++;
  }

  // Occurrences
  const occData = [
    { emp: 'Pedro', type: 'atrasos', description: '3 atrasos no mês corrente', date: dateStr(-3), severity: 'media', responsible_name: 'Maria Santos', action_taken: 'Conversa formal e advertência verbal', resolved: false },
    { emp: 'Marcos', type: 'acidente', description: 'Pequeno corte no dedo durante produção', date: dateStr(-20), severity: 'baixa', responsible_name: 'Carlos Pereira', action_taken: 'Atendimento médico e retorno no mesmo dia', resolved: true, resolved_at: nowStr() },
    { emp: 'Pedro', type: 'advertencia', description: 'Advertência por atrasos repetidos', date: dateStr(-2), severity: 'alta', responsible_name: 'João Silva', action_taken: 'Advertência escrita registrada', resolved: false },
    { emp: 'Roberto', type: 'feedback', description: 'Feedback positivo sobre pontualidade', date: dateStr(-7), severity: 'baixa', responsible_name: 'Juliana Ferreira', resolved: true, resolved_at: nowStr() },
  ];
  for (const o of occData) {
    const emp = empMap[o.emp]; if (!emp) continue;
    await sr.entities.Occurrence.create({ employee_id: emp.id, employee_name: emp.full_name, ...o, company_id: companyId, version: 1 });
    counts.occurrences++;
  }

  return Response.json({ initialized: true, ...counts });
}

async function handleGetDashboard(sr, user) {
  const employees = await safeList(sr, 'Employee', 200);
  const active = employees.filter(e => e.status === 'ativo');
  const onVacation = employees.filter(e => e.status === 'ferias');
  const terminated = employees.filter(e => e.status === 'demitido');
  const currentMonth = new Date().getMonth();
  const birthdays = employees.filter(e => {
    if (!e.birth_date) return false;
    return new Date(e.birth_date).getMonth() === currentMonth;
  });
  const trainings = await safeList(sr, 'Training', 200);
  const pendingTrainings = trainings.filter(t => t.status === 'pendente' || t.status === 'em_andamento');
  const totalBankHours = active.reduce((s, e) => s + (e.bank_hours_balance || 0), 0);
  const occurrences = await safeList(sr, 'Occurrence', 100);
  const unresolvedOcc = occurrences.filter(o => !o.resolved);
  const reviews = await safeList(sr, 'PerformanceReview', 200);
  const avgScore = reviews.length > 0 ? reviews.reduce((s, r) => s + (r.average_score || 0), 0) / reviews.length : 0;
  const candidates = await safeList(sr, 'Candidate', 100);
  const activeCandidates = candidates.filter(c => c.status !== 'contratado' && c.status !== 'reprovado');
  const jobOpenings = await safeList(sr, 'JobOpening', 100);
  const openJobs = jobOpenings.filter(j => j.status === 'aberta');
  const documents = await safeList(sr, 'EmployeeDocument', 200);
  const expiringDocs = documents.filter(d => d.status === 'vencendo' || d.status === 'vencido');
  const advances = await safeList(sr, 'EmployeeAdvance', 200);
  const activeAdvances = advances.filter(a => a.status === 'ativo');
  const totalAdvanceBalance = activeAdvances.reduce((s, a) => s + (a.balance || 0), 0);
  const recognitions = await safeList(sr, 'Recognition', 100);
  const recentRecognitions = recognitions.slice(0, 5);

  // Turnover calculation
  const hiredThisPeriod = employees.filter(e => {
    if (!e.hire_date) return false;
    const d = new Date(e.hire_date);
    const monthsAgo = (new Date() - d) / (1000 * 60 * 60 * 24 * 30);
    return monthsAgo <= 6;
  }).length;
  const turnoverRate = employees.length > 0 ? Math.round((terminated.length / employees.length) * 100) : 0;

  // Average tenure
  const tenures = active.map(e => {
    if (!e.hire_date) return 0;
    return (new Date() - new Date(e.hire_date)) / (1000 * 60 * 60 * 24 * 30);
  });
  const avgTenure = tenures.length > 0 ? Math.round(tenures.reduce((s, t) => s + t, 0) / tenures.length) : 0;

  // Absenteeism (late records today)
  const today = dateStr(0);
  const timeRecords = await safeFilter(sr, 'TimeRecord', { date: today });
  const lateToday = timeRecords.filter(t => t.status === 'atraso').length;

  const metrics = {
    total_employees: employees.length,
    active_employees: active.length,
    on_vacation: onVacation.length,
    terminated: terminated.length,
    birthdays_this_month: birthdays.length,
    pending_trainings: pendingTrainings.length,
    total_bank_hours: totalBankHours,
    unresolved_occurrences: unresolvedOcc.length,
    avg_performance: Math.round(avgScore * 10) / 10,
    active_candidates: activeCandidates.length,
    open_positions: openJobs.length,
    expiring_documents: expiringDocs.length,
    active_advances: activeAdvances.length,
    total_advance_balance: totalAdvanceBalance,
    turnover_rate: turnoverRate,
    avg_tenure_months: avgTenure,
    late_today: lateToday,
    recognitions_count: recognitions.length,
  };

  return Response.json({ metrics, birthdays, pending_trainings: pendingTrainings.slice(0, 10), recent_recognitions: recentRecognitions, expiring_documents: expiringDocs.slice(0, 10), unresolved_occurrences: unresolvedOcc.slice(0, 5) });
}

async function handleGetEmployeeDetail(sr, user, body) {
  const employee = await sr.entities.Employee.get(body.employee_id);
  if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });
  const documents = await safeFilter(sr, 'EmployeeDocument', { employee_id: body.employee_id });
  const timeRecords = await safeFilter(sr, 'TimeRecord', { employee_id: body.employee_id }, '-date', 30);
  const advances = await safeFilter(sr, 'EmployeeAdvance', { employee_id: body.employee_id });
  const reviews = await safeFilter(sr, 'PerformanceReview', { employee_id: body.employee_id }, '-review_date');
  const trainings = await safeFilter(sr, 'Training', { employee_id: body.employee_id });
  const careerPlans = await safeFilter(sr, 'CareerPlan', { employee_id: body.employee_id });
  const recognitions = await safeFilter(sr, 'Recognition', { employee_id: body.employee_id }, '-date');
  const occurrences = await safeFilter(sr, 'Occurrence', { employee_id: body.employee_id }, '-date');
  return Response.json({ employee, documents, time_records: timeRecords, advances, reviews, trainings, career_plans: careerPlans, recognitions, occurrences });
}

async function handleAiAnalyze(sr, user, body) {
  const detail = await handleGetEmployeeDetail(sr, user, body);
  const data = await detail.json();
  if (data.error) return Response.json(data, { status: 404 });
  const emp = data.employee;
  const reviews = data.reviews || [];
  const trainings = data.trainings || [];
  const occurrences = data.occurrences || [];
  const advances = data.advances || [];
  const documents = data.documents || [];

  const reviewText = reviews.map(r => 'Avaliação ' + r.period + ': média ' + r.average_score + '. ' + (r.comments || '')).join('\n');
  const trainingText = trainings.map(t => t.title + ' (' + t.status + ')').join(', ');
  const occText = occurrences.map(o => o.type + ': ' + o.description).join('\n');
  const advText = advances.map(a => a.type + ': R$' + a.balance + ' saldo').join(', ');
  const docText = documents.map(d => d.doc_name + ' (' + d.status + ')').join(', ');

  const prompt = 'Você é o Especialista de RH do Don Baron OS. Analise o perfil do colaborador abaixo e forneça insights estratégicos.\n\n' +
    'Colaborador: ' + emp.full_name + '\nCargo: ' + emp.position + '\nDepartamento: ' + emp.department + '\nNível: ' + (emp.career_level || '—') + '\nStatus: ' + emp.status + '\n' +
    'Salário: R$ ' + (emp.salary || 0) + '\nContrato: ' + (emp.contract_type || '—') + '\nAdmissão: ' + (emp.hire_date || '—') + '\n\n' +
    'Avaliações:\n' + (reviewText || 'Nenhuma') + '\n\nTreinamentos: ' + (trainingText || 'Nenhum') + '\n\n' +
    'Ocorrências:\n' + (occText || 'Nenhuma') + '\n\nVales/Empréstimos: ' + (advText || 'Nenhum') + '\n\nDocumentos: ' + (docText || 'Nenhum') + '\n\n' +
    'Forneça sua análise em JSON:\n' +
    '1. turnover_risk: baixo, medio ou alto (considere: avaliações baixas, ocorrências frequentes, salário abaixo do mercado, bank_hours negativo)\n' +
    '2. risk_factors: lista de fatores de risco identificados\n' +
    '3. training_suggestions: lista de treinamentos recomendados\n' +
    '4. overload: baixo, medio ou alto (baseado em bank_hours negativo, muitas ocorrências)\n' +
    '5. promotion_suggestion: sim ou não, com justificativa (baseado em avaliações altas, tempo de empresa, career plan progress)\n' +
    '6. promotion_reason: justificativa se sugerir promoção\n' +
    '7. document_alerts: lista de documentos vencendo ou vencidos\n' +
    '8. overall_assessment: resumo em 2-3 frases';

  const llmRes = await sr.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        turnover_risk: { type: 'string' }, risk_factors: { type: 'array', items: { type: 'string' } },
        training_suggestions: { type: 'array', items: { type: 'string' } }, overload: { type: 'string' },
        promotion_suggestion: { type: 'string' }, promotion_reason: { type: 'string' },
        document_alerts: { type: 'array', items: { type: 'string' } }, overall_assessment: { type: 'string' }
      }
    }
  });

  return Response.json({ employee: emp, analysis: llmRes });
}

async function handleGenerateOnboarding(sr, user, body) {
  const employee = await sr.entities.Employee.get(body.employee_id);
  if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });
  const checklist = [
    { description: 'Entrega de uniforme', completed: employee.uniform_delivered || false },
    { description: 'Entrega de crachá', completed: employee.badge_delivered || false },
    { description: 'Entrega de EPIs', completed: employee.epi_delivered || false },
    { description: 'Assinatura de contrato', completed: employee.contract_type ? true : false },
    { description: 'Cadastro de conta bancária e PIX', completed: employee.pix_key ? true : false },
    { description: 'Treinamento de integração', completed: false },
    { description: 'Treinamento de higiene e segurança', completed: false },
    { description: 'Apresentação à equipe', completed: false },
    { description: 'Configuração de acesso ao sistema', completed: false },
    { description: 'Foto para cadastro', completed: employee.photo_url ? true : false },
  ];
  const completed = checklist.filter(c => c.completed).length;
  return Response.json({ employee, checklist, completed, total: checklist.length, progress_pct: Math.round((completed / checklist.length) * 100) });
}

async function handleGeneratePayroll(sr, user, body) {
  const employee = await sr.entities.Employee.get(body.employee_id);
  if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });
  const month = body.month || (new Date().getMonth() + 1);
  const year = body.year || new Date().getFullYear();
  const advances = await safeFilter(sr, 'EmployeeAdvance', { employee_id: body.employee_id, status: 'ativo' });
  const timeRecords = await safeFilter(sr, 'TimeRecord', { employee_id: body.employee_id });
  const overtimeHours = timeRecords.reduce((s, t) => s + (t.overtime_minutes || 0), 0) / 60;
  const lateMinutes = timeRecords.reduce((s, t) => s + (t.late_minutes || 0), 0);
  const baseSalary = employee.salary || 0;
  const hourlyRate = baseSalary / 220;
  const overtimeValue = Math.round(overtimeHours * hourlyRate * 1.5 * 100) / 100;
  const totalAdvances = advances.reduce((s, a) => s + (a.installment_amount || a.balance || 0), 0);
  const grossSalary = baseSalary + overtimeValue + (employee.food_vale || 0) + (employee.transport_vale || 0);
  const inssDiscount = Math.round(grossSalary * 0.14 * 100) / 100;
  const totalDiscounts = inssDiscount + totalAdvances;
  const netSalary = Math.round((grossSalary - totalDiscounts) * 100) / 100;
  return Response.json({
    employee_id: employee.id, employee_name: employee.full_name, month, year,
    base_salary: baseSalary, overtime_hours: Math.round(overtimeHours * 10) / 10, overtime_value: overtimeValue,
    food_vale: employee.food_vale || 0, transport_vale: employee.transport_vale || 0,
    gross_salary: grossSalary, advances: totalAdvances, inss_discount: inssDiscount,
    total_discounts: totalDiscounts, net_salary: netSalary, late_minutes: lateMinutes,
    payment_method: 'pix', pix_key: employee.pix_key || '',
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;
    const body = await req.json();
    switch (body.action) {
      case 'init': return await handleInit(sr, user);
      case 'getDashboard': return await handleGetDashboard(sr, user);
      case 'getEmployeeDetail': return await handleGetEmployeeDetail(sr, user, body);
      case 'aiAnalyze': return await handleAiAnalyze(sr, user, body);
      case 'generateOnboarding': return await handleGenerateOnboarding(sr, user, body);
      case 'generatePayroll': return await handleGeneratePayroll(sr, user, body);
      default: return Response.json({ error: 'Unknown action: ' + body.action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});