export default function FormStatus({ children }) {
    if (!children) {
        return null;
    }

    return (
        <div className="border-l-4 border-emerald-700 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950" role="status">
            {children}
        </div>
    );
}
