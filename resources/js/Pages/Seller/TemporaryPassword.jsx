import { Head, useForm } from '@inertiajs/react';

import PasswordField from '../../Components/PasswordField';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function TemporaryPassword() {
    const { data, setData, put, processing, errors } = useForm({
        temporary_password: '',
        password: '',
        password_confirmation: '',
    });

    function submit(event) {
        event.preventDefault();
        put('/seller/temporary-password');
    }

    return (
        <AuthLayout
            eyebrow="Account security"
            title="Set your personal password."
            description="Your CENRO administrator issued a temporary password. Choose a new password before you access your seller dashboard."
        >
            <Head title="Set your password" />
            <form className="space-y-4" onSubmit={submit} noValidate>
                <PasswordField
                    id="temporary_password"
                    label="Temporary password"
                    autoComplete="current-password"
                    value={data.temporary_password}
                    onChange={(event) => setData('temporary_password', event.target.value)}
                    error={errors.temporary_password}
                    required
                    autoFocus
                />
                <PasswordField
                    id="password"
                    label="New password"
                    autoComplete="new-password"
                    hint="Use at least 8 characters, including letters and numbers."
                    value={data.password}
                    onChange={(event) => setData('password', event.target.value)}
                    error={errors.password}
                    required
                />
                <PasswordField
                    id="password_confirmation"
                    label="Confirm new password"
                    autoComplete="new-password"
                    value={data.password_confirmation}
                    onChange={(event) => setData('password_confirmation', event.target.value)}
                    error={errors.password_confirmation}
                    required
                />
                <SubmitButton processing={processing}>
                    {processing ? 'Saving password...' : 'Save password and continue'}
                </SubmitButton>
            </form>
        </AuthLayout>
    );
}
