import { useForm, usePage } from '@inertiajs/react';
import FormField from '../../Components/FormField';
import PasswordField from '../../Components/PasswordField';

import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';

export default function ProfileForm() {
    const { auth, flash } = usePage().props;
    const profile = useForm({ name: auth.user.name, email: auth.user.email, profile_password: '' });
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });
    const photo = useForm({ photo: null });
    const fileInput = useRef(null);
    const [preview, setPreview] = useState(null);
    useEffect(() => {
        if (!photo.data.photo) { setPreview(null); return; }
        const url = URL.createObjectURL(photo.data.photo);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photo.data.photo]);
    const clearPhoto = () => { photo.reset(); if (fileInput.current) fileInput.current.value = ''; };
    function savePhoto(event) {
        event.preventDefault();
        photo.post('/seller/profile/photo', { preserveScroll: true, forceFormData: true, onSuccess: clearPhoto });
    }
    const changingEmail = profile.data.email.trim().toLowerCase() !== auth.user.email;

    function saveProfile(event) {
        event.preventDefault();
        profile.patch('/seller/profile', { preserveScroll: true, onSuccess: () => profile.reset('profile_password') });
    }

    function savePassword(event) {
        event.preventDefault();
        password.put('/seller/password', { preserveScroll: true, onSuccess: () => password.reset() });
    }

    return <div className="seller-profile-form">
        <div className="seller-profile-heading"><Avatar user={auth.user} className="seller-store-icon" /><div><h2>{auth.user.name}</h2><p>Partner barangay · Pasig City</p></div></div>
        {flash?.status && <p className="seller-save-status" role="status">{flash.status}</p>}
        <form onSubmit={savePhoto} className="seller-settings-section">
            <div><h2>Profile photo</h2><p>Use your barangay logo or a photo of your urban farm.</p></div>
            <div className="seller-settings-fields">
                <Avatar user={{ ...auth.user, avatar_url: preview || auth.user.avatar_url }} className="seller-profile-photo" />
                <label htmlFor="profile-photo">Choose profile photo</label>
                <input ref={fileInput} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help photo-error" aria-invalid={Boolean(photo.errors.photo)} onChange={event => { photo.clearErrors(); photo.setData('photo', event.target.files?.[0] || null); }} />
                <p id="photo-help">JPG, PNG or WebP. Maximum 2 MB.</p>
                {photo.errors.photo && <p id="photo-error" role="alert" className="seller-photo-error">{photo.errors.photo}</p>}
                <div className="seller-photo-actions"><button className="seller-save-button" disabled={!photo.data.photo || photo.processing}>{photo.processing ? 'Saving…' : 'Save photo'}</button>{photo.data.photo && <button type="button" className="seller-outline-button" onClick={clearPhoto} disabled={photo.processing}>Cancel</button>}{auth.user.avatar_url && <button type="button" className="seller-outline-button" disabled={photo.processing} onClick={() => photo.delete('/seller/profile/photo', { preserveScroll: true, onSuccess: clearPhoto })}>Remove photo</button>}</div>
            </div>
        </form>
        <form onSubmit={saveProfile} noValidate className="seller-settings-section">
            <div><h2>Store details</h2><p>Update your barangay’s display name and account email.</p></div>
            <div className="seller-settings-fields">
                <FormField id="store-name" label="Barangay / store name" value={profile.data.name} onChange={event => profile.setData('name', event.target.value)} error={profile.errors.name} autoComplete="organization" required maxLength={255} />
                <FormField id="store-email" label="Email address" type="email" value={profile.data.email} onChange={event => profile.setData('email', event.target.value)} error={profile.errors.email} autoComplete="email" required hint="A new email address must be confirmed before it becomes your sign-in email." />
                {changingEmail && <PasswordField id="profile-password" label="Password to confirm email change" value={profile.data.profile_password} onChange={event => profile.setData('profile_password', event.target.value)} error={profile.errors.profile_password} autoComplete="current-password" required />}
                <div className="seller-form-actions"><button className="seller-save-button" disabled={profile.processing}>{profile.processing ? 'Saving…' : 'Save profile'}</button></div>
            </div>
        </form>
        <form onSubmit={savePassword} noValidate className="seller-settings-section">
            <div><h2>Change password</h2><p>Use at least 8 characters, including letters and numbers.</p></div>
            <div className="seller-settings-fields">
                <PasswordField id="current-password" label="Current password" autoComplete="current-password" value={password.data.current_password} onChange={event => password.setData('current_password', event.target.value)} error={password.errors.current_password} required />
                <PasswordField id="new-password" label="New password" autoComplete="new-password" value={password.data.password} onChange={event => password.setData('password', event.target.value)} error={password.errors.password} required />
                <PasswordField id="confirm-password" label="Confirm new password" autoComplete="new-password" value={password.data.password_confirmation} onChange={event => password.setData('password_confirmation', event.target.value)} error={password.errors.password_confirmation} required />
                <div className="seller-form-actions"><button className="seller-save-button" disabled={password.processing}>{password.processing ? 'Updating…' : 'Update password'}</button></div>
            </div>
        </form>
    </div>;
}
