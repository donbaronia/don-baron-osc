/**
 * BARON Humor — mostra mensagens leves após ações do usuário.
 * Discreto, profissional, nunca atrapalha a operação.
 */
import { toast } from "@/components/ui/use-toast";
import { getActionHumor } from "@/lib/baronPersonality";
import { Brain } from "lucide-react";

/**
 * Mostra uma mensagem de humor do BARON após uma ação.
 * @param {string} action - chave da ação (caixa_fechado, boleto_pago, etc.)
 */
export function baronHumor(action) {
  const msg = getActionHumor(action);
  if (!msg) return;
  toast({
    title: (
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        <span className="font-semibold">BARON</span>
      </div>
    ),
    description: msg,
    duration: 4000,
  });
}