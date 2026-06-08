'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const heroEmailRef = useRef<HTMLInputElement>(null)
  const ctaEmailRef  = useRef<HTMLInputElement>(null)
  const [perfilAtivo, setPerfilAtivo] = useState<'autonomo' | 'pf'>('autonomo')

  useEffect(() => {
    const nav = document.getElementById('nav')
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 20)
    window.addEventListener('scroll', onScroll)

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target) } })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))

    document.querySelectorAll('.faq-item').forEach(item => {
      item.querySelector('.faq-q')?.addEventListener('click', () => {
        const isOpen = item.classList.contains('open')
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'))
        if (!isOpen) item.classList.add('open')
      })
    })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function irParaCadastro(perfil?: 'autonomo' | 'pf') {
    const email = heroEmailRef.current?.value.trim()
    const p = perfil || perfilAtivo
    router.push(email ? `/auth/cadastro?email=${encodeURIComponent(email)}&perfil=${p}` : `/auth/cadastro`)
  }

  function irParaCadastroFinal() {
    const email = ctaEmailRef.current?.value.trim()
    router.push(email ? `/auth/cadastro?email=${encodeURIComponent(email)}` : '/auth/cadastro')
  }

  const isAutonomo = perfilAtivo === 'autonomo'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        :root {
          --bg:#07080F; --bg2:#0D0F1A; --bg3:#111320;
          --indigo:#4F46E5; --indigo2:#818CF8; --indigo3:#C7D2FE;
          --dim:rgba(79,70,229,0.12); --line:rgba(79,70,229,0.25);
          --verde:#22c55e; --verm:#ef4444; --amber:#f59e0b;
          --green:#10b981; --green2:#6ee7b7; --green-dim:rgba(16,185,129,0.12); --green-line:rgba(16,185,129,0.25);
          --white:#FFFFFF; --gray1:#E8EAF2; --gray2:#8892AA; --gray3:#3A4055;
          --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.12);
          --r:12px; --rl:20px; --rxl:28px;
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        body{font-family:'Instrument Sans',sans-serif;background:var(--bg);color:var(--gray1);line-height:1.65;overflow-x:hidden;}
        .bg-glow{position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse 70% 50% at 15% -5%,rgba(79,70,229,0.18) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 85% 100%,rgba(99,102,241,0.10) 0%,transparent 60%);}
        .bg-dots{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:radial-gradient(circle,rgba(255,255,255,0.05) 1px,transparent 1px);background-size:28px 28px;mask-image:radial-gradient(ellipse 100% 80% at 50% 0%,black 0%,transparent 80%);}
        nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 5vw;height:62px;transition:background 0.3s,border-color 0.3s;border-bottom:1px solid transparent;}
        nav.scrolled{background:rgba(7,8,15,0.94);backdrop-filter:blur(16px);border-color:var(--border);}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;}
        .nav-logo-z{width:34px;height:34px;border-radius:9px;background:var(--indigo);display:flex;align-items:center;justify-content:center;font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:16px;color:#fff;}
        .nav-logo-name{font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:17px;color:var(--white);}
        .nav-cta{display:inline-flex;align-items:center;gap:8px;background:var(--indigo);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:9px 20px;border-radius:9px;transition:opacity 0.2s,transform 0.2s;}
        .nav-cta:hover{opacity:0.88;transform:translateY(-1px);}
        .hero{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:110px 5vw 80px;text-align:center;}
        .hero-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:100px;background:var(--dim);border:1px solid var(--line);font-size:13px;color:var(--indigo2);font-weight:500;margin-bottom:36px;}
        .hero-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--indigo2);animation:pulse 2s infinite;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.2}}
        .hero-title{font-family:'Cabinet Grotesk',sans-serif;font-weight:900;font-size:clamp(40px,6.5vw,88px);line-height:0.96;letter-spacing:-0.04em;color:var(--white);max-width:960px;margin-bottom:24px;}
        .hero-title .red{color:#FC8181;}
        .hero-title .green{background:linear-gradient(90deg,var(--indigo2),#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .hero-sub{font-size:clamp(17px,2vw,21px);color:var(--gray2);max-width:580px;margin:0 auto 48px;font-weight:400;line-height:1.65;}
        .hero-form{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:20px;}
        .hero-input{padding:14px 20px;border-radius:10px;background:var(--bg2);border:1px solid var(--border2);font-size:15px;color:var(--white);outline:none;font-family:'Instrument Sans',sans-serif;width:280px;transition:border-color 0.2s;}
        .hero-input:focus{border-color:var(--indigo);}
        .hero-input::placeholder{color:var(--gray3);}
        .btn-hero{padding:14px 28px;border-radius:10px;background:var(--indigo);color:#fff;border:none;font-size:15px;font-weight:700;cursor:pointer;font-family:'Instrument Sans',sans-serif;transition:opacity 0.2s,transform 0.2s;white-space:nowrap;}
        .btn-hero:hover{opacity:0.88;transform:translateY(-2px);}
        .btn-hero-green{background:var(--green);}
        .hero-fine{font-size:13px;color:var(--gray3);display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center;}
        .hero-fine span{display:flex;align-items:center;gap:5px;}
        .hero-fine span::before{content:'✓';color:var(--verde);font-weight:700;}

        /* PERFIL TOGGLE */
        .perfil-toggle{display:flex;gap:0;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:4px;margin-bottom:48px;}
        .perfil-btn{flex:1;padding:12px 24px;border:none;border-radius:10px;cursor:pointer;font-family:'Instrument Sans',sans-serif;font-size:14px;font-weight:600;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;}
        .perfil-btn.ativo-autonomo{background:var(--indigo);color:#fff;}
        .perfil-btn.ativo-pf{background:var(--green);color:#fff;}
        .perfil-btn.inativo{background:transparent;color:var(--gray2);}

        /* PERFIL CARDS */
        .perfil-section{position:relative;z-index:1;padding:80px 5vw;}
        .perfil-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:900px;margin:0 auto;}
        .perfil-card{border-radius:var(--rxl);padding:36px 32px;cursor:pointer;transition:all 0.25s;border:2px solid transparent;}
        .perfil-card.autonomo{background:rgba(79,70,229,0.06);border-color:rgba(79,70,229,0.2);}
        .perfil-card.autonomo:hover,.perfil-card.autonomo.ativo{border-color:var(--indigo);background:rgba(79,70,229,0.12);}
        .perfil-card.pf{background:rgba(16,185,129,0.06);border-color:rgba(16,185,129,0.2);}
        .perfil-card.pf:hover,.perfil-card.pf.ativo{border-color:var(--green);background:rgba(16,185,129,0.12);}
        .perfil-card-icon{font-size:40px;margin-bottom:16px;}
        .perfil-card-title{font-family:'Cabinet Grotesk',sans-serif;font-size:22px;font-weight:800;color:var(--white);margin-bottom:8px;display:flex;align-items:center;gap:10px;}
        .perfil-badge-novo{font-size:10px;font-weight:700;color:var(--green);background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);padding:2px 8px;border-radius:100px;}
        .perfil-card-sub{font-size:14px;color:var(--gray2);line-height:1.6;margin-bottom:20px;}
        .perfil-card-items{list-style:none;}
        .perfil-card-items li{font-size:13px;color:var(--gray2);padding:5px 0;display:flex;gap:8px;border-bottom:1px solid var(--border);}
        .perfil-card-items li:last-child{border-bottom:none;}
        .perfil-card-items li::before{content:'✓';font-weight:700;flex-shrink:0;}
        .perfil-card.autonomo .perfil-card-items li::before{color:var(--indigo2);}
        .perfil-card.pf .perfil-card-items li::before{color:var(--green2);}
        .perfil-card-price{margin-top:20px;padding-top:20px;border-top:1px solid var(--border);}
        .perfil-card-price-val{font-family:'Cabinet Grotesk',sans-serif;font-size:28px;font-weight:800;color:var(--white);}
        .perfil-card-price-sub{font-size:12px;color:var(--gray2);margin-top:2px;}
        .perfil-card-btn{margin-top:16px;width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Instrument Sans',sans-serif;transition:opacity 0.2s;}
        .perfil-card.autonomo .perfil-card-btn{background:var(--indigo);color:#fff;}
        .perfil-card.pf .perfil-card-btn{background:var(--green);color:#fff;}
        .perfil-card-btn:hover{opacity:0.88;}

        .social-proof{position:relative;z-index:1;padding:20px 5vw 60px;text-align:center;}
        .sp-label{font-size:12px;color:var(--gray3);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px;}
        .sp-nums{display:flex;gap:48px;justify-content:center;flex-wrap:wrap;}
        .sp-num-val{font-family:'Cabinet Grotesk',sans-serif;font-size:32px;font-weight:800;color:var(--white);line-height:1;}
        .sp-num-label{font-size:13px;color:var(--gray2);margin-top:4px;}
        section{position:relative;z-index:1;padding:100px 5vw;}
        .sec-label{font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--indigo2);margin-bottom:16px;display:flex;align-items:center;gap:10px;}
        .sec-label::before{content:'';width:20px;height:1px;background:var(--indigo2);}
        .sec-h{font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:clamp(30px,4vw,52px);color:var(--white);line-height:1.06;letter-spacing:-0.03em;}
        .sec-p{font-size:17px;color:var(--gray2);max-width:500px;margin-top:16px;line-height:1.7;}

        /* FUNCIONALIDADES */
        #funcionalidades{background:var(--bg2);}
        .func-tabs{display:flex;gap:4px;background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:4px;max-width:400px;margin:0 auto 48px;}
        .func-tab{flex:1;padding:10px;border:none;border-radius:9px;cursor:pointer;font-family:'Instrument Sans',sans-serif;font-size:14px;font-weight:600;transition:all 0.2s;}
        .func-tab.ativo-autonomo{background:var(--indigo);color:#fff;}
        .func-tab.ativo-pf{background:var(--green);color:#fff;}
        .func-tab.inativo{background:transparent;color:var(--gray2);}
        .func-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;}
        .func-card{background:var(--bg3);border:1px solid var(--border);border-radius:var(--rl);padding:24px 22px;transition:border-color 0.2s,transform 0.2s;}
        .func-card:hover{border-color:var(--border2);transform:translateY(-2px);}
        .func-icon{font-size:28px;margin-bottom:14px;}
        .func-title{font-family:'Cabinet Grotesk',sans-serif;font-size:16px;font-weight:700;color:var(--white);margin-bottom:8px;}
        .func-desc{font-size:13px;color:var(--gray2);line-height:1.6;}

        /* PLANOS */
        #planos{background:var(--bg);}
        .planos-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:860px;margin:0 auto;}
        .plano-box{background:var(--bg2);border-radius:var(--rxl);padding:40px 36px;position:relative;overflow:hidden;}
        .plano-box.autonomo{border:1px solid var(--line);}
        .plano-box.pf{border:1px solid var(--green-line);}
        .plano-box::before{content:'';position:absolute;top:-100px;left:50%;transform:translateX(-50%);width:400px;height:300px;pointer-events:none;}
        .plano-box.autonomo::before{background:radial-gradient(ellipse,rgba(79,70,229,0.15) 0%,transparent 70%);}
        .plano-box.pf::before{background:radial-gradient(ellipse,rgba(16,185,129,0.12) 0%,transparent 70%);}
        .plano-badge{display:inline-block;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:20px;}
        .plano-box.autonomo .plano-badge{background:var(--dim);color:var(--indigo2);border:1px solid var(--line);}
        .plano-box.pf .plano-badge{background:var(--green-dim);color:var(--green2);border:1px solid var(--green-line);}
        .plano-title{font-family:'Cabinet Grotesk',sans-serif;font-size:22px;font-weight:800;color:var(--white);margin-bottom:4px;}
        .plano-sub{font-size:13px;color:var(--gray2);margin-bottom:20px;}
        .plano-price{font-family:'Cabinet Grotesk',sans-serif;font-size:52px;font-weight:900;color:var(--white);line-height:1;letter-spacing:-0.04em;margin-bottom:4px;}
        .plano-price span{font-size:20px;font-weight:400;color:var(--gray2);}
        .plano-trial{font-size:13px;color:var(--verde);font-weight:600;margin-bottom:28px;}
        .plano-items{list-style:none;margin-bottom:32px;}
        .plano-items li{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:13px;color:var(--gray1);border-bottom:1px solid var(--border);}
        .plano-items li:last-child{border-bottom:none;}
        .plano-items li::before{content:'✓';font-weight:700;flex-shrink:0;}
        .plano-box.autonomo .plano-items li::before{color:var(--verde);}
        .plano-box.pf .plano-items li::before{color:var(--green2);}
        .btn-plano{width:100%;padding:14px;border-radius:12px;border:none;font-size:15px;font-weight:700;cursor:pointer;font-family:'Instrument Sans',sans-serif;transition:opacity 0.2s,transform 0.2s;}
        .btn-plano:hover{opacity:0.88;transform:translateY(-2px);}
        .plano-box.autonomo .btn-plano{background:var(--indigo);color:#fff;}
        .plano-box.pf .btn-plano{background:var(--green);color:#fff;}
        .plano-fine{font-size:12px;color:var(--gray3);margin-top:12px;text-align:center;}

        #faq{background:var(--bg2);}
        .faq-wrap{max-width:720px;margin:0 auto;}
        .faq-item{border-bottom:1px solid var(--border);cursor:pointer;overflow:hidden;}
        .faq-item:first-child{border-top:1px solid var(--border);}
        .faq-q{display:flex;justify-content:space-between;align-items:center;padding:20px 0;font-size:16px;font-weight:500;color:var(--white);user-select:none;}
        .faq-icon{font-size:20px;color:var(--indigo2);transition:transform 0.3s;flex-shrink:0;}
        .faq-item.open .faq-icon{transform:rotate(45deg);}
        .faq-a{font-size:14px;color:var(--gray2);line-height:1.7;max-height:0;overflow:hidden;transition:max-height 0.35s ease,padding 0.3s;}
        .faq-item.open .faq-a{max-height:300px;padding-bottom:20px;}

        #cta-final{background:var(--bg);padding:120px 5vw;}
        .cta-box{max-width:760px;margin:0 auto;text-align:center;background:var(--bg2);border:1px solid var(--line);border-radius:var(--rxl);padding:72px 60px;position:relative;overflow:hidden;}
        .cta-box::before{content:'';position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:500px;height:300px;background:radial-gradient(ellipse,rgba(79,70,229,0.15) 0%,transparent 70%);pointer-events:none;}
        .cta-box .sec-h{position:relative;z-index:1;}
        .cta-final-sub{font-size:18px;color:var(--gray2);margin:16px auto 40px;max-width:460px;position:relative;z-index:1;}
        .cta-final-form{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;position:relative;z-index:1;}
        footer{background:var(--bg2);border-top:1px solid var(--border);padding:40px 5vw;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;position:relative;z-index:1;}
        .footer-logo{display:flex;align-items:center;gap:10px;text-decoration:none;}
        .footer-links{display:flex;gap:24px;}
        .footer-links a{font-size:13px;color:var(--gray3);text-decoration:none;transition:color 0.2s;}
        .footer-links a:hover{color:var(--white);}
        .footer-copy{font-size:13px;color:var(--gray3);}
        .reveal{opacity:0;transform:translateY(22px);transition:opacity 0.65s cubic-bezier(0.16,1,0.3,1),transform 0.65s cubic-bezier(0.16,1,0.3,1);}
        .reveal.in{opacity:1;transform:translateY(0);}
        @media(max-width:900px){.perfil-grid,.planos-grid{grid-template-columns:1fr;}.cta-box{padding:48px 28px;}}
        @media(max-width:640px){section{padding:72px 5vw;}.hero-input{width:100%;}footer{flex-direction:column;text-align:center;}.footer-links{flex-wrap:wrap;justify-content:center;}.perfil-toggle{flex-direction:column;}}
      `}</style>

      <div className="bg-glow" />
      <div className="bg-dots" />

      {/* NAV */}
      <nav id="nav">
        <a href="#" className="nav-logo">
          <div className="nav-logo-z">Z</div>
          <span className="nav-logo-name">Zynflow</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/auth/login" style={{ fontSize: 14, color: 'var(--gray2)', textDecoration: 'none', padding: '8px 16px', borderRadius: 8, transition: 'color 0.2s' }}>Entrar</a>
          <a href="/auth/cadastro" className="nav-cta">Começar grátis →</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <span className="hero-badge">Controle financeiro para quem trabalha de verdade</span>
        <h1 className="hero-title">
          Seu dinheiro.<br />
          <span className="red">Sob controle.</span><br />
          <span className="green">Do jeito certo.</span>
        </h1>
        <p className="hero-sub">O Zynflow foi feito para dois perfis: autônomos com renda variável e assalariados CLT que querem controle real — com investimentos e IRPF inclusos.</p>

        {/* Toggle de perfil */}
        <div className="perfil-toggle">
          <button
            className={`perfil-btn ${perfilAtivo === 'autonomo' ? 'ativo-autonomo' : 'inativo'}`}
            onClick={() => setPerfilAtivo('autonomo')}>
            🚀 Autônomo / MEI
          </button>
          <button
            className={`perfil-btn ${perfilAtivo === 'pf' ? 'ativo-pf' : 'inativo'}`}
            onClick={() => setPerfilAtivo('pf')}>
            💼 CLT / Assalariado
          </button>
        </div>

        <div className="hero-form">
          <input ref={heroEmailRef} type="email" className="hero-input" placeholder="Digite seu e-mail"
            onKeyDown={e => e.key === 'Enter' && irParaCadastro()} />
          <button
            className={`btn-hero ${perfilAtivo === 'pf' ? 'btn-hero-green' : ''}`}
            onClick={() => irParaCadastro()}>
            Começar 30 dias grátis →
          </button>
        </div>
        <div className="hero-fine">
          <span>30 dias grátis</span>
          <span>Sem cartão de crédito</span>
          <span>Cancele quando quiser</span>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <div className="social-proof reveal">
        <p className="sp-label">Usuários que já controlam suas finanças</p>
        <div className="sp-nums">
          <div><div className="sp-num-val">+1.200</div><div className="sp-num-label">Usuários ativos</div></div>
          <div><div className="sp-num-val">R$ 2,4M</div><div className="sp-num-label">Lançados no app</div></div>
          <div><div className="sp-num-val">4.8★</div><div className="sp-num-label">Avaliação média</div></div>
          <div><div className="sp-num-val">87%</div><div className="sp-num-label">Continuam após o trial</div></div>
        </div>
      </div>

      {/* ESCOLHA SEU PERFIL */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 5vw', background: 'var(--bg2)' }}>
        <div className="reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div className="sec-label" style={{ justifyContent: 'center' }}><span style={{ width: 0 }} />Dois perfis. Um app.</div>
          <h2 className="sec-h">Feito para você,<br />do jeito que você trabalha.</h2>
          <p className="sec-p" style={{ margin: '16px auto 0' }}>Escolha seu perfil e o Zynflow se adapta completamente à sua realidade financeira.</p>
        </div>
        <div className="perfil-grid reveal">

          {/* Card Autônomo */}
          <div className="perfil-card autonomo">
            <div className="perfil-card-icon">🚀</div>
            <div className="perfil-card-title">Autônomo / MEI</div>
            <div className="perfil-card-sub">Freelancer, MEI, consultor, profissional liberal. Renda que varia todo mês — e um método que funciona para isso.</div>
            <ul className="perfil-card-items">
              {['Método 3 Passos exclusivo para autônomo','Teto semanal calculado automaticamente','Fundo de Meses Fracos — proteção nos meses ruins','Receita prevista vs recebida em tempo real','Alertas quando está perto do limite'].map(i => <li key={i}>{i}</li>)}
            </ul>
            <div className="perfil-card-price">
              <div className="perfil-card-price-val">R$ 29,90<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--gray2)' }}>/mês</span></div>
              <div className="perfil-card-price-sub">30 dias grátis · Sem cartão</div>
            </div>
            <button className="perfil-card-btn" onClick={() => router.push('/auth/cadastro')}>Começar como Autônomo →</button>
          </div>

          {/* Card PF */}
          <div className="perfil-card pf">
            <div className="perfil-card-icon">💼</div>
            <div className="perfil-card-title">CLT / Assalariado <span className="perfil-badge-novo">NOVO</span></div>
            <div className="perfil-card-sub">Salário fixo, benefícios e investimentos. Controle total do seu dinheiro com módulo completo de investimentos e IRPF.</div>
            <ul className="perfil-card-items">
              {['Controle de salário, 13º, férias e PLR','% da renda comprometida em tempo real','Módulo de investimentos com custo médio automático','Proventos, dividendos e JCP organizados','Apuração de IRPF anual com DARF calculado'].map(i => <li key={i}>{i}</li>)}
            </ul>
            <div className="perfil-card-price">
              <div className="perfil-card-price-val">R$ 34,90<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--gray2)' }}>/mês</span></div>
              <div className="perfil-card-price-sub">30 dias grátis · Sem cartão · Promo: R$ 29,90 com ZYNFLOW30</div>
            </div>
            <button className="perfil-card-btn" onClick={() => router.push('/auth/cadastro')}>Começar como CLT →</button>
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades">
        <div className="reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
          <div className="sec-label" style={{ justifyContent: 'center' }}><span style={{ width: 0 }} />Funcionalidades</div>
          <h2 className="sec-h">Tudo que você precisa.<br />Nada que você não precisa.</h2>
        </div>

        {/* Tabs */}
        <div className="func-tabs reveal">
          <button className={`func-tab ${perfilAtivo === 'autonomo' ? 'ativo-autonomo' : 'inativo'}`} onClick={() => setPerfilAtivo('autonomo')}>🚀 Autônomo</button>
          <button className={`func-tab ${perfilAtivo === 'pf' ? 'ativo-pf' : 'inativo'}`} onClick={() => setPerfilAtivo('pf')}>💼 CLT</button>
        </div>

        <div className="func-grid reveal">
          {(isAutonomo ? [
            { icon: '📊', title: 'Dashboard com Método 3 Passos', desc: 'P1 Receitas, P2 Gastos e P3 Reservas em um só lugar. Visão completa do mês atualizada em tempo real.' },
            { icon: '🎯', title: 'Perspectiva financeira', desc: 'O sistema calcula quanto você precisa guardar por mês para atingir seu objetivo em X meses.' },
            { icon: '📦', title: 'Fundo de Meses Fracos', desc: 'O diferencial exclusivo do Zynflow. Guarde nos meses bons e sobreviva nos ruins sem entrar no vermelho.' },
            { icon: '⚠️', title: 'Teto semanal automático', desc: 'Calculado como (renda ÷ 4) × 30%. Você recebe alerta quando está perto do limite — antes de estourar.' },
            { icon: '✅', title: 'Checklist semanal', desc: '15 minutos toda semana para revisar receitas, gastos e metas. O hábito que separa quem controla de quem sofre.' },
            { icon: '📈', title: 'Histórico e gráficos', desc: 'Compare meses, veja tendências e entenda sua evolução financeira ao longo do tempo.' },
            { icon: '🏦', title: 'Contas bancárias', desc: 'Cadastre suas contas e acompanhe o saldo de cada uma. Nubank, Inter, Bradesco — todos centralizados.' },
            { icon: '💰', title: 'Metas financeiras', desc: 'Defina objetivos e acompanhe o progresso com aportes mensais. Viagem, notebook, reserva — tudo registrado.' },
          ] : [
            { icon: '📊', title: 'Dashboard CLT', desc: '% da renda comprometida em tempo real. Salário, benefícios, fixas, variáveis e diárias em um só lugar.' },
            { icon: '📈', title: 'Módulo de Investimentos', desc: 'Carteira completa com custo médio automático a cada compra e venda. Ações, FIIs, ETFs, BDRs e Cripto.' },
            { icon: '💰', title: 'Proventos e dividendos', desc: 'Registro de dividendos, JCP, rendimentos FII e amortizações. Tributação automática: JCP = 15% na fonte.' },
            { icon: '📋', title: 'IR mensal automático', desc: 'Isenção automática para vendas < R$20k/mês. DARF calculado com código 6015 e vencimento correto.' },
            { icon: '🧾', title: 'Módulo IRPF anual', desc: 'Preencha rendimentos, deduções e o sistema calcula IR devido, alíquota efetiva e se você tem a restituir.' },
            { icon: '🎯', title: 'Metas financeiras', desc: 'Defina objetivos e acompanhe o progresso. Aposentadoria, imóvel, reserva — com prazo e aporte mensal.' },
            { icon: '🏦', title: 'Contas bancárias', desc: 'Cadastre suas contas e acompanhe saldo de cada uma. Inclui salário, conta investimento e poupança.' },
            { icon: '✅', title: 'Checklist financeiro', desc: 'Lista de ações mensais para manter sua saúde financeira em dia. Do lançamento do salário ao IR.' },
          ]).map(f => (
            <div key={f.title} className="func-card">
              <div className="func-icon">{f.icon}</div>
              <div className="func-title">{f.title}</div>
              <div className="func-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos">
        <div className="reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div className="sec-label" style={{ justifyContent: 'center' }}><span style={{ width: 0 }} />Planos</div>
          <h2 className="sec-h">Simples. Sem pegadinha.</h2>
          <p className="sec-p" style={{ margin: '16px auto 0' }}>30 dias grátis para os dois perfis. Sem cartão de crédito.</p>
        </div>
        <div className="planos-grid reveal">

          {/* Autônomo */}
          <div className="plano-box autonomo">
            <span className="plano-badge">Zynflow Autônomo</span>
            <div className="plano-title">Para quem tem renda variável</div>
            <div className="plano-sub">Freelancer, MEI, consultor, profissional liberal</div>
            <div className="plano-price">R$ 29<span>,90/mês</span></div>
            <div className="plano-trial">✓ 30 dias completamente grátis · Sem cartão</div>
            <ul className="plano-items">
              {['Dashboard com Método 3 Passos','Teto semanal automático','Fundo de Meses Fracos','Receitas, despesas e contas ilimitadas','Metas financeiras com aportes','Checklist semanal interativo','Histórico anual com gráficos','Suporte por WhatsApp'].map(i => <li key={i}>{i}</li>)}
            </ul>
            <button className="btn-plano" onClick={() => router.push('/auth/cadastro')}>Começar 30 dias grátis →</button>
            <p className="plano-fine">Depois do trial, R$ 29,90/mês. Cancele quando quiser.</p>
          </div>

          {/* PF */}
          <div className="plano-box pf">
            <span className="plano-badge">Zynflow PF</span>
            <div className="plano-title">Para CLT com investimentos</div>
            <div className="plano-sub">Assalariado que quer controle total e IRPF organizado</div>
            <div className="plano-price">R$ 34<span>,90/mês</span></div>
            <div className="plano-trial">✓ 30 dias grátis · Use ZYNFLOW30 e pague R$ 29,90</div>
            <ul className="plano-items">
              {['Tudo do plano Autônomo','Módulo de investimentos completo','Custo médio automático por ativo','Proventos, dividendos e JCP','IR mensal com isenção automática','DARF calculado (código 6015)','Módulo IRPF anual completo','Suporte prioritário'].map(i => <li key={i}>{i}</li>)}
            </ul>
            <button className="btn-plano" onClick={() => router.push('/auth/cadastro')}>Começar 30 dias grátis →</button>
            <p className="plano-fine">Depois do trial, R$ 34,90/mês. Use ZYNFLOW30 e pague R$ 29,90.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div className="sec-label" style={{ justifyContent: 'center' }}><span style={{ width: 0 }} />Dúvidas frequentes</div>
          <h2 className="sec-h">Respondemos tudo</h2>
        </div>
        <div className="faq-wrap reveal">
          {[
            { q: 'Preciso de cartão de crédito para começar o trial?', a: 'Não. Os 30 dias de trial são completamente gratuitos e não exigem nenhum dado de pagamento. Você só vai inserir um cartão se decidir continuar após o período grátis.' },
            { q: 'Qual a diferença entre o plano Autônomo e o PF?', a: 'O plano Autônomo foi feito para quem tem renda variável — freelancer, MEI, consultor — com Método 3 Passos, Fundo de Meses Fracos e teto semanal. O plano PF inclui tudo isso mais módulo completo de investimentos (carteira, proventos, IR mensal) e apuração de IRPF anual para declaração.' },
            { q: 'Posso mudar de perfil depois de cadastrar?', a: 'Atualmente o perfil é definido no cadastro. Se precisar mudar, entre em contato com o suporte pelo WhatsApp e faremos a migração manualmente.' },
            { q: 'O módulo de IRPF substitui o contador?', a: 'Ele organiza todos os dados para você — rendimentos, deduções, IR devido e a restituir. Você leva isso pronto para o programa da Receita Federal ou para o seu contador. Para casos complexos (imóveis, heranças, sócio de empresa), recomendamos um contador.' },
            { q: 'E se eu não gostar? Posso cancelar?', a: 'Pode cancelar quando quiser, sem burocracia e sem multa. Dentro do trial, você cancela e não paga nada. Depois do trial, se cancelar, o acesso continua até o fim do período pago.' },
            { q: 'Meus dados financeiros estão seguros?', a: 'Sim. Os dados ficam armazenados com criptografia e isolamento por usuário (Row Level Security). Nenhum funcionário ou terceiro tem acesso aos seus lançamentos financeiros.' },
            { q: 'Consigo usar no celular?', a: 'Sim. O Zynflow é um PWA — funciona em qualquer navegador, incluindo mobile. Você pode instalá-lo na tela inicial do seu celular e usá-lo como um app nativo, sem precisar baixar nada.' },
            { q: 'O app conecta com meu banco automaticamente?', a: 'Ainda não. Os lançamentos são manuais — e isso é intencional. Pesquisas mostram que quem lança manualmente tem muito mais consciência dos gastos. A integração automática está no nosso roadmap.' },
          ].map(f => (
            <div key={f.q} className="faq-item">
              <div className="faq-q">{f.q} <span className="faq-icon">+</span></div>
              <div className="faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="cta-final">
        <div className="cta-box reveal">
          <h2 className="sec-h">Chega de não saber<br />para onde vai o dinheiro.</h2>
          <p className="cta-final-sub">30 dias grátis. Sem cartão. Sem risco. Autônomo ou CLT — o Zynflow tem o controle certo para você.</p>
          <div className="cta-final-form">
            <input ref={ctaEmailRef} type="email" className="hero-input" placeholder="Digite seu e-mail" style={{ background: '#07080F' }} onKeyDown={e => e.key === 'Enter' && irParaCadastroFinal()} />
            <button className="btn-hero" onClick={irParaCadastroFinal}>Começar agora →</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <a href="#" className="footer-logo">
          <div className="nav-logo-z">Z</div>
          <span className="nav-logo-name">Zynflow</span>
        </a>
        <div className="footer-links">
          <a href="/auth/cadastro">Criar conta</a>
          <a href="/auth/login">Entrar</a>
          <a href="https://zyncompany.com.br" target="_blank" rel="noopener noreferrer">Zyncompany</a>
          <a href="#">Termos de Uso</a>
          <a href="#">Privacidade</a>
        </div>
        <span className="footer-copy">© 2026 Zynflow · Feito no Brasil 🇧🇷</span>
      </footer>
    </>
  )
}