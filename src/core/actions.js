/**
 * DON BARON CORE — Action Definitions
 *
 * Catalogo central de todas as Actions do sistema.
 * Cada Action define: tipo, entidade, validacao, executor.
 *
 * O ActionEngine usa este catalogo para mapear intents da IA e
 * chamadas de UI para operacoes reais no banco.
 */
import { PersistenceEngine } from "./PersistenceEngine";

// Tipos de Action (PascalCase)
export const ActionTypes = {
  CREATE_PRODUCT: "CREATE_PRODUCT",
  CREATE_SUPPLIER: "CREATE_SUPPLIER",
  CREATE_STOCK_ENTRY: "CREATE_STOCK_ENTRY",
  CREATE_PAYMENT: "CREATE_PAYMENT",
  CREATE_DOCUMENT: "CREATE_DOCUMENT",
  MARK_PAYMENT_PAID: "MARK_PAYMENT_PAID",
  CREATE_FINANCIAL_TRANSACTION: "CREATE_FINANCIAL_TRANSACTION",
  CREATE_EMPLOYEE: "CREATE_EMPLOYEE",
  CREATE_COURIER: "CREATE_COURIER",
  CREATE_CUSTOMER: "CREATE_CUSTOMER",
  UPDATE_PRODUCT_STOCK: "UPDATE_PRODUCT_STOCK",
  DELETE_ENTITY: "DELETE_ENTITY",
};

// Mapa: ActionType -> executor
export const ActionRegistry = {
  [ActionTypes.CREATE_PRODUCT]: {
    entity: "Product",
    description: "Cadastra um novo produto",
    execute: (payload, opts) => PersistenceEngine.create("Product", payload, opts),
  },

  [ActionTypes.CREATE_SUPPLIER]: {
    entity: "Supplier",
    description: "Cadastra um novo fornecedor",
    execute: (payload, opts) => PersistenceEngine.create("Supplier", payload, opts),
  },

  [ActionTypes.CREATE_STOCK_ENTRY]: {
    entity: "Product",
    description: "Registra entrada de estoque em um produto",
    execute: async (payload, opts) => {
      const { product_id, quantity, ...rest } = payload;
      const product = await PersistenceEngine.findOne("Product", product_id);
      if (!product) throw new Error(`Produto nao encontrado: ${product_id}`);
      const newQty = (product.stock_quantity || 0) + Number(quantity);
      return PersistenceEngine.update(
        "Product",
        product_id,
        { stock_quantity: newQty, ...rest },
        opts
      );
    },
  },

  [ActionTypes.CREATE_PAYMENT]: {
    entity: "Payment",
    description: "Cria uma conta a pagar",
    execute: (payload, opts) => PersistenceEngine.create("Payment", payload, opts),
  },

  [ActionTypes.CREATE_DOCUMENT]: {
    entity: "DBDocument",
    description: "Cria um documento (NF, boleto, etc.)",
    execute: (payload, opts) => PersistenceEngine.create("DBDocument", payload, opts),
  },

  [ActionTypes.MARK_PAYMENT_PAID]: {
    entity: "Payment",
    description: "Marca uma conta como paga",
    execute: (payload, opts) =>
      PersistenceEngine.update(
        "Payment",
        payload.id,
        {
          status: "pago",
          payment_date: payload.payment_date || new Date().toISOString().slice(0, 10),
          payment_method: payload.payment_method || "pix",
          bank: payload.bank,
        },
        opts
      ),
  },

  [ActionTypes.CREATE_FINANCIAL_TRANSACTION]: {
    entity: "FinancialTransaction",
    description: "Cria uma transacao financeira",
    execute: (payload, opts) => PersistenceEngine.create("FinancialTransaction", payload, opts),
  },

  [ActionTypes.CREATE_EMPLOYEE]: {
    entity: "Employee",
    description: "Cadastra um funcionario",
    execute: (payload, opts) => PersistenceEngine.create("Employee", payload, opts),
  },

  [ActionTypes.CREATE_COURIER]: {
    entity: "Courier",
    description: "Cadastra um motoboy",
    execute: (payload, opts) => PersistenceEngine.create("Courier", payload, opts),
  },

  [ActionTypes.CREATE_CUSTOMER]: {
    entity: "Customer",
    description: "Cadastra um cliente",
    execute: (payload, opts) => PersistenceEngine.create("Customer", payload, opts),
  },

  [ActionTypes.UPDATE_PRODUCT_STOCK]: {
    entity: "Product",
    description: "Atualiza estoque de um produto",
    execute: (payload, opts) =>
      PersistenceEngine.update("Product", payload.product_id, { stock_quantity: payload.quantity }, opts),
  },

  [ActionTypes.DELETE_ENTITY]: {
    entity: null,
    description: "Exclui um registro (soft-delete)",
    execute: (payload, opts) => PersistenceEngine.delete(payload.entity, payload.id, opts),
  },
};

// Mapa de intenções em linguagem natural -> ActionType (para o Baron IA)
export const IntentPatterns = [
  { pattern: /criar?\s+(novo\s+)?(produto|item)/i, action: ActionTypes.CREATE_PRODUCT },
  { pattern: /criar?\s+(novo\s+)?(fornecedor)/i, action: ActionTypes.CREATE_SUPPLIER },
  { pattern: /adicionar?\s+(estoque|entrada)/i, action: ActionTypes.CREATE_STOCK_ENTRY },
  { pattern: /comprei\s+\d+/i, action: ActionTypes.CREATE_STOCK_ENTRY },
  { pattern: /criar?\s+(conta|boleto|pagar)/i, action: ActionTypes.CREATE_PAYMENT },
  { pattern: /enviar?\s+(boleto|nota)/i, action: ActionTypes.CREATE_DOCUMENT },
  { pattern: /pagar?\s+(boleto|conta)/i, action: ActionTypes.MARK_PAYMENT_PAID },
  { pattern: /cadast?rar?\s+(funcionario|colaborador)/i, action: ActionTypes.CREATE_EMPLOYEE },
  { pattern: /cadast?rar?\s+(motoboy|entregador)/i, action: ActionTypes.CREATE_COURIER },
  { pattern: /cadast?rar?\s+(cliente)/i, action: ActionTypes.CREATE_CUSTOMER },
];