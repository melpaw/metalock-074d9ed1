# Plano de melhoria — Cliente, Admin, Suporte e Idiomas

Escopo grande, dividido em 5 frentes. Vou executar tudo em uma sequência de edições, mas listo aqui para você aprovar antes de eu começar.

## 1. Dashboard do cliente (`/app`)

- **Ilha principal — Saldo com donut chart**
  - Card grande com valor total em USD/EUR (respeitando moeda de exibição do perfil).
  - Gráfico donut (Recharts) mostrando distribuição percentual por moeda (BTC, ETH, USDT, etc.).
  - Legenda ao lado com moeda, % e valor.
  - Rodapé pequeno "N moedas em carteira" — substitui a ilha atual "Moedas em carteira".
- **Ilha "Minhas carteiras"** logo abaixo, redesenhada:
  - Lista mais rica: ícone, símbolo, nome, saldo, valor em fiat, mini-sparkline 7d (variação), % 24h em verde/vermelho.
- **Remover** a ilha "Investimentos ativos" da home.

## 2. Aba "Carteira" do cliente (`/app/wallet`)

- Mesmo padrão visual da home: cards com gradientes suaves, tipografia hierárquica.
- Cada moeda como card expansível com: saldo disponível, bloqueado, valor fiat, sparkline, botões Depositar/Sacar/Trocar.

## 3. Área de Perfil do cliente (nova)

- Novo item **"Perfil"** no topbar/sidebar do cliente com o nome do usuário e avatar.
- Rota `/app/profile` com sub-abas:
  - **Informações** — nome, email, telefone, endereço, moeda de exibição, idioma. Edição inline.
  - **Segurança** — troca de senha, 2FA (setup TOTP), sessões ativas.
  - **KYC & Documentos** — status atual, envio de documentos, histórico.
- **Remover** os itens "KYC" e "Segurança" da sidebar do cliente (agora vivem dentro de Perfil).

## 4. Admin — detalhe do cliente

- Adicionar a aba **"Suporte"** ao lado de Perfil / Carteira / Transações, listando tickets daquele cliente com acesso ao chat.
- Aplicar o mesmo tratamento visual (cards com hierarquia, donut de patrimônio do cliente no header do detalhe, KPIs compactos).
- Corrigir o chat de suporte:
  - Envio de mensagem em tempo real (Supabase Realtime já no projeto).
  - Indicador de "digitando", timestamps, avatar do agente com `agent_display_name`.
  - Marcar mensagens como lidas.
  - Testar com Playwright headless.

## 5. Internacionalização PT / EN / DE

- Adicionar `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- Estrutura `src/i18n/` com `pt.json`, `en.json`, `de.json` — chaves por namespace (common, auth, app, admin, wallet, profile, support, kyc).
- Seletor de idioma no header (persistido em `profiles.locale` e localStorage).
- Varrer todos os textos hardcoded das telas do cliente, admin, auth, emails de UI e substituir por `t("chave")`. Traduzir todos para os 3 idiomas.
- Default = idioma do navegador, fallback = PT.

## Detalhes técnicos

- **Donut**: `recharts` já instalado, usar `<PieChart>` com `innerRadius`.
- **Sparkline 7d**: buscar `market_chart` do CoinGecko via `getMarketPrices` estendido (novo server fn `getMarketSparklines`).
- **Perfil**: nova migração adiciona `locale` e `display_currency` em `profiles` se ainda não existirem; RLS já permite `self update`.
- **Chat realtime**: canal `ticket:{id}` já existe? Verificar `TicketConversation.tsx` — adicionar subscription se faltar, e broadcast de mensagens novas.
- **i18n**: sem SSR-i18n pesado — hidratação client-side é suficiente para este app autenticado.

## Ordem de execução

1. Migração (locale/display_currency em profiles se faltar).
2. Instalar i18next + criar arquivos base + seletor no header.
3. Redesign home do cliente (donut + carteiras).
4. Redesign wallet.
5. Rota `/app/profile` + sub-abas + remoção dos itens da sidebar.
6. Admin: aba Suporte + redesign detalhe do cliente.
7. Fix chat realtime + teste Playwright.
8. Tradução completa dos 3 idiomas + varredura de strings.
9. Build + typecheck + verificação visual.

## Fora do escopo (a menos que você peça)

- Novos fluxos de negócio (novos tipos de transação, planos, etc.).
- Personalização de emails (depende do domínio, como já conversamos).
- Mudanças no schema além de `locale`/`display_currency`.

**Confirma que posso executar tudo isso?** É um trabalho grande (várias horas de edição). Se preferir, posso fazer em fases — por exemplo começando pelas frentes 1+2+3 (cliente) e depois 4+5 num segundo turno.
