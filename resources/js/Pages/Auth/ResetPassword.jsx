import { Head, useForm } from '@inertiajs/react';

import FormField from '../../Components/FormField';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ResetPassword({ email, token }) {
    const { data, setData, post, processing, errors } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    function submit(event) {
        event.preventDefault();
        post('/reset-password', { preserveScroll: true });
    }

    return (
        <AuthLayout
            eyebrow="Choose a new password"
            title="Complete your password reset"
            description="Set a new password for this account. A fresh email security code will still be required the next time you sign in."
            asideTitle="Password guidance"
            asideItems={[
                'Choose a unique password you do not use for another service.',
                'Anyone who asks for your password or email code should be treated as suspicious.',
            ]}
        >
            <Head title="Reset password" />
            <h2 className="text-xl font-semibold text-emerald-950">New account password</h2>
            <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
                <FormField
                    id="email"
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    value={data.email}
                    onChange={(event) => setData('email', event.target.value)}
                    error={errors.email}
                    required
                    readOnly
                />
                <FormField
                    id="password"
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    value={data.password}
                    onChange={(event) => setData('password', event.target.value)}
                    error={errors.password}
                    required
                    autoFocus
                />
                <FormField
                    id="password_confirmation"
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                    value={data.password_confirmation}
                    onChange={(event) => setData('password_confirmation', event.target.value)}
                    error={errors.password_confirmation}
                    required
                />
                <SubmitButton processing={processing}>{processing ? 'Resetting password…' : 'Reset password'}</SubmitButton>
            </form>
        </AuthLayout>
    );
}
