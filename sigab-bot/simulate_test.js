import { handleCommand } from './commands.js';

async function test() {
    console.log("🏥 SIMULACIÓN DE RESPUESTA SIGAB BOT (LOCAL)\n");

    const commands = [
        { text: "/ayuda", sender: "Gustavo" },
        { text: "/equipo SK416381232HA", sender: "Bioing" },
        { text: "/alertas", sender: "Jefe_Biomedica" },
        { text: "/proveedor SK416381232HA", sender: "Gustavo" }
    ];

    for (const cmd of commands) {
        console.log(`\n📩 [${cmd.sender}]: ${cmd.text}`);
        try {
            const response = await handleCommand(cmd.text, cmd.sender);
            if (typeof response === 'string') {
                console.log(`📤 BOT:\n${response}`);
            } else {
                console.log(`📤 BOT: [Documento ${response.fileName}] - ${response.caption}`);
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }
}

test();
