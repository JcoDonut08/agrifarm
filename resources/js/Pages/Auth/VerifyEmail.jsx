import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import FormStatus from '../../Components/FormStatus';
import OtpInput from '../../Components/OtpInput';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function VerifyEmail({ email, authenticated, expiresMinutes, resendCooldownSeconds }) {
    const { flash } = usePage().props;
    const [sending, setSending] = useState(false);
    const [resendIn, setResendIn] = useState(resendCooldownSeconds);
    const { data, setData, post, processing, errors, clearErrors } = useForm({ code: '' });

    useEffect(() => {
        if (resendIn <= 0) return undefined;
        const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [resendIn]);

    function submit(event) {
        event.preventDefault();
        post('/email/verify');
    }

    function updateCode(code) {
        setData('code', code);
        if (errors.code) clearErrors('code');
    }

    function resend() {
        setSending(true);
        router.post('/email/verification-notification', {}, {
            preserveScroll: true,
            onSuccess: () => setResendIn(resendCooldownSeconds),
            onFinish: () => setSending(false),
        });
    }

    return (
        <AuthLayout eyebrow="One last step" title="Verify your account." description={`Enter the 6-digit code sent to ${email}. It expires in ${expiresMinutes} minutes.`}>
            <Head title="Verify email" />
            <FormStatus>{flash?.status}</FormStatus>

            <form className={`${flash?.status ? 'mt-5' : ''} space-y-4`} onSubmit={submit} noValidate>
                <OtpInput value={data.code} onChange={updateCode} error={errors.code} disabled={processing} />
                <SubmitButton processing={processing} disabled={processing || data.code.length !== 6}>
                    {processing ? 'Verifying...' : 'Verify & create account'}
                </SubmitButton>
            </form>

            <div className="mt-5 flex flex-col items-center gap-2 border-t border-stone-200 pt-4 text-sm sm:flex-row sm:justify-between">
                <button type="button" disabled={sending || resendIn > 0} onClick={resend} className="min-h-10 rounded-lg px-2 font-bold text-forest-700 hover:bg-forest-50 disabled:cursor-not-allowed disabled:text-stone-400">
                    {sending ? 'Sending...' : resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
                {authenticated
                    ? <Link href="/logout" method="post" as="button" className="rounded-lg px-2 py-2 font-semibold text-stone-600 hover:text-forest-800">Sign out</Link>
                    : <Link href="/register" className="rounded-lg px-2 py-2 font-semibold text-stone-600 hover:text-forest-800">Change email</Link>}
            </div>
        </AuthLayout>
    );
}
