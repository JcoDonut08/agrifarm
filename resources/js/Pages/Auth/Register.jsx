import { Head, Link, useForm } from '@inertiajs/react';

import FormField from '../../Components/FormField';
import GoogleAuthButton from '../../Components/GoogleAuthButton';
import PasswordField from '../../Components/PasswordField';
import SubmitButton from '../../Components/SubmitButton';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Register() {
    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({ name: '', email: '', password: '', legal: false });

    function submit(event) {
        event.preventDefault();
        post('/register');
    }

    function continueWithGoogle() {
        if (!data.legal) {
            setError('legal', 'Accept the Terms of Use and Privacy Notice before continuing with Google.');
            return;
        }

        window.location.assign('/auth/google/redirect?intent=register&legal=1');
    }

    return (
        <AuthLayout eyebrow="Join the marketplace" title="Create your AgriFarm account." description="Shop from local growers and keep your orders in one place.">
            <Head title="Create account" />
            <form className="space-y-4" onSubmit={submit} noValidate>
                <div className="space-y-4">
                    <FormField id="name" label="Full name" autoComplete="name" value={data.name} onChange={(event) => setData('name', event.target.value)} error={errors.name} required autoFocus />
                    <FormField id="email" label="Email address" type="email" autoComplete="email" inputMode="email" value={data.email} onChange={(event) => setData('email', event.target.value)} error={errors.email} required />
                    <PasswordField id="password" label="Password" autoComplete="new-password" hint="Use at least 8 characters that are difficult to guess." value={data.password} onChange={(event) => setData('password', event.target.value)} error={errors.password} required />
                </div>

                <fieldset className="rounded-2xl border border-forest-200 bg-forest-50 p-4 dark:border-white/15 dark:bg-night-800">
                    <legend className="sr-only">Legal acceptance</legend>
                    <ConsentCheckbox checked={data.legal} onChange={(checked) => {
                        setData('legal', checked);
                        if (errors.legal) clearErrors('legal');
                    }} error={errors.legal}>
                        I agree to the <Link href="/terms" className="font-bold text-forest-700 underline">Terms of Use</Link> and <Link href="/privacy" className="font-bold text-forest-700 underline">Privacy Notice</Link>.
                    </ConsentCheckbox>
                </fieldset>

                <SubmitButton processing={processing}>{processing ? 'Creating account...' : 'Create account'}</SubmitButton>
            </form>

            <GoogleAuthButton onClick={continueWithGoogle} error={errors.google} />

            <p className="mt-5 text-center text-sm text-stone-600 dark:text-stone-300">Already registered? <Link href="/login" className="font-bold text-forest-700 dark:text-forest-300">Login</Link></p>
        </AuthLayout>
    );
}

function ConsentCheckbox({ checked, onChange, error, children }) {
    return (
        <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-stone-700 dark:text-stone-300">
                <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-4 shrink-0 rounded border-forest-300 text-forest-700 focus:ring-harvest-400" />
                <span>{children}</span>
            </label>
            {error && <p className="ml-7 mt-1 text-sm text-red-700" role="alert">{error}</p>}
        </div>
    );
}
