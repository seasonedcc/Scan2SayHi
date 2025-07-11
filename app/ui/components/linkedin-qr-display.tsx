import React, { useState } from 'react'
import type { QrConfig } from '../../business/qr/qr.common'
import { useQrCode } from '../hooks/use-qr-code'
import { QrCode } from './qr-code'

export interface LinkedinQrDisplayProps {
  linkedinUrl: string
  qrConfig?: Partial<QrConfig> | undefined
  showDownloadButton?: boolean
  showConfigPanel?: boolean
  className?: string
}

export const LinkedinQrDisplay: React.FC<LinkedinQrDisplayProps> = ({
  linkedinUrl,
  qrConfig = {},
  showDownloadButton = true,
  showConfigPanel = false,
  className = '',
}) => {
  const [currentConfig, setCurrentConfig] =
    useState<Partial<QrConfig>>(qrConfig)
  const [showConfig, setShowConfig] = useState(showConfigPanel)

  const { qrCode, isLoading, error, retry, generateQrCode } = useQrCode({
    config: currentConfig,
  })

  // Generate QR code when URL or config changes
  React.useEffect(() => {
    if (linkedinUrl) {
      generateQrCode(linkedinUrl)
    }
  }, [linkedinUrl, currentConfig, generateQrCode])

  const handleConfigChange = (field: keyof QrConfig, value: any) => {
    setCurrentConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

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
            content={linkedinUrl}
            config={currentConfig}
            className="mx-auto"
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="mb-2 text-red-800 text-sm dark:text-red-400">
                Failed to generate QR code
              </p>
              <p className="mb-3 text-red-600 text-xs dark:text-red-500">
                {error}
              </p>
              <button
                onClick={retry}
                className="rounded bg-red-100 px-3 py-1 text-red-800 text-sm transition-colors hover:bg-red-200 dark:bg-red-800/30 dark:text-red-400 dark:hover:bg-red-800/50"
              >
                Try Again
              </button>
            </div>
          )}

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
                disabled={isLoading || !!error}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
              >
                <span>📥</span>
                Download
              </button>

              <button
                onClick={handleShare}
                disabled={isLoading || !!error}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-green-700 disabled:bg-gray-400"
              >
                <span>📤</span>
                Share
              </button>
            </>
          )}

          {showConfigPanel && (
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-gray-700"
            >
              <span>⚙️</span>
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Size Setting */}
            <div>
              <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                Size (pixels)
              </label>
              <select
                value={currentConfig.size || 256}
                onChange={(e) =>
                  handleConfigChange('size', Number(e.target.value))
                }
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
                value={currentConfig.errorCorrectionLevel || 'M'}
                onChange={(e) =>
                  handleConfigChange('errorCorrectionLevel', e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="L">Low (~7%)</option>
                <option value="M">Medium (~15%)</option>
                <option value="Q">Quartile (~25%)</option>
                <option value="H">High (~30%)</option>
              </select>
            </div>

            {/* Dark Color */}
            <div>
              <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                Dark Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={currentConfig.colors?.dark || '#000000'}
                  onChange={(e) =>
                    handleConfigChange('colors', {
                      ...currentConfig.colors,
                      dark: e.target.value,
                      light: currentConfig.colors?.light || '#FFFFFF',
                    })
                  }
                  className="h-10 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={currentConfig.colors?.dark || '#000000'}
                  onChange={(e) =>
                    handleConfigChange('colors', {
                      ...currentConfig.colors,
                      dark: e.target.value,
                      light: currentConfig.colors?.light || '#FFFFFF',
                    })
                  }
                  placeholder="#000000"
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Light Color */}
            <div>
              <label className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                Light Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={currentConfig.colors?.light || '#FFFFFF'}
                  onChange={(e) =>
                    handleConfigChange('colors', {
                      dark: currentConfig.colors?.dark || '#000000',
                      ...currentConfig.colors,
                      light: e.target.value,
                    })
                  }
                  className="h-10 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={currentConfig.colors?.light || '#FFFFFF'}
                  onChange={(e) =>
                    handleConfigChange('colors', {
                      dark: currentConfig.colors?.dark || '#000000',
                      ...currentConfig.colors,
                      light: e.target.value,
                    })
                  }
                  placeholder="#FFFFFF"
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LinkedinQrDisplay
