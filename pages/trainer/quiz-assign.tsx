import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileQuestion, Plus, Trash2, Save, Clock, Users, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface TrainerData {
  trainerId: string;
  name: string;
  email: string;
  phone: string;
}

interface Batch {
  _id: string;
  batchId: string;
  batchName: string;
  course_title: string;
  status: string;
  studentCount: number;
}

interface Quiz {
  _id: string;
  title: string;
  batchId: string;
  questions: Question[];
  totalMarks: number;
  passingMarks: number;
  dueDate: string;
  createdAt: string;
  status?: string;
}

interface Question {
  questionText: string;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[];
  correctAnswer: string;
  marks: number;
}

const TrainerQuizAssign = () => {
  const router = useRouter();
  const [trainerData, setTrainerData] = useState<TrainerData | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

  // Quiz creation form state
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalMarks, setTotalMarks] = useState(0);
  const [passingMarks, setPassingMarks] = useState(0);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerData(trainer);
    fetchBatches(trainer.trainerId);
    fetchQuizzes();
  }, []);

  const fetchBatches = async (trainerId: string) => {
    try {
      const res = await fetch(`/api/trainer/students?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok && data.data?.batches) {
        const formattedBatches = data.data.batches.map((batch: any) => ({
          _id: batch.batchId,
          batchId: batch.batchId,
          batchName: batch.batchName || batch.course_title,
          course_title: batch.course_title,
          status: batch.status,
          studentCount: data.data.students.filter((s: any) => s.batches?.some((b: any) => b.batchId === batch.batchId)).length || 0
        }));
        setBatches(formattedBatches);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to load batches');
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/lms/quizzes');
      const data = await res.json();
      if (res.ok) {
        setQuizzes(data);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      questionText: '',
      questionType: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      marks: 1
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    calculateTotalMarks(updatedQuestions);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };

    // Reset options when changing question type
    if (field === 'questionType') {
      if (value === 'multiple-choice') {
        updatedQuestions[index].options = ['', '', '', ''];
      } else if (value === 'true-false') {
        updatedQuestions[index].options = ['True', 'False'];
      } else {
        updatedQuestions[index].options = undefined;
      }
      updatedQuestions[index].correctAnswer = '';
    }

    setQuestions(updatedQuestions);

    if (field === 'marks') {
      calculateTotalMarks(updatedQuestions);
    }
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options![optionIndex] = value;
      setQuestions(updatedQuestions);
    }
  };

  const calculateTotalMarks = (ques: Question[]) => {
    const total = ques.reduce((sum, q) => sum + (q.marks || 0), 0);
    setTotalMarks(total);
    setPassingMarks(Math.ceil(total * 0.5)); // Default 50% passing
  };

  const handleSubmitQuiz = async () => {
    if (!selectedBatch || !quizTitle || questions.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const validQuestions = questions.filter(q => q.questionText.trim() !== '');
    if (validQuestions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    setIsSubmitting(true);
    try {
      const quizData = {
        title: quizTitle,
        batchId: selectedBatch,
        questions: validQuestions,
        totalMarks,
        passingMarks,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null
      };

      const res = await fetch('/api/lms/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Quiz created and assigned successfully!');
        resetForm();
        fetchQuizzes();
        setActiveTab('manage');
      } else {
        toast.error(data.error || 'Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Failed to create quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedBatch('');
    setQuizTitle('');
    setQuestions([]);
    setTotalMarks(0);
    setPassingMarks(0);
    setDueDate('');
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      const res = await fetch(`/api/lms/quizzes?id=${quizId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Quiz deleted successfully');
        fetchQuizzes();
      } else {
        toast.error('Failed to delete quiz');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    }
  };

  const getBatchName = (batchId: string) => {
    const batch = batches.find(b => b._id === batchId);
    return batch ? batch.batchName || batch.course_title : 'Unknown Batch';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Completed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-900">Loading...</div>
      </div>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Quiz Assign</h1>
          <p className="text-green-100 mt-2">Create and assign quizzes to your students</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Plus className="inline-block w-4 h-4 mr-1" />
            Create Quiz
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'manage'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileQuestion className="inline-block w-4 h-4 mr-1" />
            Manage Quizzes
          </button>
        </div>

        {/* Create Quiz Tab */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-green-600" />
                  Create New Quiz
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Quiz Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="batch">Select Batch *</Label>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                      <SelectTrigger id="batch">
                        <SelectValue placeholder="Select a batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch._id} value={batch._id}>
                            {batch.batchName || batch.course_title} ({batch.studentCount} students)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Quiz Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter quiz title"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date (Optional)</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total Marks: {totalMarks}</Label>
                    <div className="flex items-center gap-4">
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="passingMarks">Passing Marks</Label>
                        <Input
                          id="passingMarks"
                          type="number"
                          min={0}
                          max={totalMarks}
                          value={passingMarks}
                          onChange={(e) => setPassingMarks(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Questions Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
                    <Button type="button" onClick={addQuestion} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Question
                    </Button>
                  </div>

                  {questions.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No questions added yet. Click "Add Question" to start.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((question, qIndex) => (
                        <Card key={qIndex} className="border-gray-200">
                          <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                              <span className="text-sm font-medium text-gray-600">Question {qIndex + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(qIndex)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Question Text *</Label>
                                <Textarea
                                  placeholder="Enter your question"
                                  value={question.questionText}
                                  onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Question Type</Label>
                                <Select
                                  value={question.questionType}
                                  onValueChange={(value) => updateQuestion(qIndex, 'questionType', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                    <SelectItem value="true-false">True/False</SelectItem>
                                    <SelectItem value="short-answer">Short Answer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Marks</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={question.marks}
                                  onChange={(e) => updateQuestion(qIndex, 'marks', parseInt(e.target.value) || 1)}
                                />
                              </div>
                            </div>

                            {/* Options for Multiple Choice */}
                            {question.questionType === 'multiple-choice' && question.options && (
                              <div className="space-y-2">
                                <Label>Options *</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {question.options.map((option, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`correct-${qIndex}`}
                                        checked={question.correctAnswer === option}
                                        onChange={() => updateQuestion(qIndex, 'correctAnswer', option)}
                                        className="w-4 h-4 text-green-600"
                                      />
                                      <Input
                                        placeholder={`Option ${oIndex + 1}`}
                                        value={option}
                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                      />
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500">Select the radio button next to the correct answer</p>
                              </div>
                            )}

                            {/* Options for True/False */}
                            {question.questionType === 'true-false' && (
                              <div className="space-y-2">
                                <Label>Correct Answer *</Label>
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`correct-${qIndex}`}
                                      checked={question.correctAnswer === 'True'}
                                      onChange={() => updateQuestion(qIndex, 'correctAnswer', 'True')}
                                      className="w-4 h-4 text-green-600"
                                    />
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span>True</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`correct-${qIndex}`}
                                      checked={question.correctAnswer === 'False'}
                                      onChange={() => updateQuestion(qIndex, 'correctAnswer', 'False')}
                                      className="w-4 h-4 text-red-600"
                                    />
                                    <XCircle className="w-5 h-5 text-red-600" />
                                    <span>False</span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Short Answer */}
                            {question.questionType === 'short-answer' && (
                              <div className="space-y-2">
                                <Label>Expected Answer (for reference)</Label>
                                <Textarea
                                  placeholder="Enter the expected answer"
                                  value={question.correctAnswer}
                                  onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                {questions.length > 0 && (
                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <Button variant="outline" onClick={resetForm}>
                      Reset
                    </Button>
                    <Button
                      onClick={handleSubmitQuiz}
                      disabled={isSubmitting || !selectedBatch || !quizTitle}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {isSubmitting ? 'Creating...' : 'Create & Assign Quiz'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Manage Quizzes Tab */}
        {activeTab === 'manage' && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-green-600" />
                Assigned Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {quizzes.length === 0 ? (
                <div className="text-center py-12">
                  <FileQuestion className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No quizzes assigned yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz) => (
                    <div key={quiz._id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => setExpandedQuiz(expandedQuiz === quiz._id ? null : quiz._id)}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {getBatchName(quiz.batchId)}
                            </span>
                            <span>{quiz.questions?.length || 0} questions</span>
                            <span className="flex items-center gap-1">
                              <FileQuestion className="w-4 h-4" />
                              {quiz.totalMarks} marks
                            </span>
                            {quiz.dueDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Due: {new Date(quiz.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(quiz.status || 'active')}
                          {expandedQuiz === quiz._id ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                      </div>

                      {expandedQuiz === quiz._id && (
                        <div className="p-4 bg-white border-t border-gray-200">
                          <div className="space-y-3">
                            {quiz.questions?.map((q, qIndex) => (
                              <div key={qIndex} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {qIndex + 1}. {q.questionText}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 text-sm">
                                      <Badge variant="outline" className="text-xs">
                                        {q.questionType === 'multiple-choice' ? 'MCQ' : q.questionType === 'true-false' ? 'T/F' : 'Short'}
                                      </Badge>
                                      <span className="text-gray-500">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                                    </div>
                                  </div>
                                  <div className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                                    Answer: {q.correctAnswer}
                                  </div>
                                </div>
                                {q.options && q.questionType === 'multiple-choice' && (
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    {q.options.map((opt, oIndex) => (
                                      <div
                                        key={oIndex}
                                        className={`text-sm px-2 py-1 rounded ${
                                          q.correctAnswer === opt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}
                                      >
                                        {opt}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteQuiz(quiz._id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete Quiz
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TrainerLayout>
  );
};

export default TrainerQuizAssign;