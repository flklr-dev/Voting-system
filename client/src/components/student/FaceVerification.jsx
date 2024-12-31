import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import axios from '../../utils/axios';
import DorsuLogo from '../../assets/dorsu-logo.png';
import { FaCamera, FaRedo, FaCheck } from 'react-icons/fa';

const FaceVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [message, setMessage] = useState('Loading face detection models...');
  const [verificationStatus, setVerificationStatus] = useState('waiting');
  const [retryCount, setRetryCount] = useState(0);
  const { token, studentId, redirectTo } = location.state || {};

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const studentToken = localStorage.getItem('studentToken');
    
    if (!studentToken || userType !== 'student') {
      navigate('/login');
      return;
    }

    loadModels();

    return () => stopVideo();
  }, []);

  const loadModels = async () => {
    try {
      setMessage('Loading face detection models...');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ]);
      await startVideo();
      setMessage('Please position your face within the guide');
    } catch (error) {
      setMessage('Error loading models. Please refresh the page.');
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      videoRef.current.srcObject = stream;
      setIsLoading(false);
      startFaceDetection();
    } catch (error) {
      setMessage('Cannot access camera. Please check permissions.');
    }
  };

  const stopVideo = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const startFaceDetection = () => {
    if (!videoRef.current) return;

    const canvas = canvasRef.current;
    const displaySize = { width: 640, height: 480 };
    faceapi.matchDimensions(canvas, displaySize);

    const interval = setInterval(async () => {
      if (verificationStatus !== 'waiting') {
        clearInterval(interval);
        return;
      }

      try {
        const detections = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();

        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawFaceGuide(context, displaySize.width, displaySize.height);

        if (detections) {
          setFaceDetected(true);
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          faceapi.draw.drawDetections(canvas, [resizedDetections]);
          
          if (checkFacePosition(resizedDetections, displaySize)) {
            clearInterval(interval);
            await verifyFace();
          }
        } else {
          setFaceDetected(false);
          setMessage('No face detected. Please look at the camera.');
        }
      } catch (error) {
        console.error('Detection error:', error);
      }
    }, 100);

    return () => clearInterval(interval);
  };

  const verifyFace = async () => {
    try {
      setMessage('Verifying your face...');
      setVerificationStatus('verifying');
      
      const fullFaceDetection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!fullFaceDetection) {
        throw new Error('No face detected during verification');
      }

      const currentToken = localStorage.getItem('studentToken');

      const response = await axios.post('/api/auth/verify-face', {
        faceData: {
          descriptors: [Array.from(fullFaceDetection.descriptor)],
          detection: {
            box: fullFaceDetection.detection.box,
            score: fullFaceDetection.detection.score
          }
        },
        studentId: studentId
      });

      if (response.data.success) {
        setMessage('Face verification successful!');
        setVerificationStatus('success');
        
        if (response.data.token) {
          localStorage.setItem('studentToken', response.data.token);
        }
        localStorage.setItem('faceVerified', 'true');
        
        stopVideo();
        
        setTimeout(() => {
          navigate('/dashboard', { 
            replace: true 
          });
        }, 1500);
      } else {
        handleVerificationFailure(response.data.message);
      }
    } catch (error) {
      console.error('Verification error:', error);
      handleVerificationFailure(error.response?.data?.message || 'Verification failed');
    }
  };

  const handleVerificationFailure = (errorMessage) => {
    setRetryCount(prev => prev + 1);
    setVerificationStatus('failed');
    setMessage(errorMessage || (retryCount >= 2 
      ? 'Multiple failures. Please ensure good lighting and clear face visibility.'
      : 'Verification failed. Please try again.'));
    
    if (retryCount >= 3) {
      // After 3 failures, redirect to login
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } else {
      setTimeout(() => {
        setVerificationStatus('waiting');
        setMessage('Please position your face within the guide');
        startFaceDetection();
      }, 2000);
    }
  };

  const handleRetry = () => {
    setVerificationStatus('waiting');
    setMessage('Please position your face within the guide');
    startFaceDetection();
  };

  const drawFaceGuide = (context, width, height) => {
    // Draw outer circle
    context.beginPath();
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 150; // Size of the guide circle
    
    // Create gradient for circle
    const gradient = context.createLinearGradient(
      centerX - radius, centerY, centerX + radius, centerY
    );
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); // blue-500 with opacity
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.5)'); // blue-600 with opacity
    
    context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    context.strokeStyle = gradient;
    context.lineWidth = 3;
    context.stroke();
    
    // Draw guide text
    context.font = '16px sans-serif';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText('Position your face here', centerX, centerY - radius - 20);
  };

  const checkFacePosition = (detection, displaySize) => {
    const { width, height } = displaySize;
    const { box } = detection.detection;
    const centerX = width / 2;
    const centerY = height / 2;
    const faceX = box.x + (box.width / 2);
    const faceY = box.y + (box.height / 2);
    
    // More lenient position checking
    const isCentered = 
      Math.abs(faceX - centerX) < 100 && // Even more tolerance
      Math.abs(faceY - centerY) < 100;    // Even more tolerance
    
    const isRightSize = 
      box.width > 100 && box.width < 300 && // More flexible size range
      box.height > 100 && box.height < 300;
    
    if (!isCentered) {
      setMessage('Move your face to the center of the circle');
      return false;
    }
    
    if (!isRightSize) {
      setMessage(box.width < 100 ? 'Move closer to the camera' : 'Move back from the camera');
      return false;
    }
    
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <header className="bg-blue-600 text-white h-16 fixed w-full top-0 left-0 z-50 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center space-x-3 mx-auto">
          <img src={DorsuLogo} alt="DOrSU Logo" className="h-12 w-12" />
          <h1 className="text-xl font-semibold">Face Verification</h1>
        </div>
      </header>

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Face Verification</h2>
              <div className={`mt-2 p-2 rounded ${
                verificationStatus === 'success' ? 'bg-green-100 text-green-700' :
                verificationStatus === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                <p>{message}</p>
              </div>
            </div>

            <div className="relative w-[640px] h-[480px] mx-auto rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute top-0 left-0 w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                </div>
              )}
            </div>

            {verificationStatus === 'failed' && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleRetry}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaRedo className="mr-2" />
                  Try Again
                </button>
              </div>
            )}

            <div className="mt-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Tips for successful verification:</h3>
                <ul className="text-blue-700 space-y-1">
                  <li>• Ensure good lighting on your face</li>
                  <li>• Remove face coverings (masks, sunglasses)</li>
                  <li>• Look directly at the camera</li>
                  <li>• Keep your face within the guide circle</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceVerification;
