/**
 * Camera Capture Component
 * 
 * Professional camera interface для KYC documents
 * 
 * Features:
 * - Live camera preview
 * - Document guides overlay
 * - Camera switching (front/back)
 * - Photo capture with compression
 * - Quality validation
 * - Mobile + Desktop support
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Camera,
  X,
  RefreshCw,
  Check,
  AlertTriangle,
  Loader2,
  SwitchCamera
} from 'lucide-react';
import { useCamera } from './hooks/useCamera';
import { prepareImageForUpload } from '@/lib/utils/imageProcessor';
import { toast } from 'sonner';

interface CameraCaptureProps {
  open: boolean;
  onCapture: (file: File) => void;
  onCancel: () => void;
  documentType?: string;
}

export function CameraCapture({ open, onCapture, onCancel, documentType }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
    stream,
    error,
    isLoading,
    devices,
    currentDeviceId,
    hasPermission,
    isCameraSupported,
    startCamera,
    stopCamera,
    switchCamera,
    requestPermissions
  } = useCamera({
    facingMode: 'environment', // Back camera by default
    width: 1920,
    height: 1080
  });

  /**
   * Initialize camera on mount - ORIGINAL APPROACH
   */
  useEffect(() => {
    const init = async () => {
      if (isCameraSupported && open) {
        const granted = await requestPermissions();
        if (granted) {
          await startCamera();
        }
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraSupported, open]);

  /**
   * Attach stream to video element - MDN RECOMMENDED APPROACH with EXTENSIVE LOGGING
   */
  useEffect(() => {
    if (!stream || !videoRef.current || capturedImage) {
      console.log('⏭️ [Camera] Skipping stream attachment:', {
        hasStream: !!stream,
        hasVideo: !!videoRef.current,
        hasCapturedImage: !!capturedImage
      });
      return;
    }

    const video = videoRef.current;
    
    console.log('🎬 [Camera] Attaching stream to video', {
      streamId: stream.id,
      streamActive: stream.active,
      tracks: stream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      })),
      videoElement: {
        readyState: video.readyState,
        paused: video.paused,
        currentSrc: video.currentSrc,
        networkState: video.networkState
      }
    });
    
    // Handle canplay event (MDN recommended)
    const handleCanPlay = () => {
      console.log('📹 [Camera] ✅ CANPLAY EVENT - stream is ready, calling play()');
      video.play()
        .then(() => {
          console.log('✅ [Camera] Video playing successfully!', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState
          });
        })
        .catch(err => {
          console.error('❌ [Camera] Play() failed:', {
            error: err,
            name: err.name,
            message: err.message
          });
        });
    };
    
    // Set stream to video element
    console.log('🔗 [Camera] Setting video.srcObject = stream');
    video.srcObject = stream;
    
    console.log('👂 [Camera] Adding canplay event listener');
    video.addEventListener('canplay', handleCanPlay, { once: true });
    
    // Also try immediate play in case canplay already fired
    if (video.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
      console.log('⚡ [Camera] Video already ready (readyState >= 3), playing immediately');
      handleCanPlay();
    }
    
    // Cleanup
    return () => {
      console.log('🧹 [Camera] Cleaning up stream attachment');
      video.removeEventListener('canplay', handleCanPlay);
      if (video.srcObject) {
        video.srcObject = null;
      }
    };
  }, [stream, capturedImage]);

  /**
   * Capture photo from video stream
   */
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsProcessing(true);

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob (with fallback to base64)
      let blob: Blob;
      try {
        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to create blob'));
            },
            'image/jpeg',
            0.85
          );
        });
      } catch (blobError) {
        console.warn('⚠️ Blob creation failed, using base64 fallback:', blobError);
        // Fallback: use toDataURL and convert to blob
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        const base64Data = base64.split(',')[1];
        const binaryData = atob(base64Data);
        const arrayBuffer = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          arrayBuffer[i] = binaryData.charCodeAt(i);
        }
        blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
      }

      // Create temporary file
      const tempFile = new File(
        [blob],
        `${documentType || 'document'}_${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      );

      // Process image (compress, validate, remove EXIF)
      console.log('📸 Processing captured image...');
      const { file: processedFile, quality } = await prepareImageForUpload(tempFile);

      // Show warnings if any
      if (quality.warnings.length > 0) {
        toast.warning(quality.warnings[0]);
      }

      // Show preview
      const previewUrl = URL.createObjectURL(processedFile);
      setCapturedImage(previewUrl);

      console.log('✅ Image captured and processed:', {
        original: `${(tempFile.size / 1024).toFixed(1)}KB`,
        processed: `${(processedFile.size / 1024).toFixed(1)}KB`,
        quality: quality.score
      });

      // Store file for confirmation
      (window as any).__capturedFile = processedFile;

    } catch (error: any) {
      console.error('❌ Capture failed:', error);
      toast.error(error.message || 'Failed to capture photo');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Confirm captured photo
   */
  const handleConfirm = () => {
    const file = (window as any).__capturedFile;
    if (file) {
      onCapture(file);
      delete (window as any).__capturedFile;
      stopCamera();
    }
  };

  /**
   * Retake photo
   */
  const handleRetake = () => {
    setCapturedImage(null);
    delete (window as any).__capturedFile;
    
    // Restart video stream
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  };

  /**
   * Switch between cameras
   */
  const handleSwitchCamera = async () => {
    if (devices.length <= 1) return;

    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];

    await switchCamera(nextDevice.deviceId);
  };

  /**
   * Error states - wrapped in Dialog
   */
  if (!isCameraSupported) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
        <DialogContent className="sm:max-w-md">
          <VisuallyHidden>
            <DialogTitle>Camera Not Supported</DialogTitle>
          </VisuallyHidden>
          <div className="space-y-4 p-2">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Camera is not supported in this browser. Please use a modern browser or upload a file instead.
              </AlertDescription>
            </Alert>
            <Button onClick={onCancel} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error && !hasPermission) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
        <DialogContent className="sm:max-w-md">
          <VisuallyHidden>
            <DialogTitle>Camera Permission Required</DialogTitle>
          </VisuallyHidden>
          <div className="space-y-4 p-2">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={requestPermissions} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={onCancel} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent 
        className="p-0 gap-0 max-w-full w-full h-[95vh] sm:h-[90vh] border-0 bg-black overflow-hidden"
        style={{
          maxWidth: '100vw',
          borderRadius: '0.75rem'
        }}
      >
        <VisuallyHidden>
          <DialogTitle>
            {capturedImage ? 'Review Photo' : `Capture ${documentType || 'Document'}`}
          </DialogTitle>
        </VisuallyHidden>
        <div 
          className="flex flex-col h-full w-full bg-black rounded-lg overflow-hidden"
        >
          {/* Header - Compact */}
          <div className="bg-black/90 backdrop-blur-sm p-2 sm:p-3 flex items-center justify-between flex-shrink-0 border-b border-white/10">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm sm:text-base truncate">
            {capturedImage ? 'Review Photo' : documentType || 'Take Photo'}
          </h3>
        </div>
        <Button
          onClick={onCancel}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-8 w-8 ml-2 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Camera Preview / Captured Image */}
      <div 
        className="flex-1 relative bg-black"
        style={{
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="text-center text-white space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto" />
              <p>Starting camera...</p>
            </div>
          </div>
        )}

        {/* Captured image preview */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-full max-h-full object-contain relative z-10"
          />
        )}

        {/* Video stream - ALWAYS RENDERED (hidden when captured) */}
        {!capturedImage && (
          <>
            {/* Stream Status Indicator */}
            <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full text-white text-xs backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Camera Active</span>
            </div>

            {/* Video stream - SIMPLIFIED */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#000'
              }}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                console.log('📹 [Video] METADATA LOADED:', {
                  width: v.videoWidth,
                  height: v.videoHeight,
                  readyState: v.readyState,
                  paused: v.paused,
                  srcObject: !!v.srcObject
                });
              }}
              onCanPlay={(e) => {
                const v = e.currentTarget;
                console.log('📹 [Video] CAN PLAY:', {
                  readyState: v.readyState,
                  paused: v.paused,
                  size: `${v.videoWidth}x${v.videoHeight}`
                });
              }}
              onPlay={() => console.log('📹 [Video] PLAY EVENT')}
              onPlaying={(e) => {
                const v = e.currentTarget;
                console.log('📹 [Video] PLAYING:', {
                  size: `${v.videoWidth}x${v.videoHeight}`,
                  readyState: v.readyState
                });
              }}
              onError={(e) => {
                console.error('❌ [Video] ERROR:', e);
              }}
              onStalled={() => console.warn('⚠️ [Video] STALLED')}
              onSuspend={() => console.warn('⚠️ [Video] SUSPENDED')}
            />

            {/* Document guide overlay - Compact and centered */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-4">
              <div className="relative w-[85%] max-w-sm aspect-[4/3]">
                {/* Corner guides - Minimalistic */}
                <div className="absolute top-0 left-0 w-5 h-5 sm:w-6 sm:h-6 border-t-[2px] border-l-[2px] border-white/90 rounded-tl" />
                <div className="absolute top-0 right-0 w-5 h-5 sm:w-6 sm:h-6 border-t-[2px] border-r-[2px] border-white/90 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-5 h-5 sm:w-6 sm:h-6 border-b-[2px] border-l-[2px] border-white/90 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 border-b-[2px] border-r-[2px] border-white/90 rounded-br" />
                
                {/* Instruction - Positioned better */}
                <div className="absolute -bottom-8 left-0 right-0 text-center">
                  <p className="text-white text-[11px] sm:text-xs bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 inline-block font-medium">
                    Align document within frame
                  </p>
                </div>
              </div>
            </div>

          </>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls - Compact bottom bar */}
      <div 
          className="bg-black/90 backdrop-blur-sm border-t border-white/10 flex-shrink-0"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))', // Safe area for notch phones
          }}
        >
          {capturedImage ? (
          // Confirm/Retake controls
          <div className="flex gap-2 p-3 sm:p-4">
            <Button
              onClick={handleRetake}
              variant="outline"
              className="flex-1 h-10 sm:h-11 text-sm border-white/20 text-white hover:bg-white/10"
              disabled={isProcessing}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retake
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 h-10 sm:h-11 text-sm bg-green-600 hover:bg-green-700"
              disabled={isProcessing}
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Use Photo
            </Button>
          </div>
        ) : (
          // Capture controls
          <div className="flex items-center justify-center gap-6 py-3 px-4">
            {/* Switch camera (if multiple cameras) */}
            {devices.length > 1 && (
              <Button
                onClick={handleSwitchCamera}
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-white hover:bg-white/10"
                disabled={isLoading || isProcessing}
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>
            )}

            {/* Capture button */}
            <Button
              onClick={handleCapture}
              size="icon"
              disabled={isLoading || isProcessing || !stream}
              className="h-14 w-14 rounded-full bg-white hover:bg-gray-200 disabled:bg-gray-600 disabled:opacity-50 shadow-xl ring-2 ring-white/20"
            >
              {isProcessing ? (
                <Loader2 className="h-6 w-6 animate-spin text-black" />
              ) : (
                <Camera className="h-6 w-6 text-black" />
              )}
            </Button>

            {/* Spacer for symmetry */}
            {devices.length > 1 && <div className="w-10" />}
          </div>
        )}

        {/* Error message */}
        {error && hasPermission && (
          <div className="px-3 pb-2">
            <Alert variant="destructive" className="py-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs leading-tight">{error}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  </DialogContent>
</Dialog>
  );
}

