import { SUBJECTS, GRADES, CLASSES_BY_GRADE, ALL_CLASSES } from '../../lib/constants';
import { useClassesList } from '../../services/classStorageService';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Gamepad2,
  Bell,
  Zap,
  Disc,
  Layers,
  Play,
  RotateCw,
  Trophy,
  CheckCircle2,
  X,
  CheckCircle,
  Plus,
  ArrowLeft,
  Sparkles,
  Award,
  RefreshCw,
  Clock,
  UserCheck,
  HelpCircle,
  Filter,
  Users,
  BookOpen,
  Search,
  Activity,
  Pencil,
  Trash2,
  Laptop,
  Link2,
  ChevronDown,
  Check,
  ArrowRight,
  Share2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { GameItem, GameType, UserRole, QuizziGameItem } from '../../types';
import { getStudentGameProfile } from '../../services/studentGameStoreService';

import { StudentGameStoreTab } from './StudentGameStoreTab';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { awardArenaReward, calculateArenaReward, hasClaimedReward } from '../../config/rewardConfig';
import { QuizziGameModal } from './QuizziGameModal';
import { PaginationControl } from '../common/PaginationControl';
import {
  getLocalCachedQuizziGames,
  saveMultipleQuizziGamesToFirestore,
  deleteQuizziGameFromFirestore,
  subscribeToQuizziGamesFromFirestore
} from '../../services/gameStorageService';
import {
  getEffectiveStudentClassAndGrade,
  isTargetingStudent
} from '../../services/studentSessionService';
import { auth } from '../../services/firebase';
import { resolveCurrentTeacherProfile } from '../../services/teacherStorageService';

interface InteractiveGamesModuleProps {
  games: GameItem[];
  userRole: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  initialTab?: 'games' | 'store';
  onOpenUseQuestionBankModal?: () => void;
  onOpenEditGameRoom?: (game: GameItem) => void;
  onDeleteGame?: (id: string) => void;
  onUpdateGame?: (game: GameItem) => void;
  soundEnabled?: boolean;
}

export const InteractiveGamesModule: React.FC<InteractiveGamesModuleProps> = ({
  games,
  userRole,
  currentUserId = 'u-4',
  currentUserName = 'Lê Minh Anh',
  initialTab = 'games',
  onOpenUseQuestionBankModal,
  onOpenEditGameRoom,
  onDeleteGame,
  onUpdateGame,
  soundEnabled = true
}) => {
  const { getClassesForGrade } = useClassesList();
  const authEmail = (typeof window !== 'undefined' ? (auth?.currentUser?.email || localStorage.getItem('eduplay_teacher_email')) : null);
  const activeTeacherProfile = useMemo(() => resolveCurrentTeacherProfile(authEmail), [authEmail]);
  const isAdmin = userRole === 'admin' || activeTeacherProfile.userRole === 'admin' || (activeTeacherProfile.role || '').toLowerCase().includes('admin');

  const isRoomOwner = useCallback((room: GameItem): boolean => {
    if (isAdmin) return true;
    const currentId = activeTeacherProfile.id; // e.g. 'gv-06', 'gv-12'
    if (room.teacherId && room.teacherId === currentId) return true;
    if (room.createdBy && room.createdBy === currentId) return true;
    return false;
  }, [isAdmin, activeTeacherProfile.id]);

  const isQuizziOwner = useCallback((game: QuizziGameItem): boolean => {
    if (isAdmin) return true;
    const currentId = activeTeacherProfile.id; // e.g. 'gv-06', 'gv-12'
    if (game.teacherId && game.teacherId === currentId) return true;
    if (game.createdBy && game.createdBy === currentId) return true;
    return false;
  }, [isAdmin, activeTeacherProfile.id]);

  const [activeGame, setActiveGame] = useState<GameItem | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'store'>(initialTab);
  const [gameMode, setGameMode] = useState<'lobby' | 'countdown' | 'playing' | 'result'>('lobby');
  const [countdownStep, setCountdownStep] = useState<number | null>(null);
  const [motivationalQuote, setMotivationalQuote] = useState('');
  const [achievedRank, setAchievedRank] = useState<number | 'unranked' | null>(null);
  const [isRewardAlreadyClaimed, setIsRewardAlreadyClaimed] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [embeddedGameUrl, setEmbeddedGameUrl] = useState<string | null>(null);
  const [embeddedGameTitle, setEmbeddedGameTitle] = useState<string>('');
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync initialTab when prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Tự động chuẩn hóa dữ liệu cũ (backward compatibility):
  // Nếu có phòng trò chơi mang danh sách nhiều lớp (vd: "Lớp 3A, Lớp 3B"), tự động tách thành các phòng riêng biệt
  useEffect(() => {
    if (!onUpdateGame) return;
    const legacyGames = (games || []).filter(g => g.classInfo && g.classInfo.includes(','));
    if (legacyGames.length > 0) {
      legacyGames.forEach(game => {
        const classes = game.classInfo!.split(',').map(c => c.trim()).filter(Boolean);
        if (classes.length > 0) {
          const rootId = game.originalGameId || game.id.replace(/-class-.*$/, '');
          onUpdateGame({
            ...game,
            classInfo: classes[0],
            originalGameId: rootId,
          });
          classes.slice(1).forEach((cls, idx) => {
            onUpdateGame({
              ...game,
              id: `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`,
              classInfo: cls,
              originalGameId: rootId,
              playersCount: 0,
            });
          });
        }
      });
    }
  }, [games, onUpdateGame]);

  // Chuẩn hóa danh sách game: Mỗi dòng đại diện cho 1 phòng độc lập của 1 lớp duy nhất (Mô hình 1 đề - N lần giao)
  const normalizedGames = useMemo(() => {
    const list: GameItem[] = [];
    (games || []).forEach(game => {
      if (game.classInfo && game.classInfo.includes(',')) {
        const classes = game.classInfo.split(',').map(c => c.trim()).filter(Boolean);
        if (classes.length > 0) {
          classes.forEach((cls, idx) => {
            const rootId = game.originalGameId || game.id.replace(/-class-.*$/, '');
            list.push({
              ...game,
              id: idx === 0 ? game.id : `${rootId}-class-${cls.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`,
              classInfo: cls,
              originalGameId: rootId,
            });
          });
        } else {
          list.push(game);
        }
      } else {
        list.push(game);
      }
    });
    return list;
  }, [games]);

  // Listen for external open game store triggers
  useEffect(() => {
    const handleOpenStore = () => {
      setActiveTab('store');
      setGameMode('lobby');
      setActiveGame(null);
    };

    window.addEventListener('eduplay_open_game_store', handleOpenStore);
    return () => {
      window.removeEventListener('eduplay_open_game_store', handleOpenStore);
    };
  }, []);

  const MOTIVATIONAL_QUOTES = [
    "Sẵn sàng chưa nào! 🚀",
    "Tập trung nhé, cố lên! 💪",
    "Đọc kỹ câu hỏi trước khi chọn nhé! 📖",
    "Chúc em thi đấu tốt! ⭐"
  ];

  useEffect(() => {
    if (gameMode !== 'countdown') return;

    if (countdownStep !== null && countdownStep > 0) {
      if (soundEnabled) {
        try {
          const windowAudio = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (windowAudio) {
            const ctx = new windowAudio();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
          }
        } catch (e) {}
      }

      const timer = setTimeout(() => {
        setCountdownStep(countdownStep - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdownStep === 0) {
      if (soundEnabled) {
        try {
          const windowAudio = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (windowAudio) {
            const ctx = new windowAudio();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
          }
        } catch (e) {}
      }

      const timer = setTimeout(() => {
        setGameMode('playing');
        setCountdownStep(null);
        if (activeGame && activeGame.isTimeLimited !== false) {
          setTimerSeconds(activeGame.type === 'speed_quiz' ? 10 : 15);
          setIsTimerRunning(true);
        } else {
          setIsTimerRunning(false);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameMode, countdownStep, activeGame, soundEnabled]);
  const [showCreateQuizziModal, setShowCreateQuizziModal] = useState(false);
  const [editingQuizziGame, setEditingQuizziGame] = useState<QuizziGameItem | null>(null);
  const [deletedCards, setDeletedCards] = useState<(number | string)[]>([]);
  const [gameToDelete, setGameToDelete] = useState<{ id: number | string; title: string } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Filter States
  const [filterGrade, setFilterGrade] = useState('Tất cả các khối');
  const [filterClass, setFilterClass] = useState('Tất cả các lớp');
  const [filterSubject, setFilterSubject] = useState('Tất cả các môn');
  const [filterType, setFilterType] = useState('Tất cả Loại');

  // Student Filter States
  const [studentRoomSubjectFilter, setStudentRoomSubjectFilter] = useState('Tất cả các môn');
  const [studentQuizSubjectFilter, setStudentQuizSubjectFilter] = useState('Tất cả các môn');
  const [studentQuizSearchQuery, setStudentQuizSearchQuery] = useState('');

  // Pagination States
  const [gamesCurrentPage, setGamesCurrentPage] = useState<number>(1);
  const [gamesPageSize, setGamesPageSize] = useState<number>(10);

  const [roomsCurrentPage, setRoomsCurrentPage] = useState<number>(1);
  const [roomsPageSize, setRoomsPageSize] = useState<number>(10);

  const [studentQuizCurrentPage, setStudentQuizCurrentPage] = useState<number>(1);
  const [studentQuizPageSize, setStudentQuizPageSize] = useState<number>(10);

  const [studentRoomsCurrentPage, setStudentRoomsCurrentPage] = useState<number>(1);
  const [studentRoomsPageSize, setStudentRoomsPageSize] = useState<number>(10);

  // Reset pagination on filter changes
  useEffect(() => {
    setGamesCurrentPage(1);
    setRoomsCurrentPage(1);
  }, [filterGrade, filterClass, filterSubject, filterType]);

  useEffect(() => {
    setStudentQuizCurrentPage(1);
  }, [studentQuizSubjectFilter, studentQuizSearchQuery]);

  useEffect(() => {
    setStudentRoomsCurrentPage(1);
  }, [studentRoomSubjectFilter]);

  const [quizziGames, setQuizziGames] = useState<QuizziGameItem[]>(() => getLocalCachedQuizziGames());

  // Lắng nghe dữ liệu Quizzi thời gian thực từ Cloud Firestore
  useEffect(() => {
    const unsubscribe = subscribeToQuizziGamesFromFirestore((updatedGames) => {
      setQuizziGames(updatedGames || []);
    });
    return () => unsubscribe();
  }, []);

  const normalizedQuizziGames = useMemo(() => {
    const seenIds = new Set<string>();
    const list: QuizziGameItem[] = [];

    quizziGames.forEach(game => {
      const gId = String(game.id);
      if (!seenIds.has(gId)) {
        seenIds.add(gId);
        list.push(game);
      }
    });
    return list;
  }, [quizziGames]);

  // Thống kê 4 ô cho Đấu trường tri thức / Trò chơi học tập
  const studentGameStats = useMemo(() => {
    const { studentClass, studentGrade, studentName } = getEffectiveStudentClassAndGrade();
    const customRooms = normalizedGames.filter(g => g.id !== 'game-1' && g.id !== 'game-2' && g.id !== 'game-3' && g.id !== 'game-4');
    const studentRooms = customRooms.filter(room => {
      return isTargetingStudent(room.classInfo, room.grade, studentClass, studentGrade);
    });

    const filteredQuizzi = normalizedQuizziGames.filter(q => {
      if (deletedCards.includes(q.id)) return false;
      return isTargetingStudent(q.classInfo, q.grade, studentClass, studentGrade);
    });

    const profile = getStudentGameProfile(currentUserId, currentUserName || studentName);
    const userExp = profile.currentExp || 0;
    const level = profile.level || (Math.floor(userExp / 100) + 1);

    return {
      totalRooms: studentRooms.length,
      totalQuizzi: filteredQuizzi.length,
      coins: profile.coins || 0,
      levelStr: `Cấp ${level} (${userExp} EXP)`,
    };
  }, [normalizedGames, normalizedQuizziGames, deletedCards, currentUserId, currentUserName]);

  const filteredGames = normalizedQuizziGames.filter(g => {
    if (filterGrade !== 'Tất cả các khối' && g.grade !== filterGrade) return false;
    if (filterClass !== 'Tất cả các lớp' && g.classInfo !== filterClass) return false;
    if (filterSubject !== 'Tất cả các môn' && g.subjectLabel !== filterSubject && g.subject !== filterSubject) return false;
    if (filterType !== 'Tất cả Loại' && g.type !== filterType) return false;
    return true;
  });

  const handleDeleteCard = async (id: number | string) => {
    try {
      await deleteQuizziGameFromFirestore(id);
      setQuizziGames(prev => prev.filter(g => String(g.id) !== String(id)));
      setDeletedCards(prev => [...prev, id]);
      setToastMessage("🗑️ Đã xóa trò chơi thành công");
    } catch (e) {
      console.error("Lỗi xóa card:", e);
      setToastMessage("❌ Lỗi khi xóa trò chơi");
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveQuizziGames = async (newGames: QuizziGameItem[]) => {
    try {
      if (editingQuizziGame) {
        const rootId = editingQuizziGame.originalGameId || String(editingQuizziGame.id).replace(/-class-.*$/, '');
        // Xóa các document cũ không còn thuộc danh sách mới
        const oldMatches = quizziGames.filter(g => {
          const gRoot = g.originalGameId || String(g.id).replace(/-class-.*$/, '');
          return gRoot === rootId || g.id === editingQuizziGame.id;
        });
        for (const old of oldMatches) {
          if (!newGames.some(ng => String(ng.id) === String(old.id))) {
            await deleteQuizziGameFromFirestore(old.id);
          }
        }
        await saveMultipleQuizziGamesToFirestore(newGames);
        setQuizziGames(prev => {
          const withoutOld = prev.filter(g => {
            const gRoot = g.originalGameId || String(g.id).replace(/-class-.*$/, '');
            return gRoot !== rootId && g.id !== editingQuizziGame.id;
          });
          const newIds = new Set(newGames.map(g => String(g.id)));
          const cleanPrev = withoutOld.filter(g => !newIds.has(String(g.id)));
          return [...newGames, ...cleanPrev];
        });
        showToast(`Đã cập nhật và lưu ${newGames.length} trò chơi Quizzi lên Cloud Firestore!`, "success");
      } else {
        await saveMultipleQuizziGamesToFirestore(newGames);
        setQuizziGames(prev => {
          const newIds = new Set(newGames.map(g => String(g.id)));
          const cleanPrev = prev.filter(g => !newIds.has(String(g.id)));
          return [...newGames, ...cleanPrev];
        });
        showToast(`Đã tạo thành công và lưu ${newGames.length} trò chơi Quizzi lên Cloud Firestore!`, "success");
      }
    } catch (error) {
      console.error("❌ Lỗi khi ghi nhận Quizzi lên Firestore:", error);
      showToast("Có lỗi khi lưu lên Cloud Firestore!", "error");
      throw error;
    } finally {
      setEditingQuizziGame(null);
      setShowCreateQuizziModal(false);
    }
  };


  // Leaderboard modal state
  const [selectedLeaderboardGame, setSelectedLeaderboardGame] = useState<GameItem | null>(null);

  // Delete confirmation modal state
  const [roomToDelete, setRoomToDelete] = useState<GameItem | null>(null);

  // Golden Bell & Speed Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [matchingAnswers, setMatchingAnswers] = useState<Record<number, string>>({});
  const [gameAnswers, setGameAnswers] = useState<Record<number, any>>({});

  useEffect(() => {
    setMatchingAnswers({});
    setGameAnswers(prev => ({ ...prev, [currentQuestionIndex]: prev[currentQuestionIndex] || {} }));
  }, [currentQuestionIndex]);

  // Flashcard State
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // Lucky Wheel State
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelWinner, setWheelWinner] = useState<string | null>(null);
  const luckyStudentList = [
    'Lê Minh Anh',
    'Phạm Đức Bảo',
    'Nguyễn Thảo Nhi',
    'Hoàng Quốc Việt',
    'Đặng Hoàng Yến',
    'Bùi Tiến Dũng',
    'Vũ Thị Hoa'
  ];

  // Timer Effect for Golden Bell & Speed Quiz
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      handleTimeUp();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleStartGame = (game: GameItem) => {
    setActiveGame(game);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedOption(null);
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setMotivationalQuote(randomQuote);
    setCountdownStep(3);
    setGameMode('countdown');
  };

  const finishGameAndAward = (finalScore: number) => {
    if (!activeGame) return;
    setGameMode('result');
    if (finalScore > 0) {
      triggerConfetti();
    }

    const totalPossible = (activeGame.questions.length || 1) * 100;
    const ratio = totalPossible > 0 ? finalScore / totalPossible : 0;
    let rank: number | 'unranked' = 'unranked';
    if (ratio >= 0.85) rank = 1;
    else if (ratio >= 0.65) rank = 2;
    else if (ratio >= 0.45) rank = 3;
    else rank = 'unranked';

    setAchievedRank(rank);

    const isClaimedAlready = hasClaimedReward(currentUserId, 'arena', activeGame.id);
    setIsRewardAlreadyClaimed(isClaimedAlready);

    if (!isClaimedAlready) {
      awardArenaReward(currentUserId, activeGame.id, activeGame.title || 'Đấu Trường', rank);
    }
  };

  const handleTimeUp = () => {
    // Automatically move to next question or end
    if (!activeGame) return;
    if (currentQuestionIndex + 1 < activeGame.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setTimerSeconds(activeGame.type === 'speed_quiz' ? 10 : 15);
      setIsTimerRunning(true);
    } else {
      finishGameAndAward(score);
    }
  };

  const isMatchingQuestion = (q: any): boolean => {
    if (!q) return false;
    if (q.statements && Array.isArray(q.statements) && q.statements.length > 0) {
      return false;
    }
    const typeStr = (q.type || '').trim().toLowerCase();
    const contentStr = (q.content || q.question || '').trim().toLowerCase();
    if (typeStr === 'matching' || typeStr === 'noi_cap' || typeStr === 'ghep_noi' || typeStr === 'ghép nối' || typeStr === 'nối cặp' || typeStr === 'nối cặp / kéo thả' || typeStr === 'kéo thả' || typeStr.includes('ghép') || typeStr.includes('nối')) {
      return true;
    }
    if (q.matchingPairs && Array.isArray(q.matchingPairs) && q.matchingPairs.length > 0) {
      return true;
    }
    if (contentStr.includes('ghép nối') || contentStr.includes('nối cặp') || (contentStr.includes('cột a') && contentStr.includes('cột b'))) {
      return true;
    }
    return false;
  };

  const isEssayQuestion = (q: any): boolean => {
    if (!q) return false;
    const typeStr = (q.type || '').trim().toLowerCase();
    return typeStr.includes('essay') || typeStr.includes('tu_luan') || typeStr.includes('tự luận');
  };

  const isTrueFalseQuestion = (q: any): boolean => {
    if (!q) return false;
    const typeStr = (q.type || '').trim().toLowerCase();
    const contentStr = (q.content || q.question || '').trim().toLowerCase();
    return typeStr.includes('true_false') || typeStr.includes('dung_sai') || typeStr.includes('đúng/sai') || typeStr.includes('đúng sai') || contentStr.includes('đúng hoặc sai') || (q.statements && Array.isArray(q.statements) && q.statements.length > 0);
  };

  const isMultipleResponseQuestion = (q: any): boolean => {
    if (!q) return false;
    const typeStr = (q.type || '').trim().toLowerCase();
    const contentStr = (q.content || q.question || '').trim().toLowerCase();
    return typeStr.includes('multiple_response') || typeStr.includes('multi_choice') || typeStr.includes('nhiều đáp án') || contentStr.includes('nhiều đáp án');
  };

  const isFillBlankQuestion = (q: any): boolean => {
    if (!q) return false;
    const typeStr = (q.type || '').trim().toLowerCase();
    return typeStr.includes('fill_blank') || typeStr.includes('dien_khuyet') || typeStr.includes('điền khuyết');
  };

  const isOrderingQuestion = (q: any): boolean => {
    if (!q) return false;
    const typeStr = (q.type || '').trim().toLowerCase();
    const contentStr = (q.content || q.question || '').trim().toLowerCase();
    return typeStr.includes('ordering') || typeStr.includes('sap_xep') || typeStr.includes('sắp xếp') || contentStr.includes('sắp xếp');
  };

  const isClassificationQuestion = (q: any): boolean => {
    if (!q) return false;
    const typeStr = (q.type || '').trim().toLowerCase();
    const contentStr = (q.content || q.question || '').trim().toLowerCase();
    return typeStr.includes('classification') || typeStr.includes('phan_loai') || typeStr.includes('phân loại') || contentStr.includes('phân loại') || (q.classificationItems && q.classificationItems.length > 0);
  };

  const isMultipleChoiceQuestion = (q: any): boolean => {
    if (!q) return false;
    if (isMatchingQuestion(q) || isClassificationQuestion(q) || isOrderingQuestion(q) || isTrueFalseQuestion(q) || isMultipleResponseQuestion(q) || isEssayQuestion(q) || isFillBlankQuestion(q)) {
      return false;
    }
    const typeStr = (q.type || '').trim().toLowerCase();
    if (typeStr === 'multiple_choice' || typeStr === 'single_choice' || typeStr === 'trắc nghiệm đơn' || typeStr === 'trắc nghiệm' || typeStr.includes('trắc nghiệm')) {
      return true;
    }
    if (q.options && q.options.length > 0) {
      return true;
    }
    return false;
  };

  const checkQuestionCorrectLocal = (qi: any, choice: any) => {
    if (!qi) return false;
    if (isMatchingQuestion(qi)) {
      const studentPairs = (typeof choice === 'object' && choice !== null) ? choice : {};
      const pairs = qi.matchingPairs || [];
      if (pairs.length === 0) return false;
      return pairs.every((pair: any, pIdx: number) => {
        const studentSelected = studentPairs[pIdx] !== undefined ? studentPairs[pIdx] : studentPairs[pair.left];
        if (studentSelected === undefined || studentSelected === null || studentSelected === '') return false;
        const correctRightStr = String(pair.right || '').trim().toLowerCase();
        if (String(studentSelected).trim().toLowerCase() === correctRightStr) return true;
        if (typeof studentSelected === 'number') {
          if (studentSelected === pIdx) return true;
          if (pairs[studentSelected] && String(pairs[studentSelected].right || '').trim().toLowerCase() === correctRightStr) return true;
        }
        const rightPrefixMatch = correctRightStr.match(/^([a-z0-9])[\.\:\)\-]/i);
        if (rightPrefixMatch && String(studentSelected).trim().toLowerCase() === rightPrefixMatch[1].toLowerCase()) return true;
        return false;
      });
    }
    if (isOrderingQuestion(qi)) {
      const studentOrder = choice || [];
      const correctOrder = qi.options || [];
      if (!Array.isArray(studentOrder) || studentOrder.length !== correctOrder.length) return false;
      return studentOrder.every((item: any, i: number) => String(item).trim() === String(correctOrder[i]).trim());
    }
    if (isClassificationQuestion(qi)) {
      const studentAnswers = choice || {};
      const items = qi.classificationItems || [];
      if (items.length === 0) return false;
      return items.every((item: any, iIdx: number) => {
        const studentSelectedGroup = studentAnswers[iIdx];
        return studentSelectedGroup === item.group;
      });
    }
    if (isTrueFalseQuestion(qi)) {
      if (qi.statements && qi.statements.length > 0) {
        const studentStmts = choice || {};
        return qi.statements.every((st: any, sIdx: number) => studentStmts[sIdx] === st.isCorrect);
      }
      const sChoice = choice as number;
      const sLetter = sChoice !== undefined && typeof sChoice === 'number' ? String.fromCharCode(65 + sChoice) : '';
      const isCorrectAnswerTrue = qi.correctAnswer === 'A' || qi.correctAnswer?.toLowerCase().includes('đúng') || qi.correctAnswer === 'true' || (qi.correctAnswer as any) === true;
      const studentSelectedTrue = sLetter === 'A' || sChoice === 0 || String(choice).toLowerCase().includes('đúng') || (choice as any) === true;
      return isCorrectAnswerTrue === studentSelectedTrue;
    }
    if (isMultipleResponseQuestion(qi)) {
      const studentArr = Array.isArray(choice) ? choice.sort((a: number, b: number) => a - b) : [];
      const correctArr = qi.options ? qi.options.map((opt: string, idx: number) => (opt.startsWith('✓') || opt.includes('(Đúng)') || (qi.correctAnswer && qi.correctAnswer.includes(String.fromCharCode(65 + idx)))) ? idx : -1).filter((idx: number) => idx !== -1) : [];
      if (correctArr.length === 0) {
        return true;
      }
      if (studentArr.length !== correctArr.length) return false;
      return studentArr.every((val: number, idx: number) => val === correctArr[idx]);
    }
    if (isEssayQuestion(qi) || isFillBlankQuestion(qi)) {
      if (!choice) return false;
      if (qi.correctAnswer && String(choice).trim().toLowerCase() === String(qi.correctAnswer).trim().toLowerCase()) {
        return true;
      }
      return String(choice).trim().length > 0;
    }
    const sChoice = choice as number;
    const sLetter = sChoice !== undefined && typeof sChoice === 'number' ? String.fromCharCode(65 + sChoice) : '';
    return sLetter === qi.correctAnswer || String(choice) === String(qi.correctAnswer) || (qi.options && qi.options[sChoice] === qi.correctAnswer);
  };

  const handleGameAnswerSubmit = (answerValue: any) => {
    if (!activeGame || selectedOption !== null) return;
    const q = activeGame.questions[currentQuestionIndex];
    const isCorrect = checkQuestionCorrectLocal(q, answerValue);

    setSelectedOption(isCorrect ? 'CORRECT' : 'INCORRECT');
    setIsTimerRunning(false);

    let currentScore = score;
    if (isCorrect) {
      currentScore += 100;
      setScore((prev) => prev + 100);
    }

    if (activeGame.isTimeLimited !== false) {
      setTimeout(() => {
        if (currentQuestionIndex + 1 < activeGame.questions.length) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setSelectedOption(null);
          setGameAnswers(prev => ({ ...prev, [currentQuestionIndex + 1]: undefined }));
          setTimerSeconds(activeGame.type === 'speed_quiz' ? 10 : 15);
          setIsTimerRunning(true);
        } else {
          finishGameAndAward(currentScore);
        }
      }, 1500);
    }
  };

  const handleAnswerSubmit = (optionKey: string) => {
    if (!activeGame || selectedOption !== null) return;
    setSelectedOption(optionKey);
    setIsTimerRunning(false);

    let currentScore = score;
    const q = activeGame.questions[currentQuestionIndex];
    if (optionKey === q.answer || optionKey.startsWith(q.answer)) {
      currentScore += 100;
      setScore((prev) => prev + 100);
    }

    if (activeGame.isTimeLimited !== false) {
      setTimeout(() => {
        if (currentQuestionIndex + 1 < activeGame.questions.length) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setSelectedOption(null);
          setTimerSeconds(activeGame.type === 'speed_quiz' ? 10 : 15);
          setIsTimerRunning(true);
        } else {
          finishGameAndAward(currentScore);
        }
      }, 1200);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSpinLuckyWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWheelWinner(null);

    let count = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * luckyStudentList.length);
      setWheelWinner(luckyStudentList[randomIndex]);
      count++;
      if (count > 25) {
        clearInterval(interval);
        setIsSpinning(false);
        triggerConfetti();
      }
    }, 100);
  };

  const getGameIcon = (type: GameType) => {
    switch (type) {
      case 'golden_bell':
        return <Bell className="w-6 h-6 text-amber-500" />;
      case 'speed_quiz':
        return <Zap className="w-6 h-6 text-rose-500" />;
      case 'lucky_wheel':
        return <Disc className="w-6 h-6 text-indigo-500 animate-spin-slow" />;
      case 'flashcards':
        return <Layers className="w-6 h-6 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      {userRole === 'student' ? (
        <div className="bg-gradient-to-r from-fuchsia-700 via-purple-700 to-pink-600 rounded-[28px] p-7 sm:p-9 text-white shadow-2xl relative overflow-hidden border border-fuchsia-300/40 min-h-[170px] flex items-center">
          {/* Background Ambient Glows & Sparkles Decor */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-200 via-pink-400 to-transparent pointer-events-none" />
          <div className="absolute -right-8 -top-8 w-64 h-64 bg-pink-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-10 w-56 h-56 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
          
          {/* Subtle background star sparkles */}
          <div className="absolute top-4 right-1/4 text-amber-200/30 text-lg pointer-events-none select-none">✦</div>
          <div className="absolute bottom-4 left-1/4 text-pink-200/30 text-base pointer-events-none select-none">✧</div>
          <div className="absolute top-1/2 right-1/3 text-amber-300/20 text-sm pointer-events-none select-none">★</div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full">
            {/* Left Content Area */}
            <div className="space-y-3 max-w-2xl">
              {/* Top Badges Row: Distinct separated tags */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/35 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                  <span className="text-amber-300">⚔️</span> ĐẤU TRÍ TRỰC TUYẾN
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-950/30 backdrop-blur-md border border-pink-300/30 text-pink-100 text-xs font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Học sinh: <strong className="text-white font-extrabold">{currentUserName}</strong></span>
                </span>
              </div>

              {/* Title & Subtitle with high contrast hierarchy */}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white drop-shadow-sm flex items-center gap-3">
                  <span>Đấu Trường Tri Thức</span>
                  <span className="text-xl sm:text-2xl animate-bounce">🏆</span>
                </h1>
                <p className="text-pink-100 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
                  Thi đấu tốc độ, leo bảng vinh danh và nhận vô số phần thưởng Xu & EXP giá trị!
                </p>
              </div>
            </div>

            {/* Right Mascot / Trophy 3D Stage (Takes ~1/4 width) */}
            <div className="hidden sm:flex items-center justify-center relative shrink-0">
              {/* Outer Glowing Stage Circle */}
              <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-3xl bg-gradient-to-tr from-white/10 via-white/25 to-pink-300/30 backdrop-blur-md border border-white/40 shadow-2xl flex items-center justify-center relative transform hover:scale-105 transition-transform duration-300 group">
                
                {/* 3D Trophy / Mascot Centerpiece */}
                <div className="relative flex flex-col items-center justify-center">
                  <Trophy className="w-12 h-12 lg:w-14 lg:h-14 text-amber-300 drop-shadow-[0_6px_16px_rgba(245,158,11,0.6)] animate-pulse" />
                  
                  {/* Floating Micro Badges */}
                  <span className="absolute -top-3.5 -right-3.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 font-black text-[9px] shadow-md border border-amber-100 tracking-wider">
                    TOP 1 👑
                  </span>
                  
                  <span className="absolute -bottom-3 px-2 py-0.5 rounded-full bg-purple-900/90 text-amber-300 font-black text-[9px] shadow-md border border-purple-400/50 backdrop-blur-xs whitespace-nowrap">
                    +50 EXP ⚡
                  </span>
                </div>
              </div>
            </div>

            {activeGame && gameMode !== 'lobby' && (
              <button
                onClick={() => {
                  setGameMode('lobby');
                  setActiveGame(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-purple-900 hover:bg-pink-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại danh sách phòng
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                🎮 Tương Tác Trực Tiếp
              </span>
              <span className="text-xs text-slate-400">• Đấu trí & Thưởng điểm</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1 font-heading">
              Phân Hệ Trò Chơi Học Tập Tương Tác
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              4 loại hình trò chơi: Rung chuông vàng, Trắc nghiệm tốc độ, Vòng quay may mắn & Flashcards ôn tập
            </p>
          </div>

          {activeGame && gameMode !== 'lobby' && (
            <button
              onClick={() => {
                setGameMode('lobby');
                setActiveGame(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại danh sách game
            </button>
          )}
        </div>
      )}

      {/* 2 Tabs Switcher (Student Only) */}
      {gameMode === 'lobby' && userRole === 'student' && (
        <div className="flex items-center gap-2 border-b border-slate-200/80 bg-white px-6 pt-3 rounded-2xl shadow-xs">
          <button
            onClick={() => setActiveTab('games')}
            className={`pb-3.5 px-4 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'games'
                ? 'border-fuchsia-600 text-fuchsia-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⚔️</span>
            <span>Đấu Trường Trực Tuyến</span>
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`pb-3.5 px-4 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'store'
                ? 'border-fuchsia-600 text-fuchsia-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🎁</span>
            <span>Cửa Hàng & Vinh Danh</span>
          </button>
        </div>
      )}

      {/* TAB 2: STORE & HONORS */}
      {gameMode === 'lobby' && activeTab === 'store' && userRole === 'student' && (() => {
        const { studentClass, studentName } = getEffectiveStudentClassAndGrade();
        return (
          <StudentGameStoreTab currentUserName={currentUserName || studentName} studentClassName={studentClass} />
        );
      })()}

      {/* LOBBY: Game Cards (Tab 1) */}
      {gameMode === 'lobby' && activeTab === 'games' && userRole === 'student' && (() => {
        const { studentClass, studentGrade, studentName } = getEffectiveStudentClassAndGrade();
        const customRooms = normalizedGames.filter(g => g.id !== 'game-1' && g.id !== 'game-2' && g.id !== 'game-3' && g.id !== 'game-4');
        const studentRooms = customRooms.filter(room => {
          if (!isTargetingStudent(room.classInfo, room.grade, studentClass, studentGrade)) return false;
          if (studentRoomSubjectFilter !== 'Tất cả các môn' && room.subject && room.subject.toLowerCase() !== studentRoomSubjectFilter.toLowerCase()) return false;
          return true;
        });

        const filteredQuizzi = normalizedQuizziGames.filter(q => {
          if (deletedCards.includes(q.id)) return false;
          if (!isTargetingStudent(q.classInfo, q.grade, studentClass, studentGrade)) return false;
          if (studentQuizSubjectFilter !== 'Tất cả các môn' && q.subjectLabel !== studentQuizSubjectFilter && q.subject !== studentQuizSubjectFilter) return false;
          if (studentQuizSearchQuery && !q.title.toLowerCase().includes(studentQuizSearchQuery.toLowerCase())) return false;
          return true;
        });

        const profile = getStudentGameProfile(currentUserId, currentUserName || studentName);
        const leaderboardStudents = [
          { rank: 1, name: currentUserName || studentName || 'Học sinh', score: profile.coins > 0 ? profile.coins : 0, avatar: profile.avatar || '🌟', isMe: true }
        ];

        return (
          <div className="space-y-6">
            {/* Main Grid: Rooms List (Left 2 cols) & Leaderboard Sidebar (Right 1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: DANH SÁCH PHÒNG THI ĐẤU */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-amber-200">
                        🏆
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">DANH SÁCH PHÒNG THI ĐẤU</h3>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">
                          Hiển thị {studentRooms.length} phòng cho lớp {studentClass}
                        </p>
                      </div>
                    </div>

                    {/* Simplified Filter: Only Subject Filter */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Môn:</span>
                      <select
                        value={studentRoomSubjectFilter}
                        onChange={(e) => setStudentRoomSubjectFilter(e.target.value)}
                        className="bg-transparent appearance-none pr-4 outline-none cursor-pointer font-bold text-indigo-700"
                      >
                        <option value="Tất cả các môn">Tất cả các môn</option>
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Rooms List */}
                <div className="divide-y divide-slate-100 flex-1 overflow-auto max-h-[450px]">
                  {studentRooms.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                      <Gamepad2 className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-sm font-bold text-slate-500">Chưa có phòng thi đấu trực tuyến nào cho lớp {studentClass}</p>
                      <p className="text-xs text-slate-400 mt-1">Hãy quay lại khi Thầy/Cô mở phòng thi đấu mới nhé!</p>
                    </div>
                  ) : (
                    studentRooms.slice((studentRoomsCurrentPage - 1) * studentRoomsPageSize, (studentRoomsCurrentPage - 1) * studentRoomsPageSize + studentRoomsPageSize).map((room) => {
                      const isOpen = room.status !== 'closed';
                      return (
                        <div key={room.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 mt-0.5">
                              🎮
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 leading-snug">{room.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{room.description || `${room.questions?.length || 0} câu hỏi trắc nghiệm`}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black">
                                  {room.subject || 'Môn học'}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                  Lớp: {room.classInfo || studentClass}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold">
                              <Users className="w-3.5 h-3.5" />
                              <span>{room.playersCount || 0} / {room.maxPlayers || 10}</span>
                            </div>

                            {isOpen ? (
                              <button
                                onClick={() => handleStartGame(room)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>Vào phòng</span> <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="px-3 py-2 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl border border-slate-200">
                                🔒 Chưa đến giờ chơi trực tiếp
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {studentRooms.length > 0 && (
                  <div className="p-4 bg-white border-t border-slate-100">
                    <PaginationControl
                      currentPage={studentRoomsCurrentPage}
                      pageSize={studentRoomsPageSize}
                      totalItems={studentRooms.length}
                      onPageChange={setStudentRoomsCurrentPage}
                      onPageSizeChange={setStudentRoomsPageSize}
                      pageSizeOptions={[10, 20, 50]}
                      itemLabel="phòng"
                      className="border-t-0 pt-0"
                    />
                  </div>
                )}
              </div>

              {/* Right Column: BẢNG XẾP HẠNG (Fixed / Sidebar) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-fit">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white flex items-center gap-3">
                  <Trophy className="w-5 h-5 fill-white shrink-0" />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">BẢNG XẾP HẠNG</h3>
                    <p className="text-[10px] text-amber-100 font-medium">Xếp hạng thời gian thực - {studentClass}</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {leaderboardStudents.map((st) => (
                    <div
                      key={st.rank}
                      className={`p-3.5 flex items-center justify-between transition-colors ${
                        st.isMe ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                            st.rank === 1
                              ? 'bg-amber-400 text-amber-950 shadow-sm'
                              : st.rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : st.rank === 3
                              ? 'bg-amber-700/20 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {st.rank}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{st.avatar}</span>
                          <span className={`text-xs font-bold ${st.isMe ? 'text-indigo-900 font-black' : 'text-slate-800'}`}>
                            {st.name} {st.isMe && '(Bạn)'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black font-mono text-amber-600">{st.score}</span>
                        <span className="text-[10px] text-slate-400 font-bold">điểm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Khối "TRÒ CHƠI QUIZZI / KHO TRÒ CHƠI" */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">TRÒ CHƠI QUIZZI / KHO TRÒ CHƠI</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Kho trò chơi học tập tương tác do Thầy/Cô thiết kế</p>
                </div>

                {/* Filters & Search for Quizzi */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Môn:</span>
                    <select
                      value={studentQuizSubjectFilter}
                      onChange={(e) => setStudentQuizSubjectFilter(e.target.value)}
                      className="bg-transparent appearance-none pr-4 outline-none cursor-pointer font-bold text-indigo-700"
                    >
                      <option value="Tất cả các môn">Tất cả các môn</option>
                      {SUBJECTS.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm tên trò chơi..."
                      value={studentQuizSearchQuery}
                      onChange={(e) => setStudentQuizSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 w-48 sm:w-60"
                    />
                  </div>
                </div>
              </div>

              {/* Grid of Quizzi Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredQuizzi.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-400 text-xs font-bold">
                    Không tìm thấy trò chơi nào phù hợp.
                  </div>
                ) : (
                  filteredQuizzi.slice((studentQuizCurrentPage - 1) * studentQuizPageSize, (studentQuizCurrentPage - 1) * studentQuizPageSize + studentQuizPageSize).map((game) => (
                    <div key={game.id} className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-[10px] font-black uppercase">
                            {game.subjectLabel || game.subject}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Phù hợp {studentClass}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 leading-snug">{game.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{game.desc}</p>
                      </div>

                      <button
                        onClick={() => {
                          const url = game.embedUrl || (game as any).gameUrl || (game as any).externalLink || (game as any).url;
                          console.log("Quizzi game URL clicked:", game.title, url, game);
                          if (url && typeof url === 'string' && url.trim().length > 0) {
                            let finalUrl = url.trim();
                            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                              finalUrl = 'https://' + finalUrl;
                            }
                            setEmbeddedGameUrl(finalUrl);
                            setEmbeddedGameTitle(game.title);
                          } else {
                            setToastMessage("⚠️ Trò chơi này chưa có đường dẫn trực tuyến hợp lệ");
                            setTimeout(() => setToastMessage(null), 3000);
                          }
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Chơi luyện tập ngay
                      </button>
                    </div>
                  ))
                )}
              </div>

              {filteredQuizzi.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <PaginationControl
                    currentPage={studentQuizCurrentPage}
                    pageSize={studentQuizPageSize}
                    totalItems={filteredQuizzi.length}
                    onPageChange={setStudentQuizCurrentPage}
                    onPageSizeChange={setStudentQuizPageSize}
                    pageSizeOptions={[10, 20, 50]}
                    itemLabel="trò chơi"
                    className="border-t-0 pt-0"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* LOBBY: Teacher View (Tab 1) */}
      {gameMode === 'lobby' && activeTab === 'games' && userRole !== 'student' && (
        <div className="space-y-6">
          {/* Main Content Area */}
          <div className="flex flex-col gap-6">
            {/* Left Column: DANH SÁCH PHÒNG THI ĐẤU */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-h-[350px]">
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-6 h-6 text-amber-500 mt-1 shrink-0" />
                    <div>
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">DANH SÁCH PHÒNG THI ĐẤU</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Quản lý các phòng đấu trường trực tuyến của học sinh</p>
                    </div>
                  </div>
                  {(userRole as string) !== 'student' && (
                    <button 
                      onClick={onOpenUseQuestionBankModal}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Tạo trò chơi từ ngân hàng câu hỏi
                    </button>
                  )}
                </div>
                
                                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <select value={filterGrade} onChange={(e) => { setFilterGrade(e.target.value); setFilterClass('Tất cả các lớp'); }} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
<option value="Tất cả các khối">Tất cả các khối</option>
{GRADES.map((grade) => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
</select>
                      <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
                        <option value="Tất cả các lớp">Tất cả các lớp</option>
                        {getClassesForGrade(filterGrade).map((cls) => (
                          <option key={cls.id || cls.name} value={cls.name}>{cls.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
<option value="Tất cả các môn">Tất cả các môn</option>
{SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
</select>
                      <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                {(() => {
                  const customRooms = normalizedGames.filter(g => g.id !== 'game-1' && g.id !== 'game-2' && g.id !== 'game-3' && g.id !== 'game-4');
                  const filteredRooms = customRooms.filter(room => {
                    if (filterGrade !== 'Tất cả các khối' && filterGrade !== 'Tất cả' && room.grade && room.grade !== filterGrade) return false;
                    if (filterClass !== 'Tất cả các lớp' && filterClass !== 'Tất cả' && room.classInfo && room.classInfo !== filterClass) return false;
                    if (filterSubject !== 'Tất cả các môn' && filterSubject !== 'Tất cả' && room.subject && room.subject.toLowerCase() !== filterSubject.toLowerCase()) return false;
                    return true;
                  });

                  if (filteredRooms.length === 0) {
                    return (
                      <div className="p-12 flex flex-col items-center justify-center text-center">
                        <Gamepad2 className="w-12 h-12 text-slate-200 mb-3" />
                        <p className="text-sm font-bold text-slate-400 mb-2">Chưa có phòng thi đấu nào khớp bộ lọc</p>
                        <button 
                          onClick={onOpenUseQuestionBankModal}
                          className="text-sm font-bold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
                        >
                          Tạo phòng mới ngay
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-slate-100">
                      {filteredRooms.slice((roomsCurrentPage - 1) * roomsPageSize, (roomsCurrentPage - 1) * roomsPageSize + roomsPageSize).map(room => (
                        <div key={room.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-3.5">
                            <button className="text-amber-400 hover:text-amber-500 transition-colors mt-0.5 sm:mt-0 shrink-0">
                              <Trophy className="w-5 h-5 fill-amber-400" />
                            </button>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 leading-snug">{room.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{room.description || `${room.questions.length} câu hỏi`}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black uppercase tracking-wider">
                              {room.classInfo || room.grade || 'Lớp 3A'}
                            </span>

                            <span className="text-xs font-bold text-slate-600 max-w-[200px] truncate hidden md:inline">
                              {room.subject}
                            </span>

                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold">
                              <Users className="w-3.5 h-3.5" />
                              <span>{room.playersCount || 0} / {room.maxPlayers || 10}</span>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${room.status === 'closed' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {room.status === 'closed' ? '🔴 ĐÓNG' : '🟢 MỞ'}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {(userRole as string) === 'student' ? (
                                <>
                                  <button
                                    onClick={() => setSelectedLeaderboardGame(room)}
                                    title="Xem bảng xếp hạng"
                                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <Trophy className="w-3.5 h-3.5 fill-amber-500" /> BXH
                                  </button>
                                  {room.status === 'closed' ? (
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs">
                                      🔒 Đã đóng
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleStartGame(room)}
                                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-200 transition-all cursor-pointer"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" /> Vào đấu trường
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* 1. Nút khóa/mở - Chỉ chủ sở hữu hoặc admin đổi trạng thái. Đồng nghiệp chỉ xem trạng thái tĩnh */}
                                  {isRoomOwner(room) ? (
                                    <button
                                      onClick={() => {
                                        const newStatus = room.status === 'closed' ? 'open' : 'closed';
                                        if (onUpdateGame) onUpdateGame({ ...room, status: newStatus });
                                      }}
                                      title={room.status === 'closed' ? 'Đang ĐÓNG - Bấm để MỞ' : 'Đang MỞ - Bấm để ĐÓNG'}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer ${
                                        room.status === 'closed'
                                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      }`}
                                    >
                                      {room.status === 'closed' ? '🔒 ĐÓNG' : '🔓 MỞ'}
                                    </button>
                                  ) : (
                                    <span
                                      title={room.status === 'closed' ? 'Phòng đang đóng' : 'Phòng đang mở'}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-default select-none ${
                                        room.status === 'closed'
                                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                      }`}
                                    >
                                      {room.status === 'closed' ? '🔒 ĐÓNG' : '🔓 MỞ'}
                                    </span>
                                  )}

                                  {/* 2. Nút bút sửa (✏️) - CHỈ chủ sở hữu/admin */}
                                  {isRoomOwner(room) && (
                                    <button
                                      onClick={() => {
                                        if (onOpenEditGameRoom) onOpenEditGameRoom(room);
                                      }}
                                      title="Chỉnh sửa cấu hình phòng"
                                      className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}


                                  {/* 3. Nút chiếc cúp (🏆) - xem bảng xếp hạng vinh danh / theo dõi */}
                                  <button
                                    onClick={() => {
                                      setSelectedLeaderboardGame(room);
                                    }}
                                    title="Xem bảng xếp hạng vinh danh"
                                    className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <Trophy className="w-3.5 h-3.5 fill-amber-500" />
                                  </button>

                                  {/* 4. Nút xóa (🗑️) - CHỈ chủ sở hữu/admin */}
                                  {isRoomOwner(room) && (
                                    <button
                                      onClick={() => {
                                        setRoomToDelete(room);
                                      }}
                                      title="Xóa phòng thi đấu"
                                      className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const customRooms = normalizedGames.filter(g => g.id !== 'game-1' && g.id !== 'game-2' && g.id !== 'game-3' && g.id !== 'game-4');
                const filteredRooms = customRooms.filter(room => {
                  if (filterGrade !== 'Tất cả các khối' && filterGrade !== 'Tất cả' && room.grade && room.grade !== filterGrade) return false;
                  if (filterClass !== 'Tất cả các lớp' && filterClass !== 'Tất cả' && room.classInfo && room.classInfo !== filterClass) return false;
                  if (filterSubject !== 'Tất cả các môn' && filterSubject !== 'Tất cả' && room.subject && room.subject.toLowerCase() !== filterSubject.toLowerCase()) return false;
                  return true;
                });
                if (filteredRooms.length === 0) return null;
                return (
                  <div className="p-4 bg-white border-t border-slate-100">
                    <PaginationControl
                      currentPage={roomsCurrentPage}
                      pageSize={roomsPageSize}
                      totalItems={filteredRooms.length}
                      onPageChange={setRoomsCurrentPage}
                      onPageSizeChange={setRoomsPageSize}
                      pageSizeOptions={[10, 20, 50]}
                      itemLabel="phòng"
                      className="border-t-0 pt-0"
                    />
                  </div>
                );
              })()}
            </div>

            {/* Right Column: DANH SÁCH TRÒ CHƠI QUIZZI */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-h-[350px]">
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-6 h-6 text-amber-500 mt-1 shrink-0 fill-amber-500" />
                    <div>
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">DANH SÁCH TRÒ CHƠI QUIZZI</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Thư viện các trò chơi tương tác cá nhân của giáo viên</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingQuizziGame(null);
                      setShowCreateQuizziModal(true);
                    }} 
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors shrink-0 cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Tạo trò chơi Quizzi
                  </button>
                </div>

                                {/* Filters container */}
                <div className="border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-4 bg-white">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Khối:</span>
                    <div className="relative">
                      <select value={filterGrade} onChange={(e) => { setFilterGrade(e.target.value); setFilterClass('Tất cả các lớp'); }} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
<option value="Tất cả các khối">Tất cả các khối</option>
{GRADES.map((grade) => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
</select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Lớp:</span>
                    <div className="relative">
                      <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
                        <option value="Tất cả các lớp">Tất cả các lớp</option>
                        {getClassesForGrade(filterGrade).map((cls) => (
                          <option key={cls.id || cls.name} value={cls.name}>{cls.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Môn học:</span>
                    <div className="relative flex-1 sm:flex-none">
                      <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="bg-transparent appearance-none pr-4 outline-none cursor-pointer">
<option value="Tất cả các môn">Tất cả các môn</option>
{SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
</select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Loại:</span>
                    <div className="relative flex-1 sm:flex-none">
                      <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 appearance-none pr-6 outline-none cursor-pointer">
                        <option value="Tất cả Loại">Tất cả Loại</option>
                        <option value="Trắc nghiệm">Trắc nghiệm</option>
                        <option value="Tương tác">Tương tác</option>
                        <option value="Nhẩm toán">Nhẩm toán</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5 flex-1 overflow-auto bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 content-start">

                {(() => {
                  const visibleGames = filteredGames.filter(game => !deletedCards.includes(game.id));
                  if (visibleGames.length === 0) {
                    return (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-slate-500">
                        <Search className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-sm font-bold">Không tìm thấy trò chơi nào khớp bộ lọc</p>
                      </div>
                    );
                  }
                  const paginatedGames = visibleGames.slice((gamesCurrentPage - 1) * gamesPageSize, (gamesCurrentPage - 1) * gamesPageSize + gamesPageSize);
                  return paginatedGames.map(game => {
                    const IconComponent = game.icon === 'Laptop' ? Laptop : game.icon === 'BookOpen' ? BookOpen : Layers;
                    return (
                      <div key={game.id} className={`bg-white border border-${game.color}-100 rounded-xl p-4 shadow-sm hover:shadow transition-shadow relative flex flex-col h-full`}>
                        {isQuizziOwner(game) && (
                          <div className="absolute top-3.5 right-3.5 flex items-center gap-1">

                            <button 
                              onClick={() => {
                                setEditingQuizziGame(game);
                                setShowCreateQuizziModal(true);
                              }} 
                              title="Chỉnh sửa trò chơi"
                              className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setGameToDelete({ id: game.id, title: game.title })} 
                              title="Xóa trò chơi"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-${game.color}-100 text-${game.color}-700 rounded-full text-[10px] font-black uppercase mb-3 w-fit`}>
                          <IconComponent className="w-3 h-3" /> {game.subject}
                        </div>
                        
                        <h4 className="text-sm font-bold text-slate-800 mb-2 pr-20 leading-tight">{game.title}</h4>
                        
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed pr-8 flex-1">
                          {game.desc}
                        </p>
                        
                        <div className="flex items-center gap-2 mb-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold">
                            <span className="text-base leading-none -mt-0.5">🏫</span> {game.grade}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[10px] font-bold">
                            <span className="text-base leading-none -mt-0.5">📕</span> Lớp: {game.classInfo === 'Tất cả các lớp' ? 'Tất cả' : game.classInfo.replace('Lớp ', '')}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => {
                            const url = game.embedUrl || (game as any).gameUrl || (game as any).externalLink || (game as any).url;
                            console.log("Quizzi teacher preview URL clicked:", game.title, url, game);
                            if (url && typeof url === 'string' && url.trim().length > 0) {
                              let finalUrl = url.trim();
                              if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                                finalUrl = 'https://' + finalUrl;
                              }
                              setEmbeddedGameUrl(finalUrl);
                              setEmbeddedGameTitle(game.title);
                            } else {
                              setToastMessage("⚠️ Trò chơi này chưa có đường dẫn trực tuyến hợp lệ");
                              setTimeout(() => setToastMessage(null), 3000);
                            }
                          }}
                          className={`w-full flex items-center justify-center gap-2 py-2 bg-${game.color}-600 hover:bg-${game.color}-700 text-white rounded-lg text-xs font-bold transition-colors mt-auto cursor-pointer`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Trải nghiệm <Gamepad2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  });
                })()}

              </div>

              {(() => {
                const visibleGames = filteredGames.filter(game => !deletedCards.includes(game.id));
                if (visibleGames.length === 0) return null;
                return (
                  <div className="p-4 bg-white border-t border-slate-100">
                    <PaginationControl
                      currentPage={gamesCurrentPage}
                      pageSize={gamesPageSize}
                      totalItems={visibleGames.length}
                      onPageChange={setGamesCurrentPage}
                      onPageSizeChange={setGamesPageSize}
                      pageSizeOptions={[10, 20, 50]}
                      itemLabel="trò chơi"
                      className="border-t-0 pt-0"
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* COUNTDOWN START SCREEN */}
      {gameMode === 'countdown' && activeGame && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 rounded-3xl p-8 sm:p-12 w-full max-w-lg text-center shadow-2xl border-2 border-amber-400/50 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-white flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
            <div className="absolute -top-16 -left-16 w-56 h-56 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-2 relative z-10">
              <span className="text-xs font-black uppercase tracking-widest text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-300/30">
                🚀 ĐẤU TRƯỜNG TRỰC TUYẾN
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-white mt-2">
                {activeGame.title}
              </h2>
            </div>

            {/* Central Glowing Circular Badge */}
            <div className="py-6 relative z-10">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-amber-400/20 border-4 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center justify-center mx-auto animate-pulse">
                <span className="text-5xl sm:text-6xl font-black font-heading text-amber-300 drop-shadow-lg">
                  {countdownStep === 0 ? 'BẮT ĐẦU!' : countdownStep}
                </span>
              </div>
            </div>

            {/* Motivational Quote & Status */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 w-full max-w-sm space-y-1.5 relative z-10">
              <div className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center justify-center gap-1.5">
                <span>🎯</span>
                <span>{countdownStep === 0 ? 'BẮT ĐẦU THI ĐẤU!' : countdownStep === 1 ? 'Đấu trường chuẩn bị mở!' : countdownStep === 2 ? 'Chuẩn bị trả lời nhanh!' : 'Tập trung cao độ!'}</span>
              </div>
              <p className="text-xs text-amber-200/80 font-medium">
                {motivationalQuote}
              </p>
            </div>

            {/* Indicator Dots at the bottom */}
            <div className="flex items-center justify-center gap-2 pt-2 relative z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            </div>
          </div>
        </div>
      )}

      {/* PLAYING MODE */}
      {gameMode === 'playing' && activeGame && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 backdrop-blur-xl flex flex-col p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full mx-auto flex flex-col flex-1 justify-between space-y-6 relative z-10">
            {/* Top Bar with Badge & Close / Exit */}
            <div className="flex items-center justify-between pb-4 border-b border-white/15">
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-300 bg-amber-400/20 px-4 py-1.5 rounded-full border border-amber-300/30">
                🚀 ĐẤU TRƯỜNG TRỰC TUYẾN
              </span>
              <button
                onClick={() => {
                  setGameMode('lobby');
                  setActiveGame(null);
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm font-bold transition-colors cursor-pointer border border-white/20"
                title="Thoát đấu trường"
              >
                ✕
              </button>
            </div>

            {/* Main Content Grid: Question Area (75%) + Live Leaderboard (25%) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start flex-1">
              
              {/* Left Column: Question & Answers */}
              <div className="lg:col-span-3 space-y-6 flex flex-col justify-center">

          {/* GAME TYPE: Golden Bell & Speed Quiz */}
          {(activeGame.type === 'golden_bell' || activeGame.type === 'speed_quiz') && (
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              
              {/* Progress & Score Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 bg-white/10 text-indigo-200 font-bold text-sm sm:text-base rounded-full border border-white/20 shadow-sm">
                    Câu hỏi {currentQuestionIndex + 1} / {activeGame.questions.length}
                  </span>
                  <span className="px-4 py-1.5 bg-amber-400/20 text-amber-300 font-bold text-sm sm:text-base rounded-full border border-amber-300/30 flex items-center gap-1.5 shadow-sm">
                    <Trophy className="w-4 h-4 text-amber-300" /> Điểm: {score}
                  </span>
                </div>

                {/* Live Timer (Only if time-limited) */}
                {activeGame.isTimeLimited !== false && (
                  <div
                    className={`px-5 py-2 rounded-full font-extrabold text-base sm:text-lg flex items-center gap-2 border shadow-md ${
                      timerSeconds <= 3
                        ? 'bg-rose-600 text-white border-rose-400 animate-bounce'
                        : 'bg-white/10 text-amber-200 border-white/20'
                    }`}
                  >
                    <Clock className="w-5 h-5" /> 00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                  </div>
                )}
              </div>

              {/* Central Glowing Icon / Badge Circle */}
              <div className="flex justify-center py-1">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-400/20 border-4 border-amber-400/60 shadow-[0_0_35px_rgba(245,158,11,0.5)] flex items-center justify-center animate-pulse">
                  <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300 fill-amber-300" />
                </div>
              </div>

              {/* Question Box */}
              <div className="bg-white/10 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border-2 border-white/20 text-center space-y-4 shadow-2xl">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-amber-300 bg-amber-400/20 px-4 py-1 rounded-full border border-amber-300/30">
                  {activeGame.type === 'golden_bell' ? '🔔 RUNG CHUÔNG VÀNG' : '⚡ TRẮC NGHIỆM TỐC ĐỘ'}
                </span>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-heading leading-relaxed max-w-4xl mx-auto">
                  {activeGame.questions[currentQuestionIndex].question || activeGame.questions[currentQuestionIndex].content}
                </h3>
              </div>

               {/* Question Render Block based on Type */}
              {(() => {
                const q = activeGame.questions[currentQuestionIndex];
                console.log('🔍 QUESTION TEST 1:', { id: q.id, type: q.type, content: q.content, question: q.question, statements: q.statements, full: q });
                const qType = (q.type || '').toLowerCase();

                const isMatching = isMatchingQuestion(q);
                const isTrueFalse = isTrueFalseQuestion(q);
                const isMultipleResponse = isMultipleResponseQuestion(q);
                const isOrdering = isOrderingQuestion(q);
                const isClassification = isClassificationQuestion(q);
                const isMultipleChoice = isMultipleChoiceQuestion(q);

                if (isMatching) {
                  return (
                    <div className="space-y-4">
                      <div className="bg-indigo-950/60 p-4 rounded-2xl border border-amber-400/30 text-amber-200 text-xs sm:text-sm font-bold text-center flex items-center justify-center gap-2">
                        <span>🔗</span>
                        <span>Hãy chọn ghép nối tương ứng cho mỗi khái niệm dưới đây:</span>
                      </div>
                      <div className="space-y-3">
                        {(q.matchingPairs || []).map((pair, pIdx) => {
                          const currentAnswers = gameAnswers[currentQuestionIndex] || {};
                          const selectedRightVal = currentAnswers[pIdx] || '';
                          return (
                            <div key={pIdx} className="p-4 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                              <div className="flex-1 flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                                  {pIdx + 1}
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-white">{pair.left}</span>
                              </div>
                              <div className="text-amber-300 hidden md:block">➔</div>
                              <div className="flex-1">
                                <select
                                  value={selectedRightVal}
                                  disabled={selectedOption !== null}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setGameAnswers(prev => ({
                                      ...prev,
                                      [currentQuestionIndex]: {
                                        ...(prev[currentQuestionIndex] || {}),
                                        [pIdx]: val
                                      }
                                    }));
                                  }}
                                  className="w-full px-3 py-2.5 bg-indigo-950/80 hover:bg-indigo-900 border-2 border-white/20 focus:border-amber-400 rounded-xl text-white text-xs sm:text-sm font-semibold focus:outline-none transition-all cursor-pointer"
                                >
                                  <option value="" className="font-bold text-slate-400 bg-indigo-950">-- Chọn đáp án ghép nối --</option>
                                  {(q.matchingPairs || []).map((p, optIdx) => (
                                    <option key={optIdx} value={p.right} className="font-semibold text-slate-800 bg-white">
                                      {p.right}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {selectedOption === null ? (
                        <div className="pt-2 flex justify-center">
                          <button
                            onClick={() => handleGameAnswerSubmit(gameAnswers[currentQuestionIndex] || {})}
                            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-extrabold rounded-xl shadow-lg transition-all cursor-pointer"
                          >
                            Xác nhận hoàn thành ghép nối ✓
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-600/90 text-white rounded-xl text-center font-bold text-sm border border-emerald-400">
                          ✨ Đã ghi nhận kết quả ghép nối!
                        </div>
                      )}
                    </div>
                  );
                }

                if (isMultipleResponse && q.options && q.options.length > 0) {
                  return (
                    <div className="space-y-3">
                      <div className="bg-indigo-950/60 p-3 rounded-xl border border-amber-400/30 text-amber-200 text-xs font-bold text-center flex items-center justify-center gap-2">
                        <span>☑️</span>
                        <span>Chọn tất cả các đáp án đúng (Có thể chọn nhiều):</span>
                      </div>
                      {q.options.map((opt: string, optIdx: number) => {
                        const optionLetter = String.fromCharCode(65 + optIdx);
                        const currentArr: number[] = Array.isArray(gameAnswers[currentQuestionIndex]) ? gameAnswers[currentQuestionIndex] : [];
                        const isSelected = currentArr.includes(optIdx);

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={selectedOption !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedOption !== null) return;
                              const prevArr: number[] = Array.isArray(gameAnswers[currentQuestionIndex]) ? gameAnswers[currentQuestionIndex] : [];
                              let newArr: number[];
                              if (prevArr.includes(optIdx)) {
                                newArr = prevArr.filter((i: number) => i !== optIdx);
                              } else {
                                newArr = [...prevArr, optIdx].sort((a, b) => a - b);
                              }
                              setGameAnswers(prev => ({ ...prev, [currentQuestionIndex]: newArr }));
                            }}
                            className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3.5 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400/20 border-amber-400 text-white shadow-sm'
                                : 'bg-white/10 border-white/20 hover:border-white/40 text-white'
                            }`}
                          >
                            <div className={`w-7.5 h-7.5 rounded-md border flex items-center justify-center font-black text-[11px] shrink-0 transition-all ${
                              isSelected
                                ? 'bg-amber-400 border-amber-400 text-indigo-950'
                                : 'bg-white/10 text-white border-white/20'
                            }`}>
                              {isSelected ? <Check className="w-4 h-4" /> : optionLetter}
                            </div>
                            <span className="text-xs sm:text-sm font-semibold flex-1">{opt}</span>
                          </button>
                        );
                      })}
                      {selectedOption === null && (
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleGameAnswerSubmit(gameAnswers[currentQuestionIndex] || [])}
                            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-extrabold rounded-xl shadow-lg transition-all cursor-pointer"
                          >
                            Nộp câu trả lời ✓
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                if (isOrdering) {
                  const currentOrder: string[] = Array.isArray(gameAnswers[currentQuestionIndex])
                    ? gameAnswers[currentQuestionIndex]
                    : (q.options || []);

                  if (!Array.isArray(gameAnswers[currentQuestionIndex]) && q.options && q.options.length > 0) {
                    setTimeout(() => {
                      setGameAnswers(prev => ({ ...prev, [currentQuestionIndex]: [...q.options] }));
                    }, 0);
                  }

                  return (
                    <div className="space-y-3">
                      <div className="bg-indigo-950/60 p-3 rounded-xl border border-amber-400/30 text-amber-200 text-xs font-bold text-center flex items-center justify-center gap-2">
                        <span>↕️</span>
                        <span>Hãy sắp xếp các thao tác / bước theo đúng thứ tự (dùng nút ▲ / ▼):</span>
                      </div>
                      <div className="space-y-2.5">
                        {currentOrder.map((item, oIdx) => (
                          <div key={oIdx} className="p-3.5 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-between gap-3 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-xl bg-amber-400 text-indigo-950 flex items-center justify-center text-xs font-black shrink-0">
                                {oIdx + 1}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-white">{item}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={oIdx === 0 || selectedOption !== null}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newOrder = [...currentOrder];
                                  const temp = newOrder[oIdx];
                                  newOrder[oIdx] = newOrder[oIdx - 1];
                                  newOrder[oIdx - 1] = temp;
                                  setGameAnswers(prev => ({ ...prev, [currentQuestionIndex]: newOrder }));
                                }}
                                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer font-extrabold text-xs flex items-center justify-center transition-all"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={oIdx === currentOrder.length - 1 || selectedOption !== null}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newOrder = [...currentOrder];
                                  const temp = newOrder[oIdx];
                                  newOrder[oIdx] = newOrder[oIdx + 1];
                                  newOrder[oIdx + 1] = temp;
                                  setGameAnswers(prev => ({ ...prev, [currentQuestionIndex]: newOrder }));
                                }}
                                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer font-extrabold text-xs flex items-center justify-center transition-all"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedOption === null ? (
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleGameAnswerSubmit(currentOrder)}
                            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-extrabold rounded-xl shadow-lg transition-all cursor-pointer"
                          >
                            Xác nhận sắp xếp ✓
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-600/90 text-white rounded-xl text-center font-bold text-sm border border-emerald-400">
                          ✨ Đã hoàn thành sắp xếp!
                        </div>
                      )}
                    </div>
                  );
                }

                if (isClassification) {
                  return (
                    <div className="space-y-4">
                      <div className="bg-indigo-950/60 p-4 rounded-2xl border border-amber-400/30 text-amber-200 text-xs sm:text-sm font-bold text-center flex items-center justify-center gap-2">
                        <span>📂</span>
                        <span>Hãy xếp các vật phẩm vào đúng nhóm thích hợp:</span>
                      </div>
                      <div className="space-y-3">
                        {(q.classificationItems || []).map((item, iIdx) => {
                          const currentAnswers = gameAnswers[currentQuestionIndex] || {};
                          const selectedGroup = currentAnswers[iIdx] || '';
                          return (
                            <div key={iIdx} className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                              <span className="text-white font-bold text-sm">{iIdx + 1}. {item.name}</span>
                              <select
                                value={selectedGroup}
                                disabled={selectedOption !== null}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGameAnswers(prev => ({
                                    ...prev,
                                    [currentQuestionIndex]: {
                                      ...(prev[currentQuestionIndex] || {}),
                                      [iIdx]: val
                                    }
                                  }));
                                }}
                                className="px-3 py-2 bg-indigo-950/80 border border-white/20 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                              >
                                <option value="" className="bg-indigo-950 text-slate-400">-- Chọn nhóm --</option>
                                {(q.classificationGroups || ['Nhóm 1', 'Nhóm 2']).map((gName, gIdx) => (
                                  <option key={gIdx} value={gName} className="bg-white text-slate-900 font-semibold">{gName}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                      {selectedOption === null ? (
                        <div className="pt-2 flex justify-center">
                          <button
                            onClick={() => handleGameAnswerSubmit(gameAnswers[currentQuestionIndex] || {})}
                            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-extrabold rounded-xl shadow-lg transition-all cursor-pointer"
                          >
                            Xác nhận phân loại ✓
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-600/90 text-white rounded-xl text-center font-bold text-sm">
                          ✨ Đã hoàn thành phân loại!
                        </div>
                      )}
                    </div>
                  );
                }

                if (isTrueFalse) {
                  const qa = q as any;
                  const statementsToUse = (q.statements && q.statements.length > 0)
                    ? q.statements
                    : [{ statement: q.question || q.content || 'Đánh giá phát biểu sau:', isCorrect: qa.correctAnswer === 'A' || String(qa.correctAnswer).toLowerCase().includes('đúng') || qa.correctAnswer === true }];

                  return (
                    <div className="space-y-3">
                      <div className="bg-indigo-950/60 p-3 rounded-xl border border-amber-400/30 text-amber-200 text-xs font-bold text-center">
                        📋 Đánh giá các nhận định sau đây là Đúng hay Sai:
                      </div>
                      {statementsToUse.map((st: any, idx: number) => {
                        const currentAnswers = gameAnswers[currentQuestionIndex] || {};
                        const val = currentAnswers[idx]; // true, false, or undefined
                        return (
                          <div key={idx} className="p-4 bg-white/10 rounded-2xl border border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
                            <span className="text-white font-bold text-sm sm:text-base">{statementsToUse.length > 1 ? `${idx + 1}. ` : ''}{st.statement}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={selectedOption !== null}
                                onClick={() => {
                                  if (selectedOption !== null) return;
                                  setGameAnswers(prev => ({
                                    ...prev,
                                    [currentQuestionIndex]: {
                                      ...(prev[currentQuestionIndex] || {}),
                                      [idx]: true
                                    }
                                  }));
                                }}
                                className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                                  val === true
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-400/40'
                                }`}
                              >
                                Đúng
                              </button>
                              <button
                                type="button"
                                disabled={selectedOption !== null}
                                onClick={() => {
                                  if (selectedOption !== null) return;
                                  setGameAnswers(prev => ({
                                    ...prev,
                                    [currentQuestionIndex]: {
                                      ...(prev[currentQuestionIndex] || {}),
                                      [idx]: false
                                    }
                                  }));
                                }}
                                className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                                  val === false
                                    ? 'bg-rose-600 text-white shadow-md'
                                    : 'bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-400/40'
                                }`}
                              >
                                Sai
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {selectedOption === null ? (
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleGameAnswerSubmit(gameAnswers[currentQuestionIndex] || {})}
                            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-extrabold rounded-xl shadow-lg transition-all cursor-pointer"
                          >
                            Nộp đáp án Đúng/Sai ✓
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-600/90 text-white rounded-xl text-center font-bold text-sm">
                          ✨ Đã nộp đáp án!
                        </div>
                      )}
                    </div>
                  );
                }

                if (isMultipleChoice) {
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(q.options || []).map((opt, idx) => {
                        const optionLetter = String.fromCharCode(65 + idx);
                        const isSelected = selectedOption === optionLetter;
                        const isCorrect = optionLetter === q.answer;

                        return (
                          <button
                            key={idx}
                            onClick={() => handleGameAnswerSubmit(optionLetter)}
                            disabled={selectedOption !== null}
                            className={`p-5 sm:p-6 rounded-2xl border-2 text-left font-extrabold text-sm sm:text-base transition-all cursor-pointer flex items-center justify-between shadow-lg ${
                              selectedOption !== null
                                ? isCorrect
                                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                  : isSelected
                                  ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.4)]'
                                  : 'bg-white/5 text-white/30 border-white/10 opacity-40'
                                : 'bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-amber-400/60 backdrop-blur-md hover:scale-[1.01]'
                            }`}
                          >
                            <span className="leading-relaxed">{opt}</span>
                            {selectedOption !== null && isCorrect && (
                              <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0 ml-3" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                }

                // Fallback for essay / fill blank / generic
                const rawAns = gameAnswers[currentQuestionIndex];
                const essayVal = (typeof rawAns === 'string' || typeof rawAns === 'number') ? String(rawAns) : '';
                return (
                  <div className="space-y-4">
                    <textarea
                      placeholder="Nhập câu trả lời của em tại đây..."
                      disabled={selectedOption !== null}
                      value={essayVal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGameAnswers(prev => ({ ...prev, [currentQuestionIndex]: val }));
                      }}
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-amber-400 text-sm sm:text-base backdrop-blur-md"
                      rows={3}
                    />
                    {selectedOption === null ? (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleGameAnswerSubmit(essayVal)}
                          className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-extrabold rounded-xl shadow-lg transition-all cursor-pointer"
                        >
                          Nộp bài trả lời ✓
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-600/90 text-white rounded-xl text-center font-bold text-sm">
                        ✨ Đã gửi câu trả lời thành công!
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Explanation note */}
              {selectedOption !== null && activeGame.questions[currentQuestionIndex].explanation && (
                <div className="p-5 bg-indigo-950/90 rounded-2xl text-sm text-amber-200 border-2 border-amber-400/40 animate-in fade-in backdrop-blur-md shadow-xl">
                  💡 <strong>Giải thích:</strong> {activeGame.questions[currentQuestionIndex].explanation}
                </div>
              )}

              {/* Manual Next Question Button in Self-Paced Mode */}
              {activeGame.isTimeLimited === false && selectedOption !== null && (
                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      if (currentQuestionIndex + 1 < activeGame.questions.length) {
                        setCurrentQuestionIndex((prev) => prev + 1);
                        setSelectedOption(null);
                      } else {
                        finishGameAndAward(score);
                      }
                    }}
                    className="px-8 py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-indigo-950 font-extrabold text-sm sm:text-base rounded-2xl shadow-xl transition-all flex items-center gap-3 cursor-pointer animate-in fade-in mx-auto sm:mx-0"
                  >
                    <span>Câu tiếp theo</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

            </div>
          )}

          {/* GAME TYPE: Lucky Wheel */}
          {activeGame.type === 'lucky_wheel' && (
            <div className="text-center space-y-6 relative z-10">
              <h3 className="text-xl font-extrabold text-white font-heading flex items-center justify-center gap-2">
                <Disc className="w-6 h-6 text-amber-300 animate-spin-slow" /> Vòng Quay Chọn Học Sinh May Mắn
              </h3>

              <div className="w-64 h-64 mx-auto rounded-full bg-gradient-to-tr from-amber-400 via-purple-500 to-indigo-500 p-3 shadow-2xl flex items-center justify-center relative animate-pulse">
                <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center p-4 text-center border-4 border-amber-300 shadow-inner">
                  <span className="text-xs font-bold text-amber-300/80 uppercase">HỌC SINH ĐƯỢC CHỌN</span>
                  <div className="text-xl font-extrabold text-white font-heading mt-2">
                    {wheelWinner || 'Bấm Quay Ngay!'}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSpinLuckyWheel}
                  disabled={isSpinning}
                  className="px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-indigo-950 font-extrabold text-sm rounded-full shadow-2xl transition-all flex items-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                  {isSpinning ? 'Đang quay...' : 'QUAY NGAY BÂY GIỜ'}
                </button>
              </div>
            </div>
          )}

          {/* GAME TYPE: Flashcards */}
          {activeGame.type === 'flashcards' && (
            <div className="space-y-6 text-center relative z-10">
              <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                <span>Thẻ {currentQuestionIndex + 1} / {activeGame.questions.length}</span>
                <span>Bấm vào thẻ để lật xem đáp án</span>
              </div>

              {/* 3D Flip Card */}
              <div
                onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                className="w-full h-64 bg-gradient-to-tr from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-6 text-white shadow-2xl border-2 border-amber-400/50 flex flex-col items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
              >
                {!flashcardFlipped ? (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                      THUẬT NGỮ / CÂU HỎI
                    </span>
                    <h3 className="text-2xl font-extrabold font-heading text-white">
                      {activeGame.questions[currentQuestionIndex].question || activeGame.questions[currentQuestionIndex].content}
                    </h3>
                  </div>
                ) : (
                  <div className="space-y-2 animate-in fade-in">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                      ĐÁP ÁN & ĐỊNH NGHĨA
                    </span>
                    <p className="text-sm font-semibold leading-relaxed text-amber-100">
                      {activeGame.questions[currentQuestionIndex].answer}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    setFlashcardFlipped(false);
                    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 border border-white/20 cursor-pointer"
                >
                  Thẻ Trước
                </button>

                <button
                  onClick={() => {
                    setFlashcardFlipped(false);
                    if (currentQuestionIndex + 1 < activeGame.questions.length) {
                      setCurrentQuestionIndex((prev) => prev + 1);
                    } else {
                      finishGameAndAward(100);
                    }
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-indigo-950 text-xs font-extrabold rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  Thẻ Tiếp Theo
                </button>
              </div>
            </div>
          )}

              </div>

              {/* Right Column: Live Leaderboard (25% on lg) */}
              <div className="lg:col-span-1 bg-white/10 backdrop-blur-xl rounded-3xl p-5 border-2 border-amber-400/40 shadow-2xl space-y-4 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="text-center pb-3 border-b border-white/15 relative z-10">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-300/30 inline-block">
                    🏆 THỨ HẠNG TRỰC TIẾP
                  </span>
                </div>

                <div className="space-y-2.5 relative z-10 max-h-[400px] overflow-y-auto pr-1">
                  {[
                    { rank: 1, name: 'Lê Minh Anh', score: score + 300, avatar: '🦊', isMe: false },
                    { rank: 2, name: currentUserName || 'Hoàng Bảo An', score: score, avatar: '🐰', isMe: true },
                    { rank: 3, name: 'Nguyễn Văn Nam', score: Math.max(0, score - 50), avatar: '🐱', isMe: false },
                    { rank: 4, name: 'Trần Thảo Vy', score: Math.max(0, score - 120), avatar: '🐼', isMe: false },
                    { rank: 5, name: 'Phạm Minh Quân', score: Math.max(0, score - 200), avatar: '🐨', isMe: false },
                  ].sort((a, b) => b.score - a.score).map((player, idx) => {
                    const actualRank = idx + 1;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${
                          player.isMe
                            ? 'bg-amber-400/20 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            actualRank === 1 ? 'bg-amber-400 text-indigo-950 shadow-md' :
                            actualRank === 2 ? 'bg-slate-300 text-indigo-950' :
                            actualRank === 3 ? 'bg-amber-600 text-white' : 'bg-white/10 text-amber-200'
                          }`}>
                            {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : actualRank === 3 ? '🥉' : actualRank}
                          </span>
                          <span className="text-base shrink-0">{player.avatar}</span>
                          <span className={`text-xs font-bold truncate ${player.isMe ? 'text-amber-300 underline font-black' : 'text-white'}`}>
                            {player.name} {player.isMe && '(Em)'}
                          </span>
                        </div>
                        <span className="text-xs font-black text-amber-300 shrink-0 ml-2">
                          {player.score} đ
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 text-center text-[10px] text-amber-200/60 italic">
                  ✨ Điểm số cập nhật liên tục real-time theo từng câu trả lời.
                </div>
              </div>

            </div>

            {/* Indicator Dots at the bottom */}
            <div className="flex items-center justify-center gap-2 pt-2 relative z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            </div>

          </div>
        </div>
      )}

      {/* RESULT MODE */}
      {gameMode === 'result' && activeGame && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 rounded-3xl p-8 sm:p-10 w-full max-w-lg text-white shadow-2xl border-2 border-amber-400/50 shadow-[0_0_50px_rgba(245,158,11,0.3)] relative overflow-hidden text-center space-y-6">
            <div className="absolute -top-16 -left-16 w-56 h-56 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-300/30">
                🏆 KẾT QUẢ ĐẤU TRƯỜNG
              </span>
            </div>

            {(() => {
              const totalPossible = (activeGame?.questions?.length || 1) * 100;
              const ratio = totalPossible > 0 ? score / totalPossible : 0;

              let tier = {
                title: 'HOÀN THÀNH XUẤT SẮC!',
                subtitle: `Chúc mừng <strong>${currentUserName || 'Học sinh'}</strong> đã chiến thắng thử thách xuất sắc!`,
                isZero: false,
                iconColor: 'text-amber-300 fill-amber-300',
                iconBg: 'bg-amber-400/20 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.5)]'
              };

              if (score === 0 || ratio === 0) {
                tier = {
                  title: 'HẾT GIỜ / CHƯA TRẢ LỜI',
                  subtitle: `Em chưa trả lời đúng câu hỏi nào hoặc đã hết thời gian. Đừng nản lòng, hãy bấm Chơi Lại để thử sức nhé!`,
                  isZero: true,
                  iconColor: 'text-slate-300 fill-slate-300',
                  iconBg: 'bg-slate-800/60 border-slate-600 shadow-[0_0_20px_rgba(100,116,139,0.3)]'
                };
              } else if (ratio < 0.5) {
                tier = {
                  title: 'ĐÃ HOÀN THÀNH!',
                  subtitle: `Cùng luyện tập thêm để đạt kết quả tốt hơn nhé, <strong>${currentUserName || 'Học sinh'}</strong>!`,
                  isZero: false,
                  iconColor: 'text-amber-300 fill-amber-300',
                  iconBg: 'bg-amber-400/20 border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                };
              } else if (ratio < 0.8) {
                tier = {
                  title: 'HOÀN THÀNH TỐT!',
                  subtitle: `Em đã cố gắng rất nhiều, <strong>${currentUserName || 'Học sinh'}</strong>! Kết quả rất khả quan.`,
                  isZero: false,
                  iconColor: 'text-blue-300 fill-blue-300',
                  iconBg: 'bg-blue-500/20 border-blue-400/50 shadow-[0_0_25px_rgba(59,130,246,0.3)]'
                };
              }

              return (
                <>
                  <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto relative z-10 ${tier.iconBg}`}>
                    {tier.isZero ? (
                      <Clock className={`w-12 h-12 ${tier.iconColor}`} />
                    ) : (
                      <Trophy className={`w-12 h-12 ${tier.iconColor} animate-bounce`} />
                    )}
                  </div>

                  <div className="space-y-1 relative z-10">
                    <h3 className="text-2xl font-extrabold text-white font-heading">
                      {tier.title}
                    </h3>
                    <p className="text-xs text-amber-200" dangerouslySetInnerHTML={{ __html: tier.subtitle }} />
                  </div>
                </>
              );
            })()}

            <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center space-y-3 relative z-10">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">TỔNG ĐIỂM ĐẠT ĐƯỢC</span>
              <div className="text-4xl font-extrabold text-amber-300 font-heading drop-shadow-md">
                {score} PTS
              </div>

              {/* EXP & Coin Rewards Box */}
              {(() => {
                const reward = calculateArenaReward(achievedRank || 'unranked');
                return (
                  <div className="pt-3 border-t border-white/15 space-y-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs font-black text-amber-900 uppercase bg-amber-300 px-3 py-1 rounded-full shadow-sm">
                        {achievedRank === 1 ? '🥇 Hạng 1 Xuất Sắc' : achievedRank === 2 ? '🥈 Hạng 2 Ấn Tượng' : achievedRank === 3 ? '🥉 Hạng 3 Tài Năng' : '🎖️ Tham Gia Tích Cực'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-3 text-xs font-bold">
                      <span className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border ${
                        isRewardAlreadyClaimed ? 'bg-slate-800 text-slate-400 border-slate-700 line-through' : 'bg-amber-400/20 text-amber-200 border-amber-400/30'
                      }`}>
                        🪙 +{reward.coins} Xu
                      </span>
                      <span className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border ${
                        isRewardAlreadyClaimed ? 'bg-slate-800 text-slate-400 border-slate-700 line-through' : 'bg-amber-400/20 text-amber-200 border-amber-400/30'
                      }`}>
                        ⭐ +{reward.exp} EXP
                      </span>
                    </div>

                    {isRewardAlreadyClaimed && (
                      <p className="text-[11px] text-amber-200/80 font-medium italic">
                        ✨ Phòng này đã nhận thưởng trước đó. Luyện tập thêm giúp em nhớ bài lâu hơn!
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-2.5 relative z-10 pt-2">
              <button
                onClick={() => handleStartGame(activeGame)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 border border-rose-400/40"
              >
                <RefreshCw className="w-4 h-4" /> Chơi Lại Game
              </button>
              <button
                onClick={() => {
                  setGameMode('lobby');
                  setActiveTab('store');
                  setActiveGame(null);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-indigo-950 font-extrabold text-xs rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🎁 Đến Cửa Hàng Đổi Quà</span>
              </button>
              <button
                onClick={() => {
                  setGameMode('lobby');
                  setActiveTab('games');
                  setActiveGame(null);
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl cursor-pointer border border-white/20"
              >
                Về Đấu Trường
              </button>
            </div>

            {/* Indicator Dots at the bottom */}
            <div className="flex items-center justify-center gap-2 pt-2 relative z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            </div>

          </div>
        </div>
      )}


      {/* Quizzi Game Modal (Hỗ trợ Multi-select chọn nhiều lớp, Tách N bản ghi độc lập) */}
      <QuizziGameModal
        isOpen={showCreateQuizziModal}
        onClose={() => {
          setShowCreateQuizziModal(false);
          setEditingQuizziGame(null);
        }}
        onSave={handleSaveQuizziGames}
        initialData={editingQuizziGame}
      />



      {/* 3. LEADERBOARD MODAL (Bảng Xếp Hạng Vinh Danh ⭐) */}
      {selectedLeaderboardGame && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border-2 border-amber-400/50 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-white relative">
            <div className="absolute -top-16 -left-16 w-56 h-56 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white flex items-center justify-between relative z-10 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-200 border border-white/30 text-2xl font-black">
                  🏆
                </div>
                <div>
                  <h3 className="text-lg font-extrabold font-heading">Bảng Xếp Hạng Vinh Danh ⭐</h3>
                  <p className="text-amber-100 text-xs mt-0.5">
                    Phòng: <span className="font-bold underline">{selectedLeaderboardGame.title}</span> • Lớp: <span className="font-bold">{selectedLeaderboardGame.classInfo || 'Lớp 3A'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeaderboardGame(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Info Summary Bar */}
            <div className="bg-white/10 backdrop-blur-md border-b border-white/15 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center relative z-10">
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/15">
                <span className="text-[10px] font-bold text-amber-300 block uppercase">Môn học</span>
                <span className="text-xs font-black text-white">{selectedLeaderboardGame.subject}</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/15">
                <span className="text-[10px] font-bold text-amber-300 block uppercase">Chủ đề</span>
                <span className="text-xs font-black text-white truncate block">{selectedLeaderboardGame.grade}</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/15">
                <span className="text-[10px] font-bold text-amber-300 block uppercase">Số câu hỏi</span>
                <span className="text-xs font-black text-amber-200">{selectedLeaderboardGame.questions.length} câu</span>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/15">
                <span className="text-[10px] font-bold text-amber-300 block uppercase">Học sinh tham gia</span>
                <span className="text-xs font-black text-emerald-300">{selectedLeaderboardGame.playersCount || 0} học sinh</span>
              </div>
            </div>

            {/* Leaderboard Table / Empty State */}
            <div className="p-6 overflow-y-auto flex-1 relative z-10">
              {(!selectedLeaderboardGame.playersCount || selectedLeaderboardGame.playersCount === 0) ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-2xl font-bold border-2 border-amber-400/40 animate-pulse">
                    ⏳
                  </div>
                  <h4 className="text-base font-extrabold text-white">Chưa có học sinh tham gia</h4>
                  <p className="text-xs text-amber-200/80 max-w-sm leading-relaxed">
                    Học sinh chưa hoàn thành lượt chơi thực tế của phòng thi đấu này. Khi học sinh hoàn thành, kết quả sẽ cập nhật real-time tại đây.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-white/20 rounded-2xl bg-white/5 backdrop-blur-md">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/10 text-amber-200 text-[11px] font-black uppercase tracking-wider">
                        <th className="p-3.5 text-center w-16">Hạng</th>
                        <th className="p-3.5">Mã HS</th>
                        <th className="p-3.5">Học Sinh</th>
                        <th className="p-3.5 text-center">Tiến Trình (Đúng/Sai)</th>
                        <th className="p-3.5 text-center">Thời Gian</th>
                        <th className="p-3.5 text-right">Điểm Số</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-xs font-medium text-white">
                      <tr className="hover:bg-white/10 transition-colors">
                        <td className="p-3.5 text-center font-black text-amber-300">🥇 1</td>
                        <td className="p-3.5 font-bold text-amber-200">HS0189</td>
                        <td className="p-3.5 font-extrabold text-white">Lê Minh Anh</td>
                        <td className="p-3.5 text-center text-emerald-300 font-bold">{selectedLeaderboardGame.questions.length}/{selectedLeaderboardGame.questions.length} (100%)</td>
                        <td className="p-3.5 text-center text-amber-200">01:45</td>
                        <td className="p-3.5 text-right font-black text-amber-300">1,000 đ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/15 bg-slate-900/80 flex items-center justify-between rounded-b-3xl relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              </div>
              <button
                onClick={() => setSelectedLeaderboardGame(null)}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/20"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ROOM DELETE CONFIRMATION POPUP */}
      <ConfirmDeleteModal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onConfirm={() => {
          if (roomToDelete) {
            if (onDeleteGame) onDeleteGame(roomToDelete.id);
            setToastMessage(`🗑️ Đã xóa phòng thi đấu "${roomToDelete.title}"`);
            setTimeout(() => setToastMessage(null), 3000);
            setRoomToDelete(null);
          }
        }}
        title="Xác nhận xóa phòng thi đấu"
        itemType="phòng thi đấu"
        itemName={roomToDelete?.title}
        description={`Bạn có chắc chắn muốn xóa phòng "${roomToDelete?.title}" không? Toàn bộ dữ liệu bảng xếp hạng và lượt chơi của học sinh trong phòng này sẽ bị xóa vĩnh viễn và không thể khôi phục.`}
      />

      {/* QUIZZI GAME CARD DELETE CONFIRMATION POPUP */}
      <ConfirmDeleteModal
        isOpen={!!gameToDelete}
        onClose={() => setGameToDelete(null)}
        onConfirm={async () => {
          if (gameToDelete) {
            try {
              await deleteQuizziGameFromFirestore(gameToDelete.id);
              setQuizziGames(prev => prev.filter(g => String(g.id) !== String(gameToDelete.id)));
              setDeletedCards(prev => [...prev, gameToDelete.id]);
              setToastMessage(`🗑️ Đã xóa vĩnh viễn trò chơi Quizzi "${gameToDelete.title}" trên Cloud Firestore`);
            } catch (err) {
              console.error("Lỗi xóa Quizzi trên Firestore:", err);
              setToastMessage(`❌ Lỗi khi xóa trên Firestore`);
            } finally {
              setTimeout(() => setToastMessage(null), 3000);
              setGameToDelete(null);
            }
          }
        }}
        title="Xác nhận xóa trò chơi Quizzi"
        itemType="trò chơi"
        itemName={gameToDelete?.title}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-100" />
            {toastMessage}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] text-white px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-up backdrop-blur-md bg-slate-950/95 ${toast.type === 'error' ? 'border-rose-500/50 text-rose-50' : 'border-emerald-500/50 text-emerald-50'}`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-extrabold tracking-wide">{toast.message}</span>
        </div>
      )}



      {/* Embedded Fullscreen Game Overlay Modal */}
      {embeddedGameUrl && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold">
                🎮
              </div>
              <div>
                <h3 className="text-white font-extrabold text-base">{embeddedGameTitle}</h3>
                <p className="text-xs text-indigo-300/80">Trò chơi học tập tương tác trực tuyến</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={embeddedGameUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl border border-indigo-400/40 transition-all flex items-center gap-2 shadow-md cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Mở tab mới (nếu bị chặn nhúng)
              </a>
              <button
                onClick={() => setEmbeddedGameUrl(null)}
                className="p-2.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-400/40 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Đóng trò chơi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative w-full h-full bg-slate-950 overflow-hidden flex flex-col">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-amber-500/95 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold shadow-xl flex items-center gap-2 pointer-events-auto border border-amber-300">
              <span>💡 Lưu ý: Một số nền tảng (như Wayground/Quizizz) có thể hạn chế nhúng khung hình (iframe). Nếu màn hình hiển thị trắng hoặc từ chối kết nối, vui lòng bấm nút <strong className="underline">"Mở tab mới"</strong> màu xanh ở góc trên bên phải.</span>
            </div>
            <iframe
              src={embeddedGameUrl}
              title={embeddedGameTitle}
              className="w-full flex-1 border-0 bg-white"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </div>
        </div>
      )}

    </div>
  );
};
