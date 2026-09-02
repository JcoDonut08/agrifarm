import { Head, useForm } from '@inertiajs/react';

import PasswordField from '../../Components/PasswordField';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ResetPassword({ email }) {
    const { data, setData, post, processing, errors } = useForm({ password: '', password_confirmation: '' });

    function submit(event) {
        event.preventDefault();
        post('/reset-password');
    }

    return (
        <AuthLayout eyebrow="Email verified" title="Create a new password." description="Choose a strong password you have not used for this account before.">
            <Head title="Reset password" />
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm text-forest-950">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-forest-700 text-white" aria-hidden="true">✓</span>
                <span><strong className="block">Email verified</strong><span className="text-xs text-stone-600">{email}</span></span>
            </div>
            <form className="space-y-4" onSubmit={submit} noValidate>
                <PasswordField id="password" label="New password" autoComplete="new-password" hint="Use at least 8 characters that are difficult to guess." value={data.password} onChange={(event) => setData('password', event.target.value)} error={errors.password} required autoFocus />
                <PasswordField id="password_confirmation" label="Confirm new password" autoComplete="new-password" value={data.password_confirmation} onChange={(event) => setData('password_confirmation', event.target.value)} error={errors.password_confirmation} required />
                <SubmitButton processing={processing}>{processing ? 'Updating password...' : 'Update password'}</SubmitButton>
            </form>
        </AuthLayout>
    );
}
