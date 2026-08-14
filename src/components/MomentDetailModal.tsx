import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LifeMoment, GentleStep } from '../types';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { EventPreparationWorkspace } from './EventPreparationWorkspace';

const LOCALIZED_DETAIL_STRINGS: Record<LanguageCode, {
  deleteTitle: string;
  deleteConfirmText: string;
  cancel: string;
  yesDelete: string;
  editTitle: string;
  momentTitleLabel: string;
  targetDateLabel: string;
  timeOfDayLabel: string;
  timeOfDayPlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  saveChanges: string;
  options: string;
  editMoment: string;
  deleteMoment: string;
}> = {
  en: {
    deleteTitle: 'Delete this Moment?',
    deleteConfirmText: 'Are you sure you want to delete this moment? All related steps and notes will be permanently lost.',
    cancel: 'Cancel',
    yesDelete: 'Yes, Delete',
    editTitle: 'Edit Moment',
    momentTitleLabel: 'Moment Title',
    targetDateLabel: 'Target Date',
    timeOfDayLabel: 'Time of Day (optional)',
    timeOfDayPlaceholder: 'e.g. Morning flight or 14:00',
    notesLabel: 'Notes (optional)',
    notesPlaceholder: 'Details about this moment...',
    saveChanges: 'Save Changes',
    options: 'Options',
    editMoment: 'Edit Moment',
    deleteMoment: 'Delete Moment',
  },
  ru: {
    deleteTitle: 'Удалить это событие?',
    deleteConfirmText: 'Вы уверены, что хотите удалить событие? Это действие необратимо.',
    cancel: 'Отмена',
    yesDelete: 'Да, удалить',
    editTitle: 'Редактировать событие',
    momentTitleLabel: 'Название события',
    targetDateLabel: 'Дата события',
    timeOfDayLabel: 'Время / Период (необязательно)',
    timeOfDayPlaceholder: 'например: Утренний рейс или 14:00',
    notesLabel: 'Заметки (необязательно)',
    notesPlaceholder: 'Детали события...',
    saveChanges: 'Сохранить изменения',
    options: 'Опции',
    editMoment: 'Редактировать',
    deleteMoment: 'Удалить',
  },
  es: {
    deleteTitle: '¿Eliminar este momento?',
    deleteConfirmText: '¿Estás seguro de que quieres eliminar este momento? Todos los pasos y notas se perderán permanentemente.',
    cancel: 'Cancelar',
    yesDelete: 'Sí, eliminar',
    editTitle: 'Editar momento',
    momentTitleLabel: 'Título del momento',
    targetDateLabel: 'Fecha de destino',
    timeOfDayLabel: 'Hora del día (opcional)',
    timeOfDayPlaceholder: 'ej. Vuelo de la mañana o 14:00',
    notesLabel: 'Notas (opcional)',
    notesPlaceholder: 'Detalles sobre este momento...',
    saveChanges: 'Guardar cambios',
    options: 'Opciones',
    editMoment: 'Editar momento',
    deleteMoment: 'Eliminar momento',
  },
  fr: {
    deleteTitle: 'Supprimer ce moment ?',
    deleteConfirmText: 'Voulez-vous vraiment supprimer ce moment ? Toutes les étapes et notes seront définitivement perdues.',
    cancel: 'Annuler',
    yesDelete: 'Oui, supprimer',
    editTitle: 'Modifier le moment',
    momentTitleLabel: 'Titre du moment',
    targetDateLabel: 'Date prévue',
    timeOfDayLabel: 'Heure de la journée (facultatif)',
    timeOfDayPlaceholder: 'ex. Vol du matin ou 14h00',
    notesLabel: 'Notes (facultatif)',
    notesPlaceholder: 'Détails sur ce moment...',
    saveChanges: 'Enregistrer les modifications',
    options: 'Options',
    editMoment: 'Modifier le moment',
    deleteMoment: 'Supprimer le moment',
  },
  it: {
    deleteTitle: 'Eliminare questo momento?',
    deleteConfirmText: 'Sei sicuro di voler eliminare questo momento? Tutti i passi e le note andranno persi definitivamente.',
    cancel: 'Annulla',
    yesDelete: 'Sì, elimina',
    editTitle: 'Modifica momento',
    momentTitleLabel: 'Titolo del momento',
    targetDateLabel: 'Data stabilita',
    timeOfDayLabel: 'Ora del giorno (opzionale)',
    timeOfDayPlaceholder: 'es. Volo del mattino o 14:00',
    notesLabel: 'Note (opzionale)',
    notesPlaceholder: 'Dettagli su questo momento...',
    saveChanges: 'Salva modifiche',
    options: 'Opzioni',
    editMoment: 'Modifica momento',
    deleteMoment: 'Elimina momento',
  },
  pt: {
    deleteTitle: 'Excluir este momento?',
    deleteConfirmText: 'Tem certeza de que deseja excluir este momento? Todos os passos e notas relacionados serão perdidos permanentemente.',
    cancel: 'Cancelar',
    yesDelete: 'Sim, excluir',
    editTitle: 'Editar momento',
    momentTitleLabel: 'Título do momento',
    targetDateLabel: 'Data alvo',
    timeOfDayLabel: 'Hora do dia (opcional)',
    timeOfDayPlaceholder: 'ex: Voo da manhã ou 14:00',
    notesLabel: 'Notas (opcional)',
    notesPlaceholder: 'Detalhes sobre este momento...',
    saveChanges: 'Salvar alterações',
    options: 'Opções',
    editMoment: 'Editar momento',
    deleteMoment: 'Excluir momento',
  },
  tr: {
    deleteTitle: 'Bu anı sil?',
    deleteConfirmText: 'Bu anı silmek istediğinizden emin misiniz? İlgili tüm adımlar ve notlar kalıcı olarak silinecektir.',
    cancel: 'İptal',
    yesDelete: 'Evet, Sil',
    editTitle: 'Anı Düzenle',
    momentTitleLabel: 'An Başlığı',
    targetDateLabel: 'Hedef Tarih',
    timeOfDayLabel: 'Günün Saati (isteğe bağlı)',
    timeOfDayPlaceholder: 'örn. Sabah uçuşu veya 14:00',
    notesLabel: 'Notlar (isteğe bağlı)',
    notesPlaceholder: 'Bu an hakkında ayrıntılar...',
    saveChanges: 'Değişiklikleri Kaydet',
    options: 'Seçenekler',
    editMoment: 'Anı Düzenle',
    deleteMoment: 'Anı Sil',
  },
  zh: {
    deleteTitle: '删除此事件？',
    deleteConfirmText: '您确定要删除此事件吗？所有相关的筹备步骤和笔记都将永久丢失。',
    cancel: '取消',
    yesDelete: '确定删除',
    editTitle: '编辑事件',
    momentTitleLabel: '事件标题',
    targetDateLabel: '目标日期',
    timeOfDayLabel: '具体时间（选填）',
    timeOfDayPlaceholder: '例如：上午航班 或 14:00',
    notesLabel: '备注（选填）',
    notesPlaceholder: '有关此事件的详细信息...',
    saveChanges: '保存修改',
    options: '选项',
    editMoment: '编辑事件',
    deleteMoment: '删除事件',
  },
  de: {
    deleteTitle: 'Diesen Moment löschen?',
    deleteConfirmText: 'Sind Sie sicher, dass Sie diesen Moment löschen möchten? Alle zugehörigen Schritte und Notizen gehen verloren.',
    cancel: 'Abbrechen',
    yesDelete: 'Ja, löschen',
    editTitle: 'Moment bearbeiten',
    momentTitleLabel: 'Titel des Moments',
    targetDateLabel: 'Zieldatum',
    timeOfDayLabel: 'Tageszeit (optional)',
    timeOfDayPlaceholder: 'z.B. Morgenflug oder 14:00',
    notesLabel: 'Notizen (optional)',
    notesPlaceholder: 'Details zu diesem Moment...',
    saveChanges: 'Änderungen speichern',
    options: 'Optionen',
    editMoment: 'Moment bearbeiten',
    deleteMoment: 'Moment löschen',
  }
};

interface MomentDetailModalProps {
  language: LanguageCode;
  moment: LifeMoment | null;
  onClose: () => void;
  onToggleStep: (momentId: string, stepId: string) => void;
  onAddStep?: (momentId: string, step: GentleStep) => void;
  onDeleteMoment?: (momentId: string) => void;
  onUpdateMoment?: (momentId: string, updatedFields: Partial<LifeMoment>) => void;
}

export const MomentDetailModal: React.FC<MomentDetailModalProps> = ({
  language,
  moment,
  onClose,
  onToggleStep,
  onAddStep,
  onDeleteMoment,
  onUpdateMoment,
}) => {
  // Edit & Delete menu / form states
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const momentId = moment?.id;

  useEffect(() => {
    if (moment) {
      setEditTitle(moment.title);
      setEditDate(moment.targetDate || '');
      setEditTime(moment.timeOfDay || '');
      setEditNotes(moment.notes || '');
    }
  }, [isEditing, momentId]);

  if (!moment) return null;

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const d = LOCALIZED_DETAIL_STRINGS[language] || LOCALIZED_DETAIL_STRINGS.en;

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !onUpdateMoment) return;

    let calculatedDaysLeft = moment.daysLeft;
    if (editDate) {
      const target = new Date(editDate);
      const today = new Date();
      target.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      calculatedDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    onUpdateMoment(moment.id, {
      title: editTitle.trim(),
      targetDate: editDate,
      timeOfDay: editTime.trim(),
      notes: editNotes.trim(),
      daysLeft: calculatedDaysLeft,
    });

    setIsEditing(false);
  };

  if (showDeleteConfirm) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2723]/40 backdrop-blur-xs animate-fade-in">
        <div className="bg-[#FAF7F2] border border-[#E5DFD4] rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden text-[#2C2723] p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#C26565]/10 text-[#C26565] flex items-center justify-center text-xl font-bold mx-auto">
            !
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg text-[#2C2723]">
              {d.deleteTitle}
            </h3>
            <p className="text-xs text-[#6B6258] leading-relaxed">
              {d.deleteConfirmText}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 rounded-full border border-[#E5DFD4] text-[#6B6258] hover:bg-[#FAF7F2] text-xs font-medium transition cursor-pointer"
            >
              {d.cancel}
            </button>
            <button
              onClick={() => {
                if (onDeleteMoment) {
                  onDeleteMoment(moment.id);
                }
                setShowDeleteConfirm(false);
                onClose();
              }}
              className="flex-1 py-2.5 rounded-full bg-[#C26565] text-white hover:bg-[#B05454] text-xs font-medium transition cursor-pointer"
            >
              {d.yesDelete}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (isEditing) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2723]/40 backdrop-blur-xs animate-fade-in">
        <div className="bg-[#FAF7F2] border border-[#E5DFD4] rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden text-[#2C2723] flex flex-col max-h-[88vh]">
          
          {/* Edit Header */}
          <div className="p-6 bg-white border-b border-[#E5DFD4] flex items-center justify-between shrink-0">
            <h2 className="font-serif text-xl text-[#2C2723] font-normal">
              {d.editTitle}
            </h2>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 px-3 rounded-full border border-[#E5DFD4] text-[#6B6258] hover:text-[#2C2723] hover:bg-[#FAF7F2] transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Edit Body */}
          <form onSubmit={handleSaveChanges} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[#6B6258] font-semibold block px-1">
                {d.momentTitleLabel}
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full p-3 rounded-2xl bg-white border border-[#E5DFD4] focus:outline-none focus:border-[#5C6B52] text-xs font-medium text-[#2C2723]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[#6B6258] font-semibold block px-1">
                {d.targetDateLabel}
              </label>
              <input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full p-3 rounded-2xl bg-white border border-[#E5DFD4] focus:outline-none focus:border-[#5C6B52] text-xs font-medium text-[#2C2723]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[#6B6258] font-semibold block px-1">
                {d.timeOfDayLabel}
              </label>
              <input
                type="text"
                placeholder={d.timeOfDayPlaceholder}
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full p-3 rounded-2xl bg-white border border-[#E5DFD4] focus:outline-none focus:border-[#5C6B52] text-xs font-medium text-[#2C2723]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[#6B6258] font-semibold block px-1">
                {d.notesLabel}
              </label>
              <textarea
                placeholder={d.notesPlaceholder}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-2xl bg-white border border-[#E5DFD4] focus:outline-none focus:border-[#5C6B52] text-xs font-medium text-[#2C2723] resize-none"
              />
            </div>
          </form>

          {/* Edit Footer */}
          <div className="p-4 bg-white border-t border-[#E5DFD4] flex gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 py-2.5 rounded-full border border-[#E5DFD4] text-[#6B6258] hover:bg-[#FAF7F2] text-xs font-medium transition cursor-pointer"
            >
              {d.cancel}
            </button>
            <button
              onClick={handleSaveChanges}
              className="flex-1 py-2.5 rounded-full bg-[#2C2723] text-white hover:bg-[#3D3732] text-xs font-medium transition cursor-pointer"
            >
              {d.saveChanges}
            </button>
          </div>

        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2723]/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-[#E5DFD4] rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden text-[#2C2723] flex flex-col max-h-[88vh]">
        
        {/* Modal Header Controls */}
        <div className="px-6 py-4 border-b border-[#E5DFD4]/60 flex items-center justify-between shrink-0 bg-[#FAF7F2]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6B6258]">
            {t.focusMoment || 'Event Preparation'}
          </span>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 px-3 rounded-full border border-[#E5DFD4] text-[#6B6258] hover:text-[#2C2723] hover:bg-white transition cursor-pointer font-bold text-sm"
                title={d.options}
              >
                ···
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-white border border-[#E5DFD4] shadow-lg py-1.5 z-50 text-xs animate-scale-up">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#FAF7F2] text-[#2C2723] font-medium transition cursor-pointer"
                  >
                    {d.editMoment}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#FAF7F2] text-[#C26565] font-semibold transition cursor-pointer"
                  >
                    {d.deleteMoment}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 px-3 rounded-full border border-[#E5DFD4] text-[#6B6258] hover:text-[#2C2723] hover:bg-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body: Clean Event Preparation Hierarchy */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          <EventPreparationWorkspace
            moment={moment}
            language={language}
            onToggleStepDone={onToggleStep}
            onAddStep={onAddStep}
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF7F2] border-t border-[#E5DFD4] text-center shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-full bg-[#2C2723] text-white text-xs font-medium hover:bg-[#3D3732] transition cursor-pointer"
          >
            {t.done}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
