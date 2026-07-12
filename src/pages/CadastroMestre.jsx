import React from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProductList from "@/components/cadastro/ProductList";
import SupplierList from "@/components/cadastro/SupplierList";
import CategoryManager from "@/components/cadastro/CategoryManager";
import UnitManager from "@/components/cadastro/UnitManager";
import TagManager from "@/components/cadastro/TagManager";

export default function CadastroMestre() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Cadastro" subtitle="Produtos, fornecedores, categorias, unidades e tags." />
      <Tabs defaultValue="produtos" className="mt-6">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>
        <TabsContent value="produtos" className="mt-4"><ProductList /></TabsContent>
        <TabsContent value="fornecedores" className="mt-4"><SupplierList /></TabsContent>
        <TabsContent value="categorias" className="mt-4"><CategoryManager /></TabsContent>
        <TabsContent value="unidades" className="mt-4"><UnitManager /></TabsContent>
        <TabsContent value="tags" className="mt-4"><TagManager /></TabsContent>
      </Tabs>
    </div>
  );
}