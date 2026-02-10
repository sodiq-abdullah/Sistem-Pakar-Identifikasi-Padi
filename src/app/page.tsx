'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Leaf, Zap, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { diseaseInfo } from '@/data/diseaseData';
import { UserAnswers, DiagnosisResult as DiagnosisResultType, PredictionResult } from '@/types';
import {
  calculateUserScore,
  calculateFinalScore,
  formatProbability,
  loadTeachableMachineModel,
  predictImage,
} from '@/utils/predictionUtils';
import Questionnaire from '@/components/Questionnaire';
import DiagnosisChart from '@/components/DiagnosisChart';
import DiagnosisResult from '@/components/DiagnosisResult';

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [currentStep, setCurrentStep] = useState<'upload' | 'chart' | 'validation' | 'result'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [model, setModel] = useState<any>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResultType | null>(null);

  // Load model on mount
  useEffect(() => {
    const initializeModel = async () => {
      try {
        setModelLoading(true);
        setError(null);
        console.log('Initializing AI model...');
        
        const loadedModel = await loadTeachableMachineModel();
        setModel(loadedModel);
        console.log('✓ AI model ready');
        setModelLoading(false);
      } catch (err) {
        console.error('Model loading error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Model gagal dimuat';
        setError(
          `Gagal memuat model AI (${errorMsg}). Coba refresh halaman atau cek koneksi internet Anda.`
        );
        setModelLoading(false);
      }
    };

    initializeModel();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Prevent file selection while prediction is loading
    if (loading) {
      setError('Tunggu hingga analisis selesai sebelum mengunggah gambar baru.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Silakan pilih file gambar yang valid (JPG, PNG, dll)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file terlalu besar. Maksimal 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        if (result) {
          setSelectedFile(file);
          setImagePreview(result);
          setError(null);
        }
      } catch (error) {
        setError('Gagal memproses gambar. Silakan coba lagi.');
      }
    };
    reader.onerror = () => {
      setError('Gagal membaca file. Silakan coba lagi.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    // Prevent file drop while prediction is loading
    if (loading) {
      setError('Tunggu hingga analisis selesai sebelum mengunggah gambar baru.');
      return;
    }

    const files = event.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];

      if (!file.type.startsWith('image/')) {
        setError('Silakan pilih file gambar yang valid (JPG, PNG, dll)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('Ukuran file terlalu besar. Maksimal 10 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          if (result) {
            setSelectedFile(file);
            setImagePreview(result);
            setError(null);
          }
        } catch (error) {
          setError('Gagal memproses gambar. Silakan coba lagi.');
        }
      };
      reader.onerror = () => {
        setError('Gagal membaca file. Silakan coba lagi.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePredict = async () => {
    // Cek imagePreview dan selectedFile
    if (!imagePreview) {
      setError('Silakan pilih gambar terlebih dahulu.');
      return;
    }

    if (!selectedFile) {
      setError('Data file tidak ditemukan. Silakan upload ulang gambar.');
      return;
    }

    if (!model) {
      setError('Model AI belum sepenuhnya dimuat. Silakan tunggu beberapa saat.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create image element for prediction
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          const result = await predictImage(model, img);
          setPrediction(result);

          // Check if probability is high enough for validation
          if (result.probability > 0.5) {
            setCurrentStep('chart');
          } else {
            setError(
              `Probabilitas prediksi rendah (${formatProbability(result.probability)}). Coba dengan gambar yang lebih jelas atau dari sudut berbeda.`
            );
            setLoading(false);
          }
        } catch (err) {
          console.error('Prediction error:', err);
          setError('Terjadi kesalahan saat memprediksi gambar. Silakan coba lagi.');
          setLoading(false);
        }
      };

      img.onerror = () => {
        setError('Gagal memproses gambar. Silakan coba gambar lain.');
        setLoading(false);
      };

      img.src = imagePreview;
    } catch (err) {
      console.error('Error:', err);
      setError('Terjadi kesalahan yang tidak terduga.');
      setLoading(false);
    }
  };

  const handleValidationSubmit = (answers: UserAnswers) => {
    if (!prediction) {
      setError('Data prediksi tidak ditemukan');
      return;
    }

    const diseaseClass = prediction.class;
    const diseaseName = diseaseInfo[diseaseClass as keyof typeof diseaseInfo]?.name_id || diseaseClass;
    const aiProbability = prediction.probability;
    const userScore = calculateUserScore(answers);
    const finalScore = calculateFinalScore(aiProbability, userScore);

    const result: DiagnosisResultType = {
      diseaseClass,
      diseaseName,
      aiProbability,
      userScore,
      finalScore,
      diseaseInfo: diseaseInfo[diseaseClass as keyof typeof diseaseInfo],
    };

    setDiagnosisResult(result);
    setCurrentStep('result');
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setImagePreview(null);
    setPrediction(null);
    setDiagnosisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Leaf className="w-10 h-10 text-green-600" />
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
              Sistem Pakar Padi
            </h1>
            {/* <Zap className="w-10 h-10 text-yellow-500" /> */}
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Identifikasi Hama & Penyakit Tanaman Padi dengan Teknologi AI
          </p>
          {modelLoading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-blue-600 font-semibold">
              <Loader size={18} className="animate-spin" />
              <div>
                <p>Memuat Model AI...</p>
                <p className="text-xs text-slate-500 mt-1">(File ~40 MB, dapat memakan waktu beberapa detik)</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Progress Indicator */}
        {!modelLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            {['upload', 'chart', 'validation', 'result'].map((step, index) => (
              <React.Fragment key={step}>
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                    currentStep === step
                      ? 'bg-blue-600 text-white scale-110'
                      : ['upload', 'chart', 'validation']
                          .indexOf(step) < ['upload', 'chart', 'validation', 'result'].indexOf(currentStep)
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {['upload', 'chart', 'validation', 'result'].indexOf(step) <
                  ['upload', 'chart', 'validation', 'result'].indexOf(currentStep) ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 3 && (
                  <div
                    className={`h-1 w-12 transition-all ${
                      ['upload', 'chart', 'validation']
                        .indexOf(step) < ['upload', 'chart', 'validation', 'result'].indexOf(currentStep)
                        ? 'bg-green-500'
                        : 'bg-slate-300'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </motion.div>
        )}

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {modelLoading ? (
            <motion.div
              key="loading"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex justify-center items-center py-20"
            >
              <div className="text-center">
                <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-slate-700 font-semibold mb-2">Mempersiapkan Sistem Pakar...</p>
                <p className="text-slate-500 text-sm max-w-sm">
                  Model AI sedang di-unduh (~40 MB). Ini hanya terjadi sekali dan bisa memakan waktu 10-30 detik tergantung koneksi internet Anda.
                </p>
                {error && (
                  <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-lg max-w-sm">
                    {error}
                  </div>
                )}
              </div>
            </motion.div>
          ) : currentStep === 'upload' ? (
            <motion.div
              key="upload"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="max-w-2xl mx-auto">
                {/* Upload Area */}
                <motion.div
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !loading && fileInputRef.current?.click()}
                  className={`bg-white rounded-lg shadow-lg border-2 border-dashed border-blue-300 p-12 text-center cursor-pointer transition-all ${
                    loading
                      ? 'opacity-50 cursor-not-allowed border-slate-300'
                      : 'hover:border-blue-500 hover:shadow-xl'
                  }`}
                >
                  <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Unggah Foto Daun Padi</h2>
                  <p className="text-slate-600 mb-4">
                    Tarik dan lepas gambar di sini, atau klik untuk memilih dari perangkat Anda
                  </p>
                  <p className="text-sm text-slate-500">Format: JPG, PNG | Ukuran: Maksimal 10 MB</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Unggah foto daun padi"
                    title="Unggah foto daun padi"
                  />
                </motion.div>

                {/* Image Preview */}
                {imagePreview && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8"
                  >
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
                      <div className="aspect-square bg-slate-100 flex items-center justify-center p-4">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <p className="text-sm text-slate-600 mb-3">
                          File: {selectedFile?.name}
                        </p>
                        <button
                          onClick={() => !loading && fileInputRef.current?.click()}
                          disabled={loading}
                          className={`font-semibold text-sm ${
                            loading
                              ? 'text-slate-400 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-700'
                          }`}
                        >
                          Pilih Gambar Lain
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Predict Button */}
                {imagePreview && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handlePredict}
                    disabled={loading}
                    className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Menganalisis Gambar...
                      </>
                    ) : (
                      <>
                        <Zap size={20} />
                        Mulai Analisis AI
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </motion.div>
          ) : currentStep === 'chart' ? (
            <motion.div
              key="chart"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="max-w-4xl mx-auto space-y-8">
                {prediction && (
                  <>
                    {/* Diagnosis Header */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-lg shadow-lg p-8 border border-slate-200"
                    >
                      <div className="text-center mb-4">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                          {diseaseInfo[prediction.class as keyof typeof diseaseInfo]?.name_id}
                        </h2>
                        <p className="text-slate-600">
                          Prediksi: {formatProbability(prediction.probability)}
                        </p>
                      </div>

                      <p className="text-center text-slate-700">
                        {
                          diseaseInfo[prediction.class as keyof typeof diseaseInfo]
                            ?.description
                        }
                      </p>
                    </motion.div>

                    {/* Chart */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <DiagnosisChart predictions={prediction.allPredictions} />
                    </motion.div>

                    {/* Explanation */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-6"
                    >
                      <h3 className="font-bold text-blue-900 mb-2">Cara Berpikir Mesin:</h3>
                      <p className="text-blue-800 text-sm leading-relaxed">
                        Sistem AI menganalisis fitur visual dari gambar yang Anda unggah, termasuk tekstur, warna, bentuk, dan pola. Berdasarkan analisis ini, sistem memprediksi kemungkinan penyakit/hama dengan persentase probabilitas. Semakin tinggi persentase, semakin yakin sistem tentang prediksinya.
                      </p>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex gap-4"
                    >
                      <button
                        onClick={() => setCurrentStep('validation')}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all active:scale-95"
                      >
                        Lanjut ke Validasi
                      </button>
                      <button
                        onClick={handleReset}
                        className="flex-1 py-3 bg-slate-300 hover:bg-slate-400 text-slate-900 font-bold rounded-lg transition-all active:scale-95"
                      >
                        Mulai Ulang
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          ) : currentStep === 'validation' ? (
            <motion.div
              key="validation"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {prediction && (
                <Questionnaire
                  diseaseInfo={diseaseInfo[prediction.class as keyof typeof diseaseInfo]}
                  onSubmit={handleValidationSubmit}
                />
              )}
            </motion.div>
          ) : currentStep === 'result' ? (
            <motion.div
              key="result"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {diagnosisResult && (
                <DiagnosisResult result={diagnosisResult} onReset={handleReset} />
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 pt-8 border-t border-slate-300 text-center text-slate-600 text-sm"
        >
          <p>
            Sistem Pakar Identifikasi Hama & Penyakit Padi | Teknologi AI untuk Pertanian Berkelanjutan
          </p>
          <p className="mt-2 text-xs">
            Disclaimer: Hasil diagnosis ini bersifat informatif. Konsultasikan dengan ahli pertanian untuk keputusan penanganan final.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
