import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';

export default function RoleWelcome({ title, introduction, label, detail }) {
    return (
        <AuthenticatedLayout title={title} introduction={introduction}>
            <section className="border-l-4 border-emerald-700 bg-white px-5 py-5 shadow-sm sm:px-6">
                <h2 className="font-semibold text-emerald-950">{label}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{detail}</p>
            </section>
        </AuthenticatedLayout>
    );
}
