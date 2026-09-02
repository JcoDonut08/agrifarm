import { Head, Link, useForm } from '@inertiajs/react';

import FormField from '../../Components/FormField';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        terms: false,
        privacy: false,
    });

    function submit(event) {
        event.preventDefault();
        post('/register', { preserveScroll: true });
    }

    return (
        <AuthLayout
            eyebrow="Customer registration"
            title="Create your AgriFarm customer account"
            description="Public registration is for customers only. Seller and CENRO administrator accounts are provisioned separately by authorized project personnel."
            asideTitle="Before you continue"
            asideItems={[
                'Use an email address you can access for verification and future sign-ins.',
                'Review the Terms and Privacy Notice before accepting them.',
            ]}
        >
            <Head title="Create customer account" />

            <div className="mb-6">
                <h2 className="text-xl font-semibold text-emerald-950">Customer details</h2>
                <p className="mt-1 text-sm leading-6 text-stone-500">All fields are required.</p>
            </div>

            <form className="space-y-5" onSubmit={submit} noValidate>
                <FormField
                    id="name"
                    label="Full name"
                    autoComplete="name"
                    value={data.name}
                    onChange={(event) => setData('name', event.target.value)}
                    error={errors.name}
                    required
                    autoFocus
                />
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
                />
                <FormField
                    id="password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    hint="Use at least 8 characters with a mix that is difficult to guess."
                    value={data.password}
                    onChange={(event) => setData('password', event.target.value)}
                    error={errors.password}
                    required
                />
                <FormField
                    id="password_confirmation"
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    value={data.password_confirmation}
                    onChange={(event) => setData('password_confirmation', event.target.value)}
                    error={errors.password_confirmation}
                    required
                />

                <fieldset className="space-y-3 border-t border-stone-200 pt-5">
                    <legend className="sr-only">Legal acceptance</legend>
                    <ConsentCheckbox
                        checked={data.terms}
                        onChange={(checked) => setData('terms', checked)}
                        error={errors.terms}
                    >
                        I have read and accept the <Link href="/terms" className="font-semibold text-emerald-800 underline">Terms of Use</Link>.
                    </ConsentCheckbox>
                    <ConsentCheckbox
                        checked={data.privacy}
                        onChange={(checked) => setData('privacy', checked)}
                        error={errors.privacy}
                    >
                        I have read and accept the <Link href="/privacy" className="font-semibold text-emerald-800 underline">Privacy Notice</Link>.
                    </ConsentCheckbox>
                </fieldset>

                <SubmitButton processing={processing}>{processing ? 'Creating account…' : 'Create customer account'}</SubmitButton>
            </form>

            <p className="mt-6 text-center text-sm text-stone-600">
                Already registered? <Link href="/login" className="font-semibold text-emerald-800">Sign in</Link>
            </p>
        </AuthLayout>
    );
}

function ConsentCheckbox({ checked, onChange, error, children }) {
    return (
        <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-stone-700">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onChange(event.target.checked)}
                    className="mt-1 size-4 shrink-0 rounded border-stone-300 text-emerald-800 focus:ring-emerald-700"
                />
                <span>{children}</span>
            </label>
            {error && <p className="ml-7 mt-1 text-sm text-red-700" role="alert">{error}</p>}
        </div>
    );
}
