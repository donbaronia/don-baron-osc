/**
 * DON BARON X — Conselho Executivo IA
 *
 * Os agentes executivos (CEO, CFO, COO, CMO, CHO) deliberam juntos antes de
 * decisões estratégicas. Exemplo: Compras solicita → Financeiro valida →
 * Estoque confirma → CEO aprova → Workflow executa.
 *
 * Uma única chamada de LLM retorna os pareceres de todos os executivos + o
 * consenso. Se o consenso for "aprovar", o fluxo pode prosseguir; caso
 * contrário, retorna para o BARON solicitar intervenção humana.
 */
import { base44 } from "@/api/base44Client";
import { AGENTS } from "./agents";

export const EXECUTIVE_AGENTS = ["ag_ceo", "ag_cfo", "ag_coo", "ag_cmo", "ag_cho"];

export const ExecutiveCouncil = {
  /**
   * Delibera uma proposta estratégica com todo o conselho.
   * proposal: string (ex.: "Comprar 200kg de carne da Friboel por R$4.800")
   * context: { requester, entity, amount, module, ... }
   * Retorna { deliberated, consensus, opinions[], summary, approved }
   */
  async deliberate({ proposal, context = {}, user }) {
    const council = EXECUTIVE_AGENTS.map((k) => AGENTS[k]).filter(Boolean);
    const roles = council.map((a) => `${a.name} (${a.specialization || a.module})`).join(", ");

    const prompt = `Você é o Conselho Executivo do Don Baron (ROS de restaurante).
Decisão proposta: ${proposal}
Contexto: ${JSON.stringify(context)}
Solicitante: ${user?.full_name || "BARON"}

Cada um destes executivos deve dar seu parecer: ${roles}.
Regras:
- CFO valida caixa e impacto financeiro.
- COO valida capacidade operacional/estoque.
- CMO valida impacto comercial/campanha (se relevante).
- CHO valida impacto em pessoas (se relevante).
- CEO decide o consenso final.

Retorne JSON:
{
  "opinions": [{ "agent": "ag_ceo"|"ag_cfo"|"ag_coo"|"ag_cmo"|"ag_cho", "position": "aprovar"|"validar"|"rejeitar"|"observar", "rationale": "1 frase", "condition": "condição ou vazio" }],
  "consensus": "aprovar"|"rejeitar"|"divergente",
  "summary": "resumo executivo em 1-2 frases"
}`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            opinions: { type: "array", items: { type: "object" } },
            consensus: { type: "string" },
            summary: { type: "string" },
          },
        },
        add_context_from_internet: false,
      });
      const parsed = typeof res === "string" ? JSON.parse(res) : res;
      const consensus = parsed.consensus || "divergente";
      // Persiste a decisão no Knowledge Graph / auditoria
      try {
        await base44.entities.Decision.create({
          description: proposal,
          context: { ...context, requested_by: user?.full_name },
          consensus,
          opinions: parsed.opinions || [],
          summary: parsed.summary || "",
          status: consensus === "aprovar" ? "aprovado" : "pendente",
        });
      } catch {}
      return {
        deliberated: true,
        consensus,
        approved: consensus === "aprovar",
        opinions: parsed.opinions || [],
        summary: parsed.summary || "",
        agents: EXECUTIVE_AGENTS,
      };
    } catch (e) {
      return {
        deliberated: false,
        consensus: "divergente",
        approved: false,
        opinions: [],
        summary: `Deliberação falhou: ${e.message}`,
        agents: EXECUTIVE_AGENTS,
        error: e.message,
      };
    }
  },

  listExecutives() {
    return EXECUTIVE_AGENTS.map((k) => AGENTS[k]).filter(Boolean);
  },
};

export default ExecutiveCouncil;