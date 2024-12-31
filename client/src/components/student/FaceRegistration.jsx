import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import * as faceapi from 'face-api.js';
import { FaCheckCircle } from 'react-icons/fa';
import DorsuLogo from '../../assets/dorsu-logo.png';

const FaceRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [message, setMessage] = useState('Loading face detection models...');
  const [goodPositionTime, setGoodPositionTime] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);

  useEffect(() => {
    if (!location.state?.tempToken) {
      navigate('/register');
      return;
    }

    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        startVideo();
        setMessage('Please position your face within the guide');
      } catch (error) {
        console.error('Error loading models:', error);
        setMessage('Error loading face detection models');
      }
    };

    loadModels();
  }, [location.state, navigate]);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640,
          height: 480,
          facingMode: 'user'
        } 
      });
      videoRef.current.srcObject = stream;
      setIsLoading(false);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setMessage('Error accessing camera');
    }
  };

  const checkFacePosition = (detection, displaySize) => {
    const idealX = displaySize.width * 0.5;
    const idealY = displaySize.height * 0.5;
    const idealWidth = displaySize.width * 0.4;
    
    const faceX = detection.box.x + (detection.box.width / 2);
    const faceY = detection.box.y + (detection.box.height / 2);
    
    return (
      Math.abs(faceX - idealX) < 50 && // Face is centered horizontally
      Math.abs(faceY - idealY) < 50 && // Face is centered vertically
      detection.box.width > idealWidth * 0.8 && // Face is close enough
      detection.box.width < idealWidth * 1.2 // Face is not too close
    );
  };

  const drawFaceGuide = (context, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const guideWidth = width * 0.4;
    const guideHeight = height * 0.6;

    // Draw outer guide box
    context.beginPath();
    context.strokeStyle = '#3498db';
    context.lineWidth = 2;
    
    // Draw oval guide with dashed lines
    context.setLineDash([5, 5]);
    context.ellipse(
      centerX,
      centerY,
      guideWidth / 2,
      guideHeight / 2,
      0,
      0,
      2 * Math.PI
    );
    context.stroke();
    context.setLineDash([]);

    // Draw corner markers
    const markerSize = 20;
    context.beginPath();
    context.strokeStyle = '#3498db';
    context.lineWidth = 3;
    
    // Top left
    context.moveTo(centerX - guideWidth/2, centerY - guideHeight/2 + markerSize);
    context.lineTo(centerX - guideWidth/2, centerY - guideHeight/2);
    context.lineTo(centerX - guideWidth/2 + markerSize, centerY - guideHeight/2);
    
    // Top right
    context.moveTo(centerX + guideWidth/2 - markerSize, centerY - guideHeight/2);
    context.lineTo(centerX + guideWidth/2, centerY - guideHeight/2);
    context.lineTo(centerX + guideWidth/2, centerY - guideHeight/2 + markerSize);
    
    // Bottom left
    context.moveTo(centerX - guideWidth/2, centerY + guideHeight/2 - markerSize);
    context.lineTo(centerX - guideWidth/2, centerY + guideHeight/2);
    context.lineTo(centerX - guideWidth/2 + markerSize, centerY + guideHeight/2);
    
    // Bottom right
    context.moveTo(centerX + guideWidth/2 - markerSize, centerY + guideHeight/2);
    context.lineTo(centerX + guideWidth/2, centerY + guideHeight/2);
    context.lineTo(centerX + guideWidth/2, centerY + guideHeight/2 - markerSize);
    
    context.stroke();
  };

  const captureAndSubmit = async () => {
    try {
      setMessage('Processing face data...');
      
      // Get full face data including descriptors
      const fullFaceDetection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!fullFaceDetection) {
        throw new Error('No face detected during capture');
      }

      // Format face data to match verification structure
      const faceData = {
        descriptors: [Array.from(fullFaceDetection.descriptor)],
        detection: {
          box: fullFaceDetection.detection.box,
          score: fullFaceDetection.detection.score
        }
      };

      setMessage('Completing registration...');
      const response = await axios.post('/api/auth/complete-registration', {
        faceData,
        tempToken: location.state.tempToken,
        registrationData: location.state.registrationData
      });

      if (response.data.success) {
        setShowSuccessModal(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Error completing registration:', error);
      setMessage('Registration failed. Please try again.');
      setGoodPositionTime(null);
    }
  };

  useEffect(() => {
    if (!videoRef.current || isLoading) return;

    const detectFace = async () => {
      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      );

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const displaySize = { width: 640, height: 480 };
      
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawFaceGuide(context, canvas.width, canvas.height);

      if (detection) {
        faceapi.matchDimensions(canvas, displaySize);
        const isGoodPosition = checkFacePosition(detection, displaySize);
        setFaceDetected(isGoodPosition);

        // Handle face position timing and progress
        if (isGoodPosition) {
          if (!goodPositionTime) {
            setGoodPositionTime(Date.now());
            setMessage('Perfect! Hold still...');
            setCaptureProgress(0);
          } else {
            const elapsed = Date.now() - goodPositionTime;
            const progress = Math.min((elapsed / 2000) * 100, 100);
            setCaptureProgress(progress);
            
            if (elapsed > 2000) {
              setGoodPositionTime(null);
              setCaptureProgress(0);
              captureAndSubmit();
            }
          }
        } else {
          if (goodPositionTime) {
            setGoodPositionTime(null);
            setCaptureProgress(0);
          }
          setMessage('Please align your face within the oval guide');
        }

        // Draw detection box with smoother corners
        const resizedDetection = faceapi.resizeResults(detection, displaySize);
        context.strokeStyle = isGoodPosition ? '#2ecc71' : '#e74c3c';
        context.lineWidth = 3;
        const radius = 10;
        const box = resizedDetection.box;
        
        context.beginPath();
        context.moveTo(box.x + radius, box.y);
        context.lineTo(box.x + box.width - radius, box.y);
        context.quadraticCurveTo(box.x + box.width, box.y, box.x + box.width, box.y + radius);
        context.lineTo(box.x + box.width, box.y + box.height - radius);
        context.quadraticCurveTo(box.x + box.width, box.y + box.height, box.x + box.width - radius, box.y + box.height);
        context.lineTo(box.x + radius, box.y + box.height);
        context.quadraticCurveTo(box.x, box.y + box.height, box.x, box.y + box.height - radius);
        context.lineTo(box.x, box.y + radius);
        context.quadraticCurveTo(box.x, box.y, box.x + radius, box.y);
        context.closePath();
        context.stroke();
      } else {
        setFaceDetected(false);
        setGoodPositionTime(null);
        setCaptureProgress(0);
        setMessage('No face detected - please look directly at the camera');
      }
    };

    const interval = setInterval(detectFace, 100);
    return () => clearInterval(interval);
  }, [isLoading, goodPositionTime]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-blue-600 text-white h-16 fixed w-full top-0 left-0 z-50 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center space-x-2">
          <img src={DorsuLogo} alt="DOrSU Logo" className="h-12 w-12" />
          <h1 className="text-xl font-semibold">Face Registration</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-4 flex flex-col items-center">
        <div className="relative w-[640px] h-[480px] bg-gray-900 rounded-lg overflow-hidden shadow-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-0 left-0 w-full h-full object-cover mirror"
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute top-0 left-0 w-full h-full"
          />
          
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                <p className="text-lg">{message}</p>
              </div>
            </div>
          )}
          
          {/* Progress Bar */}
          {captureProgress > 0 && (
            <div className="absolute bottom-0 left-0 w-full h-2 bg-gray-200">
              <div 
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${captureProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Message Display */}
        <div className={`mt-4 p-4 rounded-lg text-center ${
          faceDetected ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          <p className="text-lg font-medium">{message}</p>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-lg font-semibold mb-3">Instructions:</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Position your face within the oval guide</li>
            <li>Ensure good lighting and a clear background</li>
            <li>Look directly at the camera</li>
            <li>Hold still when the green box appears</li>
            <li>Wait for the progress bar to complete</li>
          </ul>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
            <p>Redirecting to login page...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceRegistration;