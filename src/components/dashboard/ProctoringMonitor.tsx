import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Eye, Monitor, AlertTriangle, Shield } from "lucide-react";

interface ProctoringMonitorProps {
  attemptId: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  isActive: boolean;
  onViolation?: (type: string) => void;
}

interface ProctoringStats {
  tabSwitchCount: number;
  fullscreenExitCount: number;
  faceNotDetectedCount: number;
  multipleFacesCount: number;
  eyeMovementViolations: number;
  photosCaptured: number;
}

const ProctoringMonitor = ({
  attemptId,
  assessmentId,
  studentId,
  studentName,
  isActive,
  onViolation,
}: ProctoringMonitorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stats, setStats] = useState<ProctoringStats>({
    tabSwitchCount: 0,
    fullscreenExitCount: 0,
    faceNotDetectedCount: 0,
    multipleFacesCount: 0,
    eyeMovementViolations: 0,
    photosCaptured: 0,
  });
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const faceDetectorRef = useRef<any>(null);

  // Initialize FaceDetector (Chrome only)
  useEffect(() => {
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        faceDetectorRef.current = new (window as any).FaceDetector({ maxDetectedFaces: 5, fastMode: true });
      } catch {
        faceDetectorRef.current = null;
      }
    }
  }, []);

  const logEvent = useCallback(async (eventType: string, eventData: Record<string, any> = {}, photoUrl?: string) => {
    try {
      await supabase.from("proctoring_logs").insert({
        attempt_id: attemptId,
        assessment_id: assessmentId,
        student_id: studentId,
        student_name: studentName,
        event_type: eventType,
        event_data: eventData,
        photo_url: photoUrl || null,
      } as any);
    } catch (e) {
      console.error("Failed to log proctoring event:", e);
    }
  }, [attemptId, assessmentId, studentId, studentName]);

  // Start camera
  useEffect(() => {
    if (!isActive) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 320, height: 240 },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
        setCameraError(null);
        logEvent("camera_started");
      } catch (err: any) {
        setCameraError("Camera access denied. Proctoring requires camera access.");
        logEvent("camera_denied", { error: err.message });
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraReady(false);
    };
  }, [isActive]);

  // Request fullscreen
  useEffect(() => {
    if (!isActive) return;

    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
        logEvent("fullscreen_entered");
      } catch {
        logEvent("fullscreen_denied");
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isActive) {
        setStats(prev => {
          const updated = { ...prev, fullscreenExitCount: prev.fullscreenExitCount + 1 };
          return updated;
        });
        logEvent("fullscreen_exit");
        onViolation?.("fullscreen_exit");
        toast.warning("⚠️ Fullscreen exited! This has been recorded.", { duration: 3000 });
        // Try to re-enter
        setTimeout(() => {
          if (isActive) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }, 1000);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isActive]);

  // Tab switch detection
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStats(prev => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }));
        logEvent("tab_switch", { timestamp: new Date().toISOString() });
        onViolation?.("tab_switch");
        toast.warning("⚠️ Tab switch detected! This has been recorded.", { duration: 3000 });
      }
    };

    const handleBlur = () => {
      setStats(prev => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }));
      logEvent("window_blur");
      onViolation?.("tab_switch");
    };

    // Prevent right-click and copy
    const handleContextMenu = (e: Event) => { e.preventDefault(); };
    const handleCopy = (e: Event) => { e.preventDefault(); };
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common shortcuts
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 'p')) {
        e.preventDefault();
      }
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive]);

  // Periodic photo capture + face detection
  useEffect(() => {
    if (!isActive || !cameraReady) return;

    const captureAndAnalyze = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 320;
      canvas.height = 240;
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);

      setStats(prev => ({ ...prev, photosCaptured: prev.photosCaptured + 1 }));

      // Face detection
      if (faceDetectorRef.current) {
        try {
          const faces = await faceDetectorRef.current.detect(canvas);
          if (faces.length === 0) {
            setStats(prev => ({ ...prev, faceNotDetectedCount: prev.faceNotDetectedCount + 1 }));
            logEvent("face_not_detected", { faceCount: 0 });
            onViolation?.("face_not_detected");
          } else if (faces.length > 1) {
            setStats(prev => ({ ...prev, multipleFacesCount: prev.multipleFacesCount + 1 }));
            logEvent("multiple_faces", { faceCount: faces.length });
            onViolation?.("multiple_faces");
            toast.warning(`⚠️ ${faces.length} faces detected! Only one person allowed.`, { duration: 3000 });
          } else {
            // Check eye/face position for gaze (basic heuristic)
            const face = faces[0];
            const box = face.boundingBox;
            const centerX = box.x + box.width / 2;
            const frameCenter = 160;
            const deviation = Math.abs(centerX - frameCenter);
            if (deviation > 80) {
              setStats(prev => ({ ...prev, eyeMovementViolations: prev.eyeMovementViolations + 1 }));
              logEvent("eye_movement", { deviation, centerX, frameCenter });
              onViolation?.("eye_movement");
            }
          }

          logEvent("photo_capture", { faceCount: faces.length });
        } catch {
          logEvent("photo_capture", { faceDetectionUnavailable: true });
        }
      } else {
        logEvent("photo_capture", { faceDetectionUnavailable: true });
      }
    };

    // Capture every 15 seconds
    intervalRef.current = setInterval(captureAndAnalyze, 15000);
    // Initial capture after 3s
    const timeout = setTimeout(captureAndAnalyze, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(timeout);
    };
  }, [isActive, cameraReady]);

  // Save summary when proctoring ends
  const saveSummary = useCallback(async () => {
    const s = statsRef.current;
    const totalViolations = s.tabSwitchCount + s.fullscreenExitCount + s.faceNotDetectedCount + s.multipleFacesCount + s.eyeMovementViolations;
    const score = Math.max(0, 100 - (totalViolations * 5));
    const status = score >= 80 ? "Good" : score >= 50 ? "Average" : "Poor";

    try {
      await supabase.from("proctoring_summary").insert({
        attempt_id: attemptId,
        assessment_id: assessmentId,
        student_id: studentId,
        student_name: studentName,
        tab_switch_count: s.tabSwitchCount,
        fullscreen_exit_count: s.fullscreenExitCount,
        face_not_detected_count: s.faceNotDetectedCount,
        multiple_faces_count: s.multipleFacesCount,
        eye_movement_violations: s.eyeMovementViolations,
        photos_captured: s.photosCaptured,
        proctoring_score: score,
        status,
      } as any);
    } catch (e) {
      console.error("Failed to save proctoring summary:", e);
    }
  }, [attemptId, assessmentId, studentId, studentName]);

  // Expose saveSummary
  useEffect(() => {
    (window as any).__proctoringEndSession = saveSummary;
    return () => { delete (window as any).__proctoringEndSession; };
  }, [saveSummary]);

  if (!isActive) return null;

  return (
    <div className="fixed top-2 right-2 z-50 flex flex-col items-end gap-2">
      {/* Camera preview */}
      <div className="relative bg-card border-2 border-primary/50 rounded-lg overflow-hidden shadow-elevated">
        <video
          ref={videoRef}
          className="w-24 h-18 object-cover"
          autoPlay
          muted
          playsInline
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-1.5 py-0.5 flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${cameraReady ? "bg-success animate-pulse" : "bg-destructive"}`} />
          <span className="text-[9px] text-foreground font-medium">
            {cameraReady ? "Recording" : "No Camera"}
          </span>
        </div>
      </div>

      {/* Proctoring status badge */}
      <div className="bg-card border border-border rounded-lg p-2 shadow-card text-[10px] space-y-0.5">
        <div className="flex items-center gap-1 text-primary font-semibold">
          <Shield className="h-3 w-3" /> Proctored
        </div>
        {stats.tabSwitchCount > 0 && (
          <div className="flex items-center gap-1 text-destructive">
            <Monitor className="h-2.5 w-2.5" /> {stats.tabSwitchCount} tab switch
          </div>
        )}
        {stats.fullscreenExitCount > 0 && (
          <div className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-2.5 w-2.5" /> {stats.fullscreenExitCount} fs exit
          </div>
        )}
        {stats.faceNotDetectedCount > 0 && (
          <div className="flex items-center gap-1 text-warning">
            <Eye className="h-2.5 w-2.5" /> {stats.faceNotDetectedCount} no face
          </div>
        )}
        {stats.multipleFacesCount > 0 && (
          <div className="flex items-center gap-1 text-destructive">
            <Camera className="h-2.5 w-2.5" /> {stats.multipleFacesCount} multi-face
          </div>
        )}
      </div>

      {cameraError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 text-[10px] text-destructive max-w-[180px]">
          {cameraError}
        </div>
      )}
    </div>
  );
};

export default ProctoringMonitor;
