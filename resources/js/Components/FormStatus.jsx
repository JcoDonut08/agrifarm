export default function FormStatus({ children }) {
    if (!children) {
        return null;
    }

    return (
        <div className="flex gap-3 rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm leading-6 text-forest-950 shadow-sm" role="status">
            <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-tomato-400 ring-4 ring-harvest-400/30" />
            <span>{children}</span>
        </div>
    );
}
