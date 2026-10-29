Resistência — Memória, Cultura e Liberdade
Exposição digital educativa sobre o 4º eixo temático (Resistência) do Brasil Império (1822–1889). O site aborda capoeira, religiosidade, culinária, quilombos, resistência cotidiana e poesia social, com foco em acessibilidade, desempenho e precisão histórica.
Estrutura do Projeto
/
├── index.html    # Marcação semântica, SEO e acessibilidade
├── style.css     # Design tokens, componentes BEM, dark mode
├── script.js     # Módulos: UI, Navigation, ScrollAnimations
├── README.md
├── .gitignore
└── img/          # (opcional) imagens reais e og-resistencia.jpg

Tecnologias
·	HTML5 semântico (landmarks, ARIA, dados estruturados JSON-LD)
·	CSS3: Custom Properties (design tokens), Flexbox, Grid, clamp(), metodologia BEM
·	JavaScript Vanilla (ES6+), sem dependências
·	Fontes: Google Fonts (Playfair Display e Inter)
Como Executar
1.	Clone ou baixe o repositório.
2.	Abra o index.html em qualquer navegador moderno (Chrome, Firefox, Safari, Edge).
Não é necessário servidor. Para desenvolvimento, a extensão "Live Server" (VS Code) é recomendada.
Publicação no GitHub Pages
1.	Envie os arquivos para a raiz do repositório (branch main).
2.	Em Settings → Pages, escolha a branch main e a pasta / (root).
3.	O site ficará disponível em https://caragenteboadainternet1234-hub.github.io/resistencia-brasil-imperio/.
Checklist antes de publicar
·	URL real configurada no index.html (canonical, og:url e JSON-LD).
·	(Opcional) Adicionar uma imagem de compartilhamento 1200×630 e incluir as tags og:image e twitter:image (trocando twitter:card para summary_large_image).
·	Substituir os placeholders de imagem por imagens históricas reais, com alt, legenda e crédito da fonte.
·	Conferir se os links das referências que usam http:// já funcionam em https://.
Arquitetura
HTML
·	Skip link, landmarks (header, nav, main, footer, aside) e seções nomeadas com aria-labelledby.
·	Menu móvel com aria-expanded e aria-controls; região aria-live que anuncia o progresso de leitura.
·	Open Graph, Twitter Cards, canonical e JSON-LD.
·	Scripts com defer, imagens com loading="lazy", decoding="async" e width/height (evita salto de layout).
CSS
·	Tokens em três camadas: primitivos → semânticos → componentes. O dark mode (prefers-color-scheme) só remapeia os tokens semânticos.
·	BEM: .bloco__elemento--modificador (ex.: .timeline__card, .nav--open). Utilitários usam o prefixo u-.
·	Layout fluido: tipografia e espaçamentos com clamp(); apenas duas media queries (menu a partir de 64em e timeline a partir de 48em).
·	Animações somente com transform e opacity, desativadas em prefers-reduced-motion: reduce.
JavaScript
·	Um IIFE encapsula tudo; nada é exposto em window.
·	Módulos: UI (progresso, header, voltar ao topo), Navigation (menu e scroll spy), ScrollAnimations (IntersectionObserver).
·	Throttle por requestAnimationFrame no scroll, debounce no resize e delegação de eventos.
·	O JS usa atributos data-* como ganchos; o CSS usa classes. Os dois não dependem um do outro.
Acessibilidade
·	Contraste mínimo AA (4.5:1) para texto, nos temas claro e escuro.
·	Navegação completa por teclado, foco visível e tecla Esc para fechar o menu.
·	Respeita prefers-reduced-motion e prefers-color-scheme.
·	Sem JavaScript, todo o conteúdo continua visível e navegável.
Imagens
Para o projeto funcionar sem arquivos externos, as imagens são SVGs inline (gradientes) em tags <img>. Em produção, troque apenas o src (e, se quiser, adicione srcset e sizes) pelas imagens históricas reais. Não use loading="lazy" em imagens acima da dobra.
Créditos
Trabalho escolar — 4º Eixo: Resistência no Brasil Império. Desenvolvido para fins educacionais.
Fontes de referência: Arquivo Nacional, Fundação Cultural Palmares, IPHAN, Biblioteca Nacional (BNDigital) e Museu Afro Brasil.
