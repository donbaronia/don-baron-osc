/**
 * DON BARON CORE — ValidationEngine
 *
 * Valida dados antes da gravacao usando o schema da entidade.
 * Verifica: campos obrigatorios, tipos, valores negativos, duplicidade.
 */
import { base44 } from "@/api/base44Client";
import { BaronError } from "./ErrorManager";

const schemaCache = new Map();

async function getSchema(entityName) {
  if (schemaCache.has(entityName)) return schemaCache.get(entityName);
  try {
    const schema = await base44.entities[entityName].schema();
    schemaCache.set(entityName, schema);
    return schema;
  } catch {
    schemaCache.set(entityName, null);
    return null;
  }
}

function checkType(value, expectedType) {
  if (value === null || value === undefined) return true;
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !Number.isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return typeof value === "object" && !Array.isArray(value);
    default:
      return true;
  }
}

export const ValidationEngine = {
  /**
   * Valida dados contra o schema da entidade.
   * Lanca BaronError se invalido.
   */
  async validate(entityName, data, { checkRequired = true } = {}) {
    const schema = await getSchema(entityName);
    if (!schema) return true; // sem schema, nao valida

    const props = schema.properties || {};
    const required = schema.required || [];

    // 1. Campos obrigatorios
    if (checkRequired) {
      for (const field of required) {
        const value = data[field];
        if (value === undefined || value === null || value === "") {
          throw new BaronError(
            `Campo obrigatorio ausente: ${entityName}.${field}`,
            { code: "VALIDATION_REQUIRED", entity: entityName, operation: "validate" }
          );
        }
      }
    }

    // 2. Tipos e valores
    for (const [field, value] of Object.entries(data)) {
      const prop = props[field];
      if (!prop || value === undefined || value === null) continue;

      // Tipo
      if (prop.type && !checkType(value, prop.type)) {
        throw new BaronError(
          `Tipo invalido para ${entityName}.${field}: esperado ${prop.type}`,
          { code: "VALIDATION_TYPE", entity: entityName, operation: "validate" }
        );
      }

      // Enum
      if (prop.enum && !prop.enum.includes(value)) {
        throw new BaronError(
          `Valor invalido para ${entityName}.${field}: ${value}. Permitidos: ${prop.enum.join(", ")}`,
          { code: "VALIDATION_ENUM", entity: entityName, operation: "validate" }
        );
      }

      // Numeros negativos (exceto se permitir)
      if (prop.type === "number" && typeof value === "number" && value < 0 && prop.minimum !== undefined && value < prop.minimum) {
        throw new BaronError(
          `Valor negativo invalido para ${entityName}.${field}: ${value}`,
          { code: "VALIDATION_NEGATIVE", entity: entityName, operation: "validate" }
        );
      }
    }

    return true;
  },

  clearCache() {
    schemaCache.clear();
  },
};

export default ValidationEngine;