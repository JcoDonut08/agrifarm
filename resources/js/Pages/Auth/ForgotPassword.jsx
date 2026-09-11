import { Head, Link, useForm, usePage } from '@inertiajs/react';

import FormField from '../../Components/FormField';
import FormStatus from '../../Components/FormStatus';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ForgotPassword() {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    function submit(event) {
        event.preventDefault();
        post('/forgot-password');
    }

    return (
        <AuthLayout eyebrow="Account recovery" title="Forgot your password?" description="Enter your email and we’ll send a 6-digit verification code before you choose a new password.">
            <Head title="Forgot password" />
            <FormStatus>{flash?.status}</FormStatus>
            <form className={`${flash?.status ? 'mt-5' : ''} space-y-4`} onSubmit={submit} noValidate>
                <FormField id="email" label="Email address" type="email" autoComplete="email" inputMode="email" value={data.email} onChange={(event) => setData('email', event.target.value)} error={errors.email} required autoFocus />
                <SubmitButton processing={processing}>{processing ? 'Sending code...' : 'Send verification code'}</SubmitButton>
            </form>
            <p className="mt-5 text-center text-sm"><Link href="/login" className="font-bold text-forest-700">Back to sign in</Link></p>
            <p className="mt-4 rounded-xl border border-forest-100 bg-forest-50 px-4 py-3 text-xs leading-5 text-stone-600 dark:border-white/15 dark:bg-night-800 dark:text-stone-300">For your security, the password form unlocks only after the email code is verified.</p>
        </AuthLayout>
    );
}
