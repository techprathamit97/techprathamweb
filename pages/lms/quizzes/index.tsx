import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Target,
  Award,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Quiz {
  _id: string;
  title: string;
  category: string;
  description: string;
  quizType?: 'single_step' | 'multi_step';
  steps?: Array<{
    _id: string;
    stepNumber: number;
    stepTitle: string;
    stepDescription: string;
    timing: number;
    passingMarks: number;
    questions: Array<{
      _id: string;
      questionText: string;
      questionType: 'multiple_choice' | 'true_false';
      options?: Array<{ text: string; isCorrect: boolean }>;
      correctAnswer?: boolean;
      explanation: string;
      marks: number;
    }>;
    isActive: boolean;
  }>;
  timing?: number;
  passingMarks?: number;
  maxMarks?: number;
  eachQuestionMarks: number;
  negativeMarking: {
    enabled: boolean;
    marksDeducted: number;
  };
  questions?: Array<{
    _id: string;
    questionText: string;
    questionType: 'multiple_choice' | 'true_false';
    options?: Array<{ text: string; isCorrect: boolean }>;
    correctAnswer?: boolean;
    explanation: string;
    marks: number;
  }>;
  allowStepNavigation?: boolean;
  requireSequentialCompletion?: boolean;
  showStepResults?: boolean;
  overallPassingPercentage?: number;
  totalQuestions: number;
  passingPercentage: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

const QuizManagement = () => {
  const router = useRouter();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    category: '',
    description: '',
    quizType: 'single_step' as 'single_step' | 'multi_step',
    // Single-step fields
    timing: 30,
    passingMarks: 70,
    questions: [{
      questionText: '',
      questionType: 'multiple_choice' as 'multiple_choice' | 'true_false',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      correctAnswer: false,
      explanation: '',
      marks: 1
    }],
    // Multi-step fields
    steps: [{
      stepNumber: 1,
      stepTitle: '',
      stepDescription: '',
      timing: 15,
      passingMarks: 70,
      questions: [{
        questionText: '',
        questionType: 'multiple_choice' as 'multiple_choice' | 'true_false',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        correctAnswer: false,
        explanation: '',
        marks: 1
      }],
      isActive: true
    }],
    // Common fields
    eachQuestionMarks: 1,
    negativeMarking: {
      enabled: false,
      marksDeducted: 0
    },
    // Multi-step settings
    allowStepNavigation: false,
    requireSequentialCompletion: true,
    showStepResults: false,
    overallPassingPercentage: 70
  });

  const fetchQuizzes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/quiz');
      const data = await res.json();
      
      if (res.ok) {
        setQuizzes(Array.isArray(data) ? data : []);
      } else {
        throw new Error(data.error || 'Failed to fetch quizzes');
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
      toast.error('Failed to fetch quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/category/fetch');
      const data = await res.json();
      if (res.ok) {
        setCourses(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleCreateQuiz = async () => {
    try {
      const quizData: any = {
        title: newQuiz.title,
        category: newQuiz.category,
        description: newQuiz.description,
        quizType: newQuiz.quizType,
        eachQuestionMarks: newQuiz.eachQuestionMarks,
        negativeMarking: newQuiz.negativeMarking,
        createdBy: 'admin'
      };

      // Add type-specific fields
      if (newQuiz.quizType === 'multi_step') {
        quizData.steps = newQuiz.steps;
        quizData.allowStepNavigation = newQuiz.allowStepNavigation;
        quizData.requireSequentialCompletion = newQuiz.requireSequentialCompletion;
        quizData.showStepResults = newQuiz.showStepResults;
        quizData.overallPassingPercentage = newQuiz.overallPassingPercentage;
      } else {
        // Single-step quiz
        quizData.timing = newQuiz.timing;
        quizData.passingMarks = newQuiz.passingMarks;
        quizData.maxMarks = newQuiz.questions.length * newQuiz.eachQuestionMarks;
        quizData.questions = newQuiz.questions;
      }

      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });

      if (res.ok) {
        toast.success('Quiz created successfully');
        setIsCreateDialogOpen(false);
        fetchQuizzes();
        // Reset form
        setNewQuiz({
          title: '',
          category: '',
          description: '',
          quizType: 'single_step',
          timing: 30,
          passingMarks: 70,
          questions: [{
            questionText: '',
            questionType: 'multiple_choice',
            options: [
              { text: '', isCorrect: false },
              { text: '', isCorrect: false },
              { text: '', isCorrect: false },
              { text: '', isCorrect: false }
            ],
            correctAnswer: false,
            explanation: '',
            marks: 1
          }],
          steps: [{
            stepNumber: 1,
            stepTitle: '',
            stepDescription: '',
            timing: 15,
            passingMarks: 70,
            questions: [{
              questionText: '',
              questionType: 'multiple_choice',
              options: [
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
              ],
              correctAnswer: false,
              explanation: '',
              marks: 1
            }],
            isActive: true
          }],
          eachQuestionMarks: 1,
          negativeMarking: {
            enabled: false,
            marksDeducted: 0
          },
          allowStepNavigation: false,
          requireSequentialCompletion: true,
          showStepResults: false,
          overallPassingPercentage: 70
        });
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create quiz');
      }
    } catch (error: any) {
      console.error('Failed to create quiz:', error);
      toast.error(error.message || 'Failed to create quiz');
    }
  };

  const addQuestion = () => {
    if (newQuiz.quizType === 'single_step') {
      setNewQuiz(prev => ({
        ...prev,
        questions: [...prev.questions, {
          questionText: '',
          questionType: 'multiple_choice',
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ],
          correctAnswer: false,
          explanation: '',
          marks: prev.eachQuestionMarks
        }]
      }));
    }
  };

  // Multi-step helper functions
  const addStep = () => {
    setNewQuiz(prev => ({
      ...prev,
      steps: [...prev.steps, {
        stepNumber: prev.steps.length + 1,
        stepTitle: '',
        stepDescription: '',
        timing: 15,
        passingMarks: 70,
        questions: [{
          questionText: '',
          questionType: 'multiple_choice',
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ],
          correctAnswer: false,
          explanation: '',
          marks: prev.eachQuestionMarks
        }],
        isActive: true
      }]
    }));
  };

  const addQuestionToStep = (stepIndex: number) => {
    setNewQuiz(prev => ({
      ...prev,
      steps: prev.steps.map((step, index) => 
        index === stepIndex ? {
          ...step,
          questions: [...step.questions, {
            questionText: '',
            questionType: 'multiple_choice',
            options: [
              { text: '', isCorrect: false },
              { text: '', isCorrect: false },
              { text: '', isCorrect: false },
              { text: '', isCorrect: false }
            ],
            correctAnswer: false,
            explanation: '',
            marks: prev.eachQuestionMarks
          }]
        } : step
      )
    }));
  };

  const updateStep = (stepIndex: number, field: string, value: any) => {
    setNewQuiz(prev => ({
      ...prev,
      steps: prev.steps.map((step, index) => 
        index === stepIndex ? { ...step, [field]: value } : step
      )
    }));
  };

  const updateStepQuestion = (stepIndex: number, questionIndex: number, field: string, value: any) => {
    setNewQuiz(prev => ({
      ...prev,
      steps: prev.steps.map((step, sIndex) => 
        sIndex === stepIndex ? {
          ...step,
          questions: step.questions.map((q, qIndex) => {
            if (qIndex === questionIndex) {
              if (field === 'questionType' && value === 'true_false') {
                return {
                  ...q,
                  [field]: value,
                  options: [],
                  correctAnswer: false
                };
              } else if (field === 'questionType' && value === 'multiple_choice') {
                return {
                  ...q,
                  [field]: value,
                  options: [
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false }
                  ],
                  correctAnswer: false
                };
              }
              return { ...q, [field]: value };
            }
            return q;
          })
        } : step
      )
    }));
  };

  const updateStepQuestionOption = (stepIndex: number, questionIndex: number, optionIndex: number, field: string, value: any) => {
    setNewQuiz(prev => ({
      ...prev,
      steps: prev.steps.map((step, sIndex) => 
        sIndex === stepIndex ? {
          ...step,
          questions: step.questions.map((q, qIndex) => 
            qIndex === questionIndex ? {
              ...q,
              options: q.options?.map((opt, oIndex) => 
                oIndex === optionIndex ? { ...opt, [field]: value } : opt
              ) || []
            } : q
          )
        } : step
      )
    }));
  };

  const setStepCorrectOption = (stepIndex: number, questionIndex: number, correctOptionIndex: number) => {
    setNewQuiz(prev => ({
      ...prev,
      steps: prev.steps.map((step, sIndex) => 
        sIndex === stepIndex ? {
          ...step,
          questions: step.questions.map((q, qIndex) => 
            qIndex === questionIndex ? {
              ...q,
              options: q.options?.map((opt, oIndex) => ({
                ...opt,
                isCorrect: oIndex === correctOptionIndex
              })) || []
            } : q
          )
        } : step
      )
    }));
  };

  const removeStep = (stepIndex: number) => {
    if (newQuiz.steps.length > 1) {
      setNewQuiz(prev => ({
        ...prev,
        steps: prev.steps.filter((_, index) => index !== stepIndex)
          .map((step, index) => ({ ...step, stepNumber: index + 1 }))
      }));
    }
  };

  const removeQuestionFromStep = (stepIndex: number, questionIndex: number) => {
    setNewQuiz(prev => ({
      ...prev,
      steps: prev.steps.map((step, sIndex) => 
        sIndex === stepIndex && step.questions.length > 1 ? {
          ...step,
          questions: step.questions.filter((_, qIndex) => qIndex !== questionIndex)
        } : step
      )
    }));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === index) {
          if (field === 'questionType' && value === 'true_false') {
            // Reset options when switching to true/false
            return {
              ...q,
              [field]: value,
              options: [],
              correctAnswer: false
            };
          } else if (field === 'questionType' && value === 'multiple_choice') {
            // Reset to multiple choice format
            return {
              ...q,
              [field]: value,
              options: [
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
              ],
              correctAnswer: false
            };
          }
          return { ...q, [field]: value };
        }
        return q;
      })
    }));
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, field: string, value: any) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex ? {
          ...q,
          options: q.options?.map((opt, j) => 
            j === optionIndex ? { ...opt, [field]: value } : opt
          ) || []
        } : q
      )
    }));
  };

  const setCorrectOption = (questionIndex: number, correctOptionIndex: number) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex ? {
          ...q,
          options: q.options?.map((opt, j) => ({
            ...opt,
            isCorrect: j === correctOptionIndex
          })) || []
        } : q
      )
    }));
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setNewQuiz({
      title: quiz.title,
      category: quiz.category,
      description: quiz.description,
      quizType: quiz.quizType || 'single_step',
      timing: quiz.timing || 30,
      passingMarks: quiz.passingMarks || 70,
      eachQuestionMarks: quiz.eachQuestionMarks,
      negativeMarking: quiz.negativeMarking,
      questions: quiz.questions?.map(q => ({
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options || [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        correctAnswer: q.correctAnswer || false,
        explanation: q.explanation,
        marks: q.marks
      })) || [{
        questionText: '',
        questionType: 'multiple_choice',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        correctAnswer: false,
        explanation: '',
        marks: 1
      }],
      steps: quiz.steps?.map(step => ({
        stepNumber: step.stepNumber,
        stepTitle: step.stepTitle,
        stepDescription: step.stepDescription,
        timing: step.timing,
        passingMarks: step.passingMarks,
        questions: step.questions.map(q => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options || [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ],
          correctAnswer: q.correctAnswer || false,
          explanation: q.explanation,
          marks: q.marks
        })),
        isActive: step.isActive
      })) || [{
        stepNumber: 1,
        stepTitle: '',
        stepDescription: '',
        timing: 15,
        passingMarks: 70,
        questions: [{
          questionText: '',
          questionType: 'multiple_choice',
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ],
          correctAnswer: false,
          explanation: '',
          marks: 1
        }],
        isActive: true
      }],
      allowStepNavigation: quiz.allowStepNavigation || false,
      requireSequentialCompletion: quiz.requireSequentialCompletion !== false,
      showStepResults: quiz.showStepResults || false,
      overallPassingPercentage: quiz.overallPassingPercentage || 70
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateQuiz = async () => {
    if (!editingQuiz) return;
    
    try {
      const quizData: any = {
        title: newQuiz.title,
        category: newQuiz.category,
        description: newQuiz.description,
        quizType: newQuiz.quizType,
        eachQuestionMarks: newQuiz.eachQuestionMarks,
        negativeMarking: newQuiz.negativeMarking
      };

      // Add type-specific fields
      if (newQuiz.quizType === 'multi_step') {
        quizData.steps = newQuiz.steps;
        quizData.allowStepNavigation = newQuiz.allowStepNavigation;
        quizData.requireSequentialCompletion = newQuiz.requireSequentialCompletion;
        quizData.showStepResults = newQuiz.showStepResults;
        quizData.overallPassingPercentage = newQuiz.overallPassingPercentage;
      } else {
        // Single-step quiz
        quizData.timing = newQuiz.timing;
        quizData.passingMarks = newQuiz.passingMarks;
        quizData.maxMarks = newQuiz.questions.length * newQuiz.eachQuestionMarks;
        quizData.questions = newQuiz.questions;
      }

      const res = await fetch(`/api/quiz/${editingQuiz._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });

      if (res.ok) {
        toast.success('Quiz updated successfully');
        setIsEditDialogOpen(false);
        setEditingQuiz(null);
        fetchQuizzes();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update quiz');
      }
    } catch (error: any) {
      console.error('Failed to update quiz:', error);
      toast.error(error.message || 'Failed to update quiz');
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    
    try {
      const res = await fetch(`/api/quiz/${quizToDelete._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Quiz deleted successfully');
        setIsDeleteDialogOpen(false);
        setQuizToDelete(null);
        fetchQuizzes();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete quiz');
      }
    } catch (error: any) {
      console.error('Failed to delete quiz:', error);
      toast.error(error.message || 'Failed to delete quiz');
    }
  };

  const removeQuestion = (index: number) => {
    if (newQuiz.questions.length > 1) {
      setNewQuiz(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      }));
    }
  };

  const stats = {
    totalQuizzes: quizzes.length,
    activeQuizzes: quizzes.filter(q => q.isActive).length,
    totalQuestions: quizzes.reduce((sum, q) => {
      if (q.quizType === 'multi_step' && q.steps) {
        return sum + q.steps.reduce((stepSum, step) => stepSum + step.questions.length, 0);
      }
      return sum + (q.totalQuestions || q.questions?.length || 0);
    }, 0),
    avgDuration: quizzes.length > 0 ? 
      Math.round(quizzes.reduce((sum, q) => {
        if (q.quizType === 'multi_step' && q.steps) {
          return sum + q.steps.reduce((stepSum, step) => stepSum + step.timing, 0);
        }
        return sum + (q.timing || 0);
      }, 0) / quizzes.length) : 0
  };

  useEffect(() => {
    fetchQuizzes();
      fetchCourses();
    }, []);

  

  

  

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Quiz Management</h1>
            <p className="text-gray-400 mt-2">Create and manage course assessments</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="manual" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Quiz</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Quiz Title</Label>
                    <Input
                      value={newQuiz.title}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter quiz title"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">Category</Label>
                    <Select 
                      value={newQuiz.category} 
                      onValueChange={(value) => setNewQuiz(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {courses.map((course: any) => (
                          <SelectItem key={course.name} value={course.name}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-white">Description</Label>
                  <Textarea
                    value={newQuiz.description}
                    onChange={(e) => setNewQuiz(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Quiz description"
                  />
                </div>

                {/* Quiz Type Selector */}
                <div>
                  <Label className="text-white">Quiz Type</Label>
                  <Select 
                    value={newQuiz.quizType} 
                    onValueChange={(value: 'single_step' | 'multi_step') => setNewQuiz(prev => ({ ...prev, quizType: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select quiz type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="single_step">Single Step Quiz</SelectItem>
                      <SelectItem value="multi_step">Multi-Step Quiz (Module Based)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Common Settings - only show for single step */}
                {newQuiz.quizType === 'single_step' && (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-white">Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={newQuiz.timing}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, timing: parseInt(e.target.value) || 30 }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">Passing Marks (%)</Label>
                    <Input
                      type="number"
                      value={newQuiz.passingMarks}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, passingMarks: parseInt(e.target.value) || 70 }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">Each Question Marks</Label>
                    <Input
                      type="number"
                      value={newQuiz.eachQuestionMarks}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, eachQuestionMarks: parseInt(e.target.value) || 1 }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Negative Marking</Label>
                    <Select 
                      value={newQuiz.negativeMarking.enabled.toString()} 
                      onValueChange={(value) => setNewQuiz(prev => ({ 
                        ...prev, 
                        negativeMarking: { 
                          ...prev.negativeMarking, 
                          enabled: value === 'true' 
                        } 
                      }))}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newQuiz.negativeMarking.enabled && (
                  <div>
                    <Label className="text-white">Marks Deducted (per wrong answer)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newQuiz.negativeMarking.marksDeducted}
                      onChange={(e) => setNewQuiz(prev => ({ 
                        ...prev, 
                        negativeMarking: { 
                          ...prev.negativeMarking, 
                          marksDeducted: parseFloat(e.target.value) || 0 
                        } 
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="e.g., 0.25"
                    />
                  </div>
                )}
                  </>
                )}

                {/* Multi-step Settings */}
                {newQuiz.quizType === 'multi_step' && (
                  <div className="space-y-4 p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-white font-semibold">Multi-Step Settings</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-white">Overall Passing Percentage</Label>
                        <Input
                          type="number"
                          value={newQuiz.overallPassingPercentage}
                          onChange={(e) => setNewQuiz(prev => ({ ...prev, overallPassingPercentage: parseInt(e.target.value) || 70 }))}
                          className="bg-gray-600 border-gray-500 text-white"
                          placeholder="70"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Each Question Marks</Label>
                        <Input
                          type="number"
                          value={newQuiz.eachQuestionMarks}
                          onChange={(e) => setNewQuiz(prev => ({ ...prev, eachQuestionMarks: parseInt(e.target.value) || 1 }))}
                          className="bg-gray-600 border-gray-500 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Allow Step Navigation</Label>
                        <Select 
                          value={newQuiz.allowStepNavigation?.toString() || 'false'} 
                          onValueChange={(value) => setNewQuiz(prev => ({ ...prev, allowStepNavigation: value === 'true' }))}
                        >
                          <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-600 border-gray-500">
                            <SelectItem value="false">No - Sequential Only</SelectItem>
                            <SelectItem value="true">Yes - Allow Navigation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Negative Marking</Label>
                        <Select 
                          value={newQuiz.negativeMarking.enabled.toString()} 
                          onValueChange={(value) => setNewQuiz(prev => ({ 
                            ...prev, 
                            negativeMarking: { 
                              ...prev.negativeMarking, 
                              enabled: value === 'true' 
                            } 
                          }))}
                        >
                          <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-600 border-gray-500">
                            <SelectItem value="false">No</SelectItem>
                            <SelectItem value="true">Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newQuiz.negativeMarking.enabled && (
                        <div>
                          <Label className="text-white">Marks Deducted (per wrong answer)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={newQuiz.negativeMarking.marksDeducted}
                            onChange={(e) => setNewQuiz(prev => ({ 
                              ...prev, 
                              negativeMarking: { 
                                ...prev.negativeMarking, 
                                marksDeducted: parseFloat(e.target.value) || 0 
                              } 
                            }))}
                            className="bg-gray-600 border-gray-500 text-white"
                            placeholder="e.g., 0.25"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Steps/Questions Section */}
                {newQuiz.quizType === 'multi_step' ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-white text-lg">Quiz Steps/Modules</Label>
                      <Button type="button" onClick={addStep} size="sm" variant="outline">
                        Add Step
                      </Button>
                    </div>
                    
                    {newQuiz.steps.map((step, stepIndex) => (
                      <Card key={stepIndex} className="bg-gray-700 border-gray-600">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <Label className="text-white font-semibold">Step {step.stepNumber}: {step.stepTitle || 'Untitled Step'}</Label>
                            {newQuiz.steps.length > 1 && (
                              <Button 
                                type="button" 
                                onClick={() => removeStep(stepIndex)}
                                size="sm" 
                                variant="outline"
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-white">Step Title</Label>
                              <Input
                                value={step.stepTitle}
                                onChange={(e) => updateStep(stepIndex, 'stepTitle', e.target.value)}
                                className="bg-gray-600 border-gray-500 text-white"
                                placeholder="e.g., Organization Management"
                              />
                            </div>
                            <div>
                              <Label className="text-white">Duration (minutes)</Label>
                              <Input
                                type="number"
                                value={step.timing}
                                onChange={(e) => updateStep(stepIndex, 'timing', parseInt(e.target.value) || 15)}
                                className="bg-gray-600 border-gray-500 text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-white">Step Description</Label>
                              <Textarea
                                value={step.stepDescription}
                                onChange={(e) => updateStep(stepIndex, 'stepDescription', e.target.value)}
                                className="bg-gray-600 border-gray-500 text-white"
                                placeholder="Brief description of this step"
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label className="text-white">Passing Marks (%)</Label>
                              <Input
                                type="number"
                                value={step.passingMarks}
                                onChange={(e) => updateStep(stepIndex, 'passingMarks', parseInt(e.target.value) || 70)}
                                className="bg-gray-600 border-gray-500 text-white"
                              />
                            </div>
                          </div>

                          {/* Questions for this step */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <Label className="text-white">Questions for this Step ({step.questions.length} questions)</Label>
                              <Button 
                                type="button" 
                                onClick={() => addQuestionToStep(stepIndex)} 
                                size="sm" 
                                variant="outline"
                              >
                                Add Question
                              </Button>
                            </div>
                            
                            {step.questions.map((question, qIndex) => (
                              <Card key={qIndex} className="bg-gray-600 border-gray-500">
                                <CardContent className="p-3 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-white text-sm">Question {qIndex + 1}</Label>
                                    {step.questions.length > 1 && (
                                      <Button 
                                        type="button" 
                                        onClick={() => removeQuestionFromStep(stepIndex, qIndex)}
                                        size="sm" 
                                        variant="outline"
                                        className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  
                                  <Textarea
                                    value={question.questionText}
                                    onChange={(e) => updateStepQuestion(stepIndex, qIndex, 'questionText', e.target.value)}
                                    className="bg-gray-500 border-gray-400 text-white text-sm"
                                    placeholder="Enter question"
                                    rows={2}
                                  />

                                  <div>
                                    <Label className="text-white text-sm">Question Type</Label>
                                    <Select 
                                      value={question.questionType} 
                                      onValueChange={(value) => updateStepQuestion(stepIndex, qIndex, 'questionType', value)}
                                    >
                                      <SelectTrigger className="bg-gray-500 border-gray-400 text-white h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-gray-500 border-gray-400">
                                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                        <SelectItem value="true_false">True/False</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {question.questionType === 'multiple_choice' ? (
                                    <>
                                      <div className="grid grid-cols-2 gap-2">
                                        {question.options?.map((option, oIndex) => (
                                          <div key={oIndex}>
                                            <Label className="text-white text-xs">Option {oIndex + 1}</Label>
                                            <Input
                                              value={option.text}
                                              onChange={(e) => updateStepQuestionOption(stepIndex, qIndex, oIndex, 'text', e.target.value)}
                                              className="bg-gray-500 border-gray-400 text-white text-sm h-8"
                                              placeholder={`Option ${oIndex + 1}`}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-white text-sm">Correct Answer</Label>
                                        <Select 
                                          value={question.options?.findIndex(opt => opt.isCorrect)?.toString() || ''} 
                                          onValueChange={(value) => setStepCorrectOption(stepIndex, qIndex, parseInt(value))}
                                        >
                                          <SelectTrigger className="bg-gray-500 border-gray-400 text-white h-8">
                                            <SelectValue placeholder="Select correct option" />
                                          </SelectTrigger>
                                          <SelectContent className="bg-gray-500 border-gray-400">
                                            {question.options?.map((_, index) => (
                                              <SelectItem key={index} value={index.toString()}>
                                                Option {index + 1}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </>
                                  ) : (
                                    <div>
                                      <Label className="text-white text-sm">Correct Answer</Label>
                                      <Select 
                                        value={question.correctAnswer?.toString() || ''} 
                                        onValueChange={(value) => updateStepQuestion(stepIndex, qIndex, 'correctAnswer', value === 'true')}
                                      >
                                        <SelectTrigger className="bg-gray-500 border-gray-400 text-white h-8">
                                          <SelectValue placeholder="Select correct answer" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-500 border-gray-400">
                                          <SelectItem value="true">True</SelectItem>
                                          <SelectItem value="false">False</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  <div>
                                    <Label className="text-white text-sm">Explanation (Optional)</Label>
                                    <Textarea
                                      value={question.explanation}
                                      onChange={(e) => updateStepQuestion(stepIndex, qIndex, 'explanation', e.target.value)}
                                      className="bg-gray-500 border-gray-400 text-white text-sm"
                                      placeholder="Explain why this is the correct answer"
                                      rows={2}
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  /* Single Step Questions */
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-white text-lg">Questions</Label>
                      <Button type="button" onClick={addQuestion} size="sm" variant="outline">
                        Add Question
                      </Button>
                    </div>
                    
                    {newQuiz.questions.map((question, qIndex) => (
                      <Card key={qIndex} className="bg-gray-700 border-gray-600">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <Label className="text-white">Question {qIndex + 1}</Label>
                            {newQuiz.questions.length > 1 && (
                              <Button 
                                type="button" 
                                onClick={() => removeQuestion(qIndex)}
                                size="sm" 
                                variant="outline"
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          
                          <Textarea
                            value={question.questionText}
                            onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                            className="bg-gray-600 border-gray-500 text-white"
                            placeholder="Enter question"
                          />

                          <div>
                            <Label className="text-white">Question Type</Label>
                            <Select 
                              value={question.questionType} 
                              onValueChange={(value) => updateQuestion(qIndex, 'questionType', value)}
                            >
                              <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-600 border-gray-500">
                                <SelectItem value="multiple_choice">Multiple Choice (4 options)</SelectItem>
                                <SelectItem value="true_false">True/False</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {question.questionType === 'multiple_choice' ? (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                {question.options?.map((option, oIndex) => (
                                  <div key={oIndex}>
                                    <Label className="text-white">Option {oIndex + 1}</Label>
                                    <Input
                                      value={option.text}
                                      onChange={(e) => updateQuestionOption(qIndex, oIndex, 'text', e.target.value)}
                                      className="bg-gray-600 border-gray-500 text-white"
                                      placeholder={`Option ${oIndex + 1}`}
                                    />
                                  </div>
                                ))}
                              </div>
                              
                              <div>
                                <Label className="text-white">Correct Answer</Label>
                                <Select 
                                  value={question.options?.findIndex(opt => opt.isCorrect)?.toString() || ''} 
                                  onValueChange={(value) => setCorrectOption(qIndex, parseInt(value))}
                                >
                                  <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                                    <SelectValue placeholder="Select correct option" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-600 border-gray-500">
                                    {question.options?.map((_, index) => (
                                      <SelectItem key={index} value={index.toString()}>
                                        Option {index + 1}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          ) : (
                            <div>
                              <Label className="text-white">Correct Answer</Label>
                              <Select 
                                value={question.correctAnswer?.toString() || ''} 
                                onValueChange={(value) => updateQuestion(qIndex, 'correctAnswer', value === 'true')}
                              >
                                <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                                  <SelectValue placeholder="Select correct answer" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-600 border-gray-500">
                                  <SelectItem value="true">True</SelectItem>
                                  <SelectItem value="false">False</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div>
                            <Label className="text-white">Explanation (Optional)</Label>
                            <Textarea
                              value={question.explanation}
                              onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                              className="bg-gray-600 border-gray-500 text-white"
                              placeholder="Explain why this is the correct answer"
                              rows={2}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="manual" 
                  onClick={handleCreateQuiz}
                  disabled={
                    !newQuiz.title || 
                    !newQuiz.category || 
                    (newQuiz.quizType === 'single_step' 
                      ? newQuiz.questions.some(q => !q.questionText)
                      : newQuiz.steps.some(step => 
                          !step.stepTitle || 
                          step.questions.some(q => !q.questionText)
                        )
                    )
                  }
                >
                  Create Quiz
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Quiz Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Edit Quiz</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Quiz Title</Label>
                    <Input
                      value={newQuiz.title}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter quiz title"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">Category</Label>
                    <Select 
                      value={newQuiz.category} 
                      onValueChange={(value) => setNewQuiz(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {courses.map((course: any) => (
                          <SelectItem key={course.name} value={course.name}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-white">Description</Label>
                  <Textarea
                    value={newQuiz.description}
                    onChange={(e) => setNewQuiz(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Quiz description"
                  />
                </div>

                {/* Common Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Each Question Marks</Label>
                    <Input
                      type="number"
                      value={newQuiz.eachQuestionMarks}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, eachQuestionMarks: parseInt(e.target.value) || 1 }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Negative Marking</Label>
                    <Select 
                      value={newQuiz.negativeMarking.enabled.toString()} 
                      onValueChange={(value) => setNewQuiz(prev => ({ 
                        ...prev, 
                        negativeMarking: { 
                          ...prev.negativeMarking, 
                          enabled: value === 'true' 
                        } 
                      }))}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Single-step specific fields */}
                {newQuiz.quizType === 'single_step' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={newQuiz.timing}
                        onChange={(e) => setNewQuiz(prev => ({ ...prev, timing: parseInt(e.target.value) || 30 }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white">Passing Marks (%)</Label>
                      <Input
                        type="number"
                        value={newQuiz.passingMarks}
                        onChange={(e) => setNewQuiz(prev => ({ ...prev, passingMarks: parseInt(e.target.value) || 70 }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Multi-step specific fields */}
                {newQuiz.quizType === 'multi_step' && (
                  <div className="space-y-4 p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-white font-semibold">Multi-Step Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Overall Passing Percentage</Label>
                        <Input
                          type="number"
                          value={newQuiz.overallPassingPercentage}
                          onChange={(e) => setNewQuiz(prev => ({ ...prev, overallPassingPercentage: parseInt(e.target.value) || 70 }))}
                          className="bg-gray-600 border-gray-500 text-white"
                          placeholder="70"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Allow Step Navigation</Label>
                        <Select 
                          value={newQuiz.allowStepNavigation?.toString() || 'false'} 
                          onValueChange={(value) => setNewQuiz(prev => ({ ...prev, allowStepNavigation: value === 'true' }))}
                        >
                          <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-600 border-gray-500">
                            <SelectItem value="false">No - Sequential Only</SelectItem>
                            <SelectItem value="true">Yes - Allow Navigation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {newQuiz.negativeMarking.enabled && (
                  <div>
                    <Label className="text-white">Marks Deducted (per wrong answer)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newQuiz.negativeMarking.marksDeducted}
                      onChange={(e) => setNewQuiz(prev => ({ 
                        ...prev, 
                        negativeMarking: { 
                          ...prev.negativeMarking, 
                          marksDeducted: parseFloat(e.target.value) || 0 
                        } 
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="e.g., 0.25"
                    />
                  </div>
                )}

                {/* Steps/Questions Section - Conditional based on quiz type */}
                {newQuiz.quizType === 'multi_step' ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-white text-lg">Quiz Steps/Modules</Label>
                      <Button type="button" onClick={addStep} size="sm" variant="outline">
                        Add Step
                      </Button>
                    </div>
                    
                    {newQuiz.steps.map((step, stepIndex) => (
                      <Card key={stepIndex} className="bg-gray-700 border-gray-600">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <Label className="text-white font-semibold">Step {step.stepNumber}: {step.stepTitle || 'Untitled Step'}</Label>
                            {newQuiz.steps.length > 1 && (
                              <Button 
                                type="button" 
                                onClick={() => removeStep(stepIndex)}
                                size="sm" 
                                variant="outline"
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-white">Step Title</Label>
                              <Input
                                value={step.stepTitle}
                                onChange={(e) => updateStep(stepIndex, 'stepTitle', e.target.value)}
                                className="bg-gray-600 border-gray-500 text-white"
                                placeholder="e.g., Organization Management"
                              />
                            </div>
                            <div>
                              <Label className="text-white">Duration (minutes)</Label>
                              <Input
                                type="number"
                                value={step.timing}
                                onChange={(e) => updateStep(stepIndex, 'timing', parseInt(e.target.value) || 15)}
                                className="bg-gray-600 border-gray-500 text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-white">Step Description</Label>
                              <Textarea
                                value={step.stepDescription}
                                onChange={(e) => updateStep(stepIndex, 'stepDescription', e.target.value)}
                                className="bg-gray-600 border-gray-500 text-white"
                                placeholder="Brief description of this step"
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label className="text-white">Passing Marks (%)</Label>
                              <Input
                                type="number"
                                value={step.passingMarks}
                                onChange={(e) => updateStep(stepIndex, 'passingMarks', parseInt(e.target.value) || 70)}
                                className="bg-gray-600 border-gray-500 text-white"
                              />
                            </div>
                          </div>

                          {/* Questions for this step */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <Label className="text-white">Questions for this Step ({step.questions.length} questions)</Label>
                              <Button 
                                type="button" 
                                onClick={() => addQuestionToStep(stepIndex)} 
                                size="sm" 
                                variant="outline"
                              >
                                Add Question
                              </Button>
                            </div>
                            
                            {step.questions.map((question, qIndex) => (
                              <Card key={qIndex} className="bg-gray-600 border-gray-500">
                                <CardContent className="p-3 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-white text-sm">Question {qIndex + 1}</Label>
                                    {step.questions.length > 1 && (
                                      <Button 
                                        type="button" 
                                        onClick={() => removeQuestionFromStep(stepIndex, qIndex)}
                                        size="sm" 
                                        variant="outline"
                                        className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  
                                  <Textarea
                                    value={question.questionText}
                                    onChange={(e) => updateStepQuestion(stepIndex, qIndex, 'questionText', e.target.value)}
                                    className="bg-gray-500 border-gray-400 text-white text-sm"
                                    placeholder="Enter question"
                                    rows={2}
                                  />

                                  <div>
                                    <Label className="text-white text-sm">Question Type</Label>
                                    <Select 
                                      value={question.questionType} 
                                      onValueChange={(value) => updateStepQuestion(stepIndex, qIndex, 'questionType', value)}
                                    >
                                      <SelectTrigger className="bg-gray-500 border-gray-400 text-white h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-gray-500 border-gray-400">
                                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                        <SelectItem value="true_false">True/False</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {question.questionType === 'multiple_choice' ? (
                                    <>
                                      <div className="grid grid-cols-2 gap-2">
                                        {question.options?.map((option, oIndex) => (
                                          <div key={oIndex}>
                                            <Label className="text-white text-xs">Option {oIndex + 1}</Label>
                                            <Input
                                              value={option.text}
                                              onChange={(e) => updateStepQuestionOption(stepIndex, qIndex, oIndex, 'text', e.target.value)}
                                              className="bg-gray-500 border-gray-400 text-white text-sm h-8"
                                              placeholder={`Option ${oIndex + 1}`}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-white text-sm">Correct Answer</Label>
                                        <Select 
                                          value={question.options?.findIndex(opt => opt.isCorrect)?.toString() || ''} 
                                          onValueChange={(value) => setStepCorrectOption(stepIndex, qIndex, parseInt(value))}
                                        >
                                          <SelectTrigger className="bg-gray-500 border-gray-400 text-white h-8">
                                            <SelectValue placeholder="Select correct option" />
                                          </SelectTrigger>
                                          <SelectContent className="bg-gray-500 border-gray-400">
                                            {question.options?.map((_, index) => (
                                              <SelectItem key={index} value={index.toString()}>
                                                Option {index + 1}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </>
                                  ) : (
                                    <div>
                                      <Label className="text-white text-sm">Correct Answer</Label>
                                      <Select 
                                        value={question.correctAnswer?.toString() || ''} 
                                        onValueChange={(value) => updateStepQuestion(stepIndex, qIndex, 'correctAnswer', value === 'true')}
                                      >
                                        <SelectTrigger className="bg-gray-500 border-gray-400 text-white h-8">
                                          <SelectValue placeholder="Select correct answer" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-500 border-gray-400">
                                          <SelectItem value="true">True</SelectItem>
                                          <SelectItem value="false">False</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  <div>
                                    <Label className="text-white text-sm">Explanation (Optional)</Label>
                                    <Textarea
                                      value={question.explanation}
                                      onChange={(e) => updateStepQuestion(stepIndex, qIndex, 'explanation', e.target.value)}
                                      className="bg-gray-500 border-gray-400 text-white text-sm"
                                      placeholder="Explain why this is the correct answer"
                                      rows={2}
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  /* Single Step Questions */
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-white text-lg">Questions</Label>
                      <Button type="button" onClick={addQuestion} size="sm" variant="outline">
                        Add Question
                      </Button>
                    </div>
                    
                    {newQuiz.questions.map((question, qIndex) => (
                      <Card key={qIndex} className="bg-gray-700 border-gray-600">
                        <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-white">Question {qIndex + 1}</Label>
                          {newQuiz.questions.length > 1 && (
                            <Button 
                              type="button" 
                              onClick={() => removeQuestion(qIndex)}
                              size="sm" 
                              variant="outline"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        <Textarea
                          value={question.questionText}
                          onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                          className="bg-gray-600 border-gray-500 text-white"
                          placeholder="Enter question"
                        />

                        <div>
                          <Label className="text-white">Question Type</Label>
                          <Select 
                            value={question.questionType} 
                            onValueChange={(value) => updateQuestion(qIndex, 'questionType', value)}
                          >
                            <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-600 border-gray-500">
                              <SelectItem value="multiple_choice">Multiple Choice (4 options)</SelectItem>
                              <SelectItem value="true_false">True/False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {question.questionType === 'multiple_choice' ? (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              {question.options?.map((option, oIndex) => (
                                <div key={oIndex}>
                                  <Label className="text-white">Option {oIndex + 1}</Label>
                                  <Input
                                    value={option.text}
                                    onChange={(e) => updateQuestionOption(qIndex, oIndex, 'text', e.target.value)}
                                    className="bg-gray-600 border-gray-500 text-white"
                                    placeholder={`Option ${oIndex + 1}`}
                                  />
                                </div>
                              ))}
                            </div>
                            
                            <div>
                              <Label className="text-white">Correct Answer</Label>
                              <Select 
                                value={question.options?.findIndex(opt => opt.isCorrect)?.toString() || ''} 
                                onValueChange={(value) => setCorrectOption(qIndex, parseInt(value))}
                              >
                                <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                                  <SelectValue placeholder="Select correct option" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-600 border-gray-500">
                                  {question.options?.map((_, index) => (
                                    <SelectItem key={index} value={index.toString()}>
                                      Option {index + 1}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <div>
                            <Label className="text-white">Correct Answer</Label>
                            <Select 
                              value={question.correctAnswer?.toString() || ''} 
                              onValueChange={(value) => updateQuestion(qIndex, 'correctAnswer', value === 'true')}
                            >
                              <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                                <SelectValue placeholder="Select correct answer" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-600 border-gray-500">
                                <SelectItem value="true">True</SelectItem>
                                <SelectItem value="false">False</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div>
                          <Label className="text-white">Explanation (Optional)</Label>
                          <Textarea
                            value={question.explanation}
                            onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                            className="bg-gray-600 border-gray-500 text-white"
                            placeholder="Explain why this is the correct answer"
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="manual" 
                  onClick={handleUpdateQuiz}
                  disabled={
                    !newQuiz.title || 
                    !newQuiz.category || 
                    (newQuiz.quizType === 'single_step' 
                      ? newQuiz.questions.some(q => !q.questionText)
                      : newQuiz.steps.some(step => 
                          !step.stepTitle || 
                          step.questions.some(q => !q.questionText)
                        )
                    )
                  }
                >
                  Update Quiz
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Delete Quiz</DialogTitle>
                <p className="text-gray-400">
                  Are you sure you want to delete "{quizToDelete?.title}"? This action cannot be undone.
                </p>
              </DialogHeader>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteQuiz}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Quiz
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Quizzes</p>
                  <p className="text-2xl font-bold text-white">{stats.totalQuizzes}</p>
                </div>
                <Target className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Quizzes</p>
                  <p className="text-2xl font-bold text-white">{stats.activeQuizzes}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Questions</p>
                  <p className="text-2xl font-bold text-white">{stats.totalQuestions}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Avg Duration</p>
                  <p className="text-2xl font-bold text-white">{stats.avgDuration}m</p>
                </div>
                <Clock className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quizzes Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading quizzes...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No quizzes created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <Card key={quiz._id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white text-lg">{quiz.title}</CardTitle>
                      <p className="text-gray-400 text-sm">{quiz.description}</p>
                    </div>
                    <Badge className={quiz.isActive ? 'bg-green-600' : 'bg-gray-600'}>
                      {quiz.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Duration</p>
                      <p className="text-white font-medium">{quiz.timing} minutes</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Questions</p>
                      <p className="text-white font-medium">{quiz.questions?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Passing Marks</p>
                      <p className="text-white font-medium">{quiz.passingMarks}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Max Marks</p>
                      <p className="text-white font-medium">{quiz.maxMarks}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href={`/quiz/${quiz._id}`}>
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Link>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="manual" 
                      className="flex-1"
                      onClick={() => handleEditQuiz(quiz)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="px-2"
                      onClick={() => {
                        setQuizToDelete(quiz);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </LMSLayout>
  );
};


export default QuizManagement;












