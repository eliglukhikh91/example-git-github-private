import React, { useEffect, useState } from 'react';
import { LanguageCode } from '../data/translations';
import { useAuth } from '../contexts/AuthContext';
import { LumaLotusIcon } from './icons/LumaIcons';

interface LoginScreenProps {
  language: LanguageCode;
}

const STRINGS: Record<LanguageCode, {
  title: string;
  subtitle: string;
  emailPlaceholder: string;
  sendLink: string;
  sending: string;
  checkEmailTitle: string;
  checkEmailBody: (email: string) => string;
  useDifferentEmail: string;
  confirmEmailTitle: string;
  confirmEmailBody: string;
  confirmBtn: string;
  nameTitle: string;
  nameSubtitle: string;
  namePlaceholder: string;
  continueBtn: string;
  notConfiguredTitle: string;
  notConfiguredBody: string;
  genericError: string;
  verifyingLink: string;
  agreeToTermsPrefix: string;
  termsLink: string;
  andWord: string;
  privacyLink: string;
}> = {
  en: {
    title: 'Welcome to Luma',
    subtitle: 'Enter your email — we\'ll send you a secure sign-in link, no password needed.',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Send me a link',
    sending: 'Sending…',
    checkEmailTitle: 'Check your inbox',
    checkEmailBody: (email) => `We sent a sign-in link to ${email}. Open it on this device to continue.`,
    useDifferentEmail: 'Use a different email',
    confirmEmailTitle: 'Confirm your email',
    confirmEmailBody: 'Please re-enter your email to finish signing in.',
    confirmBtn: 'Continue',
    nameTitle: 'What should Luma call you?',
    nameSubtitle: 'This is how we\'ll greet you.',
    namePlaceholder: 'Your name',
    continueBtn: 'Continue',
    notConfiguredTitle: 'Sign-in isn\'t set up yet',
    notConfiguredBody: 'This app needs Firebase Authentication configured (see .env.example) before anyone can sign in.',
    genericError: 'Something went wrong. Please try again.',
    verifyingLink: 'Signing you in…',
    agreeToTermsPrefix: 'By continuing, you agree to our',
    termsLink: 'Terms of Service',
    andWord: 'and',
    privacyLink: 'Privacy Policy',
  },
  ru: {
    title: 'Добро пожаловать в Luma',
    subtitle: 'Введите email — мы пришлём ссылку для входа, пароль не нужен.',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Отправить ссылку',
    sending: 'Отправляем…',
    checkEmailTitle: 'Проверьте почту',
    checkEmailBody: (email) => `Мы отправили ссылку для входа на ${email}. Откройте её на этом устройстве.`,
    useDifferentEmail: 'Использовать другой email',
    confirmEmailTitle: 'Подтвердите email',
    confirmEmailBody: 'Пожалуйста, введите email ещё раз, чтобы завершить вход.',
    confirmBtn: 'Продолжить',
    nameTitle: 'Как Люме вас называть?',
    nameSubtitle: 'Так мы будем к вам обращаться.',
    namePlaceholder: 'Ваше имя',
    continueBtn: 'Продолжить',
    notConfiguredTitle: 'Вход пока не настроен',
    notConfiguredBody: 'Для входа нужно настроить Firebase Authentication (см. .env.example).',
    genericError: 'Что-то пошло не так. Попробуйте ещё раз.',
    verifyingLink: 'Выполняется вход…',
    agreeToTermsPrefix: 'Продолжая, вы соглашаетесь с',
    termsLink: 'Условиями использования',
    andWord: 'и',
    privacyLink: 'Политикой конфиденциальности',
  },
  es: {
    title: 'Bienvenido a Luma',
    subtitle: 'Ingresa tu email y te enviaremos un enlace seguro para iniciar sesión, sin contraseña.',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Enviar enlace',
    sending: 'Enviando…',
    checkEmailTitle: 'Revisa tu correo',
    checkEmailBody: (email) => `Enviamos un enlace de acceso a ${email}. Ábrelo en este dispositivo.`,
    useDifferentEmail: 'Usar otro email',
    confirmEmailTitle: 'Confirma tu email',
    confirmEmailBody: 'Vuelve a ingresar tu email para completar el inicio de sesión.',
    confirmBtn: 'Continuar',
    nameTitle: '¿Cómo debería llamarte Luma?',
    nameSubtitle: 'Así te saludaremos.',
    namePlaceholder: 'Tu nombre',
    continueBtn: 'Continuar',
    notConfiguredTitle: 'El inicio de sesión aún no está configurado',
    notConfiguredBody: 'Esta app necesita Firebase Authentication configurado (ver .env.example).',
    genericError: 'Algo salió mal. Intenta de nuevo.',
    verifyingLink: 'Iniciando sesión…',
    agreeToTermsPrefix: 'Al continuar, aceptas nuestros',
    termsLink: 'Términos de servicio',
    andWord: 'y',
    privacyLink: 'Política de privacidad',
  },
  fr: {
    title: 'Bienvenue sur Luma',
    subtitle: 'Entrez votre email — nous vous enverrons un lien de connexion sécurisé, sans mot de passe.',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Envoyer le lien',
    sending: 'Envoi…',
    checkEmailTitle: 'Consultez votre boîte mail',
    checkEmailBody: (email) => `Un lien de connexion a été envoyé à ${email}. Ouvrez-le sur cet appareil.`,
    useDifferentEmail: 'Utiliser un autre email',
    confirmEmailTitle: 'Confirmez votre email',
    confirmEmailBody: 'Veuillez ressaisir votre email pour terminer la connexion.',
    confirmBtn: 'Continuer',
    nameTitle: 'Comment Luma doit-elle vous appeler ?',
    nameSubtitle: 'C\'est ainsi que nous vous saluerons.',
    namePlaceholder: 'Votre nom',
    continueBtn: 'Continuer',
    notConfiguredTitle: 'La connexion n\'est pas encore configurée',
    notConfiguredBody: 'Cette application nécessite Firebase Authentication (voir .env.example).',
    genericError: 'Une erreur est survenue. Réessayez.',
    verifyingLink: 'Connexion en cours…',
    agreeToTermsPrefix: 'En continuant, vous acceptez nos',
    termsLink: "Conditions d'utilisation",
    andWord: 'et notre',
    privacyLink: 'Politique de confidentialité',
  },
  it: {
    title: 'Benvenuto su Luma',
    subtitle: 'Inserisci la tua email — ti invieremo un link di accesso sicuro, senza password.',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Invia il link',
    sending: 'Invio…',
    checkEmailTitle: 'Controlla la posta',
    checkEmailBody: (email) => `Abbiamo inviato un link di accesso a ${email}. Aprilo su questo dispositivo.`,
    useDifferentEmail: 'Usa un\'altra email',
    confirmEmailTitle: 'Conferma la tua email',
    confirmEmailBody: 'Reinserisci la tua email per completare l\'accesso.',
    confirmBtn: 'Continua',
    nameTitle: 'Come deve chiamarti Luma?',
    nameSubtitle: 'È così che ti saluteremo.',
    namePlaceholder: 'Il tuo nome',
    continueBtn: 'Continua',
    notConfiguredTitle: 'L\'accesso non è ancora configurato',
    notConfiguredBody: 'Questa app richiede Firebase Authentication configurato (vedi .env.example).',
    genericError: 'Qualcosa è andato storto. Riprova.',
    verifyingLink: 'Accesso in corso…',
    agreeToTermsPrefix: 'Continuando, accetti i nostri',
    termsLink: 'Termini di servizio',
    andWord: "e l'",
    privacyLink: 'Informativa sulla privacy',
  },
  pt: {
    title: 'Bem-vindo ao Luma',
    subtitle: 'Digite seu email — enviaremos um link seguro de acesso, sem senha.',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Enviar link',
    sending: 'Enviando…',
    checkEmailTitle: 'Verifique seu email',
    checkEmailBody: (email) => `Enviamos um link de acesso para ${email}. Abra-o neste dispositivo.`,
    useDifferentEmail: 'Usar outro email',
    confirmEmailTitle: 'Confirme seu email',
    confirmEmailBody: 'Digite seu email novamente para concluir o acesso.',
    confirmBtn: 'Continuar',
    nameTitle: 'Como o Luma deve te chamar?',
    nameSubtitle: 'É assim que vamos te cumprimentar.',
    namePlaceholder: 'Seu nome',
    continueBtn: 'Continuar',
    notConfiguredTitle: 'O login ainda não foi configurado',
    notConfiguredBody: 'Este app precisa do Firebase Authentication configurado (veja .env.example).',
    genericError: 'Algo deu errado. Tente novamente.',
    verifyingLink: 'Entrando…',
    agreeToTermsPrefix: 'Ao continuar, você concorda com nossos',
    termsLink: 'Termos de Serviço',
    andWord: 'e',
    privacyLink: 'Política de Privacidade',
  },
  tr: {
    title: 'Luma\'ya hoş geldiniz',
    subtitle: 'E-postanızı girin — şifresiz, güvenli bir giriş bağlantısı gönderelim.',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Bağlantı gönder',
    sending: 'Gönderiliyor…',
    checkEmailTitle: 'Gelen kutunuzu kontrol edin',
    checkEmailBody: (email) => `${email} adresine bir giriş bağlantısı gönderdik. Bu cihazda açın.`,
    useDifferentEmail: 'Başka bir e-posta kullan',
    confirmEmailTitle: 'E-postanızı onaylayın',
    confirmEmailBody: 'Girişi tamamlamak için e-postanızı yeniden girin.',
    confirmBtn: 'Devam et',
    nameTitle: 'Luma size nasıl seslensin?',
    nameSubtitle: 'Sizi böyle karşılayacağız.',
    namePlaceholder: 'Adınız',
    continueBtn: 'Devam et',
    notConfiguredTitle: 'Giriş henüz yapılandırılmadı',
    notConfiguredBody: 'Bu uygulamanın Firebase Authentication yapılandırması gerekiyor (bkz. .env.example).',
    genericError: 'Bir şeyler ters gitti. Tekrar deneyin.',
    verifyingLink: 'Giriş yapılıyor…',
    agreeToTermsPrefix: 'Devam ederek',
    termsLink: "Hizmet Şartları'nı",
    andWord: 've',
    privacyLink: "Gizlilik Politikası'nı kabul etmiş olursunuz",
  },
  zh: {
    title: '欢迎使用 Luma',
    subtitle: '输入邮箱，我们会发送安全登录链接，无需密码。',
    emailPlaceholder: 'you@example.com',
    sendLink: '发送链接',
    sending: '发送中…',
    checkEmailTitle: '请查收邮件',
    checkEmailBody: (email) => `登录链接已发送至 ${email}。请在此设备上打开。`,
    useDifferentEmail: '使用其他邮箱',
    confirmEmailTitle: '确认邮箱',
    confirmEmailBody: '请重新输入邮箱以完成登录。',
    confirmBtn: '继续',
    nameTitle: 'Luma 应该怎么称呼您？',
    nameSubtitle: '我们会这样问候您。',
    namePlaceholder: '您的名字',
    continueBtn: '继续',
    notConfiguredTitle: '登录功能尚未配置',
    notConfiguredBody: '此应用需要先配置 Firebase Authentication（见 .env.example）。',
    genericError: '出了点问题，请重试。',
    verifyingLink: '正在登录…',
    agreeToTermsPrefix: '继续即表示您同意我们的',
    termsLink: '服务条款',
    andWord: '和',
    privacyLink: '隐私政策',
  },
  de: {
    title: 'Willkommen bei Luma',
    subtitle: 'Gib deine E-Mail ein — wir senden dir einen sicheren Anmeldelink, kein Passwort nötig.',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Link senden',
    sending: 'Wird gesendet…',
    checkEmailTitle: 'Prüfe dein Postfach',
    checkEmailBody: (email) => `Wir haben einen Anmeldelink an ${email} gesendet. Öffne ihn auf diesem Gerät.`,
    useDifferentEmail: 'Andere E-Mail verwenden',
    confirmEmailTitle: 'E-Mail bestätigen',
    confirmEmailBody: 'Bitte gib deine E-Mail erneut ein, um die Anmeldung abzuschließen.',
    confirmBtn: 'Weiter',
    nameTitle: 'Wie soll Luma dich nennen?',
    nameSubtitle: 'So werden wir dich begrüßen.',
    namePlaceholder: 'Dein Name',
    continueBtn: 'Weiter',
    notConfiguredTitle: 'Anmeldung ist noch nicht eingerichtet',
    notConfiguredBody: 'Diese App benötigt eine konfigurierte Firebase Authentication (siehe .env.example).',
    genericError: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',
    verifyingLink: 'Anmeldung läuft…',
    agreeToTermsPrefix: 'Mit der Fortsetzung stimmst du unseren',
    termsLink: 'Nutzungsbedingungen',
    andWord: 'und',
    privacyLink: 'unserer Datenschutzerklärung zu',
  },
};

type Step = 'email' | 'sent' | 'confirmEmail' | 'name';

export const LoginScreen: React.FC<LoginScreenProps> = ({ language }) => {
  const t = STRINGS[language] || STRINGS.en;
  const { user, isConfigured, sendLoginLink, isProcessingSignInLink, completeSignInWithLink, setDisplayName } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // On load, if the URL is a magic sign-in link, try to complete it right away.
  useEffect(() => {
    if (!isProcessingSignInLink) return;
    completeSignInWithLink().catch((e: any) => {
      if (e?.message === 'NEED_EMAIL') {
        setStep('confirmEmail');
      } else {
        setErrorMsg(t.genericError);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessingSignInLink]);

  // Once signed in, if there's no display name yet, ask for one.
  useEffect(() => {
    if (user && !user.displayName) {
      setStep('name');
    }
  }, [user]);

  if (!isConfigured) {
    return (
      <div className="min-h-screen h-[100dvh] bg-[#F7F4EE] text-[#2C2723] flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <LumaLotusIcon className="w-12 h-12 mx-auto text-[#B08D68] mb-7" />
          <h1 className="text-xl font-semibold">{t.notConfiguredTitle}</h1>
          <p className="text-sm text-[#6B6258] mt-2">{t.notConfiguredBody}</p>
        </div>
      </div>
    );
  }

  // A magic sign-in link is being verified in the background — show a quiet
  // loading state instead of the email form, so the person never sees "enter
  // your email" flash by while we're already signing them in.
  if (isProcessingSignInLink) {
    return (
      <div className="min-h-screen h-[100dvh] bg-[#F7F4EE] text-[#2C2723] flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <LumaLotusIcon className="w-12 h-12 mx-auto text-[#B08D68] mb-7 animate-pulse" />
          <p className="text-sm text-[#6B6258]">{t.verifyingLink}</p>
        </div>
      </div>
    );
  }

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setErrorMsg('');
    try {
      await sendLoginLink(email.trim());
      setStep('sent');
    } catch (err: any) {
      setErrorMsg(err?.message || t.genericError);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setErrorMsg('');
    try {
      await completeSignInWithLink(email.trim());
    } catch (err: any) {
      setErrorMsg(err?.message || t.genericError);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await setDisplayName(name.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen h-[100dvh] bg-[#F7F4EE] text-[#2C2723] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <LumaLotusIcon className="w-12 h-12 mx-auto text-[#B08D68] mb-7" />
          <div className="space-y-2">
            {step === 'email' && (
              <>
                <h1 className="text-2xl font-semibold">{t.title}</h1>
                <p className="text-sm text-[#6B6258]">{t.subtitle}</p>
              </>
            )}
            {step === 'sent' && (
              <>
                <h1 className="text-2xl font-semibold">{t.checkEmailTitle}</h1>
                <p className="text-sm text-[#6B6258]">{t.checkEmailBody(email)}</p>
              </>
            )}
            {step === 'confirmEmail' && (
              <>
                <h1 className="text-2xl font-semibold">{t.confirmEmailTitle}</h1>
                <p className="text-sm text-[#6B6258]">{t.confirmEmailBody}</p>
              </>
            )}
            {step === 'name' && (
              <>
                <h1 className="text-2xl font-semibold">{t.nameTitle}</h1>
                <p className="text-sm text-[#6B6258]">{t.nameSubtitle}</p>
              </>
            )}
          </div>
        </div>

        {step === 'email' && (
          <form onSubmit={handleSendLink} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-[#E5DFD4] bg-white focus:outline-none focus:ring-2 focus:ring-[#B08D68]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl bg-[#2C2723] text-white font-medium disabled:opacity-50"
            >
              {busy ? t.sending : t.sendLink}
            </button>
          </form>
        )}

        {step === 'email' && (
          <p className="text-[11px] text-[#B0A99C] text-center leading-relaxed px-2">
            {t.agreeToTermsPrefix}{' '}
            <a href="/legal/terms.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#6B6258]">
              {t.termsLink}
            </a>{' '}
            {t.andWord}{' '}
            <a href="/legal/privacy.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#6B6258]">
              {t.privacyLink}
            </a>
            .
          </p>
        )}

        {step === 'sent' && (
          <button
            onClick={() => { setStep('email'); setErrorMsg(''); }}
            className="w-full text-sm text-[#6B6258] underline"
          >
            {t.useDifferentEmail}
          </button>
        )}

        {step === 'confirmEmail' && (
          <form onSubmit={handleConfirmEmail} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-[#E5DFD4] bg-white focus:outline-none focus:ring-2 focus:ring-[#B08D68]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl bg-[#2C2723] text-white font-medium disabled:opacity-50"
            >
              {t.confirmBtn}
            </button>
          </form>
        )}

        {step === 'name' && (
          <form onSubmit={handleSaveName} className="space-y-3">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full px-4 py-3 rounded-xl border border-[#E5DFD4] bg-white focus:outline-none focus:ring-2 focus:ring-[#B08D68]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl bg-[#2C2723] text-white font-medium disabled:opacity-50"
            >
              {t.continueBtn}
            </button>
          </form>
        )}

        {errorMsg && <p className="text-sm text-red-600 text-center">{errorMsg}</p>}
      </div>
    </div>
  );
};
