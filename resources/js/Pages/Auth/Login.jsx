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
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-stone-700">
                        <input type="checkbox" checked={data.remember} onChange={(event) => setData('remember', event.target.checked)} className="size-4 rounded border-stone-300 text-forest-700 focus:ring-forest-600" />
                        Remember me
                    </label>
                    <Link href="/forgot-password" className="rounded text-sm font-bold text-forest-700 hover:text-forest-950">Forgot password?</Link>
                </div>

                <SubmitButton processing={processing}>{processing ? 'Logging in...' : 'Login'}</SubmitButton>
            </form>

            <GoogleAuthButton href="/auth/google/redirect?intent=login" error={errors.google} />

            <p className="mt-5 text-center text-sm text-stone-600">
                New to AgriFarm? <Link href="/register" className="font-bold text-forest-700 hover:text-forest-950">Create account</Link>
            </p>
            <p className="mt-3 text-center text-xs leading-5 text-stone-500">
                Continuing with Google creates an account if needed and means you agree to our <Link href="/terms" className="underline hover:text-forest-700">Terms</Link> and <Link href="/privacy" className="underline hover:text-forest-700">Privacy Notice</Link>.
            </p>
        </AuthLayout>
    );
}
