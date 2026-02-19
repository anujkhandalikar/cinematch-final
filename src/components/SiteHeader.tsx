import Link from "next/link";

export default function SiteHeader() {
    return (
        <header className="fixed top-0 left-0 w-full flex justify-center py-6 z-[60] pointer-events-none">
            <Link
                href="/"
                className="pointer-events-auto text-xl md:text-2xl font-black tracking-[0.2em] text-white/80 hover:text-white transition-colors uppercase drop-shadow-md"
            >
                CINEMATCH
            </Link>
        </header>
    );
}
