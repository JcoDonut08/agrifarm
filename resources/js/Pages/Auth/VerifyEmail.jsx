import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import FormStatus from '../../Components/FormStatus';
import AuthLayout from '../../Layouts/AuthLayout';

export default function VerifyEmail({ email, authenticated }) {
    const { flash } = usePage().props;
    const [sending, setSending] = useState(false);

    function resend() {
        setSending(true);
        router.post('/email/verification-notification', {}, { onFinish: () => setSending(false), preserveScroll: true });
    }

    return (
        <AuthLayout
            eyebrow="Email verification"
            title="Confirm your customer email"
            description={`We sent a verification link to ${email}. Open that link to confirm the address before signing in to the customer area.`}
            asideTitle="Didn’t receive it?"
            asideItems={[
                'During local development, check the Laravel log or your configured Mailpit inbox.',
                'The verification link is signed and expires automatically.',
            ]}
        >
            <Head title="Verify email" />
            <h2 className="text-xl font-semibold text-emerald-950">Check your inbox</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
                Keep this page open, then return after following the link in the message.
            </p>

            <div className="mt-5"><FormStatus>{flash?.status}</FormStatus></div>

            <button
                type="button"
                disabled={sending}
                onClick={resend}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
            >
                {sending ? 'Sending link…' : 'Resend verification email'}
            </button>

            <p className="mt-5 text-center text-sm text-stone-600">
                {authenticated ? (
                    <Link href="/logout" method="post" as="button" className="font-semibold text-emerald-800">Sign out</Link>
                ) : (
                    <Link href="/login" className="font-semibold text-emerald-800">Go to sign in</Link>
                )}
            </p>
        </AuthLayout>
    );
}
