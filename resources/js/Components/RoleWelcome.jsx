import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';

export default function RoleWelcome({ title, introduction, label, detail, role, availableNow }) {
    return (
        <AuthenticatedLayout title={title} introduction={introduction}>
            <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
                <section className="rounded-3xl border border-forest-950/10 bg-white p-6 shadow-sm sm:p-8">
                    <div className="grid size-14 place-items-center rounded-2xl bg-forest-100 text-forest-700"><WorkspaceIcon role={role} /></div>
                    <span className="mt-6 inline-flex rounded-full bg-harvest-400/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-harvest-600">Workspace ready</span>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-forest-950">{label}</h2>
                    <p className="mt-3 max-w-2xl leading-7 text-stone-600">{detail}</p>
                </section>

                <aside className="rounded-3xl bg-forest-800 p-6 text-white shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-forest-200">Available now</p>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-forest-50">
                        {availableNow.map((item) => (
                            <li key={item} className="flex gap-3"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-harvest-400" /><span>{item}</span></li>
                        ))}
                    </ul>
                </aside>
            </div>
        </AuthenticatedLayout>
    );
}

function WorkspaceIcon({ role }) {
    const paths = {
        customer: <><path d="M5 11.5h14v8H5z" /><path d="m4 11.5 2-6h12l2 6M9 19.5v-4h6v4" /></>,
        seller: <><path d="M4 10h16l-1.5-5h-13z" /><path d="M5 10v9h14v-9M9 19v-5h6v5" /></>,
        admin: <><path d="M12 3 5 6v5c0 4.7 2.8 8.2 7 10 4.2-1.8 7-5.3 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    };

    return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[role]}</svg>;
}
