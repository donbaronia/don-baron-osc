/**
 * DON BARON CORE 3.0 — Services barrel
 *
 * Ponto único de importação para a camada de Application Services.
 * Nenhuma tela/componente/motor deve importar base44 diretamente —
 * devem importar de "@/services".
 *
 *   import { AppService } from "@/services";
 *   await AppService.create("Employee", data, { module: "rh" });
 */
export { AppService } from "./ApplicationService";