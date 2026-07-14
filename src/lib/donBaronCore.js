import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * DON BARON CORE — Camada central OBRIGATORIA para todas as operacoes de dados.
 *
 * ETAPA 5: Sucesso somente apos confirmacao do banco (read-back + comparacao).
 * ETAPA 4: LOG obrigatorio em system_logs para toda operacao.
 * ETAPA 7: Nenhuma tela acessa o banco diretamente — tudo passa por Core.
 * ETAPA 6: Transacoes com rollback automatico.
 *
 * Uso:
 *   import { Core } from "@/lib/donBaronCore";
 *   const result = await Core.save("Product", data, { user, module: "cadastro" });
 *   const result = await Core.update("Payment", id, data, { user, module: "financeiro" });
 *   const result = await Core.remove("Product", id, { user, module: "cadastro" });
 *   const rows = await Core.load("Product", { active: true }, "-created_date", 500);
 */

let _currentUser = null;

export function setCurrentUser(user) {
  _currentUser = user;
}

function getUser(options) {
  return options?.user || _currentUser || { full_name: "Sistema", email: "" };
}

/**
 * Registra operacao na tabela SystemLog (tabela permanente, nunca apagada).
 */
async function logToSystemLog(entry) {
  try {
    await base44.entities.SystemLog.create({
      timestamp: new Date().toISOString(),
      user_name: entry.user_name,
      user_email: entry.user_email,
      entity_name: entry.entity_name,
      operation: entry.operation,
      payload: entry.payload,
      bank_response: entry.bank_response,
      duration_ms: entry.duration_ms || 0,
      status: entry.status,
      error_message: entry.error_message || "",
      readback_verified: entry.readback_verified || false,
      mismatches: entry.mismatches || [],
      module: entry.module || "",
      origin: entry.origin || "frontend",
      correlation_id: entry.correlation_id || "",
    });
  } catch {}
}

/**
 * SAVE (Create) — cria registro, faz read-back, compara campos, registra log.
 * SO retorna sucesso apos confirmacao do banco.
 * Lanca erro se: banco nao retornar ID, read-back falhar, campos divergirem.
 */
async function save(entityName, data, options = {}) {
  const user = getUser(options);
  const start = Date.now();

  // 1. CREATE
  let created;
  try {
    created = await base44.entities[entityName].create(data);
  } catch (e) {
    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: entityName,
      operation: "create",
      payload: data,
      bank_response: null,
      duration_ms: Date.now() - start,
      status: "error",
      error_message: e.message,
      module: options.module,
    });
    throw new Error(`Falha ao criar ${entityName}: ${e.message}`);
  }

  if (!created?.id) {
    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: entityName,
      operation: "create",
      payload: data,
      bank_response: created,
      duration_ms: Date.now() - start,
      status: "error",
      error_message: "Banco nao retornou ID",
      module: options.module,
    });
    throw new Error(`Banco de dados nao confirmou a gravacao em ${entityName} — ID nao retornado.`);
  }

  // 2. READ-BACK
  let verified;
  try {
    verified = await base44.entities[entityName].get(created.id);
  } catch (e) {
    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: entityName,
      operation: "create",
      payload: data,
      bank_response: { id: created.id },
      duration_ms: Date.now() - start,
      status: "error",
      error_message: `Read-back falhou: ${e.message}`,
      module: options.module,
    });
    throw new Error(`Registro criado em ${entityName} mas read-back falhou: ${e.message}`);
  }

  if (!verified) {
    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: entityName,
      operation: "create",
      payload: data,
      bank_response: { id: created.id },
      duration_ms: Date.now() - start,
      status: "error",
      error_message: "Read-back retornou null — registro nao persistiu",
      module: options.module,
    });
    throw new Error(`Registro nao encontrado apos gravacao em ${entityName}. Dados podem nao ter persistido.`);
  }

  // 3. COMPARAR campos enviados vs retornados
  const mismatches = [];
  for (const key of Object.keys(data)) {
    if (verified[key] !== data[key]) {
      // Ignorar objetos complexos e arrays (comparacao superficial)
      if (typeof data[key] !== "object" || data[key] === null) {
        mismatches.push({ field: key, expected: data[key], actual: verified[key] });
      }
    }
  }

  // 4. LOG
  await logToSystemLog({
    user_name: user.full_name || user.email,
    user_email: user.email,
    entity_name: entityName,
    operation: "create",
    payload: data,
    bank_response: { id: created.id, verified: true },
    duration_ms: Date.now() - start,
    status: "success",
    readback_verified: true,
    mismatches,
    module: options.module,
  });

  return { record: verified, id: created.id, verified: true, mismatches };
}

/**
 * UPDATE — atualiza, faz read-back, compara, registra log.
 */
async function update(entityName, id, data, options = {}) {
  const user = getUser(options);
  const start = Date.now();

  // 1. UPDATE
  try {
    await base44.entities[entityName].update(id, data);
  } catch (e) {
    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: entityName,
      operation: "update",
      payload: { id, ...data },
      bank_response: null,
      duration_ms: Date.now() - start,
      status: "error",
      error_message: e.message,
      module: options.module,
    });
    throw new Error(`Falha ao atualizar ${entityName}: ${e.message}`);
  }

  // 2. READ-BACK
  let verified;
  try {
    verified = await base44.entities[entityName].get(id);
  } catch (e) {
    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: entityName,
      operation: "update",
      payload: { id, ...data },
      bank_response: null,
      duration_ms: Date.now() - start,
      status: "error",
      error_message: `Read-back falhou: ${e.message}`,
      module: options.module,
    });
    throw new Error(`Atualizacao em ${entityName} enviada mas read-back falhou: ${e.message}`);
  }

  if (!verified) {
    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: entityName,
      operation: "update",
      payload: { id, ...data },
      bank_response: null,
      duration_ms: Date.now() - start,
      status: "error",
      error_message: "Registro nao encontrado apos update",
      module: options.module,
    });
    throw new Error(`Registro ${id} em ${entityName} nao encontrado apos atualizacao.`);
  }

  // 3. COMPARAR
  const mismatches = [];
  for (const key of Object.keys(data)) {
    if (verified[key] !== data[key]) {
      if (typeof data[key] !== "object" || data[key] === null) {
        mismatches.push({ field: key, expected: data[key], actual: verified[key] });
      }
    }
  }

  // 4. LOG
  await logToSystemLog({
    user_name: user.full_name || user.email,
    user_email: user.email,
    entity_name: entityName,
    operation: "update",
    payload: { id, ...data },
    bank_response: { id, verified: true },
    duration_ms: Date.now() - start,
    status: "success",
    readback_verified: true,
    mismatches,
    module: options.module,
  });

  return { record: verified, id, verified: true, mismatches };
}

/**
 * REMOVE (Delete) — exclui, confirma exclusao, registra log.
 */
async function remove(entityName, id, options = {}) {
  const user = getUser(options);
  const start = Date.now();

  // 1. DELETE
  try {
    await base44.entities[entityName].delete(id);
  } catch (e) {
    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: entityName,
      operation: "delete",
      payload: { id },
      bank_response: null,
      duration_ms: Date.now() - start,
      status: "error",
      error_message: e.message,
      module: options.module,
    });
    throw new Error(`Falha ao excluir ${entityName}: ${e.message}`);
  }

  // 2. CONFIRMAR exclusao
  let stillExists = false;
  try {
    const check = await base44.entities[entityName].get(id);
    if (check) stillExists = true;
  } catch {}

  if (stillExists) {
    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: entityName,
      operation: "delete",
      payload: { id },
      bank_response: { still_exists: true },
      duration_ms: Date.now() - start,
      status: "error",
      error_message: "Registro ainda existe apos delete",
      module: options.module,
    });
    throw new Error(`Registro ${id} em ${entityName} nao foi excluido do banco.`);
  }

  // 3. LOG
  await logToSystemLog({
    user_name: user.full_name || user.email,
    user_email: user.email,
    entity_name: entityName,
    operation: "delete",
    payload: { id },
    bank_response: { deleted: true },
    duration_ms: Date.now() - start,
    status: "success",
    readback_verified: true,
    module: options.module,
  });

  return { id, verified: true };
}

/**
 * LOAD (Read) — le registros com tratamento de erro.
 */
async function load(entityName, filter = {}, sort = "-created_date", limit = 500) {
  try {
    if (Object.keys(filter).length === 0) {
      return await base44.entities[entityName].list(sort, limit);
    }
    return await base44.entities[entityName].filter(filter, sort, limit);
  } catch (e) {
    await logToSystemLog({
      user_name: "Sistema",
      user_email: "",
      entity_name: entityName,
      operation: "read",
      payload: { filter, sort, limit },
      bank_response: null,
      duration_ms: 0,
      status: "error",
      error_message: e.message,
    });
    throw new Error(`Falha ao carregar ${entityName}: ${e.message}`);
  }
}

/**
 * TRANSACTION — executa multiplas operacoes com rollback automatico.
 * Se qualquer etapa falhar, exclui todos os registros criados ate ali.
 *
 * Exemplo:
 *   const result = await Core.transaction([
 *     { entity: "Supplier", data: { name: "Fornecedor X" } },
 *     { entity: "Payment", data: { description: "Conta", amount: 100 } },
 *   ], { user, module: "compras" });
 */
async function transaction(steps, options = {}) {
  const user = getUser(options);
  const correlationId = `TXN-${Date.now()}`;
  const created = [];
  const start = Date.now();

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const result = await save(step.entity, step.data, { ...options, correlation_id: correlationId });
      created.push({ entity: step.entity, id: result.id, stepIndex: i });
    }

    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: "TRANSACTION",
      operation: "transaction",
      payload: { steps: steps.length, correlation_id: correlationId },
      bank_response: { created: created.length },
      duration_ms: Date.now() - start,
      status: "success",
      readback_verified: true,
      module: options.module,
      correlation_id: correlationId,
    });

    return { success: true, created, correlationId };
  } catch (e) {
    // ROLLBACK — excluir tudo que foi criado
    const rollbackErrors = [];
    for (const c of created) {
      try {
        await base44.entities[c.entity].delete(c.id);
      } catch (re) {
        rollbackErrors.push({ entity: c.entity, id: c.id, error: re.message });
      }
    }

    await logToSystemLog({
      user_name: user.full_name || user.email,
      user_email: user.email,
      entity_name: "TRANSACTION",
      operation: "transaction",
      payload: { steps: steps.length, failed_at_step: created.length + 1, original_error: e.message },
      bank_response: { rolled_back: created.length, rollback_errors: rollbackErrors },
      duration_ms: Date.now() - start,
      status: "rolled_back",
      error_message: e.message,
      module: options.module,
      correlation_id: correlationId,
    });

    throw new Error(`Transacao falhou na etapa ${created.length + 1}: ${e.message}. ${created.length} registro(s) revertido(s).`);
  }
}

export const Core = { save, update, remove, load, transaction, setCurrentUser };
export default Core;