import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Users, Share2, CheckCircle, X } from 'lucide-react';

interface BBBHelpProps {
  userType: 'trainer' | 'student';
}

const BBBHelp: React.FC<BBBHelpProps> = ({ userType }) => {
  const [showHelp, setShowHelp] = useState(false);

  const trainerSteps = [
    {
      icon: Video,
      title: "Create Room",
      description: "Go to BigBlueButton rooms page and create a new room with your class name"
    },
    {
      icon: Share2,
      title: "Share Link", 
      description: "Copy the room link and share it with students via WhatsApp, email, or LMS"
    },
    {
      icon: Users,
      title: "Start Class",
      description: "Enter the room, enable camera/microphone, and begin teaching"
    },
    {
      icon: CheckCircle,
      title: "Record & Save",
      description: "Start recording, conduct class, and recordings will be saved automatically"
    }
  ];

  const studentSteps = [
    {
      icon: Video,
      title: "Get Room Link",
      description: "Receive room link from trainer via WhatsApp, email, or check the LMS"
    },
    {
      icon: Users,
      title: "Join Room",
      description: "Click the link or go to rooms page and look for your class room"
    },
    {
      icon: CheckCircle,
      title: "Attend Class",
      description: "Join with camera/microphone and participate in the live class"
    }
  ];

  const steps = userType === 'trainer' ? trainerSteps : studentSteps;

  if (!showHelp) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowHelp(true)}
        className="text-blue-600 border-blue-600"
      >
        <Video className="h-4 w-4 mr-2" />
        How to use BigBlueButton
      </Button>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
            <Video className="h-5 w-5" />
            BigBlueButton Guide for {userType === 'trainer' ? 'Trainers' : 'Students'}
          </CardTitle>
          <button
            onClick={() => setShowHelp(false)}
            className="p-1 hover:bg-blue-100 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <step.icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">
                {index + 1}. {step.title}
              </h4>
              <p className="text-blue-700 text-sm mt-1">
                {step.description}
              </p>
            </div>
          </div>
        ))}
        
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Important Notes:</h4>
          <ul className="text-blue-700 text-sm space-y-1">
            {userType === 'trainer' ? (
              <>
                <li>• Create rooms manually in BigBlueButton for each class</li>
                <li>• Share room links with students before class starts</li>
                <li>• Enable recording for students to watch later</li>
                <li>• Upload recordings to the LMS after class ends</li>
              </>
            ) : (
              <>
                <li>• Check WhatsApp/email for room links from trainer</li>
                <li>• Join 5-10 minutes before class starts</li>
                <li>• Test camera and microphone before joining</li>
                <li>• Recorded classes will be available in LMS later</li>
              </>
            )}
          </ul>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => window.open('https://class.techpratham.org', '_blank')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Open BigBlueButton
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowHelp(false)}
          >
            Got it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BBBHelp;