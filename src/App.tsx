import { useMemo, useState } from "react";
import { obfuscate, estimateStrength, type ObfuscationOptions } from "./obfuscator";

const DEFAULT_CODE = `-- Example Roblox Luau script
local Players = game:GetService("Players")
local player = Players.LocalPlayer

print("Hello from " .. player.Name)

-- Infinite jump example
local UIS = game:GetService("UserInputService")
UIS.InputBegan:Connect(function(input, processed)
    if processed then return end
    if input.KeyCode == Enum.KeyCode.Space then
        local char = player.Character
        if char and char:FindFirstChildOfClass("Humanoid") then
            char.Humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
        end
    end
end)`;

type ToggleKey = keyof ObfuscationOptions;

const METHODS: {
  key: ToggleKey;
  name: string;
  desc: string;
  icon: string;
  color: string;
}[] = [
  {
    key: "base64",
    name: "Base64",
    desc: "Кодирует payload в Base64 строку",
    icon: "B64",
    color: "from-cyan-500 to-blue-600",
  },
  {
    key: "xor",
    name: "XOR Cipher",
    desc: "Многобайтовый XOR с случайным ключом",
    icon: "⊕",
    color: "from-fuchsia-500 to-purple-600",
  },
  {
    key: "vm",
    name: "Virtual Machine",
    desc: "Виртуальная машина с собственными опкодами",
    icon: "VM",
    color: "from-emerald-500 to-teal-600",
  },
  {
    key: "antiDecompiler",
    name: "Anti-Decompiler",
    desc: "Мусорный код, фейковый control-flow",
    icon: "AD",
    color: "from-orange-500 to-red-600",
  },
];

export default function App() {
  const [source, setSource] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState<ObfuscationOptions>({
    base64: true,
    xor: true,
    vm: false,
    antiDecompiler: true,
  });

  const strength = useMemo(() => estimateStrength(opts), [opts]);

  const toggle = (k: ToggleKey) =>
    setOpts((o) => ({ ...o, [k]: !o[k] }));

  const handleObfuscate = () => {
    setBusy(true);
    setCopied(false);
    // small delay so the "processing" feel works
    setTimeout(() => {
      try {
        const result = obfuscate(source, opts);
        setOutput(result);
      } catch (e) {
        setOutput(`-- ERROR: ${(e as Error).message}`);
      }
      setBusy(false);
    }, 350);
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "obfuscated.lua";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setSource("");
    setOutput("");
  };

  const lineCount = output ? 1 : 0;
  const inSize = new Blob([source]).size;
  const outSize = new Blob([output]).size;
  const ratio = inSize > 0 && outSize > 0 ? (outSize / inSize).toFixed(2) : "—";

  return (
    <div className="min-h-screen bg-[#06070d] text-zinc-200 font-mono">
      {/* Background grid + glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,255,200,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-emerald-500/20 pb-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-lg bg-emerald-500/40 blur-md" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-400/50 bg-black/60 text-2xl">
                🔐
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-wider text-white sm:text-3xl">
                LUA<span className="text-emerald-400">CRYPT</span>
                <span className="ml-2 text-xs font-normal text-emerald-300/60">
                  v2.6.1
                </span>
              </h1>
              <p className="text-xs text-zinc-400 sm:text-sm">
                Многоуровневый обфускатор для Roblox Luau скриптов
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-emerald-300">ONLINE</span>
            </span>
            <span className="hidden rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-zinc-400 sm:inline">
              ROBLOX · LUAU READY
            </span>
          </div>
        </header>

        {/* Methods grid */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.2em] text-emerald-400/80">
              ▸ Методы шифрования
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-zinc-400">Уровень защиты:</span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-fuchsia-500 transition-all duration-500"
                  style={{ width: `${strength}%` }}
                />
              </div>
              <span className="w-8 text-right font-bold text-emerald-300">
                {strength}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {METHODS.map((m) => {
              const active = opts[m.key];
              return (
                <button
                  key={m.key}
                  onClick={() => toggle(m.key)}
                  className={`group relative overflow-hidden rounded-lg border p-4 text-left transition-all ${
                    active
                      ? "border-emerald-400/60 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,.15)]"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-600"
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-10 ${m.color}`}
                  />
                  <div className="relative flex items-start justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br ${m.color} text-sm font-bold text-white shadow-lg`}
                    >
                      {m.icon}
                    </div>
                    <div
                      className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${
                        active ? "justify-end bg-emerald-500" : "justify-start bg-zinc-700"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full bg-white" />
                    </div>
                  </div>
                  <div className="relative mt-3">
                    <div className="text-sm font-semibold text-white">
                      {m.name}
                    </div>
                    <div className="mt-1 text-[11px] leading-tight text-zinc-400">
                      {m.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Editor grid */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Input */}
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/70 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs text-zinc-400">
                  input.lua · {source.split("\n").length} lines · {inSize} B
                </span>
              </div>
              <button
                onClick={handleClear}
                className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400 hover:border-red-500/60 hover:text-red-300"
              >
                CLEAR
              </button>
            </div>
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              placeholder="-- Вставьте сюда ваш Luau скрипт для Roblox..."
              className="h-[420px] w-full resize-none bg-transparent p-4 font-mono text-sm text-emerald-100 outline-none placeholder:text-zinc-600"
            />
          </div>

          {/* Output */}
          <div className="overflow-hidden rounded-lg border border-emerald-500/30 bg-zinc-950/70 shadow-[0_0_30px_rgba(16,185,129,.08)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-300">
                  obfuscated.lua · {lineCount} line · {outSize} B · ratio ×{ratio}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={handleCopy}
                  disabled={!output}
                  className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 transition hover:border-emerald-400/60 hover:text-emerald-300 disabled:opacity-40"
                >
                  {copied ? "✓ COPIED" : "COPY"}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!output}
                  className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 transition hover:border-cyan-400/60 hover:text-cyan-300 disabled:opacity-40"
                >
                  ⬇ .LUA
                </button>
              </div>
            </div>
            <div className="relative h-[420px] overflow-auto p-4">
              {busy ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-emerald-400">
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
                  </div>
                  <div className="text-xs uppercase tracking-widest">
                    Обфускация в процессе...
                  </div>
                </div>
              ) : output ? (
                <pre className="whitespace-pre-wrap break-all text-[11px] leading-relaxed text-emerald-200/90">
                  {output}
                </pre>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-600">
                  <div className="text-5xl opacity-30">⌬</div>
                  <div className="text-xs uppercase tracking-widest">
                    Output appears here
                  </div>
                  <div className="text-[10px] text-zinc-700">
                    Нажмите «OBFUSCATE» чтобы запустить
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Action bar */}
        <section className="mt-5 flex flex-col items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 backdrop-blur sm:flex-row">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-400">
              TIP
            </span>
            Результат всегда выводится одной строкой и совместим с Roblox Luau
            executors (loadstring / load)
          </div>
          <button
            onClick={handleObfuscate}
            disabled={busy || !source.trim()}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-md border border-emerald-400/60 bg-gradient-to-r from-emerald-600 to-cyan-600 px-8 py-3 font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative text-lg">▶</span>
            <span className="relative text-sm">
              {busy ? "Processing..." : "Obfuscate"}
            </span>
          </button>
        </section>

        {/* Footer info */}
        <footer className="mt-6 grid grid-cols-2 gap-3 text-[11px] text-zinc-500 sm:grid-cols-4">
          <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
            <div className="text-emerald-400/70">⚡ ENGINE</div>
            <div>LuaCrypt Core 2.6</div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
            <div className="text-cyan-400/70">🎯 TARGET</div>
            <div>Roblox Luau / Lua 5.1</div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
            <div className="text-fuchsia-400/70">🔒 LAYERS</div>
            <div>
              {Object.values(opts).filter(Boolean).length} / 4 активно
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
            <div className="text-orange-400/70">📤 FORMAT</div>
            <div>Single-line · loadstring</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
