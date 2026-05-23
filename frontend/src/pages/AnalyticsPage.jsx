// AnalyticsPage.jsx - Benchmark & Analytics Page
// Runs XOR and AES on the same image and displays a comparison.

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  BarChart3, Upload, Play, Zap, Shield, CheckCircle,
  Loader2, Key, RefreshCw, Info, Clock, HardDrive,
  Activity
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { runBenchmark, generateKey } from '../services/api'

// ─── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({ label, xorVal, aesVal, unit = '' }) {
  return (
    <div className="glass-card p-4">
      <div className="text-xs text-cyber-muted mb-3">{label}</div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-cyber-cyan font-mono">XOR</span>
          <span className="text-sm font-bold text-cyber-cyan terminal-text">{xorVal}{unit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-purple-400 font-mono">AES-256</span>
          <span className="text-sm font-bold text-purple-400 terminal-text">{aesVal}{unit}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Key Strength Display ────────────────────────────────────────────────────
function KeyStrengthDisplay({ strength }) {
  if (!strength) return null
  const color = strength.color === 'green'
    ? 'text-cyber-green border-cyber-green/30 bg-cyber-green/10'
    : strength.color === 'yellow'
      ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
      : 'text-red-400 border-red-400/30 bg-red-400/10'

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-cyber-text flex items-center gap-2">
        <Key size={14} className="text-cyber-cyan" /> Key Strength Analysis
      </h3>
      <div className="flex items-center gap-4">
        <div className={`px-4 py-2 rounded-xl border font-bold text-lg ${color}`}>
          {strength.label}
        </div>
        <div>
          <div className="text-3xl font-black text-cyber-text">{strength.score}<span className="text-sm text-cyber-muted">/100</span></div>
          <div className="text-xs text-cyber-muted">Shannon entropy: {strength.entropy} bits/char</div>
        </div>
      </div>
      {/* Score bar */}
      <div className="h-2 bg-cyber-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            strength.color === 'green' ? 'bg-cyber-green' : strength.color === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
          }`}
          style={{ width: `${strength.score}%` }}
        />
      </div>
      {/* Details */}
      <div className="grid grid-cols-2 gap-2">
        {strength.details.map((d) => (
          <div key={d} className="flex items-center gap-2 text-xs text-cyber-muted">
            <CheckCircle size={11} className="text-cyber-green shrink-0" />
            {d}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Custom Tooltip for Recharts ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-cyber-card border border-cyber-border rounded-lg p-3 text-xs shadow-xl">
      <div className="font-bold text-cyber-text mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex gap-2" style={{ color: p.fill || p.color || '#00e5ff' }}>
          <span>{p.name}:</span>
          <span className="font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Algorithm Info Box ──────────────────────────────────────────────────────
function AlgoInfoBox({ data }) {
  if (!data) return null
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'Security Level', value: data.security_level },
        { label: 'Key Size',       value: typeof data.key_size_bits === 'number' ? `${data.key_size_bits} bits` : data.key_size_bits },
        { label: 'Mode',           value: data.mode },
        { label: 'Enc. Time',      value: `${data.encryption_time_ms} ms` },
      ].map(({ label, value }) => (
        <div key={label} className="bg-cyber-bg/60 rounded-lg p-3 border border-cyber-border">
          <div className="text-xs text-cyber-muted">{label}</div>
          <div className="text-sm font-semibold text-cyber-text mt-0.5">{value}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Analytics Page ─────────────────────────────────────────────────────
function AnalyticsPage() {
  const [file, setFile]           = useState(null)
  const [key, setKey]             = useState('SecureTestKey123!@#')
  const [results, setResults]     = useState(null)
  const [running, setRunning]     = useState(false)
  const [logs, setLogs]           = useState([])

  const addLog = (msg, type = 'info') => {
    const colors = { info: 'text-cyber-cyan', success: 'text-cyber-green', error: 'text-red-400' }
    setLogs(prev => [...prev.slice(-29), {
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      msg, color: colors[type] || 'text-cyber-muted'
    }])
  }

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) { setFile(accepted[0]); setResults(null); setLogs([]) }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': [], 'image/jpeg': [], 'image/bmp': [] },
    maxFiles: 1, maxSize: 50 * 1024 * 1024,
  })

  const handleGenKey = async () => {
    try { const res = await generateKey(24); setKey(res.data.key) } catch { /* silent */ }
  }

  const handleBenchmark = async () => {
    if (!file) { toast.error('Upload an image first'); return }
    if (!key)  { toast.error('Enter a benchmark key');  return }

    setRunning(true)
    setResults(null)
    addLog('Benchmark started', 'info')
    addLog(`Image: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info')
    addLog('Running XOR encryption...', 'info')

    try {
      const res = await runBenchmark(file, key)
      const d = res.data
      setResults(d)
      addLog(`✓ XOR encryption: ${d.results.xor.encryption_time_ms} ms`, 'success')
      addLog(`✓ AES-256 encryption: ${d.results.aes.encryption_time_ms} ms`, 'success')
      addLog(`  Image: ${d.image_info.width}×${d.image_info.height} px`, 'info')
      addLog(`  Key strength: ${d.key_strength.label} (${d.key_strength.score}/100)`, 'info')
      addLog('Benchmark complete ✓', 'success')
      toast.success('Benchmark complete!')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Benchmark failed'
      addLog(`✗ ${msg}`, 'error')
      toast.error(msg)
    } finally {
      setRunning(false)
    }
  }

  // Build chart data from results
  const chartData = results ? [
    { name: 'XOR',     'Encryption (ms)': results.results.xor.encryption_time_ms },
    { name: 'AES-256', 'Encryption (ms)': results.results.aes.encryption_time_ms },
  ] : []

  const sizeChartData = results ? [
    { name: 'XOR',     'Size (KB)': +(results.results.xor.encrypted_size_bytes / 1024).toFixed(1) },
    { name: 'AES-256', 'Size (KB)': +(results.results.aes.encrypted_size_bytes / 1024).toFixed(1) },
  ] : []

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30">
          <BarChart3 size={20} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-cyber-text">Benchmark & Analytics</h1>
          <p className="text-sm text-cyber-muted">Compare XOR vs AES-256 encryption performance</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-cyber-text">Benchmark Configuration</h2>
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">

          {/* Drop zone */}
          <div
            {...getRootProps()}
            id="benchmark-dropzone"
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200
              ${isDragActive ? 'border-cyber-cyan bg-cyber-cyan/5' : file ? 'border-cyber-green/40 bg-cyber-green/5' : 'border-cyber-border hover:border-cyber-cyan/40'}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-cyber-green">
                <CheckCircle size={16} /> <span>{file.name}</span>
              </div>
            ) : (
              <div className="text-cyber-muted text-sm">
                <Upload size={20} className="mx-auto mb-1" />
                <span>Drop image here</span>
              </div>
            )}
          </div>

          {/* Key input */}
          <div className="space-y-2">
            <label className="text-xs text-cyber-muted">Benchmark Key</label>
            <div className="flex gap-2">
              <input
                id="benchmark-key"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="flex-1 bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2.5
                  text-cyber-text text-sm font-mono focus:outline-none focus:border-cyber-cyan/50"
              />
              <button onClick={handleGenKey}
                className="px-3 py-2.5 rounded-lg border border-cyber-border text-cyber-muted hover:text-cyber-cyan hover:border-cyber-cyan/30 transition-all">
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Run button */}
          <button
            id="run-benchmark"
            onClick={handleBenchmark}
            disabled={running || !file || !key}
            className="btn-cyber flex items-center gap-2 py-2.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            {running ? 'Running...' : 'Run Benchmark'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6 animate-fade-up">

          {/* Image Info Banner */}
          <div className="flex items-center gap-4 p-4 glass-card border border-cyber-cyan/10">
            <Info size={16} className="text-cyber-cyan shrink-0" />
            <div className="text-sm text-cyber-muted">
              Benchmark image: <span className="text-cyber-text font-medium">{results.image_info.width}×{results.image_info.height} px</span>
              {' · '}
              <span className="text-cyber-text font-medium">{results.image_info.original_size_kb} KB</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Timing Chart */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-cyber-text mb-4 flex items-center gap-2">
                <Clock size={14} className="text-cyber-cyan" /> Encryption Time (ms)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,229,255,0.05)' }} />
                  <Bar dataKey="Encryption (ms)" radius={[6, 6, 0, 0]}>
                    <Cell fill="#00e5ff" />
                    <Cell fill="#8b5cf6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Size Chart */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-cyber-text mb-4 flex items-center gap-2">
                <HardDrive size={14} className="text-cyber-cyan" /> Output File Size (KB)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sizeChartData} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,229,255,0.05)' }} />
                  <Bar dataKey="Size (KB)" radius={[6, 6, 0, 0]}>
                    <Cell fill="#00e5ff" />
                    <Cell fill="#8b5cf6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Encryption Time"
              xorVal={results.results.xor.encryption_time_ms}
              aesVal={results.results.aes.encryption_time_ms}
              unit=" ms"
            />
            <MetricCard
              label="Output Size (KB)"
              xorVal={(results.results.xor.encrypted_size_bytes / 1024).toFixed(1)}
              aesVal={(results.results.aes.encrypted_size_bytes / 1024).toFixed(1)}
            />
            <MetricCard
              label="Security Level"
              xorVal={results.results.xor.security_level}
              aesVal={results.results.aes.security_level}
            />
            <MetricCard
              label="Pixel Change %"
              xorVal={`${results.results.xor.pixel_change_pct}%`}
              aesVal="N/A (binary)"
            />
          </div>

          {/* Algorithm Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-5 border border-cyber-cyan/10">
              <h3 className="text-sm font-semibold text-cyber-cyan mb-3 flex items-center gap-2">
                <Zap size={14} /> XOR Details
              </h3>
              <AlgoInfoBox data={results.results.xor} />
            </div>
            <div className="glass-card p-5 border border-purple-500/10">
              <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                <Shield size={14} /> AES-256 Details
              </h3>
              <AlgoInfoBox data={results.results.aes} />
              {results.results.aes.iv && (
                <div className="mt-3 p-2 bg-cyber-bg rounded-lg border border-cyber-border">
                  <div className="text-xs text-cyber-muted">Random IV (hex)</div>
                  <div className="text-xs font-mono text-purple-400 break-all mt-0.5">{results.results.aes.iv}</div>
                </div>
              )}
            </div>
          </div>

          {/* Key Strength */}
          <KeyStrengthDisplay strength={results.key_strength} />

          {/* Process Log */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-cyber-text mb-3 flex items-center gap-2">
              <Activity size={14} className="text-cyber-cyan" /> Process Log
            </h3>
            <div className="bg-cyber-bg rounded-lg border border-cyber-border p-4 h-40 overflow-y-auto font-mono text-xs space-y-1">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${log.color}`}>
                  <span className="text-cyber-muted opacity-60">[{log.time}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!results && !running && (
        <div className="glass-card p-12 text-center">
          <BarChart3 size={48} className="text-cyber-muted mx-auto mb-4 opacity-30" />
          <p className="text-cyber-muted text-sm">Upload an image and run the benchmark to see results</p>
        </div>
      )}
    </div>
  )
}

export default AnalyticsPage
