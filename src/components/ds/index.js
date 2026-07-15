/**
 * DON BARON DESIGN SYSTEM 2.0 — Barril de componentes compartilhados.
 * Toda página importa daqui. Nenhuma página cria componente próprio.
 */
export { Button } from "@/components/ui/button";
export { Input } from "@/components/ui/input";
export { Badge } from "@/components/ui/badge";
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui/select";
export { Card } from "@/components/ui/card";
export {
  Dialog as Modal,
  DialogContent as ModalContent,
  DialogHeader as ModalHeader,
  DialogFooter as ModalFooter,
  DialogTitle as ModalTitle,
  DialogDescription as ModalDescription,
} from "@/components/ui/dialog";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
export { Alert } from "@/components/ui/alert";
export { Toaster } from "@/components/ui/toaster";
export { useToast } from "@/components/ui/use-toast";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export { DataGrid } from "@/components/ds/DataGrid";