// EncryptionPage.jsx - Encrypt & Decrypt Tool (v2)
// Fixes:
//   - Split into two independent panels (encrypt / decrypt)
//   - URL.revokeObjectURL called on every preview change (memory leak fix)
//   - Client-side 50 MB size check before upload
//   - Key confirmation field on encrypt panel
//   - AES label updated to AES-256-GCM
//   - Download uses correct extension (.clenc / .clxor)
//   - Security warning shown for XOR
//   - addLog capped at 20 entries correctly
//   - Decryption panel has its own dedicated dropzone

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  Upload, Lock, Unlock, Key, Copy, RefreshCw,
  Download, Image as ImageIcon, CheckCircle, Loader2,
  Eye, EyeOff, Zap, Shield, AlertTriangle, Info
} from 'lucide-react'
import { encryptImage, decryptImage, generateKey, checkKeyStrength } from '../services/api'

const MAX_SIZE = 50 * 1024 * 1024  // 50 MB — matches backend

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useObjectUrl(file) {
  const urlRef = useRef(null)
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!file) { setUrl(null); return }
    const newUrl = URL.createObjectURL(file)
    urlRef.current = newUrl
    setUrl(newUrl)
    return () => { URL.revokeObjectURL(newUrl) }
  }, [file])

  return url
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({ onFile, file, accept, hint, dropText, id }) {
  const resolvedAccept = accept ?? { 'image/png': [], 'image/jpeg': [], 'image/bmp': [] }

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected?.length) {
      const err = rejected[0]?.errors?.[0]
      if (err?.code === 'file-too-large') {
        toast.error('File too large (max 50 MB)')
      } else {
        toast.error('Invalid file')
      }
      return
    }
    if (accepted[0]) onFile(accepted[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: resolvedAccept,
    maxFiles: 1,
    maxSize: MAX_SIZE,
  })

  return (
    <div
      {...getRootProps()}
      id={id}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all duration-300
        ${isDragActive
          ? 'border-cyber-cyan bg-cyber-cyan/5 shadow-glow-cyan'
          : file
            ? 'border-cyber-green/40 bg-cyber-green/5'
            : 'border-cyber-border hover:border-cyber-cyan/40 hover:bg-cyber-cyan/5'
        }`}
    >
      <input {...getInputProps()} />
      {file ? (
        <div className="space-y-2">
          <CheckCircle size={36} className="text-cyber-green mx-auto" />
          <p className="text-cyber-text font-medium truncate max-w-xs mx-auto">{file.name}</p>
          <p className="text-cyber-muted text-sm">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full border border-cyber-border flex items-center justify-center">
            <Upload size={24} className="text-cyber-muted" />
          </div>
          <p className="text-cyber-text font-medium">
            {isDragActive ? 'Drop the file here...' : (dropText ?? 'Drag & drop an image')}
          </p>
          <p className="text-cyber-muted text-sm">{hint ?? 'PNG, JPG, BMP · Max 50 MB'}</p>
        </div>
      )}
    </div>
  )
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

function PreviewPanel({ src, label, badge, badgeColor = 'cyan', placeholder }) {
  const colorMap = {
    cyan:   'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/10',
    green:  'text-cyber-green border-cyber-green/30 bg-cyber-green/10',
    purple: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
    muted:  'text-cyber-muted border-cyber-border bg-cyber-border/20',
  }
  return (
    <div className="space-y-2 min-w-0 w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-cyber-muted font-medium uppercase tracking-wider truncate">{label}</span>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full border font-mono shrink-0 whitespace-nowrap ${colorMap[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="image-preview-container w-full h-40 flex items-center justify-center">
        {src ? (
          <img src={src} alt={label} className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-center text-cyber-muted p-4">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">{placeholder || 'No image'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Key Strength Bar ──────────────────────────────────────────────────────────

function KeyStrengthBar({ score, label, color }) {
  const barColor  = color === 'green' ? 'bg-cyber-green' : color === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
  const textColor = color === 'green' ? 'text-cyber-green' : color === 'yellow' ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-cyber-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold w-20 text-right ${textColor}`}>{label} ({score}/100)</span>
    </div>
  )
}

// ─── Stats Grid ───────────────────────────────────────────────────────────────

function StatsGrid({ stats }) {
  if (!stats) return null
  const items = [
    { label: 'Encrypt Time', value: `${stats.encryption_time_ms} ms` },
    { label: 'Original Size', value: `${(stats.original_size_bytes / 1024).toFixed(1)} KB` },
    { label: 'Encrypted Size', value: `${(stats.encrypted_size_bytes / 1024).toFixed(1)} KB` },
    stats.pixel_change_pct != null
      ? { label: 'Pixels Changed', value: `${stats.pixel_change_pct}%` }
      : { label: 'Key Size', value: `${stats.key_size_bits} bits` },
  ]
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(({ label, value }) => (
        <div key={label} className="bg-cyber-bg/60 border border-cyber-border rounded-lg p-3">
          <div className="text-xs text-cyber-muted">{label}</div>
          <div className="text-sm font-bold text-cyber-cyan terminal-text mt-0.5">{value}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Process Log ──────────────────────────────────────────────────────────────

function ProcessLog({ logs }) {
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])
  return (
    <div className="glass-card p-5">
      <h2 className="text-sm font-semibold text-cyber-text mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyber-green shadow-[0_0_6px_#10b981]" />
        Process Log
      </h2>
      <div className="bg-cyber-bg rounded-lg border border-cyber-border p-4 h-44 overflow-y-auto font-mono text-xs space-y-1">
        {logs.length === 0 ? (
          <span className="text-cyber-muted">Waiting for operation...</span>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`flex gap-2 ${log.color}`}>
              <span className="text-cyber-muted opacity-60">[{log.time}]</span>
              <span>{log.msg}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── Key Input Section ────────────────────────────────────────────────────────

function KeySection({ keyVal, setKeyVal, showKey, setShowKey, keyStrength, onGenerate, onCopy, showConfirm, confirmKey, setConfirmKey }) {
  const mismatch = showConfirm && confirmKey && keyVal !== confirmKey

  return (
    <div className="glass-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-cyber-text flex items-center gap-2">
        <Key size={14} className="text-cyber-cyan" /> Encryption Key
      </h2>

      <div className="relative">
        <input
          id="key-input"
          type={showKey ? 'text' : 'password'}
          value={keyVal}
          onChange={(e) => setKeyVal(e.target.value)}
          placeholder="Enter key / password..."
          className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2.5
            text-cyber-text text-sm pr-10 font-mono
            focus:outline-none focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/20
            placeholder-cyber-muted/50 transition-all"
        />
        <button
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-cyber-text"
        >
          {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      {showConfirm && (
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={confirmKey}
            onChange={(e) => setConfirmKey(e.target.value)}
            placeholder="Confirm key..."
            className={`w-full bg-cyber-bg border rounded-lg px-3 py-2.5
              text-cyber-text text-sm font-mono
              focus:outline-none focus:ring-1 transition-all placeholder-cyber-muted/50
              ${mismatch
                ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
                : 'border-cyber-border focus:border-cyber-cyan/50 focus:ring-cyber-cyan/20'
              }`}
          />
          {mismatch && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle size={11} /> Keys do not match
            </p>
          )}
        </div>
      )}

      {keyStrength && <KeyStrengthBar score={keyStrength.score} label={keyStrength.label} color={keyStrength.color} />}

      <div className="flex gap-2">
        <button
          id="generate-key-btn"
          onClick={onGenerate}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
            border border-cyber-border text-cyber-muted text-xs font-medium
            hover:border-cyber-cyan/40 hover:text-cyber-cyan transition-all"
        >
          <RefreshCw size={13} /> Auto-Generate
        </button>
        <button
          id="copy-key-btn"
          onClick={onCopy}
          disabled={!keyVal}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
            border border-cyber-border text-cyber-muted text-xs font-medium
            hover:border-cyber-cyan/40 hover:text-cyber-cyan transition-all
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Copy size={13} /> Copy Key
        </button>
      </div>
    </div>
  )
}

// ─── Encrypt Panel ────────────────────────────────────────────────────────────

function EncryptPanel({ addLog }) {
  const [imageFile, setImageFile]     = useState(null)
  const [algorithm, setAlgorithm]     = useState('xor')
  const [key, setKey]                 = useState('')
  const [confirmKey, setConfirmKey]   = useState('')
  const [showKey, setShowKey]         = useState(false)
  const [keyStrength, setKeyStrength] = useState(null)
  const [encryptedPreview, setEncryptedPreview] = useState(null)
  const [encryptedData, setEncryptedData]       = useState(null)
  const [downloadExt, setDownloadExt]           = useState('clenc')
  const [encryptStats, setEncryptStats]         = useState(null)
  const [encrypting, setEncrypting]             = useState(false)

  const originalPreview = useObjectUrl(imageFile)

  const handleFile = (file) => {
    setImageFile(file)
    setEncryptedPreview(null)
    setEncryptedData(null)
    setEncryptStats(null)
    addLog(`Image loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info')
  }

  const evalStrength = async (k) => {
    if (!k || k.length < 2) { setKeyStrength(null); return }
    try {
      const res = await checkKeyStrength(k)
      setKeyStrength(res.data)
    } catch { /* silent */ }
  }

  const handleSetKey = (v) => { setKey(v); evalStrength(v) }

  const handleGenerateKey = async () => {
    try {
      const res = await generateKey(32)
      setKey(res.data.key)
      setConfirmKey(res.data.key)
      addLog('Secure random key generated (256-bit entropy)', 'success')
      toast.success('Key generated!')
      evalStrength(res.data.key)
    } catch { toast.error('Failed to generate key') }
  }

  const handleCopyKey = () => {
    if (!key) return
    navigator.clipboard.writeText(key)
    toast.success('Key copied!')
    addLog('Key copied to clipboard', 'info')
  }

  const handleEncrypt = async () => {
    if (!imageFile) { toast.error('Please upload an image first'); return }
    if (!key)       { toast.error('Please enter an encryption key'); return }
    if (key !== confirmKey) { toast.error('Keys do not match'); return }

    setEncrypting(true)
    setEncryptedPreview(null)
    setEncryptedData(null)
    setEncryptStats(null)
    addLog(`Starting ${algorithm.toUpperCase()} encryption...`, 'info')

    try {
      addLog('Reading image data...', 'info')
      const res = await encryptImage(imageFile, algorithm, key)
      addLog(`✓ Encryption complete — ${res.data.algorithm}`, 'success')
      addLog(`  Time: ${res.data.stats.encryption_time_ms}ms`, 'success')
      setEncryptedPreview(res.data.encrypted_preview)
      setEncryptedData(res.data.encrypted_data)
      setDownloadExt(res.data.download_ext || (algorithm === 'aes' ? 'clenc' : 'clxor'))
      setEncryptStats(res.data.stats)
      toast.success('Image encrypted!')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Encryption failed'
      addLog(`✗ Error: ${msg}`, 'error')
      toast.error(msg)
    } finally {
      setEncrypting(false)
    }
  }

  const downloadFile = (dataUrl, filename) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  }

  return (
    <div className="space-y-5">
      {/* Upload */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-cyber-text mb-3 flex items-center gap-2">
          <Upload size={14} className="text-cyber-cyan" /> Upload Image to Encrypt
        </h2>
        <DropZone onFile={handleFile} file={imageFile} id="encrypt-dropzone" />
      </div>

      {/* Algorithm */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-cyber-text mb-3 flex items-center gap-2">
          <Shield size={14} className="text-cyber-cyan" /> Algorithm
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'xor', label: 'XOR', sub: 'Pixel-level · Educational', icon: Zap },
            { id: 'aes', label: 'AES-256-GCM', sub: 'Auth. Encrypt · Secure', icon: Shield },
          ].map(({ id, label, sub, icon: Icon }) => (
            <button
              key={id}
              id={`algo-${id}`}
              onClick={() => setAlgorithm(id)}
              className={`p-3 rounded-xl border text-left transition-all duration-200
                ${algorithm === id
                  ? 'border-cyber-cyan/40 bg-cyber-cyan/10 text-cyber-cyan'
                  : 'border-cyber-border text-cyber-muted hover:border-cyber-border/80'
                }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Icon size={14} />
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <div className="text-xs opacity-70">{sub}</div>
            </button>
          ))}
        </div>
        {algorithm === 'xor' && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300/80">
              <strong>XOR is for education only.</strong> It is not cryptographically secure and is
              vulnerable to known-plaintext attacks. Use AES-256-GCM for real privacy.
            </p>
          </div>
        )}
        {algorithm === 'aes' && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-cyber-cyan/5 border border-cyber-cyan/20">
            <Info size={13} className="text-cyber-cyan shrink-0 mt-0.5" />
            <p className="text-xs text-cyber-cyan/80">
              <strong>AES-256-GCM</strong> provides authenticated encryption — any tampering or
              wrong key produces an explicit error. EXIF metadata is stripped before encrypting.
            </p>
          </div>
        )}
      </div>

      {/* Key */}
      <KeySection
        keyVal={key} setKeyVal={handleSetKey}
        showKey={showKey} setShowKey={setShowKey}
        keyStrength={keyStrength}
        onGenerate={handleGenerateKey} onCopy={handleCopyKey}
        showConfirm={true}
        confirmKey={confirmKey} setConfirmKey={setConfirmKey}
      />

      {/* Encrypt button */}
      <button
        id="encrypt-btn"
        onClick={handleEncrypt}
        disabled={encrypting || !imageFile || !key || key !== confirmKey}
        className="w-full btn-cyber flex items-center justify-center gap-2 py-3
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {encrypting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
        {encrypting ? 'Encrypting...' : 'Encrypt Image'}
      </button>

      {/* Previews */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-cyber-text mb-4">Preview</h2>
        <div className="grid grid-cols-2 gap-4">
          <PreviewPanel src={originalPreview} label="Original" badge="INPUT" badgeColor="muted" placeholder="Upload an image" />
          <PreviewPanel
            src={encryptedPreview}
            label="Encrypted"
            badge={algorithm === 'aes' ? 'SIMULATED' : 'REAL XOR'}
            badgeColor={algorithm === 'aes' ? 'purple' : 'cyan'}
            placeholder="Encrypt to preview"
          />
        </div>
      </div>

      {/* Stats + Download */}
      {encryptStats && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-cyber-muted uppercase tracking-wider">Encryption Stats</h3>
          <StatsGrid stats={encryptStats} />
          <button
            id="download-encrypted"
            onClick={() => downloadFile(encryptedData, `encrypted.${downloadExt}`)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
              border border-cyber-border text-cyber-muted text-xs
              hover:border-cyber-cyan/30 hover:text-cyber-cyan transition-all"
          >
            <Download size={13} /> Download Encrypted File (.{downloadExt})
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Decrypt Panel ────────────────────────────────────────────────────────────

function DecryptPanel({ addLog }) {
  const [encFile, setEncFile]         = useState(null)
  const [algorithm, setAlgorithm]     = useState('aes')
  const [key, setKey]                 = useState('')
  const [showKey, setShowKey]         = useState(false)
  const [keyStrength, setKeyStrength] = useState(null)
  const [decryptedPreview, setDecryptedPreview] = useState(null)
  const [decryptStats, setDecryptStats]         = useState(null)
  const [decrypting, setDecrypting]             = useState(false)

  const handleFile = (file) => {
    setEncFile(file)
    setDecryptedPreview(null)
    setDecryptStats(null)
    addLog(`Encrypted file loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info')
    // Auto-detect algorithm from extension
    if (file.name.endsWith('.clenc')) { setAlgorithm('aes'); addLog('Detected AES file (.clenc)', 'info') }
    if (file.name.endsWith('.clxor')) { setAlgorithm('xor'); addLog('Detected XOR file (.clxor)', 'info') }
  }

  const evalStrength = async (k) => {
    if (!k || k.length < 2) { setKeyStrength(null); return }
    try { const res = await checkKeyStrength(k); setKeyStrength(res.data) } catch { /* silent */ }
  }
  const handleSetKey = (v) => { setKey(v); evalStrength(v) }

  const handleGenerateKey = async () => {
    try {
      const res = await generateKey(32)
      setKey(res.data.key)
      addLog('Key generated', 'success')
      toast.success('Key generated!')
      evalStrength(res.data.key)
    } catch { toast.error('Failed to generate key') }
  }

  const handleCopyKey = () => {
    if (!key) return
    navigator.clipboard.writeText(key)
    toast.success('Key copied!')
  }

  const handleDecrypt = async () => {
    if (!encFile) { toast.error('Please upload an encrypted file'); return }
    if (!key)     { toast.error('Enter the decryption key'); return }

    setDecrypting(true)
    setDecryptedPreview(null)
    setDecryptStats(null)
    addLog(`Starting decryption of ${encFile.name}...`, 'info')

    try {
      const res = await decryptImage(encFile, algorithm, key)
      setDecryptedPreview(res.data.decrypted_image)
      setDecryptStats(res.data.stats)
      addLog(`✓ Decryption complete — ${res.data.stats.decryption_time_ms}ms`, 'success')
      toast.success('Image decrypted!')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Decryption failed (wrong key?)'
      addLog(`✗ Error: ${msg}`, 'error')
      toast.error(msg)
    } finally {
      setDecrypting(false)
    }
  }

  const downloadFile = (dataUrl, filename) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  }

  return (
    <div className="space-y-5">
      {/* Upload encrypted file */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-cyber-text mb-3 flex items-center gap-2">
          <Upload size={14} className="text-cyber-green" /> Upload Encrypted File
        </h2>
        <DropZone
          onFile={handleFile}
          file={encFile}
          accept={{ 'application/octet-stream': ['.clenc', '.clxor'], 'image/png': [], 'image/jpeg': [] }}
          hint=".clenc (AES), .clxor (XOR), or image · Max 50 MB"
          dropText="Drop your encrypted file here"
          id="decrypt-dropzone"
        />
      </div>

      {/* Algorithm */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-cyber-text mb-3 flex items-center gap-2">
          <Shield size={14} className="text-cyber-green" /> Algorithm
        </h2>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-cyber-green/5 border border-cyber-green/20 mb-3">
          <Info size={13} className="text-cyber-green shrink-0 mt-0.5" />
          <p className="text-xs text-cyber-green/80">
            Algorithm is <strong>auto-detected</strong> from the file's magic bytes.
            The dropdown below is only used as a fallback.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'xor', label: 'XOR', sub: '.clxor files', icon: Zap },
            { id: 'aes', label: 'AES-256-GCM', sub: '.clenc files', icon: Shield },
          ].map(({ id, label, sub, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAlgorithm(id)}
              className={`p-3 rounded-xl border text-left transition-all duration-200
                ${algorithm === id
                  ? 'border-cyber-green/40 bg-cyber-green/10 text-cyber-green'
                  : 'border-cyber-border text-cyber-muted hover:border-cyber-border/80'
                }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Icon size={14} />
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <div className="text-xs opacity-70">{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Key */}
      <KeySection
        keyVal={key} setKeyVal={handleSetKey}
        showKey={showKey} setShowKey={setShowKey}
        keyStrength={keyStrength}
        onGenerate={handleGenerateKey} onCopy={handleCopyKey}
        showConfirm={false}
        confirmKey="" setConfirmKey={() => {}}
      />

      {/* Decrypt button */}
      <button
        id="decrypt-btn"
        onClick={handleDecrypt}
        disabled={decrypting || !encFile || !key}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg
          border border-cyber-green/30 text-cyber-green text-sm font-semibold
          hover:bg-cyber-green/10 transition-all
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {decrypting ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
        {decrypting ? 'Decrypting...' : 'Decrypt File'}
      </button>

      {/* Decrypted preview + download */}
      {decryptedPreview && (
        <>
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-cyber-text mb-4">Decrypted Output</h2>
            <PreviewPanel src={decryptedPreview} label="Decrypted Image" badge="RESTORED" badgeColor="green" />
          </div>
          <div className="glass-card p-4 space-y-3">
            {decryptStats && (
              <div className="bg-cyber-bg/60 border border-cyber-border rounded-lg p-3">
                <div className="text-xs text-cyber-muted">Decryption Time</div>
                <div className="text-sm font-bold text-cyber-green terminal-text">{decryptStats.decryption_time_ms} ms</div>
              </div>
            )}
            <button
              id="download-decrypted"
              onClick={() => downloadFile(decryptedPreview, 'decrypted_image.png')}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
                border border-cyber-green/30 text-cyber-green text-xs
                hover:bg-cyber-green/10 transition-all"
            >
              <Download size={13} /> Download Decrypted Image
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function EncryptionPage() {
  const [activeTab, setActiveTab] = useState('encrypt')
  const [logs, setLogs]           = useState([])

  const addLog = useCallback((msg, type = 'info') => {
    const colors = { info: 'text-cyber-cyan', success: 'text-cyber-green', error: 'text-red-400', warn: 'text-yellow-400' }
    setLogs(prev => [
      ...prev.slice(-20),   // keep last 20, then push new = cap at 21 max during render; slice(-20) before add is correct
      {
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        msg,
        color: colors[type] || 'text-cyber-muted',
      }
    ].slice(-20))  // final cap at 20
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-cyber-blue/20 border border-cyber-blue/30">
          <Lock size={20} className="text-cyber-cyan" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-cyber-text">Encrypt / Decrypt</h1>
          <p className="text-sm text-cyber-muted">Apply XOR or AES-256-GCM encryption to your images</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-cyber-bg border border-cyber-border rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('encrypt')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200
            ${activeTab === 'encrypt'
              ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30'
              : 'text-cyber-muted hover:text-cyber-text'
            }`}
        >
          <Lock size={14} /> Encrypt
        </button>
        <button
          onClick={() => setActiveTab('decrypt')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200
            ${activeTab === 'decrypt'
              ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30'
              : 'text-cyber-muted hover:text-cyber-text'
            }`}
        >
          <Unlock size={14} /> Decrypt
        </button>
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        <div>
          {activeTab === 'encrypt'
            ? <EncryptPanel addLog={addLog} />
            : <DecryptPanel addLog={addLog} />
          }
        </div>
        <div>
          <ProcessLog logs={logs} />
        </div>
      </div>
    </div>
  )
}

export default EncryptionPage
