# Logos de marcas e ícones genéricos

Os logos só identificam a marca da máquina cadastrada pelo produtor. As marcas
pertencem aos seus donos; o app não tem relação com elas.

## Vetores (`logosVetoriais.ts`, gerado)

- **Simple Icons 16.35.0** — CC0 1.0 (https://simpleicons.org): John Deere, Mahindra,
  JCB, Caterpillar, Volkswagen, Ford, Toyota, Fiat, Chevrolet, Honda, Hyundai, Jeep,
  Renault, Nissan, Mitsubishi, IVECO, Scania, Volvo, Suzuki, Husqvarna. Cores oficiais
  do próprio Simple Icons.
- **Wikimedia Commons** — domínio público: Yanmar (`Yanmar logo flying-Y.svg`),
  Kubota (`Kubota Logo.svg`).

## Imagens (`assets/images/marcas/*.png`, recortadas e reduzidas)

| Arquivo | Origem (Wikimedia Commons) | Licença |
| --- | --- | --- |
| `masseyferguson.png` | `Logo Massey Ferguson.png`, autor: MF — só o símbolo | CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0) |
| `newholland.png` | `New Holland Logo 2023.png` — só o símbolo | Domínio público |
| `valtra.png` | `Valtra Logo Black Outline RGB.png` | Domínio público |
| `caseih.png` | `Case-agri-logo.svg` — sem a linha "AGRICULTURE" | Domínio público |

O recorte do `masseyferguson.png` é obra derivada e segue sob a mesma licença CC BY-SA 4.0.

## Ícones genéricos por tipo (`iconesGenericos.ts`, gerado)

- **Lucide 1.68.0** — ISC (https://lucide.dev): tractor, wheat, droplets, sprout, cog,
  truck, car, milk, wrench.

## Como adicionar uma marca

- Com vetor livre (Simple Icons): copiar o `d` do SVG em https://simpleicons.org e
  acrescentar uma entrada em `logosVetoriais.ts` (`viewBox: "0 0 24 24"` e a cor da marca).
- Só com imagem: colocar um PNG de até 144 px em `assets/images/marcas/` e registrar em
  `LOGOS_IMAGEM` (`index.ts`).
