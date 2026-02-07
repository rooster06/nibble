"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPresignedUrls, extractMenu, getMenuData, getMenuImages } from "@/lib/api";

type UploadState = "idle" | "uploading" | "extracting" | "loading_images" | "complete" | "error";

export default function MenuUpload() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => [...prev, ...imageFiles]);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    try {
      setState("uploading");
      setError(null);

      // Get presigned URLs
      const { run_id, upload_urls } = await getPresignedUrls(
        files.length,
        files.map((f) => f.type)
      );

      // Upload files to S3
      await Promise.all(
        files.map((file, i) =>
          fetch(upload_urls[i], {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          })
        )
      );

      // Start extraction (returns immediately)
      setState("extracting");
      await extractMenu(run_id);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max
      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
        const result = await getMenuData(run_id);

        if (result.status === "EXTRACTED" || result.menu) {
          // Menu extracted — now wait for images (already being fetched by backend)
          setState("loading_images");
          await getMenuImages(run_id);
          setState("complete");
          router.push(`/menu/${run_id}`);
          return;
        }

        if (result.status === "FAILED") {
          throw new Error(result.error || "Extraction failed");
        }

        attempts++;
      }

      throw new Error("Extraction timed out");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${
            dragOver
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
              : "border-gray-300 dark:border-gray-700 hover:border-primary-400"
          }
        `}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="cursor-pointer flex flex-col items-center"
        >
          <svg
            className="w-12 h-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Drop menu photos here
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            or click to browse
          </span>
        </label>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Menu page ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={files.length === 0 || state === "uploading" || state === "extracting" || state === "loading_images"}
        className={`
          w-full py-3 px-6 rounded-xl font-semibold text-white transition-all
          ${
            files.length === 0 || state === "uploading" || state === "extracting" || state === "loading_images"
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-primary-600 hover:bg-primary-700 active:scale-[0.98]"
          }
        `}
      >
        {state === "uploading" && "Uploading..."}
        {state === "extracting" && "Analyzing menu..."}
        {state === "loading_images" && "Loading dish photos..."}
        {state === "idle" && `Analyze Menu${files.length > 0 ? ` (${files.length} photo${files.length > 1 ? "s" : ""})` : ""}`}
        {state === "error" && "Try Again"}
        {state === "complete" && "Done!"}
      </button>
    </div>
  );
}
