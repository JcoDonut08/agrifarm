import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ShopProvider } from '../../Components/Storefront/ShopContext';
import AddressAutocomplete from '../../Components/Storefront/AddressAutocomplete';
import StorefrontLayout from '../../Layouts/StorefrontLayout';

function Field({ label, error, hint, ...props }) {
    return <label className="customer-field">{label}<input aria-invalid={Boolean(error)} {...props} />{hint && <span>{hint}</span>}{error && <small role="alert">{error}</small>}</label>;
}

function ProfileAvatar({ user, preview, large = false }) {
    const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    return <span className={`customer-profile-avatar${large ? ' is-large' : ''}`}>
        {preview || user.avatar_url ? <img src={preview || user.avatar_url} alt="Your profile" /> : <span aria-hidden="true">{initials}</span>}
    </span>;
}

export default function Home() {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const profile = useForm({ name: user.name || '', username: user.username || '', mobile_number: user.mobile_number || '', delivery_address: user.delivery_address || '' });
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });
    const photo = useForm({ photo: null });
    const photoInput = useRef(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (!photo.data.photo) { setPreview(null); return; }
        const url = URL.createObjectURL(photo.data.photo);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photo.data.photo]);

    function clearPhoto() {
        photo.reset();
        if (photoInput.current) photoInput.current.value = '';
    }

    function savePhoto(event) {
        event.preventDefault();
        photo.post('/customer/profile/photo', { forceFormData: true, preserveScroll: true, onSuccess: clearPhoto });
    }

    function saveProfile(event) {
        event.preventDefault();
        profile.patch('/customer/profile', { preserveScroll: true });
    }

    function savePassword(event) {
        event.preventDefault();
        password.put('/customer/password', { preserveScroll: true, onSuccess: () => password.reset() });
    }

    return <ShopProvider products={[]} persist={false}><StorefrontLayout>
        <Head title="My profile" />
        <div className="store-container customer-profile-page">
            <header className="customer-profile-heading"><h1>My Profile</h1></header>
            <div className="customer-profile-panel">
            <div className="customer-profile-content">
                <div className="customer-profile-identity"><ProfileAvatar user={user} /><div><strong>{user.name}</strong><span>{user.username ? `@${user.username} · ${user.email}` : user.email}</span></div></div>
                {flash?.status && <p className="customer-profile-status" role="status">{flash.status}</p>}

                <form onSubmit={savePhoto} className="customer-settings-section">
                    <div className="customer-settings-intro"><h2>Profile photo</h2><p>Choose a photo for your AgriFarm account.</p></div>
                    <div className="customer-settings-fields">
                        <ProfileAvatar user={user} preview={preview} large />
                        <label htmlFor="customer-photo">Choose profile photo</label>
                        <input id="customer-photo" ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="customer-photo-help" aria-invalid={Boolean(photo.errors.photo)} onChange={event => { photo.clearErrors(); photo.setData('photo', event.target.files?.[0] || null); }} />
                        <p id="customer-photo-help" className="customer-field-hint">JPG, PNG or WebP. Maximum 2 MB.</p>
                        {photo.errors.photo && <small role="alert" className="customer-field-error">{photo.errors.photo}</small>}
                        <div className="customer-profile-actions"><button className="store-button" disabled={!photo.data.photo || photo.processing}>{photo.processing ? 'Saving…' : 'Save photo'}</button>{photo.data.photo && <button type="button" className="checkout-outline-button" onClick={clearPhoto} disabled={photo.processing}>Cancel</button>}{user.avatar_url && <button type="button" className="checkout-outline-button" disabled={photo.processing} onClick={() => photo.delete('/customer/profile/photo', { preserveScroll: true, onSuccess: clearPhoto })}>Remove photo</button>}</div>
                    </div>
                </form>

                <form onSubmit={saveProfile} noValidate className="customer-settings-section">
                    <div className="customer-settings-intro"><h2>Personal and delivery details</h2><p>Saved details appear at checkout. You can edit them for each order.</p></div>
                    <div className="customer-settings-fields">
                        <Field label="Full name" autoComplete="name" maxLength="120" required value={profile.data.name} onChange={event => profile.setData('name', event.target.value)} error={profile.errors.name} />
                        <Field label="Username (optional)" autoComplete="username" maxLength="40" value={profile.data.username} onChange={event => profile.setData('username', event.target.value)} error={profile.errors.username} />
                        <Field label="Email address" type="email" readOnly value={user.email} hint="Your sign-in email fills checkout automatically." />
                        <Field label="Mobile number" type="tel" autoComplete="tel" inputMode="tel" value={profile.data.mobile_number} onChange={event => profile.setData('mobile_number', event.target.value)} error={profile.errors.mobile_number} />
                        <AddressAutocomplete className="customer-field" value={profile.data.delivery_address} onChange={address => profile.setData('delivery_address', address)} error={profile.errors.delivery_address} />
                        <div className="customer-profile-actions"><button className="store-button" disabled={profile.processing}>{profile.processing ? 'Saving…' : 'Save details'}</button></div>
                    </div>
                </form>

                <form onSubmit={savePassword} noValidate className="customer-settings-section">
                    <div className="customer-settings-intro"><h2>Change password</h2><p>Use at least 8 characters, including letters and numbers.</p></div>
                    <div className="customer-settings-fields">
                        <Field label="Current password" type="password" autoComplete="current-password" required value={password.data.current_password} onChange={event => password.setData('current_password', event.target.value)} error={password.errors.current_password} />
                        <Field label="New password" type="password" autoComplete="new-password" required value={password.data.password} onChange={event => password.setData('password', event.target.value)} error={password.errors.password} />
                        <Field label="Confirm new password" type="password" autoComplete="new-password" required value={password.data.password_confirmation} onChange={event => password.setData('password_confirmation', event.target.value)} error={password.errors.password_confirmation} />
                        <div className="customer-profile-actions"><button className="store-button" disabled={password.processing}>{password.processing ? 'Updating…' : 'Update password'}</button></div>
                    </div>
                </form>
            </div>
            </div>
        </div>
    </StorefrontLayout></ShopProvider>;
}
