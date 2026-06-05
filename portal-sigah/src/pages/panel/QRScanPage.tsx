import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconQrcode, IconArrowLeft, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'
import jsQR from 'jsqr'

type ScanState = 'idle' | 'scanning' | 'found' | 'error'

export default function QRScanPage() {
  const navigate = useNavigate()
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const [state, setState]   = useState<ScanState>('idle')
  const [result, setResult] = useState('')
  const [errMsg, setErrMsg] = useState('')

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const tick = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    const ctx = canvas.getContext('2d')!
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
    if (code) {
      stopCamera()
      setResult(code.data)
      setState('found')
    } else {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    setState('scanning')
    setResult('')
    setErrMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setState('error')
      setErrMsg('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
    }
  }, [tick])

  useEffect(() => { return () => stopCamera() }, [stopCamera])

  const handleResult = () => {
    // Si el QR es una URL, abre en nueva pestaña. Si es un ID de equipo, navega al inventario.
    if (result.startsWith('http')) {
      window.open(result, '_blank')
    } else {
      navigate(`/panel/sigab?q=${encodeURIComponent(result)}`)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { stopCamera(); navigate(-1) }}
          className="p-2 rounded-lg card-border text-slate-500 hover:text-sigah-blue hover:border-sigah-blue transition-colors"
        >
          <IconArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Escanear QR</h1>
          <p className="font-data font-normal text-sm text-slate-500">Apunta la cámara al código QR del equipo</p>
        </div>
      </div>

      {/* Idle */}
      {state === 'idle' && (
        <div className="bg-white rounded-2xl card-border p-10 flex flex-col items-center gap-5 text-center">
          <div className="w-20 h-20 rounded-2xl bg-bg-alt flex items-center justify-center">
            <IconQrcode size={40} className="text-sigah-blue" />
          </div>
          <div>
            <p className="font-sans font-medium text-base text-slate-800 mb-1">Scanner de equipos biomédicos</p>
            <p className="font-data font-normal text-sm text-slate-500 leading-relaxed">
              Escanea el código QR pegado en el equipo para acceder inmediatamente a su ficha, historial y órdenes.
            </p>
          </div>
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sigah-blue text-white font-sans font-medium text-sm hover:bg-sigah-blue-dark transition-colors"
          >
            <IconQrcode size={18} />
            Activar cámara
          </button>
        </div>
      )}

      {/* Scanning */}
      {state === 'scanning' && (
        <div className="bg-black rounded-2xl overflow-hidden relative">
          <video ref={videoRef} className="w-full" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          {/* Overlay visor */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sigah-blue rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sigah-blue rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sigah-blue rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sigah-blue rounded-br-lg" />
              {/* Scanning line animation */}
              <div className="absolute inset-x-0 h-0.5 bg-sigah-blue/70 animate-bounce top-1/2" />
            </div>
          </div>
          <div className="absolute bottom-4 inset-x-0 text-center">
            <p className="text-white/70 text-xs font-data">Buscando código QR…</p>
          </div>
          <button
            onClick={() => { stopCamera(); setState('idle') }}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-data hover:bg-white/30 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Found */}
      {state === 'found' && (
        <div className="bg-white rounded-2xl card-border p-8 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <IconCircleCheck size={36} className="text-esmeralda" />
          </div>
          <div>
            <p className="font-sans font-medium text-base text-slate-800 mb-2">¡Código detectado!</p>
            <p className="font-mono text-xs text-slate-500 bg-bg-principal rounded-lg px-3 py-2 break-all">
              {result}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={handleResult}
              className="w-full py-3 rounded-xl bg-sigah-blue text-white font-sans font-medium text-sm hover:bg-sigah-blue-dark transition-colors"
            >
              Abrir ficha del equipo
            </button>
            <button
              onClick={startCamera}
              className="w-full py-3 rounded-xl border border-border text-slate-500 font-sans font-medium text-sm hover:border-sigah-blue hover:text-sigah-blue transition-colors"
            >
              Escanear otro código
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-8 flex flex-col items-center gap-4 text-center">
          <IconAlertTriangle size={36} className="text-rojo" />
          <div>
            <p className="font-sans font-medium text-base text-slate-800 mb-1">Sin acceso a la cámara</p>
            <p className="font-data font-normal text-sm text-slate-500">{errMsg}</p>
          </div>
          <button
            onClick={startCamera}
            className="px-5 py-2.5 rounded-xl bg-sigah-blue text-white font-sans font-medium text-sm hover:bg-sigah-blue-dark transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tips */}
      {state !== 'scanning' && (
        <div className="bg-bg-alt rounded-xl p-4 border border-border">
          <p className="font-data font-normal text-xs text-slate-500 uppercase tracking-wider mb-2">Consejos</p>
          <ul className="space-y-1">
            {[
              'Asegura buena iluminación sobre el código QR',
              'Mantén el dispositivo estable a 15–25 cm del código',
              'El QR debe estar pegado directamente sobre el equipo o cable',
            ].map(t => (
              <li key={t} className="flex items-start gap-2 text-xs text-slate-500 font-data">
                <span className="text-sigah-blue mt-0.5">·</span>{t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
