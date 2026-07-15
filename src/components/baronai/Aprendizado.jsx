import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getUserRole } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BaronSelect } from "@/design-system";
import { GraduationCap, MessageCircle, Bug, Heart, Plus, Trash2, Loader2 } from "lucide-react";

export default function Aprendizado() {
  const { user } = useAuth();
  const role = getUserRole(user);
  const isAdmin = role === "administrador";
  const [history, setHistory] = useState([]);
  const [learning, setLearning] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "erro_corrigido", title: "", description: "" });

  const loadAll = async () => {
    const [hist, learn] = await Promise.allSettled([
      base44.entities.BaronAIHistory.list("-created_date", 500),
      base44.entities.BaronAILearning.list("-created_date", 200),
    ]);
    setHistory(hist.status === "fulfilled" ? hist.value : []);
    setLearning(learn.status === "fulfilled" ? learn.value : []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const frequentQuestions = (() => {
    const counts = {};
    history.forEach((h) => {
      const q = (h.question || "").toLowerCase().trim();
      if (!q) return;
      counts[q] = (counts[q] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count]) => ({ question, count }));
  })();

  const errors = learning.filter((l) => l.type === "erro_corrigido");
  const preferences = learning.filter((l) => l.type === "preferencia");

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await base44.entities.BaronAILearning.create({
        type: form.type,
        title: form.title,
        description: form.description,
        created_by_name: user?.full_name || "N/A",
      });
      setForm({ type: "erro_corrigido", title: "", description: "" });
      setShowForm(false);
      await loadAll();
    } catch (e) { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.BaronAILearning.delete(id);
      setLearning((prev) => prev.filter((l) => l.id !== id));
    } catch (e) { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <div className="flex items-start gap-3">
          <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-neutral-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Módulo de Aprendizado</p>
            <p className="mt-1 text-sm text-neutral-500">
              Este módulo armazena perguntas frequentes, erros corrigidos e preferências do usuário.
              Nenhuma IA pode alterar regras do sistema sem autorização do administrador.
            </p>
          </div>
        </div>
      </div>

      {/* Perguntas Frequentes */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-700">Perguntas Frequentes</h3>
        </div>
        {frequentQuestions.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma pergunta frequente registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {frequentQuestions.map((q, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3">
                <p className="text-sm text-neutral-700">{q.question}</p>
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">{q.count}x</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Erros Corrigidos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-700">Erros Corrigidos</h3>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 bg-white">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          )}
        </div>
        {errors.length === 0 && !showForm ? (
          <p className="text-sm text-neutral-400">Nenhum erro corrigido registrado.</p>
        ) : (
          <div className="space-y-2">
            {errors.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{e.title}</p>
                  {e.description && <p className="mt-0.5 text-sm text-neutral-500">{e.description}</p>}
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(e.id)} className="text-neutral-400 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preferências */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-700">Preferências do Usuário</h3>
          </div>
        </div>
        {preferences.length === 0 && !showForm ? (
          <p className="text-sm text-neutral-400">Nenhuma preferência registrada.</p>
        ) : (
          <div className="space-y-2">
            {preferences.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{p.title}</p>
                  {p.description && <p className="mt-0.5 text-sm text-neutral-500">{p.description}</p>}
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(p.id)} className="text-neutral-400 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && isAdmin && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700">Novo Registro de Aprendizado</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <BaronSelect value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={[{ value: "erro_corrigido", label: "Erro Corrigido" }, { value: "preferencia", label: "Preferência" }, { value: "pergunta_frequente", label: "Pergunta Frequente" }]} />
            </div>
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="gap-2 bg-neutral-900">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="bg-white">Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}