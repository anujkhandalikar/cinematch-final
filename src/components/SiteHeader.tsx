import Link from "next/link";

export default function SiteHeader() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full flex justify-center py-6">
            <Link
                href="/"
                className="text-xl md:text-2xl font-black tracking-[0.2em] text-white/80 hover:text-white transition-colors uppercase drop-shadow-md italic"
            >
                CINEMATCH
            </Link>
        </header>
    );
}
