import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Maximize2,
  Flag
} from 'lucide-react';

interface Question {
  questionText: string;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[];
  correctAnswer: string;
  marks: number;
}

interface Quiz {
  _id: string;
  title: string;
  batchId: string;
  questions: Question[];
  totalMarks: number;
  passingMarks: number;
  dueDate: string;
}

const QuizAttempt = () => {
  const router = useRouter();
  const { id } = router.query;
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fullscreen functionality
  const enterFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.log('Error exiting fullscreen:', err);
        });
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement ||
        (document as any).mozFullScreenElement
      );
      setIsFullscreen(isInFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-enter fullscreen when quiz starts
  useEffect(() => {
    if (quiz && !isFullscreen) {
      enterFullscreen();
    }
  }, [quiz]);

  // Exit fullscreen when quiz ends or component unmounts
  useEffect(() => {
    return () => {
      if (isFullscreen) {
        exitFullscreen();
      }
    };
  }, [isFullscreen]);

  // Prevent copy/paste
  useEffect(() => {
    const preventCopy = (e: Event) => {
      e.preventDefault();
      toast.warning('Copy is disabled during quiz');
    };

    const preventCut = (e: Event) => {
      e.preventDefault();
      toast.warning('Cut is disabled during quiz');
    };

    const preventPaste = (e: Event) => {
      e.preventDefault();
      toast.warning('Paste is disabled during quiz');
    };

    const preventContextMenu = (e: Event) => {
      e.preventDefault();
      toast.warning('Right-click is disabled during quiz');
    };

    // Disable keyboard shortcuts for copy/paste
    const preventKeyboardCopy = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
        toast.warning('Copy/Paste is disabled during quiz');
      }
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCut);
    document.addEventListener('paste', preventPaste);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardCopy);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCut);
      document.removeEventListener('paste', preventPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardCopy);
    };
  }, []);

  useEffect(() => {
    const storedData = localStorage.getItem('student');
    if (!storedData) {
      router.push('/student/login');
      return;
    }

    if (id) {
      fetchQuiz(id as string);
    }
  }, [id]);

  const fetchQuiz = async (quizId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/lms/quizzes?id=${quizId}`);
      const data = await res.json();

      if (res.ok) {
        setQuiz(data);
      } else {
        toast.error(data.error || 'Failed to load quiz');
        router.push('/student/dashboard');
      }
    } catch (error) {
      console.error('Quiz fetch error:', error);
      toast.error('Failed to load quiz');
      router.push('/student/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentQuestion]: answer });
  };

  const calculateScore = useCallback(() => {
    if (!quiz) return 0;

    let totalScore = 0;
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        totalScore += question.marks;
      }
    });
    return totalScore;
  }, [quiz, answers]);

  const handleSubmit = async () => {
    if (!quiz) return;

    // Exit fullscreen before showing results
    if (isFullscreen) {
      exitFullscreen();
    }

    const finalScore = calculateScore();
    setScore(finalScore);
    setIsSubmitted(true);

    // Get student ID from localStorage
    const storedData = localStorage.getItem('student');
    if (!storedData) {
      toast.error('Session expired');
      return;
    }

    const student = JSON.parse(storedData);

    try {
      // Submit the quiz attempt
      const res = await fetch('/api/lms/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.studentId || student._id,
          refId: quiz._id,
          score: finalScore,
          status: 'submitted'
        })
      });

      if (res.ok) {
        toast.success('Quiz submitted successfully!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit quiz');
      }
    } catch (error) {
      console.error('Quiz submission error:', error);
      toast.error('Failed to submit quiz');
    }
  };

  const timeSpent = Math.round((Date.now() - startTime) / 60000);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading quiz...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900">Quiz not found</div>
      </div>
    );
  }

  // Show results after submission
  if (isSubmitted) {
    const percentage = quiz.totalMarks > 0 ? Math.round((score / quiz.totalMarks) * 100) : 0;
    const passed = score >= quiz.passingMarks;

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 text-center">
                Quiz Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className={`text-6xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
                  {percentage}%
                </div>
                <Badge className={passed ? 'bg-green-100 text-green-700 border-green-200 text-lg px-4 py-1' : 'bg-red-100 text-red-700 border-red-200 text-lg px-4 py-1'}>
                  {passed ? 'PASSED' : 'FAILED'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm">Your Score</p>
                  <p className="text-2xl font-bold text-gray-900">{score}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm">Total Marks</p>
                  <p className="text-2xl font-bold text-gray-900">{quiz.totalMarks}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm">Passing Marks</p>
                  <p className="text-2xl font-bold text-gray-900">{quiz.passingMarks}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm">Time Spent</p>
                  <p className="text-2xl font-bold text-gray-900">{timeSpent} min</p>
                </div>
              </div>

                {/* Question-wise results */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Question-wise Results:</h3>
                  {quiz.questions.map((question, index) => {
                    const isCorrect = answers[index] === question.correctAnswer;
                    return (
                      <div key={index} className={`p-3 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {index + 1}. {question.questionText}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Your answer: {answers[index] || 'Not answered'}
                            </p>
                            {!isCorrect && (
                              <p className="text-xs text-green-600 mt-1">
                                Correct answer: {question.correctAnswer}
                              </p>
                            )}
                          </div>
                          <Badge className={isCorrect ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                            {isCorrect ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            {isCorrect ? 'Correct' : 'Wrong'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      if (isFullscreen) {
                        exitFullscreen();
                      }
                      router.push('/student/quizzes');
                    }}
                  >
                    Back to Quizzes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fullscreen Warning */}
      {!isFullscreen && (
        <div className="bg-red-600 text-white p-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Please enable fullscreen mode for the quiz</span>
            <Button
              onClick={enterFullscreen}
              size="sm"
              className="ml-4 bg-white text-red-600 hover:bg-gray-100"
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              Enter Fullscreen
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-tl from-[#C6151D] to-[#600A0E] text-white shadow-lg flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{quiz.title}</h1>
              <p className="text-blue-100 text-sm">Question {currentQuestion + 1} of {quiz.questions.length}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Progress */}
              <div className="flex items-center gap-2">
                <span className="text-blue-100 text-sm">Progress:</span>
                <span className="font-semibold">{answeredCount}/{quiz.questions.length}</span>
                <div className="w-24 bg-blue-500 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              {/* Timer placeholder - add timer if needed */}
              <div className="text-center">
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Copy Disabled
                </Badge>
              </div>
              {/* Submit Button */}
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(true)}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
              >
                <Flag className="h-3 w-3 mr-1" />
                Submit Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Question Card */}
          <Card className="border-gray-200 shadow-sm mb-4">
            <CardContent className="p-6">
              {/* Header */}
              <CardHeader className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-gray-900">
                    Question {currentQuestion + 1}
                  </CardTitle>
                  <Badge variant="outline">{question.marks} mark{question.marks !== 1 ? 's' : ''}</Badge>
                </div>
              </CardHeader>

              {/* Question Text */}
              <div className="mb-6">
                <p className="text-gray-900 text-lg">{question.questionText}</p>
              </div>

              {/* Options */}
              {question.questionType === 'multiple-choice' && question.options && (
                <div className="space-y-3">
                  {question.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        answers[currentQuestion] === option
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion}`}
                        value={option}
                        checked={answers[currentQuestion] === option}
                        onChange={() => handleAnswer(option)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-3 text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.questionType === 'true-false' && (
                <div className="space-y-3">
                  {['True', 'False'].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        answers[currentQuestion] === option
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion}`}
                        value={option}
                        checked={answers[currentQuestion] === option}
                        onChange={() => handleAnswer(option)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-3 text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.questionType === 'short-answer' && (
                <textarea
                  value={answers[currentQuestion] || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  rows={4}
                />
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {currentQuestion === quiz.questions.length - 1 ? (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setShowConfirmDialog(true)}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Submit Quiz
                  </Button>
                ) : (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentQuestion === quiz.questions.length - 1 ? (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < quiz.questions.length}
              >
                Submit Quiz
              </Button>
            ) : (
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                disabled={currentQuestion === quiz.questions.length - 1}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="text-center mb-6">
              <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-900">Submit Quiz?</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                You have answered <strong className="text-green-600">{answeredCount}</strong> out of <strong>{quiz.questions.length}</strong> questions.
              </p>
              {answeredCount < quiz.questions.length && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <p className="text-orange-700 text-sm">
                    Warning: You have <strong>{quiz.questions.length - answeredCount} unanswered question{quiz.questions.length - answeredCount > 1 ? 's' : ''}</strong>.
                    These will be marked as incorrect.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
              >
                Go Back to Quiz
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Yes, Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizAttempt;