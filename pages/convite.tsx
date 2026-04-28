import { useEffect, useState, type CSSProperties } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import heroImage from './assets/img-hero-plantto-page-convite.jpg';
import closingImage from './assets/plantt-image-boy-note.jpg';
import dashboardBetaImage from './assets/plantto-dashboard-beta-01.png';
import planttoIconShort from './assets/plantto-icon-short.png';

type StepIconKind = 'user' | 'file' | 'key' | 'chat' | 'spark';

const DIFFERENTIALS = [
  'Consolida identidade, público, posicionamento e oferta em uma camada de contexto viva.',
  'Lê anexos, referências e materiais enviados e transforma tudo em direção estratégica utilizável.',
  'Acumula memória de marca com decisões, aprendizados e restrições que continuam presentes no uso diário.',
  'Cria documentos, linha editorial e planejamento de conteúdo no mesmo ambiente em que a conversa acontece.',
];

const ACCESS_STEPS: Array<{ icon: StepIconKind; title: string; text: string }> = [
  {
    icon: 'user',
    title: 'Crie sua conta',
    text: 'Acesse o app Planttô e cadastre-se. É aqui que a sua base de marca começa a ser construída.',
  },
  {
    icon: 'file',
    title: 'Envie seus materiais',
    text: 'Mande o que você já tem: apresentações, propostas, bio, posts. O app extrai, organiza e conecta tudo em uma camada de contexto da sua marca.',
  },
  {
    icon: 'key',
    title: 'Copie o token',
    text: 'O app gera um token único vinculado ao seu contexto de marca. Copie e guarde.',
  },
  {
    icon: 'chat',
    title: 'Ative o Agente no ChatGPT',
    text: 'Abra o Agente Planttô no ChatGPT, cole o token e continue construindo com toda a memória e direção da sua marca já ativas.',
  },
];

const OUTCOMES = [
  'A leitura da sua identidade de marca: não como você declarou, mas como ela realmente aparece no que você produz.',
  'Os padrões que o sistema identificou e as lacunas que ainda existem.',
  'Os próximos passos concretos. Como uma foto que vai ganhando resolução.',
];

export default function ConvitePage() {
  const [viewportWidth, setViewportWidth] = useState(1280);
  const isCompact = viewportWidth < 920;
  const styles = createStyles(isCompact);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <Head>
        <title>Planttô | Convite Beta</title>
        <meta
          name="description"
          content="Planttô é onde a sua marca finalmente encontra palavras."
        />
        <meta property="og:title" content="Planttô | Convite Beta" />
        <meta
          property="og:description"
          content="Planttô é onde a sua marca finalmente encontra palavras."
        />
        <meta property="og:type" content="website" />
      </Head>

      <main style={styles.main}>
        <div style={styles.backgroundGlowA} aria-hidden="true" />
        <div style={styles.backgroundGlowB} aria-hidden="true" />

        <div style={styles.shell}>
          <section style={styles.heroCard}>
            <div style={styles.heroCopy}>
              <p style={styles.eyebrow}>Convite Planttô beta</p>
              <h1 style={styles.title}>Você tem uma marca. Ela só ainda não foi organizada.</h1>
              <div style={styles.heroLeadStack}>
                <p style={styles.lead}>
                  O Planttô transforma o que você já produziu em uma leitura clara da sua marca. Sem formulário
                  interminável. Sem consultoria cara. Sem ter que saber se descrever antes de começar.
                </p>
              </div>

              <div style={styles.heroActions}>
                <Link href="https://plantto.vercel.app/" style={styles.primaryButton}>
                  Entrar no beta
                </Link>
                <a href="#como-acessar" style={styles.secondaryButton}>
                  Ver como funciona
                </a>
              </div>

            </div>

            <div style={styles.heroMedia}>
              <div style={styles.heroImageFrame}>
                <Image
                  src={heroImage}
                  alt="Profissional trabalhando no notebook em um ambiente acolhedor"
                  style={styles.heroImage}
                  priority
                />
              </div>
              <div style={styles.floatingNote}>
                <Image src={planttoIconShort} alt="" aria-hidden="true" style={styles.noteIcon} />
                <div>
                  <strong style={styles.noteTitle}>Contexto de marca em construção</strong>
                  <p style={styles.noteText}>
                    Cada arquivo enviado vira uma camada de clareza. Sua marca vai ganhando forma com o tempo.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section style={styles.storyGrid}>
            <article style={styles.storyCard}>
              <p style={styles.sectionLabel}>O que é o Planttô</p>
              <h2 style={styles.sectionTitle}>O lugar onde você joga tudo que sabe sobre a sua marca e descobre o que ela realmente é.</h2>
              <div style={styles.paragraphStack}>
                <p style={styles.body}>
                  Não é um formulário. Não é uma consultoria. Não é um gerador de conteúdo.
                </p>
                <p style={styles.body}>
                  O Planttô é um processo de revelação: silencioso, acumulativo e cada vez mais preciso, que acontece
                  enquanto você vai vivendo o seu trabalho.
                </p>
                <p style={styles.body}>
                  Suas melhores ideias sobre o seu negócio estão numa apresentação que você não abre faz meses. Num post
                  que bombou mas que você nunca entendeu como padrão. Numa conversa que revelou seu posicionamento real e
                  foi esquecida no dia seguinte.
                </p>
                <p style={styles.body}>A clareza existe: em cacos. O problema é que cacos não servem de bússola.</p>
                <p style={styles.bodyStrong}>O Planttô junta os pedaços. E te mostra o que eles formam.</p>
              </div>
            </article>

            <article style={styles.differentialsCard}>
              <p style={styles.sectionLabel}>O que muda na prática</p>
              <div style={styles.metricRow}>
                <div style={styles.metricCard}>
                  <span style={styles.metricValue}>1 contexto</span>
                  <span style={styles.metricLabel}>marca, documentos e decisões no mesmo fluxo</span>
                </div>
                <div style={styles.metricCard}>
                  <span style={styles.metricValue}>0 recomeços</span>
                  <span style={styles.metricLabel}>cada conversa parte do que já foi construído</span>
                </div>
              </div>
              <div style={styles.listStack}>
                {DIFFERENTIALS.map((item) => (
                  <div key={item} style={styles.listItem}>
                    <span style={styles.listBullet} aria-hidden="true" />
                    <p style={styles.listText}>{item}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section style={styles.bannerCard}>
            <Image src={planttoIconShort} alt="" aria-hidden="true" style={styles.bannerIcon} />
            <div>
              <p style={styles.bannerLabel}>A base de conhecimento é sua. Por isso a leitura é sua.</p>
              <p style={styles.bannerText}>Basta pedir para o assistente salvar o que realmente importa.</p>
            </div>
          </section>

          <section id="como-acessar" style={styles.accessSection}>
            <p style={styles.sectionLabel}>Como acessar</p>

            <div style={styles.stepsGrid}>
              {ACCESS_STEPS.map((step) => (
                <article key={step.title} style={styles.stepCard}>
                  <div style={styles.stepHeader}>
                    <span style={styles.stepIconBadge} aria-hidden="true">
                      <StepIcon kind={step.icon} color="var(--planto-light-text-strong)" />
                    </span>
                  </div>
                  <h3 style={styles.stepTitle}>{step.title}</h3>
                  <p style={styles.stepText}>{step.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.outcomeSection}>
            <article style={styles.outcomeCard}>
              <p style={styles.sectionLabel}>O resultado</p>
              <div style={styles.outcomeImageFrame}>
                <Image
                  src={dashboardBetaImage}
                  alt="Prévia do painel beta do Planttô"
                  style={styles.outcomeImage}
                />
              </div>
              <h2 style={styles.sectionTitle}>Não é um relatório. É um painel vivo que fica mais preciso com o tempo.</h2>
              <div style={styles.outcomeList}>
                {OUTCOMES.map((item) => (
                  <p key={item} style={styles.outcomeItem}>
                    {item}
                  </p>
                ))}
              </div>
            </article>

            <article style={styles.closingCard}>
              <p style={styles.sectionLabel}>Vamos construir juntos?</p>
              <div style={styles.closingImageFrame}>
                <Image
                  src={closingImage}
                  alt="Pessoa escrevendo em um caderno durante uma sessão de trabalho"
                  style={styles.closingImage}
                />
              </div>
              <div style={styles.paragraphStack}>
                <p style={styles.body}>
                  Você sabe fazer bem o que faz. Tem clientes. Tem resultados. Mas quando alguém pergunta “o que você faz
                  exatamente?”, você hesita.
                </p>
                <p style={styles.body}>
                  Quando vai criar conteúdo, começa do zero toda vez. Quando precisa explicar seu diferencial, usa
                  palavras genéricas que não soam como você.
                </p>
                <p style={styles.bodyStrong}>O Planttô é o espelho que você nunca conseguiu segurar sozinho.</p>
                <p style={styles.body}>
                  Esta fase beta acontece com um grupo limitado para garantir acompanhamento próximo e uma experiência
                  realmente útil desde o início.
                </p>
                <p style={styles.body}>
                  Seu feedback ajuda a refinar o produto. Você sai dessa fase com uma base de marca mais organizada,
                  documentada e pronta para crescer.
                </p>
              </div>
              <div style={styles.closingActions}>
                <Link href="https://plantto.vercel.app/" style={styles.primaryButton}>
                  Entrar no beta
                </Link>
              </div>
            </article>
          </section>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};

function createStyles(isCompact: boolean): Record<string, CSSProperties> {
  return {
    main: {
      position: 'relative',
      overflow: 'hidden',
      minHeight: '100vh',
      padding: isCompact ? '20px 14px 48px' : '32px 24px 72px',
      background:
        'radial-gradient(circle at 15% 15%, rgba(255, 255, 255, 0.9), transparent 24%), linear-gradient(180deg, #f6f0e8 0%, #f3ece3 100%)',
      color: 'var(--planto-light-text)',
      fontFamily: '"Inter", "Segoe UI", sans-serif',
    },
    backgroundGlowA: {
      position: 'absolute',
      top: '-120px',
      left: '-80px',
      width: '340px',
      height: '340px',
      borderRadius: '999px',
      background: 'rgba(67, 201, 137, 0.16)',
      filter: 'blur(40px)',
      pointerEvents: 'none',
    },
    backgroundGlowB: {
      position: 'absolute',
      right: '-120px',
      top: '220px',
      width: '360px',
      height: '360px',
      borderRadius: '999px',
      background: 'rgba(194, 153, 105, 0.16)',
      filter: 'blur(50px)',
      pointerEvents: 'none',
    },
    shell: {
      position: 'relative',
      zIndex: 1,
      width: '100%',
      maxWidth: '1180px',
      margin: '0 auto',
      display: 'grid',
      gap: isCompact ? '18px' : '24px',
    },
    heroCard: {
      display: 'grid',
      gridTemplateColumns: isCompact ? 'minmax(0, 1fr)' : 'minmax(0, 1.05fr) minmax(360px, 0.95fr)',
      gap: isCompact ? '22px' : '28px',
      padding: 0,
      alignItems: 'center',
    },
    heroCopy: {
      display: 'grid',
      gap: '18px',
      alignContent: 'start',
    },
    eyebrow: {
      margin: 0,
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      fontSize: '0.76rem',
      fontWeight: 700,
      color: 'var(--planto-light-accent-muted)',
    },
    title: {
      margin: 0,
      maxWidth: isCompact ? '12ch' : '13ch',
      fontFamily: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: isCompact ? '3rem' : '4.8rem',
      lineHeight: isCompact ? 0.98 : 0.92,
      letterSpacing: '-0.05em',
      color: '#102017',
    },
    heroLeadStack: {
      display: 'grid',
      gap: '12px',
    },
    lead: {
      margin: 0,
      maxWidth: '60ch',
      fontSize: isCompact ? '1rem' : '1.05rem',
      lineHeight: 1.75,
      color: '#42584d',
    },
    metricRow: {
      display: 'grid',
      gridTemplateColumns: isCompact ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
      gap: '12px',
    },
    metricCard: {
      display: 'grid',
      gap: '6px',
      padding: '16px 18px',
      borderRadius: '10px',
      background: 'var(--planto-light-accent-soft)',
      border: '1px solid var(--planto-light-border-accent)',
    },
    metricValue: {
      fontSize: isCompact ? '1.2rem' : '1.36rem',
      fontWeight: 700,
      color: '#102017',
    },
    metricLabel: {
      fontSize: '0.92rem',
      lineHeight: 1.55,
      color: '#557062',
    },
    heroActions: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      marginTop: '2px',
    },
    primaryButton: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50px',
      padding: '0 20px',
      borderRadius: '999px',
      border: '1px solid rgba(23, 42, 30, 0.08)',
      background: 'var(--planto-light-accent)',
      color: '#08140e',
      fontWeight: 700,
      textDecoration: 'none',
      boxShadow: '0 14px 32px rgba(67, 201, 137, 0.28)',
    },
    secondaryButton: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50px',
      padding: '0 20px',
      borderRadius: '999px',
      border: '1px solid rgba(23, 42, 30, 0.12)',
      background: 'rgba(255, 255, 255, 0.6)',
      color: '#15241b',
      fontWeight: 700,
      textDecoration: 'none',
    },
    footnote: {
      margin: 0,
      fontSize: '0.83rem',
      lineHeight: 1.5,
      color: '#688173',
    },
    heroMedia: {
      position: 'relative',
      display: 'grid',
      gap: '16px',
      alignContent: 'start',
    },
    heroImageFrame: {
      minHeight: isCompact ? '360px' : '620px',
      borderRadius: '10px',
      overflow: 'hidden',
      background: '#dbc8b3',
      boxShadow: '0 26px 60px rgba(80, 56, 32, 0.16)',
    },
    heroImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    floatingNote: {
      position: isCompact ? 'relative' : 'absolute',
      left: isCompact ? 'auto' : '-22px',
      bottom: isCompact ? 'auto' : '56px',
      zIndex: 2,
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
      gap: '12px',
      alignItems: 'center',
      marginTop: 0,
      marginLeft: 0,
      width: isCompact ? '100%' : 'min(360px, 82%)',
      padding: '16px',
      borderRadius: '10px',
      background: 'rgba(255, 250, 245, 0.94)',
      border: '1px solid rgba(22, 53, 31, 0.08)',
      boxShadow: '0 20px 50px rgba(70, 48, 28, 0.16)',
      transform: 'none',
    },
    noteIcon: {
      width: '42px',
      height: '42px',
      objectFit: 'contain',
    },
    noteTitle: {
      display: 'block',
      marginBottom: '4px',
      color: '#102017',
      fontSize: '0.96rem',
    },
    noteText: {
      margin: 0,
      color: '#5b7064',
      fontSize: '0.88rem',
      lineHeight: 1.5,
    },
    storyGrid: {
      display: 'grid',
      gridTemplateColumns: isCompact ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(320px, 0.92fr)',
      gap: '18px',
    },
    storyCard: {
      padding: isCompact ? '22px' : '28px',
      borderRadius: '10px',
      background: 'rgba(255, 251, 247, 0.72)',
      border: '1px solid rgba(27, 56, 35, 0.08)',
      display: 'grid',
      gap: '14px',
    },
    differentialsCard: {
      padding: isCompact ? '22px' : '28px',
      borderRadius: '10px',
      background: 'linear-gradient(180deg, rgba(67, 201, 137, 0.1) 0%, rgba(67, 201, 137, 0.16) 100%)',
      border: '1px solid var(--planto-light-border-accent)',
      display: 'grid',
      gap: '18px',
    },
    sectionLabel: {
      margin: 0,
      textTransform: 'uppercase',
      letterSpacing: '0.16em',
      fontSize: '0.74rem',
      fontWeight: 700,
      color: '#537060',
    },
    sectionTitle: {
      margin: 0,
      fontFamily: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
      fontSize: isCompact ? '2rem' : '2.5rem',
      lineHeight: 1.02,
      letterSpacing: '-0.04em',
      color: '#102017',
      maxWidth: isCompact ? '18ch' : '22ch',
    },
    paragraphStack: {
      display: 'grid',
      gap: '12px',
    },
    body: {
      margin: 0,
      fontSize: '0.98rem',
      lineHeight: 1.8,
      color: '#465b51',
    },
    bodyStrong: {
      margin: 0,
      fontSize: '1rem',
      lineHeight: 1.75,
      color: '#102017',
      fontWeight: 700,
    },
    listStack: {
      display: 'grid',
      gap: '14px',
    },
    listItem: {
      display: 'grid',
      gridTemplateColumns: '12px minmax(0, 1fr)',
      gap: '12px',
      alignItems: 'start',
    },
    listBullet: {
      width: '10px',
      height: '10px',
      marginTop: '6px',
      borderRadius: '999px',
      background: 'var(--planto-light-accent)',
      boxShadow: '0 0 0 5px rgba(67, 201, 137, 0.14)',
    },
    listText: {
      margin: 0,
      fontSize: '0.96rem',
      lineHeight: 1.7,
      color: '#264536',
    },
    bannerCard: {
      display: 'grid',
      gridTemplateColumns: isCompact ? 'minmax(0, 1fr)' : 'auto minmax(0, 1fr)',
      gap: '16px',
      alignItems: 'center',
      padding: isCompact ? '20px' : '24px 28px',
      borderRadius: '10px',
      background: 'var(--planto-light-accent)',
      color: 'var(--planto-light-accent-text)',
      boxShadow: '0 26px 70px rgba(67, 201, 137, 0.24)',
    },
    bannerIcon: {
      width: '48px',
      height: '48px',
      objectFit: 'contain',
    },
    bannerLabel: {
      margin: '0 0 4px',
      fontSize: isCompact ? '1.15rem' : '1.34rem',
      lineHeight: 1.35,
      fontWeight: 700,
      color: 'var(--planto-light-accent-text)',
    },
    bannerText: {
      margin: 0,
      fontSize: '0.95rem',
      lineHeight: 1.6,
      color: 'rgba(3, 17, 9, 0.78)',
    },
    accessSection: {
      display: 'grid',
      gap: '12px',
    },
    stepsGrid: {
      display: 'grid',
      gridTemplateColumns: isCompact ? 'minmax(0, 1fr)' : 'repeat(4, minmax(0, 1fr))',
      gap: '14px',
    },
    stepCard: {
      display: 'grid',
      gap: '14px',
      padding: isCompact ? '18px' : '22px',
      borderRadius: '10px',
      background: 'rgba(255, 251, 247, 0.82)',
      border: '1px solid rgba(25, 59, 34, 0.08)',
      minHeight: isCompact ? 'auto' : '260px',
      alignContent: 'start',
    },
    stepHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '12px',
    },
    stepIconBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '50px',
      height: '50px',
      borderRadius: '16px',
      background: 'var(--planto-light-accent-soft)',
      border: '1px solid var(--planto-light-border-accent)',
    },
    stepTitle: {
      margin: 0,
      fontSize: '1.08rem',
      lineHeight: 1.3,
      color: '#102017',
    },
    stepText: {
      margin: 0,
      fontSize: '0.94rem',
      lineHeight: 1.7,
      color: '#51675b',
    },
    outcomeSection: {
      display: 'grid',
      gridTemplateColumns: isCompact ? 'minmax(0, 1fr)' : 'minmax(0, 0.9fr) minmax(320px, 1.1fr)',
      gap: '18px',
    },
    outcomeCard: {
      padding: isCompact ? '22px' : '28px',
      borderRadius: '10px',
      background: 'linear-gradient(180deg, rgba(67, 201, 137, 0.1) 0%, rgba(67, 201, 137, 0.16) 100%)',
      color: 'var(--planto-light-text)',
      display: 'grid',
      gap: '16px',
      border: '1px solid var(--planto-light-border-accent)',
    },
    outcomeImageFrame: {
      width: '100%',
    },
    outcomeImage: {
      width: '100%',
      height: 'auto',
      objectFit: 'contain',
      display: 'block',
    },
    outcomeList: {
      display: 'grid',
      gap: '10px',
    },
    outcomeItem: {
      margin: 0,
      padding: '12px 14px',
      borderRadius: '10px',
      background: 'var(--planto-light-accent-soft)',
      border: '1px solid var(--planto-light-border-accent)',
      fontSize: '0.96rem',
      lineHeight: 1.65,
      color: '#031109',
    },
    closingCard: {
      padding: isCompact ? '22px' : '28px',
      borderRadius: '10px',
      background: 'rgba(255, 251, 247, 0.76)',
      border: '1px solid rgba(25, 59, 34, 0.08)',
      display: 'grid',
      gap: '16px',
      alignContent: 'start',
    },
    closingImageFrame: {
      width: '100%',
      minHeight: isCompact ? '220px' : '260px',
      borderRadius: '10px',
      overflow: 'hidden',
      background: 'rgba(67, 201, 137, 0.08)',
    },
    closingImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
    },
    closingActions: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      marginTop: '4px',
    },
  };
}

function StepIcon({ kind, color }: { kind: StepIconKind; color: string }) {
  if (kind === 'user') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="1.8" />
        <path d="M6.5 19c.7-3 3-4.8 5.5-4.8s4.8 1.8 5.5 4.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'file') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path
          d="M7 3.8h6.4L18 8.4V19a1.2 1.2 0 0 1-1.2 1.2H7A1.2 1.2 0 0 1 5.8 19V5A1.2 1.2 0 0 1 7 3.8Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M13.2 4.2v4.4h4.4M9 12.2h6M9 15.2h4.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'key') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <circle cx="8" cy="12" r="3.4" stroke={color} strokeWidth="1.8" />
        <path d="M11.4 12H20M16.2 12v2.8M13.6 12v1.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'chat') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path
          d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 16.5h-7l-4.5 3v-3H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8 11h8M8 13.8h5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M12 3.8l1.8 4.1 4.5.4-3.4 3 1 4.4L12 13.5l-3.9 2.2 1-4.4-3.4-3 4.5-.4L12 3.8Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
