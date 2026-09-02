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
        post('/forgot-password', { preserveScroll: true });
    }

    return (
        <AuthLayout
            eyebrow="Account recovery"
            title="Reset your AgriFarm password"
            description="Enter the email for your customer, seller, or CENRO administrator account. We will send Laravel’s secure password-reset link if the account exists."
            asideTitle="After your reset"
            asideItems={[
                'Existing active login codes are invalidated when the password changes.',
                'Your next sign-in still requires a fresh email code.',
            ]}
        >
            <Head title="Forgot password" />
            <h2 className="text-xl font-semibold text-emerald-950">Request a reset link</h2>
            <div className="mt-5"><FormStatus>{flash?.status}</FormStatus></div>
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
                <SubmitButton processing={processing}>{processing ? 'Sending reset link…' : 'Email password-reset link'}</SubmitButton>
            </form>
            <p className="mt-5 text-center text-sm">
                <Link href="/login" className="font-semibold text-emerald-800">Back to sign in</Link>
            </p>
        </AuthLayout>
    );
}
