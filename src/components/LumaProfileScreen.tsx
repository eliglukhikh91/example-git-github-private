import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { UserProfileData, LifeMoment } from '../types';
import { formatPrice, priceForCycle } from '../data/pricing';
import { getCalculatedDaysLeft } from '../utils/momentUtils';

const LOCALIZED_PROFILE_STRINGS: Record<LanguageCode, {
  profileScreenTitle: string;
  profileScreenSub: string;
  proStatusActive: string;
  freeStatusActive: string;
  mindfulSpaceTitle: string;
  mindfulSpaceDesc: string;
  aboutYouSub: string;
  mindfulSpaceHolding: (title: string, days: number) => string;
  mindfulSpaceGeneric: (count: number) => string;
  subscriptionTitle: string;
  proDetails: string;
  freeDetails: string;
  unlimitedCount: string;
  ofUsed: (count: number) => string;
  upgradeBtn: string;
  manageBtn: string;
  nextBilling: string;
  trialEndsLabel: (date: string) => string;
  renewsLabel: (date: string) => string;
  quietHoursLabel: string;
  quietHoursSub: string;
  prepRemindersSub: string;
  importantRemindersSub: string;
  factsBadge: string;
  toastSaved: string;
  toastHistoryCleared: string;
  clearConfirmTitle: string;
  clearConfirmText: string;
  clearConfirmBtn: string;
  deleteAccountBtn: string;
  deleteAccountConfirmTitle: string;
  deleteAccountConfirmText: string;
  deleteAccountConfirmBtn: string;
  deleteAccountNeedsRecentLogin: string;
  deleteAccountGenericError: string;
  deletingLabel: string;
  privacyPolicyLabel: string;
  termsOfServiceLabel: string;
  toastSignedOut: string;
  toastLangChanged: (name: string) => string;
  toastFreeDowngrade: string;
  editFormTitle: string;
  cancelBtn: string;
  saveChangesBtn: string;
  remembersModalTitle: string;
  remembersModalDesc: string;
  fact1: string;
  fact2: string;
  fact3: string;
  gotItBtn: string;
  manageModalTitle: string;
  manageModalDesc: (planLabel: string) => string;
  perMonth: string;
  perYear: string;
  nextPaymentLabel: string;
  nextPaymentValue: (amount: string, date: string) => string;
  downgradeBtn: string;
}> = {
  en: {
    profileScreenTitle: 'Profile',
    profileScreenSub: 'Personal companion workspace & preferences',
    proStatusActive: 'Luma Pro active',
    freeStatusActive: 'Luma Free active',
    mindfulSpaceTitle: 'Mindful space',
    mindfulSpaceDesc: 'No task anxiety. No spam. Luma keeps track of life moments quietly until you need guidance.',
    mindfulSpaceHolding: (title, days) => `Quietly holding your prep for “${title}” — ${days <= 0 ? 'today' : days === 1 ? '1 day away' : `${days} days away`}.`,
    mindfulSpaceGeneric: (count) => `${count} moment${count === 1 ? '' : 's'} held quietly, at your own pace.`,
    aboutYouSub: 'Luma uses this to tailor how it prepares you — never shared.',
    subscriptionTitle: 'YOUR LUMA PLAN',
    proDetails: 'Unlimited Moments · Full access to Luma',
    freeDetails: 'Up to 3 Moments per month',
    unlimitedCount: 'Unlimited',
    ofUsed: (count) => `${count} of 3 Moments used`,
    upgradeBtn: 'Upgrade to Luma Pro →',
    manageBtn: 'Manage subscription →',
    nextBilling: 'Next billing on Sep 11, 2026',
    trialEndsLabel: (date) => `Free trial ends ${date}`,
    renewsLabel: (date) => `Renews ${date}`,
    quietHoursLabel: 'Quiet hours',
    quietHoursSub: 'No notifications between 10 PM and 8 AM',
    prepRemindersSub: 'Only 1 soft note per focus moment',
    importantRemindersSub: 'Timely notifications on the day of your event',
    factsBadge: '3 facts',
    toastSaved: 'Changes saved',
    toastHistoryCleared: 'All moments cleared',
    clearConfirmTitle: 'Clear all moments?',
    clearConfirmText: "This deletes every moment and its prep steps. This can't be undone.",
    clearConfirmBtn: 'Yes, clear everything',
    deleteAccountBtn: 'Delete account',
    deleteAccountConfirmTitle: 'Delete your account?',
    deleteAccountConfirmText: "This permanently deletes your Luma account and everything stored in it. This can't be undone.",
    deleteAccountConfirmBtn: 'Yes, delete my account',
    deleteAccountNeedsRecentLogin: "For your security, please sign out and sign back in, then try deleting your account again.",
    deleteAccountGenericError: 'Something went wrong. Please try again.',
    deletingLabel: 'Deleting…',
    privacyPolicyLabel: 'Privacy Policy',
    termsOfServiceLabel: 'Terms of Service',
    toastSignedOut: 'Signed out quietly',
    toastLangChanged: (name) => `Language changed to ${name}`,
    toastFreeDowngrade: 'Downgraded to Luma Free',
    editFormTitle: 'Edit profile',
    cancelBtn: 'Cancel',
    saveChangesBtn: 'Save changes',
    remembersModalTitle: 'What Luma Remembers',
    remembersModalDesc: 'Luma uses this personal context to provide gentle, relevant guidance without asking repetitive questions.',
    fact1: '1. Travel preference',
    fact2: '2. Base location',
    fact3: '3. Daily rhythm',
    gotItBtn: 'Got it',
    manageModalTitle: 'Manage Subscription',
    manageModalDesc: (planLabel: string) => `You are currently subscribed to Luma Pro (${planLabel}).`,
    perMonth: 'month',
    perYear: 'year',
    nextPaymentLabel: 'YOUR NEXT PAYMENT',
    nextPaymentValue: (amount: string, date: string) => `${amount} on ${date}`,
    downgradeBtn: 'Switch to Free plan',
  },
  ru: {
    profileScreenTitle: 'Профиль',
    profileScreenSub: 'Личное пространство и настройки ассистента',
    proStatusActive: 'Подписка Luma Pro активна',
    freeStatusActive: 'Тариф Luma Free активен',
    mindfulSpaceTitle: 'Осознанное пространство',
    mindfulSpaceDesc: 'Никакой тревожности. Без спама. Luma бережно хранит ваши события до тех пор, пока не потребуется подготовка.',
    mindfulSpaceHolding: (title, days) => {
      const when = days <= 0 ? 'сегодня' : days === 1 ? 'через 1 день' : `через ${days} дн.`;
      return `Люма бережно готовит «${title}» — ${when}.`;
    },
    mindfulSpaceGeneric: (count) => {
      const word = count === 1 ? 'событие' : (count >= 2 && count <= 4) ? 'события' : 'событий';
      return `${count} ${word} бережно хранится, без спешки.`;
    },
    aboutYouSub: 'Люма использует это, чтобы точнее готовить вас к событиям — никому не передаётся.',
    subscriptionTitle: 'ВАШ ТАРИФ LUMA',
    proDetails: 'Безлимитные события · Полный доступ к Luma',
    freeDetails: 'До 3 активных событий в месяц',
    unlimitedCount: 'Безлимитно',
    ofUsed: (count) => `${count} из 3 использовано`,
    upgradeBtn: 'Перейти на Luma Pro →',
    manageBtn: 'Управление подпиской →',
    nextBilling: 'Следующее списание 11 сентября 2026',
    trialEndsLabel: (date) => `Бесплатный период до ${date}`,
    renewsLabel: (date) => `Продление ${date}`,
    quietHoursLabel: 'Тихие часы',
    quietHoursSub: 'Без уведомлений с 22:00 до 08:00',
    prepRemindersSub: 'Только 1 мягкое напоминание на событие',
    importantRemindersSub: 'Своевременные уведомления в день события',
    factsBadge: '3 факта',
    toastSaved: 'Изменения сохранены',
    toastHistoryCleared: 'Все события очищены',
    clearConfirmTitle: 'Очистить все события?',
    clearConfirmText: "Будут удалены все события и шаги подготовки к ним. Это необратимо.",
    clearConfirmBtn: 'Да, очистить всё',
    deleteAccountBtn: 'Удалить аккаунт',
    deleteAccountConfirmTitle: 'Удалить аккаунт?',
    deleteAccountConfirmText: "Это навсегда удалит ваш аккаунт Luma и всё, что в нём хранится. Это необратимо.",
    deleteAccountConfirmBtn: 'Да, удалить аккаунт',
    deleteAccountNeedsRecentLogin: "В целях безопасности выйдите и войдите снова, затем повторите удаление аккаунта.",
    deleteAccountGenericError: 'Что-то пошло не так. Попробуйте ещё раз.',
    deletingLabel: 'Удаление…',
    privacyPolicyLabel: 'Политика конфиденциальности',
    termsOfServiceLabel: 'Условия использования',
    toastSignedOut: 'Вы вышли из аккаунта',
    toastLangChanged: (name) => `Язык изменен на ${name}`,
    toastFreeDowngrade: 'Переключено на бесплатный тариф',
    editFormTitle: 'Редактировать профиль',
    cancelBtn: 'Отмена',
    saveChangesBtn: 'Сохранить изменения',
    remembersModalTitle: 'Что помнит Luma',
    remembersModalDesc: 'Luma учитывает этот контекст, чтобы давать точные рекомендации без лишних вопросов.',
    fact1: '1. Предпочтения в поездках',
    fact2: '2. Город проживания',
    fact3: '3. Ежедневный ритм',
    gotItBtn: 'Понятно',
    manageModalTitle: 'Управление подпиской',
    manageModalDesc: (planLabel: string) => `Вы подписаны на тариф Luma Pro (${planLabel}).`,
    perMonth: 'месяц',
    perYear: 'год',
    nextPaymentLabel: 'СЛЕДУЮЩИЙ ПЛАТЕЖ',
    nextPaymentValue: (amount: string, date: string) => `${amount}, ${date}`,
    downgradeBtn: 'Перейти на тариф Free',
  },
  es: {
    profileScreenTitle: 'Perfil',
    profileScreenSub: 'Espacio de acompañamiento personal y preferencias',
    proStatusActive: 'Suscripción Luma Pro activa',
    freeStatusActive: 'Plan Luma Free activo',
    mindfulSpaceTitle: 'Espacio consciente',
    mindfulSpaceDesc: 'Sin ansiedad de tareas. Sin spam. Luma hace un seguimiento de los momentos de la vida en silencio hasta que necesitas orientación.',
    mindfulSpaceHolding: (title, days) => `Luma sostiene con calma tu preparación para “${title}” — ${days <= 0 ? 'hoy' : days === 1 ? 'en 1 día' : `en ${days} días`}.`,
    mindfulSpaceGeneric: (count) => `${count} momento${count === 1 ? '' : 's'} guardados con calma, a tu ritmo.`,
    aboutYouSub: 'Luma usa esto para adaptar cómo te prepara — nunca se comparte.',
    subscriptionTitle: 'TU PLAN LUMA',
    proDetails: 'Momentos ilimitados · Acceso total a Luma',
    freeDetails: 'Hasta 3 momentos al mes',
    unlimitedCount: 'Ilimitado',
    ofUsed: (count) => `${count} de 3 momentos usados`,
    upgradeBtn: 'Mejorar a Luma Pro →',
    manageBtn: 'Gestionar suscripción →',
    nextBilling: 'Próxima facturación el 11 de sep de 2026',
    trialEndsLabel: (date) => `Prueba gratis hasta ${date}`,
    renewsLabel: (date) => `Se renueva ${date}`,
    quietHoursLabel: 'Horas de silencio',
    quietHoursSub: 'Sin notificaciones entre las 10 PM y las 8 AM',
    prepRemindersSub: 'Solo 1 nota suave por momento de enfoque',
    importantRemindersSub: 'Notificaciones oportunas el día de tu evento',
    factsBadge: '3 datos',
    toastSaved: 'Cambios guardados',
    toastHistoryCleared: 'Todos los momentos borrados',
    clearConfirmTitle: '¿Borrar todos los momentos?',
    clearConfirmText: "Esto elimina cada momento y sus pasos de preparación. No se puede deshacer.",
    clearConfirmBtn: 'Sí, borrar todo',
    deleteAccountBtn: 'Eliminar cuenta',
    deleteAccountConfirmTitle: '¿Eliminar tu cuenta?',
    deleteAccountConfirmText: "Esto elimina permanentemente tu cuenta de Luma y todo lo que contiene. No se puede deshacer.",
    deleteAccountConfirmBtn: 'Sí, eliminar mi cuenta',
    deleteAccountNeedsRecentLogin: "Por seguridad, cierra sesión y vuelve a iniciarla, luego intenta eliminar tu cuenta de nuevo.",
    deleteAccountGenericError: 'Algo salió mal. Intenta de nuevo.',
    deletingLabel: 'Eliminando…',
    privacyPolicyLabel: 'Política de privacidad',
    termsOfServiceLabel: 'Términos de servicio',
    toastSignedOut: 'Cierre de sesión silencioso',
    toastLangChanged: (name) => `Idioma cambiado a ${name}`,
    toastFreeDowngrade: 'Reducido al plan Luma Free',
    editFormTitle: 'Editar perfil',
    cancelBtn: 'Cancelar',
    saveChangesBtn: 'Guardar cambios',
    remembersModalTitle: 'Lo que Luma recuerda',
    remembersModalDesc: 'Luma utiliza este contexto personal para ofrecer una guía suave y relevante sin hacer preguntas repetitivas.',
    fact1: '1. Preferencia de viaje',
    fact2: '2. Ubicación base',
    fact3: '3. Ritmo diario',
    gotItBtn: 'Entendido',
    manageModalTitle: 'Gestionar suscripción',
    manageModalDesc: (planLabel: string) => `Actualmente estás suscrito a Luma Pro (${planLabel}).`,
    perMonth: 'mes',
    perYear: 'año',
    nextPaymentLabel: 'TU PRÓXIMO PAGO',
    nextPaymentValue: (amount: string, date: string) => `${amount} el ${date}`,
    downgradeBtn: 'Cambiar al plan Free',
  },
  fr: {
    profileScreenTitle: 'Profil',
    profileScreenSub: 'Espace d\'accompagnement personnel & préférences',
    proStatusActive: 'Abonnement Luma Pro actif',
    freeStatusActive: 'Forfait Luma Free actif',
    mindfulSpaceTitle: 'Espace serein',
    mindfulSpaceDesc: 'Pas d\'anxiété de tâches. Pas de spam. Luma suit les moments de votre vie sereinement jusqu\'à ce que vous ayez besoin d\'aide.',
    mindfulSpaceHolding: (title, days) => `Luma prépare doucement « ${title} » — ${days <= 0 ? "aujourd'hui" : days === 1 ? 'dans 1 jour' : `dans ${days} jours`}.`,
    mindfulSpaceGeneric: (count) => `${count} moment${count === 1 ? '' : 's'} gardé${count === 1 ? '' : 's'} en silence, à votre rythme.`,
    aboutYouSub: 'Luma utilise ces informations pour mieux vous préparer — jamais partagées.',
    subscriptionTitle: 'VOTRE FORFAIT LUMA',
    proDetails: 'Moments illimités · Accès complet à Luma',
    freeDetails: 'Jusqu\'à 3 moments par mois',
    unlimitedCount: 'Illimité',
    ofUsed: (count) => `${count} sur 3 moments utilisés`,
    upgradeBtn: 'Passer à Luma Pro →',
    manageBtn: 'Gérer l\'abonnement →',
    nextBilling: 'Prochain prélèvement le 11 sep 2026',
    trialEndsLabel: (date) => `Essai gratuit jusqu'au ${date}`,
    renewsLabel: (date) => `Renouvellement le ${date}`,
    quietHoursLabel: 'Heures calmes',
    quietHoursSub: 'Pas de notifications entre 22h et 8h',
    prepRemindersSub: 'Seulement 1 rappel doux par événement clé',
    importantRemindersSub: 'Notifications en temps utile le jour de votre événement',
    factsBadge: '3 faits',
    toastSaved: 'Modifications enregistrées',
    toastHistoryCleared: 'Tous les moments effacés',
    clearConfirmTitle: 'Effacer tous les moments ?',
    clearConfirmText: "Cela supprime chaque moment et ses étapes de préparation. Action irréversible.",
    clearConfirmBtn: 'Oui, tout effacer',
    deleteAccountBtn: 'Supprimer le compte',
    deleteAccountConfirmTitle: 'Supprimer votre compte ?',
    deleteAccountConfirmText: "Cela supprime définitivement votre compte Luma et tout ce qu'il contient. Action irréversible.",
    deleteAccountConfirmBtn: 'Oui, supprimer mon compte',
    deleteAccountNeedsRecentLogin: "Par sécurité, déconnectez-vous puis reconnectez-vous, et réessayez de supprimer votre compte.",
    deleteAccountGenericError: 'Une erreur est survenue. Réessayez.',
    deletingLabel: 'Suppression…',
    privacyPolicyLabel: 'Politique de confidentialité',
    termsOfServiceLabel: "Conditions d'utilisation",
    toastSignedOut: 'Déconnexion effectuée sereinement',
    toastLangChanged: (name) => `Langue changée en ${name}`,
    toastFreeDowngrade: 'Passé au forfait gratuit Luma Free',
    editFormTitle: 'Modifier le profil',
    cancelBtn: 'Annuler',
    saveChangesBtn: 'Enregistrer les modifications',
    remembersModalTitle: 'Ce que Luma retient',
    remembersModalDesc: 'Luma utilise ce contexte personnel pour fournir des conseils doux et pertinents sans poser de questions répétitives.',
    fact1: '1. Préférence de voyage',
    fact2: '2. Lieu de résidence',
    fact3: '3. Rythme quotidien',
    gotItBtn: 'Compris',
    manageModalTitle: 'Gérer l\'abonnement',
    manageModalDesc: (planLabel: string) => `Vous êtes actuellement abonné à Luma Pro (${planLabel}).`,
    perMonth: 'mois',
    perYear: 'an',
    nextPaymentLabel: 'VOTRE PROCHAIN PAIEMENT',
    nextPaymentValue: (amount: string, date: string) => `${amount} le ${date}`,
    downgradeBtn: 'Passer au forfait Free',
  },
  it: {
    profileScreenTitle: 'Profilo',
    profileScreenSub: 'Spazio di accompagnamento personale e preferenze',
    proStatusActive: 'Abbonamento Luma Pro attivo',
    freeStatusActive: 'Piano Luma Free attivo',
    mindfulSpaceTitle: 'Spazio consapevole',
    mindfulSpaceDesc: 'Senza ansia da compiti. Senza spam. Luma tiene traccia dei momenti della vita in silenzio finché non desideri una guida.',
    mindfulSpaceHolding: (title, days) => `Luma custodisce con calma "${title}" — ${days <= 0 ? 'oggi' : days === 1 ? 'tra 1 giorno' : `tra ${days} giorni`}.`,
    mindfulSpaceGeneric: (count) => `${count} momento${count === 1 ? '' : 'i'} custoditi con calma, al tuo ritmo.`,
    aboutYouSub: 'Luma usa queste informazioni per prepararti meglio — mai condivise.',
    subscriptionTitle: 'IL TUO PIANO LUMA',
    proDetails: 'Momenti illimitati · Accesso completo a Luma',
    freeDetails: 'Fino a 3 momenti al mese',
    unlimitedCount: 'Illimitato',
    ofUsed: (count) => `${count} di 3 momenti utilizzati`,
    upgradeBtn: 'Passa a Luma Pro →',
    manageBtn: 'Gestisci abbonamento →',
    nextBilling: 'Prossimo rinnovo il 11 set 2026',
    trialEndsLabel: (date) => `Prova gratuita fino al ${date}`,
    renewsLabel: (date) => `Rinnovo il ${date}`,
    quietHoursLabel: 'Ore di silenzio',
    quietHoursSub: 'Nessuna notifica tra le 22:00 e le 08:00',
    prepRemindersSub: 'Solo 1 nota gentile per momento chiave',
    importantRemindersSub: 'Notifiche tempestive il giorno dell\'evento',
    factsBadge: '3 fatti',
    toastSaved: 'Modifiche salvate',
    toastHistoryCleared: 'Tutti i momenti cancellati',
    clearConfirmTitle: 'Cancellare tutti i momenti?',
    clearConfirmText: "Questo elimina ogni momento e i relativi passaggi di preparazione. Azione irreversibile.",
    clearConfirmBtn: 'Sì, cancella tutto',
    deleteAccountBtn: 'Elimina account',
    deleteAccountConfirmTitle: 'Eliminare il tuo account?',
    deleteAccountConfirmText: "Questo elimina definitivamente il tuo account Luma e tutto ciò che contiene. Azione irreversibile.",
    deleteAccountConfirmBtn: 'Sì, elimina il mio account',
    deleteAccountNeedsRecentLogin: "Per sicurezza, esci e accedi di nuovo, poi riprova a eliminare l'account.",
    deleteAccountGenericError: 'Qualcosa è andato storto. Riprova.',
    deletingLabel: 'Eliminazione…',
    privacyPolicyLabel: 'Informativa sulla privacy',
    termsOfServiceLabel: 'Termini di servizio',
    toastSignedOut: 'Disconnessione silenziosa',
    toastLangChanged: (name) => `Lingua cambiata in ${name}`,
    toastFreeDowngrade: 'Passato al piano Luma Free',
    editFormTitle: 'Modifica profilo',
    cancelBtn: 'Annulla',
    saveChangesBtn: 'Salva modifiche',
    remembersModalTitle: 'Cosa ricorda Luma',
    remembersModalDesc: 'Luma usa questo contesto personale per fornire una guida dolce e pertinente senza fare domande ripetitive.',
    fact1: '1. Preferenze di viaggio',
    fact2: '2. Luogo di residenza',
    fact3: '3. Ritmo quotidiano',
    gotItBtn: 'Capito',
    manageModalTitle: 'Gestisci abbonamento',
    manageModalDesc: (planLabel: string) => `Sei attualmente abbonato a Luma Pro (${planLabel}).`,
    perMonth: 'mese',
    perYear: 'anno',
    nextPaymentLabel: 'IL TUO PROSSIMO PAGAMENTO',
    nextPaymentValue: (amount: string, date: string) => `${amount} il ${date}`,
    downgradeBtn: 'Passa al piano Free',
  },
  pt: {
    profileScreenTitle: 'Perfil',
    profileScreenSub: 'Espaço de acompanhamento pessoal e preferências',
    proStatusActive: 'Assinatura Luma Pro ativa',
    freeStatusActive: 'Plano Luma Free ativo',
    mindfulSpaceTitle: 'Espaço consciente',
    mindfulSpaceDesc: 'Sem ansiedade de tarefas. Sem spam. O Luma monitora silenciosamente os momentos da vida até que você precise de orientação.',
    mindfulSpaceHolding: (title, days) => `Luma está cuidando com calma de "${title}" — ${days <= 0 ? 'hoje' : days === 1 ? 'em 1 dia' : `em ${days} dias`}.`,
    mindfulSpaceGeneric: (count) => `${count} momento${count === 1 ? '' : 's'} guardados com calma, no seu ritmo.`,
    aboutYouSub: 'A Luma usa isso para personalizar como ela te prepara — nunca compartilhado.',
    subscriptionTitle: 'SEU PLANO LUMA',
    proDetails: 'Momentos ilimitados · Acesso total ao Luma',
    freeDetails: 'Até 3 momentos por mês',
    unlimitedCount: 'Ilimitado',
    ofUsed: (count) => `${count} de 3 momentos usados`,
    upgradeBtn: 'Atualizar para o Luma Pro →',
    manageBtn: 'Gerenciar assinatura →',
    nextBilling: 'Próxima cobrança em 11 de set de 2026',
    trialEndsLabel: (date) => `Teste grátis até ${date}`,
    renewsLabel: (date) => `Renova em ${date}`,
    quietHoursLabel: 'Horas de silêncio',
    quietHoursSub: 'Sem notificações entre 22h e 8h',
    prepRemindersSub: 'Apenas 1 nota suave por momento de foco',
    importantRemindersSub: 'Notificações oportunas no dia do seu evento',
    factsBadge: '3 fatos',
    toastSaved: 'Alterações salvas',
    toastHistoryCleared: 'Todos os momentos limpos',
    clearConfirmTitle: 'Limpar todos os momentos?',
    clearConfirmText: "Isso exclui todos os momentos e suas etapas de preparo. Não pode ser desfeito.",
    clearConfirmBtn: 'Sim, limpar tudo',
    deleteAccountBtn: 'Excluir conta',
    deleteAccountConfirmTitle: 'Excluir sua conta?',
    deleteAccountConfirmText: "Isso exclui permanentemente sua conta Luma e tudo o que ela contém. Não pode ser desfeito.",
    deleteAccountConfirmBtn: 'Sim, excluir minha conta',
    deleteAccountNeedsRecentLogin: "Por segurança, saia e entre novamente, depois tente excluir sua conta de novo.",
    deleteAccountGenericError: 'Algo deu errado. Tente novamente.',
    deletingLabel: 'Excluindo…',
    privacyPolicyLabel: 'Política de Privacidade',
    termsOfServiceLabel: 'Termos de Serviço',
    toastSignedOut: 'Desconectado silenciosamente',
    toastLangChanged: (name) => `Idioma alterado para ${name}`,
    toastFreeDowngrade: 'Plano alterado para Luma Free',
    editFormTitle: 'Editar perfil',
    cancelBtn: 'Cancelar',
    saveChangesBtn: 'Salvar alterações',
    remembersModalTitle: 'O que o Luma lembra',
    remembersModalDesc: 'O Luma usa esse contexto pessoal para fornecer orientação suave e relevante sem fazer perguntas repetitivas.',
    fact1: '1. Preferência de viagem',
    fact2: '2. Localização base',
    fact3: '3. Ritmo diário',
    gotItBtn: 'Entendido',
    manageModalTitle: 'Gerenciar assinatura',
    manageModalDesc: (planLabel: string) => `Você está atualmente inscrito no Luma Pro (${planLabel}).`,
    perMonth: 'mês',
    perYear: 'ano',
    nextPaymentLabel: 'SEU PRÓXIMO PAGAMENTO',
    nextPaymentValue: (amount: string, date: string) => `${amount} em ${date}`,
    downgradeBtn: 'Mudar para o plano Free',
  },
  tr: {
    profileScreenTitle: 'Profil',
    profileScreenSub: 'Kişisel asistan alanı ve tercihler',
    proStatusActive: 'Luma Pro aboneliği aktif',
    freeStatusActive: 'Luma Free planı aktif',
    mindfulSpaceTitle: 'Sakin alan',
    mindfulSpaceDesc: 'Görev kaygısı yok. Spam yok. Luma, siz rehberlik isteyene kadar hayat anlarını sessizce takip eder.',
    mindfulSpaceHolding: (title, days) => `Luma "${title}" için sakince hazırlanıyor — ${days <= 0 ? 'bugün' : days === 1 ? '1 gün sonra' : `${days} gün sonra`}.`,
    mindfulSpaceGeneric: (count) => `${count} an sakince saklınıyor, kendi hızınızda.`,
    aboutYouSub: 'Luma, sizi nasıl hazırlayacağını buna göre ayarlar — asla paylaşılmaz.',
    subscriptionTitle: 'LUMA PLANINIZ',
    proDetails: 'Sınırsız Anlar · Luma\'ya tam erişim',
    freeDetails: 'Ayda en fazla 3 an',
    unlimitedCount: 'Sınırsız',
    ofUsed: (count) => `${count} / 3 moments kullanıldı`,
    upgradeBtn: 'Luma Pro\'ya Yükselt →',
    manageBtn: 'Aboneliği yönet →',
    nextBilling: 'Sonraki ödeme: 11 Eyl 2026',
    trialEndsLabel: (date) => `Ücretsiz deneme bitiş: ${date}`,
    renewsLabel: (date) => `Yenileme: ${date}`,
    quietHoursLabel: 'Sessiz saatler',
    quietHoursSub: 'Saat 22:00 ile 08:00 arasında bildirim gönderilmez',
    prepRemindersSub: 'Odak anı başına yalnızca 1 yumuşak bildirim',
    importantRemindersSub: 'Etkinliğinizin gerçekleştiği gün zamanında bildirimler',
    factsBadge: '3 bilgi',
    toastSaved: 'Değişiklikler kaydedildi',
    toastHistoryCleared: 'Tüm anlar temizlendi',
    clearConfirmTitle: 'Tüm anlar temizlensin mi?',
    clearConfirmText: "Bu, tüm anları ve hazırlık adımlarını siler. Geri alınamaz.",
    clearConfirmBtn: 'Evet, tümünü temizle',
    deleteAccountBtn: 'Hesabı sil',
    deleteAccountConfirmTitle: 'Hesabınız silinsin mi?',
    deleteAccountConfirmText: "Bu, Luma hesabınızı ve içindeki her şeyi kalıcı olarak siler. Geri alınamaz.",
    deleteAccountConfirmBtn: 'Evet, hesabımı sil',
    deleteAccountNeedsRecentLogin: "Güvenliğiniz için lütfen çıkış yapıp tekrar giriş yapın, ardından hesabınızı silmeyi tekrar deneyin.",
    deleteAccountGenericError: 'Bir şeyler ters gitti. Tekrar deneyin.',
    deletingLabel: 'Siliniyor…',
    privacyPolicyLabel: 'Gizlilik Politikası',
    termsOfServiceLabel: 'Hizmet Şartları',
    toastSignedOut: 'Sessizce çıkış yapıldı',
    toastLangChanged: (name) => `Dil ${name} olarak değiştirildi`,
    toastFreeDowngrade: 'Luma Free planına düşürüldü',
    editFormTitle: 'Profili düzenle',
    cancelBtn: 'İptal',
    saveChangesBtn: 'Değişiklikleri kaydet',
    remembersModalTitle: 'Luma Neleri Hatırlıyor',
    remembersModalDesc: 'Luma, yinelenen sorular sormadan yumuşak ve alakalı rehberlik sağlamak için bu kişisel bağlamı kullanır.',
    fact1: '1. Seyahat tercihi',
    fact2: '2. Ana konum',
    fact3: '3. Günlük ritim',
    gotItBtn: 'Tamam',
    manageModalTitle: 'Aboneliği Yönet',
    manageModalDesc: (planLabel: string) => `Şu anda Luma Pro (${planLabel}) abonesisiniz.`,
    perMonth: 'ay',
    perYear: 'yıl',
    nextPaymentLabel: 'SONRAKİ ÖDEMENİZ',
    nextPaymentValue: (amount: string, date: string) => `${date} tarihinde ${amount}`,
    downgradeBtn: 'Free plana geç',
  },
  zh: {
    profileScreenTitle: '个人资料',
    profileScreenSub: '个人助手空间与偏好设置',
    proStatusActive: 'Luma Pro 订阅已启用',
    freeStatusActive: 'Luma Free 计划已启用',
    mindfulSpaceTitle: '正念空间',
    mindfulSpaceDesc: '没有任务焦虑。没有垃圾信息。Luma 在您需要指导之前，静静地记录生活中的点滴。',
    mindfulSpaceHolding: (title, days) => `Luma 正静静地为“${title}”做准备 — ${days <= 0 ? '就在今天' : `还有 ${days} 天`}.`,
    mindfulSpaceGeneric: (count) => `${count} 个事件被静静地记录着，按你自己的节奏。`,
    aboutYouSub: 'Luma 会用这些信息更精准地为你做准备 — 绝不会分享给他人。',
    subscriptionTitle: '您的 LUMA 计划',
    proDetails: '无限事件 · 完整使用 Luma',
    freeDetails: '每月最多 3 个事件',
    unlimitedCount: '无限制',
    ofUsed: (count) => `已使用 ${count} / 3`,
    upgradeBtn: '升级到 Luma Pro →',
    manageBtn: '管理订阅 →',
    nextBilling: '下次扣款时间：2026年9月11日',
    trialEndsLabel: (date) => `免费试用至 ${date}`,
    renewsLabel: (date) => `续订日期 ${date}`,
    quietHoursLabel: '勿扰时间',
    quietHoursSub: '晚上 10:00 至早上 8:00 期间不发送通知',
    prepRemindersSub: '每个焦点事件仅发送 1 条温柔提醒',
    importantRemindersSub: '在活动当天发送及时通知',
    factsBadge: '3 个事实',
    toastSaved: '修改已保存',
    toastHistoryCleared: '所有事件已清除',
    clearConfirmTitle: '清除所有事件？',
    clearConfirmText: "这将删除所有事件及其准备步骤，且无法撤销。",
    clearConfirmBtn: '是的，全部清除',
    deleteAccountBtn: '删除账户',
    deleteAccountConfirmTitle: '删除您的账户？',
    deleteAccountConfirmText: "这将永久删除您的 Luma 账户及其中的所有内容，且无法撤销。",
    deleteAccountConfirmBtn: '是的，删除我的账户',
    deleteAccountNeedsRecentLogin: "出于安全考虑，请先退出登录再重新登录，然后再次尝试删除账户。",
    deleteAccountGenericError: '出了点问题，请重试。',
    deletingLabel: '删除中…',
    privacyPolicyLabel: '隐私政策',
    termsOfServiceLabel: '服务条款',
    toastSignedOut: '已安静退出登录',
    toastLangChanged: (name) => `语言已更改为 ${name}`,
    toastFreeDowngrade: '已降级为 Luma Free 计划',
    editFormTitle: '编辑个人资料',
    cancelBtn: '取消',
    saveChangesBtn: '保存修改',
    remembersModalTitle: 'Luma 记得什么',
    remembersModalDesc: 'Luma 利用这些个人背景提供轻柔、相关的指导，无需重复询问您同样的问题。',
    fact1: '1. 旅行偏好',
    fact2: '2. 常驻城市',
    fact3: '3. 日常作息',
    gotItBtn: '知道了',
    manageModalTitle: '管理订阅',
    manageModalDesc: (planLabel: string) => `您当前已订阅 Luma Pro（${planLabel}）。`,
    perMonth: '月',
    perYear: '年',
    nextPaymentLabel: '您的下一笔付款',
    nextPaymentValue: (amount: string, date: string) => `${date}付款 ${amount}`,
    downgradeBtn: '切换到 Free 计划',
  },
  de: {
    profileScreenTitle: 'Profil',
    profileScreenSub: 'Persönlicher Begleiter-Bereich & Einstellungen',
    proStatusActive: 'Luma Pro aktiv',
    freeStatusActive: 'Luma Free aktiv',
    mindfulSpaceTitle: 'Achtsamer Raum',
    mindfulSpaceDesc: 'Keine Aufgabenangst. Kein Spam. Luma verfolgt Lebensmomente in aller Stille, bis Sie Unterstützung benötigen.',
    mindfulSpaceHolding: (title, days) => `Luma bereitet still "${title}" vor — ${days <= 0 ? 'heute' : days === 1 ? 'in 1 Tag' : `in ${days} Tagen`}.`,
    mindfulSpaceGeneric: (count) => `${count} Momente werden still festgehalten, in deinem Tempo.`,
    aboutYouSub: 'Luma nutzt das, um dich gezielter vorzubereiten — wird nie geteilt.',
    subscriptionTitle: 'IHR LUMA-TARIF',
    proDetails: 'Unbegrenzte Momente · Voller Zugriff auf Luma',
    freeDetails: 'Bis zu 3 Momente pro Monat',
    unlimitedCount: 'Unbegrenzt',
    ofUsed: (count) => `${count} von 3 verwendet`,
    upgradeBtn: 'Auf Luma Pro upgraden →',
    manageBtn: 'Abonnement verwalten →',
    nextBilling: 'Nächste Abrechnung am 11. Sep. 2026',
    trialEndsLabel: (date) => `Kostenlose Testphase bis ${date}`,
    renewsLabel: (date) => `Verlängerung am ${date}`,
    quietHoursLabel: 'Ruhezeiten',
    quietHoursSub: 'Keine Benachrichtigungen zwischen 22:00 und 08:00 Uhr',
    prepRemindersSub: 'Nur 1 sanfte Notiz pro Fokusmoment',
    importantRemindersSub: 'Rechtzeitige Benachrichtigungen am Tag Ihres Ereignisses',
    factsBadge: '3 Fakten',
    toastSaved: 'Änderungen gespeichert',
    toastHistoryCleared: 'Alle Momente gelöscht',
    clearConfirmTitle: 'Alle Momente löschen?',
    clearConfirmText: "Dadurch werden alle Momente und ihre Vorbereitungsschritte gelöscht. Das kann nicht rückgängig gemacht werden.",
    clearConfirmBtn: 'Ja, alles löschen',
    deleteAccountBtn: 'Konto löschen',
    deleteAccountConfirmTitle: 'Konto löschen?',
    deleteAccountConfirmText: "Dadurch werden dein Luma-Konto und alle darin gespeicherten Daten dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.",
    deleteAccountConfirmBtn: 'Ja, mein Konto löschen',
    deleteAccountNeedsRecentLogin: "Aus Sicherheitsgründen melde dich bitte ab und wieder an, und versuche dann erneut, dein Konto zu löschen.",
    deleteAccountGenericError: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',
    deletingLabel: 'Wird gelöscht…',
    privacyPolicyLabel: 'Datenschutzerklärung',
    termsOfServiceLabel: 'Nutzungsbedingungen',
    toastSignedOut: 'Leise abgemeldet',
    toastLangChanged: (name) => `Sprache auf ${name} geändert`,
    toastFreeDowngrade: 'Auf Luma Free zurückgestuft',
    editFormTitle: 'Profil bearbeiten',
    cancelBtn: 'Abbrechen',
    saveChangesBtn: 'Änderungen speichern',
    remembersModalTitle: 'Was Luma sich merkt',
    remembersModalDesc: 'Luma nutzt diesen persönlichen Kontext, um sanfte, relevante Ratschläge zu erteilen, ohne ständig dieselben Fragen zu stellen.',
    fact1: '1. Reisevorlieben',
    fact2: '2. Wohnort',
    fact3: '3. Täglicher Rhythmus',
    gotItBtn: 'Verstanden',
    manageModalTitle: 'Abonnement verwalten',
    manageModalDesc: (planLabel: string) => `Sie haben derzeit Luma Pro abonniert (${planLabel}).`,
    perMonth: 'Monat',
    perYear: 'Jahr',
    nextPaymentLabel: 'IHRE NÄCHSTE ZAHLUNG',
    nextPaymentValue: (amount: string, date: string) => `${amount} am ${date}`,
    downgradeBtn: 'Zu Free wechseln',
  }
};

interface LumaProfileScreenProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  profileData: UserProfileData;
  onUpdateProfile: (updated: Partial<UserProfileData>) => void;
  onClearHistory?: () => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => Promise<void>;
  momentsCount: number;
  momentsThisMonth?: number;
  moments?: LifeMoment[];
  onOpenUpgradeModal?: () => void;
}

export const LumaProfileScreen: React.FC<LumaProfileScreenProps> = ({
  language,
  onLanguageChange,
  profileData,
  onUpdateProfile,
  onClearHistory,
  onSignOut,
  onDeleteAccount,
  momentsCount,
  momentsThisMonth,
  moments = [],
  onOpenUpgradeModal,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const p = LOCALIZED_PROFILE_STRINGS[language] || LOCALIZED_PROFILE_STRINGS.en;

  // The nearest moment that hasn't happened yet — used to give the Mindful
  // Space card something real to say instead of static marketing copy.
  const nearestUpcomingMoment: { moment: LifeMoment; days: number } | undefined = moments
    .map((m): { moment: LifeMoment; days: number } => ({ moment: m, days: getCalculatedDaysLeft(m) }))
    .filter((x) => x.days >= 0)
    .sort((a, b) => a.days - b.days)[0];

  // Honest billing status text — derived from the real trial start date the
  // person actually triggered (App.tsx sets this when they start a trial),
  // never a hardcoded date. Falls back to the generic p.nextBilling only if
  // this account has no trial record at all (e.g. an older/imported account).
  const billingStatusText = (() => {
    if (!profileData.trialEndsAt) return p.nextBilling;
    const trialEnd = new Date(profileData.trialEndsAt);
    if (isNaN(trialEnd.getTime())) return p.nextBilling;
    const formatted = trialEnd.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' });
    if (trialEnd.getTime() > Date.now()) {
      return p.trialEndsLabel(formatted);
    }
    const cycleMonths = profileData.billingCycle === 'annual' ? 12 : 1;
    const nextRenewal = new Date(trialEnd);
    nextRenewal.setMonth(nextRenewal.getMonth() + cycleMonths);
    while (nextRenewal.getTime() < Date.now()) {
      nextRenewal.setMonth(nextRenewal.getMonth() + cycleMonths);
    }
    return p.renewsLabel(nextRenewal.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' }));
  })();

  // What this person is actually paying, for the manage-subscription modal.
  // Derived from the billing cycle they picked at upgrade time rather than
  // written into the copy, so a price change can't leave the modal lying.
  const subscriptionPlanLabel = `${formatPrice(priceForCycle(profileData.billingCycle))}/${
    profileData.billingCycle === 'annual' ? p.perYear : p.perMonth
  }`;

  // The date of the next charge. Null when this account has no trial record
  // to count from — in that case the modal shows the generic billing line
  // instead of inventing a date.
  const nextPaymentDate = (() => {
    if (!profileData.trialEndsAt) return null;
    const trialEnd = new Date(profileData.trialEndsAt);
    if (isNaN(trialEnd.getTime())) return null;
    // While the trial is still running, the first charge lands when it ends.
    if (trialEnd.getTime() > Date.now()) return trialEnd;
    const cycleMonths = profileData.billingCycle === 'annual' ? 12 : 1;
    const next = new Date(trialEnd);
    next.setMonth(next.getMonth() + cycleMonths);
    while (next.getTime() < Date.now()) {
      next.setMonth(next.getMonth() + cycleMonths);
    }
    return next;
  })();


  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showRemembersModal, setShowRemembersModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserProfileData>(profileData);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const languageOptions: { code: LanguageCode; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский (Russian)' },
    { code: 'es', name: 'Español (Spanish)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'it', name: 'Italiano (Italian)' },
    { code: 'pt', name: 'Português (Portuguese)' },
    { code: 'tr', name: 'Türkçe (Turkish)' },
    { code: 'zh', name: '中文 (Simplified Chinese)' },
    { code: 'de', name: 'Deutsch (German)' },
  ];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSaveProfileForm = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(editForm);
    setIsEditingProfile(false);
    triggerToast(p.toastSaved);
  };

  return (
    <div className="relative space-y-6 max-w-5xl mx-auto pb-28 text-[#2C2723] animate-fade-in pt-2 px-1">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#2C2723] text-white text-xs rounded-full shadow-lg font-medium animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* 1. COMPACT APP HEADER */}
      <div className="px-1 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-normal text-[#2C2723]">
            {p.profileScreenTitle}
          </h1>
          <p className="text-xs text-[#6B6258] mt-0.5">
            {p.profileScreenSub}
          </p>
        </div>

        <button
          onClick={() => {
            setEditForm(profileData);
            setIsEditingProfile(true);
          }}
          className="text-xs text-[#5C6B52] font-semibold hover:underline cursor-pointer px-3.5 py-1.5 rounded-full bg-white border border-[#E5DFD4] shadow-3xs"
        >
          {t.editProfile || 'Edit profile'}
        </button>
      </div>

      {/* Responsive Grid System: Left identity card, Right setting sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Identity Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-[28px] bg-white border border-[#E5DFD4] shadow-3xs text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#2C2723] text-white flex items-center justify-center font-serif text-2xl font-normal mx-auto shadow-2xs">
              {profileData.name ? profileData.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="space-y-0.5">
              <h2 className="font-serif text-xl font-medium text-[#2C2723] break-words">
                {profileData.name}
              </h2>
              <p className="text-xs text-[#6B6258] font-mono break-words">
                {profileData.email}
              </p>
            </div>
            <div className="pt-2">
              <span className={`inline-block px-3 py-1 rounded-full border text-[11px] font-semibold transition ${
                profileData.plan === 'pro'
                  ? 'bg-[#5C6B52]/10 border-[#5C6B52]/20 text-[#5C6B52]'
                  : 'bg-[#FAF7F2] border-[#E5DFD4] text-[#6B6258]'
              }`}>
                {profileData.plan === 'pro' ? p.proStatusActive : p.freeStatusActive}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[24px] bg-[#FAF7F2] border border-[#E5DFD4] space-y-2 text-xs">
            <div className="font-serif font-semibold text-[#2C2723]">{p.mindfulSpaceTitle}</div>
            <p className="text-[#6B6258] leading-relaxed text-[11px]">
              {nearestUpcomingMoment
                ? p.mindfulSpaceHolding(nearestUpcomingMoment.moment.title, nearestUpcomingMoment.days)
                : momentsCount > 0
                ? p.mindfulSpaceGeneric(momentsCount)
                : p.mindfulSpaceDesc}
            </p>
          </div>
        </div>

        {/* Right Settings Workspace Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* YOUR LUMA PLAN */}
          <div className="space-y-1.5 animate-fade-in">
            <div className="uppercase text-[10px] tracking-widest font-semibold text-[#6B6258] px-1">
              {p.subscriptionTitle}
            </div>

            <div className="rounded-[24px] bg-white border border-[#E5DFD4] shadow-3xs p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-lg sm:text-xl font-medium text-[#2C2723]">
                      {profileData.plan === 'pro' ? 'Luma Pro' : 'Luma Free'}
                    </span>
                    {profileData.plan === 'pro' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5C6B52] animate-pulse" />
                    )}
                  </div>
                  
                  <p className="text-xs text-[#6B6258] leading-relaxed">
                    {profileData.plan === 'pro' ? p.proDetails : p.freeDetails}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block whitespace-nowrap text-xs font-mono text-[#2C2723] font-semibold bg-[#FAF7F2] px-2.5 py-1 rounded-full border border-[#E5DFD4]">
                    {profileData.plan === 'pro' ? p.unlimitedCount : p.ofUsed(momentsThisMonth ?? momentsCount)}
                  </span>
                </div>
              </div>

              {profileData.plan !== 'pro' ? (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (onOpenUpgradeModal) {
                        onOpenUpgradeModal();
                      }
                    }}
                    className="w-full sm:w-auto py-2.5 px-5 rounded-full bg-[#5C6B52] hover:bg-[#4D5A44] text-white text-xs font-medium cursor-pointer transition flex items-center justify-center gap-2"
                  >
                    <span>{p.upgradeBtn}</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex flex-wrap gap-2 items-center justify-between">
                  <button
                    onClick={() => {
                      setShowManageModal(true);
                    }}
                    className="py-2 px-4 rounded-full bg-[#FAF7F2] border border-[#E5DFD4] hover:bg-[#E5DFD4]/50 text-xs text-[#2C2723] font-medium transition cursor-pointer"
                  >
                    {p.manageBtn}
                  </button>
                  <span className="text-[10px] text-[#6B6258] font-medium italic">
                    {billingStatusText}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ABOUT YOU */}
          <div className="space-y-1.5">
            <div className="uppercase text-[10px] tracking-widest font-semibold text-[#6B6258] px-1">
              {t.aboutYou || 'ABOUT YOU'}
            </div>
            <p className="text-[11px] text-[#6B6258] leading-relaxed px-1 -mt-0.5">
              {p.aboutYouSub}
            </p>

            <div className="rounded-[24px] bg-white border border-[#E5DFD4] shadow-3xs divide-y divide-[#FAF7F2] overflow-hidden text-xs">
              <button
                onClick={() => {
                  setEditForm(profileData);
                  setIsEditingProfile(true);
                }}
                className="w-full p-3.5 flex items-center justify-between hover:bg-[#FAF7F2] transition text-left cursor-pointer"
              >
                <span className="text-[#6B6258] font-medium">{t.nameLabel || 'Name'}</span>
                <div className="flex items-center gap-1.5 font-semibold text-[#2C2723]">
                  <span>{profileData.name}</span>
                  <span className="text-[#6B6258] text-sm">›</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setEditForm(profileData);
                  setIsEditingProfile(true);
                }}
                className="w-full p-3.5 flex items-center justify-between hover:bg-[#FAF7F2] transition text-left cursor-pointer"
              >
                <span className="text-[#6B6258] font-medium">{t.homeLocationLabel || 'Home / base location'}</span>
                <div className="flex items-center gap-1.5 font-medium text-[#2C2723]">
                  <span>{profileData.homeLocation || 'Dubai'}</span>
                  <span className="text-[#6B6258] text-sm">›</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setEditForm(profileData);
                  setIsEditingProfile(true);
                }}
                className="w-full p-3.5 flex items-center justify-between hover:bg-[#FAF7F2] transition text-left cursor-pointer gap-4"
              >
                <span className="text-[#6B6258] font-medium shrink-0">{t.travelPreferencesLabel || 'Travel preferences'}</span>
                <div className="flex items-center justify-end gap-1.5 font-medium text-[#2C2723] break-words flex-1 min-w-0 text-right">
                  <span className="break-words">{profileData.travelPreferences || 'Hand luggage only · eSIM required'}</span>
                  <span className="text-[#6B6258] text-sm shrink-0">›</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setEditForm(profileData);
                  setIsEditingProfile(true);
                }}
                className="w-full p-3.5 flex items-center justify-between hover:bg-[#FAF7F2] transition text-left cursor-pointer gap-4"
              >
                <span className="text-[#6B6258] font-medium shrink-0">{t.importantPreferencesLabel || 'Important preferences'}</span>
                <div className="flex items-center justify-end gap-1.5 font-medium text-[#2C2723] break-words flex-1 min-w-0 text-right">
                  <span className="break-words">{profileData.importantPreferences || 'Quiet morning schedule · doctor prep 2 days prior'}</span>
                  <span className="text-[#6B6258] text-sm shrink-0">›</span>
                </div>
              </button>
            </div>
          </div>

          {/* LANGUAGE */}
          <div className="space-y-1.5">
            <div className="uppercase text-[10px] tracking-widest font-semibold text-[#6B6258] px-1">
              {t.languageTitle || 'LANGUAGE'}
            </div>

            <div className="rounded-[24px] bg-white border border-[#E5DFD4] shadow-3xs overflow-hidden text-xs">
              <button
                onClick={() => setShowLangPicker(true)}
                className="w-full p-3.5 flex items-center justify-between hover:bg-[#FAF7F2] transition text-left cursor-pointer"
              >
                <span className="text-[#6B6258] font-medium">{t.preferredLanguageLabel || 'Preferred language'}</span>
                <div className="flex items-center gap-1.5 font-semibold text-[#5C6B52]">
                  <span>{languageOptions.find((l) => l.code === language)?.name || 'English'}</span>
                  <span className="text-[#6B6258] text-sm">›</span>
                </div>
              </button>
            </div>
          </div>

          {/* NOTIFICATIONS */}
          <div className="space-y-1.5">
            <div className="uppercase text-[10px] tracking-widest font-semibold text-[#6B6258] px-1">
              {t.notificationsTitle || 'NOTIFICATIONS'}
            </div>

            <div className="rounded-[24px] bg-white border border-[#E5DFD4] shadow-3xs divide-y divide-[#FAF7F2] overflow-hidden text-xs">
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#2C2723]">
                    {t.prepReminders || 'Preparation reminders'}
                  </div>
                  <div className="text-[10px] text-[#6B6258]">
                    {p.prepRemindersSub}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const nextVal = !profileData.prepReminders;
                    onUpdateProfile({ prepReminders: nextVal });
                  }}
                  className={`w-10 h-6 rounded-full transition p-0.5 cursor-pointer shrink-0 ${
                    profileData.prepReminders ? 'bg-[#5C6B52]' : 'bg-[#E5DFD4]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition transform ${
                      profileData.prepReminders ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#2C2723]">
                    {t.importantMomentsReminders || 'Important moment reminders'}
                  </div>
                  <div className="text-[10px] text-[#6B6258]">
                    {p.importantRemindersSub}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const nextVal = !profileData.importantReminders;
                    onUpdateProfile({ importantReminders: nextVal });
                  }}
                  className={`w-10 h-6 rounded-full transition p-0.5 cursor-pointer shrink-0 ${
                    profileData.importantReminders ? 'bg-[#5C6B52]' : 'bg-[#E5DFD4]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition transform ${
                      profileData.importantReminders ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#2C2723]">
                    {t.quietHoursLabel || 'Quiet hours'}
                  </div>
                  <div className="text-[10px] text-[#6B6258]">
                    {profileData.quietHoursRange || '10:00 PM – 08:00 AM'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const nextVal = !profileData.quietHours;
                    onUpdateProfile({ quietHours: nextVal });
                  }}
                  className={`w-10 h-6 rounded-full transition p-0.5 cursor-pointer shrink-0 ${
                    profileData.quietHours ? 'bg-[#5C6B52]' : 'bg-[#E5DFD4]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition transform ${
                      profileData.quietHours ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* LUMA PREFERENCES */}
          <div className="space-y-1.5">
            <div className="uppercase text-[10px] tracking-widest font-semibold text-[#6B6258] px-1">
              {t.lumaPreferencesTitle || 'LUMA PREFERENCES'}
            </div>

            <div className="p-4 rounded-[24px] bg-white border border-[#E5DFD4] shadow-3xs space-y-3 text-xs">
              <div className="space-y-2">
                <span className="font-semibold text-[#2C2723] block">
                  {t.howLumaCommunicates || 'HOW LUMA COMMUNICATES'}
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF7F2] rounded-xl border border-[#E5DFD4]">
                  {(['concise', 'balanced', 'detailed'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => onUpdateProfile({ communicationStyle: style })}
                      className={`py-2 text-[11px] font-medium rounded-lg capitalize transition cursor-pointer ${
                        profileData.communicationStyle === style
                          ? 'bg-[#2C2723] text-white shadow-2xs font-semibold'
                          : 'text-[#6B6258] hover:text-[#2C2723]'
                      }`}
                    >
                      {style === 'concise'
                        ? t.communicationConcise || 'Concise'
                        : style === 'balanced'
                        ? t.communicationBalanced || 'Balanced'
                        : t.communicationDetailed || 'Detailed'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PRIVACY & DATA */}
          <div className="space-y-1.5">
            <div className="uppercase text-[10px] tracking-widest font-semibold text-[#6B6258] px-1">
              {t.privacyDataTitle || 'PRIVACY & DATA'}
            </div>

            <div className="rounded-[24px] bg-white border border-[#E5DFD4] shadow-3xs divide-y divide-[#FAF7F2] overflow-hidden text-xs">
              <button
                onClick={() => setShowRemembersModal(true)}
                className="w-full p-3.5 flex items-center justify-between hover:bg-[#FAF7F2] transition text-left cursor-pointer font-medium text-[#2C2723]"
              >
                <span>{t.whatLumaRemembers || 'What Luma remembers'}</span>
                <div className="flex items-center gap-1.5 text-[#5C6B52]">
                  <span className="text-[11px] font-semibold bg-[#5C6B52]/10 px-2 py-0.5 rounded-full">{p.factsBadge}</span>
                  <span className="text-[#6B6258] text-sm">›</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setEditForm(profileData);
                  setIsEditingProfile(true);
                }}
                className="w-full p-3.5 flex items-center justify-between hover:bg-[#FAF7F2] transition text-left cursor-pointer font-medium text-[#2C2723]"
              >
                <span>{t.managePersonalContext || 'Manage personal context'}</span>
                <span className="text-[#6B6258] text-sm">›</span>
              </button>

              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full p-3.5 flex items-center justify-between hover:bg-[#FAF7F2] transition text-left cursor-pointer font-medium text-[#C26565]"
              >
                <span>{t.clearConversationHistory || 'Clear all moments'}</span>
                <span className="text-[#C26565] text-sm">›</span>
              </button>
            </div>
          </div>

          {/* ACCOUNT */}
          <div className="space-y-1.5 pt-1">
            <div className="uppercase text-[10px] tracking-widest font-semibold text-[#6B6258] px-1">
              {t.accountTitle || 'ACCOUNT'}
            </div>

            <div className="p-3.5 rounded-[24px] bg-white border border-[#E5DFD4] shadow-3xs flex items-center justify-between text-xs gap-3">
              <span className="font-semibold text-[#2C2723] break-words flex-1 min-w-0">{profileData.email}</span>

              <button
                onClick={() => {
                  triggerToast(p.toastSignedOut);
                  if (onSignOut) onSignOut();
                }}
                className="text-xs text-[#C26565] font-medium hover:underline cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>{t.signOut || 'Sign out'}</span>
                <span className="text-sm">›</span>
              </button>
            </div>

            <button
              onClick={() => {
                setDeleteAccountError(null);
                setShowDeleteAccountConfirm(true);
              }}
              className="w-full text-center text-[11px] text-[#B0A99C] hover:text-[#C26565] hover:underline cursor-pointer py-1"
            >
              {p.deleteAccountBtn}
            </button>

            <div className="flex items-center justify-center gap-3 pt-2 pb-1">
              <a
                href="/legal/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#B0A99C] hover:text-[#6B6258] hover:underline"
              >
                {p.privacyPolicyLabel}
              </a>
              <span className="text-[#E5DFD4] text-[10px]">·</span>
              <a
                href="/legal/terms.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#B0A99C] hover:text-[#6B6258] hover:underline"
              >
                {p.termsOfServiceLabel}
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL: EDIT PROFILE */}
      {/* MODAL: CONFIRM CLEAR ALL MOMENTS */}
      {/* MODAL: CONFIRM DELETE ACCOUNT */}
      {showDeleteAccountConfirm && createPortal(
        <div className="fixed inset-0 z-50 bg-[#2C2723]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5DFD4] p-6 w-full max-w-sm shadow-xl space-y-4 animate-scale-up text-[#2C2723]">
            <h3 className="font-serif text-lg font-normal text-[#2C2723]">
              {p.deleteAccountConfirmTitle}
            </h3>
            <p className="text-xs text-[#6B6258] leading-relaxed">
              {p.deleteAccountConfirmText}
            </p>
            {deleteAccountError && (
              <p className="text-xs text-[#C26565] leading-relaxed">
                {deleteAccountError}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeleteAccountConfirm(false)}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#E5DFD4] text-[#6B6258] font-medium transition cursor-pointer text-center text-xs hover:bg-[#FAF7F2] disabled:opacity-50"
              >
                {p.cancelBtn}
              </button>
              <button
                onClick={async () => {
                  if (!onDeleteAccount) return;
                  setIsDeletingAccount(true);
                  setDeleteAccountError(null);
                  try {
                    await onDeleteAccount();
                    // Success means we're signed out and the auth gate will
                    // take over — nothing left to close here.
                  } catch (e: any) {
                    setDeleteAccountError(
                      e?.message === 'NEEDS_RECENT_LOGIN'
                        ? p.deleteAccountNeedsRecentLogin
                        : p.deleteAccountGenericError
                    );
                    setIsDeletingAccount(false);
                  }
                }}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#C26565] text-white font-medium transition cursor-pointer text-center text-xs hover:bg-[#B05555] disabled:opacity-50"
              >
                {isDeletingAccount ? p.deletingLabel : p.deleteAccountConfirmBtn}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showClearConfirm && createPortal(
        <div className="fixed inset-0 z-50 bg-[#2C2723]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5DFD4] p-6 w-full max-w-sm shadow-xl space-y-4 animate-scale-up text-[#2C2723]">
            <h3 className="font-serif text-lg font-normal text-[#2C2723]">
              {p.clearConfirmTitle}
            </h3>
            <p className="text-xs text-[#6B6258] leading-relaxed">
              {p.clearConfirmText}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#E5DFD4] text-[#6B6258] font-medium transition cursor-pointer text-center text-xs hover:bg-[#FAF7F2]"
              >
                {p.cancelBtn}
              </button>
              <button
                onClick={() => {
                  if (onClearHistory) {
                    onClearHistory();
                  }
                  setShowClearConfirm(false);
                  triggerToast(p.toastHistoryCleared);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#C26565] text-white font-medium transition cursor-pointer text-center text-xs hover:bg-[#B05555]"
              >
                {p.clearConfirmBtn}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isEditingProfile && createPortal(
        <div className="fixed inset-0 z-50 bg-[#2C2723]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5DFD4] p-6 w-full max-w-md shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5DFD4]">
              <h3 className="font-serif text-lg font-normal text-[#2C2723]">
                {p.editFormTitle}
              </h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-xs text-[#6B6258] hover:text-[#2C2723] cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfileForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B6258] font-semibold mb-1">
                  {t.nameLabel || 'Name'}
                </label>
                <div className="w-full p-2.5 rounded-xl bg-[#F0ECE3] border border-[#E5DFD4] text-xs font-medium text-[#6B6258]">
                  {profileData.name}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B6258] font-semibold mb-1">
                  {t.homeLocationLabel || 'Home / base location'}
                </label>
                <input
                  type="text"
                  value={editForm.homeLocation}
                  onChange={(e) => setEditForm({ ...editForm, homeLocation: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DFD4] text-xs font-medium text-[#2C2723] focus:outline-none focus:border-[#5C6B52]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B6258] font-semibold mb-1">
                  {t.travelPreferencesLabel || 'Travel preferences'}
                </label>
                <textarea
                  value={editForm.travelPreferences}
                  onChange={(e) => setEditForm({ ...editForm, travelPreferences: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DFD4] text-xs font-medium text-[#2C2723] focus:outline-none focus:border-[#5C6B52]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B6258] font-semibold mb-1">
                  {t.importantPreferencesLabel || 'Important preferences'}
                </label>
                <textarea
                  value={editForm.importantPreferences}
                  onChange={(e) => setEditForm({ ...editForm, importantPreferences: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DFD4] text-xs font-medium text-[#2C2723] focus:outline-none focus:border-[#5C6B52]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-full border border-[#E5DFD4] text-xs text-[#6B6258] hover:bg-[#FAF7F2] cursor-pointer"
                >
                  {p.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#2C2723] text-white text-xs font-medium hover:bg-[#3D3732] cursor-pointer shadow-xs"
                >
                  {p.saveChangesBtn}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: LANGUAGE PICKER */}
      {showLangPicker && createPortal(
        <div className="fixed inset-0 z-50 bg-[#2C2723]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5DFD4] p-6 w-full max-w-sm shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5DFD4]">
              <h3 className="font-serif text-lg font-normal text-[#2C2723]">
                {t.languageTitle || 'Language'}
              </h3>
              <button
                onClick={() => setShowLangPicker(false)}
                className="text-xs text-[#6B6258] hover:text-[#2C2723] cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto pr-1 text-xs">
              {languageOptions.map((opt) => {
                const isSelected = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    onClick={() => {
                      onLanguageChange(opt.code);
                      onUpdateProfile({ preferredLanguage: opt.name });
                      setShowLangPicker(false);
                      triggerToast(p.toastLangChanged(opt.name));
                    }}
                    className={`w-full p-3 rounded-xl flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#5C6B52]/10 text-[#5C6B52] font-semibold border border-[#5C6B52]/30'
                        : 'hover:bg-[#FAF7F2] text-[#2C2723] font-medium'
                    }`}
                  >
                    <span>{opt.name}</span>
                    {isSelected && <span className="font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: WHAT LUMA REMEMBERS */}
      {showRemembersModal && createPortal(
        <div className="fixed inset-0 z-50 bg-[#2C2723]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5DFD4] p-6 w-full max-w-md shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5DFD4]">
              <h3 className="font-serif text-lg font-normal text-[#2C2723]">
                {p.remembersModalTitle}
              </h3>
              <button
                onClick={() => setShowRemembersModal(false)}
                className="text-xs text-[#6B6258] hover:text-[#2C2723] cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#6B6258]">
              {p.remembersModalDesc}
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E5DFD4] space-y-1">
                <span className="font-semibold text-[#5C6B52]">{p.fact1}</span>
                <p className="text-[#2C2723] font-medium">{profileData.travelPreferences || 'Hand luggage only · eSIM required'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E5DFD4] space-y-1">
                <span className="font-semibold text-[#5C6B52]">{p.fact2}</span>
                <p className="text-[#2C2723] font-medium">{profileData.homeLocation || 'Dubai'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E5DFD4] space-y-1">
                <span className="font-semibold text-[#5C6B52]">{p.fact3}</span>
                <p className="text-[#2C2723] font-medium">{profileData.importantPreferences || 'Quiet morning schedule · doctor prep 2 days prior'}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowRemembersModal(false)}
                className="px-5 py-2 rounded-full bg-[#2C2723] text-white text-xs font-medium cursor-pointer hover:bg-[#3D3732]"
              >
                {p.gotItBtn}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: MANAGE SUBSCRIPTION (DOWNGRADE OPTION) */}
      {showManageModal && createPortal(
        <div className="fixed inset-0 z-50 bg-[#2C2723]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-[#E5DFD4] p-6 w-full max-w-sm shadow-xl space-y-4 animate-scale-up text-[#2C2723]">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5DFD4]">
              <h3 className="font-serif text-lg font-normal text-[#2C2723]">
                {p.manageModalTitle}
              </h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-xs text-[#6B6258] hover:text-[#2C2723] cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <p className="text-[#6B6258]">
                {p.manageModalDesc(subscriptionPlanLabel)}
              </p>

              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E5DFD4]">
                {nextPaymentDate ? (
                  <>
                    <span className="text-[10px] uppercase font-semibold text-[#5C6B52] tracking-wider block mb-1">
                      {p.nextPaymentLabel}
                    </span>
                    <span className="font-serif text-sm text-[#2C2723] font-medium block">
                      {p.nextPaymentValue(
                        formatPrice(priceForCycle(profileData.billingCycle)),
                        nextPaymentDate.toLocaleDateString(language, { month: 'long', day: 'numeric', year: 'numeric' })
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-[#6B6258] block">{p.nextBilling}</span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              {profileData.plan === 'pro' && (
                <button
                  onClick={() => {
                    onUpdateProfile({ plan: 'free' });
                    setShowManageModal(false);
                    triggerToast(p.toastFreeDowngrade);
                  }}
                  className="text-xs text-[#C26565] font-medium hover:underline cursor-pointer"
                >
                  {p.downgradeBtn}
                </button>
              )}
              <button
                onClick={() => setShowManageModal(false)}
                className="px-5 py-2 rounded-full bg-[#2C2723] text-white text-xs font-medium cursor-pointer hover:bg-[#3D3732] ml-auto"
              >
                {p.gotItBtn}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
