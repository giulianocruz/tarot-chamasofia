"use client";

import { useMemo, useState } from 'react';
import type { FreeNatalPreview, AstroPlanet } from '@/lib/astrology-types';
import {
  buildJourneySummary,
  formatJourneyPrice,
  journeyModulesFor,
  signPt,
  type JourneyInterest,
} from '@/lib/jornada-sofia';
import styles from './page.module.css';

type Step = 0 | 1 | 2 | 3;

type FormState = {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timeKnown: boolean;
  interest: JourneyInterest;
};

const INTERESTS: Array<{ id: JourneyInterest; icon: string; title: string; text: string }> = [
  { id: 'amor', icon: '♡', title: 'Amor', text: 'Relacionamentos e vínculos' },
  { id: 'carreira', icon: '◇', title: 'Carreira', text: 'Trabalho e prosperidade' },
  { id: 'espiritualidade', icon: '✦', title: 'Espiritualidade', text: 'Energia e simbolismo' },
  { id: 'autoconhecimento', icon: '☼', title: 'Eu', text: 'Autoconhecimento e propósito' },
];

const PLANETS: Array<[keyof FreeNatalPreview['natal'], string, string]> = [
  ['sun', 'SOL', 'Identidade'],
  ['moon', 'LUA', 'Emoções'],
  ['mercury', 'MERCÚRIO', 'Mente'],
  ['venus', 'VÊNUS', 'Vínculos'],
  ['mars', 'MARTE', 'Ação'],
  ['ascendantSign', 'ASC', 'Presença'],
];

function getTrackingId(key: string, prefix: string) {
  if (typeof window === 'undefined') return `${prefix}:server`;
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = `${prefix}:${crypto.randomUUID()}`;
    localStorage.setItem(key, next);
    return next;
  } catch {
    return `${prefix}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  }
}

function emit(event: string, metadata: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const anonymousId = getTrackingId('cs_jornada_anon', 'jornada');
  let sessionId = '';
  try {
    sessionId = sessionStorage.getItem('cs_jornada_session') || `journey-session:${crypto.randomUUID()}`;
    sessionStorage.setItem('cs_jornada_session', sessionId);
  } catch {
    sessionId = `journey-session:${Date.now()}`;
  }
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, anonymous_id: anonymousId, session_id: sessionId, metadata: { surface: 'jornada-sofia', ...metadata } }),
    keepalive: true,
  });
}

function planetLabel(value: AstroPlanet | undefined) {
  if (!value) return 'Não calculado';
  const degree = Number.isFinite(value.degree) ? ` · ${Number(value.degree).toFixed(1)}°` : '';
  return `${signPt(value.sign)}${degree}`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || '';
}

export default function JornadaMapClient() {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>({
    name: '', birthDate: '', birthTime: '', birthPlace: '', timeKnown: true, interest: 'autoconhecimento',
  });
  const [result, setResult] = useState<FreeNatalPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [chamas, setChamas] = useState(10);
  const [shared, setShared] = useState(false);

  const summary = useMemo(() => result ? buildJourneySummary(result, firstName(form.name), form.interest) : null, [result, form.name, form.interest]);
  const modules = useMemo(() => journeyModulesFor(form.interest), [form.interest]);

  function patch(next: Partial<FormState>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function advance(next: Step) {
    setError('');
    if (step === 0 && form.name.trim().length < 2) return setError('Como podemos chamar você?');
    if (step === 1 && !form.birthDate) return setError('Informe sua data de nascimento.');
    if (step === 2 && (!form.birthPlace.trim() || (form.timeKnown && !form.birthTime))) return setError('Informe a cidade e, se souber, o horário de nascimento.');
    if (step === 0) emit('onboarding_started', { entry: 'mapa_astral_gratis' });
    emit('form_step_view', { step: next, from_step: step });
    setStep(next);
  }

  async function calculate() {
    setError('');
    setLoading(true);
    emit('form_step_view', { step: 'calculation', interest: form.interest, time_known: form.timeKnown });
    try {
      const response = await fetch('/api/astrology/free-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: form.birthDate,
          birthTime: form.birthTime,
          birthPlace: form.birthPlace,
          timeKnown: form.timeKnown,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível calcular seu mapa agora.');
      setResult(data.preview as FreeNatalPreview);
      setChamas(10);
      emit('astrology_profile_completed', { surface: 'jornada-sofia', interest: form.interest, time_known: form.timeKnown });
      try { localStorage.setItem('cs_jornada_birth', JSON.stringify(form)); } catch {}
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível calcular seu mapa agora.');
    } finally {
      setLoading(false);
    }
  }

  async function captureLead(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Digite um e-mail válido para liberar seu PDF.');
    setLeadSaving(true);
    try {
      const anonymousId = getTrackingId('cs_jornada_anon', 'jornada');
      let sessionId = '';
      try { sessionId = sessionStorage.getItem('cs_jornada_session') || ''; } catch {}
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymous_id: anonymousId,
          session_id: sessionId,
          email: email.trim(),
          customer_name: form.name.trim(),
          category: `jornada:${form.interest}`,
          question: 'Lead capturado após receber o mapa astral gratuito resumido.',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar seu mapa.');
      setLeadCaptured(true);
      setChamas((value) => value + 10);
      emit('contact_captured', { source: 'free_birth_chart_pdf', interest: form.interest, has_email: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar seu mapa.');
    } finally {
      setLeadSaving(false);
    }
  }

  async function downloadPdf() {
    if (!leadCaptured) return;
    setPdfLoading(true);
    setError('');
    try {
      const response = await fetch('/api/jornada/mapa-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível gerar o PDF.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'meu-mapa-astral-jornada-sofia.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      emit('cta_click', { target: 'free_birth_chart_pdf_download', interest: form.interest });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível gerar o PDF.');
    } finally {
      setPdfLoading(false);
    }
  }

  async function shareJourney() {
    const text = result
      ? `Comecei minha Jornada Sofia: Sol em ${signPt(result.natal.sun?.sign)}, Lua em ${signPt(result.natal.moon?.sign)}${result.natal.ascendantSign ? ` e Ascendente em ${signPt(result.natal.ascendantSign)}` : ''}. Faça seu mapa grátis também.`
      : 'Descubra seu mapa astral grátis na Jornada Sofia.';
    try {
      if (navigator.share) await navigator.share({ title: 'Minha Jornada Sofia', text, url: 'https://jornada.chamasofia.com.br/mapa-astral' });
      else await navigator.clipboard.writeText(`${text} https://jornada.chamasofia.com.br/mapa-astral`);
      if (!shared) {
        setShared(true);
        setChamas((value) => value + 10);
      }
      emit('cta_click', { target: 'share_jornada', reward: 10 });
    } catch {
      // Cancelar o compartilhamento não deve interromper a experiência.
    }
  }

  function reset() {
    setStep(0); setResult(null); setError(''); setLeadCaptured(false); setEmail(''); setShared(false); setChamas(10);
  }

  if (result && summary) {
    return (
      <section className={`${styles.experienceCard} ${styles.resultCard}`} aria-live="polite">
        <div className={styles.resultTop}>
          <div><span className={styles.micro}>SEU MAPA GRATUITO ESTÁ PRONTO</span><h2>{summary.greeting}</h2><p>{result.birth.resolvedPlace}</p></div>
          <div className={styles.points}><b>✦ {chamas}</b><span>Chamas</span></div>
        </div>

        <div className={styles.bigThree}>
          {PLANETS.map(([key, label, role]) => {
            const isAsc = key === 'ascendantSign';
            const value = isAsc
              ? (result.birth.timeKnown ? signPt(result.natal.ascendantSign) : 'Horário necessário')
              : planetLabel(result.natal[key] as AstroPlanet | undefined);
            return <article key={String(key)}><small>{label}</small><strong>{value}</strong><span>{role}</span></article>;
          })}
        </div>

        <article className={styles.storyCard}>
          <span className={styles.micro}>SUA LEITURA RESUMIDA</span>
          <h3>{summary.elementLabel}</h3>
          <p>{summary.identity}</p><p>{summary.emotional}</p><p>{summary.expression}</p><p>{summary.attraction}</p><p>{summary.action}</p>
          <div className={styles.synthesis}>{summary.synthesis}</div>
          <small>{result.precisionNote}</small>
        </article>

        <div className={styles.saveBox}>
          <div><span className={styles.micro}>GUARDE ESTA DESCOBERTA</span><h3>Seu PDF personalizado é grátis.</h3><p>Informe seu e-mail para salvar sua Jornada e liberar o download agora. Sem cartão.</p></div>
          {!leadCaptured ? (
            <form onSubmit={captureLead} className={styles.emailForm}>
              <input aria-label="Seu melhor e-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
              <button disabled={leadSaving}>{leadSaving ? 'SALVANDO...' : 'LIBERAR MEU PDF GRÁTIS →'}</button>
            </form>
          ) : (
            <button className={styles.downloadButton} onClick={downloadPdf} disabled={pdfLoading}>{pdfLoading ? 'GERANDO SEU PDF...' : '↓ BAIXAR MEU MAPA EM PDF'}</button>
          )}
          {leadCaptured && <p className={styles.success}>✓ Jornada salva · +10 Chamas</p>}
        </div>

        <section className={styles.unlockArea}>
          <div className={styles.sectionTitle}><div><span className={styles.micro}>SUA JORNADA CONTINUA</span><h3>Encontramos outras camadas para explorar.</h3></div><button onClick={shareJourney}>{shared ? '✓ COMPARTILHADO' : 'COMPARTILHAR · +10 ✦'}</button></div>
          <div className={styles.moduleGrid}>
            {modules.slice(0, 6).map((module, index) => <article key={module.id} className={index === 0 ? styles.featuredModule : ''}>
              <span className={styles.moduleIcon}>{module.icon}</span><small>{module.eyebrow}</small><h4>{module.title}</h4><p>{module.teaser}</p>
              <div className={styles.blurPreview}><span>Seu primeiro insight aparece aqui...</span><span>Existe mais para revelar sobre este ponto.</span></div>
              <button onClick={() => emit('upsell_viewed', { module: module.id, price_cents: module.priceCents })}>DESBLOQUEAR · {formatJourneyPrice(module.priceCents)}</button>
            </article>)}
          </div>
          <article className={styles.bundleCard}>
            <div><span className={styles.micro}>JORNADA COMPLETA</span><h3>Prefere descobrir tudo de uma vez?</h3><p>Mapa aprofundado + Amor + Prosperidade + Chakras + Animal de Poder + Propósito. O pacote será sempre mais vantajoso que liberar cada caminho separadamente.</p></div>
            <button onClick={() => emit('upsell_interest', { product: 'jornada_completa', proposed_price_cents: 2490 })}>QUERO DESBLOQUEAR TUDO <span>a partir de R$ 24,90</span></button>
          </article>
        </section>

        <div className={styles.afterActions}>
          <a href="/biblioteca" onClick={() => emit('library_click', { source: 'jornada_result' })}>Explorar Biblioteca Sofia →</a>
          <a href="https://tarot.chamasofia.com.br/consulta" onClick={() => emit('cta_click', { target: 'tarot_after_jornada' })}>Fazer uma pergunta ao Tarot →</a>
          <button onClick={reset}>Refazer mapa</button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </section>
    );
  }

  return (
    <section className={styles.experienceCard} id="começar">
      <div className={styles.progress}><span style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
      <div className={styles.stepMeta}><span>ETAPA {step + 1} DE 4</span><b>{step === 0 ? 'Vamos começar' : step === 1 ? 'Seu momento de chegada' : step === 2 ? 'Seu horizonte' : 'Sua intenção'}</b></div>

      {step === 0 && <div className={styles.stepBody}>
        <span className={styles.stepIcon}>✦</span><h2>Como podemos chamar você?</h2><p>Seu nome deixa a leitura mais pessoal. Não precisamos de cadastro para começar.</p>
        <label>Seu nome<input autoFocus value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Ex.: Ana" autoComplete="name" /></label>
        <button className={styles.primaryButton} onClick={() => advance(1)}>COMEÇAR MEU MAPA <span>→</span></button>
      </div>}

      {step === 1 && <div className={styles.stepBody}>
        <span className={styles.stepIcon}>☉</span><h2>{firstName(form.name)}, em que dia você chegou ao mundo?</h2><p>A data posiciona o Sol, a Lua e os planetas pessoais no seu mapa.</p>
        <label>Data de nascimento<input autoFocus type="date" value={form.birthDate} onChange={(e) => patch({ birthDate: e.target.value })} /></label>
        <div className={styles.navButtons}><button onClick={() => setStep(0)}>← VOLTAR</button><button className={styles.primaryButton} onClick={() => advance(2)}>CONTINUAR <span>→</span></button></div>
      </div>}

      {step === 2 && <div className={styles.stepBody}>
        <span className={styles.stepIcon}>ASC</span><h2>Onde estava o horizonte quando você nasceu?</h2><p>Cidade e horário permitem calcular o Ascendente com muito mais segurança.</p>
        <label>Cidade de nascimento<input autoFocus value={form.birthPlace} onChange={(e) => patch({ birthPlace: e.target.value })} placeholder="Ex.: Botucatu, SP, Brasil" autoComplete="off" /></label>
        <label>Horário de nascimento<input disabled={!form.timeKnown} type="time" value={form.birthTime} onChange={(e) => patch({ birthTime: e.target.value })} /></label>
        <label className={styles.checkLabel}><input type="checkbox" checked={!form.timeKnown} onChange={(e) => patch({ timeKnown: !e.target.checked, birthTime: e.target.checked ? '' : form.birthTime })} /><span>Não sei meu horário de nascimento</span></label>
        <small className={styles.privacy}>Usamos esses dados somente para calcular esta experiência. Se você não souber a hora, mostramos o que pode ser calculado com segurança.</small>
        <div className={styles.navButtons}><button onClick={() => setStep(1)}>← VOLTAR</button><button className={styles.primaryButton} onClick={() => advance(3)}>CONTINUAR <span>→</span></button></div>
      </div>}

      {step === 3 && <div className={styles.stepBody}>
        <span className={styles.stepIcon}>◇</span><h2>O que mais ocupa seus pensamentos hoje?</h2><p>Isso não muda seu mapa. Só nos ajuda a organizar a leitura e os próximos caminhos que podem fazer mais sentido para você.</p>
        <div className={styles.interestGrid}>{INTERESTS.map((item) => <button key={item.id} type="button" className={form.interest === item.id ? styles.selectedInterest : ''} onClick={() => patch({ interest: item.id })}><span>{item.icon}</span><strong>{item.title}</strong><small>{item.text}</small></button>)}</div>
        <div className={styles.navButtons}><button onClick={() => setStep(2)}>← VOLTAR</button><button className={styles.primaryButton} disabled={loading} onClick={calculate}>{loading ? 'LENDO SEU CÉU...' : 'REVELAR MEU MAPA GRÁTIS'} <span>→</span></button></div>
      </div>}

      {loading && <div className={styles.calculating}><span>✦</span><strong>Posicionando seu céu de nascimento…</strong><small>Calculando signos, coordenadas e fuso histórico.</small></div>}
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
