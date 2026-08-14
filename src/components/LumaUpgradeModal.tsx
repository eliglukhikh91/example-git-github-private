import React from 'react';
import { createPortal } from 'react-dom';
import { LanguageCode } from '../data/translations';
import { MONTHLY_PRICE, ANNUAL_PRICE, ANNUAL_MONTHLY_EQUIVALENT } from '../data/pricing';
import { LumaCheckIcon, LumaLotusIcon } from './icons/LumaIcons';

interface UpgradeModalStrings {
  close: string;
  badge: string;
  unlimitedMoments: string;
  subTitle: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  perMonth: string;
  perYear: string;
  monthlyLabel: string;
  annualLabel: string;
  savePercent: string;
  trialBadge: string;
  upgradeBtn: string;
  footerDesc: string;
}

const LOCALIZED_UPGRADE_STRINGS: Record<LanguageCode, UpgradeModalStrings> = {
  en: {
    close: 'Close',
    badge: 'UPGRADE TO LUMA PRO',
    unlimitedMoments: 'Unlimited Moments',
    subTitle: 'Prepare for all your life chapters without boundaries. Simple, quiet, continuous support.',
    feature1Title: 'Unlimited Life Moments',
    feature1Desc: 'Track and organize journeys, family milestones, and personal events without a 3-moment cap.',
    feature2Title: 'Full access to Luma',
    feature2Desc: 'Receive smart recommendations, detailed travel preps, and tailored checklist support anytime.',
    feature3Title: 'Privacy-First Persistent Memory',
    feature3Desc: 'Luma securely remembers your preferences to coordinate smooth travel & prep details.',
    perMonth: 'month',
    perYear: 'year',
    monthlyLabel: 'Monthly',
    annualLabel: 'Annual',
    savePercent: 'Save 34%',
    trialBadge: '7 days free, then',
    upgradeBtn: 'Start free trial',
    footerDesc: '7-day free trial, then billed automatically. Cancel anytime inside your Profile with a single tap.'
  },
  ru: {
    close: 'Закрыть',
    badge: 'ОБНОВЛЕНИЕ ДО PRO',
    unlimitedMoments: 'Неограниченные события',
    subTitle: 'Luma Pro убирает любые ограничения, давая полную свободу подготовки к жизненным событиям.',
    feature1Title: 'Неограниченные жизненные события',
    feature1Desc: 'Планируйте любые поездки, медицинские визиты, карьеру и семейные дела без лимитов.',
    feature2Title: 'Полный доступ к ИИ-ассистенту Luma',
    feature2Desc: 'Глубокий анализ контекста, автоматическое добавление шагов и неограниченные обсуждения.',
    feature3Title: 'Конфиденциальность и память',
    feature3Desc: 'Безопасное хранение ваших предпочтений для долгосрочной персонализации.',
    perMonth: 'месяц',
    perYear: 'год',
    monthlyLabel: 'Ежемесячно',
    annualLabel: 'Ежегодно',
    savePercent: 'Скидка 34%',
    trialBadge: '7 дней бесплатно, затем',
    upgradeBtn: 'Начать бесплатный период',
    footerDesc: '7 дней бесплатно, затем автоматическое списание. Отмена в любое время в настройках профиля.'
  },
  es: {
    close: 'Cerrar',
    badge: 'MEJORAR A LUMA PRO',
    unlimitedMoments: 'Momentos Ilimitados',
    subTitle: 'Prepárate para todos los capítulos de tu vida sin límites. Soporte simple, silencioso y continuo.',
    feature1Title: 'Momentos de Vida Ilimitados',
    feature1Desc: 'Registra viajes, hitos familiares y eventos personales sin el límite de 3 momentos.',
    feature2Title: 'Acceso Total a Luma',
    feature2Desc: 'Recibe recomendaciones inteligentes, preparaciones de viaje detalladas y listas de verificación.',
    feature3Title: 'Memoria Persistente Privada',
    feature3Desc: 'Luma recuerda de forma segura tus preferencias para coordinar detalles de viajes y preparación.',
    perMonth: 'mes',
    perYear: 'año',
    monthlyLabel: 'Mensual',
    annualLabel: 'Anual',
    savePercent: 'Ahorra 34%',
    trialBadge: '7 días gratis, luego',
    upgradeBtn: 'Iniciar prueba gratis',
    footerDesc: '7 días de prueba gratis, luego se cobra automáticamente. Cancela cuando quieras en tu Perfil.'
  },
  fr: {
    close: 'Fermer',
    badge: 'PASSER À LUMA PRO',
    unlimitedMoments: 'Moments Illimités',
    subTitle: 'Préparez tous les chapitres de votre vie sans limites. Un soutien simple, calme et continu.',
    feature1Title: 'Moments de Vie Illimités',
    feature1Desc: 'Suivez vos voyages, événements familiaux et personnels sans limite de 3 moments.',
    feature2Title: 'Accès Complet à Luma',
    feature2Desc: 'Bénéficiez de recommandations intelligentes, de préparatifs de voyage détaillés et d\'aide personnalisée.',
    feature3Title: 'Mémoire Persistante Sécurisée',
    feature3Desc: 'Luma mémorise vos préférences de voyage pour organiser au mieux chaque détail.',
    perMonth: 'mois',
    perYear: 'an',
    monthlyLabel: 'Mensuel',
    annualLabel: 'Annuel',
    savePercent: 'Économisez 34%',
    trialBadge: '7 jours gratuits, puis',
    upgradeBtn: 'Commencer l\'essai gratuit',
    footerDesc: '7 jours d\'essai gratuit, puis facturation automatique. Annulez à tout moment dans votre Profil.'
  },
  it: {
    close: 'Chiudi',
    badge: 'PASSA A LUMA PRO',
    unlimitedMoments: 'Momenti Illimitati',
    subTitle: 'Preparati a tutti i capitoli della tua vita senza limiti. Supporto semplice, silenzioso e continuo.',
    feature1Title: 'Momenti della Vita Illimitati',
    feature1Desc: 'Monitora viaggi, tappe familiari ed eventi personali senza il limite di 3 momenti.',
    feature2Title: 'Accesso Completo a Luma',
    feature2Desc: 'Ricevi consigli intelligenti, preparazioni di viaggio dettagliate e checklist su misura.',
    feature3Title: 'Memoria Persistente Protetta',
    feature3Desc: 'Luma ricorda in modo sicuro le tue preferenze per coordinare i minimi dettagli di viaggio.',
    perMonth: 'mese',
    perYear: 'anno',
    monthlyLabel: 'Mensile',
    annualLabel: 'Annuale',
    savePercent: 'Risparmia il 34%',
    trialBadge: '7 giorni gratis, poi',
    upgradeBtn: 'Inizia la prova gratuita',
    footerDesc: '7 giorni di prova gratuita, poi addebito automatico. Disdici quando vuoi nel tuo Profilo.'
  },
  pt: {
    close: 'Fechar',
    badge: 'ATUALIZAR PARA LUMA PRO',
    unlimitedMoments: 'Momentos Ilimitados',
    subTitle: 'Prepare-se para todos os capítulos de sua vida sem limites. Suporte simples, silencioso e contínuo.',
    feature1Title: 'Momentos de Vida Ilimitados',
    feature1Desc: 'Acompanhe viagens, marcos familiares e eventos pessoais sem o limite de 3 momentos.',
    feature2Title: 'Acesso Total ao Luma',
    feature2Desc: 'Receba recomendações inteligentes, preparativos detalhados de viagem e listas de verificação.',
    feature3Title: 'Memória Persistente Privada',
    feature3Desc: 'O Luma lembra com segurança as suas preferências para coordenar todos os detalhes.',
    perMonth: 'mês',
    perYear: 'ano',
    monthlyLabel: 'Mensal',
    annualLabel: 'Anual',
    savePercent: 'Economize 34%',
    trialBadge: '7 dias grátis, depois',
    upgradeBtn: 'Iniciar teste grátis',
    footerDesc: '7 dias de teste grátis, depois cobrança automática. Cancele quando quiser no seu Perfil.'
  },
  tr: {
    close: 'Kapat',
    badge: 'LUMA PRO\'YA YÜKSELT',
    unlimitedMoments: 'Sınırsız Anlar',
    subTitle: 'Hayatınızın tüm bölümlerine sınırsız hazırlanın. Basit, sessiz ve kesintisiz asistan desteği.',
    feature1Title: 'Sınırsız Hayat Anı',
    feature1Desc: 'Seyahatleri, aile dönüm noktalarını ve kişisel etkinlikleri 3 an sınırı olmadan takip edin.',
    feature2Title: 'Luma\'ya Tam Erişim',
    feature2Desc: 'İstediğiniz zaman akıllı öneriler, ayrıntılı seyahat hazırlıkları ve özel kontrol listeleri alın.',
    feature3Title: 'Öncelikli Güvenli Hafıza',
    feature3Desc: 'Luma, seyahat ve hazırlık detaylarını koordine etmek için tercihlerinizi güvenle hatırlar.',
    perMonth: 'ay',
    perYear: 'yıl',
    monthlyLabel: 'Aylık',
    annualLabel: 'Yıllık',
    savePercent: '%34 tasarruf',
    trialBadge: '7 gün ücretsiz, ardından',
    upgradeBtn: 'Ücretsiz denemeyi başlat',
    footerDesc: '7 gün ücretsiz deneme, ardından otomatik ödeme alınır. Profil ayarlarından dilediğiniz an iptal edin.'
  },
  zh: {
    close: '关闭',
    badge: '升级到 LUMA PRO',
    unlimitedMoments: '无限事件',
    subTitle: '无界筹备人生中每个精彩章节。简单、宁静、时刻守护。',
    feature1Title: '无限记录生活点滴',
    feature1Desc: '追踪和整理旅行、家庭里程碑和个人活动，不再受 3 个事件的额度限制。',
    feature2Title: '完整访问 Luma 助手',
    feature2Desc: '随时获得智能推荐、详尽的行前准备方案以及定制化的清单支持。',
    feature3Title: '隐私安全持久记忆',
    feature3Desc: 'Luma 安全地记住您的出行与日常偏好，极力协助协调各项行前准备细节。',
    perMonth: '月',
    perYear: '年',
    monthlyLabel: '按月',
    annualLabel: '按年',
    savePercent: '省 34%',
    trialBadge: '7 天免费试用，随后',
    upgradeBtn: '开始免费试用',
    footerDesc: '7 天免费试用，之后自动扣费。可随时在“个人资料”中一键取消。'
  },
  de: {
    close: 'Schließen',
    badge: 'UPGRADE AUF LUMA PRO',
    unlimitedMoments: 'Unbegrenzte Momente',
    subTitle: 'Bereiten Sie sich grenzenlos auf alle Abschnitte Ihres Lebens vor. Einfache, ruhige, ständige Begleitung.',
    feature1Title: 'Unbegrenzte Lebensmomente',
    feature1Desc: 'Verfolgen und organisieren Sie Reisen, familiäre Meilensteine und Ereignisse ohne Limit.',
    feature2Title: 'Voller Zugriff auf Luma',
    feature2Desc: 'Erhalten Sie jederzeit intelligente Empfehlungen, detaillierte Reisepläne und Checklisten.',
    feature3Title: 'Sicheres, dauerhaftes Gedächtnis',
    feature3Desc: 'Luma merkt sich Ihre Vorlieben, um Reisedetails und Vorbereitungen reibungslos zu koordinieren.',
    perMonth: 'Monat',
    perYear: 'Jahr',
    monthlyLabel: 'Monatlich',
    annualLabel: 'Jährlich',
    savePercent: '34% sparen',
    trialBadge: '7 Tage kostenlos, danach',
    upgradeBtn: 'Kostenlose Testphase starten',
    footerDesc: '7 Tage kostenlos testen, danach automatische Abrechnung. Jederzeit in den Profileinstellungen kündbar.'
  }
};

interface LumaUpgradeModalProps {
  language: LanguageCode;
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (billingCycle: 'monthly' | 'annual') => void;
}

export const LumaUpgradeModal: React.FC<LumaUpgradeModalProps> = ({
  language,
  isOpen,
  onClose,
  onUpgrade,
}) => {
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annual'>('annual');

  if (!isOpen) return null;

  const p = LOCALIZED_UPGRADE_STRINGS[language] || LOCALIZED_UPGRADE_STRINGS.en;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E3832]/30 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF8F5] border border-[#E6DFD5] rounded-[36px] w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 text-[#2C2723] animate-scale-up relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full border border-[#E6DFD5] hover:bg-[#FAF7F2] text-[#6B6258] hover:text-[#2C2723] transition cursor-pointer"
          title={p.close}
        >
          ✕
        </button>

        {/* Top Icon / Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="w-12 h-12 rounded-full bg-[#5C6B52]/10 text-[#5C6B52] flex items-center justify-center mx-auto mb-1">
            <LumaLotusIcon className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase font-semibold tracking-widest text-[#5C6B52] px-2.5 py-0.5 rounded-full bg-[#5C6B52]/10 inline-block">
            {p.badge}
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#2C2723] leading-tight pt-1">
            {p.unlimitedMoments}
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6258] max-w-xs mx-auto leading-relaxed">
            {p.subTitle}
          </p>
        </div>

        {/* Feature List */}
        <div className="bg-white border border-[#E6DFD5] rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-start gap-3 text-xs">
            <div className="p-1 rounded-full bg-[#5C6B52]/10 text-[#5C6B52] shrink-0 mt-0.5">
              <LumaCheckIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-[#2C2723]">
                {p.feature1Title}
              </p>
              <p className="text-[11px] text-[#6B6258] mt-0.5">
                {p.feature1Desc}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs">
            <div className="p-1 rounded-full bg-[#5C6B52]/10 text-[#5C6B52] shrink-0 mt-0.5">
              <LumaCheckIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-[#2C2723]">
                {p.feature2Title}
              </p>
              <p className="text-[11px] text-[#6B6258] mt-0.5">
                {p.feature2Desc}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs">
            <div className="p-1 rounded-full bg-[#5C6B52]/10 text-[#5C6B52] shrink-0 mt-0.5">
              <LumaCheckIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-[#2C2723]">
                {p.feature3Title}
              </p>
              <p className="text-[11px] text-[#6B6258] mt-0.5">
                {p.feature3Desc}
              </p>
            </div>
          </div>
        </div>

        {/* Billing cycle toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F0ECE3] rounded-xl border border-[#E6DFD5]">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`py-2.5 text-xs font-medium rounded-lg transition cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-white text-[#2C2723] shadow-2xs font-semibold'
                : 'text-[#6B6258] hover:text-[#2C2723]'
            }`}
          >
            {p.monthlyLabel}
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`py-2.5 text-xs font-medium rounded-lg transition cursor-pointer relative ${
              billingCycle === 'annual'
                ? 'bg-white text-[#2C2723] shadow-2xs font-semibold'
                : 'text-[#6B6258] hover:text-[#2C2723]'
            }`}
          >
            {p.annualLabel}
            <span className="ml-1.5 text-[9px] font-semibold text-[#5C6B52] bg-[#5C6B52]/10 px-1.5 py-0.5 rounded-full">
              {p.savePercent}
            </span>
          </button>
        </div>

        {/* Pricing & Upgrade Button */}
        <div className="space-y-3 pt-1 text-center">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#5C6B52]">
              {p.trialBadge}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            {billingCycle === 'monthly' ? (
              <>
                <span className="font-serif text-3xl font-medium text-[#2C2723]">${MONTHLY_PRICE}</span>
                <span className="text-[#6B6258] text-xs font-medium">/ {p.perMonth}</span>
              </>
            ) : (
              <>
                <span className="font-serif text-3xl font-medium text-[#2C2723]">${ANNUAL_PRICE}</span>
                <span className="text-[#6B6258] text-xs font-medium">/ {p.perYear}</span>
                <span className="text-[10px] text-[#6B6258]">(${ANNUAL_MONTHLY_EQUIVALENT}/{p.perMonth})</span>
              </>
            )}
          </div>
          
          <button
            onClick={() => onUpgrade(billingCycle)}
            className="w-full py-4 rounded-2xl bg-[#5C6B52] hover:bg-[#4D5A44] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold transition cursor-pointer shadow-md"
          >
            {p.upgradeBtn}
          </button>

          <p className="text-[10px] text-[#6B6258] max-w-xs mx-auto leading-normal">
            {p.footerDesc}
          </p>
        </div>

      </div>
    </div>,
    document.body
  );
};
