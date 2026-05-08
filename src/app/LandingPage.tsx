'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const heroEmailRef = useRef<HTMLInputElement>(null)
  const ctaEmailRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Nav scroll
    const nav = document.getElementById('nav')
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 20)
    window.addEventListener('scroll', onScroll)

    // Reveal
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target) } })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))

    // FAQ
    document.querySelectorAll('.faq-item').forEach(item => {
      item.querySelector('.faq-q')?.addEventListener('click', () => {
        const isOpen = item.classList.contains('open')
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'))
        if (!isOpen) item.classList.add('open')
      })
    })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function irParaCadastro() {
    const email = heroEmailRef.current?.value.trim()
    router.push(email ? `/auth/cadastro?email=${encodeURIComponent(email)}` : '/auth/cadastro')
  }

  function irParaCadastroFinal() {
    const email = ctaEmailRef.current?.value.trim()
    router.push(email ? `/auth/cadastro?email=${encodeURIComponent(email)}` : '/auth/cadastro')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        :root {
          --bg:#07080F; --bg2:#0D0F1A; --bg3:#111320;
          --indigo:#4F46E5; --indigo2:#818CF8; --indigo3:#C7D2FE;
          --dim:rgba(79,70,229,0.12); --line:rgba(79,70,229,0.25);
          --verde:#22c55e; --verm:#ef4444; --amber:#f59e0b;
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
        .hero-sub{font-size:clamp(17px,2vw,21px);color:var(--gray2);max-width:560px;margin:0 auto 48px;font-weight:400;line-height:1.65;}
        .hero-form{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:20px;}
        .hero-input{padding:14px 20px;border-radius:10px;background:var(--bg2);border:1px solid var(--border2);font-size:15px;color:var(--white);outline:none;font-family:'Instrument Sans',sans-serif;width:280px;transition:border-color 0.2s;}
        .hero-input:focus{border-color:var(--indigo);}
        .hero-input::placeholder{color:var(--gray3);}
        .btn-hero{padding:14px 28px;border-radius:10px;background:var(--indigo);color:#fff;border:none;font-size:15px;font-weight:700;cursor:pointer;font-family:'Instrument Sans',sans-serif;transition:opacity 0.2s,transform 0.2s;white-space:nowrap;}
        .btn-hero:hover{opacity:0.88;transform:translateY(-2px);}
        .hero-fine{font-size:13px;color:var(--gray3);display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center;}
        .hero-fine span{display:flex;align-items:center;gap:5px;}
        .hero-fine span::before{content:'✓';color:var(--verde);font-weight:700;}
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
        #dor{background:var(--bg2);}
        .dor-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;}
        .dor-cards{display:flex;flex-direction:column;gap:14px;}
        .dor-card{background:var(--bg3);border:1px solid var(--border);border-radius:var(--rl);padding:20px 22px;display:flex;align-items:flex-start;gap:16px;transition:border-color 0.2s;}
        .dor-card:hover{border-color:rgba(252,129,129,0.3);}
        .dor-icon{font-size:28px;flex-shrink:0;}
        .dor-title{font-family:'Cabinet Grotesk',sans-serif;font-size:16px;font-weight:700;color:var(--white);margin-bottom:4px;}
        .dor-desc{font-size:14px;color:var(--gray2);line-height:1.55;}
        #metodo{background:var(--bg);}
        .metodo-header{text-align:center;max-width:680px;margin:0 auto 64px;}
        .metodo-header .sec-label{justify-content:center;}
        .metodo-header .sec-label::before{display:none;}
        .metodo-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .metodo-step{background:var(--bg2);border:1px solid var(--border);border-radius:var(--rxl);padding:32px 28px;position:relative;overflow:hidden;transition:border-color 0.25s,transform 0.25s;}
        .metodo-step:hover{border-color:var(--indigo);transform:translateY(-4px);}
        .metodo-step::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--step-color,var(--indigo));opacity:0;transition:opacity 0.25s;}
        .metodo-step:hover::before{opacity:1;}
        .step-num{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:color-mix(in srgb,var(--step-color,var(--indigo)) 15%,transparent);font-family:'Cabinet Grotesk',sans-serif;font-size:16px;font-weight:800;color:var(--step-color,var(--indigo));margin-bottom:20px;}
        .step-title{font-family:'Cabinet Grotesk',sans-serif;font-size:20px;font-weight:800;color:var(--white);margin-bottom:10px;letter-spacing:-0.02em;}
        .step-sub{font-size:13px;color:var(--step-color,var(--indigo2));font-weight:600;margin-bottom:14px;display:block;}
        .step-desc{font-size:14px;color:var(--gray2);line-height:1.65;margin-bottom:20px;}
        .step-items{list-style:none;}
        .step-items li{font-size:13px;color:var(--gray2);padding:5px 0;display:flex;gap:8px;border-bottom:1px solid var(--border);}
        .step-items li:last-child{border-bottom:none;}
        .step-items li::before{content:'';width:4px;height:4px;border-radius:50%;background:var(--step-color,var(--indigo));flex-shrink:0;margin-top:7px;}
        #funcionalidades{background:var(--bg2);}
        .func-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;}
        .func-card{background:var(--bg3);border:1px solid var(--border);border-radius:var(--rl);padding:24px 22px;transition:border-color 0.2s,transform 0.2s;}
        .func-card:hover{border-color:var(--border2);transform:translateY(-2px);}
        .func-icon{font-size:28px;margin-bottom:14px;}
        .func-title{font-family:'Cabinet Grotesk',sans-serif;font-size:16px;font-weight:700;color:var(--white);margin-bottom:8px;}
        .func-desc{font-size:13px;color:var(--gray2);line-height:1.6;}
        #transformacao{background:var(--bg);}
        .trans-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;}
        .trans-col{background:var(--bg2);border:1px solid var(--border);border-radius:var(--rl);padding:28px;}
        .trans-col.antes{border-color:rgba(239,68,68,0.2);}
        .trans-col.depois{border-color:rgba(34,197,94,0.2);}
        .trans-col-title{font-family:'Cabinet Grotesk',sans-serif;font-size:18px;font-weight:700;margin-bottom:20px;}
        .trans-col.antes .trans-col-title{color:#FC8181;}
        .trans-col.depois .trans-col-title{color:#4ade80;}
        .trans-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;color:var(--gray2);align-items:flex-start;}
        .trans-item:last-child{border-bottom:none;}
        .trans-item .ti{flex-shrink:0;font-size:16px;}
        #depoimentos{background:var(--bg2);}
        .dep-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
        .dep-card{background:var(--bg3);border:1px solid var(--border);border-radius:var(--rl);padding:24px;transition:border-color 0.2s;}
        .dep-card:hover{border-color:var(--border2);}
        .dep-stars{color:#f59e0b;font-size:14px;margin-bottom:14px;letter-spacing:2px;}
        .dep-text{font-size:14px;color:var(--gray1);line-height:1.7;margin-bottom:20px;font-style:italic;}
        .dep-author{display:flex;align-items:center;gap:12px;}
        .dep-avatar{width:40px;height:40px;border-radius:50%;background:var(--indigo);display:flex;align-items:center;justify-content:center;font-family:'Cabinet Grotesk',sans-serif;font-size:14px;font-weight:700;color:#fff;}
        .dep-name{font-size:14px;font-weight:600;color:var(--white);}
        .dep-role{font-size:12px;color:var(--gray2);}
        #plano{background:var(--bg);}
        .plano-box{max-width:480px;margin:0 auto;background:var(--bg2);border:1px solid var(--line);border-radius:var(--rxl);padding:48px 44px;text-align:center;position:relative;overflow:hidden;}
        .plano-box::before{content:'';position:absolute;top:-100px;left:50%;transform:translateX(-50%);width:400px;height:300px;background:radial-gradient(ellipse,rgba(79,70,229,0.18) 0%,transparent 70%);pointer-events:none;}
        .plano-badge{display:inline-block;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:5px 14px;border-radius:100px;background:var(--dim);color:var(--indigo2);border:1px solid var(--line);margin-bottom:24px;}
        .plano-price{font-family:'Cabinet Grotesk',sans-serif;font-size:64px;font-weight:900;color:var(--white);line-height:1;letter-spacing:-0.04em;margin-bottom:4px;}
        .plano-price span{font-size:24px;font-weight:400;color:var(--gray2);}
        .plano-trial{font-size:14px;color:var(--verde);font-weight:600;margin-bottom:32px;}
        .plano-items{list-style:none;margin-bottom:36px;text-align:left;}
        .plano-items li{display:flex;align-items:center;gap:10px;padding:9px 0;font-size:14px;color:var(--gray1);border-bottom:1px solid var(--border);}
        .plano-items li:last-child{border-bottom:none;}
        .plano-items li::before{content:'✓';color:var(--verde);font-weight:700;flex-shrink:0;}
        .btn-plano{width:100%;padding:15px;border-radius:12px;background:var(--indigo);color:#fff;border:none;font-size:16px;font-weight:700;cursor:pointer;font-family:'Instrument Sans',sans-serif;transition:opacity 0.2s,transform 0.2s;}
        .btn-plano:hover{opacity:0.88;transform:translateY(-2px);}
        .plano-fine{font-size:12px;color:var(--gray3);margin-top:14px;}
        #faq{background:var(--bg2);}
        .faq-wrap{max-width:720px;margin:0 auto;}
        .faq-item{border-bottom:1px solid var(--border);padding:0;cursor:pointer;overflow:hidden;}
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
        @media(max-width:900px){.dor-grid,.trans-grid{grid-template-columns:1fr;gap:32px;}.metodo-steps{grid-template-columns:1fr;}.dep-grid{grid-template-columns:1fr;}.cta-box{padding:48px 28px;}}
        @media(max-width:640px){section{padding:72px 5vw;}.hero-input{width:100%;}footer{flex-direction:column;text-align:center;}.footer-links{flex-wrap:wrap;justify-content:center;}}
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
        <span className="hero-badge">Para autônomos com renda variável</span>
        <h1 className="hero-title">
          Você recebe bem<br />
          <span className="red">e o dinheiro some.</span><br />
          <span className="green">Isso vai mudar.</span>
        </h1>
        <p className="hero-sub">O Zynflow é o único app de finanças feito especificamente para autônomo. Com o Método 3 Passos, você vai saber exatamente para onde vai cada real — e nunca mais vai ficar no sufoco antes do mês acabar.</p>
        <div className="hero-form">
          <input ref={heroEmailRef} type="email" className="hero-input" placeholder="Digite seu e-mail" onKeyDown={e => e.key === 'Enter' && irParaCadastro()} />
          <button className="btn-hero" onClick={irParaCadastro}>Começar 30 dias grátis →</button>
        </div>
        <div className="hero-fine">
          <span>30 dias grátis</span>
          <span>Sem cartão de crédito</span>
          <span>Cancele quando quiser</span>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <div className="social-proof reveal">
        <p className="sp-label">Autônomos que já controlam suas finanças</p>
        <div className="sp-nums">
          <div><div className="sp-num-val">+1.200</div><div className="sp-num-label">Usuários ativos</div></div>
          <div><div className="sp-num-val">R$ 2,4M</div><div className="sp-num-label">Lançados no app</div></div>
          <div><div className="sp-num-val">4.8★</div><div className="sp-num-label">Avaliação média</div></div>
          <div><div className="sp-num-val">87%</div><div className="sp-num-label">Continuam após o trial</div></div>
        </div>
      </div>

      {/* DOR */}
      <section id="dor">
        <div className="dor-grid">
          <div className="reveal">
            <div className="sec-label">O problema</div>
            <h2 className="sec-h">Você não é ruim com dinheiro.<br />O sistema é ruim para você.</h2>
            <p className="sec-p">Todo app de finanças foi feito para quem tem salário fixo. Mas você é autônomo — sua renda sobe e desce, e ninguém te ensinou a lidar com isso.</p>
          </div>
          <div className="dor-cards reveal">
            {[
              { icon: '😰', title: 'O mês bom te ilude', desc: 'Entrou R$ 8.000, você gastou pensando que sempre seria assim. No mês seguinte entrou R$ 3.000 — e o desespero bateu.' },
              { icon: '😤', title: 'As contas não esperam', desc: 'Aluguel, plano de saúde, DAS, internet — chegam todo mês, independente de quanto você recebeu. Fixas são implacáveis.' },
              { icon: '😱', title: 'Qualquer imprevisto vira crise', desc: 'Sem reserva, um mês sem cliente, uma doença ou um equipamento quebrado — e tudo vai por água abaixo.' },
              { icon: '😶', title: 'Você não sabe para onde vai', desc: 'No fim do mês olha o extrato e se pergunta: "Como gastei tudo isso?" A resposta: você nunca viu em tempo real.' },
            ].map(d => (
              <div key={d.title} className="dor-card">
                <span className="dor-icon">{d.icon}</span>
                <div><div className="dor-title">{d.title}</div><div className="dor-desc">{d.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MÉTODO */}
      <section id="metodo">
        <div className="metodo-header reveal">
          <div className="sec-label">A solução</div>
          <h2 className="sec-h">O Método 3 Passos para autônomo</h2>
          <p className="sec-p" style={{ margin: '16px auto 0' }}>Não é teoria de livro. É o método que funciona na prática para quem não tem salário fixo — digitalizado e automatizado no Zynflow.</p>
        </div>
        <div className="metodo-steps">
          {[
            { num: 'P1', color: '#818CF8', title: 'Mapeie sua receita', sub: 'Visibilidade total do que entra', desc: 'Lance tudo que vai entrar no mês. Separe o certo do incerto. Trabalhe sempre com o valor conservador — o menor que você espera.', items: ['Previsto vs real em tempo real', 'Múltiplas fontes de renda', 'Botão "Recebi" com um clique', 'Regra de ouro: nunca gaste o que não entrou'] },
            { num: 'P2', color: '#f59e0b', title: 'Controle cada centavo', sub: 'Teto semanal automático', desc: 'Divida seus gastos em fixos e variáveis. O Zynflow calcula automaticamente seu teto semanal de gastos — e te avisa quando está perto do limite.', items: ['Despesas fixas com status pago/pendente', 'Variáveis por categoria com percentual', 'Teto semanal: (renda ÷ 4) × 30%', 'Alerta quando ultrapassa 60% e 90%'] },
            { num: 'P3', color: '#22c55e', title: 'Pague-se primeiro', sub: 'Reservas automáticas por %', desc: 'Assim que receber qualquer valor, transfira ANTES de pagar qualquer conta: 10% emergência → 10% meses fracos → 5% investimento.', items: ['Reserva de emergência (meta: 6x fixas)', 'Fundo de Meses Fracos — exclusivo autônomo', 'Investimento de longo prazo', 'Aporte ideal calculado automaticamente'] },
          ].map(s => (
            <div key={s.num} className="metodo-step reveal" style={{ '--step-color': s.color } as any}>
              <div className="step-num">{s.num}</div>
              <div className="step-title">{s.title}</div>
              <span className="step-sub">{s.sub}</span>
              <div className="step-desc">{s.desc}</div>
              <ul className="step-items">{s.items.map(i => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades">
        <div className="reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div className="sec-label" style={{ justifyContent: 'center' }}><span style={{ width: 0 }} />Funcionalidades</div>
          <h2 className="sec-h">Tudo que você precisa.<br />Nada que você não precisa.</h2>
        </div>
        <div className="func-grid reveal">
          {[
            { icon: '📊', title: 'Dashboard inteligente', desc: 'Visão completa do mês em um só lugar. Receita, gastos, reservas e saldo disponível — atualizado em tempo real.' },
            { icon: '🎯', title: 'Perspectiva financeira', desc: 'No primeiro acesso, o sistema calcula quanto você precisa guardar por mês para atingir seu objetivo em X meses.' },
            { icon: '📦', title: 'Fundo de Meses Fracos', desc: 'O diferencial exclusivo do Zynflow. Guarde nos meses bons e sobreviva nos ruins sem entrar no vermelho.' },
            { icon: '⚠️', title: 'Alertas de teto semanal', desc: 'Você recebe um aviso quando está perto do limite de gastos variáveis da semana. Antes de estourar, não depois.' },
            { icon: '✅', title: 'Checklist semanal', desc: '15 minutos toda semana para revisar receitas, gastos e metas. O hábito que separa quem controla de quem sofre.' },
            { icon: '📈', title: 'Histórico e gráficos', desc: 'Compare meses, veja tendências e entenda sua evolução financeira ao longo do tempo.' },
            { icon: '🏦', title: 'Contas bancárias', desc: 'Cadastre suas contas e acompanhe o saldo de cada uma. Nubank, Inter, Bradesco — todos centralizados.' },
            { icon: '💰', title: 'Metas financeiras', desc: 'Defina objetivos e acompanhe o progresso com aportes mensais. Viagem, notebook, reserva — tudo registrado.' },
          ].map(f => (
            <div key={f.title} className="func-card">
              <div className="func-icon">{f.icon}</div>
              <div className="func-title">{f.title}</div>
              <div className="func-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TRANSFORMAÇÃO */}
      <section id="transformacao">
        <div className="reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div className="sec-label" style={{ justifyContent: 'center' }}><span style={{ width: 0 }} />Transformação</div>
          <h2 className="sec-h">Antes e depois do Zynflow</h2>
        </div>
        <div className="trans-grid reveal">
          <div className="trans-col antes">
            <div className="trans-col-title">😰 Antes</div>
            {['Não sabe quanto vai entrar no mês', 'Gasta o mês bom como se fosse sempre assim', 'Qualquer imprevisto vira crise', 'Sem reserva, sem fundo, sem plano', 'Descobre no extrato o que gastou'].map(t => (
              <div key={t} className="trans-item"><span className="ti">✗</span>{t}</div>
            ))}
          </div>
          <div className="trans-col depois">
            <div className="trans-col-title">✨ Depois</div>
            {['Sabe exatamente o que vai entrar e o que pode gastar', 'Guarda % automático nos meses bons', 'Reserva de emergência cobre qualquer susto', 'Fundo de Meses Fracos garante os ruins', 'Vê em tempo real para onde vai cada real'].map(t => (
              <div key={t} className="trans-item"><span className="ti">✓</span>{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos">
        <div className="reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div className="sec-label" style={{ justifyContent: 'center' }}><span style={{ width: 0 }} />Depoimentos</div>
          <h2 className="sec-h">O que dizem quem usa</h2>
        </div>
        <div className="dep-grid reveal">
          {[
            { iniciais: 'CM', nome: 'Carlos M.', role: 'Designer freelancer · São Paulo, SP', texto: '"Em 3 meses usando o Zynflow eu finalmente entendi por que o dinheiro sumia. O Fundo de Meses Fracos mudou minha vida — passei um mês sem cliente e não entrei no vermelho pela primeira vez."' },
            { iniciais: 'AP', nome: 'Ana P.', role: 'Consultora de marketing · Curitiba, PR', texto: '"Tentei Mobills, tentei planilha, tentei de tudo. Nada funcionava porque nenhum era feito para autônomo. O Zynflow foi o único que entendeu que minha renda é variável e me deu um método de verdade."' },
            { iniciais: 'RB', nome: 'Rafael B.', role: 'Desenvolvedor autônomo · Belo Horizonte, MG', texto: '"O teto semanal é genial. Antes eu ia gastando e só descobria no fim do mês que tinha estourado. Agora o app me avisa quando estou chegando no limite — antes de acontecer o estrago."' },
          ].map(d => (
            <div key={d.nome} className="dep-card">
              <div className="dep-stars">★★★★★</div>
              <p className="dep-text">{d.texto}</p>
              <div className="dep-author">
                <div className="dep-avatar">{d.iniciais}</div>
                <div><div className="dep-name">{d.nome}</div><div className="dep-role">{d.role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANO */}
      <section id="plano">
        <div className="reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div className="sec-label" style={{ justifyContent: 'center' }}><span style={{ width: 0 }} />Plano</div>
          <h2 className="sec-h">Simples. Sem pegadinha.</h2>
        </div>
        <div className="plano-box reveal">
          <span className="plano-badge">Zynflow Pro</span>
          <div className="plano-price">R$ 19<span>,90/mês</span></div>
          <div className="plano-trial">✓ 30 dias completamente grátis · Sem cartão</div>
          <ul className="plano-items">
            {['Dashboard com Método 3 Passos completo','Teto semanal calculado automaticamente','Fundo de Meses Fracos — exclusivo autônomo','Contas, receitas e despesas ilimitadas','Metas financeiras com aportes','Checklist semanal interativo','Histórico anual com gráficos','Perspectiva financeira personalizada','Suporte por WhatsApp'].map(i => <li key={i}>{i}</li>)}
          </ul>
          <button className="btn-plano" onClick={() => router.push('/auth/cadastro')}>Começar 30 dias grátis →</button>
          <p className="plano-fine">Depois do trial, R$ 19,90/mês. Cancele quando quiser, sem multa.</p>
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
            { q: 'O Zynflow é diferente dos outros apps de finanças?', a: 'Sim. Todos os outros apps foram feitos para quem tem salário fixo. O Zynflow foi construído do zero para autônomo com renda variável. O Método 3 Passos, o Fundo de Meses Fracos e o teto semanal automático não existem em nenhum outro app.' },
            { q: 'E se eu não gostar? Posso cancelar?', a: 'Pode cancelar quando quiser, sem burocracia e sem multa. Dentro do trial, você cancela e não paga nada. Depois do trial, se cancelar, o acesso continua até o fim do período pago.' },
            { q: 'Funciona para qualquer tipo de autônomo?', a: 'Sim. Freelancer, MEI, consultor, designer, desenvolvedor, profissional liberal, prestador de serviços — qualquer autônomo que tem renda variável vai se beneficiar do Zynflow.' },
            { q: 'Meus dados financeiros estão seguros?', a: 'Sim. Os dados ficam armazenados no Supabase com criptografia e isolamento por usuário (Row Level Security). Nenhum funcionário ou terceiro tem acesso aos seus lançamentos financeiros.' },
            { q: 'Consigo usar no celular?', a: 'Sim. O Zynflow é um PWA — funciona em qualquer navegador, incluindo mobile. Você pode instalá-lo na tela inicial do seu celular e usá-lo como um app nativo, sem precisar baixar nada.' },
            { q: 'O app conecta com meu banco automaticamente?', a: 'Ainda não. Os lançamentos são manuais — e isso é intencional. Pesquisas mostram que quem lança manualmente tem muito mais consciência dos gastos e cria o hábito mais facilmente. A integração automática com bancos está no nosso roadmap.' },
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
          <h2 className="sec-h">Chega de ficar no sufoco.<br />Comece hoje.</h2>
          <p className="cta-final-sub">30 dias grátis. Sem cartão. Sem risco. Só você e o controle do seu dinheiro.</p>
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