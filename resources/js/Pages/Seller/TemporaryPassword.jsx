import { Head, useForm } from "@inertiajs/react";
import { KeyRound, LockKeyhole } from "lucide-react";

export default function TemporaryPassword() {
    const form = useForm({ temporary_password: "", password: "", password_confirmation: "" });
    const submit = (event) => { event.preventDefault(); form.put("/seller/temporary-password"); };

    return <main className="seller-temporary-password"><Head title="Set your password · AgriFarm" /><section><div className="seller-temporary-password-icon"><KeyRound /></div><p className="seller-temporary-password-kicker">Account security</p><h1>Set your personal password</h1><p>Your CENRO administrator issued a temporary password. Choose a new password before you access your seller dashboard.</p><form onSubmit={submit} noValidate><label>Temporary password<input type="password" value={form.data.temporary_password} autoComplete="current-password" autoFocus onChange={(event) => form.setData("temporary_password", event.target.value)} required /></label>{form.errors.temporary_password && <small>{form.errors.temporary_password}</small>}<label>New password<input type="password" value={form.data.password} autoComplete="new-password" onChange={(event) => form.setData("password", event.target.value)} required /></label>{form.errors.password && <small>{form.errors.password}</small>}<label>Confirm new password<input type="password" value={form.data.password_confirmation} autoComplete="new-password" onChange={(event) => form.setData("password_confirmation", event.target.value)} required /></label><button type="submit" disabled={form.processing}><LockKeyhole />Save password and continue</button></form></section></main>;
}
