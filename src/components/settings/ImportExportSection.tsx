'use client'

import { useState, useRef } from 'react'
import { useLists } from '@/lib/db/hooks'
import { exportData, downloadExport, parseImportFile, importData } from '@/lib/db/export-import'

type ImportMode = 'merge' | 'replace'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImportExportSection() {
  const lists = useLists()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [includeSettings, setIncludeSettings] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const allIds = lists?.map(l => l.id) ?? []
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  function toggleList(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const exportDisabled = selectedIds.size === 0 && !includeSettings

  async function handleExport() {
    setIsExporting(true)
    setExportStatus(null)
    try {
      const result = await exportData({ listIds: Array.from(selectedIds), includeSettings })
      downloadExport(result)
      setExportStatus({ type: 'success', message: 'Export downloaded!' })
      setTimeout(() => setExportStatus(null), 3000)
    } catch (err) {
      setExportStatus({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' })
    } finally {
      setIsExporting(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImportFile(file)
    setImportStatus(null)
    setShowReplaceConfirm(false)
  }

  function handleImportClick() {
    if (!importFile) return
    if (importMode === 'replace') {
      setShowReplaceConfirm(true)
    } else {
      void executeImport()
    }
  }

  async function executeImport() {
    if (!importFile) return
    setIsImporting(true)
    setImportStatus(null)
    setShowReplaceConfirm(false)
    try {
      const content = await parseImportFile(importFile)
      const result = await importData(content, importMode)
      const listWord = result.listsImported === 1 ? 'list' : 'lists'
      const itemWord = result.itemsImported === 1 ? 'item' : 'items'
      setImportStatus({
        type: 'success',
        message: `Imported ${result.listsImported} ${listWord} and ${result.itemsImported} ${itemWord}`,
      })
      setImportFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      let message = 'Import failed'
      if (err instanceof SyntaxError || (err instanceof Error && err.message.includes('Invalid JSON'))) {
        message = 'Invalid file format - please select a valid export JSON file'
      } else if (err instanceof Error && (err.message.includes('ZodError') || err.message.includes('Expected') || err.message.includes('Required') || err.message.includes('invalid_type'))) {
        message = 'Invalid file format - the file does not match the expected export structure'
      } else if (err instanceof Error && err.message.includes('unknown list ID')) {
        message = 'Invalid file format - the file contains items that reference missing lists'
      } else if (err instanceof Error) {
        message = err.message
      }
      setImportStatus({ type: 'error', message })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-5 md:p-6 relative overflow-hidden">
        <h2 className="text-lg font-semibold mb-1">Export Data</h2>
        <p className="text-sm text-surface-500 dark:text-surface-400 mb-5">
          Download your lists and settings as a JSON file.
        </p>

        {lists && lists.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Lists</span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {lists.map(list => (
                <label key={list.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(list.id)}
                    onChange={() => toggleList(list.id)}
                    className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-sm text-surface-700 dark:text-surface-300 group-hover:text-surface-900 dark:group-hover:text-surface-100 transition-colors truncate">
                    {list.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {lists?.length === 0 && (
          <p className="text-sm text-surface-400 dark:text-surface-500 mb-4 italic">No lists to export.</p>
        )}

        <label className="flex items-center gap-3 cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={includeSettings}
            onChange={e => setIncludeSettings(e.target.checked)}
            className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
          <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Include Settings</span>
        </label>

        <button
          type="button"
          onClick={handleExport}
          disabled={exportDisabled || isExporting}
          className="btn-primary w-full py-3 text-base"
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </button>

        {exportStatus && (
          <div
            className={`mt-3 flex items-center gap-2 text-sm font-medium p-3 rounded-lg animate-slide-up ${
              exportStatus.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
            }`}
          >
            {exportStatus.type === 'success' ? (
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            ) : (
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            )}
            {exportStatus.message}
          </div>
        )}
      </div>

      <div className="card p-5 md:p-6 relative overflow-hidden">
        <h2 className="text-lg font-semibold mb-1">Import Data</h2>
        <p className="text-sm text-surface-500 dark:text-surface-400 mb-5">
          Restore from a previously exported JSON file.
        </p>

        <div className="mb-5">
          <label htmlFor="import-file-input" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            JSON File
          </label>
          <input
            ref={fileInputRef}
            id="import-file-input"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="block w-full text-sm text-surface-600 dark:text-surface-400
              file:mr-3 file:py-2 file:px-4
              file:rounded-xl file:border-0
              file:text-sm file:font-medium
              file:bg-primary-50 file:text-primary-700
              dark:file:bg-primary-900/30 dark:file:text-primary-300
              hover:file:bg-primary-100 dark:hover:file:bg-primary-900/40
              cursor-pointer transition-colors"
          />
          {importFile && (
            <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
              {importFile.name} &middot; {formatFileSize(importFile.size)}
            </p>
          )}
        </div>

        <div className="mb-5">
          <span className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Import Mode
          </span>
          <div className="flex gap-2">
            {(['merge', 'replace'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setImportMode(mode)
                  setShowReplaceConfirm(false)
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  importMode === mode
                    ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-300 shadow-sm'
                    : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50 dark:bg-surface-900 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800'
                }`}
              >
                {mode === 'merge' ? 'Merge (add alongside existing)' : 'Replace (overwrite everything)'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
            {importMode === 'merge'
              ? 'Add imported lists alongside your existing data.'
              : 'Overwrite all existing data with the imported file.'}
          </p>
        </div>

        {showReplaceConfirm && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-400 mb-3">
              This will delete all existing data. Are you sure?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void executeImport()}
                disabled={isImporting}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              >
                {isImporting ? 'Replacing...' : 'Yes, Replace'}
              </button>
              <button
                type="button"
                onClick={() => setShowReplaceConfirm(false)}
                className="flex-1 btn-ghost text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleImportClick}
          disabled={!importFile || isImporting || showReplaceConfirm}
          className="btn-primary w-full py-3 text-base"
        >
          {isImporting ? 'Importing...' : 'Import'}
        </button>

        {importStatus && (
          <div
            className={`mt-3 flex items-center gap-2 text-sm font-medium p-3 rounded-lg animate-slide-up ${
              importStatus.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
            }`}
          >
            {importStatus.type === 'success' ? (
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            ) : (
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            )}
            {importStatus.message}
          </div>
        )}
      </div>
    </div>
  )
}
