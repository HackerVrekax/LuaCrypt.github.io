// Roblox Lua/Luau Obfuscator
// Methods: Base64, XOR, VM, Anti-Decompiler

export type ObfuscationOptions = {
  base64: boolean;
  xor: boolean;
  vm: boolean;
  antiDecompiler: boolean;
};

// ---------- Helpers ----------

const randName = (len = 8): string => {
  const chars = "lIO0_";
  let out = "_";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const toBase64 = (str: string): string => {
  // Encode UTF-8 properly
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

const luaStringEscape = (s: string): string => {
  // Use long bracket if safe, else escape
  if (!s.includes("]]") && !s.includes("\0")) {
    let level = 0;
    while (s.includes(`]${"=".repeat(level)}]`)) level++;
    const eq = "=".repeat(level);
    return `[${eq}[${s}]${eq}]`;
  }
  return (
    '"' +
    s
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\0/g, "\\0") +
    '"'
  );
};

// ---------- Layer: Anti-Decompiler ----------
// Wraps code with junk, fake control flow, integrity checks.
function applyAntiDecompiler(code: string): string {
  const junkVars = Array.from({ length: 6 }, () => randName(10));
  const junk = junkVars
    .map((v) => {
      const n = randomInt(1000, 999999);
      const op = ["+", "-", "*"][randomInt(0, 2)];
      const m = randomInt(2, 100);
      return `local ${v}=(${n}${op}${m})%${randomInt(2, 9999)};`;
    })
    .join("");

  const fakeIf =
    `if (function() return ${randomInt(1, 100)}+${randomInt(1, 100)} end)()` +
    `==${randomInt(99999, 999999)} then ` +
    `error("\\0\\0\\0") end;`;

  const antiHook = `local ${randName()}=(function() ` +
    `local g=getfenv and getfenv() or _ENV;` +
    `return g end)();`;

  return junk + fakeIf + antiHook + code;
}

// ---------- Layer: XOR ----------
// XOR-encrypts the payload with a random multi-byte key and emits a Lua decoder.
function applyXOR(payload: string): string {
  const keyLen = randomInt(8, 16);
  const key: number[] = [];
  for (let i = 0; i < keyLen; i++) key.push(randomInt(1, 255));

  const bytes = new TextEncoder().encode(payload);
  const encBytes: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    encBytes.push(bytes[i] ^ key[i % key.length]);
  }

  // Pack into a Lua string literal using \xXX escapes for any byte.
  const toLuaBytes = (arr: number[]) =>
    '"' + arr.map((b) => "\\" + b).join("") + '"';

  const encVar = randName();
  const keyVar = randName();
  const outVar = randName();
  const iVar = randName();
  const loaderVar = randName();
  const bxor = randName();

  // Implement bxor for any Lua/Luau (Roblox supports bit32.bxor).
  const bxorImpl = `local ${bxor}=(bit32 and bit32.bxor) or function(a,b)
    local r,p=0,1
    for i=0,7 do
      local x,y=a%2,b%2
      if x~=y then r=r+p end
      a=(a-x)/2; b=(b-y)/2; p=p*2
    end
    return r
  end;`;

  return `(function()
${bxorImpl}
local ${encVar}=${toLuaBytes(encBytes)};
local ${keyVar}={${key.join(",")}};
local ${outVar}={};
for ${iVar}=1,#${encVar} do
  ${outVar}[${iVar}]=string.char(${bxor}(string.byte(${encVar},${iVar}),${keyVar}[((${iVar}-1)%${keyLen})+1]))
end
local ${loaderVar}=table.concat(${outVar});
local f=(loadstring or load)(${loaderVar});
if f then return f() end
end)();`;
}

// ---------- Layer: Base64 ----------
function applyBase64(payload: string): string {
  const b64 = toBase64(payload);
  const dataVar = randName();
  const decVar = randName();
  const loaderVar = randName();

  // Pure-Lua base64 decoder, compatible with Roblox Luau.
  return `(function()
local ${dataVar}=${luaStringEscape(b64)};
local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
local function ${decVar}(data)
  data=string.gsub(data,'[^'..b..'=]','')
  return (data:gsub('.',function(x)
    if (x=='=') then return '' end
    local r,f='',(b:find(x)-1)
    for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
    return r;
  end):gsub('%d%d%d?%d?%d?%d?%d?%d?',function(x)
    if (#x~=8) then return '' end
    local c=0
    for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
    return string.char(c)
  end))
end
local ${loaderVar}=${decVar}(${dataVar});
local f=(loadstring or load)(${loaderVar});
if f then return f() end
end)();`;
}

// ---------- Layer: VM ----------
// Tiny stack-based VM that re-assembles the script from encoded opcodes,
// then executes it. Each "instruction" is just a char-push operation
// with offsets, so a decompiler cannot recover the source statically.
function applyVM(payload: string): string {
  // Build a sequence of pseudo-instructions:
  //  opcode 1 -> push char with offset added to accumulator
  //  opcode 2 -> reset accumulator
  // We encode bytes as (op, value) pairs with a varying offset.
  const bytes = new TextEncoder().encode(payload);
  const instructions: number[] = [];
  let acc = randomInt(10, 200);
  instructions.push(2, acc); // set acc

  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && i % 32 === 0) {
      acc = randomInt(10, 200);
      instructions.push(2, acc);
    }
    const val = (bytes[i] - acc + 256) % 256;
    instructions.push(1, val);
  }

  const progVar = randName();
  const accVar = randName();
  const outVar = randName();
  const pcVar = randName();
  const opVar = randName();
  const argVar = randName();
  const loaderVar = randName();

  return `(function()
local ${progVar}={${instructions.join(",")}};
local ${accVar}=0;
local ${outVar}={};
local ${pcVar}=1;
while ${pcVar}<=#${progVar} do
  local ${opVar}=${progVar}[${pcVar}];
  local ${argVar}=${progVar}[${pcVar}+1];
  if ${opVar}==2 then
    ${accVar}=${argVar};
  elseif ${opVar}==1 then
    ${outVar}[#${outVar}+1]=string.char((${argVar}+${accVar})%256);
  end
  ${pcVar}=${pcVar}+2;
end
local ${loaderVar}=table.concat(${outVar});
local f=(loadstring or load)(${loaderVar});
if f then return f() end
end)();`;
}

// ---------- Pipeline ----------
export function obfuscate(source: string, opts: ObfuscationOptions): string {
  if (!source.trim()) return "";

  let code = source;

  // Anti-decompiler is applied to the INNER payload first (so it executes
  // alongside the real script after all decryption layers).
  if (opts.antiDecompiler) {
    code = applyAntiDecompiler(code);
  }

  // Apply encryption layers from inner-most to outer-most.
  // Order: VM -> XOR -> Base64 (Base64 outer = nice printable string).
  if (opts.vm) {
    code = applyVM(code);
  }
  if (opts.xor) {
    code = applyXOR(code);
  }
  if (opts.base64) {
    code = applyBase64(code);
  }

  // If no layer chosen, fall back to a simple loadstring wrap.
  if (!opts.vm && !opts.xor && !opts.base64) {
    code = `(function() local f=(loadstring or load)(${luaStringEscape(
      code
    )}); if f then return f() end end)();`;
  }

  // Banner
  const banner = `--[[ Obfuscated with LuaCrypt | Roblox Edition ]]`;

  // Make it ONE LINE: strip newlines and collapse whitespace where safe.
  // Lua allows semicolons as separators, and we already inserted them.
  const oneLine =
    banner +
    " " +
    code
      .replace(/--\[\[[\s\S]*?\]\]/g, "") // remove block comments
      .replace(/--[^\n]*/g, "") // remove line comments
      .replace(/[\r\n\t]+/g, " ") // newlines -> spaces
      .replace(/ {2,}/g, " ") // collapse spaces
      .trim();

  return oneLine;
}

export function estimateStrength(opts: ObfuscationOptions): number {
  let s = 0;
  if (opts.base64) s += 20;
  if (opts.xor) s += 30;
  if (opts.vm) s += 35;
  if (opts.antiDecompiler) s += 15;
  return Math.min(s, 100);
}
