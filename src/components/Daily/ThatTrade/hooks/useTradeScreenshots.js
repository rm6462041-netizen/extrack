import { useState, useEffect, useCallback } from "react";
import api from "@/utils/common/serve";
import { getUserError } from "@/utils/common/errors";
import { compressScreenshot } from "../utils/tradeFormatters";

export function useTradeScreenshots({ trade, user, queryClient, notify } = {}) {
  const [screenshots, setScreenshots] = useState([]);
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [screenshotToDelete, setScreenshotToDelete] = useState("");
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState("");

  useEffect(() => {
    if (trade?.screenshots) {
      try {
        const parsedScreenshots = Array.isArray(trade.screenshots)
          ? trade.screenshots
          : JSON.parse(trade.screenshots);
        setScreenshots(parsedScreenshots || []);
      } catch {
        setScreenshots([]);
      }
    } else {
      setScreenshots([]);
    }
  }, [trade?.screenshots]);

  const uploadScreenshot = useCallback(async (file) => {
    if (!trade?.unique_id || !file) return;

    const previewUrl = URL.createObjectURL(file);
    setUploadPreview(previewUrl);
    setUploading(true);

    try {
      let uploadFile = file;
      try {
        uploadFile = await compressScreenshot(file);
      } catch {
        /* Upload the original image. */
      }

      const formData = new FormData();
      formData.append("screenshot", uploadFile);
      formData.append("unique_id", trade.unique_id);
      const { data } = await api.post("/upload-screenshot", formData);

      if (data.success) {
        setScreenshots(data.screenshots || []);
        if (user?.ID && queryClient) {
          queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
        }
        if (typeof notify === "function") {
          notify("Your attachment is ready.", "success");
        }
      } else {
        throw new Error(data.error || "Attachment could not be uploaded");
      }
    } catch (error) {
      if (typeof notify === "function") {
        notify(getUserError(error, "Attachment could not be uploaded"), "error");
      }
    } finally {
      setUploading(false);
      setUploadPreview("");
      URL.revokeObjectURL(previewUrl);
    }
  }, [trade?.unique_id, user?.ID, queryClient, notify]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadScreenshot(file);
    }
    e.target.value = "";
  }, [uploadScreenshot]);

  const deleteScreenshot = useCallback((screenshotUrl, e) => {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    if (!trade?.unique_id) return;
    setScreenshotToDelete(screenshotUrl);
    setShowDeleteConfirm(true);
  }, [trade?.unique_id]);

  const confirmDelete = useCallback(async () => {
    if (!screenshotToDelete || !trade?.unique_id) return;

    setDeleting(true);
    try {
      const { data } = await api.delete("/delete-screenshot", {
        data: {
          unique_id: trade.unique_id,
          screenshotUrl: screenshotToDelete,
        },
      });

      if (data.success) {
        setScreenshots(data.screenshots || []);
        if (user?.ID && queryClient) {
          queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
        }
        if (typeof notify === "function") {
          notify("Attachment removed.", "success");
        }
      } else {
        throw new Error(data.error || "Attachment could not be deleted");
      }
    } catch (error) {
      if (typeof notify === "function") {
        notify(getUserError(error, "Attachment could not be deleted"), "error");
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setScreenshotToDelete("");
    }
  }, [screenshotToDelete, trade?.unique_id, user?.ID, queryClient, notify]);

  const openFullscreen = useCallback((url) => {
    setFullscreenImage(url);
    setShowFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setShowFullscreen(false);
    setFullscreenImage("");
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteConfirm(false);
    setScreenshotToDelete("");
  }, []);

  return {
    screenshots,
    setScreenshots,
    uploadPreview,
    uploading,
    deleting,
    showDeleteConfirm,
    screenshotToDelete,
    showFullscreen,
    fullscreenImage,
    uploadScreenshot,
    handleFileChange,
    deleteScreenshot,
    confirmDelete,
    openFullscreen,
    closeFullscreen,
    closeDeleteModal,
  };
}

export default useTradeScreenshots;
