import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import FormStatus from '../../Components/FormStatus';
import OtpInput from '../../Components/OtpInput';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function PasswordResetOtp({ email, expiresMinutes, resendCooldownSeconds }) {
    const { flash } = usePage().props;
    const [resendIn, setResendIn] = useState(resendCooldownSeconds);
    const [resending, setResending] = useState(false);
    const { data, setData, post, processing, errors, clearErrors } = useForm({ code: '' });

    useEffect(() => {
        if (resendIn <= 0) return undefined;
        const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [resendIn]);

    function submit(event) {
        event.preventDefault();
        post('/forgot-password/otp');
    }

    function updateCode(code) {
        setData('code', code);
        if (errors.code) clearErrors('code');
    }

    function resend() {
        setResending(true);
        router.post('/forgot-password/otp/resend', {}, {
            preserveScroll: true,
            onSuccess: () => setResendIn(resendCooldownSeconds),
            onFinish: () => setResending(false),
        });
    }

    return (
        <AuthLayout eyebrow="Password recovery" title="Check your email." description={`Enter the 6-digit code sent to ${email}. It expires in ${expiresMinutes} minutes.`}>
            <Head title="Verify password reset" />
            <FormStatus>{flash?.status}</FormStatus>

            <form className={`${flash?.status ? 'mt-5' : ''} space-y-4`} onSubmit={submit} noValidate>
                <OtpInput value={data.code} onChange={updateCode} error={errors.code} disabled={processing} />
                <SubmitButton processing={processing} disabled={processing || data.code.length !== 6}>
                    {processing ? 'Verifying...' : 'Verify code'}
                </SubmitButton>
            </form>

            <div className="mt-5 flex flex-col items-center gap-2 border-t border-stone-200 pt-4 text-sm sm:flex-row sm:justify-between">
                <button type="button" onClick={resend} disabled={resending || resendIn > 0} className="min-h-10 rounded-lg px-2 font-bold text-forest-700 hover:bg-forest-50 disabled:cursor-not-allowed disabled:text-stone-400">
                    {resending ? 'Sending...' : resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
                <Link href="/forgot-password" className="rounded-lg px-2 py-2 font-semibold text-stone-600 hover:text-forest-800">Change email</Link>
            </div>
            <p className="mt-3 text-center text-xs leading-5 text-stone-500">The new-password form opens only after this code is verified.</p>
        </AuthLayout>
    );
}
