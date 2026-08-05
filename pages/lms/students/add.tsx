import React, { useEffect, useState } from 'react';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ArrowLeft, Plus, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

const AddStudent = () => {
  
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const [studentData, setStudentData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    course_link: '',
    course_title: '',
    course_desc: '',
    duration: '',
    level: '',
    category: '',
    batchId: '',
    totalAmount: 0,
    advanceAmount: 0,
    finalPayment: 0,
    feeType: 'Full Payment'
  });

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/course/fetch');
      const data = await res.json();
      if (res.ok) {
        console.log('Courses fetched:', data);
        setCourses(data);
        if (data.length === 0) {
          toast.error('No courses available. Please add courses first.');
        }
      } else {
        console.error('Failed to fetch courses:', data);
        toast.error('Failed to fetch courses');
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to fetch courses');
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/lms/batches');
      const data = await res.json();
      if (res.ok) {
        console.log('Batches fetched:', data);
        setBatches(data);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const handleCourseChange = (courseId: string) => {
    const course = courses.find(c => c._id === courseId);
    console.log('Selected course ID:', courseId);
    console.log('Course found:', course);
    if (course) {
      setStudentData(prev => ({
        ...prev,
        course_link: courseId, // Use courseId directly instead of slug
        course_title: course.title,
        course_desc: course.description,
        duration: course.duration,
        level: course.level,
        category: course.category,
        batchId: '' // Reset batch selection when course changes
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentData.name || !studentData.email || !studentData.phone || !studentData.password || !studentData.course_link) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // First, enroll the student
      const res = await fetch('/api/course/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });

      const responseData = await res.json();

      if (res.ok) {
        // Student enrolled successfully, now send welcome email
        try {
          const selectedCourse = courses.find(c => c._id === studentData.course_link);
          const selectedBatch = batches.find(b => b._id === studentData.batchId);
          
          const welcomeEmailData = {
            to: studentData.email,
            subject: `Welcome to TechPratham - ${selectedCourse?.title || 'Course'} Enrollment Confirmation`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Welcome to TechPratham!</h1>
                    <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">Your Learning Journey Starts Here</p>
                  </div>
                  
                  <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 20px;">🎉 Enrollment Successful!</h2>
                    <p style="margin: 0; color: #374151;">Dear ${studentData.name}, you have been successfully enrolled in our course.</p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">📚 Course Details:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Course Name:</td>
                        <td style="padding: 8px 0; color: #374151; font-weight: 600;">${selectedCourse?.title || 'N/A'}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Duration:</td>
                        <td style="padding: 8px 0; color: #374151;">${selectedCourse?.duration || 'N/A'}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Level:</td>
                        <td style="padding: 8px 0; color: #374151;">${selectedCourse?.level || 'N/A'}</td>
                      </tr>
                      ${selectedBatch ? `
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Batch:</td>
                        <td style="padding: 8px 0; color: #374151;">${selectedBatch.batchName}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>

                  <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">🔑 Login Credentials:</h3>
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 5px 0; color: #92400e; font-weight: 500;">Student ID:</td>
                        <td style="padding: 5px 0; color: #451a03; font-weight: 600;">${responseData.studentId || 'Check with admin'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #92400e; font-weight: 500;">Email:</td>
                        <td style="padding: 5px 0; color: #451a03; font-weight: 600;">${studentData.email}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #92400e; font-weight: 500;">Password:</td>
                        <td style="padding: 5px 0; color: #451a03; font-weight: 600;">${studentData.password}</td>
                      </tr>
                    </table>
                    <p style="margin: 15px 0 0 0; color: #92400e; font-size: 14px; font-style: italic;">
                      Please keep these credentials safe. You can change your password after logging in.
                    </p>
                  </div>

                  <div style="text-align: center; margin-bottom: 25px;">
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com'}/student" 
                       style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Access Student Portal
                    </a>
                  </div>

                  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
                    <p style="margin: 0 0 10px 0;"><strong>What's Next?</strong></p>
                    <ul style="margin: 0; padding-left: 20px;">
                      <li>Log in to your student portal using the credentials above</li>
                      <li>Complete your profile setup</li>
                      <li>Access course materials and join live classes</li>
                      <li>Connect with your batch mates and instructors</li>
                    </ul>
                  </div>

                  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">
                      Need help? Contact us at <a href="mailto:support@techpratham.com" style="color: #2563eb;">support@techpratham.com</a>
                    </p>
                    <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
                      © ${new Date().getFullYear()} TechPratham. All rights reserved.
                    </p>
                  </div>
                </div>
              </div>
            `,
            message: `Welcome to TechPratham! You have been enrolled in ${selectedCourse?.title || 'the course'}.`
          };

          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(welcomeEmailData)
          });

          // Don't fail the enrollment if email fails, just log it
          console.log('Welcome email sent to:', studentData.email);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Continue with success flow even if email fails
        }

        toast.success('Student enrolled successfully! Welcome email sent.');
        setTimeout(() => {
          router.push('/lms/students');
        }, 2000);
      } else {
        throw new Error(responseData.error || 'Failed to enroll student');
      }
    } catch (error: any) {
      console.error('Failed to enroll student:', error);
      toast.error(error.message || 'Failed to enroll student');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
      fetchBatches();
    }, []);

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/lms/students">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Add New Student</h1>
            <p className="text-gray-400 mt-2">Enroll a new student in a course</p>
          </div>
        </div>

        {/* Form */}
        <Card className="bg-gray-800 border-gray-700 max-w-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Student Enrollment Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Full Name *</Label>
                  <Input
                    value={studentData.name}
                    onChange={(e) => setStudentData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter student name"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-white">Email *</Label>
                  <Input
                    type="email"
                    value={studentData.email}
                    onChange={(e) => setStudentData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="student@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Phone Number *</Label>
                <Input
                  value={studentData.phone}
                  onChange={(e) => setStudentData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="+91 9876543210"
                  required
                />
              </div>

              <div>
                <Label className="text-white">Password *</Label>
                <Input
                  type="password"
                  value={studentData.password}
                  onChange={(e) => setStudentData(prev => ({ ...prev, password: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter password for student login"
                  required
                />
                <p className="text-gray-400 text-xs mt-1">Student will use their Student ID and this password to login</p>
              </div>

              {/* Course Selection */}
              <div>
                <Label className="text-white">Select Course *</Label>
                <Select 
                  value={studentData.course_link} 
                  onValueChange={handleCourseChange}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {courses.map((course: any) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.title} {course.category ? `- ${course.category}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Batch Selection */}
              <div>
                <Label className="text-white">Assign to Batch (Optional)</Label>
                {studentData.course_link ? (
                  <>
                    <Select 
                      value={studentData.batchId} 
                      onValueChange={(value) => setStudentData(prev => ({ ...prev, batchId: value }))}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {batches
                          .filter(batch => {
                            console.log('Comparing batch.courseId:', batch.courseId, 'with course_link:', studentData.course_link);
                            return batch.courseId === studentData.course_link;
                          })
                          .map((batch: any) => (
                            <SelectItem key={batch._id} value={batch._id}>
                              {batch.batchName} - {batch.trainerName || 'No Trainer'} ({batch.studentCount || 0}/{batch.capacity || 30})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {batches.filter(batch => batch.courseId === studentData.course_link).length === 0 && (
                      <p className="text-yellow-400 text-sm mt-1">
                        No batches available for this course. Total batches: {batches.length}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="bg-gray-700 border border-gray-600 rounded-md p-3 text-gray-400">
                    Please select a course first
                  </div>
                )}
              </div>

              {/* Fee Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-white">Total Amount</Label>
                  <Input
                    type="number"
                    value={studentData.totalAmount}
                    onChange={(e) => setStudentData(prev => ({ ...prev, totalAmount: parseInt(e.target.value) || 0 }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Total course fee"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Advance Amount</Label>
                  <Input
                    type="number"
                    value={studentData.advanceAmount}
                    onChange={(e) => {
                      const advance = parseInt(e.target.value) || 0;
                      setStudentData(prev => ({ 
                        ...prev, 
                        advanceAmount: advance,
                        finalPayment: prev.totalAmount - advance
                      }));
                    }}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Amount paid"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Remaining Amount</Label>
                  <Input
                    type="number"
                    value={studentData.finalPayment}
                    readOnly
                    className="bg-gray-600 border-gray-500 text-gray-300"
                    placeholder="Auto calculated"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Fee Type</Label>
                <Select 
                  value={studentData.feeType} 
                  onValueChange={(value) => setStudentData(prev => ({ ...prev, feeType: value }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="Full Payment">Full Payment</SelectItem>
                    <SelectItem value="2 Installments">2 Installments</SelectItem>
                    <SelectItem value="3 Installments">3 Installments</SelectItem>
                    <SelectItem value="4 Installments">4 Installments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Link href="/lms/students" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  variant="manual" 
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Enrolling...' : 'Enroll Student'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </LMSLayout>
  );
};

export default AddStudent;












