/**
 * Levanta el backend (npm run server) y el frontend (npm run dev) a la vez,
 * sin depender de paquetes externos.
 *
 * Uso:  npm run start
 *
 * Ctrl+C detiene ambos procesos.
 */
import { spawn } from "node:child_process";

const esWindows = process.platform === "win32";
const npmCmd = esWindows ? "npm.cmd" : "npm";

const procesos = [
  { nombre: "server", color: "\x1b[36m", args: ["run", "server"] }, // cian
  { nombre: "web", color: "\x1b[32m", args: ["run", "dev"] }, // verde
];

const reset = "\x1b[0m";
const hijos = [];

function lanzar({ nombre, color, args }) {
  const hijo = spawn(npmCmd, args, {
    cwd: process.cwd(),
    shell: esWindows, // necesario para resolver npm.cmd en Windows
    stdio: ["inherit", "pipe", "pipe"],
  });

  const prefijo = `${color}[${nombre}]${reset} `;

  const escribir = (stream) => (data) => {
    const lineas = data.toString().split(/\r?\n/);
    for (const linea of lineas) {
      if (linea.length > 0) stream.write(prefijo + linea + "\n");
    }
  };

  hijo.stdout.on("data", escribir(process.stdout));
  hijo.stderr.on("data", escribir(process.stderr));

  hijo.on("exit", (code) => {
    console.log(`${prefijo}proceso finalizado (código ${code})`);
    // Si uno muere, cerramos el otro para no dejar procesos colgados
    detenerTodos();
  });

  hijos.push(hijo);
}

function detenerTodos() {
  for (const hijo of hijos) {
    if (!hijo.killed) {
      try {
        hijo.kill();
      } catch {}
    }
  }
}

process.on("SIGINT", () => {
  detenerTodos();
  process.exit(0);
});
process.on("SIGTERM", () => {
  detenerTodos();
  process.exit(0);
});

procesos.forEach(lanzar);
