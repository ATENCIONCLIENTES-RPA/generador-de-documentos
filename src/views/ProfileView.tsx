import React, { useState, useRef } from 'react';
import { Upload, Check, PenTool } from 'lucide-react';
import { UserProfile, StepId } from '../types';
import { SignaturePadModal } from '../components/SignaturePadModal';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onNavigate: (step: StepId) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onSaveProfile,
  onNavigate,
}) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev) => ({
            ...prev,
            signatureUrl: event.target?.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev) => ({
            ...prev,
            signatureUrl: event.target?.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setIsSaved(true);
    setTimeout(() => {
      onNavigate('configuracion');
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-[#002f6c] tracking-tight">
          Módulo 1: Perfil de Trabajo
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configura tus datos de funcionario y firma electrónica para la suscripción de documentos.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header Top Blue Accent */}
        <div className="h-1.5 bg-[#004b93] w-full" />

        <form onSubmit={handleSave} className="p-6 lg:p-8 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Configuración del Perfil
          </h2>

          {/* Row: Nombre completo, Cargo, Correo electrónico */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jaime Arley Rizo Morales"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Cargo
              </label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Técnico"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@essa.com.co"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Firma Digital Section */}
          <div className="space-y-4 pt-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Firma Digital
            </label>

            {/* Upload Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#004b93] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Cargar imagen de firma
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Arrastra y suelta tu firma aquí o selecciona un archivo (PNG, JPG)
                </p>
              </div>
            </div>

            {/* Quick Draw Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSignatureModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#004b93] hover:text-[#003870] hover:underline"
              >
                <PenTool className="w-3.5 h-3.5" />
                O dibuja tu firma en pantalla
              </button>
            </div>

            {/* Vista previa de firma */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">
                Vista previa de firma
              </label>
              <div className="border border-slate-200 bg-slate-50/50 rounded-2xl h-28 flex items-center justify-center p-4 relative overflow-hidden">
                {formData.signatureUrl ? (
                  <img
                    src={formData.signatureUrl}
                    alt="Firma"
                    className="max-h-20 max-w-full object-contain filter contrast-125"
                  />
                ) : (
                  <svg className="w-48 h-16 text-[#002f6c] opacity-80" viewBox="0 0 200 60" fill="none">
                    <path
                      d="M 15 45 C 30 10, 45 60, 60 20 C 75 10, 80 50, 95 30 C 110 10, 130 55, 150 25 C 165 15, 180 35, 190 28"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <line x1="10" y1="52" x2="190" y2="52" stroke="#cbd5e1" strokeWidth="1" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 pt-6">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-2.5 bg-[#004b93] hover:bg-[#003870] text-white text-sm font-bold rounded-xl shadow-sm transition-all hover:scale-102"
            >
              {isSaved ? <Check className="w-4 h-4" /> : null}
              {isSaved ? '¡Guardado!' : 'Guardar Perfil'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('inicio')}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {/* Signature Modal */}
      <SignaturePadModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={(signatureData) => {
          setFormData({ ...formData, signatureUrl: signatureData });
        }}
      />
    </div>
  );
};
