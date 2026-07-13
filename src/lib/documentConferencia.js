/**
 * Conferência — compara dados extraídos do documento vs dados cadastrados no sistema (Payment).
 * Retorna lista de campos com status Confere / Divergência.
 */

export function compareDocumentVsPayment(doc, payment) {
  if (!payment) return null;

  const checks = [];

  // Valor
  const docVal = Number(doc.value || 0);
  const payVal = Number(payment.amount || 0);
  checks.push({
    field: "Valor",
    docValue: docVal,
    sysValue: payVal,
    docLabel: docVal ? docVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—",
    sysLabel: payVal ? payVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—",
    match: Math.abs(docVal - payVal) < 0.01,
  });

  // Fornecedor
  const docSup = (doc.supplier || "").toLowerCase().trim();
  const paySup = (payment.supplier_name || "").toLowerCase().trim();
  checks.push({
    field: "Fornecedor",
    docValue: doc.supplier || "",
    sysValue: payment.supplier_name || "",
    docLabel: doc.supplier || "—",
    sysLabel: payment.supplier_name || "—",
    match: !!(docSup && paySup && (docSup === paySup || docSup.includes(paySup) || paySup.includes(docSup))),
  });

  // Vencimento
  checks.push({
    field: "Vencimento",
    docValue: doc.due_date || "",
    sysValue: payment.due_date || "",
    docLabel: doc.due_date ? new Date(doc.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—",
    sysLabel: payment.due_date ? new Date(payment.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—",
    match: !!(doc.due_date && payment.due_date && doc.due_date === payment.due_date),
  });

  // Número do documento
  checks.push({
    field: "Nº Documento",
    docValue: doc.document_number || "",
    sysValue: payment.document_number || "",
    docLabel: doc.document_number || "—",
    sysLabel: payment.document_number || "—",
    match: !!(doc.document_number && payment.document_number && doc.document_number === payment.document_number),
  });

  // Banco (boletos)
  if (doc.bank || payment.bank) {
    checks.push({
      field: "Banco",
      docValue: doc.bank || "",
      sysValue: payment.bank || "",
      docLabel: doc.bank || "—",
      sysLabel: payment.bank || "—",
      match: !!(doc.bank && payment.bank && doc.bank.toLowerCase() === payment.bank.toLowerCase()),
    });
  }

  const divergences = checks.filter((c) => !c.match && (c.docValue || c.sysValue));
  const allMatch = divergences.length === 0 && checks.length > 0;

  return { checks, divergences, allMatch };
}

/**
 * Calcula status de alerta de vencimento.
 * - 5 dias antes: warning
 * - 2 dias antes: warning
 * - no vencimento: urgent
 * - vencido: urgent
 */
export function getDueAlert(dueDateStr) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return { level: "urgent", days: Math.abs(daysUntil), label: `Vencido há ${Math.abs(daysUntil)} dia(s)` };
  }
  if (daysUntil === 0) {
    return { level: "urgent", days: 0, label: "Vence hoje" };
  }
  if (daysUntil <= 2) {
    return { level: "warning", days: daysUntil, label: `Vence em ${daysUntil} dia(s)` };
  }
  if (daysUntil <= 5) {
    return { level: "warning", days: daysUntil, label: `Vence em ${daysUntil} dias` };
  }
  return null;
}