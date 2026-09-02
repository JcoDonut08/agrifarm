import { Head, Link, useForm, usePage } from '@inertiajs/react';

import FormField from '../../Components/FormField';
import FormStatus from '../../Components/FormStatus';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Login() {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function submit(event) {
        event.preventDefault();
        post('/login', { preserveScroll: true });
    }

    return (
        <AuthLayout
            eyebrow="Secure access"
            title="Sign in to your AgriFarm account"
            description="Customers, sellers, and CENRO administrators use the same sign-in. After your password is checked, we will email a one-time code to finish securely."
            asideTitle="How sign-in works"
            asideItems={[
                'Your password is checked before any account access is granted.',
                'A six-digit email code is required every time you sign in.',
            ]}
        >
            <Head title="Sign in" />

            <div className="mb-6">
                <h2 className="text-xl font-semibold text-emerald-950">Account credentials</h2>
                <p className="mt-1 text-sm leading-6 text-stone-500">Use the email address assigned to your account.</p>
            </div>

            <FormStatus>{flash?.status}</FormStatus>

            <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
                <FormField
                    id="email"
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={data.email}
                    onChange={(event) => setData('email', event.target.value)}
                    error={errors.email}
                    required
                    autoFocus
                />
                <FormField
                    id="password"
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    value={data.password}
                    onChange={(event) => setData('password', event.target.value)}
                    error={errors.password}
                    required
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-stone-700">
                        <input
                            type="checkbox"
                            checked={data.remember}
                            onChange={(event) => setData('remember', event.target.checked)}
                            className="size-4 rounded border-stone-300 text-emerald-800 focus:ring-emerald-700"
                        />
                        Remember me
                    </label>
                    <Link href="/forgot-password" className="rounded text-sm font-semibold text-emerald-800 hover:text-emerald-950">
                        Forgot password?
                    </Link>
                </div>

                <SubmitButton processing={processing}>{processing ? 'Checking credentials…' : 'Continue to email code'}</SubmitButton>
            </form>

            <p className="mt-6 border-t border-stone-200 pt-5 text-center text-sm text-stone-600">
                Need a customer account?{' '}
                <Link href="/register" className="font-semibold text-emerald-800 hover:text-emerald-950">
                    Register here
                </Link>
            </p>
        </AuthLayout>
    );
}
