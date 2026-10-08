import { Head, Link, useForm, usePage } from '@inertiajs/react';

import FormField from '../../Components/FormField';
import FormStatus from '../../Components/FormStatus';
import GoogleAuthButton from '../../Components/GoogleAuthButton';
import PasswordField from '../../Components/PasswordField';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Login() {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({ email: '', password: '', remember: false });

    function submit(event) {
        event.preventDefault();
        post('/login');
    }

    return (
        <AuthLayout eyebrow="Welcome back" title="Sign in to AgriFarm." description="Access fresh local produce, manage orders, and grow with the community.">
            <Head title="Sign in" />
            <FormStatus>{flash?.status}</FormStatus>

            <form className={`${flash?.status ? 'mt-5' : ''} space-y-4`} onSubmit={submit} noValidate>
                <FormField id="email" label="Email address" type="email" autoComplete="email" inputMode="email" value={data.email} onChange={(event) => setData('email', event.target.value)} error={errors.email} required autoFocus />
                <PasswordField id="password" label="Password" autoComplete="current-password" value={data.password} onChange={(event) => setData('password', event.target.value)} error={errors.password} required />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                        <input type="checkbox" checked={data.remember} onChange={(event) => setData('remember', event.target.checked)} className="size-4 rounded border-stone-300 text-forest-700 focus:ring-forest-600" />
                        Remember me
                    </label>
                    <Link href="/forgot-password" className="rounded text-sm font-bold text-forest-700 hover:text-forest-950 dark:text-forest-300 dark:hover:text-white">Forgot password?</Link>
                </div>

                <SubmitButton processing={processing}>{processing ? 'Logging in…' : 'Login'}</SubmitButton>
            </form>

            <GoogleAuthButton href="/auth/google/redirect?intent=login" error={errors.google} />

            <p className="mt-5 text-center text-sm text-stone-600 dark:text-stone-300">
                New to AgriFarm? <Link href="/register" className="font-bold text-forest-700 hover:text-forest-950 dark:text-forest-300 dark:hover:text-white">Create account</Link>
            </p>
            <aside className="mt-5 border-t border-stone-200 pt-4 text-center dark:border-white/10" aria-label="Account terms and privacy">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-300">Account terms &amp; privacy</p>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-stone-600 dark:text-stone-300">
                    New accounts created with Google require acceptance of our{' '}
                    <Link href="/terms" className="rounded font-bold text-forest-700 underline decoration-forest-300 underline-offset-2 transition hover:text-forest-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 dark:text-forest-300 dark:hover:text-white">Terms of Use</Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="rounded font-bold text-forest-700 underline decoration-forest-300 underline-offset-2 transition hover:text-forest-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 dark:text-forest-300 dark:hover:text-white">Privacy Notice</Link>.
                </p>
            </aside>
        </AuthLayout>
    );
}
