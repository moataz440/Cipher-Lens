// Dashboard.jsx - Home / Overview Page
// Shows: hero section, algorithm comparison cards, quick stats,
// and navigation call-to-action buttons.

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Lock, Zap, BarChart3,
  ArrowRight, Key, Image as ImageIcon,
  CheckCircle, AlertTriangle, Info
} from 'lucide-react'
import { getAlgorithmInfo } from '../services/api'

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = 'cyan', delay = 0 }) {
  const colorMap = {
    cyan:   'text-cyber-cyan border-cyber-cyan/20 shadow-glow-cyan',
    blue:   'text-blue-400  border-blue-400/20  shadow-glow-blue',
    purple: 'text-purple-400 border-purple-400/20',
    green:  'text-cyber-green border-cyber-green/20',
  }

  return (
    <div
      className={`glass-card p-5 animate-fade-up delay-${delay}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg border bg-cyber-surface/50 ${colorMap[color]}`}>
          <Icon size={18} className={colorMap[color].split(' ')[0]} />
        </div>
        <span className="text-cyber-muted text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-cyber-text">{value}</div>
    </div>
  )
}

// ─── Algorithm Comparison Card ─────────────────────────────────────────────
function AlgoCard({ algo, delay = 0 }) {
  if (!algo) return null

  const isAES = algo.short === 'AES'
  const accentColor = isAES ? 'cyber-purple' : 'cyber-cyan'
  const borderColor = isAES ? 'border-purple-500/20' : 'border-cyan-400/20'
  const badgeColor = isAES
    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
    : 'bg-cyan-400/10 text-cyber-cyan border-cyan-400/30'

  return (
    <div
      className={`glass-card p-6 border ${borderColor} animate-fade-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono mb-2 ${badgeColor}`}>
            {algo.short}
          </div>
          <h3 className="text-lg font-bold text-cyber-text">{algo.name}</h3>
        </div>
        <div className={`text-xs px-2 py-1 rounded ${
          algo.security === 'Very High'
            ? 'bg-green-500/10 text-cyber-green'
            : 'bg-yellow-500/10 text-yellow-400'
        }`}>
          {algo.security} security
        </div>
      </div>

      {/* Description */}
      <p className="text-cyber-muted text-sm leading-relaxed mb-4">{algo.description}</p>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Speed', value: algo.speed },
          { label: 'Key Size', value: algo.key_size },
          { label: 'Mode', value: algo.mode },
          { label: 'Use Case', value: algo.use_case },
        ].map(({ label, value }) => (
          <div key={label} className="bg-cyber-bg/50 rounded-lg p-2">
            <div className="text-xs text-cyber-muted">{label}</div>
            <div className="text-sm font-medium text-cyber-text mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* Pros */}
      <div className="space-y-1">
        {algo.pros.slice(0, 3).map((pro) => (
          <div key={pro} className="flex items-center gap-2 text-xs text-cyber-muted">
            <CheckCircle size={12} className="text-cyber-green shrink-0" />
            <span>{pro}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate()
  const [algorithms, setAlgorithms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAlgorithmInfo()
      .then((res) => setAlgorithms(res.data.algorithms || []))
      .catch(() => {
        // Fallback data if backend is offline
        setAlgorithms([
          {
            name: 'XOR Encryption', short: 'XOR', speed: 'Very Fast',
            key_size: 'Variable', security: 'Low', mode: 'Stream cipher (symmetric)',
            use_case: 'Education & visualization',
            description: 'XOR encryption applies bitwise XOR to each pixel byte using a repeating key. Simple, fast, and visually demonstrable.',
            pros: ['Extremely fast', 'Simple to implement', 'Output viewable as image'],
          },
          {
            name: 'AES-256 Encryption', short: 'AES', speed: 'Fast',
            key_size: '256 bits', security: 'Very High', mode: 'Block cipher (CBC)',
            use_case: 'Real-world secure encryption',
            description: 'AES-256-CBC is the industry-standard encryption algorithm with 2^256 possible keys. Used in TLS, banking, and military applications.',
            pros: ['Industry-standard (FIPS 197)', '256-bit key strength', 'Used in TLS, banking, military'],
          },
        ])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8">

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden glass-card p-8 border border-cyber-cyan/10">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyber-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyber-blue/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
              bg-cyber-cyan/10 border border-cyber-cyan/20 mb-4">
              <span className="status-dot" />
              <span className="text-xs font-medium text-cyber-cyan terminal-text">
                SYSTEM ONLINE · AES-256 + XOR Engine Active
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-cyber-text mb-2 leading-tight">
              Image{' '}
              <span className="text-glow text-cyber-cyan">Encryption</span>{' '}
              System
            </h1>
            <p className="text-cyber-muted text-base max-w-xl leading-relaxed">
              A real cryptographic image encryption system implementing XOR pixel-level
              encryption and AES-256-CBC block cipher. Built for demonstration and
              academic study of applied cryptography.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 shrink-0">
            <button
              id="goto-encrypt"
              onClick={() => navigate('/encrypt')}
              className="btn-cyber flex items-center gap-2 whitespace-nowrap"
            >
              <Lock size={16} />
              Start Encrypting
              <ArrowRight size={16} />
            </button>
            <button
              id="goto-analytics"
              onClick={() => navigate('/analytics')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg
                border border-cyber-border text-cyber-muted
                hover:text-cyber-text hover:border-cyber-purple/40
                transition-all duration-200 text-sm font-medium whitespace-nowrap"
            >
              <BarChart3 size={16} />
              View Analytics
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Shield}     label="Algorithms"         value="2 Supported"   color="cyan"   delay={0}   />
        <StatCard icon={Key}        label="Max Key Size"       value="256-bit AES"   color="blue"   delay={100} />
        <StatCard icon={ImageIcon}  label="Formats"           value="PNG · JPG · BMP" color="purple" delay={200} />
        <StatCard icon={Zap}        label="XOR Speed"         value="< 50ms"        color="green"  delay={300} />
      </section>

      {/* ── Algorithm Cards ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <Info size={16} className="text-cyber-muted" />
          <h2 className="text-lg font-semibold text-cyber-text">
            Supported Encryption Algorithms
          </h2>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse h-72">
                <div className="h-4 bg-cyber-border rounded w-1/3 mb-3" />
                <div className="h-6 bg-cyber-border rounded w-2/3 mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-cyber-border rounded" />
                  <div className="h-3 bg-cyber-border rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {algorithms.map((algo, i) => (
              <AlgoCard key={algo.short} algo={algo} delay={i * 100} />
            ))}
          </div>
        )}
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="glass-card p-6">
        <h2 className="text-lg font-semibold text-cyber-text mb-5 flex items-center gap-2">
          <Zap size={18} className="text-cyber-cyan" />
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              step: '01',
              title: 'Upload Image',
              description: 'Drag & drop or select a PNG, JPG, or BMP image file to encrypt.',
              icon: ImageIcon,
              color: 'text-blue-400',
            },
            {
              step: '02',
              title: 'Choose Algorithm',
              description: 'Select XOR for fast visual encryption or AES-256 for real cryptographic security.',
              icon: Shield,
              color: 'text-cyber-cyan',
            },
            {
              step: '03',
              title: 'Encrypt & Download',
              description: 'See side-by-side previews, download the encrypted file, then decrypt it back.',
              icon: Lock,
              color: 'text-purple-400',
            },
          ].map(({ step, title, description, icon: Icon, color }) => (
            <div key={step} className="flex gap-4 p-4 rounded-xl bg-cyber-bg/50 border border-cyber-border">
              <div className="shrink-0">
                <div className={`text-3xl font-black opacity-20 ${color} font-mono`}>{step}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon size={15} className={color} />
                  <h3 className="text-sm font-semibold text-cyber-text">{title}</h3>
                </div>
                <p className="text-xs text-cyber-muted leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Warning Note ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
        <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300/70 leading-relaxed">
          <span className="font-semibold text-yellow-300">Academic Demo Note:</span>{' '}
          XOR encryption is included for educational visualization only.
          For real data protection, always use AES-256 or stronger algorithms with proper key management.
        </p>
      </div>

    </div>
  )
}

export default Dashboard
