import { base44 } from "@/api/base44Client";

/**
 * PersistGuard — garantia de gravação real no banco.
 *
 * ETAPA 3: Somente retorna sucesso após confirmação do banco.
 * ETAPA 6: Read-back obrigatório após salvar — compara gravado vs retornado.
 * ETAPA 8: Gera registro de auditoria automaticamente.
 */

async function logAudit(entityName, operation, entityId, result, details, user) {
  try {
    await base44.entities.AuditLog.create({
      user_name: user?.full_name || user?.email || "Sistema",
      user_email: user?.email || "",
      module: entityName,
      action: `${operation}_${result}`,
      entity_type: entityName,
      entity_id: entityId || "",
      operation: operation === "create" ? "create" : operation === "update" ? "update" : operation === "delete" ? "delete" : "other",
      origin: "frontend",
      details: typeof details === "string" ? details : JSON.stringify(details),
    });
  } catch {}
}

/**
 * Cria um registro com verificação de persistência.
 * Só resolve após: create → get (read-back) → comparar campos → auditoria.
 */
export async function safeCreate(entityName, data, user = null) {
  // 1. CREATE
  const created = await base44.entities[entityName].create(data);
  if (!created?.id) {
    await logAudit(entityName, "create", null, "error", "Banco não retornou ID", user);
    throw new Error("Banco de dados não confirmou a gravação — ID não retornado.");
  }

  // 2. READ-BACK
  const verified = await base44.entities[entityName].get(created.id);
  if (!verified) {
    await logAudit(entityName, "create", created.id, "error", "Read-back retornou null", user);
    throw new Error("Registro não encontrado após gravação. Dados podem não ter persistido.");
  }

  // 3. COMPARAR
  const mismatches = [];
  for (const key of Object.keys(data)) {
    if (verified[key] !== data[key]) {
      mismatches.push({ field: key, expected: data[key], actual: verified[key] });
    }
  }
  if (mismatches.length > 0) {
    await logAudit(entityName, "create", created.id, "error", { mismatches }, user);
    throw new Error(`Dados gravados divergem do informado: ${mismatches.map(m => m.field).join(", ")}`);
  }

  // 4. AUDITORIA
  await logAudit(entityName, "create", created.id, "success", "Persistência confirmada via read-back", user);

  return { record: verified, id: created.id, verified: true };
}

/**
 * Atualiza um registro com verificação de persistência.
 */
export async function safeUpdate(entityName, id, data, user = null) {
  // 1. UPDATE
  await base44.entities[entityName].update(id, data);

  // 2. READ-BACK
  const verified = await base44.entities[entityName].get(id);
  if (!verified) {
    await logAudit(entityName, "update", id, "error", "Read-back após update retornou null", user);
    throw new Error("Registro não encontrado após atualização.");
  }

  // 3. COMPARAR campos enviados
  const mismatches = [];
  for (const key of Object.keys(data)) {
    if (verified[key] !== data[key]) {
      mismatches.push({ field: key, expected: data[key], actual: verified[key] });
    }
  }
  if (mismatches.length > 0) {
    await logAudit(entityName, "update", id, "error", { mismatches }, user);
    throw new Error(`Atualização divergente: ${mismatches.map(m => m.field).join(", ")}`);
  }

  // 4. AUDITORIA
  await logAudit(entityName, "update", id, "success", "Persistência confirmada via read-back", user);

  return { record: verified, id, verified: true };
}

/**
 * Exclui um registro com confirmação.
 */
export async function safeDelete(entityName, id, user = null) {
  await base44.entities[entityName].delete(id);

  // Verificar exclusão
  let stillExists = false;
  try {
    const check = await base44.entities[entityName].get(id);
    if (check) stillExists = true;
  } catch {}

  if (stillExists) {
    await logAudit(entityName, "delete", id, "error", "Registro ainda existe após delete", user);
    throw new Error("Registro não foi excluído do banco.");
  }

  await logAudit(entityName, "delete", id, "success", "Exclusão confirmada", user);
  return { id, verified: true };
}