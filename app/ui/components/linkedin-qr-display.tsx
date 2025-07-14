import type React from 'react'
import { useState } from 'react'
import { Form } from 'react-router'
import type { QrConfig, QrGenerationResult } from '../../business/qr/qr.common'
import { QrCode } from './qr-code'

export interface LinkedinQrDisplayProps {
  linkedinUrl: string
  qrConfig?: Partial<QrConfig> | undefined
  qrCode?: QrGenerationResult | null | undefined
  qrError?: string | null | undefined
  showDownloadButton?: boolean
  showConfigPanel?: boolean
  className?: string
}

export const LinkedinQrDisplay: React.FC<LinkedinQrDisplayProps> = ({
  linkedinUrl,
  qrConfig = {},
  qrCode,
  qrError,
  showDownloadButton = true,
  showConfigPanel = false,
  className = '',
}) => {
  const [showConfig, setShowConfig] = useState(false)

  const handleDownload = () => {
    if (!qrCode?.dataUrl) return

    const link = document.createElement('a')
    link.href = qrCode.dataUrl
    link.download = `linkedin-qr-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    if (!qrCode?.dataUrl) return

    if (navigator.share) {
      try {
        // Convert data URL to blob for sharing
        const response = await fetch(qrCode.dataUrl)
        const blob = await response.blob()
        const file = new File([blob], 'linkedin-qr.png', { type: 'image/png' })

        await navigator.share({
          title: 'My LinkedIn Profile QR Code',
          text: 'Scan this QR code to view my LinkedIn profile',
          files: [file],
        })
      } catch {
        // Fallback to download if share fails
        handleDownload()
      }
    } else {
      // Fallback to download if share is not supported
      handleDownload()
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* QR Code Display */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-4 text-center">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-lg dark:text-white">
              Your LinkedIn QR Code
            </h2>
          </div>

          <QrCode
            qrCode={qrCode}
            error={qrError}
            className="mx-auto"
            linkedinUrl={linkedinUrl}
            qrConfig={qrConfig}
          />

          <div className="text-gray-600 text-sm dark:text-gray-400">
            <p className="mb-1 font-medium">LinkedIn Profile</p>
            <p className="break-all">{linkedinUrl}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(showDownloadButton || showConfigPanel) && (
        <div className="flex flex-wrap justify-center gap-3">
          {showDownloadButton && qrCode && (
            <>
              <button
                onClick={handleDownload}
                disabled={!!qrError}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 font-medium text-sm text-white shadow-lg transition-all hover:scale-105 hover:from-purple-700 hover:to-purple-800 hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:hover:scale-100"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>

              <button
                onClick={handleShare}
                disabled={!!qrError}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 font-medium text-sm text-white shadow-lg transition-all hover:scale-105 hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:hover:scale-100"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>
            </>
          )}

          {showConfigPanel && (
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 font-medium text-sm text-white shadow-lg transition-all hover:scale-105 hover:from-orange-600 hover:to-red-600 hover:shadow-xl"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {showConfig ? 'Hide Settings' : 'Customize'}
            </button>
          )}
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
          <h3 className="mb-4 font-semibold text-gray-900 text-md dark:text-white">
            QR Code Settings
          </h3>

          <Form method="post" className="space-y-6">
            <input type="hidden" name="_action" value="update_config" />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Size Setting */}
              <div>
                <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Size (pixels)
                </label>
                <select
                  name="size"
                  defaultValue={qrConfig?.size || 256}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value={128}>Small (128px)</option>
                  <option value={256}>Medium (256px)</option>
                  <option value={512}>Large (512px)</option>
                  <option value={1024}>Extra Large (1024px)</option>
                </select>
              </div>

              {/* Error Correction Level */}
              <div>
                <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Error Correction
                </label>
                <select
                  name="errorCorrectionLevel"
                  defaultValue={qrConfig?.errorCorrectionLevel || 'M'}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="L">Low (~7%)</option>
                  <option value="M">Medium (~15%)</option>
                  <option value="Q">Quartile (~25%)</option>
                  <option value="H">High (~30%)</option>
                </select>
              </div>

              {/* Dark Color */}
              <div className="w-full">
                <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Dark Color
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <input
                      type="color"
                      name="darkColor"
                      defaultValue={qrConfig?.colors?.dark || '#000000'}
                      className="h-12 w-16 cursor-pointer rounded-lg border-2 border-gray-300 bg-transparent dark:border-gray-600"
                      style={{
                        padding: '2px',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    name="darkColorText"
                    defaultValue={qrConfig?.colors?.dark || '#000000'}
                    placeholder="#000000"
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-3 font-mono text-gray-900 text-sm uppercase tracking-wider dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Light Color */}
              <div className="w-full">
                <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Light Color
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <input
                      type="color"
                      name="lightColor"
                      defaultValue={qrConfig?.colors?.light || '#FFFFFF'}
                      className="h-12 w-16 cursor-pointer rounded-lg border-2 border-gray-300 bg-transparent dark:border-gray-600"
                      style={{
                        padding: '2px',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    name="lightColorText"
                    defaultValue={qrConfig?.colors?.light || '#FFFFFF'}
                    placeholder="#FFFFFF"
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-3 font-mono text-gray-900 text-sm uppercase tracking-wider dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-2.5 font-medium text-sm text-white shadow-lg transition-all hover:scale-105 hover:from-purple-700 hover:to-purple-800 hover:shadow-xl"
              >
                Update QR Code
              </button>
            </div>
          </Form>
        </div>
      )}
    </div>
  )
}

// Removed unused default export
