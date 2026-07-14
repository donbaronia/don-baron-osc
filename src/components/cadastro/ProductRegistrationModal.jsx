/**
 * ProductRegistrationModal — Modal autocontido de cadastro de produto.
 *
 * Carrega seus próprios dados (fornecedores, categorias, unidades, tags).
 * Aceita `prefill` para pré-preenchimento pelo BARON.
 * Chama `onSaved(product)` com o produto recém-criado.
 */
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { generateInternalCode } from "@/lib/masterData";
import ProductForm from "./ProductForm";

export default function ProductRegistrationModal({ open, onClose, prefill, onSaved }) {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [tags, setTags] = useState([]);
  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (open) {
      Promise.all([
        base44.entities.Supplier.list("-created_date", 200).catch(() => []),
        base44.entities.Category.list("-created_date", 200).catch(() => []),
        base44.entities.UnitOfMeasure.list("-created_date", 200).catch(() => []),
        base44.entities.Tag.list("-created_date", 200).catch(() => []),
      ]).then(([s, c, u, t]) => {
        setSuppliers(s); setCategories(c); setUnits(u); setTags(t);
      });
      // Construir prefill
      if (prefill) {
        setProduct({ internal_code: generateInternalCode(), ...prefill });
      } else {
        setProduct(null);
      }
    }
  }, [open]);

  return (
    <ProductForm
      open={open}
      onClose={onClose}
      product={product}
      onSaved={onSaved}
      suppliers={suppliers}
      categories={categories}
      units={units}
      tags={tags}
    />
  );
}