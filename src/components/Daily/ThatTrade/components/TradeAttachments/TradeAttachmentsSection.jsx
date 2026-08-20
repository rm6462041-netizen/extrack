import React from "react";
import LegacyIcon from "@/components/Common/LegacyIcon/LegacyIcon";
import { Card, CardHeader, CardTitle } from "@/components/Common/base";
import { useAuth } from "@/context/AuthContext";
import { useAppDialog } from "@/context/AppDialogContext";
import { useQueryClient } from "@tanstack/react-query";
import { useTradeScreenshots } from "../../hooks/useTradeScreenshots";
import DeleteScreenshotModal from "../modals/DeleteScreenshotModal";
import FullscreenImageViewer from "../modals/FullscreenImageViewer";

export default function TradeAttachmentsSection({ trade }) {
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();

  const {
    screenshots,
    uploadPreview,
    uploading,
    deleting,
    showDeleteConfirm,
    showFullscreen,
    fullscreenImage,
    handleFileChange,
    deleteScreenshot,
    confirmDelete,
    openFullscreen,
    closeFullscreen,
    closeDeleteModal,
  } = useTradeScreenshots({ trade, user, queryClient, notify });

  return (
    <>
      <Card variant="default" padding="sm">
        <CardHeader className="pb-2.5 mb-2.5 max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <CardTitle className="flex items-center gap-1.5">
            <LegacyIcon className="fas fa-paperclip" /> Attachments ({screenshots?.length || 0})
          </CardTitle>
          <div>
            <input
              type="file"
              id="screenshot-upload"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              hidden
            />
            <label
              htmlFor="screenshot-upload"
              className="bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer max-sm:self-end"
            >
              <LegacyIcon className="fas fa-plus" /> Add
            </label>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {uploadPreview && (
            <div className="group relative aspect-video rounded-lg overflow-hidden border border-[var(--border-medium)] cursor-pointer transition-all hover:scale-[1.02] hover:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:shadow-md opacity-65 cursor-progress">
              <img className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" src={uploadPreview} alt="Uploading attachment" />
            </div>
          )}
          {screenshots && screenshots.length > 0 ? (
            screenshots.map((url, index) => (
              <div
                key={url || index}
                className="group relative aspect-video rounded-lg overflow-hidden border border-[var(--border-medium)] cursor-pointer transition-all hover:scale-[1.02] hover:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:shadow-md"
              >
                <img
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  src={url}
                  alt={`Attachment ${index + 1}`}
                  onClick={() => openFullscreen(url)}
                />
                <button
                  className="absolute top-1 right-1 w-5.5 h-5.5 bg-[var(--accent-danger)] hover:bg-[var(--loss-color)] text-[var(--overlay-text)] rounded-full flex items-center justify-center text-base opacity-0 group-hover:opacity-100 transition-opacity z-10 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 border-0 cursor-pointer"
                  onClick={(event) => deleteScreenshot(url, event)}
                  disabled={deleting}
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            !uploadPreview && (
              <div className="col-span-full text-center py-4 px-3 text-[var(--text-secondary)] text-xs bg-[var(--bg-secondary)] rounded-lg border border-dashed border-[var(--border-medium)]">
                No attachments yet
              </div>
            )
          )}
        </div>
      </Card>

      <DeleteScreenshotModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        isDeleting={deleting}
      />

      <FullscreenImageViewer
        isOpen={showFullscreen}
        onClose={closeFullscreen}
        imageUrl={fullscreenImage}
      />
    </>
  );
}
