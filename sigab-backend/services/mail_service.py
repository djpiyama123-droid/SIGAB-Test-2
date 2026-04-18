import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import os

# Configuración (En un entorno real usar variables de entorno)
# Para pruebas locales simularemos el envío si no hay credenciales
SMTP_SERVER = os.getenv("SIGAB_SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SIGAB_SMTP_PORT", "587"))
SMTP_USER = os.getenv("SIGAB_SMTP_USER", "") # Requerido para Gmail real
SMTP_PASS = os.getenv("SIGAB_SMTP_PASS", "") # Requerido para Gmail real

def enviar_reporte_email(destinatario: str, asunto: str, cuerpo: str, archivo_nombre: str, archivo_bytes: bytes):
    """Envía un reporte PDF por correo electrónico."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"⚠️ [MOCK MAIL] Enviando correo a {destinatario}")
        print(f"   Asunto: {asunto}")
        print(f"   Archivo: {archivo_nombre} ({len(archivo_bytes)} bytes)")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = destinatario
        msg['Subject'] = asunto

        msg.attach(MIMEText(cuerpo, 'plain'))

        part = MIMEApplication(archivo_bytes, Name=archivo_nombre)
        part['Content-Disposition'] = f'attachment; filename="{archivo_nombre}"'
        msg.attach(part)

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Error enviando mail: {e}")
        return False
