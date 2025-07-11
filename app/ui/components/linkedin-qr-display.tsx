import React, { useState } from 'react'
import type { QrConfig, QrGenerationResult } from '../../business/qr/qr.common'
import { QrCode } from './qr-code'
import { Form } from 'react-router'

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
              LinkedIn QR Code
            </h2>
          </div>

          <QrCode
            qrCode={qrCode}
            error={qrError}
            className="mx-auto"
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

        </div>
      )}

    </div>
  )
}

export default LinkedinQrDisplay
