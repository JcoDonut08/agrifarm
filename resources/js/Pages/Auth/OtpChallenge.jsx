import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import FormField from '../../Components/FormField';
import FormStatus from '../../Components/FormStatus';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function OtpChallenge({ email, expiresMinutes, resendCooldownSeconds }) {
    const { flash } = usePage().props;
    const [resendIn, setResendIn] = useState(resendCooldownSeconds);
    const [resending, setResending] = useState(false);
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    useEffect(() => {
        if (resendIn <= 0) return undefined;
        const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [resendIn]);

    function submit(event) {
        event.preventDefault();
        post('/login/otp', { preserveScroll: true });
    }

    function resend() {
        setResending(true);
        router.post('/login/otp/resend', {}, {
            preserveScroll: true,
            onSuccess: () => setResendIn(resendCooldownSeconds),
            onFinish: () => setResending(false),
        });
    }

    return (
        <AuthLayout
            eyebrow="Second step"
            title="Enter your email security code"
            description={`We sent a six-digit code to ${email}. It expires in ${expiresMinutes} minutes and can only be used once.`}
            asideTitle="Keep your account secure"
            asideItems={[
                'Never share this code with another person.',
                'Requesting a new code immediately invalidates the previous one.',
            ]}
        >
            <Head title="Email security code" />
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-emerald-950">Verify this sign-in</h2>
                <p className="mt-1 text-sm leading-6 text-stone-500">Check your local email log or Mailpit during development.</p>
            </div>

            <FormStatus>{flash?.status}</FormStatus>

            <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
                <FormField
                    id="code"
                    label="Six-digit code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={data.code}
                    onChange={(event) => setData('code', event.target.value.replace(/\D/g, '').slice(0, 6))}
                    error={errors.code}
                    className="[&_input]:text-center [&_input]:text-2xl [&_input]:font-semibold [&_input]:tracking-[0.35em]"
                    required
                    autoFocus
                />
                <SubmitButton processing={processing}>{processing ? 'Verifying…' : 'Verify and sign in'}</SubmitButton>
            </form>

            <div className="mt-5 flex flex-col items-center gap-3 border-t border-stone-200 pt-5 text-sm sm:flex-row sm:justify-between">
                <button
                    type="button"
                    onClick={resend}
                    disabled={resending || resendIn > 0}
                    className="min-h-10 rounded-lg px-2 font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-stone-400"
                >
                    {resending ? 'Sending…' : resendIn > 0 ? `Resend in ${resendIn}s` : 'Send a new code'}
                </button>
                <Link href="/login" className="rounded-lg px-2 py-2 font-medium text-stone-600 hover:text-emerald-900">
                    Start sign-in again
                </Link>
            </div>
        </AuthLayout>
    );
}
