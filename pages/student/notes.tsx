import React, { useEffect, useState } from 'react';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  BookOpen, 
  Users, 
  Clock,
  Calendar,
  Download,
  Eye,
  AlertCircle
} from 'lucide-react';

interface StudentData {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  id?: string;
}

interface TrainerNote {
  _id: string;
  title: string;
  description: string;
  noteType: 'text' | 'pdf';
  textContent: Array<{
    title: string;
    content: string;
    order: number;
  }>;
  pdfFile?: {
    url: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
  };
  moduleIndex?: number;
  moduleTitle?: string;
  publishedAt: string;
  viewCount: number;
  trainer: {
    name: string;
    email: string;
  };
  batches: Array<{
    _id: string;
    batchName: string;
    batchCode: string;
  }>;
  courses: Array<{
    _id: string;
    title: string;
  }>;
  tags: string[];
}

const StudentNotes = () => {
  const [notes, setNotes] = useState<TrainerNote[]>([]);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<TrainerNote | null>(null);

  // Load custom styles for note content
  useEffect(() => {
    import('../../styles/quill-custom.css');
  }, []);

  useEffect(() => {
    const storedData = localStorage.getItem('student');
    if (storedData) {
      try {
        const student = JSON.parse(storedData);
        setStudentData(student);
        const idToUse = student._id || student.studentId || student.id;
        
        if (idToUse) {
          fetchStudentNotes(idToUse);
        } else {
          setError('Invalid student authentication data');
          setLoading(false);
        }
      } catch (parseError) {
        setError('Invalid student authentication data');
        setLoading(false);
      }
    } else {
      setError('Student authentication required');
      setLoading(false);
    }
  }, []);

  const fetchStudentNotes = async (studentId: string) => {
    try {
      const response = await fetch(`/api/student-notes?studentId=${studentId}`);
      const data = await response.json();

      if (data.success) {
        setNotes(data.notes || []);
      } else {
        setError(data.error || 'Failed to load notes');
      }

    } catch (err) {
      console.error('Error fetching student notes:', err);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  if (loading) {
    return (
      <StudentLayout>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-600">Loading your notes...</div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">{error}</div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // If a note is selected for detailed view
  if (selectedNote) {
    return (
      <StudentLayout>
        <div className="p-6 space-y-6">
          {/* Back Button */}
          <Button 
            variant="outline" 
            onClick={() => setSelectedNote(null)}
            className="flex items-center gap-2"
          >
            ← Back to Notes
          </Button>

          {/* Note Detail */}
          <Card>
            <CardHeader className="bg-blue-50">
              <div className="flex items-center gap-3">
                {selectedNote.noteType === 'pdf' ? (
                  <Upload className="h-6 w-6 text-red-600" />
                ) : (
                  <FileText className="h-6 w-6 text-blue-600" />
                )}
                <div className="flex-1">
                  <CardTitle className="text-xl text-gray-900">{selectedNote.title}</CardTitle>
                  {selectedNote.description && (
                    <p className="text-gray-600 mt-1">{selectedNote.description}</p>
                  )}
                </div>
                <Badge variant="outline">
                  {selectedNote.noteType === 'pdf' ? 'PDF' : 'Text'}
                </Badge>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-6 text-sm text-gray-600 mt-4">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>By {selectedNote.trainer.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Published {new Date(selectedNote.publishedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{selectedNote.viewCount} views</span>
                </div>
              </div>

              {/* Module info */}
              {(selectedNote.moduleIndex || selectedNote.moduleTitle) && (
                <div className="flex items-center gap-2 mt-3 text-sm text-purple-600">
                  <BookOpen className="h-4 w-4" />
                  {selectedNote.moduleIndex && `Module ${selectedNote.moduleIndex}`}
                  {selectedNote.moduleIndex && selectedNote.moduleTitle && ' - '}
                  {selectedNote.moduleTitle}
                </div>
              )}

              {/* Batches */}
              <div className="flex items-center gap-2 mt-3">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">For batches:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedNote.batches.map((batch) => (
                    <Badge key={batch._id} variant="outline" className="text-xs">
                      {batch.batchName}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {selectedNote.noteType === 'text' ? (
                /* Text Content with HTML rendering */
                <div className="space-y-6">
                  {selectedNote.textContent.map((section, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-6 py-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {section.title}
                      </h3>
                      <div 
                        className="note-content text-gray-700"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* PDF Content */
                selectedNote.pdfFile && (
                  <div className="text-center py-8">
                    <Upload className="h-16 w-16 text-red-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedNote.pdfFile.fileName}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {formatFileSize(selectedNote.pdfFile.fileSize)} • 
                      Uploaded {new Date(selectedNote.pdfFile.uploadedAt).toLocaleDateString()}
                    </p>
                    <Button 
                      onClick={() => window.open(selectedNote.pdfFile!.url, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                )
              )}

              {/* Tags */}
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-6 pt-6 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNote.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Training Notes</h1>
          <p className="text-green-100 mt-2">Access notes shared by your trainers</p>
        </div>

        {/* Student Info */}
        {studentData && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Welcome, {studentData.name}
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                You have access to {notes.length} training notes from your trainers.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notes List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Available Notes ({notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Notes Available</h3>
                <p className="text-gray-500">Your trainers haven't shared any notes yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note._id}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white cursor-pointer"
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Note Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            {note.noteType === 'pdf' ? (
                              <Upload className="h-5 w-5 text-red-600" />
                            ) : (
                              <FileText className="h-5 w-5 text-blue-600" />
                            )}
                            <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                          </div>
                          <Badge variant="outline">
                            {note.noteType === 'pdf' ? 'PDF' : 'Text'}
                          </Badge>
                        </div>
                        {/* Description */}
                        {note.description && (
                          <p className="text-gray-600 mb-4">{note.description}</p>
                        )}

                        {/* Module Info */}
                        {(note.moduleIndex || note.moduleTitle) && (
                          <div className="flex items-center gap-2 mb-4 text-sm text-purple-600">
                            <BookOpen className="h-4 w-4" />
                            {note.moduleIndex && `Module ${note.moduleIndex}`}
                            {note.moduleIndex && note.moduleTitle && ' - '}
                            {note.moduleTitle}
                          </div>
                        )}

                        {/* Trainer Info */}
                        <div className="flex items-center gap-2 mb-4">
                          <BookOpen className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            By <span className="font-medium">{note.trainer.name}</span>
                          </span>
                        </div>

                        {/* Batches */}
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">For:</span>
                          <div className="flex flex-wrap gap-2">
                            {note.batches.map((batch) => (
                              <Badge key={batch._id} variant="outline" className="text-xs">
                                {batch.batchName}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Content Preview */}
                        {note.noteType === 'text' && note.textContent && note.textContent.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
                            <div className="bg-gray-50 border rounded p-3 text-sm">
                              <div className="font-medium text-gray-800">{note.textContent[0].title}</div>
                              <div className="text-gray-600 mt-1">
                                <div 
                                  className="note-content prose-sm"
                                  dangerouslySetInnerHTML={{ 
                                    __html: note.textContent[0].content.length > 150 
                                      ? note.textContent[0].content.substring(0, 150) + '...' 
                                      : note.textContent[0].content 
                                  }}
                                />
                              </div>
                              {note.textContent.length > 1 && (
                                <div className="text-xs text-blue-600 mt-2">
                                  +{note.textContent.length - 1} more sections
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* PDF Info */}
                        {note.noteType === 'pdf' && note.pdfFile && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">PDF File:</h4>
                            <div className="bg-gray-50 border rounded p-3 text-sm flex items-center gap-3">
                              <Upload className="h-5 w-5 text-red-600" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-800">{note.pdfFile.fileName}</div>
                                <div className="text-gray-600 text-xs">
                                  {formatFileSize(note.pdfFile.fileSize)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm text-gray-600">Tags:</span>
                            <div className="flex flex-wrap gap-1">
                              {note.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{note.viewCount} views</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Published {new Date(note.publishedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* View Button */}
                      <div className="ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentNotes;