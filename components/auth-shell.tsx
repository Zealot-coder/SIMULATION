import { MessageSquareText, ShieldCheck, Wallet } from "lucide-react";
import { Sora } from "next/font/google";
import { ReactNode } from "react";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

interface AuthShellProps {
  heading: string;
  subheading: string;
  children: ReactNode;
}

const platformPillars = [
  { label: "WhatsApp Commerce", Icon: MessageSquareText },
  { label: "MoMo Integration", Icon: Wallet },
  { label: "Enterprise Security", Icon: ShieldCheck },
];

export function AuthShell({ heading, subheading, children }: AuthShellProps) {
  return (
    <section
      className={`${sora.className} relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-[#130a04] text-[#f7eee6]`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[12%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,_rgba(242,138,22,0.24)_0%,_rgba(242,138,22,0)_70%)]" />
        <div className="absolute right-[-16%] bottom-[-8%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(242,138,22,0.14)_0%,_rgba(242,138,22,0)_72%)]" />
      </div>

      <div className="relative grid min-h-[calc(100svh-4rem)] md:grid-cols-2">
        <aside className="relative hidden overflow-hidden border-r border-[#5a3b28]/45 md:flex md:flex-col md:justify-between">
          <div className="px-10 pt-14 lg:px-16 lg:pt-20">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-3xl border border-[#f7b165]/35 bg-[#f28a16] shadow-[0_0_52px_rgba(242,138,22,0.34)]">
                <span className="text-6xl font-bold leading-none text-white">S</span>
              </div>
              <p className="text-5xl font-semibold tracking-tight text-[#f8f2ea]">SIMULATION</p>
              <p className="mt-3 text-sm font-medium uppercase tracking-[0.25em] text-[#f28a16]">
                Global Automation OS
              </p>
            </div>
          </div>

          <div className="px-10 pb-10 lg:px-16 lg:pb-14">
            <ul className="grid gap-3 text-[#cdb8a7] lg:grid-cols-2">
              {platformPillars.map(({ label, Icon }) => (
                <li key={label} className="flex items-center gap-3 rounded-xl border border-[#503728]/35 bg-[#1a100a]/65 px-3 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-[#f28a16]" />
                  <span className="text-sm">{label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-[#4a3324]/45 pt-5 text-xs tracking-wide text-[#7f695a]">
              <p>SYS_VER: 2.4.0-STABLE</p>
              <p>LATENCY: 12ms</p>
              <p>SECURE_CONN: AES-256</p>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-4 py-8 sm:px-8 md:px-10 lg:px-14">
          <div className="w-full max-w-xl space-y-7">
            <div className="md:hidden">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f7b165]/40 bg-[#f28a16] shadow-[0_0_30px_rgba(242,138,22,0.3)]">
                <span className="text-3xl font-bold text-white">S</span>
              </div>
              <p className="text-center text-xl font-semibold tracking-tight text-[#f8f2ea]">SIMULATION</p>
              <p className="mt-1 text-center text-xs uppercase tracking-[0.2em] text-[#f28a16]">
                Global Automation OS
              </p>
            </div>

            <header className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-[#f8f2ea] sm:text-5xl">{heading}</h1>
              <p className="text-base text-[#a5907f]">{subheading}</p>
            </header>

            {children}
          </div>
        </main>
      </div>
    </section>
  );
}
