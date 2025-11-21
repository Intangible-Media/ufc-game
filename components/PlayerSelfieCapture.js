// app/join/PlayerSelfieCapture.js
"use client";

import { useEffect, useRef, useState } from "react";

export default function PlayerSelfieCapture() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hiddenInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // When we get a stream AND the video node exists, attach them
  useEffect(() => {
    if (stream && videoRef.current) {
      const videoEl = videoRef.current;
      console.log("Attaching stream to video element...");
      videoEl.srcObject = stream;

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(
              "Video playing. Dimensions:",
              videoEl.videoWidth,
              videoEl.videoHeight
            );
          })
          .catch((err) => {
            console.warn("Error calling video.play():", err);
          });
      }
    }
  }, [stream]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const openCamera = async () => {
    try {
      console.log("Requesting camera...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      console.log("Camera stream received:", mediaStream);
      setStream(mediaStream);
      setIsCameraOn(true);
      setHasPhoto(false);
      setPreviewUrl(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera access is required to join the game.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !hiddenInputRef.current) {
      console.warn("Missing refs for capture");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const vw = video.videoWidth || video.clientWidth || 640;
    const vh = video.videoHeight || video.clientHeight || 480;

    console.log("Capture dimensions:", { vw, vh });

    canvas.width = vw;
    canvas.height = vh;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("No 2D context");
      return;
    }

    ctx.drawImage(video, 0, 0, vw, vh);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    console.log("Generated data URL length:", dataUrl.length);

    hiddenInputRef.current.value = dataUrl;
    setPreviewUrl(dataUrl);
    setHasPhoto(true);
  };

  const retakePhoto = () => {
    setHasPhoto(false);
    setPreviewUrl(null);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-[11px] uppercase tracking-[0.25em] text-zinc-400">
        Your Fight Selfie
      </label>
      <p className="text-[11px] text-zinc-500">
        Tap the button to open your camera and take a quick selfie. We&apos;ll
        use this in the game.
      </p>

      {/* Hidden input that actually gets submitted with the form */}
      <input
        ref={hiddenInputRef}
        type="hidden"
        name="playerPhotoData"
        id="playerPhotoData"
      />

      {/* Live video preview */}
      {isCameraOn && !hasPhoto && (
        <video
          ref={videoRef}
          className="w-full rounded-xl border border-zinc-700"
          autoPlay
          playsInline
          muted
        />
      )}

      {/* Captured image preview */}
      {hasPhoto && previewUrl && (
        <div className="w-full rounded-xl border border-yellow-500 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Your captured selfie"
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {/* Canvas used for capture (not visible) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Buttons */}
      <div className="flex gap-2">
        {!isCameraOn && (
          <button
            type="button"
            onClick={openCamera}
            className="flex-1 rounded-lg bg-zinc-800 border border-zinc-600 py-2 text-sm font-semibold uppercase hover:bg-zinc-700"
          >
            Open Camera
          </button>
        )}

        {isCameraOn && !hasPhoto && (
          <button
            type="button"
            onClick={capturePhoto}
            className="flex-1 rounded-lg bg-yellow-500 py-2 text-sm font-semibold text-black uppercase hover:bg-yellow-400"
          >
            Take Photo
          </button>
        )}

        {hasPhoto && (
          <button
            type="button"
            onClick={retakePhoto}
            className="flex-1 rounded-lg bg-zinc-700 py-2 text-sm font-semibold uppercase hover:bg-zinc-600"
          >
            Retake
          </button>
        )}
      </div>

      {hasPhoto && (
        <p className="text-[11px] text-emerald-400">
          Selfie captured! You&apos;re good to join.
        </p>
      )}
    </div>
  );
}
