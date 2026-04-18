import { handleCommand } from './commands.js';
import fs from 'fs';

async function test_pdf() {
    console.log("📄 SIMULACIÓN DE GENERACIÓN DE PDF VIA BOT\n");

    const serie = "SK416381232HA"; // Monitor de pruebas
    console.log(`📩 [Gustavo]: /pdf ${serie}`);

    try {
        const response = await handleCommand(`/pdf ${serie}`, "Gustavo");
        if (response && response.type === 'document') {
            const path = `C:/Users/djpiy/Desktop/Bioingeneria/SIGAB/sigab-bot/test_report_${serie}.pdf`;
            fs.writeFileSync(path, response.document);
            console.log(`✅ BOT generó documento: ${response.fileName}`);
            console.log(`📁 Guardado en: ${path}`);
        } else {
            console.log(`❌ BOT no devolvió un documento: ${JSON.stringify(response)}`);
        }
    } catch (e) {
        console.log(`❌ ERROR: ${e.message}`);
    }
}

test_pdf();
