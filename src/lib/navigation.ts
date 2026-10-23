import {
  LayoutDashboard,
  History,
  Settings2,
  Route,
  Building2,
  Files,
  ScanSearch,
  BookOpenText,
} from "lucide-react";
export const navigation = [
  { title: "Visão geral", href: "/painel", icon: LayoutDashboard },
  { title: "Consulta de CNPJ", href: "/consulta-cnpj", icon: Building2 },
  { title: "Documentos fiscais", href: "/documentos", icon: Files },
  { title: "Validador de XML", href: "/validador", icon: ScanSearch },
  { title: "Histórico de atividade", href: "/historico", icon: History },
  { title: "Configurações", href: "/configuracoes", icon: Settings2 },
  { title: "Etapas do projeto", href: "/projeto", icon: Route },
];
export const modules = [
  {
    title: "Consulta de CNPJ",
    icon: Building2,
    stage: 2,
    description:
      "Dados cadastrais, fontes identificadas e verificação de IE conforme disponibilidade.",
  },
  {
    title: "Documentos fiscais",
    icon: Files,
    stage: 3,
    description:
      "Importação de XML e ZIP, análises, filtros e exportações dos seus documentos.",
  },
  {
    title: "Validador de XML",
    icon: ScanSearch,
    stage: 4,
    description:
      "Estrutura, schemas XSD oficiais e regras locais com referências verificáveis.",
  },
  {
    title: "Consulta de rejeições",
    icon: BookOpenText,
    stage: 5,
    description:
      "Busca por código ou mensagem, explicações e fontes oficiais e Oobj.",
  },
];
