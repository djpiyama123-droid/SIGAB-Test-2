# Guía Legal de Registro de Marca y Dominio (SIGAH / SIGAB)
**Para: Gustavo**
**Región: México**

Esta guía paso a paso describe el proceso legal, costos, clasificaciones y mejores prácticas para proteger la propiedad intelectual de **SIGAH/SIGAB** en México y asegurar los activos digitales indispensables para el despliegue del software SaaS.

---

## 1. Registro de Marca ante el IMPI (Instituto Mexicano de la Propiedad Industrial)

El registro de marca le otorga a Gustavo el derecho exclusivo de uso de "SIGAH" y "SIGAB" en todo el territorio nacional por un período de **10 años** (renovable).

### Paso 1: Búsqueda de Anterioridades en MARCANET
Antes de ingresar la solicitud oficial, es vital validar que no existan marcas idénticas o fonéticamente similares ya registradas o en proceso de registro:
1. Accede al portal oficial de [MARCANET](https://marcanet.impi.gob.mx/).
2. Realiza búsquedas por la palabra **"SIGAH"** y **"SIGAB"**.
3. Realiza búsquedas tanto por coincidencia exacta como fonética.

### Paso 2: Determinación de la Clasificación de Niza
Las marcas se registran en categorías específicas de productos o servicios (Clases de Niza). Para nuestro modelo de negocio SaaS de gestión hospitalaria y biomédica, debemos registrar en:
*   **Clase 42 (Software como Servicio - SaaS):** *"Servicios científicos y tecnológicos, servicios de análisis e investigación industriales; diseño y desarrollo de hardware y software; servicios de software como servicio (SaaS) para la administración y control de equipos médicos e inventarios hospitalarios."* (Es la principal para proteger el código y la plataforma web).
*   **Clase 35 (Administración de Negocios y Consultoría):** *"Administración comercial de hospitales, consultoría en organización de negocios, gestión de mantenimiento de inventarios y logística biomédica."* (Recomendable para proteger la marca comercial en su faceta de consultoría y gestión operativa).

### Paso 3: Proceso de Solicitud en Línea
1. Accede al **Portal de Servicios Electrónicos del IMPI** mediante tu **Cuenta Llave CDMX** o firma electrónica (e.firma del SAT).
2. Selecciona **"Solicitud de Registro de Marca, Aviso Comercial o Publicación de Nombre Comercial"**.
3. Completa el formulario digital:
   * **Datos del Titular:** Nombre completo de Gustavo o la Razón Social de la empresa si ya está constituida.
   * **Tipo de Marca:** Nominativa (solo letras), Innominada (solo logotipo) o Mixta (nombre + logotipo). Se recomienda iniciar con la **Mixta** para proteger ambos elementos bajo un único trámite.
   * **Descripción de Productos o Servicios:** Usar las descripciones normalizadas de las clases 42 y 35.
4. **Costo del Trámite:** El costo oficial por el estudio de solicitud hasta su conclusión es de **$2,813.77 MXN** (IVA incluido, con el 10% de descuento por trámite electrónico).
5. Realiza el pago en línea vía transferencia bancaria o tarjeta.
6. Firma la solicitud usando tu e.firma del SAT.

### Paso 4: Seguimiento
* El IMPI tarda de **3 a 6 meses** en emitir una resolución.
* Revisa periódicamente el buzón digital para contestar a posibles "requisitos de fondo" o "de forma" (tienes un plazo legal de 2 meses para contestar si hubiese oposiciones).

---

## 2. Registro de Dominio (`sigah.mx` y `sigab.mx`)

El dominio `.mx` es la identidad digital en México y genera una mayor confianza institucional con directivos del IMSS y hospitales privados.

### Paso 1: Elección del Registrar Autorizado
El registro se realiza directamente en **NIC México** o sus subsidiarias/distribuidores autorizados:
1. **NIC México / Akky:** El registrar oficial de la terminación de país en México ([akky.mx](https://www.akky.mx/)).
2. **Proveedores Alternativos:** Hostinger, GoDaddy o Namecheap (quienes suelen ofrecer la compra directa e integración).

### Paso 2: Compra de Dominio
1. Busca la disponibilidad de **`sigah.mx`**, **`sigah.com.mx`**, **`sigab.mx`** y **`sigab.com.mx`**.
2. **Recomendación Estratégica:** Compra tanto el `.mx` como el `.com.mx` para evitar que la competencia adquiera la variante y confunda a tus clientes.
3. Costo promedio anual: **$300 a $600 MXN** por dominio.

### Paso 3: Configuración de DNS con Cloudflare (Recomendado)
Para proteger la VPS de Bluehost de ataques DDoS, mejorar los tiempos de carga de la Landing Page y administrar fácilmente los registros SSL:
1. Crea una cuenta gratuita en [Cloudflare](https://www.cloudflare.com/).
2. Añade tu nuevo dominio `sigah.mx`.
3. Cloudflare te proporcionará dos **Nameservers (NS)** (ej. `ashley.ns.cloudflare.com` y `conrad.ns.cloudflare.com`).
4. Ve al panel de control de Akky/Registrar y cambia los DNS del dominio por los que te dio Cloudflare.
5. A partir de este momento, administra tus registros A, CNAME, MX e TXT directamente en Cloudflare de manera instantánea y segura.

---

## Resumen de Costos Iniciales de Lanzamiento de Marca

| Concepto | Entidad | Costo Estimado | Periodicidad |
| :--- | :--- | :--- | :--- |
| Registro de Marca Clase 42 | IMPI | $2,813.77 MXN | Único (10 años de validez) |
| Registro de Marca Clase 35 (Opcional) | IMPI | $2,813.77 MXN | Único (10 años de validez) |
| Dominio `sigah.mx` | Akky / Registrar | $450.00 MXN | Anual |
| Dominio `sigab.mx` | Akky / Registrar | $450.00 MXN | Anual |
| DNS y Seguridad WAF | Cloudflare | Gratis | Plan Básico |
| **Total Mínimo Requerido** | | **$3,713.77 MXN** | |
