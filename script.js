/**
 * RESISTÊNCIA — Memória, Cultura e Liberdade
 * script.js
 *
 * ARQUITETURA
 *   Um único IIFE encapsula tudo: nada vaza para `window`, então não há
 *   risco de colisão com bibliotecas de terceiros. Dentro dele, módulos
 *   (também IIFEs) com responsabilidade única e API mínima: { init }.
 *
 *     Utils             → helpers puros (throttle por frame, debounce, seletores)
 *     UI                → barra de progresso, estado do header, "voltar ao topo",
 *                         região aria-live
 *     Navigation        → menu mobile (a11y completa) + scroll spy
 *     ScrollAnimations  → revelação de elementos ao rolar (IntersectionObserver)
 *
 *   Acoplamento: o JS encontra elementos por [data-*] (hooks de comportamento),
 *   e o CSS estiliza por classes BEM. Renomear uma classe nunca quebra o script.
 *
 *   Este arquivo é carregado com `defer` (executa após o parse do DOM).
 */
(() => {
    'use strict';

    /* ======================================================================
       CONFIG — constantes imutáveis (deep freeze).
       Centralizar valores "mágicos" evita números soltos pelo código e
       torna o ajuste fino uma edição em um único lugar.
       ====================================================================== */
    const deepFreeze = (obj) => {
        Object.values(obj).forEach((value) => {
            if (value && typeof value === 'object') deepFreeze(value);
        });
        return Object.freeze(obj);
    };

    const CONFIG = deepFreeze({
        selectors: {
            header: '[data-header]',
            progress: '[data-progress]',
            liveRegion: '[data-live-region]',
            backToTop: '[data-back-to-top]',
            focusTop: '[data-focus-top]',
            navToggle: '[data-nav-toggle]',
            nav: '[data-nav]',
            navLinks: '[data-nav] a[href^="#"]',
            spySections: 'main section[id]',
            reveal: '.reveal',
        },
        classes: {
            headerScrolled: 'site-header--scrolled',
            navOpen: 'nav--open',
            backToTopVisible: 'back-to-top--visible',
            revealVisible: 'reveal--visible',
        },
        scroll: {
            headerOffset: 50,        // px rolados para ativar a sombra do header
            backToTopOffset: 500,    // px rolados para exibir "voltar ao topo"
            announceDelay: 800,      // ms de calmaria antes de anunciar o progresso
        },
        media: {
            navDesktop: '(min-width: 64em)',            // deve espelhar o breakpoint do CSS
            reducedMotion: '(prefers-reduced-motion: reduce)',
        },
        observer: {
            reveal: { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
            // Faixa fina (~5%) a 40% do topo da viewport: a seção que a cruza é a "atual".
            spy: { rootMargin: '-40% 0px -55% 0px' },
        },
        resizeDebounce: 150,
    });

    const { selectors: SEL, classes: CLS } = CONFIG;

    /* ======================================================================
       UTILS
       ====================================================================== */
    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

    // MediaQueryList única e reutilizada (evita recriar a cada chamada).
    const reducedMotion = window.matchMedia(CONFIG.media.reducedMotion);

    /**
     * THROTTLE POR FRAME (requestAnimationFrame).
     * Eventos de scroll disparam dezenas de vezes por segundo — mais que a taxa
     * de repintura. Executar a lógica no máximo UMA vez por frame:
     *   - elimina trabalho desperdiçado;
     *   - alinha as escritas no DOM ao ciclo de renderização do navegador;
     *   - ao contrário de um throttle por tempo (ex.: 100ms), não deixa a barra
     *     de progresso "engasgar", pois acompanha 60fps.
     * Guarda os argumentos mais recentes: só o último valor importa.
     */
    const rafThrottle = (fn) => {
        let frame = 0;
        let lastArgs = [];
        return (...args) => {
            lastArgs = args;
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                fn(...lastArgs);
            });
        };
    };

    /**
     * DEBOUNCE: só executa depois que o evento "silencia" por `wait` ms.
     * Ideal para resize (recalcular medidas a cada pixel arrastado é inútil)
     * e para anúncios de acessibilidade (evita falar durante a rolagem).
     */
    const debounce = (fn, wait) => {
        let timer = 0;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), wait);
        };
    };

    // Type guard usado pelos handlers delegados: event.target nem sempre é um Element.
    const isElement = (node) => node instanceof Element;

    /* ======================================================================
       MÓDULO: UI
       Progresso de leitura, estado do header, botão "voltar ao topo" e
       região aria-live. Possui o ÚNICO listener de scroll da página.
       ====================================================================== */
    const UI = (() => {
        const refs = {};
        const state = {
            maxScroll: 1,       // altura rolável total (cache, ver measure())
            scrolled: false,
            fabVisible: false,
            milestone: 0,       // 0..4 (a cada 25%)
            announced: 0,
        };

        /**
         * CACHE DE MEDIDAS. Ler scrollHeight/clientHeight dentro do handler de
         * scroll forçaria o navegador a recalcular layout a cada frame
         * ("layout thrashing"). Medimos só quando algo pode ter mudado:
         * resize (debounced), load e fonts.ready (a troca de fonte altera a altura).
         */
        const measure = () => {
            const { scrollHeight, clientHeight } = document.documentElement;
            state.maxScroll = Math.max(scrollHeight - clientHeight, 1);
        };

        // Atualiza a região aria-live (polite: espera o leitor terminar a fala atual).
        const announce = (message) => {
            if (refs.live) refs.live.textContent = message;
        };

        // Debounce: se a pessoa rola ou salta por âncoras, só anuncia o ponto final.
        const announceProgress = debounce(() => {
            if (state.milestone === state.announced) return;
            state.announced = state.milestone;

            const { milestone } = state;
            if (milestone === 0) announce('Início da página.');
            else if (milestone === 4) announce('Fim da página.');
            else announce(`${milestone * 25}% da página percorrida.`);
        }, CONFIG.scroll.announceDelay);

        const onScroll = rafThrottle(() => {
            // scrollY pode ser negativo no "overscroll" do iOS; clamp em 0..1.
            const y = Math.max(window.scrollY, 0);
            const progress = Math.min(y / state.maxScroll, 1);

            // transform: scaleX → compositor/GPU. Animar `width` forçaria layout a cada frame.
            refs.progress?.style.setProperty('transform', `scaleX(${progress})`);

            // Só toca no DOM quando o estado MUDA (classList em todo frame seria ruído).
            const scrolled = y > CONFIG.scroll.headerOffset;
            if (scrolled !== state.scrolled) {
                state.scrolled = scrolled;
                refs.header?.classList.toggle(CLS.headerScrolled, scrolled);
            }

            const fabVisible = y > CONFIG.scroll.backToTopOffset;
            if (fabVisible !== state.fabVisible) {
                state.fabVisible = fabVisible;
                refs.fab?.classList.toggle(CLS.backToTopVisible, fabVisible);
            }

            state.milestone = progress >= 0.99 ? 4 : Math.floor(progress * 4);
            announceProgress();
        });

        // Delegação: um único listener no document atende o botão "voltar ao topo".
        const onClick = (event) => {
            if (!isElement(event.target) || !event.target.closest(SEL.backToTop)) return;

            window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
            // Foco volta ao início da página (logo): quem navega por teclado
            // não fica "preso" na posição do botão que acabou de sumir.
            $(SEL.focusTop)?.focus({ preventScroll: true });
        };

        const refresh = () => {
            measure();
            onScroll();
        };

        const init = () => {
            Object.assign(refs, {
                header: $(SEL.header),
                progress: $(SEL.progress),
                live: $(SEL.liveRegion),
                fab: $(SEL.backToTop),
            });

            measure();

            // { passive: true } promete ao navegador que não haverá preventDefault():
            // ele pode rolar sem esperar o JS → scroll mais fluido.
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', debounce(refresh, CONFIG.resizeDebounce), { passive: true });
            window.addEventListener('load', refresh, { once: true });
            document.fonts?.ready.then(refresh);

            document.addEventListener('click', onClick);

            onScroll(); // estado correto se a página recarregar no meio do scroll
        };

        return { init, announce };
    })();

    /* ======================================================================
       MÓDULO: Navigation
       Menu mobile + scroll spy.
       ====================================================================== */
    const Navigation = (() => {
        const refs = {};
        const state = { open: false };

        /**
         * Única função que muda o estado do menu. Mantém, em um só lugar,
         * os três "espelhos" do estado: ARIA (aria-expanded/label),
         * classe visual (CSS) e foco. Evita dessincronização.
         */
        const setOpen = (open, { restoreFocus = false } = {}) => {
            if (!refs.toggle || open === state.open) return;

            state.open = open;
            refs.toggle.setAttribute('aria-expanded', String(open));
            refs.toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
            refs.nav.classList.toggle(CLS.navOpen, open);

            if (!open && restoreFocus) refs.toggle.focus();
        };

        /**
         * EVENT DELEGATION: UM listener no document trata o botão, todos os
         * links do menu e o clique fora. Em vez de N listeners (1 por link),
         * temos 1 → menos memória, e links futuros funcionam sem novo cadastro.
         * `closest()` resolve o alvo mesmo se o clique cair num elemento filho.
         */
        const onClick = (event) => {
            const { target } = event;
            if (!isElement(target)) return;

            if (target.closest(SEL.navToggle)) {
                setOpen(!state.open);
            } else if (target.closest(`${SEL.nav} a`)) {
                setOpen(false);                                  // escolheu uma seção
            } else if (state.open && !target.closest(SEL.nav)) {
                setOpen(false);                                  // clicou fora
            }
        };

        // ESC fecha o menu e devolve o foco ao botão (padrão WAI-ARIA para disclosure).
        const onKeydown = (event) => {
            if (event.key === 'Escape' && state.open) {
                setOpen(false, { restoreFocus: true });
            }
        };

        // Se o foco (Tab) sair do header com o menu aberto, fecha-o:
        // evita um painel aberto "esquecido" cobrindo o conteúdo.
        const onFocusIn = (event) => {
            if (state.open && isElement(event.target) && !event.target.closest(SEL.header)) {
                setOpen(false);
            }
        };

        /**
         * SCROLL SPY com IntersectionObserver (sem listener de scroll):
         * marca no menu a seção visível usando aria-current="location".
         * O callback é agrupado em rafThrottle: várias seções podem cruzar a
         * faixa no mesmo frame e só o resultado final é escrito no DOM.
         */
        const initScrollSpy = () => {
            if (!('IntersectionObserver' in window)) return;

            const links = new Map($$(SEL.navLinks).map((link) => [link.hash.slice(1), link]));
            const sections = $$(SEL.spySections);
            if (!links.size || !sections.length) return;

            let currentId = '';
            const setCurrent = rafThrottle((id) => {
                if (id === currentId) return;
                links.get(currentId)?.removeAttribute('aria-current');
                links.get(id)?.setAttribute('aria-current', 'location');   // seções fora do menu: só limpa
                currentId = id;
            });

            const observer = new IntersectionObserver((entries) => {
                const active = entries.filter(({ isIntersecting }) => isIntersecting).pop();
                if (active) setCurrent(active.target.id);
            }, { rootMargin: CONFIG.observer.spy.rootMargin });

            sections.forEach((section) => observer.observe(section));
        };

        const init = () => {
            refs.toggle = $(SEL.navToggle);
            refs.nav = $(SEL.nav);
            if (!refs.toggle || !refs.nav) return;   // página sem menu: módulo inerte

            document.addEventListener('click', onClick);
            document.addEventListener('keydown', onKeydown);
            document.addEventListener('focusin', onFocusIn);

            // matchMedia 'change' dispara só quando CRUZA o breakpoint — mais eficiente
            // que ouvir resize. Ao ir para desktop, o painel mobile é resetado.
            // (`?.` protege Safari < 14, onde MediaQueryList não tem addEventListener.)
            window.matchMedia(CONFIG.media.navDesktop).addEventListener?.('change', ({ matches }) => {
                if (matches) setOpen(false);
            });

            initScrollSpy();
        };

        return { init };
    })();

    /* ======================================================================
       MÓDULO: ScrollAnimations
       Revela elementos .reveal ao entrarem na viewport.
       ====================================================================== */
    const ScrollAnimations = (() => {
        const reveal = (element) => element.classList.add(CLS.revealVisible);

        const init = () => {
            const items = $$(SEL.reveal);
            if (!items.length) return;

            // Sem suporte a IO ou com "reduzir movimento": mostra tudo, sem animar.
            if (!('IntersectionObserver' in window) || reducedMotion.matches) {
                items.forEach(reveal);
                return;
            }

            /**
             * IntersectionObserver já é assíncrono e agrupado pelo navegador: não
             * depende de scroll listener e não precisa de throttle de tempo.
             * Mesmo assim, as ESCRITAS no DOM são enfileiradas e aplicadas em um
             * único requestAnimationFrame — se muitos elementos entrarem de uma vez
             * (rolagem rápida, âncora distante), evitamos várias pequenas
             * invalidações de estilo e a animação começa sincronizada.
             */
            const queue = new Set();
            const flush = rafThrottle(() => {
                queue.forEach(reveal);
                queue.clear();
            });

            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(({ isIntersecting, target }) => {
                    if (!isIntersecting) return;
                    queue.add(target);
                    obs.unobserve(target);    // revelou uma vez → para de observar (libera memória)
                });
                flush();
            }, CONFIG.observer.reveal);

            items.forEach((item) => observer.observe(item));

            // Se a pessoa ativar "reduzir movimento" com a página aberta, revela o restante.
            reducedMotion.addEventListener?.('change', ({ matches }) => {
                if (!matches) return;
                observer.disconnect();
                items.forEach(reveal);
            });
        };

        return { init };
    })();

    /* ======================================================================
       BOOTSTRAP
       Com `defer` o DOM já está pronto; o teste de readyState é só um
       seguro caso o script seja movido para o <head> sem `defer`.
       ====================================================================== */
    const init = () => {
        UI.init();
        Navigation.init();
        ScrollAnimations.init();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
