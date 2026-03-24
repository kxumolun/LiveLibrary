import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

interface Props {
  onVerified: (file: File) => void;
  onCancel: () => void;
}

export default function FaceVerification({ onVerified, onCancel }: Props) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Modellar yuklanmoqda...');
  const [preview, setPreview] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      setLoading(false);
      setStatus('Rasm yuklang');
    };
    loadModels();
  }, []);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setStatus('Tekshirilmoqda...');
    setChecking(true);

    // Rasm yuklangandan keyin tekshirish
    setTimeout(async () => {
      if (!imgRef.current) return;
      try {
        const detections = await faceapi.detectAllFaces(
          imgRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );

        if (detections.length < 2) {
          setStatus(`❌ ${detections.length} ta yuz topildi. Ikkala odam ko'ringan rasm yuklang!`);
          setPreview(null);
          setFile(null);
        } else {
          setStatus(`✅ ${detections.length} ta yuz topildi! Rasm qabul qilindi.`);
        }
      } catch {
        setStatus('Xato yuz berdi, qayta urinib ko\'ring');
      } finally {
        setChecking(false);
      }
    }, 500);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        📸 Kitobni topshirayotganda ikkalangiz ham ko'ringan uchrashuv rasmini yuklang
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm text-center">Yuklanmoqda...</p>
      ) : (
        <>
          <div
            className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-400 transition overflow-hidden"
            onClick={() => document.getElementById('face-input')?.click()}
          >
            {preview ? (
              <img
                ref={imgRef}
                src={preview}
                alt="preview"
                className="h-full object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm">Uchrashuv rasmini yuklang</p>
              </div>
            )}
          </div>
          <input
            id="face-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImage}
          />

          <p className={`text-sm text-center font-medium ${
            status.includes('✅') ? 'text-green-600' :
            status.includes('❌') ? 'text-red-500' : 'text-gray-600'
          }`}>
            {status}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 border py-2 rounded-lg hover:bg-gray-50 text-sm"
            >
              Bekor qilish
            </button>
            <button
              onClick={() => file && onVerified(file)}
              disabled={!file || checking || !status.includes('✅')}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              Tasdiqlash
            </button>
          </div>
        </>
      )}
    </div>
  );
}