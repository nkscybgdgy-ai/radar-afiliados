# ⛔ USO INTERNO, SOMENTE PARA TESTE. NUNCA PUBLICAR.

**Estas fotos servem apenas para testar o design dos pins em desenvolvimento.** Elas **nunca** podem aparecer em nada público: site, landing page, redes sociais, anúncios, materiais de divulgação ou qualquer pin postado de verdade.

- **Em produção os pins usam a foto do produto vinda da Shopee** (`imageUrl` da API), nunca estas.
- Proteções no código: `TestPhotoProvider` (`src/generator/photos.ts`) **recusa** qualquer produto que não seja de demonstração; `assets/` não é servido pelo Next (não está em `public/`) e não entra no pacote de deploy; a tela do gerador avisa "Foto de teste: uso interno, não publique" e um teste impede que o resto do código leia esta pasta.
- Pins gerados com `DATA_SOURCE=mock` contêm estas fotos: **não os poste**.
- Antes do lançamento: apagar esta pasta (ou confirmar que fica fora do build) e conferir que `DATA_SOURCE=shopee`.

---

## Origem e licença das fotos de teste

**Atenção: o que está aqui foi informado pela pessoa dona do projeto e NÃO foi verificado por nós.**
As fotos chegaram como capturas de tela (sem link nem ID do Pexels e sem o nome do fotógrafo; o campo veio como `[nome do fotógrafo]`, em branco). Antes do lançamento é preciso localizar cada foto no Pexels, conferir a licença e preencher o fotógrafo.

Licença informada: **Pexels License** (uso livre, inclusive comercial, sem obrigação de atribuição; não é permitido vender a foto como está nem sugerir endosso de pessoas ou marcas que apareçam nela. Texto oficial: https://www.pexels.com/license/).

| Arquivo | Categoria | Origem informada | Fotógrafo | Licença informada | Página no Pexels | Recebida em |
|---|---|---|---|---|---|---|
| `cozinha.jpg` | cozinha | Pexels (captura de tela) | **não informado** | Pexels License (não verificada) | **a localizar** | 2026-10-07 |
| `organizacao.jpg` | organização | Pexels (captura de tela) | **não informado** | Pexels License (não verificada) | **a localizar** | 2026-10-07 |
| `limpeza.jpg` | limpeza | Pexels (captura de tela) | **não informado** | Pexels License (não verificada) | **a localizar** | 2026-10-07 |
| `banheiro.jpg` | banheiro | Pexels (captura de tela) | **não informado** | Pexels License (não verificada) | **a localizar** | 2026-10-07 |
| `decoracao.jpg` | decoração | Pexels (captura de tela) | **não informado** | Pexels License (não verificada) | **a localizar** | 2026-10-07 |
| `alt-toalheiro.jpg` | reserva (banheiro/organização) | Pexels (captura de tela) | **não informado** | Pexels License (não verificada) | **a localizar** | 2026-10-07 |

## Tratamento aplicado
Os arquivos originais eram capturas de tela de ~1320 px de largura, com setas de carrossel (‹ ›) e bordas brancas. Foram **apenas recortados** (setas e bordas removidas, ~1240 px de largura) e reexportados em JPEG; nenhuma edição de cor ou conteúdo.

## Pontos de atenção (a decidir antes de usar em pin real)
- `cozinha.jpg`: os rótulos dos potes estão em **russo (cirílico) com preços em rublos**. Ao lado de um preço em R$ pode confundir o comprador.
- `alt-toalheiro.jpg`: aparece a marca **ipuro** no difusor. `banheiro.jpg`: frascos com rótulo de aparência de marca. A licença do Pexels proíbe sugerir endosso de marcas.
- `limpeza.jpg`: rótulos em inglês ("MULTI-PURPOSE CLEANER"), sem marca registrada identificável.
- Resolução: ~1240 px de largura serve para pin 1000×1500, mas é de captura de tela (pode ter perda de qualidade). O ideal é baixar o original do Pexels.
- O script `npm run photos:fetch` **sobrescreve este arquivo**; se for usado, conferir as entradas depois.
