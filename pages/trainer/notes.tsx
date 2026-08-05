import React, { useEffect, useState } from 'react';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  Eye, 
  Save, 
  XCircle, 
  BookOpen, 
  Users, 
  Clock,
  Calendar,
  Download,
  AlertCircle
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

// Quill toolbar configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'list', 'bullet', 'align',
  'link', 'image'
];

interface TrainerBatch {
  _id: string;
  batchName: string;
  batchCode: string;
  courseName: string;
  studentCount: number;
  timing: string;
  startDate: string;
  endDate: string;
}

interface TrainerData {
  _id: string;
  trainerId: string;
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
    content: string; // This will now store HTML
    order: number;
  }>;
  pdfFile?: {
    url: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
  };
  batchIds: Array<{
    _id: string;
    batchName: string;
    batchCode: string;
  }>;
  courseIds: Array<{
    _id: string;
    title: string;
  }>;
  isPublished: boolean;
  publishedAt?: string;
  moduleIndex?: number;
  moduleTitle?: string;
  tags: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface NoteFormData {
  title: string;
  description: string;
  noteType: 'text' | 'pdf';
  textContent: Array<{
    title: string;
    content: string; // This will now store HTML
  }>;
  batchIds: string[];
  moduleIndex?: number;
  moduleTitle?: string;
  tags: string[];
  pdfFile?: {
    url: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
  };
}

const TrainerNotes = () => {
  const [notes, setNotes] = useState<TrainerNote[]>([]);
  const [batches, setBatches] = useState<TrainerBatch[]>([]);
  const [trainerData, setTrainerData] = useState<TrainerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<TrainerNote | null>(null);
  const [uploading, setUploading] = useState(false);
  const [noteForm, setNoteForm] = useState<NoteFormData>({
    title: '',
    description: '',
    noteType: 'text',
    textContent: [{ title: '', content: '' }],
    batchIds: [],
    moduleIndex: undefined,
    moduleTitle: '',
    tags: [],
    pdfFile: undefined
  });

  // Load Quill styles
  useEffect(() => {
    import('react-quill/dist/quill.snow.css');
    // Remove custom CSS import to fix module error
  }, []);

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (storedData) {
      try {
        const trainer = JSON.parse(storedData);
        setTrainerData(trainer);
        const idToUse = trainer._id || trainer.trainerId || trainer.id;
        
        if (idToUse) {
          fetchTrainerData(idToUse);
        } else {
          setError('Invalid trainer authentication data');
          setLoading(false);
        }
      } catch (parseError) {
        setError('Invalid trainer authentication data');
        setLoading(false);
      }
    } else {
      setError('Trainer authentication required');
      setLoading(false);
    }
  }, []);
  const fetchTrainerData = async (trainerId: string) => {
    try {
      // Fetch batches and notes in parallel
      const [batchesResponse, notesResponse] = await Promise.all([
        fetch(`/api/trainer-batch-recordings?trainerId=${trainerId}`),
        fetch(`/api/trainer-notes?trainerId=${trainerId}`)
      ]);

      const batchesData = await batchesResponse.json();
      const notesData = await notesResponse.json();

      if (batchesData.success) {
        setBatches(batchesData.batches || []);
      }

      if (notesData.success) {
        setNotes(notesData.notes || []);
      }

    } catch (err) {
      console.error('Error fetching trainer data:', err);
      setError('Failed to load trainer data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!trainerData) return;

    try {
      const idToUse = trainerData._id || trainerData.trainerId || trainerData.id;
      if (!idToUse) return;

      setNotesLoading(true);

      const response = await fetch('/api/trainer-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerId: idToUse,
          ...noteForm
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotes([data.note, ...notes]);
        resetNoteForm();
        setShowNoteForm(false);
        alert('Note created successfully!');
      } else {
        alert('Failed to create note: ' + data.error);
      }
    } catch (err) {
      console.error('Error creating note:', err);
      alert('Failed to create note');
    } finally {
      setNotesLoading(false);
    }
  };
  const handleUpdateNote = async (noteId: string) => {
    try {
      setNotesLoading(true);

      const response = await fetch('/api/trainer-notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId,
          ...noteForm
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotes(notes.map(note => note._id === noteId ? data.note : note));
        resetNoteForm();
        setEditingNote(null);
        setShowNoteForm(false);
        alert('Note updated successfully!');
      } else {
        alert('Failed to update note: ' + data.error);
      }
    } catch (err) {
      console.error('Error updating note:', err);
      alert('Failed to update note');
    } finally {
      setNotesLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/trainer-notes?noteId=${noteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setNotes(notes.filter(note => note._id !== noteId));
        alert('Note deleted successfully!');
      } else {
        alert('Failed to delete note: ' + data.error);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note');
    }
  };

  const handleTogglePublished = async (note: TrainerNote) => {
    try {
      const response = await fetch('/api/trainer-notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId: note._id,
          isPublished: !note.isPublished
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotes(notes.map(n => n._id === note._id ? data.note : n));
        alert(`Note ${note.isPublished ? 'unpublished' : 'published'} successfully!`);
      } else {
        alert('Failed to update note: ' + data.error);
      }
    } catch (err) {
      console.error('Error updating note:', err);
      alert('Failed to update note');
    }
  };
  const resetNoteForm = () => {
    setNoteForm({
      title: '',
      description: '',
      noteType: 'text',
      textContent: [{ title: '', content: '' }],
      batchIds: [],
      moduleIndex: undefined,
      moduleTitle: '',
      tags: [],
      pdfFile: undefined
    });
  };

  const addTextSection = () => {
    setNoteForm({
      ...noteForm,
      textContent: [...noteForm.textContent, { title: '', content: '' }]
    });
  };

  const removeTextSection = (index: number) => {
    if (noteForm.textContent.length > 1) {
      setNoteForm({
        ...noteForm,
        textContent: noteForm.textContent.filter((_, i) => i !== index)
      });
    }
  };

  const updateTextSection = (index: number, field: string, value: string) => {
    const updatedContent = [...noteForm.textContent];
    updatedContent[index] = { ...updatedContent[index], [field]: value };
    setNoteForm({ ...noteForm, textContent: updatedContent });
  };

  const startEditNote = (note: TrainerNote) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title,
      description: note.description,
      noteType: note.noteType,
      textContent: note.textContent.length > 0 ? note.textContent : [{ title: '', content: '' }],
      batchIds: note.batchIds.map(batch => batch._id),
      moduleIndex: note.moduleIndex,
      moduleTitle: note.moduleTitle || '',
      tags: note.tags,
      pdfFile: note.pdfFile
    });
    setShowNoteForm(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'trainer-note');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Update note form with PDF file info
        setNoteForm({
          ...noteForm,
          noteType: 'pdf',
          pdfFile: data.file
        });
        alert('PDF uploaded successfully!');
      } else {
        alert('Failed to upload PDF: ' + data.error);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload PDF');
    } finally {
      setUploading(false);
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
      <TrainerLayout>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-600">Loading trainer notes...</div>
          </div>
        </div>
      </TrainerLayout>
    );
  }

  if (error) {
    return (
      <TrainerLayout>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">{error}</div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Training Notes</h1>
          <p className="text-blue-100 mt-2">Create and manage notes for your students</p>
        </div>

        {/* Trainer Info */}
        {trainerData && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">
                  Welcome, {trainerData.name}
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Create notes for your {batches.length} batches and share them with students.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notes Header and Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Notes</h2>
            <p className="text-gray-600">Manage training notes for your students</p>
          </div>
          <Button 
            onClick={() => {
              resetNoteForm();
              setEditingNote(null);
              setShowNoteForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Note
          </Button>
        </div>
        {/* Note Form */}
        {showNoteForm && (
          <Card className="border-blue-200 shadow-lg">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-900 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {editingNote ? 'Edit Note' : 'Create New Note'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Title *
                  </label>
                  <Input
                    value={noteForm.title}
                    onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                    placeholder="Enter note title"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Type
                  </label>
                  <Select 
                    value={noteForm.noteType} 
                    onValueChange={(value: 'text' | 'pdf') => setNoteForm({ ...noteForm, noteType: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Text Note
                        </div>
                      </SelectItem>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          PDF Upload
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={noteForm.description}
                  onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
                  placeholder="Brief description of the note"
                  rows={3}
                  className="w-full"
                />
              </div>
              {/* Batch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Batches *
                </label>
                {batches.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No batches available</p>
                    <p className="text-sm text-gray-400">You need to have batches to create notes</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {batches.map((batch) => (
                      <div key={batch._id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`batch-${batch._id}`}
                          checked={noteForm.batchIds.includes(batch._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNoteForm({ 
                                ...noteForm, 
                                batchIds: [...noteForm.batchIds, batch._id] 
                              });
                            } else {
                              setNoteForm({ 
                                ...noteForm, 
                                batchIds: noteForm.batchIds.filter(id => id !== batch._id) 
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`batch-${batch._id}`} className="flex-1 text-sm cursor-pointer">
                          <div className="font-medium text-gray-900">{batch.batchName}</div>
                          <div className="text-xs text-gray-500">{batch.courseName} • {batch.studentCount} students</div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {noteForm.batchIds.length === 0 && batches.length > 0 && (
                  <p className="text-sm text-red-600 mt-2">Please select at least one batch</p>
                )}
              </div>

              {/* Module Info (Optional) */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module Index (Optional)
                  </label>
                  <Input
                    type="number"
                    value={noteForm.moduleIndex || ''}
                    onChange={(e) => setNoteForm({ 
                      ...noteForm, 
                      moduleIndex: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    placeholder="e.g. 1, 2, 3"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module Title (Optional)
                  </label>
                  <Input
                    value={noteForm.moduleTitle}
                    onChange={(e) => setNoteForm({ ...noteForm, moduleTitle: e.target.value })}
                    placeholder="e.g. Introduction to React"
                    className="w-full"
                  />
                </div>
              </div>
              {/* Text Content */}
              {noteForm.noteType === 'text' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Content Sections
                    </label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addTextSection}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Section
                    </Button>
                  </div>
                  
                  {noteForm.textContent.map((section, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-700">Section {index + 1}</h4>
                        {noteForm.textContent.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTextSection(index)}
                            className="text-red-600 hover:text-red-700 border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Section Title
                          </label>
                          <Input
                            value={section.title}
                            onChange={(e) => updateTextSection(index, 'title', e.target.value)}
                            placeholder="Enter section title"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Section Content
                          </label>
                          <div className="border border-gray-300 rounded-md">
                            <ReactQuill
                              value={section.content}
                              onChange={(content) => updateTextSection(index, 'content', content)}
                              placeholder="Enter section content with rich formatting..."
                              modules={quillModules}
                              formats={quillFormats}
                              theme="snow"
                              style={{ minHeight: '200px' }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            You can add links, format text (bold, italic), create lists, and more.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* PDF Upload */}
              {noteForm.noteType === 'pdf' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    PDF File Upload
                  </label>
                  
                  {noteForm.pdfFile ? (
                    /* Show uploaded PDF info */
                    <div className="border-2 border-green-300 rounded-lg p-6 bg-green-50">
                      <div className="flex items-center gap-4">
                        <Upload className="h-12 w-12 text-green-600" />
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-green-900">{noteForm.pdfFile.fileName}</h4>
                          <p className="text-sm text-green-700">
                            {formatFileSize(noteForm.pdfFile.fileSize)} • 
                            Uploaded {new Date(noteForm.pdfFile.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(noteForm.pdfFile!.url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setNoteForm({ ...noteForm, pdfFile: undefined })}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Upload interface */
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <div className="mb-4">
                        <p className="text-lg font-medium text-gray-900">Upload PDF Note</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Select a PDF file to upload (Max size: 10MB)
                        </p>
                      </div>
                      
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        id="pdf-upload"
                      />
                      
                      <label
                        htmlFor="pdf-upload"
                        className={`inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                          uploading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                        } transition-colors`}
                      >
                        {uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Select PDF File
                          </>
                        )}
                      </label>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    <p>• Supported format: PDF only</p>
                    <p>• Maximum file size: 10MB</p>
                    <p>• The PDF will be available for download by students</p>
                  </div>
                </div>
              )}
              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                <Button 
                  onClick={() => editingNote ? handleUpdateNote(editingNote._id) : handleCreateNote()}
                  disabled={!noteForm.title || noteForm.batchIds.length === 0 || notesLoading || (noteForm.noteType === 'pdf' && !noteForm.pdfFile)}
                  className="flex items-center gap-2"
                >
                  {notesLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editingNote ? 'Update Note' : 'Create Note'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNoteForm(false);
                    setEditingNote(null);
                    resetNoteForm();
                  }}
                  disabled={notesLoading}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Notes List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Your Notes ({notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Notes Yet</h3>
                <p className="text-gray-500 mb-6">Create your first training note to share with students.</p>
                <Button 
                  onClick={() => {
                    resetNoteForm();
                    setEditingNote(null);
                    setShowNoteForm(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Note
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note._id}
                    className={`border rounded-lg p-6 hover:shadow-md transition-shadow ${
                      note.isPublished ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
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
                          
                          <Badge variant={note.isPublished ? "default" : "secondary"}>
                            {note.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                          
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
                        {/* Batches */}
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Assigned to:</span>
                          <div className="flex flex-wrap gap-2">
                            {note.batchIds.map((batch: any) => (
                              <Badge key={batch._id} variant="outline" className="text-xs">
                                {batch.batchName}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Content Preview */}
                        {note.noteType === 'text' && note.textContent && note.textContent.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Content Preview:</h4>
                            <div className="bg-white border rounded p-3 text-sm">
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
                            <div className="bg-white border rounded p-3 text-sm flex items-center gap-3">
                              <Upload className="h-5 w-5 text-red-600" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-800">{note.pdfFile.fileName}</div>
                                <div className="text-gray-600 text-xs">
                                  {formatFileSize(note.pdfFile.fileSize)} • 
                                  Uploaded {new Date(note.pdfFile.uploadedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(note.pdfFile!.url, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
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
                            <Clock className="h-4 w-4" />
                            <span>Created {new Date(note.createdAt).toLocaleDateString()}</span>
                          </div>
                          {note.publishedAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Published {new Date(note.publishedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditNote(note)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        
                        <Button
                          variant={note.isPublished ? "secondary" : "default"}
                          size="sm"
                          onClick={() => handleTogglePublished(note)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          {note.isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteNote(note._id)}
                          className="text-red-600 hover:text-red-700 border-red-300 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
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
    </TrainerLayout>
  );
};

export default TrainerNotes;