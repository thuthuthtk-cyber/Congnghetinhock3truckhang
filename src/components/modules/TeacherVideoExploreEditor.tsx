import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Eye, 
  Play, 
  Check, 
  HelpCircle, 
  Edit3, 
  X, 
  Lightbulb, 
  Image as ImageIcon, 
  Upload, 
  Wand2, 
  FileText, 
  CheckCircle2,
  Video,
  Layers
} from 'lucide-react';
import { VideoCheckpoint, InteractiveVideoPlayer } from './InteractiveVideoPlayer';
import { QuestionItem } from '../../types';
import { QuestionEditor } from '../shared/QuestionEditor';
import { getQuestionTypeLabel } from '../../lib/constants';
import { generateExploreSummaryAI } from '../../services/geminiService';
import { uploadToCloudinary } from '../../lib/cloudinary';

interface TeacherVideoExploreEditorProps {
  initialVideoUrl?: string;
  initialCheckpoints?: VideoCheckpoint[];
  initialCoreSummary?: string;
  initialSummaryImages?: string[];
  lessonTitle?: string;
  lessonSubject?: string;
  lessonGrade?: string;
  onSave?: (videoUrl: string, checkpoints: VideoCheckpoint[], coreSummary?: string, summaryImages?: string[]) => void;
  onCoreSummaryChange?: (summary: string) => void;
  onSummaryImagesChange?: (images: string[]) => void;
}

export const TeacherVideoExploreEditor: React.FC<TeacherVideoExploreEditorProps> = ({
  initialVideoUrl = 'https://www.youtube.com/watch?v=UF8o89k1g8g',
  initialCheckpoints = [],
  initialCoreSummary = 'Học sinh nắm vững các khái niệm trọng tâm, quan sát thí nghiệm mô phỏng và liên hệ thực tế.',
  initialSummaryImages = [],
  lessonTitle = '',
  lessonSubject = 'Khoa học',
  lessonGrade = 'Khối 3',
  onSave,
  onCoreSummaryChange,
  onSummaryImagesChange
}) => {
  // Sub-tab selection state
  const [subTab, setSubTab] = useState<'video_questions' | 'summary'>('video_questions');

  // Video & Checkpoints state (Tab 1)
  const [videoUrl, setVideoUrl] = useState<string>(initialVideoUrl);
  const [checkpoints, setCheckpoints] = useState<VideoCheckpoint[]>(initialCheckpoints);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);

  // Checkpoint timing state
  const [newTimestampMin, setNewTimestampMin] = useState<string>('0');
  const [newTimestampSec, setNewTimestampSec] = useState<string>('10');
  const [editingCpId, setEditingCpId] = useState<string | null>(null);

  // Dynamic Draft Question using standard QuestionItem schema
  const [draftQuestion, setDraftQuestion] = useState<Partial<QuestionItem>>({
    type: 'multiple_choice',
    content: '',
    options: ['', '', '', ''],
    correctAnswer: 'A',
    explanation: ''
  });

  // Core Summary & Images state (Tab 2)
  const [coreSummary, setCoreSummary] = useState<string>(initialCoreSummary);
  const [summaryImages, setSummaryImages] = useState<string[]>(initialSummaryImages);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);

  const resetDraft = () => {
    setEditingCpId(null);
    setDraftQuestion({
      type: 'multiple_choice',
      content: '',
      options: ['', '', '', ''],
      correctAnswer: 'A',
      explanation: ''
    });
  };

  const handleSaveCheckpoint = () => {
    if (!draftQuestion.content?.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi tại mốc dừng.');
      return;
    }

    const totalSeconds = (parseInt(newTimestampMin) || 0) * 60 + (parseInt(newTimestampSec) || 0);

    // Calculate correctIndex for multiple_choice compatibility
    let correctIdx = 0;
    if (draftQuestion.correctAnswer === 'B') correctIdx = 1;
    else if (draftQuestion.correctAnswer === 'C') correctIdx = 2;
    else if (draftQuestion.correctAnswer === 'D') correctIdx = 3;

    const cpData: VideoCheckpoint = {
      id: editingCpId || `cp-${Date.now()}`,
      timestamp: totalSeconds,
      type: draftQuestion.type || 'multiple_choice',
      questionText: draftQuestion.content || '',
      options: draftQuestion.options || ['', '', '', ''],
      correctIndex: correctIdx,
      correctAnswer: draftQuestion.correctAnswer || 'A',
      explanation: draftQuestion.explanation?.trim() || 'Giải thích chi tiết cho đáp án đúng.',
      matchingPairs: draftQuestion.matchingPairs,
      classificationGroups: draftQuestion.classificationGroups,
      classificationItems: draftQuestion.classificationItems,
      statements: draftQuestion.statements,
      question: {
        id: `q-cp-${Date.now()}`,
        code: `CH-EXPLORE-${Math.floor(100 + Math.random() * 900)}`,
        subject: lessonSubject || 'Khám phá',
        grade: lessonGrade || 'Khối 3',
        level: 'thong_hieu',
        type: (draftQuestion.type || 'multiple_choice') as any,
        content: draftQuestion.content || '',
        options: draftQuestion.options,
        correctAnswer: draftQuestion.correctAnswer,
        matchingPairs: draftQuestion.matchingPairs,
        classificationGroups: draftQuestion.classificationGroups,
        classificationItems: draftQuestion.classificationItems,
        statements: draftQuestion.statements,
        explanation: draftQuestion.explanation
      }
    };

    let updatedCheckpoints: VideoCheckpoint[];
    if (editingCpId) {
      updatedCheckpoints = checkpoints.map(cp => cp.id === editingCpId ? cpData : cp).sort((a, b) => a.timestamp - b.timestamp);
    } else {
      updatedCheckpoints = [...checkpoints, cpData].sort((a, b) => a.timestamp - b.timestamp);
      // Advance default time for next checkpoint
      const nextSec = (totalSeconds + 15) % 60;
      const nextMin = Math.floor((totalSeconds + 15) / 60);
      setNewTimestampMin(nextMin.toString());
      setNewTimestampSec(nextSec.toString());
    }

    setCheckpoints(updatedCheckpoints);
    resetDraft();
    if (onSave) {
      onSave(videoUrl, updatedCheckpoints, coreSummary, summaryImages);
    }
  };

  const handleEditCheckpoint = (cp: VideoCheckpoint) => {
    setEditingCpId(cp.id);
    setNewTimestampMin(Math.floor(cp.timestamp / 60).toString());
    setNewTimestampSec((cp.timestamp % 60).toString());
    setDraftQuestion({
      type: (cp.type || (cp.question?.type) || 'multiple_choice') as any,
      content: cp.questionText || cp.question?.content || '',
      options: cp.options || cp.question?.options || ['', '', '', ''],
      correctAnswer: cp.correctAnswer || cp.question?.correctAnswer || 'A',
      explanation: cp.explanation || cp.question?.explanation || '',
      matchingPairs: cp.matchingPairs || cp.question?.matchingPairs,
      classificationGroups: cp.classificationGroups || cp.question?.classificationGroups,
      classificationItems: cp.classificationItems || cp.question?.classificationItems,
      statements: cp.statements || cp.question?.statements
    });

    const formEl = document.getElementById('checkpoint-editor-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDeleteCheckpoint = (id: string) => {
    const updated = checkpoints.filter(cp => cp.id !== id);
    setCheckpoints(updated);
    if (editingCpId === id) {
      resetDraft();
    }
    if (onSave) {
      onSave(videoUrl, updated, coreSummary, summaryImages);
    }
  };

  const handleVideoUrlChange = (newUrl: string) => {
    setVideoUrl(newUrl);
    if (onSave) {
      onSave(newUrl, checkpoints, coreSummary, summaryImages);
    }
  };

  const handleCoreSummaryChange = (val: string) => {
    setCoreSummary(val);
    if (onCoreSummaryChange) {
      onCoreSummaryChange(val);
    }
    if (onSave) {
      onSave(videoUrl, checkpoints, val, summaryImages);
    }
  };

  const handleAddImageFromUrl = () => {
    if (!imageUrlInput.trim()) return;
    const updated = [...summaryImages, imageUrlInput.trim()];
    setSummaryImages(updated);
    setImageUrlInput('');
    if (onSummaryImagesChange) onSummaryImagesChange(updated);
    if (onSave) onSave(videoUrl, checkpoints, coreSummary, updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (const file of Array.from(files)) {
      try {
        const secureUrl = await uploadToCloudinary(file, 'auto');
        setSummaryImages(prev => {
          const updated = [...prev, secureUrl];
          if (onSummaryImagesChange) onSummaryImagesChange(updated);
          if (onSave) onSave(videoUrl, checkpoints, coreSummary, updated);
          return updated;
        });
      } catch (err: any) {
        alert(err.message || 'Không thể tải lên Cloudinary.');
      }
    }
    // Reset file input
    e.target.value = '';
  };

  const handleDeleteImage = (index: number) => {
    const updated = summaryImages.filter((_, idx) => idx !== index);
    setSummaryImages(updated);
    if (onSummaryImagesChange) onSummaryImagesChange(updated);
    if (onSave) onSave(videoUrl, checkpoints, coreSummary, updated);
  };

  const handleGenerateAiSummary = async () => {
    setIsAiGenerating(true);
    try {
      const generated = await generateExploreSummaryAI(
        lessonTitle || 'Bài học Khám phá',
        lessonSubject || 'Khoa học',
        lessonGrade || 'Khối 3',
        checkpoints
      );
      if (generated) {
        handleCoreSummaryChange(generated);
      }
    } catch (err) {
      console.error('Error generating AI summary:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KHỐI TIÊU ĐỀ CHUNG & NÚT XEM TRƯỚC (ÁP DỤNG CHO CẢ 2 TAB) */}
      <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-purple-400 uppercase tracking-wide">
            CẤU HÌNH VIDEO BÀI GIẢNG TƯƠNG TÁC (KHÁM PHÁ - EXPLORE)
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Thêm đường dẫn video và thiết lập các mốc câu hỏi dừng hình (hỗ trợ đầy đủ 8 dạng bài tương tác chuẩn modular).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPreviewing(!isPreviewing)}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0 ${
            isPreviewing 
              ? 'bg-amber-600 hover:bg-amber-500 text-white' 
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
          }`}
        >
          {isPreviewing ? <Play className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{isPreviewing ? 'Quay lại Soạn thảo' : 'Xem trước (Preview)'}</span>
        </button>
      </div>

      {/* THANH 2 TAB CON (STYLE PILL ĐỒNG BỘ VỚI VẬN DỤNG & ĐÁNH GIÁ) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-800 rounded-2xl border border-slate-700">
        <button
          type="button"
          onClick={() => setSubTab('video_questions')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'video_questions'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">1</span>
          <Video className="w-4 h-4" />
          <span>1. Video & Câu hỏi tương tác ({checkpoints.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('summary')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'summary'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">2</span>
          <Lightbulb className="w-4 h-4" />
          <span>2. Nội dung Ghi nhớ</span>
        </button>
      </div>

      {/* VIEW CHẾ ĐỘ XEM TRƯỚC (PREVIEW TOÀN BỘ TRẢI NGHIỆM VIDEO + MỐC DỪNG + GHI NHỚ) */}
      {isPreviewing ? (
        <div className="space-y-4">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>👁️ Chế độ xem trước (Trải nghiệm như học sinh khi xem video tương tác và cửa sổ ghi nhớ cuối cùng):</span>
          </div>
          <InteractiveVideoPlayer
            videoUrl={videoUrl}
            title={lessonTitle || 'Xem trước Video Tương Tác'}
            coreSummary={coreSummary}
            checkpoints={checkpoints}
            onComplete={() => setIsPreviewing(false)}
            onRestart={() => {}}
          />
        </div>
      ) : (
        <>
          {/* TAB 1: VIDEO & CÂU HỎI TƯƠNG TÁC */}
          {subTab === 'video_questions' && (
            <div className="space-y-6">
              {/* VIDEO URL INPUT */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  ĐƯỜNG DẪN VIDEO (YOUTUBE URL / FILE MP4)
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => handleVideoUrlChange(e.target.value)}
                  placeholder="Nhập link video (ví dụ: https://... hoặc file .mp4)..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              {/* CHECKPOINTS LIST */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">
                    DANH SÁCH MỐC DỪNG & CÂU HỎI TƯƠNG TÁC ({checkpoints.length} mốc)
                  </span>
                </div>

                <div className="space-y-3">
                  {checkpoints.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-center text-xs text-slate-400 italic">
                      Chưa có mốc câu hỏi nào được thêm. Hãy soạn mốc dừng và câu hỏi bên dưới.
                    </div>
                  ) : (
                    checkpoints.map((cp, idx) => (
                      <div key={cp.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-extrabold font-mono">
                              ⏱️ Mốc: {Math.floor(cp.timestamp / 60)} phút {cp.timestamp % 60} giây
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                              Dạng: {getQuestionTypeLabel(cp.type || 'multiple_choice')}
                            </span>
                            <span className="text-xs font-bold text-slate-200">
                              Câu {idx + 1}: {cp.questionText}
                            </span>
                          </div>

                          {/* Display summary based on question type */}
                          {(!cp.type || cp.type === 'multiple_choice' || cp.type === 'multiple_response') && cp.options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                              {cp.options.map((opt, optIdx) => {
                                const isCorrect = (cp.correctAnswer && cp.correctAnswer.includes(String.fromCharCode(65 + optIdx))) || optIdx === cp.correctIndex;
                                return (
                                  <div 
                                    key={optIdx} 
                                    className={`text-[11px] p-2 rounded-xl border flex items-center gap-2 ${
                                      isCorrect 
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold' 
                                        : 'bg-slate-900/60 text-slate-300 border-slate-800'
                                    }`}
                                  >
                                    <span className="w-5 h-5 rounded-md bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="truncate">{opt}</span>
                                    {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {cp.type === 'ordering' && cp.options && (
                            <div className="space-y-1.5 pl-2">
                              {cp.options.map((opt, optIdx) => (
                                <div key={optIdx} className="text-[11px] p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {optIdx + 1}
                                  </span>
                                  <span>{opt}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {cp.type === 'true_false' && cp.statements && (
                            <div className="space-y-1.5 pl-2">
                              {cp.statements.map((stmt, sIdx) => (
                                <div key={sIdx} className="text-[11px] p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 flex items-center justify-between gap-2">
                                  <span>{stmt.statement}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${stmt.isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                    {stmt.isCorrect ? 'ĐÚNG' : 'SAI'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {cp.type === 'matching' && cp.matchingPairs && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                              {cp.matchingPairs.map((p, pIdx) => (
                                <div key={pIdx} className="text-[11px] p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 flex items-center justify-between gap-2">
                                  <span className="font-semibold text-indigo-300">{p.left}</span>
                                  <span className="text-slate-500">↔</span>
                                  <span className="text-emerald-300">{p.right}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {cp.type === 'classification' && cp.classificationGroups && cp.classificationItems && (
                            <div className="space-y-1.5 pl-2 text-[11px] text-slate-300">
                              <div className="font-bold text-indigo-300">Nhóm: {cp.classificationGroups.join(', ')}</div>
                              <div className="flex flex-wrap gap-1.5">
                                {cp.classificationItems.map((ci, ciIdx) => (
                                  <span key={ciIdx} className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
                                    {ci.name} → <span className="text-indigo-400 font-bold">{ci.group}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {cp.type === 'fill_blank' && (
                            <div className="text-[11px] text-slate-300 pl-2">
                              <span className="text-amber-400 font-bold">Đáp án chuẩn:</span> {cp.correctAnswer}
                            </div>
                          )}

                          {cp.type === 'essay' && (
                            <div className="text-[11px] text-slate-300 pl-2 italic">
                              <span className="text-indigo-400 font-bold">Gợi ý chấm tự luận:</span> {cp.correctAnswer || 'Học sinh trình bày tự do'}
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400 pl-2 italic">
                            💡 Giải thích: {cp.explanation}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditCheckpoint(cp)}
                            className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-all cursor-pointer"
                            title="Chỉnh sửa mốc này"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCheckpoint(cp.id)}
                            className="p-2 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all cursor-pointer"
                            title="Xóa mốc này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ADD / EDIT CHECKPOINT FORM USING QUESTIONEDITOR */}
              <div id="checkpoint-editor-form" className="p-5 rounded-3xl bg-slate-900/90 border border-purple-500/30 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                      {editingCpId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                    <h4 className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">
                      {editingCpId ? 'CHỈNH SỬA MỐC DỪNG & CÂU HỎI' : 'THÊM MỐC DỪNG & CÂU HỎI MỚI'}
                    </h4>
                  </div>

                  {/* TIMING CONFIGURATION */}
                  <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      ⏱️ Thời điểm dừng:
                    </label>
                    <div className="flex items-center gap-1.5 font-mono">
                      <input
                        type="number"
                        min={0}
                        value={newTimestampMin}
                        onChange={(e) => setNewTimestampMin(e.target.value)}
                        className="w-14 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white text-center font-bold focus:outline-none focus:border-purple-500"
                        placeholder="Phút"
                      />
                      <span className="text-slate-400 font-bold">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={newTimestampSec}
                        onChange={(e) => setNewTimestampSec(e.target.value)}
                        className="w-14 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white text-center font-bold focus:outline-none focus:border-purple-500"
                        placeholder="Giây"
                      />
                      <span className="text-xs text-purple-300 font-semibold pl-1">
                        ({(parseInt(newTimestampMin) || 0) * 60 + (parseInt(newTimestampSec) || 0)}s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* DYNAMIC QUESTION EDITOR (8 QUESTION TYPES) */}
                <div className="text-slate-900">
                  <QuestionEditor
                    key={editingCpId || draftQuestion.id || 'new-cp'}
                    question={draftQuestion}
                    index={editingCpId ? checkpoints.findIndex(cp => cp.id === editingCpId) : checkpoints.length}
                    onChange={(updated) => setDraftQuestion(prev => ({ ...prev, ...updated }))}
                    onDelete={resetDraft}
                    hideImageSection={true}
                  />
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  {editingCpId && (
                    <button
                      type="button"
                      onClick={resetDraft}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      <span>Hủy chỉnh sửa</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveCheckpoint}
                    disabled={!draftQuestion.content?.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingCpId ? 'Lưu Cập Nhật Mốc Dừng' : 'Thêm Mốc Dừng Này'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NỘI DUNG GHI NHỚ */}
          {subTab === 'summary' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-4 p-5 rounded-3xl bg-slate-800/80 border border-slate-700">
                {/* HEADER & AI ASSIST BUTTON */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                      <Lightbulb className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">
                        📌 NỘI DUNG GHI NHỚ BÀI HỌC (CORE SUMMARY)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Nội dung tổng hợp kiến thức trọng tâm hiển thị sau khi học sinh xem xong video và hoàn thành câu hỏi.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateAiSummary}
                    disabled={isAiGenerating}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Wand2 className={`w-4 h-4 ${isAiGenerating ? 'animate-spin' : ''}`} />
                    <span>{isAiGenerating ? 'AI đang tổng hợp...' : '✨ AI Hỗ trợ tổng hợp ghi nhớ'}</span>
                  </button>
                </div>

                {/* TEXTAREA FOR CORE SUMMARY */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Văn bản tóm tắt nội dung ghi nhớ (Hỗ trợ định dạng dòng & gạch đầu dòng):
                  </label>
                  <textarea
                    rows={6}
                    value={coreSummary}
                    onChange={(e) => handleCoreSummaryChange(e.target.value)}
                    className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl text-xs text-white leading-relaxed focus:outline-none focus:border-purple-500 font-sans"
                    placeholder="Nhập nội dung tóm tắt kiến thức trọng tâm mà học sinh cần ghi nhớ sau video bài giảng..."
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>💡 Gợi ý: Sử dụng các ý gạch đầu dòng rõ ràng để học sinh dễ dàng ôn tập và khắc sâu kiến thức.</span>
                    <span>{coreSummary.length} ký tự</span>
                  </div>
                </div>

                {/* IMAGE ATTACHMENT SECTION */}
                <div className="space-y-3 pt-2 border-t border-slate-700/80">
                  <label className="block text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-400" />
                    <span>Hình ảnh / Sơ đồ tư duy minh họa ghi nhớ (Tùy chọn):</span>
                  </label>

                  {/* INPUT & UPLOAD BAR */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImageFromUrl();
                        }
                      }}
                      placeholder="Dán đường dẫn URL hình ảnh (ví dụ: https://...)..."
                      className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    
                    <button
                      type="button"
                      onClick={handleAddImageFromUrl}
                      disabled={!imageUrlInput.trim()}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm link ảnh</span>
                    </button>

                    <label className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-600">
                      <Upload className="w-4 h-4 text-purple-300" />
                      <span>Tải ảnh lên</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* IMAGES PREVIEW LIST */}
                  {summaryImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                      {summaryImages.map((imgUrl, imgIdx) => (
                        <div key={imgIdx} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-video flex items-center justify-center">
                          <img
                            src={imgUrl}
                            alt={`Ghi nhớ ${imgIdx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // fallback if image fails to load
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(imgIdx)}
                              className="p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-all cursor-pointer shadow-md"
                              title="Xóa ảnh này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* LIVE PREVIEW BOX FOR STUDENTS */}
                <div className="pt-2 border-t border-slate-700/80 space-y-2">
                  <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider block">
                    👁️ Khung hiển thị mô phỏng khi học sinh hoàn thành:
                  </span>
                  <div className="bg-indigo-950/70 border border-indigo-500/30 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-300 uppercase tracking-wider">
                      <Lightbulb className="w-4 h-4 text-amber-300" /> 📌 Ghi nhớ nội dung Khám phá
                    </div>
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                      {coreSummary || '(Chưa có nội dung ghi nhớ)'}
                    </div>

                    {summaryImages.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {summaryImages.map((img, idx) => (
                          <div key={idx} className="rounded-xl overflow-hidden border border-indigo-500/30">
                            <img 
                              src={img} 
                              alt="Minh họa ghi nhớ" 
                              referrerPolicy="no-referrer"
                              className="w-full max-h-48 object-cover rounded-lg" 
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
