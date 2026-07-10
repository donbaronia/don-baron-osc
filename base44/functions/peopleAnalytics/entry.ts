import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function safeList(sr, entityName, limit, sort) {
  try { return await sr.entities[entityName].list(sort || '-created_date', limit || 200); }
  catch (e) { return []; }
}
async function safeFilter(sr, entityName, query, sort, limit) {
  try { return await sr.entities[entityName].filter(query, sort, limit || 200); }
  catch (e) { return []; }
}

function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function calcEmployeeScore(emp, reviews, trainings, timeRecords, recognitions, occurrences) {
  const review = reviews[0];
  const scores = {};

  // Desempenho (from review average)
  scores.desempenho = review ? Math.round((review.average_score || 0) * 10) : 50;

  // Pontualidade (inverted late minutes)
  const totalLate = timeRecords.reduce((s, t) => s + (t.late_minutes || 0), 0);
  const latePenalty = Math.min(totalLate * 2, 100);
  scores.pontualidade = clamp(100 - latePenalty, 0, 100);

  // Qualidade
  scores.qualidade = review?.scores?.qualidade ? Math.round(review.scores.qualidade * 10) : 50;

  // Comprometimento
  scores.comprometimento = review?.scores?.comprometimento ? Math.round(review.scores.comprometimento * 10) : 50;

  // Treinamentos (completion rate)
  const totalTrainings = trainings.length;
  const completedTrainings = trainings.filter(t => t.status === 'concluido').length;
  scores.treinamentos = totalTrainings > 0 ? Math.round((completedTrainings / totalTrainings) * 100) : 50;

  // Trabalho em equipe
  scores.trabalho_equipe = review?.scores?.trabalho_equipe ? Math.round(review.scores.trabalho_equipe * 10) : 50;

  // Feedbacks (normalized recognitions)
  const recCount = recognitions.length;
  scores.feedbacks = clamp(Math.round((recCount / 3) * 100), 0, 100);

  // Cumprimento de metas
  const metas = recognitions.filter(r => r.type === 'meta' || r.type === 'premiacao').length;
  scores.metas = clamp(Math.round((metas / 2) * 100), 0, 100);

  // Overall weighted score
  const weights = {
    desempenho: 0.20, pontualidade: 0.15, qualidade: 0.12, comprometimento: 0.12,
    treinamentos: 0.10, trabalho_equipe: 0.10, feedbacks: 0.11, metas: 0.10
  };
  const overall = Math.round(Object.entries(weights).reduce((sum, [k, w]) => sum + (scores[k] || 0) * w, 0));

  // Risk factors
  const occCount = occurrences.filter(o => !o.resolved).length;
  const bankHoursNegative = (emp.bank_hours_balance || 0) < 0;
  const lowScore = overall < 50;
  const hasNegativeBank = bankHoursNegative;

  let turnoverRisk = 'baixo';
  if (overall < 40 || occCount >= 3 || (lowScore && hasNegativeBank)) turnoverRisk = 'alto';
  else if (overall < 60 || occCount >= 2 || hasNegativeBank) turnoverRisk = 'medio';

  let overloadRisk = 'baixo';
  if (hasNegativeBank && emp.bank_hours_balance < -60) overloadRisk = 'alto';
  else if (hasNegativeBank) overloadRisk = 'medio';

  let absenteeismRisk = 'baixo';
  const lateCount = timeRecords.filter(t => t.status === 'atraso').length;
  if (lateCount >= 3 || occCount >= 3) absenteeismRisk = 'alto';
  else if (lateCount >= 1 || occCount >= 1) absenteeismRisk = 'medio';

  return {
    scores, overall, turnoverRisk, overloadRisk, absenteeismRisk,
    metrics: {
      totalLate, lateCount, occCount, recCount, metas,
      totalTrainings, completedTrainings, bankHours: emp.bank_hours_balance || 0,
      avgReviewScore: review?.average_score || 0, hasReview: !!review
    }
  };
}

async function handleGetDashboard(sr, user) {
  const employees = await safeList(sr, 'Employee', 200);
  const active = employees.filter(e => e.status === 'ativo');
  const reviews = await safeList(sr, 'PerformanceReview', 200);
  const trainings = await safeList(sr, 'Training', 200);
  const timeRecords = await safeFilter(sr, 'TimeRecord', {}, '-date', 200);
  const occurrences = await safeList(sr, 'Occurrence', 200);
  const recognitions = await safeList(sr, 'Recognition', 200);
  const advances = await safeList(sr, 'EmployeeAdvance', 200);

  // By department
  const byDept = {};
  for (const e of active) {
    const d = e.department || 'outros';
    if (!byDept[d]) byDept[d] = { count: 0, salary: 0, bankHours: 0, overtime: 0, late: 0, reviews: 0 };
    byDept[d].count++;
    byDept[d].salary += e.salary || 0;
    byDept[d].bankHours += e.bank_hours_balance || 0;
  }

  // By shift
  const byShift = {};
  for (const e of active) {
    const s = e.shift || 'integral';
    if (!byShift[s]) byShift[s] = { count: 0, salary: 0, bankHours: 0 };
    byShift[s].count++;
    byShift[s].salary += e.salary || 0;
    byShift[s].bankHours += e.bank_hours_balance || 0;
  }

  // Compute scores
  const employeeScores = [];
  for (const emp of active) {
    const empReviews = reviews.filter(r => r.employee_id === emp.id);
    const empTrainings = trainings.filter(t => t.employee_id === emp.id);
    const empTime = timeRecords.filter(t => t.employee_id === emp.id);
    const empRecs = recognitions.filter(r => r.employee_id === emp.id);
    const empOccs = occurrences.filter(o => o.employee_id === emp.id);
    const scoreData = calcEmployeeScore(emp, empReviews, empTrainings, empTime, empRecs, empOccs);
    employeeScores.push({ employee: emp, ...scoreData });
  }
  employeeScores.sort((a, b) => b.overall - a.overall);

  // Highlights
  const topPerformers = employeeScores.slice(0, 5);
  const declining = employeeScores.filter(s => s.overall < 50 && s.metrics.hasReview);
  const improving = employeeScores.filter(s => s.overall >= 60 && s.overall < 75);

  // Turnover metrics
  const terminated = employees.filter(e => e.status === 'demitido');
  const turnoverRate = employees.length > 0 ? Math.round((terminated.length / employees.length) * 100) : 0;
  const tenures = active.map(e => {
    if (!e.hire_date) return 0;
    return (new Date() - new Date(e.hire_date)) / (1000 * 60 * 60 * 24 * 30);
  });
  const avgTenure = tenures.length > 0 ? Math.round(tenures.reduce((s, t) => s + t, 0) / tenures.length) : 0;

  // Absenteeism
  const lateToday = timeRecords.filter(t => t.status === 'atraso').length;
  const totalLateMin = timeRecords.reduce((s, t) => s + (t.late_minutes || 0), 0);

  // Overtime
  const totalOvertime = timeRecords.reduce((s, t) => s + (t.overtime_minutes || 0), 0);

  // Trainings
  const pendingTrainings = trainings.filter(t => t.status === 'pendente' || t.status === 'em_andamento');
  const completedTrainings = trainings.filter(t => t.status === 'concluido');

  // Avg review score
  const avgScore = reviews.length > 0 ? Math.round((reviews.reduce((s, r) => s + (r.average_score || 0), 0) / reviews.length) * 10) / 10 : 0;

  // Cost per employee
  const totalPayroll = active.reduce((s, e) => s + (e.salary || 0), 0);
  const totalAdvances = advances.filter(a => a.status === 'ativo').reduce((s, a) => s + (a.balance || 0), 0);

  // Risk distribution
  const riskDist = { baixo: 0, medio: 0, alto: 0 };
  for (const s of employeeScores) { riskDist[s.turnoverRisk] = (riskDist[s.turnoverRisk] || 0) + 1; }

  return Response.json({
    metrics: {
      active_employees: active.length,
      turnover_rate: turnoverRate,
      avg_tenure_months: avgTenure,
      late_today: lateToday,
      total_late_min: totalLateMin,
      total_overtime_min: totalOvertime,
      pending_trainings: pendingTrainings.length,
      completed_trainings: completedTrainings.length,
      avg_review_score: avgScore,
      total_payroll: totalPayroll,
      total_advances: totalAdvances,
      risk_low: riskDist.baixo, risk_medium: riskDist.medio, risk_high: riskDist.alto,
    },
    by_department: byDept,
    by_shift: byShift,
    top_performers: topPerformers.map(s => ({ employee_id: s.employee.id, employee_name: s.employee.full_name, department: s.employee.department, position: s.employee.position, score: s.overall, shift: s.employee.shift })),
    declining: declining.map(s => ({ employee_id: s.employee.id, employee_name: s.employee.full_name, score: s.overall, issues: s.metrics.occCount > 0 ? `${s.metrics.occCount} ocorrências` : 'Score baixo' })),
    improving: improving.map(s => ({ employee_id: s.employee.id, employee_name: s.employee.full_name, score: s.overall })),
    employee_scores: employeeScores.map(s => ({ employee_id: s.employee.id, employee_name: s.employee.full_name, department: s.employee.department, shift: s.employee.shift, position: s.employee.position, career_level: s.employee.career_level, overall: s.overall, turnoverRisk: s.turnoverRisk, overloadRisk: s.overloadRisk, absenteeismRisk: s.absenteeismRisk })),
  });
}

async function handleGetEmployeeScores(sr, user) {
  const employees = await safeList(sr, 'Employee', 200);
  const active = employees.filter(e => e.status === 'ativo');
  const reviews = await safeList(sr, 'PerformanceReview', 200);
  const trainings = await safeList(sr, 'Training', 200);
  const timeRecords = await safeFilter(sr, 'TimeRecord', {}, '-date', 200);
  const recognitions = await safeList(sr, 'Recognition', 200);
  const occurrences = await safeList(sr, 'Occurrence', 200);

  const results = [];
  for (const emp of active) {
    const empReviews = reviews.filter(r => r.employee_id === emp.id);
    const empTrainings = trainings.filter(t => t.employee_id === emp.id);
    const empTime = timeRecords.filter(t => t.employee_id === emp.id);
    const empRecs = recognitions.filter(r => r.employee_id === emp.id);
    const empOccs = occurrences.filter(o => o.employee_id === emp.id);
    const scoreData = calcEmployeeScore(emp, empReviews, empTrainings, empTime, empRecs, empOccs);
    results.push({
      employee_id: emp.id, employee_name: emp.full_name, short_name: emp.short_name,
      department: emp.department, shift: emp.shift, position: emp.position,
      career_level: emp.career_level, salary: emp.salary, hire_date: emp.hire_date,
      bank_hours: emp.bank_hours_balance || 0,
      ...scoreData
    });
  }
  results.sort((a, b) => b.overall - a.overall);
  return Response.json({ items: results });
}

async function handleGetEmployeeScore(sr, user, body) {
  const emp = await sr.entities.Employee.get(body.employee_id);
  if (!emp) return Response.json({ error: 'Employee not found' }, { status: 404 });
  const reviews = await safeFilter(sr, 'PerformanceReview', { employee_id: body.employee_id }, '-review_date');
  const trainings = await safeFilter(sr, 'Training', { employee_id: body.employee_id });
  const timeRecords = await safeFilter(sr, 'TimeRecord', { employee_id: body.employee_id }, '-date', 30);
  const recognitions = await safeFilter(sr, 'Recognition', { employee_id: body.employee_id }, '-date');
  const occurrences = await safeFilter(sr, 'Occurrence', { employee_id: body.employee_id }, '-date');
  const scoreData = calcEmployeeScore(emp, reviews, trainings, timeRecords, recognitions, occurrences);

  // Trend (compare latest review vs previous)
  const trend = reviews.length >= 2 ? Math.round((reviews[0].average_score - reviews[1].average_score) * 10) / 10 : 0;

  return Response.json({
    employee: { id: emp.id, full_name: emp.full_name, position: emp.position, department: emp.department, shift: emp.shift, career_level: emp.career_level, hire_date: emp.hire_date, salary: emp.salary, bank_hours_balance: emp.bank_hours_balance },
    score: scoreData,
    reviews: reviews.map(r => ({ period: r.period, average_score: r.average_score, review_date: r.review_date, comments: r.comments, strengths: r.strengths, improvements: r.improvements })),
    trainings: trainings.map(t => ({ title: t.title, status: t.status, score: t.score, completion_date: t.completion_date, is_mandatory: t.is_mandatory })),
    recognitions: recognitions.map(r => ({ type: r.type, title: r.title, description: r.description, date: r.date, awarded_by: r.awarded_by, value: r.value })),
    occurrences: occurrences.map(o => ({ type: o.type, description: o.description, severity: o.severity, date: o.date, resolved: o.resolved })),
    time_records_summary: {
      total: timeRecords.length,
      late: timeRecords.filter(t => t.status === 'atraso').length,
      total_late_min: timeRecords.reduce((s, t) => s + (t.late_minutes || 0), 0),
      total_overtime_min: timeRecords.reduce((s, t) => s + (t.overtime_minutes || 0), 0),
    },
    trend
  });
}

async function handleGetPredictions(sr, user) {
  const employees = await safeList(sr, 'Employee', 200);
  const active = employees.filter(e => e.status === 'ativo');
  const reviews = await safeList(sr, 'PerformanceReview', 200);
  const trainings = await safeList(sr, 'Training', 200);
  const timeRecords = await safeFilter(sr, 'TimeRecord', {}, '-date', 200);
  const recognitions = await safeList(sr, 'Recognition', 200);
  const occurrences = await safeList(sr, 'Occurrence', 200);

  const predictions = [];
  for (const emp of active) {
    const empReviews = reviews.filter(r => r.employee_id === emp.id);
    const empTrainings = trainings.filter(t => t.employee_id === emp.id);
    const empTime = timeRecords.filter(t => t.employee_id === emp.id);
    const empRecs = recognitions.filter(r => r.employee_id === emp.id);
    const empOccs = occurrences.filter(o => o.employee_id === emp.id);
    const scoreData = calcEmployeeScore(emp, empReviews, empTrainings, empTime, empRecs, empOccs);

    const risks = [];
    if (scoreData.turnoverRisk === 'alto') risks.push('Risco de desligamento');
    if (scoreData.overloadRisk === 'alto') risks.push('Sobrecarga de trabalho');
    if (scoreData.absenteeismRisk === 'alto') risks.push('Risco de absenteísmo');
    if (scoreData.metrics.completedTrainings < scoreData.metrics.totalTrainings) risks.push('Treinamentos pendentes');
    if (scoreData.overall < 50) risks.push('Queda de produtividade');

    // Leadership potential
    const review = empReviews[0];
    const hasLeadership = review?.scores?.lideranca >= 7;
    const isHighPerformer = scoreData.overall >= 75;
    const leadershipPotential = (hasLeadership && isHighPerformer) || (emp.career_level === 'lider' && scoreData.overall >= 70);

    predictions.push({
      employee_id: emp.id, employee_name: emp.full_name,
      department: emp.department, position: emp.position, career_level: emp.career_level,
      shift: emp.shift, overall: scoreData.overall,
      turnoverRisk: scoreData.turnoverRisk, overloadRisk: scoreData.overloadRisk,
      absenteeismRisk: scoreData.absenteeismRisk,
      risks, leadershipPotential,
      recommendation: scoreData.turnoverRisk === 'alto' ? 'Intervenção urgente necessária' :
                     scoreData.overall >= 80 ? 'Forte candidato a promoção' :
                     scoreData.overall >= 60 ? 'Em desenvolvimento' : 'Precisa de atenção'
    });
  }

  const highRisk = predictions.filter(p => p.turnoverRisk === 'alto');
  const leadershipCandidates = predictions.filter(p => p.leadershipPotential);
  const needsTraining = predictions.filter(p => p.risks.includes('Treinamentos pendentes'));

  return Response.json({
    predictions,
    summary: {
      total: predictions.length,
      high_risk: highRisk.length,
      leadership_candidates: leadershipCandidates.length,
      needs_training: needsTraining.length,
      high_performers: predictions.filter(p => p.overall >= 80).length,
    }
  });
}

async function handleGetComparisons(sr, user, body) {
  const employees = await safeList(sr, 'Employee', 200);
  const active = employees.filter(e => e.status === 'ativo');
  const reviews = await safeList(sr, 'PerformanceReview', 200);
  const trainings = await safeList(sr, 'Training', 200);
  const timeRecords = await safeFilter(sr, 'TimeRecord', {}, '-date', 200);
  const recognitions = await safeList(sr, 'Recognition', 200);
  const occurrences = await safeList(sr, 'Occurrence', 200);
  const advances = await safeList(sr, 'EmployeeAdvance', 200);

  const groupBy = body.groupBy || 'department'; // department, shift, career_level

  const groups = {};
  for (const emp of active) {
    const key = emp[groupBy] || 'outros';
    if (!groups[key]) groups[key] = { employees: [], reviews: [], trainings: [], timeRecords: [], recognitions: [], occurrences: [], advances: [] };
    groups[key].employees.push(emp);
    groups[key].reviews.push(...reviews.filter(r => r.employee_id === emp.id));
    groups[key].trainings.push(...trainings.filter(t => t.employee_id === emp.id));
    groups[key].timeRecords.push(...timeRecords.filter(t => t.employee_id === emp.id));
    groups[key].recognitions.push(...recognitions.filter(r => r.employee_id === emp.id));
    groups[key].occurrences.push(...occurrences.filter(o => o.employee_id === emp.id));
    groups[key].advances.push(...advances.filter(a => a.employee_id === emp.id));
  }

  const results = [];
  for (const [key, data] of Object.entries(groups)) {
    const emp = data.employees[0] || {};
    const scores = [];
    for (const e of data.employees) {
      const empReviews = data.reviews.filter(r => r.employee_id === e.id);
      const empTrainings = data.trainings.filter(t => t.employee_id === e.id);
      const empTime = data.timeRecords.filter(t => t.employee_id === e.id);
      const empRecs = data.recognitions.filter(r => r.employee_id === e.id);
      const empOccs = data.occurrences.filter(o => o.employee_id === e.id);
      const sd = calcEmployeeScore(e, empReviews, empTrainings, empTime, empRecs, empOccs);
      scores.push(sd.overall);
    }
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const totalSalary = data.employees.reduce((s, e) => s + (e.salary || 0), 0);
    const totalBankHours = data.employees.reduce((s, e) => s + (e.bank_hours_balance || 0), 0);
    const totalLate = data.timeRecords.reduce((s, t) => s + (t.late_minutes || 0), 0);
    const totalOvertime = data.timeRecords.reduce((s, t) => s + (t.overtime_minutes || 0), 0);
    const completedTrainings = data.trainings.filter(t => t.status === 'concluido').length;
    const pendingTrainings = data.trainings.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length;
    const unresolvedOccs = data.occurrences.filter(o => !o.resolved).length;
    const totalAdvances = data.advances.filter(a => a.status === 'ativo').reduce((s, a) => s + (a.balance || 0), 0);

    results.push({
      group: key, count: data.employees.length, avgScore, totalSalary, totalBankHours,
      totalLate, totalOvertime, completedTrainings, pendingTrainings, unresolvedOccs, totalAdvances,
      recognitions: data.recognitions.length
    });
  }
  results.sort((a, b) => b.avgScore - a.avgScore);
  return Response.json({ items: results, groupBy });
}

async function handleAiAnalyze(sr, user, body) {
  const scoreData = await handleGetEmployeeScore(sr, user, body);
  const data = await scoreData.json();
  if (data.error) return Response.json(data, { status: 404 });

  const emp = data.employee;
  const score = data.score;

  const prompt = 'Você é o Especialista de People Analytics do Don Baron OS. Analise o perfil analítico do colaborador abaixo.\n\n' +
    'Colaborador: ' + emp.full_name + '\nCargo: ' + emp.position + '\nDepartamento: ' + emp.department + '\nNível: ' + (emp.career_level || '—') + '\n' +
    'Score Geral: ' + score.overall + '/100\n\n' +
    'Scores por dimensão:\n' +
    'Desempenho: ' + score.scores.desempenho + '\n' +
    'Pontualidade: ' + score.scores.pontualidade + '\n' +
    'Qualidade: ' + score.scores.qualidade + '\n' +
    'Comprometimento: ' + score.scores.comprometimento + '\n' +
    'Treinamentos: ' + score.scores.treinamentos + '\n' +
    'Trabalho em Equipe: ' + score.scores.trabalho_equipe + '\n' +
    'Feedbacks: ' + score.scores.feedbacks + '\n' +
    'Metas: ' + score.scores.metas + '\n\n' +
    'Riscos: Turnover=' + score.turnoverRisk + ', Sobrecarga=' + score.overloadRisk + ', Absenteísmo=' + score.absenteeismRisk + '\n' +
    'Banco de Horas: ' + score.metrics.bankHours + 'min\n' +
    'Atrasos: ' + score.metrics.lateCount + ' (' + score.metrics.totalLate + 'min)\n' +
    'Ocorrências abertas: ' + score.metrics.occCount + '\n' +
    'Treinamentos: ' + score.metrics.completedTrainings + '/' + score.metrics.totalTrainings + ' concluídos\n' +
    'Reconhecimentos: ' + score.metrics.recCount + '\n\n' +
    'Forneça análise em JSON:\n' +
    '1. summary: resumo executivo (2-3 frases)\n' +
    '2. strengths: lista de pontos fortes identificados\n' +
    '3. weaknesses: lista de pontos de melhoria\n' +
    '4. training_suggestions: lista de treinamentos recomendados específicos\n' +
    '5. promotion_readiness: "pronto", "em_desenvolvimento" ou "nao_recomendado"\n' +
    '6. promotion_reason: justificativa\n' +
    '7. development_plan: plano de desenvolvimento estruturado (3-5 ações)\n' +
    '8. leadership_potential: "alto", "medio" ou "baixo" com base nos dados\n' +
    '9. risk_assessment: avaliação dos riscos identificados\n' +
    '10. recommended_actions: lista de ações recomendadas para o gestor';

  const llmRes = await sr.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' }, strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } }, training_suggestions: { type: 'array', items: { type: 'string' } },
        promotion_readiness: { type: 'string' }, promotion_reason: { type: 'string' },
        development_plan: { type: 'string' }, leadership_potential: { type: 'string' },
        risk_assessment: { type: 'string' }, recommended_actions: { type: 'array', items: { type: 'string' } }
      }
    }
  });

  return Response.json({ employee: emp, score, analysis: llmRes });
}

async function handleAiTeamAnalysis(sr, user) {
  const scoresRes = await handleGetEmployeeScores(sr, user);
  const scoresData = await scoresRes.json();
  const items = scoresData.items || [];

  const topPerformers = items.filter(s => s.overall >= 75).slice(0, 5);
  const atRisk = items.filter(s => s.turnoverRisk === 'alto');
  const needsTraining = items.filter(s => s.scores.treinamentos < 50);
  const leadershipCandidates = items.filter(s => s.overall >= 70 && (s.career_level === 'lider' || s.career_level === 'operador'));

  const deptAvg = {};
  for (const s of items) {
    const d = s.department || 'outros';
    if (!deptAvg[d]) deptAvg[d] = { scores: [], count: 0 };
    deptAvg[d].scores.push(s.overall);
    deptAvg[d].count++;
  }
  const deptSummary = Object.entries(deptAvg).map(([dept, data]) => ({
    department: dept, avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length), count: data.count
  }));

  const prompt = 'Você é o Especialista de People Analytics do Don Baron OS. Analise o panorama geral da equipe.\n\n' +
    'Total de colaboradores: ' + items.length + '\n' +
    'Top performers: ' + topPerformers.map(s => s.employee_name + ' (' + s.overall + ')').join(', ') + '\n' +
    'Em risco de desligamento: ' + atRisk.map(s => s.employee_name + ' (' + s.overall + ')').join(', ') + '\n' +
    'Precisam de treinamento: ' + needsTraining.map(s => s.employee_name).join(', ') + '\n' +
    'Candidatos a liderança: ' + leadershipCandidates.map(s => s.employee_name).join(', ') + '\n' +
    'Média por departamento: ' + deptSummary.map(d => d.department + '=' + d.avgScore).join(', ') + '\n\n' +
    'Forneça análise em JSON:\n' +
    '1. team_summary: resumo geral da equipe (2-3 frases)\n' +
    '2. key_insights: lista de insights principais\n' +
    '3. recommendations: lista de recomendações estratégicas\n' +
    '4. training_priorities: lista de prioridades de treinamento\n' +
    '5. retention_actions: ações para reter talentos\n' +
    '6. promotion_candidates: lista de candidatos a promoção com justificativa';

  const llmRes = await sr.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        team_summary: { type: 'string' }, key_insights: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        training_priorities: { type: 'array', items: { type: 'string' } },
        retention_actions: { type: 'array', items: { type: 'string' } },
        promotion_candidates: { type: 'array', items: { type: 'string' } }
      }
    }
  });

  return Response.json({ summary: { total: items.length, top: topPerformers.length, at_risk: atRisk.length, needs_training: needsTraining.length, leadership: leadershipCandidates.length }, dept_summary: deptSummary, analysis: llmRes });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;
    const body = await req.json();
    switch (body.action) {
      case 'getDashboard': return await handleGetDashboard(sr, user);
      case 'getEmployeeScores': return await handleGetEmployeeScores(sr, user);
      case 'getEmployeeScore': return await handleGetEmployeeScore(sr, user, body);
      case 'getPredictions': return await handleGetPredictions(sr, user);
      case 'getComparisons': return await handleGetComparisons(sr, user, body);
      case 'aiAnalyze': return await handleAiAnalyze(sr, user, body);
      case 'aiTeamAnalysis': return await handleAiTeamAnalysis(sr, user);
      default: return Response.json({ error: 'Unknown action: ' + body.action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});