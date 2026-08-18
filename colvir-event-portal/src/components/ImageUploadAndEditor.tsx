import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  Sliders,
  RotateCcw,
  Check,
  AlertCircle,
  Trash2,
  Wand2,
  FileCheck,
  Building2
} from 'lucide-react';

interface ImageUploadAndEditorProps {
  currentImageUrl: string;
  onImageChange: (newUrl: string) => void;
  category?: string;
}

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PRESET_IMAGES = [
  {
    name: '☕ Кофе-брейк',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: '🗣️ Speaking Club',
    url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: '📚 Книжный клуб',
    url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: '🎮 Квиз и Игры',
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: '🏐 Спорт & Турнир',
    url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: '🎓 Воркшоп / ИИ',
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80'
  }
];

export const ImageUploadAndEditor: React.FC<ImageUploadAndEditorProps> = ({
  currentImageUrl,
  onImageChange
}) => {
  const [activeSourceTab, setActiveSourceTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; sizeMb: string } | null>(null);
  const [urlInput, setUrlInput] = useState('');
  
  // Image editing parameters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [selectedFilter, setSelectedFilter] = useState<'normal' | 'vibrant' | 'warm' | 'cool' | 'contrast' | 'grayscale' | 'colvir'>('normal');
  const [isEditingOpen, setIsEditingOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get CSS filter string
  const getFilterStyle = () => {
    let b = brightness;
    let c = contrast;
    let s = saturate;
    let extra = '';

    switch (selectedFilter) {
      case 'vibrant':
        s += 40;
        c += 15;
        break;
      case 'warm':
        extra += ' sepia(25%)';
        b += 5;
        break;
      case 'cool':
        extra += ' hue-rotate(180deg) sepia(10%)';
        b += 5;
        break;
      case 'contrast':
        c += 35;
        s += 10;
        break;
      case 'grayscale':
        extra += ' grayscale(100%)';
        break;
      case 'colvir':
        extra += ' hue-rotate(200deg)';
        c += 10;
        break;
      default:
        break;
    }

    return `brightness(${b}%) contrast(${c}%) saturate(${s}%)${extra}`;
  };

  const handleFileSelect = (file: File) => {
    setFileError(null);

    if (!file.type.startsWith('image/')) {
      setFileError('Пожалуйста, выберите корректный файл изображения (PNG, JPG, WEBP и др.)');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setFileError(`Файл слишком большой (${sizeMb} МБ). Максимальный допустимый размер — ${MAX_FILE_SIZE_MB} МБ.`);
      return;
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setFileInfo({ name: file.name, sizeMb });

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageChange(result);
        setIsEditingOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      onImageChange(urlInput.trim());
      setFileInfo(null);
      setUrlInput('');
      setIsEditingOpen(true);
    }
  };

  const handleSelectPreset = (url: string) => {
    onImageChange(url);
    setFileInfo(null);
    setIsEditingOpen(true);
  };

  const handleResetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setSelectedFilter('normal');
  };

  // Bake image edits onto a canvas and return new compressed data URL
  const handleBakeEditedImage = () => {
    if (!currentImageUrl) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 1200;
      canvas.height = img.height || 675;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.filter = getFilterStyle();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
          const bakedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          onImageChange(bakedDataUrl);
        } catch (e) {
          console.warn('Canvas export cross-origin limit, style kept visually', e);
        }
      }
      setIsProcessing(false);
    };
    img.onerror = () => {
      setIsProcessing(false);
    };
    img.src = currentImageUrl;
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
      
      {/* Title & Badge */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-accent" />
          Обложка мероприятия (до 20 МБ)
        </label>
        <span className="px-2.5 py-0.5 bg-blue-100 text-accent text-[10px] font-black rounded-md uppercase">
          Макс. 20 МБ
        </span>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/70 rounded-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveSourceTab('upload')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeSourceTab === 'upload'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-accent" />
          <span>Загрузить файл</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSourceTab('presets')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeSourceTab === 'presets'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Готовые обложки</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSourceTab('url')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeSourceTab === 'url'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
          <span>Ссылка URL</span>
        </button>
      </div>

      {/* TAB 1: FILE UPLOAD AREA (UP TO 20 MB) */}
      {activeSourceTab === 'upload' && (
        <div className="space-y-3">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-accent bg-white p-5 rounded-2xl cursor-pointer text-center transition-all group hover:bg-blue-50/30"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-50 group-hover:bg-accent text-accent group-hover:text-white flex items-center justify-center transition-colors">
              <Upload className="w-5 h-5" />
            </div>

            <p className="text-xs font-extrabold text-slate-800">
              Нажмите или перетащите изображение сюда
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Поддерживаются JPG, PNG, WEBP, GIF • <span className="font-bold text-slate-600">Размер до 20 МБ</span>
            </p>
          </div>

          {fileError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {fileInfo && !fileError && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{fileInfo.name}</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-200/80 rounded text-[10px] font-black text-emerald-900 shrink-0">
                {fileInfo.sizeMb} МБ / 20 МБ
              </span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRESET GALLERY */}
      {activeSourceTab === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESET_IMAGES.map((preset, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => handleSelectPreset(preset.url)}
              className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all text-left group ${
                currentImageUrl === preset.url
                  ? 'border-accent ring-2 ring-accent/30'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
              <span className="absolute bottom-1.5 left-2 right-2 text-[11px] font-bold text-white drop-shadow-sm truncate">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* TAB 3: URL INPUT */}
      {activeSourceTab === 'url' && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
            className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-accent outline-hidden"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3.5 py-2 bg-accent text-white text-xs font-bold rounded-xl hover:bg-accent-hover"
          >
            Применить
          </button>
        </div>
      )}

      {/* CURRENT IMAGE PREVIEW & IMAGE EDITOR CONTROLS */}
      {currentImageUrl && (
        <div className="space-y-3 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
              Предпросмотр и редактор фильтров
            </span>

            <button
              type="button"
              onClick={() => setIsEditingOpen(!isEditingOpen)}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isEditingOpen ? 'Скрыть редактор' : 'Редактировать фильтры'}</span>
            </button>
          </div>

          {/* Banner 16:9 Live Display */}
          <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-slate-900 shadow-xs border border-slate-200">
            <img
              src={currentImageUrl}
              alt="Обложка события"
              style={{ filter: getFilterStyle() }}
              className="w-full h-full object-cover transition-all duration-300"
            />

            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
              <Building2 className="w-3 h-3 text-amber-400" />
              16:9 Colvir Event Cover
            </div>
          </div>

          {/* EDITING SLIDERS & PRESET FILTERS */}
          {isEditingOpen && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
              
              {/* Preset Filters Pills */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                  Стили и пресеты фильтров:
                </label>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    { id: 'normal', label: 'Оригинал' },
                    { id: 'colvir', label: 'Colvir Blue' },
                    { id: 'vibrant', label: 'Сочный' },
                    { id: 'warm', label: 'Теплый' },
                    { id: 'cool', label: 'Холодный' },
                    { id: 'contrast', label: 'Четкий' },
                    { id: 'grayscale', label: 'Монохром' }
                  ].map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => setSelectedFilter(f.id as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedFilter === f.id
                          ? 'bg-accent text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="flex justify-between font-bold text-slate-600 mb-1">
                    <span>Яркость:</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-slate-600 mb-1">
                    <span>Контраст:</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-slate-600 mb-1">
                    <span>Насыщенность:</span>
                    <span>{saturate}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={saturate}
                    onChange={(e) => setSaturate(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Сбросить настройки</span>
                </button>

                <button
                  type="button"
                  onClick={handleBakeEditedImage}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Запекаем...' : 'Сохранить обработку'}</span>
                </button>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};
