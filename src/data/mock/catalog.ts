import type { HomeCategory } from "@/domain/types";

/** Nomes fictícios por categoria. Dados de demonstração, não são produtos reais. */
export const MOCK_NAMES: Record<HomeCategory, string[]> = {
  organizacao: [
    "Organizador de Gaveta Modular 8 Peças", "Caixa Organizadora Empilhável 20L", "Cabides Aveludados Kit 30 Un",
    "Organizador de Sapatos Vertical", "Prateleira Multiuso para Armário", "Cesto Organizador de Tecido Dobrável",
    "Organizador de Cabos e Fios Kit 12 Un", "Suporte Adesivo para Cozinha Sem Furo", "Colmeia Organizadora de Roupas Íntimas",
    "Sacos a Vácuo para Roupas 6 Un", "Organizador de Geladeira Transparente", "Porta-Treco Giratório de Mesa",
  ],
  cozinha: [
    "Kit Potes Herméticos de Vidro 10 Peças", "Escorredor de Louça Dobrável Inox", "Jogo de Facas com Suporte 6 Peças",
    "Tábua de Corte Bambu com Calha", "Porta-Temperos Giratório 16 Potes", "Garrafa Térmica 1L Inox",
    "Fritadeira Elétrica Air Fryer 4L", "Descascador Multifuncional 5 em 1", "Espremedor de Alho Inox",
    "Forma de Silicone Antiaderente Kit 4", "Balança Digital de Cozinha 10kg", "Ralador Multiuso 4 Faces",
  ],
  limpeza: [
    "Mop Giratório 360° com Balde", "Esponja Mágica Kit 20 Un", "Rodo Mágico Dupla Face",
    "Pano de Microfibra Kit 10 Un", "Vassoura Mágica de Silicone", "Escova Elétrica de Limpeza Recarregável",
    "Luva de Limpeza Reforçada", "Removedor de Pelos de Pet Reutilizável", "Aspirador de Pó Portátil Sem Fio",
    "Borrifador Spray 500ml Kit 3", "Escova para Frestas e Rejuntes", "Limpa Vidros Magnético",
  ],
  banheiro: [
    "Tapete Antiderrapante para Box", "Suporte Ventosa para Shampoo", "Cortina de Box Impermeável",
    "Kit Acessórios para Banheiro 5 Peças", "Lixeira com Tampa Pedal 5L", "Porta-Papel Higiênico Adesivo",
    "Escova Sanitária com Suporte", "Saboneteira Dupla com Dreno", "Prateleira de Canto para Chuveiro",
    "Toalha de Banho Fio Penteado", "Dispenser de Sabonete Automático", "Organizador de Pia Giratório",
  ],
  decoracao: [
    "Luminária LED de Mesa Touch", "Vaso Decorativo Cerâmica Nórdico", "Quadro Decorativo Kit 3 Telas",
    "Fita LED RGB 5 Metros com Controle", "Relógio de Parede Silencioso", "Capa de Almofada Veludo 45x45",
    "Espelho Redondo Decorativo 50cm", "Manta Decorativa para Sofá", "Planta Artificial Folhagem Premium",
    "Cortina Blackout Térmica", "Difusor de Aromas com Varetas", "Porta-Retrato Múltiplo Parede",
  ],
};
