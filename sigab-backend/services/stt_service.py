import os
import base64
import tempfile
import logging

try:
    from faster_whisper import WhisperModel
    _WHISPER_AVAILABLE = True
except ImportError:
    WhisperModel = None  # type: ignore
    _WHISPER_AVAILABLE = False
    logging.warning("faster_whisper no instalado — STT deshabilitado.")

logger = logging.getLogger(__name__)

class STTService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(STTService, cls).__new__(cls)
        return cls._instance

    def initialize_model(self, model_size="small", device="cpu", compute_type="int8"):
        """
        Inicializa el modelo de Whisper de forma perezosa.
        Usa int8 para optimizar memoria en el Lenovo ThinkCentre.
        """
        if self._model is None:
            try:
                logger.info(f"Cargando modelo Whisper '{model_size}' en {device}...")
                self._model = WhisperModel(model_size, device=device, compute_type=compute_type)
                logger.info("Modelo Whisper cargado exitosamente.")
            except Exception as e:
                logger.error(f"Error cargando Whisper: {e}")
                self._model = None
        return self._model

    async def transcribe(self, audio_path: str) -> str:
        """Transcribe desde un archivo físico."""
        model = self.initialize_model()
        if not model:
            return "Error: Modelo no inicializado"
        
        try:
            segments, info = model.transcribe(audio_path, beam_size=5, language="es")
            text = " ".join([segment.text for segment in segments])
            return text.strip()
        except Exception as e:
            logger.error(f"Error en transcripción: {e}")
            return f"Error: {str(e)}"

    async def transcribe_base64(self, audio_base64: str) -> str:
        """Transcribe desde un string base64 (WhatsApp)."""
        if not audio_base64:
            return ""
            
        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
            tmp.write(base64.b64decode(audio_base64))
            tmp_path = tmp.name

        try:
            return await self.transcribe(tmp_path)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

stt_service = STTService()
