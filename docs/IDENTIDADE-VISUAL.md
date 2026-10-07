# Identidade visual

As cores principais da marca, decididas por Arthur em 07/10/2026, são o **verde militar** e o **cinza de cimento queimado**. Tudo vive em variáveis CSS no topo de `apps/web/src/styles.css`; nenhum componente deve usar uma cor de marca escrita à mão.

## Ideia

Um canteiro de obra. O nome é Alicerce, então a base é concreto: fundos e linhas em cinza de cimento, com a textura manchada do piso de cimento queimado no cabeçalho, na capa e no rodapé. O verde militar é a cor da marca: cabeçalho, botões principais, títulos de seção pequenos, números dos níveis e o progresso. O latão aparece só como brilho pequeno (anel de foco dentro do cabeçalho verde, item atual do menu, contador de revisões, marca-texto e o topo da pirâmide da capa).

## Paleta

| Papel | Variável | Claro | Escuro | Onde |
| --- | --- | --- | --- | --- |
| Fundo da página | `--bg` | `#efeeea` | `#141613` | corpo |
| Superfície | `--surface` | `#fbfbf9` | `#1b1e1a` | cartões, campos |
| Superfície 2 e 3 | `--surface-2`, `--surface-3` | `#e5e4df`, `#d9d8d2` | `#232722`, `#2d322b` | rodapé, cabeçalho de tabela, trilho do progresso |
| Texto | `--ink`, `--ink-2`, `--muted` | `#1d221c`, `#3d443b`, `#585e55` | `#e9e8e3`, `#c8c7c0`, `#a3a39b` | texto principal, secundário, apoio |
| Linhas | `--line`, `--line-strong` | `#d1cfc8`, `#8f8d85` | `#30352e`, `#687062` | divisórias; bordas de campos e botões |
| Verde militar (marca) | `--brand`, `--brand-2` | `#3b4a2a`, `#2f3c21` | `#2c3820`, `#232d19` | cabeçalho, painel do tutor, avisos |
| Botão principal | `--primary`, `--primary-2` | `#3b4a2a`, `#2f3c21` | `#5a6f2e`, `#4c5f25` | `.btn.primary`, botões alternados; no escuro é mais claro para não sumir no fundo |
| Verde de destaque | `--accent`, `--accent-ink`, `--accent-soft` | `#4e6324`, `#ffffff`, `#e1e6cf` | `#aec27a`, `#151a10`, `#2b331f` | chamada principal (`.btn.accent`), sobretítulos, números, etapa atual |
| Cimento | `--cement`, `--cement-2` | `#a3a29b`, `#c9c8c1` | `#6c6d66`, `#3a3c37` | faixa sob o cabeçalho, laje da pirâmide |
| Latão | `--brass`, `--brass-ink` | `#e3c16a`, `#1d221c` | `#d9b85e`, `#151a10` | foco no cabeçalho, menu atual, contador |
| Marca-texto | `--highlight` | `#ecd383` | `#6e5c22` | seleção, palavra destacada da capa, valores que mudaram |

As cores de estado (`--ok`, `--warn`, `--err`, `--info`, `--deep`) não são da marca. O sucesso (`--ok`) é um verde-azulado (`#1c6b52` no claro) para não se confundir com o verde militar: na árvore da trilha, "disponível" usa o verde da marca e "concluído" o verde de sucesso, com preenchimento diferente.

## Contraste

Todo par de texto e fundo passa de 4,5:1 nos dois temas, e as bordas de campos e botões (`--line-strong`) passam de 3:1 sobre a superfície. Alguns valores medidos:

| Par | Claro | Escuro |
| --- | --- | --- |
| Texto sobre fundo | 13,9 | 14,7 |
| Texto de apoio sobre fundo | 5,8 | 7,2 |
| Verde de destaque sobre fundo | 5,8 | 9,4 |
| Texto sobre o cabeçalho | 8,6 | 10,7 |
| Texto do botão principal | 9,6 | 5,6 |
| Latão sobre o cabeçalho (anel de foco) | 5,5 | 6,5 |

A textura fica atrás de texto só na capa. Medido nos pixels da página, no pior 1% do fundo manchado o texto de apoio ainda tem 4,8:1 (claro) e 5,2:1 (escuro). Por isso a textura não vai para trás de lições ou de texto longo.

O teste `e2e/a11y.spec.ts` roda o axe (WCAG 2.2 AA) em todas as páginas e o contraste do tema escuro em todas elas e em etapas de lição. O axe não consegue medir texto sobre imagem de fundo: quem mudar a textura mede de novo como acima.

## Textura de cimento queimado

Duas camadas em SVG gerado (`feTurbulence`), sem baixar imagem: `--tex-grain` (grão fino, ladrilho de 220 px) e `--tex-mottle` (manchas largas, ladrilho de 640 px). A região do filtro cobre o ladrilho inteiro (`x=0 y=0 width=100% height=100%`), senão aparecem emendas. No tema escuro as manchas são claras e mais fracas.

## Logo e ícone

Blocos empilhados: a laje de cimento embaixo, dois blocos verde-claros e o bloco de latão no topo, sobre o verde militar no ícone (`apps/web/public/favicon.svg`) e direto no cabeçalho (`Logo` em `apps/web/src/components/Layout.tsx`). A cor do navegador (`theme-color` em `apps/web/index.html` e `manifest.webmanifest`) é o verde militar `#3b4a2a`.

## Capa

A pirâmide de 15 blocos (`Fundacao` em `apps/web/src/pages/Home.tsx`) mostra os níveis 0 a 14 como uma obra: a fileira de cimento embaixo (níveis 0 a 4, os fundamentos), três fileiras de verde e o latão no topo. É decorativa (`aria-hidden`), porque a lista de níveis vem logo abaixo, e some em telas com menos de 860 px para a chamada principal ficar visível sem rolar.
