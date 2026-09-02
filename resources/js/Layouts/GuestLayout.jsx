export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen bg-stone-50">
            <header className="border-b border-emerald-950/10 bg-white">
                <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
                    <span
                        aria-hidden="true"
                        className="grid size-10 place-items-center rounded-xl bg-emerald-800 text-sm font-bold text-white"
                    >
                        AF
                    </span>
                    <div>
                        <p className="font-semibold tracking-tight text-emerald-950">AgriFarm</p>
                        <p className="text-xs text-stone-500">Agricultural marketplace and decision support</p>
                    </div>
                </div>
            </header>

            <main>{children}</main>

            <footer className="border-t border-emerald-950/10 bg-white">
                <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-stone-500 sm:px-6 lg:px-8">
                    AgriFarm undergraduate thesis project
                </div>
            </footer>
        </div>
    );
}
